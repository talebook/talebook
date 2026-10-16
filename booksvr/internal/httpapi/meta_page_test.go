package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestMetaBooksLargeFormatPagedBeforeDetails(t *testing.T) {
	fx := newMetaFixture(t)
	fx.Cfg.Book = BookConfig{DB: fx.DB, LibraryDB: fx.DB}
	statements := []string{
		`WITH RECURSIVE seq(n) AS (VALUES(1) UNION ALL SELECT n+1 FROM seq WHERE n<40000) INSERT INTO books(id,title,author_sort,path,timestamp,pubdate,series_index,has_cover) SELECT n,printf('Book %05d',n),'a','p',0,'',1.0,0 FROM seq`,
		`INSERT INTO data(book,format,uncompressed_size,name) SELECT id,'MOBI',1,'book' FROM books`,
		`INSERT INTO data(book,format,uncompressed_size,name) VALUES(1,'MOBI',1,'duplicate'),(50000,'MOBI',1,'missing book')`,
		`INSERT INTO ratings(id,rating) VALUES(1,10)`,
		`INSERT INTO books_ratings_link(book,rating) VALUES(1,1),(2,1)`,
		// This malformed metadata must not be loaded for unrelated pages.
		`UPDATE books SET series_index='bad metadata outside page' WHERE id=20000`,
	}
	for _, statement := range statements {
		if _, err := fx.DB.Exec(statement); err != nil {
			t.Fatal(err)
		}
	}
	insertItem(t, fx.DB, 40000, "private", 99)
	insertItem(t, fx.DB, 39999, "private", 1)
	cases := []struct {
		name, query string
		user        int64
		admin       bool
		total       int
		ids         []int64
	}{
		{"owner first", "?size=2", 1, false, 39999, []int64{2, 1}},
		{"owner next", "?start=2&size=2", 1, false, 39999, []int64{39999, 39998}},
		{"guest next", "?start=2&size=2", 0, false, 39998, []int64{39998, 39997}},
		{"admin next", "?start=2&size=2", 1, true, 40000, []int64{40000, 39999}},
		{"last page", "?start=39997&size=60", 1, false, 39999, []int64{4, 3}},
		{"past end", "?start=40000", 1, false, 39999, []int64{}},
		{"large start", "?start=9223372036854775807&size=60", 1, false, 39999, []int64{}},
		{"negative start and zero size", "?start=-1&size=0", 1, false, 39999, []int64{2}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			srv, err := NewServer(MetaRouteSpecs(fx.Cfg))
			if err != nil {
				t.Fatal(err)
			}
			srv.DB = fx.DB
			srv.Identify = func(*http.Request) (Identity, error) { return Identity{UserID: tc.user, IsAdmin: tc.admin}, nil }
			rec := httptest.NewRecorder()
			srv.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/format/MOBI"+tc.query, nil))
			var got struct {
				Err   string           `json:"err"`
				Total int              `json:"total"`
				Books []map[string]any `json:"books"`
			}
			if err = json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
				t.Fatal(err)
			}
			books := got.Books
			if rec.Code != 200 || got.Err != "ok" || got.Total != tc.total || len(books) != len(tc.ids) {
				t.Fatalf("response: %d %s", rec.Code, rec.Body.String())
			}
			for i, id := range tc.ids {
				if int64Of(books[i]["id"]) != id {
					t.Fatalf("book[%d]=%v want %d", i, books[i]["id"], id)
				}
				for _, key := range []string{"img", "thumb", "href"} {
					if stringOf(books[i][key]) == "" {
						t.Fatalf("missing %s: %v", key, books[i])
					}
				}
			}

		})
	}
}
