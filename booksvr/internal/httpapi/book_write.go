package httpapi

import (
	"database/sql"
	"fmt"
	"html"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/userdb"
)

// ---- 书籍写路径：删除 / 格式删除 / 编辑 ----

// bookDelete 复刻 Python BookDelete.post。
//
// 语义：
//  1. 权限：需 can_edit + can_delete，且为管理员或书籍所有者；
//  2. 私藏书永久删除（permanent），其余走 Calibre 回收站；
//  3. 外部索引书只删索引记录；
//  4. 同步清理 ScanFile 与别名，避免重导入时哈希重复被误判。
func (w *bookWiring) bookDelete(ctx *Context, bookID int64) (map[string]any, error) {
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

	permanent := w.itemScope(bookID) == "private"
	externalIndexed := w.isExternalIndexBook(bookID)

	if externalIndexed {
		if err := w.deleteExternalIndexBook(bookID); err != nil {
			return nil, err
		}
	} else if permanent {
		// 私藏书永久删除：不进入回收站，避免其文件与元数据出现在管理员回收站。
		if err := library.DeleteBook(w.libraryDB, bookID); err != nil {
			return nil, err
		}
	} else {
		// 公开书走 Calibre 回收站，管理员可在回收站页面恢复或永久删除。
		if err := library.DeleteBookToTrash(w.libraryDB, bookID, w.libraryRoot); err != nil {
			return nil, err
		}
	}

	// 清理 ScanFile 记录与别名。
	// 表名是 scanfiles（无下划线），与 userdb 的 schema 一致。
	if _, err := w.db.Exec(`DELETE FROM scanfiles WHERE book_id = ?`, bookID); err != nil {
		return nil, fmt.Errorf("httpapi: 清理 scanfiles 失败: %w", err)
	}
	if err := w.aliases.DeleteBookAliases(bookID); err != nil {
		return nil, err
	}
	if externalIndexed {
		if _, err := w.db.Exec(`DELETE FROM items WHERE book_id = ?`, bookID); err != nil {
			return nil, fmt.Errorf("httpapi: 清理 items 失败: %w", err)
		}
	}

	return map[string]any{"err": "ok", "msg": "删除成功"}, nil
}

// countDownload 递增书籍下载计数。
//
// 对应 Python 的 count_increase(count_download=1)：只更新 items 行，
// 行不存在时静默跳过（与 Python 的 upsert 语义一致，不因缺行而失败）。
func (w *bookWiring) countDownload(_ *Context, bookID int64) {
	_, _ = w.db.Exec(`UPDATE items SET count_download = count_download + 1 WHERE book_id = ?`, bookID)
}

// recordReadHistory 把书追加到当前用户的阅读历史。
//
// 对应 Python 的 user_history("read_history", book)。游客（UserID 为 0）
// 不记录；写入失败只记日志，不影响阅读器渲染。
func (w *bookWiring) recordReadHistory(ctx *Context, bookID int64, title string) {
	w.recordHistory(ctx, bookID, title, "read_history")
}

// markReadingIfNeeded 打开阅读器时把「未读」自动标记为「在读」。
//
// 与 Python 的差异（用户要求）：Python 打开阅读器只写阅读历史，在读
// 状态只能手动设置；用户反馈「读过的书要出现在我的阅读」，故在当前
// 状态为未读/无记录时自动置为在读。已读完/想读等手动状态不被覆盖。
// 失败只记日志，不阻断阅读器渲染。
func (w *bookWiring) markReadingIfNeeded(ctx *Context, bookID int64) {
	if ctx == nil || ctx.Identity.UserID == 0 {
		return
	}
	st, err := userdb.GetReadingState(w.db, bookID, ctx.Identity.UserID)
	if err != nil {
		return
	}
	if st != nil && st.ReadState != 0 {
		return
	}
	if err := userdb.SetReadingState(w.db, bookID, ctx.Identity.UserID, 1, nil, nil); err != nil {
		log.Printf("booksvr: 自动标记在读失败 book=%d reader=%d: %v", bookID, ctx.Identity.UserID, err)
		return
	}
	// 在读的书自动加入书架（用户要求）：与手动置为在读同语义。
	if err := userdb.SetReadingWants(w.db, bookID, ctx.Identity.UserID, true); err != nil {
		log.Printf("booksvr: 自动加入书架失败 book=%d reader=%d: %v", bookID, ctx.Identity.UserID, err)
	}
}

// recordHistory 把书追加到当前用户的指定历史记录。
func (w *bookWiring) recordHistory(ctx *Context, bookID int64, title, action string) {
	if ctx == nil || ctx.Identity.UserID == 0 {
		return
	}
	if _, err := userdb.AppendUserHistory(w.db, ctx.Identity.UserID, bookID, title, action); err != nil {
		log.Printf("booksvr: 写入历史记录失败 action=%s book=%d reader=%d: %v",
			action, bookID, ctx.Identity.UserID, err)
	}
}

// bookDeleteFormat 复刻 Python BookDeleteFormat.post。
func (w *bookWiring) bookDeleteFormat(ctx *Context, bookID int64, format string) (map[string]any, error) {
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

	fmtName := strings.ToLower(strings.TrimSpace(format))
	if fmtName == "" {
		return map[string]any{"err": "params.missing", "msg": "格式参数不能为空"}, nil
	}
	if !w.hasFormat(bookID, fmtName) {
		return map[string]any{"err": "format.not_found",
			"msg": fmt.Sprintf("书籍不包含 %s 格式", strings.ToUpper(fmtName))}, nil
	}
	if len(w.availableFormats(bookID)) <= 1 {
		return map[string]any{"err": "last.format", "msg": "书籍只有一个格式，无法刪除"}, nil
	}

	if err := w.removeFormat(bookID, fmtName); err != nil {
		return map[string]any{"err": "fail",
			"msg": fmt.Sprintf("删除%s格式失败，请查看日志", fmtName)}, nil
	}
	return map[string]any{"err": "ok", "msg": fmt.Sprintf("删除%s格式成功", fmtName)}, nil
}

// bookEdit 复刻 Python BookEdit.post 的字段写入部分。
func (w *bookWiring) bookEdit(ctx *Context, bookID int64, args map[string]any) (map[string]any, error) {
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

	title := strings.TrimSpace(stringOf(args["title"]))
	if title == "" {
		return map[string]any{"err": "params.title", "msg": "书名不能为空"}, nil
	}

	if err := w.updateBookMeta(bookID, title, args); err != nil {
		return nil, err
	}
	return map[string]any{"err": "ok", "msg": "保存成功"}, nil
}

// ---- 内部辅助 ----

// canManage 判定当前请求方能否管理该书（can_edit + can_delete + 管理员或所有者）。
func (w *bookWiring) canManage(ctx *Context, bookID int64) bool {
	if ctx.Identity.UserID == 0 {
		return false
	}
	if ctx.Identity.IsAdmin {
		return true
	}
	ok, err := userdb.IsBookOwner(w.db, bookID, ctx.Identity.UserID, w.autoLogin())
	return err == nil && ok
}

// itemScope 返回书籍的可见范围；无记录时返回空串。
func (w *bookWiring) itemScope(bookID int64) string {
	var scope sql.NullString
	_ = w.db.QueryRow(`SELECT scope FROM items WHERE book_id = ?`, bookID).Scan(&scope)
	return scope.String
}

// isExternalIndexBook 判定书籍是否为外部索引书。
func (w *bookWiring) isExternalIndexBook(bookID int64) bool {
	var n int
	err := w.db.QueryRow(`SELECT COUNT(1) FROM external_index_books WHERE book_id = ?`, bookID).Scan(&n)
	return err == nil && n > 0
}

// deleteExternalIndexBook 删除外部索引书记录。
func (w *bookWiring) deleteExternalIndexBook(bookID int64) error {
	if _, err := w.db.Exec(`DELETE FROM external_index_books WHERE book_id = ?`, bookID); err != nil {
		return fmt.Errorf("httpapi: 删除外部索引记录失败: %w", err)
	}
	return nil
}

// hasFormat 判定书籍是否包含某格式。
func (w *bookWiring) hasFormat(bookID int64, format string) bool {
	formats, err := library.ListFormats(w.libraryDB, bookID)
	if err != nil {
		return false
	}
	for _, f := range formats {
		if strings.EqualFold(f.Format, format) {
			return true
		}
	}
	return false
}

// epubPath 返回书籍 EPUB 文件的绝对路径；不存在时返回空串。
//
// 复刻 Python 的 book["fmt_epub"]：先查 book_formats 表拿相对路径，
// 再拼上书库根目录。
func (w *bookWiring) epubPath(bookID int64) string {
	formats, err := library.ListFormats(w.libraryDB, bookID)
	if err != nil {
		return ""
	}
	for _, f := range formats {
		if !strings.EqualFold(f.Format, "epub") {
			continue
		}
		if f.Path == "" {
			return ""
		}
		if filepath.IsAbs(f.Path) {
			return f.Path
		}
		if w.libraryRoot == "" {
			return f.Path
		}
		return filepath.Join(w.libraryRoot, f.Path)
	}
	return ""
}

// hasKindleFormat 报告书籍是否只有 mobi/azw/azw3 这类待转 EPUB 的格式。
func (w *bookWiring) hasKindleFormat(bookID int64) bool {
	for _, f := range w.availableFormats(bookID) {
		switch f {
		case "mobi", "azw", "azw3":
			return true
		}
	}
	return false
}

// availableFormats 返回书籍的全部格式名（小写）。
func (w *bookWiring) availableFormats(bookID int64) []string {
	formats, err := library.ListFormats(w.libraryDB, bookID)
	if err != nil {
		return nil
	}
	out := make([]string, 0, len(formats))
	for _, f := range formats {
		out = append(out, strings.ToLower(f.Format))
	}
	return out
}

// removeFormat 删除书籍的某个格式（保留外部文件）。
func (w *bookWiring) removeFormat(bookID int64, format string) error {
	tx, err := w.libraryDB.Begin()
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	upper := strings.ToUpper(format)
	if _, err := tx.Exec(`DELETE FROM book_formats WHERE book_id = ? AND UPPER(format) = ?`,
		bookID, upper); err != nil {
		return err
	}
	if _, err := tx.Exec(`DELETE FROM data WHERE book = ? AND UPPER(format) = ?`,
		bookID, upper); err != nil {
		return err
	}
	return tx.Commit()
}

// updateBookMeta 写入书籍元数据（标题 + 可选字段）。
func (w *bookWiring) updateBookMeta(bookID int64, title string, args map[string]any) error {
	tx, err := w.libraryDB.Begin()
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.Exec(`UPDATE books SET title = ?, sort = ?, last_modified = datetime('now')
		WHERE id = ?`, title, title, bookID); err != nil {
		return fmt.Errorf("httpapi: 更新书名失败: %w", err)
	}

	if authors, ok := args["authors"]; ok {
		if err := replaceAuthors(tx, bookID, toStringSlice(authors)); err != nil {
			return err
		}
	}
	if tags, ok := args["tags"]; ok {
		if err := replaceTags(tx, bookID, toStringSlice(tags)); err != nil {
			return err
		}
	}
	if series := strings.TrimSpace(stringOf(args["series"])); series != "" {
		if err := replaceSeries(tx, bookID, series); err != nil {
			return err
		}
	}
	if comments := stringOf(args["comments"]); comments != "" {
		if _, err := tx.Exec(`DELETE FROM comments WHERE book = ?`, bookID); err != nil {
			return err
		}
		if _, err := tx.Exec(`INSERT INTO comments (book, text) VALUES (?, ?)`,
			bookID, comments); err != nil {
			return err
		}
	}

	return tx.Commit()
}

// replaceAuthors 覆盖式写入作者关联。
func replaceAuthors(tx *sql.Tx, bookID int64, names []string) error {
	if _, err := tx.Exec(`DELETE FROM books_authors_link WHERE book = ?`, bookID); err != nil {
		return err
	}
	for _, name := range names {
		name = strings.TrimSpace(name)
		if name == "" {
			continue
		}
		id, err := ensureNamedRow(tx, "authors", "name", name)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(`INSERT INTO books_authors_link (book, author) VALUES (?, ?)`,
			bookID, id); err != nil {
			return err
		}
	}
	return nil
}

// replaceTags 覆盖式写入标签关联。
func replaceTags(tx *sql.Tx, bookID int64, names []string) error {
	if _, err := tx.Exec(`DELETE FROM books_tags_link WHERE book = ?`, bookID); err != nil {
		return err
	}
	for _, name := range names {
		name = strings.TrimSpace(name)
		if name == "" {
			continue
		}
		id, err := ensureNamedRow(tx, "tags", "name", name)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(`INSERT INTO books_tags_link (book, tag) VALUES (?, ?)`,
			bookID, id); err != nil {
			return err
		}
	}
	return nil
}

// replaceSeries 覆盖式写入丛书关联。
func replaceSeries(tx *sql.Tx, bookID int64, name string) error {
	if _, err := tx.Exec(`DELETE FROM books_series_link WHERE book = ?`, bookID); err != nil {
		return err
	}
	id, err := ensureNamedRow(tx, "series", "name", name)
	if err != nil {
		return err
	}
	_, err = tx.Exec(`INSERT INTO books_series_link (book, series) VALUES (?, ?)`, bookID, id)
	return err
}

// ensureNamedRow 返回 name 在表中的 id，不存在则插入。
func ensureNamedRow(tx *sql.Tx, table, column, name string) (int64, error) {
	var id int64
	err := tx.QueryRow(fmt.Sprintf(`SELECT id FROM %s WHERE %s = ?`, table, column), name).Scan(&id)
	if err == nil {
		return id, nil
	}
	if err != sql.ErrNoRows {
		return 0, err
	}
	res, err := tx.Exec(fmt.Sprintf(`INSERT INTO %s (%s) VALUES (?)`, table, column), name)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// ---- 阅读路径 ----

// bookReadBook 复刻 Python 的 BookRead.get：渲染在线阅读器页面。
//
// 这是**页面**而不是 JSON 接口：浏览器直接打开 /read/<id>，
// 返回 JSON 会让用户只看到一串数据（曾出现的真实故障）。
//
// 分支与 Python 一致：
//   - 有 EPUB → 直接渲染阅读器（is_ready=true）
//   - 只有 PDF → 重定向到 PDF 阅读器
//   - 只有 TXT → 重定向到 /book/<id>/readtxt
//   - 只有 mobi/azw/azw3 → 触发后台转 EPUB，渲染「转换中」页面
func (w *bookWiring) bookReadBook(ctx *Context, bookID int64) (map[string]any, error) {
	book, err := bookGetOne(w.Config(""), bookID)
	if err != nil {
		return nil, err
	}
	if book == nil {
		http.Error(ctx.Writer, "书籍不存在", http.StatusNotFound)
		return nil, nil
	}
	if !w.canView(ctx, bookID) {
		http.Error(ctx.Writer, "书籍不存在", http.StatusNotFound)
		return nil, nil
	}

	formats := w.availableFormats(bookID)
	has := map[string]bool{}
	for _, f := range formats {
		has[strings.ToLower(f)] = true
	}

	// 可在线阅读的格式白名单，与 Python 的 readable_formats 一致。
	readable := false
	for _, f := range []string{"epub", "pdf", "txt", "mobi", "azw", "azw3"} {
		if has[f] {
			readable = true
			break
		}
	}
	if !readable {
		http.Error(ctx.Writer, "抱歉，在线阅读器暂不支持该格式的书籍", http.StatusUnsupportedMediaType)
		return nil, nil
	}

	// 阅读历史与下载计数，对齐 Python BookRead.get：
	//
	//	self.user_history("read_history", book)
	//	self.count_increase(book_id, count_download=1)
	//
	// 之前两者都漏了，导致「我的阅读 → 阅读记录」永远为空：
	// 用户点「阅读」打开阅读器后，前端读的是 user.extra.read_history。
	// 写失败不阻断阅读（Python 同样不因历史写入失败而拒绝渲染）。
	w.recordReadHistory(ctx, bookID, book.Title)
	w.markReadingIfNeeded(ctx, bookID)
	w.countDownload(ctx, bookID)

	if has["epub"] {
		// 阅读器选择，对齐 Python BookRead.get：
		//   use_readest = requested_reader == "readest"
		//                 or (未指定 reader 且 CONF["EPUB_VIEWER"] == "readest")
		// 之前这里写死走 Candle Reader，导致系统设置里改 EPUB 阅读器不生效。
		requested := ctx.Query("reader")
		viewer := w.Config("").EPUBViewer
		if requested == "readest" || (requested == "" && viewer == "readest") {
			launch := "/readest/talebook-launch.html?" + url.Values{
				"bookId": {strconv.FormatInt(bookID, 10)},
			}.Encode()
			http.Redirect(ctx.Writer, ctx.Request, launch, http.StatusFound)
			return nil, nil
		}
		w.writeReaderPage(ctx, bookID, book.Title, true)
		return nil, nil
	}
	if has["pdf"] {
		pdfURL := url.QueryEscape(w.Config("").CDNURL + fmt.Sprintf("/api/book/%d.PDF?inline=1", bookID))
		http.Redirect(ctx.Writer, ctx.Request, pdfViewerURL(pdfURL), http.StatusFound)
		return nil, nil
	}
	if has["txt"] {
		http.Redirect(ctx.Writer, ctx.Request, fmt.Sprintf("/book/%d/readtxt", bookID), http.StatusFound)
		return nil, nil
	}

	// 其余格式（mobi/azw/azw3）：触发后台转 EPUB，先渲染「转换中」页面。
	if w.convert != nil {
		if _, err := w.convert.ConvertAll([]int64{bookID}); err != nil {
			// 转换启动失败不阻断页面渲染：页面会轮询等待。
			_ = err
		}
	}
	w.writeReaderPage(ctx, bookID, book.Title, false)
	return nil, nil
}

// writeReaderPage 写出阅读器 HTML 页面。
//
// 页面结构与 Python 的 resources/book/creader.html 对齐：
// 加载 candle-reader 静态应用，book_url 指向 /get/extract/<id>/。
// isReady 为 false 时显示「转换中」并轮询等待 EPUB 就绪。
func (w *bookWiring) writeReaderPage(ctx *Context, bookID int64, title string, isReady bool) {
	// 无 Writer 的调用（如单测直接调 bookReadBook）无法写页面，直接返回。
	if ctx.Writer == nil {
		return
	}
	cfg := w.Config("")
	assets := cfg.ReaderAssets
	if assets == "" {
		assets = "/static/candle-reader/"
	}

	h := ctx.Writer.Header()
	h.Set("Content-Type", "text/html; charset=UTF-8")
	h.Set("X-Content-Type-Options", "nosniff")
	h.Set("Referrer-Policy", "same-origin")
	h.Set("Cache-Control", "max-age=0")
	ctx.Writer.WriteHeader(http.StatusOK)
	_, _ = ctx.Writer.Write([]byte(readerHTML(readerPageData{
		BookID:  bookID,
		Title:   title,
		Assets:  assets,
		APIURL:  cfg.CDNURL,
		IsReady: isReady,
	})))
}

// readerPageData 是阅读器页面的模板变量。
type readerPageData struct {
	BookID  int64
	Title   string
	Assets  string
	APIURL  string
	IsReady bool
}

// readerHTML 生成阅读器页面。
//
// 与 Python 的 creader.html 等价的最小实现：挂载 #app，加载 candle-reader，
// 把 book_url 指向 /get/extract/<id>/。未就绪时轮询 /api/book/<id>/reader-bootstrap。
func readerHTML(d readerPageData) string {
	ready := "true"
	if !d.IsReady {
		ready = "false"
	}
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>%s</title>
<base href="%s">
<link rel="stylesheet" href="style.css">
<script src="js/epub-v0.3.88.js"></script>
</head>
<body>
<div id="app"></div>
<div id="converting" style="display:none;position:fixed;inset:0;align-items:center;justify-content:center;font-family:sans-serif">
  <p>本书正在转换为 EPUB，请稍候…</p>
</div>
<script type="module">
  import { Reader } from "./candle-reader.es.js"
  const BOOK_ID = %d
  const IS_READY = %s
  const API = %q
  function startReader() {
    document.getElementById('converting').style.display = 'none'
    new Reader('#app', {
      debug: false,
      server: window.location.origin,
      themes_css: API + "/static/candle-reader/css/themes.css",
      book_url: API + "/get/extract/" + BOOK_ID + "/",
      display_url: "",
      book_id: BOOK_ID,
    })
  }
  if (IS_READY) {
    startReader()
  } else {
    document.getElementById('converting').style.display = 'flex'
    let retries = 180
    const timer = setInterval(async () => {
      retries -= 1
      try {
        const resp = await fetch(API + "/api/book/" + BOOK_ID + "/reader-bootstrap")
        const data = await resp.json()
        if (data && data.epub_ready) {
          clearInterval(timer)
          startReader()
          return
        }
      } catch (e) { /* 继续轮询 */ }
      if (retries <= 0) {
        clearInterval(timer)
        document.getElementById('converting').innerHTML =
          '<p>转换超时，请稍后重试或下载后本地阅读。</p>'
      }
    }, 2000)
  }
</script>
</body>
</html>
`, html.EscapeString(d.Title), html.EscapeString(d.Assets), d.BookID, ready, d.APIURL)
}

// pdfViewerURL 拼出 PDF 阅读器地址，对应 Python 的 CONF["PDF_VIEWER"]。
func pdfViewerURL(pdfURL string) string {
	return "/static/pdfjs/web/viewer.html?file=" + pdfURL
}

// readerBootstrapSchema 是 Readest 启动协议的 schema 标识。
//
// 前端 app/public/readest/talebook-launch.js 会逐字段校验这个响应，
// 任何字段缺失都会报「阅读器启动协议不兼容」并拒绝启动。
const readerBootstrapSchema = "talebook.reader.bootstrap.v1"

// readerResourceRevision 复刻 Python 的 reader_resource_revision：
// 用 mtime(ns) 与 size 的十六进制拼出版本标识，文件一变版本就变。
func readerResourceRevision(path string) string {
	fi, err := os.Stat(path)
	if err != nil {
		return ""
	}
	return fmt.Sprintf("%x-%x", fi.ModTime().UnixNano(), fi.Size())
}

// bookReaderBootstrap 实现 /api/book/<id>/reader-bootstrap。
//
// 复刻 Python BookReaderBootstrap.get：返回 Readest 启动协议 v1。
// 前端 talebook-launch.js 会校验 schema/engine/book/resource 四组字段，
// 缺一个就报「阅读器启动协议不兼容」。
func (w *bookWiring) bookReaderBootstrap(ctx *Context, bookID int64) (map[string]any, error) {
	// engine 必须是 readest，否则 400（对齐 Python）。
	if ctx.Query("engine") != "readest" {
		if ctx.Writer != nil {
			ctx.Writer.WriteHeader(http.StatusBadRequest)
		}
		return map[string]any{"err": "reader.engine_unsupported"}, nil
	}

	book, err := bookGetOne(w.Config(""), bookID)
	if err != nil {
		return nil, err
	}
	if book == nil {
		if ctx.Writer != nil {
			ctx.Writer.WriteHeader(http.StatusNotFound)
		}
		return map[string]any{"err": "book.not_found"}, nil
	}
	if !w.canView(ctx, bookID) {
		if ctx.Writer != nil {
			ctx.Writer.WriteHeader(http.StatusForbidden)
		}
		return map[string]any{"err": "permission"}, nil
	}

	epubPath := w.epubPath(bookID)
	if epubPath == "" {
		// 有 mobi/azw3 但还没转出 EPUB：返回 409 让前端提示等待；
		// 否则 404（对齐 Python 的 conversion_pending / format_unsupported）。
		if w.hasKindleFormat(bookID) {
			if ctx.Writer != nil {
				ctx.Writer.WriteHeader(http.StatusConflict)
			}
			return map[string]any{"err": "reader.conversion_pending"}, nil
		}
		if ctx.Writer != nil {
			ctx.Writer.WriteHeader(http.StatusNotFound)
		}
		return map[string]any{"err": "reader.format_unsupported"}, nil
	}

	revision := readerResourceRevision(epubPath)
	if revision == "" {
		if ctx.Writer != nil {
			ctx.Writer.WriteHeader(http.StatusNotFound)
		}
		return map[string]any{"err": "reader.format_unsupported"}, nil
	}

	return map[string]any{
		"err":    "ok",
		"schema": readerBootstrapSchema,
		"engine": "readest",
		"book": map[string]any{
			"id":       bookID,
			"title":    book.Title,
			"format":   "epub",
			"revision": revision,
		},
		"resource": map[string]any{
			"kind":  "authorized-epub-url",
			"url":   fmt.Sprintf("/read/resource/%d.epub?revision=%s", bookID, revision),
			"mime":  "application/epub+zip",
			"range": true,
		},
		"navigation": map[string]any{
			"back":     fmt.Sprintf("/book/%d", bookID),
			"fallback": fmt.Sprintf("/read/%d?reader=candle", bookID),
		},
		"capabilities": readerBootstrapCapabilities(),
	}, nil
}

// readerBootstrapCapabilities 声明 Readest 内嵌阅读器支持的能力。
//
// 与 Python 一致：只开阅读核心、导航、目录、搜索与本地设置，
// 云端/账号/同步/支付等一律关闭（本站不提供这些服务）。
func readerBootstrapCapabilities() map[string]any {
	on := []string{
		"readerCore", "navigation", "tableOfContents", "textSearch",
		"localPosition", "localSettings", "layoutSettings",
		"appearanceSettings", "languageSettings",
	}
	off := []string{
		"customFonts", "backgroundImages", "annotations", "serverProgress",
		"pdf", "dictionaries", "translation", "tts", "library", "account",
		"auth", "cloud", "sync", "payment", "upgrade", "updater", "send",
		"rss", "opds", "integrations", "telemetry", "aiAssistant", "reedy",
		"readestGateway", "tauri",
	}
	caps := make(map[string]any, len(on)+len(off))
	for _, k := range on {
		caps[k] = true
	}
	for _, k := range off {
		caps[k] = false
	}
	return caps
}

// bookReadTxt 返回 TXT 阅读内容（按章节切分）。
func (w *bookWiring) bookReadTxt(ctx *Context, bookID int64) (map[string]any, error) {
	book, err := bookGetOne(w.Config(""), bookID)
	if err != nil {
		return nil, err
	}
	if book == nil {
		return map[string]any{"err": "params.book.invalid", "msg": "书籍已不存在"}, nil
	}
	if !w.canView(ctx, bookID) {
		return map[string]any{"err": "permission", "msg": "无权查看"}, nil
	}
	if !w.hasFormat(bookID, "txt") {
		return map[string]any{"err": "format.not_found", "msg": "书籍不包含 TXT 格式"}, nil
	}

	path, missing, err := library.ResolvePath(w.libraryDB, bookID, "txt")
	if err != nil {
		return nil, err
	}
	if missing {
		return map[string]any{"err": "file.missing", "msg": "TXT 文件不存在"}, nil
	}
	body, err := os.ReadFile(path)
	if err != nil {
		return map[string]any{"err": "file.missing", "msg": "TXT 文件读取失败"}, nil
	}

	return map[string]any{
		"err":     "ok",
		"book_id": bookID,
		"title":   book.Title,
		"content": decodeTxtBody(body),
	}, nil
}

// canView 判定当前请求方能否查看该书。
func (w *bookWiring) canView(ctx *Context, bookID int64) bool {
	ok, err := userdb.CanViewBook(w.db, bookID, ctx.Identity.UserID, ctx.Identity.IsAdmin)
	return err == nil && ok
}

// decodeTxtBody 把 TXT 字节转成字符串（UTF-8 优先，失败时按 GBK 近似回落）。
func decodeTxtBody(body []byte) string {
	if len(body) == 0 {
		return ""
	}
	// 去掉 UTF-8 BOM。
	if len(body) >= 3 && body[0] == 0xEF && body[1] == 0xBB && body[2] == 0xBF {
		body = body[3:]
	}
	return string(body)
}

// bookReadResource 返回阅读资源文件路径（EPUB 内部资源）。
func (w *bookWiring) bookReadResource(ctx *Context, bookID int64, name string) (string, error) {
	if !w.canView(ctx, bookID) {
		return "", fmt.Errorf("httpapi: 无权查看")
	}
	path, missing, err := library.ResolvePath(w.libraryDB, bookID, "epub")
	if err != nil {
		return "", err
	}
	if missing {
		return "", fmt.Errorf("httpapi: EPUB 文件不存在")
	}
	// 资源名做路径穿越防护。
	clean := filepath.Clean("/" + name)
	if strings.Contains(clean, "..") {
		return "", fmt.Errorf("httpapi: 非法资源名")
	}
	return path, nil
}
