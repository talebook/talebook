// 本文件提供 ThemeStore 的生产实现：把激活主题写回 Talebook 的配置文件。
package httpapi

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// activeThemeKey 是配置文件里的激活主题键名，对齐 theme.py 的 CONF["ACTIVE_THEME"]。
const activeThemeKey = "ACTIVE_THEME"

// FileThemeStore 把激活主题持久化到 Talebook 的 settings 文件。
//
// Python 侧用 CONF.dumpfile() 重写整个 auto.py；Go 侧只改 ACTIVE_THEME 一行，
// 避免在迁移期与 Python 争抢整份配置文件的写入权。
type FileThemeStore struct {
	// Path 是 settings 文件路径（通常是 conf/auto.py）。
	Path string
	// Cache 是进程内缓存；为 nil 时每次读文件。
	Cache *string
}

// ActiveTheme 读取当前激活主题。
//
// 优先返回缓存；否则从文件解析 ACTIVE_THEME 行。
func (s *FileThemeStore) ActiveTheme() string {
	if s == nil {
		return ""
	}
	if s.Cache != nil {
		return *s.Cache
	}
	return s.readFromFile()
}

// activeThemeLine 匹配 `'ACTIVE_THEME'   : 'brass',` 形式的配置行。
var activeThemeLine = regexp.MustCompile(`(?m)^\s*'ACTIVE_THEME'\s*:\s*(.*?),\s*$`)

// readFromFile 从 settings 文件解析 ACTIVE_THEME。
func (s *FileThemeStore) readFromFile() string {
	if s.Path == "" {
		return ""
	}
	raw, err := os.ReadFile(s.Path)
	if err != nil {
		return ""
	}
	m := activeThemeLine.FindSubmatch(raw)
	if m == nil {
		return ""
	}
	return unquotePython(strings.TrimSpace(string(m[1])))
}

// unquotePython 去掉 Python repr 的单/双引号。
func unquotePython(s string) string {
	if len(s) >= 2 {
		if (s[0] == '\'' && s[len(s)-1] == '\'') || (s[0] == '"' && s[len(s)-1] == '"') {
			return s[1 : len(s)-1]
		}
	}
	return s
}

// SetActiveTheme 写入激活主题；空串表示恢复默认。
//
// 文件不存在时创建；已存在 ACTIVE_THEME 行时原地替换，否则追加。
func (s *FileThemeStore) SetActiveTheme(name string) error {
	if s == nil {
		return fmt.Errorf("httpapi: FileThemeStore 为 nil")
	}
	if s.Path == "" {
		return fmt.Errorf("httpapi: FileThemeStore 需要 Path")
	}

	raw, err := os.ReadFile(s.Path)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("httpapi: 读取配置失败: %w", err)
	}
	content := string(raw)

	line := fmt.Sprintf("'%s'%s: '%s',", activeThemeKey, strings.Repeat(" ", 22-len(activeThemeKey)), name)
	if activeThemeLine.MatchString(content) {
		content = activeThemeLine.ReplaceAllString(content, line)
	} else {
		if content != "" && !strings.HasSuffix(content, "\n") {
			content += "\n"
		}
		content += line + "\n"
	}

	if err := os.MkdirAll(filepath.Dir(s.Path), 0o755); err != nil {
		return fmt.Errorf("httpapi: 创建配置目录失败: %w", err)
	}
	if err := os.WriteFile(s.Path, []byte(content), 0o644); err != nil {
		return fmt.Errorf("httpapi: 写入配置失败: %w", err)
	}
	if s.Cache != nil {
		*s.Cache = name
	}
	return nil
}

// MemoryThemeStore 是内存实现，供测试与无配置文件场景使用。
type MemoryThemeStore struct {
	// Name 是当前激活主题。
	Name string
	// Err 非 nil 时 SetActiveTheme 返回它，用于测试失败分支。
	Err error
}

// ActiveTheme 返回内存中的激活主题。
func (s *MemoryThemeStore) ActiveTheme() string {
	if s == nil {
		return ""
	}
	return s.Name
}

// SetActiveTheme 写入内存中的激活主题。
func (s *MemoryThemeStore) SetActiveTheme(name string) error {
	if s == nil {
		return fmt.Errorf("httpapi: MemoryThemeStore 为 nil")
	}
	if s.Err != nil {
		return s.Err
	}
	s.Name = name
	return nil
}
