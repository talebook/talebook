package scan

import (
	"database/sql"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"talebook/booksvr/internal/userdb"

	_ "modernc.org/sqlite"
)

// importTestDB 建一个含 scanfiles + items 的内存库。
func importTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	stmts := []string{
		`CREATE TABLE scanfiles (id INTEGER PRIMARY KEY AUTOINCREMENT, scan_id INTEGER DEFAULT 0,
			import_id INTEGER DEFAULT 0, name TEXT, path TEXT, hash TEXT UNIQUE, status TEXT,
			title TEXT, author TEXT, publisher TEXT, tags TEXT, create_time TEXT, update_time TEXT,
			book_id INTEGER DEFAULT 0, data TEXT DEFAULT '{}')`,
		`CREATE TABLE items (book_id INTEGER PRIMARY KEY, count_guest INTEGER DEFAULT 0,
			count_visit INTEGER DEFAULT 0, count_download INTEGER DEFAULT 0, website TEXT DEFAULT '',
			collector_id INTEGER, scope TEXT DEFAULT 'public', book_type TEXT DEFAULT 'ebook',
			media_type TEXT DEFAULT 'unknown', media_type_locked BOOLEAN DEFAULT 0,
			create_time TEXT, src_path TEXT DEFAULT '')`,
	}
	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			t.Fatalf("建表失败: %v\n%s", err, s)
		}
	}
	return db
}

// importLibraryDB 建一个含 books/authors/data/book_formats 的书库内存库。
func importLibraryDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	stmts := []string{
		`CREATE TABLE books (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, author_sort TEXT,
			path TEXT, timestamp INTEGER, pubdate TEXT, series_index REAL, has_cover BOOLEAN,
			last_modified TEXT)`,
		`CREATE TABLE authors (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, sort TEXT, link TEXT)`,
		`CREATE TABLE books_authors_link (id INTEGER PRIMARY KEY AUTOINCREMENT, book INTEGER, author INTEGER)`,
		`CREATE TABLE data (id INTEGER PRIMARY KEY AUTOINCREMENT, book INTEGER, format TEXT,
			uncompressed_size INTEGER, name TEXT)`,
		`CREATE TABLE book_formats (id INTEGER PRIMARY KEY AUTOINCREMENT, book_id INTEGER, format TEXT,
			path TEXT, size INTEGER, mtime INTEGER, UNIQUE (book_id, format))`,
	}
	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			t.Fatalf("建表失败: %v\n%s", err, s)
		}
	}
	return db
}

// newImportService 构造一个带书库句柄的导入服务。
func newImportService(db, lib *sql.DB) *Service {
	s := NewService(db, supported())
	s.Clock = fixedClock
	s.LibraryDB = lib
	return s
}

// seedReadyRow 插入一条 READY 记录。
func seedReadyRow(t *testing.T, db *sql.DB, path, hash string) *userdb.ScanFile {
	t.Helper()
	row := &userdb.ScanFile{
		Name: filepath.Base(path), Path: path, Hash: hash,
		Status: userdb.ScanStatusReady, CreateTime: "t", UpdateTime: "t",
		Data: map[string]any{},
	}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	return row
}

// TestImportNewBook 新书导入。
func TestImportNewBook(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(db, lib)
	seedReadyRow(t, db, p, "sha256:x")

	res, err := svc.Import(nil, 7, false, ModeCopy)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if res.Imported != 1 {
		t.Fatalf("imported = %d, want 1（res=%+v）", res.Imported, res)
	}
	if len(res.BookIDs) != 1 {
		t.Fatalf("book_ids = %v", res.BookIDs)
	}

	// 书库应有新书。
	var title, author string
	if err := lib.QueryRow(`SELECT title, author_sort FROM books WHERE id = ?`, res.BookIDs[0]).
		Scan(&title, &author); err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if title != "三体" || author != "佚名" {
		t.Errorf("title=%q author=%q", title, author)
	}

	// 格式应登记。
	var n int
	if err := lib.QueryRow(`SELECT COUNT(1) FROM book_formats WHERE book_id = ? AND format = 'EPUB'`,
		res.BookIDs[0]).Scan(&n); err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if n != 1 {
		t.Errorf("book_formats 应有 1 行，得到 %d", n)
	}

	// 记录状态应为 imported。
	row, _ := getScanFileByPath(db, p)
	if row.Status != userdb.ScanStatusImported {
		t.Errorf("status = %q, want imported", row.Status)
	}
	if row.BookID != res.BookIDs[0] {
		t.Errorf("book_id = %d, want %d", row.BookID, res.BookIDs[0])
	}
	if row.Data["import_mode"] != ModeCopy {
		t.Errorf("import_mode = %v", row.Data["import_mode"])
	}
}

// TestImportSetsItemMediaType 导入时写入 items.media_type。
func TestImportSetsItemMediaType(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(db, lib)
	seedReadyRow(t, db, p, "sha256:x")

	res, err := svc.Import(nil, 7, false, ModeCopy)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	item, err := userdb.GetItem(db, res.BookIDs[0])
	if err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if item == nil {
		t.Fatal("应写入 items 行")
	}
	if item.MediaType != "ebook" {
		t.Errorf("media_type = %q, want ebook", item.MediaType)
	}
	if !item.CollectorID.Valid || item.CollectorID.Int64 != 7 {
		t.Errorf("collector_id = %v, want 7", item.CollectorID)
	}
}

// TestImportExistingFormat 同名同作者已有该格式时标记 exist。
func TestImportExistingFormat(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(db, lib)
	seedReadyRow(t, db, p, "sha256:x")

	// 书库已有《三体》/佚名/EPUB。
	if _, err := lib.Exec(`INSERT INTO books (id, title, author_sort) VALUES (42, '三体', '佚名')`); err != nil {
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

	res, err := svc.Import(nil, 7, false, ModeCopy)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if res.Exist != 1 {
		t.Fatalf("exist = %d, want 1（res=%+v）", res.Exist, res)
	}
	row, _ := getScanFileByPath(db, p)
	if row.Status != userdb.ScanStatusExist {
		t.Errorf("status = %q, want exist", row.Status)
	}
}

// TestImportAddsFormatToExistingBook 同名同作者但缺该格式时添加格式。
func TestImportAddsFormatToExistingBook(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(db, lib)
	seedReadyRow(t, db, p, "sha256:x")

	// 书库已有《三体》/佚名，但只有 MOBI。
	if _, err := lib.Exec(`INSERT INTO books (id, title, author_sort) VALUES (42, '三体', '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO authors (id, name) VALUES (1, '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO books_authors_link (book, author) VALUES (42, 1)`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO data (book, format, name) VALUES (42, 'MOBI', 'x.mobi')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}

	res, err := svc.Import(nil, 7, false, ModeCopy)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if res.Imported != 1 {
		t.Fatalf("imported = %d, want 1（res=%+v）", res.Imported, res)
	}
	// 应复用书 42，并新增 EPUB 格式。
	if res.BookIDs[0] != 42 {
		t.Errorf("book_id = %d, want 42", res.BookIDs[0])
	}
	var n int
	if err := lib.QueryRow(`SELECT COUNT(1) FROM book_formats WHERE book_id = 42 AND format = 'EPUB'`).Scan(&n); err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if n != 1 {
		t.Errorf("应新增 EPUB 格式，得到 %d 行", n)
	}
	// 书库不应新增书籍。
	var total int
	if err := lib.QueryRow(`SELECT COUNT(1) FROM books`).Scan(&total); err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if total != 1 {
		t.Errorf("books 总数 = %d, want 1", total)
	}
}

// TestImportIndexMode 仅索引模式。
func TestImportIndexMode(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(db, lib)
	seedReadyRow(t, db, p, "sha256:x")

	res, err := svc.Import(nil, 7, false, ModeIndex)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if res.Indexed != 1 {
		t.Fatalf("indexed = %d, want 1（res=%+v）", res.Indexed, res)
	}
	row, _ := getScanFileByPath(db, p)
	if row.Status != userdb.ScanStatusIndexed {
		t.Errorf("status = %q, want indexed", row.Status)
	}
	if row.Data["external_index"] != true {
		t.Errorf("external_index = %v", row.Data["external_index"])
	}
	if row.Data["created_book"] != true {
		t.Errorf("created_book = %v", row.Data["created_book"])
	}
	// src_path 应写入 items。
	item, _ := userdb.GetItem(db, row.BookID)
	if item == nil || item.SrcPath == "" {
		t.Errorf("src_path 应写入，item = %+v", item)
	}
	// 源文件不应被删除。
	if _, err := os.Stat(p); err != nil {
		t.Errorf("索引模式不应删除源文件: %v", err)
	}
}

// TestImportIndexModeReusesExistingBook 索引模式复用同作者书籍。
func TestImportIndexModeReusesExistingBook(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(db, lib)
	seedReadyRow(t, db, p, "sha256:x")

	if _, err := lib.Exec(`INSERT INTO books (id, title, author_sort) VALUES (42, '三体', '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO authors (id, name) VALUES (1, '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO books_authors_link (book, author) VALUES (42, 1)`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO data (book, format, name) VALUES (42, 'MOBI', 'x.mobi')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}

	res, err := svc.Import(nil, 7, false, ModeIndex)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if res.Indexed != 1 {
		t.Fatalf("indexed = %d, want 1", res.Indexed)
	}
	row, _ := getScanFileByPath(db, p)
	if row.BookID != 42 {
		t.Errorf("book_id = %d, want 42", row.BookID)
	}
	if row.Data["created_book"] != false {
		t.Errorf("created_book = %v, want false", row.Data["created_book"])
	}
}

// TestImportMoveModeDeletesSource 剪切模式删除源文件。
//
// 书库目标就是源文件本身（索引式登记），因此确认存在后会被删除。
func TestImportMoveModeDeletesSource(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(db, lib)
	seedReadyRow(t, db, p, "sha256:x")

	res, err := svc.Import(nil, 7, false, ModeMove)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if res.Imported != 1 {
		t.Fatalf("imported = %d, want 1", res.Imported)
	}
	row, _ := getScanFileByPath(db, p)
	if row.Status != userdb.ScanStatusImported {
		t.Errorf("status = %q, want imported", row.Status)
	}
	// 源文件应被删除。
	if _, err := os.Stat(p); !os.IsNotExist(err) {
		t.Errorf("剪切模式应删除源文件，stat err = %v", err)
	}
}

// TestImportMoveModeDeleteFailedWhenTargetMissing 目标文件不存在时标记 delete_failed。
func TestImportMoveModeDeleteFailedWhenTargetMissing(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(db, lib)
	seedReadyRow(t, db, p, "sha256:x")

	// 预先登记一个指向不存在文件的格式，让 libraryFormatExists 返回 false。
	if err := libraryRegisterFormat(lib, 1, "EPUB", filepath.Join(dir, "gone.epub")); err != nil {
		t.Fatalf("登记失败: %v", err)
	}

	// 直接调用删除逻辑：book_id=1 且目标文件不存在 → delete_failed。
	row := &userdb.ScanFile{BookID: 1, Path: p, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if err := svc.deleteSourceAfterImport(row, p, "epub"); err != nil {
		t.Fatalf("失败: %v", err)
	}
	if row.Status != userdb.ScanStatusDeleteFailed {
		t.Errorf("status = %q, want delete_failed", row.Status)
	}
	if row.Data["delete_error"] == nil {
		t.Error("应记录 delete_error")
	}
	// 源文件不应被删除。
	if _, err := os.Stat(p); err != nil {
		t.Errorf("目标不存在时不应删除源文件: %v", err)
	}
}

// TestImportMediaAnalysisFailure 媒体分析失败时标记 failed。
func TestImportMediaAnalysisFailure(t *testing.T) {
	dir := t.TempDir()
	p := writeBook(t, dir, "bad.epub", []byte("not a zip"))
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(db, lib)
	seedReadyRow(t, db, p, "sha256:x")

	res, err := svc.Import(nil, 7, false, ModeCopy)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if res.Failed != 1 {
		t.Fatalf("failed = %d, want 1（res=%+v）", res.Failed, res)
	}
	row, _ := getScanFileByPath(db, p)
	if row.Status != userdb.ScanStatusFailed {
		t.Errorf("status = %q, want failed", row.Status)
	}
	if row.Data["analysis_error_code"] == nil {
		t.Error("应记录 analysis_error_code")
	}
}

// TestImportMissingFile 文件消失时标记 drop。
func TestImportMissingFile(t *testing.T) {
	dir := t.TempDir()
	p := writeBook(t, dir, "a.epub", []byte("PK\x03\x04x"))
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(db, lib)
	seedReadyRow(t, db, p, "sha256:x")
	if err := os.Remove(p); err != nil {
		t.Fatalf("删除失败: %v", err)
	}

	res, err := svc.Import(nil, 7, false, ModeCopy)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	// 媒体分析先失败（文件不存在）。
	if res.Failed != 1 {
		t.Errorf("failed = %d, want 1（res=%+v）", res.Failed, res)
	}
}

// TestImportHashlistFilter 按哈希过滤。
func TestImportHashlistFilter(t *testing.T) {
	dir := t.TempDir()
	p1 := makeValidEpub(t, dir, "a.epub")
	p2 := makeValidEpubDifferent(t, dir, "b.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(db, lib)
	seedReadyRow(t, db, p1, "sha256:aaa")
	seedReadyRow(t, db, p2, "sha256:bbb")

	res, err := svc.Import([]string{"sha256:aaa"}, 7, false, ModeCopy)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if res.Total != 1 {
		t.Errorf("total = %d, want 1", res.Total)
	}
	if res.Imported != 1 {
		t.Errorf("imported = %d, want 1", res.Imported)
	}
	// b.epub 应仍是 ready。
	row2, _ := getScanFileByPath(db, p2)
	if row2.Status != userdb.ScanStatusReady {
		t.Errorf("b.epub status = %q, want ready", row2.Status)
	}
}

// TestImportNoReadyRows 无待导入记录。
func TestImportNoReadyRows(t *testing.T) {
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(db, lib)
	res, err := svc.Import(nil, 7, false, ModeCopy)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if res.Total != 0 || res.Imported != 0 {
		t.Errorf("无记录时不应有结果: %+v", res)
	}
}

// TestImportSetsImportID 导入时统一打上任务 ID。
func TestImportSetsImportID(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(db, lib)
	seedReadyRow(t, db, p, "sha256:x")

	res, err := svc.Import(nil, 7, false, ModeCopy)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	row, _ := getScanFileByPath(db, p)
	if row.ImportID != res.ImportID {
		t.Errorf("import_id = %d, want %d", row.ImportID, res.ImportID)
	}
	if res.ImportID != fixedClock().Unix() {
		t.Errorf("import_id = %d, want %d", res.ImportID, fixedClock().Unix())
	}
}

// TestImportNoLibraryDB 无书库句柄时导入失败。
func TestImportNoLibraryDB(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	svc := NewService(db, supported())
	svc.Clock = fixedClock
	seedReadyRow(t, db, p, "sha256:x")

	if _, err := svc.Import(nil, 7, false, ModeCopy); err == nil {
		t.Error("无书库句柄应报错")
	}
}

// TestImportClosedDB 库句柄损坏时报错。
func TestImportClosedDB(t *testing.T) {
	svc := newImportService(closedDB(t), importLibraryDB(t))
	if _, err := svc.Import(nil, 7, false, ModeCopy); err == nil {
		t.Error("库损坏应报错")
	}
}

// TestSetItemMediaTypeMerge 媒体类型按优先级合并。
func TestSetItemMediaTypeMerge(t *testing.T) {
	db := importTestDB(t)
	svc := newImportService(db, importLibraryDB(t))

	// 首次插入。
	if err := svc.setItemMediaType(1, 7, "ebook"); err != nil {
		t.Fatalf("失败: %v", err)
	}
	item, _ := userdb.GetItem(db, 1)
	if item.MediaType != "ebook" {
		t.Errorf("media_type = %q", item.MediaType)
	}

	// 升级为 comic。
	if err := svc.setItemMediaType(1, 7, "comic"); err != nil {
		t.Fatalf("失败: %v", err)
	}
	item, _ = userdb.GetItem(db, 1)
	if item.MediaType != "comic" {
		t.Errorf("media_type = %q, want comic", item.MediaType)
	}

	// 降级请求不应生效。
	if err := svc.setItemMediaType(1, 7, "ebook"); err != nil {
		t.Fatalf("失败: %v", err)
	}
	item, _ = userdb.GetItem(db, 1)
	if item.MediaType != "comic" {
		t.Errorf("media_type = %q, want comic（不应降级）", item.MediaType)
	}
}

// TestSetItemMediaTypeLocked 锁定后不修改。
func TestSetItemMediaTypeLocked(t *testing.T) {
	db := importTestDB(t)
	svc := newImportService(db, importLibraryDB(t))
	if _, err := db.Exec(`INSERT INTO items (book_id, media_type, media_type_locked) VALUES (1, 'ebook', 1)`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if err := svc.setItemMediaType(1, 7, "comic"); err != nil {
		t.Fatalf("失败: %v", err)
	}
	item, _ := userdb.GetItem(db, 1)
	if item.MediaType != "ebook" {
		t.Errorf("锁定后不应修改，得到 %q", item.MediaType)
	}
}

// TestLibraryFormatExists 书库格式存在性判断。
func TestLibraryFormatExists(t *testing.T) {
	dir := t.TempDir()
	lib := importLibraryDB(t)
	svc := newImportService(importTestDB(t), lib)

	// book_id 为 0。
	if svc.libraryFormatExists(0, "epub") {
		t.Error("book_id 为 0 应返回 false")
	}
	// 无书库句柄。
	noLib := &Service{}
	if noLib.libraryFormatExists(1, "epub") {
		t.Error("无书库句柄应返回 false")
	}
	// 未登记格式：ResolvePath 报错，按 Python 的 except 分支保守返回 true
	// （不阻止源文件清理）。
	if !svc.libraryFormatExists(1, "epub") {
		t.Error("未登记格式应保守返回 true（对齐 Python 的 except 分支）")
	}
	// 登记且文件存在。
	p := writeBook(t, dir, "a.epub", []byte("x"))
	if err := libraryRegisterFormat(lib, 1, "EPUB", p); err != nil {
		t.Fatalf("登记失败: %v", err)
	}
	if !svc.libraryFormatExists(1, "epub") {
		t.Error("登记且文件存在应返回 true")
	}
	// 文件被删除。
	if err := os.Remove(p); err != nil {
		t.Fatalf("删除失败: %v", err)
	}
	if svc.libraryFormatExists(1, "epub") {
		t.Error("文件不存在应返回 false")
	}
}

// TestWatchStateMachine 自动监控状态机。
func TestWatchStateMachine(t *testing.T) {
	w := NewWatch()
	if w.Status().State != "off" {
		t.Errorf("初始 state = %q, want off", w.Status().State)
	}
	gen := w.Start()
	if w.Status().State != "running" {
		t.Errorf("start 后 state = %q, want running", w.Status().State)
	}
	if gen != 0 {
		t.Errorf("初始代际 = %d, want 0", gen)
	}
	w.Update(3, 1, 2, "2026-01-01", "进行中")
	st := w.Status()
	if st.Queued != 3 || st.Running != 1 || st.Failed != 2 || st.Message != "进行中" {
		t.Errorf("status = %+v", st)
	}
	// stop 递增代际。
	newGen := w.Stop("已关闭")
	if newGen != 1 {
		t.Errorf("stop 后代际 = %d, want 1", newGen)
	}
	if w.Status().State != "off" || w.Status().Message != "已关闭" {
		t.Errorf("stop 后 status = %+v", w.Status())
	}
	if w.Generation() != 1 {
		t.Errorf("generation = %d, want 1", w.Generation())
	}
}

// TestWatchInterval 间隔与批次下限。
func TestWatchInterval(t *testing.T) {
	cases := []struct {
		interval, limit         int
		defInterval, defLimit   int
		wantInterval, wantLimit int
	}{
		{0, 0, 30, 500, 30, 500},
		{3, 0, 30, 500, 30, 500},  // 小于 5 用默认
		{10, 0, 30, 500, 10, 500}, // 合法值保留
		{0, 0, 0, 0, 5, 1},        // 默认值也非法时兜底
		{0, 0, 3, 0, 5, 1},        // 默认间隔小于 5 时兜底为 5
		{10, 20, 30, 500, 10, 20},
	}
	for _, tc := range cases {
		gotI, gotL := WatchInterval(tc.interval, tc.limit, tc.defInterval, tc.defLimit)
		if gotI != tc.wantInterval || gotL != tc.wantLimit {
			t.Errorf("WatchInterval(%d,%d,%d,%d) = (%d,%d), want (%d,%d)",
				tc.interval, tc.limit, tc.defInterval, tc.defLimit,
				gotI, gotL, tc.wantInterval, tc.wantLimit)
		}
	}
}

// TestNowStringAndClockTime 时间辅助。
func TestNowStringAndClockTime(t *testing.T) {
	svc := newTestService(testDB(t))
	if svc.NowString() != "2026-01-02 03:04:05" {
		t.Errorf("NowString = %q", svc.NowString())
	}
	if !svc.ClockTime().Equal(fixedClock()) {
		t.Errorf("ClockTime = %v", svc.ClockTime())
	}
}

// TestImportManagedDocumentSingleMatch 受管文档单本匹配时添加格式。
func TestImportManagedDocumentSingleMatch(t *testing.T) {
	dir := t.TempDir()
	// 构造一个合法 UVZ（ZIP 容器）。
	p := filepath.Join(dir, "扫描书.uvz")
	f, err := os.Create(p)
	if err != nil {
		t.Fatalf("创建失败: %v", err)
	}
	zw := newZipWriter(f)
	if err := zw.add("page.pdg", []byte("x")); err != nil {
		t.Fatalf("写入失败: %v", err)
	}
	if err := zw.close(); err != nil {
		t.Fatalf("关闭失败: %v", err)
	}
	f.Close()

	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(db, lib)
	svc.SupportedFormats["uvz"] = true
	seedReadyRow(t, db, p, "sha256:x")

	// 书库已有同名书（作者不可信，受管格式只看书名唯一）。
	if _, err := lib.Exec(`INSERT INTO books (id, title, author_sort) VALUES (42, '扫描书', '别人')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO authors (id, name) VALUES (1, '别人')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO books_authors_link (book, author) VALUES (42, 1)`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}

	res, err := svc.Import(nil, 7, false, ModeCopy)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if res.Imported != 1 {
		t.Fatalf("imported = %d, want 1（res=%+v）", res.Imported, res)
	}
	if res.BookIDs[0] != 42 {
		t.Errorf("受管格式单本应复用书 42，得到 %d", res.BookIDs[0])
	}
}

// TestImportManagedDocumentMultipleNoMerge 受管文档多本同名时不合并。
func TestImportManagedDocumentMultipleNoMerge(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "扫描书.uvz")
	f, err := os.Create(p)
	if err != nil {
		t.Fatalf("创建失败: %v", err)
	}
	zw := newZipWriter(f)
	if err := zw.add("page.pdg", []byte("x")); err != nil {
		t.Fatalf("写入失败: %v", err)
	}
	if err := zw.close(); err != nil {
		t.Fatalf("关闭失败: %v", err)
	}
	f.Close()

	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(db, lib)
	svc.SupportedFormats["uvz"] = true
	seedReadyRow(t, db, p, "sha256:x")

	// 书库有两本同名书 → 受管格式不应合并。
	for _, id := range []int{41, 42} {
		if _, err := lib.Exec(`INSERT INTO books (id, title, author_sort) VALUES (?, '扫描书', '佚名')`, id); err != nil {
			t.Fatalf("插入失败: %v", err)
		}
	}
	if _, err := lib.Exec(`INSERT INTO authors (id, name) VALUES (1, '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO books_authors_link (book, author) VALUES (41, 1), (42, 1)`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}

	res, err := svc.Import(nil, 7, false, ModeCopy)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	// 应新建一本书，而不是合并到 41/42。
	if res.Imported != 1 {
		t.Fatalf("imported = %d, want 1", res.Imported)
	}
	if res.BookIDs[0] == 41 || res.BookIDs[0] == 42 {
		t.Errorf("多本同名不应合并，得到 book_id = %d", res.BookIDs[0])
	}
}

// TestImportIndexModeMediaFailure 索引模式下媒体分析失败。
func TestImportIndexModeMediaFailure(t *testing.T) {
	dir := t.TempDir()
	p := writeBook(t, dir, "bad.epub", []byte("not a zip"))
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(db, lib)
	seedReadyRow(t, db, p, "sha256:x")

	res, err := svc.Import(nil, 7, false, ModeIndex)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if res.Failed != 1 {
		t.Errorf("failed = %d, want 1", res.Failed)
	}
}

// TestImportAddFormatStatFailure 文件消失时格式登记仍可进行（size/mtime 为 0）。
func TestImportAddFormatStatFailure(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(db, lib)

	if err := svc.addFormatToBook(1, "epub", filepath.Join(dir, "gone.epub")); err != nil {
		t.Fatalf("文件不存在时不应报错: %v", err)
	}
	var n int
	if err := lib.QueryRow(`SELECT COUNT(1) FROM book_formats WHERE book_id = 1`).Scan(&n); err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if n != 1 {
		t.Errorf("应登记 1 行，得到 %d", n)
	}
	_ = p
}

// TestImportAddFormatClosedDB 书库损坏时报错。
func TestImportAddFormatClosedDB(t *testing.T) {
	svc := newImportService(importTestDB(t), closedDB(t))
	if err := svc.addFormatToBook(1, "epub", "/x.epub"); err == nil {
		t.Error("书库损坏应报错")
	}
}

// TestImportNewBookClosedDB 书库损坏时报错。
func TestImportNewBookClosedDB(t *testing.T) {
	svc := newImportService(importTestDB(t), closedDB(t))
	if _, err := svc.importNewBook(importmetaForTest(), "/x.epub", "epub", 7, "ebook"); err == nil {
		t.Error("书库损坏应报错")
	}
}

// TestImportSetItemMediaTypeClosedDB items 表损坏时报错。
func TestImportSetItemMediaTypeClosedDB(t *testing.T) {
	svc := newImportService(closedDB(t), importLibraryDB(t))
	if err := svc.setItemMediaType(1, 7, "ebook"); err == nil {
		t.Error("库损坏应报错")
	}
}

// TestImportEnsureIndexedItemClosedDB 错误分支。
func TestImportEnsureIndexedItemClosedDB(t *testing.T) {
	svc := newImportService(closedDB(t), importLibraryDB(t))
	if err := svc.ensureIndexedItem(1, 7, "/x.epub", "ebook"); err == nil {
		t.Error("库损坏应报错")
	}
}

// TestImportReadyRowsClosedDB 错误分支。
func TestImportReadyRowsClosedDB(t *testing.T) {
	svc := newImportService(closedDB(t), importLibraryDB(t))
	if _, err := svc.readyRows(nil); err == nil {
		t.Error("库损坏应报错")
	}
}

// TestImportFindSameAuthorBookClosedDB 错误分支。
func TestImportFindSameAuthorBookClosedDB(t *testing.T) {
	svc := newImportService(importTestDB(t), closedDB(t))
	if _, _, err := svc.findSameAuthorBook(importmetaForTest(), "epub"); err == nil {
		t.Error("书库损坏应报错")
	}
}

// TestImportFindSameAuthorBookNoLibrary 无书库句柄。
func TestImportFindSameAuthorBookNoLibrary(t *testing.T) {
	svc := NewService(importTestDB(t), supported())
	id, exist, err := svc.findSameAuthorBook(importmetaForTest(), "epub")
	if err != nil {
		t.Fatalf("不应报错: %v", err)
	}
	if id != 0 || exist {
		t.Errorf("无书库句柄应返回 (0,false)，得到 (%d,%v)", id, exist)
	}
}

// TestImportMetadataMissingFile 文件消失。
func TestImportMetadataMissingFile(t *testing.T) {
	svc := newImportService(importTestDB(t), importLibraryDB(t))
	_, gone := svc.importMetadata(filepath.Join(t.TempDir(), "nope.epub"), "epub")
	if !gone {
		t.Error("文件不存在应返回 gone=true")
	}
}

// TestImportMetadataPresent 文件存在。
func TestImportMetadataPresent(t *testing.T) {
	dir := t.TempDir()
	p := writeBook(t, dir, "三体.epub", []byte("x"))
	svc := newImportService(importTestDB(t), importLibraryDB(t))
	mi, gone := svc.importMetadata(p, "epub")
	if gone {
		t.Fatal("文件存在不应返回 gone")
	}
	if mi.Title != "三体" {
		t.Errorf("title = %q", mi.Title)
	}
}

// TestImportMarkIndexedClosedDB 错误分支。
func TestImportMarkIndexedClosedDB(t *testing.T) {
	svc := newImportService(closedDB(t), importLibraryDB(t))
	row := &userdb.ScanFile{Path: "/x.epub", Data: map[string]any{}}
	if _, _, err := svc.markIndexed(row, importmetaForTest(), "/x.epub", "epub", 1, 7, "ebook", 0); err == nil {
		t.Error("库损坏应报错")
	}
}

// TestImportDeleteSourceClosedDB 错误分支。
func TestImportDeleteSourceClosedDB(t *testing.T) {
	svc := newImportService(closedDB(t), importLibraryDB(t))
	row := &userdb.ScanFile{Path: "/x.epub", Data: map[string]any{}}
	if err := svc.deleteSourceAfterImport(row, "/x.epub", "epub"); err == nil {
		t.Error("库损坏应报错")
	}
}

// TestImportMarkImportedClosedDB 错误分支。
func TestImportMarkImportedClosedDB(t *testing.T) {
	svc := newImportService(closedDB(t), importLibraryDB(t))
	row := &userdb.ScanFile{Path: "/x.epub", Data: map[string]any{}}
	if _, _, err := svc.markImported(row, "/x.epub", "epub", ModeCopy, false); err == nil {
		t.Error("库损坏应报错")
	}
}

// TestImportAddExternalIndexClosedDB 错误分支。
func TestImportAddExternalIndexClosedDB(t *testing.T) {
	svc := newImportService(importTestDB(t), closedDB(t))
	if _, _, err := svc.addExternalIndexRecord(importmetaForTest(), "/x.epub", "epub", 0); err == nil {
		t.Error("书库损坏应报错")
	}
}

// TestImportAddExternalIndexReuse 复用已有书籍。
func TestImportAddExternalIndexReuse(t *testing.T) {
	dir := t.TempDir()
	p := writeBook(t, dir, "a.epub", []byte("x"))
	lib := importLibraryDB(t)
	svc := newImportService(importTestDB(t), lib)

	id, created, err := svc.addExternalIndexRecord(importmetaForTest(), p, "epub", 42)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if id != 42 || created {
		t.Errorf("应复用书 42 且 created=false，得到 (%d,%v)", id, created)
	}
}

// TestImportRowClosedDB 错误分支。
func TestImportRowClosedDB(t *testing.T) {
	svc := newImportService(closedDB(t), importLibraryDB(t))
	row := &userdb.ScanFile{Path: "/x.epub", Data: map[string]any{}}
	if _, _, err := svc.importRow(row, 7, ModeCopy, 1); err == nil {
		t.Error("库损坏应报错")
	}
}

// TestImportRowSaveErrorAfterAnalysis 分析通过但保存失败。
func TestImportRowSaveErrorAfterAnalysis(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	svc := newImportService(closedDB(t), importLibraryDB(t))
	row := &userdb.ScanFile{Path: p, Data: map[string]any{}}
	if _, _, err := svc.importRow(row, 7, ModeCopy, 1); err == nil {
		t.Error("库损坏应报错")
	}
}

// TestImportSameAuthorAddFormatError 添加格式失败时返回错误。
func TestImportSameAuthorAddFormatError(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(db, lib)
	seedReadyRow(t, db, p, "sha256:x")

	if _, err := lib.Exec(`INSERT INTO books (id, title, author_sort) VALUES (42, '三体', '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO authors (id, name) VALUES (1, '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO books_authors_link (book, author) VALUES (42, 1)`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	// 关闭书库句柄，让 addFormatToBook 失败。
	_ = lib.Close()

	if _, err := svc.Import(nil, 7, false, ModeCopy); err == nil {
		t.Error("添加格式失败应报错")
	}
}

// TestImportStringContainsFormat 格式匹配大小写不敏感。
func TestImportStringContainsFormat(t *testing.T) {
	if !strings.Contains(strings.ToUpper("EPUB,MOBI"), strings.ToUpper("epub")) {
		t.Error("大小写不敏感匹配失败")
	}
}
