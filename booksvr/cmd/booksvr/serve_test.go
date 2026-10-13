package main

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// writeTempDB 建一个空的临时 SQLite 文件，仅用于「文件存在」校验。
func writeTempDB(t *testing.T) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "metadata.db")
	if err := os.WriteFile(path, []byte{}, 0o644); err != nil {
		t.Fatalf("write temp db: %v", err)
	}
	return path
}

// TestServeRequiresDB 校验缺少 -db 时报错。
func TestServeRequiresDB(t *testing.T) {
	t.Setenv("BOOKSVR_DB", "")
	t.Setenv("BOOKSVR_COOKIE_SECRET", "s3cret")

	var out bytes.Buffer
	err := runServe([]string{"-cookie-secret=s3cret"}, &out)
	if err == nil {
		t.Fatal("缺少 -db 时应报错，实际返回 nil")
	}
	if !strings.Contains(err.Error(), "-db") {
		t.Fatalf("错误信息应提到 -db，实际: %v", err)
	}
}

// TestServeRequiresCookieSecret 校验缺少 cookie secret 时报错。
func TestServeRequiresCookieSecret(t *testing.T) {
	t.Setenv("BOOKSVR_COOKIE_SECRET", "")
	db := writeTempDB(t)

	var out bytes.Buffer
	err := runServe([]string{"-db=" + db}, &out)
	if err == nil {
		t.Fatal("缺少 cookie secret 时应报错，实际返回 nil")
	}
	if !strings.Contains(err.Error(), "cookie-secret") {
		t.Fatalf("错误信息应提到 cookie-secret，实际: %v", err)
	}
}

// TestServeRejectsUnknownRoute 校验白名单含未注册 pattern 时报错。
func TestServeRejectsUnknownRoute(t *testing.T) {
	t.Setenv("BOOKSVR_COOKIE_SECRET", "")
	db := writeTempDB(t)

	var out bytes.Buffer
	err := runServe([]string{
		"-db=" + db,
		"-cookie-secret=s3cret",
		"-serve-routes=/api/not-a-real-route",
	}, &out)
	if err == nil {
		t.Fatal("未知 route 应报错，实际返回 nil")
	}
	if !strings.Contains(err.Error(), "/api/not-a-real-route") {
		t.Fatalf("错误信息应提到该 pattern，实际: %v", err)
	}
}

// TestServeAcceptsKnownRoute 校验已注册 pattern 通过校验（不启动监听）。
func TestServeAcceptsKnownRoute(t *testing.T) {
	t.Setenv("BOOKSVR_COOKIE_SECRET", "")
	db := writeTempDB(t)

	opts, err := parseServeOptions([]string{
		"-db=" + db,
		"-cookie-secret=s3cret",
		"-serve-routes=/api/work/([0-9]+)",
	})
	if err != nil {
		t.Fatalf("已注册 pattern 不应报错: %v", err)
	}
	if len(opts.ServeRoutes) != 1 || opts.ServeRoutes[0] != "/api/work/([0-9]+)" {
		t.Fatalf("ServeRoutes 解析错误: %#v", opts.ServeRoutes)
	}
}

// TestServeHelpMentionsOptions 校验 -help 输出含全部关键参数。
func TestServeHelpMentionsOptions(t *testing.T) {
	var out bytes.Buffer
	fs := newServeFlagSet(&out)
	if err := fs.Parse([]string{"-help"}); err == nil {
		// flag 包在 -help 时返回 ErrHelp，属预期；此处只关心输出内容。
		t.Log("flag.Parse(-help) 未返回错误")
	}
	text := out.String()
	for _, want := range []string{"-db", "-addr", "-tornado-url", "-serve-routes", "-cookie-secret"} {
		if !strings.Contains(text, want) {
			t.Errorf("-help 输出缺少 %s\n实际输出:\n%s", want, text)
		}
	}
}

// TestServeEnvFallback 校验环境变量回退。
func TestServeEnvFallback(t *testing.T) {
	db := writeTempDB(t)
	t.Setenv("BOOKSVR_DB", db)
	t.Setenv("BOOKSVR_COOKIE_SECRET", "from-env")
	t.Setenv("BOOKSVR_ADDR", "127.0.0.1:9999")
	t.Setenv("BOOKSVR_TORNADO_URL", "http://127.0.0.1:9998")
	t.Setenv("BOOKSVR_SERVE_ROUTES", "/api/work/([0-9]+)")

	opts, err := parseServeOptions(nil)
	if err != nil {
		t.Fatalf("环境变量回退失败: %v", err)
	}
	if opts.DBPath != db {
		t.Errorf("DBPath = %q, want %q", opts.DBPath, db)
	}
	if opts.CookieSecret != "from-env" {
		t.Errorf("CookieSecret = %q, want from-env", opts.CookieSecret)
	}
	if opts.Addr != "127.0.0.1:9999" {
		t.Errorf("Addr = %q", opts.Addr)
	}
	if opts.TornadoURL != "http://127.0.0.1:9998" {
		t.Errorf("TornadoURL = %q", opts.TornadoURL)
	}
	if len(opts.ServeRoutes) != 1 {
		t.Errorf("ServeRoutes = %#v", opts.ServeRoutes)
	}
}

// TestServeDefaults 校验默认值。
func TestServeDefaults(t *testing.T) {
	t.Setenv("BOOKSVR_ADDR", "")
	t.Setenv("BOOKSVR_TORNADO_URL", "")
	t.Setenv("BOOKSVR_SERVE_ROUTES", "")
	db := writeTempDB(t)

	opts, err := parseServeOptions([]string{"-db=" + db, "-cookie-secret=s3cret"})
	if err != nil {
		t.Fatalf("默认值解析失败: %v", err)
	}
	if opts.Addr != "127.0.0.1:8000" {
		t.Errorf("Addr 默认值 = %q, want 127.0.0.1:8000", opts.Addr)
	}
	if opts.TornadoURL != "http://127.0.0.1:8001" {
		t.Errorf("TornadoURL 默认值 = %q, want http://127.0.0.1:8001", opts.TornadoURL)
	}
	if len(opts.ServeRoutes) != 0 {
		t.Errorf("ServeRoutes 默认应为空，实际 %#v", opts.ServeRoutes)
	}
}

// TestServeAllKeyword 校验 all 关键字。
func TestServeAllKeyword(t *testing.T) {
	db := writeTempDB(t)
	opts, err := parseServeOptions([]string{
		"-db=" + db,
		"-cookie-secret=s3cret",
		"-serve-routes=all",
	})
	if err != nil {
		t.Fatalf("all 关键字解析失败: %v", err)
	}
	if !opts.ServeAll {
		t.Error("ServeAll 应为 true")
	}
}

// TestServeMissingDBFile 校验 -db 指向不存在的文件时报错。
func TestServeMissingDBFile(t *testing.T) {
	missing := filepath.Join(t.TempDir(), "nope.db")
	_, err := parseServeOptions([]string{"-db=" + missing, "-cookie-secret=s3cret"})
	if err == nil {
		t.Fatal("不存在的 -db 应报错")
	}
}
