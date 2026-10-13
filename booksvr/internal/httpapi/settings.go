package httpapi

import (
	"os"
	"regexp"
	"strconv"
	"strings"
)

// settingsLine 匹配 Talebook 配置里的 `'KEY'   : value,` 行。
//
// 配置文件是 Python 源码（conf/auto.py），这里只做保守的键值提取，
// 不执行任何 Python 代码。
var settingsLine = regexp.MustCompile(`(?m)^\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]\s*:\s*(.*?),\s*(?:#.*)?$`)

// LoadSettings 从 Talebook 配置文件解析配置项。
//
// 支持字符串、整数、浮点与布尔字面量；列表与字典按原始文本保留。
// 文件不存在或无法读取时返回空 map（不报错），使 booksvr 在缺少
// 配置文件时仍能以默认值启动。
func LoadSettings(path string) map[string]any {
	out := map[string]any{}
	if path == "" {
		return out
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		return out
	}
	for _, m := range settingsLine.FindAllStringSubmatch(string(raw), -1) {
		key := m[1]
		out[key] = parseSettingValue(strings.TrimSpace(m[2]))
	}
	return out
}

// parseSettingValue 把配置字面量转成 Go 值。
func parseSettingValue(raw string) any {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	// 去掉行尾注释（仅处理不在引号内的 #）。
	if idx := indexUnquoted(raw, '#'); idx >= 0 {
		raw = strings.TrimSpace(raw[:idx])
	}
	switch raw {
	case "True", "true":
		return true
	case "False", "false":
		return false
	case "None", "null":
		return nil
	}
	if len(raw) >= 2 {
		if (raw[0] == '\'' && raw[len(raw)-1] == '\'') || (raw[0] == '"' && raw[len(raw)-1] == '"') {
			return raw[1 : len(raw)-1]
		}
	}
	if n, err := strconv.ParseInt(raw, 10, 64); err == nil {
		return n
	}
	if f, err := strconv.ParseFloat(raw, 64); err == nil {
		return f
	}
	return raw
}

// indexUnquoted 返回第一个不在引号内的目标字符下标；不存在返回 -1。
func indexUnquoted(s string, target byte) int {
	var quote byte
	for i := 0; i < len(s); i++ {
		c := s[i]
		switch {
		case quote != 0:
			if c == quote {
				quote = 0
			}
		case c == '\'' || c == '"':
			quote = c
		case c == target:
			return i
		}
	}
	return -1
}
