package metasource

import (
	"bytes"
	"context"
	"encoding/json"
	"image"
	"image/jpeg"
	"image/png"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"

	"talebook/booksvr/internal/htmlx"
	"talebook/booksvr/internal/metabase"
	"talebook/booksvr/internal/safehttp"
)

// BaikeISBN 复刻 BAIKE_ISBN。
const BaikeISBN = "0000000000001"

// BaikeKey 复刻 KEY。
const BaikeKey = "BaiduBaike"

// BaikeEndpoint 复刻 BAIKE_ENDPOINT。
const BaikeEndpoint = "https://baike.baidu.com/api/openapi/BaikeLemmaCardApi"

// BaikeTimeout 复刻 BAIKE_TIMEOUT。
const BaikeTimeout = 15

// BaikeAttempts 复刻 BAIKE_ATTEMPTS。
const BaikeAttempts = 3

// BaikeCoverHost 复刻 BAIKE_COVER_HOST。
const BaikeCoverHost = "bkimg.cdn.bcebos.com"

// BaikeReferencePrefix 复刻 REFERENCE_PREFIX。
const BaikeReferencePrefix = "baike:v1:"

// baikeBookCardFields 复刻 _BOOK_CARD_FIELDS。
var baikeBookCardFields = map[string]bool{
	"ISBN": true, "中文名": true, "书名": true, "作品名称": true,
	"作者": true, "出版社": true, "出版时间": true, "首版时间": true, "文学体裁": true,
}

// baikeHeaders 复刻 constants.CHROME_MOBILE_HEADERS。
var baikeHeaders = map[string]string{
	"Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.6",
	"Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
	"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)" +
		"Version/14.0 Mobile/15E148 Safari/604.1",
}

// StripCardMarkup 复刻 _strip_card_markup：线性提取卡片文本，丢弃标签。
//
// Python 用 HTMLParser(convert_charrefs=True) 收集 handle_data；
// Go 侧用 DOM 文本节点遍历等价实现（实体已被解析器解码）。
func StripCardMarkup(value string) string {
	doc, err := htmlx.Parse(value)
	if err != nil {
		return value
	}
	var b strings.Builder
	doc.Walk(func(n *htmlx.Node) {
		if n.Raw.Type == htmlx.NodeText {
			b.WriteString(n.Raw.Data)
		}
	})
	return b.String()
}

// TrustedCoverURL 复刻 _trusted_cover_url：只接受指定 CDN 的 https 地址。
//
// 返回规范化后的 URL；不满足条件返回空串。
func TrustedCoverURL(value string) string {
	parsed, err := url.Parse(value)
	if err != nil {
		return ""
	}
	// Python 的 parsed.port 对越界/非数字端口抛 ValueError。
	port := parsed.Port()
	if port != "" {
		n, err := strconv.Atoi(port)
		if err != nil || n < 0 || n > 65535 {
			return ""
		}
	}
	if strings.ToLower(parsed.Scheme) != "https" || parsed.Hostname() != BaikeCoverHost {
		return ""
	}
	if parsed.User != nil {
		return ""
	}
	if port != "" && port != "443" {
		return ""
	}
	suffix := "/" + strings.TrimLeft(parsed.Path, "/")
	if parsed.RawQuery != "" {
		suffix += "?" + parsed.RawQuery
	}
	return "https://" + BaikeCoverHost + suffix
}

// BaikeSource 实现百度百科元数据源。
type BaikeSource struct {
	HTTP *safehttp.SafeHttpClient
	// Endpoint 便于测试覆盖。
	Endpoint string
	// Lang 决定 str2date 使用的格式表。
	Lang string
}

// NewBaikeSource 构造百度百科源。
func NewBaikeSource(http *safehttp.SafeHttpClient) *BaikeSource {
	if http == nil {
		http = &safehttp.SafeHttpClient{}
	}
	return &BaikeSource{HTTP: http}
}

// endpoint 返回生效的接口地址。
func (s *BaikeSource) endpoint() string {
	if s.Endpoint != "" {
		return s.Endpoint
	}
	return BaikeEndpoint
}

// baikeTitlePrefixRe 复刻 re.match(r"^\d*[_-]", title)。
var baikeTitlePrefixRe = regexp.MustCompile(`^\d*[_-]`)

// baikeUnknownAuthors 复刻 get_book 中的无效作者集合。
var baikeUnknownAuthors = map[string]bool{
	"佚名": true, "未知": true, "unknown": true, "unknown author": true,
}

// GetBook 复刻 get_book。
func (s *BaikeSource) GetBook(title, author string, expectedID string, copyImage bool) map[string]any {
	if author != "" && baikeUnknownAuthors[strings.ToLower(pyStrip(author))] {
		author = ""
	}
	// 剥除形如 "123_" / "12-" 的前缀。
	if baikeTitlePrefixRe.MatchString(title) {
		title = baikeTitlePrefixRe.ReplaceAllString(title, "")
	}

	queries := []string{title}
	if author != "" {
		queries = append(queries, title+" "+author)
	}
	for _, query := range queries {
		entry := s.baike(query)
		if entry == nil || !s.isBookEntry(entry, title, author) {
			continue
		}
		entryID := baikeEntryID(entry)
		if expectedID != "" && entryID != expectedID {
			return nil
		}
		return s.BuildMetadata(entry, copyImage)
	}
	return nil
}

// baike 复刻 _baike：最多重试 BAIKE_ATTEMPTS 次。
func (s *BaikeSource) baike(title string) map[string]any {
	params := url.Values{}
	params.Set("scope", "103")
	params.Set("format", "json")
	params.Set("appid", "379020")
	params.Set("bk_key", title)
	params.Set("bk_length", "600")

	for attempt := 0; attempt < BaikeAttempts; attempt++ {
		resp, err := s.HTTP.Get(context.Background(), s.endpoint()+"?"+params.Encode(),
			safehttp.RequestOptions{Headers: baikeHeaders, Timeout: BaikeTimeout * 1e9, HasTimeout: true})
		if err != nil {
			continue
		}
		if resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			continue
		}
		body, err := readAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			continue
		}
		var data map[string]any
		if err := json.Unmarshal(body, &data); err != nil {
			continue
		}
		if errno, ok := data["errno"]; ok && !baikeErrnoOK(errno) {
			continue
		}
		if baikeEntryID(data) != "" {
			return data
		}
	}
	return nil
}

// baikeErrnoOK 复刻 `data.get("errno") not in (None, 0, "0")` 的取反。
func baikeErrnoOK(errno any) bool {
	switch t := errno.(type) {
	case nil:
		return true
	case float64:
		return t == 0
	case string:
		return t == "0"
	}
	return false
}

// baikeEntryID 复刻 str(entry.get("newLemmaId") or entry.get("id") or "")。
func baikeEntryID(entry map[string]any) string {
	if v, ok := entry["newLemmaId"]; ok && v != nil {
		if s := doubanV2IDString(v); s != "" {
			return s
		}
	}
	if v, ok := entry["id"]; ok && v != nil {
		return doubanV2IDString(v)
	}
	return ""
}

// CardInfo 复刻 _card_info：把 card 列表归一化为 name → 拼接后的文本。
func (s *BaikeSource) CardInfo(entry map[string]any) map[string]string {
	info := map[string]string{}
	card, _ := entry["card"].([]any)
	for _, raw := range card {
		item, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		name := ""
		if v, ok := item["name"].(string); ok && v != "" {
			name = v
		} else if v, ok := item["key"].(string); ok {
			name = v
		}
		value, hasValue := item["value"]
		if name == "" || !hasValue || value == nil || value == "" {
			continue
		}

		var values []any
		if arr, isArr := value.([]any); isArr {
			values = arr
		} else {
			values = []any{value}
		}
		cleanValues := make([]string, 0, len(values))
		for _, rawValue := range values {
			text := pyStrip(StripCardMarkup(baikeStringify(rawValue)))
			if text != "" {
				cleanValues = append(cleanValues, text)
			}
		}
		if len(cleanValues) > 0 {
			info[pyStrip(name)] = strings.Join(cleanValues, "、")
		}
	}
	return info
}

// baikeStringify 复刻 str(value)。
func baikeStringify(v any) string {
	switch t := v.(type) {
	case nil:
		return "None"
	case string:
		return t
	case bool:
		if t {
			return "True"
		}
		return "False"
	case float64:
		return doubanV2IDString(t)
	}
	encoded, err := json.Marshal(v)
	if err != nil {
		return ""
	}
	return string(encoded)
}

// baikeNonWordRe 复刻 re.sub(r"[\W_]+", "", str(value or ""))。
//
// Python 的 `\W` 在 Unicode 模式下等价于「非 [a-zA-Z0-9_] 且非 Unicode 字母/数字」。
var baikeNonWordRe = regexp.MustCompile(`[^\p{L}\p{N}]+`)

// Normalize 复刻 _normalize。
func (s *BaikeSource) Normalize(value string) string {
	return strings.ToLower(baikeNonWordRe.ReplaceAllString(value, ""))
}

// IsBookEntry 复刻 _is_book_entry。
func (s *BaikeSource) IsBookEntry(entry map[string]any, title, author string) bool {
	return s.isBookEntry(entry, title, author)
}

func (s *BaikeSource) isBookEntry(entry map[string]any, title, author string) bool {
	info := s.CardInfo(entry)

	lemmaTitle := ""
	if v, ok := entry["title"].(string); ok && v != "" {
		lemmaTitle = v
	} else if v, ok := entry["key"].(string); ok && v != "" {
		lemmaTitle = v
	} else if v := info["作品名称"]; v != "" {
		lemmaTitle = v
	} else {
		lemmaTitle = info["中文名"]
	}

	expected := s.Normalize(title)
	actual := s.Normalize(lemmaTitle)
	if expected == "" || actual == "" || (!strings.Contains(actual, expected) && !strings.Contains(expected, actual)) {
		return false
	}

	// 必须命中「书名类」之外的卡片字段。
	hasBookField := false
	for field := range baikeBookCardFields {
		if field == "中文名" || field == "书名" || field == "作品名称" {
			continue
		}
		if _, ok := info[field]; ok {
			hasBookField = true
			break
		}
	}
	if !hasBookField {
		return false
	}

	if author != "" && info["作者"] != "" {
		expectedAuthor := s.Normalize(author)
		actualAuthor := s.Normalize(info["作者"])
		if expectedAuthor != "" && !strings.Contains(actualAuthor, expectedAuthor) && !strings.Contains(expectedAuthor, actualAuthor) {
			return false
		}
	}
	return true
}

// baikeTagSplitRe 复刻 re.split(r"[,，]", raw_tags)。
var baikeTagSplitRe = regexp.MustCompile(`[,，]`)

// BuildMetadata 复刻 _metadata。
func (s *BaikeSource) BuildMetadata(entry map[string]any, copyImage bool) map[string]any {
	info := s.CardInfo(entry)

	title := info["作品名称"]
	if title == "" {
		title = info["中文名"]
	}
	if title == "" {
		title = info["书名"]
	}
	if title == "" {
		title, _ = entry["title"].(string)
	}
	if title == "" {
		title, _ = entry["key"].(string)
	}
	if title == "" {
		return nil
	}

	author := info["作者"]
	if author == "" {
		author = "佚名"
	}

	isbn := info["ISBN"]
	if isbn == "" {
		isbn = BaikeISBN
	}

	// 标签：可能是字符串（逗号分隔）或列表。
	var rawTags []string
	switch t := entry["tag"].(type) {
	case string:
		rawTags = baikeTagSplitRe.Split(t, -1)
	case []any:
		for _, v := range t {
			rawTags = append(rawTags, baikeStringify(v))
		}
	default:
		switch t := entry["tags"].(type) {
		case string:
			rawTags = baikeTagSplitRe.Split(t, -1)
		case []any:
			for _, v := range t {
				rawTags = append(rawTags, baikeStringify(v))
			}
		}
	}
	tags := make([]string, 0, len(rawTags))
	for _, tag := range rawTags {
		if s := pyStrip(tag); s != "" {
			tags = append(tags, s)
		}
		if len(tags) >= 8 {
			break
		}
	}

	// 封面：可能是字符串或对象。
	image := ""
	switch t := entry["image"].(type) {
	case string:
		image = t
	case map[string]any:
		if v, ok := t["url"].(string); ok && v != "" {
			image = v
		} else if v, ok := t["imageUrl"].(string); ok {
			image = v
		}
	}

	comments := ""
	if v, ok := entry["abstract"].(string); ok && v != "" {
		comments = v
	} else if v, ok := entry["desc"].(string); ok {
		comments = v
	}

	entryID := baikeEntryID(entry)

	mi := map[string]any{
		"title":          title,
		"publisher":      info["出版社"],
		"authors":        []any{author},
		"author":         author,
		"author_sort":    author,
		"isbn":           isbn,
		"tags":           toAnySlice(tags),
		"cover_url":      image,
		"comments":       comments,
		"website":        "https://baike.baidu.com/item/" + entryID,
		"source":         "百度百科",
		"provider_key":   BaikeKey,
		"provider_value": entryID,
	}

	// 出版日期：解析失败时由调用方注入当前时间（Python 用 utcnow()）。
	pubDate := info["出版时间"]
	if pubDate == "" {
		pubDate = info["首版时间"]
	}
	if pd := Str2Date(pubDate, s.Lang); pd != nil {
		mi["pubdate"] = formatUTCDate(*pd)
	}

	mi["cover_data"] = nil
	if image != "" && copyImage {
		if cover := s.GetCover(image, true); cover != nil {
			mi["cover_data"] = []any{cover.Extension, cover.Content}
		}
	}
	return mi
}

// GetCover 复刻 get_cover：校验 CDN 白名单，PNG 转 JPEG。
func (s *BaikeSource) GetCover(coverURL string, normalCover bool) *metabase.CoverResult {
	if coverURL == "" {
		return nil
	}
	trustedURL := TrustedCoverURL(coverURL)
	if trustedURL == "" {
		return nil
	}

	client := s.HTTP
	if client == nil {
		client = &safehttp.SafeHttpClient{}
	}
	// 复刻 SafeHttpClient(allowed_hosts=(BAIKE_COVER_HOST,))。
	resp, err := client.Get(context.Background(), trustedURL, safehttp.RequestOptions{
		Headers: baikeHeaders, Timeout: 10e9, HasTimeout: true,
		AllowedHosts: []string{BaikeCoverHost},
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
		converted, err := convertPNGToJPEG(img, normalCover)
		if err != nil {
			return nil
		}
		img = converted
		imgFmt = "jpg"
	}
	return &metabase.CoverResult{Extension: imgFmt, Content: img}
}

// convertPNGToJPEG 复刻 get_cover 中的 PNG→JPEG 转换。
//
// 复刻要点：
//   - RGBA / P 模式先转 RGB；
//   - 高宽比 < 1.2 且 normalCover 时，居中裁剪为正方形；
//   - 以 JPEG 编码输出。
func convertPNGToJPEG(data []byte, normalCover bool) ([]byte, error) {
	src, err := png.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, err
	}

	img := toRGB(src)
	bounds := img.Bounds()
	width, height := bounds.Dx(), bounds.Dy()

	if width > 0 && float64(height)/float64(width) < 1.2 && normalCover {
		minDim := width
		if height < minDim {
			minDim = height
		}
		left := (width - minDim) / 2
		top := (height - minDim) / 2
		img = cropImage(img, left, top, minDim, minDim)
	}

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, nil); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// toRGB 把任意图像转为 RGB（丢弃 alpha）。
func toRGB(src image.Image) *image.RGBA {
	bounds := src.Bounds()
	dst := image.NewRGBA(bounds)
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			r, g, b, _ := src.At(x, y).RGBA()
			i := dst.PixOffset(x, y)
			dst.Pix[i] = uint8(r >> 8)
			dst.Pix[i+1] = uint8(g >> 8)
			dst.Pix[i+2] = uint8(b >> 8)
			dst.Pix[i+3] = 0xff
		}
	}
	return dst
}

// cropImage 从 (left, top) 起裁剪 w×h 区域。
func cropImage(src *image.RGBA, left, top, w, h int) *image.RGBA {
	dst := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			dst.Set(x, y, src.At(left+x, top+y))
		}
	}
	return dst
}

// BaikeReference 复刻 _search 写入 provider_value 的引用结构。
type BaikeReference struct {
	Title  string `json:"title"`
	Author string `json:"author"`
	ID     string `json:"id"`
}

// EncodeBaikeReference 复刻 REFERENCE_PREFIX + json.dumps(..., separators=(",", ":"))。
func EncodeBaikeReference(title, author, id string) string {
	encoded, err := json.Marshal(BaikeReference{Title: title, Author: author, ID: id})
	if err != nil {
		return ""
	}
	return BaikeReferencePrefix + string(encoded)
}

// baikeLemmaIDRe 复刻 re.fullmatch(r"[0-9]{1,20}", lemma_id)。
var baikeLemmaIDRe = regexp.MustCompile(`^[0-9]{1,20}$`)

// DecodeBaikeReference 复刻 _fetch 的引用解析与校验。
//
// 返回 (title, author, lemmaID, 是否有效)。
func DecodeBaikeReference(externalID string) (string, string, string, bool) {
	if len(externalID) > 4096 {
		return "", "", "", false
	}
	if !strings.HasPrefix(externalID, BaikeReferencePrefix) {
		return "", "", "", false
	}
	var ref map[string]any
	if err := json.Unmarshal([]byte(externalID[len(BaikeReferencePrefix):]), &ref); err != nil {
		return "", "", "", false
	}
	if ref == nil {
		return "", "", "", false
	}

	title, _ := ref["title"].(string)
	author, _ := ref["author"].(string)
	lemmaID, _ := ref["id"].(string)

	if pyStrip(title) == "" || len(title) > 512 {
		return "", "", "", false
	}
	if len(author) > 512 {
		return "", "", "", false
	}
	if !baikeLemmaIDRe.MatchString(lemmaID) {
		return "", "", "", false
	}
	return title, author, lemmaID, true
}

// Fetch 复刻 _fetch：解析引用后按 title/author 重新检索并校验词条 ID。
func (s *BaikeSource) Fetch(externalID string) map[string]any {
	title, author, lemmaID, ok := DecodeBaikeReference(externalID)
	if !ok {
		return nil
	}
	authorArg := author
	if authorArg == "" {
		authorArg = ""
	}
	mi := s.GetBook(title, authorArg, lemmaID, true)
	if mi != nil {
		mi["provider_value"] = externalID
	}
	return mi
}
