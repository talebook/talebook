// 本文件实现 webserver/handlers/admin_opds_sources.py 的 OPDS 源管理接口。
//
// 单条路由 /api/admin/opds/sources 承载 GET/POST/PUT/DELETE 四个方法，
// 全部要求管理员权限。
package httpapi

import (
	"net/http"
	"strings"

	"talebook/booksvr/internal/userdb"
)

// opdsSourceItem 是列表项，字段与 Python 版逐字一致。
type opdsSourceItem struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	URL         string `json:"url"`
	Description string `json:"description"`
	Active      bool   `json:"active"`
	CreateTime  any    `json:"create_time"`
	UpdateTime  any    `json:"update_time"`
}

// AdminOpdsSourcesHandler 实现 /api/admin/opds/sources（GET/POST/PUT/DELETE，需管理员）。
func AdminOpdsSourcesHandler() HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		switch ctx.Request.Method {
		case http.MethodGet:
			return opdsSourcesList(ctx)
		case http.MethodPost:
			return opdsSourcesCreate(ctx)
		case http.MethodPut:
			return opdsSourcesUpdate(ctx)
		case http.MethodDelete:
			return opdsSourcesDelete(ctx)
		default:
			return map[string]any{"err": ErrMethodInvalid, "msg": "方法不被支持"}, nil
		}
	}
}

// opdsSourcesList 对齐 AdminOpdsSources.get。
func opdsSourcesList(ctx *Context) (map[string]any, error) {
	sources, err := userdb.ListOpdsSourcesByCreateTimeDesc(ctx.DB)
	if err != nil {
		return map[string]any{"err": "error", "msg": "获取 OPDS 源列表失败：" + err.Error()}, nil
	}

	items := make([]opdsSourceItem, 0, len(sources))
	for _, s := range sources {
		items = append(items, opdsSourceItem{
			ID:          s.ID,
			Name:        s.Name,
			URL:         s.URL,
			Description: s.Description,
			Active:      s.Active,
			CreateTime:  nullIfEmpty(s.CreateTime),
			UpdateTime:  nullIfEmpty(s.UpdateTime),
		})
	}
	return map[string]any{"err": "ok", "items": items, "count": len(items)}, nil
}

// opdsSourcesCreate 对齐 AdminOpdsSources.post。
func opdsSourcesCreate(ctx *Context) (map[string]any, error) {
	req, ok := decodeJSONObject(ctx.Request)
	if !ok {
		return map[string]any{"err": "error", "msg": "创建 OPDS 源配置失败：请求体不是合法 JSON"}, nil
	}

	name := jsonString(req, "name")
	url := jsonString(req, "url")
	description := jsonString(req, "description")

	if name == "" || url == "" {
		return map[string]any{"err": "params.error", "msg": "名称和 OPDS URL 为必填项"}, nil
	}
	if !strings.HasPrefix(url, "http://") && !strings.HasPrefix(url, "https://") {
		return map[string]any{"err": "params.url.invalid", "msg": "OPDS URL 必须以 http:// 或 https:// 开头"}, nil
	}

	existing, err := userdb.GetOpdsSourceByName(ctx.DB, name)
	if err != nil {
		return map[string]any{"err": "error", "msg": "创建 OPDS 源配置失败：" + err.Error()}, nil
	}
	if existing != nil {
		return map[string]any{"err": "params.name.exist", "msg": "OPDS 源名称已存在"}, nil
	}

	id, err := userdb.CreateOpdsSource(ctx.DB, name, url, description)
	if err != nil {
		return map[string]any{"err": "error", "msg": "创建 OPDS 源配置失败：" + err.Error()}, nil
	}
	return map[string]any{"err": "ok", "msg": "OPDS 源配置保存成功", "id": id}, nil
}

// opdsSourcesUpdate 对齐 AdminOpdsSources.put。
func opdsSourcesUpdate(ctx *Context) (map[string]any, error) {
	req, ok := decodeJSONObject(ctx.Request)
	if !ok {
		return map[string]any{"err": "error", "msg": "更新 OPDS 源配置失败：请求体不是合法 JSON"}, nil
	}

	id, hasID := jsonInt(req, "id")
	if !hasID || id == 0 {
		return map[string]any{"err": "params.error", "msg": "需要提供配置 ID"}, nil
	}

	source, err := userdb.GetOpdsSourceByID(ctx.DB, id)
	if err != nil {
		return map[string]any{"err": "error", "msg": "更新 OPDS 源配置失败：" + err.Error()}, nil
	}
	if source == nil {
		return map[string]any{"err": "params.not_found", "msg": "未找到该 OPDS 源配置"}, nil
	}

	var namePtr, urlPtr, descPtr *string
	var activePtr *bool

	if _, present := req["name"]; present {
		name := jsonString(req, "name")
		if name == "" {
			return map[string]any{"err": "params.error", "msg": "名称不能为空"}, nil
		}
		// 名称冲突检查（排除自身）。
		conflict, err := userdb.GetOpdsSourceByName(ctx.DB, name)
		if err != nil {
			return map[string]any{"err": "error", "msg": "更新 OPDS 源配置失败：" + err.Error()}, nil
		}
		if conflict != nil && conflict.ID != id {
			return map[string]any{"err": "params.name.exist", "msg": "OPDS 源名称已存在"}, nil
		}
		namePtr = &name
	}

	if _, present := req["url"]; present {
		url := jsonString(req, "url")
		if url == "" {
			return map[string]any{"err": "params.error", "msg": "OPDS URL 不能为空"}, nil
		}
		if !strings.HasPrefix(url, "http://") && !strings.HasPrefix(url, "https://") {
			return map[string]any{"err": "params.url.invalid", "msg": "OPDS URL 必须以 http:// 或 https:// 开头"}, nil
		}
		urlPtr = &url
	}

	if _, present := req["description"]; present {
		desc := jsonString(req, "description")
		descPtr = &desc
	}

	if _, present := req["active"]; present {
		if v, ok := req["active"].(bool); ok {
			activePtr = &v
		}
	}

	if err := userdb.UpdateOpdsSource(ctx.DB, id, namePtr, urlPtr, descPtr, activePtr); err != nil {
		return map[string]any{"err": "error", "msg": "更新 OPDS 源配置失败：" + err.Error()}, nil
	}
	return map[string]any{"err": "ok", "msg": "OPDS 源配置更新成功"}, nil
}

// opdsSourcesDelete 对齐 AdminOpdsSources.delete。
func opdsSourcesDelete(ctx *Context) (map[string]any, error) {
	req, ok := decodeJSONObject(ctx.Request)
	if !ok {
		return map[string]any{"err": "error", "msg": "删除 OPDS 源配置失败：请求体不是合法 JSON"}, nil
	}

	id, hasID := jsonInt(req, "id")
	if !hasID || id == 0 {
		return map[string]any{"err": "params.error", "msg": "需要提供配置 ID"}, nil
	}

	source, err := userdb.GetOpdsSourceByID(ctx.DB, id)
	if err != nil {
		return map[string]any{"err": "error", "msg": "删除 OPDS 源配置失败：" + err.Error()}, nil
	}
	if source == nil {
		return map[string]any{"err": "params.not_found", "msg": "未找到该 OPDS 源配置"}, nil
	}

	if err := userdb.DeleteOpdsSource(ctx.DB, id); err != nil {
		return map[string]any{"err": "error", "msg": "删除 OPDS 源配置失败：" + err.Error()}, nil
	}
	return map[string]any{"err": "ok", "msg": "OPDS 源配置删除成功"}, nil
}

// jsonString 取 JSON 对象里的字符串字段并去首尾空白。
//
// 非字符串或缺失时返回空串，对齐 Python 的 `req.get("x", "").strip()`。
func jsonString(obj map[string]any, key string) string {
	v, ok := obj[key]
	if !ok {
		return ""
	}
	s, ok := v.(string)
	if !ok {
		return ""
	}
	return strings.TrimSpace(s)
}

// jsonInt 取 JSON 对象里的整数字段。
//
// 第二个返回值为 false 表示字段缺失或不是数字。
func jsonInt(obj map[string]any, key string) (int64, bool) {
	v, ok := obj[key]
	if !ok || v == nil {
		return 0, false
	}
	switch n := v.(type) {
	case float64:
		return int64(n), true
	case int64:
		return n, true
	case int:
		return int64(n), true
	default:
		return 0, false
	}
}

// nullIfEmpty 把空串转成 nil，对齐 Python 的 `x if x else None`。
func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

// AdminOpdsSourcesRouteSpecs 返回 OPDS 源管理接管的 1 条路由。
func AdminOpdsSourcesRouteSpecs() []RouteSpec {
	return []RouteSpec{
		{
			Pattern: rAdminOpdsSources,
			Methods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete},
			Admin:   true,
			Handler: AdminOpdsSourcesHandler(),
		},
	}
}

// 与 Python 版逐字一致的路由 pattern。
const rAdminOpdsSources = "/api/admin/opds/sources"
