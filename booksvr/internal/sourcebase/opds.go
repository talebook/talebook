package sourcebase

import (
	"encoding/xml"
	"fmt"
	"net/url"
	"strings"

	"talebook/booksvr/internal/pluginproto"
	"talebook/booksvr/internal/safehttp"
)

// AtomNS 复刻 ATOM_NS。
var AtomNS = map[string]string{
	"atom": "http://www.w3.org/2005/Atom",
	"dc":   "http://purl.org/dc/terms/",
}

// DAVNS 复刻 DAV_NS。
var DAVNS = map[string]string{"d": "DAV:"}

// OPDSOptions 是 NewOPDSProvider 的参数。
type OPDSOptions struct {
	PluginID    string
	Name        string
	Description string
	Homepage    string
	Endpoint    string
	LicenseName string
	BrandIcon   string
	HTTP        *safehttp.SafeHttpClient
}

// OPDSProvider 复刻 OPDSProvider。
//
// 它把 OPDS 1/2 目录绑定到标准 SourceProvider。
type OPDSProvider struct {
	*Base
	// Endpoint 是预设端点；为空时要求配置提供。
	Endpoint string
}

// NewOPDSProvider 复刻 OPDSProvider.__init__。
func NewOPDSProvider(opts OPDSOptions) *OPDSProvider {
	if opts.LicenseName == "" {
		opts.LicenseName = "由来源条目决定"
	}
	properties := map[string]any{}
	for k, v := range CommonConfigProperties {
		properties[k] = v
	}
	required := []any{}
	if opts.Endpoint == "" {
		properties["endpoint"] = map[string]any{
			"type": "string", "format": "uri", "title": "OPDS endpoint",
		}
		required = []any{"endpoint"}
	}

	manifest := Manifest(opts.PluginID, opts.Name, opts.Description,
		[]string{"sources.browse", "sources.search", "sources.acquire"},
		map[string]any{"type": "object", "properties": properties, "required": required},
		ManifestOptions{
			AuthSchema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"api_key":  map[string]any{"type": "string", "writeOnly": true},
					"username": map[string]any{"type": "string", "writeOnly": true},
					"password": map[string]any{"type": "string", "writeOnly": true},
				},
			},
			Homepage:  opts.Homepage,
			BrandIcon: opts.BrandIcon,
		})

	p := &OPDSProvider{Endpoint: opts.Endpoint}
	p.Base = NewBase(opts.Name, opts.HTTP, p.discover)
	p.LicenseName = opts.LicenseName
	p.Manifest = manifest
	return p
}

// discover 复刻 OPDSProvider.discover。
func (o *OPDSProvider) discover(context map[string]any) ([]map[string]any, map[string]any, error) {
	config := asMap(context["config"])
	endpoint := o.Endpoint
	if endpoint == "" {
		endpoint = asString(config["endpoint"])
	}
	if endpoint == "" {
		return nil, nil, pluginproto.NewUpstreamError("OPDS endpoint is required", "other", nil)
	}

	resp, err := o.HTTP.Request(gocontextBackground(), "GET", endpoint, safehttp.RequestOptions{
		Headers:    o.headers(context),
		Timeout:    timeoutOf(config),
		HasTimeout: true,
	})
	if err != nil {
		return nil, nil, err
	}
	defer resp.Body.Close()

	content, err := readAll(resp.Body)
	if err != nil {
		return nil, nil, pluginproto.NewUpstreamError("Upstream response could not be read", "other", nil)
	}

	contentType := strings.ToLower(resp.Header.Get("Content-Type"))
	trimmed := strings.TrimLeft(string(content), " \t\r\n")
	var entries []map[string]any
	if strings.Contains(contentType, "json") || strings.HasPrefix(trimmed, "{") || strings.HasPrefix(trimmed, "[") {
		var payload any
		if err := jsonUnmarshal(content, &payload); err != nil {
			return nil, nil, pluginproto.NewUpstreamError("OPDS response is not valid JSON", "other", nil)
		}
		entries, err = o.parseJSON(context, payload, endpoint)
		if err != nil {
			return nil, nil, err
		}
	} else {
		entries, err = o.parseAtom(context, content, endpoint)
		if err != nil {
			return nil, nil, err
		}
	}
	return entries, map[string]any{"endpoint": endpoint, "seen": len(entries)}, nil
}

// parseJSON 复刻 OPDSProvider._parse_json。
func (o *OPDSProvider) parseJSON(context map[string]any, payload any, endpoint string) ([]map[string]any, error) {
	root, ok := payload.(map[string]any)
	if !ok {
		return nil, nil
	}
	publications := asAnySlice(root["publications"])
	if publications == nil {
		publications = asAnySlice(root["entries"])
	}
	if len(publications) > 200 {
		publications = publications[:200]
	}

	formats := o.formats(context)
	var entries []map[string]any
	for _, raw := range publications {
		publication, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		metadata := asMap(publication["metadata"])
		if len(metadata) == 0 {
			metadata = publication
		}
		links := asAnySlice(publication["links"])

		acquisition := jsonAcquisition(links)
		fmtName := ""
		if acquisition != nil {
			fmtName = FormatFrom(asString(acquisition["href"]), asString(acquisition["type"]))
		}
		if fmtName != "" && !formats[fmtName] {
			continue
		}

		authors := jsonAuthors(metadata)
		identifier := metadata["identifier"]
		if identifier == nil {
			identifier = publication["id"]
		}
		if identifier == nil {
			identifier = metadata["title"]
		}
		isbn := firstISBN(identifier)

		acquisitionURL := ""
		access := "external_link"
		if acquisition != nil {
			acquisitionURL = resolveURL(endpoint, asString(acquisition["href"]))
			if fmtName != "" {
				access = "download"
			}
		}

		licenseName := asString(metadata["rights"])
		if licenseName == "" {
			licenseName = o.LicenseName
		}

		entry, err := o.Normalize(context, identifier, asString(metadata["title"]), NormalizeOptions{
			Authors:        authors,
			ISBN:           isbn,
			Format:         fmtName,
			SourceURL:      endpoint,
			AcquisitionURL: acquisitionURL,
			Access:         access,
			LicenseName:    licenseName,
			UpdatedAt:      asString(metadata["modified"]),
		})
		if err != nil {
			return nil, err
		}
		entries = append(entries, entry.ToDict())
	}
	return entries, nil
}

// jsonAcquisition 复刻 OPDSProvider._json_acquisition。
func jsonAcquisition(links []any) map[string]any {
	for _, raw := range links {
		link, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		rels := asStringSliceAny(link["rel"])
		matched := false
		for _, rel := range rels {
			if strings.Contains(rel, "acquisition") {
				matched = true
				break
			}
		}
		if !matched {
			continue
		}
		if FormatFrom(asString(link["href"]), asString(link["type"])) != "" {
			return link
		}
	}
	return nil
}

// jsonAuthors 复刻 _parse_json 里的作者归一化。
func jsonAuthors(metadata map[string]any) []string {
	raw := metadata["author"]
	if raw == nil {
		raw = metadata["authors"]
	}
	if raw == nil {
		return nil
	}
	var list []any
	switch v := raw.(type) {
	case string, map[string]any:
		list = []any{v}
	case []any:
		list = v
	default:
		return nil
	}
	out := make([]string, 0, len(list))
	for _, item := range list {
		if m, ok := item.(map[string]any); ok {
			out = append(out, asString(m["name"]))
			continue
		}
		out = append(out, asString(item))
	}
	return out
}

// firstISBN 复刻 `next((v for v in ([identifier] if isinstance(identifier,str) else identifier or []) if _isbn(v)), "")`。
func firstISBN(identifier any) string {
	var candidates []any
	if s, ok := identifier.(string); ok {
		candidates = []any{s}
	} else if list, ok := identifier.([]any); ok {
		candidates = list
	}
	for _, c := range candidates {
		if isbn := ISBN(c); isbn != "" {
			return isbn
		}
	}
	return ""
}

// atomFeed 是 Atom feed 的 XML 结构。
type atomFeed struct {
	XMLName xml.Name    `xml:"feed"`
	Entries []atomEntry `xml:"entry"`
}

// atomEntry 是 Atom entry 的 XML 结构。
type atomEntry struct {
	ID      string     `xml:"id"`
	Title   string     `xml:"title"`
	Updated string     `xml:"updated"`
	Rights  string     `xml:"rights"`
	Authors []atomName `xml:"author"`
	Links   []atomLink `xml:"link"`
	DCID    string     `xml:"http://purl.org/dc/terms/ identifier"`
}

// atomName 是 Atom author 的 name 子元素。
type atomName struct {
	Name string `xml:"name"`
}

// atomLink 是 Atom link 元素。
type atomLink struct {
	Rel  string `xml:"rel,attr"`
	Href string `xml:"href,attr"`
	Type string `xml:"type,attr"`
}

// parseAtom 复刻 OPDSProvider._parse_atom。
func (o *OPDSProvider) parseAtom(context map[string]any, content []byte, endpoint string) ([]map[string]any, error) {
	var feed atomFeed
	if err := xml.Unmarshal(content, &feed); err != nil {
		return nil, pluginproto.NewUpstreamError("OPDS response is not valid XML", "other", nil)
	}

	entries := feed.Entries
	if len(entries) > 200 {
		entries = entries[:200]
	}
	formats := o.formats(context)

	var out []map[string]any
	for _, entry := range entries {
		var acquisition *atomLink
		for i := range entry.Links {
			link := &entry.Links[i]
			rel := link.Rel
			if !strings.Contains(rel, "acquisition") && rel != "enclosure" {
				continue
			}
			if FormatFrom(link.Href, link.Type) != "" {
				acquisition = link
				break
			}
		}

		fmtName := ""
		if acquisition != nil {
			fmtName = FormatFrom(acquisition.Href, acquisition.Type)
		}
		if fmtName != "" && !formats[fmtName] {
			continue
		}

		identifier := entry.ID
		if identifier == "" {
			identifier = entry.Title
		}
		authors := make([]string, 0, len(entry.Authors))
		for _, a := range entry.Authors {
			authors = append(authors, a.Name)
		}

		title := entry.Title
		if title == "" {
			title = "未知标题"
		}

		acquisitionURL := ""
		access := "external_link"
		if acquisition != nil {
			acquisitionURL = resolveURL(endpoint, acquisition.Href)
			if fmtName != "" {
				access = "download"
			}
		}

		licenseName := entry.Rights
		if licenseName == "" {
			licenseName = o.LicenseName
		}

		normalized, err := o.Normalize(context, identifier, title, NormalizeOptions{
			Authors:        authors,
			ISBN:           entry.DCID,
			Format:         fmtName,
			SourceURL:      endpoint,
			AcquisitionURL: acquisitionURL,
			Access:         access,
			LicenseName:    licenseName,
			UpdatedAt:      entry.Updated,
		})
		if err != nil {
			return nil, err
		}
		out = append(out, normalized.ToDict())
	}
	return out, nil
}

// formats 复刻 SourceBase._formats。
// formats 复刻 SourceBase._formats：config.formats（空/未设回退全集）与
// ALLOWED_FORMATS 求交集。
func (b *Base) formats(context map[string]any) map[string]bool {
	config := asMap(context["config"])
	raw := config["formats"]
	requested := asStringSliceAny(raw)
	if len(requested) == 0 {
		for f := range AllowedFormats {
			requested = append(requested, f)
		}
	}
	out := map[string]bool{}
	for _, f := range requested {
		lower := strings.ToLower(f)
		if AllowedFormats[lower] {
			out[lower] = true
		}
	}
	return out
}

// resolveURL 复刻 urllib.parse.urljoin。
func resolveURL(base, ref string) string {
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

// asAnySlice 把值转成 []any。
func asAnySlice(v any) []any {
	if list, ok := v.([]any); ok {
		return list
	}
	return nil
}

// asStringSliceAny 把值转成字符串切片（兼容字符串与列表）。
func asStringSliceAny(v any) []string {
	switch val := v.(type) {
	case nil:
		return nil
	case string:
		return []string{val}
	case []string:
		return val
	case []any:
		out := make([]string, 0, len(val))
		for _, item := range val {
			out = append(out, asString(item))
		}
		return out
	}
	return nil
}

// Manifest 字段由 NewOPDSProvider 注入。
func (o *OPDSProvider) manifestDict() map[string]any { return o.Manifest }

// String 便于调试。
func (o *OPDSProvider) String() string {
	return fmt.Sprintf("OPDSProvider(%s)", o.SourceName)
}
