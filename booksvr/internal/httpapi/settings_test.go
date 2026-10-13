package httpapi

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadSettings(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "auto.py")
	content := `
# Talebook 配置
CONF = {
    'site_title'   : '我的书库',
    "DEFAULT_PAGE_SIZE" : 120,
    'ALLOW_GUEST_READ' : True,
    'DEMO_MODE'    : False,
    'AUDIOBOOK_MIN_FREE_GB' : 5.5,
    'EMPTY_VALUE'  : '',
    'NONE_VALUE'   : None,
    'BOOK_NAV'     : '科幻=三体/流浪地球',
    'WITH_COMMENT' : 'abc',  # 行尾注释
}
`
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}

	got := LoadSettings(path)
	cases := []struct {
		key  string
		want any
	}{
		{"site_title", "我的书库"},
		{"DEFAULT_PAGE_SIZE", int64(120)},
		{"ALLOW_GUEST_READ", true},
		{"DEMO_MODE", false},
		{"AUDIOBOOK_MIN_FREE_GB", 5.5},
		{"EMPTY_VALUE", ""},
		{"NONE_VALUE", nil},
		{"BOOK_NAV", "科幻=三体/流浪地球"},
		{"WITH_COMMENT", "abc"},
	}
	for _, c := range cases {
		if got[c.key] != c.want {
			t.Errorf("%s = %#v, want %#v", c.key, got[c.key], c.want)
		}
	}
}

func TestLoadSettingsMissingFile(t *testing.T) {
	got := LoadSettings(filepath.Join(t.TempDir(), "nope.py"))
	if len(got) != 0 {
		t.Fatalf("文件不存在应返回空 map: %+v", got)
	}
}

func TestLoadSettingsEmptyPath(t *testing.T) {
	if got := LoadSettings(""); len(got) != 0 {
		t.Fatalf("空路径应返回空 map: %+v", got)
	}
}

func TestParseSettingValue(t *testing.T) {
	cases := []struct {
		in   string
		want any
	}{
		{"'abc'", "abc"},
		{`"abc"`, "abc"},
		{"True", true},
		{"False", false},
		{"None", nil},
		{"42", int64(42)},
		{"-7", int64(-7)},
		{"3.14", 3.14},
		{"raw_value", "raw_value"},
		{"", ""},
		{"'x'  # 注释", "x"},
		{"'a#b'", "a#b"},
	}
	for _, c := range cases {
		if got := parseSettingValue(c.in); got != c.want {
			t.Errorf("parseSettingValue(%q) = %#v, want %#v", c.in, got, c.want)
		}
	}
}

func TestIndexUnquoted(t *testing.T) {
	cases := []struct {
		in   string
		want int
	}{
		{"abc#def", 3},
		{"'a#b'", -1},
		{`"a#b"`, -1},
		{"no-hash", -1},
		{"'x'#y", 3},
	}
	for _, c := range cases {
		if got := indexUnquoted(c.in, '#'); got != c.want {
			t.Errorf("indexUnquoted(%q) = %d, want %d", c.in, got, c.want)
		}
	}
}
