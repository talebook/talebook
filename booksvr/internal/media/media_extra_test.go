package media

import (
	"archive/zip"
	"encoding/xml"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestAttrHelpers 覆盖 attr / attrSuffix。
func TestAttrHelpers(t *testing.T) {
	n := &xmlNode{Attrs: []xml.Attr{
		{Name: xml.Name{Local: "id"}, Value: "x"},
		{Name: xml.Name{Space: "http://www.w3.org/1999/xlink", Local: "href"}, Value: "p.png"},
	}}
	if got := n.attr("id"); got != "x" {
		t.Errorf("attr(id) = %q", got)
	}
	if got := n.attr("missing"); got != "" {
		t.Errorf("attr(missing) = %q", got)
	}
	// attrSuffix 命中带命名空间的 href。
	if got := n.attrSuffix("href"); got != "p.png" {
		t.Errorf("attrSuffix(href) = %q", got)
	}
	if got := n.attrSuffix("nope"); got != "" {
		t.Errorf("attrSuffix(nope) = %q", got)
	}
}

// TestExtensionMatchesMIME 扩展名与 MIME 的匹配。
func TestExtensionMatchesMIME(t *testing.T) {
	if !extensionMatchesMIME(".jpg", "image/jpeg") {
		t.Error(".jpg 应匹配 image/jpeg")
	}
	if !extensionMatchesMIME(".jpeg", "image/jpeg") {
		t.Error(".jpeg 应匹配 image/jpeg")
	}
	if !extensionMatchesMIME(".tif", "image/tiff") {
		t.Error(".tif 应匹配 image/tiff")
	}
	if !extensionMatchesMIME(".tiff", "image/tiff") {
		t.Error(".tiff 应匹配 image/tiff")
	}
	if extensionMatchesMIME(".png", "image/jpeg") {
		t.Error(".png 不应匹配 image/jpeg")
	}
	if extensionMatchesMIME(".png", "image/unknown") {
		t.Error("未知 MIME 不应匹配")
	}
}

// TestOpenZipCorrupt 覆盖 openZip 的损坏分支。
func TestOpenZipCorrupt(t *testing.T) {
	dir := t.TempDir()
	// 有合法 EOCD 但中央目录偏移指向文件外，zip.OpenReader 会失败。
	eocd := make([]byte, 22)
	copy(eocd, []byte("PK\x05\x06"))
	// total_entries=1，中央目录偏移指向文件末尾之外。
	eocd[8], eocd[9] = 1, 0
	eocd[10], eocd[11] = 1, 0
	eocd[16] = 0xFF
	p := writeFile(t, dir, "a.zip", eocd)
	_, err := openZip(p)
	if err == nil {
		t.Error("损坏 ZIP 应报错")
	}
}

// TestAnalyzeEpubSpineLimit spine 超过上限。
func TestAnalyzeEpubSpineLimit(t *testing.T) {
	dir := t.TempDir()
	p := makeEpubManySpine(t, dir, "a.epub", MaxEpubSpineItems+1)
	got, err := AnalyzeFile(p, "epub")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got.Reason != "spine_limit" || got.MediaType != TypeUnknown {
		t.Errorf("got = %+v", got)
	}
}

// TestAnalyzeEpubSpineInvalid spine 引用不存在的条目。
func TestAnalyzeEpubSpineInvalid(t *testing.T) {
	dir := t.TempDir()
	p := makeEpubRaw(t, dir, "a.epub", map[string]string{
		"mimetype":               "application/epub+zip",
		"META-INF/container.xml": `<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>`,
		"OEBPS/content.opf": `<?xml version="1.0"?><package><manifest>` +
			`<item id="p1" href="page.xhtml" media-type="application/xhtml+xml"/>` +
			`</manifest><spine><itemref idref="missing"/></spine></package>`,
		"OEBPS/page.xhtml": `<html><body><p>x</p></body></html>`,
	}, true)
	_, err := AnalyzeFile(p, "epub")
	if me, ok := err.(*Error); !ok || me.Code != "epub.spine_invalid" {
		t.Errorf("应报 epub.spine_invalid，得到 %v", err)
	}
}

// TestAnalyzeEpubSpineMissing spine 为空。
func TestAnalyzeEpubSpineMissing(t *testing.T) {
	dir := t.TempDir()
	p := makeEpubRaw(t, dir, "a.epub", map[string]string{
		"mimetype":               "application/epub+zip",
		"META-INF/container.xml": `<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>`,
		"OEBPS/content.opf":      `<?xml version="1.0"?><package><manifest/><spine/></package>`,
	}, true)
	_, err := AnalyzeFile(p, "epub")
	if me, ok := err.(*Error); !ok || me.Code != "epub.spine_missing" {
		t.Errorf("应报 epub.spine_missing，得到 %v", err)
	}
}

// TestAnalyzeEpubContainerMissing 缺 container.xml。
func TestAnalyzeEpubContainerMissing(t *testing.T) {
	dir := t.TempDir()
	p := makeEpubRaw(t, dir, "a.epub", map[string]string{
		"mimetype": "application/epub+zip",
	}, true)
	_, err := AnalyzeFile(p, "epub")
	if me, ok := err.(*Error); !ok || me.Code != "epub.container_missing" {
		t.Errorf("应报 epub.container_missing，得到 %v", err)
	}
}

// TestAnalyzeEpubPackageMissing package 文档不存在。
func TestAnalyzeEpubPackageMissing(t *testing.T) {
	dir := t.TempDir()
	p := makeEpubRaw(t, dir, "a.epub", map[string]string{
		"mimetype":               "application/epub+zip",
		"META-INF/container.xml": `<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/nope.opf"/></rootfiles></container>`,
	}, true)
	_, err := AnalyzeFile(p, "epub")
	if me, ok := err.(*Error); !ok || me.Code != "epub.package_missing" {
		t.Errorf("应报 epub.package_missing，得到 %v", err)
	}
}

// TestAnalyzeEpubInvalidContainerXML container.xml 非法。
func TestAnalyzeEpubInvalidContainerXML(t *testing.T) {
	dir := t.TempDir()
	p := makeEpubRaw(t, dir, "a.epub", map[string]string{
		"mimetype":               "application/epub+zip",
		"META-INF/container.xml": `<container><unclosed>`,
	}, true)
	_, err := AnalyzeFile(p, "epub")
	if me, ok := err.(*Error); !ok || me.Code != "epub.invalid_xml" {
		t.Errorf("应报 epub.invalid_xml，得到 %v", err)
	}
}

// TestAnalyzeEpubImageMediaType spine 直接指向图片。
func TestAnalyzeEpubImageMediaType(t *testing.T) {
	dir := t.TempDir()
	p := makeEpubRaw(t, dir, "a.epub", map[string]string{
		"mimetype":               "application/epub+zip",
		"META-INF/container.xml": `<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>`,
		"OEBPS/content.opf": `<?xml version="1.0"?><package><manifest>` +
			`<item id="i1" href="p.png" media-type="image/png"/>` +
			`</manifest><spine><itemref idref="i1"/></spine></package>`,
		"OEBPS/p.png": "PNG",
	}, true)
	got, err := AnalyzeFile(p, "epub")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got.MediaType != TypeComic || got.Reason != "image_spine" {
		t.Errorf("got = %+v", got)
	}
}

// TestAnalyzeEpubXHTMLImageViaXlink 覆盖 xlink:href 形式的图片引用。
func TestAnalyzeEpubXHTMLImageViaXlink(t *testing.T) {
	dir := t.TempDir()
	xhtml := `<html xmlns:xlink="http://www.w3.org/1999/xlink"><body>` +
		`<svg><image xlink:href="p.png"/></svg></body></html>`
	p := makeEpub(t, dir, "a.epub", xhtml)
	got, err := AnalyzeFile(p, "epub")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got.MediaType != TypeComic {
		t.Errorf("xlink:href 图片应判为 comic，得到 %+v", got)
	}
}

// TestAnalyzeEpubMultipleImages 一页多图时不判为漫画。
func TestAnalyzeEpubMultipleImages(t *testing.T) {
	dir := t.TempDir()
	xhtml := `<html><body><img src="p.png"/><img src="q.png"/></body></html>`
	p := makeEpubTwoImages(t, dir, "a.epub", xhtml)
	got, err := AnalyzeFile(p, "epub")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got.MediaType != TypeEbook {
		t.Errorf("多图页应判为 ebook，得到 %+v", got)
	}
}

// TestAnalyzeEpubXHTMLInvalid 页面 XML 非法时按文本处理。
func TestAnalyzeEpubXHTMLInvalid(t *testing.T) {
	dir := t.TempDir()
	p := makeEpub(t, dir, "a.epub", `<html><body><unclosed>`)
	got, err := AnalyzeFile(p, "epub")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got.MediaType != TypeEbook {
		t.Errorf("非法页面应判为 ebook，得到 %+v", got)
	}
}

// TestAnalyzeDjVuBadSignature DjVu 签名错误。
func TestAnalyzeDjVuBadSignature(t *testing.T) {
	dir := t.TempDir()
	p := writeFile(t, dir, "a.djvu", []byte("NOTFORM!"+strings.Repeat("\x00", 8)))
	_, err := AnalyzeFile(p, "djvu")
	if me, ok := err.(*Error); !ok || me.Code != "format.mismatch" {
		t.Errorf("应报 format.mismatch，得到 %v", err)
	}
	// 短文件。
	short := writeFile(t, dir, "b.djvu", []byte("short"))
	_, err = AnalyzeFile(short, "djvu")
	if me, ok := err.(*Error); !ok || me.Code != "format.mismatch" {
		t.Errorf("短文件应报 format.mismatch，得到 %v", err)
	}
}

// TestAnalyzeUVZNotZip UVZ 不是 ZIP。
func TestAnalyzeUVZNotZip(t *testing.T) {
	dir := t.TempDir()
	p := writeFile(t, dir, "a.uvz", []byte("not zip"))
	_, err := AnalyzeFile(p, "uvz")
	if me, ok := err.(*Error); !ok || me.Code != "format.mismatch" {
		t.Errorf("应报 format.mismatch，得到 %v", err)
	}
}

// TestAnalyzeDocxNotZip DOCX 不是 ZIP。
func TestAnalyzeDocxNotZip(t *testing.T) {
	dir := t.TempDir()
	p := writeFile(t, dir, "a.docx", []byte("not zip"))
	_, err := AnalyzeFile(p, "docx")
	if me, ok := err.(*Error); !ok || me.Code != "format.mismatch" {
		t.Errorf("应报 format.mismatch，得到 %v", err)
	}
}

// TestAnalyzeFB2TooLarge FB2 超过体积上限。
func TestAnalyzeFB2TooLarge(t *testing.T) {
	dir := t.TempDir()
	big := make([]byte, MaxDocumentXMLBytes+1)
	copy(big, []byte("<FictionBook><body/></FictionBook>"))
	p := writeFile(t, dir, "a.fb2", big)
	_, err := AnalyzeFile(p, "fb2")
	if me, ok := err.(*Error); !ok || me.Code != "format.mismatch" {
		t.Errorf("应报 format.mismatch，得到 %v", err)
	}
}

// TestAnalyzeHTMLZNotZip HTMLZ 不是 ZIP。
func TestAnalyzeHTMLZNotZip(t *testing.T) {
	dir := t.TempDir()
	p := writeFile(t, dir, "a.htmlz", []byte("not zip"))
	_, err := AnalyzeFile(p, "htmlz")
	if me, ok := err.(*Error); !ok || me.Code != "format.mismatch" {
		t.Errorf("应报 format.mismatch，得到 %v", err)
	}
}

// TestAnalyzeHTMLZEmpty HTMLZ 空容器。
func TestAnalyzeHTMLZEmpty(t *testing.T) {
	dir := t.TempDir()
	p := makeZip(t, dir, "a.htmlz", map[string][]byte{})
	_, err := AnalyzeFile(p, "htmlz")
	if me, ok := err.(*Error); !ok || me.Code != "archive.empty" {
		t.Errorf("应报 archive.empty，得到 %v", err)
	}
}

// TestZipFileEntriesDuplicate 重复路径。
func TestZipFileEntriesDuplicate(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "a.zip")
	f, err := os.Create(p)
	if err != nil {
		t.Fatalf("创建失败: %v", err)
	}
	zw := zip.NewWriter(f)
	for i := 0; i < 2; i++ {
		w, err := zw.Create("dup.png")
		if err != nil {
			t.Fatalf("创建失败: %v", err)
		}
		if _, err := w.Write(pngHeader()); err != nil {
			t.Fatalf("写入失败: %v", err)
		}
	}
	if err := zw.Close(); err != nil {
		t.Fatalf("关闭失败: %v", err)
	}
	f.Close()

	zr, err := zip.OpenReader(p)
	if err != nil {
		t.Fatalf("打开失败: %v", err)
	}
	defer zr.Close()
	_, _, err = zipFileEntries(&zr.Reader)
	if me, ok := err.(*Error); !ok || me.Code != "archive.duplicate_entry" {
		t.Errorf("应报 archive.duplicate_entry，得到 %v", err)
	}
}

// TestReadZipEntryLimitedTooLarge 条目超过限制。
func TestReadZipEntryLimitedTooLarge(t *testing.T) {
	dir := t.TempDir()
	p := makeZip(t, dir, "a.zip", map[string][]byte{"big.txt": []byte(strings.Repeat("x", 100))})
	zr, err := zip.OpenReader(p)
	if err != nil {
		t.Fatalf("打开失败: %v", err)
	}
	defer zr.Close()
	_, err = readZipEntryLimited(zr.File[0], 10, "测试")
	if me, ok := err.(*Error); !ok || me.Code != "epub.resource_too_large" {
		t.Errorf("应报 epub.resource_too_large，得到 %v", err)
	}
}

// TestParseXMLInvalid 非法 XML。
func TestParseXMLInvalid(t *testing.T) {
	if _, err := parseXML([]byte("<unclosed>"), "测试"); err == nil {
		t.Error("非法 XML 应报错")
	}
	if _, err := parseXML([]byte("<ok/>"), "测试"); err != nil {
		t.Errorf("合法 XML 不应报错: %v", err)
	}
}

// TestAllTextAndWalk 覆盖节点遍历与文本收集。
func TestAllTextAndWalk(t *testing.T) {
	root, err := parseXML([]byte(`<a>hello<b>world</b></a>`), "测试")
	if err != nil {
		t.Fatalf("解析失败: %v", err)
	}
	if got := root.allText(); !strings.Contains(got, "hello") || !strings.Contains(got, "world") {
		t.Errorf("allText = %q", got)
	}
	count := 0
	root.walk(func(*xmlNode) { count++ })
	if count != 2 {
		t.Errorf("walk 访问了 %d 个节点，want 2", count)
	}
}

// makeEpubRaw 生成一个 EPUB，entries 为路径到内容的映射。
//
// storedMimetype 为真时 mimetype 用 STORED 写入。
func makeEpubRaw(t *testing.T, dir, name string, entries map[string]string, storedMimetype bool) string {
	t.Helper()
	p := filepath.Join(dir, name)
	f, err := os.Create(p)
	if err != nil {
		t.Fatalf("创建失败: %v", err)
	}
	zw := zip.NewWriter(f)
	for n, data := range entries {
		var w interface{ Write([]byte) (int, error) }
		if n == "mimetype" && storedMimetype {
			w, err = zw.CreateHeader(&zip.FileHeader{Name: n, Method: zip.Store})
		} else {
			w, err = zw.Create(n)
		}
		if err != nil {
			t.Fatalf("创建条目失败: %v", err)
		}
		if _, err := w.Write([]byte(data)); err != nil {
			t.Fatalf("写入失败: %v", err)
		}
	}
	if err := zw.Close(); err != nil {
		t.Fatalf("关闭失败: %v", err)
	}
	f.Close()
	return p
}

// makeEpubManySpine 生成一个 spine 含 n 项的 EPUB。
func makeEpubManySpine(t *testing.T, dir, name string, n int) string {
	t.Helper()
	var manifest, spine strings.Builder
	for i := 0; i < n; i++ {
		id := "p" + string(rune('a'+i%26)) + string(rune('0'+i/26%10))
		manifest.WriteString(`<item id="` + id + `" href="` + id + `.xhtml" media-type="application/xhtml+xml"/>`)
		spine.WriteString(`<itemref idref="` + id + `"/>`)
	}
	entries := map[string]string{
		"mimetype":               "application/epub+zip",
		"META-INF/container.xml": `<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>`,
		"OEBPS/content.opf":      `<?xml version="1.0"?><package><manifest>` + manifest.String() + `</manifest><spine>` + spine.String() + `</spine></package>`,
	}
	return makeEpubRaw(t, dir, name, entries, true)
}

// makeEpubTwoImages 生成一个 manifest 含两张图片的 EPUB。
func makeEpubTwoImages(t *testing.T, dir, name, xhtml string) string {
	t.Helper()
	entries := map[string]string{
		"mimetype":               "application/epub+zip",
		"META-INF/container.xml": `<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>`,
		"OEBPS/content.opf": `<?xml version="1.0"?><package><manifest>` +
			`<item id="p1" href="page.xhtml" media-type="application/xhtml+xml"/>` +
			`<item id="i1" href="p.png" media-type="image/png"/>` +
			`<item id="i2" href="q.png" media-type="image/png"/>` +
			`</manifest><spine><itemref idref="p1"/></spine></package>`,
		"OEBPS/page.xhtml": xhtml,
	}
	return makeEpubRaw(t, dir, name, entries, true)
}
