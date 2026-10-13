package library

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"talebook/booksvr/internal/normalize"
)

// Work is the top layer: one work groups every edition of the same book.
type Work struct {
	ID            int64
	TitleNorm     string
	AuthorNorm    string
	WorkKey       string
	DisplayTitle  string
	DisplayAuthor string
	CreatedAt     int64
	UpdatedAt     int64
}

// FindOrCreateWork returns the work matching the normalized title+author,
// creating it when absent.
//
// The lookup key is work_key = title_norm + \x1f + author_norm, so
// 《三体》/《三體（第二版）》 and 刘慈欣/刘慈欣 著 all resolve to one work.
func FindOrCreateWork(db *sql.DB, title, author string) (int64, error) {
	titleNorm := normalize.NormalizeTitle(title)
	authorNorm := normalize.NormalizeAuthor(author)
	workKey := normalize.WorkKey(title, author)

	var id int64
	err := db.QueryRow(`SELECT id FROM works WHERE work_key = ?`, workKey).Scan(&id)
	if err == nil {
		return id, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return 0, fmt.Errorf("find work: %w", err)
	}

	now := time.Now().Unix()
	res, err := db.Exec(
		`INSERT INTO works (title_norm, author_norm, work_key, display_title, display_author, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		titleNorm, authorNorm, workKey, title, author, now, now,
	)
	if err != nil {
		// A concurrent insert may have won the race; re-read instead of failing.
		if err2 := db.QueryRow(`SELECT id FROM works WHERE work_key = ?`, workKey).Scan(&id); err2 == nil {
			return id, nil
		}
		return 0, fmt.Errorf("insert work: %w", err)
	}
	id, err = res.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("work last insert id: %w", err)
	}
	return id, nil
}

// GetWork loads a work by id.
func GetWork(db *sql.DB, id int64) (*Work, error) {
	w := &Work{}
	err := db.QueryRow(
		`SELECT id, title_norm, author_norm, work_key, display_title, display_author, created_at, updated_at
		 FROM works WHERE id = ?`, id,
	).Scan(&w.ID, &w.TitleNorm, &w.AuthorNorm, &w.WorkKey, &w.DisplayTitle, &w.DisplayAuthor, &w.CreatedAt, &w.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get work %d: %w", id, err)
	}
	return w, nil
}

// ListVersions returns every book (edition) belonging to a work, oldest first.
func ListVersions(db *sql.DB, workID int64) ([]int64, error) {
	rows, err := db.Query(`SELECT id FROM books WHERE work_id = ? ORDER BY id`, workID)
	if err != nil {
		return nil, fmt.Errorf("list versions: %w", err)
	}
	defer rows.Close()

	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scan version id: %w", err)
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}
