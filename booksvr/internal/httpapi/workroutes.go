package httpapi

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
)

// WorkRouteSpecs 返回 5.5 节新增 3 条路由的 RouteSpec。
//
// 权限遵循计划约束：
//   - /api/work/{id} 与 /api/book/{id}/versions 逐资源调用 can_view_book()，
//     游客只能看到公开书（通过 Server.IsPublic 注入）；
//   - /merge 需 @auth + 所有权校验。
func WorkRouteSpecs() []RouteSpec {
	return []RouteSpec{
		{
			Pattern: "/api/work/([0-9]+)",
			Methods: []string{http.MethodGet},
			Handler: handleWorkDetail,
		},
		{
			Pattern: "/api/book/([0-9]+)/versions",
			Methods: []string{http.MethodGet},
			Handler: handleBookVersions,
		},
		{
			Pattern: "/api/book/([0-9]+)/merge",
			Methods: []string{http.MethodPost},
			Auth:    true,
			Handler: handleMergeBooks,
		},
	}
}

// workService 用请求上下文构造 WorkService。
func workService(ctx *Context) *WorkService {
	return &WorkService{
		DB:       ctx.DB,
		CDNURL:   ctx.CDNURL,
		APIURL:   ctx.APIURL,
		IsPublic: ctx.IsPublicFunc(),
	}
}

// IsPublicFunc 返回注入的可见性判定函数。
func (c *Context) IsPublicFunc() func(int64) (bool, error) {
	return c.isPublic
}

// handleWorkDetail 实现 GET /api/work/{id}。
func handleWorkDetail(ctx *Context) (map[string]any, error) {
	workID, err := parseID(ctx.Param(0))
	if err != nil {
		return map[string]any{"err": ErrWorkNotFound, "msg": "作品 id 非法"}, nil
	}

	resp, err := workService(ctx).WorkDetail(workID)
	if err != nil {
		return nil, err
	}
	return workDetailToMap(resp), nil
}

// handleBookVersions 实现 GET /api/book/{id}/versions。
func handleBookVersions(ctx *Context) (map[string]any, error) {
	bookID, err := parseID(ctx.Param(0))
	if err != nil {
		return map[string]any{"err": ErrBookNotFound, "msg": "书籍 id 非法"}, nil
	}

	resp, err := workService(ctx).BookVersions(bookID)
	if err != nil {
		return nil, err
	}
	return bookVersionsToMap(resp), nil
}

// handleMergeBooks 实现 POST /api/book/{id}/merge。
//
// 请求体：{"target_book_id": 789}
func handleMergeBooks(ctx *Context) (map[string]any, error) {
	bookID, err := parseID(ctx.Param(0))
	if err != nil {
		return map[string]any{"err": ErrBookNotFound, "msg": "书籍 id 非法"}, nil
	}

	var body struct {
		TargetBookID int64 `json:"target_book_id"`
	}
	if ctx.Request.Body != nil {
		dec := json.NewDecoder(ctx.Request.Body)
		if err := dec.Decode(&body); err != nil {
			// 空 body 或非法 JSON 都视为缺少 target_book_id。
			return map[string]any{
				"err": ErrMergeConflict,
				"msg": "缺少 target_book_id",
			}, nil
		}
	}
	if body.TargetBookID == 0 {
		return map[string]any{
			"err": ErrMergeConflict,
			"msg": "缺少 target_book_id",
		}, nil
	}

	resp, err := workService(ctx).MergeBooks(bookID, body.TargetBookID)
	if err != nil {
		return nil, err
	}
	return mergeToMap(resp), nil
}

// parseID 解析路径里的数字 id。
func parseID(s string) (int64, error) {
	id, err := strconv.ParseInt(s, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("parse id %q: %w", s, err)
	}
	return id, nil
}

// workDetailToMap 把 WorkDetailResponse 转成 map，保持字段名与 JSON tag 一致。
func workDetailToMap(r *WorkDetailResponse) map[string]any {
	return map[string]any{
		"err":      r.Err,
		"work":     workSummaryToMap(r.Work),
		"versions": versionsToSlice(r.Versions),
	}
}

func bookVersionsToMap(r *BookVersionsResponse) map[string]any {
	return map[string]any{
		"err":      r.Err,
		"work_id":  r.WorkID,
		"versions": versionsToSlice(r.Versions),
	}
}

func mergeToMap(r *MergeResponse) map[string]any {
	return map[string]any{
		"err":     r.Err,
		"work_id": r.WorkID,
		"merged":  r.Merged,
		"msg":     r.Msg,
	}
}

func workSummaryToMap(w WorkSummary) map[string]any {
	return map[string]any{
		"id":            w.ID,
		"title":         w.Title,
		"author":        w.Author,
		"title_norm":    w.TitleNorm,
		"author_norm":   w.AuthorNorm,
		"version_count": w.VersionCount,
		"format_count":  w.FormatCount,
	}
}

func versionsToSlice(vs []VersionSummary) []map[string]any {
	out := make([]map[string]any, 0, len(vs))
	for _, v := range vs {
		out = append(out, versionToMap(v))
	}
	return out
}

func versionToMap(v VersionSummary) map[string]any {
	files := make([]map[string]any, 0, len(v.Files))
	for _, f := range v.Files {
		files = append(files, map[string]any{
			"format":          f.Format,
			"size":            f.Size,
			"href":            f.Href,
			"online_readable": f.OnlineReadable,
		})
	}
	return map[string]any{
		"id":          v.ID,
		"title":       v.Title,
		"publisher":   v.Publisher,
		"pubdate":     v.Pubdate,
		"edition_key": v.EditionKey,
		"suffixes":    v.Suffixes,
		"img":         v.Img,
		"thumb":       v.Thumb,
		"files":       files,
	}
}
