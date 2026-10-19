package library

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// Cover 返回某本书的封面图片字节。
//
// 无封面时返回 nil（不报错），与 Calibre 的 cover() 语义一致。
// 优先读取按书号独立保存的托管封面，兼容原 Calibre cover.jpg。
func Cover(db *sql.DB, bookID int64, libraryRoot string) ([]byte, error) {
	p, err := coverFile(db, bookID, libraryRoot)
	if err != nil || p == "" {
		return nil, err
	}
	data, err := os.ReadFile(p)
	if os.IsNotExist(err) {
		return nil, nil
	}
	return data, err
}

func coverFile(db *sql.DB, id int64, root string) (string, error) {
	var bookPath string
	var hasCover int64
	err := db.QueryRow(`SELECT COALESCE(path,''),COALESCE(has_cover,0) FROM books WHERE id=?`, id).Scan(&bookPath, &hasCover)
	if err == sql.ErrNoRows {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	// Managed artwork is per book; legacy external directories may be shared.
	paths := []string{ManagedCoverPath(root, id)}
	if hasCover != 0 && bookPath != "" {
		paths = append(paths, filepath.Join(bookDirFromPath(root, bookPath), "cover.jpg"))
	}
	for _, p := range paths {
		info, err := os.Stat(p)
		if err == nil && info.Mode().IsRegular() {
			return p, nil
		}
		if err != nil && !os.IsNotExist(err) {
			return "", err
		}
	}
	return "", nil
}

// bookDirFromPath 把 books.path 解析成磁盘目录。
//
// books.path 有两种形态：Calibre 托管的相对路径（拼 libraryRoot），
// 以及原地登记时的外部绝对路径（直接用）。曾因无条件拼接导致
// 绝对路径书的封面永远读不到，只能回退到默认占位图。
func bookDirFromPath(libraryRoot, bookPath string) string {
	p := filepath.FromSlash(bookPath)
	if filepath.IsAbs(p) {
		return p
	}
	return filepath.Join(libraryRoot, p)
}

// CoverLastModified 返回封面文件的修改时间（Unix 秒）。
//
// 无封面时返回 0。
func CoverLastModified(db *sql.DB, bookID int64, libraryRoot string) (int64, error) {
	p, err := coverFile(db, bookID, libraryRoot)
	if err != nil || p == "" {
		return 0, err
	}
	info, err := os.Stat(p)
	if os.IsNotExist(err) {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	return info.ModTime().Unix(), nil
}

// trashMetaFiles 是回收站目录中不算「格式」的文件名。
var trashMetaFiles = map[string]bool{
	"cover.jpg":        true,
	"metadata.opf":     true,
	"annotations.json": true,
	// 侧车文件：记录原目录，供恢复时定位。
	".talebook-origin":         true,
	trashSnapshotFile:          true,
	trashCoverFile:             true,
	trashSnapshotFile + ".tmp": true,
}

// TrashEntry 是回收站中的一个整书条目。
type TrashEntry struct {
	BookID  int64    `json:"id"`
	Title   string   `json:"title"`
	Author  string   `json:"author"`
	Size    int64    `json:"size"`
	Formats []string `json:"formats"`
	// MTime 是回收站目录的修改时间（Unix 秒）。
	MTime int64 `json:"mtime"`
}

// trashBookDir 返回某书在回收站中的目录。
//
// 结构对齐 Calibre：<libraryRoot>/.caltrash/b/<book_id>。
// 拒绝非法 id，防止路径穿越。
func trashBookDir(libraryRoot string, bookID int64) (string, error) {
	if bookID <= 0 {
		return "", fmt.Errorf("library: 非法回收站 id %d", bookID)
	}
	bookRoot := filepath.Join(libraryRoot, ".caltrash", "b")
	path := filepath.Join(bookRoot, fmt.Sprintf("%d", bookID))

	// 复刻 Calibre 的 commonpath 校验。
	absRoot, err := filepath.Abs(bookRoot)
	if err != nil {
		return "", fmt.Errorf("library: 解析回收站根目录失败: %w", err)
	}
	absPath, err := filepath.Abs(path)
	if err != nil {
		return "", fmt.Errorf("library: 解析回收站路径失败: %w", err)
	}
	if !strings.HasPrefix(absPath, absRoot+string(filepath.Separator)) {
		return "", fmt.Errorf("library: 回收站路径越界: %s", absPath)
	}
	return path, nil
}

// ListTrashEntries 列出回收站中的整书条目。
//
// 目录不存在时返回空结果（不报错）。
func ListTrashEntries(db *sql.DB, libraryRoot string) ([]TrashEntry, error) {
	bookRoot := filepath.Join(libraryRoot, ".caltrash", "b")
	dirents, err := os.ReadDir(bookRoot)
	if os.IsNotExist(err) {
		return []TrashEntry{}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("library: 读取回收站失败: %w", err)
	}

	out := []TrashEntry{}
	for _, de := range dirents {
		if !de.IsDir() {
			continue
		}
		var bookID int64
		if _, err := fmt.Sscanf(de.Name(), "%d", &bookID); err != nil || bookID <= 0 {
			continue
		}
		dir := filepath.Join(bookRoot, de.Name())

		formats, err := trashBookFormats(dir)
		if err != nil {
			return nil, err
		}
		size, err := dirSize(dir)
		if err != nil {
			return nil, err
		}

		entry := TrashEntry{BookID: bookID, Formats: formats, Size: size}
		if info, err := de.Info(); err == nil {
			entry.MTime = info.ModTime().Unix()
		}
		// 从 books 表补标题/作者（书被删后可能已不在表中，此时留空）。
		var title, author sql.NullString
		_ = db.QueryRow(`
			SELECT b.title, COALESCE((SELECT a.name FROM books_authors_link l
				JOIN authors a ON a.id = l.author WHERE l.book = b.id LIMIT 1), '')
			FROM books b WHERE b.id = ?`, bookID).Scan(&title, &author)
		if title.Valid {
			entry.Title = title.String
		}
		if author.Valid {
			entry.Author = author.String
		}
		if snapshot, e := readTrashSnapshot(dir); e == nil {
			saved := snapshot.Entry
			if len(saved.Formats) == 0 {
				saved.Formats = entry.Formats
			}
			if saved.Size == 0 {
				files, e := os.ReadDir(dir)
				if e != nil {
					return nil, e
				}
				for _, file := range files {
					if file.IsDir() || trashMetaFiles[strings.ToLower(file.Name())] {
						continue
					}
					if info, e := file.Info(); e == nil {
						saved.Size += info.Size()
					}
				}
			}
			entry = saved
		} else if !os.IsNotExist(e) {
			return nil, fmt.Errorf("library: 读取回收站快照失败: %w", e)
		}
		out = append(out, entry)
	}
	return out, nil
}

// trashBookFormats 列出回收站目录中的格式（排除元数据文件与无扩展名文件）。
func trashBookFormats(dir string) ([]string, error) {
	dirents, err := os.ReadDir(dir)
	if os.IsNotExist(err) {
		return []string{}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("library: 读取回收站目录失败: %w", err)
	}

	seen := map[string]bool{}
	for _, de := range dirents {
		if de.IsDir() {
			continue
		}
		name := strings.ToLower(de.Name())
		if trashMetaFiles[name] || !strings.Contains(name, ".") {
			continue
		}
		ext := name[strings.LastIndex(name, ".")+1:]
		if ext != "" {
			seen[strings.ToUpper(ext)] = true
		}
	}

	out := make([]string, 0, len(seen))
	for f := range seen {
		out = append(out, f)
	}
	sort.Strings(out)
	return out, nil
}

// dirSize 递归计算目录大小（跳过符号链接与不可读文件）。
func dirSize(dir string) (int64, error) {
	var total int64
	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // 跳过不可读项，与 Calibre 一致
		}
		if info.Mode()&os.ModeSymlink != 0 || info.IsDir() {
			return nil
		}
		total += info.Size()
		return nil
	})
	if err != nil {
		return 0, fmt.Errorf("library: 计算目录大小失败: %w", err)
	}
	return total, nil
}

// DeleteTrashEntry 永久删除回收站中的一个条目。
func DeleteTrashEntry(db *sql.DB, libraryRoot string, bookID int64) error {
	dir, err := trashBookDir(libraryRoot, bookID)
	if err != nil {
		return err
	}
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		return fmt.Errorf("library: 回收站条目 %d 不存在", bookID)
	}
	if err := os.RemoveAll(dir); err != nil {
		return fmt.Errorf("library: 删除回收站条目 %d 失败: %w", bookID, err)
	}
	return nil
}

// RestoreTrashEntry 把回收站条目恢复到书库目录。
//
// 文件移回 <libraryRoot>/<book.path>/，并登记到 book_formats。
func RestoreTrashEntry(db *sql.DB, libraryRoot string, bookID int64) error {
	dir, err := trashBookDir(libraryRoot, bookID)
	if err != nil {
		return err
	}
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		return fmt.Errorf("library: 回收站条目 %d 不存在", bookID)
	}

	snapshot, snapshotErr := readTrashSnapshot(dir)
	if snapshotErr != nil && !os.IsNotExist(snapshotErr) {
		return snapshotErr
	}
	if snapshot != nil {
		if snapshot.Entry.BookID != bookID {
			return fmt.Errorf("library: 回收站书号不一致")
		}
		var n int
		if err = db.QueryRow(`SELECT COUNT(*) FROM books WHERE id=?`, bookID).Scan(&n); err != nil {
			return err
		}
		if n != 0 {
			return fmt.Errorf("library: 书号 %d 已存在，拒绝覆盖", bookID)
		}
		return restoreSnapshotEntry(db, libraryRoot, dir, snapshot)
	}
	// Legacy files alone cannot reconstruct a deleted book's database metadata.
	if exists, e := HasID(db, bookID); e != nil {
		return e
	} else if !exists {
		return fmt.Errorf("library: 旧回收站条目缺少元数据快照，无法恢复书籍记录")
	}
	// 优先用回收站条目记录的原目录。删除后 books 行已不存在，
	// 查库必然失败；只有老条目（无侧车文件）才回退到查库。
	targetDir := readTrashOrigin(dir)
	if targetDir == "" {
		var bookPath string
		err = db.QueryRow(`SELECT COALESCE(path,'') FROM books WHERE id = ?`, bookID).Scan(&bookPath)
		if err == sql.ErrNoRows {
			return fmt.Errorf("library: 书籍 %d 不在库中，无法恢复", bookID)
		}
		if err != nil {
			return fmt.Errorf("library: 查询恢复目标失败: %w", err)
		}
		if bookPath == "" {
			return fmt.Errorf("library: 书籍 %d 缺少 path，无法恢复", bookID)
		}
		// books.path 可能是相对书库根目录的 Calibre 路径，也可能是绝对路径。
		if filepath.IsAbs(bookPath) {
			targetDir = filepath.FromSlash(bookPath)
		} else {
			targetDir = filepath.Join(libraryRoot, filepath.FromSlash(bookPath))
		}
	}
	if err := os.MkdirAll(targetDir, 0o755); err != nil {
		return fmt.Errorf("library: 创建恢复目录失败: %w", err)
	}

	dirents, err := os.ReadDir(dir)
	if err != nil {
		return fmt.Errorf("library: 读取回收站目录失败: %w", err)
	}
	for _, de := range dirents {
		if de.IsDir() || de.Name() == trashOriginFile || de.Name() == trashSnapshotFile || de.Name() == trashSnapshotFile+".tmp" {
			continue
		}
		src := filepath.Join(dir, de.Name())
		dst := filepath.Join(targetDir, de.Name())
		if err := os.Rename(src, dst); err != nil {
			return fmt.Errorf("library: 恢复文件 %s 失败: %w", de.Name(), err)
		}
	}

	if err := os.RemoveAll(dir); err != nil {
		return fmt.Errorf("library: 清理回收站目录失败: %w", err)
	}
	return nil
}

// ToDict 把回收站条目转成响应字典。
func (t TrashEntry) ToDict() map[string]any {
	formats := t.Formats
	if formats == nil {
		formats = []string{}
	}
	return map[string]any{
		"id":         t.BookID,
		"title":      t.Title,
		"author":     t.Author,
		"size":       t.Size,
		"formats":    formats,
		"mtime":      t.MTime,
		"deleted_at": time.Unix(t.MTime, 0).UTC().Format(time.RFC3339),
	}
}
