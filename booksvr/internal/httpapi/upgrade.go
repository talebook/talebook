package httpapi

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync/atomic"
	"time"
)

// UpgradeConfig 是应用升级模块的依赖注入点。
type UpgradeConfig struct {
	// DB 是 Talebook 自有库（audiobook_jobs / plugin_runs）。
	DB *sql.DB
	// Settings 是站点配置。
	Settings map[string]any
	// Version 是当前版本号。
	Version string
	// SocketPath 是受信任升级执行器的 Unix socket 路径。
	SocketPath string
	// MaintenancePath 是维护标记文件路径。
	MaintenancePath string
	// UpgradeMode 对应环境变量 TALEBOOK_UPGRADE_MODE。
	UpgradeMode string
	// RequestExecutor 调用升级执行器；为 nil 时使用内置 Unix socket 实现。
	RequestExecutor func(action string, release any, keep any) map[string]any
	// AsyncBusy 报告异步服务是否有未完成任务。
	AsyncBusy func() bool
	// Host 是当前请求的 Host，用于同源校验。
	Host func(ctx *Context) string
}

// upgradeRequests 统计进行中的升级请求数（对应 BaseHandler.upgrade_requests）。
var upgradeRequests int64

// ---- 路由常量 ----

const (
	rAdminUpgrade  = "/api/admin/upgrade"
	rUpgradeHealth = "/api/upgrade/health"
)

// defaultUpgradeSocket 是升级执行器的默认 socket 路径。
const defaultUpgradeSocket = "/run/talebook-release/control.sock"

// upgradeActions 是允许的升级动作白名单。
var upgradeActions = map[string]bool{
	"check":         true,
	"install":       true,
	"activate":      true,
	"delete":        true,
	"delete_backup": true,
	"retention":     true,
}

// ---- AdminUpgrade ----

// AdminUpgradeHandler 实现 /api/admin/upgrade。
func AdminUpgradeHandler(cfg UpgradeConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if ctx.Request.Method == http.MethodPost {
			return adminUpgradePost(cfg, ctx)
		}
		return adminUpgradeRequest(cfg, "status", nil, nil), nil
	}
}

// adminUpgradePost 处理升级动作请求。
func adminUpgradePost(cfg UpgradeConfig, ctx *Context) (map[string]any, error) {
	// JSON 装饰器允许 CORS，因此这里显式要求同源 JSON 请求。
	if !adminUpgradeSameOrigin(cfg, ctx) {
		return map[string]any{"err": "origin"}, nil
	}

	var args map[string]any
	if err := json.Unmarshal(ctx.Body(), &args); err != nil {
		return map[string]any{"err": "params"}, nil
	}
	action, _ := args["action"].(string)
	if !upgradeActions[action] {
		return map[string]any{"err": "params"}, nil
	}

	if action == "retention" {
		return adminUpgradeRequest(cfg, "retention", nil, args["keep"]), nil
	}
	return adminUpgradeRequest(cfg, action, args["release"], nil), nil
}

// adminUpgradeSameOrigin 校验请求来自同源的显式升级调用。
func adminUpgradeSameOrigin(cfg UpgradeConfig, ctx *Context) bool {
	h := ctx.Request.Header
	if h.Get("X-Talebook-Upgrade") != "1" {
		return false
	}
	if !strings.HasPrefix(h.Get("Content-Type"), "application/json") {
		return false
	}
	if origin := h.Get("Origin"); origin != "" {
		parsed, err := url.Parse(origin)
		if err != nil {
			return false
		}
		host := ""
		if cfg.Host != nil {
			host = cfg.Host(ctx)
		}
		if host == "" {
			host = ctx.Request.Host
		}
		if parsed.Host != host {
			return false
		}
	}
	if h.Get("Sec-Fetch-Site") == "cross-site" {
		return false
	}
	return true
}

// adminUpgradeRequest 调用升级执行器，并维护进行中计数。
func adminUpgradeRequest(cfg UpgradeConfig, action string, release, keep any) map[string]any {
	atomic.AddInt64(&upgradeRequests, 1)
	defer atomic.AddInt64(&upgradeRequests, -1)

	exec := cfg.RequestExecutor
	if exec == nil {
		exec = func(a string, r, k any) map[string]any {
			return requestUpgradeExecutor(cfg, a, r, k)
		}
	}
	return exec(action, release, keep)
}

// requestUpgradeExecutor 通过 Unix socket 调用受信任的升级执行器。
//
// 对应 Python 的 request_executor：连接失败或响应非法时返回
// {"err": <reason>, "status": {"disabled": <reason>, "phase": "idle"}}。
func requestUpgradeExecutor(cfg UpgradeConfig, action string, release, keep any) map[string]any {
	socketPath := cfg.SocketPath
	if socketPath == "" {
		socketPath = defaultUpgradeSocket
	}

	payload, err := json.Marshal(map[string]any{
		"action":  action,
		"release": release,
		"keep":    keep,
	})
	if err != nil {
		return upgradeDisabled(cfg)
	}

	conn, err := net.DialTimeout("unix", socketPath, 5*time.Second)
	if err != nil {
		return upgradeDisabled(cfg)
	}
	defer func() { _ = conn.Close() }()
	_ = conn.SetDeadline(time.Now().Add(5 * time.Second))

	if _, err := conn.Write(append(payload, '\n')); err != nil {
		return upgradeDisabled(cfg)
	}

	buf := make([]byte, 0, 4096)
	tmp := make([]byte, 4096)
	for len(buf) < 256*1024 {
		n, err := conn.Read(tmp)
		if n > 0 {
			buf = append(buf, tmp[:n]...)
			if idx := indexByte(buf, '\n'); idx >= 0 {
				buf = buf[:idx]
				break
			}
		}
		if err != nil {
			break
		}
	}

	var out map[string]any
	if err := json.Unmarshal(buf, &out); err != nil {
		return upgradeDisabled(cfg)
	}
	return out
}

// upgradeDisabled 构造「升级能力不可用」的响应。
func upgradeDisabled(cfg UpgradeConfig) map[string]any {
	reason := "loader"
	if cfg.UpgradeMode == "ssr" || cfg.UpgradeMode == "dev" {
		reason = "mode"
	}
	return map[string]any{
		"err": reason,
		"status": map[string]any{
			"disabled": reason,
			"phase":    "idle",
		},
	}
}

// indexByte 返回字节在切片中的下标，找不到返回 -1。
func indexByte(data []byte, target byte) int {
	for i, b := range data {
		if b == target {
			return i
		}
	}
	return -1
}

// ---- UpgradeHealth ----

// UpgradeHealthHandler 实现 /api/upgrade/health。
//
// 这是固定的回环就绪/排空探针，不作为公开操作路由。
func UpgradeHealthHandler(cfg UpgradeConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		// 仅允许本机直连，且不得经过代理。
		if remoteIP(ctx.Request) != "127.0.0.1" || ctx.Request.Header.Get("X-Forwarded-For") != "" {
			http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
			return nil, nil
		}

		supported := upgradeLayoutSupported(cfg.Settings)
		busy := atomic.LoadInt64(&upgradeRequests) > 0
		if !busy && cfg.AsyncBusy != nil {
			busy = cfg.AsyncBusy()
		}
		if !busy {
			durable, err := upgradeDurableBusy(cfg.DB)
			if err != nil {
				return nil, err
			}
			busy = durable
		}

		return map[string]any{
			"err":       "ok",
			"version":   cfg.Version,
			"supported": supported,
			"busy":      busy,
		}, nil
	}
}

// upgradeLayoutSupported 判定当前部署布局是否支持在线升级。
//
// 远程数据库与自定义目录需要单独评审的备份/排空适配器。
func upgradeLayoutSupported(settings map[string]any) bool {
	if settingString(settings, "user_database") != "sqlite:////data/books/calibre-webserver.db" {
		return false
	}
	if strings.TrimRight(settingString(settings, "with_library"), "/") != "/data/books/library" {
		return false
	}
	if settingBool(settings, "import_auto_watch_enabled", false) {
		return false
	}
	installed, ok := settings["installed"].(bool)
	return ok && installed
}

// upgradeDurableBusy 检查是否有持久化的后台任务在跑。
func upgradeDurableBusy(db *sql.DB) (bool, error) {
	if db == nil {
		return false, nil
	}
	var one int
	err := db.QueryRow(`SELECT 1 FROM audiobook_jobs
		WHERE status IN ('queued','inspecting','generating','finalizing') LIMIT 1`).Scan(&one)
	if err == nil {
		return true, nil
	}
	if err != sql.ErrNoRows {
		return false, fmt.Errorf("httpapi: 查询 audiobook_jobs 失败: %w", err)
	}

	err = db.QueryRow(`SELECT 1 FROM plugin_runs WHERE status IN ('queued','running') LIMIT 1`).Scan(&one)
	if err == nil {
		return true, nil
	}
	if err != sql.ErrNoRows {
		return false, fmt.Errorf("httpapi: 查询 plugin_runs 失败: %w", err)
	}
	return false, nil
}

// ---- 路由表 ----

// UpgradeRouteSpecs 返回升级模块接管的 2 条路由。
func UpgradeRouteSpecs(cfg UpgradeConfig) []RouteSpec {
	methods := []string{http.MethodGet, http.MethodPost}
	return []RouteSpec{
		{Pattern: rAdminUpgrade, Methods: methods, Auth: true, Admin: true, Handler: AdminUpgradeHandler(cfg)},
		{Pattern: rUpgradeHealth, Methods: methods, Handler: UpgradeHealthHandler(cfg)},
	}
}

// UpgradeModeFromEnv 读取 TALEBOOK_UPGRADE_MODE。
func UpgradeModeFromEnv() string {
	return os.Getenv("TALEBOOK_UPGRADE_MODE")
}
