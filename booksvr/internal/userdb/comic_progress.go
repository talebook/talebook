// 本文件实现漫画阅读进度的持久化，对齐 comic.py 的 ComicProgressHandler.post。
package userdb

import (
	"database/sql"
	"fmt"
)

// UpsertComicProgress 写入漫画阅读进度并标记为在线阅读。
//
// 对齐 Python 的：
//
//	reading_state.set_progress(normalized)
//	reading_state.set_online_read(True)
//
// 记录不存在时新建（book_id + reader_id 为复合主键）。
func UpsertComicProgress(db *sql.DB, bookID, readerID int64, progress map[string]any) error {
	payload, err := marshalJSON(progress)
	if err != nil {
		return err
	}
	now := nowString()

	existing, err := GetReadingState(db, bookID, readerID)
	if err != nil {
		return err
	}
	if existing == nil {
		_, err = db.Exec(`INSERT INTO reading_state (book_id, reader_id, favorite, wants,
			read_state, online_read, download, progress, progress_update_time)
			VALUES (?, ?, 0, 0, 0, 1, 0, ?, ?)`, bookID, readerID, payload, now)
		if err != nil {
			return fmt.Errorf("userdb: 创建 reading_state 失败: %w", err)
		}
		return nil
	}

	_, err = db.Exec(`UPDATE reading_state SET progress = ?, progress_update_time = ?, online_read = 1
		WHERE book_id = ? AND reader_id = ?`, payload, now, bookID, readerID)
	if err != nil {
		return fmt.Errorf("userdb: 更新 reading_state 失败: %w", err)
	}
	return nil
}
