package httpapi

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/xml"
	"fmt"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/userdb"
)

// AudioConfig 是有声书模块的依赖注入点。
type AudioConfig struct {
	// DB 是 Talebook 自有库（audiobook_* / podcast_*）。
	DB *sql.DB
	// LibraryDB 是 Calibre 元数据库。
	LibraryDB *sql.DB
	// Settings 是站点配置。
	Settings map[string]any
	// PublicURL 给路径加部署前缀。
	PublicURL func(path string) string
	// CDNURL 用于拼接封面地址。
	CDNURL string
	// CanViewBook 判定当前请求方能否查看该书。
	CanViewBook func(ctx *Context, bookID int64) bool
	// IsBookOwner 判定当前请求方是否为该书所有者。
	IsBookOwner func(ctx *Context, bookID int64) bool
	// StorageRoot 是有声书存储根目录。
	StorageRoot string
	// FreeBytes 返回存储可用空间；为 nil 时用 syscall 探测。
	FreeBytes func() (int64, error)
	// Voices 返回可用语音列表。
	Voices func() []map[string]any
	// VoicePreview 返回语音试听音频。
	VoicePreview func(engine, voiceID string) ([]byte, string, error)
	// JobAction 执行任务动作（cancel/retry/...）。
	JobAction func(ctx *Context, jobID int64, action string) (map[string]any, error)
	// Workspace 读取任务工作区。
	Workspace func(ctx *Context, jobID int64) (map[string]any, error)
	// WorkspacePatch 修改任务工作区。
	WorkspacePatch func(ctx *Context, jobID int64, args map[string]any) (map[string]any, error)
	// ConfirmJob 确认任务计划。
	ConfirmJob func(ctx *Context, jobID int64, args map[string]any) (map[string]any, error)
	// CreateJob 创建生成任务。
	CreateJob func(ctx *Context, bookID int64, args map[string]any) (map[string]any, error)
	// CreateRevision 创建修订版本。
	CreateRevision func(ctx *Context, editionID int64, args map[string]any) (map[string]any, error)
	// CleanupBackups 清理备份。
	CleanupBackups func(ctx *Context, bookID int64) (map[string]any, error)
	// DeleteEdition 删除版本。
	DeleteEdition func(ctx *Context, editionID int64) (map[string]any, error)
	// AudioFile 返回章节音频文件路径。
	AudioFile func(editionID int64, chapterNumber int) (string, error)
	// Timeline 返回章节时间轴。
	Timeline func(ctx *Context, editionID int64, chapterNumber int) (map[string]any, error)
	// CreateSession 创建播放会话。
	CreateSession func(ctx *Context, editionID int64, args map[string]any) (map[string]any, error)
	// UpdateSession 更新/关闭播放会话。
	UpdateSession func(ctx *Context, sessionID string, args map[string]any, close bool) (map[string]any, error)
	// Subscription 处理播客订阅（GET/POST/DELETE/PATCH）。
	Subscription func(ctx *Context, method string, args map[string]any) (map[string]any, error)
	// Audit 处理播客审计（GET/PATCH）。
	Audit func(ctx *Context, method string, args map[string]any) (map[string]any, error)
}

// ---- 路由常量 ----

const (
	rAudioHome        = "/api/audios/home"
	rAudioList        = "/api/audios"
	rAudioDetail      = "/api/book/([0-9]+)/audios"
	rAudioJobCreate   = "/api/book/([0-9]+)/audio-jobs"
	rAudioJobs        = "/api/audio-jobs"
	rAudioJobAction   = "/api/audio-job/([0-9]+)"
	rAudioWorkspace   = "/api/audio-job/([0-9]+)/workspace"
	rAudioConfirm     = "/api/audio-job/([0-9]+)/confirm"
	rAudioRevisions   = "/api/audio/([0-9]+)/revisions"
	rAudioBackups     = "/api/book/([0-9]+)/audio-backups"
	rAudioManifest    = "/api/audio/([0-9]+)"
	rAudioTimeline    = "/api/audio/([0-9]+)/chapter/([0-9]+)/timeline"
	rAudioStream      = "/media/audio/([0-9]+)/chapter/([0-9]+)\\.mp3"
	rAudioSessions    = "/api/audio/([0-9]+)/sessions"
	rAudioSession     = "/api/audio-session/([a-f0-9]+)"
	rAudioSessionEnd  = "/api/audio-session/([a-f0-9]+)/close"
	rAudioBookmarks   = "/api/audio/([0-9]+)/bookmarks"
	rPodcastSubs      = "/api/me/podcast-subscription"
	rPodcastFeed      = "/podcast/v1/([^/]+)/feed\\.xml"
	rPodcastSiteCover = "/podcast/v1/([^/]+)/cover/site\\.jpg"
	rPodcastCover     = "/podcast/v1/([^/]+)/cover/([0-9]+)\\.jpg"
	rPodcastAudio     = "/podcast/v1/([^/]+)/audio/([0-9]+)/chapter/([0-9]+)\\.mp3"
	rAudioVoices      = "/api/audio-voices"
	rAudioVoicePrev   = "/media/audio-voice/([a-z0-9]+)/([^/]+)\\.mp3"
	rAudioMyStats     = "/api/audio-stats/me"
	rAudioAdminStats  = "/api/admin/audio-stats"
	rPodcastAudits    = "/api/admin/podcast-audits"
)

// ---- 数据转换 ----

// audioEditionDict 复刻 _edition_dict。
func audioEditionDict(cfg AudioConfig, e *userdb.AudiobookEdition, chapters []*userdb.AudiobookChapter) map[string]any {
	config := e.ConfigMap()
	revision := int64Of(config["revision_number"])
	if revision == 0 {
		revision = 1
	}
	d := map[string]any{
		"id":                     e.ID,
		"book_id":                e.BookID,
		"status":                 e.Status,
		"engine":                 e.Engine,
		"config":                 config,
		"has_script":             e.ScriptPath != "",
		"revision_number":        revision,
		"revision_of_edition_id": config["revision_of_edition_id"],
		"chapter_count":          e.ChapterCount,
		"completed_count":        e.CompletedCount,
		"duration_ms":            e.DurationMS,
		"size_bytes":             e.SizeBytes,
		"created_by":             e.CreatedBy,
		"created_at":             isoOrNil(e.CreateTime),
		"updated_at":             isoOrNil(e.UpdateTime),
		"published_at":           isoOrNil(e.PublishedAt),
	}
	if chapters != nil {
		list := make([]map[string]any, 0, len(chapters))
		for _, c := range chapters {
			list = append(list, audioChapterDict(cfg, c))
		}
		d["chapters"] = list
	}
	return d
}

// audioChapterDict 复刻 _chapter_dict。
func audioChapterDict(cfg AudioConfig, c *userdb.AudiobookChapter) map[string]any {
	return map[string]any{
		"id":           c.ID,
		"number":       c.Number,
		"source_key":   c.SourceKey,
		"title":        c.Title,
		"duration_ms":  c.DurationMS,
		"size_bytes":   c.SizeBytes,
		"audio_url":    audioPublicURL(cfg, fmt.Sprintf("/media/audio/%d/chapter/%d.mp3", c.EditionID, c.Number)),
		"timeline_url": audioPublicURL(cfg, fmt.Sprintf("/api/audio/%d/chapter/%d/timeline", c.EditionID, c.Number)),
	}
}

// audioPublicURL 给路径加部署前缀。
func audioPublicURL(cfg AudioConfig, path string) string {
	if cfg.PublicURL != nil {
		return cfg.PublicURL(path)
	}
	return path
}

// isoOrNil 把时间字符串转成 ISO 或 nil。
func isoOrNil(s string) any {
	if s == "" {
		return nil
	}
	for _, layout := range []string{"2006-01-02 15:04:05", time.RFC3339} {
		if t, err := time.Parse(layout, s); err == nil {
			return t.Format(time.RFC3339)
		}
	}
	return s
}

// audioBackupRetention 复刻 _backup_retention。
func audioBackupRetention(cfg AudioConfig) int {
	n := int(toIntSetting(cfg.Settings, "AUDIOBOOK_BACKUP_RETENTION", 3))
	if n < 0 {
		return 0
	}
	if n > 20 {
		return 20
	}
	return n
}

// audioEnabled 报告有声书功能是否开启。
func audioEnabled(cfg AudioConfig) bool {
	return settingBool(cfg.Settings, "AUDIOBOOK_ENABLED", true)
}

// audioSupportsSource 判定书籍格式是否可生成有声书。
func audioSupportsSource(book library.BookData) bool {
	formats := map[string]bool{}
	for _, f := range book.Formats {
		formats[strings.ToUpper(f)] = true
	}
	return formats["EPUB"] || formats["TXT"]
}

// audioGenerationCapability 复刻 _generation_capability。
func audioGenerationCapability(cfg AudioConfig, ctx *Context, book library.BookData) map[string]any {
	enabled := audioEnabled(cfg)
	compatible := audioSupportsSource(book)
	ownerAllowed := ctx.Identity.UserID != 0 &&
		settingBool(cfg.Settings, "AUDIOBOOK_OWNER_GENERATE", false) &&
		cfg.IsBookOwner != nil && cfg.IsBookOwner(ctx, book.ID)
	permitted := ctx.Identity.IsAdmin || ownerAllowed

	freeBytes := int64(0)
	if cfg.FreeBytes != nil {
		if n, err := cfg.FreeBytes(); err == nil {
			freeBytes = n
		}
	}
	minimumBytes := int64(float64(toIntSetting(cfg.Settings, "AUDIOBOOK_MIN_FREE_GB", 5)) * 1024 * 1024 * 1024)
	capacityOK := freeBytes >= minimumBytes

	reason := ""
	switch {
	case !enabled:
		reason = "disabled"
	case !compatible:
		reason = "format.not_supported"
	case ctx.Identity.UserID == 0:
		reason = "login.required"
	case !permitted:
		reason = "permission"
	case !capacityOK:
		reason = "disk.low"
	}

	return map[string]any{
		"enabled":      enabled,
		"compatible":   compatible,
		"permitted":    permitted,
		"can_generate": enabled && compatible && permitted && capacityOK,
		"can_manage":   ctx.Identity.IsAdmin,
		"reason":       reason,
		"health":       nil,
		"capacity": map[string]any{
			"ok":            capacityOK,
			"free_bytes":    freeBytes,
			"minimum_bytes": minimumBytes,
		},
		"engines":         []string{"edgetts", "qwen3tts"},
		"quality_options": []string{"standard"},
	}
}

// audioLoadBooks 按 id 批量取书并建索引。
func audioLoadBooks(cfg AudioConfig, ids []int64) (map[int64]library.BookData, error) {
	out := map[int64]library.BookData{}
	if len(ids) == 0 {
		return out, nil
	}
	books, err := library.GetBooksData(cfg.LibraryDB, ids)
	if err != nil {
		return nil, err
	}
	for _, b := range books {
		out[b.ID] = b
	}
	return out, nil
}

// audioBookDict 组装书籍字典（含封面与详情链接）。
func audioBookDict(cfg AudioConfig, b library.BookData) map[string]any {
	return map[string]any{
		"id":      b.ID,
		"title":   b.Title,
		"authors": b.Authors,
		"author":  strings.Join(b.Authors, " & "),
		"tags":    b.Tags,
		"img":     fmt.Sprintf("%s/get/cover/%d.jpg", cfg.CDNURL, b.ID),
		"href":    fmt.Sprintf("/book/%d", b.ID),
		"fmt":     b.Formats,
	}
}

// audioVisibleEditions 取已发布且当前请求方可见的版本。
func audioVisibleEditions(cfg AudioConfig, ctx *Context) ([]*userdb.AudiobookEdition, error) {
	editions, err := userdb.ListPublishedAudiobookEditions(cfg.DB)
	if err != nil {
		return nil, err
	}
	if cfg.CanViewBook == nil {
		return editions, nil
	}
	out := make([]*userdb.AudiobookEdition, 0, len(editions))
	for _, e := range editions {
		if cfg.CanViewBook(ctx, e.BookID) {
			out = append(out, e)
		}
	}
	return out, nil
}

// ---- AudiobookHome ----

// AudioHomeHandler 实现 /api/audios/home。
func AudioHomeHandler(cfg AudioConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		visible, err := audioVisibleEditions(cfg, ctx)
		if err != nil {
			return nil, err
		}
		ids := make([]int64, 0, len(visible))
		for _, e := range visible {
			ids = append(ids, e.BookID)
		}
		books, err := audioLoadBooks(cfg, ids)
		if err != nil {
			return nil, err
		}

		progress := map[int64]*userdb.AudiobookProgress{}
		if ctx.Identity.UserID != 0 {
			editionIDs := make([]int64, 0, len(visible))
			for _, e := range visible {
				editionIDs = append(editionIDs, e.ID)
			}
			progress, err = userdb.ListAudiobookProgressFor(cfg.DB, ctx.Identity.UserID, editionIDs)
			if err != nil {
				return nil, err
			}
		}

		items := []map[string]any{}
		for _, e := range visible {
			book, ok := books[e.BookID]
			if !ok {
				continue
			}
			value := audioBookDict(cfg, book)
			value["edition"] = audioEditionDict(cfg, e, nil)
			if row, ok := progress[e.ID]; ok {
				value["listening_progress"] = map[string]any{
					"chapter_id":  row.ChapterID,
					"position_ms": row.PositionMS,
					"listened_ms": row.ListenedMS,
					"finished":    row.IsFinished,
				}
			} else {
				value["listening_progress"] = nil
			}
			items = append(items, value)
		}

		continueListening := []map[string]any{}
		completed := []map[string]any{}
		for _, v := range items {
			p, _ := v["listening_progress"].(map[string]any)
			if p == nil {
				continue
			}
			if finished, _ := p["finished"].(bool); finished {
				completed = append(completed, v)
			} else {
				continueListening = append(continueListening, v)
			}
		}
		recent := items
		if len(recent) > 24 {
			recent = recent[:24]
		}
		return map[string]any{
			"err":                "ok",
			"enabled":            audioEnabled(cfg),
			"continue_listening": continueListening,
			"recent":             recent,
			"completed":          completed,
		}, nil
	}
}

// ---- AudiobookList ----

// AudioListHandler 实现 /api/audios。
func AudioListHandler(cfg AudioConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		visible, err := audioVisibleEditions(cfg, ctx)
		if err != nil {
			return nil, err
		}
		ids := make([]int64, 0, len(visible))
		for _, e := range visible {
			ids = append(ids, e.BookID)
		}
		books, err := audioLoadBooks(cfg, ids)
		if err != nil {
			return nil, err
		}

		keyword := strings.ToLower(strings.TrimSpace(ctx.Query("keyword")))
		values := []map[string]any{}
		for _, e := range visible {
			book, ok := books[e.BookID]
			if !ok {
				continue
			}
			if keyword != "" {
				title := strings.ToLower(book.Title)
				author := strings.ToLower(strings.Join(book.Authors, " & "))
				if !strings.Contains(title, keyword) && !strings.Contains(author, keyword) {
					continue
				}
			}
			value := audioBookDict(cfg, book)
			value["edition"] = audioEditionDict(cfg, e, nil)
			values = append(values, value)
		}
		return map[string]any{"err": "ok", "total": len(values), "books": values}, nil
	}
}

// ---- AudiobookDetail ----

// AudioDetailHandler 实现 /api/book/<id>/audios。
func AudioDetailHandler(cfg AudioConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		bookID, err := strconv.ParseInt(ctx.Param(0), 10, 64)
		if err != nil {
			return map[string]any{"err": "not_found", "msg": "书籍不存在"}, nil
		}
		books, err := library.GetBooksData(cfg.LibraryDB, []int64{bookID})
		if err != nil {
			return nil, err
		}
		if len(books) == 0 {
			return map[string]any{"err": "not_found", "msg": "书籍不存在"}, nil
		}
		book := books[0]

		// 管理员或书主可见全部版本，其余仅见已发布版本。
		isOwner := cfg.IsBookOwner != nil && cfg.IsBookOwner(ctx, bookID)
		editions, err := userdb.ListAudiobookEditions(cfg.DB, bookID)
		if err != nil {
			return nil, err
		}
		editionValues := []map[string]any{}
		for _, e := range editions {
			if !ctx.Identity.IsAdmin && !isOwner && e.Status != "published" {
				continue
			}
			chapters, err := userdb.ListAudiobookChapters(cfg.DB, e.ID)
			if err != nil {
				return nil, err
			}
			editionValues = append(editionValues, audioEditionDict(cfg, e, chapters))
		}

		value := audioBookDict(cfg, book)
		value["files"] = book.Formats
		return map[string]any{
			"err":              "ok",
			"book":             value,
			"editions":         editionValues,
			"generation":       audioGenerationCapability(cfg, ctx, book),
			"backup_retention": audioBackupRetention(cfg),
		}, nil
	}
}

// ---- AudiobookManifest ----

// AudioManifestHandler 实现 /api/audio/<id>。
func AudioManifestHandler(cfg AudioConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		editionID, err := strconv.ParseInt(ctx.Param(0), 10, 64)
		if err != nil {
			return map[string]any{"err": "not_found", "msg": "版本不存在"}, nil
		}
		edition, err := userdb.GetAudiobookEdition(cfg.DB, editionID)
		if err != nil {
			return nil, err
		}
		if edition == nil {
			return map[string]any{"err": "not_found", "msg": "版本不存在"}, nil
		}
		if cfg.CanViewBook != nil && !cfg.CanViewBook(ctx, edition.BookID) {
			return map[string]any{"err": "not_found", "msg": "版本不存在"}, nil
		}
		chapters, err := userdb.ListAudiobookChapters(cfg.DB, editionID)
		if err != nil {
			return nil, err
		}
		return map[string]any{
			"err":     "ok",
			"edition": audioEditionDict(cfg, edition, chapters),
		}, nil
	}
}

// ---- AudiobookTimeline ----

// AudioTimelineHandler 实现 /api/audio/<id>/chapter/<n>/timeline。
func AudioTimelineHandler(cfg AudioConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		editionID, err := strconv.ParseInt(ctx.Param(0), 10, 64)
		if err != nil {
			return map[string]any{"err": "not_found", "msg": "章节不存在"}, nil
		}
		chapterNumber, err := strconv.Atoi(ctx.Param(1))
		if err != nil {
			return map[string]any{"err": "not_found", "msg": "章节不存在"}, nil
		}
		edition, err := userdb.GetAudiobookEdition(cfg.DB, editionID)
		if err != nil {
			return nil, err
		}
		if edition == nil {
			return map[string]any{"err": "not_found", "msg": "版本不存在"}, nil
		}
		if cfg.CanViewBook != nil && !cfg.CanViewBook(ctx, edition.BookID) {
			return map[string]any{"err": "not_found", "msg": "版本不存在"}, nil
		}
		if cfg.Timeline == nil {
			return map[string]any{"err": "ok", "timeline": []any{}}, nil
		}
		return cfg.Timeline(ctx, editionID, chapterNumber)
	}
}

// ---- AudiobookAudio（媒体流）----

// AudioStreamHandler 实现 /media/audio/<id>/chapter/<n>.mp3。
func AudioStreamHandler(cfg AudioConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		editionID, err := strconv.ParseInt(ctx.Param(0), 10, 64)
		if err != nil {
			http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
			return nil, nil
		}
		chapterNumber, err := strconv.Atoi(ctx.Param(1))
		if err != nil {
			http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
			return nil, nil
		}
		edition, err := userdb.GetAudiobookEdition(cfg.DB, editionID)
		if err != nil || edition == nil {
			http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
			return nil, nil
		}
		if cfg.CanViewBook != nil && !cfg.CanViewBook(ctx, edition.BookID) {
			http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
			return nil, nil
		}
		if cfg.AudioFile == nil {
			http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
			return nil, nil
		}
		path, err := cfg.AudioFile(editionID, chapterNumber)
		if err != nil {
			http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
			return nil, nil
		}
		serveAudioFile(ctx, path)
		return nil, nil
	}
}

// serveAudioFile 以音频流方式输出文件。
func serveAudioFile(ctx *Context, path string) {
	info, err := os.Stat(path)
	if err != nil || info.IsDir() {
		http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
		return
	}
	f, err := os.Open(path)
	if err != nil {
		http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
		return
	}
	defer func() { _ = f.Close() }()

	ctx.Writer.Header().Set("Content-Type", "audio/mpeg")
	ctx.Writer.Header().Set("Accept-Ranges", "bytes")
	http.ServeContent(ctx.Writer, ctx.Request, filepath.Base(path), info.ModTime(), f)
}

// ---- AudiobookBookmarks ----

// AudioBookmarksHandler 实现 /api/audio/<id>/bookmarks。
func AudioBookmarksHandler(cfg AudioConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		editionID, err := strconv.ParseInt(ctx.Param(0), 10, 64)
		if err != nil {
			return map[string]any{"err": "not_found", "msg": "版本不存在"}, nil
		}
		edition, err := userdb.GetAudiobookEdition(cfg.DB, editionID)
		if err != nil {
			return nil, err
		}
		if edition == nil {
			return map[string]any{"err": "not_found", "msg": "版本不存在"}, nil
		}
		if cfg.CanViewBook != nil && !cfg.CanViewBook(ctx, edition.BookID) {
			return map[string]any{"err": "not_found", "msg": "版本不存在"}, nil
		}
		if ctx.Identity.UserID == 0 {
			return map[string]any{"err": "user.need_login", "msg": "请先登录"}, nil
		}

		if ctx.Request.Method == http.MethodPost {
			return audioCreateBookmark(cfg, ctx, editionID)
		}
		marks, err := userdb.ListAudiobookBookmarks(cfg.DB, ctx.Identity.UserID, editionID)
		if err != nil {
			return nil, err
		}
		items := make([]map[string]any, 0, len(marks))
		for _, m := range marks {
			items = append(items, map[string]any{
				"id":          m.ID,
				"chapter_id":  m.ChapterID,
				"position_ms": m.PositionMS,
				"note":        m.Note,
				"created_at":  isoOrNil(m.CreateTime),
			})
		}
		return map[string]any{"err": "ok", "bookmarks": items}, nil
	}
}

// audioCreateBookmark 新增书签。
func audioCreateBookmark(cfg AudioConfig, ctx *Context, editionID int64) (map[string]any, error) {
	data, ok := decodeJSONObject(ctx.Request)
	if !ok {
		return map[string]any{"err": "params.invalid", "msg": "参数无效"}, nil
	}
	chapterID := int64Of(data["chapter_id"])
	positionMs := int64Of(data["position_ms"])
	if chapterID == 0 {
		return map[string]any{"err": "params.invalid", "msg": "参数无效"}, nil
	}
	id, err := userdb.CreateAudiobookBookmark(cfg.DB, ctx.Identity.UserID, editionID, chapterID, positionMs,
		stringOf(data["note"]))
	if err != nil {
		return nil, err
	}
	return map[string]any{"err": "ok", "id": id}, nil
}

// ---- AudiobookJobs ----

// AudioJobsHandler 实现 /api/audio-jobs。
func AudioJobsHandler(cfg AudioConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if ctx.Identity.UserID == 0 {
			return map[string]any{"err": "user.need_login", "msg": "请先登录"}, nil
		}
		jobs, err := userdb.ListAudiobookJobs(cfg.DB, ctx.Identity.UserID, ctx.Identity.IsAdmin)
		if err != nil {
			return nil, err
		}
		items := make([]map[string]any, 0, len(jobs))
		for _, j := range jobs {
			items = append(items, audioJobDict(j))
		}
		return map[string]any{"err": "ok", "jobs": items}, nil
	}
}

// audioJobDict 复刻 _job_dict（plan 由调用方按需补充）。
func audioJobDict(j *userdb.AudiobookJob) map[string]any {
	data := j.DataMap()
	delete(data, "plan")
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
		"progress":          j.Progress,
		"cancel_requested":  j.CancelRequested,
		"attempts":          j.Attempts,
		"error_code":        j.ErrorCode,
		"error_message":     j.ErrorMessage,
		"data":              data,
		"plan":              nil,
		"generation":        j.LastEventSeq,
		"created_at":        isoOrNil(j.CreateTime),
		"updated_at":        isoOrNil(j.UpdateTime),
		"script_available":  false,
	}
}

// ---- 委托型 handler ----

// AudioJobCreateHandler 实现 /api/book/<id>/audio-jobs。
func AudioJobCreateHandler(cfg AudioConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		bookID, err := strconv.ParseInt(ctx.Param(0), 10, 64)
		if err != nil {
			return map[string]any{"err": "not_found", "msg": "书籍不存在"}, nil
		}
		if ctx.Identity.UserID == 0 {
			return map[string]any{"err": "user.need_login", "msg": "请先登录"}, nil
		}
		data, ok := decodeJSONObject(ctx.Request)
		if !ok {
			return map[string]any{"err": "params.invalid", "msg": "请求参数格式错误"}, nil
		}
		if cfg.CreateJob == nil {
			return map[string]any{"err": "not_wired", "msg": "任务创建未接线"}, nil
		}
		return cfg.CreateJob(ctx, bookID, data)
	}
}

// AudioJobActionHandler 实现 /api/audio-job/<id>。
func AudioJobActionHandler(cfg AudioConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		jobID, err := strconv.ParseInt(ctx.Param(0), 10, 64)
		if err != nil {
			return map[string]any{"err": "not_found", "msg": "任务不存在"}, nil
		}
		if ctx.Identity.UserID == 0 {
			return map[string]any{"err": "user.need_login", "msg": "请先登录"}, nil
		}
		data, ok := decodeJSONObject(ctx.Request)
		if !ok {
			return map[string]any{"err": "params.invalid", "msg": "请求参数格式错误"}, nil
		}
		if cfg.JobAction == nil {
			return map[string]any{"err": "not_wired", "msg": "任务操作未接线"}, nil
		}
		return cfg.JobAction(ctx, jobID, stringOf(data["action"]))
	}
}

// AudioWorkspaceHandler 实现 /api/audio-job/<id>/workspace。
func AudioWorkspaceHandler(cfg AudioConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		jobID, err := strconv.ParseInt(ctx.Param(0), 10, 64)
		if err != nil {
			return map[string]any{"err": "not_found", "msg": "任务不存在"}, nil
		}
		if ctx.Identity.UserID == 0 {
			return map[string]any{"err": "user.need_login", "msg": "请先登录"}, nil
		}
		if ctx.Request.Method == http.MethodPatch {
			data, ok := decodeJSONObject(ctx.Request)
			if !ok {
				return map[string]any{"err": "params.invalid", "msg": "请求参数格式错误"}, nil
			}
			if cfg.WorkspacePatch == nil {
				return map[string]any{"err": "not_wired", "msg": "工作区修改未接线"}, nil
			}
			return cfg.WorkspacePatch(ctx, jobID, data)
		}
		if cfg.Workspace == nil {
			return map[string]any{"err": "not_wired", "msg": "工作区读取未接线"}, nil
		}
		return cfg.Workspace(ctx, jobID)
	}
}

// AudioConfirmHandler 实现 /api/audio-job/<id>/confirm。
func AudioConfirmHandler(cfg AudioConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		jobID, err := strconv.ParseInt(ctx.Param(0), 10, 64)
		if err != nil {
			return map[string]any{"err": "not_found", "msg": "任务不存在"}, nil
		}
		if ctx.Identity.UserID == 0 {
			return map[string]any{"err": "user.need_login", "msg": "请先登录"}, nil
		}
		data, ok := decodeJSONObject(ctx.Request)
		if !ok {
			return map[string]any{"err": "params.invalid", "msg": "请求参数格式错误"}, nil
		}
		if cfg.ConfirmJob == nil {
			return map[string]any{"err": "not_wired", "msg": "任务确认未接线"}, nil
		}
		return cfg.ConfirmJob(ctx, jobID, data)
	}
}

// AudioRevisionHandler 实现 /api/audio/<id>/revisions。
func AudioRevisionHandler(cfg AudioConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		editionID, err := strconv.ParseInt(ctx.Param(0), 10, 64)
		if err != nil {
			return map[string]any{"err": "not_found", "msg": "版本不存在"}, nil
		}
		if ctx.Identity.UserID == 0 {
			return map[string]any{"err": "user.need_login", "msg": "请先登录"}, nil
		}
		data, ok := decodeJSONObject(ctx.Request)
		if !ok {
			return map[string]any{"err": "params.invalid", "msg": "请求参数格式错误"}, nil
		}
		if cfg.CreateRevision == nil {
			return map[string]any{"err": "not_wired", "msg": "修订创建未接线"}, nil
		}
		return cfg.CreateRevision(ctx, editionID, data)
	}
}

// AudioBackupCleanupHandler 实现 /api/book/<id>/audio-backups。
func AudioBackupCleanupHandler(cfg AudioConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		bookID, err := strconv.ParseInt(ctx.Param(0), 10, 64)
		if err != nil {
			return map[string]any{"err": "not_found", "msg": "书籍不存在"}, nil
		}
		if !ctx.Identity.IsAdmin {
			return map[string]any{"err": "permission", "msg": "无权操作"}, nil
		}
		if cfg.CleanupBackups == nil {
			return map[string]any{"err": "not_wired", "msg": "备份清理未接线"}, nil
		}
		return cfg.CleanupBackups(ctx, bookID)
	}
}

// AudioEditionDeleteHandler 实现 DELETE /api/audio/<id>。
func AudioEditionDeleteHandler(cfg AudioConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		editionID, err := strconv.ParseInt(ctx.Param(0), 10, 64)
		if err != nil {
			return map[string]any{"err": "not_found", "msg": "版本不存在"}, nil
		}
		if !ctx.Identity.IsAdmin {
			return map[string]any{"err": "permission", "msg": "无权操作"}, nil
		}
		if cfg.DeleteEdition == nil {
			return map[string]any{"err": "not_wired", "msg": "版本删除未接线"}, nil
		}
		return cfg.DeleteEdition(ctx, editionID)
	}
}

// AudioSessionsHandler 实现 /api/audio/<id>/sessions。
func AudioSessionsHandler(cfg AudioConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		editionID, err := strconv.ParseInt(ctx.Param(0), 10, 64)
		if err != nil {
			return map[string]any{"err": "not_found", "msg": "版本不存在"}, nil
		}
		if ctx.Identity.UserID == 0 {
			return map[string]any{"err": "user.need_login", "msg": "请先登录"}, nil
		}
		if cfg.CreateSession == nil {
			return map[string]any{"err": "not_wired", "msg": "播放会话未接线"}, nil
		}
		data, ok := decodeJSONObject(ctx.Request)
		if !ok {
			return map[string]any{"err": "params.invalid", "msg": "请求参数格式错误"}, nil
		}
		return cfg.CreateSession(ctx, editionID, data)
	}
}

// AudioSessionHandler 实现 /api/audio-session/<id> 与 /close。
func AudioSessionHandler(cfg AudioConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		sessionID := ctx.Param(0)
		if ctx.Identity.UserID == 0 {
			return map[string]any{"err": "user.need_login", "msg": "请先登录"}, nil
		}
		if cfg.UpdateSession == nil {
			return map[string]any{"err": "not_wired", "msg": "播放会话未接线"}, nil
		}
		data, ok := decodeJSONObject(ctx.Request)
		if !ok {
			return map[string]any{"err": "params.invalid", "msg": "请求参数格式错误"}, nil
		}
		isClose := strings.HasSuffix(ctx.Request.URL.Path, "/close")
		return cfg.UpdateSession(ctx, sessionID, data, isClose)
	}
}

// AudioVoicesHandler 实现 /api/audio-voices。
func AudioVoicesHandler(cfg AudioConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		voices := []map[string]any{}
		if cfg.Voices != nil {
			voices = cfg.Voices()
		}
		return map[string]any{"err": "ok", "voices": voices}, nil
	}
}

// AudioVoicePreviewHandler 实现 /media/audio-voice/<engine>/<voice>.mp3。
func AudioVoicePreviewHandler(cfg AudioConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		engine := ctx.Param(0)
		voiceID := ctx.Param(1)
		if cfg.VoicePreview == nil {
			http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
			return nil, nil
		}
		data, contentType, err := cfg.VoicePreview(engine, voiceID)
		if err != nil {
			http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
			return nil, nil
		}
		if contentType == "" {
			contentType = "audio/mpeg"
		}
		ctx.Writer.Header().Set("Content-Type", contentType)
		_, _ = ctx.Writer.Write(data)
		return nil, nil
	}
}

// ---- 播客订阅 ----

// PodcastSubscriptionHandler 实现 /api/me/podcast-subscription。
func PodcastSubscriptionHandler(cfg AudioConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if ctx.Identity.UserID == 0 {
			return map[string]any{"err": "user.need_login", "msg": "请先登录"}, nil
		}
		if cfg.Subscription == nil {
			return map[string]any{"err": "not_wired", "msg": "播客订阅未接线"}, nil
		}
		method := ctx.Request.Method
		var args map[string]any
		if method == http.MethodPost || method == http.MethodPatch {
			parsed, ok := decodeJSONObject(ctx.Request)
			if !ok {
				return map[string]any{"err": "params.invalid", "msg": "请求参数格式错误"}, nil
			}
			args = parsed
		}
		return cfg.Subscription(ctx, method, args)
	}
}

// ---- 播客 feed 与媒体 ----

// PodcastFeedHandler 实现 /podcast/v1/<token>/feed.xml。
func PodcastFeedHandler(cfg AudioConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		token := ctx.Param(0)
		sub, err := audioSubscriptionByToken(cfg, token)
		if err != nil {
			return nil, err
		}
		if sub == nil {
			http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
			return nil, nil
		}
		body, err := audioBuildPodcastFeed(cfg, ctx, token)
		if err != nil {
			http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
			return nil, nil
		}
		ctx.Writer.Header().Set("Content-Type", "application/rss+xml; charset=utf-8")
		_, _ = ctx.Writer.Write(body)
		return nil, nil
	}
}

// audioSubscriptionByToken 按 token 查订阅。
func audioSubscriptionByToken(cfg AudioConfig, token string) (*userdb.PodcastSubscription, error) {
	sum := sha256.Sum256([]byte(token))
	return userdb.GetPodcastSubscriptionByTokenHash(cfg.DB, hex.EncodeToString(sum[:]))
}

// podcastFeedXML 是播客 RSS 的序列化结构。
type podcastFeedXML struct {
	XMLName     xml.Name          `xml:"rss"`
	Version     string            `xml:"version,attr"`
	XmlnsItunes string            `xml:"xmlns:itunes,attr"`
	Channel     podcastChannelXML `xml:"channel"`
}

type podcastChannelXML struct {
	Title       string           `xml:"title"`
	Link        string           `xml:"link"`
	Description string           `xml:"description"`
	Language    string           `xml:"language"`
	Items       []podcastItemXML `xml:"item"`
}

type podcastItemXML struct {
	Title     string         `xml:"title"`
	GUID      string         `xml:"guid"`
	PubDate   string         `xml:"pubDate,omitempty"`
	Enclosure podcastEnclXML `xml:"enclosure"`
}

type podcastEnclXML struct {
	URL    string `xml:"url,attr"`
	Type   string `xml:"type,attr"`
	Length int64  `xml:"length,attr"`
}

// audioBuildPodcastFeed 生成播客 RSS。
func audioBuildPodcastFeed(cfg AudioConfig, ctx *Context, token string) ([]byte, error) {
	editions, err := userdb.ListPublishedAudiobookEditions(cfg.DB)
	if err != nil {
		return nil, err
	}
	feed := podcastFeedXML{
		Version:     "2.0",
		XmlnsItunes: "http://www.itunes.com/dtds/podcast-1.0.dtd",
		Channel: podcastChannelXML{
			Title:       settingString(cfg.Settings, "site_title") + " Audiobooks",
			Link:        audioPublicURL(cfg, "/"),
			Description: "Talebook audiobook feed",
			Language:    "zh-cn",
		},
	}
	for _, e := range editions {
		if cfg.CanViewBook != nil && !cfg.CanViewBook(ctx, e.BookID) {
			continue
		}
		chapters, err := userdb.ListAudiobookChapters(cfg.DB, e.ID)
		if err != nil {
			return nil, err
		}
		for _, c := range chapters {
			feed.Channel.Items = append(feed.Channel.Items, podcastItemXML{
				Title: c.Title,
				GUID:  fmt.Sprintf("talebook:audio:%d:%d", e.ID, c.Number),
				Enclosure: podcastEnclXML{
					URL: audioPublicURL(cfg, fmt.Sprintf("/podcast/v1/%s/audio/%d/chapter/%d.mp3",
						token, e.ID, c.Number)),
					Type:   "audio/mpeg",
					Length: c.SizeBytes,
				},
			})
		}
	}
	out, err := xml.MarshalIndent(feed, "", "  ")
	if err != nil {
		return nil, err
	}
	return append([]byte(xml.Header), out...), nil
}

// PodcastCoverHandler 实现 /podcast/v1/<token>/cover/<book>.jpg。
func PodcastCoverHandler(cfg AudioConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		token := ctx.Param(0)
		bookID, err := strconv.ParseInt(ctx.Param(1), 10, 64)
		if err != nil {
			http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
			return nil, nil
		}
		sub, err := audioSubscriptionByToken(cfg, token)
		if err != nil || sub == nil {
			http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
			return nil, nil
		}
		cover, err := library.Cover(cfg.LibraryDB, bookID, "")
		if err != nil || cover == nil {
			http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
			return nil, nil
		}
		ctx.Writer.Header().Set("Content-Type", "image/jpeg")
		_, _ = ctx.Writer.Write(cover)
		return nil, nil
	}
}

// PodcastSiteCoverHandler 实现 /podcast/v1/<token>/cover/site.jpg。
func PodcastSiteCoverHandler(cfg AudioConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		token := ctx.Param(0)
		sub, err := audioSubscriptionByToken(cfg, token)
		if err != nil || sub == nil {
			http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
			return nil, nil
		}
		http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
		return nil, nil
	}
}

// PodcastAudioHandler 实现 /podcast/v1/<token>/audio/<edition>/chapter/<n>.mp3。
func PodcastAudioHandler(cfg AudioConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		token := ctx.Param(0)
		editionID, err := strconv.ParseInt(ctx.Param(1), 10, 64)
		if err != nil {
			http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
			return nil, nil
		}
		chapterNumber, err := strconv.Atoi(ctx.Param(2))
		if err != nil {
			http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
			return nil, nil
		}
		sub, err := audioSubscriptionByToken(cfg, token)
		if err != nil || sub == nil {
			http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
			return nil, nil
		}
		edition, err := userdb.GetAudiobookEdition(cfg.DB, editionID)
		if err != nil || edition == nil || edition.Status != "published" {
			http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
			return nil, nil
		}
		if cfg.AudioFile == nil {
			http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
			return nil, nil
		}
		path, err := cfg.AudioFile(editionID, chapterNumber)
		if err != nil {
			http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
			return nil, nil
		}
		serveAudioFile(ctx, path)
		return nil, nil
	}
}

// ---- 统计 ----

// AudioMyStatsHandler 实现 /api/audio-stats/me。
func AudioMyStatsHandler(cfg AudioConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if ctx.Identity.UserID == 0 {
			return map[string]any{"err": "user.need_login", "msg": "请先登录"}, nil
		}
		stats, err := userdb.AudiobookStatsForReader(cfg.DB, ctx.Identity.UserID)
		if err != nil {
			return nil, err
		}
		return map[string]any{"err": "ok", "stats": stats}, nil
	}
}

// AudioAdminStatsHandler 实现 /api/admin/audio-stats。
func AudioAdminStatsHandler(cfg AudioConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if resp := adminRequire(ctx); resp != nil {
			return resp, nil
		}
		stats, err := userdb.AudiobookAdminStats(cfg.DB)
		if err != nil {
			return nil, err
		}
		return map[string]any{"err": "ok", "stats": stats}, nil
	}
}

// PodcastAuditHandler 实现 /api/admin/podcast-audits。
func PodcastAuditHandler(cfg AudioConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if resp := adminRequire(ctx); resp != nil {
			return resp, nil
		}
		if cfg.Audit == nil {
			return map[string]any{"err": "ok", "items": []any{}, "total": 0}, nil
		}
		var args map[string]any
		if ctx.Request.Method == http.MethodPatch {
			parsed, ok := decodeJSONObject(ctx.Request)
			if !ok {
				return map[string]any{"err": "params.invalid", "msg": "请求参数格式错误"}, nil
			}
			args = parsed
		}
		return cfg.Audit(ctx, ctx.Request.Method, args)
	}
}

// ---- 路由表 ----

// AudioRouteSpecs 返回有声书模块接管的 27 条路由。
func AudioRouteSpecs(cfg AudioConfig) []RouteSpec {
	get := []string{http.MethodGet}
	getPost := []string{http.MethodGet, http.MethodPost}
	all := []string{http.MethodGet, http.MethodPost, http.MethodPatch, http.MethodDelete}
	return []RouteSpec{
		{Pattern: rAudioHome, Methods: getPost, Handler: AudioHomeHandler(cfg)},
		{Pattern: rAudioList, Methods: getPost, Handler: AudioListHandler(cfg)},
		{Pattern: rAudioDetail, Methods: all, Handler: AudioDetailHandler(cfg)},
		{Pattern: rAudioJobCreate, Methods: getPost, Auth: true, Handler: AudioJobCreateHandler(cfg)},
		{Pattern: rAudioJobs, Methods: getPost, Auth: true, Handler: AudioJobsHandler(cfg)},
		{Pattern: rAudioJobAction, Methods: all, Auth: true, Handler: AudioJobActionHandler(cfg)},
		{Pattern: rAudioWorkspace, Methods: all, Auth: true, Handler: AudioWorkspaceHandler(cfg)},
		{Pattern: rAudioConfirm, Methods: getPost, Auth: true, Handler: AudioConfirmHandler(cfg)},
		{Pattern: rAudioRevisions, Methods: getPost, Auth: true, Handler: AudioRevisionHandler(cfg)},
		{Pattern: rAudioBackups, Methods: all, Auth: true, Admin: true, Handler: AudioBackupCleanupHandler(cfg)},
		{Pattern: rAudioManifest, Methods: all, Handler: AudioManifestHandler(cfg)},
		{Pattern: rAudioTimeline, Methods: getPost, Handler: AudioTimelineHandler(cfg)},
		{Pattern: rAudioStream, Methods: get, Handler: AudioStreamHandler(cfg)},
		{Pattern: rAudioSessions, Methods: getPost, Auth: true, Handler: AudioSessionsHandler(cfg)},
		{Pattern: rAudioSession, Methods: all, Auth: true, Handler: AudioSessionHandler(cfg)},
		{Pattern: rAudioSessionEnd, Methods: all, Auth: true, Handler: AudioSessionHandler(cfg)},
		{Pattern: rAudioBookmarks, Methods: getPost, Auth: true, Handler: AudioBookmarksHandler(cfg)},
		{Pattern: rPodcastSubs, Methods: all, Auth: true, Handler: PodcastSubscriptionHandler(cfg)},
		{Pattern: rPodcastFeed, Methods: get, Handler: PodcastFeedHandler(cfg)},
		{Pattern: rPodcastSiteCover, Methods: get, Handler: PodcastSiteCoverHandler(cfg)},
		{Pattern: rPodcastCover, Methods: get, Handler: PodcastCoverHandler(cfg)},
		{Pattern: rPodcastAudio, Methods: get, Handler: PodcastAudioHandler(cfg)},
		{Pattern: rAudioVoices, Methods: getPost, Handler: AudioVoicesHandler(cfg)},
		{Pattern: rAudioVoicePrev, Methods: get, Handler: AudioVoicePreviewHandler(cfg)},
		{Pattern: rAudioMyStats, Methods: getPost, Auth: true, Handler: AudioMyStatsHandler(cfg)},
		{Pattern: rAudioAdminStats, Methods: getPost, Auth: true, Admin: true, Handler: AudioAdminStatsHandler(cfg)},
		{Pattern: rPodcastAudits, Methods: all, Auth: true, Admin: true, Handler: PodcastAuditHandler(cfg)},
	}
}

// audioSourceIP 复刻 _source_ip：仅当直连来源是受信代理时才采信 X-Forwarded-For。
//
// 注意：不能直接用 remoteIP()，它无条件优先 XFF；这里必须先取真实直连地址。
func audioSourceIP(cfg AudioConfig, ctx *Context) string {
	remote := directRemoteIP(ctx.Request)
	trusted := map[string]bool{}
	for _, v := range settingList(cfg.Settings, "PODCAST_TRUSTED_PROXIES") {
		trusted[stringOf(v)] = true
	}
	if !trusted[remote] {
		return remote
	}
	forwarded := strings.TrimSpace(strings.Split(ctx.Request.Header.Get("X-Forwarded-For"), ",")[0])
	if net.ParseIP(forwarded) != nil {
		return forwarded
	}
	return remote
}

// directRemoteIP 取 TCP 直连地址，忽略任何转发头。
func directRemoteIP(r *http.Request) string {
	if r == nil {
		return ""
	}
	host := r.RemoteAddr
	if i := strings.LastIndex(host, ":"); i >= 0 {
		host = host[:i]
	}
	return host
}

// audioSortEditionsByPublishedDesc 按发布时间降序排序。
func audioSortEditionsByPublishedDesc(editions []*userdb.AudiobookEdition) {
	sort.SliceStable(editions, func(i, j int) bool {
		return editions[i].PublishedAt > editions[j].PublishedAt
	})
}
