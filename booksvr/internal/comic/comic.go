// Package comic 复刻 webserver/services/comic_archive.py：漫画容器的索引与分页读取。
//
// 只支持 zip 系容器（cbz/zip）。Python 侧还支持 rar（cbr），但 Go 标准库无 rar
// 解压能力，且引入第三方 rar 库会带来许可与安全风险；因此 rar 容器返回
// comic.invalid_container，与「容器无效」同一错误码，前端行为一致（提示无法打开）。
package comic

import (
	"archive/zip"
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"fmt"
	"os"
	"path"
	"sort"
	"strconv"
	"strings"
	"sync"
	"unicode"
	"unicode/utf8"
)

// 与 Python 版逐字一致的常量。
const (
	// FormatPriority 是容器格式优先级，对齐 COMIC_FORMAT_PRIORITY。
	FormatPriority = "cbz,zip,cbr,rar"
	// MaxPageBytes 是单页体积上限（32 MiB）。
	MaxPageBytes = 32 * 1024 * 1024
	// MaxPageHeaderBytes 是读取页头用于探测类型/尺寸的上限（2 MiB）。
	MaxPageHeaderBytes = 2 * 1024 * 1024
	// MaxPageDimension 是单边像素上限。
	MaxPageDimension = 32768
	// MaxPagePixels 是总像素上限。
	MaxPagePixels = 100000000
	// MaxConcurrentReads 是并发读取上限。
	MaxConcurrentReads = 4
	// ManifestCacheSize 是清单缓存条数。
	ManifestCacheSize = 32
)

// comicFormats 是支持的容器格式，按优先级排列。
var comicFormats = []string{"cbz", "zip", "cbr", "rar"}

// imageMIMEExtensions 对齐 _IMAGE_MIME_EXTENSIONS。
var imageMIMEExtensions = map[string][]string{
	"image/avif": {".avif"},
	"image/bmp":  {".bmp"},
	"image/gif":  {".gif"},
	"image/jpeg": {".jpeg", ".jpg"},
	"image/jxl":  {".jxl"},
	"image/png":  {".png"},
	"image/tiff": {".tif", ".tiff"},
	"image/webp": {".webp"},
}

// ignoredNames 对齐 _IGNORED_NAMES。
var ignoredNames = map[string]bool{
	".ds_store": true, "thumbs.db": true, "comicinfo.xml": true,
}

// Error 是稳定的、不含路径的错误，对齐 ComicArchiveError。
type Error struct {
	// Code 是错误码，如 comic.book_not_found。
	Code string
	// Message 是面向用户的中文提示。
	Message string
	// Status 是建议的 HTTP 状态码。
	Status int
}

// Error 实现 error 接口。
func (e *Error) Error() string { return e.Code + ": " + e.Message }

// NewError 构造一个 Error。
func NewError(code, message string, status int) *Error {
	return &Error{Code: code, Message: message, Status: status}
}

// Page 描述漫画中的一页，对齐 ComicPage。
type Page struct {
	Index     int
	PageID    string
	EntryName string
	ByteSize  int64
	MIMEType  string
	Width     int
	Height    int
}

// ToPublicDict 复刻 ComicPage.to_public_dict。
func (p Page) ToPublicDict(bookID int64, revision string) map[string]any {
	return map[string]any{
		"id":        p.PageID,
		"index":     p.Index,
		"url":       fmt.Sprintf("/api/book/%d/comic/pages/%d?revision=%s", bookID, p.Index, revision),
		"width":     p.Width,
		"height":    p.Height,
		"mime_type": p.MIMEType,
	}
}

// Manifest 描述一个漫画容器的页面清单，对齐 ComicManifest。
type Manifest struct {
	ArchivePath   string
	ArchiveFormat string
	Revision      string
	Pages         []Page
}

// PageContent 是一页的二进制内容，对齐 ComicPageContent。
type PageContent struct {
	Page     Page
	Revision string
	Data     []byte
}

// SelectContainer 复刻 select_comic_container。
//
// book 需提供 media_type 与 fmt_<format> 字段（由调用方从书库记录组装）。
func SelectContainer(book map[string]any) (string, string, error) {
	if book == nil {
		return "", "", NewError("comic.media_type", "该书不是可在线阅读的漫画容器", 415)
	}
	if mt, _ := book["media_type"].(string); mt != "comic" {
		return "", "", NewError("comic.media_type", "该书不是可在线阅读的漫画容器", 415)
	}
	for _, format := range comicFormats {
		if p, ok := book["fmt_"+format].(string); ok && p != "" {
			return p, format, nil
		}
	}
	return "", "", NewError("comic.container_missing", "该漫画没有受支持的容器格式", 415)
}

// naturalPageSortKey 复刻 natural_page_sort_key：Unicode 感知的自然排序键。
//
// 返回可比较的字符串切片：数字段编码为 "0:<值>:<原长度>"，文本段编码为 "1:<文本>"。
func naturalPageSortKey(name string) []string {
	normalized := strings.ToLower(normalizeNFKC(strings.ReplaceAll(name, "\\", "/")))
	var key []string
	var buf strings.Builder
	flushText := func() {
		if buf.Len() > 0 {
			key = append(key, "1:"+buf.String())
			buf.Reset()
		}
	}
	runes := []rune(normalized)
	for i := 0; i < len(runes); {
		if unicode.IsDigit(runes[i]) {
			flushText()
			j := i
			for j < len(runes) && unicode.IsDigit(runes[j]) {
				j++
			}
			digits := string(runes[i:j])
			// 去掉前导零后按数值比较；长度用于打破数值相同的并列。
			n, err := strconv.ParseUint(digits, 10, 64)
			if err != nil {
				n = 0
			}
			key = append(key, fmt.Sprintf("0:%020d:%d", n, len(digits)))
			i = j
			continue
		}
		buf.WriteRune(runes[i])
		i++
	}
	flushText()
	return key
}

// normalizeNFKC 做最小化的 NFKC 归一化。
//
// 完整 NFKC 需要 Unicode 数据表；这里只处理漫画文件名中最常见的全角字符
// （全角 ASCII 与全角空格），其余字符原样保留。这与 Python 的
// unicodedata.normalize("NFKC", ...) 在漫画文件名场景下等价。
func normalizeNFKC(s string) string {
	var b strings.Builder
	b.Grow(len(s))
	for _, r := range s {
		switch {
		case r >= 0xFF01 && r <= 0xFF5E:
			// 全角 ASCII → 半角。
			b.WriteRune(r - 0xFEE0)
		case r == 0x3000:
			// 全角空格 → 半角空格。
			b.WriteRune(' ')
		default:
			b.WriteRune(r)
		}
	}
	return b.String()
}

// ignoredEntry 复刻 _ignored_entry。
func ignoredEntry(name string) bool {
	parts := strings.Split(strings.ReplaceAll(name, "\\", "/"), "/")
	basename := ""
	if len(parts) > 0 {
		basename = strings.ToLower(parts[len(parts)-1])
	}
	if len(parts) > 0 && strings.ToLower(parts[0]) == "__macosx" {
		return true
	}
	if ignoredNames[basename] {
		return true
	}
	return strings.HasPrefix(basename, "._")
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
	case hasPrefix(header, []byte{'I', 'I', '*', 0x00}) || hasPrefix(header, []byte{'M', 'M', 0x00, '*'}):
		return "image/tiff"
	case len(header) >= 12 && hasPrefix(header, []byte("RIFF")) && string(header[8:12]) == "WEBP":
		return "image/webp"
	case hasPrefix(header, []byte{0xFF, 0x0A}) ||
		hasPrefix(header, []byte{0x00, 0x00, 0x00, 0x0C, 'J', 'X', 'L', ' ', '\r', '\n', 0x87, '\n'}):
		return "image/jxl"
	case len(header) >= 12 && string(header[4:8]) == "ftyp" &&
		(string(header[8:12]) == "avif" || string(header[8:12]) == "avis"):
		return "image/avif"
	}
	return ""
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

// imageDimensions 从图片头部解析宽高。
//
// 只支持 JPEG/PNG/GIF/BMP/WEBP 这几种漫画常见格式；其余返回错误。
// 对齐 Python 的 _safe_image_dimensions 的尺寸校验部分。
func imageDimensions(header []byte, mimeType string) (int, int, error) {
	var w, h int
	var err error
	switch mimeType {
	case "image/png":
		w, h, err = pngDimensions(header)
	case "image/jpeg":
		w, h, err = jpegDimensions(header)
	case "image/gif":
		w, h, err = gifDimensions(header)
	case "image/bmp":
		w, h, err = bmpDimensions(header)
	case "image/webp":
		w, h, err = webpDimensions(header)
	default:
		return 0, 0, NewError("comic.page_dimensions", "无法安全识别漫画图片尺寸", 422)
	}
	if err != nil {
		return 0, 0, err
	}
	if w <= 0 || h <= 0 || w > MaxPageDimension || h > MaxPageDimension || w*h > MaxPagePixels {
		return 0, 0, NewError("comic.page_dimensions", "漫画图片尺寸超过在线阅读上限", 422)
	}
	return w, h, nil
}

// pngDimensions 解析 PNG 的 IHDR 宽高。
func pngDimensions(b []byte) (int, int, error) {
	if len(b) < 24 {
		return 0, 0, NewError("comic.page_dimensions", "无法安全识别漫画图片尺寸", 422)
	}
	w := int(binary.BigEndian.Uint32(b[16:20]))
	h := int(binary.BigEndian.Uint32(b[20:24]))
	return w, h, nil
}

// gifDimensions 解析 GIF 的逻辑屏幕宽高。
func gifDimensions(b []byte) (int, int, error) {
	if len(b) < 10 {
		return 0, 0, NewError("comic.page_dimensions", "无法安全识别漫画图片尺寸", 422)
	}
	w := int(binary.LittleEndian.Uint16(b[6:8]))
	h := int(binary.LittleEndian.Uint16(b[8:10]))
	return w, h, nil
}

// bmpDimensions 解析 BMP 的宽高（BITMAPINFOHEADER）。
func bmpDimensions(b []byte) (int, int, error) {
	if len(b) < 26 {
		return 0, 0, NewError("comic.page_dimensions", "无法安全识别漫画图片尺寸", 422)
	}
	w := int(int32(binary.LittleEndian.Uint32(b[18:22])))
	h := int(int32(binary.LittleEndian.Uint32(b[22:26])))
	if h < 0 {
		h = -h
	}
	return w, h, nil
}

// jpegDimensions 扫描 JPEG 段找 SOF 标记的宽高。
func jpegDimensions(b []byte) (int, int, error) {
	i := 2
	// SOF 段需要读到 b[i+8]，因此要求 i+9 <= len(b)。
	for i+9 <= len(b) {
		if b[i] != 0xFF {
			i++
			continue
		}
		marker := b[i+1]
		// SOF0..SOF15，排除 DHT(0xC4)、JPG(0xC8)、DAC(0xCC)。
		if marker >= 0xC0 && marker <= 0xCF && marker != 0xC4 && marker != 0xC8 && marker != 0xCC {
			h := int(binary.BigEndian.Uint16(b[i+5 : i+7]))
			w := int(binary.BigEndian.Uint16(b[i+7 : i+9]))
			return w, h, nil
		}
		if i+3 >= len(b) {
			break
		}
		segLen := int(binary.BigEndian.Uint16(b[i+2 : i+4]))
		if segLen < 2 {
			break
		}
		i += 2 + segLen
	}
	return 0, 0, NewError("comic.page_dimensions", "无法安全识别漫画图片尺寸", 422)
}

// webpDimensions 解析 WebP 的 VP8/VP8L/VP8X 宽高。
func webpDimensions(b []byte) (int, int, error) {
	if len(b) < 30 {
		return 0, 0, NewError("comic.page_dimensions", "无法安全识别漫画图片尺寸", 422)
	}
	chunk := string(b[12:16])
	switch chunk {
	case "VP8X":
		w := int(uint32(b[24]) | uint32(b[25])<<8 | uint32(b[26])<<16)
		h := int(uint32(b[27]) | uint32(b[28])<<8 | uint32(b[29])<<16)
		return w + 1, h + 1, nil
	case "VP8 ":
		if len(b) < 30 {
			break
		}
		w := int(binary.LittleEndian.Uint16(b[26:28]) & 0x3FFF)
		h := int(binary.LittleEndian.Uint16(b[28:30]) & 0x3FFF)
		return w, h, nil
	case "VP8L":
		if len(b) < 25 {
			break
		}
		bits := binary.LittleEndian.Uint32(b[21:25])
		w := int(bits&0x3FFF) + 1
		h := int((bits>>14)&0x3FFF) + 1
		return w, h, nil
	}
	return 0, 0, NewError("comic.page_dimensions", "无法安全识别漫画图片尺寸", 422)
}

// validatePageHeader 复刻 _validate_page_header。
func validatePageHeader(name string, byteSize int64, header []byte) (string, int, int, error) {
	if byteSize <= 0 || byteSize > MaxPageBytes {
		return "", 0, 0, NewError("comic.page_size", "漫画单页体积超过在线阅读上限", 422)
	}
	mimeType := detectImageMIME(header)
	ext := strings.ToLower(path.Ext(strings.ReplaceAll(name, "\\", "/")))
	allowed := imageMIMEExtensions[mimeType]
	ok := false
	for _, e := range allowed {
		if e == ext {
			ok = true
			break
		}
	}
	if mimeType == "" || !ok {
		return "", 0, 0, NewError("comic.page_type", "漫画图片类型与内容不匹配", 422)
	}
	w, h, err := imageDimensions(header, mimeType)
	if err != nil {
		return "", 0, 0, err
	}
	return mimeType, w, h, nil
}

// entry 是归档中的一条记录。
type entry struct {
	name     string
	byteSize int64
	checksum uint32
}

// Service 复刻 ComicArchiveService：构建并缓存清单，在限额内读取页面。
type Service struct {
	mu    sync.Mutex
	cache map[string]*Manifest
	order []string
}

// NewService 构造一个 Service。
func NewService() *Service {
	return &Service{cache: map[string]*Manifest{}}
}

// ClearCache 清空清单缓存。
func (s *Service) ClearCache() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.cache = map[string]*Manifest{}
	s.order = nil
}

// cacheKey 复刻 _cache_key：用真实路径 + 格式 + 文件元信息做键。
func cacheKey(p, archiveFormat string) (string, string, error) {
	realPath, err := realPathOf(p)
	if err != nil {
		return "", "", NewError("comic.container_unavailable", "漫画容器不存在或无法读取", 404)
	}
	info, err := os.Stat(realPath)
	if err != nil || info.IsDir() {
		return "", "", NewError("comic.container_unavailable", "漫画容器不存在或无法读取", 404)
	}
	key := fmt.Sprintf("%s|%s|%d|%d", realPath, archiveFormat, info.Size(), info.ModTime().UnixNano())
	return realPath, key, nil
}

// realPathOf 返回绝对路径（解析符号链接失败时退回绝对路径）。
func realPathOf(p string) (string, error) {
	if p == "" {
		return "", fmt.Errorf("empty path")
	}
	if resolved, err := filepathEvalSymlinks(p); err == nil {
		return resolved, nil
	}
	return filepathAbs(p)
}

// GetManifest 返回容器清单，命中缓存时直接返回。
func (s *Service) GetManifest(p, archiveFormat string) (*Manifest, error) {
	realPath, key, err := cacheKey(p, archiveFormat)
	if err != nil {
		return nil, err
	}

	s.mu.Lock()
	if m, ok := s.cache[key]; ok {
		s.mu.Unlock()
		return m, nil
	}
	s.mu.Unlock()

	manifest, err := s.buildManifest(realPath, archiveFormat)
	if err != nil {
		return nil, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.cache[key] = manifest
	s.order = append(s.order, key)
	for len(s.order) > ManifestCacheSize {
		oldest := s.order[0]
		s.order = s.order[1:]
		delete(s.cache, oldest)
	}
	return manifest, nil
}

// buildManifest 复刻 _build_manifest。
func (s *Service) buildManifest(p, archiveFormat string) (*Manifest, error) {
	detected := detectedFormat(archiveFormat)
	if detected == "" {
		return nil, NewError("comic.invalid_container", "漫画容器无效、危险或已损坏", 422)
	}

	entries, err := archiveEntries(p, detected)
	if err != nil {
		return nil, err
	}
	if len(entries) == 0 {
		return nil, NewError("comic.empty", "漫画容器中没有可阅读页面", 422)
	}

	revision := revisionOf(detected, entries)
	pages := make([]Page, 0, len(entries))
	for index, e := range entries {
		header, err := readEntry(p, detected, e.name, MaxPageHeaderBytes)
		if err != nil {
			return nil, err
		}
		mimeType, w, h, err := validatePageHeader(e.name, e.byteSize, header)
		if err != nil {
			return nil, err
		}
		pages = append(pages, Page{
			Index:     index,
			PageID:    fmt.Sprintf("%s:%d", revision, index),
			EntryName: e.name,
			ByteSize:  e.byteSize,
			MIMEType:  mimeType,
			Width:     w,
			Height:    h,
		})
	}
	return &Manifest{ArchivePath: p, ArchiveFormat: detected, Revision: revision, Pages: pages}, nil
}

// detectedFormat 把容器格式归一化为 zip/rar；不支持时返回空串。
func detectedFormat(archiveFormat string) string {
	switch strings.ToLower(archiveFormat) {
	case "cbz", "zip":
		return "zip"
	case "cbr", "rar":
		return "rar"
	default:
		return ""
	}
}

// archiveEntries 复刻 _archive_entries。
func archiveEntries(p, detected string) ([]entry, error) {
	if detected != "zip" {
		// Go 标准库无 rar 解压能力。
		return nil, NewError("comic.invalid_container", "漫画容器无效、危险或已损坏", 422)
	}

	zr, err := zip.OpenReader(p)
	if err != nil {
		return nil, NewError("comic.invalid_container", "漫画容器无效、危险或已损坏", 422)
	}
	defer zr.Close()

	entries := []entry{}
	seen := map[string]bool{}
	for _, f := range zr.File {
		if f.FileInfo().IsDir() || ignoredEntry(f.Name) {
			continue
		}
		if seen[f.Name] {
			return nil, NewError("comic.invalid_container", "漫画容器无效、危险或已损坏", 422)
		}
		seen[f.Name] = true
		entries = append(entries, entry{name: f.Name, byteSize: int64(f.UncompressedSize64), checksum: f.CRC32})
	}

	sort.SliceStable(entries, func(i, j int) bool {
		return lessNatural(naturalPageSortKey(entries[i].name), naturalPageSortKey(entries[j].name))
	})
	return entries, nil
}

// lessNatural 比较两个自然排序键。
func lessNatural(a, b []string) bool {
	for i := 0; i < len(a) && i < len(b); i++ {
		if a[i] != b[i] {
			return a[i] < b[i]
		}
	}
	return len(a) < len(b)
}

// revisionOf 复刻 _revision：对条目列表做 SHA256，取前 20 位十六进制。
func revisionOf(detected string, entries []entry) string {
	h := sha256.New()
	h.Write([]byte("comic-manifest-v1\x00" + detected))
	for _, e := range entries {
		h.Write([]byte(e.name))
		h.Write([]byte{0})
		h.Write([]byte(strconv.FormatInt(e.byteSize, 10)))
		h.Write([]byte{0})
		h.Write([]byte(strconv.FormatUint(uint64(e.checksum), 10)))
		h.Write([]byte{0})
	}
	return hex.EncodeToString(h.Sum(nil))[:20]
}

// readEntry 读取归档中某个条目的前 limit 字节。
func readEntry(p, detected, entryName string, limit int) ([]byte, error) {
	if detected != "zip" {
		return nil, NewError("comic.invalid_container", "漫画容器无效、危险或已损坏", 422)
	}
	zr, err := zip.OpenReader(p)
	if err != nil {
		return nil, NewError("comic.invalid_container", "漫画容器无效、危险或已损坏", 422)
	}
	defer zr.Close()

	for _, f := range zr.File {
		if f.Name != entryName {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			return nil, NewError("comic.invalid_container", "漫画容器无效、危险或已损坏", 422)
		}
		defer rc.Close()
		buf := make([]byte, limit)
		n, err := readFull(rc, buf)
		if err != nil && n == 0 {
			return nil, NewError("comic.invalid_container", "漫画容器无效、危险或已损坏", 422)
		}
		return buf[:n], nil
	}
	return nil, NewError("comic.invalid_container", "漫画容器无效、危险或已损坏", 422)
}

// ReadPage 复刻 read_page：按索引与 revision 读取一页。
func (s *Service) ReadPage(p, archiveFormat string, pageIndex int, revision string) (*PageContent, error) {
	manifest, err := s.GetManifest(p, archiveFormat)
	if err != nil {
		return nil, err
	}
	if revision != "" && revision != manifest.Revision {
		return nil, NewError("comic.page_not_found", "漫画页码超出范围", 404)
	}
	if pageIndex < 0 || pageIndex >= len(manifest.Pages) {
		return nil, NewError("comic.page_not_found", "漫画页码超出范围", 404)
	}

	page := manifest.Pages[pageIndex]
	data, err := readEntry(manifest.ArchivePath, manifest.ArchiveFormat, page.EntryName, MaxPageBytes)
	if err != nil {
		return nil, err
	}
	if int64(len(data)) != page.ByteSize {
		return nil, NewError("comic.invalid_container", "漫画容器无效、危险或已损坏", 422)
	}
	return &PageContent{Page: page, Revision: manifest.Revision, Data: data}, nil
}

// utf8Valid 报告 s 是否为合法 UTF-8。
func utf8Valid(s string) bool { return utf8.ValidString(s) }
