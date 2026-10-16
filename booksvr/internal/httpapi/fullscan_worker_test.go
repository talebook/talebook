package httpapi

import (
	"context"
	"fmt"
	"path/filepath"
	"testing"
	"time"

	"talebook/booksvr/internal/importdir"
	"talebook/booksvr/internal/scan"
)

func TestAutomaticFullScanImportsBoundedBatchesAcrossAllRoots(t *testing.T) {
	users := newUserFixture(t)
	id := seedReader(t, users.DB, "fullscan-admin", "test-password", true, true)
	db := scanTestDB(t)
	roots := []string{t.TempDir(), t.TempDir()}
	for i := 0; i < 604; i++ {
		file := filepath.Join(roots[i%2], fmt.Sprintf("book-%d.txt", i))
		if i == 0 {
			file = "/outside/not-selected.txt"
		}
		if _, err := db.Exec(`INSERT INTO scanfiles (path,hash,status) VALUES (?,?,'ready')`, file, fmt.Sprint(i)); err != nil {
			t.Fatal(err)
		}
	}
	svc := scan.NewService(db, nil)
	opts := ServeOptions{ImportDir: importdir.Config{AllowedRoots: roots}, ScanService: func() *scan.Service { return svc }}
	var scanned []string
	count, calls := 0, 0
	err := runAutoImport(context.Background(), opts, users.DB, map[string]any{"import_watch_user_id": id}, func(root string, _ int) error { scanned = append(scanned, root); return nil }, func(hashes []string, userID int64, _ bool, _ string) error {
		if len(hashes) > 500 || userID != id {
			t.Fatalf("unbounded batch: %d", len(hashes))
		}
		for _, hash := range hashes {
			if hash == "0" {
				t.Fatal("outside source imported")
			}
		}
		count += len(hashes)
		calls++
		return nil
	})
	if err != nil || count != 603 || calls != 2 || len(scanned) != 2 {
		t.Fatalf("auto full scan: count=%d calls=%d roots=%v err=%v", count, calls, scanned, err)
	}
}

func TestFullScanWorkerCancelsActiveTraversalOnShutdown(t *testing.T) {
	db := scanTestDB(t)
	svc := scan.NewService(db, nil)
	started := make(chan struct{})
	opts := ServeOptions{SettingsPath: filepath.Join(t.TempDir(), "auto.py"), ScanService: func() *scan.Service { return svc }, StartScan: func(string, int) error { return nil }, StartImport: func([]string, int64, bool, string) error { return nil }, StartScanContext: func(ctx context.Context, _ string, _ int) error { close(started); <-ctx.Done(); return ctx.Err() }}
	running, stop := attachImportWorker(context.Background(), opts, db)
	if err := running.StartScan("/books", 500); err != nil {
		t.Fatal(err)
	}
	select {
	case <-started:
	case <-time.After(time.Second):
		stop()
		t.Fatal("scan did not start")
	}
	done := make(chan struct{})
	go func() { stop(); close(done) }()
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("scan did not cancel")
	}
}
