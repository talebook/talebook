package booksource

import (
	"reflect"
	"testing"

	"talebook/booksvr/internal/htmlx"
)

// rdVectorHTML 与 Python 侧 tmp_rd.py 的 HTML 一致。
const rdVectorHTML = `<html><body>` +
	`<div class="a"><p>P1</p><p>P2</p><p>P3</p></div>` +
	`<div class="b"><span class="s">S1</span><span>S2</span></div>` +
	`<a href="/x" title="T1">Link1</a>` +
	`<a href="/y">Link2</a>` +
	`<img src="/i.png" data-src="/d.png"/>` +
	`<div id="only">Only</div>` +
	`<div class="multi"><b>B1</b>text1<b>B2</b>text2</div>` +
	`</body></html>`

func rdDoc(t *testing.T) *htmlx.Node {
	t.Helper()
	doc, err := htmlx.Parse(rdVectorHTML)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	return doc
}

// TestIsJSONDoc 对齐 Python is_json_doc。
func TestIsJSONDoc(t *testing.T) {
	cases := []struct {
		in   any
		want bool
	}{
		{map[string]any{"a": 1}, true},
		{[]any{1}, true},
		{"x", false},
		{nil, false},
	}
	for _, tc := range cases {
		if got := IsJSONDoc(tc.in); got != tc.want {
			t.Errorf("IsJSONDoc(%v) = %v, want %v", tc.in, got, tc.want)
		}
	}
}

// TestSplitCSSAttr 对齐 Python _split_css_attr。
func TestSplitCSSAttr(t *testing.T) {
	cases := []struct{ in, wantSel, wantAttr string }{
		{"div.a@text", "div.a", "text"},
		{"div.a", "div.a", ""},
		{"a@href@text", "a@href", "text"},
	}
	for _, tc := range cases {
		sel, attr := SplitCSSAttr(tc.in)
		if sel != tc.wantSel || attr != tc.wantAttr {
			t.Errorf("SplitCSSAttr(%q) = (%q, %q), want (%q, %q)", tc.in, sel, attr, tc.wantSel, tc.wantAttr)
		}
	}
}

// TestExtractAttr 对齐 Python extract_attr 的 12 组向量。
func TestExtractAttr(t *testing.T) {
	doc := rdDoc(t)
	p1 := doc.SelectOne("div.a p")
	multi := doc.SelectOne("div.multi")
	link := doc.SelectOne("a")
	img := doc.SelectOne("img")

	cases := []struct {
		name string
		node *htmlx.Node
		attr string
		want string
	}{
		{"default", p1, "", "P1"},
		{"text", p1, "text", "P1"},
		{"owntext", multi, "owntext", "text1 text2"},
		{"textnodes", multi, "textnodes", "text1\ntext2"},
		{"html", multi, "html", "<b>B1</b>text1<b>B2</b>text2"},
		{"href", link, "href", "/x"},
		{"title", link, "title", "T1"},
		{"missing", link, "nope", ""},
		{"data-src", img, "data-src", "/d.png"},
		{"nil_node", nil, "text", ""},
		{"case_insensitive", p1, "TEXT", "P1"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := ExtractAttr(tc.node, tc.attr); got != tc.want {
				t.Errorf("ExtractAttr(%q) = %q, want %q", tc.attr, got, tc.want)
			}
		})
	}
}

// TestSplitIndexSpec 对齐 Python _split_index_spec 的 11 组向量。
func TestSplitIndexSpec(t *testing.T) {
	cases := []struct {
		in         string
		wantBefore string
		wantMode   string
		wantItems  []indexItem
	}{
		{"tag.div.0", "tag.div", ".", []indexItem{{single: true, index: 0}}},
		{"tag.div.-1", "tag.div", ".", []indexItem{{single: true, index: -1}}},
		{"tag.div.0:2", "tag.div", ".", []indexItem{{single: true, index: 0}, {single: true, index: 2}}},
		{"tag.div!0:2", "tag.div", "!", []indexItem{{single: true, index: 0}, {single: true, index: 2}}},
		{"tag.div[1,3]", "tag.div", ".", []indexItem{{single: true, index: 1}, {single: true, index: 3}}},
		{"tag.div[!0]", "tag.div", "!", []indexItem{{single: true, index: 0}}},
		{"tag.div[-1]", "tag.div", ".", []indexItem{{single: true, index: -1}}},
		{"tag.div", "tag.div", "", nil},
		{"div[class]", "div[class]", "", nil},
	}
	for _, tc := range cases {
		t.Run(tc.in, func(t *testing.T) {
			before, mode, items := SplitIndexSpec(tc.in)
			if before != tc.wantBefore || mode != tc.wantMode {
				t.Errorf("SplitIndexSpec(%q) = (%q, %q), want (%q, %q)", tc.in, before, mode, tc.wantBefore, tc.wantMode)
			}
			if len(items) != len(tc.wantItems) {
				t.Fatalf("items 长度 = %d, want %d (%v)", len(items), len(tc.wantItems), items)
			}
			for i := range items {
				if items[i].single != tc.wantItems[i].single || items[i].index != tc.wantItems[i].index {
					t.Errorf("items[%d] = %+v, want %+v", i, items[i], tc.wantItems[i])
				}
			}
		})
	}

	// 区间形式单独校验。
	_, mode, items := SplitIndexSpec("tag.div[1:3]")
	if mode != "." || len(items) != 1 || items[0].single {
		t.Fatalf("区间解析 = (%q, %+v)", mode, items)
	}
	if items[0].start == nil || *items[0].start != 1 || items[0].end == nil || *items[0].end != 3 || items[0].step != 1 {
		t.Errorf("区间 = %+v", items[0])
	}
	_, _, items = SplitIndexSpec("tag.div[0:5:2]")
	if items[0].step != 2 {
		t.Errorf("步长 = %d, want 2", items[0].step)
	}
}

// TestExpandIndexes 对齐 Python _expand_indexes 的 10 组向量。
func TestExpandIndexes(t *testing.T) {
	single := func(n int) []indexItem { return []indexItem{{single: true, index: n}} }
	rng := func(s, e, st int) []indexItem {
		return []indexItem{{start: &s, end: &e, step: st}}
	}
	open := []indexItem{{step: 1}}

	cases := []struct {
		name   string
		items  []indexItem
		length int
		want   []int
	}{
		{"single", single(0), 5, []int{0}},
		{"neg", single(-1), 5, []int{4}},
		{"oob", single(10), 5, []int{}},
		{"multi", []indexItem{{single: true, index: 0}, {single: true, index: 2}, {single: true, index: 4}}, 5, []int{0, 2, 4}},
		{"range", rng(1, 3, 1), 5, []int{1, 2, 3}},
		{"range_step", rng(0, 4, 2), 5, []int{0, 2, 4}},
		{"range_rev", rng(4, 1, 1), 5, []int{4, 3, 2, 1}},
		{"range_neg", rng(-3, -1, 1), 5, []int{2, 3, 4}},
		{"range_open", open, 3, []int{0, 1, 2}},
		{"dedupe", []indexItem{{single: true, index: 0}, {single: true, index: 0}, {single: true, index: 1}}, 5, []int{0, 1}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := ExpandIndexes(tc.items, tc.length)
			if !reflect.DeepEqual(got, tc.want) {
				t.Errorf("ExpandIndexes = %v, want %v", got, tc.want)
			}
		})
	}
}

// TestApplyIndexFilter 对齐 Python _apply_index_filter 的 4 组向量。
func TestApplyIndexFilter(t *testing.T) {
	doc := rdDoc(t)
	// 用 5 个节点做下标测试。
	nodes := doc.Select("div.a p")
	if len(nodes) != 3 {
		t.Fatalf("测试数据不足: %d", len(nodes))
	}
	// 构造 5 个节点。
	five := append(append([]*htmlx.Node{}, nodes...), doc.Select("a")...)
	if len(five) != 5 {
		t.Fatalf("需要 5 个节点, 得到 %d", len(five))
	}

	sel := ApplyIndexFilter(five, ".", []indexItem{{single: true, index: 0}, {single: true, index: 2}})
	if len(sel) != 2 || sel[0] != five[0] || sel[1] != five[2] {
		t.Errorf("选择模式结果错误")
	}
	exc := ApplyIndexFilter(five, "!", []indexItem{{single: true, index: 0}, {single: true, index: 2}})
	if len(exc) != 3 || exc[0] != five[1] || exc[1] != five[3] || exc[2] != five[4] {
		t.Errorf("排除模式结果错误")
	}
	// 空模式或空 items 原样返回。
	if got := ApplyIndexFilter(five, "", []indexItem{{single: true, index: 0}}); len(got) != 5 {
		t.Errorf("空模式应原样返回, 得到 %d", len(got))
	}
	if got := ApplyIndexFilter(five, ".", nil); len(got) != 5 {
		t.Errorf("空 items 应原样返回, 得到 %d", len(got))
	}
}

// TestCSSSelect 对齐 Python css_select 的 7 组向量。
func TestCSSSelect(t *testing.T) {
	doc := rdDoc(t)

	if got := CSSSelect(doc, "div.a p", false); len(got) != 3 {
		t.Errorf("div.a p = %d 个, want 3", len(got))
	}
	if got := CSSSelect(doc, ".s", false); len(got) != 1 {
		t.Errorf(".s = %d 个, want 1", len(got))
	}
	// @attr 被剥离。
	if got := CSSSelect(doc, "div.a p@text", false); len(got) != 3 {
		t.Errorf("带 @attr = %d 个, want 3", len(got))
	}
	// 空选择器返回根节点。
	if got := CSSSelect(doc, "", false); len(got) != 1 || got[0] != doc {
		t.Errorf("空选择器应返回根节点")
	}
	if got := CSSSelect(doc, "div.zzz", false); len(got) != 0 {
		t.Errorf("无匹配 = %d 个, want 0", len(got))
	}
	// includeSelf。
	divA := doc.SelectOne("div.a")
	if got := CSSSelect(divA, "div.a", true); len(got) != 1 || got[0] != divA {
		t.Errorf("includeSelf 应包含自身")
	}
	if got := CSSSelect(divA, "div.zzz", true); len(got) != 0 {
		t.Errorf("includeSelf 无匹配 = %d 个, want 0", len(got))
	}
}

// TestLegadoSelect 对齐 Python legado_select 的 11 组向量。
func TestLegadoSelect(t *testing.T) {
	doc := rdDoc(t)

	cases := []struct {
		rule      string
		wantCount int
		wantAttr  string
		wantTexts []string
	}{
		{"class.a", 1, "", []string{"P1P2P3"}},
		{"class.a@tag.p", 3, "", []string{"P1", "P2", "P3"}},
		{"id.only", 1, "", []string{"Only"}},
		{"tag.a", 2, "", []string{"Link1", "Link2"}},
		{"tag.a@href", 2, "href", []string{"Link1", "Link2"}},
		{"class.a@tag.p.0", 1, "", []string{"P1"}},
		{"class.a@tag.p.-1", 1, "", []string{"P3"}},
		{"class.a@tag.p!0", 2, "", []string{"P2", "P3"}},
		{"class.a@children", 3, "", []string{"P1", "P2", "P3"}},
		{"text.Only", 1, "", []string{"Only"}},
	}
	for _, tc := range cases {
		t.Run(tc.rule, func(t *testing.T) {
			nodes, attr := LegadoSelect(doc, tc.rule)
			if len(nodes) != tc.wantCount {
				t.Fatalf("节点数 = %d, want %d", len(nodes), tc.wantCount)
			}
			if attr != tc.wantAttr {
				t.Errorf("attr = %q, want %q", attr, tc.wantAttr)
			}
			for i, n := range nodes {
				if got := n.Text(); got != tc.wantTexts[i] {
					t.Errorf("[%d] text = %q, want %q", i, got, tc.wantTexts[i])
				}
			}
		})
	}

	// 空规则返回根节点。
	nodes, attr := LegadoSelect(doc, "")
	if len(nodes) != 1 || nodes[0] != doc || attr != "" {
		t.Errorf("空规则 = (%d 个, %q)", len(nodes), attr)
	}
}

// TestJSONPathSelect 对齐 Python jsonpath_select 的 7 组向量。
func TestJSONPathSelect(t *testing.T) {
	obj := map[string]any{
		"a": map[string]any{"b": []any{
			map[string]any{"n": "x"}, map[string]any{"n": "y"},
		}},
		"c": float64(1),
		"d": []any{float64(1), float64(2)},
	}

	if got := JSONPathSelect(obj, "$.c"); !reflect.DeepEqual(got, []any{float64(1)}) {
		t.Errorf("$.c = %v", got)
	}
	if got := JSONPathSelect(obj, "$.a.b[0].n"); !reflect.DeepEqual(got, []any{"x"}) {
		t.Errorf("$.a.b[0].n = %v", got)
	}
	if got := JSONPathSelect(obj, "$.a.b[*].n"); !reflect.DeepEqual(got, []any{"x", "y"}) {
		t.Errorf("$.a.b[*].n = %v", got)
	}
	// 无 $ 前缀自动补。
	if got := JSONPathSelect(obj, "c"); !reflect.DeepEqual(got, []any{float64(1)}) {
		t.Errorf("c = %v", got)
	}
	// 缺失与非法表达式返回空。
	if got := JSONPathSelect(obj, "$.zzz"); len(got) != 0 {
		t.Errorf("缺失 = %v", got)
	}
	if got := JSONPathSelect(obj, "$.[[["); len(got) != 0 {
		t.Errorf("非法表达式 = %v", got)
	}
}

// TestXPathSelect 对齐 Python xpath_select 的 7 组向量。
func TestXPathSelect(t *testing.T) {
	doc := rdDoc(t)

	cases := []struct {
		expr string
		want []string
	}{
		{"//p", []string{"P1", "P2", "P3"}},
		{"//div[@class='a']/p", []string{"P1", "P2", "P3"}},
		{"//a/@href", []string{"/x", "/y"}},
		{"//p/text()", []string{"P1", "P2", "P3"}},
		{"//zzz", []string{}},
		{"//[[[", []string{}},
	}
	for _, tc := range cases {
		t.Run(tc.expr, func(t *testing.T) {
			got := XPathToStrings(XPathSelect(doc, tc.expr))
			if len(got) != len(tc.want) {
				t.Fatalf("结果数 = %d, want %d (%v)", len(got), len(tc.want), got)
			}
			for i := range got {
				if got[i] != tc.want[i] {
					t.Errorf("[%d] = %q, want %q", i, got[i], tc.want[i])
				}
			}
		})
	}
}

// TestIsAttrToken 对齐 Python _is_attr_token。
func TestIsAttrToken(t *testing.T) {
	for _, tok := range []string{"text", "html", "href", "src", "title", "alt", "value", "content", "data-src", "data-original", "data-x"} {
		if !IsAttrToken(tok) {
			t.Errorf("%q 应识别为属性", tok)
		}
	}
	for _, tok := range []string{"div", "class", "nope", "data-"} {
		if IsAttrToken(tok) {
			t.Errorf("%q 不应识别为属性", tok)
		}
	}
}

// TestResolveStepNodes 校验步骤前置规则。
func TestResolveStepNodes(t *testing.T) {
	doc := rdDoc(t)
	divA := doc.SelectOne("div.a")

	// children（默认）。
	if got := ResolveStepNodes(divA, ""); len(got) != 3 {
		t.Errorf("children = %d, want 3", len(got))
	}
	if got := ResolveStepNodes(divA, "children"); len(got) != 3 {
		t.Errorf("显式 children = %d, want 3", len(got))
	}
	// tag。
	if got := ResolveStepNodes(divA, "tag.p"); len(got) != 3 {
		t.Errorf("tag.p = %d, want 3", len(got))
	}
	// class。
	if got := ResolveStepNodes(doc, "class.s"); len(got) != 1 {
		t.Errorf("class.s = %d, want 1", len(got))
	}
	// id。
	if got := ResolveStepNodes(doc, "id.only"); len(got) != 1 {
		t.Errorf("id.only = %d, want 1", len(got))
	}
	// text。
	if got := ResolveStepNodes(doc, "text.Only"); len(got) != 1 {
		t.Errorf("text.Only = %d, want 1", len(got))
	}
	// nil 节点。
	if got := ResolveStepNodes(nil, "tag.p"); got != nil {
		t.Errorf("nil 节点 = %v", got)
	}
}

// TestStringifyAny 校验任意值字符串化。
func TestStringifyAny(t *testing.T) {
	cases := []struct {
		in   any
		want string
	}{
		{nil, ""},
		{"abc", "abc"},
		{true, "True"},
		{false, "False"},
		{float64(42), "42"},
		{float64(1.5), "1.5"},
	}
	for _, tc := range cases {
		if got := stringifyAny(tc.in); got != tc.want {
			t.Errorf("stringifyAny(%v) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

// TestClamp 校验区间裁剪。
func TestClamp(t *testing.T) {
	if got := clamp(-1, 0, 5); got != 0 {
		t.Errorf("clamp(-1) = %d", got)
	}
	if got := clamp(10, 0, 5); got != 5 {
		t.Errorf("clamp(10) = %d", got)
	}
	if got := clamp(3, 0, 5); got != 3 {
		t.Errorf("clamp(3) = %d", got)
	}
}
