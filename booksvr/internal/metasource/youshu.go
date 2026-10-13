package metasource

import (
	"context"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"

	"talebook/booksvr/internal/htmlx"
	"talebook/booksvr/internal/metabase"
	"talebook/booksvr/internal/safehttp"
)

// YoushuISBN 复刻 YOUSHU_ISBN。
const YoushuISBN = "0000000000002"

// YoushuKey 复刻 KEY。
const YoushuKey = "Youshu"

// YoushuBaseURL 复刻搜索与详情页的站点根。
const YoushuBaseURL = "https://www.youshu.me"

// YoushuTimeout 复刻请求超时（秒）。
const YoushuTimeout = 10

// youshuHeaders 复刻 CHROME_HEADERS。
var youshuHeaders = map[string]string{
	"Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.6",
	"Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
	"User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko)" +
		"Chrome/66.0.3359.139 Safari/537.36",
}

// youshuTitleStyle 复刻书名 span 的 style 属性值。
const youshuTitleStyle = "font-size:20px;font-weight:bold;color:#f27622;"

// youshuSummaryStyle 复刻简介 div 的 style 属性值。
const youshuSummaryStyle = "padding:3px;border:0;height:100%;width:100%;overflow-y:scroll;"

// YoushuInfo 复刻 get_info 的返回结构。
type YoushuInfo struct {
	Title  string
	Author string
}

// YoushuPage 复刻 YoushuPage：解析优书网书籍详情页。
type YoushuPage struct {
	URL  string
	Doc  *htmlx.Node
	HTML string
}

// NewYoushuPage 用给定 HTML 构造页面对象（不发起请求）。
func NewYoushuPage(pageURL, html string) (*YoushuPage, error) {
	doc, err := htmlx.Parse(html)
	if err != nil {
		return nil, err
	}
	return &YoushuPage{URL: pageURL, Doc: doc, HTML: html}, nil
}

// GetInfo 复刻 get_info。
//
// Python 侧对缺失节点直接 .text 会抛 AttributeError，这里返回零值，
// 由调用方按「解析失败」处理。
func (p *YoushuPage) GetInfo() YoushuInfo {
	info := YoushuInfo{}
	if title := p.Doc.FindBy("span", map[string]htmlx.AttrFilter{
		"style": htmlx.AttrEqualsFilter(youshuTitleStyle),
	}); title != nil {
		info.Title = title.Text()
	}
	if author := p.Doc.SelectOne(`a:not([class])[href*="authorarticle.php"]`); author != nil {
		info.Author = author.Text()
	}
	return info
}

// GetSummary 复刻 get_summary：注意用的是 .text.strip()，不做空白折叠。
func (p *YoushuPage) GetSummary() string {
	div := p.Doc.FindBy("div", map[string]htmlx.AttrFilter{
		"style": htmlx.AttrEqualsFilter(youshuSummaryStyle),
	})
	if div == nil {
		return ""
	}
	return pyStrip(div.Text())
}

// youshuCoverSizeRe 复刻 re.sub(r"/300$", "/600", href)。
var youshuCoverSizeRe = regexp.MustCompile(`/300$`)

// GetImage 复刻 get_image。
func (p *YoushuPage) GetImage() string {
	img := p.Doc.SelectOne("a.book-detail-img")
	if img == nil {
		return ""
	}
	href, ok := img.AttrOK("href")
	if !ok {
		return ""
	}
	return youshuCoverSizeRe.ReplaceAllString(href, "/600")
}

// youshuBookIDRe 复刻 re.search(r"/book/(\d+)", url)。
var youshuBookIDRe = regexp.MustCompile(`/book/(\d+)`)

// GetID 复刻 get_id：未命中回落 "0000"。
func (p *YoushuPage) GetID() string {
	if m := youshuBookIDRe.FindStringSubmatch(p.URL); m != nil {
		return m[1]
	}
	return "0000"
}

// GetTags 复刻 get_tags。
func (p *YoushuPage) GetTags() []string {
	tags := []string{}
	for _, tag := range p.Doc.Select(`a[href*="tagarticle"]`) {
		tags = append(tags, tag.Text())
	}
	return tags
}

// GetPlat 复刻 get_plat：取「首发网站」所在 td 的冒号后内容。
func (p *YoushuPage) GetPlat() string {
	td := p.Doc.FindByText("td", func(s string) bool { return strings.Contains(s, "首发网站") })
	if td == nil {
		return ""
	}
	parts := strings.Split(td.Text(), "：")
	return pyStrip(parts[len(parts)-1])
}

// GetRating 复刻 get_rating：int(float(text))，无法解析时返回 0。
//
// Python 侧解析失败会抛 ValueError，这里按「无评分」处理并返回 0。
func (p *YoushuPage) GetRating() int {
	rt := p.Doc.FindBy("span", map[string]htmlx.AttrFilter{"class": htmlx.ClassFilter("ratenum")})
	if rt == nil {
		return 0
	}
	f, err := strconv.ParseFloat(pyStrip(rt.Text()), 64)
	if err != nil {
		return 0
	}
	return int(f)
}

// YoushuSource 实现优书网元数据源。
type YoushuSource struct {
	// HTTP 是受策略约束的 HTTP 客户端。
	HTTP *safehttp.SafeHttpClient
	// BaseURL 便于测试覆盖；为空时用 YoushuBaseURL。
	BaseURL string
}

// NewYoushuSource 构造优书网源。
func NewYoushuSource(http *safehttp.SafeHttpClient) *YoushuSource {
	if http == nil {
		http = &safehttp.SafeHttpClient{}
	}
	return &YoushuSource{HTTP: http}
}

// baseURL 返回生效的基地址。
func (s *YoushuSource) baseURL() string {
	if s.BaseURL != "" {
		return s.BaseURL
	}
	return YoushuBaseURL
}

// SearchURL 复刻 YoushuSearch.search_url。
func (s *YoushuSource) SearchURL() string {
	return s.baseURL() + "/modules/article/search.php"
}

// Search 复刻 YoushuSearch.search。
//
// 响应含「搜索关键词」表示多结果，取列表第一条再请求详情页；
// 否则视为唯一命中，直接解析响应体。
func (s *YoushuSource) Search(keyword string) *YoushuPage {
	form := url.Values{}
	form.Set("searchtype", "all")
	form.Set("searchkey", keyword)
	form.Set("t_btnsearch", "")

	headers := make(map[string]string, len(youshuHeaders)+1)
	for k, v := range youshuHeaders {
		headers[k] = v
	}
	headers["Content-Type"] = "application/x-www-form-urlencoded"

	resp, err := s.HTTP.Post(context.Background(), s.SearchURL(), safehttp.RequestOptions{
		Headers: headers, Data: []byte(form.Encode()),
		Timeout: YoushuTimeout * 1e9, HasTimeout: true,
	})
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	body, err := readAll(resp.Body)
	if err != nil {
		return nil
	}
	html := string(body)

	if strings.Contains(html, "搜索关键词") {
		doc, err := htmlx.Parse(html)
		if err != nil {
			return nil
		}
		first := doc.SelectOne("span.c_subject a")
		if first == nil {
			return nil
		}
		href, ok := first.AttrOK("href")
		if !ok {
			return nil
		}
		return s.fetchPage(s.baseURL() + href)
	}

	page, err := NewYoushuPage(resp.Request.URL.String(), html)
	if err != nil {
		return nil
	}
	return page
}

// fetchPage 拉取详情页 HTML 并构造页面对象。
func (s *YoushuSource) fetchPage(pageURL string) *YoushuPage {
	resp, err := s.HTTP.Get(context.Background(), pageURL, safehttp.RequestOptions{
		Headers: youshuHeaders, Timeout: YoushuTimeout * 1e9, HasTimeout: true,
	})
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	body, err := readAll(resp.Body)
	if err != nil {
		return nil
	}
	page, err := NewYoushuPage(pageURL, string(body))
	if err != nil {
		return nil
	}
	return page
}

// GetBook 复刻 YoushuApi.get_book。
func (s *YoushuSource) GetBook(title string, copyImage bool) map[string]any {
	page := s.Search(title)
	if page == nil {
		return nil
	}
	return s.BuildMetadata(page, copyImage)
}

// BuildMetadata 复刻 YoushuApi._metadata。
func (s *YoushuSource) BuildMetadata(page *YoushuPage, copyImage bool) map[string]any {
	info := page.GetInfo()

	author := info.Author
	if author == "" {
		author = "佚名"
	}

	mi := map[string]any{
		"title":          info.Title,
		"authors":        []any{author},
		"author":         author,
		"author_sort":    author,
		"isbn":           YoushuISBN,
		"tags":           toAnySlice(page.GetTags()),
		"publisher":      page.GetPlat(),
		"cover_url":      nilIfEmpty(page.GetImage()),
		"comments":       page.GetSummary(),
		"website":        page.URL,
		"source":         "优书网",
		"provider_key":   YoushuKey,
		"provider_value": page.GetID(),
		"rating":         page.GetRating(),
	}

	mi["cover_data"] = nil
	if coverURL, _ := mi["cover_url"].(string); coverURL != "" {
		if copyImage {
			if cover := s.GetCover(coverURL); cover != nil {
				mi["cover_data"] = []any{cover.Extension, cover.Content}
			}
		}
	}
	return mi
}

// youshuCoverExtRe 复刻 cover_url.split(".")[-1]（无白名单，原样返回）。
var youshuCoverExtRe = regexp.MustCompile(`\.([^.]+)$`)

// GetCover 复刻 YoushuApi.get_cover。
//
// 与 biquge 不同：优书网不做扩展名白名单，直接取 URL 最后一段。
func (s *YoushuSource) GetCover(coverURL string) *metabase.CoverResult {
	if coverURL == "" {
		return nil
	}
	resp, err := s.HTTP.Get(context.Background(), coverURL, safehttp.RequestOptions{
		Headers: youshuHeaders, Timeout: YoushuTimeout * 1e9, HasTimeout: true,
	})
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil
	}
	img, err := readAll(resp.Body)
	if err != nil || len(img) == 0 {
		return nil
	}

	imgFmt := coverURL
	if m := youshuCoverExtRe.FindStringSubmatch(coverURL); m != nil {
		imgFmt = m[1]
	}
	return &metabase.CoverResult{Extension: imgFmt, Content: img}
}
