package pluginruntime

import (
	"testing"

	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/userdb"
)

// newRuntimeWithPlugin 建库、注册一个 provider 并物化安装，返回 runtime 与安装记录。
func newRuntimeWithPlugin(t *testing.T, id string, hosts []string) (*Runtime, *userdb.PluginInstallation, int64) {
	t.Helper()
	db := newSchemaDB(t)
	adminID := seedAdmin(t, db)
	reg := newTestRegistry(t, id, hosts)
	insts, err := EnsureBuiltinInstallations(db, adminID, map[string]any{}, reg)
	if err != nil {
		t.Fatalf("EnsureBuiltinInstallations: %v", err)
	}
	// fakeProvider 未实现 InitialEnabled，首次物化默认 enabled=false（与 Python 一致）；
	// 测试需要启用状态，因此显式打开。
	if _, err := db.Exec(`UPDATE plugin_installations SET enabled = 1 WHERE id = ?`, insts[0].ID); err != nil {
		t.Fatalf("enable installation: %v", err)
	}
	settings := map[string]any{"PLUGIN_SECRET_KEY": "test-key-123"}
	return NewRuntime(db, settings, reg), insts[0], adminID
}

func TestRuntimeEnabledProviders(t *testing.T) {
	rt, _, _ := newRuntimeWithPlugin(t, "demo", nil)

	got, err := rt.EnabledProviders("metadata.lookup")
	if err != nil {
		t.Fatalf("EnabledProviders: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("len = %d, want 1", len(got))
	}
	if got[0].Manifest()["id"] != "talebook.demo" {
		t.Errorf("id = %v", got[0].Manifest()["id"])
	}
}

func TestRuntimeEnabledProvidersUnknownCapability(t *testing.T) {
	rt, _, _ := newRuntimeWithPlugin(t, "demo", nil)
	got, err := rt.EnabledProviders("reviews.lookup")
	if err != nil {
		t.Fatalf("EnabledProviders: %v", err)
	}
	if len(got) != 0 {
		t.Errorf("len = %d, want 0", len(got))
	}
}

func TestRuntimeEnabledProvidersSkipsDisabled(t *testing.T) {
	rt, inst, _ := newRuntimeWithPlugin(t, "demo", nil)
	if _, err := rt.DB.Exec(`UPDATE plugin_installations SET enabled = 0 WHERE id = ?`, inst.ID); err != nil {
		t.Fatalf("disable: %v", err)
	}
	got, err := rt.EnabledProviders("metadata.lookup")
	if err != nil {
		t.Fatalf("EnabledProviders: %v", err)
	}
	if len(got) != 0 {
		t.Errorf("disabled installation must not be returned")
	}
}

func TestRuntimeEnabledProvidersSkipsNonActive(t *testing.T) {
	rt, inst, _ := newRuntimeWithPlugin(t, "demo", nil)
	if _, err := rt.DB.Exec(`UPDATE plugin_installations SET status = 'suspended' WHERE id = ?`, inst.ID); err != nil {
		t.Fatalf("suspend: %v", err)
	}
	got, err := rt.EnabledProviders("metadata.lookup")
	if err != nil {
		t.Fatalf("EnabledProviders: %v", err)
	}
	if len(got) != 0 {
		t.Errorf("non-active installation must not be returned")
	}
}

func TestRuntimePluginKeyOf(t *testing.T) {
	rt, inst, _ := newRuntimeWithPlugin(t, "demo", nil)
	conn, err := getBuiltinConnection(rt.DB, inst.ID)
	if err != nil {
		t.Fatalf("getBuiltinConnection: %v", err)
	}
	key, err := rt.PluginKeyOf(conn)
	if err != nil {
		t.Fatalf("PluginKeyOf: %v", err)
	}
	if key != "talebook.demo" {
		t.Errorf("key = %s", key)
	}
}

func TestRuntimeConnectionsForInstance(t *testing.T) {
	rt, _, _ := newRuntimeWithPlugin(t, "demo", nil)

	got, err := rt.ConnectionsFor("metadata.lookup", nil)
	if err != nil {
		t.Fatalf("ConnectionsFor: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("len = %d, want 1", len(got))
	}
	if got[0].OwnerType != "instance" {
		t.Errorf("owner_type = %s", got[0].OwnerType)
	}
}

func TestRuntimeConnectionsForUnknownCapability(t *testing.T) {
	rt, _, _ := newRuntimeWithPlugin(t, "demo", nil)
	got, err := rt.ConnectionsFor("reviews.lookup", nil)
	if err != nil {
		t.Fatalf("ConnectionsFor: %v", err)
	}
	if len(got) != 0 {
		t.Errorf("len = %d, want 0", len(got))
	}
}

func TestRuntimeConnectionsForUserIncludesInstance(t *testing.T) {
	rt, inst, _ := newRuntimeWithPlugin(t, "demo", nil)
	userID := int64(42)
	if _, err := rt.SaveConnection(inst.ID, "user", userID, map[string]any{},
		"个人", map[string]any{}, nil, "", DefaultConnectionRole); err != nil {
		t.Fatalf("SaveConnection: %v", err)
	}

	got, err := rt.ConnectionsFor("metadata.lookup", &userID)
	if err != nil {
		t.Fatalf("ConnectionsFor: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("len = %d, want 2 (instance + user)", len(got))
	}
}

func TestRuntimeConnectionsForOtherUserExcluded(t *testing.T) {
	rt, inst, _ := newRuntimeWithPlugin(t, "demo", nil)
	if _, err := rt.SaveConnection(inst.ID, "user", 42, map[string]any{},
		"个人", map[string]any{}, nil, "", DefaultConnectionRole); err != nil {
		t.Fatalf("SaveConnection: %v", err)
	}
	other := int64(99)
	got, err := rt.ConnectionsFor("metadata.lookup", &other)
	if err != nil {
		t.Fatalf("ConnectionsFor: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("len = %d, want 1 (instance only)", len(got))
	}
}

func TestRuntimeProviderFor(t *testing.T) {
	rt, _, _ := newRuntimeWithPlugin(t, "demo", nil)
	p, err := rt.ProviderFor("metadata.lookup", nil)
	if err != nil {
		t.Fatalf("ProviderFor: %v", err)
	}
	if p.Manifest()["id"] != "talebook.demo" {
		t.Errorf("id = %v", p.Manifest()["id"])
	}
}

func TestRuntimeProviderForUnavailable(t *testing.T) {
	rt, _, _ := newRuntimeWithPlugin(t, "demo", nil)
	_, err := rt.ProviderFor("reviews.lookup", nil)
	var runtimeErr *PluginRuntimeError
	if !errorsAs(err, &runtimeErr) || runtimeErr.Code != "plugin.provider_unavailable" {
		t.Errorf("got %v", err)
	}
}

func TestRuntimeProviderForSelectorMismatch(t *testing.T) {
	rt, _, _ := newRuntimeWithPlugin(t, "demo", nil)
	_, err := rt.ProviderFor("metadata.lookup", map[string]any{"device_type": "boox"})
	var runtimeErr *PluginRuntimeError
	if !errorsAs(err, &runtimeErr) || runtimeErr.Code != "plugin.provider_unavailable" {
		t.Errorf("got %v", err)
	}
}

func TestRequireScopes(t *testing.T) {
	conn := &userdb.PluginConnection{Scopes: []any{"a", "b"}}
	if err := RequireScopes(conn, "a"); err != nil {
		t.Errorf("got %v", err)
	}
	if err := RequireScopes(conn, "a", "b"); err != nil {
		t.Errorf("got %v", err)
	}
	err := RequireScopes(conn, "a", "z", "c")
	var runtimeErr *PluginRuntimeError
	if !errorsAs(err, &runtimeErr) || runtimeErr.Code != "plugin.scope_denied" {
		t.Fatalf("got %v", err)
	}
	// 缺失项按字典序拼接。
	if runtimeErr.Message != "Plugin connection lacks required scopes: c, z" {
		t.Errorf("message = %q", runtimeErr.Message)
	}
}

func TestEffectiveTimeout(t *testing.T) {
	cases := []struct {
		config   map[string]any
		fallback float64
		want     float64
	}{
		{map[string]any{}, 30, 30},
		{map[string]any{"timeout_seconds": 60}, 30, 60},
		{map[string]any{"timeout_seconds": 0}, 30, 0.01},
		{map[string]any{"timeout_seconds": -5}, 30, 0.01},
		{map[string]any{"timeout_seconds": 99999}, 30, 3600},
		{map[string]any{"timeout_seconds": "45"}, 30, 45},
		{map[string]any{"timeout_seconds": "abc"}, 30, 30},
	}
	for _, c := range cases {
		conn := &userdb.PluginConnection{Config: c.config}
		if got := EffectiveTimeout(conn, c.fallback); got != c.want {
			t.Errorf("EffectiveTimeout(%v, %v) = %v, want %v", c.config, c.fallback, got, c.want)
		}
	}
}

func TestLoadSecretsNoSecretNoRequired(t *testing.T) {
	rt, inst, _ := newRuntimeWithPlugin(t, "demo", nil)
	conn, err := getBuiltinConnection(rt.DB, inst.ID)
	if err != nil {
		t.Fatalf("getBuiltinConnection: %v", err)
	}
	got, err := rt.LoadSecrets(conn)
	if err != nil {
		t.Fatalf("LoadSecrets: %v", err)
	}
	if len(got) != 0 {
		t.Errorf("got %v, want empty", got)
	}
}

func TestLoadSecretsMissingWhenRequired(t *testing.T) {
	rt, inst, _ := newRuntimeWithPlugin(t, "demo", nil)
	// 给定义加上必填凭据字段。
	if _, err := rt.DB.Exec(`UPDATE plugin_definitions SET auth_schema = ?
		WHERE plugin_key = 'talebook.demo'`,
		`{"properties":{"token":{"type":"string"}},"required":["token"]}`); err != nil {
		t.Fatalf("update auth_schema: %v", err)
	}
	conn, err := getBuiltinConnection(rt.DB, inst.ID)
	if err != nil {
		t.Fatalf("getBuiltinConnection: %v", err)
	}
	_, err = rt.LoadSecrets(conn)
	var runtimeErr *PluginRuntimeError
	if !errorsAs(err, &runtimeErr) || runtimeErr.Code != "plugin.credentials_missing" {
		t.Errorf("got %v", err)
	}
}

func TestSaveConnectionRoundTripWithCredentials(t *testing.T) {
	rt, inst, _ := newRuntimeWithPlugin(t, "demo", nil)
	// 声明必填凭据。
	if _, err := rt.DB.Exec(`UPDATE plugin_definitions SET auth_schema = ?
		WHERE plugin_key = 'talebook.demo'`,
		`{"properties":{"token":{"type":"string"}},"required":["token"]}`); err != nil {
		t.Fatalf("update auth_schema: %v", err)
	}

	conn, err := rt.SaveConnection(inst.ID, "user", 7,
		map[string]any{"token": "s3cr3t"}, "个人", map[string]any{"endpoint": "https://x"},
		nil, "", DefaultConnectionRole)
	if err != nil {
		t.Fatalf("SaveConnection: %v", err)
	}
	if !conn.SecretID.Valid {
		t.Fatal("secret_id must be set")
	}
	if conn.Role != DefaultConnectionRole {
		t.Errorf("role = %s", conn.Role)
	}
	if conn.Config["endpoint"] != "https://x" {
		t.Errorf("config = %v", conn.Config)
	}

	// 解密应还原凭据。
	secrets, err := rt.LoadSecrets(conn)
	if err != nil {
		t.Fatalf("LoadSecrets: %v", err)
	}
	if secrets["token"] != "s3cr3t" {
		t.Errorf("secrets = %v", secrets)
	}
}

func TestSaveConnectionUpdatesExisting(t *testing.T) {
	rt, inst, _ := newRuntimeWithPlugin(t, "demo", nil)
	first, err := rt.SaveConnection(inst.ID, "user", 7, map[string]any{},
		"个人", map[string]any{"a": 1}, nil, "", DefaultConnectionRole)
	if err != nil {
		t.Fatalf("first: %v", err)
	}
	second, err := rt.SaveConnection(inst.ID, "user", 7, map[string]any{},
		"个人", map[string]any{"a": 2}, nil, "", DefaultConnectionRole)
	if err != nil {
		t.Fatalf("second: %v", err)
	}
	if first.ID != second.ID {
		t.Errorf("id changed: %d → %d", first.ID, second.ID)
	}
	if second.Config["a"] != float64(2) && second.Config["a"] != 2 {
		t.Errorf("config not updated: %v", second.Config)
	}

	var count int
	if err := rt.DB.QueryRow(`SELECT COUNT(*) FROM plugin_connections
		WHERE owner_type='user' AND owner_id=7`).Scan(&count); err != nil {
		t.Fatalf("count: %v", err)
	}
	if count != 1 {
		t.Errorf("row count = %d, want 1", count)
	}
}

func TestSaveConnectionRejectsSecretInConfig(t *testing.T) {
	rt, inst, _ := newRuntimeWithPlugin(t, "demo", nil)
	_, err := rt.SaveConnection(inst.ID, "user", 7, map[string]any{},
		"个人", map[string]any{"password": "x"}, nil, "", DefaultConnectionRole)
	var runtimeErr *PluginRuntimeError
	if !errorsAs(err, &runtimeErr) || runtimeErr.Code != "plugin.secret_in_config" {
		t.Errorf("got %v", err)
	}
}

func TestSaveConnectionRoleDefaultsToName(t *testing.T) {
	rt, inst, _ := newRuntimeWithPlugin(t, "demo", nil)
	conn, err := rt.SaveConnection(inst.ID, "user", 7, map[string]any{},
		"my-role", map[string]any{}, nil, "", "")
	if err != nil {
		t.Fatalf("SaveConnection: %v", err)
	}
	if conn.Role != "my-role" {
		t.Errorf("role = %s, want my-role", conn.Role)
	}
}

func TestSaveConnectionDefaultsScopesToPermissions(t *testing.T) {
	rt, inst, _ := newRuntimeWithPlugin(t, "demo", nil)
	conn, err := rt.SaveConnection(inst.ID, "user", 7, map[string]any{},
		"个人", map[string]any{}, nil, "", DefaultConnectionRole)
	if err != nil {
		t.Fatalf("SaveConnection: %v", err)
	}
	// minimalManifest 的 permissions 为空列表。
	if len(conn.Scopes) != 0 {
		t.Errorf("scopes = %v", conn.Scopes)
	}
}

func TestPrepareReadBuildsContext(t *testing.T) {
	rt, _, _ := newRuntimeWithPlugin(t, "demo", nil)
	conns, err := rt.ConnectionsFor("metadata.lookup", nil)
	if err != nil {
		t.Fatalf("ConnectionsFor: %v", err)
	}
	prepared, failures, err := rt.PrepareRead(conns, 30, nil, nil, "read", nil, "")
	if err != nil {
		t.Fatalf("PrepareRead: %v", err)
	}
	if len(failures) != 0 {
		t.Fatalf("failures = %v", failures)
	}
	if len(prepared) != 1 {
		t.Fatalf("len = %d", len(prepared))
	}
	call := prepared[0]
	if call.Key != conns[0].ID {
		t.Errorf("key = %d, want %d", call.Key, conns[0].ID)
	}
	if call.PluginKey != "talebook.demo" {
		t.Errorf("plugin_key = %s", call.PluginKey)
	}
	if call.Context["action"] != "read" {
		t.Errorf("action = %v", call.Context["action"])
	}
	if call.Context["attempt"] != 1 {
		t.Errorf("attempt = %v", call.Context["attempt"])
	}
	if call.Timeout != 30 {
		t.Errorf("timeout = %v", call.Timeout)
	}
}

func TestPrepareReadScopeFailure(t *testing.T) {
	rt, _, _ := newRuntimeWithPlugin(t, "demo", nil)
	conns, err := rt.ConnectionsFor("metadata.lookup", nil)
	if err != nil {
		t.Fatalf("ConnectionsFor: %v", err)
	}
	prepared, failures, err := rt.PrepareRead(conns, 30, nil,
		[]string{"network.outbound"}, "read", nil, "")
	if err != nil {
		t.Fatalf("PrepareRead: %v", err)
	}
	if len(prepared) != 0 {
		t.Errorf("prepared = %d, want 0", len(prepared))
	}
	if len(failures) != 1 {
		t.Fatalf("failures = %v", failures)
	}
	var runtimeErr *PluginRuntimeError
	if !errorsAs(failures[conns[0].ID], &runtimeErr) || runtimeErr.Code != "plugin.scope_denied" {
		t.Errorf("got %v", failures[conns[0].ID])
	}
}

func TestPrepareReadContextOverrides(t *testing.T) {
	rt, _, _ := newRuntimeWithPlugin(t, "demo", nil)
	conns, err := rt.ConnectionsFor("metadata.lookup", nil)
	if err != nil {
		t.Fatalf("ConnectionsFor: %v", err)
	}
	overrides := map[int64]map[string]any{
		conns[0].ID: {
			"config":     map[string]any{"extra": "yes"},
			"cursor":     map[string]any{"page": 3},
			"input_data": map[string]any{"q": "三体"},
			"platform":   map[string]any{"device": "boox"},
		},
	}
	prepared, failures, err := rt.PrepareRead(conns, 30, overrides, nil, "read", nil, "")
	if err != nil {
		t.Fatalf("PrepareRead: %v", err)
	}
	if len(failures) != 0 {
		t.Fatalf("failures = %v", failures)
	}
	ctx := prepared[0].Context
	if anyMap(ctx["config"])["extra"] != "yes" {
		t.Errorf("config override lost: %v", ctx["config"])
	}
	if anyMap(ctx["cursor"])["page"] != 3 {
		t.Errorf("cursor override lost: %v", ctx["cursor"])
	}
	if anyMap(ctx["input_data"])["q"] != "三体" {
		t.Errorf("input_data override lost: %v", ctx["input_data"])
	}
	if anyMap(ctx["platform"])["device"] != "boox" {
		t.Errorf("platform override lost: %v", ctx["platform"])
	}
}

func TestPrepareReadEmptyConnections(t *testing.T) {
	rt, _, _ := newRuntimeWithPlugin(t, "demo", nil)
	prepared, failures, err := rt.PrepareRead(nil, 30, nil, nil, "read", nil, "")
	if err != nil {
		t.Fatalf("PrepareRead: %v", err)
	}
	if len(prepared) != 0 || len(failures) != 0 {
		t.Errorf("prepared=%d failures=%d", len(prepared), len(failures))
	}
}

func TestActionsSet(t *testing.T) {
	for _, a := range []string{"test", "preview", "run", "retry", "rollback"} {
		if !Actions[a] {
			t.Errorf("missing action %s", a)
		}
	}
	if len(Actions) != 5 {
		t.Errorf("len = %d, want 5", len(Actions))
	}
}

func TestDecodeJSONHelpers(t *testing.T) {
	if got := decodeJSONMap(""); len(got) != 0 {
		t.Errorf("empty map = %v", got)
	}
	if got := decodeJSONMap("null"); len(got) != 0 {
		t.Errorf("null map = %v", got)
	}
	if got := decodeJSONMap("not json"); len(got) != 0 {
		t.Errorf("invalid map = %v", got)
	}
	if got := decodeJSONMap(`{"a":1}`); got["a"] != float64(1) {
		t.Errorf("map = %v", got)
	}
	if got := decodeJSONList(""); len(got) != 0 {
		t.Errorf("empty list = %v", got)
	}
	if got := decodeJSONList(`[1,2]`); len(got) != 2 {
		t.Errorf("list = %v", got)
	}
}

func TestDeadlineStringFormat(t *testing.T) {
	got := deadlineString(30)
	if len(got) != 26 {
		t.Errorf("length = %d (%q)", len(got), got)
	}
	if got[10] != 'T' || got[19] != '.' {
		t.Errorf("unexpected format: %q", got)
	}
}

func TestValuesEqual(t *testing.T) {
	if !valuesEqual("a", "a") {
		t.Error("equal strings")
	}
	if valuesEqual("a", "b") {
		t.Error("different strings")
	}
	if !valuesEqual(nil, nil) {
		t.Error("both nil")
	}
}

func TestToStringSlice(t *testing.T) {
	got := toStringSlice([]any{"a", "b"})
	if len(got) != 2 || got[0] != "a" {
		t.Errorf("got %v", got)
	}
	if len(toStringSlice(nil)) != 0 {
		t.Errorf("nil should give empty")
	}
}

var _ = pluginiface.Provider(nil)
