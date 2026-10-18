package httpapi

import (
	"talebook/booksvr/internal/library"
)

func metaRenderBookIDs(ctx *Context, cfg MetaConfig, ids []int64, title string) (map[string]any, error) {
	if ids == nil {
		ids = []int64{}
	}
	return metaRenderQuery(ctx, cfg, library.BrowseQuery{Candidates: ids, RatingSort: true}, title)
}

func metaRenderQuery(ctx *Context, cfg MetaConfig, q library.BrowseQuery, title string) (map[string]any, error) {
	private, err := privateBookIDs(ctx)
	if err != nil {
		return nil, err
	}
	q.Excluded = private
	bc := cfg.Book
	bc.Settings = cfg.Settings
	q.Start = bookArgumentStart(ctx)
	q.Size = bookPageDelta(ctx, bookMaxPageSize(bc))
	ids, total, err := library.BrowseBooks(ctx.Request.Context(), cfg.DB, q)
	if err != nil {
		return nil, err
	}
	books, err := metaLoadBooks(cfg, ids)
	if err != nil {
		return nil, err
	}
	books, err = attachReadingStates(ctx, books)
	if err != nil {
		return nil, err
	}
	return map[string]any{"err": "ok", "title": title, "total": total, "books": books}, nil
}
