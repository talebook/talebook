package httpapi

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"talebook/booksvr/internal/userdb"
)

// TestFormValuesGetNil 覆盖 nil formValues 的取值。
func TestFormValuesGetNil(t *testing.T) {
	var fv *formValues
	if got := fv.Get("x"); got != "" {
		t.Errorf("nil formValues 应返回空串，得到 %q", got)
	}
}

// TestFormValuesGetPriority 覆盖表单 → JSON → 查询串的优先级。
func TestFormValuesGetPriority(t *testing.T) {
	// 表单命中时优先于查询串。
	req := httptest.NewRequest(http.MethodPost, "/?k=fromquery", strings.NewReader("k=fromform"))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	if got := parseFormValues(req).Get("k"); got != "fromform" {
		t.Errorf("表单应优先，得到 %q", got)
	}

	// 表单未命中时用 JSON 体。
	req = httptest.NewRequest(http.MethodPost, "/?k=fromquery", strings.NewReader(`{"k":"fromjson"}`))
	req.Header.Set("Content-Type", "application/json")
	if got := parseFormValues(req).Get("k"); got != "fromjson" {
		t.Errorf("JSON 体应优先于查询串，得到 %q", got)
	}

	// 都未命中时用查询串。
	req = httptest.NewRequest(http.MethodPost, "/?k=fromquery", strings.NewReader("other=1"))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	if got := parseFormValues(req).Get("k"); got != "fromquery" {
		t.Errorf("应回退到查询串，得到 %q", got)
	}

	// JSON 体里的空串不应覆盖查询串。
	req = httptest.NewRequest(http.MethodPost, "/?k=fromquery", strings.NewReader(`{"k":""}`))
	req.Header.Set("Content-Type", "application/json")
	if got := parseFormValues(req).Get("k"); got != "fromquery" {
		t.Errorf("JSON 空串应回退到查询串，得到 %q", got)
	}
}

// TestParseFormValuesNilRequest 覆盖 nil 请求。
func TestParseFormValuesNilRequest(t *testing.T) {
	fv := parseFormValues(nil)
	if fv == nil {
		t.Fatal("nil 请求应返回可用的 formValues")
	}
	if got := fv.Get("x"); got != "" {
		t.Errorf("应返回空串，得到 %q", got)
	}
}

// TestSignInMigrateSaveError 覆盖密码迁移后落库失败。
func TestSignInMigrateSaveError(t *testing.T) {
	db := authTestDB(t)
	legacy := userdb.LegacyHashForTest("pw", "abcdefghijklmnopqrstuvwxyz012345")
	if _, err := db.Exec(`INSERT INTO readers (id, username, password, salt, permission, name,
		email, admin, active, create_time, update_time, access_time, extra)
		VALUES (1, 'old', ?, 'abcdefghijklmnopqrstuvwxyz012345', '', 'old', '', 0, 1,
		'2026-01-01 00:00:00', '2026-01-01 00:00:00', '2026-01-01 00:00:00', '{}')`, legacy); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	// 删掉 readers 表让 UPDATE 失败（查询走缓存不可行，改为关闭库）。
	// 这里用只读连接模拟写失败。
	ro, err := openReadOnlyCopy(t, db)
	if err != nil {
		t.Skipf("无法构造只读库: %v", err)
	}

	cfg := testAuthConfig()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/user/sign_in",
		strings.NewReader("username=old&password=pw"))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	if _, err := SignInHandler(cfg)(&Context{Request: req, Writer: rec, DB: ro}); err == nil {
		t.Error("落库失败时应返回 error")
	}
}

// TestSignInLoginSideEffectError 覆盖登录副作用写库失败。
func TestSignInLoginSideEffectError(t *testing.T) {
	db := authTestDB(t)
	addReader(t, db, 1, "u", "pw", false, "")
	ro, err := openReadOnlyCopy(t, db)
	if err != nil {
		t.Skipf("无法构造只读库: %v", err)
	}

	cfg := testAuthConfig()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/user/sign_in",
		strings.NewReader("username=u&password=pw"))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	if _, err := SignInHandler(cfg)(&Context{Request: req, Writer: rec, DB: ro}); err == nil {
		t.Error("副作用写库失败时应返回 error")
	}
}

// TestRemoteIPEmptyXFF 覆盖 X-Forwarded-For 为空串的边界。
func TestRemoteIPEmptyXFF(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "5.6.7.8:99"
	req.Header.Set("X-Forwarded-For", "  ")
	if got := remoteIP(req); got != "" {
		t.Errorf("空白 XFF 应返回空串，得到 %q", got)
	}
}
