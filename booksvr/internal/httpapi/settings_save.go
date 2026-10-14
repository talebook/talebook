package httpapi

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

// SaveSettings 把配置写回 Talebook 配置文件（conf/auto.py）。
//
// 对应 Python 的 `SettingsSaverLogic.save_extra_settings` → `args.dumpfile()`：
// 保留文件里已有的键（含未识别的键与注释），只覆盖/追加传入的键，
// 从而不会因为 Go 侧只认识一部分键而丢掉用户的其它配置。
//
// 写入采用「先写临时文件再原子替换」，避免写一半崩溃导致配置文件损坏。
func SaveSettings(path string, values map[string]any) error {
	if path == "" {
		return fmt.Errorf("httpapi: 保存配置需要配置文件路径")
	}

	if fi, err := os.Stat(path); err == nil && fi.Size() > maxSettingsFileSize {
		return fmt.Errorf("httpapi: 配置文件异常巨大（%d 字节），拒绝写入以免继续损坏", fi.Size())
	}
	raw, err := os.ReadFile(path)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("httpapi: 读取配置失败: %w", err)
	}
	content := string(raw)

	keys := make([]string, 0, len(values))
	for k := range values {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	// 逐个键原地替换；文件中没有的键收集起来统一追加。
	var appended []string
	for _, key := range keys {
		line := formatSettingLine(key, values[key])
		re := settingLineRegexp(key)
		if re.MatchString(content) {
			// 必须用 Literal 版本：ReplaceAllString 会把替换串里的
			// $1 / ${name} 当捕获组引用、把 $ 当转义，导致配置值被静默截断
			// （实测 'a$b' 会被写成 'a'）。
			content = re.ReplaceAllLiteralString(content, line)
			continue
		}
		appended = append(appended, line)
	}

	if len(appended) > 0 {
		if !strings.Contains(content, "settings") || !strings.Contains(content, "{") {
			// 文件不存在或不是预期的 settings 字典：整体重建。
			content = "settings = {\n" + strings.Join(keysToLines(keys, values), "\n") + "\n}\n"
		} else {
			// 在 settings 字典的收尾大括号前插入。
			idx := strings.LastIndex(content, "}")
			if idx < 0 {
				return fmt.Errorf("httpapi: 配置文件格式异常，找不到 settings 字典结尾")
			}
			content = content[:idx] + strings.Join(appended, "\n") + "\n" + content[idx:]
		}
	}

	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("httpapi: 创建配置目录失败: %w", err)
	}
	// 原子替换：先写同目录临时文件，再 rename。
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, []byte(content), 0o644); err != nil {
		return fmt.Errorf("httpapi: 写入配置失败: %w", err)
	}
	if err := os.Rename(tmp, path); err != nil {
		_ = os.Remove(tmp)
		return fmt.Errorf("httpapi: 替换配置失败: %w", err)
	}
	return nil
}

// settingLineRegexp 构造匹配指定键的配置行正则。
//
// 与 settingsLine 同形，但把键名固定，用于原地替换单个键。
//
// 值部分用 [^\n]* 而不是 .*?：后者在超长行上会回溯爆炸。
// 曾因 auto.py 被写成 528MB（单行 184MB）而把 /read/<id> 拖死。
// 配置行内不会出现换行，[^\n]* 语义等价且线性。
func settingLineRegexp(key string) *regexp.Regexp {
	return regexp.MustCompile(`(?m)^[ \t]*['"]` + regexp.QuoteMeta(key) + `['"]\s*:[^\n]*$`)
}

// keysToLines 把键值对转成配置行。
func keysToLines(keys []string, values map[string]any) []string {
	out := make([]string, 0, len(keys))
	for _, k := range keys {
		out = append(out, formatSettingLine(k, values[k]))
	}
	return out
}

// formatSettingLine 生成 `'KEY'   : value,` 形式的配置行。
//
// 对齐 Python dumpfile 的输出风格：键用单引号，冒号前补空格对齐。
func formatSettingLine(key string, value any) string {
	pad := 22 - len(key)
	if pad < 1 {
		pad = 1
	}
	return fmt.Sprintf("    '%s'%s: %s,", key, strings.Repeat(" ", pad), formatSettingValue(value))
}

// formatSettingValue 把 Go 值转成 Python 字面量。
func formatSettingValue(v any) string {
	switch t := v.(type) {
	case nil:
		return "None"
	case bool:
		if t {
			return "True"
		}
		return "False"
	case string:
		return quotePython(t)
	case int:
		return strconv.Itoa(t)
	case int64:
		return strconv.FormatInt(t, 10)
	case float64:
		return strconv.FormatFloat(t, 'g', -1, 64)
	case []any:
		parts := make([]string, 0, len(t))
		for _, item := range t {
			parts = append(parts, formatSettingValue(item))
		}
		return "[" + strings.Join(parts, ", ") + "]"
	case map[string]any:
		keys := make([]string, 0, len(t))
		for k := range t {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		parts := make([]string, 0, len(keys))
		for _, k := range keys {
			parts = append(parts, quotePython(k)+": "+formatSettingValue(t[k]))
		}
		return "{" + strings.Join(parts, ", ") + "}"
	default:
		return quotePython(fmt.Sprint(t))
	}
}

// quotePython 用单引号包裹字符串并转义内部引号与反斜杠。
func quotePython(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, `'`, `\'`)
	s = strings.ReplaceAll(s, "\n", `\n`)
	return "'" + s + "'"
}
