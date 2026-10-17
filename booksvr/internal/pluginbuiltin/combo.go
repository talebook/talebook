package pluginbuiltin

import (
	"encoding/json"
	"fmt"
	"io"
	"net/url"
	"regexp"
	"sort"
	"strings"
	"time"

	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginproto"
	"talebook/booksvr/internal/pluginruntime"
	"talebook/booksvr/internal/safehttp"
)

// comboUserAgent 复刻 combo/open_library.py 的 USER_AGENT。
const comboUserAgent = reviewUserAgent

// comboCapsOpenLibrary 是 Open Library 的能力声明。
func comboCapsOpenLibrary() pluginiface.CapabilitySet {
	return pluginiface.CapabilitySet{
		Interfaces: map[string]bool{"MetadataProvider": true, "ReviewProvider": true},
		HasExecute: true,
	}
}

// comboCapsWeread 是微信读书的能力声明。
func comboCapsWeread() pluginiface.CapabilitySet {
	return pluginiface.CapabilitySet{
		Interfaces: map[string]bool{
			"MetadataProvider": true, "AnnotationProvider": true, "ExtraFeatureProvider": true,
		},
		HasExecute: true,
	}
}

// registerComboProviders 注册 2 个组合插件。
//
// 顺序与 Python register.py 的 COMBO_PROVIDERS 一致（weread 在前）。
func registerComboProviders(reg *pluginruntime.PluginRegistry) error {
	providers := []pluginiface.Provider{
		newWereadProvider(),
		newOpenLibraryProvider(),
	}
	for _, p := range providers {
		caps := comboCapsOpenLibrary()
		if _, ok := p.(*WereadProvider); ok {
			caps = comboCapsWeread()
		}
		if _, err := reg.Register(p, caps); err != nil {
			return err
		}
	}
	return nil
}

// ---- Open Library ----

// OpenLibraryProvider 复刻 OpenLibraryProvider。
type OpenLibraryProvider struct {
	ManifestDict map[string]any
}

// newOpenLibraryProvider 构造 Open Library provider。
func newOpenLibraryProvider() *OpenLibraryProvider {
	return &OpenLibraryProvider{ManifestDict: map[string]any{
		"protocol_version": pluginproto.ProtocolVersion,
		"id":               "talebook.combo.open-library",
		"name":             "Open Library",
		"description":      "按 ISBN 获取 Open Library 元数据与可用评分，并生成逐字段安全候选。",
		"version":          "1.0.0",
		"categories":       []any{"metadata", "reviews"},
		"capabilities":     []any{"metadata.lookup", "reviews.lookup"},
		"runtime_kind":     "builtin",
		"actions":          []any{"test", "preview", "run", "retry", "rollback"},
		"auth_schema":      map[string]any{"type": "object", "properties": map[string]any{}},
		"config_schema": map[string]any{
			"type": "object", "properties": map[string]any{"queries": map[string]any{"type": "array"}},
		},
		"permissions":       []any{"books.read", "plugin_records.write", "network.read"},
		"data_policy":       map[string]any{"stores_full_text": false, "retention": "rating_summary_and_source_link"},
		"compatibility":     map[string]any{"talebook": ">=0.1.0"},
		"homepage":          "https://openlibrary.org/developers/api",
		"license":           "GPL-3.0",
		"ui":                map[string]any{"icon": "mdi-library-outline", "brand_icon": "/images/plugin-icons/open-library.png", "configuration_mode": "none", "primary_action": "details"},
		"connection_owners": []any{"instance"},
	}}
}

// Manifest 满足 pluginiface.Provider。
func (p *OpenLibraryProvider) Manifest() map[string]any { return p.ManifestDict }

// Invoke 实现 MethodDispatcher：全部委托 DispatchInvoke。
func (p *OpenLibraryProvider) Invoke(method string, args []any, context map[string]any) (any, error) {
	return DispatchInvoke(p, method, args, context)
}

// InitialConfig 复刻缺省行为：空配置。
func (p *OpenLibraryProvider) InitialConfig(settings map[string]any) map[string]any {
	return map[string]any{}
}

// openLibraryISBNRe 复刻 re.sub(r"[^0-9Xx]", "", ...)。
var openLibraryISBNRe = regexp.MustCompile(`[^0-9Xx]`)

// Execute 复刻 execute。
func (p *OpenLibraryProvider) Execute(context map[string]any) (pluginproto.ProviderResult, error) {
	endpoint := "https://openlibrary.org"
	config, _ := context["config"].(map[string]any)
	queries, _ := config["queries"].([]any)
	if asStringOr(context["action"], "") == "test" && len(queries) == 0 {
		if _, err := reviewHTTPJSON("GET", endpoint+"/search.json", nil,
			url.Values{"q": {"talebook"}, "limit": {"1"}}, nil, 30); err != nil {
			return pluginproto.ProviderResult{}, err
		}
		return pluginproto.ProviderResult{HealthMessage: "Open Library connection healthy"}, nil
	}

	targetIDs := map[string]bool{}
	if raw, ok := context["target_external_ids"].([]any); ok {
		for _, item := range raw {
			if s, ok := item.(string); ok {
				targetIDs[s] = true
			}
		}
	}
	items := []pluginproto.ProviderItem{}
	for _, raw := range queries {
		query, _ := raw.(map[string]any)
		if query == nil {
			query = map[string]any{}
		}
		isbn := openLibraryISBNRe.ReplaceAllString(stringOr(query["isbn"], ""), "")
		externalID := "openlibrary:" + isbn
		if isbn == "" {
			continue
		}
		payload, err := reviewHTTPJSON("GET", endpoint+"/api/books", nil,
			url.Values{"bibkeys": {"ISBN:" + isbn}, "format": {"json"}, "jscmd": {"data"}}, nil, 30)
		if err != nil {
			return pluginproto.ProviderResult{}, err
		}
		book, _ := payload["ISBN:"+isbn].(map[string]any)
		if book == nil {
			if len(targetIDs) == 0 || targetIDs[externalID] {
				items = append(items, pluginproto.ProviderItem{
					ExternalID:   externalID,
					EntityType:   "metadata",
					Data:         map[string]any{"source": "open_library", "isbn": isbn},
					ErrorCode:    "open_library.not_found",
					ErrorMessage: "Open Library has no record for this ISBN",
				})
			}
			continue
		}
		candidate := map[string]any{
			"title":     book["title"],
			"subtitle":  book["subtitle"],
			"authors":   openLibraryNames(book["authors"]),
			"publisher": firstOf(openLibraryNames(book["publishers"])),
			"published": book["publish_date"],
			"tags":      openLibraryNames(book["subjects"]),
			"cover_url": openLibraryCover(book),
			"isbn":      isbn,
		}
		var currentMetadata map[string]any
		if m, ok := query["current_metadata"].(map[string]any); ok {
			currentMetadata = m
		}
		var lockedFields []string
		if raw, ok := query["locked_fields"].([]any); ok {
			for _, item := range raw {
				if s, ok := item.(string); ok {
					lockedFields = append(lockedFields, s)
				}
			}
		}
		sourceURL := stringOr(book["url"], "https://openlibrary.org/isbn/"+isbn)
		data := map[string]any{
			"source":     "open_library",
			"book_id":    query["book_id"],
			"isbn":       isbn,
			"source_url": sourceURL,
			"fields":     openLibraryFieldDecisions(currentMetadata, candidate, lockedFields),
		}
		if len(targetIDs) == 0 || targetIDs[externalID] {
			items = append(items, pluginproto.ProviderItem{
				ExternalID: externalID, EntityType: "metadata", Data: data,
			})
		}
		rating, _ := book["ratings"].(map[string]any)
		if len(rating) == 0 {
			if key := stringOr(book["key"], ""); key != "" {
				edition, err := reviewHTTPJSON("GET", endpoint+key+".json", nil, nil, nil, 30)
				if err != nil {
					return pluginproto.ProviderResult{}, err
				}
				workKey := ""
				if works, ok := edition["works"].([]any); ok && len(works) > 0 {
					if work, ok := works[0].(map[string]any); ok {
						workKey = stringOr(work["key"], "")
					}
				}
				if workKey != "" {
					ratingsPayload, err := reviewHTTPJSON("GET", endpoint+workKey+"/ratings.json", nil, nil, nil, 30)
					if err != nil {
						return pluginproto.ProviderResult{}, err
					}
					rating, _ = ratingsPayload["summary"].(map[string]any)
				}
			}
		}
		if rating != nil && rating["average"] != nil &&
			(len(targetIDs) == 0 || targetIDs[externalID+":rating"]) {
			review := plugindomain.ReviewFromRating("open_library", externalID+":rating",
				rating["average"], 5, plugindomain.ReviewOptions{
					SampleCount: rating["count"],
					SourceURL:   sourceURL,
					SourceTime:  stringOr(rating["updated_at"], ""),
					BookID:      query["book_id"],
				}).ToDict()
			items = append(items, pluginproto.ProviderItem{
				ExternalID: externalID + ":rating", EntityType: "review", Data: review,
			})
		}
	}
	return pluginproto.ProviderResult{
		Items:         items,
		NextCursor:    map[string]any{"completed": true},
		HealthMessage: "Open Library query complete",
	}, nil
}

// openLibraryNames 复刻 _names。
func openLibraryNames(values any) []string {
	list, ok := values.([]any)
	if !ok {
		return nil
	}
	var out []string
	for _, item := range list {
		obj, ok := item.(map[string]any)
		if !ok {
			continue
		}
		name := strings.TrimSpace(stringOr(obj["name"], ""))
		if name != "" {
			out = append(out, name)
		}
	}
	return out
}

// openLibraryCover 复刻 `(book.get("cover") or {}).get("large") or .get("medium")`。
func openLibraryCover(book map[string]any) string {
	cover, _ := book["cover"].(map[string]any)
	if cover == nil {
		return ""
	}
	if large := stringOr(cover["large"], ""); large != "" {
		return large
	}
	return stringOr(cover["medium"], "")
}

// firstOf 返回列表首项或空串。
func firstOf(values []string) string {
	if len(values) == 0 {
		return ""
	}
	return values[0]
}

// openLibraryFieldDecisions 复刻 _field_decisions（与 metabase.BuildFieldDecisions 同构）。
func openLibraryFieldDecisions(current, candidate map[string]any, lockedFields []string) []map[string]any {
	locked := map[string]bool{}
	for _, f := range lockedFields {
		locked[f] = true
	}
	fields := make([]string, 0, len(candidate))
	for f := range candidate {
		fields = append(fields, f)
	}
	sort.Strings(fields)
	decisions := []map[string]any{}
	for _, field := range fields {
		proposed := candidate[field]
		if isEmptyAny(proposed) {
			continue
		}
		var existing any
		if current != nil {
			existing = current[field]
		}
		decision := "candidate"
		switch {
		case locked[field]:
			decision = "locked"
		case isEmptyAny(existing):
			decision = "fill_empty"
		case fmt.Sprintf("%v", existing) == fmt.Sprintf("%v", proposed):
			decision = "unchanged"
		}
		decisions = append(decisions, map[string]any{
			"field": field, "current": existing, "candidate": proposed,
			"decision": decision, "locked": locked[field],
			"will_apply": decision == "fill_empty",
		})
	}
	return decisions
}

// SearchBooks 复刻 search_books。
func (p *OpenLibraryProvider) SearchBooks(query plugindomain.MetadataQuery, context map[string]any) ([]plugindomain.BookMetadata, error) {
	value := query.ISBN
	if value == "" {
		value = query.Title
	}
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, nil
	}
	payload, err := reviewHTTPJSON("GET", "https://openlibrary.org/search.json", nil,
		url.Values{"q": {value}, "limit": {"20"}}, nil, 30)
	if err != nil {
		return nil, err
	}
	docs, _ := payload["docs"].([]any)
	records := make([]plugindomain.BookMetadata, 0, len(docs))
	for _, raw := range docs {
		item, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		isbn := ""
		if isbns, ok := item["isbn"].([]any); ok && len(isbns) > 0 {
			isbn = stringOr(isbns[0], "")
		}
		records = append(records, plugindomain.NewBookMetadata(map[string]any{
			"title":          stringOr(item["title"], ""),
			"authors":        item["author_name"],
			"isbn":           isbn,
			"provider_key":   "talebook.combo.open-library",
			"provider_value": stringOr(item["key"], ""),
		}))
	}
	return records, nil
}

var openLibraryKeyRe = regexp.MustCompile(`^/(?:works/OL[0-9]+W|books/OL[0-9]+M)$`)
var openLibraryAuthorRe = regexp.MustCompile(`^/authors/OL[0-9]+A$`)

// GetMetadata retrieves the selected work or edition instead of returning an empty candidate.
func (p *OpenLibraryProvider) GetMetadata(externalID string, context map[string]any) (*plugindomain.BookMetadata, error) {
	if !openLibraryKeyRe.MatchString(externalID) {
		return nil, pluginproto.NewUpstreamError("Open Library 书籍标识无效", "other", nil)
	}
	payload, err := reviewHTTPJSON("GET", "https://openlibrary.org"+externalID+".json", nil, nil, nil, 30)
	if err != nil {
		return nil, err
	}
	if stringOr(payload["title"], "") == "" {
		return nil, pluginproto.NewUpstreamError("Open Library 未返回书名", "other", nil)
	}
	authors := []string{}
	if list, ok := payload["authors"].([]any); ok {
		for i, raw := range list {
			if i >= 8 {
				break
			}
			entry, _ := raw.(map[string]any)
			if nested, ok := entry["author"].(map[string]any); ok {
				entry = nested
			}
			name := stringOr(entry["name"], "")
			key := stringOr(entry["key"], "")
			if name == "" && openLibraryAuthorRe.MatchString(key) {
				author, fetchErr := reviewHTTPJSON("GET", "https://openlibrary.org"+key+".json", nil, nil, nil, 30)
				if fetchErr != nil {
					return nil, fetchErr
				}
				name = stringOr(author["name"], "")
			}
			if name != "" {
				authors = append(authors, name)
			}
		}
	}
	description := payload["description"]
	if value, ok := description.(map[string]any); ok {
		description = value["value"]
	}
	cover := ""
	if covers, ok := payload["covers"].([]any); ok && len(covers) > 0 {
		if id, ok := covers[0].(float64); ok && id > 0 {
			cover = fmt.Sprintf("https://covers.openlibrary.org/b/id/%.0f-L.jpg", id)
		}
	}
	isbn := ""
	for _, field := range []string{"isbn_13", "isbn_10"} {
		if values, ok := payload[field].([]any); ok && len(values) > 0 {
			isbn = stringOr(values[0], "")
			break
		}
	}
	record := plugindomain.NewBookMetadata(map[string]any{
		"provider_key":   "talebook.combo.open-library",
		"provider_value": externalID,
		"title":          payload["title"], "authors": authors, "comments": description,
		"tags": payload["subjects"], "publisher": firstOf(stringList(payload["publishers"])),
		"published": payload["publish_date"], "isbn": isbn, "cover_url": cover,
	})
	return &record, nil
}

// GetCover downloads a selected cover through the shared endpoint policy.
func (p *OpenLibraryProvider) GetCover(coverURL string, context map[string]any) (*pluginiface.CoverResult, error) {
	coverEndpoint, err := url.Parse(coverURL)
	if err != nil || coverEndpoint.Scheme != "https" || coverEndpoint.Hostname() != "covers.openlibrary.org" || (coverEndpoint.Port() != "" && coverEndpoint.Port() != "443") {
		return nil, pluginproto.NewUpstreamError("Open Library 封面地址无效", "other", nil)
	}
	client := *reviewHTTPClient
	client.EnforcePublicAddress = true
	response, err := client.Get(nil, coverURL, safehttp.RequestOptions{Timeout: 30 * time.Second, HasTimeout: true, AllowRedirect: openLibraryCoverRedirect})
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	extension := "jpg"
	switch strings.Split(response.Header.Get("Content-Type"), ";")[0] {
	case "image/jpeg":
	case "image/png":
		extension = "png"
	case "image/webp":
		extension = "webp"
	default:
		return nil, pluginproto.NewUpstreamError("Open Library 封面响应不是图片", "other", nil)
	}
	content, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, err
	}
	return &pluginiface.CoverResult{Extension: extension, Content: content}, nil
}

// openLibraryCoverRedirect admits only HTTPS Internet Archive image storage destinations.
func openLibraryCoverRedirect(target *url.URL) bool {
	if target == nil || target.Scheme != "https" || (target.Port() != "" && target.Port() != "443") {
		return false
	}
	host := strings.ToLower(target.Hostname())
	return host == "archive.org" || strings.HasSuffix(host, ".archive.org")
}

// GetReviews 复刻 get_reviews。
func (p *OpenLibraryProvider) GetReviews(query any, context map[string]any) (plugindomain.Page, error) {
	queryMap, _ := query.(map[string]any)
	if queryMap == nil {
		queryMap = map[string]any{}
	}
	runContext := map[string]any{}
	for k, v := range context {
		runContext[k] = v
	}
	config := map[string]any{}
	if raw, ok := context["config"].(map[string]any); ok {
		for k, v := range raw {
			config[k] = v
		}
	}
	config["queries"] = []any{queryMap}
	runContext["action"] = "run"
	runContext["config"] = config
	result, err := p.Execute(runContext)
	if err != nil {
		return plugindomain.Page{}, err
	}
	var items []any
	var failures []plugindomain.ItemFailure
	for _, item := range result.Items {
		if item.EntityType != "review" {
			continue
		}
		if item.ErrorCode != "" {
			failures = append(failures, plugindomain.ItemFailure{
				ExternalID: item.ExternalID, ErrorCode: item.ErrorCode, ErrorMessage: item.ErrorMessage,
			})
			continue
		}
		if m, ok := item.Data.(map[string]any); ok {
			items = append(items, plugindomain.Review{DomainRecord: plugindomain.NewDomainRecord(m)})
		}
	}
	return plugindomain.Page{
		Items: items, Failures: failures,
		NextCursor: result.NextCursor, HealthMessage: result.HealthMessage,
	}, nil
}

// 编译期断言。
var (
	_ pluginiface.MetadataProvider = (*OpenLibraryProvider)(nil)
	_ pluginiface.ReviewProvider   = (*OpenLibraryProvider)(nil)
	_                              = json.Marshal
)
