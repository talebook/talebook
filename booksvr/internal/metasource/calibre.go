package metasource

import (
	"context"
	"net/http"
	"sort"
	"strings"

	"talebook/booksvr/internal/metabase"
	"talebook/booksvr/internal/safehttp"
)

// CalibreKey 复刻 KEY。
const CalibreKey = "Calibre"

// 用户选择的信息源 key（复刻 webserver/constants.py）。
const (
	MetaSourceGoogle    = "google"
	MetaSourceAmazon    = "amazon"
	MetaSourceEdelweiss = "edelweiss"
)

// CalibreIdentifyWaitAfterFirstResult 复刻 IDENTIFY_WAIT_AFTER_FIRST_RESULT。
const CalibreIdentifyWaitAfterFirstResult = 2

// calibreSourceToPlugin 复刻 _SOURCE_TO_PLUGIN。
var calibreSourceToPlugin = map[string]string{
	MetaSourceGoogle:    "Google",
	MetaSourceAmazon:    "Amazon.com",
	MetaSourceEdelweiss: "Edelweiss",
}

// CalibreBundledPluginNames 复刻 _BUNDLED_PLUGIN_NAMES。
var CalibreBundledPluginNames = []string{
	"Google", "Amazon.com", "Edelweiss",
	"Big Book Search", "Google Images", "Open Library",
}

// CalibreAllowedPlugins 复刻 ALLOWED_PLUGINS。
var CalibreAllowedPlugins = []string{"Google", "Amazon.com", "Edelweiss"}

// calibreHeaders 复刻 constants.CHROME_HEADERS。
var calibreHeaders = map[string]string{
	"Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.6",
	"Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
	"User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko)" +
		"Chrome/66.0.3359.139 Safari/537.36",
}

// CalibreMetadataSourceUnavailable 复刻 CalibreMetadataSourceUnavailable。
type CalibreMetadataSourceUnavailable struct {
	Sources []string
	Reason  string
}

func (e *CalibreMetadataSourceUnavailable) Error() string {
	sorted := append([]string(nil), e.Sources...)
	sort.Strings(sorted)
	// 去重（排序后相邻比较）。
	uniq := sorted[:0]
	for i, s := range sorted {
		if i == 0 || s != sorted[i-1] {
			uniq = append(uniq, s)
		}
	}
	msg := "Calibre 元数据插件不可用：" + strings.Join(uniq, ", ")
	if e.Reason != "" {
		msg = msg + "（" + e.Reason + "）"
	}
	return msg
}

// CalibreQueries 复刻 _queries：按 _SOURCE_TO_PLUGIN 的声明顺序返回 (插件名, 来源名)。
//
// Python 的 dict 保留插入顺序（google、amazon、edelweiss）。
func CalibreQueries(sources []string) [][2]string {
	order := []string{MetaSourceGoogle, MetaSourceAmazon, MetaSourceEdelweiss}
	var out [][2]string
	for _, sourceName := range order {
		pluginName := calibreSourceToPlugin[sourceName]
		if containsString(sources, sourceName) {
			out = append(out, [2]string{pluginName, sourceName})
		}
	}
	return out
}

// CalibreIdentifyResult 是 identify 返回的单条结果（对应 Calibre 的 Metadata）。
type CalibreIdentifyResult struct {
	Title       string
	Authors     []string
	ISBN        string
	Rating      *int
	CoverURL    string
	Identifiers map[string]string
	// ProviderKey / ProviderValue / AuthorSort 由 _normalize_results 写入。
	ProviderKey   string
	ProviderValue string
	AuthorSort    string
	Source        string
}

// CalibreQuery 是 identify 的入参。
type CalibreQuery struct {
	ISBN    string
	Title   string
	Authors []string
}

// CalibreIdentifier 接口抽象 Calibre 的 identify 调用。
//
// 原实现直接调用 `calibre.ebooks.metadata.sources.identify.identify`；
// 目标运行时不含 Calibre，因此改为注入实现（由调用方提供等价检索能力）。
type CalibreIdentifier interface {
	// Identify 复刻 identify(log, abort, allowed_plugins={source}, timeout=..., **kwargs)。
	Identify(pluginName string, id CalibreQuery, timeout float64) ([]*CalibreIdentifyResult, error)
	// CachedCoverURL 复刻 amazon_plugin.get_cached_cover_url(identifiers)。
	CachedCoverURL(identifiers map[string]string) string
	// CachedCoverURLIsReliable 复刻 amazon_plugin.cached_cover_url_is_reliable。
	CachedCoverURLIsReliable() bool
}

// CalibreMetadataApi 复刻 CalibreMetadataApi。
type CalibreMetadataApi struct {
	// Identifier 是注入的 identify 实现；为 nil 时所有查询返回空。
	Identifier CalibreIdentifier
	// HTTP 是受策略约束的 HTTP 客户端（仅 get_cover 使用）。
	HTTP *safehttp.SafeHttpClient
}

// NewCalibreMetadataApi 构造 API。
func NewCalibreMetadataApi(identifier CalibreIdentifier, http *safehttp.SafeHttpClient) *CalibreMetadataApi {
	if http == nil {
		http = &safehttp.SafeHttpClient{}
	}
	return &CalibreMetadataApi{Identifier: identifier, HTTP: http}
}

// NormalizeResults 复刻 _normalize_results。
func (a *CalibreMetadataApi) NormalizeResults(results []*CalibreIdentifyResult, sourceName, providerValue string) []*CalibreIdentifyResult {
	normalized := make([]*CalibreIdentifyResult, 0, len(results))
	for _, r := range results {
		if r == nil {
			continue
		}
		r.ProviderKey = sourceName
		r.Source = sourceName
		if r.ISBN != "" {
			r.ProviderValue = r.ISBN
		} else {
			r.ProviderValue = providerValue
		}
		if len(r.Authors) > 0 {
			r.AuthorSort = r.Authors[0]
		} else {
			r.AuthorSort = ""
		}
		// Calibre identify 插件的评分是 0-5，转换为 Talebook 使用的 0-10。
		if r.Rating != nil {
			r.Rating = intPtr(*r.Rating * 2)
		} else {
			r.Rating = intPtr(0)
		}
		// Amazon 且缓存封面可靠时，用插件缓存的封面地址覆盖。
		if sourceName == MetaSourceAmazon && a.Identifier != nil && a.Identifier.CachedCoverURLIsReliable() {
			r.CoverURL = a.Identifier.CachedCoverURL(r.Identifiers)
		}
		normalized = append(normalized, r)
	}
	return normalized
}

// DedupeResults 复刻 _dedupe_results：按 (title, authors, isbn) 去重并截断到 5 条。
func DedupeResults(results []*CalibreIdentifyResult) []*CalibreIdentifyResult {
	deduped := make([]*CalibreIdentifyResult, 0, len(results))
	seen := map[string]bool{}
	for _, r := range results {
		if r == nil {
			continue
		}
		key := r.Title + "\x00" + strings.Join(r.Authors, "\x00") + "\x00" + r.ISBN
		if seen[key] {
			continue
		}
		seen[key] = true
		deduped = append(deduped, r)
	}
	if len(deduped) > 5 {
		deduped = deduped[:5]
	}
	return deduped
}

// intPtr 返回 int 指针。
func intPtr(v int) *int { return &v }

// GetBookByISBN 复刻 get_book_by_isbn。
func (a *CalibreMetadataApi) GetBookByISBN(isbn string, sources []string, timeout float64) ([]*CalibreIdentifyResult, error) {
	if len(sources) == 0 || isbn == "" {
		return nil, nil
	}
	queries := CalibreQueries(sources)
	sourceTimeout := calibreSourceTimeout(timeout, len(queries))

	var output []*CalibreIdentifyResult
	for _, q := range queries {
		pluginName, sourceName := q[0], q[1]
		results, err := a.identify(pluginName, CalibreQuery{ISBN: isbn}, sourceTimeout)
		if err != nil {
			var unavailable *CalibreMetadataSourceUnavailable
			if asCalibreUnavailable(err, &unavailable) {
				return nil, err
			}
			continue
		}
		output = append(output, a.NormalizeResults(results, sourceName, isbn)...)
	}
	return DedupeResults(output), nil
}

// GetBookByTitle 复刻 get_book_by_title。
func (a *CalibreMetadataApi) GetBookByTitle(title string, authors []string, sources []string, timeout float64) ([]*CalibreIdentifyResult, error) {
	if len(sources) == 0 || title == "" {
		return nil, nil
	}
	queries := CalibreQueries(sources)
	sourceTimeout := calibreSourceTimeout(timeout, len(queries))

	var output []*CalibreIdentifyResult
	for _, q := range queries {
		pluginName, sourceName := q[0], q[1]
		results, err := a.identify(pluginName, CalibreQuery{Title: title, Authors: authors}, sourceTimeout)
		if err != nil {
			var unavailable *CalibreMetadataSourceUnavailable
			if asCalibreUnavailable(err, &unavailable) {
				return nil, err
			}
			continue
		}
		output = append(output, a.NormalizeResults(results, sourceName, title)...)
	}
	return DedupeResults(output), nil
}

// identify 调用注入的实现，Identifier 为 nil 时返回空。
func (a *CalibreMetadataApi) identify(pluginName string, id CalibreQuery, timeout float64) ([]*CalibreIdentifyResult, error) {
	if a.Identifier == nil {
		return nil, nil
	}
	return a.Identifier.Identify(pluginName, id, timeout)
}

// calibreSourceTimeout 复刻 max(2, timeout / len(queries))。
func calibreSourceTimeout(timeout float64, queryCount int) float64 {
	if queryCount == 0 {
		return timeout
	}
	v := timeout / float64(queryCount)
	if v < 2 {
		return 2
	}
	return v
}

// asCalibreUnavailable 判断错误是否为 CalibreMetadataSourceUnavailable。
func asCalibreUnavailable(err error, target **CalibreMetadataSourceUnavailable) bool {
	if e, ok := err.(*CalibreMetadataSourceUnavailable); ok {
		*target = e
		return true
	}
	return false
}

// GetCover 复刻 get_cover：仅接受 https 地址，返回固定 "jpg"。
func (a *CalibreMetadataApi) GetCover(coverURL string) *metabase.CoverResult {
	if coverURL == "" {
		return nil
	}
	if !strings.HasPrefix(strings.ToLower(coverURL), "https://") {
		return nil
	}
	headers := make(map[string]string, len(calibreHeaders)+1)
	for k, v := range calibreHeaders {
		headers[k] = v
	}
	headers["Referer"] = coverURL

	resp, err := a.HTTP.Get(context.Background(), coverURL, safehttp.RequestOptions{
		Headers: headers, Timeout: 20e9, HasTimeout: true,
	})
	if err != nil {
		return nil
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil
	}
	img, err := readAll(resp.Body)
	if err != nil {
		return nil
	}
	return &metabase.CoverResult{Extension: "jpg", Content: img}
}

// CalibreSource 实现 Calibre 元数据源（复刻 CalibreProvider）。
type CalibreSource struct {
	API *CalibreMetadataApi
}

// NewCalibreSource 构造 Calibre 元数据源。
func NewCalibreSource(identifier CalibreIdentifier, http *safehttp.SafeHttpClient) *CalibreSource {
	return &CalibreSource{API: NewCalibreMetadataApi(identifier, http)}
}

// Sources 复刻 _sources：默认启用三个来源。
func (s *CalibreSource) Sources() []string {
	return []string{MetaSourceGoogle, MetaSourceAmazon, MetaSourceEdelweiss}
}

// Search 复刻 _search：优先 ISBN，其次书名。
func (s *CalibreSource) Search(isbn, title string, authors []string) ([]*CalibreIdentifyResult, error) {
	sources := s.Sources()
	if len(sources) == 0 {
		return nil, nil
	}
	var results []*CalibreIdentifyResult
	if isbn != "" {
		r, err := s.API.GetBookByISBN(isbn, sources, 30)
		if err != nil {
			return nil, err
		}
		results = r
	}
	if len(results) == 0 && title != "" {
		r, err := s.API.GetBookByTitle(title, authors, sources, 30)
		if err != nil {
			return nil, err
		}
		results = r
	}
	return results, nil
}

// Fetch 复刻 _fetch：按 ISBN 查，失败再按书名查，取第一条。
func (s *CalibreSource) Fetch(externalID string) (*CalibreIdentifyResult, error) {
	sources := s.Sources()
	records, err := s.API.GetBookByISBN(externalID, sources, 30)
	if err != nil {
		return nil, err
	}
	if len(records) == 0 {
		records, err = s.API.GetBookByTitle(externalID, nil, sources, 30)
		if err != nil {
			return nil, err
		}
	}
	if len(records) == 0 {
		return nil, nil
	}
	return records[0], nil
}

// GetCover 复刻 get_cover。
func (s *CalibreSource) GetCover(coverURL string) *metabase.CoverResult {
	return s.API.GetCover(coverURL)
}
