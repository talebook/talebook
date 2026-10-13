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

// DoubanV2Key 复刻 KEY。
const DoubanV2Key = "douban_v2"

// DoubanV2UA 复刻 _UA。
const DoubanV2UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
	"(KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36"

// DoubanV2SearchBase 复刻 _SEARCH_BASE。
const DoubanV2SearchBase = "https://search.douban.com/book/subject_search"

// DoubanV2Referer 复刻默认 Referer。
const DoubanV2Referer = "https://book.douban.com/"

// DoubanV2Timeout 复刻请求超时（秒）。
const DoubanV2Timeout = 10

// doubanV2SearchHeaders 复刻 _SEARCH_HEADERS。
var doubanV2SearchHeaders = map[string]string{
	"User-Agent": DoubanV2UA,
	"Referer":    DoubanV2Referer,
	"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9," +
		"image/avif,image/webp,image/apng,*/*;q=0.8," +
		"application/signed-exchange;v=b3;q=0.7",
	"Accept-Language": "zh-CN,zh;q=0.9",
}

// doubanV2CoverHeaders 复刻 _COVER_HEADERS。
var doubanV2CoverHeaders = map[string]string{"User-Agent": DoubanV2UA}

// doubanV2WTKRe 等复刻 _parse_js_challenge_cookies 的四个正则。
var (
	doubanV2WTKRe = regexp.MustCompile(`WTKkN\s*:\s*(\d+)`)
	doubanV2BORe  = regexp.MustCompile(`bOYDu\s*:\s*(\d+)`)
	doubanV2WYRe  = regexp.MustCompile(`wyeCN\s*:\s*(\d+)`)
	doubanV2EORe  = regexp.MustCompile(`iTyzs\s*\([^,]+,\s*(\d+)\)`)
)

// ParseJSChallengeCookies 复刻 _parse_js_challenge_cookies。
func ParseJSChallengeCookies(html string) map[string]string {
	cookies := map[string]string{}
	mWT := doubanV2WTKRe.FindStringSubmatch(html)
	mBO := doubanV2BORe.FindStringSubmatch(html)
	mWY := doubanV2WYRe.FindStringSubmatch(html)
	if mWT != nil && mBO != nil && mWY != nil {
		a, _ := strconv.Atoi(mWT[1])
		b, _ := strconv.Atoi(mBO[1])
		c, _ := strconv.Atoi(mWY[1])
		cookies["__tst_status"] = strconv.Itoa(a + b + c)
	}
	if mEO := doubanV2EORe.FindStringSubmatch(html); mEO != nil {
		cookies["EO_Bot_Ssid"] = mEO[1]
	}
	return cookies
}

// doubanV2DataRe 复刻 r"window\.__DATA__\s*=\s*({.*?});"（DOTALL）。
var doubanV2DataRe = regexp.MustCompile(`(?s)window\.__DATA__\s*=\s*(\{.*?\});`)

// DoubanV2Item 是搜索结果中的一条 search_subject。
type DoubanV2Item struct {
	Title    string
	Abstract string
	URL      string
	ID       string
	CoverURL string
	Rating   float64
	// HasRating 区分「无 rating 字段」与「rating 为 0」。
	HasRating bool
}

// DoubanV2Source 实现豆瓣(V2) 元数据源。
type DoubanV2Source struct {
	HTTP *safehttp.SafeHttpClient
	// SearchBase 便于测试覆盖；为空时用 DoubanV2SearchBase。
	SearchBase string
}

// NewDoubanV2Source 构造豆瓣(V2) 源。
func NewDoubanV2Source(http *safehttp.SafeHttpClient) *DoubanV2Source {
	if http == nil {
		http = &safehttp.SafeHttpClient{}
	}
	return &DoubanV2Source{HTTP: http}
}

// searchBase 返回生效的搜索基地址。
func (s *DoubanV2Source) searchBase() string {
	if s.SearchBase != "" {
		return s.SearchBase
	}
	return DoubanV2SearchBase
}

// Search 复刻 search：返回过滤后的条目与搜索 URL。
func (s *DoubanV2Source) Search(query string, maxCount int) ([]DoubanV2Item, string) {
	if maxCount <= 0 {
		maxCount = 1
	}
	target := s.searchBase() + "?search_text=" + url.QueryEscape(query) + "&cat=1001"

	resp, err := s.HTTP.Get(context.Background(), target, safehttp.RequestOptions{
		Headers: doubanV2SearchHeaders, Timeout: DoubanV2Timeout * 1e9, HasTimeout: true,
	})
	if err != nil {
		return nil, ""
	}
	defer resp.Body.Close()

	body, err := readAll(resp.Body)
	if err != nil {
		return nil, ""
	}
	html := string(body)

	m := doubanV2DataRe.FindStringSubmatch(html)
	if m == nil {
		return nil, target
	}

	var data map[string]any
	if err := json.Unmarshal([]byte(m[1]), &data); err != nil {
		return nil, target
	}

	rawItems, _ := data["items"].([]any)
	items := make([]DoubanV2Item, 0, len(rawItems))
	for _, raw := range rawItems {
		obj, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		if tpl, _ := obj["tpl_name"].(string); tpl != "search_subject" {
			continue
		}
		items = append(items, parseDoubanV2Item(obj))
	}
	if len(items) > maxCount {
		items = items[:maxCount]
	}
	return items, target
}

// parseDoubanV2Item 把原始 JSON 对象转为 DoubanV2Item。
func parseDoubanV2Item(obj map[string]any) DoubanV2Item {
	item := DoubanV2Item{}
	item.Title, _ = obj["title"].(string)
	item.Abstract, _ = obj["abstract"].(string)
	item.URL, _ = obj["url"].(string)
	item.CoverURL, _ = obj["cover_url"].(string)
	item.ID = doubanV2IDString(obj["id"])
	if rating, ok := obj["rating"].(map[string]any); ok {
		if v, ok2 := toFloat(rating["value"]); ok2 {
			item.Rating = v
			item.HasRating = true
		}
	}
	return item
}

// doubanV2IDString 复刻 str(item.get("id", ""))。
//
// JSON 数字在 Go 中解析为 float64，需避免出现 "123.0" 这类表示。
func doubanV2IDString(v any) string {
	switch t := v.(type) {
	case nil:
		return ""
	case string:
		return t
	case float64:
		if t == float64(int64(t)) {
			return strconv.FormatInt(int64(t), 10)
		}
		return strconv.FormatFloat(t, 'f', -1, 64)
	case bool:
		if t {
			return "True"
		}
		return "False"
	}
	return ""
}

// doubanV2IntroParser 复刻 _BookDetailParser：流式提取作者、ISBN 与简介。
type doubanV2IntroParser struct {
	inAllSpan bool
	inIntro   bool
	divDepth  int
	chunks    []string

	fallbackInIntro  bool
	fallbackDivDepth int
	fallbackChunks   []string

	Authors []string
	ISBN    string
}

// newDoubanV2IntroParser 构造解析器。
func newDoubanV2IntroParser() *doubanV2IntroParser {
	return &doubanV2IntroParser{}
}

// Feed 复刻 HTMLParser.feed：按事件驱动解析。
//
// Python 的 HTMLParser 是流式的 start/end/data 事件；这里用 DOM 前序遍历
// 重建同一事件序列，以保持状态机语义一致。
func (p *doubanV2IntroParser) Feed(html string) error {
	doc, err := htmlx.Parse(html)
	if err != nil {
		return err
	}
	p.emit(doc)
	return nil
}

// emit 按前序递归产生 start / data / end 事件。
func (p *doubanV2IntroParser) emit(n *htmlx.Node) {
	if n == nil || n.Raw == nil {
		return
	}
	switch n.Raw.Type {
	case htmlx.NodeText:
		p.handleData(n.Raw.Data)
		return
	case htmlx.NodeElement:
		p.handleStartTag(n.Raw.Data, n.Attrs())
		for c := n.Raw.FirstChild; c != nil; c = c.NextSibling {
			p.emit(&htmlx.Node{Raw: c})
		}
		p.handleEndTag(n.Raw.Data)
		return
	}
	// 其他节点类型（注释、doctype）不产生事件。
	for c := n.Raw.FirstChild; c != nil; c = c.NextSibling {
		p.emit(&htmlx.Node{Raw: c})
	}
}

// handleStartTag 复刻 handle_starttag。
func (p *doubanV2IntroParser) handleStartTag(tag string, attrs []htmlx.Attr) {
	attrsD := map[string]string{}
	for _, a := range attrs {
		attrsD[a.Key] = a.Val
	}

	if tag == "meta" {
		switch attrsD["property"] {
		case "book:author":
			if c := attrsD["content"]; c != "" {
				p.Authors = append(p.Authors, c)
			}
		case "book:isbn":
			if c := attrsD["content"]; c != "" {
				p.ISBN = c
			}
		}
		return
	}

	classes := strings.Fields(attrsD["class"])
	if tag == "span" && containsString(classes, "all") {
		p.inAllSpan = true
		return
	}
	if p.inAllSpan && !p.inIntro && tag == "div" && containsString(classes, "intro") {
		p.inIntro = true
		p.divDepth = 1
		return
	}
	if p.inIntro {
		if tag == "div" {
			p.divDepth++
		}
		p.chunks = append(p.chunks, "<"+tag+doubanV2AttrsString(attrs)+">")
		return
	}
	// 兜底：span.all 之外的任意 div.intro。
	if !p.inAllSpan && !p.fallbackInIntro && tag == "div" && containsString(classes, "intro") {
		p.fallbackInIntro = true
		p.fallbackDivDepth = 1
		return
	}
	if p.fallbackInIntro {
		if tag == "div" {
			p.fallbackDivDepth++
		}
		p.fallbackChunks = append(p.fallbackChunks, "<"+tag+doubanV2AttrsString(attrs)+">")
	}
}

// handleEndTag 复刻 handle_endtag。
func (p *doubanV2IntroParser) handleEndTag(tag string) {
	switch {
	case p.inIntro:
		if tag == "div" {
			p.divDepth--
			if p.divDepth == 0 {
				p.inIntro = false
				return
			}
		}
		p.chunks = append(p.chunks, "</"+tag+">")
	case p.fallbackInIntro:
		if tag == "div" {
			p.fallbackDivDepth--
			if p.fallbackDivDepth == 0 {
				p.fallbackInIntro = false
				return
			}
		}
		p.fallbackChunks = append(p.fallbackChunks, "</"+tag+">")
	case tag == "span" && p.inAllSpan:
		p.inAllSpan = false
	}
}

// handleData 复刻 handle_data。
func (p *doubanV2IntroParser) handleData(data string) {
	switch {
	case p.inIntro:
		p.chunks = append(p.chunks, data)
	case p.fallbackInIntro:
		p.fallbackChunks = append(p.fallbackChunks, data)
	}
}

// containsString 判断切片是否包含给定字符串。
func containsString(list []string, want string) bool {
	for _, v := range list {
		if v == want {
			return true
		}
	}
	return false
}

// GetIntro 复刻 get_intro：优先主路径，为空时回落兜底路径。
func (p *doubanV2IntroParser) GetIntro() string {
	primary := pyStrip(strings.Join(p.chunks, ""))
	if primary != "" {
		return primary
	}
	return pyStrip(strings.Join(p.fallbackChunks, ""))
}

// doubanV2AttrsString 复刻 attrs_str 的拼接（保留原始属性顺序与引号）。
func doubanV2AttrsString(attrs []htmlx.Attr) string {
	var b strings.Builder
	for _, a := range attrs {
		b.WriteByte(' ')
		b.WriteString(a.Key)
		b.WriteString(`="`)
		b.WriteString(a.Val)
		b.WriteByte('"')
	}
	return b.String()
}
