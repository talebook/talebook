package httpapi

import (
	"bytes"
	"database/sql"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"talebook/booksvr/internal/userdb"
)

// adminFixture 是一次管理后台测试的完整环境。
type adminFixture struct {
	DB  *sql.DB
	Cfg AdminConfig
}

// newAdminFixture 建库并返回配置。
func newAdminFixture(t *testing.T) *adminFixture {
	t.Helper()
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	cfg := AdminConfig{
		DB:          db,
		LibraryDB:   db,
		LibraryRoot: t.TempDir(),
		Settings: map[string]any{
			"installed":      true,
			"site_title":     "测试站点",
			"avatar_service": "https://avatar.example.com",
		},
	}
	return &adminFixture{DB: db, Cfg: cfg}
}

// adminSeedReader 插入一个读者。
func adminSeedReader(t *testing.T, db *sql.DB, id int64, username string, admin, active bool) {
	t.Helper()
	hash, salt, err := userdb.HashPassword("password123")
	if err != nil {
		t.Fatalf("哈希失败: %v", err)
	}
	a, act := 0, 0
	if admin {
		a = 1
	}
	if active {
		act = 1
	}
	if _, err := db.Exec(`INSERT INTO readers (id, username, password, salt, name, email, avatar,
		admin, active, permission, create_time, update_time, access_time, extra)
		VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, '', '2026-01-01 00:00:00', '2026-01-01 00:00:00',
		'2026-01-01 00:00:00', '{"kindle_email":""}')`,
		id, username, hash, salt, username, username+"@example.com", a, act); err != nil {
		t.Fatalf("插入读者失败: %v", err)
	}
}

// ---- 路由表 ----

func TestAdminRouteSpecs(t *testing.T) {
	specs := AdminRouteSpecs(AdminConfig{})
	if len(specs) != 23 {
		t.Fatalf("len = %d, want 23", len(specs))
	}
	for _, s := range specs {
		if !strings.HasPrefix(s.Pattern, "/api/admin/") {
			t.Errorf("意外路由 %q", s.Pattern)
		}
	}
}

// ---- 权限 ----

func TestAdminRequireGuest(t *testing.T) {
	fx := newAdminFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/users", "", 0, false)
	got, err := AdminUsersHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "user.need_login" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminRequireNonAdmin(t *testing.T) {
	fx := newAdminFixture(t)
	adminSeedReader(t, fx.DB, 1, "alice", false, true)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/users", "", 1, false)
	got, err := AdminUsersHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "permission.not_admin" {
		t.Errorf("err = %v", got["err"])
	}
}

// ---- AdminUsers ----

func TestAdminUsersList(t *testing.T) {
	fx := newAdminFixture(t)
	adminSeedReader(t, fx.DB, 1, "admin", true, true)
	adminSeedReader(t, fx.DB, 2, "alice", false, true)

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/users", "", 1, true)
	got, err := AdminUsersHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	users, _ := got["users"].(map[string]any)
	if users["total"] != 2 {
		t.Errorf("total = %v", users["total"])
	}
	items, _ := users["items"].([]map[string]any)
	if len(items) != 2 {
		t.Fatalf("items = %d", len(items))
	}
	// 权限位应存在。
	if _, ok := items[0]["can_login"]; !ok {
		t.Error("应含 can_login")
	}
}

func TestAdminUsersListSortAndPage(t *testing.T) {
	fx := newAdminFixture(t)
	for i := 1; i <= 5; i++ {
		adminSeedReader(t, fx.DB, int64(i), string(rune('a'+i-1)), false, true)
	}
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/users?num=2&page=2&sort=username&desc=false", "", 1, true)
	got, err := AdminUsersHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	users, _ := got["users"].(map[string]any)
	items, _ := users["items"].([]map[string]any)
	if len(items) != 2 {
		t.Fatalf("第 2 页条数 = %d", len(items))
	}
	// 升序：第 2 页应是 c、d。
	if items[0]["username"] != "c" {
		t.Errorf("首项 = %v", items[0]["username"])
	}
}

func TestAdminUsersListAll(t *testing.T) {
	fx := newAdminFixture(t)
	for i := 1; i <= 3; i++ {
		adminSeedReader(t, fx.DB, int64(i), string(rune('a'+i-1)), false, true)
	}
	// num <= 0 表示全部。
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/users?num=0", "", 1, true)
	got, err := AdminUsersHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	users, _ := got["users"].(map[string]any)
	items, _ := users["items"].([]map[string]any)
	if len(items) != 3 {
		t.Errorf("items = %d, want 3", len(items))
	}
}

func TestAdminUsersCreate(t *testing.T) {
	fx := newAdminFixture(t)
	adminSeedReader(t, fx.DB, 1, "admin", true, true)

	body := `{"username":"newbie","password":"password123","name":"新人","email":"n@example.com"}`
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/users", body, 1, true)
	got, err := AdminUsersHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	u, _ := userdb.GetReaderByUsername(fx.DB, "newbie")
	if u == nil {
		t.Fatal("用户应已创建")
	}
	if !u.Active {
		t.Error("默认应激活")
	}
}

func TestAdminUsersCreateMissingFields(t *testing.T) {
	fx := newAdminFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/users", `{"username":"x"}`, 1, true)
	got, err := AdminUsersHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.fields.required" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminUsersCreateDuplicate(t *testing.T) {
	fx := newAdminFixture(t)
	adminSeedReader(t, fx.DB, 1, "admin", true, true)
	body := `{"username":"admin","password":"password123","name":"x","email":"a@b.com"}`
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/users", body, 1, true)
	got, err := AdminUsersHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.user.exist" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminUsersUpdatePermission(t *testing.T) {
	fx := newAdminFixture(t)
	adminSeedReader(t, fx.DB, 1, "admin", true, true)
	adminSeedReader(t, fx.DB, 2, "alice", false, true)

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/users", `{"id":2,"permission":"r"}`, 1, true)
	got, err := AdminUsersHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	u, _ := userdb.GetReaderByID(fx.DB, 2)
	if u.Permission != "r" {
		t.Errorf("permission = %q", u.Permission)
	}
}

func TestAdminUsersUpdateBadPermission(t *testing.T) {
	fx := newAdminFixture(t)
	adminSeedReader(t, fx.DB, 1, "admin", true, true)
	adminSeedReader(t, fx.DB, 2, "alice", false, true)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/users", `{"id":2,"permission":123}`, 1, true)
	got, err := AdminUsersHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.permission.invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminUsersCannotDemoteSelf(t *testing.T) {
	fx := newAdminFixture(t)
	adminSeedReader(t, fx.DB, 1, "admin", true, true)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/users", `{"id":1,"admin":false}`, 1, true)
	got, err := AdminUsersHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.user.invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminUsersCannotDeleteSelf(t *testing.T) {
	fx := newAdminFixture(t)
	adminSeedReader(t, fx.DB, 1, "admin", true, true)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/users", `{"id":1,"delete":"admin"}`, 1, true)
	got, err := AdminUsersHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.user.invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminUsersDeleteOther(t *testing.T) {
	fx := newAdminFixture(t)
	adminSeedReader(t, fx.DB, 1, "admin", true, true)
	adminSeedReader(t, fx.DB, 2, "alice", false, true)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/users", `{"id":2,"delete":"alice"}`, 1, true)
	got, err := AdminUsersHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	u, _ := userdb.GetReaderByID(fx.DB, 2)
	if u != nil {
		t.Error("用户应已删除")
	}
}

func TestAdminUsersUpdateNotFound(t *testing.T) {
	fx := newAdminFixture(t)
	adminSeedReader(t, fx.DB, 1, "admin", true, true)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/users", `{"id":999,"active":true}`, 1, true)
	got, err := AdminUsersHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.user.not_exist" {
		t.Errorf("err = %v", got["err"])
	}
}

// ---- AdminUsersBatch ----

func TestAdminUsersBatch(t *testing.T) {
	fx := newAdminFixture(t)
	adminSeedReader(t, fx.DB, 1, "admin", true, true)
	adminSeedReader(t, fx.DB, 2, "a", false, true)
	adminSeedReader(t, fx.DB, 3, "b", false, true)

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/users/batch",
		`{"ids":[2,3],"permission":"r"}`, 1, true)
	got, err := AdminUsersBatchHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" || got["updated"] != 2 {
		t.Fatalf("got = %v", got)
	}
}

func TestAdminUsersBatchEmptyIDs(t *testing.T) {
	fx := newAdminFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/users/batch", `{"ids":[],"permission":"r"}`, 1, true)
	got, err := AdminUsersBatchHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.ids.required" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminUsersBatchTooMany(t *testing.T) {
	fx := newAdminFixture(t)
	ids := make([]string, 501)
	for i := range ids {
		ids[i] = "1"
	}
	body := `{"ids":[` + strings.Join(ids, ",") + `],"permission":"r"}`
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/users/batch", body, 1, true)
	got, err := AdminUsersBatchHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.ids.too_many" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminUsersBatchSelf(t *testing.T) {
	fx := newAdminFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/users/batch", `{"ids":[1],"permission":"r"}`, 1, true)
	got, err := AdminUsersBatchHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.user.invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminUsersBatchBadPermission(t *testing.T) {
	fx := newAdminFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/users/batch", `{"ids":[2],"permission":""}`, 1, true)
	got, err := AdminUsersBatchHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.permission.invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

// ---- AdminTestMail ----

func TestAdminTestMail(t *testing.T) {
	fx := newAdminFixture(t)
	var gotTo string
	fx.Cfg.SendMail = func(to, subject, body string) error {
		gotTo = to
		return nil
	}
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/testmail", "smtp_username=a@b.com", 1, true)
	ctx.Request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	got, err := AdminTestMailHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	if gotTo != "a@b.com" {
		t.Errorf("收件人 = %q", gotTo)
	}
}

func TestAdminTestMailFailure(t *testing.T) {
	fx := newAdminFixture(t)
	fx.Cfg.SendMail = func(string, string, string) error { return bsErrString("smtp down") }
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/testmail", "smtp_username=a@b.com", 1, true)
	ctx.Request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	got, err := AdminTestMailHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "email.server_error" {
		t.Errorf("err = %v", got["err"])
	}
}

// ---- AdminTestDB ----

func TestAdminTestDBSQLite(t *testing.T) {
	fx := newAdminFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/testdb", "user_database=sqlite:///x.db", 1, true)
	ctx.Request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	got, err := AdminTestDBHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminTestDBBeforeInstall(t *testing.T) {
	fx := newAdminFixture(t)
	fx.Cfg.Settings["installed"] = false
	fx.Cfg.TestDBConnection = func(string) error { return nil }
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/testdb", "user_database=postgres://x", 0, false)
	ctx.Request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	got, err := AdminTestDBHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Errorf("安装前应允许匿名: %v", got["err"])
	}
}

func TestAdminTestDBAfterInstallRequiresAdmin(t *testing.T) {
	fx := newAdminFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/testdb", "user_database=postgres://x", 0, false)
	ctx.Request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	got, err := AdminTestDBHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "user.need_login" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminTestDBConnectFailure(t *testing.T) {
	fx := newAdminFixture(t)
	fx.Cfg.TestDBConnection = func(string) error { return bsErrString("refused") }
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/testdb", "user_database=postgres://x", 1, true)
	ctx.Request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	got, err := AdminTestDBHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "db.connect_failed" {
		t.Errorf("err = %v", got["err"])
	}
}

// ---- AdminMigrateDB ----

func TestAdminMigrateDBSameURL(t *testing.T) {
	fx := newAdminFixture(t)
	fx.Cfg.Settings["user_database"] = "postgres://same"
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/migratedb", "user_database=postgres://same", 1, true)
	ctx.Request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	got, err := AdminMigrateDBHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminMigrateDBTargetHasData(t *testing.T) {
	fx := newAdminFixture(t)
	fx.Cfg.Settings["user_database"] = "postgres://old"
	fx.Cfg.MigrateDB = func(string, string, bool) (int, error) {
		return 42, bsErrString("target not empty")
	}
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/migratedb", "user_database=postgres://new", 1, true)
	ctx.Request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	got, err := AdminMigrateDBHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "db.target_has_data" || got["count"] != 42 {
		t.Errorf("got = %v", got)
	}
}

func TestAdminMigrateDBSuccess(t *testing.T) {
	fx := newAdminFixture(t)
	fx.Cfg.Settings["user_database"] = "postgres://old"
	fx.Cfg.MigrateDB = func(string, string, bool) (int, error) { return 0, nil }
	var saved map[string]any
	fx.Cfg.SaveSettings = func(s map[string]any) error { saved = s; return nil }

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/migratedb", "user_database=postgres://new", 1, true)
	ctx.Request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	got, err := AdminMigrateDBHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" || got["need_restart"] != true {
		t.Fatalf("got = %v", got)
	}
	if saved["user_database"] != "postgres://new" {
		t.Errorf("saved = %v", saved["user_database"])
	}
}

// ---- AdminInstall ----

func TestAdminInstallGetInstalled(t *testing.T) {
	fx := newAdminFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/install", "", 0, false)
	got, err := AdminInstallHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "installed" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminInstallGetNotInstalled(t *testing.T) {
	fx := newAdminFixture(t)
	fx.Cfg.Settings["installed"] = false
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/install", "", 0, false)
	got, err := AdminInstallHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "not_intalled" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminInstallPostAlreadyInstalled(t *testing.T) {
	fx := newAdminFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/install", "", 0, false)
	got, err := AdminInstallHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "installed" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminInstallPostSuccess(t *testing.T) {
	fx := newAdminFixture(t)
	fx.Cfg.Settings["installed"] = false
	var saved map[string]any
	fx.Cfg.SaveSettings = func(s map[string]any) error { saved = s; return nil }

	body := "username=admin&password=password123&email=a@b.com&title=我的书库&invite=false"
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/install", body, 0, false)
	ctx.Request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	got, err := AdminInstallHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	u, _ := userdb.GetReaderByUsername(fx.DB, "admin")
	if u == nil || !u.Admin || !u.Active {
		t.Errorf("管理员应已创建并激活: %+v", u)
	}
	if saved["site_title"] != "我的书库" {
		t.Errorf("site_title = %v", saved["site_title"])
	}
}

func TestAdminInstallPostBadEmail(t *testing.T) {
	fx := newAdminFixture(t)
	fx.Cfg.Settings["installed"] = false
	body := "username=admin&password=password123&email=bad&title=x"
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/install", body, 0, false)
	ctx.Request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	got, err := AdminInstallHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.email.invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminInstallPostInviteMode(t *testing.T) {
	fx := newAdminFixture(t)
	fx.Cfg.Settings["installed"] = false
	var saved map[string]any
	fx.Cfg.SaveSettings = func(s map[string]any) error { saved = s; return nil }
	body := "username=admin&password=password123&email=a@b.com&title=x&invite=true&code=SECRET"
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/install", body, 0, false)
	ctx.Request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	if _, err := AdminInstallHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if saved["INVITE_MODE"] != true || saved["INVITE_CODE"] != "SECRET" {
		t.Errorf("邀请模式未生效: %v", saved)
	}
}

// ---- AdminBookList ----

func TestAdminBookList(t *testing.T) {
	fx := newAdminFixture(t)
	insertBook(t, fx.DB, 1, "书一")
	insertBook(t, fx.DB, 2, "书二")

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/book/list", "", 1, true)
	got, err := AdminBookListHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" || got["total"] != 2 {
		t.Fatalf("got = %v", got)
	}
	items, _ := got["items"].([]map[string]any)
	if len(items) != 2 {
		t.Fatalf("items = %d", len(items))
	}
	if _, ok := items[0]["img"]; !ok {
		t.Error("应含 img")
	}
}

func TestAdminBookListPaged(t *testing.T) {
	fx := newAdminFixture(t)
	for i := 1; i <= 5; i++ {
		insertBook(t, fx.DB, int64(i), "书")
	}
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/book/list?num=2&page=2&sort=id&desc=true", "", 1, true)
	got, err := AdminBookListHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	items, _ := got["items"].([]map[string]any)
	if len(items) != 2 {
		t.Fatalf("items = %d", len(items))
	}
	// desc 降序：第 2 页应是 3、2。
	if int64Of(items[0]["id"]) != 3 {
		t.Errorf("首项 id = %v", items[0]["id"])
	}
}

// ---- AdminBookDelete ----

func TestAdminBookDeleteBadIDList(t *testing.T) {
	fx := newAdminFixture(t)
	for _, body := range []string{`{"idlist":[]}`, `{"idlist":"x"}`, `{}`} {
		ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/book/delete", body, 1, true)
		got, err := AdminBookDeleteHandler(fx.Cfg)(ctx)
		if err != nil {
			t.Fatalf("handler: %v", err)
		}
		if got["err"] != "params.error" {
			t.Errorf("%s → err = %v", body, got["err"])
		}
	}
}

func TestAdminBookDeleteCallsDeleteBook(t *testing.T) {
	fx := newAdminFixture(t)
	insertBook(t, fx.DB, 1, "书一")
	deleted := []int64{}
	fx.Cfg.DeleteBook = func(id int64, permanent bool) error {
		deleted = append(deleted, id)
		return nil
	}
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/book/delete", `{"idlist":[1]}`, 1, true)
	got, err := AdminBookDeleteHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	if len(deleted) != 1 || deleted[0] != 1 {
		t.Errorf("deleted = %v", deleted)
	}
}

func TestAdminBookDeletePrivateIsPermanent(t *testing.T) {
	fx := newAdminFixture(t)
	insertBook(t, fx.DB, 1, "私藏")
	insertItem(t, fx.DB, 1, "private", 99)
	permanent := false
	fx.Cfg.DeleteBook = func(id int64, p bool) error {
		permanent = p
		return nil
	}
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/book/delete", `{"idlist":[1]}`, 1, true)
	if _, err := AdminBookDeleteHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if !permanent {
		t.Error("私藏书应永久删除")
	}
}

func TestAdminBookDeleteExternalIndex(t *testing.T) {
	fx := newAdminFixture(t)
	insertBook(t, fx.DB, 1, "外部")
	if _, err := fx.DB.Exec(`INSERT INTO scanfiles (id, path, data, book_id) VALUES (1, '/x.epub', '{}', 1)`); err != nil {
		t.Fatalf("插入 scanfiles 失败: %v", err)
	}
	fx.Cfg.IsExternalIndexBook = func(int64) bool { return true }
	called := false
	fx.Cfg.DeleteExternalIndexBook = func(int64) error { called = true; return nil }

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/book/delete", `{"idlist":[1]}`, 1, true)
	if _, err := AdminBookDeleteHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if !called {
		t.Error("应调用外部索引删除")
	}
	var n int
	if err := fx.DB.QueryRow(`SELECT COUNT(*) FROM scanfiles WHERE book_id = 1`).Scan(&n); err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if n != 0 {
		t.Error("scanfiles 记录应被清理")
	}
}

// ---- AdminBookConvert ----

func TestAdminBookConvertStatus(t *testing.T) {
	fx := newAdminFixture(t)
	fx.Cfg.ConvertStatus = func() map[string]any {
		return map[string]any{"total": 10, "skip": 1, "done": 5, "fail": 0, "running": true}
	}
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/book/kindleconvert", "", 1, true)
	got, err := AdminBookConvertHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	status, _ := got["status"].(map[string]any)
	if status["running"] != true || status["total"] != 10 {
		t.Errorf("status = %v", status)
	}
}

func TestAdminBookConvertRunning(t *testing.T) {
	fx := newAdminFixture(t)
	fx.Cfg.ConvertStatus = func() map[string]any { return map[string]any{"running": true} }
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/book/kindleconvert", `{"idlist":[1]}`, 1, true)
	got, err := AdminBookConvertHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "task.running" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminBookConvertStart(t *testing.T) {
	fx := newAdminFixture(t)
	insertBook(t, fx.DB, 1, "书一")
	fx.Cfg.ConvertStatus = func() map[string]any { return map[string]any{"running": false} }
	var gotIDs []int64
	fx.Cfg.StartConvert = func(_ int64, ids []int64) error { gotIDs = ids; return nil }

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/book/kindleconvert", `{"idlist":[1]}`, 1, true)
	got, err := AdminBookConvertHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	if len(gotIDs) != 1 || gotIDs[0] != 1 {
		t.Errorf("ids = %v", gotIDs)
	}
}

func TestAdminBookConvertAllBooks(t *testing.T) {
	fx := newAdminFixture(t)
	insertBook(t, fx.DB, 1, "书一")
	insertBook(t, fx.DB, 2, "书二")
	fx.Cfg.ConvertStatus = func() map[string]any { return map[string]any{"running": false} }
	var gotIDs []int64
	fx.Cfg.StartConvert = func(_ int64, ids []int64) error { gotIDs = ids; return nil }

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/book/kindleconvert", `{"idlist":[]}`, 1, true)
	if _, err := AdminBookConvertHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if len(gotIDs) != 2 {
		t.Errorf("空 idlist 应转全部: %v", gotIDs)
	}
}

func TestAdminBookConvertBadIDList(t *testing.T) {
	fx := newAdminFixture(t)
	fx.Cfg.ConvertStatus = func() map[string]any { return map[string]any{"running": false} }
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/book/kindleconvert", `{"idlist":["x"]}`, 1, true)
	got, err := AdminBookConvertHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.error.idlist" {
		t.Errorf("err = %v", got["err"])
	}
}

// ---- AdminBookFill ----

func TestAdminBookFillStatus(t *testing.T) {
	fx := newAdminFixture(t)
	fx.Cfg.FillStatus = func() map[string]any { return map[string]any{"total": 5, "done": 2} }
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/book/fill", "", 1, true)
	got, err := AdminBookFillHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	status, _ := got["status"].(map[string]any)
	if status["total"] != 5 {
		t.Errorf("status = %v", status)
	}
}

func TestAdminBookFillAll(t *testing.T) {
	fx := newAdminFixture(t)
	insertBook(t, fx.DB, 1, "书一")
	var gotIDs []int64
	fx.Cfg.StartFill = func(ids []int64) error { gotIDs = ids; return nil }
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/book/fill", `{"idlist":"all"}`, 1, true)
	got, err := AdminBookFillHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	if len(gotIDs) != 1 {
		t.Errorf("ids = %v", gotIDs)
	}
}

func TestAdminBookFillBadIDList(t *testing.T) {
	fx := newAdminFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/book/fill", `{"idlist":["x"]}`, 1, true)
	got, err := AdminBookFillHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.error.idlist" {
		t.Errorf("err = %v", got["err"])
	}
}

// ---- AdminUpdate ----

func TestAdminUpdateGet(t *testing.T) {
	fx := newAdminFixture(t)
	fx.Cfg.UpdateStatus = func() map[string]any { return map[string]any{"version": "2.0"} }
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/update", "", 1, true)
	got, err := AdminUpdateHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	status, _ := got["status"].(map[string]any)
	if status["version"] != "2.0" {
		t.Errorf("status = %v", status)
	}
}

func TestAdminUpdatePost(t *testing.T) {
	fx := newAdminFixture(t)
	called := false
	fx.Cfg.CheckUpdates = func() map[string]any { called = true; return map[string]any{"version": "3.0"} }
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/update", "", 1, true)
	got, err := AdminUpdateHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if !called {
		t.Error("应触发检查")
	}
	status, _ := got["status"].(map[string]any)
	if status["version"] != "3.0" {
		t.Errorf("status = %v", status)
	}
}

func TestAdminUpdateNonAdmin(t *testing.T) {
	fx := newAdminFixture(t)
	adminSeedReader(t, fx.DB, 1, "alice", false, true)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/update", "", 1, false)
	got, err := AdminUpdateHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "permission.not_admin" {
		t.Errorf("err = %v", got["err"])
	}
}

// ---- AdminTrash ----

func TestAdminTrashList(t *testing.T) {
	fx := newAdminFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/trash", "", 1, true)
	got, err := AdminTrashHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" || got["total"] != 0 {
		t.Errorf("got = %v", got)
	}
}

func TestAdminTrashRestoreBadParams(t *testing.T) {
	fx := newAdminFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodPatch, "/api/admin/trash", `{}`, 1, true)
	got, err := AdminTrashHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminTrashDeleteRequiresConfirm(t *testing.T) {
	fx := newAdminFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodDelete, "/api/admin/trash", `{"idlist":[1]}`, 1, true)
	got, err := AdminTrashHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.confirm" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminTrashSize(t *testing.T) {
	fx := newAdminFixture(t)
	fx.Cfg.TrashSizes = func() map[string]any { return map[string]any{"trash": 100} }
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/trash/size", "", 1, true)
	got, err := AdminTrashSizeHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	sizes, _ := got["sizes"].(map[string]any)
	if sizes["trash"] != 100 {
		t.Errorf("sizes = %v", sizes)
	}
}

func TestAdminTrashClear(t *testing.T) {
	fx := newAdminFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/trash/clear", "", 1, true)
	got, err := AdminTrashClearHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminTrashClearErrors(t *testing.T) {
	fx := newAdminFixture(t)
	fx.Cfg.ClearTrash = func() []string { return []string{"权限不足"} }
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/trash/clear", "", 1, true)
	got, err := AdminTrashClearHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "error" {
		t.Errorf("err = %v", got["err"])
	}
}

// ---- AdminSystemLog ----

func TestAdminSystemLogMissingFile(t *testing.T) {
	fx := newAdminFixture(t)
	fx.Cfg.LogFile = filepath.Join(t.TempDir(), "nope.log")
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/log", "", 1, true)
	got, err := AdminSystemLogHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" || got["total"] != 0 {
		t.Errorf("got = %v", got)
	}
}

func TestAdminSystemLogTail(t *testing.T) {
	fx := newAdminFixture(t)
	logFile := filepath.Join(t.TempDir(), "talebook.log")
	content := "line1\nline2\nline3\nline4\n"
	if err := os.WriteFile(logFile, []byte(content), 0o644); err != nil {
		t.Fatalf("写日志失败: %v", err)
	}
	fx.Cfg.LogFile = logFile

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/log?lines=2", "", 1, true)
	got, err := AdminSystemLogHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["total"] != 4 {
		t.Errorf("total = %v", got["total"])
	}
	lines, _ := got["lines"].([]any)
	if len(lines) != 2 || lines[0] != "line3" || lines[1] != "line4" {
		t.Errorf("lines = %v", lines)
	}
}

func TestAdminSystemLogClampsLines(t *testing.T) {
	fx := newAdminFixture(t)
	logFile := filepath.Join(t.TempDir(), "talebook.log")
	if err := os.WriteFile(logFile, []byte("a\nb\n"), 0o644); err != nil {
		t.Fatalf("写日志失败: %v", err)
	}
	fx.Cfg.LogFile = logFile

	// 非法值回退默认；超大值被截到上限。
	for _, q := range []string{"?lines=abc", "?lines=99999", "?lines=-5"} {
		ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/log"+q, "", 1, true)
		got, err := AdminSystemLogHandler(fx.Cfg)(ctx)
		if err != nil {
			t.Fatalf("handler: %v", err)
		}
		if got["err"] != "ok" {
			t.Errorf("%s → err = %v", q, got["err"])
		}
	}
}

func TestAdminSystemLogDownload(t *testing.T) {
	fx := newAdminFixture(t)
	logFile := filepath.Join(t.TempDir(), "talebook.log")
	if err := os.WriteFile(logFile, []byte("hello\n"), 0o644); err != nil {
		t.Fatalf("写日志失败: %v", err)
	}
	fx.Cfg.LogFile = logFile

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/log/download", "", 1, true)
	if _, err := AdminSystemLogDownloadHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if body := pluginRecorder(ctx).Body.String(); body != "hello\n" {
		t.Errorf("body = %q", body)
	}
	if cd := pluginRecorder(ctx).Header().Get("Content-Disposition"); !strings.Contains(cd, "talebook.log") {
		t.Errorf("Content-Disposition = %q", cd)
	}
}

func TestAdminSystemLogDownloadGuest(t *testing.T) {
	fx := newAdminFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/log/download", "", 0, false)
	if _, err := AdminSystemLogDownloadHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if pluginRecorder(ctx).Code != http.StatusForbidden {
		t.Errorf("状态码 = %d", pluginRecorder(ctx).Code)
	}
}

func TestAdminSystemLogDownloadMissing(t *testing.T) {
	fx := newAdminFixture(t)
	fx.Cfg.LogFile = filepath.Join(t.TempDir(), "nope.log")
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/log/download", "", 1, true)
	if _, err := AdminSystemLogDownloadHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Errorf("状态码 = %d", pluginRecorder(ctx).Code)
	}
}

// ---- AdminSettings ----

func TestAdminSettingsGet(t *testing.T) {
	fx := newAdminFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/settings", "", 1, true)
	got, err := AdminSettingsHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	settings, _ := got["settings"].(map[string]any)
	if settings["site_title"] != "测试站点" {
		t.Errorf("settings = %v", settings)
	}
}

func TestAdminSettingsSave(t *testing.T) {
	fx := newAdminFixture(t)
	var saved map[string]any
	fx.Cfg.SaveSettings = func(s map[string]any) error { saved = s; return nil }
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/settings", `{"site_title":"新标题"}`, 1, true)
	got, err := AdminSettingsHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	if saved["site_title"] != "新标题" {
		t.Errorf("saved = %v", saved["site_title"])
	}
	// 原有键应保留。
	if saved["installed"] != true {
		t.Error("原有配置应保留")
	}
}

func TestAdminSettingsSaveFailure(t *testing.T) {
	fx := newAdminFixture(t)
	fx.Cfg.SaveSettings = func(map[string]any) error { return bsErrString("readonly") }
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/settings", `{"a":1}`, 1, true)
	got, err := AdminSettingsHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "file.permission" {
		t.Errorf("err = %v", got["err"])
	}
}

// ---- AdminSSL ----

func TestAdminSSLNotWired(t *testing.T) {
	fx := newAdminFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/ssl", "", 1, true)
	got, err := AdminSSLHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	// 缺少 multipart 字段 → 参数错误。
	if got["err"] != "params.ssl_error" {
		t.Errorf("err = %v", got["err"])
	}
}

// TestAdminSSLUpload 覆盖 multipart 上传与安装成功链路。
func TestAdminSSLUpload(t *testing.T) {
	fx := newAdminFixture(t)
	var gotCrt, gotKey string
	fx.Cfg.InstallSSL = func(crt, key []byte) error {
		gotCrt, gotKey = string(crt), string(key)
		return nil
	}

	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	for field, content := range map[string]string{
		"ssl_crt": "CERT-DATA",
		"ssl_key": "KEY-DATA",
	} {
		part, err := w.CreateFormFile(field, field+".pem")
		if err != nil {
			t.Fatalf("建表单失败: %v", err)
		}
		if _, err := part.Write([]byte(content)); err != nil {
			t.Fatalf("写表单失败: %v", err)
		}
	}
	if err := w.Close(); err != nil {
		t.Fatalf("关闭表单失败: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/admin/ssl", &buf)
	req.Header.Set("Content-Type", w.FormDataContentType())
	ctx := &Context{
		Request:  req,
		Writer:   httptest.NewRecorder(),
		DB:       fx.DB,
		Identity: Identity{UserID: 1, IsAdmin: true},
	}
	got, err := AdminSSLHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	if gotCrt != "CERT-DATA" || gotKey != "KEY-DATA" {
		t.Errorf("crt = %q, key = %q", gotCrt, gotKey)
	}
}

// TestAdminSSLInstallFailure 覆盖证书校验失败。
func TestAdminSSLInstallFailure(t *testing.T) {
	fx := newAdminFixture(t)
	fx.Cfg.InstallSSL = func([]byte, []byte) error { return bsErrString("bad cert") }

	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	for _, field := range []string{"ssl_crt", "ssl_key"} {
		part, _ := w.CreateFormFile(field, field+".pem")
		_, _ = part.Write([]byte("x"))
	}
	_ = w.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/admin/ssl", &buf)
	req.Header.Set("Content-Type", w.FormDataContentType())
	ctx := &Context{
		Request:  req,
		Writer:   httptest.NewRecorder(),
		DB:       fx.DB,
		Identity: Identity{UserID: 1, IsAdmin: true},
	}
	got, err := AdminSSLHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.ssl_error" {
		t.Errorf("err = %v", got["err"])
	}
}

// TestAdminSSLMissingKeyField 覆盖缺少私钥字段。
func TestAdminSSLMissingKeyField(t *testing.T) {
	fx := newAdminFixture(t)
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	part, _ := w.CreateFormFile("ssl_crt", "a.pem")
	_, _ = part.Write([]byte("x"))
	_ = w.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/admin/ssl", &buf)
	req.Header.Set("Content-Type", w.FormDataContentType())
	ctx := &Context{
		Request:  req,
		Writer:   httptest.NewRecorder(),
		DB:       fx.DB,
		Identity: Identity{UserID: 1, IsAdmin: true},
	}
	got, err := AdminSSLHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.ssl_error" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminSSLNonAdmin(t *testing.T) {
	fx := newAdminFixture(t)
	adminSeedReader(t, fx.DB, 1, "alice", false, true)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/ssl", "", 1, false)
	got, err := AdminSSLHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "permission" {
		t.Errorf("err = %v", got["err"])
	}
}

// ---- OPDS 浏览与导入 ----

func TestAdminOPDSBrowseNotWired(t *testing.T) {
	fx := newAdminFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/opds/browse", `{"url":"http://x"}`, 1, true)
	got, err := AdminOPDSBrowseHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminOPDSBrowseWired(t *testing.T) {
	fx := newAdminFixture(t)
	var gotURL string
	fx.Cfg.OpdsBrowse = func(_ *Context, url string) (map[string]any, error) {
		gotURL = url
		return map[string]any{"err": "ok", "items": []any{}}, nil
	}
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/opds/browse", `{"url":"http://x/opds"}`, 1, true)
	got, err := AdminOPDSBrowseHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" || gotURL != "http://x/opds" {
		t.Errorf("got = %v, url = %q", got, gotURL)
	}
}

func TestAdminOPDSImportStatus(t *testing.T) {
	fx := newAdminFixture(t)
	fx.Cfg.OpdsImportStatus = func() map[string]any { return map[string]any{"running": true} }
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/opds/import/status", "", 1, true)
	got, err := AdminOPDSImportStatusHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	status, _ := got["status"].(map[string]any)
	if status["running"] != true {
		t.Errorf("status = %v", status)
	}
}

func TestAdminOPDSImportFailed(t *testing.T) {
	fx := newAdminFixture(t)
	fx.Cfg.OpdsImportFailed = func() []map[string]any {
		return []map[string]any{{"id": 1, "error": "x"}}
	}
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/opds/import/failed", "", 1, true)
	got, err := AdminOPDSImportFailedHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["total"] != 1 {
		t.Errorf("total = %v", got["total"])
	}
}

func TestAdminOPDSImportRetry(t *testing.T) {
	fx := newAdminFixture(t)
	fx.Cfg.OpdsImportRetry = func(_ *Context, args map[string]any) (map[string]any, error) {
		return map[string]any{"err": "ok", "retried": args["id"]}, nil
	}
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/opds/import/retry", `{"id":7}`, 1, true)
	got, err := AdminOPDSImportRetryHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["retried"] != float64(7) {
		t.Errorf("got = %v", got)
	}
}

func TestAdminOPDSImportNotWired(t *testing.T) {
	fx := newAdminFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/opds/import", `{}`, 1, true)
	got, err := AdminOPDSImportHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

// ---- 小工具 ----

func TestAdminInt64List(t *testing.T) {
	got, err := adminInt64List([]any{float64(1), float64(2)})
	if err != nil || len(got) != 2 || got[0] != 1 {
		t.Errorf("got = %v, err = %v", got, err)
	}
	if _, err := adminInt64List("x"); err == nil {
		t.Error("非数组应报错")
	}
	if _, err := adminInt64List([]any{"x"}); err == nil {
		t.Error("非数字元素应报错")
	}
}

func TestAdminSortReaders(t *testing.T) {
	readers := []*userdb.Reader{
		{ID: 1, Username: "b", AccessTime: "2026-01-02"},
		{ID: 2, Username: "a", AccessTime: "2026-01-03"},
	}
	adminSortReaders(readers, "username", false)
	if readers[0].Username != "a" {
		t.Errorf("升序首项 = %q", readers[0].Username)
	}
	adminSortReaders(readers, "access_time", true)
	if readers[0].AccessTime != "2026-01-03" {
		t.Errorf("降序首项 = %q", readers[0].AccessTime)
	}
	adminSortReaders(readers, "id", false)
	if readers[0].ID != 1 {
		t.Errorf("按 id 升序首项 = %d", readers[0].ID)
	}
}

func TestAdminIsPrivateBook(t *testing.T) {
	fx := newAdminFixture(t)
	insertBook(t, fx.DB, 1, "公开")
	insertBook(t, fx.DB, 2, "私藏")
	insertItem(t, fx.DB, 2, "private", 99)
	if adminIsPrivateBook(fx.DB, 1) {
		t.Error("公开书不应判为私藏")
	}
	if !adminIsPrivateBook(fx.DB, 2) {
		t.Error("私藏书应判为私藏")
	}
}

func TestAdminUploadDir(t *testing.T) {
	cfg := AdminConfig{LibraryRoot: "/lib"}
	if got := adminUploadDir(cfg); got != filepath.Join("/lib", ".upload") {
		t.Errorf("got = %q", got)
	}
	cfg.UploadDir = "/up"
	if got := adminUploadDir(cfg); got != "/up" {
		t.Errorf("got = %q", got)
	}
}

func TestAdminLogFile(t *testing.T) {
	if got := adminLogFile(AdminConfig{}); got != "/data/log/talebook.log" {
		t.Errorf("got = %q", got)
	}
	if got := adminLogFile(AdminConfig{LogFile: "/x.log"}); got != "/x.log" {
		t.Errorf("got = %q", got)
	}
}
