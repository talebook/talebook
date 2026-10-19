package httpapi

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"strings"
)

// 与 Python 版 webserver/handlers/base.py 一致的错误码。
const (
	ErrNeedLogin     = "user.need_login"
	ErrNotAdmin      = "permission.not_admin"
	ErrException     = "exception"
	ErrNotFound      = "not_found"
	ErrMethodInvalid = "method.invalid"
)

// Identity 描述当前请求者，对应 Python 版的 current_user / admin_user。
type Identity struct {
	// UserID 为 0 表示游客。
	UserID int64
	// Username 是登录名。
	Username string
	// IsAdmin 对应 Python 版的 admin_user。
	IsAdmin bool
}

// IsGuest 报告当前请求者是否未登录。
func (i Identity) IsGuest() bool { return i.UserID == 0 }

// HandlerFunc 是一个业务处理函数。
//
// 返回值语义与 Python 版 @js 装饰器一致：
//   - 返回 map 时序列化为 JSON，并自动补 "msg" 字段；
//   - 返回 nil 时表示「已自行写响应」，不再输出。
type HandlerFunc func(ctx *Context) (map[string]any, error)

// Context 携带一次请求的上下文。
type Context struct {
	// Request 是原始 HTTP 请求。
	Request *http.Request
	// Writer 是响应写入器，供需要写 cookie 或自定义响应的 handler 使用。
	Writer http.ResponseWriter
	// Params 是正则捕获组，Params[0] 是第一个捕获组。
	Params []string
	// Identity 是当前请求者。
	Identity Identity
	// DB 是只读/读写数据库句柄（Talebook 自有库）。
	DB *sql.DB
	// LibraryDB 是 Calibre 元数据库（books / authors / data 等表）。
	// 与 DB 分属两个文件，混用会报 "no such table: books"。
	LibraryDB *sql.DB
	// CDNURL / APIURL 用于拼接资源地址。
	CDNURL string
	APIURL string
	// isPublic 对应 can_view_book()；为 nil 时视为全部可见。
	isPublic func(int64) (bool, error)
	// comicArchiveOverride 仅供测试注入漫画容器路径，绕过书库格式表。
	comicArchiveOverride *comicArchive
	// body 缓存已读取的请求体，供多次读取。
	body []byte
}

// comicArchive 是一对容器路径与格式。
type comicArchive struct {
	Path   string
	Format string
}

// Param 返回第 i 个捕获组（从 0 开始），越界时返回空串。
func (c *Context) Param(i int) string {
	if i < 0 || i >= len(c.Params) {
		return ""
	}
	return c.Params[i]
}

// Query 返回查询参数（对应 Tornado 的 get_argument 默认值语义）。
//
// 同时兼容 GET 查询串与 POST 表单体，与 Tornado 的 get_argument 一致。
func (c *Context) Query(name string) string {
	if c.Request == nil {
		return ""
	}
	if v := c.Request.URL.Query().Get(name); v != "" {
		return v
	}
	if c.Request.Form != nil {
		return c.Request.FormValue(name)
	}
	return ""
}

// Body 返回请求体字节；已读取过则返回缓存。
func (c *Context) Body() []byte {
	if c.body != nil {
		return c.body
	}
	if c.Request == nil || c.Request.Body == nil {
		return nil
	}
	raw, err := io.ReadAll(io.LimitReader(c.Request.Body, maxBodyBytes))
	if err != nil {
		return nil
	}
	c.body = raw
	return raw
}

// CanRead 对应 Python 的 current_user.can_read()。
//
// 未登录时返回 true（游客可读公开内容，私有书由 can_view_book 拦截）。
func (c *Context) CanRead() bool {
	if c.Identity.UserID == 0 {
		return true
	}
	return c.HasPermission("r")
}

// IsActive 对应 Python 的 current_user.is_active()。
//
// 游客视为未激活；查不到读者记录时按未激活处理（与 Python 的
// `current_user and current_user.is_active()` 组合语义一致）。
func (c *Context) IsActive() bool {
	if c.DB == nil || c.Identity.UserID == 0 {
		return false
	}
	var active int64
	if err := c.DB.QueryRow(`SELECT COALESCE(active,1) FROM readers WHERE id = ?`,
		c.Identity.UserID).Scan(&active); err != nil {
		return false
	}
	return active != 0
}

// CanSave 对应 Python 的 current_user.can_save()。
func (c *Context) CanSave() bool {
	if c.Identity.UserID == 0 {
		return false
	}
	return c.HasPermission("s")
}

// CanUpload 对应 Python 的 current_user.can_upload()。
func (c *Context) CanUpload() bool {
	if c.Identity.UserID == 0 {
		return false
	}
	return c.HasPermission("u")
}

// HasPermission 复刻 models.Reader.has_permission。
//
// permission 是一串权限标志：小写字母表示授予，大写字母表示拒绝，
// 未出现时返回 default（Python 默认 True）。
func (c *Context) HasPermission(operation string) bool {
	return hasPermission(c.permissionOf(), operation, true)
}

// permissionOf 读取当前读者的 permission 字符串；查不到返回空串。
func (c *Context) permissionOf() string {
	if c.DB == nil || c.Identity.UserID == 0 {
		return ""
	}
	var perm sql.NullString
	if err := c.DB.QueryRow(`SELECT COALESCE(permission,'') FROM readers WHERE id = ?`,
		c.Identity.UserID).Scan(&perm); err != nil {
		return ""
	}
	return perm.String
}

// hasPermission 复刻 has_permission 的判定顺序：小写命中→true，大写命中→false，否则 default。
func hasPermission(permission, operation string, fallback bool) bool {
	if operation == "" {
		return fallback
	}
	lower := strings.ToLower(operation)
	upper := strings.ToUpper(operation)
	if strings.Contains(permission, lower) {
		return true
	}
	if strings.Contains(permission, upper) {
		return false
	}
	return fallback
}

// maxBodyBytes 是请求体读取上限（8 MiB），与 Python 版的 Tornado 默认一致。
const maxBodyBytes = 8 << 20

// RouteSpec 把一条路由 pattern 绑定到处理函数。
type RouteSpec struct {
	// Pattern 是 Tornado 风格的正则路径。
	Pattern string
	// Methods 是允许的 HTTP 方法；为空时允许 GET 与 POST。
	Methods []string
	// Auth 为 true 时要求登录（对应 @auth）。
	Auth bool
	// Admin 为 true 时要求管理员（对应 @is_admin）。
	Admin bool
	// Handler 是业务处理函数。
	Handler HandlerFunc
}

// Server 把路由注册表与处理函数组装成一个可监听的 HTTP 服务。
type Server struct {
	// DB 是数据库句柄（Talebook 自有库）。
	DB *sql.DB
	// LibraryDB 是 Calibre 元数据库（books / authors / data 等表）。
	// 作品/版本层需要读 books 表，必须与 DB 分开注入。
	LibraryDB *sql.DB
	// CDNURL / APIURL 用于拼接资源地址。
	CDNURL string
	// APIURL 同时用于兼容层。
	APIURL string
	// Identify 从请求解析当前请求者；为 nil 时一律视为游客。
	Identify func(*http.Request) (Identity, error)
	// IsPublic 对应 can_view_book()；为 nil 时视为全部可见。
	// 第二个参数是当前请求者身份，因为可见性取决于私藏书归属。
	IsPublic func(identity Identity, bookID int64) (bool, error)

	routes []compiledRoute
}

// compiledRoute 是编译后的路由。
type compiledRoute struct {
	re      *regexp.Regexp
	methods map[string]bool
	spec    RouteSpec
}

// NewServer 编译路由表。
//
// 只注册有处理函数的 RouteSpec；未提供处理函数的既有路由会被跳过
// （它们由 Python 版继续服务，Go 版按需逐步接管）。
func NewServer(specs []RouteSpec) (*Server, error) {
	s := &Server{}
	for _, spec := range specs {
		if spec.Handler == nil {
			continue
		}
		re, err := regexp.Compile("^" + spec.Pattern + "$")
		if err != nil {
			return nil, fmt.Errorf("httpapi: compile route %q: %w", spec.Pattern, err)
		}
		methods := map[string]bool{}
		for _, m := range spec.Methods {
			methods[strings.ToUpper(m)] = true
		}
		if len(methods) == 0 {
			methods[http.MethodGet] = true
			methods[http.MethodPost] = true
		}
		s.routes = append(s.routes, compiledRoute{re: re, methods: methods, spec: spec})
	}
	return s, nil
}

// ServeHTTP 实现 http.Handler。
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path

	for _, rt := range s.routes {
		m := rt.re.FindStringSubmatch(path)
		if m == nil {
			continue
		}

		if !rt.methods[r.Method] {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]any{
				"err": ErrMethodInvalid,
				"msg": fmt.Sprintf("方法 %s 不被支持", r.Method),
			})
			return
		}

		identity, err := s.identify(r)
		if err != nil {
			writeJSON(w, http.StatusOK, map[string]any{
				"err": ErrException,
				"msg": err.Error(),
			})
			return
		}

		// @auth 等价：未登录直接返回 user.need_login。
		if rt.spec.Auth && identity.IsGuest() {
			writeJSON(w, http.StatusOK, map[string]any{
				"err": ErrNeedLogin,
				"msg": "请先登录",
			})
			return
		}
		// @is_admin 等价：非管理员返回 permission.not_admin。
		if rt.spec.Admin && !identity.IsAdmin {
			writeJSON(w, http.StatusOK, map[string]any{
				"err": ErrNotAdmin,
				"msg": "当前用户非管理员",
			})
			return
		}

		ctx := &Context{
			Request:   r,
			Writer:    w,
			Params:    m[1:],
			Identity:  identity,
			DB:        s.DB,
			LibraryDB: s.LibraryDB,
			CDNURL:    s.CDNURL,
			APIURL:    s.APIURL,
			isPublic: func(bookID int64) (bool, error) {
				if s.IsPublic == nil {
					return true, nil
				}
				return s.IsPublic(identity, bookID)
			},
		}

		resp, err := rt.spec.Handler(ctx)
		if err != nil {
			// Route templates omit request queries and bodies, which may contain secrets.
			log.Printf("ERROR booksvr: 接口执行失败 route=%s: %v", rt.spec.Pattern, err)
			// 与 Python 版 @js 一致：异常转成 {"err": "exception"}，不抛 HTTP 异常。
			writeJSON(w, http.StatusOK, map[string]any{
				"err": ErrException,
				"msg": err.Error(),
			})
			return
		}
		if resp == nil {
			// 处理函数已自行写响应。
			return
		}
		// @js 等价：dict 响应自动补 msg。
		if _, ok := resp["msg"]; !ok {
			resp["msg"] = ""
		}
		writeJSON(w, http.StatusOK, resp)
		return
	}

	writeJSON(w, http.StatusNotFound, map[string]any{
		"err": ErrNotFound,
		"msg": "接口不存在",
	})
}

// identify 解析请求者身份。
func (s *Server) identify(r *http.Request) (Identity, error) {
	if s.Identify == nil {
		return Identity{}, nil
	}
	return s.Identify(r)
}

// writeJSON 输出 JSON 响应，并设置与 Python 版一致的 CORS 头。
func writeJSON(w http.ResponseWriter, status int, payload map[string]any) {
	origin := "*"
	w.Header().Set("Access-Control-Allow-Origin", origin)
	w.Header().Set("Access-Control-Allow-Credentials", "true")
	w.Header().Set("Content-Type", "application/json; charset=UTF-8")
	w.WriteHeader(status)

	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(payload)
}

// ErrNoHandler 表示路由存在但没有 Go 处理函数。
var ErrNoHandler = errors.New("httpapi: route has no handler")
