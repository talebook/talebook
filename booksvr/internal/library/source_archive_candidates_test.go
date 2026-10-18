package library

import (
	"archive/zip"
	"bytes"
	"encoding/base64"
	"os"
	"path/filepath"
	"testing"
)

func TestSourceArchiveCandidateDirectoryCache(t *testing.T) {
	root := t.TempDir()
	var buffer bytes.Buffer
	writer := zip.NewWriter(&buffer)
	for _, name := range []string{"first.txt", "second.txt"} {
		entry, _ := writer.Create(name)
		entry.Write([]byte(name))
	}
	writer.Close()
	archive := filepath.Join(root, "renamed.data")
	os.WriteFile(archive, buffer.Bytes(), 0600)
	// ZIP readers support prepended data; no extension or header shortcut is used.
	sfx := filepath.Join(root, "self-extracting.bin")
	os.WriteFile(sfx, append([]byte("launcher prefix"), buffer.Bytes()...), 0600)
	invalid := filepath.Join(root, "page.pdg")
	os.WriteFile(invalid, []byte("not an archive"), 0600)
	calls := 0
	c := sourceArchiveCandidates{open: func(path string) (*zip.ReadCloser, error) { calls++; return zip.OpenReader(path) }}
	encoded := func(name string) string { return base64.StdEncoding.EncodeToString([]byte(name)) }
	for i := 0; i < 5; i++ {
		if !c.mayContain(archive, encoded("first.txt")) || !c.mayContain(archive, encoded("second.txt")) || c.mayContain(archive, encoded("missing.txt")) {
			t.Fatal("membership changed")
		}
		if c.mayContain(invalid, encoded("first.txt")) {
			t.Fatal("non-ZIP accepted")
		}
	}
	if calls != 2 {
		t.Fatalf("opened %d times; expected one per candidate", calls)
	}
	if !c.mayContain(sfx, encoded("first.txt")) {
		t.Fatal("SFX ZIP rejected")
	}
	// Transient file errors are not turned into a cached negative result.
	missing := filepath.Join(root, "later.zip")
	if !c.mayContain(missing, encoded("first.txt")) {
		t.Fatal("transient error cached")
	}
	os.WriteFile(missing, buffer.Bytes(), 0600)
	if !c.mayContain(missing, encoded("first.txt")) {
		t.Fatal("recovered candidate rejected")
	}
}
