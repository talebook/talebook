package httpapi

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"talebook/booksvr/internal/importdir"
)

// ---- 上传：普通上传 / 分片上传 / 完成 ----

// uploadIDRe 复刻 Python UPLOAD_ID_RE。
var uploadIDRe = regexp.MustCompile(`^[a-zA-Z0-9_-]{1,64}$`)

// uploadFilenameRe 复刻 Python UPLOAD_FILENAME_RE。
var uploadFilenameRe = regexp.MustCompile(`^[^\\/\x00]{1,255}$`)

// ebookMagic 复刻 Python BookUploadBase.EBOOK_MAGIC。
var ebookMagic = map[string][]byte{
	"epub": []byte("PK\x03\x04"),
	"pdf":  []byte("%PDF"),
	"cbz":  []byte("PK\x03\x04"),
	"zip":  []byte("PK\x03\x04"),
	"cbr":  []byte("Rar!\x1a\x07"),
	"rar":  []byte("Rar!\x1a\x07"),
}

// uploadDir 返回上传目录（CONF 的 upload_path，回落 scan_upload_path）。
func (w *bookWiring) uploadDir() string {
	if p := stringOf(w.settings["upload_path"]); p != "" {
		return p
	}
	return stringOf(w.settings["scan_upload_path"])
}

// checkUploadPermission 复刻 check_upload_permission。
func (w *bookWiring) checkUploadPermission(ctx *Context) map[string]any {
	if ctx.Identity.UserID == 0 {
		if !settingBool(w.settings, "ALLOW_GUEST_UPLOAD", false) {
			return map[string]any{"err": "user.need_login", "msg": "请先登录"}
		}
		return nil
	}
	if !ctx.CanUpload() {
		return map[string]any{"err": "permission", "msg": "无权操作"}
	}
	return nil
}

// resolveUploadPath 复刻 resolve_upload_path：拒绝不安全文件名并做包含性校验。
func (w *bookWiring) resolveUploadPath(name string) string {
	if name == "" || name == "." || name == ".." || strings.ContainsRune(name, 0) {
		return ""
	}
	if strings.ContainsAny(name, `/\`) {
		return ""
	}
	uploadDir := filepath.Clean(w.uploadDir())
	if uploadDir == "" || uploadDir == "." {
		return ""
	}
	safeName := filepath.Base(name)
	if safeName == "" || safeName == "." || safeName == ".." || !uploadFilenameRe.MatchString(safeName) {
		return ""
	}
	fpath := filepath.Join(uploadDir, safeName)
	if !importdir.IsWithin(fpath, uploadDir) {
		return ""
	}
	return fpath
}

// bookUpload 复刻 Python BookUpload.post。
func (w *bookWiring) bookUpload(ctx *Context, args map[string]any) (map[string]any, error) {
	if resp := w.checkUploadPermission(ctx); resp != nil {
		return resp, nil
	}

	name := stringOf(args["filename"])
	data := stringOf(args["content"])
	if name == "" || data == "" {
		return map[string]any{"err": "params.ebook", "msg": "请选择要上传的文件"}, nil
	}

	name = filepath.Base(name)
	ext := strings.TrimPrefix(filepath.Ext(name), ".")
	if ext == "" {
		return map[string]any{"err": "params.filename", "msg": "文件名不合法"}, nil
	}
	format := strings.ToLower(ext)

	if !supportedEbookFormat(format) {
		return map[string]any{"err": "params.format",
			"msg": fmt.Sprintf("不支持的文件格式: %s", format)}, nil
	}
	if magic, ok := ebookMagic[format]; ok && !strings.HasPrefix(data, string(magic)) {
		return map[string]any{"err": "params.format", "msg": "文件内容与格式不匹配"}, nil
	}

	fpath := w.resolveUploadPath(name)
	if fpath == "" {
		return map[string]any{"err": "params.filename", "msg": "文件名不合法"}, nil
	}
	if err := os.MkdirAll(filepath.Dir(fpath), 0o755); err != nil {
		return nil, fmt.Errorf("httpapi: 创建上传目录失败: %w", err)
	}
	if err := os.WriteFile(fpath, []byte(data), 0o644); err != nil {
		return nil, fmt.Errorf("httpapi: 写入上传文件失败: %w", err)
	}

	return map[string]any{
		"err":    "ok",
		"msg":    "上传成功",
		"path":   fpath,
		"format": format,
		"name":   name,
	}, nil
}

// chunkDir 返回某次分片上传的目录；upload_id 非法时返回空串。
func (w *bookWiring) chunkDir(ctx *Context, uploadID string) string {
	if !uploadIDRe.MatchString(uploadID) {
		return ""
	}
	root := filepath.Join(w.uploadDir(), "chunks")
	owner := "guest"
	if ctx.Identity.UserID != 0 {
		owner = strconv.FormatInt(ctx.Identity.UserID, 10)
	}
	dir := filepath.Join(root, owner, uploadID)
	if !importdir.IsWithin(dir, root) {
		return ""
	}
	return dir
}

// bookUploadChunk 复刻 Python BookUploadChunk.post：落盘单个分片。
func (w *bookWiring) bookUploadChunk(ctx *Context, args map[string]any) (map[string]any, error) {
	if resp := w.checkUploadPermission(ctx); resp != nil {
		return resp, nil
	}

	uploadID := stringOf(args["upload_id"])
	dir := w.chunkDir(ctx, uploadID)
	if dir == "" {
		return map[string]any{"err": "params.upload_id", "msg": "上传标识不合法"}, nil
	}

	index := int64Of(args["chunk_index"])
	total := int64Of(args["total_chunks"])
	if total <= 0 || index < 0 || index >= total {
		return map[string]any{"err": "params.chunk", "msg": "分片参数错误"}, nil
	}

	content := stringOf(args["content"])
	if content == "" {
		return map[string]any{"err": "params.chunk", "msg": "分片内容为空"}, nil
	}

	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("httpapi: 创建分片目录失败: %w", err)
	}
	partPath := filepath.Join(dir, fmt.Sprintf("%d.part", index))
	if !importdir.IsWithin(partPath, dir) {
		return map[string]any{"err": "params.chunk", "msg": "分片参数错误"}, nil
	}
	if err := os.WriteFile(partPath, []byte(content), 0o644); err != nil {
		return nil, fmt.Errorf("httpapi: 写入分片失败: %w", err)
	}

	return map[string]any{
		"err":         "ok",
		"msg":         "分片上传成功",
		"chunk_index": index,
		"received":    index + 1,
		"total":       total,
	}, nil
}

// bookUploadComplete 复刻 Python BookUploadComplete.post：合并分片并入库。
func (w *bookWiring) bookUploadComplete(ctx *Context, args map[string]any) (map[string]any, error) {
	if resp := w.checkUploadPermission(ctx); resp != nil {
		return resp, nil
	}

	uploadID := stringOf(args["upload_id"])
	dir := w.chunkDir(ctx, uploadID)
	if dir == "" {
		return map[string]any{"err": "params.upload_id", "msg": "上传标识不合法"}, nil
	}

	name := stringOf(args["filename"])
	if name == "" {
		return map[string]any{"err": "params.filename", "msg": "文件名不合法"}, nil
	}
	name = filepath.Base(name)
	ext := strings.TrimPrefix(filepath.Ext(name), ".")
	if ext == "" {
		return map[string]any{"err": "params.filename", "msg": "文件名不合法"}, nil
	}
	format := strings.ToLower(ext)
	if !supportedEbookFormat(format) {
		return map[string]any{"err": "params.format",
			"msg": fmt.Sprintf("不支持的文件格式: %s", format)}, nil
	}

	total := int64Of(args["total_chunks"])
	if total <= 0 {
		return map[string]any{"err": "params.chunk", "msg": "分片参数错误"}, nil
	}

	// 按序合并分片。
	var buf []byte
	for i := int64(0); i < total; i++ {
		partPath := filepath.Join(dir, fmt.Sprintf("%d.part", i))
		part, err := os.ReadFile(partPath)
		if err != nil {
			return map[string]any{"err": "params.chunk",
				"msg": fmt.Sprintf("缺少分片 %d", i)}, nil
		}
		buf = append(buf, part...)
	}

	if magic, ok := ebookMagic[format]; ok && !hasPrefixBytes(buf, magic) {
		return map[string]any{"err": "params.format", "msg": "文件内容与格式不匹配"}, nil
	}

	fpath := w.resolveUploadPath(name)
	if fpath == "" {
		return map[string]any{"err": "params.filename", "msg": "文件名不合法"}, nil
	}
	if err := os.MkdirAll(filepath.Dir(fpath), 0o755); err != nil {
		return nil, fmt.Errorf("httpapi: 创建上传目录失败: %w", err)
	}
	if err := os.WriteFile(fpath, buf, 0o644); err != nil {
		return nil, fmt.Errorf("httpapi: 写入上传文件失败: %w", err)
	}
	_ = os.RemoveAll(dir)

	return map[string]any{
		"err":    "ok",
		"msg":    "上传成功",
		"path":   fpath,
		"format": format,
		"name":   name,
		"size":   len(buf),
	}, nil
}

// bookTxtInit 复刻 Python BookTxtInit：为 TXT 上传准备阅读元数据。
func (w *bookWiring) bookTxtInit(ctx *Context, args map[string]any) (map[string]any, error) {
	if raw, ok := args["id"]; ok {
		id, err := strconv.ParseInt(stringOf(raw), 10, 64)
		if err != nil {
			return map[string]any{"err": "params.book.invalid", "msg": "书籍已不存在"}, nil
		}
		result, err := w.bookReadTxt(ctx, id)
		if err != nil || result["err"] != "ok" {
			return result, err
		}
		text, _ := result["raw_text"].(string)
		return map[string]any{"err": "ok", "msg": "已解析", "data": map[string]any{"name": result["title"], "encoding": "utf-8", "content": txtChapters(text)}}, nil
	}
	if resp := w.checkUploadPermission(ctx); resp != nil {
		return resp, nil
	}

	name := stringOf(args["filename"])
	if name == "" {
		return map[string]any{"err": "params.filename", "msg": "文件名不合法"}, nil
	}
	name = filepath.Base(name)
	if strings.ToLower(filepath.Ext(name)) != ".txt" {
		return map[string]any{"err": "params.format", "msg": "仅支持 TXT 格式"}, nil
	}

	title := strings.TrimSuffix(name, filepath.Ext(name))
	return map[string]any{
		"err":      "ok",
		"msg":      "初始化成功",
		"filename": name,
		"title":    title,
		"encoding": detectTxtEncoding(stringOf(args["content"])),
	}, nil
}

// ---- 内部辅助 ----

// uploadEbookFormats 复刻 Python constants.SUPPORTED_EBOOK_FORMATS。
var uploadEbookFormats = []string{
	"azw3", "epub", "mobi", "pdf", "txt", "azw", "cbz", "zip", "cbr", "rar",
}

// supportedEbookFormat 判定格式是否在上传白名单内。
func supportedEbookFormat(format string) bool {
	for _, f := range uploadEbookFormats {
		if f == format {
			return true
		}
	}
	return false
}

// hasPrefixBytes 判定 buf 是否以 prefix 开头。
func hasPrefixBytes(buf, prefix []byte) bool {
	if len(buf) < len(prefix) {
		return false
	}
	for i := range prefix {
		if buf[i] != prefix[i] {
			return false
		}
	}
	return true
}

// detectTxtEncoding 粗略判定 TXT 编码（UTF-8 优先，否则回落 GBK）。
func detectTxtEncoding(content string) string {
	if content == "" {
		return "utf-8"
	}
	if isValidUTF8(content) {
		return "utf-8"
	}
	return "gbk"
}

// isValidUTF8 判定字符串是否为合法 UTF-8。
func isValidUTF8(s string) bool {
	for _, r := range s {
		if r == '\uFFFD' {
			return false
		}
	}
	return true
}

// newUploadID 生成一个随机的上传标识。
func newUploadID() string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return strconv.FormatInt(time.Now().UnixNano(), 36)
	}
	return hex.EncodeToString(buf)
}
