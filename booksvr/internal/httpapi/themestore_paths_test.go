package httpapi

import (
	"os"
	"path/filepath"
	"testing"
)

// TestFileThemeStoreReadErrors 覆盖读取失败分支。
func TestFileThemeStoreReadErrors(t *testing.T) {
	// 路径指向目录 → os.ReadFile 失败 → 返回空串。
	dir := t.TempDir()
	store := &FileThemeStore{Path: dir}
	if got := store.ActiveTheme(); got != "" {
		t.Errorf("读取目录应返回空串，得到 %q", got)
	}

	// 文件存在但没有 ACTIVE_THEME 行 → 返回空串。
	path := filepath.Join(t.TempDir(), "auto.py")
	if err := os.WriteFile(path, []byte("settings = {\n    'OTHER': 'x',\n}\n"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	if got := (&FileThemeStore{Path: path}).ActiveTheme(); got != "" {
		t.Errorf("无 ACTIVE_THEME 行应返回空串，得到 %q", got)
	}
}

// TestFileThemeStoreSetErrors 覆盖写入失败分支。
func TestFileThemeStoreSetErrors(t *testing.T) {
	// 路径指向目录 → os.ReadFile 返回非 NotExist 错误 → 立即失败。
	dir := t.TempDir()
	if err := (&FileThemeStore{Path: dir}).SetActiveTheme("brass"); err == nil {
		t.Error("读取目录失败时应返回错误")
	}

	// 父路径是文件 → MkdirAll 失败。
	file := filepath.Join(t.TempDir(), "afile")
	if err := os.WriteFile(file, []byte("x"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	bad := &FileThemeStore{Path: filepath.Join(file, "sub", "auto.py")}
	if err := bad.SetActiveTheme("brass"); err == nil {
		t.Error("父路径为文件时应返回错误")
	}
}

// TestFileThemeStoreAppendsToExistingFile 覆盖向已有文件追加配置行。
func TestFileThemeStoreAppendsToExistingFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "auto.py")
	// 文件无结尾换行，且无 ACTIVE_THEME 行。
	if err := os.WriteFile(path, []byte("settings = {"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	store := &FileThemeStore{Path: path}
	if err := store.SetActiveTheme("brass"); err != nil {
		t.Fatalf("追加失败: %v", err)
	}
	if got := store.ActiveTheme(); got != "brass" {
		t.Errorf("追加后读回 = %q, want brass", got)
	}
	raw, _ := os.ReadFile(path)
	if string(raw[len(raw)-1]) != "\n" {
		t.Errorf("追加后应以换行结尾:\n%q", raw)
	}
}

// TestFileThemeStoreCreatesDir 覆盖自动创建配置目录。
func TestFileThemeStoreCreatesDir(t *testing.T) {
	path := filepath.Join(t.TempDir(), "nested", "deep", "auto.py")
	store := &FileThemeStore{Path: path}
	if err := store.SetActiveTheme("minimal"); err != nil {
		t.Fatalf("应自动创建目录: %v", err)
	}
	if got := store.ActiveTheme(); got != "minimal" {
		t.Errorf("读回 = %q, want minimal", got)
	}
}
