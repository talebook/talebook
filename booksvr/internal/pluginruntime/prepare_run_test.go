package pluginruntime

import (
	"database/sql"
	"testing"

	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/userdb"
)

// prepareRunFixture 建库、注册插件并返回一条启用的实例连接。
//
// 复用 install_test.go 的 newSchemaDB / seedAdmin / fakeProvider。
func prepareRunFixture(t *testing.T, actions []any) (*sql.DB, *PluginRegistry, *userdb.PluginConnection) {
	t.Helper()
	db := newSchemaDB(t)
	adminID := seedAdmin(t, db)

	manifest := minimalManifest("test.prepare")
	manifest["actions"] = actions
	reg := NewPluginRegistry()
	if _, err := reg.Register(&fakeProvider{manifest: manifest}, pluginiface.CapabilitySet{
		Interfaces:   map[string]bool{"MetadataProvider": true},
		HasSelfCheck: true,
	}); err != nil {
		t.Fatalf("Register: %v", err)
	}
	settings := map[string]any{"PLUGIN_SECRET_KEY": "test-key-123"}
	if _, err := EnsureBuiltinInstallations(db, adminID, settings, reg); err != nil {
		t.Fatalf("EnsureBuiltinInstallations: %v", err)
	}
	if _, err := db.Exec(`UPDATE plugin_installations SET enabled = 1, status = 'active'`); err != nil {
		t.Fatalf("enable: %v", err)
	}
	installation, err := userdb.GetPluginInstallationByKey(db, "talebook.test.prepare")
	if err != nil || installation == nil {
		t.Fatalf("取安装失败: %v", err)
	}
	connection, err := getBuiltinConnection(db, installation.ID)
	if err != nil || connection == nil {
		t.Fatalf("取内置连接失败: %v", err)
	}
	return db, reg, connection
}

func TestPrepareRunCreatesQueuedRun(t *testing.T) {
	db, reg, connection := prepareRunFixture(t, []any{"test", "run"})
	rt := NewRuntime(db, map[string]any{"PLUGIN_SECRET_KEY": "k"}, reg)

	run, err := rt.PrepareRun(connection.ID, "run", 1, "manual", nil,
		map[string]any{"a": 1}, nil)
	if err != nil {
		t.Fatalf("PrepareRun: %v", err)
	}
	if run.ID == 0 {
		t.Fatal("run.ID 为 0")
	}
	if run.Status != "queued" {
		t.Errorf("status = %q", run.Status)
	}
	if run.Action != "run" || run.Trigger != "manual" || run.RequestedBy != 1 {
		t.Errorf("run = %+v", run)
	}
	if run.ParentRunID.Valid {
		t.Errorf("parent_run_id 应为空: %v", run.ParentRunID)
	}
	if run.InputData["a"] != 1 {
		t.Errorf("input_data = %v", run.InputData)
	}
	// counts 应填入默认值。
	if len(run.Counts) == 0 {
		t.Error("counts 为空")
	}
}

func TestPrepareRunRejectsUnknownAction(t *testing.T) {
	db, reg, connection := prepareRunFixture(t, []any{"test", "run"})
	rt := NewRuntime(db, map[string]any{"PLUGIN_SECRET_KEY": "k"}, reg)

	_, err := rt.PrepareRun(connection.ID, "nope", 1, "manual", nil, nil, nil)
	if ErrorCodeOf(err) != "plugin.action_invalid" {
		t.Errorf("code = %s", ErrorCodeOf(err))
	}
}

func TestPrepareRunRejectsUnsupportedAction(t *testing.T) {
	db, reg, connection := prepareRunFixture(t, []any{"test"})
	rt := NewRuntime(db, map[string]any{"PLUGIN_SECRET_KEY": "k"}, reg)

	_, err := rt.PrepareRun(connection.ID, "run", 1, "manual", nil, nil, nil)
	if ErrorCodeOf(err) != "plugin.action_not_supported" {
		t.Errorf("code = %s", ErrorCodeOf(err))
	}
}

func TestPrepareRunRejectsDisabledConnection(t *testing.T) {
	db, reg, connection := prepareRunFixture(t, []any{"test", "run"})
	if _, err := db.Exec(`UPDATE plugin_connections SET enabled = 0 WHERE id = ?`, connection.ID); err != nil {
		t.Fatalf("update: %v", err)
	}
	rt := NewRuntime(db, map[string]any{"PLUGIN_SECRET_KEY": "k"}, reg)

	_, err := rt.PrepareRun(connection.ID, "run", 1, "manual", nil, nil, nil)
	if ErrorCodeOf(err) != "plugin.connection_missing" {
		t.Errorf("code = %s", ErrorCodeOf(err))
	}
}

func TestPrepareRunRejectsDisabledInstallation(t *testing.T) {
	db, reg, connection := prepareRunFixture(t, []any{"test", "run"})
	if _, err := db.Exec(`UPDATE plugin_installations SET enabled = 0`); err != nil {
		t.Fatalf("update: %v", err)
	}
	rt := NewRuntime(db, map[string]any{"PLUGIN_SECRET_KEY": "k"}, reg)

	_, err := rt.PrepareRun(connection.ID, "run", 1, "manual", nil, nil, nil)
	if ErrorCodeOf(err) != "plugin.installation_disabled" {
		t.Errorf("code = %s", ErrorCodeOf(err))
	}
}

func TestPrepareRunRetryRequiresTerminalParent(t *testing.T) {
	db, reg, connection := prepareRunFixture(t, []any{"test", "run", "retry"})
	rt := NewRuntime(db, map[string]any{"PLUGIN_SECRET_KEY": "k"}, reg)

	// 没有 parent_run_id。
	if _, err := rt.PrepareRun(connection.ID, "retry", 1, "manual", nil, nil, nil); ErrorCodeOf(err) != "plugin.parent_run_invalid" {
		t.Errorf("缺 parent 时 code = %s", ErrorCodeOf(err))
	}

	// parent 处于非终态。
	parentID := seedRun(t, db, connection.ID, "run", "running")
	if _, err := rt.PrepareRun(connection.ID, "retry", 1, "manual", &parentID, nil, nil); ErrorCodeOf(err) != "plugin.parent_run_invalid" {
		t.Errorf("非终态 parent 时 code = %s", ErrorCodeOf(err))
	}

	// parent 成功（非 failed/partial）不可重试。
	okID := seedRun(t, db, connection.ID, "run", "succeeded")
	if _, err := rt.PrepareRun(connection.ID, "retry", 1, "manual", &okID, nil, nil); ErrorCodeOf(err) != "plugin.retry_not_allowed" {
		t.Errorf("成功 parent 时 code = %s", ErrorCodeOf(err))
	}

	// failed parent 可重试。
	failedID := seedRun(t, db, connection.ID, "run", "failed")
	run, err := rt.PrepareRun(connection.ID, "retry", 1, "manual", &failedID, nil, nil)
	if err != nil {
		t.Fatalf("PrepareRun: %v", err)
	}
	if !run.ParentRunID.Valid || run.ParentRunID.Int64 != failedID {
		t.Errorf("parent_run_id = %v", run.ParentRunID)
	}
}

func TestPrepareRunRetryMergesServerOwnedInput(t *testing.T) {
	db, reg, connection := prepareRunFixture(t, []any{"test", "run", "retry"})
	rt := NewRuntime(db, map[string]any{"PLUGIN_SECRET_KEY": "k"}, reg)

	parentID := seedRunWithInput(t, db, connection.ID, "run", "failed",
		map[string]any{"keep": "old", "allowed_book_ids": []any{1, 2}})

	// 本次只提供 allowed_book_ids：应覆盖父运行的同名字段，其余继承。
	run, err := rt.PrepareRun(connection.ID, "retry", 1, "manual", &parentID,
		map[string]any{"allowed_book_ids": []any{3}}, map[string]bool{"allowed_book_ids": true})
	if err != nil {
		t.Fatalf("PrepareRun: %v", err)
	}
	if run.InputData["keep"] != "old" {
		t.Errorf("keep = %v", run.InputData["keep"])
	}
	ids, ok := run.InputData["allowed_book_ids"].([]any)
	if !ok || len(ids) != 1 || ids[0] != 3 {
		t.Errorf("allowed_book_ids = %v", run.InputData["allowed_book_ids"])
	}
}

func TestPrepareRunRollbackRequiresWriteParent(t *testing.T) {
	db, reg, connection := prepareRunFixture(t, []any{"test", "run", "rollback"})
	rt := NewRuntime(db, map[string]any{"PLUGIN_SECRET_KEY": "k"}, reg)

	// parent 的 action 是 preview，不是 run/retry。
	parentID := seedRun(t, db, connection.ID, "preview", "succeeded")
	if _, err := rt.PrepareRun(connection.ID, "rollback", 1, "manual", &parentID, nil, nil); ErrorCodeOf(err) != "plugin.rollback_not_allowed" {
		t.Errorf("code = %s", ErrorCodeOf(err))
	}

	// parent 是 run 且成功，可回滚。
	okID := seedRun(t, db, connection.ID, "run", "succeeded")
	if _, err := rt.PrepareRun(connection.ID, "rollback", 1, "manual", &okID, nil, nil); err != nil {
		t.Fatalf("PrepareRun: %v", err)
	}
}

func TestPrepareRunSnapshotsCursor(t *testing.T) {
	db, reg, connection := prepareRunFixture(t, []any{"test", "run"})
	if _, err := db.Exec(`UPDATE plugin_connections SET cursor = '{"page":7}' WHERE id = ?`,
		connection.ID); err != nil {
		t.Fatalf("update: %v", err)
	}
	rt := NewRuntime(db, map[string]any{"PLUGIN_SECRET_KEY": "k"}, reg)

	run, err := rt.PrepareRun(connection.ID, "run", 1, "manual", nil, nil, nil)
	if err != nil {
		t.Fatalf("PrepareRun: %v", err)
	}
	if run.CursorBefore["page"] != float64(7) || run.CursorAfter["page"] != float64(7) {
		t.Errorf("cursor_before = %v, cursor_after = %v", run.CursorBefore, run.CursorAfter)
	}
}

// seedRun 插入一条运行记录并返回 id。
func seedRun(t *testing.T, db *sql.DB, connectionID int64, action, status string) int64 {
	t.Helper()
	return seedRunWithInput(t, db, connectionID, action, status, map[string]any{})
}

// seedRunWithInput 插入一条带 input_data 的运行记录并返回 id。
func seedRunWithInput(t *testing.T, db *sql.DB, connectionID int64, action, status string,
	input map[string]any) int64 {
	t.Helper()
	res, err := db.Exec(`INSERT INTO plugin_runs
		(connection_id, action, "trigger", status, requested_by, attempt, counts,
		 cursor_before, cursor_after, input_data, error_code, error_message,
		 create_time, duration_ms)
		VALUES (?, ?, 'manual', ?, 1, 1, '{}', '{}', '{}', ?, '', '',
		 '2026-01-01 00:00:00', 0)`, connectionID, action, status, jsonText(input))
	if err != nil {
		t.Fatalf("插入 run 失败: %v", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		t.Fatalf("LastInsertId: %v", err)
	}
	return id
}
