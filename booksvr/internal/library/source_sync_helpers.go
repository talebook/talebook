package library

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"talebook/booksvr/internal/sourcefile"
)

func sourceMovedPath(path string, moves []SourceMove) string {
	current := path
	for _, move := range moves {
		if current == move.From {
			current = move.To
		} else if sourceWithin(current, move.From) {
			rel, err := filepath.Rel(move.From, current)
			if err == nil {
				current = filepath.Join(move.To, rel)
			}
		}
	}
	if current == path {
		return ""
	}
	return current
}

func NeedsSourceHashes(db *sql.DB, libraryRoot string) (bool, error) {
	rows, err := db.Query(`SELECT path FROM book_formats WHERE hash IS NULL OR hash=''`)
	if err != nil {
		return false, err
	}
	defer rows.Close()
	for rows.Next() {
		var path string
		if err = rows.Scan(&path); err != nil {
			return false, err
		}
		physical := path
		if sourcefile.IsReference(path) {
			ref, e := sourcefile.Decode(path)
			if e != nil {
				continue
			}
			physical = ref.Archive
		}
		if filepath.IsAbs(physical) && (libraryRoot == "" || !sourceWithin(physical, libraryRoot)) {
			return true, nil
		}
	}
	return false, rows.Err()
}

// A dangling symbolic link does not prove that the target mount is healthy.
// Removing the link itself remains a normal source deletion.
func sourcePathHasSymlink(path string) bool {
	for {
		info, err := os.Lstat(path)
		if err == nil && info.Mode()&os.ModeSymlink != 0 {
			return true
		}
		parent := filepath.Dir(path)
		if parent == path {
			return false
		}
		path = parent
	}
}

func verifyRelocatedArchive(ctx context.Context, refs []sourcefile.Reference, path string) bool {
	fp, err := sourcefile.Fingerprint(path)
	if err != nil {
		return false
	}
	for _, ref := range refs {
		ref.Archive = path
		ref.Fingerprint = fp
		_, release, err := sourcefile.Acquire(ctx, sourcefile.Encode(ref))
		if err != nil {
			return false
		}
		release()
	}
	return true
}

// Parent roots cover their children exactly once, including health validation.
func normalizeSourceRoots(roots []string) []string {
	var clean []string
	for _, root := range roots {
		if strings.TrimSpace(root) == "" {
			continue
		}
		abs, err := filepath.Abs(root)
		if err == nil {
			clean = append(clean, filepath.Clean(abs))
		}
	}
	sort.Slice(clean, func(i, j int) bool { return len(clean[i]) < len(clean[j]) })
	var out []string
	for _, root := range clean {
		covered := false
		for _, parent := range out {
			if sourceWithin(root, parent) {
				covered = true
				break
			}
		}
		if !covered {
			out = append(out, root)
		}
	}
	return out
}

func missingSourceFormats(db *sql.DB, ph string, args []any) (map[int64]map[string]bool, error) {
	out := map[int64]map[string]bool{}
	var exists int
	if err := db.QueryRow(`SELECT count(*) FROM sqlite_master WHERE type='table' AND name='source_sync_formats'`).Scan(&exists); err != nil {
		return nil, err
	}
	if exists == 0 {
		return out, nil
	}
	rows, err := db.Query(fmt.Sprintf(`SELECT f.book_id,UPPER(f.format) FROM book_formats f CROSS JOIN source_sync_formats s ON s.format_id=f.id WHERE f.book_id IN (%s) AND s.missing=1`, ph), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var id int64
		var format string
		if err = rows.Scan(&id, &format); err != nil {
			return nil, err
		}
		if out[id] == nil {
			out[id] = map[string]bool{}
		}
		out[id][format] = true
	}
	return out, rows.Err()
}
