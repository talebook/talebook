package httpapi

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"talebook/booksvr/internal/userdb"
)

// TestAudioIsOwnerTrue 覆盖私藏书的书籍所有者判定为真。
func TestAudioIsOwnerTrue(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "书")
	// IsBookOwner 仅对私藏书按 collector_id 判定。
	if _, err := db.Exec(`UPDATE items SET scope = 'private', collector_id = 1 WHERE book_id = 1`); err != nil {
		t.Fatal(err)
	}
	if !w.isOwner(adminCtx(1), 1) {
		t.Error("读者 1 应为私藏书所有者")
	}
}

// TestAudioIsOwnerFalse 覆盖私藏书的非所有者。
func TestAudioIsOwnerFalse(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "书")
	if _, err := db.Exec(`UPDATE items SET scope = 'private', collector_id = 1 WHERE book_id = 1`); err != nil {
		t.Fatal(err)
	}
	if w.isOwner(adminCtx(99), 1) {
		t.Error("读者 99 不应为私藏书所有者")
	}
}

// TestAudioTimelineReadsFile 覆盖时间轴文件读取。
func TestAudioTimelineReadsFile(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "书")

	// 建版本 + 章节，并写入时间轴文件。
	editionID, err := userdb.CreateAudiobookEdition(db, 1, "published", "edgetts", nil, 1)
	if err != nil {
		t.Fatal(err)
	}
	tlPath := filepath.Join(t.TempDir(), "tl.json")
	body, _ := json.Marshal([]map[string]any{{"start": 0, "end": 1000, "text": "第一句"}})
	if err := os.WriteFile(tlPath, body, 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO audiobook_chapters
		(edition_id, source_key, number, title, audio_path, timeline_path, duration_ms)
		VALUES (?, 'k', 1, '第一章', '/tmp/a.mp3', ?, 1000)`, editionID, tlPath); err != nil {
		t.Fatal(err)
	}

	out, err := w.audioTimeline(adminCtx(1), editionID, 1)
	if err != nil {
		t.Fatalf("读取时间轴失败: %v", err)
	}
	if out["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", out["err"])
	}
	tl, ok := out["timeline"].([]any)
	if !ok || len(tl) != 1 {
		t.Fatalf("timeline = %v，期望 1 项", out["timeline"])
	}
	if out["duration"] != int64(1000) {
		t.Errorf("duration = %v，期望 1000", out["duration"])
	}
}

// TestAudioTimelineBadJSON 覆盖时间轴文件损坏时回落空列表。
func TestAudioTimelineBadJSON(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "书")

	editionID, err := userdb.CreateAudiobookEdition(db, 1, "published", "edgetts", nil, 1)
	if err != nil {
		t.Fatal(err)
	}
	tlPath := filepath.Join(t.TempDir(), "bad.json")
	if err := os.WriteFile(tlPath, []byte("not json"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO audiobook_chapters
		(edition_id, source_key, number, title, audio_path, timeline_path, duration_ms)
		VALUES (?, 'k', 1, '第一章', '/tmp/a.mp3', ?, 0)`, editionID, tlPath); err != nil {
		t.Fatal(err)
	}

	out, err := w.audioTimeline(adminCtx(1), editionID, 1)
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if tl, ok := out["timeline"].([]any); !ok || len(tl) != 0 {
		t.Errorf("timeline = %v，期望空列表", out["timeline"])
	}
}

// TestAudioAuditFreezeUnfreeze 覆盖订阅冻结与解冻。
func TestAudioAuditFreezeUnfreeze(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	ctx := adminCtx(1)

	// 先建订阅。
	if _, err := w.audioSubscription(ctx, "POST", nil); err != nil {
		t.Fatalf("创建订阅失败: %v", err)
	}

	// 冻结。
	frozen, err := w.audioAudit(ctx, "PATCH", map[string]any{
		"reader_id": int64(1), "frozen": true, "reason": "滥用",
	})
	if err != nil {
		t.Fatalf("冻结失败: %v", err)
	}
	if frozen["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", frozen["err"])
	}

	sub, err := userdb.GetPodcastSubscriptionByReader(w.db, 1)
	if err != nil {
		t.Fatal(err)
	}
	if sub == nil || sub.FrozenReason != "滥用" {
		t.Errorf("冻结未生效: %+v", sub)
	}

	// 解冻。
	unfrozen, err := w.audioAudit(ctx, "PATCH", map[string]any{
		"reader_id": int64(1), "frozen": false,
	})
	if err != nil {
		t.Fatalf("解冻失败: %v", err)
	}
	if unfrozen["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", unfrozen["err"])
	}

	sub, err = userdb.GetPodcastSubscriptionByReader(w.db, 1)
	if err != nil {
		t.Fatal(err)
	}
	if sub == nil || sub.FrozenReason != "" {
		t.Errorf("解冻未生效: %+v", sub)
	}
}

// TestAudioAuditFreezeMissingSubscription 覆盖冻结不存在的订阅。
func TestAudioAuditFreezeMissingSubscription(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	out, err := w.audioAudit(adminCtx(1), "PATCH", map[string]any{
		"reader_id": int64(999), "frozen": true,
	})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if out["err"] != "not_found" {
		t.Errorf("err = %v，期望 not_found", out["err"])
	}
}

// TestAudioSubscriptionPatch 覆盖订阅 PATCH 分支。
func TestAudioSubscriptionPatch(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	ctx := adminCtx(1)
	if _, err := w.audioSubscription(ctx, "POST", nil); err != nil {
		t.Fatalf("创建订阅失败: %v", err)
	}

	out, err := w.audioSubscription(ctx, "PATCH", map[string]any{})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if out["err"] != "ok" {
		t.Errorf("err = %v，期望 ok", out["err"])
	}
}

// TestAudioSubscriptionPatchMissing 覆盖无订阅时 PATCH。
func TestAudioSubscriptionPatchMissing(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	out, err := w.audioSubscription(adminCtx(1), "PATCH", map[string]any{})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if out["err"] != "not_found" {
		t.Errorf("err = %v，期望 not_found", out["err"])
	}
}

// TestAudioSubscriptionDeleteMissing 覆盖无订阅时撤销。
func TestAudioSubscriptionDeleteMissing(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	out, err := w.audioSubscription(adminCtx(1), "DELETE", nil)
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if out["err"] != "not_found" {
		t.Errorf("err = %v，期望 not_found", out["err"])
	}
}

// TestAudioJobActionPauseResume 覆盖暂停与恢复。
func TestAudioJobActionPauseResume(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "书")
	resp, _ := w.audioCreateJob(adminCtx(1), 1, map[string]any{})
	jobID := resp["job"].(map[string]any)["id"].(int64)

	paused, err := w.audioJobAction(adminCtx(1), jobID, "pause")
	if err != nil {
		t.Fatalf("暂停失败: %v", err)
	}
	if paused["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", paused["err"])
	}
	job, _ := userdb.AudiobookJobByID(db, jobID)
	if job.Status != "paused" {
		t.Errorf("status = %q，期望 paused", job.Status)
	}

	resumed, err := w.audioJobAction(adminCtx(1), jobID, "resume")
	if err != nil {
		t.Fatalf("恢复失败: %v", err)
	}
	if resumed["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", resumed["err"])
	}
	job, _ = userdb.AudiobookJobByID(db, jobID)
	if job.Status != "queued" {
		t.Errorf("status = %q，期望 queued", job.Status)
	}
}

// TestAudioJobActionPermissionDenied 覆盖非创建者被拒。
func TestAudioJobActionPermissionDenied(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "书")
	resp, _ := w.audioCreateJob(adminCtx(1), 1, map[string]any{})
	jobID := resp["job"].(map[string]any)["id"].(int64)

	ctx := &Context{Identity: Identity{UserID: 99, IsAdmin: false}}
	out, err := w.audioJobAction(ctx, jobID, "cancel")
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if out["err"] != "permission" {
		t.Errorf("err = %v，期望 permission", out["err"])
	}
}

// TestAudioWorkspacePermissionDenied 覆盖工作区非创建者被拒。
func TestAudioWorkspacePermissionDenied(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "书")
	resp, _ := w.audioCreateJob(adminCtx(1), 1, map[string]any{})
	jobID := resp["job"].(map[string]any)["id"].(int64)

	ctx := &Context{Identity: Identity{UserID: 99, IsAdmin: false}}
	out, err := w.audioWorkspace(ctx, jobID)
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if out["err"] != "permission" {
		t.Errorf("err = %v，期望 permission", out["err"])
	}
}

// TestAudioConfirmJobBadState 覆盖状态不允许确认。
func TestAudioConfirmJobBadState(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "书")
	resp, _ := w.audioCreateJob(adminCtx(1), 1, map[string]any{})
	jobID := resp["job"].(map[string]any)["id"].(int64)

	// 先确认一次（转 generating），再确认应被拒。
	if _, err := w.audioConfirmJob(adminCtx(1), jobID, map[string]any{}); err != nil {
		t.Fatal(err)
	}
	out, err := w.audioConfirmJob(adminCtx(1), jobID, map[string]any{})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if out["err"] != "job.invalid_state" {
		t.Errorf("err = %v，期望 job.invalid_state", out["err"])
	}
}

// TestAudioCreateJobComicRejected 覆盖漫画书被拒。
func TestAudioCreateJobComicRejected(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "漫画")
	if _, err := db.Exec(`UPDATE items SET media_type = 'comic' WHERE book_id = 1`); err != nil {
		t.Fatal(err)
	}

	resp, err := w.audioCreateJob(adminCtx(1), 1, map[string]any{})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "media_type.not_supported" {
		t.Errorf("err = %v，期望 media_type.not_supported", resp["err"])
	}
}

// TestAudioCreateJobOwnerAllowed 覆盖所有者获准生成。
func TestAudioCreateJobOwnerAllowed(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	createFormatTables(t, db)
	w := newAudioWiring(db, db, map[string]any{
		"AUDIOBOOK_ENABLED":        true,
		"AUDIOBOOK_OWNER_GENERATE": true,
	}, t.TempDir())
	seedAudioBook(t, db, 1, "书")
	// IsBookOwner 仅对私藏书按 collector_id 判定。
	if _, err := db.Exec(`UPDATE items SET scope = 'private', collector_id = 1 WHERE book_id = 1`); err != nil {
		t.Fatal(err)
	}

	ctx := &Context{Identity: Identity{UserID: 1, IsAdmin: false}}
	resp, err := w.audioCreateJob(ctx, 1, map[string]any{})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "ok" {
		t.Errorf("err = %v，期望 ok（所有者获准）", resp["err"])
	}
}

// TestAudioCreateJobNonOwnerDenied 覆盖非所有者被拒。
func TestAudioCreateJobNonOwnerDenied(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "书")

	ctx := &Context{Identity: Identity{UserID: 99, IsAdmin: false}}
	resp, err := w.audioCreateJob(ctx, 1, map[string]any{})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "permission" {
		t.Errorf("err = %v，期望 permission", resp["err"])
	}
}

// TestAudioCreateJobBadQuality 覆盖非标准音质被拒。
func TestAudioCreateJobBadQuality(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "书")

	resp, err := w.audioCreateJob(adminCtx(1), 1, map[string]any{"quality": "hires"})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "params.invalid" {
		t.Errorf("err = %v，期望 params.invalid", resp["err"])
	}
}

// TestAudioCreateJobTooManyVoices 覆盖主角音色超限。
func TestAudioCreateJobTooManyVoices(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "书")

	voices := map[string]any{}
	for i := 0; i < 101; i++ {
		voices[string(rune('a'+i%26))+string(rune('0'+i%10))+string(rune('0'+i/10))] = "v"
	}
	resp, err := w.audioCreateJob(adminCtx(1), 1, map[string]any{"protagonist_voices": voices})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "params.invalid" {
		t.Errorf("err = %v，期望 params.invalid", resp["err"])
	}
}

// TestAudioCreateSessionPermissionDenied 覆盖无权查看时创建会话被拒。
func TestAudioCreateSessionPermissionDenied(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "书")
	resp, _ := w.audioCreateJob(adminCtx(1), 1, map[string]any{})
	editionID := resp["job"].(map[string]any)["edition_id"].(int64)

	// 把书设为私有且属于他人。
	if _, err := db.Exec(`UPDATE items SET scope = 'private', collector_id = 1 WHERE book_id = 1`); err != nil {
		t.Fatal(err)
	}
	ctx := newAudioSessionCtx(99)
	ctx.Identity.IsAdmin = false

	out, err := w.audioCreateSession(ctx, editionID, map[string]any{})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if out["err"] != "permission" {
		t.Errorf("err = %v，期望 permission", out["err"])
	}
}

// TestAudioUpdateSessionMissing 覆盖会话不存在。
func TestAudioUpdateSessionMissing(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	out, err := w.audioUpdateSession(newAudioSessionCtx(1), "deadbeef", map[string]any{}, false)
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if out["err"] != "not_found" {
		t.Errorf("err = %v，期望 not_found", out["err"])
	}
}

// TestAudioCleanupBackupsRemovesFiles 覆盖备份文件实际删除。
func TestAudioCleanupBackupsRemovesFiles(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	dir := filepath.Join(w.root, "backups", "1")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "b1.zip"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}

	out, err := w.audioCleanupBackups(adminCtx(1), 1)
	if err != nil {
		t.Fatalf("清理失败: %v", err)
	}
	if out["removed"] != 1 {
		t.Errorf("removed = %v，期望 1", out["removed"])
	}
}

// TestAudioCreateRevisionPermissionDenied 覆盖非创建者被拒。
func TestAudioCreateRevisionPermissionDenied(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "书")
	resp, _ := w.audioCreateJob(adminCtx(1), 1, map[string]any{})
	editionID := resp["job"].(map[string]any)["edition_id"].(int64)

	ctx := &Context{Identity: Identity{UserID: 99, IsAdmin: false}}
	out, err := w.audioCreateRevision(ctx, editionID, map[string]any{})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if out["err"] != "permission" {
		t.Errorf("err = %v，期望 permission", out["err"])
	}
}

// TestAudioDeleteEditionPermissionDenied 覆盖非创建者被拒。
func TestAudioDeleteEditionPermissionDenied(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "书")
	resp, _ := w.audioCreateJob(adminCtx(1), 1, map[string]any{})
	editionID := resp["job"].(map[string]any)["edition_id"].(int64)

	ctx := &Context{Identity: Identity{UserID: 99, IsAdmin: false}}
	out, err := w.audioDeleteEdition(ctx, editionID)
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if out["err"] != "permission" {
		t.Errorf("err = %v，期望 permission", out["err"])
	}
}

// TestAudioWorkspacePatchPermissionDenied 覆盖工作区修改非创建者被拒。
func TestAudioWorkspacePatchPermissionDenied(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "书")
	resp, _ := w.audioCreateJob(adminCtx(1), 1, map[string]any{})
	jobID := resp["job"].(map[string]any)["id"].(int64)

	ctx := &Context{Identity: Identity{UserID: 99, IsAdmin: false}}
	out, err := w.audioWorkspacePatch(ctx, jobID, map[string]any{"chapter": "x"})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if out["err"] != "permission" {
		t.Errorf("err = %v，期望 permission", out["err"])
	}
}

// TestAudioConfirmJobPermissionDenied 覆盖确认非创建者被拒。
func TestAudioConfirmJobPermissionDenied(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "书")
	resp, _ := w.audioCreateJob(adminCtx(1), 1, map[string]any{})
	jobID := resp["job"].(map[string]any)["id"].(int64)

	ctx := &Context{Identity: Identity{UserID: 99, IsAdmin: false}}
	out, err := w.audioConfirmJob(ctx, jobID, map[string]any{})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if out["err"] != "permission" {
		t.Errorf("err = %v，期望 permission", out["err"])
	}
}

// TestAudioWorkspaceMissingJob 覆盖工作区任务不存在。
func TestAudioWorkspaceMissingJob(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	out, err := w.audioWorkspace(adminCtx(1), 999)
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if out["err"] != "not_found" {
		t.Errorf("err = %v，期望 not_found", out["err"])
	}
}

// TestAudioWorkspacePatchMissingJob 覆盖工作区修改任务不存在。
func TestAudioWorkspacePatchMissingJob(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	out, err := w.audioWorkspacePatch(adminCtx(1), 999, map[string]any{})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if out["err"] != "not_found" {
		t.Errorf("err = %v，期望 not_found", out["err"])
	}
}

// TestAudioConfirmJobMissing 覆盖确认任务不存在。
func TestAudioConfirmJobMissing(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	out, err := w.audioConfirmJob(adminCtx(1), 999, map[string]any{})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if out["err"] != "not_found" {
		t.Errorf("err = %v，期望 not_found", out["err"])
	}
}

// TestAudioCreateJobVoicesTooLong 覆盖音色值超长。
func TestAudioCreateJobVoicesTooLong(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "书")

	long := make([]byte, 501)
	for i := range long {
		long[i] = 'a'
	}
	resp, err := w.audioCreateJob(adminCtx(1), 1, map[string]any{
		"protagonist_voices": map[string]any{"主角": string(long)},
	})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "params.invalid" {
		t.Errorf("err = %v，期望 params.invalid", resp["err"])
	}
}
