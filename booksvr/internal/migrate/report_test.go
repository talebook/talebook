package migrate

import (
	"database/sql"
	"os"
	"path/filepath"
	"strings"
	"testing"

	_ "modernc.org/sqlite"
)

// --- report.go ---

func TestReportString(t *testing.T) {
	r := Report{
		SourceBooks:       6,
		Works:             2,
		Editions:          4,
		Formats:           5,
		Merged:            4,
		EmptyFingerprints: 1,
		Skipped:           0,
	}
	s := r.String()
	for _, want := range []string{
		"source=6", "works=2", "editions=4", "formats=5",
		"merged=4", "empty_fingerprints=1", "skipped=0", "duration=",
	} {
		if !strings.Contains(s, want) {
			t.Errorf("Report.String() = %q, missing %q", s, want)
		}
	}
}

func TestItoa(t *testing.T) {
	for _, c := range []struct {
		in   int
		want string
	}{
		{0, "0"},
		{1, "1"},
		{9, "9"},
		{10, "10"},
		{123, "123"},
		{-1, "-1"},
		{-42, "-42"},
	} {
		if got := itoa(c.in); got != c.want {
			t.Errorf("itoa(%d) = %q, want %q", c.in, got, c.want)
		}
	}
}

// --- normalizePubdate ---

func TestNormalizePubdate(t *testing.T) {
	for _, c := range []struct{ in, want string }{
		{"2008-01-01 00:00:00+00:00", "2008"},
		{"2012-06-15 00:00:00+00:00", "2012"},
		{"", ""},
		{"   ", ""},
		{"0101-01-01 00:00:00+00:00", ""}, // Calibre zero date
		{"0001-01-01 00:00:00+00:00", ""}, // Calibre zero date
		{"999", ""},                       // too short
		{"0999-01-01", ""},                // year out of range
	} {
		if got := normalizePubdate(c.in); got != c.want {
			t.Errorf("normalizePubdate(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

// --- resolveFormatPath ---

func TestResolveFormatPath(t *testing.T) {
	// Use a platform-appropriate absolute root so the assertion holds on both
	// POSIX and Windows.
	root := t.TempDir()
	got := resolveFormatPath(root, "刘慈欣/三体 (1)", "三体 - 刘慈欣", "EPUB")
	want := filepath.Join(root, "刘慈欣", "三体 (1)", "三体 - 刘慈欣.epub")
	if got != want {
		t.Errorf("resolveFormatPath = %q, want %q", got, want)
	}
	if !filepath.IsAbs(got) {
		t.Errorf("path %q should be absolute", got)
	}
	// The Calibre path separator must be translated to the host separator.
	if strings.Contains(got, "/") && filepath.Separator != '/' {
		t.Errorf("path %q still contains a forward slash", got)
	}
}

// --- error paths ---

func TestImportCalibreFailsOnClosedTarget(t *testing.T) {
	dir := t.TempDir()
	src := buildCalibreFixture(t, dir)

	target, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	_ = target.Close()

	if _, err := ImportCalibre(target, src, dir); err == nil {
		t.Error("ImportCalibre with a closed target should error")
	}
}

func TestImportCalibreFailsOnNonDatabase(t *testing.T) {
	dir := t.TempDir()
	// A file that exists but is not a SQLite database.
	bad := filepath.Join(dir, "not-a-db.db")
	if err := writeFile(bad, "this is not sqlite"); err != nil {
		t.Fatalf("write: %v", err)
	}
	target := openTargetDB(t)

	if _, err := ImportCalibre(target, bad, dir); err == nil {
		t.Error("ImportCalibre on a non-database file should error")
	}
}

func TestImportCalibreSkipsBookWithoutFormats(t *testing.T) {
	dir := t.TempDir()
	src := buildCalibreFixture(t, dir)

	// Remove every format from book 5 so it must be skipped.
	raw, err := sql.Open("sqlite", src)
	if err != nil {
		t.Fatalf("open fixture: %v", err)
	}
	if _, err := raw.Exec(`DELETE FROM data WHERE book = 5`); err != nil {
		t.Fatalf("delete formats: %v", err)
	}
	_ = raw.Close()

	target := openTargetDB(t)
	report, err := ImportCalibre(target, src, dir)
	if err != nil {
		t.Fatalf("ImportCalibre: %v", err)
	}
	if report.Skipped != 1 {
		t.Errorf("report.Skipped = %d, want 1", report.Skipped)
	}
}

func TestImportCalibreEmptyLibrary(t *testing.T) {
	dir := t.TempDir()
	src := buildCalibreFixture(t, dir)

	raw, err := sql.Open("sqlite", src)
	if err != nil {
		t.Fatalf("open fixture: %v", err)
	}
	for _, stmt := range []string{
		`DELETE FROM data`,
		`DELETE FROM books_authors_link`,
		`DELETE FROM books_publishers_link`,
		`DELETE FROM books`,
	} {
		if _, err := raw.Exec(stmt); err != nil {
			t.Fatalf("clean %q: %v", stmt, err)
		}
	}
	_ = raw.Close()

	target := openTargetDB(t)
	report, err := ImportCalibre(target, src, dir)
	if err != nil {
		t.Fatalf("ImportCalibre: %v", err)
	}
	if report.SourceBooks != 0 || report.Works != 0 || report.Editions != 0 || report.Formats != 0 {
		t.Errorf("empty library should produce an empty report, got %+v", report)
	}
}

func TestImportCalibreBookWithoutAuthorOrPublisher(t *testing.T) {
	dir := t.TempDir()
	src := buildCalibreFixture(t, dir)

	// Strip the author and publisher links from book 1.
	raw, err := sql.Open("sqlite", src)
	if err != nil {
		t.Fatalf("open fixture: %v", err)
	}
	if _, err := raw.Exec(`DELETE FROM books_authors_link WHERE book = 1`); err != nil {
		t.Fatalf("delete author link: %v", err)
	}
	if _, err := raw.Exec(`DELETE FROM books_publishers_link WHERE book = 1`); err != nil {
		t.Fatalf("delete publisher link: %v", err)
	}
	_ = raw.Close()

	target := openTargetDB(t)
	report, err := ImportCalibre(target, src, dir)
	if err != nil {
		t.Fatalf("ImportCalibre: %v", err)
	}
	// Book 1 now has no publisher and no pubdate -> empty fingerprint.
	if report.EmptyFingerprints < 1 {
		t.Errorf("report.EmptyFingerprints = %d, want >= 1", report.EmptyFingerprints)
	}
	if report.SourceBooks != 6 {
		t.Errorf("report.SourceBooks = %d, want 6", report.SourceBooks)
	}
}

func writeFile(path, content string) error {
	return os.WriteFile(path, []byte(content), 0o644)
}
