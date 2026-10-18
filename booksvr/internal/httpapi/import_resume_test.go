package httpapi

import (
	"context"
	"path/filepath"
	"talebook/booksvr/internal/importdir"
	"talebook/booksvr/internal/scan"
	"testing"
	"time"
)

func TestLibraryImportResumesPersistedIntent(t *testing.T) {
	users := newUserFixture(t)
	id := seedReader(t, users.DB, "resume-admin", "secret", true, true)
	service := scan.NewService(scanTestDB(t), nil)
	root := t.TempDir()
	settings := filepath.Join(t.TempDir(), "auto.py")
	SaveSettings(settings, map[string]any{"import_allowed_roots": []string{root}, "scan_upload_path": root})
	if err := ensureImportTasks(users.DB); err != nil {
		t.Fatal(err)
	}
	if err := rememberImportTask(users.DB, id, "index"); err != nil {
		t.Fatal(err)
	}
	started := make(chan struct{})
	opts := ServeOptions{SettingsPath: settings, ScanService: func() *scan.Service { return service }, ImportDir: importdir.Config{AllowedRoots: []string{root}}, StartScan: func(string, int) error { return nil }, StartImport: func([]string, int64, bool, string) error { return nil }}
	opts.StartScanBatchContext = func(ctx context.Context, _ string, _ int, _ func() error) error {
		close(started)
		<-ctx.Done()
		return ctx.Err()
	}
	_, stop := attachImportWorker(context.Background(), opts, users.DB)
	select {
	case <-started:
	case <-time.After(2 * time.Second):
		stop()
		t.Fatal("saved import did not resume")
	}
	stop()
	var state string
	if err := users.DB.QueryRow(`SELECT state FROM import_resume_job WHERE id=1`).Scan(&state); err != nil || state != "active" {
		t.Fatal(state, err)
	}
	resumed := make(chan struct{})
	opts.StartScanBatchContext = func(context.Context, string, int, func() error) error { close(resumed); return nil }
	_, stop = attachImportWorker(context.Background(), opts, users.DB)
	defer stop()
	select {
	case <-resumed:
	case <-time.After(2 * time.Second):
		t.Fatal("second startup did not resume")
	}
	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		var count int
		users.DB.QueryRow(`SELECT count(*) FROM import_resume_job`).Scan(&count)
		if count == 0 {
			return
		}
		time.Sleep(time.Millisecond)
	}
	t.Fatal("completed intent retained")
}
