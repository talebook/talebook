package httpapi

import (
	"database/sql"
	"encoding/json"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"
)

// upFixture 是一次升级模块测试的完整环境。
type upFixture struct {
	DB  *sql.DB
	Cfg UpgradeConfig
}

// newUpFixture 建库并返回配置。
func newUpFixture(t *testing.T) *upFixture {
	t.Helper()
	db := netSchemaDB(t)
	cfg := UpgradeConfig{
		DB: db,
		Settings: map[string]any{
			"user_database":             "sqlite:////data/books/calibre-webserver.db",
			"with_library":              "/data/books/library",
			"import_auto_watch_enabled": false,
			"installed":                 true,
		},
		Version: "1.0.0",
	}
	return &upFixture{DB: db, Cfg: cfg}
}

// ---- AdminUpgrade ----

func TestUpgradeRouteSpecs(t *testing.T) {
	specs := UpgradeRouteSpecs(UpgradeConfig{})
	if len(specs) != 2 {
		t.Fatalf("len = %d, want 2", len(specs))
	}
	if !specs[0].Auth || !specs[0].Admin {
		t.Error("/api/admin/upgrade 应要求管理员")
	}
	if specs[1].Auth || specs[1].Admin {
		t.Error("/api/upgrade/health 不应要求登录")
	}
}

func TestAdminUpgradeGetStatus(t *testing.T) {
	fx := newUpFixture(t)
	fx.Cfg.RequestExecutor = func(action string, release, keep any) map[string]any {
		if action != "status" {
			t.Errorf("action = %q", action)
		}
		return map[string]any{"err": "ok", "status": map[string]any{"phase": "idle"}}
	}
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/upgrade", "", 1, true)
	got, err := AdminUpgradeHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminUpgradePostRequiresHeader(t *testing.T) {
	fx := newUpFixture(t)
	fx.Cfg.RequestExecutor = func(string, any, any) map[string]any {
		t.Error("不应调用执行器")
		return nil
	}
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/upgrade", `{"action":"check"}`, 1, true)
	got, err := AdminUpgradeHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "origin" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminUpgradePostRequiresJSONContentType(t *testing.T) {
	fx := newUpFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/upgrade", `{"action":"check"}`, 1, true)
	ctx.Request.Header.Set("X-Talebook-Upgrade", "1")
	ctx.Request.Header.Set("Content-Type", "text/plain")
	got, err := AdminUpgradeHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "origin" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminUpgradePostCrossOrigin(t *testing.T) {
	fx := newUpFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/upgrade", `{"action":"check"}`, 1, true)
	ctx.Request.Header.Set("X-Talebook-Upgrade", "1")
	ctx.Request.Header.Set("Content-Type", "application/json")
	ctx.Request.Header.Set("Origin", "https://evil.example.com")
	ctx.Request.Host = "talebook.example.com"
	got, err := AdminUpgradeHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "origin" {
		t.Errorf("跨源应被拒绝: %v", got["err"])
	}
}

func TestAdminUpgradePostSameOrigin(t *testing.T) {
	fx := newUpFixture(t)
	fx.Cfg.RequestExecutor = func(action string, release, keep any) map[string]any {
		return map[string]any{"err": "ok", "action": action}
	}
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/upgrade", `{"action":"check"}`, 1, true)
	ctx.Request.Header.Set("X-Talebook-Upgrade", "1")
	ctx.Request.Header.Set("Content-Type", "application/json")
	ctx.Request.Header.Set("Origin", "https://talebook.example.com")
	ctx.Request.Host = "talebook.example.com"
	got, err := AdminUpgradeHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Errorf("同源应通过: %v", got)
	}
}

func TestAdminUpgradePostCrossSiteFetch(t *testing.T) {
	fx := newUpFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/upgrade", `{"action":"check"}`, 1, true)
	ctx.Request.Header.Set("X-Talebook-Upgrade", "1")
	ctx.Request.Header.Set("Content-Type", "application/json")
	ctx.Request.Header.Set("Sec-Fetch-Site", "cross-site")
	got, err := AdminUpgradeHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "origin" {
		t.Errorf("cross-site 应被拒绝: %v", got["err"])
	}
}

func TestAdminUpgradePostBadJSON(t *testing.T) {
	fx := newUpFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/upgrade", `{bad`, 1, true)
	ctx.Request.Header.Set("X-Talebook-Upgrade", "1")
	ctx.Request.Header.Set("Content-Type", "application/json")
	got, err := AdminUpgradeHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "params" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminUpgradePostBadAction(t *testing.T) {
	fx := newUpFixture(t)
	for _, body := range []string{`{"action":"rm -rf"}`, `{}`, `{"action":123}`} {
		ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/upgrade", body, 1, true)
		ctx.Request.Header.Set("X-Talebook-Upgrade", "1")
		ctx.Request.Header.Set("Content-Type", "application/json")
		got, err := AdminUpgradeHandler(fx.Cfg)(ctx)
		if err != nil {
			t.Fatalf("handler: %v", err)
		}
		if got["err"] != "params" {
			t.Errorf("%s → err = %v", body, got["err"])
		}
	}
}

func TestAdminUpgradePostRetention(t *testing.T) {
	fx := newUpFixture(t)
	var gotKeep any
	fx.Cfg.RequestExecutor = func(action string, release, keep any) map[string]any {
		if action != "retention" {
			t.Errorf("action = %q", action)
		}
		gotKeep = keep
		return map[string]any{"err": "ok"}
	}
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/upgrade",
		`{"action":"retention","keep":3}`, 1, true)
	ctx.Request.Header.Set("X-Talebook-Upgrade", "1")
	ctx.Request.Header.Set("Content-Type", "application/json")
	if _, err := AdminUpgradeHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if gotKeep != float64(3) {
		t.Errorf("keep = %v", gotKeep)
	}
}

func TestAdminUpgradePostInstallPassesRelease(t *testing.T) {
	fx := newUpFixture(t)
	var gotRelease any
	fx.Cfg.RequestExecutor = func(action string, release, keep any) map[string]any {
		gotRelease = release
		return map[string]any{"err": "ok"}
	}
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/upgrade",
		`{"action":"install","release":"v2.0.0"}`, 1, true)
	ctx.Request.Header.Set("X-Talebook-Upgrade", "1")
	ctx.Request.Header.Set("Content-Type", "application/json")
	if _, err := AdminUpgradeHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if gotRelease != "v2.0.0" {
		t.Errorf("release = %v", gotRelease)
	}
}

// ---- requestUpgradeExecutor（真实 Unix socket）----

func TestRequestUpgradeExecutorSuccess(t *testing.T) {
	dir := t.TempDir()
	sock := filepath.Join(dir, "control.sock")
	ln, err := net.Listen("unix", sock)
	if err != nil {
		t.Skipf("当前环境不支持 Unix socket: %v", err)
	}
	defer func() { _ = ln.Close() }()

	go func() {
		conn, err := ln.Accept()
		if err != nil {
			return
		}
		defer func() { _ = conn.Close() }()
		buf := make([]byte, 4096)
		n, _ := conn.Read(buf)
		var req map[string]any
		_ = json.Unmarshal(buf[:n], &req)
		resp, _ := json.Marshal(map[string]any{"err": "ok", "echo": req["action"]})
		_, _ = conn.Write(append(resp, '\n'))
	}()

	cfg := UpgradeConfig{SocketPath: sock}
	got := requestUpgradeExecutor(cfg, "check", nil, nil)
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	if got["echo"] != "check" {
		t.Errorf("echo = %v", got["echo"])
	}
}

func TestRequestUpgradeExecutorSocketMissing(t *testing.T) {
	cfg := UpgradeConfig{SocketPath: filepath.Join(t.TempDir(), "nope.sock")}
	got := requestUpgradeExecutor(cfg, "check", nil, nil)
	if got["err"] != "loader" {
		t.Errorf("err = %v", got["err"])
	}
	status, _ := got["status"].(map[string]any)
	if status["disabled"] != "loader" || status["phase"] != "idle" {
		t.Errorf("status = %v", status)
	}
}

func TestRequestUpgradeExecutorModeReason(t *testing.T) {
	cfg := UpgradeConfig{
		SocketPath:  filepath.Join(t.TempDir(), "nope.sock"),
		UpgradeMode: "ssr",
	}
	got := requestUpgradeExecutor(cfg, "check", nil, nil)
	if got["err"] != "mode" {
		t.Errorf("ssr 模式 err = %v", got["err"])
	}
	cfg.UpgradeMode = "dev"
	if got := requestUpgradeExecutor(cfg, "check", nil, nil); got["err"] != "mode" {
		t.Errorf("dev 模式 err = %v", got["err"])
	}
}

func TestRequestUpgradeExecutorBadResponse(t *testing.T) {
	dir := t.TempDir()
	sock := filepath.Join(dir, "control.sock")
	ln, err := net.Listen("unix", sock)
	if err != nil {
		t.Skipf("当前环境不支持 Unix socket: %v", err)
	}
	defer func() { _ = ln.Close() }()

	go func() {
		conn, err := ln.Accept()
		if err != nil {
			return
		}
		defer func() { _ = conn.Close() }()
		buf := make([]byte, 4096)
		_, _ = conn.Read(buf)
		_, _ = conn.Write([]byte("not json\n"))
	}()

	cfg := UpgradeConfig{SocketPath: sock}
	got := requestUpgradeExecutor(cfg, "check", nil, nil)
	if got["err"] != "loader" {
		t.Errorf("非法响应应回退 loader: %v", got["err"])
	}
}

// TestAdminUpgradeRequestCounter 覆盖进行中计数在调用期间递增。
func TestAdminUpgradeRequestCounter(t *testing.T) {
	fx := newUpFixture(t)
	var during int64
	fx.Cfg.RequestExecutor = func(string, any, any) map[string]any {
		during = atomic.LoadInt64(&upgradeRequests)
		return map[string]any{"err": "ok"}
	}
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/upgrade", "", 1, true)
	if _, err := AdminUpgradeHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if during != 1 {
		t.Errorf("调用期间计数 = %d, want 1", during)
	}
	if after := atomic.LoadInt64(&upgradeRequests); after != 0 {
		t.Errorf("调用后计数 = %d, want 0", after)
	}
}

// TestUpgradeHealthBusyDuringRequest 覆盖进行中请求使 busy 为真。
func TestUpgradeHealthBusyDuringRequest(t *testing.T) {
	fx := newUpFixture(t)
	atomic.AddInt64(&upgradeRequests, 1)
	defer atomic.AddInt64(&upgradeRequests, -1)

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/upgrade/health", "", 0, false)
	ctx.Request.RemoteAddr = "127.0.0.1:1234"
	got, err := UpgradeHealthHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["busy"] != true {
		t.Errorf("进行中请求应 busy: %v", got["busy"])
	}
}

// TestUpgradeDurableBusyNilDB 覆盖无数据库时返回 false。
func TestUpgradeDurableBusyNilDB(t *testing.T) {
	busy, err := upgradeDurableBusy(nil)
	if err != nil || busy {
		t.Errorf("busy = %v, err = %v", busy, err)
	}
}

// TestUpgradeDurableBusyMissingTables 覆盖表不存在时报错。
func TestUpgradeDurableBusyMissingTables(t *testing.T) {
	db := netSchemaDB(t)
	if _, err := db.Exec(`DROP TABLE audiobook_jobs`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	if _, err := upgradeDurableBusy(db); err == nil {
		t.Error("表不存在应报错")
	}
}

// TestAdminUpgradeSameOriginBadOriginURL 覆盖 Origin 非法 URL。
func TestAdminUpgradeSameOriginBadOriginURL(t *testing.T) {
	fx := newUpFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/upgrade", `{"action":"check"}`, 1, true)
	ctx.Request.Header.Set("X-Talebook-Upgrade", "1")
	ctx.Request.Header.Set("Content-Type", "application/json")
	ctx.Request.Header.Set("Origin", "http://[::1") // 非法 URL
	got, err := AdminUpgradeHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "origin" {
		t.Errorf("非法 Origin 应被拒绝: %v", got["err"])
	}
}

// TestAdminUpgradeSameOriginHostFunc 覆盖 Host 注入函数。
func TestAdminUpgradeSameOriginHostFunc(t *testing.T) {
	fx := newUpFixture(t)
	fx.Cfg.Host = func(*Context) string { return "injected.example.com" }
	fx.Cfg.RequestExecutor = func(string, any, any) map[string]any {
		return map[string]any{"err": "ok"}
	}
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/admin/upgrade", `{"action":"check"}`, 1, true)
	ctx.Request.Header.Set("X-Talebook-Upgrade", "1")
	ctx.Request.Header.Set("Content-Type", "application/json")
	ctx.Request.Header.Set("Origin", "https://injected.example.com")
	got, err := AdminUpgradeHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Errorf("注入 Host 应匹配: %v", got)
	}
}

func TestIndexByte(t *testing.T) {
	if got := indexByte([]byte("ab\nc"), '\n'); got != 2 {
		t.Errorf("got = %d", got)
	}
	if got := indexByte([]byte("abc"), '\n'); got != -1 {
		t.Errorf("got = %d", got)
	}
}

// ---- UpgradeHealth ----

func TestUpgradeHealthLoopbackOnly(t *testing.T) {
	fx := newUpFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/upgrade/health", "", 0, false)
	ctx.Request.RemoteAddr = "10.0.0.1:1234"
	if _, err := UpgradeHealthHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Errorf("非回环应 404，得到 %d", pluginRecorder(ctx).Code)
	}
}

func TestUpgradeHealthRejectsForwardedFor(t *testing.T) {
	fx := newUpFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/upgrade/health", "", 0, false)
	ctx.Request.RemoteAddr = "127.0.0.1:1234"
	ctx.Request.Header.Set("X-Forwarded-For", "1.2.3.4")
	if _, err := UpgradeHealthHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if pluginRecorder(ctx).Code != http.StatusNotFound {
		t.Errorf("带 XFF 应 404，得到 %d", pluginRecorder(ctx).Code)
	}
}

func TestUpgradeHealthOK(t *testing.T) {
	fx := newUpFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/upgrade/health", "", 0, false)
	ctx.Request.RemoteAddr = "127.0.0.1:1234"
	got, err := UpgradeHealthHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	if got["supported"] != true {
		t.Errorf("supported = %v", got["supported"])
	}
	if got["busy"] != false {
		t.Errorf("busy = %v", got["busy"])
	}
	if got["version"] != "1.0.0" {
		t.Errorf("version = %v", got["version"])
	}
}

func TestUpgradeHealthUnsupportedLayout(t *testing.T) {
	cases := []map[string]any{
		{"user_database": "postgres://x", "with_library": "/data/books/library", "installed": true},
		{"user_database": "sqlite:////data/books/calibre-webserver.db", "with_library": "/other", "installed": true},
		{"user_database": "sqlite:////data/books/calibre-webserver.db", "with_library": "/data/books/library", "installed": false},
		{"user_database": "sqlite:////data/books/calibre-webserver.db", "with_library": "/data/books/library", "installed": true, "import_auto_watch_enabled": true},
	}
	for i, settings := range cases {
		fx := newUpFixture(t)
		fx.Cfg.Settings = settings
		ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/upgrade/health", "", 0, false)
		ctx.Request.RemoteAddr = "127.0.0.1:1234"
		got, err := UpgradeHealthHandler(fx.Cfg)(ctx)
		if err != nil {
			t.Fatalf("case %d: %v", i, err)
		}
		if got["supported"] != false {
			t.Errorf("case %d 应不支持: %v", i, got["supported"])
		}
	}
}

func TestUpgradeHealthTrailingSlashLibrary(t *testing.T) {
	fx := newUpFixture(t)
	fx.Cfg.Settings["with_library"] = "/data/books/library/"
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/upgrade/health", "", 0, false)
	ctx.Request.RemoteAddr = "127.0.0.1:1234"
	got, err := UpgradeHealthHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["supported"] != true {
		t.Error("尾部斜杠应被容忍")
	}
}

func TestUpgradeHealthBusyAudiobook(t *testing.T) {
	fx := newUpFixture(t)
	if _, err := fx.DB.Exec(`INSERT INTO audiobook_jobs
		(id, book_id, edition_id, creator_id, mode, status, priority, last_event_seq, create_time, update_time)
		VALUES (1, 1, 1, 1, 'full', 'generating', 0, 0, '2026-01-01 00:00:00', '2026-01-01 00:00:00')`); err != nil {
		t.Fatalf("插入任务失败: %v", err)
	}
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/upgrade/health", "", 0, false)
	ctx.Request.RemoteAddr = "127.0.0.1:1234"
	got, err := UpgradeHealthHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["busy"] != true {
		t.Errorf("有生成中任务应 busy: %v", got["busy"])
	}
}

func TestUpgradeHealthBusyPluginRun(t *testing.T) {
	fx := newUpFixture(t)
	if _, err := fx.DB.Exec(`INSERT INTO plugin_runs
		(id, connection_id, action, "trigger", status, requested_by, attempt, duration_ms, create_time)
		VALUES (1, 1, 'sync', 'manual', 'running', 1, 1, 0, '2026-01-01 00:00:00')`); err != nil {
		t.Fatalf("插入运行失败: %v", err)
	}
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/upgrade/health", "", 0, false)
	ctx.Request.RemoteAddr = "127.0.0.1:1234"
	got, err := UpgradeHealthHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["busy"] != true {
		t.Errorf("有运行中插件应 busy: %v", got["busy"])
	}
}

func TestUpgradeHealthAsyncBusy(t *testing.T) {
	fx := newUpFixture(t)
	fx.Cfg.AsyncBusy = func() bool { return true }
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/upgrade/health", "", 0, false)
	ctx.Request.RemoteAddr = "127.0.0.1:1234"
	got, err := UpgradeHealthHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["busy"] != true {
		t.Errorf("异步忙应 busy: %v", got["busy"])
	}
}

func TestUpgradeHealthFinishedJobsNotBusy(t *testing.T) {
	fx := newUpFixture(t)
	if _, err := fx.DB.Exec(`INSERT INTO audiobook_jobs
		(id, book_id, edition_id, creator_id, mode, status, priority, last_event_seq, create_time, update_time)
		VALUES (1, 1, 1, 1, 'full', 'done', 0, 0, '2026-01-01 00:00:00', '2026-01-01 00:00:00')`); err != nil {
		t.Fatalf("插入任务失败: %v", err)
	}
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/upgrade/health", "", 0, false)
	ctx.Request.RemoteAddr = "127.0.0.1:1234"
	got, err := UpgradeHealthHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["busy"] != false {
		t.Errorf("已完成任务不应 busy: %v", got["busy"])
	}
}

func TestUpgradeModeFromEnv(t *testing.T) {
	t.Setenv("TALEBOOK_UPGRADE_MODE", "ssr")
	if got := UpgradeModeFromEnv(); got != "ssr" {
		t.Errorf("got = %q", got)
	}
	_ = os.Unsetenv("TALEBOOK_UPGRADE_MODE")
}

// ---- 社交登录 ----

func TestSocialRouteSpecs(t *testing.T) {
	specs := SocialRouteSpecs(SocialConfig{})
	if len(specs) != 4 {
		t.Fatalf("len = %d, want 4", len(specs))
	}
}

func TestSocialDemoModeBlocked(t *testing.T) {
	cfg := SocialConfig{Auth: AuthConfig{Demo: DemoModeConfig{Enabled: true}}}
	ctx := pluginCtx(t, nil, http.MethodGet, "/auth/login/github", "", 0, false)
	ctx.Params = []string{"github"}
	got, err := socialHandler(cfg, "begin")(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "demo.read_only" {
		t.Errorf("err = %v", got["err"])
	}
	if pluginRecorder(ctx).Code != http.StatusForbidden {
		t.Errorf("状态码 = %d", pluginRecorder(ctx).Code)
	}
}

func TestSocialNotWired(t *testing.T) {
	cfg := SocialConfig{}
	ctx := pluginCtx(t, nil, http.MethodGet, "/auth/login/github", "", 0, false)
	ctx.Params = []string{"github"}
	got, err := socialHandler(cfg, "begin")(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "social.unavailable" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestSocialHandlerDispatch(t *testing.T) {
	var gotAction, gotBackend, gotAssoc string
	cfg := SocialConfig{
		Handler: func(_ *Context, action, backend, associationID string) (map[string]any, error) {
			gotAction, gotBackend, gotAssoc = action, backend, associationID
			return map[string]any{"err": "ok"}, nil
		},
	}

	ctx := pluginCtx(t, nil, http.MethodGet, "/auth/login/github", "", 0, false)
	ctx.Params = []string{"github"}
	if _, err := socialHandler(cfg, "begin")(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if gotAction != "begin" || gotBackend != "github" {
		t.Errorf("action = %q, backend = %q", gotAction, gotBackend)
	}

	ctx = pluginCtx(t, nil, http.MethodGet, "/auth/disconnect/github/42", "", 0, false)
	ctx.Params = []string{"github", "42"}
	if _, err := socialHandler(cfg, "disconnect_individual")(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if gotAction != "disconnect_individual" || gotAssoc != "42" {
		t.Errorf("action = %q, assoc = %q", gotAction, gotAssoc)
	}
}

func TestSocialDisconnectNoAssociationID(t *testing.T) {
	var gotAssoc string
	cfg := SocialConfig{
		Handler: func(_ *Context, _, _, associationID string) (map[string]any, error) {
			gotAssoc = associationID
			return map[string]any{"err": "ok"}, nil
		},
	}
	ctx := pluginCtx(t, nil, http.MethodGet, "/auth/disconnect/github", "", 0, false)
	ctx.Params = []string{"github"}
	if _, err := socialHandler(cfg, "disconnect")(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if gotAssoc != "" {
		t.Errorf("assoc = %q, want 空", gotAssoc)
	}
}
