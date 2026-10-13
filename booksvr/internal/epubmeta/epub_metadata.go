// Package epubmeta 移植 webserver/services/epub_metadata.py。
//
// 职责：从 EPUB 归档里读取 Dublin Core 元数据，不依赖外部 I/O。
// 这是导入基础能力，不参与插件生命周期。
package epubmeta

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

// SummaryLimit 是 description 的截断长度。
const SummaryLimit = 500

// ErrInvalidContainer 表示 EPUB 容器或包文档无法解析。
var ErrInvalidContainer = errors.New("Invalid EPUB metadata container")

// ErrNoPackageDocument 表示容器里没有指向包文档的 rootfile。
var ErrNoPackageDocument = errors.New("EPUB container has no package document")

// Metadata 是解析出的 Dublin Core 元数据。
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
	// Description 是内容简介（已压缩空白并截断）。
	Description string
	// ISBN 是归一化后的 ISBN（仅保留数字与 X）。
	ISBN string
}

// isbnRe 匹配 10 位或 13 位 ISBN（允许前缀 978/979）。
var isbnRe = regexp.MustCompile(`^(?:97[89])?\d{9}[\dXx]$`)

// nonISBNChars 匹配 ISBN 中需要剔除的字符。
var nonISBNChars = regexp.MustCompile(`[^0-9Xx]`)

// whitespaceRe 匹配连续空白。
var whitespaceRe = regexp.MustCompile(`\s+`)

// Extract 从 EPUB 归档字节里读取 Dublin Core 元数据。
//
// 对应 Python 的 extract_epub_metadata。
func Extract(archiveBytes []byte) (*Metadata, error) {
	reader, err := zip.NewReader(bytes.NewReader(archiveBytes), int64(len(archiveBytes)))
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidContainer, err)
	}

	containerData, err := readEntry(reader, "META-INF/container.xml")
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidContainer, err)
	}
	container, err := parseXML(containerData)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidContainer, err)
	}

	rootfile := findFirst(container, "rootfile")
	if rootfile == nil || rootfile.attr("full-path") == "" {
		return nil, ErrNoPackageDocument
	}

	packageData, err := readEntry(reader, rootfile.attr("full-path"))
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidContainer, err)
	}
	pkg, err := parseXML(packageData)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidContainer, err)
	}

	texts := func(name string) []string {
		var out []string
		for _, node := range findAll(pkg, name) {
			value := strings.TrimSpace(node.text())
			if value != "" {
				out = append(out, value)
			}
		}
		return out
	}

	identifiers := texts("identifier")
	isbn := ""
	for _, value := range identifiers {
		cleaned := nonISBNChars.ReplaceAllString(value, "")
		if isbnRe.MatchString(cleaned) {
			isbn = cleaned
			break
		}
	}

	return &Metadata{
		Title:       first(texts("title")),
		Authors:     texts("creator"),
		Publisher:   first(texts("publisher")),
		Published:   first(texts("date")),
		Language:    first(texts("language")),
		Tags:        texts("subject"),
		Description: summary(first(texts("description"))),
		ISBN:        nonISBNChars.ReplaceAllString(isbn, ""),
	}, nil
}

// first 返回列表首项；空列表返回空串。
func first(values []string) string {
	if len(values) == 0 {
		return ""
	}
	return values[0]
}

// summary 压缩空白并截断到 SummaryLimit。
func summary(value string) string {
	collapsed := whitespaceRe.ReplaceAllString(value, " ")
	collapsed = strings.TrimSpace(collapsed)
	if len(collapsed) > SummaryLimit {
		return collapsed[:SummaryLimit]
	}
	return collapsed
}

// readEntry 读取归档内的指定条目。
func readEntry(reader *zip.Reader, name string) ([]byte, error) {
	for _, f := range reader.File {
		if f.Name != name {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			return nil, err
		}
		defer func() { _ = rc.Close() }()
		return io.ReadAll(rc)
	}
	return nil, fmt.Errorf("zip: 条目不存在: %s", name)
}

// xmlNode 是解析后的 XML 节点。
type xmlNode struct {
	// XMLName 是元素名。
	XMLName xml.Name
	// Attrs 是属性列表。
	Attrs []xml.Attr
	// Children 是子节点。
	Children []*xmlNode
	// Text 是本节点的直接文本。
	Text string
}

// parseXML 解析 XML 文本。
func parseXML(data []byte) (*xmlNode, error) {
	dec := xml.NewDecoder(bytes.NewReader(data))
	for {
		token, err := dec.Token()
		if err == io.EOF {
			return nil, errors.New("xml: 无根元素")
		}
		if err != nil {
			return nil, err
		}
		if start, ok := token.(xml.StartElement); ok {
			return decodeNode(dec, start)
		}
	}
}

// decodeNode 从起始元素递归解析节点。
func decodeNode(dec *xml.Decoder, start xml.StartElement) (*xmlNode, error) {
	node := &xmlNode{XMLName: start.Name, Attrs: start.Attr}
	for {
		token, err := dec.Token()
		if err != nil {
			return nil, err
		}
		switch t := token.(type) {
		case xml.StartElement:
			child, err := decodeNode(dec, t)
			if err != nil {
				return nil, err
			}
			node.Children = append(node.Children, child)
		case xml.CharData:
			node.Text += string(t)
		case xml.EndElement:
			return node, nil
		}
	}
}

// attr 读取属性值（按本地名匹配，忽略命名空间前缀）。
func (n *xmlNode) attr(name string) string {
	for _, a := range n.Attrs {
		if a.Name.Local == name {
			return a.Value
		}
	}
	return ""
}

// text 返回本节点及其后代的全部文本。
func (n *xmlNode) text() string {
	out := n.Text
	for _, child := range n.Children {
		out += child.text()
	}
	return out
}

// findFirst 深度优先查找第一个本地名匹配的节点。
func findFirst(root *xmlNode, local string) *xmlNode {
	if root.XMLName.Local == local {
		return root
	}
	for _, child := range root.Children {
		if found := findFirst(child, local); found != nil {
			return found
		}
	}
	return nil
}

// findAll 深度优先查找所有本地名匹配的节点。
func findAll(root *xmlNode, local string) []*xmlNode {
	var out []*xmlNode
	var walk func(*xmlNode)
	walk = func(n *xmlNode) {
		if n.XMLName.Local == local {
			out = append(out, n)
		}
		for _, child := range n.Children {
			walk(child)
		}
	}
	walk(root)
	return out
}
