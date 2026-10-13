package booksource

import (
	"encoding/json"
	"errors"
	"strings"
)

// Legado 书源 JSON 的包装与类型化访问。
//
// 只关心文本类书源（bookSourceType == 0）。规则字段统一以原始字符串/字典返回，
// 由 AnalyzeRule / AnalyzeURL 负责解释。

// get 从 map 中按多个候选键取第一个非空值。
func get(d map[string]any, keys ...string) any {
	if d == nil {
		return nil
	}
	for _, k := range keys {
		if v, ok := d[k]; ok && !isEmptyValue(v) {
			return v
		}
	}
	return nil
}

// isEmptyValue 复刻 Python `d[k] not in (None, "")`。
func isEmptyValue(v any) bool {
	if v == nil {
		return true
	}
	if s, ok := v.(string); ok {
		return s == ""
	}
	return false
}

// getString 取字符串字段，缺失或非字符串时返回 fallback。
func getString(d map[string]any, fallback string, keys ...string) string {
	v := get(d, keys...)
	if v == nil {
		return fallback
	}
	s, ok := v.(string)
	if !ok {
		return fallback
	}
	return s
}

// getInt 取整数字段，解析失败返回 0（复刻 Python int() + except）。
func getInt(d map[string]any, keys ...string) int {
	v := get(d, keys...)
	if v == nil {
		return 0
	}
	switch t := v.(type) {
	case float64:
		return int(t)
	case int:
		return t
	case int64:
		return int(t)
	case json.Number:
		if i, err := t.Int64(); err == nil {
			return int(i)
		}
		return 0
	case string:
		n := 0
		neg := false
		s := strings.TrimSpace(t)
		if s == "" {
			return 0
		}
		if s[0] == '+' || s[0] == '-' {
			neg = s[0] == '-'
			s = s[1:]
		}
		if s == "" {
			return 0
		}
		for _, c := range s {
			if c < '0' || c > '9' {
				return 0
			}
			n = n*10 + int(c-'0')
		}
		if neg {
			return -n
		}
		return n
	}
	return 0
}

// getBool 取布尔字段，缺失时用 fallback（复刻 Python bool()）。
func getBool(d map[string]any, fallback bool, keys ...string) bool {
	v := get(d, keys...)
	if v == nil {
		return fallback
	}
	return truthyValue(v)
}

// truthyValue 复刻 Python bool() 语义。
func truthyValue(v any) bool {
	switch t := v.(type) {
	case nil:
		return false
	case bool:
		return t
	case string:
		return t != ""
	case float64:
		return t != 0
	case int:
		return t != 0
	case int64:
		return t != 0
	case []any:
		return len(t) > 0
	case map[string]any:
		return len(t) > 0
	}
	return true
}

// RuleGroup 是一组字段规则（如 ruleSearch / ruleBookInfo / ruleToc / ruleContent）。
type RuleGroup struct {
	data map[string]any
}

// NewRuleGroup 包装规则字典；非字典输入视为空组。
func NewRuleGroup(data any) *RuleGroup {
	if m, ok := data.(map[string]any); ok {
		return &RuleGroup{data: m}
	}
	return &RuleGroup{data: map[string]any{}}
}

// Get 按候选键取规则串，缺失返回空串。
func (g *RuleGroup) Get(keys ...string) string {
	return getString(g.data, "", keys...)
}

// Bool 复刻 Python __bool__：规则字典非空即为真。
func (g *RuleGroup) Bool() bool {
	return len(g.data) > 0
}

// Raw 返回底层字典。
func (g *RuleGroup) Raw() map[string]any {
	return g.data
}

// BookSource 包装一份已解析的 Legado 书源 JSON。
type BookSource struct {
	raw map[string]any
}

// ErrBookSourceRawNotDict 对应 Python ValueError("book source raw must be a dict")。
var ErrBookSourceRawNotDict = errors.New("book source raw must be a dict")

// NewBookSource 包装书源；raw 必须是 map。
func NewBookSource(raw any) (*BookSource, error) {
	m, ok := raw.(map[string]any)
	if !ok {
		return nil, ErrBookSourceRawNotDict
	}
	return &BookSource{raw: m}, nil
}

// Raw 返回底层字典。
func (s *BookSource) Raw() map[string]any { return s.raw }

// BookSourceURL 对应 bookSourceUrl。
func (s *BookSource) BookSourceURL() string {
	return getString(s.raw, "", "bookSourceUrl")
}

// BookSourceName 对应 bookSourceName。
func (s *BookSource) BookSourceName() string {
	return getString(s.raw, "", "bookSourceName")
}

// BookSourceGroup 对应 bookSourceGroup。
func (s *BookSource) BookSourceGroup() string {
	return getString(s.raw, "", "bookSourceGroup")
}

// BookSourceType 对应 bookSourceType，解析失败为 0。
func (s *BookSource) BookSourceType() int {
	return getInt(s.raw, "bookSourceType")
}

// Enabled 对应 enabled，默认 true。
func (s *BookSource) Enabled() bool {
	return getBool(s.raw, true, "enabled")
}

// EnabledExplore 对应 enabledExplore，默认 true。
func (s *BookSource) EnabledExplore() bool {
	return getBool(s.raw, true, "enabledExplore")
}

// Weight 对应 weight，解析失败为 0。
func (s *BookSource) Weight() int {
	return getInt(s.raw, "weight")
}

// Header 对应 header 原始值（可能是 map / JSON 串 / nil）。
func (s *BookSource) Header() any {
	return get(s.raw, "header")
}

// SearchURL 对应 searchUrl。
func (s *BookSource) SearchURL() string {
	return getString(s.raw, "", "searchUrl")
}

// ExploreURL 对应 exploreUrl。
func (s *BookSource) ExploreURL() string {
	return getString(s.raw, "", "exploreUrl")
}

// ExploreCategory 是发现页的一个分类。
type ExploreCategory struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

// ExploreCategories 解析 exploreUrl 为发现页分类列表。
//
// 兼容两种 Legado 格式：
//  1. 换行分隔的 `name::url` 文本
//  2. JSON 数组 [{title|name: ..., url: ...}, ...]
//
// 含 @js: 的条目会被跳过（本引擎不支持 JS 规则）。
func (s *BookSource) ExploreCategories() []ExploreCategory {
	raw := s.ExploreURL()
	if raw == "" {
		return nil
	}
	text := strings.TrimSpace(raw)
	if strings.HasPrefix(text, "[") {
		var arr []any
		if err := json.Unmarshal([]byte(text), &arr); err == nil {
			var out []ExploreCategory
			for _, item := range arr {
				m, ok := item.(map[string]any)
				if !ok {
					continue
				}
				name := strings.TrimSpace(firstNonEmptyString(m, "title", "name"))
				url := strings.TrimSpace(getString(m, "", "url"))
				if name != "" && url != "" &&
					!strings.Contains(url, "@js:") && !strings.Contains(url, "<js>") {
					out = append(out, ExploreCategory{Name: name, URL: url})
				}
			}
			return out
		}
	}
	var out []ExploreCategory
	for _, line := range strings.Split(text, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.Contains(line, "@js:") || strings.Contains(line, "<js>") {
			continue
		}
		parts := strings.SplitN(line, "::", 2)
		if len(parts) == 2 {
			name := strings.TrimSpace(parts[0])
			url := strings.TrimSpace(parts[1])
			if name != "" && url != "" {
				out = append(out, ExploreCategory{Name: name, URL: url})
			}
		}
	}
	return out
}

// firstNonEmptyString 复刻 `(item.get("title") or item.get("name") or "")`。
func firstNonEmptyString(m map[string]any, keys ...string) string {
	for _, k := range keys {
		if v, ok := m[k]; ok {
			if s, ok := v.(string); ok && s != "" {
				return s
			}
		}
	}
	return ""
}

// RuleSearch 对应 ruleSearch。
func (s *BookSource) RuleSearch() *RuleGroup {
	return NewRuleGroup(get(s.raw, "ruleSearch"))
}

// RuleBookInfo 对应 ruleBookInfo。
func (s *BookSource) RuleBookInfo() *RuleGroup {
	return NewRuleGroup(get(s.raw, "ruleBookInfo"))
}

// RuleToc 对应 ruleToc。
func (s *BookSource) RuleToc() *RuleGroup {
	return NewRuleGroup(get(s.raw, "ruleToc"))
}

// RuleContent 对应 ruleContent。
func (s *BookSource) RuleContent() *RuleGroup {
	return NewRuleGroup(get(s.raw, "ruleContent"))
}

// RuleExplore 对应 ruleExplore（可能缺失）。
func (s *BookSource) RuleExplore() *RuleGroup {
	return NewRuleGroup(get(s.raw, "ruleExplore"))
}

// IsTextSource 判断是否文本类书源。
func (s *BookSource) IsTextSource() bool {
	return s.BookSourceType() == 0
}

// Summary 返回书源摘要。
func (s *BookSource) Summary() map[string]any {
	return map[string]any{
		"name":  s.BookSourceName(),
		"url":   s.BookSourceURL(),
		"group": s.BookSourceGroup(),
		"type":  s.BookSourceType(),
	}
}
