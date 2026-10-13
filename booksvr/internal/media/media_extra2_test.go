package media

import (
	"archive/zip"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestReadSignatureDirectory 对目录调用 readSignature 会失败。
func TestReadSignatureDirectory(t *testing.T) {
	dir := t.TempDir()
	if _, err := readSignature(dir, 4); err == nil {
		t.Error("目录应报错")
	}
}

// TestReadZipEntryOnDirectoryEntry 对目录条目调用 readZipEntry。
func TestReadZipEntryOnDirectoryEntry(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "a.zip")
	f, err := os.Create(p)
	if err != nil {
		t.Fatalf("创建失败: %v", err)
	}
	zw := zip.NewWriter(f)
	// 显式写一个目录条目。
	if _, err := zw.Create("sub/"); err != nil {
		t.Fatalf("创建目录失败: %v", err)
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
	// 目录条目读取返回空内容而非报错。
	data, err := readZipEntry(zr.File[0], 10)
	if err != nil {
		t.Errorf("目录条目不应报错: %v", err)
	}
	if len(data) != 0 {
		t.Errorf("目录条目内容应为空，得到 %d 字节", len(data))
	}
}

// TestReadZipEntryLimitedExactSize 恰好等于限制的条目可通过。
func TestReadZipEntryLimitedExactSize(t *testing.T) {
	dir := t.TempDir()
	p := makeZip(t, dir, "a.zip", map[string][]byte{"a.txt": []byte("12345")})
	zr, err := zip.OpenReader(p)
	if err != nil {
		t.Fatalf("打开失败: %v", err)
	}
	defer zr.Close()
	data, err := readZipEntryLimited(zr.File[0], 5, "测试")
	if err != nil {
		t.Fatalf("恰好等于限制不应报错: %v", err)
	}
	if string(data) != "12345" {
		t.Errorf("data = %q", data)
	}
}

// TestAnalyzeEpubPageLimit 页面超过体积上限时返回 page_limit。
//
// 用 STORED 写入页面，避免高压缩比先触发 archive.suspicious_ratio。
func TestAnalyzeEpubPageLimit(t *testing.T) {
	dir := t.TempDir()
	big := `<html><body>` + strings.Repeat("x", MaxEpubXHTMLBytes+10) + `</body></html>`
	p := makeEpubStoredPage(t, dir, "a.epub", big)
	got, err := AnalyzeFile(p, "epub")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got.Reason != "page_limit" {
		t.Errorf("reason = %q, want page_limit", got.Reason)
	}
}

// makeEpubStoredPage 生成一个页面用 STORED 写入的 EPUB。
func makeEpubStoredPage(t *testing.T, dir, name, xhtml string) string {
	t.Helper()
	p := filepath.Join(dir, name)
	f, err := os.Create(p)
	if err != nil {
		t.Fatalf("创建失败: %v", err)
	}
	zw := zip.NewWriter(f)
	stored := func(n, data string) {
		w, err := zw.CreateHeader(&zip.FileHeader{Name: n, Method: zip.Store})
		if err != nil {
			t.Fatalf("创建条目失败: %v", err)
		}
		if _, err := w.Write([]byte(data)); err != nil {
			t.Fatalf("写入失败: %v", err)
		}
	}
	stored("mimetype", "application/epub+zip")
	stored("META-INF/container.xml", `<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>`)
	stored("OEBPS/content.opf", `<?xml version="1.0"?><package><manifest>`+
		`<item id="p1" href="page.xhtml" media-type="application/xhtml+xml"/>`+
		`</manifest><spine><itemref idref="p1"/></spine></package>`)
	stored("OEBPS/page.xhtml", xhtml)
	if err := zw.Close(); err != nil {
		t.Fatalf("关闭失败: %v", err)
	}
	f.Close()
	return p
}

// TestAnalyzeEpubSpinePageMissing spine 页面文件不存在。
func TestAnalyzeEpubSpinePageMissing(t *testing.T) {
	dir := t.TempDir()
	p := makeEpubRaw(t, dir, "a.epub", map[string]string{
		"mimetype":               "application/epub+zip",
		"META-INF/container.xml": `<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>`,
		"OEBPS/content.opf": `<?xml version="1.0"?><package><manifest>` +
			`<item id="p1" href="missing.xhtml" media-type="application/xhtml+xml"/>` +
			`</manifest><spine><itemref idref="p1"/></spine></package>`,
	}, true)
	_, err := AnalyzeFile(p, "epub")
	if me, ok := err.(*Error); !ok || me.Code != "epub.spine_invalid" {
		t.Errorf("应报 epub.spine_invalid，得到 %v", err)
	}
}

// TestAnalyzeEpubUnknownMediaType spine 指向未知 media-type。
func TestAnalyzeEpubUnknownMediaType(t *testing.T) {
	dir := t.TempDir()
	p := makeEpubRaw(t, dir, "a.epub", map[string]string{
		"mimetype":               "application/epub+zip",
		"META-INF/container.xml": `<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>`,
		"OEBPS/content.opf": `<?xml version="1.0"?><package><manifest>` +
			`<item id="p1" href="a.bin" media-type="application/octet-stream"/>` +
			`</manifest><spine><itemref idref="p1"/></spine></package>`,
		"OEBPS/a.bin": "x",
	}, true)
	got, err := AnalyzeFile(p, "epub")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got.MediaType != TypeEbook || got.Reason != "text_spine" {
		t.Errorf("got = %+v", got)
	}
}

// TestAnalyzeEpubManifestItemMissingID manifest 条目缺 id 或 href 时被跳过。
func TestAnalyzeEpubManifestItemMissingID(t *testing.T) {
	dir := t.TempDir()
	p := makeEpubRaw(t, dir, "a.epub", map[string]string{
		"mimetype":               "application/epub+zip",
		"META-INF/container.xml": `<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>`,
		"OEBPS/content.opf": `<?xml version="1.0"?><package><manifest>` +
			`<item href="noid.xhtml" media-type="application/xhtml+xml"/>` +
			`<item id="p1" href="page.xhtml" media-type="application/xhtml+xml"/>` +
			`</manifest><spine><itemref idref="p1"/></spine></package>`,
		"OEBPS/page.xhtml": `<html><body><p>` + strings.Repeat("w ", 50) + `</p></body></html>`,
	}, true)
	got, err := AnalyzeFile(p, "epub")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got.MediaType != TypeEbook {
		t.Errorf("got = %+v", got)
	}
}

// TestAnalyzeEpubContainerRootfileUnsafe rootfile 路径不安全时跳过。
func TestAnalyzeEpubContainerRootfileUnsafe(t *testing.T) {
	dir := t.TempDir()
	p := makeEpubRaw(t, dir, "a.epub", map[string]string{
		"mimetype":               "application/epub+zip",
		"META-INF/container.xml": `<?xml version="1.0"?><container><rootfiles><rootfile full-path="../evil.opf"/></rootfiles></container>`,
	}, true)
	_, err := AnalyzeFile(p, "epub")
	if me, ok := err.(*Error); !ok || me.Code != "epub.package_missing" {
		t.Errorf("应报 epub.package_missing，得到 %v", err)
	}
}

// TestAnalyzeEpubImageNotInManifest 页面引用的图片不在 manifest 中。
func TestAnalyzeEpubImageNotInManifest(t *testing.T) {
	dir := t.TempDir()
	p := makeEpub(t, dir, "a.epub", `<html><body><img src="unknown.png"/></body></html>`)
	got, err := AnalyzeFile(p, "epub")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	// 图片不在 manifest → 不判为漫画。
	if got.MediaType != TypeEbook {
		t.Errorf("got = %+v", got)
	}
}

// TestAnalyzeEpubManifestImageNotImageType manifest 里是非图片类型。
func TestAnalyzeEpubManifestImageNotImageType(t *testing.T) {
	dir := t.TempDir()
	p := makeEpubRaw(t, dir, "a.epub", map[string]string{
		"mimetype":               "application/epub+zip",
		"META-INF/container.xml": `<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>`,
		"OEBPS/content.opf": `<?xml version="1.0"?><package><manifest>` +
			`<item id="p1" href="page.xhtml" media-type="application/xhtml+xml"/>` +
			`<item id="i1" href="p.png" media-type="text/plain"/>` +
			`</manifest><spine><itemref idref="p1"/></spine></package>`,
		"OEBPS/page.xhtml": `<html><body><img src="p.png"/></body></html>`,
		"OEBPS/p.png":      "PNG",
	}, true)
	got, err := AnalyzeFile(p, "epub")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got.MediaType != TypeEbook {
		t.Errorf("非图片 media-type 不应判为漫画，得到 %+v", got)
	}
}

// TestAnalyzeEpubTextThreshold 文本长度恰好等于阈值时仍判为漫画。
func TestAnalyzeEpubTextThreshold(t *testing.T) {
	dir := t.TempDir()
	// 阈值是 15，构造恰好 15 个非空白字符。
	text := strings.Repeat("a", EpubComicTextThreshold)
	p := makeEpub(t, dir, "a.epub", `<html><body><img src="p.png"/>`+text+`</body></html>`)
	got, err := AnalyzeFile(p, "epub")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got.MediaType != TypeComic {
		t.Errorf("恰好等于阈值应判为漫画，得到 %+v", got)
	}
}

// TestAnalyzeEpubTextOverThreshold 文本超过阈值判为 ebook。
func TestAnalyzeEpubTextOverThreshold(t *testing.T) {
	dir := t.TempDir()
	text := strings.Repeat("a", EpubComicTextThreshold+1)
	p := makeEpub(t, dir, "a.epub", `<html><body><img src="p.png"/>`+text+`</body></html>`)
	got, err := AnalyzeFile(p, "epub")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got.MediaType != TypeEbook {
		t.Errorf("超过阈值应判为 ebook，得到 %+v", got)
	}
}

// TestAnalyzeEpubNoBody 页面没有 body 元素时用根节点。
func TestAnalyzeEpubNoBody(t *testing.T) {
	dir := t.TempDir()
	p := makeEpub(t, dir, "a.epub", `<html><img src="p.png"/></html>`)
	got, err := AnalyzeFile(p, "epub")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got.MediaType != TypeComic {
		t.Errorf("无 body 时应回退到根节点，得到 %+v", got)
	}
}

// TestAnalyzeComicZipDirectoryEntries 目录条目被排除在图片检查外。
func TestAnalyzeComicZipDirectoryEntries(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "a.cbz")
	f, err := os.Create(p)
	if err != nil {
		t.Fatalf("创建失败: %v", err)
	}
	zw := zip.NewWriter(f)
	// 显式写一个目录条目。
	if _, err := zw.Create("sub/"); err != nil {
		t.Fatalf("创建目录失败: %v", err)
	}
	w, err := zw.Create("sub/page.png")
	if err != nil {
		t.Fatalf("创建条目失败: %v", err)
	}
	if _, err := w.Write(pngHeader()); err != nil {
		t.Fatalf("写入失败: %v", err)
	}
	if err := zw.Close(); err != nil {
		t.Fatalf("关闭失败: %v", err)
	}
	f.Close()

	got, err := AnalyzeFile(p, "cbz")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got.MediaType != TypeComic {
		t.Errorf("got = %+v", got)
	}
}

// TestAnalyzeComicZipIgnoredEntries 被忽略的条目不影响判定。
func TestAnalyzeComicZipIgnoredEntries(t *testing.T) {
	dir := t.TempDir()
	p := makeZip(t, dir, "a.cbz", map[string][]byte{
		"page.png":         pngHeader(),
		"ComicInfo.xml":    []byte("<ComicInfo/>"),
		"__MACOSX/._p.png": []byte("junk"),
		".DS_Store":        []byte("junk"),
	})
	got, err := AnalyzeFile(p, "cbz")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got.MediaType != TypeComic {
		t.Errorf("got = %+v", got)
	}
}

// TestPreflightZipDirectoryZip64 覆盖 ZIP64 拒绝分支。
func TestPreflightZipDirectoryZip64(t *testing.T) {
	dir := t.TempDir()
	eocd := make([]byte, 22)
	copy(eocd, []byte("PK\x05\x06"))
	// total_entries = 0xFFFF 触发 ZIP64 判定。
	eocd[10], eocd[11] = 0xFF, 0xFF
	eocd[8], eocd[9] = 0xFF, 0xFF
	p := writeFile(t, dir, "a.zip", eocd)
	err := preflightZipDirectory(p)
	if me, ok := err.(*Error); !ok || me.Code != "archive.zip64" {
		t.Errorf("应报 archive.zip64，得到 %v", err)
	}
}

// TestPreflightZipDirectoryMultidisk 覆盖分卷 ZIP 拒绝分支。
func TestPreflightZipDirectoryMultidisk(t *testing.T) {
	dir := t.TempDir()
	eocd := make([]byte, 22)
	copy(eocd, []byte("PK\x05\x06"))
	// disk_number = 1 触发分卷判定。
	eocd[4] = 1
	p := writeFile(t, dir, "a.zip", eocd)
	err := preflightZipDirectory(p)
	if me, ok := err.(*Error); !ok || me.Code != "archive.multidisk" {
		t.Errorf("应报 archive.multidisk，得到 %v", err)
	}
}

// TestPreflightZipDirectoryCommentMismatch 注释长度不匹配。
func TestPreflightZipDirectoryCommentMismatch(t *testing.T) {
	dir := t.TempDir()
	eocd := make([]byte, 22)
	copy(eocd, []byte("PK\x05\x06"))
	// 声明有 10 字节注释但实际没有。
	eocd[20], eocd[21] = 10, 0
	p := writeFile(t, dir, "a.zip", eocd)
	err := preflightZipDirectory(p)
	if me, ok := err.(*Error); !ok || me.Code != "archive.corrupt" {
		t.Errorf("应报 archive.corrupt，得到 %v", err)
	}
}

// TestCheckArchiveBudgetTotalRatio 总压缩比过高。
func TestCheckArchiveBudgetTotalRatio(t *testing.T) {
	// 单条不超限，但累计压缩比超限。
	entries := []archiveEntry{
		{Name: "a", FileSize: 1000, CompressedSize: 100},
		{Name: "b", FileSize: 1000, CompressedSize: 100},
		{Name: "c", FileSize: 1000, CompressedSize: 100},
	}
	// 单条比值 10 < 200，但这里构造总比值超限的场景。
	entries = append(entries, archiveEntry{Name: "d", FileSize: 100000, CompressedSize: 100})
	err := checkArchiveBudget(entries)
	if me, ok := err.(*Error); !ok || me.Code != "archive.suspicious_ratio" {
		t.Errorf("应报 archive.suspicious_ratio，得到 %v", err)
	}
}

// TestCheckArchiveBudgetTotalTooLarge 累计展开体积过大。
func TestCheckArchiveBudgetTotalTooLarge(t *testing.T) {
	// 每条 100MB，6 条累计 600MB > 512MB 上限。
	entries := make([]archiveEntry, 6)
	for i := range entries {
		entries[i] = archiveEntry{Name: "a", FileSize: 100 * 1024 * 1024, CompressedSize: 100 * 1024 * 1024}
	}
	err := checkArchiveBudget(entries)
	if me, ok := err.(*Error); !ok || me.Code != "archive.too_large" {
		t.Errorf("应报 archive.too_large，得到 %v", err)
	}
}
