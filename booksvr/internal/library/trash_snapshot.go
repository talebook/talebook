package library

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const trashSnapshotFile = ".talebook-snapshot"
const trashCoverFile = ".talebook-cover"

type trashTable struct {
	Name    string
	Columns []string
	Rows    [][]any
}
type trashSnapshot struct {
	Entry  TrashEntry
	Tables []trashTable
}

// Snapshot only metadata. External source files never enter the trash directory.
func snapshotTrashBook(db *sql.DB, id int64) (*trashSnapshot, error) {
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	s := &trashSnapshot{Entry: TrashEntry{BookID: id, MTime: time.Now().Unix()}}
	if err = tx.QueryRow(`SELECT b.title,COALESCE((SELECT GROUP_CONCAT(a.name,' & ') FROM books_authors_link l JOIN authors a ON a.id=l.author WHERE l.book=b.id),b.author_sort,'') FROM books b WHERE b.id=?`, id).Scan(&s.Entry.Title, &s.Entry.Author); err != nil {
		return nil, err
	}
	specs := []struct{ name, where string }{
		{"books", "id=?"}, {"books_authors_link", "book=?"}, {"books_tags_link", "book=?"},
		{"books_publishers_link", "book=?"}, {"books_series_link", "book=?"}, {"books_ratings_link", "book=?"},
		{"books_languages_link", "book=?"}, {"comments", "book=?"}, {"identifiers", "book=?"}, {"data", "book=?"},
		{"book_formats", "book_id=?"}, {"source_sync_formats", "format_id IN (SELECT id FROM book_formats WHERE book_id=?)"},
	}
	for _, spec := range specs {
		var exists int
		if err = tx.QueryRow(`SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?`, spec.name).Scan(&exists); err != nil {
			return nil, err
		}
		if exists == 0 {
			continue
		}
		rows, e := tx.Query(`SELECT * FROM "`+spec.name+`" WHERE `+spec.where, id)
		if e != nil {
			return nil, e
		}
		cols, e := rows.Columns()
		if e != nil {
			rows.Close()
			return nil, e
		}
		table := trashTable{Name: spec.name, Columns: cols}
		for rows.Next() {
			values := make([]any, len(cols))
			args := make([]any, len(cols))
			for i := range values {
				args[i] = &values[i]
			}
			if e = rows.Scan(args...); e != nil {
				rows.Close()
				return nil, e
			}
			for i, v := range values {
				if b, ok := v.([]byte); ok {
					values[i] = string(b)
				}
			}
			table.Rows = append(table.Rows, values)
		}
		e = rows.Err()
		rows.Close()
		if e != nil {
			return nil, e
		}
		s.Tables = append(s.Tables, table)
	}
	rows, err := tx.Query(`SELECT UPPER(format),SUM(uncompressed_size) FROM data WHERE book=? GROUP BY UPPER(format)`, id)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var f string
		var size sql.NullInt64
		if err = rows.Scan(&f, &size); err != nil {
			rows.Close()
			return nil, err
		}
		s.Entry.Formats = append(s.Entry.Formats, f)
		s.Entry.Size += size.Int64
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, err
	}
	return s, tx.Commit()
}
func saveTrashSnapshot(dir string, s *trashSnapshot) error {
	raw, err := json.Marshal(s)
	if err != nil {
		return err
	}
	if err = os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	tmp := filepath.Join(dir, trashSnapshotFile+".tmp")
	if err = os.WriteFile(tmp, raw, 0600); err != nil {
		return err
	}
	return os.Rename(tmp, filepath.Join(dir, trashSnapshotFile))
}
func readTrashSnapshot(dir string) (*trashSnapshot, error) {
	raw, err := os.ReadFile(filepath.Join(dir, trashSnapshotFile))
	if err != nil {
		return nil, err
	}
	var s trashSnapshot
	d := json.NewDecoder(bytes.NewReader(raw))
	d.UseNumber()
	if err = d.Decode(&s); err != nil {
		return nil, err
	}
	return &s, nil
}
func restoreTrashSnapshot(db *sql.DB, s *trashSnapshot, beforeCommit func() error) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var n int
	if err = tx.QueryRow(`SELECT COUNT(*) FROM books WHERE id=?`, s.Entry.BookID).Scan(&n); err != nil {
		return err
	}
	if n != 0 {
		return fmt.Errorf("library: 书号 %d 已存在，拒绝覆盖", s.Entry.BookID)
	}
	formatIDs := map[int64]int64{}
	for _, table := range s.Tables {
		// Only known tables from the snapshot writer are accepted; never execute arbitrary identifiers.
		allowed := map[string]bool{"books": true, "books_authors_link": true, "books_tags_link": true, "books_publishers_link": true, "books_series_link": true, "books_ratings_link": true, "books_languages_link": true, "comments": true, "identifiers": true, "data": true, "book_formats": true, "source_sync_formats": true}
		if !allowed[table.Name] {
			return fmt.Errorf("library: 非法回收站表")
		}
		for _, row := range table.Rows {
			if len(row) != len(table.Columns) {
				return fmt.Errorf("library: 回收站快照损坏")
			}
			cols := []string{}
			marks := []string{}
			values := []any{}
			for i, col := range table.Columns {
				if col == "id" && table.Name != "books" {
					continue
				}
				cols = append(cols, `"`+strings.ReplaceAll(col, `"`, `""`)+`"`)
				marks = append(marks, "?")
				v := row[i]
				if num, ok := v.(json.Number); ok {
					if iv, e := num.Int64(); e == nil {
						v = iv
					} else {
						fv, e := num.Float64()
						if e != nil {
							return e
						}
						v = fv
					}
				}
				if table.Name == "source_sync_formats" && col == "format_id" {
					oldID, ok := v.(int64)
					if !ok {
						return fmt.Errorf("library: 非法格式号")
					}
					newID, ok := formatIDs[oldID]
					if !ok {
						return fmt.Errorf("library: 缺少格式映射")
					}
					v = newID
				}
				values = append(values, v)
			}
			res, execErr := tx.Exec(`INSERT INTO "`+table.Name+`" (`+strings.Join(cols, ",")+`) VALUES (`+strings.Join(marks, ",")+`)`, values...)
			if execErr != nil {
				return fmt.Errorf("library: 恢复 %s 失败: %w", table.Name, execErr)
			}
			if table.Name == "book_formats" {
				newID, e := res.LastInsertId()
				if e != nil {
					return e
				}
				for i, col := range table.Columns {
					if col == "id" {
						oldID, e := row[i].(json.Number).Int64()
						if e != nil {
							return e
						}
						formatIDs[oldID] = newID
					}
				}
			}
		}
	}
	if beforeCommit != nil {
		if err = beforeCommit(); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// Files move only after all metadata inserts succeed, with rollback on any failure.
func restoreSnapshotEntry(db *sql.DB, root, dir string, s *trashSnapshot) error {
	type move struct{ src, dst string }
	moves := []move{}
	moved := []move{}
	target := readTrashOrigin(dir)
	if target != "" {
		absRoot, err := filepath.Abs(root)
		if err != nil {
			return err
		}
		absTarget, err := filepath.Abs(target)
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(absRoot, absTarget)
		if err != nil || rel == "." || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
			return fmt.Errorf("library: 恢复路径越界")
		}
		// Reject symlink parents as well as direct destination collisions.
		for p := absTarget; p != absRoot; p = filepath.Dir(p) {
			info, e := os.Lstat(p)
			if e == nil && info.Mode()&os.ModeSymlink != 0 {
				return fmt.Errorf("library: 恢复目录包含符号链接")
			}
			if e != nil && !os.IsNotExist(e) {
				return e
			}
		}
		entries, err := os.ReadDir(dir)
		if err != nil {
			return err
		}
		for _, entry := range entries {
			if entry.IsDir() || entry.Name() == trashOriginFile || entry.Name() == trashSnapshotFile || entry.Name() == trashCoverFile || entry.Name() == trashSnapshotFile+".tmp" {
				continue
			}
			moves = append(moves, move{filepath.Join(dir, entry.Name()), filepath.Join(target, entry.Name())})
		}
	}
	if _, err := os.Stat(filepath.Join(dir, trashCoverFile)); err == nil {
		moves = append(moves, move{filepath.Join(dir, trashCoverFile), ManagedCoverPath(root, s.Entry.BookID)})
	} else if !os.IsNotExist(err) {
		return err
	}
	for _, m := range moves {
		if _, err := os.Lstat(m.dst); err == nil {
			return fmt.Errorf("library: 恢复目标已存在，拒绝覆盖 %s", m.dst)
		} else if !os.IsNotExist(err) {
			return err
		}
	}
	committed := false
	defer func() {
		if !committed {
			for i := len(moved) - 1; i >= 0; i-- {
				_ = os.Rename(moved[i].dst, moved[i].src)
			}
		}
	}()
	err := restoreTrashSnapshot(db, s, func() error {
		for _, m := range moves {
			if err := os.MkdirAll(filepath.Dir(m.dst), 0755); err != nil {
				return err
			}
			if err := os.Rename(m.src, m.dst); err != nil {
				return err
			}
			moved = append(moved, m)
		}
		return nil
	})
	if err != nil {
		return err
	}
	committed = true
	return os.RemoveAll(dir)
}

// Restore filesystem state when the database deletion or snapshot write fails.
func rollbackTrashMove(root string, id int64) error {
	dir, err := trashBookDir(root, id)
	if err != nil {
		return err
	}
	cover := filepath.Join(dir, trashCoverFile)
	if _, e := os.Stat(cover); e == nil {
		target := ManagedCoverPath(root, id)
		if _, e = os.Lstat(target); e == nil {
			return fmt.Errorf("封面目标已存在")
		}
		if e = os.MkdirAll(filepath.Dir(target), 0755); e != nil {
			return e
		}
		if e = os.Rename(cover, target); e != nil {
			return e
		}
	} else if !os.IsNotExist(e) {
		return e
	}
	origin := readTrashOrigin(dir)
	if origin != "" {
		if _, e := os.Lstat(origin); e == nil {
			return fmt.Errorf("原目录已存在，拒绝覆盖")
		} else if !os.IsNotExist(e) {
			return e
		}
		if err = os.Rename(dir, origin); err != nil {
			return err
		}
		for _, name := range []string{trashSnapshotFile, trashSnapshotFile + ".tmp", trashOriginFile} {
			if err = os.Remove(filepath.Join(origin, name)); err != nil && !os.IsNotExist(err) {
				return err
			}
		}
		return nil
	}
	return os.RemoveAll(dir)
}
