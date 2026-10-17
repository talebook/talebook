package sourcewatch

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestNativeSourceEvents(t *testing.T) {
	w, err := New(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	defer w.Close()
	root := t.TempDir()
	if err = w.SetDirectories([]string{root}); err != nil {
		t.Fatal(err)
	}
	old := filepath.Join(root, "book.txt")
	next := filepath.Join(root, "renamed.txt")
	for _, action := range []func() error{func() error { return os.WriteFile(old, []byte("book"), 0600) }, func() error { return os.Rename(old, next) }, func() error { return os.Remove(next) }} {
		if err = action(); err != nil {
			t.Fatal(err)
		}
		select {
		case <-w.Events():
		case <-time.After(3 * time.Second):
			t.Fatal("missing native event")
		}
		if paths := w.Changes(); len(paths) == 0 {
			t.Fatal("native event lost its changed-path hints")
		}
	}
}

func TestNativeSourceRenameCookies(t *testing.T) {
	w, err := New(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	defer w.Close()
	root := t.TempDir()
	a := filepath.Join(root, "a.txt")
	b := filepath.Join(root, "b.txt")
	if err = os.WriteFile(a, []byte("book"), 0600); err != nil {
		t.Fatal(err)
	}
	if err = w.SetDirectories([]string{root}); err != nil {
		t.Fatal(err)
	}
	if err = os.Rename(a, b); err != nil {
		t.Fatal(err)
	}
	select {
	case <-w.Events():
	case <-time.After(3 * time.Second):
		t.Fatal("missing rename")
	}
	moves := w.Moves()
	if len(moves) != 1 || moves[0].From != a || moves[0].To != b {
		t.Fatalf("%+v", moves)
	}
	if len(w.Moves()) != 0 {
		t.Fatal("move batch was replayed")
	}
}

func TestNativeSourceWatchSurvivesDirectoryRename(t *testing.T) {
	w, err := New(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	defer w.Close()
	root := t.TempDir()
	old := filepath.Join(root, "old")
	next := filepath.Join(root, "new")
	if err = os.Mkdir(old, 0700); err != nil {
		t.Fatal(err)
	}
	if err = w.SetDirectories([]string{old}); err != nil {
		t.Fatal(err)
	}
	if err = os.Rename(old, next); err != nil {
		t.Fatal(err)
	}
	select {
	case <-w.Events():
	case <-time.After(3 * time.Second):
		t.Fatal("rename event missing")
	}
	if err = w.SetDirectories([]string{next}); err != nil {
		t.Fatal(err)
	}
	time.Sleep(250 * time.Millisecond)
	select {
	case <-w.Events():
	default:
	}
	if err = os.WriteFile(filepath.Join(next, "book.txt"), []byte("book"), 0600); err != nil {
		t.Fatal(err)
	}
	select {
	case <-w.Events():
	case <-time.After(3 * time.Second):
		t.Fatal("renamed directory lost its watch")
	}
}

func TestNativeSourceOverflowFlagIsConsumedOnce(t *testing.T) {
	w, err := New(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	defer w.Close()
	w.mu.Lock()
	w.overflow = true
	w.mu.Unlock()
	if !w.Overflowed() || w.Overflowed() {
		t.Fatal("overflow must force one complete reconciliation")
	}
}
