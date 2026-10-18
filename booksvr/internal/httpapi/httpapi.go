// Package httpapi 提供与 Python 版 Talebook 逐字段一致的 HTTP 兼容层。
//
// 本包有两个职责：
//
//  1. routes.go —— 注册与 Python 版完全一致的 215 条路由 pattern；
//  2. compat.go —— 把 booksvr 存储层的书/版本/格式数据格式化为
//     Python 版 webserver/utils.py 的响应结构。
//
// 兼容层的存在意义：前端 Nuxt 零改动是本轮硬验收口径，因此响应字段
// 集合、字段名、取值语义都必须与 Python 版一致。
package httpapi

// Route 描述一条已注册路由。
type Route struct {
	// Pattern 是 Tornado 风格的正则路径，与 Python 版逐字一致。
	Pattern string
	// Handler 是 Python 版的处理类名，用于人工比对与测试断言。
	Handler string
	// Source 是路由注册来源文件，便于回溯。
	Source string
	// Methods 是该路由支持的 HTTP 方法。
	Methods []string
}

// Routes 返回全部路由（215 条既有 + 4 条新增）的逐条镜像。
//
// 返回的是副本，调用方修改不会影响注册表。
func Routes() []Route {
	out := make([]Route, 0, len(registeredRoutes)+len(newRoutes))
	out = append(out, registeredRoutes...)
	out = append(out, newRoutes...)
	return out
}

// LegacyRoutes 只返回 Python 版既有的 215 条路由。
func LegacyRoutes() []Route {
	out := make([]Route, len(registeredRoutes))
	copy(out, registeredRoutes)
	return out
}

// NewRoutes 只返回 booksvr 新增的 4 条路由。
func NewRoutes() []Route {
	out := make([]Route, len(newRoutes))
	copy(out, newRoutes)
	return out
}

// RouteCount 返回注册路由总数（含新增）。
func RouteCount() int {
	return len(registeredRoutes) + len(newRoutes)
}

// LegacyRouteCount 返回 Python 版既有路由数（215）。
func LegacyRouteCount() int {
	return len(registeredRoutes)
}

// Patterns 返回全部路由 pattern 的集合，便于比对。
func Patterns() map[string]bool {
	out := make(map[string]bool, len(registeredRoutes)+len(newRoutes))
	for _, r := range registeredRoutes {
		out[r.Pattern] = true
	}
	for _, r := range newRoutes {
		out[r.Pattern] = true
	}
	return out
}
