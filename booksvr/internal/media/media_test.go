package media

import (
	"archive/zip"
	"bytes"
	"encoding/binary"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// writeFile 写一个测试文件并返回路径。
func writeFile(t *testing.T, dir, name string, data []byte) string {
	t.Helper()
	p := filepath.Join(dir, name)
	if err := os.WriteFile(p, data, 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	return p
}

// makeZip 生成一个 ZIP 文件，返回路径。
func makeZip(t *testing.T, dir, name string, entries map[string][]byte) string {
	t.Helper()
	p := filepath.Join(dir, name)
	f, err := os.Create(p)
	if err != nil {
		t.Fatalf("创建失败: %v", err)
	}
	zw := zip.NewWriter(f)
	for n, data := range entries {
		w, err := zw.Create(n)
		if err != nil {
			t.Fatalf("创建条目失败: %v", err)
		}
		if _, err := w.Write(data); err != nil {
			t.Fatalf("写入失败: %v", err)
		}
	}
	if err := zw.Close(); err != nil {
		t.Fatalf("关闭失败: %v", err)
	}
	f.Close()
	return p
}

// pngHeader 生成一个最小 PNG 头。
func pngHeader() []byte {
	b := make([]byte, 24)
	copy(b, []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'})
	binary.BigEndian.PutUint32(b[16:20], 100)
	binary.BigEndian.PutUint32(b[20:24], 100)
	return b
}

// jpegHeader 生成一个最小 JPEG 头。
func jpegHeader() []byte { return []byte{0xFF, 0xD8, 0xFF, 0xE0} }

// TestMergeMediaType 媒体类型合并优先级。
func TestMergeMediaType(t *testing.T) {
	cases := []struct{ existing, incoming, want string }{
		{TypeUnknown, TypeEbook, TypeEbook},
		{TypeEbook, TypeComic, TypeComic},
		{TypeComic, TypeEbook, TypeComic},
		{TypeEbook, TypeUnknown, TypeEbook},
		{"bogus", TypeEbook, TypeEbook},
		{TypeUnknown, "bogus", TypeUnknown},
	}
	for _, tc := range cases {
		if got := MergeMediaType(tc.existing, tc.incoming); got != tc.want {
			t.Errorf("MergeMediaType(%q,%q) = %q, want %q", tc.existing, tc.incoming, got, tc.want)
		}
	}
}

// TestNormalizedMediaFormats 格式归一化。
func TestNormalizedMediaFormats(t *testing.T) {
	got := NormalizedMediaFormats([]string{"EPUB", " pdf ", "epub"})
	if len(got) != 2 || !got["epub"] || !got["pdf"] {
		t.Errorf("归一化错误: %v", got)
	}
	// 逗号与空格分隔。
	got = NormalizedMediaFormats([]string{"epub,pdf mobi"})
	if len(got) != 3 {
		t.Errorf("应切出 3 项，得到 %v", got)
	}
	if len(NormalizedMediaFormats(nil)) != 0 {
		t.Error("nil 应返回空集合")
	}
}

// TestHasMixedMediaFormats 混合格式判定。
func TestHasMixedMediaFormats(t *testing.T) {
	if !HasMixedMediaFormats([]string{"epub", "cbz"}) {
		t.Error("epub+cbz 应判为混合")
	}
	if HasMixedMediaFormats([]string{"epub", "pdf"}) {
		t.Error("epub+pdf 不应判为混合")
	}
	if HasMixedMediaFormats(nil) {
		t.Error("空不应判为混合")
	}
}

// TestOnlineReadableFormats 在线阅读格式判定。
func TestOnlineReadableFormats(t *testing.T) {
	if !OnlineReadableFormats([]string{"epub"}) {
		t.Error("epub 应可在线阅读")
	}
	if !OnlineReadableFormats([]string{"cbz"}) {
		t.Error("cbz 应可在线阅读")
	}
	if OnlineReadableFormats([]string{"docx"}) {
		t.Error("docx 不应可在线阅读")
	}
}

// TestSafeArchiveName 压缩包路径安全校验。
func TestSafeArchiveName(t *testing.T) {
	cases := []struct {
		name string
		want bool
	}{
		{"a/b.png", true},
		{"a.png", true},
		{"", false},
		{"a\x00b", false},
		{"/abs.png", false},
		{"../evil.png", false},
		{"a/../b.png", false},
		// PurePosixPath 会折叠 "." 与重复斜杠，因此这两个是合法路径。
		{"a/./b.png", true},
		{"C:/evil.png", false},
		{"a//b.png", true},
	}
	for _, tc := range cases {
		if got := safeArchiveName(tc.name); got != tc.want {
			t.Errorf("safeArchiveName(%q) = %v, want %v", tc.name, got, tc.want)
		}
	}
}

// TestIgnoredComicEntry 漫画条目忽略规则。
func TestIgnoredComicEntry(t *testing.T) {
	cases := []struct {
		name string
		want bool
	}{
		{"__MACOSX/x.png", true},
		{"a/.DS_Store", true},
		{"a/Thumbs.db", true},
		{"a/ComicInfo.xml", true},
		{"a/._x.png", true},
		{"a/page1.png", false},
		{"page1.png", false},
	}
	for _, tc := range cases {
		if got := ignoredComicEntry(tc.name); got != tc.want {
			t.Errorf("ignoredComicEntry(%q) = %v, want %v", tc.name, got, tc.want)
		}
	}
}

// TestCheckArchiveBudget 压缩包预算检查。
func TestCheckArchiveBudget(t *testing.T) {
	ok := []archiveEntry{{Name: "a.png", FileSize: 100, CompressedSize: 50}}
	if err := checkArchiveBudget(ok); err != nil {
		t.Errorf("正常条目不应报错: %v", err)
	}

	cases := []struct {
		name    string
		entries []archiveEntry
		code    string
	}{
		{"不安全路径", []archiveEntry{{Name: "../x", FileSize: 1, CompressedSize: 1}}, "archive.unsafe_path"},
		{"加密", []archiveEntry{{Name: "a", FileSize: 1, CompressedSize: 1, Encrypted: true}}, "archive.encrypted"},
		{"符号链接", []archiveEntry{{Name: "a", FileSize: 1, CompressedSize: 1, IsLink: true}}, "archive.link"},
		{"负大小", []archiveEntry{{Name: "a", FileSize: -1, CompressedSize: 1}}, "archive.invalid_size"},
		{"条目过大", []archiveEntry{{Name: "a", FileSize: MaxArchiveEntryBytes + 1, CompressedSize: 1}}, "archive.entry_too_large"},
		{"压缩比异常", []archiveEntry{{Name: "a", FileSize: 100, CompressedSize: 0}}, "archive.suspicious_ratio"},
		{"压缩比过高", []archiveEntry{{Name: "a", FileSize: 100000, CompressedSize: 1}}, "archive.suspicious_ratio"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := checkArchiveBudget(tc.entries)
			if err == nil {
				t.Fatalf("应报错 %s", tc.code)
			}
			me, ok := err.(*Error)
			if !ok || me.Code != tc.code {
				t.Errorf("code = %v, want %s", err, tc.code)
			}
		})
	}
}

// TestCheckArchiveBudgetTooMany 条目数超限。
func TestCheckArchiveBudgetTooMany(t *testing.T) {
	entries := make([]archiveEntry, MaxArchiveEntries+1)
	for i := range entries {
		entries[i] = archiveEntry{Name: "a", FileSize: 1, CompressedSize: 1}
	}
	err := checkArchiveBudget(entries)
	if me, ok := err.(*Error); !ok || me.Code != "archive.too_many_entries" {
		t.Errorf("应报 archive.too_many_entries，得到 %v", err)
	}
}

// TestDetectImageMIME 图片签名探测。
func TestDetectImageMIME(t *testing.T) {
	cases := []struct {
		header []byte
		want   string
	}{
		{[]byte{0xFF, 0xD8, 0xFF, 0xE0}, "image/jpeg"},
		{[]byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'}, "image/png"},
		{[]byte("GIF87a"), "image/gif"},
		{[]byte("GIF89a"), "image/gif"},
		{[]byte("BM"), "image/bmp"},
		{[]byte{'I', 'I', 0x2A, 0x00}, "image/tiff"},
		{[]byte{'M', 'M', 0x00, 0x2A}, "image/tiff"},
		{append([]byte("RIFF"), append(make([]byte, 4), []byte("WEBP")...)...), "image/webp"},
		{[]byte{0xFF, 0x0A}, "image/jxl"},
		{[]byte("unknown"), ""},
	}
	for _, tc := range cases {
		if got := detectImageMIME(tc.header); got != tc.want {
			t.Errorf("detectImageMIME(%v) = %q, want %q", tc.header, got, tc.want)
		}
	}
}

// TestAnalyzeUnsupported 不支持的格式。
func TestAnalyzeUnsupported(t *testing.T) {
	dir := t.TempDir()
	p := writeFile(t, dir, "a.xyz", []byte("x"))
	_, err := AnalyzeFile(p, "xyz")
	if me, ok := err.(*Error); !ok || me.Code != "format.unsupported" {
		t.Errorf("应报 format.unsupported，得到 %v", err)
	}
}

// TestAnalyzeMissingFile 文件不存在。
func TestAnalyzeMissingFile(t *testing.T) {
	_, err := AnalyzeFile(filepath.Join(t.TempDir(), "nope.epub"), "epub")
	if me, ok := err.(*Error); !ok || me.Code != "media.unreadable" {
		t.Errorf("应报 media.unreadable，得到 %v", err)
	}
}

// TestAnalyzeEbookFormats 纯文本类电子书格式。
func TestAnalyzeEbookFormats(t *testing.T) {
	dir := t.TempDir()
	for _, tc := range []struct{ ext, mime string }{
		{"txt", "text/plain"},
		{"mobi", "application/x-mobipocket-ebook"},
		{"azw", "application/vnd.amazon.ebook"},
		{"azw3", "application/vnd.amazon.ebook"},
	} {
		p := writeFile(t, dir, "a."+tc.ext, []byte("content"))
		got, err := AnalyzeFile(p, tc.ext)
		if err != nil {
			t.Fatalf("%s 失败: %v", tc.ext, err)
		}
		if got.MediaType != TypeEbook || got.MIMEType != tc.mime {
			t.Errorf("%s = %+v", tc.ext, got)
		}
		if got.Reason != "ebook_format" {
			t.Errorf("%s reason = %q", tc.ext, got.Reason)
		}
	}
}

// TestAnalyzePDF PDF 签名校验。
func TestAnalyzePDF(t *testing.T) {
	dir := t.TempDir()
	p := writeFile(t, dir, "a.pdf", []byte("%PDF-1.7\n..."))
	got, err := AnalyzeFile(p, "pdf")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got.MIMEType != "application/pdf" || got.MediaType != TypeUnknown {
		t.Errorf("got = %+v", got)
	}

	bad := writeFile(t, dir, "b.pdf", []byte("not a pdf"))
	_, err = AnalyzeFile(bad, "pdf")
	if me, ok := err.(*Error); !ok || me.Code != "format.mismatch" {
		t.Errorf("应报 format.mismatch，得到 %v", err)
	}
}

// TestAnalyzeComicZip 漫画 ZIP 校验。
func TestAnalyzeComicZip(t *testing.T) {
	dir := t.TempDir()
	p := makeZip(t, dir, "a.cbz", map[string][]byte{
		"page1.png": pngHeader(),
		"page2.jpg": jpegHeader(),
	})
	got, err := AnalyzeFile(p, "cbz")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got.MediaType != TypeComic || got.DetectedFormat != "zip" {
		t.Errorf("got = %+v", got)
	}
	if got.MIMEType != "application/vnd.comicbook+zip" {
		t.Errorf("mime = %q", got.MIMEType)
	}
	if got.Reason != "image_archive" {
		t.Errorf("reason = %q", got.Reason)
	}

	// zip 扩展名的 MIME 不同。
	p2 := makeZip(t, dir, "b.zip", map[string][]byte{"p.png": pngHeader()})
	got2, err := AnalyzeFile(p2, "zip")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got2.MIMEType != "application/zip" {
		t.Errorf("zip mime = %q", got2.MIMEType)
	}
}

// TestAnalyzeComicZipNonImage 非图片条目被拒绝。
func TestAnalyzeComicZipNonImage(t *testing.T) {
	dir := t.TempDir()
	p := makeZip(t, dir, "a.cbz", map[string][]byte{
		"page1.png":  pngHeader(),
		"readme.txt": []byte("hi"),
	})
	_, err := AnalyzeFile(p, "cbz")
	if me, ok := err.(*Error); !ok || me.Code != "comic.non_image_entry" {
		t.Errorf("应报 comic.non_image_entry，得到 %v", err)
	}
}

// TestAnalyzeComicZipNoImages 没有图片。
func TestAnalyzeComicZipNoImages(t *testing.T) {
	dir := t.TempDir()
	p := makeZip(t, dir, "a.cbz", map[string][]byte{
		"ComicInfo.xml": []byte("<ComicInfo/>"),
	})
	_, err := AnalyzeFile(p, "cbz")
	if me, ok := err.(*Error); !ok || me.Code != "comic.no_images" {
		t.Errorf("应报 comic.no_images，得到 %v", err)
	}
}

// TestAnalyzeComicZipMismatch 扩展名与内容不匹配。
func TestAnalyzeComicZipMismatch(t *testing.T) {
	dir := t.TempDir()
	p := makeZip(t, dir, "a.cbz", map[string][]byte{
		"page.png": jpegHeader(), // 声明 png 实为 jpeg
	})
	_, err := AnalyzeFile(p, "cbz")
	if me, ok := err.(*Error); !ok || me.Code != "comic.image_mismatch" {
		t.Errorf("应报 comic.image_mismatch，得到 %v", err)
	}
}

// TestAnalyzeComicZipNotZip 声明 cbz 但内容不是 ZIP。
func TestAnalyzeComicZipNotZip(t *testing.T) {
	dir := t.TempDir()
	p := writeFile(t, dir, "a.cbz", []byte("not a zip"))
	_, err := AnalyzeFile(p, "cbz")
	if me, ok := err.(*Error); !ok || me.Code != "format.mismatch" {
		t.Errorf("应报 format.mismatch，得到 %v", err)
	}
}

// TestAnalyzeComicRar 覆盖 RAR 的行为差异。
func TestAnalyzeComicRar(t *testing.T) {
	dir := t.TempDir()
	// 合法 RAR4 签名 → 报 comic.invalid_container（Go 不支持 RAR）。
	rar4 := append([]byte{'R', 'a', 'r', '!', 0x1A, 0x07, 0x00}, make([]byte, 16)...)
	p := writeFile(t, dir, "a.cbr", rar4)
	_, err := AnalyzeFile(p, "cbr")
	if me, ok := err.(*Error); !ok || me.Code != "comic.invalid_container" {
		t.Errorf("应报 comic.invalid_container，得到 %v", err)
	}

	// 非法签名 → format.mismatch。
	bad := writeFile(t, dir, "b.cbr", []byte("not rar"))
	_, err = AnalyzeFile(bad, "cbr")
	if me, ok := err.(*Error); !ok || me.Code != "format.mismatch" {
		t.Errorf("应报 format.mismatch，得到 %v", err)
	}
}

// TestAnalyzeEpubTextSpine 文本型 EPUB 判为 ebook。
func TestAnalyzeEpubTextSpine(t *testing.T) {
	dir := t.TempDir()
	p := makeEpub(t, dir, "a.epub", `<html><body><p>`+strings.Repeat("word ", 50)+`</p></body></html>`)
	got, err := AnalyzeFile(p, "epub")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got.MediaType != TypeEbook || got.Reason != "text_spine" {
		t.Errorf("got = %+v", got)
	}
}

// TestAnalyzeEpubImageSpine 图片型 EPUB 判为 comic。
func TestAnalyzeEpubImageSpine(t *testing.T) {
	dir := t.TempDir()
	p := makeEpub(t, dir, "a.epub", `<html><body><img src="p.png"/></body></html>`)
	got, err := AnalyzeFile(p, "epub")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got.MediaType != TypeComic || got.Reason != "image_spine" {
		t.Errorf("got = %+v", got)
	}
}

// TestAnalyzeEpubMissingMimetype 缺少 mimetype。
func TestAnalyzeEpubMissingMimetype(t *testing.T) {
	dir := t.TempDir()
	p := makeZip(t, dir, "a.epub", map[string][]byte{"META-INF/container.xml": []byte("<container/>")})
	_, err := AnalyzeFile(p, "epub")
	if me, ok := err.(*Error); !ok || me.Code != "epub.mimetype_missing" {
		t.Errorf("应报 epub.mimetype_missing，得到 %v", err)
	}
}

// TestAnalyzeEpubBadMimetype mimetype 内容不匹配。
func TestAnalyzeEpubBadMimetype(t *testing.T) {
	dir := t.TempDir()
	// mimetype 必须是 STORED，否则会先报 epub.mimetype_invalid。
	p := makeStoredZip(t, dir, "a.epub", "mimetype", []byte("text/plain"))
	_, err := AnalyzeFile(p, "epub")
	if me, ok := err.(*Error); !ok || me.Code != "format.mismatch" {
		t.Errorf("应报 format.mismatch，得到 %v", err)
	}
}

// TestAnalyzeEpubCompressedMimetype mimetype 被压缩时单独报错。
func TestAnalyzeEpubCompressedMimetype(t *testing.T) {
	dir := t.TempDir()
	p := makeZip(t, dir, "a.epub", map[string][]byte{"mimetype": []byte("application/epub+zip")})
	_, err := AnalyzeFile(p, "epub")
	if me, ok := err.(*Error); !ok || me.Code != "epub.mimetype_invalid" {
		t.Errorf("应报 epub.mimetype_invalid，得到 %v", err)
	}
}

// makeStoredZip 生成一个只含单个 STORED 条目的 ZIP。
func makeStoredZip(t *testing.T, dir, name, entry string, data []byte) string {
	t.Helper()
	p := filepath.Join(dir, name)
	f, err := os.Create(p)
	if err != nil {
		t.Fatalf("创建失败: %v", err)
	}
	zw := zip.NewWriter(f)
	w, err := zw.CreateHeader(&zip.FileHeader{Name: entry, Method: zip.Store})
	if err != nil {
		t.Fatalf("创建条目失败: %v", err)
	}
	if _, err := w.Write(data); err != nil {
		t.Fatalf("写入失败: %v", err)
	}
	if err := zw.Close(); err != nil {
		t.Fatalf("关闭失败: %v", err)
	}
	f.Close()
	return p
}

// TestAnalyzeEpubNotZip 声明 epub 但内容不是 ZIP。
func TestAnalyzeEpubNotZip(t *testing.T) {
	dir := t.TempDir()
	p := writeFile(t, dir, "a.epub", []byte("not zip"))
	_, err := AnalyzeFile(p, "epub")
	if me, ok := err.(*Error); !ok || me.Code != "format.mismatch" {
		t.Errorf("应报 format.mismatch，得到 %v", err)
	}
}

// TestAnalyzeDjVu DjVu 容器校验。
func TestAnalyzeDjVu(t *testing.T) {
	dir := t.TempDir()
	// 构造合法 DjVu 头：AT&TFORM + 大端长度 + DJVU。
	body := make([]byte, 4)
	data := append([]byte("AT&TFORM"), body...)
	data = append(data, []byte("DJVU")...)
	binary.BigEndian.PutUint32(data[8:12], uint32(len(data)-12))
	p := writeFile(t, dir, "a.djvu", data)
	got, err := AnalyzeFile(p, "djvu")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got.MIMEType != "image/vnd.djvu" {
		t.Errorf("mime = %q", got.MIMEType)
	}

	// 长度不匹配。
	bad := append([]byte("AT&TFORM"), make([]byte, 4)...)
	bad = append(bad, []byte("DJVU")...)
	p2 := writeFile(t, dir, "b.djvu", bad)
	_, err = AnalyzeFile(p2, "djvu")
	if me, ok := err.(*Error); !ok || me.Code != "format.mismatch" {
		t.Errorf("应报 format.mismatch，得到 %v", err)
	}
}

// TestAnalyzeUVZ UVZ 容器校验。
func TestAnalyzeUVZ(t *testing.T) {
	dir := t.TempDir()
	p := makeZip(t, dir, "a.uvz", map[string][]byte{"page.pdg": []byte("x")})
	got, err := AnalyzeFile(p, "uvz")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got.MIMEType != "application/octet-stream" {
		t.Errorf("mime = %q", got.MIMEType)
	}

	// 空容器。
	empty := makeZip(t, dir, "b.uvz", map[string][]byte{})
	_, err = AnalyzeFile(empty, "uvz")
	if me, ok := err.(*Error); !ok || me.Code != "archive.empty" {
		t.Errorf("应报 archive.empty，得到 %v", err)
	}
}

// TestAnalyzeDocx DOCX 容器校验。
func TestAnalyzeDocx(t *testing.T) {
	dir := t.TempDir()
	p := makeZip(t, dir, "a.docx", map[string][]byte{
		"[Content_Types].xml": []byte("<Types/>"),
		"word/document.xml":   []byte("<doc/>"),
	})
	got, err := AnalyzeFile(p, "docx")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if !strings.Contains(got.MIMEType, "wordprocessingml") {
		t.Errorf("mime = %q", got.MIMEType)
	}

	// 缺 [Content_Types].xml。
	bad := makeZip(t, dir, "b.docx", map[string][]byte{"word/document.xml": []byte("<doc/>")})
	_, err = AnalyzeFile(bad, "docx")
	if me, ok := err.(*Error); !ok || me.Code != "format.mismatch" {
		t.Errorf("应报 format.mismatch，得到 %v", err)
	}

	// 缺 word/ 目录。
	bad2 := makeZip(t, dir, "c.docx", map[string][]byte{"[Content_Types].xml": []byte("<Types/>")})
	_, err = AnalyzeFile(bad2, "docx")
	if me, ok := err.(*Error); !ok || me.Code != "format.mismatch" {
		t.Errorf("应报 format.mismatch，得到 %v", err)
	}
}

// TestAnalyzeFB2 FB2 文档校验。
func TestAnalyzeFB2(t *testing.T) {
	dir := t.TempDir()
	p := writeFile(t, dir, "a.fb2", []byte(`<FictionBook><body><p>hi</p></body></FictionBook>`))
	got, err := AnalyzeFile(p, "fb2")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got.MIMEType != "application/fb2+xml" {
		t.Errorf("mime = %q", got.MIMEType)
	}

	// 根元素不对。
	bad := writeFile(t, dir, "b.fb2", []byte(`<Other/>`))
	_, err = AnalyzeFile(bad, "fb2")
	if me, ok := err.(*Error); !ok || me.Code != "format.mismatch" {
		t.Errorf("应报 format.mismatch，得到 %v", err)
	}

	// 缺 body。
	bad2 := writeFile(t, dir, "c.fb2", []byte(`<FictionBook/>`))
	_, err = AnalyzeFile(bad2, "fb2")
	if me, ok := err.(*Error); !ok || me.Code != "format.mismatch" {
		t.Errorf("应报 format.mismatch，得到 %v", err)
	}

	// 非法 XML。
	bad3 := writeFile(t, dir, "d.fb2", []byte(`<FictionBook><body>`))
	_, err = AnalyzeFile(bad3, "fb2")
	if me, ok := err.(*Error); !ok || me.Code != "format.mismatch" {
		t.Errorf("应报 format.mismatch，得到 %v", err)
	}
}

// TestAnalyzeHTMLZ HTMLZ 容器校验。
func TestAnalyzeHTMLZ(t *testing.T) {
	dir := t.TempDir()
	p := makeZip(t, dir, "a.htmlz", map[string][]byte{"index.html": []byte("<html/>")})
	got, err := AnalyzeFile(p, "htmlz")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got.MIMEType != "application/octet-stream" {
		t.Errorf("mime = %q", got.MIMEType)
	}

	// 缺 index.html。
	bad := makeZip(t, dir, "b.htmlz", map[string][]byte{"other.html": []byte("<html/>")})
	_, err = AnalyzeFile(bad, "htmlz")
	if me, ok := err.(*Error); !ok || me.Code != "format.mismatch" {
		t.Errorf("应报 format.mismatch，得到 %v", err)
	}
}

// TestPreflightZipDirectory 覆盖 ZIP 目录预检的各类损坏。
func TestPreflightZipDirectory(t *testing.T) {
	dir := t.TempDir()

	// 缺少 EOCD。
	p := writeFile(t, dir, "a.zip", []byte("no eocd here"))
	err := preflightZipDirectory(p)
	if me, ok := err.(*Error); !ok || me.Code != "archive.corrupt" {
		t.Errorf("应报 archive.corrupt，得到 %v", err)
	}

	// 正常 ZIP 应通过。
	good := makeZip(t, dir, "b.zip", map[string][]byte{"a.txt": []byte("x")})
	if err := preflightZipDirectory(good); err != nil {
		t.Errorf("正常 ZIP 不应报错: %v", err)
	}

	// 文件不存在。
	if err := preflightZipDirectory(filepath.Join(dir, "nope.zip")); err == nil {
		t.Error("不存在文件应报错")
	}
}

// TestPreflightArchiveFile 文件体积上限。
func TestPreflightArchiveFile(t *testing.T) {
	dir := t.TempDir()
	p := writeFile(t, dir, "a.zip", []byte("x"))
	if err := preflightArchiveFile(p); err != nil {
		t.Errorf("小文件不应报错: %v", err)
	}
	if err := preflightArchiveFile(filepath.Join(dir, "nope")); err == nil {
		t.Error("不存在文件应报错")
	}
}

// TestNormalizeHref 路径归一化。
func TestNormalizeHref(t *testing.T) {
	cases := []struct {
		base, href, want string
	}{
		{"OEBPS", "text/ch1.xhtml", "OEBPS/text/ch1.xhtml"},
		{"OEBPS", "../images/p.png", "images/p.png"},
		{"", "a.png", "a.png"},
		{"OEBPS", "http://evil.com/x", ""},
		{"OEBPS", "//evil.com/x", ""},
		{"OEBPS", "", ""},
		{"OEBPS", "a.png?q=1", "OEBPS/a.png"},
		{"OEBPS", "a.png#frag", "OEBPS/a.png"},
		{"OEBPS", "../../../etc/passwd", ""},
	}
	for _, tc := range cases {
		if got := normalizeHref(tc.base, tc.href); got != tc.want {
			t.Errorf("normalizeHref(%q,%q) = %q, want %q", tc.base, tc.href, got, tc.want)
		}
	}
}

// TestAnalysisToDict 输出字段名对齐 Python。
func TestAnalysisToDict(t *testing.T) {
	a := Analysis{"epub", "epub", "application/epub+zip", TypeEbook, "text_spine"}
	d := a.ToDict()
	want := map[string]any{
		"declared_format": "epub",
		"detected_format": "epub",
		"mime_type":       "application/epub+zip",
		"media_type":      "ebook",
		"analysis_reason": "text_spine",
	}
	for k, v := range want {
		if d[k] != v {
			t.Errorf("ToDict()[%q] = %v, want %v", k, d[k], v)
		}
	}
	if len(d) != len(want) {
		t.Errorf("字段数 = %d, want %d", len(d), len(want))
	}
}

// TestErrorInterface Error 实现 error 接口。
func TestErrorInterface(t *testing.T) {
	e := invalid("x.y", "消息")
	if e.Error() != "消息" {
		t.Errorf("Error() = %q", e.Error())
	}
	if e.Code != "x.y" {
		t.Errorf("Code = %q", e.Code)
	}
}

// TestLastIndex 子串查找。
func TestLastIndex(t *testing.T) {
	if got := lastIndex([]byte("abcabc"), []byte("abc")); got != 3 {
		t.Errorf("lastIndex = %d, want 3", got)
	}
	if got := lastIndex([]byte("abc"), []byte("zzz")); got != -1 {
		t.Errorf("未命中应返回 -1，得到 %d", got)
	}
	if got := lastIndex([]byte("a"), []byte("abc")); got != -1 {
		t.Errorf("haystack 过短应返回 -1，得到 %d", got)
	}
	if got := lastIndex([]byte("abc"), []byte("")); got != -1 {
		t.Errorf("空 needle 应返回 -1，得到 %d", got)
	}
}

// TestExtLowerAndBaseName 扩展名与文件名工具。
func TestExtLowerAndBaseName(t *testing.T) {
	if got := extLower("/a/b/C.EPUB"); got != "epub" {
		t.Errorf("extLower = %q", got)
	}
	if got := baseName(`C:\a\b\c.epub`); got != "c.epub" {
		t.Errorf("baseName = %q", got)
	}
}

// makeEpub 生成一个最小合法 EPUB，spine 指向给定的 XHTML 内容。
func makeEpub(t *testing.T, dir, name, xhtml string) string {
	t.Helper()
	container := `<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>`
	opf := `<?xml version="1.0"?><package><manifest>` +
		`<item id="p1" href="page.xhtml" media-type="application/xhtml+xml"/>` +
		`<item id="i1" href="p.png" media-type="image/png"/>` +
		`</manifest><spine><itemref idref="p1"/></spine></package>`

	p := filepath.Join(dir, name)
	f, err := os.Create(p)
	if err != nil {
		t.Fatalf("创建失败: %v", err)
	}
	zw := zip.NewWriter(f)
	// mimetype 必须是 STORED（未压缩）。
	hdr := &zip.FileHeader{Name: "mimetype", Method: zip.Store}
	w, err := zw.CreateHeader(hdr)
	if err != nil {
		t.Fatalf("创建 mimetype 失败: %v", err)
	}
	if _, err := w.Write([]byte("application/epub+zip")); err != nil {
		t.Fatalf("写 mimetype 失败: %v", err)
	}
	for n, data := range map[string]string{
		"META-INF/container.xml": container,
		"OEBPS/content.opf":      opf,
		"OEBPS/page.xhtml":       xhtml,
	} {
		w, err := zw.Create(n)
		if err != nil {
			t.Fatalf("创建条目失败: %v", err)
		}
		if _, err := w.Write([]byte(data)); err != nil {
			t.Fatalf("写入失败: %v", err)
		}
	}
	// 图片条目用二进制写入。
	w, err = zw.Create("OEBPS/p.png")
	if err != nil {
		t.Fatalf("创建图片失败: %v", err)
	}
	if _, err := w.Write(pngHeader()); err != nil {
		t.Fatalf("写图片失败: %v", err)
	}
	if err := zw.Close(); err != nil {
		t.Fatalf("关闭失败: %v", err)
	}
	f.Close()
	return p
}

// TestReadSignatureShortFile 短文件的签名读取。
func TestReadSignatureShortFile(t *testing.T) {
	dir := t.TempDir()
	p := writeFile(t, dir, "a.bin", []byte("ab"))
	sig, err := readSignature(p, 16)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if !bytes.Equal(sig, []byte("ab")) {
		t.Errorf("sig = %v", sig)
	}
	if _, err := readSignature(filepath.Join(dir, "nope"), 4); err == nil {
		t.Error("不存在文件应报错")
	}
}
