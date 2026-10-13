package pluginruntime

import (
	"database/sql"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/userdb"

	_ "modernc.org/sqlite"
)

// errorsAs 是 errors.As 的薄封装。
func errorsAs[T error](err error, target *T) bool { return errors.As(err, target) }

// newSchemaDB 建一个内存库并套用权威 schema（由 webserver/models.py 导出）。
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
	// 内存库是每连接独立的，必须把连接池限制为 1，否则后续查询会落到空库上。
	db.SetMaxOpenConns(1)
	t.Cleanup(func() { _ = db.Close() })

	for _, stmt := range strings.Split(string(raw), ";") {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" {
			continue
		}
		if _, err := db.Exec(stmt); err != nil {
			t.Fatalf("建表失败: %v\n语句: %s", err, stmt)
		}
	}
	return db
}

// seedAdmin 插入一个管理员读者，返回其 id。
func seedAdmin(t *testing.T, db *sql.DB) int64 {
	t.Helper()
	res, err := db.Exec(`INSERT INTO readers (username, password, admin, create_time)
		VALUES ('admin', 'x', 1, '2026-01-01 00:00:00.000000')`)
	if err != nil {
		t.Fatalf("插入管理员失败: %v", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		t.Fatalf("取管理员 id 失败: %v", err)
	}
	return id
}

// newTestRegistry 构造含一个内置 provider 的注册表。
func newTestRegistry(t *testing.T, id string, hosts []string) *PluginRegistry {
	t.Helper()
	reg := NewPluginRegistry()
	caps := pluginiface.CapabilitySet{
		Interfaces:   map[string]bool{"MetadataProvider": true},
		HasSelfCheck: true,
	}
	if _, err := reg.Register(&fakeProvider{manifest: minimalManifest(id), hosts: hosts}, caps); err != nil {
		t.Fatalf("Register: %v", err)
	}
	return reg
}

func TestEnsureBuiltinDefinitionsCreates(t *testing.T) {
	db := newSchemaDB(t)
	reg := newTestRegistry(t, "demo", nil)

	defs, err := EnsureBuiltinDefinitions(db, reg)
	if err != nil {
		t.Fatalf("EnsureBuiltinDefinitions: %v", err)
	}
	if len(defs) != 1 {
		t.Fatalf("len = %d", len(defs))
	}
	d := defs[0]
	if d.ID == 0 {
		t.Errorf("id not assigned")
	}
	if d.PluginKey != "talebook.demo" || d.Version != "1.0.0" {
		t.Errorf("key/version = %s/%s", d.PluginKey, d.Version)
	}
	if d.ProtocolVersion != "talebook.plugin/v1" {
		t.Errorf("protocol_version = %s", d.ProtocolVersion)
	}
	if d.RuntimeKind != "builtin" {
		t.Errorf("runtime_kind = %s", d.RuntimeKind)
	}
	if len(d.Categories) != 1 || d.Categories[0] != "metadata" {
		t.Errorf("categories = %v", d.Categories)
	}
	if d.Manifest["id"] != "talebook.demo" {
		t.Errorf("manifest not stored")
	}
}

func TestEnsureBuiltinDefinitionsIdempotent(t *testing.T) {
	db := newSchemaDB(t)
	reg := newTestRegistry(t, "demo", nil)

	first, err := EnsureBuiltinDefinitions(db, reg)
	if err != nil {
		t.Fatalf("first: %v", err)
	}
	second, err := EnsureBuiltinDefinitions(db, reg)
	if err != nil {
		t.Fatalf("second: %v", err)
	}
	if first[0].ID != second[0].ID {
		t.Errorf("id changed: %d → %d", first[0].ID, second[0].ID)
	}

	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM plugin_definitions`).Scan(&count); err != nil {
		t.Fatalf("count: %v", err)
	}
	if count != 1 {
		t.Errorf("row count = %d, want 1", count)
	}
}

func TestEnsureBuiltinDefinitionsUpdatesFields(t *testing.T) {
	db := newSchemaDB(t)
	reg := newTestRegistry(t, "demo", nil)
	if _, err := EnsureBuiltinDefinitions(db, reg); err != nil {
		t.Fatalf("seed: %v", err)
	}

	// 篡改 name，再跑一次应被回写。
	if _, err := db.Exec(`UPDATE plugin_definitions SET name='stale'`); err != nil {
		t.Fatalf("update: %v", err)
	}
	if _, err := EnsureBuiltinDefinitions(db, reg); err != nil {
		t.Fatalf("rerun: %v", err)
	}
	got, err := userdb.GetPluginDefinitionByKeyVersion(db, "talebook.demo", "1.0.0")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.Name != "测试插件" {
		t.Errorf("name = %q, want 测试插件", got.Name)
	}
}

func TestInstallBuiltinCreatesInstallation(t *testing.T) {
	db := newSchemaDB(t)
	adminID := seedAdmin(t, db)
	reg := newTestRegistry(t, "demo", nil)

	inst, err := InstallBuiltin(db, "talebook.demo", adminID, nil, nil, true, reg)
	if err != nil {
		t.Fatalf("InstallBuiltin: %v", err)
	}
	if inst.ID == 0 {
		t.Errorf("id not assigned")
	}
	if inst.PluginKey != "talebook.demo" || inst.Version != "1.0.0" {
		t.Errorf("key/version = %s/%s", inst.PluginKey, inst.Version)
	}
	if !inst.Enabled {
		t.Errorf("enabled = false")
	}
	if inst.Scope != "shared" {
		t.Errorf("scope = %s", inst.Scope)
	}
	if inst.InstalledFrom != "builtin" {
		t.Errorf("installed_from = %s", inst.InstalledFrom)
	}
	if inst.Status != "active" {
		t.Errorf("status = %s", inst.Status)
	}
	if len(inst.Checksum) != 64 {
		t.Errorf("checksum = %q", inst.Checksum)
	}
	if inst.InstalledBy != adminID {
		t.Errorf("installed_by = %d", inst.InstalledBy)
	}
}

func TestInstallBuiltinIdempotent(t *testing.T) {
	db := newSchemaDB(t)
	adminID := seedAdmin(t, db)
	reg := newTestRegistry(t, "demo", nil)

	first, err := InstallBuiltin(db, "talebook.demo", adminID, nil, nil, true, reg)
	if err != nil {
		t.Fatalf("first: %v", err)
	}
	second, err := InstallBuiltin(db, "talebook.demo", adminID, nil, nil, false, reg)
	if err != nil {
		t.Fatalf("second: %v", err)
	}
	if first.ID != second.ID {
		t.Errorf("id changed: %d → %d", first.ID, second.ID)
	}
	if second.Enabled {
		t.Errorf("enabled should be updated to false")
	}

	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM plugin_installations`).Scan(&count); err != nil {
		t.Fatalf("count: %v", err)
	}
	if count != 1 {
		t.Errorf("row count = %d, want 1", count)
	}
}

func TestInstallBuiltinUnknownPlugin(t *testing.T) {
	db := newSchemaDB(t)
	adminID := seedAdmin(t, db)
	reg := newTestRegistry(t, "demo", nil)

	_, err := InstallBuiltin(db, "talebook.missing", adminID, nil, nil, true, reg)
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestInstallBuiltinRejectsUndeclaredPermission(t *testing.T) {
	db := newSchemaDB(t)
	adminID := seedAdmin(t, db)
	reg := newTestRegistry(t, "demo", nil)

	_, err := InstallBuiltin(db, "talebook.demo", adminID, nil,
		[]string{"network.outbound"}, true, reg)
	var runtimeErr *PluginRuntimeError
	if !errorsAs(err, &runtimeErr) {
		t.Fatalf("type = %T (%v)", err, err)
	}
	if runtimeErr.Code != "plugin.permission_invalid" {
		t.Errorf("code = %q", runtimeErr.Code)
	}
}

func TestInstallBuiltinValidatesConfig(t *testing.T) {
	db := newSchemaDB(t)
	adminID := seedAdmin(t, db)
	reg := newTestRegistry(t, "demo", nil)

	_, err := InstallBuiltin(db, "talebook.demo", adminID,
		map[string]any{"password": "x"}, nil, true, reg)
	var runtimeErr *PluginRuntimeError
	if !errorsAs(err, &runtimeErr) || runtimeErr.Code != "plugin.secret_in_config" {
		t.Errorf("got %v", err)
	}
}

func TestEnsureBuiltinInstallationsCreatesConnection(t *testing.T) {
	db := newSchemaDB(t)
	adminID := seedAdmin(t, db)
	reg := newTestRegistry(t, "demo", nil)

	insts, err := EnsureBuiltinInstallations(db, adminID, map[string]any{}, reg)
	if err != nil {
		t.Fatalf("EnsureBuiltinInstallations: %v", err)
	}
	if len(insts) != 1 {
		t.Fatalf("len = %d", len(insts))
	}

	conns, err := userdb.ListPluginConnections(db, insts[0].ID)
	if err != nil {
		t.Fatalf("ListPluginConnections: %v", err)
	}
	if len(conns) != 1 {
		t.Fatalf("connections = %d, want 1", len(conns))
	}
	c := conns[0]
	if c.OwnerType != "instance" || c.OwnerID != 0 {
		t.Errorf("owner = %s/%d", c.OwnerType, c.OwnerID)
	}
	if c.Role != BuiltinConnectionRole {
		t.Errorf("role = %s", c.Role)
	}
	if c.Name != "内置连接" {
		t.Errorf("name = %q", c.Name)
	}
	if c.Health != "unknown" {
		t.Errorf("health = %s", c.Health)
	}
	if !c.Enabled {
		t.Errorf("enabled = false")
	}
}

func TestEnsureBuiltinInstallationsIdempotent(t *testing.T) {
	db := newSchemaDB(t)
	adminID := seedAdmin(t, db)
	reg := newTestRegistry(t, "demo", nil)

	if _, err := EnsureBuiltinInstallations(db, adminID, map[string]any{}, reg); err != nil {
		t.Fatalf("first: %v", err)
	}
	if _, err := EnsureBuiltinInstallations(db, adminID, map[string]any{}, reg); err != nil {
		t.Fatalf("second: %v", err)
	}

	var conns int
	if err := db.QueryRow(`SELECT COUNT(*) FROM plugin_connections`).Scan(&conns); err != nil {
		t.Fatalf("count: %v", err)
	}
	if conns != 1 {
		t.Errorf("connection count = %d, want 1", conns)
	}
}

func TestEnsureRuntimeInstallationsNoAdmin(t *testing.T) {
	db := newSchemaDB(t)
	reg := newTestRegistry(t, "demo", nil)

	insts, err := EnsureRuntimeInstallations(db, map[string]any{}, reg)
	if err != nil {
		t.Fatalf("EnsureRuntimeInstallations: %v", err)
	}
	if len(insts) != 0 {
		t.Errorf("len = %d, want 0", len(insts))
	}
}

func TestEnsureRuntimeInstallationsPicksFirstAdmin(t *testing.T) {
	db := newSchemaDB(t)
	// 非管理员在前，管理员在后：应选管理员。
	if _, err := db.Exec(`INSERT INTO readers (username, password, admin, create_time)
		VALUES ('user', 'x', 0, '2026-01-01 00:00:00.000000')`); err != nil {
		t.Fatalf("insert user: %v", err)
	}
	adminID := seedAdmin(t, db)
	reg := newTestRegistry(t, "demo", nil)

	insts, err := EnsureRuntimeInstallations(db, map[string]any{}, reg)
	if err != nil {
		t.Fatalf("EnsureRuntimeInstallations: %v", err)
	}
	if len(insts) != 1 {
		t.Fatalf("len = %d", len(insts))
	}
	if insts[0].InstalledBy != adminID {
		t.Errorf("installed_by = %d, want %d", insts[0].InstalledBy, adminID)
	}
}

func TestGetBuiltinConnectionFiltersByRole(t *testing.T) {
	db := newSchemaDB(t)
	adminID := seedAdmin(t, db)
	reg := newTestRegistry(t, "demo", nil)

	insts, err := EnsureBuiltinInstallations(db, adminID, map[string]any{}, reg)
	if err != nil {
		t.Fatalf("seed: %v", err)
	}
	// 再插一条 default 角色的连接，不应被 getBuiltinConnection 选中。
	if _, err := db.Exec(`INSERT INTO plugin_connections
		(installation_id, owner_type, owner_id, role, name, config, scopes,
		 health, enabled, create_time, update_time)
		VALUES (?, 'instance', 0, 'default', '默认', '{}', '[]', 'unknown', 1, '', '')`,
		insts[0].ID); err != nil {
		t.Fatalf("insert default conn: %v", err)
	}

	conn, err := getBuiltinConnection(db, insts[0].ID)
	if err != nil {
		t.Fatalf("getBuiltinConnection: %v", err)
	}
	if conn == nil {
		t.Fatal("expected builtin connection")
	}
	if conn.Role != BuiltinConnectionRole {
		t.Errorf("role = %s", conn.Role)
	}
}

func TestGetBuiltinConnectionMissing(t *testing.T) {
	db := newSchemaDB(t)
	conn, err := getBuiltinConnection(db, 999)
	if err != nil {
		t.Fatalf("getBuiltinConnection: %v", err)
	}
	if conn != nil {
		t.Errorf("expected nil, got %+v", conn)
	}
}

func TestNowStringFormat(t *testing.T) {
	got := nowString()
	if len(got) != 26 {
		t.Errorf("length = %d, want 26 (%q)", len(got), got)
	}
	if got[10] != ' ' || got[19] != '.' {
		t.Errorf("unexpected format: %q", got)
	}
}
