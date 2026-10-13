package metasource

import (
	"io"
	"strings"
)

// readAll 读取全部内容。
func readAll(r io.Reader) ([]byte, error) {
	return io.ReadAll(r)
}

// pySpace 是 Python 正则 `\s` 在 Unicode 模式下匹配的全部字符。
//
// Go 的 RE2 `\s` 只匹配 ASCII 空白，而 Python 的 `\s` 是 Unicode 感知的，
// 会额外匹配 U+3000（表意空格）、U+00A0（不换行空格）等。元数据源的
// 正则与空白折叠都依赖这一语义，因此这里显式列出。
//
// 取值来自 `[chr(c) for c in range(0x110000) if re.match(r"\s", chr(c))]`。
var pySpace = map[rune]bool{
	0x09: true, 0x0a: true, 0x0b: true, 0x0c: true, 0x0d: true,
	0x1c: true, 0x1d: true, 0x1e: true, 0x1f: true, 0x20: true,
	0x85: true, 0xa0: true, 0x1680: true,
	0x2000: true, 0x2001: true, 0x2002: true, 0x2003: true, 0x2004: true,
	0x2005: true, 0x2006: true, 0x2007: true, 0x2008: true, 0x2009: true,
	0x200a: true, 0x2028: true, 0x2029: true, 0x202f: true, 0x205f: true,
	0x3000: true,
}

// isPySpace 判断字符是否属于 Python 的 `\s` 集合。
func isPySpace(r rune) bool {
	return pySpace[r]
}

// pyStrip 复刻 Python 的 str.strip()（无参数时按 Unicode 空白裁剪）。
func pyStrip(s string) string {
	return strings.TrimFunc(s, isPySpace)
}

// pyStripLeft 复刻 Python 的 str.lstrip()。
func pyStripLeft(s string) string {
	return strings.TrimLeftFunc(s, isPySpace)
}

// pyStripRight 复刻 Python 的 str.rstrip()。
func pyStripRight(s string) string {
	return strings.TrimRightFunc(s, isPySpace)
}

// pyCollapseSpace 复刻 re.sub(r"\s+", " ", text)。
//
// 连续空白折叠为单个 ASCII 空格，不做首尾裁剪。
func pyCollapseSpace(s string) string {
	var b strings.Builder
	b.Grow(len(s))
	prevSpace := false
	for _, r := range s {
		if isPySpace(r) {
			if !prevSpace {
				b.WriteByte(' ')
				prevSpace = true
			}
			continue
		}
		b.WriteRune(r)
		prevSpace = false
	}
	return b.String()
}

// pyCleanText 复刻 `re.sub(r"\s+", " ", text).strip()`。
func pyCleanText(s string) string {
	return pyStrip(pyCollapseSpace(s))
}
