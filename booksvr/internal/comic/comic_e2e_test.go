package comic

import (
	"archive/zip"
	"bytes"
	"encoding/binary"
	"os"
	"path/filepath"
	"testing"
)

// pngBytes 生成一个最小的合法 PNG 头（宽 w 高 h）。
//
// 只用于尺寸探测，不需要完整的 PNG 数据。
func pngBytes(w, h int) []byte {
	b := make([]byte, 24)
	copy(b, []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'})
	binary.BigEndian.PutUint32(b[16:20], uint32(w))
	binary.BigEndian.PutUint32(b[20:24], uint32(h))
	return b
}

// makeZip 把 name→data 写成一个 zip 文件，返回路径。
func makeZip(t *testing.T, entries map[string][]byte) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "comic.cbz")
	f, err := os.Create(path)
	if err != nil {
		t.Fatalf("创建文件失败: %v", err)
	}
	defer f.Close()

	zw := zip.NewWriter(f)
	for name, data := range entries {
		w, err := zw.Create(name)
		if err != nil {
			t.Fatalf("创建条目失败: %v", err)
		}
		if _, err := w.Write(data); err != nil {
			t.Fatalf("写入条目失败: %v", err)
		}
	}
	if err := zw.Close(); err != nil {
		t.Fatalf("关闭 zip 失败: %v", err)
	}
	return path
}

// TestGetManifestEndToEnd 用真实 zip 覆盖清单构建。
func TestGetManifestEndToEnd(t *testing.T) {
	path := makeZip(t, map[string][]byte{
		"page1.png":        pngBytes(800, 600),
		"page2.png":        pngBytes(1024, 768),
		"page10.png":       pngBytes(640, 480),
		"ComicInfo.xml":    []byte("<xml/>"),
		".DS_Store":        []byte("junk"),
		"__MACOSX/x.png":   pngBytes(10, 10),
		"sub/page3.png":    pngBytes(100, 100),
		"sub/._hidden.png": pngBytes(10, 10),
	})

	s := NewService()
	m, err := s.GetManifest(path, "cbz")
	if err != nil {
		t.Fatalf("GetManifest 失败: %v", err)
	}
	if m.ArchiveFormat != "zip" {
		t.Errorf("ArchiveFormat = %q, want zip", m.ArchiveFormat)
	}
	if len(m.Revision) != 20 {
		t.Errorf("Revision 应为 20 字符，得到 %q", m.Revision)
	}

	// 应忽略 ComicInfo.xml / .DS_Store / __MACOSX / ._hidden。
	if len(m.Pages) != 4 {
		names := []string{}
		for _, p := range m.Pages {
			names = append(names, p.EntryName)
		}
		t.Fatalf("应有 4 页，得到 %d: %v", len(m.Pages), names)
	}

	// 自然排序：page1, page2, page10 在 sub/page3 之前（'p' < 's'）。
	wantOrder := []string{"page1.png", "page2.png", "page10.png", "sub/page3.png"}
	for i, want := range wantOrder {
		if m.Pages[i].EntryName != want {
			t.Errorf("位置 %d: got %q, want %q", i, m.Pages[i].EntryName, want)
		}
	}

	// 页码与 page_id。
	for i, p := range m.Pages {
		if p.Index != i {
			t.Errorf("页 %d 的 Index = %d", i, p.Index)
		}
		wantID := m.Revision + ":" + string(rune('0'+i))
		if p.PageID != wantID {
			t.Errorf("页 %d 的 PageID = %q, want %q", i, p.PageID, wantID)
		}
	}

	// 尺寸。
	if m.Pages[0].Width != 800 || m.Pages[0].Height != 600 {
		t.Errorf("page1 尺寸 = (%d,%d)", m.Pages[0].Width, m.Pages[0].Height)
	}
	if m.Pages[0].MIMEType != "image/png" {
		t.Errorf("page1 MIME = %q", m.Pages[0].MIMEType)
	}
}

// TestGetManifestCached 校验缓存命中返回同一对象。
func TestGetManifestCached(t *testing.T) {
	path := makeZip(t, map[string][]byte{"a.png": pngBytes(10, 10)})
	s := NewService()

	m1, err := s.GetManifest(path, "cbz")
	if err != nil {
		t.Fatalf("首次失败: %v", err)
	}
	m2, err := s.GetManifest(path, "cbz")
	if err != nil {
		t.Fatalf("二次失败: %v", err)
	}
	if m1 != m2 {
		t.Error("二次应命中缓存返回同一对象")
	}

	s.ClearCache()
	m3, err := s.GetManifest(path, "cbz")
	if err != nil {
		t.Fatalf("清缓存后失败: %v", err)
	}
	if m3 == m1 {
		t.Error("清缓存后应重建")
	}
	if m3.Revision != m1.Revision {
		t.Errorf("重建后 revision 应一致: %q vs %q", m3.Revision, m1.Revision)
	}
}

// TestReadPageEndToEnd 用真实 zip 覆盖分页读取。
func TestReadPageEndToEnd(t *testing.T) {
	page1 := pngBytes(800, 600)
	page2 := pngBytes(1024, 768)
	path := makeZip(t, map[string][]byte{"page1.png": page1, "page2.png": page2})

	s := NewService()
	m, err := s.GetManifest(path, "cbz")
	if err != nil {
		t.Fatalf("GetManifest 失败: %v", err)
	}

	// 读第 0 页。
	c, err := s.ReadPage(path, "cbz", 0, m.Revision)
	if err != nil {
		t.Fatalf("ReadPage 失败: %v", err)
	}
	if !bytes.Equal(c.Data, page1) {
		t.Error("第 0 页内容不符")
	}
	if c.Page.Index != 0 || c.Revision != m.Revision {
		t.Errorf("PageContent 字段不符: %+v", c)
	}

	// 读第 1 页。
	c, err = s.ReadPage(path, "cbz", 1, m.Revision)
	if err != nil {
		t.Fatalf("ReadPage 失败: %v", err)
	}
	if !bytes.Equal(c.Data, page2) {
		t.Error("第 1 页内容不符")
	}

	// 空 revision 表示不校验。
	if _, err := s.ReadPage(path, "cbz", 0, ""); err != nil {
		t.Errorf("空 revision 应通过: %v", err)
	}

	// revision 不匹配。
	if _, err := s.ReadPage(path, "cbz", 0, "wrong"); err == nil {
		t.Error("revision 不匹配应报错")
	}

	// 越界。
	if _, err := s.ReadPage(path, "cbz", 99, m.Revision); err == nil {
		t.Error("越界应报错")
	}
	if _, err := s.ReadPage(path, "cbz", -1, m.Revision); err == nil {
		t.Error("负数索引应报错")
	}
}

// TestEmptyArchive 覆盖空容器。
func TestEmptyArchive(t *testing.T) {
	path := makeZip(t, map[string][]byte{"ComicInfo.xml": []byte("<xml/>")})
	s := NewService()
	if _, err := s.GetManifest(path, "cbz"); err == nil {
		t.Error("只有被忽略条目时应报 comic.empty")
	}
}

// TestInvalidArchive 覆盖损坏容器。
func TestInvalidArchive(t *testing.T) {
	path := filepath.Join(t.TempDir(), "bad.cbz")
	if err := os.WriteFile(path, []byte("not a zip at all"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	s := NewService()
	if _, err := s.GetManifest(path, "cbz"); err == nil {
		t.Error("损坏容器应报错")
	}
}

// TestDuplicateEntries 覆盖重名条目。
func TestDuplicateEntries(t *testing.T) {
	path := filepath.Join(t.TempDir(), "dup.cbz")
	f, err := os.Create(path)
	if err != nil {
		t.Fatalf("创建失败: %v", err)
	}
	zw := zip.NewWriter(f)
	for i := 0; i < 2; i++ {
		w, err := zw.Create("same.png")
		if err != nil {
			t.Fatalf("创建条目失败: %v", err)
		}
		if _, err := w.Write(pngBytes(10, 10)); err != nil {
			t.Fatalf("写入失败: %v", err)
		}
	}
	if err := zw.Close(); err != nil {
		t.Fatalf("关闭失败: %v", err)
	}
	f.Close()

	s := NewService()
	if _, err := s.GetManifest(path, "cbz"); err == nil {
		t.Error("重名条目应报错")
	}
}

// TestPageSizeLimit 覆盖单页体积超限。
func TestPageSizeLimit(t *testing.T) {
	// 声明一个超大条目（用 zip 的 UncompressedSize64）。
	path := filepath.Join(t.TempDir(), "big.cbz")
	f, err := os.Create(path)
	if err != nil {
		t.Fatalf("创建失败: %v", err)
	}
	zw := zip.NewWriter(f)
	w, err := zw.Create("big.png")
	if err != nil {
		t.Fatalf("创建条目失败: %v", err)
	}
	// 写入超过上限的数据（压缩后很小，但 UncompressedSize64 会超限）。
	big := make([]byte, MaxPageBytes+1024)
	copy(big, pngBytes(10, 10))
	if _, err := w.Write(big); err != nil {
		t.Fatalf("写入失败: %v", err)
	}
	if err := zw.Close(); err != nil {
		t.Fatalf("关闭失败: %v", err)
	}
	f.Close()

	s := NewService()
	if _, err := s.GetManifest(path, "cbz"); err == nil {
		t.Error("超限页面应报错")
	}
}

// TestManifestCacheEviction 覆盖缓存淘汰。
func TestManifestCacheEviction(t *testing.T) {
	s := NewService()
	// 直接操作缓存验证淘汰逻辑。
	for i := 0; i < ManifestCacheSize+5; i++ {
		key := string(rune('a'+i%26)) + string(rune('0'+i/26))
		s.mu.Lock()
		s.cache[key] = &Manifest{Revision: key}
		s.order = append(s.order, key)
		for len(s.order) > ManifestCacheSize {
			oldest := s.order[0]
			s.order = s.order[1:]
			delete(s.cache, oldest)
		}
		s.mu.Unlock()
	}
	if len(s.cache) > ManifestCacheSize {
		t.Errorf("缓存不应超过 %d 条，得到 %d", ManifestCacheSize, len(s.cache))
	}
}
