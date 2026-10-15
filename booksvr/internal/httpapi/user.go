package httpapi

import (
	"crypto/md5"
	"database/sql"
	"encoding/hex"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"talebook/booksvr/internal/userdb"
)

// UserConfig 是用户模块的依赖注入点。
type UserConfig struct {
	// Auth 复用登录/演示模式/访问码配置。
	Auth AuthConfig
	// DB 是 Talebook 自有库（readers / devices / messages）。
	DB *sql.DB
	// Settings 是站点配置（启动快照）。
	Settings map[string]any
	// SettingsPath 是配置文件路径；非空时每次请求都从磁盘重读，
	// 使管理员保存配置后立即生效。
	SettingsPath string
	// Version 是站点版本号。
	Version string
	// CheckCaptcha 校验人机验证；返回 (是否通过, 提示)。
	CheckCaptcha func(ctx *Context, scene string) (bool, string)
	// SendMail 发送邮件。
	SendMail func(to, subject, body string) error
	// SiteURL 是站点根地址，用于拼接激活链接。
	SiteURL string
	// CDNURL 是资源前缀。
	CDNURL string
	// PublicURL 给内置 logo 加前缀。
	PublicURL func(path string) string
	// EnabledPushProviders 返回已启用的推送插件信息。
	EnabledPushProviders func(ctx *Context) []PushProvider
	// CountBooks 等统计函数；为 nil 时返回 0。
	CountBooks      func() (int64, error)
	CountTags       func() (int64, error)
	CountAuthors    func() (int64, error)
	CountPublishers func() (int64, error)
	CountSeries     func() (int64, error)
	CountFormats    func() (int64, error)
	LastModified    func() (string, error)
	// BookExists 判定书是否存在，用于历史记录过滤。
	BookExists func(id int64) bool
}

// PushProvider 描述一个可用的推送设备类型。
type PushProvider struct {
	Text        string
	Value       string
	DefaultPort int
}

// ---- 路由常量 ----

const (
	rUserInfo      = "/api/user/info"
	rUserMessages  = "/api/user/messages"
	rUserSignUp    = "/api/user/sign_up"
	rUserUpdate    = "/api/user/update"
	rUserReset     = "/api/user/reset"
	rUserDevices   = "/api/user/devices"
	rUserSendActiv = "/api/user/active/send"
	rUserActive    = "/api/active/(.*)/(.*)"
	rDone          = "/api/done/"
)

// 用户名与密码的校验规则，与 Reader.RE_USERNAME / RE_PASSWORD 一致。
var (
	reUsername = regexp.MustCompile(`^[a-zA-Z0-9_@.+-]+$`)
	rePassword = regexp.MustCompile(`^[a-zA-Z0-9_@.+-]+$`)
	reEmail    = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)
)

// ---- UserInfo ----

// UserInfoHandler 实现 /api/user/info。
func UserInfoHandler(cfg UserConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		settings := liveSettings(cfg.Settings, cfg.SettingsPath)
		if installed, ok := settings["installed"].(bool); ok && !installed {
			return map[string]any{"err": "not_installed"}, nil
		}

		detail := ctx.Query("detail") != ""
		sys := map[string]any{}
		if !detail {
			info, err := userSysInfo(cfg)
			if err != nil {
				return nil, err
			}
			sys = info
		}
		user, err := userInfoOf(cfg, ctx, detail)
		if err != nil {
			return nil, err
		}
		return map[string]any{
			"err":  "ok",
			"cdn":  cfg.CDNURL,
			"sys":  sys,
			"user": user,
		}, nil
	}
}

// userSysInfo 汇总站点统计信息。
func userSysInfo(cfg UserConfig) (map[string]any, error) {
	// 从磁盘重新读取配置，而不是用启动快照：
	// 管理员在系统设置页改完站点标题后，这里必须立即反映新值。
	cfg.Settings = liveSettings(cfg.Settings, cfg.SettingsPath)

	count := func(fn func() (int64, error)) int64 {
		if fn == nil {
			return 0
		}
		n, err := fn()
		if err != nil {
			return 0
		}
		return n
	}
	mtime := ""
	if cfg.LastModified != nil {
		if v, err := cfg.LastModified(); err == nil {
			mtime = v
		}
	}

	sidebar := settingString(cfg.Settings, "SIDEBAR_EXTRA_HTML")
	if sidebar == defaultSidebarHTML {
		// 只给内置 logo 加前缀，管理员自定义 HTML 保持原样。
		logo := "/logo/link.png"
		if cfg.PublicURL != nil {
			logo = cfg.PublicURL(logo)
		}
		sidebar = strings.Replace(sidebar, `src="/logo/link.png"`, `src="`+logo+`"`, 1)
	}

	demoMode := cfg.Auth.isDemoMode()
	// 必须保证是数组：前端写的是 store.sys.friends.map(...)，
	// 字符串虽然 truthy 却没有 .map，抛 TypeError 会让整个侧边栏渲染失败。
	socials := settingList(cfg.Settings, "SOCIALS")
	if demoMode {
		socials = []any{}
	}

	return map[string]any{
		"books":                count(cfg.CountBooks),
		"tags":                 count(cfg.CountTags),
		"authors":              count(cfg.CountAuthors),
		"publishers":           count(cfg.CountPublishers),
		"series":               count(cfg.CountSeries),
		"formats":              count(cfg.CountFormats),
		"mtime":                mtime,
		"users":                userCount(cfg.DB),
		"active":               activeUserCount(cfg.DB),
		"version":              cfg.Version,
		"title":                settingString(cfg.Settings, "site_title"),
		"socials":              socials,
		"friends":              settingList(cfg.Settings, "FRIENDS"),
		"footer":               settingString(cfg.Settings, "FOOTER"),
		"footer_extra_html":    settingString(cfg.Settings, "FOOTER_EXTRA_HTML"),
		"sidebar_extra_html":   sidebar,
		"header":               settingString(cfg.Settings, "HEADER"),
		"show_sidebar_sys":     settingBool(cfg.Settings, "SHOW_SIDEBAR_SYS", true),
		"show_network_library": settingBool(cfg.Settings, "SHOW_NETWORK_LIBRARY", true),
		"opds_enabled":         settingBool(cfg.Settings, "OPDS_ENABLED", true),
		"webdav_enabled":       settingBool(cfg.Settings, "ENABLE_WEBDAV_SERVICE", true),
		"FEEDBACK_URL":         settingString(cfg.Settings, "FEEDBACK_URL"),
		"allow": map[string]any{
			"register": settingBool(cfg.Settings, "ALLOW_REGISTER", false) && !demoMode,
			"download": settingBool(cfg.Settings, "ALLOW_GUEST_DOWNLOAD", false),
			"push":     settingBool(cfg.Settings, "ALLOW_GUEST_PUSH", false),
			"read":     settingBool(cfg.Settings, "ALLOW_GUEST_READ", false),
			"FEEDBACK": settingBool(cfg.Settings, "ALLOW_FEEDBACK", false),
		},
		"upload": map[string]any{
			"chunk_enabled":   settingBool(cfg.Settings, "UPLOAD_CHUNK_ENABLED", true),
			"chunk_threshold": parseSizeSafe(settingString(cfg.Settings, "UPLOAD_CHUNK_THRESHOLD"), 8<<20),
			"chunk_size":      parseSizeSafe(settingString(cfg.Settings, "UPLOAD_CHUNK_SIZE"), 4<<20),
		},
		"demo_mode": demoMode,
	}, nil
}

// defaultSidebarHTML 是内置侧栏 HTML 的默认值。
const defaultSidebarHTML = `<div class="sidebar-logo"><img src="/logo/link.png" /></div>`

// userCount 统计读者总数。
func userCount(db *sql.DB) int64 {
	if db == nil {
		return 0
	}
	var n int64
	if err := db.QueryRow(`SELECT COUNT(id) FROM readers`).Scan(&n); err != nil {
		return 0
	}
	return n
}

// activeUserCount 统计最近 7 天活跃读者数。
func activeUserCount(db *sql.DB) int64 {
	if db == nil {
		return 0
	}
	cutoff := time.Now().AddDate(0, 0, -7).Format("2006-01-02 15:04:05")
	var n int64
	if err := db.QueryRow(`SELECT COUNT(id) FROM readers WHERE access_time > ?`, cutoff).Scan(&n); err != nil {
		return 0
	}
	return n
}

// userInfoOf 组装当前用户信息。
func userInfoOf(cfg UserConfig, ctx *Context, detail bool) (map[string]any, error) {
	d := map[string]any{
		"avatar":       "https://tva1.sinaimg.cn/default/images/default_avatar_male_50.gif",
		"is_login":     false,
		"is_admin":     false,
		"nickname":     "",
		"email":        "",
		"kindle_email": "",
		"extra":        map[string]any{},
	}
	if ctx.Identity.IsGuest() {
		return d, nil
	}

	user, err := userdb.GetReaderByID(cfg.DB, ctx.Identity.UserID)
	if err != nil || user == nil {
		return d, nil
	}

	// 演示模式下，配置的 demo 账号即使不是真实管理员，也展示管理员入口。
	isDemoFakeAdmin := cfg.Auth.isDemoMode() && cfg.Auth.isDemoUser(user)
	d["is_login"] = true
	d["is_admin"] = user.Admin || isDemoFakeAdmin
	d["is_active"] = user.Active
	d["nickname"] = user.Name
	d["username"] = user.Username
	d["email"] = user.Email
	d["create_time"] = user.CreateTime

	if user.Avatar != "" {
		avatar := strings.Replace(user.Avatar, "http://", "https://", 1)
		avatar = strings.Replace(avatar, "https://www.gravatar.com", settingString(cfg.Settings, "avatar_service"), 1)
		d["avatar"] = avatar
	}

	extra := user.ExtraMap()
	if len(extra) == 0 {
		return d, nil
	}
	d["kindle_email"] = stringOf(extra["kindle_email"])
	if !detail {
		return d, nil
	}

	out := map[string]any{}
	for k, v := range extra {
		if strings.HasSuffix(k, "_history") {
			v = filterHistory(cfg, v)
		}
		out[k] = v
	}
	d["extra"] = out
	return d, nil
}

// filterHistory 过滤阅读历史：只保留仍存在的书，最多 12 条。
func filterHistory(cfg UserConfig, value any) any {
	items, ok := value.([]any)
	if !ok {
		return value
	}
	kept := make([]any, 0, len(items))
	for _, raw := range items {
		b, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		id := int64Of(b["id"])
		if cfg.BookExists != nil && !cfg.BookExists(id) {
			continue
		}
		b["img"] = fmt.Sprintf("%s/get/cover/%d.jpg?t=%s", cfg.CDNURL, id, stringOf(b["timestamp"]))
		b["href"] = fmt.Sprintf("/book/%d", id)
		kept = append(kept, b)
		if len(kept) >= 12 {
			break
		}
	}
	return kept
}

// ---- UserMessages ----

// UserMessagesHandler 实现 /api/user/messages。
func UserMessagesHandler(cfg UserConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		rsp := map[string]any{"err": "ok", "messages": []any{}}
		if ctx.Identity.IsGuest() {
			return rsp, nil
		}

		// GET 列出未读消息；POST 标记已读。
		if ctx.Request.Method == http.MethodPost {
			return userMarkMessageRead(cfg, ctx)
		}

		msgs, err := userdb.ListMessages(cfg.DB, ctx.Identity.UserID, 0)
		if err != nil {
			return nil, err
		}
		list := []any{}
		for _, m := range msgs {
			if !m.Unread {
				continue
			}
			list = append(list, map[string]any{
				"id":          m.ID,
				"title":       m.Title,
				"status":      m.Status,
				"create_time": m.CreateTime,
				"data":        m.Data,
			})
		}
		rsp["messages"] = list
		return rsp, nil
	}
}

// userMarkMessageRead 把指定消息标记为已读。
func userMarkMessageRead(cfg UserConfig, ctx *Context) (map[string]any, error) {
	data, ok := decodeJSONObject(ctx.Request)
	if !ok {
		return map[string]any{"err": "params.invalid", "msg": "ID错误"}, nil
	}
	rawID, exists := data["id"]
	if !exists {
		return map[string]any{"err": "params.invalid", "msg": "ID错误"}, nil
	}
	msgID := int64Of(rawID)

	msg, err := userdb.GetMessage(cfg.DB, msgID)
	if err != nil {
		return nil, err
	}
	if msg == nil {
		return map[string]any{"err": "params.not_found", "msg": "查无此ID"}, nil
	}
	if err := userdb.MarkMessageRead(cfg.DB, msgID, time.Now().Format("2006-01-02 15:04:05")); err != nil {
		return nil, err
	}
	return map[string]any{"err": "ok"}, nil
}

// ---- UserUpdate ----

// UserUpdateHandler 实现 /api/user/update。
func UserUpdateHandler(cfg UserConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if ctx.Identity.IsGuest() {
			return map[string]any{"err": "params.invalid", "msg": "请先登录"}, nil
		}
		user, err := userdb.GetReaderByID(cfg.DB, ctx.Identity.UserID)
		if err != nil || user == nil {
			return map[string]any{"err": "params.invalid", "msg": "请先登录"}, nil
		}

		data, ok := decodeJSONObject(ctx.Request)
		if !ok {
			return map[string]any{"err": "params.invalid", "msg": "参数无效"}, nil
		}

		nickname := strings.TrimSpace(stringOf(data["nickname"]))
		if nickname != "" {
			if len([]rune(nickname)) < 3 {
				return map[string]any{"err": "params.nickname.invald", "msg": "昵称无效"}, nil
			}
			user.Name = nickname
		}

		p0 := strings.TrimSpace(stringOf(data["password0"]))
		p1 := strings.TrimSpace(stringOf(data["password1"]))
		p2 := strings.TrimSpace(stringOf(data["password2"]))
		if p0 != "" {
			if !user.VerifyPassword(p0) {
				return map[string]any{"err": "params.password.error", "msg": "密码错误"}, nil
			}
			if p1 != p2 || len(p1) < 8 || len(p1) > 20 || !rePassword.MatchString(p1) {
				return map[string]any{"err": "params.password.invalid", "msg": "密码无效"}, nil
			}
			if err := userdb.SetPassword(cfg.DB, user.ID, p1); err != nil {
				return map[string]any{"err": "db.error", "msg": "数据库操作异常，请重试"}, nil
			}
		}

		ke := strings.TrimSpace(stringOf(data["kindle_email"]))
		if ke != "" {
			if !reEmail.MatchString(ke) {
				return map[string]any{"err": "params.email.invalid", "msg": "Kindle地址无效"}, nil
			}
			if err := userdb.SetReaderExtra(cfg.DB, user.ID, "kindle_email", ke); err != nil {
				return map[string]any{"err": "db.error", "msg": "数据库操作异常，请重试"}, nil
			}
		}

		if err := userdb.UpdateReaderProfile(cfg.DB, user.ID, user.Name); err != nil {
			return map[string]any{"err": "db.error", "msg": "数据库操作异常，请重试"}, nil
		}
		return map[string]any{"err": "ok"}, nil
	}
}

// ---- SignUp / UserSendActive / UserActive ----

// SignUpHandler 实现 /api/user/sign_up。
func SignUpHandler(cfg UserConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if !settingBool(cfg.Settings, "ALLOW_REGISTER", false) {
			return map[string]any{"err": "register.disabled", "msg": "注册功能已关闭"}, nil
		}
		if cfg.CheckCaptcha != nil {
			if passed, msg := cfg.CheckCaptcha(ctx, "register"); !passed {
				return map[string]any{"err": "captcha.invalid", "msg": msg}, nil
			}
		}

		form := parseFormValues(ctx.Request)
		email := strings.TrimSpace(form.Get("email"))
		nickname := strings.TrimSpace(form.Get("nickname"))
		username := strings.ToLower(strings.TrimSpace(form.Get("username")))
		password := strings.TrimSpace(form.Get("password"))

		if nickname == "" || username == "" || password == "" {
			return map[string]any{"err": "params.invalid", "msg": "用户名或密码无效"}, nil
		}
		if !reEmail.MatchString(email) {
			return map[string]any{"err": "params.email.invalid", "msg": "Email无效"}, nil
		}
		if len(username) < 2 || len(username) > 20 || !reUsername.MatchString(username) {
			return map[string]any{"err": "params.username.invalid", "msg": "用户名无效"}, nil
		}
		if len(password) < 8 || len(password) > 20 || !rePassword.MatchString(password) {
			return map[string]any{"err": "params.password.invalid", "msg": "密码无效"}, nil
		}

		existing, err := userdb.GetReaderByUsername(cfg.DB, username)
		if err != nil {
			return nil, err
		}
		if existing != nil {
			return map[string]any{"err": "params.username.exist", "msg": "用户名已被使用"}, nil
		}

		avatar := settingString(cfg.Settings, "avatar_service") + "/avatar/" + md5Hex(email)
		id, err := userdb.CreateReaderFull(cfg.DB, userdb.NewReaderInput{
			Username:   username,
			Name:       nickname,
			Email:      email,
			Avatar:     avatar,
			Password:   password,
			Active:     false,
			Permission: settingString(cfg.Settings, "DEFAULT_USER_PERMISSION"),
		})
		if err != nil {
			return map[string]any{"err": "db.error", "msg": "系统异常，请重试或更换注册信息"}, nil
		}

		user, err := userdb.GetReaderByID(cfg.DB, id)
		if err != nil || user == nil {
			return map[string]any{"err": "db.error", "msg": "系统异常，请重试或更换注册信息"}, nil
		}
		if err := userSendActiveEmail(cfg, user); err != nil {
			return map[string]any{"err": "mail.error", "msg": "激活邮件发送失败"}, nil
		}
		return map[string]any{"err": "ok"}, nil
	}
}

// UserSendActiveHandler 实现 /api/user/active/send。
func UserSendActiveHandler(cfg UserConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if ctx.Identity.IsGuest() {
			return map[string]any{"err": "params.invalid", "msg": "请先登录"}, nil
		}
		user, err := userdb.GetReaderByID(cfg.DB, ctx.Identity.UserID)
		if err != nil || user == nil {
			return map[string]any{"err": "params.invalid", "msg": "请先登录"}, nil
		}
		if err := userSendActiveEmail(cfg, user); err != nil {
			return map[string]any{"err": "mail.error", "msg": "激活邮件发送失败"}, nil
		}
		return map[string]any{"err": "ok"}, nil
	}
}

// userSendActiveEmail 发送激活邮件。
//
// 对应 Python 的 SignUp.send_active_email：原文未捕获 send_mail 的异常，
// 因此这里也把错误向上抛，由调用方决定如何响应。
func userSendActiveEmail(cfg UserConfig, user *userdb.Reader) error {
	if cfg.SendMail == nil {
		return nil
	}
	code := user.ActiveCode()
	link := fmt.Sprintf("%s/api/active/%s/%s", cfg.SiteURL, user.Username, code)
	args := map[string]string{
		"site_title":  settingString(cfg.Settings, "site_title"),
		"username":    user.Username,
		"active_link": link,
	}
	subject := formatTemplate(settingString(cfg.Settings, "SIGNUP_MAIL_TITLE"), args)
	body := formatTemplate(settingString(cfg.Settings, "SIGNUP_MAIL_CONTENT"), args)
	return cfg.SendMail(user.Email, subject, body)
}

// UserActiveHandler 实现 /api/active/<username>/<code>。
func UserActiveHandler(cfg UserConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		username := ctx.Param(0)
		code := ctx.Param(1)

		user, err := userdb.GetReaderByUsername(cfg.DB, username)
		if err != nil {
			return nil, err
		}
		if user == nil || code != user.ActiveCode() {
			http.Error(ctx.Writer, "激活码无效", http.StatusForbidden)
			return nil, nil
		}
		if err := userdb.SetActive(cfg.DB, user.ID, true); err != nil {
			return nil, err
		}
		http.Redirect(ctx.Writer, ctx.Request, "/active/success", http.StatusFound)
		return nil, nil
	}
}

// ---- UserReset ----

// UserResetHandler 实现 /api/user/reset。
func UserResetHandler(cfg UserConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if cfg.CheckCaptcha != nil {
			if passed, msg := cfg.CheckCaptcha(ctx, "reset"); !passed {
				return map[string]any{"err": "captcha.invalid", "msg": msg}, nil
			}
		}

		form := parseFormValues(ctx.Request)
		email := strings.ToLower(strings.TrimSpace(form.Get("email")))
		username := strings.ToLower(strings.TrimSpace(form.Get("username")))
		if username == "" || email == "" {
			return map[string]any{"err": "params.invalid", "msg": "用户名或邮箱错误"}, nil
		}

		user, err := userdb.GetReaderByUsernameAndEmail(cfg.DB, username, email)
		if err != nil {
			return nil, err
		}
		if user == nil {
			return map[string]any{"err": "params.no_user", "msg": "无此用户"}, nil
		}

		newPassword, err := user.ResetPassword()
		if err != nil {
			return map[string]any{"err": "db.error", "msg": "系统繁忙"}, nil
		}
		// 先落库，确保密码不会丢失。
		if err := userdb.SaveReaderPassword(cfg.DB, user); err != nil {
			return map[string]any{"err": "db.error", "msg": "系统繁忙"}, nil
		}

		if cfg.SendMail != nil {
			args := map[string]string{
				"site_title": settingString(cfg.Settings, "site_title"),
				"username":   user.Username,
				"password":   newPassword,
			}
			subject := formatTemplate(settingString(cfg.Settings, "RESET_MAIL_TITLE"), args)
			body := formatTemplate(settingString(cfg.Settings, "RESET_MAIL_CONTENT"), args)
			if err := cfg.SendMail(user.Email, subject, body); err != nil {
				return map[string]any{
					"err": "ok",
					"msg": "密码已重置，但邮件发送失败，请联系管理员或重新请求重置",
				}, nil
			}
		}
		return map[string]any{"err": "ok"}, nil
	}
}

// ---- UserDevices ----

// UserDevicesHandler 实现 /api/user/devices。
func UserDevicesHandler(cfg UserConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if ctx.Identity.IsGuest() {
			return map[string]any{"err": "params.invalid", "msg": "请先登录"}, nil
		}
		if ctx.Request.Method == http.MethodPost {
			return userSaveDevices(cfg, ctx)
		}

		devices, err := userdb.ListDevices(cfg.DB, ctx.Identity.UserID)
		if err != nil {
			return nil, err
		}
		personal := []any{}
		used := map[string]bool{}
		for _, d := range devices {
			dict := d.ToDict()
			personal = append(personal, dict)
			used[stringOf(dict["name"])] = true
		}

		// 合并管理员配置的全局设备（不缓存，改动立即生效）。
		result := personal
		for _, raw := range settingList(cfg.Settings, "DEVICES") {
			g, ok := raw.(map[string]any)
			if !ok {
				continue
			}
			if used[stringOf(g["name"])] {
				continue
			}
			result = append(result, g)
		}

		types := []any{}
		if cfg.EnabledPushProviders != nil {
			for _, p := range cfg.EnabledPushProviders(ctx) {
				types = append(types, map[string]any{
					"text":         p.Text,
					"value":        p.Value,
					"default_port": p.DefaultPort,
				})
			}
		}
		return map[string]any{"err": "ok", "devices": result, "device_types": types}, nil
	}
}

// userSaveDevices 整体替换当前用户的设备列表。
func userSaveDevices(cfg UserConfig, ctx *Context) (map[string]any, error) {
	data, ok := decodeJSONObject(ctx.Request)
	if !ok {
		return map[string]any{"err": "params.invalid", "msg": "参数无效"}, nil
	}
	rawList, exists := data["devices"]
	if !exists {
		return map[string]any{"err": "params.invalid", "msg": "参数无效"}, nil
	}
	items, ok := rawList.([]any)
	if !ok {
		return map[string]any{"err": "params.invalid", "msg": "参数无效"}, nil
	}

	inputs := make([]userdb.DeviceInput, 0, len(items))
	for _, raw := range items {
		d, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		port := int(int64Of(d["port"]))
		if port == 0 {
			port = 12121
		}
		deviceType := stringOf(d["type"])
		if deviceType == "" {
			deviceType = "duokan"
		}
		schema := stringOf(d["schema"])
		if schema == "" {
			schema = "http"
		}
		inputs = append(inputs, userdb.DeviceInput{
			Name:       stringOf(d["name"]),
			DeviceType: deviceType,
			IP:         stringOf(d["ip"]),
			Port:       port,
			Schema:     schema,
			Mailbox:    stringOf(d["mailbox"]),
		})
	}

	if err := userdb.ReplaceDevices(cfg.DB, ctx.Identity.UserID, inputs); err != nil {
		return map[string]any{"err": "db.error", "msg": "数据库操作异常，请重试"}, nil
	}
	return map[string]any{"err": "ok", "msg": "设备保存成功"}, nil
}

// ---- Done ----

// DoneHandler 实现 /api/done/（第三方登录回调后的收尾跳转）。
func DoneHandler(cfg UserConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		// auto_login 开启时不做第三方资料同步。
		if settingBool(cfg.Settings, "auto_login", false) {
			http.Redirect(ctx.Writer, ctx.Request, "/", http.StatusFound)
			return nil, nil
		}
		user, err := userdb.GetReaderByID(cfg.DB, ctx.Identity.UserID)
		if err != nil || user == nil {
			http.Redirect(ctx.Writer, ctx.Request, "/", http.StatusFound)
			return nil, nil
		}
		if !cfg.Auth.canLogin(user) {
			http.Error(ctx.Writer, "演示模式仅允许指定账号登录", http.StatusForbidden)
			return nil, nil
		}
		if !user.CanLogin() {
			http.Error(ctx.Writer, "无权登录", http.StatusForbidden)
			return nil, nil
		}
		http.Redirect(ctx.Writer, ctx.Request, "/", http.StatusFound)
		return nil, nil
	}
}

// ---- 路由表 ----

// UserRouteSpecs 返回用户模块接管的 9 条路由。
func UserRouteSpecs(cfg UserConfig) []RouteSpec {
	methods := []string{http.MethodGet, http.MethodPost}
	return []RouteSpec{
		{Pattern: rUserInfo, Methods: methods, Handler: UserInfoHandler(cfg)},
		{Pattern: rUserMessages, Methods: methods, Handler: UserMessagesHandler(cfg)},
		{Pattern: rUserSignUp, Methods: methods, Handler: SignUpHandler(cfg)},
		{Pattern: rUserUpdate, Methods: methods, Auth: true, Handler: UserUpdateHandler(cfg)},
		{Pattern: rUserReset, Methods: methods, Handler: UserResetHandler(cfg)},
		{Pattern: rUserDevices, Methods: methods, Auth: true, Handler: UserDevicesHandler(cfg)},
		{Pattern: rUserSendActiv, Methods: methods, Auth: true, Handler: UserSendActiveHandler(cfg)},
		{Pattern: rUserActive, Methods: methods, Handler: UserActiveHandler(cfg)},
		{Pattern: rDone, Methods: methods, Handler: DoneHandler(cfg)},
	}
}

// ---- 小工具 ----

// md5Hex 返回字符串的 MD5 十六进制摘要。
func md5Hex(s string) string {
	sum := md5.Sum([]byte(s))
	return hex.EncodeToString(sum[:])
}

// formatTemplate 把 %(name)s 占位符替换成实际值。
func formatTemplate(tpl string, args map[string]string) string {
	out := tpl
	for k, v := range args {
		out = strings.ReplaceAll(out, "%("+k+")s", v)
	}
	return out
}

// settingString 读取字符串配置。
func settingString(settings map[string]any, key string) string {
	if settings == nil {
		return ""
	}
	return stringOf(settings[key])
}

// settingBool 读取布尔配置，缺失时用默认值。
func settingBool(settings map[string]any, key string, def bool) bool {
	if settings == nil {
		return def
	}
	v, ok := settings[key]
	if !ok {
		return def
	}
	switch t := v.(type) {
	case bool:
		return t
	case string:
		return t == "true" || t == "True" || t == "1"
	case int:
		return t != 0
	case int64:
		return t != 0
	case float64:
		return t != 0
	}
	return def
}

// settingAny 读取任意配置。
func settingAny(settings map[string]any, key string) any {
	if settings == nil {
		return nil
	}
	return settings[key]
}

// settingList 读取列表配置。
//
// 永远返回非 nil 的切片：前端直接对结果调 .map()，
// 返回 nil 会序列化成 JSON null，同样会让侧边栏渲染报错。
func settingList(settings map[string]any, key string) []any {
	v := settingAny(settings, key)
	if list, ok := v.([]any); ok {
		return list
	}
	return []any{}
}

// stringOf 把任意值转成字符串。
func stringOf(v any) string {
	switch t := v.(type) {
	case nil:
		return ""
	case string:
		return t
	case []byte:
		return string(t)
	case int:
		return strconv.Itoa(t)
	case int64:
		return strconv.FormatInt(t, 10)
	case float64:
		return strconv.FormatFloat(t, 'f', -1, 64)
	case bool:
		if t {
			return "true"
		}
		return "false"
	}
	return fmt.Sprint(v)
}

// int64Of 把任意值转成 int64。
func int64Of(v any) int64 {
	switch t := v.(type) {
	case int:
		return int64(t)
	case int64:
		return t
	case float64:
		return int64(t)
	case string:
		n, _ := strconv.ParseInt(strings.TrimSpace(t), 10, 64)
		return n
	}
	return 0
}

// parseSizeSafe 解析 "8MB" 这类体积字符串，失败时用默认值。
func parseSizeSafe(raw string, def int64) int64 {
	raw = strings.TrimSpace(strings.ToUpper(raw))
	if raw == "" {
		return def
	}
	mult := int64(1)
	for _, suffix := range []struct {
		s string
		m int64
	}{{"GB", 1 << 30}, {"MB", 1 << 20}, {"KB", 1 << 10}, {"B", 1}} {
		if strings.HasSuffix(raw, suffix.s) {
			mult = suffix.m
			raw = strings.TrimSuffix(raw, suffix.s)
			break
		}
	}
	n, err := strconv.ParseInt(strings.TrimSpace(raw), 10, 64)
	if err != nil || n <= 0 {
		return def
	}
	return n * mult
}
