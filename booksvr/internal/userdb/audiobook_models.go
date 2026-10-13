// 本文件复刻 webserver/models.py 中与「有声书 / Podcast」相关的模型。
package userdb

import (
	"database/sql"
	"fmt"
)

// AudiobookEdition 对应 models.py 的 AudiobookEdition 模型（audiobook_editions 表）。
type AudiobookEdition struct {
	ID                int64          `json:"id"`
	BookID            int64          `json:"book_id"`
	Status            string         `json:"status"`
	Engine            string         `json:"engine"`
	Config            map[string]any `json:"config"`
	SourceFingerprint string         `json:"source_fingerprint"`
	ScriptPath        string         `json:"script_path"`
	ManifestPath      string         `json:"manifest_path"`
	ChapterCount      int64          `json:"chapter_count"`
	CompletedCount    int64          `json:"completed_count"`
	DurationMS        int64          `json:"duration_ms"`
	SizeBytes         int64          `json:"size_bytes"`
	CreatedBy         int64          `json:"created_by"`
	CreateTime        string         `json:"create_time"`
	UpdateTime        string         `json:"update_time"`
	PublishedAt       string         `json:"published_at"`
}

// AudiobookChapter 对应 models.py 的 AudiobookChapter 模型（audiobook_chapters 表）。
type AudiobookChapter struct {
	ID               int64  `json:"id"`
	EditionID        int64  `json:"edition_id"`
	SourceKey        string `json:"source_key"`
	Number           int64  `json:"number"`
	Title            string `json:"title"`
	AudioPath        string `json:"audio_path"`
	TimelinePath     string `json:"timeline_path"`
	DurationMS       int64  `json:"duration_ms"`
	SizeBytes        int64  `json:"size_bytes"`
	ContentHash      string `json:"content_hash"`
	EpisodeGUID      string `json:"episode_guid"`
	FirstPublishedAt string `json:"first_published_at"`
}

// AudiobookJob 对应 models.py 的 AudiobookJob 模型（audiobook_jobs 表）。
type AudiobookJob struct {
	ID                int64          `json:"id"`
	BookID            int64          `json:"book_id"`
	EditionID         int64          `json:"edition_id"`
	CreatorID         int64          `json:"creator_id"`
	Mode              string         `json:"mode"`
	Status            string         `json:"status"`
	Phase             string         `json:"phase"`
	Priority          int64          `json:"priority"`
	Config            map[string]any `json:"config"`
	ChapterSelection  string         `json:"chapter_selection"`
	ConfigHash        string         `json:"config_hash"`
	Progress          float64        `json:"progress"`
	LeaseOwner        string         `json:"lease_owner"`
	LeaseUntil        string         `json:"lease_until"`
	LastEventSeq      int64          `json:"last_event_seq"`
	CancelRequested   bool           `json:"cancel_requested"`
	CancelRequestedAt string         `json:"cancel_requested_at"`
	Attempts          int64          `json:"attempts"`
	ErrorCode         string         `json:"error_code"`
	ErrorMessage      string         `json:"error_message"`
	LogPath           string         `json:"log_path"`
	Data              map[string]any `json:"data"`
	CreateTime        string         `json:"create_time"`
	UpdateTime        string         `json:"update_time"`
	StartedAt         string         `json:"started_at"`
	FinishedAt        string         `json:"finished_at"`
}

// AudiobookProgress 对应 models.py 的 AudiobookProgress 模型（audiobook_progress 表）。
type AudiobookProgress struct {
	ID         int64         `json:"id"`
	ReaderID   int64         `json:"reader_id"`
	EditionID  int64         `json:"edition_id"`
	ChapterID  sql.NullInt64 `json:"chapter_id"`
	PositionMS int64         `json:"position_ms"`
	SegmentID  string        `json:"segment_id"`
	ListenedMS int64         `json:"listened_ms"`
	IsFinished bool          `json:"is_finished"`
	Version    int64         `json:"version"`
	UpdateTime string        `json:"update_time"`
}

// AudiobookBookmark 对应 models.py 的 AudiobookBookmark 模型（audiobook_bookmarks 表）。
type AudiobookBookmark struct {
	ID         int64  `json:"id"`
	ReaderID   int64  `json:"reader_id"`
	EditionID  int64  `json:"edition_id"`
	ChapterID  int64  `json:"chapter_id"`
	PositionMS int64  `json:"position_ms"`
	SegmentID  string `json:"segment_id"`
	Note       string `json:"note"`
	CreateTime string `json:"create_time"`
}

// AudiobookPlaybackSession 对应 models.py 的 AudiobookPlaybackSession 模型（audiobook_playback_sessions 表）。
type AudiobookPlaybackSession struct {
	ID         int64  `json:"id"`
	UUID       string `json:"uuid"`
	ReaderID   int64  `json:"reader_id"`
	EditionID  int64  `json:"edition_id"`
	Source     string `json:"source"`
	DeviceID   string `json:"device_id"`
	IP         string `json:"ip"`
	UserAgent  string `json:"user_agent"`
	StartedAt  string `json:"started_at"`
	EndedAt    string `json:"ended_at"`
	CurrentMS  int64  `json:"current_ms"`
	ListenedMS int64  `json:"listened_ms"`
	Completed  bool   `json:"completed"`
}

// PodcastSubscription 对应 models.py 的 PodcastSubscription 模型（podcast_subscriptions 表）。
type PodcastSubscription struct {
	ID           int64          `json:"id"`
	ReaderID     int64          `json:"reader_id"`
	TokenHash    string         `json:"token_hash"`
	TokenHint    string         `json:"token_hint"`
	Active       bool           `json:"active"`
	HiddenBooks  map[string]any `json:"hidden_books"`
	CreateTime   string         `json:"create_time"`
	LastAccessAt string         `json:"last_access_at"`
	RevokedAt    string         `json:"revoked_at"`
	FrozenAt     string         `json:"frozen_at"`
	FrozenReason string         `json:"frozen_reason"`
}

// PodcastAccessLog 对应 models.py 的 PodcastAccessLog 模型（podcast_access_logs 表）。
type PodcastAccessLog struct {
	ID             int64         `json:"id"`
	SubscriptionID int64         `json:"subscription_id"`
	BookID         sql.NullInt64 `json:"book_id"`
	EditionID      sql.NullInt64 `json:"edition_id"`
	ChapterID      sql.NullInt64 `json:"chapter_id"`
	Kind           string        `json:"kind"`
	Method         string        `json:"method"`
	Status         int64         `json:"status"`
	RangeStart     sql.NullInt64 `json:"range_start"`
	RangeEnd       sql.NullInt64 `json:"range_end"`
	BytesSent      int64         `json:"bytes_sent"`
	IP             string        `json:"ip"`
	UserAgent      string        `json:"user_agent"`
	Protected      bool          `json:"protected"`
	CreateTime     string        `json:"create_time"`
}

// AudiobookDailyStat 对应 models.py 的 AudiobookDailyStat 模型（audiobook_daily_stats 表）。
type AudiobookDailyStat struct {
	ID         int64         `json:"id"`
	Date       string        `json:"date"`
	Scope      string        `json:"scope"`
	ReaderID   sql.NullInt64 `json:"reader_id"`
	BookID     sql.NullInt64 `json:"book_id"`
	ChapterID  sql.NullInt64 `json:"chapter_id"`
	Source     string        `json:"source"`
	ListenedMS int64         `json:"listened_ms"`
	Sessions   int64         `json:"sessions"`
	Starts     int64         `json:"starts"`
	Completes  int64         `json:"completes"`
	Requests   int64         `json:"requests"`
	BytesSent  int64         `json:"bytes_sent"`
}

// GetAudiobookEdition 按 id 取有声书版本；不存在返回 nil。
func GetAudiobookEdition(db *sql.DB, id int64) (*AudiobookEdition, error) {
	row := db.QueryRow(`SELECT id, book_id, COALESCE(status,'draft'), COALESCE(engine,'edgetts'),
		COALESCE(config,'{}'), COALESCE(source_fingerprint,''), COALESCE(script_path,''),
		COALESCE(manifest_path,''), COALESCE(chapter_count,0), COALESCE(completed_count,0),
		COALESCE(duration_ms,0), COALESCE(size_bytes,0), created_by, COALESCE(create_time,''),
		COALESCE(update_time,''), COALESCE(published_at,'')
		FROM audiobook_editions WHERE id = ?`, id)
	e := &AudiobookEdition{}
	var config string
	err := row.Scan(&e.ID, &e.BookID, &e.Status, &e.Engine, &config, &e.SourceFingerprint,
		&e.ScriptPath, &e.ManifestPath, &e.ChapterCount, &e.CompletedCount, &e.DurationMS,
		&e.SizeBytes, &e.CreatedBy, &e.CreateTime, &e.UpdateTime, &e.PublishedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 audiobook_editions 失败: %w", err)
	}
	e.Config = jsonMap(config)
	return e, nil
}

// ListAudiobookEditions 返回某本书的全部有声书版本（按 id 升序）。
func ListAudiobookEditions(db *sql.DB, bookID int64) ([]*AudiobookEdition, error) {
	rows, err := db.Query(`SELECT id, book_id, COALESCE(status,'draft'), COALESCE(engine,'edgetts'),
		COALESCE(config,'{}'), COALESCE(source_fingerprint,''), COALESCE(script_path,''),
		COALESCE(manifest_path,''), COALESCE(chapter_count,0), COALESCE(completed_count,0),
		COALESCE(duration_ms,0), COALESCE(size_bytes,0), created_by, COALESCE(create_time,''),
		COALESCE(update_time,''), COALESCE(published_at,'')
		FROM audiobook_editions WHERE book_id = ? ORDER BY id`, bookID)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 audiobook_editions 失败: %w", err)
	}
	defer rows.Close()

	out := []*AudiobookEdition{}
	for rows.Next() {
		e := &AudiobookEdition{}
		var config string
		if err := rows.Scan(&e.ID, &e.BookID, &e.Status, &e.Engine, &config, &e.SourceFingerprint,
			&e.ScriptPath, &e.ManifestPath, &e.ChapterCount, &e.CompletedCount, &e.DurationMS,
			&e.SizeBytes, &e.CreatedBy, &e.CreateTime, &e.UpdateTime, &e.PublishedAt); err != nil {
			return nil, fmt.Errorf("userdb: 扫描 audiobook_editions 失败: %w", err)
		}
		e.Config = jsonMap(config)
		out = append(out, e)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("userdb: 遍历 audiobook_editions 失败: %w", err)
	}
	return out, nil
}

// ListAudiobookChapters 返回某版本的全部章节（按 number 升序）。
func ListAudiobookChapters(db *sql.DB, editionID int64) ([]*AudiobookChapter, error) {
	rows, err := db.Query(`SELECT id, edition_id, COALESCE(source_key,''), number, COALESCE(title,''),
		COALESCE(audio_path,''), COALESCE(timeline_path,''), COALESCE(duration_ms,0),
		COALESCE(size_bytes,0), COALESCE(content_hash,''), COALESCE(episode_guid,''),
		COALESCE(first_published_at,'')
		FROM audiobook_chapters WHERE edition_id = ? ORDER BY number`, editionID)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 audiobook_chapters 失败: %w", err)
	}
	defer rows.Close()

	out := []*AudiobookChapter{}
	for rows.Next() {
		c := &AudiobookChapter{}
		if err := rows.Scan(&c.ID, &c.EditionID, &c.SourceKey, &c.Number, &c.Title, &c.AudioPath,
			&c.TimelinePath, &c.DurationMS, &c.SizeBytes, &c.ContentHash, &c.EpisodeGUID,
			&c.FirstPublishedAt); err != nil {
			return nil, fmt.Errorf("userdb: 扫描 audiobook_chapters 失败: %w", err)
		}
		out = append(out, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("userdb: 遍历 audiobook_chapters 失败: %w", err)
	}
	return out, nil
}

// GetAudiobookProgress 按 reader_id + edition_id 取收听进度；不存在返回 nil。
func GetAudiobookProgress(db *sql.DB, readerID, editionID int64) (*AudiobookProgress, error) {
	row := db.QueryRow(`SELECT id, reader_id, edition_id, chapter_id, COALESCE(position_ms,0),
		COALESCE(segment_id,''), COALESCE(listened_ms,0), COALESCE(is_finished,0),
		COALESCE(version,1), COALESCE(update_time,'')
		FROM audiobook_progress WHERE reader_id = ? AND edition_id = ?`, readerID, editionID)
	p := &AudiobookProgress{}
	var finished int64
	err := row.Scan(&p.ID, &p.ReaderID, &p.EditionID, &p.ChapterID, &p.PositionMS, &p.SegmentID,
		&p.ListenedMS, &finished, &p.Version, &p.UpdateTime)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 audiobook_progress 失败: %w", err)
	}
	p.IsFinished = finished != 0
	return p, nil
}

// ListAudiobookBookmarks 返回某读者某版本的全部书签（按 id 升序）。
func ListAudiobookBookmarks(db *sql.DB, readerID, editionID int64) ([]*AudiobookBookmark, error) {
	rows, err := db.Query(`SELECT id, reader_id, edition_id, chapter_id, COALESCE(position_ms,0),
		COALESCE(segment_id,''), COALESCE(note,''), COALESCE(create_time,'')
		FROM audiobook_bookmarks WHERE reader_id = ? AND edition_id = ? ORDER BY id`, readerID, editionID)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 audiobook_bookmarks 失败: %w", err)
	}
	defer rows.Close()

	out := []*AudiobookBookmark{}
	for rows.Next() {
		b := &AudiobookBookmark{}
		if err := rows.Scan(&b.ID, &b.ReaderID, &b.EditionID, &b.ChapterID, &b.PositionMS,
			&b.SegmentID, &b.Note, &b.CreateTime); err != nil {
			return nil, fmt.Errorf("userdb: 扫描 audiobook_bookmarks 失败: %w", err)
		}
		out = append(out, b)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("userdb: 遍历 audiobook_bookmarks 失败: %w", err)
	}
	return out, nil
}

// GetPodcastSubscriptionByTokenHash 按 token 哈希取订阅；不存在返回 nil。
func GetPodcastSubscriptionByTokenHash(db *sql.DB, tokenHash string) (*PodcastSubscription, error) {
	row := db.QueryRow(`SELECT id, reader_id, token_hash, COALESCE(token_hint,''), COALESCE(active,1),
		COALESCE(hidden_books,'{}'), COALESCE(create_time,''), COALESCE(last_access_at,''),
		COALESCE(revoked_at,''), COALESCE(frozen_at,''), COALESCE(frozen_reason,'')
		FROM podcast_subscriptions WHERE token_hash = ? LIMIT 1`, tokenHash)
	s := &PodcastSubscription{}
	var active int64
	var hidden string
	err := row.Scan(&s.ID, &s.ReaderID, &s.TokenHash, &s.TokenHint, &active, &hidden, &s.CreateTime,
		&s.LastAccessAt, &s.RevokedAt, &s.FrozenAt, &s.FrozenReason)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 podcast_subscriptions 失败: %w", err)
	}
	s.Active = active != 0
	s.HiddenBooks = jsonMap(hidden)
	return s, nil
}

// ListPodcastSubscriptions 返回某读者的全部订阅（按 id 升序）。
func ListPodcastSubscriptions(db *sql.DB, readerID int64) ([]*PodcastSubscription, error) {
	rows, err := db.Query(`SELECT id, reader_id, token_hash, COALESCE(token_hint,''), COALESCE(active,1),
		COALESCE(hidden_books,'{}'), COALESCE(create_time,''), COALESCE(last_access_at,''),
		COALESCE(revoked_at,''), COALESCE(frozen_at,''), COALESCE(frozen_reason,'')
		FROM podcast_subscriptions WHERE reader_id = ? ORDER BY id`, readerID)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 podcast_subscriptions 失败: %w", err)
	}
	defer rows.Close()

	out := []*PodcastSubscription{}
	for rows.Next() {
		s := &PodcastSubscription{}
		var active int64
		var hidden string
		if err := rows.Scan(&s.ID, &s.ReaderID, &s.TokenHash, &s.TokenHint, &active, &hidden,
			&s.CreateTime, &s.LastAccessAt, &s.RevokedAt, &s.FrozenAt, &s.FrozenReason); err != nil {
			return nil, fmt.Errorf("userdb: 扫描 podcast_subscriptions 失败: %w", err)
		}
		s.Active = active != 0
		s.HiddenBooks = jsonMap(hidden)
		out = append(out, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("userdb: 遍历 podcast_subscriptions 失败: %w", err)
	}
	return out, nil
}
