// Package media 复刻 webserver/services/media_analysis.py。
//
// 对导入的媒体文件做有界校验与内容分类：签名探测、压缩包预算检查、
// 漫画容器与 EPUB 结构校验，并给出 media_type 判定。
package media

import (
	"archive/zip"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"os"
	"path"
	"path/filepath"
	"strings"
)

// 媒体类型常量，对齐 webserver/constants.py。
const (
	TypeUnknown = "unknown"
	TypeEbook   = "ebook"
	TypeComic   = "comic"
)

// 格式集合，对齐 Python 的 frozenset 定义。
var (
	ComicZipFormats        = set("cbz", "zip")
	ComicRarFormats        = set("cbr", "rar")
	ComicContainerFormats  = union(ComicZipFormats, ComicRarFormats)
	EbookMediaFormats      = set("azw", "azw3", "epub", "mobi", "pdf", "txt")
	ManagedDocumentFormats = set("djvu", "uvz")
	OfficeDocumentFormats  = set("docx")
	XMLDocumentFormats     = set("fb2")
	HTMLArchiveFormats     = set("htmlz")
	DownloadOnlyFormats    = union(OfficeDocumentFormats, XMLDocumentFormats, HTMLArchiveFormats)
	SupportedMediaFormats  = union(EbookMediaFormats, ComicContainerFormats, ManagedDocumentFormats, DownloadOnlyFormats)
	OnlineReadFormats      = union(EbookMediaFormats, ComicContainerFormats)
)

// 资源预算上限，对齐 Python 常量。
const (
	MaxArchiveEntries           = 10000
	MaxArchiveFileBytes         = 1024 * 1024 * 1024
	MaxArchiveUncompressedBytes = 512 * 1024 * 1024
	MaxArchiveEntryBytes        = 128 * 1024 * 1024
	MaxArchiveCompressionRatio  = 200
	MaxDocumentXMLBytes         = 8 * 1024 * 1024
	MaxEpubXMLBytes             = 2 * 1024 * 1024
	MaxEpubXHTMLBytes           = 2 * 1024 * 1024
	MaxEpubSpineItems           = 2000
	EpubComicTextThreshold      = 15
)

// imageExtensions 是可识别的图片扩展名。
var imageExtensions = set(".avif", ".bmp", ".gif", ".jpeg", ".jpg", ".jxl", ".png", ".tif", ".tiff", ".webp")

// imageMIMEExtensions 是 MIME 到允许扩展名集合的映射。
//
// Python 侧的值是 frozenset，`ext in allowed` 是集合成员判断；
// 因此 image/jpeg 同时接受 .jpg 与 .jpeg，image/tiff 同时接受 .tif 与 .tiff。
var imageMIMEExtensions = map[string]map[string]bool{
	"image/jpeg": set(".jpg", ".jpeg"),
	"image/png":  set(".png"),
	"image/gif":  set(".gif"),
	"image/bmp":  set(".bmp"),
	"image/tiff": set(".tif", ".tiff"),
	"image/webp": set(".webp"),
	"image/jxl":  set(".jxl"),
	"image/avif": set(".avif"),
}

// Error 复刻 InvalidMediaError。
type Error struct {
	// Code 是错误码，如 media.unreadable。
	Code string
	// Message 是面向用户的提示。
	Message string
}

// Error 实现 error 接口。
func (e *Error) Error() string { return e.Message }

// invalid 构造一个 InvalidMediaError。
func invalid(code, message string) *Error { return &Error{Code: code, Message: message} }

// Analysis 复刻 MediaAnalysis。
type Analysis struct {
	DeclaredFormat string
	DetectedFormat string
	MIMEType       string
	MediaType      string
	Reason         string
}

// ToDict 复刻 MediaAnalysis.to_dict。
func (a Analysis) ToDict() map[string]any {
	return map[string]any{
		"declared_format": a.DeclaredFormat,
		"detected_format": a.DetectedFormat,
		"mime_type":       a.MIMEType,
		"media_type":      a.MediaType,
		"analysis_reason": a.Reason,
	}
}

// MergeMediaType 复刻 merge_media_type：保留最强的可靠分类。
func MergeMediaType(existing, incoming string) string {
	priority := map[string]int{TypeUnknown: 0, TypeEbook: 1, TypeComic: 2}
	ex, ok := priority[existing]
	if !ok {
		ex = 0
	}
	in, ok := priority[incoming]
	if !ok {
		in = 0
	}
	if in > ex {
		return incoming
	}
	return existing
}

// NormalizedMediaFormats 复刻 normalized_media_formats。
func NormalizedMediaFormats(formats []string) map[string]bool {
	out := map[string]bool{}
	for _, f := range formats {
		for _, part := range strings.FieldsFunc(f, func(r rune) bool { return r == ',' || r == ' ' }) {
			if part = strings.ToLower(strings.TrimSpace(part)); part != "" {
				out[part] = true
			}
		}
	}
	return out
}

// HasMixedMediaFormats 复刻 has_mixed_media_formats。
func HasMixedMediaFormats(formats []string) bool {
	normalized := NormalizedMediaFormats(formats)
	return intersects(normalized, EbookMediaFormats) && intersects(normalized, ComicContainerFormats)
}

// OnlineReadableFormats 复刻 online_readable_formats。
func OnlineReadableFormats(formats []string) bool {
	return intersects(NormalizedMediaFormats(formats), OnlineReadFormats)
}

// IsManagedDocumentFormat 判断单个格式是否属于受管文档（djvu/uvz）。
//
// 受管文档不解析内嵌元数据，导入时只用文件名。
func IsManagedDocumentFormat(format string) bool {
	return ManagedDocumentFormats[strings.ToLower(strings.TrimSpace(format))]
}

// IsComicContainerFormat 判断单个格式是否属于漫画容器（cbz/zip/cbr/rar）。
//
// 漫画容器不解析内嵌元数据，导入时用文件名 + 「佚名」。
func IsComicContainerFormat(format string) bool {
	return ComicContainerFormats[strings.ToLower(strings.TrimSpace(format))]
}

// readSignature 复刻 _read_signature。
func readSignature(path string, size int) ([]byte, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, invalid("media.unreadable", fmt.Sprintf("无法读取媒体文件：%v", err))
	}
	defer f.Close()
	buf := make([]byte, size)
	n, err := io.ReadFull(f, buf)
	if err != nil && !errors.Is(err, io.EOF) && !errors.Is(err, io.ErrUnexpectedEOF) {
		return nil, invalid("media.unreadable", fmt.Sprintf("无法读取媒体文件：%v", err))
	}
	return buf[:n], nil
}

// safeArchiveName 复刻 _safe_archive_name。
//
// Python 用 PurePosixPath 解析：它会折叠重复斜杠、去掉 "." 段，
// 因此 "a//b.png" 与 "a/./b.png" 都是合法路径；只有 ".." 段、
// 绝对路径与首段含冒号（Windows 盘符）才被拒绝。
func safeArchiveName(name string) bool {
	if name == "" || strings.ContainsRune(name, 0) {
		return false
	}
	normalized := strings.ReplaceAll(name, "\\", "/")
	if strings.HasPrefix(normalized, "/") {
		return false
	}
	// 对齐 PurePosixPath.parts：折叠空段与 "."，保留 ".."。
	parts := purePosixParts(normalized)
	for _, part := range parts {
		if part == ".." {
			return false
		}
	}
	if len(parts) > 0 && strings.Contains(parts[0], ":") {
		return false
	}
	return true
}

// purePosixParts 复刻 PurePosixPath.parts 的切分语义。
//
// 空段与 "." 段被丢弃，".." 段保留；前导 "/" 已被调用方排除。
func purePosixParts(p string) []string {
	out := []string{}
	for _, part := range strings.Split(p, "/") {
		if part == "" || part == "." {
			continue
		}
		out = append(out, part)
	}
	return out
}

// ignoredComicEntry 复刻 _ignored_comic_entry。
func ignoredComicEntry(name string) bool {
	normalized := strings.ReplaceAll(name, "\\", "/")
	parts := purePosixParts(normalized)
	basename := ""
	if len(parts) > 0 {
		basename = strings.ToLower(parts[len(parts)-1])
	}
	if len(parts) > 0 && strings.ToLower(parts[0]) == "__macosx" {
		return true
	}
	if basename == ".ds_store" || basename == "thumbs.db" || basename == "comicinfo.xml" {
		return true
	}
	return strings.HasPrefix(basename, "._")
}

// archiveEntry 是压缩包条目的预算检查输入。
type archiveEntry struct {
	Name           string
	FileSize       int64
	CompressedSize int64
	Encrypted      bool
	IsLink         bool
}

// checkArchiveBudget 复刻 _check_archive_budget。
func checkArchiveBudget(entries []archiveEntry) error {
	if len(entries) > MaxArchiveEntries {
		return invalid("archive.too_many_entries", "压缩包条目过多")
	}
	var totalUncompressed, totalCompressed int64
	for _, e := range entries {
		if !safeArchiveName(e.Name) {
			return invalid("archive.unsafe_path", "压缩包包含不安全路径")
		}
		if e.Encrypted {
			return invalid("archive.encrypted", "暂不支持加密压缩包")
		}
		if e.IsLink {
			return invalid("archive.link", "压缩包不能包含符号链接")
		}
		if e.FileSize < 0 || e.CompressedSize < 0 {
			return invalid("archive.invalid_size", "压缩包条目大小不合法")
		}
		if e.FileSize > MaxArchiveEntryBytes {
			return invalid("archive.entry_too_large", "压缩包单个条目过大")
		}
		if e.FileSize > 0 && e.CompressedSize == 0 {
			return invalid("archive.suspicious_ratio", "压缩包压缩比异常")
		}
		if e.CompressedSize > 0 && float64(e.FileSize)/float64(e.CompressedSize) > MaxArchiveCompressionRatio {
			return invalid("archive.suspicious_ratio", "压缩包压缩比过高")
		}
		totalUncompressed += e.FileSize
		totalCompressed += e.CompressedSize
		if totalUncompressed > MaxArchiveUncompressedBytes {
			return invalid("archive.too_large", "压缩包展开后体积过大")
		}
	}
	if totalCompressed > 0 && float64(totalUncompressed)/float64(totalCompressed) > MaxArchiveCompressionRatio {
		return invalid("archive.suspicious_ratio", "压缩包总压缩比过高")
	}
	return nil
}

// preflightArchiveFile 复刻 _preflight_archive_file。
func preflightArchiveFile(path string) error {
	info, err := os.Stat(path)
	if err != nil {
		return invalid("media.unreadable", fmt.Sprintf("无法读取媒体文件：%v", err))
	}
	if info.Size() > MaxArchiveFileBytes {
		return invalid("archive.file_too_large", "压缩包文件体积超过检测上限")
	}
	return nil
}

// preflightZipDirectory 复刻 _preflight_zip_directory。
//
// 在 ZipFile 构建攻击者可控的内存条目表之前先读 EOCD。
func preflightZipDirectory(path string) error {
	if err := preflightArchiveFile(path); err != nil {
		return err
	}
	info, err := os.Stat(path)
	if err != nil {
		return invalid("media.unreadable", fmt.Sprintf("无法读取 ZIP 目录：%v", err))
	}
	f, err := os.Open(path)
	if err != nil {
		return invalid("media.unreadable", fmt.Sprintf("无法读取 ZIP 目录：%v", err))
	}
	defer f.Close()

	const tailMax = 65535 + 22
	start := info.Size() - tailMax
	if start < 0 {
		start = 0
	}
	if _, err := f.Seek(start, io.SeekStart); err != nil {
		return invalid("media.unreadable", fmt.Sprintf("无法读取 ZIP 目录：%v", err))
	}
	tail, err := io.ReadAll(f)
	if err != nil {
		return invalid("media.unreadable", fmt.Sprintf("无法读取 ZIP 目录：%v", err))
	}

	marker := lastIndex(tail, []byte{'P', 'K', 0x05, 0x06})
	if marker < 0 || len(tail)-marker < 22 {
		return invalid("archive.corrupt", "ZIP 压缩包缺少中央目录")
	}
	rec := tail[marker : marker+22]
	diskNumber := binary.LittleEndian.Uint16(rec[4:6])
	directoryDisk := binary.LittleEndian.Uint16(rec[6:8])
	diskEntries := binary.LittleEndian.Uint16(rec[8:10])
	totalEntries := binary.LittleEndian.Uint16(rec[10:12])
	directorySize := binary.LittleEndian.Uint32(rec[12:16])
	commentSize := binary.LittleEndian.Uint16(rec[20:22])

	if marker+22+int(commentSize) != len(tail) {
		return invalid("archive.corrupt", "ZIP 中央目录长度不匹配")
	}
	if diskNumber != 0 || directoryDisk != 0 || diskEntries != totalEntries {
		return invalid("archive.multidisk", "暂不支持分卷 ZIP 压缩包")
	}
	if totalEntries == 0xFFFF || directorySize == 0xFFFFFFFF {
		return invalid("archive.zip64", "暂不支持 ZIP64 漫画或 EPUB 容器")
	}
	if int(totalEntries) > MaxArchiveEntries {
		return invalid("archive.too_many_entries", "压缩包条目过多")
	}
	return nil
}

// zipFileEntries 复刻 _zip_file_entries。
//
// 返回全部条目与其中的文件条目（目录被排除）。
func zipFileEntries(zr *zip.Reader) ([]*zip.File, []*zip.File, error) {
	names := make([]string, 0, len(zr.File))
	seen := map[string]bool{}
	for _, f := range zr.File {
		if seen[f.Name] {
			return nil, nil, invalid("archive.duplicate_entry", "压缩包包含重复路径")
		}
		seen[f.Name] = true
		names = append(names, f.Name)
	}

	entries := make([]archiveEntry, 0, len(zr.File))
	files := make([]*zip.File, 0, len(zr.File))
	for _, f := range zr.File {
		isDir := strings.HasSuffix(f.Name, "/")
		name := f.Name
		if isDir {
			name = strings.TrimRight(name, "/")
		}
		var fileSize, compressedSize int64
		if !isDir {
			fileSize = int64(f.UncompressedSize64)
			compressedSize = int64(f.CompressedSize64)
		}
		entries = append(entries, archiveEntry{
			Name:           name,
			FileSize:       fileSize,
			CompressedSize: compressedSize,
			Encrypted:      f.Flags&0x1 != 0,
			IsLink:         isSymlinkMode(f),
		})
		if !isDir {
			files = append(files, f)
		}
	}
	if err := checkArchiveBudget(entries); err != nil {
		return nil, nil, err
	}
	return zr.File, files, nil
}

// isSymlinkMode 从 ZIP 外部属性解析符号链接标志。
func isSymlinkMode(f *zip.File) bool {
	mode := f.Mode()
	return mode&os.ModeSymlink != 0
}

// detectImageMIME 复刻 _detect_image_mime。
func detectImageMIME(header []byte) string {
	switch {
	case hasPrefix(header, []byte{0xFF, 0xD8, 0xFF}):
		return "image/jpeg"
	case hasPrefix(header, []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'}):
		return "image/png"
	case hasPrefix(header, []byte("GIF87a")) || hasPrefix(header, []byte("GIF89a")):
		return "image/gif"
	case hasPrefix(header, []byte("BM")):
		return "image/bmp"
	case hasPrefix(header, []byte{'I', 'I', 0x2A, 0x00}) || hasPrefix(header, []byte{'M', 'M', 0x00, 0x2A}):
		return "image/tiff"
	case len(header) >= 12 && hasPrefix(header, []byte("RIFF")) && string(header[8:12]) == "WEBP":
		return "image/webp"
	case hasPrefix(header, []byte{0xFF, 0x0A}) ||
		hasPrefix(header, []byte{0x00, 0x00, 0x00, 0x0C, 'J', 'X', 'L', ' ', '\r', '\n', 0x87, '\n'}):
		return "image/jxl"
	}
	return ""
}

// ---------------------------------------------------------------------------
// 小工具
// ---------------------------------------------------------------------------

// set 由字符串列表构造集合。
func set(items ...string) map[string]bool {
	out := make(map[string]bool, len(items))
	for _, item := range items {
		out[item] = true
	}
	return out
}

// union 合并多个集合。
func union(sets ...map[string]bool) map[string]bool {
	out := map[string]bool{}
	for _, s := range sets {
		for k := range s {
			out[k] = true
		}
	}
	return out
}

// intersects 报告两个集合是否有交集。
func intersects(a, b map[string]bool) bool {
	for k := range a {
		if b[k] {
			return true
		}
	}
	return false
}

// hasPrefix 报告 b 是否以 prefix 开头。
func hasPrefix(b, prefix []byte) bool {
	if len(b) < len(prefix) {
		return false
	}
	for i := range prefix {
		if b[i] != prefix[i] {
			return false
		}
	}
	return true
}

// lastIndex 返回子串最后一次出现的下标，未找到返回 -1。
func lastIndex(haystack, needle []byte) int {
	if len(needle) == 0 || len(haystack) < len(needle) {
		return -1
	}
	for i := len(haystack) - len(needle); i >= 0; i-- {
		match := true
		for j := range needle {
			if haystack[i+j] != needle[j] {
				match = false
				break
			}
		}
		if match {
			return i
		}
	}
	return -1
}

// extLower 返回小写扩展名（不含点）。
func extLower(p string) string {
	return strings.ToLower(strings.TrimPrefix(filepath.Ext(p), "."))
}

// baseName 返回路径的文件名。
func baseName(p string) string { return path.Base(strings.ReplaceAll(p, "\\", "/")) }
