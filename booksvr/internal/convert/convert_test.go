package convert

import (
	"database/sql"
	"os"
	"path/filepath"
	"testing"

	_ "modernc.org/sqlite"
)

// newTestDB 建一个带 Calibre 表的内存库。
func newTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	db.SetMaxOpenConns(1)
	t.Cleanup(func() { db.Close() })

	stmts := []string{
		`CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT, author_sort TEXT,
			path TEXT, timestamp INTEGER, pubdate TEXT, series_index REAL,
			sort TEXT, has_cover INTEGER, uuid TEXT, last_modified TEXT)`,
		`CREATE TABLE book_formats (id INTEGER PRIMARY KEY, book_id INTEGER, format TEXT,
			path TEXT, size INTEGER, mtime INTEGER, hash TEXT, UNIQUE (book_id, format))`,
		`CREATE TABLE data (id INTEGER PRIMARY KEY, book INTEGER, format TEXT,
			uncompressed_size INTEGER, name TEXT)`,
	}
	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			t.Fatalf("建表失败: %v\n%s", err, s)
		}
	}
	return db
}

// seedBook 插入一本书。
func seedBook(t *testing.T, db *sql.DB, id int64, title string) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO books
		(id, title, author_sort, path, timestamp, pubdate, series_index, sort, has_cover, uuid, last_modified)
		VALUES (?, ?, 'a', 'p', 0, '', 1.0, ?, 0, 'u', '')`, id, title, title); err != nil {
		t.Fatalf("插入书失败: %v", err)
	}
}

// seedFormat 登记格式并写 data 表。
func seedFormat(t *testing.T, db *sql.DB, bookID int64, format, path string) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO book_formats (book_id, format, path, size, mtime)
		VALUES (?, ?, ?, 0, 0)`, bookID, format, path); err != nil {
		t.Fatalf("登记格式失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO data (book, format, uncompressed_size, name)
		VALUES (?, ?, 0, ?)`, bookID, format, filepath.Base(path)); err != nil {
		t.Fatalf("写 data 失败: %v", err)
	}
}

// newConvertFixture 建一个转换服务夹具。
func newConvertFixture(t *testing.T) (*Service, *sql.DB, string) {
	t.Helper()
	db := newTestDB(t)
	dir := t.TempDir()
	return NewService(db, dir), db, dir
}

// TestOptionsTargetExists 覆盖目标格式已存在。
func TestOptionsTargetExists(t *testing.T) {
	svc, db, _ := newConvertFixture(t)
	seedBook(t, db, 1, "书")
	seedFormat(t, db, 1, "EPUB", "/tmp/a.epub")

	opts, err := svc.Options(1)
	if err != nil {
		t.Fatalf("获取选项失败: %v", err)
	}
	var epubOpt *ConversionOption
	for i := range opts {
		if opts[i].TargetFormat == "epub" {
			epubOpt = &opts[i]
		}
	}
	if epubOpt == nil {
		t.Fatal("缺少 epub 目标选项")
	}
	if epubOpt.Available {
		t.Error("目标已存在时应不可用")
	}
	if epubOpt.Reason != "target_exists" {
		t.Errorf("reason = %q，期望 target_exists", epubOpt.Reason)
	}
}

// TestOptionsSourceMissing 覆盖源格式缺失。
func TestOptionsSourceMissing(t *testing.T) {
	svc, db, _ := newConvertFixture(t)
	seedBook(t, db, 1, "书")

	opts, _ := svc.Options(1)
	for _, o := range opts {
		if o.Available {
			t.Errorf("%s 无源格式时应不可用", o.TargetFormat)
		}
		if o.Reason != "source_missing" {
			t.Errorf("reason = %q，期望 source_missing", o.Reason)
		}
	}
}

// TestOptionsAvailable 覆盖可用路线。
func TestOptionsAvailable(t *testing.T) {
	svc, db, _ := newConvertFixture(t)
	seedBook(t, db, 1, "书")
	seedFormat(t, db, 1, "MOBI", "/tmp/a.mobi")

	opts, _ := svc.Options(1)
	var found bool
	for _, o := range opts {
		if o.TargetFormat == "epub" && o.Available {
			found = true
			if o.SourceFormat != "mobi" {
				t.Errorf("source_format = %q，期望 mobi", o.SourceFormat)
			}
			if o.Converter != "ebook-convert" {
				t.Errorf("converter = %q，期望 ebook-convert", o.Converter)
			}
		}
	}
	if !found {
		t.Error("mobi → epub 应可用")
	}
}

// TestOptionsTxt2EpubConverter 覆盖 TXT 转换器选择。
func TestOptionsTxt2EpubConverter(t *testing.T) {
	svc, db, _ := newConvertFixture(t)
	seedBook(t, db, 1, "书")
	seedFormat(t, db, 1, "TXT", "/tmp/a.txt")

	opts, _ := svc.Options(1)
	for _, o := range opts {
		if o.TargetFormat == "epub" && o.SourceFormat == "txt" {
			if o.Converter != "txt2epub" {
				t.Errorf("converter = %q，期望 txt2epub", o.Converter)
			}
			return
		}
	}
	t.Error("未找到 txt → epub 选项")
}

// TestKindleSourceAzw3 覆盖 azw3 优先。
func TestKindleSourceAzw3(t *testing.T) {
	svc, db, dir := newConvertFixture(t)
	seedBook(t, db, 1, "书")
	azw3 := filepath.Join(dir, "a.azw3")
	if err := os.WriteFile(azw3, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	seedFormat(t, db, 1, "AZW3", azw3)
	seedFormat(t, db, 1, "MOBI", azw3)

	format, _, ok := svc.kindleSource(1)
	if !ok {
		t.Fatal("应识别出可转换格式")
	}
	if format != "azw3" {
		t.Errorf("format = %q，期望 azw3", format)
	}
}

// TestKindleSourceSkipsEpub 覆盖已有 EPUB 时跳过。
func TestKindleSourceSkipsEpub(t *testing.T) {
	svc, db, dir := newConvertFixture(t)
	seedBook(t, db, 1, "书")
	p := filepath.Join(dir, "a.mobi")
	if err := os.WriteFile(p, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	seedFormat(t, db, 1, "MOBI", p)
	seedFormat(t, db, 1, "EPUB", p)

	if _, _, ok := svc.kindleSource(1); ok {
		t.Error("已有 EPUB 时应跳过")
	}
}

// TestKindleSourceNoKindleFormat 覆盖无 Kindle 格式。
func TestKindleSourceNoKindleFormat(t *testing.T) {
	svc, db, dir := newConvertFixture(t)
	seedBook(t, db, 1, "书")
	p := filepath.Join(dir, "a.pdf")
	if err := os.WriteFile(p, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	seedFormat(t, db, 1, "PDF", p)

	if _, _, ok := svc.kindleSource(1); ok {
		t.Error("PDF 不是 Kindle 格式，应跳过")
	}
}

// TestKindleSourceMissingFile 覆盖文件缺失。
func TestKindleSourceMissingFile(t *testing.T) {
	svc, db, _ := newConvertFixture(t)
	seedBook(t, db, 1, "书")
	seedFormat(t, db, 1, "MOBI", "/nonexistent/a.mobi")

	if _, _, ok := svc.kindleSource(1); ok {
		t.Error("文件缺失时应跳过")
	}
}

// TestConvertAllConverts 覆盖批量转换。
//
// 必须注入真实转换器：无转换器时 convertOne 会明确报错（见
// TestConvertOneWithoutConverterFails），不再把源文件改名成 .epub。
func TestConvertAllConverts(t *testing.T) {
	svc, db, dir := newConvertFixture(t)
	seedBook(t, db, 1, "书")
	src := filepath.Join(dir, "a.mobi")
	if err := os.WriteFile(src, []byte("mobi-body"), 0o644); err != nil {
		t.Fatal(err)
	}
	seedFormat(t, db, 1, "MOBI", src)
	// 假转换器：写出一个非空的 EPUB 产物。
	svc.Converter = func(_, dst string) error {
		return os.WriteFile(dst, []byte("epub-body"), 0o644)
	}

	progress, err := svc.ConvertAll([]int64{1})
	if err != nil {
		t.Fatalf("转换失败: %v", err)
	}
	if progress.Done != 1 {
		t.Errorf("done = %d，期望 1", progress.Done)
	}
	if progress.Running {
		t.Error("完成后 running 应为 false")
	}

	// EPUB 应已登记。
	var n int
	if err := db.QueryRow(`SELECT COUNT(1) FROM book_formats WHERE book_id = 1 AND format = 'EPUB'`).
		Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != 1 {
		t.Errorf("EPUB 登记数 = %d，期望 1", n)
	}
}

// TestConvertOneWithoutConverterFails 回归：无转换器时必须报错，
// 不能把源文件改名成 .epub。
//
// 用户可见现象：阅读器报「电子书加载超时」——因为拿到的是一个
// 扩展名为 .epub 但内容是 MOBI 的文件。
func TestConvertOneWithoutConverterFails(t *testing.T) {
	svc, db, dir := newConvertFixture(t)
	seedBook(t, db, 1, "书")
	src := filepath.Join(dir, "a.mobi")
	if err := os.WriteFile(src, []byte("mobi-body"), 0o644); err != nil {
		t.Fatal(err)
	}
	seedFormat(t, db, 1, "MOBI", src)
	svc.Converter = nil

	if err := svc.convertOne(1, "MOBI", src); err == nil {
		t.Fatal("无转换器时应报错")
	}

	// 不得登记任何 EPUB。
	var n int
	if err := db.QueryRow(`SELECT COUNT(1) FROM book_formats WHERE book_id = 1 AND format = 'EPUB'`).
		Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != 0 {
		t.Errorf("EPUB 登记数 = %d，期望 0（不得登记假 EPUB）", n)
	}
}

// TestConvertOneRejectsEmptyOutput 回归：空产物不得登记。
//
// 空 EPUB 会让详情页显示「EPUB · 0B」，阅读器也会加载超时。
func TestConvertOneRejectsEmptyOutput(t *testing.T) {
	svc, db, dir := newConvertFixture(t)
	seedBook(t, db, 1, "书")
	src := filepath.Join(dir, "a.mobi")
	if err := os.WriteFile(src, []byte("mobi-body"), 0o644); err != nil {
		t.Fatal(err)
	}
	seedFormat(t, db, 1, "MOBI", src)
	// 转换器写出 0 字节。
	svc.Converter = func(_, dst string) error {
		return os.WriteFile(dst, nil, 0o644)
	}

	if err := svc.convertOne(1, "MOBI", src); err == nil {
		t.Fatal("空产物时应报错")
	}

	var n int
	if err := db.QueryRow(`SELECT COUNT(1) FROM book_formats WHERE book_id = 1 AND format = 'EPUB'`).
		Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != 0 {
		t.Errorf("EPUB 登记数 = %d，期望 0", n)
	}
}

// TestConvertOneKeepsOutputFile 回归：登记后不得删除产物。
//
// 旧实现登记完就 os.Remove，导致阅读器拿不到文件。
func TestConvertOneKeepsOutputFile(t *testing.T) {
	svc, db, dir := newConvertFixture(t)
	seedBook(t, db, 1, "书")
	src := filepath.Join(dir, "a.mobi")
	if err := os.WriteFile(src, []byte("mobi-body"), 0o644); err != nil {
		t.Fatal(err)
	}
	seedFormat(t, db, 1, "MOBI", src)
	svc.Converter = func(_, dst string) error {
		return os.WriteFile(dst, []byte("epub-body"), 0o644)
	}

	if err := svc.convertOne(1, "MOBI", src); err != nil {
		t.Fatalf("convertOne: %v", err)
	}

	var outPath string
	if err := db.QueryRow(
		`SELECT path FROM book_formats WHERE book_id = 1 AND format = 'EPUB'`).Scan(&outPath); err != nil {
		t.Fatalf("查询登记路径失败: %v", err)
	}
	info, err := os.Stat(outPath)
	if err != nil {
		t.Fatalf("登记的文件不存在（被误删）: %v", err)
	}
	if info.Size() == 0 {
		t.Error("登记的文件为 0 字节")
	}
}

// TestConvertAllSkips 覆盖跳过计数。
func TestConvertAllSkips(t *testing.T) {
	svc, db, _ := newConvertFixture(t)
	seedBook(t, db, 1, "书")

	progress, err := svc.ConvertAll([]int64{1})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if progress.Skip != 1 {
		t.Errorf("skip = %d，期望 1", progress.Skip)
	}
}

// TestConvertAllAllBooks 覆盖空 idlist 时扫描全部。
func TestConvertAllAllBooks(t *testing.T) {
	svc, db, dir := newConvertFixture(t)
	seedBook(t, db, 1, "书")
	src := filepath.Join(dir, "a.mobi")
	if err := os.WriteFile(src, []byte("body"), 0o644); err != nil {
		t.Fatal(err)
	}
	seedFormat(t, db, 1, "MOBI", src)

	progress, err := svc.ConvertAll(nil)
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if progress.Total != 1 {
		t.Errorf("total = %d，期望 1", progress.Total)
	}
}

// TestConvertAllCustomConverter 覆盖注入转换器。
func TestConvertAllCustomConverter(t *testing.T) {
	svc, db, dir := newConvertFixture(t)
	seedBook(t, db, 1, "书")
	src := filepath.Join(dir, "a.mobi")
	if err := os.WriteFile(src, []byte("body"), 0o644); err != nil {
		t.Fatal(err)
	}
	seedFormat(t, db, 1, "MOBI", src)

	called := false
	svc.Converter = func(s, d string) error {
		called = true
		return os.WriteFile(d, []byte("converted"), 0o644)
	}

	if _, err := svc.ConvertAll([]int64{1}); err != nil {
		t.Fatalf("转换失败: %v", err)
	}
	if !called {
		t.Error("注入的转换器未被调用")
	}
}

// TestConvertAllConverterError 覆盖转换器报错。
func TestConvertAllConverterError(t *testing.T) {
	svc, db, dir := newConvertFixture(t)
	seedBook(t, db, 1, "书")
	src := filepath.Join(dir, "a.mobi")
	if err := os.WriteFile(src, []byte("body"), 0o644); err != nil {
		t.Fatal(err)
	}
	seedFormat(t, db, 1, "MOBI", src)

	svc.Converter = func(s, d string) error { return os.ErrPermission }

	progress, err := svc.ConvertAll([]int64{1})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if progress.Fail != 1 {
		t.Errorf("fail = %d，期望 1", progress.Fail)
	}
}

// TestConvertAllNoConvertPath 覆盖未配置转换目录。
func TestConvertAllNoConvertPath(t *testing.T) {
	db := newTestDB(t)
	svc := NewService(db, "")
	dir := t.TempDir()
	seedBook(t, db, 1, "书")
	src := filepath.Join(dir, "a.mobi")
	if err := os.WriteFile(src, []byte("body"), 0o644); err != nil {
		t.Fatal(err)
	}
	seedFormat(t, db, 1, "MOBI", src)

	progress, err := svc.ConvertAll([]int64{1})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if progress.Fail != 1 {
		t.Errorf("fail = %d，期望 1", progress.Fail)
	}
}

// TestProgressInitiallyIdle 覆盖初始状态。
func TestProgressInitiallyIdle(t *testing.T) {
	svc, _, _ := newConvertFixture(t)
	p := svc.Progress()
	if p.Running || p.Total != 0 {
		t.Errorf("初始状态应为空闲，实际 %+v", p)
	}
}

// TestFormatsOf 覆盖格式读取。
func TestFormatsOf(t *testing.T) {
	svc, db, _ := newConvertFixture(t)
	seedBook(t, db, 1, "书")
	seedFormat(t, db, 1, "EPUB", "/tmp/a.epub")
	seedFormat(t, db, 1, "MOBI", "/tmp/a.mobi")

	formats, err := svc.formatsOf(1)
	if err != nil {
		t.Fatalf("读取失败: %v", err)
	}
	if len(formats) != 2 {
		t.Errorf("格式数 = %d，期望 2", len(formats))
	}
}

// TestConversionTargetsShape 覆盖转换路线表。
func TestConversionTargetsShape(t *testing.T) {
	if len(ConversionTargets) != 3 {
		t.Fatalf("路线数 = %d，期望 3", len(ConversionTargets))
	}
	if ConversionTargets[0].Target != "epub" {
		t.Errorf("首条目标 = %q，期望 epub", ConversionTargets[0].Target)
	}
}
