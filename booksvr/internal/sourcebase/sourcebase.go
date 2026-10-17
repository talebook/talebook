// Package sourcebase 复刻 webserver/plugins/source/base.py。
//
// 单文件书源的共享实现；具体来源只负责 discover。
package sourcebase

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"mime"
	"net/url"
	"path"
	"strings"

	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginproto"
	"talebook/booksvr/internal/safehttp"
)

// AllowedFormats 复刻 ALLOWED_FORMATS。
var AllowedFormats = map[string]bool{
	"azw": true, "azw3": true, "cbr": true, "cbz": true, "epub": true,
	"fb2": true, "mobi": true, "pdf": true, "txt": true,
}

// MIMEFormats 复刻 MIME_FORMATS。
var MIMEFormats = map[string]string{
	"application/epub+zip":           "epub",
	"application/pdf":                "pdf",
	"application/x-mobipocket-ebook": "mobi",
	"application/vnd.amazon.ebook":   "azw",
	"application/x-fictionbook+xml":  "fb2",
	"application/vnd.comicbook+zip":  "cbz",
	"application/vnd.comicbook-rar":  "cbr",
	"text/plain":                     "txt",
}

// CommonConfigProperties 复刻 COMMON_CONFIG_PROPERTIES。
var CommonConfigProperties = map[string]any{
	"target_library": map[string]any{"type": "string", "title": "目标书库", "default": "main"},
	"formats": map[string]any{
		"type": "array", "items": map[string]any{"type": "string"},
		"default": []any{"epub", "pdf", "mobi", "txt"},
	},
}

// FormatFrom 复刻 _format_from。
//
// 先按 MIME 查表，再按 URL 后缀判断是否在允许集合内。
func FormatFrom(rawURL, mimeType string) string {
	contentType := strings.ToLower(strings.TrimSpace(strings.SplitN(mimeType, ";", 2)[0]))
	if f, ok := MIMEFormats[contentType]; ok {
		return f
	}
	u, err := url.Parse(rawURL)
	if err != nil {
		return ""
	}
	suffix := strings.ToLower(strings.TrimPrefix(path.Ext(u.Path), "."))
	if AllowedFormats[suffix] {
		return suffix
	}
	return ""
}

// ISBN 复刻 _isbn：只保留数字与 X，长度必须为 10 或 13。
func ISBN(value any) string {
	raw := strings.ToUpper(asString(value))
	var b strings.Builder
	for _, r := range raw {
		if (r >= '0' && r <= '9') || r == 'X' {
			b.WriteRune(r)
		}
	}
	digits := b.String()
	if len(digits) == 10 || len(digits) == 13 {
		return digits
	}
	return ""
}

// ExternalID 复刻 _external_id：sha256("<source>:<value>")。
func ExternalID(source string, value any) string {
	sum := sha256.Sum256([]byte(source + ":" + asString(value)))
	return hex.EncodeToString(sum[:])
}

// ManifestOptions 是 Manifest 的可选参数。
// 注意：Python 的 network_read 默认值为 True，Go 的 bool 零值为 false，
// 因此用 NetworkReadSet 区分「未设置」与「显式设为 false」。
type ManifestOptions struct {
	AuthSchema     map[string]any
	Homepage       string
	RuntimeKind    string
	NetworkRead    bool
	NetworkReadSet bool
	BrandIcon      string
}

// Manifest 复刻 _manifest。
func Manifest(pluginID, name, description string, capabilities []string,
	configSchema map[string]any, opts ManifestOptions) map[string]any {
	if opts.RuntimeKind == "" {
		opts.RuntimeKind = "http"
	}
	authSchema := opts.AuthSchema
	if authSchema == nil {
		authSchema = map[string]any{"type": "object", "properties": map[string]any{}}
	}

	needsConfiguration := hasRequired(configSchema) || hasRequired(authSchema)

	// Python 的 network_read 默认值为 True。
	networkRead := true
	if opts.NetworkReadSet {
		networkRead = opts.NetworkRead
	}
	permissions := []any{"books.read", "books.write"}
	if networkRead {
		permissions = append(permissions, "network.read")
	}

	caps := make([]any, 0, len(capabilities))
	for _, c := range capabilities {
		caps = append(caps, c)
	}

	ui := map[string]any{
		"icon":               "mdi-bookshelf",
		"manage_kind":        "book_source",
		"configuration_mode": "none",
		"primary_action":     "preview",
	}
	if needsConfiguration {
		ui["configuration_mode"] = "form"
		ui["primary_action"] = "configure"
	}
	if opts.BrandIcon != "" {
		ui["brand_icon"] = opts.BrandIcon
	}

	return map[string]any{
		"protocol_version":  pluginproto.ProtocolVersion,
		"id":                pluginID,
		"name":              name,
		"description":       description,
		"version":           "1.0.0",
		"categories":        []any{"sources"},
		"capabilities":      caps,
		"runtime_kind":      opts.RuntimeKind,
		"actions":           []any{"test", "preview", "run", "retry", "rollback"},
		"auth_schema":       authSchema,
		"config_schema":     configSchema,
		"permissions":       permissions,
		"data_policy":       map[string]any{"stores_full_text": false, "retention": "pending_review"},
		"compatibility":     map[string]any{"talebook": ">=0.1.0"},
		"connection_owners": []any{"instance"},
		"download_mode":     "single_book",
		"homepage":          opts.Homepage,
		"license":           "GPL-3.0",
		"ui":                ui,
	}
}

// hasRequired 判断 schema 是否声明了必填项。
func hasRequired(schema map[string]any) bool {
	req, ok := schema["required"]
	if !ok || req == nil {
		return false
	}
	switch v := req.(type) {
	case []any:
		return len(v) > 0
	case []string:
		return len(v) > 0
	}
	return false
}

// DiscoverFunc 是具体来源实现的发现逻辑。
//
// 返回 (条目, 游标, 错误)。
type DiscoverFunc func(context map[string]any) ([]map[string]any, map[string]any, error)

// Base 复刻 SourceBase。
type Base struct {
	// SourceName 是来源名。
	SourceName string
	// LicenseName 是默认许可。
	LicenseName string
	// DownloadMode 是下载模式。
	DownloadMode string
	// HTTP 是受策略约束的 HTTP 客户端。
	HTTP *safehttp.SafeHttpClient
	// Discover 是具体来源的发现逻辑。
	Discover DiscoverFunc
	// Manifest 是插件清单；由具体来源在构造时注入。
	Manifest map[string]any
}

// NewBase 构造一个书源基类。
func NewBase(sourceName string, http *safehttp.SafeHttpClient, discover DiscoverFunc) *Base {
	if http == nil {
		http = &safehttp.SafeHttpClient{}
	}
	return &Base{
		SourceName:   sourceName,
		LicenseName:  "由来源条目决定",
		DownloadMode: "single_book",
		HTTP:         http,
		Discover:     discover,
	}
}

// Execute 复刻 SourceBase.execute。
func (b *Base) Execute(context map[string]any) (pluginproto.ProviderResult, error) {
	entries, cursor, err := b.Discover(context)
	if err != nil {
		return pluginproto.ProviderResult{}, err
	}
	if asString(context["action"]) == "test" {
		return pluginproto.ProviderResult{
			HealthMessage: b.SourceName + " 连接可用",
		}, nil
	}
	items := make([]pluginproto.ProviderItem, 0, len(entries))
	for _, entry := range entries {
		var updated *string
		if s, ok := entry["updated_at"].(string); ok && s != "" {
			updated = &s
		}
		items = append(items, pluginproto.NewProviderItem(
			asString(entry["external_id"]), "book_source", entry, updated))
	}
	return pluginproto.ProviderResult{
		Items:         items,
		NextCursor:    cursor,
		HealthMessage: fmt.Sprintf("发现 %d 个待审条目", len(items)),
	}, nil
}

// Search 复刻 SourceBase.search：先 browse 再按标题/作者过滤。
func (b *Base) Search(query string, cursor map[string]any, context map[string]any) (plugindomain.Page, error) {
	page, err := b.Browse("", cursor, context)
	if err != nil {
		return plugindomain.Page{}, err
	}
	needle := strings.ToLower(strings.TrimSpace(query))
	if needle == "" {
		return page, nil
	}
	var items []any
	for _, raw := range page.Items {
		book, ok := raw.(plugindomain.SourceBook)
		if !ok {
			continue
		}
		if strings.Contains(strings.ToLower(book.Title), needle) {
			items = append(items, book)
			continue
		}
		for _, author := range book.Authors {
			if strings.Contains(strings.ToLower(author), needle) {
				items = append(items, book)
				break
			}
		}
	}
	return plugindomain.Page{
		Items:         items,
		Failures:      page.Failures,
		HasMore:       page.HasMore,
		NextCursor:    page.NextCursor,
		HealthMessage: page.HealthMessage,
	}, nil
}

// Browse 复刻 SourceBase.browse。
func (b *Base) Browse(categoryID string, cursor map[string]any, context map[string]any) (plugindomain.Page, error) {
	callContext := make(map[string]any, len(context)+1)
	for k, v := range context {
		callContext[k] = v
	}
	callContext["cursor"] = copyMap(cursor)

	entries, nextCursor, err := b.Discover(callContext)
	if err != nil {
		return plugindomain.Page{}, err
	}
	items := make([]any, 0, len(entries))
	for _, entry := range entries {
		items = append(items, plugindomain.SourceBookFromDict(entry))
	}
	return plugindomain.Page{
		Items:         items,
		HasMore:       truthy(nextCursor["next"]),
		NextCursor:    nextCursor,
		HealthMessage: fmt.Sprintf("发现 %d 本书", len(items)),
	}, nil
}

// GetCategories 复刻 SourceBase.get_categories。
func (b *Base) GetCategories(context map[string]any) ([]plugindomain.Category, error) {
	return []plugindomain.Category{{ID: "root", Name: b.SourceName}}, nil
}

// GetBook 复刻 SourceBase.get_book。
func (b *Base) GetBook(externalID string, context map[string]any) (plugindomain.SourceBookDetail, error) {
	page, err := b.Browse("", map[string]any{}, context)
	if err != nil {
		return plugindomain.SourceBookDetail{}, err
	}
	for _, raw := range page.Items {
		book, ok := raw.(plugindomain.SourceBook)
		if !ok || book.ExternalID != externalID {
			continue
		}
		return plugindomain.SourceBookDetail{
			ExternalID:     book.ExternalID,
			Title:          book.Title,
			Authors:        book.Authors,
			Description:    book.Description,
			CoverURL:       book.CoverURL,
			Categories:     book.Categories,
			SourceURL:      book.SourceURL,
			AcquisitionURL: book.AcquisitionURL,
			Format:         book.Format,
			Downloadable:   book.Access == "download" && book.AcquisitionURL != "",
			Source:         book.Source,
		}, nil
	}
	return plugindomain.SourceBookDetail{}, pluginproto.NewUpstreamError(
		"Book source item was not found", "other", nil)
}

// Download 复刻 SourceBase.download。
func (b *Base) Download(book plugindomain.SourceBookDetail, context map[string]any) (plugindomain.BookFile, error) {
	if !book.Downloadable || book.AcquisitionURL == "" {
		return plugindomain.BookFile{}, pluginproto.NewUpstreamError(
			"Book source item is not downloadable", "other", nil)
	}
	config := asMap(context["config"])
	resp, err := b.HTTP.Request(gocontextBackground(), "GET", book.AcquisitionURL, safehttp.RequestOptions{
		Headers:    b.headers(context),
		Timeout:    timeoutOf(config),
		HasTimeout: true,
	})
	if err != nil {
		return plugindomain.BookFile{}, err
	}
	defer resp.Body.Close()

	content, err := readAll(resp.Body)
	if err != nil {
		return plugindomain.BookFile{}, pluginproto.NewUpstreamError(
			"Upstream response could not be read", "other", nil)
	}

	contentType := resp.Header.Get("Content-Type")
	formatName := book.Format
	if formatName == "" {
		formatName = FormatFrom(book.AcquisitionURL, contentType)
	}

	u, _ := url.Parse(book.AcquisitionURL)
	filename := path.Base(u.Path)
	if filename == "" || filename == "." || filename == "/" {
		filename = book.ExternalID + "." + formatName
	}

	mediaType := contentType
	if mediaType == "" {
		if guessed := mime.TypeByExtension(path.Ext(filename)); guessed != "" {
			mediaType = guessed
		} else {
			mediaType = "application/octet-stream"
		}
	}

	return plugindomain.BookFile{
		Filename:  filename,
		Content:   content,
		Format:    formatName,
		MediaType: mediaType,
		SourceURL: book.AcquisitionURL,
	}, nil
}

// GetTOC 复刻 SourceBase.get_toc：基类不支持章节。
func (b *Base) GetTOC(book plugindomain.SourceBookDetail, context map[string]any) ([]plugindomain.SourceChapter, error) {
	return nil, pluginproto.NewUpstreamError("Book source does not provide chapters", "other", nil)
}

// GetChapter 复刻 SourceBase.get_chapter：基类不支持章节。
func (b *Base) GetChapter(chapter plugindomain.SourceChapter, context map[string]any) (plugindomain.SourceContent, error) {
	return plugindomain.SourceContent{}, pluginproto.NewUpstreamError(
		"Book source does not provide chapters", "other", nil)
}

// SelfCheck 复刻 SourceBase.self_check。
func (b *Base) SelfCheck(context map[string]any) (plugindomain.CheckReport, error) {
	page, err := b.Browse("", map[string]any{}, context)
	if err != nil {
		return plugindomain.CheckReport{}, err
	}
	return plugindomain.CheckReport{Healthy: true, Message: page.HealthMessage}, nil
}

// NormalizeOptions 是 Normalize 的可选参数。
type NormalizeOptions struct {
	Authors        []string
	ISBN           string
	Format         string
	SourceURL      string
	AcquisitionURL string
	Access         string
	LicenseName    string
	ContentHash    string
	RemoteETag     string
	UpdatedAt      string
}

// Normalize 复刻 SourceBase._normalize。
func (b *Base) Normalize(context map[string]any, identity any, title string, opts NormalizeOptions) (plugindomain.SourceBook, error) {
	fmtName := strings.ToLower(opts.Format)
	if fmtName != "" && !AllowedFormats[fmtName] {
		return plugindomain.SourceBook{}, pluginproto.NewUpstreamError(
			"Book source returned an unsupported format", "other", nil)
	}
	access := opts.Access
	if access == "" {
		access = "external_link"
	}
	acquisitionURL := opts.AcquisitionURL
	if access != "download" {
		acquisitionURL = ""
	}

	authors := make([]string, 0, len(opts.Authors))
	for _, a := range opts.Authors {
		if a != "" {
			authors = append(authors, a)
		}
	}

	licenseName := opts.LicenseName
	if licenseName == "" {
		licenseName = b.LicenseName
	}

	targetLibrary := asString(asMap(context["config"])["target_library"])
	if targetLibrary == "" {
		targetLibrary = "main"
	}

	displayTitle := asString(title)
	if displayTitle == "" {
		displayTitle = "未知标题"
	}
	if len(displayTitle) > 500 {
		displayTitle = displayTitle[:500]
	}

	return plugindomain.SourceBookFromDict(map[string]any{
		"external_id":     ExternalID(b.SourceName, identity),
		"title":           displayTitle,
		"authors":         authors,
		"isbn":            ISBN(opts.ISBN),
		"format":          fmtName,
		"source":          b.SourceName,
		"source_url":      opts.SourceURL,
		"acquisition_url": acquisitionURL,
		"access":          access,
		"license":         licenseName,
		"target_library":  targetLibrary,
		"review_status":   "pending",
		"content_hash":    opts.ContentHash,
		"remote_etag":     opts.RemoteETag,
		"updated_at":      opts.UpdatedAt,
	}), nil
}

// headers 复刻 SourceBase._headers。
// headers 复刻 SourceBase._headers：默认 Accept + secrets 凭据换请求头。
func (b *Base) headers(context map[string]any) map[string]string {
	out := map[string]string{
		"Accept": "application/opds+json, application/atom+xml, application/json, application/xml",
	}
	config := asMap(context["config"])
	if ua := asString(config["user_agent"]); ua != "" {
		out["User-Agent"] = ua
	}
	secrets := asMap(context["secrets"])
	if apiKey := asString(secrets["api_key"]); apiKey != "" {
		out["X-Api-Key"] = apiKey
	} else if username := asString(secrets["username"]); username != "" {
		if password := asString(secrets["password"]); password != "" {
			token := base64.StdEncoding.EncodeToString([]byte(username + ":" + password))
			out["Authorization"] = "Basic " + token
		}
	}
	return out
}

// timeoutOf 复刻 float(config.get("timeout_seconds", 30))。
func timeoutOf(config map[string]any) timeDuration {
	switch v := config["timeout_seconds"].(type) {
	case float64:
		return secondsToDuration(v)
	case int:
		return secondsToDuration(float64(v))
	case int64:
		return secondsToDuration(float64(v))
	}
	return secondsToDuration(30)
}

// asString 复刻 Python 的 str(x or "")。
func asString(v any) string {
	switch val := v.(type) {
	case nil:
		return ""
	case string:
		return val
	case bool:
		if val {
			return "True"
		}
		return "False"
	case float64:
		if val == float64(int64(val)) {
			return fmt.Sprintf("%d", int64(val))
		}
		return fmt.Sprintf("%v", val)
	case int:
		return fmt.Sprintf("%d", val)
	case int64:
		return fmt.Sprintf("%d", val)
	default:
		return fmt.Sprintf("%v", val)
	}
}

// asMap 把值转成 map；非 map 返回空 map。
func asMap(v any) map[string]any {
	if m, ok := v.(map[string]any); ok {
		return m
	}
	return map[string]any{}
}

// copyMap 返回浅拷贝。
func copyMap(m map[string]any) map[string]any {
	out := make(map[string]any, len(m))
	for k, v := range m {
		out[k] = v
	}
	return out
}

// truthy 复刻 Python 的真值判断。
func truthy(v any) bool {
	switch val := v.(type) {
	case nil:
		return false
	case bool:
		return val
	case string:
		return val != ""
	case float64:
		return val != 0
	case int:
		return val != 0
	case int64:
		return val != 0
	case []any:
		return len(val) > 0
	case map[string]any:
		return len(val) > 0
	}
	return true
}

// jsonUnmarshal 是 encoding/json 的薄封装，便于测试替换。
func jsonUnmarshal(data []byte, out any) error {
	return json.Unmarshal(data, out)
}
