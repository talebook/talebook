package booksource

import (
	"golang.org/x/net/html"
	"reflect"
	"testing"

	"github.com/antchfx/htmlquery"

	"talebook/booksvr/internal/htmlx"
)

// arVectorHTML 与 Python 侧 tmp_ar.py 的 HTML 一致。
const arVectorHTML = `<html><body>` +
	`<div class="a"><p>P1</p><p>P2</p><p>P3</p></div>` +
	`<div class="b"><span class="s">S1</span><span>S2</span></div>` +
	`<a href="/x" title="T1">Link1</a>` +
	`<a href="/y">Link2</a>` +
	`<div id="only">Only</div>` +
	`<div class="multi"><b>B1</b>text1<b>B2</b>text2</div>` +
	`</body></html>`

func arDoc(t *testing.T) *htmlx.Node {
	t.Helper()
	doc, err := htmlx.Parse(arVectorHTML)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	return doc
}

func arJSON() map[string]any {
	return map[string]any{
		"data": map[string]any{
			"list": []any{
				map[string]any{"name": "A", "id": float64(1)},
				map[string]any{"name": "B", "id": float64(2)},
			},
		},
		"title": "T",
		"tags":  []any{"x", "y"},
	}
}

// TestAnalyzeRuleString 对齐 Python AnalyzeRule.get_string 的 36 组向量。
func TestAnalyzeRuleString(t *testing.T) {
	doc := arDoc(t)
	js := arJSON()

	cases := []struct {
		name string
		doc  any
		rule any
		vars map[string]string
		want string
	}{
		{"css-p", doc, "@css:div.a p", nil, "P1\nP2\nP3"},
		{"css-attr", doc, "@css:a@href", nil, "/x\n/y"},
		{"css-text", doc, "@css:div#only@text", nil, "Only"},
		{"legado-class", doc, "class.a@tag.p", nil, "P1\nP2\nP3"},
		{"legado-id", doc, "id.only", nil, "Only"},
		{"legado-tag", doc, "tag.a@href", nil, "/x\n/y"},
		{"xpath-p", doc, "//p", nil, "P1\nP2\nP3"},
		{"xpath-attr", doc, "//a/@href", nil, "/x\n/y"},
		{"xpath-text", doc, "//p/text()", nil, "P1\nP2\nP3"},
		{"xpath-prefix", doc, "@xpath://div[@class='a']/p", nil, "P1\nP2\nP3"},
		{"or-first", doc, "div.zzz||div#only", nil, "Only"},
		{"and-join", doc, "div#only&&div.a p", nil, "Only\nP1\nP2\nP3"},
		{"tail-regex", doc, `@css:div.a p@text##P\d##X`, nil, "X\nX\nX"},
		{"tail-regex-first", doc, `@css:div.a p@text##P\d##X###`, nil, "X"},
		{"tail-regex-empty", doc, `@css:div.a p@text##\d##`, nil, "P\nP\nP"},
		{"tail-regex-dollar", doc, `@css:div.a p@text##(P)(\d)##$2$1`, nil, "1P\n2P\n3P"},
		{"tail-regex-bad", doc, `@css:div.a p@text##[##X`, nil, "P1\nP2\nP3"},
		{"template", doc, "x{{@css:div#only@text}}y", nil, "xOnlyy"},
		{"template-page", doc, "p={{page}}", map[string]string{"page": "7"}, "p=7"},
		{"put-get", doc, "@put:{k:@css:div#only@text}", nil, ""},
		{"get-miss", doc, "@get:{nope}", nil, ""},
		{"js-inline", doc, "@css:div.a p@text@js:result.toUpperCase()", nil, "P1\nP2\nP3"},
		{"empty", doc, "", nil, ""},
		{"none", doc, nil, nil, ""},
		{"ws", doc, "   ", nil, ""},
		{"json-name", js, "$.data.list[*].name", nil, "A\nB"},
		{"json-prefix", js, "@json:$.data.list[*].name", nil, "A\nB"},
		{"json-title", js, "$.title", nil, "T"},
		{"json-tags", js, "$.tags", nil, "x y"},
		{"json-bare", js, "data.list[*].name", nil, "A\nB"},
		{"json-miss", js, "$.nope", nil, ""},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			r := NewAnalyzeRule(tc.doc, tc.vars, "")
			got, err := r.GetString(tc.rule)
			if err != nil {
				t.Fatalf("GetString(%q) error: %v", tc.rule, err)
			}
			if got != tc.want {
				t.Errorf("GetString(%q) = %q, want %q", tc.rule, got, tc.want)
			}
		})
	}
}

// TestAnalyzeRulePutThenGet 验证 @put 写入的变量可被后续 @get 读到。
func TestAnalyzeRulePutThenGet(t *testing.T) {
	doc := arDoc(t)
	r := NewAnalyzeRule(doc, nil, "")
	if _, err := r.GetString("@put:{k:@css:div#only@text}"); err != nil {
		t.Fatalf("put: %v", err)
	}
	got, err := r.GetString("@get:{k}")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got != "Only" {
		t.Errorf("@get:{k} = %q, want %q", got, "Only")
	}
}

// TestAnalyzeRuleUnsupportedJS 验证外部副作用 JS 规则被拒绝。
func TestAnalyzeRuleUnsupportedJS(t *testing.T) {
	doc := arDoc(t)
	for _, rule := range []string{
		"<js>java.ajax('x')</js>",
		"{{js.x}}",
		"{{java.ajax}}",
	} {
		r := NewAnalyzeRule(doc, nil, "")
		_, err := r.GetString(rule)
		if err == nil {
			t.Errorf("GetString(%q) 应返回 JsRuleUnsupported", rule)
			continue
		}
		if _, ok := err.(*JsRuleUnsupported); !ok {
			t.Errorf("GetString(%q) 错误类型 = %T, want *JsRuleUnsupported", rule, err)
		}
	}
}

// TestAnalyzeRuleStringList 对齐 Python get_string_list 的 3 组向量。
func TestAnalyzeRuleStringList(t *testing.T) {
	doc := arDoc(t)
	js := arJSON()

	cases := []struct {
		name string
		doc  any
		rule string
		want []string
	}{
		{"list-lines", doc, "@css:div.a p@text", []string{"P1", "P2", "P3"}},
		{"list-empty", doc, "div.zzz", nil},
		{"list-json", js, "$.data.list[*].name", []string{"A", "B"}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			r := NewAnalyzeRule(tc.doc, nil, "")
			got, err := r.GetStringList(tc.rule)
			if err != nil {
				t.Fatalf("GetStringList(%q) error: %v", tc.rule, err)
			}
			if !reflect.DeepEqual(got, tc.want) {
				t.Errorf("GetStringList(%q) = %#v, want %#v", tc.rule, got, tc.want)
			}
		})
	}
}

// TestAnalyzeRuleElements 对齐 Python get_elements 的 9 组向量。
func TestAnalyzeRuleElements(t *testing.T) {
	doc := arDoc(t)
	js := arJSON()

	// nodeTexts 把结果里的 HTML 节点渲染为文本，便于与 Python 侧比对。
	nodeTexts := func(els []any) []string {
		var out []string
		for _, e := range els {
			switch n := e.(type) {
			case *htmlx.Node:
				out = append(out, n.Text())
			case *html.Node:
				out = append(out, htmlquery.InnerText(n))
			default:
				out = append(out, stringifyAny(e))
			}
		}
		return out
	}

	cases := []struct {
		name string
		doc  any
		rule string
		want []string
	}{
		{"els-css", doc, "@css:div.a p", []string{"P1", "P2", "P3"}},
		{"els-legado", doc, "class.a@tag.p", []string{"P1", "P2", "P3"}},
		{"els-or", doc, "div.zzz||@css:div.a p", []string{"P1", "P2", "P3"}},
		{"els-and", doc, "@css:div#only&&@css:div.a p", []string{"Only", "P1", "P2", "P3"}},
		{"els-interleave", doc, "@css:div.a p%%@css:div.b span", []string{"P1", "S1", "P2", "S2"}},
		{"els-empty", doc, "div.zzz", nil},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			r := NewAnalyzeRule(tc.doc, nil, "")
			got, err := r.GetElements(tc.rule)
			if err != nil {
				t.Fatalf("GetElements(%q) error: %v", tc.rule, err)
			}
			if texts := nodeTexts(got); !reflect.DeepEqual(texts, tc.want) {
				t.Errorf("GetElements(%q) = %#v, want %#v", tc.rule, texts, tc.want)
			}
		})
	}

	// JSON 列表：Python 侧返回 dict 列表，Go 侧返回 map 列表。
	t.Run("els-json", func(t *testing.T) {
		r := NewAnalyzeRule(js, nil, "")
		got, err := r.GetElements("$.data.list[*]")
		if err != nil {
			t.Fatalf("GetElements error: %v", err)
		}
		if len(got) != 2 {
			t.Fatalf("len = %d, want 2", len(got))
		}
		for i, want := range []string{"A", "B"} {
			m, ok := got[i].(map[string]any)
			if !ok {
				t.Fatalf("got[%d] 类型 = %T, want map[string]any", i, got[i])
			}
			if m["name"] != want {
				t.Errorf("got[%d][name] = %v, want %q", i, m["name"], want)
			}
		}
	})

	// $.data.list 返回单个列表，Python 侧会摊平为 2 个元素。
	t.Run("els-json-flat", func(t *testing.T) {
		r := NewAnalyzeRule(js, nil, "")
		got, err := r.GetElements("$.data.list")
		if err != nil {
			t.Fatalf("GetElements error: %v", err)
		}
		if len(got) != 2 {
			t.Fatalf("len = %d, want 2", len(got))
		}
	})

	// XPath 元素：Python 侧返回 Tag 对象，Go 侧返回节点。
	t.Run("els-xpath", func(t *testing.T) {
		r := NewAnalyzeRule(doc, nil, "")
		got, err := r.GetElements("//p")
		if err != nil {
			t.Fatalf("GetElements error: %v", err)
		}
		if texts := nodeTexts(got); !reflect.DeepEqual(texts, []string{"P1", "P2", "P3"}) {
			t.Errorf("GetElements(//p) = %#v", texts)
		}
	})
}

// TestAnalyzeRuleElementsUnsupportedJS 验证列表规则同样拒绝外部副作用 JS。
func TestAnalyzeRuleElementsUnsupportedJS(t *testing.T) {
	doc := arDoc(t)
	r := NewAnalyzeRule(doc, nil, "")
	if _, err := r.GetElements("<js>java.ajax('x')</js>"); err == nil {
		t.Error("GetElements 应返回 JsRuleUnsupported")
	}
}

// TestJavaReplacement 验证 Java 风格 $1 到 Go ${1} 的转换。
func TestJavaReplacement(t *testing.T) {
	cases := []struct{ in, want string }{
		{"$1", "${1}"},
		{"$2$1", "${2}${1}"},
		{"$12", "${12}"},
		{"", ""},
		{"no-group", "no-group"},
		{"$", "$"},
	}
	for _, tc := range cases {
		if got := javaReplacement(tc.in); got != tc.want {
			t.Errorf("javaReplacement(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

// TestSplitRegex 验证尾部正则拆分。
func TestSplitRegex(t *testing.T) {
	main, pat, repl, first := splitRegex("a##b##c")
	if main != "a" || pat == nil || *pat != "b" || repl != "c" || first {
		t.Errorf("a##b##c -> %q %v %q %v", main, pat, repl, first)
	}
	main, pat, repl, first = splitRegex("a##b##c###")
	if main != "a" || pat == nil || *pat != "b" || repl != "c" || !first {
		t.Errorf("a##b##c### -> %q %v %q %v", main, pat, repl, first)
	}
	main, pat, _, _ = splitRegex("plain")
	if main != "plain" || pat != nil {
		t.Errorf("plain -> %q %v", main, pat)
	}
}

// TestInterleave 验证 %% 交错语义（按最短组截断）。
func TestInterleave(t *testing.T) {
	got := interleave([][]any{{1, 2, 3}, {"a", "b"}})
	want := []any{1, "a", 2, "b"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("interleave = %#v, want %#v", got, want)
	}
	if got := interleave(nil); got != nil {
		t.Errorf("interleave(nil) = %#v, want nil", got)
	}
}
