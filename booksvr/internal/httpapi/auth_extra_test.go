package httpapi

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"talebook/booksvr/internal/userdb"
)

// TestFormValue 覆盖表单、JSON 体与查询串的取值优先级。
func TestFormValue(t *testing.T) {
	// 表单优先。
	req := httptest.NewRequest(http.MethodPost, "/",
		strings.NewReader("username=fromform&password=pw"))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	if got := parseFormValues(req).Get("username"); got != "fromform" {
		t.Errorf("表单取值 = %q", got)
	}

	// 表单缺失时回退到 JSON 体。
	req = httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"username":"fromjson"}`))
	req.Header.Set("Content-Type", "application/json")
	if got := parseFormValues(req).Get("username"); got != "fromjson" {
		t.Errorf("JSON 体取值 = %q", got)
	}

	// JSON 体里的非字符串值应被忽略。
	req = httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"n":123}`))
	req.Header.Set("Content-Type", "application/json")
	if got := parseFormValues(req).Get("n"); got != "" {
		t.Errorf("非字符串值应返回空串，得到 %q", got)
	}

	// 非法 JSON 体应降级，不 panic。
	req = httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{bad`))
	req.Header.Set("Content-Type", "application/json")
	if got := parseFormValues(req).Get("x"); got != "" {
		t.Errorf("非法 JSON 应返回空串，得到 %q", got)
	}

	// 空体时回退到 URL 查询串。
	req = httptest.NewRequest(http.MethodPost, "/?q=fromquery", strings.NewReader(""))
	if got := parseFormValues(req).Get("q"); got != "fromquery" {
		t.Errorf("查询串取值 = %q", got)
	}

	// 键不存在 → 空串。
	req = httptest.NewRequest(http.MethodPost, "/", strings.NewReader("a=b"))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	if got := parseFormValues(req).Get("missing"); got != "" {
		t.Errorf("缺失键应返回空串，得到 %q", got)
	}

	// nil 请求 → 空串。
	if got := parseFormValues(nil).Get("x"); got != "" {
		t.Errorf("nil 请求应返回空串，得到 %q", got)
	}
}

// TestAuthConfigNow 覆盖时钟注入与默认时钟。
func TestAuthConfigNow(t *testing.T) {
	fixed := AuthConfig{Clock: func() int64 { return 12345 }}
	if got := fixed.now(); got != 12345 {
		t.Errorf("注入时钟 = %d, want 12345", got)
	}

	// 未注入时应返回真实时间（大于 2020 年）。
	real := AuthConfig{}
	if got := real.now(); got < 1577836800 {
		t.Errorf("默认时钟应返回真实时间，得到 %d", got)
	}
}

// TestIsDemoUser 覆盖 demo 账号判定的大小写与空白处理。
func TestIsDemoUser(t *testing.T) {
	cfg := AuthConfig{Demo: DemoModeConfig{Enabled: true, Username: "Demo"}}

	if !cfg.isDemoUser(&userdb.Reader{Username: "demo"}) {
		t.Error("应忽略大小写匹配 demo 账号")
	}
	if !cfg.isDemoUser(&userdb.Reader{Username: "  DEMO  "}) {
		t.Error("应忽略首尾空白匹配 demo 账号")
	}
	if cfg.isDemoUser(&userdb.Reader{Username: "other"}) {
		t.Error("非 demo 账号不应匹配")
	}
	if cfg.isDemoUser(&userdb.Reader{Username: ""}) {
		t.Error("空用户名不应匹配")
	}
	if cfg.isDemoUser(nil) {
		t.Error("nil Reader 不应匹配")
	}

	// 未配置 demo 用户名时，空用户名不应误匹配。
	empty := AuthConfig{Demo: DemoModeConfig{Enabled: true, Username: ""}}
	if empty.isDemoUser(&userdb.Reader{Username: ""}) {
		t.Error("未配置 demo 用户名时不应匹配空用户名")
	}
}

// TestIsRealAdmin 覆盖真实管理员判定。
func TestIsRealAdmin(t *testing.T) {
	cfg := AuthConfig{}
	if !cfg.isRealAdmin(&userdb.Reader{Admin: true}) {
		t.Error("admin=true 应为真实管理员")
	}
	if cfg.isRealAdmin(&userdb.Reader{Admin: false}) {
		t.Error("admin=false 不应为真实管理员")
	}
	if cfg.isRealAdmin(nil) {
		t.Error("nil Reader 不应为真实管理员")
	}
}

// TestDemoUsername 覆盖 demo 用户名的规范化。
func TestDemoUsername(t *testing.T) {
	cfg := AuthConfig{Demo: DemoModeConfig{Username: "  DemoUser  "}}
	if got := cfg.demoUsername(); got != "demouser" {
		t.Errorf("demoUsername = %q, want demouser", got)
	}
}

// TestIsDemoMode 覆盖 demo 模式开关。
func TestIsDemoMode(t *testing.T) {
	if (AuthConfig{}).isDemoMode() {
		t.Error("默认不应是 demo 模式")
	}
	if !(AuthConfig{Demo: DemoModeConfig{Enabled: true}}).isDemoMode() {
		t.Error("Enabled=true 应为 demo 模式")
	}
}

// TestRequestIsAllowedNonDemo 覆盖非 demo 模式一律放行。
func TestRequestIsAllowedNonDemo(t *testing.T) {
	cfg := AuthConfig{}
	if !cfg.requestIsAllowed(http.MethodPost, "/api/admin/users/add", nil) {
		t.Error("非 demo 模式应放行任何请求")
	}
}

// TestRequestIsAllowedPathNormalization 覆盖路径归一化（去尾斜杠、空路径）。
func TestRequestIsAllowedPathNormalization(t *testing.T) {
	cfg := AuthConfig{Demo: DemoModeConfig{Enabled: true, Username: "demo"}}
	u := &userdb.Reader{Username: "demo"}

	// 带尾斜杠的屏蔽路径仍应被拒绝。
	if cfg.requestIsAllowed(http.MethodGet, "/api/admin/users/owner/", u) {
		t.Error("带尾斜杠的屏蔽路径仍应被拒绝")
	}
	// 空路径归一化为 "/"，GET 放行。
	if !cfg.requestIsAllowed(http.MethodGet, "", u) {
		t.Error("空路径归一化为 / 后 GET 应放行")
	}
	// 小写方法名应被规范化。
	if !cfg.requestIsAllowed("get", "/api/books", u) {
		t.Error("小写方法名应被规范化后放行")
	}
}

// TestSignCookieEmptyValue 覆盖空值签名。
func TestSignCookieEmptyValue(t *testing.T) {
	cfg := testAuthConfig()
	signed := SignCookie(cfg.CookieSecret, "k", "", cfg.now())
	got := DecodeSignedValue(cfg.CookieSecret, "k", []byte(signed), cookieExpiresDays, cfg.Clock)
	if len(got) != 0 {
		t.Errorf("空值往返应解出空串，得到 %q", got)
	}
}

// TestSignInJSONBody 覆盖用 JSON 体登录（前端可能用 JSON）。
func TestSignInJSONBody(t *testing.T) {
	db := authTestDB(t)
	addReader(t, db, 3, "carol", "pw", false, "")

	cfg := testAuthConfig()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/user/sign_in",
		strings.NewReader(`{"username":"carol","password":"pw"}`))
	req.Header.Set("Content-Type", "application/json")

	resp, err := SignInHandler(cfg)(&Context{Request: req, Writer: rec, DB: db})
	if err != nil {
		t.Fatalf("SignInHandler 失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Errorf("JSON 体登录应成功，得到 %v", resp["err"])
	}
}

// TestSignInDemoRestrictedSkipsSideEffects 覆盖 demo 受限用户跳过登录副作用。
func TestSignInDemoRestrictedSkipsSideEffects(t *testing.T) {
	db := authTestDB(t)
	addReader(t, db, 9, "demo", "pw", false, "")

	cfg := testAuthConfig()
	cfg.Demo = DemoModeConfig{Enabled: true, Username: "demo"}

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/user/sign_in",
		strings.NewReader("username=demo&password=pw"))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := SignInHandler(cfg)(&Context{Request: req, Writer: rec, DB: db})
	if err != nil || resp["err"] != "ok" {
		t.Fatalf("demo 账号登录应成功: resp=%v err=%v", resp, err)
	}

	// demo 受限用户不应刷新 access_time / 记录 login_ip。
	back, err := userdb.GetReaderByID(db, 9)
	if err != nil || back == nil {
		t.Fatalf("重新读取失败: %v", err)
	}
	if back.AccessTime != "2026-01-01 00:00:00" {
		t.Errorf("demo 受限用户不应刷新 access_time，得到 %q", back.AccessTime)
	}
	if _, ok := back.Extra["login_ip"]; ok {
		t.Error("demo 受限用户不应记录 login_ip")
	}
}

// TestSignInDemoRejectsOtherAccount 覆盖 demo 模式拒绝非白名单账号。
func TestSignInDemoRejectsOtherAccount(t *testing.T) {
	db := authTestDB(t)
	addReader(t, db, 4, "other", "pw", false, "")

	cfg := testAuthConfig()
	cfg.Demo = DemoModeConfig{Enabled: true, Username: "demo"}

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/user/sign_in",
		strings.NewReader("username=other&password=pw"))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := SignInHandler(cfg)(&Context{Request: req, Writer: rec, DB: db})
	if err != nil {
		t.Fatalf("不应返回 error: %v", err)
	}
	if resp["err"] != "demo.account_only" {
		t.Errorf("err = %v, want demo.account_only", resp["err"])
	}
}

// TestSignInDBError 覆盖数据库错误向上传播。
func TestSignInDBError(t *testing.T) {
	db := authTestDB(t)
	db.Close()

	cfg := testAuthConfig()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/user/sign_in",
		strings.NewReader("username=a&password=b"))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	if _, err := SignInHandler(cfg)(&Context{Request: req, Writer: rec, DB: db}); err == nil {
		t.Error("库不可用时应返回 error")
	}
}

// TestWelcomeDBUnused 覆盖 welcome 不依赖数据库。
func TestWelcomeDBUnused(t *testing.T) {
	cfg := testAuthConfig()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/welcome", nil)
	resp, err := WelcomeHandler(cfg)(&Context{Request: req, Writer: rec, DB: nil})
	if err != nil || resp["err"] != "free" {
		t.Fatalf("welcome 不应依赖数据库: resp=%v err=%v", resp, err)
	}
}

// TestRemoteIPNoPort 覆盖无端口与空 RemoteAddr。
func TestRemoteIPNoPort(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "1.2.3.4"
	if got := remoteIP(req); got != "1.2.3.4" {
		t.Errorf("无端口时应原样返回，得到 %q", got)
	}

	req = httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = ""
	if got := remoteIP(req); got != "" {
		t.Errorf("空 RemoteAddr 应返回空串，得到 %q", got)
	}
}
