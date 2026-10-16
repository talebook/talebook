package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"talebook/booksvr/internal/coverart"
	"talebook/booksvr/internal/httpapi"
	"talebook/booksvr/internal/library"
	"time"
)

// runRepairCovers is resumable: successful artwork is skipped on another run.
// It never holds a cursor or transaction while reading source books.
func runRepairCovers(args []string, out io.Writer) error {
	fs := flag.NewFlagSet("repair-covers", flag.ContinueOnError)
	fs.SetOutput(out)
	path := fs.String("db", "", "metadata.db path")
	root := fs.String("library-root", "", "owned artwork root")
	apply := fs.Bool("apply", false, "extract covers; default only counts candidates")
	workers := fs.Int("workers", 2, "parallel readers (1-4)")
	limit := fs.Int64("limit", 0, "maximum candidate books; zero means all")
	start := fs.Int64("after", 0, "only IDs above this value; restart without -after to retry incomplete books")
	if err := fs.Parse(args); err != nil {
		return err
	}
	if *path == "" {
		return fmt.Errorf("repair-covers: -db required")
	}
	if _, err := os.Stat(*path); err != nil {
		return err
	}
	if *root == "" {
		*root = filepath.Dir(*path)
	}
	httpapi.RegisterCalibreFunctions()
	db, err := sql.Open("sqlite", *path+"?_pragma=busy_timeout(0)")
	if err != nil {
		return err
	}
	defer db.Close()
	db.SetMaxOpenConns(1)
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()
	var ceiling int64
	if err = db.QueryRow(`SELECT COALESCE(MAX(id),0) FROM books`).Scan(&ceiling); err != nil {
		return err
	}
	stats := map[string]int64{"checked": 0, "restored": 0, "existing": 0, "without_cover": 0, "failed": 0, "max_completed_id": *start, "ceiling": ceiling}
	emit := func() { data, _ := json.Marshal(stats); fmt.Fprintln(out, string(data)) }
	defer emit()

	if *workers < 1 || *workers > 4 {
		return fmt.Errorf("repair-covers: workers must be 1-4")
	}
	rows, err := db.Query(`SELECT DISTINCT b.id FROM books b JOIN data d ON d.book=b.id WHERE b.id>? AND b.id<=? AND UPPER(d.format) IN ('EPUB','MOBI','AZW','AZW3','PDF') ORDER BY b.id`, *start, ceiling)
	if err != nil {
		return err
	}
	var ids []int64
	for rows.Next() {
		var id int64
		if err = rows.Scan(&id); err != nil {
			rows.Close()
			return err
		}
		ids = append(ids, id)
		if *limit > 0 && int64(len(ids)) >= *limit {
			break
		}
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	if !*apply {
		stats["checked"] = int64(len(ids))
		if len(ids) > 0 {
			stats["max_completed_id"] = ids[len(ids)-1]
		}
		return nil
	}
	var mu sync.Mutex
	var wg sync.WaitGroup
	jobs := make(chan int64)
	for i := 0; i < *workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for id := range jobs {
				if ctx.Err() != nil {
					return
				}
				status, lastErr := repairOneCover(ctx, db, *root, id)
				mu.Lock()
				stats["checked"]++
				stats["max_completed_id"] = max(stats["max_completed_id"], id)
				stats[status]++
				if lastErr != nil {
					fmt.Fprintf(out, "book=%d cover_error=%q\n", id, lastErr)
				}
				if status == "without_cover" {
					fmt.Fprintf(out, "book=%d no_embedded_cover\n", id)
				}
				if stats["checked"]%100 == 0 {
					emit()
				}
				mu.Unlock()
			}
		}()
	}
sendLoop:
	for _, id := range ids {
		select {
		case jobs <- id:
		case <-ctx.Done():
			break sendLoop
		}
	}
	close(jobs)
	wg.Wait()
	if ctx.Err() != nil {
		return ctx.Err()
	}

	return nil
}

func repairOneCover(ctx context.Context, db *sql.DB, root string, id int64) (string, error) {
	old, err := library.Cover(db, id, root)
	if err != nil {
		return "failed", err
	}
	if len(old) > 0 {
		return "existing", nil
	}
	formats, err := library.ListFormats(db, id)
	if err != nil {
		return "failed", err
	}
	var lastErr error
	for _, f := range formats {
		if !coverart.Supported(f.Format) {
			continue
		}
		for retry := 0; retry < 30; retry++ {
			err = coverart.Ensure(ctx, db, root, id, f.Path, f.Format)
			if !coverBusy(err) {
				break
			}
			select {
			case <-ctx.Done():
				return "failed", ctx.Err()
			case <-time.After(100 * time.Millisecond):
			}
		}
		if err != nil {
			lastErr = err
			continue
		}
		img, err := library.Cover(db, id, root)
		if err != nil {
			lastErr = err
			continue
		}
		if len(img) > 0 {
			return "restored", nil
		}
	}
	if lastErr != nil {
		return "failed", lastErr
	}
	return "without_cover", nil
}

func coverBusy(err error) bool {
	return err != nil && (strings.Contains(err.Error(), "SQLITE_BUSY") || strings.Contains(err.Error(), "database is locked"))
}
