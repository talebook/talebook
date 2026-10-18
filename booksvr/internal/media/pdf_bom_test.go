package media

import (
	"bytes"
	"os"
	"testing"
)

func TestPDFBOMCompatibility(t *testing.T) {
	for _, tc := range []struct {
		name    string
		content []byte
		valid   bool
	}{
		{"plain", []byte("%PDF-1.7\nbody"), true},
		{"bom", []byte("\xef\xbb\xbf%PDF-1.6\nbody"), true},
		{"html", []byte("<html>404 Not Found</html>"), false},
		{"bom-html", []byte("\xef\xbb\xbf<html>404</html>"), false},
		{"double-bom", []byte("\xef\xbb\xbf\xef\xbb\xbf%PDF-1.6"), false},
		{"embedded", []byte("HTML%PDF-1.7"), false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			p := writeFile(t, t.TempDir(), "book.pdf", tc.content)
			a, err := AnalyzeFile(p, "pdf")
			if (err == nil) != tc.valid {
				t.Fatalf("%+v %v", a, err)
			}
		})
	}
}

func TestEPUBBoundedTrailingData(t *testing.T) {
	for _, n := range []int{0, 64, 1024, 1025} {
		p := makeEpub(t, t.TempDir(), "book.epub", `<html><body>This is the complete readable chapter text for a valid book.</body></html>`)
		f, err := os.OpenFile(p, os.O_APPEND|os.O_WRONLY, 0600)
		if err != nil {
			t.Fatal(err)
		}
		_, err = f.Write(bytes.Repeat([]byte{0xa7}, n))
		f.Close()
		if err != nil {
			t.Fatal(err)
		}
		a, err := AnalyzeFile(p, "epub")
		if (err == nil) != (n <= 1024) {
			t.Fatalf("trailing=%d analysis=%+v err=%v", n, a, err)
		}
	}
}
