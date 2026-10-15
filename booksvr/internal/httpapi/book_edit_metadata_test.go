package httpapi

import "testing"

func TestBookEditFormMetadataRoundTrip(t *testing.T) {
	w, db := newWriteFixture(t)
	insertBook(t, db, 1, "旧书名")
	insertItem(t, db, 1, "public", 1)
	args := map[string]any{"title": "新书名", "authors": []any{"作者"}, "tags": []any{"标签"}, "series": "丛书", "comments": "简介", "publisher": "出版社", "language": "zho", "rating": float64(8), "isbn": "9780000000001", "pubdate": "2026-10-16", "aliases": []any{"又名"}}
	resp, err := w.bookEdit(adminCtx(1), 1, args)
	if err != nil || resp["err"] != "ok" {
		t.Fatalf("save: %v %v", resp, err)
	}
	queries := map[string]string{
		"作者":            `SELECT a.name FROM authors a JOIN books_authors_link l ON a.id=l.author WHERE l.book=1`,
		"标签":            `SELECT a.name FROM tags a JOIN books_tags_link l ON a.id=l.tag WHERE l.book=1`,
		"丛书":            `SELECT a.name FROM series a JOIN books_series_link l ON a.id=l.series WHERE l.book=1`,
		"简介":            `SELECT text FROM comments WHERE book=1`,
		"出版社":           `SELECT a.name FROM publishers a JOIN books_publishers_link l ON a.id=l.publisher WHERE l.book=1`,
		"zho":           `SELECT a.lang_code FROM languages a JOIN books_languages_link l ON a.id=l.lang_code WHERE l.book=1`,
		"8":             `SELECT a.rating FROM ratings a JOIN books_ratings_link l ON a.id=l.rating WHERE l.book=1`,
		"9780000000001": `SELECT val FROM identifiers WHERE book=1 AND type='isbn'`,
		"2026-10-16":    `SELECT pubdate FROM books WHERE id=1`,
	}
	for want, query := range queries {
		var got string
		if err := db.QueryRow(query).Scan(&got); err != nil || got != want {
			t.Fatalf("want %q got %q: %v", want, got, err)
		}
	}
	aliases, err := w.aliases.GetBookAliases(1)
	if err != nil || len(aliases) != 1 || aliases[0] != "又名" {
		t.Fatalf("aliases: %v %v", aliases, err)
	}
	// A title-only update must retain all other fields.
	if _, err := w.bookEdit(adminCtx(1), 1, map[string]any{"title": "再次改名"}); err != nil {
		t.Fatal(err)
	}
	for want, query := range queries {
		var got string
		if err := db.QueryRow(query).Scan(&got); err != nil || got != want {
			t.Fatalf("omitted field changed: %q %q %v", want, got, err)
		}
	}
	for key := range args {
		if key != "title" {
			args[key] = "__DELETE__"
		}
	}
	args["authors"] = []any{"__DELETE__"}
	args["tags"] = []any{"__DELETE__"}
	args["aliases"] = []any{}
	resp, err = w.bookEdit(adminCtx(1), 1, args)
	if err != nil || resp["err"] != "ok" {
		t.Fatalf("clear: %v %v", resp, err)
	}
	for _, table := range []string{"books_authors_link", "books_tags_link", "books_series_link", "books_publishers_link", "books_languages_link", "books_ratings_link", "comments", "identifiers"} {
		var n int
		if err := db.QueryRow("SELECT COUNT(*) FROM " + table + " WHERE book=1").Scan(&n); err != nil || n != 0 {
			t.Fatalf("%s: %d %v", table, n, err)
		}
	}
	var n int
	if err := db.QueryRow(`SELECT COUNT(*) FROM books WHERE id=1 AND pubdate IS NULL`).Scan(&n); err != nil || n != 1 {
		t.Fatalf("date clear: %d %v", n, err)
	}
}

func TestBookEditRejectsClearedTitle(t *testing.T) {
	w, db := newWriteFixture(t)
	insertBook(t, db, 1, "书名")
	insertItem(t, db, 1, "public", 1)
	resp, err := w.bookEdit(adminCtx(1), 1, map[string]any{"title": "__DELETE__"})
	if err != nil || resp["err"] != "params.title" {
		t.Fatalf("%v %v", resp, err)
	}
}
