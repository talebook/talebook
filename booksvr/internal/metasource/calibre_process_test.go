package metasource

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func TestCalibreProcessResultsAndFailures(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("POSIX executable fixture")
	}
	for _, tc := range []struct {
		name, output string
		fail         bool
	}{
		{"metadata", `[{"Title":"西游记","Authors":["吴承恩"],"ISBN":"9787020008735","CoverURL":"https://example.org/cover.jpg"}]`, false},
		{"empty", `[]`, false}, {"invalid", `not json`, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			path := filepath.Join(t.TempDir(), "python")
			if err := os.WriteFile(path, []byte("#!/bin/sh\ncat >/dev/null\nprintf '%s' '"+tc.output+"'\n"), 0700); err != nil {
				t.Fatal(err)
			}
			rows, err := (&ProcessCalibreIdentifier{Python: path}).Identify("Google", CalibreQuery{Title: "西游记"}, 2)
			if (err != nil) != tc.fail {
				t.Fatalf("rows=%v err=%v", rows, err)
			}
			if tc.name == "metadata" && (len(rows) != 1 || rows[0].Title != "西游记" || len(rows[0].Authors) != 1) {
				t.Fatalf("rows=%+v", rows)
			}
		})
	}
	if _, err := (&ProcessCalibreIdentifier{Python: filepath.Join(t.TempDir(), "missing")}).Identify("Google", CalibreQuery{}, 2); err == nil {
		t.Fatal("missing process accepted")
	}
}

func TestCalibreProcessLive(t *testing.T) {
	if os.Getenv("TALEBOOK_CALIBRE_LIVE") != "1" {
		t.Skip("requires real Calibre runtime and upstream network")
	}
	source := NewCalibreSource(&ProcessCalibreIdentifier{}, nil)
	rows, err := source.Search("9780141439518", "Pride and Prejudice", []string{"Jane Austen"})
	if err != nil || len(rows) == 0 {
		t.Fatalf("real identify rows=%+v err=%v", rows, err)
	}
	for _, row := range rows {
		t.Logf("source=%s title=%s authors=%v isbn=%s cover=%s", row.Source, row.Title, row.Authors, row.ISBN, row.CoverURL)
	}
}
