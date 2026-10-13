package httpapi

import (
	"net/http"
	"os"
	"path/filepath"
	"testing"

	"talebook/booksvr/internal/library"
)

// ---- 补充分支覆盖 ----

func TestAudioLoadBooksEmpty(t *testing.T) {
	f := newAudioFixture(t)
	books, err := audioLoadBooks(f.Cfg, nil)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(books) != 0 {
		t.Fatalf("空入参应返回空 map")
	}
}

func TestAudioVisibleEditionsNoCanView(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	f.Cfg.CanViewBook = nil
	editions, err := audioVisibleEditions(f.Cfg, pluginCtx(t, f.DB, http.MethodGet, "/", "", 1, false))
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(editions) != 1 {
		t.Fatalf("len = %d, want 1", len(editions))
	}
}

func TestAudioStreamHandlerNoAudioFile(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/media/audio/1/chapter/1.mp3", "", 1, false)
	ctx.Params = []string{"1", "1"}
	_, _ = AudioStreamHandler(f.Cfg)(ctx)
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Fatalf("code = %d", pluginRecorder(ctx).Code)
	}
}

func TestAudioStreamHandlerEditionMissing(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/media/audio/9/chapter/1.mp3", "", 1, false)
	ctx.Params = []string{"9", "1"}
	_, _ = AudioStreamHandler(f.Cfg)(ctx)
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Fatalf("code = %d", pluginRecorder(ctx).Code)
	}
}

func TestServeAudioFileDirectory(t *testing.T) {
	f := newAudioFixture(t)
	dir := filepath.Join(f.Cfg.StorageRoot, "adir")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatalf("建目录失败: %v", err)
	}
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/", "", 1, false)
	serveAudioFile(ctx, dir)
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Fatalf("目录应返回 404, code = %d", pluginRecorder(ctx).Code)
	}
}

func TestAudioBookmarksHandlerEditionMissing(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audio/9/bookmarks", "", 1, false)
	ctx.Params = []string{"9"}
	resp, _ := AudioBookmarksHandler(f.Cfg)(ctx)
	if resp["err"] != "not_found" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioBookmarksHandlerHidden(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	f.Cfg.CanViewBook = func(ctx *Context, bookID int64) bool { return false }
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audio/1/bookmarks", "", 1, false)
	ctx.Params = []string{"1"}
	resp, _ := AudioBookmarksHandler(f.Cfg)(ctx)
	if resp["err"] != "not_found" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioBookmarksHandlerBadID(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audio/x/bookmarks", "", 1, false)
	ctx.Params = []string{"x"}
	resp, _ := AudioBookmarksHandler(f.Cfg)(ctx)
	if resp["err"] != "not_found" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioJobActionHandlerBadID(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodPatch, "/api/audio-job/x", `{}`, 1, false)
	ctx.Params = []string{"x"}
	resp, _ := AudioJobActionHandler(f.Cfg)(ctx)
	if resp["err"] != "not_found" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioJobActionHandlerGuest(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodPatch, "/api/audio-job/1", `{}`, 0, false)
	ctx.Params = []string{"1"}
	resp, _ := AudioJobActionHandler(f.Cfg)(ctx)
	if resp["err"] != "user.need_login" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioJobActionHandlerBadBody(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodPatch, "/api/audio-job/1", `nope`, 1, false)
	ctx.Params = []string{"1"}
	resp, _ := AudioJobActionHandler(f.Cfg)(ctx)
	if resp["err"] != "params.invalid" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioWorkspaceHandlerGuest(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audio-job/1/workspace", "", 0, false)
	ctx.Params = []string{"1"}
	resp, _ := AudioWorkspaceHandler(f.Cfg)(ctx)
	if resp["err"] != "user.need_login" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioWorkspaceHandlerBadID(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audio-job/x/workspace", "", 1, false)
	ctx.Params = []string{"x"}
	resp, _ := AudioWorkspaceHandler(f.Cfg)(ctx)
	if resp["err"] != "not_found" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioConfirmHandlerGuest(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/audio-job/1/confirm", `{}`, 0, false)
	ctx.Params = []string{"1"}
	resp, _ := AudioConfirmHandler(f.Cfg)(ctx)
	if resp["err"] != "user.need_login" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioConfirmHandlerBadID(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/audio-job/x/confirm", `{}`, 1, false)
	ctx.Params = []string{"x"}
	resp, _ := AudioConfirmHandler(f.Cfg)(ctx)
	if resp["err"] != "not_found" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioRevisionHandlerGuest(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/audio/1/revisions", `{}`, 0, false)
	ctx.Params = []string{"1"}
	resp, _ := AudioRevisionHandler(f.Cfg)(ctx)
	if resp["err"] != "user.need_login" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioRevisionHandlerBadID(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/audio/x/revisions", `{}`, 1, false)
	ctx.Params = []string{"x"}
	resp, _ := AudioRevisionHandler(f.Cfg)(ctx)
	if resp["err"] != "not_found" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioBackupCleanupHandlerBadID(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodDelete, "/api/book/x/audio-backups", "", 1, true)
	ctx.Params = []string{"x"}
	resp, _ := AudioBackupCleanupHandler(f.Cfg)(ctx)
	if resp["err"] != "not_found" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioBackupCleanupHandlerNotWired(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodDelete, "/api/book/10/audio-backups", "", 1, true)
	ctx.Params = []string{"10"}
	resp, _ := AudioBackupCleanupHandler(f.Cfg)(ctx)
	if resp["err"] != "not_wired" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioEditionDeleteHandlerBadID(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodDelete, "/api/audio/x", "", 1, true)
	ctx.Params = []string{"x"}
	resp, _ := AudioEditionDeleteHandler(f.Cfg)(ctx)
	if resp["err"] != "not_found" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioEditionDeleteHandlerNotWired(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodDelete, "/api/audio/5", "", 1, true)
	ctx.Params = []string{"5"}
	resp, _ := AudioEditionDeleteHandler(f.Cfg)(ctx)
	if resp["err"] != "not_wired" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioSessionsHandlerGuest(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/audio/1/sessions", `{}`, 0, false)
	ctx.Params = []string{"1"}
	resp, _ := AudioSessionsHandler(f.Cfg)(ctx)
	if resp["err"] != "user.need_login" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioSessionsHandlerBadID(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/audio/x/sessions", `{}`, 1, false)
	ctx.Params = []string{"x"}
	resp, _ := AudioSessionsHandler(f.Cfg)(ctx)
	if resp["err"] != "not_found" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioSessionHandlerGuest(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodPatch, "/api/audio-session/abc", `{}`, 0, false)
	ctx.Params = []string{"abc"}
	resp, _ := AudioSessionHandler(f.Cfg)(ctx)
	if resp["err"] != "user.need_login" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioSessionHandlerNotWired(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodPatch, "/api/audio-session/abc", `{}`, 1, false)
	ctx.Params = []string{"abc"}
	resp, _ := AudioSessionHandler(f.Cfg)(ctx)
	if resp["err"] != "not_wired" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioVoicePreviewHandlerError(t *testing.T) {
	f := newAudioFixture(t)
	f.Cfg.VoicePreview = func(engine, voiceID string) ([]byte, string, error) {
		return nil, "", os.ErrNotExist
	}
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/media/audio-voice/edgetts/x.mp3", "", 1, false)
	ctx.Params = []string{"edgetts", "x"}
	_, _ = AudioVoicePreviewHandler(f.Cfg)(ctx)
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Fatalf("code = %d", pluginRecorder(ctx).Code)
	}
}

func TestAudioVoicePreviewHandlerDefaultContentType(t *testing.T) {
	f := newAudioFixture(t)
	f.Cfg.VoicePreview = func(engine, voiceID string) ([]byte, string, error) {
		return []byte("X"), "", nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/media/audio-voice/edgetts/x.mp3", "", 1, false)
	ctx.Params = []string{"edgetts", "x"}
	_, _ = AudioVoicePreviewHandler(f.Cfg)(ctx)
	if ct := pluginRecorder(ctx).Header().Get("Content-Type"); ct != "audio/mpeg" {
		t.Fatalf("Content-Type = %q", ct)
	}
}

func TestPodcastSubscriptionHandlerPost(t *testing.T) {
	f := newAudioFixture(t)
	f.Cfg.Subscription = func(ctx *Context, method string, args map[string]any) (map[string]any, error) {
		return map[string]any{"err": "ok", "method": method, "args": args}, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/me/podcast-subscription", `{"active":true}`, 1, false)
	resp, _ := PodcastSubscriptionHandler(f.Cfg)(ctx)
	if resp["method"] != http.MethodPost {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestPodcastSubscriptionHandlerBadBody(t *testing.T) {
	f := newAudioFixture(t)
	f.Cfg.Subscription = func(ctx *Context, method string, args map[string]any) (map[string]any, error) {
		return map[string]any{"err": "ok"}, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/me/podcast-subscription", `nope`, 1, false)
	resp, _ := PodcastSubscriptionHandler(f.Cfg)(ctx)
	if resp["err"] != "params.invalid" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestPodcastFeedHandlerBuildError(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedSubscription(t, f.DB, 1, 1, audioTokenHash("tok123"), true)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	// 删掉章节表，让 feed 构建阶段报错（订阅查询仍成功）
	if _, err := f.DB.Exec(`DROP TABLE audiobook_chapters`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/podcast/v1/tok123/feed.xml", "", 0, false)
	ctx.Params = []string{"tok123"}
	_, _ = PodcastFeedHandler(f.Cfg)(ctx)
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Fatalf("code = %d", pluginRecorder(ctx).Code)
	}
}

func TestPodcastAudioHandlerBadParams(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/podcast/v1/t/audio/x/chapter/y.mp3", "", 0, false)
	ctx.Params = []string{"t", "x", "y"}
	_, _ = PodcastAudioHandler(f.Cfg)(ctx)
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Fatalf("code = %d", pluginRecorder(ctx).Code)
	}
}

func TestPodcastAudioHandlerBadToken(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/podcast/v1/nope/audio/1/chapter/1.mp3", "", 0, false)
	ctx.Params = []string{"nope", "1", "1"}
	_, _ = PodcastAudioHandler(f.Cfg)(ctx)
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Fatalf("code = %d", pluginRecorder(ctx).Code)
	}
}

func TestPodcastAudioHandlerNoAudioFile(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	audioSeedSubscription(t, f.DB, 1, 1, audioTokenHash("tok123"), true)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/podcast/v1/tok123/audio/1/chapter/1.mp3", "", 0, false)
	ctx.Params = []string{"tok123", "1", "1"}
	_, _ = PodcastAudioHandler(f.Cfg)(ctx)
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Fatalf("code = %d", pluginRecorder(ctx).Code)
	}
}

func TestPodcastCoverHandlerBadBookID(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedSubscription(t, f.DB, 1, 1, audioTokenHash("tok123"), true)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/podcast/v1/tok123/cover/x.jpg", "", 0, false)
	ctx.Params = []string{"tok123", "x"}
	_, _ = PodcastCoverHandler(f.Cfg)(ctx)
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Fatalf("code = %d", pluginRecorder(ctx).Code)
	}
}

func TestPodcastSiteCoverHandlerBadToken(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/podcast/v1/nope/cover/site.jpg", "", 0, false)
	ctx.Params = []string{"nope"}
	_, _ = PodcastSiteCoverHandler(f.Cfg)(ctx)
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Fatalf("code = %d", pluginRecorder(ctx).Code)
	}
}

func TestPodcastAuditHandlerPatch(t *testing.T) {
	f := newAudioFixture(t)
	f.Cfg.Audit = func(ctx *Context, method string, args map[string]any) (map[string]any, error) {
		return map[string]any{"err": "ok", "method": method, "args": args}, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodPatch, "/api/admin/podcast-audits", `{"id":1}`, 1, true)
	resp, _ := PodcastAuditHandler(f.Cfg)(ctx)
	if resp["method"] != http.MethodPatch {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestPodcastAuditHandlerBadBody(t *testing.T) {
	f := newAudioFixture(t)
	f.Cfg.Audit = func(ctx *Context, method string, args map[string]any) (map[string]any, error) {
		return map[string]any{"err": "ok"}, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodPatch, "/api/admin/podcast-audits", `nope`, 1, true)
	resp, _ := PodcastAuditHandler(f.Cfg)(ctx)
	if resp["err"] != "params.invalid" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioTimelineHandlerBadParams(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audio/x/chapter/y/timeline", "", 1, false)
	ctx.Params = []string{"x", "y"}
	resp, _ := AudioTimelineHandler(f.Cfg)(ctx)
	if resp["err"] != "not_found" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioTimelineHandlerHidden(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	f.Cfg.CanViewBook = func(ctx *Context, bookID int64) bool { return false }
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audio/1/chapter/1/timeline", "", 1, false)
	ctx.Params = []string{"1", "1"}
	resp, _ := AudioTimelineHandler(f.Cfg)(ctx)
	if resp["err"] != "not_found" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioManifestHandlerBadID(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audio/x", "", 1, false)
	ctx.Params = []string{"x"}
	resp, _ := AudioManifestHandler(f.Cfg)(ctx)
	if resp["err"] != "not_found" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioJobCreateHandlerBadID(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/x/audio-jobs", `{}`, 1, false)
	ctx.Params = []string{"x"}
	resp, _ := AudioJobCreateHandler(f.Cfg)(ctx)
	if resp["err"] != "not_found" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioHomeHandlerDBError(t *testing.T) {
	f := newAudioFixture(t)
	_ = f.DB.Close()
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audios/home", "", 1, false)
	if _, err := AudioHomeHandler(f.Cfg)(ctx); err == nil {
		t.Fatalf("应返回错误")
	}
}

func TestAudioListHandlerDBError(t *testing.T) {
	f := newAudioFixture(t)
	_ = f.DB.Close()
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audios", "", 1, false)
	if _, err := AudioListHandler(f.Cfg)(ctx); err == nil {
		t.Fatalf("应返回错误")
	}
}

func TestAudioJobsHandlerDBError(t *testing.T) {
	f := newAudioFixture(t)
	_ = f.DB.Close()
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audio-jobs", "", 1, false)
	if _, err := AudioJobsHandler(f.Cfg)(ctx); err == nil {
		t.Fatalf("应返回错误")
	}
}

func TestAudioMyStatsHandlerDBError(t *testing.T) {
	f := newAudioFixture(t)
	_ = f.DB.Close()
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audio-stats/me", "", 1, false)
	if _, err := AudioMyStatsHandler(f.Cfg)(ctx); err == nil {
		t.Fatalf("应返回错误")
	}
}

func TestAudioAdminStatsHandlerDBError(t *testing.T) {
	f := newAudioFixture(t)
	_ = f.DB.Close()
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/admin/audio-stats", "", 1, true)
	if _, err := AudioAdminStatsHandler(f.Cfg)(ctx); err == nil {
		t.Fatalf("应返回错误")
	}
}

func TestAudioDetailHandlerDBError(t *testing.T) {
	f := newAudioFixture(t)
	insertBook(t, f.DB, 10, "三体")
	_ = f.DB.Close()
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/book/10/audios", "", 1, false)
	ctx.Params = []string{"10"}
	if _, err := AudioDetailHandler(f.Cfg)(ctx); err == nil {
		t.Fatalf("应返回错误")
	}
}

func TestAudioBookmarksHandlerDBError(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	_ = f.DB.Close()
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audio/1/bookmarks", "", 1, false)
	ctx.Params = []string{"1"}
	if _, err := AudioBookmarksHandler(f.Cfg)(ctx); err == nil {
		t.Fatalf("应返回错误")
	}
}

func TestAudioManifestHandlerDBError(t *testing.T) {
	f := newAudioFixture(t)
	_ = f.DB.Close()
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audio/1", "", 1, false)
	ctx.Params = []string{"1"}
	if _, err := AudioManifestHandler(f.Cfg)(ctx); err == nil {
		t.Fatalf("应返回错误")
	}
}

func TestAudioGenerationCapabilityFreeBytesError(t *testing.T) {
	f := newAudioFixture(t)
	f.Cfg.FreeBytes = func() (int64, error) { return 0, os.ErrPermission }
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/", "", 1, true)
	cap := audioGenerationCapability(f.Cfg, ctx, library.BookData{ID: 10, Formats: []string{"EPUB"}})
	if cap["capacity"].(map[string]any)["free_bytes"] != int64(0) {
		t.Fatalf("cap = %+v", cap)
	}
}

func TestAudioGenerationCapabilityNoFreeBytesFn(t *testing.T) {
	f := newAudioFixture(t)
	f.Cfg.FreeBytes = nil
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/", "", 1, true)
	cap := audioGenerationCapability(f.Cfg, ctx, library.BookData{ID: 10, Formats: []string{"EPUB"}})
	if cap["capacity"].(map[string]any)["free_bytes"] != int64(0) {
		t.Fatalf("cap = %+v", cap)
	}
}

func TestAudioGenerationCapabilityNoIsBookOwner(t *testing.T) {
	f := newAudioFixture(t)
	f.Cfg.Settings["AUDIOBOOK_OWNER_GENERATE"] = true
	f.Cfg.IsBookOwner = nil
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/", "", 1, false)
	cap := audioGenerationCapability(f.Cfg, ctx, library.BookData{ID: 10, Formats: []string{"EPUB"}})
	if cap["permitted"] != false {
		t.Fatalf("cap = %+v", cap)
	}
}

func TestDirectRemoteIPNil(t *testing.T) {
	if got := directRemoteIP(nil); got != "" {
		t.Fatalf("got %q", got)
	}
}

func TestAudioSourceIPNoPort(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/", "", 1, false)
	ctx.Request.RemoteAddr = "1.2.3.4"
	if got := audioSourceIP(f.Cfg, ctx); got != "1.2.3.4" {
		t.Fatalf("got %q", got)
	}
}
