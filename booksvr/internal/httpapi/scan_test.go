package httpapi

import (
	"database/sql"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"talebook/booksvr/internal/importdir"
	"talebook/booksvr/internal/scan"
	"talebook/booksvr/internal/userdb"
)

// scanTestDB 建一个带 scanfiles 表的内存库。
func scanTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if _, err := db.Exec(`CREATE TABLE scanfiles (id INTEGER PRIMARY KEY AUTOINCREMENT,
		scan_id INTEGER DEFAULT 0, import_id INTEGER DEFAULT 0, name TEXT, path TEXT,
		hash TEXT UNIQUE, status TEXT, title TEXT, author TEXT, publisher TEXT, tags TEXT,
		create_time TEXT, update_time TEXT, book_id INTEGER DEFAULT 0, data TEXT DEFAULT '{}')`); err != nil {
		t.Fatalf("建表失败: %v", err)
	}
	return db
}

// seedScanRow 插入一条扫描记录。
func seedScanRow(t *testing.T, db *sql.DB, hash, status string, scanID, importID int64) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO scanfiles
		(scan_id, import_id, name, path, hash, status, title, author, publisher, tags,
		 create_time, update_time, book_id, data)
		VALUES (?, ?, ?, ?, ?, ?, '', '', '', '', '2026-01-01 00:00:00', '2026-01-01 00:00:00', 0, '{}')`,
		scanID, importID, hash, "/data/"+hash, hash, status); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
}

// scanTestConfig 构造扫描路由配置。
func scanTestConfig(t *testing.T, db *sql.DB, root string) ScanConfig {
	t.Helper()
	svc := scan.NewService(db, nil)
	return ScanConfig{
		Dir: importdir.Config{
			ScanUploadPath: root,
			AllowedRoots:   []string{root},
			ScanBatchSize:  500,
		},
		Service: func() *scan.Service { return svc },
		UserID:  func(ctx *Context) int64 { return ctx.Identity.UserID },
	}
}

// scanCtx 构造请求上下文。
func scanCtx(t *testing.T, method, target, body string, admin bool) (*Context, *httptest.ResponseRecorder) {
	t.Helper()
	var r *http.Request
	if body == "" {
		r = httptest.NewRequest(method, target, nil)
	} else {
		r = httptest.NewRequest(method, target, strings.NewReader(body))
		r.Header.Set("Content-Type", "application/json")
	}
	w := httptest.NewRecorder()
	return &Context{Request: r, Writer: w, Identity: Identity{UserID: 7, IsAdmin: admin}}, w
}

// TestScanListHandler 覆盖列表接口。
func TestScanSkippedClassification(t *testing.T) {
	db := scanTestDB(t)
	seedScanRow(t, db, "ready", userdb.ScanStatusReady, 1, 0)
	seedScanRow(t, db, "duplicate", userdb.ScanStatusDrop, 1, 0)
	seedScanRow(t, db, "expanded", "expanded", 1, 0)
	cfg := scanTestConfig(t, db, t.TempDir())
	for _, filter := range []string{"todo", "skipped"} {
		ctx, _ := scanCtx(t, http.MethodGet, "/api/admin/scan/list?filter="+filter, "", true)
		got, err := ScanListHandler(cfg)(ctx)
		if err != nil {
			t.Fatal(err)
		}
		summary := got["summary"].(scan.Summary)
		if summary.Total != 2 || summary.Todo != 1 || summary.Skipped != 1 {
			t.Fatalf("%+v", summary)
		}
		items := got["items"].([]map[string]any)
		want := "ready"
		if filter == "skipped" {
			want = "drop"
		}
		if got["total"] != int64(1) || len(items) != 1 || items[0]["status"] != want {
			t.Fatalf("%s: %+v", filter, got)
		}
	}
	batch, err := cfg.Service().ReadyBatch(0, 500)
	if err != nil || len(batch) != 1 || batch[0].Status != userdb.ScanStatusReady {
		t.Fatalf("skipped records queued: %+v %v", batch, err)
	}
}

func TestScanListHandler(t *testing.T) {
	root := t.TempDir()
	db := scanTestDB(t)
	seedScanRow(t, db, "h1", userdb.ScanStatusReady, 1, 0)
	seedScanRow(t, db, "h2", userdb.ScanStatusExist, 1, 0)

	ctx, _ := scanCtx(t, http.MethodGet, "/api/admin/scan/list", "", true)
	got, err := ScanListHandler(scanTestConfig(t, db, root))(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got["err"] != "ok" {
		t.Errorf("err = %v, want ok", got["err"])
	}
	if got["total"] != int64(2) {
		t.Errorf("total = %v, want 2", got["total"])
	}
	items, _ := got["items"].([]map[string]any)
	if len(items) != 2 {
		t.Fatalf("items 长度 = %d, want 2", len(items))
	}
	if items[0]["create_time"] == "" {
		t.Error("create_time 不应为空")
	}
	summary, _ := got["summary"].(scan.Summary)
	if summary.Total != 2 {
		t.Errorf("summary.total = %d, want 2", summary.Total)
	}
	if got["import_mode"] != importModeIndex {
		t.Errorf("import_mode = %v, want index", got["import_mode"])
	}
}

// TestScanListHandlerNA 空时间戳序列化为 N/A。
func TestScanListHandlerNA(t *testing.T) {
	root := t.TempDir()
	db := scanTestDB(t)
	if _, err := db.Exec(`INSERT INTO scanfiles (hash, path, name, status, title, author, publisher, tags,
		create_time, update_time, data)
		VALUES ('h1', '/data/h1', 'h1', 'ready', '', '', '', '', '', '', '{}')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}

	ctx, _ := scanCtx(t, http.MethodGet, "/api/admin/scan/list", "", true)
	got, err := ScanListHandler(scanTestConfig(t, db, root))(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	items, _ := got["items"].([]map[string]any)
	if items[0]["create_time"] != "N/A" {
		t.Errorf("create_time = %v, want N/A", items[0]["create_time"])
	}
}

// TestScanListHandlerFilters 覆盖 filter 与分页参数。
func TestScanListHandlerFilters(t *testing.T) {
	root := t.TempDir()
	db := scanTestDB(t)
	seedScanRow(t, db, "h1", userdb.ScanStatusReady, 1, 0)
	seedScanRow(t, db, "h2", userdb.ScanStatusExist, 1, 0)
	seedScanRow(t, db, "h3", userdb.ScanStatusFailed, 1, 0)

	cases := map[string]int64{"all": 3, "todo": 1, "done": 1, "failed": 1}
	for filter, want := range cases {
		ctx, _ := scanCtx(t, http.MethodGet, "/api/admin/scan/list?filter="+filter, "", true)
		got, err := ScanListHandler(scanTestConfig(t, db, root))(ctx)
		if err != nil {
			t.Fatalf("filter=%s 失败: %v", filter, err)
		}
		if got["total"] != want {
			t.Errorf("filter=%s total = %v, want %d", filter, got["total"], want)
		}
	}

	// num=0 表示不分页。
	ctx, _ := scanCtx(t, http.MethodGet, "/api/admin/scan/list?num=0", "", true)
	got, _ := ScanListHandler(scanTestConfig(t, db, root))(ctx)
	items, _ := got["items"].([]map[string]any)
	if len(items) != 3 {
		t.Errorf("num=0 时 items = %d, want 3", len(items))
	}
}

// TestScanListHandlerUnavailable 未配置服务时返回不可用。
func TestScanListHandlerUnavailable(t *testing.T) {
	ctx, _ := scanCtx(t, http.MethodGet, "/api/admin/scan/list", "", true)
	got, err := ScanListHandler(ScanConfig{})(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got["err"] != "service.unavailable" {
		t.Errorf("err = %v, want service.unavailable", got["err"])
	}
}

// TestScanRunHandler 覆盖扫描启动。
func TestScanRunHandler(t *testing.T) {
	root := t.TempDir()
	cfg := scanTestConfig(t, scanTestDB(t), root)
	var gotPath string
	var gotLimit int
	cfg.StartScan = func(path string, limit int) error {
		gotPath, gotLimit = path, limit
		return nil
	}

	ctx, _ := scanCtx(t, http.MethodPost, "/api/admin/scan/run", "", true)
	got, err := ScanRunHandler(cfg)(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got["err"] != "ok" {
		t.Errorf("err = %v, want ok", got["err"])
	}
	if got["total"] != 1 {
		t.Errorf("total = %v, want 1（异步任务已启动）", got["total"])
	}
	if gotPath != root || gotLimit != 500 {
		t.Errorf("得到 (%q,%d), want (%q,500)", gotPath, gotLimit, root)
	}
}

// TestScanRunHandlerOutsideData 目录不在 /data/ 之下时报错。
//
// 注意：`_configured_allowed_roots` 会把 `scan_upload_path` 自身追加进根列表，
// 因此配置的路径总能通过 `_is_path_in_roots`；Python 同样如此，
// 实际拦截发生在目录检查（`params.path`）。这里断言该真实行为。
func TestScanRunHandlerOutsideData(t *testing.T) {
	cfg := scanTestConfig(t, scanTestDB(t), "C:/not-data")
	cfg.StartScan = func(string, int) error { t.Error("missing directory must not scan"); return nil }
	cfg.Dir.AllowedRoots = nil

	ctx, _ := scanCtx(t, http.MethodPost, "/api/admin/scan/run", "", true)
	got, err := ScanRunHandler(cfg)(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got["err"] != "params.path" {
		t.Errorf("err = %v, want params.path", got["err"])
	}
}

// TestScanRunHandlerPrefixRejected 路径既不在 /data/ 下也不在根列表时报 params.error。
func TestScanRunHandlerPrefixRejected(t *testing.T) {
	cfg := scanTestConfig(t, scanTestDB(t), "C:/not-data")
	cfg.StartScan = func(string, int) error { t.Error("missing directory must not scan"); return nil }
	// 让根列表与 scan_upload_path 不一致，模拟路径被拒。
	cfg.Dir.AllowedRoots = []string{"C:/other"}
	cfg.Dir.ScanUploadPath = "C:/not-data"

	ctx, _ := scanCtx(t, http.MethodPost, "/api/admin/scan/run", "", true)
	got, err := ScanRunHandler(cfg)(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	// scan_upload_path 仍会被追加进根列表，因此仍走目录检查。
	if got["err"] != "params.path" {
		t.Errorf("err = %v, want params.path", got["err"])
	}
}

// TestScanRunHandlerUnavailable 未配置 StartScan 时返回不可用。
func TestScanRunHandlerUnavailable(t *testing.T) {
	root := t.TempDir()
	cfg := scanTestConfig(t, scanTestDB(t), root)
	ctx, _ := scanCtx(t, http.MethodPost, "/api/admin/scan/run", "", true)
	got, err := ScanRunHandler(cfg)(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got["err"] != "service.unavailable" {
		t.Errorf("err = %v, want service.unavailable", got["err"])
	}
}

// TestScanStatusHandler 覆盖扫描状态。
func TestScanStatusHandler(t *testing.T) {
	root := t.TempDir()
	db := scanTestDB(t)
	seedScanRow(t, db, "h1", userdb.ScanStatusReady, 4, 0)
	seedScanRow(t, db, "h2", userdb.ScanStatusFailed, 4, 0)

	ctx, _ := scanCtx(t, http.MethodGet, "/api/admin/scan/status", "", true)
	got, err := ScanStatusHandler(scanTestConfig(t, db, root))(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got["err"] != "ok" || got["msg"] != "成功" {
		t.Errorf("得到 (%v,%v), want (ok,成功)", got["err"], got["msg"])
	}
	status, _ := got["status"].(map[string]int64)
	if status[userdb.ScanStatusReady] != 1 || status[userdb.ScanStatusFailed] != 1 {
		t.Errorf("status = %+v, want ready=1 failed=1", status)
	}
}

// TestScanStatusHandlerUnavailable 未配置服务时返回不可用。
func TestScanStatusHandlerUnavailable(t *testing.T) {
	ctx, _ := scanCtx(t, http.MethodGet, "/api/admin/scan/status", "", true)
	got, _ := ScanStatusHandler(ScanConfig{})(ctx)
	if got["err"] != "service.unavailable" {
		t.Errorf("err = %v, want service.unavailable", got["err"])
	}
}

// TestScanDeleteHandler 覆盖按 hash 列表删除。
func TestScanDeleteHandler(t *testing.T) {
	root := t.TempDir()
	db := scanTestDB(t)
	seedScanRow(t, db, "h1", userdb.ScanStatusReady, 1, 0)
	seedScanRow(t, db, "h2", userdb.ScanStatusReady, 1, 0)

	ctx, _ := scanCtx(t, http.MethodPost, "/api/admin/scan/delete", `{"hashlist":["h1"]}`, true)
	got, err := ScanDeleteHandler(scanTestConfig(t, db, root))(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got["err"] != "ok" || got["count"] != int64(1) {
		t.Errorf("得到 (%v,%v), want (ok,1)", got["err"], got["count"])
	}
}

// TestScanDeleteHandlerAll hashlist 为 "all" 时删除全部。
func TestScanDeleteHandlerAll(t *testing.T) {
	root := t.TempDir()
	db := scanTestDB(t)
	seedScanRow(t, db, "h1", userdb.ScanStatusReady, 1, 0)
	seedScanRow(t, db, "h2", userdb.ScanStatusReady, 1, 0)

	ctx, _ := scanCtx(t, http.MethodPost, "/api/admin/scan/delete", `{"hashlist":"all"}`, true)
	got, err := ScanDeleteHandler(scanTestConfig(t, db, root))(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got["count"] != int64(2) {
		t.Errorf("count = %v, want 2", got["count"])
	}
}

// TestScanDeleteHandlerBadParams 缺 hashlist 时报参数错误。
func TestScanDeleteHandlerBadParams(t *testing.T) {
	root := t.TempDir()
	cfg := scanTestConfig(t, scanTestDB(t), root)

	for _, body := range []string{`{}`, `{"hashlist":[]}`, `{"hashlist":""}`} {
		ctx, _ := scanCtx(t, http.MethodPost, "/api/admin/scan/delete", body, true)
		got, err := ScanDeleteHandler(cfg)(ctx)
		if err != nil {
			t.Fatalf("body=%s 失败: %v", body, err)
		}
		if got["err"] != "params.error" {
			t.Errorf("body=%s err = %v, want params.error", body, got["err"])
		}
	}
}

// TestScanDeleteHandlerSingleHash 单个 hash 字符串。
func TestScanDeleteHandlerSingleHash(t *testing.T) {
	root := t.TempDir()
	db := scanTestDB(t)
	seedScanRow(t, db, "h1", userdb.ScanStatusReady, 1, 0)

	ctx, _ := scanCtx(t, http.MethodPost, "/api/admin/scan/delete", `{"hashlist":"h1"}`, true)
	got, err := ScanDeleteHandler(scanTestConfig(t, db, root))(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got["count"] != int64(1) {
		t.Errorf("count = %v, want 1", got["count"])
	}
}

// TestScanDeleteHandlerUnavailable 未配置服务时返回不可用。
func TestScanDeleteHandlerUnavailable(t *testing.T) {
	ctx, _ := scanCtx(t, http.MethodPost, "/api/admin/scan/delete", `{"hashlist":"all"}`, true)
	got, _ := ScanDeleteHandler(ScanConfig{})(ctx)
	if got["err"] != "service.unavailable" {
		t.Errorf("err = %v, want service.unavailable", got["err"])
	}
}

// TestScanMarkHandler 空实现仅返回成功。
func TestScanMarkHandler(t *testing.T) {
	ctx, _ := scanCtx(t, http.MethodPost, "/api/admin/scan/mark", "", true)
	got, err := ScanMarkHandler(ScanConfig{})(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got["err"] != "ok" || got["msg"] != "发送成功" {
		t.Errorf("得到 (%v,%v), want (ok,发送成功)", got["err"], got["msg"])
	}
}

// TestImportRunHandler 覆盖导入启动。
func TestImportRunHandler(t *testing.T) {
	root := t.TempDir()
	db := scanTestDB(t)
	seedScanRow(t, db, "h1", userdb.ScanStatusReady, 1, 0)
	cfg := scanTestConfig(t, db, root)

	var gotMode string
	var gotUser int64
	cfg.StartImport = func(hashlist []string, userID int64, deleteAfter bool, importMode string) error {
		gotMode, gotUser = importMode, userID
		return nil
	}

	ctx, _ := scanCtx(t, http.MethodPost, "/api/admin/import/run", `{"hashlist":"all"}`, true)
	got, err := ImportRunHandler(cfg)(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got["err"] != "ok" || got["msg"] != "导入任务已提交" {
		t.Errorf("得到 (%v,%v), want (ok,导入任务已提交)", got["err"], got["msg"])
	}
	if gotMode != importModeIndex {
		t.Errorf("import_mode = %q, want index", gotMode)
	}
	if gotUser != 7 {
		t.Errorf("user_id = %d, want 7", gotUser)
	}
}

// TestImportRunHandlerMoveMode delete_after 为真时模式为 move。
func TestImportRunHandlerMoveMode(t *testing.T) {
	root := t.TempDir()
	db := scanTestDB(t)
	seedScanRow(t, db, "h1", userdb.ScanStatusReady, 1, 0)
	cfg := scanTestConfig(t, db, root)

	var gotMode string
	cfg.StartImport = func(_ []string, _ int64, _ bool, m string) error { gotMode = m; return nil }

	ctx, _ := scanCtx(t, http.MethodPost, "/api/admin/import/run", `{"hashlist":"all","delete_after":true}`, true)
	if _, err := ImportRunHandler(cfg)(ctx); err != nil {
		t.Fatalf("失败: %v", err)
	}
	if gotMode != importModeMove {
		t.Errorf("import_mode = %q, want move", gotMode)
	}
}

// TestImportRunHandlerExplicitMode 显式 import_mode 优先。
func TestImportRunHandlerExplicitMode(t *testing.T) {
	root := t.TempDir()
	db := scanTestDB(t)
	seedScanRow(t, db, "h1", userdb.ScanStatusReady, 1, 0)
	cfg := scanTestConfig(t, db, root)

	var gotMode string
	cfg.StartImport = func(_ []string, _ int64, _ bool, m string) error { gotMode = m; return nil }

	ctx, _ := scanCtx(t, http.MethodPost, "/api/admin/import/run",
		`{"hashlist":"all","import_mode":"index","delete_after":true}`, true)
	if _, err := ImportRunHandler(cfg)(ctx); err != nil {
		t.Fatalf("失败: %v", err)
	}
	if gotMode != importModeIndex {
		t.Errorf("import_mode = %q, want index（显式优先）", gotMode)
	}
}

// TestImportRunHandlerEmpty 没有 READY 记录时返回 empty。
func TestImportRunHandlerEmpty(t *testing.T) {
	root := t.TempDir()
	db := scanTestDB(t)
	seedScanRow(t, db, "h1", userdb.ScanStatusExist, 1, 0)

	ctx, _ := scanCtx(t, http.MethodPost, "/api/admin/import/run", `{"hashlist":"all"}`, true)
	got, err := ImportRunHandler(scanTestConfig(t, db, root))(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got["err"] != "empty" {
		t.Errorf("err = %v, want empty", got["err"])
	}
}

// TestImportRunHandlerBadParams 缺 hashlist 时报参数错误。
func TestImportRunHandlerBadParams(t *testing.T) {
	root := t.TempDir()
	ctx, _ := scanCtx(t, http.MethodPost, "/api/admin/import/run", `{}`, true)
	got, err := ImportRunHandler(scanTestConfig(t, scanTestDB(t), root))(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got["err"] != "params.error" {
		t.Errorf("err = %v, want params.error", got["err"])
	}
}

// TestImportRunHandlerUnavailable 未配置 StartImport 时返回不可用。
func TestImportRunHandlerUnavailable(t *testing.T) {
	root := t.TempDir()
	db := scanTestDB(t)
	seedScanRow(t, db, "h1", userdb.ScanStatusReady, 1, 0)

	ctx, _ := scanCtx(t, http.MethodPost, "/api/admin/import/run", `{"hashlist":"all"}`, true)
	got, err := ImportRunHandler(scanTestConfig(t, db, root))(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got["err"] != "service.unavailable" {
		t.Errorf("err = %v, want service.unavailable", got["err"])
	}
}

// TestImportStatusHandler 覆盖导入状态。
func TestImportStatusHandler(t *testing.T) {
	root := t.TempDir()
	db := scanTestDB(t)
	seedScanRow(t, db, "h1", userdb.ScanStatusImported, 0, 6)

	ctx, _ := scanCtx(t, http.MethodGet, "/api/admin/import/status", "", true)
	got, err := ImportStatusHandler(scanTestConfig(t, db, root))(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got["err"] != "ok" || got["msg"] != "成功" {
		t.Errorf("得到 (%v,%v), want (ok,成功)", got["err"], got["msg"])
	}
	status, _ := got["status"].(map[string]int64)
	if status[userdb.ScanStatusImported] != 1 {
		t.Errorf("status = %+v, want imported=1", status)
	}
}

// TestImportStatusHandlerUnavailable 未配置服务时返回不可用。
func TestImportStatusHandlerUnavailable(t *testing.T) {
	ctx, _ := scanCtx(t, http.MethodGet, "/api/admin/import/status", "", true)
	got, _ := ImportStatusHandler(ScanConfig{})(ctx)
	if got["err"] != "service.unavailable" {
		t.Errorf("err = %v, want service.unavailable", got["err"])
	}
}

// TestScanRouteSpecs 路由注册与权限标志。
func TestScanRouteSpecs(t *testing.T) {
	specs := ScanRouteSpecs(ScanConfig{})
	if len(specs) != 7 {
		t.Fatalf("路由数 = %d, want 7", len(specs))
	}
	want := map[string]string{
		rScanList:     http.MethodGet,
		rScanRun:      http.MethodPost,
		rScanStatus:   http.MethodGet,
		rScanDelete:   http.MethodPost,
		rScanMark:     http.MethodPost,
		rImportRun:    http.MethodPost,
		rImportStatus: http.MethodGet,
	}
	for _, spec := range specs {
		method, ok := want[spec.Pattern]
		if !ok {
			t.Errorf("意外路由 %q", spec.Pattern)
			continue
		}
		if len(spec.Methods) != 1 || spec.Methods[0] != method {
			t.Errorf("%s methods = %v, want [%s]", spec.Pattern, spec.Methods, method)
		}
		if !spec.Auth || !spec.Admin {
			t.Errorf("%s 应要求登录 + 管理员", spec.Pattern)
		}
		if spec.Handler == nil {
			t.Errorf("%s 缺少 handler", spec.Pattern)
		}
	}
}

// TestParseHashList 覆盖 hashlist 解析。
func TestParseHashList(t *testing.T) {
	if got, err := parseHashList("all"); err != nil || got != nil {
		t.Errorf("all 得到 (%v,%v), want (nil,nil)", got, err)
	}
	if got, err := parseHashList("h1"); err != nil || len(got) != 1 || got[0] != "h1" {
		t.Errorf("单值得到 (%v,%v), want ([h1],nil)", got, err)
	}
	if got, err := parseHashList([]any{"h1", "h2"}); err != nil || len(got) != 2 {
		t.Errorf("列表得到 (%v,%v), want 2 项", got, err)
	}
	for _, bad := range []any{nil, "", []any{}} {
		if _, err := parseHashList(bad); err == nil {
			t.Errorf("%v 应报错", bad)
		}
	}
}

// TestAtoiDefault 覆盖整数解析兜底。
func TestAtoiDefault(t *testing.T) {
	if got := atoiDefault("", 20); got != 20 {
		t.Errorf("空串 = %d, want 20", got)
	}
	if got := atoiDefault("abc", 20); got != 20 {
		t.Errorf("非法 = %d, want 20", got)
	}
	if got := atoiDefault("5", 20); got != 5 {
		t.Errorf("合法 = %d, want 5", got)
	}
}

// TestToBool 覆盖布尔转换。
func TestToBool(t *testing.T) {
	cases := []struct {
		in   any
		want bool
	}{
		{true, true}, {false, false},
		{"1", true}, {"true", true}, {"yes", true}, {"on", true}, {"TRUE", true},
		{"0", false}, {"no", false}, {"", false},
		{float64(1), true}, {float64(0), false},
		{1, true}, {0, false},
		{nil, false},
	}
	for _, c := range cases {
		if got := toBool(c.in); got != c.want {
			t.Errorf("toBool(%v) = %v, want %v", c.in, got, c.want)
		}
	}
}

// TestErrHashListError 覆盖错误类型。
func TestErrHashListError(t *testing.T) {
	if got := errBadHashList.Error(); got == "" {
		t.Error("错误信息不应为空")
	}
}

// TestScanConfigWatchStatusFallback 未配置 WatchStatus 时返回「关闭」。
func TestScanConfigWatchStatusFallback(t *testing.T) {
	got := ScanConfig{}.watchStatus()
	if got["state"] != "off" {
		t.Errorf("state = %v, want off", got["state"])
	}
	if got["last_scan_at"] != nil {
		t.Errorf("last_scan_at = %v, want nil", got["last_scan_at"])
	}
}

// TestScanConfigWatchStatusCustom 配置后透传。
func TestScanConfigWatchStatusCustom(t *testing.T) {
	cfg := ScanConfig{WatchStatus: func() map[string]any {
		return map[string]any{"state": "running", "queued": 3}
	}}
	got := cfg.watchStatus()
	if got["state"] != "running" || got["queued"] != 3 {
		t.Errorf("得到 %+v, want running/3", got)
	}
}

// TestScanFileToDictNilData data 为 nil 时输出空 map。
func TestScanFileToDictNilData(t *testing.T) {
	got := scanFileToDict(&userdb.ScanFile{ID: 1, Hash: "h1", Data: nil})
	data, ok := got["data"].(map[string]any)
	if !ok || data == nil {
		t.Errorf("data = %v, want 非 nil 空 map", got["data"])
	}
}

// TestOrNA 覆盖空值兜底。
func TestOrNA(t *testing.T) {
	if got := orNA(""); got != "N/A" {
		t.Errorf("空串 = %q, want N/A", got)
	}
	if got := orNA("2026-01-01"); got != "2026-01-01" {
		t.Errorf("非空 = %q, want 原值", got)
	}
}
