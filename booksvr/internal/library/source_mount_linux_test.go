package library

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestSourceMountIdentityIgnoresContainerParent(t *testing.T) {
	info, err := os.Stat(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	first := []byte("1 0 0:11 / / rw - overlay overlay rw\n2 1 8:32 /physical /books rw - f2fs /dev/sdc rw\n")
	next := []byte("44 0 0:99 / / rw - overlay overlay rw\n55 44 8:32 /physical /books rw - f2fs /dev/sdc rw\n")
	if sourceMountIdentity("/books", info, first) != sourceMountIdentity("/books", info, next) {
		t.Fatal("container recreation changed source identity")
	}
	nested := append(append([]byte{}, next...), []byte("56 55 8:48 /nested /books/sub rw - ext4 /dev/sdd rw\n")...)
	if sourceMountIdentity("/books", info, next) == sourceMountIdentity("/books", info, nested) {
		t.Fatal("nested mount ignored")
	}
}
func TestSourceLegacyIdentityRequiresExplicitBaseline(t *testing.T) {
	db, root, run := sourceFixture(t)
	file := filepath.Join(root, "book.txt")
	sourceWrite(t, file)
	sourceRegister(t, db, 1, file, "TXT")
	run()
	info, _ := os.Stat(root)
	if _, err := db.Exec(`UPDATE source_sync_roots SET identity=?`, sourceFileIdentity(info)+":legacy-overlay"); err != nil {
		t.Fatal(err)
	}
	if err := os.Remove(file); err != nil {
		t.Fatal(err)
	}
	if result := run(); result.Roots[root] == "ok" || result.Missing != 0 {
		t.Fatal(result)
	}
	// A valid root marker does not prove that a former nested mount survived.
	// Rebuild only after an administrator has inspected a non-empty source.
	sourceWrite(t, filepath.Join(root, "other.txt"))
	if _, err := RebaselineSourceRoot(context.Background(), db, root, "wrong"); err == nil {
		t.Fatal("unchecked rebaseline accepted")
	}
	inspection, err := InspectSourceRoot(context.Background(), root)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = RebaselineSourceRoot(context.Background(), db, root, inspection.Identity); err != nil {
		t.Fatal(err)
	}
	if result := run(); result.Roots[root] != "ok" || result.Missing != 1 {
		t.Fatal(result)
	}
}
