package booksource

import (
	"encoding/json"
	"regexp"
	"strconv"
	"strings"

	"github.com/PaesslerAG/jsonpath"
	"github.com/antchfx/htmlquery"
	"golang.org/x/net/html"

	"talebook/booksvr/internal/htmlx"
)

// 本文件复刻 webserver/services/booksource/rule_dispatch.py。
//
// 把单条简单规则作用到 HTML 节点 / JSON 对象上。不处理组合符（&& || %%）
// 与正则（##），那些由 AnalyzeRule 负责。

// attrText 复刻 _ATTR_TEXT。
var attrText = map[string]bool{"text": true, "textnodes": true, "owntext": true}

// attrHTML 复刻 _ATTR_HTML。
var attrHTML = map[string]bool{"html": true, "outerhtml": true, "innerhtml": true, "all": true}

// knownAttrs 复刻 _KNOWN_ATTRS。
var knownAttrs = map[string]bool{
	"text": true, "textnodes": true, "owntext": true,
	"html": true, "outerhtml": true, "innerhtml": true, "all": true,
	"href": true, "src": true, "title": true, "alt": true, "value": true,
	"content": true, "data-src": true, "data-original": true,
}

// dataAttrRe 复刻 re.match(r"^data-[\w-]+$", key)。
var dataAttrRe = regexp.MustCompile(`^data-[\w-]+$`)

// IsJSONDoc 复刻 is_json_doc。
func IsJSONDoc(doc any) bool {
	switch doc.(type) {
	case map[string]any, []any:
		return true
	}
	return false
}

// ExtractAttr 复刻 extract_attr：从节点提取文本或属性。
func ExtractAttr(node *htmlx.Node, attr string) string {
	if node == nil {
		return ""
	}
	if attr == "" {
		return node.TextSep("\n")
	}
	key := strings.ToLower(attr)
	switch key {
	case "textnodes":
		// Legado textNodes：仅直接子文本节点，逐条 trim 后用换行拼接。
		parts := directTextParts(node)
		return strings.Join(parts, "\n")
	case "owntext":
		// Legado ownText：仅直接子文本节点，空白规整为单空格。
		parts := directTextParts(node)
		return strings.Join(parts, " ")
	}
	if attrText[key] {
		return node.TextSep("\n")
	}
	if attrHTML[key] {
		return innerHTML(node)
	}
	val, ok := node.AttrOK(attr)
	if !ok {
		return ""
	}
	return val
}

// directTextParts 取直接子文本节点（trim 后非空）。
func directTextParts(node *htmlx.Node) []string {
	var parts []string
	for c := node.Raw.FirstChild; c != nil; c = c.NextSibling {
		if c.Type == html.TextNode {
			if s := strings.TrimSpace(c.Data); s != "" {
				parts = append(parts, s)
			}
		}
	}
	return parts
}

// innerHTML 复刻 node.decode_contents()。
func innerHTML(node *htmlx.Node) string {
	var b strings.Builder
	for c := node.Raw.FirstChild; c != nil; c = c.NextSibling {
		_ = html.Render(&b, c)
	}
	return b.String()
}

// SplitCSSAttr 复刻 _split_css_attr：把 `selector@attr` 拆成 (selector, attr)。
func SplitCSSAttr(rule string) (string, string) {
	if i := strings.LastIndex(rule, "@"); i >= 0 {
		return rule[:i], rule[i+1:]
	}
	return rule, ""
}

// Legado 索引语法（ElementsSingle 移植）：
//
//	旧写法  tag.div.0 / tag.div.-1:10:2（`:` 分隔多个独立索引）/ tag.div!0:3（`!` 排除）
//	[]写法  tag.div[1,3:5,-1]（区间 start:end:step，支持负数与反向 [-1:0]，[! 开头表示排除）
var (
	indexLegacyRe  = regexp.MustCompile(`^(.+?)([.!])(-?\d+(?::-?\d+)*)$`)
	indexBracketRe = regexp.MustCompile(`\[(!?)\s*([\d\s:,-]*)\]$`)
	hasDigitRe     = regexp.MustCompile(`\d`)
)

// indexItem 是索引项：单个下标或区间。
type indexItem struct {
	single bool
	index  int
	start  *int
	end    *int
	step   int
}

// SplitIndexSpec 复刻 _split_index_spec。
//
// 返回 (前置规则, 模式, 索引项列表)；模式为 "" / "." / "!"。
func SplitIndexSpec(step string) (string, string, []indexItem) {
	s := strings.TrimSpace(step)
	if m := indexBracketRe.FindStringSubmatch(s); m != nil && hasDigitRe.MatchString(m[2]) {
		if items, ok := parseBracketItems(m[2]); ok {
			mode := "."
			if m[1] == "!" {
				mode = "!"
			}
			return strings.TrimSpace(s[:strings.LastIndex(s, "[")]), mode, items
		}
	}
	if m := indexLegacyRe.FindStringSubmatch(s); m != nil {
		var items []indexItem
		for _, x := range strings.Split(m[3], ":") {
			n, err := strconv.Atoi(x)
			if err != nil {
				return s, "", nil
			}
			items = append(items, indexItem{single: true, index: n})
		}
		return strings.TrimSpace(m[1]), m[2], items
	}
	return s, "", nil
}

// parseBracketItems 复刻 _parse_bracket_items：含非法片段时返回 (nil, false)。
func parseBracketItems(content string) ([]indexItem, bool) {
	var items []indexItem
	for _, part := range strings.Split(content, ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		bits := strings.Split(part, ":")
		switch {
		case len(bits) == 1:
			n, err := strconv.Atoi(bits[0])
			if err != nil {
				return nil, false
			}
			items = append(items, indexItem{single: true, index: n})
		case len(bits) <= 3:
			var start, end *int
			if strings.TrimSpace(bits[0]) != "" {
				n, err := strconv.Atoi(bits[0])
				if err != nil {
					return nil, false
				}
				start = &n
			}
			if strings.TrimSpace(bits[1]) != "" {
				n, err := strconv.Atoi(bits[1])
				if err != nil {
					return nil, false
				}
				end = &n
			}
			step := 1
			if len(bits) == 3 && strings.TrimSpace(bits[2]) != "" {
				n, err := strconv.Atoi(bits[2])
				if err != nil {
					return nil, false
				}
				step = n
			}
			items = append(items, indexItem{start: start, end: end, step: step})
		default:
			return nil, false
		}
	}
	if len(items) == 0 {
		return nil, false
	}
	return items, true
}

// ExpandIndexes 复刻 _expand_indexes：展开为去重保序的下标列表。
func ExpandIndexes(items []indexItem, length int) []int {
	out := []int{}
	seen := map[int]bool{}
	add := func(i int) {
		if !seen[i] {
			seen[i] = true
			out = append(out, i)
		}
	}

	for _, item := range items {
		if item.single {
			i := item.index
			if i >= 0 && i < length {
				add(i)
			} else if i < 0 && length >= -i {
				add(i + length)
			}
			continue
		}
		start := 0
		if item.start != nil {
			start = *item.start
			if start < 0 {
				start += length
			}
		}
		end := length - 1
		if item.end != nil {
			end = *item.end
			if end < 0 {
				end += length
			}
		}
		if (start < 0 && end < 0) || (start >= length && end >= length) {
			continue
		}
		start = clamp(start, 0, length-1)
		end = clamp(end, 0, length-1)
		step := item.step
		if start == end || step >= length {
			add(start)
			continue
		}
		if step <= 0 {
			if -step < length {
				step += length
			} else {
				step = 1
			}
		}
		if end > start {
			for i := start; i <= end; i += step {
				add(i)
			}
		} else {
			for i := start; i >= end; i -= step {
				add(i)
			}
		}
	}
	return out
}

// clamp 把 v 限制在 [lo, hi]。
func clamp(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

// ApplyIndexFilter 复刻 _apply_index_filter。
func ApplyIndexFilter(found []*htmlx.Node, mode string, items []indexItem) []*htmlx.Node {
	if len(items) == 0 || (mode != "." && mode != "!") {
		return found
	}
	idxs := ExpandIndexes(items, len(found))
	if mode == "!" {
		excluded := map[int]bool{}
		for _, i := range idxs {
			excluded[i] = true
		}
		out := make([]*htmlx.Node, 0, len(found))
		for i, el := range found {
			if !excluded[i] {
				out = append(out, el)
			}
		}
		return out
	}
	out := make([]*htmlx.Node, 0, len(idxs))
	for _, i := range idxs {
		out = append(out, found[i])
	}
	return out
}

// ResolveStepNodes 复刻 _resolve_step_nodes。
func ResolveStepNodes(node *htmlx.Node, before string) []*htmlx.Node {
	if node == nil {
		return nil
	}
	if before == "" || before == "children" {
		var out []*htmlx.Node
		for c := node.Raw.FirstChild; c != nil; c = c.NextSibling {
			if c.Type == html.ElementNode {
				out = append(out, &htmlx.Node{Raw: c})
			}
		}
		return out
	}
	head := before
	rest := ""
	if i := strings.Index(before, "."); i >= 0 {
		head = before[:i]
		rest = before[i+1:]
	}
	name := ""
	if rest != "" {
		name = strings.TrimSpace(strings.Split(rest, ".")[0])
	}
	switch head {
	case "class":
		if name != "" {
			return node.FindAllBy("", map[string]htmlx.AttrFilter{"class": htmlx.ClassFilter(name)}, true)
		}
	case "id":
		if name != "" {
			return node.FindAllBy("", map[string]htmlx.AttrFilter{"id": htmlx.AttrEqualsFilter(name)}, true)
		}
	case "tag":
		if name != "" {
			return node.FindAll(name, true)
		}
	case "text":
		if name != "" {
			var out []*htmlx.Node
			node.Walk(func(n *htmlx.Node) {
				if n.Raw.Type == html.ElementNode && strings.Contains(ownText(n), name) {
					out = append(out, n)
				}
			})
			return out
		}
	}
	return node.Select(before)
}

// ownText 复刻 _own_text。
func ownText(tag *htmlx.Node) string {
	parts := directTextParts(tag)
	return strings.Join(parts, " ")
}

// IsAttrToken 复刻 _is_attr_token。
func IsAttrToken(token string) bool {
	key := strings.ToLower(token)
	if knownAttrs[key] {
		return true
	}
	return dataAttrRe.MatchString(key)
}

// CSSSelect 复刻 css_select。
//
// includeSelf=true 时，若当前节点本身匹配选择器也会被纳入。
func CSSSelect(node *htmlx.Node, rule string, includeSelf bool) []*htmlx.Node {
	if node == nil {
		return nil
	}
	selector, _ := SplitCSSAttr(rule)
	selector = strings.TrimSpace(selector)
	if selector == "" {
		return []*htmlx.Node{node}
	}
	matches := node.Select(selector)
	// 复刻 soupsieve.match(selector, soup)：当前节点自身匹配时纳入结果。
	//
	// 注意：Python 侧仅在 `not matches` 时才尝试自身匹配，但那样会漏掉
	// 「自身匹配且同时有后代匹配」的情形（如 div.a 内含 div.a）。
	// 这里改为无条件检查自身，与 soupsieve.match 的语义一致。
	if includeSelf && matchesSelf(node, selector) {
		for _, m := range matches {
			if m.Raw == node.Raw {
				return matches
			}
		}
		return append([]*htmlx.Node{node}, matches...)
	}
	return matches
}

// matchesSelf 判断节点自身是否匹配选择器。
//
// htmlx.Select 只搜后代，因此这里用「父节点选择 + 身份比对」实现：
// 在父节点下按选择器查找，若结果包含自身则视为匹配。
func matchesSelf(node *htmlx.Node, selector string) bool {
	parent := node.Raw.Parent
	if parent == nil {
		return false
	}
	wrapper := &htmlx.Node{Raw: parent}
	for _, m := range wrapper.Select(selector) {
		if m.Raw == node.Raw {
			return true
		}
	}
	return false
}

// LegadoSelect 复刻 legado_select：返回 (节点列表, 属性名)。
func LegadoSelect(node *htmlx.Node, rule string) ([]*htmlx.Node, string) {
	if node == nil {
		return nil, ""
	}
	var steps []string
	for _, s := range strings.Split(rule, "@") {
		if s != "" {
			steps = append(steps, s)
		}
	}
	if len(steps) == 0 {
		return []*htmlx.Node{node}, ""
	}

	attr := ""
	last := steps[len(steps)-1]
	if !strings.Contains(last, ".") && IsAttrToken(last) {
		attr = last
		steps = steps[:len(steps)-1]
	}

	current := []*htmlx.Node{node}
	for _, step := range steps {
		before, mode, items := SplitIndexSpec(step)
		var nxt []*htmlx.Node
		for _, n := range current {
			found := ResolveStepNodes(n, before)
			nxt = append(nxt, ApplyIndexFilter(found, mode, items)...)
		}
		current = nxt
		if len(current) == 0 {
			break
		}
	}
	return current, attr
}

// XPathSelect 复刻 xpath_select：返回结果列表（节点或字符串）。
func XPathSelect(node *htmlx.Node, expr string) []any {
	if node == nil {
		return nil
	}
	doc, err := html.Parse(strings.NewReader(renderNode(node)))
	if err != nil {
		return nil
	}
	results, err := htmlquery.QueryAll(doc, expr)
	if err != nil {
		return nil
	}
	out := make([]any, 0, len(results))
	for _, r := range results {
		// 元素节点包成 htmlx.Node，使调用方能直接取文本/属性；
		// 属性与文本节点（@href、text()）保持原样。
		if r.Type == html.ElementNode {
			out = append(out, &htmlx.Node{Raw: r})
		} else {
			out = append(out, r)
		}
	}
	return out
}

// renderNode 把节点渲染回 HTML 字符串。
func renderNode(node *htmlx.Node) string {
	var b strings.Builder
	_ = html.Render(&b, node.Raw)
	return b.String()
}

// XPathToStrings 复刻 xpath_to_strings。
func XPathToStrings(results []any) []string {
	out := make([]string, 0, len(results))
	for _, r := range results {
		switch t := r.(type) {
		case string:
			out = append(out, t)
		case *html.Node:
			out = append(out, htmlquery.InnerText(t))
		case *htmlx.Node:
			out = append(out, htmlquery.InnerText(t.Raw))
		default:
			out = append(out, stringifyAny(t))
		}
	}
	return out
}

// JSONPathSelect 复刻 jsonpath_select。
func JSONPathSelect(obj any, expr string) []any {
	expr = strings.TrimSpace(expr)
	if !strings.HasPrefix(expr, "$") {
		expr = "$." + expr
	}
	value, err := jsonpath.Get(expr, obj)
	if err != nil {
		return nil
	}
	// jsonpath_ng 的 find() 返回匹配列表；Go 库对 [*] 已返回切片。
	if arr, ok := value.([]any); ok {
		return arr
	}
	return []any{value}
}

// JSONPathSelectRaw 复刻 jsonpath_ng 的 find()：返回**匹配列表**，
// 每个匹配本身可以是列表（不会被摊平）。
//
// 与 JSONPathSelect 的差别在 `$.tags` 这类表达式上：
// jsonpath_ng 返回 1 个匹配（值是 ["x","y"]），而 Go 的 jsonpath 库
// 直接返回 ["x","y"]，两者在「1 个列表匹配」与「2 个标量匹配」上不可区分。
// 这里用 `[*]` 后缀探测：若去掉 `[*]` 后能取到列表，则视为单个列表匹配。
func JSONPathSelectRaw(obj any, expr string) []any {
	expr = strings.TrimSpace(expr)
	if !strings.HasPrefix(expr, "$") {
		expr = "$." + expr
	}
	value, err := jsonpath.Get(expr, obj)
	if err != nil {
		return nil
	}
	arr, ok := value.([]any)
	if !ok {
		return []any{value}
	}
	// 表达式本身以 [*] 结尾时，jsonpath_ng 也是逐元素返回。
	if strings.HasSuffix(expr, "[*]") {
		return arr
	}
	// 否则：若去掉 [*] 仍能取到同一列表，说明这是「单个列表匹配」。
	if !strings.Contains(expr, "[*]") {
		return []any{arr}
	}
	return arr
}

// stringifyAny 把任意值转为字符串（复刻 Python str()）。
func stringifyAny(v any) string {
	switch t := v.(type) {
	case nil:
		return ""
	case string:
		return t
	case bool:
		if t {
			return "True"
		}
		return "False"
	case float64:
		if t == float64(int64(t)) {
			return strconv.FormatInt(int64(t), 10)
		}
		return strconv.FormatFloat(t, 'f', -1, 64)
	}
	encoded, err := json.Marshal(v)
	if err != nil {
		return ""
	}
	return string(encoded)
}
