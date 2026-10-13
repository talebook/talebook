package booksource

import (
	"context"
	"crypto/sha256"
	"crypto/tls"
	"encoding/hex"
	"encoding/json"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/safehttp"
)

// veneraTestScript 是一个最小可用的 MangaDex 源，走 Network.get 白名单路径。
//
// 为了让请求能打到本地测试服务，测试里把 api.mangadex.org 解析到本地地址
// （见 newVeneraTestClient）。
const veneraTestScript = `
class MangaDex {
    constructor() {
        this.key = 'manga_dex';
        this.api = {
            getRecent: async (page) => {
                const response = await Network.get('https://api.mangadex.org/manga?limit=1&page=' + page);
                const body = JSON.parse(response.body);
                return {comics: body.comics, maxPage: body.maxPage};
            },
            getPopular: async (page) => {
                const response = await Network.get('https://api.mangadex.org/manga?limit=1&page=' + page);
                const body = JSON.parse(response.body);
                return {comics: body.comics, maxPage: body.maxPage};
            },
            getUpdated: async (page) => {
                const response = await Network.get('https://api.mangadex.org/manga?limit=1&page=' + page);
                const body = JSON.parse(response.body);
                return {comics: body.comics, maxPage: body.maxPage};
            },
        };
        this.search = {
            load: async (query, ratings, page) => {
                const response = await Network.get('https://api.mangadex.org/manga?title=' + query);
                const body = JSON.parse(response.body);
                return {comics: body.comics, maxPage: body.maxPage};
            },
        };
        this.comic = {
            loadInfo: async (id) => {
                const response = await Network.get('https://api.mangadex.org/manga/' + id);
                return JSON.parse(response.body);
            },
            loadEp: async (id, chapter) => {
                const response = await Network.get('https://api.mangadex.org/at-home/' + chapter);
                return JSON.parse(response.body);
            },
            onImageLoad: (url) => ({
                url: url,
                headers: {Referer: 'https://mangadex.org/', Origin: 'https://mangadex.org'},
            }),
        };
    }
}`

// newVeneraTestClient 返回一个把 api.mangadex.org 指向本地服务的客户端。
//
// safehttp 会校验端点，因此这里：
//   - 用自定义 Resolver 让端点校验通过；
//   - 用自定义 DialContext 把实际连接重定向到本地测试服务。
func newVeneraTestClient(t *testing.T, srv *httptest.Server) *safehttp.SafeHttpClient {
	t.Helper()
	target := strings.TrimPrefix(srv.URL, "https://")
	transport := &http.Transport{
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			var d net.Dialer
			return d.DialContext(ctx, network, target)
		},
		// 测试服务用自签证书，跳过校验。
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	return &safehttp.SafeHttpClient{
		Session: &http.Client{Transport: transport},
		Resolver: func(h string, port int) ([]string, error) {
			return []string{"127.0.0.1"}, nil
		},
		EnforcePublicAddress: false,
		MaxBytes:             VeneraMaxResultLen,
	}
}

// veneraTestServer 返回一个模拟 MangaDex API 的本地 TLS 服务。
//
// 源脚本只允许 https 请求，因此测试服务必须是 TLS。
func veneraTestServer(t *testing.T) *httptest.Server {
	t.Helper()
	const bookID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
	const epID = "b2c3d4e5-f678-90ab-cdef-123456789012"
	return httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch {
		case strings.HasPrefix(r.URL.Path, "/manga/"):
			_ = json.NewEncoder(w).Encode(map[string]any{
				"id": bookID, "title": "书名", "subtitle": "作者",
				"description": "简介", "cover": "https://mangadex.org/covers/a/b.jpg",
				// chapters 是 Map/对象形式 {章节ID: 章节标题}，
				// __chapters 展平为 [{id: 章节ID, title: 章节标题}]。
				"chapters": map[string]any{
					epID: "第1话",
				},
			})
		case strings.HasPrefix(r.URL.Path, "/at-home/"):
			// images 是 URL 字符串数组；__run 会经 onImageLoad 转成 {url,headers}。
			_ = json.NewEncoder(w).Encode(map[string]any{
				"images": []any{"https://uploads.mangadex.org/data/abc/1.jpg"},
			})
		default:
			_ = json.NewEncoder(w).Encode(map[string]any{
				"maxPage": 3,
				"comics": []any{
					map[string]any{
						"id": bookID, "title": "书名", "subtitle": "作者",
						"cover": "https://mangadex.org/covers/a/b.jpg", "description": "简介",
					},
				},
			})
		}
	}))
}

// TestRunVeneraSourceEndToEnd 驱动完整 IPC 往返（browse / search / book / pages）。
func TestRunVeneraSourceEndToEnd(t *testing.T) {
	srv := veneraTestServer(t)
	defer srv.Close()
	client := newVeneraTestClient(t, srv)

	cfg := DefaultVeneraConfig()
	cfg.TimeoutSeconds = 10

	t.Run("browse", func(t *testing.T) {
		got, err := RunVeneraSource(context.Background(), veneraTestScript, "browse",
			map[string]any{"category": "recent", "page": 1}, cfg, client)
		if err != nil {
			t.Fatalf("browse: %v", err)
		}
		if got["maxPage"] != float64(3) {
			t.Errorf("maxPage = %v", got["maxPage"])
		}
		comics, _ := got["comics"].([]any)
		if len(comics) != 1 {
			t.Fatalf("comics = %#v", comics)
		}
	})

	t.Run("search", func(t *testing.T) {
		got, err := RunVeneraSource(context.Background(), veneraTestScript, "search",
			map[string]any{"query": "q", "page": 1}, cfg, client)
		if err != nil {
			t.Fatalf("search: %v", err)
		}
		if _, ok := got["comics"]; !ok {
			t.Errorf("结果缺少 comics: %#v", got)
		}
	})

	t.Run("book", func(t *testing.T) {
		got, err := RunVeneraSource(context.Background(), veneraTestScript, "book",
			map[string]any{"id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"}, cfg, client)
		if err != nil {
			t.Fatalf("book: %v", err)
		}
		if got["title"] != "书名" {
			t.Errorf("title = %v", got["title"])
		}
		chapters, _ := got["chapters"].([]any)
		if len(chapters) != 1 {
			t.Fatalf("chapters = %#v", chapters)
		}
	})

	t.Run("pages", func(t *testing.T) {
		got, err := RunVeneraSource(context.Background(), veneraTestScript, "pages",
			map[string]any{
				"id":      "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
				"chapter": "b2c3d4e5-f678-90ab-cdef-123456789012",
			}, cfg, client)
		if err != nil {
			t.Fatalf("pages: %v", err)
		}
		images, _ := got["images"].([]any)
		if len(images) != 1 {
			t.Fatalf("images = %#v", images)
		}
	})
}

// TestRunVeneraSourceRejectsNonWhitelistedRequest 验证非白名单请求被拒绝。
func TestRunVeneraSourceRejectsNonWhitelistedRequest(t *testing.T) {
	script := `
class MangaDex {
    constructor() {
        this.key = 'manga_dex';
        this.api = {
            getRecent: async () => {
                await Network.get('https://evil.com/steal');
                return {comics: [], maxPage: 1};
            },
        };
    }
}`
	_, err := RunVeneraSource(context.Background(), script, "browse",
		map[string]any{"category": "recent", "page": 1}, DefaultVeneraConfig(), nil)
	if err == nil {
		t.Fatal("非白名单请求应被拒绝")
	}
	if !strings.Contains(err.Error(), "不受支持的网络请求") {
		t.Errorf("错误 = %q", err.Error())
	}
}

// TestRunVeneraSourceRejectsPost 验证 POST 被拒绝。
func TestRunVeneraSourceRejectsPost(t *testing.T) {
	script := `
class MangaDex {
    constructor() {
        this.key = 'manga_dex';
        this.api = {
            getRecent: async () => {
                await Network.sendRequest('POST', 'https://api.mangadex.org/manga', {}, 'x');
                return {comics: [], maxPage: 1};
            },
        };
    }
}`
	_, err := RunVeneraSource(context.Background(), script, "browse",
		map[string]any{"category": "recent", "page": 1}, DefaultVeneraConfig(), nil)
	if err == nil {
		t.Fatal("POST 应被拒绝")
	}
}

// TestRunVeneraSourceRequestLimit 验证请求数上限。
func TestRunVeneraSourceRequestLimit(t *testing.T) {
	srv := veneraTestServer(t)
	defer srv.Close()
	client := newVeneraTestClient(t, srv)

	script := `
class MangaDex {
    constructor() {
        this.key = 'manga_dex';
        this.api = {
            getRecent: async () => {
                for (let i = 0; i < 50; i++) {
                    await Network.get('https://api.mangadex.org/manga?i=' + i);
                }
                return {comics: [], maxPage: 1};
            },
        };
    }
}`
	cfg := DefaultVeneraConfig()
	cfg.TimeoutSeconds = 10
	_, err := RunVeneraSource(context.Background(), script, "browse",
		map[string]any{"category": "recent", "page": 1}, cfg, client)
	if err == nil {
		t.Fatal("超过请求上限应报错")
	}
	if !strings.Contains(err.Error(), "请求过多") {
		t.Errorf("错误 = %q", err.Error())
	}
}

// TestRunVeneraSourceUpstreamFailure 验证上游失败被正确传播。
func TestRunVeneraSourceUpstreamFailure(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "boom", http.StatusInternalServerError)
	}))
	defer srv.Close()
	client := newVeneraTestClient(t, srv)

	cfg := DefaultVeneraConfig()
	cfg.TimeoutSeconds = 10
	// 500 不是传输错误，源脚本会拿到 status=500 并自行处理；
	// 这里脚本直接抛错，验证错误路径。
	script := `
class MangaDex {
    constructor() {
        this.key = 'manga_dex';
        this.api = {
            getRecent: async () => {
                const r = await Network.get('https://api.mangadex.org/manga');
                if (r.status !== 200) throw new Error('upstream failed');
                return {comics: [], maxPage: 1};
            },
        };
    }
}`
	_, err := RunVeneraSource(context.Background(), script, "browse",
		map[string]any{"category": "recent", "page": 1}, cfg, client)
	if err == nil {
		t.Fatal("上游失败应报错")
	}
}

// TestVeneraProviderSearchEndToEnd 验证 provider 的 Search 全链路。
func TestVeneraProviderSearchEndToEnd(t *testing.T) {
	srv := veneraTestServer(t)
	defer srv.Close()
	client := newVeneraTestClient(t, srv)

	// 注入已校验的源脚本，跳过网络拉取。
	ResetVeneraSourceCache()
	defer ResetVeneraSourceCache()
	veneraSourceMu.Lock()
	veneraSourceCache = veneraTestScript
	veneraSourceMu.Unlock()

	cfg := DefaultVeneraConfig()
	cfg.TimeoutSeconds = 10
	p := NewVeneraProvider(client, cfg)

	page, err := p.Search("关键词", map[string]any{"page": float64(1)}, map[string]any{
		"config": map[string]any{"source": "MangaDex"},
	})
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	if len(page.Items) != 1 {
		t.Fatalf("items = %#v", page.Items)
	}
	if !page.HasMore {
		t.Error("page=1 < maxPage=3 应 HasMore")
	}
	if page.NextCursor["page"] != 2 {
		t.Errorf("NextCursor = %#v", page.NextCursor)
	}
}

// TestVeneraProviderBrowseEndToEnd 验证 provider 的 Browse 全链路。
func TestVeneraProviderBrowseEndToEnd(t *testing.T) {
	srv := veneraTestServer(t)
	defer srv.Close()
	client := newVeneraTestClient(t, srv)

	ResetVeneraSourceCache()
	defer ResetVeneraSourceCache()
	veneraSourceMu.Lock()
	veneraSourceCache = veneraTestScript
	veneraSourceMu.Unlock()

	cfg := DefaultVeneraConfig()
	cfg.TimeoutSeconds = 10
	p := NewVeneraProvider(client, cfg)
	ctxMap := map[string]any{"config": map[string]any{"source": "MangaDex"}}

	for _, category := range []string{"recent", "popular", "updated"} {
		page, err := p.Browse(category, map[string]any{"page": float64(1)}, ctxMap)
		if err != nil {
			t.Fatalf("Browse(%s): %v", category, err)
		}
		if len(page.Items) != 1 {
			t.Errorf("Browse(%s) items = %#v", category, page.Items)
		}
	}

	// 非法分类。
	if _, err := p.Browse("bogus", nil, ctxMap); err == nil {
		t.Error("非法分类应报错")
	}
}

// TestVeneraProviderGetBookAndTOC 验证详情与目录全链路。
func TestVeneraProviderGetBookAndTOC(t *testing.T) {
	srv := veneraTestServer(t)
	defer srv.Close()
	client := newVeneraTestClient(t, srv)

	ResetVeneraSourceCache()
	defer ResetVeneraSourceCache()
	veneraSourceMu.Lock()
	veneraSourceCache = veneraTestScript
	veneraSourceMu.Unlock()

	cfg := DefaultVeneraConfig()
	cfg.TimeoutSeconds = 10
	p := NewVeneraProvider(client, cfg)
	ctxMap := map[string]any{"config": map[string]any{"source": "MangaDex"}}

	const bookID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
	detail, err := p.GetBook(bookID, ctxMap)
	if err != nil {
		t.Fatalf("GetBook: %v", err)
	}
	if detail.Title != "书名" || detail.Source != "MangaDex · Venera" {
		t.Errorf("detail = %+v", detail)
	}
	if detail.Format != "comic" || detail.TOCRef != bookID {
		t.Errorf("detail = %+v", detail)
	}

	chapters, err := p.GetTOC(detail, ctxMap)
	if err != nil {
		t.Fatalf("GetTOC: %v", err)
	}
	if len(chapters) != 1 || chapters[0].Title != "第1话" {
		t.Fatalf("chapters = %#v", chapters)
	}

	// 章节标识可解析回 bookID/episodeID。
	gotBook, gotEpisode, err := ParseChapterID(chapters[0].ExternalID)
	if err != nil {
		t.Fatalf("ParseChapterID: %v", err)
	}
	if gotBook != bookID {
		t.Errorf("bookID = %q, want %q", gotBook, bookID)
	}
	if gotEpisode != "b2c3d4e5-f678-90ab-cdef-123456789012" {
		t.Errorf("episodeID = %q", gotEpisode)
	}
}

// TestVeneraProviderGetTOCRefetch 验证 Extra 缺 chapters 时重新拉详情。
func TestVeneraProviderGetTOCRefetch(t *testing.T) {
	srv := veneraTestServer(t)
	defer srv.Close()
	client := newVeneraTestClient(t, srv)

	ResetVeneraSourceCache()
	defer ResetVeneraSourceCache()
	veneraSourceMu.Lock()
	veneraSourceCache = veneraTestScript
	veneraSourceMu.Unlock()

	cfg := DefaultVeneraConfig()
	cfg.TimeoutSeconds = 10
	p := NewVeneraProvider(client, cfg)
	ctxMap := map[string]any{"config": map[string]any{"source": "MangaDex"}}

	// 构造一个没有 chapters 的详情，走重新拉取分支。
	detail, err := p.GetBook("a1b2c3d4-e5f6-7890-abcd-ef1234567890", ctxMap)
	if err != nil {
		t.Fatalf("GetBook: %v", err)
	}
	delete(detail.Extra, "chapters")
	chapters, err := p.GetTOC(detail, ctxMap)
	if err != nil {
		t.Fatalf("GetTOC: %v", err)
	}
	if len(chapters) != 1 {
		t.Errorf("chapters = %#v", chapters)
	}
}

// TestVeneraProviderGetChapter 验证章节图片全链路。
func TestVeneraProviderGetChapter(t *testing.T) {
	srv := veneraTestServer(t)
	defer srv.Close()
	client := newVeneraTestClient(t, srv)

	ResetVeneraSourceCache()
	defer ResetVeneraSourceCache()
	veneraSourceMu.Lock()
	veneraSourceCache = veneraTestScript
	veneraSourceMu.Unlock()

	cfg := DefaultVeneraConfig()
	cfg.TimeoutSeconds = 10
	p := NewVeneraProvider(client, cfg)
	ctxMap := map[string]any{"config": map[string]any{"source": "MangaDex"}}

	chapter := plugindomain.SourceChapter{ExternalID: ChapterID("a1b2c3d4-e5f6-7890-abcd-ef1234567890", "b2c3d4e5-f678-90ab-cdef-123456789012"), Title: "第1话"}
	content, err := p.GetChapter(chapter, ctxMap)
	if err != nil {
		t.Fatalf("GetChapter: %v", err)
	}
	if content.Title != "第1话" {
		t.Errorf("title = %q", content.Title)
	}
	if content.Extra["media_type"] != "comic" {
		t.Errorf("extra = %#v", content.Extra)
	}
	images, _ := content.Extra["images"].([]any)
	if len(images) != 1 {
		t.Fatalf("images = %#v", images)
	}
}

// TestVeneraProviderGetChapterBadID 验证非法章节标识。
func TestVeneraProviderGetChapterBadID(t *testing.T) {
	p := NewVeneraProvider(nil, DefaultVeneraConfig())
	_, err := p.GetChapter(plugindomain.SourceChapter{ExternalID: "!!!"}, nil)
	if err == nil {
		t.Fatal("非法标识应报错")
	}
}

// TestVeneraProviderSelfCheck 验证自检。
func TestVeneraProviderSelfCheck(t *testing.T) {
	srv := veneraTestServer(t)
	defer srv.Close()
	client := newVeneraTestClient(t, srv)

	ResetVeneraSourceCache()
	defer ResetVeneraSourceCache()
	veneraSourceMu.Lock()
	veneraSourceCache = veneraTestScript
	veneraSourceMu.Unlock()

	cfg := DefaultVeneraConfig()
	cfg.TimeoutSeconds = 10
	p := NewVeneraProvider(client, cfg)
	report, err := p.SelfCheck(map[string]any{"config": map[string]any{"source": "MangaDex"}})
	if err != nil {
		t.Fatalf("SelfCheck: %v", err)
	}
	if !report.Healthy {
		t.Error("应报告健康")
	}
	if !strings.Contains(report.Message, "MangaDex") {
		t.Errorf("message = %q", report.Message)
	}
}

// TestVeneraProviderConfigOverrides 验证配置覆盖。
func TestVeneraProviderConfigOverrides(t *testing.T) {
	srv := veneraTestServer(t)
	defer srv.Close()
	client := newVeneraTestClient(t, srv)

	ResetVeneraSourceCache()
	defer ResetVeneraSourceCache()
	veneraSourceMu.Lock()
	veneraSourceCache = veneraTestScript
	veneraSourceMu.Unlock()

	p := NewVeneraProvider(client, DefaultVeneraConfig())
	// 超时被夹到 [1,60]。
	_, err := p.call(context.Background(), "browse",
		map[string]any{"category": "recent", "page": 1},
		map[string]any{"config": map[string]any{
			"source": "MangaDex", "timeout_seconds": float64(9999),
			"locale": "en", "content_rating": "safe", "image_quality": "Compressed",
		}})
	if err != nil {
		t.Fatalf("call: %v", err)
	}
}

// TestVeneraProviderTimeout 验证 provider 层超时。
func TestVeneraProviderTimeout(t *testing.T) {
	script := `
class MangaDex {
    constructor() {
        this.key = 'manga_dex';
        this.api = { getRecent: async () => { while (true) {} } };
    }
}`
	ResetVeneraSourceCache()
	defer ResetVeneraSourceCache()
	veneraSourceMu.Lock()
	veneraSourceCache = script
	veneraSourceMu.Unlock()

	p := NewVeneraProvider(nil, DefaultVeneraConfig())
	_, err := p.call(context.Background(), "browse",
		map[string]any{"category": "recent", "page": 1},
		map[string]any{"config": map[string]any{
			"source": "MangaDex", "timeout_seconds": float64(1),
		}})
	if err == nil {
		t.Fatal("死循环应超时")
	}
}

// TestVeneraSourceScriptSuccess 验证摘要匹配时缓存生效。
func TestVeneraSourceScriptSuccess(t *testing.T) {
	ResetVeneraSourceCache()
	defer ResetVeneraSourceCache()

	// 用真实摘要构造一个内容匹配的响应。
	const body = "// verified source"
	sum := sha256Hex(body)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(body))
	}))
	defer srv.Close()

	origURL, origSum := VeneraSourceURL, VeneraSourceSHA256
	VeneraSourceURL = srv.URL
	VeneraSourceSHA256 = sum
	defer func() { VeneraSourceURL, VeneraSourceSHA256 = origURL, origSum }()

	got, err := VeneraSourceScript(context.Background(), &safehttp.SafeHttpClient{}, 5*time.Second)
	if err != nil {
		t.Fatalf("VeneraSourceScript: %v", err)
	}
	if got != body {
		t.Errorf("= %q, want %q", got, body)
	}
	// 第二次应命中缓存（服务已关闭也不影响）。
	srv.Close()
	got2, err := VeneraSourceScript(context.Background(), &safehttp.SafeHttpClient{}, 5*time.Second)
	if err != nil || got2 != body {
		t.Errorf("缓存未生效: %q, %v", got2, err)
	}
}

// sha256Hex 返回内容的十六进制 SHA-256。
func sha256Hex(s string) string {
	sum := sha256.Sum256([]byte(s))
	return hex.EncodeToString(sum[:])
}
