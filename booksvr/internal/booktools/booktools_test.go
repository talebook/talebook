package booktools

import (
	"database/sql"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"talebook/booksvr/internal/library"

	_ "modernc.org/sqlite"
)

// btSchema 建一个含 Calibre 表的内存库。
//
// 权威 schema.sql 只含 Talebook 自有表；Calibre 表由本测试自建，
// DDL 与 internal/library/query_test.go 保持一致。
func btSchema(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	db.SetMaxOpenConns(1)
	t.Cleanup(func() { _ = db.Close() })

	ddl := []string{
		`CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT NOT NULL DEFAULT '',
			author_sort TEXT NOT NULL DEFAULT '', path TEXT NOT NULL DEFAULT '',
			timestamp INTEGER NOT NULL DEFAULT 0, pubdate TEXT,
			series_index REAL NOT NULL DEFAULT 1.0, sort TEXT,
			has_cover INTEGER NOT NULL DEFAULT 0, uuid TEXT, last_modified TEXT)`,
		`CREATE TABLE authors (id INTEGER PRIMARY KEY, name TEXT NOT NULL, sort TEXT, link TEXT)`,
		`CREATE TABLE books_authors_link (id INTEGER PRIMARY KEY, book INTEGER, author INTEGER)`,
		`CREATE TABLE tags (id INTEGER PRIMARY KEY, name TEXT NOT NULL, link TEXT)`,
		`CREATE TABLE books_tags_link (id INTEGER PRIMARY KEY, book INTEGER, tag INTEGER)`,
		`CREATE TABLE publishers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, sort TEXT, link TEXT)`,
		`CREATE TABLE books_publishers_link (id INTEGER PRIMARY KEY, book INTEGER, publisher INTEGER)`,
		`CREATE TABLE series (id INTEGER PRIMARY KEY, name TEXT NOT NULL, sort TEXT, link TEXT)`,
		`CREATE TABLE books_series_link (id INTEGER PRIMARY KEY, book INTEGER, series INTEGER)`,
		`CREATE TABLE ratings (id INTEGER PRIMARY KEY, rating INTEGER, link TEXT)`,
		`CREATE TABLE books_ratings_link (id INTEGER PRIMARY KEY, book INTEGER, rating INTEGER)`,
		`CREATE TABLE languages (id INTEGER PRIMARY KEY, lang_code TEXT NOT NULL, link TEXT)`,
		`CREATE TABLE books_languages_link (id INTEGER PRIMARY KEY, book INTEGER, lang_code INTEGER, item_order INTEGER DEFAULT 0)`,
		`CREATE TABLE comments (id INTEGER PRIMARY KEY, book INTEGER, text TEXT)`,
		`CREATE TABLE identifiers (id INTEGER PRIMARY KEY, book INTEGER, type TEXT, val TEXT)`,
		`CREATE TABLE data (id INTEGER PRIMARY KEY, book INTEGER, format TEXT, uncompressed_size INTEGER, name TEXT)`,
		`CREATE TABLE book_formats (id INTEGER PRIMARY KEY, book_id INTEGER, format TEXT,
			path TEXT, size INTEGER, mtime INTEGER, hash TEXT)`,
		`CREATE TABLE items (id INTEGER PRIMARY KEY, book_id INTEGER, count_guest INTEGER DEFAULT 0,
			count_visit INTEGER DEFAULT 0, count_download INTEGER DEFAULT 0, website TEXT DEFAULT '',
			collector_id INTEGER, scope TEXT DEFAULT '', book_type TEXT DEFAULT '',
			media_type TEXT DEFAULT '', media_type_locked INTEGER DEFAULT 0, src_path TEXT DEFAULT '')`,
	}
	for _, stmt := range ddl {
		if _, err := db.Exec(stmt); err != nil {
			t.Fatalf("建表失败: %v\n%s", err, stmt)
		}
	}
	return db
}

// btSeedBook 插入一本书并登记一个格式文件，返回 (bookID, 文件路径)。
func btSeedBook(t *testing.T, db *sql.DB, title, format, content string) (int64, string) {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, strings.ToLower(title)+"."+strings.ToLower(format))
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	res, err := db.Exec(`INSERT INTO books (title, author_sort, path, timestamp, pubdate, series_index, has_cover)
		VALUES (?, 'a', 'p', 1700000000, '2020-01-01', 1.0, 0)`, title)
	if err != nil {
		t.Fatalf("插入书籍失败: %v", err)
	}
	bookID, _ := res.LastInsertId()
	// book_formats 供 ResolvePath 使用；data 供 GetBooksData 的 Formats 使用。
	if _, err := db.Exec(`INSERT INTO book_formats (book_id, format, path, size, mtime, hash)
		VALUES (?, ?, ?, ?, 0, '')`, bookID, format, path, len(content)); err != nil {
		t.Fatalf("登记格式失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO data (book, format, uncompressed_size, name)
		VALUES (?, ?, ?, ?)`, bookID, format, len(content), path); err != nil {
		t.Fatalf("登记 data 失败: %v", err)
	}
	return bookID, path
}

// ---- ResolveBook / AvailableFormats / PickFormat ----

func TestResolveBook(t *testing.T) {
	db := btSchema(t)
	bookID, _ := btSeedBook(t, db, "三体", "TXT", "hello")

	book, err := ResolveBook(db, bookID)
	if err != nil {
		t.Fatalf("ResolveBook: %v", err)
	}
	if book.Title != "三体" {
		t.Errorf("title = %q", book.Title)
	}
}

func TestResolveBookMissing(t *testing.T) {
	db := btSchema(t)
	_, err := ResolveBook(db, 999)
	if err == nil {
		t.Fatal("不存在的书应报错")
	}
	if !strings.Contains(err.Error(), "书籍不存在") {
		t.Errorf("msg = %q", err.Error())
	}
}

func TestAvailableFormatsUppercases(t *testing.T) {
	book := &library.BookData{Formats: []string{"epub", "TXT"}}
	got := AvailableFormats(book)
	if len(got) != 2 || got[0] != "EPUB" || got[1] != "TXT" {
		t.Errorf("got = %v", got)
	}
}

func TestPickFormat(t *testing.T) {
	book := &library.BookData{Formats: []string{"EPUB", "TXT"}}
	if got := PickFormat(book, "TXT", "EPUB"); got != "TXT" {
		t.Errorf("按候选顺序应选 TXT，得到 %q", got)
	}
	if got := PickFormat(book, "EPUB", "TXT"); got != "EPUB" {
		t.Errorf("应选 EPUB，得到 %q", got)
	}
	if got := PickFormat(book, "MOBI"); got != "" {
		t.Errorf("无匹配应返回空串，得到 %q", got)
	}
	// 默认候选顺序是 EPUB 优先。
	if got := PickFormat(book); got != "EPUB" {
		t.Errorf("默认应选 EPUB，得到 %q", got)
	}
}

// ---- GetFormatPath ----

func TestGetFormatPath(t *testing.T) {
	db := btSchema(t)
	bookID, path := btSeedBook(t, db, "三体", "TXT", "hello")

	got, err := GetFormatPath(db, bookID, "txt")
	if err != nil {
		t.Fatalf("GetFormatPath: %v", err)
	}
	if got != path {
		t.Errorf("path = %q, want %q", got, path)
	}
}

func TestGetFormatPathMissingFile(t *testing.T) {
	db := btSchema(t)
	bookID, path := btSeedBook(t, db, "三体", "TXT", "hello")
	if err := os.Remove(path); err != nil {
		t.Fatalf("删除文件失败: %v", err)
	}
	if _, err := GetFormatPath(db, bookID, "TXT"); err == nil {
		t.Fatal("文件缺失应报错")
	} else if !strings.Contains(err.Error(), "找不到 TXT 文件") {
		t.Errorf("msg = %q", err.Error())
	}
}

func TestGetFormatPathDirectory(t *testing.T) {
	db := btSchema(t)
	bookID, path := btSeedBook(t, db, "三体", "TXT", "hello")
	if err := os.Remove(path); err != nil {
		t.Fatalf("删除文件失败: %v", err)
	}
	if err := os.Mkdir(path, 0o755); err != nil {
		t.Fatalf("建目录失败: %v", err)
	}
	if _, err := GetFormatPath(db, bookID, "TXT"); err == nil {
		t.Fatal("目录应报错")
	} else if !strings.Contains(err.Error(), "不是普通文件") {
		t.Errorf("msg = %q", err.Error())
	}
}

func TestGetFormatPathUnknownFormat(t *testing.T) {
	db := btSchema(t)
	bookID, _ := btSeedBook(t, db, "三体", "TXT", "hello")
	if _, err := GetFormatPath(db, bookID, "MOBI"); err == nil {
		t.Fatal("未登记格式应报错")
	}
}

// ---- OverwriteFormat ----

func TestOverwriteFormatWithoutBackup(t *testing.T) {
	db := btSchema(t)
	bookID, path := btSeedBook(t, db, "三体", "TXT", "old")
	out := filepath.Join(t.TempDir(), "new.txt")
	if err := os.WriteFile(out, []byte("new content"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}

	backup, err := OverwriteFormat(db, bookID, "TXT", out, "")
	if err != nil {
		t.Fatalf("OverwriteFormat: %v", err)
	}
	if backup != "" {
		t.Errorf("未指定备份目录时不应备份，得到 %q", backup)
	}
	got, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("读回失败: %v", err)
	}
	if string(got) != "new content" {
		t.Errorf("内容 = %q", got)
	}
}

func TestOverwriteFormatWithBackup(t *testing.T) {
	db := btSchema(t)
	bookID, path := btSeedBook(t, db, "三体", "TXT", "old")
	out := filepath.Join(t.TempDir(), "new.txt")
	if err := os.WriteFile(out, []byte("new content"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	backupDir := t.TempDir()

	backup, err := OverwriteFormat(db, bookID, "TXT", out, backupDir)
	if err != nil {
		t.Fatalf("OverwriteFormat: %v", err)
	}
	if backup == "" {
		t.Fatal("应产生备份")
	}
	if !strings.HasPrefix(filepath.Base(backup), "backup_") {
		t.Errorf("备份名 = %q", filepath.Base(backup))
	}
	// 备份内容是原文件。
	got, err := os.ReadFile(backup)
	if err != nil {
		t.Fatalf("读备份失败: %v", err)
	}
	if string(got) != "old" {
		t.Errorf("备份内容 = %q", got)
	}
	// 原文件已被替换。
	got, _ = os.ReadFile(path)
	if string(got) != "new content" {
		t.Errorf("原文件内容 = %q", got)
	}
}

func TestOverwriteFormatRefreshesSize(t *testing.T) {
	db := btSchema(t)
	bookID, _ := btSeedBook(t, db, "三体", "TXT", "old")
	out := filepath.Join(t.TempDir(), "new.txt")
	if err := os.WriteFile(out, []byte("a much longer content"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	if _, err := OverwriteFormat(db, bookID, "TXT", out, ""); err != nil {
		t.Fatalf("OverwriteFormat: %v", err)
	}
	var size int64
	if err := db.QueryRow(`SELECT size FROM book_formats WHERE book_id = ? AND format = 'TXT'`,
		bookID).Scan(&size); err != nil {
		t.Fatalf("查 size 失败: %v", err)
	}
	if size != int64(len("a much longer content")) {
		t.Errorf("size = %d", size)
	}
}

// ---- ImportAsNewBook ----

func TestImportAsNewBookCopiesMetadata(t *testing.T) {
	db := btSchema(t)
	bookID, _ := btSeedBook(t, db, "三体", "TXT", "old")
	if _, err := db.Exec(`INSERT INTO authors (id, name) VALUES (1, '刘慈欣')`); err != nil {
		t.Fatalf("插入作者失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO books_authors_link (book, author) VALUES (?, 1)`, bookID); err != nil {
		t.Fatalf("关联作者失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO comments (book, text) VALUES (?, '简介')`, bookID); err != nil {
		t.Fatalf("插入简介失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO identifiers (book, type, val) VALUES (?, 'isbn', '9787')`,
		bookID); err != nil {
		t.Fatalf("插入标识符失败: %v", err)
	}
	out := filepath.Join(t.TempDir(), "out.txt")
	if err := os.WriteFile(out, []byte("new"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}

	newID, err := ImportAsNewBook(db, bookID, out, ImportOptions{TitleSuffix: "（正文替换版）"})
	if err != nil {
		t.Fatalf("ImportAsNewBook: %v", err)
	}
	if newID == bookID {
		t.Fatal("新书 id 不应等于原书 id")
	}

	book, err := ResolveBook(db, newID)
	if err != nil {
		t.Fatalf("ResolveBook: %v", err)
	}
	if book.Title != "三体（正文替换版）" {
		t.Errorf("title = %q", book.Title)
	}
	if len(book.Authors) != 1 || book.Authors[0] != "刘慈欣" {
		t.Errorf("authors = %v", book.Authors)
	}
	if book.Comments != "简介" {
		t.Errorf("comments = %q", book.Comments)
	}
	if book.ISBN != "9787" {
		t.Errorf("isbn = %q", book.ISBN)
	}
	if len(book.Formats) != 1 || book.Formats[0] != "TXT" {
		t.Errorf("formats = %v", book.Formats)
	}
	// 新书应有独立 UUID。
	var uuid sql.NullString
	if err := db.QueryRow(`SELECT uuid FROM books WHERE id = ?`, newID).Scan(&uuid); err != nil {
		t.Fatalf("查 uuid 失败: %v", err)
	}
	if !uuid.Valid || uuid.String == "" {
		t.Error("新书应有 UUID")
	}
}

func TestImportAsNewBookOverrides(t *testing.T) {
	db := btSchema(t)
	bookID, _ := btSeedBook(t, db, "三体", "TXT", "old")
	out := filepath.Join(t.TempDir(), "out.txt")
	if err := os.WriteFile(out, []byte("new"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}

	newID, err := ImportAsNewBook(db, bookID, out, ImportOptions{
		TitleOverride:   "三體",
		AuthorsOverride: []string{"劉慈欣"},
		Language:        "zht",
		TitleSuffix:     "（繁體版）",
	})
	if err != nil {
		t.Fatalf("ImportAsNewBook: %v", err)
	}
	book, err := ResolveBook(db, newID)
	if err != nil {
		t.Fatalf("ResolveBook: %v", err)
	}
	if book.Title != "三體（繁體版）" {
		t.Errorf("title = %q", book.Title)
	}
	if len(book.Authors) != 1 || book.Authors[0] != "劉慈欣" {
		t.Errorf("authors = %v", book.Authors)
	}
	if book.Language != "zht" {
		t.Errorf("language = %q", book.Language)
	}
}

func TestImportAsNewBookConvertText(t *testing.T) {
	db := btSchema(t)
	bookID, _ := btSeedBook(t, db, "三体", "TXT", "old")
	out := filepath.Join(t.TempDir(), "out.txt")
	if err := os.WriteFile(out, []byte("new"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}

	convert := func(s string) string { return strings.ReplaceAll(s, "三体", "三體") }
	newID, err := ImportAsNewBook(db, bookID, out, ImportOptions{ConvertText: convert})
	if err != nil {
		t.Fatalf("ImportAsNewBook: %v", err)
	}
	book, _ := ResolveBook(db, newID)
	if book.Title != "三體" {
		t.Errorf("title = %q", book.Title)
	}
}

func TestImportAsNewBookCreatesCollectorItem(t *testing.T) {
	db := btSchema(t)
	bookID, _ := btSeedBook(t, db, "三体", "TXT", "old")
	out := filepath.Join(t.TempDir(), "out.txt")
	if err := os.WriteFile(out, []byte("new"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}

	newID, err := ImportAsNewBook(db, bookID, out, ImportOptions{CollectorID: 7})
	if err != nil {
		t.Fatalf("ImportAsNewBook: %v", err)
	}
	var collector int64
	if err := db.QueryRow(`SELECT collector_id FROM items WHERE book_id = ?`, newID).
		Scan(&collector); err != nil {
		t.Fatalf("查收藏记录失败: %v", err)
	}
	if collector != 7 {
		t.Errorf("collector_id = %d", collector)
	}
}

func TestImportAsNewBookDefaultsLanguage(t *testing.T) {
	db := btSchema(t)
	bookID, _ := btSeedBook(t, db, "三体", "TXT", "old")
	out := filepath.Join(t.TempDir(), "out.txt")
	if err := os.WriteFile(out, []byte("new"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}

	newID, err := ImportAsNewBook(db, bookID, out, ImportOptions{})
	if err != nil {
		t.Fatalf("ImportAsNewBook: %v", err)
	}
	book, _ := ResolveBook(db, newID)
	if book.Language != "zho" {
		t.Errorf("language = %q, want zho", book.Language)
	}
}

// ---- 文本工具 ----

func TestSuperStrip(t *testing.T) {
	cases := []struct{ in, want string }{
		{"  三体  ", "三体"},
		{"\u200b三体\ufeff", "三体"},
		{"\u00a0三体\u00a0", "三体"},
		{"三体", "三体"},
	}
	for _, tc := range cases {
		if got := SuperStrip(tc.in); got != tc.want {
			t.Errorf("SuperStrip(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

func TestGetTitleSort(t *testing.T) {
	cases := []struct{ in, want string }{
		{"The Hobbit", "hobbit"},
		{"A Game of Thrones", "game of thrones"},
		{"An Apple", "apple"},
		{"三体", "三体"},
		{"  Spaced  ", "spaced"},
	}
	for _, tc := range cases {
		if got := GetTitleSort(tc.in); got != tc.want {
			t.Errorf("GetTitleSort(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

func TestNewUUIDUnique(t *testing.T) {
	seen := map[string]bool{}
	for i := 0; i < 50; i++ {
		id := newUUID()
		if id == "" {
			t.Fatal("UUID 为空")
		}
		if seen[id] {
			t.Fatalf("UUID 重复: %s", id)
		}
		seen[id] = true
	}
}
