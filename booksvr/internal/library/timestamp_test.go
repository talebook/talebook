package library

import (
	"testing"
	"time"
)

// TestParseCalibreTimestampInteger 覆盖 Unix 整数形态。
func TestParseCalibreTimestampInteger(t *testing.T) {
	cases := []struct {
		in   string
		want int64
	}{
		{"0", 0},
		{"1767225600", 1767225600},
		{"  1767225600  ", 1767225600},
	}
	for _, tc := range cases {
		if got := parseCalibreTimestamp([]byte(tc.in)); got != tc.want {
			t.Errorf("parseCalibreTimestamp(%q) = %d，期望 %d", tc.in, got, tc.want)
		}
	}
}

// TestParseCalibreTimestampDatetime 覆盖 Calibre 的日期时间字符串形态。
func TestParseCalibreTimestampDatetime(t *testing.T) {
	// 这是 Calibre 8.5 实际写入的形态（带微秒与 +00:00 后缀）。
	raw := "2026-10-12 07:31:19.976290+00:00"
	got := parseCalibreTimestamp([]byte(raw))
	want := time.Date(2026, 10, 12, 7, 31, 19, 976290000, time.UTC).Unix()
	if got != want {
		t.Errorf("parseCalibreTimestamp(%q) = %d，期望 %d", raw, got, want)
	}
}

// TestParseCalibreTimestampLayouts 覆盖各候选格式。
func TestParseCalibreTimestampLayouts(t *testing.T) {
	cases := []string{
		"2026-10-12 07:31:19.976290+00:00",
		"2026-10-12 07:31:19.976290",
		"2026-10-12 07:31:19",
		"2026-10-12T07:31:19.976290+00:00",
		"2026-10-12T07:31:19Z",
		"2026-10-12",
	}
	for _, raw := range cases {
		if got := parseCalibreTimestamp([]byte(raw)); got == 0 {
			t.Errorf("parseCalibreTimestamp(%q) = 0，应能解析", raw)
		}
	}
}

// TestParseCalibreTimestampEmpty 覆盖空值。
func TestParseCalibreTimestampEmpty(t *testing.T) {
	for _, raw := range []string{"", "   ", "\t"} {
		if got := parseCalibreTimestamp([]byte(raw)); got != 0 {
			t.Errorf("parseCalibreTimestamp(%q) = %d，期望 0", raw, got)
		}
	}
}

// TestParseCalibreTimestampNil 覆盖 nil 输入。
func TestParseCalibreTimestampNil(t *testing.T) {
	if got := parseCalibreTimestamp(nil); got != 0 {
		t.Errorf("parseCalibreTimestamp(nil) = %d，期望 0", got)
	}
}

// TestParseCalibreTimestampUnparseable 覆盖无法解析的输入回落 0。
func TestParseCalibreTimestampUnparseable(t *testing.T) {
	for _, raw := range []string{"not-a-date", "2026/10/12", "abc123"} {
		if got := parseCalibreTimestamp([]byte(raw)); got != 0 {
			t.Errorf("parseCalibreTimestamp(%q) = %d，期望 0", raw, got)
		}
	}
}

// TestParseCalibreTimestampTimezone 覆盖带时区偏移的输入被正确换算。
func TestParseCalibreTimestampTimezone(t *testing.T) {
	utc := parseCalibreTimestamp([]byte("2026-10-12 07:00:00+00:00"))
	east8 := parseCalibreTimestamp([]byte("2026-10-12 15:00:00+08:00"))
	if utc != east8 {
		t.Errorf("同一时刻的不同时区表示应相等: %d != %d", utc, east8)
	}
}
