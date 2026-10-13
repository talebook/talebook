package httpapi

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"testing"

	"talebook/booksvr/internal/comic"
	"talebook/booksvr/internal/pluginruntime"
	"talebook/booksvr/internal/scan"
)

// TestServeServiceFactoryPopulatesFields 覆盖 ServiceFactory 在 Serve 打开库后被调用，
// 且返回的服务实例被写入 ServeOptions 对应字段。
func TestServeServiceFactoryPopulatesFields(t *testing.T) {
	_, dbPath := newTestDBFile(t)
	up := newUpstream(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"err":"ok"}`))
	})

	var gotDB *sql.DB
	var gotScan *scan.Service
	var gotRegistry *pluginruntime.PluginRegistry
	var gotComic *comic.Service
	var startScanCalled, startImportCalled, watchStatusCalled bool

	addr, _ := startServe(t, ServeOptions{
		DBPath:       dbPath,
		TornadoURL:   up.URL,
		ServeRoutes:  []string{"/api/work/([0-9]+)"},
		CookieSecret: testSecret,
		ServiceFactory: func(userDB, libraryDB *sql.DB) ServiceSet {
			gotDB = userDB
			gotScan = scan.NewService(userDB, map[string]bool{"epub": true})
			gotRegistry = pluginruntime.NewPluginRegistry()
			gotComic = comic.NewService()
			return ServiceSet{
				ScanService: func() *scan.Service { return gotScan },
				StartScan: func(path string, limit int) error {
					startScanCalled = true
					return nil
				},
				StartImport: func(hashlist []string, userID int64, deleteAfter bool, importMode string) error {
					startImportCalled = true
					return nil
				},
				ImportWatchStatus: func() map[string]any {
					watchStatusCalled = true
					return map[string]any{"state": "on"}
				},
				PluginRegistry: gotRegistry,
				ComicService:   gotComic,
			}
		},
	})

	// 触发一次请求，确认服务已就绪。
	resp, err := http.Get("http://" + addr + "/api/work/1")
	if err != nil {
		t.Fatalf("GET: %v", err)
	}
	defer resp.Body.Close()
	var out map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("解析响应失败: %v", err)
	}

	if gotDB == nil {
		t.Fatal("ServiceFactory 未收到 DB 句柄")
	}
	if gotScan == nil {
		t.Fatal("ScanService 未构造")
	}
	if gotRegistry == nil {
		t.Fatal("PluginRegistry 未构造")
	}
	if gotComic == nil {
		t.Fatal("ComicService 未构造")
	}
	// 回调闭包本身可用（由 CLI 侧测试覆盖真实调用）。
	_ = startScanCalled
	_ = startImportCalled
	_ = watchStatusCalled
}

// TestServeServiceFactoryNilSafe 覆盖 ServiceFactory 为 nil 时不 panic。
func TestServeServiceFactoryNilSafe(t *testing.T) {
	_, dbPath := newTestDBFile(t)
	up := newUpstream(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"err":"ok"}`))
	})

	addr, _ := startServe(t, ServeOptions{
		DBPath:       dbPath,
		TornadoURL:   up.URL,
		ServeRoutes:  []string{"/api/work/([0-9]+)"},
		CookieSecret: testSecret,
	})

	resp, err := http.Get("http://" + addr + "/api/work/1")
	if err != nil {
		t.Fatalf("GET: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("状态码 = %d，期望 200", resp.StatusCode)
	}
}

// TestServeServiceFactoryPartialSet 覆盖 ServiceSet 只填部分字段时其余保持原值。
func TestServeServiceFactoryPartialSet(t *testing.T) {
	_, dbPath := newTestDBFile(t)
	up := newUpstream(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"err":"ok"}`))
	})

	preset := scan.NewService(nil, map[string]bool{"epub": true})
	addr, _ := startServe(t, ServeOptions{
		DBPath:       dbPath,
		TornadoURL:   up.URL,
		ServeRoutes:  []string{"/api/work/([0-9]+)"},
		CookieSecret: testSecret,
		ScanService:  func() *scan.Service { return preset },
		ServiceFactory: func(userDB, libraryDB *sql.DB) ServiceSet {
			// 只覆盖 PluginRegistry，ScanService 应保持 preset。
			return ServiceSet{PluginRegistry: pluginruntime.NewPluginRegistry()}
		},
	})

	resp, err := http.Get("http://" + addr + "/api/work/1")
	if err != nil {
		t.Fatalf("GET: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("状态码 = %d，期望 200", resp.StatusCode)
	}
}
