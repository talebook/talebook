// Package mobimeta 从 MOBI / AZW / AZW3 文件里读取内嵌元数据。
//
// 对应 Calibre 的 calibre.ebooks.metadata.mobi.get_metadata：
// MOBI 是 Palm Database（PDB）容器，元数据分布在两处：
//   - PalmDB 容器头（偏移 0x00 起）：name 字段可作为书名回退
//   - MOBI 头（PalmDOC 头之后）：full name 偏移与 EXTH 记录区
//   - EXTH 记录：100=作者、101=出版社、103=简介、104=ISBN、
//     105=主题、106=出版日期、503=更新书名
//
// 本实现只读元数据，不解析正文，因此不依赖 Calibre。
package mobimeta

import (
	"encoding/binary"
	"errors"
	"fmt"
	"strings"
	"unicode/utf8"
)

// ErrInvalidContainer 表示文件不是合法的 MOBI/PDB 容器。
var ErrInvalidContainer = errors.New("mobimeta: 不是合法的 MOBI 容器")

// Metadata 是从 MOBI 文件解析出的元数据。
type Metadata struct {
	Title     string
	Authors   []string
	Publisher string
	Published string
	Language  string
	ISBN      string
	Tags      []string
	Comments  string
}

// EXTH 记录类型编号（对应 Calibre 的 EXTH 常量）。
const (
	exthAuthor    = 100
	exthPublisher = 101
	exthComment   = 103
	exthISBN      = 104
	exthSubject   = 105
	exthPublishDt = 106
	exthTitle     = 503
	exthLanguage  = 524
	// exthCoverOffset 是相对 first_image_index 的记录偏移。
	exthCoverOffset = 201
)

// Cover 从 MOBI 字节流里取出内嵌封面图片。
//
// 返回 (图片字节, 是否找到)。MOBI 用 EXTH 201 记录封面相对首张图片记录的
// 偏移；图片本身是 PalmDB 里的一条独立记录，通常为 JPEG 或 GIF。
// 没有封面、偏移越界或记录为空时返回 ok=false，不报错。
func Cover(data []byte) ([]byte, bool) {
	if len(data) < 78 {
		return nil, false
	}
	numRecords := int(binary.BigEndian.Uint16(data[76:78]))
	if numRecords < 2 {
		return nil, false
	}
	indexEnd := 78 + numRecords*8
	if len(data) < indexEnd {
		return nil, false
	}

	// Calibre BookHeader: first image record is record-0 offset 0x6c.
	// EXTH 201 is a record offset from that base (including non-image records).
	rec0Off := recordOffset(data, 0)
	if rec0Off < indexEnd || rec0Off+0x70 > len(data) {
		return nil, false
	}
	first := uint64(binary.BigEndian.Uint32(data[rec0Off+0x6c : rec0Off+0x70]))
	coverOffset, hasCover := exthIntValue(data, indexEnd, exthCoverOffset)
	if hasCover && coverOffset != ^uint32(0) {
		record := first + uint64(coverOffset)
		if record < uint64(numRecords) {
			return imageAtRecord(data, numRecords, int(record))
		}
		return nil, false
	}
	// Legacy books without a declared cover may use the first image as cover.
	if first < uint64(numRecords) {
		return imageByIndex(data, numRecords, int(first), 0)
	}

	return nil, false
}

// imageByIndex 返回从 start 记录起第 n 张图片（n 从 0 开始）。
//
// 仅用于缺少封面声明的旧文件回退，声明偏移使用 imageAtRecord。
func imageByIndex(data []byte, numRecords, start, n int) ([]byte, bool) {
	if n < 0 {
		return nil, false
	}
	seen := 0
	for i := start; i < numRecords; i++ {
		img, ok := imageAtRecord(data, numRecords, i)
		if !ok {
			continue
		}
		if seen == n {
			return img, true
		}
		seen++
	}
	return nil, false
}

// imageAtRecord 取出第 i 条记录，并确认它确实是图片。
func imageAtRecord(data []byte, numRecords, i int) ([]byte, bool) {
	if i < 0 || i >= numRecords {
		return nil, false
	}
	start := recordOffset(data, i)
	if start < 0 || start >= len(data) {
		return nil, false
	}
	end := len(data)
	if i+1 < numRecords {
		if next := recordOffset(data, i+1); next > start {
			end = next
		}
	}
	if end <= start {
		return nil, false
	}
	img := data[start:end]
	if !isImageBytes(img) {
		return nil, false
	}
	return img, true
}

// isImageBytes 按魔数判断是否为支持的图片格式。
func isImageBytes(b []byte) bool {
	if len(b) < 4 {
		return false
	}
	// JPEG: FF D8 FF
	if b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF {
		return true
	}
	// PNG: 89 50 4E 47
	if b[0] == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47 {
		return true
	}
	// GIF: GIF8
	if b[0] == 'G' && b[1] == 'I' && b[2] == 'F' && b[3] == '8' {
		return true
	}
	// BMP: BM
	if b[0] == 'B' && b[1] == 'M' {
		return true
	}
	return false
}

// recordOffset 返回第 i 条 PalmDB 记录的起始偏移；越界返回 -1。
func recordOffset(data []byte, i int) int {
	pos := 78 + i*8
	if pos+4 > len(data) {
		return -1
	}
	return int(binary.BigEndian.Uint32(data[pos : pos+4]))
}

// exthIntValue 读出指定 EXTH 类型的整数值（4 字节大端）。
func exthIntValue(data []byte, indexEnd int, want uint32) (uint32, bool) {
	rec0Off := int(binary.BigEndian.Uint32(data[78:82]))
	if rec0Off < indexEnd || rec0Off+24 > len(data) {
		return 0, false
	}
	return exthIntValueRecord0(data[rec0Off:], want)
}

func exthIntValueRecord0(rec0 []byte, want uint32) (uint32, bool) {
	if len(rec0) < 24 {
		return 0, false
	}
	if string(rec0[16:20]) != "MOBI" {
		return 0, false
	}
	headerLen := int(binary.BigEndian.Uint32(rec0[20:24]))
	exthStart := 16 + headerLen
	if exthStart+12 > len(rec0) || string(rec0[exthStart:exthStart+4]) != "EXTH" {
		return 0, false
	}
	b := rec0[exthStart:]
	count := int(binary.BigEndian.Uint32(b[8:12]))
	pos := 12
	for i := 0; i < count; i++ {
		if pos+8 > len(b) {
			return 0, false
		}
		recType := binary.BigEndian.Uint32(b[pos : pos+4])
		recLen := int(binary.BigEndian.Uint32(b[pos+4 : pos+8]))
		if recLen < 8 || pos+recLen > len(b) {
			return 0, false
		}
		if recType == want && recLen-8 >= 4 {
			return binary.BigEndian.Uint32(b[pos+8 : pos+12]), true
		}
		pos += recLen
	}
	return 0, false
}

// Extract 从 MOBI 字节流里读取元数据。
func Extract(data []byte) (*Metadata, error) {
	// PalmDB 头 78 字节，随后是记录索引表。
	if len(data) < 78 {
		return nil, ErrInvalidContainer
	}
	numRecords := int(binary.BigEndian.Uint16(data[76:78]))
	if numRecords == 0 {
		return nil, ErrInvalidContainer
	}
	// 记录索引表每项 8 字节，第一项给出记录 0 的偏移。
	indexEnd := 78 + numRecords*8
	if len(data) < indexEnd {
		return nil, ErrInvalidContainer
	}
	rec0Off := int(binary.BigEndian.Uint32(data[78:82]))
	if rec0Off < indexEnd || rec0Off >= len(data) {
		return nil, ErrInvalidContainer
	}
	rec0 := data[rec0Off:]

	// PalmDOC 头 16 字节：compression(2) unused(2) textLength(4)
	// recordCount(2) recordSize(2) encryption(2) unused(2)
	if len(rec0) < 16 {
		return nil, ErrInvalidContainer
	}
	mi := &Metadata{}

	// MOBI 头紧跟 PalmDOC 头，以 "MOBI" 魔数开头。
	if len(rec0) < 24 || string(rec0[16:20]) != "MOBI" {
		// 纯 PalmDOC（无 MOBI 头）：只能从 PDB name 取书名。
		mi.Title = pdbName(data)
		if mi.Title == "" {
			return nil, ErrInvalidContainer
		}
		return mi, nil
	}

	headerLen := int(binary.BigEndian.Uint32(rec0[20:24]))
	// MOBI 头内部字段偏移（相对 MOBI 头起点 16）。
	mobi := rec0[16:]
	if len(mobi) < 116 {
		return nil, ErrInvalidContainer
	}
	// full name 偏移与长度位于记录 0 的 0x54 / 0x58（包含 16 字节 PalmDOC 头）。
	fullNameOff := int(binary.BigEndian.Uint32(rec0[0x54:0x58]))
	fullNameLen := int(binary.BigEndian.Uint32(rec0[0x58:0x5C]))

	// 书名：优先 EXTH 503，其次 MOBI full name，最后 PDB name。
	if fullNameLen > 0 && fullNameOff > 0 && fullNameOff+fullNameLen <= len(rec0) {
		mi.Title = decodeText(rec0[fullNameOff : fullNameOff+fullNameLen])
	}
	if mi.Title == "" {
		mi.Title = pdbName(data)
	}

	// EXTH 区紧跟 MOBI 头。注意：MOBI 头 0x80 的 exthFlags 位并不可靠
	// （真实样本 exthFlags=0 却存在 EXTH 区），因此以 "EXTH" 魔数为准。
	exthStart := 16 + headerLen
	if exthStart+12 <= len(rec0) && string(rec0[exthStart:exthStart+4]) == "EXTH" {
		parseEXTH(rec0[exthStart:], mi)
	}

	mi.Title = strings.TrimSpace(mi.Title)
	if mi.Title == "" {
		return nil, ErrInvalidContainer
	}
	return mi, nil
}

// parseEXTH 解析 EXTH 记录区，把已知类型写入 mi。
func parseEXTH(b []byte, mi *Metadata) {
	if len(b) < 12 {
		return
	}
	recordCount := int(binary.BigEndian.Uint32(b[8:12]))
	pos := 12
	for i := 0; i < recordCount; i++ {
		if pos+8 > len(b) {
			return
		}
		recType := binary.BigEndian.Uint32(b[pos : pos+4])
		recLen := int(binary.BigEndian.Uint32(b[pos+4 : pos+8]))
		if recLen < 8 || pos+recLen > len(b) {
			return
		}
		val := decodeText(b[pos+8 : pos+recLen])
		applyEXTH(mi, recType, val)
		pos += recLen
	}
}

// applyEXTH 把单条 EXTH 记录写入元数据。
func applyEXTH(mi *Metadata, recType uint32, val string) {
	val = strings.TrimSpace(val)
	if val == "" {
		return
	}
	switch recType {
	case exthTitle:
		mi.Title = val
	case exthAuthor:
		mi.Authors = append(mi.Authors, val)
	case exthPublisher:
		mi.Publisher = val
	case exthComment:
		mi.Comments = val
	case exthISBN:
		mi.ISBN = val
	case exthSubject:
		mi.Tags = append(mi.Tags, val)
	case exthPublishDt:
		mi.Published = val
	case exthLanguage:
		mi.Language = val
	}
}

// pdbName 读取 PalmDB 头的 name 字段（32 字节，NUL 结尾）。
func pdbName(data []byte) string {
	if len(data) < 32 {
		return ""
	}
	raw := data[0:32]
	if i := indexByte(raw, 0); i >= 0 {
		raw = raw[:i]
	}
	return strings.TrimSpace(decodeText(raw))
}

// indexByte 返回 b 中第一个 c 的下标，找不到返回 -1。
func indexByte(b []byte, c byte) int {
	for i, x := range b {
		if x == c {
			return i
		}
	}
	return -1
}

// decodeText 把 MOBI 里的字节串解码为 UTF-8 字符串。
//
// MOBI 的文本编码由 MOBI 头的 encoding 字段决定（1252 或 65001），
// 但元数据字段绝大多数是 UTF-8；这里先按 UTF-8 校验，失败则按
// Latin-1 逐字节提升，保证不丢字符。
func decodeText(b []byte) string {
	b = trimNUL(b)
	if len(b) == 0 {
		return ""
	}
	if utf8.Valid(b) {
		return string(b)
	}
	var sb strings.Builder
	for _, c := range b {
		sb.WriteRune(rune(c))
	}
	return sb.String()
}

// trimNUL 去掉尾部的 NUL 字节。
func trimNUL(b []byte) []byte {
	for len(b) > 0 && b[len(b)-1] == 0 {
		b = b[:len(b)-1]
	}
	return b
}

// String 便于调试。
func (m *Metadata) String() string {
	if m == nil {
		return "<nil>"
	}
	return fmt.Sprintf("Metadata{title=%q authors=%v publisher=%q}",
		m.Title, m.Authors, m.Publisher)
}
