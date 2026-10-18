package epubmeta

import (
	"archive/zip"
	"bytes"
	"errors"
	"strings"
	"testing"
)

func TestMetadataCoverCaseFallback(t *testing.T) {
	var buf bytes.Buffer
	w := zip.NewWriter(&buf)
	writeEntry(t, w, "META-INF/container.xml", `<container><rootfiles><rootfile full-path="ops/book.opf"/></rootfiles></container>`)
	writeEntry(t, w, "OPS/book.opf", `<package><metadata><title>Compatibility</title></metadata><manifest><item id="cover" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/></manifest></package>`)
	writeEntry(t, w, "OPS/Cover.jpg", "cover bytes")
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
	mi, err := Extract(buf.Bytes())
	if err != nil || mi.Title != "Compatibility" {
		t.Fatalf("%+v %v", mi, err)
	}
	cover, ok := Cover(buf.Bytes())
	if !ok || string(cover) != "cover bytes" {
		t.Fatalf("cover=%q ok=%v", cover, ok)
	}
}

// makeEpub 构造一个含 container.xml 与包文档的 EPUB 归档。
func makeEpub(t *testing.T, opfPath, opfBody string) []byte {
	t.Helper()
	var buf bytes.Buffer
	w := zip.NewWriter(&buf)

	container := `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="` + opfPath + `" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
	writeEntry(t, w, "META-INF/container.xml", container)
	writeEntry(t, w, opfPath, opfBody)

	if err := w.Close(); err != nil {
		t.Fatalf("关闭归档失败: %v", err)
	}
	return buf.Bytes()
}

// writeEntry 向归档写入一个条目。
func writeEntry(t *testing.T, w *zip.Writer, name, body string) {
	t.Helper()
	f, err := w.Create(name)
	if err != nil {
		t.Fatalf("创建条目失败: %v", err)
	}
	if _, err := f.Write([]byte(body)); err != nil {
		t.Fatalf("写入条目失败: %v", err)
	}
}

// fullOPF 是一份含全部 Dublin Core 字段的包文档。
const fullOPF = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>三体</dc:title>
    <dc:creator>刘慈欣</dc:creator>
    <dc:creator>另一位作者</dc:creator>
    <dc:publisher>重庆出版社</dc:publisher>
    <dc:date>2008-01-01</dc:date>
    <dc:language>zh-CN</dc:language>
    <dc:subject>科幻</dc:subject>
    <dc:subject>中国文学</dc:subject>
    <dc:description>  一部   宏大的
      科幻小说  </dc:description>
    <dc:identifier id="bookid">urn:isbn:9787536692930</dc:identifier>
  </metadata>
</package>`

// TestExtractFullMetadata 覆盖完整元数据解析。
func TestExtractFullMetadata(t *testing.T) {
	data := makeEpub(t, "OEBPS/content.opf", fullOPF)
	got, err := Extract(data)
	if err != nil {
		t.Fatalf("Extract: %v", err)
	}

	if got.Title != "三体" {
		t.Errorf("title = %q", got.Title)
	}
	if len(got.Authors) != 2 || got.Authors[0] != "刘慈欣" || got.Authors[1] != "另一位作者" {
		t.Errorf("authors = %v", got.Authors)
	}
	if got.Publisher != "重庆出版社" {
		t.Errorf("publisher = %q", got.Publisher)
	}
	if got.Published != "2008-01-01" {
		t.Errorf("published = %q", got.Published)
	}
	if got.Language != "zh-CN" {
		t.Errorf("language = %q", got.Language)
	}
	if len(got.Tags) != 2 || got.Tags[0] != "科幻" {
		t.Errorf("tags = %v", got.Tags)
	}
	if got.Description != "一部 宏大的 科幻小说" {
		t.Errorf("description = %q", got.Description)
	}
	if got.ISBN != "9787536692930" {
		t.Errorf("isbn = %q", got.ISBN)
	}
}

// TestExtractISBNVariants 覆盖 ISBN 归一化与匹配。
func TestExtractISBNVariants(t *testing.T) {
	cases := []struct {
		name string
		raw  string
		want string
	}{
		{"带连字符的13位", "978-7-5366-9293-0", "9787536692930"},
		{"带urn前缀", "urn:isbn:9787536692930", "9787536692930"},
		{"10位含X", "0-306-40615-X", "030640615X"},
		{"10位小写x", "030640615x", "030640615x"},
		{"非ISBN", "not-an-isbn", ""},
		{"空", "", ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			opf := `<?xml version="1.0"?><package xmlns:dc="http://purl.org/dc/elements/1.1/">
				<metadata><dc:identifier>` + tc.raw + `</dc:identifier></metadata></package>`
			got, err := Extract(makeEpub(t, "content.opf", opf))
			if err != nil {
				t.Fatalf("Extract: %v", err)
			}
			if got.ISBN != tc.want {
				t.Errorf("isbn = %q，期望 %q", got.ISBN, tc.want)
			}
		})
	}
}

// TestExtractPicksFirstValidISBN 覆盖跳过无效标识符取第一个有效 ISBN。
func TestExtractPicksFirstValidISBN(t *testing.T) {
	opf := `<?xml version="1.0"?><package xmlns:dc="http://purl.org/dc/elements/1.1/">
		<metadata>
			<dc:identifier>urn:uuid:12345678-1234-1234-1234-123456789012</dc:identifier>
			<dc:identifier>9787536692930</dc:identifier>
			<dc:identifier>0306406152</dc:identifier>
		</metadata></package>`
	got, err := Extract(makeEpub(t, "content.opf", opf))
	if err != nil {
		t.Fatalf("Extract: %v", err)
	}
	if got.ISBN != "9787536692930" {
		t.Errorf("isbn = %q，期望第一个有效值", got.ISBN)
	}
}

// TestExtractEmptyFields 覆盖缺失字段回落为空。
func TestExtractEmptyFields(t *testing.T) {
	opf := `<?xml version="1.0"?><package><metadata></metadata></package>`
	got, err := Extract(makeEpub(t, "content.opf", opf))
	if err != nil {
		t.Fatalf("Extract: %v", err)
	}
	if got.Title != "" || got.Publisher != "" || got.Published != "" ||
		got.Language != "" || got.Description != "" || got.ISBN != "" {
		t.Errorf("缺失字段应为空: %+v", got)
	}
	if len(got.Authors) != 0 || len(got.Tags) != 0 {
		t.Errorf("列表应为空: authors=%v tags=%v", got.Authors, got.Tags)
	}
}

// TestExtractSkipsBlankText 覆盖空白文本被跳过。
func TestExtractSkipsBlankText(t *testing.T) {
	opf := `<?xml version="1.0"?><package xmlns:dc="http://purl.org/dc/elements/1.1/">
		<metadata>
			<dc:title>   </dc:title>
			<dc:title>真书名</dc:title>
			<dc:creator>  </dc:creator>
			<dc:creator>作者</dc:creator>
		</metadata></package>`
	got, err := Extract(makeEpub(t, "content.opf", opf))
	if err != nil {
		t.Fatalf("Extract: %v", err)
	}
	if got.Title != "真书名" {
		t.Errorf("title = %q，应跳过空白项", got.Title)
	}
	if len(got.Authors) != 1 || got.Authors[0] != "作者" {
		t.Errorf("authors = %v", got.Authors)
	}
}

// TestExtractDescriptionTruncated 覆盖 description 截断到 500 字符。
func TestExtractDescriptionTruncated(t *testing.T) {
	long := strings.Repeat("字", 800)
	opf := `<?xml version="1.0"?><package xmlns:dc="http://purl.org/dc/elements/1.1/">
		<metadata><dc:description>` + long + `</dc:description></metadata></package>`
	got, err := Extract(makeEpub(t, "content.opf", opf))
	if err != nil {
		t.Fatalf("Extract: %v", err)
	}
	if len(got.Description) != SummaryLimit {
		t.Errorf("description 长度 = %d，期望 %d", len(got.Description), SummaryLimit)
	}
}

// TestExtractDescriptionCollapsesWhitespace 覆盖空白压缩。
func TestExtractDescriptionCollapsesWhitespace(t *testing.T) {
	opf := "<?xml version=\"1.0\"?><package xmlns:dc=\"http://purl.org/dc/elements/1.1/\">" +
		"<metadata><dc:description>\n\t多行\n\t  文本 \n</dc:description></metadata></package>"
	got, err := Extract(makeEpub(t, "content.opf", opf))
	if err != nil {
		t.Fatalf("Extract: %v", err)
	}
	if got.Description != "多行 文本" {
		t.Errorf("description = %q", got.Description)
	}
}

// TestExtractNestedRootfile 覆盖 rootfile 位于嵌套节点内。
func TestExtractNestedRootfile(t *testing.T) {
	data := makeEpub(t, "OEBPS/content.opf", fullOPF)
	got, err := Extract(data)
	if err != nil {
		t.Fatalf("Extract: %v", err)
	}
	if got.Title != "三体" {
		t.Errorf("title = %q", got.Title)
	}
}

// TestExtractInvalidZip 覆盖非 zip 输入。
func TestExtractInvalidZip(t *testing.T) {
	_, err := Extract([]byte("not a zip"))
	if !errors.Is(err, ErrInvalidContainer) {
		t.Errorf("err = %v，期望 ErrInvalidContainer", err)
	}
}

// TestExtractMissingContainer 覆盖缺少 container.xml。
func TestExtractMissingContainer(t *testing.T) {
	var buf bytes.Buffer
	w := zip.NewWriter(&buf)
	writeEntry(t, w, "other.txt", "x")
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
	_, err := Extract(buf.Bytes())
	if !errors.Is(err, ErrInvalidContainer) {
		t.Errorf("err = %v，期望 ErrInvalidContainer", err)
	}
}

// TestExtractInvalidContainerXML 覆盖 container.xml 非法。
func TestExtractInvalidContainerXML(t *testing.T) {
	var buf bytes.Buffer
	w := zip.NewWriter(&buf)
	writeEntry(t, w, "META-INF/container.xml", "<container><unclosed>")
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
	_, err := Extract(buf.Bytes())
	if !errors.Is(err, ErrInvalidContainer) {
		t.Errorf("err = %v，期望 ErrInvalidContainer", err)
	}
}

// TestExtractNoRootfile 覆盖容器无 rootfile。
func TestExtractNoRootfile(t *testing.T) {
	var buf bytes.Buffer
	w := zip.NewWriter(&buf)
	writeEntry(t, w, "META-INF/container.xml", `<?xml version="1.0"?><container></container>`)
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
	_, err := Extract(buf.Bytes())
	if !errors.Is(err, ErrNoPackageDocument) {
		t.Errorf("err = %v，期望 ErrNoPackageDocument", err)
	}
}

// TestExtractRootfileWithoutFullPath 覆盖 rootfile 缺 full-path。
func TestExtractRootfileWithoutFullPath(t *testing.T) {
	var buf bytes.Buffer
	w := zip.NewWriter(&buf)
	writeEntry(t, w, "META-INF/container.xml",
		`<?xml version="1.0"?><container><rootfiles><rootfile/></rootfiles></container>`)
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
	_, err := Extract(buf.Bytes())
	if !errors.Is(err, ErrNoPackageDocument) {
		t.Errorf("err = %v，期望 ErrNoPackageDocument", err)
	}
}

// TestExtractMissingPackageDocument 覆盖包文档条目不存在。
func TestExtractMissingPackageDocument(t *testing.T) {
	var buf bytes.Buffer
	w := zip.NewWriter(&buf)
	writeEntry(t, w, "META-INF/container.xml",
		`<?xml version="1.0"?><container><rootfiles><rootfile full-path="missing.opf"/></rootfiles></container>`)
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
	_, err := Extract(buf.Bytes())
	if !errors.Is(err, ErrInvalidContainer) {
		t.Errorf("err = %v，期望 ErrInvalidContainer", err)
	}
}

// TestExtractInvalidPackageXML 覆盖包文档 XML 非法。
func TestExtractInvalidPackageXML(t *testing.T) {
	data := makeEpub(t, "content.opf", "<package><unclosed>")
	_, err := Extract(data)
	if !errors.Is(err, ErrInvalidContainer) {
		t.Errorf("err = %v，期望 ErrInvalidContainer", err)
	}
}

// TestExtractIgnoresNamespacePrefix 覆盖命名空间前缀不影响匹配。
func TestExtractIgnoresNamespacePrefix(t *testing.T) {
	opf := `<?xml version="1.0"?><opf:package xmlns:opf="http://www.idpf.org/2007/opf"
		xmlns:dc="http://purl.org/dc/elements/1.1/">
		<opf:metadata><dc:title>前缀书名</dc:title></opf:metadata></opf:package>`
	got, err := Extract(makeEpub(t, "content.opf", opf))
	if err != nil {
		t.Fatalf("Extract: %v", err)
	}
	if got.Title != "前缀书名" {
		t.Errorf("title = %q", got.Title)
	}
}

// TestSummaryHelper 覆盖 summary 辅助函数。
func TestSummaryHelper(t *testing.T) {
	if got := summary("  a   b  "); got != "a b" {
		t.Errorf("summary = %q", got)
	}
	if got := summary(""); got != "" {
		t.Errorf("summary(\"\") = %q", got)
	}
	long := strings.Repeat("x", SummaryLimit+10)
	if len(summary(long)) != SummaryLimit {
		t.Errorf("summary 未截断")
	}
}

// TestFirstHelper 覆盖 first 辅助函数。
func TestFirstHelper(t *testing.T) {
	if got := first(nil); got != "" {
		t.Errorf("first(nil) = %q", got)
	}
	if got := first([]string{"a", "b"}); got != "a" {
		t.Errorf("first = %q", got)
	}
}

// TestXMLNodeHelpers 覆盖节点辅助方法。
func TestXMLNodeHelpers(t *testing.T) {
	node, err := parseXML([]byte(`<a x="1"><b>hi</b><b>there</b></a>`))
	if err != nil {
		t.Fatalf("parseXML: %v", err)
	}
	if node.attr("x") != "1" {
		t.Errorf("attr = %q", node.attr("x"))
	}
	if node.attr("missing") != "" {
		t.Errorf("缺失属性应为空")
	}
	if node.text() != "hithere" {
		t.Errorf("text = %q", node.text())
	}
	if len(findAll(node, "b")) != 2 {
		t.Errorf("findAll(b) = %d", len(findAll(node, "b")))
	}
	if findFirst(node, "b") == nil {
		t.Error("findFirst(b) 不应为 nil")
	}
	if findFirst(node, "zzz") != nil {
		t.Error("findFirst(zzz) 应为 nil")
	}
}

// TestParseXMLEmpty 覆盖无根元素的 XML。
func TestParseXMLEmpty(t *testing.T) {
	if _, err := parseXML([]byte("")); err == nil {
		t.Error("空 XML 应报错")
	}
}
