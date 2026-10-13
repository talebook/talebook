package booksource

import (
	"reflect"
	"testing"
)

// runJSVector 是测试辅助：跑一次 RunJS 并返回结果与变量快照。
func runJSVector(t *testing.T, code, result string, variables map[string]string, baseURL string) (string, map[string]string, error) {
	t.Helper()
	if variables == nil {
		variables = map[string]string{}
	}
	got, err := RunJS(code, result, variables, baseURL, 0)
	return got, variables, err
}

// TestRunJSEmptyCode 对齐 Python 空代码短路。
func TestRunJSEmptyCode(t *testing.T) {
	for _, code := range []string{"", "   "} {
		got, _, err := runJSVector(t, code, "orig", nil, "")
		if err != nil || got != "orig" {
			t.Errorf("RunJS(%q) = (%q, %v), want (orig, nil)", code, got, err)
		}
	}
}

// TestRunJSResultAndReturn 对齐 result 变量与返回值语义。
func TestRunJSResultAndReturn(t *testing.T) {
	cases := []struct {
		name   string
		code   string
		result string
		want   string
	}{
		{"use_result", "result.replace('a','X')", "abc", "Xbc"},
		{"return_value", "'literal'", "abc", "literal"},
		{"undefined_falls_back", "var x = 1;", "fallback", "fallback"},
		{"null_falls_back", "null", "fallback", "fallback"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, _, err := runJSVector(t, tc.code, tc.result, nil, "")
			if err != nil {
				t.Fatalf("RunJS: %v", err)
			}
			if got != tc.want {
				t.Errorf("RunJS = %q, want %q", got, tc.want)
			}
		})
	}
}

// TestRunJSStringify 对齐 _stringify_js_value 的 5 组向量。
func TestRunJSStringify(t *testing.T) {
	cases := []struct{ code, want string }{
		{"42", "42"},
		{"true", "true"},
		{"false", "false"},
		{"({a:1,b:'x'})", `{"a":1,"b":"x"}`},
		{"[1,2,3]", "[1,2,3]"},
	}
	for _, tc := range cases {
		got, _, err := runJSVector(t, tc.code, "", nil, "")
		if err != nil {
			t.Fatalf("RunJS(%q): %v", tc.code, err)
		}
		if got != tc.want {
			t.Errorf("RunJS(%q) = %q, want %q", tc.code, got, tc.want)
		}
	}
}

// TestRunJSJavaFacade 对齐 java 门面的 11 组向量。
func TestRunJSJavaFacade(t *testing.T) {
	cases := []struct {
		name      string
		code      string
		variables map[string]string
		want      string
		wantVars  map[string]string
	}{
		{"get", "java.get('key')", map[string]string{"key": "K1"}, "K1", map[string]string{"key": "K1"}},
		{"get_missing", "java.get('nope')", nil, "", map[string]string{}},
		{"put", "java.put('newk','newv'); 'done'", nil, "done", map[string]string{"newk": "newv"}},
		{"put_empty", "java.put('n',''); 'done'", nil, "done", map[string]string{"n": ""}},
		{"t2s", "java.t2s('中文')", nil, "中文", map[string]string{}},
		{"s2t", "java.s2t('中文')", nil, "中文", map[string]string{}},
		{"encodeURI", "java.encodeURI('中 文')", nil, "%E4%B8%AD%20%E6%96%87", map[string]string{}},
		{"longToast", "java.longToast('x')", nil, "", map[string]string{}},
		{"log", "java.log('x')", nil, "", map[string]string{}},
		{"md5", "java.md5Encode('hello')", nil, "5d41402abc4b2a76b9719d911017c592", map[string]string{}},
		{"md5_cn", "java.md5Encode('中文')", nil, "a7bac2239fcdcb3a067903d8077c4a07", map[string]string{}},
		{"md5_empty", "java.md5Encode('')", nil, "d41d8cd98f00b204e9800998ecf8427e", map[string]string{}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, vars, err := runJSVector(t, tc.code, "", tc.variables, "")
			if err != nil {
				t.Fatalf("RunJS: %v", err)
			}
			if got != tc.want {
				t.Errorf("结果 = %q, want %q", got, tc.want)
			}
			if !reflect.DeepEqual(vars, tc.wantVars) {
				t.Errorf("变量 = %v, want %v", vars, tc.wantVars)
			}
		})
	}
}

// TestRunJSJavaUnsupported 对齐 java 不支持能力抛错。
func TestRunJSJavaUnsupported(t *testing.T) {
	cases := []struct{ name, code string }{
		{"getString", "java.getString()"},
		{"ajax", "java.ajax('http://x')"},
		{"post", "java.post('http://x','')"},
		{"startBrowserAwait", "java.startBrowserAwait('http://x')"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, _, err := runJSVector(t, tc.code, "", nil, "")
			if err == nil {
				t.Fatalf("应返回错误: %s", tc.code)
			}
			if _, ok := err.(*JsRuleUnsupported); !ok {
				t.Errorf("错误类型 = %T, want *JsRuleUnsupported", err)
			}
		})
	}
}

// TestRunJSBookObject 对齐 book 对象。
func TestRunJSBookObject(t *testing.T) {
	got, _, err := runJSVector(t, "book.origin", "", nil, "https://a.com/path?q=1")
	if err != nil || got != "https://a.com" {
		t.Errorf("book.origin = (%q, %v), want (https://a.com, nil)", got, err)
	}
	got, _, err = runJSVector(t, "book.origin", "", nil, "")
	if err != nil || got != "" {
		t.Errorf("空 baseUrl 的 book.origin = (%q, %v)", got, err)
	}
	got, _, err = runJSVector(t, "book.name", "", nil, "")
	if err != nil || got != "" {
		t.Errorf("book.name = (%q, %v)", got, err)
	}
}

// TestRunJSInjectedVars 对齐注入变量。
func TestRunJSInjectedVars(t *testing.T) {
	cases := []struct {
		code      string
		variables map[string]string
		baseURL   string
		want      string
	}{
		{"key", map[string]string{"key": "KK"}, "", "KK"},
		{"page", map[string]string{"page": "3"}, "", "3"},
		{"searchKey", map[string]string{"key": "SK"}, "", "SK"},
		{"searchPage", map[string]string{"page": "7"}, "", "7"},
		{"baseUrl", nil, "https://b.com/x", "https://b.com/x"},
	}
	for _, tc := range cases {
		got, _, err := runJSVector(t, tc.code, "", tc.variables, tc.baseURL)
		if err != nil {
			t.Fatalf("RunJS(%q): %v", tc.code, err)
		}
		if got != tc.want {
			t.Errorf("RunJS(%q) = %q, want %q", tc.code, got, tc.want)
		}
	}
}

// TestRunJSVarsWriteback 对齐变量回写。
func TestRunJSVarsWriteback(t *testing.T) {
	got, vars, err := runJSVector(t, "java.put('out','v1'); 'r'", "", map[string]string{"in": "i"}, "")
	if err != nil {
		t.Fatalf("RunJS: %v", err)
	}
	if got != "r" {
		t.Errorf("结果 = %q", got)
	}
	want := map[string]string{"in": "i", "out": "v1"}
	if !reflect.DeepEqual(vars, want) {
		t.Errorf("变量 = %v, want %v", vars, want)
	}
}

// TestRunJSErrors 对齐语法/运行时/抛错三类错误。
func TestRunJSErrors(t *testing.T) {
	cases := []struct{ name, code string }{
		{"syntax_error", "this is not js"},
		{"runtime_error", "undefinedFn()"},
		{"throw_error", "throw new Error('boom')"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, _, err := runJSVector(t, tc.code, "", nil, "")
			if err == nil {
				t.Fatalf("应返回错误: %s", tc.code)
			}
			if _, ok := err.(*JsRuleUnsupported); !ok {
				t.Errorf("错误类型 = %T, want *JsRuleUnsupported", err)
			}
		})
	}
}

// TestRunJSTimeout 校验死循环被超时中断。
func TestRunJSTimeout(t *testing.T) {
	_, err := RunJS("while(true){}", "", map[string]string{}, "", 0.2)
	if err == nil {
		t.Fatal("死循环应被超时中断")
	}
	if _, ok := err.(*JsRuleUnsupported); !ok {
		t.Errorf("错误类型 = %T, want *JsRuleUnsupported", err)
	}
}

// TestRunJSRealRules 对齐 4 个真实规则场景。
func TestRunJSRealRules(t *testing.T) {
	cases := []struct {
		name   string
		code   string
		result string
		want   string
	}{
		{"replace_ws", `result.replace(/\s+/g,' ').trim()`, "  a   b  ", "a b"},
		{"split_join", `result.split(',').map(function(s){return s.trim()}).join('|')`, "a, b ,c", "a|b|c"},
		{"json_parse", `JSON.parse(result).name`, `{"name":"三体"}`, "三体"},
		{"regex_group", `(result.match(/\d+/)||[''])[0]`, "abc123def", "123"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, _, err := runJSVector(t, tc.code, tc.result, nil, "")
			if err != nil {
				t.Fatalf("RunJS: %v", err)
			}
			if got != tc.want {
				t.Errorf("结果 = %q, want %q", got, tc.want)
			}
		})
	}
}

// TestJsRuleUnsupportedMessage 校验错误消息格式。
func TestJsRuleUnsupportedMessage(t *testing.T) {
	err := NewJsRuleUnsupported("abc")
	if got := err.Error(); got != "JS rule is not supported: abc" {
		t.Errorf("Error() = %q", got)
	}
	if err.Rule != "abc" {
		t.Errorf("Rule = %q", err.Rule)
	}
}

// TestTruncateRule 校验规则截断到 120 字符。
func TestTruncateRule(t *testing.T) {
	if got := truncateRule("abc"); got != "abc" {
		t.Errorf("短串 = %q", got)
	}
	long := ""
	for i := 0; i < 200; i++ {
		long += "a"
	}
	if got := truncateRule(long); len([]rune(got)) != 120 {
		t.Errorf("截断长度 = %d, want 120", len([]rune(got)))
	}
	// 中文按字符截断。
	cn := ""
	for i := 0; i < 200; i++ {
		cn += "中"
	}
	if got := truncateRule(cn); len([]rune(got)) != 120 {
		t.Errorf("中文截断长度 = %d, want 120", len([]rune(got)))
	}
}

// TestStringifyJSValueNil 校验 nil 值。
func TestStringifyJSValueNil(t *testing.T) {
	if got := stringifyJSValue(nil); got != "" {
		t.Errorf("nil = %q", got)
	}
}

// TestJsToString 校验变量字符串化。
func TestJsToString(t *testing.T) {
	cases := []struct {
		in   any
		want string
	}{
		{nil, ""},
		{"abc", "abc"},
		{true, "true"},
		{false, "false"},
		{float64(42), "42"},
		{float64(1.5), "1.5"},
	}
	for _, tc := range cases {
		if got := jsToString(tc.in); got != tc.want {
			t.Errorf("jsToString(%v) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

// TestJSRuntimeConstants 校验常量与 Python 一致。
func TestJSRuntimeConstants(t *testing.T) {
	if DefaultJSTimeLimit != 0.2 {
		t.Errorf("DefaultJSTimeLimit = %v", DefaultJSTimeLimit)
	}
	if DefaultJSMemoryLimit != 8*1024*1024 {
		t.Errorf("DefaultJSMemoryLimit = %d", DefaultJSMemoryLimit)
	}
	if DefaultJSStackSize != 512*1024 {
		t.Errorf("DefaultJSStackSize = %d", DefaultJSStackSize)
	}
}
