package httpapi

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

// repoRoot 定位仓库根目录（booksvr 的上一级）。
func repoRoot(t *testing.T) string {
	t.Helper()
	abs, err := filepath.Abs(filepath.Join("..", "..", ".."))
	if err != nil {
		t.Fatalf("resolve repo root: %v", err)
	}
	return abs
}

func TestLegacyRouteCountIs215(t *testing.T) {
	if got := LegacyRouteCount(); got != 215 {
		t.Fatalf("LegacyRouteCount() = %d, want 215", got)
	}
}

func TestNewRouteCountIs4(t *testing.T) {
	if got := len(NewRoutes()); got != 4 {
		t.Fatalf("NewRoutes() 数 = %d, want 4", got)
	}
}

func TestTotalRouteCountIs219(t *testing.T) {
	if got := RouteCount(); got != 219 {
		t.Fatalf("RouteCount() = %d, want 219（215 既有 + 4 新增）", got)
	}
}

func TestRoutesReturnsCopy(t *testing.T) {
	first := Routes()
	first[0].Pattern = "/mutated"
	second := Routes()
	if second[0].Pattern == "/mutated" {
		t.Fatal("Routes() 返回的切片被外部修改污染了注册表")
	}
}

func TestNoDuplicatePatterns(t *testing.T) {
	seen := map[string]int{}
	for _, r := range Routes() {
		seen[r.Pattern]++
	}
	for pattern, n := range seen {
		if n > 1 {
			t.Errorf("pattern %q 重复注册 %d 次", pattern, n)
		}
	}
}

// TestNewRoutesDoNotCollideWithLegacy 断言新增 4 条不与既有 215 条撞路径。
func TestNewRoutesDoNotCollideWithLegacy(t *testing.T) {
	legacy := map[string]bool{}
	for _, r := range LegacyRoutes() {
		legacy[r.Pattern] = true
	}
	for _, r := range NewRoutes() {
		if legacy[r.Pattern] {
			t.Errorf("新增路由 %q 与既有路由撞路径", r.Pattern)
		}
	}
}

func TestEveryRouteHasPatternHandlerSource(t *testing.T) {
	for i, r := range Routes() {
		if r.Pattern == "" {
			t.Errorf("route[%d] pattern 为空", i)
		}
		if r.Handler == "" {
			t.Errorf("route[%d] (%s) handler 为空", i, r.Pattern)
		}
		if r.Source == "" {
			t.Errorf("route[%d] (%s) source 为空", i, r.Pattern)
		}
		if len(r.Methods) == 0 {
			t.Errorf("route[%d] (%s) methods 为空", i, r.Pattern)
		}
	}
}

// TestPatternsAreValidRegex 断言每条 pattern 都能编译为正则。
func TestPatternsAreValidRegex(t *testing.T) {
	for _, r := range Routes() {
		if _, err := regexp.Compile(r.Pattern); err != nil {
			t.Errorf("pattern %q 不是合法正则: %v", r.Pattern, err)
		}
	}
}

// TestSourceFilesExist 断言每条路由的 Source 文件真实存在。
func TestSourceFilesExist(t *testing.T) {
	root := repoRoot(t)
	for _, r := range Routes() {
		path := filepath.Join(root, filepath.FromSlash(r.Source))
		if _, err := os.Stat(path); err != nil {
			t.Errorf("route %q 的 source %q 不存在: %v", r.Pattern, r.Source, err)
		}
	}
}

// TestPatternsExistInPythonSource 断言每条既有 pattern 逐字出现在其 Source 文件里。
//
// 这是「与 Python 版一致」的硬证据：不是靠人工抄写，而是回到源码比对。
// 新增的 4 条路由不属于 Python 版，因此只对 LegacyRoutes 做此断言。
func TestPatternsExistInPythonSource(t *testing.T) {
	root := repoRoot(t)
	cache := map[string]string{}
	for _, r := range LegacyRoutes() {
		src, ok := cache[r.Source]
		if !ok {
			data, err := os.ReadFile(filepath.Join(root, filepath.FromSlash(r.Source)))
			if err != nil {
				t.Fatalf("read %s: %v", r.Source, err)
			}
			src = string(data)
			cache[r.Source] = src
		}
		// Python 源码里 pattern 写作 r"/api/..."，去掉 r" 前缀与结尾引号比对。
		if !strings.Contains(src, r.Pattern) {
			t.Errorf("pattern %q 未在 %s 中找到", r.Pattern, r.Source)
		}
	}
}

// TestPrefixDistribution 断言既有 215 条按前缀分布与盘点表一致。
//
// 新增 4 条不计入：它们不是 Python 版路由。
func TestPrefixDistribution(t *testing.T) {
	want := map[string]int{
		"/api/":   188,
		"/opds":   5,
		"/auth":   4,
		"/get":    4,
		"/read":   4,
		"/books":  1,
		"/static": 1,
	}
	got := map[string]int{}
	other := 0
	for _, r := range LegacyRoutes() {
		matched := false
		for prefix := range want {
			if strings.HasPrefix(r.Pattern, prefix) {
				got[prefix]++
				matched = true
				break
			}
		}
		if !matched {
			other++
		}
	}
	// 盘点表把 8 条归为 other
	if other != 8 {
		t.Errorf("other 前缀路由 = %d, want 8", other)
	}
	for prefix, n := range want {
		if got[prefix] != n {
			t.Errorf("前缀 %q 路由数 = %d, want %d", prefix, got[prefix], n)
		}
	}
}

// TestKnownRoutesPresent 抽查若干关键路由必须存在。
func TestKnownRoutesPresent(t *testing.T) {
	patterns := Patterns()
	required := []string{
		"/api/welcome",
		"/api/book/([0-9]+\\..+)",
		"/api/book/([0-9]+)/separate",
		"/api/book/([0-9]+)/delete_format",
		"/api/book/([0-9]+)/media_type",
		"/api/book/([0-9]+)/send_to_device",
		"/api/book/([0-9]+)/mailto",
		"/api/book/upload",
		"/api/book/upload/chunk",
		"/api/book/upload/complete",
		"/api/book/txt/init",
		"/get/extract/([0-9]+)/(.*)",
		"/get/pcover",
		"/get/progress/([0-9]+)",
		"/books/?(.*)",
		"/static/themes/(.*)",
		"/auth/login/(?P<backend>[^/]+)/?",
	}
	for _, p := range required {
		if !patterns[p] {
			t.Errorf("缺少必需路由 %q", p)
		}
	}
}

// TestRouteSourcesCoverAllModules 断言既有路由来源覆盖盘点表列出的全部模块。
func TestRouteSourcesCoverAllModules(t *testing.T) {
	want := []string{
		"webserver/handlers/book.py",
		"webserver/handlers/plugins.py",
		"webserver/handlers/audiobook.py",
		"webserver/handlers/admin.py",
		"webserver/handlers/network_library.py",
		"webserver/handlers/user.py",
		"webserver/handlers/scan.py",
		"webserver/handlers/booksource_admin.py",
		"webserver/handlers/files.py",
		"webserver/handlers/meta.py",
		"webserver/handlers/opds.py",
		"webserver/handlers/annotations.py",
		"webserver/handlers/comic.py",
		"webserver/handlers/captcha.py",
		"webserver/handlers/network_comic.py",
		"webserver/handlers/theme.py",
		"webserver/handlers/upgrade.py",
		"webserver/webdav/handler.py",
		"webserver/main.py",
		"webserver/social_routes.py",
	}
	have := map[string]bool{}
	for _, r := range LegacyRoutes() {
		have[r.Source] = true
	}
	for _, src := range want {
		if !have[src] {
			t.Errorf("路由来源缺少模块 %q", src)
		}
	}
}
