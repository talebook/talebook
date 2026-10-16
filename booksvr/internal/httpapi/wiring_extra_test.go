package httpapi

import (
	"net/http"
	"os"
	"testing"

	"talebook/booksvr/internal/userdb"
)

// TestBookWiringAutoLogin 覆盖 autoLogin 与 IsBookOwner 接线。
func TestBookWiringAutoLogin(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)

	off := newBookWiring(db, db, map[string]any{}, nil)
	if off.autoLogin() {
		t.Fatalf("默认应为 false")
	}
	on := newBookWiring(db, db, map[string]any{"auto_login": 1}, nil)
	if !on.autoLogin() {
		t.Fatalf("auto_login=1 应为 true")
	}

	if _, err := db.Exec(`INSERT INTO items (book_id, count_guest, count_visit, count_download,
		website, collector_id, scope, book_type, media_type, media_type_locked, src_path)
		VALUES (10, 0, 0, 0, '', NULL, 'public', 'book', 'ebook', 0, '')`); err != nil {
		t.Fatalf("插入 items 失败: %v", err)
	}
	ctx := pluginCtx(t, db, http.MethodGet, "/", "", 1, false)
	if !on.Config("").IsBookOwner(ctx, 10) {
		t.Fatalf("auto_login 开启时公开书视为共有")
	}
	if off.Config("").IsBookOwner(ctx, 10) {
		t.Fatalf("auto_login 关闭时应为 false")
	}
}

// TestBookWiringAliasBookIDs 覆盖别名检索接线。
func TestBookWiringAliasBookIDs(t *testing.T) {
	w, _, db := newWiringFixture(t)
	cfg := w.Config("")
	ctx := pluginCtx(t, db, http.MethodGet, "/", "", 1, false)

	ids, err := cfg.AliasBookIDs(ctx, "三体")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(ids) != 0 {
		t.Fatalf("空别名表应返回空: %+v", ids)
	}
}

// TestBookWiringAliasAuthorNames 覆盖作者别名接线。
func TestBookWiringAliasAuthorNames(t *testing.T) {
	w, _, db := newWiringFixture(t)
	cfg := w.Config("")
	ctx := pluginCtx(t, db, http.MethodGet, "/", "", 1, false)

	names, err := cfg.AliasAuthorNames(ctx, "刘慈欣")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(names) != 0 {
		t.Fatalf("空别名表应返回空: %+v", names)
	}
}

// TestBookWiringBooksForCategory 覆盖分类检索接线。
func TestBookWiringBooksForCategory(t *testing.T) {
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

	ids, err := cfg.BooksForCategory(ctx, "authors", "刘慈欣")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(ids) != 1 || ids[0] != 10 {
		t.Fatalf("ids = %+v", ids)
	}

	// 不存在的分类项返回空。
	ids, err = cfg.BooksForCategory(ctx, "authors", "不存在")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(ids) != 0 {
		t.Fatalf("不存在的作者应返回空: %+v", ids)
	}
}

// TestBookWiringSetReadStateWithoutOptional 覆盖可选字段缺省分支。
func TestBookWiringSetReadStateWithoutOptional(t *testing.T) {
	w, _, db := newWiringFixture(t)
	cfg := w.Config("")
	if _, err := db.Exec(`INSERT INTO readers (id, username, password, salt, name, email, avatar,
		admin, active, permission, create_time, update_time, access_time, extra)
		VALUES (1, 'alice', 'x', 'y', 'alice', 'a@example.com', '', 0, 1, '',
		'2026-01-01 00:00:00', '2026-01-01 00:00:00', '2026-01-01 00:00:00', '{}')`); err != nil {
		t.Fatalf("插入读者失败: %v", err)
	}
	ctx := pluginCtx(t, db, http.MethodPost, "/", "", 1, false)

	// 不传 online_read / download。
	if err := cfg.SetReadState(ctx, 10, map[string]any{"read_state": 2}); err != nil {
		t.Fatalf("失败: %v", err)
	}
	state, err := userdb.GetReadingState(db, 10, 1)
	if err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if state.ReadState != 2 {
		t.Fatalf("state = %+v", state)
	}
}

// TestAudioWiringIsBookOwner 覆盖有声书的书主判定接线。
func TestAudioWiringIsBookOwner(t *testing.T) {
	_, a, db := newWiringFixture(t)
	cfg := a.Config("", nil)
	if _, err := db.Exec(`INSERT INTO items (book_id, count_guest, count_visit, count_download,
		website, collector_id, scope, book_type, media_type, media_type_locked, src_path)
		VALUES (10, 0, 0, 0, '', 1, 'private', 'book', 'ebook', 0, '')`); err != nil {
		t.Fatalf("插入 items 失败: %v", err)
	}
	owner := pluginCtx(t, db, http.MethodGet, "/", "", 1, false)
	if !cfg.IsBookOwner(owner, 10) {
		t.Fatalf("所有者应为 true")
	}
	other := pluginCtx(t, db, http.MethodGet, "/", "", 2, false)
	if cfg.IsBookOwner(other, 10) {
		t.Fatalf("非所有者应为 false")
	}
}

// TestAudioWiringAudioFileWithPath 覆盖章节有 audio_path 的分支。
func TestAudioWiringAudioFileWithPath(t *testing.T) {
	_, a, db := newWiringFixture(t)
	cfg := a.Config("", nil)
	audioSeedEdition(t, db, 1, 10, "published", "2026-01-05 00:00:00")
	if _, err := db.Exec(`INSERT INTO audiobook_chapters
		(id, edition_id, source_key, number, title, audio_path, duration_ms, size_bytes)
		VALUES (100, 1, 'k', 1, '第一章', '/data/audio/1/1.mp3', 20000, 512)`); err != nil {
		t.Fatalf("插入章节失败: %v", err)
	}
	path, err := cfg.AudioFile(1, 1)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if path != "/data/audio/1/1.mp3" {
		t.Fatalf("path = %q", path)
	}
}

// TestAudioWiringAudioFileDBError 覆盖查询失败分支。
func TestAudioWiringAudioFileDBError(t *testing.T) {
	_, a, db := newWiringFixture(t)
	cfg := a.Config("", nil)
	if err := db.Close(); err != nil {
		t.Fatalf("关闭失败: %v", err)
	}
	if _, err := cfg.AudioFile(1, 1); err == nil {
		t.Fatalf("应报错")
	}
}

// TestAudioWiringCanViewBookPrivate 覆盖私藏书判定。
func TestAudioWiringCanViewBookPrivate(t *testing.T) {
	_, a, db := newWiringFixture(t)
	cfg := a.Config("", nil)
	if _, err := db.Exec(`INSERT INTO items (book_id, count_guest, count_visit, count_download,
		website, collector_id, scope, book_type, media_type, media_type_locked, src_path)
		VALUES (10, 0, 0, 0, '', 2, 'private', 'book', 'ebook', 0, '')`); err != nil {
		t.Fatalf("插入 items 失败: %v", err)
	}
	other := pluginCtx(t, db, http.MethodGet, "/", "", 1, false)
	if cfg.CanViewBook(other, 10) {
		t.Fatalf("非所有者不可见")
	}
}

// TestBookWiringCanViewBookDBError 覆盖查询失败时返回 false。
func TestBookWiringCanViewBookDBError(t *testing.T) {
	w, _, db := newWiringFixture(t)
	cfg := w.Config("")
	if err := db.Close(); err != nil {
		t.Fatalf("关闭失败: %v", err)
	}
	ctx := pluginCtx(t, db, http.MethodGet, "/", "", 1, false)
	if cfg.CanViewBook(ctx, 10) {
		t.Fatalf("查询失败应返回 false")
	}
	if cfg.IsBookOwner(ctx, 10) {
		t.Fatalf("查询失败应返回 false")
	}
}

// TestBookWiringPrivateBookIDsError 覆盖查询失败分支。
func TestBookWiringPrivateBookIDsError(t *testing.T) {
	w, _, db := newWiringFixture(t)
	cfg := w.Config("")
	if err := db.Close(); err != nil {
		t.Fatalf("关闭失败: %v", err)
	}
	ctx := pluginCtx(t, db, http.MethodGet, "/", "", 1, false)
	if _, err := cfg.PrivateBookIDs(ctx); err == nil {
		t.Fatalf("应报错")
	}
}

// TestBookWiringSearchError 覆盖检索失败分支。
func TestBookWiringSearchError(t *testing.T) {
	w, _, db := newWiringFixture(t)
	cfg := w.Config("")
	if err := db.Close(); err != nil {
		t.Fatalf("关闭失败: %v", err)
	}
	ctx := pluginCtx(t, db, http.MethodGet, "/", "", 1, false)
	if _, err := cfg.Search(ctx, "x"); err == nil {
		t.Fatalf("应报错")
	}
	if _, err := cfg.SearchField(ctx, "author", "x"); err == nil {
		t.Fatalf("应报错")
	}
	if _, err := cfg.NavTags(ctx); err == nil {
		t.Fatalf("应报错")
	}
	if _, _, err := cfg.HotBooks(ctx, 0, 60); err == nil {
		t.Fatalf("应报错")
	}
}

// TestBookWiringAliasErrors 覆盖别名查询失败分支。
func TestBookWiringAliasErrors(t *testing.T) {
	w, _, db := newWiringFixture(t)
	cfg := w.Config("")
	if err := db.Close(); err != nil {
		t.Fatalf("关闭失败: %v", err)
	}
	ctx := pluginCtx(t, db, http.MethodGet, "/", "", 1, false)
	if _, err := cfg.AliasBookIDs(ctx, "x"); err == nil {
		t.Fatalf("应报错")
	}
	if _, err := cfg.AliasAuthorNames(ctx, "x"); err == nil {
		t.Fatalf("应报错")
	}
	if _, err := cfg.BooksForCategory(ctx, "authors", "x"); err == nil {
		t.Fatalf("应报错")
	}
}

// TestBookWiringBookTitleError 覆盖书名查询失败分支。
func TestBookWiringBookTitleError(t *testing.T) {
	w, _, db := newWiringFixture(t)
	cfg := w.Config("")
	if err := db.Close(); err != nil {
		t.Fatalf("关闭失败: %v", err)
	}
	if got := cfg.BookTitle(10); got != "" {
		t.Fatalf("查询失败应返回空串: %q", got)
	}
}

// TestBookWiringWriteErrors 覆盖写入失败分支。
func TestBookWiringWriteErrors(t *testing.T) {
	w, _, db := newWiringFixture(t)
	cfg := w.Config("")
	ctx := pluginCtx(t, db, http.MethodPost, "/", "", 1, false)
	if err := db.Close(); err != nil {
		t.Fatalf("关闭失败: %v", err)
	}
	if err := cfg.SetReadState(ctx, 10, map[string]any{"read_state": 1}); err == nil {
		t.Fatalf("SetReadState 应报错")
	}
	if err := cfg.SetProgress(ctx, 10, map[string]any{}); err == nil {
		t.Fatalf("SetProgress 应报错")
	}
	if err := cfg.SetFavorite(ctx, 10, true); err == nil {
		t.Fatalf("SetFavorite 应报错")
	}
	if err := cfg.SetShelf(ctx, 10, true); err == nil {
		t.Fatalf("SetShelf 应报错")
	}
	if err := cfg.SetScope(ctx, 10, "public"); err == nil {
		t.Fatalf("SetScope 应报错")
	}
	if err := cfg.SetMediaType(ctx, 10, "ebook"); err == nil {
		t.Fatalf("SetMediaType 应报错")
	}
}

// TestAudioWiringFreeBytesError 覆盖存储目录不可创建的分支。
func TestAudioWiringFreeBytesError(t *testing.T) {
	_, a, _ := newWiringFixture(t)
	// 用一个非法路径（已存在的文件当目录）触发 MkdirAll 失败。
	dir := t.TempDir()
	file := dir + "/afile"
	if err := os.WriteFile(file, []byte("x"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	a.root = file + "/sub"
	cfg := a.Config("", nil)
	if _, err := cfg.FreeBytes(); err == nil {
		t.Fatalf("应报错")
	}
}
