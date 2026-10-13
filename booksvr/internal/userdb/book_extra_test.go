package userdb

import (
	"database/sql"
	"testing"
)

// bookSeedReaderRow 插入一个读者。
func bookSeedReaderRow(t *testing.T, db *sql.DB, id int64) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO readers (id, username, password, salt, name, email, avatar,
		admin, active, permission, create_time, update_time, access_time, extra)
		VALUES (?, 'u', 'x', 'y', 'u', 'u@example.com', '', 0, 1, '',
		'2026-01-01 00:00:00', '2026-01-01 00:00:00', '2026-01-01 00:00:00', '{}')`, id); err != nil {
		t.Fatalf("插入读者失败: %v", err)
	}
}

// bookSeedItemRow 插入 items 记录（collector_id 为 NULL）。
func bookSeedItemRow(t *testing.T, db *sql.DB, bookID int64, scope string) {
	t.Helper()
	bookSeedItemOwned(t, db, bookID, scope, nil)
}

// bookSeedItemOwned 插入 items 记录并指定 collector_id。
func bookSeedItemOwned(t *testing.T, db *sql.DB, bookID int64, scope string, collectorID any) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO items (book_id, count_guest, count_visit, count_download,
		website, collector_id, scope, book_type, media_type, media_type_locked, src_path)
		VALUES (?, 0, 0, 0, '', ?, ?, 'book', 'ebook', 0, '')`, bookID, collectorID, scope); err != nil {
		t.Fatalf("插入 items 失败: %v", err)
	}
}

func TestSetReadingState(t *testing.T) {
	db := newSchemaDB(t)
	bookSeedReaderRow(t, db, 1)

	online, download := int64(1), int64(1)
	if err := SetReadingState(db, 10, 1, 1, &online, &download); err != nil {
		t.Fatalf("写入失败: %v", err)
	}
	s, err := GetReadingState(db, 10, 1)
	if err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if s.ReadState != 1 || s.OnlineRead != 1 || s.Download != 1 {
		t.Fatalf("s = %+v", s)
	}
	if s.ReadDate == "" {
		t.Fatalf("非未读状态应写入 read_date")
	}

	// 二次写入：状态更新，未提供的字段保持原值。
	if err := SetReadingState(db, 10, 1, 2, nil, nil); err != nil {
		t.Fatalf("二次写入失败: %v", err)
	}
	s, _ = GetReadingState(db, 10, 1)
	if s.ReadState != 2 {
		t.Fatalf("read_state = %d, want 2", s.ReadState)
	}
	if s.OnlineRead != 1 || s.Download != 1 {
		t.Fatalf("未提供的字段应保持: %+v", s)
	}
}

func TestSetReadingStateUnread(t *testing.T) {
	db := newSchemaDB(t)
	bookSeedReaderRow(t, db, 1)
	if err := SetReadingState(db, 10, 1, 0, nil, nil); err != nil {
		t.Fatalf("写入失败: %v", err)
	}
	s, _ := GetReadingState(db, 10, 1)
	if s.ReadState != 0 {
		t.Fatalf("read_state = %d, want 0", s.ReadState)
	}
}

func TestSetReadingProgress(t *testing.T) {
	db := newSchemaDB(t)
	bookSeedReaderRow(t, db, 1)

	if err := SetReadingProgress(db, 10, 1, map[string]any{"cfi": "x"}); err != nil {
		t.Fatalf("写入失败: %v", err)
	}
	s, err := GetReadingState(db, 10, 1)
	if err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if s.GetProgress()["cfi"] != "x" {
		t.Fatalf("progress = %+v", s.GetProgress())
	}
	if s.ProgressUpdateTime == "" {
		t.Fatalf("应写入 progress_update_time")
	}

	// 二次写入覆盖。
	if err := SetReadingProgress(db, 10, 1, map[string]any{"cfi": "y"}); err != nil {
		t.Fatalf("二次写入失败: %v", err)
	}
	s, _ = GetReadingState(db, 10, 1)
	if s.GetProgress()["cfi"] != "y" {
		t.Fatalf("progress = %+v", s.GetProgress())
	}
}

func TestSetReadingFavorite(t *testing.T) {
	db := newSchemaDB(t)
	bookSeedReaderRow(t, db, 1)

	if err := SetReadingFavorite(db, 10, 1, true); err != nil {
		t.Fatalf("写入失败: %v", err)
	}
	s, _ := GetReadingState(db, 10, 1)
	if !s.IsFavorite() || s.FavoriteDate == "" {
		t.Fatalf("s = %+v", s)
	}

	if err := SetReadingFavorite(db, 10, 1, false); err != nil {
		t.Fatalf("取消收藏失败: %v", err)
	}
	s, _ = GetReadingState(db, 10, 1)
	if s.IsFavorite() || s.FavoriteDate != "" {
		t.Fatalf("取消后应清空: %+v", s)
	}
}

func TestSetReadingWants(t *testing.T) {
	db := newSchemaDB(t)
	bookSeedReaderRow(t, db, 1)

	if err := SetReadingWants(db, 10, 1, true); err != nil {
		t.Fatalf("写入失败: %v", err)
	}
	s, _ := GetReadingState(db, 10, 1)
	if !s.IsWants() || s.WantsDate == "" {
		t.Fatalf("s = %+v", s)
	}

	if err := SetReadingWants(db, 10, 1, false); err != nil {
		t.Fatalf("移出书架失败: %v", err)
	}
	s, _ = GetReadingState(db, 10, 1)
	if s.IsWants() || s.WantsDate != "" {
		t.Fatalf("移出后应清空: %+v", s)
	}
}

func TestSetItemScope(t *testing.T) {
	db := newSchemaDB(t)
	bookSeedItemRow(t, db, 10, "public")

	if err := SetItemScope(db, 10, "private"); err != nil {
		t.Fatalf("写入失败: %v", err)
	}
	var scope string
	if err := db.QueryRow(`SELECT scope FROM items WHERE book_id = 10`).Scan(&scope); err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if scope != "private" {
		t.Fatalf("scope = %q", scope)
	}
}

func TestSetItemMediaType(t *testing.T) {
	db := newSchemaDB(t)
	bookSeedItemRow(t, db, 10, "public")

	if err := SetItemMediaType(db, 10, "comic"); err != nil {
		t.Fatalf("写入失败: %v", err)
	}
	var mediaType string
	if err := db.QueryRow(`SELECT media_type FROM items WHERE book_id = 10`).Scan(&mediaType); err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if mediaType != "comic" {
		t.Fatalf("media_type = %q", mediaType)
	}
}

// TestBookExtraDBErrors 覆盖各查询函数的错误返回路径。
func TestBookExtraDBErrors(t *testing.T) {
	db := newSchemaDB(t)
	if err := db.Close(); err != nil {
		t.Fatalf("关闭失败: %v", err)
	}

	if _, err := ListReadingStates(db, 1, []int64{1}); err == nil {
		t.Error("ListReadingStates 应报错")
	}
	if _, err := ListReadingStatesByState(db, 1, 1); err == nil {
		t.Error("ListReadingStatesByState 应报错")
	}
	if _, err := ListShelfStates(db, 1); err == nil {
		t.Error("ListShelfStates 应报错")
	}
	if _, err := ReadingStats(db, 1, 2026, 1); err == nil {
		t.Error("ReadingStats 应报错")
	}
	if _, err := ListMonthReadDone(db, 1, 2026, 1, 12); err == nil {
		t.Error("ListMonthReadDone 应报错")
	}
	if _, err := BookIDsByScope(db, "public", 1); err == nil {
		t.Error("BookIDsByScope 应报错")
	}
	if _, err := FavoriteBookIDs(db, 1); err == nil {
		t.Error("FavoriteBookIDs 应报错")
	}
	if err := SetReadingState(db, 1, 1, 1, nil, nil); err == nil {
		t.Error("SetReadingState 应报错")
	}
	if err := SetReadingProgress(db, 1, 1, map[string]any{}); err == nil {
		t.Error("SetReadingProgress 应报错")
	}
	if err := SetReadingFavorite(db, 1, 1, true); err == nil {
		t.Error("SetReadingFavorite 应报错")
	}
	if err := SetReadingWants(db, 1, 1, true); err == nil {
		t.Error("SetReadingWants 应报错")
	}
	if err := SetItemScope(db, 1, "public"); err == nil {
		t.Error("SetItemScope 应报错")
	}
	if err := SetItemMediaType(db, 1, "ebook"); err == nil {
		t.Error("SetItemMediaType 应报错")
	}
}

// TestListReadingStatesEmpty 覆盖空入参分支。
func TestListReadingStatesEmpty(t *testing.T) {
	db := newSchemaDB(t)
	got, err := ListReadingStates(db, 1, nil)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(got) != 0 {
		t.Fatalf("空入参应返回空 map")
	}
}

// TestBookIDsByScopePrivate 覆盖私藏分支。
func TestBookIDsByScopePrivate(t *testing.T) {
	db := newSchemaDB(t)
	bookSeedReaderRow(t, db, 1)
	bookSeedItemRow(t, db, 10, "public")
	bookSeedItemOwned(t, db, 11, "private", int64(1))

	got, err := BookIDsByScope(db, "private", 1)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(got) != 1 || got[0] != 11 {
		t.Fatalf("got = %+v", got)
	}
}
