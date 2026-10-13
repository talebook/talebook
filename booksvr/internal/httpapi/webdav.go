package httpapi

import (
	"net/http"
	"strings"
)

// WebDAVConfig 是 WebDAV 模块的依赖注入点。
type WebDAVConfig struct {
	// Enabled 报告 WebDAV 服务是否开启（ENABLE_WEBDAV_SERVICE）。
	Enabled func() bool
	// DemoReadOnly 报告当前是否处于演示只读模式。
	DemoReadOnly func(ctx *Context) bool
	// Serve 把请求交给 WebDAV 应用处理；未接线时返回 false。
	Serve func(ctx *Context) bool
}

// webDAVReadOnlyMethods 是演示模式下仍允许的方法。
var webDAVReadOnlyMethods = map[string]bool{
	http.MethodGet: true, http.MethodHead: true, http.MethodOptions: true,
	"PROPFIND": true,
}

// WebDAVHandler 实现 /books/?(.*)。
//
// 语义对齐 Python 的 WebDAVHandler.prepare：
//  1. 演示模式下非只读方法返回 403；
//  2. `/books` 与 `/books/<path>`（GET、无尾斜杠）重定向到带尾斜杠的地址；
//  3. 服务未开启时返回 404；
//  4. 其余请求交给 WebDAV 应用。
func WebDAVHandler(cfg WebDAVConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		method := ctx.Request.Method
		if cfg.DemoReadOnly != nil && cfg.DemoReadOnly(ctx) && !webDAVReadOnlyMethods[method] {
			ctx.Writer.WriteHeader(http.StatusForbidden)
			_, _ = ctx.Writer.Write([]byte("Demo mode is read-only"))
			return nil, nil
		}

		path := ctx.Request.URL.Path
		if path == "/books" {
			http.Redirect(ctx.Writer, ctx.Request, "/books/", http.StatusFound)
			return nil, nil
		}
		if strings.HasPrefix(path, "/books/") && !strings.HasSuffix(path, "/") && method == http.MethodGet {
			http.Redirect(ctx.Writer, ctx.Request, path+"/", http.StatusFound)
			return nil, nil
		}

		if cfg.Enabled == nil || !cfg.Enabled() {
			ctx.Writer.WriteHeader(http.StatusNotFound)
			_, _ = ctx.Writer.Write([]byte("WebDAV service is not enabled"))
			return nil, nil
		}
		if cfg.Serve == nil || !cfg.Serve(ctx) {
			ctx.Writer.WriteHeader(http.StatusInternalServerError)
			_, _ = ctx.Writer.Write([]byte("Internal Server Error"))
			return nil, nil
		}
		return nil, nil
	}
}

// WebDAVRouteSpecs 返回 WebDAV 模块接管的路由。
func WebDAVRouteSpecs(cfg WebDAVConfig) []RouteSpec {
	return []RouteSpec{
		{
			Pattern: "/books/?(.*)",
			Methods: []string{
				http.MethodGet, http.MethodHead, http.MethodOptions, http.MethodPut, http.MethodDelete,
				"PROPFIND", "PROPPATCH", "MKCOL", "COPY", "MOVE", "LOCK", "UNLOCK",
			},
			Handler: WebDAVHandler(cfg),
		},
	}
}
