package booksource

import (
	"reflect"
	"testing"

	"talebook/booksvr/internal/htmlx"
)

// TestAnalyzeRuleChild 验证 Child 共享变量表与 baseURL。
func TestAnalyzeRuleChild(t *testing.T) {
	doc := arDoc(t)
	parent := NewAnalyzeRule(doc, map[string]string{"k": "v"}, "http://x/")
	child := parent.Child(doc.SelectOne("div#only"))

	if child.BaseURL != "http://x/" {
		t.Errorf("BaseURL = %q, want %q", child.BaseURL, "http://x/")
	}
	// 共享同一张变量表：子求值器写入的变量父求值器可见。
	if _, err := child.GetString("@put:{shared:@css:div#only@text}"); err != nil {
		t.Fatalf("put: %v", err)
	}
	got, err := parent.GetString("@get:{shared}")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got != "Only" {
		t.Errorf("共享变量 = %q, want %q", got, "Only")
	}
}

// TestApplyTailRegexFirstNoMatch 验证 ### 模式下无匹配返回空串。
func TestApplyTailRegexFirstNoMatch(t *testing.T) {
	pat := "ZZZ"
	if got := applyTailRegex("P1", &pat, "X", true); got != "" {
		t.Errorf("无匹配 = %q, want %q", got, "")
	}
	pat2 := "P"
	if got := applyTailRegex("P1P2", &pat2, "X", true); got != "X" {
		t.Errorf("首个匹配段替换 = %q, want %q", got, "X")
	}
}

// TestGetStringNonStringRule 验证非字符串规则走 stringifyAny。
func TestGetStringNonStringRule(t *testing.T) {
	doc := arDoc(t)
	r := NewAnalyzeRule(doc, nil, "")
	// 数字规则：stringifyAny(42) == "42"，作为 Legado 规则无匹配，返回空串。
	got, err := r.GetString(42)
	if err != nil {
		t.Fatalf("GetString(42): %v", err)
	}
	if got != "" {
		t.Errorf("GetString(42) = %q, want %q", got, "")
	}
}

// TestSplitInlineJSWithRegex 验证 @js: 后接尾部正则的拆分。
func TestSplitInlineJSWithRegex(t *testing.T) {
	r := NewAnalyzeRule(arDoc(t), nil, "")

	// 无 ##：pattern 为 nil。
	parts, ok := r.splitInlineJS("a@js:code")
	if !ok || parts.main != "a" || parts.code != "code" || parts.pattern != nil {
		t.Errorf("无 ## 拆分错误: %+v ok=%v", parts, ok)
	}

	// 带 ##：pattern 与 replacement。
	parts, ok = r.splitInlineJS("a@js:code##p##r")
	if !ok || parts.pattern == nil || *parts.pattern != "p" || parts.replacement != "r" || parts.replaceFirst {
		t.Errorf("带 ## 拆分错误: %+v ok=%v", parts, ok)
	}

	// 带 ###：replaceFirst 为 true。
	parts, ok = r.splitInlineJS("a@js:code##p##r###")
	if !ok || !parts.replaceFirst {
		t.Errorf("带 ### 拆分错误: %+v ok=%v", parts, ok)
	}

	// 无 @js: 标记。
	if _, ok := r.splitInlineJS("plain"); ok {
		t.Error("无 @js: 应返回 ok=false")
	}
}

// TestDocString 验证 docString 对各文档类型的渲染。
func TestDocString(t *testing.T) {
	// JSON 文档：紧凑 JSON。
	r := NewAnalyzeRule(map[string]any{"a": "b"}, nil, "")
	if got := r.docString(); got != `{"a":"b"}` {
		t.Errorf("JSON docString = %q", got)
	}

	// nil 文档。
	r = NewAnalyzeRule(nil, nil, "")
	if got := r.docString(); got != "" {
		t.Errorf("nil docString = %q, want %q", got, "")
	}

	// 字符串文档。
	r = NewAnalyzeRule("raw", nil, "")
	if got := r.docString(); got != "raw" {
		t.Errorf("string docString = %q, want %q", got, "raw")
	}

	// HTML 节点文档。
	r = NewAnalyzeRule(arDoc(t), nil, "")
	if got := r.docString(); got == "" {
		t.Error("node docString 不应为空")
	}
}

// TestEvalTemplateError 验证模板内子规则报错时向上传播。
func TestEvalTemplateError(t *testing.T) {
	r := NewAnalyzeRule(arDoc(t), nil, "")
	_, err := r.GetString("x{{<js>bad</js>}}y")
	if err == nil {
		t.Fatal("模板内不支持 JS 应报错")
	}
	if _, ok := err.(*JsRuleUnsupported); !ok {
		t.Errorf("错误类型 = %T, want *JsRuleUnsupported", err)
	}
}

// TestEvalStringAltsEmptyAlt 验证 || 中的空分支被跳过。
func TestEvalStringAltsEmptyAlt(t *testing.T) {
	r := NewAnalyzeRule(arDoc(t), nil, "")
	// 首分支为空、次分支有效。
	got, err := r.GetString("||div#only")
	if err != nil {
		t.Fatalf("GetString: %v", err)
	}
	if got != "Only" {
		t.Errorf("= %q, want %q", got, "Only")
	}
	// 全空分支。
	got, err = r.GetString("||")
	if err != nil {
		t.Fatalf("GetString: %v", err)
	}
	if got != "" {
		t.Errorf("全空 = %q, want %q", got, "")
	}
}

// TestEvalSimpleStringEdge 验证 evalSimpleString 的边界分支。
func TestEvalSimpleStringEdge(t *testing.T) {
	r := NewAnalyzeRule(arDoc(t), nil, "")

	// 空规则。
	if got, err := r.evalSimpleString(""); err != nil || got != "" {
		t.Errorf("空规则 = %q, %v", got, err)
	}

	// @get: 命中。
	r.Variables["g"] = "G"
	if got, err := r.evalSimpleString("@get:{g}"); err != nil || got != "G" {
		t.Errorf("@get:{g} = %q, %v", got, err)
	}

	// @get: 未命中（正则不匹配，落到后续分支）。
	if got, err := r.evalSimpleString("@get:nomatch"); err != nil || got != "" {
		t.Errorf("@get:nomatch = %q, %v", got, err)
	}

	// 非 HTML 文档上跑 CSS 规则：类型断言失败返回空串。
	jr := NewAnalyzeRule(map[string]any{"a": 1}, nil, "")
	if got, err := jr.evalSimpleString("@css:div"); err != nil || got != "" {
		t.Errorf("JSON 文档 @css = %q, %v", got, err)
	}
}

// TestEvalSimpleStringJSONOnNonJSONDoc 验证非 JSON 文档上的 $ 规则。
func TestEvalSimpleStringJSONOnNonJSONDoc(t *testing.T) {
	r := NewAnalyzeRule(arDoc(t), nil, "")
	// HTML 文档上 $ 规则走 JSONPath 分支，取不到值。
	got, err := r.evalSimpleString("$.a")
	if err != nil {
		t.Fatalf("evalSimpleString: %v", err)
	}
	if got != "" {
		t.Errorf("= %q, want %q", got, "")
	}
}

// TestGetElementsNonStringRule 验证非字符串列表规则。
func TestGetElementsNonStringRule(t *testing.T) {
	r := NewAnalyzeRule(arDoc(t), nil, "")
	got, err := r.GetElements(42)
	if err != nil {
		t.Fatalf("GetElements(42): %v", err)
	}
	if len(got) != 0 {
		t.Errorf("GetElements(42) = %#v, want 空", got)
	}
	// nil 规则。
	got, err = r.GetElements(nil)
	if err != nil || got != nil {
		t.Errorf("GetElements(nil) = %#v, %v", got, err)
	}
}

// TestGetElementsEmptyAlt 验证 || 中空分支被跳过。
func TestGetElementsEmptyAlt(t *testing.T) {
	r := NewAnalyzeRule(arDoc(t), nil, "")
	got, err := r.GetElements("||@css:div#only")
	if err != nil {
		t.Fatalf("GetElements: %v", err)
	}
	if len(got) != 1 {
		t.Errorf("len = %d, want 1", len(got))
	}
}

// TestEvalSimpleElementsJSONFlat 验证 JSON 列表摊平。
func TestEvalSimpleElementsJSONFlat(t *testing.T) {
	r := NewAnalyzeRule(arJSON(), nil, "")
	// $.data.list 返回单个列表，应摊平为 2 个元素。
	got, err := r.evalSimpleElements("$.data.list")
	if err != nil {
		t.Fatalf("evalSimpleElements: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("len = %d, want 2", len(got))
	}
	// 标量匹配不摊平。
	got, err = r.evalSimpleElements("$.title")
	if err != nil {
		t.Fatalf("evalSimpleElements: %v", err)
	}
	if len(got) != 1 || got[0] != "T" {
		t.Errorf("$.title = %#v, want [T]", got)
	}
}

// TestEvalSimpleElementsNonNodeDoc 验证非节点文档上的 CSS 规则。
func TestEvalSimpleElementsNonNodeDoc(t *testing.T) {
	r := NewAnalyzeRule(map[string]any{"a": 1}, nil, "")
	got, err := r.evalSimpleElements("@css:div")
	if err != nil {
		t.Fatalf("evalSimpleElements: %v", err)
	}
	if len(got) != 0 {
		t.Errorf("= %#v, want 空", got)
	}
}

// TestStringifyValuesNilAndList 验证 stringifyValues 跳过 nil、列表用空格连接。
func TestStringifyValuesNilAndList(t *testing.T) {
	got := stringifyValues([]any{nil, "a", []any{"x", "y"}, "b"})
	if got != "a\nx y\nb" {
		t.Errorf("= %q, want %q", got, "a\nx y\nb")
	}
	// 全 nil。
	if got := stringifyValues([]any{nil, nil}); got != "" {
		t.Errorf("全 nil = %q, want %q", got, "")
	}
}

// TestAnalyzeRuleXPathOnNonNodeDoc 验证非节点文档上的 XPath 规则。
func TestAnalyzeRuleXPathOnNonNodeDoc(t *testing.T) {
	r := NewAnalyzeRule(map[string]any{"a": 1}, nil, "")
	got, err := r.GetString("//p")
	if err != nil {
		t.Fatalf("GetString: %v", err)
	}
	if got != "" {
		t.Errorf("= %q, want %q", got, "")
	}
	els, err := r.GetElements("//p")
	if err != nil {
		t.Fatalf("GetElements: %v", err)
	}
	if len(els) != 0 {
		t.Errorf("= %#v, want 空", els)
	}
}

// TestAnalyzeRuleInlineJSWithTailRegex 验证 @js: 与尾部正则组合。
func TestAnalyzeRuleInlineJSWithTailRegex(t *testing.T) {
	r := NewAnalyzeRule(arDoc(t), nil, "")
	got, err := r.GetString(`@css:div#only@text@js:result##O##X`)
	if err != nil {
		t.Fatalf("GetString: %v", err)
	}
	if got != "Xnly" {
		t.Errorf("= %q, want %q", got, "Xnly")
	}
}

// TestAnalyzeRuleInlineJSNoMainRule 验证 @js: 无前置规则时以整篇文档为 result。
func TestAnalyzeRuleInlineJSNoMainRule(t *testing.T) {
	r := NewAnalyzeRule("hello", nil, "")
	got, err := r.GetString("@js:result.toUpperCase()")
	if err != nil {
		t.Fatalf("GetString: %v", err)
	}
	if got != "HELLO" {
		t.Errorf("= %q, want %q", got, "HELLO")
	}
}

// TestAnalyzeRuleGetStringListBlankLines 验证空行被剔除。
func TestAnalyzeRuleGetStringListBlankLines(t *testing.T) {
	r := NewAnalyzeRule(arDoc(t), nil, "")
	got, err := r.GetStringList("@css:div.a p@text")
	if err != nil {
		t.Fatalf("GetStringList: %v", err)
	}
	if !reflect.DeepEqual(got, []string{"P1", "P2", "P3"}) {
		t.Errorf("= %#v", got)
	}
}

// TestAnalyzeRuleTemplateVars 验证模板内建变量直接取变量表。
func TestAnalyzeRuleTemplateVars(t *testing.T) {
	r := NewAnalyzeRule(arDoc(t), map[string]string{
		"baseUrl": "http://b/", "key": "K", "searchKey": "SK", "searchPage": "3",
	}, "")
	cases := map[string]string{
		"{{baseUrl}}":    "http://b/",
		"{{key}}":        "K",
		"{{searchKey}}":  "SK",
		"{{searchPage}}": "3",
		// 注意：`{{}}` 不被模板正则（[^{}]+ 至少一字符）匹配，原样保留。
		"{{}}":  "{{}}",
		"{{ }}": "",
	}
	for rule, want := range cases {
		got, err := r.GetString(rule)
		if err != nil {
			t.Fatalf("GetString(%q): %v", rule, err)
		}
		if got != want {
			t.Errorf("GetString(%q) = %q, want %q", rule, got, want)
		}
	}
}

// TestAnalyzeRuleElementsXPathOnNode 验证节点文档上的 XPath 列表规则。
func TestAnalyzeRuleElementsXPathOnNode(t *testing.T) {
	r := NewAnalyzeRule(arDoc(t), nil, "")
	got, err := r.GetElements("@xpath://p")
	if err != nil {
		t.Fatalf("GetElements: %v", err)
	}
	if len(got) != 3 {
		t.Fatalf("len = %d, want 3", len(got))
	}
	for i, e := range got {
		n, ok := e.(*htmlx.Node)
		if !ok {
			t.Fatalf("got[%d] 类型 = %T, want *htmlx.Node", i, e)
		}
		if want := []string{"P1", "P2", "P3"}[i]; n.Text() != want {
			t.Errorf("got[%d] = %q, want %q", i, n.Text(), want)
		}
	}
}
