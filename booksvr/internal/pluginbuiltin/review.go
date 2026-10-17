package pluginbuiltin

import (
	"encoding/json"
	"fmt"
	"io"
	"net/url"
	"strconv"
	"strings"
	"time"

	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginproto"
	"talebook/booksvr/internal/pluginruntime"
	"talebook/booksvr/internal/safehttp"
)

// reviewUserAgent 复刻 review/base.py 的 USER_AGENT。
const reviewUserAgent = "Talebook plugin connector/1.0 (+https://github.com/talebook/talebook)"

// reviewHTTPClient 是评价源的共享 HTTP 客户端。
var reviewHTTPClient = &safehttp.SafeHttpClient{}

// reviewHTTPJSON 复刻 http_json。
func reviewHTTPJSON(method, target string, headers map[string]string,
	params url.Values, body any, timeout int) (map[string]any, error) {
	merged := map[string]string{
		"Accept":     "application/json",
		"User-Agent": reviewUserAgent,
	}
	for k, v := range headers {
		merged[k] = v
	}
	opts := safehttp.RequestOptions{
		Headers: merged, Timeout: time.Duration(timeout) * time.Second, HasTimeout: true,
}
	if params != nil {
		opts.Params = params
	}
	if body != nil {
		opts.JSON = body
	}
	resp, err := reviewHTTPClient.Request(nil, method, target, opts)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, pluginproto.NewUpstreamError("Upstream response could not be read", "other", nil)
	}
	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		return nil, pluginproto.NewUpstreamError("Upstream response is not valid JSON", "other", nil)
	}
	return payload, nil
}

// reviewSourceSpec 复刻 ReviewSourceSpec。
type reviewSourceSpec struct {
	PluginID      string
	Key           string
	Name          string
	Homepage      string
	Icon          string
	Scale         float64
	BrandIcon     string
	RequiresToken bool
}

// reviewCaps 是评价源的能力声明。
func reviewCaps() pluginiface.CapabilitySet {
	return pluginiface.CapabilitySet{
		Interfaces: map[string]bool{"ReviewProvider": true},
		HasExecute: true,
	}
}

// registerReviewProviders 注册 6 个评价源。
//
// 顺序与 Python register.py 的 REVIEW_PROVIDERS 一致。
func registerReviewProviders(reg *pluginruntime.PluginRegistry) error {
	providers := []pluginiface.Provider{
		newCatalogReviewProvider(hardcoverSpec(), hardcoverFetch, hardcoverParse),
		newCatalogReviewProvider(neodbReviewSpec(), neodbReviewFetch, neodbReviewParse),
		newCatalogReviewProvider(googleBooksSpec(), googleBooksFetch, googleBooksParse),
		newCatalogReviewProvider(bangumiSpec(), bangumiFetch, bangumiParse),
		newCatalogReviewProvider(anilistSpec(), anilistFetch, anilistParse),
		newReviewFileProvider(),
	}
	for _, p := range providers {
		if _, err := reg.Register(p, reviewCaps()); err != nil {
			return err
		}
	}
	return nil
}

// 各源 SPEC（照 Python）。
func hardcoverSpec() reviewSourceSpec {
	return reviewSourceSpec{
		PluginID: "talebook.review.hardcover", Key: "hardcover", Name: "Hardcover",
		Homepage: "https://hardcover.app", Icon: "mdi-book-star-outline",
		Scale: 5, BrandIcon: "/images/plugin-icons/hardcover.png", RequiresToken: true,
	}
}

func neodbReviewSpec() reviewSourceSpec {
	return reviewSourceSpec{
		PluginID: "talebook.review.neodb", Key: "neodb", Name: "NeoDB 评价",
		Homepage: "https://neodb.social", Icon: "mdi-star-circle-outline",
		Scale: 10, BrandIcon: "/images/plugin-icons/neodb.svg",
	}
}

func googleBooksSpec() reviewSourceSpec {
	return reviewSourceSpec{
		PluginID: "talebook.review.google-books", Key: "google_books", Name: "Google Books 评价",
		Homepage: "https://books.google.com", Icon: "mdi-google",
		Scale: 5, BrandIcon: "/images/plugin-icons/google-books.ico",
	}
}

func bangumiSpec() reviewSourceSpec {
	return reviewSourceSpec{
		PluginID: "talebook.review.bangumi", Key: "bangumi", Name: "Bangumi 漫画评价",
		Homepage: "https://bgm.tv", Icon: "mdi-book-open-outline",
		Scale: 10, BrandIcon: "/images/plugin-icons/bangumi.png",
	}
}

func anilistSpec() reviewSourceSpec {
	return reviewSourceSpec{
		PluginID: "talebook.review.anilist", Key: "anilist", Name: "AniList 漫画评价",
		Homepage: "https://anilist.co", Icon: "mdi-format-list-numbered",
		Scale: 100, BrandIcon: "/images/plugin-icons/anilist.png",
	}
}

// reviewManifest 复刻 review_manifest。
func reviewManifest(spec reviewSourceSpec) map[string]any {
	auth := map[string]any{"type": "object", "properties": map[string]any{}}
	if spec.RequiresToken {
		auth = map[string]any{
			"type": "object",
			"properties": map[string]any{
				"token": map[string]any{"type": "string", "writeOnly": true},
			},
			"required": []any{"token"},
		}
	}
	ui := map[string]any{
		"icon":           spec.Icon,
		"brand_icon":     spec.BrandIcon,
		"primary_action": "configure",
	}
	return map[string]any{
		"protocol_version": pluginproto.ProtocolVersion,
		"id":               spec.PluginID,
		"name":             spec.Name,
		"description":      "保留 " + spec.Name + " 原始评分尺度、样本数、时间和来源链接。",
		"version":          "1.0.0",
		"categories":       []any{"reviews"},
		"capabilities":     []any{"reviews.lookup"},
		"runtime_kind":     "builtin",
		"actions":          []any{"test", "preview", "run", "retry", "rollback"},
		"auth_schema":      auth,
		"config_schema":    map[string]any{"type": "object", "properties": map[string]any{"queries": map[string]any{"type": "array"}}},
		"permissions":      []any{"books.read", "plugin_records.write", "network.read"},
		"data_policy":      map[string]any{"stores_full_text": false, "retention": "rating_summary_and_source_link"},
		"compatibility":    map[string]any{"talebook": ">=0.1.0"},
		"homepage":         spec.Homepage,
		"license":          "GPL-3.0",
		"ui":               ui,
		"connection_owners": []any{"instance"},
	}
}

// reviewFetchFunc 复刻 _fetch：返回 (external_id, payload)。
type reviewFetchFunc func(context map[string]any, query map[string]any) (string, map[string]any, error)

// reviewParseFunc 复刻 _parse：返回 review dict。
type reviewParseFunc func(spec reviewSourceSpec, query map[string]any, externalID string, payload map[string]any) (map[string]any, error)

// CatalogReviewProvider 复刻 CatalogReviewProvider。
type CatalogReviewProvider struct {
	Spec       reviewSourceSpec
	Manifest_  map[string]any
	Fetch      reviewFetchFunc
	Parse      reviewParseFunc
}

// newCatalogReviewProvider 构造目录评价源。
func newCatalogReviewProvider(spec reviewSourceSpec, fetch reviewFetchFunc, parse reviewParseFunc) *CatalogReviewProvider {
	return &CatalogReviewProvider{Spec: spec, Manifest_: reviewManifest(spec), Fetch: fetch, Parse: parse}
}

// Manifest 满足 pluginiface.Provider。
func (p *CatalogReviewProvider) Manifest() map[string]any { return p.Manifest_ }

// Invoke 实现 MethodDispatcher：全部委托 DispatchInvoke。
func (p *CatalogReviewProvider) Invoke(method string, args []any, context map[string]any) (any, error) {
	return DispatchInvoke(p, method, args, context)
}

// InitialConfig 复刻缺省行为：空配置。
func (p *CatalogReviewProvider) InitialConfig(settings map[string]any) map[string]any {
	return map[string]any{}
}

// Execute 复刻 execute。
func (p *CatalogReviewProvider) Execute(context map[string]any) (pluginproto.ProviderResult, error) {
	config, _ := context["config"].(map[string]any)
	queries, _ := config["queries"].([]any)
	if asStringOr(context["action"], "") == "test" && len(queries) == 0 {
		return pluginproto.ProviderResult{
			HealthMessage: p.Spec.Name + " configuration valid",
		}, nil
	}
	targets := map[string]bool{}
	if raw, ok := context["target_external_ids"].([]any); ok {
		for _, item := range raw {
			if s, ok := item.(string); ok {
				targets[s] = true
			}
		}
	}
	items := []pluginproto.ProviderItem{}
	for _, raw := range queries {
		query, _ := raw.(map[string]any)
		if query == nil {
			query = map[string]any{}
		}
		externalID, payload, err := p.Fetch(context, query)
		if err != nil {
			return pluginproto.ProviderResult{}, err
		}
		if len(targets) > 0 && !targets[externalID] {
			continue
		}
		data, err := p.Parse(p.Spec, query, externalID, payload)
		if err != nil {
			items = append(items, pluginproto.ProviderItem{
				ExternalID:   externalID,
				EntityType:   "review",
				Data:         map[string]any{"source": p.Spec.Key},
				ErrorCode:    p.Spec.Key + ".invalid_response",
				ErrorMessage: "Provider response has no usable rating: " + err.Error(),
			})
			continue
		}
		sourceTime, _ := data["source_time"].(string)
		items = append(items, pluginproto.ProviderItem{
			ExternalID:      externalID,
			EntityType:      "review",
			Data:            data,
			RemoteUpdatedAt: &sourceTime,
		})
	}
	return pluginproto.ProviderResult{
		Items:         items,
		NextCursor:    map[string]any{"completed": true},
		HealthMessage: p.Spec.Name + " query complete",
	}, nil
}

// GetReviews 复刻 get_reviews。
func (p *CatalogReviewProvider) GetReviews(query any, context map[string]any) (plugindomain.Page, error) {
	queryMap, _ := query.(map[string]any)
	if queryMap == nil {
		queryMap = map[string]any{}
	}
	externalID := p.Spec.Key + ":unknown"
	externalID, payload, err := p.Fetch(context, queryMap)
	if err == nil {
		var data map[string]any
		data, err = p.Parse(p.Spec, queryMap, externalID, payload)
		if err == nil {
			return plugindomain.Page{
				Items: []any{plugindomain.Review{DomainRecord: plugindomain.NewDomainRecord(data)}},
			}, nil
		}
	}
	return plugindomain.Page{
		Failures: []plugindomain.ItemFailure{{
			ExternalID:   externalID,
			ErrorCode:    p.Spec.Key + ".invalid_response",
			ErrorMessage: "Provider response has no usable rating: " + err.Error(),
		}},
	}, nil
}

// reviewQueryValue 取 query 里的字符串字段。
func reviewQueryValue(query map[string]any, key string) string {
	value, _ := query[key].(string)
	return value
}

// ---- Hardcover ----

func hardcoverFetch(context map[string]any, query map[string]any) (string, map[string]any, error) {
	secrets, _ := context["secrets"].(map[string]any)
	token, _ := secrets["token"].(string)
	isbn := reviewQueryValue(query, "isbn")
	headers := map[string]string{}
	if token != "" {
		headers["Authorization"] = "Bearer " + token
	}
	body := map[string]any{
		"query":     "query($isbn:String!){books(where:{editions:{isbn_13:{_eq:$isbn}}},limit:1){id slug rating rating_count users_read_count}}",
		"variables": map[string]any{"isbn": isbn},
	}
	payload, err := reviewHTTPJSON("POST", "https://api.hardcover.app/v1/graphql", headers, nil, body, 30)
	return "hardcover:" + isbn, payload, err
}

func hardcoverParse(spec reviewSourceSpec, query map[string]any, externalID string, payload map[string]any) (map[string]any, error) {
	data, _ := payload["data"].(map[string]any)
	books, _ := data["books"].([]any)
	if len(books) == 0 {
		return nil, fmt.Errorf("rating is missing")
	}
	value, _ := books[0].(map[string]any)
	rating := value["rating"]
	if rating == nil {
		return nil, fmt.Errorf("rating is missing")
	}
	// Python：slug 键存在时原样使用（含空串），缺失时才回退 id。
	slug, hasSlug := value["slug"]
	if !hasSlug {
		slug = value["id"]
	}
	slugStr, _ := slug.(string)
	if slugStr == "" {
		slugStr = fmt.Sprintf("%v", slug)
	}
	sampleCount := orValue(value["rating_count"], value["users_read_count"])
	return plugindomain.ReviewFromRating(spec.Key, externalID, rating, spec.Scale, plugindomain.ReviewOptions{
		SampleCount: sampleCount,
		SourceURL:   "https://hardcover.app/books/" + slugStr,
		BookID:      query["book_id"],
		DomainID:    reviewQueryValue(query, "domain_id"),
		SeriesID:    reviewQueryValue(query, "series_id"),
	}).ToDict(), nil
}

// ---- NeoDB 评价 ----

func neodbReviewFetch(context map[string]any, query map[string]any) (string, map[string]any, error) {
	secrets, _ := context["secrets"].(map[string]any)
	token, _ := secrets["token"].(string)
	key := reviewQueryValue(query, "isbn")
	if key == "" {
		key = reviewQueryValue(query, "title")
	}
	headers := map[string]string{}
	if token != "" {
		headers["Authorization"] = "Bearer " + token
	}
	params := url.Values{"query": {key}}
	payload, err := reviewHTTPJSON("GET", "https://neodb.social/api/catalog/search", headers, params, nil, 30)
	return "neodb:" + key, payload, err
}

func neodbReviewParse(spec reviewSourceSpec, query map[string]any, externalID string, payload map[string]any) (map[string]any, error) {
	list, _ := payload["data"].([]any)
	if len(list) == 0 {
		list, _ = payload["results"].([]any)
	}
	if len(list) == 0 {
		return nil, fmt.Errorf("rating is missing")
	}
	value, _ := list[0].(map[string]any)
	rating := orValue(value["rating"], value["rating_score"])
	if rating == nil {
		return nil, fmt.Errorf("rating is missing")
	}
	sampleCount := orValue(value["rating_count"], value["rating_number"])
	sourceURL := ""
	if v, ok := value["url"].(string); ok {
		sourceURL = v
	} else if v, ok := value["id"].(string); ok {
		sourceURL = v
	}
	sourceTime, _ := value["updated_at"].(string)
	return plugindomain.ReviewFromRating(spec.Key, externalID, rating, spec.Scale, plugindomain.ReviewOptions{
		SampleCount: sampleCount,
		SourceURL:   sourceURL,
		SourceTime:  sourceTime,
		BookID:      query["book_id"],
		DomainID:    reviewQueryValue(query, "domain_id"),
		SeriesID:    reviewQueryValue(query, "series_id"),
	}).ToDict(), nil
}

// ---- Google Books ----

func googleBooksFetch(context map[string]any, query map[string]any) (string, map[string]any, error) {
	isbn := reviewQueryValue(query, "isbn")
	params := url.Values{"q": {"isbn:" + isbn}}
	payload, err := reviewHTTPJSON("GET", "https://www.googleapis.com/books/v1/volumes", nil, params, nil, 30)
	return "google-books:" + isbn, payload, err
}

func googleBooksParse(spec reviewSourceSpec, query map[string]any, externalID string, payload map[string]any) (map[string]any, error) {
	items, _ := payload["items"].([]any)
	if len(items) == 0 {
		return nil, fmt.Errorf("rating is missing")
	}
	value, _ := items[0].(map[string]any)
	info, _ := value["volumeInfo"].(map[string]any)
	if info == nil {
		info = map[string]any{}
	}
	rating := info["averageRating"]
	if rating == nil {
		return nil, fmt.Errorf("rating is missing")
	}
	sourceURL, _ := info["infoLink"].(string)
	if sourceURL == "" {
		sourceURL, _ = value["selfLink"].(string)
	}
	sourceTime, _ := info["publishedDate"].(string)
	return plugindomain.ReviewFromRating(spec.Key, externalID, rating, spec.Scale, plugindomain.ReviewOptions{
		SampleCount: info["ratingsCount"],
		SourceURL:   sourceURL,
		SourceTime:  sourceTime,
		BookID:      query["book_id"],
		DomainID:    reviewQueryValue(query, "domain_id"),
		SeriesID:    reviewQueryValue(query, "series_id"),
	}).ToDict(), nil
}

// ---- Bangumi ----

func bangumiFetch(context map[string]any, query map[string]any) (string, map[string]any, error) {
	subjectID := reviewQueryValue(query, "domain_id")
	payload, err := reviewHTTPJSON("GET",
		"https://api.bgm.tv/v0/subjects/"+url.PathEscape(subjectID), nil, nil, nil, 30)
	return "bangumi:" + subjectID, payload, err
}

func bangumiParse(spec reviewSourceSpec, query map[string]any, externalID string, payload map[string]any) (map[string]any, error) {
	ratingMap, _ := payload["rating"].(map[string]any)
	if ratingMap == nil {
		ratingMap = map[string]any{}
	}
	rating := ratingMap["score"]
	if rating == nil {
		return nil, fmt.Errorf("rating is missing")
	}
	sourceTime, _ := payload["date"].(string)
	return plugindomain.ReviewFromRating(spec.Key, externalID, rating, spec.Scale, plugindomain.ReviewOptions{
		SampleCount: ratingMap["total"],
		SourceURL:   "https://bgm.tv/subject/" + reviewQueryValue(query, "domain_id"),
		SourceTime:  sourceTime,
		BookID:      query["book_id"],
		DomainID:    reviewQueryValue(query, "domain_id"),
		SeriesID:    reviewQueryValue(query, "series_id"),
	}).ToDict(), nil
}

// ---- AniList ----

func anilistFetch(context map[string]any, query map[string]any) (string, map[string]any, error) {
	mediaID := reviewQueryValue(query, "domain_id")
	numericID, err := strconv.Atoi(strings.TrimSpace(mediaID))
	if err != nil {
		// Python int(media_id) 抛 ValueError 且 execute 不捕获（整个 run 失败）。
		return "", nil, err
	}
	body := map[string]any{
		"query":     "query($id:Int){Media(id:$id,type:MANGA){id siteUrl averageScore popularity updatedAt}}",
		"variables": map[string]any{"id": numericID},
	}
	payload, err := reviewHTTPJSON("POST", "https://graphql.anilist.co", nil, nil, body, 30)
	return "anilist:" + mediaID, payload, err
}

func anilistParse(spec reviewSourceSpec, query map[string]any, externalID string, payload map[string]any) (map[string]any, error) {
	data, _ := payload["data"].(map[string]any)
	media, _ := data["Media"].(map[string]any)
	if media == nil {
		media = map[string]any{}
	}
	rating := media["averageScore"]
	if rating == nil {
		return nil, fmt.Errorf("rating is missing")
	}
	sourceTime := ""
	if updatedAt, ok := media["updatedAt"].(float64); ok && updatedAt > 0 {
		sourceTime = unixToISO(int64(updatedAt))
	}
	siteURL, _ := media["siteUrl"].(string)
	return plugindomain.ReviewFromRating(spec.Key, externalID, rating, spec.Scale, plugindomain.ReviewOptions{
		SampleCount: media["popularity"],
		SourceURL:   siteURL,
		SourceTime:  sourceTime,
		BookID:      query["book_id"],
		DomainID:    reviewQueryValue(query, "domain_id"),
		SeriesID:    reviewQueryValue(query, "series_id"),
	}).ToDict(), nil
}

// orValue 返回第一个非空值。
func orValue(values ...any) any {
	for _, value := range values {
		if !isEmptyAny(value) {
			return value
		}
	}
	return nil
}

// isEmptyAny 复刻 EMPTY_VALUES = (None, "", [], {})。
func isEmptyAny(v any) bool {
	switch value := v.(type) {
	case nil:
		return true
	case string:
		return value == ""
	case []any:
		return len(value) == 0
	case map[string]any:
		return len(value) == 0
	}
	return false
}

// unixToISO 复刻 datetime.fromtimestamp(ts, timezone.utc).isoformat()
// （Python 恒保留 6 位微秒，含尾零）。
func unixToISO(ts int64) string {
	return time.Unix(ts, 0).UTC().Format("2006-01-02T15:04:05.000000+00:00")
}
