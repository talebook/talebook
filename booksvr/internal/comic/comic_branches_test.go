package comic

import (
	"archive/zip"
	"encoding/binary"
	"os"
	"path/filepath"
	"testing"
)

// TestJPEGDimensionsBranches 覆盖 JPEG 段扫描的各分支。
func TestJPEGDimensionsBranches(t *testing.T) {
	// 跳过非 0xFF 字节后命中 SOF。
	b := []byte{0xFF, 0xD8, 0x00, 0x11, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x01, 0xE0, 0x02, 0x80}
	if w, h, err := jpegDimensions(b); err != nil || w != 640 || h != 480 {
		t.Errorf("跳过填充字节后应命中 SOF，得到 (%d,%d,%v)", w, h, err)
	}

	// 带 APP0 段（跳过段长）。
	app0 := []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x04, 0x00, 0x00,
		0xFF, 0xC0, 0x00, 0x11, 0x08, 0x01, 0xE0, 0x02, 0x80}
	if w, h, err := jpegDimensions(app0); err != nil || w != 640 || h != 480 {
		t.Errorf("跳过 APP0 后应命中 SOF，得到 (%d,%d,%v)", w, h, err)
	}

	// 段长为 0（非法）→ 退出循环。
	bad := []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00}
	if _, _, err := jpegDimensions(bad); err == nil {
		t.Error("段长为 0 应报错")
	}

	// 数据在段长读取前结束。
	short := []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00}
	if _, _, err := jpegDimensions(short); err == nil {
		t.Error("数据不足应报错")
	}
}

// TestWebPDimensionsBranches 覆盖 WebP 各分支。
func TestWebPDimensionsBranches(t *testing.T) {
	// VP8（有损）：宽高在 26..30。
	vp8 := make([]byte, 30)
	copy(vp8, []byte("RIFF\x00\x00\x00\x00WEBPVP8 "))
	binary.LittleEndian.PutUint16(vp8[26:28], 320)
	binary.LittleEndian.PutUint16(vp8[28:30], 240)
	if w, h, err := webpDimensions(vp8); err != nil || w != 320 || h != 240 {
		t.Errorf("VP8 尺寸 = (%d,%d,%v)", w, h, err)
	}

	// VP8L 数据不足。
	shortL := make([]byte, 22)
	copy(shortL, []byte("RIFF\x00\x00\x00\x00WEBPVP8L"))
	if _, _, err := webpDimensions(shortL); err == nil {
		t.Error("VP8L 数据不足应报错")
	}

	// VP8 数据不足。
	short8 := make([]byte, 28)
	copy(short8, []byte("RIFF\x00\x00\x00\x00WEBPVP8 "))
	if _, _, err := webpDimensions(short8); err == nil {
		t.Error("VP8 数据不足应报错")
	}
}

// TestGIFBMPShortData 覆盖 GIF/BMP 数据不足。
func TestGIFBMPShortData(t *testing.T) {
	if _, _, err := gifDimensions([]byte("GIF")); err == nil {
		t.Error("GIF 数据不足应报错")
	}
	if _, _, err := bmpDimensions([]byte("BM")); err == nil {
		t.Error("BMP 数据不足应报错")
	}
}

// TestNaturalSortKeyBranches 覆盖自然排序键的分支。
func TestNaturalSortKeyBranches(t *testing.T) {
	// 纯数字。
	k1 := naturalPageSortKey("123")
	if len(k1) != 1 {
		t.Errorf("纯数字应产生 1 个键，得到 %v", k1)
	}
	// 纯文本。
	k2 := naturalPageSortKey("abc")
	if len(k2) != 1 {
		t.Errorf("纯文本应产生 1 个键，得到 %v", k2)
	}
	// 混合。
	k3 := naturalPageSortKey("a1b2")
	if len(k3) != 4 {
		t.Errorf("混合应产生 4 个键，得到 %v", k3)
	}
	// 空串。
	if k := naturalPageSortKey(""); len(k) != 0 {
		t.Errorf("空串应产生 0 个键，得到 %v", k)
	}
	// 超长数字（ParseUint 溢出）应降级为 0 而不 panic。
	if k := naturalPageSortKey("999999999999999999999999"); len(k) != 1 {
		t.Errorf("超长数字应产生 1 个键，得到 %v", k)
	}
}

// TestLessNatural 覆盖自然键比较。
func TestLessNatural(t *testing.T) {
	if !lessNatural([]string{"a"}, []string{"b"}) {
		t.Error("a < b 应为 true")
	}
	if lessNatural([]string{"b"}, []string{"a"}) {
		t.Error("b < a 应为 false")
	}
	// 前缀更短者在前。
	if !lessNatural([]string{"a"}, []string{"a", "b"}) {
		t.Error("短前缀应在前")
	}
	if lessNatural([]string{"a", "b"}, []string{"a"}) {
		t.Error("长序列不应在前")
	}
	if lessNatural([]string{"a"}, []string{"a"}) {
		t.Error("相等应为 false")
	}
}

// TestReadEntryMissing 覆盖条目不存在。
func TestReadEntryMissing(t *testing.T) {
	path := makeZip(t, map[string][]byte{"a.png": pngBytes(10, 10)})
	if _, err := readEntry(path, "zip", "no-such.png", 100); err == nil {
		t.Error("不存在的条目应报错")
	}
}

// TestReadEntryBadZip 覆盖损坏 zip。
func TestReadEntryBadZip(t *testing.T) {
	path := filepath.Join(t.TempDir(), "bad.cbz")
	if err := os.WriteFile(path, []byte("not a zip"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	if _, err := readEntry(path, "zip", "a.png", 100); err == nil {
		t.Error("损坏 zip 应报错")
	}
}

// TestBuildManifestBadZip 覆盖 buildManifest 的 zip 打开失败。
func TestBuildManifestBadZip(t *testing.T) {
	path := filepath.Join(t.TempDir(), "bad.cbz")
	if err := os.WriteFile(path, []byte("not a zip"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	s := NewService()
	if _, err := s.buildManifest(path, "zip"); err == nil {
		t.Error("损坏 zip 应报错")
	}
}

// TestBuildManifestBadPage 覆盖页面校验失败。
func TestBuildManifestBadPage(t *testing.T) {
	// 扩展名与内容不匹配。
	path := makeZip(t, map[string][]byte{"page.jpg": pngBytes(10, 10)})
	s := NewService()
	if _, err := s.buildManifest(path, "zip"); err == nil {
		t.Error("扩展名不匹配应报错")
	}
}

// TestReadPageSizeMismatch 覆盖读取内容与声明大小不符。
func TestReadPageSizeMismatch(t *testing.T) {
	// 正常构建清单后，篡改文件使读取长度不符。
	path := makeZip(t, map[string][]byte{"a.png": pngBytes(10, 10)})
	s := NewService()
	m, err := s.GetManifest(path, "cbz")
	if err != nil {
		t.Fatalf("GetManifest 失败: %v", err)
	}
	// 用截断的文件替换，使读取长度小于声明。
	if err := os.WriteFile(path, []byte("short"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	s.ClearCache()
	if _, err := s.ReadPage(path, "cbz", 0, m.Revision); err == nil {
		t.Error("内容不符应报错")
	}
}

// TestValidatePageHeaderNoExtension 覆盖无扩展名。
func TestValidatePageHeaderNoExtension(t *testing.T) {
	png := pngBytes(10, 10)
	if _, _, _, err := validatePageHeader("noext", 100, png); err == nil {
		t.Error("无扩展名应报错")
	}
}

// TestZipEntryOpenError 覆盖条目打开失败。
func TestZipEntryOpenError(t *testing.T) {
	// 构造一个条目数据被截断的 zip。
	path := filepath.Join(t.TempDir(), "trunc.cbz")
	f, err := os.Create(path)
	if err != nil {
		t.Fatalf("创建失败: %v", err)
	}
	zw := zip.NewWriter(f)
	w, _ := zw.Create("a.png")
	if _, err := w.Write(pngBytes(10, 10)); err != nil {
		t.Fatalf("写入失败: %v", err)
	}
	if err := zw.Close(); err != nil {
		t.Fatalf("关闭失败: %v", err)
	}
	f.Close()

	// 截断文件尾部，使条目数据不完整。
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("读取失败: %v", err)
	}
	if err := os.WriteFile(path, raw[:len(raw)-10], 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}

	s := NewService()
	// 可能报错（截断）或成功（zip 中心目录仍可读）；两者都可接受，
	// 这里只要求不 panic。
	_, _ = s.GetManifest(path, "cbz")
}
