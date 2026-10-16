package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
)

func TestBookLibraryLargeFormatFilterStreamsOnlyPage(t *testing.T) {
	fx := newMetaFixture(t)
	for _, statement := range []string{
		`WITH RECURSIVE seq(n) AS (VALUES(1) UNION ALL SELECT n+1 FROM seq WHERE n<40000) INSERT INTO books(id,title,author_sort,path,timestamp,pubdate,series_index,has_cover) SELECT n,printf('Book %05d',n),'a','p',0,'',1.0,0 FROM seq`,
		`INSERT INTO data(book,format,uncompressed_size,name) SELECT id,CASE WHEN id%4=0 THEN 'MOBI' ELSE 'TXT' END,1,'book' FROM books`,
		`INSERT INTO data(book,format,uncompressed_size,name) VALUES(40000,'MOBI',1,'duplicate')`,
		// Filtering must not load metadata for the 30000 books of another format.
		`UPDATE books SET series_index='unrelated malformed metadata' WHERE id=1`,
	} {
		if _, err := fx.DB.Exec(statement); err != nil {
			t.Fatal(err)
		}
	}
	insertItem(t, fx.DB, 40000, "private", 99)
	insertItem(t, fx.DB, 39996, "private", 1)
	w := newBookWiring(fx.DB, fx.DB, map[string]any{})
	for _, tc := range []struct {
		name         string
		user         int64
		admin        bool
		start, total int
		ids          []int64
	}{
		{"guest", 0, false, 0, 9998, []int64{39992, 39988}},
		{"owner", 1, false, 0, 9999, []int64{39996, 39992}},
		{"admin", 1, true, 0, 10000, []int64{40000, 39996}},
		{"next page", 1, false, 2, 9999, []int64{39988, 39984}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			srv, err := NewServer(BookRouteSpecs(w.Config("")))
			if err != nil {
				t.Fatal(err)
			}
			srv.DB = fx.DB
			srv.Identify = func(*http.Request) (Identity, error) { return Identity{UserID: tc.user, IsAdmin: tc.admin}, nil }
			req := httptest.NewRequest(http.MethodGet, "/api/library?format=mObI&stream=1&size=2", nil)
			q := req.URL.Query()
			q.Set("start", strconv.Itoa(tc.start))
			req.URL.RawQuery = q.Encode()
			rec := httptest.NewRecorder()
			srv.ServeHTTP(rec, req)
			lines := strings.Split(strings.TrimSpace(rec.Body.String()), "\n")
			if rec.Code != 200 || !strings.Contains(rec.Header().Get("Content-Type"), "application/x-ndjson") || len(lines) != 3 {
				t.Fatalf("bad stream: %d %v %s", rec.Code, rec.Header(), rec.Body.String())
			}
			var header struct {
				Err   string `json:"err"`
				Total int    `json:"total"`
			}
			if err = json.Unmarshal([]byte(lines[0]), &header); err != nil {
				t.Fatal(err)
			}
			if header.Err != "ok" || header.Total != tc.total {
				t.Fatalf("header: %+v", header)
			}
			for i, id := range tc.ids {
				var book map[string]any
				if err = json.Unmarshal([]byte(lines[i+1]), &book); err != nil {
					t.Fatal(err)
				}
				if int64Of(book["id"]) != id {
					t.Fatalf("book: %v want %d", book, id)
				}
				for _, key := range []string{"img", "thumb", "href"} {
					if stringOf(book[key]) == "" {
						t.Fatalf("missing %s", key)
					}
				}
			}
		})
	}
}
