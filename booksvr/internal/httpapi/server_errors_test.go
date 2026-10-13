package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	_ "modernc.org/sqlite"

	"talebook/booksvr/internal/library"
)

// brokenServer 返回一个 DB 已关闭的服务器，用于触发 handler 的错误传播。
func brokenServer(t *testing.T) *httptest.Server {
	t.Helper()
	db := newTestDB(t)
	if err := db.Close(); err != nil {
		t.Fatalf("close db: %v", err)
	}

	srv, err := NewServer(WorkRouteSpecs())
	if err != nil {
		t.Fatalf("NewServer: %v", err)
	}
	srv.DB = db
	srv.Identify = func(*http.Request) (Identity, error) {
		return Identity{UserID: 1, IsAdmin: true}, nil
	}

	ts := httptest.NewServer(srv)
	t.Cleanup(ts.Close)
	return ts
}

// ---------- handler 错误传播 ----------

func TestHTTPWorkDetailDBErrorBecomesException(t *testing.T) {
	ts := brokenServer(t)

	_, body := getJSON(t, ts.URL+"/api/work/1")
	if body["err"] != ErrException {
		t.Errorf("err = %v, want %v", body["err"], ErrException)
	}
}

func TestHTTPBookVersionsDBErrorBecomesException(t *testing.T) {
	ts := brokenServer(t)

	_, body := getJSON(t, ts.URL+"/api/book/1/versions")
	if body["err"] != ErrException {
		t.Errorf("err = %v, want %v", body["err"], ErrException)
	}
}

func TestHTTPMergeDBErrorBecomesException(t *testing.T) {
	ts := brokenServer(t)

	_, body := postJSON(t, ts.URL+"/api/book/1/merge", map[string]any{"target_book_id": 2})
	if body["err"] != ErrException {
		t.Errorf("err = %v, want %v", body["err"], ErrException)
	}
}

// ---------- parseID 失败 ----------

func TestParseIDRejectsNonNumeric(t *testing.T) {
	if _, err := parseID("abc"); err == nil {
		t.Error("非数字应返回 error")
	}
	if _, err := parseID(""); err == nil {
		t.Error("空串应返回 error")
	}
	if got, err := parseID("42"); err != nil || got != 42 {
		t.Errorf("parseID(42) = %d, %v", got, err)
	}
}

// TestHTTPHandlersRejectNonNumericID 覆盖 handler 里 parseID 失败的分支。
//
// 手法：直接调用 handler，绕过路由正则（正则只匹配数字，
// 因此 HTTP 层无法构造出非数字捕获组）。
func TestHTTPHandlersRejectNonNumericID(t *testing.T) {
	ctx := &Context{Params: []string{"abc"}}

	resp, err := handleWorkDetail(ctx)
	if err != nil {
		t.Fatalf("handleWorkDetail: %v", err)
	}
	if resp["err"] != ErrWorkNotFound {
		t.Errorf("err = %v, want %v", resp["err"], ErrWorkNotFound)
	}

	resp, err = handleBookVersions(ctx)
	if err != nil {
		t.Fatalf("handleBookVersions: %v", err)
	}
	if resp["err"] != ErrBookNotFound {
		t.Errorf("err = %v, want %v", resp["err"], ErrBookNotFound)
	}

	resp, err = handleMergeBooks(ctx)
	if err != nil {
		t.Fatalf("handleMergeBooks: %v", err)
	}
	if resp["err"] != ErrBookNotFound {
		t.Errorf("err = %v, want %v", resp["err"], ErrBookNotFound)
	}
}

// ---------- merge body 解析失败 ----------

func TestHTTPMergeInvalidJSONBody(t *testing.T) {
	srv, ts := newTestServer(t, func(*http.Request) (Identity, error) {
		return Identity{UserID: 1, IsAdmin: true}, nil
	})
	workA, _ := library.FindOrCreateWork(srv.DB, "书A", "作者")
	bookA, _, _ := library.FindOrCreateEdition(srv.DB, workA, library.BookMeta{Title: "书A", Author: "作者"})

	resp, err := http.Post(
		ts.URL+"/api/book/"+itoa(bookA)+"/merge",
		"application/json",
		strings.NewReader("{not json"),
	)
	if err != nil {
		t.Fatalf("POST: %v", err)
	}
	defer resp.Body.Close()

	var body map[string]any
	if err := decodeJSON(resp, &body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if body["err"] != ErrMergeConflict {
		t.Errorf("err = %v, want %v", body["err"], ErrMergeConflict)
	}
}

// ---------- merge 目标书不存在 ----------

func TestHTTPMergeTargetNotFound(t *testing.T) {
	srv, ts := newTestServer(t, func(*http.Request) (Identity, error) {
		return Identity{UserID: 1, IsAdmin: true}, nil
	})
	workA, _ := library.FindOrCreateWork(srv.DB, "书A", "作者")
	bookA, _, _ := library.FindOrCreateEdition(srv.DB, workA, library.BookMeta{Title: "书A", Author: "作者"})

	_, body := postJSON(t, ts.URL+"/api/book/"+itoa(bookA)+"/merge",
		map[string]any{"target_book_id": 99999})
	if body["err"] != ErrBookNotFound {
		t.Errorf("err = %v, want %v", body["err"], ErrBookNotFound)
	}
}

// ---------- ServeHTTP 的 Auth 分支（Admin 未覆盖） ----------

func TestHTTPAdminRouteRejectsNonAdmin(t *testing.T) {
	db := newTestDB(t)
	srv, err := NewServer([]RouteSpec{
		{
			Pattern: "/api/admin/only",
			Admin:   true,
			Handler: func(*Context) (map[string]any, error) {
				return map[string]any{"err": "ok"}, nil
			},
		},
	})
	if err != nil {
		t.Fatalf("NewServer: %v", err)
	}
	srv.DB = db
	srv.Identify = func(*http.Request) (Identity, error) {
		return Identity{UserID: 7, IsAdmin: false}, nil
	}
	ts := httptest.NewServer(srv)
	defer ts.Close()

	_, body := getJSON(t, ts.URL+"/api/admin/only")
	if body["err"] != ErrNotAdmin {
		t.Errorf("err = %v, want %v", body["err"], ErrNotAdmin)
	}
}

func TestHTTPAdminRouteAllowsAdmin(t *testing.T) {
	db := newTestDB(t)
	srv, err := NewServer([]RouteSpec{
		{
			Pattern: "/api/admin/only",
			Admin:   true,
			Handler: func(*Context) (map[string]any, error) {
				return map[string]any{"err": "ok"}, nil
			},
		},
	})
	if err != nil {
		t.Fatalf("NewServer: %v", err)
	}
	srv.DB = db
	srv.Identify = func(*http.Request) (Identity, error) {
		return Identity{UserID: 7, IsAdmin: true}, nil
	}
	ts := httptest.NewServer(srv)
	defer ts.Close()

	_, body := getJSON(t, ts.URL+"/api/admin/only")
	if body["err"] != "ok" {
		t.Errorf("err = %v, want ok", body["err"])
	}
}

// ---------- 多路由匹配顺序 ----------

func TestHTTPFirstMatchingRouteWins(t *testing.T) {
	db := newTestDB(t)
	srv, err := NewServer([]RouteSpec{
		{
			Pattern: "/api/x/([0-9]+)",
			Handler: func(*Context) (map[string]any, error) {
				return map[string]any{"err": "first"}, nil
			},
		},
		{
			Pattern: "/api/x/([0-9]+)",
			Handler: func(*Context) (map[string]any, error) {
				return map[string]any{"err": "second"}, nil
			},
		},
	})
	if err != nil {
		t.Fatalf("NewServer: %v", err)
	}
	srv.DB = db
	ts := httptest.NewServer(srv)
	defer ts.Close()

	_, body := getJSON(t, ts.URL+"/api/x/1")
	if body["err"] != "first" {
		t.Errorf("err = %v, want first（先注册者优先）", body["err"])
	}
}

// ---------- 无 Identify 时视为游客 ----------

func TestHTTPNilIdentifyIsGuest(t *testing.T) {
	db := newTestDB(t)
	srv, err := NewServer([]RouteSpec{
		{
			Pattern: "/api/me",
			Auth:    true,
			Handler: func(*Context) (map[string]any, error) {
				return map[string]any{"err": "ok"}, nil
			},
		},
	})
	if err != nil {
		t.Fatalf("NewServer: %v", err)
	}
	srv.DB = db
	// Identify 为 nil
	ts := httptest.NewServer(srv)
	defer ts.Close()

	_, body := getJSON(t, ts.URL+"/api/me")
	if body["err"] != ErrNeedLogin {
		t.Errorf("err = %v, want %v", body["err"], ErrNeedLogin)
	}
}

// ---------- 空路由表 ----------

func TestHTTPEmptyRouteTableReturns404(t *testing.T) {
	srv, err := NewServer(nil)
	if err != nil {
		t.Fatalf("NewServer: %v", err)
	}
	ts := httptest.NewServer(srv)
	defer ts.Close()

	status, body := getJSON(t, ts.URL+"/anything")
	if status != http.StatusNotFound {
		t.Errorf("status = %d, want 404", status)
	}
	if body["err"] != ErrNotFound {
		t.Errorf("err = %v, want %v", body["err"], ErrNotFound)
	}
}

// ---------- WorkService 权限注入 ----------

func TestHTTPWorkDetailUsesInjectedIsPublic(t *testing.T) {
	srv, ts := newTestServer(t, nil)
	workID, _, bookB := seedWork(t, srv.DB)

	var called bool
	srv.IsPublic = func(identity Identity, bookID int64) (bool, error) {
		called = true
		return bookID != bookB, nil
	}

	_, body := getJSON(t, ts.URL+"/api/work/"+itoa(workID))
	if !called {
		t.Error("IsPublic 应被调用（can_view_book 等价）")
	}
	versions := body["versions"].([]any)
	if len(versions) != 1 {
		t.Errorf("versions 数 = %d, want 1", len(versions))
	}
}

func TestHTTPWorkDetailIsPublicErrorBecomesException(t *testing.T) {
	srv, ts := newTestServer(t, nil)
	workID, _, _ := seedWork(t, srv.DB)

	srv.IsPublic = func(Identity, int64) (bool, error) {
		return false, errors.New("权限查询失败")
	}

	_, body := getJSON(t, ts.URL+"/api/work/"+itoa(workID))
	if body["err"] != ErrException {
		t.Errorf("err = %v, want %v", body["err"], ErrException)
	}
}

// ---------- 辅助 ----------

// decodeJSON 从响应体解析 JSON。
func decodeJSON(resp *http.Response, out any) error {
	defer resp.Body.Close()
	return json.NewDecoder(resp.Body).Decode(out)
}
