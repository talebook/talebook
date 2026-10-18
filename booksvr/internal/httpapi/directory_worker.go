package httpapi

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"time"

	"talebook/booksvr/internal/library"
)

// Directory maintenance must not wait for filesystem reconciliation or a reader
// to visit the page. This worker touches only the derived metadata projection.
func attachDirectoryWorker(parent context.Context, db *sql.DB, root string, out io.Writer) func() {
	if db == nil {
		return func() {}
	}
	ctx, cancel := context.WithCancel(parent)
	done := make(chan struct{})
	index := library.NewBookDirectoryCache(db, root)
	go func() {
		defer close(done)
		ticker := time.NewTicker(2 * time.Second)
		defer ticker.Stop()
		for {
			if err := index.Sync(ctx); err != nil && ctx.Err() == nil && out != nil {
				fmt.Fprintf(out, "directory index: %v\n", err)
			}
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
			}
		}
	}()
	return func() { cancel(); <-done }
}
