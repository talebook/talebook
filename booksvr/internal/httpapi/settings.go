package httpapi

import (
	"os"
	"path/filepath"
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
// 复刻 Python SettingsLoader.loadfile() 的三层合并语义：
//
//	出厂默认（builtinSettingsDefaults） → auto.py 用户覆盖 → manual.py 手工覆盖
//
// 这一点很关键：auto.py 只存用户改过的键，出厂默认值在 webserver/settings.py 里。
// 早期实现只解析 auto.py，导致 /api/admin/settings 只返回一两个键，
// 前端把这份残缺对象整体回存后就把用户配置覆盖没了。
//
// path 指向 auto.py；manual.py 取同目录下的同名文件。
// 文件不存在或无法读取时跳过该层（不报错），使 booksvr 在缺少
// 配置文件时仍能以出厂默认启动。
func LoadSettings(path string) map[string]any {
	out := make(map[string]any, len(builtinSettingsDefaults))
	for k, v := range builtinSettingsDefaults {
		out[k] = v
	}
	if path == "" {
		return out
	}
	mergeSettingsFile(out, path)
	mergeSettingsFile(out, filepath.Join(filepath.Dir(path), "manual.py"))
	return out
}

// liveSettings 返回当前生效的配置。
//
// 优先从磁盘重新读取（Python 的 CONF 是进程内可变字典，保存后立即生效）；
// 读取失败或路径为空时回落到启动快照。
//
// 所有读配置的 handler 都应经过这里，否则用户保存后刷新页面会看到旧值，
// 误以为「保存没生效」。
func liveSettings(snapshot map[string]any, path string) map[string]any {
	if path != "" {
		if fresh := LoadSettings(path); len(fresh) > 0 {
			return fresh
		}
	}
	return snapshot
}

// mergeSettingsFile 把单个配置文件里的键值覆盖进 out。
//
// 文件不存在或无法读取时静默跳过，与 Python 的 try/except 一致。
func mergeSettingsFile(out map[string]any, path string) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return
	}
	for _, m := range settingsLine.FindAllStringSubmatch(string(raw), -1) {
		out[m[1]] = parseSettingValue(strings.TrimSpace(m[2]))
	}
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
