package httpapi

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// 缺陷回归：反斜杠转义不对称导致 auto.py 指数膨胀。
//
// 根因：quotePython 把 \ 写成 \\，而 parseSettingValue 只去引号、不还原转义。
// 于是每次「读 → 写」都把反斜杠翻倍，N 次后是 2^N。
// 实测把 auto.py 涨到 528MB（单行 184MB），并让配置行正则回溯爆炸，
// 把 /read/<id> 拖死、容器 OOM。

// TestQuoteUnquoteRoundTrip 断言 quote/unquote 严格对称。
func TestQuoteUnquoteRoundTrip(t *testing.T) {
	cases := []string{
		`plain`,
		`back\slash`,
		`double\\slash`,
		`many\\\\slashes`,
		`quote'inside`,
		`double"quote`,
		"new\nline",
		"tab\there",
		`mixed\'\n\\`,
		``,
	}
	for _, want := range cases {
		quoted := quotePython(want)
		got := unquotePython(quoted)
		if got != want {
			t.Errorf("往返失败：原始 %q → 引用 %q → 还原 %q", want, quoted, got)
		}
	}
}

// TestParseSettingValueUnescapes 断言解析配置行时会还原转义。
func TestParseSettingValueUnescapes(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{`'a\\b'`, `a\b`},
		{`'a\nb'`, "a\nb"},
		{`'a\tb'`, "a\tb"},
		{`'it\'s'`, "it's"},
		{`"say \"hi\""`, `say "hi"`},
		{`'plain'`, "plain"},
	}
	for _, c := range cases {
		if got := parseSettingValue(c.in); got != c.want {
			t.Errorf("parseSettingValue(%q) = %q，期望 %q", c.in, got, c.want)
		}
	}
}

// TestSaveSettingsDoesNotGrowBackslashes 回归：反复保存不能让文件膨胀。
//
// 这是本次缺陷的核心断言：连续保存 20 次，文件大小必须保持稳定。
func TestSaveSettingsDoesNotGrowBackslashes(t *testing.T) {
	dir := t.TempDir()
	auto := filepath.Join(dir, "auto.py")

	// 一个含反斜杠与换行的值，正是会被反复转义的那种。
	original := map[string]any{
		"BOOK_NAV":     `经管=经济学/管理\n文学=小说/散文\n`,
		"RESET_MAIL":   "line1\\nline2\\\\end",
		"site_title":   "奇异书屋",
		"MAX_UPLOAD":   "100MB",
		"UPLOAD_CHUNK": true,
	}
	if err := SaveSettings(auto, original); err != nil {
		t.Fatalf("首次保存失败: %v", err)
	}

	// 模拟前端行为：读出来 → 原样存回去，重复 20 次。
	//
	// 注意：这里直接调 SaveSettings（而非 adminSettingsSave），
	// 所以传的是全量配置；重点是验证转义不会指数增长。
	for i := 0; i < 20; i++ {
		loaded := LoadSettings(auto)
		if err := SaveSettings(auto, loaded); err != nil {
			t.Fatalf("第 %d 次保存失败: %v", i+1, err)
		}
	}

	after, err := os.Stat(auto)
	if err != nil {
		t.Fatal(err)
	}
	// 首次保存只写传入的 5 个键；后续 LoadSettings 返回全量配置，
	// 所以会有一跳。关键是：稳定后不能再增长（指数增长会到 MB 级）。
	if after.Size() > 1<<20 {
		t.Errorf("文件涨到 %d 字节，已失控（转义不对称会指数增长）", after.Size())
	}

	// 再存一轮，大小必须完全稳定。
	if err := SaveSettings(auto, LoadSettings(auto)); err != nil {
		t.Fatal(err)
	}
	stable, err := os.Stat(auto)
	if err != nil {
		t.Fatal(err)
	}
	if stable.Size() != after.Size() {
		t.Errorf("再次保存后大小从 %d 变为 %d，说明每次保存都在增长",
			after.Size(), stable.Size())
	}

	// 值必须仍然正确。
	got := LoadSettings(auto)
	if got["BOOK_NAV"] != original["BOOK_NAV"] {
		t.Errorf("BOOK_NAV 往返后 = %q，期望 %q", got["BOOK_NAV"], original["BOOK_NAV"])
	}
	if got["RESET_MAIL"] != original["RESET_MAIL"] {
		t.Errorf("RESET_MAIL 往返后 = %q，期望 %q", got["RESET_MAIL"], original["RESET_MAIL"])
	}
}

// TestSaveSettingsKeepsDollarSigns 回归：值里的 $ 不能被当成捕获组引用。
//
// 根因：ReplaceAllString 会把替换串里的 $1 / ${name} 当捕获组、
// 把 $ 当转义，导致配置值被静默截断（实测 'a$b' 被写成 'a'）。
func TestSaveSettingsKeepsDollarSigns(t *testing.T) {
	dir := t.TempDir()
	auto := filepath.Join(dir, "auto.py")

	values := map[string]any{
		"push_content": "价格 $100 与 ${name} 与 $1",
		"site_title":   "a$b",
	}
	if err := SaveSettings(auto, values); err != nil {
		t.Fatal(err)
	}

	got := LoadSettings(auto)
	if got["push_content"] != values["push_content"] {
		t.Errorf("push_content = %q，期望 %q（$ 被当成捕获组引用了）",
			got["push_content"], values["push_content"])
	}
	if got["site_title"] != values["site_title"] {
		t.Errorf("site_title = %q，期望 %q", got["site_title"], values["site_title"])
	}
}

// TestLoadSettingsSkipsOversizedFile 回归：异常巨大的文件必须跳过而不是拖死进程。
func TestLoadSettingsSkipsOversizedFile(t *testing.T) {
	dir := t.TempDir()
	auto := filepath.Join(dir, "auto.py")

	// 造一个超过上限的文件（用重复行，避免真的占 8MB 内存）。
	var sb strings.Builder
	sb.WriteString("settings = {\n")
	sb.WriteString("    'BIG' : '")
	sb.WriteString(strings.Repeat("x", maxSettingsFileSize+1024))
	sb.WriteString("',\n}\n")
	if err := os.WriteFile(auto, []byte(sb.String()), 0o644); err != nil {
		t.Fatal(err)
	}

	// 必须快速返回出厂默认，而不是解析这个巨型文件。
	got := LoadSettings(auto)
	if got["BIG"] != nil {
		t.Error("超大文件不应被解析")
	}
	if got["MAX_UPLOAD_SIZE"] != "100MB" {
		t.Errorf("应回落到出厂默认，实际 MAX_UPLOAD_SIZE = %v", got["MAX_UPLOAD_SIZE"])
	}
}

// TestSaveSettingsRejectsOversizedFile 回归：拒绝继续写坏的超大文件。
func TestSaveSettingsRejectsOversizedFile(t *testing.T) {
	dir := t.TempDir()
	auto := filepath.Join(dir, "auto.py")

	var sb strings.Builder
	sb.WriteString("settings = {\n    'BIG' : '")
	sb.WriteString(strings.Repeat("x", maxSettingsFileSize+1024))
	sb.WriteString("',\n}\n")
	if err := os.WriteFile(auto, []byte(sb.String()), 0o644); err != nil {
		t.Fatal(err)
	}

	err := SaveSettings(auto, map[string]any{"site_title": "x"})
	if err == nil {
		t.Fatal("对超大文件写入应返回错误，而不是继续损坏")
	}
	if !strings.Contains(err.Error(), "异常巨大") {
		t.Errorf("错误信息应说明文件异常巨大，实际: %v", err)
	}
}
