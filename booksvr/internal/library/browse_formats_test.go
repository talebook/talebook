package library

import (
	"context"
	"reflect"
	"strings"
	"testing"
)

func TestBrowseFormatProjectionTracksVisibilityAndScores(t *testing.T) {
	db := newQueryDB(t)
	ctx := context.Background()
	run := func(q string) {
		t.Helper()
		if _, e := db.Exec(q); e != nil {
			t.Fatal(e)
		}
	}
	check := func(format string, rated bool, want []int64) {
		t.Helper()
		ids, total, err := BrowseBooks(ctx, db, BrowseQuery{Format: format, RatingSort: rated, Size: 60})
		if err != nil || total != len(want) || !reflect.DeepEqual(ids, want) {
			t.Fatalf("format %s rated %v got %v count %d want %v err %v", format, rated, ids, total, want, err)
		}
	}
	check("epub", true, []int64{1})
	run(`INSERT INTO data(book,format,name,uncompressed_size) VALUES(2,'EPUB','two',1),(3,'epub','three',1),(3,'EPUB','duplicate case',1),(999,'EPUB','orphan',1)`)
	check("EPUB", false, []int64{3, 2, 1})
	check("EPUB", true, []int64{1, 3, 2})
	run(`INSERT INTO books_ratings_link(book,rating) VALUES(2,1)`)
	check("EPUB", true, []int64{2, 1, 3})
	run(`UPDATE ratings SET rating=10 WHERE id=2`)
	check("EPUB", true, []int64{3, 2, 1})
	run(`DELETE FROM books_ratings_link WHERE book=2`)
	check("EPUB", true, []int64{3, 1, 2})
	run(`INSERT INTO book_formats(id,book_id,format,path,size,mtime) VALUES(11,1,'EPUB','/one.epub',1,0)`)
	run(`INSERT INTO source_sync_formats(format_id,identity,size,mtime,missing) VALUES(11,'a',1,0,1)`)
	check("EPUB", true, []int64{3, 2})
	run(`INSERT INTO source_sync_formats(format_id,identity,size,mtime,missing) VALUES(11,'a',1,0,0) ON CONFLICT(format_id) DO UPDATE SET missing=excluded.missing`)
	check("EPUB", true, []int64{3, 1, 2})
	run(`UPDATE source_sync_formats SET missing=1 WHERE format_id=11`)
	check("EPUB", true, []int64{3, 2})
	run(`DELETE FROM book_formats WHERE id=11`)
	check("EPUB", true, []int64{3, 1, 2}) // legacy data remains available
	run(`UPDATE data SET format='TXT' WHERE book=2`)
	check("EPUB", false, []int64{3, 1})
	check("TXT", false, []int64{2})
	run(`DELETE FROM books WHERE id=3`)
	check("EPUB", false, []int64{1})
	if e := Migrate(db); e != nil {
		t.Fatal(e)
	}
	check("EPUB", true, []int64{1})
	ids, total, e := BrowseBooks(ctx, db, BrowseQuery{Format: "EPUB", Excluded: map[int64]bool{1: true}, Size: 60})
	if e != nil || total != 0 || len(ids) != 0 {
		t.Fatal(ids, total, e)
	}
}

func TestBrowseFormatProjectionPlanAndSnapshotRollback(t *testing.T) {
	db := newQueryDB(t)
	for _, q := range []string{`SELECT book_id FROM book_browse_formats WHERE format='EPUB' ORDER BY book_id DESC LIMIT 60`, `SELECT book_id FROM book_browse_formats WHERE format='EPUB' ORDER BY rating DESC,book_id DESC LIMIT 60`} {
		rows, e := db.Query("EXPLAIN QUERY PLAN " + q)
		if e != nil {
			t.Fatal(e)
		}
		plan := ""
		for rows.Next() {
			var a, b, c int
			var d string
			rows.Scan(&a, &b, &c, &d)
			plan += d
		}
		rows.Close()
		if !strings.Contains(plan, "INDEX") || strings.Contains(plan, "TEMP B-TREE") {
			t.Fatal(plan)
		}
	}
	tx, e := db.Begin()
	if e != nil {
		t.Fatal(e)
	}
	defer tx.Rollback()
	if _, e = tx.Exec(`DELETE FROM data WHERE book=1`); e != nil {
		t.Fatal(e)
	}
	var n int
	if e = tx.QueryRow(`SELECT n FROM book_browse_format_counts WHERE format='EPUB'`).Scan(&n); e != nil || n != 0 {
		t.Fatal(n, e)
	}
	tx.Rollback()
	_, n, e = BrowseBooks(context.Background(), db, BrowseQuery{Format: "EPUB", Size: 60})
	if e != nil || n != 1 {
		t.Fatal(n, e)
	}
}

func TestBrowseFormatBookRestorationAndLateRatingSchema(t *testing.T) {
	db := newQueryDB(t)
	run := func(q string) {
		t.Helper()
		if _, e := db.Exec(q); e != nil {
			t.Fatal(e)
		}
	}
	run(`INSERT INTO data(book,format,name,uncompressed_size) VALUES(999,'EPUB','orphan',1)`)
	run(`INSERT INTO book_formats(id,book_id,format,path,size,mtime) VALUES(999,999,'EPUB','/orphan.epub',1,0)`)
	run(`INSERT INTO source_sync_formats(format_id,identity,size,mtime,missing) VALUES(999,'o',1,0,1)`)
	run(`INSERT INTO books(id,title) VALUES(999,'Restored')`)
	missing, e := UnavailableSourceBooks(db)
	if e != nil || !missing[999] {
		t.Fatal(missing, e)
	}
	_, total, e := BrowseBooks(context.Background(), db, BrowseQuery{Format: "EPUB", Size: 60})
	if e != nil || total != 1 {
		t.Fatal(total, e)
	}
	run(`UPDATE source_sync_formats SET missing=0 WHERE format_id=999`)
	ids, total, e := BrowseBooks(context.Background(), db, BrowseQuery{Format: "EPUB", Size: 60})
	if e != nil || total != 2 || ids[0] != 999 {
		t.Fatal(ids, total, e)
	}
	// A sparse fixture may acquire Calibre rating tables after the first migrate.
	for _, row := range []string{`DROP TABLE books_ratings_link`, `DROP TABLE ratings`, `UPDATE book_browse_format_state SET has_ratings=0`} {
		run(row)
	}
	if e = Migrate(db); e != nil {
		t.Fatal(e)
	}
	run(`CREATE TABLE ratings(id INTEGER PRIMARY KEY,rating INTEGER)`)
	run(`CREATE TABLE books_ratings_link(id INTEGER PRIMARY KEY,book INTEGER,rating INTEGER)`)
	run(`INSERT INTO ratings(id,rating) VALUES(1,10)`)
	run(`INSERT INTO books_ratings_link(book,rating) VALUES(999,1)`)
	if e = Migrate(db); e != nil {
		t.Fatal(e)
	}
	ids, _, e = BrowseBooks(context.Background(), db, BrowseQuery{Format: "EPUB", RatingSort: true, Size: 60})
	if e != nil || ids[0] != 999 {
		t.Fatal(ids, e)
	}
	// Membership recomputation must retain the rating expression after upgrade.
	run(`INSERT INTO data(book,format,name,uncompressed_size) VALUES(999,'EPUB','duplicate',1)`)
	ids, _, e = BrowseBooks(context.Background(), db, BrowseQuery{Format: "EPUB", RatingSort: true, Size: 60})
	if e != nil || ids[0] != 999 {
		t.Fatal(ids, e)
	}
}

func TestBrowseLiteralFormatNamesAndLargePrivateIDs(t *testing.T) {
	db := newQueryDB(t)
	for _, q := range []string{`INSERT INTO data(book,format,name,uncompressed_size) VALUES(2,'全部','literal',1),(3,'','empty',1)`} {
		if _, e := db.Exec(q); e != nil {
			t.Fatal(e)
		}
	}
	for _, tc := range []struct {
		format string
		id     int64
	}{{"全部", 2}, {"", 3}} {
		ids, n, e := BrowseBooks(context.Background(), db, BrowseQuery{Format: tc.format, FormatFilter: true, Size: 60})
		if e != nil || n != 1 || len(ids) != 1 || ids[0] != tc.id {
			t.Fatal(ids, n, e)
		}
	}
	private := map[int64]bool{1: true}
	for id := int64(100); id < 41000; id++ {
		private[id] = true
	}
	ids, n, e := BrowseBooks(context.Background(), db, BrowseQuery{Format: "EPUB", Excluded: private, Size: 60})
	if e != nil || n != 0 || len(ids) != 0 {
		t.Fatal(ids, n, e)
	}
	_, n, e = BrowseBooks(context.Background(), db, BrowseQuery{Format: "全部", Size: 60})
	if e != nil || n != 3 {
		t.Fatal(n, e)
	}
}
