package library

import (
	"context"
	"strings"
	"testing"
)

func TestDirectoryIndexIncrementalWritesAndSQLPagination(t *testing.T) {
	db := openTestDB(t)
	if err := Migrate(db); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`CREATE TABLE data(book INTEGER,name TEXT,format TEXT)`); err != nil {
		t.Fatal(err)
	}
	for _, r := range []struct {
		id   int
		path string
	}{{1, "/books/a.pdf"}, {2, "/books/b.pdf"}, {3, "/books/child/c.pdf"}, {4, "/books-other/x.pdf"}, {5, "/books_%/literal.pdf"}} {
		sourceRegister(t, db, r.id, r.path, "PDF")
	}
	c := NewBookDirectoryCache(db, "/managed")
	ctx := context.Background()
	_, ids, total, err := c.BrowsePage(ctx, "/books", false, false, nil, 1, 1)
	if err != nil || total != 2 || len(ids) != 1 || ids[0] != 1 {
		t.Fatal(ids, total, err)
	}
	_, ids, total, err = c.BrowsePage(ctx, "/books", true, false, nil, 0, 60)
	if err != nil || total != 3 || len(ids) != 3 {
		t.Fatal(ids, total, err)
	}
	_, _, total, err = c.BrowsePage(ctx, "/books_%", true, false, nil, 0, 60)
	if err != nil || total != 1 {
		t.Fatal(total, err)
	}
	var dirty int
	db.QueryRow(`SELECT COUNT(*) FROM book_directory_dirty`).Scan(&dirty)
	if dirty != 0 {
		t.Fatal(dirty)
	}
	// No-change/refresh reads must not rebuild or rewrite indexed positions.
	if _, err = db.Exec(`CREATE TRIGGER reject_directory_rewrite BEFORE INSERT ON book_directory_locations BEGIN SELECT RAISE(ABORT,'unexpected directory rebuild'); END`); err != nil {
		t.Fatal(err)
	}
	if _, _, _, err = c.BrowsePage(ctx, "/books", false, true, map[int64]bool{2: true}, 0, 60); err != nil {
		t.Fatal(err)
	}
	db.Exec(`DROP TRIGGER reject_directory_rewrite`)
	// Multiple updates to the same source coalesce, and rename/move is immediate.
	if _, err = db.Exec(`UPDATE book_formats SET path='/moved/a.pdf' WHERE book_id=1; UPDATE book_formats SET path='/moved/renamed.pdf' WHERE book_id=1`); err != nil {
		t.Fatal(err)
	}
	db.QueryRow(`SELECT COUNT(*) FROM book_directory_dirty`).Scan(&dirty)
	if dirty != 1 {
		t.Fatal(dirty)
	}
	_, ids, _, err = c.BrowsePage(ctx, "/moved", false, false, nil, 0, 60)
	if err != nil || len(ids) != 1 || ids[0] != 1 {
		t.Fatal(ids, err)
	}
	if _, err = db.Exec(`UPDATE book_formats SET book_id=2,format='EPUB' WHERE book_id=1`); err != nil {
		t.Fatal(err)
	}
	_, ids, _, err = c.BrowsePage(ctx, "/moved", false, false, nil, 0, 60)
	if err != nil || len(ids) != 1 || ids[0] != 2 {
		t.Fatal(ids, err)
	}
	if _, err = db.Exec(`DELETE FROM book_formats WHERE book_id=2`); err != nil {
		t.Fatal(err)
	}
	_, ids, _, err = c.BrowsePage(ctx, "/moved", false, false, nil, 0, 60)
	if err != nil || len(ids) != 0 {
		t.Fatal(ids, err)
	}
	// The same persistent index serves a new handler/process without a full scan.
	c = NewBookDirectoryCache(db, "/managed")
	if _, _, _, err = c.BrowsePage(ctx, "/books", true, false, nil, 0, 60); err != nil {
		t.Fatal(err)
	}
	rows, err := db.Query(`EXPLAIN QUERY PLAN SELECT book_id FROM book_directory_locations WHERE directory='/books'`)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	var plan string
	for rows.Next() {
		var a, b, d int
		var detail string
		rows.Scan(&a, &b, &d, &detail)
		plan += detail
	}
	if !strings.Contains(plan, "book_directory_location_path") {
		t.Fatal(plan)
	}
}
func TestDirectoryIndexLegacyRootAndMissingRecovery(t *testing.T) {
	db := openTestDB(t)
	if err := Migrate(db); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`CREATE TABLE data(book INTEGER,name TEXT,format TEXT);INSERT INTO books(id,title,path) VALUES(1,'Managed','A/B'); INSERT INTO data(book,name,format) VALUES(1,'one','EPUB')`); err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	c := NewBookDirectoryCache(db, "/managed")
	check := func(path string, want int) {
		t.Helper()
		_, _, n, e := c.BrowsePage(ctx, path, false, false, nil, 0, 60)
		if e != nil || n != want {
			t.Fatal(path, n, e)
		}
	}
	check("/managed/A/B", 1)
	if _, err := db.Exec(`UPDATE data SET name='two'; UPDATE books SET path='C/D' WHERE id=1`); err != nil {
		t.Fatal(err)
	}
	check("/managed/A/B", 0)
	check("/managed/C/D", 1)
	c = NewBookDirectoryCache(db, "/new-root")
	check("/new-root/C/D", 1)
	check("/managed/C/D", 0)
	if _, err := db.Exec(`DELETE FROM data`); err != nil {
		t.Fatal(err)
	}
	check("/new-root/C/D", 0)
	sourceRegister(t, db, 2, "/source/two.epub", "EPUB")
	check("/source", 1)
	if _, err := db.Exec(`INSERT INTO source_sync_formats(format_id,identity,size,mtime,missing) SELECT id,'',4,0,1 FROM book_formats WHERE book_id=2`); err != nil {
		t.Fatal(err)
	}
	check("/source", 0)
	if _, err := db.Exec(`UPDATE source_sync_formats SET missing=0`); err != nil {
		t.Fatal(err)
	}
	check("/source", 1)
	if _, err := db.Exec(`UPDATE source_sync_formats SET missing=1`); err != nil {
		t.Fatal(err)
	}
	check("/source", 0)
	if _, err := db.Exec(`DELETE FROM source_sync_formats`); err != nil {
		t.Fatal(err)
	}
	check("/source", 1)
	if _, err := db.Exec(`DELETE FROM books WHERE id=2`); err != nil {
		t.Fatal(err)
	}
	check("/source", 0)
	if err := Migrate(db); err != nil {
		t.Fatal(err)
	}
	check("/source", 0)
}
func TestDirectoryIndexCancelledBuildResumes(t *testing.T) {
	db := openTestDB(t)
	if err := Migrate(db); err != nil {
		t.Fatal(err)
	}
	sourceRegister(t, db, 1, "/source/a.pdf", "PDF")
	c := NewBookDirectoryCache(db, "")
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, _, _, err := c.BrowsePage(ctx, "/source", false, false, nil, 0, 60); err == nil {
		t.Fatal("expected cancelled build")
	}
	_, ids, n, err := c.BrowsePage(context.Background(), "/source", false, false, nil, 0, 60)
	if err != nil || n != 1 || len(ids) != 1 {
		t.Fatal(ids, n, err)
	}
}
func TestDirectoryIndexDirtyQueueSupportsOuterUpsert(t *testing.T) {
	db := openTestDB(t)
	if err := Migrate(db); err != nil {
		t.Fatal(err)
	}
	sourceRegister(t, db, 1, "/source/a.pdf", "PDF")
	for i := 0; i < 3; i++ {
		if _, err := db.Exec(`INSERT INTO book_formats(book_id,format,path,size,mtime) VALUES(1,'PDF','/source/a.pdf',4,0) ON CONFLICT(book_id,format) DO UPDATE SET path=excluded.path`); err != nil {
			t.Fatal(err)
		}
		if _, err := db.Exec(`INSERT INTO source_sync_formats(format_id,identity,size,mtime,missing) SELECT id,'',4,0,? FROM book_formats WHERE book_id=1 ON CONFLICT(format_id) DO UPDATE SET missing=excluded.missing`, i%2); err != nil {
			t.Fatal(err)
		}
	}
	var n int
	if err := db.QueryRow(`SELECT count(*) FROM book_directory_dirty WHERE book_id=1`).Scan(&n); err != nil || n != 1 {
		t.Fatal(n, err)
	}
	c := NewBookDirectoryCache(db, "")
	_, ids, n, err := c.BrowsePage(context.Background(), "/source", false, false, nil, 0, 60)
	if err != nil || n != 1 || len(ids) != 1 {
		t.Fatal(ids, n, err)
	}
}
