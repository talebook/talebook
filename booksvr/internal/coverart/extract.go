// Package coverart extracts small, managed artwork without modifying source books.
package coverart

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"talebook/booksvr/internal/epubmeta"
	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/mobimeta"
	"talebook/booksvr/internal/sourcefile"
	"time"
)

func Supported(format string) bool {
	switch strings.ToUpper(format) {
	case "EPUB", "MOBI", "AZW", "AZW3", "PDF":
		return true
	}
	return false
}

// Ensure preserves an existing cover, releases archive scratch on every path,
// and deliberately distinguishes no embedded artwork from an extraction error.
func Ensure(ctx context.Context, db *sql.DB, root string, id int64, source, format string) error {
	if !Supported(format) {
		return nil
	}
	existing, err := library.Cover(db, id, root)
	if err != nil {
		return err
	}
	if len(existing) > 0 {
		_, err = db.Exec(`UPDATE books SET has_cover=1 WHERE id=? AND COALESCE(has_cover,0)=0`, id)
		return err
	}
	physical, release, err := sourcefile.Acquire(ctx, source)
	if err != nil {
		return err
	}
	defer release()
	var data []byte
	var ok bool
	if strings.EqualFold(format, "PDF") {
		scratch, err := os.MkdirTemp("", "talebook-cover-*")
		if err != nil {
			return err
		}
		defer os.RemoveAll(scratch)
		child, cancel := context.WithTimeout(ctx, 30*time.Second)
		defer cancel()
		prefix := filepath.Join(scratch, "page")
		if err := exec.CommandContext(child, "pdftoppm", "-f", "1", "-l", "1", "-singlefile", "-scale-to", "1200", "-jpeg", physical, prefix).Run(); err != nil {
			return fmt.Errorf("PDF first page: %w", err)
		}
		data, err = os.ReadFile(prefix + ".jpg")
		if err != nil {
			return err
		}
		ok = true
	} else {
		if strings.EqualFold(format, "EPUB") {
			data, ok, err = epubmeta.CoverFile(physical)
		} else {
			data, ok, err = mobimeta.CoverFile(physical)
		}
		if err != nil {
			return err
		}
	}

	if !ok {
		return nil
	}
	_, err = library.StoreCover(db, root, id, data)
	return err
}
