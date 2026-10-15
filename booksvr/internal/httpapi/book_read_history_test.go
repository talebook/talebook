package httpapi

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"testing"

	"talebook/booksvr/internal/userdb"
)

// 本文件覆盖「点阅读 → 我的阅读有书」这条用户可见链路。
//
// 根因：bookReadBook 漏了 Python BookRead.get 的两行：
//
//	self.user_history("read_history", book)
//	self.count_increase(book_id, count_download=1)
//
// 前端「我的阅读 → 阅读记录」读的是 user.extra.read_history，
// 不写就永远为空（用户可见现象：「我的阅读里面还是没有书」）。

// ensureReadersTable 建 readers 表（netSchemaDB 不含它）。
func ensureReadersTable(t *testing.T, db *sql.DB) {
	t.Helper()
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS readers (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT, password TEXT, salt TEXT, name TEXT, email TEXT,
		avatar TEXT, admin INTEGER DEFAULT 0, active INTEGER DEFAULT 1,
		permission TEXT DEFAULT '', create_time TEXT, update_time TEXT,
		access_time TEXT, extra TEXT DEFAULT '{}')`); err != nil {
		t.Fatalf("建 readers 表失败: %v", err)
	}
}

// seedHistoryReader 插入一个读者并返回其 id。
func seedHistoryReader(t *testing.T, db *sql.DB, extra string) int64 {
	t.Helper()
	ensureReadersTable(t, db)
	res, err := db.Exec(`INSERT INTO readers (username, password, salt, extra) VALUES ('u','p','s',?)`, extra)
	if err != nil {
		t.Fatalf("插入读者失败: %v", err)
	}
	id, _ := res.LastInsertId()
	return id
}

// readHistoryOf 读出读者的 read_history。
func readHistoryOf(t *testing.T, db *sql.DB, readerID int64) []any {
	t.Helper()
	var raw string
	if err := db.QueryRow(`SELECT extra FROM readers WHERE id = ?`, readerID).Scan(&raw); err != nil {
		t.Fatalf("读 extra 失败: %v", err)
	}
	var extra map[string]any
	if err := json.Unmarshal([]byte(raw), &extra); err != nil {
		t.Fatalf("解析 extra 失败: %v", err)
	}
	hist, _ := extra["read_history"].([]any)
	return hist
}

// historyBookID 从历史条目里取 book id。
func historyBookID(v any) int64 {
	item, ok := v.(map[string]any)
	if !ok {
		return 0
	}
	switch n := item["id"].(type) {
	case float64:
		return int64(n)
	case int64:
		return n
	}
	return 0
}

// TestBookReadBookWritesReadHistory 覆盖打开阅读器会写阅读历史。
//
// 这是用户报的缺陷的直接回归：点「阅读」后「我的阅读」必须能看到这本书。
func TestBookReadBookWritesReadHistory(t *testing.T) {
	w := epubBookWiring(t, map[string]any{"EPUB_VIEWER": "creader.html"})
	readerID := seedHistoryReader(t, w.db, `{}`)

	ctx := pluginCtx(t, w.db, http.MethodGet, "/read/1", "", readerID, false)
	if _, err := w.bookReadBook(ctx, 1); err != nil {
		t.Fatalf("bookReadBook: %v", err)
	}

	hist := readHistoryOf(t, w.db, readerID)
	if len(hist) != 1 {
		t.Fatalf("阅读历史条数 = %d, want 1（点阅读必须写 read_history）", len(hist))
	}
	if got := historyBookID(hist[0]); got != 1 {
		t.Errorf("历史里的书 id = %d, want 1", got)
	}
}

// TestBookReadBookGuestNoHistory 覆盖游客打开阅读器不写历史。
func TestBookReadBookGuestNoHistory(t *testing.T) {
	w := epubBookWiring(t, map[string]any{"EPUB_VIEWER": "creader.html"})
	readerID := seedHistoryReader(t, w.db, `{}`)

	ctx := pluginCtx(t, w.db, http.MethodGet, "/read/1", "", 0, false)
	if _, err := w.bookReadBook(ctx, 1); err != nil {
		t.Fatalf("bookReadBook: %v", err)
	}
	if hist := readHistoryOf(t, w.db, readerID); len(hist) != 0 {
		t.Errorf("游客不应写历史，实际 %d 条", len(hist))
	}
}

// TestBookReadBookIncrementsDownload 覆盖打开阅读器会递增下载计数。
func TestBookReadBookIncrementsDownload(t *testing.T) {
	w := epubBookWiring(t, map[string]any{"EPUB_VIEWER": "creader.html"})
	readerID := seedHistoryReader(t, w.db, `{}`)
	if _, err := w.db.Exec(`INSERT INTO items (book_id, count_guest, count_visit, count_download,
		website, collector_id, scope, book_type, media_type, media_type_locked, src_path)
		VALUES (1, 0, 0, 0, '', NULL, 'public', 'book', 'ebook', 0, '')`); err != nil {
		t.Fatalf("插入 items 失败: %v", err)
	}

	ctx := pluginCtx(t, w.db, http.MethodGet, "/read/1", "", readerID, false)
	if _, err := w.bookReadBook(ctx, 1); err != nil {
		t.Fatalf("bookReadBook: %v", err)
	}

	var n int64
	if err := w.db.QueryRow(`SELECT count_download FROM items WHERE book_id = 1`).Scan(&n); err != nil {
		t.Fatalf("读 count_download 失败: %v", err)
	}
	if n != 1 {
		t.Errorf("count_download = %d, want 1", n)
	}
}

// TestBookReadBookHistoryVisibleInUserInfo 覆盖端到端：
// 点阅读后 /api/user/info?detail=1 的 extra.read_history 能渲染出这本书。
//
// 这是前端「我的阅读 → 阅读记录」真正消费的数据形状。
func TestBookReadBookHistoryVisibleInUserInfo(t *testing.T) {
	w := epubBookWiring(t, map[string]any{"EPUB_VIEWER": "creader.html"})
	readerID := seedHistoryReader(t, w.db, `{}`)

	ctx := pluginCtx(t, w.db, http.MethodGet, "/read/1", "", readerID, false)
	if _, err := w.bookReadBook(ctx, 1); err != nil {
		t.Fatalf("bookReadBook: %v", err)
	}

	cfg := UserConfig{
		DB:         w.db,
		BookExists: func(int64) bool { return true },
	}
	infoCtx := pluginCtx(t, w.db, http.MethodGet, "/api/user/info?detail=1", "", readerID, false)
	got, err := UserInfoHandler(cfg)(infoCtx)
	if err != nil {
		t.Fatalf("UserInfoHandler: %v", err)
	}
	user, _ := got["user"].(map[string]any)
	extra, _ := user["extra"].(map[string]any)
	hist, _ := extra["read_history"].([]any)
	if len(hist) != 1 {
		t.Fatalf("user/info 里的 read_history 条数 = %d, want 1", len(hist))
	}
	h, _ := hist[0].(map[string]any)
	if h["href"] != "/book/1" {
		t.Errorf("href = %v, want /book/1", h["href"])
	}
}

// TestBookReadBookMarksReading 覆盖打开阅读器自动标记「在读」。
//
// 用户要求：读过的书要出现在「我的阅读 → 在读」里。当前状态为
// 未读/无记录时置 1；已读完（2）不被覆盖。
func TestBookReadBookMarksReading(t *testing.T) {
	w := epubBookWiring(t, map[string]any{"EPUB_VIEWER": "creader.html"})
	readerID := seedHistoryReader(t, w.db, `{}`)
	ensureReadingStateTable(t, w.db)

	ctx := pluginCtx(t, w.db, http.MethodGet, "/read/1", "", readerID, false)
	if _, err := w.bookReadBook(ctx, 1); err != nil {
		t.Fatalf("bookReadBook: %v", err)
	}

	st, err := userdb.GetReadingState(w.db, 1, readerID)
	if err != nil {
		t.Fatalf("GetReadingState: %v", err)
	}
	if st == nil || st.ReadState != 1 {
		t.Fatalf("打开阅读器后 read_state = %+v，期望自动置为 1（在读）", st)
	}
	// 在读的书自动加入书架（用户要求）。
	if st.Wants != 1 {
		t.Errorf("打开阅读器后 wants = %d，期望 1（自动加入书架）", st.Wants)
	}
}

// TestBookReadBookKeepsFinished 覆盖已读完状态不被自动标记覆盖。
func TestBookReadBookKeepsFinished(t *testing.T) {
	w := epubBookWiring(t, map[string]any{"EPUB_VIEWER": "creader.html"})
	readerID := seedHistoryReader(t, w.db, `{}`)
	ensureReadingStateTable(t, w.db)
	if err := userdb.SetReadingState(w.db, 1, readerID, 2, nil, nil); err != nil {
		t.Fatalf("预置已读完: %v", err)
	}

	ctx := pluginCtx(t, w.db, http.MethodGet, "/read/1", "", readerID, false)
	if _, err := w.bookReadBook(ctx, 1); err != nil {
		t.Fatalf("bookReadBook: %v", err)
	}

	st, _ := userdb.GetReadingState(w.db, 1, readerID)
	if st == nil || st.ReadState != 2 {
		t.Fatalf("已读完被覆盖: %+v，期望保持 2", st)
	}
	// 已读完不自动加入书架（用户只要求在读）。
	if st.Wants != 0 {
		t.Errorf("已读完时 wants = %d，期望 0（不进书架）", st.Wants)
	}
}

// TestWiringSetReadStateReadingAddsToShelf 覆盖手动置「在读」也进书架。
func TestWiringSetReadStateReadingAddsToShelf(t *testing.T) {
	w := epubBookWiring(t, map[string]any{"EPUB_VIEWER": "creader.html"})
	readerID := seedHistoryReader(t, w.db, `{}`)
	ensureReadingStateTable(t, w.db)

	cfg := w.Config("")
	ctx1 := pluginCtx(t, w.db, http.MethodPost, "/api/book/1/readstate", `{"read_state":1}`, readerID, false)
	if err := cfg.SetReadState(ctx1, 1, map[string]any{"read_state": int64(1)}); err != nil {
		t.Fatalf("SetReadState: %v", err)
	}

	st, err := userdb.GetReadingState(w.db, 1, readerID)
	if err != nil {
		t.Fatalf("GetReadingState: %v", err)
	}
	if st == nil || st.ReadState != 1 || st.Wants != 1 {
		t.Fatalf("手动置在读后 = %+v，期望 read_state=1 且 wants=1", st)
	}

	// 已读完不进书架。
	ctx2 := pluginCtx(t, w.db, http.MethodPost, "/api/book/1/readstate", `{"read_state":2}`, readerID, false)
	if err := cfg.SetReadState(ctx2, 1, map[string]any{"read_state": int64(2)}); err != nil {
		t.Fatalf("SetReadState(2): %v", err)
	}
	st, _ = userdb.GetReadingState(w.db, 1, readerID)
	if st == nil || st.ReadState != 2 {
		t.Fatalf("置已读完失败: %+v", st)
	}
}

// ensureReadingStateTable 建 reading_state 表（单数表名）。
func ensureReadingStateTable(t *testing.T, db *sql.DB) {
	t.Helper()
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS reading_state (
		book_id INTEGER, reader_id INTEGER, favorite INTEGER DEFAULT 0,
		favorite_date TEXT, wants INTEGER DEFAULT 0, wants_date TEXT,
		read_state INTEGER DEFAULT 0, read_date TEXT, online_read INTEGER DEFAULT 0,
		download INTEGER DEFAULT 0, progress TEXT DEFAULT '{}',
		progress_update_time TEXT,
		PRIMARY KEY (book_id, reader_id))`); err != nil {
		t.Fatalf("建 reading_state 表失败: %v", err)
	}
}

// TestBookReadBookTwiceNoDuplicate 覆盖重复打开同一本书不重复记录。
func TestBookReadBookTwiceNoDuplicate(t *testing.T) {
	w := epubBookWiring(t, map[string]any{"EPUB_VIEWER": "creader.html"})
	readerID := seedHistoryReader(t, w.db, `{}`)

	for i := 0; i < 2; i++ {
		ctx := pluginCtx(t, w.db, http.MethodGet, "/read/1", "", readerID, false)
		if _, err := w.bookReadBook(ctx, 1); err != nil {
			t.Fatalf("第 %d 次 bookReadBook: %v", i+1, err)
		}
	}

	if hist := readHistoryOf(t, w.db, readerID); len(hist) != 1 {
		t.Errorf("重复打开后条数 = %d, want 1", len(hist))
	}
}
