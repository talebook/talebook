package main

import (
	"bytes"
	"database/sql"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestRepairCoversPreviewAndLimitNeverCopyBook(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, "metadata.db")
	db, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatal(err)
	}
	for _, q := range []string{
		`CREATE TABLE books(id INTEGER PRIMARY KEY,path TEXT,has_cover INTEGER)`,
		`CREATE TABLE data(book INTEGER,format TEXT)`,
		`CREATE TABLE book_formats(id INTEGER PRIMARY KEY,book_id INTEGER,format TEXT,path TEXT,size INTEGER,mtime INTEGER,hash TEXT)`,
		`INSERT INTO books VALUES(1,'/external',0),(2,'/external',0)`,
		`INSERT INTO data VALUES(1,'MOBI'),(2,'EPUB')`,
	} {
		if _, err = db.Exec(q); err != nil {
			t.Fatal(err)
		}
	}
	db.Close()
	var out bytes.Buffer
	if err = runRepairCovers([]string{"-db", path, "-limit", "1"}, &out); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out.String(), `"checked":1`) || !strings.Contains(out.String(), `"restored":0`) {
		t.Fatal(out.String())
	}
	if _, err = os.Stat(filepath.Join(root, ".talebook-covers")); !os.IsNotExist(err) {
		t.Fatal("preview wrote files")
	}
	out.Reset()
	if err = runRepairCovers([]string{"-db", path, "-apply", "-after", "1"}, &out); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out.String(), `"checked":1`) || !strings.Contains(out.String(), `"without_cover":1`) {
		t.Fatal(out.String())
	}
}
