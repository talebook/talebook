package httpapi

import (
	"database/sql"
	"fmt"
	"strings"
)

// normalizeBookEditArgs accepts the legacy form's explicit clear marker without
// ever storing it as metadata. Omitted fields remain omitted.
func normalizeBookEditArgs(args map[string]any) map[string]any {
	out := make(map[string]any, len(args))
	for key, value := range args {
		if text, ok := value.(string); ok && text == "__DELETE__" {
			value = ""
		}
		if key == "authors" || key == "tags" || key == "aliases" {
			values := toStringSlice(value)
			if len(values) == 1 && values[0] == "__DELETE__" {
				values = []string{}
			}
			value = values
		}
		out[key] = value
	}
	return out
}

func updateAdditionalBookMeta(tx *sql.Tx, bookID int64, args map[string]any) error {
	if value, ok := args["author_sort"]; ok {
		if _, err := tx.Exec(`UPDATE books SET author_sort=? WHERE id=?`, strings.TrimSpace(stringOf(value)), bookID); err != nil {
			return err
		}
	}
	// Table and column names are constants, never supplied by the request.
	for _, field := range []struct{ key, table, column, link, linkColumn string }{
		{"publisher", "publishers", "name", "books_publishers_link", "publisher"},
		{"language", "languages", "lang_code", "books_languages_link", "lang_code"},
		{"rating", "ratings", "rating", "books_ratings_link", "rating"},
	} {
		value, ok := args[field.key]
		if !ok {
			continue
		}
		if _, err := tx.Exec(fmt.Sprintf("DELETE FROM %s WHERE book = ?", field.link), bookID); err != nil {
			return err
		}
		name := strings.TrimSpace(stringOf(value))
		if name == "" || (field.key == "rating" && name == "0") {
			continue
		}
		id, err := ensureNamedRow(tx, field.table, field.column, name)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(fmt.Sprintf("INSERT INTO %s (book, %s) VALUES (?, ?)", field.link, field.linkColumn), bookID, id); err != nil {
			return err
		}
	}
	if value, ok := args["isbn"]; ok {
		if _, err := tx.Exec(`DELETE FROM identifiers WHERE book = ? AND type = 'isbn'`, bookID); err != nil {
			return err
		}
		if isbn := strings.TrimSpace(stringOf(value)); isbn != "" {
			if _, err := tx.Exec(`INSERT INTO identifiers (book, type, val) VALUES (?, 'isbn', ?)`, bookID, isbn); err != nil {
				return err
			}
		}
	}
	if value, ok := args["pubdate"]; ok {
		date := strings.TrimSpace(stringOf(value))
		if strings.EqualFold(date, "unknown") {
			date = ""
		}
		if _, err := tx.Exec(`UPDATE books SET pubdate = NULLIF(?, '') WHERE id = ?`, date, bookID); err != nil {
			return err
		}
	}
	return nil
}
