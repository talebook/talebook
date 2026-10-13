package docmeta

import (
	"archive/zip"
	"bytes"
	"testing"
)

// buildZip 把若干条目打包成 zip 字节。
func buildZip(t *testing.T, entries map[string]string) []byte {
	t.Helper()
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	for name, content := range entries {
		w, err := zw.Create(name)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := w.Write([]byte(content)); err != nil {
			t.Fatal(err)
		}
	}
	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

// TestExtractDOCX 验证 DOCX 的 core.xml 解析。
func TestExtractDOCX(t *testing.T) {
	core := `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties
    xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
    xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:title>三体</dc:title>
  <dc:creator>刘慈欣</dc:creator>
  <dc:subject>科幻</dc:subject>
  <dc:description>地球往事三部曲第一部</dc:description>
  <dc:language>zh-CN</dc:language>
  <dc:identifier>9787536692930</dc:identifier>
  <dc:date>2008-01-01</dc:date>
</cp:coreProperties>`
	data := buildZip(t, map[string]string{"docProps/core.xml": core})

	mi, err := ExtractDOCX(data)
	if err != nil {
		t.Fatalf("解析失败: %v", err)
	}
	if mi.Title != "三体" {
		t.Errorf("title = %q", mi.Title)
	}
	if len(mi.Authors) != 1 || mi.Authors[0] != "刘慈欣" {
		t.Errorf("authors = %v", mi.Authors)
	}
	if mi.Language != "zh-CN" {
		t.Errorf("language = %q", mi.Language)
	}
	if mi.ISBN != "9787536692930" {
		t.Errorf("isbn = %q", mi.ISBN)
	}
	if mi.Published != "2008-01-01" {
		t.Errorf("published = %q", mi.Published)
	}
	if len(mi.Tags) != 1 || mi.Tags[0] != "科幻" {
		t.Errorf("tags = %v", mi.Tags)
	}
	if mi.Description != "地球往事三部曲第一部" {
		t.Errorf("description = %q", mi.Description)
	}
}

// TestExtractDOCXMissingCore 验证缺少 core.xml 时报错。
func TestExtractDOCXMissingCore(t *testing.T) {
	data := buildZip(t, map[string]string{"word/document.xml": "<w:document/>"})
	if _, err := ExtractDOCX(data); err == nil {
		t.Error("缺少 core.xml 应报错")
	}
}

// TestExtractDOCXNotZip 验证非 zip 输入报错。
func TestExtractDOCXNotZip(t *testing.T) {
	if _, err := ExtractDOCX([]byte("not a zip")); err == nil {
		t.Error("非 zip 应报错")
	}
}

// TestExtractFB2 验证 FB2 的 title-info 解析。
func TestExtractFB2(t *testing.T) {
	fb2 := `<?xml version="1.0" encoding="UTF-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0">
  <description>
    <title-info>
      <genre>sf</genre>
      <author><first-name>刘</first-name><last-name>慈欣</last-name></author>
      <book-title>三体</book-title>
      <annotation>地球往事三部曲第一部</annotation>
      <lang>zh</lang>
    </title-info>
    <publish-info>
      <publisher>重庆出版社</publisher>
      <year>2008</year>
      <isbn>978-7-5366-9293-0</isbn>
    </publish-info>
  </description>
  <body><section><p>正文</p></section></body>
</FictionBook>`

	mi, err := ExtractFB2([]byte(fb2))
	if err != nil {
		t.Fatalf("解析失败: %v", err)
	}
	if mi.Title != "三体" {
		t.Errorf("title = %q", mi.Title)
	}
	if len(mi.Authors) != 1 || mi.Authors[0] != "刘 慈欣" {
		t.Errorf("authors = %v", mi.Authors)
	}
	if mi.Publisher != "重庆出版社" {
		t.Errorf("publisher = %q", mi.Publisher)
	}
	if mi.Published != "2008" {
		t.Errorf("published = %q", mi.Published)
	}
	if mi.Language != "zh" {
		t.Errorf("language = %q", mi.Language)
	}
	if mi.ISBN != "9787536692930" {
		t.Errorf("isbn = %q", mi.ISBN)
	}
	if len(mi.Tags) != 1 || mi.Tags[0] != "sf" {
		t.Errorf("tags = %v", mi.Tags)
	}
}

// TestExtractFB2Nickname 验证只有昵称时回退到昵称。
func TestExtractFB2Nickname(t *testing.T) {
	fb2 := `<FictionBook><description><title-info>
    <author><nickname>Anon</nickname></author>
    <book-title>无名书</book-title>
  </title-info></description></FictionBook>`

	mi, err := ExtractFB2([]byte(fb2))
	if err != nil {
		t.Fatalf("解析失败: %v", err)
	}
	if len(mi.Authors) != 1 || mi.Authors[0] != "Anon" {
		t.Errorf("authors = %v", mi.Authors)
	}
}

// TestExtractFB2NotFictionBook 验证根元素不对时报错。
func TestExtractFB2NotFictionBook(t *testing.T) {
	if _, err := ExtractFB2([]byte(`<Other><a/></Other>`)); err == nil {
		t.Error("根元素不是 FictionBook 应报错")
	}
}

// TestExtractFB2NoTitle 验证缺书名时报错。
func TestExtractFB2NoTitle(t *testing.T) {
	fb2 := `<FictionBook><description><title-info><lang>zh</lang></title-info></description></FictionBook>`
	if _, err := ExtractFB2([]byte(fb2)); err == nil {
		t.Error("缺书名应报错")
	}
}

// TestExtractHTMLZ 验证 HTMLZ 的 metadata.opf 解析。
func TestExtractHTMLZ(t *testing.T) {
	opf := `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>三体</dc:title>
    <dc:creator opf:role="aut">刘慈欣</dc:creator>
    <dc:publisher>重庆出版社</dc:publisher>
    <dc:language>zh</dc:language>
    <dc:date>2008-01-01T00:00:00+00:00</dc:date>
    <dc:subject>科幻</dc:subject>
    <dc:description>地球往事三部曲第一部</dc:description>
    <dc:identifier opf:scheme="ISBN">9787536692930</dc:identifier>
  </metadata>
</package>`
	data := buildZip(t, map[string]string{
		"metadata.opf": opf,
		"index.html":   "<html></html>",
	})

	mi, err := ExtractHTMLZ(data)
	if err != nil {
		t.Fatalf("解析失败: %v", err)
	}
	if mi.Title != "三体" {
		t.Errorf("title = %q", mi.Title)
	}
	if len(mi.Authors) != 1 || mi.Authors[0] != "刘慈欣" {
		t.Errorf("authors = %v", mi.Authors)
	}
	if mi.Publisher != "重庆出版社" {
		t.Errorf("publisher = %q", mi.Publisher)
	}
	if mi.ISBN != "9787536692930" {
		t.Errorf("isbn = %q", mi.ISBN)
	}
}

// TestExtractHTMLZMissingOPF 验证缺少 metadata.opf 时报错。
func TestExtractHTMLZMissingOPF(t *testing.T) {
	data := buildZip(t, map[string]string{"index.html": "<html></html>"})
	if _, err := ExtractHTMLZ(data); err == nil {
		t.Error("缺少 metadata.opf 应报错")
	}
}

// TestNormalizeISBN 验证 ISBN 归一化。
func TestNormalizeISBN(t *testing.T) {
	cases := map[string]string{
		"978-7-5366-9293-0": "9787536692930",
		"0-306-40615-2":     "0306406152",
		"12345":             "",
		"":                  "",
	}
	for in, want := range cases {
		if got := normalizeISBN(in); got != want {
			t.Errorf("normalizeISBN(%q) = %q, 期望 %q", in, got, want)
		}
	}
}

// TestCollapse 验证空白压缩。
func TestCollapse(t *testing.T) {
	if got := collapse("  三体\n\t 全集  "); got != "三体 全集" {
		t.Errorf("collapse = %q", got)
	}
}

// TestDedupe 验证去重与去空。
func TestDedupe(t *testing.T) {
	got := dedupe([]string{"a", "", "b", "a", "c"})
	want := []string{"a", "b", "c"}
	if len(got) != len(want) {
		t.Fatalf("dedupe = %v", got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("dedupe[%d] = %q, 期望 %q", i, got[i], want[i])
		}
	}
}
