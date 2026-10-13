// Package metasource 复刻 webserver/plugins/meta/*/api.py 与 plugin.py。
//
// 本文件实现 NeoDB 元数据源。
package metasource

import (
	"context"
	"fmt"
	"net/url"
	"path"
	"regexp"
	"strconv"
	"strings"

	"talebook/booksvr/internal/htmlx"
	"talebook/booksvr/internal/metabase"
	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/safehttp"
)

// NeoDBKey 复刻 KEY。
const NeoDBKey = "neodb"

// NeoDBBaseURL 复刻 _BASE_URL。
const NeoDBBaseURL = "https://neodb.social"

// NeoDBUA 复刻 _UA。
const NeoDBUA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
	"(KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36"

// neoDBHeaders 复刻 _HEADERS。
var neoDBHeaders = map[string]string{
	"User-Agent":      NeoDBUA,
	"Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
	"Accept-Language": "zh-CN,zh;q=0.9",
}

// NeoDBItem 是解析后的条目。
type NeoDBItem struct {
	CoverPath   string
	CoverURL    string
	Title       string
	URL         string
	Rating      string
	Author      string
	Publisher   string
	PubYear     string
	Description string
}

// ParseItemCard 复刻 _parse_item_card。
func ParseItemCard(article *htmlx.Node) NeoDBItem {
	var item NeoDBItem

	coverImg := article.SelectOne("div.cover img")
	item.CoverPath = coverImg.Attr("src")
	if strings.HasPrefix(item.CoverPath, "/") {
		item.CoverURL = NeoDBBaseURL + item.CoverPath
	} else {
		item.CoverURL = item.CoverPath
	}

	titleLink := article.SelectOne("hgroup h5 a")
	if titleLink != nil {
		item.Title = titleLink.Text()
		href := titleLink.Attr("href")
		if strings.HasPrefix(href, "/") {
			item.URL = NeoDBBaseURL + href
		} else {
			item.URL = href
		}
	}

	// 评分格式如 "8.6 (236 个评分)"。
	ratingSpan := article.SelectOne("div.multi-fields span.solo-hidden")
	if ratingSpan != nil {
		item.Rating = ratingSpan.TextSep(" ")
	}

	multiFields := article.SelectOne("div.multi-fields")
	if multiFields != nil {
		for _, span := range multiFields.FindAll("span", false) {
			if span.HasClass("solo-hidden") {
				continue
			}
			text := span.TextSep(" ")
			switch {
			case strings.Contains(text, "作者:") || strings.Contains(text, "作者："):
				inner := span.Find("span")
				if inner == nil {
					inner = span.Find("a")
				}
				if inner != nil {
					item.Author = inner.Text()
				} else {
					item.Author = splitAfterColon(text)
				}
			case strings.Contains(text, "publishing house:"):
				inner := span.Find("span")
				if inner != nil {
					item.Publisher = inner.Text()
				} else {
					item.Publisher = splitAfterColon(text)
				}
			default:
				fields := strings.Fields(text)
				if len(fields) > 0 && isFourDigitYear(fields[0]) {
					item.PubYear = fields[0]
				}
			}
		}
	}

	descDiv := article.SelectOne("div.full div")
	if descDiv != nil {
		item.Description = descDiv.TextSep(" ")
	}

	return item
}

// splitAfterColon 复刻 text.split(":", 1)[-1].strip()。
func splitAfterColon(text string) string {
	if i := strings.Index(text, ":"); i >= 0 {
		return strings.TrimSpace(text[i+1:])
	}
	return strings.TrimSpace(text)
}

// isFourDigitYear 判断是否为 4 位数字。
func isFourDigitYear(s string) bool {
	if len(s) != 4 {
		return false
	}
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}

// NeoDBSource 实现 NeoDB 元数据源。
type NeoDBSource struct {
	// HTTP 是受策略约束的 HTTP 客户端。
	HTTP *safehttp.SafeHttpClient
	// BaseURL 便于测试覆盖；为空时用 NeoDBBaseURL。
	BaseURL string
}

// NewNeoDBSource 构造 NeoDB 源。
func NewNeoDBSource(http *safehttp.SafeHttpClient) *NeoDBSource {
	if http == nil {
		http = &safehttp.SafeHttpClient{}
	}
	return &NeoDBSource{HTTP: http}
}

// baseURL 返回生效的基地址。
func (s *NeoDBSource) baseURL() string {
	if s.BaseURL != "" {
		return s.BaseURL
	}
	return NeoDBBaseURL
}

// Search 复刻 api.search：搜索 NeoDB 图书，返回解析后的条目列表。
//
// 请求失败返回空列表（对齐 Python 的日志 + 返回 []）。
func (s *NeoDBSource) Search(query string, maxCount int) []NeoDBItem {
	if maxCount <= 0 {
		maxCount = 1
	}
	target := fmt.Sprintf("%s/search?q=%s&c=book", s.baseURL(), url.QueryEscape(query))

	resp, err := s.HTTP.Get(context.Background(), target, safehttp.RequestOptions{
		Headers: neoDBHeaders, Timeout: 15e9, HasTimeout: true,
	})
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	body, err := readAll(resp.Body)
	if err != nil {
		return nil
	}
	doc, err := htmlx.Parse(string(body))
	if err != nil {
		return nil
	}

	articles := doc.Select("article.item-card")
	if len(articles) > maxCount {
		articles = articles[:maxCount]
	}
	results := make([]NeoDBItem, 0, len(articles))
	for _, article := range articles {
		results = append(results, ParseItemCard(article))
	}
	return results
}

// GetCover 复刻 api.get_cover：下载封面图片，返回 (fmt, bytes) 或 nil。
func (s *NeoDBSource) GetCover(coverURL string) *metabase.CoverResult {
	if coverURL == "" {
		return nil
	}
	u, err := url.Parse(coverURL)
	if err != nil {
		return nil
	}
	suffix := strings.TrimPrefix(path.Ext(u.Path), ".")
	if suffix == "" {
		suffix = "jpg"
	}

	resp, err := s.HTTP.Get(context.Background(), coverURL, safehttp.RequestOptions{
		Headers: neoDBHeaders, Timeout: 15e9, HasTimeout: true,
	})
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	if !strings.Contains(resp.Header.Get("Content-Type"), "image") {
		return nil
	}
	content, err := readAll(resp.Body)
	if err != nil {
		return nil
	}
	return &metabase.CoverResult{Extension: suffix, Content: content}
}

// ratingRe 复刻 re.match(r"([\d.]+)", rating_str.strip())。
var ratingRe = regexp.MustCompile(`^([\d.]+)`)

// ParseRating 复刻 _parse_rating：从 "8.6 (236 个评分)" 中提取浮点数评分。
func ParseRating(ratingStr string) (float64, bool) {
	m := ratingRe.FindStringSubmatch(strings.TrimSpace(ratingStr))
	if m == nil {
		return 0, false
	}
	v, err := strconv.ParseFloat(m[1], 64)
	if err != nil {
		return 0, false
	}
	return v, true
}

// BuildMetadata 复刻 api.build_metadata。
//
// Go 侧 calibre Metadata 以 map 承载，字段名与 Python 的 mi.* 属性一致。
func (s *NeoDBSource) BuildMetadata(item NeoDBItem, isbn string, copyImage bool) map[string]any {
	title := item.Title
	author := item.Author
	if author == "" {
		author = "佚名"
	}

	mi := map[string]any{
		"title":          title,
		"authors":        []any{author},
		"author":         author,
		"author_sort":    author,
		"publisher":      item.Publisher,
		"source":         "NeoDB",
		"provider_key":   NeoDBKey,
		"provider_value": item.URL,
		"website":        item.URL,
	}

	if isbn != "" {
		mi["isbn"] = isbn
	}
	if item.Description != "" {
		mi["comments"] = item.Description
	}
	if item.Rating != "" {
		if v, ok := ParseRating(item.Rating); ok {
			mi["rating"] = roundHalfUp(v)
		}
	}
	if isFourDigitYear(item.PubYear) {
		year, _ := strconv.Atoi(item.PubYear)
		mi["pubdate"] = fmt.Sprintf("%04d-01-01T00:00:00+00:00", year)
	}

	if item.CoverURL != "" {
		if copyImage {
			if cover := s.GetCover(item.CoverURL); cover != nil {
				mi["cover_data"] = []any{cover.Extension, cover.Content}
			}
		}
		mi["cover_url"] = item.CoverURL
	}
	return mi
}

// roundHalfUp 复刻 Python 的 round()：四舍六入五成双。
//
// Python 3 的 round 使用银行家舍入，这里保持一致。
func roundHalfUp(v float64) int {
	floor := int(v)
	diff := v - float64(floor)
	switch {
	case diff > 0.5:
		return floor + 1
	case diff < 0.5:
		return floor
	default:
		// 恰好 .5：取最近的偶数。
		if floor%2 == 0 {
			return floor
		}
		return floor + 1
	}
}

// NeoDBPlugin 复刻 NeodbMetaPlugin。
type NeoDBPlugin struct {
	Source *NeoDBSource
}

// NewNeoDBPlugin 构造插件。
func NewNeoDBPlugin(source *NeoDBSource) *NeoDBPlugin {
	if source == nil {
		source = NewNeoDBSource(nil)
	}
	return &NeoDBPlugin{Source: source}
}

// Search 复刻 NeodbMetaPlugin.search。
func (p *NeoDBPlugin) Search(title, isbn, publisher string) []map[string]any {
	query := isbn
	if query == "" {
		query = title
	}
	if query == "" {
		return nil
	}
	items := p.Source.Search(query, 1)
	results := make([]map[string]any, 0, len(items))
	for _, item := range items {
		results = append(results, p.Source.BuildMetadata(item, isbn, false))
	}
	return results
}

// SearchBest 复刻 NeodbMetaPlugin.search_best。
func (p *NeoDBPlugin) SearchBest(isbn, title string) map[string]any {
	query := isbn
	if query == "" {
		query = title
	}
	if query == "" {
		return nil
	}
	items := p.Source.Search(query, 1)
	if len(items) == 0 {
		return nil
	}
	return p.Source.BuildMetadata(items[0], isbn, true)
}

// GetMetadataByProvider 复刻 NeodbMetaPlugin.get_metadata_by_provider。
//
// 用与搜索时相同的 query（优先 isbn）重新搜索，匹配 provider_value
// （NeoDB 条目 URL）对应的条目。
func (p *NeoDBPlugin) GetMetadataByProvider(providerValue, isbn, title, coverURL string) map[string]any {
	query := isbn
	if query == "" {
		query = title
	}
	if query != "" {
		items := p.Source.Search(query, 10)
		for _, item := range items {
			if item.URL == providerValue {
				return p.Source.BuildMetadata(item, isbn, true)
			}
		}
	}
	// 兜底：对已有 cover_url 直接下载封面。
	if coverURL != "" {
		if cover := p.Source.GetCover(coverURL); cover != nil {
			return map[string]any{
				"cover_url":  coverURL,
				"cover_data": []any{cover.Extension, cover.Content},
			}
		}
	}
	return nil
}

// GetCover 复刻 NeodbMetaPlugin.get_cover。
func (p *NeoDBPlugin) GetCover(coverURL string) *metabase.CoverResult {
	return p.Source.GetCover(coverURL)
}

// NeoDBProvider 复刻 NeodbProvider：MetaSourceMixin + NeodbMetaPlugin。
type NeoDBProvider struct {
	*metabase.MetaSourceMixin
	Plugin *NeoDBPlugin
	// Manifest 是插件清单。
	ManifestDict map[string]any
}

// NewNeoDBProvider 构造 NeoDB provider。
func NewNeoDBProvider(source *NeoDBSource) *NeoDBProvider {
	plugin := NewNeoDBPlugin(source)
	p := &NeoDBProvider{
		Plugin: plugin,
		ManifestDict: metabase.MetaManifest(
			"talebook.meta.neodb", "NeoDB",
			"从 NeoDB 联邦书目检索书名、作者、出版与评分。",
			"mdi-database-search", "https://neodb.social/",
			metabase.ManifestOptions{BrandIcon: "/images/plugin-icons/neodb.svg"},
		),
	}
	mixin := metabase.NewMetaSourceMixin(p)
	// default_enabled = False, legacy_sources = ("neodb",)
	mixin.DefaultEnabled = false
	mixin.LegacySources = []string{"neodb"}
	p.MetaSourceMixin = mixin
	return p
}

// Manifest 实现 metabase.MetaSource。
func (p *NeoDBProvider) Manifest() map[string]any { return p.ManifestDict }

// Search 实现 metabase.MetaSource：复刻 _search。
func (p *NeoDBProvider) Search(query plugindomain.MetadataQuery, context map[string]any) ([]map[string]any, error) {
	return p.Plugin.Search(query.Title, query.ISBN, query.Publisher), nil
}

// Fetch 实现 metabase.MetaSource：复刻 _fetch。
func (p *NeoDBProvider) Fetch(externalID string, context map[string]any) (map[string]any, error) {
	return p.Plugin.GetMetadataByProvider(externalID, "", "", ""), nil
}
