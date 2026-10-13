// Package htmlx 提供基于 golang.org/x/net/html 的轻量 DOM 查询辅助。
//
// 复刻元数据源用到的 BeautifulSoup 子集：CSS 选择器（标签、类、后代）、
// 文本提取与属性读取。
package htmlx

import (
	"strings"

	"golang.org/x/net/html"
)

// Node 是 HTML 节点的薄封装。
type Node struct {
	Raw *html.Node
}

// Parse 解析 HTML 文本。
//
// 注意：x/net/html 对畸形输入高度容错，实际上几乎不会返回错误；
// 保留 error 返回值是为了与调用方的错误处理习惯一致。
func Parse(content string) (*Node, error) {
	n, err := html.Parse(strings.NewReader(content))
	if err != nil {
		return nil, err
	}
	return &Node{Raw: n}, nil
}

// selector 是解析后的单段选择器。
type selector struct {
	tag     string
	class   string
	id      string // #id
	attr    string // 属性名
	attrOp  string // "*=" / "=" / "^=" / "$="
	attrVal string
	notAttr string // :not([attr]) 中的属性名
}

// parseSelector 解析 "div.cover" / "hgroup h5 a" / `a[href*="x"]` 这类选择器。
//
// 支持：标签名、单个类名、#id、属性选择器（*=、=、^=、$=）、:not([attr])。
// 空格分隔表示后代关系。
func parseSelector(sel string) []selector {
	parts := strings.Fields(sel)
	out := make([]selector, 0, len(parts))
	for _, p := range parts {
		out = append(out, parseSimpleSelector(p))
	}
	return out
}

// parseSimpleSelector 解析单段选择器。
func parseSimpleSelector(p string) selector {
	s := selector{}

	// 先剥离 :not([attr])。
	if i := strings.Index(p, ":not("); i >= 0 {
		end := strings.Index(p[i:], ")")
		if end > 0 {
			inner := p[i+len(":not(") : i+end]
			inner = strings.TrimSuffix(strings.TrimPrefix(inner, "["), "]")
			s.notAttr = inner
			p = p[:i] + p[i+end+1:]
		}
	}

	// 再剥离 [attr op "value"]。
	if i := strings.Index(p, "["); i >= 0 {
		end := strings.Index(p[i:], "]")
		if end > 0 {
			inner := p[i+1 : i+end]
			for _, op := range []string{"*=", "^=", "$=", "="} {
				if j := strings.Index(inner, op); j >= 0 {
					s.attr = inner[:j]
					s.attrOp = op
					s.attrVal = strings.Trim(inner[j+len(op):], `"'`)
					break
				}
			}
			p = p[:i] + p[i+end+1:]
		}
	}

	// 处理 #id。
	if i := strings.Index(p, "#"); i >= 0 {
		s.id = p[i+1:]
		p = p[:i]
	}

	// 最后处理标签名与类名。
	if i := strings.Index(p, "."); i >= 0 {
		s.tag = p[:i]
		s.class = p[i+1:]
	} else {
		s.tag = p
	}
	return s
}

// matches 判断节点是否匹配单段选择器。
func matches(n *html.Node, s selector) bool {
	if n.Type != html.ElementNode {
		return false
	}
	if s.tag != "" && n.Data != s.tag {
		return false
	}
	if s.class != "" && !hasClass(n, s.class) {
		return false
	}
	if s.id != "" {
		if v, present := attrOf(n, "id"); !present || v != s.id {
			return false
		}
	}
	if s.notAttr != "" {
		if _, present := attrOf(n, s.notAttr); present {
			return false
		}
	}
	if s.attr != "" {
		value, present := attrOf(n, s.attr)
		if !present {
			return false
		}
		switch s.attrOp {
		case "*=":
			if !strings.Contains(value, s.attrVal) {
				return false
			}
		case "^=":
			if !strings.HasPrefix(value, s.attrVal) {
				return false
			}
		case "$=":
			if !strings.HasSuffix(value, s.attrVal) {
				return false
			}
		default:
			if value != s.attrVal {
				return false
			}
		}
	}
	return true
}

// hasClass 判断节点是否含指定 class。
func hasClass(n *html.Node, class string) bool {
	for _, a := range n.Attr {
		if a.Key != "class" {
			continue
		}
		for _, c := range strings.Fields(a.Val) {
			if c == class {
				return true
			}
		}
	}
	return false
}

// Select 复刻 BeautifulSoup.select：返回所有匹配的后代节点（文档序）。
func (n *Node) Select(sel string) []*Node {
	if n == nil || n.Raw == nil {
		return nil
	}
	parts := parseSelector(sel)
	if len(parts) == 0 {
		return nil
	}
	var out []*Node
	// 逐段下推：第一段在整棵子树中找，后续段在上一段结果的子树中找。
	// 注意：BeautifulSoup.select 只搜后代，不含节点自身，
	// 因此这里从子节点开始遍历（walk 含 root，不能直接用）。
	current := []*html.Node{n.Raw}
	for _, part := range parts {
		var next []*html.Node
		for _, root := range current {
			walkDescendants(root, func(c *html.Node) {
				if matches(c, part) {
					next = append(next, c)
				}
			})
		}
		current = next
		if len(current) == 0 {
			return nil
		}
	}
	for _, c := range current {
		out = append(out, &Node{Raw: c})
	}
	return out
}

// SelectOne 复刻 BeautifulSoup.select_one：返回首个匹配节点，无则 nil。
func (n *Node) SelectOne(sel string) *Node {
	got := n.Select(sel)
	if len(got) == 0 {
		return nil
	}
	return got[0]
}

// Find 复刻 BeautifulSoup.find：在**后代**中找首个指定标签。
//
// 注意：BeautifulSoup 的 find 不包含节点自身，因此这里从子节点开始遍历。
func (n *Node) Find(tag string) *Node {
	return n.FindBy(tag, nil)
}

// AttrFilter 是属性匹配谓词；返回 true 表示命中。
type AttrFilter func(value string, present bool) bool

// FindBy 复刻 BeautifulSoup.find(tag, **attrs)。
//
// filters 的键是属性名（class_ 写作 "class"），值为匹配谓词。
// tag 为空串时只按属性匹配。
func (n *Node) FindBy(tag string, filters map[string]AttrFilter) *Node {
	if n == nil || n.Raw == nil {
		return nil
	}
	var found *html.Node
	for c := n.Raw.FirstChild; c != nil && found == nil; c = c.NextSibling {
		walk(c, func(x *html.Node) {
			if found == nil && matchNode(x, tag, filters) {
				found = x
			}
		})
	}
	if found == nil {
		return nil
	}
	return &Node{Raw: found}
}

// FindAllBy 复刻 BeautifulSoup.find_all(tag, **attrs)。
//
// recursive 为 false 时只查直接子节点。
func (n *Node) FindAllBy(tag string, filters map[string]AttrFilter, recursive bool) []*Node {
	if n == nil || n.Raw == nil {
		return nil
	}
	var out []*Node
	collect := func(x *html.Node) {
		if matchNode(x, tag, filters) {
			out = append(out, &Node{Raw: x})
		}
	}
	if recursive {
		walk(n.Raw, func(x *html.Node) {
			if x != n.Raw {
				collect(x)
			}
		})
		return out
	}
	for c := n.Raw.FirstChild; c != nil; c = c.NextSibling {
		collect(c)
	}
	return out
}

// matchNode 判断节点是否匹配标签与属性谓词。
func matchNode(x *html.Node, tag string, filters map[string]AttrFilter) bool {
	if x.Type != html.ElementNode {
		return false
	}
	if tag != "" && x.Data != tag {
		return false
	}
	for key, fn := range filters {
		value, present := attrOf(x, key)
		if fn != nil && !fn(value, present) {
			return false
		}
	}
	return true
}

// attrOf 读取节点属性。
func attrOf(x *html.Node, key string) (string, bool) {
	for _, a := range x.Attr {
		if a.Key == key {
			return a.Val, true
		}
	}
	return "", false
}

// ClassFilter 构造 class 谓词：命中任一给定类名即通过。
func ClassFilter(classes ...string) AttrFilter {
	return func(value string, present bool) bool {
		if !present {
			return false
		}
		for _, want := range classes {
			for _, got := range strings.Fields(value) {
				if got == want {
					return true
				}
			}
		}
		return false
	}
}

// ClassContainsFilter 构造 class 谓词：类名包含子串即通过。
//
// 复刻 `class_=lambda x: "abstract" in str(x)` 这类用法。
func ClassContainsFilter(substr string) AttrFilter {
	return func(value string, present bool) bool {
		return present && strings.Contains(value, substr)
	}
}

// AttrEqualsFilter 构造属性等值谓词。
func AttrEqualsFilter(want string) AttrFilter {
	return func(value string, present bool) bool {
		return present && value == want
	}
}

// AttrPresentFilter 构造「属性存在」谓词。
func AttrPresentFilter() AttrFilter {
	return func(_ string, present bool) bool { return present }
}

// AttrContainsFilter 构造属性包含子串谓词。
func AttrContainsFilter(substr string) AttrFilter {
	return func(value string, present bool) bool {
		return present && strings.Contains(value, substr)
	}
}

// FindByText 复刻 find(tag, string=pred)：按节点文本查找。
//
// 复刻 `find("td", string=lambda text: text and "首发网站" in text)`。
func (n *Node) FindByText(tag string, pred func(string) bool) *Node {
	if n == nil || n.Raw == nil {
		return nil
	}
	var found *html.Node
	for c := n.Raw.FirstChild; c != nil && found == nil; c = c.NextSibling {
		walk(c, func(x *html.Node) {
			if found != nil || x.Type != html.ElementNode {
				return
			}
			if tag != "" && x.Data != tag {
				return
			}
			if pred((&Node{Raw: x}).Text()) {
				found = x
			}
		})
	}
	if found == nil {
		return nil
	}
	return &Node{Raw: found}
}

// FindAll 复刻 BeautifulSoup.find_all(tag, recursive=False)。
//
// recursive 为 false 时只查直接子节点。
func (n *Node) FindAll(tag string, recursive bool) []*Node {
	if n == nil || n.Raw == nil {
		return nil
	}
	var out []*Node
	if recursive {
		// 同 Select：BeautifulSoup 的 find_all 不含节点自身。
		walkDescendants(n.Raw, func(c *html.Node) {
			if c.Type == html.ElementNode && c.Data == tag {
				out = append(out, &Node{Raw: c})
			}
		})
		return out
	}
	for c := n.Raw.FirstChild; c != nil; c = c.NextSibling {
		if c.Type == html.ElementNode && c.Data == tag {
			out = append(out, &Node{Raw: c})
		}
	}
	return out
}

// 节点类型常量，避免调用方直接依赖 x/net/html。
const (
	// NodeText 是文本节点。
	NodeText = html.TextNode
	// NodeElement 是元素节点。
	NodeElement = html.ElementNode
)

// Attr 是节点的一个属性键值对。
type Attr struct {
	Key string
	Val string
}

// Attrs 按文档顺序返回节点的全部属性。
func (n *Node) Attrs() []Attr {
	if n == nil || n.Raw == nil {
		return nil
	}
	out := make([]Attr, 0, len(n.Raw.Attr))
	for _, a := range n.Raw.Attr {
		out = append(out, Attr{Key: a.Key, Val: a.Val})
	}
	return out
}

// Walk 按前序遍历子树（含自身），对每个节点调用 fn。
//
// 复刻 html.parser 的事件流顺序，供需要状态机的调用方使用。
func (n *Node) Walk(fn func(*Node)) {
	if n == nil || n.Raw == nil {
		return
	}
	walk(n.Raw, func(x *html.Node) { fn(&Node{Raw: x}) })
}

// Attr 读取属性值；缺失返回空串。
func (n *Node) Attr(key string) string {
	v, _ := n.AttrOK(key)
	return v
}

// AttrOK 读取属性值并报告是否存在。
//
// 复刻 BeautifulSoup 的 has_attr：属性存在但值为空串时仍返回 true。
func (n *Node) AttrOK(key string) (string, bool) {
	if n == nil || n.Raw == nil {
		return "", false
	}
	return attrOf(n.Raw, key)
}

// Classes 返回节点的 class 列表。
func (n *Node) Classes() []string {
	if n == nil || n.Raw == nil {
		return nil
	}
	for _, a := range n.Raw.Attr {
		if a.Key == "class" {
			return strings.Fields(a.Val)
		}
	}
	return nil
}

// HasClass 判断节点是否含指定 class。
func (n *Node) HasClass(class string) bool {
	if n == nil || n.Raw == nil {
		return false
	}
	return hasClass(n.Raw, class)
}

// Text 复刻 get_text(strip=True)：拼接所有文本节点并去除首尾空白。
func (n *Node) Text() string {
	return strings.TrimSpace(n.TextSep(""))
}

// TextSep 复刻 get_text(separator=sep, strip=True)。
//
// 每个文本片段单独 strip，再用 sep 连接。
func (n *Node) TextSep(sep string) string {
	if n == nil || n.Raw == nil {
		return ""
	}
	var parts []string
	walk(n.Raw, func(c *html.Node) {
		if c.Type == html.TextNode {
			if t := strings.TrimSpace(c.Data); t != "" {
				parts = append(parts, t)
			}
		}
	})
	return strings.Join(parts, sep)
}

// walkDescendants 深度优先遍历子树，不含 root 自身。
//
// 对应 BeautifulSoup 的 find_all 语义：只搜后代。
func walkDescendants(n *html.Node, fn func(*html.Node)) {
	if n == nil {
		return
	}
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		walk(c, fn)
	}
}

// walk 深度优先遍历子树（含 root 自身）。
func walk(n *html.Node, fn func(*html.Node)) {
	if n == nil {
		return
	}
	fn(n)
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		walk(c, fn)
	}
}
