package library

import (
	"archive/zip"
	"context"
	"database/sql"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"talebook/booksvr/internal/sourcefile"
)

func sourceFixture(t *testing.T) (*sql.DB, string, func() SourceSyncResult) {
	t.Helper()
	db := openTestDB(t)
	db.SetMaxOpenConns(1)
	if err := Migrate(db); err != nil {
		t.Fatal(err)
	}
	root := t.TempDir()
	run := func() SourceSyncResult {
		t.Helper()
		result, err := SyncSourceFiles(context.Background(), db, []string{root, filepath.Join(root, "nested"), root}, "")
		if err != nil {
			t.Fatal(err)
		}
		return result
	}
	return db, root, run
}
func sourceRegister(t *testing.T, db *sql.DB, id int, path, format string) {
	t.Helper()
	_, err := db.Exec(`INSERT OR IGNORE INTO books(id,title,path) VALUES(?,'Original title',?)`, id, filepath.Dir(path))
	if err != nil {
		t.Fatal(err)
	}
	_, err = db.Exec(`INSERT INTO book_formats(book_id,format,path,size,mtime) VALUES(?,?,?,?,0)`, id, format, path, 4)
	if err != nil {
		t.Fatal(err)
	}
}
func sourceWrite(t *testing.T, path string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte("book"), 0600); err != nil {
		t.Fatal(err)
	}
}
func sourceMove(t *testing.T, old, new string) {
	t.Helper()
	if err := os.Rename(old, new); err != nil {
		t.Fatal(err)
	}
}
func sourceMissing(t *testing.T, db *sql.DB, id int64, want bool) {
	t.Helper()
	ids, err := UnavailableSourceBooks(db)
	if err != nil {
		t.Fatal(err)
	}
	if ids[id] != want {
		t.Fatalf("book %d missing=%v want %v", id, ids[id], want)
	}
}

func TestSourceSyncRenameMoveDeleteRestore(t *testing.T) {
	db, root, run := sourceFixture(t)
	old := filepath.Join(root, "nested", "original.txt")
	sourceWrite(t, old)
	sourceRegister(t, db, 1, old, "TXT")
	run()
	dir := filepath.Join(root, "renamed")
	sourceMove(t, filepath.Dir(old), dir)
	renamed := filepath.Join(dir, "新书名.txt")
	sourceMove(t, filepath.Join(dir, "original.txt"), renamed)
	result := run()
	if result.Moved != 1 {
		t.Fatalf("%+v", result)
	}
	var got, title string
	if err := db.QueryRow(`SELECT f.path,b.title FROM book_formats f JOIN books b ON b.id=f.book_id WHERE b.id=1`).Scan(&got, &title); err != nil {
		t.Fatal(err)
	}
	if got != renamed || title != "Original title" {
		t.Fatalf("%s %s", got, title)
	}
	changes, err := SourceChanges(db)
	if err != nil || len(changes) != 1 || changes[0].BookID != 1 {
		t.Fatalf("%+v %v", changes, err)
	}
	if err = os.Remove(renamed); err != nil {
		t.Fatal(err)
	}
	if run().Missing != 1 {
		t.Fatal("deletion not detected")
	}
	sourceMissing(t, db, 1, true)
	sourceWrite(t, renamed)
	if run().Restored != 1 {
		t.Fatal("restore not detected")
	}
	sourceMissing(t, db, 1, false)
	if result = run(); result.Moved+result.Missing+result.Restored != 0 {
		t.Fatalf("not idempotent: %+v", result)
	}
}

func TestSourceSyncMountOutageAndEmptyReplacement(t *testing.T) {
	db, root, run := sourceFixture(t)
	path := filepath.Join(root, "book.txt")
	sourceWrite(t, path)
	sourceRegister(t, db, 1, path, "TXT")
	run()
	detached := root + "-detached"
	sourceMove(t, root, detached)
	t.Cleanup(func() { os.RemoveAll(detached) })
	result := run()
	if result.Missing != 0 {
		t.Fatal(result)
	}
	sourceMissing(t, db, 1, false)
	if err := os.Mkdir(root, 0700); err != nil {
		t.Fatal(err)
	}
	sourceWrite(t, filepath.Join(root, "unrelated.txt"))
	result = run()
	if result.Roots[root] == "ok" {
		t.Fatal("replacement accepted")
	}
	sourceMissing(t, db, 1, false)
	os.RemoveAll(root)
	sourceMove(t, detached, root)
	if run().Roots[root] != "ok" {
		t.Fatal("mount recovery rejected")
	}
	os.Remove(path)
	run()
	sourceMissing(t, db, 1, true)
}

func TestSourceSyncMultiFormatAndManagedCopy(t *testing.T) {
	db, root, run := sourceFixture(t)
	a := filepath.Join(root, "a.txt")
	b := filepath.Join(root, "a.epub")
	sourceWrite(t, a)
	sourceWrite(t, b)
	sourceRegister(t, db, 1, a, "TXT")
	sourceRegister(t, db, 1, b, "EPUB")
	run()
	os.Remove(a)
	run()
	sourceMissing(t, db, 1, false)
	missing, err := missingSourceFormats(db, "?", []any{1})
	if err != nil || !missing[1]["TXT"] || missing[1]["EPUB"] {
		t.Fatalf("%v %v", missing, err)
	}
	os.Remove(b)
	run()
	sourceMissing(t, db, 1, true)
	managed := filepath.Join(root, "library")
	copy := filepath.Join(managed, "copy.txt")
	sourceWrite(t, copy)
	sourceRegister(t, db, 2, copy, "TXT")
	os.Remove(copy)
	_, err = SyncSourceFiles(context.Background(), db, []string{root}, managed)
	if err != nil {
		t.Fatal(err)
	}
	sourceMissing(t, db, 2, false)
}

func TestSourceSyncHashFallbackAndAmbiguity(t *testing.T) {
	for _, ambiguous := range []bool{false, true} {
		t.Run(map[bool]string{false: "unique", true: "ambiguous"}[ambiguous], func(t *testing.T) {
			db, root, run := sourceFixture(t)
			old := filepath.Join(root, "old.txt")
			sourceWrite(t, old)
			sourceRegister(t, db, 1, old, "TXT")
			hash, _ := sourceHash(context.Background(), old)
			if err := SeedSourceHashes(db, map[string]string{old: hash}); err != nil {
				t.Fatal(err)
			}
			run()
			// A copy on a new inode emulates crossing filesystem boundaries.
			next := filepath.Join(root, "next.txt")
			sourceWrite(t, next)
			if ambiguous {
				sourceWrite(t, filepath.Join(root, "duplicate.txt"))
			}
			os.Remove(old)
			result := run()
			if !ambiguous && result.Moved != 1 {
				t.Fatal(result)
			}
			if ambiguous && result.Moved != 0 {
				t.Fatal("ambiguous source merged")
			}
			sourceMissing(t, db, 1, ambiguous)
		})
	}
}

func TestSourceSyncArchiveMoveAndDelete(t *testing.T) {
	db, root, run := sourceFixture(t)
	archive := filepath.Join(root, "books.zip")
	file, err := os.Create(archive)
	if err != nil {
		t.Fatal(err)
	}
	zw := zip.NewWriter(file)
	entry, _ := zw.Create("story.txt")
	entry.Write([]byte("book"))
	zw.Close()
	file.Close()
	hash, _ := sourceHash(context.Background(), writeHashFixture(t))
	fp, _ := sourcefile.Fingerprint(archive)
	ref := sourcefile.Encode(sourcefile.Reference{Archive: archive, Fingerprint: fp, Chain: []string{base64.StdEncoding.EncodeToString([]byte("story.txt"))}, Hash: hash, Name: "story.txt", Size: 4})
	sourceRegister(t, db, 1, ref, "TXT")
	SeedSourceHashes(db, map[string]string{ref: hash})
	run()
	renamed := filepath.Join(root, "合集.zip")
	sourceMove(t, archive, renamed)
	if run().Moved != 1 {
		t.Fatal("archive rename not followed")
	}
	var path string
	db.QueryRow(`SELECT path FROM book_formats WHERE book_id=1`).Scan(&path)
	local, release, err := sourcefile.Acquire(context.Background(), path)
	if err != nil {
		t.Fatal(err)
	}
	defer release()
	content, _ := os.ReadFile(local)
	if string(content) != "book" {
		t.Fatal(string(content))
	}
	copyPath := filepath.Join(root, "cross-filesystem.zip")
	body, _ := os.ReadFile(renamed)
	if err := os.WriteFile(copyPath, body, 0600); err != nil {
		t.Fatal(err)
	}
	os.Remove(renamed)
	if run().Moved != 1 {
		t.Fatal("cross-filesystem archive move not followed")
	}
	os.Remove(copyPath)
	run()
	sourceMissing(t, db, 1, true)
	if err := os.WriteFile(copyPath, body, 0600); err != nil {
		t.Fatal(err)
	}
	if run().Restored != 1 {
		t.Fatal("restored archive not available")
	}
	sourceMissing(t, db, 1, false)
	db.QueryRow(`SELECT path FROM book_formats WHERE book_id=1`).Scan(&path)
	_, restoredRelease, err := sourcefile.Acquire(context.Background(), path)
	if err != nil {
		t.Fatal(err)
	}
	restoredRelease()
}
func writeHashFixture(t *testing.T) string {
	p := filepath.Join(t.TempDir(), "hash.txt")
	sourceWrite(t, p)
	return p
}

func TestSourceSyncUnreadableDirectoryDoesNotHideBooks(t *testing.T) {
	if os.Geteuid() == 0 {
		t.Skip("run as unprivileged user")
	}
	db, root, run := sourceFixture(t)
	dir := filepath.Join(root, "restricted")
	path := filepath.Join(dir, "book.txt")
	sourceWrite(t, path)
	sourceRegister(t, db, 1, path, "TXT")
	run()
	if err := os.Chmod(dir, 0000); err != nil {
		t.Fatal(err)
	}
	defer os.Chmod(dir, 0700)
	result := run()
	if result.Roots[root] == "ok" || result.Missing != 0 {
		t.Fatalf("incomplete traversal accepted: %+v", result)
	}
	sourceMissing(t, db, 1, false)
}

func TestSourceSyncMissingMarkerAndChangedMountIdentity(t *testing.T) {
	for _, reason := range []string{"marker", "identity"} {
		t.Run(reason, func(t *testing.T) {
			db, root, run := sourceFixture(t)
			path := filepath.Join(root, "book.txt")
			sourceWrite(t, path)
			sourceRegister(t, db, 1, path, "TXT")
			run()
			os.Remove(path)
			if reason == "marker" {
				os.Remove(filepath.Join(root, ".talebook-source-health"))
			} else {
				if _, err := db.Exec(`UPDATE source_sync_roots SET identity='different mount'`); err != nil {
					t.Fatal(err)
				}
			}
			result := run()
			if result.Roots[root] == "ok" || result.Missing != 0 {
				t.Fatal(result)
			}
			sourceMissing(t, db, 1, false)
		})
	}
}

func TestSourceSyncCancelledAndNoBaselineEmptyRoot(t *testing.T) {
	db, root, run := sourceFixture(t)
	sourceRegister(t, db, 1, filepath.Join(root, "absent.txt"), "TXT")
	result := run()
	if result.Roots[root] == "ok" || result.Missing != 0 {
		t.Fatal(result)
	}
	sourceMissing(t, db, 1, false)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := SyncSourceFiles(ctx, db, []string{root}, ""); err == nil {
		t.Fatal("cancelled scan succeeded")
	}
}

func TestSourceSyncSymlinkSourcesAndStateCascade(t *testing.T) {
	db, root, run := sourceFixture(t)
	outside := t.TempDir()
	target := filepath.Join(outside, "book.txt")
	sourceWrite(t, target)
	link := filepath.Join(root, "linked.txt")
	if err := os.Symlink(target, link); err != nil {
		t.Skip(err)
	}
	sourceRegister(t, db, 1, link, "TXT")
	run()
	sourceMissing(t, db, 1, false)
	renamed := filepath.Join(root, "renamed.txt")
	sourceMove(t, link, renamed)
	if run().Moved != 1 {
		t.Fatal("symlink rename not followed")
	}
	directory := filepath.Join(root, "directory-link")
	if err := os.Symlink(outside, directory); err != nil {
		t.Fatal(err)
	}
	sourceRegister(t, db, 2, filepath.Join(directory, "book.txt"), "TXT")
	run()
	sourceMissing(t, db, 2, false)
	if _, err := db.Exec(`PRAGMA foreign_keys=ON`); err != nil {
		t.Fatal(err)
	}
	os.Remove(renamed)
	run()
	sourceMissing(t, db, 1, true)
	if _, err := db.Exec(`DELETE FROM books WHERE id=1`); err != nil {
		t.Fatal(err)
	}
	sourceMissing(t, db, 1, false)
	var count int
	if err := db.QueryRow(`SELECT count(*) FROM source_sync_formats WHERE format_id NOT IN (SELECT id FROM book_formats)`).Scan(&count); err != nil || count != 0 {
		t.Fatalf("orphaned format state: %d %v", count, err)
	}
}

func TestSourceSyncAggregatesBeyondSQLiteVariableLimit(t *testing.T) {
	db, root, run := sourceFixture(t)
	path := filepath.Join(root, "shared.txt")
	sourceWrite(t, path)
	tx, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	books, err := tx.Prepare(`INSERT INTO books(id,title,path) VALUES(?,'Original title',?)`)
	if err != nil {
		t.Fatal(err)
	}
	formats, err := tx.Prepare(`INSERT INTO book_formats(book_id,format,path,size,mtime) VALUES(?,'TXT',?,4,0)`)
	if err != nil {
		t.Fatal(err)
	}
	for id := 1; id <= 1101; id++ {
		if _, err = books.Exec(id, root); err != nil {
			t.Fatal(err)
		}
		if _, err = formats.Exec(id, path); err != nil {
			t.Fatal(err)
		}
	}
	books.Close()
	formats.Close()
	if err = tx.Commit(); err != nil {
		t.Fatal(err)
	}
	if run().Checked != 1101 {
		t.Fatal("baseline lost formats")
	}
	if err = os.Remove(path); err != nil {
		t.Fatal(err)
	}
	if run().Missing != 1101 {
		t.Fatal("deletion lost formats")
	}
	ids, err := UnavailableSourceBooks(db)
	if err != nil || len(ids) != 1101 {
		t.Fatalf("%d %v", len(ids), err)
	}
	sourceWrite(t, path)
	if run().Restored != 1101 {
		t.Fatal("restore lost formats")
	}
	ids, err = UnavailableSourceBooks(db)
	if err != nil || len(ids) != 0 {
		t.Fatalf("%d %v", len(ids), err)
	}
}

func TestSourceSyncPreservesUntrackedCalibreFormat(t *testing.T) {
	db, root, run := sourceFixture(t)
	if _, err := db.Exec(`CREATE TABLE data(book INTEGER,format TEXT)`); err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(root, "book.txt")
	sourceWrite(t, path)
	sourceRegister(t, db, 1, path, "TXT")
	if _, err := db.Exec(`INSERT INTO data(book,format) VALUES(1,'TXT'),(1,'PDF')`); err != nil {
		t.Fatal(err)
	}
	run()
	os.Remove(path)
	run()
	sourceMissing(t, db, 1, false)
	// A legacy Calibre format is not evidence of source deletion. Managed and
	// untracked formats retain their previous read behavior.
	missing, err := missingSourceFormats(db, "?", []any{1})
	if err != nil || !missing[1]["TXT"] || missing[1]["PDF"] {
		t.Fatalf("%v %v", missing, err)
	}
}

func TestSourceSyncAvailabilityTracksFormatMembershipImmediately(t *testing.T) {
	db, root, run := sourceFixture(t)
	path := filepath.Join(root, "book.txt")
	sourceWrite(t, path)
	sourceRegister(t, db, 1, path, "TXT")
	run()
	os.Remove(path)
	run()
	sourceMissing(t, db, 1, true)
	managed := filepath.Join(t.TempDir(), "managed.epub")
	sourceWrite(t, managed)
	sourceRegister(t, db, 1, managed, "EPUB")
	sourceMissing(t, db, 1, false)
	if _, err := db.Exec(`DELETE FROM book_formats WHERE book_id=1 AND format='EPUB'`); err != nil {
		t.Fatal(err)
	}
	sourceMissing(t, db, 1, true)
}

func TestSourceSyncEventHintsAvoidUnrelatedFileStats(t *testing.T) {
	db, root, _ := sourceFixture(t)
	old := filepath.Join(root, "original.txt")
	sourceWrite(t, old)
	sourceRegister(t, db, 1, old, "TXT")
	hash, _ := sourceHash(context.Background(), old)
	SeedSourceHashes(db, map[string]string{old: hash})
	for i := 0; i < 1101; i++ {
		sourceWrite(t, filepath.Join(root, fmt.Sprintf("unindexed-%d.txt", i)))
	}
	run := func(options SourceSyncOptions) SourceSyncResult {
		t.Helper()
		result, err := SyncSourceFiles(context.Background(), db, []string{root}, "", options)
		if err != nil {
			t.Fatal(err)
		}
		return result
	}
	first := run(SourceSyncOptions{})
	if first.Inspected != 1 || len(first.Files) != 1102 {
		t.Fatalf("baseline inspected unrelated sources: %+v", first)
	}
	previous := map[string]bool{}
	for _, path := range first.Files {
		previous[path] = true
	}
	if steady := run(SourceSyncOptions{PreviousPaths: previous}); steady.Inspected != 0 {
		t.Fatalf("unchanged sources must reuse metadata: %d", steady.Inspected)
	}
	next := filepath.Join(root, "renamed.txt")
	sourceMove(t, old, next)
	result := run(SourceSyncOptions{PreviousPaths: previous, ChangedPaths: []string{old, next}})
	if result.Moved != 1 || result.Inspected > 3 {
		t.Fatalf("event discovery scanned unrelated sources: %+v", result)
	}
	os.Remove(next)
	result = run(SourceSyncOptions{PreviousPaths: previous, ChangedPaths: []string{next}})
	if result.Missing != 1 || result.Inspected > 2 {
		t.Fatalf("delete scanned unrelated sources: %+v", result)
	}
	sourceMissing(t, db, 1, true)
	// Restoring onto a pre-existing unindexed path is discoverable from the
	// event hint even though that pathname is in the previous snapshot.
	target := filepath.Join(root, "unindexed-0.txt")
	sourceWrite(t, target)
	result = run(SourceSyncOptions{PreviousPaths: previous, ChangedPaths: []string{target}})
	if result.Moved != 1 || result.Restored != 1 || result.Inspected > 3 {
		t.Fatalf("restored source not followed: %+v", result)
	}
	sourceMissing(t, db, 1, false)
}

func TestSourceSyncDanglingLinkPausesDeletion(t *testing.T) {
	db, root, run := sourceFixture(t)
	target := filepath.Join(t.TempDir(), "book.txt")
	sourceWrite(t, target)
	link := filepath.Join(root, "book.txt")
	if err := os.Symlink(target, link); err != nil {
		t.Skip(err)
	}
	sourceRegister(t, db, 1, link, "TXT")
	run()
	os.Remove(target)
	result := run()
	if result.Roots[root] == "ok" || result.Missing != 0 {
		t.Fatal(result)
	}
	sourceMissing(t, db, 1, false)
}

func TestSourceSyncRestoredFileRetainsUsableHash(t *testing.T) {
	db, root, run := sourceFixture(t)
	path := filepath.Join(root, "book.txt")
	sourceWrite(t, path)
	sourceRegister(t, db, 1, path, "TXT")
	hash, _ := sourceHash(context.Background(), path)
	SeedSourceHashes(db, map[string]string{path: hash})
	run()
	os.Remove(path)
	run()
	sourceWrite(t, path)
	run()
	var actual string
	if err := db.QueryRow(`SELECT hash FROM book_formats WHERE book_id=1`).Scan(&actual); err != nil || actual != hash {
		t.Fatalf("restoration lost relocation hash: %q %v", actual, err)
	}
}

func TestSourceSyncHashReadFailurePausesDeletion(t *testing.T) {
	if os.Geteuid() == 0 {
		t.Skip("run as unprivileged user")
	}
	db, root, run := sourceFixture(t)
	a := filepath.Join(root, "a.txt")
	b := filepath.Join(root, "b.txt")
	sourceWrite(t, a)
	sourceWrite(t, b)
	sourceRegister(t, db, 1, a, "TXT")
	sourceRegister(t, db, 2, b, "TXT")
	hash, _ := sourceHash(context.Background(), a)
	SeedSourceHashes(db, map[string]string{a: hash, b: hash})
	run()
	os.Remove(b)
	if err := os.WriteFile(a, []byte("changed source"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.Chmod(a, 0000); err != nil {
		t.Fatal(err)
	}
	defer os.Chmod(a, 0600)
	result := run()
	if result.Missing != 0 || result.Roots[root] == "ok" {
		t.Fatal(result)
	}
	sourceMissing(t, db, 2, false)
}

func TestSourceSyncDirectoryMoveReusesMetadata(t *testing.T) {
	db, root, run := sourceFixture(t)
	oldDir := filepath.Join(root, "old")
	path := filepath.Join(oldDir, "book.txt")
	sourceWrite(t, path)
	sourceRegister(t, db, 1, path, "TXT")
	run()
	newDir := filepath.Join(root, "new")
	sourceMove(t, oldDir, newDir)
	result, err := SyncSourceFiles(context.Background(), db, []string{root}, "", SourceSyncOptions{PreviousPaths: map[string]bool{path: true}, ChangedPaths: []string{oldDir, newDir}, Moves: []SourceMove{{From: oldDir, To: newDir}}})
	if err != nil || result.Moved != 1 || result.Inspected > 1 {
		t.Fatalf("%+v %v", result, err)
	}
	var actual string
	db.QueryRow(`SELECT path FROM book_formats WHERE book_id=1`).Scan(&actual)
	if actual != filepath.Join(newDir, "book.txt") {
		t.Fatal(actual)
	}
	final := sourceMovedPath("/books/a/book.txt", []SourceMove{{"/books/a", "/books/tmp"}, {"/books/b", "/books/a"}, {"/books/tmp", "/books/b"}})
	if final != "/books/b/book.txt" {
		t.Fatal(final)
	}
}
