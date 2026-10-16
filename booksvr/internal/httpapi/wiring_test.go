package httpapi

import (
	"database/sql"
	"net/http"
	"os"
	"path/filepath"
	"testing"

	"talebook/booksvr/internal/userdb"
)

// newWiringFixture 建库并返回接线器。
func newWiringFixture(t *testing.T) (*bookWiring, *audioWiring, *sql.DB) {
	t.Helper()
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	settings := map[string]any{
		"site_title":        "测试站点",
		"DEFAULT_PAGE_SIZE": 60,
		"ALLOW_GUEST_READ":  true,
	}
	return newBookWiring(db, db, settings, nil), newAudioWiring(db, db, settings, t.TempDir()), db
}

// ---- bookPublicURL ----

func TestBookPublicURL(t *testing.T) {
	cases := []struct {
		base string
		in   string
		want string
	}{
		{"", "/api/x", "/api/x"},
		{"/", "/api/x", "/api/x"},
		{"/tb", "/api/x", "/tb/api/x"},
		{"tb", "/api/x", "/tb/api/x"},
		{"/tb/", "/api/x", "/tb/api/x"},
		{"/tb", "api/x", "/tb/api/x"},
		{"/tb", "", "/tb"},
	}
	for _, c := range cases {
		if got := bookPublicURL(c.base)(c.in); got != c.want {
			t.Errorf("base=%q in=%q got=%q want=%q", c.base, c.in, got, c.want)
		}
	}
}

// ---- BookConfig 接线 ----

func TestBookWiringCanViewBook(t *testing.T) {
	w, _, db := newWiringFixture(t)
	cfg := w.Config("https://cdn.example.com")
	insertBook(t, db, 10, "三体")
	if _, err := db.Exec(`INSERT INTO items (book_id, count_guest, count_visit, count_download,
		website, collector_id, scope, book_type, media_type, media_type_locked, src_path)
		VALUES (10, 0, 0, 0, '', 2, 'private', 'book', 'ebook', 0, '')`); err != nil {
		t.Fatalf("插入 items 失败: %v", err)
	}

	owner := pluginCtx(t, db, http.MethodGet, "/", "", 2, false)
	if !cfg.CanViewBook(owner, 10) {
		t.Fatalf("所有者应可见")
	}
	other := pluginCtx(t, db, http.MethodGet, "/", "", 1, false)
	if cfg.CanViewBook(other, 10) {
		t.Fatalf("非所有者不可见")
	}
	admin := pluginCtx(t, db, http.MethodGet, "/", "", 1, true)
	if !cfg.CanViewBook(admin, 10) {
		t.Fatalf("管理员可见")
	}
}

func TestBookWiringPrivateBookIDs(t *testing.T) {
	w, _, db := newWiringFixture(t)
	cfg := w.Config("")
	if _, err := db.Exec(`INSERT INTO items (book_id, count_guest, count_visit, count_download,
		website, collector_id, scope, book_type, media_type, media_type_locked, src_path)
		VALUES (10, 0, 0, 0, '', 2, 'private', 'book', 'ebook', 0, '')`); err != nil {
		t.Fatalf("插入 items 失败: %v", err)
	}
	ctx := pluginCtx(t, db, http.MethodGet, "/", "", 1, false)
	got, err := cfg.PrivateBookIDs(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if !got[10] {
		t.Fatalf("应含 10: %+v", got)
	}
}

func TestBookWiringSearch(t *testing.T) {
	w, _, db := newWiringFixture(t)
	cfg := w.Config("")
	insertBook(t, db, 10, "三体")
	ctx := pluginCtx(t, db, http.MethodGet, "/", "", 1, false)

	ids, err := cfg.Search(ctx, "三体")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(ids) != 1 || ids[0] != 10 {
		t.Fatalf("ids = %+v", ids)
	}
}

func TestBookWiringSearchField(t *testing.T) {
	w, _, db := newWiringFixture(t)
	cfg := w.Config("")
	insertBook(t, db, 10, "三体")
	if _, err := db.Exec(`INSERT INTO authors (id, name, sort) VALUES (1, '刘慈欣', '刘慈欣')`); err != nil {
		t.Fatalf("插入作者失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO books_authors_link (book, author) VALUES (10, 1)`); err != nil {
		t.Fatalf("关联作者失败: %v", err)
	}
	ctx := pluginCtx(t, db, http.MethodGet, "/", "", 1, false)
	ids, err := cfg.SearchField(ctx, "author", "刘慈欣")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(ids) != 1 || ids[0] != 10 {
		t.Fatalf("ids = %+v", ids)
	}
}

func TestBookWiringBookTitle(t *testing.T) {
	w, _, db := newWiringFixture(t)
	cfg := w.Config("")
	insertBook(t, db, 10, "三体")
	if got := cfg.BookTitle(10); got != "三体" {
		t.Fatalf("got = %q", got)
	}
	if got := cfg.BookTitle(999); got != "" {
		t.Fatalf("不存在的书应返回空串: %q", got)
	}
}

func TestBookWiringNavTags(t *testing.T) {
	w, _, db := newWiringFixture(t)
	cfg := w.Config("")
	if _, err := db.Exec(`INSERT INTO tags (id, name) VALUES (1, '科幻')`); err != nil {
		t.Fatalf("插入标签失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO books_tags_link (book, tag) VALUES (10, 1)`); err != nil {
		t.Fatalf("关联标签失败: %v", err)
	}
	ctx := pluginCtx(t, db, http.MethodGet, "/", "", 1, false)
	got, err := cfg.NavTags(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got["科幻"] != 1 {
		t.Fatalf("got = %+v", got)
	}
}

func TestBookWiringHotBooks(t *testing.T) {
	w, _, db := newWiringFixture(t)
	cfg := w.Config("")
	if _, err := db.Exec(`INSERT INTO items (book_id, count_guest, count_visit, count_download,
		website, collector_id, scope, book_type, media_type, media_type_locked, src_path)
		VALUES (10, 0, 5, 3, '', NULL, 'public', 'book', 'ebook', 0, '')`); err != nil {
		t.Fatalf("插入 items 失败: %v", err)
	}
	ctx := pluginCtx(t, db, http.MethodGet, "/", "", 1, false)
	ids, total, err := cfg.HotBooks(ctx, 0, 60)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if total != 1 || len(ids) != 1 || ids[0] != 10 {
		t.Fatalf("ids=%+v total=%d", ids, total)
	}
}

func TestBookWiringReadingStateWrites(t *testing.T) {
	w, _, db := newWiringFixture(t)
	cfg := w.Config("")
	if _, err := db.Exec(`INSERT INTO readers (id, username, password, salt, name, email, avatar,
		admin, active, permission, create_time, update_time, access_time, extra)
		VALUES (1, 'alice', 'x', 'y', 'alice', 'a@example.com', '', 0, 1, '',
		'2026-01-01 00:00:00', '2026-01-01 00:00:00', '2026-01-01 00:00:00', '{}')`); err != nil {
		t.Fatalf("插入读者失败: %v", err)
	}
	ctx := pluginCtx(t, db, http.MethodPost, "/", "", 1, false)

	if err := cfg.SetReadState(ctx, 10, map[string]any{"read_state": 1, "online_read": 1}); err != nil {
		t.Fatalf("SetReadState 失败: %v", err)
	}
	if err := cfg.SetProgress(ctx, 10, map[string]any{"cfi": "x"}); err != nil {
		t.Fatalf("SetProgress 失败: %v", err)
	}
	if err := cfg.SetFavorite(ctx, 10, true); err != nil {
		t.Fatalf("SetFavorite 失败: %v", err)
	}
	if err := cfg.SetShelf(ctx, 10, true); err != nil {
		t.Fatalf("SetShelf 失败: %v", err)
	}

	state, err := userdb.GetReadingState(db, 10, 1)
	if err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if state.ReadState != 1 || !state.IsFavorite() || !state.IsWants() {
		t.Fatalf("state = %+v", state)
	}
	if state.GetProgress()["cfi"] != "x" {
		t.Fatalf("progress = %+v", state.GetProgress())
	}
}

func TestBookWiringSetScopeAndMediaType(t *testing.T) {
	w, _, db := newWiringFixture(t)
	cfg := w.Config("")
	if _, err := db.Exec(`INSERT INTO items (book_id, count_guest, count_visit, count_download,
		website, collector_id, scope, book_type, media_type, media_type_locked, src_path)
		VALUES (10, 0, 0, 0, '', NULL, 'public', 'book', 'ebook', 0, '')`); err != nil {
		t.Fatalf("插入 items 失败: %v", err)
	}
	ctx := pluginCtx(t, db, http.MethodPost, "/", "", 1, false)

	if err := cfg.SetScope(ctx, 10, "private"); err != nil {
		t.Fatalf("SetScope 失败: %v", err)
	}
	if err := cfg.SetMediaType(ctx, 10, "comic"); err != nil {
		t.Fatalf("SetMediaType 失败: %v", err)
	}
	item, err := userdb.GetItemScope(db, 10)
	if err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if item.Scope != "private" || item.MediaType != "comic" {
		t.Fatalf("item = %+v", item)
	}
}

func TestBookWiringAllowGuestRead(t *testing.T) {
	w, _, _ := newWiringFixture(t)
	if !w.Config("").AllowGuestRead {
		t.Fatalf("ALLOW_GUEST_READ=true 应生效")
	}
	w2 := newBookWiring(nil, nil, map[string]any{}, nil)
	if w2.Config("").AllowGuestRead {
		t.Fatalf("默认应为 false")
	}
}

// ---- AudioConfig 接线 ----

func TestAudioWiringCanViewBook(t *testing.T) {
	_, a, db := newWiringFixture(t)
	cfg := a.Config("https://cdn.example.com", nil)
	insertBook(t, db, 10, "三体")
	ctx := pluginCtx(t, db, http.MethodGet, "/", "", 1, false)
	if !cfg.CanViewBook(ctx, 10) {
		t.Fatalf("公开书应可见")
	}
}

func TestAudioWiringAudioFile(t *testing.T) {
	_, a, db := newWiringFixture(t)
	cfg := a.Config("", nil)
	audioSeedEdition(t, db, 1, 10, "published", "2026-01-05 00:00:00")
	audioSeedChapter(t, db, 100, 1, 1, "第一章")

	path, err := cfg.AudioFile(1, 1)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	// 章节 audio_path 为空时回落到 missing.mp3。
	if filepath.Base(path) != "missing.mp3" {
		t.Fatalf("path = %q", path)
	}
}

func TestAudioWiringAudioFileMissingChapter(t *testing.T) {
	_, a, _ := newWiringFixture(t)
	cfg := a.Config("", nil)
	path, err := cfg.AudioFile(99, 1)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if filepath.Base(path) != "missing.mp3" {
		t.Fatalf("path = %q", path)
	}
}

func TestAudioWiringFreeBytes(t *testing.T) {
	_, a, _ := newWiringFixture(t)
	cfg := a.Config("", nil)
	n, err := cfg.FreeBytes()
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if n <= 0 {
		t.Fatalf("可用空间应为正数: %d", n)
	}
}

func TestDiskFreeBytesEmptyPath(t *testing.T) {
	if _, err := diskFreeBytes(""); err == nil {
		t.Fatalf("空路径应报错")
	}
}

func TestDiskFreeBytesCreatesDir(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "a", "b")
	if _, err := diskFreeBytes(dir); err != nil {
		t.Fatalf("失败: %v", err)
	}
	if _, err := os.Stat(dir); err != nil {
		t.Fatalf("目录应被创建: %v", err)
	}
}

// ---- WebDAVConfig 接线 ----

func TestWebDAVWiringEnabled(t *testing.T) {
	cfg := (&webdavWiring{settings: map[string]any{"ENABLE_WEBDAV_SERVICE": true}}).Config(DemoModeConfig{})
	if !cfg.Enabled() {
		t.Fatalf("应开启")
	}
	cfg2 := (&webdavWiring{settings: map[string]any{}}).Config(DemoModeConfig{})
	if cfg2.Enabled() {
		t.Fatalf("默认应关闭")
	}
}

func TestWebDAVWiringDemoReadOnly(t *testing.T) {
	cfg := (&webdavWiring{settings: map[string]any{}}).Config(DemoModeConfig{Enabled: true})
	ctx := pluginCtx(t, nil, http.MethodGet, "/", "", 1, false)
	if !cfg.DemoReadOnly(ctx) {
		t.Fatalf("演示模式应为只读")
	}
	cfg2 := (&webdavWiring{settings: map[string]any{}}).Config(DemoModeConfig{})
	if cfg2.DemoReadOnly(ctx) {
		t.Fatalf("非演示模式不应只读")
	}
}

func TestWebDAVWiringServe(t *testing.T) {
	called := false
	cfg := (&webdavWiring{
		settings: map[string]any{},
		serve:    func(ctx *Context) bool { called = true; return true },
	}).Config(DemoModeConfig{})
	ctx := pluginCtx(t, nil, http.MethodGet, "/", "", 1, false)
	if !cfg.Serve(ctx) || !called {
		t.Fatalf("Serve 应被调用")
	}
}
