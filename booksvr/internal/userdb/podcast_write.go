package userdb

import (
	"database/sql"
	"fmt"
	"time"
)

// ListPodcastAccessLogs 返回最近的播客访问日志。
func ListPodcastAccessLogs(db *sql.DB, limit int) ([]map[string]any, error) {
	if limit <= 0 {
		limit = 100
	}
	rows, err := db.Query(`SELECT id, subscription_id, book_id, edition_id, chapter_id, kind,
		method, status, ip, user_agent, create_time
		FROM podcast_access_logs ORDER BY id DESC LIMIT ?`, limit)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询访问日志失败: %w", err)
	}
	defer rows.Close()

	out := []map[string]any{}
	for rows.Next() {
		var id, subID, status int64
		var bookID, editionID, chapterID sql.NullInt64
		var kind, method, ip, ua, createTime sql.NullString
		if err := rows.Scan(&id, &subID, &bookID, &editionID, &chapterID, &kind,
			&method, &status, &ip, &ua, &createTime); err != nil {
			return nil, fmt.Errorf("userdb: 扫描访问日志失败: %w", err)
		}
		out = append(out, map[string]any{
			"id":              id,
			"subscription_id": subID,
			"book_id":         bookID.Int64,
			"edition_id":      editionID.Int64,
			"chapter_id":      chapterID.Int64,
			"kind":            kind.String,
			"method":          method.String,
			"status":          status,
			"ip":              ip.String,
			"user_agent":      ua.String,
			"create_time":     createTime.String,
		})
	}
	return out, rows.Err()
}

// FreezePodcastSubscription 冻结播客订阅。
func FreezePodcastSubscription(db *sql.DB, readerID int64, reason string) error {
	now := time.Now().Format("2006-01-02 15:04:05")
	res, err := db.Exec(`UPDATE podcast_subscriptions
		SET frozen_at = ?, frozen_reason = ? WHERE reader_id = ?`, now, reason, readerID)
	if err != nil {
		return fmt.Errorf("userdb: 冻结订阅失败: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// UnfreezePodcastSubscription 解冻播客订阅。
func UnfreezePodcastSubscription(db *sql.DB, readerID int64) error {
	res, err := db.Exec(`UPDATE podcast_subscriptions
		SET frozen_at = NULL, frozen_reason = '' WHERE reader_id = ?`, readerID)
	if err != nil {
		return fmt.Errorf("userdb: 解冻订阅失败: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}
