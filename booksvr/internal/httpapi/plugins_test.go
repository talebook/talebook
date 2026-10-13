package httpapi

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginproto"
	"talebook/booksvr/internal/pluginruntime"
	"talebook/booksvr/internal/userdb"
)

// pluginFixture 是一次插件管理测试的完整环境。
type pluginFixture struct {
	DB       *sql.DB
	Cfg      PluginConfig
	Registry *pluginruntime.PluginRegistry
	Provider *netProvider
}

// newPluginFixture 建库、注册一个插件 provider 并返回可用的配置。
func newPluginFixture(t *testing.T, pluginKey string,
	handler func(string, []any, map[string]any) (any, error)) *pluginFixture {
	t.Helper()
	db := netSchemaDB(t)
	if _, err := db.Exec(`INSERT INTO readers (id, username, password, admin, active, permission, create_time)
		VALUES (1, 'admin', 'x', 1, 1, '', '2026-01-01 00:00:00')`); err != nil {
		t.Fatalf("插入管理员失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO readers (id, username, password, admin, active, permission, create_time)
		VALUES (2, 'user', 'x', 0, 1, '', '2026-01-01 00:00:00')`); err != nil {
		t.Fatalf("插入普通用户失败: %v", err)
	}

	reg := pluginruntime.NewPluginRegistry()
	p := &netProvider{manifest: netManifest(pluginKey), handler: handler}
	caps := pluginiface.CapabilitySet{
		Interfaces:   map[string]bool{"SourceProvider": true},
		HasSelfCheck: true,
		DownloadMode: pluginiface.DownloadNone,
		Methods: map[string]bool{
			"search": true, "browse": true, "get_categories": true, "get_book": true,
			"download": true, "get_toc": true, "get_chapter": true, "self_check": true,
		},
	}
	if _, err := reg.Register(p, caps); err != nil {
		t.Fatalf("Register: %v", err)
	}

	settings := map[string]any{"PLUGIN_SECRET_KEY": "test-key-123"}
	cfg := PluginConfig{Settings: settings, Registry: reg}
	return &pluginFixture{DB: db, Cfg: cfg, Registry: reg, Provider: p}
}

// pluginCtx 构造一个测试用 Context。
func pluginCtx(t *testing.T, db *sql.DB, method, target, body string, userID int64, isAdmin bool) *Context {
	t.Helper()
	req := httptest.NewRequest(method, target, strings.NewReader(body))
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	return &Context{
		Request:  req,
		Writer:   httptest.NewRecorder(),
		DB:       db,
		Identity: Identity{UserID: userID, IsAdmin: isAdmin},
	}
}

// pluginRecorder 取回响应记录器。
func pluginRecorder(ctx *Context) *httptest.ResponseRecorder {
	return ctx.Writer.(*httptest.ResponseRecorder)
}

// ---- 路由 ----

func TestPluginRouteSpecs(t *testing.T) {
	specs := PluginRouteSpecs(PluginConfig{})
	if len(specs) != 20 {
		t.Fatalf("len = %d, want 20", len(specs))
	}
	adminCount := 0
	for _, s := range specs {
		if !s.Auth {
			t.Errorf("%s 应要求登录", s.Pattern)
		}
		if s.Admin {
			adminCount++
			if !strings.HasPrefix(s.Pattern, "/api/admin/plugins") {
				t.Errorf("%s 标了 Admin 但不在 admin 前缀下", s.Pattern)
			}
		}
	}
	if adminCount != 13 {
		t.Errorf("admin 路由 = %d, want 13", adminCount)
	}
}

// ---- 小工具 ----

func TestPluginBool(t *testing.T) {
	cases := []struct {
		value any
		want  bool
	}{
		{nil, false}, {true, true}, {false, false},
		{"", false}, {"x", true},
		{float64(0), false}, {float64(1), true},
		{int(0), false}, {int64(2), true},
		{[]any{}, false}, {[]any{1}, true},
		{map[string]any{}, false}, {map[string]any{"a": 1}, true},
	}
	for _, tc := range cases {
		if got := pluginBool(tc.value); got != tc.want {
			t.Errorf("pluginBool(%#v) = %v, want %v", tc.value, got, tc.want)
		}
	}
}

func TestPluginInt(t *testing.T) {
	cases := []struct {
		value    any
		fallback int64
		want     int64
	}{
		{float64(3), 0, 3}, {int(4), 0, 4}, {int64(5), 0, 5},
		{json.Number("6"), 0, 6}, {"7", 0, 7}, {" 8 ", 0, 8},
		{"x", 9, 9}, {nil, 10, 10},
	}
	for _, tc := range cases {
		if got := pluginInt(tc.value, tc.fallback); got != tc.want {
			t.Errorf("pluginInt(%#v) = %d, want %d", tc.value, got, tc.want)
		}
	}
}

func TestPluginTruncate(t *testing.T) {
	if got := pluginTruncate("abc", 5); got != "abc" {
		t.Errorf("短串 = %q", got)
	}
	if got := pluginTruncate("abcdef", 3); got != "abc" {
		t.Errorf("截断 = %q", got)
	}
	// 按字符而非字节截断。
	if got := pluginTruncate("中文测试", 2); got != "中文" {
		t.Errorf("中文截断 = %q", got)
	}
}

func TestPluginBody(t *testing.T) {
	db := netSchemaDB(t)

	ctx := pluginCtx(t, db, http.MethodPost, "/", "", 1, true)
	got, err := pluginBody(ctx)
	if err != nil {
		t.Fatalf("空体: %v", err)
	}
	if len(got) != 0 {
		t.Errorf("空体应返回空 map，得到 %v", got)
	}

	ctx = pluginCtx(t, db, http.MethodPost, "/", `{"a":1}`, 1, true)
	got, err = pluginBody(ctx)
	if err != nil {
		t.Fatalf("合法体: %v", err)
	}
	if pluginInt(got["a"], 0) != 1 {
		t.Errorf("a = %v", got["a"])
	}

	ctx = pluginCtx(t, db, http.MethodPost, "/", `not json`, 1, true)
	if _, err := pluginBody(ctx); err == nil {
		t.Error("非法 JSON 应报错")
	} else if pluginruntime.ErrorCodeOf(err) != "plugin.request_invalid" {
		t.Errorf("code = %s", pluginruntime.ErrorCodeOf(err))
	}

	ctx = pluginCtx(t, db, http.MethodPost, "/", `[1,2]`, 1, true)
	if _, err := pluginBody(ctx); err == nil {
		t.Error("非对象应报错")
	}
}

func TestPluginError(t *testing.T) {
	err := pluginruntime.NewPluginRuntimeError("plugin.request_invalid", "bad", false)
	got := pluginError(err)
	if got["err"] != "plugin.request_invalid" || got["msg"] != "bad" {
		t.Errorf("got = %v", got)
	}
	// 非插件错误退化为 plugin.execution_failed（ErrorCodeOf 的默认值）。
	got = pluginError(errorsNew("boom"))
	if got["err"] != "plugin.execution_failed" {
		t.Errorf("err = %v", got["err"])
	}
}

// ---- _book_query ----

func TestPluginBookQuery(t *testing.T) {
	db := netSchemaDB(t)

	ctx := pluginCtx(t, db, http.MethodPost, "/", `{"query":{"title":"三体","authors":"a, b"}}`, 1, true)
	got, err := pluginBookQuery(ctx)
	if err != nil {
		t.Fatalf("pluginBookQuery: %v", err)
	}
	if got["title"] != "三体" {
		t.Errorf("title = %v", got["title"])
	}
	authors := got["authors"].([]string)
	if len(authors) != 2 || authors[0] != "a" || authors[1] != "b" {
		t.Errorf("authors = %v", authors)
	}
}

func TestPluginBookQueryRejectsUnknownField(t *testing.T) {
	db := netSchemaDB(t)
	ctx := pluginCtx(t, db, http.MethodPost, "/", `{"query":{"nope":"x"}}`, 1, true)
	if _, err := pluginBookQuery(ctx); err == nil {
		t.Fatal("未知字段应报错")
	}
}

func TestPluginBookQueryRequiresTitleOrISBN(t *testing.T) {
	db := netSchemaDB(t)
	ctx := pluginCtx(t, db, http.MethodPost, "/", `{"query":{"publisher":"x"}}`, 1, true)
	if _, err := pluginBookQuery(ctx); err == nil {
		t.Fatal("title 与 isbn 都为空应报错")
	}
}

func TestPluginBookQueryRejectsTooManyAuthors(t *testing.T) {
	db := netSchemaDB(t)
	ctx := pluginCtx(t, db, http.MethodPost, "/",
		`{"query":{"title":"x","authors":["1","2","3","4","5","6","7","8","9"]}}`, 1, true)
	if _, err := pluginBookQuery(ctx); err == nil {
		t.Fatal("超过 8 个作者应报错")
	}
}

func TestPluginBookQueryRejectsNonStringAuthors(t *testing.T) {
	db := netSchemaDB(t)
	ctx := pluginCtx(t, db, http.MethodPost, "/", `{"query":{"title":"x","authors":[1]}}`, 1, true)
	if _, err := pluginBookQuery(ctx); err == nil {
		t.Fatal("非字符串作者应报错")
	}
}

// ---- 摘要函数 ----

func TestPluginMetadataSummary(t *testing.T) {
	got := pluginMetadataSummary(map[string]any{
		"title": "三体", "author": "刘慈欣", "comments": strings.Repeat("x", 600),
	})
	if got["title"] != "三体" {
		t.Errorf("title = %v", got["title"])
	}
	authors := got["authors"].([]string)
	if len(authors) != 1 || authors[0] != "刘慈欣" {
		t.Errorf("authors = %v", authors)
	}
	if len([]rune(got["comments"].(string))) != 500 {
		t.Errorf("comments 长度 = %d", len([]rune(got["comments"].(string))))
	}
}

func TestPluginSourceSummaryKeys(t *testing.T) {
	got := pluginSourceSummary(map[string]any{"external_id": "e1", "title": "t", "extra": "drop"})
	if _, ok := got["extra"]; ok {
		t.Error("extra 不应出现在摘要里")
	}
	if got["external_id"] != "e1" {
		t.Errorf("external_id = %v", got["external_id"])
	}
}

func TestPluginReviewSummaryKeys(t *testing.T) {
	got := pluginReviewSummary(map[string]any{"source": "s", "rating": 5, "extra": "drop"})
	if _, ok := got["extra"]; ok {
		t.Error("extra 不应出现在摘要里")
	}
	if got["source"] != "s" {
		t.Errorf("source = %v", got["source"])
	}
}

func TestPluginFailureSummary(t *testing.T) {
	got := pluginFailureSummary(map[string]any{"external_id": "e", "error_code": "c"})
	if got["external_id"] != "e" || got["error_code"] != "c" || got["error_message"] != "" {
		t.Errorf("got = %v", got)
	}
}

// ---- AdminPluginPreferences ----

func TestAdminPluginPreferencesGet(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	fx.Cfg.Settings["auto_fill_meta"] = true
	fx.Cfg.Settings["DEVICES"] = []any{map[string]any{"name": "d"}}

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/plugins/preferences", "", 1, true)
	got, err := AdminPluginPreferencesHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	metadata := got["metadata"].(map[string]any)
	if metadata["auto_fill_meta"] != true {
		t.Errorf("auto_fill_meta = %v", metadata["auto_fill_meta"])
	}
	if metadata["auto_fill_keep_cover"] != false {
		t.Errorf("auto_fill_keep_cover = %v", metadata["auto_fill_keep_cover"])
	}
	if len(got["devices"].([]any)) != 1 {
		t.Errorf("devices = %v", got["devices"])
	}
}

func TestAdminPluginPreferencesPostRequiresUpdate(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/", `{}`, 1, true)
	got, err := AdminPluginPreferencesHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "plugin.request_invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminPluginPreferencesPostRejectsNonBool(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/", `{"metadata":{"auto_fill_meta":"yes"}}`, 1, true)
	got, err := AdminPluginPreferencesHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "plugin.request_invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminPluginPreferencesPostSaves(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	var saved map[string]any
	fx.Cfg.SaveExtraSettings = func(_ *Context, args map[string]any) (map[string]any, error) {
		saved = args
		return map[string]any{"err": "ok"}, nil
	}
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/", `{"metadata":{"auto_fill_meta":true}}`, 1, true)
	got, err := AdminPluginPreferencesHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" || got["auto_fill_meta"] != true {
		t.Errorf("got = %v", got)
	}
	if saved["auto_fill_meta"] != true {
		t.Errorf("未透传给设置保存器: %v", saved)
	}
}

// ---- _validate_devices ----

func TestPluginValidateDevices(t *testing.T) {
	got, err := pluginValidateDevices([]any{
		map[string]any{"name": "K", "type": "KINDLE", "mailbox": "a@b.c"},
		map[string]any{"name": "D", "type": "duokan", "ip": "1.2.3.4", "port": 8080},
	})
	if err != nil {
		t.Fatalf("pluginValidateDevices: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("len = %d", len(got))
	}
	if got[0]["type"] != "kindle" || got[0]["mailbox"] != "a@b.c" {
		t.Errorf("kindle = %v", got[0])
	}
	if _, ok := got[0]["ip"]; ok {
		t.Error("kindle 不应有 ip")
	}
	if got[1]["schema"] != "http" || pluginInt(got[1]["port"], 0) != 8080 {
		t.Errorf("device = %v", got[1])
	}
}

func TestPluginValidateDevicesRejects(t *testing.T) {
	cases := []struct {
		name  string
		value any
	}{
		{"非列表", "x"},
		{"元素非对象", []any{"x"}},
		{"缺名字", []any{map[string]any{"type": "kindle"}}},
		{"缺类型", []any{map[string]any{"name": "n"}}},
		{"端口越界", []any{map[string]any{"name": "n", "type": "d", "port": 70000}}},
		{"schema 非法", []any{map[string]any{"name": "n", "type": "d", "port": 80, "schema": "ftp"}}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := pluginValidateDevices(tc.value); err == nil {
				t.Error("应报错")
			}
		})
	}
}

// ---- AdminPluginInstall / InstallationState ----

func TestAdminPluginInstallAndState(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/",
		`{"plugin_key":"talebook.test.plugin"}`, 1, true)
	got, err := AdminPluginInstallHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("install: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("install err = %v, msg = %v", got["err"], got["msg"])
	}
	installation := got["installation"].(map[string]any)
	installationID := pluginInt(installation["id"], 0)
	if installationID == 0 {
		t.Fatal("installation id 为 0")
	}

	// 关闭安装。
	ctx = pluginCtx(t, fx.DB, http.MethodPost, "/", `{"enabled":false}`, 1, true)
	ctx.Params = []string{jsonNumber(installationID)}
	got, err = AdminPluginInstallationStateHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("state: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("state err = %v", got["err"])
	}
	if got["installation"].(map[string]any)["enabled"] != false {
		t.Errorf("enabled = %v", got["installation"].(map[string]any)["enabled"])
	}
}

func TestAdminPluginInstallationStateRejectsNonBool(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/", `{"enabled":"yes"}`, 1, true)
	ctx.Params = []string{"1"}
	got, err := AdminPluginInstallationStateHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "plugin.request_invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminPluginInstallationStateMissing(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/", `{"enabled":true}`, 1, true)
	ctx.Params = []string{"999"}
	got, err := AdminPluginInstallationStateHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "plugin.installation_missing" {
		t.Errorf("err = %v", got["err"])
	}
}

// ---- AdminPlugins ----

func TestAdminPluginsListsRegistered(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/plugins", "", 1, true)

	got, err := AdminPluginsHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v, msg = %v", got["err"], got["msg"])
	}
	defs := got["definitions"].([]map[string]any)
	if len(defs) != 1 || defs[0]["plugin_key"] != "talebook.test.plugin" {
		t.Errorf("definitions = %v", defs)
	}
	insts := got["installations"].([]map[string]any)
	if len(insts) != 1 {
		t.Errorf("installations = %v", insts)
	}
	if _, ok := got["builtin_state"]; !ok {
		t.Error("缺少 builtin_state")
	}
}

// ---- AdminPluginConnections ----

func TestAdminPluginConnectionsGetEmpty(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/plugins/connections", "", 1, true)

	got, err := AdminPluginConnectionsHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	if len(got["connections"].([]map[string]any)) != 0 {
		t.Errorf("connections = %v", got["connections"])
	}
	if len(got["user_connection_health"].([]map[string]any)) != 0 {
		t.Errorf("health = %v", got["user_connection_health"])
	}
}

func TestAdminPluginConnectionsPostRejectsForeignOwner(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/", `{"owner_type":"user"}`, 1, true)

	got, err := AdminPluginConnectionsHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "plugin.owner_forbidden" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminPluginConnectionsPostSaves(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	// 先安装，才有 installation_id。
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/", `{"plugin_key":"talebook.test.plugin"}`, 1, true)
	installed, err := AdminPluginInstallHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("install: %v", err)
	}
	installationID := pluginInt(installed["installation"].(map[string]any)["id"], 0)

	body := `{"installation_id":` + jsonNumber(installationID) + `,"name":"默认","role":"default"}`
	ctx = pluginCtx(t, fx.DB, http.MethodPost, "/", body, 1, true)
	got, err := AdminPluginConnectionsHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v, msg = %v", got["err"], got["msg"])
	}
	connection := got["connection"].(map[string]any)
	if connection["owner_type"] != "instance" {
		t.Errorf("owner_type = %v", connection["owner_type"])
	}
	if connection["role"] != "default" {
		t.Errorf("role = %v", connection["role"])
	}
}

// ---- AdminPluginConnectionState ----

func TestAdminPluginConnectionState(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	connectionID := pluginSeedInstanceConnection(t, fx)

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/", `{"enabled":false}`, 1, true)
	ctx.Params = []string{jsonNumber(connectionID)}
	got, err := AdminPluginConnectionStateHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v, msg = %v", got["err"], got["msg"])
	}
	if got["connection"].(map[string]any)["enabled"] != false {
		t.Errorf("enabled = %v", got["connection"].(map[string]any)["enabled"])
	}
}

func TestAdminPluginConnectionStateRejectsUserConnection(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	connectionID := pluginSeedInstanceConnection(t, fx)
	if _, err := fx.DB.Exec(`UPDATE plugin_connections SET owner_type='user', owner_id=2 WHERE id=?`,
		connectionID); err != nil {
		t.Fatalf("update: %v", err)
	}
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/", `{"enabled":true}`, 1, true)
	ctx.Params = []string{jsonNumber(connectionID)}
	got, err := AdminPluginConnectionStateHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "plugin.connection_forbidden" {
		t.Errorf("err = %v", got["err"])
	}
}

// ---- UserPlugins ----

func TestUserPluginsHidesNonUserOwners(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/plugins", "", 2, false)

	got, err := UserPluginsHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v, msg = %v", got["err"], got["msg"])
	}
	// netManifest 的 connection_owners 是 ["instance"]，用户侧应看不到。
	if len(got["plugins"].([]map[string]any)) != 0 {
		t.Errorf("plugins = %v", got["plugins"])
	}
}

func TestUserPluginsShowsUserOwned(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	manifest := netManifest("talebook.test.plugin")
	manifest["connection_owners"] = []any{"instance", "user"}
	pluginReRegister(t, fx, manifest)

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/plugins", "", 2, false)
	got, err := UserPluginsHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	plugins := got["plugins"].([]map[string]any)
	if len(plugins) != 1 {
		t.Fatalf("plugins = %v", plugins)
	}
	if plugins[0]["plugin_key"] != "talebook.test.plugin" {
		t.Errorf("plugin_key = %v", plugins[0]["plugin_key"])
	}
	if plugins[0]["latest_run"] != nil {
		t.Errorf("latest_run = %v", plugins[0]["latest_run"])
	}
}

// ---- UserPluginState ----

func TestUserPluginStateUnknownPlugin(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/plugins/nope", "", 2, false)
	ctx.Params = []string{"nope"}

	got, err := UserPluginStateHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] == "ok" {
		t.Error("未知插件不应返回 ok")
	}
}

func TestUserPluginStateKnownPlugin(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/plugins/talebook.test.plugin", "", 2, false)
	ctx.Params = []string{"talebook.test.plugin"}

	got, err := UserPluginStateHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v, msg = %v", got["err"], got["msg"])
	}
	plugin := got["plugin"].(map[string]any)
	if plugin["plugin_key"] != "talebook.test.plugin" {
		t.Errorf("plugin_key = %v", plugin["plugin_key"])
	}
	if got["installation"] != nil {
		t.Errorf("未安装时 installation 应为 nil，得到 %v", got["installation"])
	}
}

// ---- 能力测试 ----

func TestAdminPluginSourceSearchRejectsEmptyQuery(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/", `{"query":"  "}`, 1, true)
	ctx.Params = []string{"talebook.test.plugin"}

	got, err := AdminPluginSourceSearchHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "plugin.request_invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminPluginSourceSearchUnsupportedCapability(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	// netManifest 声明了 sources.search，这里换一个不声明它的清单。
	manifest := netManifest("talebook.test.plugin")
	manifest["capabilities"] = []any{"metadata.lookup"}
	manifest["categories"] = []any{"sources", "metadata"}
	pluginReRegister(t, fx, manifest)

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/", `{"query":"x"}`, 1, true)
	ctx.Params = []string{"talebook.test.plugin"}
	got, err := AdminPluginSourceSearchHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "plugin.capability_not_supported" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminPluginSourceSearchDisabledInstallation(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/", `{"plugin_key":"talebook.test.plugin"}`, 1, true)
	if _, err := AdminPluginInstallHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("install: %v", err)
	}
	if _, err := fx.DB.Exec(`UPDATE plugin_installations SET enabled = 0`); err != nil {
		t.Fatalf("update: %v", err)
	}

	ctx = pluginCtx(t, fx.DB, http.MethodPost, "/", `{"query":"x"}`, 1, true)
	ctx.Params = []string{"talebook.test.plugin"}
	got, err := AdminPluginSourceSearchHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "plugin.installation_disabled" {
		t.Errorf("err = %v", got["err"])
	}
}

// TestAdminPluginSourceSearchNoConnection 验证 connection_missing 分支。
//
// 注意：只要清单的 connection_owners 含 instance，EnsureBuiltinInstallations
// 就会物化一条启用的内置连接，因此该分支只能由「不声明 instance 归属」的插件到达。
func TestAdminPluginSourceSearchNoConnection(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	manifest := netManifest("talebook.test.plugin")
	manifest["connection_owners"] = []any{"user"}
	pluginReRegister(t, fx, manifest)

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/", `{"plugin_key":"talebook.test.plugin"}`, 1, true)
	if _, err := AdminPluginInstallHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("install: %v", err)
	}
	if _, err := fx.DB.Exec(`UPDATE plugin_installations SET enabled = 1`); err != nil {
		t.Fatalf("update: %v", err)
	}

	ctx = pluginCtx(t, fx.DB, http.MethodPost, "/", `{"query":"x"}`, 1, true)
	ctx.Params = []string{"talebook.test.plugin"}
	got, err := AdminPluginSourceSearchHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "plugin.connection_missing" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminPluginSourceSearchSuccess(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin",
		func(method string, args []any, _ map[string]any) (any, error) {
			if method != "search" {
				t.Errorf("method = %q", method)
			}
			if args[0] != "三体" {
				t.Errorf("query = %v", args[0])
			}
			return map[string]any{
				"items": []any{map[string]any{"external_id": "e1", "title": "三体"}},
				"failures": []any{map[string]any{
					"external_id": "e2", "error_code": "c", "error_message": "m",
				}},
				"has_more":       true,
				"health_message": "ok",
			}, nil
		})
	pluginEnableWithConnection(t, fx)

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/", `{"query":"三体"}`, 1, true)
	ctx.Params = []string{"talebook.test.plugin"}
	got, err := AdminPluginSourceSearchHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v, msg = %v", got["err"], got["msg"])
	}
	if got["capability"] != "sources.search" {
		t.Errorf("capability = %v", got["capability"])
	}
	items := got["items"].([]map[string]any)
	if len(items) != 1 || items[0]["external_id"] != "e1" {
		t.Errorf("items = %v", items)
	}
	failures := got["failures"].([]map[string]any)
	if len(failures) != 1 || failures[0]["error_code"] != "c" {
		t.Errorf("failures = %v", failures)
	}
	if got["has_more"] != true || got["health_message"] != "ok" {
		t.Errorf("has_more = %v, health = %v", got["has_more"], got["health_message"])
	}
}

func TestAdminPluginMetadataSearchSuccess(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin",
		func(method string, args []any, _ map[string]any) (any, error) {
			if method != "search_books" {
				t.Errorf("method = %q", method)
			}
			return []any{map[string]any{"title": "三体", "authors": []any{"刘慈欣"}}}, nil
		})
	manifest := netManifest("talebook.test.plugin")
	manifest["capabilities"] = []any{"metadata.lookup"}
	manifest["categories"] = []any{"sources", "metadata"}
	pluginReRegister(t, fx, manifest)
	pluginEnableWithConnection(t, fx)

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/", `{"query":{"title":"三体"}}`, 1, true)
	ctx.Params = []string{"talebook.test.plugin"}
	got, err := AdminPluginMetadataSearchHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v, msg = %v", got["err"], got["msg"])
	}
	items := got["items"].([]map[string]any)
	if len(items) != 1 || items[0]["title"] != "三体" {
		t.Errorf("items = %v", items)
	}
}

func TestAdminPluginReviewLookupSuccess(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin",
		func(method string, args []any, _ map[string]any) (any, error) {
			if method != "get_reviews" {
				t.Errorf("method = %q", method)
			}
			return map[string]any{
				"items": []any{map[string]any{"source": "douban", "rating": 9}},
			}, nil
		})
	manifest := netManifest("talebook.test.plugin")
	manifest["capabilities"] = []any{"reviews.lookup"}
	manifest["categories"] = []any{"sources", "reviews"}
	pluginReRegister(t, fx, manifest)
	pluginEnableWithConnection(t, fx)

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/", `{"query":{"title":"三体"}}`, 1, true)
	ctx.Params = []string{"talebook.test.plugin"}
	got, err := AdminPluginReviewLookupHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v, msg = %v", got["err"], got["msg"])
	}
	items := got["items"].([]map[string]any)
	if len(items) != 1 || items[0]["source"] != "douban" {
		t.Errorf("items = %v", items)
	}
}

// ---- 运行历史 ----

func TestAdminPluginRunsEmpty(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/plugins/runs", "", 1, true)

	got, err := AdminPluginRunsHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" || len(got["runs"].([]map[string]any)) != 0 {
		t.Errorf("got = %v", got)
	}
}

func TestAdminPluginRunsRejectsBadConnectionID(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/plugins/runs?connection_id=abc", "", 1, true)

	got, err := AdminPluginRunsHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "plugin.request_invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminPluginRunsListsInstanceRuns(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	connectionID := pluginSeedInstanceConnection(t, fx)
	pluginSeedRun(t, fx, connectionID, "run", "succeeded")

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/plugins/runs?include_items=true", "", 1, true)
	got, err := AdminPluginRunsHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	runs := got["runs"].([]map[string]any)
	if len(runs) != 1 {
		t.Fatalf("runs = %v", runs)
	}
	if runs[0]["action"] != "run" {
		t.Errorf("action = %v", runs[0]["action"])
	}
	if _, ok := runs[0]["items"]; !ok {
		t.Error("include_items=true 时应带 items")
	}
}

func TestUserPluginRunsOnlyOwn(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	instanceID := pluginSeedInstanceConnection(t, fx)
	pluginSeedRun(t, fx, instanceID, "run", "succeeded")

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/plugins/runs", "", 2, false)
	got, err := UserPluginRunsHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if len(got["runs"].([]map[string]any)) != 0 {
		t.Errorf("普通用户不应看到实例运行: %v", got["runs"])
	}
}

func TestAdminPluginRunDetailMissing(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/plugins/runs/999", "", 1, true)
	ctx.Params = []string{"999"}

	got, err := AdminPluginRunDetailHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "plugin.run_missing" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminPluginRunDetailSuccess(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	connectionID := pluginSeedInstanceConnection(t, fx)
	runID := pluginSeedRun(t, fx, connectionID, "run", "succeeded")

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/plugins/runs/1", "", 1, true)
	ctx.Params = []string{jsonNumber(runID)}
	got, err := AdminPluginRunDetailHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v, msg = %v", got["err"], got["msg"])
	}
	if got["run"].(map[string]any)["action"] != "run" {
		t.Errorf("run = %v", got["run"])
	}
}

func TestUserPluginRunDetailRejectsForeignRun(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	connectionID := pluginSeedInstanceConnection(t, fx)
	runID := pluginSeedRun(t, fx, connectionID, "run", "succeeded")

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/plugins/runs/1", "", 2, false)
	ctx.Params = []string{jsonNumber(runID)}
	got, err := UserPluginRunDetailHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "plugin.run_missing" {
		t.Errorf("err = %v", got["err"])
	}
}

// ---- 动作 ----

func TestAdminPluginActionRejectsUserConnection(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	connectionID := pluginSeedInstanceConnection(t, fx)
	if _, err := fx.DB.Exec(`UPDATE plugin_connections SET owner_type='user', owner_id=2 WHERE id=?`,
		connectionID); err != nil {
		t.Fatalf("update: %v", err)
	}
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/", `{}`, 1, true)
	ctx.Params = []string{jsonNumber(connectionID), "run"}

	got, err := AdminPluginActionHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "plugin.connection_forbidden" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestUserPluginActionRejectsForeignConnection(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	connectionID := pluginSeedInstanceConnection(t, fx)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/", `{}`, 2, false)
	ctx.Params = []string{jsonNumber(connectionID), "run"}

	got, err := UserPluginActionHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "plugin.connection_forbidden" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminPluginActionUnsupportedAction(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	connectionID := pluginSeedInstanceConnection(t, fx)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/", `{}`, 1, true)
	ctx.Params = []string{jsonNumber(connectionID), "nope"}

	got, err := AdminPluginActionHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "plugin.action_invalid" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminPluginActionNotWired(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	pluginDeclareRunAction(t, fx)
	connectionID := pluginSeedInstanceConnection(t, fx)
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/", `{}`, 1, true)
	ctx.Params = []string{jsonNumber(connectionID), "run"}

	got, err := AdminPluginActionHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "plugin.not_wired" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestAdminPluginActionExecutes(t *testing.T) {
	fx := newPluginFixture(t, "talebook.test.plugin", nil)
	pluginDeclareRunAction(t, fx)
	connectionID := pluginSeedInstanceConnection(t, fx)
	var executed int64
	fx.Cfg.ExecuteRun = func(_ *Context, runID int64) error {
		executed = runID
		return nil
	}
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/", `{}`, 1, true)
	ctx.Params = []string{jsonNumber(connectionID), "run"}

	got, err := AdminPluginActionHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v, msg = %v", got["err"], got["msg"])
	}
	if executed == 0 {
		t.Error("未调用执行器")
	}
	run := got["run"].(map[string]any)
	if run["action"] != "run" || run["status"] != "queued" {
		t.Errorf("run = %v", run)
	}
}

// ---- 测试辅助 ----

// pluginDeclareRunAction 让插件清单声明 run 动作（netManifest 默认只有 test）。
func pluginDeclareRunAction(t *testing.T, fx *pluginFixture) {
	t.Helper()
	manifest := netManifest("talebook.test.plugin")
	manifest["actions"] = []any{"test", "run", "retry", "rollback", "preview"}
	pluginReRegister(t, fx, manifest)
}

// pluginEnableWithConnection 安装插件并建一条启用的实例连接。
func pluginEnableWithConnection(t *testing.T, fx *pluginFixture) {
	t.Helper()
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/", `{"plugin_key":"talebook.test.plugin"}`, 1, true)
	if _, err := AdminPluginInstallHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("install: %v", err)
	}
	if _, err := fx.DB.Exec(`UPDATE plugin_installations SET enabled = 1, status = 'active'`); err != nil {
		t.Fatalf("enable: %v", err)
	}
	pluginSeedInstanceConnection(t, fx)
}

// pluginReRegister 用新清单替换注册表里的 provider。
//
// 清单必须自洽：capabilities 的前缀要在 categories 里，download_mode 要与
// SourceProvider 声明一致，声明了 test 就要实现 self_check。
func pluginReRegister(t *testing.T, fx *pluginFixture, manifest map[string]any) {
	t.Helper()
	reg := pluginruntime.NewPluginRegistry()
	if _, err := reg.Register(&netProvider{manifest: manifest, handler: fx.Provider.handler},
		pluginiface.CapabilitySet{
			Interfaces: map[string]bool{
				"SourceProvider": true, "MetadataProvider": true, "ReviewProvider": true,
			},
			HasSelfCheck: true,
			DownloadMode: pluginiface.DownloadNone,
			Methods: map[string]bool{
				"search": true, "search_books": true, "get_reviews": true, "self_check": true,
			},
		}); err != nil {
		t.Fatalf("Register: %v", err)
	}
	fx.Cfg.Registry = reg
}

// pluginSeedInstanceConnection 建一条启用的实例连接并返回其 id。
func pluginSeedInstanceConnection(t *testing.T, fx *pluginFixture) int64 {
	t.Helper()
	installation, err := userdb.GetPluginInstallationByKey(fx.DB, "talebook.test.plugin")
	if err != nil {
		t.Fatalf("GetPluginInstallationByKey: %v", err)
	}
	if installation == nil {
		ctx := pluginCtx(t, fx.DB, http.MethodPost, "/", `{"plugin_key":"talebook.test.plugin"}`, 1, true)
		if _, err := AdminPluginInstallHandler(fx.Cfg)(ctx); err != nil {
			t.Fatalf("install: %v", err)
		}
		installation, err = userdb.GetPluginInstallationByKey(fx.DB, "talebook.test.plugin")
		if err != nil || installation == nil {
			t.Fatalf("安装后仍取不到: %v", err)
		}
	}
	res, err := fx.DB.Exec(`INSERT INTO plugin_connections
		(installation_id, owner_type, owner_id, role, name, config, scopes, schedule,
		 cursor, health, health_message, enabled, create_time, update_time)
		VALUES (?, 'instance', 0, 'default', '默认', '{}', '["books.read"]', '',
		 '{}', 'unknown', '', 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00')`,
		installation.ID)
	if err != nil {
		t.Fatalf("插入连接失败: %v", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		t.Fatalf("LastInsertId: %v", err)
	}
	return id
}

// pluginSeedRun 建一条运行记录并返回其 id。
func pluginSeedRun(t *testing.T, fx *pluginFixture, connectionID int64, action, status string) int64 {
	t.Helper()
	res, err := fx.DB.Exec(`INSERT INTO plugin_runs
		(connection_id, action, "trigger", status, requested_by, attempt, counts,
		 cursor_before, cursor_after, input_data, error_code, error_message,
		 create_time, duration_ms)
		VALUES (?, ?, 'manual', ?, 1, 1, '{}', '{}', '{}', '{}', '', '',
		 '2026-01-01 00:00:00', 0)`, connectionID, action, status)
	if err != nil {
		t.Fatalf("插入 run 失败: %v", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		t.Fatalf("LastInsertId: %v", err)
	}
	return id
}

// jsonNumber 把整数渲染成 JSON 字面量。
func jsonNumber(v int64) string {
	return strings.TrimSpace(string(mustJSON(v)))
}

// mustJSON 序列化任意值；失败时 panic（仅测试用）。
func mustJSON(v any) []byte {
	raw, err := json.Marshal(v)
	if err != nil {
		panic(err)
	}
	return raw
}

// errorsNew 是 errors.New 的薄封装，避免与已有导入冲突。
func errorsNew(text string) error {
	return &pluginTestError{text}
}

// pluginTestError 是一个最小的错误实现。
type pluginTestError struct{ text string }

func (e *pluginTestError) Error() string { return e.text }

// 确保 pluginproto 被引用（ValidateAgainstSchema 在 feature 路径使用）。
var _ = pluginproto.ValidateAgainstSchema
