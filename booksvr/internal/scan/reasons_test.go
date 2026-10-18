package scan

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"talebook/booksvr/internal/userdb"
)

func TestBackfillReasonsPreservesStatuses(t *testing.T) {
	db := importTestDB(t)
	s := newImportService(t, db, importLibraryDB(t))
	root := t.TempDir()
	p := filepath.Join(root, "original.txt")
	q := filepath.Join(root, "copy.txt")
	os.WriteFile(p, []byte("same content"), 0600)
	os.WriteFile(q, []byte("same content"), 0600)
	hash, _ := FileSHA256(p)
	canonical := seedReadyRow(t, db, p, hash)
	canonical.Status = userdb.ScanStatusFailed
	canonical.Data = map[string]any{"analysis_error": "内容不是有效的PDF"}
	saveScanFile(db, canonical)
	copyRow := seedReadyRow(t, db, q, "copy-temp")
	copyRow.Status = userdb.ScanStatusDrop
	saveScanFile(db, copyRow)
	active := seedReadyRow(t, db, filepath.Join(root, "active.txt"), "active")
	active.Status = userdb.ScanStatusImporting
	saveScanFile(db, active)
	missing := seedReadyRow(t, db, filepath.Join(root, "missing.txt"), "missing")
	missing.Status = userdb.ScanStatusDrop
	saveScanFile(db, missing)
	result, err := s.BackfillSkippedReasons(context.Background(), []string{root})
	if err != nil || result.Updated != 2 || result.Missing != 1 {
		t.Fatal(result, err)
	}
	saved, _ := getScanFileByPath(db, q)
	reason, _ := saved.Data["skip_reason"].(string)
	if saved.Status != userdb.ScanStatusDrop || !strings.Contains(reason, p) || !strings.Contains(reason, "内容不是有效的PDF") {
		t.Fatal(saved)
	}
	saved, _ = getScanFileByPath(db, active.Path)
	if saved.Status != userdb.ScanStatusImporting || saved.Data["skip_reason"] != nil {
		t.Fatal(saved)
	}
	again, err := s.BackfillSkippedReasons(context.Background(), []string{root})
	if err != nil || again.Updated != 0 {
		t.Fatal(again, err)
	}
}

func TestPDFCompatibilityRecheckOnlyFailed(t *testing.T) {
	db := importTestDB(t)
	s := newImportService(t, db, importLibraryDB(t))
	root := t.TempDir()
	p := filepath.Join(root, "bom.pdf")
	os.WriteFile(p, []byte("\xef\xbb\xbf%PDF-1.6\nbody"), 0600)
	row := seedReadyRow(t, db, p, "pdf-hash")
	row.Status = userdb.ScanStatusFailed
	row.Data = map[string]any{"analysis_error": "文件内容不是有效的 PDF", "analysis_error_code": "format.mismatch", "declared_format": "pdf"}
	saveScanFile(db, row)
	q := filepath.Join(root, "fake.pdf")
	os.WriteFile(q, []byte("<html>404</html>"), 0600)
	fake := seedReadyRow(t, db, q, "fake-hash")
	fake.Status = userdb.ScanStatusFailed
	fake.Data = row.Data
	saveScanFile(db, fake)
	result, err := s.RecheckCompatibilityFailures(context.Background(), []string{root})
	if err != nil || result.Recovered != 1 {
		t.Fatal(result, err)
	}
	saved, _ := getScanFileByPath(db, p)
	if saved.Status != userdb.ScanStatusReady || saved.Data["compat_recheck_version"] != "pdf-bom-1" {
		t.Fatal(saved)
	}
	saved, _ = getScanFileByPath(db, q)
	if saved.Status != userdb.ScanStatusFailed {
		t.Fatal(saved)
	}
	again, err := s.RecheckCompatibilityFailures(context.Background(), []string{root})
	if err != nil || again.Recovered != 0 {
		t.Fatal(again, err)
	}
}
