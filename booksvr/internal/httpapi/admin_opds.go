package httpapi

import (
	"database/sql"
	"fmt"

	"talebook/booksvr/internal/opdsimport"
)

// adminOpdsWiring 把 AdminConfig 的 OPDS 钩子接到 opdsimport 服务。
type adminOpdsWiring struct {
	db       *sql.DB
	settings map[string]any
	svc      *opdsimport.Service
}

// newAdminOpdsWiring 构造 OPDS 接线器。
func newAdminOpdsWiring(db *sql.DB, settings map[string]any) *adminOpdsWiring {
	return &adminOpdsWiring{
		db:       db,
		settings: settings,
		svc:      opdsimport.NewService(scanDirOf(settings)),
	}
}

// scanDirOf 返回 OPDS 导入的落盘目录。
func scanDirOf(settings map[string]any) string {
	if p := stringOf(settings["scan_upload_path"]); p != "" {
		return p
	}
	return stringOf(settings["upload_path"])
}

// Browse 复刻 /api/admin/opds/browse：抓取并解析远端目录。
func (w *adminOpdsWiring) Browse(ctx *Context, rawURL string) (map[string]any, error) {
	if rawURL == "" {
		return map[string]any{"err": "params.invalid", "msg": "缺少目录地址"}, nil
	}
	body, err := w.svc.FetchCatalog(rawURL)
	if err != nil {
		return map[string]any{"err": "opds.fetch_failed",
			"msg": fmt.Sprintf("获取 OPDS 目录失败: %v", err)}, nil
	}
	items, err := w.svc.ParseCatalog(body, rawURL)
	if err != nil {
		return map[string]any{"err": "opds.parse_failed",
			"msg": fmt.Sprintf("解析 OPDS 目录失败: %v", err)}, nil
	}
	return map[string]any{"err": "ok", "items": items, "total": len(items)}, nil
}

// Import 复刻 /api/admin/opds/import：导入选中的书籍。
func (w *adminOpdsWiring) Import(ctx *Context, args map[string]any) (map[string]any, error) {
	rawURL := stringOf(args["url"])
	if rawURL == "" {
		return map[string]any{"err": "params.invalid", "msg": "缺少目录地址"}, nil
	}

	// 未指定具体条目时，导入整个目录中的书籍。
	selected := selectedItems(args)
	if len(selected) == 0 {
		body, err := w.svc.FetchCatalog(rawURL)
		if err != nil {
			return map[string]any{"err": "opds.fetch_failed",
				"msg": fmt.Sprintf("获取 OPDS 目录失败: %v", err)}, nil
		}
		items, err := w.svc.ParseCatalog(body, rawURL)
		if err != nil {
			return map[string]any{"err": "opds.parse_failed",
				"msg": fmt.Sprintf("解析 OPDS 目录失败: %v", err)}, nil
		}
		for _, it := range items {
			if !it.IsFolder {
				selected = append(selected, it)
			}
		}
	}

	imported := []map[string]any{}
	failed := []map[string]any{}
	for _, item := range selected {
		out, err := w.svc.ImportToScan(w.db, item)
		if err != nil {
			failed = append(failed, map[string]any{"title": item.Title, "error": err.Error()})
			continue
		}
		imported = append(imported, out)
	}

	return map[string]any{
		"err":      "ok",
		"imported": imported,
		"failed":   failed,
		"total":    len(selected),
		"success":  len(imported),
	}, nil
}

// Status 返回导入状态。
func (w *adminOpdsWiring) Status() map[string]any {
	var total, pending, failed int64
	_ = w.db.QueryRow(`SELECT COUNT(1) FROM scanfiles WHERE name LIKE 'opds_%'`).Scan(&total)
	_ = w.db.QueryRow(`SELECT COUNT(1) FROM scanfiles WHERE name LIKE 'opds_%' AND status = 'new'`).
		Scan(&pending)
	_ = w.db.QueryRow(`SELECT COUNT(1) FROM scanfiles WHERE name LIKE 'opds_%' AND status = 'failed'`).
		Scan(&failed)
	return map[string]any{
		"total":   total,
		"pending": pending,
		"failed":  failed,
		"running": false,
	}
}

// Failed 返回失败的导入项。
func (w *adminOpdsWiring) Failed() []map[string]any {
	rows, err := w.db.Query(`SELECT name, path, data FROM scanfiles
		WHERE name LIKE 'opds_%' AND status = 'failed' ORDER BY id DESC LIMIT 100`)
	if err != nil {
		return []map[string]any{}
	}
	defer rows.Close()

	out := []map[string]any{}
	for rows.Next() {
		var name, path, data sql.NullString
		if err := rows.Scan(&name, &path, &data); err != nil {
			continue
		}
		out = append(out, map[string]any{
			"name":  name.String,
			"path":  path.String,
			"error": data.String,
		})
	}
	return out
}

// Retry 重试失败的导入。
func (w *adminOpdsWiring) Retry(ctx *Context, args map[string]any) (map[string]any, error) {
	rawURL := stringOf(args["url"])
	if rawURL == "" {
		return map[string]any{"err": "params.invalid", "msg": "缺少目录地址"}, nil
	}
	// 重试即重新执行一次导入。
	return w.Import(ctx, args)
}

// selectedItems 从请求参数里取出待导入条目。
func selectedItems(args map[string]any) []opdsimport.CatalogItem {
	raw, ok := args["books"].([]any)
	if !ok {
		return nil
	}
	out := make([]opdsimport.CatalogItem, 0, len(raw))
	for _, entry := range raw {
		m := anyMapOf(entry)
		if len(m) == 0 {
			continue
		}
		out = append(out, opdsimport.CatalogItem{
			ID:       stringOf(m["id"]),
			Title:    stringOf(m["title"]),
			Author:   stringOf(m["author"]),
			IsFolder: bookBoolOf(m["is_folder"]),
			Href:     stringOf(m["href"]),
			Format:   stringOf(m["format"]),
			Cover:    stringOf(m["cover"]),
			Summary:  stringOf(m["summary"]),
		})
	}
	return out
}
