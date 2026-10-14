package userdb

import (
	"database/sql"
	"testing"
)

// newHistoryDB 建一个带 readers 表的内存库。
func newHistoryDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	db.SetMaxOpenConns(1)
	t.Cleanup(func() { _ = db.Close() })
	if _, err := db.Exec(`CREATE TABLE readers (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT, password TEXT, salt TEXT, name TEXT, email TEXT,
		avatar TEXT, admin INTEGER DEFAULT 0, active INTEGER DEFAULT 1,
		permission TEXT DEFAULT '', create_time TEXT, update_time TEXT,
		access_time TEXT, extra TEXT DEFAULT '{}')`); err != nil {
		t.Fatalf("建表失败: %v", err)
	}
	return db
}

func seedHistoryReader(t *testing.T, db *sql.DB, extra string) int64 {
	t.Helper()
	res, err := db.Exec(`INSERT INTO readers (username, password, salt, extra) VALUES ('u','p','s',?)`, extra)
	if err != nil {
		t.Fatalf("插入读者失败: %v", err)
	}
	id, _ := res.LastInsertId()
	return id
}

// TestAppendUserHistoryInserts 覆盖首次写入：新记录插到列表头部。
func TestAppendUserHistoryInserts(t *testing.T) {
	db := newHistoryDB(t)
	id := seedHistoryReader(t, db, `{}`)

	ok, err := AppendUserHistory(db, id, 7, "红星照耀中国", "read_history")
	if err != nil {
		t.Fatalf("AppendUserHistory: %v", err)
	}
	if !ok {
		t.Fatal("首次写入应返回 true")
	}

	r, err := GetReaderByID(db, id)
	if err != nil {
		t.Fatalf("GetReaderByID: %v", err)
	}
	hist, _ := r.ExtraMap()["read_history"].([]any)
	if len(hist) != 1 {
		t.Fatalf("历史条数 = %d, want 1", len(hist))
	}
	item, _ := hist[0].(map[string]any)
	if int64OfAny(item["id"]) != 7 {
		t.Errorf("id = %v, want 7", item["id"])
	}
	if item["title"] != "红星照耀中国" {
		t.Errorf("title = %v", item["title"])
	}
	if int64OfAny(item["timestamp"]) == 0 {
		t.Error("timestamp 不应为 0")
	}
}

// TestAppendUserHistoryDedupesWithin12 覆盖前 12 条内去重。
func TestAppendUserHistoryDedupesWithin12(t *testing.T) {
	db := newHistoryDB(t)
	id := seedHistoryReader(t, db, `{}`)

	if _, err := AppendUserHistory(db, id, 7, "书", "read_history"); err != nil {
		t.Fatalf("首次: %v", err)
	}
	ok, err := AppendUserHistory(db, id, 7, "书", "read_history")
	if err != nil {
		t.Fatalf("二次: %v", err)
	}
	if ok {
		t.Error("同一本书在前 12 条内应被去重，返回 false")
	}

	r, _ := GetReaderByID(db, id)
	hist, _ := r.ExtraMap()["read_history"].([]any)
	if len(hist) != 1 {
		t.Fatalf("去重后条数 = %d, want 1", len(hist))
	}
}

// TestAppendUserHistoryPrepends 覆盖新记录插到头部（最新在前）。
func TestAppendUserHistoryPrepends(t *testing.T) {
	db := newHistoryDB(t)
	id := seedHistoryReader(t, db, `{}`)

	for _, bid := range []int64{1, 2, 3} {
		if _, err := AppendUserHistory(db, id, bid, "书", "read_history"); err != nil {
			t.Fatalf("写入 %d: %v", bid, err)
		}
	}

	r, _ := GetReaderByID(db, id)
	hist, _ := r.ExtraMap()["read_history"].([]any)
	if len(hist) != 3 {
		t.Fatalf("条数 = %d, want 3", len(hist))
	}
	first, _ := hist[0].(map[string]any)
	if int64OfAny(first["id"]) != 3 {
		t.Errorf("最新一条应是 3，实际 %v", first["id"])
	}
}

// TestAppendUserHistoryTruncates 覆盖超过上限时截断到 HistoryItemLimit。
func TestAppendUserHistoryTruncates(t *testing.T) {
	db := newHistoryDB(t)
	id := seedHistoryReader(t, db, `{}`)

	for i := int64(1); i <= HistoryItemLimit+5; i++ {
		if _, err := AppendUserHistory(db, id, i, "书", "read_history"); err != nil {
			t.Fatalf("写入 %d: %v", i, err)
		}
	}

	r, _ := GetReaderByID(db, id)
	hist, _ := r.ExtraMap()["read_history"].([]any)
	if len(hist) != HistoryItemLimit {
		t.Fatalf("条数 = %d, want %d", len(hist), HistoryItemLimit)
	}
}

// TestAppendUserHistoryKeepsOtherKeys 覆盖写入历史不破坏 extra 里的其他键。
func TestAppendUserHistoryKeepsOtherKeys(t *testing.T) {
	db := newHistoryDB(t)
	id := seedHistoryReader(t, db, `{"kindle_email":"k@example.com"}`)

	if _, err := AppendUserHistory(db, id, 7, "书", "read_history"); err != nil {
		t.Fatalf("AppendUserHistory: %v", err)
	}

	r, _ := GetReaderByID(db, id)
	extra := r.ExtraMap()
	if extra["kindle_email"] != "k@example.com" {
		t.Errorf("kindle_email 被破坏: %v", extra["kindle_email"])
	}
	if _, ok := extra["read_history"]; !ok {
		t.Error("read_history 未写入")
	}
}

// TestAppendUserHistorySeparateActions 覆盖不同 action 互不干扰。
func TestAppendUserHistorySeparateActions(t *testing.T) {
	db := newHistoryDB(t)
	id := seedHistoryReader(t, db, `{}`)

	if _, err := AppendUserHistory(db, id, 7, "书", "read_history"); err != nil {
		t.Fatalf("read: %v", err)
	}
	if _, err := AppendUserHistory(db, id, 8, "书", "download_history"); err != nil {
		t.Fatalf("download: %v", err)
	}

	extra, _ := GetReaderByID(db, id)
	m := extra.ExtraMap()
	read, _ := m["read_history"].([]any)
	down, _ := m["download_history"].([]any)
	if len(read) != 1 || len(down) != 1 {
		t.Fatalf("read=%d download=%d, want 1/1", len(read), len(down))
	}
}

// TestAppendUserHistoryGuestSkipped 覆盖游客（readerID=0）不写入。
func TestAppendUserHistoryGuestSkipped(t *testing.T) {
	db := newHistoryDB(t)
	ok, err := AppendUserHistory(db, 0, 7, "书", "read_history")
	if err != nil {
		t.Fatalf("游客不应报错: %v", err)
	}
	if ok {
		t.Error("游客不应写入")
	}
}

// TestAppendUserHistoryMissingReader 覆盖读者不存在时报错。
func TestAppendUserHistoryMissingReader(t *testing.T) {
	db := newHistoryDB(t)
	if _, err := AppendUserHistory(db, 999, 7, "书", "read_history"); err == nil {
		t.Error("读者不存在时应返回错误")
	}
}

// TestAppendUserHistoryNonListExisting 覆盖已有值不是列表时按空列表处理。
func TestAppendUserHistoryNonListExisting(t *testing.T) {
	db := newHistoryDB(t)
	id := seedHistoryReader(t, db, `{"read_history":"corrupted"}`)

	if _, err := AppendUserHistory(db, id, 7, "书", "read_history"); err != nil {
		t.Fatalf("AppendUserHistory: %v", err)
	}
	r, _ := GetReaderByID(db, id)
	hist, _ := r.ExtraMap()["read_history"].([]any)
	if len(hist) != 1 {
		t.Fatalf("条数 = %d, want 1", len(hist))
	}
}
