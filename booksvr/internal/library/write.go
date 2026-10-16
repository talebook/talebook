package library

import (
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// ImportBook 在书库中新建一本书，并写入作者/出版社/标签/简介关联。
//
// 返回新书的 id。作者、出版社、标签若已存在则复用，否则新建。
// 这是 Calibre import_book 的等价实现（不含文件解析，那属阶段 4）。
func ImportBook(db *sql.DB, meta BookMeta) (int64, error) {
	title := strings.TrimSpace(meta.Title)
	if title == "" {
		return 0, errors.New("library: ImportBook 需要 Title")
	}

	tx, err := db.Begin()
	if err != nil {
		return 0, fmt.Errorf("library: 开启事务失败: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	now := time.Now().UTC().Format("2006-01-02 15:04:05+00:00")
	authorSort := strings.TrimSpace(meta.Author)

	res, err := tx.Exec(`
		INSERT INTO books (title, author_sort, path, timestamp, pubdate, series_index, has_cover, last_modified)
		VALUES (?, ?, ?, ?, ?, 1.0, 0, ?)`,
		title, authorSort, meta.Path, time.Now().Unix(), meta.Pubdate, now)
	if err != nil {
		return 0, fmt.Errorf("library: 插入书籍失败: %w", err)
	}
	bookID, err := res.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("library: 获取新书 id 失败: %w", err)
	}

	if a := strings.TrimSpace(meta.Author); a != "" {
		authorID, err := findOrCreateItem(tx, "authors", "name", a)
		if err != nil {
			return 0, err
		}
		if _, err := tx.Exec(
			`INSERT INTO books_authors_link (book, author) VALUES (?, ?)`, bookID, authorID); err != nil {
			return 0, fmt.Errorf("library: 关联作者失败: %w", err)
		}
	}

	if p := strings.TrimSpace(meta.Publisher); p != "" {
		pubID, err := findOrCreateItem(tx, "publishers", "name", p)
		if err != nil {
			return 0, err
		}
		if _, err := tx.Exec(
			`INSERT INTO books_publishers_link (book, publisher) VALUES (?, ?)`, bookID, pubID); err != nil {
			return 0, fmt.Errorf("library: 关联出版社失败: %w", err)
		}
	}

	for _, tag := range meta.Tags {
		tag = strings.TrimSpace(tag)
		if tag == "" {
			continue
		}
		tagID, err := findOrCreateItem(tx, "tags", "name", tag)
		if err != nil {
			return 0, err
		}
		if _, err := tx.Exec(
			`INSERT INTO books_tags_link (book, tag) VALUES (?, ?)`, bookID, tagID); err != nil {
			return 0, fmt.Errorf("library: 关联标签失败: %w", err)
		}
	}

	if c := strings.TrimSpace(meta.Comments); c != "" {
		if _, err := tx.Exec(`INSERT INTO comments (book, text) VALUES (?, ?)`, bookID, c); err != nil {
			return 0, fmt.Errorf("library: 写入简介失败: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return 0, fmt.Errorf("library: 提交事务失败: %w", err)
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
		return 0, fmt.Errorf("library: 查询 %s 失败: %w", table, err)
	}

	res, err := tx.Exec(fmt.Sprintf(`INSERT INTO %s (%s) VALUES (?)`, table, nameCol), value)
	if err != nil {
		return 0, fmt.Errorf("library: 创建 %s 失败: %w", table, err)
	}
	id, err = res.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("library: 获取 %s id 失败: %w", table, err)
	}
	return id, nil
}

// DeleteBookToTrash 把一本书移入 Calibre 回收站，再删除其数据库记录。
//
// 对应 Python 的 db.delete_book(bid, permanent=False)：先把书籍目录整体
// 移到 <libraryRoot>/.caltrash/b/<book_id>，再清理数据库行。这样管理员
// 可以在回收站页面恢复或永久删除。
//
// 目录不存在（外部索引书、已手工删文件）时跳过移动，仍继续删库，
// 与 Calibre 的容错行为一致。
func DeleteBookToTrash(db *sql.DB, bookID int64, libraryRoot string) error {
	if libraryRoot != "" {
		managed := isManagedBookPath(db, bookID)
		if err := moveBookDirToTrash(db, bookID, libraryRoot); err != nil {
			return err
		}
		cover := ManagedCoverPath(libraryRoot, bookID)
		if managed {
			if _, err := os.Stat(cover); err == nil {
				dst, err := trashBookDir(libraryRoot, bookID)
				if err != nil {
					return err
				}
				if err = os.MkdirAll(dst, 0755); err != nil {
					return err
				}
				if err = os.Rename(cover, filepath.Join(dst, "cover.jpg")); err != nil {
					return err
				}
			} else if !os.IsNotExist(err) {
				return err
			}
		}
	}
	if err := DeleteBook(db, bookID); err != nil {
		return err
	}
	if libraryRoot != "" {
		if err := os.Remove(ManagedCoverPath(libraryRoot, bookID)); err != nil && !os.IsNotExist(err) {
			return err
		}
	}
	return nil
}

// moveBookDirToTrash 把书籍目录移到回收站。
//
// 只处理 Calibre 托管的目录（books.path 为相对书库根目录的路径）。
// 原地登记的书（books.path 是源文件所在的外部绝对目录）不动磁盘：
// 那是用户自己的导入目录，删除书籍不应把它搬走或删掉。
//
// 目标已存在时先清空，避免残留旧文件（Calibre 的 replace 语义）。
func moveBookDirToTrash(db *sql.DB, bookID int64, libraryRoot string) error {
	if !isManagedBookPath(db, bookID) {
		return nil
	}
	src, err := bookDir(db, bookID, libraryRoot)
	if err != nil {
		return err
	}
	if _, err := os.Stat(src); os.IsNotExist(err) {
		return nil
	}
	dst, err := trashBookDir(libraryRoot, bookID)
	if err != nil {
		return err
	}
	if _, err := os.Stat(dst); err == nil {
		if err := os.RemoveAll(dst); err != nil {
			return fmt.Errorf("library: 清理回收站旧目录失败: %w", err)
		}
	}
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return fmt.Errorf("library: 创建回收站目录失败: %w", err)
	}
	if err := os.Rename(src, dst); err != nil {
		return fmt.Errorf("library: 移入回收站失败: %w", err)
	}

	// 记录原目录，供恢复时定位。删除后 books 行已不存在，
	// 无法再从库里查到 path，必须随回收站条目一起保存。
	if err := os.WriteFile(filepath.Join(dst, trashOriginFile), []byte(src), 0o644); err != nil {
		return fmt.Errorf("library: 写入回收站来源失败: %w", err)
	}
	return nil
}

// isManagedBookPath 报告书籍目录是否由 Calibre 托管。
//
// books.path 为相对路径时是 Calibre 布局（<author>/<title> (<id>)），
// 可以安全地移入回收站；为绝对路径时是原地登记的外部目录，不能动。
func isManagedBookPath(db *sql.DB, bookID int64) bool {
	var rel string
	if err := db.QueryRow(`SELECT COALESCE(path,'') FROM books WHERE id = ?`, bookID).Scan(&rel); err != nil {
		return false
	}
	if rel == "" {
		return false
	}
	return !filepath.IsAbs(filepath.FromSlash(rel))
}

// trashOriginFile 是回收站条目里记录原目录的侧车文件名。
//
// 以点开头且不是书籍格式，ListTrashEntries 会把它当作非格式文件忽略。
const trashOriginFile = ".talebook-origin"

// readTrashOrigin 读取回收站条目记录的原目录。
//
// 老条目（无侧车文件）返回空串，调用方回退到旧逻辑。
func readTrashOrigin(dir string) string {
	data, err := os.ReadFile(filepath.Join(dir, trashOriginFile))
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(data))
}

// bookDir 返回某本书在磁盘上的目录路径。
//
// books.path 有两种形态，必须区分处理：
//   - Calibre 原生：相对书库根目录，如 "刘慈欣/三体 (1)"；
//   - 原地登记（Talebook 默认导入模式）：源文件的绝对目录，
//     如 "/data/books/imports/todo"。
//
// 对绝对路径不能再拼 libraryRoot，否则会得到一个不存在的路径，
// 导致移入回收站静默失败。
func bookDir(db *sql.DB, bookID int64, libraryRoot string) (string, error) {
	var rel string
	err := db.QueryRow(`SELECT path FROM books WHERE id = ?`, bookID).Scan(&rel)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", fmt.Errorf("library: 书籍 %d 不存在", bookID)
		}
		return "", fmt.Errorf("library: 读取书籍路径失败: %w", err)
	}
	if rel == "" {
		return "", nil
	}
	p := filepath.FromSlash(rel)
	if filepath.IsAbs(p) {
		return p, nil
	}
	return filepath.Join(libraryRoot, p), nil
}

// DeleteBook 删除一本书及其全部关联。
//
// 不删除磁盘文件（文件删除由调用方决定）。
func DeleteBook(db *sql.DB, bookID int64) error {
	ok, err := HasID(db, bookID)
	if err != nil {
		return err
	}
	if !ok {
		return fmt.Errorf("library: 书籍 %d 不存在", bookID)
	}

	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("library: 开启事务失败: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	// 先删关联，再删主行（Calibre 无外键级联，需显式清理）。
	links := []string{
		"books_authors_link", "books_tags_link", "books_publishers_link",
		"books_series_link", "books_ratings_link", "books_languages_link",
	}
	for _, t := range links {
		if _, err := tx.Exec(fmt.Sprintf(`DELETE FROM %s WHERE book = ?`, t), bookID); err != nil {
			return fmt.Errorf("library: 清理 %s 失败: %w", t, err)
		}
	}
	for _, t := range []string{"comments", "identifiers", "data"} {
		if _, err := tx.Exec(fmt.Sprintf(`DELETE FROM %s WHERE book = ?`, t), bookID); err != nil {
			return fmt.Errorf("library: 清理 %s 失败: %w", t, err)
		}
	}
	if _, err := tx.Exec(`DELETE FROM book_formats WHERE book_id = ?`, bookID); err != nil {
		return fmt.Errorf("library: 清理 book_formats 失败: %w", err)
	}
	if _, err := tx.Exec(`DELETE FROM books WHERE id = ?`, bookID); err != nil {
		return fmt.Errorf("library: 删除书籍失败: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("library: 提交事务失败: %w", err)
	}
	return nil
}

// AddFormat 为某本书登记一个格式文件。
//
// 同时写入新 schema 的 book_formats 与 Calibre 的 data 表，保证两边一致。
func AddFormat(db *sql.DB, bookID int64, format, path string, size, mtime int64) error {
	format = NormalizeFormatName(format)
	if format == "" {
		return errors.New("library: AddFormat 需要 format")
	}
	if path == "" {
		return errors.New("library: AddFormat 需要 path")
	}

	if err := RegisterFormat(db, bookID, format, path, size, mtime); err != nil {
		return err
	}

	// 同步 Calibre 的 data 表，让仍走 Calibre 的读路径也能看到。
	name := path
	if i := strings.LastIndexAny(path, `/\`); i >= 0 {
		name = path[i+1:]
	}
	_, err := db.Exec(`
		INSERT INTO data (book, format, uncompressed_size, name) VALUES (?, ?, ?, ?)`,
		bookID, format, size, name)
	if err != nil {
		return fmt.Errorf("library: 同步 data 表失败: %w", err)
	}
	return nil
}

// SetTags 替换某本书的全部标签。
//
// 空列表表示清空标签。
func SetTags(db *sql.DB, bookID int64, tags []string) error {
	ok, err := HasID(db, bookID)
	if err != nil {
		return err
	}
	if !ok {
		return fmt.Errorf("library: 书籍 %d 不存在", bookID)
	}

	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("library: 开启事务失败: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.Exec(`DELETE FROM books_tags_link WHERE book = ?`, bookID); err != nil {
		return fmt.Errorf("library: 清理旧标签失败: %w", err)
	}

	seen := map[string]bool{}
	for _, tag := range tags {
		tag = strings.TrimSpace(tag)
		if tag == "" || seen[tag] {
			continue
		}
		seen[tag] = true

		tagID, err := findOrCreateItem(tx, "tags", "name", tag)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(
			`INSERT INTO books_tags_link (book, tag) VALUES (?, ?)`, bookID, tagID); err != nil {
			return fmt.Errorf("library: 关联标签失败: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("library: 提交事务失败: %w", err)
	}
	return nil
}
