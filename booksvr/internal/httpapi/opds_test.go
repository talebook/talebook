package httpapi

import (
	"database/sql"
	"encoding/xml"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"talebook/booksvr/internal/library"
)

// opdsFixture 是一次 OPDS 测试的完整环境。
type opdsFixture struct {
	DB  *sql.DB
	Cfg OpdsConfig
}

// newOpdsFixture 建库并返回配置。
func newOpdsFixture(t *testing.T) *opdsFixture {
	t.Helper()
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	cfg := OpdsConfig{
		DB: db,
		Settings: map[string]any{
			"site_title":               "测试书库",
			"OPDS_ENABLED":             true,
			"opds_max_items":           30,
			"opds_max_ungrouped_items": 100,
			"opds_max_tags_shown":      5,
		},
	}
	return &opdsFixture{DB: db, Cfg: cfg}
}

// opdsSeedBook 插入一本书。
func opdsSeedBook(t *testing.T, db *sql.DB, id int64, title string, ts int64) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO books (id, title, author_sort, path, timestamp, pubdate,
		series_index, has_cover) VALUES (?, ?, 'a', 'p', ?, '', 1.0, 0)`, id, title, ts); err != nil {
		t.Fatalf("插入书失败: %v", err)
	}
}

// opdsSeedAuthor 插入作者并关联。
func opdsSeedAuthor(t *testing.T, db *sql.DB, id int64, name string, bookIDs ...int64) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO authors (id, name) VALUES (?, ?)`, id, name); err != nil {
		t.Fatalf("插入作者失败: %v", err)
	}
	for _, bid := range bookIDs {
		if _, err := db.Exec(`INSERT INTO books_authors_link (book, author) VALUES (?, ?)`, bid, id); err != nil {
			t.Fatalf("关联作者失败: %v", err)
		}
	}
}

// opdsSeedFormat 插入格式记录。
func opdsSeedFormat(t *testing.T, db *sql.DB, bookID int64, format string) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO data (book, format, uncompressed_size, name) VALUES (?, ?, 1, 'x')`,
		bookID, format); err != nil {
		t.Fatalf("插入格式失败: %v", err)
	}
}

// opdsBody 取响应体。
func opdsBody(ctx *Context) string {
	return pluginRecorder(ctx).Body.String()
}

// ---- 小工具 ----

func TestOpdsHexlifyRoundTrip(t *testing.T) {
	for _, s := range []string{"", "abc", "中文", "Onewest", "I12:authors"} {
		enc := opdsHexlify(s)
		dec, err := opdsUnhexlify(enc)
		if err != nil {
			t.Fatalf("unhexlify(%q): %v", enc, err)
		}
		if dec != s {
			t.Errorf("round trip %q → %q", s, dec)
		}
	}
	if _, err := opdsUnhexlify("zz"); err == nil {
		t.Error("非法十六进制应报错")
	}
}

func TestOpdsFirstChar(t *testing.T) {
	cases := map[string]string{
		"Alice": "A", "bob": "b", "123": "1", "": "A", "  ": "A", "中文": "A",
	}
	for in, want := range cases {
		if got := opdsFirstChar(in); got != want {
			t.Errorf("opdsFirstChar(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestOpdsUpdated(t *testing.T) {
	got := opdsUpdated(time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC))
	if got != "2026-01-02T03:04:05+00:00" {
		t.Errorf("got = %q", got)
	}
}

func TestNewOpdsOffsets(t *testing.T) {
	o, err := newOpdsOffsets(0, 10, 25)
	if err != nil {
		t.Fatalf("err = %v", err)
	}
	// last_offset = (total-1) - delta = 24 - 10 = 14。
	if o.Offset != 0 || o.NextOffset != 10 || o.PreviousOffset != 0 || o.LastOffset != 14 {
		t.Errorf("offsets = %+v", o)
	}

	// 最后一页：next 应为 -1。
	o, err = newOpdsOffsets(20, 10, 25)
	if err != nil {
		t.Fatalf("err = %v", err)
	}
	if o.NextOffset != -1 {
		t.Errorf("末页 next = %d, want -1", o.NextOffset)
	}
	if o.PreviousOffset != 10 {
		t.Errorf("previous = %d", o.PreviousOffset)
	}

	// 负 offset 归零。
	o, _ = newOpdsOffsets(-5, 10, 25)
	if o.Offset != 0 {
		t.Errorf("负 offset 应归零: %d", o.Offset)
	}

	// 越界报错。
	if _, err := newOpdsOffsets(25, 10, 25); err == nil {
		t.Error("越界 offset 应报错")
	}
}

func TestOpdsFormatTagString(t *testing.T) {
	if got := opdsFormatTagString("b, a, c", ",", 0, ", "); got != "a, b, c" {
		t.Errorf("got = %q", got)
	}
	if got := opdsFormatTagString("a, b, c", ",", 2, ", "); got != "a, b, ..." {
		t.Errorf("截断 got = %q", got)
	}
	if got := opdsFormatTagString("", ",", 5, ", "); got != "" {
		t.Errorf("空串 got = %q", got)
	}
}

func TestOpdsMediaType(t *testing.T) {
	cases := map[string]string{
		"epub": "application/epub+zip", "mobi": "application/x-mobipocket-ebook",
		"pdf": "application/pdf", "cbz": "application/x-cbz", "unknown": "",
	}
	for in, want := range cases {
		if got := opdsMediaType(in); got != want {
			t.Errorf("opdsMediaType(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestOpdsFormatSeriesIndex(t *testing.T) {
	if got := opdsFormatSeriesIndex(3.0); got != "3" {
		t.Errorf("got = %q", got)
	}
	if got := opdsFormatSeriesIndex(2.5); got != "2.5" {
		t.Errorf("got = %q", got)
	}
}

func TestOpdsURLFor(t *testing.T) {
	cfg := OpdsConfig{}
	if got := opdsURLFor(cfg, "opds", nil); got != "/opds" {
		t.Errorf("opds = %q", got)
	}
	got := opdsURLFor(cfg, "opdscategory", map[string]string{"category": "abc", "which": "def"})
	if got != "/opds/category/abc/def" {
		t.Errorf("opdscategory = %q", got)
	}
	got = opdsURLFor(cfg, "opdsnavcatalog", map[string]string{"which": "Ntags"})
	if got != "/opds/nav/Ntags" {
		t.Errorf("opdsnavcatalog = %q", got)
	}
}

func TestOpdsURLForWithPublicURL(t *testing.T) {
	cfg := OpdsConfig{PublicURL: func(p string) string { return "/prefix" + p }}
	if got := opdsBaseHref(cfg); got != "/prefix/opds" {
		t.Errorf("base = %q", got)
	}
}

// ---- 路由表 ----

func TestOpdsRouteSpecs(t *testing.T) {
	specs := OpdsRouteSpecs(OpdsConfig{})
	if len(specs) != 5 {
		t.Fatalf("len = %d, want 5", len(specs))
	}
	for _, s := range specs {
		if !strings.HasPrefix(s.Pattern, "/opds") {
			t.Errorf("意外路由 %q", s.Pattern)
		}
	}
}

// ---- 顶层 feed ----

func TestOpdsIndexFeed(t *testing.T) {
	fx := newOpdsFixture(t)
	opdsSeedBook(t, fx.DB, 1, "书一", 100)
	opdsSeedAuthor(t, fx.DB, 10, "刘慈欣", 1)

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/opds/", "", 0, false)
	if _, err := OpdsIndexHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	body := opdsBody(ctx)
	if !strings.Contains(body, "<feed") {
		t.Fatalf("应返回 feed: %s", body[:min(200, len(body))])
	}
	if !strings.Contains(body, "Newest") || !strings.Contains(body, "Title") {
		t.Error("应含 Newest / Title 导航项")
	}
	if !strings.Contains(body, "calibre-nav:") {
		t.Error("应含导航 entry id")
	}
	if ct := pluginRecorder(ctx).Header().Get("Content-Type"); ct != opdsNavContentType {
		t.Errorf("Content-Type = %q", ct)
	}
}

func TestOpdsDisabledRedirects(t *testing.T) {
	fx := newOpdsFixture(t)
	fx.Cfg.Settings["OPDS_ENABLED"] = false
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/opds/", "", 0, false)
	if _, err := OpdsIndexHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if pluginRecorder(ctx).Code != http.StatusFound {
		t.Errorf("状态码 = %d", pluginRecorder(ctx).Code)
	}
	if loc := pluginRecorder(ctx).Header().Get("Location"); !strings.Contains(loc, "opds_disabled") {
		t.Errorf("Location = %q", loc)
	}
}

// ---- 全部书籍 feed ----

func TestOpdsAllBooksTitle(t *testing.T) {
	fx := newOpdsFixture(t)
	opdsSeedBook(t, fx.DB, 1, "B书", 100)
	opdsSeedBook(t, fx.DB, 2, "A书", 200)

	which := opdsHexlify("Otitle")
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/opds/nav/"+which, "", 0, false)
	ctx.Params = []string{which}
	if _, err := OpdsNavHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	body := opdsBody(ctx)
	if !strings.Contains(body, "calibre-all:title") {
		t.Error("应含 calibre-all:title")
	}
	// 按标题升序：A书 在前。
	if strings.Index(body, "A书") > strings.Index(body, "B书") {
		t.Error("应按标题升序")
	}
	if ct := pluginRecorder(ctx).Header().Get("Content-Type"); ct != opdsContentType {
		t.Errorf("Content-Type = %q", ct)
	}
}

func TestOpdsAllBooksNewest(t *testing.T) {
	fx := newOpdsFixture(t)
	opdsSeedBook(t, fx.DB, 1, "旧书", 100)
	opdsSeedBook(t, fx.DB, 2, "新书", 200)

	which := opdsHexlify("Onewest")
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/opds/nav/"+which, "", 0, false)
	ctx.Params = []string{which}
	if _, err := OpdsNavHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	body := opdsBody(ctx)
	if strings.Index(body, "新书") > strings.Index(body, "旧书") {
		t.Error("newest 应按时间降序")
	}
}

func TestOpdsNavBadWhich(t *testing.T) {
	fx := newOpdsFixture(t)
	for _, which := range []string{"zz", opdsHexlify("Xfoo"), opdsHexlify("Ounknown")} {
		ctx := pluginCtx(t, fx.DB, http.MethodGet, "/opds/nav/"+which, "", 0, false)
		ctx.Params = []string{which}
		if _, err := OpdsNavHandler(fx.Cfg)(ctx); err != nil {
			t.Fatalf("handler: %v", err)
		}
		if pluginRecorder(ctx).Code != http.StatusNotFound {
			t.Errorf("%s 应 404，得到 %d", which, pluginRecorder(ctx).Code)
		}
	}
}

func TestOpdsNavBadOffset(t *testing.T) {
	fx := newOpdsFixture(t)
	opdsSeedBook(t, fx.DB, 1, "书一", 100)
	which := opdsHexlify("Otitle")
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/opds/nav/"+which+"?offset=abc", "", 0, false)
	ctx.Params = []string{which}
	if _, err := OpdsNavHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Errorf("非法 offset 应 404，得到 %d", pluginRecorder(ctx).Code)
	}
}

// ---- 分类导航 ----

func TestOpdsCategoryNav(t *testing.T) {
	fx := newOpdsFixture(t)
	opdsSeedBook(t, fx.DB, 1, "书一", 100)
	opdsSeedAuthor(t, fx.DB, 10, "刘慈欣", 1)

	which := opdsHexlify("Nauthors")
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/opds/nav/"+which, "", 0, false)
	ctx.Params = []string{which}
	if _, err := OpdsNavHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	body := opdsBody(ctx)
	if !strings.Contains(body, "calibre:category:刘慈欣") {
		t.Errorf("应含分类 entry: %s", body)
	}
	if !strings.Contains(body, "1 book") {
		t.Error("应含书籍计数")
	}
}

func TestOpdsCategoryNavUnknown(t *testing.T) {
	fx := newOpdsFixture(t)
	which := opdsHexlify("Nunknown")
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/opds/nav/"+which, "", 0, false)
	ctx.Params = []string{which}
	if _, err := OpdsNavHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Errorf("未知分类应 404，得到 %d", pluginRecorder(ctx).Code)
	}
}

func TestOpdsCategoryNavGrouped(t *testing.T) {
	fx := newOpdsFixture(t)
	// 超过 opds_max_ungrouped_items 时按首字母分组。
	fx.Cfg.Settings["opds_max_ungrouped_items"] = 2
	for i := 0; i < 5; i++ {
		opdsSeedBook(t, fx.DB, int64(i+1), "书", 100)
		opdsSeedAuthor(t, fx.DB, int64(10+i), string(rune('A'+i))+"作者", int64(i+1))
	}

	which := opdsHexlify("Nauthors")
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/opds/nav/"+which, "", 0, false)
	ctx.Params = []string{which}
	if _, err := OpdsNavHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	body := opdsBody(ctx)
	if !strings.Contains(body, "calibre:category-group:authors:") {
		t.Errorf("应返回分组 feed: %s", body)
	}
	if !strings.Contains(body, "items") {
		t.Error("应含 items 计数")
	}
}

// ---- 分类分组 ----

func TestOpdsCategoryGroup(t *testing.T) {
	fx := newOpdsFixture(t)
	opdsSeedBook(t, fx.DB, 1, "书一", 100)
	opdsSeedAuthor(t, fx.DB, 10, "Alice", 1)
	opdsSeedAuthor(t, fx.DB, 11, "Bob", 1)

	catHex := opdsHexlify("authors")
	whichHex := opdsHexlify("A")
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/opds/categorygroup/"+catHex+"/"+whichHex, "", 0, false)
	ctx.Params = []string{catHex, whichHex}
	if _, err := OpdsCategoryGroupHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	body := opdsBody(ctx)
	if !strings.Contains(body, "Alice") {
		t.Errorf("应含 Alice: %s", body)
	}
	if strings.Contains(body, "Bob") {
		t.Error("不应含 Bob（首字母不同）")
	}
}

func TestOpdsCategoryGroupNoItems(t *testing.T) {
	fx := newOpdsFixture(t)
	opdsSeedBook(t, fx.DB, 1, "书一", 100)
	opdsSeedAuthor(t, fx.DB, 10, "Alice", 1)

	catHex := opdsHexlify("authors")
	whichHex := opdsHexlify("Z")
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/opds/categorygroup/"+catHex+"/"+whichHex, "", 0, false)
	ctx.Params = []string{catHex, whichHex}
	if _, err := OpdsCategoryGroupHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Errorf("空分组应 404，得到 %d", pluginRecorder(ctx).Code)
	}
}

// ---- 分类下的书籍 ----

func TestOpdsCategoryBooks(t *testing.T) {
	fx := newOpdsFixture(t)
	opdsSeedBook(t, fx.DB, 1, "书一", 100)
	opdsSeedAuthor(t, fx.DB, 10, "刘慈欣", 1)
	opdsSeedFormat(t, fx.DB, 1, "EPUB")

	catHex := opdsHexlify("authors")
	whichHex := opdsHexlify("I10:authors")
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/opds/category/"+catHex+"/"+whichHex, "", 0, false)
	ctx.Params = []string{catHex, whichHex}
	if _, err := OpdsCategoryHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	body := opdsBody(ctx)
	if !strings.Contains(body, "书一") {
		t.Errorf("应含书籍: %s", body)
	}
	if !strings.Contains(body, "application/epub+zip") {
		t.Error("应含 EPUB 获取链接")
	}
	if !strings.Contains(body, "http://opds-spec.org/acquisition") {
		t.Error("应含 acquisition rel")
	}
	if !strings.Contains(body, "http://opds-spec.org/cover") {
		t.Error("应含 cover rel")
	}
	if !strings.Contains(body, "http://opds-spec.org/thumbnail") {
		t.Error("应含 thumbnail rel")
	}
}

func TestOpdsCategoryNonID(t *testing.T) {
	fx := newOpdsFixture(t)
	catHex := opdsHexlify("authors")
	whichHex := opdsHexlify("N刘慈欣")
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/opds/category/"+catHex+"/"+whichHex, "", 0, false)
	ctx.Params = []string{catHex, whichHex}
	if _, err := OpdsCategoryHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Errorf("非 I 前缀应 404，得到 %d", pluginRecorder(ctx).Code)
	}
}

func TestOpdsCategorySearch(t *testing.T) {
	fx := newOpdsFixture(t)
	opdsSeedBook(t, fx.DB, 1, "书一", 100)
	fx.Cfg.Search = func(query string) ([]int64, error) {
		return []int64{1}, nil
	}

	catHex := opdsHexlify("search")
	whichHex := opdsHexlify("I1:search")
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/opds/category/"+catHex+"/"+whichHex, "", 0, false)
	ctx.Params = []string{catHex, whichHex}
	if _, err := OpdsCategoryHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	body := opdsBody(ctx)
	if !strings.Contains(body, "calibre-search:") {
		t.Errorf("应含搜索 feed id: %s", body)
	}
}

// ---- 搜索 ----

func TestOpdsSearch(t *testing.T) {
	fx := newOpdsFixture(t)
	opdsSeedBook(t, fx.DB, 1, "书一", 100)
	fx.Cfg.Search = func(query string) ([]int64, error) {
		if query != "书" {
			t.Errorf("query = %q", query)
		}
		return []int64{1}, nil
	}

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/opds/search/书", "", 0, false)
	ctx.Params = []string{"书"}
	if _, err := OpdsSearchHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	body := opdsBody(ctx)
	if !strings.Contains(body, "calibre-search:书") {
		t.Errorf("应含搜索 id: %s", body)
	}
}

func TestOpdsSearchNoResults(t *testing.T) {
	fx := newOpdsFixture(t)
	fx.Cfg.Search = func(string) ([]int64, error) { return []int64{}, nil }
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/opds/search/无", "", 0, false)
	ctx.Params = []string{"无"}
	if _, err := OpdsSearchHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Errorf("无结果应 404，得到 %d", pluginRecorder(ctx).Code)
	}
}

func TestOpdsSearchError(t *testing.T) {
	fx := newOpdsFixture(t)
	fx.Cfg.Search = func(string) ([]int64, error) { return nil, bsErrString("bad query") }
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/opds/search/bad", "", 0, false)
	ctx.Params = []string{"bad"}
	if _, err := OpdsSearchHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Errorf("搜索失败应 404，得到 %d", pluginRecorder(ctx).Code)
	}
}

// ---- 可见性过滤 ----

func TestOpdsVisibilityFilter(t *testing.T) {
	fx := newOpdsFixture(t)
	opdsSeedBook(t, fx.DB, 1, "公开", 100)
	opdsSeedBook(t, fx.DB, 2, "私有", 200)
	fx.Cfg.CanViewBook = func(_ *Context, id int64) bool { return id != 2 }

	which := opdsHexlify("Otitle")
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/opds/nav/"+which, "", 0, false)
	ctx.Params = []string{which}
	if _, err := OpdsNavHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	body := opdsBody(ctx)
	if strings.Contains(body, "私有") {
		t.Error("私有书应被过滤")
	}
	if !strings.Contains(body, "公开") {
		t.Error("公开书应保留")
	}
}

// ---- 分页 ----

func TestOpdsPagination(t *testing.T) {
	fx := newOpdsFixture(t)
	fx.Cfg.Settings["opds_max_items"] = 2
	for i := 0; i < 5; i++ {
		opdsSeedBook(t, fx.DB, int64(i+1), string(rune('A'+i))+"书", int64(100+i))
	}

	which := opdsHexlify("Otitle")
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/opds/nav/"+which, "", 0, false)
	ctx.Params = []string{which}
	if _, err := OpdsNavHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	body := opdsBody(ctx)
	if !strings.Contains(body, `rel="next"`) {
		t.Error("首页应有 next 链接")
	}
	if strings.Contains(body, `rel="previous"`) {
		t.Error("首页不应有 previous 链接")
	}
	if !strings.Contains(body, `rel="last"`) {
		t.Error("应有 last 链接")
	}
}

func TestOpdsPaginationLastPage(t *testing.T) {
	fx := newOpdsFixture(t)
	fx.Cfg.Settings["opds_max_items"] = 2
	for i := 0; i < 5; i++ {
		opdsSeedBook(t, fx.DB, int64(i+1), string(rune('A'+i))+"书", int64(100+i))
	}

	which := opdsHexlify("Otitle")
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/opds/nav/"+which+"?offset=4", "", 0, false)
	ctx.Params = []string{which}
	if _, err := OpdsNavHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	body := opdsBody(ctx)
	if strings.Contains(body, `rel="next"`) {
		t.Error("末页不应有 next 链接")
	}
	if !strings.Contains(body, `rel="previous"`) {
		t.Error("末页应有 previous 链接")
	}
}

func TestOpdsOffsetOutOfRange(t *testing.T) {
	fx := newOpdsFixture(t)
	opdsSeedBook(t, fx.DB, 1, "书一", 100)
	which := opdsHexlify("Otitle")
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/opds/nav/"+which+"?offset=99", "", 0, false)
	ctx.Params = []string{which}
	if _, err := OpdsNavHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Errorf("越界 offset 应 404，得到 %d", pluginRecorder(ctx).Code)
	}
}

// ---- 序列化正确性 ----

func TestOpdsFeedIsValidXML(t *testing.T) {
	fx := newOpdsFixture(t)
	opdsSeedBook(t, fx.DB, 1, "书<一>&\"二\"", 100)
	opdsSeedAuthor(t, fx.DB, 10, "作者<A>", 1)

	which := opdsHexlify("Otitle")
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/opds/nav/"+which, "", 0, false)
	ctx.Params = []string{which}
	if _, err := OpdsNavHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	body := opdsBody(ctx)
	// 去掉 XML 声明后应能解析。
	raw := body[strings.Index(body, "<feed"):]
	var feed atomFeedXML
	if err := xml.Unmarshal([]byte(raw), &feed); err != nil {
		t.Fatalf("feed 不是合法 XML: %v\n%s", err, raw[:min(400, len(raw))])
	}
	if feed.Xmlns != "http://www.w3.org/2005/Atom" {
		t.Errorf("xmlns = %q", feed.Xmlns)
	}
	if len(feed.Entries) != 1 {
		t.Fatalf("entry 数 = %d", len(feed.Entries))
	}
	// 特殊字符应被正确转义并还原。
	if feed.Entries[0].Title != "书<一>&\"二\"" {
		t.Errorf("title = %q", feed.Entries[0].Title)
	}
}

func TestOpdsAcquisitionEntryRating(t *testing.T) {
	cfg := OpdsConfig{Settings: map[string]any{"site_title": "x"}}
	b := library.BookData{
		ID: 1, Title: "书", Authors: []string{"作者"}, Rating: 8,
		Tags: []string{"科幻", "历史"}, Series: "三体", SeriesIdx: 2.0,
		Comments: "简介", Formats: []string{"EPUB"},
	}
	entry := opdsAcquisitionEntry(cfg, b, time.Now(), "")
	if entry.Content == nil {
		t.Fatal("应有 content")
	}
	inner := entry.Content.Inner
	if !strings.Contains(inner, "\u2605\u2605\u2605\u2605") {
		t.Errorf("评分星数不对: %s", inner)
	}
	if !strings.Contains(inner, "TAGS:") || !strings.Contains(inner, "SERIES: 三体 [2]") {
		t.Errorf("标签/丛书缺失: %s", inner)
	}
	if len(entry.Links) != 3 {
		t.Errorf("链接数 = %d, want 3（获取+封面+缩略图）", len(entry.Links))
	}
}

func TestOpdsAcquisitionEntryUnknown(t *testing.T) {
	cfg := OpdsConfig{Settings: map[string]any{"site_title": "x"}}
	entry := opdsAcquisitionEntry(cfg, library.BookData{ID: 1}, time.Now(), "")
	if entry.Title != "Unknown" {
		t.Errorf("title = %q", entry.Title)
	}
	if len(entry.Authors) != 1 || entry.Authors[0].Name != "Unknown" {
		t.Errorf("authors = %v", entry.Authors)
	}
	if entry.Content != nil {
		t.Error("无额外信息时不应有 content")
	}
}

func TestOpdsAcquisitionEntryAuthorPipe(t *testing.T) {
	cfg := OpdsConfig{Settings: map[string]any{"site_title": "x"}}
	entry := opdsAcquisitionEntry(cfg, library.BookData{
		ID: 1, Title: "书", Authors: []string{"A|B", "C"},
	}, time.Now(), "")
	if entry.Authors[0].Name != "A,B & C" {
		t.Errorf("authors = %q", entry.Authors[0].Name)
	}
}

// ---- 配置读取 ----

// TestOpdsMediaTypeAll 覆盖全部媒体类型分支。
func TestOpdsMediaTypeAll(t *testing.T) {
	for _, ext := range []string{"epub", "mobi", "azw3", "pdf", "txt", "html", "htmlz",
		"rtf", "fb2", "djvu", "cbz", "cbr", "zip"} {
		if opdsMediaType(ext) == "" {
			t.Errorf("%q 应有媒体类型", ext)
		}
	}
}

// TestOpdsLastModifiedFormats 覆盖两种时间格式与非法值。
func TestOpdsLastModifiedFormats(t *testing.T) {
	fx := newOpdsFixture(t)
	if _, err := fx.DB.Exec(`CREATE TABLE IF NOT EXISTS books (id INTEGER PRIMARY KEY, title TEXT,
		path TEXT, has_cover INTEGER, timestamp INTEGER, last_modified TEXT)`); err != nil {
		t.Fatalf("建表失败: %v", err)
	}
	if _, err := fx.DB.Exec(`INSERT INTO books (id, title, last_modified) VALUES (1, 'x', '2026-03-04 05:06:07')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	got := opdsLastModified(fx.Cfg)
	if got.Year() != 2026 || got.Month() != 3 || got.Day() != 4 {
		t.Errorf("got = %v", got)
	}
}

// TestOpdsSortBooksSeries 覆盖按丛书排序。
func TestOpdsSortBooksSeries(t *testing.T) {
	books := []library.BookData{
		{ID: 1, Series: "B", SeriesIdx: 1},
		{ID: 2, Series: "A", SeriesIdx: 2},
		{ID: 3, Series: "A", SeriesIdx: 1},
	}
	opdsSortBooks(books, "series", true)
	if books[0].ID != 3 || books[1].ID != 2 || books[2].ID != 1 {
		t.Errorf("排序结果 = %v", []int64{books[0].ID, books[1].ID, books[2].ID})
	}
}

// TestOpdsSortBooksDescending 覆盖降序。
func TestOpdsSortBooksDescending(t *testing.T) {
	books := []library.BookData{{ID: 1, Title: "A"}, {ID: 2, Title: "B"}}
	opdsSortBooks(books, "title", false)
	if books[0].ID != 2 {
		t.Errorf("降序首项 = %d", books[0].ID)
	}
}

// TestOpdsSearchIDsDefault 覆盖未注入 Search 时走内置实现。
func TestOpdsSearchIDsDefault(t *testing.T) {
	fx := newOpdsFixture(t)
	opdsSeedBook(t, fx.DB, 1, "剑来", 100)
	ids, err := opdsSearchIDs(fx.Cfg, "剑来")
	if err != nil {
		t.Fatalf("err = %v", err)
	}
	if len(ids) != 1 || ids[0] != 1 {
		t.Errorf("ids = %v", ids)
	}
}

// TestOpdsLoadBooksEmpty 覆盖空 id 列表。
func TestOpdsLoadBooksEmpty(t *testing.T) {
	fx := newOpdsFixture(t)
	books, err := opdsLoadBooks(fx.Cfg, nil)
	if err != nil || len(books) != 0 {
		t.Errorf("books = %v, err = %v", books, err)
	}
}

// TestOpdsConfigReadersZero 覆盖配置为 0 时回退默认值。
func TestOpdsConfigReadersZero(t *testing.T) {
	cfg := OpdsConfig{Settings: map[string]any{
		"opds_max_items": 0, "opds_max_ungrouped_items": 0, "opds_max_tags_shown": 0,
	}}
	if opdsMaxItems(cfg) != 30 || opdsMaxUngroupedItems(cfg) != 100 || opdsMaxTagsShown(cfg) != 5 {
		t.Error("0 应回退默认值")
	}
}

// TestOpdsPrefixFromPublicURL 覆盖从 PublicURL 推导前缀。
func TestOpdsPrefixFromPublicURL(t *testing.T) {
	cfg := OpdsConfig{Settings: map[string]any{}, PublicURL: func(string) string { return "/p" }}
	if got := opdsPrefix(cfg); got != "/p" {
		t.Errorf("prefix = %q", got)
	}
}

// TestOpdsCategoryMissingParams 覆盖缺参数的分类路由。
func TestOpdsCategoryMissingParams(t *testing.T) {
	fx := newOpdsFixture(t)
	for _, params := range [][]string{{"", ""}, {"abc", ""}, {"", "abc"}} {
		ctx := pluginCtx(t, fx.DB, http.MethodGet, "/opds/category/x/y", "", 0, false)
		ctx.Params = params
		if _, err := OpdsCategoryHandler(fx.Cfg)(ctx); err != nil {
			t.Fatalf("handler: %v", err)
		}
		if pluginRecorder(ctx).Code != http.StatusNotFound {
			t.Errorf("params=%v 应 404，得到 %d", params, pluginRecorder(ctx).Code)
		}
	}
}

// TestOpdsCategoryGroupMissingParams 覆盖缺参数的分组路由。
func TestOpdsCategoryGroupMissingParams(t *testing.T) {
	fx := newOpdsFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/opds/categorygroup/x/y", "", 0, false)
	ctx.Params = []string{"", ""}
	if _, err := OpdsCategoryGroupHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Errorf("应 404，得到 %d", pluginRecorder(ctx).Code)
	}
}

// TestOpdsSearchEmptyQuery 覆盖空查询词。
func TestOpdsSearchEmptyQuery(t *testing.T) {
	fx := newOpdsFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/opds/search/", "", 0, false)
	ctx.Params = []string{""}
	if _, err := OpdsSearchHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Errorf("空查询应 404，得到 %d", pluginRecorder(ctx).Code)
	}
}

// TestOpdsCatalogEntryCounts 覆盖单复数与 add_kind。
func TestOpdsCatalogEntryCounts(t *testing.T) {
	now := time.Now()
	single := opdsCatalogEntry(library.Category{ID: 1, Name: "A", Count: 1}, "authors", "/b", now, false, false)
	if single.Content.Inner != "1 book" {
		t.Errorf("单数 = %q", single.Content.Inner)
	}
	multi := opdsCatalogEntry(library.Category{ID: 1, Name: "A", Count: 3}, "authors", "/b", now, false, true)
	if multi.Content.Inner != "3 books" {
		t.Errorf("复数 = %q", multi.Content.Inner)
	}
	if multi.Title != "A (authors)" {
		t.Errorf("add_kind title = %q", multi.Title)
	}
	ignored := opdsCatalogEntry(library.Category{ID: 1, Name: "A", Count: 3}, "authors", "/b", now, true, false)
	if ignored.Content.Inner != "" {
		t.Errorf("ignore_count = %q", ignored.Content.Inner)
	}
	// 无 id 时用 N 前缀。
	noID := opdsCatalogEntry(library.Category{Name: "A", Count: 1}, "authors", "/b", now, false, false)
	if !strings.Contains(noID.Links[0].Href, opdsHexlify("NA")) {
		t.Errorf("无 id 链接 = %q", noID.Links[0].Href)
	}
}

func TestOpdsConfigReaders(t *testing.T) {
	cfg := OpdsConfig{Settings: map[string]any{
		"opds_max_items":           50,
		"opds_max_ungrouped_items": 200,
		"opds_max_tags_shown":      10,
		"opds_url_prefix":          "/prefix",
	}}
	if opdsMaxItems(cfg) != 50 || opdsMaxUngroupedItems(cfg) != 200 || opdsMaxTagsShown(cfg) != 10 {
		t.Error("配置读取不正确")
	}
	if opdsPrefix(cfg) != "/prefix" {
		t.Errorf("prefix = %q", opdsPrefix(cfg))
	}

	// 缺省值。
	empty := OpdsConfig{Settings: map[string]any{}}
	if opdsMaxItems(empty) != 30 || opdsMaxUngroupedItems(empty) != 100 || opdsMaxTagsShown(empty) != 5 {
		t.Error("缺省值不正确")
	}
	if opdsPrefix(empty) != "" {
		t.Errorf("空 prefix = %q", opdsPrefix(empty))
	}
}

func TestOpdsLastModified(t *testing.T) {
	fx := newOpdsFixture(t)
	got := opdsLastModified(fx.Cfg)
	if got.IsZero() {
		t.Error("应返回时间")
	}
}

// ---- 静态主题目录 ----

func TestStaticThemesRouteSpec(t *testing.T) {
	specs := FilesRouteSpecs(FilesConfig{})
	found := false
	for _, s := range specs {
		if s.Pattern == rStaticThemes {
			found = true
		}
	}
	if !found {
		t.Error("应注册 /static/themes/(.*)")
	}
}

func TestStaticThemesHandler(t *testing.T) {
	dir := t.TempDir()
	themeDir := filepath.Join(dir, "static", "themes")
	if err := os.MkdirAll(themeDir, 0o755); err != nil {
		t.Fatalf("建目录失败: %v", err)
	}
	if err := os.WriteFile(filepath.Join(themeDir, "a.css"), []byte("body{}"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}

	cfg := FilesConfig{HTMLPath: dir}
	ctx := pluginCtx(t, nil, http.MethodGet, "/static/themes/a.css", "", 0, false)
	ctx.Params = []string{"a.css"}
	if _, err := StaticThemesHandler(cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if body := pluginRecorder(ctx).Body.String(); body != "body{}" {
		t.Errorf("body = %q", body)
	}
	if ct := pluginRecorder(ctx).Header().Get("Content-Type"); !strings.HasPrefix(ct, "text/css") {
		t.Errorf("Content-Type = %q", ct)
	}
}

func TestStaticThemesTraversalBlocked(t *testing.T) {
	dir := t.TempDir()
	cfg := FilesConfig{HTMLPath: dir}
	ctx := pluginCtx(t, nil, http.MethodGet, "/static/themes/../../etc/passwd", "", 0, false)
	ctx.Params = []string{"../../etc/passwd"}
	if _, err := StaticThemesHandler(cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Errorf("越界路径应 404，得到 %d", pluginRecorder(ctx).Code)
	}
}
