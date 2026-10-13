// 本文件实现 webserver/handlers/theme.py 的 3 条主题路由。
//
// 主题是纯配置功能：内置主题清单是常量，激活状态存在 CONF 的 ACTIVE_THEME 键。
// 因此这里不依赖数据库，只需要一个可读写的配置存储。
package httpapi

import (
	"net/http"
	"strings"
)

// ThemeComponent 是主题提供的组件映射。
type ThemeComponent struct {
	AppHeader string `json:"AppHeader"`
	AppFooter string `json:"AppFooter"`
}

// Theme 描述一个内置主题，字段与 Python 版逐字一致。
type Theme struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	DisplayName string         `json:"display_name"`
	Version     string         `json:"version"`
	Author      string         `json:"author"`
	Description string         `json:"description"`
	InstalledAt any            `json:"installed_at"`
	Builtin     bool           `json:"builtin"`
	Active      bool           `json:"active"`
	Components  ThemeComponent `json:"components"`
}

// builtinThemes 是内置主题清单，逐字复刻 theme.py 的 BUILTIN_THEMES。
//
// 顺序即 Python 列表顺序，前端依赖它做展示排序。
var builtinThemes = []Theme{
	{
		ID:          "builtin-brass",
		Name:        "brass",
		DisplayName: "黄铜主题",
		Version:     "1.0.0",
		Author:      "Talebook",
		Description: "暖褐炭灰打底，一线黄铜勾勒轮廓，衬线书名沉静内敛——像台灯下摊开的一册旧书，最宜夜里慢读细品。",
		Builtin:     true,
		Components:  ThemeComponent{AppHeader: "builtin:brass/AppHeader", AppFooter: "builtin:brass/AppFooter"},
	},
	{
		ID:          "builtin-graphite",
		Name:        "graphite",
		DisplayName: "石墨主题",
		Version:     "1.0.0",
		Author:      "Talebook",
		Description: "冷调蓝灰如石墨般沉着，墨蓝作唯一亮色，选中项亮起一道细边——信息井然有序，久看不觉刺眼。",
		Builtin:     true,
		Components:  ThemeComponent{AppHeader: "builtin:graphite/AppHeader", AppFooter: "builtin:graphite/AppFooter"},
	},
	{
		ID:          "builtin-light-gray",
		Name:        "light-gray",
		DisplayName: "浅灰主题",
		Version:     "1.0.0",
		Author:      "Talebook",
		Description: "通透的高级浅灰，低饱和配色搭紧凑侧栏，清爽而不喧宾夺主——日常打理书库，久对屏幕也轻松。",
		Builtin:     true,
		Components:  ThemeComponent{AppHeader: "builtin:light-gray/AppHeader", AppFooter: "builtin:light-gray/AppFooter"},
	},
	{
		ID:          "builtin-warm-red",
		Name:        "warm-red",
		DisplayName: "暖红主题",
		Version:     "1.0.0",
		Author:      "Talebook",
		Description: "微黄纸感的明亮底色，牛血红点题，侧栏以虚线分行如旧时图书馆的索引卡——带着纸页与目录的温度。",
		Builtin:     true,
		Components:  ThemeComponent{AppHeader: "builtin:warm-red/AppHeader", AppFooter: "builtin:warm-red/AppFooter"},
	},
	{
		ID:          "builtin-minimal",
		Name:        "minimal",
		DisplayName: "极简主题",
		Version:     "1.0.0",
		Author:      "Talebook",
		Description: "去尽多余装饰，只留文字与留白，小字号、高密度——明暗两色皆为一目十行的快速浏览而生。",
		Builtin:     true,
		Components:  ThemeComponent{AppHeader: "builtin:minimal/AppHeader", AppFooter: "builtin:minimal/AppFooter"},
	},
}

// builtinThemeMap 按 name 索引内置主题。
var builtinThemeMap = func() map[string]Theme {
	m := make(map[string]Theme, len(builtinThemes))
	for _, t := range builtinThemes {
		m[t.Name] = t
	}
	return m
}()

// ThemeStore 是主题激活状态的读写接口。
//
// 生产实现写 CONF 的 ACTIVE_THEME 键；测试可注入内存实现。
type ThemeStore interface {
	// ActiveTheme 返回当前激活的主题名；未设置时返回空串。
	ActiveTheme() string
	// SetActiveTheme 保存激活的主题名；空串表示恢复默认。
	SetActiveTheme(name string) error
}

// GetBuiltinTheme 返回内置主题的副本，并按当前激活状态填充 Active。
//
// 主题不存在时返回 nil。
func GetBuiltinTheme(store ThemeStore, name string) *Theme {
	t, ok := builtinThemeMap[name]
	if !ok {
		return nil
	}
	active := ""
	if store != nil {
		active = store.ActiveTheme()
	}
	t.Active = active == name
	return &t
}

// ListBuiltinThemes 返回全部内置主题（按声明顺序）。
func ListBuiltinThemes(store ThemeStore) []*Theme {
	out := make([]*Theme, 0, len(builtinThemes))
	for _, t := range builtinThemes {
		out = append(out, GetBuiltinTheme(store, t.Name))
	}
	return out
}

// ThemeListHandler 实现 /api/themes（GET，无需登录）。
func ThemeListHandler(store ThemeStore) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		return map[string]any{"err": "ok", "themes": ListBuiltinThemes(store)}, nil
	}
}

// ThemeActiveHandler 实现 /api/themes/active（GET，无需登录）。
//
// 对齐 ThemeActiveHandler.get：未激活或激活名不在内置清单时返回 theme=null。
func ThemeActiveHandler(store ThemeStore) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		name := ""
		if store != nil {
			name = store.ActiveTheme()
		}
		if _, ok := builtinThemeMap[name]; !ok {
			return map[string]any{"err": "ok", "theme": nil}, nil
		}
		return map[string]any{"err": "ok", "theme": GetBuiltinTheme(store, name)}, nil
	}
}

// ThemeActivateHandler 实现 /api/themes/activate（POST，需管理员）。
//
// 对齐 ThemeActivateHandler.post：
//   - 请求体非法 JSON → params.invalid；
//   - name 为空 → 恢复默认主题；
//   - name 不在内置清单 → not_found；
//   - 保存失败 → file.permission。
func ThemeActivateHandler(store ThemeStore) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		body, ok := decodeJSONObject(ctx.Request)
		if !ok {
			return map[string]any{"err": "params.invalid", "msg": "请求参数格式错误"}, nil
		}

		name, _ := body["name"].(string)
		name = strings.TrimSpace(name)

		if name == "" {
			if err := store.SetActiveTheme(""); err != nil {
				return map[string]any{
					"err": "file.permission",
					"msg": "保存主题配置失败：" + err.Error(),
				}, nil
			}
			return map[string]any{"err": "ok", "msg": "已恢复默认主题"}, nil
		}

		theme := GetBuiltinTheme(store, name)
		if theme == nil {
			return map[string]any{"err": "not_found", "msg": "主题不存在"}, nil
		}

		if err := store.SetActiveTheme(name); err != nil {
			return map[string]any{
				"err": "file.permission",
				"msg": "保存主题配置失败：" + err.Error(),
			}, nil
		}

		theme.Active = true
		return map[string]any{"err": "ok", "msg": "已激活主题：" + name, "theme": theme}, nil
	}
}

// ThemeRouteSpecs 返回主题模块接管的 3 条路由。
func ThemeRouteSpecs(store ThemeStore) []RouteSpec {
	return []RouteSpec{
		{
			Pattern: rThemes,
			Methods: []string{http.MethodGet},
			Handler: ThemeListHandler(store),
		},
		{
			Pattern: rThemesActivate,
			Methods: []string{http.MethodPost},
			Admin:   true,
			Handler: ThemeActivateHandler(store),
		},
		{
			Pattern: rThemesActive,
			Methods: []string{http.MethodGet},
			Handler: ThemeActiveHandler(store),
		},
	}
}

// 与 Python 版逐字一致的路由 pattern。
const (
	rThemes         = "/api/themes"
	rThemesActivate = "/api/themes/activate"
	rThemesActive   = "/api/themes/active"
)
