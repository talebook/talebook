package booksource

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

// ---- engine.go ----

// TestEngineResolve 验证相对地址补全。
func TestEngineResolve(t *testing.T) {
	raw := bsVectorRaw()
	raw["bookSourceUrl"] = "https://ex.com/dir/page"
	e, err := NewBookSourceEngine(raw, nil, DefaultEngineConfig())
	if err != nil {
		t.Fatalf("NewBookSourceEngine: %v", err)
	}
	cases := []struct{ in, base, want string }{
		{"", "", ""},
		{"https://a/b", "", "https://a/b"},
		{"http://a/b", "", "http://a/b"},
		{"/x", "", "https://ex.com/x"},
		{"x", "", "https://ex.com/dir/x"},
		{"/y", "https://other.com/p/q", "https://other.com/y"},
	}
	for _, tc := range cases {
		if got := e.resolve(tc.in, tc.base); got != tc.want {
			t.Errorf("resolve(%q, %q) = %q, want %q", tc.in, tc.base, got, tc.want)
		}
	}
}

// TestEngineBaseURL 验证 base_url 取书源地址。
func TestEngineBaseURL(t *testing.T) {
	e, _ := NewBookSourceEngine(bsVectorRaw(), nil, DefaultEngineConfig())
	if got := e.BaseURL(); got != "https://ex.com" {
		t.Errorf("BaseURL = %q", got)
	}
}

// TestEngineDetectSerialization 验证连载状态判定。
func TestEngineDetectSerialization(t *testing.T) {
	e, _ := NewBookSourceEngine(bsVectorRaw(), nil, DefaultEngineConfig())
	cases := []struct {
		name     string
		detail   *BookDetail
		chapters []Chapter
		want     string
	}{
		{"finished-kind", &BookDetail{Kind: "完本"}, nil, "finished"},
		{"finished-last", &BookDetail{LastChapter: "大结局"}, nil, "finished"},
		{"serial", &BookDetail{Kind: "连载中"}, nil, "serial"},
		{"serial-traditional", &BookDetail{Kind: "連載"}, nil, "serial"},
		{"unknown", &BookDetail{Kind: "玄幻"}, nil, "unknown"},
		{"chapter-last", &BookDetail{}, []Chapter{{Name: "a"}, {Name: "终章"}}, "finished"},
		{"nil-detail", nil, nil, "unknown"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := e.DetectSerialization(tc.detail, tc.chapters); got != tc.want {
				t.Errorf("= %q, want %q", got, tc.want)
			}
		})
	}
}

// TestEngineTimeout 验证超时兜底。
func TestEngineTimeout(t *testing.T) {
	cfg := DefaultEngineConfig()
	cfg.HTTPTimeout = 0
	e, _ := NewBookSourceEngine(bsVectorRaw(), nil, cfg)
	if got := e.timeout(); got != 20*time.Second {
		t.Errorf("零超时应回落 20s, got %v", got)
	}
	cfg.HTTPTimeout = 5
	e, _ = NewBookSourceEngine(bsVectorRaw(), nil, cfg)
	if got := e.timeout(); got != 5*time.Second {
		t.Errorf("= %v, want 5s", got)
	}
}

// TestEngineSafeHelpers 验证 JS 规则被安全跳过。
func TestEngineSafeHelpers(t *testing.T) {
	e, _ := NewBookSourceEngine(bsVectorRaw(), nil, DefaultEngineConfig())
	ctx := NewAnalyzeRule(nil, nil, "")
	if got := e.safe(ctx, "<js>x</js>"); got != "" {
		t.Errorf("safe(js) = %q, want 空", got)
	}
	if got := e.safeList(ctx, "<js>x</js>"); got != nil {
		t.Errorf("safeList(js) = %#v, want nil", got)
	}
}

// TestEngineMakeContextInit 验证 init 规则下推到首个元素。
func TestEngineMakeContextInit(t *testing.T) {
	e, _ := NewBookSourceEngine(bsVectorRaw(), nil, DefaultEngineConfig())
	html := `<html><body><div id="w"><p>P1</p></div></body></html>`

	rule := NewRuleGroup(map[string]any{})
	ctx := e.makeContext(html, "https://x/", rule, "")
	if got, _ := ctx.GetString("@css:p@text"); got != "P1" {
		t.Errorf("无 init = %q", got)
	}

	rule = NewRuleGroup(map[string]any{"init": "@css:div#w"})
	ctx = e.makeContext(html, "https://x/", rule, "")
	if got, _ := ctx.GetString("@css:p@text"); got != "P1" {
		t.Errorf("有 init = %q", got)
	}

	rule = NewRuleGroup(map[string]any{"init": "<js>x</js>"})
	ctx = e.makeContext(html, "https://x/", rule, "")
	if got, _ := ctx.GetString("@css:p@text"); got != "P1" {
		t.Errorf("init 为 JS = %q", got)
	}
}

// TestEngineParseBookList 验证书单解析与字段映射。
func TestEngineParseBookList(t *testing.T) {
	e, _ := NewBookSourceEngine(bsVectorRaw(), nil, DefaultEngineConfig())
	rule := NewRuleGroup(map[string]any{
		"bookList":    "@css:div.item",
		"name":        "@css:h3@text",
		"author":      "@css:span.au@text",
		"bookUrl":     "@css:a@href",
		"coverUrl":    "@css:img@src",
		"kind":        "@css:span.k@text",
		"wordCount":   "@css:span.w@text",
		"lastChapter": "@css:span.lc@text",
		"intro":       "@css:p@text",
	})
	html := `<html><body>
<div class="item"><h3>N1</h3><span class="au">A1</span><a href="/b/1">x</a>
<img src="/c/1.jpg"/><span class="k">玄幻</span><span class="w">100</span>
<span class="lc">第1章</span><p>简介1</p></div>
<div class="item"><h3>N2</h3><span class="au">A2</span><a href="https://o/b/2">x</a></div>
<div class="item"><h3></h3></div>
</body></html>`

	got, err := e.parseBookList(html, "https://ex.com/list", rule)
	if err != nil {
		t.Fatalf("parseBookList: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("len = %d, want 2（第三项无 name/bookUrl 应被丢弃）", len(got))
	}
	if got[0].Name != "N1" || got[0].Author != "A1" || got[0].Kind != "玄幻" {
		t.Errorf("第一项 = %+v", got[0])
	}
	if got[0].BookURL != "https://ex.com/b/1" {
		t.Errorf("相对 bookUrl 应补全, got %q", got[0].BookURL)
	}
	if got[0].CoverURL != "https://ex.com/c/1.jpg" {
		t.Errorf("相对 coverUrl 应补全, got %q", got[0].CoverURL)
	}
	if got[1].BookURL != "https://o/b/2" {
		t.Errorf("绝对 bookUrl 应保留, got %q", got[1].BookURL)
	}
}

// TestEngineParseBookListJSRule 验证 bookList 为 JS 规则时返回空。
func TestEngineParseBookListJSRule(t *testing.T) {
	e, _ := NewBookSourceEngine(bsVectorRaw(), nil, DefaultEngineConfig())
	rule := NewRuleGroup(map[string]any{"bookList": "<js>x</js>"})
	got, err := e.parseBookList("<html></html>", "https://x/", rule)
	if err != nil {
		t.Fatalf("parseBookList: %v", err)
	}
	if len(got) != 0 {
		t.Errorf("= %#v, want 空", got)
	}
}

// TestEngineParseBookListNoRule 验证无 bookList 规则时返回空。
func TestEngineParseBookListNoRule(t *testing.T) {
	e, _ := NewBookSourceEngine(bsVectorRaw(), nil, DefaultEngineConfig())
	got, err := e.parseBookList("<html></html>", "https://x/", NewRuleGroup(map[string]any{}))
	if err != nil || len(got) != 0 {
		t.Errorf("= %#v, %v", got, err)
	}
}

// TestEngineBookInfo 用本地服务验证详情解析。
func TestEngineBookInfo(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write([]byte(`<html><body>
<div id="info"><h1>书名</h1><span class="au">作者</span>
<span class="k">玄幻</span><span class="lc">第9章</span>
<img class="cv" src="/c.jpg"/><span class="w">1234</span>
<a class="toc" href="/toc">目录</a><p class="in">简介</p></div>
</body></html>`))
	}))
	defer srv.Close()

	raw := bsVectorRaw()
	raw["bookSourceUrl"] = srv.URL
	raw["ruleBookInfo"] = map[string]any{
		"name": "@css:h1@text", "author": "@css:span.au@text",
		"kind": "@css:span.k@text", "lastChapter": "@css:span.lc@text",
		"coverUrl": "@css:img.cv@src", "wordCount": "@css:span.w@text",
		"tocUrl": "@css:a.toc@href", "intro": "@css:p.in@text",
	}
	e, err := NewBookSourceEngine(raw, nil, DefaultEngineConfig())
	if err != nil {
		t.Fatalf("engine: %v", err)
	}
	detail, err := e.BookInfo(context.Background(), "/book/1")
	if err != nil {
		t.Fatalf("BookInfo: %v", err)
	}
	if detail.Name != "书名" || detail.Author != "作者" || detail.Kind != "玄幻" {
		t.Errorf("detail = %+v", detail)
	}
	if detail.LastChapter != "第9章" || detail.WordCount != "1234" || detail.Intro != "简介" {
		t.Errorf("detail = %+v", detail)
	}
	if detail.CoverURL != srv.URL+"/c.jpg" {
		t.Errorf("coverUrl = %q", detail.CoverURL)
	}
	if detail.TocURL != srv.URL+"/toc" {
		t.Errorf("tocUrl = %q", detail.TocURL)
	}
	if detail.BookURL != srv.URL+"/book/1" {
		t.Errorf("bookUrl = %q", detail.BookURL)
	}
}

// TestEngineBookInfoNoTocURL 验证无 tocUrl 规则时回落到书籍地址。
func TestEngineBookInfoNoTocURL(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`<html><body><h1>N</h1></body></html>`))
	}))
	defer srv.Close()

	raw := bsVectorRaw()
	raw["bookSourceUrl"] = srv.URL
	raw["ruleBookInfo"] = map[string]any{"name": "@css:h1@text"}
	e, _ := NewBookSourceEngine(raw, nil, DefaultEngineConfig())
	detail, err := e.BookInfo(context.Background(), "/b/1")
	if err != nil {
		t.Fatalf("BookInfo: %v", err)
	}
	if detail.TocURL != srv.URL+"/b/1" {
		t.Errorf("tocUrl 应回落书籍地址, got %q", detail.TocURL)
	}
}

// TestEngineSearch 用本地服务验证搜索。
func TestEngineSearch(t *testing.T) {
	var gotQuery string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotQuery = r.URL.RawQuery
		_, _ = w.Write([]byte(`<html><body>
<div class="item"><h3>结果1</h3><a href="/b/1">x</a></div>
</body></html>`))
	}))
	defer srv.Close()

	raw := bsVectorRaw()
	raw["bookSourceUrl"] = srv.URL
	raw["searchUrl"] = "/s?q={{key}}&p={{page}}"
	raw["ruleSearch"] = map[string]any{
		"bookList": "@css:div.item", "name": "@css:h3@text", "bookUrl": "@css:a@href",
	}
	e, _ := NewBookSourceEngine(raw, nil, DefaultEngineConfig())
	books, err := e.Search(context.Background(), "关键词", 3)
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	if len(books) != 1 || books[0].Name != "结果1" {
		t.Errorf("books = %#v", books)
	}
	if !strings.Contains(gotQuery, "q=") || !strings.Contains(gotQuery, "p=3") {
		t.Errorf("query = %q", gotQuery)
	}
}

// TestEngineExplore 验证发现页走 ruleExplore。
func TestEngineExplore(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`<html><body>
<div class="e"><h3>发现1</h3><a href="/b/9">x</a></div>
</body></html>`))
	}))
	defer srv.Close()

	raw := bsVectorRaw()
	raw["bookSourceUrl"] = srv.URL
	raw["ruleExplore"] = map[string]any{
		"bookList": "@css:div.e", "name": "@css:h3@text", "bookUrl": "@css:a@href",
	}
	e, _ := NewBookSourceEngine(raw, nil, DefaultEngineConfig())
	books, err := e.Explore(context.Background(), "/cat?p={{page}}", 2)
	if err != nil {
		t.Fatalf("Explore: %v", err)
	}
	if len(books) != 1 || books[0].Name != "发现1" {
		t.Errorf("books = %#v", books)
	}
}

// TestEngineToc 验证目录解析与去重。
func TestEngineToc(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`<html><body>
<div class="cl"><a href="/c/1">第1章</a></div>
<div class="cl"><a href="/c/2">第2章</a></div>
<div class="cl"><a href="/c/1">第1章</a></div>
</body></html>`))
	}))
	defer srv.Close()

	raw := bsVectorRaw()
	raw["bookSourceUrl"] = srv.URL
	raw["ruleToc"] = map[string]any{
		"chapterList": "@css:div.cl", "chapterName": "@css:a@text",
		"chapterUrl": "@css:a@href",
	}
	e, _ := NewBookSourceEngine(raw, nil, DefaultEngineConfig())
	chapters, err := e.Toc(context.Background(), "/toc")
	if err != nil {
		t.Fatalf("Toc: %v", err)
	}
	// 去重后保留靠后的第 1 章，顺序为 第2章, 第1章。
	if len(chapters) != 2 {
		t.Fatalf("len = %d, want 2", len(chapters))
	}
	if chapters[0].Name != "第2章" || chapters[1].Name != "第1章" {
		t.Errorf("chapters = %#v", chapters)
	}
	if chapters[0].URL != srv.URL+"/c/2" {
		t.Errorf("chapterUrl = %q", chapters[0].URL)
	}
}

// TestEngineTocReverse 验证 `-` 前缀触发倒序修正。
func TestEngineTocReverse(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`<html><body>
<div class="cl"><a href="/c/1">第1章</a></div>
<div class="cl"><a href="/c/2">第2章</a></div>
</body></html>`))
	}))
	defer srv.Close()

	raw := bsVectorRaw()
	raw["bookSourceUrl"] = srv.URL
	raw["ruleToc"] = map[string]any{
		"chapterList": "-@css:div.cl", "chapterName": "@css:a@text",
		"chapterUrl": "@css:a@href",
	}
	e, _ := NewBookSourceEngine(raw, nil, DefaultEngineConfig())
	chapters, err := e.Toc(context.Background(), "/toc")
	if err != nil {
		t.Fatalf("Toc: %v", err)
	}
	if len(chapters) != 2 || chapters[0].Name != "第2章" {
		t.Errorf("倒序后 = %#v", chapters)
	}
}

// TestEngineTocNextPage 验证 nextTocUrl 翻页。
func TestEngineTocNextPage(t *testing.T) {
	var mu sync.Mutex
	hits := map[string]int{}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		hits[r.URL.Path]++
		mu.Unlock()
		if r.URL.Path == "/toc" {
			_, _ = w.Write([]byte(`<html><body>
<div class="cl"><a href="/c/1">第1章</a></div>
<a class="next" href="/toc2">下一页</a></body></html>`))
			return
		}
		_, _ = w.Write([]byte(`<html><body>
<div class="cl"><a href="/c/2">第2章</a></div></body></html>`))
	}))
	defer srv.Close()

	raw := bsVectorRaw()
	raw["bookSourceUrl"] = srv.URL
	raw["ruleToc"] = map[string]any{
		"chapterList": "@css:div.cl", "chapterName": "@css:a@text",
		"chapterUrl": "@css:a@href", "nextTocUrl": "@css:a.next@href",
	}
	e, _ := NewBookSourceEngine(raw, nil, DefaultEngineConfig())
	chapters, err := e.Toc(context.Background(), "/toc")
	if err != nil {
		t.Fatalf("Toc: %v", err)
	}
	if len(chapters) != 2 {
		t.Fatalf("len = %d, want 2（应翻到第 2 页）", len(chapters))
	}
	if chapters[1].Name != "第2章" {
		t.Errorf("chapters = %#v", chapters)
	}
}

// TestEngineTocMaxPages 验证翻页上限。
func TestEngineTocMaxPages(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 每页都指向下一页，永不终止。
		_, _ = w.Write([]byte(`<html><body>
<div class="cl"><a href="/c/` + r.URL.Query().Get("p") + `">第1章</a></div>
<a class="next" href="/toc?p=` + r.URL.Query().Get("p") + `x">下一页</a></body></html>`))
	}))
	defer srv.Close()

	raw := bsVectorRaw()
	raw["bookSourceUrl"] = srv.URL
	raw["ruleToc"] = map[string]any{
		"chapterList": "@css:div.cl", "chapterName": "@css:a@text",
		"chapterUrl": "@css:a@href", "nextTocUrl": "@css:a.next@href",
	}
	cfg := DefaultEngineConfig()
	cfg.MaxTocPages = 3
	e, _ := NewBookSourceEngine(raw, nil, cfg)
	chapters, err := e.Toc(context.Background(), "/toc")
	if err != nil {
		t.Fatalf("Toc: %v", err)
	}
	if len(chapters) != 3 {
		t.Errorf("len = %d, want 3（受 MaxTocPages 限制）", len(chapters))
	}
}

// TestEngineContent 验证正文抓取与清理。
func TestEngineContent(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`<html><body><div id="c">  正文内容  </div></body></html>`))
	}))
	defer srv.Close()

	raw := bsVectorRaw()
	raw["bookSourceUrl"] = srv.URL
	raw["ruleContent"] = map[string]any{"content": "@css:div#c@text"}
	e, _ := NewBookSourceEngine(raw, nil, DefaultEngineConfig())
	got, err := e.Content(context.Background(), "/c/1", true)
	if err != nil {
		t.Fatalf("Content: %v", err)
	}
	if got != "正文内容" {
		t.Errorf("= %q, want %q", got, "正文内容")
	}
}

// TestEngineContentNextPage 验证 nextContentUrl 拼接多页正文。
func TestEngineContentNextPage(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/c/1" {
			_, _ = w.Write([]byte(`<html><body><div id="c">第一页</div>
<a class="n" href="/c/2">下页</a></body></html>`))
			return
		}
		_, _ = w.Write([]byte(`<html><body><div id="c">第二页</div></body></html>`))
	}))
	defer srv.Close()

	raw := bsVectorRaw()
	raw["bookSourceUrl"] = srv.URL
	raw["ruleContent"] = map[string]any{
		"content": "@css:div#c@text", "nextContentUrl": "@css:a.n@href",
	}
	e, _ := NewBookSourceEngine(raw, nil, DefaultEngineConfig())
	got, err := e.Content(context.Background(), "/c/1", true)
	if err != nil {
		t.Fatalf("Content: %v", err)
	}
	if got != "第一页\n第二页" {
		t.Errorf("= %q, want %q", got, "第一页\n第二页")
	}
}

// TestEngineContentCleanDisabled 验证 clean=false 只做空白规整。
func TestEngineContentCleanDisabled(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`<html><body><div id="c">广告X 正文</div></body></html>`))
	}))
	defer srv.Close()

	raw := bsVectorRaw()
	raw["bookSourceUrl"] = srv.URL
	raw["ruleContent"] = map[string]any{"content": "@css:div#c@text"}
	cfg := DefaultEngineConfig()
	cfg.ADPatterns = []string{"广告"}
	e, _ := NewBookSourceEngine(raw, nil, cfg)
	got, err := e.Content(context.Background(), "/c/1", false)
	if err != nil {
		t.Fatalf("Content: %v", err)
	}
	if got != "广告X 正文" {
		t.Errorf("clean=false 不应去广告, got %q", got)
	}
}

// TestEngineContentJSRule 验证 content 为 JS 规则时返回空串。
func TestEngineContentJSRule(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`<html><body><div id="c">x</div></body></html>`))
	}))
	defer srv.Close()

	raw := bsVectorRaw()
	raw["bookSourceUrl"] = srv.URL
	raw["ruleContent"] = map[string]any{"content": "<js>x</js>"}
	e, _ := NewBookSourceEngine(raw, nil, DefaultEngineConfig())
	got, err := e.Content(context.Background(), "/c/1", true)
	if err != nil {
		t.Fatalf("Content: %v", err)
	}
	if got != "" {
		t.Errorf("= %q, want 空", got)
	}
}

// TestNewBookSourceEngineBadRaw 验证非 dict 书源报错。
func TestNewBookSourceEngineBadRaw(t *testing.T) {
	if _, err := NewBookSourceEngine("bad", nil, DefaultEngineConfig()); err == nil {
		t.Error("非 dict 应报错")
	}
}

// TestNewBookSourceEngineFromBookSource 验证直接传 *BookSource。
func TestNewBookSourceEngineFromBookSource(t *testing.T) {
	bs := mustBookSource(t, bsVectorRaw())
	e, err := NewBookSourceEngine(bs, nil, DefaultEngineConfig())
	if err != nil {
		t.Fatalf("= %v", err)
	}
	if e.Source != bs {
		t.Error("应复用传入的 BookSource")
	}
}
