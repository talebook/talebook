package main

import (
	"bytes"
	"database/sql"
	"encoding/binary"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"talebook/booksvr/internal/library"
)

func TestRepairMobiPreviewApplyAndJournal(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "metadata.db")
	db, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	if _, err = db.Exec(`CREATE TABLE books(id INTEGER PRIMARY KEY,title TEXT,author_sort TEXT,path TEXT,timestamp TEXT,sort TEXT,last_modified TEXT)`); err != nil {
		t.Fatal(err)
	}
	if err = library.Migrate(db); err != nil {
		t.Fatal(err)
	}
	data := make([]byte, 86+1024)
	copy(data, "PGVF05UTWV")
	data[77] = 1
	data[81] = 86
	copy(data[102:], "MOBI")
	binary.BigEndian.PutUint32(data[106:110], 228)
	binary.BigEndian.PutUint32(data[170:174], 648)
	title := []byte("九州·魅生05：十师卷")
	binary.BigEndian.PutUint32(data[174:178], uint32(len(title)))
	copy(data[734:], title)
	src := filepath.Join(dir, "book.mobi")
	if err = os.WriteFile(src, data, 0600); err != nil {
		t.Fatal(err)
	}
	if _, err = db.Exec(`INSERT INTO books(id,title,author_sort,path)VALUES(1,'PGVF05UTWV','楚惜刀','keep')`); err != nil {
		t.Fatal(err)
	}
	if err = library.RegisterFormat(db, 1, "MOBI", src, int64(len(data)), 0); err != nil {
		t.Fatal(err)
	}
	var out bytes.Buffer
	if err = runRepairMobi([]string{"-db", path}, &out); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out.String(), string(title)) {
		t.Fatal("missing preview")
	}
	var current string
	db.QueryRow(`SELECT title FROM books WHERE id=1`).Scan(&current)
	if current != "PGVF05UTWV" {
		t.Fatal("preview wrote catalog")
	}
	if err = runRepairMobi([]string{"-db", path, "-apply"}, &out); err == nil {
		t.Fatal("missing required journal accepted")
	}
	journal := filepath.Join(dir, "changes.jsonl")
	args := []string{"-db", path, "-apply", "-journal", journal}
	if err = runRepairMobi(args, &out); err != nil {
		t.Fatal(err)
	}
	db.QueryRow(`SELECT title FROM books WHERE id=1`).Scan(&current)
	if current != string(title) {
		t.Fatal(current)
	}
	before, err := os.ReadFile(journal)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(before), `"state":"intent"`) || !strings.Contains(string(before), `"state":"applied"`) {
		t.Fatal("missing audit events")
	}
	if err = runRepairMobi(args, &out); err != nil {
		t.Fatal(err)
	}
	after, _ := os.ReadFile(journal)
	if !bytes.Equal(before, after) {
		t.Fatal("repeat run is not idempotent")
	}
}

func TestRepairMobiRejectsMissingDatabaseAndWatchProcess(t *testing.T) {
	var out bytes.Buffer
	path := filepath.Join(t.TempDir(), "missing.db")
	if err := runRepairMobi([]string{"-db", path}, &out); err == nil {
		t.Fatal("missing database accepted")
	}
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatal("created database")
	}
	if _, err := processIdentity("999999999"); err == nil {
		t.Fatal("missing process accepted")
	}
}
