package httpapi

import (
	"database/sql"
	"encoding/xml"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"talebook/booksvr/internal/userdb"
)

// ---- 委托型 handler ----

func TestAudioJobCreateHandler(t *testing.T) {
	f := newAudioFixture(t)
	f.Cfg.CreateJob = func(ctx *Context, bookID int64, args map[string]any) (map[string]any, error) {
		return map[string]any{"err": "ok", "book_id": bookID, "mode": args["mode"]}, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/10/audio-jobs", `{"mode":"full"}`, 1, false)
	ctx.Params = []string{"10"}
	resp, err := AudioJobCreateHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["book_id"] != int64(10) || resp["mode"] != "full" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioJobCreateHandlerNotWired(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/10/audio-jobs", `{}`, 1, false)
	ctx.Params = []string{"10"}
	resp, _ := AudioJobCreateHandler(f.Cfg)(ctx)
	if resp["err"] != "not_wired" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioJobCreateHandlerGuest(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/10/audio-jobs", `{}`, 0, false)
	ctx.Params = []string{"10"}
	resp, _ := AudioJobCreateHandler(f.Cfg)(ctx)
	if resp["err"] != "user.need_login" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioJobCreateHandlerBadBody(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/book/10/audio-jobs", `not-json`, 1, false)
	ctx.Params = []string{"10"}
	resp, _ := AudioJobCreateHandler(f.Cfg)(ctx)
	if resp["err"] != "params.invalid" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioJobActionHandler(t *testing.T) {
	f := newAudioFixture(t)
	f.Cfg.JobAction = func(ctx *Context, jobID int64, action string) (map[string]any, error) {
		return map[string]any{"err": "ok", "job_id": jobID, "action": action}, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodPatch, "/api/audio-job/7", `{"action":"cancel"}`, 1, false)
	ctx.Params = []string{"7"}
	resp, _ := AudioJobActionHandler(f.Cfg)(ctx)
	if resp["job_id"] != int64(7) || resp["action"] != "cancel" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioJobActionHandlerNotWired(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodPatch, "/api/audio-job/7", `{"action":"cancel"}`, 1, false)
	ctx.Params = []string{"7"}
	resp, _ := AudioJobActionHandler(f.Cfg)(ctx)
	if resp["err"] != "not_wired" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioWorkspaceHandlerGet(t *testing.T) {
	f := newAudioFixture(t)
	f.Cfg.Workspace = func(ctx *Context, jobID int64) (map[string]any, error) {
		return map[string]any{"err": "ok", "job_id": jobID}, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audio-job/7/workspace", "", 1, false)
	ctx.Params = []string{"7"}
	resp, _ := AudioWorkspaceHandler(f.Cfg)(ctx)
	if resp["job_id"] != int64(7) {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioWorkspaceHandlerPatch(t *testing.T) {
	f := newAudioFixture(t)
	f.Cfg.WorkspacePatch = func(ctx *Context, jobID int64, args map[string]any) (map[string]any, error) {
		return map[string]any{"err": "ok", "saved": args["chapter"]}, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodPatch, "/api/audio-job/7/workspace", `{"chapter":3}`, 1, false)
	ctx.Params = []string{"7"}
	resp, _ := AudioWorkspaceHandler(f.Cfg)(ctx)
	if resp["saved"] != float64(3) {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioWorkspaceHandlerNotWired(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audio-job/7/workspace", "", 1, false)
	ctx.Params = []string{"7"}
	resp, _ := AudioWorkspaceHandler(f.Cfg)(ctx)
	if resp["err"] != "not_wired" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioConfirmHandler(t *testing.T) {
	f := newAudioFixture(t)
	f.Cfg.ConfirmJob = func(ctx *Context, jobID int64, args map[string]any) (map[string]any, error) {
		return map[string]any{"err": "ok", "confirmed": jobID}, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/audio-job/7/confirm", `{}`, 1, false)
	ctx.Params = []string{"7"}
	resp, _ := AudioConfirmHandler(f.Cfg)(ctx)
	if resp["confirmed"] != int64(7) {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioConfirmHandlerNotWired(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/audio-job/7/confirm", `{}`, 1, false)
	ctx.Params = []string{"7"}
	resp, _ := AudioConfirmHandler(f.Cfg)(ctx)
	if resp["err"] != "not_wired" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioRevisionHandler(t *testing.T) {
	f := newAudioFixture(t)
	f.Cfg.CreateRevision = func(ctx *Context, editionID int64, args map[string]any) (map[string]any, error) {
		return map[string]any{"err": "ok", "edition_id": editionID}, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/audio/3/revisions", `{}`, 1, false)
	ctx.Params = []string{"3"}
	resp, _ := AudioRevisionHandler(f.Cfg)(ctx)
	if resp["edition_id"] != int64(3) {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioRevisionHandlerNotWired(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/audio/3/revisions", `{}`, 1, false)
	ctx.Params = []string{"3"}
	resp, _ := AudioRevisionHandler(f.Cfg)(ctx)
	if resp["err"] != "not_wired" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioBackupCleanupHandler(t *testing.T) {
	f := newAudioFixture(t)
	f.Cfg.CleanupBackups = func(ctx *Context, bookID int64) (map[string]any, error) {
		return map[string]any{"err": "ok", "removed": 2}, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodDelete, "/api/book/10/audio-backups", "", 1, true)
	ctx.Params = []string{"10"}
	resp, _ := AudioBackupCleanupHandler(f.Cfg)(ctx)
	if resp["removed"] != 2 {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioBackupCleanupHandlerForbidden(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodDelete, "/api/book/10/audio-backups", "", 1, false)
	ctx.Params = []string{"10"}
	resp, _ := AudioBackupCleanupHandler(f.Cfg)(ctx)
	if resp["err"] != "permission" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioEditionDeleteHandler(t *testing.T) {
	f := newAudioFixture(t)
	f.Cfg.DeleteEdition = func(ctx *Context, editionID int64) (map[string]any, error) {
		return map[string]any{"err": "ok", "deleted": editionID}, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodDelete, "/api/audio/5", "", 1, true)
	ctx.Params = []string{"5"}
	resp, _ := AudioEditionDeleteHandler(f.Cfg)(ctx)
	if resp["deleted"] != int64(5) {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioEditionDeleteHandlerForbidden(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodDelete, "/api/audio/5", "", 1, false)
	ctx.Params = []string{"5"}
	resp, _ := AudioEditionDeleteHandler(f.Cfg)(ctx)
	if resp["err"] != "permission" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioSessionsHandler(t *testing.T) {
	f := newAudioFixture(t)
	f.Cfg.CreateSession = func(ctx *Context, editionID int64, args map[string]any) (map[string]any, error) {
		return map[string]any{"err": "ok", "uuid": "abc", "edition_id": editionID}, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/audio/1/sessions", `{}`, 1, false)
	ctx.Params = []string{"1"}
	resp, _ := AudioSessionsHandler(f.Cfg)(ctx)
	if resp["uuid"] != "abc" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioSessionsHandlerNotWired(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/audio/1/sessions", `{}`, 1, false)
	ctx.Params = []string{"1"}
	resp, _ := AudioSessionsHandler(f.Cfg)(ctx)
	if resp["err"] != "not_wired" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioSessionHandler(t *testing.T) {
	f := newAudioFixture(t)
	var gotClose bool
	f.Cfg.UpdateSession = func(ctx *Context, sessionID string, args map[string]any, close bool) (map[string]any, error) {
		gotClose = close
		return map[string]any{"err": "ok", "uuid": sessionID}, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodPatch, "/api/audio-session/abc123", `{"current_ms":1}`, 1, false)
	ctx.Params = []string{"abc123"}
	resp, _ := AudioSessionHandler(f.Cfg)(ctx)
	if resp["uuid"] != "abc123" || gotClose {
		t.Fatalf("resp = %+v close=%v", resp, gotClose)
	}
}

func TestAudioSessionHandlerClose(t *testing.T) {
	f := newAudioFixture(t)
	var gotClose bool
	f.Cfg.UpdateSession = func(ctx *Context, sessionID string, args map[string]any, close bool) (map[string]any, error) {
		gotClose = close
		return map[string]any{"err": "ok"}, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodPost, "/api/audio-session/abc123/close", `{}`, 1, false)
	ctx.Params = []string{"abc123"}
	_, _ = AudioSessionHandler(f.Cfg)(ctx)
	if !gotClose {
		t.Fatalf("close 应为 true")
	}
}

func TestAudioVoicesHandler(t *testing.T) {
	f := newAudioFixture(t)
	f.Cfg.Voices = func() []map[string]any {
		return []map[string]any{{"id": "zh-CN-XiaoxiaoNeural", "name": "晓晓"}}
	}
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audio-voices", "", 1, false)
	resp, _ := AudioVoicesHandler(f.Cfg)(ctx)
	if len(resp["voices"].([]map[string]any)) != 1 {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioVoicesHandlerEmpty(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audio-voices", "", 1, false)
	resp, _ := AudioVoicesHandler(f.Cfg)(ctx)
	if len(resp["voices"].([]map[string]any)) != 0 {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioVoicePreviewHandler(t *testing.T) {
	f := newAudioFixture(t)
	f.Cfg.VoicePreview = func(engine, voiceID string) ([]byte, string, error) {
		return []byte("MP3"), "audio/mpeg", nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/media/audio-voice/edgetts/zh-CN-XiaoxiaoNeural.mp3", "", 1, false)
	ctx.Params = []string{"edgetts", "zh-CN-XiaoxiaoNeural"}
	_, _ = AudioVoicePreviewHandler(f.Cfg)(ctx)
	rec := pluginRecorder(ctx)
	if rec.Code != http.StatusOK || rec.Body.String() != "MP3" {
		t.Fatalf("code=%d body=%q", rec.Code, rec.Body.String())
	}
}

func TestAudioVoicePreviewHandlerNotWired(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/media/audio-voice/edgetts/x.mp3", "", 1, false)
	ctx.Params = []string{"edgetts", "x"}
	_, _ = AudioVoicePreviewHandler(f.Cfg)(ctx)
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Fatalf("code = %d", pluginRecorder(ctx).Code)
	}
}

// ---- 播客 ----

func TestPodcastSubscriptionHandler(t *testing.T) {
	f := newAudioFixture(t)
	f.Cfg.Subscription = func(ctx *Context, method string, args map[string]any) (map[string]any, error) {
		return map[string]any{"err": "ok", "method": method}, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/me/podcast-subscription", "", 1, false)
	resp, _ := PodcastSubscriptionHandler(f.Cfg)(ctx)
	if resp["method"] != http.MethodGet {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestPodcastSubscriptionHandlerGuest(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/me/podcast-subscription", "", 0, false)
	resp, _ := PodcastSubscriptionHandler(f.Cfg)(ctx)
	if resp["err"] != "user.need_login" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestPodcastSubscriptionHandlerNotWired(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/me/podcast-subscription", "", 1, false)
	resp, _ := PodcastSubscriptionHandler(f.Cfg)(ctx)
	if resp["err"] != "not_wired" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestPodcastFeedHandler(t *testing.T) {
	f := newAudioFixture(t)
	insertBook(t, f.DB, 10, "三体")
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	audioSeedChapter(t, f.DB, 100, 1, 1, "第一章")
	audioSeedSubscription(t, f.DB, 1, 1, audioTokenHash("tok123"), true)

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/podcast/v1/tok123/feed.xml", "", 0, false)
	ctx.Params = []string{"tok123"}
	if _, err := PodcastFeedHandler(f.Cfg)(ctx); err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	rec := pluginRecorder(ctx)
	if rec.Code != http.StatusOK {
		t.Fatalf("code = %d", rec.Code)
	}
	if !strings.Contains(rec.Header().Get("Content-Type"), "rss+xml") {
		t.Fatalf("Content-Type = %q", rec.Header().Get("Content-Type"))
	}
	body := rec.Body.String()
	if !strings.Contains(body, "<title>第一章</title>") {
		t.Fatalf("feed 缺少章节: %s", body)
	}
	if !strings.Contains(body, "/podcast/v1/tok123/audio/1/chapter/1.mp3") {
		t.Fatalf("feed 缺少音频链接: %s", body)
	}
	var parsed podcastFeedXML
	if err := xml.Unmarshal([]byte(body), &parsed); err != nil {
		t.Fatalf("XML 解析失败: %v", err)
	}
	if len(parsed.Channel.Items) != 1 {
		t.Fatalf("items = %d", len(parsed.Channel.Items))
	}
}

func TestPodcastFeedHandlerBadToken(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/podcast/v1/nope/feed.xml", "", 0, false)
	ctx.Params = []string{"nope"}
	_, _ = PodcastFeedHandler(f.Cfg)(ctx)
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Fatalf("code = %d", pluginRecorder(ctx).Code)
	}
}

func TestPodcastFeedHandlerSkipsHidden(t *testing.T) {
	f := newAudioFixture(t)
	insertBook(t, f.DB, 10, "三体")
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	audioSeedChapter(t, f.DB, 100, 1, 1, "第一章")
	audioSeedSubscription(t, f.DB, 1, 1, audioTokenHash("tok123"), true)
	f.Cfg.CanViewBook = func(ctx *Context, bookID int64) bool { return false }

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/podcast/v1/tok123/feed.xml", "", 0, false)
	ctx.Params = []string{"tok123"}
	_, _ = PodcastFeedHandler(f.Cfg)(ctx)
	if strings.Contains(pluginRecorder(ctx).Body.String(), "第一章") {
		t.Fatalf("不可见书籍不应出现在 feed")
	}
}

func TestPodcastAudioHandler(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	audioSeedSubscription(t, f.DB, 1, 1, audioTokenHash("tok123"), true)
	path := filepath.Join(f.Cfg.StorageRoot, "b.mp3")
	if err := os.WriteFile(path, []byte("AUDIO"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	f.Cfg.AudioFile = func(editionID int64, n int) (string, error) { return path, nil }

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/podcast/v1/tok123/audio/1/chapter/1.mp3", "", 0, false)
	ctx.Params = []string{"tok123", "1", "1"}
	_, _ = PodcastAudioHandler(f.Cfg)(ctx)
	rec := pluginRecorder(ctx)
	if rec.Code != http.StatusOK || rec.Body.String() != "AUDIO" {
		t.Fatalf("code=%d body=%q", rec.Code, rec.Body.String())
	}
}

func TestPodcastAudioHandlerUnpublished(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "draft", "")
	audioSeedSubscription(t, f.DB, 1, 1, audioTokenHash("tok123"), true)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/podcast/v1/tok123/audio/1/chapter/1.mp3", "", 0, false)
	ctx.Params = []string{"tok123", "1", "1"}
	_, _ = PodcastAudioHandler(f.Cfg)(ctx)
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Fatalf("code = %d", pluginRecorder(ctx).Code)
	}
}

func TestPodcastCoverHandler(t *testing.T) {
	f := newAudioFixture(t)
	insertBook(t, f.DB, 10, "三体")
	audioSeedSubscription(t, f.DB, 1, 1, audioTokenHash("tok123"), true)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/podcast/v1/tok123/cover/10.jpg", "", 0, false)
	ctx.Params = []string{"tok123", "10"}
	_, _ = PodcastCoverHandler(f.Cfg)(ctx)
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Fatalf("code = %d", pluginRecorder(ctx).Code)
	}
}

func TestPodcastCoverHandlerBadToken(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/podcast/v1/nope/cover/10.jpg", "", 0, false)
	ctx.Params = []string{"nope", "10"}
	_, _ = PodcastCoverHandler(f.Cfg)(ctx)
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Fatalf("code = %d", pluginRecorder(ctx).Code)
	}
}

func TestPodcastSiteCoverHandler(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedSubscription(t, f.DB, 1, 1, audioTokenHash("tok123"), true)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/podcast/v1/tok123/cover/site.jpg", "", 0, false)
	ctx.Params = []string{"tok123"}
	_, _ = PodcastSiteCoverHandler(f.Cfg)(ctx)
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Fatalf("code = %d", pluginRecorder(ctx).Code)
	}
}

// ---- 统计 ----

func TestAudioMyStatsHandler(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	audioSeedChapter(t, f.DB, 100, 1, 1, "第一章")
	audioSeedProgress(t, f.DB, 1, 1, 100, true)

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audio-stats/me", "", 1, false)
	resp, err := AudioMyStatsHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	stats := resp["stats"].(map[string]any)
	if stats["finished_count"] != int64(1) || stats["edition_count"] != int64(1) {
		t.Fatalf("stats = %+v", stats)
	}
}

func TestAudioMyStatsHandlerGuest(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/audio-stats/me", "", 0, false)
	resp, _ := AudioMyStatsHandler(f.Cfg)(ctx)
	if resp["err"] != "user.need_login" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestAudioAdminStatsHandler(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	audioSeedEdition(t, f.DB, 2, 11, "draft", "")
	audioSeedChapter(t, f.DB, 100, 1, 1, "第一章")

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/admin/audio-stats", "", 1, true)
	resp, err := AudioAdminStatsHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	stats := resp["stats"].(map[string]any)
	if stats["edition_count"] != int64(2) || stats["published_count"] != int64(1) {
		t.Fatalf("stats = %+v", stats)
	}
	if stats["chapter_count"] != int64(1) {
		t.Fatalf("chapter_count = %v", stats["chapter_count"])
	}
}

func TestAudioAdminStatsHandlerForbidden(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/admin/audio-stats", "", 1, false)
	resp, _ := AudioAdminStatsHandler(f.Cfg)(ctx)
	if resp["err"] != "permission.not_admin" {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestPodcastAuditHandler(t *testing.T) {
	f := newAudioFixture(t)
	f.Cfg.Audit = func(ctx *Context, method string, args map[string]any) (map[string]any, error) {
		return map[string]any{"err": "ok", "method": method}, nil
	}
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/admin/podcast-audits", "", 1, true)
	resp, _ := PodcastAuditHandler(f.Cfg)(ctx)
	if resp["method"] != http.MethodGet {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestPodcastAuditHandlerNotWired(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/admin/podcast-audits", "", 1, true)
	resp, _ := PodcastAuditHandler(f.Cfg)(ctx)
	if resp["err"] != "ok" || resp["total"] != 0 {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestPodcastAuditHandlerForbidden(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/admin/podcast-audits", "", 1, false)
	resp, _ := PodcastAuditHandler(f.Cfg)(ctx)
	if resp["err"] != "permission.not_admin" {
		t.Fatalf("resp = %+v", resp)
	}
}

// ---- 数据层 ----

func TestListPublishedAudiobookEditions(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	audioSeedEdition(t, f.DB, 2, 11, "published", "2026-01-06 00:00:00")
	audioSeedEdition(t, f.DB, 3, 12, "draft", "")

	editions, err := userdb.ListPublishedAudiobookEditions(f.DB)
	if err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if len(editions) != 2 {
		t.Fatalf("len = %d, want 2", len(editions))
	}
	if editions[0].ID != 2 {
		t.Fatalf("应按发布时间降序: %d", editions[0].ID)
	}
}

func TestCreateAudiobookBookmark(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	audioSeedChapter(t, f.DB, 100, 1, 1, "第一章")
	id, err := userdb.CreateAudiobookBookmark(f.DB, 1, 1, 100, 9000, "标记")
	if err != nil {
		t.Fatalf("创建失败: %v", err)
	}
	if id == 0 {
		t.Fatalf("id 应为非零")
	}
	marks, err := userdb.ListAudiobookBookmarks(f.DB, 1, 1)
	if err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if len(marks) != 1 || marks[0].Note != "标记" || marks[0].PositionMS != 9000 {
		t.Fatalf("marks = %+v", marks)
	}
}

func TestUpsertAudiobookProgress(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	audioSeedChapter(t, f.DB, 100, 1, 1, "第一章")

	if err := userdb.UpsertAudiobookProgress(f.DB, 1, 1, 100, 1000, 1000, false); err != nil {
		t.Fatalf("首次写入失败: %v", err)
	}
	if err := userdb.UpsertAudiobookProgress(f.DB, 1, 1, 100, 5000, 5000, true); err != nil {
		t.Fatalf("二次写入失败: %v", err)
	}
	p, err := userdb.GetAudiobookProgress(f.DB, 1, 1)
	if err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if p.PositionMS != 5000 || !p.IsFinished {
		t.Fatalf("p = %+v", p)
	}
	if p.Version != 2 {
		t.Fatalf("version = %d, want 2", p.Version)
	}
}

func TestListAudiobookProgressFor(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	audioSeedEdition(t, f.DB, 2, 11, "published", "2026-01-06 00:00:00")
	audioSeedChapter(t, f.DB, 100, 1, 1, "第一章")
	audioSeedProgress(t, f.DB, 1, 1, 100, false)

	got, err := userdb.ListAudiobookProgressFor(f.DB, 1, []int64{1, 2})
	if err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if len(got) != 1 || got[1] == nil {
		t.Fatalf("got = %+v", got)
	}
	empty, err := userdb.ListAudiobookProgressFor(f.DB, 1, nil)
	if err != nil || len(empty) != 0 {
		t.Fatalf("空入参应返回空 map: %v %v", empty, err)
	}
}

func TestAudiobookStatsForReader(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	audioSeedChapter(t, f.DB, 100, 1, 1, "第一章")
	audioSeedProgress(t, f.DB, 1, 1, 100, true)

	stats, err := userdb.AudiobookStatsForReader(f.DB, 1)
	if err != nil {
		t.Fatalf("统计失败: %v", err)
	}
	if stats["finished_count"] != int64(1) || stats["listened_ms"] != int64(5000) {
		t.Fatalf("stats = %+v", stats)
	}
}

func TestAudiobookAdminStats(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	audioSeedEdition(t, f.DB, 2, 11, "draft", "")
	audioSeedChapter(t, f.DB, 100, 1, 1, "第一章")
	audioSeedJob(t, f.DB, 1, 10, 1, 1, "running")

	stats, err := userdb.AudiobookAdminStats(f.DB)
	if err != nil {
		t.Fatalf("统计失败: %v", err)
	}
	if stats["edition_count"] != int64(2) || stats["published_count"] != int64(1) {
		t.Fatalf("stats = %+v", stats)
	}
	if stats["active_jobs"] != int64(1) {
		t.Fatalf("active_jobs = %v", stats["active_jobs"])
	}
	if stats["total_size_bytes"] != int64(2048) {
		t.Fatalf("total_size_bytes = %v", stats["total_size_bytes"])
	}
}

func TestAudiobookJobByID(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedJob(t, f.DB, 1, 10, 1, 1, "queued")
	job, err := userdb.AudiobookJobByID(f.DB, 1)
	if err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if job == nil || job.Mode != "full" || job.Status != "queued" {
		t.Fatalf("job = %+v", job)
	}
	missing, err := userdb.AudiobookJobByID(f.DB, 99)
	if err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if missing != nil {
		t.Fatalf("不存在的任务应为 nil")
	}
}

func TestAudiobookChapterByNumber(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	audioSeedChapter(t, f.DB, 100, 1, 3, "第三章")
	c, err := userdb.AudiobookChapterByNumber(f.DB, 1, 3)
	if err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if c == nil || c.Title != "第三章" || c.Number != 3 {
		t.Fatalf("c = %+v", c)
	}
	missing, err := userdb.AudiobookChapterByNumber(f.DB, 1, 99)
	if err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if missing != nil {
		t.Fatalf("不存在的章节应为 nil")
	}
}

func TestPlaybackSessionLifecycle(t *testing.T) {
	f := newAudioFixture(t)
	audioSeedEdition(t, f.DB, 1, 10, "published", "2026-01-05 00:00:00")
	uuid, err := userdb.CreateAudiobookPlaybackSession(f.DB, 1, 1, "web", "dev1", "1.2.3.4", "UA")
	if err != nil {
		t.Fatalf("创建会话失败: %v", err)
	}
	if uuid == "" {
		t.Fatalf("uuid 不应为空")
	}
	if err := userdb.UpdateAudiobookPlaybackSession(f.DB, uuid, 1, 3000, 3000, false, false); err != nil {
		t.Fatalf("更新失败: %v", err)
	}
	if err := userdb.UpdateAudiobookPlaybackSession(f.DB, uuid, 1, 6000, 6000, true, true); err != nil {
		t.Fatalf("关闭失败: %v", err)
	}
	var current, listened int64
	var completed bool
	var endedAt sql.NullString
	if err := f.DB.QueryRow(`SELECT current_ms, listened_ms, completed, ended_at
		FROM audiobook_playback_sessions WHERE uuid = ?`, uuid).
		Scan(&current, &listened, &completed, &endedAt); err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if current != 6000 || listened != 6000 || !completed || !endedAt.Valid {
		t.Fatalf("current=%d listened=%d completed=%v ended=%v", current, listened, completed, endedAt)
	}
}

func TestAudioSourceIP(t *testing.T) {
	f := newAudioFixture(t)
	ctx := pluginCtx(t, f.DB, http.MethodGet, "/", "", 1, false)
	ctx.Request.RemoteAddr = "9.9.9.9:1234"
	if got := audioSourceIP(f.Cfg, ctx); got != "9.9.9.9" {
		t.Fatalf("got %q", got)
	}

	f.Cfg.Settings["PODCAST_TRUSTED_PROXIES"] = []any{"9.9.9.9"}
	ctx.Request.Header.Set("X-Forwarded-For", "8.8.8.8, 7.7.7.7")
	if got := audioSourceIP(f.Cfg, ctx); got != "8.8.8.8" {
		t.Fatalf("got %q", got)
	}

	ctx.Request.Header.Set("X-Forwarded-For", "not-an-ip")
	if got := audioSourceIP(f.Cfg, ctx); got != "9.9.9.9" {
		t.Fatalf("got %q", got)
	}
}

func TestAudioSortEditionsByPublishedDesc(t *testing.T) {
	editions := []*userdb.AudiobookEdition{
		{ID: 1, PublishedAt: "2026-01-01 00:00:00"},
		{ID: 2, PublishedAt: "2026-03-01 00:00:00"},
		{ID: 3, PublishedAt: "2026-02-01 00:00:00"},
	}
	audioSortEditionsByPublishedDesc(editions)
	if editions[0].ID != 2 || editions[2].ID != 1 {
		t.Fatalf("排序错误: %+v", editions)
	}
}
