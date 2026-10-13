// 本文件实现 webserver/handlers/plugin_booktools.py 的 10 条路由。
//
// 内置文本工具的 HTTP 编排（正文查找替换 / 繁简转换 / TXT 编码修复 / EPUB 美化）。
// 四个工具均为 builtin capability 插件（provider 与纯处理核心位于各 tool 插件包），
// 本模块负责书籍定位、权限校验、临时文件编排、写回入库与审计。
package httpapi

import (
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"talebook/booksvr/internal/booktools"
	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginruntime"
	"talebook/booksvr/internal/userdb"
)

// TransformCapability 是正文工具插件声明的能力。
const TransformCapability = "integrations.tool"

// 各工具的 manage_route（与插件清单 ui.manage_route 对应）。
const (
	TextReplaceRoute  = "/plugins/text-replace"
	TXTFixerRoute     = "/plugins/txt-fixer"
	ZhConverterRoute  = "/plugins/zh-converter"
	EpubBeautifyRoute = "/plugins/epub-beautify"
)

// 另存为新书时的标题后缀。
const (
	ZhNewBookSuffixZh  = "（简体版）"
	ZhNewBookSuffixZht = "（繁體版）"
	EpubBeautifySuffix = "（美化版）"
)

// BookToolsConfig 是内置文本工具 handler 的依赖。
type BookToolsConfig struct {
	// Settings 是 Talebook 配置（CONF）。
	Settings map[string]any
	// Registry 是插件注册表；为 nil 时工具接口返回「未启用」。
	Registry *pluginruntime.PluginRegistry
	// Runtime 构造运行时；为 nil 时用默认实现。
	Runtime func(ctx *Context) *pluginruntime.Runtime
	// CanViewBook 判断当前访问者是否可见某本书。
	CanViewBook func(ctx *Context, bookID int64) (bool, error)
	// WorkDir 创建一次工具运行的临时目录；为 nil 时用 os.MkdirTemp。
	WorkDir func() (string, error)
	// BackupDir 返回持久备份目录；为 nil 时用 convert_path/texttools-backups。
	BackupDir func() string
	// EpubBeautifyPresets 返回 EPUB 美化的预设元数据（对应 PROVIDER.describe()）。
	EpubBeautifyPresets func() map[string]any
}

// bookToolsRuntime 构造运行时。
func (cfg BookToolsConfig) bookToolsRuntime(ctx *Context) *pluginruntime.Runtime {
	if cfg.Runtime != nil {
		return cfg.Runtime(ctx)
	}
	return pluginruntime.NewRuntime(ctx.DB, cfg.Settings, cfg.Registry)
}

// workDir 创建一次工具运行的临时目录。
func (cfg BookToolsConfig) workDir() (string, error) {
	if cfg.WorkDir != nil {
		return cfg.WorkDir()
	}
	return os.MkdirTemp("", "talebook-texttools-")
}

// backupDir 返回持久备份目录。
func (cfg BookToolsConfig) backupDir() string {
	if cfg.BackupDir != nil {
		return cfg.BackupDir()
	}
	base := pluginStr(cfg.Settings["convert_path"])
	if base == "" {
		base = os.TempDir()
	}
	path := filepath.Join(base, "texttools-backups")
	// 目录创建失败不阻断：后续 OverwriteFormat 会再次 MkdirAll 并报出真实错误。
	if err := os.MkdirAll(path, 0o755); err != nil {
		return path
	}
	return path
}

// toolError 复刻 plugin_booktools._tool_error。
func toolError(err error) map[string]any {
	return map[string]any{"err": "booktools.failed", "msg": err.Error()}
}

// toolBookID 复刻 plugin_booktools._tool_book_id。
func toolBookID(req map[string]any) (int64, error) {
	raw, present := req["book_id"]
	if !present || raw == nil {
		return 0, booktools.NewError("参数错误：缺少 book_id")
	}
	bookID := pluginInt(raw, 0)
	if bookID <= 0 {
		return 0, booktools.NewError("参数错误：缺少 book_id")
	}
	return bookID, nil
}

// toolResolveBook 复刻 plugin_booktools._tool_resolve_book。
//
// 无权查看时抛出与「不存在」一致的错误，避免探测私有书籍。
func (cfg BookToolsConfig) toolResolveBook(ctx *Context, bookID int64) (*library.BookData, error) {
	if cfg.CanViewBook != nil {
		ok, err := cfg.CanViewBook(ctx, bookID)
		if err != nil {
			return nil, err
		}
		if !ok {
			return nil, booktools.NewError("书籍不存在：ID=%d", bookID)
		}
	}
	return booktools.ResolveBook(ctx.DB, bookID)
}

// toolRuntime 复刻 plugin_booktools._tool_runtime。
//
// 按声明式 UI 入口选择 typed transform，不在 handler 硬编码插件身份。
func (cfg BookToolsConfig) toolRuntime(ctx *Context, manageRoute string) (
	*pluginruntime.Runtime, *userdb.PluginConnection, error) {
	if _, err := pluginruntime.EnsureBuiltinInstallations(ctx.DB, ctx.Identity.UserID,
		cfg.Settings, cfg.Registry); err != nil {
		return nil, nil, err
	}
	rt := cfg.bookToolsRuntime(ctx)
	userID := ctx.Identity.UserID
	connections, err := rt.ConnectionsFor(TransformCapability, &userID)
	if err != nil {
		return nil, nil, err
	}
	for _, connection := range connections {
		pluginKey, err := rt.PluginKeyOf(connection)
		if err != nil {
			continue
		}
		provider, err := cfg.Registry.Get(pluginKey)
		if err != nil {
			continue
		}
		if pluginStr(pluginDict(provider.Manifest()["ui"])["manage_route"]) == manageRoute {
			return rt, connection, nil
		}
	}
	return nil, nil, booktools.NewError("正文工具未启用")
}

// toolRestoreBackup 复刻 plugin_booktools._restore_backup。
func toolRestoreBackup(db *sql.DB, bookID int64, format, backupPath string) (bool, error) {
	if backupPath == "" {
		return false, nil
	}
	if info, err := os.Stat(backupPath); err != nil || !info.Mode().IsRegular() {
		return false, nil
	}
	if _, err := booktools.OverwriteFormat(db, bookID, format, backupPath, ""); err != nil {
		return false, err
	}
	return true, nil
}

// bookOption 复刻 plugin_booktools._book_option。
func bookOption(book *library.BookData) map[string]any {
	formats := booktools.AvailableFormats(book)
	usable := []string{}
	for _, candidate := range []string{"EPUB", "TXT"} {
		for _, f := range formats {
			if f == candidate {
				usable = append(usable, candidate)
				break
			}
		}
	}
	authors := make([]string, 0, len(book.Authors))
	for _, a := range book.Authors {
		authors = append(authors, a)
	}
	return map[string]any{
		"id":        book.ID,
		"title":     book.Title,
		"authors":   authors,
		"formats":   usable,
		"timestamp": fmt.Sprintf("%d", book.Timestamp),
	}
}

// ---- UserBookToolsBooks ----

// UserBookToolsBooksHandler 对应 UserBookToolsBooks（@js @auth）。
func UserBookToolsBooksHandler(cfg BookToolsConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if raw := ctx.Query("book_id"); raw != "" {
			bookID := pluginInt(raw, 0)
			book, err := cfg.toolResolveBook(ctx, bookID)
			if err != nil {
				return toolError(err), nil
			}
			item := bookOption(book)
			books := []map[string]any{}
			total := 0
			if len(item["formats"].([]string)) > 0 {
				books = append(books, item)
				total = 1
			}
			return map[string]any{"err": "ok", "books": books, "total": total}, nil
		}

		keyword := strings.ToLower(strings.TrimSpace(ctx.Query("query")))
		ids, err := library.AllBookIDs(ctx.DB)
		if err != nil {
			return nil, err
		}
		all, err := library.GetBooksData(ctx.DB, ids)
		if err != nil {
			return nil, err
		}
		items := []map[string]any{}
		for i := range all {
			item := bookOption(&all[i])
			if len(item["formats"].([]string)) == 0 {
				continue
			}
			if keyword != "" {
				haystack := fmt.Sprintf("%s %s", item["title"], strings.Join(item["authors"].([]string), " "))
				if !strings.Contains(strings.ToLower(haystack), keyword) {
					continue
				}
			}
			items = append(items, item)
		}
		// 按 timestamp 降序（字符串比较，与 Python 的 str 排序一致）。
		sort.SliceStable(items, func(i, j int) bool {
			return pluginStr(items[i]["timestamp"]) > pluginStr(items[j]["timestamp"])
		})
		total := len(items)
		if len(items) > 100 {
			items = items[:100]
		}
		return map[string]any{"err": "ok", "books": items, "total": total}, nil
	}
}

// ---- AdminBookToolActions ----

// AdminBookToolActionsHandler 对应 AdminBookToolActions（@js @is_admin）。
//
// 返回当前书籍可用的实例级 Tool 动作，前端无需识别具体插件。
func AdminBookToolActionsHandler(cfg BookToolsConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		bookID, err := toolBookID(map[string]any{"book_id": ctx.Query("book_id")})
		if err != nil {
			return toolError(err), nil
		}
		book, err := cfg.toolResolveBook(ctx, bookID)
		if err != nil {
			return toolError(err), nil
		}
		bookFormats := map[string]bool{}
		for _, f := range booktools.AvailableFormats(book) {
			bookFormats[f] = true
		}
		if _, err := pluginruntime.EnsureBuiltinInstallations(ctx.DB, ctx.Identity.UserID,
			cfg.Settings, cfg.Registry); err != nil {
			return toolError(err), nil
		}
		providers, err := cfg.bookToolsRuntime(ctx).EnabledProviders(TransformCapability)
		if err != nil {
			return toolError(err), nil
		}
		actions := []map[string]any{}
		for _, provider := range providers {
			transform, ok := provider.(pluginiface.TransformProvider)
			if ok {
				supported := transform.SupportedFormats()
				if len(supported) > 0 {
					overlap := false
					for f := range supported {
						if bookFormats[strings.ToUpper(f)] {
							overlap = true
							break
						}
					}
					if !overlap {
						continue
					}
				}
			}
			manifest := provider.Manifest()
			ui := pluginDict(manifest["ui"])
			route := pluginStr(ui["manage_route"])
			if route == "" {
				continue
			}
			icon := pluginStr(ui["icon"])
			if icon == "" {
				icon = "mdi-puzzle-outline"
			}
			actions = append(actions, map[string]any{
				"plugin_key": pluginStr(manifest["id"]),
				"name":       pluginStr(manifest["name"]),
				"icon":       icon,
				"route":      route,
			})
		}
		return map[string]any{"err": "ok", "actions": actions}, nil
	}
}

// ---- 预览类（read） ----

// UserTextReplacePreviewHandler 对应 UserTextReplacePreview（@js @auth）。
func UserTextReplacePreviewHandler(cfg BookToolsConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		req, err := pluginBody(ctx)
		if err != nil {
			return toolError(err), nil
		}
		bookID, err := toolBookID(req)
		if err != nil {
			return toolError(err), nil
		}
		book, err := cfg.toolResolveBook(ctx, bookID)
		if err != nil {
			return toolError(err), nil
		}
		format := booktools.PickFormat(book, "TXT", "EPUB")
		if format == "" {
			return toolError(booktools.NewError("该书籍没有 TXT 或 EPUB 格式，无法执行替换")), nil
		}
		src, err := booktools.GetFormatPath(ctx.DB, bookID, format)
		if err != nil {
			return toolError(err), nil
		}
		rt, connection, err := cfg.toolRuntime(ctx, TextReplaceRoute)
		if err != nil {
			return toolError(err), nil
		}
		requestedBy := ctx.Identity.UserID
		result, err := rt.Read(connection, "preview", []any{plugindomain.NewDomainRecord(map[string]any{
			"path":        src,
			"format":      format,
			"pattern":     pluginStr(req["pattern"]),
			"replacement": pluginStr(req["replacement"]),
			"use_regex":   pluginBool(req["use_regex"]),
		})}, pluginruntime.CallOptions{
			RequiredScopes: []string{"books.read"},
			RequestedBy:    &requestedBy,
		})
		if err != nil {
			return toolError(err), nil
		}
		out := toolRecordDict(result)
		out["err"] = "ok"
		out["book_id"] = bookID
		return out, nil
	}
}

// UserTxtFixerAnalyzeHandler 对应 UserTxtFixerAnalyze（@js @auth）。
func UserTxtFixerAnalyzeHandler(cfg BookToolsConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		req, err := pluginBody(ctx)
		if err != nil {
			return toolError(err), nil
		}
		bookID, err := toolBookID(req)
		if err != nil {
			return toolError(err), nil
		}
		book, err := cfg.toolResolveBook(ctx, bookID)
		if err != nil {
			return toolError(err), nil
		}
		if !pluginContains(booktools.AvailableFormats(book), "TXT") {
			return toolError(booktools.NewError("该书籍没有 TXT 格式，无法执行检测")), nil
		}
		src, err := booktools.GetFormatPath(ctx.DB, bookID, "TXT")
		if err != nil {
			return toolError(err), nil
		}
		rt, connection, err := cfg.toolRuntime(ctx, TXTFixerRoute)
		if err != nil {
			return toolError(err), nil
		}
		requestedBy := ctx.Identity.UserID
		result, err := rt.Read(connection, "preview", []any{plugindomain.NewDomainRecord(map[string]any{
			"path": src, "format": "TXT",
		})}, pluginruntime.CallOptions{
			RequiredScopes: []string{"books.read"},
			RequestedBy:    &requestedBy,
		})
		if err != nil {
			return toolError(err), nil
		}
		out := toolRecordDict(result)
		out["err"] = "ok"
		out["book_id"] = bookID
		return out, nil
	}
}

// UserEpubBeautifyPresetsHandler 对应 UserEpubBeautifyPresets（@js @auth）。
//
// 无书籍依赖的预设/目录形式元数据，供工具页初始化渲染。
func UserEpubBeautifyPresetsHandler(cfg BookToolsConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		out := map[string]any{"err": "ok"}
		if cfg.EpubBeautifyPresets != nil {
			for k, v := range cfg.EpubBeautifyPresets() {
				out[k] = v
			}
		}
		return out, nil
	}
}

// UserEpubBeautifyPreviewHandler 对应 UserEpubBeautifyPreview（@js @auth）。
func UserEpubBeautifyPreviewHandler(cfg BookToolsConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		req, err := pluginBody(ctx)
		if err != nil {
			return toolError(err), nil
		}
		bookID, err := toolBookID(req)
		if err != nil {
			return toolError(err), nil
		}
		_, src, err := cfg.epubBeautifySource(ctx, bookID)
		if err != nil {
			return toolError(err), nil
		}
		rt, connection, err := cfg.toolRuntime(ctx, EpubBeautifyRoute)
		if err != nil {
			return toolError(err), nil
		}
		requestedBy := ctx.Identity.UserID
		timeout := 120.0
		result, err := rt.Read(connection, "preview", []any{plugindomain.NewDomainRecord(map[string]any{
			"path": src, "format": "EPUB",
		})}, pluginruntime.CallOptions{
			RequiredScopes: []string{"books.read"},
			RequestedBy:    &requestedBy,
			Timeout:        &timeout,
		})
		if err != nil {
			return toolError(err), nil
		}
		out := toolRecordDict(result)
		out["err"] = "ok"
		out["book_id"] = bookID
		return out, nil
	}
}

// epubBeautifySource 复刻 plugin_booktools._epub_beautify_source。
func (cfg BookToolsConfig) epubBeautifySource(ctx *Context, bookID int64) (
	*library.BookData, string, error) {
	book, err := cfg.toolResolveBook(ctx, bookID)
	if err != nil {
		return nil, "", err
	}
	if !pluginContains(booktools.AvailableFormats(book), "EPUB") {
		return nil, "", booktools.NewError("该书籍没有 EPUB 格式，无法美化")
	}
	src, err := booktools.GetFormatPath(ctx.DB, bookID, "EPUB")
	if err != nil {
		return nil, "", err
	}
	return book, src, nil
}

// ---- 运行类（write） ----

// toolWriteResult 是一次 write 调用的结果与回滚状态。
type toolWriteResult struct {
	// Response 是 finalize 组装出的响应体。
	Response map[string]any
	// BackupPath 是本次覆盖写回产生的备份路径（未备份时为空）。
	BackupPath string
}

// toolRunWrite 复刻各 Run handler 共用的 write 编排。
//
// 负责：临时目录生命周期、finalize 组装响应、rollback 恢复备份、
// 审计数据透传。finalize 由调用方提供，决定「另存为新书」还是「覆盖原书」。
func (cfg BookToolsConfig) toolRunWrite(ctx *Context, rt *pluginruntime.Runtime,
	connection *userdb.PluginConnection, method string, input map[string]any,
	auditData map[string]any, timeout *float64,
	finalize func(value map[string]any) (map[string]any, string, error)) (map[string]any, error) {
	workDir, err := cfg.workDir()
	if err != nil {
		return nil, err
	}
	defer func() { _ = os.RemoveAll(workDir) }()

	requestedBy := ctx.Identity.UserID
	backupPath := ""
	var rollbackBookID int64
	var rollbackFormat string

	opts := pluginruntime.CallOptions{
		RequiredScopes: []string{"books.write"},
		RequestedBy:    &requestedBy,
		AuditData:      auditData,
		Timeout:        timeout,
		Finalize: func(result any) (any, error) {
			value := toolRecordDict(result)
			rsp, backup, err := finalize(value)
			if err != nil {
				return nil, err
			}
			backupPath = backup
			return rsp, nil
		},
		Rollback: func() (map[string]any, bool) {
			if rollbackBookID == 0 || backupPath == "" {
				return nil, false
			}
			ok, err := toolRestoreBackup(ctx.DB, rollbackBookID, rollbackFormat, backupPath)
			if err != nil {
				return map[string]any{"msg": err.Error()}, false
			}
			return nil, ok
		},
	}
	if bookID := pluginInt(auditData["book_id"], 0); bookID != 0 {
		rollbackBookID = bookID
		rollbackFormat = pluginStr(auditData["format"])
	}

	result, err := rt.Write(connection, method, []any{
		plugindomain.NewDomainRecord(input), workDir,
	}, opts)
	if err != nil {
		return toolError(err), nil
	}
	rsp, ok := result.(map[string]any)
	if !ok {
		return toolError(booktools.NewError("工具返回了无效结果")), nil
	}
	return rsp, nil
}

// UserTextReplaceRunHandler 对应 UserTextReplaceRun（@js @is_admin）。
func UserTextReplaceRunHandler(cfg BookToolsConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		req, err := pluginBody(ctx)
		if err != nil {
			return toolError(err), nil
		}
		bookID, err := toolBookID(req)
		if err != nil {
			return toolError(err), nil
		}
		outputMode := pluginStr(req["output_mode"])
		if outputMode == "" {
			outputMode = "new"
		}
		if outputMode != "new" && outputMode != "overwrite" {
			return toolError(booktools.NewError("参数错误：output_mode 必须为 new 或 overwrite")), nil
		}
		book, err := cfg.toolResolveBook(ctx, bookID)
		if err != nil {
			return toolError(err), nil
		}
		format := booktools.PickFormat(book, "TXT", "EPUB")
		if format == "" {
			return toolError(booktools.NewError("该书籍没有 TXT 或 EPUB 格式，无法执行替换")), nil
		}
		src, err := booktools.GetFormatPath(ctx.DB, bookID, format)
		if err != nil {
			return toolError(err), nil
		}
		rt, connection, err := cfg.toolRuntime(ctx, TextReplaceRoute)
		if err != nil {
			return toolError(err), nil
		}

		return cfg.toolRunWrite(ctx, rt, connection, "apply", map[string]any{
			"path":        src,
			"format":      format,
			"pattern":     pluginStr(req["pattern"]),
			"replacement": pluginStr(req["replacement"]),
			"use_regex":   pluginBool(req["use_regex"]),
		}, map[string]any{
			"book_id": bookID, "format": format,
			"output_mode": outputMode, "pattern": pluginStr(req["pattern"]),
		}, nil, func(value map[string]any) (map[string]any, string, error) {
			rsp := map[string]any{"err": "ok", "output_mode": outputMode}
			for k, v := range value {
				rsp[k] = v
			}
			backup := ""
			if outputMode == "overwrite" {
				path := pluginStr(value["path"])
				var err error
				backup, err = booktools.OverwriteFormat(ctx.DB, bookID, format, path, cfg.backupDir())
				if err != nil {
					return nil, "", err
				}
				rsp["book_id"] = bookID
			} else {
				suffix := strings.TrimSpace(pluginStr(req["suffix"]))
				if suffix == "" {
					suffix = "（正文替换版）"
				}
				newID, err := booktools.ImportAsNewBook(ctx.DB, bookID, pluginStr(value["path"]),
					booktools.ImportOptions{TitleSuffix: suffix, CollectorID: ctx.Identity.UserID})
				if err != nil {
					return nil, "", err
				}
				rsp["book_id"] = newID
			}
			rsp["backup_path"] = backup
			return rsp, backup, nil
		})
	}
}

// UserTxtFixerRunHandler 对应 UserTxtFixerRun（@js @is_admin）。
func UserTxtFixerRunHandler(cfg BookToolsConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		req, err := pluginBody(ctx)
		if err != nil {
			return toolError(err), nil
		}
		bookID, err := toolBookID(req)
		if err != nil {
			return toolError(err), nil
		}
		outputMode := pluginStr(req["output_mode"])
		if outputMode == "" {
			outputMode = "new"
		}
		if outputMode != "new" && outputMode != "overwrite" {
			return toolError(booktools.NewError("参数错误：output_mode 必须为 new 或 overwrite")), nil
		}
		book, err := cfg.toolResolveBook(ctx, bookID)
		if err != nil {
			return toolError(err), nil
		}
		if !pluginContains(booktools.AvailableFormats(book), "TXT") {
			return toolError(booktools.NewError("该书籍没有 TXT 格式，无法执行修复")), nil
		}
		src, err := booktools.GetFormatPath(ctx.DB, bookID, "TXT")
		if err != nil {
			return toolError(err), nil
		}
		rt, connection, err := cfg.toolRuntime(ctx, TXTFixerRoute)
		if err != nil {
			return toolError(err), nil
		}

		return cfg.toolRunWrite(ctx, rt, connection, "apply", map[string]any{
			"path": src, "format": "TXT",
		}, map[string]any{
			"book_id": bookID, "format": "TXT", "output_mode": outputMode,
		}, nil, func(value map[string]any) (map[string]any, string, error) {
			rsp := map[string]any{"err": "ok", "output_mode": outputMode}
			for k, v := range value {
				rsp[k] = v
			}
			backup := ""
			if outputMode == "overwrite" {
				var err error
				backup, err = booktools.OverwriteFormat(ctx.DB, bookID, "TXT",
					pluginStr(value["path"]), cfg.backupDir())
				if err != nil {
					return nil, "", err
				}
				rsp["book_id"] = bookID
			} else {
				newID, err := booktools.ImportAsNewBook(ctx.DB, bookID, pluginStr(value["path"]),
					booktools.ImportOptions{TitleSuffix: "（编码修复版）", CollectorID: ctx.Identity.UserID})
				if err != nil {
					return nil, "", err
				}
				rsp["book_id"] = newID
			}
			rsp["backup_path"] = backup
			return rsp, backup, nil
		})
	}
}

// UserZhConverterRunHandler 对应 UserZhConverterRun（@js @is_admin）。
func UserZhConverterRunHandler(cfg BookToolsConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		req, err := pluginBody(ctx)
		if err != nil {
			return toolError(err), nil
		}
		bookID, err := toolBookID(req)
		if err != nil {
			return toolError(err), nil
		}
		outputMode := pluginStr(req["output_mode"])
		if outputMode == "" {
			outputMode = "new"
		}
		if outputMode != "new" && outputMode != "replace" {
			return toolError(booktools.NewError("参数错误：output_mode 必须为 new 或 replace")), nil
		}
		book, err := cfg.toolResolveBook(ctx, bookID)
		if err != nil {
			return toolError(err), nil
		}
		// 繁简转换优先处理 EPUB（保留目录结构），无 EPUB 时退回 TXT。
		format := booktools.PickFormat(book, "EPUB", "TXT")
		if format == "" {
			return toolError(booktools.NewError("该书籍没有 EPUB / TXT 格式，无法转换")), nil
		}
		src, err := booktools.GetFormatPath(ctx.DB, bookID, format)
		if err != nil {
			return toolError(err), nil
		}
		rt, connection, err := cfg.toolRuntime(ctx, ZhConverterRoute)
		if err != nil {
			return toolError(err), nil
		}
		backup := pluginBool(req["backup"])

		return cfg.toolRunWrite(ctx, rt, connection, "apply", map[string]any{
			"path":          src,
			"format":        format,
			"direction":     pluginStr(req["direction"]),
			"use_a5":        pluginBool(req["use_a5"]),
			"convert_title": pluginBool(req["convert_title"]),
			"title":         book.Title,
			"authors":       book.Authors,
		}, map[string]any{
			"book_id": bookID, "format": format,
			"direction": pluginStr(req["direction"]), "output_mode": outputMode,
		}, nil, func(value map[string]any) (map[string]any, string, error) {
			lang := pluginStr(value["language"])
			rsp := map[string]any{"err": "ok", "output_mode": outputMode}
			for k, v := range value {
				rsp[k] = v
			}
			backupPath := ""
			if outputMode == "replace" {
				dir := cfg.backupDir()
				if !backup {
					// Python 在 replace 模式下始终备份（backup_dir 为空时退回默认目录）。
					dir = cfg.backupDir()
				}
				var err error
				backupPath, err = booktools.OverwriteFormat(ctx.DB, bookID, format,
					pluginStr(value["path"]), dir)
				if err != nil {
					return nil, "", err
				}
				zhSyncBookMeta(ctx.DB, bookID, lang,
					pluginStr(value["converted_title"]), pluginStrList(value["converted_authors"]))
				rsp["book_id"] = bookID
			} else {
				suffix := ""
				switch lang {
				case "zh":
					suffix = ZhNewBookSuffixZh
				case "zht":
					suffix = ZhNewBookSuffixZht
				}
				newID, err := booktools.ImportAsNewBook(ctx.DB, bookID, pluginStr(value["path"]),
					booktools.ImportOptions{
						TitleSuffix:     suffix,
						Language:        lang,
						TitleOverride:   pluginStr(value["converted_title"]),
						AuthorsOverride: pluginStrList(value["converted_authors"]),
						CollectorID:     ctx.Identity.UserID,
					})
				if err != nil {
					return nil, "", err
				}
				rsp["book_id"] = newID
			}
			rsp["backup_path"] = backupPath
			return rsp, backupPath, nil
		})
	}
}

// zhSyncBookMeta 复刻 plugin_booktools._zh_sync_book_meta。
//
// 替换模式下同步库内标题/作者/语言（不加后缀），保持与转换后文件一致。
// 封面不受影响：只更新提供的字段，从不删除现有封面。
//
// 与 Python 一致：整个同步过程是 best-effort 的 —— Python 用 try/except
// 包住全部语句且只记 warning，因此这里的每个语句也都不向上报错。
// 文件已经写回成功，元数据同步失败不应让整个请求失败。
func zhSyncBookMeta(db *sql.DB, bookID int64, lang, title string, authors []string) {
	if title != "" {
		_, _ = db.Exec(`UPDATE books SET title = ?, sort = NULL WHERE id = ?`, title, bookID)
	}
	if len(authors) > 0 {
		_, _ = db.Exec(`DELETE FROM books_authors_link WHERE book = ?`, bookID)
		for _, author := range authors {
			author = strings.TrimSpace(author)
			if author == "" {
				continue
			}
			var authorID int64
			err := db.QueryRow(`SELECT id FROM authors WHERE name = ? LIMIT 1`, author).Scan(&authorID)
			if err == sql.ErrNoRows {
				res, insErr := db.Exec(`INSERT INTO authors (name) VALUES (?)`, author)
				if insErr != nil {
					continue
				}
				authorID, _ = res.LastInsertId()
			} else if err != nil {
				continue
			}
			_, _ = db.Exec(`INSERT INTO books_authors_link (book, author) VALUES (?, ?)`,
				bookID, authorID)
		}
	}
	if lang != "" {
		_, _ = db.Exec(`DELETE FROM books_languages_link WHERE book = ?`, bookID)
		var langID int64
		err := db.QueryRow(`SELECT id FROM languages WHERE lang_code = ? LIMIT 1`, lang).Scan(&langID)
		if err == sql.ErrNoRows {
			if res, insErr := db.Exec(`INSERT INTO languages (lang_code) VALUES (?)`, lang); insErr == nil {
				langID, _ = res.LastInsertId()
			}
		}
		if langID != 0 {
			_, _ = db.Exec(`INSERT INTO books_languages_link (book, lang_code, item_order)
				VALUES (?, ?, 0)`, bookID, langID)
		}
	}
}

// UserEpubBeautifyRunHandler 对应 UserEpubBeautifyRun（@js @is_admin）。
//
// 美化并生成新书；原书零改动，故无覆盖写回与回滚。
func UserEpubBeautifyRunHandler(cfg BookToolsConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		req, err := pluginBody(ctx)
		if err != nil {
			return toolError(err), nil
		}
		bookID, err := toolBookID(req)
		if err != nil {
			return toolError(err), nil
		}
		_, src, err := cfg.epubBeautifySource(ctx, bookID)
		if err != nil {
			return toolError(err), nil
		}
		rt, connection, err := cfg.toolRuntime(ctx, EpubBeautifyRoute)
		if err != nil {
			return toolError(err), nil
		}
		timeout := 600.0

		return cfg.toolRunWrite(ctx, rt, connection, "apply",
			epubBeautifyInput(req, src), map[string]any{
				"book_id": bookID, "format": "EPUB",
				"preset": pluginStr(req["preset"]), "output_mode": "new",
			}, &timeout, func(value map[string]any) (map[string]any, string, error) {
				suffix := strings.TrimSpace(pluginStr(req["suffix"]))
				if suffix == "" {
					suffix = EpubBeautifySuffix
				}
				newID, err := booktools.ImportAsNewBook(ctx.DB, bookID, pluginStr(value["path"]),
					booktools.ImportOptions{TitleSuffix: suffix, CollectorID: ctx.Identity.UserID})
				if err != nil {
					return nil, "", err
				}
				return map[string]any{
					"err":         "ok",
					"path":        pluginStr(value["path"]),
					"format":      "EPUB",
					"preset":      value["preset"],
					"stats":       value["stats"],
					"output_mode": "new",
					"book_id":     newID,
				}, "", nil
			})
	}
}

// epubBeautifyInput 复刻 plugin_booktools._epub_beautify_input。
//
// 只做形状转换，参数合法性由 provider 校验。
func epubBeautifyInput(req map[string]any, src string) map[string]any {
	tocStyle := pluginStr(req["toc_style"])
	if tocStyle == "" {
		tocStyle = "elegant"
	}
	useSystemFonts := true
	if v, present := req["use_system_fonts"]; present {
		useSystemFonts = pluginBool(v)
	}
	noteMark := pluginStr(req["note_mark"])
	if noteMark == "" {
		noteMark = "orig"
	}
	return map[string]any{
		"path":              src,
		"format":            "EPUB",
		"preset":            pluginStr(req["preset"]),
		"toc_style":         tocStyle,
		"use_system_fonts":  useSystemFonts,
		"font_overrides":    req["font_overrides"],
		"toc_depth":         req["toc_depth"],
		"cleanup":           req["cleanup"],
		"palette_overrides": req["palette_overrides"],
		"page_tint":         req["page_tint"],
		"bg_texture":        pluginStr(req["bg_texture"]),
		"dialogue":          pluginBool(req["dialogue"]),
		"title_split":       pluginBool(req["title_split"]),
		"toc_columns":       pluginBool(req["toc_columns"]),
		"para_mode":         req["para_mode"],
		"para_indent":       req["para_indent"],
		"para_gap":          req["para_gap"],
		"notes":             pluginBool(req["notes"]),
		"note_mark":         noteMark,
	}
}

// toolRecordDict 把 provider 返回值规整成字典。
func toolRecordDict(value any) map[string]any {
	switch v := value.(type) {
	case nil:
		return map[string]any{}
	case map[string]any:
		return v
	case plugindomain.DomainRecord:
		out := map[string]any{}
		for k, val := range v.Values {
			out[k] = val
		}
		return out
	case interface{ ToDict() map[string]any }:
		return v.ToDict()
	}
	return map[string]any{}
}

// BookToolsRouteSpecs 返回内置文本工具模块接管的 10 条路由。
func BookToolsRouteSpecs(cfg BookToolsConfig) []RouteSpec {
	methods := []string{http.MethodGet, http.MethodPost}
	return []RouteSpec{
		{Pattern: "/api/plugins/tools/book-actions", Methods: methods, Auth: true, Admin: true, Handler: AdminBookToolActionsHandler(cfg)},
		{Pattern: "/api/plugins/tools/books", Methods: methods, Auth: true, Handler: UserBookToolsBooksHandler(cfg)},
		{Pattern: "/api/plugins/tools/text-replace/preview", Methods: methods, Auth: true, Handler: UserTextReplacePreviewHandler(cfg)},
		{Pattern: "/api/plugins/tools/text-replace/run", Methods: methods, Auth: true, Admin: true, Handler: UserTextReplaceRunHandler(cfg)},
		{Pattern: "/api/plugins/tools/txt-fixer/analyze", Methods: methods, Auth: true, Handler: UserTxtFixerAnalyzeHandler(cfg)},
		{Pattern: "/api/plugins/tools/txt-fixer/run", Methods: methods, Auth: true, Admin: true, Handler: UserTxtFixerRunHandler(cfg)},
		{Pattern: "/api/plugins/tools/zh-converter/run", Methods: methods, Auth: true, Admin: true, Handler: UserZhConverterRunHandler(cfg)},
		{Pattern: "/api/plugins/tools/epub-beautify/presets", Methods: methods, Auth: true, Handler: UserEpubBeautifyPresetsHandler(cfg)},
		{Pattern: "/api/plugins/tools/epub-beautify/preview", Methods: methods, Auth: true, Handler: UserEpubBeautifyPreviewHandler(cfg)},
		{Pattern: "/api/plugins/tools/epub-beautify/run", Methods: methods, Auth: true, Admin: true, Handler: UserEpubBeautifyRunHandler(cfg)},
	}
}
