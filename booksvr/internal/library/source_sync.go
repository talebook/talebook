package library

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"talebook/booksvr/internal/sourcefile"
	"time"
)

func migrateSourceSync(db *sql.DB) error {
	for _, q := range []string{
		`CREATE TABLE IF NOT EXISTS source_sync_roots(root TEXT PRIMARY KEY,identity TEXT NOT NULL,token TEXT NOT NULL DEFAULT '')`,
		`CREATE TABLE IF NOT EXISTS source_sync_formats(format_id INTEGER PRIMARY KEY REFERENCES book_formats(id) ON DELETE CASCADE,identity TEXT NOT NULL,size INTEGER NOT NULL,mtime INTEGER NOT NULL,missing INTEGER NOT NULL DEFAULT 0)`,
		`CREATE INDEX IF NOT EXISTS source_sync_format_path ON book_formats(path)`,
		`CREATE INDEX IF NOT EXISTS source_sync_missing ON source_sync_formats(missing,format_id)`,
		`CREATE TABLE IF NOT EXISTS source_sync_changes(id INTEGER PRIMARY KEY,book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,old_path TEXT NOT NULL,new_path TEXT NOT NULL)`,
	} {
		if _, err := db.Exec(q); err != nil {
			return err
		}
	}
	var hasData int
	if err := db.QueryRow(`SELECT count(*) FROM sqlite_master WHERE type='table' AND name='data'`).Scan(&hasData); err != nil {
		return err
	}
	if hasData > 0 {
		if _, err := db.Exec(`CREATE INDEX IF NOT EXISTS source_sync_data_format ON data(book,format)`); err != nil {
			return err
		}
	}
	return nil
}

type SourceChange struct {
	ID, BookID       int64
	OldPath, NewPath string
}
type SourceSyncResult struct {
	Checked     int               `json:"checked"`
	Moved       int               `json:"moved"`
	Missing     int               `json:"missing"`
	Restored    int               `json:"restored"`
	Roots       map[string]string `json:"roots"`
	Directories []string          `json:"-"`
	Files       []string          `json:"-"`
	Inspected   int               `json:"files_statted"`
	CheckedAt   string            `json:"checked_at"`
}
type SourceMove struct{ From, To string }
type SourceSyncOptions struct {
	PreviousPaths               map[string]bool
	ChangedPaths                []string
	FullDiscovery               bool
	Moves                       []SourceMove
	RefreshOffset, RefreshLimit int
}

type sourceDiskFile struct {
	path, key   string
	size, mtime int64
}
type sourceTracked struct {
	id, book                          int64
	format, path, physical, key, hash string
	size, mtime                       int64
	missing                           int
	ref                               *sourcefile.Reference
}

func sourceWithin(path, root string) bool {
	rel, err := filepath.Rel(root, path)
	return err == nil && rel != ".." && !strings.HasPrefix(rel, ".."+string(filepath.Separator))
}

// SeedSourceHashes reuses import-time hashes; it does not read ebook bodies.
func SeedSourceHashes(db *sql.DB, hashes map[string]string) error {
	exists, err := columnExists(db, "book_formats", "hash")
	if err != nil {
		return err
	}
	if !exists {
		return nil
	}
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	stmt, err := tx.Prepare(`UPDATE book_formats SET hash=? WHERE path=? AND (hash IS NULL OR hash='')`)
	if err != nil {
		return err
	}
	defer stmt.Close()
	for path, hash := range hashes {
		if strings.HasPrefix(hash, "sha256:") {
			if _, err = stmt.Exec(hash, path); err != nil {
				return err
			}
		}
	}
	return tx.Commit()
}

func sourceHash(ctx context.Context, path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	buf := make([]byte, 128<<10)
	for {
		if err = ctx.Err(); err != nil {
			return "", err
		}
		n, e := f.Read(buf)
		if n > 0 {
			h.Write(buf[:n])
		}
		if e == io.EOF {
			break
		}
		if e != nil {
			return "", e
		}
	}
	return "sha256:" + hex.EncodeToString(h.Sum(nil)), nil
}

// SyncSourceFiles never deletes files or book records. A failed/incomplete root
// snapshot cannot mark formats missing; identity is checked again before commit.
func SyncSourceFiles(ctx context.Context, db *sql.DB, roots []string, libraryRoot string, options ...SourceSyncOptions) (SourceSyncResult, error) {
	result := SourceSyncResult{Roots: map[string]string{}, CheckedAt: time.Now().Format(time.RFC3339)}
	rows, err := db.QueryContext(ctx, `SELECT f.id,f.book_id,f.format,f.path,COALESCE(f.hash,''),COALESCE(s.identity,''),COALESCE(s.size,f.size,0),COALESCE(s.mtime,0),COALESCE(s.missing,0) FROM book_formats f LEFT JOIN source_sync_formats s ON s.format_id=f.id`)
	if err != nil {
		return result, err
	}
	var tracked []sourceTracked
	for rows.Next() {
		var t sourceTracked
		if err = rows.Scan(&t.id, &t.book, &t.format, &t.path, &t.hash, &t.key, &t.size, &t.mtime, &t.missing); err != nil {
			rows.Close()
			return result, err
		}
		t.physical = t.path
		if sourcefile.IsReference(t.path) {
			r, e := sourcefile.Decode(t.path)
			if e != nil {
				continue
			}
			t.ref = &r
			t.physical = r.Archive
		}
		if filepath.IsAbs(t.physical) && !(libraryRoot != "" && sourceWithin(t.physical, libraryRoot)) {
			tracked = append(tracked, t)
		}
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return result, err
	}
	limited := len(options) > 0
	option := SourceSyncOptions{}
	if limited {
		option = options[0]
	}
	known := map[string]bool{}
	newMissing := map[string]bool{}
	for _, t := range tracked {
		known[t.physical] = true
		if t.missing == 0 && (t.key != "" || strings.HasPrefix(t.hash, "sha256:")) {
			newMissing[t.physical] = true
		}
	}
	cached := map[string]sourceDiskFile{}
	for _, t := range tracked {
		if t.key != "" && t.missing == 0 {
			cached[t.physical] = sourceDiskFile{t.physical, t.key, t.size, t.mtime}
		}
	}
	transferred := map[string]sourceDiskFile{}
	for path, info := range cached {
		if moved := sourceMovedPath(path, option.Moves); moved != "" {
			info.path = moved
			transferred[moved] = info
		}
	}
	dirty := map[string]bool{}
	for _, path := range option.ChangedPaths {
		dirty[path] = true
	}
	refresh := map[string]bool{}
	if option.RefreshLimit > 0 && len(known) > 0 {
		var paths []string
		for path := range known {
			paths = append(paths, path)
		}
		sort.Strings(paths)
		for i := 0; i < option.RefreshLimit && i < len(paths); i++ {
			refresh[paths[(option.RefreshOffset+i)%len(paths)]] = true
		}
	}
	type rootSnapshot struct {
		root, key, token string
		files            map[string]sourceDiskFile
		dirs             []string
		paths            []string
	}
	snapshots := map[string]*rootSnapshot{}
	allFiles := map[string]sourceDiskFile{}
	byKey := map[string][]sourceDiskFile{}
	bySize := map[int64][]sourceDiskFile{}
	hashes := map[string]string{}
	archiveCandidates := sourceArchiveCandidates{}
	roots = normalizeSourceRoots(roots)
	for _, raw := range roots {
		root, e := filepath.Abs(raw)
		if e != nil {
			result.Roots[raw] = e.Error()
			continue
		}
		if _, ok := snapshots[root]; ok {
			continue
		}
		snap := &rootSnapshot{root: root, files: map[string]sourceDiskFile{}}
		info, e := os.Stat(root)
		if e != nil || !info.IsDir() {
			result.Roots[root] = "源目录不可访问，暂停删除同步"
			continue
		}
		snap.key = sourceRootIdentity(root, info)
		var previous, token string
		e = db.QueryRowContext(ctx, `SELECT identity,token FROM source_sync_roots WHERE root=?`, root).Scan(&previous, &token)
		if e != nil && e != sql.ErrNoRows {
			return result, e
		}
		if token != "" {
			b, e := os.ReadFile(filepath.Join(root, ".talebook-source-health"))
			if e != nil || string(b) != token {
				result.Roots[root] = "源目录健康标记不可用，暂停删除同步"
				continue
			}
			snap.token = token
		}
		// A legacy digest cannot distinguish an unrelated overlay change from a
		// lost nested mount. Require explicit inspection rather than upgrading it
		// from the root inode and health marker alone.
		if previous != "" && previous != snap.key {
			result.Roots[root] = "源目录身份变化，暂停删除同步"
			continue
		}
		e = nil
		discoverAll := !limited || option.FullDiscovery
		e = filepath.WalkDir(root, func(path string, d fs.DirEntry, walkErr error) error {
			if err := ctx.Err(); err != nil {
				return err
			}
			if walkErr != nil {
				return walkErr
			}
			if d.IsDir() {
				if path != root && (libraryRoot != "" && sourceWithin(path, libraryRoot)) {
					return filepath.SkipDir
				}
				snap.dirs = append(snap.dirs, path)
				return nil
			}
			if d.Name() == ".talebook-source-health" {
				return nil
			}
			snap.paths = append(snap.paths, path)
			if limited && !option.FullDiscovery && d.Type()&os.ModeSymlink == 0 {
				if info, ok := transferred[path]; ok {
					snap.files[path] = info
					return nil
				}
				if info, ok := cached[path]; ok && !dirty[path] && !refresh[path] {
					snap.files[path] = info
					return nil
				}
			}
			candidate := discoverAll || known[path] || (option.PreviousPaths != nil && !option.PreviousPaths[path])
			if !candidate {
				for _, changed := range option.ChangedPaths {
					if filepath.Clean(changed) == root {
						continue
					}
					if path == changed || strings.HasPrefix(path, filepath.Clean(changed)+string(filepath.Separator)) {
						candidate = true
						break
					}
				}
			}
			if !candidate {
				return nil
			}
			result.Inspected++
			i, e := d.Info()
			if d.Type()&os.ModeSymlink != 0 {
				i, e = os.Stat(path)
				if os.IsNotExist(e) {
					return nil
				}
			}
			if e != nil {
				return e
			}
			if i.Mode().IsRegular() {
				snap.files[path] = sourceDiskFile{path, sourceFileIdentity(i), i.Size(), i.ModTime().UnixNano()}
			}
			return nil
		})
		if e != nil {
			result.Roots[root] = "源目录扫描不完整，暂停删除同步: " + e.Error()
			continue
		}
		missingNeedsDiscovery := false
		for path := range known {
			if !sourceWithin(path, root) {
				continue
			}
			if _, ok := snap.files[path]; ok {
				continue
			}
			if err := ctx.Err(); err != nil {
				return result, err
			}
			result.Inspected++
			i, statErr := os.Stat(path)
			if statErr == nil && i.Mode().IsRegular() {
				snap.files[path] = sourceDiskFile{path, sourceFileIdentity(i), i.Size(), i.ModTime().UnixNano()}
			} else if os.IsNotExist(statErr) {
				if sourcePathHasSymlink(path) {
					e = fmt.Errorf("链接来源失联，无法确认目标挂载健康")
					break
				}
				if newMissing[path] && len(option.ChangedPaths) == 0 {
					missingNeedsDiscovery = true
				}
			} else if statErr != nil {
				e = statErr
				break
			}
		}
		if e != nil {
			result.Roots[root] = "来源文件不可读取，暂停删除同步: " + e.Error()
			continue
		}
		if missingNeedsDiscovery {
			for _, path := range snap.paths {
				if _, ok := snap.files[path]; ok {
					continue
				}
				result.Inspected++
				i, statErr := os.Stat(path)
				if os.IsNotExist(statErr) {
					continue
				}
				if statErr != nil {
					e = statErr
					break
				}
				if i.Mode().IsRegular() {
					snap.files[path] = sourceDiskFile{path, sourceFileIdentity(i), i.Size(), i.ModTime().UnixNano()}
				}
			}
			if e != nil {
				result.Roots[root] = "候选来源扫描不完整，暂停删除同步: " + e.Error()
				continue
			}
		}
		after, e := os.Stat(root)
		if e != nil || sourceRootIdentity(root, after) != snap.key {
			result.Roots[root] = "扫描期间源目录发生变化，暂停删除同步"
			continue
		}
		if (previous == "" || snap.token == "") && len(snap.files) == 0 {
			hasTracked := false
			for _, t := range tracked {
				if sourceWithin(t.physical, root) {
					hasTracked = true
					break
				}
			}
			if hasTracked {
				result.Roots[root] = "空目录与已登记来源不一致，无法建立安全基线"
				continue
			}
		}
		if snap.token == "" {
			if existing, e := os.ReadFile(filepath.Join(root, ".talebook-source-health")); e == nil && len(existing) == 64 {
				if _, e = hex.DecodeString(string(existing)); e == nil {
					snap.token = string(existing)
				}
			}
		}
		if snap.token == "" {
			sum := sha256.Sum256([]byte(root + snap.key + time.Now().String()))
			candidate := hex.EncodeToString(sum[:])
			f, e := os.OpenFile(filepath.Join(root, ".talebook-source-health"), os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
			if e == nil {
				_, e = f.WriteString(candidate)
				closeErr := f.Close()
				if e != nil || closeErr != nil {
					result.Roots[root] = "无法写入来源健康标记"
					continue
				}
				snap.token = candidate
			}
		}
		snapshots[root] = snap
		result.Roots[root] = "ok"
		result.Directories = append(result.Directories, snap.dirs...)
		result.Files = append(result.Files, snap.paths...)
		for path, f := range snap.files {
			allFiles[path] = f
			byKey[f.key] = append(byKey[f.key], f)
			bySize[f.size] = append(bySize[f.size], f)
		}
	}
	// One physical source (including an archive shared by many books) is relocated
	// once. SHA256 fallback reads only equal-sized unclaimed candidates.
	relocated := map[string]string{}
	claimed := map[string]string{}
	origins := map[string]map[string]bool{}
	archiveRefs := map[string][]sourcefile.Reference{}
	for _, t := range tracked {
		if t.ref != nil {
			archiveRefs[t.physical] = append(archiveRefs[t.physical], *t.ref)
		}
		if _, ok := allFiles[t.physical]; ok {
			claimed[t.physical] = t.physical
		} else if t.hash != "" {
			if origins[t.hash] == nil {
				origins[t.hash] = map[string]bool{}
			}
			origins[t.hash][t.physical] = true
		}
	}
	for _, t := range tracked {
		healthy := false
		for root := range snapshots {
			if sourceWithin(t.physical, root) {
				healthy = true
				break
			}
		}
		if !healthy {
			continue
		}
		if _, ok := allFiles[t.physical]; ok {
			continue
		}
		if _, done := relocated[t.physical]; done {
			continue
		}
		var candidates []sourceDiskFile
		if t.key != "" {
			candidates = byKey[t.key]
		}
		if len(candidates) == 1 {
			f := candidates[0]
			if owner := claimed[f.path]; (owner == "" || owner == t.physical) && f.size == t.size && f.mtime == t.mtime {
				relocated[t.physical] = f.path
				claimed[f.path] = t.physical
				continue
			}
		}
		if strings.HasPrefix(t.hash, "sha256:") && len(origins[t.hash]) == 1 {
			matches := []string{}
			for _, f := range bySize[t.size] {
				if claimed[f.path] != "" {
					continue
				}
				if t.ref != nil && !archiveCandidates.mayContain(f.path, t.ref.Chain[0]) {
					continue
				}
				var h string
				var e error
				if t.ref == nil {
					h = hashes[f.path]
					if h == "" {
						h, e = sourceHash(ctx, f.path)
						if e == nil {
							hashes[f.path] = h
						}
					}
				} else {
					r := *t.ref
					r.Archive = f.path
					r.Fingerprint, e = sourcefile.Fingerprint(f.path)
					if e == nil {
						var local string
						var release func()
						local, release, e = sourcefile.Acquire(ctx, sourcefile.Encode(r))
						if e == nil {
							h, e = sourceHash(ctx, local)
							release()
						}
					}
				}
				if e != nil {
					continue
				}
				if h == t.hash {
					matches = append(matches, f.path)
				}
			}
			if len(matches) == 1 {
				if t.ref != nil && !verifyRelocatedArchive(ctx, archiveRefs[t.physical], matches[0]) {
					continue
				}
				relocated[t.physical] = matches[0]
				claimed[matches[0]] = t.physical
			}
		}
	}
	if err = ctx.Err(); err != nil {
		return result, err
	}
	healthyPath := func(path string) bool {
		for root := range snapshots {
			if sourceWithin(path, root) {
				return true
			}
		}
		return false
	}
	refreshedHashes := map[string]string{}
	for _, t := range tracked {
		f, exists := allFiles[t.physical]
		if t.ref != nil || !exists || !healthyPath(t.physical) || t.key == "" || t.hash == "" {
			continue
		}
		if t.key == f.key && t.size == f.size && t.mtime == f.mtime {
			continue
		}
		if _, done := refreshedHashes[t.physical]; done {
			continue
		}
		h, e := sourceHash(ctx, t.physical)
		if e != nil {
			if ctx.Err() != nil {
				return result, ctx.Err()
			}
			for root := range snapshots {
				if sourceWithin(t.physical, root) {
					delete(snapshots, root)
					result.Roots[root] = "来源读取失败，暂停删除同步: " + e.Error()
				}
			}
			continue
		}
		refreshedHashes[t.physical] = h
	}
	// Revalidate every root after all discovery/hash work. An offline source is
	// excluded as both a deletion origin and relocation destination.
	for root, snap := range snapshots {
		info, e := os.Stat(root)
		healthy := e == nil && sourceRootIdentity(root, info) == snap.key
		if healthy && snap.token != "" {
			b, e := os.ReadFile(filepath.Join(root, ".talebook-source-health"))
			healthy = e == nil && string(b) == snap.token
		}
		if !healthy {
			delete(snapshots, root)
			result.Roots[root] = "提交前源目录不可用，暂停删除同步"
		}
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return result, err
	}
	defer tx.Rollback()
	for root, snap := range snapshots {
		if _, err = tx.ExecContext(ctx, `INSERT INTO source_sync_roots(root,identity,token) VALUES(?,?,?) ON CONFLICT(root) DO UPDATE SET identity=excluded.identity,token=excluded.token WHERE source_sync_roots.identity<>excluded.identity OR source_sync_roots.token<>excluded.token`, root, snap.key, snap.token); err != nil {
			return result, err
		}
	}
	state, err := tx.PrepareContext(ctx, `INSERT INTO source_sync_formats(format_id,identity,size,mtime,missing) VALUES(?,?,?,?,?) ON CONFLICT(format_id) DO UPDATE SET identity=excluded.identity,size=excluded.size,mtime=excluded.mtime,missing=excluded.missing`)
	if err != nil {
		return result, err
	}
	defer state.Close()
	fingerprints := map[string]string{}
	for _, t := range tracked {
		if !healthyPath(t.physical) {
			continue
		}
		result.Checked++
		target := t.physical
		if moved := relocated[target]; moved != "" && healthyPath(moved) {
			target = moved
		}
		f, exists := allFiles[target]
		missing := 0
		if !exists {
			missing = 1
			f = sourceDiskFile{t.physical, t.key, t.size, t.mtime}
		}
		newPath := t.path
		if exists && (target != t.physical || t.ref != nil && t.missing == 1 && (t.key != f.key || t.size != f.size || t.mtime != f.mtime)) {
			if t.ref != nil {
				r := *t.ref
				r.Archive = target
				r.Fingerprint = fingerprints[target]
				if r.Fingerprint == "" {
					r.Fingerprint = sourcefile.FingerprintValues(target, f.size, f.mtime)
					fingerprints[target] = r.Fingerprint
				}
				if err != nil {
					return result, err
				}
				newPath = sourcefile.Encode(r)
			} else {
				newPath = target
			}
		}
		if newPath != t.path {
			changed, e := tx.ExecContext(ctx, `UPDATE book_formats SET path=? WHERE id=? AND path=?`, newPath, t.id, t.path)
			if e != nil {
				return result, e
			}
			n, _ := changed.RowsAffected()
			if n == 0 {
				continue
			}
			if _, err = tx.ExecContext(ctx, `INSERT INTO source_sync_changes(book_id,old_path,new_path) VALUES(?,?,?)`, t.book, t.path, newPath); err != nil {
				return result, err
			}
			if t.ref == nil {
				if _, err = tx.ExecContext(ctx, `UPDATE books SET path=? WHERE id=? AND path=?`, filepath.Dir(newPath), t.book, filepath.Dir(t.path)); err != nil {
					return result, err
				}
			}
			result.Moved++
		}
		if hash, ok := refreshedHashes[t.physical]; ok && hash != t.hash {
			var value any
			if hash != "" {
				value = hash
			}
			if _, err = tx.ExecContext(ctx, `UPDATE book_formats SET hash=? WHERE id=?`, value, t.id); err != nil {
				return result, err
			}
		}
		if missing != t.missing {
			if missing == 1 {
				result.Missing++
			} else {
				result.Restored++
			}
		}
		if t.key != f.key || t.size != f.size || t.mtime != f.mtime || t.missing != missing {
			if _, err = state.ExecContext(ctx, t.id, f.key, f.size, f.mtime, missing); err != nil {
				return result, err
			}
		}
	}
	err = tx.Commit()
	return result, err
}

// UnavailableSourceBooks is cheap when no sources are missing. Legacy fixtures
// without the additive source schema retain their previous read semantics.
func UnavailableSourceBooks(db *sql.DB) (map[int64]bool, error) {
	out := map[int64]bool{}
	if db == nil {
		return out, nil
	}
	var exists int
	if err := db.QueryRow(`SELECT count(*) FROM sqlite_master WHERE type='table' AND name='source_sync_formats'`).Scan(&exists); err != nil {
		return nil, err
	}
	if exists == 0 {
		return out, nil
	}
	var hasData int
	if err := db.QueryRow(`SELECT count(*) FROM sqlite_master WHERE type='table' AND name='data'`).Scan(&hasData); err != nil {
		return nil, err
	}
	legacyGuard := ""
	if hasData > 0 {
		legacyGuard = ` AND NOT EXISTS (SELECT 1 FROM data d WHERE d.book=f.book_id AND NOT EXISTS (SELECT 1 FROM book_formats other WHERE other.book_id=d.book AND UPPER(other.format)=UPPER(d.format)))`
	}
	// Start from the missing-format index, so the common case (no missing
	// files) does not scan the library. Newly added/removed formats take effect
	// immediately without a separately cached book-level availability flag.
	rows, err := db.Query(`SELECT f.book_id FROM source_sync_formats s JOIN book_formats f ON f.id=s.format_id WHERE s.missing=1 GROUP BY f.book_id HAVING COUNT(*)=(SELECT COUNT(*) FROM book_formats other WHERE other.book_id=f.book_id)` + legacyGuard)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var id int64
		if err = rows.Scan(&id); err != nil {
			return nil, err
		}
		out[id] = true
	}
	return out, rows.Err()
}
func SourceChanges(db *sql.DB) ([]SourceChange, error) {
	rows, err := db.Query(`SELECT id,book_id,old_path,new_path FROM source_sync_changes ORDER BY id LIMIT 500`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []SourceChange
	for rows.Next() {
		var c SourceChange
		if err = rows.Scan(&c.ID, &c.BookID, &c.OldPath, &c.NewPath); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}
func AckSourceChange(db *sql.DB, id int64) error {
	_, err := db.Exec(`DELETE FROM source_sync_changes WHERE id=?`, id)
	return err
}
