package scan

import (
	"archive/zip"
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"talebook/booksvr/internal/sourcefile"
	"testing"

	"golang.org/x/text/encoding/simplifiedchinese"
	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/userdb"
)

type zipTestEntry struct {
	name string
	body []byte
	mode os.FileMode
}

func zipTestBytes(t *testing.T, entries ...zipTestEntry) []byte {
	t.Helper()
	var data bytes.Buffer
	writer := zip.NewWriter(&data)
	for _, entry := range entries {
		h := &zip.FileHeader{Name: entry.name, Method: zip.Deflate}
		if entry.mode != 0 {
			h.SetMode(entry.mode)
		}
		file, err := writer.CreateHeader(h)
		if err != nil {
			t.Fatal(err)
		}
		if _, err = file.Write(entry.body); err != nil {
			t.Fatal(err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	return data.Bytes()
}
func writeZIPFixture(t *testing.T, root, name string, data []byte) string {
	t.Helper()
	file := filepath.Join(root, name)
	if err := os.WriteFile(file, data, 0600); err != nil {
		t.Fatal(err)
	}
	return file
}

func TestScanAllProcessesEveryBatchAndSkipsCompletedFiles(t *testing.T) {
	root := t.TempDir()
	svc := newImportService(t, importTestDB(t), importLibraryDB(t))
	svc.SupportedFormats["zip"] = true
	for i := 0; i < 1103; i++ {
		dir := filepath.Join(root, fmt.Sprint(i%3))
		if err := os.MkdirAll(dir, 0755); err != nil {
			t.Fatal(err)
		}
		writeBook(t, dir, fmt.Sprintf("novel-%d.txt", i), []byte(fmt.Sprintf("第一章\n独立正文 %d", i)))
	}
	res, err := svc.ScanAll(context.Background(), root, 37)
	if err != nil || res.Ready != 1103 {
		t.Fatalf("full scan: %+v %v", res, err)
	}
	if progress := svc.Progress(); progress.Processed != 1103 || progress.Phase != "done" {
		t.Fatalf("progress: %+v", progress)
	}
	res, err = svc.ScanAll(context.Background(), root, 37)
	if err != nil || res.Inserted != 0 || res.Skipped != 1103 {
		t.Fatalf("resume: %+v %v", res, err)
	}
}

func TestZIPCollectionImportsAllBooksAndPreservesSource(t *testing.T) {
	for _, mode := range []string{ModeCopy, ModeMove, ModeIndex} {
		t.Run(mode, func(t *testing.T) {
			root := t.TempDir()
			svc := newImportService(t, importTestDB(t), importLibraryDB(t))
			svc.SupportedFormats["zip"] = true
			work := t.TempDir()
			t.Setenv("TMPDIR", work)
			legacy, err := simplifiedchinese.GB18030.NewEncoder().Bytes([]byte("中文旧编码.txt"))
			if err != nil {
				t.Fatal(err)
			}
			nested := zipTestBytes(t, zipTestEntry{"内层小说.txt", []byte("第一章\n嵌套正文"), 0})
			data := zipTestBytes(t, zipTestEntry{"目录/小说甲.txt", []byte("第一章\n甲"), 0}, zipTestEntry{string(legacy), []byte("第一章\n乙"), 0}, zipTestEntry{"nested.zip", nested, 0})
			archive := writeZIPFixture(t, root, "小说合集.zip", data)
			old := &userdb.ScanFile{Name: "小说合集.zip", Path: archive, Hash: "sha256:legacy-failure", Status: userdb.ScanStatusFailed, Data: map[string]any{"analysis_error": "comic.non_image_entry"}}
			if err := insertScanFile(svc.DB, old); err != nil {
				t.Fatal(err)
			}
			res, err := svc.ScanAll(context.Background(), root, 2)
			if err != nil || res.Ready != 3 {
				t.Fatalf("scan: %+v %v", res, err)
			}
			summary, err := svc.Summary()
			if err != nil || summary.Total != 3 || summary.Failed != 0 {
				t.Fatalf("container counted as book: %+v %v", summary, err)
			}
			rows, total, err := svc.List(ListOptions{Filter: FilterAll})
			if err != nil || total != 3 || len(rows) != 3 {
				t.Fatalf("list: %d %d %v", total, len(rows), err)
			}
			// Re-scanning a completed archive must not create or re-extract entries.
			again, err := svc.ScanAll(context.Background(), root, 1)
			if err != nil || again.Inserted != 0 || svc.Progress().Archives != 0 {
				t.Fatalf("rescan: %+v %v", again, err)
			}
			imported, err := svc.Import(nil, 7, false, mode)
			if err != nil || imported.Imported+imported.Indexed != 3 {
				t.Fatalf("import: %+v %v", imported, err)
			}
			if files, err := filepath.Glob(filepath.Join(work, "**", "**", "member-*")); err != nil || len(files) != 0 {
				t.Fatalf("temporary files leaked: %v %v", files, err)
			}
			if got, err := os.ReadFile(archive); err != nil || !bytes.Equal(got, data) {
				t.Fatalf("source archive changed: %v", err)
			}
			for _, id := range imported.BookIDs {
				file, err := library.FormatAbsPath(svc.LibraryDB, id, "TXT", svc.LibraryRoot)
				if err != nil {
					t.Fatal(err)
				}
				physical, release, err := sourcefile.Acquire(context.Background(), file)
				if err != nil {
					t.Fatal(err)
				}
				body, err := os.ReadFile(physical)
				release()
				if err != nil || !bytes.Contains(body, []byte("第一章")) {
					t.Fatalf("unreadable imported book %s: %v", file, err)
				}
				if mode == ModeIndex && !sourcefile.IsReference(file) {
					t.Fatalf("index is temporary: %s", file)
				}
				if mode != ModeIndex && !strings.HasPrefix(file, svc.LibraryRoot+string(filepath.Separator)) {
					t.Fatalf("wrong library: %s", file)
				}
			}
		})
	}
}

func TestZIPBadEntriesDoNotStopOtherBooks(t *testing.T) {
	root := t.TempDir()
	svc := newImportService(t, importTestDB(t), importLibraryDB(t))
	svc.SupportedFormats["zip"] = true
	writeZIPFixture(t, root, "mixed.zip", zipTestBytes(t, zipTestEntry{"../escape.txt", []byte("bad"), 0}, zipTestEntry{"link.txt", []byte("/etc/passwd"), os.ModeSymlink | 0777}, zipTestEntry{"good.txt", []byte("第一章\n正常"), 0}))
	writeZIPFixture(t, root, "broken.zip", []byte("invalid zip"))
	encrypted := zipTestBytes(t, zipTestEntry{"secret.txt", []byte("secret"), 0})
	for i := 0; i+10 < len(encrypted); i++ {
		if bytes.Equal(encrypted[i:i+4], []byte{'P', 'K', 3, 4}) {
			encrypted[i+6] |= 1
		}
		if bytes.Equal(encrypted[i:i+4], []byte{'P', 'K', 1, 2}) {
			encrypted[i+8] |= 1
		}
	}
	writeZIPFixture(t, root, "encrypted.zip", encrypted)
	result, err := svc.ScanAll(context.Background(), root, 1)
	if err != nil || result.Ready != 1 || result.Failed != 4 {
		t.Fatalf("scan failures: %+v %v", result, err)
	}
	result2, err := svc.Import(nil, 7, false, ModeCopy)
	if err != nil || result2.Imported != 1 {
		t.Fatalf("good book import: %+v %v", result2, err)
	}
}

func TestZIPChangedSourceFailsOnlyThatBook(t *testing.T) {
	root := t.TempDir()
	svc := newImportService(t, importTestDB(t), importLibraryDB(t))
	svc.SupportedFormats["zip"] = true
	archive := writeZIPFixture(t, root, "source.zip", zipTestBytes(t, zipTestEntry{"old.txt", []byte("原始正文"), 0}))
	if _, err := svc.ScanAll(context.Background(), root, 2); err != nil {
		t.Fatal(err)
	}
	writeZIPFixture(t, root, "source.zip", zipTestBytes(t, zipTestEntry{"different.txt", []byte("修改后的不同正文"), 0}))
	writeBook(t, root, "loose.txt", []byte("另一本普通小说"))
	if _, err := svc.Scan(root, 0); err != nil {
		t.Fatal(err)
	}
	result, err := svc.Import(nil, 7, false, ModeCopy)
	if err != nil || result.Failed != 1 || result.Imported != 1 {
		t.Fatalf("changed source: %+v %v (%s)", result, err, archive)
	}
}

func TestFullScanCancellationAndZIPBudgets(t *testing.T) {
	root := t.TempDir()
	svc := newImportService(t, importTestDB(t), importLibraryDB(t))
	svc.SupportedFormats["zip"] = true
	writeBook(t, root, "book.txt", []byte("正文"))
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := svc.ScanAll(ctx, root, 1); !errors.Is(err, context.Canceled) {
		t.Fatalf("cancellation: %v", err)
	}
	file := &zip.File{FileHeader: zip.FileHeader{Name: "big.txt", UncompressedSize64: uint64(maxZIPFileBytes) + 1}}
	if safeZIPEntry(file) == nil {
		t.Fatal("oversized member accepted")
	}
	data := zipTestBytes(t, zipTestEntry{"leaf.txt", []byte("正文"), 0})
	for i := 0; i < 7; i++ {
		data = zipTestBytes(t, zipTestEntry{"nested.zip", data, 0})
	}
	writeZIPFixture(t, root, "deep.zip", data)
	result, err := svc.ScanAll(context.Background(), root, 1)
	if err != nil || result.Failed == 0 || result.Ready != 1 {
		t.Fatalf("depth: %+v %v", result, err)
	}
}

func TestImageOnlyZIPRemainsAComic(t *testing.T) {
	root := t.TempDir()
	svc := newImportService(t, importTestDB(t), importLibraryDB(t))
	svc.SupportedFormats["zip"] = true
	image := make([]byte, 24)
	copy(image, []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n'})
	file := writeZIPFixture(t, root, "comic.zip", zipTestBytes(t, zipTestEntry{"page1.png", image, 0}))
	result, err := svc.ScanAll(context.Background(), root, 1)
	if err != nil || result.Ready != 1 {
		t.Fatalf("comic: %+v %v", result, err)
	}
	row, err := getScanFileByPath(svc.DB, file)
	if err != nil || row == nil || row.Status != userdb.ScanStatusReady {
		t.Fatalf("comic record: %+v %v", row, err)
	}
}

func TestFullScanHandlesSameNameAndSizeInDifferentDirectories(t *testing.T) {
	root := t.TempDir()
	svc := newImportService(t, importTestDB(t), importLibraryDB(t))
	for _, name := range []string{"a", "b"} {
		dir := filepath.Join(root, name)
		if err := os.Mkdir(dir, 0755); err != nil {
			t.Fatal(err)
		}
		writeBook(t, dir, "book.txt", []byte("text-"+name))
	}
	result, err := svc.ScanAll(context.Background(), root, 500)
	if err != nil || result.Ready != 2 {
		t.Fatalf("same filename collision: %+v %v", result, err)
	}
}

func TestZIPCollectionDoesNotStopAt500AndDeduplicatesLooseBooks(t *testing.T) {
	root := t.TempDir()
	svc := newImportService(t, importTestDB(t), importLibraryDB(t))
	svc.SupportedFormats["zip"] = true
	entries := make([]zipTestEntry, 603)
	for i := range entries {
		entries[i] = zipTestEntry{fmt.Sprintf("book-%d.txt", i), []byte(fmt.Sprintf("unique content %d", i)), 0}
	}
	writeZIPFixture(t, root, "large-collection.zip", zipTestBytes(t, entries...))
	writeBook(t, root, "duplicate.txt", entries[0].body)
	result, err := svc.ScanAll(context.Background(), root, 23)
	if err != nil || result.Ready != 603 || result.Dropped != 1 {
		t.Fatalf("full archive: %+v %v", result, err)
	}
	var ready int
	if err := svc.DB.QueryRow(`SELECT COUNT(*) FROM scanfiles WHERE status='ready'`).Scan(&ready); err != nil || ready != 603 {
		t.Fatalf("ready: %d %v", ready, err)
	}
}

func TestZIPExtractedEPUBCanBeImportedAndOpened(t *testing.T) {
	root := t.TempDir()
	svc := newImportService(t, importTestDB(t), importLibraryDB(t))
	svc.SupportedFormats["zip"] = true
	epub := makeValidEpub(t, t.TempDir(), "三体.epub")
	body, err := os.ReadFile(epub)
	if err != nil {
		t.Fatal(err)
	}
	writeZIPFixture(t, root, "epubs.zip", zipTestBytes(t, zipTestEntry{"小说/三体.epub", body, 0}))
	result, err := svc.ScanAll(context.Background(), root, 1)
	if err != nil || result.Ready != 1 {
		t.Fatalf("epub scan: %+v %v", result, err)
	}
	imported, err := svc.Import(nil, 7, false, ModeCopy)
	if err != nil || imported.Imported != 1 {
		t.Fatalf("epub import: %+v %v", imported, err)
	}
	file, err := library.FormatAbsPath(svc.LibraryDB, imported.BookIDs[0], "EPUB", svc.LibraryRoot)
	if err != nil {
		t.Fatal(err)
	}
	reader, err := zip.OpenReader(file)
	if err != nil {
		t.Fatal(err)
	}
	reader.Close()
}

func TestZIPRescanFindsMembersWhoseBooksWereDeleted(t *testing.T) {
	root := t.TempDir()
	svc := newImportService(t, importTestDB(t), importLibraryDB(t))
	svc.SupportedFormats["zip"] = true
	writeZIPFixture(t, root, "collection.zip", zipTestBytes(t, zipTestEntry{"one.txt", []byte("one"), 0}, zipTestEntry{"two.txt", []byte("two"), 0}))
	if _, err := svc.ScanAll(context.Background(), root, 1); err != nil {
		t.Fatal(err)
	}
	imported, err := svc.Import(nil, 7, false, ModeCopy)
	if err != nil || len(imported.BookIDs) != 2 {
		t.Fatalf("import: %+v %v", imported, err)
	}
	for _, table := range []string{"books_tags_link", "books_publishers_link", "books_series_link", "books_ratings_link", "books_languages_link", "comments", "identifiers"} {
		if _, err := svc.LibraryDB.Exec("CREATE TABLE IF NOT EXISTS " + table + " (book INTEGER)"); err != nil {
			t.Fatal(err)
		}
	}
	if err := library.DeleteBook(svc.LibraryDB, imported.BookIDs[0]); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.DB.Exec(`DELETE FROM scanfiles WHERE book_id=?`, imported.BookIDs[0]); err != nil {
		t.Fatal(err)
	}
	result, err := svc.ScanAll(context.Background(), root, 1)
	if err != nil || result.Ready != 1 {
		t.Fatalf("deleted ZIP member not rediscovered: %+v %v", result, err)
	}
}

func TestFullScanCallbacksImportOrdinaryAndZIPBeforeTraversalEnds(t *testing.T) {
	root := t.TempDir()
	svc := newImportService(t, importTestDB(t), importLibraryDB(t))
	svc.SupportedFormats["zip"] = true
	for i := 0; i < 7; i++ {
		writeBook(t, root, fmt.Sprintf("plain-%d.txt", i), []byte(fmt.Sprintf("第一章\n普通正文%d", i)))
	}
	var entries []zipTestEntry
	for i := 0; i < 13; i++ {
		entries = append(entries, zipTestEntry{name: fmt.Sprintf("zip-%d.txt", i), body: []byte(fmt.Sprintf("第一章\nZIP正文%d", i))})
	}
	writeZIPFixture(t, root, "books.zip", zipTestBytes(t, entries...))
	calls, imported := 0, 0
	_, err := svc.ScanAllWithCallback(context.Background(), root, 5, func() error {
		calls++
		ready, err := svc.ReadyBatch(0, 500)
		if err != nil {
			return err
		}
		if len(ready) > 5 {
			t.Fatalf("callback batch too large: %d", len(ready))
		}
		hashes := make([]string, 0, len(ready))
		for _, row := range ready {
			hashes = append(hashes, row.Hash)
		}
		if len(hashes) > 0 {
			result, err := svc.Import(hashes, 7, false, "copy")
			if err != nil {
				return err
			}
			imported += result.Imported
		}
		return nil
	})
	if err != nil || calls < 4 || imported != 20 {
		t.Fatalf("calls=%d imported=%d err=%v", calls, imported, err)
	}
	if _, err := os.Stat(filepath.Join(root, "books.zip")); err != nil {
		t.Fatal("archive removed")
	}
}
