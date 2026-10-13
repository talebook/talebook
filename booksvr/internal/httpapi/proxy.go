package httpapi

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
)

// ErrUpstreamUnavailable 是兜底代理失败时的错误码。
const ErrUpstreamUnavailable = "upstream.unavailable"

// Dispatcher 按灰度开关把请求分派给本地 handler 或兜底代理。
//
// 匹配语义（计划设计第 1b 节）：
//  1. 只遍历 server 中「有 Go handler 的路由表」，不遍历 218 条全表
//     （全表含 catch-all `/(.*)`，会造成顺序陷阱）；
//  2. 命中且（ServeAll 或 pattern 在白名单中）→ 交给本地 Server；
//  3. 其余一切情况 → 代理到 Tornado。
type Dispatcher struct {
	server    *Server
	proxy     http.Handler
	whitelist map[string]bool
	serveAll  bool
}

// NewDispatcher 装配分派器。
//
// tornadoURL 是未实现路由的兜底目标；为空时使用默认值。
func NewDispatcher(server *Server, tornadoURL string, serveRoutes []string, serveAll bool) (*Dispatcher, error) {
	proxy, err := newReverseProxy(tornadoURL)
	if err != nil {
		return nil, err
	}
	wl := make(map[string]bool, len(serveRoutes))
	for _, p := range serveRoutes {
		wl[p] = true
	}
	return &Dispatcher{
		server:    server,
		proxy:     proxy,
		whitelist: wl,
		serveAll:  serveAll,
	}, nil
}

// ServeHTTP 实现 http.Handler。
func (d *Dispatcher) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if d.server != nil {
		for _, rt := range d.server.routes {
			if rt.re.FindStringSubmatch(r.URL.Path) == nil {
				continue
			}
			// 命中已实现路由；只有开关允许时才本地处理。
			if d.serveAll || d.whitelist[rt.spec.Pattern] {
				d.server.ServeHTTP(w, r)
				return
			}
			// 命中但未开启 → 仍走代理。
			break
		}
	}
	d.proxy.ServeHTTP(w, r)
}

// newReverseProxy 构造兜底反向代理。
//
// 保留原始 Host 与转发头；上游不可达时返回 502 + JSON。
func newReverseProxy(tornadoURL string) (http.Handler, error) {
	if tornadoURL == "" {
		tornadoURL = "http://127.0.0.1:8001"
	}
	target, err := url.Parse(tornadoURL)
	if err != nil {
		return nil, err
	}

	rp := httputil.NewSingleHostReverseProxy(target)
	origDirector := rp.Director
	rp.Director = func(req *http.Request) {
		origHost := req.Host
		origDirector(req)
		// 保留原始 Host，与 Nginx 现有行为一致。
		req.Host = origHost
		if req.Header.Get("X-Forwarded-For") == "" {
			req.Header.Set("X-Forwarded-For", req.RemoteAddr)
		}
		if req.Header.Get("X-Scheme") == "" {
			scheme := "http"
			if req.TLS != nil {
				scheme = "https"
			}
			req.Header.Set("X-Scheme", scheme)
		}
	}
	rp.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		log.Printf("httpapi: 兜底代理失败 upstream=%s path=%s: %v", target.String(), r.URL.Path, err)
		writeJSON(w, http.StatusBadGateway, map[string]any{
			"err": ErrUpstreamUnavailable,
			"msg": "上游服务不可用",
		})
	}
	return rp, nil
}

// parseServeRoutes 把逗号分隔的白名单拆成切片。
func parseServeRoutes(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	var out []string
	for _, p := range strings.Split(raw, ",") {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}
