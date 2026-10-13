package httpapi

import (
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

// 缺陷 11 回归：默认封面未接线，导致 /get/cover 返回 0 字节。
//
// 用户可见现象：详情页与列表页封面图全部空白。
// 根因：FilesConfig.DefaultCover 从未在 serve.go 里赋值，书籍无封面时
// 回退到一个 nil 切片，接口返回 200 但内容为空。

func TestLoadDefaultCoverFromHTMLPath(t *testing.T) {
	// 造一个镜像式目录结构：<base>/app/dist 与 <base>/webserver/resources/calibre
	base := t.TempDir()
	htmlPath := filepath.Join(base, "app", "dist")
	if err := os.MkdirAll(htmlPath, 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	resDir := filepath.Join(base, "webserver", "resources", "calibre")
	if err := os.MkdirAll(resDir, 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	want := []byte("JPEG-DEFAULT-COVER")
	if err := os.WriteFile(filepath.Join(resDir, "default_cover.jpg"), want, 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}

	got := loadDefaultCover(htmlPath)
	if string(got) != string(want) {
		t.Errorf("loadDefaultCover = %q, want %q", got, want)
	}
}

func TestLoadDefaultCoverMissingReturnsNil(t *testing.T) {
	// 找不到时返回 nil，接口应回退为 404 而不是 0 字节 200。
	if got := loadDefaultCover(filepath.Join(t.TempDir(), "nope")); got != nil {
		t.Errorf("loadDefaultCover = %q, want nil", got)
	}
}

// TestCoverEndpointReturnsDefaultBytes 无封面书籍必须拿到默认封面字节。
//
// 这是缺陷 11 的端到端断言：DefaultCover 为 nil 时接口返回 200 但 0 字节，
// 前端封面图空白。
func TestCoverEndpointReturnsDefaultBytes(t *testing.T) {
	ctx, cfg := filesFixture(t)
	ctx.Params = []string{"cover", "1"}

	if _, err := ImageHandler(cfg)(ctx); err != nil {
		t.Fatalf("ImageHandler: %v", err)
	}
	rec := ctx.Writer.(*httptest.ResponseRecorder)
	if rec.Body.Len() == 0 {
		t.Fatal("封面响应为 0 字节（DefaultCover 未接线）")
	}
	if got := rec.Body.String(); got != string(cfg.DefaultCover) {
		t.Errorf("封面字节 = %q, want %q", got, cfg.DefaultCover)
	}
}
