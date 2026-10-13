package library

import (
	"database/sql"
	"path/filepath"
	"testing"

	_ "modernc.org/sqlite"
)

// newQueryDB 建一个带 Calibre 风格表结构与样本数据的测试库。
//
// 表结构对齐真实 Calibre metadata.db 的读路径所需部分。
func newQueryDB(t *testing.T) *sql.DB {
	t.Helper()
	path := filepath.Join(t.TempDir(), "metadata.db")
	db, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	stmts := []string{
		`CREATE TABLE books (
			id INTEGER PRIMARY KEY, title TEXT NOT NULL DEFAULT '',
			author_sort TEXT NOT NULL DEFAULT '', path TEXT NOT NULL DEFAULT '',
			timestamp INTEGER NOT NULL DEFAULT 0, pubdate TEXT,
			series_index REAL NOT NULL DEFAULT 1.0, sort TEXT,
			has_cover INTEGER NOT NULL DEFAULT 0, uuid TEXT, last_modified TEXT
		)`,
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
		`CREATE TABLE custom_columns (id INTEGER PRIMARY KEY, label TEXT, name TEXT, datatype TEXT, display TEXT, is_multiple INTEGER, normalized INTEGER)`,
	}
	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			t.Fatalf("create table: %v\n%s", err, s)
		}
	}

	seed := []string{
		`INSERT INTO books (id,title,author_sort,path,timestamp,pubdate,series_index,has_cover,last_modified)
		 VALUES (1,'三体','刘慈欣','刘慈欣/三体 (1)',1000000,'2008-01-01',1.0,1,'2020-01-01 00:00:00+00:00')`,
		`INSERT INTO books (id,title,author_sort,path,timestamp,pubdate,series_index,has_cover,last_modified)
		 VALUES (2,'三体 II','刘慈欣','刘慈欣/三体 II (2)',1000001,'2008-05-01',2.0,0,'2020-01-02 00:00:00+00:00')`,
		`INSERT INTO books (id,title,author_sort,path,timestamp,pubdate,series_index,has_cover,last_modified)
		 VALUES (3,'活着','余华','余华/活着 (3)',1000002,'1993-01-01',1.0,0,'2020-01-03 00:00:00+00:00')`,
		`INSERT INTO authors (id,name,sort) VALUES (1,'刘慈欣','刘慈欣'),(2,'余华','余华')`,
		`INSERT INTO books_authors_link (book,author) VALUES (1,1),(2,1),(3,2)`,
		`INSERT INTO tags (id,name) VALUES (1,'科幻'),(2,'中国文学')`,
		`INSERT INTO books_tags_link (book,tag) VALUES (1,1),(2,1),(3,2)`,
		`INSERT INTO publishers (id,name,sort) VALUES (1,'重庆出版社','重庆出版社')`,
		`INSERT INTO books_publishers_link (book,publisher) VALUES (1,1)`,
		`INSERT INTO series (id,name,sort) VALUES (1,'三体','三体')`,
		`INSERT INTO books_series_link (book,series) VALUES (1,1),(2,1)`,
		`INSERT INTO ratings (id,rating) VALUES (1,8),(2,6)`,
		`INSERT INTO books_ratings_link (book,rating) VALUES (1,1),(3,2)`,
		`INSERT INTO languages (id,lang_code) VALUES (1,'zho')`,
		`INSERT INTO books_languages_link (book,lang_code) VALUES (1,1)`,
		`INSERT INTO comments (book,text) VALUES (1,'地球往事三部曲第一部')`,
		`INSERT INTO identifiers (book,type,val) VALUES (1,'isbn','9787536692930')`,
		`INSERT INTO data (book,format,uncompressed_size,name) VALUES (1,'EPUB',1000,'三体 - 刘慈欣.epub')`,
	}
	for _, s := range seed {
		if _, err := db.Exec(s); err != nil {
			t.Fatalf("seed: %v\n%s", err, s)
		}
	}
	if err := Migrate(db); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db
}

// TestGetBooksDataByIDs 按 id 批量取书，字段与 SimpleBookFormatter 对齐。
func TestGetBooksDataByIDs(t *testing.T) {
	db := newQueryDB(t)

	books, err := GetBooksData(db, []int64{1, 3})
	if err != nil {
		t.Fatalf("GetBooksData: %v", err)
	}
	if len(books) != 2 {
		t.Fatalf("返回 %d 本，want 2", len(books))
	}

	byID := map[int64]BookData{}
	for _, b := range books {
		byID[b.ID] = b
	}

	b1, ok := byID[1]
	if !ok {
		t.Fatal("缺少 id=1")
	}
	if b1.Title != "三体" {
		t.Errorf("Title = %q", b1.Title)
	}
	if len(b1.Authors) != 1 || b1.Authors[0] != "刘慈欣" {
		t.Errorf("Authors = %#v", b1.Authors)
	}
	if len(b1.Tags) != 1 || b1.Tags[0] != "科幻" {
		t.Errorf("Tags = %#v", b1.Tags)
	}
	if b1.Publisher != "重庆出版社" {
		t.Errorf("Publisher = %q", b1.Publisher)
	}
	if b1.Series != "三体" {
		t.Errorf("Series = %q", b1.Series)
	}
	if b1.Rating != 8 {
		t.Errorf("Rating = %d, want 8", b1.Rating)
	}
	if b1.Comments != "地球往事三部曲第一部" {
		t.Errorf("Comments = %q", b1.Comments)
	}
	if b1.Language != "zho" {
		t.Errorf("Language = %q", b1.Language)
	}
	if b1.ISBN != "9787536692930" {
		t.Errorf("ISBN = %q", b1.ISBN)
	}
	if !b1.HasCover {
		t.Error("HasCover 应为 true")
	}

	b3 := byID[3]
	if b3.Title != "活着" || b3.Authors[0] != "余华" {
		t.Errorf("id=3 数据错误: %#v", b3)
	}
	if b3.Publisher != "" {
		t.Errorf("id=3 无出版社，实际 %q", b3.Publisher)
	}
}

// TestGetBooksDataEmptyIDs 空 ids 返回空结果。
func TestGetBooksDataEmptyIDs(t *testing.T) {
	db := newQueryDB(t)
	books, err := GetBooksData(db, nil)
	if err != nil {
		t.Fatalf("GetBooksData: %v", err)
	}
	if len(books) != 0 {
		t.Fatalf("空 ids 应返回空，实际 %d", len(books))
	}
}

// TestGetBooksDataMissingID 不存在的 id 被跳过。
func TestGetBooksDataMissingID(t *testing.T) {
	db := newQueryDB(t)
	books, err := GetBooksData(db, []int64{1, 999})
	if err != nil {
		t.Fatalf("GetBooksData: %v", err)
	}
	if len(books) != 1 || books[0].ID != 1 {
		t.Fatalf("应只返回 id=1，实际 %#v", books)
	}
}

// TestGetBooksDataMultipleAuthors 多作者按顺序拼接。
func TestGetBooksDataMultipleAuthors(t *testing.T) {
	db := newQueryDB(t)
	if _, err := db.Exec(`INSERT INTO books_authors_link (book,author) VALUES (3,1)`); err != nil {
		t.Fatalf("seed: %v", err)
	}
	books, err := GetBooksData(db, []int64{3})
	if err != nil {
		t.Fatalf("GetBooksData: %v", err)
	}
	if len(books[0].Authors) != 2 {
		t.Fatalf("应有 2 个作者，实际 %#v", books[0].Authors)
	}
}

// TestGetBooksDataClosedDB 关闭的库返回错误。
func TestGetBooksDataClosedDB(t *testing.T) {
	db := newQueryDB(t)
	_ = db.Close()
	if _, err := GetBooksData(db, []int64{1}); err == nil {
		t.Fatal("关闭的库应返回错误")
	}
}
