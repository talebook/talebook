package userdb

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// ConfigMap 解析版本的 config JSON。
func (e *AudiobookEdition) ConfigMap() map[string]any {
	return decodeJSONMap(e.Config)
}

// DataMap 解析任务的 data JSON。
func (j *AudiobookJob) DataMap() map[string]any {
	return decodeJSONMap(j.Data)
}

// ConfigMap 解析任务的 config JSON。
func (j *AudiobookJob) ConfigMap() map[string]any {
	return decodeJSONMap(j.Config)
}

// ToDict 复刻 Python 的 _job_dict：返回接口用的任务字典。
func (j *AudiobookJob) ToDict() map[string]any {
	return map[string]any{
		"id":                j.ID,
		"book_id":           j.BookID,
		"edition_id":        j.EditionID,
		"creator_id":        j.CreatorID,
		"mode":              j.Mode,
		"status":            j.Status,
		"phase":             j.Phase,
		"priority":          j.Priority,
		"config":            j.ConfigMap(),
		"chapter_selection": j.ChapterSelection,
		"config_hash":       j.ConfigHash,
		"progress":          j.Progress,
		"cancel_requested":  j.CancelRequested,
		"attempts":          j.Attempts,
		"error_code":        j.ErrorCode,
		"error_message":     j.ErrorMessage,
		"data":              j.DataMap(),
		"create_time":       j.CreateTime,
		"update_time":       j.UpdateTime,
	}
}

// decodeJSONMap 把任意值解析成 map；失败返回空 map。
func decodeJSONMap(value any) map[string]any {
	out := map[string]any{}
	switch v := value.(type) {
	case nil:
		return out
	case map[string]any:
		return v
	case []byte:
		_ = json.Unmarshal(v, &out)
	case string:
		if strings.TrimSpace(v) == "" {
			return out
		}
		_ = json.Unmarshal([]byte(v), &out)
	}
	return out
}

// ListPublishedAudiobookEditions 取全部已发布版本，按发布时间降序。
func ListPublishedAudiobookEditions(db *sql.DB) ([]*AudiobookEdition, error) {
	rows, err := db.Query(`SELECT id, book_id, status, engine, COALESCE(config,'{}'),
		COALESCE(source_fingerprint,''), COALESCE(script_path,''), COALESCE(manifest_path,''),
		COALESCE(chapter_count,0), COALESCE(completed_count,0), COALESCE(duration_ms,0),
		COALESCE(size_bytes,0), created_by, create_time, update_time, COALESCE(published_at,'')
		FROM audiobook_editions WHERE status = 'published'
		ORDER BY published_at DESC`)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	return scanAudiobookEditions(rows)
}

// ListAudiobookProgressFor 批量取某读者在多个版本上的进度。
func ListAudiobookProgressFor(db *sql.DB, readerID int64, editionIDs []int64) (map[int64]*AudiobookProgress, error) {
	out := map[int64]*AudiobookProgress{}
	if len(editionIDs) == 0 {
		return out, nil
	}
	placeholders := strings.TrimSuffix(strings.Repeat("?,", len(editionIDs)), ",")
	args := make([]any, 0, len(editionIDs)+1)
	args = append(args, readerID)
	for _, id := range editionIDs {
		args = append(args, id)
	}
	rows, err := db.Query(`SELECT id, reader_id, edition_id, chapter_id, COALESCE(position_ms,0),
		COALESCE(segment_id,''), COALESCE(listened_ms,0), COALESCE(is_finished,0),
		COALESCE(version,1), COALESCE(update_time,'')
		FROM audiobook_progress WHERE reader_id = ? AND edition_id IN (`+placeholders+`)`, args...)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	for rows.Next() {
		p := &AudiobookProgress{}
		var finished int64
		if err := rows.Scan(&p.ID, &p.ReaderID, &p.EditionID, &p.ChapterID, &p.PositionMS, &p.SegmentID,
			&p.ListenedMS, &finished, &p.Version, &p.UpdateTime); err != nil {
			return nil, err
		}
		p.IsFinished = finished != 0
		out[p.EditionID] = p
	}
	return out, rows.Err()
}

// CreateAudiobookBookmark 新增书签并返回 id。
func CreateAudiobookBookmark(db *sql.DB, readerID, editionID, chapterID, positionMS int64, note string) (int64, error) {
	res, err := db.Exec(`INSERT INTO audiobook_bookmarks
		(reader_id, edition_id, chapter_id, position_ms, note, create_time)
		VALUES (?, ?, ?, ?, ?, ?)`,
		readerID, editionID, chapterID, positionMS, note, time.Now().UTC().Format("2006-01-02 15:04:05"))
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// ListAudiobookJobs 列出任务：管理员看全部，普通读者看自己创建的。
func ListAudiobookJobs(db *sql.DB, creatorID int64, isAdmin bool) ([]*AudiobookJob, error) {
	query := `SELECT id, book_id, edition_id, creator_id, mode, status, COALESCE(phase,''), priority,
		COALESCE(config,'{}'), COALESCE(chapter_selection,''), COALESCE(config_hash,''),
		COALESCE(progress,0), COALESCE(lease_owner,''), COALESCE(lease_until,''),
		COALESCE(last_event_seq,0), COALESCE(cancel_requested,0), COALESCE(cancel_requested_at,''),
		COALESCE(attempts,0), COALESCE(error_code,''), COALESCE(error_message,''), COALESCE(log_path,''),
		COALESCE(data,'{}'), create_time, update_time, COALESCE(started_at,''), COALESCE(finished_at,'')
		FROM audiobook_jobs`
	args := []any{}
	if !isAdmin {
		query += ` WHERE creator_id = ?`
		args = append(args, creatorID)
	}
	query += ` ORDER BY id DESC LIMIT 200`
	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	return scanAudiobookJobs(rows)
}

// scanAudiobookJobs 扫描任务行。
func scanAudiobookJobs(rows *sql.Rows) ([]*AudiobookJob, error) {
	out := []*AudiobookJob{}
	for rows.Next() {
		j := &AudiobookJob{}
		var config, data string
		var cancelRequested int64
		if err := rows.Scan(&j.ID, &j.BookID, &j.EditionID, &j.CreatorID, &j.Mode, &j.Status, &j.Phase,
			&j.Priority, &config, &j.ChapterSelection, &j.ConfigHash, &j.Progress, &j.LeaseOwner,
			&j.LeaseUntil, &j.LastEventSeq, &cancelRequested, &j.CancelRequestedAt, &j.Attempts,
			&j.ErrorCode, &j.ErrorMessage, &j.LogPath, &data, &j.CreateTime, &j.UpdateTime,
			&j.StartedAt, &j.FinishedAt); err != nil {
			return nil, err
		}
		j.CancelRequested = cancelRequested != 0
		j.Config = decodeJSONMap(config)
		j.Data = decodeJSONMap(data)
		out = append(out, j)
	}
	return out, rows.Err()
}

// scanAudiobookEditions 扫描版本行。
func scanAudiobookEditions(rows *sql.Rows) ([]*AudiobookEdition, error) {
	out := []*AudiobookEdition{}
	for rows.Next() {
		e := &AudiobookEdition{}
		var config string
		if err := rows.Scan(&e.ID, &e.BookID, &e.Status, &e.Engine, &config,
			&e.SourceFingerprint, &e.ScriptPath, &e.ManifestPath, &e.ChapterCount, &e.CompletedCount,
			&e.DurationMS, &e.SizeBytes, &e.CreatedBy, &e.CreateTime, &e.UpdateTime,
			&e.PublishedAt); err != nil {
			return nil, err
		}
		e.Config = decodeJSONMap(config)
		out = append(out, e)
	}
	return out, rows.Err()
}

// AudiobookStatsForReader 汇总某读者的收听统计。
func AudiobookStatsForReader(db *sql.DB, readerID int64) (map[string]any, error) {
	stats := map[string]any{
		"listened_ms":    int64(0),
		"finished_count": int64(0),
		"edition_count":  int64(0),
		"bookmark_count": int64(0),
		"session_count":  int64(0),
	}
	var listened, finished, editions sql.NullInt64
	err := db.QueryRow(`SELECT COALESCE(SUM(listened_ms), 0),
		COALESCE(SUM(CASE WHEN is_finished THEN 1 ELSE 0 END), 0), COUNT(*)
		FROM audiobook_progress WHERE reader_id = ?`, readerID).Scan(&listened, &finished, &editions)
	if err != nil {
		return nil, err
	}
	stats["listened_ms"] = listened.Int64
	stats["finished_count"] = finished.Int64
	stats["edition_count"] = editions.Int64

	var bookmarks, sessions sql.NullInt64
	if err := db.QueryRow(`SELECT COUNT(*) FROM audiobook_bookmarks WHERE reader_id = ?`, readerID).
		Scan(&bookmarks); err != nil {
		return nil, err
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM audiobook_playback_sessions WHERE reader_id = ?`, readerID).
		Scan(&sessions); err != nil {
		return nil, err
	}
	stats["bookmark_count"] = bookmarks.Int64
	stats["session_count"] = sessions.Int64
	return stats, nil
}

// AudiobookAdminStats 汇总全站有声书统计。
func AudiobookAdminStats(db *sql.DB) (map[string]any, error) {
	stats := map[string]any{}
	counts := map[string]string{
		"edition_count":      `SELECT COUNT(*) FROM audiobook_editions`,
		"published_count":    `SELECT COUNT(*) FROM audiobook_editions WHERE status = 'published'`,
		"chapter_count":      `SELECT COUNT(*) FROM audiobook_chapters`,
		"job_count":          `SELECT COUNT(*) FROM audiobook_jobs`,
		"active_jobs":        `SELECT COUNT(*) FROM audiobook_jobs WHERE status IN ('queued','running','paused')`,
		"subscription_count": `SELECT COUNT(*) FROM podcast_subscriptions WHERE active = 1`,
		"bookmark_count":     `SELECT COUNT(*) FROM audiobook_bookmarks`,
	}
	for key, query := range counts {
		var n int64
		if err := db.QueryRow(query).Scan(&n); err != nil {
			return nil, err
		}
		stats[key] = n
	}
	var totalBytes, totalDuration sql.NullInt64
	if err := db.QueryRow(`SELECT COALESCE(SUM(size_bytes), 0), COALESCE(SUM(duration_ms), 0)
		FROM audiobook_editions`).Scan(&totalBytes, &totalDuration); err != nil {
		return nil, err
	}
	stats["total_size_bytes"] = totalBytes.Int64
	stats["total_duration_ms"] = totalDuration.Int64
	return stats, nil
}

// AudiobookJobByID 按 id 取任务。
func AudiobookJobByID(db *sql.DB, id int64) (*AudiobookJob, error) {
	rows, err := db.Query(`SELECT id, book_id, edition_id, creator_id, mode, status, COALESCE(phase,''),
		priority, COALESCE(config,'{}'), COALESCE(chapter_selection,''), COALESCE(config_hash,''),
		COALESCE(progress,0), COALESCE(lease_owner,''), COALESCE(lease_until,''),
		COALESCE(last_event_seq,0), COALESCE(cancel_requested,0), COALESCE(cancel_requested_at,''),
		COALESCE(attempts,0), COALESCE(error_code,''), COALESCE(error_message,''), COALESCE(log_path,''),
		COALESCE(data,'{}'), create_time, update_time, COALESCE(started_at,''), COALESCE(finished_at,'')
		FROM audiobook_jobs WHERE id = ?`, id)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	jobs, err := scanAudiobookJobs(rows)
	if err != nil {
		return nil, err
	}
	if len(jobs) == 0 {
		return nil, nil
	}
	return jobs[0], nil
}

// AudiobookChapterByNumber 按版本与章节号取章节。
func AudiobookChapterByNumber(db *sql.DB, editionID int64, number int64) (*AudiobookChapter, error) {
	row := db.QueryRow(`SELECT id, edition_id, COALESCE(source_key,''), number, COALESCE(title,''),
		COALESCE(audio_path,''), COALESCE(timeline_path,''), COALESCE(duration_ms,0),
		COALESCE(size_bytes,0), COALESCE(content_hash,''), COALESCE(episode_guid,''),
		COALESCE(first_published_at,'')
		FROM audiobook_chapters WHERE edition_id = ? AND number = ?`, editionID, number)
	c := &AudiobookChapter{}
	err := row.Scan(&c.ID, &c.EditionID, &c.SourceKey, &c.Number, &c.Title, &c.AudioPath,
		&c.TimelinePath, &c.DurationMS, &c.SizeBytes, &c.ContentHash, &c.EpisodeGUID,
		&c.FirstPublishedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return c, nil
}

// UpsertAudiobookProgress 写入收听进度（按 reader+edition 唯一）。
func UpsertAudiobookProgress(db *sql.DB, readerID, editionID, chapterID, positionMS, listenedMS int64, finished bool) error {
	_, err := db.Exec(`INSERT INTO audiobook_progress
		(reader_id, edition_id, chapter_id, position_ms, listened_ms, is_finished, version, update_time)
		VALUES (?, ?, ?, ?, ?, ?, 1, ?)
		ON CONFLICT(reader_id, edition_id) DO UPDATE SET
			chapter_id = excluded.chapter_id,
			position_ms = excluded.position_ms,
			listened_ms = excluded.listened_ms,
			is_finished = excluded.is_finished,
			version = audiobook_progress.version + 1,
			update_time = excluded.update_time`,
		readerID, editionID, chapterID, positionMS, listenedMS, finished,
		time.Now().UTC().Format("2006-01-02 15:04:05"))
	return err
}

// CreateAudiobookPlaybackSession 创建播放会话并返回 uuid。
func CreateAudiobookPlaybackSession(db *sql.DB, readerID, editionID int64, source, deviceID, ip, userAgent string) (string, error) {
	uuid := newSessionUUID()
	_, err := db.Exec(`INSERT INTO audiobook_playback_sessions
		(uuid, reader_id, edition_id, source, device_id, ip, user_agent, started_at, current_ms, listened_ms, completed)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)`,
		uuid, readerID, editionID, source, deviceID, ip, userAgent,
		time.Now().UTC().Format("2006-01-02 15:04:05"))
	if err != nil {
		return "", err
	}
	return uuid, nil
}

// UpdateAudiobookPlaybackSession 更新播放会话；close 为真时写入结束时间。
func UpdateAudiobookPlaybackSession(db *sql.DB, uuid string, readerID, currentMS, listenedMS int64, completed, close bool) error {
	query := `UPDATE audiobook_playback_sessions SET current_ms = ?, listened_ms = ?, completed = ?`
	args := []any{currentMS, listenedMS, completed}
	if close {
		query += `, ended_at = ?`
		args = append(args, time.Now().UTC().Format("2006-01-02 15:04:05"))
	}
	query += ` WHERE uuid = ? AND reader_id = ?`
	args = append(args, uuid, readerID)
	res, err := db.Exec(query, args...)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// newSessionUUID 生成 32 位十六进制会话标识。
func newSessionUUID() string {
	return fmt.Sprintf("%032x", time.Now().UnixNano())
}
