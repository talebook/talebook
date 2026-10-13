// 本文件复刻 webserver/handlers/scan.py 中导入目录相关的 4 条路由。
//
// 扫描/导入流水线（ScanList / ScanRun / ImportRun 等）依赖 ScanService，
// 不在本文件范围内。
package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"

	"talebook/booksvr/internal/importdir"
)

// 路由 pattern。
const (
	rImportSettings       = "/api/admin/import/settings"
	rImportDirectoryCheck = "/api/admin/import/directory/check"
	rImportDirectoryList  = "/api/admin/import/directory/list"
	rImportWatchStatus    = "/api/admin/import/watch/status"
)

// ImportConfig 是导入目录路由的配置。
type ImportConfig struct {
	// Dir 是导入目录逻辑的配置。
	Dir importdir.Config
	// WatchStatus 返回自动监控状态；为 nil 时返回「关闭」。
	WatchStatus func() map[string]any
	// SaveSettings 持久化导入设置；为 nil 时表示不支持保存。
	SaveSettings func(values map[string]any) error
}

// watchStatus 返回自动监控状态。
func (c ImportConfig) watchStatus() map[string]any {
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

// importSettingsPayload 复刻 ImportSettings._settings_payload。
//
// check 为 nil 时按当前配置重新检查目录。
func importSettingsPayload(cfg ImportConfig, check *importdir.DirectoryResult) map[string]any {
	path := importdir.NormalizePath(cfg.Dir.ScanUploadPath)
	result := importdir.CheckImportDirectory(path, cfg.Dir)
	if check != nil {
		result = *check
	}
	mode := normalizeImportMode(cfg.Dir)
	return map[string]any{
		"scan_upload_path":   path,
		"import_mode":        mode,
		"auto_watch_enabled": cfg.Dir.AutoWatchEnabled,
		"allowed_roots":      importdir.ConfiguredAllowedRoots(cfg.Dir),
		"directory_check":    result,
		"watch_status":       cfg.watchStatus(),
	}
}

// normalizeImportMode 复刻 normalize_import_mode。
//
// 显式模式优先；否则 delete_after 为真时用 move；再否则用配置值；
// 配置值非法时退回 copy。
func normalizeImportMode(cfg importdir.Config) string {
	if isImportMode(cfg.ImportMode) {
		return cfg.ImportMode
	}
	if cfg.DeleteAfter {
		return importModeMove
	}
	if isImportMode(cfg.SavedImportMode) {
		return cfg.SavedImportMode
	}
	return importModeCopy
}

// 导入模式常量，对齐 Python 的 IMPORT_MODE_*。
const (
	importModeIndex = "index"
	importModeCopy  = "copy"
	importModeMove  = "move"
)

// isImportMode 报告模式是否合法。
func isImportMode(mode string) bool {
	return mode == importModeIndex || mode == importModeCopy || mode == importModeMove
}

// jsonBody 解析请求体为 map；空体或非法 JSON 返回空 map。
func jsonBody(ctx *Context) map[string]any {
	if ctx.Request == nil || ctx.Request.Body == nil {
		return map[string]any{}
	}
	raw, err := readBodyLimited(ctx.Request, 1<<20)
	if err != nil || len(raw) == 0 {
		return map[string]any{}
	}
	var out map[string]any
	if err := json.Unmarshal(raw, &out); err != nil {
		return map[string]any{}
	}
	return out
}

// ImportSettingsHandler 实现 /api/admin/import/settings（GET / POST，需管理员）。
func ImportSettingsHandler(cfg ImportConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if ctx.Request.Method == http.MethodGet {
			return map[string]any{"err": "ok", "settings": importSettingsPayload(cfg, nil)}, nil
		}

		req := jsonBody(ctx)
		path := importdir.NormalizePath(firstNonEmpty(
			toStr(req["scan_upload_path"]), toStr(req["path"]), cfg.Dir.ScanUploadPath))

		mode := normalizeImportMode(importdir.Config{
			ImportMode:      toStr(req["import_mode"]),
			SavedImportMode: cfg.Dir.SavedImportMode,
		})

		autoWatch := cfg.Dir.AutoWatchEnabled
		if v, ok := req["auto_watch_enabled"]; ok {
			autoWatch = asBoolDefault(v, autoWatch)
		} else if v, ok := req["import_auto_watch_enabled"]; ok {
			autoWatch = asBoolDefault(v, autoWatch)
		}

		// 允许根目录：仅当请求显式提供该字段时才校验。
		rawRoots, rootsPresent := req["import_allowed_roots"]
		var roots []string
		if rootsPresent {
			roots = toStringSlice(rawRoots)
		}
		sanitized, code, msg := importdir.SanitizeAllowedRoots(roots, rootsPresent)
		if code != "" {
			return map[string]any{"err": code, "msg": msg}, nil
		}

		check := importdir.CheckImportDirectory(path, cfg.Dir)
		if check.Status == "error" {
			return map[string]any{
				"err": "params.path", "msg": check.Msg, "directory_check": check,
			}, nil
		}
		if mode == importModeMove && !check.Writable {
			return map[string]any{
				"err":             "params.path_not_writable",
				"msg":             "剪切到书库需要删除源文件，请选择可写目录。",
				"directory_check": check,
			}, nil
		}

		if cfg.SaveSettings != nil {
			values := map[string]any{
				"scan_upload_path":          path,
				"import_mode":               mode,
				"import_auto_watch_enabled": autoWatch,
			}
			if sanitized != nil {
				values["import_allowed_roots"] = sanitized
			}
			if err := cfg.SaveSettings(values); err != nil {
				return map[string]any{"err": "internal", "msg": err.Error()}, nil
			}
		}

		message := "导入设置已保存"
		if autoWatch {
			message = "自动监控已开启，正在扫描当前目录"
		}
		// 保存后重新读取配置，让返回的 settings 反映新值。
		updated := cfg
		updated.Dir.ScanUploadPath = path
		updated.Dir.SavedImportMode = mode
		updated.Dir.AutoWatchEnabled = autoWatch
		if sanitized != nil {
			updated.Dir.AllowedRoots = sanitized
		}
		return map[string]any{
			"err":      "ok",
			"msg":      message,
			"settings": importSettingsPayload(updated, &check),
		}, nil
	}
}

// ImportDirectoryCheckHandler 实现 /api/admin/import/directory/check（POST，需管理员）。
func ImportDirectoryCheckHandler(cfg ImportConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		req := jsonBody(ctx)
		path := firstNonEmpty(toStr(req["path"]), toStr(req["scan_upload_path"]))
		result := importdir.CheckImportDirectory(path, cfg.Dir)
		return map[string]any{"err": "ok", "directory": result, "msg": result.Msg}, nil
	}
}

// ImportDirectoryListHandler 实现 /api/admin/import/directory/list（GET，需管理员）。
func ImportDirectoryListHandler(cfg ImportConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		requested := ctx.Request.URL.Query().Get("path")
		if requested == "" {
			requested = cfg.Dir.ScanUploadPath
		}
		result := importdir.ListDirectories(requested, cfg.Dir)
		if result.Err != "" {
			return map[string]any{
				"err": result.Err, "msg": result.Msg, "path": result.Path,
				"items": result.Items, "allowed_roots": result.AllowedRoots,
			}, nil
		}
		return map[string]any{
			"err":           "ok",
			"path":          result.Path,
			"parent":        result.Parent,
			"allowed_roots": result.AllowedRoots,
			"items":         result.Items,
		}, nil
	}
}

// ImportWatchStatusHandler 实现 /api/admin/import/watch/status（GET，需管理员）。
func ImportWatchStatusHandler(cfg ImportConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		return map[string]any{"err": "ok", "watch_status": cfg.watchStatus()}, nil
	}
}

// ImportRouteSpecs 返回导入目录模块接管的 4 条路由。
func ImportRouteSpecs(cfg ImportConfig) []RouteSpec {
	return []RouteSpec{
		{
			Pattern: rImportSettings,
			Methods: []string{http.MethodGet, http.MethodPost},
			Auth:    true, Admin: true,
			Handler: ImportSettingsHandler(cfg),
		},
		{
			Pattern: rImportDirectoryCheck,
			Methods: []string{http.MethodPost},
			Auth:    true, Admin: true,
			Handler: ImportDirectoryCheckHandler(cfg),
		},
		{
			Pattern: rImportDirectoryList,
			Methods: []string{http.MethodGet},
			Auth:    true, Admin: true,
			Handler: ImportDirectoryListHandler(cfg),
		},
		{
			Pattern: rImportWatchStatus,
			Methods: []string{http.MethodGet},
			Auth:    true, Admin: true,
			Handler: ImportWatchStatusHandler(cfg),
		},
	}
}

// firstNonEmpty 返回第一个非空字符串。
func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}

// toStringSlice 把 JSON 值转成字符串切片；字符串按逗号切分。
func toStringSlice(v any) []string {
	switch val := v.(type) {
	case string:
		parts := strings.Split(val, ",")
		out := make([]string, 0, len(parts))
		for _, p := range parts {
			if p = strings.TrimSpace(p); p != "" {
				out = append(out, p)
			}
		}
		return out
	case []any:
		out := make([]string, 0, len(val))
		for _, item := range val {
			out = append(out, toStr(item))
		}
		return out
	case []string:
		return val
	}
	return nil
}
