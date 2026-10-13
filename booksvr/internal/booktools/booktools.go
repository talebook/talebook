// 本文件实现 webserver/services/booktools.py 的书籍编排层。
//
// 内置文本工具（正文查找替换 / 繁简转换 / TXT 编码修复 / EPUB 美化）与
// Calibre 书库交互：定位格式文件、写回原书格式、以新书身份入库。
//
// 纯处理核心位于各 tool 插件；本包只负责书库侧的文件与元数据编排。
package booktools

import (
	"crypto/rand"
	"database/sql"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"talebook/booksvr/internal/library"
)

// ToolFormats 是支持「写回原书」的格式集合（大写）。
//
// 工具只处理这两种纯文本容器。
var ToolFormats = []string{"TXT", "EPUB"}

// Error 是内置文本工具的业务错误（消息已面向用户）。
type Error struct {
	Message string
}

// Error 实现 error。
func (e *Error) Error() string { return e.Message }

// NewError 构造一个业务错误。
func NewError(format string, args ...any) *Error {
	return &Error{Message: fmt.Sprintf(format, args...)}
}

// ResolveBook 读取书籍数据；不存在时返回错误。
func ResolveBook(db *sql.DB, bookID int64) (*library.BookData, error) {
	books, err := library.GetBooksData(db, []int64{bookID})
	if err != nil {
		return nil, err
	}
	if len(books) == 0 {
		return nil, NewError("书籍不存在：ID=%d", bookID)
	}
	return &books[0], nil
}

// AvailableFormats 返回书籍可用格式列表（统一大写）。
func AvailableFormats(book *library.BookData) []string {
	out := make([]string, 0, len(book.Formats))
	for _, f := range book.Formats {
		out = append(out, strings.ToUpper(f))
	}
	return out
}

// PickFormat 按优先级挑选可处理的格式；无可用格式返回空串。
func PickFormat(book *library.BookData, candidates ...string) string {
	if len(candidates) == 0 {
		candidates = []string{"EPUB", "TXT"}
	}
	available := map[string]bool{}
	for _, f := range AvailableFormats(book) {
		available[f] = true
	}
	for _, candidate := range candidates {
		if available[strings.ToUpper(candidate)] {
			return strings.ToUpper(candidate)
		}
	}
	return ""
}

// GetFormatPath 返回指定格式文件的绝对路径；缺失 / 不可读时返回错误。
func GetFormatPath(db *sql.DB, bookID int64, format string) (string, error) {
	format = strings.ToUpper(format)
	path, missing, err := library.ResolvePath(db, bookID, format)
	if err != nil {
		return "", NewError("找不到 %s 文件，可能已被移除", format)
	}
	if missing || path == "" {
		return "", NewError("找不到 %s 文件，可能已被移除", format)
	}
	info, err := os.Stat(path)
	if err != nil {
		return "", NewError("找不到 %s 文件，可能已被移除", format)
	}
	if !info.Mode().IsRegular() {
		// 目录 / 特殊设备等非普通文件：给出明确提示而非底层堆栈。
		return "", NewError("%s 文件路径异常（不是普通文件），可能已被破坏", format)
	}
	// 提前验证可读性（权限 / 独占锁定 / 已删除句柄等），转成友好错误。
	handle, err := os.Open(path)
	if err != nil {
		return "", NewError("无法读取 %s 文件：%v", format, err)
	}
	defer handle.Close()
	if _, err := handle.Read(make([]byte, 1)); err != nil && err != io.EOF {
		return "", NewError("无法读取 %s 文件：%v", format, err)
	}
	return path, nil
}

// OverwriteFormat 用处理后文件替换原书的指定格式；可选备份原文件。
//
// 备份保存在 backupDir（调用方提供持久目录），避免随临时目录清理误删。
// 返回备份路径（未备份时为空串）。
func OverwriteFormat(db *sql.DB, bookID int64, format, outPath, backupDir string) (string, error) {
	backupPath := ""
	if backupDir != "" {
		src, missing, err := library.ResolvePath(db, bookID, format)
		if err == nil && !missing && src != "" {
			if _, statErr := os.Stat(src); statErr == nil {
				if err := os.MkdirAll(backupDir, 0o755); err != nil {
					return "", err
				}
				backupPath = filepath.Join(backupDir, fmt.Sprintf("backup_%d_%s_%d.%s",
					bookID, strings.ToLower(format), time.Now().Unix(), strings.ToLower(format)))
				if err := copyFile(src, backupPath); err != nil {
					return "", err
				}
			}
		}
	}
	if err := replaceFormat(db, bookID, format, outPath); err != nil {
		return backupPath, err
	}
	return backupPath, nil
}

// replaceFormat 把 outPath 的内容写回书籍的指定格式。
//
// 对应 Calibre 的 `db.add_format(book_id, fmt, handle, index_is_id=True)`：
// 覆盖目标文件并刷新 book_formats 的大小与时间戳。
func replaceFormat(db *sql.DB, bookID int64, format, outPath string) error {
	target, missing, err := library.ResolvePath(db, bookID, format)
	if err != nil || missing || target == "" {
		return NewError("找不到 %s 文件，可能已被移除", format)
	}
	if err := copyFile(outPath, target); err != nil {
		return err
	}
	info, err := os.Stat(target)
	if err != nil {
		return err
	}
	// 格式已登记：原地刷新大小与时间戳（对应 add_format 的覆盖语义）。
	res, err := db.Exec(`UPDATE book_formats SET size = ?, mtime = ?
		WHERE book_id = ? AND format = ?`, info.Size(), info.ModTime().Unix(), bookID, format)
	if err != nil {
		return err
	}
	if affected, err := res.RowsAffected(); err == nil && affected == 0 {
		return library.RegisterFormat(db, bookID, format, target, info.Size(), info.ModTime().Unix())
	}
	return nil
}

// copyFile 复制文件内容并保留权限位。
func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	info, err := in.Stat()
	if err != nil {
		return err
	}
	out, err := os.OpenFile(dst, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, info.Mode().Perm())
	if err != nil {
		return err
	}
	if _, err := io.Copy(out, in); err != nil {
		out.Close()
		return err
	}
	return out.Close()
}

// ImportOptions 是「以新书身份入库」的可选参数。
type ImportOptions struct {
	// TitleSuffix 追加到标题末尾的后缀（如「（正文替换版）」）。
	TitleSuffix string
	// Language 覆盖语言字段（如 "zh" / "zht"）；为空时保留原值。
	Language string
	// TitleOverride 覆盖标题；为空时用原书标题。
	TitleOverride string
	// AuthorsOverride 覆盖作者；为 nil 时保留原值。
	AuthorsOverride []string
	// ConvertText 是标题 / 作者文本转换函数（繁简转换使用）。
	ConvertText func(string) string
	// CollectorID 是操作用户 ID（创建收藏记录）。
	CollectorID int64
}

// ImportAsNewBook 以新书身份入库：复用原书完整元数据，标题追加后缀。
//
// 返回新书 id。
func ImportAsNewBook(db *sql.DB, srcBookID int64, outPath string, opts ImportOptions) (int64, error) {
	src, err := ResolveBook(db, srcBookID)
	if err != nil {
		return 0, err
	}

	title := src.Title
	if opts.TitleOverride != "" {
		title = opts.TitleOverride
	}
	title = strings.TrimSpace(title)
	if title == "" {
		title = "Unknown"
	}
	if opts.ConvertText != nil {
		title = opts.ConvertText(title)
	}
	if opts.TitleSuffix != "" {
		title = title + opts.TitleSuffix
	}
	title = SuperStrip(title)

	authors := src.Authors
	if opts.AuthorsOverride != nil {
		authors = opts.AuthorsOverride
	}
	if opts.ConvertText != nil && len(authors) > 0 {
		converted := make([]string, 0, len(authors))
		for _, a := range authors {
			converted = append(converted, opts.ConvertText(a))
		}
		authors = converted
	}

	language := opts.Language
	if language == "" {
		language = src.Language
	}
	if language == "" {
		language = "zho"
	}

	newBookID, err := insertBook(db, src, title, authors, language, outPath)
	if err != nil {
		return 0, err
	}
	if newBookID == 0 {
		return 0, NewError("导入文件失败，Calibre未返回书籍ID")
	}
	if opts.CollectorID != 0 {
		// 收藏记录失败不影响入库结果。
		_ = insertCollectorItem(db, newBookID, opts.CollectorID)
	}
	return newBookID, nil
}

// insertBook 把处理后文件以新书身份写入书库，并继承原书元数据。
//
// 对应 Calibre 的 `db.import_book(mi, [out_path])`：建 books 行、关联
// 作者/出版社/标签/丛书/语言、写简介与标识符、登记格式文件。
func insertBook(db *sql.DB, src *library.BookData, title string, authors []string,
	language, outPath string) (int64, error) {
	tx, err := db.Begin()
	if err != nil {
		return 0, err
	}
	defer func() { _ = tx.Rollback() }()

	now := time.Now().UTC().Format("2006-01-02 15:04:05+00:00")
	// 新书使用独立 UUID，避免与原书冲突。
	uuid := newUUID()
	res, err := tx.Exec(`INSERT INTO books
		(title, author_sort, path, timestamp, pubdate, series_index, sort, has_cover, uuid, last_modified)
		VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
		title, strings.Join(authors, " & "), src.Path, time.Now().Unix(), src.Pubdate,
		src.SeriesIdx, GetTitleSort(title), uuid, now)
	if err != nil {
		return 0, fmt.Errorf("booktools: 插入书籍失败: %w", err)
	}
	bookID, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}

	for _, author := range authors {
		author = strings.TrimSpace(author)
		if author == "" {
			continue
		}
		id, err := findOrCreateItem(tx, "authors", "name", author)
		if err != nil {
			return 0, err
		}
		if _, err := tx.Exec(`INSERT INTO books_authors_link (book, author) VALUES (?, ?)`,
			bookID, id); err != nil {
			return 0, err
		}
	}
	if p := strings.TrimSpace(src.Publisher); p != "" {
		id, err := findOrCreateItem(tx, "publishers", "name", p)
		if err != nil {
			return 0, err
		}
		if _, err := tx.Exec(`INSERT INTO books_publishers_link (book, publisher) VALUES (?, ?)`,
			bookID, id); err != nil {
			return 0, err
		}
	}
	for _, tag := range src.Tags {
		tag = strings.TrimSpace(tag)
		if tag == "" {
			continue
		}
		id, err := findOrCreateItem(tx, "tags", "name", tag)
		if err != nil {
			return 0, err
		}
		if _, err := tx.Exec(`INSERT INTO books_tags_link (book, tag) VALUES (?, ?)`,
			bookID, id); err != nil {
			return 0, err
		}
	}
	if s := strings.TrimSpace(src.Series); s != "" {
		id, err := findOrCreateItem(tx, "series", "name", s)
		if err != nil {
			return 0, err
		}
		if _, err := tx.Exec(`INSERT INTO books_series_link (book, series) VALUES (?, ?)`,
			bookID, id); err != nil {
			return 0, err
		}
	}
	if language != "" {
		id, err := findOrCreateItem(tx, "languages", "lang_code", language)
		if err != nil {
			return 0, err
		}
		if _, err := tx.Exec(`INSERT INTO books_languages_link (book, lang_code, item_order)
			VALUES (?, ?, 0)`, bookID, id); err != nil {
			return 0, err
		}
	}
	if c := strings.TrimSpace(src.Comments); c != "" {
		if _, err := tx.Exec(`INSERT INTO comments (book, text) VALUES (?, ?)`, bookID, c); err != nil {
			return 0, err
		}
	}
	if src.ISBN != "" {
		if _, err := tx.Exec(`INSERT INTO identifiers (book, type, val) VALUES (?, 'isbn', ?)`,
			bookID, src.ISBN); err != nil {
			return 0, err
		}
	}

	// 登记格式文件（对应 add_format）。
	format := strings.ToUpper(strings.TrimPrefix(filepath.Ext(outPath), "."))
	info, err := os.Stat(outPath)
	if err != nil {
		return 0, err
	}
	if _, err := tx.Exec(`INSERT INTO data (book, format, uncompressed_size, name)
		VALUES (?, ?, ?, ?)`, bookID, format, info.Size(), outPath); err != nil {
		return 0, err
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return bookID, nil
}

// findOrCreateItem 在分类项表中按名字查找，不存在则创建，返回 id。
func findOrCreateItem(tx *sql.Tx, table, nameCol, value string) (int64, error) {
	var id int64
	err := tx.QueryRow(
		fmt.Sprintf(`SELECT id FROM %s WHERE %s = ? LIMIT 1`, table, nameCol), value).Scan(&id)
	if err == nil {
		return id, nil
	}
	if err != sql.ErrNoRows {
		return 0, err
	}
	res, err := tx.Exec(fmt.Sprintf(`INSERT INTO %s (%s) VALUES (?)`, table, nameCol), value)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// insertCollectorItem 建一条收藏记录（对应 Python 的 Item 模型）。
func insertCollectorItem(db *sql.DB, bookID, collectorID int64) error {
	_, err := db.Exec(`INSERT INTO items
		(book_id, count_guest, count_visit, count_download, website, collector_id,
		 scope, book_type, media_type, media_type_locked, src_path)
		VALUES (?, 0, 0, 0, '', ?, '', '', '', 0, '')`, bookID, collectorID)
	return err
}

// newUUID 生成一个 v4 UUID 字符串。
func newUUID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		// 退化为时间戳，保证不阻塞入库。
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

// SuperStrip 复刻 utils.super_strip：去掉首尾空白与不可见字符。
func SuperStrip(text string) string {
	return strings.TrimSpace(strings.Map(func(r rune) rune {
		switch r {
		case '\u200b', '\ufeff', '\u00a0':
			return -1
		}
		return r
	}, text))
}

// GetTitleSort 复刻 utils.get_title_sort：生成标题排序键。
//
// 去掉前导冠词与标点，按小写比较。
func GetTitleSort(title string) string {
	cleaned := strings.TrimSpace(title)
	lower := strings.ToLower(cleaned)
	for _, article := range []string{"the ", "a ", "an ", "the\t", "a\t", "an\t"} {
		if strings.HasPrefix(lower, article) {
			cleaned = cleaned[len(article):]
			break
		}
	}
	return strings.ToLower(strings.TrimSpace(cleaned))
}
