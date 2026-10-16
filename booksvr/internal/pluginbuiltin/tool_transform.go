package pluginbuiltin

import (
	"archive/zip"
	"bytes"
	"compress/flate"
	"fmt"
	"io"
	"os"
	"path"
	"regexp"
	"strings"

	"talebook/booksvr/internal/pluginproto"
)

// ---- EPUB 读写共享助手（复刻 tool/epub.py）----

// epubTextMediaTypes 复刻 TEXT_MEDIA_TYPES。
var epubTextMediaTypes = map[string]bool{
	"application/xhtml+xml": true,
	"text/html":             true,
}

var (
	epubItemRe    = regexp.MustCompile(`(?i)<item\b[^>]*?>`)
	epubItemHrefRe = regexp.MustCompile(`(?i)href\s*=\s*"([^"]+)"`)
	epubItemMTRe   = regexp.MustCompile(`(?i)media-type\s*=\s*"([^"]+)"`)
	epubFullPathRe = regexp.MustCompile(`(?i)full-path\s*=\s*"([^"]+)"`)
	xmlEncodingRe  = regexp.MustCompile(`(?i)(<\?xml[^>]*encoding\s*=\s*")[^"]+(")`)
)

// readZipEntries 复刻 read_zip_entries：读取 zip 全部条目（跳过目录项）。
func readZipEntries(path string) (map[string][]byte, []string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, nil, err
	}
	defer f.Close()
	info, err := f.Stat()
	if err != nil {
		return nil, nil, err
	}
	archive, err := zip.NewReader(f, info.Size())
	if err != nil {
		return nil, nil, err
	}
	entries := map[string][]byte{}
	var order []string
	for _, entry := range archive.File {
		if entry.FileInfo().IsDir() {
			continue
		}
		data, err := readZipEntry(archive, entry.Name)
		if err != nil {
			return nil, nil, err
		}
		entries[entry.Name] = data
		order = append(order, entry.Name)
	}
	return entries, order, nil
}

// opfPathFromContainer 复刻 opf_path_from_container。
func opfPathFromContainer(containerText string) string {
	m := epubFullPathRe.FindStringSubmatch(containerText)
	if m == nil {
		return ""
	}
	return m[1]
}

// normalizeZipPath 复刻 normalize_zip_path。
func normalizeZipPath(href string) string {
	href = strings.ReplaceAll(href, "\\", "/")
	var parts []string
	for _, seg := range strings.Split(href, "/") {
		switch seg {
		case "", ".":
			continue
		case "..":
			if len(parts) > 0 {
				parts = parts[:len(parts)-1]
			}
			continue
		}
		parts = append(parts, seg)
	}
	return strings.Join(parts, "/")
}

// findTextEntries 复刻 find_text_entries。
func findTextEntries(entries map[string][]byte) []string {
	container, ok := entries["META-INF/container.xml"]
	if !ok {
		return nil
	}
	opfPath := opfPathFromContainer(string(container))
	if opfPath == "" {
		return nil
	}
	opfRaw, ok := entries[opfPath]
	if !ok {
		return nil
	}
	opfText, _ := decodeEpubEntry(opfRaw)
	lowerMap := map[string]string{}
	for k := range entries {
		lowerMap[strings.ToLower(k)] = k
	}
	var names []string
	baseDir := ""
	if idx := strings.LastIndex(opfPath, "/"); idx >= 0 {
		baseDir = opfPath[:idx]
	}
	for _, tag := range epubItemRe.FindAllString(opfText, -1) {
		mt := epubItemMTRe.FindStringSubmatch(tag)
		hrefMatch := epubItemHrefRe.FindStringSubmatch(tag)
		if mt == nil || hrefMatch == nil {
			continue
		}
		if !epubTextMediaTypes[strings.ToLower(mt[1])] {
			continue
		}
		href := strings.SplitN(strings.SplitN(hrefMatch[1], "#", 2)[0], "?", 2)[0]
		if strings.HasPrefix(href, "/") {
			href = strings.TrimLeft(href, "/")
		} else if baseDir != "" {
			href = baseDir + "/" + href
		}
		name := normalizeZipPath(href)
		if real, ok := lowerMap[strings.ToLower(name)]; ok {
			names = append(names, real)
		}
	}
	return names
}

// decodeEpubEntry 复刻 decode_entry：UTF-8 优先，失败用检测器兜底。
func decodeEpubEntry(data []byte) (string, string) {
	if text, err := strictUTF8(data); err == nil {
		return text, "utf-8"
	}
	text, report := decodeWithReport(data)
	encoding, _ := report["encoding"].(string)
	return text, encoding
}

// encodeEpubEntry 复刻 encode_entry：原编码写回，失败降级 UTF-8。
func encodeEpubEntry(text, encoding string) []byte {
	if encoding == "utf-8" || encoding == "utf-8-sig" {
		if encoding == "utf-8-sig" {
			return append([]byte{0xEF, 0xBB, 0xBF}, []byte(text)...)
		}
		return []byte(text)
	}
	encoded, ok := encodeText(text, encoding)
	if !ok {
		return []byte(setXMLEncoding(text, "utf-8"))
	}
	return encoded
}

// setXMLEncoding 复刻 set_xml_encoding。
func setXMLEncoding(text, encoding string) string {
	return xmlEncodingRe.ReplaceAllString(text, "${1}"+encoding+"${2}")
}

// writeEpubZip 复刻 write_epub_zip：mimetype 置首且 STORED，其余 DEFLATED。
func writeEpubZip(entries map[string][]byte, order []string, outPath string) error {
	out, err := os.Create(outPath)
	if err != nil {
		return err
	}
	defer out.Close()
	writer := zip.NewWriter(out)
	// mimetype 置首且不压缩（EPUB 规范）。
	mimetype, ok := entries["mimetype"]
	if !ok {
		mimetype = []byte("application/epub+zip")
	}
	mh := &zip.FileHeader{Name: "mimetype", Method: zip.Store}
	mh.SetModTime(zipEpoch)
	if entry, err := writer.CreateHeader(mh); err != nil {
		return err
	} else if _, err := entry.Write(mimetype); err != nil {
		return err
	}
	for _, name := range order {
		if name == "mimetype" {
			continue
		}
		eh := &zip.FileHeader{Name: name, Method: zip.Deflate}
		eh.SetModTime(zipEpoch)
		entry, err := writer.CreateHeader(eh)
		if err != nil {
			return err
		}
		if _, err := entry.Write(entries[name]); err != nil {
			return err
		}
	}
	return writer.Close()
}

// zipEpoch 是 zip 条目的固定时间戳（避免不可复现的构建）。
var zipEpoch = timeUnix(2026, 1, 1)

// strictUTF8 严格 UTF-8 解码。
func strictUTF8(data []byte) (string, error) {
	if !utf8Valid(data) {
		return "", fmt.Errorf("invalid utf-8")
	}
	return string(data), nil
}

// utf8Valid 报告字节序列是否为合法 UTF-8。
func utf8Valid(data []byte) bool {
	for i := 0; i < len(data); {
		b := data[i]
		switch {
		case b < 0x80:
			i++
		case b&0xE0 == 0xC0:
			if i+1 >= len(data) || data[i+1]&0xC0 != 0x80 {
				return false
			}
			i += 2
		case b&0xF0 == 0xE0:
			if i+2 >= len(data) || data[i+1]&0xC0 != 0x80 || data[i+2]&0xC0 != 0x80 {
				return false
			}
			i += 3
		case b&0xF8 == 0xF0:
			if i+3 >= len(data) || data[i+1]&0xC0 != 0x80 ||
				data[i+2]&0xC0 != 0x80 || data[i+3]&0xC0 != 0x80 {
				return false
			}
			i += 4
		default:
			return false
		}
	}
	return true
}

// ---- 正文查找替换（复刻 tool/text_replace/transform.py）----

// 预览常量。
const (
	textReplaceSampleCtx   = 50
	textReplaceSampleMax   = 5
	textReplacePreviewLimit = 200000
)

// compileRule 复刻 compile_rule：返回 apply 函数与错误信息。
func compileRule(pattern, replacement string, useRegex bool) (func(string) (string, int), string) {
	if pattern == "" {
		return nil, "查找内容不能为空"
	}
	if useRegex {
		rx, err := compileRE2(pattern)
		if err != nil {
			return nil, "正则表达式错误：" + err.Error()
		}
		return func(text string) (string, int) {
			return replaceRegexSubn(rx, replacement, text)
		}, ""
	}
	return func(text string) (string, int) {
		count := strings.Count(text, pattern)
		return strings.ReplaceAll(text, pattern, replacement), count
	}, ""
}

// compileRE2 编译正则；RE2 不支持部分 PCRE 语法，错误信息与 Python 对齐。
func compileRE2(pattern string) (*regexp.Regexp, error) {
	return regexp.Compile(pattern)
}

// replaceRegexSubn 复刻 re.subn（含反向引用展开）。
func replaceRegexSubn(rx *regexp.Regexp, replacement, text string) (string, int) {
	matches := rx.FindAllStringIndex(text, -1)
	if len(matches) == 0 {
		return text, 0
	}
	var out strings.Builder
	last := 0
	for _, m := range matches {
		out.WriteString(text[last:m[0]])
		out.Write(rx.ExpandString(nil, replacement, text, m))
		last = m[1]
	}
	out.WriteString(text[last:])
	return out.String(), len(matches)
}

// sampleFrom 复刻 sample_from。
func sampleFrom(text string, idx, length int) map[string]any {
	lo := idx - textReplaceSampleCtx
	if lo < 0 {
		lo = 0
	}
	hi := idx + length + textReplaceSampleCtx
	if hi > len(text) {
		hi = len(text)
	}
	return map[string]any{
		"index": idx,
		"pre":   text[lo:idx],
		"match": text[idx : idx+length],
		"post":  text[idx+length : hi],
	}
}

// scanSamples 复刻 scan_samples。
func scanSamples(text, pattern string, useRegex bool, cap int) (int, []map[string]any) {
	var samples []map[string]any
	if useRegex {
		rx, err := compileRE2(pattern)
		if err != nil {
			return 0, samples
		}
		count := 0
		for _, m := range rx.FindAllStringIndex(text, -1) {
			count++
			if len(samples) < cap {
				samples = append(samples, sampleFrom(text, m[0], m[1]-m[0]))
			}
		}
		return count, samples
	}
	if pattern == "" {
		return 0, samples
	}
	count := 0
	start := 0
	for {
		idx := strings.Index(text[start:], pattern)
		if idx < 0 {
			break
		}
		idx += start
		count++
		if len(samples) < cap {
			samples = append(samples, sampleFrom(text, idx, len(pattern)))
		}
		start = idx + maxInt(1, len(pattern))
	}
	return count, samples
}

// maxInt 返回较大值。
func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// loadTexts 复刻 load_texts：返回 (fmt, 文本列表)。
func loadTexts(format, path string) (string, []string, error) {
	if format == "TXT" {
		data, err := os.ReadFile(path)
		if err != nil {
			return "", nil, err
		}
		text, _ := decodeWithReport(data)
		return "TXT", []string{text}, nil
	}
	if format == "EPUB" {
		entries, _, err := readZipEntries(path)
		if err != nil {
			return "", nil, err
		}
		var texts []string
		for _, name := range findTextEntries(entries) {
			text, _ := decodeEpubEntry(entries[name])
			texts = append(texts, text)
		}
		return "EPUB", texts, nil
	}
	return "", nil, pluginproto.NewUpstreamError("该书籍没有 TXT 或 EPUB 格式，无法执行替换", "other", nil)
}

// textReplacePreview 复刻 preview。
func textReplacePreview(format, path, pattern, replacement string, useRegex bool) map[string]any {
	applyFn, regexError := compileRule(pattern, replacement, useRegex)
	if applyFn == nil {
		return map[string]any{
			"format": nil, "matches": 0, "samples": []any{},
			"regex_error": regexError, "truncated": false,
		}
	}
	_, texts, err := loadTexts(format, path)
	if err != nil {
		return map[string]any{
			"format": nil, "matches": 0, "samples": []any{},
			"regex_error": err.Error(), "truncated": false,
		}
	}
	total := 0
	var samples []map[string]any
	truncated := false
	offset := 0
	for _, fullText := range texts {
		if len(fullText) > textReplacePreviewLimit {
			truncated = true
		}
		text := fullText
		if len(text) > textReplacePreviewLimit {
			text = text[:textReplacePreviewLimit]
		}
		count, entrySamples := scanSamples(text, pattern, useRegex, textReplaceSampleMax-len(samples))
		total += count
		for _, s := range entrySamples {
			if idx, ok := s["index"].(int); ok {
				s["index"] = idx + offset
			}
			samples = append(samples, s)
		}
		if len(samples) >= textReplaceSampleMax {
			break
		}
		offset += len(fullText)
	}
	return map[string]any{
		"format": format, "matches": total, "samples": samples,
		"regex_error": nil, "truncated": truncated,
	}
}

// replaceTxtFile 复刻 replace_txt_file。
func replaceTxtFile(srcPath, outPath string, applyFn func(string) (string, int)) (int, error) {
	data, err := os.ReadFile(srcPath)
	if err != nil {
		return 0, err
	}
	text, report := decodeWithReport(data)
	newText, count := applyFn(text)
	encoding, _ := report["encoding"].(string)
	encoded, ok := encodeText(newText, encoding)
	if !ok {
		encoded = []byte(newText)
	}
	if err := os.WriteFile(outPath, encoded, 0o644); err != nil {
		return 0, err
	}
	return count, nil
}

// replaceEpubFile 复刻 replace_epub_file。
func replaceEpubFile(srcPath, outPath string, applyFn func(string) (string, int)) (int, error) {
	entries, order, err := readZipEntries(srcPath)
	if err != nil {
		return 0, err
	}
	total := 0
	for _, name := range findTextEntries(entries) {
		text, encoding := decodeEpubEntry(entries[name])
		newText, count := applyFn(text)
		if count > 0 {
			entries[name] = encodeEpubEntry(newText, encoding)
			total += count
		}
	}
	if err := writeEpubZip(entries, order, outPath); err != nil {
		return 0, err
	}
	return total, nil
}

// 编译期引用保持。
var (
	_ = flate.BestCompression
	_ = bytes.MinRead
	_ = io.Discard
	_ = path.Join
)
