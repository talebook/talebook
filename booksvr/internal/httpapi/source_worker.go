package httpapi

import (
	"context"
	"database/sql"
	"fmt"
	"sync"
	"time"

	"talebook/booksvr/internal/importdir"
	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/sourcewatch"
	"talebook/booksvr/internal/userdb"
)

// Source reconciliation remains enabled when automatic NEW imports are off.
func attachSourceWorker(parent context.Context, opts ServeOptions, books, users *sql.DB) (ServeOptions, func()) {
	if books == nil || users == nil {
		return opts, func() {}
	}
	ctx, cancel := context.WithCancel(parent)
	var mu sync.Mutex
	status := map[string]any{"state": "starting"}
	previous := opts.ImportWatchStatus
	opts.ImportWatchStatus = func() map[string]any {
		out := map[string]any{}
		if previous != nil {
			out = previous()
		}
		mu.Lock()
		defer mu.Unlock()
		copy := map[string]any{}
		for k, v := range status {
			copy[k] = v
		}
		out["source_sync"] = copy
		return out
	}
	done := make(chan struct{})
	go func() {
		defer close(done)
		watcher, watchErr := sourcewatch.New(ctx)
		var events <-chan struct{}
		if watcher != nil {
			defer watcher.Close()
			events = watcher.Events()
		}
		seeded := false
		var previousPaths map[string]bool
		refreshOffset := 0
		run := func() {
			started := time.Now()
			mu.Lock()
			status["state"] = "scanning"
			mu.Unlock()
			var result library.SourceSyncResult
			var err error
			if !seeded {
				var hashes map[string]string
				err = userdb.EnsureSourceSyncIndexes(users)
				needed := false
				if err == nil {
					needed, err = library.NeedsSourceHashes(books, opts.LibraryRoot)
				}
				if err == nil && needed {
					hashes, err = userdb.IndexedSourceHashes(users)
				}
				if err == nil && needed {
					err = library.SeedSourceHashes(books, hashes)
				}
				seeded = err == nil
			}
			if err == nil {
				dir := LiveImportDir(opts.ImportDir, opts.SettingsPath)
				var changed []string
				var moves []library.SourceMove
				overflow := false
				if watcher != nil {
					changed = watcher.Changes()
					for _, move := range watcher.Moves() {
						moves = append(moves, library.SourceMove{From: move.From, To: move.To})
					}
					overflow = watcher.Overflowed()
				}
				if overflow {
					moves = nil
				}
				refreshLimit := 0
				if len(changed) == 0 && previousPaths != nil {
					refreshLimit = 500
				}
				result, err = library.SyncSourceFiles(ctx, books, importdir.ConfiguredAllowedRoots(dir), opts.LibraryRoot, library.SourceSyncOptions{PreviousPaths: previousPaths, ChangedPaths: changed, FullDiscovery: watcher == nil || watchErr != nil || overflow, Moves: moves, RefreshOffset: refreshOffset, RefreshLimit: refreshLimit})
				if err == nil {
					refreshOffset += refreshLimit
				}
				if err == nil {
					next := make(map[string]bool, len(result.Files))
					for _, path := range result.Files {
						next[path] = true
					}
					for root, health := range result.Roots {
						if health != "ok" {
							for path := range previousPaths {
								if importdir.IsWithin(path, root) {
									next[path] = true
								}
							}
						}
					}
					previousPaths = next
				}
			}
			if err == nil {
				err = flushSourceChanges(books, users)
			}
			if watcher != nil && err == nil {
				watchErr = watcher.SetDirectories(result.Directories)
			}
			mu.Lock()
			status["result"] = result
			status["duration_ms"] = time.Since(started).Milliseconds()
			status["state"] = "watching"
			status["mode"] = "events+reconcile"
			if watchErr != nil {
				status["mode"] = "reconcile"
				status["watch_error"] = watchErr.Error()
			} else {
				delete(status, "watch_error")
			}
			if err != nil {
				status["state"] = "error"
				status["error"] = err.Error()
			} else {
				delete(status, "error")
			}
			mu.Unlock()
			if err != nil && ctx.Err() == nil && opts.Out != nil {
				fmt.Fprintf(opts.Out, "source sync: %v\n", err)
			}
		}
		run()
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		var debounce *time.Timer
		var pending <-chan time.Time
		for {
			select {
			case <-ctx.Done():
				if debounce != nil {
					debounce.Stop()
				}
				return
			case <-events:
				if debounce == nil {
					debounce = time.NewTimer(time.Second)
					pending = debounce.C
				}
			case <-pending:
				debounce = nil
				pending = nil
				run()
			case <-ticker.C:
				run()
			}
		}
	}()
	return opts, func() { cancel(); <-done }
}

func flushSourceChanges(books, users *sql.DB) error {
	for {
		changes, err := library.SourceChanges(books)
		if err != nil {
			return err
		}
		if len(changes) == 0 {
			return nil
		}
		for _, change := range changes {
			if err = userdb.RelocateIndexedSource(users, change.BookID, change.OldPath, change.NewPath); err != nil {
				return err
			}
			if err = library.AckSourceChange(books, change.ID); err != nil {
				return err
			}
		}
	}
}
