package library

import (
	"strconv"
	"strings"
	"time"
)

// calibreTimeLayouts 是 Calibre 可能写入 books.timestamp 的日期时间格式。
//
// Calibre 用 SQLAlchemy 的 TIMESTAMP 列，实际写入的是带时区的 ISO 字符串；
// 不同版本与不同写入路径（calibredb / GUI / 直接 SQL）的精度与后缀略有差异，
// 因此按从精确到宽松的顺序逐个尝试。
var calibreTimeLayouts = []string{
	"2006-01-02 15:04:05.999999-07:00",
	"2006-01-02 15:04:05.999999+00:00",
	"2006-01-02 15:04:05.999999",
	"2006-01-02 15:04:05-07:00",
	"2006-01-02 15:04:05",
	"2006-01-02T15:04:05.999999-07:00",
	"2006-01-02T15:04:05.999999Z07:00",
	"2006-01-02T15:04:05Z07:00",
	"2006-01-02",
}

// parseCalibreTimestamp 把 books.timestamp 的原始字节归一为 Unix 秒。
//
// 兼容三种形态：
//   - Unix 整数（旧库或测试库直接写入 int）；
//   - 日期时间字符串（Calibre 的 TIMESTAMP 列）；
//   - 空值 / 无法解析（返回 0，与 Python 侧取不到时间时的行为一致）。
func parseCalibreTimestamp(raw []byte) int64 {
	value := strings.TrimSpace(string(raw))
	if value == "" {
		return 0
	}

	// 整数形态（含负数，虽然时间戳不会为负）。
	if n, err := strconv.ParseInt(value, 10, 64); err == nil {
		return n
	}

	for _, layout := range calibreTimeLayouts {
		parsed, err := time.Parse(layout, value)
		if err == nil {
			return parsed.Unix()
		}
	}
	return 0
}

// ParseCalibreTimestamp normalizes Calibre datetime text and legacy Unix values
// for lightweight catalog consumers using the same ordering as full book data.
func ParseCalibreTimestamp(raw []byte) int64 { return parseCalibreTimestamp(raw) }
