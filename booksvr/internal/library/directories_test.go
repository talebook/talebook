package library

import (
	"context"
	"reflect"
	"strings"
	"testing"

	"talebook/booksvr/internal/sourcefile"
)

func TestBookDirectoryDefaultDirectRecursiveAndPrivacy(t *testing.T) {
	db := openTestDB(t)
	if err := Migrate(db); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`CREATE TABLE data(book INTEGER,name TEXT,format TEXT)`); err != nil {
		t.Fatal(err)
	}
	for _, r := range []struct {
		id           int
		file, format string
	}{
		{1, "/books/direct.epub", "EPUB"}, {1, "/books/direct.pdf", "PDF"}, {1, "/books/child/also.mobi", "MOBI"},
		{2, "/books/child/nested.epub", "EPUB"}, {3, "/books-other/sibling.pdf", "PDF"},
		{4, "/private/hidden.pdf", "PDF"}, {5, "/gone/missing.pdf", "PDF"},
		{6, sourcefile.Encode(sourcefile.Reference{Archive: "/books/archives/pack.zip", Chain: []string{"deep/member.epub"}, Hash: "sha256:" + strings.Repeat("a", 64), Size: 64}), "EPUB"},
	} {
		sourceRegister(t, db, r.id, r.file, r.format)
	}
	if _, err := db.Exec(`INSERT INTO source_sync_formats(format_id,identity,size,mtime,missing) SELECT id,'',4,0,1 FROM book_formats WHERE book_id=5`); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO books(id,title,path) VALUES(7,'Managed','Author/Title');INSERT INTO data(book,name,format) VALUES(7,'title','EPUB')`); err != nil {
		t.Fatal(err)
	}
	excluded := map[int64]bool{4: true}
	dirs, ids, err := BrowseBookDirectory(context.Background(), db, "/managed", "/books", false, excluded)
	if err != nil || !reflect.DeepEqual(ids, []int64{1}) || len(dirs) != 2 {
		t.Fatalf("dirs=%+v ids=%v err=%v", dirs, ids, err)
	}
	if dirs[0].Path != "/books/archives" || dirs[0].Count != 1 || dirs[0].HasChildren {
		t.Fatal(dirs)
	}
	_, ids, err = BrowseBookDirectory(context.Background(), db, "/managed", "/books", true, excluded)
	if err != nil || !reflect.DeepEqual(ids, []int64{6, 2, 1}) {
		t.Fatal(ids, err)
	}
	dirs, _, err = BrowseBookDirectory(context.Background(), db, "/managed", "", false, excluded)
	if err != nil || len(dirs) != 3 {
		t.Fatal(dirs, err)
	}
	for _, d := range dirs {
		if d.Path == "/private" || d.Path == "/gone" {
			t.Fatal(d)
		}
	}
	_, ids, err = BrowseBookDirectory(context.Background(), db, "/managed", "/managed/Author/Title", false, excluded)
	if err != nil || !reflect.DeepEqual(ids, []int64{7}) {
		t.Fatal(ids, err)
	}
}
