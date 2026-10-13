// 本文件实现 webserver/handlers/network_library.py 的 22 条路由。
//
// 网络书库（普通用户）：搜索 / 发现 / 详情 / 目录 / 正文 / 保存。
//
// 路由分两组：标准入口 /api/book-sources/*，以及一版过渡期的兼容别名
// /api/network/*（D-14）。两组指向同一批 handler。
package httpapi

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"talebook/booksvr/internal/background"
	"talebook/booksvr/internal/booksource"
	"talebook/booksvr/internal/booksourcesearch"
	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginruntime"
	"talebook/booksvr/internal/sourcecatalog"
	"talebook/booksvr/internal/userdb"
)

// 网络书库错误码。
const (
	ErrParamsError    = "params.error"
	ErrParamsNotFound = "params.not_found"
	ErrTaskNotFound   = "task.not_found"
	ErrSourceJS       = "source.js_unsupported"
	ErrSourceFetch    = "source.fetch_failed"
	ErrNotPermit      = "permission.not_permit"
)

// VeneraPluginKey 是唯一支持 has_more 语义的书源插件。
const VeneraPluginKey = "talebook.source.venera"

// NetworkConfig 是网络书库 handler 的依赖。
type NetworkConfig struct {
	// Settings 是 Talebook 配置（CONF）。
	Settings map[string]any
	// LibraryRoot 是书库根目录（用于格式路径解析）。
	LibraryRoot string
	// Catalog 构造目录服务；为 nil 时用默认实现。
	Catalog func(ctx *Context) (*sourcecatalog.Service, error)
	// Search 返回搜索任务服务；为 nil 时用全局单例。
	Search func() *booksourcesearch.Service
	// Background 返回后台任务服务；为 nil 时用全局单例。
	Background func() *background.Service
	// SaveOnline 触发「保存到本地」；为 nil 时返回未接线错误。
	SaveOnline func(ctx *Context, sourceKey, bookURL, format string, clean bool, taskID int64) error
	// ComicCoverRewriter 改写漫画条目的 cover_url 为签名图片地址。
	//
	// 对应 network_comic.comic_book；未注入时原样返回（非漫画条目行为一致）。
	ComicCoverRewriter func(ctx *Context, book map[string]any, sourceKey string) map[string]any
}

// networkCatalog 构造目录服务。
func (cfg NetworkConfig) networkCatalog(ctx *Context) (*sourcecatalog.Service, error) {
	if cfg.Catalog != nil {
		return cfg.Catalog(ctx)
	}
	rt := pluginruntime.NewRuntime(ctx.DB, cfg.Settings, nil)
	return sourcecatalog.NewService(ctx.DB, cfg.Settings, ctx.Identity.UserID, rt)
}

// searchService 返回搜索任务服务。
func (cfg NetworkConfig) searchService() *booksourcesearch.Service {
	if cfg.Search != nil {
		return cfg.Search()
	}
	return booksourcesearch.Instance()
}

// backgroundService 返回后台任务服务。
func (cfg NetworkConfig) backgroundService() *background.Service {
	if cfg.Background != nil {
		return cfg.Background()
	}
	return background.Instance()
}

// engineConfig 复刻 network_library.engine_config。
func (cfg NetworkConfig) engineConfig() map[string]any {
	return map[string]any{
		"BOOKSOURCE_HTTP_TIMEOUT":      settingOr(cfg.Settings, "BOOKSOURCE_HTTP_TIMEOUT", 20),
		"BOOKSOURCE_MAX_TOC_PAGES":     settingOr(cfg.Settings, "BOOKSOURCE_MAX_TOC_PAGES", 30),
		"BOOKSOURCE_MAX_CONTENT_PAGES": settingOr(cfg.Settings, "BOOKSOURCE_MAX_CONTENT_PAGES", 20),
		"BOOKSOURCE_AD_PATTERNS":       settingOr(cfg.Settings, "BOOKSOURCE_AD_PATTERNS", []any{}),
		"BOOKSOURCE_CLEAN_ENABLED":     settingOr(cfg.Settings, "BOOKSOURCE_CLEAN_ENABLED", true),
	}
}

// settingOr 取设置项，缺失时返回默认值。
func settingOr(settings map[string]any, key string, fallback any) any {
	if v, ok := settings[key]; ok && v != nil {
		return v
	}
	return fallback
}

// getSource 按 source_id 取绑定；不存在返回 nil（不报错）。
func (cfg NetworkConfig) getSource(ctx *Context, sourceID string) (*sourcecatalog.SourceBinding, error) {
	catalog, err := cfg.networkCatalog(ctx)
	if err != nil {
		return nil, err
	}
	binding, err := catalog.Get(sourceID)
	if err != nil {
		// Python 捕获 PluginRuntimeError 后返回 None。
		if pluginruntime.ErrorCodeOf(err) == "source.not_found" {
			return nil, nil
		}
		return nil, err
	}
	return binding, nil
}

// publicBook 复刻 NetworkBaseHandler.public_book。
//
// Python 委托给 network_comic.comic_book：当条目是漫画且可在线阅读时，
// 把 cover_url 改写为带签名 token 的 /api/book-sources/comic/image 地址。
//
// 该改写依赖 network_comic.py 的 public_image（签名 token + 图片域名白名单），
// 尚未移植。因此这里在未注入 ComicCoverRewriter 时原样返回 —— 对非漫画条目
// 与 Python 行为一致；漫画条目的封面改写待 network_comic 移植时接入。
func (cfg NetworkConfig) publicBook(ctx *Context, book map[string]any, sourceKey string) map[string]any {
	if cfg.ComicCoverRewriter == nil {
		return book
	}
	return cfg.ComicCoverRewriter(ctx, book, sourceKey)
}

// intArg 复刻 `_int(value, default)`。
func intArg(value string, fallback int) int {
	n, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil {
		return fallback
	}
	return n
}

// ---- 各 handler ----

// NetworkSourcesHandler 对应 NetworkSources。
func NetworkSourcesHandler(cfg NetworkConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		catalog, err := cfg.networkCatalog(ctx)
		if err != nil {
			return nil, err
		}
		bindings, err := catalog.Bindings()
		if err != nil {
			return nil, err
		}
		items := make([]map[string]any, 0, len(bindings))
		for _, b := range bindings {
			items = append(items, b.ToPublicDict())
		}
		availability, err := catalog.Availability(bindings)
		if err != nil {
			return nil, err
		}
		return map[string]any{"err": "ok", "items": items, "availability": availability}, nil
	}
}

// NetworkSearchHandler 对应 NetworkSearch：创建搜索任务，立即返回 task_id。
func NetworkSearchHandler(cfg NetworkConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		key := strings.TrimSpace(ctx.Query("key"))
		if key == "" {
			return map[string]any{"err": ErrParamsError, "msg": "请输入搜索关键字"}, nil
		}
		page := intArg(ctx.Query("page"), 1)
		ids := ctx.Query("sources")
		group := strings.TrimSpace(ctx.Query("group"))
		mode := ctx.Query("mode")
		if mode == "" {
			mode = "top"
		}

		catalog, err := cfg.networkCatalog(ctx)
		if err != nil {
			return nil, err
		}
		all, err := catalog.Bindings()
		if err != nil {
			return nil, err
		}
		var bindings []*sourcecatalog.SourceBinding
		for _, b := range all {
			if containsStr(b.Capabilities, "sources.search") {
				bindings = append(bindings, b)
			}
		}

		var sources []*sourcecatalog.SourceBinding
		switch {
		case ids != "":
			selected := map[string]bool{}
			for _, part := range strings.Split(ids, ",") {
				if p := strings.TrimSpace(part); p != "" {
					selected[p] = true
				}
			}
			for _, b := range bindings {
				if selected[b.Key] || (b.LegacyID != nil && selected[strconv.FormatInt(*b.LegacyID, 10)]) {
					sources = append(sources, b)
				}
			}
		case group != "":
			for _, b := range bindings {
				if b.Group == group {
					sources = append(sources, b)
				}
			}
		case mode == "all":
			sources = bindings
		default:
			topK := toIntSetting(cfg.Settings, "BOOKSOURCE_SEARCH_TOP_K", 50)
			if topK < len(bindings) {
				sources = bindings[:topK]
			} else {
				sources = bindings
			}
		}

		if len(sources) == 0 {
			return map[string]any{"err": "ok", "task_id": "", "total": 0, "mode": mode}, nil
		}

		items, err := prepareSearch(cfg, catalog, sources, ctx)
		if err != nil {
			return nil, err
		}
		svc := cfg.searchService()
		svc.Configure(catalog.SearchConcurrency(sources))
		taskID, total := svc.CreateTask(key, page, items)
		return map[string]any{"err": "ok", "mode": mode, "task_id": taskID, "total": total}, nil
	}
}

// prepareSearch 把绑定转换为可并发执行的搜索单元。
//
// 每个 binding 的 Call 只做网络 I/O，不访问数据库 session。
func prepareSearch(cfg NetworkConfig, catalog *sourcecatalog.Service,
	sources []*sourcecatalog.SourceBinding, ctx *Context) ([]booksourcesearch.SourceItem, error) {
	items := make([]booksourcesearch.SourceItem, 0, len(sources))
	for _, b := range sources {
		binding := b
		connID := binding.Connection.ID
		items = append(items, booksourcesearch.SourceItem{
			SourceID:     binding.Key,
			SourceName:   binding.Name,
			ConnectionID: &connID,
			LegacyID:     legacyIDOf(binding),
			Call: func(query string, page int) ([]map[string]any, error) {
				result, err := catalog.Read(binding, "search", []any{query, map[string]any{"page": page}}, nil, nil)
				if err != nil {
					return nil, err
				}
				return pageItemsToDicts(result)
			},
		})
	}
	return items, nil
}

// legacyIDOf 取绑定的 legacy_id（无则返回 nil）。
func legacyIDOf(b *sourcecatalog.SourceBinding) any {
	if b.LegacyID == nil {
		return nil
	}
	return *b.LegacyID
}

// pageItemsToDicts 把 Page 结果转成字典列表。
func pageItemsToDicts(result any) ([]map[string]any, error) {
	page, ok := result.(*plugindomain.Page)
	if !ok {
		return nil, pluginruntime.NewPluginRuntimeError("plugin.provider_contract",
			"Paged provider returned an invalid result", false)
	}
	out := make([]map[string]any, 0, len(page.Items))
	for _, item := range page.Items {
		if d, ok := item.(map[string]any); ok {
			out = append(out, d)
			continue
		}
		if toDict, ok := item.(interface{ ToDict() map[string]any }); ok {
			out = append(out, toDict.ToDict())
		}
	}
	return out, nil
}

// NetworkSearchStatusHandler 对应 NetworkSearchStatus。
func NetworkSearchStatusHandler(cfg NetworkConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		taskID := ctx.Query("task_id")
		if taskID == "" {
			return map[string]any{"err": ErrParamsError, "msg": "缺少 task_id"}, nil
		}
		svc := cfg.searchService()
		status := svc.GetStatus(taskID)
		if status == nil {
			return map[string]any{"err": ErrTaskNotFound, "msg": "搜索任务不存在或已过期"}, nil
		}

		// 后台独立 session 收口失败时，当前请求 session 是可靠的重试通道。
		// 只有 durable run 持久化成功才标 settled。
		if status.Done >= status.Total {
			rt := pluginruntime.NewRuntime(ctx.DB, cfg.Settings, nil)
			for _, update := range svc.PopRuntimeUpdates(taskID) {
				if err := finishReadBatch(rt, update); err != nil {
					svc.SettleRuntimeUpdate(taskID, update.RunID, false)
					return nil, err
				}
				svc.SettleRuntimeUpdate(taskID, update.RunID, true)
			}
			status = svc.GetStatus(taskID)
		}

		// 任务完成后给「有结果」的源权重 +1（只结算一次）。
		if status.Finished {
			hitIDs := svc.PopWeightUpdates(taskID)
			if len(hitIDs) > 0 {
				if err := bumpSourceWeights(ctx.DB, hitIDs); err != nil {
					return nil, err
				}
			}
			for _, update := range svc.PopHealthUpdates(taskID) {
				health := "degraded"
				if update.Healthy {
					health = "healthy"
				}
				message := update.Message
				if len(message) > 500 {
					message = message[:500]
				}
				if err := updateConnectionHealth(ctx.DB, update.ConnectionID, health, message); err != nil {
					return nil, err
				}
			}
		}

		// 给每个结果分组补上公开书籍字段。
		for _, group := range status.Results {
			books, _ := group["books"].([]map[string]any)
			sourceID, _ := group["source_id"].(string)
			converted := make([]map[string]any, 0, len(books))
			for _, book := range books {
				converted = append(converted, cfg.publicBook(ctx, book, sourceID))
			}
			group["books"] = converted
		}

		return map[string]any{
			"err":      "ok",
			"task_id":  status.TaskID,
			"total":    status.Total,
			"done":     status.Done,
			"finished": status.Finished,
			"results":  status.Results,
			"partial":  status.Partial,
			"pending":  status.Pending,
		}, nil
	}
}

// finishReadBatch 收口一次审计批次。
func finishReadBatch(rt *pluginruntime.Runtime, update booksourcesearch.RuntimeUpdate) error {
	if update.Batch == nil || update.Batch.Finalize == nil {
		return nil
	}
	return update.Batch.Finalize(update.Batch, update.Outcomes)
}

// bumpSourceWeights 给命中书源的权重 +1。
func bumpSourceWeights(db *sql.DB, hitIDs []any) error {
	if len(hitIDs) == 0 {
		return nil
	}
	placeholders := make([]string, 0, len(hitIDs))
	args := make([]any, 0, len(hitIDs))
	for _, id := range hitIDs {
		placeholders = append(placeholders, "?")
		args = append(args, id)
	}
	query := fmt.Sprintf(`UPDATE book_sources SET weight = weight + 1 WHERE id IN (%s)`,
		strings.Join(placeholders, ","))
	_, err := db.Exec(query, args...)
	return err
}

// updateConnectionHealth 更新插件连接的 health。
func updateConnectionHealth(db *sql.DB, connectionID int64, health, message string) error {
	_, err := db.Exec(`UPDATE plugin_connections
		SET health = ?, health_message = ?, update_time = ? WHERE id = ?`,
		health, message, nowString(), connectionID)
	return err
}

// NetworkExploreHandler 对应 NetworkExplore。
func NetworkExploreHandler(cfg NetworkConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		source, err := cfg.getSource(ctx, ctx.Query("source_id"))
		if err != nil {
			return nil, err
		}
		if source == nil {
			return map[string]any{"err": ErrParamsNotFound, "msg": "书源不存在或未启用"}, nil
		}
		categoryID := strings.TrimSpace(ctx.Query("url"))
		if categoryID == "" {
			return map[string]any{"err": ErrParamsError, "msg": "缺少发现页 URL"}, nil
		}
		page := intArg(ctx.Query("page"), 1)

		catalog, err := cfg.networkCatalog(ctx)
		if err != nil {
			return nil, err
		}
		result, err := catalog.Read(source, "browse",
			[]any{categoryID, map[string]any{"page": page}}, nil, nil)
		if err != nil {
			if isJSRuleUnsupported(err) {
				return map[string]any{"err": ErrSourceJS, "msg": "该书源依赖 JS，暂不支持"}, nil
			}
			return nil, err
		}
		pg, ok := result.(*plugindomain.Page)
		if !ok {
			return nil, pluginruntime.NewPluginRuntimeError("plugin.provider_contract",
				"Paged provider returned an invalid result", false)
		}

		books := make([]map[string]any, 0, len(pg.Items))
		for _, item := range pg.Items {
			books = append(books, cfg.publicBook(ctx, itemToDict(item), source.Key))
		}

		// has_more 只对 venera 有意义；其他书源返回 null。
		var hasMore any
		if source.PluginKey == VeneraPluginKey {
			hasMore = pg.HasMore
		}
		return map[string]any{
			"err":         "ok",
			"books":       books,
			"has_more":    hasMore,
			"next_cursor": pg.NextCursor,
		}, nil
	}
}

// NetworkCategoriesHandler 对应 NetworkCategories。
func NetworkCategoriesHandler(cfg NetworkConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		source, err := cfg.getSource(ctx, ctx.Query("source_id"))
		if err != nil {
			return nil, err
		}
		if source == nil {
			return map[string]any{"err": ErrParamsNotFound, "msg": "书源不存在或未启用"}, nil
		}
		catalog, err := cfg.networkCatalog(ctx)
		if err != nil {
			return nil, err
		}
		result, err := catalog.Read(source, "get_categories", nil, nil, nil)
		if err != nil {
			return nil, err
		}
		categories, ok := result.([]plugindomain.Category)
		if !ok {
			return nil, pluginruntime.NewPluginRuntimeError("plugin.provider_contract",
				"Provider returned an invalid result", false)
		}
		items := make([]map[string]any, 0, len(categories))
		for _, item := range categories {
			entry := item.ToDict()
			entry["name"] = item.Name
			entry["url"] = item.ID
			items = append(items, entry)
		}
		return map[string]any{"err": "ok", "items": items}, nil
	}
}

// NetworkBookHandler 对应 NetworkBook。
func NetworkBookHandler(cfg NetworkConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		source, err := cfg.getSource(ctx, ctx.Query("source_id"))
		if err != nil {
			return nil, err
		}
		if source == nil {
			return map[string]any{"err": ErrParamsNotFound, "msg": "书源不存在或未启用"}, nil
		}
		bookURL := strings.TrimSpace(ctx.Query("book_url"))
		if bookURL == "" {
			return map[string]any{"err": ErrParamsError, "msg": "缺少书籍 URL"}, nil
		}
		catalog, err := cfg.networkCatalog(ctx)
		if err != nil {
			return nil, err
		}
		result, err := catalog.Read(source, "get_book", []any{bookURL}, nil, nil)
		if err != nil {
			return map[string]any{"err": errorCodeOr(err, ErrSourceFetch), "msg": err.Error()}, nil
		}
		detail, ok := result.(*plugindomain.SourceBookDetail)
		if !ok {
			return nil, pluginruntime.NewPluginRuntimeError("plugin.provider_contract",
				"Provider returned an invalid result", false)
		}
		return map[string]any{
			"err":           "ok",
			"book":          cfg.publicBook(ctx, detail.ToDict(), source.Key),
			"toc_url":       detail.TOCRef,
			"download_mode": source.DownloadMode,
		}, nil
	}
}

// NetworkTocHandler 对应 NetworkToc。
func NetworkTocHandler(cfg NetworkConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		source, err := cfg.getSource(ctx, ctx.Query("source_id"))
		if err != nil {
			return nil, err
		}
		if source == nil {
			return map[string]any{"err": ErrParamsNotFound, "msg": "书源不存在或未启用"}, nil
		}
		bookURL := strings.TrimSpace(ctx.Query("book_url"))
		catalog, err := cfg.networkCatalog(ctx)
		if err != nil {
			return nil, err
		}

		var detail *plugindomain.SourceBookDetail
		if bookURL != "" {
			result, err := catalog.Read(source, "get_book", []any{bookURL}, nil, nil)
			if err != nil {
				return map[string]any{"err": errorCodeOr(err, ErrSourceFetch), "msg": err.Error()}, nil
			}
			d, ok := result.(*plugindomain.SourceBookDetail)
			if !ok {
				return nil, pluginruntime.NewPluginRuntimeError("plugin.provider_contract",
					"Provider returned an invalid result", false)
			}
			detail = d
		} else {
			tocURL := strings.TrimSpace(ctx.Query("toc_url"))
			if tocURL == "" {
				return map[string]any{"err": ErrParamsError, "msg": "缺少目录 URL"}, nil
			}
			detail = &plugindomain.SourceBookDetail{TOCRef: tocURL}
		}

		result, err := catalog.Read(source, "get_toc", []any{detail}, nil, nil)
		if err != nil {
			return map[string]any{"err": errorCodeOr(err, ErrSourceFetch), "msg": err.Error()}, nil
		}
		chapters, ok := result.([]plugindomain.SourceChapter)
		if !ok {
			return nil, pluginruntime.NewPluginRuntimeError("plugin.provider_contract",
				"Provider returned an invalid result", false)
		}

		status := "unknown"
		if v, ok := detail.Extra["serialize_status"].(string); ok && v != "" {
			status = v
		}
		out := make([]map[string]any, 0, len(chapters))
		for _, c := range chapters {
			out = append(out, c.ToDict())
		}
		return map[string]any{"err": "ok", "chapters": out, "serialize_status": status}, nil
	}
}

// NetworkContentHandler 对应 NetworkContent。
func NetworkContentHandler(cfg NetworkConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if ctx.Identity.UserID != 0 && !ctx.CanRead() {
			return map[string]any{"err": ErrNotPermit, "msg": "无阅读权限"}, nil
		}
		source, err := cfg.getSource(ctx, ctx.Query("source_id"))
		if err != nil {
			return nil, err
		}
		if source == nil {
			return map[string]any{"err": ErrParamsNotFound, "msg": "书源不存在或未启用"}, nil
		}
		chapterURL := strings.TrimSpace(ctx.Query("chapter_url"))
		if chapterURL == "" {
			return map[string]any{"err": ErrParamsError, "msg": "缺少章节 URL"}, nil
		}
		title := ctx.Query("title")
		clean := ctx.Query("clean")
		if clean == "" {
			clean = "1"
		}
		doClean := clean == "1" || clean == "true"

		catalog, err := cfg.networkCatalog(ctx)
		if err != nil {
			return nil, err
		}
		chapter := plugindomain.SourceChapter{ExternalID: chapterURL, Title: title}
		result, err := catalog.Read(source, "get_chapter", []any{chapter}, nil,
			map[string]any{"clean": doClean})
		if err != nil {
			return map[string]any{"err": errorCodeOr(err, ErrSourceFetch), "msg": err.Error()}, nil
		}
		content, ok := result.(*plugindomain.SourceContent)
		if !ok {
			return nil, pluginruntime.NewPluginRuntimeError("plugin.provider_contract",
				"Provider returned an invalid result", false)
		}
		outTitle := content.Title
		if outTitle == "" {
			outTitle = title
		}
		return map[string]any{"err": "ok", "title": outTitle, "content": content.Content}, nil
	}
}

// NetworkSaveHandler 对应 NetworkSave：把网络小说保存到本地书库（后台任务）。
func NetworkSaveHandler(cfg NetworkConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if ctx.Identity.UserID != 0 && !ctx.CanSave() {
			return map[string]any{"err": ErrNotPermit, "msg": "无保存权限"}, nil
		}
		var req map[string]any
		if err := json.Unmarshal(ctx.Body(), &req); err != nil {
			return map[string]any{"err": ErrParamsError, "msg": "请求体不是合法 JSON"}, nil
		}
		sourceID := asStringAny(req["source_id"])
		source, err := cfg.getSource(ctx, sourceID)
		if err != nil {
			return nil, err
		}
		if source == nil {
			return map[string]any{"err": ErrParamsNotFound, "msg": "书源不存在或未启用"}, nil
		}
		bookURL := strings.TrimSpace(asStringAny(req["book_url"]))
		if bookURL == "" {
			return map[string]any{"err": ErrParamsError, "msg": "缺少书籍 URL"}, nil
		}
		format := asStringAny(req["fmt"])
		if format == "" {
			format = "txt"
		}
		if format != "txt" && format != "epub" {
			return map[string]any{"err": ErrParamsError, "msg": "仅支持 txt / epub"}, nil
		}
		clean := true
		if v, ok := req["clean"].(bool); ok {
			clean = v
		}

		tag := booksource.MakeTag(sourceID, bookURL)
		bg := cfg.backgroundService()

		// 去重：同一本书已有运行中的保存任务则直接复用，避免并发重复整本抓取。
		if existing := bg.GetTaskByTag(tag); existing != nil && existing["status"] == background.StatusRunning {
			return map[string]any{"err": "ok", "tag": tag, "msg": "该书籍正在保存中"}, nil
		}

		// 在请求线程里同步创建任务，保证前端随后轮询时任务已存在（消除注册竞态）。
		title := source.Name
		if len([]rune(title)) > 20 {
			title = string([]rune(title)[:20])
		}
		task := bg.AddTask(background.ServiceTypeOnlineSave, "[online]"+title, 0, tag)
		var taskID int64
		if task != nil {
			taskID = task.ID
		}

		if cfg.SaveOnline == nil {
			return map[string]any{"err": "plugin.provider_unavailable",
				"msg": "保存服务未接线"}, nil
		}
		if err := cfg.SaveOnline(ctx, source.Key, bookURL, format, clean, taskID); err != nil {
			return nil, err
		}
		return map[string]any{"err": "ok", "tag": tag, "msg": "已开始后台保存，完成后将通知您"}, nil
	}
}

// NetworkSaveStatusHandler 对应 NetworkSaveStatus。
func NetworkSaveStatusHandler(cfg NetworkConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		sourceID := ctx.Query("source_id")
		bookURL := strings.TrimSpace(ctx.Query("book_url"))
		if sourceID == "" || bookURL == "" {
			return map[string]any{"err": ErrParamsError, "msg": "缺少 source_id 或 book_url"}, nil
		}

		tag := booksource.MakeTag(sourceID, bookURL)
		task := cfg.backgroundService().GetTaskByTag(tag)
		if task == nil {
			return map[string]any{"err": "ok", "found": false}, nil
		}

		data, _ := task["progress_data"].(map[string]any)
		if data == nil {
			data = map[string]any{}
		}
		errMsg, _ := task["error_message"].(string)
		return map[string]any{
			"err":      "ok",
			"found":    true,
			"status":   task["status"],
			"progress": intOrZero(task["progress"]),
			"done":     intOrZero(data["done"]),
			"total":    intOrZero(data["total"]),
			"book_id":  intOrZero(data["book_id"]),
			"error":    errMsg,
		}, nil
	}
}

// NetworkLibraryOnlineHandler 对应 NetworkLibraryOnline：本地已保存的网络书列表。
func NetworkLibraryOnlineHandler(cfg NetworkConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		status := ctx.Query("status")

		query := `SELECT book_id, COALESCE(serialize_status,'') FROM online_book_meta`
		var args []any
		if status == userdb.SerializeStatusSerial || status == userdb.SerializeStatusFinished ||
			status == userdb.SerializeStatusUnknown {
			query += ` WHERE serialize_status = ?`
			args = append(args, status)
		}
		rows, err := ctx.DB.Query(query, args...)
		if err != nil {
			return nil, err
		}
		defer rows.Close()

		statusMap := map[int64]string{}
		for rows.Next() {
			var (
				bookID int64
				st     string
			)
			if err := rows.Scan(&bookID, &st); err != nil {
				return nil, err
			}
			statusMap[bookID] = st
		}
		if err := rows.Err(); err != nil {
			return nil, err
		}
		if err := rows.Close(); err != nil {
			return nil, err
		}

		ids := make([]int64, 0, len(statusMap))
		for id := range statusMap {
			ids = append(ids, id)
		}
		sortInt64Desc(ids)

		rsp, err := renderBookList(ctx, cfg, nil, ids, "网络书库", true)
		if err != nil {
			return nil, err
		}
		books, _ := rsp["books"].([]map[string]any)
		for _, book := range books {
			id := int64(intOrZero(book["id"]))
			st := statusMap[id]
			if st == "" {
				st = userdb.SerializeStatusUnknown
			}
			book["serialize_status"] = st
		}
		return rsp, nil
	}
}

// NetworkStatusHandler 对应 NetworkStatus：读取 / 修改本地网络书的连载状态。
func NetworkStatusHandler(cfg NetworkConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if ctx.Request.Method == http.MethodPost {
			return networkStatusPost(ctx)
		}
		bookID := int64(intArg(ctx.Query("book_id"), 0))
		meta, err := userdb.GetOnlineBookMeta(ctx.DB, bookID)
		if err != nil {
			return nil, err
		}
		if meta == nil {
			return map[string]any{"err": "ok", "meta": nil}, nil
		}
		return map[string]any{"err": "ok", "meta": meta.ToDict()}, nil
	}
}

// networkStatusPost 处理连载状态修改。
func networkStatusPost(ctx *Context) (map[string]any, error) {
	var req map[string]any
	if err := json.Unmarshal(ctx.Body(), &req); err != nil {
		return map[string]any{"err": ErrParamsError, "msg": "请求体不是合法 JSON"}, nil
	}
	bookID := int64(intOrZero(req["book_id"]))
	status := asStringAny(req["serialize_status"])
	if status != userdb.SerializeStatusSerial && status != userdb.SerializeStatusFinished &&
		status != userdb.SerializeStatusUnknown {
		return map[string]any{"err": ErrParamsError, "msg": "非法的连载状态"}, nil
	}

	meta, err := userdb.GetOnlineBookMeta(ctx.DB, bookID)
	if err != nil {
		return nil, err
	}
	if meta == nil {
		return map[string]any{"err": ErrParamsNotFound, "msg": "该书不是网络书或未保存"}, nil
	}
	if _, err := ctx.DB.Exec(`UPDATE online_book_meta
		SET serialize_status = ?, status_manual = 1, update_time = ?
		WHERE book_id = ?`, status, nowString(), bookID); err != nil {
		return nil, err
	}
	meta.SerializeStatus = status
	meta.StatusManual = true
	return map[string]any{"err": "ok", "meta": meta.ToDict()}, nil
}

// ---- 列表渲染 ----

// renderBookList 复刻 BaseHandler.render_book_list。
//
// ids 非空时按 id 取书（并过滤私有书）；否则使用传入的 allBooks。
func renderBookList(ctx *Context, cfg NetworkConfig, allBooks []map[string]any,
	ids []int64, title string, sortByID bool) (map[string]any, error) {
	start := intArg(ctx.Query("start"), 0)
	if start < 0 {
		start = 0
	}
	maxSize := toIntSetting(cfg.Settings, "DEFAULT_PAGE_SIZE", 60)
	if maxSize < 60 {
		maxSize = 60
	}
	size := maxSize
	if raw := ctx.Query("size"); raw != "" {
		if n, err := strconv.Atoi(strings.TrimSpace(raw)); err == nil {
			size = n
		}
	}
	delta := size
	if delta < 1 {
		delta = 1
	}
	if delta > maxSize {
		delta = maxSize
	}

	privateIDs, err := privateBookIDs(ctx)
	if err != nil {
		return nil, err
	}

	var (
		count int
		books []map[string]any
	)
	if len(ids) > 0 {
		filtered := make([]int64, 0, len(ids))
		for _, id := range ids {
			if !privateIDs[id] {
				filtered = append(filtered, id)
			}
		}
		count = len(filtered)
		page := sliceInt64(filtered, start, start+delta)
		books, err = loadFormattedBooks(ctx, cfg, page)
		if err != nil {
			return nil, err
		}
		if sortByID {
			// 归一化，按照 id 从大到小排列。
			sortBooksByIDDesc(books)
		}
	} else {
		visible := make([]map[string]any, 0, len(allBooks))
		for _, b := range allBooks {
			if !privateIDs[int64(intOrZero(b["id"]))] {
				visible = append(visible, b)
			}
		}
		count = len(visible)
		books = sliceMaps(visible, start, start+delta)
	}

	books, err = attachReadingStates(ctx, books)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"err":   "ok",
		"title": title,
		"total": count,
		"books": books,
	}, nil
}

// privateBookIDs 复刻 `_get_private_book_ids`：返回当前用户无权查看的私有书 id 集合。
func privateBookIDs(ctx *Context) (map[int64]bool, error) {
	out := map[int64]bool{}
	if ctx.Identity.IsAdmin {
		return out, nil
	}
	var (
		rows *sql.Rows
		err  error
	)
	if ctx.Identity.UserID != 0 {
		rows, err = ctx.DB.Query(`SELECT book_id FROM items
			WHERE scope = 'private' AND collector_id != ?`, ctx.Identity.UserID)
	} else {
		rows, err = ctx.DB.Query(`SELECT book_id FROM items WHERE scope = 'private'`)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out[id] = true
	}
	return out, rows.Err()
}

// loadFormattedBooks 按 id 取书并格式化为公开字典。
func loadFormattedBooks(ctx *Context, cfg NetworkConfig, ids []int64) ([]map[string]any, error) {
	if len(ids) == 0 {
		return []map[string]any{}, nil
	}
	data, err := library.GetBooksData(ctx.DB, ids)
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, 0, len(data))
	for i := range data {
		out = append(out, formatBookData(ctx, cfg, &data[i]))
	}
	return out, nil
}

// formatBookData 把 BookData 格式化为公开字典。
func formatBookData(ctx *Context, cfg NetworkConfig, b *library.BookData) map[string]any {
	formats := make([]string, 0, len(b.Formats))
	for _, f := range b.Formats {
		formats = append(formats, strings.ToUpper(f))
	}
	book := Book{
		ID:               b.ID,
		Title:            b.Title,
		Rating:           float64(b.Rating),
		Authors:          b.Authors,
		AuthorSort:       b.AuthorSort,
		Tags:             b.Tags,
		Publisher:        b.Publisher,
		Comments:         b.Comments,
		Series:           b.Series,
		Language:         b.Language,
		ISBN:             b.ISBN,
		AvailableFormats: formats,
	}
	f := &Formatter{
		Book:    book,
		CDNURL:  ctx.CDNURL,
		APIURL:  ctx.APIURL,
		UserID:  ctx.Identity.UserID,
		IsAdmin: ctx.Identity.IsAdmin,
	}
	return f.Format(false, false)
}

// attachReadingStates 给已格式化的书籍列表附加当前登录用户的阅读状态。
func attachReadingStates(ctx *Context, books []map[string]any) ([]map[string]any, error) {
	if ctx.Identity.UserID == 0 || len(books) == 0 {
		return books, nil
	}
	ids := make([]int64, 0, len(books))
	for _, b := range books {
		ids = append(ids, int64(intOrZero(b["id"])))
	}
	states, err := loadReadingStates(ctx.DB, ctx.Identity.UserID, ids)
	if err != nil {
		return nil, err
	}
	for _, b := range books {
		id := int64(intOrZero(b["id"]))
		b["state"] = formatReadingState(states[id])
	}
	return books, nil
}

// loadReadingStates 批量取阅读状态。
func loadReadingStates(db *sql.DB, readerID int64, ids []int64) (map[int64]*userdb.ReadingState, error) {
	out := map[int64]*userdb.ReadingState{}
	if len(ids) == 0 {
		return out, nil
	}
	placeholders := make([]string, 0, len(ids))
	args := make([]any, 0, len(ids)+1)
	args = append(args, readerID)
	for _, id := range ids {
		placeholders = append(placeholders, "?")
		args = append(args, id)
	}
	// 表名是单数 reading_state（models.py 的 __tablename__）。
	query := fmt.Sprintf(`SELECT book_id, favorite, wants, read_state, progress
		FROM reading_state WHERE reader_id = ? AND book_id IN (%s)`,
		strings.Join(placeholders, ","))
	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var (
			s        userdb.ReadingState
			progress sql.NullString
		)
		if err := rows.Scan(&s.BookID, &s.Favorite, &s.Wants, &s.ReadState, &progress); err != nil {
			return nil, err
		}
		s.Progress = decodeJSONMapOrEmpty(progress.String)
		out[s.BookID] = &s
	}
	return out, rows.Err()
}

// formatReadingState 复刻 utils.ReadingStateFormatter.format_reading_state。
func formatReadingState(s *userdb.ReadingState) map[string]any {
	if s == nil {
		return map[string]any{
			"favorite":   false,
			"wants":      false,
			"read_state": int64(userdb.ReadStateUnread),
			"progress":   map[string]any{},
		}
	}
	return map[string]any{
		"favorite":   s.IsFavorite(),
		"wants":      s.IsWants(),
		"read_state": s.GetReadState(),
		"progress":   s.GetProgress(),
	}
}

// ---- 小工具 ----

// nowString 返回与 Python datetime.now() 对齐的本地时间字符串。
func nowString() string {
	return time.Now().Format("2006-01-02 15:04:05")
}

// decodeJSONMapOrEmpty 把 JSON 文本解成 map；空串或非法内容返回空 map。
func decodeJSONMapOrEmpty(text string) map[string]any {
	text = strings.TrimSpace(text)
	if text == "" || text == "null" {
		return map[string]any{}
	}
	var out map[string]any
	if err := json.Unmarshal([]byte(text), &out); err != nil || out == nil {
		return map[string]any{}
	}
	return out
}

// itemToDict 把 provider 返回的条目转成字典。
func itemToDict(item any) map[string]any {
	if d, ok := item.(map[string]any); ok {
		return d
	}
	if toDict, ok := item.(interface{ ToDict() map[string]any }); ok {
		return toDict.ToDict()
	}
	return map[string]any{}
}

// errorCodeOr 取错误的 code，缺失时用 fallback。
func errorCodeOr(err error, fallback string) string {
	if code := pluginruntime.ErrorCodeOf(err); code != "" && code != "plugin.execution_failed" {
		return code
	}
	return fallback
}

// isJSRuleUnsupported 判断是否为 JS 规则不支持错误。
func isJSRuleUnsupported(err error) bool {
	if err == nil {
		return false
	}
	return strings.Contains(err.Error(), "js_unsupported") ||
		pluginruntime.ErrorCodeOf(err) == "js_unsupported"
}

// containsStr 判断字符串切片是否含目标。
func containsStr(list []string, target string) bool {
	for _, item := range list {
		if item == target {
			return true
		}
	}
	return false
}

// asStringAny 复刻 Python str() 在请求字段上的行为。
func asStringAny(v any) string {
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	return fmt.Sprint(v)
}

// intOrZero 把任意数值转为 int；失败返回 0。
func intOrZero(v any) int {
	switch t := v.(type) {
	case int:
		return t
	case int64:
		return int(t)
	case float64:
		return int(t)
	case string:
		n, err := strconv.Atoi(strings.TrimSpace(t))
		if err != nil {
			return 0
		}
		return n
	}
	return 0
}

// toIntSetting 取整数设置项；缺失或不可解析时返回 fallback。
func toIntSetting(settings map[string]any, key string, fallback int) int {
	v, ok := settings[key]
	if !ok || v == nil {
		return fallback
	}
	switch t := v.(type) {
	case int:
		return t
	case int64:
		return int(t)
	case float64:
		return int(t)
	case string:
		n, err := strconv.Atoi(strings.TrimSpace(t))
		if err != nil {
			return fallback
		}
		return n
	}
	return fallback
}

// sliceInt64 安全切片。
func sliceInt64(list []int64, start, end int) []int64 {
	if start >= len(list) {
		return []int64{}
	}
	if end > len(list) {
		end = len(list)
	}
	if start < 0 {
		start = 0
	}
	if end < start {
		end = start
	}
	return list[start:end]
}

// sliceMaps 安全切片。
func sliceMaps(list []map[string]any, start, end int) []map[string]any {
	if start >= len(list) {
		return []map[string]any{}
	}
	if end > len(list) {
		end = len(list)
	}
	if start < 0 {
		start = 0
	}
	if end < start {
		end = start
	}
	return list[start:end]
}

// sortInt64Desc 按数值倒序。
func sortInt64Desc(list []int64) {
	for i := 1; i < len(list); i++ {
		for j := i; j > 0 && list[j] > list[j-1]; j-- {
			list[j], list[j-1] = list[j-1], list[j]
		}
	}
}

// sortBooksByIDDesc 按 id 倒序。
func sortBooksByIDDesc(books []map[string]any) {
	for i := 1; i < len(books); i++ {
		for j := i; j > 0; j-- {
			cur := int64(intOrZero(books[j]["id"]))
			prev := int64(intOrZero(books[j-1]["id"]))
			if cur > prev {
				books[j], books[j-1] = books[j-1], books[j]
			} else {
				break
			}
		}
	}
}

// NetworkRouteSpecs 返回网络书库模块接管的 22 条路由。
func NetworkRouteSpecs(cfg NetworkConfig) []RouteSpec {
	specs := []RouteSpec{
		{Pattern: rBookSources, Methods: []string{http.MethodGet, http.MethodPost}, Auth: true, Handler: NetworkSourcesHandler(cfg)},
		{Pattern: rBookSourcesSearchStatus, Methods: []string{http.MethodGet, http.MethodPost}, Auth: true, Handler: NetworkSearchStatusHandler(cfg)},
		{Pattern: rBookSourcesSearch, Methods: []string{http.MethodGet, http.MethodPost}, Auth: true, Handler: NetworkSearchHandler(cfg)},
		{Pattern: rBookSourcesBrowse, Methods: []string{http.MethodGet, http.MethodPost}, Auth: true, Handler: NetworkExploreHandler(cfg)},
		{Pattern: rBookSourcesCategories, Methods: []string{http.MethodGet, http.MethodPost}, Auth: true, Handler: NetworkCategoriesHandler(cfg)},
		{Pattern: rBookSourcesBook, Methods: []string{http.MethodGet, http.MethodPost}, Auth: true, Handler: NetworkBookHandler(cfg)},
		{Pattern: rBookSourcesToc, Methods: []string{http.MethodGet, http.MethodPost}, Auth: true, Handler: NetworkTocHandler(cfg)},
		{Pattern: rBookSourcesContent, Methods: []string{http.MethodGet, http.MethodPost}, Auth: true, Handler: NetworkContentHandler(cfg)},
		{Pattern: rBookSourcesSaveStatus, Methods: []string{http.MethodGet, http.MethodPost}, Auth: true, Handler: NetworkSaveStatusHandler(cfg)},
		{Pattern: rBookSourcesSave, Methods: []string{http.MethodGet, http.MethodPost}, Auth: true, Handler: NetworkSaveHandler(cfg)},
		{Pattern: rNetworkSources, Methods: []string{http.MethodGet, http.MethodPost}, Auth: true, Handler: NetworkSourcesHandler(cfg)},
		{Pattern: rNetworkSearchStatus, Methods: []string{http.MethodGet, http.MethodPost}, Auth: true, Handler: NetworkSearchStatusHandler(cfg)},
		{Pattern: rNetworkSearch, Methods: []string{http.MethodGet, http.MethodPost}, Auth: true, Handler: NetworkSearchHandler(cfg)},
		{Pattern: rNetworkExplore, Methods: []string{http.MethodGet, http.MethodPost}, Auth: true, Handler: NetworkExploreHandler(cfg)},
		{Pattern: rNetworkCategories, Methods: []string{http.MethodGet, http.MethodPost}, Auth: true, Handler: NetworkCategoriesHandler(cfg)},
		{Pattern: rNetworkBook, Methods: []string{http.MethodGet, http.MethodPost}, Auth: true, Handler: NetworkBookHandler(cfg)},
		{Pattern: rNetworkToc, Methods: []string{http.MethodGet, http.MethodPost}, Auth: true, Handler: NetworkTocHandler(cfg)},
		{Pattern: rNetworkContent, Methods: []string{http.MethodGet, http.MethodPost}, Auth: true, Handler: NetworkContentHandler(cfg)},
		{Pattern: rNetworkSaveStatus, Methods: []string{http.MethodGet, http.MethodPost}, Auth: true, Handler: NetworkSaveStatusHandler(cfg)},
		{Pattern: rNetworkSave, Methods: []string{http.MethodGet, http.MethodPost}, Auth: true, Handler: NetworkSaveHandler(cfg)},
		{Pattern: rNetworkStatus, Methods: []string{http.MethodGet, http.MethodPost}, Auth: true, Handler: NetworkStatusHandler(cfg)},
		{Pattern: rLibraryOnline, Methods: []string{http.MethodGet, http.MethodPost}, Auth: true, Handler: NetworkLibraryOnlineHandler(cfg)},
	}
	return specs
}

// 路由 pattern 常量。
const (
	rBookSources             = "/api/book-sources"
	rBookSourcesSearchStatus = "/api/book-sources/search/status"
	rBookSourcesSearch       = "/api/book-sources/search"
	rBookSourcesBrowse       = "/api/book-sources/browse"
	rBookSourcesCategories   = "/api/book-sources/categories"
	rBookSourcesBook         = "/api/book-sources/book"
	rBookSourcesToc          = "/api/book-sources/toc"
	rBookSourcesContent      = "/api/book-sources/content"
	rBookSourcesSaveStatus   = "/api/book-sources/save/status"
	rBookSourcesSave         = "/api/book-sources/save"
	rNetworkSources          = "/api/network/sources"
	rNetworkSearchStatus     = "/api/network/search/status"
	rNetworkSearch           = "/api/network/search"
	rNetworkExplore          = "/api/network/explore"
	rNetworkCategories       = "/api/network/categories"
	rNetworkBook             = "/api/network/book"
	rNetworkToc              = "/api/network/toc"
	rNetworkContent          = "/api/network/content"
	rNetworkSaveStatus       = "/api/network/save/status"
	rNetworkSave             = "/api/network/save"
	rNetworkStatus           = "/api/network/status"
	rLibraryOnline           = "/api/library/online"
)
