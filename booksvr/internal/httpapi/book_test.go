package httpapi

import (
	"database/sql"
	"net/http"
	"testing"

	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/userdb"
)

// bookFixture 是一次书籍模块测试的完整环境。
type bookFixture struct {
	DB  *sql.DB
	Cfg BookConfig
}

// newBookFixture 建库并返回配置。
func newBookFixture(t *testing.T) *bookFixture {
	t.Helper()
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	cfg := BookConfig{
		DB:        db,
		LibraryDB: db,
		CDNURL:    "https://cdn.example.com",
		Settings: map[string]any{
			"site_title":        "测试站点",
			"DEFAULT_PAGE_SIZE": 60,
			"BOOK_NAV":          "科幻=三体/流浪地球\n文学=活着",
		},
		CanViewBook:    func(ctx *Context, bookID int64) bool { return true },
		IsBookOwner:    func(ctx *Context, bookID int64) bool { return false },
		AllowGuestRead: true,
	}
	return &bookFixture{DB: db, Cfg: cfg}
}

// bookSeedReader 插入一个读者。
func bookSeedReader(t *testing.T, db *sql.DB, id int64, username string) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO readers (id, username, password, salt, name, email, avatar,
		admin, active, permission, create_time, update_time, access_time, extra)
		VALUES (?, ?, 'x', 'y', ?, ?, '', 0, 1, '', '2026-01-01 00:00:00', '2026-01-01 00:00:00',
		'2026-01-01 00:00:00', '{"kindle_email":""}')`,
		id, username, username, username+"@example.com"); err != nil {
		t.Fatalf("插入读者失败: %v", err)
	}
}

// bookSeedItem 插入 items 记录。
func bookSeedItem(t *testing.T, db *sql.DB, bookID int64, scope string, collectorID int64) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO items (book_id, count_guest, count_visit, count_download,
		website, collector_id, scope, book_type, media_type, media_type_locked, src_path)
		VALUES (?, 0, 5, 3, '', ?, ?, 'book', 'ebook', 0, '')`,
		bookID, collectorID, scope); err != nil {
		t.Fatalf("插入 items 失败: %v", err)
	}
}

// bookSeedState 插入阅读状态。
func bookSeedState(t *testing.T, db *sql.DB, bookID, readerID, readState int64, readDate string) {
	t.Helper()
	var date any
	if readDate != "" {
		date = readDate
	}
	if _, err := db.Exec(`INSERT INTO reading_state
		(book_id, reader_id, favorite, wants, read_state, read_date, online_read, download, progress)
		VALUES (?, ?, 0, 0, ?, ?, 0, 0, '{}')`,
		bookID, readerID, readState, date); err != nil {
		t.Fatalf("插入阅读状态失败: %v", err)
	}
}

// ---- 路由表 ----

func TestBookRouteSpecs(t *testing.T) {
	specs := BookRouteSpecs(BookConfig{})
	if len(specs) != 39 {
		t.Fatalf("len = %d, want 39", len(specs))
	}
	for _, s := range specs {
		if s.Pattern == "" || s.Handler == nil || len(s.Methods) == 0 {
			t.Fatalf("路由不完整: %+v", s)
		}
	}
}

func TestBookRouteSpecsCoverLegacy(t *testing.T) {
	impl := map[string]bool{}
	for _, p := range ImplementedPatterns() {
		impl[p] = true
	}
	want := []string{
		"/api/index", "/api/book/([0-9]+)", "/api/book/([0-9]+\\..+)",
		"/api/book/([0-9]+)/convert", "/api/book/([0-9]+)/topdf", "/api/book/([0-9]+)/refer",
		"/api/book/([0-9]+)/edit", "/api/book/([0-9]+)/delete", "/api/book/nav",
		"/api/recent", "/api/library", "/api/library/directories", "/api/search", "/api/hot",
		"/api/book/upload", "/api/book/upload/chunk", "/api/book/upload/complete",
		"/read/([0-9]+)", "/api/book/([0-9]+)/reader-bootstrap",
		"/read/resource/([0-9]+\\.epub)", "/api/read/txt", "/api/book/txt/init",
		"/api/book/([0-9]+)/send_to_device", "/api/book/([0-9]+)/mailto",
		"/api/book/([0-9]+)/setscope", "/api/book/([0-9]+)/media_type",
		"/api/book/([0-9]+)/delete_format", "/api/book/([0-9]+)/separate",
		"/api/book/([0-9]+)/savemeta", "/api/scopedbooks", "/api/book/([0-9]+)/favorite",
		"/api/book/([0-9]+)/shelf", "/api/shelf", "/api/reading", "/api/read-done",
		"/api/book/([0-9]+)/readstate", "/api/book/([0-9]+)/progress",
		"/api/reading/stats", "/api/favorites",
	}
	for _, p := range want {
		if !impl[p] {
			t.Errorf("未登记路由: %s", p)
		}
	}
}

func TestWebDAVRouteSpecs(t *testing.T) {
	specs := WebDAVRouteSpecs(WebDAVConfig{})
	if len(specs) != 1 {
		t.Fatalf("len = %d, want 1", len(specs))
	}
	if specs[0].Pattern != "/books/?(.*)" {
		t.Fatalf("pattern = %s", specs[0].Pattern)
	}
	if len(specs[0].Methods) != 12 {
		t.Fatalf("methods = %d, want 12", len(specs[0].Methods))
	}
}

// ---- 阅读状态格式化 ----

func TestBookReadingStateDictNil(t *testing.T) {
	d := bookReadingStateDict(nil)
	if d["favorite"] != 0 || d["read_state"] != 0 || d["favorite_date"] != nil {
		t.Fatalf("d = %+v", d)
	}
}

func TestBookReadingStateDict(t *testing.T) {
	s := &userdb.ReadingState{
		BookID: 1, ReaderID: 2, Favorite: 1, FavoriteDate: "2026-01-01 00:00:00",
		Wants: 1, ReadState: 2, ReadDate: "2026-01-02 00:00:00", OnlineRead: 1, Download: 1,
	}
	d := bookReadingStateDict(s)
	if d["favorite"] != int64(1) || d["read_state"] != int64(2) {
		t.Fatalf("d = %+v", d)
	}
	if d["read_date"] != "2026-01-02T00:00:00Z" {
		t.Fatalf("read_date = %v", d["read_date"])
	}
}

func TestBookReadingStateAPINil(t *testing.T) {
	d := bookReadingStateAPI(nil)
	if d["err"] != "ok" || d["read_state"] != 0 || d["favorite"] != false {
		t.Fatalf("d = %+v", d)
	}
}

func TestBookReadingStateAPI(t *testing.T) {
	s := &userdb.ReadingState{Favorite: 1, Wants: 1, ReadState: 1, OnlineRead: 2}
	d := bookReadingStateAPI(s)
	if d["favorite"] != true || d["wants"] != true || d["read_state"] != int64(1) {
		t.Fatalf("d = %+v", d)
	}
}

// ---- 分页 ----

func TestBookArgumentStart(t *testing.T) {
	f := newBookFixture(t)
	cases := []struct {
		query string
		want  int
	}{{"", 0}, {"?start=30", 30}, {"?start=-5", 0}, {"?start=abc", 0}}
	for _, c := range cases {
		ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/index"+c.query, "", 1, false)
		if got := bookArgumentStart(ctx); got != c.want {
			t.Errorf("query=%q got=%d want=%d", c.query, got, c.want)
		}
	}
}

func TestBookPageDelta(t *testing.T) {
	f := newBookFixture(t)
	cases := []struct {
		query string
		want  int
	}{{"", 60}, {"?size=10", 10}, {"?size=0", 1}, {"?size=999", 60}, {"?size=abc", 60}}
	for _, c := range cases {
		ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/index"+c.query, "", 1, false)
		if got := bookPageDelta(ctx, 60); got != c.want {
			t.Errorf("query=%q got=%d want=%d", c.query, got, c.want)
		}
	}
}

func TestBookMaxPageSize(t *testing.T) {
	if got := bookMaxPageSize(BookConfig{Settings: map[string]any{}}); got != 60 {
		t.Fatalf("got = %d, want 60", got)
	}
	if got := bookMaxPageSize(BookConfig{Settings: map[string]any{"DEFAULT_PAGE_SIZE": 10}}); got != 60 {
		t.Fatalf("低于 60 应抬到 60, got = %d", got)
	}
	if got := bookMaxPageSize(BookConfig{Settings: map[string]any{"DEFAULT_PAGE_SIZE": 120}}); got != 120 {
		t.Fatalf("got = %d, want 120", got)
	}
}

func TestBookSlice(t *testing.T) {
	ids := []int64{1, 2, 3, 4, 5}
	cases := []struct {
		start, end int
		want       int
	}{{0, 2, 2}, {2, 10, 3}, {10, 20, 0}, {-5, 2, 2}, {3, 1, 0}}
	for _, c := range cases {
		if got := len(bookSlice(ids, c.start, c.end)); got != c.want {
			t.Errorf("start=%d end=%d got=%d want=%d", c.start, c.end, got, c.want)
		}
	}
}

// ---- 书籍字典 ----

func TestBookDict(t *testing.T) {
	f := newBookFixture(t)
	b := library.BookData{
		ID: 10, Title: "三体", Authors: []string{"刘慈欣"}, Tags: []string{"科幻"},
		Publisher: "重庆出版社", Formats: []string{"EPUB", "MOBI"},
	}
	d := bookDict(f.Cfg, b)
	if d["id"] != int64(10) || d["title"] != "三体" {
		t.Fatalf("d = %+v", d)
	}
	if d["author"] != "刘慈欣" {
		t.Fatalf("author = %v", d["author"])
	}
	if d["fmt_epub"] != true || d["fmt_mobi"] != true {
		t.Fatalf("格式标记缺失: %+v", d)
	}
	// img/thumb 带 ?t=<timestamp> 缓存破坏参数，与 Python 的
	// SimpleBookFormatter.format 一致（"...jpg?t=%(ts)s"）。
	if d["img"] != "https://cdn.example.com/get/cover/10.jpg?t=0" {
		t.Fatalf("img = %v", d["img"])
	}
	if d["thumb"] != "https://cdn.example.com/get/thumb_60x80/10.jpg?t=0" {
		t.Fatalf("thumb = %v", d["thumb"])
	}
}

func TestBookHasFormat(t *testing.T) {
	b := library.BookData{Formats: []string{"EPUB", "MOBI"}}
	if !bookHasFormat(b, "epub") || !bookHasFormat(b, "MOBI") {
		t.Fatalf("应大小写不敏感")
	}
	if bookHasFormat(b, "PDF") {
		t.Fatalf("不应命中 PDF")
	}
}

func TestBookIntersect(t *testing.T) {
	got := bookIntersect([]int64{1, 2, 3, 4}, []int64{2, 4, 9})
	if len(got) != 2 || got[0] != 2 || got[1] != 4 {
		t.Fatalf("got = %+v", got)
	}
	if len(bookIntersect([]int64{1}, nil)) != 0 {
		t.Fatalf("空集应返回空")
	}
}

func TestBookBoolOf(t *testing.T) {
	cases := []struct {
		v    any
		want bool
	}{{true, true}, {false, false}, {"1", true}, {"true", true}, {"TRUE", true},
		{"0", false}, {float64(1), true}, {float64(0), false}, {int64(2), true}, {nil, false}}
	for _, c := range cases {
		if got := bookBoolOf(c.v); got != c.want {
			t.Errorf("v=%v got=%v want=%v", c.v, got, c.want)
		}
	}
}

// ---- Index / Recent ----

func TestBookIndexHandler(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	insertBook(t, f.DB, 11, "流浪地球")

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/index", "", 1, false)
	resp, err := BookIndexHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	// /api/index 与 Python 一致：不返回 err 键，只返回两组书与计数。
	if resp["new_books_count"] != 2 || resp["random_books_count"] != 2 {
		t.Fatalf("resp = %+v", resp)
	}
	books := resp["new_books"].([]map[string]any)
	if int64Of(books[0]["id"]) != 11 {
		t.Fatalf("应按 id 降序: %+v", books)
	}
}

func TestBookRecentHandler(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/recent", "", 1, false)
	resp, err := BookRecentHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["title"] != "新书推荐" || resp["total"] != 1 {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookRenderListFiltersPrivate(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "公开书")
	insertBook(t, f.DB, 11, "私藏书")
	f.Cfg.PrivateBookIDs = func(ctx *Context) (map[int64]bool, error) {
		return map[int64]bool{11: true}, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/index", "", 1, false)
	resp, err := BookIndexHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	// /api/index 返回 random_books / new_books 两组，私藏书不应出现在任一组。
	if resp["random_books_count"] != 1 || resp["new_books_count"] != 1 {
		t.Fatalf("私藏书应被过滤: %+v", resp)
	}
	for _, key := range []string{"random_books", "new_books"} {
		for _, b := range resp[key].([]map[string]any) {
			if b["id"] == int64(11) {
				t.Fatalf("%s 不应含私藏书: %+v", key, b)
			}
		}
	}
}

func TestBookRenderListPagination(t *testing.T) {
	f := newBookFixture(t)
	for i := int64(1); i <= 5; i++ {
		insertBook(t, f.DB, i, "书")
	}
	// random/recent 参数控制两组书的数量（对应 Python 的 cnt_random / cnt_recent）。
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/index?random=2&recent=3", "", 1, false)
	resp, err := BookIndexHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["random_books_count"] != 2 {
		t.Fatalf("random_books_count = %v, want 2", resp["random_books_count"])
	}
	if resp["new_books_count"] != 3 {
		t.Fatalf("new_books_count = %v, want 3", resp["new_books_count"])
	}
	if len(resp["random_books"].([]map[string]any)) != 2 {
		t.Fatalf("random_books 应返回 2 本")
	}
}

func TestBookRenderListAttachesState(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	bookSeedReader(t, f.DB, 1, "alice")
	bookSeedState(t, f.DB, 10, 1, 1, "2026-01-01 00:00:00")

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/index", "", 1, false)
	resp, err := BookIndexHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	books := resp["new_books"].([]map[string]any)
	if len(books) == 0 {
		t.Fatal("new_books 不应为空")
	}
	state := books[0]["state"].(map[string]any)
	if state["read_state"] != int64(1) {
		t.Fatalf("state = %+v", state)
	}
}

// ---- BookNav ----

func TestBookNavHandler(t *testing.T) {
	f := newBookFixture(t)
	f.Cfg.NavTags = func(ctx *Context) (map[string]int, error) {
		return map[string]int{"三体": 3, "流浪地球": 2, "活着": 1, "其他标签": 5}, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/book/nav", "", 1, false)
	resp, err := BookNavHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	navs := resp["navs"].([]map[string]any)
	if len(navs) != 3 {
		t.Fatalf("navs = %d, want 3", len(navs))
	}
	if navs[0]["legend"] != "科幻" {
		t.Fatalf("legend = %v", navs[0]["legend"])
	}
	// 最后一组是「其他」，只含未在 BOOK_NAV 中出现的标签。
	others := navs[len(navs)-1]
	if others["legend"] != "其他" {
		t.Fatalf("末组应为其他: %+v", others)
	}
	if len(others["tags"].([]map[string]any)) != 1 {
		t.Fatalf("其他组应只含 1 个标签: %+v", others)
	}
}

func TestBookNavHandlerSkipsZeroCount(t *testing.T) {
	f := newBookFixture(t)
	f.Cfg.NavTags = func(ctx *Context) (map[string]int, error) {
		return map[string]int{"三体": 3}, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/book/nav", "", 1, false)
	resp, _ := BookNavHandler(f.Cfg)(ctx)
	navs := resp["navs"].([]map[string]any)
	// 「文学=活着」计数为 0，应被跳过。
	for _, n := range navs {
		if n["legend"] == "文学" {
			t.Fatalf("零计数分组不应出现: %+v", n)
		}
	}
}

func TestBookNavHandlerNoTags(t *testing.T) {
	f := newBookFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/book/nav", "", 1, false)
	resp, err := BookNavHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	navs := resp["navs"].([]map[string]any)
	if len(navs) != 1 || navs[0]["legend"] != "其他" {
		t.Fatalf("navs = %+v", navs)
	}
}

// ---- Library ----

func TestBookLibraryHandler(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	insertBook(t, f.DB, 11, "流浪地球")
	f.Cfg.SearchField = func(ctx *Context, field, value string) ([]int64, error) {
		if field == "publisher" && value == "重庆出版社" {
			return []int64{10}, nil
		}
		return nil, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/library?publisher=重庆出版社", "", 1, false)
	resp, err := BookLibraryHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["total"] != 1 {
		t.Fatalf("total = %v, want 1", resp["total"])
	}
}

func TestBookLibraryHandlerAllSkipsFilter(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	f.Cfg.SearchField = func(ctx *Context, field, value string) ([]int64, error) {
		t.Fatalf("「全部」不应触发检索")
		return nil, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/library?publisher=全部", "", 1, false)
	resp, err := BookLibraryHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["total"] != 1 {
		t.Fatalf("total = %v, want 1", resp["total"])
	}
}

func TestBookLibraryHandlerFormatFilter(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	if _, err := f.DB.Exec(`INSERT INTO data (book, format, name, uncompressed_size)
		VALUES (10, 'EPUB', 'a.epub', 100)`); err != nil {
		t.Fatalf("插入格式失败: %v", err)
	}
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/library?format=EPUB", "", 1, false)
	resp, err := BookLibraryHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["total"] != 1 {
		t.Fatalf("total = %v, want 1", resp["total"])
	}
}

// ---- Search ----

func TestBookSearchHandlerEmpty(t *testing.T) {
	f := newBookFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/search?name=", "", 1, false)
	resp, err := BookSearchHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["err"] != "params.invalid" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookSearchHandler(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	insertBook(t, f.DB, 11, "流浪地球")
	f.Cfg.Search = func(ctx *Context, keyword string) ([]int64, error) {
		return []int64{10, 11}, nil
	}
	f.Cfg.BookTitle = func(bookID int64) string {
		if bookID == 10 {
			return "三体"
		}
		return "流浪地球"
	}
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/search?name=三体", "", 1, false)
	resp, err := BookSearchHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	books := resp["books"].([]map[string]any)
	if int64Of(books[0]["id"]) != 10 {
		t.Fatalf("书名命中应排前: %+v", books)
	}
}

func TestBookSearchHandlerAliasAuthor(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	f.Cfg.Search = func(ctx *Context, keyword string) ([]int64, error) { return nil, nil }
	f.Cfg.AliasAuthorNames = func(ctx *Context, keyword string) ([]string, error) {
		return []string{"刘慈欣"}, nil
	}
	f.Cfg.BooksForCategory = func(ctx *Context, category, name string) ([]int64, error) {
		if category == "authors" && name == "刘慈欣" {
			return []int64{10}, nil
		}
		return nil, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/search?name=刘慈欣", "", 1, false)
	resp, err := BookSearchHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["total"] != 1 {
		t.Fatalf("total = %v, want 1", resp["total"])
	}
}

func TestBookSortByTitleRelevance(t *testing.T) {
	cfg := BookConfig{BookTitle: func(id int64) string {
		if id == 1 {
			return "三体"
		}
		return "其他"
	}}
	got := bookSortByTitleRelevance(cfg, []int64{3, 1, 2}, "三体", nil)
	if got[0] != 1 {
		t.Fatalf("书名命中应排首位: %+v", got)
	}
	// 其余按 id 降序。
	if got[1] != 3 || got[2] != 2 {
		t.Fatalf("同级应按 id 降序: %+v", got)
	}
}

func TestBookSortByTitleRelevanceAlias(t *testing.T) {
	cfg := BookConfig{BookTitle: func(id int64) string { return "无关" }}
	got := bookSortByTitleRelevance(cfg, []int64{5, 9}, "x", map[int64]bool{9: true})
	if got[0] != 9 {
		t.Fatalf("别名命中应排首位: %+v", got)
	}
}

// ---- Hot ----

func TestBookHotHandler(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	f.Cfg.HotBooks = func(ctx *Context, start, delta int) ([]int64, int, error) {
		return []int64{10}, 1, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/hot", "", 1, false)
	resp, err := BookHotHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["title"] != "热度榜单" || resp["total"] != 1 {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookHotHandlerNotWired(t *testing.T) {
	f := newBookFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/hot", "", 1, false)
	resp, err := BookHotHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["total"] != 0 {
		t.Fatalf("resp = %+v", resp)
	}
}
