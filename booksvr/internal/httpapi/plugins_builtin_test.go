package httpapi

import (
	"net/http"
	"testing"

	"talebook/booksvr/internal/pluginbuiltin"
	"talebook/booksvr/internal/pluginruntime"
)

// TestAdminPluginsReturnsAllBuiltins 端到端：注册内置插件后，
// /api/admin/plugins 返回 39 条 definitions 与 installations，
// 且 builtin_state 含 talebook.source.opds 的三键。
func TestAdminPluginsReturnsAllBuiltins(t *testing.T) {
	db := netSchemaDB(t)
	if _, err := db.Exec(`INSERT INTO readers (id, username, password, admin, active, permission, create_time)
		VALUES (1, 'admin', 'x', 1, 1, '', '2026-01-01 00:00:00')`); err != nil {
		t.Fatalf("插入管理员失败: %v", err)
	}
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS opds_sources (
		id INTEGER PRIMARY KEY, name VARCHAR(200), url VARCHAR(1000),
		description VARCHAR(500), active BOOLEAN, create_time DATETIME, update_time DATETIME, data TEXT)`); err != nil {
		t.Fatalf("建 opds_sources 失败: %v", err)
	}
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS book_sources (
		id INTEGER PRIMARY KEY, name VARCHAR(200), url VARCHAR(1000), "group" VARCHAR(200),
		source_type INTEGER, enabled BOOLEAN, weight INTEGER, comment VARCHAR(500),
		last_check_time DATETIME, last_check_ok BOOLEAN, check_status VARCHAR(50),
		check_message VARCHAR(500), check_tags TEXT, create_time DATETIME, update_time DATETIME, raw TEXT)`); err != nil {
		t.Fatalf("建 book_sources 失败: %v", err)
	}

	reg := pluginruntime.NewPluginRegistry()
	if err := pluginbuiltin.Register(reg); err != nil {
		t.Fatalf("Register: %v", err)
	}
	cfg := PluginConfig{Settings: map[string]any{"OPDS_ENABLED": true}, Registry: reg}
	ctx := pluginCtx(t, db, http.MethodGet, "/", "", 1, true)
	out, err := AdminPluginsHandler(cfg)(ctx)
	if err != nil {
		t.Fatalf("AdminPluginsHandler: %v", err)
	}
	if out["err"] != "ok" {
		t.Fatalf("err = %v", out["err"])
	}
	definitions, _ := out["definitions"].([]map[string]any)
	installations, _ := out["installations"].([]map[string]any)
	if len(definitions) != 39 {
		t.Errorf("definitions = %d, want 39", len(definitions))
	}
	if len(installations) != 39 {
		t.Errorf("installations = %d, want 39", len(installations))
	}
	state, _ := out["builtin_state"].(map[string]any)
	opdsState, ok := state["talebook.source.opds"].(map[string]any)
	if !ok {
		t.Fatalf("builtin_state 缺少 talebook.source.opds: %v", state)
	}
	for _, key := range []string{"configured", "enabled", "service_enabled"} {
		if _, ok := opdsState[key]; !ok {
			t.Errorf("opds builtin_state 缺少 %s: %v", key, opdsState)
		}
	}
	if opdsState["service_enabled"] != true {
		t.Errorf("service_enabled = %v, want true", opdsState["service_enabled"])
	}
}
