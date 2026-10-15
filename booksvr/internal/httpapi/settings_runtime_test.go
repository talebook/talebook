package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"

	"talebook/booksvr/internal/captcha"
	"talebook/booksvr/internal/importdir"
	"talebook/booksvr/internal/scan"
)

func TestCaptchaDownloadGrantAcceptsEveryBookFormat(t *testing.T) {
	db := captchaTestDB(t)
	cfg := CaptchaConfig{CookieSecret: "test-secret", Settings: captchaImageSettings()}
	cfg.Settings.EnableFor["DOWNLOAD"] = true
	for _, format := range []string{"epub", "mobi", "azw3", "txt", "pdf"} {
		ctx, _ := captchaCtx(t, db, http.MethodGet, "/api/book/1."+format, nil, 7, false)
		ctx.Params = []string{"1." + format}
		payload, err := json.Marshal(captchaGrantPayload{Context: captchaGrantContext(ctx, cfg), Books: map[string]float64{"1": float64(cfg.now())}})
		if err != nil {
			t.Fatal(err)
		}
		ctx.Request.AddCookie(&http.Cookie{Name: "captcha_download", Value: SignCookie(cfg.CookieSecret, "captcha_download", string(payload), cfg.now())})
		called := false
		handler := captchaProtected(func(*Context) (map[string]any, error) { called = true; return map[string]any{"err": "ok"}, nil }, cfg, "download", true)
		if _, err := handler(ctx); err != nil || !called {
			t.Errorf("%s grant rejected: %v", format, err)
		}
	}
}

func TestManualImportTasksReturnBeforeWorkFinishes(t *testing.T) {
	path := filepath.Join(t.TempDir(), "auto.py")
	if err := SaveSettings(path, map[string]any{"import_auto_watch_enabled": false}); err != nil {
		t.Fatal(err)
	}
	started, release := make(chan struct{}), make(chan struct{})
	svc := scan.NewService(scanTestDB(t), map[string]bool{"txt": true})
	opts := ServeOptions{SettingsPath: path, ScanService: func() *scan.Service { return svc },
		StartScan:   func(string, int) error { close(started); <-release; return fmt.Errorf("disk read failed") },
		StartImport: func([]string, int64, bool, string) error { return nil }}
	running, stop := attachImportWorker(context.Background(), opts, nil)
	defer stop()
	returned := make(chan error, 1)
	go func() { returned <- running.StartScan("/books", 500) }()
	select {
	case err := <-returned:
		if err != nil {
			t.Error(err)
		}
	case <-time.After(time.Second):
		close(release)
		t.Fatal("scan blocks HTTP response")
	}
	<-started
	if running.ImportWatchStatus()["manual_scan_running"] != true {
		t.Error("queued task not visible")
	}
	close(release)
	deadline := time.Now().Add(time.Second)
	for running.ImportWatchStatus()["manual_scan_running"] == true && time.Now().Before(deadline) {
		time.Sleep(time.Millisecond)
	}
	resp := taskStatusResponse(ScanConfig{WatchStatus: running.ImportWatchStatus}, "scan", nil, nil)
	if resp["err"] != "task.failed" || resp["running"] != false {
		t.Fatalf("failure not reported: %v", resp)
	}
	if running.ImportWatchStatus()["last_scan_at"] == nil {
		t.Fatal("manual scan timestamp missing")
	}
}

func TestImportWorkerRestoresLastScanTime(t *testing.T) {
	db := scanTestDB(t)
	if _, err := db.Exec(`INSERT INTO scanfiles (path,hash,status,create_time) VALUES ('/books/a.txt','a','ready','2026-10-16T01:00:00Z')`); err != nil {
		t.Fatal(err)
	}
	svc := scan.NewService(db, map[string]bool{"txt": true})
	opts := ServeOptions{SettingsPath: filepath.Join(t.TempDir(), "auto.py"), ScanService: func() *scan.Service { return svc }, StartScan: func(string, int) error { return nil }, StartImport: func([]string, int64, bool, string) error { return nil }}
	running, stop := attachImportWorker(context.Background(), opts, db)
	defer stop()
	if got := running.ImportWatchStatus()["last_scan_at"]; got != "2026-10-16T01:00:00Z" {
		t.Fatalf("last scan: %v", got)
	}
}

func TestAutoImportReloadsAndStops(t *testing.T) {
	fx := newUserFixture(t)
	id := seedReader(t, fx.DB, "watch-admin", "test-password", true, true)
	path := filepath.Join(t.TempDir(), "auto.py")
	roots := []string{t.TempDir(), t.TempDir()}
	if err := SaveSettings(path, map[string]any{"import_auto_watch_enabled": true, "import_watch_user_id": id, "import_allowed_roots": roots, "scan_upload_path": roots[0], "import_mode": "index"}); err != nil {
		t.Fatal(err)
	}
	svc := scan.NewService(scanTestDB(t), map[string]bool{"txt": true})
	scanned := make(chan string, 10)
	opts := ServeOptions{SettingsPath: path, ScanService: func() *scan.Service { return svc }, StartScan: func(root string, limit int) error { scanned <- root; return nil }, StartImport: func([]string, int64, bool, string) error { t.Error("empty directories must not import"); return nil }}
	for restart := 0; restart < 2; restart++ {
		running, stop := attachImportWorker(context.Background(), opts, fx.DB)
		for _, root := range roots {
			select {
			case got := <-scanned:
				if got != root {
					t.Errorf("scanned %s, wanted %s", got, root)
				}
			case <-time.After(4 * time.Second):
				stop()
				t.Fatal("watcher did not scan saved roots")
			}
		}
		if restart == 1 {
			if err := SaveSettings(path, map[string]any{"import_auto_watch_enabled": false}); err != nil {
				stop()
				t.Fatal(err)
			}
			deadline := time.Now().Add(3 * time.Second)
			for running.ImportWatchStatus()["state"] != "off" && time.Now().Before(deadline) {
				time.Sleep(20 * time.Millisecond)
			}
			if running.ImportWatchStatus()["state"] != "off" {
				t.Error("watcher did not stop after saving")
			}
		}
		stop()
	}
}

func TestEverySettingThroughAdminSave(t *testing.T) {
	path := filepath.Join(t.TempDir(), "auto.py")
	cfg := AdminConfig{SettingsPath: path, SaveSettings: func(values map[string]any) error { return SaveSettings(path, values) }}
	for key, value := range builtinSettingsDefaults {
		t.Run(key, func(t *testing.T) {
			if key == "installed" {
				value = true
			}
			body, _ := json.Marshal(map[string]any{key: value})
			ctx, _ := importCtx(t, http.MethodPost, rAdminSettings, string(body), true)
			rsp, err := adminSettingsSave(cfg, ctx)
			if err != nil || rsp["err"] != "ok" {
				t.Fatalf("save rejected: %v %v", rsp["err"], err)
			}
			got, _ := json.Marshal(LoadSettings(path)[key])
			want, _ := json.Marshal(value)
			if !bytes.Equal(got, want) {
				t.Fatal("saved value not retained")
			}
		})
	}
}

func TestConfiguredCaptchaScenesEnforced(t *testing.T) {
	for _, scene := range captchaScenes {
		t.Run(scene, func(t *testing.T) {
			book := scene == "download" || scene == "read"
			cfg := CaptchaConfig{CookieSecret: testSecret, Settings: captcha.Settings{Provider: "image", EnableFor: map[string]bool{strings.ToUpper(scene): true}}}
			next := func(*Context) (map[string]any, error) { return map[string]any{"err": "ok"}, nil }
			ctx, _ := importCtx(t, http.MethodPost, "/test", "{}", false)
			ctx.Params = []string{"1"}
			resp, err := captchaProtected(next, cfg, scene, book)(ctx)
			if err != nil || resp["err"] == "ok" {
				t.Fatalf("%s bypassed", scene)
			}
		})
	}
}

// Every default configuration key must survive repeated writes and a fresh
// loader, including nested lists, regexes, templates and Unicode strings.
func TestAllSettingsRoundTrip(t *testing.T) {
	path := filepath.Join(t.TempDir(), "auto.py")
	values := map[string]any{}
	for key, value := range builtinSettingsDefaults {
		values[key] = value
	}
	values["import_allowed_roots"] = []string{"/books/中文 有空格", "/books1/a'b", `/books/regex\d+$`}
	values["quoted"] = "'quoted'"
	values["CRLF"] = "line1\r\n\tline2"
	values["site_title"] = "书库 ' quoted \\ $1 #正文\n第二行"
	for round := 0; round < 4; round++ {
		if err := SaveSettings(path, values); err != nil {
			t.Fatal(err)
		}
		loaded := LoadSettings(path)
		for key, want := range values {
			gotJSON, _ := json.Marshal(loaded[key])
			wantJSON, _ := json.Marshal(want)
			if !bytes.Equal(gotJSON, wantJSON) {
				t.Errorf("round %d: %s changed type or value", round, key)
			}
		}
		values = loaded
	}
}

func TestSettingsDispatcherReloads(t *testing.T) {
	fx := newUserFixture(t)
	lib, _ := newTestDBFile(t)
	path := filepath.Join(t.TempDir(), "auto.py")
	if err := SaveSettings(path, map[string]any{"installed": true, "INVITE_MODE": false, "CAPTCHA_PROVIDER": ""}); err != nil {
		t.Fatal(err)
	}
	opts := ServeOptions{SettingsPath: path, CookieSecret: testSecret, ServeAll: true, TornadoURL: "http://127.0.0.1:1"}
	h, err := newSettingsHandler(opts, lib, fx.DB)
	if err != nil {
		t.Fatal(err)
	}
	get := func(route string) map[string]any {
		r := httptest.NewRecorder()
		h.ServeHTTP(r, httptest.NewRequest("GET", route, nil))
		var out map[string]any
		if err := json.Unmarshal(r.Body.Bytes(), &out); err != nil {
			t.Fatalf("%s: %d %v", route, r.Code, err)
		}
		return out
	}
	if got := get("/api/welcome"); got["err"] != "free" {
		t.Fatalf("before: %v", got)
	}
	if err := SaveSettings(path, map[string]any{"INVITE_MODE": true, "INVITE_CODE": "test-code", "INVITE_MESSAGE": "测试访问码", "CAPTCHA_PROVIDER": "image", "CAPTCHA_ENABLE_FOR_LOGIN": true}); err != nil {
		t.Fatal(err)
	}
	if got := get("/api/welcome"); got["welcome"] != "测试访问码" {
		t.Fatalf("invite did not reload: %v", got)
	}
	if got := get("/api/captcha/config"); got["scenes"].(map[string]any)["login"] != true {
		t.Fatalf("captcha did not reload: %v", got)
	}
	manual := filepath.Join(filepath.Dir(path), "manual.py")
	if err := SaveSettings(manual, map[string]any{"INVITE_MODE": false}); err != nil {
		t.Fatal(err)
	}
	if got := get("/api/welcome"); got["err"] != "free" {
		t.Fatalf("manual override not reloaded: %v", got)
	}
	if err := os.Remove(manual); err != nil {
		t.Fatal(err)
	}
	if got := get("/api/welcome"); got["err"] != "ok" {
		t.Fatalf("manual removal not reloaded: %v", got)
	}
}

func TestImportSettingsPersistAndScanWithoutRestart(t *testing.T) {
	path := filepath.Join(t.TempDir(), "auto.py")
	roots := []string{t.TempDir(), t.TempDir()}
	cfg := ImportConfig{
		SettingsPath: path,
		SaveSettings: func(values map[string]any) error { return SaveSettings(path, values) },
	}
	handler := ImportSettingsHandler(cfg)
	body, _ := json.Marshal(map[string]any{
		"import_directories": roots, "import_mode": "index", "auto_watch_enabled": false,
	})
	ctx, _ := importCtx(t, http.MethodPost, rImportSettings, string(body), true)
	resp, err := handler(ctx)
	if err != nil || resp["err"] != "ok" {
		t.Fatalf("save: %v %v", resp, err)
	}
	// The same handler must see the saved values, as must a fresh process/config.
	for _, get := range []HandlerFunc{handler, ImportSettingsHandler(cfg)} {
		ctx, _ = importCtx(t, http.MethodGet, rImportSettings, "", true)
		resp, err = get(ctx)
		if err != nil {
			t.Fatal(err)
		}
		settings := resp["settings"].(map[string]any)
		if !reflect.DeepEqual(settings["import_directories"], roots) || settings["import_mode"] != "index" {
			t.Fatalf("saved configuration lost: %v", settings)
		}
	}
	var scanned []string
	scanHandler := ScanRunHandler(ScanConfig{
		SettingsPath: path,
		Dir:          importdir.Config{ScanUploadPath: "/old-startup-directory"},
		StartScan:    func(root string, limit int) error { scanned = append(scanned, root); return nil },
	})
	ctx, _ = importCtx(t, http.MethodPost, rScanRun, "{}", true)
	resp, err = scanHandler(ctx)
	if err != nil || resp["err"] != "ok" || !reflect.DeepEqual(scanned, roots) {
		t.Fatalf("scan did not use persisted roots: %v %v %v", resp, err, scanned)
	}
}

func TestImportSettingsMissingPersistenceFails(t *testing.T) {
	root := t.TempDir()
	cfg := importTestConfig(t, root)
	cfg.SaveSettings = nil
	ctx, _ := importCtx(t, http.MethodPost, rImportSettings, "{}", true)
	resp, err := ImportSettingsHandler(cfg)(ctx)
	if err != nil || resp["err"] != "service.unavailable" {
		t.Fatalf("must not claim success without persistence: %v %v", resp, err)
	}
}

func TestInstalledStateRefreshesWithoutRestart(t *testing.T) {
	path := filepath.Join(t.TempDir(), "auto.py")
	if err := SaveSettings(path, map[string]any{"installed": false}); err != nil {
		t.Fatal(err)
	}
	fx := newUserFixture(t)
	fx.Cfg.Settings["installed"] = false
	fx.Cfg.SettingsPath = path
	info := UserInfoHandler(fx.Cfg)
	adminCfg := AdminConfig{Settings: map[string]any{"installed": false}, SettingsPath: path}
	install := AdminInstallHandler(adminCfg)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, rUserInfo, "", 0, false)
	resp, err := info(ctx)
	if err != nil || resp["err"] != "not_installed" {
		t.Fatalf("before: %v %v", resp, err)
	}
	if err := SaveSettings(path, map[string]any{"installed": true}); err != nil {
		t.Fatal(err)
	}
	resp, err = info(ctx)
	if err != nil || resp["err"] != "ok" {
		t.Fatalf("after: %v %v", resp, err)
	}
	for _, method := range []string{http.MethodGet, http.MethodPost} {
		ctx := pluginCtx(t, fx.DB, method, "/api/admin/install", "", 0, false)
		resp, err := install(ctx)
		if err != nil || resp["err"] != "installed" {
			t.Fatalf("reinstall %s: %v %v", method, resp, err)
		}
	}
	ctx = pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/testdb", "", 0, false)
	resp, err = AdminTestDBHandler(adminCfg)(ctx)
	if err != nil || resp["err"] != "user.need_login" {
		t.Fatalf("testdb: %v %v", resp, err)
	}
}

func TestReaderExtractRedirectIsNeverCached(t *testing.T) {
	ctx, rec := importCtx(t, http.MethodGet, "/read/extract/1/META-INF/container.xml", "", false)
	ctx.Identity = Identity{}
	ctx.Params = []string{"1", "META-INF/container.xml"}
	_, err := EpubReader(FilesConfig{})(ctx)
	if err != nil || rec.Code != http.StatusFound || rec.Header().Get("Cache-Control") != "private, no-store" {
		t.Fatalf("redirect/cache: %v %d %v", err, rec.Code, rec.Header())
	}
}
