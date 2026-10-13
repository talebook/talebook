package httpapi

import (
	"encoding/json"
	"net/http"
	"strconv"
	"testing"

	"talebook/booksvr/internal/pluginruntime"
)

// 本文件补齐面向普通用户的插件接口中此前未覆盖的部分：
// UserPluginConnectionsHandler（GET/POST 全部分支）及其辅助函数
// pluginUserConnections、pluginLatestRunsByConnection、pluginLatestRun、
// pluginActiveUserInstallation。
//
// UserPluginsHandler 与 UserPluginStateHandler 已在 plugins_test.go 中覆盖，
// 此处不重复。

// userOwnedFixture 建一个声明 connection_owners 含 "user" 的插件环境。
func userOwnedFixture(t *testing.T) *pluginFixture {
	t.Helper()
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	manifest := netManifest("talebook.test.plugin")
	manifest["connection_owners"] = []any{"instance", "user"}
	pluginReRegister(t, fx, manifest)
	return fx
}

// userPluginInstall 为插件建内置安装并置为 active，返回安装 ID。
//
// EnsureBuiltinInstallations 默认建出的是 disabled 安装，而用户侧建连接要求
// 安装 enabled 且 status = 'active'，因此这里显式启用。
func userPluginInstall(t *testing.T, fx *pluginFixture) int64 {
	t.Helper()
	installations, err := pluginruntime.EnsureBuiltinInstallations(
		fx.DB, 2, fx.Cfg.Settings, fx.Registry)
	if err != nil {
		t.Fatalf("EnsureBuiltinInstallations: %v", err)
	}
	if len(installations) == 0 {
		t.Fatalf("未创建安装记录")
	}
	id := installations[0].ID
	if _, err := fx.DB.Exec(
		`UPDATE plugin_installations SET enabled = 1, status = 'active' WHERE id = ?`, id); err != nil {
		t.Fatalf("启用安装失败: %v", err)
	}
	return id
}

// ---- pluginUserConnections ----

// TestPluginUserConnectionsEmpty 无连接时返回空切片。
func TestPluginUserConnectionsEmpty(t *testing.T) {
	fx := userOwnedFixture(t)
	conns, err := pluginUserConnections(fx.DB, 2)
	if err != nil {
		t.Fatalf("pluginUserConnections: %v", err)
	}
	if len(conns) != 0 {
		t.Errorf("长度 = %d, want 0", len(conns))
	}
}

// TestPluginUserConnectionsOnlyOwn 只返回指定用户的连接。
func TestPluginUserConnectionsOnlyOwn(t *testing.T) {
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

	conns, err := pluginUserConnections(fx.DB, 2)
	if err != nil {
		t.Fatalf("pluginUserConnections: %v", err)
	}
	if len(conns) != 1 {
		t.Fatalf("长度 = %d, want 1", len(conns))
	}
	if conns[0].OwnerID != 2 {
		t.Errorf("OwnerID = %d, want 2", conns[0].OwnerID)
	}
}

// ---- pluginLatestRun / pluginLatestRunsByConnection ----

// TestPluginLatestRunEmpty 空输入返回 nil。
func TestPluginLatestRunEmpty(t *testing.T) {
	if got := pluginLatestRun(nil); got != nil {
		t.Errorf("pluginLatestRun(nil) = %v, want nil", got)
	}
}

// TestPluginLatestRunsByConnectionEmpty 无连接时返回空 map。
func TestPluginLatestRunsByConnectionEmpty(t *testing.T) {
	fx := userOwnedFixture(t)
	runs, err := pluginLatestRunsByConnection(fx.DB, nil)
	if err != nil {
		t.Fatalf("pluginLatestRunsByConnection: %v", err)
	}
	if len(runs) != 0 {
		t.Errorf("长度 = %d, want 0", len(runs))
	}
}

// ---- UserPluginConnectionsHandler：GET ----

// TestUserPluginConnectionsHandlerGetEmpty 无连接时 GET 返回空数组。
func TestUserPluginConnectionsHandlerGetEmpty(t *testing.T) {
	fx := userOwnedFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/plugins/connections", "", 2, false)

	got, err := UserPluginConnectionsHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("UserPluginConnectionsHandler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v, want ok", got["err"])
	}
	conns, ok := got["connections"].([]map[string]any)
	if !ok {
		t.Fatalf("connections 类型 = %T", got["connections"])
	}
	if len(conns) != 0 {
		t.Errorf("长度 = %d, want 0", len(conns))
	}
}

// TestUserPluginConnectionsHandlerGetAfterCreate 建连接后 GET 能读回。
func TestUserPluginConnectionsHandlerGetAfterCreate(t *testing.T) {
	fx := userOwnedFixture(t)
	userPluginInstall(t, fx)

	createCtx := pluginCtx(t, fx.DB, http.MethodPost, "/api/plugins/connections",
		`{"plugin_key":"talebook.test.plugin","name":"读回连接"}`, 2, false)
	if got, err := UserPluginConnectionsHandler(fx.Cfg)(createCtx); err != nil || got["err"] != "ok" {
		t.Fatalf("创建连接失败: err=%v got=%v", err, got)
	}

	getCtx := pluginCtx(t, fx.DB, http.MethodGet, "/api/plugins/connections", "", 2, false)
	got, err := UserPluginConnectionsHandler(fx.Cfg)(getCtx)
	if err != nil {
		t.Fatalf("UserPluginConnectionsHandler: %v", err)
	}
	conns, _ := got["connections"].([]map[string]any)
	if len(conns) != 1 {
		t.Fatalf("connections 长度 = %d, want 1", len(conns))
	}
	if conns[0]["name"] != "读回连接" {
		t.Errorf("name = %v, want 读回连接", conns[0]["name"])
	}
}

// ---- UserPluginConnectionsHandler：POST 错误分支 ----

// TestUserPluginConnectionsHandlerPostInvalidBody 非法 JSON 返回错误信封。
func TestUserPluginConnectionsHandlerPostInvalidBody(t *testing.T) {
	fx := userOwnedFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/plugins/connections", "{not json", 2, false)

	got, err := UserPluginConnectionsHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("不应返回裸错误: %v", err)
	}
	if got["err"] == "ok" {
		t.Errorf("非法 JSON 应返回错误信封")
	}
}

// TestUserPluginConnectionsHandlerPostBothKeys 同时给两个键应被拒绝。
func TestUserPluginConnectionsHandlerPostBothKeys(t *testing.T) {
	fx := userOwnedFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/plugins/connections",
		`{"plugin_key":"talebook.test.plugin","installation_id":1}`, 2, false)

	got, err := UserPluginConnectionsHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("不应返回裸错误: %v", err)
	}
	if got["err"] == "ok" {
		t.Errorf("同时提供两个键应被拒绝")
	}
}

// TestUserPluginConnectionsHandlerPostUnknownPlugin 未知插件返回错误信封。
func TestUserPluginConnectionsHandlerPostUnknownPlugin(t *testing.T) {
	fx := userOwnedFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/plugins/connections",
		`{"plugin_key":"nope"}`, 2, false)

	got, err := UserPluginConnectionsHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("不应返回裸错误: %v", err)
	}
	if got["err"] == "ok" {
		t.Errorf("未知插件应返回错误信封")
	}
}

// TestUserPluginConnectionsHandlerPostMissingInstallation 不存在的安装返回错误信封。
func TestUserPluginConnectionsHandlerPostMissingInstallation(t *testing.T) {
	fx := userOwnedFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/plugins/connections",
		`{"installation_id":9999}`, 2, false)

	got, err := UserPluginConnectionsHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("不应返回裸错误: %v", err)
	}
	if got["err"] == "ok" {
		t.Errorf("不存在的安装应返回错误信封")
	}
}

// ---- UserPluginConnectionsHandler：POST 成功分支 ----

// TestUserPluginConnectionsHandlerPostByPluginKey 用 plugin_key 建连接。
func TestUserPluginConnectionsHandlerPostByPluginKey(t *testing.T) {
	fx := userOwnedFixture(t)
	userPluginInstall(t, fx)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/plugins/connections",
		`{"plugin_key":"talebook.test.plugin","name":"我的连接"}`, 2, false)

	got, err := UserPluginConnectionsHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("UserPluginConnectionsHandler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v, want ok", got["err"])
	}
	conn, ok := got["connection"].(map[string]any)
	if !ok {
		t.Fatalf("connection 类型 = %T", got["connection"])
	}
	if conn["name"] != "我的连接" {
		t.Errorf("name = %v, want 我的连接", conn["name"])
	}
}

// TestUserPluginConnectionsHandlerPostByInstallationID 用 installation_id 建连接。
func TestUserPluginConnectionsHandlerPostByInstallationID(t *testing.T) {
	fx := userOwnedFixture(t)
	installationID := userPluginInstall(t, fx)
	body := `{"installation_id":` + strconv.FormatInt(installationID, 10) + `}`
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/api/plugins/connections", body, 2, false)

	got, err := UserPluginConnectionsHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("UserPluginConnectionsHandler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v, want ok", got["err"])
	}
	if got["connection"] == nil {
		t.Errorf("connection 不应为 nil")
	}
}

// TestUserPluginConnectionsHandlerJSONShape 响应可被 JSON 序列化（前端契约）。
func TestUserPluginConnectionsHandlerJSONShape(t *testing.T) {
	fx := userOwnedFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/plugins/connections", "", 2, false)

	got, err := UserPluginConnectionsHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("UserPluginConnectionsHandler: %v", err)
	}
	if _, err := json.Marshal(got); err != nil {
		t.Fatalf("响应无法序列化: %v", err)
	}
}

// ---- pluginActiveUserInstallation ----

// TestPluginActiveUserInstallationUnknown 未知插件返回错误。
func TestPluginActiveUserInstallationUnknown(t *testing.T) {
	fx := userOwnedFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/plugins", "", 2, false)

	if _, _, err := fx.Cfg.pluginActiveUserInstallation(ctx, "nope"); err == nil {
		t.Fatalf("未知插件应报错")
	}
}

// TestPluginActiveUserInstallationDisabled 安装存在但未启用时返回错误。
//
// 注意：该函数在安装缺失时会自动 InstallBuiltin，因此「无安装」不可达；
// 真正会报错的分支是「安装存在但未 enabled/active」。
func TestPluginActiveUserInstallationDisabled(t *testing.T) {
	fx := userOwnedFixture(t)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/plugins", "", 2, false)

	// 先建出安装（默认 disabled），再调用。
	if _, err := pluginruntime.EnsureBuiltinInstallations(
		fx.DB, 2, fx.Cfg.Settings, fx.Registry); err != nil {
		t.Fatalf("EnsureBuiltinInstallations: %v", err)
	}

	if _, _, err := fx.Cfg.pluginActiveUserInstallation(ctx, "talebook.test.plugin"); err == nil {
		t.Fatalf("未启用的安装应报错")
	}
}

// TestPluginActiveUserInstallationOwnerForbidden 插件不支持用户连接时返回错误。
func TestPluginActiveUserInstallationOwnerForbidden(t *testing.T) {
	// netManifest 默认 connection_owners 为 ["instance"]，不含 "user"。
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/plugins", "", 2, false)

	if _, _, err := fx.Cfg.pluginActiveUserInstallation(ctx, "talebook.test.plugin"); err == nil {
		t.Fatalf("不支持用户连接的插件应报错")
	}
}

// TestPluginActiveUserInstallationOK 已安装时返回 manifest 与安装记录。
func TestPluginActiveUserInstallationOK(t *testing.T) {
	fx := userOwnedFixture(t)
	userPluginInstall(t, fx)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/plugins", "", 2, false)

	manifest, installation, err := fx.Cfg.pluginActiveUserInstallation(ctx, "talebook.test.plugin")
	if err != nil {
		t.Fatalf("pluginActiveUserInstallation: %v", err)
	}
	if manifest == nil {
		t.Errorf("manifest 不应为 nil")
	}
	if installation == nil {
		t.Fatalf("installation 不应为 nil")
	}
	if installation.ID == 0 {
		t.Errorf("installation.ID 不应为 0")
	}
}
