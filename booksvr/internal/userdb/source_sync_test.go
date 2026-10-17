package userdb

import (
	"encoding/base64"
	"encoding/json"
	"strings"
	"talebook/booksvr/internal/sourcefile"
	"testing"
)

func TestRelocateIndexedArchiveCheckpoint(t *testing.T) {
	db := newSchemaDB(t)
	if err := EnsureSourceSyncIndexes(db); err != nil {
		t.Fatal(err)
	}
	old := sourcefile.Reference{Archive: "/books/old.zip", Fingerprint: strings.Repeat("a", 64), Chain: []string{base64.StdEncoding.EncodeToString([]byte("book.txt"))}, Hash: "sha256:" + strings.Repeat("a", 64), Name: "book.txt", Size: 4}
	next := old
	next.Archive = "/books1/new.zip"
	next.Fingerprint = strings.Repeat("b", 64)
	data, _ := json.Marshal(map[string]any{"source_path": sourcefile.Encode(old), "archive_source": "/books/old.zip!/book.txt"})
	path := old.Archive + "!/" + old.Fingerprint[:16] + "/" + old.Chain[0] + "/book.txt"
	_, err := db.Exec(`INSERT INTO scanfiles(id,book_id,path,status,data) VALUES(1,7,?,'indexed',?),(2,0,?,'expanded','{"archive_entry_count":1}')`, path, string(data), old.Archive)
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 2; i++ {
		if err = RelocateIndexedSource(db, 7, sourcefile.Encode(old), sourcefile.Encode(next)); err != nil {
			t.Fatal(err)
		}
	}
	row, err := GetScanFileByID(db, 1)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(row.Path, next.Archive+"!/"+next.Fingerprint[:16]+"/") || row.Data["archive_source"] != "/books1/new.zip!/book.txt" {
		t.Fatalf("%+v", row)
	}
	parent, _ := GetScanFileByID(db, 2)
	if parent.Path != next.Archive || parent.Data["archive_fingerprint"] != next.Fingerprint || parent.Data["archive_entry_count"] != float64(1) {
		t.Fatalf("%+v", parent)
	}
}

func TestRelocateIndexedSourceReplayPreservesHistory(t *testing.T) {
	db := newSchemaDB(t)
	_, err := db.Exec(`INSERT INTO scanfiles(id,book_id,path,name,status,hash,data) VALUES(1,7,'/books/old.txt','old.txt','indexed','sha256:test','{"source_path":"/books/old.txt"}'),(2,7,'/books/old.txt','old.txt','importing','other','{}')`)
	if err != nil {
		t.Fatal(err)
	}
	hashes, err := IndexedSourceHashes(db)
	if err != nil || hashes["/books/old.txt"] != "sha256:test" {
		t.Fatalf("%v %v", hashes, err)
	}
	for i := 0; i < 2; i++ {
		if err = RelocateIndexedSource(db, 7, "/books/old.txt", "/books1/new.txt"); err != nil {
			t.Fatal(err)
		}
	}
	row, err := GetScanFileByID(db, 1)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := json.Marshal(row.Data)
	if row.Path != "/books1/new.txt" || row.BookID != 7 || row.Data["source_path"] != "/books1/new.txt" {
		t.Fatalf("%+v %s", row, raw)
	}
	running, _ := GetScanFileByID(db, 2)
	if running.Path != "/books/old.txt" || running.Status != "importing" {
		t.Fatal("running import changed")
	}
}

func TestRelocateIndexedSourceLegacyNullData(t *testing.T) {
	db := newSchemaDB(t)
	if _, err := db.Exec(`INSERT INTO scanfiles(id,book_id,path,status,data) VALUES(1,7,'/books/old.txt','indexed','null')`); err != nil {
		t.Fatal(err)
	}
	if err := RelocateIndexedSource(db, 7, "/books/old.txt", "/books/new.txt"); err != nil {
		t.Fatal(err)
	}
	row, err := GetScanFileByID(db, 1)
	if err != nil || row.Path != "/books/new.txt" || row.Data["source_path"] != "/books/new.txt" {
		t.Fatalf("%+v %v", row, err)
	}
}
