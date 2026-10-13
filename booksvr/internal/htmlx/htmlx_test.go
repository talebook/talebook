package htmlx

import (
	"strings"
	"testing"

	"golang.org/x/net/html"
)

// mustParse 解析 HTML 或失败。
func mustParse(t *testing.T, content string) *Node {
	t.Helper()
	n, err := Parse(content)
	if err != nil {
		t.Fatalf("解析失败: %v", err)
	}
	return n
}

// TestSelectTag 覆盖标签选择器。
func TestSelectTag(t *testing.T) {
	doc := mustParse(t, `<div><p>a</p><p>b</p></div>`)
	got := doc.Select("p")
	if len(got) != 2 {
		t.Fatalf("得到 %d 个, want 2", len(got))
	}
	if got[0].Text() != "a" || got[1].Text() != "b" {
		t.Errorf("文本 = %q/%q", got[0].Text(), got[1].Text())
	}
}

// TestSelectClass 覆盖类选择器。
func TestSelectClass(t *testing.T) {
	doc := mustParse(t, `<div class="a b">x</div><div class="a">y</div>`)
	got := doc.Select("div.a")
	if len(got) != 2 {
		t.Fatalf("得到 %d 个, want 2", len(got))
	}
	got = doc.Select("div.b")
	if len(got) != 1 || got[0].Text() != "x" {
		t.Errorf("得到 %v", got)
	}
}

// TestSelectDescendant 覆盖后代选择器。
func TestSelectDescendant(t *testing.T) {
	doc := mustParse(t, `<div class="cover"><img src="/c.jpg"/></div>`)
	got := doc.SelectOne("div.cover img")
	if got == nil || got.Attr("src") != "/c.jpg" {
		t.Errorf("得到 %v", got)
	}
}

// TestSelectMultiLevel 覆盖多级后代选择器。
func TestSelectMultiLevel(t *testing.T) {
	doc := mustParse(t, `<hgroup><h5><a href="/b">T</a></h5></hgroup>`)
	got := doc.SelectOne("hgroup h5 a")
	if got == nil || got.Text() != "T" || got.Attr("href") != "/b" {
		t.Errorf("得到 %v", got)
	}
}

// TestSelectNoMatch 无匹配返回 nil。
func TestSelectNoMatch(t *testing.T) {
	doc := mustParse(t, `<div>x</div>`)
	if got := doc.Select("span"); got != nil {
		t.Errorf("得到 %v, want nil", got)
	}
	if got := doc.SelectOne("span"); got != nil {
		t.Errorf("得到 %v, want nil", got)
	}
	if got := doc.Select(""); got != nil {
		t.Errorf("空选择器得到 %v", got)
	}
}

// TestSelectNilReceiver nil 接收者不 panic。
func TestSelectNilReceiver(t *testing.T) {
	var n *Node
	if got := n.Select("div"); got != nil {
		t.Errorf("得到 %v", got)
	}
	if got := n.SelectOne("div"); got != nil {
		t.Errorf("得到 %v", got)
	}
	if got := n.Find("div"); got != nil {
		t.Errorf("得到 %v", got)
	}
	if got := n.FindAll("div", true); got != nil {
		t.Errorf("得到 %v", got)
	}
	if got := n.Attr("x"); got != "" {
		t.Errorf("得到 %q", got)
	}
	if got := n.Classes(); got != nil {
		t.Errorf("得到 %v", got)
	}
	if n.HasClass("x") {
		t.Error("nil 不应有 class")
	}
	if got := n.Text(); got != "" {
		t.Errorf("得到 %q", got)
	}
	if got := n.TextSep(","); got != "" {
		t.Errorf("得到 %q", got)
	}
}

// TestFindDescendantsOnly find 不包含节点自身。
func TestFindDescendantsOnly(t *testing.T) {
	doc := mustParse(t, `<div class="multi-fields"><span>作者: <span>刘慈欣</span></span></div>`)
	outer := doc.SelectOne("div.multi-fields span")
	if outer == nil {
		t.Fatal("未找到外层 span")
	}
	inner := outer.Find("span")
	if inner == nil {
		t.Fatal("未找到内层 span")
	}
	if inner.Text() != "刘慈欣" {
		t.Errorf("inner = %q, want 刘慈欣（不应返回自身）", inner.Text())
	}
}

// TestFindNoMatch 无匹配返回 nil。
func TestFindNoMatch(t *testing.T) {
	doc := mustParse(t, `<div>x</div>`)
	if got := doc.Find("span"); got != nil {
		t.Errorf("得到 %v", got)
	}
}

// TestFindAllRecursive recursive=true 查整棵子树。
func TestFindAllRecursive(t *testing.T) {
	doc := mustParse(t, `<div><span>a</span><p><span>b</span></p></div>`)
	got := doc.FindAll("span", true)
	if len(got) != 2 {
		t.Fatalf("得到 %d 个, want 2", len(got))
	}
}

// TestFindAllNonRecursive recursive=false 只查直接子节点。
//
// 注意：html.Parse 会把内容包进 html/head/body，因此必须从 div 节点
// 而非文档根开始查找。
func TestFindAllNonRecursive(t *testing.T) {
	doc := mustParse(t, `<div><span>a</span><p><span>b</span></p></div>`)
	div := doc.SelectOne("div")
	got := div.FindAll("span", false)
	if len(got) != 1 || got[0].Text() != "a" {
		t.Errorf("得到 %v, want 仅直接子节点", got)
	}
}

// TestAttr 覆盖属性读取。
func TestAttr(t *testing.T) {
	doc := mustParse(t, `<a href="/b" class="x y">T</a>`)
	a := doc.SelectOne("a")
	if a.Attr("href") != "/b" {
		t.Errorf("href = %q", a.Attr("href"))
	}
	if a.Attr("missing") != "" {
		t.Errorf("缺失属性应返回空串")
	}
}

// TestClasses 覆盖 class 列表。
func TestClasses(t *testing.T) {
	doc := mustParse(t, `<div class="x y z">T</div>`)
	got := doc.SelectOne("div").Classes()
	if len(got) != 3 || got[0] != "x" || got[2] != "z" {
		t.Errorf("得到 %v", got)
	}
	// 无 class。
	doc2 := mustParse(t, `<div>T</div>`)
	if got := doc2.SelectOne("div").Classes(); got != nil {
		t.Errorf("得到 %v, want nil", got)
	}
}

// TestHasClass 覆盖 class 判定。
func TestHasClass(t *testing.T) {
	doc := mustParse(t, `<div class="a b">T</div>`)
	d := doc.SelectOne("div")
	if !d.HasClass("a") || !d.HasClass("b") {
		t.Error("应命中 a 与 b")
	}
	if d.HasClass("c") {
		t.Error("不应命中 c")
	}
	// 部分匹配不应命中。
	doc2 := mustParse(t, `<div class="abc">T</div>`)
	if doc2.SelectOne("div").HasClass("a") {
		t.Error("abc 不应命中 a")
	}
}

// TestText 覆盖文本提取（separator=""）。
func TestText(t *testing.T) {
	doc := mustParse(t, `<span>作者: <span>刘慈欣</span></span>`)
	got := doc.SelectOne("span").Text()
	if got != "作者:刘慈欣" {
		t.Errorf("得到 %q, want 作者:刘慈欣", got)
	}
}

// TestTextSep 覆盖带分隔符的文本提取。
func TestTextSep(t *testing.T) {
	doc := mustParse(t, `<span>作者: <span>刘慈欣</span></span>`)
	got := doc.SelectOne("span").TextSep(" ")
	if got != "作者: 刘慈欣" {
		t.Errorf("得到 %q, want 作者: 刘慈欣", got)
	}
}

// TestTextWhitespace 覆盖空白处理。
//
// 单个文本节点内部的空白**不**被折叠（与 BeautifulSoup 的
// get_text(strip=True) 一致，它只 strip 首尾）。
func TestTextWhitespace(t *testing.T) {
	doc := mustParse(t, "<div>\n  a  \n  b\n</div>")
	if got := doc.SelectOne("div").Text(); got != "a  \n  b" {
		t.Errorf("得到 %q, want %q", got, "a  \n  b")
	}
	if got := doc.SelectOne("div").TextSep(" "); got != "a  \n  b" {
		t.Errorf("得到 %q", got)
	}
}

// TestTextMultiNodeWhitespace 多文本节点时各自 strip 再拼接。
func TestTextMultiNodeWhitespace(t *testing.T) {
	// Python 实测：separator="" 得到 "ab"，separator=" " 得到 "a b"。
	doc := mustParse(t, "<div>\n  a  \n  <span>b</span>\n</div>")
	if got := doc.SelectOne("div").Text(); got != "ab" {
		t.Errorf("得到 %q, want %q", got, "ab")
	}
	if got := doc.SelectOne("div").TextSep(" "); got != "a b" {
		t.Errorf("得到 %q, want %q", got, "a b")
	}
}

// TestParseInvalid 非法 HTML 仍能解析（HTML 容错）。
func TestParseInvalid(t *testing.T) {
	// x/net/html 对畸形输入容错，不应报错。
	if _, err := Parse("<<<>>>"); err != nil {
		t.Errorf("HTML 解析应容错，得到 %v", err)
	}
}

// TestParseEmpty 空输入。
func TestParseEmpty(t *testing.T) {
	doc := mustParse(t, "")
	if got := doc.Select("div"); got != nil {
		t.Errorf("得到 %v", got)
	}
}

// TestParseDeepNesting 深度嵌套不应 panic。
func TestParseDeepNesting(t *testing.T) {
	var b strings.Builder
	for i := 0; i < 2000; i++ {
		b.WriteString("<div>")
	}
	// 不 panic 即可（可能报错也可能成功）。
	_, _ = Parse(b.String())
}

// TestHasClassNoClassAttr 无 class 属性时返回 false。
func TestHasClassNoClassAttr(t *testing.T) {
	doc := mustParse(t, `<div id="x">T</div>`)
	if doc.SelectOne("div").HasClass("a") {
		t.Error("无 class 属性不应命中")
	}
}

// TestFindAllNilReceiver nil 接收者。
func TestFindAllNilReceiver(t *testing.T) {
	var n *Node
	if got := n.FindAll("div", false); got != nil {
		t.Errorf("得到 %v", got)
	}
}

// TestWalkNil walk 对 nil 节点不 panic。
func TestWalkNil(t *testing.T) {
	called := false
	walk(nil, func(*html.Node) { called = true })
	if called {
		t.Error("nil 节点不应触发回调")
	}
}

// TestParseSelector 覆盖选择器解析。
func TestParseSelector(t *testing.T) {
	got := parseSelector("div.cover img")
	if len(got) != 2 {
		t.Fatalf("得到 %d 段, want 2", len(got))
	}
	if got[0].tag != "div" || got[0].class != "cover" {
		t.Errorf("首段 = %+v", got[0])
	}
	if got[1].tag != "img" || got[1].class != "" {
		t.Errorf("次段 = %+v", got[1])
	}
	// 仅类名。
	got = parseSelector(".only-class")
	if len(got) != 1 || got[0].tag != "" || got[0].class != "only-class" {
		t.Errorf("得到 %+v", got)
	}
}

// TestMatches 覆盖匹配判定。
func TestMatches(t *testing.T) {
	doc := mustParse(t, `<div class="a">T</div>`)
	d := doc.SelectOne("div")
	if !matches(d.Raw, selector{tag: "div"}) {
		t.Error("应匹配标签")
	}
	if !matches(d.Raw, selector{tag: "div", class: "a"}) {
		t.Error("应匹配标签+类")
	}
	if matches(d.Raw, selector{tag: "span"}) {
		t.Error("不应匹配其他标签")
	}
	if matches(d.Raw, selector{tag: "div", class: "b"}) {
		t.Error("不应匹配其他类")
	}
	// 文本节点不匹配。
	if matches(d.Raw.FirstChild, selector{tag: "div"}) {
		t.Error("文本节点不应匹配")
	}
}
