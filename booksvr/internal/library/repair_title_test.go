package library

import (
	"database/sql"
	"talebook/booksvr/internal/normalize"
	"testing"
)

func TestRepairTitlePreservesOtherBooksAndManualEdits(t *testing.T) {
	db := openGroupDB(t)
	for _, q := range []string{`ALTER TABLE books ADD COLUMN sort TEXT`, `ALTER TABLE books ADD COLUMN last_modified TEXT`} {
		if _, err := db.Exec(q); err != nil {
			t.Fatal(err)
		}
	}
	work, err := FindOrCreateWork(db, "PGVF05UTWV", "楚惜刀")
	if err != nil {
		t.Fatal(err)
	}
	for _, id := range []int{1, 2} {
		if _, err := db.Exec(`INSERT INTO books(id,title,author_sort,work_id,path) VALUES(?, 'PGVF05UTWV','楚惜刀',?,'keep-path')`, id, work); err != nil {
			t.Fatal(err)
		}
	}
	expect := sql.NullInt64{Int64: work, Valid: true}
	ok, err := RepairTitle(db, 1, "PGVF05UTWV", "九州·魅生05：十师卷", "楚惜刀", expect)
	if err != nil || !ok {
		t.Fatalf("%v %v", ok, err)
	}
	var title, norm, path string
	var newWork int64
	if err := db.QueryRow(`SELECT title,title_norm,work_id,path FROM books WHERE id=1`).Scan(&title, &norm, &newWork, &path); err != nil {
		t.Fatal(err)
	}
	if title != "九州·魅生05：十师卷" || norm != normalize.NormalizeTitle(title) || newWork == work || path != "keep-path" {
		t.Fatal("incorrect repair")
	}
	var other int64
	var authorNorm string
	if err := db.QueryRow(`SELECT author_norm FROM books WHERE id=1`).Scan(&authorNorm); err != nil || authorNorm != normalize.NormalizeAuthor("楚惜刀") {
		t.Fatal("author normalization differs from work")
	}
	if err := db.QueryRow(`SELECT work_id FROM books WHERE id=2`).Scan(&other); err != nil || other != work {
		t.Fatal("shared work changed")
	}
	if ok, err := RepairTitle(db, 1, "PGVF05UTWV", "overwrite", "楚惜刀", expect); err != nil || ok {
		t.Fatal("not idempotent")
	}
	if _, err := db.Exec(`UPDATE books SET title='手动修改' WHERE id=2`); err != nil {
		t.Fatal(err)
	}
	if ok, err := RepairTitle(db, 2, "PGVF05UTWV", "overwrite", "楚惜刀", expect); err != nil || ok {
		t.Fatal("manual edit overwritten")
	}
}
