package httpapi

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// freeAddr 返回一个空闲的本地地址。
func freeAddr(t *testing.T) string {
	t.Helper()
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	addr := l.Addr().String()
	_ = l.Close()
	return addr
}

// startServe 在后台启动 Serve，返回地址与取消函数。
func startServe(t *testing.T, opts ServeOptions) (string, context.CancelFunc) {
	t.Helper()
	opts.Addr = freeAddr(t)
	ctx, cancel := context.WithCancel(context.Background())

	done := make(chan error, 1)
	go func() { done <- Serve(ctx, opts) }()

	// 等待端口就绪。
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		conn, err := net.DialTimeout("tcp", opts.Addr, 200*time.Millisecond)
		if err == nil {
			_ = conn.Close()
			t.Cleanup(func() {
				cancel()
				select {
				case <-done:
				case <-time.After(5 * time.Second):
					t.Error("Serve 未在 5s 内退出")
				}
			})
			return opts.Addr, cancel
		}
		time.Sleep(20 * time.Millisecond)
	}
	cancel()
	t.Fatal("Serve 未在 5s 内就绪")
	return "", nil
}

// TestServeEndToEndLocalRoute 已实现路由由 booksvr 本地服务。
func TestServeEndToEndLocalRoute(t *testing.T) {
	_, dbPath := newTestDBFile(t)
	up := newUpstream(t, func(w http.ResponseWriter, r *http.Request) {
		t.Errorf("已实现路由不应走代理: %s", r.URL.Path)
	})

	addr, _ := startServe(t, ServeOptions{
		DBPath:       dbPath,
		TornadoURL:   up.URL,
		ServeRoutes:  []string{"/api/work/([0-9]+)"},
		CookieSecret: testSecret,
	})

	resp, err := http.Get("http://" + addr + "/api/work/1")
	if err != nil {
		t.Fatalf("GET: %v", err)
	}
	defer resp.Body.Close()

	var out map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("解析响应失败: %v", err)
	}
	if _, ok := out["work"]; !ok {
		t.Fatalf("应返回 work 字段，实际 %v", out)
	}
}

// TestServeEndToEndProxiedRoute 未实现路由被代理到上游。
func TestServeEndToEndProxiedRoute(t *testing.T) {
	_, dbPath := newTestDBFile(t)
	up := newUpstream(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"err":"ok","from":"upstream"}`))
	})

	addr, _ := startServe(t, ServeOptions{
		DBPath:       dbPath,
		TornadoURL:   up.URL,
		ServeRoutes:  nil,
		CookieSecret: testSecret,
	})

	resp, err := http.Get("http://" + addr + "/api/welcome")
	if err != nil {
		t.Fatalf("GET: %v", err)
	}
	defer resp.Body.Close()

	body := make([]byte, 256)
	n, _ := resp.Body.Read(body)
	if !strings.Contains(string(body[:n]), "upstream") {
		t.Fatalf("响应应来自上游，实际 %s", string(body[:n]))
	}
}

// TestServeAuthEnforced 未登录访问 @auth 路由返回 200 + user.need_login。
func TestServeAuthEnforced(t *testing.T) {
	_, dbPath := newTestDBFile(t)
	up := newUpstream(t, func(w http.ResponseWriter, r *http.Request) {
		t.Error("merge 路由不应走代理")
	})

	addr, _ := startServe(t, ServeOptions{
		DBPath:       dbPath,
		TornadoURL:   up.URL,
		ServeRoutes:  []string{"/api/book/([0-9]+)/merge"},
		CookieSecret: testSecret,
	})

	resp, err := http.Post("http://"+addr+"/api/book/1/merge", "application/json", strings.NewReader(`{"target_book_id":2}`))
	if err != nil {
		t.Fatalf("POST: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("状态码 = %d, want 200（@auth 等价语义不抛 HTTP 异常）", resp.StatusCode)
	}
	var out map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("解析响应失败: %v", err)
	}
	if out["err"] != ErrNeedLogin {
		t.Fatalf("err = %v, want %s", out["err"], ErrNeedLogin)
	}
}

// TestServeGracefulShutdown 取消 ctx 后服务退出。
func TestServeGracefulShutdown(t *testing.T) {
	_, dbPath := newTestDBFile(t)
	up := newUpstream(t, func(w http.ResponseWriter, r *http.Request) {})

	addr, cancel := startServe(t, ServeOptions{
		DBPath:       dbPath,
		TornadoURL:   up.URL,
		CookieSecret: testSecret,
	})

	cancel()
	// 端口应在短时间内释放。
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		conn, err := net.DialTimeout("tcp", addr, 200*time.Millisecond)
		if err != nil {
			return // 已释放
		}
		_ = conn.Close()
		time.Sleep(50 * time.Millisecond)
	}
	t.Fatal("取消后端口未释放")
}

// TestServeRequiresDBPath 缺少 DBPath 应报错。
func TestServeRequiresDBPath(t *testing.T) {
	if err := Serve(context.Background(), ServeOptions{CookieSecret: "x"}); err == nil {
		t.Fatal("缺少 DBPath 应报错")
	}
}

// TestServeRequiresCookieSecret 缺少 CookieSecret 应报错。
func TestServeRequiresCookieSecret(t *testing.T) {
	_, dbPath := newTestDBFile(t)
	if err := Serve(context.Background(), ServeOptions{DBPath: dbPath}); err == nil {
		t.Fatal("缺少 CookieSecret 应报错")
	}
}

// TestServeUpstreamDownReturns502 上游不可达时经 serve 返回 502。
func TestServeUpstreamDownReturns502(t *testing.T) {
	_, dbPath := newTestDBFile(t)
	dead := httptest.NewServer(http.NotFoundHandler())
	deadURL := dead.URL
	dead.Close()

	addr, _ := startServe(t, ServeOptions{
		DBPath:       dbPath,
		TornadoURL:   deadURL,
		CookieSecret: testSecret,
	})

	resp, err := http.Get("http://" + addr + "/api/welcome")
	if err != nil {
		t.Fatalf("GET: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusBadGateway {
		t.Fatalf("状态码 = %d, want 502", resp.StatusCode)
	}
}
