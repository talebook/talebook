package httpapi

import (
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"talebook/booksvr/internal/library"
)

// newToolsFixture 建一个带真实格式文件的夹具。
func newToolsFixture(t *testing.T) (*bookWiring, string) {
	t.Helper()
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	createFormatTables(t, db)
	dir := t.TempDir()
	w := newBookWiring(db, db, map[string]any{
		"upload_path":        dir,
		"ALLOW_GUEST_PUSH":   true,
		"ALLOW_GUEST_UPLOAD": true,
	}, nil)
	return w, dir
}

// seedRealFormat 写入真实文件并登记格式（同时写 book_formats 与 data 两表）。
func seedRealFormat(t *testing.T, w *bookWiring, dir string, bookID int64, format, body string) string {
	t.Helper()
	path := filepath.Join(dir, format+"-"+strconv.FormatInt(bookID, 10)+"."+strings.ToLower(format))
	if err := os.WriteFile(path, []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
	seedFormat(t, w.libraryDB, bookID, format, path)
	if _, err := w.libraryDB.Exec(`INSERT INTO data (book, format, uncompressed_size, name)
		VALUES (?, ?, 0, ?)`, bookID, format, filepath.Base(path)); err != nil {
		t.Fatalf("写 data 表失败: %v", err)
	}
	return path
}

// TestBookConvertSameFamily 覆盖同族格式转换。
func TestBookConvertSameFamily(t *testing.T) {
	w, dir := newToolsFixture(t)
	insertBook(t, w.libraryDB, 1, "书")
	insertItem(t, w.libraryDB, 1, "public", 1)
	seedRealFormat(t, w, dir, 1, "EPUB", "PK\x03\x04body")

	resp, err := w.bookConvert(adminCtx(1), 1, map[string]any{"format": "mobi"})
	if err != nil {
		t.Fatalf("转换失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", resp["err"])
	}
	if !w.hasFormat(1, "mobi") {
		t.Error("MOBI 格式未登记")
	}
}

// TestBookConvertCrossFamily 覆盖跨族转换被拒。
func TestBookConvertCrossFamily(t *testing.T) {
	w, dir := newToolsFixture(t)
	insertBook(t, w.libraryDB, 1, "书")
	insertItem(t, w.libraryDB, 1, "public", 1)
	seedRealFormat(t, w, dir, 1, "EPUB", "PK\x03\x04body")

	resp, err := w.bookConvert(adminCtx(1), 1, map[string]any{"format": "pdf"})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "convert.unsupported" {
		t.Errorf("err = %v，期望 convert.unsupported", resp["err"])
	}
}

// TestBookConvertAlreadyExists 覆盖目标格式已存在。
func TestBookConvertAlreadyExists(t *testing.T) {
	w, dir := newToolsFixture(t)
	insertBook(t, w.libraryDB, 1, "书")
	insertItem(t, w.libraryDB, 1, "public", 1)
	seedRealFormat(t, w, dir, 1, "EPUB", "PK\x03\x04body")
	seedRealFormat(t, w, dir, 1, "MOBI", "PK\x03\x04body")

	resp, err := w.bookConvert(adminCtx(1), 1, map[string]any{"format": "mobi"})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "format.exists" {
		t.Errorf("err = %v，期望 format.exists", resp["err"])
	}
}

// TestBookConvertEmptyFormat 覆盖空目标格式。
func TestBookConvertEmptyFormat(t *testing.T) {
	w, dir := newToolsFixture(t)
	insertBook(t, w.libraryDB, 1, "书")
	insertItem(t, w.libraryDB, 1, "public", 1)
	seedRealFormat(t, w, dir, 1, "EPUB", "PK\x03\x04body")

	resp, err := w.bookConvert(adminCtx(1), 1, map[string]any{"format": "  "})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "params.missing" {
		t.Errorf("err = %v，期望 params.missing", resp["err"])
	}
}

// TestBookToPDFRequiresEpub 覆盖 PDF 转换前置条件。
func TestBookToPDFRequiresEpub(t *testing.T) {
	w, dir := newToolsFixture(t)
	insertBook(t, w.libraryDB, 1, "书")
	insertItem(t, w.libraryDB, 1, "public", 1)
	seedRealFormat(t, w, dir, 1, "MOBI", "PK\x03\x04body")

	resp, err := w.bookToPDF(adminCtx(1), 1, map[string]any{})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "format.not_found" {
		t.Errorf("err = %v，期望 format.not_found", resp["err"])
	}
}

// TestBookToPDFUnsupported 覆盖无渲染器时的明确错误。
func TestBookToPDFUnsupported(t *testing.T) {
	w, dir := newToolsFixture(t)
	insertBook(t, w.libraryDB, 1, "书")
	insertItem(t, w.libraryDB, 1, "public", 1)
	seedRealFormat(t, w, dir, 1, "EPUB", "PK\x03\x04body")

	resp, err := w.bookToPDF(adminCtx(1), 1, map[string]any{})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "convert.unsupported" {
		t.Errorf("err = %v，期望 convert.unsupported", resp["err"])
	}
}

// TestBookSeparateCreatesNewBook 覆盖拆分生成新书。
func TestBookSeparateCreatesNewBook(t *testing.T) {
	w, dir := newToolsFixture(t)
	insertBook(t, w.libraryDB, 1, "书")
	insertItem(t, w.libraryDB, 1, "public", 1)
	seedRealFormat(t, w, dir, 1, "EPUB", "PK\x03\x04body")
	seedRealFormat(t, w, dir, 1, "MOBI", "PK\x03\x04body")

	resp, err := w.bookSeparate(adminCtx(1), 1, map[string]any{"format": "mobi"})
	if err != nil {
		t.Fatalf("拆分失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", resp["err"])
	}
	if id, ok := resp["book_id"].(int64); !ok || id == 0 {
		t.Errorf("book_id = %v，期望非零", resp["book_id"])
	}
}

// TestBookSeparateLastFormat 覆盖最后格式不可拆分。
func TestBookSeparateLastFormat(t *testing.T) {
	w, dir := newToolsFixture(t)
	insertBook(t, w.libraryDB, 1, "书")
	insertItem(t, w.libraryDB, 1, "public", 1)
	seedRealFormat(t, w, dir, 1, "EPUB", "PK\x03\x04body")

	resp, err := w.bookSeparate(adminCtx(1), 1, map[string]any{"format": "epub"})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "last.format" {
		t.Errorf("err = %v，期望 last.format", resp["err"])
	}
}

// TestBookSeparateMissingFormat 覆盖格式不存在。
func TestBookSeparateMissingFormat(t *testing.T) {
	w, dir := newToolsFixture(t)
	insertBook(t, w.libraryDB, 1, "书")
	insertItem(t, w.libraryDB, 1, "public", 1)
	seedRealFormat(t, w, dir, 1, "EPUB", "PK\x03\x04body")
	seedRealFormat(t, w, dir, 1, "PDF", "%PDF")

	resp, err := w.bookSeparate(adminCtx(1), 1, map[string]any{"format": "mobi"})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "format.not_found" {
		t.Errorf("err = %v，期望 format.not_found", resp["err"])
	}
}

// TestBookSaveMetaWritesOPF 覆盖元数据保存。
func TestBookSaveMetaWritesOPF(t *testing.T) {
	w, dir := newToolsFixture(t)
	insertBook(t, w.libraryDB, 1, "元数据书")
	insertItem(t, w.libraryDB, 1, "public", 1)
	path := seedRealFormat(t, w, dir, 1, "EPUB", "PK\x03\x04body")

	resp, err := w.bookSaveMeta(adminCtx(1), 1, map[string]any{"fmt": "epub"})
	if err != nil {
		t.Fatalf("保存失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", resp["err"])
	}

	opf := replaceExt(path, "opf")
	body, err := os.ReadFile(opf)
	if err != nil {
		t.Fatalf("OPF 未生成: %v", err)
	}
	if !strings.Contains(string(body), "元数据书") {
		t.Errorf("OPF 缺少书名: %s", string(body))
	}
}

// TestBookSaveMetaNoFormat 覆盖无格式可保存。
func TestBookSaveMetaNoFormat(t *testing.T) {
	w, _ := newToolsFixture(t)
	insertBook(t, w.libraryDB, 1, "空书")
	insertItem(t, w.libraryDB, 1, "public", 1)

	resp, err := w.bookSaveMeta(adminCtx(1), 1, map[string]any{})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "format.not_found" {
		t.Errorf("err = %v，期望 format.not_found", resp["err"])
	}
}

// TestBookReferReturnsBookInfo 覆盖来源引用。
func TestBookReferReturnsBookInfo(t *testing.T) {
	w, _ := newToolsFixture(t)
	insertBook(t, w.libraryDB, 1, "引用书")
	insertItem(t, w.libraryDB, 1, "public", 1)

	resp, err := w.bookRefer(adminCtx(1), 1, map[string]any{})
	if err != nil {
		t.Fatalf("引用失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", resp["err"])
	}
	if resp["title"] != "引用书" {
		t.Errorf("title = %v，期望 引用书", resp["title"])
	}
	if resp["total"] != 0 {
		t.Errorf("total = %v，期望 0", resp["total"])
	}
}

// TestSameFormatFamily 覆盖格式族判定。
func TestSameFormatFamily(t *testing.T) {
	cases := []struct {
		from, to string
		want     bool
	}{
		{"epub", "mobi", true},
		{"azw3", "txt", true},
		{"epub", "pdf", false},
		{"cbz", "cbr", true},
		{"pdf", "epub", false},
	}
	for _, c := range cases {
		if got := sameFormatFamily(c.from, c.to); got != c.want {
			t.Errorf("sameFormatFamily(%s,%s) = %v，期望 %v", c.from, c.to, got, c.want)
		}
	}
}

// TestReplaceExt 覆盖扩展名替换。
func TestReplaceExt(t *testing.T) {
	if got := replaceExt("/a/b/c.epub", "opf"); got != "/a/b/c.opf" {
		t.Errorf("replaceExt = %q，期望 /a/b/c.opf", got)
	}
}

// TestXmlEscape 覆盖 XML 转义。
func TestXmlEscape(t *testing.T) {
	got := xmlEscape(`<a & "b">`)
	want := "&lt;a &amp; &quot;b&quot;&gt;"
	if got != want {
		t.Errorf("xmlEscape = %q，期望 %q", got, want)
	}
}

// TestRenderOPFIncludesAuthors 覆盖 OPF 作者渲染。
func TestRenderOPFIncludesAuthors(t *testing.T) {
	out := renderOPF(&library.BookData{
		Title:   "书名",
		Authors: []string{"作者甲"},
		Tags:    []string{"科幻"},
	})
	if !strings.Contains(out, "作者甲") {
		t.Errorf("OPF 缺少作者: %s", out)
	}
	if !strings.Contains(out, "书名") {
		t.Errorf("OPF 缺少书名: %s", out)
	}
	if !strings.Contains(out, "科幻") {
		t.Errorf("OPF 缺少标签: %s", out)
	}
}
