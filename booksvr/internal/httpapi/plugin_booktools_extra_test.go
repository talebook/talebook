package httpapi

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/plugindomain"
)

// ---- toolRestoreBackup（回滚路径） ----

func TestToolRestoreBackup(t *testing.T) {
	fx := newToolFixture(t, TextReplaceRoute, nil)
	fx.seedBook(t, "三体", "TXT", "original")

	backup := filepath.Join(t.TempDir(), "backup.txt")
	if err := os.WriteFile(backup, []byte("restored"), 0o644); err != nil {
		t.Fatalf("写备份失败: %v", err)
	}

	ok, err := toolRestoreBackup(fx.DB, fx.BookID, "TXT", backup)
	if err != nil {
		t.Fatalf("toolRestoreBackup: %v", err)
	}
	if !ok {
		t.Fatal("应恢复成功")
	}
	raw, err := os.ReadFile(fx.BookPath)
	if err != nil {
		t.Fatalf("读回失败: %v", err)
	}
	if string(raw) != "restored" {
		t.Errorf("内容 = %q", raw)
	}
}

func TestToolRestoreBackupEmptyPath(t *testing.T) {
	fx := newToolFixture(t, TextReplaceRoute, nil)
	fx.seedBook(t, "三体", "TXT", "original")

	ok, err := toolRestoreBackup(fx.DB, fx.BookID, "TXT", "")
	if err != nil {
		t.Fatalf("toolRestoreBackup: %v", err)
	}
	if ok {
		t.Error("空路径不应恢复")
	}
}

func TestToolRestoreBackupMissingFile(t *testing.T) {
	fx := newToolFixture(t, TextReplaceRoute, nil)
	fx.seedBook(t, "三体", "TXT", "original")

	ok, err := toolRestoreBackup(fx.DB, fx.BookID, "TXT",
		filepath.Join(t.TempDir(), "nope.txt"))
	if err != nil {
		t.Fatalf("toolRestoreBackup: %v", err)
	}
	if ok {
		t.Error("备份不存在时不应恢复")
	}
}

func TestToolRestoreBackupDirectory(t *testing.T) {
	fx := newToolFixture(t, TextReplaceRoute, nil)
	fx.seedBook(t, "三体", "TXT", "original")

	dir := t.TempDir()
	ok, err := toolRestoreBackup(fx.DB, fx.BookID, "TXT", dir)
	if err != nil {
		t.Fatalf("toolRestoreBackup: %v", err)
	}
	if ok {
		t.Error("目录不是普通文件，不应恢复")
	}
}

// ---- zhSyncBookMeta（替换模式元数据同步） ----

func TestZhSyncBookMetaUpdatesTitle(t *testing.T) {
	fx := newToolFixture(t, ZhConverterRoute, nil)
	fx.seedBook(t, "三体", "EPUB", "hello")

	zhSyncBookMeta(fx.DB, fx.BookID, "", "三體", nil)

	book, err := library.GetBooksData(fx.DB, []int64{fx.BookID})
	if err != nil || len(book) == 0 {
		t.Fatalf("取书失败: %v", err)
	}
	if book[0].Title != "三體" {
		t.Errorf("title = %q", book[0].Title)
	}
}

func TestZhSyncBookMetaReplacesAuthors(t *testing.T) {
	fx := newToolFixture(t, ZhConverterRoute, nil)
	fx.seedBook(t, "三体", "EPUB", "hello")
	if _, err := fx.DB.Exec(`INSERT INTO authors (id, name) VALUES (1, '刘慈欣')`); err != nil {
		t.Fatalf("插入作者失败: %v", err)
	}
	if _, err := fx.DB.Exec(`INSERT INTO books_authors_link (book, author) VALUES (?, 1)`,
		fx.BookID); err != nil {
		t.Fatalf("关联作者失败: %v", err)
	}

	zhSyncBookMeta(fx.DB, fx.BookID, "", "", []string{"劉慈欣"})

	book, _ := library.GetBooksData(fx.DB, []int64{fx.BookID})
	if len(book[0].Authors) != 1 || book[0].Authors[0] != "劉慈欣" {
		t.Errorf("authors = %v", book[0].Authors)
	}
}

func TestZhSyncBookMetaReusesExistingAuthor(t *testing.T) {
	fx := newToolFixture(t, ZhConverterRoute, nil)
	fx.seedBook(t, "三体", "EPUB", "hello")
	if _, err := fx.DB.Exec(`INSERT INTO authors (id, name) VALUES (1, '刘慈欣')`); err != nil {
		t.Fatalf("插入作者失败: %v", err)
	}

	// 同名作者应复用既有行，不重复创建。
	zhSyncBookMeta(fx.DB, fx.BookID, "", "", []string{"刘慈欣"})

	var count int
	if err := fx.DB.QueryRow(`SELECT COUNT(*) FROM authors WHERE name = '刘慈欣'`).Scan(&count); err != nil {
		t.Fatalf("查作者失败: %v", err)
	}
	if count != 1 {
		t.Errorf("authors 行数 = %d, want 1", count)
	}
}

func TestZhSyncBookMetaUpdatesLanguage(t *testing.T) {
	fx := newToolFixture(t, ZhConverterRoute, nil)
	fx.seedBook(t, "三体", "EPUB", "hello")

	zhSyncBookMeta(fx.DB, fx.BookID, "zht", "", nil)

	book, _ := library.GetBooksData(fx.DB, []int64{fx.BookID})
	if book[0].Language != "zht" {
		t.Errorf("language = %q", book[0].Language)
	}
}

func TestZhSyncBookMetaReusesExistingLanguage(t *testing.T) {
	fx := newToolFixture(t, ZhConverterRoute, nil)
	fx.seedBook(t, "三体", "EPUB", "hello")
	if _, err := fx.DB.Exec(`INSERT INTO languages (id, lang_code) VALUES (1, 'zht')`); err != nil {
		t.Fatalf("插入语言失败: %v", err)
	}

	zhSyncBookMeta(fx.DB, fx.BookID, "zht", "", nil)

	var count int
	if err := fx.DB.QueryRow(`SELECT COUNT(*) FROM languages WHERE lang_code = 'zht'`).Scan(&count); err != nil {
		t.Fatalf("查语言失败: %v", err)
	}
	if count != 1 {
		t.Errorf("languages 行数 = %d, want 1", count)
	}
}

func TestZhSyncBookMetaSkipsEmptyAuthor(t *testing.T) {
	fx := newToolFixture(t, ZhConverterRoute, nil)
	fx.seedBook(t, "三体", "EPUB", "hello")

	// 空白作者应被跳过，不建行。
	zhSyncBookMeta(fx.DB, fx.BookID, "", "", []string{"  ", ""})

	var count int
	if err := fx.DB.QueryRow(`SELECT COUNT(*) FROM authors`).Scan(&count); err != nil {
		t.Fatalf("查作者失败: %v", err)
	}
	if count != 0 {
		t.Errorf("authors 行数 = %d, want 0", count)
	}
}

// ---- 回滚钩子接线（write 失败时恢复备份） ----

func TestToolRunWriteRollbackRestoresBackup(t *testing.T) {
	provider := &toolProvider{
		manifest: toolManifest("talebook.tool.test", TextReplaceRoute),
		apply: func(_ plugindomain.ToolInput, outDir string, _ map[string]any) (plugindomain.ToolOutput, error) {
			out := filepath.Join(outDir, "out.txt")
			if err := os.WriteFile(out, []byte("replaced"), 0o644); err != nil {
				return plugindomain.ToolOutput{DomainRecord: plugindomain.NewDomainRecord(nil)}, err
			}
			return plugindomain.ToolOutput{DomainRecord: plugindomain.NewDomainRecord(
				map[string]any{"path": out, "matches": 1})}, nil
		},
	}
	fx := newToolFixture(t, TextReplaceRoute, provider)
	fx.seedBook(t, "三体", "TXT", "original")
	fx.enableTool(t)

	// 覆盖模式：写回成功并产生备份。
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/",
		`{"book_id":`+jsonNumber(fx.BookID)+`,"output_mode":"overwrite"}`, 1, true)
	got, err := UserTextReplaceRunHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v, msg = %v", got["err"], got["msg"])
	}
	backup := pluginStr(got["backup_path"])
	if backup == "" {
		t.Fatal("未产生备份")
	}
	raw, _ := os.ReadFile(fx.BookPath)
	if string(raw) != "replaced" {
		t.Fatalf("写回后内容 = %q", raw)
	}

	// 用备份回滚，应恢复原内容。
	ok, err := toolRestoreBackup(fx.DB, fx.BookID, "TXT", backup)
	if err != nil {
		t.Fatalf("toolRestoreBackup: %v", err)
	}
	if !ok {
		t.Fatal("回滚失败")
	}
	raw, _ = os.ReadFile(fx.BookPath)
	if string(raw) != "original" {
		t.Errorf("回滚后内容 = %q", raw)
	}
}

// ---- backupDir 默认实现 ----

func TestBackupDirUsesConvertPath(t *testing.T) {
	base := t.TempDir()
	cfg := BookToolsConfig{Settings: map[string]any{"convert_path": base}}

	got := cfg.backupDir()
	if got != filepath.Join(base, "texttools-backups") {
		t.Errorf("path = %q", got)
	}
	if info, err := os.Stat(got); err != nil || !info.IsDir() {
		t.Errorf("目录未创建: %v", err)
	}
}

func TestBackupDirFallsBackToTemp(t *testing.T) {
	cfg := BookToolsConfig{Settings: map[string]any{}}
	got := cfg.backupDir()
	if !strings.HasSuffix(got, "texttools-backups") {
		t.Errorf("path = %q", got)
	}
}

// ---- toolResolveBook 权限分支 ----

func TestToolResolveBookDenied(t *testing.T) {
	fx := newToolFixture(t, TextReplaceRoute, nil)
	fx.seedBook(t, "三体", "TXT", "hello")
	fx.Cfg.CanViewBook = func(*Context, int64) (bool, error) { return false, nil }

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/", "", 1, false)
	_, err := fx.Cfg.toolResolveBook(ctx, fx.BookID)
	if err == nil {
		t.Fatal("无权查看应报错")
	}
	// 错误消息必须与「不存在」一致，避免探测私有书籍。
	if !strings.Contains(err.Error(), "书籍不存在") {
		t.Errorf("msg = %q", err.Error())
	}
}

func TestToolResolveBookAllowed(t *testing.T) {
	fx := newToolFixture(t, TextReplaceRoute, nil)
	fx.seedBook(t, "三体", "TXT", "hello")
	fx.Cfg.CanViewBook = func(*Context, int64) (bool, error) { return true, nil }

	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/", "", 1, false)
	book, err := fx.Cfg.toolResolveBook(ctx, fx.BookID)
	if err != nil {
		t.Fatalf("toolResolveBook: %v", err)
	}
	if book.Title != "三体" {
		t.Errorf("title = %q", book.Title)
	}
}

// ---- workDir 默认实现 ----

func TestWorkDirDefault(t *testing.T) {
	cfg := BookToolsConfig{}
	dir, err := cfg.workDir()
	if err != nil {
		t.Fatalf("workDir: %v", err)
	}
	defer func() { _ = os.RemoveAll(dir) }()
	if info, err := os.Stat(dir); err != nil || !info.IsDir() {
		t.Errorf("目录未创建: %v", err)
	}
	if !strings.Contains(filepath.Base(dir), "talebook-texttools-") {
		t.Errorf("目录名 = %q", filepath.Base(dir))
	}
}

// ---- bookToolsRuntime 默认实现 ----

func TestBookToolsRuntimeDefault(t *testing.T) {
	fx := newToolFixture(t, TextReplaceRoute, nil)
	cfg := BookToolsConfig{Settings: fx.Cfg.Settings, Registry: fx.Registry}
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/", "", 1, false)

	if rt := cfg.bookToolsRuntime(ctx); rt == nil {
		t.Fatal("应返回运行时")
	}
}

// ---- EPUB 美化预览成功路径 ----

func TestUserEpubBeautifyPreviewSuccess(t *testing.T) {
	provider := &toolProvider{
		manifest: toolManifest("talebook.tool.test", EpubBeautifyRoute),
		preview: func(src plugindomain.ToolInput, _ map[string]any) (plugindomain.ToolReport, error) {
			if src.Values["format"] != "EPUB" {
				t.Errorf("format = %v", src.Values["format"])
			}
			return plugindomain.ToolReport{DomainRecord: plugindomain.NewDomainRecord(
				map[string]any{"chapters": 12})}, nil
		},
	}
	fx := newToolFixture(t, EpubBeautifyRoute, provider)
	fx.seedBook(t, "三体", "EPUB", "hello")
	fx.enableTool(t)

	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/",
		`{"book_id":`+jsonNumber(fx.BookID)+`}`, 1, false)
	got, err := UserEpubBeautifyPreviewHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v, msg = %v", got["err"], got["msg"])
	}
	if got["chapters"] != 12 {
		t.Errorf("chapters = %v", got["chapters"])
	}
	if got["book_id"] != fx.BookID {
		t.Errorf("book_id = %v", got["book_id"])
	}
}

// ---- 工具未启用时的各入口 ----

func TestToolEntriesReportNotEnabled(t *testing.T) {
	fx := newToolFixture(t, TextReplaceRoute, nil)
	fx.seedBook(t, "三体", "TXT", "hello")
	// 不启用工具。
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/",
		`{"book_id":`+jsonNumber(fx.BookID)+`}`, 1, true)

	cases := []struct {
		name    string
		handler HandlerFunc
	}{
		{"text-replace/run", UserTextReplaceRunHandler(fx.Cfg)},
		{"txt-fixer/analyze", UserTxtFixerAnalyzeHandler(fx.Cfg)},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := tc.handler(ctx)
			if err != nil {
				t.Fatalf("handler: %v", err)
			}
			if got["err"] != "booktools.failed" {
				t.Errorf("err = %v", got["err"])
			}
		})
	}
}

// ---- 无效请求体 ----

func TestToolHandlersRejectBadBody(t *testing.T) {
	fx := newToolFixture(t, TextReplaceRoute, nil)
	fx.seedBook(t, "三体", "TXT", "hello")
	ctx := pluginCtx(t, fx.DB, http.MethodPost, "/", `not json`, 1, true)

	for _, handler := range []HandlerFunc{
		UserTextReplacePreviewHandler(fx.Cfg),
		UserTextReplaceRunHandler(fx.Cfg),
		UserTxtFixerAnalyzeHandler(fx.Cfg),
		UserTxtFixerRunHandler(fx.Cfg),
		UserZhConverterRunHandler(fx.Cfg),
		UserEpubBeautifyPreviewHandler(fx.Cfg),
		UserEpubBeautifyRunHandler(fx.Cfg),
	} {
		got, err := handler(ctx)
		if err != nil {
			t.Fatalf("handler: %v", err)
		}
		if got["err"] != "booktools.failed" {
			t.Errorf("err = %v", got["err"])
		}
	}
}
