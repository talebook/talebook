package library

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/binary"
	"fmt"
	"sort"
	"sync"
	"time"
)

type directorySnapshot struct {
	locations []bookDirectoryLocation
	updated   time.Time
}

// BookDirectoryCache stores no book bodies or full metadata. Snapshots are
// isolated by viewer and exclusion set and are never shared across databases.
type BookDirectoryCache struct {
	db      *sql.DB
	root    string
	mu      sync.Mutex
	entries map[string]directorySnapshot
	now     func() time.Time
}

func NewBookDirectoryCache(db *sql.DB, root string) *BookDirectoryCache {
	return &BookDirectoryCache{db: db, root: root, entries: map[string]directorySnapshot{}, now: time.Now}
}

func directoryVisibilityKey(viewer string, excluded map[int64]bool) string {
	ids := make([]int64, 0, len(excluded))
	for id, hidden := range excluded {
		if hidden {
			ids = append(ids, id)
		}
	}
	sort.Slice(ids, func(i, j int) bool { return ids[i] < ids[j] })
	hash := sha256.New()
	var encoded [8]byte
	for _, id := range ids {
		binary.LittleEndian.PutUint64(encoded[:], uint64(id))
		hash.Write(encoded[:])
	}
	return fmt.Sprintf("%s:%x", viewer, hash.Sum(nil))
}

func (c *BookDirectoryCache) snapshot(ctx context.Context, key string, excluded map[int64]bool, refresh bool) ([]bookDirectoryLocation, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	entry, ok := c.entries[key]
	if !refresh && ok && c.now().Sub(entry.updated) < 30*time.Second {
		return entry.locations, nil
	}
	locations, err := readBookDirectoryLocations(ctx, c.db, c.root, excluded)
	if err != nil {
		return nil, err
	}
	if len(c.entries) >= 4 && !ok {
		oldest := ""
		var stamp time.Time
		for k, v := range c.entries {
			if oldest == "" || v.updated.Before(stamp) {
				oldest, stamp = k, v.updated
			}
		}
		delete(c.entries, oldest)
	}
	c.entries[key] = directorySnapshot{locations: locations, updated: c.now()}
	return locations, nil
}

func (c *BookDirectoryCache) Browse(ctx context.Context, viewer, current string, recursive, refresh bool, excluded map[int64]bool) ([]BookDirectory, []int64, error) {
	locations, err := c.snapshot(ctx, directoryVisibilityKey(viewer, excluded), excluded, refresh)
	if err != nil {
		return nil, nil, err
	}
	active, formats, err := currentBookDirectoryVisibility(ctx, c.db)
	if err != nil {
		return nil, nil, err
	}
	dirs, ids := groupBookDirectories(locations, current, recursive, active, excluded, formats)
	return dirs, ids, nil
}

// Small covering-index scans validate cached positions without rereading paths.
func currentBookDirectoryVisibility(ctx context.Context, db *sql.DB) (map[int64]bool, map[int64]int64, error) {
	active := map[int64]bool{}
	formats := map[int64]int64{}
	rows, err := db.QueryContext(ctx, `SELECT id FROM books`)
	if err != nil {
		return nil, nil, err
	}
	for rows.Next() {
		var id int64
		if e := rows.Scan(&id); e != nil {
			rows.Close()
			return nil, nil, e
		}
		active[id] = true
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, nil, err
	}
	rows, err = db.QueryContext(ctx, `SELECT id,book_id FROM book_formats`)
	if err != nil {
		return nil, nil, err
	}
	for rows.Next() {
		var id, bookID int64
		if e := rows.Scan(&id, &bookID); e != nil {
			rows.Close()
			return nil, nil, e
		}
		formats[id] = bookID
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, nil, err
	}
	rows, err = db.QueryContext(ctx, `SELECT format_id FROM source_sync_formats WHERE missing=1`)
	if err != nil {
		return nil, nil, err
	}
	for rows.Next() {
		var id int64
		if e := rows.Scan(&id); e != nil {
			rows.Close()
			return nil, nil, e
		}
		delete(formats, id)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, nil, err
	}
	return active, formats, nil
}
