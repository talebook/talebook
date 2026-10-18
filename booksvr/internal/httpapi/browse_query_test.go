package httpapi

import (
	"net/http"
	"reflect"
	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/userdb"
	"testing"
)

func TestBrowseLibraryUsesPagedQueryAndBatchCards(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "Book")
	bookSeedItem(t, f.DB, 10, "private", 1)
	cfg := f.Cfg
	cfg.PrivateBookIDs = func(*Context) (map[int64]bool, error) { return map[int64]bool{12: true}, nil }
	calls := 0
	cfg.BrowsePage = func(ctx *Context, q library.BrowseQuery) ([]int64, int, error) {
		calls++
		if q.Start != 60 || q.Size != 2 || q.Format != "PDF" || q.Filters["author"] != "Somebody" || !q.Excluded[12] {
			t.Fatalf("query %+v", q)
		}
		return []int64{10}, 88, nil
	}
	cfg.SearchField = func(*Context, string, string) ([]int64, error) {
		t.Fatal("unbounded legacy field query")
		return nil, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/library?format=PDF&author=Somebody&size=2&start=60", "", 1, false)
	got, err := BookLibraryHandler(cfg)(ctx)
	if err != nil || calls != 1 || got["total"] != 88 {
		t.Fatalf("%v %v", got, err)
	}
	b := got["books"].([]map[string]any)[0]
	single := bookDict(cfg, library.BookData{ID: 10, Title: "Book"})
	for _, key := range []string{"scope", "collector", "count_visit", "count_download", "media_type", "media_type_locked"} {
		if b[key] != single[key] {
			t.Fatalf("%s: batch %v single %v", key, b[key], single[key])
		}
	}
}

func TestSearchRelevanceReadsEachTitleOnce(t *testing.T) {
	calls := map[int64]int{}
	cfg := BookConfig{BookTitle: func(id int64) string {
		calls[id]++
		if id == 1 {
			return "Needle"
		}
		return "other"
	}}
	got := bookSortByTitleRelevance(cfg, []int64{1, 2, 3, 4, 5}, "needle", nil)
	if got[0] != 1 {
		t.Fatal(got)
	}
	for _, n := range calls {
		if n != 1 {
			t.Fatalf("per-comparison title reads %v", calls)
		}
	}
}

func TestAuthorIndexedPageMatchesCanonicalCompatibility(t *testing.T) {
	f := newBookFixture(t)
	if err := library.Migrate(f.DB); err != nil {
		t.Fatal(err)
	}
	for id := int64(1); id <= 4; id++ {
		insertBook(t, f.DB, id, "Book")
	}
	for _, a := range []struct {
		id    int64
		name  string
		books []int64
	}{{1, "Alice", []int64{1, 2}}, {2, "ALICE ", []int64{1, 3}}, {3, "A. Writer", []int64{4}}, {4, " Bob ", []int64{1}}, {5, "Bob", []int64{2}}, {6, "Éditions", nil}, {7, "O'Neil", []int64{3}}} {
		metaSeedAuthor(t, f.DB, a.id, a.name, a.books...)
	}
	cfg := MetaConfig{DB: f.DB, UserDB: f.DB, Book: f.Cfg}
	for _, aliases := range []bool{false, true} {
		if aliases {
			if _, err := userdb.NewAliasService(f.DB).ReplaceAuthorGroup("Alice", "Écrivain", []string{"Alice", "A. Writer"}, false); err != nil {
				t.Fatal(err)
			}
		}
		for _, query := range []string{"", "?page=1&page_size=2", "?page=2&page_size=2", "?page=99&page_size=2", "?page=9223372036854775807&page_size=2", "?q=é&page=1&page_size=1", "?q=Bob", "?q=%27", "?q=absent"} {
			ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/author"+query, "", 1, true)
			ctx.Params = []string{"author"}
			got, err := MetaListHandler(cfg)(ctx)
			if err != nil {
				t.Fatal(err)
			}
			if _, err = f.DB.Exec(`ALTER TABLE book_browse_counts RENAME TO test_hidden_browse_counts`); err != nil {
				t.Fatal(err)
			}
			want, referenceErr := MetaListHandler(cfg)(ctx)
			if _, err = f.DB.Exec(`ALTER TABLE test_hidden_browse_counts RENAME TO book_browse_counts`); err != nil {
				t.Fatal(err)
			}
			if referenceErr != nil || !reflect.DeepEqual(got, want) {
				t.Fatalf("aliases %v query %q got %v want %v err %v", aliases, query, got, want, referenceErr)
			}
		}
	}
}

func TestAuthorIndexedPageUsesSeparateAliasDatabase(t *testing.T) {
	f := newBookFixture(t)
	if err := library.Migrate(f.DB); err != nil {
		t.Fatal(err)
	}
	insertBook(t, f.DB, 10, "Book")
	metaSeedAuthor(t, f.DB, 1, "Author", 10)
	users := netSchemaDB(t)
	if _, err := userdb.NewAliasService(users).ReplaceAuthorGroup("Author", "笔名", []string{"Author"}, false); err != nil {
		t.Fatal(err)
	}
	ctx := pluginCtx(t, users, http.MethodGet, "/api/author", "", 1, true)
	ctx.Params = []string{"author"}
	got, err := MetaListHandler(MetaConfig{DB: f.DB, UserDB: users})(ctx)
	if err != nil {
		t.Fatal(err)
	}
	items := got["items"].([]map[string]any)
	if len(items) != 1 || items[0]["name"] != "笔名" || int64Of(items[0]["count"]) != 1 {
		t.Fatalf("%v", got)
	}
}

func TestMetaLiteralFormatNamesDoNotBecomeUnfilteredLibrary(t *testing.T) {
	f := newMetaFixture(t)
	for id := int64(1); id <= 3; id++ {
		metaSeedBook(t, f.DB, id, "Book")
	}
	metaSeedFormat(t, f.DB, 1, "EPUB")
	metaSeedFormat(t, f.DB, 2, "全部")
	metaSeedFormat(t, f.DB, 3, "")
	for _, tc := range []struct {
		name string
		id   int64
	}{{"全部", 2}, {"", 3}} {
		ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/format/", "", 1, true)
		ctx.Params = []string{"format", tc.name}
		got, e := MetaBooksHandler(f.Cfg)(ctx)
		if e != nil {
			t.Fatal(e)
		}
		books := got["books"].([]map[string]any)
		if int64Of(got["total"]) != 1 || len(books) != 1 || int64Of(books[0]["id"]) != tc.id {
			t.Fatal(got)
		}
	}
}
