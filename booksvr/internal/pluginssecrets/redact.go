// Package pluginsecrets 复刻 webserver/services/plugin_secrets.py 的脱敏逻辑。
//
// 凭据加密（Fernet）部分见 SecretCipher；本文件只负责 redact ——
// 把可能含凭据的值转成可安全写入 API 响应、日志与持久化错误的副本。
package pluginssecrets

import (
	"fmt"
	"regexp"
	"sort"
	"strings"
)

// sensitiveKeyRe 匹配敏感字段名（大小写不敏感）。
//
// 对应 Python：`(?:^|_)(?:authorization|password|secret|token|api_key|apikey|cookie)(?:$|_)`
var sensitiveKeyRe = regexp.MustCompile(`(?i)(?:^|_)(?:authorization|password|secret|token|api_key|apikey|cookie)(?:$|_)`)

// bearerRe 匹配 `Bearer xxx` 形式的令牌。
var bearerRe = regexp.MustCompile(`(?i)(bearer\s+)[A-Za-z0-9._~+/=-]+`)

// assignmentRe 匹配 `token=xxx` 形式的赋值。
var assignmentRe = regexp.MustCompile(`(?i)\b(token|api[_-]?key|password|secret)=([^\s,;&]+)`)

// Redacted 是脱敏后的占位符。
const Redacted = "[REDACTED]"

// RedactString 对单个字符串做脱敏，返回字符串。
func RedactString(value string, secrets map[string]any) string {
	out, _ := Redact(value, secrets).(string)
	return out
}

// IsSensitiveKey 判断字段名是否属于敏感字段（大小写不敏感）。
func IsSensitiveKey(key string) bool {
	return sensitiveKeyRe.MatchString(key)
}

// Redact 返回可安全外发的副本。
//
// secrets 是已知的凭据值集合（通常是连接的 secrets 字典）；
// 其值会在任意字符串中被替换掉。敏感字段名（如 password）整值替换。
func Redact(value any, secrets map[string]any) any {
	known := knownSecrets(secrets)
	return scrub(value, "", known)
}

// knownSecrets 取出非空凭据值，按长度降序（先替换长的，避免短值截断长值）。
func knownSecrets(secrets map[string]any) []string {
	if len(secrets) == 0 {
		return nil
	}
	seen := map[string]bool{}
	var out []string
	for _, v := range secrets {
		if v == nil {
			continue
		}
		s := stringify(v)
		if s == "" || seen[s] {
			continue
		}
		seen[s] = true
		out = append(out, s)
	}
	sort.Slice(out, func(i, j int) bool {
		if len(out[i]) != len(out[j]) {
			return len(out[i]) > len(out[j])
		}
		return out[i] < out[j]
	})
	return out
}

// scrub 递归脱敏。
func scrub(item any, key string, known []string) any {
	switch t := item.(type) {
	case map[string]any:
		out := make(map[string]any, len(t))
		for name, content := range t {
			out[name] = scrub(content, name, known)
		}
		return out
	case map[string]string:
		out := make(map[string]any, len(t))
		for name, content := range t {
			out[name] = scrub(content, name, known)
		}
		return out
	case []any:
		out := make([]any, len(t))
		for i, content := range t {
			out[i] = scrub(content, key, known)
		}
		return out
	case []string:
		out := make([]any, len(t))
		for i, content := range t {
			out[i] = scrub(content, key, known)
		}
		return out
	}

	// 敏感字段名：整值替换。
	if key != "" && sensitiveKeyRe.MatchString(key) {
		return Redacted
	}

	s, ok := item.(string)
	if !ok {
		return item
	}
	result := s
	for _, secret := range known {
		result = strings.ReplaceAll(result, secret, Redacted)
	}
	result = bearerRe.ReplaceAllString(result, "${1}"+Redacted)
	result = assignmentRe.ReplaceAllString(result, "${1}="+Redacted)
	return result
}

// stringify 复刻 Python str() 在脱敏场景下的行为。
func stringify(v any) string {
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
	default:
		return strings.TrimSpace(fmt.Sprint(v))
	}
}

// SecretMaskHint 复刻 secret_mask_hint：取首个非空值的末 4 位。
func SecretMaskHint(values map[string]any) string {
	if len(values) == 0 {
		return ""
	}
	// 按 key 排序保证确定性（Python 依赖 dict 插入顺序）。
	keys := make([]string, 0, len(values))
	for k := range values {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	for _, k := range keys {
		v := values[k]
		if v == nil {
			continue
		}
		s := stringify(v)
		if s == "" {
			continue
		}
		runes := []rune(s)
		if len(runes) <= 4 {
			return string(runes)
		}
		return string(runes[len(runes)-4:])
	}
	return ""
}
