package library

import (
	"context"
	"database/sql"
	"encoding/json"
	"path"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"talebook/booksvr/internal/sourcefile"
)

// BookDirectoryCache retains its API name, but uses a persistent SQL index.
type BookDirectoryCache struct {
	db    *sql.DB
	root  string
	mu    sync.Mutex
	ready bool
}

func NewBookDirectoryCache(db *sql.DB, root string) *BookDirectoryCache {
	return &BookDirectoryCache{db: db, root: root}
}

// Sync lets background maintenance keep the projection current during imports,
// so a reader's first visit does not inherit an overnight queue.
func (c *BookDirectoryCache) Sync(ctx context.Context) error {
	return c.synchronize(ctx, false)
}

func (c *BookDirectoryCache) synchronize(ctx context.Context, refresh bool) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if !c.ready {
		if err := migrateBookDirectoryIndex(c.db); err != nil {
			return err
		}
		c.ready = true
	}
	var root sql.NullString
	var initialized int
	if err := c.db.QueryRowContext(ctx, `SELECT root,initialized FROM book_directory_meta WHERE id=1`).Scan(&root, &initialized); err != nil {
		return err
	}
	if initialized == 0 || root.String != c.root {
		tx, err := c.db.BeginTx(ctx, nil)
		if err != nil {
			return err
		}
		if _, err = tx.ExecContext(ctx, `INSERT OR IGNORE INTO book_directory_dirty(book_id) SELECT id FROM books`); err == nil {
			_, err = tx.ExecContext(ctx, `UPDATE book_directory_meta SET root=?,initialized=1 WHERE id=1`, c.root)
		}
		if err != nil {
			tx.Rollback()
			return err
		}
		if err = tx.Commit(); err != nil {
			return err
		}
	}
	processed := false
	for {
		var dirty int
		if err := c.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM book_directory_dirty)`).Scan(&dirty); err != nil {
			return err
		}
		if dirty == 0 {
			return nil
		}
		if processed {
			// Leave the writer free between backfill batches so the running
			// importer can commit. No connection or transaction is held here.
			timer := time.NewTimer(20 * time.Millisecond)
			select {
			case <-ctx.Done():
				timer.Stop()
				return ctx.Err()
			case <-timer.C:
			}
		}
		if err := c.synchronizeBatch(ctx); err != nil {
			return err
		}
		processed = true
	}
}
func (c *BookDirectoryCache) synchronizeBatch(ctx context.Context) error {
	tx, err := c.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	// Take the writer before the queue read, so imports cannot invalidate a read-
	// to-write upgrade. Each transaction updates at most 128 books.
	if _, err = tx.ExecContext(ctx, `UPDATE book_directory_meta SET initialized=initialized WHERE id=1`); err != nil {
		return err
	}
	rows, err := tx.QueryContext(ctx, `SELECT book_id FROM book_directory_dirty ORDER BY book_id LIMIT 128`)
	if err != nil {
		return err
	}
	ids := []int64{}
	for rows.Next() {
		var id int64
		if err = rows.Scan(&id); err != nil {
			rows.Close()
			return err
		}
		ids = append(ids, id)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	encoded, _ := json.Marshal(ids)
	param := string(encoded)
	var hasData int
	if err = tx.QueryRowContext(ctx, `SELECT count(*) FROM sqlite_master WHERE type='table' AND name='data'`).Scan(&hasData); err != nil {
		return err
	}
	query := `SELECT 'f:'||f.id,f.book_id,f.path,'','' FROM book_formats f JOIN books b ON b.id=f.book_id WHERE f.book_id IN (SELECT value FROM json_each(?)) AND NOT EXISTS(SELECT 1 FROM source_sync_formats s WHERE s.format_id=f.id AND s.missing=1)`
	args := []any{param}
	if hasData > 0 {
		query += ` UNION ALL SELECT 'd:'||d.rowid,d.book,b.path,d.name,d.format FROM data d JOIN books b ON b.id=d.book WHERE d.book IN (SELECT value FROM json_each(?)) AND NOT EXISTS(SELECT 1 FROM book_formats f WHERE f.book_id=d.book AND UPPER(f.format)=UPPER(d.format))`
		args = append(args, param)
	}
	rows, err = tx.QueryContext(ctx, query, args...)
	if err != nil {
		return err
	}
	type location struct {
		key  string
		book int64
		dir  string
	}
	locations := []location{}
	for rows.Next() {
		var key, file, name, format string
		var book int64
		if err = rows.Scan(&key, &book, &file, &name, &format); err != nil {
			rows.Close()
			return err
		}
		if format != "" {
			if !filepath.IsAbs(file) {
				if c.root == "" {
					continue
				}
				file = filepath.Join(c.root, file)
			}
			file = filepath.Join(file, name+"."+strings.ToLower(format))
		}
		if sourcefile.IsReference(file) {
			ref, e := sourcefile.Decode(file)
			if e != nil {
				continue
			}
			file = ref.Archive
		}
		file = filepath.ToSlash(file)
		if !strings.HasPrefix(file, "/") {
			continue
		}
		locations = append(locations, location{key, book, path.Dir(file)})
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	if _, err = tx.ExecContext(ctx, `DELETE FROM book_directory_locations WHERE book_id IN (SELECT value FROM json_each(?))`, param); err != nil {
		return err
	}
	if _, err = tx.ExecContext(ctx, `DELETE FROM book_directory_members WHERE book_id IN (SELECT value FROM json_each(?))`, param); err != nil {
		return err
	}
	insert, err := tx.PrepareContext(ctx, `INSERT INTO book_directory_locations(book_id,format_key,directory) VALUES(?,?,?)`)
	if err != nil {
		return err
	}
	defer insert.Close()
	node, err := tx.PrepareContext(ctx, `INSERT OR IGNORE INTO book_directory_nodes(path,parent,name) VALUES(?,?,?)`)
	if err != nil {
		return err
	}
	defer node.Close()
	nodeID, err := tx.PrepareContext(ctx, `SELECT rowid FROM book_directory_nodes WHERE path=?`)
	if err != nil {
		return err
	}
	defer nodeID.Close()
	member, err := tx.PrepareContext(ctx, `INSERT INTO book_directory_members(node_id,book_id,direct,nested) VALUES(?,?,?,?)`)
	if err != nil {
		return err
	}
	defer member.Close()
	nodeIDs := map[string]int64{}
	type membership struct{ node, book int64 }
	members := map[membership]int{}
	for _, l := range locations {
		if _, err = insert.ExecContext(ctx, l.book, l.key, l.dir); err != nil {
			return err
		}
		for dir := l.dir; dir != ""; {
			parent := path.Dir(dir)
			if parent == "/" {
				parent = ""
			}
			id, ok := nodeIDs[dir]
			if !ok {
				if _, err = node.ExecContext(ctx, dir, parent, path.Base(dir)); err != nil {
					return err
				}
				if err = nodeID.QueryRowContext(ctx, dir).Scan(&id); err != nil {
					return err
				}
				nodeIDs[dir] = id
			}
			flag := 2
			if dir == l.dir {
				flag = 1
			}
			members[membership{id, l.book}] |= flag
			dir = parent
		}
	}
	for m, flags := range members {
		direct, nested := 0, 0
		if flags&1 != 0 {
			direct = 1
		}
		if flags&2 != 0 {
			nested = 1
		}
		if _, err = member.ExecContext(ctx, m.node, m.book, direct, nested); err != nil {
			return err
		}
	}
	if _, err = tx.ExecContext(ctx, `DELETE FROM book_directory_dirty WHERE book_id IN (SELECT value FROM json_each(?))`, param); err != nil {
		return err
	}
	return tx.Commit()
}
func (c *BookDirectoryCache) Browse(ctx context.Context, viewer, current string, recursive, refresh bool, excluded map[int64]bool) ([]BookDirectory, []int64, error) {
	dirs, ids, _, err := c.BrowsePage(ctx, current, recursive, refresh, excluded, 0, -1)
	return dirs, ids, err
}

// size=0 is a children-only query; size=-1 keeps the non-HTTP API compatible.
func (c *BookDirectoryCache) BrowsePage(ctx context.Context, current string, recursive, refresh bool, excluded map[int64]bool, start, size int) ([]BookDirectory, []int64, int, error) {
	if err := c.synchronize(ctx, refresh); err != nil {
		return nil, nil, 0, err
	}
	private := []int64{}
	for id, hidden := range excluded {
		if hidden {
			private = append(private, id)
		}
	}
	encoded, _ := json.Marshal(private)
	visibility := string(encoded)
	dirs := []BookDirectory{}
	// Node counts are updated in the same transaction as the member projection.
	// Visibility subtraction uses (node_id,book_id), never a library-wide scan.
	query := `SELECT n.path,n.name,n.total_count-(SELECT COUNT(*) FROM book_directory_members m WHERE m.node_id=n.rowid AND m.book_id IN (SELECT value FROM json_each(?))),
 n.nested_count>(SELECT COUNT(*) FROM book_directory_members m WHERE m.node_id=n.rowid AND m.nested=1 AND m.book_id IN (SELECT value FROM json_each(?))) FROM book_directory_nodes n WHERE n.parent=? AND n.total_count>0 ORDER BY n.path`
	rows, err := c.db.QueryContext(ctx, query, visibility, visibility, current)
	if err != nil {
		return nil, nil, 0, err
	}
	for rows.Next() {
		var d BookDirectory
		if err = rows.Scan(&d.Path, &d.Name, &d.Count, &d.HasChildren); err != nil {
			rows.Close()
			return nil, nil, 0, err
		}
		if d.Count > 0 {
			dirs = append(dirs, d)
		}
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, nil, 0, err
	}
	ids := []int64{}
	if size == 0 || current == "" {
		return dirs, ids, 0, nil
	}
	var nodeID int64
	var total int
	countColumn := "direct_count"
	restriction := " AND direct=1"
	if recursive {
		countColumn = "total_count"
		restriction = ""
	}
	err = c.db.QueryRowContext(ctx, `SELECT rowid,`+countColumn+` FROM book_directory_nodes WHERE path=?`, current).Scan(&nodeID, &total)
	if err == sql.ErrNoRows {
		return dirs, ids, 0, nil
	}
	if err != nil {
		return nil, nil, 0, err
	}
	var hidden int
	if len(private) > 0 {
		if err = c.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM book_directory_members WHERE node_id=?`+restriction+` AND book_id IN (SELECT value FROM json_each(?))`, nodeID, visibility).Scan(&hidden); err != nil {
			return nil, nil, 0, err
		}
	}
	total -= hidden
	if start < 0 {
		start = 0
	}
	if start >= total {
		return dirs, ids, total, nil
	}
	rows, err = c.db.QueryContext(ctx, `SELECT book_id FROM book_directory_members WHERE node_id=?`+restriction+` AND book_id NOT IN (SELECT value FROM json_each(?)) ORDER BY book_id DESC LIMIT ? OFFSET ?`, nodeID, visibility, size, start)
	if err != nil {
		return nil, nil, 0, err
	}
	for rows.Next() {
		var id int64
		if err = rows.Scan(&id); err != nil {
			rows.Close()
			return nil, nil, 0, err
		}
		ids = append(ids, id)
	}
	err = rows.Err()
	rows.Close()
	return dirs, ids, total, err
}
