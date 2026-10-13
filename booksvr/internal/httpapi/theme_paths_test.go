package httpapi

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestDecodeJSONObject 覆盖 JSON 对象解析的各分支。
func TestDecodeJSONObject(t *testing.T) {
	// 合法对象。
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"a":"b"}`))
	obj, ok := decodeJSONObject(req)
	if !ok || obj["a"] != "b" {
		t.Errorf("合法对象应解析成功: obj=%v ok=%v", obj, ok)
	}

	// 非法 JSON。
	req = httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{bad`))
	if _, ok := decodeJSONObject(req); ok {
		t.Error("非法 JSON 应返回 false")
	}

	// 空体。
	req = httptest.NewRequest(http.MethodPost, "/", strings.NewReader(""))
	if _, ok := decodeJSONObject(req); ok {
		t.Error("空体应返回 false")
	}

	// JSON null → 不是对象。
	req = httptest.NewRequest(http.MethodPost, "/", strings.NewReader("null"))
	if _, ok := decodeJSONObject(req); ok {
		t.Error("null 应返回 false")
	}

	// JSON 数组 → 不是对象。
	req = httptest.NewRequest(http.MethodPost, "/", strings.NewReader("[1,2]"))
	if _, ok := decodeJSONObject(req); ok {
		t.Error("数组应返回 false")
	}

	// nil 请求。
	if _, ok := decodeJSONObject(nil); ok {
		t.Error("nil 请求应返回 false")
	}

	// Body 为 nil。
	req = httptest.NewRequest(http.MethodPost, "/", nil)
	req.Body = nil
	if _, ok := decodeJSONObject(req); ok {
		t.Error("Body 为 nil 应返回 false")
	}
}

// TestFileThemeStoreWriteFileError 覆盖 os.WriteFile 失败分支。
//
// 需要让 os.ReadFile 成功、而 os.WriteFile 失败：
// 用一个可读的普通文件，但把它设为只读（0o444）。
// Windows 上只读位对文件生效，写入会返回 permission denied。
func TestFileThemeStoreWriteFileError(t *testing.T) {
	dir := t.TempDir()
	target := filepath.Join(dir, "auto.py")
	if err := os.WriteFile(target, []byte("settings = {\n}\n"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	// 设为只读，使后续写入失败。
	if err := os.Chmod(target, 0o444); err != nil {
		t.Skipf("无法设置只读位: %v", err)
	}
	t.Cleanup(func() { _ = os.Chmod(target, 0o644) })

	store := &FileThemeStore{Path: target}
	// 读取应成功（文件可读）。
	if got := store.ActiveTheme(); got != "" {
		t.Errorf("无 ACTIVE_THEME 行应返回空串，得到 %q", got)
	}
	// 写入应失败。
	if err := store.SetActiveTheme("brass"); err == nil {
		t.Error("只读文件上写入应返回错误")
	}
}
