package httpapi

import (
	"database/sql"
	"os"
	"path/filepath"
	"testing"

	"talebook/booksvr/internal/pluginruntime"
)

// newSaveOnlineRealFixture 建一个带真实插件安装的保存服务夹具。
func newSaveOnlineRealFixture(t *testing.T) (*saveOnlineService, *sql.DB, string) {
	t.Helper()
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	createFormatTables(t, db)
	dir := t.TempDir()
	settings := map[string]any{"upload_path": dir}
	rt := pluginruntime.NewRuntime(db, settings, pluginruntime.NewPluginRegistry())
	if _, err := pluginruntime.EnsureBuiltinInstallations(db, 1, settings, rt.Registry); err != nil {
		t.Fatalf("物化内置插件失败: %v", err)
	}
	return newSaveOnlineService(db, settings), db, dir
}

// TestSaveOnlineUnknownSourceWithCatalog 覆盖目录可用但书源不存在。
func TestSaveOnlineUnknownSourceWithCatalog(t *testing.T) {
	svc, _, _ := newSaveOnlineRealFixture(t)
	err := svc.Save(adminCtx(1), "definitely-not-a-source", "http://x/1", "txt", true, 0)
	if err == nil {
		t.Fatal("未知书源应返回错误")
	}
}

// TestSaveOnlineImportTxtDirect 覆盖 TXT 导入路径。
func TestSaveOnlineImportTxtDirect(t *testing.T) {
	svc, db, dir := newSaveOnlineRealFixture(t)
	txt := filepath.Join(dir, "novel.txt")
	if err := os.WriteFile(txt, []byte("第一章 正文\n内容"), 0o644); err != nil {
		t.Fatal(err)
	}

	detail := bookDetailOf(map[string]any{"name": "网络小说", "author": "作者甲"})
	bookID, err := svc.importTxt(detail, txt)
	if err != nil {
		t.Fatalf("导入失败: %v", err)
	}
	if bookID == 0 {
		t.Fatal("导入应返回非零 book_id")
	}

	var title string
	if err := db.QueryRow(`SELECT title FROM books WHERE id = ?`, bookID).Scan(&title); err != nil {
		t.Fatal(err)
	}
	if title != "网络小说" {
		t.Errorf("title = %q，期望 网络小说", title)
	}
}

// TestSaveOnlineImportDownloaded 覆盖整本文件导入路径。
func TestSaveOnlineImportDownloaded(t *testing.T) {
	svc, db, _ := newSaveOnlineRealFixture(t)
	detail := bookDetailOf(map[string]any{"name": "下载书", "author": "作者乙"})

	bookID, err := svc.importDownloaded(detail, map[string]any{
		"format":   "epub",
		"filename": "downloaded",
		"content":  "PK\x03\x04body",
	})
	if err != nil {
		t.Fatalf("导入失败: %v", err)
	}
	if bookID == 0 {
		t.Fatal("导入应返回非零 book_id")
	}

	var title string
	if err := db.QueryRow(`SELECT title FROM books WHERE id = ?`, bookID).Scan(&title); err != nil {
		t.Fatal(err)
	}
	if title != "下载书" {
		t.Errorf("title = %q，期望 下载书", title)
	}
}

// TestSaveOnlineImportDownloadedNoFormat 覆盖缺少格式。
func TestSaveOnlineImportDownloadedNoFormat(t *testing.T) {
	svc, _, _ := newSaveOnlineRealFixture(t)
	detail := bookDetailOf(map[string]any{"name": "书"})
	if _, err := svc.importDownloaded(detail, map[string]any{"content": "x"}); err == nil {
		t.Error("缺少格式应返回错误")
	}
}

// TestSaveOnlineImportDownloadedNoContent 覆盖缺少内容。
func TestSaveOnlineImportDownloadedNoContent(t *testing.T) {
	svc, _, _ := newSaveOnlineRealFixture(t)
	detail := bookDetailOf(map[string]any{"name": "书"})
	if _, err := svc.importDownloaded(detail, map[string]any{"format": "epub"}); err == nil {
		t.Error("缺少内容应返回错误")
	}
}

// TestSaveOnlineImportDownloadedNoUploadDir 覆盖未配置上传目录。
func TestSaveOnlineImportDownloadedNoUploadDir(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	createFormatTables(t, db)
	svc := newSaveOnlineService(db, map[string]any{})
	detail := bookDetailOf(map[string]any{"name": "书"})
	if _, err := svc.importDownloaded(detail, map[string]any{
		"format": "epub", "content": "PK\x03\x04x",
	}); err == nil {
		t.Error("未配置上传目录应返回错误")
	}
}

// TestSaveOnlineImportTxtNoUploadDir 覆盖 TXT 导入无上传目录。
func TestSaveOnlineImportTxtNoUploadDir(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	createFormatTables(t, db)
	svc := newSaveOnlineService(db, map[string]any{})
	detail := bookDetailOf(map[string]any{"name": "书"})
	// importTxt 直接使用传入路径，不依赖 uploadDir。
	if _, err := svc.importTxt(detail, filepath.Join(t.TempDir(), "missing.txt")); err == nil {
		t.Error("文件不存在应返回错误")
	}
}

// TestSaveOnlineImportDownloadedUsesSafeFilename 覆盖文件名清理。
func TestSaveOnlineImportDownloadedUsesSafeFilename(t *testing.T) {
	svc, _, dir := newSaveOnlineRealFixture(t)
	detail := bookDetailOf(map[string]any{"name": "书"})

	if _, err := svc.importDownloaded(detail, map[string]any{
		"format":   "epub",
		"filename": "../../evil",
		"content":  "PK\x03\x04body",
	}); err != nil {
		t.Fatalf("导入失败: %v", err)
	}
	// 不应在 upload 目录之外产生文件。
	outside := filepath.Join(filepath.Dir(dir), "evil.epub")
	if _, err := os.Stat(outside); err == nil {
		t.Fatal("路径穿越写出了 upload 目录之外的文件")
	}
}
