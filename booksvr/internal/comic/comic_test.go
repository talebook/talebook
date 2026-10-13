package comic

import (
	"sort"
	"testing"
)

// TestNaturalSortMatchesPython 校验自然排序与 Python 逐项一致。
//
// 期望顺序由 scripts 用 Python 的 natural_page_sort_key 生成。
func TestNaturalSortMatchesPython(t *testing.T) {
	names := []string{
		"page1.jpg", "page2.jpg", "page10.jpg", "Page02.JPG",
		"第1话/001.png", "第1话/002.png", "第10话/001.png", "第2话/001.png",
		"a/1.jpg", "a/01.jpg", "a/001.jpg", "cover.jpg",
		"__MACOSX/x.jpg", "dir/._hidden.jpg", "ComicInfo.xml",
		"b\\c\\3.png", "全角０１.jpg", "  spaced  .jpg",
	}
	want := []string{
		"  spaced  .jpg",
		"__MACOSX/x.jpg",
		"a/1.jpg",
		"a/01.jpg",
		"a/001.jpg",
		"b\\c\\3.png",
		"ComicInfo.xml",
		"cover.jpg",
		"dir/._hidden.jpg",
		"page1.jpg",
		"page2.jpg",
		"Page02.JPG",
		"page10.jpg",
		"全角０１.jpg",
		"第1话/001.png",
		"第1话/002.png",
		"第2话/001.png",
		"第10话/001.png",
	}

	got := append([]string(nil), names...)
	sort.SliceStable(got, func(i, j int) bool {
		return lessNatural(naturalPageSortKey(got[i]), naturalPageSortKey(got[j]))
	})

	if len(got) != len(want) {
		t.Fatalf("长度不符: %d vs %d", len(got), len(want))
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("位置 %d: got %q, want %q", i, got[i], want[i])
		}
	}
}

// TestRevisionMatchesPython 校验 revision 哈希与 Python 逐字节一致。
func TestRevisionMatchesPython(t *testing.T) {
	entries := []entry{
		{name: "page1.jpg", byteSize: 1234, checksum: 111},
		{name: "page2.jpg", byteSize: 5678, checksum: 222},
		{name: "第1话/001.png", byteSize: 9012, checksum: 333},
	}
	const want = "c1dbc66ef38c83b51003"
	if got := revisionOf("zip", entries); got != want {
		t.Errorf("revisionOf = %q, want %q", got, want)
	}
}

// TestIgnoredEntry 覆盖忽略规则。
func TestIgnoredEntry(t *testing.T) {
	ignored := []string{
		"__MACOSX/x.jpg", "__macosx/x.jpg",
		".DS_Store", "dir/.ds_store", "Thumbs.db", "ComicInfo.xml",
		"dir/._hidden.jpg", "._x.jpg",
	}
	// 注意：__MACOSX 只在根目录被忽略（对齐 Python 的 parts[0] 判断）。
	if ignoredEntry("dir/__MACOSX/x.jpg") {
		t.Error("嵌套的 __MACOSX 不应被忽略（Python 只判断根目录）")
	}
	for _, n := range ignored {
		if !ignoredEntry(n) {
			t.Errorf("%q 应被忽略", n)
		}
	}
	kept := []string{"page1.jpg", "dir/page2.png", "cover.jpeg", "第1话/001.png"}
	for _, n := range kept {
		if ignoredEntry(n) {
			t.Errorf("%q 不应被忽略", n)
		}
	}
}

// TestDetectImageMIME 覆盖各图片格式的魔数探测。
func TestDetectImageMIME(t *testing.T) {
	cases := []struct {
		header []byte
		want   string
	}{
		{[]byte{0xFF, 0xD8, 0xFF, 0xE0}, "image/jpeg"},
		{[]byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'}, "image/png"},
		{[]byte("GIF87a"), "image/gif"},
		{[]byte("GIF89a"), "image/gif"},
		{[]byte("BM\x00\x00"), "image/bmp"},
		{[]byte{'I', 'I', '*', 0x00}, "image/tiff"},
		{[]byte{'M', 'M', 0x00, '*'}, "image/tiff"},
		{[]byte("RIFF\x00\x00\x00\x00WEBPVP8 "), "image/webp"},
		{[]byte{0xFF, 0x0A}, "image/jxl"},
		{[]byte("\x00\x00\x00\x0cJXL \r\n\x87\n"), "image/jxl"},
		{[]byte("\x00\x00\x00\x20ftypavif"), "image/avif"},
		{[]byte("\x00\x00\x00\x20ftypavis"), "image/avif"},
		{[]byte("unknown"), ""},
		{nil, ""},
	}
	for _, c := range cases {
		if got := detectImageMIME(c.header); got != c.want {
			t.Errorf("detectImageMIME(%q) = %q, want %q", c.header, got, c.want)
		}
	}
}

// TestNormalizeNFKC 覆盖全角转半角。
func TestNormalizeNFKC(t *testing.T) {
	if got := normalizeNFKC("０１ＡＢ"); got != "01AB" {
		t.Errorf("全角 ASCII 应转半角，得到 %q", got)
	}
	if got := normalizeNFKC("a\u3000b"); got != "a b" {
		t.Errorf("全角空格应转半角，得到 %q", got)
	}
	if got := normalizeNFKC("中文abc"); got != "中文abc" {
		t.Errorf("其他字符应原样保留，得到 %q", got)
	}
}

// TestSelectContainer 覆盖容器选择。
func TestSelectContainer(t *testing.T) {
	// 非漫画。
	if _, _, err := SelectContainer(map[string]any{"media_type": "ebook"}); err == nil {
		t.Error("非漫画应报错")
	}
	if _, _, err := SelectContainer(nil); err == nil {
		t.Error("nil 应报错")
	}
	// 无容器。
	if _, _, err := SelectContainer(map[string]any{"media_type": "comic"}); err == nil {
		t.Error("无容器应报错")
	}
	// 按优先级选 cbz。
	p, f, err := SelectContainer(map[string]any{
		"media_type": "comic", "fmt_cbz": "/a.cbz", "fmt_zip": "/a.zip",
	})
	if err != nil || p != "/a.cbz" || f != "cbz" {
		t.Errorf("应优先选 cbz，得到 (%q,%q,%v)", p, f, err)
	}
	// 只有 zip。
	p, f, err = SelectContainer(map[string]any{"media_type": "comic", "fmt_zip": "/a.zip"})
	if err != nil || p != "/a.zip" || f != "zip" {
		t.Errorf("应选 zip，得到 (%q,%q,%v)", p, f, err)
	}
}

// TestPageToPublicDict 覆盖页面公开结构。
func TestPageToPublicDict(t *testing.T) {
	p := Page{Index: 3, PageID: "rev:3", MIMEType: "image/png", Width: 800, Height: 1200}
	got := p.ToPublicDict(42, "rev")
	if got["id"] != "rev:3" || got["index"] != 3 || got["width"] != 800 || got["height"] != 1200 {
		t.Errorf("字段不符: %v", got)
	}
	want := "/api/book/42/comic/pages/3?revision=rev"
	if got["url"] != want {
		t.Errorf("url = %v, want %s", got["url"], want)
	}
}

// TestErrorType 覆盖错误类型。
func TestErrorType(t *testing.T) {
	e := NewError("comic.x", "消息", 404)
	if e.Code != "comic.x" || e.Message != "消息" || e.Status != 404 {
		t.Errorf("Error 字段不符: %+v", e)
	}
	if e.Error() != "comic.x: 消息" {
		t.Errorf("Error() = %q", e.Error())
	}
}

// TestImageDimensions 覆盖各格式尺寸解析与上限校验。
func TestImageDimensions(t *testing.T) {
	// PNG：宽 800 高 600。
	png := make([]byte, 24)
	copy(png, []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'})
	png[16], png[17], png[18], png[19] = 0, 0, 0x03, 0x20 // 800
	png[20], png[21], png[22], png[23] = 0, 0, 0x02, 0x58 // 600
	if w, h, err := imageDimensions(png, "image/png"); err != nil || w != 800 || h != 600 {
		t.Errorf("PNG 尺寸 = (%d,%d,%v)", w, h, err)
	}

	// GIF：宽 100 高 50。
	gif := make([]byte, 10)
	copy(gif, []byte("GIF89a"))
	gif[6], gif[7] = 100, 0
	gif[8], gif[9] = 50, 0
	if w, h, err := imageDimensions(gif, "image/gif"); err != nil || w != 100 || h != 50 {
		t.Errorf("GIF 尺寸 = (%d,%d,%v)", w, h, err)
	}

	// BMP：宽 200 高 100。
	bmp := make([]byte, 26)
	copy(bmp, []byte("BM"))
	bmp[18], bmp[19], bmp[20], bmp[21] = 200, 0, 0, 0
	bmp[22], bmp[23], bmp[24], bmp[25] = 100, 0, 0, 0
	if w, h, err := imageDimensions(bmp, "image/bmp"); err != nil || w != 200 || h != 100 {
		t.Errorf("BMP 尺寸 = (%d,%d,%v)", w, h, err)
	}

	// 负高度 BMP 应取绝对值。
	bmp2 := make([]byte, 26)
	copy(bmp2, []byte("BM"))
	bmp2[18], bmp2[19], bmp2[20], bmp2[21] = 200, 0, 0, 0
	bmp2[22], bmp2[23], bmp2[24], bmp2[25] = 0xFF, 0xFF, 0xFF, 0xFF // -1
	if _, h, err := imageDimensions(bmp2, "image/bmp"); err != nil || h != 1 {
		t.Errorf("负高度应取绝对值，得到 (%d,%v)", h, err)
	}

	// 不支持的格式。
	if _, _, err := imageDimensions(png, "image/avif"); err == nil {
		t.Error("不支持的格式应报错")
	}
	// 数据不足。
	if _, _, err := imageDimensions([]byte{1, 2}, "image/png"); err == nil {
		t.Error("数据不足应报错")
	}
	// 超上限。
	huge := make([]byte, 24)
	copy(huge, []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'})
	huge[16], huge[17], huge[18], huge[19] = 0, 0x01, 0x00, 0x00 // 65536 > 32768
	huge[20], huge[21], huge[22], huge[23] = 0, 0, 0x00, 0x64
	if _, _, err := imageDimensions(huge, "image/png"); err == nil {
		t.Error("超上限应报错")
	}
}

// TestJPEGDimensions 覆盖 JPEG 段扫描。
func TestJPEGDimensions(t *testing.T) {
	// SOI + SOF0（宽 640 高 480）。
	b := []byte{0xFF, 0xD8, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x01, 0xE0, 0x02, 0x80}
	if w, h, err := jpegDimensions(b); err != nil || w != 640 || h != 480 {
		t.Errorf("JPEG 尺寸 = (%d,%d,%v)", w, h, err)
	}
	// 无 SOF 标记。
	if _, _, err := jpegDimensions([]byte{0xFF, 0xD8, 0xFF, 0xD9}); err == nil {
		t.Error("无 SOF 应报错")
	}
}

// TestWebPDimensions 覆盖 WebP 三种块。
func TestWebPDimensions(t *testing.T) {
	// VP8X：宽高各减 1 存储。
	vp8x := make([]byte, 30)
	copy(vp8x, []byte("RIFF\x00\x00\x00\x00WEBPVP8X"))
	vp8x[24], vp8x[25], vp8x[26] = 0x63, 0x00, 0x00 // 99 → 100
	vp8x[27], vp8x[28], vp8x[29] = 0x31, 0x00, 0x00 // 49 → 50
	if w, h, err := webpDimensions(vp8x); err != nil || w != 100 || h != 50 {
		t.Errorf("VP8X 尺寸 = (%d,%d,%v)", w, h, err)
	}

	// VP8L。
	vp8l := make([]byte, 30)
	copy(vp8l, []byte("RIFF\x00\x00\x00\x00WEBPVP8L"))
	// bits = (h-1)<<14 | (w-1)；w=10,h=20 → (19<<14)|9
	bits := uint32(19)<<14 | uint32(9)
	vp8l[21] = byte(bits)
	vp8l[22] = byte(bits >> 8)
	vp8l[23] = byte(bits >> 16)
	vp8l[24] = byte(bits >> 24)
	if w, h, err := webpDimensions(vp8l); err != nil || w != 10 || h != 20 {
		t.Errorf("VP8L 尺寸 = (%d,%d,%v)", w, h, err)
	}

	// 未知块。
	bad := make([]byte, 30)
	copy(bad, []byte("RIFF\x00\x00\x00\x00WEBPXXXX"))
	if _, _, err := webpDimensions(bad); err == nil {
		t.Error("未知块应报错")
	}
	// 数据不足。
	if _, _, err := webpDimensions([]byte("RIFF")); err == nil {
		t.Error("数据不足应报错")
	}
}

// TestValidatePageHeader 覆盖页头校验。
func TestValidatePageHeader(t *testing.T) {
	png := make([]byte, 24)
	copy(png, []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'})
	png[16], png[17], png[18], png[19] = 0, 0, 0x03, 0x20
	png[20], png[21], png[22], png[23] = 0, 0, 0x02, 0x58

	// 正常。
	mt, w, h, err := validatePageHeader("page1.png", 1000, png)
	if err != nil || mt != "image/png" || w != 800 || h != 600 {
		t.Errorf("正常页 = (%q,%d,%d,%v)", mt, w, h, err)
	}

	// 体积为 0。
	if _, _, _, err := validatePageHeader("page1.png", 0, png); err == nil {
		t.Error("体积为 0 应报错")
	}
	// 体积超限。
	if _, _, _, err := validatePageHeader("page1.png", MaxPageBytes+1, png); err == nil {
		t.Error("体积超限应报错")
	}
	// 扩展名不匹配。
	if _, _, _, err := validatePageHeader("page1.jpg", 1000, png); err == nil {
		t.Error("扩展名不匹配应报错")
	}
	// 无法识别类型。
	if _, _, _, err := validatePageHeader("page1.png", 1000, []byte("unknown")); err == nil {
		t.Error("无法识别类型应报错")
	}
}

// TestDetectedFormat 覆盖格式归一化。
func TestDetectedFormat(t *testing.T) {
	cases := map[string]string{
		"cbz": "zip", "zip": "zip", "CBZ": "zip",
		"cbr": "rar", "rar": "rar",
		"pdf": "",
	}
	for in, want := range cases {
		if got := detectedFormat(in); got != want {
			t.Errorf("detectedFormat(%q) = %q, want %q", in, got, want)
		}
	}
}

// TestCacheKeyErrors 覆盖缓存键的错误分支。
func TestCacheKeyErrors(t *testing.T) {
	if _, _, err := cacheKey("", "zip"); err == nil {
		t.Error("空路径应报错")
	}
	if _, _, err := cacheKey("no-such-file-xyz.cbz", "zip"); err == nil {
		t.Error("不存在的文件应报错")
	}
	if _, _, err := cacheKey(t.TempDir(), "zip"); err == nil {
		t.Error("目录应报错")
	}
}

// TestServiceCache 覆盖清单缓存与淘汰。
func TestServiceCache(t *testing.T) {
	s := NewService()
	if s.cache == nil {
		t.Fatal("缓存应初始化")
	}
	s.ClearCache()
	if len(s.cache) != 0 {
		t.Error("清空后缓存应为空")
	}
}

// TestReadPageMissing 覆盖读取不存在的容器。
func TestReadPageMissing(t *testing.T) {
	s := NewService()
	if _, err := s.GetManifest("no-such.cbz", "cbz"); err == nil {
		t.Error("不存在的容器应报错")
	}
	if _, err := s.ReadPage("no-such.cbz", "cbz", 0, ""); err == nil {
		t.Error("不存在的容器应报错")
	}
}

// TestArchiveEntriesNonZip 覆盖非 zip 格式。
func TestArchiveEntriesNonZip(t *testing.T) {
	if _, err := archiveEntries("x.cbr", "rar"); err == nil {
		t.Error("rar 应返回不支持错误")
	}
	if _, err := readEntry("x.cbr", "rar", "a", 10); err == nil {
		t.Error("rar 应返回不支持错误")
	}
}

// TestBuildManifestBadFormat 覆盖不支持的容器格式。
func TestBuildManifestBadFormat(t *testing.T) {
	s := NewService()
	if _, err := s.buildManifest("x.pdf", "pdf"); err == nil {
		t.Error("不支持的格式应报错")
	}
}

// TestUTF8Valid 覆盖 UTF-8 校验辅助。
func TestUTF8Valid(t *testing.T) {
	if !utf8Valid("中文") {
		t.Error("合法 UTF-8 应返回 true")
	}
	if utf8Valid("\xff\xfe") {
		t.Error("非法 UTF-8 应返回 false")
	}
}
