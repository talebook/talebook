package httpapi

import (
	"net/http"
	"testing"

	"talebook/booksvr/internal/library"
)

func TestBookDirectoriesHandlerFiltersNamesAndPaginates(t *testing.T) {
	f := newBookFixture(t)
	if err := library.Migrate(f.DB); err != nil {
		t.Fatal(err)
	}
	for _, r := range []struct {
		id   int
		file string
	}{{10, "/books/a.epub"}, {11, "/books/b.epub"}, {12, "/books/child/c.epub"}, {13, "/private/secret.epub"}} {
		insertBook(t, f.DB, int64(r.id), "Directory book")
		if _, err := f.DB.Exec(`INSERT INTO book_formats(book_id,format,path,size,mtime) VALUES(?,'EPUB',?,20,0)`, r.id, r.file); err != nil {
			t.Fatal(err)
		}
	}
	f.Cfg.PrivateBookIDs = func(*Context) (map[int64]bool, error) { return map[int64]bool{13: true}, nil }
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/library/directories?children_only=1", "", 0, false)
	rsp, err := BookDirectoriesHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatal(err)
	}
	for _, d := range rsp["directories"].([]library.BookDirectory) {
		if d.Path == "/private" {
			t.Fatal(d)
		}
	}
	ctx = pluginCtx(t, f.DB, http.MethodGet, "/api/library/directories?path=/books&start=1&size=1", "", 0, false)
	rsp, err = BookDirectoriesHandler(f.Cfg)(ctx)
	if err != nil || rsp["total"] != 2 || len(rsp["books"].([]map[string]any)) != 1 {
		t.Fatal(rsp, err)
	}
	ctx = pluginCtx(t, f.DB, http.MethodGet, "/api/library/directories?path=/books&recursive=1", "", 0, false)
	rsp, err = BookDirectoriesHandler(f.Cfg)(ctx)
	if err != nil || rsp["total"] != 3 {
		t.Fatal(rsp, err)
	}
	for _, p := range []string{"relative", "/books/../private"} {
		ctx = pluginCtx(t, f.DB, http.MethodGet, "/api/library/directories?path="+p, "", 0, false)
		rsp, err = BookDirectoriesHandler(f.Cfg)(ctx)
		if err != nil || rsp["err"] != "params.invalid" {
			t.Fatal(rsp, err)
		}
	}
}
func TestBookDirectoriesHandlerMissingAndRecovery(t *testing.T) {
	f := newBookFixture(t)
	if err := library.Migrate(f.DB); err != nil {
		t.Fatal(err)
	}
	insertBook(t, f.DB, 90, "Directory missing")
	if _, err := f.DB.Exec(`INSERT INTO book_formats(book_id,format,path,size,mtime) VALUES(90,'PDF','/source/check.pdf',20,0)`); err != nil {
		t.Fatal(err)
	}
	handler := BookDirectoriesHandler(f.Cfg)
	check := func(want int) {
		t.Helper()
		ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/library/directories?path=/source", "", 0, false)
		r, e := handler(ctx)
		if e != nil || r["total"] != want {
			t.Fatal(r, e)
		}
	}
	check(1)
	if _, err := f.DB.Exec(`INSERT INTO source_sync_formats(format_id,identity,size,mtime,missing) SELECT id,'',20,0,1 FROM book_formats WHERE book_id=90`); err != nil {
		t.Fatal(err)
	}
	check(0)
	if _, err := f.DB.Exec(`UPDATE source_sync_formats SET missing=0`); err != nil {
		t.Fatal(err)
	}
	check(1)
	if _, err := f.DB.Exec(`DELETE FROM books WHERE id=90`); err != nil {
		t.Fatal(err)
	}
	check(0)
}
