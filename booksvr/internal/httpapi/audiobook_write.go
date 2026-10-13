package httpapi

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"talebook/booksvr/internal/userdb"
)

// ---- 有声书写路径：任务 / 工作区 / 确认 / 修订 / 备份 / 版本 / 会话 / 订阅 ----

// audiobookEnabled 报告有声书功能是否启用。
func (w *audioWiring) audiobookEnabled() bool {
	return settingBool(w.settings, "AUDIOBOOK_ENABLED", true)
}

// audioCreateJob 复刻 Python AudiobookJobCreate.post。
func (w *audioWiring) audioCreateJob(ctx *Context, bookID int64, args map[string]any) (map[string]any, error) {
	if !w.audiobookEnabled() {
		return map[string]any{"err": "audiobook.disabled", "msg": "有声书功能未启用"}, nil
	}
	book, err := bookGetOne(w.bookConfig(), bookID)
	if err != nil {
		return nil, err
	}
	if book == nil {
		return map[string]any{"err": "not_found", "msg": "书籍不存在"}, nil
	}

	ownerAllowed := settingBool(w.settings, "AUDIOBOOK_OWNER_GENERATE", false) &&
		w.isOwner(ctx, bookID)
	if !ctx.Identity.IsAdmin && !ownerAllowed {
		return map[string]any{"err": "permission",
			"msg": "只有管理员或获准的书籍所有者可以生成有声书"}, nil
	}
	if w.mediaType(bookID) == "comic" {
		return map[string]any{"err": "media_type.not_supported", "msg": "漫画不支持生成有声书"}, nil
	}
	if !w.supportsAudiobookSource(bookID) {
		return map[string]any{"err": "format.not_supported", "msg": "生成有声书需要 EPUB 或 TXT 格式"}, nil
	}

	mode := stringOf(args["mode"])
	if mode == "" {
		mode = "quick"
	}
	engine := stringOf(args["engine"])
	if engine == "" {
		engine = "edgetts"
	}
	if (mode != "quick" && mode != "advanced") || (engine != "edgetts" && engine != "qwen3tts") {
		return map[string]any{"err": "params.invalid", "msg": "生成模式或引擎无效"}, nil
	}

	speed := stringOf(args["speed"])
	if speed == "" {
		speed = "x1.0"
	}
	if !validSpeed(speed) {
		return map[string]any{"err": "params.invalid", "msg": "默认语速必须在 x0.75 到 x1.5 之间"}, nil
	}

	quality := stringOf(args["quality"])
	if quality == "" {
		quality = "standard"
	}
	if quality != "standard" {
		return map[string]any{"err": "params.invalid", "msg": "当前 Voicebook 版本仅支持标准音质"}, nil
	}

	voices := map[string]any{}
	if raw, ok := args["protagonist_voices"].(map[string]any); ok {
		if len(raw) > 100 {
			return map[string]any{"err": "params.invalid", "msg": "主角音色设置无效"}, nil
		}
		for k, v := range raw {
			if len(k) > 200 || len(stringOf(v)) > 500 {
				return map[string]any{"err": "params.invalid", "msg": "主角音色设置无效"}, nil
			}
		}
		voices = raw
	}

	chapters := strings.TrimSpace(stringOf(args["chapters"]))
	config := map[string]any{
		"engine":             engine,
		"speed":              speed,
		"quality":            quality,
		"protagonist_voices": voices,
	}
	configHash := stableJSONHash(map[string]any{
		"book_id": bookID, "mode": mode, "chapters": chapters,
		"engine": engine, "speed": speed, "quality": quality,
		"protagonist_voices": voices,
	})

	if dup, err := userdb.FindActiveJobByHash(w.db, bookID, configHash); err == nil && dup != nil {
		return map[string]any{"err": "ok", "job": dup.ToDict(), "deduplicated": true}, nil
	}

	editionID, err := userdb.CreateAudiobookEdition(w.db, bookID, "draft", engine, config,
		ctx.Identity.UserID)
	if err != nil {
		return nil, err
	}

	priority := int64Of(args["priority"])
	if priority > 100 {
		priority = 100
	}
	if priority < -100 {
		priority = -100
	}

	job := &userdb.AudiobookJob{
		BookID:           bookID,
		EditionID:        editionID,
		CreatorID:        ctx.Identity.UserID,
		Mode:             mode,
		Status:           "queued",
		Phase:            "QUEUED",
		Priority:         priority,
		Config:           config,
		ChapterSelection: chapters,
		ConfigHash:       configHash,
		Data:             map[string]any{"plan": newJobPlan(mode)},
	}
	jobID, err := userdb.CreateAudiobookJob(w.db, job)
	if err != nil {
		return nil, err
	}
	job.ID = jobID

	return map[string]any{"err": "ok", "job": job.ToDict()}, nil
}

// audioJobAction 复刻 Python AudiobookJobAction.post。
func (w *audioWiring) audioJobAction(ctx *Context, jobID int64, action string) (map[string]any, error) {
	job, err := userdb.AudiobookJobByID(w.db, jobID)
	if err != nil {
		return nil, err
	}
	if job == nil {
		return map[string]any{"err": "not_found", "msg": "任务不存在"}, nil
	}
	if !ctx.Identity.IsAdmin && job.CreatorID != ctx.Identity.UserID {
		return map[string]any{"err": "permission", "msg": "无权操作"}, nil
	}

	switch strings.ToLower(strings.TrimSpace(action)) {
	case "cancel":
		if err := userdb.RequestAudiobookJobCancel(w.db, jobID); err != nil {
			return map[string]any{"err": "not_found", "msg": "任务不存在"}, nil
		}
		return map[string]any{"err": "ok", "msg": "已请求取消"}, nil
	case "retry":
		if err := userdb.UpdateAudiobookJobStatus(w.db, jobID, "queued", "QUEUED"); err != nil {
			return map[string]any{"err": "not_found", "msg": "任务不存在"}, nil
		}
		return map[string]any{"err": "ok", "msg": "已重新排队"}, nil
	case "pause":
		if err := userdb.UpdateAudiobookJobStatus(w.db, jobID, "paused", "PAUSED"); err != nil {
			return map[string]any{"err": "not_found", "msg": "任务不存在"}, nil
		}
		return map[string]any{"err": "ok", "msg": "已暂停"}, nil
	case "resume":
		if err := userdb.UpdateAudiobookJobStatus(w.db, jobID, "queued", "QUEUED"); err != nil {
			return map[string]any{"err": "not_found", "msg": "任务不存在"}, nil
		}
		return map[string]any{"err": "ok", "msg": "已恢复"}, nil
	}
	return map[string]any{"err": "params.invalid", "msg": "不支持的任务动作"}, nil
}

// audioWorkspace 读取任务工作区。
func (w *audioWiring) audioWorkspace(ctx *Context, jobID int64) (map[string]any, error) {
	job, err := userdb.AudiobookJobByID(w.db, jobID)
	if err != nil {
		return nil, err
	}
	if job == nil {
		return map[string]any{"err": "not_found", "msg": "任务不存在"}, nil
	}
	if !ctx.Identity.IsAdmin && job.CreatorID != ctx.Identity.UserID {
		return map[string]any{"err": "permission", "msg": "无权操作"}, nil
	}

	plan, _ := job.Data["plan"].(map[string]any)
	chapters := w.workspaceChapters(job.EditionID)

	return map[string]any{
		"err":      "ok",
		"job_id":   jobID,
		"status":   job.Status,
		"phase":    job.Phase,
		"plan":     plan,
		"chapters": chapters,
	}, nil
}

// audioWorkspacePatch 修改任务工作区（章节文本 / 角色）。
func (w *audioWiring) audioWorkspacePatch(ctx *Context, jobID int64, args map[string]any) (map[string]any, error) {
	job, err := userdb.AudiobookJobByID(w.db, jobID)
	if err != nil {
		return nil, err
	}
	if job == nil {
		return map[string]any{"err": "not_found", "msg": "任务不存在"}, nil
	}
	if !ctx.Identity.IsAdmin && job.CreatorID != ctx.Identity.UserID {
		return map[string]any{"err": "permission", "msg": "无权操作"}, nil
	}

	data := job.Data
	if data == nil {
		data = map[string]any{}
	}
	if chapter, ok := args["chapter"]; ok {
		data["chapter"] = chapter
	}
	if roles, ok := args["roles"]; ok {
		data["roles"] = roles
	}
	if err := userdb.UpdateAudiobookJobData(w.db, jobID, data); err != nil {
		return nil, err
	}
	return map[string]any{"err": "ok", "msg": "工作区已更新"}, nil
}

// audioConfirmJob 确认任务计划。
func (w *audioWiring) audioConfirmJob(ctx *Context, jobID int64, args map[string]any) (map[string]any, error) {
	job, err := userdb.AudiobookJobByID(w.db, jobID)
	if err != nil {
		return nil, err
	}
	if job == nil {
		return map[string]any{"err": "not_found", "msg": "任务不存在"}, nil
	}
	if !ctx.Identity.IsAdmin && job.CreatorID != ctx.Identity.UserID {
		return map[string]any{"err": "permission", "msg": "无权操作"}, nil
	}
	if job.Status != "awaiting_review" && job.Status != "queued" {
		return map[string]any{"err": "job.invalid_state", "msg": "当前状态无法确认"}, nil
	}

	data := job.Data
	if data == nil {
		data = map[string]any{}
	}
	if plan, ok := data["plan"].(map[string]any); ok {
		plan["confirmed"] = true
		plan["confirmed_at"] = time.Now().Format("2006-01-02 15:04:05")
	}
	if err := userdb.UpdateAudiobookJobData(w.db, jobID, data); err != nil {
		return nil, err
	}
	if err := userdb.UpdateAudiobookJobStatus(w.db, jobID, "generating", "GENERATING"); err != nil {
		return nil, err
	}
	return map[string]any{"err": "ok", "msg": "已确认，开始生成"}, nil
}

// audioCreateRevision 创建修订版本。
func (w *audioWiring) audioCreateRevision(ctx *Context, editionID int64, args map[string]any) (map[string]any, error) {
	edition, err := userdb.GetAudiobookEdition(w.db, editionID)
	if err != nil {
		return nil, err
	}
	if edition == nil {
		return map[string]any{"err": "not_found", "msg": "版本不存在"}, nil
	}
	if !ctx.Identity.IsAdmin && edition.CreatedBy != ctx.Identity.UserID {
		return map[string]any{"err": "permission", "msg": "无权操作"}, nil
	}

	newID, err := userdb.CreateAudiobookEdition(w.db, edition.BookID, "draft",
		edition.Engine, edition.Config, ctx.Identity.UserID)
	if err != nil {
		return nil, err
	}
	return map[string]any{"err": "ok", "msg": "修订已创建", "edition_id": newID}, nil
}

// audioCleanupBackups 清理书籍的有声书备份。
func (w *audioWiring) audioCleanupBackups(ctx *Context, bookID int64) (map[string]any, error) {
	if !ctx.Identity.IsAdmin {
		return map[string]any{"err": "permission", "msg": "无权操作"}, nil
	}
	dir := filepath.Join(w.root, "backups", fmt.Sprintf("%d", bookID))
	removed := 0
	if entries, err := os.ReadDir(dir); err == nil {
		for _, e := range entries {
			if err := os.RemoveAll(filepath.Join(dir, e.Name())); err == nil {
				removed++
			}
		}
	}
	return map[string]any{"err": "ok", "msg": "备份已清理", "removed": removed}, nil
}

// audioDeleteEdition 删除有声书版本。
func (w *audioWiring) audioDeleteEdition(ctx *Context, editionID int64) (map[string]any, error) {
	edition, err := userdb.GetAudiobookEdition(w.db, editionID)
	if err != nil {
		return nil, err
	}
	if edition == nil {
		return map[string]any{"err": "not_found", "msg": "版本不存在"}, nil
	}
	if !ctx.Identity.IsAdmin && edition.CreatedBy != ctx.Identity.UserID {
		return map[string]any{"err": "permission", "msg": "无权操作"}, nil
	}
	if err := userdb.DeleteAudiobookEdition(w.db, editionID); err != nil {
		return map[string]any{"err": "not_found", "msg": "版本不存在"}, nil
	}
	return map[string]any{"err": "ok", "msg": "版本已删除"}, nil
}

// audioCreateSession 创建播放会话。
func (w *audioWiring) audioCreateSession(ctx *Context, editionID int64, args map[string]any) (map[string]any, error) {
	edition, err := userdb.GetAudiobookEdition(w.db, editionID)
	if err != nil {
		return nil, err
	}
	if edition == nil {
		return map[string]any{"err": "not_found", "msg": "版本不存在"}, nil
	}
	if !w.canView(ctx, edition.BookID) {
		return map[string]any{"err": "permission", "msg": "无权查看"}, nil
	}

	uuid, err := userdb.CreateAudiobookPlaybackSession(w.db, ctx.Identity.UserID, editionID,
		stringOf(args["source"]), stringOf(args["device_id"]),
		ctx.Request.RemoteAddr, ctx.Request.UserAgent())
	if err != nil {
		return nil, err
	}
	return map[string]any{"err": "ok", "session_id": uuid}, nil
}

// audioUpdateSession 更新 / 关闭播放会话。
func (w *audioWiring) audioUpdateSession(ctx *Context, sessionID string, args map[string]any, close bool) (map[string]any, error) {
	if sessionID == "" {
		return map[string]any{"err": "params.invalid", "msg": "会话标识无效"}, nil
	}
	err := userdb.UpdateAudiobookPlaybackSession(w.db, sessionID, ctx.Identity.UserID,
		int64Of(args["current_ms"]), int64Of(args["listened_ms"]),
		bookBoolOf(args["completed"]), close)
	if err != nil {
		return map[string]any{"err": "not_found", "msg": "会话不存在"}, nil
	}
	return map[string]any{"err": "ok", "msg": "会话已更新"}, nil
}

// audioSubscription 处理播客订阅（GET/POST/DELETE/PATCH）。
func (w *audioWiring) audioSubscription(ctx *Context, method string, args map[string]any) (map[string]any, error) {
	if ctx.Identity.UserID == 0 {
		return map[string]any{"err": "user.need_login", "msg": "请先登录"}, nil
	}

	switch method {
	case "GET":
		sub, err := userdb.GetPodcastSubscriptionByReader(w.db, ctx.Identity.UserID)
		if err != nil {
			return nil, err
		}
		if sub == nil {
			return map[string]any{"err": "ok", "subscription": nil}, nil
		}
		return map[string]any{"err": "ok", "subscription": map[string]any{
			"id":          sub.ID,
			"active":      sub.Active,
			"token_hint":  sub.TokenHint,
			"create_time": sub.CreateTime,
		}}, nil

	case "POST":
		token := newPodcastToken()
		hash := podcastTokenHash(token)
		id, err := userdb.UpsertPodcastSubscription(w.db, ctx.Identity.UserID, hash, token[:8])
		if err != nil {
			return nil, err
		}
		return map[string]any{"err": "ok", "id": id, "token": token}, nil

	case "DELETE":
		if err := userdb.RevokePodcastSubscription(w.db, ctx.Identity.UserID); err != nil {
			return map[string]any{"err": "not_found", "msg": "订阅不存在"}, nil
		}
		return map[string]any{"err": "ok", "msg": "订阅已撤销"}, nil

	case "PATCH":
		sub, err := userdb.GetPodcastSubscriptionByReader(w.db, ctx.Identity.UserID)
		if err != nil {
			return nil, err
		}
		if sub == nil {
			return map[string]any{"err": "not_found", "msg": "订阅不存在"}, nil
		}
		return map[string]any{"err": "ok", "msg": "订阅已更新"}, nil
	}
	return map[string]any{"err": "params.invalid", "msg": "不支持的方法"}, nil
}

// ---- 内部辅助 ----

// bookConfig 返回一个只读的 BookConfig，用于复用 bookGetOne。
func (w *audioWiring) bookConfig() BookConfig {
	return BookConfig{DB: w.db, LibraryDB: w.db, Settings: w.settings}
}

// isOwner 判定当前请求方是否为书籍所有者。
func (w *audioWiring) isOwner(ctx *Context, bookID int64) bool {
	ok, err := userdb.IsBookOwner(w.db, bookID, ctx.Identity.UserID, false)
	return err == nil && ok
}

// canView 判定当前请求方能否查看该书。
func (w *audioWiring) canView(ctx *Context, bookID int64) bool {
	ok, err := userdb.CanViewBook(w.db, bookID, ctx.Identity.UserID, ctx.Identity.IsAdmin)
	return err == nil && ok
}

// mediaType 返回书籍的媒体类型。
func (w *audioWiring) mediaType(bookID int64) string {
	var mt string
	_ = w.db.QueryRow(`SELECT COALESCE(media_type,'') FROM items WHERE book_id = ?`, bookID).Scan(&mt)
	return mt
}

// supportsAudiobookSource 判定书籍是否有 EPUB 或 TXT 格式。
func (w *audioWiring) supportsAudiobookSource(bookID int64) bool {
	var n int
	err := w.db.QueryRow(`SELECT COUNT(1) FROM data WHERE book = ? AND UPPER(format) IN ('EPUB','TXT')`,
		bookID).Scan(&n)
	return err == nil && n > 0
}

// workspaceChapters 返回版本的章节列表。
func (w *audioWiring) workspaceChapters(editionID int64) []map[string]any {
	chapters, err := userdb.ListAudiobookChapters(w.db, editionID)
	if err != nil {
		return []map[string]any{}
	}
	out := make([]map[string]any, 0, len(chapters))
	for _, c := range chapters {
		out = append(out, map[string]any{
			"id":       c.ID,
			"number":   c.Number,
			"title":    c.Title,
			"duration": c.DurationMS,
		})
	}
	return out
}

// validSpeed 校验语速格式（x0.75 ~ x1.5）。
func validSpeed(speed string) bool {
	if !strings.HasPrefix(speed, "x") {
		return false
	}
	var v float64
	if _, err := fmt.Sscanf(speed[1:], "%f", &v); err != nil {
		return false
	}
	return v >= 0.75 && v <= 1.5
}

// stableJSONHash 复刻 Python stable_json_hash：键排序后取 SHA-256。
func stableJSONHash(value map[string]any) string {
	keys := make([]string, 0, len(value))
	for k := range value {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	var b strings.Builder
	b.WriteString("{")
	for i, k := range keys {
		if i > 0 {
			b.WriteString(",")
		}
		kb, _ := json.Marshal(k)
		vb, _ := json.Marshal(value[k])
		b.Write(kb)
		b.WriteString(":")
		b.Write(vb)
	}
	b.WriteString("}")

	sum := sha256.Sum256([]byte(b.String()))
	return hex.EncodeToString(sum[:])
}

// newJobPlan 复刻 Python create_audiobook_job_plan。
func newJobPlan(mode string) map[string]any {
	now := time.Now().Format("2006-01-02 15:04:05")
	phases := []string{"INSPECT", "SCRIPT", "VOICE", "ASSEMBLE"}
	if mode == "quick" {
		phases = []string{"INSPECT", "VOICE", "ASSEMBLE"}
	}
	steps := make([]map[string]any, 0, len(phases))
	for _, p := range phases {
		steps = append(steps, map[string]any{"key": p, "state": "pending"})
	}
	return map[string]any{
		"mode":       mode,
		"created_at": now,
		"steps":      steps,
	}
}

// newPodcastToken 生成播客订阅令牌。
func newPodcastToken() string {
	return newUploadID() + newUploadID()
}

// podcastTokenHash 计算令牌哈希。
func podcastTokenHash(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
