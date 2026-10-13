package scan

import (
	"archive/zip"
	"bytes"
	"encoding/binary"
	"testing"
)

// buildMinimalEPUB 构造一个只含元数据的最小 EPUB，用于验证内嵌元数据解析。
func buildMinimalEPUB(t *testing.T, title, author string) []byte {
	t.Helper()
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)

	// mimetype 必须是第一个条目且不压缩。
	mw, err := zw.CreateHeader(&zip.FileHeader{Name: "mimetype", Method: zip.Store})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := mw.Write([]byte("application/epub+zip")); err != nil {
		t.Fatal(err)
	}

	container := `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`
	cw, err := zw.Create("META-INF/container.xml")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := cw.Write([]byte(container)); err != nil {
		t.Fatal(err)
	}

	opf := `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>` + title + `</dc:title>
    <dc:creator>` + author + `</dc:creator>
    <dc:language>zh</dc:language>
    <dc:identifier id="bookid">urn:uuid:test-book</dc:identifier>
  </metadata>
  <manifest><item id="c1" href="c1.html" media-type="application/xhtml+xml"/></manifest>
  <spine><itemref idref="c1"/></spine>
</package>`
	ow, err := zw.Create("content.opf")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := ow.Write([]byte(opf)); err != nil {
		t.Fatal(err)
	}

	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

// buildMinimalMOBI 构造一个含 EXTH 元数据的最小 MOBI 文件。
//
// 结构：PalmDB 头(78) + 记录索引(8*2) + 记录0(PalmDOC 16 + MOBI 头 + EXTH)。
func buildMinimalMOBI(t *testing.T, title, author, publisher string) []byte {
	t.Helper()

	// 组装 EXTH 记录。
	type exthRec struct {
		typ uint32
		val string
	}
	recs := []exthRec{{503, title}}
	if author != "" {
		recs = append(recs, exthRec{100, author})
	}
	if publisher != "" {
		recs = append(recs, exthRec{101, publisher})
	}

	var body bytes.Buffer
	for _, r := range recs {
		payload := []byte(r.val)
		var rec bytes.Buffer
		_ = binary.Write(&rec, binary.BigEndian, r.typ)
		_ = binary.Write(&rec, binary.BigEndian, uint32(8+len(payload)))
		rec.Write(payload)
		body.Write(rec.Bytes())
	}

	// EXTH 头：magic(4) + 总长度(4) + 记录数(4) = 12 字节。
	exth := make([]byte, 12)
	copy(exth[0:4], "EXTH")
	binary.BigEndian.PutUint32(exth[4:8], uint32(12+body.Len()))
	binary.BigEndian.PutUint32(exth[8:12], uint32(len(recs)))
	exth = append(exth, body.Bytes()...)

	// MOBI 头：264 字节，魔数 + 头长度 + 类型 + 编码。
	mobi := make([]byte, 264)
	copy(mobi[0:4], "MOBI")
	binary.BigEndian.PutUint32(mobi[4:8], 264)
	binary.BigEndian.PutUint32(mobi[8:12], 2)      // book type
	binary.BigEndian.PutUint32(mobi[12:16], 65001) // UTF-8

	// PalmDOC 头 16 字节。
	palmdoc := make([]byte, 16)
	binary.BigEndian.PutUint16(palmdoc[0:2], 1) // 无压缩
	binary.BigEndian.PutUint16(palmdoc[12:14], 0)

	rec0 := bytes.Join([][]byte{palmdoc, mobi, exth}, nil)

	// PalmDB 头 78 字节 + 2 条记录索引（每条 8 字节）。
	header := make([]byte, 78)
	copy(header[0:32], "TestBook")
	binary.BigEndian.PutUint16(header[32:34], 0) // attributes
	binary.BigEndian.PutUint16(header[34:36], 0) // version
	binary.BigEndian.PutUint16(header[76:78], 2) // 记录数

	indexEnd := 78 + 8*2
	rec0Off := indexEnd
	rec1Off := rec0Off + len(rec0)

	index := make([]byte, 16)
	binary.BigEndian.PutUint32(index[0:4], uint32(rec0Off))
	binary.BigEndian.PutUint32(index[4:8], 0) // attributes+uid
	binary.BigEndian.PutUint32(index[8:12], uint32(rec1Off))
	binary.BigEndian.PutUint32(index[12:16], 0)

	out := bytes.Join([][]byte{header, index, rec0, []byte("text")}, nil)
	return out
}

// buildMinimalDOCX 构造一个只含 docProps/core.xml 的最小 DOCX。
func buildMinimalDOCX(t *testing.T, title, author string) []byte {
	t.Helper()
	core := `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties
    xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
    xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:title>` + title + `</dc:title>
  <dc:creator>` + author + `</dc:creator>
</cp:coreProperties>`
	return zipEntries(t, map[string]string{
		"[Content_Types].xml": `<?xml version="1.0"?><Types/>`,
		"docProps/core.xml":   core,
		"word/document.xml":   `<?xml version="1.0"?><w:document/>`,
	})
}

// buildMinimalFB2 构造一个最小 FB2（纯 XML）。
func buildMinimalFB2(title, author string) []byte {
	return []byte(`<?xml version="1.0" encoding="UTF-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0">
  <description><title-info>
    <author><first-name>` + author + `</first-name></author>
    <book-title>` + title + `</book-title>
    <lang>zh</lang>
  </title-info></description>
  <body><section><p>正文</p></section></body>
</FictionBook>`)
}

// buildMinimalHTMLZ 构造一个含 metadata.opf 的最小 HTMLZ。
func buildMinimalHTMLZ(t *testing.T, title, author string) []byte {
	t.Helper()
	opf := `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>` + title + `</dc:title>
    <dc:creator>` + author + `</dc:creator>
    <dc:language>zh</dc:language>
  </metadata>
</package>`
	return zipEntries(t, map[string]string{
		"metadata.opf": opf,
		"index.html":   "<html></html>",
	})
}

// zipEntries 把若干条目打包成 zip 字节。
func zipEntries(t *testing.T, entries map[string]string) []byte {
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
