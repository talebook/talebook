package library

import (
	"context"
	"testing"
	"time"
)

func TestDirectoryCacheRefreshExpiryAndCurrentVisibility(t *testing.T) {
	db := openTestDB(t)
	if err := Migrate(db); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`CREATE TABLE data(book INTEGER,name TEXT,format TEXT)`); err != nil {
		t.Fatal(err)
	}
	sourceRegister(t, db, 1, "/old/a.pdf", "PDF")
	sourceRegister(t, db, 2, "/private/b.epub", "EPUB")
	cache := NewBookDirectoryCache(db, "")
	now := time.Now()
	cache.now = func() time.Time { return now }
	ctx := context.Background()
	dirs, _, err := cache.Browse(ctx, "guest", "", false, false, map[int64]bool{2: true})
	if err != nil || len(dirs) != 1 || dirs[0].Path != "/old" {
		t.Fatal(dirs, err)
	}
	if _, err := db.Exec(`UPDATE book_formats SET path='/new/a.pdf' WHERE book_id=1`); err != nil {
		t.Fatal(err)
	}
	dirs, _, err = cache.Browse(ctx, "guest", "", false, false, map[int64]bool{2: true})
	if err != nil || dirs[0].Path != "/old" {
		t.Fatal(dirs, err)
	}
	dirs, _, err = cache.Browse(ctx, "guest", "", false, true, map[int64]bool{2: true})
	if err != nil || dirs[0].Path != "/new" {
		t.Fatal(dirs, err)
	}
	// Revocation and another viewer never reuse a broader visibility snapshot.
	dirs, _, err = cache.Browse(ctx, "guest", "", false, false, map[int64]bool{1: true, 2: true})
	if err != nil || len(dirs) != 0 {
		t.Fatal(dirs, err)
	}
	dirs, _, err = cache.Browse(ctx, "admin", "", false, false, nil)
	if err != nil || len(dirs) != 2 {
		t.Fatal(dirs, err)
	}
	if _, err := db.Exec(`INSERT INTO source_sync_formats(format_id,identity,size,mtime,missing) SELECT id,'',4,0,1 FROM book_formats WHERE book_id=1`); err != nil {
		t.Fatal(err)
	}
	dirs, _, err = cache.Browse(ctx, "admin", "", false, false, nil)
	if err != nil || len(dirs) != 1 || dirs[0].Path != "/private" {
		t.Fatal(dirs, err)
	}
	if _, err := db.Exec(`DELETE FROM books WHERE id=2`); err != nil {
		t.Fatal(err)
	}
	dirs, _, err = cache.Browse(ctx, "admin", "", false, false, nil)
	if err != nil || len(dirs) != 0 {
		t.Fatal(dirs, err)
	}
	if _, err := db.Exec(`UPDATE source_sync_formats SET missing=0; UPDATE book_formats SET path='/later/a.pdf' WHERE book_id=1`); err != nil {
		t.Fatal(err)
	}
	now = now.Add(31 * time.Second)
	dirs, _, err = cache.Browse(ctx, "admin", "", false, false, nil)
	if err != nil || len(dirs) != 1 || dirs[0].Path != "/later" {
		t.Fatal(dirs, err)
	}
}
