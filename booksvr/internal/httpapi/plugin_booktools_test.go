package httpapi

import (
	"database/sql"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginruntime"
)

// toolProvider 是满足 TransformProvider 契约的最小实现。
type toolProvider struct {
	manifest map[string]any
	formats  map[string]bool
	preview  func(plugindomain.ToolInput, map[string]any) (plugindomain.ToolReport, error)
	apply    func(plugindomain.ToolInput, string, map[string]any) (plugindomain.ToolOutput, error)
}

func (p *toolProvider) Manifest() map[string]any { return p.manifest }
func (p *toolProvider) SupportedFormats() map[string]bool {
	if p.formats == nil {
		return map[string]bool{}
	}
	return p.formats
}
func (p *toolProvider) SupportsAutoTrigger() bool { return false }
func (p *toolProvider) Preview(src plugindomain.ToolInput,
	ctx map[string]any) (plugindomain.ToolReport, error) {
	if p.preview == nil {
		return plugindomain.ToolReport{DomainRecord: plugindomain.NewDomainRecord(nil)}, nil
	}
	return p.preview(src, ctx)
}
func (p *toolProvider) Apply(src plugindomain.ToolInput, outDir string,
	ctx map[string]any) (plugindomain.ToolOutput, error) {
	if p.apply == nil {
		return plugindomain.ToolOutput{DomainRecord: plugindomain.NewDomainRecord(nil)}, nil
	}
	return p.apply(src, outDir, ctx)
}

// Invoke 实现 MethodDispatcher，供 runtime 动态分派 preview/apply。
//
// handler 传入的是 DomainRecord，这里升格为 ToolInput。
func (p *toolProvider) Invoke(method string, args []any, ctx map[string]any) (any, error) {
	src := toolInputOf(args)
	switch method {
	case "preview":
		return p.Preview(src, ctx)
	case "apply":
		outDir := ""
		if len(args) > 1 {
			outDir, _ = args[1].(string)
		}
		return p.Apply(src, outDir, ctx)
	}
	return nil, nil
}

// toolInputOf 把分派参数升格为 ToolInput。
func toolInputOf(args []any) plugindomain.ToolInput {
	if len(args) == 0 {
		return plugindomain.ToolInput{DomainRecord: plugindomain.NewDomainRecord(nil)}
	}
	switch v := args[0].(type) {
	case plugindomain.ToolInput:
		return v
	case plugindomain.DomainRecord:
		return plugindomain.ToolInput{DomainRecord: v}
	case map[string]any:
		return plugindomain.ToolInput{DomainRecord: plugindomain.NewDomainRecord(v)}
	}
	return plugindomain.ToolInput{DomainRecord: plugindomain.NewDomainRecord(nil)}
}

// toolManifest 构造一份声明 integrations.tool 能力的合法清单。
func toolManifest(id, manageRoute string) map[string]any {
	return map[string]any{
		"protocol_version":  "talebook.plugin/v1",
		"id":                id,
		"name":              "正文工具",
		"version":           "1.0.0",
		"categories":        []any{"integrations"},
		"capabilities":      []any{"integrations.tool"},
		"runtime_kind":      "builtin",
		"actions":           []any{"test"},
		"auth_schema":       map[string]any{"properties": map[string]any{}},
		"config_schema":     map[string]any{},
		"connection_owners": []any{"instance"},
		"permissions":       []any{"books.read", "books.write"},
		"data_policy":       map[string]any{},
		"compatibility":     map[string]any{},
		"homepage":          "",
		"license":           "",
		"ui":                map[string]any{"manage_route": manageRoute, "icon": "mdi-text"},
	}
}

// toolFixture 是一次内置文本工具测试的完整环境。
type toolFixture struct {
	DB       *sql.DB
	Cfg      BookToolsConfig
	Registry *pluginruntime.PluginRegistry
	Provider *toolProvider
	BookID   int64
	BookPath string
}

// newToolFixture 建库、注册工具 provider 并返回可用的配置。
func newToolFixture(t *testing.T, manageRoute string,
	provider *toolProvider) *toolFixture {
	t.Helper()
	db := netSchemaDB(t)
	if _, err := db.Exec(`INSERT INTO readers (id, username, password, admin, active, permission, create_time)
		VALUES (1, 'admin', 'x', 1, 1, '', '2026-01-01 00:00:00')`); err != nil {
		t.Fatalf("插入管理员失败: %v", err)
	}
	createCalibreTables(t, db)
	// book_formats 是 Talebook 自有表，权威 schema.sql 已建；此处仅确保存在。
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS book_formats (
		id INTEGER PRIMARY KEY, book_id INTEGER, format TEXT, path TEXT,
		size INTEGER, mtime INTEGER, hash TEXT)`); err != nil {
		t.Fatalf("建 book_formats 失败: %v", err)
	}

	reg := pluginruntime.NewPluginRegistry()
	if provider == nil {
		provider = &toolProvider{manifest: toolManifest("talebook.tool.test", manageRoute)}
	}
	if _, err := reg.Register(provider, pluginiface.CapabilitySet{
		Interfaces:   map[string]bool{"TransformProvider": true},
		HasSelfCheck: true,
		Methods:      map[string]bool{"self_check": true},
	}); err != nil {
		t.Fatalf("Register: %v", err)
	}

	settings := map[string]any{"PLUGIN_SECRET_KEY": "test-key-123"}
	cfg := BookToolsConfig{
		Settings: settings,
		Registry: reg,
		WorkDir:  func() (string, error) { return t.TempDir(), nil },
		BackupDir: func() string {
			return t.TempDir()
		},
	}
	return &toolFixture{DB: db, Cfg: cfg, Registry: reg, Provider: provider}
}

// seedBook 插入一本书并登记格式文件。
func (fx *toolFixture) seedBook(t *testing.T, title, format, content string) {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, strings.ToLower(title)+"."+strings.ToLower(format))
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	res, err := fx.DB.Exec(`INSERT INTO books
		(title, author_sort, path, timestamp, pubdate, series_index, has_cover)
		VALUES (?, 'a', 'p', 1700000000, '2020-01-01', 1.0, 0)`, title)
	if err != nil {
		t.Fatalf("插入书籍失败: %v", err)
	}
	bookID, _ := res.LastInsertId()
	// book_formats 供 ResolvePath 使用；data 供 GetBooksData 的 Formats 使用。
	if _, err := fx.DB.Exec(`INSERT INTO book_formats (book_id, format, path, size, mtime, hash)
		VALUES (?, ?, ?, ?, 0, '')`, bookID, format, path, len(content)); err != nil {
		t.Fatalf("登记格式失败: %v", err)
	}
	if _, err := fx.DB.Exec(`INSERT INTO data (book, format, uncompressed_size, name)
		VALUES (?, ?, ?, ?)`, bookID, format, len(content), path); err != nil {
		t.Fatalf("登记 data 失败: %v", err)
	}
	fx.BookID = bookID
	fx.BookPath = path
}

// enableTool 安装并启用工具插件，建一条启用的实例连接。
func (fx *toolFixture) enableTool(t *testing.T) {
	t.Helper()
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/", `{"plugin_key":"talebook.tool.test"}`, 1, true)
	if _, err := AdminPluginInstallHandler(PluginConfig{
		Settings: fx.Cfg.Settings, Registry: fx.Registry,
	})(ctx); err != nil {
		t.Fatalf("install: %v", err)
	}
	if _, err := fx.DB.Exec(`UPDATE plugin_installations SET enabled = 1, status = 'active'`); err != nil {
		t.Fatalf("enable: %v", err)
	}
	if _, err := fx.DB.Exec(`UPDATE plugin_connections SET enabled = 1`); err != nil {
		t.Fatalf("enable conn: %v", err)
	}
}

// ---- 路由 ----

func TestBookToolsRouteSpecs(t *testing.T) {
	specs := BookToolsRouteSpecs(BookToolsConfig{})
	if len(specs) != 10 {
		t.Fatalf("len = %d, want 10", len(specs))
	}
	adminCount := 0
	for _, s := range specs {
		if !s.Auth {
			t.Errorf("%s 应要求登录", s.Pattern)
		}
		if !strings.HasPrefix(s.Pattern, "/api/plugins/tools/") {
			t.Errorf("意外路由 %q", s.Pattern)
		}
		if s.Admin {
			adminCount++
		}
	}
	// 四个 run 接口要求管理员。
	if adminCount != 5 {
		t.Errorf("admin 路由 = %d, want 5", adminCount)
	}
}

// ---- _tool_book_id ----

func TestToolBookID(t *testing.T) {
	if _, err := toolBookID(map[string]any{}); err == nil {
		t.Error("缺 book_id 应报错")
	}
	if _, err := toolBookID(map[string]any{"book_id": 0}); err == nil {
		t.Error("book_id=0 应报错")
	}
	if _, err := toolBookID(map[string]any{"book_id": -1}); err == nil {
		t.Error("负数应报错")
	}
	got, err := toolBookID(map[string]any{"book_id": 7})
	if err != nil || got != 7 {
		t.Errorf("got = %d, err = %v", got, err)
	}
	// 字符串数字可解析。
	got, err = toolBookID(map[string]any{"book_id": "8"})
	if err != nil || got != 8 {
		t.Errorf("got = %d, err = %v", got, err)
	}
}

// ---- _book_option ----

func TestBookOptionFiltersFormats(t *testing.T) {
	book := &library.BookData{
		ID: 1, Title: "三体", Authors: []string{"刘慈欣"},
		Formats: []string{"MOBI", "EPUB", "PDF", "TXT"}, Timestamp: 1700000000,
	}
	got := bookOption(book)
	formats := got["formats"].([]string)
	if len(formats) != 2 || formats[0] != "EPUB" || formats[1] != "TXT" {
		t.Errorf("formats = %v", formats)
	}
	if got["title"] != "三体" {
		t.Errorf("title = %v", got["title"])
	}
	if got["timestamp"] != "1700000000" {
		t.Errorf("timestamp = %v", got["timestamp"])
	}
}

// ---- UserBookToolsBooks ----

func TestUserBookToolsBooksByID(t *testing.T) {
	fx := newToolFixture(t, TextReplaceRoute, nil)
	fx.seedBook(t, "三体", "TXT", "hello")
	ctx := pluginCtx(t, fx.DB, http.MethodGet,
		"/api/plugins/tools/books?book_id="+jsonNumber(fx.BookID), "", 1, false)

	got, err := UserBookToolsBooksHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	if got["total"] != 1 {
		t.Errorf("total = %v", got["total"])
	}
	books := got["books"].([]map[string]any)
	if len(books) != 1 || books[0]["title"] != "三体" {
		t.Errorf("books = %v", books)
	}
}

func TestUserBookToolsBooksByIDNoUsableFormat(t *testing.T) {
	fx := newToolFixture(t, TextReplaceRoute, nil)
	fx.seedBook(t, "三体", "MOBI", "hello")
	ctx := pluginCtx(t, fx.DB, http.MethodGet,
		"/api/plugins/tools/books?book_id="+jsonNumber(fx.BookID), "", 1, false)

	got, err := UserBookToolsBooksHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["total"] != 0 || len(got["books"].([]map[string]any)) != 0 {
		t.Errorf("got = %v", got)
	}
}

func TestUserBookToolsBooksByIDMissing(t *testing.T) {
	fx := newToolFixture(t, TextReplaceRoute, nil)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/plugins/tools/books?book_id=999", "", 1, false)

	got, err := UserBookToolsBooksHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "booktools.failed" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestUserBookToolsBooksSearch(t *testing.T) {
	fx := newToolFixture(t, TextReplaceRoute, nil)
	fx.seedBook(t, "三体", "TXT", "hello")
	fx.seedBook(t, "活着", "EPUB", "hello")

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/plugins/tools/books?query=三体", "", 1, false)
	got, err := UserBookToolsBooksHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	books := got["books"].([]map[string]any)
	if len(books) != 1 || books[0]["title"] != "三体" {
		t.Errorf("books = %v", books)
	}
	if got["total"] != 1 {
		t.Errorf("total = %v", got["total"])
	}
}

func TestUserBookToolsBooksSearchCaseInsensitive(t *testing.T) {
	fx := newToolFixture(t, TextReplaceRoute, nil)
	fx.seedBook(t, "The Hobbit", "TXT", "hello")

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/plugins/tools/books?query=HOBBIT", "", 1, false)
	got, err := UserBookToolsBooksHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if len(got["books"].([]map[string]any)) != 1 {
		t.Errorf("books = %v", got["books"])
	}
}

// ---- AdminBookToolActions ----

func TestAdminBookToolActions(t *testing.T) {
	fx := newToolFixture(t, TextReplaceRoute, nil)
	fx.seedBook(t, "三体", "TXT", "hello")
	fx.enableTool(t)

	ctx := pluginCtx(t, fx.DB, http.MethodGet,
		"/api/plugins/tools/book-actions?book_id="+jsonNumber(fx.BookID), "", 1, true)
	got, err := AdminBookToolActionsHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v, msg = %v", got["err"], got["msg"])
	}
	actions := got["actions"].([]map[string]any)
	if len(actions) != 1 {
		t.Fatalf("actions = %v", actions)
	}
	if actions[0]["route"] != TextReplaceRoute {
		t.Errorf("route = %v", actions[0]["route"])
	}
	if actions[0]["icon"] != "mdi-text" {
		t.Errorf("icon = %v", actions[0]["icon"])
	}
}

func TestAdminBookToolActionsSkipsUnsupportedFormat(t *testing.T) {
	provider := &toolProvider{
		manifest: toolManifest("talebook.tool.test", TextReplaceRoute),
		formats:  map[string]bool{"EPUB": true},
	}
	fx := newToolFixture(t, TextReplaceRoute, provider)
	fx.seedBook(t, "三体", "TXT", "hello")
	fx.enableTool(t)

	ctx := pluginCtx(t, fx.DB, http.MethodGet,
		"/api/plugins/tools/book-actions?book_id="+jsonNumber(fx.BookID), "", 1, true)
	got, err := AdminBookToolActionsHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	// 插件只支持 EPUB，书只有 TXT，应被跳过。
	if len(got["actions"].([]map[string]any)) != 0 {
		t.Errorf("actions = %v", got["actions"])
	}
}

func TestAdminBookToolActionsMissingBookID(t *testing.T) {
	fx := newToolFixture(t, TextReplaceRoute, nil)
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/plugins/tools/book-actions", "", 1, true)

	got, err := AdminBookToolActionsHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "booktools.failed" {
		t.Errorf("err = %v", got["err"])
	}
}

// ---- 预览 ----

func TestUserTextReplacePreview(t *testing.T) {
	provider := &toolProvider{
		manifest: toolManifest("talebook.tool.test", TextReplaceRoute),
		preview: func(src plugindomain.ToolInput, _ map[string]any) (plugindomain.ToolReport, error) {
			if src.Values["format"] != "TXT" {
				t.Errorf("format = %v", src.Values["format"])
			}
			if src.Values["pattern"] != "foo" {
				t.Errorf("pattern = %v", src.Values["pattern"])
			}
			return plugindomain.ToolReport{DomainRecord: plugindomain.NewDomainRecord(map[string]any{"matches": 3})}, nil
		},
	}
	fx := newToolFixture(t, TextReplaceRoute, provider)
	fx.seedBook(t, "三体", "TXT", "hello")
	fx.enableTool(t)

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/",
		`{"book_id":`+jsonNumber(fx.BookID)+`,"pattern":"foo","replacement":"bar"}`, 1, false)
	got, err := UserTextReplacePreviewHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v, msg = %v", got["err"], got["msg"])
	}
	if got["matches"] != 3 {
		t.Errorf("matches = %v", got["matches"])
	}
	if got["book_id"] != fx.BookID {
		t.Errorf("book_id = %v", got["book_id"])
	}
}

func TestUserTextReplacePreviewNoUsableFormat(t *testing.T) {
	fx := newToolFixture(t, TextReplaceRoute, nil)
	fx.seedBook(t, "三体", "MOBI", "hello")
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/",
		`{"book_id":`+jsonNumber(fx.BookID)+`}`, 1, false)

	got, err := UserTextReplacePreviewHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "booktools.failed" {
		t.Errorf("err = %v", got["err"])
	}
	if !strings.Contains(pluginStr(got["msg"]), "没有 TXT 或 EPUB 格式") {
		t.Errorf("msg = %v", got["msg"])
	}
}

func TestUserTextReplacePreviewToolNotEnabled(t *testing.T) {
	fx := newToolFixture(t, TextReplaceRoute, nil)
	fx.seedBook(t, "三体", "TXT", "hello")
	// 不调用 enableTool：工具未启用。
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/",
		`{"book_id":`+jsonNumber(fx.BookID)+`}`, 1, false)

	got, err := UserTextReplacePreviewHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if !strings.Contains(pluginStr(got["msg"]), "正文工具未启用") {
		t.Errorf("msg = %v", got["msg"])
	}
}

func TestUserTxtFixerAnalyze(t *testing.T) {
	provider := &toolProvider{
		manifest: toolManifest("talebook.tool.test", TXTFixerRoute),
		preview: func(src plugindomain.ToolInput, _ map[string]any) (plugindomain.ToolReport, error) {
			return plugindomain.ToolReport{DomainRecord: plugindomain.NewDomainRecord(map[string]any{"encoding": "gbk"})}, nil
		},
	}
	fx := newToolFixture(t, TXTFixerRoute, provider)
	fx.seedBook(t, "三体", "TXT", "hello")
	fx.enableTool(t)

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/",
		`{"book_id":`+jsonNumber(fx.BookID)+`}`, 1, false)
	got, err := UserTxtFixerAnalyzeHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v, msg = %v", got["err"], got["msg"])
	}
	if got["encoding"] != "gbk" {
		t.Errorf("encoding = %v", got["encoding"])
	}
}

func TestUserTxtFixerAnalyzeRequiresTXT(t *testing.T) {
	fx := newToolFixture(t, TXTFixerRoute, nil)
	fx.seedBook(t, "三体", "EPUB", "hello")
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/",
		`{"book_id":`+jsonNumber(fx.BookID)+`}`, 1, false)

	got, err := UserTxtFixerAnalyzeHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if !strings.Contains(pluginStr(got["msg"]), "没有 TXT 格式") {
		t.Errorf("msg = %v", got["msg"])
	}
}

// ---- EPUB 美化 ----

func TestUserEpubBeautifyPresets(t *testing.T) {
	fx := newToolFixture(t, EpubBeautifyRoute, nil)
	fx.Cfg.EpubBeautifyPresets = func() map[string]any {
		return map[string]any{"presets": []any{"a", "b"}, "toc_styles": []any{"elegant"}}
	}
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/plugins/tools/epub-beautify/presets", "", 1, false)

	got, err := UserEpubBeautifyPresetsHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	if len(got["presets"].([]any)) != 2 {
		t.Errorf("presets = %v", got["presets"])
	}
}

func TestUserEpubBeautifyPreviewRequiresEPUB(t *testing.T) {
	fx := newToolFixture(t, EpubBeautifyRoute, nil)
	fx.seedBook(t, "三体", "TXT", "hello")
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/",
		`{"book_id":`+jsonNumber(fx.BookID)+`}`, 1, false)

	got, err := UserEpubBeautifyPreviewHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if !strings.Contains(pluginStr(got["msg"]), "没有 EPUB 格式") {
		t.Errorf("msg = %v", got["msg"])
	}
}

// ---- 运行（write） ----

func TestUserTextReplaceRunNewBook(t *testing.T) {
	provider := &toolProvider{
		manifest: toolManifest("talebook.tool.test", TextReplaceRoute),
		apply: func(_ plugindomain.ToolInput, outDir string, _ map[string]any) (plugindomain.ToolOutput, error) {
			out := filepath.Join(outDir, "out.txt")
			if err := os.WriteFile(out, []byte("replaced"), 0o644); err != nil {
				return plugindomain.ToolOutput{DomainRecord: plugindomain.NewDomainRecord(nil)}, err
			}
			return plugindomain.ToolOutput{DomainRecord: plugindomain.NewDomainRecord(map[string]any{"path": out, "matches": 2})}, nil
		},
	}
	fx := newToolFixture(t, TextReplaceRoute, provider)
	fx.seedBook(t, "三体", "TXT", "hello")
	fx.enableTool(t)

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/",
		`{"book_id":`+jsonNumber(fx.BookID)+`,"pattern":"a","replacement":"b"}`, 1, true)
	got, err := UserTextReplaceRunHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v, msg = %v", got["err"], got["msg"])
	}
	if got["output_mode"] != "new" {
		t.Errorf("output_mode = %v", got["output_mode"])
	}
	newID := pluginInt(got["book_id"], 0)
	if newID == 0 || newID == fx.BookID {
		t.Fatalf("book_id = %v", got["book_id"])
	}
	book, err := library.GetBooksData(fx.DB, []int64{newID})
	if err != nil || len(book) == 0 {
		t.Fatalf("取新书失败: %v", err)
	}
	if book[0].Title != "三体（正文替换版）" {
		t.Errorf("title = %q", book[0].Title)
	}
	// 原书未被改动。
	raw, _ := os.ReadFile(fx.BookPath)
	if string(raw) != "hello" {
		t.Errorf("原书被改动: %q", raw)
	}
}

func TestUserTextReplaceRunOverwrite(t *testing.T) {
	provider := &toolProvider{
		manifest: toolManifest("talebook.tool.test", TextReplaceRoute),
		apply: func(_ plugindomain.ToolInput, outDir string, _ map[string]any) (plugindomain.ToolOutput, error) {
			out := filepath.Join(outDir, "out.txt")
			if err := os.WriteFile(out, []byte("replaced"), 0o644); err != nil {
				return plugindomain.ToolOutput{DomainRecord: plugindomain.NewDomainRecord(nil)}, err
			}
			return plugindomain.ToolOutput{DomainRecord: plugindomain.NewDomainRecord(map[string]any{"path": out, "matches": 2})}, nil
		},
	}
	fx := newToolFixture(t, TextReplaceRoute, provider)
	fx.seedBook(t, "三体", "TXT", "hello")
	fx.enableTool(t)

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/",
		`{"book_id":`+jsonNumber(fx.BookID)+`,"output_mode":"overwrite"}`, 1, true)
	got, err := UserTextReplaceRunHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v, msg = %v", got["err"], got["msg"])
	}
	if pluginInt(got["book_id"], 0) != fx.BookID {
		t.Errorf("book_id = %v", got["book_id"])
	}
	if pluginStr(got["backup_path"]) == "" {
		t.Error("覆盖模式应产生备份")
	}
	raw, _ := os.ReadFile(fx.BookPath)
	if string(raw) != "replaced" {
		t.Errorf("原书内容 = %q", raw)
	}
}

func TestUserTextReplaceRunRejectsBadOutputMode(t *testing.T) {
	fx := newToolFixture(t, TextReplaceRoute, nil)
	fx.seedBook(t, "三体", "TXT", "hello")
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/",
		`{"book_id":`+jsonNumber(fx.BookID)+`,"output_mode":"nope"}`, 1, true)

	got, err := UserTextReplaceRunHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if !strings.Contains(pluginStr(got["msg"]), "output_mode 必须为 new 或 overwrite") {
		t.Errorf("msg = %v", got["msg"])
	}
}

func TestUserTxtFixerRunNewBook(t *testing.T) {
	provider := &toolProvider{
		manifest: toolManifest("talebook.tool.test", TXTFixerRoute),
		apply: func(_ plugindomain.ToolInput, outDir string, _ map[string]any) (plugindomain.ToolOutput, error) {
			out := filepath.Join(outDir, "out.txt")
			if err := os.WriteFile(out, []byte("fixed"), 0o644); err != nil {
				return plugindomain.ToolOutput{DomainRecord: plugindomain.NewDomainRecord(nil)}, err
			}
			return plugindomain.ToolOutput{DomainRecord: plugindomain.NewDomainRecord(map[string]any{"path": out, "encoding": "gbk"})}, nil
		},
	}
	fx := newToolFixture(t, TXTFixerRoute, provider)
	fx.seedBook(t, "三体", "TXT", "hello")
	fx.enableTool(t)

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/",
		`{"book_id":`+jsonNumber(fx.BookID)+`}`, 1, true)
	got, err := UserTxtFixerRunHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v, msg = %v", got["err"], got["msg"])
	}
	newID := pluginInt(got["book_id"], 0)
	book, _ := library.GetBooksData(fx.DB, []int64{newID})
	if len(book) == 0 || book[0].Title != "三体（编码修复版）" {
		t.Errorf("title = %v", book)
	}
}

func TestUserZhConverterRunNewBook(t *testing.T) {
	provider := &toolProvider{
		manifest: toolManifest("talebook.tool.test", ZhConverterRoute),
		apply: func(_ plugindomain.ToolInput, outDir string, _ map[string]any) (plugindomain.ToolOutput, error) {
			out := filepath.Join(outDir, "out.epub")
			if err := os.WriteFile(out, []byte("converted"), 0o644); err != nil {
				return plugindomain.ToolOutput{DomainRecord: plugindomain.NewDomainRecord(nil)}, err
			}
			return plugindomain.ToolOutput{DomainRecord: plugindomain.NewDomainRecord(map[string]any{
				"path": out, "language": "zht",
				"converted_title": "三體", "converted_authors": []any{"劉慈欣"},
			})}, nil
		},
	}
	fx := newToolFixture(t, ZhConverterRoute, provider)
	fx.seedBook(t, "三体", "EPUB", "hello")
	fx.enableTool(t)

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/",
		`{"book_id":`+jsonNumber(fx.BookID)+`,"direction":"s2t"}`, 1, true)
	got, err := UserZhConverterRunHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v, msg = %v", got["err"], got["msg"])
	}
	newID := pluginInt(got["book_id"], 0)
	book, _ := library.GetBooksData(fx.DB, []int64{newID})
	if len(book) == 0 {
		t.Fatal("未找到新书")
	}
	if book[0].Title != "三體（繁體版）" {
		t.Errorf("title = %q", book[0].Title)
	}
	if book[0].Language != "zht" {
		t.Errorf("language = %q", book[0].Language)
	}
}

func TestUserZhConverterRunRejectsBadOutputMode(t *testing.T) {
	fx := newToolFixture(t, ZhConverterRoute, nil)
	fx.seedBook(t, "三体", "EPUB", "hello")
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/",
		`{"book_id":`+jsonNumber(fx.BookID)+`,"output_mode":"overwrite"}`, 1, true)

	got, err := UserZhConverterRunHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if !strings.Contains(pluginStr(got["msg"]), "output_mode 必须为 new 或 replace") {
		t.Errorf("msg = %v", got["msg"])
	}
}

func TestUserEpubBeautifyRun(t *testing.T) {
	provider := &toolProvider{
		manifest: toolManifest("talebook.tool.test", EpubBeautifyRoute),
		apply: func(_ plugindomain.ToolInput, outDir string, _ map[string]any) (plugindomain.ToolOutput, error) {
			out := filepath.Join(outDir, "out.epub")
			if err := os.WriteFile(out, []byte("beautified"), 0o644); err != nil {
				return plugindomain.ToolOutput{DomainRecord: plugindomain.NewDomainRecord(nil)}, err
			}
			return plugindomain.ToolOutput{DomainRecord: plugindomain.NewDomainRecord(map[string]any{
				"path": out, "preset": "elegant",
				"stats": map[string]any{"marked_headers": 5},
			})}, nil
		},
	}
	fx := newToolFixture(t, EpubBeautifyRoute, provider)
	fx.seedBook(t, "三体", "EPUB", "hello")
	fx.enableTool(t)

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/",
		`{"book_id":`+jsonNumber(fx.BookID)+`,"preset":"elegant"}`, 1, true)
	got, err := UserEpubBeautifyRunHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v, msg = %v", got["err"], got["msg"])
	}
	if got["output_mode"] != "new" {
		t.Errorf("output_mode = %v", got["output_mode"])
	}
	if got["preset"] != "elegant" {
		t.Errorf("preset = %v", got["preset"])
	}
	newID := pluginInt(got["book_id"], 0)
	book, _ := library.GetBooksData(fx.DB, []int64{newID})
	if len(book) == 0 || book[0].Title != "三体（美化版）" {
		t.Errorf("title = %v", book)
	}
	// 原书零改动。
	raw, _ := os.ReadFile(fx.BookPath)
	if string(raw) != "hello" {
		t.Errorf("原书被改动: %q", raw)
	}
}

// ---- _epub_beautify_input ----

func TestEpubBeautifyInputDefaults(t *testing.T) {
	got := epubBeautifyInput(map[string]any{}, "/tmp/a.epub")
	if got["format"] != "EPUB" {
		t.Errorf("format = %v", got["format"])
	}
	if got["toc_style"] != "elegant" {
		t.Errorf("toc_style = %v", got["toc_style"])
	}
	if got["use_system_fonts"] != true {
		t.Errorf("use_system_fonts = %v", got["use_system_fonts"])
	}
	if got["note_mark"] != "orig" {
		t.Errorf("note_mark = %v", got["note_mark"])
	}
	if got["dialogue"] != false {
		t.Errorf("dialogue = %v", got["dialogue"])
	}
}

func TestEpubBeautifyInputPassthrough(t *testing.T) {
	got := epubBeautifyInput(map[string]any{
		"preset": "p", "toc_style": "plain", "use_system_fonts": false,
		"dialogue": true, "note_mark": "num", "toc_depth": 3,
	}, "/tmp/a.epub")
	if got["preset"] != "p" || got["toc_style"] != "plain" {
		t.Errorf("got = %v", got)
	}
	if got["use_system_fonts"] != false || got["dialogue"] != true {
		t.Errorf("got = %v", got)
	}
	if got["note_mark"] != "num" || got["toc_depth"] != 3 {
		t.Errorf("got = %v", got)
	}
}

// ---- toolRecordDict ----

func TestToolRecordDict(t *testing.T) {
	if got := toolRecordDict(nil); len(got) != 0 {
		t.Errorf("nil → %v", got)
	}
	if got := toolRecordDict(map[string]any{"a": 1}); got["a"] != 1 {
		t.Errorf("map → %v", got)
	}
	rec := plugindomain.NewDomainRecord(map[string]any{"b": 2})
	if got := toolRecordDict(rec); got["b"] != 2 {
		t.Errorf("DomainRecord → %v", got)
	}
	if got := toolRecordDict("x"); len(got) != 0 {
		t.Errorf("string → %v", got)
	}
}
