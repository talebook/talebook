package userdb

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"
)

// ListReadingStates 批量取某读者在指定书籍上的阅读状态。
func ListReadingStates(db *sql.DB, readerID int64, bookIDs []int64) (map[int64]*ReadingState, error) {
	out := map[int64]*ReadingState{}
	if len(bookIDs) == 0 {
		return out, nil
	}
	raw, _ := json.Marshal(bookIDs)
	args := []any{readerID, string(raw)}
	rows, err := db.Query(`SELECT book_id, reader_id, COALESCE(favorite,0), COALESCE(favorite_date,''),
		COALESCE(wants,0), COALESCE(wants_date,''), COALESCE(read_state,0), COALESCE(read_date,''),
		COALESCE(online_read,0), COALESCE(download,0), COALESCE(progress,'{}'),
		COALESCE(progress_update_time,'')
		FROM reading_state WHERE reader_id = ? AND book_id IN (SELECT value FROM json_each(?))`, args...)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 reading_state 失败: %w", err)
	}
	defer func() { _ = rows.Close() }()
	for rows.Next() {
		s := &ReadingState{}
		var progress string
		if err := rows.Scan(&s.BookID, &s.ReaderID, &s.Favorite, &s.FavoriteDate, &s.Wants,
			&s.WantsDate, &s.ReadState, &s.ReadDate, &s.OnlineRead, &s.Download, &progress,
			&s.ProgressUpdateTime); err != nil {
			return nil, fmt.Errorf("userdb: 扫描 reading_state 失败: %w", err)
		}
		s.Progress = jsonMap(progress)
		out[s.BookID] = s
	}
	return out, rows.Err()
}

// ListReadingStatesByState 按阅读状态列出某读者的书籍，按阅读时间降序。
func ListReadingStatesByState(db *sql.DB, readerID, readState int64) ([]*ReadingState, error) {
	rows, err := db.Query(`SELECT book_id, reader_id, COALESCE(favorite,0), COALESCE(favorite_date,''),
		COALESCE(wants,0), COALESCE(wants_date,''), COALESCE(read_state,0), COALESCE(read_date,''),
		COALESCE(online_read,0), COALESCE(download,0), COALESCE(progress,'{}'),
		COALESCE(progress_update_time,'')
		FROM reading_state WHERE reader_id = ? AND read_state = ?
		ORDER BY read_date DESC`, readerID, readState)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 reading_state 失败: %w", err)
	}
	defer func() { _ = rows.Close() }()
	return scanReadingStates(rows)
}

// scanReadingStates 扫描阅读状态行。
func scanReadingStates(rows *sql.Rows) ([]*ReadingState, error) {
	out := []*ReadingState{}
	for rows.Next() {
		s := &ReadingState{}
		var progress string
		if err := rows.Scan(&s.BookID, &s.ReaderID, &s.Favorite, &s.FavoriteDate, &s.Wants,
			&s.WantsDate, &s.ReadState, &s.ReadDate, &s.OnlineRead, &s.Download, &progress,
			&s.ProgressUpdateTime); err != nil {
			return nil, fmt.Errorf("userdb: 扫描 reading_state 失败: %w", err)
		}
		s.Progress = jsonMap(progress)
		out = append(out, s)
	}
	return out, rows.Err()
}

// ListShelfStates 列出某读者书架（想读）中的书籍，按加入时间降序。
func ListShelfStates(db *sql.DB, readerID int64) ([]*ReadingState, error) {
	rows, err := db.Query(`SELECT book_id, reader_id, COALESCE(favorite,0), COALESCE(favorite_date,''),
		COALESCE(wants,0), COALESCE(wants_date,''), COALESCE(read_state,0), COALESCE(read_date,''),
		COALESCE(online_read,0), COALESCE(download,0), COALESCE(progress,'{}'),
		COALESCE(progress_update_time,'')
		FROM reading_state WHERE reader_id = ? AND wants = 1
		ORDER BY wants_date DESC`, readerID)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询书架失败: %w", err)
	}
	defer func() { _ = rows.Close() }()
	return scanReadingStates(rows)
}

// ReadingStats 汇总某读者的阅读统计。
func ReadingStats(db *sql.DB, readerID int64, year, month int) (map[string]any, error) {
	stats := map[string]any{}
	counts := []struct {
		key   string
		query string
		args  []any
	}{
		{"total_reading", `SELECT COUNT(*) FROM reading_state WHERE reader_id = ? AND read_state = 1`,
			[]any{readerID}},
		{"total_read_done", `SELECT COUNT(*) FROM reading_state WHERE reader_id = ? AND read_state = 2`,
			[]any{readerID}},
		{"month_reading", `SELECT COUNT(*) FROM reading_state WHERE reader_id = ? AND read_state = 1
			AND CAST(strftime('%Y', read_date) AS INTEGER) = ?
			AND CAST(strftime('%m', read_date) AS INTEGER) = ?`, []any{readerID, year, month}},
		{"month_read_done", `SELECT COUNT(*) FROM reading_state WHERE reader_id = ? AND read_state = 2
			AND CAST(strftime('%Y', read_date) AS INTEGER) = ?
			AND CAST(strftime('%m', read_date) AS INTEGER) = ?`, []any{readerID, year, month}},
	}
	for _, c := range counts {
		var n int64
		if err := db.QueryRow(c.query, c.args...).Scan(&n); err != nil {
			return nil, fmt.Errorf("userdb: 阅读统计失败: %w", err)
		}
		stats[c.key] = n
	}
	return stats, nil
}

// ListMonthReadDone 列出某读者本月读完的书籍，按阅读时间降序，最多 limit 条。
func ListMonthReadDone(db *sql.DB, readerID int64, year, month, limit int) ([]*ReadingState, error) {
	rows, err := db.Query(`SELECT book_id, reader_id, COALESCE(favorite,0), COALESCE(favorite_date,''),
		COALESCE(wants,0), COALESCE(wants_date,''), COALESCE(read_state,0), COALESCE(read_date,''),
		COALESCE(online_read,0), COALESCE(download,0), COALESCE(progress,'{}'),
		COALESCE(progress_update_time,'')
		FROM reading_state WHERE reader_id = ? AND read_state = 2
		AND CAST(strftime('%Y', read_date) AS INTEGER) = ?
		AND CAST(strftime('%m', read_date) AS INTEGER) = ?
		ORDER BY read_date DESC LIMIT ?`, readerID, year, month, limit)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询本月读完失败: %w", err)
	}
	defer func() { _ = rows.Close() }()
	return scanReadingStates(rows)
}

// BookIDsByScope 返回某可见范围下的书籍 id。
//
// scope 为 public 时返回非私藏书；private 时返回该读者的私藏书。
func BookIDsByScope(db *sql.DB, scope string, readerID int64) ([]int64, error) {
	query := `SELECT book_id FROM items WHERE scope != 'private' ORDER BY book_id DESC`
	args := []any{}
	if scope == "private" {
		query = `SELECT book_id FROM items WHERE scope = 'private' AND collector_id = ?
			ORDER BY book_id DESC`
		args = append(args, readerID)
	}
	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 items 失败: %w", err)
	}
	defer func() { _ = rows.Close() }()
	ids := []int64{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// FavoriteBookIDs 返回某读者收藏的书籍 id，按收藏时间降序。
func FavoriteBookIDs(db *sql.DB, readerID int64) ([]int64, error) {
	rows, err := db.Query(`SELECT book_id FROM reading_state
		WHERE reader_id = ? AND favorite = 1 ORDER BY favorite_date DESC`, readerID)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询收藏失败: %w", err)
	}
	defer func() { _ = rows.Close() }()
	ids := []int64{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// SetReadingState 写入阅读状态（不存在则创建）。
func SetReadingState(db *sql.DB, bookID, readerID, readState int64, onlineRead, download *int64) error {
	now := time.Now().UTC().Format("2006-01-02 15:04:05")
	var readDate any
	if readState != 0 {
		readDate = now
	}
	_, err := db.Exec(`INSERT INTO reading_state
		(book_id, reader_id, favorite, wants, read_state, read_date, online_read, download, progress)
		VALUES (?, ?, 0, 0, ?, ?, COALESCE(?,0), COALESCE(?,0), '{}')
		ON CONFLICT(book_id, reader_id) DO UPDATE SET
			read_state = excluded.read_state,
			read_date = COALESCE(excluded.read_date, reading_state.read_date),
			online_read = COALESCE(?, reading_state.online_read),
			download = COALESCE(?, reading_state.download)`,
		bookID, readerID, readState, readDate, onlineRead, download, onlineRead, download)
	return err
}

// SetReadingProgress 写入阅读进度。
func SetReadingProgress(db *sql.DB, bookID, readerID int64, progress map[string]any) error {
	encoded, err := json.Marshal(progress)
	if err != nil {
		return err
	}
	now := time.Now().UTC().Format("2006-01-02 15:04:05")
	_, err = db.Exec(`INSERT INTO reading_state
		(book_id, reader_id, favorite, wants, read_state, online_read, download, progress, progress_update_time)
		VALUES (?, ?, 0, 0, 0, 0, 0, ?, ?)
		ON CONFLICT(book_id, reader_id) DO UPDATE SET
			progress = excluded.progress,
			progress_update_time = excluded.progress_update_time`,
		bookID, readerID, string(encoded), now)
	return err
}

// SetReadingFavorite 写入收藏状态。
func SetReadingFavorite(db *sql.DB, bookID, readerID int64, favorite bool) error {
	value := int64(0)
	var date any
	if favorite {
		value = 1
		date = time.Now().UTC().Format("2006-01-02 15:04:05")
	}
	_, err := db.Exec(`INSERT INTO reading_state
		(book_id, reader_id, favorite, favorite_date, wants, read_state, online_read, download, progress)
		VALUES (?, ?, ?, ?, 0, 0, 0, 0, '{}')
		ON CONFLICT(book_id, reader_id) DO UPDATE SET
			favorite = excluded.favorite,
			favorite_date = excluded.favorite_date`,
		bookID, readerID, value, date)
	return err
}

// SetReadingWants 写入书架（想读）状态。
func SetReadingWants(db *sql.DB, bookID, readerID int64, wants bool) error {
	value := int64(0)
	var date any
	if wants {
		value = 1
		date = time.Now().UTC().Format("2006-01-02 15:04:05")
	}
	_, err := db.Exec(`INSERT INTO reading_state
		(book_id, reader_id, favorite, wants, wants_date, read_state, online_read, download, progress)
		VALUES (?, ?, 0, ?, ?, 0, 0, 0, '{}')
		ON CONFLICT(book_id, reader_id) DO UPDATE SET
			wants = excluded.wants,
			wants_date = excluded.wants_date`,
		bookID, readerID, value, date)
	return err
}

// SetItemScope 写入书籍可见范围。
func SetItemScope(db *sql.DB, bookID int64, scope string) error {
	_, err := db.Exec(`UPDATE items SET scope = ? WHERE book_id = ?`, scope, bookID)
	return err
}

// SetItemMediaType 写入媒体类型。
func SetItemMediaType(db *sql.DB, bookID int64, mediaType string) error {
	_, err := db.Exec(`UPDATE items SET media_type = ? WHERE book_id = ?`, mediaType, bookID)
	return err
}

// ListCardItems reads display fields for a page with one bound JSON parameter.
func ListCardItems(db *sql.DB, ids []int64) (map[int64]*Item, error) {
	out := map[int64]*Item{}
	if len(ids) == 0 || db == nil {
		return out, nil
	}
	raw, _ := json.Marshal(ids)
	rows, err := db.Query(`SELECT book_id,COALESCE(scope,'public'),collector_id,COALESCE(count_visit,0),COALESCE(count_download,0),COALESCE(media_type,'unknown'),COALESCE(media_type_locked,0) FROM items WHERE book_id IN (SELECT value FROM json_each(?))`, string(raw))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		v := &Item{}
		var locked int64
		if err = rows.Scan(&v.BookID, &v.Scope, &v.CollectorID, &v.CountVisit, &v.CountDownload, &v.MediaType, &locked); err != nil {
			return nil, err
		}
		v.MediaTypeLocked = locked != 0
		out[v.BookID] = v
	}
	return out, rows.Err()
}
