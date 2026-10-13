package httpapi

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"talebook/booksvr/internal/booksource"
)

// bsTestServer 起一个本地书源站点，覆盖搜索 / 详情 / 目录 / 正文四页。
func bsTestServer(t *testing.T) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("/search", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write([]byte(`<ul class="search-list">
			<li class="book-item"><span class="book-name"><a href="/book/1">剑来</a></span>
			<span class="author">烽火戏诸侯</span></li>
		</ul>`))
	})
	mux.HandleFunc("/book/1", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write([]byte(`<div class="book-detail">
			<span class="name">剑来</span>
			<a class="toc-link" href="/toc/1">目录</a>
		</div>`))
	})
	mux.HandleFunc("/toc/1", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write([]byte(`<div class="chapter-list">
			<a class="chapter" href="/chapter/1">第一章</a>
		</div>`))
	})
	mux.HandleFunc("/chapter/1", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write([]byte(`<div id="content">正文内容</div>`))
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return srv
}

// bsTestRaw 构造一份指向本地测试站点的完整书源。
func bsTestRaw(baseURL string) map[string]any {
	return map[string]any{
		"bookSourceName": "本地测试源",
		"bookSourceUrl":  baseURL,
		"searchUrl":      "/search?key={{key}}",
		"ruleSearch": map[string]any{
			"bookList": "@css:ul.search-list li.book-item",
			"name":     "@css:.book-name a@text",
			"author":   "@css:.author@text",
			"bookUrl":  "@css:.book-name a@href",
		},
		"ruleBookInfo": map[string]any{
			"name":   "@css:.book-detail .name@text",
			"tocUrl": "@css:.book-detail .toc-link@href",
		},
		"ruleToc": map[string]any{
			"chapterList": "@css:.chapter-list a.chapter",
			"chapterName": "text",
			"chapterUrl":  "href",
		},
		"ruleContent": map[string]any{
			"content": "@css:#content@text",
		},
	}
}

// TestBookSourceTestFullChain 覆盖搜索 → 详情 → 目录 → 正文的完整链路。
func TestBookSourceTestFullChain(t *testing.T) {
	srv := bsTestServer(t)
	fx := newBSFixture(t)
	id := seedBookSource(t, fx.DB, "本地测试源", srv.URL, "", true, 0)
	// 用真实书源规则替换 raw。
	if _, err := fx.DB.Exec(`UPDATE book_sources SET raw = ? WHERE id = ?`,
		encodeRawForTest(t, bsTestRaw(srv.URL)), id); err != nil {
		t.Fatalf("更新 raw 失败: %v", err)
	}

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/booksource/test",
		`{"id":`+jsonNumber(id)+`,"key":"剑来"}`, 1, true)
	got, err := BookSourceTestHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v, msg = %v", got["err"], got["msg"])
	}

	search := got["search"].([]map[string]any)
	if len(search) != 1 || search[0]["name"] != "剑来" {
		t.Errorf("search = %v", search)
	}
	if got["info"] == nil {
		t.Error("缺少 info")
	}
	if got["toc_count"] != 1 {
		t.Errorf("toc_count = %v", got["toc_count"])
	}
	if !strings.Contains(pluginStr(got["sample_content"]), "正文内容") {
		t.Errorf("sample_content = %q", got["sample_content"])
	}
	if _, ok := got["elapsed_ms"]; !ok {
		t.Error("缺少 elapsed_ms")
	}

	// 成功结果应写回检测状态。
	s, _ := booksource.GetSourceByID(fx.DB, id)
	if !s.LastCheckOK || s.CheckStatus != booksource.CheckStatusOK {
		t.Errorf("s = %+v", s)
	}
}

// TestBookSourceTestJSSkipped 覆盖 JsRuleUnsupported 分支。
func TestBookSourceTestJSSkipped(t *testing.T) {
	fx := newBSFixture(t)
	// searchUrl 用 @js: 开头 → 引擎抛 JsRuleUnsupported。
	raw := map[string]any{
		"bookSourceName": "JS 源",
		"bookSourceUrl":  "https://js.example.com",
		"searchUrl":      "@js:java.ajax('x')",
		"ruleSearch":     map[string]any{"bookList": "@css:li"},
	}
	id := seedBookSource(t, fx.DB, "JS 源", "https://js.example.com", "", true, 0)
	if _, err := fx.DB.Exec(`UPDATE book_sources SET raw = ? WHERE id = ?`,
		encodeRawForTest(t, raw), id); err != nil {
		t.Fatalf("更新 raw 失败: %v", err)
	}

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/booksource/test",
		`{"id":`+jsonNumber(id)+`}`, 1, true)
	got, err := BookSourceTestHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["js_skipped"] != true {
		t.Errorf("js_skipped = %v, err = %v, msg = %v", got["js_skipped"], got["err"], got["msg"])
	}
}

// TestBookSourceTestDefaultKey 覆盖 key 缺省为「剑来」。
func TestBookSourceTestDefaultKey(t *testing.T) {
	srv := bsTestServer(t)
	fx := newBSFixture(t)
	id := seedBookSource(t, fx.DB, "本地测试源", srv.URL, "", true, 0)
	if _, err := fx.DB.Exec(`UPDATE book_sources SET raw = ? WHERE id = ?`,
		encodeRawForTest(t, bsTestRaw(srv.URL)), id); err != nil {
		t.Fatalf("更新 raw 失败: %v", err)
	}

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/booksource/test",
		`{"id":`+jsonNumber(id)+`}`, 1, true)
	got, err := BookSourceTestHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	// 测试站点忽略 key，只要链路走通即算通过。
	if got["err"] != "ok" {
		t.Errorf("err = %v, msg = %v", got["err"], got["msg"])
	}
}

// TestBookSourceTestBadBody 覆盖请求体非法。
func TestBookSourceTestBadBody(t *testing.T) {
	fx := newBSFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/booksource/test", `not json`, 1, true)

	got, err := BookSourceTestHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrBookSourceParams {
		t.Errorf("err = %v", got["err"])
	}
}

// ---- 默认实现分支 ----

func TestResolveDefault(t *testing.T) {
	cfg := BookSourceAdminConfig{}
	fn := cfg.resolve()
	if fn == nil {
		t.Fatal("应返回默认解析器")
	}
	// 解析一个必然不存在的域名，只验证不 panic。
	_ = fn("nope.invalid", 80)
}

func TestFetchDefault(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	cfg := BookSourceAdminConfig{}
	status, err := cfg.fetch()(srv.URL, 5)
	if err != nil {
		t.Fatalf("fetch: %v", err)
	}
	if status != 200 {
		t.Errorf("status = %d", status)
	}
}

func TestFetchDefaultError(t *testing.T) {
	cfg := BookSourceAdminConfig{}
	if _, err := cfg.fetch()("http://127.0.0.1:1/nope", 1); err == nil {
		t.Error("不可达地址应报错")
	}
}

func TestFetchJSONDefault(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`[{"a":1}]`))
	}))
	defer srv.Close()

	cfg := BookSourceAdminConfig{}
	body, err := cfg.fetchJSON()(srv.URL, 5)
	if err != nil {
		t.Fatalf("fetchJSON: %v", err)
	}
	if !strings.Contains(string(body), `"a"`) {
		t.Errorf("body = %q", body)
	}
}

func TestFetchJSONDefaultHTTPError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()

	cfg := BookSourceAdminConfig{}
	if _, err := cfg.fetchJSON()(srv.URL, 5); err == nil {
		t.Error("4xx 应报错")
	}
}

func TestValidateSourceRawViaConfig(t *testing.T) {
	cfg := BookSourceAdminConfig{
		Settings: map[string]any{"BOOKSOURCE_HTTP_TIMEOUT": 20},
		Resolve:  func(string, int) error { return nil },
		Fetch:    func(context.Context, string, float64) (int, error) { return 200, nil },
	}
	got := cfg.validateSourceRaw(map[string]any{
		"bookSourceName": "x", "bookSourceUrl": "https://example.com",
		"searchUrl":    "/s",
		"ruleSearch":   map[string]any{"bookList": "a", "bookUrl": "b"},
		"ruleBookInfo": map[string]any{"name": "c"},
		"ruleToc":      map[string]any{"chapterList": "d", "chapterUrl": "e"},
		"ruleContent":  map[string]any{"content": "f"},
	})
	if !got.OK {
		t.Errorf("got = %+v", got)
	}
}

func TestCheckerDefaultWhenNil(t *testing.T) {
	cfg := BookSourceAdminConfig{}
	if cfg.checker() == nil {
		t.Fatal("应返回默认单例")
	}
}

func TestSortInt64Asc(t *testing.T) {
	list := []int64{3, 1, 2}
	sortInt64Asc(list)
	if list[0] != 1 || list[1] != 2 || list[2] != 3 {
		t.Errorf("list = %v", list)
	}
	// 已排序与空列表。
	sortInt64Asc([]int64{1})
	sortInt64Asc(nil)
}

func TestInt64sToAny(t *testing.T) {
	got := int64sToAny([]int64{1, 2})
	if len(got) != 2 || got[0] != int64(1) {
		t.Errorf("got = %v", got)
	}
	if len(int64sToAny(nil)) != 0 {
		t.Error("nil → 非空")
	}
}

// encodeRawForTest 把 raw 序列化成 JSON 文本。
func encodeRawForTest(t *testing.T, raw map[string]any) string {
	t.Helper()
	return string(mustJSON(raw))
}
