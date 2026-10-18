package coverart

import (
	"context"
	"database/sql"
	_ "modernc.org/sqlite"
	"testing"
)

func TestCoverQueuePersistsRetriesAndCancellation(t *testing.T) {
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	db.SetMaxOpenConns(1)
	db.Exec(`CREATE TABLE books(id INTEGER PRIMARY KEY,path TEXT,has_cover INTEGER)`)
	db.Exec(`INSERT INTO books VALUES(1,'',0)`)
	if err = MigrateQueue(db); err != nil {
		t.Fatal(err)
	}
	if err = Queue(db, 1, "/does-not-exist.epub", "EPUB"); err != nil {
		t.Fatal(err)
	}
	worked, err := WorkOne(context.Background(), db, t.TempDir())
	if err != nil || !worked {
		t.Fatal(worked, err)
	}
	var attempts int
	var message string
	db.QueryRow(`SELECT attempts,error FROM import_cover_jobs`).Scan(&attempts, &message)
	if attempts != 1 || message == "" {
		t.Fatal(attempts, message)
	}
	if worked, err = WorkOne(context.Background(), db, t.TempDir()); worked || err != nil {
		t.Fatal("retry busy loop", worked, err)
	}
	Queue(db, 1, "/changed.epub", "EPUB")
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	WorkOne(ctx, db, t.TempDir())
	var count int
	db.QueryRow(`SELECT count(*) FROM import_cover_jobs`).Scan(&count)
	if count != 1 {
		t.Fatal("cancellation dropped queue")
	}
}
