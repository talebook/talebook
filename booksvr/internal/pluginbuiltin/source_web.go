package pluginbuiltin

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"io/fs"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strings"

	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginproto"
	"talebook/booksvr/internal/safehttp"
	"talebook/booksvr/internal/sourcebase"
)

// webSourceManifest 构造与 Python source/base.py:_manifest 一致的清单。
func webSourceManifest(pluginID, name, description string, capabilities []string,
	configSchema map[string]any, opts sourcebase.ManifestOptions) map[string]any {
	return sourcebase.Manifest(pluginID, name, description, capabilities, configSchema, opts)
}

// acceptJSONHeaders 复刻 SourceBase._headers 的默认 Accept（无凭据时）。
func acceptJSONHeaders() map[string]string {
	return map[string]string{"Accept": "application/json"}
}

// sourceFormats 复刻 SourceBase._formats：config.formats 与 ALLOWED_FORMATS 求交集。
func sourceFormats(context map[string]any) map[string]bool {
	requested := []string{"epub", "pdf", "mobi", "txt"}
	config, _ := context["config"].(map[string]any)
	if raw := stringList(config["formats"]); len(raw) > 0 {
		requested = raw
	}
	out := map[string]bool{}
	for _, f := range requested {
		lower := strings.ToLower(f)
		if sourcebase.AllowedFormats[lower] {
			out[lower] = true
		}
	}
	return out
}

// sourceHeaders 复刻 SourceBase._headers：secrets 里的凭据换成请求头。
func sourceHeaders(context map[string]any) map[string]string {
	out := map[string]string{
		"Accept": "application/opds+json, application/atom+xml, application/json, application/xml",
	}
	secrets, _ := context["secrets"].(map[string]any)
	if apiKey, _ := secrets["api_key"].(string); apiKey != "" {
		out["X-Api-Key"] = apiKey
	} else if username, _ := secrets["username"].(string); username != "" {
		if password, _ := secrets["password"].(string); password != "" {
			token := base64.StdEncoding.EncodeToString([]byte(username + ":" + password))
			out["Authorization"] = "Basic " + token
		}
	}
	return out
}

// ---- Project Gutenberg ----

// gutenbergProvider 复刻 GutenbergProvider。
type gutenbergProvider struct {
	*sourcebase.Base
}

const gutenbergEndpoint = "https://gutendex.com/books/"

func newGutenbergProvider() *gutenbergProvider {
	p := &gutenbergProvider{}
	p.Base = sourcebase.NewBase("Project Gutenberg", nil, p.discover)
	p.LicenseName = "Project Gutenberg License"
	p.Base.Manifest = webSourceManifest(
		"talebook.source.gutenberg", "Project Gutenberg",
		"检索 Project Gutenberg 的合法开放电子书。",
		[]string{"sources.browse", "sources.search", "sources.acquire"},
		map[string]any{"type": "object", "properties": sourcebase.CommonConfigProperties},
		sourcebase.ManifestOptions{
			Homepage:  "https://www.gutenberg.org/",
			BrandIcon: "/images/plugin-icons/project-gutenberg.png",
		})
	if ui, ok := p.Base.Manifest["ui"].(map[string]any); ok {
		ui["catalog_access"] = "public_free"
	}
	return p
}

// Manifest 满足 pluginiface.Provider。
func (p *gutenbergProvider) Manifest() map[string]any { return p.Base.Manifest }

// DownloadMode 满足 pluginiface.SourceProvider。
func (p *gutenbergProvider) DownloadMode() pluginiface.DownloadMode {
	return pluginiface.DownloadSingleBook
}

// 编译期断言。
var _ pluginiface.SourceProvider = (*gutenbergProvider)(nil)

// CapabilitySet 报告能力声明。
func (p *gutenbergProvider) CapabilitySet() pluginiface.CapabilitySet { return sourceCaps() }

// Invoke 实现 MethodDispatcher：全部委托 DispatchInvoke。
func (p *gutenbergProvider) Invoke(method string, args []any, context map[string]any) (any, error) {
	return DispatchInvoke(p, method, args, context)
}

// InitialEnabled 复刻 initial_enabled：恒为 True。
func (p *gutenbergProvider) InitialEnabled(settings map[string]any) bool { return true }

// InitialConfig 复刻缺省行为：空配置。
func (p *gutenbergProvider) InitialConfig(settings map[string]any) map[string]any {
	return map[string]any{}
}

// discover 复刻 GutenbergProvider.discover。
func (p *gutenbergProvider) discover(context map[string]any) ([]map[string]any, map[string]any, error) {
	resp, err := p.HTTP.Request(nil, "GET", gutenbergEndpoint, safehttp.RequestOptions{
		Headers: acceptJSONHeaders(),
	})
	if err != nil {
		return nil, nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, pluginproto.NewUpstreamError("Upstream response could not be read", "other", nil)
	}
	var payload struct {
		Results []struct {
			ID      any            `json:"id"`
			Title   string         `json:"title"`
			Authors []struct {
				Name string `json:"name"`
			} `json:"authors"`
			Formats map[string]string `json:"formats"`
		} `json:"results"`
		Next string `json:"next"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, nil, pluginproto.NewUpstreamError("Upstream response is not valid JSON", "other", nil)
	}

	formats := sourceFormats(context)
	entries := []map[string]any{}
	for i, book := range payload.Results {
		if i >= 200 {
			break
		}
		bookID := fmt.Sprintf("%v", book.ID)
		for mime, rawURL := range book.Formats {
			if rawURL == "" {
				continue
			}
			fmtName := sourcebase.FormatFrom(rawURL, mime)
			if fmtName == "" || !formats[fmtName] {
				continue
			}
			authors := make([]string, 0, len(book.Authors))
			for _, a := range book.Authors {
				authors = append(authors, a.Name)
			}
			normalized, err := p.Normalize(context, bookID+":"+fmtName, book.Title, sourcebase.NormalizeOptions{
				Authors:        authors,
				Format:         fmtName,
				SourceURL:      "https://www.gutenberg.org/ebooks/" + bookID,
				AcquisitionURL: rawURL,
				Access:         "download",
			})
			if err != nil {
				return nil, nil, err
			}
			entries = append(entries, normalized.ToDict())
		}
	}
	return entries, map[string]any{"next": payload.Next, "seen": len(entries)}, nil
}

// ---- Internet Archive ----

// internetArchiveProvider 复刻 InternetArchiveProvider。
type internetArchiveProvider struct {
	*sourcebase.Base
}

const internetArchiveEndpoint = "https://archive.org/advancedsearch.php" +
	"?q=mediatype%3Atexts&fl%5B%5D=identifier,title,creator&rows=25&page=1&output=json"

func newInternetArchiveProvider() *internetArchiveProvider {
	p := &internetArchiveProvider{}
	p.Base = sourcebase.NewBase("Internet Archive", nil, p.discover)
	p.Base.Manifest = webSourceManifest(
		"talebook.source.internet-archive", "Internet Archive",
		"检索 Internet Archive；仅明确开放文件可进入待审取得。",
		[]string{"sources.browse", "sources.search", "sources.acquire"},
		map[string]any{"type": "object", "properties": sourcebase.CommonConfigProperties},
		sourcebase.ManifestOptions{
			Homepage:  "https://archive.org/details/texts",
			BrandIcon: "/images/plugin-icons/internet-archive.ico",
		})
	if ui, ok := p.Base.Manifest["ui"].(map[string]any); ok {
		ui["catalog_access"] = "rights_vary"
		ui["primary_action"] = "details"
	}
	return p
}

// Manifest 满足 pluginiface.Provider。
func (p *internetArchiveProvider) Manifest() map[string]any { return p.Base.Manifest }

// DownloadMode 满足 pluginiface.SourceProvider。
func (p *internetArchiveProvider) DownloadMode() pluginiface.DownloadMode {
	return pluginiface.DownloadSingleBook
}

// CapabilitySet 报告能力声明。
func (p *internetArchiveProvider) CapabilitySet() pluginiface.CapabilitySet { return sourceCaps() }

// Invoke 实现 MethodDispatcher：全部委托 DispatchInvoke。
func (p *internetArchiveProvider) Invoke(method string, args []any, context map[string]any) (any, error) {
	return DispatchInvoke(p, method, args, context)
}

// InitialConfig 复刻缺省行为：空配置。
func (p *internetArchiveProvider) InitialConfig(settings map[string]any) map[string]any {
	return map[string]any{}
}

// 编译期断言。
var _ pluginiface.SourceProvider = (*internetArchiveProvider)(nil)

// discover 复刻 InternetArchiveProvider.discover。
func (p *internetArchiveProvider) discover(context map[string]any) ([]map[string]any, map[string]any, error) {
	searchBody, err := fetchJSON(p.HTTP, internetArchiveEndpoint)
	if err != nil {
		return nil, nil, err
	}
	var search struct {
		Response struct {
			Docs []map[string]any `json:"docs"`
		} `json:"response"`
	}
	if err := json.Unmarshal(searchBody, &search); err != nil {
		return nil, nil, pluginproto.NewUpstreamError("Upstream response is not valid JSON", "other", nil)
	}

	formats := sourceFormats(context)
	entries := []map[string]any{}
	for i, doc := range search.Response.Docs {
		if i >= 25 {
			break
		}
		identifier, _ := doc["identifier"].(string)
		if identifier == "" {
			continue
		}
		metadataURL := "https://archive.org/metadata/" + url.PathEscape(identifier)
		metaBody, err := fetchJSON(p.HTTP, metadataURL)
		if err != nil {
			return nil, nil, err
		}
		var metadata struct {
			Metadata map[string]any `json:"metadata"`
			Files    []map[string]any `json:"files"`
		}
		if err := json.Unmarshal(metaBody, &metadata); err != nil {
			return nil, nil, pluginproto.NewUpstreamError("Upstream response is not valid JSON", "other", nil)
		}
		itemMeta := metadata.Metadata
		restricted := strings.EqualFold(asStringOr(itemMeta["access-restricted-item"], "false"), "true")
		title := firstString(doc["title"], itemMeta["title"])
		authors := iaAuthors(doc["creator"])

		if !restricted {
			type openFile struct {
				info map[string]any
				fmt  string
			}
			var downloadable []openFile
			for _, file := range metadata.Files {
				if strings.EqualFold(asStringOr(file["private"], "false"), "true") {
					continue
				}
				name, _ := file["name"].(string)
				fileFormat, _ := file["format"].(string)
				fmtName := sourcebase.FormatFrom(name, fileFormat)
				if fmtName != "" && formats[fmtName] {
					downloadable = append(downloadable, openFile{info: file, fmt: fmtName})
				}
			}
			if len(downloadable) > 0 {
				licenseName := firstString(itemMeta["licenseurl"], itemMeta["rights"])
				if licenseName == "" {
					licenseName = "由条目权利声明决定"
				}
				for _, item := range downloadable {
					name, _ := item.info["name"].(string)
					normalized, err := p.Normalize(context, identifier+":"+name, title, sourcebase.NormalizeOptions{
						Authors:        authors,
						Format:         item.fmt,
						SourceURL:      "https://archive.org/details/" + identifier,
						AcquisitionURL: "https://archive.org/download/" + url.PathEscape(identifier) + "/" + url.PathEscape(name),
						Access:         "download",
						LicenseName:    licenseName,
					})
					if err != nil {
						return nil, nil, err
					}
					entries = append(entries, normalized.ToDict())
				}
				continue
			}
		}

		licenseName := firstString(itemMeta["licenseurl"], itemMeta["rights"])
		if licenseName == "" {
			licenseName = "需查看条目权利声明"
		}
		access := "external_link"
		if restricted {
			access = "restricted"
		}
		normalized, err := p.Normalize(context, identifier, title, sourcebase.NormalizeOptions{
			Authors:     authors,
			SourceURL:   "https://archive.org/details/" + identifier,
			Access:      access,
			LicenseName: licenseName,
		})
		if err != nil {
			return nil, nil, err
		}
		entries = append(entries, normalized.ToDict())
	}
	return entries, map[string]any{"seen": len(entries)}, nil
}

// iaAuthors 复刻 `[doc.get("creator")] if isinstance(doc.get("creator"), str) else doc.get("creator") or []`。
func iaAuthors(creator any) []string {
	switch value := creator.(type) {
	case string:
		return []string{value}
	case []any:
		out := make([]string, 0, len(value))
		for _, item := range value {
			if s, ok := item.(string); ok {
				out = append(out, s)
			}
		}
		return out
	}
	return nil
}

// asStringOr 复刻 str(value or default)，并兼容 JSON 布尔
// （Python str(True)=='True'，可被 lower()=='true' 识别）。
func asStringOr(value any, def string) string {
	switch v := value.(type) {
	case string:
		if v != "" {
			return v
		}
	case bool:
		if v {
			return "True"
		}
		return "False"
	case float64:
		return trimFloatIA(v)
	}
	return def
}

// trimFloatIA 复刻 Python str(float) 的整数形态。
func trimFloatIA(f float64) string {
	if f == float64(int64(f)) {
		return itoa(int(f))
	}
	return fmt.Sprintf("%v", f)
}

// firstString 返回第一个非空字符串。
func firstString(values ...any) string {
	for _, value := range values {
		if s, ok := value.(string); ok && s != "" {
			return s
		}
	}
	return ""
}

// fetchJSON 是 GET + 解析 JSON 的共享辅助。
func fetchJSON(client *safehttp.SafeHttpClient, target string) ([]byte, error) {
	resp, err := client.Request(nil, "GET", target, safehttp.RequestOptions{
		Headers: acceptJSONHeaders(),
	})
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, pluginproto.NewUpstreamError("Upstream response could not be read", "other", nil)
	}
	return body, nil
}

// ---- WebDAV ----

// webdavProvider 复刻 WebDAVProvider。
type webdavProvider struct {
	*sourcebase.Base
}

func newWebDAVProvider() *webdavProvider {
	p := &webdavProvider{}
	p.Base = sourcebase.NewBase("WebDAV", nil, p.discover)
	properties := map[string]any{}
	for k, v := range sourcebase.CommonConfigProperties {
		properties[k] = v
	}
	properties["endpoint"] = map[string]any{"type": "string", "format": "uri", "title": "WebDAV endpoint"}
	p.Base.Manifest = webSourceManifest(
		"talebook.source.webdav", "WebDAV",
		"浏览 WebDAV 目录并按扩展名增量发现待审电子书。",
		[]string{"sources.browse", "sources.acquire"},
		map[string]any{
			"type":       "object",
			"properties": properties,
			"required":   []any{"endpoint"},
		},
		sourcebase.ManifestOptions{
			AuthSchema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"username": map[string]any{"type": "string", "writeOnly": true},
					"password": map[string]any{"type": "string", "writeOnly": true},
				},
			},
		})
	return p
}

// Manifest 满足 pluginiface.Provider。
func (p *webdavProvider) Manifest() map[string]any { return p.Base.Manifest }

// DownloadMode 满足 pluginiface.SourceProvider。
func (p *webdavProvider) DownloadMode() pluginiface.DownloadMode {
	return pluginiface.DownloadSingleBook
}

// CapabilitySet 报告能力声明。
func (p *webdavProvider) CapabilitySet() pluginiface.CapabilitySet { return sourceCaps() }

// Invoke 实现 MethodDispatcher：全部委托 DispatchInvoke。
func (p *webdavProvider) Invoke(method string, args []any, context map[string]any) (any, error) {
	return DispatchInvoke(p, method, args, context)
}

// InitialConfig 复刻缺省行为：空配置。
func (p *webdavProvider) InitialConfig(settings map[string]any) map[string]any {
	return map[string]any{}
}

// 编译期断言。
var _ pluginiface.SourceProvider = (*webdavProvider)(nil)

// davMultistatus 是 PROPFIND 响应的 XML 结构。
type davMultistatus struct {
	XMLName  xml.Name  `xml:"multistatus"`
	Responses []davResponse `xml:"response"`
}

// davResponse 是单个资源的 PROPFIND 条目。
type davResponse struct {
	Href     string      `xml:"href"`
	PropStat []davPropStat `xml:"propstat"`
}

// davPropStat 是 propstat 容器。
type davPropStat struct {
	Prop davProp `xml:"prop"`
}

// davProp 是感兴趣的属性集合。
type davProp struct {
	GetETag         string `xml:"getetag"`
	GetLastModified string `xml:"getlastmodified"`
	Collection      *struct{} `xml:"resourcetype>collection"`
}

// discover 复刻 WebDAVProvider.discover。
func (p *webdavProvider) discover(context map[string]any) ([]map[string]any, map[string]any, error) {
	config, _ := context["config"].(map[string]any)
	endpoint, _ := config["endpoint"].(string)
	if endpoint == "" {
		return nil, nil, pluginproto.NewUpstreamError("WebDAV endpoint is required", "other", nil)
	}

	headers := sourceHeaders(context)
	headers["Depth"] = "1"
	headers["Content-Type"] = "application/xml"
	resp, err := p.HTTP.Request(nil, "PROPFIND", endpoint, safehttp.RequestOptions{
		Headers: headers,
		Data:    []byte(`<?xml version="1.0"?><propfind xmlns="DAV:"><prop><getetag/><getlastmodified/><getcontentlength/><resourcetype/></prop></propfind>`),
	})
	if err != nil {
		return nil, nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, pluginproto.NewUpstreamError("Upstream response could not be read", "other", nil)
	}
	var root davMultistatus
	if err := xml.Unmarshal(body, &root); err != nil {
		return nil, nil, pluginproto.NewUpstreamError("WebDAV response is not valid XML", "other", nil)
	}

	cursor, _ := context["cursor"].(map[string]any)
	oldETags, _ := cursor["etags"].(map[string]any)
	formats := sourceFormats(context)
	etags := map[string]any{}
	entries := []map[string]any{}
	for _, item := range root.Responses {
		if len(item.PropStat) == 0 || item.PropStat[0].Prop.Collection != nil {
			continue
		}
		prop := item.PropStat[0].Prop
		href := strings.TrimPrefix(item.Href, "http://")
		full := joinURL(endpoint, href)
		fmtName := sourcebase.FormatFrom(full, "")
		if fmtName == "" || !formats[fmtName] {
			continue
		}
		etag := prop.GetETag
		etags[full] = etag
		if old, ok := oldETags[full].(string); ok && old == etag && etag != "" {
			continue
		}
		u, err := url.Parse(full)
		if err != nil {
			continue
		}
		stem := strings.TrimSuffix(path.Base(u.Path), path.Ext(u.Path))
		title, _ := url.PathUnescape(stem)
		normalized, err := p.Normalize(context, full, title, sourcebase.NormalizeOptions{
			Format:         fmtName,
			SourceURL:      endpoint,
			AcquisitionURL: full,
			Access:         "download",
			RemoteETag:     strings.Trim(etag, `"`),
			UpdatedAt:      prop.GetLastModified,
		})
		if err != nil {
			return nil, nil, err
		}
		entries = append(entries, normalized.ToDict())
	}
	return entries, map[string]any{"etags": etags}, nil
}

// ---- Watch Folder ----

// watchFolderProvider 复刻 WatchFolderProvider。
type watchFolderProvider struct {
	*sourcebase.Base
}

func newWatchFolderProvider() *watchFolderProvider {
	p := &watchFolderProvider{}
	p.Base = sourcebase.NewBase("Watch Folder", nil, p.discover)
	properties := map[string]any{}
	for k, v := range sourcebase.CommonConfigProperties {
		properties[k] = v
	}
	properties["path"] = map[string]any{"type": "string", "title": "监听目录"}
	properties["recursive"] = map[string]any{"type": "boolean", "default": true}
	p.Base.Manifest = webSourceManifest(
		"talebook.source.watch-folder", "Watch Folder",
		"扫描白名单内的本地目录，以内容 hash 增量发现待审电子书。",
		[]string{"sources.browse", "sources.acquire"},
		map[string]any{
			"type":       "object",
			"properties": properties,
			"required":   []any{"path"},
		},
		sourcebase.ManifestOptions{
			Homepage:       "https://github.com/talebook/talebook",
			RuntimeKind:    "file",
			NetworkRead:    false,
			NetworkReadSet: true,
		})
	return p
}

// Manifest 满足 pluginiface.Provider。
func (p *watchFolderProvider) Manifest() map[string]any { return p.Base.Manifest }

// DownloadMode 满足 pluginiface.SourceProvider。
func (p *watchFolderProvider) DownloadMode() pluginiface.DownloadMode {
	return pluginiface.DownloadSingleBook
}

// CapabilitySet 报告能力声明。
func (p *watchFolderProvider) CapabilitySet() pluginiface.CapabilitySet { return sourceCaps() }

// Invoke 实现 MethodDispatcher：全部委托 DispatchInvoke。
func (p *watchFolderProvider) Invoke(method string, args []any, context map[string]any) (any, error) {
	return DispatchInvoke(p, method, args, context)
}

// InitialConfig 复刻缺省行为：空配置。
func (p *watchFolderProvider) InitialConfig(settings map[string]any) map[string]any {
	return map[string]any{}
}

// 编译期断言。
var _ pluginiface.SourceProvider = (*watchFolderProvider)(nil)

// discover 复刻 WatchFolderProvider.discover。
func (p *watchFolderProvider) discover(context map[string]any) ([]map[string]any, map[string]any, error) {
	config, _ := context["config"].(map[string]any)
	platform, _ := context["platform"].(map[string]any)
	roots := stringList(platform["import_allowed_roots"])

	target, err := watchFolderAllowedPath(asStringOr(config["path"], ""), roots)
	if err != nil {
		return nil, nil, err
	}
	recursive := true
	if v, ok := config["recursive"].(bool); ok {
		recursive = v
	}
	cursor, _ := context["cursor"].(map[string]any)
	oldFiles, _ := cursor["files"].(map[string]any)
	formats := sourceFormats(context)

	files := map[string]any{}
	entries := []map[string]any{}

	var paths []string
	walkErr := filepath.WalkDir(target, func(pathStr string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !recursive && d.IsDir() && pathStr != target {
			return fs.SkipDir
		}
		if !d.IsDir() {
			paths = append(paths, pathStr)
		}
		return nil
	})
	if walkErr != nil {
		return nil, nil, walkErr
	}
	sort.Strings(paths)

	for _, pathStr := range paths {
		resolved, err := filepath.EvalSymlinks(pathStr)
		if err != nil {
			return nil, nil, err
		}
		if _, err := watchFolderAllowedPath(resolved, roots); err != nil {
			return nil, nil, err
		}
		ext := strings.TrimPrefix(strings.ToLower(filepath.Ext(resolved)), ".")
		if !formats[ext] {
			continue
		}
		info, err := os.Stat(resolved)
		if err != nil {
			return nil, nil, err
		}
		signature := fmt.Sprintf("%d:%d", info.ModTime().UnixNano(), info.Size())
		files[resolved] = signature
		if old, ok := oldFiles[resolved].(string); ok && old == signature {
			continue
		}
		digest, err := sha256File(resolved)
		if err != nil {
			return nil, nil, err
		}
		title := strings.TrimSuffix(filepath.Base(resolved), filepath.Ext(resolved))
		normalized, err := p.Normalize(context, resolved, title, sourcebase.NormalizeOptions{
			Format:         ext,
			SourceURL:      target,
			AcquisitionURL: pathToURI(resolved),
			Access:         "download",
			LicenseName:    "本地文件；许可由管理员确认",
			ContentHash:    digest,
			UpdatedAt:      fmt.Sprintf("%d", info.ModTime().UnixNano()),
		})
		if err != nil {
			return nil, nil, err
		}
		entries = append(entries, normalized.ToDict())
	}
	return entries, map[string]any{"files": files}, nil
}

// watchFolderAllowedPath 复刻 _allowed_path：白名单校验。
func watchFolderAllowedPath(value string, roots []string) (string, error) {
	if value == "" {
		return "", pluginproto.NewUpstreamError("Watch Folder path is required", "other", nil)
	}
	expanded := expandUser(value)
	resolved, err := filepath.Abs(expanded)
	if err != nil {
		return "", pluginproto.NewUpstreamError("Watch Folder path is outside the configured allowlist", "other", nil)
	}
	if resolved, err = filepath.EvalSymlinks(resolved); err != nil {
		return "", pluginproto.NewUpstreamError("Watch Folder path is outside the configured allowlist", "other", nil)
	}
	for _, root := range roots {
		rootResolved, err := filepath.Abs(expandUser(root))
		if err != nil {
			continue
		}
		if rootResolved, err = filepath.EvalSymlinks(rootResolved); err != nil {
			continue
		}
		if resolved == rootResolved || strings.HasPrefix(resolved, rootResolved+string(filepath.Separator)) {
			return resolved, nil
		}
	}
	return "", pluginproto.NewUpstreamError("Watch Folder path is outside the configured allowlist", "other", nil)
}

// expandUser 复刻 Path.expanduser 的常见形态（~ 与 ~user 仅处理 ~）。
func expandUser(value string) string {
	if value == "~" || strings.HasPrefix(value, "~/") || strings.HasPrefix(value, `~\`) {
		if home, err := os.UserHomeDir(); err == nil {
			return filepath.Join(home, strings.TrimPrefix(strings.TrimPrefix(value, "~"), "/"))
		}
	}
	return value
}

// sha256File 复刻 _hash_file：1 MiB 分块读取。
func sha256File(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	digest := sha256.New()
	buf := make([]byte, 1024*1024)
	for {
		n, err := f.Read(buf)
		if n > 0 {
			digest.Write(buf[:n])
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", err
		}
	}
	return hex.EncodeToString(digest.Sum(nil)), nil
}

// joinURL 复刻 urllib.parse.urljoin。
func joinURL(base, ref string) string {
	if ref == "" {
		return ""
	}
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

// pathToURI 复刻 Path.as_uri：file:// 绝对路径。
func pathToURI(path string) string {
	u := &url.URL{Scheme: "file", Path: filepath.ToSlash(path)}
	return u.String()
}

// stringList 把值转成字符串列表。
func stringList(v any) []string {
	switch value := v.(type) {
	case []string:
		return value
	case []any:
		out := make([]string, 0, len(value))
		for _, item := range value {
			if s, ok := item.(string); ok {
				out = append(out, s)
			}
		}
		return out
	}
	return nil
}
