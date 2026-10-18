package httpapi

import (
	"archive/zip"
	"context"
	"database/sql"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"
)

func TestExtractCaseFallbackAndAmbiguity(t *testing.T) {
	file := t.TempDir() + "/case.epub"
	if err := writeZip(file, map[string]string{"OPS/Chapter.xhtml": "body"}); err != nil {
		t.Fatal(err)
	}
	data, err := extractZipEntry(file, "ops/chapter.xhtml")
	if err != nil || string(data) != "body" {
		t.Fatalf("%q %v", data, err)
	}
	if err = writeZip(file, map[string]string{"OPS/Chapter.xhtml": "a", "OPS/CHAPTER.xhtml": "b"}); err != nil {
		t.Fatal(err)
	}
	if _, err = extractZipEntry(file, "ops/chapter.xhtml"); err == nil {
		t.Fatal("ambiguous case accepted")
	}
	if _, err = extractZipEntry(file, "../OPS/Chapter.xhtml"); err == nil {
		t.Fatal("traversal accepted")
	}
}

// 本文件覆盖 files.go（/get/* 路由族）此前完全没有测试的部分：
// ImageHandler、filesGetData、parseBookID、filesHasID、filesGetCover、
// filesThumbnail、filesGetMetadataAsOPF、lastModifiedHeader、
// ProxyImageHandler、ProgressHandler、EpubReader、extractZipEntry、
// StaticThemesHandler、LogoHandler、serveStaticFile、notFound、contentTypeByExt。

// writeFileBytes 写一个字节文件。
func writeFileBytes(path string, data []byte) error {
	return os.WriteFile(path, data, 0o644)
}

// writeZip 写一个含指定条目的 zip 文件。
func writeZip(path string, entries map[string]string) error {
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	zw := zip.NewWriter(f)
	for name, body := range entries {
		w, err := zw.Create(name)
		if err != nil {
			return err
		}
		if _, err := w.Write([]byte(body)); err != nil {
			return err
		}
	}
	return zw.Close()
}

// urlQueryEscape 对查询参数做转义。
func urlQueryEscape(raw string) string {
	return url.QueryEscape(raw)
}

// filesFixture 建一个含 books 表的 Calibre 风格内存库与 FilesConfig。
func filesFixture(t *testing.T) (*Context, FilesConfig) {
	t.Helper()
	db := comicTestDB(t)
	if _, err := db.Exec(`INSERT INTO books (id, title, path, has_cover, last_modified)
		VALUES (1, '测试书', 'Author/Book (1)', 0, '2026-01-01 00:00:00')`); err != nil {
		t.Fatalf("插入书失败: %v", err)
	}
	cfg := FilesConfig{
		DB:           db,
		LibraryRoot:  t.TempDir(),
		DefaultCover: []byte("DEFAULT-COVER"),
		BuildTime:    time.Unix(1700000000, 0),
	}
	ctx := &Context{
		Request: httptest.NewRequest(http.MethodGet, "/get/cover/1", nil),
		Writer:  httptest.NewRecorder(),
	}
	return ctx, cfg
}

// ---- parseBookID ----

func TestParseBookID(t *testing.T) {
	cases := []struct {
		raw     string
		want    int64
		wantErr bool
	}{
		{"1", 1, false},
		{"123", 123, false},
		{"abc_42", 42, false},
		{"abc_42.jpg", 42, false},
		{"42.jpg", 42, false},
		{"abc", 0, true},
		{"", 0, true},
		{"abc_def", 0, true},
	}
	for _, tc := range cases {
		got, err := parseBookID(tc.raw)
		if tc.wantErr {
			if err == nil {
				t.Errorf("parseBookID(%q) 应报错，实际 %d", tc.raw, got)
			}
			continue
		}
		if err != nil {
			t.Errorf("parseBookID(%q) 报错: %v", tc.raw, err)
			continue
		}
		if got != tc.want {
			t.Errorf("parseBookID(%q) = %d, want %d", tc.raw, got, tc.want)
		}
	}
}

// ---- filesHasID ----

func TestFilesHasID(t *testing.T) {
	_, cfg := filesFixture(t)
	if !filesHasID(cfg.DB, 1) {
		t.Errorf("id=1 应存在")
	}
	if filesHasID(cfg.DB, 999) {
		t.Errorf("id=999 不应存在")
	}
	if filesHasID(nil, 1) {
		t.Errorf("nil 库应返回 false")
	}
}

// ---- lastModifiedHeader ----

func TestLastModifiedHeader(t *testing.T) {
	got := lastModifiedHeader(0)
	if got != "Thu, 01 Jan 1970 00:00:00 GMT" {
		t.Errorf("lastModifiedHeader(0) = %q", got)
	}
	got = lastModifiedHeader(1700000000)
	if !strings.HasSuffix(got, "GMT") {
		t.Errorf("应以 GMT 结尾，实际 %q", got)
	}
}

// ---- ImageHandler ----

// TestImageHandlerDefaultCover 默认封面分支直接写字节。
func TestImageHandlerDefaultCover(t *testing.T) {
	ctx, cfg := filesFixture(t)
	ctx.Params = []string{"cover", "default"}

	if _, err := ImageHandler(cfg)(ctx); err != nil {
		t.Fatalf("ImageHandler: %v", err)
	}
	rec := ctx.Writer.(*httptest.ResponseRecorder)
	if rec.Body.String() != "DEFAULT-COVER" {
		t.Errorf("body = %q", rec.Body.String())
	}
	if ct := rec.Header().Get("Content-Type"); ct != "image/jpeg" {
		t.Errorf("Content-Type = %q", ct)
	}
}

// TestImageHandlerZeroIDIsDefault id=0 也走默认封面。
func TestImageHandlerZeroIDIsDefault(t *testing.T) {
	ctx, cfg := filesFixture(t)
	ctx.Params = []string{"cover", "0"}

	if _, err := ImageHandler(cfg)(ctx); err != nil {
		t.Fatalf("ImageHandler: %v", err)
	}
	rec := ctx.Writer.(*httptest.ResponseRecorder)
	if rec.Body.String() != "DEFAULT-COVER" {
		t.Errorf("body = %q", rec.Body.String())
	}
}

// 注意：/get/* 系列 handler 直接写响应并返回 nil, nil（与 Python 一致），
// 因此断言要看响应状态码而非返回的 error。

// assertNotFound 断言响应为 404。
func assertNotFound(t *testing.T, ctx *Context) {
	t.Helper()
	rec, ok := ctx.Writer.(*httptest.ResponseRecorder)
	if !ok {
		t.Fatalf("Writer 类型 = %T", ctx.Writer)
	}
	if rec.Code != http.StatusNotFound {
		t.Errorf("状态码 = %d, want 404", rec.Code)
	}
}

// TestImageHandlerUnknownBook 不存在的书返回 404。
func TestImageHandlerUnknownBook(t *testing.T) {
	ctx, cfg := filesFixture(t)
	ctx.Params = []string{"cover", "999"}

	if _, err := ImageHandler(cfg)(ctx); err != nil {
		t.Fatalf("不应返回裸错误: %v", err)
	}
	assertNotFound(t, ctx)
}

// TestImageHandlerBadID 非法 id 返回 404。
func TestImageHandlerBadID(t *testing.T) {
	ctx, cfg := filesFixture(t)
	ctx.Params = []string{"cover", "abc"}

	if _, err := ImageHandler(cfg)(ctx); err != nil {
		t.Fatalf("不应返回裸错误: %v", err)
	}
	assertNotFound(t, ctx)
}

// TestImageHandlerBadFormat 未知格式返回 404。
func TestImageHandlerBadFormat(t *testing.T) {
	ctx, cfg := filesFixture(t)
	ctx.Params = []string{"nope", "1"}

	if _, err := ImageHandler(cfg)(ctx); err != nil {
		t.Fatalf("不应返回裸错误: %v", err)
	}
	assertNotFound(t, ctx)
}

// TestImageHandlerCanViewBookDenied 无权限时按不存在处理。
func TestImageHandlerCanViewBookDenied(t *testing.T) {
	ctx, cfg := filesFixture(t)
	cfg.CanViewBook = func(*Context, int64) bool { return false }
	ctx.Params = []string{"cover", "1"}

	if _, err := ImageHandler(cfg)(ctx); err != nil {
		t.Fatalf("不应返回裸错误: %v", err)
	}
	assertNotFound(t, ctx)
}

// ---- filesGetData：缩略图尺寸解析 ----

// TestFilesGetDataThumbnailSizes thumb_<w>_<h> 解析尺寸。
func TestFilesGetDataThumbnailSizes(t *testing.T) {
	ctx, cfg := filesFixture(t)
	var gotW, gotH int
	cfg.Thumbnail = func(data []byte, w, h int) ([]byte, error) {
		gotW, gotH = w, h
		return []byte("THUMB"), nil
	}

	if _, err := filesGetData(cfg, ctx, "thumb_120_160", "1"); err != nil {
		t.Fatalf("filesGetData: %v", err)
	}
	if gotW != 120 || gotH != 160 {
		t.Errorf("尺寸 = %dx%d, want 120x160", gotW, gotH)
	}
}

// TestFilesGetDataThumbnailDefault 裸 thumb 用默认尺寸 60x80。
func TestFilesGetDataThumbnailDefault(t *testing.T) {
	ctx, cfg := filesFixture(t)
	var gotW, gotH int
	cfg.Thumbnail = func(data []byte, w, h int) ([]byte, error) {
		gotW, gotH = w, h
		return []byte("THUMB"), nil
	}

	if _, err := filesGetData(cfg, ctx, "thumb", "1"); err != nil {
		t.Fatalf("filesGetData: %v", err)
	}
	if gotW != 60 || gotH != 80 {
		t.Errorf("尺寸 = %dx%d, want 60x80", gotW, gotH)
	}
}

// TestFilesGetDataThumbnailBadSize 非法尺寸回落到默认值。
func TestFilesGetDataThumbnailBadSize(t *testing.T) {
	ctx, cfg := filesFixture(t)
	var gotW, gotH int
	cfg.Thumbnail = func(data []byte, w, h int) ([]byte, error) {
		gotW, gotH = w, h
		return []byte("THUMB"), nil
	}

	if _, err := filesGetData(cfg, ctx, "thumb_abc_def", "1"); err != nil {
		t.Fatalf("filesGetData: %v", err)
	}
	if gotW != 60 || gotH != 80 {
		t.Errorf("尺寸 = %dx%d, want 60x80", gotW, gotH)
	}
}

// TestFilesGetDataThumbnailError 缩略图失败时写出 404。
func TestFilesGetDataThumbnailError(t *testing.T) {
	ctx, cfg := filesFixture(t)
	cfg.Thumbnail = func([]byte, int, int) ([]byte, error) {
		return nil, errors.New("boom")
	}

	if _, err := filesGetData(cfg, ctx, "thumb", "1"); err != nil {
		t.Fatalf("不应返回裸错误: %v", err)
	}
	assertNotFound(t, ctx)
}

// ---- filesGetMetadataAsOPF ----

// TestFilesGetMetadataAsOPFInjected 注入的渲染器被调用且设置 Content-Type。
func TestFilesGetMetadataAsOPFInjected(t *testing.T) {
	ctx, cfg := filesFixture(t)
	called := false
	cfg.MetadataToOPF = func(_ *sql.DB, id int64) ([]byte, error) {
		called = true
		if id != 1 {
			t.Errorf("id = %d, want 1", id)
		}
		return []byte("<opf/>"), nil
	}

	got, err := filesGetMetadataAsOPF(cfg, ctx, 1)
	if err != nil {
		t.Fatalf("filesGetMetadataAsOPF: %v", err)
	}
	if !called {
		t.Errorf("注入的渲染器未被调用")
	}
	if string(got) != "<opf/>" {
		t.Errorf("内容 = %q", string(got))
	}
	if ct := ctx.Writer.Header().Get("Content-Type"); !strings.Contains(ct, "oebps-package") {
		t.Errorf("Content-Type = %q", ct)
	}
}

// ---- ProxyImageHandler ----

// assertYoho 断言响应体为 "yoho"（代理拒绝时的固定响应）。
func assertYoho(t *testing.T, ctx *Context) {
	t.Helper()
	rec := ctx.Writer.(*httptest.ResponseRecorder)
	if rec.Body.String() != "yoho" {
		t.Errorf("body = %q, want yoho", rec.Body.String())
	}
}

// TestProxyImageHandlerMissingURL 缺 url 参数返回 yoho。
func TestProxyImageHandlerMissingURL(t *testing.T) {
	ctx, cfg := filesFixture(t)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/get/pcover", nil)

	if _, err := ProxyImageHandler(cfg)(ctx); err != nil {
		t.Fatalf("不应返回裸错误: %v", err)
	}
	assertYoho(t, ctx)
}

// TestProxyImageHandlerBadURL 非法 URL 返回 yoho。
func TestProxyImageHandlerBadURL(t *testing.T) {
	ctx, cfg := filesFixture(t)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/get/pcover?url=://bad", nil)

	if _, err := ProxyImageHandler(cfg)(ctx); err != nil {
		t.Fatalf("不应返回裸错误: %v", err)
	}
	assertYoho(t, ctx)
}

// TestProxyImageHandlerHostNotAllowed 非白名单主机返回 yoho。
func TestProxyImageHandlerHostNotAllowed(t *testing.T) {
	ctx, cfg := filesFixture(t)
	cfg.AllowsImageProxyHost = func(string) bool { return false }
	ctx.Request = httptest.NewRequest(http.MethodGet,
		"/get/pcover?url="+urlQueryEscape("https://evil.example/x.jpg"), nil)

	if _, err := ProxyImageHandler(cfg)(ctx); err != nil {
		t.Fatalf("不应返回裸错误: %v", err)
	}
	assertYoho(t, ctx)
}

// TestProxyImageHandlerSuccess 白名单主机成功返回图片。
func TestProxyImageHandlerSuccess(t *testing.T) {
	ctx, cfg := filesFixture(t)
	cfg.AllowsImageProxyHost = func(string) bool { return true }
	cfg.FetchImage = func(context.Context, string) (int, http.Header, []byte, error) {
		h := http.Header{}
		h.Set("Content-Type", "image/png")
		return http.StatusOK, h, []byte("PNGDATA"), nil
	}
	ctx.Request = httptest.NewRequest(http.MethodGet,
		"/get/pcover?url="+urlQueryEscape("https://ok.example/x.png"), nil)

	if _, err := ProxyImageHandler(cfg)(ctx); err != nil {
		t.Fatalf("ProxyImageHandler: %v", err)
	}
	rec := ctx.Writer.(*httptest.ResponseRecorder)
	if rec.Body.String() != "PNGDATA" {
		t.Errorf("body = %q", rec.Body.String())
	}
}

// TestProxyImageHandlerUpstreamError 上游失败时把错误写入响应体。
func TestProxyImageHandlerUpstreamError(t *testing.T) {
	ctx, cfg := filesFixture(t)
	cfg.AllowsImageProxyHost = func(string) bool { return true }
	cfg.FetchImage = func(context.Context, string) (int, http.Header, []byte, error) {
		return 0, nil, nil, errors.New("network down")
	}
	ctx.Request = httptest.NewRequest(http.MethodGet,
		"/get/pcover?url="+urlQueryEscape("https://ok.example/x.png"), nil)

	if _, err := ProxyImageHandler(cfg)(ctx); err != nil {
		t.Fatalf("不应返回裸错误: %v", err)
	}
	rec := ctx.Writer.(*httptest.ResponseRecorder)
	if !strings.Contains(rec.Body.String(), "network down") {
		t.Errorf("body = %q，应包含上游错误信息", rec.Body.String())
	}
}

// ---- contentTypeByExt ----

func TestContentTypeByExt(t *testing.T) {
	cases := map[string]string{
		"a.jpg":  "image/jpeg",
		"a.jpeg": "image/jpeg",
		"a.png":  "image/png",
		"a.gif":  "image/gif",
		"a.webp": "image/webp",
		"a.css":  "text/css; charset=utf-8",
		"a.js":   "application/javascript; charset=utf-8",
		"a.xyz":  "application/octet-stream",
	}
	for name, want := range cases {
		if got := contentTypeByExt(name); got != want {
			t.Errorf("contentTypeByExt(%q) = %q, want %q", name, got, want)
		}
	}
}

// ---- notFound ----

// TestNotFound 写出 404 且返回 nil。
func TestNotFound(t *testing.T) {
	ctx, _ := filesFixture(t)
	if err := notFound(ctx, "因为不存在"); err != nil {
		t.Fatalf("notFound 应返回 nil，实际 %v", err)
	}
	rec := ctx.Writer.(*httptest.ResponseRecorder)
	if rec.Code != http.StatusNotFound {
		t.Errorf("状态码 = %d, want 404", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "因为不存在") {
		t.Errorf("body = %q", rec.Body.String())
	}
}

// ---- serveStaticFile ----

// TestServeStaticFileMissing 文件不存在返回 404。
func TestServeStaticFileMissing(t *testing.T) {
	ctx, _ := filesFixture(t)
	if err := serveStaticFile(ctx, t.TempDir(), "nope.txt"); err != nil {
		t.Fatalf("不应返回裸错误: %v", err)
	}
	assertNotFound(t, ctx)
}

// TestServeStaticFilePathTraversal 路径穿越被拒绝。
func TestServeStaticFilePathTraversal(t *testing.T) {
	ctx, _ := filesFixture(t)
	if err := serveStaticFile(ctx, t.TempDir(), "../../etc/passwd"); err != nil {
		t.Fatalf("不应返回裸错误: %v", err)
	}
	assertNotFound(t, ctx)
}

// TestServeStaticFileOK 存在的文件被正常写出。
func TestServeStaticFileOK(t *testing.T) {
	ctx, _ := filesFixture(t)
	root := t.TempDir()
	if err := writeFileBytes(root+"/a.css", []byte("body{}")); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	if err := serveStaticFile(ctx, root, "a.css"); err != nil {
		t.Fatalf("serveStaticFile: %v", err)
	}
	rec := ctx.Writer.(*httptest.ResponseRecorder)
	if rec.Body.String() != "body{}" {
		t.Errorf("body = %q", rec.Body.String())
	}
}

// ---- StaticThemesHandler / LogoHandler ----

// TestStaticThemesHandlerMissing 主题文件不存在返回 404。
func TestStaticThemesHandlerMissing(t *testing.T) {
	ctx, cfg := filesFixture(t)
	cfg.HTMLPath = t.TempDir()
	ctx.Params = []string{"nope.css"}

	if _, err := StaticThemesHandler(cfg)(ctx); err != nil {
		t.Fatalf("不应返回裸错误: %v", err)
	}
	assertNotFound(t, ctx)
}

// TestLogoHandlerMissing logo 不存在返回 404。
func TestLogoHandlerMissing(t *testing.T) {
	ctx, cfg := filesFixture(t)
	cfg.HTMLPath = t.TempDir()

	if _, err := LogoHandler(cfg)(ctx); err != nil {
		t.Fatalf("不应返回裸错误: %v", err)
	}
	assertNotFound(t, ctx)
}

// ---- ProgressHandler ----

// TestProgressHandlerNoPath 未配置 ProgressPath 时返回 404。
func TestProgressHandlerNoPath(t *testing.T) {
	ctx, cfg := filesFixture(t)
	ctx.Params = []string{"1"}

	if _, err := ProgressHandler(cfg)(ctx); err != nil {
		t.Fatalf("不应返回裸错误: %v", err)
	}
	assertNotFound(t, ctx)
}

// TestProgressHandlerMissingFile 进度文件不存在返回 404。
func TestProgressHandlerMissingFile(t *testing.T) {
	ctx, cfg := filesFixture(t)
	cfg.ProgressPath = func(int64) string { return t.TempDir() + "/nope.json" }
	ctx.Params = []string{"1"}

	if _, err := ProgressHandler(cfg)(ctx); err != nil {
		t.Fatalf("不应返回裸错误: %v", err)
	}
	assertNotFound(t, ctx)
}

// ---- EpubReader ----

// TestEpubReaderMissingBook 不存在的书重定向（302）而非 404。
func TestEpubReaderMissingBook(t *testing.T) {
	ctx, cfg := filesFixture(t)
	ctx.Params = []string{"999", "index.html"}

	if _, err := EpubReader(cfg)(ctx); err != nil {
		t.Fatalf("不应返回裸错误: %v", err)
	}
	rec := ctx.Writer.(*httptest.ResponseRecorder)
	if rec.Code != http.StatusFound {
		t.Errorf("状态码 = %d, want 302", rec.Code)
	}
}

// ---- extractZipEntry ----

// TestExtractZipEntryMissingArchive 归档不存在时报错。
func TestExtractZipEntryMissingArchive(t *testing.T) {
	if _, err := extractZipEntry(t.TempDir()+"/nope.epub", "a.html"); err == nil {
		t.Fatalf("不存在的归档应报错")
	}
}

// TestExtractZipEntryNotZip 非 zip 文件报错。
func TestExtractZipEntryNotZip(t *testing.T) {
	dir := t.TempDir()
	p := dir + "/bad.epub"
	if err := writeFileBytes(p, []byte("not a zip")); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	if _, err := extractZipEntry(p, "a.html"); err == nil {
		t.Fatalf("非 zip 应报错")
	}
}

// TestExtractZipEntryMissingEntry 条目不存在返回 errZipEntryMissing。
func TestExtractZipEntryMissingEntry(t *testing.T) {
	dir := t.TempDir()
	p := dir + "/ok.epub"
	if err := writeZip(p, map[string]string{"a.html": "<html/>"}); err != nil {
		t.Fatalf("写 zip 失败: %v", err)
	}
	_, err := extractZipEntry(p, "missing.html")
	if !errors.Is(err, errZipEntryMissing) {
		t.Errorf("err = %v, want errZipEntryMissing", err)
	}
}

// TestExtractZipEntryOK 正常取出条目内容。
func TestExtractZipEntryOK(t *testing.T) {
	dir := t.TempDir()
	p := dir + "/ok.epub"
	if err := writeZip(p, map[string]string{"a.html": "<html>hi</html>"}); err != nil {
		t.Fatalf("写 zip 失败: %v", err)
	}
	got, err := extractZipEntry(p, "a.html")
	if err != nil {
		t.Fatalf("extractZipEntry: %v", err)
	}
	if string(got) != "<html>hi</html>" {
		t.Errorf("内容 = %q", string(got))
	}
}
