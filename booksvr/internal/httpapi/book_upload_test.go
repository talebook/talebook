package httpapi

import (
	"os"
	"path/filepath"
	"testing"
)

// newUploadFixture 建一个带上传目录的夹具。
func newUploadFixture(t *testing.T) (*bookWiring, string) {
	t.Helper()
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	createFormatTables(t, db)
	dir := t.TempDir()
	w := newBookWiring(db, db, map[string]any{
		"upload_path":        dir,
		"ALLOW_GUEST_UPLOAD": true,
	}, nil)
	return w, dir
}

// uploadCtx 返回一个可上传的上下文。
func uploadCtx(userID int64) *Context {
	return &Context{Identity: Identity{UserID: userID, IsAdmin: true}}
}

// TestBookUploadWritesFile 覆盖普通上传落盘。
func TestBookUploadWritesFile(t *testing.T) {
	w, dir := newUploadFixture(t)

	resp, err := w.bookUpload(uploadCtx(1), map[string]any{
		"filename": "book.epub",
		"content":  "PK\x03\x04fake-epub-body",
	})
	if err != nil {
		t.Fatalf("上传失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", resp["err"])
	}

	path := filepath.Join(dir, "book.epub")
	if _, err := os.Stat(path); err != nil {
		t.Fatalf("文件未落盘: %v", err)
	}
}

// TestBookUploadRejectsBadMagic 覆盖魔数校验。
func TestBookUploadRejectsBadMagic(t *testing.T) {
	w, _ := newUploadFixture(t)

	resp, err := w.bookUpload(uploadCtx(1), map[string]any{
		"filename": "book.epub",
		"content":  "not-an-epub",
	})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "params.format" {
		t.Errorf("err = %v，期望 params.format", resp["err"])
	}
}

// TestBookUploadRejectsUnsupportedFormat 覆盖格式白名单。
func TestBookUploadRejectsUnsupportedFormat(t *testing.T) {
	w, _ := newUploadFixture(t)

	resp, err := w.bookUpload(uploadCtx(1), map[string]any{
		"filename": "book.exe",
		"content":  "MZ",
	})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "params.format" {
		t.Errorf("err = %v，期望 params.format", resp["err"])
	}
}

// TestBookUploadRejectsPathTraversal 覆盖路径穿越防护。
func TestBookUploadRejectsPathTraversal(t *testing.T) {
	w, _ := newUploadFixture(t)

	resp, err := w.bookUpload(uploadCtx(1), map[string]any{
		"filename": "../../etc/passwd.epub",
		"content":  "PK\x03\x04x",
	})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	// filepath.Base 会剥掉路径，最终落到 upload 目录内的 passwd.epub。
	if resp["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok（Base 剥离后安全）", resp["err"])
	}
	if name, _ := resp["name"].(string); name != "passwd.epub" {
		t.Errorf("name = %q，期望 passwd.epub", name)
	}
}

// TestBookUploadMissingFile 覆盖缺少文件参数。
func TestBookUploadMissingFile(t *testing.T) {
	w, _ := newUploadFixture(t)

	resp, err := w.bookUpload(uploadCtx(1), map[string]any{})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "params.ebook" {
		t.Errorf("err = %v，期望 params.ebook", resp["err"])
	}
}

// TestBookUploadGuestDenied 覆盖游客上传被拒。
func TestBookUploadGuestDenied(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	w := newBookWiring(db, db, map[string]any{"upload_path": t.TempDir()}, nil)

	resp, err := w.bookUpload(&Context{Identity: Identity{UserID: 0}}, map[string]any{
		"filename": "book.epub",
		"content":  "PK\x03\x04x",
	})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "user.need_login" {
		t.Errorf("err = %v，期望 user.need_login", resp["err"])
	}
}

// TestBookUploadChunkWritesPart 覆盖分片落盘。
func TestBookUploadChunkWritesPart(t *testing.T) {
	w, dir := newUploadFixture(t)

	resp, err := w.bookUploadChunk(uploadCtx(1), map[string]any{
		"upload_id":    "abc123",
		"chunk_index":  0,
		"total_chunks": 2,
		"content":      "PK\x03\x04part0",
	})
	if err != nil {
		t.Fatalf("分片上传失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", resp["err"])
	}

	part := filepath.Join(dir, "chunks", "1", "abc123", "0.part")
	if _, err := os.Stat(part); err != nil {
		t.Fatalf("分片未落盘: %v", err)
	}
}

// TestBookUploadChunkRejectsBadUploadID 覆盖非法 upload_id。
func TestBookUploadChunkRejectsBadUploadID(t *testing.T) {
	w, _ := newUploadFixture(t)

	resp, err := w.bookUploadChunk(uploadCtx(1), map[string]any{
		"upload_id":    "../evil",
		"chunk_index":  0,
		"total_chunks": 1,
		"content":      "x",
	})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "params.upload_id" {
		t.Errorf("err = %v，期望 params.upload_id", resp["err"])
	}
}

// TestBookUploadChunkRejectsBadIndex 覆盖分片序号越界。
func TestBookUploadChunkRejectsBadIndex(t *testing.T) {
	w, _ := newUploadFixture(t)

	resp, err := w.bookUploadChunk(uploadCtx(1), map[string]any{
		"upload_id":    "abc123",
		"chunk_index":  5,
		"total_chunks": 2,
		"content":      "x",
	})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "params.chunk" {
		t.Errorf("err = %v，期望 params.chunk", resp["err"])
	}
}

// TestBookUploadCompleteMergesChunks 覆盖分片合并。
func TestBookUploadCompleteMergesChunks(t *testing.T) {
	w, dir := newUploadFixture(t)

	// 先传两个分片。
	for i, body := range []string{"PK\x03\x04part0-", "part1"} {
		if _, err := w.bookUploadChunk(uploadCtx(1), map[string]any{
			"upload_id":    "merge1",
			"chunk_index":  i,
			"total_chunks": 2,
			"content":      body,
		}); err != nil {
			t.Fatalf("分片 %d 失败: %v", i, err)
		}
	}

	resp, err := w.bookUploadComplete(uploadCtx(1), map[string]any{
		"upload_id":    "merge1",
		"filename":     "merged.epub",
		"total_chunks": 2,
	})
	if err != nil {
		t.Fatalf("合并失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", resp["err"])
	}

	body, err := os.ReadFile(filepath.Join(dir, "merged.epub"))
	if err != nil {
		t.Fatalf("合并文件不存在: %v", err)
	}
	if string(body) != "PK\x03\x04part0-part1" {
		t.Errorf("合并内容 = %q", string(body))
	}
}

// TestBookUploadCompleteMissingChunk 覆盖缺分片。
func TestBookUploadCompleteMissingChunk(t *testing.T) {
	w, _ := newUploadFixture(t)

	resp, err := w.bookUploadComplete(uploadCtx(1), map[string]any{
		"upload_id":    "missing1",
		"filename":     "x.epub",
		"total_chunks": 2,
	})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "params.chunk" {
		t.Errorf("err = %v，期望 params.chunk", resp["err"])
	}
}

// TestBookTxtInitReturnsTitle 覆盖 TXT 初始化。
func TestBookTxtInitReturnsTitle(t *testing.T) {
	w, _ := newUploadFixture(t)

	resp, err := w.bookTxtInit(uploadCtx(1), map[string]any{
		"filename": "我的书.txt",
		"content":  "正文内容",
	})
	if err != nil {
		t.Fatalf("初始化失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", resp["err"])
	}
	if resp["title"] != "我的书" {
		t.Errorf("title = %v，期望 我的书", resp["title"])
	}
}

// TestBookTxtInitRejectsNonTxt 覆盖非 TXT 被拒。
func TestBookTxtInitRejectsNonTxt(t *testing.T) {
	w, _ := newUploadFixture(t)

	resp, err := w.bookTxtInit(uploadCtx(1), map[string]any{"filename": "a.epub"})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "params.format" {
		t.Errorf("err = %v，期望 params.format", resp["err"])
	}
}

// TestDetectTxtEncoding 覆盖编码判定。
func TestDetectTxtEncoding(t *testing.T) {
	if got := detectTxtEncoding("中文内容"); got != "utf-8" {
		t.Errorf("detectTxtEncoding = %q，期望 utf-8", got)
	}
	if got := detectTxtEncoding(""); got != "utf-8" {
		t.Errorf("detectTxtEncoding(空) = %q，期望 utf-8", got)
	}
}

// TestNewUploadIDUnique 覆盖上传标识生成。
func TestNewUploadIDUnique(t *testing.T) {
	a, b := newUploadID(), newUploadID()
	if a == "" || b == "" {
		t.Fatal("uploadID 为空")
	}
	if a == b {
		t.Error("两次生成的 uploadID 相同")
	}
	if !uploadIDRe.MatchString(a) {
		t.Errorf("uploadID %q 不符合格式", a)
	}
}

// TestHasPrefixBytes 覆盖前缀判定。
func TestHasPrefixBytes(t *testing.T) {
	if !hasPrefixBytes([]byte("PK\x03\x04x"), []byte("PK\x03\x04")) {
		t.Error("应匹配前缀")
	}
	if hasPrefixBytes([]byte("PK"), []byte("PK\x03\x04")) {
		t.Error("短串不应匹配")
	}
}

// TestCanUploadPermission 覆盖上传权限位。
func TestCanUploadPermission(t *testing.T) {
	db := netSchemaDB(t)
	bookSeedReader(t, db, 1, "u1")
	if _, err := db.Exec(`UPDATE readers SET permission = 'u' WHERE id = 1`); err != nil {
		t.Fatal(err)
	}
	ctx := &Context{DB: db, Identity: Identity{UserID: 1}}
	if !ctx.CanUpload() {
		t.Error("permission='u' 应可上传")
	}

	if _, err := db.Exec(`UPDATE readers SET permission = 'U' WHERE id = 1`); err != nil {
		t.Fatal(err)
	}
	if ctx.CanUpload() {
		t.Error("permission='U' 应拒绝上传")
	}
}
