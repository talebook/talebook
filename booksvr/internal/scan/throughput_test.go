package scan

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"talebook/booksvr/internal/coverart"
	"talebook/booksvr/internal/media"
	"talebook/booksvr/internal/userdb"
	"testing"
)

func TestCachedAnalysisRejectsAtomicReplacement(t *testing.T) {
	file := makeValidEpub(t, t.TempDir(), "stable.epub")
	info, err := os.Stat(file)
	if err != nil {
		t.Fatal(err)
	}
	analysis, err := media.AnalyzeFile(file, "epub")
	if err != nil {
		t.Fatal(err)
	}
	row := &userdb.ScanFile{Data: analysis.ToDict()}
	stampAnalysis(row, file, info)
	if _, err = cachedAnalysis(row, file, "epub"); err != nil {
		t.Fatal(err)
	}
	replacement := file + ".new"
	if err = os.WriteFile(replacement, make([]byte, info.Size()), 0600); err != nil {
		t.Fatal(err)
	}
	if err = os.Chtimes(replacement, info.ModTime(), info.ModTime()); err != nil {
		t.Fatal(err)
	}
	if err = os.Rename(replacement, file); err != nil {
		t.Fatal(err)
	}
	if _, err = cachedAnalysis(row, file, "epub"); err == nil {
		t.Fatal("replaced file reused stale analysis")
	}
	stampAnalysis(row, file, info)
	if row.Data["analysis_version"] != nil {
		t.Fatal("changed file was stamped")
	}
}

func TestPreparedImportOrderAndDeferredCovers(t *testing.T) {
	db, lib := importTestDB(t), importLibraryDB(t)
	db.SetMaxOpenConns(1)
	lib.SetMaxOpenConns(1)
	s := newImportService(t, db, lib)
	s.PrepareWorkers = 4
	s.DeferCovers = true
	if err := coverart.MigrateQueue(lib); err != nil {
		t.Fatal(err)
	}
	p := makeValidEpub(t, t.TempDir(), "one.epub")
	q := makeValidEpubDifferent(t, t.TempDir(), "two.epub")
	seedReadyRow(t, db, p, "one")
	seedReadyRow(t, db, q, "two")
	result, err := s.ImportContext(context.Background(), nil, 1, false, ModeIndex)
	if err != nil || result.Indexed != 2 {
		t.Fatalf("%+v %v", result, err)
	}
	var count int
	if err = lib.QueryRow(`SELECT count(*) FROM import_cover_jobs`).Scan(&count); err != nil || count != 2 {
		t.Fatalf("queued %d %v", count, err)
	}
	for _, path := range []string{p, q} {
		if _, err = os.Stat(path); err != nil {
			t.Fatal(err)
		}
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	next := filepath.Join(t.TempDir(), "next.txt")
	os.WriteFile(next, []byte("body"), 0600)
	row := seedReadyRow(t, db, next, "next")
	if _, err = s.ImportContext(ctx, nil, 1, false, ModeIndex); err == nil {
		t.Fatal("cancelled import ran")
	}
	saved, _ := getScanFileByPath(db, row.Path)
	if saved.Status != userdb.ScanStatusReady {
		t.Fatal(saved.Status)
	}
}
func TestCompatibilityRecheckRecoversOnlyFailedRows(t *testing.T) {
	db := importTestDB(t)
	s := newImportService(t, db, importLibraryDB(t))
	root := t.TempDir()
	file := makeValidEpub(t, root, "recover.epub")
	row := seedReadyRow(t, db, file, "recover")
	row.Status = userdb.ScanStatusFailed
	row.Data = map[string]any{"analysis_error_code": "epub.mimetype_invalid", "analysis_error": "old check", "declared_format": "epub"}
	if err := saveScanFile(db, row); err != nil {
		t.Fatal(err)
	}
	active := seedReadyRow(t, db, file+".active", "active")
	active.Status = userdb.ScanStatusImporting
	saveScanFile(db, active)
	result, err := s.RecheckCompatibilityFailures(context.Background(), []string{root})
	if err != nil || result.Recovered != 1 {
		t.Fatalf("%+v %v", result, err)
	}
	var status, raw string
	db.QueryRow(`SELECT status,data FROM scanfiles WHERE id=?`, row.ID).Scan(&status, &raw)
	var data map[string]any
	json.Unmarshal([]byte(raw), &data)
	if status != "ready" || data["previous_analysis_error"] != "old check" || data["analysis_error"] != nil {
		t.Fatal(status, raw)
	}
	db.QueryRow(`SELECT status FROM scanfiles WHERE id=?`, active.ID).Scan(&status)
	if status != "importing" {
		t.Fatal("active record reset")
	}
}
