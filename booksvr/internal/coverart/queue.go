package coverart

import (
	"context"
	"database/sql"
	"time"
)

func MigrateQueue(db *sql.DB) error {
	_, err := db.Exec(`CREATE TABLE IF NOT EXISTS import_cover_jobs(book_id INTEGER PRIMARY KEY REFERENCES books(id) ON DELETE CASCADE,source TEXT NOT NULL,format TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,retry_at INTEGER NOT NULL DEFAULT 0,error TEXT NOT NULL DEFAULT '')`)
	return err
}

func Queue(db *sql.DB, id int64, source, format string) error {
	if !Supported(format) {
		return nil
	}
	_, err := db.Exec(`INSERT INTO import_cover_jobs(book_id,source,format) VALUES(?,?,?) ON CONFLICT(book_id) DO UPDATE SET source=excluded.source,format=excluded.format,attempts=0,retry_at=0,error=''`, id, source, format)
	return err
}

// WorkOne holds no SQL transaction while extracting an image. Workers are
// deliberately bounded by the caller; retry data survives process restarts.
func WorkOne(ctx context.Context, db *sql.DB, root string) (bool, error) {
	var id int64
	var source, format string
	now := time.Now().Unix()
	err := db.QueryRowContext(ctx, `UPDATE import_cover_jobs SET retry_at=? WHERE book_id=(SELECT book_id FROM import_cover_jobs WHERE retry_at<=? ORDER BY book_id LIMIT 1) RETURNING book_id,source,format`, now+120, now).Scan(&id, &source, &format)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if err = Ensure(ctx, db, root, id, source, format); err != nil {
		if ctx.Err() != nil {
			return true, ctx.Err()
		}
		_, e := db.Exec(`UPDATE import_cover_jobs SET attempts=attempts+1,retry_at=?,error=? WHERE book_id=? AND source=?`, time.Now().Add(30*time.Minute).Unix(), err.Error(), id, source)
		return true, e
	}
	_, err = db.Exec(`DELETE FROM import_cover_jobs WHERE book_id=? AND source=?`, id, source)
	return true, err
}
