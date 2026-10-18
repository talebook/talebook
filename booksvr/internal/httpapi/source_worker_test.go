package httpapi

import (
	"context"
	"net/http"
	"os"
	"path/filepath"
	"testing"
	"time"

	"talebook/booksvr/internal/importdir"
	"talebook/booksvr/internal/library"
)

func TestSourceSyncVisibilityPermissionsAndHistory(t *testing.T) {
	fx := newBookFixture(t)
	if err := library.Migrate(fx.DB); err != nil {
		t.Fatal(err)
	}
	for _, id := range []int64{1, 2, 3} {
		opdsSeedBook(t, fx.DB, id, "Book", id)
		opdsSeedFormat(t, fx.DB, id, "TXT")
	}
	bookSeedReader(t, fx.DB, 7, "reader")
	bookSeedState(t, fx.DB, 1, 7, 1, "")
	if err := library.RegisterFormat(fx.DB, 1, "TXT", "/books/fixture.txt", 4, 0); err != nil {
		t.Fatal(err)
	}
	if _, err := fx.DB.Exec(`INSERT INTO source_sync_formats(format_id,identity,size,mtime,missing) SELECT id,'fixture',4,0,1 FROM book_formats WHERE book_id=1`); err != nil {
		t.Fatal(err)
	}
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/book", "", 7, false)
	fx.Cfg.PrivateBookIDs = func(*Context) (map[int64]bool, error) { return map[int64]bool{3: true}, nil }
	result, err := bookRenderList(fx.Cfg, ctx, []int64{1, 2, 3}, "Books", false)
	if err != nil {
		t.Fatal(err)
	}
	if result["total"] != 1 {
		t.Fatalf("%v", result)
	}
	cfg := OpdsConfig{DB: fx.DB, FilterVisibleBookIDs: func(_ *Context, ids []int64) ([]int64, error) {
		var out []int64
		for _, id := range ids {
			if id != 3 {
				out = append(out, id)
			}
		}
		return out, nil
	}}
	ids, err := opdsVisibleIDs(cfg, ctx, []int64{1, 2, 3})
	if err != nil || len(ids) != 1 || ids[0] != 2 {
		t.Fatalf("%v %v", ids, err)
	}
	var count int
	if err = fx.DB.QueryRow(`SELECT count(*) FROM reading_state WHERE book_id=1 AND reader_id=7`).Scan(&count); err != nil || count != 1 {
		t.Fatalf("history lost: %d %v", count, err)
	}
	var books int
	fx.DB.QueryRow(`SELECT count(*) FROM books`).Scan(&books)
	if books != 3 {
		t.Fatal("book records removed")
	}
	meta, err := metaRenderBookList(ctx, MetaConfig{DB: fx.DB}, []map[string]any{{"id": int64(1)}, {"id": int64(2)}}, "Books")
	if err != nil || meta["total"] != 1 {
		t.Fatalf("metadata browse: %v %v", meta, err)
	}
	meta, err = metaRenderBookIDs(ctx, MetaConfig{DB: fx.DB}, []int64{1, 2}, "Books")
	if err != nil || meta["total"] != 1 {
		t.Fatalf("metadata IDs browse: %v %v", meta, err)
	}
}

func TestSourceSyncWorkerWorksWithAutoImportDisabled(t *testing.T) {
	fx := newBookFixture(t)
	if err := library.Migrate(fx.DB); err != nil {
		t.Fatal(err)
	}
	root := t.TempDir()
	old := filepath.Join(root, "old.txt")
	next := filepath.Join(root, "renamed.txt")
	if err := os.WriteFile(old, []byte("book"), 0600); err != nil {
		t.Fatal(err)
	}
	opdsSeedBook(t, fx.DB, 1, "Original", 1)
	if err := library.RegisterFormat(fx.DB, 1, "TXT", old, 4, 0); err != nil {
		t.Fatal(err)
	}
	opts, stop := attachSourceWorker(context.Background(), ServeOptions{ImportDir: importdir.Config{AllowedRoots: []string{root}, AutoWatchEnabled: false}}, fx.DB, fx.DB)
	defer stop()
	stopDirectories := attachDirectoryWorker(context.Background(), fx.DB, "", nil)
	defer stopDirectories()
	await := func(check func() bool) {
		t.Helper()
		end := time.Now().Add(8 * time.Second)
		for time.Now().Before(end) {
			if check() {
				return
			}
			time.Sleep(50 * time.Millisecond)
		}
		t.Fatalf("timeout, status: %+v", opts.ImportWatchStatus())
	}
	await(func() bool {
		var count int
		fx.DB.QueryRow(`SELECT count(*) FROM source_sync_formats`).Scan(&count)
		return count == 1
	})
	// Background maintenance builds the directory projection without a GET.
	await(func() bool {
		var count int
		fx.DB.QueryRow(`SELECT total_count FROM book_directory_nodes WHERE path=?`, root).Scan(&count)
		return count == 1
	})
	// The watcher gets installed immediately after committing the first snapshot.
	time.Sleep(200 * time.Millisecond)
	if err := os.Rename(old, next); err != nil {
		t.Fatal(err)
	}
	await(func() bool {
		var path string
		fx.DB.QueryRow(`SELECT path FROM book_formats WHERE book_id=1`).Scan(&path)
		return path == next
	})
	await(func() bool { changes, err := library.SourceChanges(fx.DB); return err == nil && len(changes) == 0 })
	os.Remove(next)
	await(func() bool { missing, err := library.UnavailableSourceBooks(fx.DB); return err == nil && missing[1] })
	await(func() bool {
		var count int
		err := fx.DB.QueryRow(`SELECT total_count FROM book_directory_nodes WHERE path=?`, root).Scan(&count)
		return err == nil && count == 0
	})
}
