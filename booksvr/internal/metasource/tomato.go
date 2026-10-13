package metasource

import (
	"context"
	"encoding/json"
	"net/url"
	"regexp"
	"strconv"
	"strings"

	"talebook/booksvr/internal/htmlx"
	"talebook/booksvr/internal/safehttp"
)

// TomatoISBN 复刻 TOMATO_ISBN。
const TomatoISBN = "0000000000003"

// TomatoKey 复刻 KEY。
const TomatoKey = "TomatoNovel"

// TomatoSearchAPI 复刻 SEARCH_API。
const TomatoSearchAPI = "https://api-lf.fanqiesdk.com/api/novel/channel/homepage/search/search/v1/"

// TomatoBookDetailAPI 复刻 BOOK_DETAIL_API。
const TomatoBookDetailAPI = "https://fanqienovel.com/api/reader/directory/detail"

// TomatoPageBase 复刻书籍页面地址前缀。
const TomatoPageBase = "https://fanqienovel.com/page/"

// TomatoTimeout 复刻请求超时（秒）。
const TomatoTimeout = 15

// TomatoUserAgents 复刻 USER_AGENTS。
var TomatoUserAgents = []string{
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
		"(KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
		"(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
}

// tomatoHeaders 复刻 CHROME_HEADERS（api.py 中的固定头）。
var tomatoHeaders = map[string]string{
	"Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.6",
	"Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
	"User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko)" +
		"Chrome/66.0.3359.139 Safari/537.36",
}

// GetRandomHeaders 复刻 get_random_headers。
//
// Python 用 random.choice(USER_AGENTS) 取 UA；Go 侧由调用方注入索引，
// 便于测试与可复现。idx < 0 时取第一个。
func GetRandomHeaders(idx int) map[string]string {
	if idx < 0 || idx >= len(TomatoUserAgents) {
		idx = 0
	}
	return map[string]string{
		"User-Agent":                TomatoUserAgents[idx],
		"Accept":                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
		"Accept-Language":           "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
		"Cache-Control":             "max-age=0",
		"Connection":                "keep-alive",
		"Upgrade-Insecure-Requests": "1",
		"Referer":                   "https://fanqienovel.com/",
		"Origin":                    "https://fanqienovel.com",
	}
}

// 复刻 tomato.py 顶部的五个正则。
var (
	tomatoNextDataRe     = regexp.MustCompile(`(?s)<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)</script>`)
	tomatoInitialStateRe = regexp.MustCompile(`(?s)window\.__INITIAL_STATE__\s*=\s*(\{.*?\})\s*;`)
	tomatoLDJSONRe       = regexp.MustCompile(`<script[^>]*type="application/ld\+json"[^>]*>\s*([\s\S]*?)\s*</script>`)
	tomatoInfoGreyRe     = regexp.MustCompile(`<span[^>]*class="info-label-grey"[^>]*>([^<]+)</span>`)
	tomatoInfoYellowRe   = regexp.MustCompile(`<span[^>]*class="info-label-yellow"[^>]*>([^<]+)</span>`)
)

// ExtractNextDataJSON 复刻 extract_next_data_json。
func ExtractNextDataJSON(html string) string {
	if m := tomatoNextDataRe.FindStringSubmatch(html); m != nil {
		return pyStrip(m[1])
	}
	return ""
}

// ExtractInitialStateJSON 复刻 extract_initial_state_json。
func ExtractInitialStateJSON(html string) string {
	if m := tomatoInitialStateRe.FindStringSubmatch(html); m != nil {
		return pyStrip(m[1])
	}
	return ""
}

// FindStringByKey 复刻 find_string_by_key：深度优先查找首个命中的字符串值。
func FindStringByKey(value any, keys []string) string {
	switch t := value.(type) {
	case map[string]any:
		for _, key := range keys {
			if v, ok := t[key]; ok {
				if s, isStr := v.(string); isStr {
					return s
				}
			}
		}
		for _, v := range t {
			if r := FindStringByKey(v, keys); r != "" {
				return r
			}
		}
	case []any:
		for _, item := range t {
			if r := FindStringByKey(item, keys); r != "" {
				return r
			}
		}
	}
	return ""
}

// FindStringArrayByKey 复刻 find_string_array_by_key：要求数组非空且全为字符串。
func FindStringArrayByKey(value any, keys []string) []string {
	switch t := value.(type) {
	case map[string]any:
		for _, key := range keys {
			if v, ok := t[key]; ok {
				if arr, isArr := v.([]any); isArr && len(arr) > 0 {
					out := make([]string, 0, len(arr))
					allStr := true
					for _, item := range arr {
						s, isStr := item.(string)
						if !isStr {
							allStr = false
							break
						}
						out = append(out, s)
					}
					if allStr {
						return out
					}
				}
			}
		}
		for _, v := range t {
			if r := FindStringArrayByKey(v, keys); r != nil {
				return r
			}
		}
	case []any:
		for _, item := range t {
			if r := FindStringArrayByKey(item, keys); r != nil {
				return r
			}
		}
	}
	return nil
}

// FindIntByKey 复刻 find_int_by_key：接受 int 或全数字字符串。
//
// 返回 (值, 是否命中)，以区分「命中 0」与「未命中」。
func FindIntByKey(value any, keys []string) (int, bool) {
	switch t := value.(type) {
	case map[string]any:
		for _, key := range keys {
			v, ok := t[key]
			if !ok {
				continue
			}
			if n, isNum := toFloat(v); isNum {
				return int(n), true
			}
			if s, isStr := v.(string); isStr && isAllDigits(s) {
				n, err := strconv.Atoi(s)
				if err == nil {
					return n, true
				}
			}
		}
		for _, v := range t {
			if n, ok := FindIntByKey(v, keys); ok {
				return n, true
			}
		}
	case []any:
		for _, item := range t {
			if n, ok := FindIntByKey(item, keys); ok {
				return n, true
			}
		}
	}
	return 0, false
}

// isAllDigits 复刻 str.isdigit()（仅 ASCII 数字，与 Python 的常见用法一致）。
func isAllDigits(s string) bool {
	if s == "" {
		return false
	}
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}

// BuildCoverURLFromThumbURI 复刻 build_cover_url_from_thumb_uri。
func BuildCoverURLFromThumbURI(uri string) string {
	if uri == "" {
		return ""
	}
	uri = pyStrip(uri)
	if strings.HasPrefix(uri, "http://") || strings.HasPrefix(uri, "https://") {
		return uri
	}
	return "https://p3-reading-sign.fqnovelpic.com/" + uri
}

// ParseHTMLImgCoverURL 复刻 parse_html_img_cover_url。
func ParseHTMLImgCoverURL(html string) string {
	for _, m := range tomatoLDJSONRe.FindAllStringSubmatch(html, -1) {
		var value map[string]any
		if err := json.Unmarshal([]byte(m[1]), &value); err != nil {
			continue
		}
		for _, key := range []string{"image", "images"} {
			v, ok := value[key]
			if !ok {
				continue
			}
			if arr, isArr := v.([]any); isArr && len(arr) > 0 {
				if s, isStr := arr[0].(string); isStr && isHTTPURL(s) {
					return s
				}
			} else if s, isStr := v.(string); isStr && isHTTPURL(s) {
				return s
			}
		}
	}
	return ""
}

// isHTTPURL 判断是否以 http:// 或 https:// 开头。
func isHTTPURL(s string) bool {
	return strings.HasPrefix(s, "http://") || strings.HasPrefix(s, "https://")
}

// ParseTagsFromInfoLabel 复刻 parse_tags_from_info_label。
func ParseTagsFromInfoLabel(html string) []string {
	var tags []string
	for _, m := range tomatoInfoGreyRe.FindAllStringSubmatch(html, -1) {
		if tag := pyStrip(m[1]); tag != "" {
			tags = append(tags, tag)
		}
	}
	return tags
}

// ParseFinishedFromInfoLabel 复刻 parse_finished_from_info_label。
//
// 返回 (是否完结, 是否命中)。
func ParseFinishedFromInfoLabel(html string) (bool, bool) {
	m := tomatoInfoYellowRe.FindStringSubmatch(html)
	if m == nil {
		return false, false
	}
	label := pyStrip(m[1])
	if strings.Contains(label, "未完结") || strings.Contains(label, "连载") {
		return false, true
	}
	if strings.Contains(label, "完结") {
		return true, true
	}
	return false, false
}

// RegexJSONStringField 复刻 regex_json_string_field。
func RegexJSONStringField(html, field string) string {
	pattern := regexp.MustCompile(`"` + regexp.QuoteMeta(field) + `"\s*:\s*"(.*?)"`)
	m := pattern.FindStringSubmatch(html)
	if m == nil {
		return ""
	}
	raw := m[1]
	// 尝试按 JSON 字符串规则反转义。
	var decoded string
	if err := json.Unmarshal([]byte(`"`+raw+`"`), &decoded); err == nil {
		return decoded
	}
	return raw
}

// RegexJSONIntField 复刻 regex_json_int_field。
//
// 返回 (值, 是否命中)。
func RegexJSONIntField(html, field string) (int, bool) {
	pattern := regexp.MustCompile(`"` + regexp.QuoteMeta(field) + `"\s*:\s*(\d+)`)
	m := pattern.FindStringSubmatch(html)
	if m == nil {
		return 0, false
	}
	n, err := strconv.Atoi(m[1])
	if err != nil {
		return 0, false
	}
	return n, true
}

// TomatoInfo 复刻 get_info 的返回结构。
type TomatoInfo struct {
	Title        string
	Author       string
	Summary      string
	BookID       string
	URL          string
	Tags         []string
	Status       string
	ChapterCount int
}

// TomatoPage 复刻 tomato.Page。
type TomatoPage struct {
	BookID     string
	Cookie     string
	HTTPStatus int
	FinalURL   string
	HTML       string
	Doc        *htmlx.Node
	ParsedData map[string]any
	BookInfo   map[string]any
	// HTTP 是受策略约束的 HTTP 客户端。
	HTTP *safehttp.SafeHttpClient
	// UAIndex 复刻 random.choice(USER_AGENTS) 的选择结果。
	UAIndex int
	// SkipFetch 为 true 时不发起网络请求（测试用）。
	SkipFetch bool
}

// NewTomatoPage 构造并初始化页面对象（会发起请求，除非 SkipFetch）。
func NewTomatoPage(bookID, cookie string, http *safehttp.SafeHttpClient) (*TomatoPage, error) {
	if http == nil {
		http = &safehttp.SafeHttpClient{}
	}
	p := &TomatoPage{BookID: bookID, Cookie: cookie, HTTP: http, UAIndex: 0}
	if !p.SkipFetch {
		p.initWebParser()
	}
	if p.Doc == nil || p.HTML == "" {
		return nil, &TomatoPageError{Word: bookID}
	}
	if p.isVerificationPage() {
		return nil, &TomatoVerifyError{Word: bookID}
	}
	p.parseHTMLData()
	return p, nil
}

// TomatoPageError 复刻 PageError。
type TomatoPageError struct{ Word string }

func (e *TomatoPageError) Error() string { return "词条 [" + e.Word + "] 不存在" }

// TomatoVerifyError 复刻 VerifyError。
type TomatoVerifyError struct{ Word string }

func (e *TomatoVerifyError) Error() string { return "词条 [" + e.Word + "] 需要验证" }

// initWebParser 复刻 _init_web_parser。
func (p *TomatoPage) initWebParser() {
	target := TomatoPageBase + p.BookID
	headers := GetRandomHeaders(p.UAIndex)
	if p.Cookie != "" {
		headers["Cookie"] = p.Cookie
	}

	resp, err := p.HTTP.Get(context.Background(), target, safehttp.RequestOptions{
		Headers: headers, Timeout: TomatoTimeout * 1e9, HasTimeout: true,
	})
	if err != nil {
		p.HTTPStatus = 0
		p.FinalURL = target
		p.HTML = ""
		p.Doc = nil
		return
	}
	defer resp.Body.Close()

	p.HTTPStatus = resp.StatusCode
	if resp.Request != nil && resp.Request.URL != nil {
		p.FinalURL = resp.Request.URL.String()
	} else {
		p.FinalURL = target
	}
	body, err := readAll(resp.Body)
	if err != nil {
		p.HTML = ""
		p.Doc = nil
		return
	}
	p.HTML = string(body)
	doc, err := htmlx.Parse(p.HTML)
	if err != nil {
		p.Doc = nil
		return
	}
	p.Doc = doc
}

// isVerificationPage 复刻 _is_verification_page。
func (p *TomatoPage) isVerificationPage() bool {
	if p.HTTPStatus == 403 || p.HTTPStatus == 429 {
		return true
	}
	finalURL := strings.ToLower(p.FinalURL)
	for _, marker := range []string{"/verify", "captcha", "seccaptcha"} {
		if strings.Contains(finalURL, marker) {
			return true
		}
	}

	title := ""
	if p.Doc != nil {
		if t := p.Doc.Find("title"); t != nil {
			title = t.Text()
		}
	}
	switch title {
	case "安全验证", "访问验证", "人机验证", "验证码":
		return true
	}

	if p.Doc != nil {
		for _, sel := range []string{
			"#vf", "#captcha_container", "#captcha-container",
			".captcha-container", "[class*='seccaptcha']", "script[src*='captcha']",
		} {
			if p.Doc.SelectOne(sel) != nil {
				return true
			}
		}
	}
	return false
}

// parseHTMLData 复刻 _parse_html_data。
func (p *TomatoPage) parseHTMLData() {
	if jsonText := ExtractNextDataJSON(p.HTML); jsonText != "" {
		var data map[string]any
		if err := json.Unmarshal([]byte(jsonText), &data); err == nil {
			p.ParsedData = data
			return
		}
	}
	if jsonText := ExtractInitialStateJSON(p.HTML); jsonText != "" {
		var data map[string]any
		if err := json.Unmarshal([]byte(jsonText), &data); err == nil {
			p.ParsedData = data
			return
		}
	}
	p.BookInfo = p.fetchBookInfo()
}

// fetchBookInfo 复刻 _fetch_book_info：用 book_id 作为关键词查搜索 API。
func (p *TomatoPage) fetchBookInfo() map[string]any {
	headers := map[string]string{"User-Agent": GetRandomHeaders(p.UAIndex)["User-Agent"]}
	if p.Cookie != "" {
		headers["Cookie"] = "install_id=" + p.Cookie
	}
	params := url.Values{}
	params.Set("offset", "0")
	params.Set("aid", "1967")
	params.Set("q", p.BookID)

	resp, err := p.HTTP.Get(context.Background(), TomatoSearchAPI+"?"+params.Encode(),
		safehttp.RequestOptions{Headers: headers, Timeout: TomatoTimeout * 1e9, HasTimeout: true})
	if err != nil {
		return nil
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return nil
	}
	body, err := readAll(resp.Body)
	if err != nil {
		return nil
	}
	var data map[string]any
	if err := json.Unmarshal(body, &data); err != nil {
		return nil
	}
	inner, _ := data["data"].(map[string]any)
	if inner == nil {
		return nil
	}
	retData, _ := inner["ret_data"].([]any)
	for _, raw := range retData {
		book, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		if doubanV2IDString(book["book_id"]) == p.BookID {
			return book
		}
	}
	return nil
}

// GetInfo 复刻 get_info。
func (p *TomatoPage) GetInfo() TomatoInfo {
	info := TomatoInfo{
		Title:  "未知书名",
		Author: "佚名",
		BookID: p.BookID,
		URL:    TomatoPageBase + p.BookID,
		Tags:   []string{},
		Status: "连载中",
	}

	if p.ParsedData != nil {
		if title := FindStringByKey(p.ParsedData, []string{"bookName", "book_name", "title", "name"}); title != "" {
			info.Title = title
		}
		if author := FindStringByKey(p.ParsedData, []string{"author", "authorName", "author_name"}); author != "" {
			info.Author = author
		}
		if summary := FindStringByKey(p.ParsedData, []string{"abstract", "description", "intro", "introduce"}); summary != "" {
			info.Summary = summary
		}

		tags := FindStringArrayByKey(p.ParsedData, []string{"tags", "tagNames", "tag_names"})
		if tags == nil {
			tags = ParseTagsFromInfoLabel(p.HTML)
		}
		if len(tags) > 0 {
			info.Tags = tags
			info.Status = tags[0]
		}

		if n, ok := FindIntByKey(p.ParsedData, []string{"chapterCount", "chapter_count", "chapterTotal"}); ok {
			info.ChapterCount = n
		}

		statusVal, hasStatus := FindIntByKey(p.ParsedData,
			[]string{"status", "serial_status", "finish_status", "finishStatus", "is_finish", "is_finished"})
		finished, hasFinished := ParseFinishedFromInfoLabel(p.HTML)
		if !hasFinished && hasStatus {
			finished = statusVal == 1 || statusVal == 2
		}
		if finished {
			info.Status = "已完结"
		} else if info.Status == "连载中" {
			info.Status = "连载中"
		}
	}

	if p.BookInfo != nil {
		if info.Title == "未知书名" {
			if v, ok := p.BookInfo["title"].(string); ok && v != "" {
				info.Title = v
			}
		}
		if info.Author == "佚名" {
			if v, ok := p.BookInfo["author"].(string); ok && v != "" {
				info.Author = v
			}
		}
		if info.Summary == "" {
			if v, ok := p.BookInfo["abstract"].(string); ok {
				info.Summary = v
			}
		}
		if len(info.Tags) == 0 {
			if tags := asStringList(p.BookInfo["tags"]); len(tags) > 0 {
				info.Tags = tags
				info.Status = tags[0]
			}
		}
	}

	if info.Title == "未知书名" || info.Author == "佚名" || info.Summary == "" {
		p.parseHTMLBackup(&info)
	}
	return info
}

// tomatoChapterCountRe 复刻 re.search(r"(\d+)", h3_text)。
var tomatoChapterCountRe = regexp.MustCompile(`(\d+)`)

// parseHTMLBackup 复刻 _parse_html_backup。
func (p *TomatoPage) parseHTMLBackup(info *TomatoInfo) {
	if p.Doc == nil {
		return
	}
	if info.Title == "未知书名" {
		if h1 := p.Doc.Find("h1"); h1 != nil {
			info.Title = h1.Text()
		}
	}
	if info.Author == "佚名" {
		if div := p.Doc.FindBy("div", map[string]htmlx.AttrFilter{"class": htmlx.ClassFilter("author-name")}); div != nil {
			if span := div.FindBy("span", map[string]htmlx.AttrFilter{"class": htmlx.ClassFilter("author-name-text")}); span != nil {
				info.Author = span.Text()
			}
		}
	}
	if info.Summary == "" {
		if div := p.Doc.FindBy("div", map[string]htmlx.AttrFilter{"class": htmlx.ClassFilter("page-abstract-content")}); div != nil {
			if para := div.Find("p"); para != nil {
				info.Summary = para.Text()
			}
		}
	}
	if len(info.Tags) == 0 {
		var tags []string
		for _, labelDiv := range p.Doc.FindAllBy("div", map[string]htmlx.AttrFilter{"class": htmlx.ClassFilter("info-label")}, true) {
			for _, span := range labelDiv.FindAll("span", true) {
				tags = append(tags, span.Text())
			}
		}
		info.Tags = tags
		if len(tags) > 0 {
			info.Status = tags[0]
		}
	}
	if info.ChapterCount == 0 {
		if header := p.Doc.FindBy("div", map[string]htmlx.AttrFilter{"class": htmlx.ClassFilter("page-directory-header")}); header != nil {
			if h3 := header.Find("h3"); h3 != nil {
				if m := tomatoChapterCountRe.FindStringSubmatch(h3.Text()); m != nil {
					if n, err := strconv.Atoi(m[1]); err == nil {
						info.ChapterCount = n
					}
				}
			}
		}
	}

	// 正则兜底。
	if info.Title == "未知书名" {
		title := RegexJSONStringField(p.HTML, "bookName")
		if title == "" {
			title = RegexJSONStringField(p.HTML, "book_name")
		}
		if title != "" {
			info.Title = title
		}
	}
	if info.Author == "佚名" {
		author := RegexJSONStringField(p.HTML, "author")
		if author == "" {
			author = RegexJSONStringField(p.HTML, "authorName")
		}
		if author != "" {
			info.Author = author
		}
	}
	if info.Summary == "" {
		summary := RegexJSONStringField(p.HTML, "abstract")
		if summary == "" {
			summary = RegexJSONStringField(p.HTML, "description")
		}
		if summary != "" {
			info.Summary = summary
		}
	}
	if info.ChapterCount == 0 {
		n, ok := RegexJSONIntField(p.HTML, "chapterCount")
		if !ok {
			n, ok = RegexJSONIntField(p.HTML, "chapter_count")
		}
		if ok {
			info.ChapterCount = n
		}
	}
}

// tomatoCoverKeys 复刻 get_image 中的封面字段候选。
var tomatoCoverKeys = []string{
	"thumb_url", "expand_thumb_url", "cover_url", "cover", "horiz_thumb_url",
	"audio_thumb_url_hd", "detail_page_thumb_url", "detail_cover_url", "detail_thumb_url",
}

// GetImage 复刻 get_image。
func (p *TomatoPage) GetImage() string {
	if p.ParsedData != nil {
		coverURL := FindStringByKey(p.ParsedData, tomatoCoverKeys)
		if coverURL == "" {
			if thumbURI := FindStringByKey(p.ParsedData, []string{"thumb_uri"}); thumbURI != "" {
				coverURL = BuildCoverURLFromThumbURI(thumbURI)
			}
		}
		if coverURL != "" {
			return coverURL
		}
	}

	if p.BookInfo != nil {
		for _, key := range []string{"cover", "cover_url", "image_url"} {
			if v, ok := p.BookInfo[key].(string); ok && v != "" {
				return v
			}
		}
	}

	coverURL := RegexJSONStringField(p.HTML, "thumb_url")
	if coverURL == "" {
		coverURL = RegexJSONStringField(p.HTML, "expand_thumb_url")
	}
	if coverURL == "" {
		coverURL = RegexJSONStringField(p.HTML, "cover_url")
	}
	if coverURL == "" {
		coverURL = RegexJSONStringField(p.HTML, "cover")
	}
	if coverURL == "" {
		if thumbURI := RegexJSONStringField(p.HTML, "thumb_uri"); thumbURI != "" {
			coverURL = BuildCoverURLFromThumbURI(thumbURI)
		}
	}
	if coverURL != "" {
		return coverURL
	}

	if p.Doc != nil {
		for _, script := range p.Doc.FindAllBy("script", map[string]htmlx.AttrFilter{
			"type": htmlx.AttrEqualsFilter("application/ld+json"),
		}, true) {
			text := script.Text()
			if !strings.Contains(text, "images") {
				continue
			}
			var data map[string]any
			if err := json.Unmarshal([]byte(text), &data); err != nil {
				continue
			}
			if arr, ok := data["images"].([]any); ok && len(arr) > 0 {
				if s, isStr := arr[0].(string); isStr {
					return s
				}
			}
		}
	}
	return ""
}

// GetSummary 复刻 get_summary。
func (p *TomatoPage) GetSummary() string { return p.GetInfo().Summary }

// GetTags 复刻 get_tags。
func (p *TomatoPage) GetTags() []string { return p.GetInfo().Tags }

// GetID 复刻 get_id。
func (p *TomatoPage) GetID() string {
	if id := p.GetInfo().BookID; id != "" {
		return id
	}
	return p.BookID
}

// TomatoSearchResult 复刻 Search.get_results 的单条结果。
type TomatoSearchResult struct {
	Title       string
	BookID      string
	Author      string
	Description string
	URL         string
}

// TomatoSearch 复刻 tomato.Search。
type TomatoSearch struct {
	Keyword    string
	MaxResults int
	Cookie     string
	Data       []map[string]any
	HTTP       *safehttp.SafeHttpClient
	UAIndex    int
}

// NewTomatoSearch 复刻 Search.__init__：调用搜索 API 并保存 ret_data。
func NewTomatoSearch(keyword string, maxResults int, cookie string, http *safehttp.SafeHttpClient) *TomatoSearch {
	if http == nil {
		http = &safehttp.SafeHttpClient{}
	}
	s := &TomatoSearch{Keyword: keyword, MaxResults: maxResults, Cookie: cookie, HTTP: http}
	if s.MaxResults <= 0 {
		s.MaxResults = 10
	}

	headers := map[string]string{"User-Agent": GetRandomHeaders(s.UAIndex)["User-Agent"]}
	if cookie != "" {
		headers["Cookie"] = "install_id=" + cookie
	}
	params := url.Values{}
	params.Set("offset", "0")
	params.Set("aid", "1967")
	params.Set("q", keyword)

	resp, err := s.HTTP.Get(context.Background(), TomatoSearchAPI+"?"+params.Encode(),
		safehttp.RequestOptions{Headers: headers, Timeout: TomatoTimeout * 1e9, HasTimeout: true})
	if err != nil {
		s.Data = nil
		return s
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		s.Data = nil
		return s
	}
	body, err := readAll(resp.Body)
	if err != nil {
		s.Data = nil
		return s
	}
	var data map[string]any
	if err := json.Unmarshal(body, &data); err != nil {
		s.Data = nil
		return s
	}
	inner, _ := data["data"].(map[string]any)
	if inner == nil {
		s.Data = nil
		return s
	}
	retData, _ := inner["ret_data"].([]any)
	s.Data = toMapSlice(retData)
	return s
}

// GetResults 复刻 get_results。
func (s *TomatoSearch) GetResults() []TomatoSearchResult {
	limit := len(s.Data)
	if limit > s.MaxResults {
		limit = s.MaxResults
	}
	results := make([]TomatoSearchResult, 0, limit)
	for _, book := range s.Data[:limit] {
		title, _ := book["title"].(string)
		if title == "" {
			title = "未知书名"
		}
		author, _ := book["author"].(string)
		if author == "" {
			author = "佚名"
		}
		description, _ := book["abstract"].(string)
		bookID := doubanV2IDString(book["book_id"])
		results = append(results, TomatoSearchResult{
			Title:       title,
			BookID:      bookID,
			Author:      author,
			Description: description,
			URL:         TomatoPageBase + bookID,
		})
	}
	return results
}
