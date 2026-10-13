package httpapi

import (
	"database/sql"
	"net/http"
	"testing"

	"talebook/booksvr/internal/userdb"
)

// metaFixture 是一次元数据分类测试的完整环境。
type metaFixture struct {
	DB  *sql.DB
	Cfg MetaConfig
}

// newMetaFixture 建库（Talebook 自有表 + Calibre 表）并返回配置。
func newMetaFixture(t *testing.T) *metaFixture {
	t.Helper()
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS book_formats (
		id INTEGER PRIMARY KEY, book_id INTEGER, format TEXT, uncompressed_size INTEGER, name TEXT)`); err != nil {
		t.Fatalf("建 book_formats 失败: %v", err)
	}
	cfg := MetaConfig{
		DB:       db,
		Settings: map[string]any{"DEFAULT_PAGE_SIZE": 60},
	}
	return &metaFixture{DB: db, Cfg: cfg}
}

// metaSeedBook 插入一本书。
func metaSeedBook(t *testing.T, db *sql.DB, id int64, title string) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO books (id, title, author_sort, path, timestamp, pubdate,
		series_index, has_cover) VALUES (?, ?, 'a', 'p', 0, '', 1.0, 0)`, id, title); err != nil {
		t.Fatalf("插入书失败: %v", err)
	}
}

// metaSeedAuthor 插入作者并关联书籍。
func metaSeedAuthor(t *testing.T, db *sql.DB, authorID int64, name string, bookIDs ...int64) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO authors (id, name) VALUES (?, ?)`, authorID, name); err != nil {
		t.Fatalf("插入作者失败: %v", err)
	}
	for _, bid := range bookIDs {
		if _, err := db.Exec(`INSERT INTO books_authors_link (book, author) VALUES (?, ?)`, bid, authorID); err != nil {
			t.Fatalf("关联作者失败: %v", err)
		}
	}
}

// metaSeedTag 插入标签并关联书籍。
func metaSeedTag(t *testing.T, db *sql.DB, tagID int64, name string, bookIDs ...int64) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO tags (id, name) VALUES (?, ?)`, tagID, name); err != nil {
		t.Fatalf("插入标签失败: %v", err)
	}
	for _, bid := range bookIDs {
		if _, err := db.Exec(`INSERT INTO books_tags_link (book, tag) VALUES (?, ?)`, bid, tagID); err != nil {
			t.Fatalf("关联标签失败: %v", err)
		}
	}
}

// metaSeedPublisher 插入出版社并关联书籍。
func metaSeedPublisher(t *testing.T, db *sql.DB, publisherID int64, name string, bookIDs ...int64) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO publishers (id, name) VALUES (?, ?)`, publisherID, name); err != nil {
		t.Fatalf("插入出版社失败: %v", err)
	}
	for _, bid := range bookIDs {
		if _, err := db.Exec(`INSERT INTO books_publishers_link (book, publisher) VALUES (?, ?)`, bid, publisherID); err != nil {
			t.Fatalf("关联出版社失败: %v", err)
		}
	}
}

// metaSeedFormat 插入一条 data 记录（格式）。
func metaSeedFormat(t *testing.T, db *sql.DB, bookID int64, format string) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO data (book, format, uncompressed_size, name) VALUES (?, ?, 1, 'x')`,
		bookID, format); err != nil {
		t.Fatalf("插入格式失败: %v", err)
	}
}

// ---- MetaList ----

func TestMetaListRouteSpecs(t *testing.T) {
	specs := MetaRouteSpecs(MetaConfig{})
	if len(specs) != 5 {
		t.Fatalf("len = %d, want 5", len(specs))
	}
}

func TestMetaListTags(t *testing.T) {
	fx := newMetaFixture(t)
	metaSeedBook(t, fx.DB, 1, "书一")
	metaSeedBook(t, fx.DB, 2, "书二")
	metaSeedTag(t, fx.DB, 10, "科幻", 1, 2)
	metaSeedTag(t, fx.DB, 11, "历史", 1)

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/tag", "", 0, false)
	ctx.Params = []string{"tag"}
	got, err := MetaListHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	items, _ := got["items"].([]map[string]any)
	if len(items) != 2 {
		t.Fatalf("标签数 = %d", len(items))
	}
	// 计数降序：科幻(2) 在前。
	if items[0]["name"] != "科幻" || int64Of(items[0]["count"]) != 2 {
		t.Errorf("首项 = %v", items[0])
	}
	if got["total"] != 2 || got["unfiltered_total"] != 2 {
		t.Errorf("total = %v, unfiltered = %v", got["total"], got["unfiltered_total"])
	}
}

// TestMetaListPublisher 回归：/api/publisher 曾经恒返回 0 项。
//
// 根因是列表页误用了详情页的字段名映射（publisher 不加 s），
// 导致 GetCategories 拿到未知分类名而返回空集。
func TestMetaListPublisher(t *testing.T) {
	fx := newMetaFixture(t)
	metaSeedBook(t, fx.DB, 1, "书一")
	metaSeedBook(t, fx.DB, 2, "书二")
	metaSeedPublisher(t, fx.DB, 1, "人民文学出版社", 1, 2)
	metaSeedPublisher(t, fx.DB, 2, "三联书店", 1)

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/publisher", "", 0, false)
	ctx.Params = []string{"publisher"}
	got, err := MetaListHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	items, _ := got["items"].([]map[string]any)
	if len(items) != 2 {
		t.Fatalf("出版社数 = %d, want 2", len(items))
	}
	// 计数降序：人民文学出版社(2) 在前。
	if items[0]["name"] != "人民文学出版社" || int64Of(items[0]["count"]) != 2 {
		t.Errorf("首项 = %v", items[0])
	}
	if got["total"] != 2 || got["unfiltered_total"] != 2 {
		t.Errorf("total = %v, unfiltered = %v", got["total"], got["unfiltered_total"])
	}
}

// TestMetaBooksPublisher 回归：/api/publisher/<name> 钻取曾经恒返回 0 本。
func TestMetaBooksPublisher(t *testing.T) {
	fx := newMetaFixture(t)
	metaSeedBook(t, fx.DB, 1, "书一")
	metaSeedPublisher(t, fx.DB, 1, "人民文学出版社", 1)

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/publisher/人民文学出版社", "", 0, false)
	ctx.Params = []string{"publisher", "人民文学出版社"}
	got, err := MetaBooksHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	if got["total"] != 1 {
		t.Fatalf("total = %v, want 1", got["total"])
	}
	books, _ := got["books"].([]map[string]any)
	if len(books) != 1 || books[0]["title"] != "书一" {
		t.Errorf("books = %v", books)
	}
}

// TestMetaBooksReturnsCoverFields 回归：钻取页的书籍必须带 img/thumb/href。
//
// 前端 BookCards 用 book.img 渲染封面；曾经用精简字典导致钻取页无封面图。
func TestMetaBooksReturnsCoverFields(t *testing.T) {
	fx := newMetaFixture(t)
	metaSeedBook(t, fx.DB, 1, "书一")
	metaSeedPublisher(t, fx.DB, 1, "人民文学出版社", 1)
	// 接线完整 BookFormatter（生产路径由 serve.go 注入）。
	fx.Cfg.Book = BookConfig{DB: fx.DB, LibraryDB: fx.DB, CDNURL: "https://cdn.example.com"}

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/publisher/人民文学出版社", "", 0, false)
	ctx.Params = []string{"publisher", "人民文学出版社"}
	got, err := MetaBooksHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	books, _ := got["books"].([]map[string]any)
	if len(books) != 1 {
		t.Fatalf("books = %v", books)
	}
	for _, key := range []string{"img", "thumb", "href"} {
		if stringOf(books[0][key]) == "" {
			t.Errorf("书籍缺少 %s 字段: %v", key, books[0])
		}
	}
	if got := stringOf(books[0]["href"]); got != "/book/1" {
		t.Errorf("href = %q, want /book/1", got)
	}
}

// TestMetaListRating 回归：rating 同样需要查 ratings 表。
func TestMetaListRating(t *testing.T) {
	fx := newMetaFixture(t)
	metaSeedBook(t, fx.DB, 1, "书一")
	if _, err := fx.DB.Exec(`INSERT INTO ratings (id, rating) VALUES (1, 8)`); err != nil {
		t.Fatalf("插入评分失败: %v", err)
	}
	if _, err := fx.DB.Exec(`INSERT INTO books_ratings_link (book, rating) VALUES (1, 1)`); err != nil {
		t.Fatalf("关联评分失败: %v", err)
	}

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/rating", "", 0, false)
	ctx.Params = []string{"rating"}
	got, err := MetaListHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	items, _ := got["items"].([]map[string]any)
	if len(items) != 1 {
		t.Fatalf("评分数 = %d, want 1", len(items))
	}
	if items[0]["name"] != "8" || int64Of(items[0]["count"]) != 1 {
		t.Errorf("首项 = %v", items[0])
	}
}

func TestMetaListFormat(t *testing.T) {
	fx := newMetaFixture(t)
	metaSeedBook(t, fx.DB, 1, "书一")
	metaSeedBook(t, fx.DB, 2, "书二")
	metaSeedFormat(t, fx.DB, 1, "EPUB")
	metaSeedFormat(t, fx.DB, 2, "EPUB")
	metaSeedFormat(t, fx.DB, 2, "MOBI")

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/format", "", 0, false)
	ctx.Params = []string{"format"}
	got, err := MetaListHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	items, _ := got["items"].([]map[string]any)
	if len(items) != 2 {
		t.Fatalf("格式数 = %d", len(items))
	}
	if items[0]["name"] != "EPUB" || int64Of(items[0]["count"]) != 2 {
		t.Errorf("首项 = %v", items[0])
	}
}

func TestMetaListQueryFilter(t *testing.T) {
	fx := newMetaFixture(t)
	metaSeedBook(t, fx.DB, 1, "书一")
	metaSeedTag(t, fx.DB, 10, "科幻", 1)
	metaSeedTag(t, fx.DB, 11, "历史", 1)

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/tag?q=科", "", 0, false)
	ctx.Params = []string{"tag"}
	got, err := MetaListHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	items, _ := got["items"].([]map[string]any)
	if len(items) != 1 || items[0]["name"] != "科幻" {
		t.Errorf("过滤结果 = %v", items)
	}
	if got["total"] != 1 || got["unfiltered_total"] != 2 {
		t.Errorf("total = %v, unfiltered = %v", got["total"], got["unfiltered_total"])
	}
}

func TestMetaListPagination(t *testing.T) {
	fx := newMetaFixture(t)
	metaSeedBook(t, fx.DB, 1, "书一")
	for i := 0; i < 5; i++ {
		metaSeedTag(t, fx.DB, int64(10+i), string(rune('a'+i)), 1)
	}

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/tag?page=2&page_size=2", "", 0, false)
	ctx.Params = []string{"tag"}
	got, err := MetaListHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	items, _ := got["items"].([]map[string]any)
	if len(items) != 2 {
		t.Fatalf("第 2 页条数 = %d", len(items))
	}
	if got["pages"] != 3 || got["paginated"] != true {
		t.Errorf("pages = %v, paginated = %v", got["pages"], got["paginated"])
	}
}

func TestMetaListBadPagination(t *testing.T) {
	fx := newMetaFixture(t)
	for _, target := range []string{"/api/tag?page=0", "/api/tag?page_size=0", "/api/tag?page_size=1001", "/api/tag?page=abc"} {
		ctx := pluginCtx(t, fx.DB, http.MethodGet, target, "", 0, false)
		ctx.Params = []string{"tag"}
		got, err := MetaListHandler(fx.Cfg)(ctx)
		if err != nil {
			t.Fatalf("handler: %v", err)
		}
		if got["err"] != "params.pagination.invalid" {
			t.Errorf("%s → err = %v", target, got["err"])
		}
	}
}

func TestMetaListAuthorGrouping(t *testing.T) {
	fx := newMetaFixture(t)
	metaSeedBook(t, fx.DB, 1, "书一")
	metaSeedBook(t, fx.DB, 2, "书二")
	metaSeedAuthor(t, fx.DB, 10, "刘慈欣", 1)
	metaSeedAuthor(t, fx.DB, 11, "刘慈欣 ", 2) // 归一化后同名

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/author", "", 0, false)
	ctx.Params = []string{"author"}
	got, err := MetaListHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	items, _ := got["items"].([]map[string]any)
	if len(items) != 1 {
		t.Fatalf("作者组数 = %d: %v", len(items), items)
	}
	// 合并后计数应为去重书籍数 2。
	if int64Of(items[0]["count"]) != 2 {
		t.Errorf("count = %v", items[0]["count"])
	}
}

func TestMetaListUnknownMeta(t *testing.T) {
	fx := newMetaFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/unknown", "", 0, false)
	ctx.Params = []string{"unknown"}
	got, err := MetaListHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["title"] != "未知" {
		t.Errorf("title = %v", got["title"])
	}
}

// ---- MetaBooks ----

func TestMetaBooksTag(t *testing.T) {
	fx := newMetaFixture(t)
	metaSeedBook(t, fx.DB, 1, "书一")
	metaSeedBook(t, fx.DB, 2, "书二")
	metaSeedTag(t, fx.DB, 10, "科幻", 1, 2)

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/tag/科幻", "", 0, false)
	ctx.Params = []string{"tag", "科幻"}
	got, err := MetaBooksHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	books, _ := got["books"].([]map[string]any)
	if len(books) != 2 {
		t.Fatalf("书籍数 = %d", len(books))
	}
	if got["title"] != `含有"科幻"标签的书籍` {
		t.Errorf("title = %v", got["title"])
	}
}

func TestMetaBooksFormat(t *testing.T) {
	fx := newMetaFixture(t)
	metaSeedBook(t, fx.DB, 1, "书一")
	metaSeedFormat(t, fx.DB, 1, "EPUB")

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/format/EPUB", "", 0, false)
	ctx.Params = []string{"format", "EPUB"}
	got, err := MetaBooksHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	books, _ := got["books"].([]map[string]any)
	if len(books) != 1 {
		t.Fatalf("书籍数 = %d", len(books))
	}
}

func TestMetaBooksAuthor(t *testing.T) {
	fx := newMetaFixture(t)
	metaSeedBook(t, fx.DB, 1, "书一")
	metaSeedAuthor(t, fx.DB, 10, "刘慈欣", 1)

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/author/刘慈欣", "", 0, false)
	ctx.Params = []string{"author", "刘慈欣"}
	got, err := MetaBooksHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["canonical_author"] != "刘慈欣" {
		t.Errorf("canonical_author = %v", got["canonical_author"])
	}
	if _, ok := got["author_aliases"]; !ok {
		t.Error("应返回 author_aliases")
	}
}

func TestMetaBooksRating(t *testing.T) {
	fx := newMetaFixture(t)
	metaSeedBook(t, fx.DB, 1, "书一")
	if _, err := fx.DB.Exec(`INSERT INTO ratings (id, rating) VALUES (10, 8)`); err != nil {
		t.Fatalf("插入评分失败: %v", err)
	}
	if _, err := fx.DB.Exec(`INSERT INTO books_ratings_link (book, rating) VALUES (1, 10)`); err != nil {
		t.Fatalf("关联评分失败: %v", err)
	}

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/rating/8", "", 0, false)
	ctx.Params = []string{"rating", "8"}
	got, err := MetaBooksHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	books, _ := got["books"].([]map[string]any)
	if len(books) != 1 {
		t.Fatalf("书籍数 = %d", len(books))
	}
}

func TestMetaBooksRatingNotFound(t *testing.T) {
	fx := newMetaFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/rating/99", "", 0, false)
	ctx.Params = []string{"rating", "99"}
	got, err := MetaBooksHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	books, _ := got["books"].([]map[string]any)
	if len(books) != 0 {
		t.Errorf("书籍数 = %d", len(books))
	}
}

func TestMetaBooksUnknownName(t *testing.T) {
	fx := newMetaFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/tag/不存在", "", 0, false)
	ctx.Params = []string{"tag", "不存在"}
	got, err := MetaBooksHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	books, _ := got["books"].([]map[string]any)
	if len(books) != 0 {
		t.Errorf("书籍数 = %d", len(books))
	}
}

func TestMetaBooksPrivateFiltered(t *testing.T) {
	fx := newMetaFixture(t)
	metaSeedBook(t, fx.DB, 1, "公开")
	metaSeedBook(t, fx.DB, 2, "私有")
	metaSeedTag(t, fx.DB, 10, "科幻", 1, 2)
	insertItem(t, fx.DB, 2, "private", 99)

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/tag/科幻", "", 1, false)
	ctx.Params = []string{"tag", "科幻"}
	got, err := MetaBooksHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	books, _ := got["books"].([]map[string]any)
	if len(books) != 1 || int64Of(books[0]["id"]) != 1 {
		t.Errorf("私有书应被过滤: %v", books)
	}
}

// ---- AuthorAliases ----

func TestAuthorAliasesGet(t *testing.T) {
	fx := newMetaFixture(t)
	metaSeedBook(t, fx.DB, 1, "书一")
	metaSeedAuthor(t, fx.DB, 10, "刘慈欣", 1)

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/author/刘慈欣/alias", "", 0, false)
	ctx.Params = []string{"刘慈欣"}
	got, err := AuthorAliasesHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	author, _ := got["author"].(map[string]any)
	if author["canonical"] != "刘慈欣" {
		t.Errorf("canonical = %v", author["canonical"])
	}
	if int64Of(author["book_count"]) != 1 {
		t.Errorf("book_count = %v", author["book_count"])
	}
	if author["can_edit"] != false {
		t.Error("游客不应可编辑")
	}
}

func TestAuthorAliasesPostPermission(t *testing.T) {
	fx := newMetaFixture(t)
	metaSeedAuthor(t, fx.DB, 10, "刘慈欣")

	// 非管理员。
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/author/刘慈欣/alias",
		`{"canonical":"刘慈欣"}`, 1, false)
	ctx.Params = []string{"刘慈欣"}
	got, err := AuthorAliasesHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "permission" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAuthorAliasesPostSuccess(t *testing.T) {
	fx := newMetaFixture(t)
	metaSeedBook(t, fx.DB, 1, "书一")
	metaSeedAuthor(t, fx.DB, 10, "刘慈欣", 1)

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/author/刘慈欣/alias",
		`{"canonical":"刘慈欣","aliases":["刘慈欣别名"]}`, 1, true)
	ctx.Params = []string{"刘慈欣"}
	got, err := AuthorAliasesHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	author, _ := got["author"].(map[string]any)
	aliases, _ := author["aliases"].([]string)
	if len(aliases) != 1 || aliases[0] != "刘慈欣别名" {
		t.Errorf("aliases = %v", aliases)
	}
}

func TestAuthorAliasesPostBadBody(t *testing.T) {
	fx := newMetaFixture(t)
	metaSeedAuthor(t, fx.DB, 10, "刘慈欣")
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/author/刘慈欣/alias", `{bad`, 1, true)
	ctx.Params = []string{"刘慈欣"}
	got, err := AuthorAliasesHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.aliases.invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAuthorAliasesPostBadAliases(t *testing.T) {
	fx := newMetaFixture(t)
	metaSeedAuthor(t, fx.DB, 10, "刘慈欣")
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/author/刘慈欣/alias",
		`{"canonical":"刘慈欣","aliases":"notalist"}`, 1, true)
	ctx.Params = []string{"刘慈欣"}
	got, err := AuthorAliasesHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params.aliases.invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAuthorAliasesPostMerge(t *testing.T) {
	fx := newMetaFixture(t)
	metaSeedBook(t, fx.DB, 1, "书一")
	metaSeedBook(t, fx.DB, 2, "书二")
	metaSeedAuthor(t, fx.DB, 10, "刘慈欣", 1)
	metaSeedAuthor(t, fx.DB, 11, "刘慈欣别名", 2)

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/author/刘慈欣/alias",
		`{"canonical":"刘慈欣","aliases":["刘慈欣别名"],"merge":true}`, 1, true)
	ctx.Params = []string{"刘慈欣"}
	got, err := AuthorAliasesHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	merge, _ := got["merge"].(map[string]any)
	if int64Of(merge["updated"]) != 1 {
		t.Errorf("merge.updated = %v", merge["updated"])
	}
	// 别名作者应已被合并删除。
	var n int
	if err := fx.DB.QueryRow(`SELECT COUNT(*) FROM authors WHERE name = '刘慈欣别名'`).Scan(&n); err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if n != 0 {
		t.Error("别名作者应已被合并")
	}
}

// ---- AuthorBooksUpdate / PubBooksUpdate ----

func TestAuthorBooksUpdateNotWired(t *testing.T) {
	fx := newMetaFixture(t)
	metaSeedBook(t, fx.DB, 1, "书一")
	metaSeedAuthor(t, fx.DB, 10, "刘慈欣", 1)

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/author/刘慈欣/update", "", 0, false)
	ctx.Params = []string{"刘慈欣"}
	_, err := AuthorBooksUpdateHandler(fx.Cfg)(ctx)
	if err == nil {
		t.Fatal("未接线时应报错（对齐 Python 的 AttributeError）")
	}
}

func TestAuthorBooksUpdateWired(t *testing.T) {
	fx := newMetaFixture(t)
	metaSeedBook(t, fx.DB, 1, "书一")
	metaSeedAuthor(t, fx.DB, 10, "刘慈欣", 1)
	updated := []int64{}
	fx.Cfg.UpdateBook = func(_ *Context, id int64) error {
		updated = append(updated, id)
		return nil
	}

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/author/刘慈欣/update", "", 0, false)
	ctx.Params = []string{"刘慈欣"}
	if _, err := AuthorBooksUpdateHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if len(updated) != 1 || updated[0] != 1 {
		t.Errorf("updated = %v", updated)
	}
	if pluginRecorder(ctx).Code != http.StatusFound {
		t.Errorf("状态码 = %d", pluginRecorder(ctx).Code)
	}
}

func TestPubBooksUpdateWired(t *testing.T) {
	fx := newMetaFixture(t)
	metaSeedBook(t, fx.DB, 1, "书一")
	if _, err := fx.DB.Exec(`INSERT INTO publishers (id, name) VALUES (10, '某社')`); err != nil {
		t.Fatalf("插入出版社失败: %v", err)
	}
	if _, err := fx.DB.Exec(`INSERT INTO books_publishers_link (book, publisher) VALUES (1, 10)`); err != nil {
		t.Fatalf("关联出版社失败: %v", err)
	}
	updated := []int64{}
	fx.Cfg.UpdateBook = func(_ *Context, id int64) error {
		updated = append(updated, id)
		return nil
	}

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/publisher/某社/update", "", 0, false)
	ctx.Params = []string{"某社"}
	if _, err := PubBooksUpdateHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if len(updated) != 1 {
		t.Errorf("updated = %v", updated)
	}
}

func TestPubBooksUpdateNoPublisherFallback(t *testing.T) {
	fx := newMetaFixture(t)
	metaSeedBook(t, fx.DB, 1, "无出版社的书")
	updated := []int64{}
	fx.Cfg.UpdateBook = func(_ *Context, id int64) error {
		updated = append(updated, id)
		return nil
	}

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/publisher/不存在/update", "", 0, false)
	ctx.Params = []string{"不存在"}
	if _, err := PubBooksUpdateHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	// 出版社不存在时回退到「全部无出版社的书」。
	if len(updated) != 1 || updated[0] != 1 {
		t.Errorf("updated = %v", updated)
	}
}

// ---- 小工具 ----

func TestMetaCategory(t *testing.T) {
	// 除 series 外一律加 s（与 Python get_category_with_count 一致）。
	// 回归：publisher / rating 曾经沿用单数字段名，导致列表页与详情页
	// 都因查不到表而恒返回 0 项。
	cases := map[string]string{
		"tag": "tags", "author": "authors", "series": "series",
		"rating": "ratings", "publisher": "publishers", "format": "formats",
	}
	for in, want := range cases {
		if got := metaCategory(in); got != want {
			t.Errorf("metaCategory(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestMetaStringList(t *testing.T) {
	got, err := metaStringList([]any{"a", "b"})
	if err != nil || len(got) != 2 {
		t.Errorf("got = %v, err = %v", got, err)
	}
	if got, err := metaStringList(nil); err != nil || len(got) != 0 {
		t.Errorf("nil → %v, %v", got, err)
	}
	if _, err := metaStringList("notalist"); err == nil {
		t.Error("非列表应报错")
	}
	if _, err := metaStringList([]any{1}); err == nil {
		t.Error("非字符串元素应报错")
	}
}

func TestSortedInt64Keys(t *testing.T) {
	got := sortedInt64Keys(map[int64]bool{3: true, 1: true, 2: true})
	if len(got) != 3 || got[0] != 1 || got[2] != 3 {
		t.Errorf("got = %v", got)
	}
	if got := int64SliceToAny([]int64{1, 2}); len(got) != 2 {
		t.Errorf("got = %v", got)
	}
}

// ---- userdb: 外部索引 ----

func TestExternalIndexFormatPaths(t *testing.T) {
	fx := newMetaFixture(t)
	if _, err := fx.DB.Exec(`INSERT INTO scanfiles (id, path, data, book_id) VALUES
		(1, '/tmp/a.epub', '{"format":"EPUB","source_path":"/tmp/a.epub"}', 1)`); err != nil {
		t.Fatalf("插入 scanfiles 失败: %v", err)
	}
	paths, err := userdb.ExternalIndexFormatPaths(fx.DB, 1)
	if err != nil {
		t.Fatalf("ExternalIndexFormatPaths: %v", err)
	}
	if len(paths) != 1 {
		t.Fatalf("paths = %v", paths)
	}
	if _, ok := paths["EPUB"]; !ok {
		t.Errorf("缺少 EPUB: %v", paths)
	}
}

func TestExternalIndexFormatPathsEmpty(t *testing.T) {
	fx := newMetaFixture(t)
	paths, err := userdb.ExternalIndexFormatPaths(fx.DB, 999)
	if err != nil {
		t.Fatalf("ExternalIndexFormatPaths: %v", err)
	}
	if len(paths) != 0 {
		t.Errorf("paths = %v", paths)
	}
}

func TestCalibreAuthorMergePlan(t *testing.T) {
	fx := newMetaFixture(t)
	metaSeedBook(t, fx.DB, 1, "书一")
	metaSeedBook(t, fx.DB, 2, "书二")
	metaSeedAuthor(t, fx.DB, 10, "刘慈欣", 1)
	metaSeedAuthor(t, fx.DB, 11, "刘慈欣别名", 2)

	renameMap, affected := userdb.CalibreAuthorMergePlan(fx.DB, []string{"刘慈欣别名"}, "刘慈欣")
	if len(renameMap) != 1 {
		t.Fatalf("renameMap = %v", renameMap)
	}
	if renameMap[11] != "刘慈欣" {
		t.Errorf("renameMap[11] = %q", renameMap[11])
	}
	if !affected[2] {
		t.Errorf("affected = %v", affected)
	}
	// 规范名自身不应进入改名映射。
	if _, ok := renameMap[10]; ok {
		t.Error("规范名不应被改名")
	}
}

func TestCalibreAuthorMergePlanEmpty(t *testing.T) {
	fx := newMetaFixture(t)
	renameMap, affected := userdb.CalibreAuthorMergePlan(fx.DB, nil, "某人")
	if len(renameMap) != 0 || len(affected) != 0 {
		t.Errorf("renameMap = %v, affected = %v", renameMap, affected)
	}
}

func TestRenameItemsPreservingExternalPaths(t *testing.T) {
	fx := newMetaFixture(t)
	metaSeedBook(t, fx.DB, 1, "书一")
	metaSeedBook(t, fx.DB, 2, "书二")
	metaSeedAuthor(t, fx.DB, 10, "刘慈欣", 1)
	metaSeedAuthor(t, fx.DB, 11, "刘慈欣别名", 2)

	renamed, err := userdb.RenameItemsPreservingExternalPaths(fx.DB, "authors",
		map[int64]string{11: "刘慈欣"}, map[int64]bool{2: true})
	if err != nil {
		t.Fatalf("RenameItemsPreservingExternalPaths: %v", err)
	}
	if len(renamed) != 1 || renamed[0] != 2 {
		t.Errorf("renamed = %v", renamed)
	}
	// 书 2 应已挂到作者 10。
	var authorID int64
	if err := fx.DB.QueryRow(`SELECT author FROM books_authors_link WHERE book = 2`).Scan(&authorID); err != nil {
		t.Fatalf("查询关联失败: %v", err)
	}
	if authorID != 10 {
		t.Errorf("author = %d, want 10", authorID)
	}
	// 源作者应已删除。
	var n int
	if err := fx.DB.QueryRow(`SELECT COUNT(*) FROM authors WHERE id = 11`).Scan(&n); err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if n != 0 {
		t.Error("源作者应已删除")
	}
}

func TestRenameItemsEmptyMap(t *testing.T) {
	fx := newMetaFixture(t)
	renamed, err := userdb.RenameItemsPreservingExternalPaths(fx.DB, "authors", nil, nil)
	if err != nil {
		t.Fatalf("err = %v", err)
	}
	if len(renamed) != 0 {
		t.Errorf("renamed = %v", renamed)
	}
}

func TestRenameItemsUnknownField(t *testing.T) {
	fx := newMetaFixture(t)
	_, err := userdb.RenameItemsPreservingExternalPaths(fx.DB, "unknown",
		map[int64]string{1: "x"}, map[int64]bool{})
	if err == nil {
		t.Error("未知分类应报错")
	}
}

func TestRenameItemsMergesIntoExisting(t *testing.T) {
	fx := newMetaFixture(t)
	metaSeedBook(t, fx.DB, 1, "书一")
	metaSeedBook(t, fx.DB, 2, "书二")
	metaSeedTag(t, fx.DB, 10, "科幻", 1)
	metaSeedTag(t, fx.DB, 11, "科幻小说", 2)

	renamed, err := userdb.RenameItemsPreservingExternalPaths(fx.DB, "tags",
		map[int64]string{11: "科幻"}, map[int64]bool{2: true})
	if err != nil {
		t.Fatalf("err = %v", err)
	}
	if len(renamed) != 1 {
		t.Errorf("renamed = %v", renamed)
	}
	// 两本书都应挂到标签 10。
	var n int
	if err := fx.DB.QueryRow(`SELECT COUNT(*) FROM books_tags_link WHERE tag = 10`).Scan(&n); err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if n != 2 {
		t.Errorf("关联数 = %d, want 2", n)
	}
}
