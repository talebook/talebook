package userdb

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

// ErrNotFound 表示目标记录不存在。
var ErrNotFound = errors.New("userdb: 记录不存在")

// ActiveJobStatuses 复刻 Python ACTIVE_JOB_STATUSES。
var ActiveJobStatuses = []string{"queued", "inspecting", "awaiting_review", "generating", "finalizing"}

// CreateAudiobookEdition 插入一个有声书版本，返回新 id。
func CreateAudiobookEdition(db *sql.DB, bookID int64, status, engine string,
	config map[string]any, createdBy int64) (int64, error) {
	now := time.Now().Format("2006-01-02 15:04:05")
	body, err := json.Marshal(config)
	if err != nil {
		return 0, fmt.Errorf("userdb: 序列化 config 失败: %w", err)
	}
	res, err := db.Exec(`INSERT INTO audiobook_editions
		(book_id, status, engine, config, created_by, create_time, update_time)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		bookID, status, engine, string(body), createdBy, now, now)
	if err != nil {
		return 0, fmt.Errorf("userdb: 插入版本失败: %w", err)
	}
	return res.LastInsertId()
}

// CreateAudiobookJob 插入一个生成任务，返回新 id。
func CreateAudiobookJob(db *sql.DB, job *AudiobookJob) (int64, error) {
	now := time.Now().Format("2006-01-02 15:04:05")
	if job.CreateTime == "" {
		job.CreateTime = now
	}
	if job.UpdateTime == "" {
		job.UpdateTime = now
	}
	cfg, err := json.Marshal(job.Config)
	if err != nil {
		return 0, fmt.Errorf("userdb: 序列化 config 失败: %w", err)
	}
	data, err := json.Marshal(job.Data)
	if err != nil {
		return 0, fmt.Errorf("userdb: 序列化 data 失败: %w", err)
	}
	res, err := db.Exec(`INSERT INTO audiobook_jobs
		(book_id, edition_id, creator_id, mode, status, phase, priority, config,
		 chapter_selection, config_hash, progress, last_event_seq, attempts, data,
		 create_time, update_time)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		job.BookID, job.EditionID, job.CreatorID, job.Mode, job.Status, job.Phase,
		job.Priority, string(cfg), job.ChapterSelection, job.ConfigHash, job.Progress,
		job.LastEventSeq, job.Attempts, string(data), job.CreateTime, job.UpdateTime)
	if err != nil {
		return 0, fmt.Errorf("userdb: 插入任务失败: %w", err)
	}
	return res.LastInsertId()
}

// FindActiveJobByHash 查找同书同配置哈希的活跃任务。
func FindActiveJobByHash(db *sql.DB, bookID int64, configHash string) (*AudiobookJob, error) {
	ph := ""
	args := []any{bookID, configHash}
	for i, s := range ActiveJobStatuses {
		if i > 0 {
			ph += ", "
		}
		ph += "?"
		args = append(args, s)
	}
	row := db.QueryRow(`SELECT id, book_id, edition_id, creator_id, mode, status, phase,
		priority, config, chapter_selection, config_hash, progress, last_event_seq,
		attempts, data, create_time, update_time
		FROM audiobook_jobs WHERE book_id = ? AND config_hash = ? AND status IN (`+ph+`)
		LIMIT 1`, args...)
	return scanJobRow(row)
}

// UpdateAudiobookJobStatus 更新任务状态与阶段。
func UpdateAudiobookJobStatus(db *sql.DB, jobID int64, status, phase string) error {
	now := time.Now().Format("2006-01-02 15:04:05")
	res, err := db.Exec(`UPDATE audiobook_jobs SET status = ?, phase = ?, update_time = ?
		WHERE id = ?`, status, phase, now, jobID)
	if err != nil {
		return fmt.Errorf("userdb: 更新任务状态失败: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// RequestAudiobookJobCancel 标记任务取消请求。
func RequestAudiobookJobCancel(db *sql.DB, jobID int64) error {
	now := time.Now().Format("2006-01-02 15:04:05")
	res, err := db.Exec(`UPDATE audiobook_jobs
		SET cancel_requested = 1, cancel_requested_at = ?, update_time = ?
		WHERE id = ?`, now, now, jobID)
	if err != nil {
		return fmt.Errorf("userdb: 取消任务失败: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// UpdateAudiobookJobData 更新任务的 data 字段。
func UpdateAudiobookJobData(db *sql.DB, jobID int64, data map[string]any) error {
	body, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("userdb: 序列化 data 失败: %w", err)
	}
	now := time.Now().Format("2006-01-02 15:04:05")
	_, err = db.Exec(`UPDATE audiobook_jobs SET data = ?, update_time = ? WHERE id = ?`,
		string(body), now, jobID)
	return err
}

// DeleteAudiobookEdition 删除版本及其章节。
func DeleteAudiobookEdition(db *sql.DB, editionID int64) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.Exec(`DELETE FROM audiobook_chapters WHERE edition_id = ?`, editionID); err != nil {
		return fmt.Errorf("userdb: 删除章节失败: %w", err)
	}
	res, err := tx.Exec(`DELETE FROM audiobook_editions WHERE id = ?`, editionID)
	if err != nil {
		return fmt.Errorf("userdb: 删除版本失败: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return tx.Commit()
}

// UpsertPodcastSubscription 创建或更新播客订阅。
func UpsertPodcastSubscription(db *sql.DB, readerID int64, tokenHash, tokenHint string) (int64, error) {
	now := time.Now().Format("2006-01-02 15:04:05")
	var id int64
	err := db.QueryRow(`SELECT id FROM podcast_subscriptions WHERE reader_id = ?`, readerID).Scan(&id)
	if err == nil {
		if _, err := db.Exec(`UPDATE podcast_subscriptions
			SET token_hash = ?, token_hint = ?, active = 1, revoked_at = NULL
			WHERE id = ?`, tokenHash, tokenHint, id); err != nil {
			return 0, fmt.Errorf("userdb: 更新订阅失败: %w", err)
		}
		return id, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return 0, fmt.Errorf("userdb: 查询订阅失败: %w", err)
	}
	res, err := db.Exec(`INSERT INTO podcast_subscriptions
		(reader_id, token_hash, token_hint, active, hidden_books, create_time)
		VALUES (?, ?, ?, 1, '{}', ?)`, readerID, tokenHash, tokenHint, now)
	if err != nil {
		return 0, fmt.Errorf("userdb: 插入订阅失败: %w", err)
	}
	return res.LastInsertId()
}

// RevokePodcastSubscription 撤销播客订阅。
func RevokePodcastSubscription(db *sql.DB, readerID int64) error {
	now := time.Now().Format("2006-01-02 15:04:05")
	res, err := db.Exec(`UPDATE podcast_subscriptions
		SET active = 0, revoked_at = ? WHERE reader_id = ?`, now, readerID)
	if err != nil {
		return fmt.Errorf("userdb: 撤销订阅失败: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// GetPodcastSubscriptionByReader 按读者取订阅。
func GetPodcastSubscriptionByReader(db *sql.DB, readerID int64) (*PodcastSubscription, error) {
	row := db.QueryRow(`SELECT id, reader_id, token_hash, token_hint, active, hidden_books,
		create_time, last_access_at, revoked_at, frozen_at, frozen_reason
		FROM podcast_subscriptions WHERE reader_id = ?`, readerID)
	var sub PodcastSubscription
	var hidden sql.NullString
	var lastAccess, revokedAt, frozenAt, frozenReason sql.NullString
	err := row.Scan(&sub.ID, &sub.ReaderID, &sub.TokenHash, &sub.TokenHint, &sub.Active,
		&hidden, &sub.CreateTime, &lastAccess, &revokedAt, &frozenAt, &frozenReason)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询订阅失败: %w", err)
	}
	sub.LastAccessAt = lastAccess.String
	sub.RevokedAt = revokedAt.String
	sub.FrozenAt = frozenAt.String
	sub.FrozenReason = frozenReason.String
	if hidden.Valid && hidden.String != "" {
		_ = json.Unmarshal([]byte(hidden.String), &sub.HiddenBooks)
	}
	return &sub, nil
}

// scanJobRow 扫描一行任务记录。
func scanJobRow(row *sql.Row) (*AudiobookJob, error) {
	var job AudiobookJob
	var cfg, data sql.NullString
	err := row.Scan(&job.ID, &job.BookID, &job.EditionID, &job.CreatorID, &job.Mode,
		&job.Status, &job.Phase, &job.Priority, &cfg, &job.ChapterSelection,
		&job.ConfigHash, &job.Progress, &job.LastEventSeq, &job.Attempts, &data,
		&job.CreateTime, &job.UpdateTime)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("userdb: 扫描任务失败: %w", err)
	}
	if cfg.Valid && cfg.String != "" {
		_ = json.Unmarshal([]byte(cfg.String), &job.Config)
	}
	if data.Valid && data.String != "" {
		_ = json.Unmarshal([]byte(data.String), &job.Data)
	}
	return &job, nil
}
