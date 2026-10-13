package httpapi

import (
	"net/http"
	"strings"
	"testing"
)

// TestBookLibraryStreamNDJSON 验证 /api/library?stream=1 返回 NDJSON。
//
// 这是「书库浏览永远没有书」的回归测试：前端 $backend_stream 按行解析，
// 首行是元信息、随后每行一本书。曾返回单个 JSON 对象，导致列表永远为空。
func TestBookLibraryStreamNDJSON(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")
	insertBook(t, f.DB, 11, "活着")

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/library?stream=1", "", 0, false)
	resp, err := BookLibraryHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	// 流式路径直接写响应体，不再返回 map。
	if resp != nil {
		t.Fatalf("stream=1 应直接写 NDJSON，实际返回 %+v", resp)
	}

	body := pluginRecorder(ctx).Body.String()
	lines := strings.Split(strings.TrimRight(body, "\n"), "\n")
	if len(lines) < 2 {
		t.Fatalf("NDJSON 至少应有元信息行 + 1 本书，实际 %d 行: %q", len(lines), body)
	}

	// 首行必须是元信息。
	if !strings.Contains(lines[0], `"err":"ok"`) || !strings.Contains(lines[0], `"total":2`) {
		t.Errorf("首行元信息不正确: %s", lines[0])
	}
	// 后续每行一本书。
	for i, line := range lines[1:] {
		if !strings.Contains(line, `"id":`) {
			t.Errorf("第 %d 行不是书籍对象: %s", i+1, line)
		}
	}
}

// TestBookLibraryStreamContentType 验证 NDJSON 的响应头。
func TestBookLibraryStreamContentType(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/library?stream=1", "", 0, false)
	if _, err := BookLibraryHandler(f.Cfg)(ctx); err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if ct := ctx.Writer.Header().Get("Content-Type"); ct != "application/x-ndjson" {
		t.Errorf("Content-Type = %q，期望 application/x-ndjson", ct)
	}
	if v := ctx.Writer.Header().Get("X-Accel-Buffering"); v != "no" {
		t.Errorf("X-Accel-Buffering = %q，期望 no", v)
	}
}

// TestBookLibraryNonStreamJSON 验证不带 stream 时仍是单个 JSON 对象。
func TestBookLibraryNonStreamJSON(t *testing.T) {
	f := newBookFixture(t)
	insertBook(t, f.DB, 10, "三体")

	ctx := pluginCtx(t, f.DB, http.MethodGet, "/api/library", "", 0, false)
	resp, err := BookLibraryHandler(f.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler 失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("resp = %+v", resp)
	}
	if _, ok := resp["books"]; !ok {
		t.Error("非流式响应应含 books 字段")
	}
	if pluginRecorder(ctx).Body.Len() != 0 {
		t.Error("非流式路径不应直接写响应体")
	}
}
