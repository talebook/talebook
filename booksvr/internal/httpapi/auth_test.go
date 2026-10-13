package httpapi

import (
	"database/sql"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"talebook/booksvr/internal/userdb"

	_ "modernc.org/sqlite"
)

// authTestDB 建一个含 readers 表的内存库。
func authTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if _, err := db.Exec(`CREATE TABLE readers (
		id INTEGER PRIMARY KEY, username VARCHAR(200), password VARCHAR(200), salt VARCHAR(200),
		permission varchar(100), name VARCHAR(100), email VARCHAR(200), admin BOOLEAN,
		active BOOLEAN, create_time DATETIME, update_time DATETIME, access_time DATETIME,
		extra TEXT, avatar VARCHAR(200))`); err != nil {
		t.Fatalf("建表失败: %v", err)
	}
	return db
}

// addReader 插入一个读者，密码用 bcrypt。
func addReader(t *testing.T, db *sql.DB, id int64, username, rawPassword string, admin bool, perm string) {
	t.Helper()
	hash, salt, err := userdb.HashPassword(rawPassword)
	if err != nil {
		t.Fatalf("HashPassword 失败: %v", err)
	}
	adminVal := 0
	if admin {
		adminVal = 1
	}
	_, err = db.Exec(`INSERT INTO readers (id, username, password, salt, permission, name, email,
		admin, active, create_time, update_time, access_time, extra)
		VALUES (?, ?, ?, ?, ?, ?, '', ?, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00',
		'2026-01-01 00:00:00', '{}')`, id, username, hash, salt, perm, username, adminVal)
	if err != nil {
		t.Fatalf("插入读者失败: %v", err)
	}
}

// testAuthConfig 返回一个固定时钟的鉴权配置。
func testAuthConfig() AuthConfig {
	return AuthConfig{
		CookieSecret: "test-secret",
		Clock:        func() int64 { return 1791565386 },
	}
}

// TestSignCookieRoundTrip 校验 SignCookie 与 DecodeSignedValue 互为逆运算。
func TestSignCookieRoundTrip(t *testing.T) {
	cfg := testAuthConfig()
	signed := SignCookie(cfg.CookieSecret, "user_id", "42", cfg.now())

	got := DecodeSignedValue(cfg.CookieSecret, "user_id", []byte(signed), cookieExpiresDays, cfg.Clock)
	if string(got) != "42" {
		t.Fatalf("往返解码 = %q, want 42（签名串 %q）", got, signed)
	}

	// 名字不符应拒绝。
	if v := DecodeSignedValue(cfg.CookieSecret, "admin_id", []byte(signed), cookieExpiresDays, cfg.Clock); v != nil {
		t.Errorf("名字不符应返回 nil，得到 %q", v)
	}
	// 密钥不符应拒绝。
	if v := DecodeSignedValue("other", "user_id", []byte(signed), cookieExpiresDays, cfg.Clock); v != nil {
		t.Errorf("密钥不符应返回 nil，得到 %q", v)
	}
	// 篡改值应拒绝。
	if v := DecodeSignedValue(cfg.CookieSecret, "user_id", []byte(signed+"x"), cookieExpiresDays, cfg.Clock); v != nil {
		t.Errorf("篡改后应返回 nil，得到 %q", v)
	}
}

// TestSignInSuccess 覆盖登录成功路径与 cookie 写入。
func TestSignInSuccess(t *testing.T) {
	db := authTestDB(t)
	addReader(t, db, 7, "alice", "secret123", false, "")

	cfg := testAuthConfig()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/user/sign_in",
		strings.NewReader(url.Values{"username": {"Alice"}, "password": {"secret123"}}.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	ctx := &Context{Request: req, Writer: rec, DB: db}
	resp, err := SignInHandler(cfg)(ctx)
	if err != nil {
		t.Fatalf("SignInHandler 失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("err = %v, want ok", resp["err"])
	}

	// 应写入 user_id 与 lt 两个 cookie，且可被解码。
	cookies := map[string]string{}
	for _, c := range rec.Result().Cookies() {
		cookies[c.Name] = c.Value
	}
	if _, ok := cookies[cookieNameUserID]; !ok {
		t.Fatal("应写入 user_id cookie")
	}
	if _, ok := cookies[cookieNameLoginTime]; !ok {
		t.Fatal("应写入 lt cookie")
	}
	uid := DecodeSignedValue(cfg.CookieSecret, cookieNameUserID, []byte(cookies[cookieNameUserID]),
		cookieExpiresDays, cfg.Clock)
	if string(uid) != "7" {
		t.Errorf("user_id cookie 解出 %q, want 7", uid)
	}
	// 非管理员不应写 admin_id。
	if _, ok := cookies[cookieNameAdminID]; ok {
		t.Error("非管理员不应写入 admin_id cookie")
	}
}

// TestSignInAdminWritesAdminCookie 覆盖管理员登录写 admin_id。
func TestSignInAdminWritesAdminCookie(t *testing.T) {
	db := authTestDB(t)
	addReader(t, db, 1, "root", "pw", true, "")

	cfg := testAuthConfig()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/user/sign_in",
		strings.NewReader(url.Values{"username": {"root"}, "password": {"pw"}}.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	if _, err := SignInHandler(cfg)(&Context{Request: req, Writer: rec, DB: db}); err != nil {
		t.Fatalf("SignInHandler 失败: %v", err)
	}
	found := false
	for _, c := range rec.Result().Cookies() {
		if c.Name == cookieNameAdminID {
			found = true
		}
	}
	if !found {
		t.Error("管理员登录应写入 admin_id cookie")
	}
}

// TestSignInFailures 覆盖登录的各失败分支。
func TestSignInFailures(t *testing.T) {
	db := authTestDB(t)
	addReader(t, db, 1, "alice", "secret123", false, "")
	addReader(t, db, 2, "nologin", "pw", false, "L") // 大写 L = 显式拒绝登录

	cfg := testAuthConfig()
	cases := []struct {
		name, username, password, wantErr string
	}{
		{"空用户名", "", "pw", "params.invalid"},
		{"空密码", "alice", "", "params.invalid"},
		{"用户不存在", "nobody", "pw", "params.no_user"},
		{"密码错误", "alice", "wrong", "params.invalid"},
		{"无权登录", "nologin", "pw", "permission"},
	}
	for _, c := range cases {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/api/user/sign_in",
			strings.NewReader(url.Values{"username": {c.username}, "password": {c.password}}.Encode()))
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

		resp, err := SignInHandler(cfg)(&Context{Request: req, Writer: rec, DB: db})
		if err != nil {
			t.Fatalf("%s: 不应返回 error: %v", c.name, err)
		}
		if resp["err"] != c.wantErr {
			t.Errorf("%s: err = %v, want %v", c.name, resp["err"], c.wantErr)
		}
	}
}

// TestSignInMigratesLegacyPassword 覆盖旧 SHA256 密码登录后自动迁移为 bcrypt。
func TestSignInMigratesLegacyPassword(t *testing.T) {
	db := authTestDB(t)
	// 手工插入旧格式密码。
	legacy := userdb.LegacyHashForTest("secret123", "abcdefghijklmnopqrstuvwxyz012345")
	_, err := db.Exec(`INSERT INTO readers (id, username, password, salt, permission, name, email,
		admin, active, create_time, update_time, access_time, extra)
		VALUES (1, 'old', ?, 'abcdefghijklmnopqrstuvwxyz012345', '', 'old', '', 0, 1,
		'2026-01-01 00:00:00', '2026-01-01 00:00:00', '2026-01-01 00:00:00', '{}')`, legacy)
	if err != nil {
		t.Fatalf("插入旧密码读者失败: %v", err)
	}

	cfg := testAuthConfig()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/user/sign_in",
		strings.NewReader(url.Values{"username": {"old"}, "password": {"secret123"}}.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := SignInHandler(cfg)(&Context{Request: req, Writer: rec, DB: db})
	if err != nil || resp["err"] != "ok" {
		t.Fatalf("登录失败: resp=%v err=%v", resp, err)
	}

	back, err := userdb.GetReaderByID(db, 1)
	if err != nil || back == nil {
		t.Fatalf("重新读取失败: %v", err)
	}
	if back.Salt != "__bcrypt__" {
		t.Errorf("登录后密码应迁移为 bcrypt，salt = %q", back.Salt)
	}
	if !back.VerifyPassword("secret123") {
		t.Error("迁移后应能用原密码校验通过")
	}
}

// TestSignOutClearsCookies 覆盖登出清 cookie。
func TestSignOutClearsCookies(t *testing.T) {
	cfg := testAuthConfig()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/user/sign_out", nil)

	resp, err := SignOutHandler(cfg)(&Context{Request: req, Writer: rec, DB: authTestDB(t)})
	if err != nil {
		t.Fatalf("SignOutHandler 失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Errorf("err = %v, want ok", resp["err"])
	}

	cleared := map[string]bool{}
	for _, c := range rec.Result().Cookies() {
		if c.MaxAge < 0 {
			cleared[c.Name] = true
		}
	}
	for _, name := range []string{cookieNameUserID, cookieNameAdminID, cookieNameLoginTime} {
		if !cleared[name] {
			t.Errorf("应清除 cookie %s", name)
		}
	}
}

// TestWelcomeInviteFlow 覆盖访问码的 GET/POST 流程。
func TestWelcomeInviteFlow(t *testing.T) {
	cfg := testAuthConfig()

	// 未配置访问码 → free。
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/welcome", nil)
	resp, err := WelcomeHandler(cfg)(&Context{Request: req, Writer: rec, DB: authTestDB(t)})
	if err != nil || resp["err"] != "free" {
		t.Fatalf("无访问码时应返回 free: resp=%v err=%v", resp, err)
	}

	// 配置访问码 → 需要输入。
	cfg.Invite = InviteConfig{Code: "letmein", Message: "请输入访问码"}
	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/welcome", nil)
	resp, err = WelcomeHandler(cfg)(&Context{Request: req, Writer: rec, DB: authTestDB(t)})
	if err != nil || resp["err"] != "ok" {
		t.Fatalf("需要访问码时应返回 ok: resp=%v err=%v", resp, err)
	}
	if resp["welcome"] != "请输入访问码" {
		t.Errorf("welcome = %v", resp["welcome"])
	}

	// 错误访问码 → params.invalid。
	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/welcome",
		strings.NewReader(url.Values{"invite_code": {"wrong"}}.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err = WelcomeHandler(cfg)(&Context{Request: req, Writer: rec, DB: authTestDB(t)})
	if err != nil || resp["err"] != "params.invalid" {
		t.Fatalf("错误访问码应返回 params.invalid: resp=%v err=%v", resp, err)
	}

	// 正确访问码 → ok 并写 cookie。
	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/welcome",
		strings.NewReader(url.Values{"invite_code": {"letmein"}}.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err = WelcomeHandler(cfg)(&Context{Request: req, Writer: rec, DB: authTestDB(t)})
	if err != nil || resp["err"] != "ok" {
		t.Fatalf("正确访问码应返回 ok: resp=%v err=%v", resp, err)
	}
	found := false
	for _, c := range rec.Result().Cookies() {
		if c.Name == cookieNameInvited {
			found = true
		}
	}
	if !found {
		t.Error("通过访问码后应写入 invited cookie")
	}

	// 已通过访问码 → free。
	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/welcome", nil)
	req.AddCookie(&http.Cookie{Name: cookieNameInvited, Value: "1"})
	resp, err = WelcomeHandler(cfg)(&Context{Request: req, Writer: rec, DB: authTestDB(t)})
	if err != nil || resp["err"] != "free" {
		t.Fatalf("已通过访问码应返回 free: resp=%v err=%v", resp, err)
	}
}

// TestDemoModeCanLogin 覆盖 demo 模式的登录白名单。
func TestDemoModeCanLogin(t *testing.T) {
	cfg := testAuthConfig()
	cfg.Demo = DemoModeConfig{Enabled: true, Username: "demo", DefaultPassword: "talebook"}

	if !cfg.canLogin(&userdb.Reader{Username: "demo"}) {
		t.Error("demo 账号应可登录")
	}
	if !cfg.canLogin(&userdb.Reader{Username: "root", Admin: true}) {
		t.Error("真实管理员应可登录")
	}
	if cfg.canLogin(&userdb.Reader{Username: "other"}) {
		t.Error("普通账号在 demo 模式下不应可登录")
	}

	// 非 demo 模式一律允许。
	plain := testAuthConfig()
	if !plain.canLogin(&userdb.Reader{Username: "other"}) {
		t.Error("非 demo 模式应允许任何账号登录")
	}
}

// TestDemoModeRestriction 覆盖 demo 模式只读门禁。
func TestDemoModeRestriction(t *testing.T) {
	cfg := testAuthConfig()
	cfg.Demo = DemoModeConfig{Enabled: true, Username: "demo"}

	demoUser := &userdb.Reader{Username: "demo"}
	realAdmin := &userdb.Reader{Username: "root", Admin: true}

	if !cfg.isDemoRestricted(demoUser) {
		t.Error("demo 账号应受只读限制")
	}
	if cfg.isDemoRestricted(realAdmin) {
		t.Error("真实管理员不应受只读限制")
	}

	// 只读方法放行。
	if !cfg.requestIsAllowed(http.MethodGet, "/api/books", demoUser) {
		t.Error("GET 应放行")
	}
	// 被屏蔽的 GET 路径拒绝。
	if cfg.requestIsAllowed(http.MethodGet, "/api/admin/users/owner", demoUser) {
		t.Error("/api/admin/users/owner 的 GET 应被拒绝")
	}
	if cfg.requestIsAllowed(http.MethodGet, "/api/active/1/2", demoUser) {
		t.Error("/api/active/ 前缀的 GET 应被拒绝")
	}
	// 会话路径放行。
	if !cfg.requestIsAllowed(http.MethodPost, "/api/user/sign_in", demoUser) {
		t.Error("sign_in 应放行")
	}
	// 假保存路径放行。
	if !cfg.requestIsAllowed(http.MethodPost, "/api/admin/settings", demoUser) {
		t.Error("admin/settings 应放行（假保存）")
	}
	// 其他写操作拒绝。
	if cfg.requestIsAllowed(http.MethodPost, "/api/admin/users/add", demoUser) {
		t.Error("其他 POST 应被拒绝")
	}
	// 真实管理员不受限。
	if !cfg.requestIsAllowed(http.MethodPost, "/api/admin/users/add", realAdmin) {
		t.Error("真实管理员不应受限")
	}
}

// TestAuthRouteSpecs 校验 3 条鉴权路由的注册属性。
func TestAuthRouteSpecs(t *testing.T) {
	specs := AuthRouteSpecs(testAuthConfig())
	if len(specs) != 3 {
		t.Fatalf("应有 3 条路由，得到 %d", len(specs))
	}
	byPattern := map[string]RouteSpec{}
	for _, s := range specs {
		byPattern[s.Pattern] = s
	}
	if s, ok := byPattern[rWelcome]; !ok || len(s.Methods) != 2 {
		t.Errorf("/api/welcome 应支持 GET+POST: %+v", s)
	}
	if s, ok := byPattern[rSignIn]; !ok || s.Auth {
		t.Errorf("/api/user/sign_in 不应要求登录: %+v", s)
	}
	if s, ok := byPattern[rSignOut]; !ok || !s.Auth {
		t.Errorf("/api/user/sign_out 应要求登录: %+v", s)
	}
}

// TestAuthRoutesThroughServer 端到端校验路由经 Server 分发。
func TestAuthRoutesThroughServer(t *testing.T) {
	db := authTestDB(t)
	addReader(t, db, 5, "bob", "pw", false, "")

	cfg := testAuthConfig()
	srv, err := NewServer(AuthRouteSpecs(cfg))
	if err != nil {
		t.Fatalf("NewServer 失败: %v", err)
	}
	srv.DB = db
	srv.Identify = NewCookieIdentifier(cfg.CookieSecret, cfg.Clock)

	// 未登录访问 sign_out → user.need_login。
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/user/sign_out", nil))
	if !strings.Contains(rec.Body.String(), ErrNeedLogin) {
		t.Errorf("未登录应返回 %s，得到 %s", ErrNeedLogin, rec.Body.String())
	}

	// 登录成功。
	rec = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/user/sign_in",
		strings.NewReader(url.Values{"username": {"bob"}, "password": {"pw"}}.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	srv.ServeHTTP(rec, req)
	if !strings.Contains(rec.Body.String(), `"err":"ok"`) {
		t.Fatalf("登录应成功，得到 %s", rec.Body.String())
	}

	// 带 cookie 访问 sign_out → ok。
	rec2 := httptest.NewRecorder()
	req2 := httptest.NewRequest(http.MethodGet, "/api/user/sign_out", nil)
	for _, c := range rec.Result().Cookies() {
		req2.AddCookie(c)
	}
	srv.ServeHTTP(rec2, req2)
	if !strings.Contains(rec2.Body.String(), `"err":"ok"`) {
		t.Errorf("已登录登出应成功，得到 %s", rec2.Body.String())
	}
}

// TestRemoteIP 覆盖来源 IP 提取。
func TestRemoteIP(t *testing.T) {
	cases := []struct {
		xff, xri, addr, want string
	}{
		{"", "", "1.2.3.4:5678", "1.2.3.4"},
		{"9.9.9.9, 8.8.8.8", "", "1.2.3.4:5678", "9.9.9.9"},
		{"", "7.7.7.7", "1.2.3.4:5678", "7.7.7.7"},
	}
	for _, c := range cases {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.RemoteAddr = c.addr
		if c.xff != "" {
			req.Header.Set("X-Forwarded-For", c.xff)
		}
		if c.xri != "" {
			req.Header.Set("X-Real-Ip", c.xri)
		}
		if got := remoteIP(req); got != c.want {
			t.Errorf("remoteIP(xff=%q,xri=%q,addr=%q) = %q, want %q", c.xff, c.xri, c.addr, got, c.want)
		}
	}
	if got := remoteIP(nil); got != "" {
		t.Errorf("nil 请求应返回空串，得到 %q", got)
	}
}
