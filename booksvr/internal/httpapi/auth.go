// 本文件实现 webserver/handlers/user.py 的登录/登出/欢迎页，以及
// webserver/handlers/base.py 的 @auth / @is_admin / demo 模式语义。
package httpapi

import (
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"talebook/booksvr/internal/tornadosign"
	"talebook/booksvr/internal/userdb"
)

// Cookie 有效期，对齐 Tornado set_secure_cookie 的默认 expires_days=30。
const cookieExpiresDays = 30.0

// DemoModeConfig 是 demo 模式所需的配置子集，对齐 webserver/demo_mode.py。
type DemoModeConfig struct {
	// Enabled 对应 CONF["DEMO_MODE"]。
	Enabled bool
	// Username 对应 CONF["DEMO_USERNAME"]（小写）。
	Username string
	// DefaultPassword 对应 DEMO_DEFAULT_PASSWORD。
	DefaultPassword string
}

// InviteConfig 是访问码所需的配置子集，对齐 base.py 的 need_invited/invited_code_is_ok。
type InviteConfig struct {
	// Code 对应 CONF["INVITE_CODE"]；为空表示无需访问码。
	Code string
	// Message 对应 CONF["INVITE_MESSAGE"]。
	Message string
}

// AuthConfig 汇总鉴权层需要的配置。
type AuthConfig struct {
	// CookieSecret 对应 Tornado 的 cookie_secret。
	CookieSecret string
	// Demo 是 demo 模式配置。
	Demo DemoModeConfig
	// Invite 是访问码配置。
	Invite InviteConfig
	// Clock 返回当前 Unix 秒；为 nil 时用 time.Now。
	Clock func() int64
}

// now 返回当前 Unix 秒。
func (c AuthConfig) now() int64 {
	if c.Clock != nil {
		return c.Clock()
	}
	return time.Now().Unix()
}

// isDemoMode 对齐 demo_mode.is_demo_mode。
func (c AuthConfig) isDemoMode() bool { return c.Demo.Enabled }

// demoUsername 对齐 demo_mode.demo_username。
func (c AuthConfig) demoUsername() string {
	return strings.ToLower(strings.TrimSpace(c.Demo.Username))
}

// isDemoUser 对齐 demo_mode.is_demo_user。
func (c AuthConfig) isDemoUser(r *userdb.Reader) bool {
	if r == nil {
		return false
	}
	u := strings.ToLower(strings.TrimSpace(r.Username))
	return u != "" && u == c.demoUsername()
}

// isRealAdmin 对齐 demo_mode.is_real_admin。
func (c AuthConfig) isRealAdmin(r *userdb.Reader) bool { return r != nil && r.Admin }

// canLogin 对齐 demo_mode.can_login：非 demo 模式一律允许。
func (c AuthConfig) canLogin(r *userdb.Reader) bool {
	if !c.isDemoMode() {
		return true
	}
	return c.isDemoUser(r) || c.isRealAdmin(r)
}

// isDemoRestricted 对齐 demo_mode.is_demo_restricted。
func (c AuthConfig) isDemoRestricted(r *userdb.Reader) bool {
	if !c.isDemoMode() {
		return false
	}
	return !c.isRealAdmin(r)
}

// demoReadOnlyMethods 对齐 demo_mode.READ_ONLY_METHODS。
var demoReadOnlyMethods = map[string]bool{
	"GET": true, "HEAD": true, "OPTIONS": true, "PROPFIND": true,
}

// demoSessionPaths 对齐 demo_mode.DEMO_SESSION_PATHS。
var demoSessionPaths = map[string]bool{
	"/api/captcha/verify": true,
	"/api/user/sign_in":   true,
	"/api/welcome":        true,
}

// demoBlockedGetPaths 对齐 demo_mode.DEMO_BLOCKED_GET_PATHS。
var demoBlockedGetPaths = map[string]bool{
	"/api/admin/users/owner": true,
	"/api/user/active/send":  true,
}

// demoFakeSavePaths 对齐 demo_mode.DEMO_FAKE_SAVE_PATHS。
var demoFakeSavePaths = map[string]bool{
	"/api/admin/settings": true,
}

// requestIsAllowed 对齐 demo_mode.request_is_allowed。
func (c AuthConfig) requestIsAllowed(method, path string, r *userdb.Reader) bool {
	if !c.isDemoRestricted(r) {
		return true
	}
	method = strings.ToUpper(strings.TrimSpace(method))
	path = strings.TrimRight(path, "/")
	if path == "" {
		path = "/"
	}
	if method == http.MethodGet && (demoBlockedGetPaths[path] || strings.HasPrefix(path, "/api/active/")) {
		return false
	}
	if demoReadOnlyMethods[method] {
		return true
	}
	if method == http.MethodPost && demoFakeSavePaths[path] {
		return true
	}
	return method == http.MethodPost && demoSessionPaths[path]
}

// SignCookie 生成 Tornado v2 格式的 secure cookie 值。
//
// 格式（tornado.web.create_signed_value，version=2）：
//
//	2|<len(kv)>:<kv>|<len(ts)>:<ts>|<len(name)>:<name>|<len(b64)>:<b64>|<hex_hmac_sha256>
//
// 与 DecodeSignedValue 互为逆运算。
func SignCookie(secret, name, value string, ts int64) string {
	return tornadosign.Sign(secret, name, value, ts)
}

// setSecureCookie 写一个 Tornado 兼容的 secure cookie。
func setSecureCookie(w http.ResponseWriter, cfg AuthConfig, name, value string) {
	signed := SignCookie(cfg.CookieSecret, name, value, cfg.now())
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    signed,
		Path:     "/",
		MaxAge:   int(cookieExpiresDays * 86400),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
}

// clearCookie 清除一个 cookie。
func clearCookie(w http.ResponseWriter, name string) {
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
}

// formValues 一次性解析请求参数，对齐 Tornado 的 get_argument 取值面。
//
// 请求体只能读一次，因此必须一次性解析出全部参数再按 key 取，
// 否则第二次调用会读到空 body。
//
// 解析顺序：表单（application/x-www-form-urlencoded）→ JSON 体 → URL 查询串。
type formValues struct {
	form  url.Values
	json  map[string]any
	query url.Values
}

// parseFormValues 读取并解析请求参数。
func parseFormValues(r *http.Request) *formValues {
	fv := &formValues{form: url.Values{}, json: map[string]any{}, query: url.Values{}}
	if r == nil {
		return fv
	}
	if r.URL != nil {
		fv.query = r.URL.Query()
	}
	body, _ := io.ReadAll(r.Body)
	if len(body) == 0 {
		return fv
	}
	if vals, err := url.ParseQuery(string(body)); err == nil {
		fv.form = vals
	}
	var obj map[string]any
	if err := json.Unmarshal(body, &obj); err == nil && obj != nil {
		fv.json = obj
	}
	return fv
}

// decodeJSONObject 把请求体解析为 JSON 对象。
//
// 第二个返回值为 false 表示请求体不是合法 JSON 对象（对齐 Python 的
// json.loads 抛 JSONDecodeError / TypeError）。
func decodeJSONObject(r *http.Request) (map[string]any, bool) {
	if r == nil || r.Body == nil {
		return nil, false
	}
	body, err := io.ReadAll(r.Body)
	if err != nil || len(body) == 0 {
		return nil, false
	}
	var obj map[string]any
	if err := json.Unmarshal(body, &obj); err != nil || obj == nil {
		return nil, false
	}
	return obj, true
}

// Get 按表单 → JSON 体 → 查询串的顺序取字符串参数。
func (f *formValues) Get(key string) string {
	if f == nil {
		return ""
	}
	if v := f.form.Get(key); v != "" {
		return v
	}
	if v, ok := f.json[key].(string); ok && v != "" {
		return v
	}
	return f.query.Get(key)
}

// SignInHandler 实现 /api/user/sign_in（POST）。
//
// 对齐 webserver/handlers/user.py 的 SignIn.post：
// 用户名小写去空白 → 查库 → demo 模式校验 → 密码校验 → 权限校验 →
// 旧密码迁移 → 写 cookie。
func SignInHandler(cfg AuthConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		params := parseFormValues(ctx.Request)
		username := strings.ToLower(strings.TrimSpace(params.Get("username")))
		password := strings.TrimSpace(params.Get("password"))
		if username == "" || password == "" {
			return map[string]any{"err": "params.invalid", "msg": "用户名或密码错误"}, nil
		}

		user, err := userdb.GetReaderByUsername(ctx.DB, username)
		if err != nil {
			return nil, err
		}
		if user == nil {
			return map[string]any{"err": "params.no_user", "msg": "无此用户"}, nil
		}
		if !cfg.canLogin(user) {
			return map[string]any{"err": "demo.account_only", "msg": "演示模式仅允许指定账号登录"}, nil
		}
		if !user.VerifyPassword(password) {
			return map[string]any{"err": "params.invalid", "msg": "用户名或密码错误"}, nil
		}
		if !user.CanLogin() {
			return map[string]any{"err": "permission", "msg": "无权登录"}, nil
		}

		// 旧 SHA256 密码迁移到 bcrypt（demo 受限用户跳过）。
		if !cfg.isDemoRestricted(user) && user.MigratePassword(password) {
			if err := userdb.SaveReaderPassword(ctx.DB, user); err != nil {
				return nil, err
			}
		}

		// login_user 副作用：写 cookie + 刷新访问时间与登录 IP。
		setSecureCookie(ctx.Writer, cfg, cookieNameUserID, strconv.FormatInt(user.ID, 10))
		setSecureCookie(ctx.Writer, cfg, cookieNameLoginTime, strconv.FormatInt(cfg.now(), 10))
		if user.Admin {
			setSecureCookie(ctx.Writer, cfg, cookieNameAdminID, strconv.FormatInt(user.ID, 10))
		}
		if !cfg.isDemoRestricted(user) {
			if err := userdb.UpdateReaderLogin(ctx.DB, user, remoteIP(ctx.Request)); err != nil {
				return nil, err
			}
		}
		return map[string]any{"err": "ok", "msg": "ok"}, nil
	}
}

// SignOutHandler 实现 /api/user/sign_out（GET，需登录）。
//
// 对齐 SignOut.get：清除 user_id / admin_id / lt 三个 cookie。
func SignOutHandler(cfg AuthConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		clearCookie(ctx.Writer, cookieNameUserID)
		clearCookie(ctx.Writer, cookieNameAdminID)
		clearCookie(ctx.Writer, cookieNameLoginTime)
		return map[string]any{"err": "ok", "msg": "你已成功退出登录。"}, nil
	}
}

// WelcomeHandler 实现 /api/welcome（GET/POST）。
//
// 对齐 Welcome：GET 报告是否需要访问码；POST 校验访问码并标记已通过。
func WelcomeHandler(cfg AuthConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if ctx.Request.Method == http.MethodPost {
			code := parseFormValues(ctx.Request).Get("invite_code")
			if code == "" || code != cfg.Invite.Code {
				return map[string]any{"err": "params.invalid", "msg": "访问码无效"}, nil
			}
			setSecureCookie(ctx.Writer, cfg, cookieNameInvited, "1")
			return map[string]any{"err": "ok", "msg": ""}, nil
		}

		if cfg.Invite.Code == "" {
			return map[string]any{"err": "free", "msg": "无需访问码"}, nil
		}
		if c, err := ctx.Request.Cookie(cookieNameInvited); err == nil && c != nil && c.Value != "" {
			return map[string]any{"err": "free", "msg": "已输入访问码"}, nil
		}
		return map[string]any{"err": "ok", "msg": "", "welcome": cfg.Invite.Message}, nil
	}
}

// cookieNameInvited 是访问码通过标记的 cookie 名。
const cookieNameInvited = "invited"

// remoteIP 取请求来源 IP，对齐 Tornado 的 request.remote_ip。
func remoteIP(r *http.Request) string {
	if r == nil {
		return ""
	}
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		if i := strings.Index(xff, ","); i >= 0 {
			return strings.TrimSpace(xff[:i])
		}
		return strings.TrimSpace(xff)
	}
	if xr := r.Header.Get("X-Real-Ip"); xr != "" {
		return strings.TrimSpace(xr)
	}
	host := r.RemoteAddr
	if i := strings.LastIndex(host, ":"); i >= 0 {
		host = host[:i]
	}
	return host
}

// AuthRouteSpecs 返回鉴权层接管的 3 条路由。
//
// 与 Python 版 webserver/handlers/user.py 的注册逐字一致。
func AuthRouteSpecs(cfg AuthConfig) []RouteSpec {
	return []RouteSpec{
		{
			Pattern: rWelcome,
			Methods: []string{http.MethodGet, http.MethodPost},
			Handler: WelcomeHandler(cfg),
		},
		{
			Pattern: rSignIn,
			Methods: []string{http.MethodPost},
			Handler: SignInHandler(cfg),
		},
		{
			Pattern: rSignOut,
			Methods: []string{http.MethodGet},
			Auth:    true,
			Handler: SignOutHandler(cfg),
		},
	}
}

// 与 Python 版逐字一致的路由 pattern。
const (
	rWelcome = "/api/welcome"
	rSignIn  = "/api/user/sign_in"
	rSignOut = "/api/user/sign_out"
)
