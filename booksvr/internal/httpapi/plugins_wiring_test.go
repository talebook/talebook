package httpapi

import (
	"encoding/json"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"talebook/booksvr/internal/pluginbuiltin"
	"talebook/booksvr/internal/pluginruntime"
	"testing"
)

// TestPluginConfigSaveExtraSettingsWired 覆盖 OPDS 服务开关真正写回配置文件。
//
// 回归真实缺陷：Serve 构造 PluginConfig 时只给了 Settings/Registry/ExecuteRun，
// 没给 SaveExtraSettings，导致 POST /api/admin/plugins/opds-service 恒返回
// plugin.not_wired，OPDS 开关在 booksvr 下完全不可用。
func TestPluginConfigSaveExtraSettingsWired(t *testing.T) {
	db, dbPath := newTestDBFile(t)

	rawSchema, err := os.ReadFile(filepath.Join("..", "userdb", "testdata", "schema.sql"))
	if err != nil {
		t.Fatal(err)
	}
	for _, stmt := range strings.Split(string(rawSchema), ";") {
		if strings.TrimSpace(stmt) == "" {
			continue
		}
		if _, err := db.Exec(stmt); err != nil {
			t.Fatal(err)
		}
	}

	addReader(t, db, 1, "root", "pw", true, "")

	settingsPath := filepath.Join(t.TempDir(), "auto.py")
	if err := os.WriteFile(settingsPath,
		[]byte("settings = {\n    'OPDS_ENABLED': True,\n}\n"), 0o644); err != nil {
		t.Fatalf("写配置文件失败: %v", err)
	}

	up := newUpstream(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"err":"ok"}`))
	})
	reg := pluginruntime.NewPluginRegistry()
	if err := pluginbuiltin.Register(reg); err != nil {
		t.Fatal(err)
	}
	addr, _ := startServe(t, ServeOptions{
		PluginRegistry: reg,
		DBPath:         dbPath,
		TornadoURL:     up.URL,
		ServeRoutes:    []string{"/api/user/sign_in", "/api/admin/plugins/opds-service", "/api/admin/plugins"},
		CookieSecret:   testSecret,
		SettingsPath:   settingsPath,
	})

	client := &http.Client{}
	form := url.Values{"username": {"root"}, "password": {"pw"}}
	signIn, err := client.Post("http://"+addr+"/api/user/sign_in",
		"application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	if err != nil {
		t.Fatalf("登录请求失败: %v", err)
	}
	defer signIn.Body.Close()
	cookies := signIn.Cookies()
	if len(cookies) == 0 {
		t.Fatal("登录未返回 cookie")
	}

	req, err := http.NewRequest(http.MethodPost,
		"http://"+addr+"/api/admin/plugins/opds-service", strings.NewReader(`{"enabled":false}`))
	if err != nil {
		t.Fatalf("构造请求失败: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	for _, c := range cookies {
		req.AddCookie(c)
	}
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("POST 失败: %v", err)
	}
	defer resp.Body.Close()

	var out map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("解析响应失败: %v", err)
	}
	if out["err"] != "ok" {
		t.Fatalf("err = %v, want ok（msg=%v）", out["err"], out["msg"])
	}
	if enabled, ok := out["enabled"].(bool); !ok || enabled {
		t.Errorf("enabled = %v, want false", out["enabled"])
	}

	raw, err := os.ReadFile(settingsPath)
	if err != nil {
		t.Fatalf("读配置文件失败: %v", err)
	}
	content := string(raw)
	if !strings.Contains(content, "'OPDS_ENABLED'") {
		t.Fatalf("配置文件缺少 OPDS_ENABLED：\n%s", content)
	}
	if !strings.Contains(content, "False") {
		t.Fatalf("OPDS_ENABLED 未写为 False：\n%s", content)
	}
	// The next request must reload saved settings while retaining all providers.
	readReq, err := http.NewRequest(http.MethodGet, "http://"+addr+"/api/admin/plugins", nil)
	if err != nil {
		t.Fatal(err)
	}
	for _, c := range cookies {
		readReq.AddCookie(c)
	}
	readResp, err := client.Do(readReq)
	if err != nil {
		t.Fatal(err)
	}
	defer readResp.Body.Close()
	var catalog map[string]any
	if err := json.NewDecoder(readResp.Body).Decode(&catalog); err != nil {
		t.Fatal(err)
	}
	if catalog["err"] != "ok" {
		t.Fatal(catalog)
	}
	defs, _ := catalog["definitions"].([]any)
	if len(defs) != 39 {
		t.Fatalf("registry lost on reload: %d", len(defs))
	}
	state := catalog["builtin_state"].(map[string]any)["talebook.source.opds"].(map[string]any)
	if state["service_enabled"] != false {
		t.Fatalf("saved toggle not effective: %v", state)
	}

}
