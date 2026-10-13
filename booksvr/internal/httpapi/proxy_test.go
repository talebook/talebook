package httpapi

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// newUpstream 起一个假上游，返回其 URL 与收到的请求记录。
func newUpstream(t *testing.T, handler http.HandlerFunc) *httptest.Server {
	t.Helper()
	ts := httptest.NewServer(handler)
	t.Cleanup(ts.Close)
	return ts
}

// newDispatcherForTest 用测试库装配分派器。
func newDispatcherForTest(t *testing.T, upstreamURL string, routes []string, all bool) *Dispatcher {
	t.Helper()
	db := newTestDB(t)
	srv, err := NewServer(WorkRouteSpecs())
	if err != nil {
		t.Fatalf("NewServer: %v", err)
	}
	srv.DB = db
	srv.CDNURL = "https://cdn.example.com"
	srv.APIURL = "https://api.example.com"

	d, err := NewDispatcher(srv, upstreamURL, routes, all)
	if err != nil {
		t.Fatalf("NewDispatcher: %v", err)
	}
	return d
}

// TestDispatchEmptyWhitelistGoesToProxy 白名单为空时全部走代理。
func TestDispatchEmptyWhitelistGoesToProxy(t *testing.T) {
	var hit bool
	up := newUpstream(t, func(w http.ResponseWriter, r *http.Request) {
		hit = true
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"err":"ok","from":"upstream"}`))
	})
	d := newDispatcherForTest(t, up.URL, nil, false)

	rec := httptest.NewRecorder()
	d.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/work/1", nil))

	if !hit {
		t.Fatal("白名单为空时应走代理")
	}
	if !strings.Contains(rec.Body.String(), "upstream") {
		t.Fatalf("响应应来自上游，实际 %s", rec.Body.String())
	}
}

// TestDispatchWhitelistedImplementedRouteGoesLocal 白名单命中的已实现路由本地处理。
func TestDispatchWhitelistedImplementedRouteGoesLocal(t *testing.T) {
	up := newUpstream(t, func(w http.ResponseWriter, r *http.Request) {
		t.Error("不应走代理")
	})
	d := newDispatcherForTest(t, up.URL, []string{"/api/work/([0-9]+)"}, false)

	rec := httptest.NewRecorder()
	d.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/work/1", nil))

	if rec.Code != http.StatusOK {
		t.Fatalf("状态码 = %d, want 200", rec.Code)
	}
	var out map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("解析响应失败: %v", err)
	}
	if _, ok := out["work"]; !ok {
		t.Fatalf("应返回 work 字段，实际 %v", out)
	}
}

// TestDispatchWhitelistedButUnimplementedGoesToProxy 白名单含无 handler 的路由仍走代理。
func TestDispatchWhitelistedButUnimplementedGoesToProxy(t *testing.T) {
	var hit bool
	up := newUpstream(t, func(w http.ResponseWriter, r *http.Request) {
		hit = true
		_, _ = w.Write([]byte(`{"err":"ok","from":"upstream"}`))
	})
	// /api/welcome 在 218 条全表中存在，但没有 Go handler。
	d := newDispatcherForTest(t, up.URL, []string{"/api/welcome"}, false)

	rec := httptest.NewRecorder()
	d.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/welcome", nil))

	if !hit {
		t.Fatal("无 handler 的路由即使命中白名单也应走代理")
	}
	if rec.Code == http.StatusNotFound {
		t.Fatal("不得静默 404")
	}
}

// TestDispatchAllGoesLocalForImplemented all 时已实现路由本地处理。
func TestDispatchAllGoesLocalForImplemented(t *testing.T) {
	up := newUpstream(t, func(w http.ResponseWriter, r *http.Request) {
		t.Errorf("已实现路由不应走代理: %s", r.URL.Path)
	})
	d := newDispatcherForTest(t, up.URL, nil, true)

	rec := httptest.NewRecorder()
	d.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/book/1/versions", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("状态码 = %d, want 200", rec.Code)
	}
}

// TestDispatchUnknownPathGoesToProxy 未注册路径走代理，不得静默 404。
func TestDispatchUnknownPathGoesToProxy(t *testing.T) {
	var hit bool
	up := newUpstream(t, func(w http.ResponseWriter, r *http.Request) {
		hit = true
		_, _ = w.Write([]byte(`{"err":"ok"}`))
	})
	d := newDispatcherForTest(t, up.URL, nil, false)

	rec := httptest.NewRecorder()
	d.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/totally/unknown", nil))

	if !hit {
		t.Fatal("未知路径应走代理")
	}
	if rec.Code == http.StatusNotFound {
		t.Fatal("不得静默 404")
	}
}

// TestDispatchCatchAllNotServedLocally catch-all 路由不得被本地处理。
func TestDispatchCatchAllNotServedLocally(t *testing.T) {
	var hit bool
	up := newUpstream(t, func(w http.ResponseWriter, r *http.Request) {
		hit = true
		_, _ = w.Write([]byte(`{"err":"ok"}`))
	})
	// 即使白名单含 catch-all，它也没有 handler，必须走代理。
	d := newDispatcherForTest(t, up.URL, []string{"/(.*)"}, false)

	rec := httptest.NewRecorder()
	d.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/anything/at/all", nil))

	if !hit {
		t.Fatal("catch-all 无 handler，应走代理")
	}
}

// --- 代理行为 ---

// TestProxyForwardsToUpstream 断言路径、方法、body 被转发。
func TestProxyForwardsToUpstream(t *testing.T) {
	var gotPath, gotMethod, gotBody string
	up := newUpstream(t, func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotMethod = r.Method
		b, _ := io.ReadAll(r.Body)
		gotBody = string(b)
		_, _ = w.Write([]byte(`{"err":"ok"}`))
	})
	d := newDispatcherForTest(t, up.URL, nil, false)

	req := httptest.NewRequest(http.MethodPost, "/api/some/route", strings.NewReader(`{"a":1}`))
	rec := httptest.NewRecorder()
	d.ServeHTTP(rec, req)

	if gotPath != "/api/some/route" || gotMethod != http.MethodPost || gotBody != `{"a":1}` {
		t.Fatalf("转发错误: path=%q method=%q body=%q", gotPath, gotMethod, gotBody)
	}
}

// TestProxyPreservesHostAndForwardedHeaders 断言 Host 与转发头。
func TestProxyPreservesHostAndForwardedHeaders(t *testing.T) {
	var gotHost, gotXFF, gotScheme string
	up := newUpstream(t, func(w http.ResponseWriter, r *http.Request) {
		gotHost = r.Host
		gotXFF = r.Header.Get("X-Forwarded-For")
		gotScheme = r.Header.Get("X-Scheme")
		_, _ = w.Write([]byte(`{"err":"ok"}`))
	})
	d := newDispatcherForTest(t, up.URL, nil, false)

	req := httptest.NewRequest(http.MethodGet, "/api/x", nil)
	req.Host = "talebook.example.com"
	rec := httptest.NewRecorder()
	d.ServeHTTP(rec, req)

	if gotHost != "talebook.example.com" {
		t.Errorf("Host = %q, want talebook.example.com", gotHost)
	}
	if gotXFF == "" {
		t.Error("X-Forwarded-For 应被补充")
	}
	if gotScheme == "" {
		t.Error("X-Scheme 应被补充")
	}
}

// TestProxyUpstreamDownReturns502 上游不可达应返回 502 + 明确错误码。
func TestProxyUpstreamDownReturns502(t *testing.T) {
	// 起一个立即关闭的上游，拿到一个不可达地址。
	up := httptest.NewServer(http.NotFoundHandler())
	deadURL := up.URL
	up.Close()

	d := newDispatcherForTest(t, deadURL, nil, false)
	rec := httptest.NewRecorder()
	d.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/x", nil))

	if rec.Code != http.StatusBadGateway {
		t.Fatalf("状态码 = %d, want 502", rec.Code)
	}
	var out map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("解析响应失败: %v", err)
	}
	if out["err"] != ErrUpstreamUnavailable {
		t.Fatalf("err = %v, want %s", out["err"], ErrUpstreamUnavailable)
	}
}

// TestProxyDoesNotSwallowResponseHeaders 上游响应头原样透传。
func TestProxyDoesNotSwallowResponseHeaders(t *testing.T) {
	up := newUpstream(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/epub+zip")
		w.Header().Set("Set-Cookie", "a=b")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("data"))
	})
	d := newDispatcherForTest(t, up.URL, nil, false)

	rec := httptest.NewRecorder()
	d.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/get/1/x.epub", nil))

	if ct := rec.Header().Get("Content-Type"); ct != "application/epub+zip" {
		t.Errorf("Content-Type = %q", ct)
	}
	if sc := rec.Header().Get("Set-Cookie"); sc != "a=b" {
		t.Errorf("Set-Cookie = %q", sc)
	}
}

// TestProxyPreservesCacheAndRangeHeaders 缓存与字节范围头必须透传。
func TestProxyPreservesCacheAndRangeHeaders(t *testing.T) {
	up := newUpstream(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "private, no-store")
		w.Header().Set("Accept-Ranges", "bytes")
		w.Header().Set("Content-Range", "bytes 0-99/1000")
		w.WriteHeader(http.StatusPartialContent)
		_, _ = w.Write([]byte("partial"))
	})
	d := newDispatcherForTest(t, up.URL, nil, false)

	rec := httptest.NewRecorder()
	d.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/read/resource/1.epub", nil))

	if cc := rec.Header().Get("Cache-Control"); cc != "private, no-store" {
		t.Errorf("Cache-Control = %q", cc)
	}
	if ar := rec.Header().Get("Accept-Ranges"); ar != "bytes" {
		t.Errorf("Accept-Ranges = %q", ar)
	}
	if cr := rec.Header().Get("Content-Range"); cr != "bytes 0-99/1000" {
		t.Errorf("Content-Range = %q", cr)
	}
	if rec.Code != http.StatusPartialContent {
		t.Errorf("状态码 = %d, want 206", rec.Code)
	}
}
