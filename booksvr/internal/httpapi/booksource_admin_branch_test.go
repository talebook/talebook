package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// bsBrokenServer 起一个「搜索页正常、指定后续页面 500」的站点，
// 用于覆盖 bookSourceTestRun 的详情 / 目录 / 正文失败分支。
func bsBrokenServer(t *testing.T, failAt string) *httptest.Server {
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
		if failAt == "book" {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write([]byte(`<div class="book-detail">
			<span class="name">剑来</span>
			<a class="toc-link" href="/toc/1">目录</a>
		</div>`))
	})
	mux.HandleFunc("/toc/1", func(w http.ResponseWriter, r *http.Request) {
		if failAt == "toc" {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write([]byte(`<div class="chapter-list">
			<a class="chapter" href="/chapter/1">第一章</a>
		</div>`))
	})
	mux.HandleFunc("/chapter/1", func(w http.ResponseWriter, r *http.Request) {
		if failAt == "content" {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write([]byte(`<div id="content">正文内容</div>`))
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return srv
}

// bsSeedRaw 把一份指向 baseURL 的完整书源写进指定书源行。
func bsSeedRaw(t *testing.T, fx *bsFixture, id int64, baseURL string) {
	t.Helper()
	raw := bsTestRaw(baseURL)
	raw["bookSourceUrl"] = baseURL
	if _, err := fx.DB.Exec(`UPDATE book_sources SET raw = ? WHERE id = ?`,
		encodeRawForTest(t, raw), id); err != nil {
		t.Fatalf("写 raw 失败: %v", err)
	}
}

// bsRunTest 调用书源测试 handler 并返回结果。
func bsRunTest(t *testing.T, fx *bsFixture, id int64) map[string]any {
	t.Helper()
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/booksource/test",
		`{"id":`+jsonNumber(id)+`,"key":"剑来"}`, 1, true)
	got, err := BookSourceTestHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	return got
}

// TestBookSourceTestRunDetailFailure 覆盖详情页抓取失败分支。
func TestBookSourceTestRunDetailFailure(t *testing.T) {
	srv := bsBrokenServer(t, "book")
	fx := newBSFixture(t)
	id := seedBookSource(t, fx.DB, "坏源", srv.URL, "", true, 1)
	bsSeedRaw(t, fx, id, srv.URL)

	got := bsRunTest(t, fx, id)
	if got["err"] == "ok" {
		t.Errorf("详情失败应报错: %v", got)
	}
	if _, ok := got["elapsed_ms"]; !ok {
		t.Error("应带 elapsed_ms")
	}
}

// TestBookSourceTestRunTocFailure 覆盖目录页抓取失败分支。
func TestBookSourceTestRunTocFailure(t *testing.T) {
	srv := bsBrokenServer(t, "toc")
	fx := newBSFixture(t)
	id := seedBookSource(t, fx.DB, "坏源", srv.URL, "", true, 1)
	bsSeedRaw(t, fx, id, srv.URL)

	got := bsRunTest(t, fx, id)
	if got["err"] == "ok" {
		t.Errorf("目录失败应报错: %v", got)
	}
}

// TestBookSourceTestRunContentFailure 覆盖正文抓取失败分支。
func TestBookSourceTestRunContentFailure(t *testing.T) {
	srv := bsBrokenServer(t, "content")
	fx := newBSFixture(t)
	id := seedBookSource(t, fx.DB, "坏源", srv.URL, "", true, 1)
	bsSeedRaw(t, fx, id, srv.URL)

	got := bsRunTest(t, fx, id)
	if got["err"] == "ok" {
		t.Errorf("正文失败应报错: %v", got)
	}
}

// TestBookSourceTestRunNoResults 覆盖搜索无结果分支（跳过详情 / 目录 / 正文）。
func TestBookSourceTestRunNoResults(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/search", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write([]byte(`<ul class="search-list"></ul>`))
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)

	fx := newBSFixture(t)
	id := seedBookSource(t, fx.DB, "空源", srv.URL, "", true, 1)
	bsSeedRaw(t, fx, id, srv.URL)

	got := bsRunTest(t, fx, id)
	if got["err"] != "ok" {
		t.Fatalf("空结果应成功: %v", got)
	}
	if _, ok := got["info"]; ok {
		t.Error("无结果时不应有 info")
	}
	if _, ok := got["toc_count"]; ok {
		t.Error("无结果时不应有 toc_count")
	}
}

// TestBookSourceTestRunBadEngine 覆盖引擎构造失败分支。
func TestBookSourceTestRunBadEngine(t *testing.T) {
	fx := newBSFixture(t)
	id := seedBookSource(t, fx.DB, "坏引擎", "https://example.com", "", true, 1)
	if _, err := fx.DB.Exec(`UPDATE book_sources SET raw = ? WHERE id = ?`,
		`{"bookSourceName":"坏引擎","bookSourceUrl":"https://example.com","searchUrl":"/s","ruleSearch":{"bookList":"@bad:x"}}`,
		id); err != nil {
		t.Fatalf("写 raw 失败: %v", err)
	}

	got := bsRunTest(t, fx, id)
	if got["err"] == "ok" {
		t.Errorf("非法规则应报错: %v", got)
	}
}

// TestAdminIntOKExtra 补齐 adminIntOK 的各类型分支。
func TestAdminIntOKExtra(t *testing.T) {
	cases := []struct {
		value any
		want  int64
		ok    bool
	}{
		{float64(3.9), 3, true},
		{int(7), 7, true},
		{int64(9), 9, true},
		{json.Number("11"), 11, true},
		{json.Number("bad"), 0, false},
		{"  13  ", 13, true},
		{"bad", 0, false},
		{true, 0, false},
		{nil, 0, false},
	}
	for _, tc := range cases {
		got, ok := adminIntOK(tc.value)
		if got != tc.want || ok != tc.ok {
			t.Errorf("adminIntOK(%#v) = %d, %v; want %d, %v", tc.value, got, ok, tc.want, tc.ok)
		}
	}
}
