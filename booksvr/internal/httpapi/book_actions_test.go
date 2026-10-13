package httpapi

import (
	"net/http"
	"os"
	"path/filepath"
	"testing"
)

// ---- 阅读状态列表 ----

func TestBookReadingHandler(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	bookSeedReader(t, f.DB, 1, "alice")
	bookSeedState(t, f.DB, 10, 1, 1, "2026-01-01 00:00:00")

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/reading", "", 1, false)
	resp, err := BookReadingHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["title"] != "在读书籍" || resp["total"] != 1 {
		t.Fatalf("resp = %+v", resp)
	}
	books := resp["books"].([]map[string]any)
	if books[0]["state"].(map[string]any)["read_state"] != int64(1) {
		t.Fatalf("state 缺失: %+v", books[0])
	}
}

func TestBookReadDoneHandler(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	bookSeedReader(t, f.DB, 1, "alice")
	bookSeedState(t, f.DB, 10, 1, 2, "2026-01-01 00:00:00")

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/read-done", "", 1, false)
	resp, err := BookReadDoneHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["title"] != "已读完书籍" || resp["total"] != 1 {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookReadingHandlerGuest(t *testing.T) {
	f := newBookFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/reading", "", 0, false)
	resp, _ := BookReadingHandler(f.Cfg)(ctx)
	if resp["err"] != "user.need_login" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookReadingHandlerSkipsMissingBook(t *testing.T) {
	f := newBookFixture(t)
	bookSeedReader(t, f.DB, 1, "alice")
	bookSeedState(t, f.DB, 999, 1, 1, "2026-01-01 00:00:00")

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/reading", "", 1, false)
	resp, err := BookReadingHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["total"] != 0 {
		t.Fatalf("书不存在时应跳过: %+v", resp)
	}
}

// ---- ReadState ----

func TestBookReadStateHandlerGet(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	bookSeedReader(t, f.DB, 1, "alice")
	bookSeedState(t, f.DB, 10, 1, 1, "2026-01-01 00:00:00")

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/book/10/readstate", "", 1, false)
	ctx.Params = []string{"10"}
	resp, err := BookReadStateHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["err"] != "ok" || resp["read_state"] != int64(1) {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookReadStateHandlerGetEmpty(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	bookSeedReader(t, f.DB, 1, "alice")

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/book/10/readstate", "", 1, false)
	ctx.Params = []string{"10"}
	resp, err := BookReadStateHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["read_state"] != 0 || resp["favorite"] != false {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookReadStateHandlerPost(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	bookSeedReader(t, f.DB, 1, "alice")
	var gotState int64
	f.Cfg.SetReadState = func(ctx *Context, bookID int64, args map[string]any) error {
		gotState = int64Of(args["read_state"])
		return nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/10/readstate", `{"read_state":2}`, 1, false)
	ctx.Params = []string{"10"}
	resp, err := BookReadStateHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["err"] != "ok" || gotState != 2 {
		t.Fatalf("resp = %+v gotState=%d", resp, gotState)
	}
	if resp["msg"] != "阅读状态已设置为：已读完" {
		t.Fatalf("msg = %v", resp["msg"])
	}
}

func TestBookReadStateHandlerPostInvalidState(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	bookSeedReader(t, f.DB, 1, "alice")
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/10/readstate", `{"read_state":9}`, 1, false)
	ctx.Params = []string{"10"}
	resp, _ := BookReadStateHandler(f.Cfg)(ctx)
	if resp["err"] != "params.invalid" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookReadStateHandlerPostMissingBook(t *testing.T) {
	f := newBookFixture(t)
	bookSeedReader(t, f.DB, 1, "alice")
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/999/readstate", `{"read_state":1}`, 1, false)
	ctx.Params = []string{"999"}
	resp, _ := BookReadStateHandler(f.Cfg)(ctx)
	if resp["err"] != "params.book.invalid" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookReadStateHandlerGuest(t *testing.T) {
	f := newBookFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/book/10/readstate", "", 0, false)
	ctx.Params = []string{"10"}
	resp, _ := BookReadStateHandler(f.Cfg)(ctx)
	if resp["err"] != "user.need_login" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookReadStateHandlerBadID(t *testing.T) {
	f := newBookFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/book/x/readstate", "", 1, false)
	ctx.Params = []string{"x"}
	resp, _ := BookReadStateHandler(f.Cfg)(ctx)
	if resp["err"] != "params.book.invalid" {
		t.Fatalf("resp = %+v", resp)
	}
}

// ---- Progress ----

func TestBookProgressHandlerGet(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	bookSeedReader(t, f.DB, 1, "alice")
	if _, err := f.DB.Exec(`INSERT INTO reading_state
		(book_id, reader_id, favorite, wants, read_state, online_read, download, progress, progress_update_time)
		VALUES (10, 1, 0, 0, 0, 0, 0, '{"cfi":"x"}', '2026-01-05 00:00:00')`); err != nil {
		t.Fatalf("插入进度失败: %v", err)
	}
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/book/10/progress", "", 1, false)
	ctx.Params = []string{"10"}
	resp, err := BookProgressHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["progress"].(map[string]any)["cfi"] != "x" {
		t.Fatalf("resp = %+v", resp)
	}
	if resp["update_time"] != "2026-01-05T00:00:00Z" {
		t.Fatalf("update_time = %v", resp["update_time"])
	}
}

func TestBookProgressHandlerGetEmpty(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	bookSeedReader(t, f.DB, 1, "alice")
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/book/10/progress", "", 1, false)
	ctx.Params = []string{"10"}
	resp, err := BookProgressHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if len(resp["progress"].(map[string]any)) != 0 || resp["update_time"] != nil {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookProgressHandlerPost(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	bookSeedReader(t, f.DB, 1, "alice")
	var saved map[string]any
	f.Cfg.SetProgress = func(ctx *Context, bookID int64, progress map[string]any) error {
		saved = progress
		return nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/10/progress", `{"progress":{"cfi":"y"}}`, 1, false)
	ctx.Params = []string{"10"}
	resp, err := BookProgressHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["err"] != "ok" || saved["cfi"] != "y" {
		t.Fatalf("resp = %+v saved=%+v", resp, saved)
	}
}

func TestBookProgressHandlerPostInvalid(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	bookSeedReader(t, f.DB, 1, "alice")
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/10/progress", `{"progress":"x"}`, 1, false)
	ctx.Params = []string{"10"}
	resp, _ := BookProgressHandler(f.Cfg)(ctx)
	if resp["err"] != "params.invalid" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookProgressHandlerPostTooLarge(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	bookSeedReader(t, f.DB, 1, "alice")
	big := make([]byte, 9000)
	for i := range big {
		big[i] = 'a'
	}
	body := `{"progress":{"data":"` + string(big) + `"}}`
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/10/progress", body, 1, false)
	ctx.Params = []string{"10"}
	resp, _ := BookProgressHandler(f.Cfg)(ctx)
	if resp["err"] != "params.invalid" || resp["msg"] != "阅读进度数据过大" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookProgressHandlerPostMissingBook(t *testing.T) {
	f := newBookFixture(t)
	bookSeedReader(t, f.DB, 1, "alice")
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/999/progress", `{"progress":{}}`, 1, false)
	ctx.Params = []string{"999"}
	resp, _ := BookProgressHandler(f.Cfg)(ctx)
	if resp["err"] != "params.book.invalid" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookProgressHandlerNotWired(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	bookSeedReader(t, f.DB, 1, "alice")
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/10/progress", `{"progress":{}}`, 1, false)
	ctx.Params = []string{"10"}
	resp, _ := BookProgressHandler(f.Cfg)(ctx)
	if resp["err"] != "not_wired" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookProgressHandlerGuest(t *testing.T) {
	f := newBookFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/book/10/progress", "", 0, false)
	ctx.Params = []string{"10"}
	resp, _ := BookProgressHandler(f.Cfg)(ctx)
	if resp["err"] != "user.need_login" {
		t.Fatalf("resp = %+v", resp)
	}
}

// ---- ReadingStats ----

func TestBookReadingStatsHandler(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	bookSeedReader(t, f.DB, 1, "alice")
	bookSeedState(t, f.DB, 10, 1, 1, "2026-01-01 00:00:00")

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/reading/stats", "", 1, false)
	resp, err := BookReadingStatsHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	stats := resp["stats"].(map[string]any)
	if stats["total_reading"] != int64(1) || stats["total_read_done"] != int64(0) {
		t.Fatalf("stats = %+v", stats)
	}
	if _, ok := stats["month_read_done_books"]; !ok {
		t.Fatalf("应含 month_read_done_books")
	}
}

func TestBookReadingStatsHandlerGuest(t *testing.T) {
	f := newBookFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/reading/stats", "", 0, false)
	resp, _ := BookReadingStatsHandler(f.Cfg)(ctx)
	if resp["err"] != "user.need_login" {
		t.Fatalf("resp = %+v", resp)
	}
}

// ---- Favorite / Shelf ----

func TestBookFavoriteHandler(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	bookSeedReader(t, f.DB, 1, "alice")
	var got bool
	f.Cfg.SetFavorite = func(ctx *Context, bookID int64, favorite bool) error {
		got = favorite
		return nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/10/favorite", `{"favorite":true}`, 1, false)
	ctx.Params = []string{"10"}
	resp, err := BookFavoriteHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["err"] != "ok" || !got {
		t.Fatalf("resp = %+v got=%v", resp, got)
	}
}

func TestBookFavoriteHandlerNotWired(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	bookSeedReader(t, f.DB, 1, "alice")
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/10/favorite", `{"favorite":true}`, 1, false)
	ctx.Params = []string{"10"}
	resp, _ := BookFavoriteHandler(f.Cfg)(ctx)
	if resp["err"] != "not_wired" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookFavoriteHandlerMissingBook(t *testing.T) {
	f := newBookFixture(t)
	bookSeedReader(t, f.DB, 1, "alice")
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/999/favorite", `{"favorite":true}`, 1, false)
	ctx.Params = []string{"999"}
	resp, _ := BookFavoriteHandler(f.Cfg)(ctx)
	if resp["err"] != "params.book.invalid" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookFavoriteHandlerGuest(t *testing.T) {
	f := newBookFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/10/favorite", `{}`, 0, false)
	ctx.Params = []string{"10"}
	resp, _ := BookFavoriteHandler(f.Cfg)(ctx)
	if resp["err"] != "user.need_login" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookShelfHandler(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	bookSeedReader(t, f.DB, 1, "alice")
	var got bool
	f.Cfg.SetShelf = func(ctx *Context, bookID int64, wants bool) error {
		got = wants
		return nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/10/shelf", `{"wants":true}`, 1, false)
	ctx.Params = []string{"10"}
	resp, err := BookShelfHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["err"] != "ok" || !got {
		t.Fatalf("resp = %+v got=%v", resp, got)
	}
}

func TestBookShelfListHandler(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	bookSeedReader(t, f.DB, 1, "alice")
	if _, err := f.DB.Exec(`INSERT INTO reading_state
		(book_id, reader_id, favorite, wants, wants_date, read_state, online_read, download, progress)
		VALUES (10, 1, 0, 1, '2026-01-01 00:00:00', 0, 0, 0, '{}')`); err != nil {
		t.Fatalf("插入书架失败: %v", err)
	}
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/shelf", "", 1, false)
	resp, err := BookShelfListHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["title"] != "我的书架" || resp["total"] != 1 {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookShelfListHandlerGuest(t *testing.T) {
	f := newBookFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/shelf", "", 0, false)
	resp, _ := BookShelfListHandler(f.Cfg)(ctx)
	if resp["err"] != "user.need_login" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookFavoritesHandler(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	bookSeedReader(t, f.DB, 1, "alice")
	if _, err := f.DB.Exec(`INSERT INTO reading_state
		(book_id, reader_id, favorite, favorite_date, wants, read_state, online_read, download, progress)
		VALUES (10, 1, 1, '2026-01-01 00:00:00', 0, 0, 0, 0, '{}')`); err != nil {
		t.Fatalf("插入收藏失败: %v", err)
	}
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/favorites", "", 1, false)
	resp, err := BookFavoritesHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["title"] != "我的收藏" || resp["total"] != 1 {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookFavoritesHandlerGuest(t *testing.T) {
	f := newBookFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/favorites", "", 0, false)
	resp, _ := BookFavoritesHandler(f.Cfg)(ctx)
	if resp["err"] != "user.need_login" {
		t.Fatalf("resp = %+v", resp)
	}
}

// ---- ScopedBooks ----

func TestBookScopedHandler(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "公开书")
	bookSeedItem(t, f.DB, 10, "public", 0)

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/scopedbooks", "", 1, false)
	resp, err := BookScopedHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["total"] != 1 {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookScopedHandlerPrivate(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "私藏书")
	bookSeedItem(t, f.DB, 10, "private", 1)

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/scopedbooks?scope=private", "", 1, false)
	resp, err := BookScopedHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["total"] != 1 {
		t.Fatalf("resp = %+v", resp)
	}
}

// ---- BookDetail ----

func TestBookDetailHandler(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	bookSeedReader(t, f.DB, 1, "alice")
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/book/10", "", 1, false)
	ctx.Params = []string{"10"}
	resp, err := BookDetailHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	book := resp["book"].(map[string]any)
	if book["title"] != "三体" {
		t.Fatalf("book = %+v", book)
	}
	if _, ok := book["state"]; !ok {
		t.Fatalf("应含 state")
	}
}

func TestBookDetailHandlerWithExt(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	bookSeedReader(t, f.DB, 1, "alice")
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/book/10.json", "", 1, false)
	ctx.Params = []string{"10.json"}
	resp, err := BookDetailHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookDetailHandlerNotFound(t *testing.T) {
	f := newBookFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/book/999", "", 1, false)
	ctx.Params = []string{"999"}
	resp, _ := BookDetailHandler(f.Cfg)(ctx)
	if resp["err"] != "params.book.invalid" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookDetailHandlerHidden(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	f.Cfg.CanViewBook = func(ctx *Context, bookID int64) bool { return false }
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/book/10", "", 1, false)
	ctx.Params = []string{"10"}
	resp, _ := BookDetailHandler(f.Cfg)(ctx)
	if resp["err"] != "params.book.invalid" {
		t.Fatalf("resp = %+v", resp)
	}
}

// ---- 委托型 handler ----

func TestBookDelegateHandlers(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	bookSeedReader(t, f.DB, 1, "alice")
	stub := func(ctx *Context, bookID int64, args map[string]any) (map[string]any, error) {
		return map[string]any{"err": "ok", "book_id": bookID}, nil
	}
	cases := []struct {
		name string
		make func(BookConfig) HandlerFunc
		set  func(*BookConfig)
	}{
		{"edit", BookEditHandler, func(c *BookConfig) { c.EditBook = stub }},
		{"convert", BookConvertHandler, func(c *BookConfig) { c.Convert = stub }},
		{"topdf", BookToPDFHandler, func(c *BookConfig) { c.ToPDF = stub }},
		{"separate", BookSeparateHandler, func(c *BookConfig) { c.Separate = stub }},
		{"savemeta", BookSaveMetaHandler, func(c *BookConfig) { c.SaveMeta = stub }},
		{"refer", BookReferHandler, func(c *BookConfig) { c.Refer = stub }},
		{"send_to_device", BookSendDeviceHandler, func(c *BookConfig) { c.SendToDevice = stub }},
		{"mailto", BookSendMailHandler, func(c *BookConfig) { c.SendToMail = stub }},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			cfg := f.Cfg
			c.set(&cfg)
			ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/10/x", `{}`, 1, false)
			ctx.Params = []string{"10"}
			resp, err := c.make(cfg)(ctx)
			if err != nil {
				t.Fatalf("handler 失败: %v", err)
			}
			if resp["err"] != "ok" {
				t.Fatalf("resp = %+v", resp)
			}
		})
	}
}

func TestBookDelegateNotWired(t *testing.T) {
	f := newBookFixture(t)
	makers := []func(BookConfig) HandlerFunc{
		BookEditHandler, BookConvertHandler, BookToPDFHandler, BookSeparateHandler,
		BookSaveMetaHandler, BookReferHandler, BookSendDeviceHandler, BookSendMailHandler,
	}
	for i, make := range makers {
		ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/10/x", `{}`, 1, false)
		ctx.Params = []string{"10"}
		resp, _ := make(f.Cfg)(ctx)
		if resp["err"] != "not_wired" {
			t.Errorf("handler[%d] resp = %+v", i, resp)
		}
	}
}

func TestBookDelegateBadID(t *testing.T) {
	f := newBookFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/x/edit", `{}`, 1, false)
	ctx.Params = []string{"x"}
	resp, _ := BookEditHandler(f.Cfg)(ctx)
	if resp["err"] != "params.book.invalid" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookDelegateBadBody(t *testing.T) {
	f := newBookFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/10/edit", `nope`, 1, false)
	ctx.Params = []string{"10"}
	resp, _ := BookEditHandler(f.Cfg)(ctx)
	if resp["err"] != "params.invalid" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookDeleteHandler(t *testing.T) {
	f := newBookFixture(t)
	var got int64
	f.Cfg.DeleteBook = func(ctx *Context, bookID int64) (map[string]any, error) {
		got = bookID
		return map[string]any{"err": "ok"}, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/10/delete", "", 1, false)
	ctx.Params = []string{"10"}
	resp, _ := BookDeleteHandler(f.Cfg)(ctx)
	if resp["err"] != "ok" || got != 10 {
		t.Fatalf("resp = %+v got=%d", resp, got)
	}
}

func TestBookDeleteHandlerNotWired(t *testing.T) {
	f := newBookFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/10/delete", "", 1, false)
	ctx.Params = []string{"10"}
	resp, _ := BookDeleteHandler(f.Cfg)(ctx)
	if resp["err"] != "not_wired" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookDeleteFormatHandler(t *testing.T) {
	f := newBookFixture(t)
	var gotFormat string
	f.Cfg.DeleteFormat = func(ctx *Context, bookID int64, format string) (map[string]any, error) {
		gotFormat = format
		return map[string]any{"err": "ok"}, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/10/delete_format", `{"format":"MOBI"}`, 1, false)
	ctx.Params = []string{"10"}
	resp, _ := BookDeleteFormatHandler(f.Cfg)(ctx)
	if resp["err"] != "ok" || gotFormat != "MOBI" {
		t.Fatalf("resp = %+v gotFormat=%q", resp, gotFormat)
	}
}

func TestBookDeleteFormatHandlerMissingFormat(t *testing.T) {
	f := newBookFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/10/delete_format", `{}`, 1, false)
	ctx.Params = []string{"10"}
	resp, _ := BookDeleteFormatHandler(f.Cfg)(ctx)
	if resp["err"] != "params.invalid" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookSetScopeHandler(t *testing.T) {
	f := newBookFixture(t)
	var gotScope string
	f.Cfg.SetScope = func(ctx *Context, bookID int64, scope string) error {
		gotScope = scope
		return nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/10/setscope", `{"scope":"private"}`, 1, false)
	ctx.Params = []string{"10"}
	resp, _ := BookSetScopeHandler(f.Cfg)(ctx)
	if resp["err"] != "ok" || gotScope != "private" {
		t.Fatalf("resp = %+v gotScope=%q", resp, gotScope)
	}
}

func TestBookSetScopeHandlerInvalid(t *testing.T) {
	f := newBookFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/10/setscope", `{"scope":"weird"}`, 1, false)
	ctx.Params = []string{"10"}
	resp, _ := BookSetScopeHandler(f.Cfg)(ctx)
	if resp["err"] != "params.invalid" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookSetScopeHandlerNotWired(t *testing.T) {
	f := newBookFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/10/setscope", `{"scope":"public"}`, 1, false)
	ctx.Params = []string{"10"}
	resp, _ := BookSetScopeHandler(f.Cfg)(ctx)
	if resp["err"] != "not_wired" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookSetMediaTypeHandler(t *testing.T) {
	f := newBookFixture(t)
	var got string
	f.Cfg.SetMediaType = func(ctx *Context, bookID int64, mediaType string) error {
		got = mediaType
		return nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/10/media_type", `{"media_type":"comic"}`, 1, false)
	ctx.Params = []string{"10"}
	resp, _ := BookSetMediaTypeHandler(f.Cfg)(ctx)
	if resp["err"] != "ok" || got != "comic" {
		t.Fatalf("resp = %+v got=%q", resp, got)
	}
}

func TestBookSetMediaTypeHandlerInvalid(t *testing.T) {
	f := newBookFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/10/media_type", `{"media_type":"x"}`, 1, false)
	ctx.Params = []string{"10"}
	resp, _ := BookSetMediaTypeHandler(f.Cfg)(ctx)
	if resp["err"] != "params.invalid" {
		t.Fatalf("resp = %+v", resp)
	}
}

// ---- 上传 ----

func TestBookUploadHandlers(t *testing.T) {
	f := newBookFixture(t)
	stub := func(ctx *Context, args map[string]any) (map[string]any, error) {
		return map[string]any{"err": "ok"}, nil
	}
	cases := []struct {
		name string
		make func(BookConfig) HandlerFunc
		set  func(*BookConfig)
	}{
		{"upload", BookUploadHandler, func(c *BookConfig) { c.Upload = stub }},
		{"chunk", BookUploadChunkHandler, func(c *BookConfig) { c.UploadChunk = stub }},
		{"complete", BookUploadCompleteHandler, func(c *BookConfig) { c.UploadComplete = stub }},
		{"txt_init", BookTxtInitHandler, func(c *BookConfig) { c.TxtInit = stub }},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			cfg := f.Cfg
			c.set(&cfg)
			ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/upload", `{}`, 1, false)
			resp, err := c.make(cfg)(ctx)
			if err != nil {
				t.Fatalf("handler 失败: %v", err)
			}
			if resp["err"] != "ok" {
				t.Fatalf("resp = %+v", resp)
			}
		})
	}
}

func TestBookUploadNotWired(t *testing.T) {
	f := newBookFixture(t)
	makers := []func(BookConfig) HandlerFunc{
		BookUploadHandler, BookUploadChunkHandler, BookUploadCompleteHandler, BookTxtInitHandler,
	}
	for i, make := range makers {
		ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/upload", `{}`, 1, false)
		resp, _ := make(f.Cfg)(ctx)
		if resp["err"] != "not_wired" {
			t.Errorf("handler[%d] resp = %+v", i, resp)
		}
	}
}

// ---- 阅读权限 ----

func TestBookRequireReadPermissionGuestDenied(t *testing.T) {
	f := newBookFixture(t)
	f.Cfg.AllowGuestRead = false
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/read/10", "", 0, false)
	ok, resp := bookRequireReadPermission(f.Cfg, ctx)
	if ok || resp["err"] != "user.need_login" {
		t.Fatalf("ok=%v resp=%+v", ok, resp)
	}
}

func TestBookRequireReadPermissionGuestAllowed(t *testing.T) {
	f := newBookFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/read/10", "", 0, false)
	ok, resp := bookRequireReadPermission(f.Cfg, ctx)
	if !ok || resp != nil {
		t.Fatalf("ok=%v resp=%+v", ok, resp)
	}
}

func TestBookRequireReadPermissionNoPermission(t *testing.T) {
	f := newBookFixture(t)
	// 大写 R = 显式拒绝可读。
	if _, err := f.DB.Exec(`INSERT INTO readers (id, username, password, salt, name, email, avatar,
		admin, active, permission, create_time, update_time, access_time, extra)
		VALUES (1, 'alice', 'x', 'y', 'alice', 'a@example.com', '', 0, 1, 'R',
		'2026-01-01 00:00:00', '2026-01-01 00:00:00', '2026-01-01 00:00:00', '{}')`); err != nil {
		t.Fatalf("插入读者失败: %v", err)
	}
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/read/10", "", 1, false)
	ok, resp := bookRequireReadPermission(f.Cfg, ctx)
	if ok || resp["err"] != "user.no_permission" {
		t.Fatalf("ok=%v resp=%+v", ok, resp)
	}
}

func TestBookRequireReadPermissionInactive(t *testing.T) {
	f := newBookFixture(t)
	// active=0 且可读 → 要求先激活。
	if _, err := f.DB.Exec(`INSERT INTO readers (id, username, password, salt, name, email, avatar,
		admin, active, permission, create_time, update_time, access_time, extra)
		VALUES (1, 'alice', 'x', 'y', 'alice', 'a@example.com', '', 0, 0, '',
		'2026-01-01 00:00:00', '2026-01-01 00:00:00', '2026-01-01 00:00:00', '{}')`); err != nil {
		t.Fatalf("插入读者失败: %v", err)
	}
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/read/10", "", 1, false)
	ok, resp := bookRequireReadPermission(f.Cfg, ctx)
	if ok || resp["err"] != "user.activation_required" {
		t.Fatalf("ok=%v resp=%+v", ok, resp)
	}
}

func TestBookReadHandler(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	f.Cfg.ReadBook = func(ctx *Context, bookID int64) (map[string]any, error) {
		return map[string]any{"err": "ok", "book_id": bookID}, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/read/10", "", 0, false)
	ctx.Params = []string{"10"}
	resp, err := BookReadHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["book_id"] != int64(10) {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookReadHandlerNotWired(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/read/10", "", 0, false)
	ctx.Params = []string{"10"}
	resp, _ := BookReadHandler(f.Cfg)(ctx)
	if resp["err"] != "not_wired" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookReadHandlerBadID(t *testing.T) {
	f := newBookFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/read/x", "", 0, false)
	ctx.Params = []string{"x"}
	resp, _ := BookReadHandler(f.Cfg)(ctx)
	if resp["err"] != "params.book.invalid" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookReaderBootstrapHandler(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	f.Cfg.ReaderBootstrap = func(ctx *Context, bookID int64) (map[string]any, error) {
		return map[string]any{"err": "ok", "book_id": bookID}, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/book/10/reader-bootstrap", "", 0, false)
	ctx.Params = []string{"10"}
	resp, _ := BookReaderBootstrapHandler(f.Cfg)(ctx)
	if resp["book_id"] != int64(10) {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookReaderBootstrapHandlerNotWired(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/book/10/reader-bootstrap", "", 0, false)
	ctx.Params = []string{"10"}
	resp, _ := BookReaderBootstrapHandler(f.Cfg)(ctx)
	if resp["err"] != "not_wired" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookReaderResourceHandler(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	path := filepath.Join(t.TempDir(), "10.epub")
	if err := os.WriteFile(path, []byte("EPUB"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	f.Cfg.ReadResource = func(ctx *Context, bookID int64, name string) (string, error) {
		return path, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/read/resource/10.epub", "", 0, false)
	ctx.Params = []string{"10.epub"}
	_, _ = BookReaderResourceHandler(f.Cfg)(ctx)
	rec := pluginRecorder(ctx)
	if rec.Code != http.StatusOK || rec.Body.String() != "EPUB" {
		t.Fatalf("code=%d body=%q", rec.Code, rec.Body.String())
	}
}

func TestBookReaderResourceHandlerNotWired(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/read/resource/10.epub", "", 0, false)
	ctx.Params = []string{"10.epub"}
	_, _ = BookReaderResourceHandler(f.Cfg)(ctx)
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Fatalf("code = %d", pluginRecorder(ctx).Code)
	}
}

func TestBookReaderResourceHandlerBadName(t *testing.T) {
	f := newBookFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/read/resource/x.epub", "", 0, false)
	ctx.Params = []string{"x.epub"}
	_, _ = BookReaderResourceHandler(f.Cfg)(ctx)
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Fatalf("code = %d", pluginRecorder(ctx).Code)
	}
}

func TestBookTxtReadHandler(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	f.Cfg.ReadTxt = func(ctx *Context, bookID int64) (map[string]any, error) {
		return map[string]any{"err": "ok", "book_id": bookID}, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/read/txt?id=10", "", 0, false)
	resp, _ := BookTxtReadHandler(f.Cfg)(ctx)
	if resp["book_id"] != int64(10) {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestBookTxtReadHandlerBadID(t *testing.T) {
	f := newBookFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/read/txt?id=x", "", 0, false)
	resp, _ := BookTxtReadHandler(f.Cfg)(ctx)
	if resp["err"] != "params.book.invalid" {
		t.Fatalf("resp = %+v", resp)
	}
}

// ---- WebDAV ----

func TestWebDAVHandlerDisabled(t *testing.T) {
	f := newBookFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/books/", "", 1, false)
	_, _ = WebDAVHandler(WebDAVConfig{})(ctx)
	rec := pluginRecorder(ctx)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("code = %d", rec.Code)
	}
	if rec.Body.String() != "WebDAV service is not enabled" {
		t.Fatalf("body = %q", rec.Body.String())
	}
}

func TestWebDAVHandlerRedirectBooks(t *testing.T) {
	f := newBookFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/books", "", 1, false)
	_, _ = WebDAVHandler(WebDAVConfig{Enabled: func() bool { return true }})(ctx)
	rec := pluginRecorder(ctx)
	if rec.Code != http.StatusFound {
		t.Fatalf("code = %d", rec.Code)
	}
	if loc := rec.Header().Get("Location"); loc != "/books/" {
		t.Fatalf("Location = %q", loc)
	}
}

func TestWebDAVHandlerRedirectTrailingSlash(t *testing.T) {
	f := newBookFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/books/abc", "", 1, false)
	_, _ = WebDAVHandler(WebDAVConfig{Enabled: func() bool { return true }})(ctx)
	rec := pluginRecorder(ctx)
	if rec.Code != http.StatusFound || rec.Header().Get("Location") != "/books/abc/" {
		t.Fatalf("code=%d loc=%q", rec.Code, rec.Header().Get("Location"))
	}
}

func TestWebDAVHandlerDemoReadOnly(t *testing.T) {
	f := newBookFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodPut, "/books/x", "", 1, false)
	cfg := WebDAVConfig{
		Enabled:      func() bool { return true },
		DemoReadOnly: func(ctx *Context) bool { return true },
	}
	_, _ = WebDAVHandler(cfg)(ctx)
	rec := pluginRecorder(ctx)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("code = %d", rec.Code)
	}
}

func TestWebDAVHandlerDemoAllowsRead(t *testing.T) {
	f := newBookFixture(t)
	served := false
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/books/x/", "", 1, false)
	cfg := WebDAVConfig{
		Enabled:      func() bool { return true },
		DemoReadOnly: func(ctx *Context) bool { return true },
		Serve:        func(ctx *Context) bool { served = true; return true },
	}
	_, _ = WebDAVHandler(cfg)(ctx)
	if !served {
		t.Fatalf("只读方法应放行")
	}
}

func TestWebDAVHandlerServeError(t *testing.T) {
	f := newBookFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/books/x/", "", 1, false)
	cfg := WebDAVConfig{
		Enabled: func() bool { return true },
		Serve:   func(ctx *Context) bool { return false },
	}
	_, _ = WebDAVHandler(cfg)(ctx)
	if pluginRecorder(ctx).Code != http.StatusInternalServerError {
		t.Fatalf("code = %d", pluginRecorder(ctx).Code)
	}
}
