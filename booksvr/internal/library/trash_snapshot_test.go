package library

import (
	"os"
	"path/filepath"
	"testing"
)

func TestTrashSnapshotRoundTrip(t *testing.T) {
	for _, managed := range []bool{false, true} {
		t.Run(map[bool]string{true: "managed", false: "indexed"}[managed], func(t *testing.T) {
			db := newQueryDB(t)
			root := t.TempDir()
			source := t.TempDir()
			path := source
			if managed {
				path = "作者/测试"
				source = filepath.Join(root, path)
				os.MkdirAll(source, 0755)
			}
			file := filepath.Join(source, "书.epub")
			os.WriteFile(file, []byte("original"), 0644)
			id, err := ImportBook(db, BookMeta{Title: "恢复的书", Author: "作者", Path: path, Tags: []string{"标签"}, Comments: "简介"})
			if err != nil {
				t.Fatal(err)
			}
			if err = AddFormat(db, id, "EPUB", file, 8, 123); err != nil {
				t.Fatal(err)
			}
			if err = DeleteBookToTrash(db, id, root); err != nil {
				t.Fatal(err)
			}
			entries, err := ListTrashEntries(db, root)
			if err != nil || len(entries) != 1 {
				t.Fatalf("%v %v", entries, err)
			}
			e := entries[0]
			if e.Title != "恢复的书" || e.Author != "作者" || e.Size != 8 || len(e.Formats) != 1 || e.MTime == 0 {
				t.Fatalf("bad entry %+v", e)
			}
			if e.ToDict()["deleted_at"] == "" {
				t.Fatal("missing deletion time")
			}
			if !managed {
				if raw, err := os.ReadFile(file); err != nil || string(raw) != "original" {
					t.Fatal("changed external source")
				}
			}
			if err = RestoreTrashEntry(db, root, id); err != nil {
				t.Fatal(err)
			}
			var title string
			if err = db.QueryRow(`SELECT title FROM books WHERE id=?`, id).Scan(&title); err != nil || title != "恢复的书" {
				t.Fatalf("%s %v", title, err)
			}
			var count int
			db.QueryRow(`SELECT COUNT(*) FROM books_tags_link WHERE book=?`, id).Scan(&count)
			if count != 1 {
				t.Fatal("lost tags")
			}
			if _, err = os.Stat(file); err != nil {
				t.Fatal(err)
			}
			if err = DeleteBookToTrash(db, id, root); err != nil {
				t.Fatal(err)
			}
			if err = DeleteTrashEntry(db, root, id); err != nil {
				t.Fatal(err)
			}
			if !managed {
				if _, err = os.Stat(file); err != nil {
					t.Fatal("permanent trash deletion touched original")
				}
			}
		})
	}
}
func TestTrashSnapshotConflictPreservesTrash(t *testing.T) {
	db := newQueryDB(t)
	root := t.TempDir()
	id, err := ImportBook(db, BookMeta{Title: "原书", Path: t.TempDir()})
	if err != nil {
		t.Fatal(err)
	}
	if err = DeleteBookToTrash(db, id, root); err != nil {
		t.Fatal(err)
	}
	if _, err = db.Exec(`INSERT INTO books(id,title,path) VALUES(?, '冲突书','')`, id); err != nil {
		t.Fatal(err)
	}
	if err = RestoreTrashEntry(db, root, id); err == nil {
		t.Fatal("must reject overwrite")
	}
	dir, _ := trashBookDir(root, id)
	if _, err = os.Stat(filepath.Join(dir, trashSnapshotFile)); err != nil {
		t.Fatal(err)
	}
}

func TestTrashSnapshotDoesNotOverwriteRestoredFile(t *testing.T) {
	db := newQueryDB(t)
	root := t.TempDir()
	dir := filepath.Join(root, "author", "book")
	os.MkdirAll(dir, 0755)
	file := filepath.Join(dir, "book.epub")
	os.WriteFile(file, []byte("old"), 0644)
	id, err := ImportBook(db, BookMeta{Title: "冲突", Path: "author/book"})
	if err != nil {
		t.Fatal(err)
	}
	if err = DeleteBookToTrash(db, id, root); err != nil {
		t.Fatal(err)
	}
	os.MkdirAll(dir, 0755)
	os.WriteFile(file, []byte("new"), 0644)
	if err = RestoreTrashEntry(db, root, id); err == nil {
		t.Fatal("must reject file overwrite")
	}
	raw, _ := os.ReadFile(file)
	if string(raw) != "new" {
		t.Fatal("overwritten")
	}
	if ok, _ := HasID(db, id); ok {
		t.Fatal("restored metadata despite file conflict")
	}
}

func TestTrashSnapshotFormatIDsAndCover(t *testing.T) {
	db := newQueryDB(t)
	root := t.TempDir()
	source := t.TempDir()
	file := filepath.Join(source, "book.epub")
	os.WriteFile(file, []byte("book"), 0644)
	id, err := ImportBook(db, BookMeta{Title: "封面书", Path: source})
	if err != nil {
		t.Fatal(err)
	}
	if err = AddFormat(db, id, "EPUB", file, 4, 1); err != nil {
		t.Fatal(err)
	}
	cover := ManagedCoverPath(root, id)
	os.MkdirAll(filepath.Dir(cover), 0755)
	os.WriteFile(cover, []byte("cover"), 0644)
	if err = migrateSourceSync(db); err != nil {
		t.Fatal(err)
	}
	var oldID int64
	db.QueryRow(`SELECT id FROM book_formats WHERE book_id=?`, id).Scan(&oldID)
	db.Exec(`INSERT INTO source_sync_formats(format_id,identity,size,mtime,missing) VALUES(?,'source',4,1,0)`, oldID)
	if err = DeleteBookToTrash(db, id, root); err != nil {
		t.Fatal(err)
	}
	// Another ongoing import may reuse a format row ID. Restoration must remap it.
	db.Exec(`INSERT INTO book_formats(id,book_id,format,path,size,mtime) VALUES(?,999,'TXT','/another.txt',1,0)`, oldID)
	if err = RestoreTrashEntry(db, root, id); err != nil {
		t.Fatal(err)
	}
	var identity string
	if err = db.QueryRow(`SELECT s.identity FROM source_sync_formats s JOIN book_formats f ON f.id=s.format_id WHERE f.book_id=?`, id).Scan(&identity); err != nil || identity != "source" {
		t.Fatalf("lost sync %s %v", identity, err)
	}
	raw, err := os.ReadFile(cover)
	if err != nil || string(raw) != "cover" {
		t.Fatal("lost cached cover")
	}
}

func TestLegacyTrashWithoutMetadataDoesNotPretendRestored(t *testing.T) {
	db := newQueryDB(t)
	root := t.TempDir()
	dir, _ := trashBookDir(root, 999)
	os.MkdirAll(dir, 0755)
	os.WriteFile(filepath.Join(dir, trashOriginFile), []byte(filepath.Join(root, "legacy")), 0644)
	file := filepath.Join(dir, "book.epub")
	os.WriteFile(file, []byte("old"), 0644)
	if err := RestoreTrashEntry(db, root, 999); err == nil {
		t.Fatal("missing metadata must not report success")
	}
	if _, err := os.Stat(file); err != nil {
		t.Fatal("lost legacy file")
	}
}

func TestTrashFailedDatabaseDeleteRestoresFiles(t *testing.T) {
	for _, managed := range []bool{false, true} {
		t.Run(map[bool]string{false: "indexed", true: "managed"}[managed], func(t *testing.T) {
			db := newQueryDB(t)
			root := t.TempDir()
			source := t.TempDir()
			path := source
			if managed {
				path = "author/book"
				source = filepath.Join(root, path)
				os.MkdirAll(source, 0755)
			}
			file := filepath.Join(source, "book.txt")
			os.WriteFile(file, []byte("original"), 0644)
			id, err := ImportBook(db, BookMeta{Title: "失败回滚", Path: path})
			if err != nil {
				t.Fatal(err)
			}
			cover := ManagedCoverPath(root, id)
			os.MkdirAll(filepath.Dir(cover), 0755)
			os.WriteFile(cover, []byte("cover"), 0644)
			if _, err = db.Exec(`CREATE TRIGGER deny_trash_delete BEFORE DELETE ON books BEGIN SELECT RAISE(FAIL,'forced delete failure'); END`); err != nil {
				t.Fatal(err)
			}
			if err = DeleteBookToTrash(db, id, root); err == nil {
				t.Fatal("expected delete failure")
			}
			if ok, _ := HasID(db, id); !ok {
				t.Fatal("lost database record")
			}
			raw, e := os.ReadFile(file)
			if e != nil || string(raw) != "original" {
				t.Fatal("lost original")
			}
			raw, e = os.ReadFile(cover)
			if e != nil || string(raw) != "cover" {
				t.Fatal("lost cover")
			}
			entries, e := ListTrashEntries(db, root)
			if e != nil || len(entries) != 0 {
				t.Fatalf("failed delete left trash: %v %v", entries, e)
			}
		})
	}
}
