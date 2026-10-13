package booksource

import (
	"regexp"
	"strings"
	"sync"
)

// 正文去广告。
//
// 两层清理：
//  1. 书源自带的 ruleContent.replaceRegex（Legado 换行分隔的 `pattern##replacement`）。
//  2. 全局广告黑名单正则（来自配置 BOOKSOURCE_AD_PATTERNS）。

// zeroWidthRe 匹配零宽字符：U+200B / U+200C / U+200D / U+FEFF。
var zeroWidthRe = regexp.MustCompile("[\u200b\u200c\u200d\ufeff]")

// multiBlankLinesRe 把 3 个及以上连续换行压成 2 个。
var multiBlankLinesRe = regexp.MustCompile(`\n{3,}`)

// regexCache 缓存已编译正则；编译失败记为 nil，避免重复编译坏模式。
var (
	regexCacheMu sync.Mutex
	regexCache   = map[string]*regexp.Regexp{}
)

// compileCached 编译并缓存正则；失败返回 nil。
func compileCached(pattern string) *regexp.Regexp {
	regexCacheMu.Lock()
	defer regexCacheMu.Unlock()
	if re, ok := regexCache[pattern]; ok {
		return re
	}
	re, err := regexp.Compile(pattern)
	if err != nil {
		regexCache[pattern] = nil
		return nil
	}
	regexCache[pattern] = re
	return re
}

// ReplaceRule 是一条 `pattern##replacement` 替换规则。
type ReplaceRule struct {
	Pattern     string
	Replacement string
}

// ParseReplaceRegex 解析书源 replaceRegex 字段为规则列表。
//
// Legado 语法：多条规则以换行分隔，每条 `pattern##replacement`（replacement 可空）。
// 若整体以 ## 开头亦兼容。
func ParseReplaceRegex(replaceRegex string) []ReplaceRule {
	var rules []ReplaceRule
	if replaceRegex == "" {
		return rules
	}
	for _, line := range strings.Split(replaceRegex, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		line = strings.TrimPrefix(line, "##")
		parts := strings.Split(line, "##")
		pattern := parts[0]
		replacement := ""
		if len(parts) > 1 {
			replacement = parts[1]
		}
		if pattern != "" {
			rules = append(rules, ReplaceRule{Pattern: pattern, Replacement: replacement})
		}
	}
	return rules
}

// ApplyReplaceRegex 依次应用书源替换规则；坏正则跳过。
func ApplyReplaceRegex(text, replaceRegex string) string {
	for _, rule := range ParseReplaceRegex(replaceRegex) {
		re := compileCached(rule.Pattern)
		if re == nil {
			continue
		}
		text = re.ReplaceAllString(text, rule.Replacement)
	}
	return text
}

// ApplyBlacklist 按行剔除命中全局黑名单的内容。
func ApplyBlacklist(text string, patterns []string) string {
	if len(patterns) == 0 {
		return text
	}
	var compiled []*regexp.Regexp
	for _, p := range patterns {
		if re := compileCached(p); re != nil {
			compiled = append(compiled, re)
		}
	}
	if len(compiled) == 0 {
		return text
	}
	var kept []string
	for _, line := range strings.Split(text, "\n") {
		hit := false
		for _, re := range compiled {
			if re.MatchString(line) {
				hit = true
				break
			}
		}
		if !hit {
			kept = append(kept, line)
		}
	}
	return strings.Join(kept, "\n")
}

// NormalizeWhitespace 规整空白：去零宽字符、统一换行、逐行 strip、压缩空行。
func NormalizeWhitespace(text string) string {
	text = zeroWidthRe.ReplaceAllString(text, "")
	text = strings.ReplaceAll(text, "\r\n", "\n")
	text = strings.ReplaceAll(text, "\r", "\n")
	lines := strings.Split(text, "\n")
	for i, line := range lines {
		lines[i] = strings.TrimSpace(line)
	}
	text = strings.Join(lines, "\n")
	text = multiBlankLinesRe.ReplaceAllString(text, "\n\n")
	return strings.TrimSpace(text)
}

// Clean 清理正文文本。enabled=false 时只做基础空白规整。
func Clean(text, sourceReplaceRegex string, blacklist []string, enabled bool) string {
	if text == "" {
		return ""
	}
	if enabled {
		text = ApplyReplaceRegex(text, sourceReplaceRegex)
		text = ApplyBlacklist(text, blacklist)
	}
	return NormalizeWhitespace(text)
}
