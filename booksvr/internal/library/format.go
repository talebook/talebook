package library

import (
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// Format is one physical file registered for a book.
type Format struct {
	ID     int64
	BookID int64
	Format string
	Path   string
	Size   int64
	Mtime  int64
	Hash   sql.NullString
}

// ErrFormatExists is returned by RegisterFormat when the book already has that
// format. Callers translate it into the existing {"err": "samebook"} response.
var ErrFormatExists = errors.New("format already registered for this book")

// RegisterFormat records a source file for a book WITHOUT copying, renaming or
// rewriting it. The stored path is absolute so that the library no longer
// depends on a single library root directory.
func RegisterFormat(db *sql.DB, bookID int64, format, path string, size, mtime int64) error {
	// Normalize defensively: callers may pass "epub" while the stored value is
	// "EPUB", and the UNIQUE(book_id, format) constraint is case-sensitive.
	format = NormalizeFormatName(format)

	abs, err := filepath.Abs(path)
	if err != nil {
		return fmt.Errorf("resolve absolute path for %q: %w", path, err)
	}

	var existing int64
	err = db.QueryRow(`SELECT id FROM book_formats WHERE book_id = ? AND format = ?`, bookID, format).Scan(&existing)
	if err == nil {
		return ErrFormatExists
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("check existing format: %w", err)
	}

	if _, err := db.Exec(
		`INSERT INTO book_formats (book_id, format, path, size, mtime) VALUES (?, ?, ?, ?, ?)`,
		bookID, format, abs, size, mtime,
	); err != nil {
		return fmt.Errorf("insert format: %w", err)
	}
	return nil
}

// ResolvePath returns the absolute path of a book's format.
//
// A missing file is reported as missing rather than deleting the record: the
// database keeps the fact that the format was registered, so a later rescan can
// restore it without losing metadata.
func ResolvePath(db *sql.DB, bookID int64, format string) (path string, missing bool, err error) {
	format = NormalizeFormatName(format)
	err = db.QueryRow(`SELECT path FROM book_formats WHERE book_id = ? AND format = ?`, bookID, format).Scan(&path)
	if err != nil {
		return "", false, fmt.Errorf("resolve path for book %d format %s: %w", bookID, format, err)
	}
	if _, statErr := os.Stat(path); statErr != nil {
		if os.IsNotExist(statErr) {
			return path, true, nil
		}
		return path, false, fmt.Errorf("stat %q: %w", path, statErr)
	}
	return path, false, nil
}

// ListFormats returns every format registered for a book, ordered by format.
func ListFormats(db *sql.DB, bookID int64) ([]Format, error) {
	rows, err := db.Query(
		`SELECT id, book_id, format, path, size, mtime, hash FROM book_formats WHERE book_id = ? ORDER BY format`,
		bookID,
	)
	if err != nil {
		return nil, fmt.Errorf("list formats: %w", err)
	}
	defer rows.Close()

	var out []Format
	for rows.Next() {
		var f Format
		if err := rows.Scan(&f.ID, &f.BookID, &f.Format, &f.Path, &f.Size, &f.Mtime, &f.Hash); err != nil {
			return nil, fmt.Errorf("scan format: %w", err)
		}
		out = append(out, f)
	}
	return out, rows.Err()
}

// NormalizeFormatName upper-cases a format name so that "epub" and "EPUB" are
// the same format, matching the existing Talebook convention.
func NormalizeFormatName(format string) string {
	return strings.ToUpper(strings.TrimSpace(format))
}
