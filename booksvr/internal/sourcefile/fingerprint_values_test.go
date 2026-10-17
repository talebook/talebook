package sourcefile

import (
	"os"
	"path/filepath"
	"testing"
)

func TestFingerprintValuesMatchesFilesystem(t *testing.T) {
	path := filepath.Join(t.TempDir(), "archive.zip")
	if err := os.WriteFile(path, []byte("fixture"), 0600); err != nil {
		t.Fatal(err)
	}
	info, err := os.Stat(path)
	if err != nil {
		t.Fatal(err)
	}
	expected, err := Fingerprint(path)
	if err != nil {
		t.Fatal(err)
	}
	if actual := FingerprintValues(path, info.Size(), info.ModTime().UnixNano()); actual != expected {
		t.Fatalf("%s != %s", actual, expected)
	}
}
