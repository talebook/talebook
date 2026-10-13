package httpapi

import (
	"archive/zip"
	"database/sql"
	"encoding/binary"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"talebook/booksvr/internal/comic"
	"talebook/booksvr/internal/userdb"

	_ "modernc.org/sqlite"
)

// comicTestDB 建一个含 items / reading_state / readers 的内存库。
func comicTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	stmts := []string{
		`CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT, sort TEXT, timestamp TEXT,
			pubdate TEXT, series_index REAL, author_sort TEXT, isbn TEXT, lccn TEXT, path TEXT,
			flags INTEGER, uuid TEXT, has_cover BOOLEAN, last_modified TEXT)`,
		`CREATE TABLE authors (id INTEGER PRIMARY KEY, name TEXT, sort TEXT, link TEXT)`,
		`CREATE TABLE books_authors_link (id INTEGER PRIMARY KEY, book INTEGER, author INTEGER)`,
		`CREATE TABLE tags (id INTEGER PRIMARY KEY, name TEXT)`,
		`CREATE TABLE books_tags_link (id INTEGER PRIMARY KEY, book INTEGER, tag INTEGER)`,
		`CREATE TABLE publishers (id INTEGER PRIMARY KEY, name TEXT, sort TEXT)`,
		`CREATE TABLE books_publishers_link (id INTEGER PRIMARY KEY, book INTEGER, publisher INTEGER)`,
		`CREATE TABLE series (id INTEGER PRIMARY KEY, name TEXT, sort TEXT)`,
		`CREATE TABLE books_series_link (id INTEGER PRIMARY KEY, book INTEGER, series INTEGER)`,
		`CREATE TABLE ratings (id INTEGER PRIMARY KEY, rating INTEGER)`,
		`CREATE TABLE books_ratings_link (id INTEGER PRIMARY KEY, book INTEGER, rating INTEGER)`,
		`CREATE TABLE languages (id INTEGER PRIMARY KEY, lang_code TEXT)`,
		`CREATE TABLE books_languages_link (id INTEGER PRIMARY KEY, book INTEGER, lang_code INTEGER,
			item_order INTEGER DEFAULT 0)`,
		`CREATE TABLE comments (id INTEGER PRIMARY KEY, book INTEGER, text TEXT)`,
		`CREATE TABLE identifiers (id INTEGER PRIMARY KEY, book INTEGER, type TEXT, val TEXT)`,
		`CREATE TABLE data (id INTEGER PRIMARY KEY, book INTEGER, format TEXT, uncompressed_size INTEGER,
			name TEXT)`,
		`CREATE TABLE book_formats (book_id INTEGER, format TEXT, path TEXT, size INTEGER, mtime INTEGER,
			PRIMARY KEY (book_id, format))`,
		`CREATE TABLE items (book_id INTEGER PRIMARY KEY, count_guest INTEGER DEFAULT 0,
			count_visit INTEGER DEFAULT 0, count_download INTEGER DEFAULT 0, website TEXT DEFAULT '',
			collector_id INTEGER, scope TEXT DEFAULT 'public', book_type TEXT DEFAULT 'ebook',
			media_type TEXT DEFAULT 'unknown', media_type_locked BOOLEAN DEFAULT 0,
			create_time TEXT, src_path TEXT DEFAULT '')`,
		`CREATE TABLE reading_state (book_id INTEGER, reader_id INTEGER, favorite INTEGER DEFAULT 0,
			favorite_date TEXT, wants INTEGER DEFAULT 0, wants_date TEXT, read_state INTEGER DEFAULT 0,
			read_date TEXT, online_read INTEGER DEFAULT 0, download INTEGER DEFAULT 0,
			progress TEXT, progress_update_time TEXT, PRIMARY KEY (book_id, reader_id))`,
		`CREATE TABLE readers (id INTEGER PRIMARY KEY, username TEXT, password TEXT, salt TEXT,
			permission TEXT, name TEXT, email TEXT, admin BOOLEAN, active BOOLEAN,
			create_time TEXT, update_time TEXT, access_time TEXT, extra TEXT, avatar TEXT)`,
	}
	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			t.Fatalf("建表失败: %v\n%s", err, s)
		}
	}
	return db
}

// comicPNG 生成最小 PNG 头。
func comicPNG(w, h int) []byte {
	b := make([]byte, 24)
	copy(b, []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'})
	binary.BigEndian.PutUint32(b[16:20], uint32(w))
	binary.BigEndian.PutUint32(b[20:24], uint32(h))
	return b
}

// comicZip 生成一个 cbz 文件，返回路径。
func comicZip(t *testing.T, entries map[string][]byte) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "c.cbz")
	f, err := os.Create(path)
	if err != nil {
		t.Fatalf("创建失败: %v", err)
	}
	zw := zip.NewWriter(f)
	for name, data := range entries {
		w, err := zw.Create(name)
		if err != nil {
			t.Fatalf("创建条目失败: %v", err)
		}
		if _, err := w.Write(data); err != nil {
			t.Fatalf("写入失败: %v", err)
		}
	}
	if err := zw.Close(); err != nil {
		t.Fatalf("关闭失败: %v", err)
	}
	f.Close()
	return path
}

// comicSeed 插入一本书（books + items 两表）。
func comicSeed(t *testing.T, db *sql.DB, bookID int64, mediaType, scope string, collector int64) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO books (id, title, path, has_cover, last_modified)
		VALUES (?, ?, ?, 0, '2026-01-01 00:00:00')`, bookID, "漫画"+itoa(bookID), "p"+itoa(bookID)); err != nil {
		t.Fatalf("插入 books 失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO items (book_id, media_type, scope, collector_id)
		VALUES (?, ?, ?, ?)`, bookID, mediaType, scope, collector); err != nil {
		t.Fatalf("插入 items 失败: %v", err)
	}
}

// comicSeedFormat 登记一个格式，供 comicBookData 解析。
//
// 需同时写 data（提供格式清单）与 book_formats（提供路径）。
func comicSeedFormat(t *testing.T, db *sql.DB, bookID int64, format, path string) {
	t.Helper()
	upper := strings.ToUpper(format)
	if _, err := db.Exec(`INSERT INTO data (book, format, uncompressed_size, name)
		VALUES (?, ?, 0, ?)`, bookID, upper, filepath.Base(path)); err != nil {
		t.Fatalf("插入 data 失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO book_formats (book_id, format, path, size, mtime)
		VALUES (?, ?, ?, 0, 0)`, bookID, upper, path); err != nil {
		t.Fatalf("插入 book_formats 失败: %v", err)
	}
}

// comicSeedReader 插入一个读者。
func comicSeedReader(t *testing.T, db *sql.DB, id int64, admin, active bool, perm string) {
	t.Helper()
	a, act := 0, 0
	if admin {
		a = 1
	}
	if active {
		act = 1
	}
	if _, err := db.Exec(`INSERT INTO readers (id, username, password, salt, permission, name,
		email, admin, active, create_time, update_time, access_time, extra)
		VALUES (?, ?, '', '', ?, ?, '', ?, ?, 't', 't', 't', '{}')`,
		id, "u"+itoa(id), perm, "u"+itoa(id), a, act); err != nil {
		t.Fatalf("插入 readers 失败: %v", err)
	}
}

// comicCtx 构造请求上下文。
func comicCtx(t *testing.T, db *sql.DB, method, target, body string, userID int64, params ...string) (*Context, *httptest.ResponseRecorder) {
	t.Helper()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(method, target, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	ctx := &Context{
		Request: req, Writer: rec, DB: db, Params: params,
		Identity: Identity{UserID: userID, Username: "u" + itoa(userID)},
	}
	// 复刻 can_view_book：管理员或非 private 可见，否则仅收藏者可见。
	ctx.isPublic = func(bookID int64) (bool, error) {
		item, err := userdb.GetItem(db, bookID)
		if err != nil {
			return false, err
		}
		if item == nil || item.Scope != "private" {
			return true, nil
		}
		if userID <= 0 {
			return false, nil
		}
		user, err := userdb.GetReaderByID(db, userID)
		if err != nil {
			return false, err
		}
		if user == nil {
			return false, nil
		}
		if user.Admin {
			return true, nil
		}
		return item.CollectorID.Valid && item.CollectorID.Int64 == user.ID, nil
	}
	return ctx, rec
}

// TestComicManifest 覆盖清单接口。
func TestComicManifest(t *testing.T) {
	db := comicTestDB(t)
	comicSeed(t, db, 1, "comic", "public", 0)
	comicSeedReader(t, db, 7, false, true, "")
	path := comicZip(t, map[string][]byte{
		"page1.png": comicPNG(800, 600),
		"page2.png": comicPNG(1024, 768),
	})
	comicSeedFormat(t, db, 1, "cbz", path)

	cfg := ComicConfig{CookieSecret: "s3cret", LibraryRoot: filepath.Dir(path)}
	svc := comic.NewService()
	// 直接注入容器路径（绕过 library 表）。
	ctx, _ := comicCtx(t, db, http.MethodGet, "/api/book/1/comic/pages", "", 7, "1")

	resp, err := ComicManifestHandler(cfg, svc)(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("应成功: %v", resp)
	}
	if resp["contract_version"] != 1 {
		t.Errorf("contract_version = %v", resp["contract_version"])
	}
	if resp["pages_count"] != 2 {
		t.Errorf("pages_count = %v", resp["pages_count"])
	}
	if resp["format"] != "CBZ" {
		t.Errorf("format = %v", resp["format"])
	}
	pages := resp["pages"].([]map[string]any)
	if len(pages) != 2 {
		t.Fatalf("应有 2 页，得到 %d", len(pages))
	}
	// URL 应带 token。
	u, _ := pages[0]["url"].(string)
	if !strings.Contains(u, "token=") {
		t.Errorf("url 应含 token: %q", u)
	}
	if pages[0]["width"] != 800 || pages[0]["height"] != 600 {
		t.Errorf("尺寸不符: %v", pages[0])
	}
}

// TestComicManifestBadBook 覆盖书籍不存在。
func TestComicManifestBadBook(t *testing.T) {
	db := comicTestDB(t)
	comicSeedReader(t, db, 7, false, true, "")
	cfg := ComicConfig{CookieSecret: "s"}
	ctx, _ := comicCtx(t, db, http.MethodGet, "/api/book/1/comic/pages", "", 7, "1")

	resp, err := ComicManifestHandler(cfg, comic.NewService())(ctx)
	if err != nil {
		t.Fatalf("不应返回 error: %v", err)
	}
	if resp["err"] != "comic.book_not_found" {
		t.Errorf("err = %v", resp["err"])
	}
}

// TestComicManifestNotComic 覆盖非漫画书。
func TestComicManifestNotComic(t *testing.T) {
	db := comicTestDB(t)
	comicSeed(t, db, 1, "ebook", "public", 0)
	comicSeedReader(t, db, 7, false, true, "")
	cfg := ComicConfig{CookieSecret: "s"}
	ctx, _ := comicCtx(t, db, http.MethodGet, "/api/book/1/comic/pages", "", 7, "1")

	resp, _ := ComicManifestHandler(cfg, comic.NewService())(ctx)
	if resp["err"] != "comic.media_type" {
		t.Errorf("err = %v, want comic.media_type", resp["err"])
	}
}

// TestComicManifestNoPermission 覆盖无阅读权限。
func TestComicManifestNoPermission(t *testing.T) {
	db := comicTestDB(t)
	comicSeed(t, db, 1, "comic", "public", 0)
	comicSeedReader(t, db, 7, false, true, "R") // 大写 R = 拒绝阅读
	cfg := ComicConfig{CookieSecret: "s"}
	ctx, _ := comicCtx(t, db, http.MethodGet, "/api/book/1/comic/pages", "", 7, "1")

	resp, _ := ComicManifestHandler(cfg, comic.NewService())(ctx)
	if resp["err"] != "comic.no_permission" {
		t.Errorf("err = %v (msg=%v), want comic.no_permission", resp["err"], resp["msg"])
	}
}

// TestComicManifestInactive 覆盖账号未激活。
func TestComicManifestInactive(t *testing.T) {
	db := comicTestDB(t)
	comicSeed(t, db, 1, "comic", "public", 0)
	comicSeedReader(t, db, 7, false, false, "")
	cfg := ComicConfig{CookieSecret: "s"}
	ctx, _ := comicCtx(t, db, http.MethodGet, "/api/book/1/comic/pages", "", 7, "1")

	resp, _ := ComicManifestHandler(cfg, comic.NewService())(ctx)
	if resp["err"] != "comic.account_inactive" {
		t.Errorf("err = %v, want comic.account_inactive", resp["err"])
	}
}

// TestComicManifestPrivateBook 覆盖私有书权限。
func TestComicManifestPrivateBook(t *testing.T) {
	db := comicTestDB(t)
	comicSeed(t, db, 1, "comic", "private", 99) // 收藏者是 99
	comicSeedFormat(t, db, 1, "cbz", filepath.Join(t.TempDir(), "missing.cbz"))
	comicSeedReader(t, db, 7, false, true, "")
	cfg := ComicConfig{CookieSecret: "s"}

	// 用户 7 无权。
	ctx, _ := comicCtx(t, db, http.MethodGet, "/api/book/1/comic/pages", "", 7, "1")
	resp, _ := ComicManifestHandler(cfg, comic.NewService())(ctx)
	if resp["err"] != "comic.book_not_found" {
		t.Errorf("非收藏者应看不到，得到 %v", resp["err"])
	}

	// 管理员可见（但容器缺失）。
	comicSeedReader(t, db, 8, true, true, "")
	ctx, _ = comicCtx(t, db, http.MethodGet, "/api/book/1/comic/pages", "", 8, "1")
	resp, _ = ComicManifestHandler(cfg, comic.NewService())(ctx)
	if resp["err"] == "comic.book_not_found" {
		t.Error("管理员应可见")
	}
}

// TestComicProgressRoundTrip 覆盖进度读写。
func TestComicProgressRoundTrip(t *testing.T) {
	db := comicTestDB(t)
	comicSeed(t, db, 1, "comic", "public", 0)
	comicSeedReader(t, db, 7, false, true, "")
	path := comicZip(t, map[string][]byte{
		"p1.png": comicPNG(100, 100),
		"p2.png": comicPNG(100, 100),
		"p3.png": comicPNG(100, 100),
	})
	comicSeedFormat(t, db, 1, "cbz", path)
	cfg := ComicConfig{CookieSecret: "s"}
	svc := comic.NewService()

	// 先取清单拿 revision 与 pageId。
	ctx, _ := comicCtx(t, db, http.MethodGet, "/api/book/1/comic/pages", "", 7, "1")
	manResp, _ := ComicManifestHandler(cfg, svc)(ctx)
	rev := manResp["revision"].(string)
	pages := manResp["pages"].([]map[string]any)
	pageID := pages[1]["id"].(string)

	// GET 初始进度应为空。
	ctx, _ = comicCtx(t, db, http.MethodGet, "/api/book/1/comic/progress", "", 7, "1")
	resp, err := ComicProgressHandler(cfg, svc)(ctx)
	if err != nil {
		t.Fatalf("GET 失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("GET 应成功: %v", resp)
	}
	if len(resp["progress"].(map[string]any)) != 0 {
		t.Errorf("初始进度应为空: %v", resp["progress"])
	}

	// POST 保存进度。
	body, _ := json.Marshal(map[string]any{"progress": map[string]any{
		"kind": "comic", "version": 1, "pageId": pageID, "pageIndex": 1,
		"percent": 66.67, "completed": false,
	}})
	ctx, _ = comicCtx(t, db, http.MethodPost, "/api/book/1/comic/progress", string(body), 7, "1")
	resp, err = ComicProgressHandler(cfg, svc)(ctx)
	if err != nil {
		t.Fatalf("POST 失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("POST 应成功: %v", resp)
	}
	saved := resp["progress"].(map[string]any)
	if saved["pageIndex"] != 1 || saved["pageId"] != pageID {
		t.Errorf("保存结果不符: %v", saved)
	}

	// GET 应读回。
	ctx, _ = comicCtx(t, db, http.MethodGet, "/api/book/1/comic/progress", "", 7, "1")
	resp, _ = ComicProgressHandler(cfg, svc)(ctx)
	got := resp["progress"].(map[string]any)
	if got["pageIndex"] != 1 {
		t.Errorf("读回进度不符: %v", got)
	}
	if resp["update_time"] == nil {
		t.Error("update_time 不应为 nil")
	}
	_ = rev
}

// TestComicProgressValidation 覆盖进度校验分支。
func TestComicProgressValidation(t *testing.T) {
	db := comicTestDB(t)
	comicSeed(t, db, 1, "comic", "public", 0)
	comicSeedReader(t, db, 7, false, true, "")
	path := comicZip(t, map[string][]byte{"p1.png": comicPNG(100, 100)})
	comicSeedFormat(t, db, 1, "cbz", path)
	cfg := ComicConfig{CookieSecret: "s"}
	svc := comic.NewService()

	cases := []struct{ name, body, wantErr string }{
		{"非法 JSON", `{bad`, "comic.progress_invalid"},
		{"缺 progress", `{}`, "comic.progress_invalid"},
		{"progress 非对象", `{"progress":"x"}`, "comic.progress_invalid"},
		{"kind 错误", `{"progress":{"kind":"x","version":1,"pageIndex":0}}`, "comic.progress_invalid"},
		{"version 错误", `{"progress":{"kind":"comic","version":9,"pageIndex":0}}`, "comic.progress_invalid"},
		{"pageIndex 非数字", `{"progress":{"kind":"comic","version":1,"pageIndex":"x"}}`, "comic.progress_invalid"},
	}
	for _, c := range cases {
		ctx, _ := comicCtx(t, db, http.MethodPost, "/api/book/1/comic/progress", c.body, 7, "1")
		resp, err := ComicProgressHandler(cfg, svc)(ctx)
		if err != nil {
			t.Fatalf("%s: 不应返回 error: %v", c.name, err)
		}
		if resp["err"] != c.wantErr {
			t.Errorf("%s: err = %v, want %v", c.name, resp["err"], c.wantErr)
		}
	}
}

// TestComicProgressStale 覆盖过期进度。
func TestComicProgressStale(t *testing.T) {
	db := comicTestDB(t)
	comicSeed(t, db, 1, "comic", "public", 0)
	comicSeedReader(t, db, 7, false, true, "")
	path := comicZip(t, map[string][]byte{"p1.png": comicPNG(100, 100), "p2.png": comicPNG(100, 100)})
	comicSeedFormat(t, db, 1, "cbz", path)
	cfg := ComicConfig{CookieSecret: "s"}
	svc := comic.NewService()

	// pageId 与规范化结果不符 → stale。
	body := `{"progress":{"kind":"comic","version":1,"pageId":"wrong","pageIndex":0,"percent":50,"completed":false}}`
	ctx, _ := comicCtx(t, db, http.MethodPost, "/api/book/1/comic/progress", body, 7, "1")
	resp, _ := ComicProgressHandler(cfg, svc)(ctx)
	if resp["err"] != "comic.progress_stale" {
		t.Errorf("err = %v, want comic.progress_stale", resp["err"])
	}

	// percent 非数字 → stale。
	body = `{"progress":{"kind":"comic","version":1,"pageIndex":0,"percent":"x","completed":false}}`
	ctx, _ = comicCtx(t, db, http.MethodPost, "/api/book/1/comic/progress", body, 7, "1")
	resp, _ = ComicProgressHandler(cfg, svc)(ctx)
	if resp["err"] != "comic.progress_stale" {
		t.Errorf("percent 非数字应 stale，得到 %v", resp["err"])
	}

	// completed 非布尔 → stale。
	body = `{"progress":{"kind":"comic","version":1,"pageIndex":0,"percent":50,"completed":"x"}}`
	ctx, _ = comicCtx(t, db, http.MethodPost, "/api/book/1/comic/progress", body, 7, "1")
	resp, _ = ComicProgressHandler(cfg, svc)(ctx)
	if resp["err"] != "comic.progress_stale" {
		t.Errorf("completed 非布尔应 stale，得到 %v", resp["err"])
	}
}

// TestComicProgressTooLarge 覆盖请求体过大。
func TestComicProgressTooLarge(t *testing.T) {
	db := comicTestDB(t)
	comicSeed(t, db, 1, "comic", "public", 0)
	comicSeedReader(t, db, 7, false, true, "")
	path := comicZip(t, map[string][]byte{"p1.png": comicPNG(100, 100)})
	comicSeedFormat(t, db, 1, "cbz", path)
	cfg := ComicConfig{CookieSecret: "s"}

	big := `{"progress":"` + strings.Repeat("x", maxComicProgressBytes+10) + `"}`
	ctx, _ := comicCtx(t, db, http.MethodPost, "/api/book/1/comic/progress", big, 7, "1")
	resp, _ := ComicProgressHandler(cfg, comic.NewService())(ctx)
	if resp["err"] != "comic.progress_invalid" {
		t.Errorf("err = %v, want comic.progress_invalid", resp["err"])
	}
}

// TestComicPageToken 覆盖页级令牌的签发与校验。
func TestComicPageToken(t *testing.T) {
	cfg := ComicConfig{CookieSecret: "s3cret", Clock: func() int64 { return 1791565386 }}

	token, err := createPageToken(cfg, 5, 3, "rev1", 7)
	if err != nil {
		t.Fatalf("签发失败: %v", err)
	}

	db := comicTestDB(t)
	comicSeedReader(t, db, 7, false, true, "")

	// 正确作用域应通过。
	ctx, _ := comicCtx(t, db, http.MethodGet, "/api/book/5/comic/pages/3?revision=rev1&token="+token, "", 0)
	u, err := pageTokenUser(ctx, cfg, 5, 3, "rev1")
	if err != nil || u == nil || u.ID != 7 {
		t.Fatalf("令牌校验应通过: (%v,%v)", u, err)
	}

	// 作用域不匹配。
	for _, c := range []struct {
		name      string
		bookID    int64
		pageIndex int
		revision  string
	}{
		{"book 不符", 6, 3, "rev1"},
		{"页码不符", 5, 4, "rev1"},
		{"revision 不符", 5, 3, "rev2"},
	} {
		ctx, _ := comicCtx(t, db, http.MethodGet, "/api/book/5/comic/pages/3?token="+token, "", 0)
		if _, err := pageTokenUser(ctx, cfg, c.bookID, c.pageIndex, c.revision); err == nil {
			t.Errorf("%s 应拒绝", c.name)
		}
	}

	// 无 token。
	ctx, _ = comicCtx(t, db, http.MethodGet, "/api/book/5/comic/pages/3", "", 0)
	if _, err := pageTokenUser(ctx, cfg, 5, 3, "rev1"); err == nil {
		t.Error("无 token 应拒绝")
	}

	// 伪造 token。
	ctx, _ = comicCtx(t, db, http.MethodGet, "/api/book/5/comic/pages/3?token=bogus", "", 0)
	if _, err := pageTokenUser(ctx, cfg, 5, 3, "rev1"); err == nil {
		t.Error("伪造 token 应拒绝")
	}

	// 用户不存在。
	token2, _ := createPageToken(cfg, 5, 3, "rev1", 999)
	ctx, _ = comicCtx(t, db, http.MethodGet, "/api/book/5/comic/pages/3?token="+token2, "", 0)
	if _, err := pageTokenUser(ctx, cfg, 5, 3, "rev1"); err == nil {
		t.Error("用户不存在应拒绝")
	}
}

// TestComicPageServesImage 覆盖分页接口返回图片。
func TestComicPageServesImage(t *testing.T) {
	db := comicTestDB(t)
	comicSeed(t, db, 1, "comic", "public", 0)
	comicSeedReader(t, db, 7, false, true, "")
	img := comicPNG(100, 100)
	path := comicZip(t, map[string][]byte{"p1.png": img})
	comicSeedFormat(t, db, 1, "cbz", path)
	cfg := ComicConfig{CookieSecret: "s"}
	svc := comic.NewService()

	// 先取 revision。
	ctx, _ := comicCtx(t, db, http.MethodGet, "/api/book/1/comic/pages", "", 7, "1")
	manResp, _ := ComicManifestHandler(cfg, svc)(ctx)
	rev := manResp["revision"].(string)

	// 登录态取图。
	ctx, rec := comicCtx(t, db, http.MethodGet, "/api/book/1/comic/pages/0?revision="+rev, "", 7, "1", "0")
	resp, err := ComicPageHandler(cfg, svc)(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if resp != nil {
		t.Errorf("分页接口应自行写响应，得到 %v", resp)
	}
	if rec.Code != http.StatusOK {
		t.Errorf("状态码 = %d", rec.Code)
	}
	if rec.Header().Get("Content-Type") != "image/png" {
		t.Errorf("Content-Type = %q", rec.Header().Get("Content-Type"))
	}
	if rec.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Error("应设置 nosniff")
	}
	if rec.Body.Len() != len(img) {
		t.Errorf("响应体长度 = %d, want %d", rec.Body.Len(), len(img))
	}
}

// TestComicPageErrors 覆盖分页接口的错误分支。
func TestComicPageErrors(t *testing.T) {
	db := comicTestDB(t)
	comicSeed(t, db, 1, "comic", "public", 0)
	comicSeedReader(t, db, 7, false, true, "")
	path := comicZip(t, map[string][]byte{"p1.png": comicPNG(100, 100)})
	comicSeedFormat(t, db, 1, "cbz", path)
	cfg := ComicConfig{CookieSecret: "s"}
	svc := comic.NewService()

	// 游客无 token → 401 纯文本。
	ctx, rec := comicCtx(t, db, http.MethodGet, "/api/book/1/comic/pages/0", "", 0, "1", "0")
	if _, err := ComicPageHandler(cfg, svc)(ctx); err != nil {
		t.Fatalf("不应返回 error: %v", err)
	}
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("游客无 token 应 401，得到 %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "凭证") {
		t.Errorf("错误体应含提示，得到 %q", rec.Body.String())
	}

	// 页码越界 → 404。
	ctx, rec = comicCtx(t, db, http.MethodGet, "/api/book/1/comic/pages/99", "", 7, "1", "99")
	ComicPageHandler(cfg, svc)(ctx)
	if rec.Code != http.StatusNotFound {
		t.Errorf("越界应 404，得到 %d", rec.Code)
	}

	// 非法参数 → 404。
	ctx, rec = comicCtx(t, db, http.MethodGet, "/api/book/abc/comic/pages/xyz", "", 7, "abc", "xyz")
	ComicPageHandler(cfg, svc)(ctx)
	if rec.Code != http.StatusNotFound {
		t.Errorf("非法参数应 404，得到 %d", rec.Code)
	}
}

// TestComicReaderRedirectsGuest 覆盖阅读器页面的游客重定向。
func TestComicReaderRedirectsGuest(t *testing.T) {
	db := comicTestDB(t)
	cfg := ComicConfig{CookieSecret: "s"}
	ctx, rec := comicCtx(t, db, http.MethodGet, "/read-comic/1", "", 0, "1")

	if _, err := ComicReaderHandler(cfg)(ctx); err != nil {
		t.Fatalf("不应返回 error: %v", err)
	}
	if rec.Code != http.StatusFound {
		t.Errorf("游客应重定向，得到 %d", rec.Code)
	}
	if loc := rec.Header().Get("Location"); loc != "/login" {
		t.Errorf("Location = %q, want /login", loc)
	}
}

// TestComicReaderServesHTML 覆盖阅读器页面渲染。
func TestComicReaderServesHTML(t *testing.T) {
	db := comicTestDB(t)
	comicSeed(t, db, 1, "comic", "public", 0)
	comicSeedReader(t, db, 7, false, true, "")
	path := comicZip(t, map[string][]byte{"p1.png": comicPNG(100, 100)})
	comicSeedFormat(t, db, 1, "cbz", path)
	cfg := ComicConfig{CookieSecret: "s"}

	ctx, rec := comicCtx(t, db, http.MethodGet, "/read-comic/1", "", 7, "1")
	if _, err := ComicReaderHandler(cfg)(ctx); err != nil {
		t.Fatalf("不应返回 error: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("应 200，得到 %d", rec.Code)
	}
	body := rec.Body.String()
	if !strings.Contains(body, `data-book-id="1"`) {
		t.Errorf("页面应含 book id: %q", body)
	}
	if !strings.Contains(body, komgaReaderVersion) {
		t.Error("页面应含阅读器版本")
	}
	if rec.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Error("应设置 nosniff")
	}
}

// TestComicReaderBadBook 覆盖阅读器页面的书籍错误。
func TestComicReaderBadBook(t *testing.T) {
	db := comicTestDB(t)
	comicSeedReader(t, db, 7, false, true, "")
	cfg := ComicConfig{CookieSecret: "s"}

	ctx, rec := comicCtx(t, db, http.MethodGet, "/read-comic/1", "", 7, "1")
	ComicReaderHandler(cfg)(ctx)
	if rec.Code != http.StatusNotFound {
		t.Errorf("书籍不存在应 404，得到 %d", rec.Code)
	}

	// 非法 book_id。
	ctx, rec = comicCtx(t, db, http.MethodGet, "/read-comic/abc", "", 7, "abc")
	ComicReaderHandler(cfg)(ctx)
	if rec.Code != http.StatusNotFound {
		t.Errorf("非法 id 应 404，得到 %d", rec.Code)
	}
}

// TestComicCaptchaGate 覆盖人机验证门禁。
func TestComicCaptchaGate(t *testing.T) {
	db := comicTestDB(t)
	comicSeed(t, db, 1, "comic", "public", 0)
	comicSeedReader(t, db, 7, false, true, "")
	path := comicZip(t, map[string][]byte{"p1.png": comicPNG(100, 100)})
	comicSeedFormat(t, db, 1, "cbz", path)
	cfg := ComicConfig{
		CookieSecret:   "s",
		CaptchaEnabled: func(scene string) bool { return scene == "read" },
	}

	// 未通过验证 → 403 captcha.required。
	ctx, rec := comicCtx(t, db, http.MethodGet, "/api/book/1/comic/pages", "", 7, "1")
	resp, err := ComicManifestHandler(cfg, comic.NewService())(ctx)
	if err != nil {
		t.Fatalf("不应返回 error: %v", err)
	}
	if resp != nil {
		t.Errorf("应自行写响应，得到 %v", resp)
	}
	if rec.Code != http.StatusForbidden {
		t.Errorf("应 403，得到 %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "captcha.required") {
		t.Errorf("错误体不符: %q", rec.Body.String())
	}

	// 带验证通过 cookie → 放行。
	ctx, _ = comicCtx(t, db, http.MethodGet, "/api/book/1/comic/pages", "", 7, "1")
	ctx.Request.AddCookie(&http.Cookie{Name: captchaGrantCookie("read"), Value: "1"})
	resp, err = ComicManifestHandler(cfg, comic.NewService())(ctx)
	if err != nil || resp["err"] != "ok" {
		t.Errorf("带验证 cookie 应放行: resp=%v err=%v", resp, err)
	}
}

// TestComicCaptchaRedirect 覆盖阅读器页面的验证重定向。
func TestComicCaptchaRedirect(t *testing.T) {
	db := comicTestDB(t)
	comicSeed(t, db, 1, "comic", "public", 0)
	comicSeedReader(t, db, 7, false, true, "")
	path := comicZip(t, map[string][]byte{"p1.png": comicPNG(100, 100)})
	comicSeedFormat(t, db, 1, "cbz", path)
	cfg := ComicConfig{
		CookieSecret:   "s",
		CaptchaEnabled: func(scene string) bool { return scene == "read" },
	}

	ctx, rec := comicCtx(t, db, http.MethodGet, "/read-comic/1", "", 7, "1")
	ComicReaderHandler(cfg)(ctx)
	if rec.Code != http.StatusFound {
		t.Fatalf("应重定向，得到 %d", rec.Code)
	}
	loc := rec.Header().Get("Location")
	if !strings.HasPrefix(loc, "/book/1/verify?") {
		t.Errorf("Location = %q", loc)
	}
	if !strings.Contains(loc, "scene=read") || !strings.Contains(loc, "next_b64=") {
		t.Errorf("Location 应含 scene 与 next_b64: %q", loc)
	}
}

// TestComicRouteSpecs 校验 4 条路由的注册属性。
func TestComicRouteSpecs(t *testing.T) {
	specs := ComicRouteSpecs(ComicConfig{}, nil)
	if len(specs) != 4 {
		t.Fatalf("应有 4 条路由，得到 %d", len(specs))
	}
	byPattern := map[string]RouteSpec{}
	for _, s := range specs {
		byPattern[s.Pattern] = s
	}
	if s, ok := byPattern[rComicReader]; !ok || s.Auth {
		t.Errorf("阅读器页面不应要求 @auth（自行重定向）: %+v", s)
	}
	if s, ok := byPattern[rComicManifest]; !ok || !s.Auth {
		t.Errorf("清单应要求登录: %+v", s)
	}
	if s, ok := byPattern[rComicPage]; !ok || s.Auth {
		t.Errorf("分页不应要求 @auth（支持令牌）: %+v", s)
	}
	if s, ok := byPattern[rComicProgress]; !ok || !s.Auth || len(s.Methods) != 2 {
		t.Errorf("进度应要求登录且支持 GET+POST: %+v", s)
	}
}

// TestNormalizeComicProgress 覆盖进度规范化。
func TestNormalizeComicProgress(t *testing.T) {
	m := &comic.Manifest{Revision: "r", Pages: []comic.Page{
		{Index: 0, PageID: "r:0"}, {Index: 1, PageID: "r:1"}, {Index: 2, PageID: "r:2"},
	}}

	// nil。
	if normalizeComicProgress(m, nil) != nil {
		t.Error("nil 应返回 nil")
	}
	// 越界上界应夹到最后一页。
	got := normalizeComicProgress(m, map[string]any{"kind": "comic", "version": float64(1), "pageIndex": float64(99)})
	if got["pageIndex"] != 2 || got["completed"] != true {
		t.Errorf("越界应夹到最后一页: %v", got)
	}
	// 负值应夹到 0。
	got = normalizeComicProgress(m, map[string]any{"kind": "comic", "version": float64(1), "pageIndex": float64(-5)})
	if got["pageIndex"] != 0 || got["completed"] != false {
		t.Errorf("负值应夹到 0: %v", got)
	}
	// 空页清单。
	empty := &comic.Manifest{}
	if normalizeComicProgress(empty, map[string]any{"kind": "comic", "version": float64(1), "pageIndex": float64(0)}) != nil {
		t.Error("空清单应返回 nil")
	}
}

// TestRoundTo2 覆盖两位小数舍入。
func TestRoundTo2(t *testing.T) {
	cases := map[float64]float64{66.666: 66.67, 50: 50, 33.333: 33.33, 0: 0}
	for in, want := range cases {
		if got := roundTo2(in); got != want {
			t.Errorf("roundTo2(%v) = %v, want %v", in, got, want)
		}
	}
}

// TestIsFiniteNumberAndBool 覆盖类型判定。
func TestIsFiniteNumberAndBool(t *testing.T) {
	if !isFiniteNumber(float64(1)) || !isFiniteNumber(int64(1)) || !isFiniteNumber(1) {
		t.Error("数字应返回 true")
	}
	if isFiniteNumber("x") || isFiniteNumber(true) || isFiniteNumber(nil) {
		t.Error("非数字应返回 false")
	}
	if !isBool(true) || !isBool(false) {
		t.Error("布尔应返回 true")
	}
	if isBool("true") || isBool(1) {
		t.Error("非布尔应返回 false")
	}
}

// TestComicErrorEnvelope 覆盖错误信封。
func TestComicErrorEnvelope(t *testing.T) {
	got := comicErrorEnvelope(comic.NewError("comic.x", "消息", 404))
	if got["err"] != "comic.x" || got["msg"] != "消息" {
		t.Errorf("信封不符: %v", got)
	}
	// 非 comic.Error 走兜底。
	got = comicErrorEnvelope(os.ErrNotExist)
	if got["err"] != "comic.error" {
		t.Errorf("兜底 err = %v", got["err"])
	}
}

// TestReadBodyLimited 覆盖请求体限长。
func TestReadBodyLimited(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader("hello"))
	b, err := readBodyLimited(req, 10)
	if err != nil || string(b) != "hello" {
		t.Errorf("正常读取 = (%q,%v)", b, err)
	}

	req = httptest.NewRequest(http.MethodPost, "/", strings.NewReader("0123456789ABCDEF"))
	if _, err := readBodyLimited(req, 10); err == nil {
		t.Error("超长应报错")
	}

	if _, err := readBodyLimited(nil, 10); err == nil {
		t.Error("nil 请求应报错")
	}
}

// TestCanUserViewBook 覆盖书籍可见性判定。
func TestCanUserViewBook(t *testing.T) {
	db := comicTestDB(t)
	comicSeed(t, db, 1, "comic", "public", 0)
	comicSeed(t, db, 2, "comic", "private", 7)

	ctx := &Context{DB: db}
	// 公开书任何人可见。
	if ok, err := canUserViewBook(ctx, 1, nil); err != nil || !ok {
		t.Errorf("公开书应可见: (%v,%v)", ok, err)
	}
	// 私有书：收藏者可见。
	if ok, _ := canUserViewBook(ctx, 2, &userdb.Reader{ID: 7}); !ok {
		t.Error("收藏者应可见")
	}
	// 私有书：他人不可见。
	if ok, _ := canUserViewBook(ctx, 2, &userdb.Reader{ID: 8}); ok {
		t.Error("他人不应可见")
	}
	// 私有书：管理员可见。
	if ok, _ := canUserViewBook(ctx, 2, &userdb.Reader{ID: 8, Admin: true}); !ok {
		t.Error("管理员应可见")
	}
	// 私有书：游客不可见。
	if ok, _ := canUserViewBook(ctx, 2, nil); ok {
		t.Error("游客不应可见")
	}
	// 不存在的书视为可见（无 items 记录）。
	if ok, _ := canUserViewBook(ctx, 999, nil); !ok {
		t.Error("无 items 记录应视为可见")
	}
}
