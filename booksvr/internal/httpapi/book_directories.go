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
		excluded, err := bookPrivateIDs(cfg, ctx)
		if err != nil {
			return nil, err
		}
		dirs, ids, err := cache.Browse(ctx.Request.Context(), fmt.Sprintf("%d:%t", ctx.Identity.UserID, ctx.Identity.IsAdmin), current, ctx.Query("recursive") == "1", ctx.Query("refresh") == "1", excluded)
		if err != nil {
			return nil, err
		}
		if ctx.Query("children_only") == "1" {
			return map[string]any{"err": "ok", "path": current, "directories": dirs}, nil
		}
		result, err := bookRenderList(cfg, ctx, ids, "文件目录", true)
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
