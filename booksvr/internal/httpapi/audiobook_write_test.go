package httpapi

import (
	"database/sql"
	"net/http"
	"net/http/httptest"
	"testing"

	"talebook/booksvr/internal/userdb"
)

// newAudioWriteFixture 建一个带真实 audioWiring 的夹具。
func newAudioWriteFixture(t *testing.T) (*audioWiring, *sql.DB) {
	t.Helper()
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	createFormatTables(t, db)
	root := t.TempDir()
	w := newAudioWiring(db, db, map[string]any{
		"AUDIOBOOK_ENABLED":        true,
		"AUDIOBOOK_OWNER_GENERATE": false,
	}, root)
	return w, db
}

// newAudioSessionCtx 构造一个带真实 HTTP 请求的上下文（播放会话需要 RemoteAddr/UserAgent）。
func newAudioSessionCtx(userID int64) *Context {
	req := httptest.NewRequest(http.MethodPost, "/api/audio/1/sessions", nil)
	req.RemoteAddr = "127.0.0.1:12345"
	req.Header.Set("User-Agent", "test-agent")
	return &Context{Request: req, Identity: Identity{UserID: userID, IsAdmin: true}}
}

// seedAudioBook 插入一本带 EPUB 的书。
func seedAudioBook(t *testing.T, db *sql.DB, bookID int64, title string) {
	t.Helper()
	insertBook(t, db, bookID, title)
	insertItem(t, db, bookID, "public", 1)
	if _, err := db.Exec(`INSERT INTO data (book, format, uncompressed_size, name)
		VALUES (?, 'EPUB', 0, 'a.epub')`, bookID); err != nil {
		t.Fatalf("写 data 表失败: %v", err)
	}
}

// TestAudioCreateJobSucceeds 覆盖任务创建。
func TestAudioCreateJobSucceeds(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "有声书")

	resp, err := w.audioCreateJob(adminCtx(1), 1, map[string]any{"mode": "quick"})
	if err != nil {
		t.Fatalf("创建失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", resp["err"])
	}
	job, ok := resp["job"].(map[string]any)
	if !ok {
		t.Fatalf("job 类型错误: %T", resp["job"])
	}
	if job["status"] != "queued" {
		t.Errorf("status = %v，期望 queued", job["status"])
	}
}

// TestAudioCreateJobDisabled 覆盖功能未启用。
func TestAudioCreateJobDisabled(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	w := newAudioWiring(db, db, map[string]any{"AUDIOBOOK_ENABLED": false}, t.TempDir())

	resp, err := w.audioCreateJob(adminCtx(1), 1, map[string]any{})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "audiobook.disabled" {
		t.Errorf("err = %v，期望 audiobook.disabled", resp["err"])
	}
}

// TestAudioCreateJobMissingBook 覆盖书籍不存在。
func TestAudioCreateJobMissingBook(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	resp, err := w.audioCreateJob(adminCtx(1), 999, map[string]any{})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "not_found" {
		t.Errorf("err = %v，期望 not_found", resp["err"])
	}
}

// TestAudioCreateJobNoSource 覆盖无 EPUB/TXT 格式。
func TestAudioCreateJobNoSource(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	insertBook(t, db, 1, "无源书")
	insertItem(t, db, 1, "public", 1)

	resp, err := w.audioCreateJob(adminCtx(1), 1, map[string]any{})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "format.not_supported" {
		t.Errorf("err = %v，期望 format.not_supported", resp["err"])
	}
}

// TestAudioCreateJobBadSpeed 覆盖语速校验。
func TestAudioCreateJobBadSpeed(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "书")

	resp, err := w.audioCreateJob(adminCtx(1), 1, map[string]any{"speed": "x9.9"})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "params.invalid" {
		t.Errorf("err = %v，期望 params.invalid", resp["err"])
	}
}

// TestAudioCreateJobBadEngine 覆盖引擎校验。
func TestAudioCreateJobBadEngine(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "书")

	resp, err := w.audioCreateJob(adminCtx(1), 1, map[string]any{"engine": "bogus"})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "params.invalid" {
		t.Errorf("err = %v，期望 params.invalid", resp["err"])
	}
}

// TestAudioCreateJobDeduplicates 覆盖同配置去重。
func TestAudioCreateJobDeduplicates(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "书")

	first, err := w.audioCreateJob(adminCtx(1), 1, map[string]any{"mode": "quick"})
	if err != nil {
		t.Fatalf("首次创建失败: %v", err)
	}
	second, err := w.audioCreateJob(adminCtx(1), 1, map[string]any{"mode": "quick"})
	if err != nil {
		t.Fatalf("二次创建失败: %v", err)
	}
	if second["deduplicated"] != true {
		t.Errorf("deduplicated = %v，期望 true", second["deduplicated"])
	}
	firstJob := first["job"].(map[string]any)
	secondJob := second["job"].(map[string]any)
	if firstJob["id"] != secondJob["id"] {
		t.Errorf("去重后 id 不同: %v vs %v", firstJob["id"], secondJob["id"])
	}
}

// TestAudioJobActionCancel 覆盖取消动作。
func TestAudioJobActionCancel(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "书")
	resp, _ := w.audioCreateJob(adminCtx(1), 1, map[string]any{})
	jobID := resp["job"].(map[string]any)["id"].(int64)

	out, err := w.audioJobAction(adminCtx(1), jobID, "cancel")
	if err != nil {
		t.Fatalf("取消失败: %v", err)
	}
	if out["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", out["err"])
	}

	job, err := userdb.AudiobookJobByID(db, jobID)
	if err != nil {
		t.Fatal(err)
	}
	if !job.CancelRequested {
		t.Error("cancel_requested 未置位")
	}
}

// TestAudioJobActionRetry 覆盖重试动作。
func TestAudioJobActionRetry(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "书")
	resp, _ := w.audioCreateJob(adminCtx(1), 1, map[string]any{})
	jobID := resp["job"].(map[string]any)["id"].(int64)

	out, err := w.audioJobAction(adminCtx(1), jobID, "retry")
	if err != nil {
		t.Fatalf("重试失败: %v", err)
	}
	if out["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", out["err"])
	}
}

// TestAudioJobActionUnknown 覆盖未知动作。
func TestAudioJobActionUnknown(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "书")
	resp, _ := w.audioCreateJob(adminCtx(1), 1, map[string]any{})
	jobID := resp["job"].(map[string]any)["id"].(int64)

	out, err := w.audioJobAction(adminCtx(1), jobID, "bogus")
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if out["err"] != "params.invalid" {
		t.Errorf("err = %v，期望 params.invalid", out["err"])
	}
}

// TestAudioJobActionMissingJob 覆盖任务不存在。
func TestAudioJobActionMissingJob(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	out, err := w.audioJobAction(adminCtx(1), 999, "cancel")
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if out["err"] != "not_found" {
		t.Errorf("err = %v，期望 not_found", out["err"])
	}
}

// TestAudioWorkspaceReads 覆盖工作区读取。
func TestAudioWorkspaceReads(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "书")
	resp, _ := w.audioCreateJob(adminCtx(1), 1, map[string]any{})
	jobID := resp["job"].(map[string]any)["id"].(int64)

	out, err := w.audioWorkspace(adminCtx(1), jobID)
	if err != nil {
		t.Fatalf("读取失败: %v", err)
	}
	if out["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", out["err"])
	}
	if out["plan"] == nil {
		t.Error("plan 为空")
	}
}

// TestAudioWorkspacePatchUpdates 覆盖工作区修改。
func TestAudioWorkspacePatchUpdates(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "书")
	resp, _ := w.audioCreateJob(adminCtx(1), 1, map[string]any{})
	jobID := resp["job"].(map[string]any)["id"].(int64)

	out, err := w.audioWorkspacePatch(adminCtx(1), jobID, map[string]any{"chapter": "第一章"})
	if err != nil {
		t.Fatalf("修改失败: %v", err)
	}
	if out["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", out["err"])
	}

	job, err := userdb.AudiobookJobByID(db, jobID)
	if err != nil {
		t.Fatal(err)
	}
	if job.Data["chapter"] != "第一章" {
		t.Errorf("chapter = %v，期望 第一章", job.Data["chapter"])
	}
}

// TestAudioConfirmJob 覆盖任务确认。
func TestAudioConfirmJob(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "书")
	resp, _ := w.audioCreateJob(adminCtx(1), 1, map[string]any{})
	jobID := resp["job"].(map[string]any)["id"].(int64)

	out, err := w.audioConfirmJob(adminCtx(1), jobID, map[string]any{})
	if err != nil {
		t.Fatalf("确认失败: %v", err)
	}
	if out["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", out["err"])
	}

	job, err := userdb.AudiobookJobByID(db, jobID)
	if err != nil {
		t.Fatal(err)
	}
	if job.Status != "generating" {
		t.Errorf("status = %q，期望 generating", job.Status)
	}
}

// TestAudioCreateRevision 覆盖修订创建。
func TestAudioCreateRevision(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "书")
	resp, _ := w.audioCreateJob(adminCtx(1), 1, map[string]any{})
	job := resp["job"].(map[string]any)
	editionID := job["edition_id"].(int64)

	out, err := w.audioCreateRevision(adminCtx(1), editionID, map[string]any{})
	if err != nil {
		t.Fatalf("创建修订失败: %v", err)
	}
	if out["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", out["err"])
	}
	if out["edition_id"] == editionID {
		t.Error("修订应生成新版本 id")
	}
}

// TestAudioCreateRevisionMissing 覆盖版本不存在。
func TestAudioCreateRevisionMissing(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	out, err := w.audioCreateRevision(adminCtx(1), 999, map[string]any{})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if out["err"] != "not_found" {
		t.Errorf("err = %v，期望 not_found", out["err"])
	}
}

// TestAudioCleanupBackups 覆盖备份清理。
func TestAudioCleanupBackups(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	out, err := w.audioCleanupBackups(adminCtx(1), 1)
	if err != nil {
		t.Fatalf("清理失败: %v", err)
	}
	if out["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", out["err"])
	}
}

// TestAudioCleanupBackupsNonAdmin 覆盖非管理员被拒。
func TestAudioCleanupBackupsNonAdmin(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	ctx := &Context{Identity: Identity{UserID: 2, IsAdmin: false}}
	out, err := w.audioCleanupBackups(ctx, 1)
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if out["err"] != "permission" {
		t.Errorf("err = %v，期望 permission", out["err"])
	}
}

// TestAudioDeleteEdition 覆盖版本删除。
func TestAudioDeleteEdition(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "书")
	resp, _ := w.audioCreateJob(adminCtx(1), 1, map[string]any{})
	editionID := resp["job"].(map[string]any)["edition_id"].(int64)

	out, err := w.audioDeleteEdition(adminCtx(1), editionID)
	if err != nil {
		t.Fatalf("删除失败: %v", err)
	}
	if out["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", out["err"])
	}

	edition, err := userdb.GetAudiobookEdition(db, editionID)
	if err != nil {
		t.Fatal(err)
	}
	if edition != nil {
		t.Error("版本未被删除")
	}
}

// TestAudioDeleteEditionMissing 覆盖版本不存在。
func TestAudioDeleteEditionMissing(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	out, err := w.audioDeleteEdition(adminCtx(1), 999)
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if out["err"] != "not_found" {
		t.Errorf("err = %v，期望 not_found", out["err"])
	}
}

// TestAudioCreateSession 覆盖播放会话创建。
func TestAudioCreateSession(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "书")
	resp, _ := w.audioCreateJob(adminCtx(1), 1, map[string]any{})
	editionID := resp["job"].(map[string]any)["edition_id"].(int64)

	ctx := newAudioSessionCtx(1)
	out, err := w.audioCreateSession(ctx, editionID, map[string]any{"source": "web"})
	if err != nil {
		t.Fatalf("创建会话失败: %v", err)
	}
	if out["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", out["err"])
	}
	if id, _ := out["session_id"].(string); id == "" {
		t.Error("session_id 为空")
	}
}

// TestAudioCreateSessionMissingEdition 覆盖版本不存在。
func TestAudioCreateSessionMissingEdition(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	out, err := w.audioCreateSession(newAudioSessionCtx(1), 999, map[string]any{})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if out["err"] != "not_found" {
		t.Errorf("err = %v，期望 not_found", out["err"])
	}
}

// TestAudioUpdateSession 覆盖会话更新。
func TestAudioUpdateSession(t *testing.T) {
	w, db := newAudioWriteFixture(t)
	seedAudioBook(t, db, 1, "书")
	resp, _ := w.audioCreateJob(adminCtx(1), 1, map[string]any{})
	editionID := resp["job"].(map[string]any)["edition_id"].(int64)

	ctx := newAudioSessionCtx(1)
	created, _ := w.audioCreateSession(ctx, editionID, map[string]any{})
	sessionID := created["session_id"].(string)

	out, err := w.audioUpdateSession(ctx, sessionID, map[string]any{"current_ms": 1000}, false)
	if err != nil {
		t.Fatalf("更新会话失败: %v", err)
	}
	if out["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", out["err"])
	}
}

// TestAudioUpdateSessionEmptyID 覆盖空会话标识。
func TestAudioUpdateSessionEmptyID(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	out, err := w.audioUpdateSession(newAudioSessionCtx(1), "", map[string]any{}, false)
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if out["err"] != "params.invalid" {
		t.Errorf("err = %v，期望 params.invalid", out["err"])
	}
}

// TestAudioSubscriptionLifecycle 覆盖订阅创建/查询/撤销。
func TestAudioSubscriptionLifecycle(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	ctx := adminCtx(1)

	// 初始无订阅。
	got, err := w.audioSubscription(ctx, "GET", nil)
	if err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if got["subscription"] != nil {
		t.Errorf("初始订阅应为 nil，实际 %v", got["subscription"])
	}

	// 创建。
	created, err := w.audioSubscription(ctx, "POST", nil)
	if err != nil {
		t.Fatalf("创建失败: %v", err)
	}
	if created["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", created["err"])
	}
	if token, _ := created["token"].(string); token == "" {
		t.Error("token 为空")
	}

	// 再查应有订阅。
	got, err = w.audioSubscription(ctx, "GET", nil)
	if err != nil {
		t.Fatalf("二次查询失败: %v", err)
	}
	if got["subscription"] == nil {
		t.Fatal("订阅未创建")
	}

	// 撤销。
	revoked, err := w.audioSubscription(ctx, "DELETE", nil)
	if err != nil {
		t.Fatalf("撤销失败: %v", err)
	}
	if revoked["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", revoked["err"])
	}
}

// TestAudioSubscriptionGuestDenied 覆盖游客被拒。
func TestAudioSubscriptionGuestDenied(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	out, err := w.audioSubscription(&Context{Identity: Identity{UserID: 0}}, "GET", nil)
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if out["err"] != "user.need_login" {
		t.Errorf("err = %v，期望 user.need_login", out["err"])
	}
}

// TestAudioSubscriptionUnknownMethod 覆盖未知方法。
func TestAudioSubscriptionUnknownMethod(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	out, err := w.audioSubscription(adminCtx(1), "PUT", nil)
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if out["err"] != "params.invalid" {
		t.Errorf("err = %v，期望 params.invalid", out["err"])
	}
}

// TestValidSpeed 覆盖语速校验。
func TestValidSpeed(t *testing.T) {
	cases := map[string]bool{
		"x1.0": true, "x0.75": true, "x1.5": true,
		"x0.5": false, "x2.0": false, "1.0": false, "xabc": false,
	}
	for in, want := range cases {
		if got := validSpeed(in); got != want {
			t.Errorf("validSpeed(%q) = %v，期望 %v", in, got, want)
		}
	}
}

// TestStableJSONHashDeterministic 覆盖哈希稳定性。
func TestStableJSONHashDeterministic(t *testing.T) {
	a := stableJSONHash(map[string]any{"b": 2, "a": 1})
	b := stableJSONHash(map[string]any{"a": 1, "b": 2})
	if a != b {
		t.Errorf("键序不同导致哈希不同: %s vs %s", a, b)
	}
	if a == "" {
		t.Error("哈希为空")
	}
}

// TestNewJobPlanQuick 覆盖 quick 模式计划。
func TestNewJobPlanQuick(t *testing.T) {
	plan := newJobPlan("quick")
	steps, ok := plan["steps"].([]map[string]any)
	if !ok || len(steps) != 3 {
		t.Fatalf("quick 模式应有 3 步，实际 %v", plan["steps"])
	}
}

// TestNewJobPlanAdvanced 覆盖 advanced 模式计划。
func TestNewJobPlanAdvanced(t *testing.T) {
	plan := newJobPlan("advanced")
	steps, ok := plan["steps"].([]map[string]any)
	if !ok || len(steps) != 4 {
		t.Fatalf("advanced 模式应有 4 步，实际 %v", plan["steps"])
	}
}

// TestPodcastTokenHashStable 覆盖令牌哈希稳定性。
func TestPodcastTokenHashStable(t *testing.T) {
	token := newPodcastToken()
	if token == "" {
		t.Fatal("token 为空")
	}
	if podcastTokenHash(token) != podcastTokenHash(token) {
		t.Error("同一 token 哈希不一致")
	}
}
