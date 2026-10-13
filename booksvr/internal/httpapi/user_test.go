package httpapi

import (
	"database/sql"
	"net/http"
	"strings"
	"testing"

	"talebook/booksvr/internal/userdb"
)

// userFixture 是一次用户模块测试的完整环境。
type userFixture struct {
	DB  *sql.DB
	Cfg UserConfig
}

// newUserFixture 建库并返回可用的配置。
func newUserFixture(t *testing.T) *userFixture {
	t.Helper()
	db := netSchemaDB(t)
	cfg := UserConfig{
		DB: db,
		Settings: map[string]any{
			"site_title":              "测试站点",
			"ALLOW_REGISTER":          true,
			"avatar_service":          "https://avatar.example.com",
			"installed":               true,
			"DEFAULT_USER_PERMISSION": "",
		},
		Version: "1.0.0",
		CDNURL:  "https://cdn.example.com",
	}
	return &userFixture{DB: db, Cfg: cfg}
}

// seedReader 插入一个读者并返回 id。
func seedReader(t *testing.T, db *sql.DB, username, password string, admin, active bool) int64 {
	t.Helper()
	hash, salt, err := userdb.HashPassword(password)
	if err != nil {
		t.Fatalf("哈希密码失败: %v", err)
	}
	adminVal, activeVal := 0, 0
	if admin {
		adminVal = 1
	}
	if active {
		activeVal = 1
	}
	res, err := db.Exec(`INSERT INTO readers (username, password, salt, name, email, avatar,
		admin, active, permission, create_time, update_time, access_time, extra)
		VALUES (?, ?, ?, ?, ?, '', ?, ?, '', '2026-01-01 00:00:00', '2026-01-01 00:00:00',
		'2026-01-01 00:00:00', '{"kindle_email":""}')`,
		username, hash, salt, username, username+"@example.com", adminVal, activeVal)
	if err != nil {
		t.Fatalf("插入读者失败: %v", err)
	}
	id, _ := res.LastInsertId()
	return id
}

// ---- UserInfo ----

func TestUserInfoGuest(t *testing.T) {
	fx := newUserFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/user/info", "", 0, false)
	got, err := UserInfoHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	user, _ := got["user"].(map[string]any)
	if user["is_login"] != false {
		t.Error("游客 is_login 应为 false")
	}
	if _, ok := got["sys"].(map[string]any); !ok {
		t.Error("应返回 sys")
	}
}

func TestUserInfoNotInstalled(t *testing.T) {
	fx := newUserFixture(t)
	fx.Cfg.Settings["installed"] = false
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/user/info", "", 0, false)
	got, err := UserInfoHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "not_installed" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestUserInfoLoggedIn(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, true)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/user/info", "", id, false)
	got, err := UserInfoHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	user, _ := got["user"].(map[string]any)
	if user["is_login"] != true {
		t.Error("is_login 应为 true")
	}
	if user["username"] != "alice" {
		t.Errorf("username = %v", user["username"])
	}
}

func TestUserInfoDetailSkipsSys(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, true)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/user/info?detail=1", "", id, false)
	got, err := UserInfoHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	sys, _ := got["sys"].(map[string]any)
	if len(sys) != 0 {
		t.Errorf("detail 模式 sys 应为空: %v", sys)
	}
}

// ---- UserMessages ----

func TestUserMessagesGuest(t *testing.T) {
	fx := newUserFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/user/messages", "", 0, false)
	got, err := UserMessagesHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	msgs, _ := got["messages"].([]any)
	if len(msgs) != 0 {
		t.Errorf("游客应无消息: %v", msgs)
	}
}

func TestUserMessagesListsUnread(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, true)
	if _, err := fx.DB.Exec(`INSERT INTO messages (id, title, status, unread, create_time,
		update_time, data, reader_id) VALUES (1, '标题', 'success', 1,
		'2026-01-01 00:00:00', '2026-01-01 00:00:00', '{}', ?)`, id); err != nil {
		t.Fatalf("插入消息失败: %v", err)
	}
	if _, err := fx.DB.Exec(`INSERT INTO messages (id, title, status, unread, create_time,
		update_time, data, reader_id) VALUES (2, '已读', 'success', 0,
		'2026-01-01 00:00:00', '2026-01-01 00:00:00', '{}', ?)`, id); err != nil {
		t.Fatalf("插入消息失败: %v", err)
	}

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/user/messages", "", id, false)
	got, err := UserMessagesHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	msgs, _ := got["messages"].([]any)
	if len(msgs) != 1 {
		t.Fatalf("应只返回未读消息，得到 %d 条", len(msgs))
	}
	m, _ := msgs[0].(map[string]any)
	if m["title"] != "标题" {
		t.Errorf("title = %v", m["title"])
	}
}

func TestUserMessagesMarkRead(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, true)
	if _, err := fx.DB.Exec(`INSERT INTO messages (id, title, status, unread, create_time,
		update_time, data, reader_id) VALUES (1, '标题', 'success', 1,
		'2026-01-01 00:00:00', '2026-01-01 00:00:00', '{}', ?)`, id); err != nil {
		t.Fatalf("插入消息失败: %v", err)
	}

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/user/messages", `{"id":1}`, id, false)
	got, err := UserMessagesHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}

	var unread int64
	if err := fx.DB.QueryRow(`SELECT unread FROM messages WHERE id = 1`).Scan(&unread); err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if unread != 0 {
		t.Error("消息应被标记为已读")
	}
}

func TestUserMessagesMarkReadMissingID(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, true)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/user/messages", `{}`, id, false)
	got, err := UserMessagesHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestUserMessagesMarkReadNotFound(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, true)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/user/messages", `{"id":999}`, id, false)
	got, err := UserMessagesHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.not_found" {
		t.Errorf("err = %v", got["err"])
	}
}

// ---- UserUpdate ----

func TestUserUpdateNickname(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, true)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/user/update", `{"nickname":"新昵称"}`, id, false)
	got, err := UserUpdateHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	user, _ := userdb.GetReaderByID(fx.DB, id)
	if user.Name != "新昵称" {
		t.Errorf("name = %q", user.Name)
	}
}

func TestUserUpdateNicknameTooShort(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, true)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/user/update", `{"nickname":"ab"}`, id, false)
	got, err := UserUpdateHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.nickname.invald" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestUserUpdatePassword(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, true)
	body := `{"password0":"password123","password1":"newpassword1","password2":"newpassword1"}`
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/user/update", body, id, false)
	got, err := UserUpdateHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	user, _ := userdb.GetReaderByID(fx.DB, id)
	if !user.VerifyPassword("newpassword1") {
		t.Error("新密码应生效")
	}
}

func TestUserUpdateWrongOldPassword(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, true)
	body := `{"password0":"wrongpass","password1":"newpassword1","password2":"newpassword1"}`
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/user/update", body, id, false)
	got, err := UserUpdateHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.password.error" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestUserUpdateMismatchedPassword(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, true)
	body := `{"password0":"password123","password1":"newpassword1","password2":"different1"}`
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/user/update", body, id, false)
	got, err := UserUpdateHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.password.invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestUserUpdateKindleEmail(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, true)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/user/update",
		`{"kindle_email":"kindle@example.com"}`, id, false)
	got, err := UserUpdateHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	user, _ := userdb.GetReaderByID(fx.DB, id)
	if user.ExtraMap()["kindle_email"] != "kindle@example.com" {
		t.Errorf("kindle_email = %v", user.ExtraMap()["kindle_email"])
	}
}

func TestUserUpdateBadKindleEmail(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, true)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/user/update",
		`{"kindle_email":"not-an-email"}`, id, false)
	got, err := UserUpdateHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.email.invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestUserUpdateGuest(t *testing.T) {
	fx := newUserFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/user/update", `{"nickname":"abc"}`, 0, false)
	got, err := UserUpdateHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

// ---- SignUp ----

func TestSignUpDisabled(t *testing.T) {
	fx := newUserFixture(t)
	fx.Cfg.Settings["ALLOW_REGISTER"] = false
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/user/sign_up", "", 0, false)
	got, err := SignUpHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "register.disabled" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestSignUpSuccess(t *testing.T) {
	fx := newUserFixture(t)
	body := "email=a@example.com&nickname=Alice&username=alice&password=password123"
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/user/sign_up", body, 0, false)
	ctx.Request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	got, err := SignUpHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	user, _ := userdb.GetReaderByUsername(fx.DB, "alice")
	if user == nil {
		t.Fatal("用户应已创建")
	}
	if user.Active {
		t.Error("新用户应为未激活")
	}
	if !strings.Contains(user.Avatar, "avatar.example.com") {
		t.Errorf("avatar = %q", user.Avatar)
	}
}

func TestSignUpDuplicateUsername(t *testing.T) {
	fx := newUserFixture(t)
	seedReader(t, fx.DB, "alice", "password123", false, true)
	body := "email=a@example.com&nickname=Alice&username=alice&password=password123"
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/user/sign_up", body, 0, false)
	ctx.Request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	got, err := SignUpHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.username.exist" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestSignUpBadEmail(t *testing.T) {
	fx := newUserFixture(t)
	body := "email=bad&nickname=Alice&username=alice&password=password123"
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/user/sign_up", body, 0, false)
	ctx.Request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	got, err := SignUpHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.email.invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestSignUpShortPassword(t *testing.T) {
	fx := newUserFixture(t)
	body := "email=a@example.com&nickname=Alice&username=alice&password=short"
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/user/sign_up", body, 0, false)
	ctx.Request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	got, err := SignUpHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.password.invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestSignUpMissingFields(t *testing.T) {
	fx := newUserFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/user/sign_up", "email=a@example.com", 0, false)
	ctx.Request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	got, err := SignUpHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

// ---- UserActive ----

func TestUserActiveSuccess(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, false)
	user, _ := userdb.GetReaderByID(fx.DB, id)
	code := user.ActiveCode()

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/active/alice/"+code, "", 0, false)
	ctx.Params = []string{"alice", code}
	if _, err := UserActiveHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	after, _ := userdb.GetReaderByID(fx.DB, id)
	if !after.Active {
		t.Error("用户应已激活")
	}
}

func TestUserActiveBadCode(t *testing.T) {
	fx := newUserFixture(t)
	seedReader(t, fx.DB, "alice", "password123", false, false)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/active/alice/badcode", "", 0, false)
	ctx.Params = []string{"alice", "badcode"}
	if _, err := UserActiveHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if pluginRecorder(ctx).Code != http.StatusForbidden {
		t.Errorf("状态码 = %d", pluginRecorder(ctx).Code)
	}
}

// ---- UserReset ----

func TestUserResetSuccess(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, true)
	body := "username=alice&email=alice@example.com"
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/user/reset", body, 0, false)
	ctx.Request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	got, err := UserResetHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	user, _ := userdb.GetReaderByID(fx.DB, id)
	if user.VerifyPassword("password123") {
		t.Error("旧密码应已失效")
	}
}

func TestUserResetNoUser(t *testing.T) {
	fx := newUserFixture(t)
	body := "username=nobody&email=nobody@example.com"
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/user/reset", body, 0, false)
	ctx.Request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	got, err := UserResetHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.no_user" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestUserResetMissingParams(t *testing.T) {
	fx := newUserFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/user/reset", "username=alice", 0, false)
	ctx.Request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	got, err := UserResetHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

// ---- UserDevices ----

func TestUserDevicesList(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, true)
	if _, err := fx.DB.Exec(`INSERT INTO devices (reader_id, name, device_type, ip, port,
		schema, mailbox, create_time, update_time) VALUES (?, '我的设备', 'duokan', '1.2.3.4',
		12121, 'http', '', '2026-01-01 00:00:00', '2026-01-01 00:00:00')`, id); err != nil {
		t.Fatalf("插入设备失败: %v", err)
	}
	fx.Cfg.Settings["DEVICES"] = []any{
		map[string]any{"name": "全局设备"},
		map[string]any{"name": "我的设备"},
	}

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/user/devices", "", id, false)
	got, err := UserDevicesHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	devices, _ := got["devices"].([]any)
	// 个人设备 1 条 + 全局设备 1 条（同名被去重）。
	if len(devices) != 2 {
		t.Fatalf("设备数 = %d, want 2: %v", len(devices), devices)
	}
}

func TestUserDevicesSave(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, true)
	body := `{"devices":[{"name":"新设备","type":"kindle","ip":"5.6.7.8","port":9999}]}`
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/user/devices", body, id, false)
	got, err := UserDevicesHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	devices, _ := userdb.ListDevices(fx.DB, id)
	if len(devices) != 1 {
		t.Fatalf("设备数 = %d", len(devices))
	}
	if devices[0].Name != "新设备" || devices[0].Port != 9999 {
		t.Errorf("设备 = %+v", devices[0])
	}
}

func TestUserDevicesSaveReplaces(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, true)
	if _, err := fx.DB.Exec(`INSERT INTO devices (reader_id, name, device_type, ip, port,
		schema, mailbox, create_time, update_time) VALUES (?, '旧设备', 'duokan', '', 12121,
		'http', '', '2026-01-01 00:00:00', '2026-01-01 00:00:00')`, id); err != nil {
		t.Fatalf("插入设备失败: %v", err)
	}
	body := `{"devices":[{"name":"新设备"}]}`
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/user/devices", body, id, false)
	if _, err := UserDevicesHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	devices, _ := userdb.ListDevices(fx.DB, id)
	if len(devices) != 1 || devices[0].Name != "新设备" {
		t.Errorf("旧设备应被替换: %+v", devices)
	}
}

func TestUserDevicesSaveBadBody(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, true)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/user/devices", `{"devices":"notalist"}`, id, false)
	got, err := UserDevicesHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestUserDevicesGuest(t *testing.T) {
	fx := newUserFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/user/devices", "", 0, false)
	got, err := UserDevicesHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

// ---- 路由表 ----

func TestUserRouteSpecs(t *testing.T) {
	specs := UserRouteSpecs(UserConfig{})
	if len(specs) != 9 {
		t.Fatalf("len = %d, want 9", len(specs))
	}
	for _, s := range specs {
		if !strings.HasPrefix(s.Pattern, "/api/") {
			t.Errorf("意外路由 %q", s.Pattern)
		}
	}
}

// ---- 小工具 ----

func TestParseSizeSafe(t *testing.T) {
	cases := []struct {
		raw  string
		def  int64
		want int64
	}{
		{"8MB", 1, 8 << 20},
		{"4MB", 1, 4 << 20},
		{"1GB", 1, 1 << 30},
		{"512KB", 1, 512 << 10},
		{"1024", 1, 1024},
		{"", 99, 99},
		{"bad", 99, 99},
		{"0MB", 99, 99},
	}
	for _, tc := range cases {
		if got := parseSizeSafe(tc.raw, tc.def); got != tc.want {
			t.Errorf("parseSizeSafe(%q, %d) = %d, want %d", tc.raw, tc.def, got, tc.want)
		}
	}
}

func TestFormatTemplate(t *testing.T) {
	got := formatTemplate("你好 %(username)s，密码 %(password)s", map[string]string{
		"username": "alice",
		"password": "secret",
	})
	if got != "你好 alice，密码 secret" {
		t.Errorf("got %q", got)
	}
}

func TestSettingHelpers(t *testing.T) {
	s := map[string]any{"a": "x", "b": true, "c": 1, "d": []any{1}}
	if settingString(s, "a") != "x" {
		t.Error("settingString")
	}
	if !settingBool(s, "b", false) {
		t.Error("settingBool bool")
	}
	if !settingBool(s, "c", false) {
		t.Error("settingBool int")
	}
	if !settingBool(s, "missing", true) {
		t.Error("settingBool 默认值")
	}
	if settingBool(s, "missing", false) {
		t.Error("settingBool 默认值 false")
	}
	if len(settingList(s, "d")) != 1 {
		t.Error("settingList")
	}
	if settingList(s, "missing") != nil {
		t.Error("settingList 缺失应返回 nil")
	}
}

func TestStringOfAndInt64Of(t *testing.T) {
	if stringOf(nil) != "" || stringOf(1) != "1" || stringOf(int64(2)) != "2" ||
		stringOf(3.5) != "3.5" || stringOf(true) != "true" || stringOf(false) != "false" {
		t.Error("stringOf 分支")
	}
	if int64Of(1) != 1 || int64Of(int64(2)) != 2 || int64Of(3.9) != 3 || int64Of("4") != 4 {
		t.Error("int64Of 分支")
	}
	if int64Of("bad") != 0 || int64Of(nil) != 0 {
		t.Error("int64Of 兜底")
	}
}

// TestSettingHelpersExtra 补齐 setting* 的剩余分支。
func TestSettingHelpersExtra(t *testing.T) {
	// nil settings 走兜底。
	if settingString(nil, "a") != "" {
		t.Error("settingString(nil)")
	}
	if !settingBool(nil, "a", true) {
		t.Error("settingBool(nil) 应用默认值")
	}
	if settingAny(nil, "a") != nil {
		t.Error("settingAny(nil)")
	}
	if settingList(nil, "a") != nil {
		t.Error("settingList(nil)")
	}

	s := map[string]any{
		"str_true":  "true",
		"str_false": "false",
		"str_1":     "1",
		"i64":       int64(1),
		"f64":       float64(1),
		"zero":      int(0),
	}
	if !settingBool(s, "str_true", false) || !settingBool(s, "str_1", false) {
		t.Error("settingBool 字符串真值")
	}
	if settingBool(s, "str_false", true) {
		t.Error("settingBool 字符串假值")
	}
	if !settingBool(s, "i64", false) || !settingBool(s, "f64", false) {
		t.Error("settingBool 数值真值")
	}
	if settingBool(s, "zero", true) {
		t.Error("settingBool 零值")
	}
	// 未识别的类型回退默认值。
	if !settingBool(map[string]any{"x": []int{1}}, "x", true) {
		t.Error("settingBool 未知类型应用默认值")
	}
}

// TestStringOfExtra 补齐 stringOf 的 []byte 与默认分支。
func TestStringOfExtra(t *testing.T) {
	if stringOf([]byte("abc")) != "abc" {
		t.Error("stringOf []byte")
	}
	if stringOf([]int{1}) != "[1]" {
		t.Errorf("stringOf 默认分支 = %q", stringOf([]int{1}))
	}
}

// TestUserCountHelpers 覆盖统计函数的空库与错误分支。
func TestUserCountHelpers(t *testing.T) {
	if userCount(nil) != 0 || activeUserCount(nil) != 0 {
		t.Error("nil db 应返回 0")
	}
	fx := newUserFixture(t)
	if userCount(fx.DB) != 0 {
		t.Error("空库用户数应为 0")
	}
	seedReader(t, fx.DB, "alice", "password123", false, true)
	if userCount(fx.DB) != 1 {
		t.Errorf("用户数 = %d", userCount(fx.DB))
	}
	// access_time 为 2026-01-01，相对当前时间已超过 7 天。
	if activeUserCount(fx.DB) != 0 {
		t.Errorf("活跃数 = %d", activeUserCount(fx.DB))
	}
}

// TestUserSysInfoCounterError 覆盖统计函数报错时回退 0。
func TestUserSysInfoCounterError(t *testing.T) {
	fx := newUserFixture(t)
	fx.Cfg.CountBooks = func() (int64, error) { return 0, bsErrString("boom") }
	fx.Cfg.LastModified = func() (string, error) { return "", bsErrString("boom") }
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/user/info", "", 0, false)
	got, err := UserInfoHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	sys, _ := got["sys"].(map[string]any)
	if sys["books"] != int64(0) || sys["mtime"] != "" {
		t.Errorf("报错应回退: %v", sys)
	}
}

// TestUserInfoOfMissingReader 覆盖登录态但读者已被删除。
func TestUserInfoOfMissingReader(t *testing.T) {
	fx := newUserFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/user/info", "", 999, false)
	got, err := UserInfoHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	user, _ := got["user"].(map[string]any)
	if user["is_login"] != false {
		t.Error("读者不存在时应视为未登录")
	}
}

// TestUserInfoAvatarRewrite 覆盖头像地址改写。
func TestUserInfoAvatarRewrite(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, true)
	if _, err := fx.DB.Exec(`UPDATE readers SET avatar = ? WHERE id = ?`,
		"http://www.gravatar.com/avatar/x", id); err != nil {
		t.Fatalf("更新头像失败: %v", err)
	}
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/user/info", "", id, false)
	got, err := UserInfoHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	user, _ := got["user"].(map[string]any)
	avatar, _ := user["avatar"].(string)
	if !strings.HasPrefix(avatar, "https://") || !strings.Contains(avatar, "avatar.example.com") {
		t.Errorf("avatar = %q", avatar)
	}
}

// TestUserInfoDemoFakeAdmin 覆盖演示账号展示管理员入口。
func TestUserInfoDemoFakeAdmin(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "demo", "password123", false, true)
	fx.Cfg.Auth = AuthConfig{Demo: DemoModeConfig{Enabled: true, Username: "demo"}}
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/user/info", "", id, false)
	got, err := UserInfoHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	user, _ := got["user"].(map[string]any)
	if user["is_admin"] != true {
		t.Error("演示账号应展示管理员入口")
	}
}

func TestMd5Hex(t *testing.T) {
	// md5("") = d41d8cd98f00b204e9800998ecf8427e
	if got := md5Hex(""); got != "d41d8cd98f00b204e9800998ecf8427e" {
		t.Errorf("md5Hex(\"\") = %q", got)
	}
}
