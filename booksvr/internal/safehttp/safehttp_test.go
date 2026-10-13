package safehttp

import (
	"context"
	"errors"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"talebook/booksvr/internal/pluginproto"
)

// fixedResolver 返回固定地址列表。
func fixedResolver(addrs ...string) Resolver {
	return func(host string, port int) ([]string, error) { return addrs, nil }
}

// failResolver 模拟解析失败。
func failResolver() Resolver {
	return func(host string, port int) ([]string, error) { return nil, errors.New("nope") }
}

// TestValidateRemoteEndpointVectors 用 Python 实测向量逐条校验。
func TestValidateRemoteEndpointVectors(t *testing.T) {
	public := fixedResolver("93.184.216.34")
	cases := []struct {
		label   string
		url     string
		allowed []string
		res     Resolver
		enforce bool
		wantErr string
	}{
		{"http_ok", "http://example.com/x", nil, public, true, ""},
		{"https_ok", "https://example.com/x", nil, public, true, ""},
		{"ftp", "ftp://example.com/x", nil, public, true, "Endpoint must be an absolute HTTP(S) URL"},
		{"relative", "/x", nil, public, true, "Endpoint must be an absolute HTTP(S) URL"},
		{"creds", "http://u:p@example.com/x", nil, public, true, "Credentials are not allowed in endpoint URLs"},
		{"allowlist", "http://example.com/x", []string{"example.com"}, public, true, ""},
		{"allowlist_dot", "http://example.com/x", []string{"example.com."}, public, true, ""},
		{"private", "http://example.com/x", nil, fixedResolver("10.0.0.1"), true, "Endpoint resolves to a non-public address"},
		{"loopback", "http://example.com/x", nil, fixedResolver("127.0.0.1"), true, "Endpoint resolves to a non-public address"},
		{"linklocal", "http://example.com/x", nil, fixedResolver("169.254.1.1"), true, "Endpoint resolves to a non-public address"},
		{"enforce_off", "http://example.com/x", nil, fixedResolver("10.0.0.1"), false, ""},
		{"ipv6_global", "http://example.com/x", nil, fixedResolver("2606:2800:220:1:248:1893:25c8:1946"), true, ""},
		{"ipv6_loop", "http://example.com/x", nil, fixedResolver("::1"), true, "Endpoint resolves to a non-public address"},
		{"badport", "http://example.com:99999/x", nil, public, true, "Endpoint URL is invalid"},
		{"empty", "http://example.com/x", nil, fixedResolver(), true, "Endpoint hostname did not resolve to an address"},
		{"failres", "http://example.com/x", nil, failResolver(), true, "Endpoint hostname could not be resolved"},
	}
	for _, c := range cases {
		_, err := ValidateRemoteEndpoint(c.url, c.allowed, c.res, c.enforce)
		if c.wantErr == "" {
			if err != nil {
				t.Errorf("%s: 期望通过，得到 %v", c.label, err)
			}
			continue
		}
		if err == nil {
			t.Errorf("%s: 期望 %q，但通过了", c.label, c.wantErr)
			continue
		}
		if err.Error() != c.wantErr {
			t.Errorf("%s: msg = %q, want %q", c.label, err.Error(), c.wantErr)
		}
	}
}

// TestIsGlobalIPVectors 用 Python 实测的 is_global 表逐条校验。
func TestIsGlobalIPVectors(t *testing.T) {
	cases := map[string]bool{
		"0.0.0.0": false, "10.0.0.1": false, "100.64.0.1": false,
		"127.0.0.1": false, "169.254.0.1": false, "172.16.0.1": false,
		"192.0.0.1": false, "192.0.2.1": false, "192.88.99.1": true,
		"192.168.0.1": false, "198.18.0.1": false, "198.51.100.1": false,
		"203.0.113.1": false, "224.0.0.1": true, "233.252.0.1": true,
		"239.255.255.255": true, "240.0.0.1": false, "255.255.255.255": false,
		"8.8.8.8": true, "1.1.1.1": true,
		"::1": false, "::": false, "fe80::1": false, "fc00::1": false,
		"2001:db8::1": false, "ff02::1": true,
		"2606:2800:220:1:248:1893:25c8:1946": true,
	}
	for addr, want := range cases {
		ip := net.ParseIP(addr)
		if ip == nil {
			t.Fatalf("无法解析 %q", addr)
		}
		if got := isGlobalIP(ip); got != want {
			t.Errorf("isGlobalIP(%s) = %v, want %v", addr, got, want)
		}
	}
}

// TestEndpointErrorCodes 覆盖错误码。
func TestEndpointErrorCodes(t *testing.T) {
	_, err := ValidateRemoteEndpoint("ftp://x/y", nil, fixedResolver("1.1.1.1"), true)
	var pe *EndpointPolicyError
	if !errors.As(err, &pe) {
		t.Fatalf("错误类型 = %T", err)
	}
	if pe.Code != "book_source.endpoint_blocked" {
		t.Errorf("code = %q", pe.Code)
	}

	e := NewEndpointResponseTooLarge("big")
	if e.Code != "book_source.response_too_large" {
		t.Errorf("code = %q", e.Code)
	}

	q := NewHostQueueTimeout("")
	if q.Code != "plugin.host_queue_timeout" {
		t.Errorf("code = %q", q.Code)
	}
	if q.ErrorType != "timeout" {
		t.Errorf("error_type = %q", q.ErrorType)
	}
	if q.Message != "Plugin host queue deadline expired" {
		t.Errorf("msg = %q", q.Message)
	}
}

// TestClampLimit 覆盖并发上限夹取。
func TestClampLimit(t *testing.T) {
	cases := map[int]int{0: 1, -5: 1, 1: 1, 10: 10, 100: 100, 101: 100, 999: 100}
	for in, want := range cases {
		if got := clampLimit(in); got != want {
			t.Errorf("clampLimit(%d) = %d, want %d", in, got, want)
		}
	}
}

// TestMinLimit 覆盖最严格限制计算。
func TestMinLimit(t *testing.T) {
	if got := minLimit(map[int]int{5: 1, 10: 2}); got != 5 {
		t.Errorf("minLimit = %d, want 5", got)
	}
	if got := minLimit(map[int]int{}); got != 0 {
		t.Errorf("空 map = %d, want 0", got)
	}
}

// TestHostQueueKey 覆盖队列键归一化。
func TestHostQueueKey(t *testing.T) {
	q := NewHostQueue()
	k, ok := q.key("plug", "https://Example.COM./x")
	if !ok || k.plugin != "plug" || k.hostname != "example.com" || k.port != 443 {
		t.Errorf("得到 (%+v,%v)", k, ok)
	}
	k, ok = q.key("plug", "http://example.com:8080/x")
	if !ok || k.port != 8080 {
		t.Errorf("显式端口得到 (%+v,%v)", k, ok)
	}
	if _, ok := q.key("", "http://example.com/x"); ok {
		t.Error("空插件键应返回 false")
	}
	if _, ok := q.key("plug", "not-a-url"); ok {
		t.Error("非法 URL 应返回 false")
	}
}

// TestHostQueueKeyEdgeCases 覆盖队列键的边界分支。
func TestHostQueueKeyEdgeCases(t *testing.T) {
	q := NewHostQueue()
	// 非法 URL。
	if _, ok := q.key("plug", "://bad"); ok {
		t.Error("非法 URL 应返回 false")
	}
	// 无主机名。
	if _, ok := q.key("plug", "http:///path"); ok {
		t.Error("无主机名应返回 false")
	}
	// 非数字端口：Python 的 urlsplit().port 抛 ValueError，
	// Go 的 url.Parse 同样报错，两者行为一致。
	if _, ok := q.key("plug", "http://example.com:abc/x"); ok {
		t.Error("非数字端口应返回 false")
	}
	// 空端口 → 默认端口。
	k, ok := q.key("plug", "http://example.com:/x")
	if !ok || k.port != 80 {
		t.Errorf("空端口得到 (%+v,%v), want port=80", k, ok)
	}
	// https 默认 443。
	k, _ = q.key("plug", "https://example.com/x")
	if k.port != 443 {
		t.Errorf("https 默认端口 = %d, want 443", k.port)
	}
}

// TestHostQueueAcquireTimeoutCleansState 超时后清理状态。
func TestHostQueueAcquireTimeoutCleansState(t *testing.T) {
	q := NewHostQueue()
	release, err := q.Acquire("plug", "http://example.com/x", 1, nil)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}

	past := time.Now().Add(-time.Second)
	if _, err := q.Acquire("plug", "http://example.com/x", 1, &past); err == nil {
		t.Fatal("应超时")
	}

	// 超时后等待者已移除，但活跃槽位仍在。
	q.mu.Lock()
	state := q.states[hostKey{plugin: "plug", hostname: "example.com", port: 80}]
	q.mu.Unlock()
	if state == nil || len(state.waiters) != 0 || state.active != 1 {
		t.Errorf("超时后状态 = %+v, want waiters=0 active=1", state)
	}

	release()
	if len(q.states) != 0 {
		t.Errorf("释放后应清空，得到 %d", len(q.states))
	}
}

// TestWithPolicyNilContext nil ctx 也能绑定策略。
func TestWithPolicyNilContext(t *testing.T) {
	ctx := WithPolicy(nil, "plug", 3, nil)
	p := policyFrom(ctx)
	if p == nil || p.PluginKey != "plug" || p.MaxConcurrency != 3 {
		t.Errorf("得到 %+v", p)
	}
}

// TestValidateRemoteEndpointIPv6Zone IPv6 zone 后缀被剔除。
func TestValidateRemoteEndpointIPv6Zone(t *testing.T) {
	_, err := ValidateRemoteEndpoint("http://example.com/x", nil,
		fixedResolver("fe80::1%eth0"), true)
	if err == nil {
		t.Error("链路本地地址应被拒")
	}
}

// TestValidateRemoteEndpointInvalidAddress 非法地址报错。
func TestValidateRemoteEndpointInvalidAddress(t *testing.T) {
	_, err := ValidateRemoteEndpoint("http://example.com/x", nil,
		fixedResolver("not-an-ip"), true)
	if err == nil {
		t.Error("非法地址应报错")
	}
	if err.Error() != "Endpoint resolved to an invalid address" {
		t.Errorf("msg = %q", err.Error())
	}
}

// TestValidateRemoteEndpointEmptyAllowlistItem 允许列表空项被跳过。
func TestValidateRemoteEndpointEmptyAllowlistItem(t *testing.T) {
	_, err := ValidateRemoteEndpoint("http://example.com/x", []string{"", "other.com"},
		fixedResolver("93.184.216.34"), true)
	if err != nil {
		t.Errorf("空项应被跳过: %v", err)
	}
}

// TestIsGlobalIPInvalidLength 非法长度返回 false。
func TestIsGlobalIPInvalidLength(t *testing.T) {
	if isGlobalIP(net.IP{1, 2, 3}) {
		t.Error("非法长度应返回 false")
	}
}

// TestIsGlobalIPv4Boundaries 覆盖 IPv4 各保留段边界。
func TestIsGlobalIPv4Boundaries(t *testing.T) {
	cases := map[string]bool{
		"172.15.255.255": true, // 172.16.0.0/12 之外
		"172.32.0.1":     true, // 172.16.0.0/12 之外
		"192.0.1.1":      true, // 192.0.0.0/24 之外
		"192.0.3.1":      true, // 192.0.2.0/24 之外
		"198.17.0.1":     true, // 198.18.0.0/15 之外
		"198.20.0.1":     true, // 198.18.0.0/15 之外
		"198.51.99.1":    true, // 198.51.100.0/24 之外
		"198.51.101.1":   true, // 198.51.100.0/24 之外
		"203.0.112.1":    true, // 203.0.113.0/24 之外
		"203.0.114.1":    true, // 203.0.113.0/24 之外
		"100.63.0.1":     true, // 100.64.0.0/10 之外
		"100.128.0.1":    true, // 100.64.0.0/10 之外
		"239.0.0.1":      true, // 组播
	}
	for addr, want := range cases {
		if got := isGlobalIP(net.ParseIP(addr)); got != want {
			t.Errorf("isGlobalIP(%s) = %v, want %v", addr, got, want)
		}
	}
}

// TestHostQueueAcquireRelease 覆盖获取与释放。
func TestHostQueueAcquireRelease(t *testing.T) {
	q := NewHostQueue()
	release, err := q.Acquire("plug", "http://example.com/x", 2, nil)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(q.states) != 1 {
		t.Errorf("应有 1 个状态，得到 %d", len(q.states))
	}
	release()
	if len(q.states) != 0 {
		t.Errorf("释放后状态应清空，得到 %d", len(q.states))
	}
}

// TestHostQueueNoKey 无键时直接放行。
func TestHostQueueNoKey(t *testing.T) {
	q := NewHostQueue()
	release, err := q.Acquire("", "http://example.com/x", 2, nil)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	release()
	if len(q.states) != 0 {
		t.Errorf("无键不应建状态，得到 %d", len(q.states))
	}
}

// TestHostQueueDeadlineExpired 已过期的 deadline 立即超时。
func TestHostQueueDeadlineExpired(t *testing.T) {
	q := NewHostQueue()
	// 先占满 1 个槽位。
	release, err := q.Acquire("plug", "http://example.com/x", 1, nil)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	defer release()

	past := time.Now().Add(-time.Second)
	_, err = q.Acquire("plug", "http://example.com/x", 1, &past)
	if err == nil {
		t.Fatal("过期 deadline 应超时")
	}
	var qt *HostQueueTimeout
	if !errors.As(err, &qt) {
		t.Errorf("错误类型 = %T", err)
	}
}

// TestHostQueueConcurrency 并发上限生效。
func TestHostQueueConcurrency(t *testing.T) {
	q := NewHostQueue()
	release, err := q.Acquire("plug", "http://example.com/x", 1, nil)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}

	done := make(chan struct{})
	go func() {
		r2, err := q.Acquire("plug", "http://example.com/x", 1, nil)
		if err == nil {
			r2()
		}
		close(done)
	}()

	select {
	case <-done:
		t.Fatal("第二个获取不应在第一个释放前完成")
	case <-time.After(50 * time.Millisecond):
	}

	release()
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("释放后第二个获取应完成")
	}
}

// TestHostQueueTimeoutWaits 带 deadline 的等待会超时。
func TestHostQueueTimeoutWaits(t *testing.T) {
	q := NewHostQueue()
	release, err := q.Acquire("plug", "http://example.com/x", 1, nil)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	defer release()

	deadline := time.Now().Add(80 * time.Millisecond)
	start := time.Now()
	_, err = q.Acquire("plug", "http://example.com/x", 1, &deadline)
	if err == nil {
		t.Fatal("应超时")
	}
	if elapsed := time.Since(start); elapsed < 50*time.Millisecond {
		t.Errorf("应等待到 deadline，实际 %v", elapsed)
	}
}

// TestPolicyContext 覆盖策略绑定。
func TestPolicyContext(t *testing.T) {
	ctx := WithPolicy(context.Background(), "plug", 5, nil)
	p := policyFrom(ctx)
	if p == nil || p.PluginKey != "plug" || p.MaxConcurrency != 5 {
		t.Errorf("得到 %+v", p)
	}
	// 默认并发。
	p2 := policyFrom(WithPolicy(context.Background(), "p", 0, nil))
	if p2.MaxConcurrency != DefaultHostConcurrency {
		t.Errorf("默认并发 = %d", p2.MaxConcurrency)
	}
	// 无策略。
	if policyFrom(context.Background()) != nil {
		t.Error("无策略应返回 nil")
	}
	if policyFrom(nil) != nil {
		t.Error("nil ctx 应返回 nil")
	}
}

// TestOriginOf 覆盖同源判定。
func TestOriginOf(t *testing.T) {
	cases := map[string]string{
		"http://example.com/x":       "http://example.com:80",
		"https://example.com/x":      "https://example.com:443",
		"https://Example.COM:8443/x": "https://example.com:8443",
	}
	for in, want := range cases {
		got, err := originOf(in)
		if err != nil || got != want {
			t.Errorf("originOf(%q) = (%q,%v), want %q", in, got, err, want)
		}
	}
	if _, err := originOf("://bad"); err == nil {
		t.Error("非法 URL 应报错")
	}
}

// TestTimeoutSeconds 覆盖超时换算。
func TestTimeoutSeconds(t *testing.T) {
	if _, ok := timeoutSeconds(0, false); ok {
		t.Error("无超时应返回 false")
	}
	if v, ok := timeoutSeconds(30*time.Second, true); !ok || v != 30 {
		t.Errorf("得到 (%v,%v), want (30,true)", v, ok)
	}
	if v, ok := timeoutSeconds(-time.Second, true); !ok || v != 0 {
		t.Errorf("负值得到 (%v,%v), want (0,true)", v, ok)
	}
}

// TestRemainingTimeout 覆盖剩余超时。
func TestRemainingTimeout(t *testing.T) {
	now := func() time.Time { return time.Unix(1000, 0) }
	// 无 deadline 时原样返回。
	if got, err := remainingTimeout(30*time.Second, true, nil, now); err != nil || got != 30*time.Second {
		t.Errorf("无 deadline 得到 (%v,%v)", got, err)
	}
	// deadline 在未来，取较小值。
	future := time.Unix(1010, 0)
	if got, err := remainingTimeout(30*time.Second, true, &future, now); err != nil || got != 10*time.Second {
		t.Errorf("未来 deadline 得到 (%v,%v), want 10s", got, err)
	}
	if got, err := remainingTimeout(5*time.Second, true, &future, now); err != nil || got != 5*time.Second {
		t.Errorf("超时更小得到 (%v,%v), want 5s", got, err)
	}
	// deadline 已过。
	past := time.Unix(999, 0)
	if _, err := remainingTimeout(30*time.Second, true, &past, now); err == nil {
		t.Error("过期 deadline 应报错")
	}
	// 无超时值但有 deadline。
	if got, err := remainingTimeout(0, false, &future, now); err != nil || got != 0 {
		t.Errorf("无超时值得到 (%v,%v)", got, err)
	}
}

// TestIsRedirect 覆盖重定向判定。
func TestIsRedirect(t *testing.T) {
	for _, code := range []int{301, 302, 303, 307, 308} {
		if !isRedirect(code) {
			t.Errorf("%d 应为重定向", code)
		}
	}
	for _, code := range []int{200, 304, 400, 500} {
		if isRedirect(code) {
			t.Errorf("%d 不应为重定向", code)
		}
	}
}

// TestParseRetryAfter 覆盖 Retry-After 解析。
func TestParseRetryAfter(t *testing.T) {
	if got := parseRetryAfter(""); got != nil {
		t.Errorf("空串得到 %v", got)
	}
	if got := parseRetryAfter("abc"); got != nil {
		t.Errorf("非数字得到 %v", got)
	}
	if got := parseRetryAfter("2.5"); got != 2.5 {
		t.Errorf("得到 %v, want 2.5", got)
	}
}

// TestMarshalUnmarshalJSON 覆盖 JSON 辅助。
func TestMarshalUnmarshalJSON(t *testing.T) {
	s, err := marshalJSON(map[string]any{"a": 1})
	if err != nil || s != `{"a":1}` {
		t.Errorf("得到 (%q,%v)", s, err)
	}
	var out map[string]any
	if err := unmarshalJSON([]byte(`{"b":2}`), &out); err != nil || out["b"] != float64(2) {
		t.Errorf("得到 (%v,%v)", out, err)
	}
	if err := unmarshalJSON([]byte(`{`), &out); err == nil {
		t.Error("非法 JSON 应报错")
	}
}

// TestDrain 覆盖响应体排空。
func TestDrain(t *testing.T) {
	drain(nil) // 不应 panic
	resp := &http.Response{Body: io.NopCloser(strings.NewReader("hello"))}
	drain(resp)
	if _, err := resp.Body.Read(make([]byte, 1)); err == nil {
		t.Error("排空后应已关闭")
	}
}

// TestSafeHttpClientGet 覆盖一次成功请求。
func TestSafeHttpClientGet(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("hello"))
	}))
	defer srv.Close()

	c := &SafeHttpClient{
		Resolver:             fixedResolver("93.184.216.34"),
		EnforcePublicAddress: true,
	}
	resp, err := c.Get(context.Background(), srv.URL, RequestOptions{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if string(body) != "hello" {
		t.Errorf("body = %q", body)
	}
}

// TestSafeHttpClientJSON 覆盖 JSON 解析。
func TestSafeHttpClientJSON(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer srv.Close()

	c := &SafeHttpClient{Resolver: fixedResolver("93.184.216.34")}
	got, err := c.JSON(context.Background(), http.MethodGet, srv.URL, RequestOptions{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	m, ok := got.(map[string]any)
	if !ok || m["ok"] != true {
		t.Errorf("得到 %v", got)
	}
}

// TestSafeHttpClientJSONInvalid 非法 JSON 报错。
func TestSafeHttpClientJSONInvalid(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`not json`))
	}))
	defer srv.Close()

	c := &SafeHttpClient{Resolver: fixedResolver("93.184.216.34")}
	if _, err := c.JSON(context.Background(), http.MethodGet, srv.URL, RequestOptions{}); err == nil {
		t.Error("非法 JSON 应报错")
	}
}

// TestSafeHttpClientAuthError 401/403 报认证错误。
func TestSafeHttpClientAuthError(t *testing.T) {
	for _, code := range []int{401, 403} {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(code)
		}))
		c := &SafeHttpClient{Resolver: fixedResolver("93.184.216.34")}
		_, err := c.Get(context.Background(), srv.URL, RequestOptions{})
		srv.Close()
		var ue *pluginproto.UpstreamError
		if !errors.As(err, &ue) || ue.Code != "provider_unauthorized" {
			t.Errorf("%d 得到 %v", code, err)
		}
	}
}

// TestSafeHttpClientRateLimit 429 报限流错误。
func TestSafeHttpClientRateLimit(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Retry-After", "3")
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	defer srv.Close()

	c := &SafeHttpClient{Resolver: fixedResolver("93.184.216.34")}
	_, err := c.Get(context.Background(), srv.URL, RequestOptions{})
	var ue *pluginproto.UpstreamError
	if !errors.As(err, &ue) || ue.Code != "provider_rate_limited" || !ue.Retryable {
		t.Errorf("得到 %v", err)
	}
}

// TestSafeHttpClientServerError 5xx 报上游错误。
func TestSafeHttpClientServerError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	c := &SafeHttpClient{Resolver: fixedResolver("93.184.216.34")}
	_, err := c.Get(context.Background(), srv.URL, RequestOptions{})
	var ue *pluginproto.UpstreamError
	if !errors.As(err, &ue) || ue.Code != "provider_error" {
		t.Errorf("得到 %v", err)
	}
	if !strings.Contains(err.Error(), "HTTP 500") {
		t.Errorf("错误信息应含状态码，得到 %q", err.Error())
	}
}

// TestSafeHttpClientTooLarge 响应超限报错。
func TestSafeHttpClientTooLarge(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(strings.Repeat("x", 100)))
	}))
	defer srv.Close()

	c := &SafeHttpClient{Resolver: fixedResolver("93.184.216.34"), MaxBytes: 10}
	_, err := c.Get(context.Background(), srv.URL, RequestOptions{})
	var te *EndpointResponseTooLarge
	if !errors.As(err, &te) {
		t.Errorf("得到 %v", err)
	}
}

// TestSafeHttpClientCrossOriginRedirect 跨源重定向被拒。
func TestSafeHttpClientCrossOriginRedirect(t *testing.T) {
	target := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("ok"))
	}))
	defer target.Close()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, target.URL, http.StatusFound)
	}))
	defer srv.Close()

	c := &SafeHttpClient{Resolver: fixedResolver("93.184.216.34")}
	_, err := c.Get(context.Background(), srv.URL, RequestOptions{})
	var pe *EndpointPolicyError
	if !errors.As(err, &pe) || !strings.Contains(err.Error(), "Cross-origin") {
		t.Errorf("得到 %v", err)
	}
}

// TestSafeHttpClientSameOriginRedirect 同源重定向跟随。
func TestSafeHttpClientSameOriginRedirect(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/a", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/b", http.StatusFound)
	})
	mux.HandleFunc("/b", func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("final"))
	})
	srv := httptest.NewServer(mux)
	defer srv.Close()

	c := &SafeHttpClient{Resolver: fixedResolver("93.184.216.34")}
	resp, err := c.Get(context.Background(), srv.URL+"/a", RequestOptions{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if string(body) != "final" {
		t.Errorf("body = %q, want final", body)
	}
}

// TestSafeHttpClientRedirectLimit 超出重定向上限报错。
func TestSafeHttpClientRedirectLimit(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/loop", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/loop", http.StatusFound)
	})
	srv := httptest.NewServer(mux)
	defer srv.Close()

	c := &SafeHttpClient{Resolver: fixedResolver("93.184.216.34"), MaxRedirects: 2}
	_, err := c.Get(context.Background(), srv.URL+"/loop", RequestOptions{})
	var pe *EndpointPolicyError
	if !errors.As(err, &pe) || !strings.Contains(err.Error(), "redirect limit") {
		t.Errorf("得到 %v", err)
	}
}

// TestSafeHttpClientRedirectNoLocation 无 Location 报错。
func TestSafeHttpClientRedirectNoLocation(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusFound)
	}))
	defer srv.Close()

	c := &SafeHttpClient{Resolver: fixedResolver("93.184.216.34")}
	_, err := c.Get(context.Background(), srv.URL, RequestOptions{})
	var pe *EndpointPolicyError
	if !errors.As(err, &pe) || !strings.Contains(err.Error(), "without a location") {
		t.Errorf("得到 %v", err)
	}
}

// TestSafeHttpClient303BecomesGet 303 转为 GET。
func TestSafeHttpClient303BecomesGet(t *testing.T) {
	var gotMethod string
	mux := http.NewServeMux()
	mux.HandleFunc("/a", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/b", http.StatusSeeOther)
	})
	mux.HandleFunc("/b", func(w http.ResponseWriter, r *http.Request) {
		gotMethod = r.Method
		_, _ = w.Write([]byte("ok"))
	})
	srv := httptest.NewServer(mux)
	defer srv.Close()

	c := &SafeHttpClient{Resolver: fixedResolver("93.184.216.34")}
	resp, err := c.Post(context.Background(), srv.URL+"/a", RequestOptions{Data: []byte("x")})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	defer resp.Body.Close()
	if gotMethod != http.MethodGet {
		t.Errorf("303 后方法 = %q, want GET", gotMethod)
	}
}

// TestSafeHttpClientParams 查询参数拼接。
func TestSafeHttpClientParams(t *testing.T) {
	var gotQuery string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotQuery = r.URL.RawQuery
		_, _ = w.Write([]byte("ok"))
	}))
	defer srv.Close()

	c := &SafeHttpClient{Resolver: fixedResolver("93.184.216.34")}
	resp, err := c.Get(context.Background(), srv.URL, RequestOptions{
		Params: map[string][]string{"a": {"1"}},
	})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	defer resp.Body.Close()
	if !strings.Contains(gotQuery, "a=1") {
		t.Errorf("query = %q", gotQuery)
	}
}

// TestSafeHttpClientJSONBody JSON 请求体。
func TestSafeHttpClientJSONBody(t *testing.T) {
	var gotBody, gotCT string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b, _ := io.ReadAll(r.Body)
		gotBody = string(b)
		gotCT = r.Header.Get("Content-Type")
		_, _ = w.Write([]byte("ok"))
	}))
	defer srv.Close()

	c := &SafeHttpClient{Resolver: fixedResolver("93.184.216.34")}
	resp, err := c.Post(context.Background(), srv.URL, RequestOptions{JSON: map[string]any{"a": 1}})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	defer resp.Body.Close()
	if gotBody != `{"a":1}` {
		t.Errorf("body = %q", gotBody)
	}
	if gotCT != "application/json" {
		t.Errorf("content-type = %q", gotCT)
	}
}

// TestSafeHttpClientHeaders 自定义请求头。
func TestSafeHttpClientHeaders(t *testing.T) {
	var got string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got = r.Header.Get("X-Test")
		_, _ = w.Write([]byte("ok"))
	}))
	defer srv.Close()

	c := &SafeHttpClient{Resolver: fixedResolver("93.184.216.34")}
	resp, err := c.Get(context.Background(), srv.URL, RequestOptions{Headers: map[string]string{"X-Test": "v"}})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	defer resp.Body.Close()
	if got != "v" {
		t.Errorf("header = %q", got)
	}
}

// TestSafeHttpClientAllowedHostsOverride 请求级允许列表覆盖。
func TestSafeHttpClientAllowedHostsOverride(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("ok"))
	}))
	defer srv.Close()

	// 解析到私有地址，但允许列表放行。
	c := &SafeHttpClient{
		Resolver:             fixedResolver("10.0.0.1"),
		EnforcePublicAddress: true,
	}
	resp, err := c.Get(context.Background(), srv.URL, RequestOptions{AllowedHosts: []string{"127.0.0.1"}})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	defer resp.Body.Close()
}

// TestSafeHttpClientBadURL 非法 URL 报错。
func TestSafeHttpClientBadURL(t *testing.T) {
	c := &SafeHttpClient{Resolver: fixedResolver("93.184.216.34")}
	if _, err := c.Get(context.Background(), "://bad", RequestOptions{}); err == nil {
		t.Error("非法 URL 应报错")
	}
}

// TestSafeHttpClientPolicyDeadline 策略 deadline 生效。
func TestSafeHttpClientPolicyDeadline(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("ok"))
	}))
	defer srv.Close()

	c := &SafeHttpClient{Resolver: fixedResolver("93.184.216.34")}
	past := time.Now().Add(-time.Second)
	ctx := WithPolicy(context.Background(), "plug", 5, &past)
	_, err := c.Get(ctx, srv.URL, RequestOptions{})
	if err == nil {
		t.Error("过期 deadline 应报错")
	}
}

// TestSafeHttpClientDefaultQueue 未指定队列时用包级默认队列。
func TestSafeHttpClientDefaultQueue(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("ok"))
	}))
	defer srv.Close()

	c := &SafeHttpClient{Resolver: fixedResolver("93.184.216.34")}
	resp, err := c.Get(context.Background(), srv.URL, RequestOptions{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	defer resp.Body.Close()
}

// TestSafeHttpClientMaxConcurrencyOverride 客户端级并发覆盖。
func TestSafeHttpClientMaxConcurrencyOverride(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("ok"))
	}))
	defer srv.Close()

	n := 3
	c := &SafeHttpClient{
		Resolver:       fixedResolver("93.184.216.34"),
		MaxConcurrency: &n,
		PluginKey:      "plug",
	}
	resp, err := c.Get(context.Background(), srv.URL, RequestOptions{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	defer resp.Body.Close()
}

// TestSafeHttpClientTimeout 超时生效。
func TestSafeHttpClientTimeout(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(200 * time.Millisecond)
		_, _ = w.Write([]byte("ok"))
	}))
	defer srv.Close()

	c := &SafeHttpClient{Resolver: fixedResolver("93.184.216.34")}
	_, err := c.Get(context.Background(), srv.URL, RequestOptions{
		Timeout: 30 * time.Millisecond, HasTimeout: true,
	})
	if err == nil {
		t.Error("超时应报错")
	}
}

// TestSafeHttpClientPluginKeyTimeout 带插件键时按剩余超时计算。
func TestSafeHttpClientPluginKeyTimeout(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("ok"))
	}))
	defer srv.Close()

	c := &SafeHttpClient{Resolver: fixedResolver("93.184.216.34"), PluginKey: "plug"}
	resp, err := c.Get(context.Background(), srv.URL, RequestOptions{
		Timeout: 5 * time.Second, HasTimeout: true,
	})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	defer resp.Body.Close()
}

// TestSafeHttpClientJSONMarshalError 无法序列化的请求体报错。
func TestSafeHttpClientJSONMarshalError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("ok"))
	}))
	defer srv.Close()

	c := &SafeHttpClient{Resolver: fixedResolver("93.184.216.34")}
	_, err := c.Post(context.Background(), srv.URL, RequestOptions{JSON: make(chan int)})
	if err == nil {
		t.Error("无法序列化应报错")
	}
}

// TestSafeHttpClientReadError 响应读取失败。
func TestSafeHttpClientReadError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Length", "100")
		_, _ = w.Write([]byte("short"))
	}))
	defer srv.Close()

	c := &SafeHttpClient{Resolver: fixedResolver("93.184.216.34")}
	// 读取失败或成功都不应 panic；这里只验证不崩溃。
	resp, err := c.Get(context.Background(), srv.URL, RequestOptions{})
	if err == nil && resp != nil {
		_ = resp.Body.Close()
	}
}

// TestSafeHttpClientNilContext nil ctx 也能发起请求。
func TestSafeHttpClientNilContext(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("ok"))
	}))
	defer srv.Close()

	c := &SafeHttpClient{Resolver: fixedResolver("93.184.216.34")}
	resp, err := c.Request(nil, http.MethodGet, srv.URL, RequestOptions{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	defer resp.Body.Close()
}

// TestSafeHttpClientDefaultResolver 未配置 Resolver 时用默认解析器。
func TestSafeHttpClientDefaultResolver(t *testing.T) {
	c := &SafeHttpClient{}
	// 用一个必然解析失败的主机名，验证走的是默认解析器而非 panic。
	_, err := c.Get(context.Background(), "http://invalid.invalid.invalid.example/x", RequestOptions{})
	if err == nil {
		t.Error("无法解析的主机应报错")
	}
}

// TestSafeHttpClientPolicyDeadlineExhausted 策略 deadline 耗尽时报队列超时。
func TestSafeHttpClientPolicyDeadlineExhausted(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("ok"))
	}))
	defer srv.Close()

	// 注入一个已过期的时钟，使 remainingTimeout 立即失败。
	c := &SafeHttpClient{
		Resolver:  fixedResolver("93.184.216.34"),
		PluginKey: "plug",
		Now:       func() time.Time { return time.Unix(2000, 0) },
	}
	deadline := time.Unix(1000, 0)
	ctx := WithPolicy(context.Background(), "plug", 5, &deadline)
	_, err := c.Get(ctx, srv.URL, RequestOptions{Timeout: 5 * time.Second, HasTimeout: true})
	if err == nil {
		t.Error("过期 deadline 应报错")
	}
}

// TestSafeHttpClientJSONReadError JSON 读取失败。
func TestSafeHttpClientJSONReadError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Length", "100")
		_, _ = w.Write([]byte("short"))
	}))
	defer srv.Close()

	c := &SafeHttpClient{Resolver: fixedResolver("93.184.216.34")}
	// 读取失败或成功都不应 panic。
	_, _ = c.JSON(context.Background(), http.MethodGet, srv.URL, RequestOptions{})
}

// TestSafeHttpClientBadRedirectLocation 重定向 Location 非法。
func TestSafeHttpClientBadRedirectLocation(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Location", "://bad")
		w.WriteHeader(http.StatusFound)
	}))
	defer srv.Close()

	c := &SafeHttpClient{Resolver: fixedResolver("93.184.216.34")}
	if _, err := c.Get(context.Background(), srv.URL, RequestOptions{}); err == nil {
		t.Error("非法 Location 应报错")
	}
}

// TestSafeHttpClientNilSession 未配置 Session 时用默认客户端。
func TestSafeHttpClientNilSession(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("ok"))
	}))
	defer srv.Close()

	c := &SafeHttpClient{Resolver: fixedResolver("93.184.216.34")}
	if c.Session != nil {
		t.Fatal("Session 应为 nil")
	}
	resp, err := c.Get(context.Background(), srv.URL, RequestOptions{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	defer resp.Body.Close()
}

// TestSafeHttpClientCustomNow 注入时钟。
func TestSafeHttpClientCustomNow(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("ok"))
	}))
	defer srv.Close()

	c := &SafeHttpClient{
		Resolver:  fixedResolver("93.184.216.34"),
		PluginKey: "plug",
		Now:       func() time.Time { return time.Unix(1000, 0) },
	}
	resp, err := c.Get(context.Background(), srv.URL, RequestOptions{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	defer resp.Body.Close()
}

// TestErrHostQueueTimeout 哨兵错误存在。
func TestErrHostQueueTimeout(t *testing.T) {
	if ErrHostQueueTimeout == nil {
		t.Error("哨兵错误不应为 nil")
	}
}

// TestConstants 覆盖常量。
func TestConstants(t *testing.T) {
	if HostConcurrencyConfigKey != "host_concurrency" {
		t.Errorf("key = %q", HostConcurrencyConfigKey)
	}
	if DefaultHostConcurrency != 10 {
		t.Errorf("默认并发 = %d", DefaultHostConcurrency)
	}
}

// TestDefaultResolver 覆盖默认解析器（不应 panic）。
func TestDefaultResolver(t *testing.T) {
	// 用一个必然失败的主机名，只验证不 panic。
	_, _ = DefaultResolver("invalid.invalid.invalid.example", 80)
}
