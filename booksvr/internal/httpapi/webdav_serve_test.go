package httpapi

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// newWebDAVFixture 建一个 WebDAV 服务夹具。
func newWebDAVFixture(t *testing.T) (*webdavService, string) {
	t.Helper()
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	createFormatTables(t, db)
	root := t.TempDir()
	return newWebDAVService(db, db, map[string]any{}, root), root
}

// davCtx 构造一个带请求/响应写入器的上下文。
func davCtx(method, target string, userID int64, body string) (*Context, *httptest.ResponseRecorder) {
	var req *http.Request
	if body != "" {
		req = httptest.NewRequest(method, target, strings.NewReader(body))
	} else {
		req = httptest.NewRequest(method, target, nil)
	}
	rec := httptest.NewRecorder()
	return &Context{Request: req, Writer: rec, Identity: Identity{UserID: userID}}, rec
}

// TestWebDAVPropfindRoot 覆盖根目录 PROPFIND。
func TestWebDAVPropfindRoot(t *testing.T) {
	svc, _ := newWebDAVFixture(t)
	ctx, rec := davCtx("PROPFIND", "/books/", 1, "")

	if !svc.Serve(ctx) {
		t.Fatal("Serve 应返回 true")
	}
	if rec.Code != 207 {
		t.Fatalf("状态码 = %d，期望 207", rec.Code)
	}
	body := rec.Body.String()
	if !strings.Contains(body, "multistatus") {
		t.Errorf("响应缺少 multistatus: %s", body)
	}
	for _, section := range []string{"分类", "标签", "作者", "最新"} {
		if !strings.Contains(body, section) {
			t.Errorf("响应缺少分类 %s", section)
		}
	}
}

// TestWebDAVPropfindMissing 覆盖不存在路径。
func TestWebDAVPropfindMissing(t *testing.T) {
	svc, _ := newWebDAVFixture(t)
	ctx, rec := davCtx("PROPFIND", "/books/不存在", 1, "")

	svc.Serve(ctx)
	if rec.Code != http.StatusNotFound {
		t.Errorf("状态码 = %d，期望 404", rec.Code)
	}
}

// TestWebDAVOptions 覆盖 OPTIONS。
func TestWebDAVOptions(t *testing.T) {
	svc, _ := newWebDAVFixture(t)
	ctx, rec := davCtx(http.MethodOptions, "/books/", 1, "")

	svc.Serve(ctx)
	if rec.Code != http.StatusOK {
		t.Errorf("状态码 = %d，期望 200", rec.Code)
	}
	if rec.Header().Get("DAV") == "" {
		t.Error("缺少 DAV 头")
	}
}

// TestWebDAVPutAndGet 覆盖同步目录写入与读取。
func TestWebDAVPutAndGet(t *testing.T) {
	svc, _ := newWebDAVFixture(t)

	putCtx, putRec := davCtx(http.MethodPut, "/books/我的同步/note.txt", 1, "hello dav")
	svc.Serve(putCtx)
	if putRec.Code != http.StatusCreated {
		t.Fatalf("PUT 状态码 = %d，期望 201", putRec.Code)
	}

	getCtx, getRec := davCtx(http.MethodGet, "/books/我的同步/note.txt", 1, "")
	svc.Serve(getCtx)
	if getRec.Code != http.StatusOK {
		t.Fatalf("GET 状态码 = %d，期望 200", getRec.Code)
	}
	if getRec.Body.String() != "hello dav" {
		t.Errorf("内容 = %q，期望 hello dav", getRec.Body.String())
	}
}

// TestWebDAVPutRequiresLogin 覆盖未登录写入被拒。
func TestWebDAVPutRequiresLogin(t *testing.T) {
	svc, _ := newWebDAVFixture(t)
	ctx, rec := davCtx(http.MethodPut, "/books/我的同步/x.txt", 0, "x")

	svc.Serve(ctx)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("状态码 = %d，期望 401", rec.Code)
	}
}

// TestWebDAVPutReadOnlySection 覆盖只读区写入被拒。
func TestWebDAVPutReadOnlySection(t *testing.T) {
	svc, _ := newWebDAVFixture(t)
	ctx, rec := davCtx(http.MethodPut, "/books/分类/x.txt", 1, "x")

	svc.Serve(ctx)
	if rec.Code != http.StatusForbidden {
		t.Errorf("状态码 = %d，期望 403", rec.Code)
	}
}

// TestWebDAVPutPathTraversal 覆盖路径穿越防护。
func TestWebDAVPutPathTraversal(t *testing.T) {
	svc, root := newWebDAVFixture(t)
	ctx, rec := davCtx(http.MethodPut, "/books/我的同步/../../evil.txt", 1, "x")

	svc.Serve(ctx)
	// 穿越路径应被拒或规范化到安全位置，绝不能写到 root 之外。
	outside := filepath.Join(filepath.Dir(root), "evil.txt")
	if _, err := os.Stat(outside); err == nil {
		t.Fatal("路径穿越写出了 root 之外的文件")
	}
	if rec.Code == http.StatusCreated {
		// 若被规范化到 root 内则允许，但必须仍在 root 内。
		inside := filepath.Join(root, "webdav", "1", "evil.txt")
		if _, err := os.Stat(inside); err != nil {
			t.Errorf("规范化后文件不在预期位置: %v", err)
		}
	}
}

// TestWebDAVMkcol 覆盖目录创建。
func TestWebDAVMkcol(t *testing.T) {
	svc, _ := newWebDAVFixture(t)
	ctx, rec := davCtx("MKCOL", "/books/我的同步/sub", 1, "")

	svc.Serve(ctx)
	if rec.Code != http.StatusCreated {
		t.Fatalf("状态码 = %d，期望 201", rec.Code)
	}
}

// TestWebDAVDelete 覆盖删除。
func TestWebDAVDelete(t *testing.T) {
	svc, _ := newWebDAVFixture(t)

	putCtx, _ := davCtx(http.MethodPut, "/books/我的同步/del.txt", 1, "x")
	svc.Serve(putCtx)

	delCtx, delRec := davCtx(http.MethodDelete, "/books/我的同步/del.txt", 1, "")
	svc.Serve(delCtx)
	if delRec.Code != http.StatusNoContent {
		t.Errorf("状态码 = %d，期望 204", delRec.Code)
	}
}

// TestWebDAVDeleteRequiresLogin 覆盖未登录删除被拒。
func TestWebDAVDeleteRequiresLogin(t *testing.T) {
	svc, _ := newWebDAVFixture(t)
	ctx, rec := davCtx(http.MethodDelete, "/books/我的同步/x.txt", 0, "")

	svc.Serve(ctx)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("状态码 = %d，期望 401", rec.Code)
	}
}

// TestWebDAVUnsupportedMethod 覆盖不支持的方法。
func TestWebDAVUnsupportedMethod(t *testing.T) {
	svc, _ := newWebDAVFixture(t)
	ctx, rec := davCtx("LOCK", "/books/", 1, "")

	svc.Serve(ctx)
	if rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("状态码 = %d，期望 405", rec.Code)
	}
}

// TestParseBookFilename 覆盖文件名解析。
func TestParseBookFilename(t *testing.T) {
	id, format := parseBookFilename("42-三体.epub")
	if id != 42 || format != "epub" {
		t.Errorf("解析结果 = (%d, %q)，期望 (42, epub)", id, format)
	}
}

// TestParseBookFilenameInvalid 覆盖非法文件名。
func TestParseBookFilenameInvalid(t *testing.T) {
	for _, name := range []string{"noext", "-1.epub", "abc.epub"} {
		if id, _ := parseBookFilename(name); id != 0 {
			t.Errorf("parseBookFilename(%q) = %d，期望 0", name, id)
		}
	}
}

// TestSanitizeDAVName 覆盖文件名清理。
func TestSanitizeDAVName(t *testing.T) {
	if got := sanitizeDAVName("a/b\\c"); got != "a_b_c" {
		t.Errorf("sanitizeDAVName = %q，期望 a_b_c", got)
	}
	long := strings.Repeat("x", 200)
	if got := sanitizeDAVName(long); len(got) != 80 {
		t.Errorf("超长名未截断: %d", len(got))
	}
}

// TestIsWithinPath 覆盖路径包含性判定。
func TestIsWithinPath(t *testing.T) {
	root := t.TempDir()
	if !isWithinPath(filepath.Join(root, "a", "b"), root) {
		t.Error("子路径应判定为在内")
	}
	if isWithinPath(filepath.Join(root, "..", "outside"), root) {
		t.Error("上级路径应判定为在外")
	}
}

// TestContainsString 覆盖切片包含判定。
func TestContainsString(t *testing.T) {
	if !containsString([]string{"a", "b"}, "b") {
		t.Error("应包含 b")
	}
	if containsString([]string{"a"}, "z") {
		t.Error("不应包含 z")
	}
}

// TestLimitIDs 覆盖 id 截断。
func TestLimitIDs(t *testing.T) {
	ids := []int64{1, 2, 3, 4, 5}
	if got := limitIDs(ids, 3); len(got) != 3 {
		t.Errorf("截断后长度 = %d，期望 3", len(got))
	}
	if got := limitIDs(ids, 10); len(got) != 5 {
		t.Errorf("未超限时长度 = %d，期望 5", len(got))
	}
}

// TestDecodeDAVPath 覆盖路径解码。
func TestDecodeDAVPath(t *testing.T) {
	if got := decodeDAVPath("/a%20b"); got != "/a b" {
		t.Errorf("decodeDAVPath = %q，期望 /a b", got)
	}
	if got := decodeDAVPath("/plain"); got != "/plain" {
		t.Errorf("decodeDAVPath = %q，期望 /plain", got)
	}
}

// TestNewWebDAVServeFuncNonNil 覆盖导出构造函数。
func TestNewWebDAVServeFuncNonNil(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	if fn := NewWebDAVServeFunc(db, db, map[string]any{}, t.TempDir()); fn == nil {
		t.Error("NewWebDAVServeFunc 返回 nil")
	}
}

// TestWebDAVSyncMembers 覆盖同步目录列举。
func TestWebDAVSyncMembers(t *testing.T) {
	svc, root := newWebDAVFixture(t)
	dir := filepath.Join(root, "webdav", "1")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "a.txt"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}

	ctx, rec := davCtx("PROPFIND", "/books/我的同步/", 1, "")
	svc.Serve(ctx)
	if rec.Code != 207 {
		t.Fatalf("状态码 = %d，期望 207", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "a.txt") {
		t.Errorf("响应缺少 a.txt: %s", rec.Body.String())
	}
}
