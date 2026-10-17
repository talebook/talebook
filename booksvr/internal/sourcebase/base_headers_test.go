package sourcebase

import (
	"encoding/base64"
	"strings"
	"testing"
)

// TestBaseHeadersCredentials 复刻 SourceBase._headers：Accept 默认头 +
// secrets 凭据换 X-Api-Key / Basic Authorization。
func TestBaseHeadersCredentials(t *testing.T) {
	b := NewBase("测试源", nil, nil)

	// 无凭据：只有 Accept（与可选 User-Agent）。
	headers := b.headers(map[string]any{})
	if !strings.Contains(headers["Accept"], "application/opds+json") {
		t.Errorf("Accept = %q, 应含 opds+json", headers["Accept"])
	}
	if _, ok := headers["X-Api-Key"]; ok {
		t.Error("无 api_key 时不应有 X-Api-Key")
	}
	if _, ok := headers["Authorization"]; ok {
		t.Error("无用户名密码时不应有 Authorization")
	}

	// api_key 优先。
	headers = b.headers(map[string]any{
		"secrets": map[string]any{"api_key": "k1", "username": "u", "password": "p"},
	})
	if headers["X-Api-Key"] != "k1" {
		t.Errorf("X-Api-Key = %q, want k1", headers["X-Api-Key"])
	}
	if _, ok := headers["Authorization"]; ok {
		t.Error("api_key 存在时不应有 Basic Authorization")
	}

	// username+password → Basic。
	headers = b.headers(map[string]any{
		"secrets": map[string]any{"username": "u", "password": "p"},
	})
	want := "Basic " + base64.StdEncoding.EncodeToString([]byte("u:p"))
	if headers["Authorization"] != want {
		t.Errorf("Authorization = %q, want %q", headers["Authorization"], want)
	}
	if _, ok := headers["X-Api-Key"]; ok {
		t.Error("无 api_key 时不应有 X-Api-Key")
	}
}

// TestBaseFormatsFallbackToAllowedFormats 复刻 _formats：未配置/空配置回退
// ALLOWED_FORMATS 全集并与全集求交集。
func TestBaseFormatsFallbackToAllowedFormats(t *testing.T) {
	b := NewBase("测试源", nil, nil)

	// 未配置：全集 9 种。
	formats := b.formats(map[string]any{})
	for _, f := range []string{"azw", "azw3", "cbr", "cbz", "epub", "fb2", "mobi", "pdf", "txt"} {
		if !formats[f] {
			t.Errorf("未配置 formats 时缺少 %s", f)
		}
	}
	if len(formats) != len(AllowedFormats) {
		t.Errorf("formats 数 = %d, want %d", len(formats), len(AllowedFormats))
	}

	// 显式配置：与全集求交集，非法格式名被剔除。
	formats = b.formats(map[string]any{
		"config": map[string]any{"formats": []any{"epub", "cbz", "exe"}},
	})
	if !formats["epub"] || !formats["cbz"] {
		t.Errorf("epub/cbz 应保留: %v", formats)
	}
	if formats["exe"] {
		t.Error("非法格式 exe 不应放行")
	}

	// 空列表：Python 的 or 短路同样回退全集。
	formats = b.formats(map[string]any{
		"config": map[string]any{"formats": []any{}},
	})
	if len(formats) != len(AllowedFormats) {
		t.Errorf("空列表应回退全集, got %d", len(formats))
	}
}
