package scan

import (
	"os"
	"path/filepath"
	"testing"
)

// TestImportMetadataDispatchByFormat 验证 importMetadata 的分发规则与
// Python scan.py:354-391 一致。
//
// 关键规则：
//   - txt/pdf 非结构化，强制用文件名 + 「佚名」；
//   - 漫画容器（cbz/zip/cbr/rar）与受管文档（djvu/uvz）不解析内嵌元数据；
//   - 其余格式解析失败时退回文件名。
func TestImportMetadataDispatchByFormat(t *testing.T) {
	svc := newImportService(t, importTestDB(t), importLibraryDB(t))
	dir := t.TempDir()

	cases := []struct {
		name      string
		format    string
		wantTitle string
	}{
		{"三体.txt", "txt", "三体"},
		{"三体.pdf", "pdf", "三体"},
		{"三体.cbz", "cbz", "三体"},
		{"三体.zip", "zip", "三体"},
		{"三体.cbr", "cbr", "三体"},
		{"三体.rar", "rar", "三体"},
		{"三体.djvu", "djvu", "三体"},
		{"三体.uvz", "uvz", "三体"},
		{"三体.mobi", "mobi", "三体"},
		{"三体.azw3", "azw3", "三体"},
		{"三体.docx", "docx", "三体"},
		{"三体.fb2", "fb2", "三体"},
	}
	for _, tc := range cases {
		t.Run(tc.format, func(t *testing.T) {
			// 内容不是合法电子书，解析必然失败，应退回文件名。
			p := writeBook(t, dir, tc.name, []byte("not a real book"))
			mi, gone := svc.importMetadata(p, tc.format)
			if gone {
				t.Fatal("文件存在不应返回 gone")
			}
			if mi.Title != tc.wantTitle {
				t.Errorf("title = %q, 期望 %q", mi.Title, tc.wantTitle)
			}
			if len(mi.Authors) == 0 {
				t.Error("作者不应为空，应回退到「佚名」")
			}
		})
	}
}

// TestImportMetadataTxtIgnoresEmbedded 验证 txt 即使内容像 EPUB 也强制用文件名。
//
// Python 对 txt/pdf 无条件覆盖 title/authors，Go 侧必须一致。
func TestImportMetadataTxtIgnoresEmbedded(t *testing.T) {
	svc := newImportService(t, importTestDB(t), importLibraryDB(t))
	dir := t.TempDir()

	// 写一个真实可解析的 EPUB，但扩展名是 .txt。
	epub := buildMinimalEPUB(t, "内嵌书名", "内嵌作者")
	p := filepath.Join(dir, "文件名书名.txt")
	if err := os.WriteFile(p, epub, 0o644); err != nil {
		t.Fatal(err)
	}

	mi, gone := svc.importMetadata(p, "txt")
	if gone {
		t.Fatal("文件存在不应返回 gone")
	}
	if mi.Title != "文件名书名" {
		t.Errorf("txt 应强制用文件名，得到 title = %q", mi.Title)
	}
	if len(mi.Authors) != 1 || mi.Authors[0] != "佚名" {
		t.Errorf("txt 应强制用「佚名」，得到 %v", mi.Authors)
	}
}

// TestImportMetadataEpubUsesEmbedded 验证 epub 走内嵌元数据解析。
func TestImportMetadataEpubUsesEmbedded(t *testing.T) {
	svc := newImportService(t, importTestDB(t), importLibraryDB(t))
	dir := t.TempDir()

	epub := buildMinimalEPUB(t, "内嵌书名", "内嵌作者")
	p := filepath.Join(dir, "文件名书名.epub")
	if err := os.WriteFile(p, epub, 0o644); err != nil {
		t.Fatal(err)
	}

	mi, gone := svc.importMetadata(p, "epub")
	if gone {
		t.Fatal("文件存在不应返回 gone")
	}
	if mi.Title != "内嵌书名" {
		t.Errorf("epub 应使用内嵌书名，得到 %q", mi.Title)
	}
	if len(mi.Authors) != 1 || mi.Authors[0] != "内嵌作者" {
		t.Errorf("epub 应使用内嵌作者，得到 %v", mi.Authors)
	}
}

// TestImportMetadataMOBIUsesEmbedded 验证 mobi 走 MOBI 解析器。
func TestImportMetadataMOBIUsesEmbedded(t *testing.T) {
	svc := newImportService(t, importTestDB(t), importLibraryDB(t))
	dir := t.TempDir()

	p := filepath.Join(dir, "文件名书名.mobi")
	if err := os.WriteFile(p, buildMinimalMOBI(t, "内嵌书名", "内嵌作者", "内嵌出版社"), 0o644); err != nil {
		t.Fatal(err)
	}

	mi, gone := svc.importMetadata(p, "mobi")
	if gone {
		t.Fatal("文件存在不应返回 gone")
	}
	if mi.Title != "内嵌书名" {
		t.Errorf("mobi 应使用内嵌书名，得到 %q", mi.Title)
	}
	if len(mi.Authors) != 1 || mi.Authors[0] != "内嵌作者" {
		t.Errorf("mobi 应使用内嵌作者，得到 %v", mi.Authors)
	}
	if mi.Publisher != "内嵌出版社" {
		t.Errorf("mobi 应使用内嵌出版社，得到 %q", mi.Publisher)
	}
}

// TestImportMetadataDOCXUsesEmbedded 验证 docx 走 DOCX 解析器。
func TestImportMetadataDOCXUsesEmbedded(t *testing.T) {
	svc := newImportService(t, importTestDB(t), importLibraryDB(t))
	dir := t.TempDir()

	p := filepath.Join(dir, "文件名书名.docx")
	if err := os.WriteFile(p, buildMinimalDOCX(t, "内嵌书名", "内嵌作者"), 0o644); err != nil {
		t.Fatal(err)
	}

	mi, gone := svc.importMetadata(p, "docx")
	if gone {
		t.Fatal("文件存在不应返回 gone")
	}
	if mi.Title != "内嵌书名" {
		t.Errorf("docx 应使用内嵌书名，得到 %q", mi.Title)
	}
	if len(mi.Authors) != 1 || mi.Authors[0] != "内嵌作者" {
		t.Errorf("docx 应使用内嵌作者，得到 %v", mi.Authors)
	}
}

// TestImportMetadataFB2UsesEmbedded 验证 fb2 走 FB2 解析器。
func TestImportMetadataFB2UsesEmbedded(t *testing.T) {
	svc := newImportService(t, importTestDB(t), importLibraryDB(t))
	dir := t.TempDir()

	p := filepath.Join(dir, "文件名书名.fb2")
	if err := os.WriteFile(p, buildMinimalFB2("内嵌书名", "内嵌作者"), 0o644); err != nil {
		t.Fatal(err)
	}

	mi, gone := svc.importMetadata(p, "fb2")
	if gone {
		t.Fatal("文件存在不应返回 gone")
	}
	if mi.Title != "内嵌书名" {
		t.Errorf("fb2 应使用内嵌书名，得到 %q", mi.Title)
	}
}

// TestImportMetadataHTMLZUsesEmbedded 验证 htmlz 走 HTMLZ 解析器。
func TestImportMetadataHTMLZUsesEmbedded(t *testing.T) {
	svc := newImportService(t, importTestDB(t), importLibraryDB(t))
	dir := t.TempDir()

	p := filepath.Join(dir, "文件名书名.htmlz")
	if err := os.WriteFile(p, buildMinimalHTMLZ(t, "内嵌书名", "内嵌作者"), 0o644); err != nil {
		t.Fatal(err)
	}

	mi, gone := svc.importMetadata(p, "htmlz")
	if gone {
		t.Fatal("文件存在不应返回 gone")
	}
	if mi.Title != "内嵌书名" {
		t.Errorf("htmlz 应使用内嵌书名，得到 %q", mi.Title)
	}
}

// TestImportMetadataAZW3UsesEmbedded 验证 azw3 与 mobi 共用解析器。
func TestImportMetadataAZW3UsesEmbedded(t *testing.T) {
	svc := newImportService(t, importTestDB(t), importLibraryDB(t))
	dir := t.TempDir()

	p := filepath.Join(dir, "文件名书名.azw3")
	if err := os.WriteFile(p, buildMinimalMOBI(t, "内嵌书名", "内嵌作者", ""), 0o644); err != nil {
		t.Fatal(err)
	}

	mi, gone := svc.importMetadata(p, "azw3")
	if gone {
		t.Fatal("文件存在不应返回 gone")
	}
	if mi.Title != "内嵌书名" {
		t.Errorf("azw3 应使用内嵌书名，得到 %q", mi.Title)
	}
}
