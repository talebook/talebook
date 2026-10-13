package httpapi

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"talebook/booksvr/internal/sslcert"
)

// sslUploadCtx 构造一个带 multipart 证书上传的请求上下文。
func sslUploadCtx(t *testing.T, db any) *Context {
	t.Helper()
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	for _, field := range []string{"ssl_crt", "ssl_key"} {
		part, err := w.CreateFormFile(field, field+".pem")
		if err != nil {
			t.Fatalf("建表单失败: %v", err)
		}
		if _, err := part.Write([]byte("x")); err != nil {
			t.Fatalf("写表单失败: %v", err)
		}
	}
	if err := w.Close(); err != nil {
		t.Fatalf("关闭表单失败: %v", err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/admin/ssl", &buf)
	req.Header.Set("Content-Type", w.FormDataContentType())
	return &Context{
		Request:  req,
		Writer:   httptest.NewRecorder(),
		Identity: Identity{UserID: 1, IsAdmin: true},
	}
}

// TestAdminSSLErrorMapping 覆盖 5 类证书错误的错误码映射。
//
// 对应 Python SSLHandlerLogic.run 的 5 个 except 分支。
func TestAdminSSLErrorMapping(t *testing.T) {
	cases := []struct {
		name string
		kind sslcert.Kind
		want string
	}{
		{"validation", sslcert.KindValidation, "params.ssl_error"},
		{"save", sslcert.KindSave, "internal.ssl_save_error"},
		{"nginx_config", sslcert.KindNginxConfig, "internal.nginx_test_error"},
		{"nginx_reload", sslcert.KindNginxReload, "internal.nginx_reload_error"},
		{"rollback", sslcert.KindRollback, "internal.ssl_rollback_error"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := adminSSLError(&sslcert.Error{Kind: tc.kind, Message: "boom"})
			if got["err"] != tc.want {
				t.Errorf("err = %v，期望 %v", got["err"], tc.want)
			}
			if got["msg"] == "" {
				t.Error("msg 不应为空")
			}
		})
	}
}

// TestAdminSSLErrorMappingUnknown 覆盖非 sslcert 错误的兜底映射。
func TestAdminSSLErrorMappingUnknown(t *testing.T) {
	got := adminSSLError(bsErrString("plain error"))
	if got["err"] != "params.ssl_error" {
		t.Errorf("err = %v，期望 params.ssl_error", got["err"])
	}
}

// TestAdminSSLHandlerMapsKind 覆盖 handler 把 sslcert 错误映射到接口错误码。
func TestAdminSSLHandlerMapsKind(t *testing.T) {
	fx := newAdminFixture(t)
	fx.Cfg.InstallSSL = func([]byte, []byte) error {
		return &sslcert.Error{Kind: sslcert.KindNginxReload, Message: "reload failed"}
	}
	ctx := sslUploadCtx(t, fx.DB)
	got, err := AdminSSLHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "internal.nginx_reload_error" {
		t.Errorf("err = %v，期望 internal.nginx_reload_error", got["err"])
	}
}

// TestNewSSLInstallerDefaults 覆盖配置缺失时的默认路径。
func TestNewSSLInstallerDefaults(t *testing.T) {
	install := newSSLInstaller(nil)
	if install == nil {
		t.Fatal("默认配置应返回可用的安装回调")
	}
}

// TestNewSSLInstallerUsesSettings 覆盖从配置读取证书路径。
func TestNewSSLInstallerUsesSettings(t *testing.T) {
	dir := t.TempDir()
	settings := map[string]any{
		"ssl_crt_file": filepath.Join(dir, "my.crt"),
		"ssl_key_file": filepath.Join(dir, "my.key"),
	}
	install := newSSLInstaller(settings)
	if install == nil {
		t.Fatal("应返回可用的安装回调")
	}
	// 无效证书 → 校验失败，且不应创建证书文件。
	err := install([]byte("bad"), []byte("bad"))
	if err == nil {
		t.Fatal("无效证书应报错")
	}
	if _, statErr := os.Stat(filepath.Join(dir, "my.crt")); !os.IsNotExist(statErr) {
		t.Error("校验失败不应留下证书文件")
	}
}

// TestNewSSLInstallerRejectsDifferentDirs 覆盖证书与私钥不同目录时回落 nil。
func TestNewSSLInstallerRejectsDifferentDirs(t *testing.T) {
	settings := map[string]any{
		"ssl_crt_file": "/a/ssl.crt",
		"ssl_key_file": "/b/ssl.key",
	}
	if install := newSSLInstaller(settings); install != nil {
		t.Error("不同目录应回落为 nil")
	}
}
