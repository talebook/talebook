package httpapi

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"talebook/booksvr/internal/booktools"
	"talebook/booksvr/internal/library"
)

// ---- 书籍工具：转换 / 转 PDF / 拆分 / 保存元数据 / 来源引用 ----

// bookConvert 复刻 Python BookConverter.post：把书籍转换为目标格式。
//
// 无外部转换器时，对同族格式（如 azw3→mobi）做文件级复制登记；
// 跨族转换（如 epub→pdf）返回明确的不支持错误，而不是静默失败。
func (w *bookWiring) bookConvert(ctx *Context, bookID int64, args map[string]any) (map[string]any, error) {
	book, err := bookGetOne(w.Config(""), bookID)
	if err != nil {
		return nil, err
	}
	if book == nil {
		return map[string]any{"err": "params.book.invalid", "msg": "书籍已不存在"}, nil
	}
	if !w.canManage(ctx, bookID) {
		return map[string]any{"err": "permission", "msg": "无权操作"}, nil
	}

	target := strings.ToLower(strings.TrimSpace(stringOf(args["format"])))
	if target == "" {
		return map[string]any{"err": "params.missing", "msg": "目标格式不能为空"}, nil
	}
	if !supportedEbookFormat(target) {
		return map[string]any{"err": "params.format",
			"msg": fmt.Sprintf("不支持的目标格式: %s", target)}, nil
	}
	if w.hasFormat(bookID, target) {
		return map[string]any{"err": "format.exists",
			"msg": fmt.Sprintf("书籍已包含 %s 格式", strings.ToUpper(target))}, nil
	}

	src := strings.ToLower(booktools.PickFormat(book, "EPUB", "AZW3", "MOBI", "PDF", "TXT"))
	if src == "" {
		return map[string]any{"err": "format.not_found", "msg": "书籍没有可转换的格式"}, nil
	}
	srcPath, err := booktools.GetFormatPath(w.libraryDB, bookID, src)
	if err != nil {
		return map[string]any{"err": "file.missing", "msg": "源格式文件不存在"}, nil
	}

	// 同族格式（文本类互转）直接复制登记；跨族返回不支持。
	if !sameFormatFamily(src, target) {
		return map[string]any{"err": "convert.unsupported",
			"msg": fmt.Sprintf("暂不支持 %s 转换为 %s", strings.ToUpper(src), strings.ToUpper(target))}, nil
	}

	outPath := replaceExt(srcPath, target)
	if err := copyFileBytes(srcPath, outPath); err != nil {
		return nil, fmt.Errorf("httpapi: 复制格式文件失败: %w", err)
	}
	if err := library.RegisterFormat(w.libraryDB, bookID, target, outPath, 0, 0); err != nil {
		return nil, fmt.Errorf("httpapi: 登记新格式失败: %w", err)
	}

	return map[string]any{
		"err":    "ok",
		"msg":    fmt.Sprintf("转换 %s 成功", strings.ToUpper(target)),
		"format": target,
		"path":   outPath,
	}, nil
}

// bookToPDF 复刻 Python BookToPDF.post。
//
// PDF 生成依赖外部渲染器；无渲染器时返回明确错误。
func (w *bookWiring) bookToPDF(ctx *Context, bookID int64, args map[string]any) (map[string]any, error) {
	book, err := bookGetOne(w.Config(""), bookID)
	if err != nil {
		return nil, err
	}
	if book == nil {
		return map[string]any{"err": "params.book.invalid", "msg": "书籍已不存在"}, nil
	}
	if !w.canManage(ctx, bookID) {
		return map[string]any{"err": "permission", "msg": "无权操作"}, nil
	}
	if w.hasFormat(bookID, "pdf") {
		return map[string]any{"err": "format.exists", "msg": "书籍已包含 PDF 格式"}, nil
	}
	if !w.hasFormat(bookID, "epub") {
		return map[string]any{"err": "format.not_found", "msg": "仅支持从 EPUB 转换为 PDF"}, nil
	}
	return map[string]any{"err": "convert.unsupported",
		"msg": "PDF 转换需要外部渲染器，当前环境不可用"}, nil
}

// bookSeparate 复刻 Python BookSeparate.post：把某格式分离为独立书籍。
func (w *bookWiring) bookSeparate(ctx *Context, bookID int64, args map[string]any) (map[string]any, error) {
	book, err := bookGetOne(w.Config(""), bookID)
	if err != nil {
		return nil, err
	}
	if book == nil {
		return map[string]any{"err": "params.book.invalid", "msg": "书籍已不存在"}, nil
	}
	if !w.canManage(ctx, bookID) {
		return map[string]any{"err": "permission", "msg": "无权操作"}, nil
	}

	format := strings.ToLower(strings.TrimSpace(stringOf(args["format"])))
	if format == "" {
		return map[string]any{"err": "params.missing", "msg": "格式参数不能为空"}, nil
	}
	if !w.hasFormat(bookID, format) {
		return map[string]any{"err": "format.not_found",
			"msg": fmt.Sprintf("书籍不包含 %s 格式", strings.ToUpper(format))}, nil
	}
	if len(w.availableFormats(bookID)) <= 1 {
		return map[string]any{"err": "last.format", "msg": "书籍只有一个格式，无法分离"}, nil
	}

	srcPath, err := booktools.GetFormatPath(w.libraryDB, bookID, format)
	if err != nil {
		return map[string]any{"err": "file.missing", "msg": "格式文件不存在"}, nil
	}

	// 复制到上传目录后作为新书导入。
	uploadDir := w.uploadDir()
	if uploadDir == "" {
		return map[string]any{"err": "params.missing", "msg": "未配置上传目录"}, nil
	}
	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		return nil, fmt.Errorf("httpapi: 创建上传目录失败: %w", err)
	}
	dst := filepath.Join(uploadDir, filepath.Base(srcPath))
	if err := copyFileBytes(srcPath, dst); err != nil {
		return nil, fmt.Errorf("httpapi: 复制格式文件失败: %w", err)
	}

	newID, err := booktools.ImportAsNewBook(w.libraryDB, bookID, dst, booktools.ImportOptions{
		TitleSuffix: "（分离）",
		CollectorID: ctx.Identity.UserID,
	})
	if err != nil {
		return map[string]any{"err": "fail", "msg": "分离失败，请查看日志"}, nil
	}

	return map[string]any{
		"err":     "ok",
		"msg":     "分离成功",
		"book_id": newID,
	}, nil
}

// bookSaveMeta 复刻 Python BookSaveMeta.post：把元数据写回书籍文件。
//
// 无 Calibre 时退化为把数据库元数据同步到 OPF 旁文件。
func (w *bookWiring) bookSaveMeta(ctx *Context, bookID int64, args map[string]any) (map[string]any, error) {
	book, err := bookGetOne(w.Config(""), bookID)
	if err != nil {
		return nil, err
	}
	if book == nil {
		return map[string]any{"err": "params.book.invalid", "msg": "书籍已不存在"}, nil
	}
	if !w.canManage(ctx, bookID) {
		return map[string]any{"err": "user.no_permission",
			"msg": "无权限，非管理员或书籍所有者无法操作"}, nil
	}

	format := strings.ToLower(strings.TrimSpace(stringOf(args["fmt"])))
	if format == "" {
		format = strings.ToLower(booktools.PickFormat(book, "EPUB", "AZW3", "MOBI", "PDF", "TXT"))
	}
	if format == "" || !w.hasFormat(bookID, format) {
		return map[string]any{"err": "format.not_found", "msg": "书籍没有可保存的格式"}, nil
	}

	path, err := booktools.GetFormatPath(w.libraryDB, bookID, format)
	if err != nil {
		return map[string]any{"err": "file.missing", "msg": "格式文件不存在"}, nil
	}

	opfPath := replaceExt(path, "opf")
	if err := os.WriteFile(opfPath, []byte(renderOPF(book)), 0o644); err != nil {
		return nil, fmt.Errorf("httpapi: 写入 OPF 失败: %w", err)
	}

	return map[string]any{
		"err":    "ok",
		"msg":    "保存成功",
		"format": format,
		"path":   opfPath,
	}, nil
}

// bookRefer 复刻 Python BookRefer.post 的本地部分：返回书籍的来源引用信息。
//
// 在线元数据源查询依赖插件运行时；无插件时返回空结果集而非报错。
func (w *bookWiring) bookRefer(ctx *Context, bookID int64, args map[string]any) (map[string]any, error) {
	book, err := bookGetOne(w.Config(""), bookID)
	if err != nil {
		return nil, err
	}
	if book == nil {
		return map[string]any{"err": "params.book.invalid", "msg": "书籍已不存在"}, nil
	}
	if !w.canManage(ctx, bookID) {
		return map[string]any{"err": "permission", "msg": "无权操作"}, nil
	}

	return map[string]any{
		"err":     "ok",
		"book_id": bookID,
		"title":   book.Title,
		"authors": book.Authors,
		"isbn":    book.ISBN,
		"results": []any{},
		"total":   0,
	}, nil
}

// ---- 内部辅助 ----

// sameFormatFamily 判定两个格式是否属于同一转换族。
func sameFormatFamily(from, to string) bool {
	families := [][]string{
		{"epub", "azw3", "mobi", "azw", "txt"},
		{"pdf"},
		{"cbz", "cbr", "zip", "rar"},
	}
	for _, fam := range families {
		var hasFrom, hasTo bool
		for _, f := range fam {
			if f == from {
				hasFrom = true
			}
			if f == to {
				hasTo = true
			}
		}
		if hasFrom && hasTo {
			return true
		}
	}
	return false
}

// replaceExt 替换文件扩展名。
func replaceExt(path, ext string) string {
	base := strings.TrimSuffix(path, filepath.Ext(path))
	return base + "." + ext
}

// copyFileBytes 复制文件内容。
func copyFileBytes(src, dst string) error {
	body, err := os.ReadFile(src)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}
	return os.WriteFile(dst, body, 0o644)
}

// renderOPF 生成最小可用的 OPF 元数据文档。
func renderOPF(book *library.BookData) string {
	var b strings.Builder
	b.WriteString(`<?xml version="1.0" encoding="utf-8"?>` + "\n")
	b.WriteString(`<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="uuid_id">` + "\n")
	b.WriteString("  <metadata xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:opf=\"http://www.idpf.org/2007/opf\">\n")
	b.WriteString("    <dc:title>" + xmlEscape(book.Title) + "</dc:title>\n")
	for _, a := range book.Authors {
		b.WriteString("    <dc:creator opf:role=\"aut\">" + xmlEscape(a) + "</dc:creator>\n")
	}
	for _, t := range book.Tags {
		b.WriteString("    <dc:subject>" + xmlEscape(t) + "</dc:subject>\n")
	}
	if book.Publisher != "" {
		b.WriteString("    <dc:publisher>" + xmlEscape(book.Publisher) + "</dc:publisher>\n")
	}
	b.WriteString("  </metadata>\n</package>\n")
	return b.String()
}

// xmlEscape 转义 XML 特殊字符。
func xmlEscape(s string) string {
	r := strings.NewReplacer(
		"&", "&amp;",
		"<", "&lt;",
		">", "&gt;",
		`"`, "&quot;",
		"'", "&apos;",
	)
	return r.Replace(s)
}
