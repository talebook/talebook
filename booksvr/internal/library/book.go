package library

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"talebook/booksvr/internal/normalize"
)

// FindOrCreateEdition returns the book (edition) row matching the edition
// fingerprint under the given work, creating it when absent.
//
// An empty edition_key means "no fingerprint": such books are NEVER auto-merged
// and each becomes its own edition. This is the deliberate safety valve against
// wrongly merging unrelated books.
func FindOrCreateEdition(db *sql.DB, workID int64, meta BookMeta) (int64, bool, error) {
	// Extract the version suffix from the RAW title: NormalizeTitle already
	// strips it, so extracting afterwards would always yield nothing.
	suffixes := normalize.ExtractVersionSuffix(normalize.NormalizePunct(normalize.NormalizeWidth(meta.Title))).Suffixes

	editionKey := normalize.EditionKey(normalize.EditionMeta{
		Publisher:  meta.Publisher,
		Pubdate:    meta.Pubdate,
		Translator: meta.Translator,
		Suffixes:   suffixes,
	})

	if editionKey != "" {
		var id int64
		err := db.QueryRow(
			`SELECT id FROM books WHERE work_id = ? AND edition_key = ? ORDER BY id LIMIT 1`,
			workID, editionKey,
		).Scan(&id)
		if err == nil {
			return id, false, nil
		}
		if !errors.Is(err, sql.ErrNoRows) {
			return 0, false, fmt.Errorf("find edition: %w", err)
		}
	}

	now := time.Now().Unix()
	titleNorm := normalize.NormalizeTitle(meta.Title)
	authorNorm := normalize.NormalizeAuthor(meta.Author)

	res, err := db.Exec(
		`INSERT INTO books (title, author_sort, path, timestamp, work_id, edition_key, title_norm, author_norm)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		meta.Title, meta.Author, "", now, workID, editionKey, titleNorm, authorNorm,
	)
	if err != nil {
		return 0, false, fmt.Errorf("insert edition: %w", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		return 0, false, fmt.Errorf("edition last insert id: %w", err)
	}
	return id, true, nil
}

// GetBookWorkID returns the work a book belongs to.
func GetBookWorkID(db *sql.DB, bookID int64) (int64, error) {
	var workID sql.NullInt64
	if err := db.QueryRow(`SELECT work_id FROM books WHERE id = ?`, bookID).Scan(&workID); err != nil {
		return 0, fmt.Errorf("get book %d work_id: %w", bookID, err)
	}
	if !workID.Valid {
		return 0, fmt.Errorf("book %d has no work_id", bookID)
	}
	return workID.Int64, nil
}

// SetBookWorkID moves a book into another work. Used by the manual merge path.
func SetBookWorkID(db *sql.DB, bookID, workID int64) error {
	if _, err := db.Exec(`UPDATE books SET work_id = ? WHERE id = ?`, workID, bookID); err != nil {
		return fmt.Errorf("set book %d work_id: %w", bookID, err)
	}
	return nil
}
