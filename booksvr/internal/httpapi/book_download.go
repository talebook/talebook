package httpapi

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"talebook/booksvr/internal/sourcefile"

	"talebook/booksvr/internal/library"
)

// 本文件实现 /api/book/<id>.<fmt> 的书籍文件下载。
//
// 对应 Python 的 BookDownload（webserver/handlers/book.py:1063）。
// 该路由此前被错误地绑定到 BookDetailHandler，导致 /api/book/1.MOBI
// 返回书籍详情 JSON 而不是文件，前端「下载 / 在线阅读」全部失效。

// BookDownloadHandler 实现 /api/book/<id>.<fmt>。
//
// 与其它 JSON 接口不同，本接口直接写文件流，因此返回 (nil, nil) 表示
// 响应已由 handler 自行写出。
func BookDownloadHandler(cfg BookConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		raw := ctx.Param(0)
		bookID, format, err := parseBookDownloadPath(raw)
		if err != nil {
			return nil, notFound(ctx, "格式无法下载")
		}

		if cfg.LibraryDB == nil {
			return nil, notFound(ctx, "书库不可用")
		}
		if !cfg.CanViewBook(ctx, bookID) {
			return nil, notFound(ctx, "书籍不存在")
		}

		path, missing, err := library.ResolvePath(cfg.LibraryDB, bookID, format)
		if err != nil || missing || path == "" {
			return nil, notFound(ctx, fmt.Sprintf("%s格式无法下载", strings.ToLower(format)))
		}
		path, release, err := sourcefile.Acquire(sourceContext(ctx), path)
		if err != nil {
			return nil, err
		}
		defer release()
		info, err := os.Stat(path)
		if err != nil || info.IsDir() {
			return nil, notFound(ctx, "格式文件不存在")
		}

		title := ""
		if cfg.BookTitle != nil {
			title = cfg.BookTitle(bookID)
		}

		// 下载历史与计数，对齐 Python BookDownload.get：
		//
		//	self.user_history("download_history", book)
		//	self.count_increase(book_id, count_download=1)
		if cfg.RecordHistory != nil {
			cfg.RecordHistory(ctx, bookID, title, "download_history")
		}
		if cfg.CountDownload != nil {
			cfg.CountDownload(ctx, bookID)
		}
		writeBookFile(ctx, path, bookID, title, format, info.Size())
		return nil, nil
	}
}

// sanitizeDownloadName 清掉文件名里不能出现的字符。
//
// 路径分隔符、控制字符与 Windows 保留字符全部替换为下划线，
// 避免 Content-Disposition 被注入或客户端无法保存。
func sanitizeDownloadName(name string) string {
	var b strings.Builder
	for _, r := range name {
		switch {
		case r < 32:
			b.WriteByte('_')
		case strings.ContainsRune(`/\:*?"<>|`, r):
			b.WriteByte('_')
		default:
			b.WriteRune(r)
		}
	}
	out := strings.TrimSpace(b.String())
	out = strings.TrimRight(out, ". ")
	if out == "" {
		return "book"
	}
	return out
}

// asciiFallbackName 给 filename= 参数生成纯 ASCII 兜底名。
//
// 非 ASCII 字符替换为下划线；扩展名保留，便于客户端识别类型。
func asciiFallbackName(name string) string {
	ext := filepath.Ext(name)
	base := strings.TrimSuffix(name, ext)
	var b strings.Builder
	for _, r := range base {
		if r < 128 && r != '"' && r != '\\' {
			b.WriteRune(r)
			continue
		}
		b.WriteByte('_')
	}
	out := strings.TrimSpace(b.String())
	if out == "" {
		out = "book"
	}
	return out + ext
}

// parseBookDownloadPath 把 "1.MOBI" 拆成 (1, "MOBI")。
//
// 格式名可能含点（如 "1.epub"），因此只按第一个点切分。
func parseBookDownloadPath(raw string) (int64, string, error) {
	idx := strings.Index(raw, ".")
	if idx <= 0 || idx == len(raw)-1 {
		return 0, "", fmt.Errorf("bad download path %q", raw)
	}
	bookID, err := strconv.ParseInt(raw[:idx], 10, 64)
	if err != nil {
		return 0, "", err
	}
	return bookID, strings.ToUpper(raw[idx+1:]), nil
}

// writeBookFile 以附件形式写出书籍文件。
//
// 文件名沿用 Python 的 "%(id)d-%(title)s.%(fmt)s" 约定，
// 同时给出 filename* 以正确传递中文名。
func writeBookFile(ctx *Context, path string, bookID int64, title, format string, size int64) {
	ext := strings.ToLower(format)
	ct := contentTypeByExt("x." + ext)
	if ext == "pdf" {
		ct = "application/pdf"
	}

	// 文件名用原始书名，不加 id 前缀、不做 quote_plus（后者会把空格变成 '+'）。
	// 非 ASCII 名通过 RFC 5987 的 filename* 传递，同时给一个 ASCII 兜底
	// filename，兼容不认 filename* 的老客户端。
	name := strings.TrimSpace(title)
	if name == "" {
		name = fmt.Sprintf("book-%d", bookID)
	}
	name = sanitizeDownloadName(name)
	fname := name + "." + ext

	disp := fmt.Sprintf(`attachment; filename="%s"; filename*=UTF-8''%s`,
		asciiFallbackName(fname), url.PathEscape(fname))

	h := ctx.Writer.Header()
	h.Set("Content-Type", ct)
	h.Set("Content-Disposition", disp)
	h.Set("Content-Length", strconv.FormatInt(size, 10))

	f, err := os.Open(filepath.Clean(path))
	if err != nil {
		http.Error(ctx.Writer, "not found", http.StatusNotFound)
		return
	}
	defer func() { _ = f.Close() }()
	_, _ = io.Copy(ctx.Writer, f)
}
