package metasource

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"talebook/booksvr/internal/metabase"
	"talebook/booksvr/internal/safehttp"
)

// QimaoISBN 复刻 QIMAO_ISBN。
const QimaoISBN = "0000000000004"

// QimaoKey 复刻 KEY。
const QimaoKey = "QimaoNovel"

// QimaoSignKey 复刻 SIGN_KEY。
const QimaoSignKey = "d3dGiJc651gSQ8w1"

// QimaoTimeout 复刻 API_TIMEOUT。
const QimaoTimeout = 15

// QimaoSearchURL 复刻搜索接口地址。
const QimaoSearchURL = "https://api-bc.wtzw.com/search/v1/words"

// QimaoDetailURL 复刻详情接口地址。
const QimaoDetailURL = "https://api-bc.wtzw.com/api/v1/reader/detail"

// QimaoVersionList 复刻 VERSION_LIST。
var QimaoVersionList = []string{
	"73720", "73700", "73620", "73600", "73500", "73420", "73400",
	"73328", "73325", "73320", "73300", "73220", "73200", "73100",
	"73000", "72900", "72820", "72800", "70720", "62010", "62112",
}

// qimaoHeaders 复刻 CHROME_HEADERS。
var qimaoHeaders = map[string]string{
	"Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.6",
	"Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
	"User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko)" +
		"Chrome/66.0.3359.139 Safari/537.36",
}

// SignParams 复刻 _sign_params：按 key 排序拼接后追加 SIGN_KEY 取 MD5。
//
// 就地写入 "sign" 并返回同一 map。
func SignParams(params map[string]string) map[string]string {
	keys := make([]string, 0, len(params))
	for k := range params {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	var b strings.Builder
	for _, k := range keys {
		b.WriteString(k)
		b.WriteByte('=')
		b.WriteString(params[k])
	}
	b.WriteString(QimaoSignKey)

	sum := md5.Sum([]byte(b.String()))
	params["sign"] = hex.EncodeToString(sum[:])
	return params
}

// MakeQimaoHeaders 复刻 _make_headers：用 book_id 作种子选 app-version 并签名。
func MakeQimaoHeaders(bookID string) map[string]string {
	version := pyRandomChoice(bookID, QimaoVersionList)
	headers := map[string]string{
		"AUTHORIZATION":  "",
		"app-version":    version,
		"application-id": "com.****.reader",
		"channel":        "unknown",
		"net-env":        "1",
		"platform":       "android",
		"qm-params":      "",
		"reg":            "0",
	}
	keys := make([]string, 0, len(headers))
	for k := range headers {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	var b strings.Builder
	for _, k := range keys {
		b.WriteString(k)
		b.WriteByte('=')
		b.WriteString(headers[k])
	}
	b.WriteString(QimaoSignKey)

	sum := md5.Sum([]byte(b.String()))
	headers["sign"] = hex.EncodeToString(sum[:])
	return headers
}

// QimaoSource 实现七猫小说元数据源。
type QimaoSource struct {
	HTTP *safehttp.SafeHttpClient
	// SearchURL / DetailURL 便于测试覆盖。
	SearchURL string
	DetailURL string
}

// NewQimaoSource 构造七猫小说源。
func NewQimaoSource(http *safehttp.SafeHttpClient) *QimaoSource {
	if http == nil {
		http = &safehttp.SafeHttpClient{}
	}
	return &QimaoSource{HTTP: http}
}

// searchURL 返回生效的搜索地址。
func (s *QimaoSource) searchURL() string {
	if s.SearchURL != "" {
		return s.SearchURL
	}
	return QimaoSearchURL
}

// detailURL 返回生效的详情地址。
func (s *QimaoSource) detailURL() string {
	if s.DetailURL != "" {
		return s.DetailURL
	}
	return QimaoDetailURL
}

// SearchCatalog 复刻 search_catalog：返回原始书籍列表。
func (s *QimaoSource) SearchCatalog(keyword string, page int) []map[string]any {
	if page <= 0 {
		page = 1
	}
	params := SignParams(map[string]string{
		"extend":              "",
		"tab":                 "0",
		"gender":              "0",
		"refresh_state":       "8",
		"page":                strconv.Itoa(page),
		"wd":                  keyword,
		"is_short_story_user": "0",
	})
	headers := MakeQimaoHeaders("00000000")

	target := s.searchURL() + "?" + encodeQuery(params)
	resp, err := s.HTTP.Get(context.Background(), target, safehttp.RequestOptions{
		Headers: headers, Timeout: QimaoTimeout * 1e9, HasTimeout: true,
	})
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	body, err := readAll(resp.Body)
	if err != nil {
		return nil
	}
	var data map[string]any
	if err := json.Unmarshal(body, &data); err != nil {
		return nil
	}
	payload, _ := data["data"].(map[string]any)
	if payload == nil {
		return nil
	}
	for _, key := range []string{"books", "book_list", "ret_data"} {
		if list, ok := payload[key].([]any); ok && len(list) > 0 {
			return toMapSlice(list)
		}
	}
	return nil
}

// encodeQuery 按 url.Values 编码查询串（键已排序，保证签名可复现）。
func encodeQuery(params map[string]string) string {
	keys := make([]string, 0, len(params))
	for k := range params {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	values := url.Values{}
	for _, k := range keys {
		values.Set(k, params[k])
	}
	return values.Encode()
}

// toMapSlice 把 []any 转为 []map[string]any，跳过非对象项。
func toMapSlice(list []any) []map[string]any {
	out := make([]map[string]any, 0, len(list))
	for _, item := range list {
		if m, ok := item.(map[string]any); ok {
			out = append(out, m)
		}
	}
	return out
}

// GetBookDetail 复刻 get_book_detail：返回 data 字段（必要时下钻 book）。
func (s *QimaoSource) GetBookDetail(bookID string) map[string]any {
	params := SignParams(map[string]string{"id": bookID})
	headers := MakeQimaoHeaders(bookID)

	target := s.detailURL() + "?" + encodeQuery(params)
	resp, err := s.HTTP.Get(context.Background(), target, safehttp.RequestOptions{
		Headers: headers, Timeout: QimaoTimeout * 1e9, HasTimeout: true,
	})
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	body, err := readAll(resp.Body)
	if err != nil {
		return nil
	}
	var data map[string]any
	if err := json.Unmarshal(body, &data); err != nil {
		return nil
	}
	detail, _ := data["data"].(map[string]any)
	if detail == nil {
		return nil
	}
	if book, ok := detail["book"].(map[string]any); ok {
		return book
	}
	return detail
}

// GetBookByID 复刻 get_book_by_id。
func (s *QimaoSource) GetBookByID(bookID string, copyImage bool) map[string]any {
	detail := s.GetBookDetail(bookID)
	if detail == nil {
		return nil
	}
	return s.BuildMetadata(bookID, detail, copyImage)
}

// GetBook 复刻 get_book：优先精确匹配书名（与作者），否则取第一条。
func (s *QimaoSource) GetBook(title, author string, copyImage bool) map[string]any {
	keyword := title
	if author != "" {
		keyword = title + " " + author
	}
	results := s.SearchCatalog(keyword, 1)
	if len(results) == 0 {
		return nil
	}

	for _, item := range results {
		itemTitle := firstNonEmptyString(item, "book_name", "title", "original_title")
		itemAuthor := firstNonEmptyString(item, "author_name", "author", "original_author")
		if itemTitle == title {
			if author == "" || itemAuthor == author {
				if bookID := firstNonEmptyString(item, "book_id", "id"); bookID != "" {
					return s.GetBookByID(bookID, copyImage)
				}
			}
		}
	}

	first := results[0]
	if bookID := firstNonEmptyString(first, "book_id", "id"); bookID != "" {
		return s.GetBookByID(bookID, copyImage)
	}
	return nil
}

// firstNonEmptyString 复刻 `a or b or c` 的取值链，并把值转为字符串。
func firstNonEmptyString(item map[string]any, keys ...string) string {
	for _, k := range keys {
		v, ok := item[k]
		if !ok || v == nil {
			continue
		}
		s := doubanV2IDString(v)
		if s != "" {
			return s
		}
	}
	return ""
}

// BuildMetadata 复刻 _metadata。
func (s *QimaoSource) BuildMetadata(bookID string, detail map[string]any, copyImage bool) map[string]any {
	title := firstNonEmptyString(detail, "book_name", "title")
	if title == "" {
		return nil
	}

	author := firstNonEmptyString(detail, "author_name", "author")
	if author == "" {
		author = "佚名"
	}

	mi := map[string]any{
		"title":          title,
		"authors":        []any{author},
		"author":         author,
		"author_sort":    author,
		"publisher":      nil,
		"isbn":           QimaoISBN,
		"tags":           qimaoTags(detail),
		"comments":       firstNonEmptyString(detail, "abstract", "intro", "summary"),
		"website":        "https://www.qimao.com/shuku/" + bookID + "/",
		"source":         "七猫小说",
		"provider_key":   QimaoKey,
		"provider_value": bookID,
		"series":         nil,
		"rating":         nil,
	}

	coverURL := firstNonEmptyString(detail, "thumb_url", "image_link", "cover")
	mi["cover_url"] = coverURL
	mi["cover_data"] = nil
	if copyImage && coverURL != "" {
		if cover := s.GetCover(coverURL); cover != nil {
			mi["cover_data"] = []any{cover.Extension, cover.Content}
		}
	}
	return mi
}

// qimaoTags 复刻 _metadata 中的标签提取逻辑。
func qimaoTags(detail map[string]any) []any {
	categoryTags := make([]string, 0, 2)
	for _, key := range []string{"category1_name", "category2_name"} {
		if v := firstNonEmptyString(detail, key); v != "" {
			categoryTags = append(categoryTags, v)
		}
	}

	var raw any
	if len(categoryTags) > 0 {
		raw = toAnySlice(categoryTags)
	} else {
		for _, key := range []string{"category_name", "ptags", "tags"} {
			if v, ok := detail[key]; ok && v != nil {
				raw = v
				break
			}
		}
	}

	switch t := raw.(type) {
	case []any:
		if len(t) > 8 {
			t = t[:8]
		}
		return t
	case []string:
		if len(t) > 8 {
			t = t[:8]
		}
		return toAnySlice(t)
	case string:
		if t == "" {
			return []any{}
		}
		parts := strings.Split(strings.ReplaceAll(t, "，", ","), ",")
		out := make([]any, 0, len(parts))
		for _, p := range parts {
			if s := pyStrip(p); s != "" {
				out = append(out, s)
			}
			if len(out) >= 8 {
				break
			}
		}
		return out
	}
	return []any{}
}

// qimaoCoverExtRe 复刻 cover_url.split(".")[-1].lower().split("?")[0]。
var qimaoCoverExtRe = regexp.MustCompile(`\.([^.]*)$`)

// qimaoImageFormats 复刻封面扩展名白名单。
var qimaoImageFormats = map[string]bool{
	"jpg": true, "jpeg": true, "png": true, "gif": true, "webp": true,
}

// GetCover 复刻 get_cover。
func (s *QimaoSource) GetCover(coverURL string) *metabase.CoverResult {
	if coverURL == "" {
		return nil
	}
	resp, err := s.HTTP.Get(context.Background(), coverURL, safehttp.RequestOptions{
		Headers: qimaoHeaders, Timeout: 10e9, HasTimeout: true,
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

	imgFmt := "jpg"
	if m := qimaoCoverExtRe.FindStringSubmatch(coverURL); m != nil {
		ext := strings.ToLower(m[1])
		if i := strings.Index(ext, "?"); i >= 0 {
			ext = ext[:i]
		}
		if qimaoImageFormats[ext] {
			imgFmt = ext
		}
	}
	return &metabase.CoverResult{Extension: imgFmt, Content: img}
}
