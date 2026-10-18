package httpapi

import (
	"context"
	"database/sql"
	"sync"
	"talebook/booksvr/internal/coverart"
	"time"
)

func attachCoverWorker(parent context.Context, db *sql.DB, root string) (func(), error) {
	if db == nil {
		return func() {}, nil
	}
	if err := coverart.MigrateQueue(db); err != nil {
		return nil, err
	}
	ctx, cancel := context.WithCancel(parent)
	done := make(chan struct{})
	go func() {
		defer close(done)
		var wg sync.WaitGroup
		for i := 0; i < 2; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				for {
					if ctx.Err() != nil {
						return
					}
					worked, err := coverart.WorkOne(ctx, db, root)
					if worked && err == nil {
						continue
					}
					select {
					case <-ctx.Done():
						return
					case <-time.After(time.Second):
					}
				}
			}()
		}
		wg.Wait()
	}()
	return func() { cancel(); <-done }, nil
}
