package httpapi

import (
	"context"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"
	"talebook/booksvr/internal/importdir"
	"talebook/booksvr/internal/scan"
	"testing"
	"time"
)

func TestImportAllStartsPipelineWithoutSelectionOrReadyRows(t *testing.T) {
	cfg := scanTestConfig(t, scanTestDB(t), t.TempDir())
	calls := 0
	cfg.StartLibraryImport = func(id int64, mode string) error {
		calls++
		if id != 7 || mode != "copy" {
			t.Fatalf("identity/mode %d %s", id, mode)
		}
		return nil
	}
	ctx, _ := scanCtx(t, http.MethodPost, rImportRun, `{"hashlist":"all","import_mode":"copy"}`, true)
	rsp, err := ImportRunHandler(cfg)(ctx)
	if err != nil || rsp["err"] != "ok" || calls != 1 {
		t.Fatalf("all: %v %v calls=%d", rsp, err, calls)
	}
	// An explicit selection keeps the existing scoped import behavior.
	ctx, _ = scanCtx(t, http.MethodPost, rImportRun, `{"hashlist":["selected"]}`, true)
	rsp, err = ImportRunHandler(cfg)(ctx)
	if err != nil || rsp["err"] != "empty" || calls != 1 {
		t.Fatalf("selection: %v %v", rsp, err)
	}
}

func TestFullLibraryImportDrainsExistingAndScanCheckpoints(t *testing.T) {
	users := newUserFixture(t)
	id := seedReader(t, users.DB, "pipeline-admin", "test-password", true, true)
	db := scanTestDB(t)
	roots := []string{t.TempDir(), t.TempDir()}
	svc := scan.NewService(db, nil)
	insert := func(path, hash string) {
		t.Helper()
		if _, err := db.Exec(`INSERT INTO scanfiles(path,hash,status) VALUES (?,?,'ready')`, path, hash); err != nil {
			t.Fatal(err)
		}
	}
	insert(filepath.Join(roots[0], "existing.txt"), "existing")
	insert("/outside/source.txt", "outside")
	imported := 0
	opts := ServeOptions{ImportDir: importdir.Config{AllowedRoots: roots}, ScanService: func() *scan.Service { return svc }}
	scans := 0
	opts.StartScanBatchContext = func(ctx context.Context, root string, _ int, after func() error) error {
		if imported == 0 {
			t.Fatal("existing discoveries were not imported first")
		}
		scans++
		for i := 0; i < 603; i++ {
			insert(filepath.Join(root, fmt.Sprint(i)+".txt"), fmt.Sprintf("%d-%d", scans, i))
		}
		if err := after(); err != nil {
			return err
		}
		if count, _ := svc.CountReady(nil); count != 1 {
			t.Fatalf("checkpoint left %d pending; only outside row expected", count)
		}
		return nil
	}
	var phases []string
	err := runLibraryImport(context.Background(), opts, users.DB, nil, id, "copy", nil, func(hashes []string, owner int64, _ bool, mode string) error {
		if len(hashes) > 500 || owner != id || mode != "copy" {
			t.Fatal("invalid import batch")
		}
		for _, hash := range hashes {
			if hash == "outside" {
				t.Fatal("outside imported")
			}
			if _, err := db.Exec(`UPDATE scanfiles SET status='imported' WHERE hash=?`, hash); err != nil {
				return err
			}
			imported++
		}
		return nil
	}, func(phase string) { phases = append(phases, phase) })
	if err != nil || imported != 1207 || scans != 2 {
		t.Fatalf("pipeline imported=%d scans=%d err=%v", imported, scans, err)
	}
	if !strings.Contains(strings.Join(phases, ","), "scanning,importing") {
		t.Fatalf("phases %v", phases)
	}
}

func TestLibraryImportPrioritizesRecoveredWithoutSkippingNormalCursor(t *testing.T) {
	users := newUserFixture(t)
	id := seedReader(t, users.DB, "recovered-admin", "test-password", true, true)
	db := scanTestDB(t)
	root := t.TempDir()
	for _, row := range []struct{ path, hash, data string }{
		{filepath.Join(root, "normal.txt"), "normal", `{}`},
		{filepath.Join(root, "recovered.pdf"), "recovered", `{"previous_analysis_error":"PDF prefix"}`},
		{filepath.Join(t.TempDir(), "outside.pdf"), "outside", `{"previous_analysis_error":"PDF prefix"}`},
	} {
		if _, err := db.Exec(`INSERT INTO scanfiles(path,hash,status,data) VALUES (?,?,'ready',?)`, row.path, row.hash, row.data); err != nil {
			t.Fatal(err)
		}
	}
	svc := scan.NewService(db, nil)
	opts := ServeOptions{ImportDir: importdir.Config{AllowedRoots: []string{root}}, ScanService: func() *scan.Service { return svc }}
	opts.StartScanBatchContext = func(context.Context, string, int, func() error) error { return nil }
	var order []string
	err := runLibraryImport(context.Background(), opts, users.DB, nil, id, "index", nil, func(hashes []string, _ int64, _ bool, _ string) error {
		order = append(order, hashes...)
		for _, hash := range hashes {
			if _, err := db.Exec(`UPDATE scanfiles SET status='indexed' WHERE hash=?`, hash); err != nil {
				return err
			}
		}
		return nil
	}, func(string) {})
	if err != nil || strings.Join(order, ",") != "recovered,normal" {
		t.Fatalf("order=%v err=%v", order, err)
	}
	var status string
	if err := db.QueryRow(`SELECT status FROM scanfiles WHERE hash='outside'`).Scan(&status); err != nil || status != "ready" {
		t.Fatalf("outside=%s err=%v", status, err)
	}
}

func TestLibraryImportWorkerDeduplicatesAndReportsWholeTask(t *testing.T) {
	users := newUserFixture(t)
	id := seedReader(t, users.DB, "queue-admin", "test-password", true, true)
	svc := scan.NewService(scanTestDB(t), nil)
	started := make(chan struct{})
	opts := ServeOptions{SettingsPath: filepath.Join(t.TempDir(), "auto.py"), ImportDir: importdir.Config{AllowedRoots: []string{t.TempDir()}}, ScanService: func() *scan.Service { return svc }, StartScan: func(string, int) error { return nil }, StartImport: func([]string, int64, bool, string) error { return nil }}
	if err := SaveSettings(opts.SettingsPath, map[string]any{"import_allowed_roots": opts.ImportDir.AllowedRoots, "scan_upload_path": opts.ImportDir.AllowedRoots[0]}); err != nil {
		t.Fatal(err)
	}
	opts.StartScanBatchContext = func(ctx context.Context, _ string, _ int, _ func() error) error {
		close(started)
		<-ctx.Done()
		return ctx.Err()
	}
	running, stop := attachImportWorker(context.Background(), opts, users.DB)
	defer stop()
	if err := running.StartLibraryImport(id, "copy"); err != nil {
		t.Fatal(err)
	}
	select {
	case <-started:
	case <-time.After(2 * time.Second):
		t.Fatalf("pipeline did not start: %v", running.ImportWatchStatus())
	}
	if err := running.StartLibraryImport(id, "copy"); err != nil {
		t.Fatal(err)
	}
	watch := running.ImportWatchStatus()
	if watch["manual_library_import_running"] != true || watch["manual_library_import_phase"] != "scanning" {
		t.Fatalf("status %v", watch)
	}
	for _, kind := range []string{"scan", "import"} {
		response := taskStatusResponse(ScanConfig{WatchStatus: running.ImportWatchStatus}, kind, nil, nil)
		if response["running"] != true {
			t.Fatalf("%s lost pipeline", kind)
		}
	}
}

func TestLibraryImportReportsBadRootAndStillProcessesValidRoot(t *testing.T) {
	users := newUserFixture(t)
	id := seedReader(t, users.DB, "valid-root-admin", "test-password", true, true)
	roots := []string{filepath.Join(t.TempDir(), "missing"), t.TempDir()}
	svc := scan.NewService(scanTestDB(t), nil)
	opts := ServeOptions{ImportDir: importdir.Config{AllowedRoots: roots}, ScanService: func() *scan.Service { return svc }}
	scanned := 0
	err := runLibraryImport(context.Background(), opts, users.DB, nil, id, "copy", func(root string, _ int) error {
		scanned++
		if root != roots[1] {
			t.Fatal(root)
		}
		return nil
	}, func([]string, int64, bool, string) error { return nil }, nil)
	if err == nil || scanned != 1 {
		t.Fatalf("roots scanned=%d err=%v", scanned, err)
	}
}
