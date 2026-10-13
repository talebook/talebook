package booksource

import (
	"encoding/json"
	"regexp"
	"strings"

	"talebook/booksvr/internal/htmlx"
)

// AnalyzeRule 把一条规则串作用到 HTML/JSON 文档上。
//
// 支持的非 JS 子集：
//   - 后端：CSS(@css:)、Legado jsoup(class./id./tag.)、XPath(//、@xpath:)、JSONPath($.、@json:)
//   - 组合符：`||`(取首个非空)、`&&`(拼接)、`%%`(交错，主要用于列表)
//   - 变量：`@put:{key:rule}`、`@get:{key}`
//   - 模板：含 `{{子规则}}` 的字符串按模板拼接
//   - 尾部正则：`rule##pattern##replacement`（replacement 可空表示删除）
//
// 支持受限字段 JS：`规则@js:result.replace(...)`。遇到 `<js>` 块、
// `java.ajax` 等外部副作用规则返回 JsRuleUnsupported，由调用方决定跳过。
type AnalyzeRule struct {
	Doc       any
	Variables map[string]string
	BaseURL   string
}

// NewAnalyzeRule 构造规则求值器；variables 为 nil 时新建空表。
func NewAnalyzeRule(doc any, variables map[string]string, baseURL string) *AnalyzeRule {
	if variables == nil {
		variables = map[string]string{}
	}
	return &AnalyzeRule{Doc: doc, Variables: variables, BaseURL: baseURL}
}

// Child 以同一变量表与 baseURL 派生一个作用于子节点的求值器。
func (a *AnalyzeRule) Child(node any) *AnalyzeRule {
	return &AnalyzeRule{Doc: node, Variables: a.Variables, BaseURL: a.BaseURL}
}

var (
	jsMarkers = []string{"@js:", "<js>", "{{js.", "{{java"}

	getRe      = regexp.MustCompile(`@get:\{([^}]+)\}`)
	putRe      = regexp.MustCompile(`@put:\{([^:]+):(.+)\}$`)
	templateRe = regexp.MustCompile(`\{\{([^{}]+)\}\}`)
	javaReplRe = regexp.MustCompile(`\$(\d{1,2})`)
)

func hasJS(rule string) bool {
	low := strings.ToLower(rule)
	for _, m := range jsMarkers {
		if strings.Contains(low, m) {
			return true
		}
	}
	return false
}

func hasUnsupportedJS(rule string) bool {
	low := strings.ToLower(rule)
	return strings.Contains(low, "<js>") ||
		strings.Contains(low, "{{js.") ||
		strings.Contains(low, "{{java")
}

// javaReplacement 把 Java 风格替换串 `$1` 转成 Go 的 `${1}`。
func javaReplacement(repl string) string {
	return javaReplRe.ReplaceAllString(repl, "${$1}")
}

// applyTailRegex 应用尾部正则。
//
// replaceFirst 对应 Legado `##p##r###`：取首个匹配段再替换。
func applyTailRegex(value string, pattern *string, replacement string, replaceFirst bool) string {
	if pattern == nil {
		return value
	}
	re, err := regexp.Compile(*pattern)
	if err != nil {
		return value
	}
	repl := javaReplacement(replacement)
	if replaceFirst {
		m := re.FindString(value)
		if m == "" {
			return ""
		}
		return re.ReplaceAllString(m, repl)
	}
	return re.ReplaceAllString(value, repl)
}

// GetString 求值字符串规则。
func (a *AnalyzeRule) GetString(rule any) (string, error) {
	if rule == nil {
		return "", nil
	}
	s, ok := rule.(string)
	if !ok {
		s = stringifyAny(rule)
	}
	s = strings.TrimSpace(s)
	if s == "" {
		return "", nil
	}
	if hasUnsupportedJS(s) {
		return "", NewJsRuleUnsupported(s)
	}

	// @put / @get
	if m := putRe.FindStringSubmatch(s); m != nil {
		key := strings.TrimSpace(m[1])
		inner := strings.TrimSpace(m[2])
		v, err := a.GetString(inner)
		if err != nil {
			return "", err
		}
		a.Variables[key] = v
		return "", nil
	}
	if strings.HasPrefix(s, "@get:") {
		if m := getRe.FindStringSubmatch(s); m != nil {
			return a.Variables[strings.TrimSpace(m[1])], nil
		}
	}

	if parts, ok := a.splitInlineJS(s); ok {
		var value string
		var err error
		if parts.main != "" {
			value, err = a.GetString(parts.main)
			if err != nil {
				return "", err
			}
		} else {
			value = a.docString()
		}
		value, err = RunJS(parts.code, value, a.Variables, a.BaseURL, 0)
		if err != nil {
			return "", err
		}
		return strings.TrimSpace(applyTailRegex(value, parts.pattern, parts.replacement, parts.replaceFirst)), nil
	}

	// 模板：包含字面文本 + {{子规则}}
	if strings.Contains(s, "{{") && strings.Contains(s, "}}") {
		return a.evalTemplate(s)
	}

	// 尾部正则
	main, pattern, replacement, replaceFirst := splitRegex(s)
	value, err := a.evalStringAlts(main)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(applyTailRegex(value, pattern, replacement, replaceFirst)), nil
}

// GetStringList 求值规则并按行拆为字符串列表。
//
// Legado 中多匹配结果以换行串联；nextTocUrl/nextContentUrl 等多值场景
// 需要拿到列表逐个处理，而不是当成单个值。
func (a *AnalyzeRule) GetStringList(rule any) ([]string, error) {
	value, err := a.GetString(rule)
	if err != nil {
		return nil, err
	}
	if value == "" {
		return nil, nil
	}
	var out []string
	for _, line := range strings.Split(value, "\n") {
		line = strings.TrimSpace(line)
		if line != "" {
			out = append(out, line)
		}
	}
	return out, nil
}

type inlineJS struct {
	main         string
	code         string
	pattern      *string
	replacement  string
	replaceFirst bool
}

func (a *AnalyzeRule) splitInlineJS(rule string) (inlineJS, bool) {
	idx := strings.Index(rule, "@js:")
	if idx < 0 {
		return inlineJS{}, false
	}
	out := inlineJS{main: strings.TrimSpace(rule[:idx])}
	code := strings.TrimSpace(rule[idx+4:])
	if i := strings.Index(code, "##"); i >= 0 {
		spec := code[i+2:]
		code = code[:i]
		parts := strings.Split(spec, "##")
		p := parts[0]
		out.pattern = &p
		if len(parts) > 1 {
			out.replacement = parts[1]
		}
		out.replaceFirst = len(parts) > 2
	}
	out.code = strings.TrimSpace(code)
	return out, true
}

func (a *AnalyzeRule) docString() string {
	if IsJSONDoc(a.Doc) {
		b, err := json.Marshal(a.Doc)
		if err != nil {
			return ""
		}
		return string(b)
	}
	if a.Doc == nil {
		return ""
	}
	if s, ok := a.Doc.(string); ok {
		return s
	}
	if n, ok := a.Doc.(*htmlx.Node); ok {
		return renderNode(n)
	}
	return stringifyAny(a.Doc)
}

// templateVars 是模板中直接取变量而非递归求值的键。
var templateVars = map[string]bool{
	"": true, "page": true, "baseUrl": true, "key": true,
	"searchKey": true, "searchPage": true,
}

func (a *AnalyzeRule) evalTemplate(rule string) (string, error) {
	var firstErr error
	out := templateRe.ReplaceAllStringFunc(rule, func(m string) string {
		inner := strings.TrimSpace(m[2 : len(m)-2])
		if templateVars[inner] {
			return a.Variables[inner]
		}
		v, err := a.GetString(inner)
		if err != nil && firstErr == nil {
			firstErr = err
		}
		return v
	})
	if firstErr != nil {
		return "", firstErr
	}
	return strings.TrimSpace(out), nil
}

// splitRegex 拆出尾部 `##pattern##replacement[###]`，末尾 ### 表示只替换首个匹配段。
func splitRegex(rule string) (string, *string, string, bool) {
	if !strings.Contains(rule, "##") {
		return rule, nil, "", false
	}
	parts := strings.Split(rule, "##")
	main := parts[0]
	var pattern *string
	if len(parts) > 1 {
		p := parts[1]
		pattern = &p
	}
	replacement := ""
	if len(parts) > 2 {
		replacement = parts[2]
	}
	return main, pattern, replacement, len(parts) > 3
}

func (a *AnalyzeRule) evalStringAlts(rule string) (string, error) {
	for _, alt := range strings.Split(rule, "||") {
		alt = strings.TrimSpace(alt)
		if alt == "" {
			continue
		}
		var parts []string
		for _, p := range strings.Split(alt, "&&") {
			p = strings.TrimSpace(p)
			if p == "" {
				continue
			}
			v, err := a.evalSimpleString(p)
			if err != nil {
				return "", err
			}
			parts = append(parts, v)
		}
		var nonEmpty []string
		for _, p := range parts {
			if p != "" {
				nonEmpty = append(nonEmpty, p)
			}
		}
		if len(nonEmpty) > 0 {
			return strings.Join(nonEmpty, "\n"), nil
		}
	}
	return "", nil
}

func (a *AnalyzeRule) evalSimpleString(rule string) (string, error) {
	if rule == "" {
		return "", nil
	}
	if hasJS(rule) {
		return "", NewJsRuleUnsupported(rule)
	}
	if strings.HasPrefix(rule, "@get:") {
		if m := getRe.FindStringSubmatch(rule); m != nil {
			return a.Variables[strings.TrimSpace(m[1])], nil
		}
	}

	isJSON := IsJSONDoc(a.Doc)
	if isJSON && !strings.HasPrefix(rule, "@css:") &&
		!strings.HasPrefix(rule, "@xpath:") && !strings.HasPrefix(rule, "//") {
		expr := strings.TrimPrefix(rule, "@json:")
		return stringifyValues(JSONPathSelectRaw(a.Doc, expr)), nil
	}

	if strings.HasPrefix(rule, "@json:") || strings.HasPrefix(rule, "$") {
		expr := strings.TrimPrefix(rule, "@json:")
		return stringifyValues(JSONPathSelectRaw(a.Doc, expr)), nil
	}

	if strings.HasPrefix(rule, "@xpath:") || strings.HasPrefix(rule, "//") || strings.HasPrefix(rule, "/") {
		expr := strings.TrimPrefix(rule, "@xpath:")
		node, ok := a.Doc.(*htmlx.Node)
		if !ok {
			return "", nil
		}
		results := XPathSelect(node, expr)
		var parts []string
		for _, s := range XPathToStrings(results) {
			if s != "" {
				parts = append(parts, s)
			}
		}
		return strings.TrimSpace(strings.Join(parts, "\n")), nil
	}

	node, ok := a.Doc.(*htmlx.Node)
	if !ok {
		return "", nil
	}

	if strings.HasPrefix(rule, "@css:") {
		sel, attr := SplitCSSAttr(strings.TrimPrefix(rule, "@css:"))
		nodes := CSSSelect(node, sel, true)
		var parts []string
		for _, n := range nodes {
			if n != nil {
				parts = append(parts, ExtractAttr(n, attr))
			}
		}
		return strings.TrimSpace(strings.Join(parts, "\n")), nil
	}

	// Legado jsoup 默认
	nodes, attr := LegadoSelect(node, rule)
	var parts []string
	for _, n := range nodes {
		if n != nil {
			parts = append(parts, ExtractAttr(n, attr))
		}
	}
	return strings.TrimSpace(strings.Join(parts, "\n")), nil
}

// GetElements 求值列表规则（bookList / chapterList）。
func (a *AnalyzeRule) GetElements(rule any) ([]any, error) {
	if rule == nil {
		return nil, nil
	}
	s, ok := rule.(string)
	if !ok {
		s = stringifyAny(rule)
	}
	s = strings.TrimSpace(s)
	if s == "" {
		return nil, nil
	}
	if hasJS(s) {
		return nil, NewJsRuleUnsupported(s)
	}

	// || 取首个非空；%% 交错；&& 拼接
	for _, alt := range strings.Split(s, "||") {
		alt = strings.TrimSpace(alt)
		if alt == "" {
			continue
		}
		var result []any
		var err error
		if strings.Contains(alt, "%%") {
			var groups [][]any
			for _, p := range strings.Split(alt, "%%") {
				g, gerr := a.elementsConcat(strings.TrimSpace(p))
				if gerr != nil {
					return nil, gerr
				}
				groups = append(groups, g)
			}
			result = interleave(groups)
		} else {
			result, err = a.elementsConcat(alt)
			if err != nil {
				return nil, err
			}
		}
		if len(result) > 0 {
			return result, nil
		}
	}
	return nil, nil
}

func (a *AnalyzeRule) elementsConcat(rule string) ([]any, error) {
	var out []any
	for _, part := range strings.Split(rule, "&&") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		got, err := a.evalSimpleElements(part)
		if err != nil {
			return nil, err
		}
		out = append(out, got...)
	}
	return out, nil
}

func (a *AnalyzeRule) evalSimpleElements(rule string) ([]any, error) {
	if IsJSONDoc(a.Doc) || strings.HasPrefix(rule, "@json:") || strings.HasPrefix(rule, "$") {
		expr := strings.TrimPrefix(rule, "@json:")
		values := JSONPathSelect(a.Doc, expr)
		var flat []any
		for _, v := range values {
			if list, ok := v.([]any); ok {
				flat = append(flat, list...)
			} else {
				flat = append(flat, v)
			}
		}
		return flat, nil
	}

	if strings.HasPrefix(rule, "@xpath:") || strings.HasPrefix(rule, "//") || strings.HasPrefix(rule, "/") {
		expr := strings.TrimPrefix(rule, "@xpath:")
		node, ok := a.Doc.(*htmlx.Node)
		if !ok {
			return nil, nil
		}
		return XPathSelect(node, expr), nil
	}

	node, ok := a.Doc.(*htmlx.Node)
	if !ok {
		return nil, nil
	}

	if strings.HasPrefix(rule, "@css:") {
		sel, _ := SplitCSSAttr(strings.TrimPrefix(rule, "@css:"))
		return toAnyNodes(CSSSelect(node, sel, false)), nil
	}

	nodes, _ := LegadoSelect(node, rule)
	return toAnyNodes(nodes), nil
}

func toAnyNodes(nodes []*htmlx.Node) []any {
	out := make([]any, 0, len(nodes))
	for _, n := range nodes {
		out = append(out, n)
	}
	return out
}

func stringifyValues(values []any) string {
	var out []string
	for _, v := range values {
		if v == nil {
			continue
		}
		if list, ok := v.([]any); ok {
			var inner []string
			for _, x := range list {
				inner = append(inner, stringifyAny(x))
			}
			out = append(out, strings.Join(inner, " "))
		} else {
			out = append(out, stringifyAny(v))
		}
	}
	var nonEmpty []string
	for _, s := range out {
		if s != "" {
			nonEmpty = append(nonEmpty, s)
		}
	}
	return strings.TrimSpace(strings.Join(nonEmpty, "\n"))
}

func interleave(groups [][]any) []any {
	if len(groups) == 0 {
		return nil
	}
	minLen := -1
	for _, g := range groups {
		if minLen < 0 || len(g) < minLen {
			minLen = len(g)
		}
	}
	var out []any
	for i := 0; i < minLen; i++ {
		for _, g := range groups {
			out = append(out, g[i])
		}
	}
	return out
}
