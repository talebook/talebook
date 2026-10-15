package httpapi

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/sslcert"
	"talebook/booksvr/internal/userdb"
)

// AdminConfig 是管理后台模块的依赖注入点。
type AdminConfig struct {
	// DB 是 Talebook 自有库（readers / scanfiles / items）。
	DB *sql.DB
	// LibraryDB 是 Calibre 元数据库。
	LibraryDB *sql.DB
	// LibraryRoot 是 Calibre 书库根目录。
	LibraryRoot string
	// Settings 是站点配置。
	Settings map[string]any
	// SettingsPath 是配置文件路径。
	SettingsPath string
	// LogFile 是系统日志文件路径。
	LogFile string
	// UploadDir 是上传目录。
	UploadDir string
	// CDNURL / APIURL 用于拼接资源地址。
	CDNURL string
	APIURL string
	// BasePath 是部署前缀，用于拼出 site_url（对应 Python 的 BASE_PATH）。
	BasePath string
	// SendMail 发送邮件；cfg 携带本次发信的 SMTP 参数。
	SendMail func(cfg MailConfig, from, to, subject, body string) error
	// TestDBConnection 测试数据库连接。
	TestDBConnection func(dbURL string) error
	// MigrateDB 迁移数据库。
	MigrateDB func(sourceURL, targetURL string, force bool) (int, error)
	// SaveSettings 持久化配置。
	SaveSettings func(settings map[string]any) error
	// InstallSSL 安装 SSL 证书。
	InstallSSL func(crt, key []byte) error
	// ConvertStatus 返回批量转换状态。
	ConvertStatus func() map[string]any
	// StartConvert 启动批量转换。
	StartConvert func(userID int64, ids []int64) error
	// FillStatus 返回自动填充状态。
	FillStatus func() map[string]any
	// StartFill 启动自动填充。
	StartFill func(ids []int64) error
	// UpdateStatus 返回升级检查状态。
	UpdateStatus func() map[string]any
	// CheckUpdates 触发升级检查。
	CheckUpdates func() map[string]any
	// OpdsBrowse 浏览远端 OPDS 目录。
	OpdsBrowse func(ctx *Context, url string) (map[string]any, error)
	// OpdsImport 导入远端 OPDS 书籍。
	OpdsImport func(ctx *Context, args map[string]any) (map[string]any, error)
	// OpdsImportStatus 返回 OPDS 导入状态。
	OpdsImportStatus func() map[string]any
	// OpdsImportFailed 返回失败的 OPDS 导入项。
	OpdsImportFailed func() []map[string]any
	// OpdsImportRetry 重试失败的 OPDS 导入。
	OpdsImportRetry func(ctx *Context, args map[string]any) (map[string]any, error)
	// DeleteBook 删除一本书（permanent 为真时跳过回收站）。
	DeleteBook func(bookID int64, permanent bool) error
	// IsExternalIndexBook 判定是否为外部索引书籍。
	IsExternalIndexBook func(bookID int64) bool
	// DeleteExternalIndexBook 删除外部索引书籍记录。
	DeleteExternalIndexBook func(bookID int64) error
	// TrashSizes 返回回收站与上传目录大小。
	TrashSizes func() map[string]any
	// ClearTrash 清理回收站与上传目录，返回错误列表。
	ClearTrash func() []string
}

// ---- 路由常量 ----

const (
	rAdminSSL         = "/api/admin/ssl"
	rAdminUsers       = "/api/admin/users"
	rAdminUsersBatch  = "/api/admin/users/batch"
	rAdminInstall     = "/api/admin/install"
	rAdminSettings    = "/api/admin/settings"
	rAdminTestMail    = "/api/admin/testmail"
	rAdminTestDB      = "/api/admin/testdb"
	rAdminMigrateDB   = "/api/admin/migratedb"
	rAdminUpdate      = "/api/admin/update"
	rAdminBookList    = "/api/admin/book/list"
	rAdminBookFill    = "/api/admin/book/fill"
	rAdminBookDelete  = "/api/admin/book/delete"
	rAdminBookConvert = "/api/admin/book/kindleconvert"
	rAdminOpdsBrowse  = "/api/admin/opds/browse"
	rAdminOpdsImport  = "/api/admin/opds/import"
	rAdminOpdsStatus  = "/api/admin/opds/import/status"
	rAdminOpdsFailed  = "/api/admin/opds/import/failed"
	rAdminOpdsRetry   = "/api/admin/opds/import/retry"
	rAdminTrash       = "/api/admin/trash"
	rAdminTrashSize   = "/api/admin/trash/size"
	rAdminTrashClear  = "/api/admin/trash/clear"
	rAdminLog         = "/api/admin/log"
	rAdminLogDownload = "/api/admin/log/download"
)

// 日志读取上限。
const (
	maxLogLines     = 2000
	defaultLogLines = 500
)

// ---- 权限辅助 ----

// adminRequire 校验管理员身份，返回错误响应或 nil。
func adminRequire(ctx *Context) map[string]any {
	if ctx.Identity.IsGuest() {
		return map[string]any{"err": "user.need_login", "msg": "请先登录"}
	}
	if !ctx.Identity.IsAdmin {
		return map[string]any{"err": "permission.not_admin", "msg": "当前用户非管理员"}
	}
	return nil
}

// ---- AdminUsers ----

// AdminUsersHandler 实现 /api/admin/users。
func AdminUsersHandler(cfg AdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if resp := adminRequire(ctx); resp != nil {
			return resp, nil
		}
		if ctx.Request.Method == http.MethodPost {
			return adminUsersPost(cfg, ctx)
		}
		return adminUsersList(cfg, ctx)
	}
}

// adminUsersList 列出用户（支持排序与分页）。
func adminUsersList(cfg AdminConfig, ctx *Context) (map[string]any, error) {
	num := intArg(ctx.Query("num"), 20)
	// num <= 0 表示显示全部。
	all := num <= 0
	page := intArg(ctx.Query("page"), 1) - 1
	if page < 0 {
		page = 0
	}
	sortBy := ctx.Query("sort")
	if sortBy == "" {
		sortBy = "access_time"
	}
	desc := ctx.Query("desc") != "false"

	readers, err := userdb.ListReaders(cfg.DB)
	if err != nil {
		return nil, err
	}
	adminSortReaders(readers, sortBy, desc)

	total := len(readers)
	pageItems := readers
	if !all {
		start := page * num
		if start > total {
			start = total
		}
		end := start + num
		if end > total {
			end = total
		}
		pageItems = readers[start:end]
	}

	items := make([]map[string]any, 0, len(pageItems))
	for _, u := range pageItems {
		items = append(items, adminUserDict(cfg, u))
	}
	return map[string]any{
		"err":   "ok",
		"users": map[string]any{"items": items, "total": total},
	}, nil
}

// adminSortReaders 按字段排序读者。
func adminSortReaders(readers []*userdb.Reader, sortBy string, desc bool) {
	key := func(r *userdb.Reader) string {
		switch sortBy {
		case "access_time":
			return r.AccessTime
		case "create_time":
			return r.CreateTime
		case "update_time":
			return r.UpdateTime
		case "username":
			return r.Username
		}
		return ""
	}
	sort.SliceStable(readers, func(i, j int) bool {
		var less bool
		if sortBy == "id" || key(readers[i]) == "" {
			less = readers[i].ID < readers[j].ID
		} else {
			less = key(readers[i]) < key(readers[j])
		}
		if desc {
			return !less
		}
		return less
	})
}

// adminUserDict 组装单个用户的响应字典。
func adminUserDict(cfg AdminConfig, u *userdb.Reader) map[string]any {
	d := map[string]any{
		"id":          u.ID,
		"username":    u.Username,
		"name":        u.Name,
		"email":       u.Email,
		"avatar":      u.Avatar,
		"is_active":   u.Active,
		"is_admin":    u.Admin,
		"is_demo":     cfg.AuthDemoUser(u),
		"extra":       u.ExtraMap(),
		"provider":    "register",
		"create_time": orNA(u.CreateTime),
		"update_time": orNA(u.UpdateTime),
		"access_time": orNA(u.AccessTime),
	}
	// 权限位。
	d["can_login"] = u.CanLogin()
	d["can_read"] = u.CanRead()
	d["can_upload"] = u.CanUpload()
	d["can_edit"] = u.CanEdit()
	d["can_delete"] = u.CanDelete()
	d["can_push"] = u.CanPush()
	d["can_save"] = u.CanSave()
	d["can_view"] = u.CanView()
	return d
}

// AuthDemoUser 判定是否为演示账号（AdminConfig 的辅助方法）。
func (cfg AdminConfig) AuthDemoUser(u *userdb.Reader) bool {
	username := settingString(cfg.Settings, "demo_username")
	if username == "" {
		return false
	}
	return strings.EqualFold(u.Username, username)
}

// adminUsersPost 创建或编辑用户。
func adminUsersPost(cfg AdminConfig, ctx *Context) (map[string]any, error) {
	data, ok := decodeJSONObject(ctx.Request)
	if !ok {
		return map[string]any{"err": "params.invalid", "msg": "参数无效"}, nil
	}
	uid := int64Of(data["id"])
	if uid == 0 {
		return adminUsersCreate(cfg, data)
	}
	return adminUsersUpdate(cfg, ctx, uid, data)
}

// adminUsersCreate 创建新用户。
func adminUsersCreate(cfg AdminConfig, data map[string]any) (map[string]any, error) {
	username := stringOf(data["username"])
	password := stringOf(data["password"])
	name := stringOf(data["name"])
	email := stringOf(data["email"])
	if username == "" || password == "" || name == "" || email == "" {
		return map[string]any{"err": "params.fields.required", "msg": "用户名、密码、昵称和邮箱为必填项"}, nil
	}

	existing, err := userdb.GetReaderByUsername(cfg.DB, username)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return map[string]any{"err": "params.user.exist", "msg": "用户名已存在"}, nil
	}

	permission := stringOf(data["permission"])
	if permission == "" {
		permission = settingString(cfg.Settings, "DEFAULT_USER_PERMISSION")
	}
	active := true
	if v, ok := data["active"].(bool); ok {
		active = v
	}
	admin := false
	if v, ok := data["admin"].(bool); ok {
		admin = v
	}

	id, err := userdb.CreateReaderFull(cfg.DB, userdb.NewReaderInput{
		Username: username, Name: name, Email: email,
		Password: password, Active: active, Permission: permission,
	})
	if err != nil {
		return map[string]any{"err": "db.error", "msg": "用户创建失败：" + err.Error()}, nil
	}
	if admin {
		if err := userdb.SetReaderAdmin(cfg.DB, id, true); err != nil {
			return map[string]any{"err": "db.error", "msg": "用户创建失败：" + err.Error()}, nil
		}
	}
	return map[string]any{"err": "ok", "msg": "用户创建成功"}, nil
}

// adminUsersUpdate 编辑或删除用户。
func adminUsersUpdate(cfg AdminConfig, ctx *Context, uid int64, data map[string]any) (map[string]any, error) {
	delete(data, "id")
	if len(data) == 0 {
		return map[string]any{"err": "params.fields.invalid", "msg": "用户配置项参数错误"}, nil
	}
	user, err := userdb.GetReaderByID(cfg.DB, uid)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return map[string]any{"err": "params.user.not_exist", "msg": "用户ID错误"}, nil
	}

	if v, ok := data["active"].(bool); ok {
		if err := userdb.SetActive(cfg.DB, uid, v); err != nil {
			return nil, err
		}
	}

	if v, ok := data["admin"].(bool); ok {
		// 不允许取消自己的管理员权限。
		if user.Admin && !v && ctx.Identity.UserID == user.ID {
			return map[string]any{"err": "params.user.invalid", "msg": "不允许取消自己的管理员权限"}, nil
		}
		if err := userdb.SetReaderAdmin(cfg.DB, uid, v); err != nil {
			return nil, err
		}
	}

	// 删除用户：delete 字段需等于用户名。
	if del := stringOf(data["delete"]); del != "" && del == user.Username {
		if ctx.Identity.UserID == user.ID {
			return map[string]any{"err": "params.user.invalid", "msg": "不允许删除自己"}, nil
		}
		if err := userdb.DeleteReader(cfg.DB, user.ID); err != nil {
			return nil, err
		}
		return map[string]any{"err": "ok", "msg": "删除成功"}, nil
	}

	if raw, exists := data["permission"]; exists {
		p, ok := raw.(string)
		if !ok {
			return map[string]any{"err": "params.permission.invalid", "msg": "权限参数不对"}, nil
		}
		if p != "" {
			if err := userdb.SetReaderPermission(cfg.DB, uid, p); err != nil {
				return nil, err
			}
		}
	}
	return map[string]any{"err": "ok"}, nil
}

// ---- AdminUsersBatch ----

// AdminUsersBatchHandler 实现 /api/admin/users/batch。
func AdminUsersBatchHandler(cfg AdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if resp := adminRequire(ctx); resp != nil {
			return resp, nil
		}
		data, ok := decodeJSONObject(ctx.Request)
		if !ok {
			return map[string]any{"err": "params.invalid", "msg": "参数无效"}, nil
		}
		ids, err := adminInt64List(data["ids"])
		if err != nil || len(ids) == 0 {
			return map[string]any{"err": "params.ids.required", "msg": "用户ID列表不能为空"}, nil
		}
		if len(ids) > 500 {
			return map[string]any{"err": "params.ids.too_many", "msg": "单次最多批量操作 500 个用户"}, nil
		}
		permission, ok := data["permission"].(string)
		if !ok || permission == "" {
			return map[string]any{"err": "params.permission.invalid", "msg": "权限参数不对"}, nil
		}
		for _, id := range ids {
			if id == ctx.Identity.UserID {
				return map[string]any{"err": "params.user.invalid", "msg": "不允许批量修改自己的权限"}, nil
			}
		}

		updated := 0
		for _, id := range ids {
			user, err := userdb.GetReaderByID(cfg.DB, id)
			if err != nil {
				return nil, err
			}
			if user == nil {
				continue
			}
			if err := userdb.SetReaderPermission(cfg.DB, id, permission); err != nil {
				return nil, err
			}
			updated++
		}
		return map[string]any{
			"err":     "ok",
			"updated": updated,
			"msg":     fmt.Sprintf("已更新 %d 个用户的权限", updated),
		}, nil
	}
}

// adminInt64List 把任意值转成 int64 列表。
func adminInt64List(v any) ([]int64, error) {
	items, ok := v.([]any)
	if !ok {
		return nil, fmt.Errorf("httpapi: 期望数组")
	}
	out := make([]int64, 0, len(items))
	for _, item := range items {
		n, ok := item.(float64)
		if !ok {
			return nil, fmt.Errorf("httpapi: 元素应为整数")
		}
		out = append(out, int64(n))
	}
	return out, nil
}

// ---- AdminTestMail ----

// AdminTestMailHandler 实现 /api/admin/testmail。
func AdminTestMailHandler(cfg AdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if resp := adminRequire(ctx); resp != nil {
			return resp, nil
		}
		// 表单里的 SMTP 参数优先（用户可能刚改完还没保存），
		// 缺省时回落到已保存的配置。
		form := parseFormValues(ctx.Request)
		pick := func(key string) string {
			if v := strings.TrimSpace(form.Get(key)); v != "" {
				return v
			}
			return settingString(cfg.Settings, key)
		}
		username := pick("smtp_username")
		if username == "" {
			return map[string]any{"err": "email.server_error", "msg": "请先填写 SMTP 用户名"}, nil
		}
		if cfg.SendMail == nil {
			return map[string]any{"err": "email.server_error", "msg": "邮件服务未接线"}, nil
		}
		// 对应 Python：发件人与收件人都是 smtp_username。
		if err := cfg.SendMail(MailConfig{
			Relay:      pick("smtp_server"),
			Username:   username,
			Password:   pick("smtp_password"),
			Encryption: pick("smtp_encryption"),
		}, username, username, "Calibre功能验证邮件",
			"这是一封测试邮件，验证邮件参数是否配置正确。"); err != nil {
			return map[string]any{"err": "email.server_error", "msg": err.Error()}, nil
		}
		return map[string]any{"err": "ok", "msg": "发送成功"}, nil
	}
}

// ---- AdminTestDB ----

// AdminTestDBHandler 实现 /api/admin/testdb。
//
// 安装前（installed=false）允许匿名调用，安装后要求管理员。
func AdminTestDBHandler(cfg AdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if settingBool(liveSettings(cfg.Settings, cfg.SettingsPath), "installed", true) {
			if ctx.Identity.IsGuest() {
				return map[string]any{"err": "user.need_login", "msg": "请先登录"}, nil
			}
			if !ctx.Identity.IsAdmin {
				return map[string]any{"err": "permission", "msg": "无权访问此接口"}, nil
			}
		}

		dbURL := adminDatabaseURL(ctx)
		if dbURL == "" {
			return map[string]any{"err": "params.invalid", "msg": "数据库配置无效"}, nil
		}
		if strings.HasPrefix(dbURL, "sqlite") {
			return map[string]any{"err": "ok", "msg": "SQLite 无需测试连接"}, nil
		}
		if cfg.TestDBConnection == nil {
			return map[string]any{"err": "db.connect_failed", "msg": "数据库测试未接线"}, nil
		}
		if err := cfg.TestDBConnection(dbURL); err != nil {
			return map[string]any{"err": "db.connect_failed", "msg": err.Error()}, nil
		}
		return map[string]any{"err": "ok", "msg": "数据库连接成功"}, nil
	}
}

// adminDatabaseURL 从请求参数拼出数据库 URL。
func adminDatabaseURL(ctx *Context) string {
	form := parseFormValues(ctx.Request)
	if v := form.Get("user_database"); v != "" {
		return v
	}
	return ctx.Query("user_database")
}

// ---- AdminMigrateDB ----

// AdminMigrateDBHandler 实现 /api/admin/migratedb。
func AdminMigrateDBHandler(cfg AdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if resp := adminRequire(ctx); resp != nil {
			return resp, nil
		}
		newURL := adminDatabaseURL(ctx)
		if newURL == "" || strings.HasPrefix(newURL, "sqlite") {
			return map[string]any{"err": "params.invalid", "msg": "目标数据库配置无效"}, nil
		}
		sourceURL := settingString(cfg.Settings, "user_database")
		if newURL == sourceURL {
			return map[string]any{"err": "params.invalid", "msg": "目标数据库与当前数据库相同"}, nil
		}
		if cfg.MigrateDB == nil {
			return map[string]any{"err": "db.migrate_failed", "msg": "数据迁移未接线"}, nil
		}

		force := strings.TrimSpace(parseFormValues(ctx.Request).Get("force")) == "1"
		count, err := cfg.MigrateDB(sourceURL, newURL, force)
		if err != nil {
			if count > 0 {
				return map[string]any{
					"err":   "db.target_has_data",
					"count": count,
					"msg":   fmt.Sprintf("目标数据库已有 %d 条记录，继续迁移将清空这些数据。如需强制迁移，请再次确认。", count),
				}, nil
			}
			return map[string]any{"err": "db.migrate_failed", "msg": "数据迁移失败: " + err.Error()}, nil
		}

		if cfg.SaveSettings != nil {
			next := map[string]any{}
			for k, v := range cfg.Settings {
				next[k] = v
			}
			next["user_database"] = newURL
			next["installed"] = true
			if err := cfg.SaveSettings(next); err != nil {
				return map[string]any{"err": "file.permission", "msg": "保存配置失败: " + err.Error()}, nil
			}
		}
		return map[string]any{"err": "ok", "msg": "数据迁移成功，请重启服务器以生效", "need_restart": true}, nil
	}
}

// ---- AdminInstall ----

// AdminInstallHandler 实现 /api/admin/install。
func AdminInstallHandler(cfg AdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		installed := settingBool(liveSettings(cfg.Settings, cfg.SettingsPath), "installed", true)
		if ctx.Request.Method == http.MethodGet {
			if installed {
				return map[string]any{"err": "installed"}, nil
			}
			return map[string]any{"err": "not_intalled"}, nil
		}
		if installed {
			return map[string]any{"err": "installed", "msg": "不可重复执行安装操作"}, nil
		}

		form := parseFormValues(ctx.Request)
		code := strings.TrimSpace(form.Get("code"))
		email := strings.ToLower(strings.TrimSpace(form.Get("email")))
		title := strings.TrimSpace(form.Get("title"))
		invite := strings.TrimSpace(form.Get("invite"))
		username := strings.ToLower(strings.TrimSpace(form.Get("username")))
		password := strings.TrimSpace(form.Get("password"))

		if username == "" || password == "" || email == "" || title == "" {
			return map[string]any{"err": "params.invalid", "msg": "填写的内容有误"}, nil
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

		// 避免重复创建。
		user, err := userdb.GetReaderByUsername(cfg.DB, username)
		if err != nil {
			return nil, err
		}
		if user == nil {
			id, err := userdb.CreateReaderFull(cfg.DB, userdb.NewReaderInput{
				Username: username, Name: username, Email: email,
				Password: password, Active: true,
			})
			if err != nil {
				return map[string]any{"err": "db.error", "msg": "系统异常，请重试或更换注册信息"}, nil
			}
			user, err = userdb.GetReaderByID(cfg.DB, id)
			if err != nil || user == nil {
				return map[string]any{"err": "db.error", "msg": "系统异常，请重试或更换注册信息"}, nil
			}
		}

		avatar := settingString(cfg.Settings, "avatar_service") + "/avatar/" + md5Hex(email)
		if err := userdb.SetReaderProfile(cfg.DB, user.ID, userdb.ReaderProfile{
			Name: username, Email: email, Avatar: avatar,
		}); err != nil {
			return map[string]any{"err": "db.error", "msg": "系统异常，请重试或更换注册信息"}, nil
		}
		if err := userdb.SetActive(cfg.DB, user.ID, true); err != nil {
			return map[string]any{"err": "db.error", "msg": "系统异常，请重试或更换注册信息"}, nil
		}
		if err := userdb.SetReaderAdmin(cfg.DB, user.ID, true); err != nil {
			return map[string]any{"err": "db.error", "msg": "系统异常，请重试或更换注册信息"}, nil
		}
		if err := userdb.SetPassword(cfg.DB, user.ID, password); err != nil {
			return map[string]any{"err": "db.error", "msg": "系统异常，请重试或更换注册信息"}, nil
		}

		if cfg.SaveSettings == nil {
			return map[string]any{"err": "file.permission", "msg": "保存配置未接线"}, nil
		}
		next := map[string]any{
			"settings_path":     cfg.SettingsPath,
			"avatar_service":    "https://cravatar.cn",
			"BOOK_NAMES_FORMAT": "utf8",
			"cookie_secret":     fmt.Sprintf("%d", time.Now().UnixNano()),
			"site_title":        title,
			"installed":         true,
		}
		if invite == "true" && code != "" {
			next["INVITE_MODE"] = true
			next["INVITE_CODE"] = code
		} else {
			next["INVITE_MODE"] = false
		}
		if err := cfg.SaveSettings(next); err != nil {
			return map[string]any{"err": "file.permission", "msg": "保存配置失败: " + err.Error()}, nil
		}
		return map[string]any{"err": "ok"}, nil
	}
}

// ---- AdminSSL ----

// AdminSSLHandler 实现 /api/admin/ssl。
func AdminSSLHandler(cfg AdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if ctx.Identity.IsGuest() {
			return map[string]any{"err": "user.need_login", "msg": "请先登录"}, nil
		}
		if !ctx.Identity.IsAdmin {
			return map[string]any{"err": "permission", "msg": "无权操作"}, nil
		}
		crt, key, err := adminSSLFiles(ctx)
		if err != nil {
			return map[string]any{"err": "params.ssl_error", "msg": err.Error()}, nil
		}
		if cfg.InstallSSL == nil {
			return map[string]any{"err": "internal.ssl_save_error", "msg": "证书安装未接线"}, nil
		}
		if err := cfg.InstallSSL(crt, key); err != nil {
			return adminSSLError(err), nil
		}
		return map[string]any{"err": "ok"}, nil
	}
}

// adminSSLError 把证书安装错误映射为接口错误码。
//
// 对应 Python SSLHandlerLogic.run 的 5 个 except 分支。
func adminSSLError(err error) map[string]any {
	var sslErr *sslcert.Error
	if errors.As(err, &sslErr) {
		switch sslErr.Kind {
		case sslcert.KindValidation:
			return map[string]any{"err": "params.ssl_error", "msg": "证书或密钥校验失败: " + err.Error()}
		case sslcert.KindSave:
			return map[string]any{"err": "internal.ssl_save_error", "msg": "证书存储失败: " + err.Error()}
		case sslcert.KindNginxConfig:
			return map[string]any{"err": "internal.nginx_test_error", "msg": "NGINX配置异常: " + err.Error()}
		case sslcert.KindNginxReload:
			return map[string]any{"err": "internal.nginx_reload_error", "msg": "NGINX重新加载配置异常: " + err.Error()}
		case sslcert.KindRollback:
			return map[string]any{"err": "internal.ssl_rollback_error", "msg": "证书更新失败且无法恢复旧证书: " + err.Error()}
		}
	}
	return map[string]any{"err": "params.ssl_error", "msg": "证书或密钥校验失败: " + err.Error()}
}

// adminSSLFiles 从 multipart 表单里取出证书与私钥。
func adminSSLFiles(ctx *Context) ([]byte, []byte, error) {
	if err := ctx.Request.ParseMultipartForm(16 << 20); err != nil {
		return nil, nil, fmt.Errorf("解析上传表单失败: %w", err)
	}
	read := func(field string) ([]byte, error) {
		files := ctx.Request.MultipartForm.File[field]
		if len(files) == 0 {
			return nil, fmt.Errorf("缺少上传字段 %s", field)
		}
		f, err := files[0].Open()
		if err != nil {
			return nil, fmt.Errorf("打开上传文件失败: %w", err)
		}
		defer func() { _ = f.Close() }()
		buf := make([]byte, 0, 4096)
		tmp := make([]byte, 4096)
		for {
			n, err := f.Read(tmp)
			if n > 0 {
				buf = append(buf, tmp[:n]...)
			}
			if err != nil {
				break
			}
		}
		return buf, nil
	}
	crt, err := read("ssl_crt")
	if err != nil {
		return nil, nil, err
	}
	key, err := read("ssl_key")
	if err != nil {
		return nil, nil, err
	}
	return crt, key, nil
}

// ---- AdminBookList ----

// AdminBookListHandler 实现 /api/admin/book/list。
func AdminBookListHandler(cfg AdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if resp := adminRequire(ctx); resp != nil {
			return resp, nil
		}
		num := intArg(ctx.Query("num"), 20)
		all := num <= 0
		page := intArg(ctx.Query("page"), 1) - 1
		if page < 0 {
			page = 0
		}
		sortBy := ctx.Query("sort")
		if sortBy == "" {
			sortBy = "id"
		}
		desc := ctx.Query("desc") == "true"
		search := ctx.Query("search")

		ids, err := library.Search(cfg.LibraryDB, search)
		if err != nil {
			return nil, err
		}
		total := len(ids)
		if sortBy == "id" {
			sort.Slice(ids, func(i, j int) bool {
				if desc {
					return ids[i] > ids[j]
				}
				return ids[i] < ids[j]
			})
		}

		pageIDs := ids
		if !all {
			start := page * num
			if start > total {
				start = total
			}
			end := start + num
			if end > total {
				end = total
			}
			pageIDs = ids[start:end]
		}

		books, err := library.GetBooksData(cfg.LibraryDB, pageIDs)
		if err != nil {
			return nil, err
		}
		items := make([]map[string]any, 0, len(books))
		for _, b := range books {
			items = append(items, adminSimpleBook(cfg, b))
		}
		return map[string]any{"err": "ok", "items": items, "total": total}, nil
	}
}

// adminSimpleBook 组装简化的书籍字典。
func adminSimpleBook(cfg AdminConfig, b library.BookData) map[string]any {
	return map[string]any{
		"id":      b.ID,
		"title":   b.Title,
		"authors": b.Authors,
		"tags":    b.Tags,
		"img":     fmt.Sprintf("%s/get/cover/%d.jpg", cfg.CDNURL, b.ID),
		"href":    fmt.Sprintf("/book/%d", b.ID),
		"fmt":     b.Formats,
	}
}

// ---- AdminBookFill ----

// AdminBookFillHandler 实现 /api/admin/book/fill。
func AdminBookFillHandler(cfg AdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if resp := adminRequire(ctx); resp != nil {
			return resp, nil
		}
		if ctx.Request.Method == http.MethodGet {
			status := map[string]any{"total": 0, "skip": 0, "done": 0, "fail": 0}
			if cfg.FillStatus != nil {
				status = cfg.FillStatus()
			}
			return map[string]any{"err": "ok", "msg": "ok", "status": status}, nil
		}

		data, ok := decodeJSONObject(ctx.Request)
		if !ok {
			return map[string]any{"err": "params.error", "msg": "参数错误"}, nil
		}
		raw, exists := data["idlist"]
		if !exists {
			return map[string]any{"err": "params.error", "msg": "参数错误"}, nil
		}

		var ids []int64
		if s, ok := raw.(string); ok && s == "all" {
			ids, _ = library.AllBookIDs(cfg.LibraryDB)
		} else {
			parsed, err := adminInt64List(raw)
			if err != nil {
				return map[string]any{"err": "params.error.idlist", "msg": "idlist参数错误"}, nil
			}
			ids = parsed
		}
		if len(ids) == 0 {
			return map[string]any{"err": "params.error", "msg": "参数错误"}, nil
		}
		if cfg.StartFill == nil {
			return map[string]any{"err": "params.error", "msg": "自动填充未接线"}, nil
		}
		if err := cfg.StartFill(ids); err != nil {
			return nil, err
		}
		return map[string]any{"err": "ok", "msg": "任务启动成功！请耐心等待，稍后再来刷新页面"}, nil
	}
}

// ---- AdminBookDelete ----

// AdminBookDeleteHandler 实现 /api/admin/book/delete。
func AdminBookDeleteHandler(cfg AdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if resp := adminRequire(ctx); resp != nil {
			return resp, nil
		}
		data, ok := decodeJSONObject(ctx.Request)
		if !ok {
			return map[string]any{"err": "params.error", "msg": "参数错误，idlist必须是数组"}, nil
		}
		ids, err := adminInt64List(data["idlist"])
		if err != nil || len(ids) == 0 {
			return map[string]any{"err": "params.error", "msg": "参数错误，idlist必须是数组"}, nil
		}

		deleted := 0
		aliasSvc := userdb.NewAliasService(cfg.DB)
		for _, id := range ids {
			if err := adminDeleteOneBook(cfg, aliasSvc, id); err != nil {
				continue
			}
			deleted++
		}
		return map[string]any{"err": "ok", "msg": fmt.Sprintf("成功删除 %d 本书籍", deleted)}, nil
	}
}

// adminDeleteOneBook 删除单本书（外部索引书走专用路径）。
func adminDeleteOneBook(cfg AdminConfig, aliasSvc *userdb.AliasService, bookID int64) error {
	if cfg.IsExternalIndexBook != nil && cfg.IsExternalIndexBook(bookID) {
		if cfg.DeleteExternalIndexBook != nil {
			if err := cfg.DeleteExternalIndexBook(bookID); err != nil {
				return err
			}
		}
		if _, err := cfg.DB.Exec(`DELETE FROM scanfiles WHERE book_id = ?`, bookID); err != nil {
			return err
		}
		if _, err := cfg.DB.Exec(`DELETE FROM items WHERE book_id = ?`, bookID); err != nil {
			return err
		}
	} else {
		// 私藏书不进入回收站，避免管理员在回收站中看到私藏内容。
		permanent := adminIsPrivateBook(cfg.DB, bookID)
		if cfg.DeleteBook != nil {
			if err := cfg.DeleteBook(bookID, permanent); err != nil {
				return err
			}
		}
	}
	return aliasSvc.DeleteBookAliases(bookID)
}

// adminIsPrivateBook 判定书籍是否为私藏。
func adminIsPrivateBook(db *sql.DB, bookID int64) bool {
	var scope string
	err := db.QueryRow(`SELECT COALESCE(scope,'') FROM items WHERE book_id = ? LIMIT 1`, bookID).Scan(&scope)
	return err == nil && scope == "private"
}

// ---- AdminBookConvert ----

// AdminBookConvertHandler 实现 /api/admin/book/kindleconvert。
func AdminBookConvertHandler(cfg AdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if resp := adminRequire(ctx); resp != nil {
			return resp, nil
		}
		if ctx.Request.Method == http.MethodGet {
			status := map[string]any{"total": 0, "skip": 0, "done": 0, "fail": 0, "running": false}
			if cfg.ConvertStatus != nil {
				status = cfg.ConvertStatus()
			}
			return map[string]any{"err": "ok", "status": status}, nil
		}

		data, ok := decodeJSONObject(ctx.Request)
		if !ok {
			return map[string]any{"err": "params.error.idlist", "msg": "参数错误, 未指定正确的id列表"}, nil
		}
		if cfg.ConvertStatus != nil {
			if running, _ := cfg.ConvertStatus()["running"].(bool); running {
				return map[string]any{"err": "task.running", "msg": "有转换任务正在运行中，请稍后再试"}, nil
			}
		}

		var ids []int64
		if raw, exists := data["idlist"]; exists {
			parsed, err := adminInt64List(raw)
			if err != nil {
				return map[string]any{"err": "params.error.idlist", "msg": "参数错误, id列表中包含无效的id"}, nil
			}
			ids = parsed
		}
		if len(ids) == 0 {
			ids, _ = library.AllBookIDs(cfg.LibraryDB)
		}
		if cfg.StartConvert == nil {
			return map[string]any{"err": "params.error.idlist", "msg": "批量转换未接线"}, nil
		}
		if err := cfg.StartConvert(ctx.Identity.UserID, ids); err != nil {
			return nil, err
		}
		return map[string]any{"err": "ok", "msg": "Kindle转EPUB任务已启动，右上角可以查看进度"}, nil
	}
}

// ---- AdminUpdateCheck ----

// AdminUpdateHandler 实现 /api/admin/update。
func AdminUpdateHandler(cfg AdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if ctx.Identity.IsGuest() {
			return map[string]any{"err": "user.need_login", "msg": "请先登录"}, nil
		}
		if !ctx.Identity.IsAdmin {
			return map[string]any{"err": "permission.not_admin", "msg": "当前用户非管理员"}, nil
		}
		if ctx.Request.Method == http.MethodPost {
			if cfg.CheckUpdates == nil {
				return map[string]any{"err": "ok", "status": map[string]any{}}, nil
			}
			return map[string]any{"err": "ok", "status": cfg.CheckUpdates()}, nil
		}
		status := map[string]any{}
		if cfg.UpdateStatus != nil {
			status = cfg.UpdateStatus()
		}
		return map[string]any{"err": "ok", "status": status}, nil
	}
}

// ---- AdminTrash ----

// AdminTrashHandler 实现 /api/admin/trash（GET / PATCH / DELETE）。
func AdminTrashHandler(cfg AdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if resp := adminRequire(ctx); resp != nil {
			return resp, nil
		}
		switch ctx.Request.Method {
		case http.MethodPatch:
			return adminTrashRestore(cfg, ctx)
		case http.MethodDelete:
			return adminTrashDelete(cfg, ctx)
		}
		return adminTrashList(cfg)
	}
}

// adminTrashList 列出回收站条目。
func adminTrashList(cfg AdminConfig) (map[string]any, error) {
	items, err := library.ListTrashEntries(cfg.LibraryDB, cfg.LibraryRoot)
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, 0, len(items))
	totalSize := int64(0)
	for _, it := range items {
		out = append(out, it.ToDict())
		totalSize += it.Size
	}
	return map[string]any{"err": "ok", "items": out, "total": len(out), "total_size": totalSize}, nil
}

// adminTrashIDs 解析回收站请求里的 idlist。
func adminTrashIDs(ctx *Context) ([]int64, map[string]any) {
	data, ok := decodeJSONObject(ctx.Request)
	if !ok {
		return nil, map[string]any{"err": "params.invalid", "msg": "参数错误"}
	}
	ids, err := adminInt64List(data["idlist"])
	if err != nil || len(ids) == 0 {
		return nil, map[string]any{"err": "params.invalid", "msg": "参数错误"}
	}
	return ids, nil
}

// adminTrashRestore 恢复回收站条目。
func adminTrashRestore(cfg AdminConfig, ctx *Context) (map[string]any, error) {
	ids, resp := adminTrashIDs(ctx)
	if resp != nil {
		return resp, nil
	}
	restored := []int64{}
	failures := []any{}
	for _, id := range ids {
		if err := library.RestoreTrashEntry(cfg.LibraryDB, cfg.LibraryRoot, id); err != nil {
			failures = append(failures, map[string]any{"id": id, "error": err.Error()})
			continue
		}
		restored = append(restored, id)
	}
	return map[string]any{
		"err":      "ok",
		"restored": restored,
		"failures": failures,
		"msg":      fmt.Sprintf("已恢复 %d 本书籍，%d 本失败", len(restored), len(failures)),
	}, nil
}

// adminTrashDelete 永久删除回收站条目。
func adminTrashDelete(cfg AdminConfig, ctx *Context) (map[string]any, error) {
	data, ok := decodeJSONObject(ctx.Request)
	if !ok {
		return map[string]any{"err": "params.invalid", "msg": "参数错误"}, nil
	}
	ids, err := adminInt64List(data["idlist"])
	if err != nil || len(ids) == 0 {
		return map[string]any{"err": "params.invalid", "msg": "参数错误"}, nil
	}
	if confirm, _ := data["confirm"].(bool); !confirm {
		return map[string]any{"err": "params.confirm", "msg": "请确认永久删除操作"}, nil
	}

	deleted := []int64{}
	failures := []any{}
	for _, id := range ids {
		if err := library.DeleteTrashEntry(cfg.LibraryDB, cfg.LibraryRoot, id); err != nil {
			failures = append(failures, map[string]any{"id": id, "error": err.Error()})
			continue
		}
		deleted = append(deleted, id)
	}
	return map[string]any{
		"err":      "ok",
		"deleted":  deleted,
		"failures": failures,
		"msg":      fmt.Sprintf("已永久删除 %d 本书籍，%d 本失败", len(deleted), len(failures)),
	}, nil
}

// ---- AdminTrashSize ----

// AdminTrashSizeHandler 实现 /api/admin/trash/size。
func AdminTrashSizeHandler(cfg AdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if resp := adminRequire(ctx); resp != nil {
			return resp, nil
		}
		sizes := map[string]any{}
		if cfg.TrashSizes != nil {
			sizes = cfg.TrashSizes()
		}
		return map[string]any{"err": "ok", "sizes": sizes}, nil
	}
}

// ---- AdminTrashClear ----

// AdminTrashClearHandler 实现 /api/admin/trash/clear。
func AdminTrashClearHandler(cfg AdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if resp := adminRequire(ctx); resp != nil {
			return resp, nil
		}
		var errs []string
		if cfg.ClearTrash != nil {
			errs = cfg.ClearTrash()
		}
		if len(errs) > 0 {
			return map[string]any{"err": "error", "msg": "清理失败：" + strings.Join(errs, "; ")}, nil
		}
		return map[string]any{"err": "ok", "msg": "已清理 Calibre 回收站及上传目录"}, nil
	}
}

// ---- AdminSystemLog ----

// AdminSystemLogHandler 实现 /api/admin/log。
func AdminSystemLogHandler(cfg AdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if resp := adminRequire(ctx); resp != nil {
			return resp, nil
		}
		logFile := adminLogFile(cfg)

		linesCount := defaultLogLines
		if raw := ctx.Query("lines"); raw != "" {
			if n, err := strconv.Atoi(strings.TrimSpace(raw)); err == nil {
				linesCount = n
			}
		}
		if linesCount < 1 {
			linesCount = 1
		}
		if linesCount > maxLogLines {
			linesCount = maxLogLines
		}

		if _, err := os.Stat(logFile); err != nil {
			return map[string]any{"err": "ok", "lines": []any{}, "total": 0, "file": logFile}, nil
		}
		raw, err := os.ReadFile(logFile)
		if err != nil {
			return map[string]any{"err": "ok", "lines": []any{}, "total": 0, "file": logFile}, nil
		}
		all := strings.Split(strings.ReplaceAll(string(raw), "\r\n", "\n"), "\n")
		// 末尾换行会产生一个空元素，去掉它。
		if len(all) > 0 && all[len(all)-1] == "" {
			all = all[:len(all)-1]
		}
		total := len(all)
		start := total - linesCount
		if start < 0 {
			start = 0
		}
		tail := all[start:]
		out := make([]any, 0, len(tail))
		for _, line := range tail {
			out = append(out, line)
		}
		return map[string]any{"err": "ok", "lines": out, "total": total, "file": logFile}, nil
	}
}

// adminLogFile 返回日志文件路径。
func adminLogFile(cfg AdminConfig) string {
	if cfg.LogFile != "" {
		return cfg.LogFile
	}
	return "/data/log/talebook.log"
}

// ---- AdminSystemLogDownload ----

// AdminSystemLogDownloadHandler 实现 /api/admin/log/download。
func AdminSystemLogDownloadHandler(cfg AdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if ctx.Identity.IsGuest() {
			http.Error(ctx.Writer, "请先登录", http.StatusForbidden)
			return nil, nil
		}
		if !ctx.Identity.IsAdmin {
			http.Error(ctx.Writer, "当前用户非管理员", http.StatusForbidden)
			return nil, nil
		}
		logFile := adminLogFile(cfg)
		info, err := os.Stat(logFile)
		if err != nil {
			http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
			return nil, nil
		}
		data, err := os.ReadFile(logFile)
		if err != nil {
			http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
			return nil, nil
		}
		ctx.Writer.Header().Set("Content-Type", "text/plain; charset=utf-8")
		ctx.Writer.Header().Set("Content-Disposition", `attachment; filename="talebook.log"`)
		ctx.Writer.Header().Set("Content-Length", strconv.FormatInt(info.Size(), 10))
		_, _ = ctx.Writer.Write(data)
		return nil, nil
	}
}

// ---- OPDS 浏览与导入 ----

// AdminOPDSBrowseHandler 实现 /api/admin/opds/browse。
func AdminOPDSBrowseHandler(cfg AdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if resp := adminRequire(ctx); resp != nil {
			return resp, nil
		}
		data, ok := decodeJSONObject(ctx.Request)
		if !ok {
			return map[string]any{"err": "params.invalid", "msg": "参数错误"}, nil
		}
		if cfg.OpdsBrowse == nil {
			return map[string]any{"err": "params.invalid", "msg": "OPDS 浏览未接线"}, nil
		}
		return cfg.OpdsBrowse(ctx, stringOf(data["url"]))
	}
}

// AdminOPDSImportHandler 实现 /api/admin/opds/import。
func AdminOPDSImportHandler(cfg AdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if resp := adminRequire(ctx); resp != nil {
			return resp, nil
		}
		data, ok := decodeJSONObject(ctx.Request)
		if !ok {
			return map[string]any{"err": "params.invalid", "msg": "参数错误"}, nil
		}
		if cfg.OpdsImport == nil {
			return map[string]any{"err": "params.invalid", "msg": "OPDS 导入未接线"}, nil
		}
		return cfg.OpdsImport(ctx, data)
	}
}

// AdminOPDSImportStatusHandler 实现 /api/admin/opds/import/status。
func AdminOPDSImportStatusHandler(cfg AdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if resp := adminRequire(ctx); resp != nil {
			return resp, nil
		}
		status := map[string]any{}
		if cfg.OpdsImportStatus != nil {
			status = cfg.OpdsImportStatus()
		}
		return map[string]any{"err": "ok", "status": status}, nil
	}
}

// AdminOPDSImportFailedHandler 实现 /api/admin/opds/import/failed。
func AdminOPDSImportFailedHandler(cfg AdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if resp := adminRequire(ctx); resp != nil {
			return resp, nil
		}
		items := []map[string]any{}
		if cfg.OpdsImportFailed != nil {
			items = cfg.OpdsImportFailed()
		}
		return map[string]any{"err": "ok", "items": items, "total": len(items)}, nil
	}
}

// AdminOPDSImportRetryHandler 实现 /api/admin/opds/import/retry。
func AdminOPDSImportRetryHandler(cfg AdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if resp := adminRequire(ctx); resp != nil {
			return resp, nil
		}
		data, ok := decodeJSONObject(ctx.Request)
		if !ok {
			return map[string]any{"err": "params.invalid", "msg": "参数错误"}, nil
		}
		if cfg.OpdsImportRetry == nil {
			return map[string]any{"err": "params.invalid", "msg": "OPDS 重试未接线"}, nil
		}
		return cfg.OpdsImportRetry(ctx, data)
	}
}

// ---- AdminSettings ----

// AdminSettingsHandler 实现 /api/admin/settings。
func AdminSettingsHandler(cfg AdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if resp := adminRequire(ctx); resp != nil {
			return resp, nil
		}
		if ctx.Request.Method == http.MethodPost {
			return adminSettingsSave(cfg, ctx)
		}
		return adminSettingsGet(cfg, ctx), nil
	}
}

// adminSettingsSNS 是社交登录提供方清单（对应 Python AdminSettings.get 的 sns）。
//
// 前端 GeneralSettingsContent 会遍历 rsp.sns 构建 value→item 映射，
// 缺这个字段会抛 "Cannot read properties of undefined (reading 'forEach')"，
// 导致整个系统设置页白屏。
var adminSettingsSNS = []map[string]any{
	{"value": "qq", "text": "QQ", "link": "https://connect.qq.com/"},
	{"value": "amazon", "text": "Amazon", "link": "https://developer.amazon.com/zh/docs/login-with-amazon/web-docs.html"},
	{"value": "github", "text": "Github", "link": "https://github.com/settings/applications/new"},
	{"value": "weibo", "text": "微博", "link": "http://open.weibo.com/developers"},
	{"value": "wechat", "text": "微信", "link": "https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/Wechat_webpage_authorization.html"},
}

// adminSettingsPluginFields 是已迁入插件中心的字段，不再由系统设置读写，
// 避免形成第二个配置入口。
var adminSettingsPluginFields = []string{
	"auto_fill_meta",
	"auto_fill_keep_cover",
	"META_SELECTED_SOURCES",
	"ai_api_url",
	"ai_api_key",
	"ai_model",
	"ai_use_thinking",
	"DEVICES",
}

// adminSettingsGet 返回当前配置。
//
// 响应形状对齐 Python：{err, settings, sns, site_url}。
//
// 每次请求都从磁盘重新读取，而不是用启动时的快照：
// Python 的 CONF 是进程内可变字典，保存后立即生效；
// 若这里返回启动快照，用户保存后刷新页面会看到旧值，
// 误以为「保存没生效」。
func adminSettingsGet(cfg AdminConfig, ctx *Context) map[string]any {
	source := liveSettings(cfg.Settings, cfg.SettingsPath)
	out := map[string]any{}
	for k, v := range source {
		out[k] = v
	}
	for _, k := range adminSettingsPluginFields {
		delete(out, k)
	}
	return map[string]any{
		"err":      "ok",
		"settings": out,
		"sns":      adminSettingsSNS,
		"site_url": adminSiteURL(cfg, ctx),
	}
}

// adminSiteURL 拼出站点完整地址（对应 Python 的 self.site_url）。
//
// Python 用 request.protocol + host + BASE_PATH；Go 侧协议由反向代理终止，
// 因此优先读 X-Forwarded-Proto / X-Forwarded-Host，回落到请求自身的
// scheme 与 Host。
func adminSiteURL(cfg AdminConfig, ctx *Context) string {
	scheme := "http"
	host := ""
	if ctx != nil && ctx.Request != nil {
		if v := ctx.Request.Header.Get("X-Forwarded-Proto"); v != "" {
			scheme = v
		} else if ctx.Request.URL != nil && ctx.Request.URL.Scheme != "" {
			scheme = ctx.Request.URL.Scheme
		} else if ctx.Request.TLS != nil {
			scheme = "https"
		}
		if v := ctx.Request.Header.Get("X-Forwarded-Host"); v != "" {
			host = v
		} else {
			host = ctx.Request.Host
		}
	}
	return scheme + "://" + host + cfg.BasePath
}

// adminSettingsSave 保存配置。
//
// 对应 Python AdminSettings.post：先做参数校验，再写回配置文件，
// 成功时返回 {"err":"ok","rsp":<完整配置>}。
func adminSettingsSave(cfg AdminConfig, ctx *Context) (map[string]any, error) {
	data, ok := decodeJSONObject(ctx.Request)
	if !ok {
		return map[string]any{"err": "params.invalid", "msg": "参数错误"}, nil
	}

	// 私人图书馆模式下访问码不能为空。
	if inviteMode, _ := data["INVITE_MODE"].(bool); inviteMode {
		if code, _ := data["INVITE_CODE"].(string); strings.TrimSpace(code) == "" {
			return map[string]any{"err": "params.invite_code_required", "msg": "访问码不能为空"}, nil
		}
	}

	// 上传大小类配置必须是合法的大小字符串（如 4MB）。
	for _, key := range []string{"MAX_UPLOAD_SIZE", "UPLOAD_CHUNK_THRESHOLD", "UPLOAD_CHUNK_SIZE"} {
		raw, exists := data[key]
		if !exists {
			continue
		}
		if _, err := parseSizeValue(raw); err != nil {
			return map[string]any{
				"err": "params." + strings.ToLower(key),
				"msg": "上传大小配置格式不合法，例如 4MB",
			}, nil
		}
	}

	// 最大分片数量必须是正整数。
	if raw, exists := data["MAX_CHUNK_COUNT"]; exists {
		if n, err := strconv.ParseInt(strings.TrimSpace(fmt.Sprint(raw)), 10, 64); err != nil || n <= 0 {
			return map[string]any{"err": "params.max_chunk_count", "msg": "最大分片数量必须是正整数"}, nil
		}
	}

	// 有声书备份保留数必须在 0..20。
	if raw, exists := data["AUDIOBOOK_BACKUP_RETENTION"]; exists {
		n, err := strconv.ParseInt(strings.TrimSpace(fmt.Sprint(raw)), 10, 64)
		if err != nil || n < 0 || n > 20 {
			return map[string]any{
				"err": "params.audiobook_backup_retention",
				"msg": "有声书备份保留数必须在 0 到 20 之间",
			}, nil
		}
		data["AUDIOBOOK_BACKUP_RETENTION"] = n
	}

	if cfg.SaveSettings == nil {
		return map[string]any{"err": "file.permission", "msg": "保存配置未接线"}, nil
	}

	// 只把用户本次提交的键写回 auto.py，不把合并后的全量配置落盘。
	//
	// auto.py 是「用户覆盖层」，出厂默认值在 webserver/settings.py。
	// 若把 159 个键全写进去，文件会从几 KB 涨到几十 KB，
	// 且以后升级默认值时会被旧值盖住（Python 的 KEYS 白名单也是这个意图）。
	next := map[string]any{}
	for k, v := range data {
		next[k] = v
	}
	next["installed"] = true

	if err := cfg.SaveSettings(next); err != nil {
		return map[string]any{"err": "file.permission", "msg": "更新磁盘配置文件失败！请确保配置文件的权限为可写入！"}, nil
	}

	// 响应仍返回合并后的完整配置，与 Python 的 {err, rsp} 形状一致。
	rsp := map[string]any{}
	for k, v := range liveSettings(cfg.Settings, cfg.SettingsPath) {
		rsp[k] = v
	}
	for k, v := range next {
		if cfg.SettingsPath == "" { rsp[k] = v }
	}
	return map[string]any{"err": "ok", "rsp": rsp}, nil
}

// sizeValueRe 匹配 Python utils._SIZE_RE：`^\s*([\d.]+)\s*([a-z]*)\s*$`。
var sizeValueRe = regexp.MustCompile(`^\s*([0-9.]+)\s*([a-zA-Z]*)\s*$`)

// sizeUnits 对齐 Python utils._SIZE_UNITS。
var sizeUnits = map[string]int64{
	"": 1, "b": 1,
	"k": 1024, "kb": 1024,
	"m": 1024 * 1024, "mb": 1024 * 1024,
	"g": 1024 * 1024 * 1024, "gb": 1024 * 1024 * 1024,
}

// parseSizeValue 复刻 Python utils.parse_size：解析 "100MB"/"1024" 为字节数。
//
// 与 parseSizeSafe 的区别：非法值返回 error 而不是默认值，
// 因为系统设置页需要据此拒绝非法配置。
func parseSizeValue(raw any) (int64, error) {
	switch t := raw.(type) {
	case float64:
		return int64(t), nil
	case int64:
		return t, nil
	case int:
		return int64(t), nil
	}
	s := strings.ToLower(strings.TrimSpace(fmt.Sprint(raw)))
	m := sizeValueRe.FindStringSubmatch(s)
	if m == nil {
		return 0, fmt.Errorf("invalid size string: %q", raw)
	}
	unit, ok := sizeUnits[m[2]]
	if !ok {
		return 0, fmt.Errorf("invalid size unit: %q", m[2])
	}
	f, err := strconv.ParseFloat(m[1], 64)
	if err != nil {
		return 0, fmt.Errorf("invalid size number: %q", m[1])
	}
	return int64(f * float64(unit)), nil
}

// ---- 路由表 ----

// AdminRouteSpecs 返回管理后台模块接管的 23 条路由。
func AdminRouteSpecs(cfg AdminConfig) []RouteSpec {
	methods := []string{http.MethodGet, http.MethodPost}
	trashMethods := []string{http.MethodGet, http.MethodPatch, http.MethodDelete}
	return []RouteSpec{
		{Pattern: rAdminSSL, Methods: methods, Auth: true, Admin: true, Handler: AdminSSLHandler(cfg)},
		{Pattern: rAdminUsers, Methods: methods, Auth: true, Admin: true, Handler: AdminUsersHandler(cfg)},
		{Pattern: rAdminUsersBatch, Methods: methods, Auth: true, Admin: true, Handler: AdminUsersBatchHandler(cfg)},
		{Pattern: rAdminInstall, Methods: methods, Handler: AdminInstallHandler(cfg)},
		{Pattern: rAdminSettings, Methods: methods, Auth: true, Admin: true, Handler: AdminSettingsHandler(cfg)},
		{Pattern: rAdminTestMail, Methods: methods, Auth: true, Admin: true, Handler: AdminTestMailHandler(cfg)},
		{Pattern: rAdminTestDB, Methods: methods, Handler: AdminTestDBHandler(cfg)},
		{Pattern: rAdminMigrateDB, Methods: methods, Auth: true, Admin: true, Handler: AdminMigrateDBHandler(cfg)},
		{Pattern: rAdminUpdate, Methods: methods, Auth: true, Handler: AdminUpdateHandler(cfg)},
		{Pattern: rAdminBookList, Methods: methods, Auth: true, Admin: true, Handler: AdminBookListHandler(cfg)},
		{Pattern: rAdminBookFill, Methods: methods, Auth: true, Admin: true, Handler: AdminBookFillHandler(cfg)},
		{Pattern: rAdminBookDelete, Methods: methods, Auth: true, Admin: true, Handler: AdminBookDeleteHandler(cfg)},
		{Pattern: rAdminBookConvert, Methods: methods, Auth: true, Admin: true, Handler: AdminBookConvertHandler(cfg)},
		{Pattern: rAdminOpdsBrowse, Methods: methods, Auth: true, Admin: true, Handler: AdminOPDSBrowseHandler(cfg)},
		{Pattern: rAdminOpdsImport, Methods: methods, Auth: true, Admin: true, Handler: AdminOPDSImportHandler(cfg)},
		{Pattern: rAdminOpdsStatus, Methods: methods, Auth: true, Admin: true, Handler: AdminOPDSImportStatusHandler(cfg)},
		{Pattern: rAdminOpdsFailed, Methods: methods, Auth: true, Admin: true, Handler: AdminOPDSImportFailedHandler(cfg)},
		{Pattern: rAdminOpdsRetry, Methods: methods, Auth: true, Admin: true, Handler: AdminOPDSImportRetryHandler(cfg)},
		{Pattern: rAdminTrash, Methods: trashMethods, Auth: true, Admin: true, Handler: AdminTrashHandler(cfg)},
		{Pattern: rAdminTrashSize, Methods: methods, Auth: true, Admin: true, Handler: AdminTrashSizeHandler(cfg)},
		{Pattern: rAdminTrashClear, Methods: methods, Auth: true, Admin: true, Handler: AdminTrashClearHandler(cfg)},
		{Pattern: rAdminLog, Methods: methods, Auth: true, Admin: true, Handler: AdminSystemLogHandler(cfg)},
		{Pattern: rAdminLogDownload, Methods: methods, Auth: true, Admin: true, Handler: AdminSystemLogDownloadHandler(cfg)},
	}
}

// adminUploadDir 返回上传目录。
func adminUploadDir(cfg AdminConfig) string {
	if cfg.UploadDir != "" {
		return cfg.UploadDir
	}
	return filepath.Join(cfg.LibraryRoot, ".upload")
}
