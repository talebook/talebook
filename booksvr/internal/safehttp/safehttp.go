// Package safehttp 复刻 webserver/plugins/runtime/safe_http.py。
//
// 提供受策略约束的 HTTP 客户端：端点校验（防 SSRF）、同源重定向、
// 响应体积上限、按插件+主机的公平并发队列。
package safehttp

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"talebook/booksvr/internal/pluginproto"
)

// HostConcurrencyConfigKey 是配置键名。
const HostConcurrencyConfigKey = "host_concurrency"

// DefaultHostConcurrency 是默认的每主机并发上限。
const DefaultHostConcurrency = 10

// HostQueueTimeout 复刻 HostQueueTimeout。
type HostQueueTimeout struct {
	*pluginproto.UpstreamError
}

// NewHostQueueTimeout 构造队列超时错误。
func NewHostQueueTimeout(message string) *HostQueueTimeout {
	if message == "" {
		message = "Plugin host queue deadline expired"
	}
	e := pluginproto.NewUpstreamError(message, "timeout", nil)
	e.Code = "plugin.host_queue_timeout"
	return &HostQueueTimeout{UpstreamError: e}
}

// EndpointPolicyError 复刻 EndpointPolicyError。
type EndpointPolicyError struct {
	*pluginproto.UpstreamError
}

// NewEndpointPolicyError 构造端点策略错误。
func NewEndpointPolicyError(message string) *EndpointPolicyError {
	e := pluginproto.NewUpstreamError(message, "other", nil)
	e.Code = "book_source.endpoint_blocked"
	return &EndpointPolicyError{UpstreamError: e}
}

// EndpointResponseTooLarge 复刻 EndpointResponseTooLarge。
type EndpointResponseTooLarge struct {
	*pluginproto.UpstreamError
}

// NewEndpointResponseTooLarge 构造响应过大错误。
func NewEndpointResponseTooLarge(message string) *EndpointResponseTooLarge {
	e := pluginproto.NewUpstreamError(message, "other", nil)
	e.Code = "book_source.response_too_large"
	return &EndpointResponseTooLarge{UpstreamError: e}
}

// hostKey 是队列的键：插件 + 归一化主机 + 端口。
type hostKey struct {
	plugin   string
	hostname string
	port     int
}

// hostState 复刻 _PluginHostQueue 的 state。
type hostState struct {
	active  int
	limits  map[int]int
	waiters []*waiter
}

// waiter 是队列中的等待者标识。
type waiter struct{}

// HostQueue 复刻 _PluginHostQueue：进程内按插件与归一化主机键控的公平队列。
type HostQueue struct {
	mu     sync.Mutex
	cond   *sync.Cond
	states map[hostKey]*hostState
	now    func() time.Time
}

// NewHostQueue 构造一个主机队列。
func NewHostQueue() *HostQueue {
	q := &HostQueue{states: map[hostKey]*hostState{}, now: time.Now}
	q.cond = sync.NewCond(&q.mu)
	return q
}

// key 复刻 _PluginHostQueue._key。
func (q *HostQueue) key(pluginKey, rawURL string) (hostKey, bool) {
	u, err := url.Parse(rawURL)
	if err != nil {
		return hostKey{}, false
	}
	hostname := strings.ToLower(strings.TrimSuffix(u.Hostname(), "."))
	if pluginKey == "" || hostname == "" {
		return hostKey{}, false
	}
	defaultPort := 80
	if strings.EqualFold(u.Scheme, "https") {
		defaultPort = 443
	}
	port := u.Port()
	if port == "" {
		return hostKey{plugin: pluginKey, hostname: hostname, port: defaultPort}, true
	}
	p, err := strconv.Atoi(port)
	if err != nil {
		return hostKey{plugin: pluginKey, hostname: hostname, port: defaultPort}, true
	}
	return hostKey{plugin: pluginKey, hostname: hostname, port: p}, true
}

// Acquire 复刻 slot() 的获取阶段。
//
// 返回的 release 必须在请求结束后调用。
func (q *HostQueue) Acquire(pluginKey, rawURL string, limit int, deadline *time.Time) (func(), error) {
	key, ok := q.key(pluginKey, rawURL)
	if !ok {
		return func() {}, nil
	}
	limit = clampLimit(limit)

	q.mu.Lock()
	state := q.states[key]
	if state == nil {
		state = &hostState{limits: map[int]int{}}
		q.states[key] = state
	}
	// 仅在请求等待或进行中时保留最严格的限制，
	// 这样繁忙主机能在低限制请求结束后恢复。
	state.limits[limit]++
	w := &waiter{}
	state.waiters = append(state.waiters, w)

	for {
		if state.waiters[0] == w && state.active < minLimit(state.limits) {
			break
		}
		var remaining time.Duration
		hasDeadline := false
		if deadline != nil {
			remaining = deadline.Sub(q.now())
			hasDeadline = true
		}
		if hasDeadline && remaining <= 0 {
			q.removeWaiter(state, w)
			q.removeLimit(state, limit)
			if len(state.waiters) == 0 && state.active == 0 {
				delete(q.states, key)
			}
			q.cond.Broadcast()
			q.mu.Unlock()
			return nil, NewHostQueueTimeout("")
		}
		if hasDeadline {
			q.waitTimeout(remaining)
		} else {
			q.cond.Wait()
		}
	}
	state.waiters = state.waiters[1:]
	state.active++
	// 推进 FIFO 头可能在请求完成前就让另一个等待者具备条件。
	q.cond.Broadcast()
	q.mu.Unlock()

	var once sync.Once
	return func() {
		once.Do(func() {
			q.mu.Lock()
			defer q.mu.Unlock()
			if st := q.states[key]; st != nil {
				st.active--
				q.removeLimit(st, limit)
				if len(st.waiters) == 0 && st.active == 0 {
					delete(q.states, key)
				}
			}
			q.cond.Broadcast()
		})
	}, nil
}

// waitTimeout 在 cond 上等待至多 d；超时后返回。
//
// sync.Cond 没有原生超时，这里用定时器唤醒。
func (q *HostQueue) waitTimeout(d time.Duration) {
	timer := time.AfterFunc(d, func() {
		q.mu.Lock()
		q.cond.Broadcast()
		q.mu.Unlock()
	})
	defer timer.Stop()
	q.cond.Wait()
}

// removeWaiter 从等待队列移除指定等待者。
func (q *HostQueue) removeWaiter(state *hostState, w *waiter) {
	for i, item := range state.waiters {
		if item == w {
			state.waiters = append(state.waiters[:i], state.waiters[i+1:]...)
			return
		}
	}
}

// removeLimit 复刻 _remove_limit。
func (q *HostQueue) removeLimit(state *hostState, limit int) {
	state.limits[limit]--
	if state.limits[limit] == 0 {
		delete(state.limits, limit)
	}
}

// minLimit 返回当前生效的最严格限制。
func minLimit(limits map[int]int) int {
	best := 0
	for l := range limits {
		if best == 0 || l < best {
			best = l
		}
	}
	return best
}

// clampLimit 把并发上限夹到 [1,100]。
func clampLimit(limit int) int {
	if limit < 1 {
		return 1
	}
	if limit > 100 {
		return 100
	}
	return limit
}

// Policy 是线程（goroutine）绑定的插件 HTTP 策略。
type Policy struct {
	PluginKey      string
	MaxConcurrency int
	Deadline       *time.Time
}

// policyStore 复刻 _PLUGIN_HTTP_POLICY 的 thread-local 语义。
//
// Go 侧用 context 传递，避免全局可变状态。
type policyCtxKey struct{}

// WithPolicy 复刻 plugin_http_policy 上下文管理器。
//
// 把运行时持有的插件身份绑定到本次调用链上的 SafeHttpClient。
func WithPolicy(ctx context.Context, pluginKey string, maxConcurrency int, deadline *time.Time) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	if maxConcurrency == 0 {
		maxConcurrency = DefaultHostConcurrency
	}
	return context.WithValue(ctx, policyCtxKey{}, &Policy{
		PluginKey:      pluginKey,
		MaxConcurrency: clampLimit(maxConcurrency),
		Deadline:       deadline,
	})
}

// policyFrom 取出上下文中的策略。
func policyFrom(ctx context.Context) *Policy {
	if ctx == nil {
		return nil
	}
	if p, ok := ctx.Value(policyCtxKey{}).(*Policy); ok {
		return p
	}
	return nil
}

// Resolver 复刻 socket.getaddrinfo 的可注入替身。
type Resolver func(host string, port int) ([]string, error)

// DefaultResolver 用 net.LookupHost 解析主机名。
func DefaultResolver(host string, port int) ([]string, error) {
	return net.LookupHost(host)
}

// ValidateRemoteEndpoint 复刻 validate_remote_endpoint。
//
// 每次请求与每次重定向前都要校验。
// enforcePublicAddress 只能由平台自有的插件配置关闭；
// 由 URL 控制的允许列表一律禁止。
func ValidateRemoteEndpoint(rawURL string, allowedHosts []string, resolver Resolver, enforcePublicAddress bool) (string, error) {
	u, err := url.Parse(rawURL)
	if err != nil {
		return "", NewEndpointPolicyError("Endpoint URL is invalid")
	}
	// Python 的 parsed.port 对越界端口抛 ValueError；Go 的 url.Parse 不会，
	// 因此这里显式校验端口范围。
	if p := u.Port(); p != "" {
		n, err := strconv.Atoi(p)
		if err != nil || n < 0 || n > 65535 {
			return "", NewEndpointPolicyError("Endpoint URL is invalid")
		}
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return "", NewEndpointPolicyError("Endpoint must be an absolute HTTP(S) URL")
	}
	if u.Hostname() == "" {
		return "", NewEndpointPolicyError("Endpoint must be an absolute HTTP(S) URL")
	}
	if u.User != nil {
		return "", NewEndpointPolicyError("Credentials are not allowed in endpoint URLs")
	}

	hostname := strings.ToLower(strings.TrimSuffix(u.Hostname(), "."))
	allowlist := map[string]bool{}
	for _, item := range allowedHosts {
		if item == "" {
			continue
		}
		allowlist[strings.ToLower(strings.TrimSuffix(item, "."))] = true
	}
	if allowlist[hostname] {
		return rawURL, nil
	}

	port := 443
	if p := u.Port(); p != "" {
		if n, err := strconv.Atoi(p); err == nil {
			port = n
		}
	}
	if resolver == nil {
		resolver = DefaultResolver
	}
	addresses, err := resolver(hostname, port)
	if err != nil {
		return "", NewEndpointPolicyError("Endpoint hostname could not be resolved")
	}
	if len(addresses) == 0 {
		return "", NewEndpointPolicyError("Endpoint hostname did not resolve to an address")
	}
	for _, address := range addresses {
		// 去掉 IPv6 的 zone 后缀。
		if i := strings.Index(address, "%"); i >= 0 {
			address = address[:i]
		}
		ip := net.ParseIP(address)
		if ip == nil {
			return "", NewEndpointPolicyError("Endpoint resolved to an invalid address")
		}
		if enforcePublicAddress && !isGlobalIP(ip) {
			return "", NewEndpointPolicyError("Endpoint resolves to a non-public address")
		}
	}
	return rawURL, nil
}

// isGlobalIP 复刻 ipaddress.ip_address(x).is_global。
//
// 注意：Python 的 is_global 与 Go 的直觉不同——**组播地址是 global**
// （224.0.0.1、ff02::1 均为 True），而 192.0.2.0/24、198.51.100.0/24、
// 203.0.113.0/24 这类文档段不是。下表来自 Python 实测。
func isGlobalIP(ip net.IP) bool {
	if v4 := ip.To4(); v4 != nil {
		return isGlobalIPv4(v4)
	}
	if len(ip) == net.IPv6len {
		return isGlobalIPv6(ip)
	}
	return false
}

// isGlobalIPv4 复刻 IPv4Address.is_global。
//
// 实测表（Python 3）：
//
//	0.0.0.0        False   10.0.0.1       False   100.64.0.1     False
//	127.0.0.1      False   169.254.0.1    False   172.16.0.1     False
//	192.0.0.1      False   192.0.2.1      False   192.88.99.1    True
//	192.168.0.1    False   198.18.0.1     False   198.51.100.1   False
//	203.0.113.1    False   224.0.0.1      True    233.252.0.1    True
//	239.255.255.255 True   240.0.0.1      False   255.255.255.255 False
//	8.8.8.8        True    1.1.1.1        True
func isGlobalIPv4(v4 net.IP) bool {
	a, b, c := v4[0], v4[1], v4[2]
	switch {
	case a == 0: // 0.0.0.0/8
		return false
	case a == 10: // 10.0.0.0/8
		return false
	case a == 127: // 127.0.0.0/8
		return false
	case a == 169 && b == 254: // 169.254.0.0/16
		return false
	case a == 172 && b >= 16 && b <= 31: // 172.16.0.0/12
		return false
	case a == 192 && b == 0 && c == 0: // 192.0.0.0/24
		return false
	case a == 192 && b == 0 && c == 2: // 192.0.2.0/24（文档段）
		return false
	case a == 192 && b == 168: // 192.168.0.0/16
		return false
	case a == 198 && b == 18: // 198.18.0.0/15
		return false
	case a == 198 && b == 19:
		return false
	case a == 198 && b == 51 && c == 100: // 198.51.100.0/24（文档段）
		return false
	case a == 203 && b == 0 && c == 113: // 203.0.113.0/24（文档段）
		return false
	case a == 100 && b >= 64 && b <= 127: // 100.64.0.0/10 CGNAT
		return false
	case a >= 240: // 240.0.0.0/4（含 255.255.255.255）
		return false
	}
	// 224.0.0.0/4 组播在 Python 中是 global。
	return true
}

// isGlobalIPv6 复刻 IPv6Address.is_global。
//
// 实测表（Python 3）：
//
//	::1        False   ::            False   fe80::1     False
//	fc00::1    False   2001:db8::1   False   ff02::1     True
//	2606:2800:220:1:248:1893:25c8:1946 True
func isGlobalIPv6(ip net.IP) bool {
	// ::1 环回、:: 未指定。
	if ip.IsLoopback() || ip.IsUnspecified() {
		return false
	}
	// fe80::/10 链路本地。
	if ip[0] == 0xfe && ip[1]&0xc0 == 0x80 {
		return false
	}
	// fc00::/7 唯一本地。
	if ip[0]&0xfe == 0xfc {
		return false
	}
	// 2001:db8::/32 文档段。
	if ip[0] == 0x20 && ip[1] == 0x01 && ip[2] == 0x0d && ip[3] == 0xb8 {
		return false
	}
	// ff00::/8 组播在 Python 中是 global。
	if ip[0] == 0xff {
		return true
	}
	// 其余按 2000::/3 判定。
	return ip[0]&0xe0 == 0x20
}

// SafeHttpClient 复刻 SafeHttpClient。
type SafeHttpClient struct {
	// Session 是底层 HTTP 客户端；为 nil 时用默认客户端。
	Session *http.Client
	// Resolver 用于端点校验；为 nil 时用 DefaultResolver。
	Resolver Resolver
	// MaxRedirects 是最大重定向次数。
	MaxRedirects int
	// MaxBytes 是响应体积上限。
	MaxBytes int64
	// AllowedHosts 是平台/管理员配置的允许列表。
	AllowedHosts []string
	// EnforcePublicAddress 为真时拒绝非公网地址。
	EnforcePublicAddress bool
	// PluginKey 是插件标识。
	PluginKey string
	// MaxConcurrency 是每主机并发上限；为 nil 时用策略值。
	MaxConcurrency *int
	// Queue 是共享的主机队列；为 nil 时用包级默认队列。
	Queue *HostQueue
	// Now 用于注入时钟；为 nil 时用 time.Now。
	Now func() time.Time
}

// defaultQueue 是包级共享队列。
var defaultQueue = NewHostQueue()

// RequestOptions 是 Request 的可选参数。
type RequestOptions struct {
	// AllowRedirect is a platform-owned, per-request destination policy. Nil keeps same-origin only.
	AllowRedirect func(*url.URL) bool
	AllowedHosts  []string
	Headers       map[string]string
	Timeout       time.Duration
	HasTimeout    bool
	Data          []byte
	Params        url.Values
	JSON          any
}

// Request 复刻 SafeHttpClient.request。
func (c *SafeHttpClient) Request(ctx context.Context, method, rawURL string, opts RequestOptions) (*http.Response, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	client := c.Session
	if client == nil {
		client = &http.Client{}
	}
	resolver := c.Resolver
	if resolver == nil {
		resolver = DefaultResolver
	}
	queue := c.Queue
	if queue == nil {
		queue = defaultQueue
	}
	now := c.Now
	if now == nil {
		now = time.Now
	}
	maxRedirects := c.MaxRedirects
	if maxRedirects == 0 {
		maxRedirects = 5
	}
	maxBytes := c.MaxBytes
	if maxBytes == 0 {
		maxBytes = 8 * 1024 * 1024
	}

	current := rawURL
	origin, err := originOf(rawURL)
	if err != nil {
		return nil, NewEndpointPolicyError("Endpoint URL is invalid")
	}

	allowedHosts := c.AllowedHosts
	if opts.AllowedHosts != nil {
		allowedHosts = opts.AllowedHosts
	}

	policy := policyFrom(ctx)
	pluginKey := c.PluginKey
	if pluginKey == "" && policy != nil {
		pluginKey = policy.PluginKey
	}
	maxConcurrency := DefaultHostConcurrency
	if policy != nil {
		maxConcurrency = policy.MaxConcurrency
	}
	if c.MaxConcurrency != nil {
		maxConcurrency = *c.MaxConcurrency
	}
	maxConcurrency = clampLimit(maxConcurrency)

	var deadline *time.Time
	if policy != nil {
		deadline = policy.Deadline
	}
	timeoutSeconds, hasTimeoutSeconds := timeoutSeconds(opts.Timeout, opts.HasTimeout)
	if pluginKey != "" && hasTimeoutSeconds {
		requestDeadline := now().Add(time.Duration(timeoutSeconds * float64(time.Second)))
		if deadline == nil || requestDeadline.Before(*deadline) {
			deadline = &requestDeadline
		}
	}

	for redirectCount := 0; redirectCount <= maxRedirects; redirectCount++ {
		if _, err := ValidateRemoteEndpoint(current, allowedHosts, resolver, c.EnforcePublicAddress); err != nil {
			return nil, err
		}
		curOrigin, err := originOf(current)
		if err != nil {
			return nil, NewEndpointPolicyError("Endpoint URL is invalid")
		}
		if curOrigin != origin {
			target, _ := url.Parse(current)
			if opts.AllowRedirect == nil || !opts.AllowRedirect(target) {
				return nil, NewEndpointPolicyError("Cross-origin redirects are not allowed")
			}
		}

		release, err := queue.Acquire(pluginKey, current, maxConcurrency, deadline)
		if err != nil {
			return nil, err
		}

		requestTimeout := opts.Timeout
		if pluginKey != "" {
			requestTimeout, err = remainingTimeout(opts.Timeout, opts.HasTimeout, deadline, now)
			if err != nil {
				release()
				return nil, err
			}
		}

		resp, err := c.doRequest(ctx, client, method, current, opts, requestTimeout)
		release()
		if err != nil {
			return nil, connectionError(method, current, err)
		}

		if isRedirect(resp.StatusCode) {
			if redirectCount >= maxRedirects {
				drain(resp)
				return nil, NewEndpointPolicyError("Endpoint exceeded the redirect limit")
			}
			location := resp.Header.Get("Location")
			drain(resp)
			if location == "" {
				return nil, NewEndpointPolicyError("Endpoint returned a redirect without a location")
			}
			base, err := url.Parse(current)
			if err != nil {
				return nil, NewEndpointPolicyError("Endpoint URL is invalid")
			}
			loc, err := url.Parse(location)
			if err != nil {
				return nil, NewEndpointPolicyError("Endpoint URL is invalid")
			}
			current = base.ResolveReference(loc).String()
			if resp.StatusCode == http.StatusSeeOther {
				method, opts.Data, opts.JSON = http.MethodGet, nil, nil
			}
			continue
		}

		if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
			drain(resp)
			return nil, pluginproto.NewUpstreamAuthError("Upstream rejected the configured credentials", "other", nil)
		}
		if resp.StatusCode == http.StatusTooManyRequests {
			retryAfter := parseRetryAfter(resp.Header.Get("Retry-After"))
			drain(resp)
			return nil, pluginproto.NewUpstreamRateLimitError("Upstream rate limit exceeded", retryAfter)
		}
		if resp.StatusCode >= 400 {
			code := resp.StatusCode
			drain(resp)
			return nil, pluginproto.NewUpstreamError(
				fmt.Sprintf("Upstream returned HTTP %d", code), "other", &code)
		}

		content, err := io.ReadAll(io.LimitReader(resp.Body, maxBytes+1))
		_ = resp.Body.Close()
		if err != nil {
			return nil, pluginproto.NewUpstreamError("Upstream response could not be read", "other", nil)
		}
		if int64(len(content)) > maxBytes {
			return nil, NewEndpointResponseTooLarge("Upstream response exceeded the size limit")
		}
		resp.Body = io.NopCloser(strings.NewReader(string(content)))
		return resp, nil
	}
	return nil, NewEndpointPolicyError("Endpoint exceeded the redirect limit")
}

// connectionError classifies transport failures without exposing query strings or credentials.
func connectionError(method, target string, err error) error {
	if errors.Is(err, context.Canceled) {
		return err
	}
	u, _ := url.Parse(target)
	host := "upstream"
	if u != nil && u.Hostname() != "" {
		host = u.Hostname()
	}
	kind := "connection"
	message := "无法连接插件服务 " + host + "，请检查服务器网络或代理设置"
	var netErr net.Error
	if errors.As(err, &netErr) && netErr.Timeout() {
		kind = "timeout"
		message = "连接插件服务 " + host + " 超时"
	} else if errors.Is(err, io.EOF) || errors.Is(err, io.ErrUnexpectedEOF) {
		message = "插件服务 " + host + " 在连接过程中断开（EOF），请检查服务器网络或代理设置"
	}
	out := pluginproto.NewUpstreamError(message, kind, nil)
	out.Retryable = method == http.MethodGet || method == http.MethodHead || method == http.MethodOptions
	return out
}

// doRequest 发起一次底层请求。
func (c *SafeHttpClient) doRequest(ctx context.Context, client *http.Client, method, rawURL string,
	opts RequestOptions, timeout time.Duration) (*http.Response, error) {
	target := rawURL
	if len(opts.Params) > 0 {
		u, err := url.Parse(rawURL)
		if err == nil {
			q := u.Query()
			for k, vs := range opts.Params {
				for _, v := range vs {
					q.Add(k, v)
				}
			}
			u.RawQuery = q.Encode()
			target = u.String()
		}
	}

	var body io.Reader
	if opts.JSON != nil {
		encoded, err := marshalJSON(opts.JSON)
		if err != nil {
			return nil, pluginproto.NewUpstreamError("Request body could not be encoded", "other", nil)
		}
		body = strings.NewReader(encoded)
	} else if opts.Data != nil {
		body = strings.NewReader(string(opts.Data))
	}

	req, err := http.NewRequestWithContext(ctx, method, target, body)
	if err != nil {
		return nil, NewEndpointPolicyError("Endpoint URL is invalid")
	}
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	if opts.JSON != nil && req.Header.Get("Content-Type") == "" {
		req.Header.Set("Content-Type", "application/json")
	}

	// 禁用自动重定向，由本函数自行处理。
	noRedirect := &http.Client{
		Transport: client.Transport,
		CheckRedirect: func(*http.Request, []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
	if timeout > 0 {
		noRedirect.Timeout = timeout
	}
	return noRedirect.Do(req)
}

// Get 复刻 SafeHttpClient.get。
func (c *SafeHttpClient) Get(ctx context.Context, rawURL string, opts RequestOptions) (*http.Response, error) {
	return c.Request(ctx, http.MethodGet, rawURL, opts)
}

// Post 复刻 SafeHttpClient.post。
func (c *SafeHttpClient) Post(ctx context.Context, rawURL string, opts RequestOptions) (*http.Response, error) {
	return c.Request(ctx, http.MethodPost, rawURL, opts)
}

// JSON 复刻 SafeHttpClient.json：发起受策略约束的请求并解析 JSON 响应。
func (c *SafeHttpClient) JSON(ctx context.Context, method, rawURL string, opts RequestOptions) (any, error) {
	resp, err := c.Request(ctx, method, rawURL, opts)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	content, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, pluginproto.NewUpstreamError("Upstream returned invalid JSON", "other", nil)
	}
	var out any
	if err := unmarshalJSON(content, &out); err != nil {
		return nil, pluginproto.NewUpstreamError("Upstream returned invalid JSON", "other", nil)
	}
	return out, nil
}

// originOf 复刻 _origin。
func originOf(rawURL string) (string, error) {
	u, err := url.Parse(rawURL)
	if err != nil {
		return "", err
	}
	defaultPort := 80
	if strings.EqualFold(u.Scheme, "https") {
		defaultPort = 443
	}
	port := defaultPort
	if p := u.Port(); p != "" {
		if n, err := strconv.Atoi(p); err == nil {
			port = n
		}
	}
	return fmt.Sprintf("%s://%s:%d", strings.ToLower(u.Scheme), strings.ToLower(u.Hostname()), port), nil
}

// timeoutSeconds 复刻 _timeout_seconds。
//
// 返回 (秒数, 是否有值)。
func timeoutSeconds(timeout time.Duration, has bool) (float64, bool) {
	if !has {
		return 0, false
	}
	if timeout < 0 {
		return 0, true
	}
	return timeout.Seconds(), true
}

// remainingTimeout 复刻 _remaining_timeout。
func remainingTimeout(timeout time.Duration, has bool, deadline *time.Time, now func() time.Time) (time.Duration, error) {
	if deadline == nil {
		return timeout, nil
	}
	remaining := deadline.Sub(now())
	if remaining <= 0 {
		return 0, NewHostQueueTimeout("")
	}
	if has {
		if timeout < remaining {
			return timeout, nil
		}
		return remaining, nil
	}
	return timeout, nil
}

// isRedirect 判断是否为重定向状态码。
func isRedirect(code int) bool {
	switch code {
	case 301, 302, 303, 307, 308:
		return true
	}
	return false
}

// parseRetryAfter 解析 Retry-After 头。
func parseRetryAfter(value string) any {
	if value == "" {
		return nil
	}
	f, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return nil
	}
	return f
}

// drain 读取并关闭响应体，便于连接复用。
func drain(resp *http.Response) {
	if resp == nil || resp.Body == nil {
		return
	}
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 4096))
	_ = resp.Body.Close()
}

// ErrHostQueueTimeout 便于 errors.Is 判定。
var ErrHostQueueTimeout = errors.New("plugin host queue deadline expired")
