package htmlx

import (
	"strings"
	"testing"
)

// htmlxVectorHTML 与 Python 侧 tmp_htmlx2.py 使用同一份 HTML。
const htmlxVectorHTML = `
<html><body>
<div id="info">
  <p class="product-desc">desc one</p>
  <p>plain</p>
  <span class="author-name-text">Author A</span>
</div>
<div id="fmimg"><img src="/a.jpg"/></div>
<div class="multi-fields"><span class="solo-hidden">S1</span><span>S2</span></div>
<ul><li class="product">P1</li><li class="product">P2</li></ul>
<a href="/tagarticle/1">tag1</a>
<a href="/other/2">other</a>
<a class="x" href="/tagarticle/3">tag3</a>
<table><tr><td>首发网站: abc</td><td>其他</td></tr></table>
<div class="page-abstract-content">abstract here</div>
<div class="notabstract">nope</div>
</body></html>
`

func vectorDoc(t *testing.T) *Node {
	t.Helper()
	doc, err := Parse(htmlxVectorHTML)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	return doc
}

func textOf(n *Node) string {
	if n == nil {
		return "<nil>"
	}
	return n.Text()
}

// TestFindByID 对齐 Python `find("div", id=...)`。
func TestFindByID(t *testing.T) {
	doc := vectorDoc(t)
	byID := func(id string) *Node {
		return doc.FindBy("div", map[string]AttrFilter{"id": AttrEqualsFilter(id)})
	}
	if got := textOf(byID("info")); got != "desc oneplainAuthor A" {
		t.Errorf("info = %q", got)
	}
	if got := textOf(byID("fmimg")); got != "" {
		t.Errorf("fmimg = %q", got)
	}
	if got := byID("nope"); got != nil {
		t.Errorf("nope 应为 nil, 得到 %q", textOf(got))
	}
}

// TestFindByClass 对齐 Python `find(tag, class_=...)`。
func TestFindByClass(t *testing.T) {
	doc := vectorDoc(t)
	got := doc.FindBy("p", map[string]AttrFilter{"class": ClassFilter("product-desc")})
	if textOf(got) != "desc one" {
		t.Errorf("p.product-desc = %q", textOf(got))
	}
	got = doc.FindBy("span", map[string]AttrFilter{"class": ClassFilter("author-name-text")})
	if textOf(got) != "Author A" {
		t.Errorf("span.author-name-text = %q", textOf(got))
	}
}

// TestFindAllByClass 对齐 Python `find_all(tag, class_=...)`。
func TestFindAllByClass(t *testing.T) {
	doc := vectorDoc(t)
	got := doc.FindAllBy("li", map[string]AttrFilter{"class": ClassFilter("product")}, true)
	if len(got) != 2 || textOf(got[0]) != "P1" || textOf(got[1]) != "P2" {
		t.Errorf("li.product = %v", []string{textOf(got[0]), textOf(got[1])})
	}
}

// TestFindAllByRecursive 对齐 Python `find_all(..., recursive=False)`。
func TestFindAllByRecursive(t *testing.T) {
	doc := vectorDoc(t)
	box := doc.SelectOne("div.multi-fields")
	if box == nil {
		t.Fatal("未找到 div.multi-fields")
	}
	shallow := box.FindAllBy("span", nil, false)
	if len(shallow) != 2 || textOf(shallow[0]) != "S1" || textOf(shallow[1]) != "S2" {
		t.Errorf("recursive=False = %v", []string{textOf(shallow[0]), textOf(shallow[1])})
	}
	deep := box.FindAllBy("span", nil, true)
	if len(deep) != 2 || textOf(deep[0]) != "S1" || textOf(deep[1]) != "S2" {
		t.Errorf("recursive=True = %v", []string{textOf(deep[0]), textOf(deep[1])})
	}
}

// TestFindAllClassContains 对齐 Python `find_all(class_=lambda x: "abstract" in str(x))`。
func TestFindAllClassContains(t *testing.T) {
	doc := vectorDoc(t)
	got := doc.FindAllBy("", map[string]AttrFilter{"class": ClassContainsFilter("abstract")}, true)
	if len(got) != 2 || textOf(got[0]) != "abstract here" || textOf(got[1]) != "nope" {
		t.Errorf("class 含 abstract = %v", []string{textOf(got[0]), textOf(got[1])})
	}
}

// TestFindByText 对齐 Python `find("td", string=lambda t: "首发网站" in t)`。
func TestFindByText(t *testing.T) {
	doc := vectorDoc(t)
	got := doc.FindByText("td", func(s string) bool { return strings.Contains(s, "首发网站") })
	if textOf(got) != "首发网站: abc" {
		t.Errorf("td 含首发网站 = %q", textOf(got))
	}
	if doc.FindByText("td", func(s string) bool { return strings.Contains(s, "不存在") }) != nil {
		t.Error("不应命中")
	}
}

// TestSelectAttrContains 对齐 Python `select('a[href*="tagarticle"]')`。
func TestSelectAttrContains(t *testing.T) {
	doc := vectorDoc(t)
	got := doc.Select(`a[href*="tagarticle"]`)
	if len(got) != 2 || textOf(got[0]) != "tag1" || textOf(got[1]) != "tag3" {
		t.Errorf("href 含 tagarticle = %v", []string{textOf(got[0]), textOf(got[1])})
	}
}

// TestSelectAttrPrefixSuffixEq 覆盖 ^= / $= / = 三种属性选择器。
func TestSelectAttrPrefixSuffixEq(t *testing.T) {
	doc := vectorDoc(t)
	prefix := doc.Select(`a[href^="/tag"]`)
	if len(prefix) != 2 || textOf(prefix[0]) != "tag1" || textOf(prefix[1]) != "tag3" {
		t.Errorf("^= = %v", []string{textOf(prefix[0]), textOf(prefix[1])})
	}
	suffix := doc.Select(`a[href$="/2"]`)
	if len(suffix) != 1 || textOf(suffix[0]) != "other" {
		t.Errorf("$= = %v", []string{textOf(suffix[0])})
	}
	eq := doc.Select(`a[href="/other/2"]`)
	if len(eq) != 1 || textOf(eq[0]) != "other" {
		t.Errorf("= = %v", []string{textOf(eq[0])})
	}
}

// TestSelectNotAttr 对齐 Python `select_one('a:not([class])')`。
func TestSelectNotAttr(t *testing.T) {
	doc := vectorDoc(t)
	got := doc.SelectOne(`a:not([class])`)
	if textOf(got) != "tag1" {
		t.Errorf("a:not([class]) = %q", textOf(got))
	}
	if got == nil || got.Attr("href") != "/tagarticle/1" {
		t.Errorf("href = %q", got.Attr("href"))
	}
}

// TestSelectDescendantClass 对齐 Python `select_one("div.multi-fields span.solo-hidden")`。
func TestSelectDescendantClass(t *testing.T) {
	doc := vectorDoc(t)
	if got := textOf(doc.SelectOne("div.multi-fields span.solo-hidden")); got != "S1" {
		t.Errorf("后代选择器 = %q", got)
	}
	if got := textOf(doc.SelectOne("div.multi-fields")); got != "S1S2" {
		t.Errorf("div.multi-fields = %q", got)
	}
	if got := doc.SelectOne("div.nope"); got != nil {
		t.Errorf("不存在应为 nil, 得到 %q", textOf(got))
	}
}

// TestParseSimpleSelector 覆盖新增选择器语法的解析。
func TestParseSimpleSelector(t *testing.T) {
	s := parseSimpleSelector(`a[href*="tagarticle"]`)
	if s.tag != "a" || s.attr != "href" || s.attrOp != "*=" || s.attrVal != "tagarticle" {
		t.Errorf("得到 %+v", s)
	}
	s = parseSimpleSelector(`a:not([class])`)
	if s.tag != "a" || s.notAttr != "class" {
		t.Errorf("得到 %+v", s)
	}
	s = parseSimpleSelector(`div.cover`)
	if s.tag != "div" || s.class != "cover" {
		t.Errorf("得到 %+v", s)
	}
	s = parseSimpleSelector(`a[href^="/tag"]`)
	if s.attrOp != "^=" || s.attrVal != "/tag" {
		t.Errorf("得到 %+v", s)
	}
}

// TestAttrFilters 覆盖各属性谓词构造器。
func TestAttrFilters(t *testing.T) {
	if !AttrPresentFilter()("", true) || AttrPresentFilter()("", false) {
		t.Error("AttrPresentFilter 语义错误")
	}
	if !AttrContainsFilter("ab")("xaby", true) || AttrContainsFilter("ab")("xy", true) {
		t.Error("AttrContainsFilter 语义错误")
	}
	if AttrContainsFilter("ab")("xaby", false) {
		t.Error("属性不存在时不应命中")
	}
	if !ClassFilter("a", "b")("x b y", true) || ClassFilter("a")("xby", true) {
		t.Error("ClassFilter 语义错误")
	}
	if ClassFilter("a")("a", false) {
		t.Error("class 不存在时不应命中")
	}
	if !ClassContainsFilter("ab")("xaby", true) || ClassContainsFilter("ab")("xy", true) {
		t.Error("ClassContainsFilter 语义错误")
	}
}

// TestFindByNilFilters 覆盖空谓词与 nil 接收者。
func TestFindByNilFilters(t *testing.T) {
	doc := vectorDoc(t)
	// 谓词为 nil 时视为不过滤。
	got := doc.FindBy("p", map[string]AttrFilter{"class": nil})
	if textOf(got) != "desc one" {
		t.Errorf("nil 谓词 = %q", textOf(got))
	}
	var nilNode *Node
	if nilNode.FindBy("p", nil) != nil {
		t.Error("nil 接收者应返回 nil")
	}
	if nilNode.FindAllBy("p", nil, true) != nil {
		t.Error("nil 接收者应返回 nil")
	}
	if nilNode.FindByText("p", func(string) bool { return true }) != nil {
		t.Error("nil 接收者应返回 nil")
	}
}

// TestFindAllByTagOnly 覆盖只按标签查找。
func TestFindAllByTagOnly(t *testing.T) {
	doc := vectorDoc(t)
	got := doc.FindAllBy("a", nil, true)
	if len(got) != 3 || textOf(got[0]) != "tag1" || textOf(got[1]) != "other" || textOf(got[2]) != "tag3" {
		t.Errorf("find_all(a) = %v", []string{textOf(got[0]), textOf(got[1]), textOf(got[2])})
	}
}

// TestFindAllByEmptyClass 覆盖无命中场景。
func TestFindAllByEmptyClass(t *testing.T) {
	doc := vectorDoc(t)
	if got := doc.FindAllBy("", map[string]AttrFilter{"class": ClassFilter("f")}, true); len(got) != 0 {
		t.Errorf("class=f 应无命中, 得到 %d 个", len(got))
	}
}
