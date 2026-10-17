package userdb

import (
	"database/sql"
	"encoding/json"
	"path/filepath"
	"strings"

	"talebook/booksvr/internal/sourcefile"
)

func EnsureSourceSyncIndexes(db *sql.DB) error {
	for _, q := range []string{`CREATE INDEX IF NOT EXISTS idx_source_scan_book ON scanfiles(book_id,status)`, `CREATE INDEX IF NOT EXISTS idx_source_scan_path ON scanfiles(path,status)`} {
		if _, err := db.Exec(q); err != nil {
			return err
		}
	}
	return nil
}

// IndexedSourceHashes reuses completed imports, excluding in-progress rows.
func IndexedSourceHashes(db *sql.DB) (map[string]string, error) {
	rows, err := db.Query(`SELECT path,hash,COALESCE(data,'{}') FROM scanfiles WHERE status='indexed' AND hash LIKE 'sha256:%'`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]string{}
	for rows.Next() {
		var path, hash, data string
		if err = rows.Scan(&path, &hash, &data); err != nil {
			return nil, err
		}
		var extra map[string]any
		if json.Unmarshal([]byte(data), &extra) == nil {
			if source, ok := extra["source_path"].(string); ok && source != "" {
				path = source
			}
		}
		out[path] = hash
	}
	return out, rows.Err()
}

// RelocateIndexedSource is replayable after either database is interrupted.
// It touches neither reading records nor import jobs that are still running.
func RelocateIndexedSource(db *sql.DB, bookID int64, oldPath, newPath string) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	rows, err := tx.Query(`SELECT id,COALESCE(path,''),COALESCE(data,'{}') FROM scanfiles WHERE book_id=? AND status='indexed'`, bookID)
	if err != nil {
		return err
	}
	type update struct {
		id               int64
		path, name, data string
	}
	var updates []update
	for rows.Next() {
		var id int64
		var path, raw string
		if err = rows.Scan(&id, &path, &raw); err != nil {
			rows.Close()
			return err
		}
		extra := map[string]any{}
		if err = json.Unmarshal([]byte(raw), &extra); err != nil {
			rows.Close()
			return err
		}
		if extra == nil {
			extra = map[string]any{}
		}
		source, _ := extra["source_path"].(string)
		if path != oldPath && source != oldPath {
			continue
		}
		extra["source_path"] = newPath
		name := filepath.Base(newPath)
		if sourcefile.IsReference(newPath) {
			ref, e := sourcefile.Decode(newPath)
			if e != nil {
				rows.Close()
				return e
			}
			extra["archive_path"] = ref.Archive
			extra["archive_fingerprint"] = ref.Fingerprint
			extra["archive_chain"] = ref.Chain
			name = ref.Name
			if oldRef, e := sourcefile.Decode(oldPath); e == nil {
				path = strings.Replace(path, oldRef.Archive, ref.Archive, 1)
				if len(oldRef.Fingerprint) >= 16 && len(ref.Fingerprint) >= 16 {
					path = strings.Replace(path, oldRef.Fingerprint[:16], ref.Fingerprint[:16], 1)
				}
				if display, ok := extra["archive_source"].(string); ok {
					extra["archive_source"] = strings.Replace(display, oldRef.Archive, ref.Archive, 1)
				}
			}
		} else {
			path = newPath
		}
		data, e := json.Marshal(extra)
		if e != nil {
			rows.Close()
			return e
		}
		updates = append(updates, update{id, path, name, string(data)})
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	for _, u := range updates {
		if _, err = tx.Exec(`UPDATE scanfiles SET path=?,name=?,data=? WHERE id=? AND status='indexed'`, u.path, u.name, u.data, u.id); err != nil {
			return err
		}
	}
	if _, err = tx.Exec(`UPDATE items SET src_path=? WHERE book_id=? AND src_path=?`, newPath, bookID, oldPath); err != nil {
		return err
	}
	if sourcefile.IsReference(newPath) {
		old, e := sourcefile.Decode(oldPath)
		if e != nil {
			return e
		}
		next, e := sourcefile.Decode(newPath)
		if e != nil {
			return e
		}
		// Update the expanded archive checkpoint once; do not make the scanner
		// re-extract an entire collection just because its container was renamed.
		var id int64
		var raw string
		e = tx.QueryRow(`SELECT id,COALESCE(data,'{}') FROM scanfiles WHERE path=? AND status='expanded' LIMIT 1`, old.Archive).Scan(&id, &raw)
		if e != nil && e != sql.ErrNoRows {
			return e
		}
		if e == nil {
			var data map[string]any
			if e = json.Unmarshal([]byte(raw), &data); e != nil {
				return e
			}
			if data == nil {
				data = map[string]any{}
			}
			data["archive_fingerprint"] = next.Fingerprint
			data["archive_path"] = next.Archive
			body, e := json.Marshal(data)
			if e != nil {
				return e
			}
			if _, e = tx.Exec(`UPDATE scanfiles SET path=?,name=?,data=? WHERE id=? AND status='expanded'`, next.Archive, filepath.Base(next.Archive), string(body), id); e != nil {
				return e
			}
		}
	}
	return tx.Commit()
}
