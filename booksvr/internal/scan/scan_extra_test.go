package scan

import (
	"archive/zip"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"talebook/booksvr/internal/userdb"
)

// makeValidEpub 生成一个合法的文本型 EPUB。
func makeValidEpub(t *testing.T, dir, name string) string {
	t.Helper()
	p := filepath.Join(dir, name)
	f, err := os.Create(p)
	if err != nil {
		t.Fatalf("创建失败: %v", err)
	}
	zw := zip.NewWriter(f)
	stored := func(n, data string) {
		w, err := zw.CreateHeader(&zip.FileHeader{Name: n, Method: zip.Store})
		if err != nil {
			t.Fatalf("创建条目失败: %v", err)
		}
		if _, err := w.Write([]byte(data)); err != nil {
			t.Fatalf("写入失败: %v", err)
		}
	}
	stored("mimetype", "application/epub+zip")
	stored("META-INF/container.xml",
		`<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>`)
	stored("OEBPS/content.opf",
		`<?xml version="1.0"?><package><manifest>`+
			`<item id="p1" href="page.xhtml" media-type="application/xhtml+xml"/>`+
			`</manifest><spine><itemref idref="p1"/></spine></package>`)
	stored("OEBPS/page.xhtml", `<html><body><p>`+strings.Repeat("word ", 50)+`</p></body></html>`)
	if err := zw.Close(); err != nil {
		t.Fatalf("关闭失败: %v", err)
	}
	f.Close()
	return p
}

// TestScanReadyValidEpub 合法 EPUB 走通完整成功路径。
func TestScanReadyValidEpub(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := testDB(t)
	svc := newTestService(db)

	res, err := svc.Scan(dir, 0)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if res.Ready != 1 {
		t.Fatalf("ready = %d, want 1（res=%+v）", res.Ready, res)
	}

	row, err := getScanFileByPath(db, p)
	if err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if row.Status != userdb.ScanStatusReady {
		t.Errorf("status = %q, want ready", row.Status)
	}
	if row.Title != "三体" {
		t.Errorf("title = %q, want 三体", row.Title)
	}
	if row.Author != "佚名" {
		t.Errorf("author = %q, want 佚名", row.Author)
	}
	// 媒体分析结果应写入 data。
	if row.Data["media_type"] != "ebook" {
		t.Errorf("media_type = %v, want ebook", row.Data["media_type"])
	}
	if row.Data["detected_format"] != "epub" {
		t.Errorf("detected_format = %v", row.Data["detected_format"])
	}
	if row.Data["analysis_reason"] != "text_spine" {
		t.Errorf("analysis_reason = %v", row.Data["analysis_reason"])
	}
}

// TestScanMarksExistingValidEpub 书库已有同名同作者同格式时标记 exist。
func TestScanMarksExistingValidEpub(t *testing.T) {
	dir := t.TempDir()
	makeValidEpub(t, dir, "三体.epub")
	db := testDB(t)
	lib := libraryDB(t)
	svc := newTestService(db)
	svc.LibraryDB = lib

	// 书库中已有《三体》，作者「佚名」，含 EPUB 格式。
	if _, err := lib.Exec(`INSERT INTO books (id, title) VALUES (42, '三体')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO authors (id, name) VALUES (1, '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO books_authors_link (book, author) VALUES (42, 1)`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO data (book, format, name) VALUES (42, 'EPUB', 'x.epub')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}

	res, err := svc.Scan(dir, 0)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if res.Exist != 1 {
		t.Fatalf("exist = %d, want 1（res=%+v）", res.Exist, res)
	}

	row, _ := getScanFileByPath(db, filepath.Join(dir, "三体.epub"))
	if row.Status != userdb.ScanStatusExist {
		t.Errorf("status = %q, want exist", row.Status)
	}
	if row.BookID != 42 {
		t.Errorf("book_id = %d, want 42", row.BookID)
	}
}

// TestScanExistingDifferentAuthor 同名不同作者不标记 exist。
func TestScanExistingDifferentAuthor(t *testing.T) {
	dir := t.TempDir()
	makeValidEpub(t, dir, "三体.epub")
	db := testDB(t)
	lib := libraryDB(t)
	svc := newTestService(db)
	svc.LibraryDB = lib

	if _, err := lib.Exec(`INSERT INTO books (id, title) VALUES (42, '三体')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO authors (id, name) VALUES (1, '刘慈欣')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO books_authors_link (book, author) VALUES (42, 1)`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO data (book, format, name) VALUES (42, 'EPUB', 'x.epub')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}

	res, err := svc.Scan(dir, 0)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if res.Exist != 0 {
		t.Errorf("同名不同作者不应标记 exist，得到 %+v", res)
	}
	if res.Ready != 1 {
		t.Errorf("ready = %d, want 1", res.Ready)
	}
}

// TestScanExistingDifferentFormat 同名同作者但书库无该格式时不标记 exist。
func TestScanExistingDifferentFormat(t *testing.T) {
	dir := t.TempDir()
	makeValidEpub(t, dir, "三体.epub")
	db := testDB(t)
	lib := libraryDB(t)
	svc := newTestService(db)
	svc.LibraryDB = lib

	if _, err := lib.Exec(`INSERT INTO books (id, title) VALUES (42, '三体')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO authors (id, name) VALUES (1, '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO books_authors_link (book, author) VALUES (42, 1)`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	// 书库只有 MOBI，没有 EPUB。
	if _, err := lib.Exec(`INSERT INTO data (book, format, name) VALUES (42, 'MOBI', 'x.mobi')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}

	res, err := svc.Scan(dir, 0)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if res.Exist != 0 {
		t.Errorf("书库无该格式不应标记 exist，得到 %+v", res)
	}
}

// TestScanExistingNoLibraryDB 无书库句柄时跳过重复检测。
func TestScanExistingNoLibraryDB(t *testing.T) {
	dir := t.TempDir()
	makeValidEpub(t, dir, "三体.epub")
	db := testDB(t)
	svc := newTestService(db)
	// LibraryDB 为 nil。

	res, err := svc.Scan(dir, 0)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if res.Ready != 1 {
		t.Errorf("ready = %d, want 1", res.Ready)
	}
	if res.Exist != 0 {
		t.Errorf("无书库时不应标记 exist，得到 %+v", res)
	}
}

// TestScanMultipleFiles 多文件扫描统计。
//
// 两个 EPUB 内容相同，第二个会被真实哈希去重判为 drop。
func TestScanMultipleFiles(t *testing.T) {
	dir := t.TempDir()
	makeValidEpub(t, dir, "a.epub")
	makeValidEpub(t, dir, "b.epub")
	writeBook(t, dir, "bad.epub", []byte("not a zip"))
	db := testDB(t)
	svc := newTestService(db)

	res, err := svc.Scan(dir, 0)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if res.Candidates != 3 {
		t.Errorf("candidates = %d, want 3", res.Candidates)
	}
	// 内容相同的两个 EPUB：一个 ready，一个 drop。
	if res.Ready != 1 {
		t.Errorf("ready = %d, want 1", res.Ready)
	}
	if res.Dropped != 1 {
		t.Errorf("dropped = %d, want 1", res.Dropped)
	}
	if res.Failed != 1 {
		t.Errorf("failed = %d, want 1", res.Failed)
	}
}

// TestScanMultipleDistinctFiles 内容不同的多文件都判为 ready。
func TestScanMultipleDistinctFiles(t *testing.T) {
	dir := t.TempDir()
	makeValidEpub(t, dir, "a.epub")
	makeValidEpubDifferent(t, dir, "b.epub")
	db := testDB(t)
	svc := newTestService(db)

	res, err := svc.Scan(dir, 0)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if res.Ready != 2 {
		t.Errorf("ready = %d, want 2（res=%+v）", res.Ready, res)
	}
}

// makeValidEpubDifferent 生成一个内容与 makeValidEpub 不同的合法 EPUB。
func makeValidEpubDifferent(t *testing.T, dir, name string) string {
	t.Helper()
	p := filepath.Join(dir, name)
	f, err := os.Create(p)
	if err != nil {
		t.Fatalf("创建失败: %v", err)
	}
	zw := zip.NewWriter(f)
	stored := func(n, data string) {
		w, err := zw.CreateHeader(&zip.FileHeader{Name: n, Method: zip.Store})
		if err != nil {
			t.Fatalf("创建条目失败: %v", err)
		}
		if _, err := w.Write([]byte(data)); err != nil {
			t.Fatalf("写入失败: %v", err)
		}
	}
	stored("mimetype", "application/epub+zip")
	stored("META-INF/container.xml",
		`<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>`)
	stored("OEBPS/content.opf",
		`<?xml version="1.0"?><package><manifest>`+
			`<item id="p1" href="page.xhtml" media-type="application/xhtml+xml"/>`+
			`</manifest><spine><itemref idref="p1"/></spine></package>`)
	// 内容与 makeValidEpub 不同。
	stored("OEBPS/page.xhtml", `<html><body><p>`+strings.Repeat("other ", 60)+`</p></body></html>`)
	if err := zw.Close(); err != nil {
		t.Fatalf("关闭失败: %v", err)
	}
	f.Close()
	return p
}

// TestScanComicContainer 漫画容器走通成功路径。
func TestScanComicContainer(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "漫画.cbz")
	f, err := os.Create(p)
	if err != nil {
		t.Fatalf("创建失败: %v", err)
	}
	zw := zip.NewWriter(f)
	w, err := zw.Create("page1.png")
	if err != nil {
		t.Fatalf("创建失败: %v", err)
	}
	png := make([]byte, 24)
	copy(png, []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'})
	if _, err := w.Write(png); err != nil {
		t.Fatalf("写入失败: %v", err)
	}
	if err := zw.Close(); err != nil {
		t.Fatalf("关闭失败: %v", err)
	}
	f.Close()

	db := testDB(t)
	svc := newTestService(db)
	res, err := svc.Scan(dir, 0)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if res.Ready != 1 {
		t.Fatalf("ready = %d, want 1（res=%+v）", res.Ready, res)
	}
	row, _ := getScanFileByPath(db, p)
	if row.Data["media_type"] != "comic" {
		t.Errorf("media_type = %v, want comic", row.Data["media_type"])
	}
}

// TestScanRegisterTasksStatFailure 文件在收集与登记之间消失。
func TestScanRegisterTasksStatFailure(t *testing.T) {
	dir := t.TempDir()
	p := writeBook(t, dir, "a.epub", []byte("PK\x03\x04x"))
	db := testDB(t)
	svc := newTestService(db)

	// 先插入一条 NEW 记录，再删除文件，模拟登记后消失。
	if _, err := db.Exec(`INSERT INTO scanfiles (scan_id, name, path, hash, status, create_time, update_time, data)
		VALUES (0, 'a.epub', ?, 'fstat:6/abc', 'new', 't', 't', '{}')`, p); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if err := os.Remove(p); err != nil {
		t.Fatalf("删除失败: %v", err)
	}
	// 收集阶段找不到文件，候选为 0。
	res, err := svc.Scan(dir, 0)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if res.Candidates != 0 {
		t.Errorf("candidates = %d, want 0", res.Candidates)
	}
}

// TestScanNonNewStatusSkipped 非 NEW 且真实哈希的记录被跳过。
func TestScanNonNewStatusSkipped(t *testing.T) {
	dir := t.TempDir()
	p := writeBook(t, dir, "a.epub", []byte("PK\x03\x04x"))
	db := testDB(t)
	svc := newTestService(db)

	// 已 imported 且真实哈希 → 不算 done 之外的处理对象。
	if _, err := db.Exec(`INSERT INTO scanfiles (scan_id, name, path, hash, status, create_time, update_time, data)
		VALUES (0, 'a.epub', ?, 'sha256:abc', 'imported', 't', 't', '{}')`, p); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	res, err := svc.Scan(dir, 0)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	// imported 属于 done，应被跳过。
	if res.Skipped != 1 {
		t.Errorf("skipped = %d, want 1", res.Skipped)
	}
	if res.Inserted != 0 {
		t.Errorf("inserted = %d, want 0", res.Inserted)
	}
}

// TestClockDefault 默认时钟。
func TestClockDefault(t *testing.T) {
	svc := NewService(testDB(t), supported())
	if svc.clock().IsZero() {
		t.Error("默认时钟不应为零值")
	}
	if svc.now() == "" {
		t.Error("now() 不应为空")
	}
}
