package httpapi

import (
	"fmt"
	"path"
	"strings"

	"talebook/booksvr/internal/library"
)

func BookDirectoriesHandler(cfg BookConfig) HandlerFunc {
	cache := library.NewBookDirectoryCache(cfg.LibraryDB, cfg.LibraryRoot)
	return func(ctx *Context) (map[string]any, error) {
		if cfg.LibraryDB == nil {
			return nil, fmt.Errorf("httpapi: 书库未配置")
		}
		current := ctx.Query("path")
		if len(current) > 4096 || strings.ContainsAny(current, "\x00\\") || (current != "" && (!strings.HasPrefix(current, "/") || path.Clean(current) != current)) {
			return map[string]any{"err": "params.invalid", "msg": "目录路径无效"}, nil
		}
		// Missing formats/deleted books are removed by the transactional directory
		// projection. Only private-book visibility needs a separate live lookup.
		var excluded map[int64]bool
		if cfg.PrivateBookIDs != nil {
			var err error
			excluded, err = cfg.PrivateBookIDs(ctx)
			if err != nil {
				return nil, err
			}
		}
		size := bookPageDelta(ctx, bookMaxPageSize(cfg))
		if ctx.Query("children_only") == "1" {
			size = 0
		}
		dirs, ids, total, err := cache.BrowsePage(ctx.Request.Context(), current, ctx.Query("recursive") == "1", ctx.Query("refresh") == "1", excluded, bookArgumentStart(ctx), size)
		if err != nil {
			return nil, err
		}
		if ctx.Query("children_only") == "1" {
			return map[string]any{"err": "ok", "path": current, "directories": dirs}, nil
		}
		result, err := bookRenderResolvedPage(cfg, ctx, ids, "文件目录", total, true)
		if err != nil {
			return nil, err
		}
		if result == nil {
			return nil, nil
		}
		result["path"], result["directories"] = current, dirs
		return result, nil
	}
}
