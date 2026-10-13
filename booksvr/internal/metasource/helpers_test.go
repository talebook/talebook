package metasource

import (
	"strings"
	"testing"
)

// TestPySpaceSet 校验 Python `\s` 字符集与 CPython 实测一致（29 个码位）。
func TestPySpaceSet(t *testing.T) {
	want := []rune{
		0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x1c, 0x1d, 0x1e, 0x1f, 0x20,
		0x85, 0xa0, 0x1680,
		0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007,
		0x2008, 0x2009, 0x200a, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000,
	}
	if len(pySpace) != len(want) {
		t.Fatalf("pySpace 有 %d 个码位, want %d", len(pySpace), len(want))
	}
	for _, r := range want {
		if !isPySpace(r) {
			t.Errorf("U+%04X 应属于 Python \\s", r)
		}
	}
	// 常见非空白字符不应误判。
	for _, r := range []rune{'a', '中', 0x200b, 0xfeff, 0x180e} {
		if isPySpace(r) {
			t.Errorf("U+%04X 不应属于 Python \\s", r)
		}
	}
}

// TestPyStrip 校验 Python str.strip() 的 Unicode 语义。
func TestPyStrip(t *testing.T) {
	cases := []struct{ in, want string }{
		{"  a  ", "a"},
		{"\u3000中\u3000", "中"},
		{"\u00a0x\u00a0", "x"},
		{"\n\t y \r\n", "y"},
		{"", ""},
		{"\u3000\u00a0", ""},
		{"a b", "a b"},
	}
	for _, tc := range cases {
		if got := pyStrip(tc.in); got != tc.want {
			t.Errorf("pyStrip(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

// TestPyStripLeftRight 校验 lstrip / rstrip。
func TestPyStripLeftRight(t *testing.T) {
	if got := pyStripLeft("\u3000 a "); got != "a " {
		t.Errorf("pyStripLeft = %q", got)
	}
	if got := pyStripRight(" a \u3000"); got != " a" {
		t.Errorf("pyStripRight = %q", got)
	}
}

// TestPyCollapseSpace 校验 re.sub(r"\s+", " ", text) 的折叠语义。
func TestPyCollapseSpace(t *testing.T) {
	cases := []struct{ in, want string }{
		{"a  b", "a b"},
		{"a\n\tb", "a b"},
		{"a\u3000\u3000b", "a b"},
		{"  a  ", " a "},
		{"", ""},
		{"abc", "abc"},
	}
	for _, tc := range cases {
		if got := pyCollapseSpace(tc.in); got != tc.want {
			t.Errorf("pyCollapseSpace(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

// TestPyCleanText 校验 re.sub(r"\s+", " ", text).strip() 的组合语义。
func TestPyCleanText(t *testing.T) {
	cases := []struct{ in, want string }{
		{"\u3000 这里是简介\n   第二行 \u3000", "这里是简介 第二行"},
		{"  a  b  ", "a b"},
		{"", ""},
		{"\u3000", ""},
	}
	for _, tc := range cases {
		if got := pyCleanText(tc.in); got != tc.want {
			t.Errorf("pyCleanText(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

// TestReadAll 校验 readAll 包装。
func TestReadAll(t *testing.T) {
	got, err := readAll(strings.NewReader("hello"))
	if err != nil || string(got) != "hello" {
		t.Errorf("readAll = %q, %v", got, err)
	}
}
