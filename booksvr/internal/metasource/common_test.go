package metasource

import "testing"

// TestStr2Date 对齐 Python 侧 tmp_str2date.py 的 15 组向量（zh-CN / en-US 两套格式表）。
func TestStr2Date(t *testing.T) {
	cases := []struct {
		in     string
		zhWant string
		enWant string
	}{
		{"2024-01-02", "2024-01-02T00:00:00+00:00", "2024-01-02T00:00:00+00:00"},
		{"2024/01/02", "2024-01-02T00:00:00+00:00", "2024-01-02T00:00:00+00:00"},
		{"2024-01", "2024-01-01T00:00:00+00:00", "2024-01-01T00:00:00+00:00"},
		{"2024年", "2024-01-01T00:00:00+00:00", ""},
		{"2024年01月", "2024-01-01T00:00:00+00:00", ""},
		{"2024年01月02日", "2024-01-02T00:00:00+00:00", ""},
		{"2024", "2024-01-01T00:00:00+00:00", "2024-01-01T00:00:00+00:00"},
		{"2024-1-2", "2024-01-02T00:00:00+00:00", "2024-01-02T00:00:00+00:00"},
		{"2024/1/2", "2024-01-02T00:00:00+00:00", "2024-01-02T00:00:00+00:00"},
		{"abc", "", ""},
		{"", "", ""},
		{"2024年1月", "2024-01-01T00:00:00+00:00", ""},
		{"2024年1月2日", "2024-01-02T00:00:00+00:00", ""},
		{"20240102", "", ""},
		{"2024-01-02T00:00:00", "", ""},
	}
	for _, tc := range cases {
		gotZH := ""
		if t2 := Str2Date(tc.in, "zh-CN"); t2 != nil {
			gotZH = formatUTCDate(*t2)
		}
		if gotZH != tc.zhWant {
			t.Errorf("Str2Date(%q, zh-CN) = %q, want %q", tc.in, gotZH, tc.zhWant)
		}
		gotEN := ""
		if t2 := Str2Date(tc.in, "en-US"); t2 != nil {
			gotEN = formatUTCDate(*t2)
		}
		if gotEN != tc.enWant {
			t.Errorf("Str2Date(%q, en-US) = %q, want %q", tc.in, gotEN, tc.enWant)
		}
	}
}

// TestStr2DateUnknownLang 校验未知语言回落 zh-CN。
func TestStr2DateUnknownLang(t *testing.T) {
	if got := Str2Date("2024年", "fr-FR"); got == nil {
		t.Error("未知语言应回落 zh-CN 格式表")
	}
}

// TestDoubanStr2Date 校验豆瓣格式表（不依赖 i18n）。
func TestDoubanStr2Date(t *testing.T) {
	cases := []struct{ in, want string }{
		{"2024-01-02", "2024-01-02T00:00:00+00:00"},
		{"2024/01/02", "2024-01-02T00:00:00+00:00"},
		{"2024-01", "2024-01-01T00:00:00+00:00"},
		{"2024年01月02日", "2024-01-02T00:00:00+00:00"},
		{"2024年01月", "2024-01-01T00:00:00+00:00"},
		{"2024年", "2024-01-01T00:00:00+00:00"},
		{"2024", "2024-01-01T00:00:00+00:00"},
		{"2024年1月2日", "2024-01-02T00:00:00+00:00"},
		{"abc", ""},
	}
	for _, tc := range cases {
		got := ""
		if t2 := DoubanStr2Date(tc.in); t2 != nil {
			got = formatUTCDate(*t2)
		}
		if got != tc.want {
			t.Errorf("DoubanStr2Date(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

// TestDatePatternRejectsInvalid 校验非法日期被拒绝。
func TestDatePatternRejectsInvalid(t *testing.T) {
	// 2 月 30 日会被 Go 规范化到 3 月，必须拒绝。
	if got := Str2Date("2024-02-30", "zh-CN"); got != nil {
		t.Errorf("2024-02-30 应被拒绝, 得到 %v", got)
	}
	if got := Str2Date("2024-13-01", "zh-CN"); got != nil {
		t.Errorf("月份越界应被拒绝, 得到 %v", got)
	}
	// 尾部多余字符必须拒绝。
	if got := Str2Date("2024-01-02x", "zh-CN"); got != nil {
		t.Errorf("尾部多余字符应被拒绝, 得到 %v", got)
	}
}

// TestFormatUTCDate 校验 isoformat 风格输出。
func TestFormatUTCDate(t *testing.T) {
	d := Str2Date("2024-03-05", "zh-CN")
	if d == nil {
		t.Fatal("解析失败")
	}
	if got := formatUTCDate(*d); got != "2024-03-05T00:00:00+00:00" {
		t.Errorf("formatUTCDate = %q", got)
	}
}

// TestPyIntFloat 校验 int(float(x)) 的截断语义。
func TestPyIntFloat(t *testing.T) {
	cases := []struct {
		in   string
		want int
		ok   bool
	}{
		{"8.6", 8, true},
		{"7", 7, true},
		{"-8.6", -8, true},
		{" 9.9 ", 9, true},
		{"abc", 0, false},
		{"", 0, false},
	}
	for _, tc := range cases {
		got, ok := pyIntFloat(tc.in)
		if got != tc.want || ok != tc.ok {
			t.Errorf("pyIntFloat(%q) = (%d, %v), want (%d, %v)", tc.in, got, ok, tc.want, tc.ok)
		}
	}
}

// TestStripBookMarks 校验书名号剥除。
func TestStripBookMarks(t *testing.T) {
	cases := []struct{ in, want string }{
		{"《三体》", "三体"},
		{"「三体」", "三体"},
		{"『三体』", "三体"},
		{"【三体】", "三体"},
		{"〔三体〕", "三体"},
		{"<三体>", "三体"},
		{"三体", "三体"},
		{"《三体》全集", "三体全集"},
		{"", ""},
	}
	for _, tc := range cases {
		if got := stripBookMarks(tc.in); got != tc.want {
			t.Errorf("stripBookMarks(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}
