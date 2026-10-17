package pluginbuiltin

import (
	gocontext "context"
	"database/sql"
	"encoding/json"
	"regexp"

	"talebook/booksvr/internal/booksource"
	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginproto"
	"talebook/booksvr/internal/pluginruntime"
	"talebook/booksvr/internal/safehttp"
	"talebook/booksvr/internal/userdb"
)

// Legado 插件的配置键与默认值（复刻 legado.py 顶部常量）。
const (
	legadoPluginID                    = "talebook.source.legado"
	legadoSearchResultLimitKey        = "search_result_limit"
	legadoSearchConcurrencyKey        = "search_concurrency"
	legadoSaveConcurrencyKey          = "save_concurrency"
	legadoPrivateNetworkProtectionKey = "private_network_protection"
	legadoDefaultSearchResultLimit    = 5
	legadoDefaultSearchConcurrency    = 20
	legadoDefaultSaveConcurrency      = 10
)

// legadoKindSplitRe 复刻 re.split(r"[\s,，、/|]+", kind)。
var legadoKindSplitRe = regexp.MustCompile(`[\s,，、/|]+`)

// legadoCaps 是 Legado 的能力声明：书源 + 元数据，按章节下载。
func legadoCaps() pluginiface.CapabilitySet {
	return pluginiface.CapabilitySet{
		Interfaces:   map[string]bool{"SourceProvider": true, "MetadataProvider": true},
		DownloadMode: pluginiface.DownloadByChapters,
		HasSelfCheck: true,
		HasExecute:   true,
		Methods:      map[string]bool{"get_toc": true, "get_chapter": true},
	}
}

// LegadoProvider 复刻 LegadoProvider：Legado 规则引擎的 SourceProvider 适配器。
type LegadoProvider struct {
	ManifestDict map[string]any
}

// newLegadoProvider 构造 Legado provider。
func newLegadoProvider() *LegadoProvider {
	return &LegadoProvider{ManifestDict: legadoManifest()}
}

// legadoManifest 复刻 LegadoProvider 的完整 manifest。
func legadoManifest() map[string]any {
	return map[string]any{
		"protocol_version": pluginproto.ProtocolVersion,
		"id":               legadoPluginID,
		"name":             "Legado 在线书源",
		"description":      "管理、导入、搜索、阅读并使用兼容 Legado 的在线书源补全书籍信息。",
		"version":          "1.0.0",
		"categories":       []any{"sources", "metadata"},
		"capabilities":     []any{"sources.browse", "sources.search", "sources.acquire", "metadata.lookup"},
		"runtime_kind":     "builtin",
		"actions":          []any{"test"},
		"auth_schema":      map[string]any{"type": "object", "properties": map[string]any{}},
		"config_schema": map[string]any{
			"type": "object",
			"properties": map[string]any{
				legadoSearchResultLimitKey: map[string]any{
					"type": "integer", "minimum": 1, "maximum": 100,
					"default": legadoDefaultSearchResultLimit,
				},
				legadoSearchConcurrencyKey: map[string]any{
					"type": "integer", "minimum": 1, "maximum": 100,
					"default": legadoDefaultSearchConcurrency,
				},
				legadoSaveConcurrencyKey: map[string]any{
					"type": "integer", "minimum": 1, "maximum": 100,
					"default": legadoDefaultSaveConcurrency,
				},
				safehttp.HostConcurrencyConfigKey: map[string]any{
					"type": "integer", "minimum": 1, "maximum": 100,
					"default": safehttp.DefaultHostConcurrency,
				},
				legadoPrivateNetworkProtectionKey: map[string]any{"type": "boolean", "default": true},
			},
		},
		"permissions":       []any{"books.read", "books.write", "network.read"},
		"data_policy":       map[string]any{"stores_full_text": false, "retention": "source_owned"},
		"compatibility":     map[string]any{"talebook": ">=0.1.0"},
		"connection_owners": []any{"instance"},
		"download_mode":     "by_chapters",
		"homepage":          "https://github.com/talebook/talebook",
		"license":           "GPL-3.0",
		"ui": map[string]any{
			"icon":                "mdi-book-cog-outline",
			"brand_icon":          "/images/plugin-icons/legado.png",
			"manage_route":        "/plugins/legado",
			"configuration_mode":  "manager",
			"primary_action":      "open",
			"healthy_message":     "Legado 书源适配器可用",
		},
	}
}

// Manifest 满足 pluginiface.Provider。
func (p *LegadoProvider) Manifest() map[string]any { return p.ManifestDict }

// DownloadMode 满足 pluginiface.SourceProvider。
func (p *LegadoProvider) DownloadMode() pluginiface.DownloadMode {
	return pluginiface.DownloadByChapters
}

// CapabilitySet 报告能力声明。
func (p *LegadoProvider) CapabilitySet() pluginiface.CapabilitySet { return legadoCaps() }

// Invoke 实现 MethodDispatcher：全部委托 DispatchInvoke。
func (p *LegadoProvider) Invoke(method string, args []any, context map[string]any) (any, error) {
	return DispatchInvoke(p, method, args, context)
}

// InitialEnabled 复刻 initial_enabled：恒为 True。
func (p *LegadoProvider) InitialEnabled(settings map[string]any) bool { return true }

// InitialConfig 复刻缺省行为：空配置。
func (p *LegadoProvider) InitialConfig(settings map[string]any) map[string]any {
	return map[string]any{}
}

// PluginStatus 复刻 legado.py:_status。
func (p *LegadoProvider) PluginStatus(db *sql.DB, settings map[string]any) (map[string]any, error) {
	sources, err := userdb.ListBookSources(db)
	if err != nil {
		return nil, err
	}
	enabled := 0
	for _, item := range sources {
		if item.Enabled {
			enabled++
		}
	}
	return map[string]any{"configured": len(sources), "enabled": enabled}, nil
}

// legadoSource 复刻 _source：从 config.source_raw 构造书源。
func legadoSource(context map[string]any) (*booksource.BookSource, error) {
	config, _ := context["config"].(map[string]any)
	raw, ok := config["source_raw"].(map[string]any)
	if !ok {
		return nil, pluginproto.NewUpstreamError("Legado source binding is missing", "other", nil)
	}
	return booksource.NewBookSource(raw)
}

// legadoEngine 复刻 _engine：构造带传输约束的引擎。
func legadoEngine(context map[string]any) (*booksource.BookSourceEngine, error) {
	config, _ := context["config"].(map[string]any)
	engineConfig := booksource.DefaultEngineConfig()
	if raw, ok := config["engine_config"].(map[string]any); ok {
		if v, ok := raw["BOOKSOURCE_HTTP_TIMEOUT"].(float64); ok {
			engineConfig.HTTPTimeout = v
		}
		if v, ok := raw["BOOKSOURCE_MAX_TOC_PAGES"].(float64); ok {
			engineConfig.MaxTocPages = int(v)
		}
		if v, ok := raw["BOOKSOURCE_MAX_CONTENT_PAGES"].(float64); ok {
			engineConfig.MaxContentPages = int(v)
		}
		if patterns, ok := raw["BOOKSOURCE_AD_PATTERNS"].([]any); ok {
			var list []string
			for _, item := range patterns {
				if s, ok := item.(string); ok {
					list = append(list, s)
				}
			}
			engineConfig.ADPatterns = list
		}
		if v, ok := raw["BOOKSOURCE_CLEAN_ENABLED"].(bool); ok {
			engineConfig.CleanEnabled = v
		}
	}
	source, err := legadoSource(context)
	if err != nil {
		return nil, err
	}
	transport := &safehttp.SafeHttpClient{}
	return booksource.NewBookSourceEngine(source, transport, engineConfig)
}

// legadoSummary 复刻 _summary：引擎条目 → SourceBook。
func legadoSummary(item booksource.BookSummary, sourceName string) plugindomain.SourceBook {
	var categories []string
	for _, value := range legadoKindSplitRe.Split(item.Kind, -1) {
		if value != "" {
			categories = append(categories, value)
		}
	}
	var authors []string
	if item.Author != "" {
		authors = []string{item.Author}
	}
	return plugindomain.SourceBookFromDict(map[string]any{
		"external_id":  item.BookURL,
		"title":        item.Name,
		"authors":      authors,
		"source":       sourceName,
		"source_url":   item.BookURL,
		"access":       "external_link",
		"description":  item.Intro,
		"cover_url":    item.CoverURL,
		"categories":   categories,
		"name":         item.Name,
		"author":       item.Author,
		"kind":         item.Kind,
		"word_count":   item.WordCount,
		"last_chapter": item.LastChapter,
		"intro":        item.Intro,
		"book_url":     item.BookURL,
	})
}

// Search 复刻 search。
func (p *LegadoProvider) Search(query string, cursor map[string]any, context map[string]any) (plugindomain.Page, error) {
	page := 1
	if v, ok := cursor["page"].(float64); ok && int(v) > 1 {
		page = int(v)
	}
	engine, err := legadoEngine(context)
	if err != nil {
		return plugindomain.Page{}, err
	}
	limit := legadoDefaultSearchResultLimit
	if config, ok := context["config"].(map[string]any); ok {
		if v, ok := config[legadoSearchResultLimitKey].(float64); ok {
			limit = int(v)
		}
	}
	if limit < 1 {
		limit = 1
	}
	if limit > 100 {
		limit = 100
	}
	summaries, err := engine.Search(gocontext.Background(), query, page)
	if err != nil {
		return plugindomain.Page{}, err
	}
	if len(summaries) > limit {
		summaries = summaries[:limit]
	}
	items := make([]any, 0, len(summaries))
	for _, item := range summaries {
		items = append(items, legadoSummary(item, engine.Source.BookSourceName()))
	}
	return plugindomain.Page{
		Items:         items,
		NextCursor:    map[string]any{"page": page + 1},
		HealthMessage: "搜索到 " + itoa(len(items)) + " 本书",
	}, nil
}

// Browse 复刻 browse。
func (p *LegadoProvider) Browse(categoryID string, cursor map[string]any, context map[string]any) (plugindomain.Page, error) {
	if categoryID == "" {
		return plugindomain.Page{HealthMessage: "请选择发现分类"}, nil
	}
	page := 1
	if v, ok := cursor["page"].(float64); ok && int(v) > 1 {
		page = int(v)
	}
	engine, err := legadoEngine(context)
	if err != nil {
		return plugindomain.Page{}, err
	}
	summaries, err := engine.Explore(gocontext.Background(), categoryID, page)
	if err != nil {
		return plugindomain.Page{}, err
	}
	items := make([]any, 0, len(summaries))
	for _, item := range summaries {
		items = append(items, legadoSummary(item, engine.Source.BookSourceName()))
	}
	return plugindomain.Page{
		Items:         items,
		NextCursor:    map[string]any{"page": page + 1},
		HealthMessage: "发现 " + itoa(len(items)) + " 本书",
	}, nil
}

// GetCategories 复刻 get_categories。
func (p *LegadoProvider) GetCategories(context map[string]any) ([]plugindomain.Category, error) {
	source, err := legadoSource(context)
	if err != nil {
		return nil, err
	}
	out := make([]plugindomain.Category, 0)
	for _, item := range source.ExploreCategories() {
		out = append(out, plugindomain.Category{ID: item.URL, Name: item.Name})
	}
	return out, nil
}

// GetBook 复刻 get_book。
func (p *LegadoProvider) GetBook(externalID string, context map[string]any) (plugindomain.SourceBookDetail, error) {
	engine, err := legadoEngine(context)
	if err != nil {
		return plugindomain.SourceBookDetail{}, err
	}
	detail, err := engine.BookInfo(gocontext.Background(), externalID)
	if err != nil {
		return plugindomain.SourceBookDetail{}, err
	}
	if detail == nil {
		return plugindomain.SourceBookDetail{}, pluginproto.NewUpstreamError(
			"Book source item was not found", "other", nil)
	}
	bookURL := detail.BookURL
	if bookURL == "" {
		bookURL = externalID
	}
	var categories []string
	for _, value := range legadoKindSplitRe.Split(detail.Kind, -1) {
		if value != "" {
			categories = append(categories, value)
		}
	}
	var authors []string
	if detail.Author != "" {
		authors = []string{detail.Author}
	}
	return plugindomain.SourceBookDetail{
		ExternalID:   bookURL,
		Title:        detail.Name,
		Authors:      authors,
		Description:  detail.Intro,
		CoverURL:     detail.CoverURL,
		Categories:   categories,
		SourceURL:    bookURL,
		Downloadable: true,
		TOCRef:       detail.TocURL,
		LastChapter:  detail.LastChapter,
		WordCount:    detail.WordCount,
		Source:       engine.Source.BookSourceName(),
		Extra: map[string]any{
			"name": detail.Name, "author": detail.Author, "kind": detail.Kind,
			"intro": detail.Intro, "book_url": bookURL, "toc_url": detail.TocURL,
		},
	}, nil
}

// Download 复刻 download：Legado 由章节组装，不支持整本下载。
func (p *LegadoProvider) Download(book plugindomain.SourceBookDetail, context map[string]any) (plugindomain.BookFile, error) {
	return plugindomain.BookFile{}, pluginproto.NewUpstreamError(
		"Legado sources are assembled from chapters", "other", nil)
}

// GetTOC 复刻 get_toc。
func (p *LegadoProvider) GetTOC(book plugindomain.SourceBookDetail, context map[string]any) ([]plugindomain.SourceChapter, error) {
	if book.TOCRef == "" {
		return nil, pluginproto.NewUpstreamError(
			"Legado book detail has no table-of-contents URL", "other", nil)
	}
	engine, err := legadoEngine(context)
	if err != nil {
		return nil, err
	}
	chapters, err := engine.Toc(gocontext.Background(), book.TOCRef)
	if err != nil {
		return nil, err
	}
	out := make([]plugindomain.SourceChapter, 0, len(chapters))
	for _, item := range chapters {
		out = append(out, plugindomain.SourceChapter{
			ExternalID: item.URL,
			Title:      item.Name,
			IsVIP:      item.IsVIP,
			UpdatedAt:  item.UpdateTime,
			Extra: map[string]any{
				"name": item.Name, "url": item.URL, "update_time": item.UpdateTime,
			},
		})
	}
	return out, nil
}

// GetChapter 复刻 get_chapter。
func (p *LegadoProvider) GetChapter(chapter plugindomain.SourceChapter, context map[string]any) (plugindomain.SourceContent, error) {
	clean := true
	if config, ok := context["config"].(map[string]any); ok {
		if v, ok := config["clean"].(bool); ok {
			clean = v
		}
	}
	engine, err := legadoEngine(context)
	if err != nil {
		return plugindomain.SourceContent{}, err
	}
	content, err := engine.Content(gocontext.Background(), chapter.ExternalID, clean)
	if err != nil {
		return plugindomain.SourceContent{}, err
	}
	return plugindomain.SourceContent{Title: chapter.Title, Content: content}, nil
}

// SelfCheck 复刻 self_check。
func (p *LegadoProvider) SelfCheck(context map[string]any) (plugindomain.CheckReport, error) {
	source, err := legadoSource(context)
	if err != nil {
		return plugindomain.CheckReport{}, err
	}
	healthy := source.BookSourceURL() != "" && source.BookSourceName() != "" && source.SearchURL() != ""
	if healthy {
		return plugindomain.CheckReport{
			Healthy: true, Message: source.BookSourceName() + " 连接可用",
		}, nil
	}
	return plugindomain.CheckReport{
		Healthy: false, Message: "Legado 书源缺少名称、地址或搜索规则",
	}, nil
}

// PrepareContext 复刻 prepare_context：只为元数据接口收集已启用书源；
// 网络 worker 不持有数据库句柄，注入结果随 context.platform 下发。
func (p *LegadoProvider) PrepareContext(db *sql.DB, settings map[string]any,
	method string) map[string]any {
	if method != "search_books" || db == nil {
		return map[string]any{}
	}
	settingsMap := settings
	if settingsMap == nil {
		settingsMap = map[string]any{}
	}
	topK := 10
	if v, ok := settingsMap["BOOKSOURCE_METADATA_TOP_K"].(float64); ok {
		topK = int(v)
	}
	if topK < 0 {
		topK = 0
	}
	// 只取用户显式启用的文本书源（source_type=0），weight DESC, id ASC。
	rows, err := db.Query(`SELECT id, COALESCE(name,''), COALESCE(raw,'{}')
		FROM book_sources WHERE enabled = 1 AND source_type = 0
		ORDER BY weight DESC, id ASC LIMIT ?`, topK)
	if err != nil {
		return map[string]any{}
	}
	defer rows.Close()
	var sources []booksource.SourceRow
	for rows.Next() {
		var row booksource.SourceRow
		var raw string
		if err := rows.Scan(&row.ID, &row.Name, &raw); err != nil {
			return map[string]any{}
		}
		var parsed map[string]any
		if err := json.Unmarshal([]byte(raw), &parsed); err != nil || parsed == nil {
			parsed = map[string]any{}
		}
		row.Raw = parsed
		sources = append(sources, row)
	}
	cookieSecret := "talebook"
	if v, ok := settingsMap["cookie_secret"].(string); ok && v != "" {
		cookieSecret = v
	}
	booksourceConfig := map[string]any{}
	for _, key := range legadoMetadataConfigKeys {
		if v, ok := settingsMap[key]; ok {
			booksourceConfig[key] = v
		}
	}
	return map[string]any{
		"metadata_sources": booksource.CollectMetadataSources(sources),
		"cookie_secret":    cookieSecret,
		"booksource_config": booksourceConfig,
	}
}

// legadoMetadataConfigKeys 复刻 BOOKSOURCE_METADATA_CONFIG_KEYS。
var legadoMetadataConfigKeys = []string{
	"BOOKSOURCE_HTTP_TIMEOUT", "BOOKSOURCE_MAX_TOC_PAGES",
	"BOOKSOURCE_MAX_CONTENT_PAGES", "BOOKSOURCE_AD_PATTERNS",
	"BOOKSOURCE_CLEAN_ENABLED", "BOOKSOURCE_METADATA_WORKERS",
	"BOOKSOURCE_METADATA_TOKEN_TTL",
}

// SearchBooks 复刻 search_books：委托书源元数据服务。
//
// platform.metadata_sources 由 PrepareContext 注入；缺失时返回空列表。
func (p *LegadoProvider) SearchBooks(query plugindomain.MetadataQuery, context map[string]any) ([]plugindomain.BookMetadata, error) {
	if query.IsEmpty() {
		return nil, nil
	}
	platform, _ := context["platform"].(map[string]any)
	config := map[string]any{}
	if raw, ok := platform["booksource_config"].(map[string]any); ok {
		for k, v := range raw {
			config[k] = v
		}
	}
	pluginConfig, _ := context["config"].(map[string]any)
	if v, ok := pluginConfig[legadoSearchConcurrencyKey]; ok {
		config["BOOKSOURCE_METADATA_WORKERS"] = v
	}
	config["BOOKSOURCE_SEARCH_RESULT_LIMIT"] = legadoDefaultSearchResultLimit

	var sources []booksource.MetadataSource
	if raw, ok := platform["metadata_sources"].([]booksource.MetadataSource); ok {
		sources = raw
	}
	service := &booksource.BookSourceMetadataService{
		Sources: sources,
		Secret:  stringOr(platform["cookie_secret"], "talebook"),
		Config:  metadataConfigFrom(config, platform),
	}
	author := ""
	if len(query.Authors) > 0 {
		author = query.Authors[0]
	}
	result := service.Search(gocontext.Background(), stringOr(query.Title, query.ISBN), author)
	if result == nil {
		return nil, nil
	}
	records := make([]plugindomain.BookMetadata, 0, len(result.Books))
	for _, book := range result.Books {
		if book == nil {
			continue
		}
		records = append(records, plugindomain.NewBookMetadata(metadataToDict(book)))
	}
	return records, nil
}

// metadataToDict 把 booksource.Metadata 转成元数据字典（字段与 METADATA_FIELDS 对齐）。
func metadataToDict(book *booksource.Metadata) map[string]any {
	values := map[string]any{
		"title":          book.Title,
		"authors":        book.Authors,
		"author_sort":    book.AuthorSort,
		"publisher":      book.Publisher,
		"isbn":           book.ISBN,
		"tags":           book.Tags,
		"comments":       book.Comments,
		"cover_url":      book.CoverURL,
		"website":        book.Website,
		"source":         book.Source,
		"provider_key":   book.ProviderKey,
		"provider_value": book.ProviderValue,
	}
	if len(book.Authors) > 0 {
		values["author"] = book.Authors[0]
	}
	return values
}

// GetMetadata 复刻 get_metadata：恒返回 None（候选由书籍 handler 在持有
// 数据库 session 的线程应用）。
func (p *LegadoProvider) GetMetadata(externalID string, context map[string]any) (*plugindomain.BookMetadata, error) {
	return nil, nil
}

// GetCover 复刻 get_cover：恒返回 None。
func (p *LegadoProvider) GetCover(coverURL string, context map[string]any) (*pluginiface.CoverResult, error) {
	return nil, nil
}

// metadataConfigFrom 把插件配置与 booksource_config 映射为元数据服务配置。
//
// 对齐 Python：引擎级配置（HTTP 超时、TOC/正文页数上限、广告规则、清洗开关）
// 与 token TTL 均从 booksource_config 透传；workers 默认 20。
func metadataConfigFrom(config, platform map[string]any) booksource.MetadataConfig {
	cfg := booksource.DefaultMetadataConfig()
	cfg.Workers = legadoDefaultSearchConcurrency
	if v, ok := config["BOOKSOURCE_METADATA_WORKERS"].(float64); ok {
		cfg.Workers = int(v)
	}
	if v, ok := config[legadoSearchConcurrencyKey].(float64); ok {
		cfg.Workers = int(v)
	}
	cfg.SearchLimit = legadoDefaultSearchResultLimit
	if v, ok := config[legadoSearchResultLimitKey].(float64); ok {
		cfg.SearchLimit = int(v)
	}
	booksourceConfig, _ := platform["booksource_config"].(map[string]any)
	if v, ok := booksourceConfig["BOOKSOURCE_METADATA_TOKEN_TTL"].(float64); ok {
		cfg.TokenTTL = int(v)
	}
	engine := booksource.DefaultEngineConfig()
	if v, ok := booksourceConfig["BOOKSOURCE_HTTP_TIMEOUT"].(float64); ok {
		engine.HTTPTimeout = v
	}
	if v, ok := booksourceConfig["BOOKSOURCE_MAX_TOC_PAGES"].(float64); ok {
		engine.MaxTocPages = int(v)
	}
	if v, ok := booksourceConfig["BOOKSOURCE_MAX_CONTENT_PAGES"].(float64); ok {
		engine.MaxContentPages = int(v)
	}
	if patterns, ok := booksourceConfig["BOOKSOURCE_AD_PATTERNS"].([]any); ok {
		var list []string
		for _, item := range patterns {
			if s, ok := item.(string); ok {
				list = append(list, s)
			}
		}
		engine.ADPatterns = list
	}
	if v, ok := booksourceConfig["BOOKSOURCE_CLEAN_ENABLED"].(bool); ok {
		engine.CleanEnabled = v
	}
	cfg.Engine = engine
	return cfg
}

// stringOr 复刻 `a or b` 的字符串语义。
func stringOr(value any, def string) string {
	if s, ok := value.(string); ok && s != "" {
		return s
	}
	return def
}

// itoa 是 strconv.Itoa 的本地别名（避免多处 import）。
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	negative := n < 0
	if negative {
		n = -n
	}
	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	if negative {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}

// 编译期断言：Legado 满足书源与元数据接口。
var (
	_ pluginiface.SourceProvider   = (*LegadoProvider)(nil)
	_ pluginiface.MetadataProvider = (*LegadoProvider)(nil)
	_ pluginruntime.MethodDispatcher = (*LegadoProvider)(nil)
)

