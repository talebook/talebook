package booktools

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"talebook/booksvr/internal/library"
)

// NewBookOptions 是 ImportNewBook 的参数。
type NewBookOptions struct {
	// Title 是书名；为空时用文件名。
	Title string
	// Authors 是作者列表。
	Authors []string
	// Format 是格式名（如 EPUB / TXT）；为空时从扩展名推断。
	Format string
	// CollectorID 是操作用户 ID（创建 items 记录）。
	CollectorID int64
}

// ImportNewBook 把一个磁盘文件作为全新书籍导入书库。
//
// 与 ImportAsNewBook 不同，它不依赖任何已有书籍，用于「保存到本地」这类
// 从零创建书籍的场景。返回新书 id。
func ImportNewBook(db *sql.DB, filePath string, opts NewBookOptions) (int64, error) {
	abs, err := filepath.Abs(filePath)
	if err != nil {
		return 0, fmt.Errorf("booktools: 解析路径失败: %w", err)
	}
	if _, err := os.Stat(abs); err != nil {
		return 0, fmt.Errorf("booktools: 文件不存在: %w", err)
	}

	format := strings.ToUpper(strings.TrimSpace(opts.Format))
	if format == "" {
		format = strings.ToUpper(strings.TrimPrefix(filepath.Ext(abs), "."))
	}
	if format == "" {
		return 0, fmt.Errorf("booktools: 无法确定格式")
	}

	title := strings.TrimSpace(opts.Title)
	if title == "" {
		title = strings.TrimSuffix(filepath.Base(abs), filepath.Ext(abs))
	}
	title = SuperStrip(title)
	if title == "" {
		title = "Unknown"
	}

	tx, err := db.Begin()
	if err != nil {
		return 0, err
	}
	defer func() { _ = tx.Rollback() }()

	now := time.Now().UTC().Format("2006-01-02 15:04:05+00:00")
	res, err := tx.Exec(`INSERT INTO books
		(title, author_sort, path, timestamp, pubdate, series_index, sort, has_cover, uuid, last_modified)
		VALUES (?, ?, ?, ?, '', 1.0, ?, 0, ?, ?)`,
		title, strings.Join(opts.Authors, " & "), "", time.Now().Unix(),
		GetTitleSort(title), newUUID(), now)
	if err != nil {
		return 0, fmt.Errorf("booktools: 插入书籍失败: %w", err)
	}
	bookID, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}

	for _, author := range opts.Authors {
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

	if err := tx.Commit(); err != nil {
		return 0, err
	}

	// 登记格式（book_formats + data 两表，与 Calibre 语义一致）。
	if err := library.RegisterFormat(db, bookID, format, abs, 0, 0); err != nil {
		return 0, fmt.Errorf("booktools: 登记格式失败: %w", err)
	}
	if _, err := db.Exec(`INSERT INTO data (book, format, uncompressed_size, name)
		VALUES (?, ?, 0, ?)`, bookID, format, filepath.Base(abs)); err != nil {
		return 0, fmt.Errorf("booktools: 写入 data 表失败: %w", err)
	}

	if opts.CollectorID != 0 {
		if err := insertCollectorItem(db, bookID, opts.CollectorID); err != nil {
			return 0, err
		}
	}
	return bookID, nil
}
