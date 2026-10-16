package httpapi

import (
	"archive/zip"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"talebook/booksvr/internal/sourcefile"
	"testing"
)

func TestIndexedArchiveReadingAndDownload(t *testing.T) {
	w, epub := epubResourceWiring(t)
	body, e := os.ReadFile(epub)
	if e != nil {
		t.Fatal(e)
	}
	archive := filepath.Join(t.TempDir(), "source.zip")
	f, e := os.Create(archive)
	if e != nil {
		t.Fatal(e)
	}
	z := zip.NewWriter(f)
	entry, e := z.Create("book.epub")
	if e != nil {
		t.Fatal(e)
	}
	if _, e = entry.Write(body); e != nil {
		t.Fatal(e)
	}
	if e = z.Close(); e != nil {
		t.Fatal(e)
	}
	f.Close()
	fp, e := sourcefile.Fingerprint(archive)
	if e != nil {
		t.Fatal(e)
	}
	ref := sourcefile.Encode(sourcefile.Reference{Archive: archive, Fingerprint: fp, Chain: []string{base64.StdEncoding.EncodeToString([]byte("book.epub"))}, Hash: fmt.Sprintf("sha256:%x", sha256.Sum256(body)), Name: "book.epub", Size: int64(len(body))})
	if _, e = w.libraryDB.Exec("UPDATE book_formats SET path=? WHERE book_id=1", ref); e != nil {
		t.Fatal(e)
	}
	rev := readerResourceRevision(ref)
	if rev == "" {
		t.Fatal("no revision")
	}
	for _, method := range []string{http.MethodHead, http.MethodGet} {
		rec := serveResource(t, w, method, nil)
		if rec.Code != 200 || rec.Header().Get("ETag") != `"`+rev+`"` {
			t.Fatalf("%s: %d %v", method, rec.Code, rec.Header())
		}
		if method == http.MethodGet && !bytesEqual(rec.Body.Bytes(), body) {
			t.Fatal("wrong response body")
		}
	}
	rec := serveResource(t, w, http.MethodGet, map[string]string{"Range": "bytes=0-9"})
	if rec.Code != 206 || !bytesEqual(rec.Body.Bytes(), body[:10]) {
		t.Fatalf("range: %d", rec.Code)
	}
	cfg := w.Config("")
	cfg.CanViewBook = func(*Context, int64) bool { return true }
	srv, e := NewServer(BookRouteSpecs(cfg))
	if e != nil {
		t.Fatal(e)
	}
	rec = httptest.NewRecorder()
	srv.ServeHTTP(rec, httptest.NewRequest("GET", "/api/book/1.EPUB", nil))
	if rec.Code != 200 || !bytesEqual(rec.Body.Bytes(), body) {
		t.Fatalf("download: %d %s", rec.Code, rec.Body.String())
	}
	// Every operation must leave no extracted member body behind.
	path, release, e := sourcefile.Acquire(context.Background(), ref)
	if e != nil {
		t.Fatal(e)
	}
	parent := filepath.Dir(filepath.Dir(path))
	release()
	entries, e := os.ReadDir(parent)
	if e != nil || len(entries) != 0 {
		t.Fatalf("temporary bodies retained: %v %v", entries, e)
	}
}
func bytesEqual(a, b []byte) bool { return string(a) == string(b) }
