package userdb

import (
	"database/sql"
	"fmt"
)

// ItemScope 是 items 表的可见范围与归属信息。
type ItemScope struct {
	BookID      int64  `json:"book_id"`
	Scope       string `json:"scope"`
	CollectorID *int64 `json:"collector_id"`
	MediaType   string `json:"media_type"`
}

// GetItemScope 取某书的可见范围；不存在返回 nil。
func GetItemScope(db *sql.DB, bookID int64) (*ItemScope, error) {
	row := db.QueryRow(`SELECT book_id, COALESCE(scope,''), collector_id, COALESCE(media_type,'')
		FROM items WHERE book_id = ?`, bookID)
	it := &ItemScope{}
	err := row.Scan(&it.BookID, &it.Scope, &it.CollectorID, &it.MediaType)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 items 失败: %w", err)
	}
	return it, nil
}

// PrivateBookIDsFor 返回某读者无权查看的私藏书 id 集合。
//
// 语义对齐 Python 的 `_get_private_book_ids`：
//   - 管理员返回空集；
//   - 已登录读者返回「scope=private 且 collector_id != 自己」的书；
//   - 游客返回全部 scope=private 的书。
func PrivateBookIDsFor(db *sql.DB, readerID int64, isAdmin bool) (map[int64]bool, error) {
	out := map[int64]bool{}
	if isAdmin {
		return out, nil
	}
	query := `SELECT book_id FROM items WHERE scope = 'private'`
	args := []any{}
	if readerID != 0 {
		query += ` AND (collector_id IS NULL OR collector_id != ?)`
		args = append(args, readerID)
	}
	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询私藏书失败: %w", err)
	}
	defer func() { _ = rows.Close() }()
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out[id] = true
	}
	return out, rows.Err()
}

// CanViewBook 判定某读者能否查看指定书籍。
//
// 语义对齐 Python 的 `can_view_book`：管理员恒可见；非私藏书恒可见；
// 私藏书仅所有者可见。
func CanViewBook(db *sql.DB, bookID, readerID int64, isAdmin bool) (bool, error) {
	if isAdmin {
		return true, nil
	}
	item, err := GetItemScope(db, bookID)
	if err != nil {
		return false, err
	}
	if item == nil || item.Scope != "private" {
		return true, nil
	}
	if readerID == 0 || item.CollectorID == nil {
		return false, nil
	}
	return *item.CollectorID == readerID, nil
}

// IsBookOwner 判定某读者是否为指定书籍的所有者。
//
// 语义对齐 Python 的 `is_book_owner`：私藏书的 collector_id 匹配即为所有者；
// 公开书在 auto_login 开启时视为所有人共有。
func IsBookOwner(db *sql.DB, bookID, readerID int64, autoLogin bool) (bool, error) {
	if readerID == 0 {
		return false, nil
	}
	item, err := GetItemScope(db, bookID)
	if err != nil {
		return false, err
	}
	if item == nil {
		return false, nil
	}
	if item.Scope == "private" {
		return item.CollectorID != nil && *item.CollectorID == readerID, nil
	}
	return autoLogin, nil
}

// HotBookIDs 返回热度榜单的书籍 id 与总数。
//
// 语义对齐 Python 的 HotBook：count_visit > 1，按 count_download 降序；
// 管理员可见全部，普通读者可见公开书 + 自己的私藏书。
func HotBookIDs(db *sql.DB, readerID int64, isAdmin bool, start, delta int) ([]int64, int, error) {
	where := `count_visit > 1`
	args := []any{}
	if !isAdmin {
		if readerID != 0 {
			where += ` AND (scope != 'private' OR collector_id = ?)`
			args = append(args, readerID)
		} else {
			where += ` AND scope != 'private'`
		}
	}

	var total int
	if err := db.QueryRow(`SELECT COUNT(*) FROM items WHERE `+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("userdb: 统计热度榜单失败: %w", err)
	}

	query := `SELECT book_id FROM items WHERE ` + where + ` ORDER BY count_download DESC LIMIT ? OFFSET ?`
	pageArgs := append(append([]any{}, args...), delta, start)
	rows, err := db.Query(query, pageArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("userdb: 查询热度榜单失败: %w", err)
	}
	defer func() { _ = rows.Close() }()
	ids := []int64{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, 0, err
		}
		ids = append(ids, id)
	}
	return ids, total, rows.Err()
}

// TagCounts 返回全部标签及其书籍计数。
func TagCounts(db *sql.DB) (map[string]int, error) {
	rows, err := db.Query(`SELECT t.name, COUNT(l.book) FROM tags t
		LEFT JOIN books_tags_link l ON l.tag = t.id
		GROUP BY t.id, t.name`)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询标签计数失败: %w", err)
	}
	defer func() { _ = rows.Close() }()
	out := map[string]int{}
	for rows.Next() {
		var name string
		var count int
		if err := rows.Scan(&name, &count); err != nil {
			return nil, err
		}
		out[name] = count
	}
	return out, rows.Err()
}

// BookTitleByID 返回书名；不存在返回空串。
func BookTitleByID(db *sql.DB, bookID int64) (string, error) {
	var title string
	err := db.QueryRow(`SELECT COALESCE(title,'') FROM books WHERE id = ?`, bookID).Scan(&title)
	if err == sql.ErrNoRows {
		return "", nil
	}
	if err != nil {
		return "", fmt.Errorf("userdb: 查询书名失败: %w", err)
	}
	return title, nil
}
