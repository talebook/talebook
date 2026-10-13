package booksource

import (
	"context"
	"encoding/json"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"

	"talebook/booksvr/internal/safehttp"
	"talebook/booksvr/internal/tornadosign"
)

// 把已启用 Legado 书源作为可回填的书籍元数据来源。

// Key 是元数据 provider 标识。
const Key = "BookSource"

// TokenName 是签名 token 的用途名。
const TokenName = "booksource-metadata"

// MetadataSource 是一个可用的元数据书源。
type MetadataSource struct {
	Key  string
	Name string
	Raw  map[string]any
}

// MetadataSearchResult 是一次多源搜索的汇总。
type MetadataSearchResult struct {
	Books    []*Metadata
	Failures []map[string]string
}

// Metadata 是元数据结果（对应 calibre 的 Metadata 对象在本书源场景用到的字段）。
type Metadata struct {
	Title         string
	Authors       []string
	AuthorSort    string
	Publisher     string
	ISBN          string
	Tags          []string
	Comments      string
	CoverURL      string
	CoverData     *CoverData
	Website       string
	Source        string
	ProviderKey   string
	ProviderValue string
}

// CoverData 是封面字节与扩展名。
type CoverData struct {
	Extension string
	Content   []byte
}

// LoadBuiltinSources 从内置 JSON 加载书源快照。
//
// items 是 metadata_sources.json 的内容（已解析为数组）。
func LoadBuiltinSources(items []map[string]any) []MetadataSource {
	out := make([]MetadataSource, 0, len(items))
	for _, item := range items {
		snapshotID := stringifyAny(item["snapshotId"])
		name := stringifyAny(item["bookSourceName"])
		if name == "" {
			name = snapshotID
		}
		out = append(out, MetadataSource{
			Key:  "builtin:" + snapshotID,
			Name: name,
			Raw:  item,
		})
	}
	return out
}

// ParseBuiltinSources 解析内置书源 JSON 文本。
func ParseBuiltinSources(data []byte) ([]MetadataSource, error) {
	var items []map[string]any
	if err := json.Unmarshal(data, &items); err != nil {
		return nil, err
	}
	return LoadBuiltinSources(items), nil
}

// SourceRow 是 collect_metadata_sources 需要的一行书源记录。
type SourceRow struct {
	ID   int64
	Name string
	Raw  map[string]any
}

// CollectMetadataSources 只取用户显式启用的文本书源；内置快照不得绕过独立插件启停。
//
// rows 应由调用方按 weight DESC, id ASC 排序并截断到 topK 后传入。
func CollectMetadataSources(rows []SourceRow) []MetadataSource {
	out := make([]MetadataSource, 0, len(rows))
	for _, row := range rows {
		out = append(out, MetadataSource{
			Key:  "db:" + itoa64(row.ID),
			Name: row.Name,
			Raw:  deepCopyMap(row.Raw),
		})
	}
	return out
}

// EncodeProviderValue 生成带签名的 provider token。
func EncodeProviderValue(secret, sourceKey, bookURL string, now time.Time) (string, error) {
	payload, err := json.Marshal(map[string]any{
		"v":         1,
		"source":    sourceKey,
		"book_url":  bookURL,
		"issued_at": now.Unix(),
	})
	if err != nil {
		return "", err
	}
	return tornadosign.Sign(secret, TokenName, string(payload), now.Unix()), nil
}

// DecodeProviderValue 校验并解出 provider token 载荷。
//
// 与 Python 一致：签名无效、版本不符、超时、时间倒流、URL 非 http(s) 一律返回 nil。
func DecodeProviderValue(secret, token string, ttlSeconds int, now time.Time) map[string]any {
	raw := tornadosign.Decode(secret, TokenName, []byte(token), 365, func() int64 { return now.Unix() })
	if raw == nil {
		return nil
	}
	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		return nil
	}
	issuedAt, ok := toInt64(payload["issued_at"])
	if !ok {
		return nil
	}
	if v, ok := toInt64(payload["v"]); !ok || v != 1 {
		return nil
	}
	nowUnix := now.Unix()
	if nowUnix-issuedAt > int64(ttlSeconds) || issuedAt > nowUnix+60 {
		return nil
	}
	if stringifyAny(payload["source"]) == "" || !IsHTTPURL(stringifyAny(payload["book_url"])) {
		return nil
	}
	return payload
}

// IsHTTPURL 判断值是否为 http(s) 绝对地址（先按 `,{` 截断）。
func IsHTTPURL(value string) bool {
	head := strings.SplitN(stringifyAny(value), ",{", 2)[0]
	parsed, err := url.Parse(head)
	if err != nil {
		return false
	}
	return (parsed.Scheme == "http" || parsed.Scheme == "https") && parsed.Host != ""
}

// BookSourceMetadataService 把多个书源聚合为一个元数据 provider。
type BookSourceMetadataService struct {
	Sources []MetadataSource
	Secret  string
	Config  MetadataConfig
	// Client 是出站 HTTP 客户端；为 nil 时用默认客户端。
	Client *safehttp.SafeHttpClient
}

// client 返回可用的 HTTP 客户端（nil 时用默认值）。
func (s *BookSourceMetadataService) client() *safehttp.SafeHttpClient {
	if s.Client != nil {
		return s.Client
	}
	return &safehttp.SafeHttpClient{}
}

// MetadataConfig 是元数据服务的配置。
type MetadataConfig struct {
	Workers          int
	SearchLimit      int
	TokenTTL         int
	Engine           EngineConfig
	MaxCoverBytes    int64
	CoverHTTPTimeout float64
}

// DefaultMetadataConfig 返回与 Python 默认值一致的配置。
func DefaultMetadataConfig() MetadataConfig {
	return MetadataConfig{
		Workers:          6,
		SearchLimit:      5,
		TokenTTL:         3600,
		Engine:           DefaultEngineConfig(),
		MaxCoverBytes:    8 << 20,
		CoverHTTPTimeout: 10,
	}
}

// Search 并发查询所有书源，汇总结果与失败项。
func (s *BookSourceMetadataService) Search(ctx context.Context, title, author string) *MetadataSearchResult {
	if len(s.Sources) == 0 {
		return &MetadataSearchResult{
			Failures: []map[string]string{failure("booksource", "no_source", "没有可用的在线书源")},
		}
	}
	workers := s.Config.Workers
	if workers < 1 {
		workers = 1
	}
	if workers > len(s.Sources) {
		workers = len(s.Sources)
	}

	type job struct {
		source MetadataSource
		index  int
	}
	type outcome struct {
		index int
		books []*Metadata
		err   error
	}

	jobs := make(chan job)
	results := make(chan outcome, len(s.Sources))
	var wg sync.WaitGroup
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := range jobs {
				books, err := s.searchSource(ctx, j.source, title, author)
				results <- outcome{index: j.index, books: books, err: err}
			}
		}()
	}
	go func() {
		for i, src := range s.Sources {
			jobs <- job{source: src, index: i}
		}
		close(jobs)
	}()
	wg.Wait()
	close(results)

	// 按源顺序汇总，保证结果稳定（Python 用 as_completed，顺序不定；
	// 这里按索引排序以获得可复现输出）。
	collected := make([]outcome, len(s.Sources))
	for o := range results {
		collected[o.index] = o
	}
	out := &MetadataSearchResult{}
	for i, o := range collected {
		src := s.Sources[i]
		if o.err != nil {
			out.Failures = append(out.Failures, failure(src.Name, "fetch_failed", "查询失败"))
			continue
		}
		if len(o.books) > 0 {
			out.Books = append(out.Books, o.books...)
		} else {
			out.Failures = append(out.Failures, failure(src.Name, "no_result", "未找到匹配图书"))
		}
	}
	return out
}

func (s *BookSourceMetadataService) searchSource(ctx context.Context, source MetadataSource,
	title, author string) ([]*Metadata, error) {

	engine, err := NewBookSourceEngine(source.Raw, s.client(), s.Config.Engine)
	if err != nil {
		return nil, err
	}
	summaries, err := engine.Search(ctx, title, 1)
	if err != nil {
		return nil, err
	}
	limit := s.Config.SearchLimit
	if limit < 1 {
		limit = 1
	}
	if limit > 100 {
		limit = 100
	}
	var books []*Metadata
	for _, summary := range summaries {
		if author != "" && summary.Author != "" && !authorMatches(author, summary.Author) {
			continue
		}
		md := s.metadataFromSummary(summary, source)
		if md != nil {
			books = append(books, md)
			if len(books) >= limit {
				break
			}
		}
	}
	return books, nil
}

// authorMatches 复刻 Python 的包含式作者匹配。
func authorMatches(expected, actual string) bool {
	normalize := func(v string) string {
		return strings.Join(strings.Fields(strings.ToLower(v)), "")
	}
	e, a := normalize(expected), normalize(actual)
	if e == "" || a == "" {
		return true
	}
	return strings.Contains(e, a) || strings.Contains(a, e)
}

func (s *BookSourceMetadataService) metadataFromSummary(summary BookSummary, source MetadataSource) *Metadata {
	if summary.Name == "" || !IsHTTPURL(summary.BookURL) {
		return nil
	}
	author := summary.Author
	if author == "" {
		author = "佚名"
	}
	token, err := EncodeProviderValue(s.Secret, source.Key, summary.BookURL, time.Now())
	if err != nil {
		return nil
	}
	return &Metadata{
		Title:         summary.Name,
		Authors:       []string{author},
		AuthorSort:    author,
		Publisher:     "",
		ISBN:          "",
		Tags:          splitTags(summary.Kind),
		Comments:      summary.Intro,
		CoverURL:      summary.CoverURL,
		CoverData:     nil,
		Website:       strings.SplitN(summary.BookURL, ",{", 2)[0],
		Source:        source.Name,
		ProviderKey:   Key,
		ProviderValue: token,
	}
}

// Apply 用 provider token 拉取详情并生成元数据。
func (s *BookSourceMetadataService) Apply(ctx context.Context, token string, resolve func(string) (MetadataSource, bool),
	copyImage bool) (*Metadata, error) {

	payload := DecodeProviderValue(s.Secret, token, s.Config.TokenTTL, time.Now())
	if payload == nil {
		return nil, nil
	}
	source, ok := resolve(stringifyAny(payload["source"]))
	if !ok {
		return nil, nil
	}
	engine, err := NewBookSourceEngine(source.Raw, s.client(), s.Config.Engine)
	if err != nil {
		return nil, err
	}
	bookURL := stringifyAny(payload["book_url"])
	detail, err := engine.BookInfo(ctx, bookURL)
	if err != nil {
		return nil, err
	}
	if detail.Name == "" {
		return nil, nil
	}
	author := detail.Author
	if author == "" {
		author = "佚名"
	}
	md := &Metadata{
		Title:         detail.Name,
		Authors:       []string{author},
		AuthorSort:    author,
		Publisher:     "",
		ISBN:          "",
		Tags:          splitTags(detail.Kind),
		Comments:      detail.Intro,
		CoverURL:      detail.CoverURL,
		Website:       strings.SplitN(bookURL, ",{", 2)[0],
		Source:        source.Name,
		ProviderKey:   Key,
		ProviderValue: token,
	}
	if copyImage {
		md.CoverData = s.downloadCover(ctx, engine, md.CoverURL)
	}
	return md, nil
}

// ResolveSource 按 key 解析书源：`db:<id>` 走数据库，其余走内置快照。
func ResolveSource(sourceKey string, lookup func(id int64) (SourceRow, bool),
	builtins []MetadataSource) (MetadataSource, bool) {

	if strings.HasPrefix(sourceKey, "db:") {
		id, ok := parseIntStrict(sourceKey[3:])
		if !ok {
			return MetadataSource{}, false
		}
		row, found := lookup(int64(id))
		if !found {
			return MetadataSource{}, false
		}
		return MetadataSource{Key: sourceKey, Name: row.Name, Raw: deepCopyMap(row.Raw)}, true
	}
	for _, src := range builtins {
		if src.Key == sourceKey {
			return src, true
		}
	}
	return MetadataSource{}, false
}

// coverExtensions 是允许的封面扩展名。
var coverExtensions = map[string]bool{
	"jpg": true, "jpeg": true, "png": true, "gif": true, "webp": true,
}

func (s *BookSourceMetadataService) downloadCover(ctx context.Context, engine *BookSourceEngine, coverURL string) *CoverData {
	if !IsHTTPURL(coverURL) {
		return nil
	}
	client := engine.Client
	if client == nil {
		return nil
	}
	timeout := s.Config.CoverHTTPTimeout
	if timeout <= 0 {
		timeout = 10
	}
	resp, err := client.Get(ctx, coverURL, requestOptionsForCover(timeout))
	if err != nil {
		return nil
	}
	defer resp.Body.Close()
	if !httpStatusOK(resp) {
		return nil
	}
	content, err := readLimited(resp.Body, s.Config.MaxCoverBytes)
	if err != nil || len(content) == 0 {
		return nil
	}
	extension := coverExtension(coverURL)
	return &CoverData{Extension: extension, Content: content}
}

// coverExtension 从 URL 路径推断封面扩展名，不在白名单内回落 jpg。
func coverExtension(rawURL string) string {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return "jpg"
	}
	path := parsed.Path
	idx := strings.LastIndex(path, ".")
	if idx < 0 {
		return "jpg"
	}
	ext := strings.ToLower(path[idx+1:])
	if !coverExtensions[ext] {
		return "jpg"
	}
	return ext
}

// tagsSplitRe 按中英文逗号与换行切分标签。
//
// 注意：Go 的 RE2 不支持 `\u` 转义，必须写字符本身（U+FF0C 全角逗号）。
var tagsSplitRe = regexp.MustCompile("[,\uFF0C\n]+")

// splitTags 复刻 Python _tags：最多 8 个，去空白。
func splitTags(value string) []string {
	var out []string
	for _, item := range tagsSplitRe.Split(value, -1) {
		item = strings.TrimSpace(item)
		if item != "" {
			out = append(out, item)
		}
		if len(out) >= 8 {
			break
		}
	}
	return out
}

// MetadataToEvidence 把元数据转为证据字典。
func MetadataToEvidence(book *Metadata) map[string]any {
	if book == nil {
		return map[string]any{
			"source": "", "title": "", "authors": []string{},
			"summary": "", "tags": []string{}, "website": "", "cover_url": "",
		}
	}
	return map[string]any{
		"source":    book.Source,
		"title":     book.Title,
		"authors":   book.Authors,
		"summary":   book.Comments,
		"tags":      book.Tags,
		"website":   book.Website,
		"cover_url": book.CoverURL,
	}
}

func failure(source, code, message string) map[string]string {
	return map[string]string{"source": source, "code": code, "message": message}
}

// deepCopyMap 深拷贝一层 map（复刻 copy.deepcopy 在书源场景的效果）。
func deepCopyMap(m map[string]any) map[string]any {
	if m == nil {
		return nil
	}
	out := make(map[string]any, len(m))
	for k, v := range m {
		out[k] = deepCopyValue(v)
	}
	return out
}

func deepCopyValue(v any) any {
	switch t := v.(type) {
	case map[string]any:
		return deepCopyMap(t)
	case []any:
		out := make([]any, len(t))
		for i, item := range t {
			out[i] = deepCopyValue(item)
		}
		return out
	default:
		return v
	}
}

// toInt64 把 JSON 数字转为 int64。
func toInt64(v any) (int64, bool) {
	switch t := v.(type) {
	case float64:
		return int64(t), true
	case int64:
		return t, true
	case int:
		return int64(t), true
	case json.Number:
		n, err := t.Int64()
		return n, err == nil
	}
	return 0, false
}

// itoa64 是 strconv.FormatInt 的短别名。
func itoa64(v int64) string {
	if v == 0 {
		return "0"
	}
	neg := v < 0
	if neg {
		v = -v
	}
	var buf [20]byte
	i := len(buf)
	for v > 0 {
		i--
		buf[i] = byte('0' + v%10)
		v /= 10
	}
	if neg {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}
