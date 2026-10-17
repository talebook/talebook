package pluginbuiltin

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/url"
	"sort"
	"strings"
	"time"

	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginproto"
)

// weread 常量（复刻 combo/weread/provider.py）。
const (
	wereadPluginKey     = "talebook.combo.weread"
	wereadGateway       = "https://i.weread.qq.com/api/agent/gateway"
	wereadSkillVersion  = "1.0.4"
)

// wereadQueryOperations 复刻 WEREAD_QUERY_OPERATIONS。
var wereadQueryOperations = map[string]struct {
	APIName  string
	Required []string
	Params   map[string]string
}{
	"search":              {"/store/search", []string{"keyword"}, map[string]string{"keyword": "text", "scope": "scope", "maxIdx": "index", "count": "count"}},
	"book_info":           {"/book/info", []string{"bookId"}, map[string]string{"bookId": "id"}},
	"chapters":            {"/book/chapterinfo", []string{"bookId"}, map[string]string{"bookId": "id"}},
	"progress":            {"/book/getprogress", []string{"bookId"}, map[string]string{"bookId": "id"}},
	"shelf":               {"/shelf/sync", nil, map[string]string{}},
	"statistics":          {"/readdata/detail", nil, map[string]string{"mode": "mode", "baseTime": "timestamp"}},
	"notebooks":           {"/user/notebooks", nil, map[string]string{"count": "count", "lastSort": "timestamp"}},
	"highlights":          {"/book/bookmarklist", []string{"bookId"}, map[string]string{"bookId": "id"}},
	"my_reviews":          {"/review/list/mine", []string{"bookid"}, map[string]string{"bookid": "id", "synckey": "index", "count": "count"}},
	"popular_highlights":  {"/book/bestbookmarks", []string{"bookId"}, map[string]string{"bookId": "id", "chapterUid": "index", "synckey": "index"}},
	"underline_stats":     {"/book/underlines", []string{"bookId", "chapterUid"}, map[string]string{"bookId": "id", "chapterUid": "index", "synckey": "index"}},
	"highlight_reviews":   {"/book/readreviews", []string{"bookId", "chapterUid", "reviews"}, map[string]string{"bookId": "id", "chapterUid": "index", "reviews": "reviews"}},
	"review_detail":       {"/review/single", []string{"reviewId"}, map[string]string{"reviewId": "id", "commentsCount": "small_count", "commentsDirection": "direction", "likesCount": "small_count", "likesDirection": "direction", "synckey": "index"}},
	"public_reviews":      {"/review/list", []string{"bookId"}, map[string]string{"bookId": "id", "reviewListType": "review_type", "count": "count", "maxIdx": "index", "synckey": "index"}},
	"recommendations":     {"/book/recommend", nil, map[string]string{"count": "count", "maxIdx": "index"}},
	"similar":             {"/book/similar", []string{"bookId"}, map[string]string{"bookId": "id", "count": "count", "maxIdx": "index", "sessionId": "id"}},
	"friends_reading":     {"/discover/interact/type3", nil, map[string]string{"count": "count", "maxIdx": "index", "synckey": "index"}},
}

// wereadExtraFeatures 复刻 WEREAD_EXTRA_FEATURES（17 个只读操作）。
func wereadExtraFeatures() map[string]any {
	out := map[string]any{}
	ops := make([]string, 0, len(wereadQueryOperations))
	for op := range wereadQueryOperations {
		ops = append(ops, op)
	}
	sort.Strings(ops)
	for _, op := range ops {
		out[op] = map[string]any{
			"mode": "read", "required_scopes": []any{"profile.read"},
			"schema": map[string]any{"type": "object", "properties": map[string]any{}},
		}
	}
	return out
}

// validateWereadQuery 复刻 validate_weread_query：拒绝未知参数并返回 (api_name, safe)。
func validateWereadQuery(operation string, params map[string]any) (string, map[string]any, error) {
	spec, ok := wereadQueryOperations[operation]
	if !ok {
		return "", nil, pluginproto.NewUpstreamError("Unsupported WeRead read operation", "other", nil)
	}
	known := map[string]bool{}
	for name := range spec.Params {
		known[name] = true
	}
	for name := range params {
		if !known[name] {
			return "", nil, pluginproto.NewUpstreamError(
				"Unknown WeRead query parameters: "+name, "other", nil)
		}
	}
	required := map[string]bool{}
	for _, name := range spec.Required {
		required[name] = true
		if _, ok := params[name]; !ok {
			return "", nil, pluginproto.NewUpstreamError(
				"Missing WeRead query parameters: "+name, "other", nil)
		}
	}
	safe := map[string]any{}
	for name, value := range params {
		kind := spec.Params[name]
		if kind == "text" || kind == "id" {
			s, ok := value.(string)
			if !ok || strings.TrimSpace(s) == "" {
				return "", nil, pluginproto.NewUpstreamError(
					"WeRead query parameter "+name+" must be a non-empty string", "other", nil)
			}
			limit := 128
			if kind == "text" {
				limit = 200
			}
			if len(s) > limit {
				return "", nil, pluginproto.NewUpstreamError(
					"WeRead query parameter "+name+" is too long", "other", nil)
			}
			safe[name] = strings.TrimSpace(s)
			continue
		}
		if kind == "reviews" {
			list, ok := value.([]any)
			if !ok || len(list) < 1 || len(list) > 20 {
				return "", nil, pluginproto.NewUpstreamError(
					"WeRead reviews must contain between 1 and 20 ranges", "other", nil)
			}
			result := make([]any, 0, len(list))
			for _, item := range list {
				range0bj, ok := item.(map[string]any)
				if !ok {
					return "", nil, pluginproto.NewUpstreamError(
						"Each WeRead review range must be a non-empty string", "other", nil)
				}
				rangeValue, _ := range0bj["range"].(string)
				if strings.TrimSpace(rangeValue) == "" {
					return "", nil, pluginproto.NewUpstreamError(
						"Each WeRead review range must be a non-empty string", "other", nil)
				}
				allowed := map[string]bool{"range": true, "maxIdx": true, "count": true, "synckey": true}
				for key := range range0bj {
					if !allowed[key] {
						return "", nil, pluginproto.NewUpstreamError(
							"Unknown WeRead review range parameters: "+key, "other", nil)
					}
				}
				if len(rangeValue) > 100 {
					return "", nil, pluginproto.NewUpstreamError(
						"WeRead review range is too long", "other", nil)
				}
				safeItem := map[string]any{"range": strings.TrimSpace(rangeValue)}
				for _, key := range []string{"maxIdx", "count", "synckey"} {
					if raw, present := range0bj[key]; present {
						number, ok := toIntAny(raw)
						if !ok {
							return "", nil, pluginproto.NewUpstreamError(
								"WeRead query parameter "+key+" must be an integer", "other", nil)
						}
						safeItem[key] = number
					}
				}
				result = append(result, safeItem)
			}
			safe[name] = result
			continue
		}
		if kind == "mode" {
			mode, _ := value.(string)
			switch mode {
			case "weekly", "monthly", "annually", "overall":
				safe[name] = mode
			default:
				return "", nil, pluginproto.NewUpstreamError(
					"Unsupported WeRead statistics mode", "other", nil)
			}
			continue
		}
		number, ok := value.(float64)
		if ok {
			safe[name] = int(number)
			continue
		}
		if n, ok := value.(int); ok {
			safe[name] = n
			continue
		}
		return "", nil, pluginproto.NewUpstreamError(
			"WeRead query parameter "+name+" must be an integer", "other", nil)
	}
	return spec.APIName, safe, nil
}

// WereadProvider 复刻 WereadProvider。
type WereadProvider struct {
	ManifestDict map[string]any
}

// newWereadProvider 构造微信读书 provider。
func newWereadProvider() *WereadProvider {
	return &WereadProvider{ManifestDict: map[string]any{
		"protocol_version": pluginproto.ProtocolVersion,
		"id":               wereadPluginKey,
		"name":             "微信读书",
		"version":          "1.2.0",
		"categories":       []any{"integrations", "metadata", "annotations"},
		"capabilities": []any{
			"integrations.search", "integrations.books", "integrations.shelf",
			"integrations.statistics", "integrations.community", "integrations.recommendations",
			"metadata.lookup", "annotations.import",
		},
		"runtime_kind": "builtin",
		"actions":      []any{"test", "preview", "run", "retry", "rollback"},
		"auth_schema": map[string]any{
			"type": "object",
			"properties": map[string]any{
				"api_key": map[string]any{"type": "string", "writeOnly": true},
			},
		},
		"config_schema": map[string]any{
			"type": "object",
			"properties": map[string]any{
				"max_retries":     map[string]any{"type": "integer", "minimum": 0, "maximum": 5},
				"backoff_seconds": map[string]any{"type": "number", "minimum": 0},
			},
		},
		"permissions":       []any{"books.read", "books.write", "profile.read", "annotations.write"},
		"data_policy":       map[string]any{"stores_full_text": true, "retention": "user_controlled"},
		"compatibility":     map[string]any{"talebook": ">=0.1.0"},
		"connection_owners": []any{"user"},
		"homepage":          "https://github.com/Tencent/WeChatReading",
		"license":           "GPL-3.0",
		"description":       "搜索微信读书内容，浏览书架、阅读统计、笔记、社区与推荐，并可将个人笔记导入 Talebook。",
		"extra_features":    wereadExtraFeatures(),
		"ui": map[string]any{
			"icon": "mdi-book-open-page-variant", "brand_icon": "/images/plugin-icons/weread.png",
			"manage_route": "/plugins/weread",
		},
	}}
}

// Manifest 满足 pluginiface.Provider。
func (p *WereadProvider) Manifest() map[string]any { return p.ManifestDict }

// ProxyImageHosts 复刻 proxy_image_hosts。
func (p *WereadProvider) ProxyImageHosts() []string { return []string{"weread.qq.com"} }

// Invoke 实现 MethodDispatcher：全部委托 DispatchInvoke。
func (p *WereadProvider) Invoke(method string, args []any, context map[string]any) (any, error) {
	return DispatchInvoke(p, method, args, context)
}

// InitialConfig 复刻缺省行为：空配置。
func (p *WereadProvider) InitialConfig(settings map[string]any) map[string]any {
	return map[string]any{}
}

// gateway 复刻 _gateway：errcode 分类。
func (p *WereadProvider) gateway(apiKey, apiName string, params map[string]any) (map[string]any, error) {
	body := map[string]any{"api_name": apiName, "skill_version": wereadSkillVersion}
	for k, v := range params {
		body[k] = v
	}
	data, err := reviewHTTPJSON("POST", wereadGateway,
		map[string]string{"Authorization": "Bearer " + apiKey, "Content-Type": "application/json"},
		nil, body, 30)
	if err != nil {
		return nil, pluginproto.NewUpstreamError("WeRead gateway request failed", "other", nil)
	}
	if upgrade, ok := data["upgrade_info"].(map[string]any); ok {
		return nil, pluginproto.NewUpstreamError(
			stringOr(upgrade["message"], "WeRead skill upgrade required"), "other", nil)
	}
	if errcode := data["errcode"]; errcode != nil {
		code := fmt.Sprintf("%v", errcode)
		if code != "0" {
			message := stringOr(data["errmsg"], stringOr(data["message"], "WeRead request rejected"))
			if code == "401" || code == "403" || code == "-2010" ||
				strings.Contains(message, "认证") || strings.Contains(message, "登录") {
				return nil, pluginproto.NewUpstreamAuthError(message, "auth", nil)
			}
			if code == "429" || code == "-2009" || strings.Contains(message, "频率") {
				return nil, pluginproto.NewUpstreamRateLimitError(message, nil)
			}
			return nil, pluginproto.NewUpstreamError(message, "other", nil)
		}
	}
	return data, nil
}

// Query 复刻 query。
func (p *WereadProvider) Query(apiKey, operation string, params map[string]any) (map[string]any, error) {
	if apiKey == "" {
		return nil, pluginproto.NewUpstreamAuthError("WeRead API key is required", "auth", nil)
	}
	apiName, safe, err := validateWereadQuery(operation, params)
	if err != nil {
		return nil, err
	}
	return p.gateway(apiKey, apiName, safe)
}

// Execute 复刻 execute：export 优先，否则走 API。
func (p *WereadProvider) Execute(context map[string]any) (pluginproto.ProviderResult, error) {
	inputData, _ := context["input_data"].(map[string]any)
	secrets, _ := context["secrets"].(map[string]any)
	apiKey := stringOr(secrets["api_key"], "")
	var items []pluginproto.ProviderItem
	health := ""
	if exportData, ok := inputData["export"]; ok && exportData != nil {
		var err error
		items, err = parseWereadExport(exportData)
		if err != nil {
			return pluginproto.ProviderResult{}, err
		}
		health = "WeRead export parsed"
	} else {
		if apiKey == "" {
			return pluginproto.ProviderResult{}, pluginproto.NewUpstreamAuthError(
				"WeRead API key is required when no export JSON is supplied", "auth", nil)
		}
		if asStringOr(context["action"], "") == "test" {
			if _, err := p.gateway(apiKey, "/user/notebooks", map[string]any{"count": 1}); err != nil {
				return pluginproto.ProviderResult{}, err
			}
			return pluginproto.ProviderResult{HealthMessage: "WeRead API connection healthy"}, nil
		}
		var err error
		items, err = p.fetchAll(apiKey)
		if err != nil {
			return pluginproto.ProviderResult{}, err
		}
		health = "WeRead API import fetched"
	}
	targetIDs := map[string]bool{}
	if raw, ok := context["target_external_ids"].([]any); ok {
		for _, item := range raw {
			if s, ok := item.(string); ok {
				targetIDs[s] = true
			}
		}
	}
	if len(targetIDs) > 0 {
		filtered := items[:0]
		for _, item := range items {
			if targetIDs[item.ExternalID] {
				filtered = append(filtered, item)
			}
		}
		items = filtered
	}
	var lastSync string
	for _, item := range items {
		if item.RemoteUpdatedAt != nil && *item.RemoteUpdatedAt > lastSync {
			lastSync = *item.RemoteUpdatedAt
		}
	}
	cursor := map[string]any{}
	if raw, ok := context["cursor"].(map[string]any); ok {
		for k, v := range raw {
			cursor[k] = v
		}
	}
	if lastSync != "" {
		cursor = map[string]any{"last_sync_at": lastSync}
	}
	return pluginproto.ProviderResult{Items: items, NextCursor: cursor, HealthMessage: health}, nil
}

// fetchAll 复刻 _fetch_all：双层游标遍历，游标不前进报错。
func (p *WereadProvider) fetchAll(apiKey string) ([]pluginproto.ProviderItem, error) {
	cursor := map[string]any{}
	var items []pluginproto.ProviderItem
	seen := map[string]bool{}
	for {
		pageItems, next, hasMore, err := p.fetchPage(apiKey, cursor)
		if err != nil {
			return nil, err
		}
		items = append(items, pageItems...)
		if !hasMore {
			return items, nil
		}
		marker, _ := json.Marshal(next)
		if len(next) == 0 || seen[string(marker)] {
			return nil, pluginproto.NewUpstreamError(
				"WeRead pagination cursor did not advance", "other", nil)
		}
		seen[string(marker)] = true
		cursor = next
	}
}

// fetchPage 复刻 _fetch_page：每次只拉一个 notebook 的一页 review。
func (p *WereadProvider) fetchPage(apiKey string, cursor map[string]any) (
	[]pluginproto.ProviderItem, map[string]any, bool, error) {
	lastSort := stringOr(cursor["last_sort"], "")
	notebookIndex := 0
	if v, ok := cursor["notebook_index"].(float64); ok && int(v) > 0 {
		notebookIndex = int(v)
	}
	reviewSynckey := 0
	if v, ok := cursor["review_synckey"].(float64); ok && int(v) > 0 {
		reviewSynckey = int(v)
	}
	params := map[string]any{"count": 100}
	if lastSort != "" {
		params["lastSort"] = lastSort
	}
	notebookPage, err := p.gateway(apiKey, "/user/notebooks", params)
	if err != nil {
		return nil, nil, false, err
	}
	var notebooks []map[string]any
	if raw, ok := notebookPage["books"].([]any); ok {
		for _, item := range raw {
			if m, ok := item.(map[string]any); ok {
				notebooks = append(notebooks, m)
			}
		}
	}
	bookID := ""
	for notebookIndex < len(notebooks) {
		notebook := notebooks[notebookIndex]
		book, _ := notebook["book"].(map[string]any)
		if book == nil {
			book = notebook
		}
		bookID = stringOr(notebook["bookId"], stringOr(book["bookId"], ""))
		if bookID != "" {
			break
		}
		notebookIndex++
		reviewSynckey = 0
	}
	if notebookIndex >= len(notebooks) {
		return nil, map[string]any{}, false, nil
	}
	marks, err := p.gateway(apiKey, "/book/bookmarklist", map[string]any{"bookId": bookID})
	if err != nil {
		return nil, nil, false, err
	}
	reviewPage, err := p.gateway(apiKey, "/review/list/mine",
		map[string]any{"bookid": bookID, "synckey": reviewSynckey, "count": 100})
	if err != nil {
		return nil, nil, false, err
	}
	book := marks["book"]
	if book == nil {
		book = notebooks[notebookIndex]["book"]
		if book == nil {
			book = notebooks[notebookIndex]
		}
	}
	var bookmarks any
	if reviewSynckey == 0 {
		bookmarks = marks["updated"]
	}
	payload := []any{map[string]any{
		"book": book,
		"chapters": marks["chapters"],
		"bookmarks": bookmarks,
		"reviews": reviewPage["reviews"],
	}}
	items, err := parseWereadExport(payload)
	if err != nil {
		return nil, nil, false, err
	}
	nextSync := reviewPage["synckey"]
	hasMore, _ := reviewPage["hasMore"].(bool)
	if hasMore && nextSync != nil && fmt.Sprintf("%v", nextSync) != fmt.Sprintf("%v", reviewSynckey) {
		return items, map[string]any{
			"last_sort": lastSort, "notebook_index": notebookIndex, "review_synckey": nextSync,
		}, true, nil
	}
	if notebookIndex+1 < len(notebooks) {
		return items, map[string]any{
			"last_sort": lastSort, "notebook_index": notebookIndex + 1, "review_synckey": 0,
		}, true, nil
	}
	nextSort := ""
	if len(notebooks) > 0 {
		nextSort = stringOr(notebooks[len(notebooks)-1]["sort"], "")
	}
	pageHasMore, _ := notebookPage["hasMore"].(bool)
	if pageHasMore && nextSort != "" && nextSort != lastSort {
		return items, map[string]any{"last_sort": nextSort, "notebook_index": 0, "review_synckey": 0}, true, nil
	}
	return items, map[string]any{}, false, nil
}

// SearchBooks 复刻 search_books。
func (p *WereadProvider) SearchBooks(query plugindomain.MetadataQuery, context map[string]any) ([]plugindomain.BookMetadata, error) {
	secrets, _ := context["secrets"].(map[string]any)
	apiKey := stringOr(secrets["api_key"], "")
	if apiKey == "" {
		return nil, pluginproto.NewUpstreamAuthError("WeRead API key is required", "auth", nil)
	}
	value := query.Title
	if value == "" {
		value = query.ISBN
	}
	payload, err := p.Query(apiKey, "search", map[string]any{"keyword": value, "scope": 10})
	if err != nil {
		return nil, err
	}
	records := []plugindomain.BookMetadata{}
	for _, item := range wereadSearchItems(payload) {
		providerValue := stringOr(item["bookId"], stringOr(item["id"], ""))
		if providerValue == "" {
			continue
		}
		info, _ := item["bookInfo"].(map[string]any)
		if info == nil {
			info = item
		}
		records = append(records, plugindomain.NewBookMetadata(map[string]any{
			"title":          stringOr(info["title"], stringOr(info["bookName"], stringOr(info["name"], ""))),
			"authors":        []any{stringOr(info["author"], stringOr(info["authorName"], ""))},
			"provider_key":   wereadPluginKey,
			"provider_value": providerValue,
		}))
	}
	return records, nil
}

// wereadSearchItems 复刻 _search_items。
func wereadSearchItems(payload map[string]any) []map[string]any {
	var items []map[string]any
	appendItem := func(value any) {
		obj, ok := value.(map[string]any)
		if !ok {
			return
		}
		info, ok := obj["bookInfo"].(map[string]any)
		if !ok {
			info = obj
		}
		merged := map[string]any{}
		for k, v := range obj {
			merged[k] = v
		}
		for k, v := range info {
			merged[k] = v
		}
		items = append(items, merged)
	}
	if groups, ok := payload["results"].([]any); ok {
		for _, group := range groups {
			if g, ok := group.(map[string]any); ok {
				if books, ok := g["books"].([]any); ok {
					for _, book := range books {
						appendItem(book)
					}
				}
			}
		}
	}
	if books, ok := payload["books"].([]any); ok {
		for _, book := range books {
			appendItem(book)
		}
	}
	return items
}

// GetMetadata 复刻 get_metadata。
func (p *WereadProvider) GetMetadata(providerValue string, context map[string]any) (*plugindomain.BookMetadata, error) {
	secrets, _ := context["secrets"].(map[string]any)
	apiKey := stringOr(secrets["api_key"], "")
	if apiKey == "" {
		return nil, pluginproto.NewUpstreamAuthError("WeRead API key is required", "auth", nil)
	}
	payload, err := p.Query(apiKey, "book_info", map[string]any{"bookId": providerValue})
	if err != nil {
		return nil, err
	}
	record := plugindomain.NewBookMetadata(map[string]any{
		"title":          stringOr(payload["title"], stringOr(payload["bookName"], "")),
		"authors":        []any{stringOr(payload["author"], stringOr(payload["authorName"], ""))},
		"comments":       stringOr(payload["intro"], stringOr(payload["description"], "")),
		"cover_url":      stringOr(payload["cover"], stringOr(payload["url"], "")),
		"provider_key":   wereadPluginKey,
		"provider_value": providerValue,
	})
	return &record, nil
}

// GetCover 复刻 get_cover：封面 URL 直通（下载由调用方确认后触发）。
func (p *WereadProvider) GetCover(coverURL string, context map[string]any) (*pluginifaceCoverResultAlias, error) {
	return nil, nil
}

// ListAnnotations 复刻 list_annotations。
func (p *WereadProvider) ListAnnotations(context map[string]any) (plugindomain.Page, error) {
	secrets, _ := context["secrets"].(map[string]any)
	apiKey := stringOr(secrets["api_key"], "")
	if apiKey == "" {
		return plugindomain.Page{}, pluginproto.NewUpstreamAuthError("WeRead API key is required", "auth", nil)
	}
	cursor, _ := context["cursor"].(map[string]any)
	items, nextCursor, hasMore, err := p.fetchPage(apiKey, cursor)
	if err != nil {
		return plugindomain.Page{}, err
	}
	annotations := []any{}
	for _, item := range items {
		if item.EntityType != "annotation" || item.ErrorCode != "" {
			continue
		}
		if m, ok := item.Data.(map[string]any); ok {
			annotations = append(annotations,
				plugindomain.Annotation{DomainRecord: plugindomain.NewDomainRecord(m)})
		}
	}
	return plugindomain.Page{
		Items: annotations, HasMore: hasMore, NextCursor: nextCursor,
		HealthMessage: "WeRead annotations fetched",
	}, nil
}

// PushAnnotation 复刻 push_annotation：不支持写入。
func (p *WereadProvider) PushAnnotation(item plugindomain.Annotation, state plugindomain.SourceState,
	context map[string]any) (plugindomain.PushReceipt, error) {
	return plugindomain.PushReceipt{}, pluginproto.NewUpstreamError(
		"WeRead does not support writing annotations", "other", nil)
}

// ExecuteFeature 复刻 execute_feature。
func (p *WereadProvider) ExecuteFeature(action string, params map[string]any, context map[string]any) (map[string]any, error) {
	if _, ok := wereadQueryOperations[action]; !ok {
		return nil, pluginproto.NewUpstreamError("Unsupported WeRead extra feature", "other", nil)
	}
	secrets, _ := context["secrets"].(map[string]any)
	apiKey := stringOr(secrets["api_key"], "")
	return p.Query(apiKey, action, params)
}

// ---- 导出解析（复刻 combo/weread/export.py）----

// wereadTimestamp 复刻 _timestamp。
func wereadTimestamp(value any) string {
	number, ok := value.(float64)
	if !ok {
		return ""
	}
	return time.Unix(int64(number), 0).UTC().Format("2006-01-02T15:04:05Z")
}

// wereadStableID 复刻 _stable_id。
func wereadStableID(kind, bookID string, raw map[string]any) string {
	sourceID := stringOr(raw["bookmarkId"], stringOr(raw["reviewId"], stringOr(raw["id"], "")))
	if sourceID == "" {
		fingerprint, _ := json.Marshal(raw)
		sum := sha256.Sum256(fingerprint)
		sourceID = hex.EncodeToString(sum[:])[:24]
	}
	if bookID == "" {
		bookID = "unknown"
	}
	return "weread:" + bookID + ":" + kind + ":" + sourceID
}

// wereadBookPayload 复刻 _book_payload。
func wereadBookPayload(value map[string]any) map[string]any {
	identifiers, _ := value["identifiers"].(map[string]any)
	book := map[string]any{
		"provider_id": stringOr(value["bookId"], stringOr(value["bookid"], stringOr(value["id"], ""))),
		"isbn":        stringOr(value["isbn"], stringOr(value["ISBN"], stringOr(identifiers["isbn"], ""))),
		"title":       stringOr(value["title"], stringOr(value["bookName"], stringOr(value["name"], ""))),
		"author":      stringOr(value["author"], stringOr(value["authorName"], "")),
	}
	if stringOr(book["provider_id"], "") == "" {
		identity := strings.Join([]string{
			stringOr(book["isbn"], ""), stringOr(book["title"], ""), stringOr(book["author"], ""),
		}, "\x00")
		sum := sha256.Sum256([]byte(identity))
		book["provider_id"] = "meta:" + hex.EncodeToString(sum[:])[:24]
	}
	return book
}

// wereadChapterMap 复刻 _chapter_map。
func wereadChapterMap(payload map[string]any) map[string]string {
	result := map[string]string{}
	for _, key := range []string{"chapters", "chapterInfos", "chapterList"} {
		list, _ := payload[key].([]any)
		for _, item := range list {
			chapter, ok := item.(map[string]any)
			if !ok {
				continue
			}
			uid := stringOr(chapter["chapterUid"], stringOr(chapter["uid"], stringOr(chapter["chapterIdx"], "")))
			if uid != "" {
				result[uid] = stringOr(chapter["title"], stringOr(chapter["chapterName"], ""))
			}
		}
	}
	return result
}

// parseWereadExport 复刻 parse_weread_export。
func parseWereadExport(payload any) ([]pluginproto.ProviderItem, error) {
	var books []any
	switch value := payload.(type) {
	case []any:
		books = value
	case map[string]any:
		if list, ok := value["books"].([]any); ok {
			books = list
		} else if list, ok := value["data"].([]any); ok {
			books = list
		} else {
			books = []any{value}
		}
	default:
		return nil, pluginproto.NewUpstreamError("WeRead export must be a JSON object or array", "other", nil)
	}

	items := []pluginproto.ProviderItem{}
	byID := map[string]bool{}
	for _, entryRaw := range books {
		entry, ok := entryRaw.(map[string]any)
		if !ok {
			continue
		}
		bookSource, ok := entry["book"].(map[string]any)
		if !ok {
			bookSource, ok = entry["bookInfo"].(map[string]any)
			if !ok {
				bookSource = entry
			}
		}
		book := wereadBookPayload(bookSource)
		bookID := stringOr(book["provider_id"], "")
		chapters := wereadChapterMap(entry)
		bookmarkPayload, ok := entry["bookmarklist"].(map[string]any)
		if !ok {
			bookmarkPayload = entry
		}
		for k, v := range wereadChapterMap(bookmarkPayload) {
			chapters[k] = v
		}
		bookmarks, _ := firstOfAny(entry["bookmarks"], entry["updated"], bookmarkPayload["updated"]).([]any)
		reviews, _ := entry["reviews"].([]any)
		if reviewList, ok := entry["reviewList"].(map[string]any); ok {
			if list, ok := reviewList["reviews"].([]any); ok {
				reviews = append(reviews, list...)
			}
		}

		for _, rawRaw := range bookmarks {
			raw, ok := rawRaw.(map[string]any)
			if !ok || stringOr(raw["markText"], "") == "" {
				continue
			}
			if t, ok := raw["type"].(float64); ok && int(t) == 0 {
				continue
			}
			chapterUID := stringOr(raw["chapterUid"], stringOr(raw["chapterIdx"], ""))
			externalID := wereadStableID("bookmark", bookID, raw)
			updatedAt := wereadTimestamp(firstOfAny(raw["updateTime"], raw["createTime"]))
			chapter := stringOr(raw["chapterName"], chapters[chapterUID])
			items = append(items, makeWereadItem(byID, externalID, updatedAt, map[string]any{
				"source_book_id": bookID, "book": book, "annotation_type": "highlight",
				"chapter": chapter, "quote_text": stringOr(raw["markText"], ""),
				"content": "", "color": stringOr(raw["colorStyle"], ""),
				"user_modified_at": updatedAt,
				"source_position":  "chapterUid=" + chapterUID + ";range=" + stringOr(raw["range"], ""),
			}))
		}

		for _, wrapped := range reviews {
			raw, _ := wrapped.(map[string]any)
			if raw == nil {
				continue
			}
			if nested, ok := raw["review"].(map[string]any); ok {
				raw = nested
			}
			content := strings.TrimSpace(stringOr(raw["content"], ""))
			quote := strings.TrimSpace(stringOr(raw["abstract"], ""))
			if content == "" && quote == "" {
				continue
			}
			chapterUID := stringOr(raw["chapterUid"], stringOr(raw["chapterIdx"], ""))
			chapter := stringOr(raw["chapterName"], chapters[chapterUID])
			annotationType := "chapter_comment"
			if quote != "" || chapter == "" {
				annotationType = "note"
			}
			if quote == "" && chapter == "" {
				chapter = "整本书评"
			}
			externalID := wereadStableID("review", bookID, raw)
			updatedAt := wereadTimestamp(firstOfAny(raw["updateTime"], raw["createTime"]))
			var rating any
			if star, ok := raw["star"].(float64); ok && star != -1 {
				rating = star
			}
			items = append(items, makeWereadItem(byID, externalID, updatedAt, map[string]any{
				"source_book_id": bookID, "book": book, "annotation_type": annotationType,
				"chapter": chapter, "quote_text": quote, "content": content, "color": "",
				"rating": rating, "user_modified_at": updatedAt,
				"source_position": "chapterUid=" + chapterUID + ";range=" + stringOr(raw["range"], ""),
			}))
		}
	}
	return items, nil
}

// makeWereadItem 构造去重后的 ProviderItem。
func makeWereadItem(seen map[string]bool, externalID, updatedAt string, data map[string]any) pluginproto.ProviderItem {
	if seen[externalID] {
		return pluginproto.ProviderItem{}
	}
	seen[externalID] = true
	var remote *string
	if updatedAt != "" {
		remote = &updatedAt
	}
	return pluginproto.ProviderItem{
		ExternalID: externalID, EntityType: "annotation",
		RemoteUpdatedAt: remote, Data: data,
	}
}

// toIntAny 把 JSON 数值（float64/int）转成 int。
func toIntAny(value any) (int, bool) {
	switch v := value.(type) {
	case float64:
		return int(v), true
	case int:
		return v, true
	}
	return 0, false
}

// firstOfAny 复刻 _first。
func firstOfAny(values ...any) any {
	for _, value := range values {
		if value != nil && value != "" {
			return value
		}
	}
	return ""
}

// pluginifaceCoverResultAlias 是 pluginiface.CoverResult 的本地别名。
type pluginifaceCoverResultAlias = pluginifaceCoverResult

// pluginifaceCoverResult 复刻封面结果。
type pluginifaceCoverResult = struct {
	Extension string
	Content   []byte
}

// 编译期引用保持。
var _ = url.Values{}
