// Package docmeta 提供 DOCX / FB2 / HTMLZ 三种格式的元数据解析。
//
// 这三种格式不在 Python 侧 Calibre 的常规解析路径上（Calibre 的
// get_metadata 支持它们，但 Talebook 的格式常量原本不含），方案 5.8
// 要求新增支持：仅读取元数据与单向转 EPUB，不加入在线阅读格式。
//
// 解析策略与 Calibre 保持一致：
//   - DOCX：读 docProps/core.xml 的 Dublin Core 字段；
//   - FB2：读 <description><title-info> 的 XML 字段；
//   - HTMLZ：读归档内 metadata.opf（Calibre 生成的 OPF）。
package docmeta

import (
	"archive/zip"
	"bytes"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"regexp"
	"strings"
)

// ErrInvalidContainer 表示文件不是可识别的 DOCX/FB2/HTMLZ。
var ErrInvalidContainer = errors.New("Invalid document metadata container")

// Metadata 是解析出的元数据，字段与 epubmeta.Metadata 对齐。
type Metadata struct {
	// Title 是书名。
	Title string
	// Authors 是作者列表。
	Authors []string
	// Publisher 是出版社。
	Publisher string
	// Published 是出版日期。
	Published string
	// Language 是语言。
	Language string
	// Tags 是主题标签。
	Tags []string
	// Description 是内容简介（已压缩空白）。
	Description string
	// ISBN 是归一化后的 ISBN。
	ISBN string
}

// whitespaceRe 匹配连续空白。
var whitespaceRe = regexp.MustCompile(`\s+`)

// nonISBNChars 匹配 ISBN 中需要剔除的字符。
var nonISBNChars = regexp.MustCompile(`[^0-9Xx]`)

// ExtractDOCX 从 DOCX 归档里读取 docProps/core.xml 的元数据。
//
// DOCX 的 core.xml 使用 Dublin Core 命名空间：
// dc:title / dc:creator / dc:subject / dc:description / cp:lastModifiedBy。
func ExtractDOCX(data []byte) (*Metadata, error) {
	reader, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidContainer, err)
	}
	raw, err := readZipEntry(reader, "docProps/core.xml")
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidContainer, err)
	}

	mi := &Metadata{}
	dec := xml.NewDecoder(bytes.NewReader(raw))
	// 按本地名匹配，忽略命名空间前缀差异。
	var current string
	for {
		tok, err := dec.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("%w: %v", ErrInvalidContainer, err)
		}
		switch t := tok.(type) {
		case xml.StartElement:
			current = t.Name.Local
		case xml.EndElement:
			current = ""
		case xml.CharData:
			text := strings.TrimSpace(string(t))
			if text == "" {
				continue
			}
			applyCoreField(mi, current, text)
		}
	}
	if mi.Title == "" && len(mi.Authors) == 0 {
		return nil, ErrInvalidContainer
	}
	mi.normalize()
	return mi, nil
}

// applyCoreField 把 core.xml 的单个字段写入元数据。
func applyCoreField(mi *Metadata, field, text string) {
	switch field {
	case "title":
		if mi.Title == "" {
			mi.Title = text
		}
	case "creator":
		mi.Authors = append(mi.Authors, text)
	case "subject":
		mi.Tags = append(mi.Tags, text)
	case "description":
		if mi.Description == "" {
			mi.Description = text
		}
	case "language":
		if mi.Language == "" {
			mi.Language = text
		}
	case "identifier":
		if mi.ISBN == "" {
			mi.ISBN = normalizeISBN(text)
		}
	case "date":
		if mi.Published == "" {
			mi.Published = text
		}
	case "publisher":
		if mi.Publisher == "" {
			mi.Publisher = text
		}
	}
}

// fb2TitleInfo 对应 FB2 的 <description><title-info> 结构。
type fb2TitleInfo struct {
	BookTitle  string `xml:"book-title"`
	Annotation string `xml:"annotation"`
	Lang       string `xml:"lang"`
	Authors    []struct {
		First  string `xml:"first-name"`
		Middle string `xml:"middle-name"`
		Last   string `xml:"last-name"`
		Nick   string `xml:"nickname"`
	} `xml:"author"`
	Genres []string `xml:"genre"`
}

// fb2PublishInfo 对应 FB2 的 <description><publish-info> 结构。
type fb2PublishInfo struct {
	Publisher string `xml:"publisher"`
	Year      string `xml:"year"`
	ISBN      string `xml:"isbn"`
}

// fb2Document 是 FB2 文档的顶层结构。
type fb2Document struct {
	XMLName     xml.Name       `xml:"FictionBook"`
	TitleInfo   fb2TitleInfo   `xml:"description>title-info"`
	PublishInfo fb2PublishInfo `xml:"description>publish-info"`
}

// ExtractFB2 从 FB2（XML）文件里读取元数据。
func ExtractFB2(data []byte) (*Metadata, error) {
	var doc fb2Document
	if err := xml.Unmarshal(data, &doc); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidContainer, err)
	}
	if doc.XMLName.Local != "FictionBook" {
		return nil, ErrInvalidContainer
	}

	mi := &Metadata{
		Title:     strings.TrimSpace(doc.TitleInfo.BookTitle),
		Publisher: strings.TrimSpace(doc.PublishInfo.Publisher),
		Published: strings.TrimSpace(doc.PublishInfo.Year),
		Language:  strings.TrimSpace(doc.TitleInfo.Lang),
		ISBN:      normalizeISBN(doc.PublishInfo.ISBN),
	}
	for _, a := range doc.TitleInfo.Authors {
		name := joinNonEmpty(" ", a.First, a.Middle, a.Last)
		if name == "" {
			name = strings.TrimSpace(a.Nick)
		}
		if name != "" {
			mi.Authors = append(mi.Authors, name)
		}
	}
	for _, g := range doc.TitleInfo.Genres {
		if g = strings.TrimSpace(g); g != "" {
			mi.Tags = append(mi.Tags, g)
		}
	}
	mi.Description = strings.TrimSpace(doc.TitleInfo.Annotation)

	if mi.Title == "" {
		return nil, ErrInvalidContainer
	}
	mi.normalize()
	return mi, nil
}

// ExtractHTMLZ 从 HTMLZ 归档里读取 metadata.opf。
//
// HTMLZ 是 Calibre 的 HTML 打包格式，元数据放在归档根的 metadata.opf。
func ExtractHTMLZ(data []byte) (*Metadata, error) {
	reader, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidContainer, err)
	}
	raw, err := readZipEntry(reader, "metadata.opf")
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidContainer, err)
	}

	mi := &Metadata{}
	dec := xml.NewDecoder(bytes.NewReader(raw))
	var current string
	for {
		tok, err := dec.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("%w: %v", ErrInvalidContainer, err)
		}
		switch t := tok.(type) {
		case xml.StartElement:
			current = t.Name.Local
		case xml.EndElement:
			current = ""
		case xml.CharData:
			text := strings.TrimSpace(string(t))
			if text == "" {
				continue
			}
			applyOPFField(mi, current, text)
		}
	}
	if mi.Title == "" {
		return nil, ErrInvalidContainer
	}
	mi.normalize()
	return mi, nil
}

// applyOPFField 把 OPF 的单个字段写入元数据。
func applyOPFField(mi *Metadata, field, text string) {
	switch field {
	case "title":
		if mi.Title == "" {
			mi.Title = text
		}
	case "creator":
		mi.Authors = append(mi.Authors, text)
	case "publisher":
		if mi.Publisher == "" {
			mi.Publisher = text
		}
	case "language":
		if mi.Language == "" {
			mi.Language = text
		}
	case "date":
		if mi.Published == "" {
			mi.Published = text
		}
	case "subject":
		mi.Tags = append(mi.Tags, text)
	case "description":
		if mi.Description == "" {
			mi.Description = text
		}
	case "identifier":
		if mi.ISBN == "" {
			mi.ISBN = normalizeISBN(text)
		}
	}
}

// normalize 压缩空白并去重作者。
func (m *Metadata) normalize() {
	m.Title = collapse(m.Title)
	m.Publisher = collapse(m.Publisher)
	m.Published = collapse(m.Published)
	m.Language = collapse(m.Language)
	m.Description = collapse(m.Description)
	for i := range m.Authors {
		m.Authors[i] = collapse(m.Authors[i])
	}
	m.Authors = dedupe(m.Authors)
}

// collapse 把连续空白压成单个空格并去首尾空白。
func collapse(s string) string {
	return strings.TrimSpace(whitespaceRe.ReplaceAllString(s, " "))
}

// dedupe 去掉空串与重复项，保持原顺序。
func dedupe(in []string) []string {
	seen := map[string]bool{}
	out := make([]string, 0, len(in))
	for _, s := range in {
		if s == "" || seen[s] {
			continue
		}
		seen[s] = true
		out = append(out, s)
	}
	return out
}

// joinNonEmpty 用 sep 连接非空片段。
func joinNonEmpty(sep string, parts ...string) string {
	kept := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			kept = append(kept, p)
		}
	}
	return strings.Join(kept, sep)
}

// normalizeISBN 只保留数字与 X，长度不足则返回空串。
func normalizeISBN(s string) string {
	clean := nonISBNChars.ReplaceAllString(s, "")
	if len(clean) != 10 && len(clean) != 13 {
		return ""
	}
	return strings.ToUpper(clean)
}

// readZipEntry 读取归档里指定名字的条目（大小写不敏感）。
func readZipEntry(reader *zip.Reader, name string) ([]byte, error) {
	for _, f := range reader.File {
		if !strings.EqualFold(f.Name, name) {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			return nil, err
		}
		defer rc.Close()
		return io.ReadAll(rc)
	}
	return nil, fmt.Errorf("归档内缺少 %s", name)
}
