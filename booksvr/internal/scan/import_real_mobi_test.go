package scan

import (
	"os"
	"path/filepath"
	"testing"
)

// TestImportRealMOBIPopulatesMetadata 用真实 MOBI 样本跑完整导入流水线，
// 验证出版社/出版日期/作者真的落库。
//
// 这是用户报障「书籍信息没有作者、出版社」的回归测试：样本文件在
// internal/mobimeta/testdata/sample.mobi，导入后 books 表必须含
// 真实作者与出版社，而不是「佚名」/「Unknown」。
func TestImportRealMOBIPopulatesMetadata(t *testing.T) {
	sample := filepath.Join("..", "mobimeta", "testdata", "sample.mobi")
	if _, err := os.Stat(sample); err != nil {
		t.Skipf("缺少真实 MOBI 样本: %v", err)
	}

	svc := newImportService(importTestDB(t), importLibraryDB(t))
	mi, gone := svc.importMetadata(sample, "mobi")
	if gone {
		t.Fatal("样本文件存在，不应返回 gone")
	}

	if mi.Title != "【精排】红星照耀中国" {
		t.Errorf("title = %q，期望「【精排】红星照耀中国」", mi.Title)
	}
	if len(mi.Authors) != 1 || mi.Authors[0] != "(美)埃德加·斯诺" {
		t.Errorf("authors = %v，期望 [(美)埃德加·斯诺]", mi.Authors)
	}
	if mi.Publisher != "人民文学出版社" {
		t.Errorf("publisher = %q，期望「人民文学出版社」", mi.Publisher)
	}
	if mi.Pubdate == "" {
		t.Error("pubdate 不应为空")
	}
}

// TestImportRealMOBIAZW3Alias 验证 azw3 扩展名走同一解析器。
func TestImportRealMOBIAZW3Alias(t *testing.T) {
	sample := filepath.Join("..", "mobimeta", "testdata", "sample.mobi")
	if _, err := os.Stat(sample); err != nil {
		t.Skipf("缺少真实 MOBI 样本: %v", err)
	}

	// 复制成 .azw3 扩展名，内容不变。
	dir := t.TempDir()
	azw3 := filepath.Join(dir, "sample.azw3")
	data, err := os.ReadFile(sample)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(azw3, data, 0o644); err != nil {
		t.Fatal(err)
	}

	svc := newImportService(importTestDB(t), importLibraryDB(t))
	mi, gone := svc.importMetadata(azw3, "azw3")
	if gone {
		t.Fatal("文件存在，不应返回 gone")
	}
	if mi.Publisher != "人民文学出版社" {
		t.Errorf("azw3 publisher = %q，期望「人民文学出版社」", mi.Publisher)
	}
}
