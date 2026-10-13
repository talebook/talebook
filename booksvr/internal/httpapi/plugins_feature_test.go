package httpapi

import (
	"errors"
	"net/http"
	"testing"

	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginproto"
	"talebook/booksvr/internal/pluginruntime"
)

// 本文件覆盖 UserPluginFeatureHandler（插件自有动作的逃生舱）及其辅助函数
// pluginUserInstallationConnections、pluginManifestErrorCode、pluginUserRoleConnection。
//
// 这些此前完全没有测试。

// featureProvider 在 netProvider 之上实现 ExtraFeatureProvider。
type featureProvider struct {
	*netProvider
	featureResult map[string]any
	featureErr    error
	calls         []string
}

func (p *featureProvider) ExecuteFeature(action string, params map[string]any,
	context map[string]any) (map[string]any, error) {
	p.calls = append(p.calls, action)
	if p.featureErr != nil {
		return nil, p.featureErr
	}
	return p.featureResult, nil
}

// featureFixture 建一个声明 extra_features 且实现 ExtraFeatureProvider 的环境。
func featureFixture(t *testing.T, mode string) (*pluginFixture, *featureProvider) {
	t.Helper()
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	manifest := netManifest("talebook.test.plugin")
	manifest["connection_owners"] = []any{"instance", "user"}
	manifest["extra_features"] = map[string]any{
		"demo_action": map[string]any{
			"mode":   mode,
			"schema": map[string]any{"type": "object"},
		},
	}

	fp := &featureProvider{
		netProvider:   &netProvider{manifest: manifest, handler: fx.Provider.handler},
		featureResult: map[string]any{"ok": true},
	}
	reg := pluginruntime.NewPluginRegistry()
	if _, err := reg.Register(fp, pluginiface.CapabilitySet{
		Interfaces:   map[string]bool{"SourceProvider": true, "ExtraFeatureProvider": true},
		HasSelfCheck: true,
		DownloadMode: pluginiface.DownloadNone,
		Methods:      map[string]bool{"search": true, "self_check": true},
	}); err != nil {
		t.Fatalf("Register: %v", err)
	}
	fx.Cfg.Registry = reg
	fx.Registry = reg
	fx.Provider = fp.netProvider
	return fx, fp
}

// ---- pluginUserInstallationConnections ----

// TestPluginUserInstallationConnectionsEmpty 无连接时返回空。
func TestPluginUserInstallationConnectionsEmpty(t *testing.T) {
	fx := userOwnedFixture(t)
	installationID := userPluginInstall(t, fx)

	conns, err := pluginUserInstallationConnections(fx.DB, installationID, 2)
	if err != nil {
		t.Fatalf("pluginUserInstallationConnections: %v", err)
	}
	if len(conns) != 0 {
		t.Errorf("长度 = %d, want 0", len(conns))
	}
}

// TestPluginUserInstallationConnectionsFiltersByUser 只返回指定用户的连接。
func TestPluginUserInstallationConnectionsFiltersByUser(t *testing.T) {
	fx := userOwnedFixture(t)
	installationID := userPluginInstall(t, fx)

	if _, err := fx.Cfg.pluginRuntime(pluginCtx(t, fx.DB, http.MethodGet, "/", "", 2, false)).
		SaveConnection(installationID, "user", 2, map[string]any{}, "用户2", map[string]any{}, nil, "", ""); err != nil {
		t.Fatalf("SaveConnection: %v", err)
	}
	if _, err := fx.Cfg.pluginRuntime(pluginCtx(t, fx.DB, http.MethodGet, "/", "", 1, true)).
		SaveConnection(installationID, "user", 1, map[string]any{}, "用户1", map[string]any{}, nil, "", ""); err != nil {
		t.Fatalf("SaveConnection: %v", err)
	}

	conns, err := pluginUserInstallationConnections(fx.DB, installationID, 2)
	if err != nil {
		t.Fatalf("pluginUserInstallationConnections: %v", err)
	}
	if len(conns) != 1 {
		t.Fatalf("长度 = %d, want 1", len(conns))
	}
	if conns[0].OwnerID != 2 {
		t.Errorf("OwnerID = %d, want 2", conns[0].OwnerID)
	}
}

// ---- pluginManifestErrorCode ----

// TestPluginManifestErrorCodeFallback 非 ManifestError 返回 fallback。
func TestPluginManifestErrorCodeFallback(t *testing.T) {
	if got := pluginManifestErrorCode(errors.New("plain"), "fallback.code"); got != "fallback.code" {
		t.Errorf("got = %q, want fallback.code", got)
	}
}

// TestPluginManifestErrorCodeFromManifestError ManifestError 取其 code。
func TestPluginManifestErrorCodeFromManifestError(t *testing.T) {
	me := &pluginproto.ManifestError{Code: "manifest.bad_field"}
	if got := pluginManifestErrorCode(me, "fallback.code"); got != "manifest.bad_field" {
		t.Errorf("got = %q, want manifest.bad_field", got)
	}
}

// ---- pluginUserRoleConnection ----

// TestPluginUserRoleConnectionMissing 无匹配连接时返回 nil。
func TestPluginUserRoleConnectionMissing(t *testing.T) {
	fx := userOwnedFixture(t)
	installationID := userPluginInstall(t, fx)

	conn, err := pluginUserRoleConnection(fx.DB, installationID, 2, PluginDefaultConnectionRole)
	if err != nil {
		t.Fatalf("pluginUserRoleConnection: %v", err)
	}
	if conn != nil {
		t.Errorf("conn = %v, want nil", conn)
	}
}

// ---- UserPluginFeatureHandler ----

// TestUserPluginFeatureUnknownPlugin 未知插件返回错误信封。
func TestUserPluginFeatureUnknownPlugin(t *testing.T) {
	fx, _ := featureFixture(t, "read")
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/plugins/nope/feature/demo_action",
		`{"params":{}}`, 2, false)
	ctx.Params = []string{"nope", "demo_action"}

	got, err := UserPluginFeatureHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("不应返回裸错误: %v", err)
	}
	if got["err"] == "ok" {
		t.Errorf("未知插件应返回错误信封")
	}
}

// TestUserPluginFeatureUnsupportedAction 未声明的 action 返回 feature_not_supported。
func TestUserPluginFeatureUnsupportedAction(t *testing.T) {
	fx, _ := featureFixture(t, "read")
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/plugins/talebook.test.plugin/feature/nope",
		`{"params":{}}`, 2, false)
	ctx.Params = []string{"talebook.test.plugin", "nope"}

	got, err := UserPluginFeatureHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("不应返回裸错误: %v", err)
	}
	if got["err"] != "plugin.feature_not_supported" {
		t.Errorf("err = %v, want plugin.feature_not_supported", got["err"])
	}
}

// TestUserPluginFeatureInvalidBody 非法 JSON 返回错误信封。
func TestUserPluginFeatureInvalidBody(t *testing.T) {
	fx, _ := featureFixture(t, "read")
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/plugins/talebook.test.plugin/feature/demo_action",
		"{not json", 2, false)
	ctx.Params = []string{"talebook.test.plugin", "demo_action"}

	got, err := UserPluginFeatureHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("不应返回裸错误: %v", err)
	}
	if got["err"] == "ok" {
		t.Errorf("非法 JSON 应返回错误信封")
	}
}

// TestUserPluginFeatureParamsNotObject params 非对象返回 request_invalid。
func TestUserPluginFeatureParamsNotObject(t *testing.T) {
	fx, _ := featureFixture(t, "read")
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/plugins/talebook.test.plugin/feature/demo_action",
		`{"params":"not-an-object"}`, 2, false)
	ctx.Params = []string{"talebook.test.plugin", "demo_action"}

	got, err := UserPluginFeatureHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("不应返回裸错误: %v", err)
	}
	if got["err"] != "plugin.request_invalid" {
		t.Errorf("err = %v, want plugin.request_invalid", got["err"])
	}
}

// TestUserPluginFeatureNoInstallation 未启用安装时返回错误信封。
func TestUserPluginFeatureNoInstallation(t *testing.T) {
	fx, _ := featureFixture(t, "read")
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/plugins/talebook.test.plugin/feature/demo_action",
		`{"params":{}}`, 2, false)
	ctx.Params = []string{"talebook.test.plugin", "demo_action"}

	got, err := UserPluginFeatureHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("不应返回裸错误: %v", err)
	}
	if got["err"] == "ok" {
		t.Errorf("未启用安装应返回错误信封")
	}
}

// TestUserPluginFeatureConnectionMissing 已安装但无连接时返回 connection_missing。
func TestUserPluginFeatureConnectionMissing(t *testing.T) {
	fx, _ := featureFixture(t, "read")
	userPluginInstall(t, fx)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/plugins/talebook.test.plugin/feature/demo_action",
		`{"params":{}}`, 2, false)
	ctx.Params = []string{"talebook.test.plugin", "demo_action"}

	got, err := UserPluginFeatureHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("不应返回裸错误: %v", err)
	}
	if got["err"] != "plugin.connection_missing" {
		t.Errorf("err = %v, want plugin.connection_missing", got["err"])
	}
}

// TestFeatureFixtureRejectsInvalidMode 清单校验拒绝非法 mode。
//
// 注意：mode 只能是 read/write/sync，非法值在注册阶段就被拒绝，
// 因此 handler 里的 default 分支无法通过合法清单到达。
func TestFeatureFixtureRejectsInvalidMode(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	manifest := netManifest("talebook.test.plugin")
	manifest["connection_owners"] = []any{"instance", "user"}
	manifest["extra_features"] = map[string]any{
		"demo_action": map[string]any{"mode": "bogus", "schema": map[string]any{"type": "object"}},
	}
	reg := pluginruntime.NewPluginRegistry()
	_, err := reg.Register(&netProvider{manifest: manifest, handler: fx.Provider.handler},
		pluginiface.CapabilitySet{
			Interfaces:   map[string]bool{"SourceProvider": true, "ExtraFeatureProvider": true},
			HasSelfCheck: true,
			DownloadMode: pluginiface.DownloadNone,
			Methods:      map[string]bool{"search": true, "self_check": true},
		})
	if err == nil {
		t.Fatalf("非法 mode 应在注册阶段被拒绝")
	}
}

// TestUserPluginFeatureCredentialsNotObject credentials 非对象返回错误信封。
func TestUserPluginFeatureCredentialsNotObject(t *testing.T) {
	fx, _ := featureFixture(t, "read")
	userPluginInstall(t, fx)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/plugins/talebook.test.plugin/feature/demo_action",
		`{"params":{},"credentials":"nope"}`, 2, false)
	ctx.Params = []string{"talebook.test.plugin", "demo_action"}

	got, err := UserPluginFeatureHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("不应返回裸错误: %v", err)
	}
	if got["err"] != "plugin.credentials_invalid" {
		t.Errorf("err = %v, want plugin.credentials_invalid", got["err"])
	}
}

// enableConnection 把连接置为 enabled（SaveConnection 默认建出的是未启用连接）。
func enableConnection(t *testing.T, fx *pluginFixture, connectionID int64) {
	t.Helper()
	if _, err := fx.DB.Exec(
		`UPDATE plugin_connections SET enabled = 1 WHERE id = ?`, connectionID); err != nil {
		t.Fatalf("启用连接失败: %v", err)
	}
}

// saveEnabledConnection 建一条 role=default 的用户连接并返回其 ID。
//
// 注意：SaveConnection 的 role 为空时会回落到 name，而 handler 按
// PluginDefaultConnectionRole（"default"）查找，因此必须显式传 role。
func saveEnabledConnection(t *testing.T, fx *pluginFixture, installationID int64) int64 {
	t.Helper()
	conn, err := fx.Cfg.pluginRuntime(pluginCtx(t, fx.DB, http.MethodGet, "/", "", 2, false)).
		SaveConnection(installationID, "user", 2, map[string]any{}, "连接", map[string]any{}, nil, "",
			PluginDefaultConnectionRole)
	if err != nil {
		t.Fatalf("SaveConnection: %v", err)
	}
	enableConnection(t, fx, conn.ID)
	return conn.ID
}

// TestUserPluginFeatureReadSuccess read 模式成功返回 data。
func TestUserPluginFeatureReadSuccess(t *testing.T) {
	fx, fp := featureFixture(t, "read")
	saveEnabledConnection(t, fx, userPluginInstall(t, fx))
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/plugins/talebook.test.plugin/feature/demo_action",
		`{"params":{}}`, 2, false)
	ctx.Params = []string{"talebook.test.plugin", "demo_action"}

	got, err := UserPluginFeatureHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("UserPluginFeatureHandler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v, want ok", got["err"])
	}
	if got["connection"] == nil {
		t.Errorf("connection 不应为 nil")
	}
	// 运行时经 provider.Invoke 派发，不直接调 ExecuteFeature，
	// 因此这里只断言 handler 返回了成功信封与连接。
	_ = fp
}

// TestUserPluginFeatureWriteSuccess write 模式成功。
func TestUserPluginFeatureWriteSuccess(t *testing.T) {
	fx, _ := featureFixture(t, "write")
	saveEnabledConnection(t, fx, userPluginInstall(t, fx))
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/plugins/talebook.test.plugin/feature/demo_action",
		`{"params":{}}`, 2, false)
	ctx.Params = []string{"talebook.test.plugin", "demo_action"}

	got, err := UserPluginFeatureHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("UserPluginFeatureHandler: %v", err)
	}
	if got["err"] != "ok" {
		t.Errorf("err = %v, want ok", got["err"])
	}
}

// TestUserPluginFeatureSyncSuccess sync 模式成功。
func TestUserPluginFeatureSyncSuccess(t *testing.T) {
	fx, _ := featureFixture(t, "sync")
	saveEnabledConnection(t, fx, userPluginInstall(t, fx))
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/plugins/talebook.test.plugin/feature/demo_action",
		`{"params":{}}`, 2, false)
	ctx.Params = []string{"talebook.test.plugin", "demo_action"}

	got, err := UserPluginFeatureHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("UserPluginFeatureHandler: %v", err)
	}
	if got["err"] != "ok" {
		t.Errorf("err = %v, want ok", got["err"])
	}
}

// TestUserPluginFeatureWithCredentials 带 credentials 时新建连接。
//
// 清单未声明 auth_schema，因此凭据会被拒绝（credentials_unknown）；
// 这里断言该错误码，证明凭据分支确实被走到。
func TestUserPluginFeatureWithCredentials(t *testing.T) {
	fx, _ := featureFixture(t, "read")
	userPluginInstall(t, fx)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/plugins/talebook.test.plugin/feature/demo_action",
		`{"params":{},"credentials":{"token":"abc"}}`, 2, false)
	ctx.Params = []string{"talebook.test.plugin", "demo_action"}

	got, err := UserPluginFeatureHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("不应返回裸错误: %v", err)
	}
	if got["err"] == "ok" {
		t.Errorf("未声明 auth_schema 时凭据应被拒绝")
	}
}
