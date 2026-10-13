package main

import (
	"database/sql"
	"os"
	"path/filepath"
	"testing"

	_ "modernc.org/sqlite"
)

// newWiringDB 建一个内存库用于构造服务实例。
func newWiringDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	db.SetMaxOpenConns(1)
	t.Cleanup(func() { db.Close() })
	return db
}

// TestServiceWiringSeparatesUserAndLibraryDB 回归真实缺陷：
//
// scan.Service 有两个句柄，必须指向不同的库：
//   - DB 查 scanfiles（Talebook 自有库）
//   - LibraryDB 查 books（Calibre 元数据库）
//
// 曾出现两个句柄都指向自有库，导致扫描时报 `no such table: books`。
func TestServiceWiringSeparatesUserAndLibraryDB(t *testing.T) {
	userDB := newWiringDB(t)
	libraryDB := newWiringDB(t)

	w := newServiceWiring(userDB, libraryDB, &serveOptions{})

	if w.scanService.DB != userDB {
		t.Error("scanService.DB 应指向自有库（scanfiles 所在）")
	}
	if w.scanService.LibraryDB != libraryDB {
		t.Error("scanService.LibraryDB 应指向 Calibre 库（books 所在）")
	}
	if w.scanService.DB == w.scanService.LibraryDB {
		t.Error("两个句柄不应相同（双库部署下是两个文件）")
	}
}

// TestServiceWiringPopulatesScanService 覆盖扫描服务构造。
func TestServiceWiringPopulatesScanService(t *testing.T) {
	db := newWiringDB(t)
	w := newServiceWiring(db, db, &serveOptions{ImportMode: "copy"})

	if w.scanService == nil {
		t.Fatal("scanService 为 nil")
	}
	if w.scanService.LibraryDB != db {
		t.Error("scanService.LibraryDB 未接线")
	}
	if w.scanService.SavedImportMode != "copy" {
		t.Errorf("SavedImportMode = %q，期望 copy", w.scanService.SavedImportMode)
	}
	if len(w.scanService.SupportedFormats) == 0 {
		t.Error("SupportedFormats 为空")
	}
	for _, f := range []string{"epub", "mobi", "pdf", "txt", "cbz"} {
		if !w.scanService.SupportedFormats[f] {
			t.Errorf("SupportedFormats 缺少 %s", f)
		}
	}
}

// TestServiceWiringPopulatesPluginRegistry 覆盖插件注册表构造。
func TestServiceWiringPopulatesPluginRegistry(t *testing.T) {
	db := newWiringDB(t)
	w := newServiceWiring(db, db, &serveOptions{})
	if w.pluginRegistry == nil {
		t.Fatal("pluginRegistry 为 nil")
	}
}

// TestServiceWiringPopulatesComicService 覆盖漫画服务构造。
func TestServiceWiringPopulatesComicService(t *testing.T) {
	db := newWiringDB(t)
	w := newServiceWiring(db, db, &serveOptions{})
	if w.comicService == nil {
		t.Fatal("comicService 为 nil")
	}
}

// TestServiceWiringPopulatesWatch 覆盖监控状态构造。
func TestServiceWiringPopulatesWatch(t *testing.T) {
	db := newWiringDB(t)
	w := newServiceWiring(db, db, &serveOptions{})
	if w.watch == nil {
		t.Fatal("watch 为 nil")
	}
	status := w.watchStatus()
	for _, key := range []string{"state", "queued", "running", "failed", "last_scan_at", "message"} {
		if _, ok := status[key]; !ok {
			t.Errorf("watchStatus 缺少 %s", key)
		}
	}
}

// TestServiceSetAllFieldsNonNil 覆盖 ServiceSet 全部字段非空。
func TestServiceSetAllFieldsNonNil(t *testing.T) {
	db := newWiringDB(t)
	set := newServiceWiring(db, db, &serveOptions{}).serviceSet()

	if set.ScanService == nil {
		t.Error("ServiceSet.ScanService 为 nil")
	}
	if set.StartScan == nil {
		t.Error("ServiceSet.StartScan 为 nil")
	}
	if set.StartImport == nil {
		t.Error("ServiceSet.StartImport 为 nil")
	}
	if set.ImportWatchStatus == nil {
		t.Error("ServiceSet.ImportWatchStatus 为 nil")
	}
	if set.PluginRegistry == nil {
		t.Error("ServiceSet.PluginRegistry 为 nil")
	}
	if set.ComicService == nil {
		t.Error("ServiceSet.ComicService 为 nil")
	}
	if set.ScanService() == nil {
		t.Error("ServiceSet.ScanService() 返回 nil")
	}
}

// TestResolveVersionFromFile 覆盖从版本文件读取版本号。
func TestResolveVersionFromFile(t *testing.T) {
	dir := t.TempDir()
	libRoot := filepath.Join(dir, "library")
	if err := os.MkdirAll(libRoot, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "candle-reader-version.txt"), []byte("v9.9.9\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	got := resolveVersion(&serveOptions{LibraryRoot: libRoot})
	if got != "v9.9.9" {
		t.Errorf("resolveVersion = %q，期望 v9.9.9", got)
	}
}

// TestResolveVersionExplicitWins 覆盖显式配置优先。
func TestResolveVersionExplicitWins(t *testing.T) {
	got := resolveVersion(&serveOptions{Version: "v1.2.3"})
	if got != "v1.2.3" {
		t.Errorf("resolveVersion = %q，期望 v1.2.3", got)
	}
}

// TestResolveVersionFallback 覆盖无版本文件时的回落。
func TestResolveVersionFallback(t *testing.T) {
	got := resolveVersion(&serveOptions{LibraryRoot: filepath.Join(t.TempDir(), "nope")})
	if got != "unknown" {
		t.Errorf("resolveVersion = %q，期望 unknown", got)
	}
}

// TestResolveSeedFileExplicitWins 覆盖显式种子文件优先。
func TestResolveSeedFileExplicitWins(t *testing.T) {
	got := resolveSeedFile(&serveOptions{BookSourceSeedFile: "/tmp/x.json"})
	if got != "/tmp/x.json" {
		t.Errorf("resolveSeedFile = %q，期望 /tmp/x.json", got)
	}
}

// TestResolveSeedFileDetects 覆盖自动探测种子文件。
func TestResolveSeedFileDetects(t *testing.T) {
	dir := t.TempDir()
	seedDir := filepath.Join(dir, "webserver", "services", "booksource", "seeds")
	if err := os.MkdirAll(seedDir, 0o755); err != nil {
		t.Fatal(err)
	}
	seed := filepath.Join(seedDir, "booksources.seed.json")
	if err := os.WriteFile(seed, []byte("[]"), 0o644); err != nil {
		t.Fatal(err)
	}
	libRoot := filepath.Join(dir, "library")
	if err := os.MkdirAll(libRoot, 0o755); err != nil {
		t.Fatal(err)
	}

	got := resolveSeedFile(&serveOptions{LibraryRoot: libRoot})
	if got != seed {
		t.Errorf("resolveSeedFile = %q，期望 %q", got, seed)
	}
}

// TestResolveSeedFileMissing 覆盖种子文件不存在时返回空串。
func TestResolveSeedFileMissing(t *testing.T) {
	got := resolveSeedFile(&serveOptions{LibraryRoot: filepath.Join(t.TempDir(), "nope")})
	if got != "" {
		t.Errorf("resolveSeedFile = %q，期望空串", got)
	}
}
