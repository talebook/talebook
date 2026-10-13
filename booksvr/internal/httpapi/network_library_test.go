package httpapi

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"talebook/booksvr/internal/background"
	"talebook/booksvr/internal/booksourcesearch"
	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginruntime"
	"talebook/booksvr/internal/sourcecatalog"

	_ "modernc.org/sqlite"
)

// netSchemaDB 建一个内存库并套用权威 schema。
func netSchemaDB(t *testing.T) *sql.DB {
	t.Helper()
	path := filepath.Join("..", "userdb", "testdata", "schema.sql")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Skipf("schema.sql 不存在，跳过: %v", err)
	}
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	db.SetMaxOpenConns(1)
	t.Cleanup(func() { _ = db.Close() })

	for _, stmt := range strings.Split(string(raw), ";") {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" {
			continue
		}
		if _, err := db.Exec(stmt); err != nil {
			t.Fatalf("建表失败: %v\n语句: %s", err, stmt)
		}
	}
	return db
}

// netProvider 是满足 SourceProvider 契约的最小实现。
type netProvider struct {
	manifest map[string]any
	handler  func(method string, args []any, ctx map[string]any) (any, error)
}

func (p *netProvider) Manifest() map[string]any { return p.manifest }
func (p *netProvider) DownloadMode() pluginiface.DownloadMode {
	return pluginiface.DownloadNone
}
func (p *netProvider) Search(string, map[string]any, map[string]any) (plugindomain.Page, error) {
	return plugindomain.Page{}, nil
}
func (p *netProvider) Browse(string, map[string]any, map[string]any) (plugindomain.Page, error) {
	return plugindomain.Page{}, nil
}
func (p *netProvider) GetCategories(map[string]any) ([]plugindomain.Category, error) {
	return nil, nil
}
func (p *netProvider) GetBook(string, map[string]any) (plugindomain.SourceBookDetail, error) {
	return plugindomain.SourceBookDetail{}, nil
}
func (p *netProvider) Download(plugindomain.SourceBookDetail, map[string]any) (plugindomain.BookFile, error) {
	return plugindomain.BookFile{}, nil
}
func (p *netProvider) GetTOC(plugindomain.SourceBookDetail, map[string]any) ([]plugindomain.SourceChapter, error) {
	return nil, nil
}
func (p *netProvider) GetChapter(plugindomain.SourceChapter, map[string]any) (plugindomain.SourceContent, error) {
	return plugindomain.SourceContent{}, nil
}
func (p *netProvider) SelfCheck(map[string]any) (plugindomain.CheckReport, error) {
	return plugindomain.CheckReport{}, nil
}

// Invoke 实现 MethodDispatcher，供 runtime 动态分派。
func (p *netProvider) Invoke(method string, args []any, ctx map[string]any) (any, error) {
	if p.handler == nil {
		return nil, nil
	}
	return p.handler(method, args, ctx)
}

// netManifest 构造一份声明书源能力的合法清单。
func netManifest(id string) map[string]any {
	return map[string]any{
		"protocol_version":  "talebook.plugin/v1",
		"id":                id,
		"name":              "测试书源",
		"version":           "1.0.0",
		"categories":        []any{"sources"},
		"capabilities":      []any{"sources.search", "sources.browse", "sources.acquire"},
		"runtime_kind":      "builtin",
		"actions":           []any{"test"},
		"auth_schema":       map[string]any{"properties": map[string]any{}},
		"config_schema":     map[string]any{},
		"connection_owners": []any{"instance"},
		"permissions":       []any{"books.read"},
		"data_policy":       map[string]any{},
		"compatibility":     map[string]any{},
		"homepage":          "",
		"license":           "",
		"download_mode":     "none",
	}
}

// netFixture 是一次网络书库测试的完整环境。
type netFixture struct {
	DB      *sql.DB
	Cfg     NetworkConfig
	Catalog *sourcecatalog.Service
	Search  *booksourcesearch.Service
	Bg      *background.Service
}

// newNetFixture 建库、注册书源 provider 并返回可用的配置。
func newNetFixture(t *testing.T, pluginKey string,
	handler func(string, []any, map[string]any) (any, error)) *netFixture {
	t.Helper()
	db := netSchemaDB(t)
	if _, err := db.Exec(`INSERT INTO readers (id, username, password, admin, permission, create_time)
		VALUES (1, 'admin', 'x', 1, '', '2026-01-01 00:00:00')`); err != nil {
		t.Fatalf("插入管理员失败: %v", err)
	}

	reg := pluginruntime.NewPluginRegistry()
	p := &netProvider{manifest: netManifest(pluginKey), handler: handler}
	caps := pluginiface.CapabilitySet{
		Interfaces:   map[string]bool{"SourceProvider": true},
		HasSelfCheck: true,
		DownloadMode: pluginiface.DownloadNone,
		Methods: map[string]bool{
			"search": true, "browse": true, "get_categories": true, "get_book": true,
			"download": true, "get_toc": true, "get_chapter": true, "self_check": true,
		},
	}
	if _, err := reg.Register(p, caps); err != nil {
		t.Fatalf("Register: %v", err)
	}

	settings := map[string]any{"PLUGIN_SECRET_KEY": "test-key-123"}
	rt := pluginruntime.NewRuntime(db, settings, reg)
	catalog, err := sourcecatalog.NewService(db, settings, 1, rt)
	if err != nil {
		t.Fatalf("NewService: %v", err)
	}
	if _, err := db.Exec(`UPDATE plugin_installations SET enabled = 1`); err != nil {
		t.Fatalf("enable: %v", err)
	}

	search := booksourcesearch.NewService()
	bg := background.NewService()
	cfg := NetworkConfig{
		Settings:   settings,
		Catalog:    func(*Context) (*sourcecatalog.Service, error) { return catalog, nil },
		Search:     func() *booksourcesearch.Service { return search },
		Background: func() *background.Service { return bg },
	}
	return &netFixture{DB: db, Cfg: cfg, Catalog: catalog, Search: search, Bg: bg}
}

// seedLegadoSource 插入一条 legado 书源。
func seedLegadoSource(t *testing.T, db *sql.DB, name string) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO book_sources
		(name, url, "group", enabled, weight, raw, create_time, update_time)
		VALUES (?, ?, '分组', 1, 0, '{}', '', '')`, name, "https://"+name); err != nil {
		t.Fatalf("插入书源失败: %v", err)
	}
}

// calibreDDL 是 Calibre metadata.db 的读路径所需表结构。
//
// 权威 schema.sql 只含 Talebook 自有表；Calibre 表由本测试自建，
// DDL 与 internal/library/query_test.go 保持一致。
var calibreDDL = []string{
	`CREATE TABLE IF NOT EXISTS books (
		id INTEGER PRIMARY KEY, title TEXT NOT NULL DEFAULT '',
		author_sort TEXT NOT NULL DEFAULT '', path TEXT NOT NULL DEFAULT '',
		timestamp INTEGER NOT NULL DEFAULT 0, pubdate TEXT,
		series_index REAL NOT NULL DEFAULT 1.0, sort TEXT,
		has_cover INTEGER NOT NULL DEFAULT 0, uuid TEXT, last_modified TEXT)`,
	`CREATE TABLE IF NOT EXISTS authors (id INTEGER PRIMARY KEY, name TEXT NOT NULL, sort TEXT, link TEXT)`,
	`CREATE TABLE IF NOT EXISTS books_authors_link (id INTEGER PRIMARY KEY, book INTEGER, author INTEGER)`,
	`CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY, name TEXT NOT NULL, link TEXT)`,
	`CREATE TABLE IF NOT EXISTS books_tags_link (id INTEGER PRIMARY KEY, book INTEGER, tag INTEGER)`,
	`CREATE TABLE IF NOT EXISTS publishers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, sort TEXT, link TEXT)`,
	`CREATE TABLE IF NOT EXISTS books_publishers_link (id INTEGER PRIMARY KEY, book INTEGER, publisher INTEGER)`,
	`CREATE TABLE IF NOT EXISTS series (id INTEGER PRIMARY KEY, name TEXT NOT NULL, sort TEXT, link TEXT)`,
	`CREATE TABLE IF NOT EXISTS books_series_link (id INTEGER PRIMARY KEY, book INTEGER, series INTEGER)`,
	`CREATE TABLE IF NOT EXISTS ratings (id INTEGER PRIMARY KEY, rating INTEGER, link TEXT)`,
	`CREATE TABLE IF NOT EXISTS books_ratings_link (id INTEGER PRIMARY KEY, book INTEGER, rating INTEGER)`,
	`CREATE TABLE IF NOT EXISTS languages (id INTEGER PRIMARY KEY, lang_code TEXT NOT NULL, link TEXT)`,
	`CREATE TABLE IF NOT EXISTS books_languages_link (id INTEGER PRIMARY KEY, book INTEGER, lang_code INTEGER, item_order INTEGER DEFAULT 0)`,
	`CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY, book INTEGER, text TEXT)`,
	`CREATE TABLE IF NOT EXISTS identifiers (id INTEGER PRIMARY KEY, book INTEGER, type TEXT, val TEXT)`,
	`CREATE TABLE IF NOT EXISTS data (id INTEGER PRIMARY KEY, book INTEGER, format TEXT, uncompressed_size INTEGER, name TEXT)`,
}

// createCalibreTables 建 Calibre 表（幂等）。
func createCalibreTables(t *testing.T, db *sql.DB) {
	t.Helper()
	for _, stmt := range calibreDDL {
		if _, err := db.Exec(stmt); err != nil {
			t.Fatalf("建 Calibre 表失败: %v\n%s", err, stmt)
		}
	}
}

// insertBook 插入一条 Calibre 书籍记录。
func insertBook(t *testing.T, db *sql.DB, id int64, title string) {
	t.Helper()
	createCalibreTables(t, db)
	if _, err := db.Exec(`INSERT INTO books
		(id, title, author_sort, path, timestamp, pubdate, series_index, has_cover)
		VALUES (?, ?, 'a', 'p', 0, '', 1.0, 0)`, id, title); err != nil {
		t.Fatalf("插入书失败: %v", err)
	}
}

// insertItem 插入一条 items 记录（补齐 NOT NULL 列）。
func insertItem(t *testing.T, db *sql.DB, bookID int64, scope string, collectorID int64) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO items
		(book_id, count_guest, count_visit, count_download, website, collector_id,
		 scope, book_type, media_type, media_type_locked, src_path)
		VALUES (?, 0, 0, 0, '', ?, ?, '', '', 0, '')`,
		bookID, collectorID, scope); err != nil {
		t.Fatalf("insert item: %v", err)
	}
}

// netCtx 构造一个测试用 Context。
func netCtx(t *testing.T, db *sql.DB, method, target string, body string, userID int64, isAdmin bool) *Context {
	t.Helper()
	var reader *strings.Reader
	if body != "" {
		reader = strings.NewReader(body)
	} else {
		reader = strings.NewReader("")
	}
	req := httptest.NewRequest(method, target, reader)
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	return &Context{
		Request:  req,
		Writer:   httptest.NewRecorder(),
		DB:       db,
		CDNURL:   "https://cdn.example.com",
		APIURL:   "https://api.example.com",
		Identity: Identity{UserID: userID, IsAdmin: isAdmin},
	}
}

func TestNetworkRouteSpecsCount(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	specs := NetworkRouteSpecs(fx.Cfg)
	if len(specs) != 22 {
		t.Fatalf("len = %d, want 22", len(specs))
	}
	// 全部要求登录。
	for _, s := range specs {
		if !s.Auth {
			t.Errorf("route %s must require auth", s.Pattern)
		}
		if s.Handler == nil {
			t.Errorf("route %s has nil handler", s.Pattern)
		}
	}
}

func TestNetworkSourcesHandler(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	seedLegadoSource(t, fx.DB, "源A")

	ctx := netCtx(t, fx.DB, http.MethodGet, "/api/book-sources", "", 1, true)
	got, err := NetworkSourcesHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Errorf("err = %v", got["err"])
	}
	items, _ := got["items"].([]map[string]any)
	if len(items) != 1 {
		t.Fatalf("items = %v", items)
	}
	avail, _ := got["availability"].(map[string]any)
	if avail["state"] != "ready" {
		t.Errorf("availability = %v", avail)
	}
}

func TestNetworkSearchHandlerMissingKey(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	ctx := netCtx(t, fx.DB, http.MethodGet, "/api/book-sources/search", "", 1, true)
	got, err := NetworkSearchHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrParamsError {
		t.Errorf("err = %v", got["err"])
	}
}

func TestNetworkSearchHandlerNoSources(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	ctx := netCtx(t, fx.DB, http.MethodGet, "/api/book-sources/search?key=三体", "", 1, true)
	got, err := NetworkSearchHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" || got["total"] != 0 {
		t.Errorf("got %v", got)
	}
	if got["task_id"] != "" {
		t.Errorf("task_id = %v, want empty", got["task_id"])
	}
}

func TestNetworkSearchHandlerCreatesTask(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID,
		func(method string, args []any, _ map[string]any) (any, error) {
			if method == "search" {
				return &plugindomain.Page{
					Items: []any{map[string]any{"name": "三体", "author": "刘慈欣"}},
				}, nil
			}
			return nil, nil
		})
	seedLegadoSource(t, fx.DB, "源A")

	ctx := netCtx(t, fx.DB, http.MethodGet, "/api/book-sources/search?key=三体", "", 1, true)
	got, err := NetworkSearchHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	taskID, _ := got["task_id"].(string)
	if taskID == "" {
		t.Fatal("task_id must be non-empty")
	}
	if got["total"] != 1 {
		t.Errorf("total = %v", got["total"])
	}
	if got["mode"] != "top" {
		t.Errorf("mode = %v", got["mode"])
	}
}

func TestNetworkSearchStatusMissingTaskID(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	ctx := netCtx(t, fx.DB, http.MethodGet, "/api/book-sources/search/status", "", 1, true)
	got, err := NetworkSearchStatusHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrParamsError {
		t.Errorf("err = %v", got["err"])
	}
}

func TestNetworkSearchStatusUnknownTask(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	ctx := netCtx(t, fx.DB, http.MethodGet, "/api/book-sources/search/status?task_id=nope", "", 1, true)
	got, err := NetworkSearchStatusHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrTaskNotFound {
		t.Errorf("err = %v", got["err"])
	}
}

func TestNetworkSearchStatusReturnsResults(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID,
		func(method string, args []any, _ map[string]any) (any, error) {
			if method == "search" {
				return &plugindomain.Page{
					Items: []any{map[string]any{"name": "三体"}},
				}, nil
			}
			return nil, nil
		})
	seedLegadoSource(t, fx.DB, "源A")

	// 创建任务。
	createCtx := netCtx(t, fx.DB, http.MethodGet, "/api/book-sources/search?key=三体", "", 1, true)
	created, err := NetworkSearchHandler(fx.Cfg)(createCtx)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	taskID, _ := created["task_id"].(string)

	// 轮询直到完成。
	var got map[string]any
	deadline := 200
	for i := 0; i < deadline; i++ {
		time.Sleep(2 * time.Millisecond)
		ctx := netCtx(t, fx.DB, http.MethodGet,
			"/api/book-sources/search/status?task_id="+taskID, "", 1, true)
		got, err = NetworkSearchStatusHandler(fx.Cfg)(ctx)
		if err != nil {
			t.Fatalf("status: %v", err)
		}
		if got["finished"] == true {
			break
		}
	}
	if got["finished"] != true {
		t.Fatalf("task did not finish: %v", got)
	}
	results, _ := got["results"].([]map[string]any)
	if len(results) != 1 {
		t.Fatalf("results = %v", results)
	}
	books, _ := results[0]["books"].([]map[string]any)
	if len(books) != 1 || books[0]["name"] != "三体" {
		t.Errorf("books = %v", books)
	}
}

func TestNetworkSearchStatusBumpsWeight(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID,
		func(method string, args []any, _ map[string]any) (any, error) {
			if method == "search" {
				return &plugindomain.Page{Items: []any{map[string]any{"name": "x"}}}, nil
			}
			return nil, nil
		})
	seedLegadoSource(t, fx.DB, "源A")

	createCtx := netCtx(t, fx.DB, http.MethodGet, "/api/book-sources/search?key=q", "", 1, true)
	created, _ := NetworkSearchHandler(fx.Cfg)(createCtx)
	taskID, _ := created["task_id"].(string)

	for i := 0; i < 200; i++ {
		ctx := netCtx(t, fx.DB, http.MethodGet,
			"/api/book-sources/search/status?task_id="+taskID, "", 1, true)
		time.Sleep(2 * time.Millisecond)
		got, err := NetworkSearchStatusHandler(fx.Cfg)(ctx)
		if err != nil {
			t.Fatalf("status: %v", err)
		}
		if got["finished"] == true {
			break
		}
	}

	// 有结果的源权重 +1。
	var weight int
	if err := fx.DB.QueryRow(`SELECT weight FROM book_sources WHERE id = 1`).Scan(&weight); err != nil {
		t.Fatalf("query weight: %v", err)
	}
	if weight != 1 {
		t.Errorf("weight = %d, want 1", weight)
	}
}

func TestNetworkExploreHandlerMissingSource(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	ctx := netCtx(t, fx.DB, http.MethodGet, "/api/book-sources/browse?source_id=nope", "", 1, true)
	got, err := NetworkExploreHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrParamsNotFound {
		t.Errorf("err = %v", got["err"])
	}
}

func TestNetworkExploreHandlerMissingURL(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	seedLegadoSource(t, fx.DB, "源A")
	ctx := netCtx(t, fx.DB, http.MethodGet, "/api/book-sources/browse?source_id=legado:1", "", 1, true)
	got, err := NetworkExploreHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrParamsError {
		t.Errorf("err = %v", got["err"])
	}
}

func TestNetworkExploreHandlerSuccess(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID,
		func(method string, args []any, _ map[string]any) (any, error) {
			if method == "browse" {
				return &plugindomain.Page{
					Items:      []any{map[string]any{"name": "书A"}},
					HasMore:    true,
					NextCursor: map[string]any{"page": 2},
				}, nil
			}
			return nil, nil
		})
	seedLegadoSource(t, fx.DB, "源A")

	ctx := netCtx(t, fx.DB, http.MethodGet,
		"/api/book-sources/browse?source_id=legado:1&url=cat1", "", 1, true)
	got, err := NetworkExploreHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	books, _ := got["books"].([]map[string]any)
	if len(books) != 1 {
		t.Errorf("books = %v", books)
	}
	// legado 不是 venera → has_more 为 nil。
	if got["has_more"] != nil {
		t.Errorf("has_more = %v, want nil for non-venera", got["has_more"])
	}
}

func TestNetworkExploreHandlerVeneraHasMore(t *testing.T) {
	fx := newNetFixture(t, VeneraPluginKey,
		func(method string, args []any, _ map[string]any) (any, error) {
			if method == "browse" {
				return &plugindomain.Page{HasMore: true}, nil
			}
			return nil, nil
		})
	// venera 是通用插件路径（非 legado/opds）。
	ctx := netCtx(t, fx.DB, http.MethodGet,
		"/api/book-sources/browse?source_id=plugin:1&url=cat1", "", 1, true)
	got, err := NetworkExploreHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	// venera → has_more 透传。
	if got["has_more"] != true {
		t.Errorf("has_more = %v, want true for venera", got["has_more"])
	}
}

func TestNetworkCategoriesHandler(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID,
		func(method string, args []any, _ map[string]any) (any, error) {
			if method == "get_categories" {
				return []plugindomain.Category{{ID: "c1", Name: "玄幻"}}, nil
			}
			return nil, nil
		})
	seedLegadoSource(t, fx.DB, "源A")

	ctx := netCtx(t, fx.DB, http.MethodGet,
		"/api/book-sources/categories?source_id=legado:1", "", 1, true)
	got, err := NetworkCategoriesHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	items, _ := got["items"].([]map[string]any)
	if len(items) != 1 {
		t.Fatalf("items = %v", items)
	}
	if items[0]["name"] != "玄幻" || items[0]["url"] != "c1" {
		t.Errorf("item = %v", items[0])
	}
}

func TestNetworkBookHandlerMissingURL(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	seedLegadoSource(t, fx.DB, "源A")
	ctx := netCtx(t, fx.DB, http.MethodGet, "/api/book-sources/book?source_id=legado:1", "", 1, true)
	got, err := NetworkBookHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrParamsError {
		t.Errorf("err = %v", got["err"])
	}
}

func TestNetworkBookHandlerSuccess(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID,
		func(method string, args []any, _ map[string]any) (any, error) {
			if method == "get_book" {
				return &plugindomain.SourceBookDetail{
					ExternalID: "b1", Title: "三体", TOCRef: "toc1",
				}, nil
			}
			return nil, nil
		})
	seedLegadoSource(t, fx.DB, "源A")

	ctx := netCtx(t, fx.DB, http.MethodGet,
		"/api/book-sources/book?source_id=legado:1&book_url=https://x/b1", "", 1, true)
	got, err := NetworkBookHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	if got["toc_url"] != "toc1" {
		t.Errorf("toc_url = %v", got["toc_url"])
	}
	if got["download_mode"] != "none" {
		t.Errorf("download_mode = %v", got["download_mode"])
	}
}

func TestNetworkBookHandlerProviderError(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID,
		func(method string, args []any, _ map[string]any) (any, error) {
			if method == "get_book" {
				return nil, pluginruntime.NewPluginRuntimeError("source.fetch_failed", "boom", false)
			}
			return nil, nil
		})
	seedLegadoSource(t, fx.DB, "源A")

	ctx := netCtx(t, fx.DB, http.MethodGet,
		"/api/book-sources/book?source_id=legado:1&book_url=https://x/b1", "", 1, true)
	got, err := NetworkBookHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "source.fetch_failed" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestNetworkTocHandlerMissingURLs(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	seedLegadoSource(t, fx.DB, "源A")
	ctx := netCtx(t, fx.DB, http.MethodGet, "/api/book-sources/toc?source_id=legado:1", "", 1, true)
	got, err := NetworkTocHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrParamsError {
		t.Errorf("err = %v", got["err"])
	}
}

func TestNetworkTocHandlerByTocURL(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID,
		func(method string, args []any, _ map[string]any) (any, error) {
			if method == "get_toc" {
				return []plugindomain.SourceChapter{{ExternalID: "c1", Title: "第一章"}}, nil
			}
			return nil, nil
		})
	seedLegadoSource(t, fx.DB, "源A")

	ctx := netCtx(t, fx.DB, http.MethodGet,
		"/api/book-sources/toc?source_id=legado:1&toc_url=https://x/toc", "", 1, true)
	got, err := NetworkTocHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	chapters, _ := got["chapters"].([]map[string]any)
	if len(chapters) != 1 {
		t.Errorf("chapters = %v", chapters)
	}
	// 无 get_book 调用 → serialize_status 为 unknown。
	if got["serialize_status"] != "unknown" {
		t.Errorf("serialize_status = %v", got["serialize_status"])
	}
}

func TestNetworkTocHandlerByBookURL(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID,
		func(method string, args []any, _ map[string]any) (any, error) {
			switch method {
			case "get_book":
				return &plugindomain.SourceBookDetail{
					ExternalID: "b1", TOCRef: "toc1",
					Extra: map[string]any{"serialize_status": "serial"},
				}, nil
			case "get_toc":
				return []plugindomain.SourceChapter{{ExternalID: "c1"}}, nil
			}
			return nil, nil
		})
	seedLegadoSource(t, fx.DB, "源A")

	ctx := netCtx(t, fx.DB, http.MethodGet,
		"/api/book-sources/toc?source_id=legado:1&book_url=https://x/b1", "", 1, true)
	got, err := NetworkTocHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["serialize_status"] != "serial" {
		t.Errorf("serialize_status = %v", got["serialize_status"])
	}
}

func TestNetworkContentHandlerMissingURL(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	seedLegadoSource(t, fx.DB, "源A")
	ctx := netCtx(t, fx.DB, http.MethodGet, "/api/book-sources/content?source_id=legado:1", "", 1, true)
	got, err := NetworkContentHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrParamsError {
		t.Errorf("err = %v", got["err"])
	}
}

func TestNetworkContentHandlerSuccess(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID,
		func(method string, args []any, ctx map[string]any) (any, error) {
			if method == "get_chapter" {
				// 校验 clean 透传。
				cfg, _ := ctx["config"].(map[string]any)
				if cfg["clean"] != true {
					t.Errorf("clean not passed: %v", cfg)
				}
				return &plugindomain.SourceContent{Title: "第一章", Content: "正文"}, nil
			}
			return nil, nil
		})
	seedLegadoSource(t, fx.DB, "源A")

	ctx := netCtx(t, fx.DB, http.MethodGet,
		"/api/book-sources/content?source_id=legado:1&chapter_url=https://x/c1&title=第一章", "", 1, true)
	got, err := NetworkContentHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	if got["content"] != "正文" {
		t.Errorf("content = %v", got["content"])
	}
	if got["title"] != "第一章" {
		t.Errorf("title = %v", got["title"])
	}
}

func TestNetworkContentHandlerCleanFalse(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID,
		func(method string, args []any, ctx map[string]any) (any, error) {
			if method == "get_chapter" {
				cfg, _ := ctx["config"].(map[string]any)
				if cfg["clean"] != false {
					t.Errorf("clean = %v, want false", cfg["clean"])
				}
				return &plugindomain.SourceContent{Content: "x"}, nil
			}
			return nil, nil
		})
	seedLegadoSource(t, fx.DB, "源A")

	ctx := netCtx(t, fx.DB, http.MethodGet,
		"/api/book-sources/content?source_id=legado:1&chapter_url=https://x/c1&clean=0", "", 1, true)
	if _, err := NetworkContentHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
}

func TestNetworkSaveHandlerBadJSON(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	ctx := netCtx(t, fx.DB, http.MethodPost, "/api/book-sources/save", "not json", 1, true)
	got, err := NetworkSaveHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrParamsError {
		t.Errorf("err = %v", got["err"])
	}
}

func TestNetworkSaveHandlerMissingSource(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	body := `{"source_id":"nope","book_url":"https://x/b1"}`
	ctx := netCtx(t, fx.DB, http.MethodPost, "/api/book-sources/save", body, 1, true)
	got, err := NetworkSaveHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrParamsNotFound {
		t.Errorf("err = %v", got["err"])
	}
}

func TestNetworkSaveHandlerBadFormat(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	seedLegadoSource(t, fx.DB, "源A")
	body := `{"source_id":"legado:1","book_url":"https://x/b1","fmt":"pdf"}`
	ctx := netCtx(t, fx.DB, http.MethodPost, "/api/book-sources/save", body, 1, true)
	got, err := NetworkSaveHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrParamsError {
		t.Errorf("err = %v", got["err"])
	}
}

func TestNetworkSaveHandlerCreatesTask(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	seedLegadoSource(t, fx.DB, "源A")

	var gotTaskID int64
	fx.Cfg.SaveOnline = func(ctx *Context, sourceKey, bookURL, format string, clean bool, taskID int64) error {
		gotTaskID = taskID
		return nil
	}

	body := `{"source_id":"legado:1","book_url":"https://x/b1","fmt":"epub","clean":false}`
	ctx := netCtx(t, fx.DB, http.MethodPost, "/api/book-sources/save", body, 1, true)
	got, err := NetworkSaveHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	if gotTaskID == 0 {
		t.Error("task_id must be passed to SaveOnline")
	}
	wantTag := "online_save:legado:1:https://x/b1"
	if got["tag"] != wantTag {
		t.Errorf("tag = %v, want %s", got["tag"], wantTag)
	}
}

func TestNetworkSaveHandlerDeduplicates(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	seedLegadoSource(t, fx.DB, "源A")

	calls := 0
	fx.Cfg.SaveOnline = func(*Context, string, string, string, bool, int64) error {
		calls++
		return nil
	}

	body := `{"source_id":"legado:1","book_url":"https://x/b1"}`
	// 第一次创建任务。
	ctx := netCtx(t, fx.DB, http.MethodPost, "/api/book-sources/save", body, 1, true)
	if _, err := NetworkSaveHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("first: %v", err)
	}
	// 第二次应复用运行中的任务。
	ctx2 := netCtx(t, fx.DB, http.MethodPost, "/api/book-sources/save", body, 1, true)
	got, err := NetworkSaveHandler(fx.Cfg)(ctx2)
	if err != nil {
		t.Fatalf("second: %v", err)
	}
	if got["msg"] != "该书籍正在保存中" {
		t.Errorf("msg = %v", got["msg"])
	}
	if calls != 1 {
		t.Errorf("SaveOnline called %d times, want 1 (deduplicated)", calls)
	}
}

func TestNetworkSaveStatusHandlerMissingParams(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	ctx := netCtx(t, fx.DB, http.MethodGet, "/api/book-sources/save/status", "", 1, true)
	got, err := NetworkSaveStatusHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrParamsError {
		t.Errorf("err = %v", got["err"])
	}
}

func TestNetworkSaveStatusHandlerNotFound(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	ctx := netCtx(t, fx.DB, http.MethodGet,
		"/api/book-sources/save/status?source_id=legado:1&book_url=https://x/b1", "", 1, true)
	got, err := NetworkSaveStatusHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["found"] != false {
		t.Errorf("found = %v, want false", got["found"])
	}
}

func TestNetworkSaveStatusHandlerFound(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	tag := "online_save:legado:1:https://x/b1"
	task := fx.Bg.AddTask(background.ServiceTypeOnlineSave, "[online]源A", 0, tag)
	fx.Bg.UpdateProgress(task.ID, 40, map[string]any{"done": 4, "total": 10, "book_id": 99}, "")

	ctx := netCtx(t, fx.DB, http.MethodGet,
		"/api/book-sources/save/status?source_id=legado:1&book_url=https://x/b1", "", 1, true)
	got, err := NetworkSaveStatusHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["found"] != true {
		t.Fatalf("found = %v", got["found"])
	}
	if got["progress"] != 40 {
		t.Errorf("progress = %v", got["progress"])
	}
	if got["done"] != 4 || got["total"] != 10 {
		t.Errorf("done/total = %v/%v", got["done"], got["total"])
	}
	if got["book_id"] != 99 {
		t.Errorf("book_id = %v", got["book_id"])
	}
	if got["status"] != background.StatusRunning {
		t.Errorf("status = %v", got["status"])
	}
}

func TestNetworkLibraryOnlineHandler(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	// 插入一本书与网络书元数据。
	insertBook(t, fx.DB, 1, "三体")
	if _, err := fx.DB.Exec(`INSERT INTO online_book_meta
		(book_id, source_url, origin_book_url, serialize_status, status_manual, last_chapter)
		VALUES (1, 'legado:1', 'https://x/b1', 'serial', 0, '第一章')`); err != nil {
		t.Fatalf("插入元数据失败: %v", err)
	}

	ctx := netCtx(t, fx.DB, http.MethodGet, "/api/library/online", "", 1, true)
	got, err := NetworkLibraryOnlineHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	if got["title"] != "网络书库" {
		t.Errorf("title = %v", got["title"])
	}
	books, _ := got["books"].([]map[string]any)
	if len(books) != 1 {
		t.Fatalf("books = %v", books)
	}
	if books[0]["serialize_status"] != "serial" {
		t.Errorf("serialize_status = %v", books[0]["serialize_status"])
	}
}

func TestNetworkLibraryOnlineHandlerStatusFilter(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	insertBook(t, fx.DB, 1, "A")
	insertBook(t, fx.DB, 2, "B")
	if _, err := fx.DB.Exec(`INSERT INTO online_book_meta
		(book_id, source_url, origin_book_url, serialize_status, status_manual, last_chapter)
		VALUES (1, 's', 'u', 'serial', 0, ''), (2, 's', 'u', 'finished', 0, '')`); err != nil {
		t.Fatalf("插入元数据失败: %v", err)
	}

	ctx := netCtx(t, fx.DB, http.MethodGet, "/api/library/online?status=finished", "", 1, true)
	got, err := NetworkLibraryOnlineHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	books, _ := got["books"].([]map[string]any)
	if len(books) != 1 {
		t.Fatalf("books = %v, want 1", books)
	}
	if books[0]["serialize_status"] != "finished" {
		t.Errorf("serialize_status = %v", books[0]["serialize_status"])
	}
}

func TestNetworkStatusHandlerGetMissing(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	ctx := netCtx(t, fx.DB, http.MethodGet, "/api/network/status?book_id=99", "", 1, true)
	got, err := NetworkStatusHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" || got["meta"] != nil {
		t.Errorf("got %v", got)
	}
}

func TestNetworkStatusHandlerGetFound(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	if _, err := fx.DB.Exec(`INSERT INTO online_book_meta
		(book_id, source_url, origin_book_url, serialize_status, status_manual, last_chapter)
		VALUES (7, 's', 'u', 'serial', 0, 'ch1')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	ctx := netCtx(t, fx.DB, http.MethodGet, "/api/network/status?book_id=7", "", 1, true)
	got, err := NetworkStatusHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	meta, _ := got["meta"].(map[string]any)
	if meta == nil || meta["book_id"] != int64(7) {
		t.Errorf("meta = %v", meta)
	}
}

func TestNetworkStatusHandlerPostInvalidStatus(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	body := `{"book_id":7,"serialize_status":"bogus"}`
	ctx := netCtx(t, fx.DB, http.MethodPost, "/api/network/status", body, 1, true)
	got, err := NetworkStatusHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrParamsError {
		t.Errorf("err = %v", got["err"])
	}
}

func TestNetworkStatusHandlerPostMissingMeta(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	body := `{"book_id":99,"serialize_status":"serial"}`
	ctx := netCtx(t, fx.DB, http.MethodPost, "/api/network/status", body, 1, true)
	got, err := NetworkStatusHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrParamsNotFound {
		t.Errorf("err = %v", got["err"])
	}
}

func TestNetworkStatusHandlerPostUpdates(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	if _, err := fx.DB.Exec(`INSERT INTO online_book_meta
		(book_id, source_url, origin_book_url, serialize_status, status_manual, last_chapter)
		VALUES (7, 's', 'u', 'unknown', 0, '')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	body := `{"book_id":7,"serialize_status":"finished"}`
	ctx := netCtx(t, fx.DB, http.MethodPost, "/api/network/status", body, 1, true)
	got, err := NetworkStatusHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	meta, _ := got["meta"].(map[string]any)
	if meta["serialize_status"] != "finished" {
		t.Errorf("serialize_status = %v", meta["serialize_status"])
	}
	if meta["status_manual"] != true {
		t.Errorf("status_manual = %v, want true", meta["status_manual"])
	}

	// 落库校验。
	var status string
	var manual bool
	if err := fx.DB.QueryRow(`SELECT serialize_status, status_manual
		FROM online_book_meta WHERE book_id = 7`).Scan(&status, &manual); err != nil {
		t.Fatalf("query: %v", err)
	}
	if status != "finished" || !manual {
		t.Errorf("db = %s/%v", status, manual)
	}
}

func TestHasPermission(t *testing.T) {
	// 与真实 Python 实测结果逐条对齐。
	cases := []struct {
		permission string
		op         string
		want       bool
	}{
		{"", "r", true},
		{"r", "r", true},
		{"R", "r", false},
		{"rs", "r", true},
		{"Rs", "r", false},
		{"rS", "s", false},
		{"x", "r", true},
		{"", "s", true},
		{"S", "s", false},
	}
	for _, c := range cases {
		if got := hasPermission(c.permission, c.op, true); got != c.want {
			t.Errorf("hasPermission(%q, %q) = %v, want %v", c.permission, c.op, got, c.want)
		}
	}
}

func TestContextCanReadCanSave(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	// 管理员 permission 为空 → 默认允许。
	ctx := netCtx(t, fx.DB, http.MethodGet, "/", "", 1, true)
	if !ctx.CanRead() {
		t.Error("CanRead must default true")
	}
	if !ctx.CanSave() {
		t.Error("CanSave must default true")
	}

	// 游客：可读不可存。
	guest := netCtx(t, fx.DB, http.MethodGet, "/", "", 0, false)
	if !guest.CanRead() {
		t.Error("guest CanRead must be true")
	}
	if guest.CanSave() {
		t.Error("guest CanSave must be false")
	}
}

func TestContextCanReadDenied(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	if _, err := fx.DB.Exec(`UPDATE readers SET permission = 'R' WHERE id = 1`); err != nil {
		t.Fatalf("update: %v", err)
	}
	ctx := netCtx(t, fx.DB, http.MethodGet, "/", "", 1, false)
	if ctx.CanRead() {
		t.Error("permission 'R' must deny read")
	}
}

func TestContextQueryAndBody(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	ctx := netCtx(t, fx.DB, http.MethodPost, "/x?a=1", `{"k":"v"}`, 1, true)
	if got := ctx.Query("a"); got != "1" {
		t.Errorf("Query(a) = %q", got)
	}
	if got := ctx.Query("missing"); got != "" {
		t.Errorf("Query(missing) = %q", got)
	}
	// Body 可重复读取。
	if string(ctx.Body()) != `{"k":"v"}` {
		t.Errorf("Body = %q", ctx.Body())
	}
	if string(ctx.Body()) != `{"k":"v"}` {
		t.Errorf("second Body = %q", ctx.Body())
	}
}

func TestPrivateBookIDsAdmin(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	ctx := netCtx(t, fx.DB, http.MethodGet, "/", "", 1, true)
	got, err := privateBookIDs(ctx)
	if err != nil {
		t.Fatalf("privateBookIDs: %v", err)
	}
	if len(got) != 0 {
		t.Errorf("admin must see no private books: %v", got)
	}
}

func TestPrivateBookIDsGuest(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	insertItem(t, fx.DB, 5, "private", 1)
	ctx := netCtx(t, fx.DB, http.MethodGet, "/", "", 0, false)
	got, err := privateBookIDs(ctx)
	if err != nil {
		t.Fatalf("privateBookIDs: %v", err)
	}
	if !got[5] {
		t.Errorf("guest must not see private book 5: %v", got)
	}
}

func TestPrivateBookIDsOwnerExcluded(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	insertItem(t, fx.DB, 5, "private", 1)
	// 用户 1 是所有者 → 不在私有集合中。
	ctx := netCtx(t, fx.DB, http.MethodGet, "/", "", 1, false)
	got, err := privateBookIDs(ctx)
	if err != nil {
		t.Fatalf("privateBookIDs: %v", err)
	}
	if got[5] {
		t.Errorf("owner must see own private book: %v", got)
	}
}

func TestRenderBookListPagination(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	for i := int64(1); i <= 5; i++ {
		insertBook(t, fx.DB, i, "书"+string(rune('0'+i)))
	}
	// 调用方（NetworkLibraryOnline）先按 id 倒序，render_book_list 再切片；
	// 与 Python 的 `ids = sorted(..., reverse=True)` 一致。
	ctx := netCtx(t, fx.DB, http.MethodGet, "/?start=0&size=2", "", 1, true)
	got, err := renderBookList(ctx, fx.Cfg, nil, []int64{5, 4, 3, 2, 1}, "标题", true)
	if err != nil {
		t.Fatalf("renderBookList: %v", err)
	}
	if got["total"] != 5 {
		t.Errorf("total = %v, want 5", got["total"])
	}
	books, _ := got["books"].([]map[string]any)
	if len(books) != 2 {
		t.Fatalf("books = %d, want 2", len(books))
	}
	// sort_by_id → 从大到小。
	if books[0]["id"] != int64(5) {
		t.Errorf("first id = %v, want 5", books[0]["id"])
	}
	if books[1]["id"] != int64(4) {
		t.Errorf("second id = %v, want 4", books[1]["id"])
	}
}

func TestRenderBookListSizeClamped(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	ctx := netCtx(t, fx.DB, http.MethodGet, "/?size=99999", "", 1, true)
	got, err := renderBookList(ctx, fx.Cfg, nil, []int64{}, "t", false)
	if err != nil {
		t.Fatalf("renderBookList: %v", err)
	}
	if got["err"] != "ok" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestRenderBookListAttachesReadingState(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	insertBook(t, fx.DB, 1, "三体")
	if _, err := fx.DB.Exec(`INSERT INTO reading_state
		(reader_id, book_id, favorite, wants, read_state, progress)
		VALUES (1, 1, 1, 1, 2, '{}')`); err != nil {
		t.Fatalf("insert state: %v", err)
	}

	ctx := netCtx(t, fx.DB, http.MethodGet, "/", "", 1, true)
	got, err := renderBookList(ctx, fx.Cfg, nil, []int64{1}, "t", false)
	if err != nil {
		t.Fatalf("renderBookList: %v", err)
	}
	books, _ := got["books"].([]map[string]any)
	state, _ := books[0]["state"].(map[string]any)
	if state == nil {
		t.Fatalf("state missing: %v", books[0])
	}
	if state["favorite"] != true || state["wants"] != true {
		t.Errorf("state = %v", state)
	}
}

func TestFormatReadingStateNil(t *testing.T) {
	got := formatReadingState(nil)
	if got["favorite"] != false || got["wants"] != false {
		t.Errorf("got %v", got)
	}
	if got["read_state"] != int64(0) {
		t.Errorf("read_state = %v (%T)", got["read_state"], got["read_state"])
	}
}

func TestIntArg(t *testing.T) {
	if got := intArg("42", 0); got != 42 {
		t.Errorf("got %d", got)
	}
	if got := intArg("abc", 7); got != 7 {
		t.Errorf("got %d, want fallback", got)
	}
	if got := intArg("", 3); got != 3 {
		t.Errorf("got %d, want fallback", got)
	}
}

func TestErrorCodeOr(t *testing.T) {
	err := pluginruntime.NewPluginRuntimeError("source.fetch_failed", "boom", false)
	if got := errorCodeOr(err, ErrSourceFetch); got != "source.fetch_failed" {
		t.Errorf("got %q", got)
	}
	// 通用执行失败 → 用 fallback。
	generic := pluginruntime.NewPluginRuntimeError("plugin.execution_failed", "x", false)
	if got := errorCodeOr(generic, ErrSourceFetch); got != ErrSourceFetch {
		t.Errorf("got %q, want fallback", got)
	}
}

func TestContainsStr(t *testing.T) {
	if !containsStr([]string{"a", "b"}, "b") {
		t.Error("must find b")
	}
	if containsStr([]string{"a"}, "z") {
		t.Error("must not find z")
	}
}

func TestAsStringAny(t *testing.T) {
	if got := asStringAny(nil); got != "" {
		t.Errorf("got %q", got)
	}
	if got := asStringAny("x"); got != "x" {
		t.Errorf("got %q", got)
	}
	if got := asStringAny(42); got != "42" {
		t.Errorf("got %q", got)
	}
}

func TestIntOrZero(t *testing.T) {
	cases := []struct {
		in   any
		want int
	}{
		{nil, 0},
		{5, 5},
		{int64(7), 7},
		{float64(3), 3},
		{"9", 9},
		{"abc", 0},
	}
	for _, c := range cases {
		if got := intOrZero(c.in); got != c.want {
			t.Errorf("intOrZero(%v) = %d, want %d", c.in, got, c.want)
		}
	}
}

func TestSliceHelpers(t *testing.T) {
	ints := []int64{1, 2, 3}
	if got := sliceInt64(ints, 0, 2); len(got) != 2 {
		t.Errorf("got %v", got)
	}
	if got := sliceInt64(ints, 10, 20); len(got) != 0 {
		t.Errorf("out of range must be empty: %v", got)
	}
	if got := sliceInt64(ints, -1, 1); len(got) != 1 {
		t.Errorf("negative start must clamp: %v", got)
	}

	maps := []map[string]any{{"a": 1}, {"b": 2}}
	if got := sliceMaps(maps, 0, 1); len(got) != 1 {
		t.Errorf("got %v", got)
	}
	if got := sliceMaps(maps, 10, 20); len(got) != 0 {
		t.Errorf("out of range must be empty: %v", got)
	}
}

func TestSortHelpers(t *testing.T) {
	ints := []int64{1, 5, 3}
	sortInt64Desc(ints)
	if ints[0] != 5 || ints[2] != 1 {
		t.Errorf("got %v", ints)
	}

	books := []map[string]any{{"id": 1}, {"id": 5}, {"id": 3}}
	sortBooksByIDDesc(books)
	if books[0]["id"] != 5 || books[2]["id"] != 1 {
		t.Errorf("got %v", books)
	}
}

func TestEngineConfigDefaults(t *testing.T) {
	cfg := NetworkConfig{Settings: map[string]any{}}
	got := cfg.engineConfig()
	if got["BOOKSOURCE_HTTP_TIMEOUT"] != 20 {
		t.Errorf("timeout = %v", got["BOOKSOURCE_HTTP_TIMEOUT"])
	}
	if got["BOOKSOURCE_MAX_TOC_PAGES"] != 30 {
		t.Errorf("toc = %v", got["BOOKSOURCE_MAX_TOC_PAGES"])
	}
	if got["BOOKSOURCE_CLEAN_ENABLED"] != true {
		t.Errorf("clean = %v", got["BOOKSOURCE_CLEAN_ENABLED"])
	}
}

func TestItemToDict(t *testing.T) {
	if got := itemToDict(map[string]any{"a": 1}); got["a"] != 1 {
		t.Errorf("got %v", got)
	}
	if got := itemToDict("not a dict"); len(got) != 0 {
		t.Errorf("got %v", got)
	}
}

func TestPageItemsToDicts(t *testing.T) {
	page := &plugindomain.Page{Items: []any{map[string]any{"a": 1}}}
	got, err := pageItemsToDicts(page)
	if err != nil {
		t.Fatalf("pageItemsToDicts: %v", err)
	}
	if len(got) != 1 || got[0]["a"] != 1 {
		t.Errorf("got %v", got)
	}
	// 非 Page → 契约错误。
	if _, err := pageItemsToDicts("nope"); err == nil {
		t.Error("non-Page must error")
	}
}

func TestNetworkSaveHandlerNoSaveOnline(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	seedLegadoSource(t, fx.DB, "源A")
	// SaveOnline 未接线。
	body := `{"source_id":"legado:1","book_url":"https://x/b1"}`
	ctx := netCtx(t, fx.DB, http.MethodPost, "/api/book-sources/save", body, 1, true)
	got, err := NetworkSaveHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "plugin.provider_unavailable" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestNetworkSaveHandlerPermissionDenied(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	if _, err := fx.DB.Exec(`UPDATE readers SET permission = 'S' WHERE id = 1`); err != nil {
		t.Fatalf("update: %v", err)
	}
	body := `{"source_id":"legado:1","book_url":"https://x/b1"}`
	ctx := netCtx(t, fx.DB, http.MethodPost, "/api/book-sources/save", body, 1, false)
	got, err := NetworkSaveHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrNotPermit {
		t.Errorf("err = %v", got["err"])
	}
}

func TestNetworkContentHandlerPermissionDenied(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	if _, err := fx.DB.Exec(`UPDATE readers SET permission = 'R' WHERE id = 1`); err != nil {
		t.Fatalf("update: %v", err)
	}
	ctx := netCtx(t, fx.DB, http.MethodGet,
		"/api/book-sources/content?source_id=legado:1&chapter_url=x", "", 1, false)
	got, err := NetworkContentHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrNotPermit {
		t.Errorf("err = %v", got["err"])
	}
}

func TestNetworkSaveHandlerTitleTruncated(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	// 超长书名（>20 字符）。
	long := strings.Repeat("长", 30)
	if _, err := fx.DB.Exec(`INSERT INTO book_sources
		(name, url, "group", enabled, weight, raw, create_time, update_time)
		VALUES (?, 'https://x', '', 1, 0, '{}', '', '')`, long); err != nil {
		t.Fatalf("insert: %v", err)
	}
	fx.Cfg.SaveOnline = func(*Context, string, string, string, bool, int64) error { return nil }

	body := `{"source_id":"legado:1","book_url":"https://x/b1"}`
	ctx := netCtx(t, fx.DB, http.MethodPost, "/api/book-sources/save", body, 1, true)
	if _, err := NetworkSaveHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	// 任务名应为 [online] + 前 20 个字符。
	tasks := fx.Bg.GetRunningTasks(10)
	if len(tasks) != 1 {
		t.Fatalf("tasks = %v", tasks)
	}
	item, _ := tasks[0]["service_item"].(string)
	want := "[online]" + strings.Repeat("长", 20)
	if item != want {
		t.Errorf("service_item = %q, want %q", item, want)
	}
}

func TestFinishReadBatch(t *testing.T) {
	called := false
	batch := &booksourcesearch.RuntimeBatch{
		RunID: "run1",
		Finalize: func(*booksourcesearch.RuntimeBatch, map[string]any) error {
			called = true
			return nil
		},
	}
	if err := finishReadBatch(nil, booksourcesearch.RuntimeUpdate{Batch: batch}); err != nil {
		t.Fatalf("finishReadBatch: %v", err)
	}
	if !called {
		t.Error("finalize must be called")
	}
}

func TestFinishReadBatchNilBatch(t *testing.T) {
	// 无 batch 或 finalize 时静默跳过。
	if err := finishReadBatch(nil, booksourcesearch.RuntimeUpdate{}); err != nil {
		t.Errorf("got %v", err)
	}
	if err := finishReadBatch(nil, booksourcesearch.RuntimeUpdate{
		Batch: &booksourcesearch.RuntimeBatch{RunID: "x"},
	}); err != nil {
		t.Errorf("got %v", err)
	}
}

func TestIsJSRuleUnsupported(t *testing.T) {
	if isJSRuleUnsupported(nil) {
		t.Error("nil must be false")
	}
	if !isJSRuleUnsupported(errors.New("js_unsupported: rule needs JS")) {
		t.Error("message containing js_unsupported must match")
	}
	if !isJSRuleUnsupported(pluginruntime.NewPluginRuntimeError("js_unsupported", "x", false)) {
		t.Error("code js_unsupported must match")
	}
	if isJSRuleUnsupported(errors.New("other failure")) {
		t.Error("unrelated error must not match")
	}
}

func TestNetworkExploreHandlerJSRuleUnsupported(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID,
		func(method string, args []any, _ map[string]any) (any, error) {
			if method == "browse" {
				return nil, pluginruntime.NewPluginRuntimeError("js_unsupported", "needs JS", false)
			}
			return nil, nil
		})
	seedLegadoSource(t, fx.DB, "源A")

	ctx := netCtx(t, fx.DB, http.MethodGet,
		"/api/book-sources/browse?source_id=legado:1&url=cat1", "", 1, true)
	got, err := NetworkExploreHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrSourceJS {
		t.Errorf("err = %v, want %s", got["err"], ErrSourceJS)
	}
}

func TestNetworkExploreHandlerInvalidResult(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID,
		func(method string, args []any, _ map[string]any) (any, error) {
			if method == "browse" {
				return "not a page", nil
			}
			return nil, nil
		})
	seedLegadoSource(t, fx.DB, "源A")

	ctx := netCtx(t, fx.DB, http.MethodGet,
		"/api/book-sources/browse?source_id=legado:1&url=cat1", "", 1, true)
	_, err := NetworkExploreHandler(fx.Cfg)(ctx)
	if err == nil {
		t.Fatal("expected contract error")
	}
}

func TestNetworkCategoriesHandlerInvalidResult(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID,
		func(method string, args []any, _ map[string]any) (any, error) {
			if method == "get_categories" {
				return "not categories", nil
			}
			return nil, nil
		})
	seedLegadoSource(t, fx.DB, "源A")

	ctx := netCtx(t, fx.DB, http.MethodGet,
		"/api/book-sources/categories?source_id=legado:1", "", 1, true)
	_, err := NetworkCategoriesHandler(fx.Cfg)(ctx)
	if err == nil {
		t.Fatal("expected contract error")
	}
}

func TestNetworkBookHandlerInvalidResult(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID,
		func(method string, args []any, _ map[string]any) (any, error) {
			if method == "get_book" {
				return "not a detail", nil
			}
			return nil, nil
		})
	seedLegadoSource(t, fx.DB, "源A")

	ctx := netCtx(t, fx.DB, http.MethodGet,
		"/api/book-sources/book?source_id=legado:1&book_url=https://x/b1", "", 1, true)
	_, err := NetworkBookHandler(fx.Cfg)(ctx)
	if err == nil {
		t.Fatal("expected contract error")
	}
}

func TestNetworkTocHandlerInvalidResult(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID,
		func(method string, args []any, _ map[string]any) (any, error) {
			if method == "get_toc" {
				return "not chapters", nil
			}
			return nil, nil
		})
	seedLegadoSource(t, fx.DB, "源A")

	ctx := netCtx(t, fx.DB, http.MethodGet,
		"/api/book-sources/toc?source_id=legado:1&toc_url=https://x/t", "", 1, true)
	_, err := NetworkTocHandler(fx.Cfg)(ctx)
	if err == nil {
		t.Fatal("expected contract error")
	}
}

func TestNetworkContentHandlerInvalidResult(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID,
		func(method string, args []any, _ map[string]any) (any, error) {
			if method == "get_chapter" {
				return "not content", nil
			}
			return nil, nil
		})
	seedLegadoSource(t, fx.DB, "源A")

	ctx := netCtx(t, fx.DB, http.MethodGet,
		"/api/book-sources/content?source_id=legado:1&chapter_url=x", "", 1, true)
	_, err := NetworkContentHandler(fx.Cfg)(ctx)
	if err == nil {
		t.Fatal("expected contract error")
	}
}

func TestNetworkSearchHandlerSourceFiltering(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID,
		func(method string, args []any, _ map[string]any) (any, error) {
			if method == "search" {
				return &plugindomain.Page{}, nil
			}
			return nil, nil
		})
	seedLegadoSource(t, fx.DB, "源A")
	seedLegadoSource(t, fx.DB, "源B")

	// 按 sources 过滤（legacy_id 数字形式）。
	ctx := netCtx(t, fx.DB, http.MethodGet,
		"/api/book-sources/search?key=q&sources=1", "", 1, true)
	got, err := NetworkSearchHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["total"] != 1 {
		t.Errorf("total = %v, want 1", got["total"])
	}
}

func TestNetworkSearchHandlerGroupFiltering(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID,
		func(method string, args []any, _ map[string]any) (any, error) {
			if method == "search" {
				return &plugindomain.Page{}, nil
			}
			return nil, nil
		})
	seedLegadoSource(t, fx.DB, "源A")

	ctx := netCtx(t, fx.DB, http.MethodGet,
		"/api/book-sources/search?key=q&group=分组", "", 1, true)
	got, err := NetworkSearchHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["total"] != 1 {
		t.Errorf("total = %v, want 1", got["total"])
	}
}

func TestNetworkSearchHandlerModeAll(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID,
		func(method string, args []any, _ map[string]any) (any, error) {
			if method == "search" {
				return &plugindomain.Page{}, nil
			}
			return nil, nil
		})
	seedLegadoSource(t, fx.DB, "源A")

	ctx := netCtx(t, fx.DB, http.MethodGet,
		"/api/book-sources/search?key=q&mode=all", "", 1, true)
	got, err := NetworkSearchHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["mode"] != "all" {
		t.Errorf("mode = %v", got["mode"])
	}
}

func TestNetworkSearchHandlerTopKLimit(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID,
		func(method string, args []any, _ map[string]any) (any, error) {
			if method == "search" {
				return &plugindomain.Page{}, nil
			}
			return nil, nil
		})
	// TOP_K = 1，插入 2 条书源。
	fx.Cfg.Settings["BOOKSOURCE_SEARCH_TOP_K"] = 1
	seedLegadoSource(t, fx.DB, "源A")
	seedLegadoSource(t, fx.DB, "源B")

	ctx := netCtx(t, fx.DB, http.MethodGet, "/api/book-sources/search?key=q", "", 1, true)
	got, err := NetworkSearchHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["total"] != 1 {
		t.Errorf("total = %v, want 1 (top_k limit)", got["total"])
	}
}

func TestNetworkSourcesHandlerCatalogError(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	fx.Cfg.Catalog = func(*Context) (*sourcecatalog.Service, error) {
		return nil, errors.New("catalog down")
	}
	ctx := netCtx(t, fx.DB, http.MethodGet, "/api/book-sources", "", 1, true)
	if _, err := NetworkSourcesHandler(fx.Cfg)(ctx); err == nil {
		t.Fatal("expected error")
	}
}

func TestGetSourceCatalogError(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	fx.Cfg.Catalog = func(*Context) (*sourcecatalog.Service, error) {
		return nil, errors.New("catalog down")
	}
	ctx := netCtx(t, fx.DB, http.MethodGet, "/", "", 1, true)
	if _, err := fx.Cfg.getSource(ctx, "x"); err == nil {
		t.Fatal("expected error")
	}
}

func TestNetworkCatalogDefaultConstruction(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	// 不注入 Catalog → 走默认构造路径。
	cfg := NetworkConfig{Settings: fx.Cfg.Settings}
	ctx := netCtx(t, fx.DB, http.MethodGet, "/", "", 1, true)
	catalog, err := cfg.networkCatalog(ctx)
	if err != nil {
		t.Fatalf("networkCatalog: %v", err)
	}
	if catalog == nil {
		t.Error("catalog must not be nil")
	}
}

func TestSearchAndBackgroundDefaults(t *testing.T) {
	// 未注入时回退到全局单例。
	cfg := NetworkConfig{}
	if cfg.searchService() == nil {
		t.Error("searchService must fall back to singleton")
	}
	if cfg.backgroundService() == nil {
		t.Error("backgroundService must fall back to singleton")
	}
}

func TestSettingOr(t *testing.T) {
	s := map[string]any{"a": 1, "b": nil}
	if got := settingOr(s, "a", 9); got != 1 {
		t.Errorf("got %v", got)
	}
	// nil 值视为缺失。
	if got := settingOr(s, "b", 9); got != 9 {
		t.Errorf("got %v, want fallback", got)
	}
	if got := settingOr(s, "missing", 9); got != 9 {
		t.Errorf("got %v, want fallback", got)
	}
}

func TestLegacyIDOf(t *testing.T) {
	if got := legacyIDOf(&sourcecatalog.SourceBinding{}); got != nil {
		t.Errorf("got %v, want nil", got)
	}
	id := int64(7)
	if got := legacyIDOf(&sourcecatalog.SourceBinding{LegacyID: &id}); got != int64(7) {
		t.Errorf("got %v", got)
	}
}

func TestToIntSetting(t *testing.T) {
	s := map[string]any{
		"n": 5, "bad": "abc", "i64": int64(7), "f64": float64(9), "str": "11",
	}
	if got := toIntSetting(s, "n", 1); got != 5 {
		t.Errorf("got %d", got)
	}
	if got := toIntSetting(s, "i64", 1); got != 7 {
		t.Errorf("int64: got %d", got)
	}
	if got := toIntSetting(s, "f64", 1); got != 9 {
		t.Errorf("float64: got %d", got)
	}
	if got := toIntSetting(s, "str", 1); got != 11 {
		t.Errorf("string: got %d", got)
	}
	if got := toIntSetting(s, "missing", 3); got != 3 {
		t.Errorf("got %d, want fallback", got)
	}
	if got := toIntSetting(s, "bad", 4); got != 4 {
		t.Errorf("got %d, want fallback", got)
	}
}

func TestLoadFormattedBooksEmpty(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	ctx := netCtx(t, fx.DB, http.MethodGet, "/", "", 1, true)
	got, err := loadFormattedBooks(ctx, fx.Cfg, nil)
	if err != nil {
		t.Fatalf("loadFormattedBooks: %v", err)
	}
	if len(got) != 0 {
		t.Errorf("got %v, want empty", got)
	}
}

func TestDecodeJSONMapOrEmpty(t *testing.T) {
	if got := decodeJSONMapOrEmpty(""); len(got) != 0 {
		t.Errorf("empty = %v", got)
	}
	if got := decodeJSONMapOrEmpty("null"); len(got) != 0 {
		t.Errorf("null = %v", got)
	}
	if got := decodeJSONMapOrEmpty("bad json"); len(got) != 0 {
		t.Errorf("bad = %v", got)
	}
	if got := decodeJSONMapOrEmpty(`{"a":1}`); got["a"] != float64(1) {
		t.Errorf("got %v", got)
	}
}

func TestSliceMapsClamping(t *testing.T) {
	maps := []map[string]any{{"a": 1}, {"b": 2}}
	// end < start → 空。
	if got := sliceMaps(maps, 2, 1); len(got) != 0 {
		t.Errorf("got %v", got)
	}
	// 负 start → 钳到 0。
	if got := sliceMaps(maps, -1, 1); len(got) != 1 {
		t.Errorf("got %v", got)
	}
}

func TestNetworkSearchStatusHealthUpdates(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID,
		func(method string, args []any, _ map[string]any) (any, error) {
			if method == "search" {
				return nil, pluginruntime.NewPluginRuntimeError("source.fetch_failed", "boom", false)
			}
			return nil, nil
		})
	seedLegadoSource(t, fx.DB, "源A")

	createCtx := netCtx(t, fx.DB, http.MethodGet, "/api/book-sources/search?key=q", "", 1, true)
	created, _ := NetworkSearchHandler(fx.Cfg)(createCtx)
	taskID, _ := created["task_id"].(string)

	for i := 0; i < 300; i++ {
		time.Sleep(2 * time.Millisecond)
		ctx := netCtx(t, fx.DB, http.MethodGet,
			"/api/book-sources/search/status?task_id="+taskID, "", 1, true)
		got, err := NetworkSearchStatusHandler(fx.Cfg)(ctx)
		if err != nil {
			t.Fatalf("status: %v", err)
		}
		if got["finished"] == true {
			break
		}
	}

	// 失败的源 → 连接 health 为 degraded。
	var health string
	if err := fx.DB.QueryRow(`SELECT COALESCE(health,'') FROM plugin_connections LIMIT 1`).Scan(&health); err != nil {
		t.Fatalf("query health: %v", err)
	}
	if health != "degraded" {
		t.Errorf("health = %q, want degraded", health)
	}
}

func TestPublicBookWithoutRewriter(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	book := map[string]any{"media_type": "comic", "cover_url": "https://x/c.jpg"}
	got := fx.Cfg.publicBook(nil, book, "legado:1")
	// 未注入改写器时原样返回。
	if got["cover_url"] != "https://x/c.jpg" {
		t.Errorf("cover_url = %v", got["cover_url"])
	}
}

func TestPublicBookWithRewriter(t *testing.T) {
	fx := newNetFixture(t, sourcecatalog.LegadoPluginID, nil)
	fx.Cfg.ComicCoverRewriter = func(_ *Context, book map[string]any, sourceKey string) map[string]any {
		if book["media_type"] == "comic" {
			book["cover_url"] = "/api/book-sources/comic/image?token=abc"
		}
		return book
	}
	book := map[string]any{"media_type": "comic", "cover_url": "https://x/c.jpg"}
	got := fx.Cfg.publicBook(nil, book, "legado:1")
	if got["cover_url"] != "/api/book-sources/comic/image?token=abc" {
		t.Errorf("cover_url = %v", got["cover_url"])
	}
}

func TestJSONBodyDecoding(t *testing.T) {
	// 确保测试用的 JSON 与 handler 的解析一致。
	var req map[string]any
	if err := json.Unmarshal([]byte(`{"book_id":7,"serialize_status":"serial"}`), &req); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if intOrZero(req["book_id"]) != 7 {
		t.Errorf("book_id = %v", req["book_id"])
	}
}
