package metasource

import (
	"context"
	"encoding/json"
	"net/url"
	"regexp"
	"strings"

	"talebook/booksvr/internal/htmlx"
	"talebook/booksvr/internal/metabase"
	"talebook/booksvr/internal/safehttp"
)

// XhsdKey 复刻 KEY。
const XhsdKey = "xinhua"

// XhsdISBN 复刻 XHSD_ISBN。
const XhsdISBN = "0000000000002"

// XhsdSearchURL 复刻 base_search_url。
const XhsdSearchURL = "https://search.xhsd.com/search"

// XhsdDetailBase 复刻 base_detail_url。
const XhsdDetailBase = "https://item.xhsd.com"

// XhsdTimeout 复刻搜索/详情页请求超时（秒）。
const XhsdTimeout = 10

// XhsdDetailTimeout 复刻详情页解析超时（秒）。
const XhsdDetailTimeout = 15

// xhsdHeaders 复刻 session.headers。
var xhsdHeaders = map[string]string{
	"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
		"(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	"Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
	"Accept-Language": "zh-CN,zh;q=0.9",
	"Referer":         "https://search.xhsd.com/",
}

// xhsdCoverHosts 复刻 _trusted_cover_url 的九个 CDN 主机。
var xhsdCoverHosts = map[string]bool{
	"img1.xinhuashudian.com": true,
	"img2.xinhuashudian.com": true,
	"img3.xinhuashudian.com": true,
	"img4.xinhuashudian.com": true,
	"img5.xinhuashudian.com": true,
	"img6.xinhuashudian.com": true,
	"img7.xinhuashudian.com": true,
	"img8.xinhuashudian.com": true,
	"img9.xinhuashudian.com": true,
}

// TrustedXhsdCoverURL 复刻 _trusted_cover_url。
//
// 返回 (规范化 URL, 主机名)；不满足条件返回 ("", "")。
func TrustedXhsdCoverURL(value string) (string, string) {
	parsed, err := url.Parse(value)
	if err != nil {
		return "", ""
	}
	port := parsed.Port()
	if port != "" {
		n, err := atoiSafe(port)
		if err != nil || n < 0 || n > 65535 {
			return "", ""
		}
	}
	if strings.ToLower(parsed.Scheme) != "https" || parsed.User != nil {
		return "", ""
	}
	if port != "" && port != "443" {
		return "", ""
	}
	hostname := parsed.Hostname()
	if !xhsdCoverHosts[hostname] {
		return "", ""
	}
	suffix := "/" + strings.TrimLeft(parsed.Path, "/")
	if parsed.RawQuery != "" {
		suffix += "?" + parsed.RawQuery
	}
	return "https://" + hostname + suffix, hostname
}

// atoiSafe 解析十进制端口。
func atoiSafe(s string) (int, error) {
	n := 0
	for _, r := range s {
		if r < '0' || r > '9' {
			return 0, errNotNumber
		}
		n = n*10 + int(r-'0')
	}
	return n, nil
}

// errNotNumber 表示非数字输入。
var errNotNumber = &xhsdError{"not a number"}

type xhsdError struct{ msg string }

func (e *xhsdError) Error() string { return e.msg }

// xhsdISBNRe 复刻 re.match(r"^\d{13}$", clean_title)。
var xhsdISBNRe = regexp.MustCompile(`^\d{13}$`)

// XhsdBookInfo 复刻 _parse_detail_page 的返回结构。
type XhsdBookInfo struct {
	Cover        string
	Title        string
	Publisher    string
	Author       string
	Introduction string
	ISBN         string
	URL          string
}

// XhsdSource 实现新华书店元数据源。
type XhsdSource struct {
	HTTP *safehttp.SafeHttpClient
	// SearchURL / DetailBase 便于测试覆盖。
	SearchURL  string
	DetailBase string
}

// NewXhsdSource 构造新华书店源。
func NewXhsdSource(http *safehttp.SafeHttpClient) *XhsdSource {
	if http == nil {
		http = &safehttp.SafeHttpClient{}
	}
	return &XhsdSource{HTTP: http}
}

// searchURL 返回生效的搜索地址。
func (s *XhsdSource) searchURL() string {
	if s.SearchURL != "" {
		return s.SearchURL
	}
	return XhsdSearchURL
}

// detailBase 返回生效的详情页基地址。
func (s *XhsdSource) detailBase() string {
	if s.DetailBase != "" {
		return s.DetailBase
	}
	return XhsdDetailBase
}

// GetBook 复刻 get_book：仅支持 13 位 ISBN。
func (s *XhsdSource) GetBook(title string, copyImage bool) map[string]any {
	cleanTitle := pyStrip(strings.ReplaceAll(title, "-", ""))
	if xhsdISBNRe.MatchString(cleanTitle) {
		return s.GetBookByISBN(cleanTitle, copyImage)
	}
	return nil
}

// GetBookByISBN 复刻 get_book_by_isbn。
func (s *XhsdSource) GetBookByISBN(isbn string, copyImage bool) map[string]any {
	if isbn == "" {
		return nil
	}
	detailURL := s.getDetailURLByISBN(isbn)
	if detailURL == "" {
		return nil
	}
	info := s.parseDetailPage(detailURL, isbn)
	if info == nil {
		return nil
	}
	return s.BuildMetadata(info, copyImage)
}

// getDetailURLByISBN 复刻 _get_detail_url_by_isbn。
func (s *XhsdSource) getDetailURLByISBN(isbn string) string {
	params := url.Values{}
	params.Set("keyword", isbn)

	resp, err := s.HTTP.Get(context.Background(), s.searchURL()+"?"+params.Encode(),
		safehttp.RequestOptions{Headers: xhsdHeaders, Timeout: XhsdTimeout * 1e9, HasTimeout: true})
	if err != nil {
		return ""
	}
	defer resp.Body.Close()
	body, err := readAll(resp.Body)
	if err != nil {
		return ""
	}
	doc, err := htmlx.Parse(string(body))
	if err != nil {
		return ""
	}

	for _, item := range doc.FindAllBy("li", map[string]htmlx.AttrFilter{
		"class": htmlx.ClassFilter("product"),
	}, true) {
		descP := item.FindBy("p", map[string]htmlx.AttrFilter{"class": htmlx.ClassFilter("product-desc")})
		if descP == nil {
			continue
		}
		aTag := descP.Find("a")
		if aTag == nil {
			continue
		}
		relativeURL, ok := aTag.AttrOK("href")
		if !ok || relativeURL == "" {
			continue
		}

		var detailURL string
		if strings.HasPrefix(relativeURL, "//") {
			detailURL = "https:" + relativeURL
		} else {
			detailURL = resolveURL(s.detailBase(), relativeURL)
		}

		if s.isbnExistsInPage(detailURL, isbn) {
			return detailURL
		}
	}
	return ""
}

// resolveURL 复刻 urllib.parse.urljoin。
func resolveURL(base, ref string) string {
	b, err := url.Parse(base)
	if err != nil {
		return ref
	}
	r, err := url.Parse(ref)
	if err != nil {
		return ref
	}
	return b.ResolveReference(r).String()
}

// isbnExistsInPage 复刻 _isbn_exists_in_page。
func (s *XhsdSource) isbnExistsInPage(detailURL, targetISBN string) bool {
	resp, err := s.HTTP.Get(context.Background(), detailURL,
		safehttp.RequestOptions{Headers: xhsdHeaders, Timeout: XhsdTimeout * 1e9, HasTimeout: true})
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	body, err := readAll(resp.Body)
	if err != nil {
		return false
	}
	cleanISBN := strings.ReplaceAll(targetISBN, "-", "")
	return strings.Contains(string(body), cleanISBN)
}

// xhsdInvisibleRe 复刻 re.sub(r"[\u200b\u200c\u200d\ufeff]", "", introduction)。
var xhsdInvisibleRe = regexp.MustCompile("[\u200b\u200c\u200d\ufeff]")

// xhsdIntroPrefixRe 复刻 re.sub(r"^【内容简介】[：:]\s*", "", introduction)。
var xhsdIntroPrefixRe = regexp.MustCompile(`^【内容简介】[：:]\s*`)

// ParseDetailPage 复刻 _parse_detail_page。
func (s *XhsdSource) ParseDetailPage(detailURL, isbn string) *XhsdBookInfo {
	return s.parseDetailPage(detailURL, isbn)
}

func (s *XhsdSource) parseDetailPage(detailURL, isbn string) *XhsdBookInfo {
	resp, err := s.HTTP.Get(context.Background(), detailURL,
		safehttp.RequestOptions{Headers: xhsdHeaders, Timeout: XhsdDetailTimeout * 1e9, HasTimeout: true})
	if err != nil {
		return nil
	}
	defer resp.Body.Close()
	body, err := readAll(resp.Body)
	if err != nil {
		return nil
	}
	return ParseXhsdDetailHTML(string(body), detailURL, isbn)
}

// ParseXhsdDetailHTML 从详情页 HTML 解析书籍信息（便于测试直接调用）。
func ParseXhsdDetailHTML(html, detailURL, isbn string) *XhsdBookInfo {
	doc, err := htmlx.Parse(html)
	if err != nil {
		return nil
	}

	itemTitleDiv := doc.FindBy("div", map[string]htmlx.AttrFilter{"class": htmlx.ClassFilter("item-title")})
	if itemTitleDiv == nil {
		return nil
	}
	dataItemStr, ok := itemTitleDiv.AttrOK("data-item")
	if !ok || dataItemStr == "" {
		return nil
	}

	var data map[string]any
	if err := json.Unmarshal([]byte(dataItemStr), &data); err != nil {
		return nil
	}

	title, _ := data["name"].(string)
	cover, _ := data["mainImage"].(string)
	if strings.HasPrefix(cover, "//") {
		cover = "https:" + cover
	}

	author := ""
	publisher := ""

	attrGroups := xhsdAttrGroups(data)
	for _, group := range attrGroups {
		if g, _ := group["group"].(string); g != "BASIC" {
			continue
		}
		attrs, _ := group["otherAttributes"].([]any)
		for _, rawAttr := range attrs {
			attr, ok := rawAttr.(map[string]any)
			if !ok {
				continue
			}
			key, _ := attr["attrKey"].(string)
			val, _ := attr["attrVal"].(string)
			switch key {
			case "作者":
				author = val
			case "出版社":
				publisher = val
			}
		}
	}

	if author == "" || publisher == "" {
		if extra, ok := data["extra"].(map[string]any); ok && author == "" {
			author, _ = extra["author"].(string)
		}
	}

	// 简介：从 spu-tab-item-detail 的 data-detail 中取「内容」项。
	introduction := ""
	if spuDetailDiv := doc.FindBy("div", map[string]htmlx.AttrFilter{
		"class": htmlx.ClassFilter("spu-tab-item-detail"),
	}); spuDetailDiv != nil {
		if dataDetailStr, ok := spuDetailDiv.AttrOK("data-detail"); ok && dataDetailStr != "" {
			var details []any
			if err := json.Unmarshal([]byte(dataDetailStr), &details); err == nil {
				for _, rawItem := range details {
					item, ok := rawItem.(map[string]any)
					if !ok {
						continue
					}
					itemTitle, _ := item["title"].(string)
					if !strings.Contains(itemTitle, "内容") {
						continue
					}
					htmlContent, _ := item["content"].(string)
					introDoc, err := htmlx.Parse(htmlContent)
					if err != nil {
						break
					}
					introduction = introDoc.TextSep("\n")
					introduction = xhsdInvisibleRe.ReplaceAllString(introduction, "")
					introduction = pyStrip(introduction)
					introduction = pyStrip(strings.Trim(introduction, `"`))
					introduction = xhsdIntroPrefixRe.ReplaceAllString(introduction, "")
					introduction = pyStrip(introduction)
					break
				}
			}
		}
	}

	return &XhsdBookInfo{
		Cover:        cover,
		Title:        title,
		Publisher:    publisher,
		Author:       author,
		Introduction: introduction,
		ISBN:         isbn,
		URL:          detailURL,
	}
}

// xhsdAttrGroups 复刻 `data.get("otherAttributes") or data.get("otherAttrs") or []`。
func xhsdAttrGroups(data map[string]any) []map[string]any {
	for _, key := range []string{"otherAttributes", "otherAttrs"} {
		if arr, ok := data[key].([]any); ok && len(arr) > 0 {
			return toMapSlice(arr)
		}
	}
	return nil
}

// BuildMetadata 复刻 _metadata。
func (s *XhsdSource) BuildMetadata(info *XhsdBookInfo, copyImage bool) map[string]any {
	if info.Title == "" {
		return nil
	}

	author := info.Author
	if author == "" {
		author = "佚名"
	}

	isbn := info.ISBN
	if isbn == "" {
		isbn = XhsdISBN
	}

	mi := map[string]any{
		"title":          info.Title,
		"publisher":      info.Publisher,
		"authors":        []any{author},
		"author":         author,
		"author_sort":    author,
		"isbn":           isbn,
		"tags":           []any{},
		"comments":       info.Introduction,
		"website":        info.URL,
		"source":         "新华书店",
		"provider_key":   XhsdKey,
		"provider_value": info.ISBN,
	}

	coverURL := info.Cover
	mi["cover_url"] = coverURL
	mi["cover_data"] = nil
	if copyImage && coverURL != "" {
		if cover := s.GetCover(coverURL, true); cover != nil {
			mi["cover_data"] = []any{cover.Extension, cover.Content}
		}
	}
	return mi
}

// GetCover 复刻 get_cover：校验 CDN 白名单，PNG 转 JPEG。
func (s *XhsdSource) GetCover(coverURL string, copyImage bool) *metabase.CoverResult {
	if !copyImage || coverURL == "" {
		return nil
	}
	trustedURL, trustedHost := TrustedXhsdCoverURL(coverURL)
	if trustedURL == "" {
		return nil
	}

	client := s.HTTP
	if client == nil {
		client = &safehttp.SafeHttpClient{}
	}
	resp, err := client.Get(context.Background(), trustedURL, safehttp.RequestOptions{
		Headers: xhsdHeaders, Timeout: XhsdTimeout * 1e9, HasTimeout: true,
		AllowedHosts: []string{trustedHost},
	})
	if err != nil {
		return nil
	}
	defer resp.Body.Close()
	img, err := readAll(resp.Body)
	if err != nil {
		return nil
	}

	parsed, _ := url.Parse(trustedURL)
	coverPath := strings.ToLower(parsed.Path)
	imgFmt := "png"
	if strings.HasSuffix(coverPath, ".jpg") || strings.HasSuffix(coverPath, ".jpeg") {
		imgFmt = "jpg"
	}

	if imgFmt == "png" {
		// 与 baike 一致：PNG 转 JPEG（不裁剪）。
		converted, err := convertPNGToJPEG(img, false)
		if err != nil {
			// Python 侧 PIL 缺失时保留原 PNG 数据。
			return &metabase.CoverResult{Extension: imgFmt, Content: img}
		}
		img = converted
		imgFmt = "jpg"
	}
	return &metabase.CoverResult{Extension: imgFmt, Content: img}
}

// Fetch 复刻 _fetch：按 ISBN 精确查询。
func (s *XhsdSource) Fetch(externalID string, copyImage bool) map[string]any {
	return s.GetBookByISBN(externalID, copyImage)
}

// Search 复刻 _search：优先 ISBN，其次标题（标题非 13 位 ISBN 时会被 get_book 跳过）。
func (s *XhsdSource) Search(isbn, title string, copyImage bool) map[string]any {
	keyword := isbn
	if keyword == "" {
		keyword = title
	}
	if keyword == "" {
		return nil
	}
	return s.GetBook(keyword, copyImage)
}
