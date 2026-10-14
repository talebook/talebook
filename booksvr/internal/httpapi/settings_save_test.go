package httpapi

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestSaveSettingsUpdatesExistingKey 验证已有键被原地替换。
func TestSaveSettingsUpdatesExistingKey(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "auto.py")
	original := "settings = {\n    'OPDS_ENABLED'        : True,\n    'site_title'          : '旧标题',\n}\n"
	if err := os.WriteFile(path, []byte(original), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}

	if err := SaveSettings(path, map[string]any{"site_title": "新标题"}); err != nil {
		t.Fatalf("SaveSettings: %v", err)
	}

	got := LoadSettings(path)
	if got["site_title"] != "新标题" {
		t.Errorf("site_title = %v, want 新标题", got["site_title"])
	}
	// 未传入的键必须保留。
	if got["OPDS_ENABLED"] != true {
		t.Errorf("OPDS_ENABLED 应保留，got = %v", got["OPDS_ENABLED"])
	}
}

// TestSaveSettingsAppendsNewKey 验证新键被追加进 settings 字典。
func TestSaveSettingsAppendsNewKey(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "auto.py")
	if err := os.WriteFile(path, []byte("settings = {\n    'OPDS_ENABLED'        : True,\n}\n"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}

	if err := SaveSettings(path, map[string]any{"site_title": "我的书库"}); err != nil {
		t.Fatalf("SaveSettings: %v", err)
	}

	got := LoadSettings(path)
	if got["site_title"] != "我的书库" {
		t.Errorf("site_title = %v", got["site_title"])
	}
	if got["OPDS_ENABLED"] != true {
		t.Errorf("原有键应保留，got = %v", got["OPDS_ENABLED"])
	}
}

// TestSaveSettingsCreatesFile 验证文件不存在时能创建。
func TestSaveSettingsCreatesFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "sub", "auto.py")
	if err := SaveSettings(path, map[string]any{"site_title": "新建"}); err != nil {
		t.Fatalf("SaveSettings: %v", err)
	}
	if got := LoadSettings(path); got["site_title"] != "新建" {
		t.Errorf("site_title = %v", got["site_title"])
	}
}

// TestSaveSettingsRequiresPath 验证空路径报错。
func TestSaveSettingsRequiresPath(t *testing.T) {
	if err := SaveSettings("", map[string]any{"a": 1}); err == nil {
		t.Fatal("空路径应报错")
	}
}

// TestSaveSettingsValueTypes 验证各类值的 Python 字面量格式。
func TestSaveSettingsValueTypes(t *testing.T) {
	path := filepath.Join(t.TempDir(), "auto.py")
	values := map[string]any{
		"str_key":    "文本",
		"bool_true":  true,
		"bool_false": false,
		"int_key":    int64(42),
		"float_key":  1.5,
		"none_key":   nil,
		"list_key":   []any{"a", "b"},
	}
	if err := SaveSettings(path, values); err != nil {
		t.Fatalf("SaveSettings: %v", err)
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	content := string(raw)
	for _, want := range []string{"'文本'", "True", "False", "42", "1.5", "None", "['a', 'b']"} {
		if !strings.Contains(content, want) {
			t.Errorf("配置内容缺少 %q:\n%s", want, content)
		}
	}
}

// TestParseSizeValue 复刻 Python utils.parse_size 的语义。
func TestParseSizeValue(t *testing.T) {
	cases := []struct {
		in   any
		want int64
		ok   bool
	}{
		{"4MB", 4 << 20, true},
		{"4mb", 4 << 20, true},
		{"1024", 1024, true},
		{"1GB", 1 << 30, true},
		{"1g", 1 << 30, true},
		{"512k", 512 << 10, true},
		{"1.5MB", 1572864, true},
		{"  8 MB  ", 8 << 20, true},
		{float64(2048), 2048, true},
		{"abc", 0, false},
		{"4XB", 0, false},
		{"", 0, false},
	}
	for _, c := range cases {
		got, err := parseSizeValue(c.in)
		if c.ok && err != nil {
			t.Errorf("parseSizeValue(%v) 意外报错: %v", c.in, err)
			continue
		}
		if !c.ok {
			if err == nil {
				t.Errorf("parseSizeValue(%v) 应报错，got = %d", c.in, got)
			}
			continue
		}
		if got != c.want {
			t.Errorf("parseSizeValue(%v) = %d, want %d", c.in, got, c.want)
		}
	}
}
