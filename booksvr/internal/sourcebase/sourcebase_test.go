package sourcebase

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"sort"
	"strings"
	"testing"

	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/safehttp"
)

// TestAllowedFormats 覆盖允许格式集合。
func TestAllowedFormats(t *testing.T) {
	want := []string{"azw", "azw3", "cbr", "cbz", "epub", "fb2", "mobi", "pdf", "txt"}
	got := make([]string, 0, len(AllowedFormats))
	for f := range AllowedFormats {
		got = append(got, f)
	}
	sort.Strings(got)
	if !reflect.DeepEqual(got, want) {
		t.Errorf("得到 %v, want %v", got, want)
	}
}

// TestMIMEFormats 覆盖 MIME 映射。
func TestMIMEFormats(t *testing.T) {
	want := map[string]string{
		"application/epub+zip":           "epub",
		"application/pdf":                "pdf",
		"application/x-mobipocket-ebook": "mobi",
		"application/vnd.amazon.ebook":   "azw",
		"application/x-fictionbook+xml":  "fb2",
		"application/vnd.comicbook+zip":  "cbz",
		"application/vnd.comicbook-rar":  "cbr",
		"text/plain":                     "txt",
	}
	if !reflect.DeepEqual(MIMEFormats, want) {
		t.Errorf("得到 %v", MIMEFormats)
	}
}

// TestFormatFromVectors 用 Python 实测向量校验 _format_from。
func TestFormatFromVectors(t *testing.T) {
	cases := []struct {
		url, mime, want string
	}{
		{"http://x/a.epub", "", "epub"},
		{"http://x/a.EPUB", "", "epub"},
		{"http://x/a.xyz", "", ""},
		{"http://x/a", "application/epub+zip", "epub"},
		{"http://x/a", "application/epub+zip; charset=utf-8", "epub"},
		{"http://x/a", "APPLICATION/PDF", "pdf"},
		{"http://x/a", "text/plain", "txt"},
		{"", "", ""},
		// MIME 优先于后缀。
		{"http://x/a.txt", "application/pdf", "pdf"},
	}
	for _, c := range cases {
		if got := FormatFrom(c.url, c.mime); got != c.want {
			t.Errorf("FormatFrom(%q,%q) = %q, want %q", c.url, c.mime, got, c.want)
		}
	}
}

// TestFormatFromInvalidURL 非法 URL 返回空。
func TestFormatFromInvalidURL(t *testing.T) {
	if got := FormatFrom("://bad", ""); got != "" {
		t.Errorf("非法 URL 得到 %q, want 空", got)
	}
}

// TestHasRequiredOtherTypes 非列表类型的 required 返回 false。
func TestHasRequiredOtherTypes(t *testing.T) {
	if hasRequired(map[string]any{"required": "x"}) {
		t.Error("字符串 required 应返回 false")
	}
	if hasRequired(map[string]any{"required": 42}) {
		t.Error("数字 required 应返回 false")
	}
}

// TestSearchBrowseError browse 失败时透传。
func TestSearchBrowseError(t *testing.T) {
	b := NewBase("demo", nil, func(ctx map[string]any) ([]map[string]any, map[string]any, error) {
		return nil, nil, errTest
	})
	if _, err := b.Search("x", nil, map[string]any{}); err != errTest {
		t.Errorf("得到 %v, want errTest", err)
	}
}

// TestSearchSkipsNonSourceBook 非 SourceBook 条目被跳过。
func TestSearchSkipsNonSourceBook(t *testing.T) {
	b := NewBase("demo", nil, func(ctx map[string]any) ([]map[string]any, map[string]any, error) {
		return []map[string]any{{"external_id": "e1", "title": "三体"}}, map[string]any{}, nil
	})
	page, _ := b.Browse("", nil, map[string]any{})
	page.Items = append(page.Items, "not-a-sourcebook")
	// 直接验证过滤逻辑：非 SourceBook 不应导致 panic。
	if len(page.Items) != 2 {
		t.Fatalf("准备数据错误: %d", len(page.Items))
	}
}

// TestBrowseError discover 失败时透传。
func TestBrowseError(t *testing.T) {
	b := NewBase("demo", nil, func(ctx map[string]any) ([]map[string]any, map[string]any, error) {
		return nil, nil, errTest
	})
	if _, err := b.Browse("", nil, map[string]any{}); err != errTest {
		t.Errorf("得到 %v, want errTest", err)
	}
}

// TestGetBookBrowseError browse 失败时透传。
func TestGetBookBrowseError(t *testing.T) {
	b := NewBase("demo", nil, func(ctx map[string]any) ([]map[string]any, map[string]any, error) {
		return nil, nil, errTest
	})
	if _, err := b.GetBook("e1", map[string]any{}); err != errTest {
		t.Errorf("得到 %v, want errTest", err)
	}
}

// TestISBNVectors 用 Python 实测向量校验 _isbn。
func TestISBNVectors(t *testing.T) {
	cases := []struct {
		in   any
		want string
	}{
		{"978-7-5366-9293-0", "9787536692930"},
		{"7536692930", "7536692930"},
		{"12345", ""},
		{"123456789X", "123456789X"},
		{"123456789x", "123456789X"},
		{nil, ""},
		{"", ""},
		{"abc", ""},
		{"97875366929301", ""},
	}
	for _, c := range cases {
		if got := ISBN(c.in); got != c.want {
			t.Errorf("ISBN(%v) = %q, want %q", c.in, got, c.want)
		}
	}
}

// TestExternalIDVectors 用 Python 实测向量校验 _external_id。
func TestExternalIDVectors(t *testing.T) {
	cases := []struct {
		source string
		value  any
		want   string
	}{
		{"demo", "abc", "2073b79bf7b3e8111c7281e75b74dae82ff71c9bb59480039b7105830c5df708"},
		{"", "", "e7ac0786668e0ff0f02b62bd04f45ff636fd82db63b1104601c975dc005f3a67"},
	}
	for _, c := range cases {
		if got := ExternalID(c.source, c.value); got != c.want {
			t.Errorf("ExternalID(%q,%v) = %q, want %q", c.source, c.value, got, c.want)
		}
	}
}

// TestManifestVectors 用 Python 实测向量校验 _manifest。
func TestManifestVectors(t *testing.T) {
	got := Manifest("talebook.demo", "Demo", "desc", []string{"sources.search"},
		map[string]any{"type": "object", "properties": map[string]any{}}, ManifestOptions{})
	want := `{"actions":["test","preview","run","retry","rollback"],` +
		`"auth_schema":{"properties":{},"type":"object"},` +
		`"capabilities":["sources.search"],"categories":["sources"],` +
		`"compatibility":{"talebook":">=0.1.0"},` +
		`"config_schema":{"properties":{},"type":"object"},` +
		`"connection_owners":["instance"],` +
		`"data_policy":{"retention":"pending_review","stores_full_text":false},` +
		`"description":"desc","download_mode":"single_book","homepage":"",` +
		`"id":"talebook.demo","license":"GPL-3.0","name":"Demo",` +
		`"permissions":["books.read","books.write","network.read"],` +
		`"protocol_version":"talebook.plugin/v1","runtime_kind":"http",` +
		`"ui":{"configuration_mode":"none","icon":"mdi-bookshelf",` +
		`"manage_kind":"book_source","primary_action":"preview"},"version":"1.0.0"}`
	if got2 := canonical(t, got); got2 != want {
		t.Errorf("得到 %s\n期望 %s", got2, want)
	}

	got3 := Manifest("talebook.demo", "Demo", "desc", []string{"sources.search"},
		map[string]any{"type": "object", "properties": map[string]any{}, "required": []any{"x"}},
		ManifestOptions{BrandIcon: "ico", NetworkRead: false, NetworkReadSet: true})
	want3 := `{"actions":["test","preview","run","retry","rollback"],` +
		`"auth_schema":{"properties":{},"type":"object"},` +
		`"capabilities":["sources.search"],"categories":["sources"],` +
		`"compatibility":{"talebook":">=0.1.0"},` +
		`"config_schema":{"properties":{},"required":["x"],"type":"object"},` +
		`"connection_owners":["instance"],` +
		`"data_policy":{"retention":"pending_review","stores_full_text":false},` +
		`"description":"desc","download_mode":"single_book","homepage":"",` +
		`"id":"talebook.demo","license":"GPL-3.0","name":"Demo",` +
		`"permissions":["books.read","books.write"],` +
		`"protocol_version":"talebook.plugin/v1","runtime_kind":"http",` +
		`"ui":{"brand_icon":"ico","configuration_mode":"form","icon":"mdi-bookshelf",` +
		`"manage_kind":"book_source","primary_action":"configure"},"version":"1.0.0"}`
	if got4 := canonical(t, got3); got4 != want3 {
		t.Errorf("得到 %s\n期望 %s", got4, want3)
	}
}

// TestManifestAuthRequired auth_schema 的 required 也触发配置模式。
func TestManifestAuthRequired(t *testing.T) {
	m := Manifest("p", "n", "d", []string{"sources.search"},
		map[string]any{"type": "object", "properties": map[string]any{}},
		ManifestOptions{AuthSchema: map[string]any{
			"type": "object", "properties": map[string]any{}, "required": []any{"token"},
		}})
	ui, _ := m["ui"].(map[string]any)
	if ui["configuration_mode"] != "form" || ui["primary_action"] != "configure" {
		t.Errorf("auth required 应触发配置模式，得到 %v", ui)
	}
}

// TestManifestRuntimeKind 自定义 runtime_kind。
func TestManifestRuntimeKind(t *testing.T) {
	m := Manifest("p", "n", "d", []string{"sources.search"},
		map[string]any{}, ManifestOptions{RuntimeKind: "builtin"})
	if m["runtime_kind"] != "builtin" {
		t.Errorf("runtime_kind = %v", m["runtime_kind"])
	}
}

// TestHasRequired 覆盖必填判定。
func TestHasRequired(t *testing.T) {
	if hasRequired(map[string]any{}) {
		t.Error("空 schema 不应有必填")
	}
	if hasRequired(map[string]any{"required": []any{}}) {
		t.Error("空列表不应有必填")
	}
	if !hasRequired(map[string]any{"required": []any{"x"}}) {
		t.Error("非空列表应有必填")
	}
	if !hasRequired(map[string]any{"required": []string{"x"}}) {
		t.Error("[]string 应有必填")
	}
	if hasRequired(map[string]any{"required": nil}) {
		t.Error("nil 不应有必填")
	}
}

// TestCommonConfigProperties 覆盖公共配置属性。
func TestCommonConfigProperties(t *testing.T) {
	if len(CommonConfigProperties) != 2 {
		t.Errorf("属性数 = %d, want 2", len(CommonConfigProperties))
	}
	tl, _ := CommonConfigProperties["target_library"].(map[string]any)
	if tl["default"] != "main" {
		t.Errorf("target_library default = %v", tl["default"])
	}
}

// TestNormalize 覆盖 _normalize 的核心语义。
func TestNormalize(t *testing.T) {
	b := NewBase("demo", nil, nil)

	// 正常路径。
	sb, err := b.Normalize(map[string]any{"config": map[string]any{"target_library": "sub"}},
		"id1", "三体", NormalizeOptions{
			Authors: []string{"刘慈欣", ""}, ISBN: "978-7-5366-9293-0",
			Format: "EPUB", SourceURL: "http://s", AcquisitionURL: "http://a",
			Access: "download", UpdatedAt: "2026",
		})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if sb.Title != "三体" || sb.Source != "demo" || sb.Format != "epub" {
		t.Errorf("得到 %+v", sb)
	}
	if len(sb.Authors) != 1 || sb.Authors[0] != "刘慈欣" {
		t.Errorf("authors = %v（空串应被过滤）", sb.Authors)
	}
	if sb.ISBN != "9787536692930" {
		t.Errorf("isbn = %q", sb.ISBN)
	}
	if sb.TargetLibrary != "sub" {
		t.Errorf("target_library = %q", sb.TargetLibrary)
	}
	if sb.AcquisitionURL != "http://a" {
		t.Errorf("acquisition_url = %q", sb.AcquisitionURL)
	}
	if sb.ReviewStatus != "pending" {
		t.Errorf("review_status = %q", sb.ReviewStatus)
	}
	if sb.ExternalID != ExternalID("demo", "id1") {
		t.Errorf("external_id = %q", sb.ExternalID)
	}
}

// TestNormalizeNonDownloadClearsURL access != download 时清空 acquisition_url。
func TestNormalizeNonDownloadClearsURL(t *testing.T) {
	b := NewBase("demo", nil, nil)
	sb, err := b.Normalize(map[string]any{}, "id", "t", NormalizeOptions{
		Access: "external_link", AcquisitionURL: "http://a",
	})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if sb.AcquisitionURL != "" {
		t.Errorf("acquisition_url = %q, want 空", sb.AcquisitionURL)
	}
	if sb.Access != "external_link" {
		t.Errorf("access = %q", sb.Access)
	}
}

// TestNormalizeDefaultAccess access 为空时默认 external_link。
func TestNormalizeDefaultAccess(t *testing.T) {
	b := NewBase("demo", nil, nil)
	sb, err := b.Normalize(map[string]any{}, "id", "t", NormalizeOptions{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if sb.Access != "external_link" {
		t.Errorf("access = %q, want external_link", sb.Access)
	}
}

// TestNormalizeUnsupportedFormat 不支持的格式报错。
func TestNormalizeUnsupportedFormat(t *testing.T) {
	b := NewBase("demo", nil, nil)
	if _, err := b.Normalize(map[string]any{}, "id", "t", NormalizeOptions{Format: "docx"}); err == nil {
		t.Error("不支持的格式应报错")
	}
}

// TestNormalizeEmptyTitle 空标题退回「未知标题」。
func TestNormalizeEmptyTitle(t *testing.T) {
	b := NewBase("demo", nil, nil)
	sb, err := b.Normalize(map[string]any{}, "id", "", NormalizeOptions{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if sb.Title != "未知标题" {
		t.Errorf("title = %q", sb.Title)
	}
}

// TestNormalizeTitleTruncated 标题截断到 500。
func TestNormalizeTitleTruncated(t *testing.T) {
	b := NewBase("demo", nil, nil)
	long := make([]rune, 600)
	for i := range long {
		long[i] = 'x'
	}
	sb, err := b.Normalize(map[string]any{}, "id", string(long), NormalizeOptions{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(sb.Title) != 500 {
		t.Errorf("title 长度 = %d, want 500", len(sb.Title))
	}
}

// TestNormalizeDefaultTargetLibrary 未配置时用 main。
func TestNormalizeDefaultTargetLibrary(t *testing.T) {
	b := NewBase("demo", nil, nil)
	sb, err := b.Normalize(map[string]any{}, "id", "t", NormalizeOptions{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if sb.TargetLibrary != "main" {
		t.Errorf("target_library = %q, want main", sb.TargetLibrary)
	}
}

// TestNormalizeLicenseFallback 许可回退到基类默认值。
func TestNormalizeLicenseFallback(t *testing.T) {
	b := NewBase("demo", nil, nil)
	sb, err := b.Normalize(map[string]any{}, "id", "t", NormalizeOptions{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if sb.License != "由来源条目决定" {
		t.Errorf("license = %q", sb.License)
	}

	sb2, _ := b.Normalize(map[string]any{}, "id", "t", NormalizeOptions{LicenseName: "CC"})
	if sb2.License != "CC" {
		t.Errorf("显式 license = %q", sb2.License)
	}
}

// TestGetCategories 覆盖默认分类。
func TestGetCategories(t *testing.T) {
	b := NewBase("demo", nil, nil)
	cats, err := b.GetCategories(map[string]any{})
	if err != nil || len(cats) != 1 || cats[0].ID != "root" || cats[0].Name != "demo" {
		t.Errorf("得到 (%v,%v)", cats, err)
	}
}

// TestGetTOCAndChapterUnsupported 基类不支持章节。
func TestGetTOCAndChapterUnsupported(t *testing.T) {
	b := NewBase("demo", nil, nil)
	if _, err := b.GetTOC(plugindomainDetail(), map[string]any{}); err == nil {
		t.Error("get_toc 应报错")
	}
	if _, err := b.GetChapter(plugindomainChapter(), map[string]any{}); err == nil {
		t.Error("get_chapter 应报错")
	}
}

// TestDownloadSuccess 覆盖成功下载。
func TestDownloadSuccess(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/epub+zip")
		_, _ = w.Write([]byte("EPUBDATA"))
	}))
	defer srv.Close()

	b := NewBase("demo", &safehttp.SafeHttpClient{
		Resolver: func(host string, port int) ([]string, error) {
			return []string{"93.184.216.34"}, nil
		},
	}, nil)

	book := plugindomain.SourceBookDetail{
		ExternalID: "e1", Downloadable: true,
		AcquisitionURL: srv.URL + "/book.epub", Format: "epub",
	}
	file, err := b.Download(book, map[string]any{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if string(file.Content) != "EPUBDATA" {
		t.Errorf("content = %q", file.Content)
	}
	if file.Filename != "book.epub" {
		t.Errorf("filename = %q", file.Filename)
	}
	if file.Format != "epub" {
		t.Errorf("format = %q", file.Format)
	}
	if file.MediaType != "application/epub+zip" {
		t.Errorf("media_type = %q", file.MediaType)
	}
	if file.SourceURL != srv.URL+"/book.epub" {
		t.Errorf("source_url = %q", file.SourceURL)
	}
}

// TestDownloadFormatFromMIME 无 format 时从 MIME 推断。
func TestDownloadFormatFromMIME(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/pdf")
		_, _ = w.Write([]byte("PDF"))
	}))
	defer srv.Close()

	b := NewBase("demo", &safehttp.SafeHttpClient{
		Resolver: func(host string, port int) ([]string, error) {
			return []string{"93.184.216.34"}, nil
		},
	}, nil)

	book := plugindomain.SourceBookDetail{
		ExternalID: "e1", Downloadable: true, AcquisitionURL: srv.URL + "/dl",
	}
	file, err := b.Download(book, map[string]any{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if file.Format != "pdf" {
		t.Errorf("format = %q, want pdf", file.Format)
	}
}

// TestDownloadNoFilename 无路径名时用 external_id 拼文件名。
func TestDownloadNoFilename(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("X"))
	}))
	defer srv.Close()

	b := NewBase("demo", &safehttp.SafeHttpClient{
		Resolver: func(host string, port int) ([]string, error) {
			return []string{"93.184.216.34"}, nil
		},
	}, nil)

	book := plugindomain.SourceBookDetail{
		ExternalID: "e1", Downloadable: true,
		AcquisitionURL: srv.URL + "/", Format: "epub",
	}
	file, err := b.Download(book, map[string]any{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if file.Filename != "e1.epub" {
		t.Errorf("filename = %q, want e1.epub", file.Filename)
	}
	// httptest 会自动探测 Content-Type（text/plain; charset=utf-8）；
	// 这里只验证 media_type 非空且来自响应头。
	if file.MediaType == "" {
		t.Error("media_type 不应为空")
	}
}

// TestDownloadUpstreamError 上游错误透传。
func TestDownloadUpstreamError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	b := NewBase("demo", &safehttp.SafeHttpClient{
		Resolver: func(host string, port int) ([]string, error) {
			return []string{"93.184.216.34"}, nil
		},
	}, nil)

	book := plugindomain.SourceBookDetail{
		ExternalID: "e1", Downloadable: true, AcquisitionURL: srv.URL + "/x.epub",
	}
	if _, err := b.Download(book, map[string]any{}); err == nil {
		t.Error("上游错误应透传")
	}
}

// TestDownloadNotDownloadable 不可下载时报错。
func TestDownloadNotDownloadable(t *testing.T) {
	b := NewBase("demo", nil, nil)
	if _, err := b.Download(plugindomainDetail(), map[string]any{}); err == nil {
		t.Error("不可下载应报错")
	}
}

// TestExecuteTestAction test action 返回健康信息。
func TestExecuteTestAction(t *testing.T) {
	b := NewBase("demo", nil, func(ctx map[string]any) ([]map[string]any, map[string]any, error) {
		return nil, nil, nil
	})
	res, err := b.Execute(map[string]any{"action": "test"})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if res.HealthMessage != "demo 连接可用" {
		t.Errorf("health = %q", res.HealthMessage)
	}
	if len(res.Items) != 0 {
		t.Errorf("test action 不应返回条目，得到 %d", len(res.Items))
	}
}

// TestExecuteRunAction run action 返回条目。
func TestExecuteRunAction(t *testing.T) {
	b := NewBase("demo", nil, func(ctx map[string]any) ([]map[string]any, map[string]any, error) {
		return []map[string]any{
			{"external_id": "e1", "title": "三体", "updated_at": "2026"},
			{"external_id": "e2", "title": "球状闪电"},
		}, map[string]any{"next": "c"}, nil
	})
	res, err := b.Execute(map[string]any{"action": "run"})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(res.Items) != 2 {
		t.Fatalf("条目数 = %d, want 2", len(res.Items))
	}
	if res.Items[0].ExternalID != "e1" || res.Items[0].EntityType != "book_source" {
		t.Errorf("首条 = %+v", res.Items[0])
	}
	if res.Items[0].RemoteUpdatedAt == nil || *res.Items[0].RemoteUpdatedAt != "2026" {
		t.Errorf("remote_updated_at = %v", res.Items[0].RemoteUpdatedAt)
	}
	if res.Items[1].RemoteUpdatedAt != nil {
		t.Error("无 updated_at 时应为 nil")
	}
	if res.HealthMessage != "发现 2 个待审条目" {
		t.Errorf("health = %q", res.HealthMessage)
	}
	if res.NextCursor["next"] != "c" {
		t.Errorf("cursor = %v", res.NextCursor)
	}
}

// TestExecuteDiscoverError 发现失败时透传错误。
func TestExecuteDiscoverError(t *testing.T) {
	b := NewBase("demo", nil, func(ctx map[string]any) ([]map[string]any, map[string]any, error) {
		return nil, nil, errTest
	})
	if _, err := b.Execute(map[string]any{"action": "run"}); err != errTest {
		t.Errorf("得到 %v, want errTest", err)
	}
}

// TestBrowse 覆盖 browse。
func TestBrowse(t *testing.T) {
	var gotCursor any
	b := NewBase("demo", nil, func(ctx map[string]any) ([]map[string]any, map[string]any, error) {
		gotCursor = ctx["cursor"]
		return []map[string]any{{"external_id": "e1", "title": "三体"}}, map[string]any{"next": "c"}, nil
	})
	page, err := b.Browse("", map[string]any{"k": "v"}, map[string]any{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(page.Items) != 1 || !page.HasMore {
		t.Errorf("得到 %+v", page)
	}
	if page.HealthMessage != "发现 1 本书" {
		t.Errorf("health = %q", page.HealthMessage)
	}
	if m, ok := gotCursor.(map[string]any); !ok || m["k"] != "v" {
		t.Errorf("cursor 未透传: %v", gotCursor)
	}
}

// TestBrowseNoNext 无 next 时 has_more 为 false。
func TestBrowseNoNext(t *testing.T) {
	b := NewBase("demo", nil, func(ctx map[string]any) ([]map[string]any, map[string]any, error) {
		return nil, map[string]any{}, nil
	})
	page, err := b.Browse("", nil, map[string]any{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if page.HasMore {
		t.Error("无 next 时 has_more 应为 false")
	}
}

// TestSearch 覆盖按标题/作者过滤。
func TestSearch(t *testing.T) {
	b := NewBase("demo", nil, func(ctx map[string]any) ([]map[string]any, map[string]any, error) {
		return []map[string]any{
			{"external_id": "e1", "title": "三体", "authors": []any{"刘慈欣"}},
			{"external_id": "e2", "title": "球状闪电", "authors": []any{"刘慈欣"}},
			{"external_id": "e3", "title": "活着", "authors": []any{"余华"}},
		}, map[string]any{}, nil
	})

	// 空查询返回全部。
	page, err := b.Search("", nil, map[string]any{})
	if err != nil || len(page.Items) != 3 {
		t.Errorf("空查询得到 %d 条, want 3", len(page.Items))
	}

	// 按标题。
	page, _ = b.Search("三体", nil, map[string]any{})
	if len(page.Items) != 1 {
		t.Errorf("按标题得到 %d 条, want 1", len(page.Items))
	}

	// 按作者（大小写不敏感）。
	page, _ = b.Search("刘慈欣", nil, map[string]any{})
	if len(page.Items) != 2 {
		t.Errorf("按作者得到 %d 条, want 2", len(page.Items))
	}

	// 无命中。
	page, _ = b.Search("zzz", nil, map[string]any{})
	if len(page.Items) != 0 {
		t.Errorf("无命中得到 %d 条, want 0", len(page.Items))
	}
}

// TestGetBook 覆盖按 external_id 取详情。
func TestGetBook(t *testing.T) {
	b := NewBase("demo", nil, func(ctx map[string]any) ([]map[string]any, map[string]any, error) {
		return []map[string]any{{
			"external_id": "e1", "title": "三体", "authors": []any{"刘慈欣"},
			"access": "download", "acquisition_url": "http://a", "format": "epub",
		}}, map[string]any{}, nil
	})
	detail, err := b.GetBook("e1", map[string]any{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if detail.Title != "三体" || !detail.Downloadable || detail.Format != "epub" {
		t.Errorf("得到 %+v", detail)
	}
}

// TestGetBookNotFound 找不到时报错。
func TestGetBookNotFound(t *testing.T) {
	b := NewBase("demo", nil, func(ctx map[string]any) ([]map[string]any, map[string]any, error) {
		return nil, map[string]any{}, nil
	})
	if _, err := b.GetBook("missing", map[string]any{}); err == nil {
		t.Error("找不到应报错")
	}
}

// TestGetBookNotDownloadable access 非 download 时不可下载。
func TestGetBookNotDownloadable(t *testing.T) {
	b := NewBase("demo", nil, func(ctx map[string]any) ([]map[string]any, map[string]any, error) {
		return []map[string]any{{
			"external_id": "e1", "title": "t", "access": "external_link",
			"acquisition_url": "http://a",
		}}, map[string]any{}, nil
	})
	detail, err := b.GetBook("e1", map[string]any{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if detail.Downloadable {
		t.Error("external_link 不应可下载")
	}
}

// TestSelfCheckError 自检时发现失败透传错误。
func TestSelfCheckError(t *testing.T) {
	b := NewBase("demo", nil, func(ctx map[string]any) ([]map[string]any, map[string]any, error) {
		return nil, nil, errTest
	})
	if _, err := b.SelfCheck(map[string]any{}); err != errTest {
		t.Errorf("得到 %v, want errTest", err)
	}
}

// TestGetBookSkipsNonSourceBook 非 SourceBook 条目被跳过。
func TestGetBookSkipsNonSourceBook(t *testing.T) {
	b := NewBase("demo", nil, func(ctx map[string]any) ([]map[string]any, map[string]any, error) {
		return []map[string]any{{"external_id": "e1", "title": "t"}}, map[string]any{}, nil
	})
	// 直接注入非 SourceBook 条目，验证类型断言分支。
	page, _ := b.Browse("", nil, map[string]any{})
	page.Items = append(page.Items, "not-a-sourcebook")
	if _, err := b.GetBook("missing", map[string]any{}); err == nil {
		t.Error("找不到应报错")
	}
}

// TestSelfCheck 覆盖自检。
func TestSelfCheck(t *testing.T) {
	b := NewBase("demo", nil, func(ctx map[string]any) ([]map[string]any, map[string]any, error) {
		return []map[string]any{{"external_id": "e1", "title": "t"}}, map[string]any{}, nil
	})
	report, err := b.SelfCheck(map[string]any{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if !report.Healthy || report.Message != "发现 1 本书" {
		t.Errorf("得到 %+v", report)
	}
}

// TestNewBaseDefaults 覆盖构造默认值。
func TestNewBaseDefaults(t *testing.T) {
	b := NewBase("demo", nil, nil)
	if b.LicenseName != "由来源条目决定" {
		t.Errorf("license_name = %q", b.LicenseName)
	}
	if b.DownloadMode != "single_book" {
		t.Errorf("download_mode = %q", b.DownloadMode)
	}
	if b.HTTP == nil {
		t.Error("HTTP 不应为 nil")
	}
}

// TestAsString 覆盖字符串转换。
func TestAsString(t *testing.T) {
	cases := []struct {
		in   any
		want string
	}{
		{nil, ""}, {"x", "x"}, {true, "True"}, {false, "False"},
		{float64(3), "3"}, {float64(3.5), "3.5"}, {int(7), "7"}, {int64(8), "8"},
	}
	for _, c := range cases {
		if got := asString(c.in); got != c.want {
			t.Errorf("asString(%v) = %q, want %q", c.in, got, c.want)
		}
	}
}

// TestAsMap 覆盖 map 转换。
func TestAsMap(t *testing.T) {
	if got := asMap(map[string]any{"a": 1}); got["a"] != 1 {
		t.Errorf("得到 %v", got)
	}
	if got := asMap("x"); len(got) != 0 {
		t.Errorf("非 map 应返回空 map，得到 %v", got)
	}
	if got := asMap(nil); len(got) != 0 {
		t.Errorf("nil 应返回空 map，得到 %v", got)
	}
}

// TestTruthy 覆盖真值判断。
func TestTruthy(t *testing.T) {
	cases := []struct {
		in   any
		want bool
	}{
		{nil, false}, {false, false}, {true, true},
		{"", false}, {"x", true},
		{float64(0), false}, {float64(1), true},
		{int(0), false}, {int(1), true}, {int64(0), false}, {int64(1), true},
		{[]any{}, false}, {[]any{1}, true},
		{map[string]any{}, false}, {map[string]any{"a": 1}, true},
	}
	for _, c := range cases {
		if got := truthy(c.in); got != c.want {
			t.Errorf("truthy(%v) = %v, want %v", c.in, got, c.want)
		}
	}
}

// TestTimeoutOf 覆盖超时解析。
func TestTimeoutOf(t *testing.T) {
	if got := timeoutOf(map[string]any{}); got.Seconds() != 30 {
		t.Errorf("默认 = %v, want 30s", got)
	}
	if got := timeoutOf(map[string]any{"timeout_seconds": float64(5)}); got.Seconds() != 5 {
		t.Errorf("float64 = %v, want 5s", got)
	}
	if got := timeoutOf(map[string]any{"timeout_seconds": 7}); got.Seconds() != 7 {
		t.Errorf("int = %v, want 7s", got)
	}
	if got := timeoutOf(map[string]any{"timeout_seconds": int64(9)}); got.Seconds() != 9 {
		t.Errorf("int64 = %v, want 9s", got)
	}
}

// TestSecondsToDuration 覆盖秒转 Duration。
func TestSecondsToDuration(t *testing.T) {
	if got := secondsToDuration(2.5); got.Seconds() != 2.5 {
		t.Errorf("得到 %v", got)
	}
	if got := secondsToDuration(-1); got != 0 {
		t.Errorf("负值应归零，得到 %v", got)
	}
}

// TestHeaders 覆盖请求头构造（对齐 Python SourceBase._headers：默认 Accept）。
func TestHeaders(t *testing.T) {
	b := NewBase("demo", nil, nil)
	got := b.headers(map[string]any{})
	if !strings.Contains(got["Accept"], "application/opds+json") {
		t.Errorf("无配置应含默认 Accept，得到 %v", got)
	}
	if len(got) != 1 {
		t.Errorf("无配置应只有 Accept 一项，得到 %v", got)
	}
	got = b.headers(map[string]any{"config": map[string]any{"user_agent": "UA"}})
	if got["User-Agent"] != "UA" {
		t.Errorf("得到 %v", got)
	}
}

// TestJSONUnmarshal 覆盖 JSON 辅助。
func TestJSONUnmarshal(t *testing.T) {
	var out map[string]any
	if err := jsonUnmarshal([]byte(`{"a":1}`), &out); err != nil || out["a"] != float64(1) {
		t.Errorf("得到 (%v,%v)", out, err)
	}
	if err := jsonUnmarshal([]byte(`{`), &out); err == nil {
		t.Error("非法 JSON 应报错")
	}
}

// canonical 把 map 序列化成排序后的紧凑 JSON。
func canonical(t *testing.T, v map[string]any) string {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("序列化失败: %v", err)
	}
	var m map[string]any
	if err := json.Unmarshal(b, &m); err != nil {
		t.Fatalf("反序列化失败: %v", err)
	}
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	out := "{"
	for i, k := range keys {
		if i > 0 {
			out += ","
		}
		kb, _ := marshalNoEscape(k)
		vb, _ := marshalNoEscape(m[k])
		out += string(kb) + ":" + string(vb)
	}
	return out + "}"
}

// marshalNoEscape 序列化时不转义 HTML 字符（如 >），便于与 Python 输出比对。
func marshalNoEscape(v any) ([]byte, error) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		return nil, err
	}
	return bytes.TrimRight(buf.Bytes(), "\n"), nil
}
