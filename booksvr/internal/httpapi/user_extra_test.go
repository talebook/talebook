package httpapi

import (
	"net/http"
	"testing"

	"talebook/booksvr/internal/userdb"
)

// TestUserSendActiveHandler 覆盖发送激活邮件链路。
func TestUserSendActiveHandler(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, false)

	var gotTo, gotSubject string
	fx.Cfg.SendMail = func(to, subject, body string) error {
		gotTo, gotSubject = to, subject
		return nil
	}
	fx.Cfg.SiteURL = "https://site.example.com"
	fx.Cfg.Settings["SIGNUP_MAIL_TITLE"] = "激活 %(site_title)s"
	fx.Cfg.Settings["SIGNUP_MAIL_CONTENT"] = "你好 %(username)s，请访问 %(active_link)s"

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/user/active/send", "", id, false)
	got, err := UserSendActiveHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	if gotTo != "alice@example.com" {
		t.Errorf("收件人 = %q", gotTo)
	}
	if gotSubject != "激活 测试站点" {
		t.Errorf("主题 = %q", gotSubject)
	}
}

// TestUserSendActiveGuest 覆盖未登录分支。
func TestUserSendActiveGuest(t *testing.T) {
	fx := newUserFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/user/active/send", "", 0, false)
	got, err := UserSendActiveHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

// TestUserSendActiveMailFailure 覆盖激活邮件发送失败时向上报错。
func TestUserSendActiveMailFailure(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, false)
	fx.Cfg.SendMail = func(to, subject, body string) error {
		return bsErrString("smtp down")
	}
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/user/active/send", "", id, false)
	got, err := UserSendActiveHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "mail.error" {
		t.Errorf("err = %v", got["err"])
	}
}

// TestSignUpMailFailure 覆盖注册时激活邮件发送失败。
func TestSignUpMailFailure(t *testing.T) {
	fx := newUserFixture(t)
	fx.Cfg.SendMail = func(to, subject, body string) error {
		return bsErrString("smtp down")
	}
	body := "email=a@example.com&nickname=Alice&username=alice&password=password123"
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/user/sign_up", body, 0, false)
	ctx.Request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	got, err := SignUpHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "mail.error" {
		t.Errorf("err = %v", got["err"])
	}
	// 用户仍应已创建。
	user, _ := userdb.GetReaderByUsername(fx.DB, "alice")
	if user == nil {
		t.Error("用户应已创建")
	}
}

// TestUserSendActiveEmailNilSender 覆盖未接线 SendMail 时不 panic。
func TestUserSendActiveEmailNilSender(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, false)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/user/active/send", "", id, false)
	got, err := UserSendActiveHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Errorf("err = %v", got["err"])
	}
}

// TestUserResetMailFailure 覆盖「密码已重置但邮件失败」分支。
func TestUserResetMailFailure(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, true)
	fx.Cfg.SendMail = func(to, subject, body string) error {
		return bsErrString("smtp down")
	}
	fx.Cfg.Settings["RESET_MAIL_TITLE"] = "重置 %(site_title)s"
	fx.Cfg.Settings["RESET_MAIL_CONTENT"] = "新密码 %(password)s"

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
	if got["msg"] == nil || got["msg"] == "" {
		t.Error("应提示邮件发送失败")
	}
	// 密码仍应已重置。
	user, _ := userdb.GetReaderByID(fx.DB, id)
	if user.VerifyPassword("password123") {
		t.Error("旧密码应已失效")
	}
}

// TestUserResetMailSuccess 覆盖邮件发送成功分支。
func TestUserResetMailSuccess(t *testing.T) {
	fx := newUserFixture(t)
	seedReader(t, fx.DB, "alice", "password123", false, true)
	sent := false
	fx.Cfg.SendMail = func(to, subject, body string) error {
		sent = true
		return nil
	}
	fx.Cfg.Settings["RESET_MAIL_TITLE"] = "重置 %(site_title)s"
	fx.Cfg.Settings["RESET_MAIL_CONTENT"] = "新密码 %(password)s"

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
	if !sent {
		t.Error("应发送邮件")
	}
	if _, hasMsg := got["msg"]; hasMsg {
		t.Errorf("成功时不应带 msg: %v", got["msg"])
	}
}

// TestDoneHandler 覆盖第三方登录收尾跳转。
func TestDoneHandler(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, true)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/done/", "", id, false)
	if _, err := DoneHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if pluginRecorder(ctx).Code != http.StatusFound {
		t.Errorf("状态码 = %d", pluginRecorder(ctx).Code)
	}
	if loc := pluginRecorder(ctx).Header().Get("Location"); loc != "/" {
		t.Errorf("Location = %q", loc)
	}
}

// TestDoneHandlerAutoLogin 覆盖 auto_login 开启时直接跳转。
func TestDoneHandlerAutoLogin(t *testing.T) {
	fx := newUserFixture(t)
	fx.Cfg.Settings["auto_login"] = true
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/done/", "", 0, false)
	if _, err := DoneHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if pluginRecorder(ctx).Code != http.StatusFound {
		t.Errorf("状态码 = %d", pluginRecorder(ctx).Code)
	}
}

// TestDoneHandlerGuest 覆盖未登录时跳转首页。
func TestDoneHandlerGuest(t *testing.T) {
	fx := newUserFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/done/", "", 0, false)
	if _, err := DoneHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if pluginRecorder(ctx).Code != http.StatusFound {
		t.Errorf("状态码 = %d", pluginRecorder(ctx).Code)
	}
}

// TestDoneHandlerNoLoginPermission 覆盖无权登录分支。
func TestDoneHandlerNoLoginPermission(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, true)
	// 大写 L 表示拒绝登录权限。
	if _, err := fx.DB.Exec(`UPDATE readers SET permission = 'L' WHERE id = ?`, id); err != nil {
		t.Fatalf("更新权限失败: %v", err)
	}
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/done/", "", id, false)
	if _, err := DoneHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if pluginRecorder(ctx).Code != http.StatusForbidden {
		t.Errorf("状态码 = %d", pluginRecorder(ctx).Code)
	}
}

// TestFilterHistory 覆盖阅读历史过滤与封面地址拼接。
func TestFilterHistory(t *testing.T) {
	fx := newUserFixture(t)
	fx.Cfg.BookExists = func(id int64) bool { return id != 2 }
	fx.Cfg.CDNURL = "https://cdn.example.com"

	items := []any{
		map[string]any{"id": float64(1), "timestamp": "111"},
		map[string]any{"id": float64(2), "timestamp": "222"}, // 不存在，应被过滤
		map[string]any{"id": float64(3), "timestamp": "333"},
	}
	got, ok := filterHistory(fx.Cfg, items).([]any)
	if !ok {
		t.Fatal("应返回切片")
	}
	if len(got) != 2 {
		t.Fatalf("条数 = %d, want 2", len(got))
	}
	first, _ := got[0].(map[string]any)
	if first["href"] != "/book/1" {
		t.Errorf("href = %v", first["href"])
	}
	if first["img"] != "https://cdn.example.com/get/cover/1.jpg?t=111" {
		t.Errorf("img = %v", first["img"])
	}
}

// TestFilterHistoryCapsAt12 覆盖最多保留 12 条。
func TestFilterHistoryCapsAt12(t *testing.T) {
	fx := newUserFixture(t)
	fx.Cfg.BookExists = func(int64) bool { return true }
	items := []any{}
	for i := 0; i < 20; i++ {
		items = append(items, map[string]any{"id": float64(i + 1), "timestamp": "1"})
	}
	got, _ := filterHistory(fx.Cfg, items).([]any)
	if len(got) != 12 {
		t.Errorf("条数 = %d, want 12", len(got))
	}
}

// TestFilterHistoryNonList 覆盖非列表输入原样返回。
func TestFilterHistoryNonList(t *testing.T) {
	fx := newUserFixture(t)
	if got := filterHistory(fx.Cfg, "notalist"); got != "notalist" {
		t.Errorf("got = %v", got)
	}
}

// TestUserInfoHistoryDetail 覆盖 detail 模式下的历史记录渲染。
func TestUserInfoHistoryDetail(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, true)
	fx.Cfg.BookExists = func(int64) bool { return true }
	if _, err := fx.DB.Exec(`UPDATE readers SET extra = ? WHERE id = ?`,
		`{"kindle_email":"k@example.com","read_history":[{"id":7,"timestamp":"99"}]}`, id); err != nil {
		t.Fatalf("更新 extra 失败: %v", err)
	}

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/user/info?detail=1", "", id, false)
	got, err := UserInfoHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	user, _ := got["user"].(map[string]any)
	if user["kindle_email"] != "k@example.com" {
		t.Errorf("kindle_email = %v", user["kindle_email"])
	}
	extra, _ := user["extra"].(map[string]any)
	hist, _ := extra["read_history"].([]any)
	if len(hist) != 1 {
		t.Fatalf("历史条数 = %d", len(hist))
	}
	h, _ := hist[0].(map[string]any)
	if h["href"] != "/book/7" {
		t.Errorf("href = %v", h["href"])
	}
}

// TestUserSysInfoCounts 覆盖统计字段。
func TestUserSysInfoCounts(t *testing.T) {
	fx := newUserFixture(t)
	seedReader(t, fx.DB, "alice", "password123", false, true)
	fx.Cfg.CountBooks = func() (int64, error) { return 10, nil }
	fx.Cfg.CountTags = func() (int64, error) { return 3, nil }
	fx.Cfg.CountAuthors = func() (int64, error) { return 4, nil }
	fx.Cfg.CountPublishers = func() (int64, error) { return 5, nil }
	fx.Cfg.CountSeries = func() (int64, error) { return 6, nil }
	fx.Cfg.CountFormats = func() (int64, error) { return 7, nil }
	fx.Cfg.LastModified = func() (string, error) { return "2026-01-01", nil }
	fx.Cfg.Settings["SIDEBAR_EXTRA_HTML"] = defaultSidebarHTML
	fx.Cfg.PublicURL = func(p string) string { return "/prefix" + p }

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/user/info", "", 0, false)
	got, err := UserInfoHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	sys, _ := got["sys"].(map[string]any)
	if sys["books"] != int64(10) || sys["formats"] != int64(7) {
		t.Errorf("统计 = %v", sys)
	}
	if sys["users"] != int64(1) {
		t.Errorf("users = %v", sys["users"])
	}
	if sys["mtime"] != "2026-01-01" {
		t.Errorf("mtime = %v", sys["mtime"])
	}
	sidebar, _ := sys["sidebar_extra_html"].(string)
	if sidebar == defaultSidebarHTML {
		t.Error("内置 logo 应被加上前缀")
	}
}

// TestUserSysInfoNilCounters 覆盖统计函数未接线时返回 0。
func TestUserSysInfoNilCounters(t *testing.T) {
	fx := newUserFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/user/info", "", 0, false)
	got, err := UserInfoHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	sys, _ := got["sys"].(map[string]any)
	if sys["books"] != int64(0) {
		t.Errorf("books = %v", sys["books"])
	}
}

// TestUserDevicesWithProviders 覆盖推送设备类型列表。
func TestUserDevicesWithProviders(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, true)
	fx.Cfg.EnabledPushProviders = func(*Context) []PushProvider {
		return []PushProvider{{Text: "Kindle", Value: "kindle", DefaultPort: 25}}
	}
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/user/devices", "", id, false)
	got, err := UserDevicesHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	types, _ := got["device_types"].([]any)
	if len(types) != 1 {
		t.Fatalf("设备类型数 = %d", len(types))
	}
	dt, _ := types[0].(map[string]any)
	if dt["value"] != "kindle" || dt["default_port"] != 25 {
		t.Errorf("设备类型 = %v", dt)
	}
}

// TestUserDevicesSaveDefaults 覆盖设备字段缺省值。
func TestUserDevicesSaveDefaults(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, true)
	body := `{"devices":[{"name":"极简设备"}]}`
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/user/devices", body, id, false)
	if _, err := UserDevicesHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	devices, _ := userdb.ListDevices(fx.DB, id)
	if len(devices) != 1 {
		t.Fatalf("设备数 = %d", len(devices))
	}
	d := devices[0]
	if d.DeviceType != "duokan" || d.Port != 12121 || d.Schema != "http" {
		t.Errorf("缺省值 = %+v", d)
	}
}

// TestUserDevicesSaveMissingKey 覆盖缺少 devices 键。
func TestUserDevicesSaveMissingKey(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, true)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/user/devices", `{}`, id, false)
	got, err := UserDevicesHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

// TestSignUpCaptchaRejected 覆盖人机验证失败分支。
func TestSignUpCaptchaRejected(t *testing.T) {
	fx := newUserFixture(t)
	fx.Cfg.CheckCaptcha = func(*Context, string) (bool, string) { return false, "验证失败" }
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/user/sign_up", "", 0, false)
	got, err := SignUpHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "captcha.invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

// TestUserResetCaptchaRejected 覆盖重置密码的人机验证失败分支。
func TestUserResetCaptchaRejected(t *testing.T) {
	fx := newUserFixture(t)
	fx.Cfg.CheckCaptcha = func(*Context, string) (bool, string) { return false, "验证失败" }
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/user/reset", "", 0, false)
	got, err := UserResetHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "captcha.invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

// TestUserUpdateBadJSON 覆盖请求体非法 JSON。
func TestUserUpdateBadJSON(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, true)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/user/update", `{bad`, id, false)
	got, err := UserUpdateHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

// TestUserMessagesBadJSON 覆盖消息接口的非法 JSON。
func TestUserMessagesBadJSON(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "alice", "password123", false, true)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/user/messages", `{bad`, id, false)
	got, err := UserMessagesHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

// TestUserActiveUnknownUser 覆盖激活码对应用户不存在。
func TestUserActiveUnknownUser(t *testing.T) {
	fx := newUserFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/active/nobody/code", "", 0, false)
	ctx.Params = []string{"nobody", "code"}
	if _, err := UserActiveHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if pluginRecorder(ctx).Code != http.StatusForbidden {
		t.Errorf("状态码 = %d", pluginRecorder(ctx).Code)
	}
}
