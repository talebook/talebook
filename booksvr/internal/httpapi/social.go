package httpapi

import (
	"net/http"
)

// SocialConfig 是社交账号登录模块的依赖注入点。
type SocialConfig struct {
	// Auth 复用演示模式配置。
	Auth AuthConfig
	// Handler 处理实际的社交登录动作；为 nil 时返回未接线错误。
	//
	// action 取值：begin / complete / disconnect / disconnect_individual。
	Handler func(ctx *Context, action, backend, associationID string) (map[string]any, error)
}

// ---- 路由常量 ----

const (
	rSocialLogin      = "/auth/login/(?P<backend>[^/]+)/?"
	rSocialComplete   = "/auth/complete/(?P<backend>[^/]+).do"
	rSocialDisconnect = "/auth/disconnect/(?P<backend>[^/]+)/?"
	rSocialDisconnOne = "/auth/disconnect/(?P<backend>[^/]+)/(?P<association_id>\\d+)/?"
)

// socialDemoBlocked 是演示模式下社交操作的统一响应。
var socialDemoBlocked = map[string]any{
	"err": "demo.read_only",
	"msg": "演示模式不支持社交账号操作",
}

// socialHandler 构造一个受演示模式保护的社交路由处理函数。
//
// 对应 Python 的 DemoModeDisabledMixin.prepare：演示模式下直接 403 并返回
// demo.read_only，不进入实际登录流程。
func socialHandler(cfg SocialConfig, action string) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if cfg.Auth.isDemoMode() {
			ctx.Writer.WriteHeader(http.StatusForbidden)
			return socialDemoBlocked, nil
		}

		backend := ctx.Param(0)
		associationID := ""
		if action == "disconnect_individual" {
			associationID = ctx.Param(1)
		}

		if cfg.Handler == nil {
			return map[string]any{"err": "social.unavailable", "msg": "社交登录未接线"}, nil
		}
		return cfg.Handler(ctx, action, backend, associationID)
	}
}

// ---- 路由表 ----

// SocialRouteSpecs 返回社交登录模块接管的 4 条路由。
func SocialRouteSpecs(cfg SocialConfig) []RouteSpec {
	methods := []string{http.MethodGet, http.MethodPost}
	return []RouteSpec{
		{Pattern: rSocialLogin, Methods: methods, Handler: socialHandler(cfg, "begin")},
		{Pattern: rSocialComplete, Methods: methods, Handler: socialHandler(cfg, "complete")},
		{Pattern: rSocialDisconnect, Methods: methods, Handler: socialHandler(cfg, "disconnect")},
		{Pattern: rSocialDisconnOne, Methods: methods, Handler: socialHandler(cfg, "disconnect_individual")},
	}
}
