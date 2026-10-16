// 本文件复刻 webserver/handlers/scan.py 中扫描/导入流水线相关的 7 条路由。
//
// 导入目录相关的 4 条路由在 import_settings.go 中。
package httpapi

import (
	"net/http"
	"strconv"
	"strings"

	"talebook/booksvr/internal/importdir"
	"talebook/booksvr/internal/scan"
	"talebook/booksvr/internal/userdb"
)

// 路由 pattern。
const (
	rScanList     = "/api/admin/scan/list"
	rScanRun      = "/api/admin/scan/run"
	rScanStatus   = "/api/admin/scan/status"
	rScanDelete   = "/api/admin/scan/delete"
	rScanMark     = "/api/admin/scan/mark"
	rImportRun    = "/api/admin/import/run"
	rImportStatus = "/api/admin/import/status"
)

// ScanConfig 是扫描/导入流水线路由的配置。
type ScanConfig struct {
	// Dir 是导入目录逻辑的配置（提供 scan_upload_path 与导入模式）。
	Dir          importdir.Config
	SettingsPath string
	// Service 返回扫描服务；为 nil 时相关接口返回服务不可用。
	Service func() *scan.Service
	// WatchStatus 返回自动监控状态；为 nil 时返回「关闭」。
	WatchStatus func() map[string]any
	// StartScan 启动一次异步扫描；为 nil 时返回服务不可用。
	StartScan func(path string, limit int) error
	// StartImport 启动一次异步导入；为 nil 时返回服务不可用。
	StartImport func(hashlist []string, userID int64, deleteAfter bool, importMode string) error
	// UserID 从请求上下文取当前用户 ID。
	UserID func(ctx *Context) int64
}

// watchStatus 返回自动监控状态。
func (c ScanConfig) watchStatus() map[string]any {
	if c.WatchStatus != nil {
		return c.WatchStatus()
	}
	return map[string]any{
		"state":        "off",
		"queued":       0,
		"running":      0,
		"failed":       0,
		"last_scan_at": nil,
		"message":      "",
	}
}

// scanService 返回扫描服务；未配置时返回 nil。
func (c ScanConfig) scanService() *scan.Service {
	if c.Service == nil {
		return nil
	}
	return c.Service()
}

// scanFileToDict 复刻 ScanList 的条目序列化。
func scanFileToDict(row *userdb.ScanFile) map[string]any {
	data := row.Data
	if data == nil {
		data = map[string]any{}
	}
	return map[string]any{
		"id":          row.ID,
		"path":        row.Path,
		"hash":        row.Hash,
		"title":       row.Title,
		"author":      row.Author,
		"publisher":   row.Publisher,
		"tags":        row.Tags,
		"status":      row.Status,
		"book_id":     row.BookID,
		"data":        data,
		"create_time": orNA(row.CreateTime),
		"update_time": orNA(row.UpdateTime),
	}
}

// orNA 复刻 Python 的 `x.strftime(...) if x else "N/A"`。
func orNA(s string) string {
	if s == "" {
		return "N/A"
	}
	return s
}

// ScanListHandler 实现 /api/admin/scan/list（GET，需管理员）。
func ScanListHandler(cfg ScanConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		cfg := cfg
		cfg.Dir = LiveImportDir(cfg.Dir, cfg.SettingsPath)
		svc := cfg.scanService()
		if svc == nil {
			return map[string]any{"err": "service.unavailable", "msg": "扫描服务不可用"}, nil
		}

		q := ctx.Request.URL.Query()
		num := atoiDefault(q.Get("num"), 20)
		if num <= 0 {
			num = 0 // 0 表示不分页
		}
		page := atoiDefault(q.Get("page"), 1) - 1
		if page < 0 {
			page = 0
		}
		opts := scan.ListOptions{
			Num:    num,
			Page:   page,
			Sort:   firstNonEmpty(q.Get("sort"), "create_time"),
			Desc:   q.Get("desc") != "false",
			Filter: scan.ListFilter(firstNonEmpty(q.Get("filter"), "all")),
		}

		rows, total, err := svc.List(opts)
		if err != nil {
			return nil, err
		}
		items := make([]map[string]any, 0, len(rows))
		for _, r := range rows {
			items = append(items, scanFileToDict(r))
		}

		summary, err := svc.Summary()
		if err != nil {
			return nil, err
		}
		return map[string]any{
			"err":                "ok",
			"items":              items,
			"total":              total,
			"summary":            summary,
			"scan_dir":           cfg.Dir.ScanUploadPath,
			"import_mode":        normalizeImportMode(cfg.Dir),
			"auto_watch_enabled": cfg.Dir.AutoWatchEnabled,
			"watch_status":       cfg.watchStatus(),
		}, nil
	}
}

// ScanRunHandler 实现 /api/admin/scan/run（POST，需管理员）。
func ScanRunHandler(cfg ScanConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		cfg := cfg
		cfg.Dir = LiveImportDir(cfg.Dir, cfg.SettingsPath)
		if cfg.StartScan == nil {
			return map[string]any{"err": "service.unavailable", "msg": "扫描服务不可用"}, nil
		}
		limit := cfg.Dir.ScanBatchSize
		if limit <= 0 {
			limit = 500
		}
		roots := importdir.ConfiguredAllowedRoots(cfg.Dir)
		scanRoots := make([]string, 0, len(roots))
		for _, path := range roots {
			covered := false
			for _, other := range roots {
				if path != other && importdir.IsWithin(path, other) {
					covered = true
					break
				}
			}
			if !covered {
				scanRoots = append(scanRoots, path)
			}
		}
		for _, path := range scanRoots {
			checkCfg := cfg.Dir
			checkCfg.AllowedRoots = roots
			check := importdir.CheckImportDirectory(path, checkCfg)
			if check.Status == "error" {
				return map[string]any{
					"err": "params.path", "msg": check.Msg, "directory_check": check,
				}, nil
			}
			if err := cfg.StartScan(path, limit); err != nil {
				return nil, err
			}
		}
		return map[string]any{"err": "ok", "msg": "开始扫描了", "total": len(scanRoots)}, nil
	}
}

// ScanStatusHandler 实现 /api/admin/scan/status（GET，需管理员）。
func ScanStatusHandler(cfg ScanConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		svc := cfg.scanService()
		if svc == nil {
			return map[string]any{"err": "service.unavailable", "msg": "扫描服务不可用"}, nil
		}
		_, status, err := svc.ScanStatus()
		if err != nil {
			return nil, err
		}
		summary, err := svc.Summary()
		if err != nil {
			return nil, err
		}
		return taskStatusResponse(cfg, "scan", status, summary), nil
	}
}

// ScanDeleteHandler 实现 /api/admin/scan/delete（POST，需管理员）。
func ScanDeleteHandler(cfg ScanConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		svc := cfg.scanService()
		if svc == nil {
			return map[string]any{"err": "service.unavailable", "msg": "扫描服务不可用"}, nil
		}
		body := jsonBody(ctx)
		hashlist, err := parseHashList(body["hashlist"])
		if err != nil {
			return map[string]any{"err": "params.error", "msg": "参数错误"}, nil
		}
		count, err := svc.Delete(hashlist)
		if err != nil {
			return nil, err
		}
		return map[string]any{"err": "ok", "msg": "删除成功", "count": count}, nil
	}
}

// ScanMarkHandler 实现 /api/admin/scan/mark（POST，需管理员）。
//
// Python 侧是空实现，仅返回成功。
func ScanMarkHandler(cfg ScanConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		return map[string]any{"err": "ok", "msg": "发送成功"}, nil
	}
}

// ImportRunHandler 实现 /api/admin/import/run（POST，需管理员）。
func ImportRunHandler(cfg ScanConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		cfg := cfg
		cfg.Dir = LiveImportDir(cfg.Dir, cfg.SettingsPath)
		svc := cfg.scanService()
		if svc == nil {
			return map[string]any{"err": "service.unavailable", "msg": "扫描服务不可用"}, nil
		}
		body := jsonBody(ctx)
		hashlist, err := parseHashList(body["hashlist"])
		if err != nil {
			return map[string]any{"err": "params.error", "msg": "参数错误"}, nil
		}
		deleteAfter := toBool(body["delete_after"])
		mode := normalizeImportMode(importdir.Config{
			ImportMode:      toStr(body["import_mode"]),
			DeleteAfter:     deleteAfter,
			SavedImportMode: cfg.Dir.SavedImportMode,
		})

		total, err := svc.CountReady(hashlist)
		if err != nil {
			return nil, err
		}
		if total == 0 {
			return map[string]any{"err": "empty", "msg": "没有等待导入书库的书籍！"}, nil
		}
		if cfg.StartImport == nil {
			return map[string]any{"err": "service.unavailable", "msg": "导入服务不可用"}, nil
		}
		var userID int64
		if cfg.UserID != nil {
			userID = cfg.UserID(ctx)
		}
		if err := cfg.StartImport(hashlist, userID, deleteAfter, mode); err != nil {
			return nil, err
		}
		return map[string]any{"err": "ok", "msg": "导入任务已提交", "import_mode": mode}, nil
	}
}

// ImportStatusHandler 实现 /api/admin/import/status（GET，需管理员）。
func ImportStatusHandler(cfg ScanConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		svc := cfg.scanService()
		if svc == nil {
			return map[string]any{"err": "service.unavailable", "msg": "扫描服务不可用"}, nil
		}
		_, status, err := svc.ImportStatus()
		if err != nil {
			return nil, err
		}
		summary, err := svc.Summary()
		if err != nil {
			return nil, err
		}
		return taskStatusResponse(cfg, "import", status, summary), nil
	}
}

func taskStatusResponse(cfg ScanConfig, kind string, status, summary any) map[string]any {
	watch := cfg.watchStatus()
	running, _ := watch["manual_"+kind+"_running"].(bool)
	if watch["state"] == "scanning" && kind == "scan" || watch["state"] == "importing" && kind == "import" {
		running = true
	}
	message, _ := watch["manual_"+kind+"_error"].(string)
	response := map[string]any{"err": "ok", "msg": "成功", "status": status, "summary": summary, "running": running}
	response["watch_status"] = watch
	if message != "" && !running {
		response["err"], response["msg"] = "task.failed", message
	}
	return response
}

// ScanRouteSpecs 返回扫描/导入流水线模块接管的 7 条路由。
func ScanRouteSpecs(cfg ScanConfig) []RouteSpec {
	return []RouteSpec{
		{Pattern: rScanList, Methods: []string{http.MethodGet}, Auth: true, Admin: true, Handler: ScanListHandler(cfg)},
		{Pattern: rScanRun, Methods: []string{http.MethodPost}, Auth: true, Admin: true, Handler: ScanRunHandler(cfg)},
		{Pattern: rScanStatus, Methods: []string{http.MethodGet}, Auth: true, Admin: true, Handler: ScanStatusHandler(cfg)},
		{Pattern: rScanDelete, Methods: []string{http.MethodPost}, Auth: true, Admin: true, Handler: ScanDeleteHandler(cfg)},
		{Pattern: rScanMark, Methods: []string{http.MethodPost}, Auth: true, Admin: true, Handler: ScanMarkHandler(cfg)},
		{Pattern: rImportRun, Methods: []string{http.MethodPost}, Auth: true, Admin: true, Handler: ImportRunHandler(cfg)},
		{Pattern: rImportStatus, Methods: []string{http.MethodGet}, Auth: true, Admin: true, Handler: ImportStatusHandler(cfg)},
	}
}

// parseHashList 复刻 Python 的 hashlist 语义。
//
// 返回 (nil, nil) 表示 "all"（删除/导入全部）；空列表返回错误。
func parseHashList(v any) ([]string, error) {
	if v == nil {
		return nil, errBadHashList
	}
	if s, ok := v.(string); ok {
		if s == "all" {
			return nil, nil
		}
		if s == "" {
			return nil, errBadHashList
		}
		return []string{s}, nil
	}
	list := toStringSlice(v)
	if len(list) == 0 {
		return nil, errBadHashList
	}
	return list, nil
}

// errBadHashList 表示 hashlist 参数非法。
var errBadHashList = errHashList("scan: hashlist 参数非法")

type errHashList string

func (e errHashList) Error() string { return string(e) }

// atoiDefault 解析整数，失败时返回默认值。
func atoiDefault(s string, def int) int {
	if s == "" {
		return def
	}
	n, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	return n
}

// toBool 复刻 Python 的字符串布尔转换。
func toBool(v any) bool {
	switch val := v.(type) {
	case bool:
		return val
	case string:
		switch strings.ToLower(val) {
		case "1", "true", "yes", "on":
			return true
		}
		return false
	case float64:
		return val != 0
	case int:
		return val != 0
	}
	return false
}
