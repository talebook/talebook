package httpapi

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestParseSettingValueLists 回归：列表/字典字面量必须解析成真正的容器。
//
// 缺陷背景：parseSettingValue 没有列表解析，'FRIENDS': [] 会以字符串 "[]"
// 漏给前端。前端写的是 store.sys.friends.map(...)，字符串虽 truthy 却没有
// .map，抛 TypeError 后整个侧边栏渲染失败——管理员菜单与分类计数一起消失。
func TestParseSettingValueLists(t *testing.T) {
	cases := []struct {
		in   string
		want string // JSON 形式便于比较
	}{
		{"[]", `[]`},
		{"[1, 2, 3]", `[1,2,3]`},
		{"['a', 'b']", `["a","b"]`},
		{`["x", "y"]`, `["x","y"]`},
		{"[True, False, None]", `[true,false,null]`},
		{"[[1, 2], [3]]", `[[1,2],[3]]`},
		{"{}", `{}`},
		{"{'a': 1, 'b': 'x'}", `{"a":1,"b":"x"}`},
		{"{'nested': {'k': [1, 2]}}", `{"nested":{"k":[1,2]}}`},
		{"[{'icon': 'mdi-x', 'href': 'http://a', 'text': 'A'}]",
			`[{"href":"http://a","icon":"mdi-x","text":"A"}]`},
	}
	for _, c := range cases {
		got := parseSettingValue(c.in)
		b, err := json.Marshal(got)
		if err != nil {
			t.Errorf("parseSettingValue(%q) 无法序列化: %v", c.in, err)
			continue
		}
		if string(b) != c.want {
			t.Errorf("parseSettingValue(%q) = %s，期望 %s", c.in, b, c.want)
		}
	}
}

// TestParseSettingValueScalarsUnchanged 确保标量解析没被列表解析破坏。
func TestParseSettingValueScalarsUnchanged(t *testing.T) {
	cases := []struct {
		in   string
		want any
	}{
		{"'hello'", "hello"},
		{`"world"`, "world"},
		{"True", true},
		{"False", false},
		{"None", nil},
		{"42", int64(42)},
		{"3.5", 3.5},
		{"'100MB'", "100MB"},
		{"", ""},
		// 不是合法字面量时回落到原始字符串，不能报错。
		{"os.path.join('a', 'b')", "os.path.join('a', 'b')"},
		{"[1, 2", "[1, 2"},
	}
	for _, c := range cases {
		if got := parseSettingValue(c.in); got != c.want {
			t.Errorf("parseSettingValue(%q) = %#v，期望 %#v", c.in, got, c.want)
		}
	}
}

// TestUserSysInfoFriendsIsArray 回归：/api/user/info 的 friends/socials 必须是数组。
//
// 前端对这两个字段直接调 .map()，返回字符串或 null 都会让侧边栏崩掉。
func TestUserSysInfoFriendsIsArray(t *testing.T) {
	dir := t.TempDir()
	auto := filepath.Join(dir, "auto.py")
	content := "settings = {\n    'FRIENDS' : [],\n    'SOCIALS' : [],\n}\n"
	if err := os.WriteFile(auto, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}

	cfg := UserConfig{Settings: LoadSettings(auto), SettingsPath: auto}
	got, err := userSysInfo(cfg)
	if err != nil {
		t.Fatal(err)
	}

	for _, key := range []string{"friends", "socials"} {
		v, ok := got[key]
		if !ok {
			t.Errorf("sys 缺少 %q", key)
			continue
		}
		list, ok := v.([]any)
		if !ok {
			t.Errorf("sys[%q] 类型是 %T，必须是 []any（前端要调 .map()）", key, v)
			continue
		}
		if list == nil {
			t.Errorf("sys[%q] 是 nil 切片，会序列化成 JSON null", key)
		}
	}

	// 序列化后必须是 JSON 数组，不能是字符串 "[]" 或 null。
	b, err := json.Marshal(got)
	if err != nil {
		t.Fatal(err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(b, &decoded); err != nil {
		t.Fatal(err)
	}
	for _, key := range []string{"friends", "socials"} {
		if _, ok := decoded[key].([]any); !ok {
			t.Errorf("JSON 里 sys[%q] = %v，必须是数组", key, decoded[key])
		}
	}
}

// TestUserSysInfoFriendsWithEntries 验证非空友情链接也能正确解析。
func TestUserSysInfoFriendsWithEntries(t *testing.T) {
	dir := t.TempDir()
	auto := filepath.Join(dir, "auto.py")
	content := "settings = {\n" +
		"    'FRIENDS' : [{'icon': 'mdi-book', 'href': 'http://a.example', 'text': 'A'}],\n" +
		"}\n"
	if err := os.WriteFile(auto, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}

	cfg := UserConfig{Settings: LoadSettings(auto), SettingsPath: auto}
	got, err := userSysInfo(cfg)
	if err != nil {
		t.Fatal(err)
	}
	friends, ok := got["friends"].([]any)
	if !ok {
		t.Fatalf("friends 类型是 %T，期望 []any", got["friends"])
	}
	if len(friends) != 1 {
		t.Fatalf("friends 长度 %d，期望 1", len(friends))
	}
	item, ok := friends[0].(map[string]any)
	if !ok {
		t.Fatalf("friends[0] 类型是 %T，期望 map[string]any", friends[0])
	}
	if item["text"] != "A" || item["href"] != "http://a.example" {
		t.Errorf("friends[0] = %v", item)
	}
}

// TestParsePythonLiteralErrorPaths 覆盖解析器的错误分支。
//
// 这些输入在真实配置里不该出现，但解析器必须优雅回落而不是 panic 或
// 返回半成品：parsePythonLiteral 返回 ok=false，由调用方保留原始字符串。
func TestParsePythonLiteralErrorPaths(t *testing.T) {
	cases := []struct {
		name string
		in   string
	}{
		{"空字符串", ""},
		{"只有空白", "   "},
		{"不以括号开头", "abc"},
		{"列表未闭合", "[1, 2"},
		{"字典未闭合", "{'a': 1"},
		{"字典缺冒号", "{'a' 1}"},
		{"字符串未闭合", "['abc]"},
		{"标量无法解析", "[os.path.join('a')]"},
		{"尾部有多余内容", "[1] extra"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			v, ok := parsePythonLiteral(c.in)
			if ok {
				t.Errorf("parsePythonLiteral(%q) 应返回 ok=false，实际 %#v", c.in, v)
			}
			// 调用方（parseSettingValue）必须回落到原始字符串，不能丢配置。
			// 注意 parseSettingValue 会先 TrimSpace，纯空白输入回落为 ""。
			want := strings.TrimSpace(c.in)
			if got := parseSettingValue(c.in); got != want {
				t.Errorf("parseSettingValue(%q) = %#v，应回落为 %#v", c.in, got, want)
			}
		})
	}
}

// TestParsePythonLiteralEscapes 覆盖字符串转义分支。
func TestParsePythonLiteralEscapes(t *testing.T) {
	got := parseSettingValue(`['a\nb', 'c\td', 'e\\f']`)
	list, ok := got.([]any)
	if !ok {
		t.Fatalf("类型是 %T，期望 []any", got)
	}
	want := []string{"a\nb", "c\td", "e\\f"}
	if len(list) != len(want) {
		t.Fatalf("长度 %d，期望 %d", len(list), len(want))
	}
	for i, w := range want {
		if list[i] != w {
			t.Errorf("list[%d] = %q，期望 %q", i, list[i], w)
		}
	}
}

// TestSettingListNeverNil 验证 settingList 永远返回非 nil 切片。
func TestSettingListNeverNil(t *testing.T) {
	cases := []map[string]any{
		nil,
		{},
		{"FRIENDS": nil},
		{"FRIENDS": "[]"},
		{"FRIENDS": 42},
	}
	for i, settings := range cases {
		got := settingList(settings, "FRIENDS")
		if got == nil {
			t.Errorf("case %d: settingList 返回 nil，会序列化成 JSON null", i)
		}
	}
}
