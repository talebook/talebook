package library

import (
	"context"
	"reflect"
	"strings"
	"testing"
)

func TestBrowseBooksSQLPages(t *testing.T) {
	db := newQueryDB(t)
	if err := Migrate(db); err != nil {
		t.Fatal(err)
	}
	cases := []struct {
		name  string
		q     BrowseQuery
		total int
		ids   []int64
	}{
		{"all", BrowseQuery{Size: 2}, 3, []int64{3, 2}},
		{"last", BrowseQuery{Start: 2, Size: 2}, 3, []int64{1}},
		{"past", BrowseQuery{Start: 99, Size: 2}, 3, []int64{}},
		{"private", BrowseQuery{Excluded: map[int64]bool{3: true, 2: false}, Size: 2}, 2, []int64{2, 1}},
		{"intersection", BrowseQuery{Filters: map[string]string{"author": "刘", "publisher": "重庆"}, Size: 2}, 1, []int64{1}},
		{"literal apostrophe", BrowseQuery{Filters: map[string]string{"author": "'"}, Size: 2}, 0, []int64{}},
		{"empty candidates", BrowseQuery{Candidates: []int64{}, Size: 2}, 0, []int64{}},
		{"duplicate candidates", BrowseQuery{Candidates: []int64{3, 3, 2, 999}, Size: 2}, 2, []int64{3, 2}},
		{"aliases", BrowseQuery{Category: "authors", Names: []string{"刘慈欣", "余华"}, Size: 2}, 3, []int64{3, 2}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			ids, total, err := BrowseBooks(context.Background(), db, tc.q)
			if err != nil || total != tc.total || !reflect.DeepEqual(ids, tc.ids) {
				t.Fatalf("ids %v count %d err %v", ids, total, err)
			}
		})
	}
}

func TestBrowseBooksMissingFormatAndLargePrivateSet(t *testing.T) {
	db := newQueryDB(t)
	if err := Migrate(db); err != nil {
		t.Fatal(err)
	}
	for _, sql := range []string{
		`INSERT INTO book_formats(id,book_id,format,path,size,mtime) VALUES(1,1,'EPUB','/one.epub',1,0),(2,2,'EPUB','/two.epub',1,0)`,
		`INSERT INTO source_sync_formats(format_id,identity,size,mtime,missing) VALUES(1,'',1,0,1),(2,'',1,0,1)`,
		`DELETE FROM data WHERE book=1`,
		`INSERT INTO data(book,format,name,uncompressed_size) VALUES(1,'EPUB','one',1),(2,'PDF','legacy',1)`,
	} {
		if _, err := db.Exec(sql); err != nil {
			t.Fatal(err)
		}
	}
	excluded := map[int64]bool{}
	for id := int64(100); id < 41000; id++ {
		excluded[id] = true
	}
	ids, total, err := BrowseBooks(context.Background(), db, BrowseQuery{Excluded: excluded, Size: 60})
	if err != nil || total != 2 || !reflect.DeepEqual(ids, []int64{3, 2}) {
		t.Fatalf("%v %d %v", ids, total, err)
	}
	ids, total, err = BrowseBooks(context.Background(), db, BrowseQuery{Format: "epub", Size: 60})
	if err != nil || total != 0 || len(ids) != 0 {
		t.Fatalf("missing EPUB: %v %d %v", ids, total, err)
	}
	if _, err = db.Exec(`UPDATE source_sync_formats SET missing=0 WHERE format_id=1`); err != nil {
		t.Fatal(err)
	}
	_, total, err = BrowseBooks(context.Background(), db, BrowseQuery{Format: "EPUB", Size: 60})
	if err != nil || total != 1 {
		t.Fatalf("restore %d %v", total, err)
	}
}

func TestBrowseIndexesCoverPageMetadata(t *testing.T) {
	db := newQueryDB(t)
	if err := MigrateBrowseIndexes(db); err != nil {
		t.Fatal(err)
	}
	if err := MigrateBrowseIndexes(db); err != nil {
		t.Fatal(err)
	}
	for _, sql := range []string{`SELECT * FROM comments WHERE book IN (1,2)`, `SELECT * FROM identifiers WHERE book=1`, `SELECT book FROM data WHERE UPPER(format)='PDF'`, `SELECT book FROM books_authors_link WHERE author=1`, `SELECT author FROM books_authors_link WHERE book=1`} {
		rows, err := db.Query("EXPLAIN QUERY PLAN " + sql)
		if err != nil {
			t.Fatal(err)
		}
		plan := ""
		for rows.Next() {
			var a, b, c int
			var detail string
			rows.Scan(&a, &b, &c, &detail)
			plan += detail
		}
		rows.Close()
		if !(strings.Contains(plan, "SEARCH ") && strings.Contains(plan, "INDEX")) {
			t.Fatalf("unindexed %s: %s", sql, plan)
		}
	}
}

func TestCategorySQLUnicodeAndTies(t *testing.T) {
	db := newQueryDB(t)
	db.Exec(`INSERT INTO publishers(id,name) VALUES(2,'Éditions'),(3,'z'),(4,'A')`)
	items, total, all, paged, err := CategoryPage(context.Background(), db, "publishers", "é", 1, 2, true)
	if err != nil || total != 1 || all != 4 || !paged || len(items) != 1 || items[0].Name != "Éditions" {
		t.Fatalf("%v %d %d %v %v", items, total, all, paged, err)
	}
	items, total, _, _, err = CategoryPage(context.Background(), db, "publishers", "", 2, 2, true)
	if err != nil || total != 4 || len(items) != 2 || items[0].Name != "z" || items[1].Name != "Éditions" {
		t.Fatalf("tie %v %d %v", items, total, err)
	}
	items, _, _, _, err = CategoryPage(context.Background(), db, "publishers", "", int(^uint(0)>>1), 2, true)
	if err != nil || len(items) != 0 {
		t.Fatalf("overflow %v %v", items, err)
	}
}

func TestBrowseAvailabilityTracksChangesInSameTransaction(t *testing.T) {
	db := newQueryDB(t)
	check := func(want bool) {
		t.Helper()
		got, err := UnavailableSourceBooks(db)
		if err != nil || got[1] != want {
			t.Fatalf("missing=%v want %v err=%v", got, want, err)
		}
	}
	run := func(sql string) {
		t.Helper()
		if _, err := db.Exec(sql); err != nil {
			t.Fatal(err)
		}
	}
	run(`INSERT INTO book_formats(id,book_id,format,path,size,mtime) VALUES(11,1,'EPUB','/one.epub',1,0)`)
	run(`INSERT INTO source_sync_formats(format_id,identity,size,mtime,missing) VALUES(11,'a',1,0,1)`)
	check(true)
	// Outer UPSERT must not turn repeated trigger inserts into UNIQUE failures.
	run(`INSERT INTO source_sync_formats(format_id,identity,size,mtime,missing) VALUES(11,'a',1,0,1) ON CONFLICT(format_id) DO UPDATE SET missing=excluded.missing`)
	check(true)
	run(`INSERT INTO book_formats(id,book_id,format,path,size,mtime) VALUES(12,1,'PDF','/one.pdf',1,0)`)
	check(false)
	run(`DELETE FROM book_formats WHERE id=12`)
	check(true)
	run(`INSERT INTO data(book,format,name,uncompressed_size) VALUES(1,'TXT','legacy',1)`)
	check(false)
	run(`DELETE FROM data WHERE book=1 AND format='TXT'`)
	check(true)
	run(`UPDATE source_sync_formats SET missing=0 WHERE format_id=11`)
	check(false)
	run(`UPDATE source_sync_formats SET missing=1 WHERE format_id=11`)
	check(true)
	run(`DELETE FROM source_sync_formats WHERE format_id=11`)
	check(false)
	run(`DELETE FROM book_formats WHERE id=11`)
	check(false)
	if err := Migrate(db); err != nil {
		t.Fatal(err)
	}
	check(false)
}

func TestSearchPageMatchesExistingSearch(t *testing.T) {
	db := newQueryDB(t)
	for _, query := range []string{"", "author:刘", "title:三体", "tag:科幻 and not title:II", "rating:>6"} {
		want, err := Search(db, query)
		if err != nil {
			t.Fatal(err)
		}
		got, n, err := SearchPage(context.Background(), db, query, 0, -1, false)
		if err != nil || n != len(want) || !reflect.DeepEqual(got, want) {
			t.Fatalf("%q got %v n %d want %v err %v", query, got, n, want, err)
		}
		got, n, err = SearchPage(context.Background(), db, query, 1, 1, true)
		if err != nil || n != len(want) {
			t.Fatal(err)
		}
		if len(want) > 1 && got[0] != want[len(want)-2] {
			t.Fatalf("descending page %v %v", got, want)
		}
	}
}

func TestBrowseAvailabilityBackfillAndRollback(t *testing.T) {
	db := newQueryDB(t)
	for _, stmt := range []string{`INSERT INTO book_formats(id,book_id,format,path,size,mtime) VALUES(11,1,'EPUB','/one.epub',1,0)`, `INSERT INTO source_sync_formats(format_id,identity,size,mtime,missing) VALUES(11,'a',1,0,1)`, `DROP TABLE book_unavailable_sources`, `DROP TABLE book_browse_state`} {
		if _, err := db.Exec(stmt); err != nil {
			t.Fatal(err)
		}
	}
	old, err := UnavailableSourceBooks(db)
	if err != nil || !old[1] {
		t.Fatalf("legacy %v %v", old, err)
	}
	if err = Migrate(db); err != nil {
		t.Fatal(err)
	}
	got, err := UnavailableSourceBooks(db)
	if err != nil || !reflect.DeepEqual(old, got) {
		t.Fatalf("backfill %v %v %v", old, got, err)
	}
	tx, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`UPDATE source_sync_formats SET missing=0 WHERE format_id=11`); err != nil {
		t.Fatal(err)
	}
	var n int
	if err = tx.QueryRow(`SELECT count(*) FROM book_unavailable_sources WHERE book_id=1`).Scan(&n); err != nil || n != 0 {
		t.Fatalf("transaction %d %v", n, err)
	}
	tx.Rollback()
	got, err = UnavailableSourceBooks(db)
	if err != nil || !got[1] {
		t.Fatalf("rollback %v %v", got, err)
	}
}

func TestBrowseCategoryCountersStayExact(t *testing.T) {
	db := newQueryDB(t)
	check := func() {
		t.Helper()
		for _, kind := range []string{"authors", "tags", "publishers", "series", "ratings", "languages"} {
			spec := categorySpecs[kind]
			rows, e := db.Query("SELECT i.id,COUNT(DISTINCT l.book) FROM " + spec.itemTable + " i LEFT JOIN " + spec.linkTable + " l ON l." + spec.linkItemCol + "=i.id GROUP BY i.id")
			if e != nil {
				t.Fatal(e)
			}
			want := []Category{}
			for rows.Next() {
				var c Category
				rows.Scan(&c.ID, &c.Count)
				want = append(want, c)
			}
			rows.Close()
			got, _, _, _, e := CategoryPage(context.Background(), db, kind, "", 1, 1000, true)
			if e != nil {
				t.Fatal(e)
			}
			counts := map[int64]int64{}
			for _, v := range got {
				counts[v.ID] = v.Count
			}
			for _, v := range want {
				if counts[v.ID] != v.Count {
					t.Fatalf("%s id %d count %d want %d", kind, v.ID, counts[v.ID], v.Count)
				}
			}
		}
	}
	check()
	for _, stmt := range []string{
		`INSERT INTO books_authors_link(book,author) VALUES(NULL,1)`,
		`DELETE FROM books_authors_link WHERE book IS NULL`,
		`INSERT INTO books_authors_link(book,author) VALUES(1,1)`,
		`DELETE FROM books_authors_link WHERE id=(SELECT MIN(id) FROM books_authors_link WHERE book=1 AND author=1)`,
		`UPDATE books_authors_link SET author=2 WHERE book=1`,
		`INSERT INTO books_authors_link(id,book,author) VALUES(99,2,2) ON CONFLICT(id) DO UPDATE SET book=excluded.book,author=excluded.author`,
		`INSERT INTO books_authors_link(id,book,author) VALUES(99,2,1) ON CONFLICT(id) DO UPDATE SET book=excluded.book,author=excluded.author`,
		`DELETE FROM books_authors_link WHERE book=1`,
	} {
		if _, err := db.Exec(stmt); err != nil {
			t.Fatal(err)
		}
		check()
	}
	for _, stmt := range []string{`INSERT INTO data(book,format,name,uncompressed_size) VALUES(2,'EPUB','another',1)`, `UPDATE data SET format='PDF' WHERE book=1`, `DELETE FROM data WHERE book=2`} {
		if _, err := db.Exec(stmt); err != nil {
			t.Fatal(err)
		}
		rows, err := db.Query(`SELECT format,COUNT(*) FROM data GROUP BY format`)
		if err != nil {
			t.Fatal(err)
		}
		want := map[string]int64{}
		for rows.Next() {
			var f string
			var n int64
			rows.Scan(&f, &n)
			want[f] = n
		}
		rows.Close()
		items, _, _, _, err := CategoryPage(context.Background(), db, "formats", "", 1, 100, true)
		if err != nil || len(items) != len(want) {
			t.Fatalf("formats %v %v %v", items, want, err)
		}
		for _, v := range items {
			if want[v.Name] != v.Count {
				t.Fatal(items, want)
			}
		}
	}
	if err := Migrate(db); err != nil {
		t.Fatal(err)
	}
	check()
}
