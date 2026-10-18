// 本文件复刻 media_analysis.py 的容器校验与格式分类。
package media

import (
	"archive/zip"
	"bytes"
	"encoding/binary"
	"encoding/xml"
	"fmt"
	"io"
	"os"
	"path"
	"strings"
	"talebook/booksvr/internal/epubpath"
)

// AnalyzeFile 复刻 analyze_media_file：按声明格式校验并分类。
func AnalyzeFile(filePath, declaredFormat string) (Analysis, error) {
	declaredFormat = strings.ToLower(strings.TrimPrefix(strings.TrimSpace(declaredFormat), "."))
	if !SupportedMediaFormats[declaredFormat] {
		return Analysis{}, invalid("format.unsupported", fmt.Sprintf("不支持的文件格式：%s", declaredFormat))
	}
	info, err := os.Stat(filePath)
	if err != nil || info.IsDir() {
		return Analysis{}, invalid("media.unreadable", "媒体文件不存在")
	}

	switch {
	case ManagedDocumentFormats[declaredFormat]:
		return analyzeManagedDocument(filePath, declaredFormat)
	case OfficeDocumentFormats[declaredFormat]:
		return analyzeDocx(filePath, declaredFormat)
	case XMLDocumentFormats[declaredFormat]:
		return analyzeFB2(filePath, declaredFormat)
	case HTMLArchiveFormats[declaredFormat]:
		return analyzeHTMLZ(filePath, declaredFormat)
	case ComicZipFormats[declaredFormat]:
		sig, err := readSignature(filePath, 4)
		if err != nil {
			return Analysis{}, err
		}
		if !bytes.HasPrefix(sig, []byte("PK")) {
			return Analysis{}, invalid("format.mismatch", "文件内容不是有效的 ZIP 容器")
		}
		return validateComicZip(filePath, declaredFormat)
	case ComicRarFormats[declaredFormat]:
		return validateComicRar(filePath, declaredFormat)
	case declaredFormat == "epub":
		return analyzeEpub(filePath, declaredFormat)
	case declaredFormat == "pdf":
		sig, err := readSignature(filePath, 8)
		if err != nil {
			return Analysis{}, err
		}
		sig = bytes.TrimPrefix(sig, []byte{0xef, 0xbb, 0xbf})
		if !bytes.HasPrefix(sig, []byte("%PDF-")) {
			return Analysis{}, invalid("format.mismatch", "文件内容不是有效的 PDF")
		}
		return Analysis{declaredFormat, "pdf", "application/pdf", TypeUnknown, "pdf_unclassified"}, nil
	}

	mimeTypes := map[string]string{
		"txt":  "text/plain",
		"mobi": "application/x-mobipocket-ebook",
		"azw":  "application/vnd.amazon.ebook",
		"azw3": "application/vnd.amazon.ebook",
	}
	return Analysis{declaredFormat, declaredFormat, mimeTypes[declaredFormat], TypeEbook, "ebook_format"}, nil
}

// openZip 打开一个 ZIP 并完成目录预检。
//
// zip.OpenReader 失败时内部已关闭文件句柄，调用方无需额外清理。
func openZip(filePath string) (*zip.ReadCloser, error) {
	if err := preflightZipDirectory(filePath); err != nil {
		return nil, err
	}
	zr, err := zip.OpenReader(filePath)
	if err != nil {
		return nil, invalid("archive.corrupt", fmt.Sprintf("ZIP 压缩包已损坏：%v", err))
	}
	return zr, nil
}

// validateComicZip 复刻 _validate_comic_zip。
func validateComicZip(filePath, declaredFormat string) (Analysis, error) {
	zr, err := openZip(filePath)
	if err != nil {
		return Analysis{}, err
	}
	defer zr.Close()

	_, files, err := zipFileEntries(&zr.Reader)
	if err != nil {
		return Analysis{}, err
	}

	imageCount := 0
	for _, f := range files {
		if ignoredComicEntry(f.Name) {
			continue
		}
		ext := strings.ToLower(path.Ext(f.Name))
		if !imageExtensions[ext] {
			return Analysis{}, invalid("comic.non_image_entry", "漫画压缩包只能包含图片和 ComicInfo.xml")
		}
		header, err := readZipEntry(f, 32)
		if err != nil {
			return Analysis{}, invalid("archive.corrupt", fmt.Sprintf("无法读取漫画图片：%v", err))
		}
		detected := detectImageMIME(header)
		if detected == "" || !extensionMatchesMIME(ext, detected) {
			return Analysis{}, invalid("comic.image_mismatch", "漫画图片扩展名与内容不匹配")
		}
		imageCount++
	}
	if imageCount == 0 {
		return Analysis{}, invalid("comic.no_images", "漫画压缩包中没有可识别的图片")
	}

	mimeType := "application/zip"
	if declaredFormat == "cbz" {
		mimeType = "application/vnd.comicbook+zip"
	}
	return Analysis{declaredFormat, "zip", mimeType, TypeComic, "image_archive"}, nil
}

// extensionMatchesMIME 复刻 Python 的 `extension not in _IMAGE_MIME_EXTENSIONS[mime]`。
//
// 映射值是 frozenset，因此这里是集合成员判断而非子串匹配。
func extensionMatchesMIME(ext, mime string) bool {
	allowed, ok := imageMIMEExtensions[mime]
	if !ok {
		return false
	}
	return allowed[ext]
}

// validateComicRar 复刻 _validate_comic_rar。
//
// Go 标准库无 RAR 能力，因此只做签名与体积校验，随后返回
// comic.invalid_container —— 这是已记录的行为差异。
func validateComicRar(filePath, declaredFormat string) (Analysis, error) {
	if err := preflightArchiveFile(filePath); err != nil {
		return Analysis{}, err
	}
	sig, err := readSignature(filePath, 8)
	if err != nil {
		return Analysis{}, err
	}
	rar4 := []byte{'R', 'a', 'r', '!', 0x1A, 0x07, 0x00}
	rar5 := []byte{'R', 'a', 'r', '!', 0x1A, 0x07, 0x01, 0x00}
	if !bytes.HasPrefix(sig, rar4) && !bytes.HasPrefix(sig, rar5) {
		return Analysis{}, invalid("format.mismatch", "文件内容不是有效的 RAR 容器")
	}
	// Go 标准库不支持 RAR 解压；引入第三方库有许可与安全风险。
	return Analysis{}, invalid("comic.invalid_container", "暂不支持 RAR 漫画容器")
}

// readZipEntry 读取 ZIP 条目内容，最多 limit 字节。
func readZipEntry(f *zip.File, limit int) ([]byte, error) {
	rc, err := f.Open()
	if err != nil {
		return nil, err
	}
	defer rc.Close()
	buf := make([]byte, limit)
	n, err := io.ReadFull(rc, buf)
	if err != nil && err != io.EOF && err != io.ErrUnexpectedEOF {
		return nil, err
	}
	return buf[:n], nil
}

// readZipEntryLimited 复刻 _read_zip_entry：超过 limit 时报错。
func readZipEntryLimited(f *zip.File, limit int, label string) ([]byte, error) {
	if int64(f.UncompressedSize64) > int64(limit) {
		return nil, invalid("epub.resource_too_large", fmt.Sprintf("%s 体积过大", label))
	}
	data, err := readZipEntry(f, limit+1)
	if err != nil {
		return nil, invalid("epub.corrupt", fmt.Sprintf("无法读取 %s：%v", label, err))
	}
	if len(data) > limit {
		return nil, invalid("epub.resource_too_large", fmt.Sprintf("%s 体积过大", label))
	}
	return data, nil
}

// xmlNode 是解析后的 XML 元素。
type xmlNode struct {
	XMLName  xml.Name
	Attrs    []xml.Attr
	Children []xmlNode
	Text     string
}

// parseXML 复刻 _parse_xml：禁用实体解析与网络访问。
func parseXML(data []byte, label string) (*xmlNode, error) {
	dec := xml.NewDecoder(bytes.NewReader(data))
	dec.Strict = true
	dec.Entity = xml.HTMLEntity
	root, err := decodeNode(dec)
	if err != nil {
		return nil, invalid("epub.invalid_xml", fmt.Sprintf("%s XML 不合法：%v", label, err))
	}
	return root, nil
}

// decodeNode 递归解析一个 XML 元素。
func decodeNode(dec *xml.Decoder) (*xmlNode, error) {
	for {
		tok, err := dec.Token()
		if err != nil {
			return nil, err
		}
		start, ok := tok.(xml.StartElement)
		if !ok {
			continue
		}
		node := &xmlNode{XMLName: start.Name, Attrs: start.Attr}
		for {
			inner, err := dec.Token()
			if err != nil {
				return nil, err
			}
			switch t := inner.(type) {
			case xml.StartElement:
				child, err := decodeNodeFrom(dec, t)
				if err != nil {
					return nil, err
				}
				node.Children = append(node.Children, *child)
			case xml.CharData:
				node.Text += string(t)
			case xml.EndElement:
				return node, nil
			}
		}
	}
}

// decodeNodeFrom 从已知的起始元素继续解析。
func decodeNodeFrom(dec *xml.Decoder, start xml.StartElement) (*xmlNode, error) {
	node := &xmlNode{XMLName: start.Name, Attrs: start.Attr}
	for {
		inner, err := dec.Token()
		if err != nil {
			return nil, err
		}
		switch t := inner.(type) {
		case xml.StartElement:
			child, err := decodeNodeFrom(dec, t)
			if err != nil {
				return nil, err
			}
			node.Children = append(node.Children, *child)
		case xml.CharData:
			node.Text += string(t)
		case xml.EndElement:
			return node, nil
		}
	}
}

// localName 复刻 _local_name：返回不含命名空间前缀的标签名。
func localName(n xml.Name) string { return n.Local }

// walk 深度优先遍历节点及其后代。
func (n *xmlNode) walk(fn func(*xmlNode)) {
	fn(n)
	for i := range n.Children {
		n.Children[i].walk(fn)
	}
}

// attr 返回指定名字的属性值（忽略命名空间）。
func (n *xmlNode) attr(name string) string {
	for _, a := range n.Attrs {
		if a.Name.Local == name {
			return a.Value
		}
	}
	return ""
}

// attrSuffix 返回名字以 suffix 结尾的属性值。
func (n *xmlNode) attrSuffix(suffix string) string {
	for _, a := range n.Attrs {
		if strings.HasSuffix(a.Name.Local, suffix) {
			return a.Value
		}
	}
	return ""
}

// allText 返回节点及其后代的全部文本。
func (n *xmlNode) allText() string {
	var sb strings.Builder
	n.walk(func(node *xmlNode) { sb.WriteString(node.Text) })
	return sb.String()
}

// normalizeHref 复刻 _normalize_href。
func normalizeHref(base, href string) string {
	href = strings.TrimSpace(href)
	if href == "" {
		return ""
	}
	// 去掉查询串与片段。
	if i := strings.IndexAny(href, "?#"); i >= 0 {
		href = href[:i]
	}
	// 含 scheme 或 netloc 的绝对 URL 不接受。
	if strings.Contains(href, "://") || strings.HasPrefix(href, "//") {
		return ""
	}
	rawPath := strings.ReplaceAll(href, "\\", "/")
	if rawPath == "" {
		return ""
	}
	normalized := path.Clean(path.Join(base, rawPath))
	if !safeArchiveName(normalized) {
		return ""
	}
	return normalized
}

// analyzeEpub 复刻 _analyze_epub。
func analyzeEpub(filePath, declaredFormat string) (Analysis, error) {
	sig, err := readSignature(filePath, 4)
	if err != nil {
		return Analysis{}, err
	}
	if !bytes.HasPrefix(sig, []byte("PK")) {
		return Analysis{}, invalid("format.mismatch", "文件内容不是 ZIP 容器")
	}
	zr, err := openZip(filePath)
	if err != nil {
		return Analysis{}, err
	}
	defer zr.Close()

	_, files, err := zipFileEntries(&zr.Reader)
	if err != nil {
		return Analysis{}, err
	}
	infoByName := map[string]*zip.File{}
	for _, f := range files {
		infoByName[f.Name] = f
	}
	if entry := epubpath.Find(files, "META-INF/encryption.xml"); entry != nil {
		data, e := readZipEntryLimited(entry, MaxEpubXMLBytes, "EPUB encryption.xml")
		if e != nil {
			return Analysis{}, e
		}
		if epubpath.Encrypted(data) {
			return Analysis{}, invalid("epub.encrypted", "EPUB 正文受加密保护，需要对应授权密钥或无加密版本；当前无法解密阅读")
		}
	}

	mimetypeInfo := epubpath.Find(files, "mimetype")
	if mimetypeInfo == nil {
		return Analysis{}, invalid("epub.mimetype_missing", "EPUB 缺少 mimetype 标识")
	}
	mimetype, err := readZipEntryLimited(mimetypeInfo, 64, "EPUB mimetype")
	if err != nil {
		return Analysis{}, err
	}
	if strings.TrimSpace(string(mimetype)) != "application/epub+zip" {
		return Analysis{}, invalid("format.mismatch", "EPUB mimetype 标识不匹配")
	}

	containerInfo := epubpath.Find(files, "META-INF/container.xml")
	if containerInfo == nil {
		return Analysis{}, invalid("epub.container_missing", "EPUB 缺少 META-INF/container.xml")
	}
	containerData, err := readZipEntryLimited(containerInfo, MaxEpubXMLBytes, "EPUB container.xml")
	if err != nil {
		return Analysis{}, err
	}
	container, err := parseXML(containerData, "EPUB container.xml")
	if err != nil {
		return Analysis{}, err
	}

	var opfPath string
	container.walk(func(n *xmlNode) {
		if opfPath != "" || localName(n.XMLName) != "rootfile" {
			return
		}
		if p := n.attr("full-path"); p != "" && safeArchiveName(p) {
			opfPath = p
		}
	})
	var opfInfo *zip.File
	if opfPath != "" {
		opfInfo = epubpath.Find(files, opfPath)
	}
	if opfInfo == nil {
		return Analysis{}, invalid("epub.package_missing", "EPUB package 文档不存在")
	}
	opfPath = opfInfo.Name
	pkgData, err := readZipEntryLimited(opfInfo, MaxEpubXMLBytes, "EPUB package")
	if err != nil {
		return Analysis{}, err
	}
	pkg, err := parseXML(pkgData, "EPUB package")
	if err != nil {
		return Analysis{}, err
	}

	opfDir := path.Dir(opfPath)
	manifestByID := map[string][2]string{}
	manifestByPath := map[string][2]string{}
	pkg.walk(func(n *xmlNode) {
		if localName(n.XMLName) != "item" {
			return
		}
		itemID := n.attr("id")
		itemPath := normalizeHref(opfDir, n.attr("href"))
		mediaType := n.attr("media-type")
		if itemID == "" || itemPath == "" {
			return
		}
		manifestByID[itemID] = [2]string{itemPath, mediaType}
		manifestByPath[itemPath] = [2]string{itemID, mediaType}
	})

	var spineIDs []string
	pkg.walk(func(n *xmlNode) {
		if localName(n.XMLName) == "itemref" {
			spineIDs = append(spineIDs, n.attr("idref"))
		}
	})
	if len(spineIDs) == 0 {
		return Analysis{}, invalid("epub.spine_missing", "EPUB spine 为空")
	}
	if len(spineIDs) > MaxEpubSpineItems {
		return Analysis{declaredFormat, "epub", "application/epub+zip", TypeUnknown, "spine_limit"}, nil
	}

	var pageImages []string
	for _, itemID := range spineIDs {
		item, ok := manifestByID[itemID]
		if !ok {
			return Analysis{}, invalid("epub.spine_invalid", "EPUB spine 引用了不存在的 manifest 条目")
		}
		pagePath, mediaType := item[0], item[1]
		pageInfo := epubpath.Find(files, pagePath)
		if pageInfo == nil {
			return Analysis{}, invalid("epub.spine_invalid", "EPUB spine 页面文件不存在")
		}
		var pageImage string
		switch {
		case strings.HasPrefix(strings.ToLower(mediaType), "image/"):
			pageImage = pagePath
		case strings.ToLower(mediaType) == "application/xhtml+xml" || strings.ToLower(mediaType) == "text/html":
			img, limited := epubXHTMLImage(pageInfo, pagePath, manifestByPath)
			if limited {
				return Analysis{declaredFormat, "epub", "application/epub+zip", TypeUnknown, "page_limit"}, nil
			}
			pageImage = img
		}
		if pageImage == "" {
			return Analysis{declaredFormat, "epub", "application/epub+zip", TypeEbook, "text_spine"}, nil
		}
		pageImages = append(pageImages, pageImage)
	}
	if len(pageImages) == len(spineIDs) {
		return Analysis{declaredFormat, "epub", "application/epub+zip", TypeComic, "image_spine"}, nil
	}
	return Analysis{declaredFormat, "epub", "application/epub+zip", TypeEbook, "text_spine"}, nil
}

// epubXHTMLImage 复刻 _epub_xhtml_image。
//
// 返回 (图片路径, 是否因超限而放弃)。
func epubXHTMLImage(f *zip.File, pagePath string, manifestByPath map[string][2]string) (string, bool) {
	if int64(f.UncompressedSize64) > MaxEpubXHTMLBytes {
		return "", true
	}
	data, err := readZipEntryLimited(f, MaxEpubXHTMLBytes, "EPUB 页面")
	if err != nil {
		return "", false
	}
	root, err := parseXML(data, "EPUB 页面")
	if err != nil {
		return "", false
	}

	body := root
	root.walk(func(n *xmlNode) {
		if strings.ToLower(localName(n.XMLName)) == "body" {
			body = n
		}
	})
	text := strings.Join(strings.Fields(body.allText()), "")
	if len(text) > EpubComicTextThreshold {
		return "", false
	}

	imagePaths := map[string]bool{}
	body.walk(func(n *xmlNode) {
		name := strings.ToLower(localName(n.XMLName))
		var href string
		switch name {
		case "img":
			href = n.attr("src")
		case "image":
			href = n.attrSuffix("href")
		}
		if href == "" {
			return
		}
		imagePath := normalizeHref(path.Dir(pagePath), href)
		if item, ok := manifestByPath[imagePath]; ok && strings.HasPrefix(strings.ToLower(item[1]), "image/") {
			imagePaths[imagePath] = true
		}
	})
	if len(imagePaths) != 1 {
		return "", false
	}
	for p := range imagePaths {
		return p, false
	}
	return "", false
}

// analyzeManagedDocument 复刻 _analyze_managed_document。
func analyzeManagedDocument(filePath, declaredFormat string) (Analysis, error) {
	if declaredFormat == "djvu" {
		header, err := readSignature(filePath, 16)
		if err != nil {
			return Analysis{}, err
		}
		if len(header) != 16 || string(header[:8]) != "AT&TFORM" ||
			(string(header[12:16]) != "DJVU" && string(header[12:16]) != "DJVM") {
			return Analysis{}, invalid("format.mismatch", "文件内容不是有效的 DjVu 容器")
		}
		formSize := binary.BigEndian.Uint32(header[8:12])
		info, err := os.Stat(filePath)
		if err != nil {
			return Analysis{}, invalid("media.unreadable", "媒体文件不存在")
		}
		if formSize < 4 || int64(formSize)+12 != info.Size() {
			return Analysis{}, invalid("format.mismatch", "DjVu 容器长度不匹配")
		}
		return Analysis{declaredFormat, declaredFormat, "image/vnd.djvu", TypeUnknown, "download_only_document"}, nil
	}

	// UVZ 用 ZIP 存扫描页；不套用漫画图片限制（页面可能是 PDG 等私有格式）。
	sig, err := readSignature(filePath, 4)
	if err != nil {
		return Analysis{}, err
	}
	if !bytes.HasPrefix(sig, []byte("PK")) {
		return Analysis{}, invalid("format.mismatch", "文件内容不是有效的 UVZ ZIP 容器")
	}
	zr, err := openZip(filePath)
	if err != nil {
		return Analysis{}, err
	}
	defer zr.Close()
	_, files, err := zipFileEntries(&zr.Reader)
	if err != nil {
		return Analysis{}, err
	}
	if len(files) == 0 {
		return Analysis{}, invalid("archive.empty", "UVZ 容器为空")
	}
	return Analysis{declaredFormat, declaredFormat, "application/octet-stream", TypeUnknown, "download_only_document"}, nil
}

// analyzeDocx 复刻 _analyze_docx。
func analyzeDocx(filePath, declaredFormat string) (Analysis, error) {
	sig, err := readSignature(filePath, 4)
	if err != nil {
		return Analysis{}, err
	}
	if !bytes.HasPrefix(sig, []byte("PK")) {
		return Analysis{}, invalid("format.mismatch", "文件内容不是有效的 DOCX ZIP 容器")
	}
	zr, err := openZip(filePath)
	if err != nil {
		return Analysis{}, err
	}
	defer zr.Close()
	_, files, err := zipFileEntries(&zr.Reader)
	if err != nil {
		return Analysis{}, err
	}
	names := map[string]bool{}
	for _, f := range files {
		names[f.Name] = true
	}
	if !names["[Content_Types].xml"] {
		return Analysis{}, invalid("format.mismatch", "DOCX 缺少 [Content_Types].xml")
	}
	hasWord := false
	for name := range names {
		if strings.HasPrefix(name, "word/") {
			hasWord = true
			break
		}
	}
	if !hasWord {
		return Analysis{}, invalid("format.mismatch", "DOCX 缺少 word/ 目录")
	}
	return Analysis{declaredFormat, declaredFormat,
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		TypeUnknown, "download_only_document"}, nil
}

// analyzeFB2 复刻 _analyze_fb2。
func analyzeFB2(filePath, declaredFormat string) (Analysis, error) {
	info, err := os.Stat(filePath)
	if err != nil {
		return Analysis{}, invalid("media.unreadable", "媒体文件不存在")
	}
	if info.Size() > MaxDocumentXMLBytes {
		return Analysis{}, invalid("format.mismatch", "FB2 文件过大")
	}
	f, err := os.Open(filePath)
	if err != nil {
		return Analysis{}, invalid("media.unreadable", fmt.Sprintf("无法读取 FB2 文件：%v", err))
	}
	defer f.Close()
	data, err := io.ReadAll(io.LimitReader(f, MaxDocumentXMLBytes+1))
	if err != nil {
		return Analysis{}, invalid("media.unreadable", fmt.Sprintf("无法读取 FB2 文件：%v", err))
	}
	if len(data) > MaxDocumentXMLBytes {
		return Analysis{}, invalid("format.mismatch", "FB2 文件过大")
	}

	root, err := parseXML(data, "FB2")
	if err != nil {
		// _parse_xml 报的是 epub.invalid_xml；对 FB2 统一成 format.mismatch。
		return Analysis{}, invalid("format.mismatch", "FB2 XML 不合法")
	}
	if localName(root.XMLName) != "FictionBook" {
		return Analysis{}, invalid("format.mismatch", "FB2 根元素不是 FictionBook")
	}
	hasBody := false
	for i := range root.Children {
		if localName(root.Children[i].XMLName) == "body" {
			hasBody = true
			break
		}
	}
	if !hasBody {
		return Analysis{}, invalid("format.mismatch", "FB2 缺少 body 元素")
	}
	return Analysis{declaredFormat, declaredFormat, "application/fb2+xml", TypeUnknown, "download_only_document"}, nil
}

// analyzeHTMLZ 复刻 _analyze_htmlz。
func analyzeHTMLZ(filePath, declaredFormat string) (Analysis, error) {
	sig, err := readSignature(filePath, 4)
	if err != nil {
		return Analysis{}, err
	}
	if !bytes.HasPrefix(sig, []byte("PK")) {
		return Analysis{}, invalid("format.mismatch", "文件内容不是有效的 HTMLZ ZIP 容器")
	}
	zr, err := openZip(filePath)
	if err != nil {
		return Analysis{}, err
	}
	defer zr.Close()
	_, files, err := zipFileEntries(&zr.Reader)
	if err != nil {
		return Analysis{}, err
	}
	if len(files) == 0 {
		return Analysis{}, invalid("archive.empty", "HTMLZ 容器为空")
	}
	found := false
	for _, f := range files {
		if f.Name == "index.html" {
			found = true
			break
		}
	}
	if !found {
		return Analysis{}, invalid("format.mismatch", "HTMLZ 缺少 index.html")
	}
	return Analysis{declaredFormat, declaredFormat, "application/octet-stream", TypeUnknown, "download_only_document"}, nil
}
