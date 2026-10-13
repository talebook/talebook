package metasource

import (
	"context"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"

	"talebook/booksvr/internal/htmlx"
	"talebook/booksvr/internal/metabase"
	"talebook/booksvr/internal/safehttp"
)

// BiqugeISBN 复刻 BIQUGE_ISBN。
const BiqugeISBN = "0000000000004"

// BiqugeKey 复刻 KEY。
const BiqugeKey = "Biquge"

// BiqugeBaseURL 复刻 BASE_URL。
const BiqugeBaseURL = "http://www.xbiqugu.la"

// BiqugeTimeout 复刻 TIMEOUT（秒）。
const BiqugeTimeout = 15

// biqugeHeaders 复刻 CHROME_HEADERS。
var biqugeHeaders = map[string]string{
	"Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.6",
	"Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
	"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
		"(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
}

// cleanText 复刻 _clean_text：折叠空白并去首尾。
//
// 注意：Python 的 `\s` 是 Unicode 感知的，会匹配 U+3000 等字符，
// 因此这里用 pyCleanText 而非 Go 的 ASCII 正则。
func cleanText(text string) string {
	return pyCleanText(text)
}

// BiqugeInfo 复刻 get_info 的返回结构。
type BiqugeInfo struct {
	Title         string
	Author        string
	Category      string
	LatestChapter string
}

// BiqugePage 复刻 BiqugePage：解析笔趣阁书籍详情页。
type BiqugePage struct {
	URL  string
	Doc  *htmlx.Node
	HTML string
}

// NewBiqugePage 用给定 HTML 构造页面对象（不发起请求）。
func NewBiqugePage(pageURL, html string) (*BiqugePage, error) {
	doc, err := htmlx.Parse(html)
	if err != nil {
		return nil, err
	}
	return &BiqugePage{URL: pageURL, Doc: doc, HTML: html}, nil
}

// authorRe 复刻 re.sub(r"作\s*者[：:]", "", line)。
//
// Python 的 `\s` 含 U+3000，故显式列出空白字符类。
var authorRe = regexp.MustCompile(`作[\s\x{00a0}\x{1680}\x{2000}-\x{200a}\x{2028}\x{2029}\x{202f}\x{205f}\x{3000}]*者[：:]`)

// latestChapterRe 复刻 re.sub(r"最新章节[：:]", "", line)。
var latestChapterRe = regexp.MustCompile(`最新章节[：:]`)

// bookTitleRe 复刻 re.search(r"《(.+?)》", raw)。
var bookTitleRe = regexp.MustCompile(`《(.+?)》`)

// GetInfo 复刻 get_info。
func (p *BiqugePage) GetInfo() BiqugeInfo {
	info := BiqugeInfo{}

	if h1 := p.Doc.Find("h1"); h1 != nil {
		info.Title = cleanText(h1.Text())
	}

	if divInfo := p.Doc.FindBy("div", map[string]htmlx.AttrFilter{"id": htmlx.AttrEqualsFilter("info")}); divInfo != nil {
		for _, pTag := range divInfo.FindAll("p", true) {
			// Python 侧先按 get_text(strip=True) 过滤空段落，再取 _clean_text。
			if pyStrip(pTag.Text()) == "" {
				continue
			}
			line := cleanText(pTag.Text())
			switch {
			case strings.Contains(line, "作") && strings.Contains(line, "者"):
				info.Author = pyStrip(authorRe.ReplaceAllString(line, ""))
			case strings.Contains(line, "最新章节"):
				raw := pyStrip(latestChapterRe.ReplaceAllString(line, ""))
				if m := bookTitleRe.FindStringSubmatch(raw); m != nil {
					info.LatestChapter = m[1]
				} else {
					info.LatestChapter = raw
				}
			}
		}
	}

	if conTop := p.Doc.FindBy("div", map[string]htmlx.AttrFilter{"class": htmlx.ClassFilter("con_top")}); conTop != nil {
		links := conTop.FindAll("a", true)
		if len(links) >= 3 {
			info.Category = links[2].Text()
		}
	}

	return info
}

// GetSummary 复刻 get_summary。
func (p *BiqugePage) GetSummary() string {
	intro := p.Doc.FindBy("div", map[string]htmlx.AttrFilter{"id": htmlx.AttrEqualsFilter("intro")})
	if intro == nil {
		return ""
	}
	return cleanText(intro.Text())
}

// GetImage 复刻 get_image。
func (p *BiqugePage) GetImage() string {
	fmimg := p.Doc.FindBy("div", map[string]htmlx.AttrFilter{"id": htmlx.AttrEqualsFilter("fmimg")})
	if fmimg == nil {
		return ""
	}
	imgTag := fmimg.Find("img")
	if imgTag == nil {
		return ""
	}
	src := imgTag.Attr("src")
	if strings.HasPrefix(src, "//") {
		return "http:" + src
	}
	if src != "" && !strings.HasPrefix(src, "http") {
		return strings.TrimRight(BiqugeBaseURL, "/") + "/" + strings.TrimLeft(src, "/")
	}
	return src
}

// bookIDRe 复刻 re.search(r"/(\d+/\d+)/?$", url)。
var bookIDRe = regexp.MustCompile(`/(\d+/\d+)/?$`)

// GetID 复刻 get_id。
func (p *BiqugePage) GetID() string {
	if m := bookIDRe.FindStringSubmatch(p.URL); m != nil {
		return m[1]
	}
	return p.URL
}

// GetTags 复刻 get_tags。
func (p *BiqugePage) GetTags() []string {
	info := p.GetInfo()
	if info.Category != "" {
		return []string{info.Category}
	}
	return nil
}

// BiqugeSource 实现笔趣阁元数据源。
type BiqugeSource struct {
	// HTTP 是受策略约束的 HTTP 客户端。
	HTTP *safehttp.SafeHttpClient
	// BaseURL 便于测试覆盖；为空时用 BiqugeBaseURL。
	BaseURL string
}

// NewBiqugeSource 构造笔趣阁源。
func NewBiqugeSource(http *safehttp.SafeHttpClient) *BiqugeSource {
	if http == nil {
		http = &safehttp.SafeHttpClient{}
	}
	return &BiqugeSource{HTTP: http}
}

// baseURL 返回生效的基地址。
func (s *BiqugeSource) baseURL() string {
	if s.BaseURL != "" {
		return s.BaseURL
	}
	return BiqugeBaseURL
}

// SearchURL 复刻 BiqugeSearch.search_url。
func (s *BiqugeSource) SearchURL() string {
	return s.baseURL() + "/modules/article/search.php"
}

// Search 复刻 BiqugeSearch.search：返回详情页对象，未命中返回 nil。
//
// 搜索直接跳转到书籍详情页（唯一结果）时复用响应体；否则取列表第一条再请求详情页。
func (s *BiqugeSource) Search(keyword string) *BiqugePage {
	form := url.Values{}
	form.Set("searchtype", "title")
	form.Set("searchkey", keyword)

	// Python 的 requests.post(data=payload) 发送 application/x-www-form-urlencoded。
	headers := make(map[string]string, len(biqugeHeaders)+1)
	for k, v := range biqugeHeaders {
		headers[k] = v
	}
	headers["Content-Type"] = "application/x-www-form-urlencoded"

	resp, err := s.HTTP.Post(context.Background(), s.SearchURL(), safehttp.RequestOptions{
		Headers: headers, Data: []byte(form.Encode()),
		Timeout: BiqugeTimeout * 1e9, HasTimeout: true,
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

	doc, err := htmlx.Parse(html)
	if err != nil {
		return nil
	}

	// 搜索直接跳转到书籍详情页（唯一结果）。
	if doc.FindBy("div", map[string]htmlx.AttrFilter{"id": htmlx.AttrEqualsFilter("info")}) != nil {
		page, err := NewBiqugePage(resp.Request.URL.String(), html)
		if err != nil {
			return nil
		}
		return page
	}

	// 多结果列表，取第一条。
	first := doc.SelectOne(".s2 a")
	if first == nil {
		return nil
	}
	bookURL := first.Attr("href")
	if !strings.HasPrefix(bookURL, "http") {
		bookURL = strings.TrimRight(s.baseURL(), "/") + "/" + strings.TrimLeft(bookURL, "/")
	}
	return s.fetchPage(bookURL)
}

// fetchPage 拉取详情页 HTML 并构造页面对象。
func (s *BiqugeSource) fetchPage(pageURL string) *BiqugePage {
	resp, err := s.HTTP.Get(context.Background(), pageURL, safehttp.RequestOptions{
		Headers: biqugeHeaders, Timeout: BiqugeTimeout * 1e9, HasTimeout: true,
	})
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	body, err := readAll(resp.Body)
	if err != nil {
		return nil
	}
	page, err := NewBiqugePage(pageURL, string(body))
	if err != nil {
		return nil
	}
	return page
}

// GetBook 复刻 BiqugeApi.get_book：搜索并构造元数据。
func (s *BiqugeSource) GetBook(title string, copyImage bool) map[string]any {
	page := s.Search(title)
	if page == nil {
		return nil
	}
	return s.BuildMetadata(page, copyImage)
}

// BuildMetadata 复刻 BiqugeApi._metadata。
func (s *BiqugeSource) BuildMetadata(page *BiqugePage, copyImage bool) map[string]any {
	info := page.GetInfo()

	author := info.Author
	if author == "" {
		author = "佚名"
	}

	tags := page.GetTags()
	if len(tags) > 8 {
		tags = tags[:8]
	}

	mi := map[string]any{
		"title":          info.Title,
		"authors":        []any{author},
		"author":         author,
		"author_sort":    author,
		"isbn":           BiqugeISBN,
		"tags":           toAnySlice(tags),
		"publisher":      nil,
		"cover_url":      nilIfEmpty(page.GetImage()),
		"comments":       page.GetSummary(),
		"website":        page.URL,
		"source":         "笔趣阁",
		"provider_key":   BiqugeKey,
		"provider_value": page.GetID(),
		"rating":         nil,
	}

	// Python 侧 pubdate/timestamp 取 utcnow()，Go 侧由调用方注入当前时间。
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

// coverExtRe 复刻 cover_url.split(".")[-1].lower()。
var coverExtRe = regexp.MustCompile(`\.([A-Za-z0-9]+)$`)

// biqugeImageFormats 复刻允许的图片扩展名白名单。
var biqugeImageFormats = map[string]bool{
	"jpg": true, "jpeg": true, "png": true, "gif": true, "webp": true,
}

// GetCover 复刻 BiqugeApi.get_cover：下载封面，返回 (fmt, bytes) 或 nil。
func (s *BiqugeSource) GetCover(coverURL string) *metabase.CoverResult {
	if coverURL == "" {
		return nil
	}
	resp, err := s.HTTP.Get(context.Background(), coverURL, safehttp.RequestOptions{
		Headers: biqugeHeaders, Timeout: 10e9, HasTimeout: true,
	})
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil
	}
	img, err := io.ReadAll(resp.Body)
	if err != nil || len(img) == 0 {
		return nil
	}

	imgFmt := "jpg"
	if m := coverExtRe.FindStringSubmatch(coverURL); m != nil {
		if lower := strings.ToLower(m[1]); biqugeImageFormats[lower] {
			imgFmt = lower
		}
	}
	return &metabase.CoverResult{Extension: imgFmt, Content: img}
}

// nilIfEmpty 空串返回 nil，对齐 Python 的 `src or None`。
func nilIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

// toAnySlice 把 []string 转为 []any，便于与 Python 结构对齐。
func toAnySlice(in []string) []any {
	out := make([]any, 0, len(in))
	for _, v := range in {
		out = append(out, v)
	}
	return out
}
