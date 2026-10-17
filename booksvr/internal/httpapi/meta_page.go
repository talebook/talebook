package httpapi

import (
	"fmt"
	"sort"
	"strconv"
	"strings"
	"talebook/booksvr/internal/library"
)

// metaRenderBookIDs loads full metadata for the visible page only. Candidate
// IDs and ratings are cheap, bounded queries even for very large categories.
func metaRenderBookIDs(ctx *Context, cfg MetaConfig, ids []int64, title string) (map[string]any, error) {
	privateIDs, err := privateBookIDs(ctx)
	if err != nil {
		return nil, err
	}
	seen := make(map[int64]bool, len(ids))
	missing, err := library.UnavailableSourceBooks(cfg.DB)
	if err != nil {
		return nil, err
	}
	visible := make([]int64, 0, len(ids))
	for _, id := range ids {
		if !seen[id] && !privateIDs[id] && !missing[id] {
			visible = append(visible, id)
			seen[id] = true
		}
	}
	type candidate struct{ id, rating int64 }
	ranked := make([]candidate, 0, len(visible))
	const batchSize = 500
	for start := 0; start < len(visible); start += batchSize {
		end := start + batchSize
		if end > len(visible) {
			end = len(visible)
		}
		args := make([]any, end-start)
		for i, id := range visible[start:end] {
			args[i] = id
		}
		marks := strings.TrimSuffix(strings.Repeat("?,", len(args)), ",")
		rows, e := cfg.DB.Query(fmt.Sprintf(`SELECT b.id,COALESCE(MAX(r.rating),0) FROM books b LEFT JOIN books_ratings_link l ON l.book=b.id LEFT JOIN ratings r ON r.id=l.rating WHERE b.id IN (%s) GROUP BY b.id`, marks), args...)
		if e != nil {
			return nil, fmt.Errorf("httpapi: 查询分类排序失败: %w", e)
		}
		for rows.Next() {
			var c candidate
			if e = rows.Scan(&c.id, &c.rating); e != nil {
				rows.Close()
				return nil, e
			}
			ranked = append(ranked, c)
		}
		e = rows.Err()
		rows.Close()
		if e != nil {
			return nil, e
		}
	}
	sort.Slice(ranked, func(i, j int) bool {
		if ranked[i].rating != ranked[j].rating {
			return ranked[i].rating > ranked[j].rating
		}
		return ranked[i].id > ranked[j].id
	})
	start := intArg(ctx.Query("start"), 0)
	if start < 0 {
		start = 0
	}
	maxSize := int(toIntSetting(cfg.Settings, "DEFAULT_PAGE_SIZE", 60))
	if maxSize < 60 {
		maxSize = 60
	}
	size := maxSize
	if raw := ctx.Query("size"); raw != "" {
		if n, e := strconv.Atoi(strings.TrimSpace(raw)); e == nil {
			size = n
		}
	}
	if size < 1 {
		size = 1
	}
	if size > maxSize {
		size = maxSize
	}
	pageIDs := []int64{}
	if start < len(ranked) {
		count := len(ranked) - start
		if count > size {
			count = size
		}
		for _, c := range ranked[start : start+count] {
			pageIDs = append(pageIDs, c.id)
		}
	}
	books, err := metaLoadBooks(cfg, pageIDs)
	if err != nil {
		return nil, err
	}
	books, err = attachReadingStates(ctx, books)
	if err != nil {
		return nil, err
	}
	return map[string]any{"err": "ok", "title": title, "total": len(ranked), "books": books}, nil
}
