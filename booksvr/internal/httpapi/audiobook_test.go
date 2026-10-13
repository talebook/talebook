package httpapi

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"net/http"
	"os"
	"path/filepath"
	"testing"

	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/userdb"
)

// audioFixture 是一次有声书测试的完整环境。
type audioFixture struct {
	DB  *sql.DB
	Cfg AudioConfig
}

// newAudioFixture 建库并返回配置。
func newAudioFixture(t *testing.T) *audioFixture {
	t.Helper()
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	root := t.TempDir()
	cfg := AudioConfig{
		DB:          db,
		LibraryDB:   db,
		StorageRoot: root,
		CDNURL:      "https://cdn.example.com",
		Settings: map[string]any{
			"site_title":                 "测试站点",
			"AUDIOBOOK_ENABLED":          true,
			"AUDIOBOOK_OWNER_GENERATE":   false,
			"AUDIOBOOK_MIN_FREE_GB":      0,
			"AUDIOBOOK_BACKUP_RETENTION": 3,
		},
		CanViewBook: func(ctx *Context, bookID int64) bool { return true },
		IsBookOwner: func(ctx *Context, bookID int64) bool { return false },
		FreeBytes:   func() (int64, error) { return 100 * 1024 * 1024 * 1024, nil },
	}
	return &audioFixture{DB: db, Cfg: cfg}
}

// audioTokenHash 计算订阅 token 的 sha256 十六进制。
func audioTokenHash(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

// audioSeedEdition 插入一个有声书版本。
func audioSeedEdition(t *testing.T, db *sql.DB, id, bookID int64, status string, publishedAt string) {
	t.Helper()
	var published any
	if publishedAt != "" {
		published = publishedAt
	}
	if _, err := db.Exec(`INSERT INTO audiobook_editions
		(id, book_id, status, engine, config, chapter_count, completed_count, duration_ms, size_bytes,
		 created_by, create_time, update_time, published_at)
		VALUES (?, ?, ?, 'edgetts', '{"revision_number":2}', 3, 3, 60000, 1024, 1,
		'2026-01-01 00:00:00', '2026-01-02 00:00:00', ?)`,
		id, bookID, status, published); err != nil {
		t.Fatalf("插入版本失败: %v", err)
	}
}

// audioSeedChapter 插入一个章节。
func audioSeedChapter(t *testing.T, db *sql.DB, id, editionID, number int64, title string) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO audiobook_chapters
		(id, edition_id, source_key, number, title, audio_path, duration_ms, size_bytes)
		VALUES (?, ?, ?, ?, ?, '', 20000, 512)`,
		id, editionID, title, number, title); err != nil {
		t.Fatalf("插入章节失败: %v", err)
	}
}

// audioSeedProgress 插入收听进度。
func audioSeedProgress(t *testing.T, db *sql.DB, readerID, editionID, chapterID int64, finished bool) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO audiobook_progress
		(reader_id, edition_id, chapter_id, position_ms, listened_ms, is_finished, version, update_time)
		VALUES (?, ?, ?, 5000, 5000, ?, 1, '2026-01-03 00:00:00')`,
		readerID, editionID, chapterID, finished); err != nil {
		t.Fatalf("插入进度失败: %v", err)
	}
}

// audioSeedSubscription 插入播客订阅。
func audioSeedSubscription(t *testing.T, db *sql.DB, id, readerID int64, tokenHash string, active bool) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO podcast_subscriptions
		(id, reader_id, token_hash, token_hint, active, hidden_books, create_time)
		VALUES (?, ?, ?, 'abcd', ?, '{}', '2026-01-01 00:00:00')`,
		id, readerID, tokenHash, active); err != nil {
		t.Fatalf("插入订阅失败: %v", err)
	}
}

// audioSeedJob 插入一个生成任务。
func audioSeedJob(t *testing.T, db *sql.DB, id, bookID, editionID, creatorID int64, status string) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO audiobook_jobs
		(id, book_id, edition_id, creator_id, mode, status, phase, priority, config, chapter_selection,
		 config_hash, progress, last_event_seq, cancel_requested, attempts, data, create_time, update_time)
		VALUES (?, ?, ?, ?, 'full', ?, 'queued', 0, '{}', 'all', 'h', 0, 0, 0, 0, '{}',
		'2026-01-01 00:00:00', '2026-01-01 00:00:00')`,
		id, bookID, editionID, creatorID, status); err != nil {
		t.Fatalf("插入任务失败: %v", err)
	}
}

// ---- 路由表 ----

func TestAudioRouteSpecs(t *testing.T) {
	specs := AudioRouteSpecs(AudioConfig{})
	if len(specs) != 27 {
		t.Fatalf("len = %d, want 27", len(specs))
	}
	adminCount := 0
	for _, s := range specs {
		if s.Pattern == "" {
			t.Fatalf("空 pattern: %+v", s)
		}
		if s.Handler == nil {
			t.Fatalf("空 handler: %s", s.Pattern)
		}
		if len(s.Methods) == 0 {
			t.Fatalf("空 methods: %s", s.Pattern)
		}
		if s.Admin {
			adminCount++
		}
	}
	if adminCount != 3 {
		t.Fatalf("admin 路由数 = %d, want 3", adminCount)
	}
}

func TestAudioRouteSpecsCoverLegacy(t *testing.T) {
	impl := map[string]bool{}
	for _, p := range ImplementedPatterns() {
		impl[p] = true
	}
	want := []string{
		"/api/admin/audio-stats", "/api/admin/podcast-audits",
		"/api/audio-job/([0-9]+)", "/api/audio-job/([0-9]+)/confirm",
		"/api/audio-job/([0-9]+)/workspace", "/api/audio-jobs",
		"/api/audio-session/([a-f0-9]+)", "/api/audio-session/([a-f0-9]+)/close",
		"/api/audio-stats/me", "/api/audio-voices",
		"/api/audio/([0-9]+)", "/api/audio/([0-9]+)/bookmarks",
		"/api/audio/([0-9]+)/chapter/([0-9]+)/timeline", "/api/audio/([0-9]+)/revisions",
		"/api/audio/([0-9]+)/sessions", "/api/audios", "/api/audios/home",
		"/api/book/([0-9]+)/audio-backups", "/api/book/([0-9]+)/audio-jobs",
		"/api/book/([0-9]+)/audios", "/api/me/podcast-subscription",
		"/media/audio-voice/([a-z0-9]+)/([^/]+)\\.mp3",
		"/media/audio/([0-9]+)/chapter/([0-9]+)\\.mp3",
		"/podcast/v1/([^/]+)/audio/([0-9]+)/chapter/([0-9]+)\\.mp3",
		"/podcast/v1/([^/]+)/cover/([0-9]+)\\.jpg",
		"/podcast/v1/([^/]+)/cover/site\\.jpg",
		"/podcast/v1/([^/]+)/feed\\.xml",
	}
	for _, p := range want {
		if !impl[p] {
			t.Errorf("未登记路由: %s", p)
		}
	}
}

// ---- 数据转换 ----

func TestAudioEditionDict(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	e, err := userdb.GetAudiobookEdition(f.DB, 1)
	if err != nil {
		t.Fatalf("取版本失败: %v", err)
	}
	d := audioEditionDict(f.Cfg, e, nil)
	if d["id"] != int64(1) || d["book_id"] != int64(10) {
		t.Fatalf("id/book_id 错误: %+v", d)
	}
	if d["revision_number"] != int64(2) {
		t.Fatalf("revision_number = %v, want 2", d["revision_number"])
	}
	if d["has_script"] != false {
		t.Fatalf("has_script = %v, want false", d["has_script"])
	}
	if _, ok := d["chapters"]; ok {
		t.Fatalf("chapters 不应存在")
	}
}

func TestAudioEditionDictWithChapters(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	audioSeedChapter(t, f.DB, 100, 1, 1, "第一章")
	e, _ := userdb.GetAudiobookEdition(f.DB, 1)
	chapters, err := userdb.ListAudiobookChapters(f.DB, 1)
	if err != nil {
		t.Fatalf("取章节失败: %v", err)
	}
	d := audioEditionDict(f.Cfg, e, chapters)
	list, ok := d["chapters"].([]map[string]any)
	if !ok || len(list) != 1 {
		t.Fatalf("chapters = %+v", d["chapters"])
	}
	if list[0]["audio_url"] != "/media/audio/1/chapter/1.mp3" {
		t.Fatalf("audio_url = %v", list[0]["audio_url"])
	}
	if list[0]["timeline_url"] != "/api/audio/1/chapter/1/timeline" {
		t.Fatalf("timeline_url = %v", list[0]["timeline_url"])
	}
}

func TestAudioPublicURLPrefix(t *testing.T) {
	cfg := AudioConfig{PublicURL: func(p string) string { return "/tb" + p }}
	if got := audioPublicURL(cfg, "/api/x"); got != "/tb/api/x" {
		t.Fatalf("got %q", got)
	}
	if got := audioPublicURL(AudioConfig{}, "/api/x"); got != "/api/x" {
		t.Fatalf("got %q", got)
	}
}

func TestIsoOrNil(t *testing.T) {
	if isoOrNil("") != nil {
		t.Fatalf("空串应为 nil")
	}
	if got := isoOrNil("2026-01-02 03:04:05"); got != "2026-01-02T03:04:05Z" {
		t.Fatalf("got %v", got)
	}
	if got := isoOrNil("2026-01-02T03:04:05Z"); got != "2026-01-02T03:04:05Z" {
		t.Fatalf("got %v", got)
	}
	if got := isoOrNil("garbage"); got != "garbage" {
		t.Fatalf("got %v", got)
	}
}

func TestAudioBackupRetention(t *testing.T) {
	cases := []struct {
		value any
		want  int
	}{
		{3, 3}, {0, 0}, {-5, 0}, {100, 20}, {"7", 7}, {"bad", 3}, {nil, 3},
	}
	for _, c := range cases {
		cfg := AudioConfig{Settings: map[string]any{"AUDIOBOOK_BACKUP_RETENTION": c.value}}
		if got := audioBackupRetention(cfg); got != c.want {
			t.Errorf("value=%v got=%d want=%d", c.value, got, c.want)
		}
	}
}

func TestAudioEnabled(t *testing.T) {
	if !audioEnabled(AudioConfig{Settings: map[string]any{}}) {
		t.Fatalf("默认应为开启")
	}
	if audioEnabled(AudioConfig{Settings: map[string]any{"AUDIOBOOK_ENABLED": false}}) {
		t.Fatalf("显式关闭应生效")
	}
}

func TestAudioSupportsSource(t *testing.T) {
	cases := []struct {
		formats []string
		want    bool
	}{
		{[]string{"EPUB"}, true},
		{[]string{"epub"}, true},
		{[]string{"TXT"}, true},
		{[]string{"PDF", "MOBI"}, false},
		{nil, false},
	}
	for _, c := range cases {
		if got := audioSupportsSource(library.BookData{Formats: c.formats}); got != c.want {
			t.Errorf("formats=%v got=%v want=%v", c.formats, got, c.want)
		}
	}
}

func TestAudioGenerationCapability(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audios/home", "", 1, false)
	book := library.BookData{ID: 10, Formats: []string{"EPUB"}}
	cap := audioGenerationCapability(f.Cfg, ctx, book)
	if cap["enabled"] != true || cap["compatible"] != true {
		t.Fatalf("cap = %+v", cap)
	}
	if cap["permitted"] != false {
		t.Fatalf("普通读者不应被允许: %+v", cap)
	}
	if cap["reason"] != "permission" {
		t.Fatalf("reason = %v, want permission", cap["reason"])
	}
	if cap["can_generate"] != false {
		t.Fatalf("can_generate 应为 false")
	}
}

func TestAudioGenerationCapabilityAdmin(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audios/home", "", 1, true)
	cap := audioGenerationCapability(f.Cfg, ctx, library.BookData{ID: 10, Formats: []string{"EPUB"}})
	if cap["can_generate"] != true || cap["can_manage"] != true {
		t.Fatalf("cap = %+v", cap)
	}
	if cap["reason"] != "" {
		t.Fatalf("reason = %v, want 空", cap["reason"])
	}
}

func TestAudioGenerationCapabilityReasons(t *testing.T) {
	f := newAudioFixture(t)
	admin := pluginCtx(t, f.DB, http.MethodGet, "/", "", 1, true)

	cfg := f.Cfg
	cfg.Settings = map[string]any{"AUDIOBOOK_ENABLED": false}
	if got := audioGenerationCapability(cfg, admin, library.BookData{Formats: []string{"EPUB"}})["reason"]; got != "disabled" {
		t.Fatalf("reason = %v, want disabled", got)
	}

	if got := audioGenerationCapability(f.Cfg, admin, library.BookData{Formats: []string{"PDF"}})["reason"]; got != "format.not_supported" {
		t.Fatalf("reason = %v, want format.not_supported", got)
	}

	guest := pluginCtx(t, f.DB, http.MethodGet, "/", "", 0, false)
	if got := audioGenerationCapability(f.Cfg, guest, library.BookData{Formats: []string{"EPUB"}})["reason"]; got != "login.required" {
		t.Fatalf("reason = %v, want login.required", got)
	}

	low := f.Cfg
	low.Settings = map[string]any{"AUDIOBOOK_MIN_FREE_GB": 1000}
	low.FreeBytes = func() (int64, error) { return 1024, nil }
	if got := audioGenerationCapability(low, admin, library.BookData{Formats: []string{"EPUB"}})["reason"]; got != "disk.low" {
		t.Fatalf("reason = %v, want disk.low", got)
	}
}

func TestAudioGenerationCapabilityOwnerGenerate(t *testing.T) {
	f := newAudioFixture(t)
	f.Cfg.Settings["AUDIOBOOK_OWNER_GENERATE"] = true
	f.Cfg.IsBookOwner = func(ctx *Context, bookID int64) bool { return true }
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/", "", 1, false)
	cap := audioGenerationCapability(f.Cfg, ctx, library.BookData{ID: 10, Formats: []string{"EPUB"}})
	if cap["permitted"] != true || cap["can_generate"] != true {
		t.Fatalf("cap = %+v", cap)
	}
}

// ---- AudiobookHome ----

func TestAudioHomeHandler(t *testing.T) {
	f := newAudioFixture(t)
	insertBook(t, f.DB, 10, "三体")
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	audioSeedChapter(t, f.DB, 100, 1, 1, "第一章")
	audioSeedProgress(t, f.DB, 1, 1, 100, false)

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audios/home", "", 1, false)
	resp, err := AudioHomeHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["err"] != "ok" || resp["enabled"] != true {
		t.Fatalf("resp = %+v", resp)
	}
	cont := resp["continue_listening"].([]map[string]any)
	if len(cont) != 1 {
		t.Fatalf("continue_listening = %d, want 1", len(cont))
	}
	if len(resp["completed"].([]map[string]any)) != 0 {
		t.Fatalf("completed 应为空")
	}
	if len(resp["recent"].([]map[string]any)) != 1 {
		t.Fatalf("recent 应为 1")
	}
}

func TestAudioHomeHandlerFinished(t *testing.T) {
	f := newAudioFixture(t)
	insertBook(t, f.DB, 10, "三体")
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	audioSeedChapter(t, f.DB, 100, 1, 1, "第一章")
	audioSeedProgress(t, f.DB, 1, 1, 100, true)

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audios/home", "", 1, false)
	resp, _ := AudioHomeHandler(f.Cfg)(ctx)
	if len(resp["continue_listening"].([]map[string]any)) != 0 {
		t.Fatalf("已听完不应出现在 continue_listening")
	}
	if len(resp["completed"].([]map[string]any)) != 1 {
		t.Fatalf("completed 应为 1")
	}
}

func TestAudioHomeHandlerGuest(t *testing.T) {
	f := newAudioFixture(t)
	insertBook(t, f.DB, 10, "三体")
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audios/home", "", 0, false)
	resp, err := AudioHomeHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	items := resp["recent"].([]map[string]any)
	if len(items) != 1 {
		t.Fatalf("游客应能看到已发布版本")
	}
	if items[0]["listening_progress"] != nil {
		t.Fatalf("游客不应有进度")
	}
}

func TestAudioHomeHandlerSkipsUnpublished(t *testing.T) {
	f := newAudioFixture(t)
	insertBook(t, f.DB, 10, "三体")
	audioSeedEdition(t, f.DB, 1, 10, "draft", "")

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audios/home", "", 1, false)
	resp, _ := AudioHomeHandler(f.Cfg)(ctx)
	if len(resp["recent"].([]map[string]any)) != 0 {
		t.Fatalf("未发布版本不应出现")
	}
}

func TestAudioHomeHandlerHiddenBook(t *testing.T) {
	f := newAudioFixture(t)
	insertBook(t, f.DB, 10, "三体")
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	f.Cfg.CanViewBook = func(ctx *Context, bookID int64) bool { return false }

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audios/home", "", 1, false)
	resp, _ := AudioHomeHandler(f.Cfg)(ctx)
	if len(resp["recent"].([]map[string]any)) != 0 {
		t.Fatalf("不可见书籍不应出现")
	}
}

func TestAudioHomeHandlerMissingBook(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 999, "published", "2026-01-05 00:00:00")

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audios/home", "", 1, false)
	resp, err := AudioHomeHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if len(resp["recent"].([]map[string]any)) != 0 {
		t.Fatalf("书不存在时应跳过")
	}
}

// ---- AudiobookList ----

func TestAudioListHandler(t *testing.T) {
	f := newAudioFixture(t)
	insertBook(t, f.DB, 10, "三体")
	insertBook(t, f.DB, 11, "流浪地球")
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	audioSeedEdition(t, f.DB, 2, 11, "published", "2026-01-06 00:00:00")

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audios", "", 1, false)
	resp, err := AudioListHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["total"] != 2 {
		t.Fatalf("total = %v, want 2", resp["total"])
	}
}

func TestAudioListHandlerKeyword(t *testing.T) {
	f := newAudioFixture(t)
	insertBook(t, f.DB, 10, "三体")
	insertBook(t, f.DB, 11, "流浪地球")
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	audioSeedEdition(t, f.DB, 2, 11, "published", "2026-01-06 00:00:00")

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audios?keyword=流浪", "", 1, false)
	resp, _ := AudioListHandler(f.Cfg)(ctx)
	if resp["total"] != 1 {
		t.Fatalf("total = %v, want 1", resp["total"])
	}
}

func TestAudioListHandlerKeywordNoMatch(t *testing.T) {
	f := newAudioFixture(t)
	insertBook(t, f.DB, 10, "三体")
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audios?keyword=zzz", "", 1, false)
	resp, _ := AudioListHandler(f.Cfg)(ctx)
	if resp["total"] != 0 {
		t.Fatalf("total = %v, want 0", resp["total"])
	}
}

// ---- AudiobookDetail ----

func TestAudioDetailHandler(t *testing.T) {
	f := newAudioFixture(t)
	insertBook(t, f.DB, 10, "三体")
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	audioSeedChapter(t, f.DB, 100, 1, 1, "第一章")

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/book/10/audios", "", 1, false)
	ctx.Params = []string{"10"}
	resp, err := AudioDetailHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("resp = %+v", resp)
	}
	editions := resp["editions"].([]map[string]any)
	if len(editions) != 1 {
		t.Fatalf("editions = %d, want 1", len(editions))
	}
	if resp["backup_retention"] != 3 {
		t.Fatalf("backup_retention = %v", resp["backup_retention"])
	}
}

func TestAudioDetailHandlerNotFound(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/book/999/audios", "", 1, false)
	ctx.Params = []string{"999"}
	resp, err := AudioDetailHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["err"] != "not_found" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioDetailHandlerBadID(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/book/x/audios", "", 1, false)
	ctx.Params = []string{"x"}
	resp, _ := AudioDetailHandler(f.Cfg)(ctx)
	if resp["err"] != "not_found" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioDetailHandlerHidesDraftFromReader(t *testing.T) {
	f := newAudioFixture(t)
	insertBook(t, f.DB, 10, "三体")
	audioSeedEdition(t, f.DB, 1, 10, "draft", "")

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/book/10/audios", "", 1, false)
	ctx.Params = []string{"10"}
	resp, _ := AudioDetailHandler(f.Cfg)(ctx)
	if len(resp["editions"].([]map[string]any)) != 0 {
		t.Fatalf("普通读者不应看到草稿版本")
	}
}

func TestAudioDetailHandlerAdminSeesDraft(t *testing.T) {
	f := newAudioFixture(t)
	insertBook(t, f.DB, 10, "三体")
	audioSeedEdition(t, f.DB, 1, 10, "draft", "")

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/book/10/audios", "", 1, true)
	ctx.Params = []string{"10"}
	resp, _ := AudioDetailHandler(f.Cfg)(ctx)
	if len(resp["editions"].([]map[string]any)) != 1 {
		t.Fatalf("管理员应看到草稿版本")
	}
}

func TestAudioDetailHandlerOwnerSeesDraft(t *testing.T) {
	f := newAudioFixture(t)
	insertBook(t, f.DB, 10, "三体")
	audioSeedEdition(t, f.DB, 1, 10, "draft", "")
	f.Cfg.IsBookOwner = func(ctx *Context, bookID int64) bool { return true }

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/book/10/audios", "", 1, false)
	ctx.Params = []string{"10"}
	resp, _ := AudioDetailHandler(f.Cfg)(ctx)
	if len(resp["editions"].([]map[string]any)) != 1 {
		t.Fatalf("书主应看到草稿版本")
	}
}

// ---- AudiobookManifest ----

func TestAudioManifestHandler(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	audioSeedChapter(t, f.DB, 100, 1, 1, "第一章")

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audio/1", "", 1, false)
	ctx.Params = []string{"1"}
	resp, err := AudioManifestHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	edition := resp["edition"].(map[string]any)
	if edition["id"] != int64(1) {
		t.Fatalf("edition = %+v", edition)
	}
	if len(edition["chapters"].([]map[string]any)) != 1 {
		t.Fatalf("chapters 应为 1")
	}
}

func TestAudioManifestHandlerNotFound(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audio/99", "", 1, false)
	ctx.Params = []string{"99"}
	resp, _ := AudioManifestHandler(f.Cfg)(ctx)
	if resp["err"] != "not_found" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioManifestHandlerHidden(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	f.Cfg.CanViewBook = func(ctx *Context, bookID int64) bool { return false }

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audio/1", "", 1, false)
	ctx.Params = []string{"1"}
	resp, _ := AudioManifestHandler(f.Cfg)(ctx)
	if resp["err"] != "not_found" {
		t.Fatalf("resp = %+v", resp)
	}
}

// ---- AudiobookTimeline ----

func TestAudioTimelineHandler(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	f.Cfg.Timeline = func(ctx *Context, editionID int64, n int) (map[string]any, error) {
		return map[string]any{"err": "ok", "edition_id": editionID, "number": n}, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audio/1/chapter/2/timeline", "", 1, false)
	ctx.Params = []string{"1", "2"}
	resp, err := AudioTimelineHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["number"] != 2 {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioTimelineHandlerNotWired(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audio/1/chapter/2/timeline", "", 1, false)
	ctx.Params = []string{"1", "2"}
	resp, _ := AudioTimelineHandler(f.Cfg)(ctx)
	if resp["err"] != "ok" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioTimelineHandlerNotFound(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audio/99/chapter/1/timeline", "", 1, false)
	ctx.Params = []string{"99", "1"}
	resp, _ := AudioTimelineHandler(f.Cfg)(ctx)
	if resp["err"] != "not_found" {
		t.Fatalf("resp = %+v", resp)
	}
}

// ---- 音频流 ----

func TestAudioStreamHandler(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	path := filepath.Join(f.Cfg.StorageRoot, "a.mp3")
	if err := os.WriteFile(path, []byte("ID3fake"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	f.Cfg.AudioFile = func(editionID int64, n int) (string, error) { return path, nil }

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/media/audio/1/chapter/1.mp3", "", 1, false)
	ctx.Params = []string{"1", "1"}
	if _, err := AudioStreamHandler(f.Cfg)(ctx); err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	rec := pluginRecorder(ctx)
	if rec.Code != http.StatusOK {
		t.Fatalf("code = %d", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "audio/mpeg" {
		t.Fatalf("Content-Type = %q", ct)
	}
	if rec.Body.String() != "ID3fake" {
		t.Fatalf("body = %q", rec.Body.String())
	}
}

func TestAudioStreamHandlerNotFound(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	f.Cfg.AudioFile = func(editionID int64, n int) (string, error) {
		return filepath.Join(f.Cfg.StorageRoot, "missing.mp3"), nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/media/audio/1/chapter/1.mp3", "", 1, false)
	ctx.Params = []string{"1", "1"}
	_, _ = AudioStreamHandler(f.Cfg)(ctx)
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Fatalf("code = %d", pluginRecorder(ctx).Code)
	}
}

func TestAudioStreamHandlerHidden(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	f.Cfg.CanViewBook = func(ctx *Context, bookID int64) bool { return false }
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/media/audio/1/chapter/1.mp3", "", 1, false)
	ctx.Params = []string{"1", "1"}
	_, _ = AudioStreamHandler(f.Cfg)(ctx)
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Fatalf("code = %d", pluginRecorder(ctx).Code)
	}
}

func TestAudioStreamHandlerBadParams(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/media/audio/x/chapter/y.mp3", "", 1, false)
	ctx.Params = []string{"x", "y"}
	_, _ = AudioStreamHandler(f.Cfg)(ctx)
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Fatalf("code = %d", pluginRecorder(ctx).Code)
	}
}

// ---- 书签 ----

func TestAudioBookmarksList(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	audioSeedChapter(t, f.DB, 100, 1, 1, "第一章")
	if _, err := f.DB.Exec(`INSERT INTO audiobook_bookmarks
		(reader_id, edition_id, chapter_id, position_ms, note, create_time)
		VALUES (1, 1, 100, 3000, '备注', '2026-01-04 00:00:00')`); err != nil {
		t.Fatalf("插入书签失败: %v", err)
	}

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audio/1/bookmarks", "", 1, false)
	ctx.Params = []string{"1"}
	resp, err := AudioBookmarksHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	marks := resp["bookmarks"].([]map[string]any)
	if len(marks) != 1 || marks[0]["note"] != "备注" {
		t.Fatalf("bookmarks = %+v", marks)
	}
}

func TestAudioBookmarksCreate(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	audioSeedChapter(t, f.DB, 100, 1, 1, "第一章")

	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/audio/1/bookmarks",
		`{"chapter_id":100,"position_ms":8000,"note":"这里"}`, 1, false)
	ctx.Params = []string{"1"}
	resp, err := AudioBookmarksHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["err"] != "ok" || resp["id"] == nil {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioBookmarksCreateInvalid(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/audio/1/bookmarks", `{"position_ms":1}`, 1, false)
	ctx.Params = []string{"1"}
	resp, _ := AudioBookmarksHandler(f.Cfg)(ctx)
	if resp["err"] != "params.invalid" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioBookmarksGuest(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audio/1/bookmarks", "", 0, false)
	ctx.Params = []string{"1"}
	resp, _ := AudioBookmarksHandler(f.Cfg)(ctx)
	if resp["err"] != "user.need_login" {
		t.Fatalf("resp = %+v", resp)
	}
}

// ---- 任务 ----

func TestAudioJobsHandler(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedJob(t, f.DB, 1, 10, 1, 1, "queued")
	audioSeedJob(t, f.DB, 2, 10, 1, 2, "queued")

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audio-jobs", "", 1, false)
	resp, err := AudioJobsHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	jobs := resp["jobs"].([]map[string]any)
	if len(jobs) != 1 {
		t.Fatalf("普通读者应只看到自己的任务: %d", len(jobs))
	}
	if _, ok := jobs[0]["plan"]; !ok {
		t.Fatalf("应含 plan 键")
	}
}

func TestAudioJobsHandlerAdmin(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedJob(t, f.DB, 1, 10, 1, 1, "queued")
	audioSeedJob(t, f.DB, 2, 10, 1, 2, "queued")

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audio-jobs", "", 1, true)
	resp, _ := AudioJobsHandler(f.Cfg)(ctx)
	if len(resp["jobs"].([]map[string]any)) != 2 {
		t.Fatalf("管理员应看到全部任务")
	}
}

func TestAudioJobsHandlerGuest(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audio-jobs", "", 0, false)
	resp, _ := AudioJobsHandler(f.Cfg)(ctx)
	if resp["err"] != "user.need_login" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioJobDictStripsPlan(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedJob(t, f.DB, 1, 10, 1, 1, "queued")
	if _, err := f.DB.Exec(`UPDATE audiobook_jobs SET data = '{"plan":{"x":1},"keep":2}' WHERE id = 1`); err != nil {
		t.Fatalf("更新失败: %v", err)
	}
	job, err := userdb.AudiobookJobByID(f.DB, 1)
	if err != nil {
		t.Fatalf("取任务失败: %v", err)
	}
	d := audioJobDict(job)
	data := d["data"].(map[string]any)
	if _, ok := data["plan"]; ok {
		t.Fatalf("plan 应被剔除")
	}
	if data["keep"] != float64(2) {
		t.Fatalf("data = %+v", data)
	}
}
