package pluginjobs

import (
	"database/sql"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginruntime"
	"talebook/booksvr/internal/userdb"

	_ "modernc.org/sqlite"
)

// ---- 测试替身 ----

// jobProvider 是一个可被调用的假插件。
type jobProvider struct {
	manifest map[string]any
	// calls 记录被调用的方法名。
	calls []string
	// err 非空时调用失败。
	err error
}

// Manifest 返回插件清单。
func (p *jobProvider) Manifest() map[string]any { return p.manifest }

// ProxyImageHosts 返回代理图片域名。
func (p *jobProvider) ProxyImageHosts() []string { return nil }

// SelfCheck 满足 actions 含 test 时的契约要求。
func (p *jobProvider) SelfCheck(map[string]any) (plugindomain.CheckReport, error) {
	return plugindomain.CheckReport{}, nil
}

// SearchBooks 满足 MetadataProvider 契约。
func (p *jobProvider) SearchBooks(plugindomain.MetadataQuery,
	map[string]any) ([]plugindomain.BookMetadata, error) {
	return nil, nil
}

// GetMetadata 满足 MetadataProvider 契约。
func (p *jobProvider) GetMetadata(string, map[string]any) (*plugindomain.BookMetadata, error) {
	return nil, nil
}

// GetCover 满足 MetadataProvider 契约。
func (p *jobProvider) GetCover(string, map[string]any) (*pluginiface.CoverResult, error) {
	return nil, nil
}

// Invoke 按方法名分派。
func (p *jobProvider) Invoke(method string, args []any, context map[string]any) (any, error) {
	p.calls = append(p.calls, method)
	if p.err != nil {
		return nil, p.err
	}
	return map[string]any{"method": method}, nil
}

// ---- 测试环境 ----

// fixture 是一套执行器测试环境。
type fixture struct {
	// Executor 是被测执行器。
	Executor *Executor
	// Provider 是假插件。
	Provider *jobProvider
	// DB 是 Talebook 自有库。
	DB *sql.DB
	// ConnectionID 是连接 ID。
	ConnectionID int64
	// AdminID 是管理员 ID。
	AdminID int64
}

// newSchemaDB 打开一份内存库并建表。
func newSchemaDB(t *testing.T) *sql.DB {
	t.Helper()
	path := filepath.Join("..", "userdb", "testdata", "schema.sql")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Skipf("schema.sql 不存在，跳过: %v", err)
	}
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	db.SetMaxOpenConns(1)
	t.Cleanup(func() { _ = db.Close() })

	for _, stmt := range strings.Split(string(raw), ";") {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" {
			continue
		}
		if _, err := db.Exec(stmt); err != nil {
			t.Fatalf("建表失败: %v\n%s", err, stmt)
		}
	}
	return db
}

// jobManifest 返回一份合法的 metadata.lookup 清单。
func jobManifest() map[string]any {
	return map[string]any{
		"protocol_version":  "talebook.plugin/v1",
		"id":                "talebook.jobs",
		"name":              "任务插件",
		"version":           "1.0.0",
		"categories":        []any{"metadata"},
		"capabilities":      []any{"metadata.lookup"},
		"runtime_kind":      "builtin",
		"actions":           []any{"test", "run", "rollback"},
		"auth_schema":       map[string]any{"properties": map[string]any{}},
		"config_schema":     map[string]any{},
		"connection_owners": []any{"instance"},
		"permissions":       []any{},
		"data_policy":       map[string]any{},
		"compatibility":     map[string]any{},
		"homepage":          "",
		"license":           "",
	}
}

// newFixture 构造测试环境。
func newFixture(t *testing.T, provider *jobProvider) *fixture {
	t.Helper()
	db := newSchemaDB(t)
	res, err := db.Exec(`INSERT INTO readers (username, password, admin, create_time)
		VALUES ('admin', 'x', 1, '2026-01-01 00:00:00.000000')`)
	if err != nil {
		t.Fatalf("插入管理员失败: %v", err)
	}
	adminID, _ := res.LastInsertId()

	reg := pluginruntime.NewPluginRegistry()
	caps := pluginiface.CapabilitySet{
		Interfaces:   map[string]bool{"MetadataProvider": true},
		HasSelfCheck: true,
	}
	if _, err := reg.Register(provider, caps); err != nil {
		t.Fatalf("注册插件失败: %v", err)
	}
	insts, err := pluginruntime.EnsureBuiltinInstallations(db, adminID, map[string]any{}, reg)
	if err != nil {
		t.Fatalf("物化内置安装失败: %v", err)
	}
	if _, err := db.Exec(`UPDATE plugin_installations SET enabled = 1 WHERE id = ?`, insts[0].ID); err != nil {
		t.Fatalf("启用安装失败: %v", err)
	}

	settings := map[string]any{"PLUGIN_SECRET_KEY": "test-key-123"}
	rt := pluginruntime.NewRuntime(db, settings, reg)

	conn, err := rt.SaveConnection(insts[0].ID, "instance", 0,
		map[string]any{}, "默认", map[string]any{}, nil, "", pluginruntime.DefaultConnectionRole)
	if err != nil {
		t.Fatalf("保存连接失败: %v", err)
	}

	return &fixture{
		Executor:     NewExecutor(Config{DB: db, Runtime: rt}),
		Provider:     provider,
		DB:           db,
		ConnectionID: conn.ID,
		AdminID:      adminID,
	}
}

// insertRun 插入一条指定状态的 run 并返回 id。
func insertRun(t *testing.T, db *sql.DB, connectionID, requestedBy int64, action, status string) int64 {
	t.Helper()
	res, err := db.Exec(`INSERT INTO plugin_runs
		(connection_id, action, trigger, status, requested_by, attempt, counts,
		 cursor_before, cursor_after, input_data, error_code, error_message,
		 create_time, duration_ms)
		VALUES (?, ?, 'manual', ?, ?, 0, '{}', '{}', '{}', '{}', '', '',
		 '2026-01-01 00:00:00', 0)`, connectionID, action, status, requestedBy)
	if err != nil {
		t.Fatalf("插入 run 失败: %v", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		t.Fatalf("取 run id 失败: %v", err)
	}
	return id
}

// ---- Execute ----

// TestExecuteMissingRun 覆盖 run 不存在。
func TestExecuteMissingRun(t *testing.T) {
	fx := newFixture(t, &jobProvider{manifest: jobManifest()})
	_, err := fx.Executor.Execute(99999)
	if err == nil {
		t.Fatal("run 不存在应报错")
	}
	if pluginruntime.ErrorCodeOf(err) != "plugin.run_missing" {
		t.Errorf("code = %q，期望 plugin.run_missing", pluginruntime.ErrorCodeOf(err))
	}
}

// TestExecuteNonQueuedIsIdempotent 覆盖非 queued 状态原样返回。
func TestExecuteNonQueuedIsIdempotent(t *testing.T) {
	fx := newFixture(t, &jobProvider{manifest: jobManifest()})
	runID := insertRun(t, fx.DB, fx.ConnectionID, fx.AdminID, "run", "succeeded")

	run, err := fx.Executor.Execute(runID)
	if err != nil {
		t.Fatalf("Execute: %v", err)
	}
	if run.Status != "succeeded" {
		t.Errorf("status = %q，期望原样返回 succeeded", run.Status)
	}
	if len(fx.Provider.calls) != 0 {
		t.Errorf("非 queued 不应调用 provider，实际 %v", fx.Provider.calls)
	}
}

// TestExecuteQueuedRunSucceeds 覆盖 queued run 成功执行。
func TestExecuteQueuedRunSucceeds(t *testing.T) {
	fx := newFixture(t, &jobProvider{manifest: jobManifest()})
	runID := insertRun(t, fx.DB, fx.ConnectionID, fx.AdminID, "run", "queued")

	run, err := fx.Executor.Execute(runID)
	if err != nil {
		t.Fatalf("Execute: %v", err)
	}
	if run.Status != "succeeded" {
		t.Fatalf("status = %q（err=%s）", run.Status, run.ErrorMessage)
	}
	if len(fx.Provider.calls) != 1 || fx.Provider.calls[0] != "run" {
		t.Errorf("calls = %v，期望 [run]", fx.Provider.calls)
	}
	if run.Counts["fetched"] != 1 {
		t.Errorf("fetched = %v，期望 1", run.Counts["fetched"])
	}
	if run.StartedAt == "" || run.FinishedAt == "" {
		t.Error("应记录起止时间")
	}
}

// TestExecutePersistsStatus 覆盖状态落库。
func TestExecutePersistsStatus(t *testing.T) {
	fx := newFixture(t, &jobProvider{manifest: jobManifest()})
	runID := insertRun(t, fx.DB, fx.ConnectionID, fx.AdminID, "run", "queued")

	if _, err := fx.Executor.Execute(runID); err != nil {
		t.Fatalf("Execute: %v", err)
	}

	var status string
	if err := fx.DB.QueryRow(`SELECT status FROM plugin_runs WHERE id = ?`, runID).Scan(&status); err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if status != "succeeded" {
		t.Errorf("落库 status = %q", status)
	}
}

// TestExecuteProviderFailure 覆盖 provider 失败。
func TestExecuteProviderFailure(t *testing.T) {
	fx := newFixture(t, &jobProvider{
		manifest: jobManifest(),
		err:      pluginruntime.NewPluginRuntimeError("plugin.upstream_error", "boom", false),
	})
	runID := insertRun(t, fx.DB, fx.ConnectionID, fx.AdminID, "run", "queued")

	run, err := fx.Executor.Execute(runID)
	if err != nil {
		t.Fatalf("Execute: %v", err)
	}
	if run.Status != "failed" {
		t.Errorf("status = %q，期望 failed", run.Status)
	}
	if run.ErrorCode != "plugin.upstream_error" {
		t.Errorf("error_code = %q", run.ErrorCode)
	}
	if run.Counts["failed"] != 1 {
		t.Errorf("failed = %v，期望 1", run.Counts["failed"])
	}
}

// TestExecuteErrorMessageTruncated 覆盖错误信息截断。
func TestExecuteErrorMessageTruncated(t *testing.T) {
	long := strings.Repeat("x", 2000)
	fx := newFixture(t, &jobProvider{
		manifest: jobManifest(),
		err:      pluginruntime.NewPluginRuntimeError("plugin.upstream_error", long, false),
	})
	runID := insertRun(t, fx.DB, fx.ConnectionID, fx.AdminID, "run", "queued")

	run, err := fx.Executor.Execute(runID)
	if err != nil {
		t.Fatalf("Execute: %v", err)
	}
	if len(run.ErrorMessage) > 1000 {
		t.Errorf("error_message 长度 = %d，应 <= 1000", len(run.ErrorMessage))
	}
}

// TestExecuteRollbackAction 覆盖 rollback 动作。
func TestExecuteRollbackAction(t *testing.T) {
	fx := newFixture(t, &jobProvider{manifest: jobManifest()})
	runID := insertRun(t, fx.DB, fx.ConnectionID, fx.AdminID, "rollback", "queued")

	run, err := fx.Executor.Execute(runID)
	if err != nil {
		t.Fatalf("Execute: %v", err)
	}
	if run.Status != "rolled_back" {
		t.Fatalf("status = %q（err=%s）", run.Status, run.ErrorMessage)
	}
	if len(fx.Provider.calls) != 1 || fx.Provider.calls[0] != "rollback" {
		t.Errorf("calls = %v，期望 [rollback]", fx.Provider.calls)
	}
}

// TestExecuteRollbackFailure 覆盖 rollback 失败。
func TestExecuteRollbackFailure(t *testing.T) {
	fx := newFixture(t, &jobProvider{
		manifest: jobManifest(),
		err:      pluginruntime.NewPluginRuntimeError("plugin.rollback_failed", "nope", false),
	})
	runID := insertRun(t, fx.DB, fx.ConnectionID, fx.AdminID, "rollback", "queued")

	run, err := fx.Executor.Execute(runID)
	if err != nil {
		t.Fatalf("Execute: %v", err)
	}
	if run.Status != "failed" {
		t.Errorf("status = %q，期望 failed", run.Status)
	}
}

// TestExecuteMissingConnection 覆盖连接不存在。
func TestExecuteMissingConnection(t *testing.T) {
	fx := newFixture(t, &jobProvider{manifest: jobManifest()})
	runID := insertRun(t, fx.DB, 99999, fx.AdminID, "run", "queued")

	if _, err := fx.Executor.Execute(runID); err == nil {
		t.Fatal("连接不存在应报错")
	}
}

// ---- 租约 ----

// TestExecuteReleasesLease 覆盖成功后释放租约。
func TestExecuteReleasesLease(t *testing.T) {
	fx := newFixture(t, &jobProvider{manifest: jobManifest()})
	runID := insertRun(t, fx.DB, fx.ConnectionID, fx.AdminID, "run", "queued")

	if _, err := fx.Executor.Execute(runID); err != nil {
		t.Fatalf("Execute: %v", err)
	}

	var token sql.NullString
	var until sql.NullString
	if err := fx.DB.QueryRow(`SELECT lease_token, lease_until FROM plugin_connections WHERE id = ?`,
		fx.ConnectionID).Scan(&token, &until); err != nil {
		t.Fatalf("查询租约失败: %v", err)
	}
	if token.Valid && token.String != "" {
		t.Errorf("lease_token = %q，应已释放", token.String)
	}
	if until.Valid {
		t.Errorf("lease_until = %v，应已清空", until)
	}
}

// TestExecuteConcurrentRunRejected 覆盖租约被占用时拒绝并发执行。
func TestExecuteConcurrentRunRejected(t *testing.T) {
	fx := newFixture(t, &jobProvider{manifest: jobManifest()})
	// 预置一个未过期的租约。
	future := time.Now().Add(time.Hour).Format("2006-01-02 15:04:05.000000")
	if _, err := fx.DB.Exec(`UPDATE plugin_connections SET lease_token = 'held', lease_until = ? WHERE id = ?`,
		future, fx.ConnectionID); err != nil {
		t.Fatalf("预置租约失败: %v", err)
	}

	runID := insertRun(t, fx.DB, fx.ConnectionID, fx.AdminID, "run", "queued")
	run, err := fx.Executor.Execute(runID)
	if err != nil {
		t.Fatalf("Execute: %v", err)
	}
	if run.Status != "failed" {
		t.Errorf("status = %q，期望 failed", run.Status)
	}
	if run.ErrorCode != "plugin.concurrent_run" {
		t.Errorf("error_code = %q，期望 plugin.concurrent_run", run.ErrorCode)
	}
	if len(fx.Provider.calls) != 0 {
		t.Errorf("并发冲突时不应调用 provider，实际 %v", fx.Provider.calls)
	}
}

// TestExecuteExpiredLeaseAcquired 覆盖过期租约可被抢占。
func TestExecuteExpiredLeaseAcquired(t *testing.T) {
	fx := newFixture(t, &jobProvider{manifest: jobManifest()})
	past := time.Now().Add(-time.Hour).Format("2006-01-02 15:04:05.000000")
	if _, err := fx.DB.Exec(`UPDATE plugin_connections SET lease_token = 'stale', lease_until = ? WHERE id = ?`,
		past, fx.ConnectionID); err != nil {
		t.Fatalf("预置过期租约失败: %v", err)
	}

	runID := insertRun(t, fx.DB, fx.ConnectionID, fx.AdminID, "run", "queued")
	run, err := fx.Executor.Execute(runID)
	if err != nil {
		t.Fatalf("Execute: %v", err)
	}
	if run.Status != "succeeded" {
		t.Errorf("status = %q（err=%s），过期租约应可抢占", run.Status, run.ErrorMessage)
	}
}

// TestExecuteTimeoutKeepsLease 覆盖超时错误保留租约。
func TestExecuteTimeoutKeepsLease(t *testing.T) {
	fx := newFixture(t, &jobProvider{
		manifest: jobManifest(),
		err:      pluginruntime.NewPluginRuntimeError("plugin.timeout", "timed out", true),
	})
	runID := insertRun(t, fx.DB, fx.ConnectionID, fx.AdminID, "run", "queued")

	run, err := fx.Executor.Execute(runID)
	if err != nil {
		t.Fatalf("Execute: %v", err)
	}
	if run.Status != "failed" {
		t.Fatalf("status = %q", run.Status)
	}

	var token sql.NullString
	if err := fx.DB.QueryRow(`SELECT lease_token FROM plugin_connections WHERE id = ?`,
		fx.ConnectionID).Scan(&token); err != nil {
		t.Fatalf("查询租约失败: %v", err)
	}
	if !token.Valid || token.String == "" {
		t.Error("超时错误应保留租约，避免副作用重叠")
	}
}

// ---- 辅助 ----

// TestNewLeaseTokenUnique 覆盖租约令牌唯一。
func TestNewLeaseTokenUnique(t *testing.T) {
	seen := map[string]bool{}
	for i := 0; i < 100; i++ {
		token := newLeaseToken()
		if seen[token] {
			t.Fatalf("令牌重复: %q", token)
		}
		seen[token] = true
	}
}

// TestFormatTime 覆盖时间格式。
func TestFormatTime(t *testing.T) {
	got := formatTime(time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC))
	if got != "2026-01-02 03:04:05.000000" {
		t.Errorf("formatTime = %q", got)
	}
}

// TestCopyCounts 覆盖计数表复制。
func TestCopyCounts(t *testing.T) {
	got := copyCounts(map[string]int{"a": 1})
	if got["a"] != 1 {
		t.Errorf("copyCounts = %v", got)
	}
	got["a"] = 9
	if copyCounts(map[string]int{"a": 1})["a"] != 1 {
		t.Error("copyCounts 应深拷贝")
	}
}

// TestNowFallback 覆盖时间回落。
func TestNowFallback(t *testing.T) {
	e := NewExecutor(Config{})
	if e.now().IsZero() {
		t.Error("now 不应为零值")
	}
}

// TestErrRunMissingDefined 覆盖哨兵错误已定义。
func TestErrRunMissingDefined(t *testing.T) {
	if ErrRunMissing == nil {
		t.Error("ErrRunMissing 不应为 nil")
	}
}

// TestGetPluginRunByIDMissing 覆盖 userdb 取不存在的 run。
func TestGetPluginRunByIDMissing(t *testing.T) {
	fx := newFixture(t, &jobProvider{manifest: jobManifest()})
	run, err := userdb.GetPluginRunByID(fx.DB, 99999)
	if err != nil {
		t.Fatalf("GetPluginRunByID: %v", err)
	}
	if run != nil {
		t.Error("不存在的 run 应返回 nil")
	}
}

// TestUpdatePluginRunNil 覆盖更新 nil run 不报错。
func TestUpdatePluginRunNil(t *testing.T) {
	fx := newFixture(t, &jobProvider{manifest: jobManifest()})
	if err := userdb.UpdatePluginRun(fx.DB, nil); err != nil {
		t.Errorf("更新 nil run 不应报错: %v", err)
	}
}
