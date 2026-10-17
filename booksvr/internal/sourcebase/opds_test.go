package sourcebase

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"talebook/booksvr/internal/safehttp"
)

// opdsTestProvider 构造一个测试用 OPDS provider。
func opdsTestProvider() *OPDSProvider {
	return NewOPDSProvider(OPDSOptions{
		PluginID:    "talebook.source.opds",
		Name:        "Generic OPDS",
		Description: "d",
		Homepage:    "http://h",
	})
}

// TestOPDSManifest 用 Python 实测向量校验 manifest。
func TestOPDSManifest(t *testing.T) {
	p := opdsTestProvider()
	want := `{"actions":["test","preview","run","retry","rollback"],` +
		`"auth_schema":{"properties":{"api_key":{"type":"string","writeOnly":true},` +
		`"password":{"type":"string","writeOnly":true},"username":{"type":"string","writeOnly":true}},` +
		`"type":"object"},"capabilities":["sources.browse","sources.search","sources.acquire"],` +
		`"categories":["sources"],"compatibility":{"talebook":">=0.1.0"},` +
		`"config_schema":{"properties":{"endpoint":{"format":"uri","title":"OPDS endpoint",` +
		`"type":"string"},"formats":{"default":["epub","pdf","mobi","txt"],` +
		`"items":{"type":"string"},"type":"array"},"target_library":{"default":"main",` +
		`"title":"目标书库","type":"string"}},"required":["endpoint"],"type":"object"},` +
		`"connection_owners":["instance"],` +
		`"data_policy":{"retention":"pending_review","stores_full_text":false},` +
		`"description":"d","download_mode":"single_book","homepage":"http://h",` +
		`"id":"talebook.source.opds","license":"GPL-3.0","name":"Generic OPDS",` +
		`"permissions":["books.read","books.write","network.read"],` +
		`"protocol_version":"talebook.plugin/v1","runtime_kind":"http",` +
		`"ui":{"configuration_mode":"form","icon":"mdi-bookshelf",` +
		`"manage_kind":"book_source","primary_action":"configure"},"version":"1.0.0"}`
	if got := canonical(t, p.Manifest); got != want {
		t.Errorf("得到 %s\n期望 %s", got, want)
	}
}

// TestOPDSManifestPresetEndpoint 预设端点时不需要 endpoint 配置。
func TestOPDSManifestPresetEndpoint(t *testing.T) {
	p := NewOPDSProvider(OPDSOptions{
		PluginID: "talebook.source.komga", Name: "Komga",
		Description: "d", Homepage: "http://h", Endpoint: "http://preset/opds",
	})
	schema, _ := p.Manifest["config_schema"].(map[string]any)
	props, _ := schema["properties"].(map[string]any)
	if _, has := props["endpoint"]; has {
		t.Error("预设端点时不应要求 endpoint 配置")
	}
	req, _ := schema["required"].([]any)
	if len(req) != 0 {
		t.Errorf("required = %v, want 空", req)
	}
}

// TestOPDSParseJSONVectors 用 Python 实测向量校验 _parse_json。
func TestOPDSParseJSONVectors(t *testing.T) {
	p := opdsTestProvider()
	payload := map[string]any{
		"publications": []any{
			map[string]any{
				"metadata": map[string]any{
					"title": "三体", "author": []any{map[string]any{"name": "刘慈欣"}},
					"identifier": "9787536692930", "rights": "CC", "modified": "2026",
				},
				"links": []any{map[string]any{
					"rel":  []any{"http://opds-spec.org/acquisition"},
					"href": "/dl/1.epub", "type": "application/epub+zip",
				}},
			},
			map[string]any{
				"metadata": map[string]any{
					"title": "球状闪电", "authors": "刘慈欣", "identifier": "12345",
				},
				"links": []any{map[string]any{
					"rel":  "http://opds-spec.org/acquisition",
					"href": "/dl/2.pdf", "type": "application/pdf",
				}},
			},
			map[string]any{
				"metadata": map[string]any{"title": "无链接"},
				"links":    []any{},
			},
		},
	}

	entries, err := p.parseJSON(map[string]any{"config": map[string]any{
		"formats": []any{"epub", "pdf"},
	}}, payload, "http://x/opds")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(entries) != 3 {
		t.Fatalf("条目数 = %d, want 3", len(entries))
	}

	// 第 1 条：完整字段。
	e0 := entries[0]
	if e0["title"] != "三体" || e0["format"] != "epub" || e0["access"] != "download" {
		t.Errorf("首条 = %v", e0)
	}
	if e0["acquisition_url"] != "http://x/dl/1.epub" {
		t.Errorf("acquisition_url = %v", e0["acquisition_url"])
	}
	if e0["isbn"] != "9787536692930" || e0["license"] != "CC" || e0["updated_at"] != "2026" {
		t.Errorf("首条元数据 = %v", e0)
	}
	if e0["source"] != "Generic OPDS" || e0["source_url"] != "http://x/opds" {
		t.Errorf("来源字段 = %v", e0)
	}
	if e0["external_id"] != ExternalID("Generic OPDS", "9787536692930") {
		t.Errorf("external_id = %v", e0["external_id"])
	}

	// 第 2 条：authors 为字符串，isbn 非法被清空，license 回退。
	e1 := entries[1]
	if e1["format"] != "pdf" || e1["isbn"] != "" {
		t.Errorf("次条 = %v", e1)
	}
	if e1["license"] != "由来源条目决定" {
		t.Errorf("license = %v, want 回退值", e1["license"])
	}

	// 第 3 条：无链接 → external_link 且清空 acquisition_url。
	e2 := entries[2]
	if e2["access"] != "external_link" || e2["acquisition_url"] != "" {
		t.Errorf("无链接条目 = %v", e2)
	}
	if e2["format"] != "" {
		t.Errorf("format = %v, want 空", e2["format"])
	}
}

// TestOPDSParseJSONFormatFilter 格式过滤生效。
func TestOPDSParseJSONFormatFilter(t *testing.T) {
	p := opdsTestProvider()
	payload := map[string]any{"publications": []any{
		map[string]any{
			"metadata": map[string]any{"title": "A"},
			"links": []any{map[string]any{
				"rel": "acquisition", "href": "/a.epub", "type": "application/epub+zip",
			}},
		},
		map[string]any{
			"metadata": map[string]any{"title": "B"},
			"links": []any{map[string]any{
				"rel": "acquisition", "href": "/b.pdf", "type": "application/pdf",
			}},
		},
	}}
	entries, err := p.parseJSON(map[string]any{"config": map[string]any{
		"formats": []any{"epub"},
	}}, payload, "http://x/opds")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(entries) != 1 || entries[0]["title"] != "A" {
		t.Errorf("过滤后得到 %d 条: %v", len(entries), entries)
	}
}

// TestOPDSParseJSONEntriesFallback publications 缺失时用 entries。
func TestOPDSParseJSONEntriesFallback(t *testing.T) {
	p := opdsTestProvider()
	payload := map[string]any{"entries": []any{
		map[string]any{"metadata": map[string]any{"title": "E"}},
	}}
	entries, err := p.parseJSON(map[string]any{}, payload, "http://x")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(entries) != 1 || entries[0]["title"] != "E" {
		t.Errorf("得到 %v", entries)
	}
}

// TestOPDSParseJSONSkipsNonObject 非对象条目被跳过。
func TestOPDSParseJSONSkipsNonObject(t *testing.T) {
	p := opdsTestProvider()
	payload := map[string]any{"publications": []any{
		"not-an-object",
		map[string]any{"title": "OK"},
	}}
	entries, err := p.parseJSON(map[string]any{}, payload, "http://x")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(entries) != 1 || entries[0]["title"] != "OK" {
		t.Errorf("得到 %v", entries)
	}
}

// TestOPDSParseJSONTruncatesTo200 超过 200 条时截断。
func TestOPDSParseJSONTruncatesTo200(t *testing.T) {
	p := opdsTestProvider()
	pubs := make([]any, 250)
	for i := range pubs {
		pubs[i] = map[string]any{"title": "T"}
	}
	entries, err := p.parseJSON(map[string]any{}, map[string]any{"publications": pubs}, "http://x")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(entries) != 200 {
		t.Errorf("条目数 = %d, want 200", len(entries))
	}
}

// TestOPDSParseAtomTruncatesTo200 超过 200 条时截断。
func TestOPDSParseAtomTruncatesTo200(t *testing.T) {
	p := opdsTestProvider()
	var b strings.Builder
	b.WriteString(`<feed xmlns="http://www.w3.org/2005/Atom">`)
	for i := 0; i < 250; i++ {
		b.WriteString(`<entry><id>u</id><title>T</title></entry>`)
	}
	b.WriteString(`</feed>`)
	entries, err := p.parseAtom(map[string]any{}, []byte(b.String()), "http://x")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(entries) != 200 {
		t.Errorf("条目数 = %d, want 200", len(entries))
	}
}

// TestOPDSParseAtomIdentifierFallbackToTitle id 为空时用 title。
func TestOPDSParseAtomIdentifierFallbackToTitle(t *testing.T) {
	p := opdsTestProvider()
	atom := []byte(`<feed xmlns="http://www.w3.org/2005/Atom">
 <entry><title>OnlyTitle</title></entry></feed>`)
	entries, err := p.parseAtom(map[string]any{}, atom, "http://x")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if entries[0]["external_id"] != ExternalID("Generic OPDS", "OnlyTitle") {
		t.Errorf("external_id = %v", entries[0]["external_id"])
	}
}

// TestJSONAcquisitionSkipsNonObject 非对象链接被跳过。
func TestJSONAcquisitionSkipsNonObject(t *testing.T) {
	links := []any{"not-an-object", map[string]any{
		"rel": "acquisition", "href": "/a.epub", "type": "application/epub+zip",
	}}
	if got := jsonAcquisition(links); got == nil {
		t.Error("应跳过非对象并命中后续链接")
	}
}

// TestResolveURLBadRef 非法 ref 退回原值。
func TestResolveURLBadRef(t *testing.T) {
	// Go 的 url.Parse 对大多数字符串宽容；用控制字符触发错误。
	if got := resolveURL("http://x/", "http://[::1"); got != "http://[::1" {
		t.Errorf("得到 %q, want 原值", got)
	}
}

// TestOPDSParseJSONNonObject 非对象 payload 返回空。
func TestOPDSParseJSONNonObject(t *testing.T) {
	p := opdsTestProvider()
	entries, err := p.parseJSON(map[string]any{}, []any{1, 2}, "http://x")
	if err != nil || len(entries) != 0 {
		t.Errorf("得到 (%v,%v), want (空,nil)", entries, err)
	}
}

// TestOPDSParseJSONMetadataFallback metadata 缺失时用 publication 自身。
func TestOPDSParseJSONMetadataFallback(t *testing.T) {
	p := opdsTestProvider()
	payload := map[string]any{"publications": []any{
		map[string]any{"title": "Direct", "id": "id1"},
	}}
	entries, err := p.parseJSON(map[string]any{}, payload, "http://x")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(entries) != 1 || entries[0]["title"] != "Direct" {
		t.Errorf("得到 %v", entries)
	}
	if entries[0]["external_id"] != ExternalID("Generic OPDS", "id1") {
		t.Errorf("external_id 应取自 publication.id，得到 %v", entries[0]["external_id"])
	}
}

// TestOPDSParseAtomVectors 用 Python 实测向量校验 _parse_atom。
func TestOPDSParseAtomVectors(t *testing.T) {
	p := opdsTestProvider()
	atom := []byte(`<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/terms/">
 <entry>
  <id>urn:1</id><title>Atom Book</title><updated>2026-01-01</updated><rights>PD</rights>
  <author><name>A1</name></author><author><name>A2</name></author>
  <dc:identifier>9787536692930</dc:identifier>
  <link rel="http://opds-spec.org/acquisition" href="/a.epub" type="application/epub+zip"/>
 </entry>
 <entry>
  <id>urn:2</id><title>No Link</title>
  <link rel="alternate" href="/x"/>
 </entry>
</feed>`)

	entries, err := p.parseAtom(map[string]any{"config": map[string]any{
		"formats": []any{"epub"},
	}}, atom, "http://x/opds")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(entries) != 2 {
		t.Fatalf("条目数 = %d, want 2", len(entries))
	}

	e0 := entries[0]
	if e0["title"] != "Atom Book" || e0["format"] != "epub" || e0["access"] != "download" {
		t.Errorf("首条 = %v", e0)
	}
	if e0["acquisition_url"] != "http://x/a.epub" {
		t.Errorf("acquisition_url = %v", e0["acquisition_url"])
	}
	if e0["isbn"] != "9787536692930" || e0["license"] != "PD" || e0["updated_at"] != "2026-01-01" {
		t.Errorf("首条元数据 = %v", e0)
	}
	if e0["external_id"] != ExternalID("Generic OPDS", "urn:1") {
		t.Errorf("external_id = %v", e0["external_id"])
	}

	e1 := entries[1]
	if e1["access"] != "external_link" || e1["acquisition_url"] != "" {
		t.Errorf("无链接条目 = %v", e1)
	}
}

// TestOPDSParseAtomInvalidXML 非法 XML 报错。
func TestOPDSParseAtomInvalidXML(t *testing.T) {
	p := opdsTestProvider()
	if _, err := p.parseAtom(map[string]any{}, []byte("not xml"), "http://x"); err == nil {
		t.Error("非法 XML 应报错")
	}
}

// TestOPDSParseAtomEnclosureRel enclosure 也算获取链接。
func TestOPDSParseAtomEnclosureRel(t *testing.T) {
	p := opdsTestProvider()
	atom := []byte(`<feed xmlns="http://www.w3.org/2005/Atom">
 <entry><id>u</id><title>T</title>
  <link rel="enclosure" href="/a.epub" type="application/epub+zip"/>
 </entry></feed>`)
	entries, err := p.parseAtom(map[string]any{}, atom, "http://x")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(entries) != 1 || entries[0]["access"] != "download" {
		t.Errorf("得到 %v", entries)
	}
}

// TestOPDSParseAtomEmptyTitle 空标题退回「未知标题」。
func TestOPDSParseAtomEmptyTitle(t *testing.T) {
	p := opdsTestProvider()
	atom := []byte(`<feed xmlns="http://www.w3.org/2005/Atom">
 <entry><id>u</id></entry></feed>`)
	entries, err := p.parseAtom(map[string]any{}, atom, "http://x")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if entries[0]["title"] != "未知标题" {
		t.Errorf("title = %v", entries[0]["title"])
	}
}

// TestOPDSParseAtomFormatFilter Atom 格式过滤。
func TestOPDSParseAtomFormatFilter(t *testing.T) {
	p := opdsTestProvider()
	atom := []byte(`<feed xmlns="http://www.w3.org/2005/Atom">
 <entry><id>u1</id><title>A</title>
  <link rel="acquisition" href="/a.epub" type="application/epub+zip"/></entry>
 <entry><id>u2</id><title>B</title>
  <link rel="acquisition" href="/b.pdf" type="application/pdf"/></entry>
</feed>`)
	entries, err := p.parseAtom(map[string]any{"config": map[string]any{
		"formats": []any{"epub"},
	}}, atom, "http://x")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(entries) != 1 || entries[0]["title"] != "A" {
		t.Errorf("过滤后得到 %v", entries)
	}
}

// opdsHTTPProvider 构造一个指向测试服务器的 OPDS provider。
func opdsHTTPProvider(endpoint string) *OPDSProvider {
	return NewOPDSProvider(OPDSOptions{
		PluginID: "talebook.source.opds", Name: "Generic OPDS",
		Description: "d", Homepage: "http://h", Endpoint: endpoint,
		HTTP: &safehttp.SafeHttpClient{
			Resolver: func(host string, port int) ([]string, error) {
				return []string{"93.184.216.34"}, nil
			},
		},
	})
}

// TestOPDSDiscoverJSON 端到端 JSON 发现。
func TestOPDSDiscoverJSON(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"publications":[{"metadata":{"title":"三体"},` +
			`"links":[{"rel":"acquisition","href":"/a.epub","type":"application/epub+zip"}]}]}`))
	}))
	defer srv.Close()

	p := opdsHTTPProvider(srv.URL)
	entries, cursor, err := p.discover(map[string]any{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(entries) != 1 || entries[0]["title"] != "三体" {
		t.Errorf("得到 %v", entries)
	}
	if cursor["endpoint"] != srv.URL || cursor["seen"] != 1 {
		t.Errorf("cursor = %v", cursor)
	}
}

// TestOPDSDiscoverAtom 端到端 Atom 发现。
func TestOPDSDiscoverAtom(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/atom+xml")
		_, _ = w.Write([]byte(`<feed xmlns="http://www.w3.org/2005/Atom">` +
			`<entry><id>u</id><title>Atom</title></entry></feed>`))
	}))
	defer srv.Close()

	p := opdsHTTPProvider(srv.URL)
	entries, _, err := p.discover(map[string]any{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(entries) != 1 || entries[0]["title"] != "Atom" {
		t.Errorf("得到 %v", entries)
	}
}

// TestOPDSDiscoverSniffJSON 无 Content-Type 时按内容嗅探 JSON。
func TestOPDSDiscoverSniffJSON(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		_, _ = w.Write([]byte(`  {"entries":[{"title":"Sniffed"}]}`))
	}))
	defer srv.Close()

	p := opdsHTTPProvider(srv.URL)
	entries, _, err := p.discover(map[string]any{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(entries) != 1 || entries[0]["title"] != "Sniffed" {
		t.Errorf("得到 %v", entries)
	}
}

// TestOPDSDiscoverInvalidJSON 非法 JSON 报错。
func TestOPDSDiscoverInvalidJSON(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{not json`))
	}))
	defer srv.Close()

	p := opdsHTTPProvider(srv.URL)
	if _, _, err := p.discover(map[string]any{}); err == nil {
		t.Error("非法 JSON 应报错")
	}
}

// TestOPDSDiscoverUpstreamError 上游错误透传。
func TestOPDSDiscoverUpstreamError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	p := opdsHTTPProvider(srv.URL)
	if _, _, err := p.discover(map[string]any{}); err == nil {
		t.Error("上游错误应透传")
	}
}

// TestOPDSDiscoverEndpointFromConfig 端点来自配置。
func TestOPDSDiscoverEndpointFromConfig(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"entries":[{"title":"FromConfig"}]}`))
	}))
	defer srv.Close()

	// 无预设端点，端点由配置提供。
	p := NewOPDSProvider(OPDSOptions{
		PluginID: "talebook.source.opds", Name: "Generic OPDS",
		Description: "d", Homepage: "http://h",
		HTTP: &safehttp.SafeHttpClient{
			Resolver: func(host string, port int) ([]string, error) {
				return []string{"93.184.216.34"}, nil
			},
		},
	})
	entries, _, err := p.discover(map[string]any{"config": map[string]any{"endpoint": srv.URL}})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(entries) != 1 || entries[0]["title"] != "FromConfig" {
		t.Errorf("得到 %v", entries)
	}
}

// TestOPDSDiscoverRequiresEndpoint 无端点时报错。
func TestOPDSDiscoverRequiresEndpoint(t *testing.T) {
	p := opdsTestProvider()
	if _, _, err := p.discover(map[string]any{}); err == nil {
		t.Error("无端点应报错")
	}
}

// TestFormats 覆盖格式集合解析。
func TestFormats(t *testing.T) {
	b := NewBase("demo", nil, nil)
	// 默认值：回退 ALLOWED_FORMATS 全集（对齐 Python _formats）。
	got := b.formats(map[string]any{})
	if len(got) != len(AllowedFormats) || !got["epub"] || !got["cbz"] || !got["fb2"] {
		t.Errorf("默认得到 %v", got)
	}
	// 显式配置（大小写归一，且与全集求交集）。
	got = b.formats(map[string]any{"config": map[string]any{"formats": []any{"EPUB", "exe"}}})
	if len(got) != 1 || !got["epub"] {
		t.Errorf("显式得到 %v", got)
	}
}

// TestResolveURL 覆盖 URL 拼接。
func TestResolveURL(t *testing.T) {
	cases := []struct{ base, ref, want string }{
		{"http://x/opds", "/a.epub", "http://x/a.epub"},
		{"http://x/opds/", "a.epub", "http://x/opds/a.epub"},
		{"http://x/opds", "http://y/b", "http://y/b"},
		{"http://x/opds", "", ""},
		// 非法 base 时退回 ref。
		{"://bad", "/a", "/a"},
	}
	for _, c := range cases {
		if got := resolveURL(c.base, c.ref); got != c.want {
			t.Errorf("resolveURL(%q,%q) = %q, want %q", c.base, c.ref, got, c.want)
		}
	}
}

// TestFirstISBN 覆盖 ISBN 提取。
func TestFirstISBN(t *testing.T) {
	if got := firstISBN("9787536692930"); got != "9787536692930" {
		t.Errorf("字符串得到 %q", got)
	}
	if got := firstISBN([]any{"bad", "9787536692930"}); got != "9787536692930" {
		t.Errorf("列表得到 %q", got)
	}
	if got := firstISBN(nil); got != "" {
		t.Errorf("nil 得到 %q", got)
	}
	if got := firstISBN(12345); got != "" {
		t.Errorf("数字得到 %q", got)
	}
}

// TestJSONAuthors 覆盖作者归一化。
func TestJSONAuthors(t *testing.T) {
	// 列表 of dict。
	got := jsonAuthors(map[string]any{"author": []any{map[string]any{"name": "A"}}})
	if len(got) != 1 || got[0] != "A" {
		t.Errorf("列表得到 %v", got)
	}
	// 单个字符串。
	got = jsonAuthors(map[string]any{"authors": "B"})
	if len(got) != 1 || got[0] != "B" {
		t.Errorf("字符串得到 %v", got)
	}
	// 单个 dict。
	got = jsonAuthors(map[string]any{"author": map[string]any{"name": "C"}})
	if len(got) != 1 || got[0] != "C" {
		t.Errorf("dict 得到 %v", got)
	}
	// 缺失。
	if got := jsonAuthors(map[string]any{}); got != nil {
		t.Errorf("缺失得到 %v", got)
	}
	// 非法类型。
	if got := jsonAuthors(map[string]any{"author": 42}); got != nil {
		t.Errorf("非法得到 %v", got)
	}
}

// TestJSONAcquisition 覆盖获取链接选择。
func TestJSONAcquisition(t *testing.T) {
	// 命中。
	links := []any{map[string]any{
		"rel":  []any{"http://opds-spec.org/acquisition"},
		"href": "/a.epub", "type": "application/epub+zip",
	}}
	if got := jsonAcquisition(links); got == nil {
		t.Error("应命中")
	}
	// rel 无 acquisition。
	links = []any{map[string]any{"rel": "alternate", "href": "/a.epub", "type": "application/epub+zip"}}
	if got := jsonAcquisition(links); got != nil {
		t.Error("不应命中")
	}
	// 格式不支持。
	links = []any{map[string]any{"rel": "acquisition", "href": "/a.xyz", "type": "application/xyz"}}
	if got := jsonAcquisition(links); got != nil {
		t.Error("格式不支持时不应命中")
	}
	// 空列表。
	if got := jsonAcquisition(nil); got != nil {
		t.Error("空列表不应命中")
	}
}

// TestAsStringSliceAny 覆盖字符串切片转换。
func TestAsStringSliceAny(t *testing.T) {
	if got := asStringSliceAny(nil); got != nil {
		t.Errorf("nil 得到 %v", got)
	}
	if got := asStringSliceAny("x"); len(got) != 1 || got[0] != "x" {
		t.Errorf("字符串得到 %v", got)
	}
	if got := asStringSliceAny([]string{"a"}); len(got) != 1 {
		t.Errorf("[]string 得到 %v", got)
	}
	if got := asStringSliceAny([]any{"a", "b"}); len(got) != 2 {
		t.Errorf("[]any 得到 %v", got)
	}
	if got := asStringSliceAny(42); got != nil {
		t.Errorf("非法得到 %v", got)
	}
}

// TestAsAnySlice 覆盖 any 切片转换。
func TestAsAnySlice(t *testing.T) {
	if got := asAnySlice([]any{1}); len(got) != 1 {
		t.Errorf("得到 %v", got)
	}
	if got := asAnySlice("x"); got != nil {
		t.Errorf("非切片得到 %v", got)
	}
}

// TestOPDSProviderString 覆盖调试字符串。
func TestOPDSProviderString(t *testing.T) {
	p := opdsTestProvider()
	if p.String() == "" {
		t.Error("String 不应为空")
	}
	if p.manifestDict() == nil {
		t.Error("manifestDict 不应为 nil")
	}
}

// TestOPDSEndpointFromConfig 端点来自配置。
func TestOPDSEndpointFromConfig(t *testing.T) {
	p := opdsTestProvider()
	// 无 HTTP 客户端时会 panic，这里只验证端点解析路径：
	// 配置为空 → 报错；配置有端点 → 进入请求阶段。
	if _, _, err := p.discover(map[string]any{"config": map[string]any{}}); err == nil {
		t.Error("空配置应报错")
	}
}

// TestOPDSManifestJSONRoundTrip manifest 可序列化。
func TestOPDSManifestJSONRoundTrip(t *testing.T) {
	p := opdsTestProvider()
	if _, err := json.Marshal(p.Manifest); err != nil {
		t.Errorf("序列化失败: %v", err)
	}
}
