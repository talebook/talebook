package library

import (
	"database/sql"
	"time"

	"talebook/booksvr/internal/normalize"
)

// RepairTitle uses a short optimistic transaction. It never renames a shared
// work or merges/deletes books. A concurrent manual title edit wins.
func RepairTitle(db *sql.DB, id int64, oldTitle, newTitle, expectedAuthor string, expectedWork sql.NullInt64) (bool, error) {
	tx, err := db.Begin()
	if err != nil {
		return false, err
	}
	defer tx.Rollback()
	var title, author string
	var work sql.NullInt64
	if err = tx.QueryRow(`SELECT title, coalesce(author_sort,''), work_id FROM books WHERE id=?`, id).Scan(&title, &author, &work); err != nil {
		return false, err
	}
	if title != oldTitle || author != expectedAuthor || work != expectedWork {
		return false, nil
	}
	now := time.Now().Unix()
	key := normalize.WorkKey(newTitle, author)
	_, err = tx.Exec(`INSERT INTO works(title_norm,author_norm,work_key,display_title,display_author,created_at,updated_at)
	VALUES(?,?,?,?,?,?,?) ON CONFLICT(work_key) DO NOTHING`, normalize.NormalizeTitle(newTitle), normalize.NormalizeAuthor(author), key, newTitle, author, now, now)
	if err != nil {
		return false, err
	}
	var workID int64
	if err = tx.QueryRow(`SELECT id FROM works WHERE work_key=?`, key).Scan(&workID); err != nil {
		return false, err
	}
	_, err = tx.Exec(`UPDATE books SET title=?, sort=?, title_norm=?, author_norm=?, work_id=?, last_modified=datetime('now') WHERE id=? AND title=?`, newTitle, newTitle, normalize.NormalizeTitle(newTitle), normalize.NormalizeAuthor(author), workID, id, oldTitle)
	if err != nil {
		return false, err
	}
	return true, tx.Commit()
}
