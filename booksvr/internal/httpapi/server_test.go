package httpapi

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	_ "modernc.org/sqlite"

	"talebook/booksvr/internal/library"
)

// newTestServer 建一个挂载了 work 路由的测试服务器。
func newTestServer(t *testing.T, identify func(*http.Request) (Identity, error)) (*Server, *httptest.Server) {
	t.Helper()
	db := newTestDB(t)

	srv, err := NewServer(WorkRouteSpecs())
	if err != nil {
		t.Fatalf("NewServer: %v", err)
	}
	srv.DB = db
	srv.CDNURL = "https://cdn.example.com"
	srv.APIURL = "https://api.example.com"
	srv.Identify = identify

	ts := httptest.NewServer(srv)
	t.Cleanup(ts.Close)
	return srv, ts
}

// getJSON 发 GET 请求并解析 JSON。
func getJSON(t *testing.T, url string) (int, map[string]any) {
	t.Helper()
	resp, err := http.Get(url)
	if err != nil {
		t.Fatalf("GET %s: %v", url, err)
	}
	defer resp.Body.Close()

	var out map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("decode %s: %v", url, err)
	}
	return resp.StatusCode, out
}

// postJSON 发 POST 请求并解析 JSON。
func postJSON(t *testing.T, url string, body any) (int, map[string]any) {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			t.Fatalf("encode body: %v", err)
		}
	}
	resp, err := http.Post(url, "application/json", &buf)
	if err != nil {
		t.Fatalf("POST %s: %v", url, err)
	}
	defer resp.Body.Close()

	var out map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("decode %s: %v", url, err)
	}
	return resp.StatusCode, out
}

// ---------- 端到端：GET /api/work/{id} ----------

func TestHTTPWorkDetailEndToEnd(t *testing.T) {
	srv, ts := newTestServer(t, nil)
	workID, bookA, _ := seedWork(t, srv.DB)
	addFormat(t, srv.DB, bookA, "EPUB", "/library/a.epub", 1000)

	status, body := getJSON(t, ts.URL+"/api/work/"+itoa(workID))

	if status != http.StatusOK {
		t.Errorf("status = %d, want 200", status)
	}
	if body["err"] != "ok" {
		t.Errorf("err = %v, want ok", body["err"])
	}

	work, ok := body["work"].(map[string]any)
	if !ok {
		t.Fatalf("work 字段类型 = %T, want object", body["work"])
	}
	for _, k := range []string{"id", "title", "author", "title_norm", "author_norm", "version_count", "format_count"} {
		if _, ok := work[k]; !ok {
			t.Errorf("work 缺少字段 %q", k)
		}
	}

	versions, ok := body["versions"].([]any)
	if !ok {
		t.Fatalf("versions 类型 = %T, want array", body["versions"])
	}
	if len(versions) != 2 {
		t.Fatalf("versions 数 = %d, want 2", len(versions))
	}

	v0 := versions[0].(map[string]any)
	for _, k := range []string{"id", "title", "publisher", "pubdate", "edition_key", "suffixes", "img", "thumb", "files"} {
		if _, ok := v0[k]; !ok {
			t.Errorf("version 缺少字段 %q", k)
		}
	}
}

func TestHTTPWorkDetailFilesShape(t *testing.T) {
	srv, ts := newTestServer(t, nil)
	workID, bookA, _ := seedWork(t, srv.DB)
	addFormat(t, srv.DB, bookA, "EPUB", "/library/a.epub", 1000)

	_, body := getJSON(t, ts.URL+"/api/work/"+itoa(workID))
	versions := body["versions"].([]any)

	var found bool
	for _, raw := range versions {
		v := raw.(map[string]any)
		if int64(v["id"].(float64)) != bookA {
			continue
		}
		found = true
		files := v["files"].([]any)
		if len(files) != 1 {
			t.Fatalf("files 数 = %d, want 1", len(files))
		}
		f := files[0].(map[string]any)
		for _, k := range []string{"format", "size", "href", "online_readable"} {
			if _, ok := f[k]; !ok {
				t.Errorf("files[] 缺少字段 %q", k)
			}
		}
		if f["format"] != "EPUB" {
			t.Errorf("format = %v, want EPUB", f["format"])
		}
		if f["online_readable"] != true {
			t.Errorf("online_readable = %v, want true", f["online_readable"])
		}
	}
	if !found {
		t.Fatalf("未找到 book %d", bookA)
	}
}

func TestHTTPWorkDetailNotFound(t *testing.T) {
	_, ts := newTestServer(t, nil)

	status, body := getJSON(t, ts.URL+"/api/work/99999")
	if status != http.StatusOK {
		t.Errorf("status = %d, want 200（错误走 err 信封）", status)
	}
	if body["err"] != ErrWorkNotFound {
		t.Errorf("err = %v, want %v", body["err"], ErrWorkNotFound)
	}
}

// ---------- 端到端：GET /api/book/{id}/versions ----------

func TestHTTPBookVersionsEndToEnd(t *testing.T) {
	srv, ts := newTestServer(t, nil)
	_, bookA, bookB := seedWork(t, srv.DB)

	status, body := getJSON(t, ts.URL+"/api/book/"+itoa(bookA)+"/versions")

	if status != http.StatusOK {
		t.Errorf("status = %d, want 200", status)
	}
	if body["err"] != "ok" {
		t.Errorf("err = %v, want ok", body["err"])
	}
	if _, ok := body["work_id"]; !ok {
		t.Error("缺少 work_id 字段")
	}

	versions := body["versions"].([]any)
	if len(versions) != 1 {
		t.Fatalf("versions 数 = %d, want 1（不含当前书）", len(versions))
	}
	if int64(versions[0].(map[string]any)["id"].(float64)) != bookB {
		t.Errorf("versions[0].id 应为 %d", bookB)
	}
}

// ---------- 端到端：POST /api/book/{id}/merge ----------

func TestHTTPMergeEndToEnd(t *testing.T) {
	srv, ts := newTestServer(t, func(*http.Request) (Identity, error) {
		return Identity{UserID: 1, Username: "admin", IsAdmin: true}, nil
	})

	workA, err := library.FindOrCreateWork(srv.DB, "书A", "作者")
	if err != nil {
		t.Fatalf("work A: %v", err)
	}
	bookA, _, err := library.FindOrCreateEdition(srv.DB, workA, library.BookMeta{Title: "书A", Author: "作者"})
	if err != nil {
		t.Fatalf("book A: %v", err)
	}
	workB, err := library.FindOrCreateWork(srv.DB, "书B", "作者")
	if err != nil {
		t.Fatalf("work B: %v", err)
	}
	bookB, _, err := library.FindOrCreateEdition(srv.DB, workB, library.BookMeta{Title: "书B", Author: "作者"})
	if err != nil {
		t.Fatalf("book B: %v", err)
	}

	status, body := postJSON(t, ts.URL+"/api/book/"+itoa(bookA)+"/merge",
		map[string]any{"target_book_id": bookB})

	if status != http.StatusOK {
		t.Errorf("status = %d, want 200", status)
	}
	if body["err"] != "ok" {
		t.Fatalf("err = %v, want ok（body=%v）", body["err"], body)
	}
	for _, k := range []string{"work_id", "merged", "msg"} {
		if _, ok := body[k]; !ok {
			t.Errorf("merge 响应缺少字段 %q", k)
		}
	}

	// 两书必须共享 work_id
	gotA, _ := library.GetBookWorkID(srv.DB, bookA)
	gotB, _ := library.GetBookWorkID(srv.DB, bookB)
	if gotA != gotB {
		t.Errorf("合并后 work_id 不一致: %d vs %d", gotA, gotB)
	}
}

func TestHTTPMergeRequiresAuth(t *testing.T) {
	srv, ts := newTestServer(t, nil) // 游客
	workA, _ := library.FindOrCreateWork(srv.DB, "书A", "作者")
	bookA, _, _ := library.FindOrCreateEdition(srv.DB, workA, library.BookMeta{Title: "书A", Author: "作者"})

	status, body := postJSON(t, ts.URL+"/api/book/"+itoa(bookA)+"/merge",
		map[string]any{"target_book_id": 2})

	if status != http.StatusOK {
		t.Errorf("status = %d, want 200", status)
	}
	if body["err"] != ErrNeedLogin {
		t.Errorf("err = %v, want %v（@auth 等价）", body["err"], ErrNeedLogin)
	}
}

func TestHTTPMergeMissingTargetBookID(t *testing.T) {
	srv, ts := newTestServer(t, func(*http.Request) (Identity, error) {
		return Identity{UserID: 1, IsAdmin: true}, nil
	})
	workA, _ := library.FindOrCreateWork(srv.DB, "书A", "作者")
	bookA, _, _ := library.FindOrCreateEdition(srv.DB, workA, library.BookMeta{Title: "书A", Author: "作者"})

	_, body := postJSON(t, ts.URL+"/api/book/"+itoa(bookA)+"/merge", map[string]any{})
	if body["err"] != ErrMergeConflict {
		t.Errorf("err = %v, want %v", body["err"], ErrMergeConflict)
	}
}

func TestHTTPMergeConflictSameBook(t *testing.T) {
	srv, ts := newTestServer(t, func(*http.Request) (Identity, error) {
		return Identity{UserID: 1, IsAdmin: true}, nil
	})
	workA, _ := library.FindOrCreateWork(srv.DB, "书A", "作者")
	bookA, _, _ := library.FindOrCreateEdition(srv.DB, workA, library.BookMeta{Title: "书A", Author: "作者"})

	_, body := postJSON(t, ts.URL+"/api/book/"+itoa(bookA)+"/merge",
		map[string]any{"target_book_id": bookA})
	if body["err"] != ErrMergeConflict {
		t.Errorf("err = %v, want %v", body["err"], ErrMergeConflict)
	}
}

// ---------- 方法校验 ----------

func TestHTTPMethodNotAllowed(t *testing.T) {
	_, ts := newTestServer(t, nil)

	// /api/work/{id} 只允许 GET
	status, body := postJSON(t, ts.URL+"/api/work/1", nil)
	if status != http.StatusMethodNotAllowed {
		t.Errorf("status = %d, want 405", status)
	}
	if body["err"] != ErrMethodInvalid {
		t.Errorf("err = %v, want %v", body["err"], ErrMethodInvalid)
	}
}

// ---------- 未知路由 ----------

func TestHTTPUnknownRouteReturns404Envelope(t *testing.T) {
	_, ts := newTestServer(t, nil)

	status, body := getJSON(t, ts.URL+"/api/nonexistent")
	if status != http.StatusNotFound {
		t.Errorf("status = %d, want 404", status)
	}
	if body["err"] != ErrNotFound {
		t.Errorf("err = %v, want %v", body["err"], ErrNotFound)
	}
}

// ---------- @js 等价：自动补 msg ----------

func TestHTTPResponseAlwaysHasMsg(t *testing.T) {
	srv, ts := newTestServer(t, nil)
	workID, _, _ := seedWork(t, srv.DB)

	_, body := getJSON(t, ts.URL+"/api/work/"+itoa(workID))
	if _, ok := body["msg"]; !ok {
		t.Error("@js 等价语义要求响应含 msg 字段")
	}
}

// ---------- CORS 头 ----------

func TestHTTPCORSHeaders(t *testing.T) {
	srv, ts := newTestServer(t, nil)
	workID, _, _ := seedWork(t, srv.DB)

	resp, err := http.Get(ts.URL + "/api/work/" + itoa(workID))
	if err != nil {
		t.Fatalf("GET: %v", err)
	}
	defer resp.Body.Close()

	if got := resp.Header.Get("Access-Control-Allow-Origin"); got == "" {
		t.Error("缺少 Access-Control-Allow-Origin")
	}
	if got := resp.Header.Get("Access-Control-Allow-Credentials"); got != "true" {
		t.Errorf("Access-Control-Allow-Credentials = %q, want true", got)
	}
	if got := resp.Header.Get("Content-Type"); got != "application/json; charset=UTF-8" {
		t.Errorf("Content-Type = %q", got)
	}
}

// ---------- 游客可见性 ----------

func TestHTTPGuestSeesOnlyPublicBooks(t *testing.T) {
	srv, ts := newTestServer(t, nil)
	workID, _, bookB := seedWork(t, srv.DB)

	srv.IsPublic = func(identity Identity, bookID int64) (bool, error) {
		return bookID != bookB, nil
	}

	_, body := getJSON(t, ts.URL+"/api/work/"+itoa(workID))
	versions := body["versions"].([]any)
	for _, raw := range versions {
		v := raw.(map[string]any)
		if int64(v["id"].(float64)) == bookB {
			t.Error("游客不应看到私有书")
		}
	}
}

// ---------- 非法 id ----------

func TestHTTPInvalidIDReturnsEnvelope(t *testing.T) {
	_, ts := newTestServer(t, nil)

	// 正则只匹配数字，因此非数字路径会落到 404
	status, body := getJSON(t, ts.URL+"/api/work/abc")
	if status != http.StatusNotFound {
		t.Errorf("status = %d, want 404", status)
	}
	if body["err"] != ErrNotFound {
		t.Errorf("err = %v, want %v", body["err"], ErrNotFound)
	}
}

// ---------- NewServer 错误路径 ----------

func TestNewServerRejectsInvalidPattern(t *testing.T) {
	_, err := NewServer([]RouteSpec{
		{Pattern: "/api/bad/([0-9]+", Handler: func(*Context) (map[string]any, error) { return nil, nil }},
	})
	if err == nil {
		t.Error("非法正则应返回 error")
	}
}

func TestNewServerSkipsNilHandler(t *testing.T) {
	srv, err := NewServer([]RouteSpec{
		{Pattern: "/api/skipped"},
		{Pattern: "/api/kept", Handler: func(*Context) (map[string]any, error) { return nil, nil }},
	})
	if err != nil {
		t.Fatalf("NewServer: %v", err)
	}
	if len(srv.routes) != 1 {
		t.Errorf("路由数 = %d, want 1（无 handler 的应被跳过）", len(srv.routes))
	}
}

func TestNewServerDefaultsToGetAndPost(t *testing.T) {
	srv, err := NewServer([]RouteSpec{
		{Pattern: "/api/x", Handler: func(*Context) (map[string]any, error) { return nil, nil }},
	})
	if err != nil {
		t.Fatalf("NewServer: %v", err)
	}
	m := srv.routes[0].methods
	if !m[http.MethodGet] || !m[http.MethodPost] {
		t.Errorf("默认方法应含 GET 与 POST，实际 %v", m)
	}
}

// ---------- handler 返回 error 时转 exception ----------

func TestHTTPHandlerErrorBecomesExceptionEnvelope(t *testing.T) {
	srv, err := NewServer([]RouteSpec{
		{
			Pattern: "/api/boom",
			Handler: func(*Context) (map[string]any, error) {
				return nil, errBoom
			},
		},
	})
	if err != nil {
		t.Fatalf("NewServer: %v", err)
	}
	ts := httptest.NewServer(srv)
	defer ts.Close()

	status, body := getJSON(t, ts.URL+"/api/boom")
	if status != http.StatusOK {
		t.Errorf("status = %d, want 200（异常走 err 信封）", status)
	}
	if body["err"] != ErrException {
		t.Errorf("err = %v, want %v", body["err"], ErrException)
	}
}

// ---------- handler 返回 nil 时不写响应 ----------

func TestHTTPNilResponseWritesNothing(t *testing.T) {
	srv, err := NewServer([]RouteSpec{
		{
			Pattern: "/api/nil",
			Handler: func(*Context) (map[string]any, error) {
				return nil, nil
			},
		},
	})
	if err != nil {
		t.Fatalf("NewServer: %v", err)
	}
	ts := httptest.NewServer(srv)
	defer ts.Close()

	resp, err := http.Get(ts.URL + "/api/nil")
	if err != nil {
		t.Fatalf("GET: %v", err)
	}
	defer resp.Body.Close()

	// 未写响应 → Go 默认 200 且空 body
	if resp.StatusCode != http.StatusOK {
		t.Errorf("status = %d, want 200", resp.StatusCode)
	}
}

// ---------- Identify 返回 error ----------

func TestHTTPIdentifyErrorBecomesException(t *testing.T) {
	_, ts := newTestServer(t, func(*http.Request) (Identity, error) {
		return Identity{}, errBoom
	})

	status, body := getJSON(t, ts.URL+"/api/work/1")
	if status != http.StatusOK {
		t.Errorf("status = %d, want 200", status)
	}
	if body["err"] != ErrException {
		t.Errorf("err = %v, want %v", body["err"], ErrException)
	}
}

// ---------- Context.Param 越界 ----------

func TestContextParamOutOfRange(t *testing.T) {
	ctx := &Context{Params: []string{"a"}}
	if got := ctx.Param(5); got != "" {
		t.Errorf("越界 Param 应返回空串，实际 %q", got)
	}
	if got := ctx.Param(-1); got != "" {
		t.Errorf("负索引 Param 应返回空串，实际 %q", got)
	}
	if got := ctx.Param(0); got != "a" {
		t.Errorf("Param(0) = %q, want a", got)
	}
}

// ---------- Identity.IsGuest ----------

func TestIdentityIsGuest(t *testing.T) {
	if !(Identity{}).IsGuest() {
		t.Error("UserID 为 0 应视为游客")
	}
	if (Identity{UserID: 1}).IsGuest() {
		t.Error("UserID 非 0 不应视为游客")
	}
}

// ---------- 路由表与 RouteSpec 一致性 ----------

func TestWorkRouteSpecsMatchRegisteredRoutes(t *testing.T) {
	specs := WorkRouteSpecs()
	registered := map[string]bool{}
	for _, r := range NewRoutes() {
		registered[r.Pattern] = true
	}
	if len(specs) != len(registered) {
		t.Fatalf("RouteSpec 数 = %d, 注册路由数 = %d", len(specs), len(registered))
	}
	for _, s := range specs {
		if !registered[s.Pattern] {
			t.Errorf("RouteSpec %q 未在路由注册表中", s.Pattern)
		}
	}
}

func TestWorkRouteSpecsMergeRequiresAuth(t *testing.T) {
	for _, s := range WorkRouteSpecs() {
		if s.Pattern == "/api/book/([0-9]+)/merge" && !s.Auth {
			t.Error("/merge 必须要求 @auth")
		}
	}
}

// errBoom 是一个用于测试错误传播的哨兵错误。
var errBoom = errors.New("boom")
