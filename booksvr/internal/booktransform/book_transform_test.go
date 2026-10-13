package booktransform

import (
	"database/sql"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginruntime"
	"talebook/booksvr/internal/userdb"

	_ "modernc.org/sqlite"
)

// ---- 测试替身 ----

// toolProvider 是一个支持 integrations.tool 能力的假插件。
type toolProvider struct {
	manifest map[string]any
	// auto 决定 SupportsAutoTrigger 的返回值。
	auto bool
	// previewReport 是 preview 方法返回的报告。
	previewReport map[string]any
	// applyOutput 是 apply 方法返回的结果。
	applyOutput map[string]any
	// applyErr 非空时 apply 直接失败。
	applyErr error
	// previewErr 非空时 preview 直接失败。
	previewErr error
	// applyWrites 是 apply 写入 workDir 的文件内容。
	applyWrites string
	// calls 记录被调用的方法名。
	calls []string
}

// Manifest 返回插件清单。
func (p *toolProvider) Manifest() map[string]any { return p.manifest }

// ProxyImageHosts 返回代理图片域名。
func (p *toolProvider) ProxyImageHosts() []string { return nil }

// SupportsAutoTrigger 声明是否支持自动触发。
func (p *toolProvider) SupportsAutoTrigger() bool { return p.auto }

// SupportedFormats 声明支持的格式。
func (p *toolProvider) SupportedFormats() map[string]bool { return map[string]bool{"TXT": true} }

// SelfCheck 满足 actions 含 test 时的契约要求。
func (p *toolProvider) SelfCheck(context map[string]any) (plugindomain.CheckReport, error) {
	return plugindomain.CheckReport{}, nil
}

// Preview 是 typed 契约方法；测试走 Invoke 分派，这里仅满足接口。
func (p *toolProvider) Preview(src plugindomain.ToolInput,
	context map[string]any) (plugindomain.ToolReport, error) {
	return plugindomain.ToolReport{}, nil
}

// Apply 是 typed 契约方法；测试走 Invoke 分派，这里仅满足接口。
func (p *toolProvider) Apply(src plugindomain.ToolInput, outDir string,
	context map[string]any) (plugindomain.ToolOutput, error) {
	return plugindomain.ToolOutput{}, nil
}

// Invoke 按方法名分派 preview / apply。
func (p *toolProvider) Invoke(method string, args []any, context map[string]any) (any, error) {
	p.calls = append(p.calls, method)
	switch method {
	case "preview":
		if p.previewErr != nil {
			return nil, p.previewErr
		}
		return p.previewReport, nil
	case "apply":
		if p.applyErr != nil {
			return nil, p.applyErr
		}
		// 模拟插件把处理结果写到 workDir。
		if len(args) >= 2 && p.applyWrites != "" {
			if dir, ok := args[1].(string); ok {
				out := filepath.Join(dir, "output.txt")
				if err := os.WriteFile(out, []byte(p.applyWrites), 0o644); err != nil {
					return nil, err
				}
				out2 := map[string]any{}
				for k, v := range p.applyOutput {
					out2[k] = v
				}
				out2["path"] = out
				return out2, nil
			}
		}
		return p.applyOutput, nil
	default:
		return nil, nil
	}
}

// ---- 测试环境 ----

// fixture 是一套自动修复测试环境。
type fixture struct {
	// Service 是被测服务。
	Service *Service
	// Provider 是假插件。
	Provider *toolProvider
	// DB 是 Talebook 自有库。
	DB *sql.DB
	// LibraryDB 是 Calibre 元数据库。
	LibraryDB *sql.DB
	// BookID 是测试书籍 ID。
	BookID int64
	// TxtPath 是书籍 TXT 文件路径。
	TxtPath string
	// AdminID 是管理员 ID。
	AdminID int64
	// ConnectionID 是连接 ID。
	ConnectionID int64
	// BackupRoot 是备份根目录。
	BackupRoot string
}

// newSchemaDB 打开一份内存库并建表。
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
	db.SetMaxOpenConns(1)
	t.Cleanup(func() { _ = db.Close() })

	for _, stmt := range strings.Split(string(raw), ";") {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" {
			continue
		}
		if _, err := db.Exec(stmt); err != nil {
			t.Fatalf("建表失败: %v\n%s", err, stmt)
		}
	}
	return db
}

// newLibraryDB 建一份最小 Calibre 库并插入一本书。
func newLibraryDB(t *testing.T, txtPath string) (*sql.DB, int64) {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开书库失败: %v", err)
	}
	db.SetMaxOpenConns(1)
	t.Cleanup(func() { _ = db.Close() })

	stmts := []string{
		`CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT, author_sort TEXT,
			path TEXT, timestamp TEXT, pubdate TEXT, series_index REAL, rating INTEGER,
			has_cover INTEGER DEFAULT 0, uuid TEXT, last_modified TEXT)`,
		`CREATE TABLE authors (id INTEGER PRIMARY KEY, name TEXT, sort TEXT, link TEXT)`,
		`CREATE TABLE books_authors_link (id INTEGER PRIMARY KEY, book INTEGER, author INTEGER)`,
		`CREATE TABLE data (id INTEGER PRIMARY KEY, book INTEGER, format TEXT,
			uncompressed_size INTEGER, name TEXT)`,
		`CREATE TABLE book_formats (id INTEGER PRIMARY KEY, book_id INTEGER, format TEXT,
			path TEXT, size INTEGER, mtime INTEGER, hash TEXT)`,
		`CREATE TABLE tags (id INTEGER PRIMARY KEY, name TEXT)`,
		`CREATE TABLE books_tags_link (id INTEGER PRIMARY KEY, book INTEGER, tag INTEGER)`,
		`CREATE TABLE series (id INTEGER PRIMARY KEY, name TEXT)`,
		`CREATE TABLE books_series_link (id INTEGER PRIMARY KEY, book INTEGER, series INTEGER)`,
		`CREATE TABLE publishers (id INTEGER PRIMARY KEY, name TEXT)`,
		`CREATE TABLE books_publishers_link (id INTEGER PRIMARY KEY, book INTEGER, publisher INTEGER)`,
		`CREATE TABLE comments (id INTEGER PRIMARY KEY, book INTEGER, text TEXT)`,
		`CREATE TABLE languages (id INTEGER PRIMARY KEY, lang_code TEXT)`,
		`CREATE TABLE books_languages_link (id INTEGER PRIMARY KEY, book INTEGER, lang_code INTEGER, item_order INTEGER DEFAULT 0)`,
		`CREATE TABLE identifiers (id INTEGER PRIMARY KEY, book INTEGER, type TEXT, val TEXT)`,
		`CREATE TABLE ratings (id INTEGER PRIMARY KEY, rating INTEGER)`,
		`CREATE TABLE books_ratings_link (id INTEGER PRIMARY KEY, book INTEGER, rating INTEGER)`,
	}
	for _, stmt := range stmts {
		if _, err := db.Exec(stmt); err != nil {
			t.Fatalf("建书库表失败: %v\n%s", err, stmt)
		}
	}

	dir := filepath.Dir(txtPath)
	if _, err := db.Exec(`INSERT INTO books (id, title, author_sort, path, timestamp, pubdate,
		series_index, rating, has_cover, uuid, last_modified)
		VALUES (1, '测试书', '作者', ?, 1767225600, '2026-01-01', 1, 0, 0, 'uuid-1', '2026-01-01')`,
		dir); err != nil {
		t.Fatalf("插入书籍失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO data (id, book, format, uncompressed_size, name)
		VALUES (1, 1, 'TXT', 10, 'test')`); err != nil {
		t.Fatalf("插入 data 失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO book_formats (id, book_id, format, path, size, mtime, hash)
		VALUES (1, 1, 'TXT', ?, 10, 0, '')`, txtPath); err != nil {
		t.Fatalf("插入 book_formats 失败: %v", err)
	}
	return db, 1
}

// newFixture 构造测试环境。
func newFixture(t *testing.T, provider *toolProvider, trigger string) *fixture {
	t.Helper()
	dir := t.TempDir()
	txtPath := filepath.Join(dir, "book.txt")
	if err := os.WriteFile(txtPath, []byte("原始内容"), 0o644); err != nil {
		t.Fatalf("写入 TXT 失败: %v", err)
	}

	db := newSchemaDB(t)
	res, err := db.Exec(`INSERT INTO readers (username, password, admin, create_time)
		VALUES ('admin', 'x', 1, '2026-01-01 00:00:00.000000')`)
	if err != nil {
		t.Fatalf("插入管理员失败: %v", err)
	}
	adminID, _ := res.LastInsertId()

	reg := pluginruntime.NewPluginRegistry()
	caps := pluginiface.CapabilitySet{
		Interfaces:   map[string]bool{"TransformProvider": true},
		HasSelfCheck: true,
	}
	if _, err := reg.Register(provider, caps); err != nil {
		t.Fatalf("注册插件失败: %v", err)
	}
	insts, err := pluginruntime.EnsureBuiltinInstallations(db, adminID, map[string]any{}, reg)
	if err != nil {
		t.Fatalf("物化内置安装失败: %v", err)
	}
	if _, err := db.Exec(`UPDATE plugin_installations SET enabled = 1 WHERE id = ?`, insts[0].ID); err != nil {
		t.Fatalf("启用安装失败: %v", err)
	}

	settings := map[string]any{"PLUGIN_SECRET_KEY": "test-key-123"}
	rt := pluginruntime.NewRuntime(db, settings, reg)

	conn, err := rt.SaveConnection(insts[0].ID, "instance", 0,
		map[string]any{}, "默认", map[string]any{"trigger": trigger},
		[]any{"books.read", "books.write"}, "", pluginruntime.DefaultConnectionRole)
	if err != nil {
		t.Fatalf("保存连接失败: %v", err)
	}

	libraryDB, bookID := newLibraryDB(t, txtPath)
	backupRoot := t.TempDir()

	svc := NewService(Config{
		DB:         db,
		LibraryDB:  libraryDB,
		Runtime:    rt,
		BackupRoot: backupRoot,
		Now:        func() time.Time { return time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC) },
	})
	return &fixture{
		Service:      svc,
		Provider:     provider,
		DB:           db,
		LibraryDB:    libraryDB,
		BookID:       bookID,
		TxtPath:      txtPath,
		AdminID:      adminID,
		ConnectionID: conn.ID,
		BackupRoot:   backupRoot,
	}
}

// toolManifest 返回一份合法的 integrations.tool 清单。
func toolManifest() map[string]any {
	return map[string]any{
		"protocol_version":  "talebook.plugin/v1",
		"id":                "talebook.texttools",
		"name":              "正文工具",
		"version":           "1.0.0",
		"categories":        []any{"integrations"},
		"capabilities":      []any{TransformCapability},
		"runtime_kind":      "builtin",
		"actions":           []any{"test"},
		"auth_schema":       map[string]any{"properties": map[string]any{}},
		"config_schema":     map[string]any{},
		"connection_owners": []any{"instance"},
		"permissions":       []any{},
		"data_policy":       map[string]any{},
		"compatibility":     map[string]any{},
		"homepage":          "",
		"license":           "",
	}
}

// ---- TriggerOf ----

// TestTriggerOf 覆盖触发方式读取。
func TestTriggerOf(t *testing.T) {
	cases := []struct {
		name   string
		config map[string]any
		want   string
	}{
		{"nil", nil, TriggerManual},
		{"empty", map[string]any{}, TriggerManual},
		{"nil value", map[string]any{"trigger": nil}, TriggerManual},
		{"blank", map[string]any{"trigger": "  "}, TriggerManual},
		{"auto", map[string]any{"trigger": "auto"}, TriggerAuto},
		{"manual", map[string]any{"trigger": "manual"}, TriggerManual},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := TriggerOf(tc.config); got != tc.want {
				t.Errorf("TriggerOf = %q，期望 %q", got, tc.want)
			}
		})
	}
}

// ---- AutoConnection ----

// TestAutoConnectionPicksAutoTrigger 覆盖选中 auto 连接。
func TestAutoConnectionPicksAutoTrigger(t *testing.T) {
	p := &toolProvider{manifest: toolManifest(), auto: true}
	fx := newFixture(t, p, TriggerAuto)

	conn, err := fx.Service.AutoConnection()
	if err != nil {
		t.Fatalf("AutoConnection: %v", err)
	}
	if conn == nil {
		t.Fatal("应选中 auto 连接")
	}
	if conn.ID != fx.ConnectionID {
		t.Errorf("connection id = %d，期望 %d", conn.ID, fx.ConnectionID)
	}
}

// TestAutoConnectionSkipsManualTrigger 覆盖手动触发不被选中。
func TestAutoConnectionSkipsManualTrigger(t *testing.T) {
	p := &toolProvider{manifest: toolManifest(), auto: true}
	fx := newFixture(t, p, TriggerManual)

	conn, err := fx.Service.AutoConnection()
	if err != nil {
		t.Fatalf("AutoConnection: %v", err)
	}
	if conn != nil {
		t.Error("手动触发不应被选中")
	}
}

// TestAutoConnectionSkipsNoAutoSupport 覆盖插件不支持自动触发。
func TestAutoConnectionSkipsNoAutoSupport(t *testing.T) {
	p := &toolProvider{manifest: toolManifest(), auto: false}
	fx := newFixture(t, p, TriggerAuto)

	conn, err := fx.Service.AutoConnection()
	if err != nil {
		t.Fatalf("AutoConnection: %v", err)
	}
	if conn != nil {
		t.Error("不支持自动触发的插件不应被选中")
	}
}

// ---- FixEncodingForBook ----

// TestFixEncodingNoConnection 覆盖无可用连接时返回 nil。
func TestFixEncodingNoConnection(t *testing.T) {
	p := &toolProvider{manifest: toolManifest(), auto: true}
	fx := newFixture(t, p, TriggerManual)

	run, err := fx.Service.FixEncodingForBook(fx.BookID, fx.AdminID, nil)
	if err != nil {
		t.Fatalf("FixEncodingForBook: %v", err)
	}
	if run != nil {
		t.Error("无连接时应返回 nil run")
	}
}

// TestFixEncodingAlreadyCorrect 覆盖编码已正确时跳过写回。
func TestFixEncodingAlreadyCorrect(t *testing.T) {
	p := &toolProvider{
		manifest:      toolManifest(),
		auto:          true,
		previewReport: map[string]any{"encoding": "UTF-8"},
	}
	fx := newFixture(t, p, TriggerAuto)

	run, err := fx.Service.FixEncodingForBook(fx.BookID, fx.AdminID, nil)
	if err != nil {
		t.Fatalf("FixEncodingForBook: %v", err)
	}
	if run == nil {
		t.Fatal("run 不应为 nil")
	}
	if run.Status != "succeeded" {
		t.Errorf("status = %q，期望 succeeded", run.Status)
	}
	if run.Counts["skipped"] != 1 {
		t.Errorf("skipped = %v，期望 1", run.Counts["skipped"])
	}
	if run.CursorAfter["reason"] != "编码已正确，无需修复" {
		t.Errorf("reason = %v", run.CursorAfter["reason"])
	}
	// 不应调用 apply。
	for _, c := range p.calls {
		if c == "apply" {
			t.Error("编码已正确时不应调用 apply")
		}
	}
	// 原文件不应被改动。
	body, _ := os.ReadFile(fx.TxtPath)
	if string(body) != "原始内容" {
		t.Errorf("原文件被改动: %q", body)
	}
}

// TestFixEncodingAsciiIsCorrect 覆盖 ASCII 也视为正确。
func TestFixEncodingAsciiIsCorrect(t *testing.T) {
	p := &toolProvider{
		manifest:      toolManifest(),
		auto:          true,
		previewReport: map[string]any{"encoding": "ascii"},
	}
	fx := newFixture(t, p, TriggerAuto)

	run, err := fx.Service.FixEncodingForBook(fx.BookID, fx.AdminID, nil)
	if err != nil {
		t.Fatalf("FixEncodingForBook: %v", err)
	}
	if run.Counts["skipped"] != 1 {
		t.Errorf("skipped = %v，期望 1", run.Counts["skipped"])
	}
}

// TestFixEncodingUnrecoverable 覆盖不可恢复报告直接失败。
func TestFixEncodingUnrecoverable(t *testing.T) {
	p := &toolProvider{
		manifest:      toolManifest(),
		auto:          true,
		previewReport: map[string]any{"unrecoverable": true},
	}
	fx := newFixture(t, p, TriggerAuto)

	run, err := fx.Service.FixEncodingForBook(fx.BookID, fx.AdminID, nil)
	if err != nil {
		t.Fatalf("FixEncodingForBook: %v", err)
	}
	if run.Status != "failed" {
		t.Errorf("status = %q，期望 failed", run.Status)
	}
	if run.ErrorCode != "booktools.auto_failed" {
		t.Errorf("error_code = %q", run.ErrorCode)
	}
	if !strings.Contains(run.ErrorMessage, "多重误读") {
		t.Errorf("error_message = %q", run.ErrorMessage)
	}
}

// TestFixEncodingGarbageWithoutMojibake 覆盖 garbage 且非 mojibake 时失败。
func TestFixEncodingGarbageWithoutMojibake(t *testing.T) {
	p := &toolProvider{
		manifest:      toolManifest(),
		auto:          true,
		previewReport: map[string]any{"garbage": true, "mojibake": false},
	}
	fx := newFixture(t, p, TriggerAuto)

	run, err := fx.Service.FixEncodingForBook(fx.BookID, fx.AdminID, nil)
	if err != nil {
		t.Fatalf("FixEncodingForBook: %v", err)
	}
	if run.Status != "failed" {
		t.Errorf("status = %q，期望 failed", run.Status)
	}
}

// TestFixEncodingGarbageWithMojibakeProceeds 覆盖 garbage + mojibake 继续修复。
func TestFixEncodingGarbageWithMojibakeProceeds(t *testing.T) {
	p := &toolProvider{
		manifest:      toolManifest(),
		auto:          true,
		previewReport: map[string]any{"garbage": true, "mojibake": true, "encoding": "GBK"},
		applyOutput:   map[string]any{"report": map[string]any{"encoding": "UTF-8"}},
		applyWrites:   "修复后的内容",
	}
	fx := newFixture(t, p, TriggerAuto)

	run, err := fx.Service.FixEncodingForBook(fx.BookID, fx.AdminID, nil)
	if err != nil {
		t.Fatalf("FixEncodingForBook: %v", err)
	}
	if run.Status != "succeeded" {
		t.Fatalf("status = %q，期望 succeeded（err=%s）", run.Status, run.ErrorMessage)
	}
	if run.Counts["updated"] != 1 {
		t.Errorf("updated = %v，期望 1", run.Counts["updated"])
	}
	body, _ := os.ReadFile(fx.TxtPath)
	if string(body) != "修复后的内容" {
		t.Errorf("TXT 未被写回: %q", body)
	}
}

// TestFixEncodingAppliesAndBacksUp 覆盖成功修复并留备份。
func TestFixEncodingAppliesAndBacksUp(t *testing.T) {
	p := &toolProvider{
		manifest:      toolManifest(),
		auto:          true,
		previewReport: map[string]any{"encoding": "GBK"},
		applyOutput:   map[string]any{"report": map[string]any{"encoding": "UTF-8"}},
		applyWrites:   "新内容",
	}
	fx := newFixture(t, p, TriggerAuto)

	run, err := fx.Service.FixEncodingForBook(fx.BookID, fx.AdminID, nil)
	if err != nil {
		t.Fatalf("FixEncodingForBook: %v", err)
	}
	if run.Status != "succeeded" {
		t.Fatalf("status = %q（err=%s）", run.Status, run.ErrorMessage)
	}
	backupPath, _ := run.CursorAfter["backup_path"].(string)
	if backupPath == "" {
		t.Fatal("应记录备份路径")
	}
	backup, err := os.ReadFile(backupPath)
	if err != nil {
		t.Fatalf("读取备份失败: %v", err)
	}
	if string(backup) != "原始内容" {
		t.Errorf("备份内容 = %q，期望原始内容", backup)
	}
	if run.CursorAfter["encoding"] != "UTF-8" {
		t.Errorf("encoding = %v", run.CursorAfter["encoding"])
	}
}

// TestFixEncodingMissingTxtFormat 覆盖书籍没有 TXT 格式。
func TestFixEncodingMissingTxtFormat(t *testing.T) {
	p := &toolProvider{
		manifest:      toolManifest(),
		auto:          true,
		previewReport: map[string]any{"encoding": "GBK"},
	}
	fx := newFixture(t, p, TriggerAuto)
	if _, err := fx.LibraryDB.Exec(`DELETE FROM data`); err != nil {
		t.Fatal(err)
	}
	if _, err := fx.LibraryDB.Exec(`DELETE FROM book_formats`); err != nil {
		t.Fatal(err)
	}

	run, err := fx.Service.FixEncodingForBook(fx.BookID, fx.AdminID, nil)
	if err != nil {
		t.Fatalf("FixEncodingForBook: %v", err)
	}
	if run.Status != "failed" {
		t.Errorf("status = %q，期望 failed", run.Status)
	}
	if !strings.Contains(run.ErrorMessage, "没有 TXT 格式") {
		t.Errorf("error_message = %q", run.ErrorMessage)
	}
}

// TestFixEncodingPreviewFailure 覆盖 preview 失败。
func TestFixEncodingPreviewFailure(t *testing.T) {
	p := &toolProvider{
		manifest:   toolManifest(),
		auto:       true,
		previewErr: errString("preview boom"),
	}
	fx := newFixture(t, p, TriggerAuto)

	run, err := fx.Service.FixEncodingForBook(fx.BookID, fx.AdminID, nil)
	if err != nil {
		t.Fatalf("FixEncodingForBook: %v", err)
	}
	if run.Status != "failed" {
		t.Errorf("status = %q，期望 failed", run.Status)
	}
}

// TestFixEncodingApplyFailureRollsBack 覆盖 apply 失败后回滚。
func TestFixEncodingApplyFailureRollsBack(t *testing.T) {
	p := &toolProvider{
		manifest:      toolManifest(),
		auto:          true,
		previewReport: map[string]any{"encoding": "GBK"},
		applyErr:      errString("apply boom"),
	}
	fx := newFixture(t, p, TriggerAuto)

	run, err := fx.Service.FixEncodingForBook(fx.BookID, fx.AdminID, nil)
	if err != nil {
		t.Fatalf("FixEncodingForBook: %v", err)
	}
	if run.Status != "failed" {
		t.Errorf("status = %q，期望 failed", run.Status)
	}
	// 原文件应保持原样。
	body, _ := os.ReadFile(fx.TxtPath)
	if string(body) != "原始内容" {
		t.Errorf("apply 失败后原文件被改动: %q", body)
	}
}

// TestFixEncodingExplicitConnection 覆盖显式指定连接。
func TestFixEncodingExplicitConnection(t *testing.T) {
	p := &toolProvider{
		manifest:      toolManifest(),
		auto:          false,
		previewReport: map[string]any{"encoding": "UTF-8"},
	}
	fx := newFixture(t, p, TriggerManual)

	connID := fx.ConnectionID
	run, err := fx.Service.FixEncodingForBook(fx.BookID, fx.AdminID, &connID)
	if err != nil {
		t.Fatalf("FixEncodingForBook: %v", err)
	}
	if run == nil {
		t.Fatal("显式连接应产生 run")
	}
	if run.Status != "succeeded" {
		t.Errorf("status = %q", run.Status)
	}
}

// TestFixEncodingUnknownConnection 覆盖显式连接不存在。
func TestFixEncodingUnknownConnection(t *testing.T) {
	p := &toolProvider{manifest: toolManifest(), auto: true}
	fx := newFixture(t, p, TriggerAuto)

	missing := int64(9999)
	run, err := fx.Service.FixEncodingForBook(fx.BookID, fx.AdminID, &missing)
	if err != nil {
		t.Fatalf("FixEncodingForBook: %v", err)
	}
	if run != nil {
		t.Error("连接不存在时应返回 nil run")
	}
}

// TestFixEncodingRunPersisted 覆盖 run 落库。
func TestFixEncodingRunPersisted(t *testing.T) {
	p := &toolProvider{
		manifest:      toolManifest(),
		auto:          true,
		previewReport: map[string]any{"encoding": "UTF-8"},
	}
	fx := newFixture(t, p, TriggerAuto)

	run, err := fx.Service.FixEncodingForBook(fx.BookID, fx.AdminID, nil)
	if err != nil {
		t.Fatalf("FixEncodingForBook: %v", err)
	}

	var status, trigger, action string
	var requestedBy int64
	err = fx.DB.QueryRow(`SELECT status, trigger, action, requested_by FROM plugin_runs WHERE id = ?`,
		run.ID).Scan(&status, &trigger, &action, &requestedBy)
	if err != nil {
		t.Fatalf("查询 run 失败: %v", err)
	}
	if status != "succeeded" || trigger != "auto" || action != "run" {
		t.Errorf("status/trigger/action = %s/%s/%s", status, trigger, action)
	}
	if requestedBy != fx.AdminID {
		t.Errorf("requested_by = %d，期望 %d", requestedBy, fx.AdminID)
	}
}

// TestFixEncodingRunInputData 覆盖 input_data 记录 book_id。
func TestFixEncodingRunInputData(t *testing.T) {
	p := &toolProvider{
		manifest:      toolManifest(),
		auto:          true,
		previewReport: map[string]any{"encoding": "UTF-8"},
	}
	fx := newFixture(t, p, TriggerAuto)

	run, err := fx.Service.FixEncodingForBook(fx.BookID, fx.AdminID, nil)
	if err != nil {
		t.Fatalf("FixEncodingForBook: %v", err)
	}
	var inputData string
	if err := fx.DB.QueryRow(`SELECT input_data FROM plugin_runs WHERE id = ?`, run.ID).Scan(&inputData); err != nil {
		t.Fatalf("查询 input_data 失败: %v", err)
	}
	if !strings.Contains(inputData, "book_id") {
		t.Errorf("input_data = %q，应含 book_id", inputData)
	}
}

// TestFixEncodingFailedRunPersisted 覆盖失败 run 落库。
func TestFixEncodingFailedRunPersisted(t *testing.T) {
	p := &toolProvider{
		manifest:      toolManifest(),
		auto:          true,
		previewReport: map[string]any{"unrecoverable": true},
	}
	fx := newFixture(t, p, TriggerAuto)

	run, err := fx.Service.FixEncodingForBook(fx.BookID, fx.AdminID, nil)
	if err != nil {
		t.Fatalf("FixEncodingForBook: %v", err)
	}
	var status, errorCode string
	if err := fx.DB.QueryRow(`SELECT status, error_code FROM plugin_runs WHERE id = ?`,
		run.ID).Scan(&status, &errorCode); err != nil {
		t.Fatalf("查询 run 失败: %v", err)
	}
	if status != "failed" || errorCode != "booktools.auto_failed" {
		t.Errorf("status/error_code = %s/%s", status, errorCode)
	}
}

// TestFixEncodingErrorMessageTruncated 覆盖错误信息截断到 1000 字符。
func TestFixEncodingErrorMessageTruncated(t *testing.T) {
	long := strings.Repeat("x", 2000)
	p := &toolProvider{
		manifest:   toolManifest(),
		auto:       true,
		previewErr: errString(long),
	}
	fx := newFixture(t, p, TriggerAuto)

	run, err := fx.Service.FixEncodingForBook(fx.BookID, fx.AdminID, nil)
	if err != nil {
		t.Fatalf("FixEncodingForBook: %v", err)
	}
	if len(run.ErrorMessage) > 1000 {
		t.Errorf("error_message 长度 = %d，应 <= 1000", len(run.ErrorMessage))
	}
}

// TestRestoreBackupMissing 覆盖备份不存在时返回 false。
func TestRestoreBackupMissing(t *testing.T) {
	p := &toolProvider{manifest: toolManifest(), auto: true}
	fx := newFixture(t, p, TriggerAuto)

	if fx.Service.restoreBackup(fx.BookID, "") {
		t.Error("空路径应返回 false")
	}
	if fx.Service.restoreBackup(fx.BookID, filepath.Join(fx.BackupRoot, "nope.txt")) {
		t.Error("不存在的备份应返回 false")
	}
}

// TestRestoreBackupRestores 覆盖备份恢复。
func TestRestoreBackupRestores(t *testing.T) {
	p := &toolProvider{manifest: toolManifest(), auto: true}
	fx := newFixture(t, p, TriggerAuto)

	backup := filepath.Join(fx.BackupRoot, "backup.txt")
	if err := os.WriteFile(backup, []byte("备份内容"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(fx.TxtPath, []byte("被改坏"), 0o644); err != nil {
		t.Fatal(err)
	}
	if !fx.Service.restoreBackup(fx.BookID, backup) {
		t.Fatal("恢复应成功")
	}
	body, _ := os.ReadFile(fx.TxtPath)
	if string(body) != "备份内容" {
		t.Errorf("恢复后内容 = %q", body)
	}
}

// TestBackupRootFallback 覆盖备份根目录回落临时目录。
func TestBackupRootFallback(t *testing.T) {
	svc := NewService(Config{})
	if svc.backupRoot() != os.TempDir() {
		t.Errorf("backupRoot = %q，期望 %q", svc.backupRoot(), os.TempDir())
	}
}

// TestNowFallback 覆盖时间回落。
func TestNowFallback(t *testing.T) {
	svc := NewService(Config{})
	if svc.now().IsZero() {
		t.Error("now 不应为零值")
	}
}

// TestToMapVariants 覆盖 toMap 的多种输入。
func TestToMapVariants(t *testing.T) {
	if got := toMap(nil); len(got) != 0 {
		t.Errorf("nil → %v", got)
	}
	direct := map[string]any{"a": 1}
	if got := toMap(direct); got["a"] != 1 {
		t.Errorf("map → %v", got)
	}
	rec := plugindomain.NewDomainRecord(map[string]any{"b": 2})
	if got := toMap(rec); got["b"] != 2 {
		t.Errorf("DomainRecord → %v", got)
	}
	if got := toMap(&rec); got["b"] != 2 {
		t.Errorf("*DomainRecord → %v", got)
	}
	type custom struct {
		C int `json:"c"`
	}
	if got := toMap(custom{C: 3}); got["c"] != float64(3) {
		t.Errorf("struct → %v", got)
	}
}

// TestCopyCountsAndWithCounts 覆盖计数表复制与覆盖。
func TestCopyCountsAndWithCounts(t *testing.T) {
	base := map[string]int{"fetched": 0, "updated": 0}
	got := copyCounts(base)
	if len(got) != 2 || got["fetched"] != 0 {
		t.Errorf("copyCounts = %v", got)
	}
	// 修改副本不应影响原表。
	got["fetched"] = 9
	if base["fetched"] != 0 {
		t.Error("copyCounts 应深拷贝")
	}

	merged := withCounts(base, map[string]int{"fetched": 1, "updated": 1})
	if merged["fetched"] != 1 || merged["updated"] != 1 {
		t.Errorf("withCounts = %v", merged)
	}
}

// TestIsAlreadyCorrect 覆盖编码判定。
func TestIsAlreadyCorrect(t *testing.T) {
	cases := []struct {
		encoding string
		want     bool
	}{
		{"UTF-8", true},
		{"utf8", true},
		{"UTF8", true},
		{"ascii", true},
		{"ASCII", true},
		{"GBK", false},
		{"", false},
	}
	for _, tc := range cases {
		if got := isAlreadyCorrect(map[string]any{"encoding": tc.encoding}); got != tc.want {
			t.Errorf("isAlreadyCorrect(%q) = %v，期望 %v", tc.encoding, got, tc.want)
		}
	}
}

// TestJsonTextAndNullHelpers 覆盖 JSON 与 NULL 辅助。
func TestJsonTextAndNullHelpers(t *testing.T) {
	if got := jsonText(nil); got != "{}" {
		t.Errorf("jsonText(nil) = %q", got)
	}
	if got := jsonText(map[string]any{"a": 1}); got != `{"a":1}` {
		t.Errorf("jsonText = %q", got)
	}
	if got := nullString(""); got != nil {
		t.Errorf("nullString(\"\") = %v", got)
	}
	if got := nullString("x"); got != "x" {
		t.Errorf("nullString(x) = %v", got)
	}
	if got := nullInt64(sql.NullInt64{}); got != nil {
		t.Errorf("nullInt64(invalid) = %v", got)
	}
	if got := nullInt64(sql.NullInt64{Int64: 5, Valid: true}); got != int64(5) {
		t.Errorf("nullInt64(5) = %v", got)
	}
}

// TestFormatTime 覆盖时间格式。
func TestFormatTime(t *testing.T) {
	got := formatTime(time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC))
	if got != "2026-01-02 03:04:05.000000" {
		t.Errorf("formatTime = %q", got)
	}
}

// TestAsString 覆盖 manifest 字段规整。
func TestAsString(t *testing.T) {
	if got := asString(nil); got != "" {
		t.Errorf("asString(nil) = %q", got)
	}
	if got := asString("x"); got != "x" {
		t.Errorf("asString(x) = %q", got)
	}
	if got := asString(7); got != "7" {
		t.Errorf("asString(7) = %q", got)
	}
}

// TestUpdateRunUnknownID 覆盖更新不存在的 run 不报错。
func TestUpdateRunUnknownID(t *testing.T) {
	p := &toolProvider{manifest: toolManifest(), auto: true}
	fx := newFixture(t, p, TriggerAuto)

	run := &userdb.PluginRun{ID: 99999, Status: "succeeded", Counts: map[string]any{}}
	if err := updateRun(fx.DB, run); err != nil {
		t.Errorf("更新不存在的 run 不应报错: %v", err)
	}
}

// errString 是测试用的简单错误类型。
type errString string

// Error 实现 error。
func (e errString) Error() string { return string(e) }
