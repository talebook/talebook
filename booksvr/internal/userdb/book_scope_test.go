package userdb

import (
	"database/sql"
	"testing"
)

// scopeSeedBook 插入一本 Calibre 书。
func scopeSeedBook(t *testing.T, db *sql.DB, id int64, title string) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO books (id, title, sort, timestamp, pubdate, series_index,
		author_sort, path, uuid, has_cover, last_modified)
		VALUES (?, ?, ?, 0, '2026-01-01', 1, '', 'p', 'u', 0, '2026-01-01')`,
		id, title, title); err != nil {
		t.Fatalf("插入书籍失败: %v", err)
	}
}

// scopeSeedItem 插入 items 记录。
func scopeSeedItem(t *testing.T, db *sql.DB, bookID int64, scope string, collectorID any, visits, downloads int) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO items (book_id, count_guest, count_visit, count_download,
		website, collector_id, scope, book_type, media_type, media_type_locked, src_path)
		VALUES (?, 0, ?, ?, '', ?, ?, 'book', 'ebook', 0, '')`,
		bookID, visits, downloads, collectorID, scope); err != nil {
		t.Fatalf("插入 items 失败: %v", err)
	}
}

// scopeSeedTag 插入标签并关联书籍（同一标签可关联多本书）。
func scopeSeedTag(t *testing.T, db *sql.DB, tagID, bookID int64, name string) {
	t.Helper()
	if _, err := db.Exec(`INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)`, tagID, name); err != nil {
		t.Fatalf("插入标签失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO books_tags_link (book, tag) VALUES (?, ?)`, bookID, tagID); err != nil {
		t.Fatalf("关联标签失败: %v", err)
	}
}

// ---- GetItemScope ----

func TestGetItemScope(t *testing.T) {
	db := extDB(t)
	scopeSeedItem(t, db, 10, "private", int64(1), 0, 0)

	it, err := GetItemScope(db, 10)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if it == nil || it.Scope != "private" || it.CollectorID == nil || *it.CollectorID != 1 {
		t.Fatalf("it = %+v", it)
	}
}

func TestGetItemScopeMissing(t *testing.T) {
	db := extDB(t)
	it, err := GetItemScope(db, 999)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if it != nil {
		t.Fatalf("不存在的书应返回 nil")
	}
}

func TestGetItemScopeNullCollector(t *testing.T) {
	db := extDB(t)
	scopeSeedItem(t, db, 10, "public", nil, 0, 0)
	it, err := GetItemScope(db, 10)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if it.CollectorID != nil {
		t.Fatalf("collector_id 应为 nil")
	}
}

// ---- PrivateBookIDsFor ----

func TestPrivateBookIDsForAdmin(t *testing.T) {
	db := extDB(t)
	scopeSeedItem(t, db, 10, "private", int64(1), 0, 0)
	got, err := PrivateBookIDsFor(db, 1, true)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(got) != 0 {
		t.Fatalf("管理员应看到全部: %+v", got)
	}
}

func TestPrivateBookIDsForReader(t *testing.T) {
	db := extDB(t)
	scopeSeedItem(t, db, 10, "private", int64(1), 0, 0)
	scopeSeedItem(t, db, 11, "private", int64(2), 0, 0)
	scopeSeedItem(t, db, 12, "public", nil, 0, 0)

	got, err := PrivateBookIDsFor(db, 1, false)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(got) != 1 || !got[11] {
		t.Fatalf("读者 1 应只看不到 11: %+v", got)
	}
}

func TestPrivateBookIDsForGuest(t *testing.T) {
	db := extDB(t)
	scopeSeedItem(t, db, 10, "private", int64(1), 0, 0)
	scopeSeedItem(t, db, 12, "public", nil, 0, 0)

	got, err := PrivateBookIDsFor(db, 0, false)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(got) != 1 || !got[10] {
		t.Fatalf("游客应看不到全部私藏书: %+v", got)
	}
}

func TestPrivateBookIDsForNullCollector(t *testing.T) {
	db := extDB(t)
	scopeSeedItem(t, db, 10, "private", nil, 0, 0)
	got, err := PrivateBookIDsFor(db, 1, false)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(got) != 1 || !got[10] {
		t.Fatalf("无归属私藏书对读者不可见: %+v", got)
	}
}

// ---- CanViewBook ----

func TestCanViewBookAdmin(t *testing.T) {
	db := extDB(t)
	scopeSeedItem(t, db, 10, "private", int64(2), 0, 0)
	ok, err := CanViewBook(db, 10, 1, true)
	if err != nil || !ok {
		t.Fatalf("管理员恒可见: ok=%v err=%v", ok, err)
	}
}

func TestCanViewBookPublic(t *testing.T) {
	db := extDB(t)
	scopeSeedItem(t, db, 10, "public", nil, 0, 0)
	ok, err := CanViewBook(db, 10, 1, false)
	if err != nil || !ok {
		t.Fatalf("公开书恒可见: ok=%v err=%v", ok, err)
	}
}

func TestCanViewBookMissingItem(t *testing.T) {
	db := extDB(t)
	ok, err := CanViewBook(db, 999, 1, false)
	if err != nil || !ok {
		t.Fatalf("无 items 记录视为可见: ok=%v err=%v", ok, err)
	}
}

func TestCanViewBookOwner(t *testing.T) {
	db := extDB(t)
	scopeSeedItem(t, db, 10, "private", int64(1), 0, 0)
	ok, err := CanViewBook(db, 10, 1, false)
	if err != nil || !ok {
		t.Fatalf("所有者可见: ok=%v err=%v", ok, err)
	}
}

func TestCanViewBookNonOwner(t *testing.T) {
	db := extDB(t)
	scopeSeedItem(t, db, 10, "private", int64(2), 0, 0)
	ok, err := CanViewBook(db, 10, 1, false)
	if err != nil || ok {
		t.Fatalf("非所有者不可见: ok=%v err=%v", ok, err)
	}
}

func TestCanViewBookGuestPrivate(t *testing.T) {
	db := extDB(t)
	scopeSeedItem(t, db, 10, "private", int64(1), 0, 0)
	ok, err := CanViewBook(db, 10, 0, false)
	if err != nil || ok {
		t.Fatalf("游客不可见私藏书: ok=%v err=%v", ok, err)
	}
}

func TestCanViewBookNullCollector(t *testing.T) {
	db := extDB(t)
	scopeSeedItem(t, db, 10, "private", nil, 0, 0)
	ok, err := CanViewBook(db, 10, 1, false)
	if err != nil || ok {
		t.Fatalf("无归属私藏书不可见: ok=%v err=%v", ok, err)
	}
}

// ---- IsBookOwner ----

func TestIsBookOwnerPrivate(t *testing.T) {
	db := extDB(t)
	scopeSeedItem(t, db, 10, "private", int64(1), 0, 0)
	ok, err := IsBookOwner(db, 10, 1, false)
	if err != nil || !ok {
		t.Fatalf("ok=%v err=%v", ok, err)
	}
	ok, _ = IsBookOwner(db, 10, 2, false)
	if ok {
		t.Fatalf("非所有者应为 false")
	}
}

func TestIsBookOwnerPublicAutoLogin(t *testing.T) {
	db := extDB(t)
	scopeSeedItem(t, db, 10, "public", nil, 0, 0)
	ok, err := IsBookOwner(db, 10, 1, true)
	if err != nil || !ok {
		t.Fatalf("auto_login 开启时公开书视为共有: ok=%v err=%v", ok, err)
	}
	ok, _ = IsBookOwner(db, 10, 1, false)
	if ok {
		t.Fatalf("auto_login 关闭时应为 false")
	}
}

func TestIsBookOwnerGuest(t *testing.T) {
	db := extDB(t)
	ok, err := IsBookOwner(db, 10, 0, true)
	if err != nil || ok {
		t.Fatalf("游客不是所有者: ok=%v err=%v", ok, err)
	}
}

func TestIsBookOwnerMissingItem(t *testing.T) {
	db := extDB(t)
	ok, err := IsBookOwner(db, 999, 1, true)
	if err != nil || ok {
		t.Fatalf("无 items 记录应为 false: ok=%v err=%v", ok, err)
	}
}

// ---- HotBookIDs ----

func TestHotBookIDsAdmin(t *testing.T) {
	db := extDB(t)
	scopeSeedItem(t, db, 10, "public", nil, 5, 3)
	scopeSeedItem(t, db, 11, "private", int64(2), 5, 9)
	scopeSeedItem(t, db, 12, "public", nil, 0, 100) // count_visit <= 1 应排除

	ids, total, err := HotBookIDs(db, 1, true, 0, 60)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if total != 2 {
		t.Fatalf("total = %d, want 2", total)
	}
	if len(ids) != 2 || ids[0] != 11 {
		t.Fatalf("应按下载量降序: %+v", ids)
	}
}

func TestHotBookIDsReader(t *testing.T) {
	db := extDB(t)
	scopeSeedItem(t, db, 10, "public", nil, 5, 3)
	scopeSeedItem(t, db, 11, "private", int64(2), 5, 9)

	ids, total, err := HotBookIDs(db, 1, false, 0, 60)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if total != 1 || len(ids) != 1 || ids[0] != 10 {
		t.Fatalf("读者不应看到他人私藏书: ids=%+v total=%d", ids, total)
	}
}

func TestHotBookIDsReaderOwnPrivate(t *testing.T) {
	db := extDB(t)
	scopeSeedItem(t, db, 11, "private", int64(1), 5, 9)
	ids, total, err := HotBookIDs(db, 1, false, 0, 60)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if total != 1 || ids[0] != 11 {
		t.Fatalf("读者应看到自己的私藏书: ids=%+v total=%d", ids, total)
	}
}

func TestHotBookIDsGuest(t *testing.T) {
	db := extDB(t)
	scopeSeedItem(t, db, 10, "public", nil, 5, 3)
	scopeSeedItem(t, db, 11, "private", int64(1), 5, 9)

	ids, total, err := HotBookIDs(db, 0, false, 0, 60)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if total != 1 || ids[0] != 10 {
		t.Fatalf("游客不应看到私藏书: ids=%+v total=%d", ids, total)
	}
}

func TestHotBookIDsPagination(t *testing.T) {
	db := extDB(t)
	for i := int64(1); i <= 5; i++ {
		scopeSeedItem(t, db, i, "public", nil, 5, int(i))
	}
	ids, total, err := HotBookIDs(db, 1, true, 1, 2)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if total != 5 || len(ids) != 2 {
		t.Fatalf("ids=%+v total=%d", ids, total)
	}
	if ids[0] != 4 {
		t.Fatalf("第二页首项应为 4: %+v", ids)
	}
}

// ---- TagCounts ----

func TestTagCounts(t *testing.T) {
	db := extDB(t)
	scopeSeedTag(t, db, 1, 10, "科幻")
	scopeSeedTag(t, db, 1, 11, "科幻")
	scopeSeedTag(t, db, 2, 10, "文学")

	got, err := TagCounts(db)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got["科幻"] != 2 || got["文学"] != 1 {
		t.Fatalf("got = %+v", got)
	}
}

func TestTagCountsEmpty(t *testing.T) {
	db := extDB(t)
	got, err := TagCounts(db)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(got) != 0 {
		t.Fatalf("空库应返回空 map: %+v", got)
	}
}

// ---- BookTitleByID ----

func TestBookTitleByID(t *testing.T) {
	db := extDB(t)
	scopeSeedBook(t, db, 10, "三体")
	title, err := BookTitleByID(db, 10)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if title != "三体" {
		t.Fatalf("title = %q", title)
	}
}

func TestBookTitleByIDMissing(t *testing.T) {
	db := extDB(t)
	title, err := BookTitleByID(db, 999)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if title != "" {
		t.Fatalf("不存在的书应返回空串: %q", title)
	}
}

// ---- 错误路径 ----

func TestBookScopeDBErrors(t *testing.T) {
	db := extDB(t)
	if err := db.Close(); err != nil {
		t.Fatalf("关闭失败: %v", err)
	}
	if _, err := GetItemScope(db, 1); err == nil {
		t.Error("GetItemScope 应报错")
	}
	if _, err := PrivateBookIDsFor(db, 1, false); err == nil {
		t.Error("PrivateBookIDsFor 应报错")
	}
	if _, err := CanViewBook(db, 1, 1, false); err == nil {
		t.Error("CanViewBook 应报错")
	}
	if _, err := IsBookOwner(db, 1, 1, false); err == nil {
		t.Error("IsBookOwner 应报错")
	}
	if _, _, err := HotBookIDs(db, 1, false, 0, 60); err == nil {
		t.Error("HotBookIDs 应报错")
	}
	if _, err := TagCounts(db); err == nil {
		t.Error("TagCounts 应报错")
	}
	if _, err := BookTitleByID(db, 1); err == nil {
		t.Error("BookTitleByID 应报错")
	}
}
