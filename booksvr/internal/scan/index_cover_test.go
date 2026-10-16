package scan

import (
	"archive/zip"
	"bytes"
	"context"
	"image"
	"image/color"
	"image/jpeg"
	"os"
	"path/filepath"
	"strings"
	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/sourcefile"
	"testing"
)

func coveredEPUB(t *testing.T, c color.RGBA) []byte {
	t.Helper()
	var img bytes.Buffer
	art := image.NewRGBA(image.Rect(0, 0, 100, 150))
	for y := 0; y < 150; y++ {
		for x := 0; x < 100; x++ {
			art.Set(x, y, c)
		}
	}
	jpeg.Encode(&img, art, nil)
	var book bytes.Buffer
	zw := zip.NewWriter(&book)
	for name, data := range map[string][]byte{
		"mimetype":               []byte("application/epub+zip"),
		"META-INF/container.xml": []byte(`<container><rootfiles><rootfile full-path="content.opf"/></rootfiles></container>`),
		"content.opf":            []byte(`<package><manifest><item id="cover" href="cover.jpg" properties="cover-image" media-type="image/jpeg"/><item id="page" href="page.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="page"/></spine></package>`),
		"page.xhtml":             []byte(`<html><body><p>` + strings.Repeat("word ", 50) + `</p></body></html>`), "cover.jpg": img.Bytes(),
	} {
		w, err := zw.CreateHeader(&zip.FileHeader{Name: name, Method: zip.Store})
		if err != nil {
			t.Fatal(err)
		}
		w.Write(data)
	}
	zw.Close()
	return book.Bytes()
}

func TestIndexExtractsIsolatedCoversWithoutWritingSource(t *testing.T) {
	root := t.TempDir()
	s := newImportService(t, importTestDB(t), importLibraryDB(t))
	for i, c := range []color.RGBA{{R: 240, A: 255}, {B: 240, A: 255}} {
		p := filepath.Join(root, []string{"a.epub", "b.epub"}[i])
		body := coveredEPUB(t, c)
		os.WriteFile(p, body, 0644)
		seedReadyRow(t, s.DB, p, p)
	}
	result, err := s.Import(nil, 1, false, ModeIndex)
	if err != nil || result.Indexed != 2 {
		t.Fatalf("%+v %v", result, err)
	}
	var covers [][]byte
	for _, id := range result.BookIDs {
		data, err := library.Cover(s.LibraryDB, id, s.LibraryRoot)
		if err != nil || len(data) == 0 {
			t.Fatalf("book %d cover missing: %v", id, err)
		}
		covers = append(covers, data)
	}
	if bytes.Equal(covers[0], covers[1]) {
		t.Fatal("same-directory books share artwork")
	}
	entries, _ := os.ReadDir(root)
	if len(entries) != 2 {
		t.Fatal("source-side files created")
	}
}

func TestIndexZIPCoverSurvivesScratchRemoval(t *testing.T) {
	root := t.TempDir()
	s := newImportService(t, importTestDB(t), importLibraryDB(t))
	s.SupportedFormats["zip"] = true
	body := coveredEPUB(t, color.RGBA{G: 200, A: 255})
	writeZIPFixture(t, root, "books.zip", zipTestBytes(t, zipTestEntry{"book.epub", body, 0}))
	scanned, err := s.ScanAll(context.Background(), root, 1)
	if err != nil || scanned.Ready != 1 {
		t.Fatalf("%+v %v", scanned, err)
	}
	result, err := s.Import(nil, 1, false, ModeIndex)
	if err != nil || result.Indexed != 1 {
		t.Fatalf("%+v %v", result, err)
	}
	id := result.BookIDs[0]
	var source string
	s.LibraryDB.QueryRow(`SELECT path FROM book_formats WHERE book_id=?`, id).Scan(&source)
	if !sourcefile.IsReference(source) {
		t.Fatal("stored extracted ebook")
	}
	data, err := library.Cover(s.LibraryDB, id, s.LibraryRoot)
	if err != nil || len(data) == 0 {
		t.Fatalf("lost artwork: %v", err)
	}
	entries, _ := os.ReadDir(root)
	if len(entries) != 1 {
		t.Fatal("permanent extracted body")
	}
}
