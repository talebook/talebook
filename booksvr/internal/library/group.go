package library

import (
	"database/sql"
	"errors"
	"fmt"
)

// BookMeta is the metadata a caller supplies when registering a file.
type BookMeta struct {
	Title      string
	Author     string
	Publisher  string
	Pubdate    string
	Translator string
	Format     string
	Path       string
	Size       int64
	Mtime      int64
	// Tags 是标签列表（可选）。
	Tags []string
	// Comments 是简介（可选）。
	Comments string
}

// GroupResult reports what GroupFile did.
type GroupResult struct {
	WorkID  int64
	BookID  int64
	Format  string
	Created bool   // true when a new book (edition) row was created
	Status  string // "ok" or "samebook"
}

// GroupFile registers one source file into the three-layer model.
//
// Decision order (plan section 5.3):
//
//	work_key hit?
//	  ├─ no  → new work + new book(edition) + add format
//	  └─ yes → edition_key hit?
//	            ├─ no  → new book(edition) under the same work + add format
//	            └─ yes → same book already has this format?
//	                      ├─ yes → {"err": "samebook"} (Status = "samebook")
//	                      └─ no  → add format to the existing book
//
// The source file is never copied, renamed or rewritten.
func GroupFile(db *sql.DB, meta BookMeta) (GroupResult, error) {
	format := NormalizeFormatName(meta.Format)
	if format == "" {
		return GroupResult{}, errors.New("group file: format is required")
	}
	if meta.Path == "" {
		return GroupResult{}, errors.New("group file: path is required")
	}

	workID, err := FindOrCreateWork(db, meta.Title, meta.Author)
	if err != nil {
		return GroupResult{}, err
	}

	bookID, created, err := FindOrCreateEdition(db, workID, meta)
	if err != nil {
		return GroupResult{}, err
	}

	err = RegisterFormat(db, bookID, format, meta.Path, meta.Size, meta.Mtime)
	if errors.Is(err, ErrFormatExists) {
		return GroupResult{
			WorkID:  workID,
			BookID:  bookID,
			Format:  format,
			Created: created,
			Status:  "samebook",
		}, nil
	}
	if err != nil {
		return GroupResult{}, err
	}

	return GroupResult{
		WorkID:  workID,
		BookID:  bookID,
		Format:  format,
		Created: created,
		Status:  "ok",
	}, nil
}

// MergeBooks moves every book in `bookIDs` into the work of `targetBookID`.
//
// It is the manual correction path for the automatic grouping: when the
// normalizer wrongly split one work, an administrator can merge the editions
// back together. The operation is reversible by moving a book to another work.
func MergeBooks(db *sql.DB, targetBookID int64, bookIDs []int64) (int64, error) {
	workID, err := GetBookWorkID(db, targetBookID)
	if err != nil {
		return 0, err
	}

	tx, err := db.Begin()
	if err != nil {
		return 0, fmt.Errorf("merge: begin: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	for _, id := range bookIDs {
		if id == targetBookID {
			continue
		}
		if _, err := tx.Exec(`UPDATE books SET work_id = ? WHERE id = ?`, workID, id); err != nil {
			return 0, fmt.Errorf("merge: move book %d: %w", id, err)
		}
	}
	if err := tx.Commit(); err != nil {
		return 0, fmt.Errorf("merge: commit: %w", err)
	}
	return workID, nil
}

// SplitBook moves a single book into a brand-new work of its own.
//
// This is the inverse of MergeBooks and gives the administrator a way to undo a
// wrong automatic grouping without touching the other editions.
func SplitBook(db *sql.DB, bookID int64) (int64, error) {
	var title, author string
	err := db.QueryRow(`SELECT title, author_sort FROM books WHERE id = ?`, bookID).Scan(&title, &author)
	if err != nil {
		return 0, fmt.Errorf("split: load book %d: %w", bookID, err)
	}

	// Force a distinct work by appending the book id to the display author of
	// the new work, so the UNIQUE work_key constraint cannot collide with the
	// work the book is leaving.
	newWorkID, err := FindOrCreateWork(db, title, fmt.Sprintf("%s#%d", author, bookID))
	if err != nil {
		return 0, err
	}
	if err := SetBookWorkID(db, bookID, newWorkID); err != nil {
		return 0, err
	}
	return newWorkID, nil
}
