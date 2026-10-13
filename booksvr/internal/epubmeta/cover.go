package epubmeta

import (
	"archive/zip"
	"bytes"
	"fmt"
	"path"
	"strings"
)

// Cover 从 EPUB 归档里取出封面图片。
//
// 查找顺序与 Calibre 一致：
//  1. OPF manifest 里 properties="cover-image" 的条目（EPUB 3）；
//  2. OPF metadata 里 <meta name="cover" content="<id>"> 指向的 manifest 条目（EPUB 2）；
//  3. manifest 里 id 为 "cover" 或 href 含 "cover" 的图片条目。
//
// 返回 (图片字节, 是否找到)。找不到时返回 ok=false，不报错。
func Cover(archiveBytes []byte) ([]byte, bool) {
	reader, err := zip.NewReader(bytes.NewReader(archiveBytes), int64(len(archiveBytes)))
	if err != nil {
		return nil, false
	}

	containerData, err := readEntry(reader, "META-INF/container.xml")
	if err != nil {
		return nil, false
	}
	container, err := parseXML(containerData)
	if err != nil {
		return nil, false
	}
	rootfile := findFirst(container, "rootfile")
	if rootfile == nil || rootfile.attr("full-path") == "" {
		return nil, false
	}
	opfPath := rootfile.attr("full-path")

	packageData, err := readEntry(reader, opfPath)
	if err != nil {
		return nil, false
	}
	pkg, err := parseXML(packageData)
	if err != nil {
		return nil, false
	}

	// 收集 manifest 条目：id -> href。
	hrefByID := map[string]string{}
	var items []struct{ id, href, props string }
	for _, item := range findAll(pkg, "item") {
		id := item.attr("id")
		href := item.attr("href")
		if href == "" {
			continue
		}
		hrefByID[id] = href
		items = append(items, struct{ id, href, props string }{id, href, item.attr("properties")})
	}

	base := path.Dir(opfPath)
	if base == "." {
		base = ""
	}

	// 1. EPUB 3：properties 含 cover-image。
	for _, it := range items {
		if strings.Contains(it.props, "cover-image") {
			if data, ok := readImage(reader, joinPath(base, it.href)); ok {
				return data, true
			}
		}
	}

	// 2. EPUB 2：<meta name="cover" content="<manifest id>">。
	for _, meta := range findAll(pkg, "meta") {
		if !strings.EqualFold(meta.attr("name"), "cover") {
			continue
		}
		if href, ok := hrefByID[meta.attr("content")]; ok {
			if data, ok := readImage(reader, joinPath(base, href)); ok {
				return data, true
			}
		}
	}

	// 3. 兜底：id 为 cover，或 href 里含 cover 的图片。
	for _, it := range items {
		if !isImage(it.href) {
			continue
		}
		if strings.EqualFold(it.id, "cover") || strings.Contains(strings.ToLower(it.href), "cover") {
			if data, ok := readImage(reader, joinPath(base, it.href)); ok {
				return data, true
			}
		}
	}
	return nil, false
}

// isImage 判断 href 是否指向常见图片格式。
func isImage(href string) bool {
	switch strings.ToLower(path.Ext(href)) {
	case ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp":
		return true
	}
	return false
}

// joinPath 拼接 OPF 所在目录与条目相对路径。
func joinPath(base, href string) string {
	if base == "" {
		return href
	}
	return path.Join(base, href)
}

// readImage 读取归档内的图片条目，并确认内容非空。
func readImage(reader *zip.Reader, name string) ([]byte, bool) {
	data, err := readEntry(reader, name)
	if err != nil || len(data) == 0 {
		return nil, false
	}
	return data, true
}

// 保证 fmt 被使用（readEntry 的错误在调用方被忽略，这里保留调试入口）。
var _ = fmt.Sprintf
