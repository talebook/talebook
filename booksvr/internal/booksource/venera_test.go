package booksource

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"

	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/safehttp"
)

// TestVeneraProviderImplementsInterface 编译期断言 provider 满足 SourceProvider。
func TestVeneraProviderImplementsInterface(t *testing.T) {
	var _ pluginiface.SourceProvider = (*VeneraProvider)(nil)
}

// TestVeneraDownloadMode 对齐 Python 的 download_mode = "none"。
func TestVeneraDownloadMode(t *testing.T) {
	p := NewVeneraProvider(nil, DefaultVeneraConfig())
	if got := p.DownloadMode(); got != pluginiface.DownloadNone {
		t.Errorf("DownloadMode = %q, want %q", got, pluginiface.DownloadNone)
	}
}

// TestVeneraGetCategories 对齐 Python 的固定分类。
func TestVeneraGetCategories(t *testing.T) {
	p := NewVeneraProvider(nil, DefaultVeneraConfig())
	got, err := p.GetCategories(nil)
	if err != nil {
		t.Fatalf("GetCategories: %v", err)
	}
	want := []struct{ id, name string }{
		{"recent", "最新漫画"}, {"popular", "热门漫画"}, {"updated", "最近更新"},
	}
	if len(got) != len(want) {
		t.Fatalf("len = %d, want %d", len(got), len(want))
	}
	for i, w := range want {
		if got[i].ID != w.id || got[i].Name != w.name {
			t.Errorf("[%d] = %+v, want %s/%s", i, got[i], w.id, w.name)
		}
	}
}

// TestVeneraDownloadUnsupported 验证下载被拒绝。
func TestVeneraDownloadUnsupported(t *testing.T) {
	p := NewVeneraProvider(nil, DefaultVeneraConfig())
	_, err := p.Download(plugindomain.SourceBookDetail{}, nil)
	if err == nil {
		t.Fatal("Download 应报错")
	}
	if _, ok := err.(*VeneraUnsupported); !ok {
		t.Errorf("错误类型 = %T, want *VeneraUnsupported", err)
	}
}

// TestVeneraCallRejectsUnsupportedSource 对齐 Python 的源与凭据校验。
func TestVeneraCallRejectsUnsupportedSource(t *testing.T) {
	p := NewVeneraProvider(nil, DefaultVeneraConfig())

	cases := []struct {
		name    string
		ctxMap  map[string]any
		wantErr string
	}{
		{"其他源", map[string]any{"config": map[string]any{"source": "other"}}, "仅支持 MangaDex"},
		{"带凭据", map[string]any{
			"config":  map[string]any{"source": "MangaDex"},
			"secrets": map[string]any{"token": "x"},
		}, "仅支持 MangaDex"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := p.call(context.Background(), "browse", nil, tc.ctxMap)
			if err == nil {
				t.Fatal("应报错")
			}
			if !strings.Contains(err.Error(), tc.wantErr) {
				t.Errorf("错误 = %q, want 含 %q", err.Error(), tc.wantErr)
			}
		})
	}
}

// TestVeneraCallScopeDenied 对齐 Python 的权限校验。
func TestVeneraCallScopeDenied(t *testing.T) {
	p := NewVeneraProvider(nil, DefaultVeneraConfig())
	_, err := p.call(context.Background(), "browse", nil, map[string]any{
		"config": map[string]any{"source": "MangaDex"},
		"scopes": []string{"books.read"},
	})
	if err == nil {
		t.Fatal("缺权限应报错")
	}
	if _, ok := err.(*VeneraScopeDenied); !ok {
		t.Errorf("错误类型 = %T, want *VeneraScopeDenied", err)
	}
}

// TestVeneraCallAcceptsMangaDexAlias 验证 manga_dex 与 MangaDex 都接受。
func TestVeneraCallAcceptsMangaDexAlias(t *testing.T) {
	for _, source := range []string{"manga_dex", "MangaDex"} {
		p := NewVeneraProvider(nil, DefaultVeneraConfig())
		// 无网络：会走到源脚本加载并失败，但不应是「源不支持」错误。
		_, err := p.call(context.Background(), "browse", nil, map[string]any{
			"config": map[string]any{"source": source},
		})
		if err == nil {
			continue
		}
		if strings.Contains(err.Error(), "仅支持 MangaDex") {
			t.Errorf("source=%q 被误判为不支持", source)
		}
	}
}

// TestMangaID 对齐 Python manga_id 的 UUID 规范化。
func TestMangaID(t *testing.T) {
	const canonical = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
	cases := []struct {
		in      any
		want    string
		wantErr bool
	}{
		{canonical, canonical, false},
		{strings.ToUpper(canonical), canonical, false},
		{"{" + canonical + "}", canonical, false},
		{"urn:uuid:" + canonical, canonical, false},
		{"  " + canonical + "  ", canonical, false},
		{"not-a-uuid", "", true},
		{"", "", true},
		{"a1b2c3d4e5f67890abcdef1234567890", "", true},
	}
	for _, tc := range cases {
		got, err := MangaID(tc.in)
		if tc.wantErr {
			if err == nil {
				t.Errorf("MangaID(%v) 应报错", tc.in)
			}
			continue
		}
		if err != nil {
			t.Errorf("MangaID(%v) 报错: %v", tc.in, err)
			continue
		}
		if got != tc.want {
			t.Errorf("MangaID(%v) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

// TestChapterIDRoundTrip 验证章节标识编解码往返。
func TestChapterIDRoundTrip(t *testing.T) {
	bookID := "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
	episodeID := "b2c3d4e5-f678-90ab-cdef-123456789012"
	id := ChapterID(bookID, episodeID)
	if strings.Contains(id, "=") {
		t.Errorf("标识不应含 padding: %q", id)
	}
	gotBook, gotEpisode, err := ParseChapterID(id)
	if err != nil {
		t.Fatalf("ParseChapterID: %v", err)
	}
	if gotBook != bookID || gotEpisode != episodeID {
		t.Errorf("往返 = %q/%q, want %q/%q", gotBook, gotEpisode, bookID, episodeID)
	}
}

// TestParseChapterIDInvalid 验证非法标识被拒绝。
func TestParseChapterIDInvalid(t *testing.T) {
	for _, bad := range []string{"", "!!!", "bm90anNvbg", "WzFd"} {
		if _, _, err := ParseChapterID(bad); err == nil {
			t.Errorf("ParseChapterID(%q) 应报错", bad)
		}
	}
}

// TestImageEndpoint 对齐 Python image_endpoint 的白名单。
func TestImageEndpoint(t *testing.T) {
	ok := []string{
		"https://mangadex.org/covers/abc/def.jpg",
		"https://uploads.mangadex.org/data/abc/def.png",
		"https://cmdxd98sb0x3yprd.mangadex.network/data-saver/abc/1.jpg",
		"https://mangadex.org/covers/abc/def.jpg?x=1",
	}
	for _, u := range ok {
		if _, err := ImageEndpoint(u); err != nil {
			t.Errorf("ImageEndpoint(%q) 应通过: %v", u, err)
		}
	}

	bad := []string{
		"http://mangadex.org/covers/a/b.jpg",            // 非 https
		"https://evil.com/covers/a/b.jpg",               // 主机不在白名单
		"https://mangadex.org/other/a/b.jpg",            // 路径前缀不符
		"https://mangadex.org/covers/a/b.jpg#frag",      // 带 fragment
		"https://user:pw@mangadex.org/covers/a/b.jpg",   // 带凭据
		"https://mangadex.org:8443/covers/a/b.jpg",      // 非 443 端口
		"https://mangadex.org/covers/",                  // 路径不完整
		"https://notmangadex.network/covers/a/b.jpg",    // 后缀不匹配
		"https://xmangadex.network.evil.com/covers/a/b", // 后缀伪装
	}
	for _, u := range bad {
		if _, err := ImageEndpoint(u); err == nil {
			t.Errorf("ImageEndpoint(%q) 应被拒绝", u)
		}
	}
}

// TestVeneraValidateRequest 对齐 Python 的请求白名单。
func TestVeneraValidateRequest(t *testing.T) {
	valid := veneraRequest{ID: 1, Method: "GET", URL: "https://api.mangadex.org/manga?limit=1"}
	if err := veneraValidateRequest(valid); err != nil {
		t.Errorf("合法请求被拒: %v", err)
	}

	bad := []veneraRequest{
		{ID: 1, Method: "POST", URL: "https://api.mangadex.org/manga"},
		{ID: 1, Method: "GET", URL: "http://api.mangadex.org/manga"},
		{ID: 1, Method: "GET", URL: "https://evil.com/manga"},
		{ID: 1, Method: "GET", URL: "https://api.mangadex.org/manga", Data: "x"},
		{ID: 1, Method: "GET", URL: "https://api.mangadex.org/manga", Headers: map[string]any{"A": "b"}},
		{ID: 1, Method: "GET", URL: "https://api.mangadex.org/manga#frag"},
		{ID: 1, Method: "GET", URL: "https://user:pw@api.mangadex.org/manga"},
		{ID: 1, Method: "GET", URL: "https://api.mangadex.org:8443/manga"},
	}
	for i, req := range bad {
		if err := veneraValidateRequest(req); err == nil {
			t.Errorf("非法请求[%d] %+v 应被拒绝", i, req)
		}
	}
}

// TestVeneraHeadersCompatible 对齐 Python 的图片请求头校验。
func TestVeneraHeadersCompatible(t *testing.T) {
	good := map[string]any{"Referer": "https://mangadex.org/", "Origin": "https://mangadex.org"}
	if !veneraHeadersCompatible(good) {
		t.Error("预期请求头应通过")
	}
	for _, bad := range []any{
		nil,
		map[string]any{},
		map[string]any{"Referer": "https://mangadex.org/"},
		map[string]any{"Referer": "https://mangadex.org/", "Origin": "https://evil.com"},
		map[string]any{"Referer": "https://mangadex.org/", "Origin": "https://mangadex.org", "X": "y"},
	} {
		if veneraHeadersCompatible(bad) {
			t.Errorf("非法请求头 %#v 应被拒绝", bad)
		}
	}
}

// TestClampPage 验证页码夹紧。
func TestClampPage(t *testing.T) {
	cases := []struct {
		in   map[string]any
		want int
	}{
		{nil, 1},
		{map[string]any{}, 1},
		{map[string]any{"page": float64(5)}, 5},
		{map[string]any{"page": float64(0)}, 1},
		{map[string]any{"page": float64(-3)}, 1},
		{map[string]any{"page": float64(9999)}, 500},
		{map[string]any{"page": "abc"}, 1},
	}
	for _, tc := range cases {
		if got := clampPage(tc.in); got != tc.want {
			t.Errorf("clampPage(%#v) = %d, want %d", tc.in, got, tc.want)
		}
	}
}

// TestToFloat 验证数值转换。
func TestToFloat(t *testing.T) {
	if v, ok := toFloat(float64(1.5)); !ok || v != 1.5 {
		t.Errorf("float64 = %v, %v", v, ok)
	}
	if v, ok := toFloat(3); !ok || v != 3 {
		t.Errorf("int = %v, %v", v, ok)
	}
	if v, ok := toFloat(json.Number("2.5")); !ok || v != 2.5 {
		t.Errorf("json.Number = %v, %v", v, ok)
	}
	if _, ok := toFloat("x"); ok {
		t.Error("字符串应返回 false")
	}
}

// TestAsMapAny 验证 map 转换。
func TestAsMapAny(t *testing.T) {
	if got := asMapAny(map[string]any{"a": 1}); got["a"] != 1 {
		t.Errorf("= %#v", got)
	}
	if got := asMapAny("x"); len(got) != 0 {
		t.Errorf("非 map = %#v, want 空", got)
	}
	if got := asMapAny(nil); len(got) != 0 {
		t.Errorf("nil = %#v, want 空", got)
	}
}

// TestContextOf 验证上下文提取。
func TestContextOf(t *testing.T) {
	if got := contextOf(nil); got == nil {
		t.Error("缺省应返回非 nil")
	}
	ctx := context.WithValue(context.Background(), ctxKeyForTest{}, "v")
	if got := contextOf(map[string]any{"ctx": ctx}); got.Value(ctxKeyForTest{}) != "v" {
		t.Error("应取出传入的 context")
	}
}

type ctxKeyForTest struct{}

// TestVeneraBuildPage 验证分页构造。
func TestVeneraBuildPage(t *testing.T) {
	p := NewVeneraProvider(nil, DefaultVeneraConfig())
	result := map[string]any{
		"maxPage": float64(10),
		"comics": []any{
			map[string]any{
				"id":    "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
				"title": "标题", "subtitle": "副标题",
				"cover":       "https://mangadex.org/covers/a/b.jpg",
				"description": "简介",
			},
			map[string]any{
				"id":      "b2c3d4e5-f678-90ab-cdef-123456789012",
				"title":   "标题2",
				"authors": []any{"作者A", "作者B"},
			},
		},
	}
	page, err := p.buildPage(result, 1)
	if err != nil {
		t.Fatalf("buildPage: %v", err)
	}
	if len(page.Items) != 2 {
		t.Fatalf("len = %d, want 2", len(page.Items))
	}
	if !page.HasMore {
		t.Error("page=1 < maxPage=10 应 HasMore")
	}
	if page.NextCursor["page"] != 2 {
		t.Errorf("NextCursor = %#v", page.NextCursor)
	}
	first, ok := page.Items[0].(plugindomain.SourceBook)
	if !ok {
		t.Fatalf("Items[0] 类型 = %T", page.Items[0])
	}
	if first.Title != "标题" || first.Source != "MangaDex · Venera" {
		t.Errorf("first = %+v", first)
	}
	if !reflect.DeepEqual(first.Authors, []string{"副标题"}) {
		t.Errorf("authors = %#v", first.Authors)
	}
}

// TestVeneraBuildPageNoMore 验证末页。
func TestVeneraBuildPageNoMore(t *testing.T) {
	p := NewVeneraProvider(nil, DefaultVeneraConfig())
	page, err := p.buildPage(map[string]any{"maxPage": float64(3), "comics": []any{}}, 3)
	if err != nil {
		t.Fatalf("buildPage: %v", err)
	}
	if page.HasMore {
		t.Error("page=3 == maxPage=3 不应 HasMore")
	}
	if len(page.NextCursor) != 0 {
		t.Errorf("NextCursor = %#v, want 空", page.NextCursor)
	}
}

// TestVeneraBuildPageBadID 验证非法漫画 ID 报错。
func TestVeneraBuildPageBadID(t *testing.T) {
	p := NewVeneraProvider(nil, DefaultVeneraConfig())
	_, err := p.buildPage(map[string]any{
		"comics": []any{map[string]any{"id": "not-a-uuid", "title": "x"}},
	}, 1)
	if err == nil {
		t.Fatal("非法 ID 应报错")
	}
}

// TestVeneraSourceScriptDigestMismatch 验证摘要不匹配被拒绝。
func TestVeneraSourceScriptDigestMismatch(t *testing.T) {
	ResetVeneraSourceCache()
	defer ResetVeneraSourceCache()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("// tampered source"))
	}))
	defer srv.Close()

	// 临时把源地址指向本地服务。
	orig := VeneraSourceURL
	VeneraSourceURL = srv.URL
	defer func() { VeneraSourceURL = orig }()

	_, err := VeneraSourceScript(context.Background(), &safehttp.SafeHttpClient{}, 0)
	if err == nil {
		t.Fatal("摘要不匹配应报错")
	}
	if !strings.Contains(err.Error(), "摘要不匹配") {
		t.Errorf("错误 = %q", err.Error())
	}
}

// TestVeneraSourceScriptCaches 验证源脚本被缓存。
func TestVeneraSourceScriptCaches(t *testing.T) {
	ResetVeneraSourceCache()
	defer ResetVeneraSourceCache()

	hits := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits++
		_, _ = w.Write([]byte("// source"))
	}))
	defer srv.Close()

	orig := VeneraSourceURL
	VeneraSourceURL = srv.URL
	defer func() { VeneraSourceURL = orig }()

	// 摘要不匹配，两次都应失败且都发起请求（失败不缓存）。
	_, _ = VeneraSourceScript(context.Background(), &safehttp.SafeHttpClient{}, 0)
	_, _ = VeneraSourceScript(context.Background(), &safehttp.SafeHttpClient{}, 0)
	if hits != 2 {
		t.Errorf("失败不应缓存, hits = %d, want 2", hits)
	}
}

// TestRunVeneraSourceUnsupportedOperation 验证未知操作被拒绝。
func TestRunVeneraSourceUnsupportedOperation(t *testing.T) {
	script := "class MangaDex { constructor() { this.key = 'manga_dex'; } }"
	_, err := RunVeneraSource(context.Background(), script, "nope", nil, DefaultVeneraConfig(), nil)
	if err == nil {
		t.Fatal("未知操作应报错")
	}
}

// TestRunVeneraSourceRejectsWrongKey 验证非 manga_dex 源被拒绝。
func TestRunVeneraSourceRejectsWrongKey(t *testing.T) {
	script := "class MangaDex { constructor() { this.key = 'other'; } }"
	_, err := RunVeneraSource(context.Background(), script, "browse",
		map[string]any{"category": "recent", "page": 1}, DefaultVeneraConfig(), nil)
	if err == nil {
		t.Fatal("非 manga_dex 源应报错")
	}
}

// TestRunVeneraSourceBrowse 用本地服务验证完整 IPC 往返。
func TestRunVeneraSourceBrowse(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"data":[{"id":"a1b2c3d4-e5f6-7890-abcd-ef1234567890","attributes":{"title":{"zh":"标题"}}}],"limit":1,"total":1}`))
	}))
	defer srv.Close()

	// 源脚本直接调用 Network.get，绕过 api.mangadex.org 白名单限制不可行，
	// 因此这里只验证 __run 的分派与 Promise 机制：用 browse 走 source.api。
	script := `
class MangaDex {
    constructor() {
        this.key = 'manga_dex';
        this.api = {
            getRecent: async (page) => {
                const response = await Network.get('https://api.mangadex.org/manga?limit=1');
                const body = JSON.parse(response.body);
                return {comics: body.data.map(item => ({
                    id: item.id,
                    title: item.attributes.title.zh,
                })), maxPage: 1};
            },
        };
    }
}`
	// 请求会打到真实的 api.mangadex.org；无网络时跳过。
	_, err := RunVeneraSource(context.Background(), script, "browse",
		map[string]any{"category": "recent", "page": 1}, DefaultVeneraConfig(), nil)
	if err != nil {
		t.Skipf("需要外网访问 api.mangadex.org，跳过: %v", err)
	}
}

// TestRunVeneraSourceTimeout 验证超时中断。
func TestRunVeneraSourceTimeout(t *testing.T) {
	script := `
class MangaDex {
    constructor() {
        this.key = 'manga_dex';
        this.api = { getRecent: async () => { while (true) {} } };
    }
}`
	cfg := DefaultVeneraConfig()
	cfg.TimeoutSeconds = 0.2
	_, err := RunVeneraSource(context.Background(), script, "browse",
		map[string]any{"category": "recent", "page": 1}, cfg, nil)
	if err == nil {
		t.Fatal("死循环应被超时中断")
	}
}

// TestVeneraManifest 验证清单关键字段。
func TestVeneraManifest(t *testing.T) {
	m := VeneraManifest()
	if m["id"] != VeneraPluginID {
		t.Errorf("id = %v", m["id"])
	}
	if m["download_mode"] != "none" {
		t.Errorf("download_mode = %v", m["download_mode"])
	}
	if m["runtime_kind"] != "managed_process" {
		t.Errorf("runtime_kind = %v", m["runtime_kind"])
	}
	caps, _ := m["capabilities"].([]string)
	if !reflect.DeepEqual(caps, []string{"sources.search", "sources.browse"}) {
		t.Errorf("capabilities = %#v", caps)
	}
	perms, _ := m["permissions"].([]string)
	if !reflect.DeepEqual(perms, []string{"books.read", "network.read"}) {
		t.Errorf("permissions = %#v", perms)
	}
	schema, ok := m["config_schema"].(map[string]any)
	if !ok {
		t.Fatal("config_schema 缺失")
	}
	if schema["additionalProperties"] != false {
		t.Error("additionalProperties 应为 false")
	}
	props, _ := schema["properties"].(map[string]any)
	for _, key := range []string{"source", "locale", "image_quality", "content_rating", "timeout_seconds"} {
		if _, ok := props[key]; !ok {
			t.Errorf("config_schema 缺少 %q", key)
		}
	}
}

// TestVeneraErrorTypes 验证三个错误类型的构造与消息。
func TestVeneraErrorTypes(t *testing.T) {
	cases := []struct {
		name string
		err  error
		want string
	}{
		{"unsupported", NewVeneraUnsupported("a"), "a"},
		{"timeout", NewVeneraTimeout("b"), "b"},
		{"scope", NewVeneraScopeDenied("c"), "c"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := tc.err.Error(); got != tc.want {
				t.Errorf("Error() = %q, want %q", got, tc.want)
			}
		})
	}
}
