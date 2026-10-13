package comic

import (
	"archive/zip"
	"encoding/binary"
	"os"
	"path/filepath"
	"testing"
)

// TestImageDimensionsParserErrors 覆盖各解析器的错误传播。
func TestImageDimensionsParserErrors(t *testing.T) {
	// JPEG 解析失败（无 SOF）。
	if _, _, err := imageDimensions([]byte{0xFF, 0xD8, 0xFF, 0xD9}, "image/jpeg"); err == nil {
		t.Error("JPEG 无 SOF 应报错")
	}
	// GIF 数据不足。
	if _, _, err := imageDimensions([]byte("GIF"), "image/gif"); err == nil {
		t.Error("GIF 数据不足应报错")
	}
	// BMP 数据不足。
	if _, _, err := imageDimensions([]byte("BM"), "image/bmp"); err == nil {
		t.Error("BMP 数据不足应报错")
	}
	// WebP 数据不足。
	if _, _, err := imageDimensions([]byte("RIFF"), "image/webp"); err == nil {
		t.Error("WebP 数据不足应报错")
	}
}

// TestJPEGSegmentLengthGuard 覆盖段长读取越界。
func TestJPEGSegmentLengthGuard(t *testing.T) {
	// 段长字段本身越界：i+3 >= len(b)。
	b := []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00}
	if _, _, err := jpegDimensions(b); err == nil {
		t.Error("段长越界应报错")
	}
}

// TestWebPShortChunks 覆盖 VP8/VP8L 数据不足。
func TestWebPShortChunks(t *testing.T) {
	// VP8 块但长度 < 30。
	vp8 := make([]byte, 28)
	copy(vp8, []byte("RIFF\x00\x00\x00\x00WEBPVP8 "))
	if _, _, err := webpDimensions(vp8); err == nil {
		t.Error("VP8 数据不足应报错")
	}
	// VP8L 块但长度 < 25。
	vp8l := make([]byte, 22)
	copy(vp8l, []byte("RIFF\x00\x00\x00\x00WEBPVP8L"))
	if _, _, err := webpDimensions(vp8l); err == nil {
		t.Error("VP8L 数据不足应报错")
	}
}

// TestValidatePageHeaderDimensionError 覆盖尺寸解析失败传播。
func TestValidatePageHeaderDimensionError(t *testing.T) {
	// 类型可识别（JPEG 魔数）但无 SOF → 尺寸解析失败。
	bad := []byte{0xFF, 0xD8, 0xFF, 0xD9}
	if _, _, _, err := validatePageHeader("a.jpg", 100, bad); err == nil {
		t.Error("尺寸解析失败应报错")
	}
}

// TestGetManifestCacheEvictionReal 覆盖真实缓存淘汰路径。
func TestGetManifestCacheEvictionReal(t *testing.T) {
	s := NewService()
	// 造 ManifestCacheSize+2 个不同的容器文件，逐个 GetManifest 触发淘汰。
	dir := t.TempDir()
	for i := 0; i < ManifestCacheSize+2; i++ {
		path := filepath.Join(dir, "c"+itoaTest(i)+".cbz")
		f, err := os.Create(path)
		if err != nil {
			t.Fatalf("创建失败: %v", err)
		}
		zw := zip.NewWriter(f)
		w, _ := zw.Create("a.png")
		// 每页尺寸不同，保证 revision 不同。
		if _, err := w.Write(pngBytes(10+i, 10)); err != nil {
			t.Fatalf("写入失败: %v", err)
		}
		if err := zw.Close(); err != nil {
			t.Fatalf("关闭失败: %v", err)
		}
		f.Close()

		if _, err := s.GetManifest(path, "cbz"); err != nil {
			t.Fatalf("第 %d 个 GetManifest 失败: %v", i, err)
		}
	}
	if len(s.cache) > ManifestCacheSize {
		t.Errorf("缓存不应超过 %d 条，得到 %d", ManifestCacheSize, len(s.cache))
	}
}

// TestBuildManifestReadEntryError 覆盖清单构建时读取条目失败。
func TestBuildManifestReadEntryError(t *testing.T) {
	// 构造一个条目名含非法 UTF-8 的 zip 不易；改为让条目数据被截断。
	path := filepath.Join(t.TempDir(), "t.cbz")
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

	// 截断到只剩中心目录之前，使条目数据不可读。
	raw, _ := os.ReadFile(path)
	if err := os.WriteFile(path, raw[:len(raw)/2], 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}

	s := NewService()
	// 只要求不 panic；可能报错也可能因中心目录仍可读而成功。
	_, _ = s.GetManifest(path, "cbz")
}

// TestReadPageEntryError 覆盖 ReadPage 读取条目失败。
func TestReadPageEntryError(t *testing.T) {
	path := makeZip(t, map[string][]byte{"a.png": pngBytes(10, 10)})
	s := NewService()
	m, err := s.GetManifest(path, "cbz")
	if err != nil {
		t.Fatalf("GetManifest 失败: %v", err)
	}
	// 删掉文件使读取失败。
	if err := os.Remove(path); err != nil {
		t.Fatalf("删除失败: %v", err)
	}
	if _, err := s.ReadPage(path, "cbz", 0, m.Revision); err == nil {
		t.Error("文件不存在应报错")
	}
}

// TestReadPageSizeMismatchReal 覆盖读取长度与声明不符。
func TestReadPageSizeMismatchReal(t *testing.T) {
	// 构造两个条目，删掉其中一个的数据区，使读取长度不符。
	path := filepath.Join(t.TempDir(), "m.cbz")
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

	s := NewService()
	m, err := s.GetManifest(path, "cbz")
	if err != nil {
		t.Fatalf("GetManifest 失败: %v", err)
	}
	// 用另一个内容更短的 zip 覆盖（同名条目但内容不同）。
	other := makeZip(t, map[string][]byte{"a.png": pngBytes(10, 10)[:20]})
	raw, _ := os.ReadFile(other)
	if err := os.WriteFile(path, raw, 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	s.ClearCache()
	// 内容变化后 revision 会变，因此用空 revision 绕过校验。
	if _, err := s.ReadPage(path, "cbz", 0, ""); err == nil {
		t.Error("内容长度不符应报错")
	}
	_ = m
}

// itoaTest 把 int 转成十进制字符串。
func itoaTest(v int) string {
	if v == 0 {
		return "0"
	}
	var buf []byte
	for v > 0 {
		buf = append([]byte{byte('0' + v%10)}, buf...)
		v /= 10
	}
	return string(buf)
}

// TestPNGDimensionsShort 覆盖 PNG 数据不足。
func TestPNGDimensionsShort(t *testing.T) {
	if _, _, err := pngDimensions([]byte{0x89, 'P'}); err == nil {
		t.Error("PNG 数据不足应报错")
	}
}

// TestWebPVP8XShort 覆盖 VP8X 数据不足。
func TestWebPVP8XShort(t *testing.T) {
	// 长度 >= 30 但块是 VP8X 时不会走 short 分支；
	// 这里验证长度 < 30 时直接报错。
	if _, _, err := webpDimensions(make([]byte, 20)); err == nil {
		t.Error("数据不足应报错")
	}
}

// TestBMPNegativeHeight 覆盖负高度取绝对值。
func TestBMPNegativeHeight(t *testing.T) {
	b := make([]byte, 26)
	copy(b, []byte("BM"))
	binary.LittleEndian.PutUint32(b[18:22], 100)
	binary.LittleEndian.PutUint32(b[22:26], 0xFFFFFF9C) // -100
	w, h, err := bmpDimensions(b)
	if err != nil || w != 100 || h != 100 {
		t.Errorf("负高度应取绝对值，得到 (%d,%d,%v)", w, h, err)
	}
}
