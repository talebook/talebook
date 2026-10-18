package library

import (
	"context"
	"database/sql"
)

type BookDirectory struct {
	Path        string `json:"path"`
	Name        string `json:"name"`
	Count       int    `json:"count"`
	HasChildren bool   `json:"has_children"`
}

func BrowseBookDirectory(ctx context.Context, db *sql.DB, libraryRoot, current string, recursive bool, excluded map[int64]bool) ([]BookDirectory, []int64, error) {
	return NewBookDirectoryCache(db, libraryRoot).Browse(ctx, "", current, recursive, false, excluded)
}
