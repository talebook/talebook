// Package migrate imports an existing Calibre library into the booksvr schema.
//
// The migration is strictly one-way and read-only with respect to the source:
// the Calibre metadata.db is opened read-only and never written, so the
// original library stays usable by Calibre desktop.
package migrate

import (
	"database/sql"
	"errors"
	"fmt"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	_ "modernc.org/sqlite"

	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/normalize"
)

// sourceBook is one row of the Calibre `books` table joined with its author,
// publisher and formats.
type sourceBook struct {
	ID        int64
	Title     string
	Author    string
	Publisher string
	Pubdate   string
	Path      string
	Formats   []sourceFormat
}

type sourceFormat struct {
	Format string
	Size   int64
	Name   string
}

// ImportCalibre reads a Calibre metadata.db and registers every book into the
// target database using the three-layer model.
//
// libraryRoot is the Calibre library directory (the parent of metadata.db); it
// is used to resolve each book's on-disk directory. Files are registered in
// place and are never copied, renamed or rewritten.
//
// The import is idempotent: running it twice against the same source produces
// the same target state.
func ImportCalibre(target *sql.DB, sourcePath, libraryRoot string) (Report, error) {
	start := time.Now()
	var report Report

	absSource, err := filepath.Abs(sourcePath)
	if err != nil {
		return report, fmt.Errorf("calibre import: resolve source path: %w", err)
	}
	absRoot, err := filepath.Abs(libraryRoot)
	if err != nil {
		return report, fmt.Errorf("calibre import: resolve library root: %w", err)
	}

	// Open the source read-only so a bug can never corrupt the user's library.
	source, err := sql.Open("sqlite", "file:"+absSource+"?mode=ro")
	if err != nil {
		return report, fmt.Errorf("calibre import: open source: %w", err)
	}
	defer source.Close()

	if err := source.Ping(); err != nil {
		return report, fmt.Errorf("calibre import: open source %s: %w", absSource, err)
	}

	books, err := readSourceBooks(source)
	if err != nil {
		return report, err
	}
	report.SourceBooks = len(books)

	// createdThisRun 记录本次运行中新建的 edition。
	//
	// Merged 只统计「多个源书在本次运行里塌缩到同一个 edition」——
	// 那才是自动归组真正做的合并。若把「命中已存在的 edition」也算进去，
	// 重跑同一源库时每本书都会命中，Merged 会虚增到 SourceBooks，
	// 报告就不再幂等（数据本身是幂等的）。
	createdThisRun := map[int64]bool{}
	// registeredThisRun 记录本次运行中新建的 format 行，用于区分
	// 「源库自身重复」与「重跑时命中已有行」。
	registeredThisRun := map[string]bool{}

	for _, b := range books {
		if len(b.Formats) == 0 {
			report.Skipped++
			continue
		}

		editionKey := normalize.EditionKey(normalize.EditionMeta{
			Publisher:  b.Publisher,
			Pubdate:    normalizePubdate(b.Pubdate),
			Translator: "",
			Suffixes:   normalize.ExtractVersionSuffix(normalize.NormalizePunct(normalize.NormalizeWidth(b.Title))).Suffixes,
		})
		if editionKey == "" {
			report.EmptyFingerprints++
		}

		workID, err := library.FindOrCreateWork(target, b.Title, b.Author)
		if err != nil {
			return report, fmt.Errorf("calibre import: book %d: %w", b.ID, err)
		}

		bookID, created, err := findOrCreateImportedEdition(target, workID, b)
		if err != nil {
			return report, fmt.Errorf("calibre import: book %d: %w", b.ID, err)
		}
		if created {
			createdThisRun[bookID] = true
		} else if createdThisRun[bookID] {
			// 本次运行里已建过这个 edition，说明两本源书被归到了同一版本。
			report.Merged++
		}

		for _, f := range b.Formats {
			path := resolveFormatPath(absRoot, b.Path, f.Name, f.Format)
			err := library.RegisterFormat(target, bookID, f.Format, path, f.Size, 0)
			if errors.Is(err, library.ErrFormatExists) {
				// 同一 edition 已有该格式。只在本次运行里刚登记过时计数：
				// 重跑时每个格式都已存在，全算进去会让计数虚增。
				if registeredThisRun[formatKey(bookID, f.Format)] {
					report.DuplicateFormats++
				}
				continue
			}
			registeredThisRun[formatKey(bookID, f.Format)] = true
			if err != nil {
				return report, fmt.Errorf("calibre import: book %d format %s: %w", b.ID, f.Format, err)
			}
		}
	}

	report.Works = count(target, "works")
	report.Editions = count(target, "books")
	report.Formats = count(target, "book_formats")
	report.Duration = time.Since(start)
	return report, nil
}

// findOrCreateImportedEdition resolves the edition for one source book.
//
// It differs from library.FindOrCreateEdition in one respect: when the edition
// fingerprint is empty, library.FindOrCreateEdition deliberately creates a new
// edition every time (so that unrelated books are never auto-merged). During a
// migration that would break idempotency, so the importer instead matches an
// existing fingerprint-less edition of the same work by its source path.
func findOrCreateImportedEdition(target *sql.DB, workID int64, b sourceBook) (int64, bool, error) {
	editionKey := normalize.EditionKey(normalize.EditionMeta{
		Publisher: b.Publisher,
		Pubdate:   normalizePubdate(b.Pubdate),
		Suffixes:  normalize.ExtractVersionSuffix(normalize.NormalizePunct(normalize.NormalizeWidth(b.Title))).Suffixes,
	})

	if editionKey == "" {
		// Match a previously imported fingerprint-less edition of this work by
		// the source directory recorded on its formats.
		var id int64
		err := target.QueryRow(
			`SELECT b.id FROM books b
			 JOIN book_formats f ON f.book_id = b.id
			 WHERE b.work_id = ? AND (b.edition_key IS NULL OR b.edition_key = '')
			   AND f.path LIKE ?
			 ORDER BY b.id LIMIT 1`,
			workID, "%"+filepath.FromSlash(b.Path)+"%",
		).Scan(&id)
		if err == nil {
			return id, false, nil
		}
		if !errors.Is(err, sql.ErrNoRows) {
			return 0, false, fmt.Errorf("find imported edition: %w", err)
		}
	}

	return library.FindOrCreateEdition(target, workID, library.BookMeta{
		Title:     b.Title,
		Author:    b.Author,
		Publisher: b.Publisher,
		Pubdate:   normalizePubdate(b.Pubdate),
	})
}

// formatKey 是 (bookID, format) 的复合键，用于本次运行的登记去重。
func formatKey(bookID int64, format string) string {
	return strconv.FormatInt(bookID, 10) + "\x1f" + strings.ToUpper(format)
}

// readSourceBooks loads every book with its author, publisher and formats.
func readSourceBooks(source *sql.DB) ([]sourceBook, error) {
	rows, err := source.Query(`
		SELECT b.id,
		       b.title,
		       COALESCE((SELECT a.name FROM authors a
		                 JOIN books_authors_link l ON l.author = a.id
		                 WHERE l.book = b.id LIMIT 1), '') AS author,
		       COALESCE((SELECT p.name FROM publishers p
		                 JOIN books_publishers_link l ON l.publisher = p.id
		                 WHERE l.book = b.id LIMIT 1), '') AS publisher,
		       COALESCE(b.pubdate, '') AS pubdate,
		       COALESCE(b.path, '') AS path
		FROM books b
		ORDER BY b.id`)
	if err != nil {
		return nil, fmt.Errorf("calibre import: read books: %w", err)
	}
	defer rows.Close()

	var books []sourceBook
	index := map[int64]int{}
	for rows.Next() {
		var b sourceBook
		if err := rows.Scan(&b.ID, &b.Title, &b.Author, &b.Publisher, &b.Pubdate, &b.Path); err != nil {
			return nil, fmt.Errorf("calibre import: scan book: %w", err)
		}
		index[b.ID] = len(books)
		books = append(books, b)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("calibre import: iterate books: %w", err)
	}

	frows, err := source.Query(`SELECT book, format, uncompressed_size, name FROM data ORDER BY book, format`)
	if err != nil {
		return nil, fmt.Errorf("calibre import: read formats: %w", err)
	}
	defer frows.Close()

	for frows.Next() {
		var (
			bookID int64
			f      sourceFormat
		)
		if err := frows.Scan(&bookID, &f.Format, &f.Size, &f.Name); err != nil {
			return nil, fmt.Errorf("calibre import: scan format: %w", err)
		}
		if i, ok := index[bookID]; ok {
			books[i].Formats = append(books[i].Formats, f)
		}
	}
	if err := frows.Err(); err != nil {
		return nil, fmt.Errorf("calibre import: iterate formats: %w", err)
	}

	return books, nil
}

// resolveFormatPath builds the absolute path of a format file.
//
// Calibre stores `books.path` as a library-relative directory and `data.name`
// as the filename stem; the extension is the lower-cased format. The file is
// referenced where it already lives — nothing is copied or renamed.
func resolveFormatPath(libraryRoot, bookPath, name, format string) string {
	filename := name + "." + strings.ToLower(format)
	return filepath.Join(libraryRoot, filepath.FromSlash(bookPath), filename)
}

// normalizePubdate reduces a Calibre timestamp to a comparable year string.
//
// Calibre stores "2008-01-01 00:00:00+00:00"; the edition fingerprint only
// needs the year, and a missing/zero date must stay empty so the fingerprint
// remains empty and the book is never auto-merged.
func normalizePubdate(pubdate string) string {
	pubdate = strings.TrimSpace(pubdate)
	if pubdate == "" {
		return ""
	}
	// Reject Calibre's "zero" dates such as 0101-01-01.
	if strings.HasPrefix(pubdate, "0101") || strings.HasPrefix(pubdate, "0001") {
		return ""
	}
	if len(pubdate) >= 4 {
		year := pubdate[:4]
		if year >= "1000" && year <= "9999" {
			return year
		}
	}
	return ""
}

// count returns the row count of a table in the target database.
func count(db *sql.DB, table string) int {
	var n int
	if err := db.QueryRow(`SELECT COUNT(*) FROM ` + table).Scan(&n); err != nil {
		return 0
	}
	return n
}
