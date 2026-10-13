package metasource

import (
	"strconv"
	"strings"
	"time"
)

// datePattern 是 strptime 风格格式的解析规则。
//
// Python 的 strptime 接受非零填充的数字（"2024-1-2" 能匹配 "%Y-%m-%d"），
// 而 Go 的 time.Parse 要求严格零填充，因此这里手写解析。
type datePattern struct {
	// layout 是 Go 风格布局，仅用于文档与测试对照。
	layout string
	// parts 是待匹配的字面量与字段序列。
	parts []datePart
}

// datePart 是格式中的一段：字面量或字段。
type datePart struct {
	literal string
	field   byte // 'Y' 年、'm' 月、'd' 日；0 表示纯字面量
	// maxWidth 是该字段最多吃掉的数字位数，0 表示不限。
	//
	// Python 的 strptime 对 %Y 固定取 4 位、%m/%d 最多取 2 位，
	// 因此 "20240102" 无法匹配 "%Y"（会剩下 "0102" 导致整体失败）。
	maxWidth int
}

// buildPattern 把 strptime 格式串编译为 datePattern。
func buildPattern(format string) datePattern {
	p := datePattern{layout: format}
	var lit strings.Builder
	for i := 0; i < len(format); {
		if format[i] == '%' && i+1 < len(format) {
			if lit.Len() > 0 {
				p.parts = append(p.parts, datePart{literal: lit.String()})
				lit.Reset()
			}
			switch format[i+1] {
			case 'Y':
				p.parts = append(p.parts, datePart{field: 'Y', maxWidth: 4})
			case 'm':
				p.parts = append(p.parts, datePart{field: 'm', maxWidth: 2})
			case 'd':
				p.parts = append(p.parts, datePart{field: 'd', maxWidth: 2})
			default:
				// 未支持的指令按字面量处理。
				lit.WriteString(format[i : i+2])
			}
			i += 2
			continue
		}
		lit.WriteByte(format[i])
		i++
	}
	if lit.Len() > 0 {
		p.parts = append(p.parts, datePart{literal: lit.String()})
	}
	return p
}

// match 尝试按该格式解析 s，成功返回时间与 true。
func (p datePattern) match(s string) (time.Time, bool) {
	year, month, day := 0, 1, 1
	hasYear, hasMonth, hasDay := false, false, false
	rest := s

	for _, part := range p.parts {
		if part.field == 0 {
			if !strings.HasPrefix(rest, part.literal) {
				return time.Time{}, false
			}
			rest = rest[len(part.literal):]
			continue
		}
		// 数字字段：至少一位，最多吃 maxWidth 位（0 表示不限）。
		n := 0
		for n < len(rest) && rest[n] >= '0' && rest[n] <= '9' {
			if part.maxWidth > 0 && n >= part.maxWidth {
				break
			}
			n++
		}
		if n == 0 {
			return time.Time{}, false
		}
		v, err := strconv.Atoi(rest[:n])
		if err != nil {
			return time.Time{}, false
		}
		rest = rest[n:]
		switch part.field {
		case 'Y':
			year, hasYear = v, true
		case 'm':
			month, hasMonth = v, true
		case 'd':
			day, hasDay = v, true
		}
	}

	// strptime 要求整个字符串被消费完。
	if rest != "" {
		return time.Time{}, false
	}
	if !hasYear {
		return time.Time{}, false
	}
	if !hasMonth {
		month = 1
	}
	if !hasDay {
		day = 1
	}
	if month < 1 || month > 12 || day < 1 || day > 31 {
		return time.Time{}, false
	}
	t := time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC)
	// 拒绝溢出日期（如 2 月 30 日会被规范化到 3 月）。
	if t.Year() != year || int(t.Month()) != month || t.Day() != day {
		return time.Time{}, false
	}
	return t, true
}

// compiledDateFormats 缓存编译后的格式表。
var compiledDateFormats = map[string][]datePattern{}

// compileFormats 编译格式表。
func compileFormats(formats []string) []datePattern {
	out := make([]datePattern, 0, len(formats))
	for _, f := range formats {
		out = append(out, buildPattern(f))
	}
	return out
}

// parseWithFormats 按格式表逐个尝试解析。
func parseWithFormats(s string, formats []string) *time.Time {
	for _, p := range compileFormats(formats) {
		if t, ok := p.match(s); ok {
			return &t
		}
	}
	return nil
}
