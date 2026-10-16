package convert

import (
	"fmt"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"
	"time"
)

func TestReadingQueueDeduplicatesAndWaitsForBatch(t *testing.T) {
	db := newTestDB(t)
	dir := t.TempDir()
	for _, id := range []int64{1, 2} {
		seedBook(t, db, id, "书")
		p := filepath.Join(dir, fmt.Sprint(id)+".mobi")
		os.WriteFile(p, []byte("mobi"), 0600)
		seedFormat(t, db, id, "MOBI", p)
	}
	s := NewService(db, dir)
	var calls atomic.Int32
	s.Converter = func(_, dst string) error { calls.Add(1); return os.WriteFile(dst, []byte("epub"), 0600) }
	s.mu.Lock()
	s.status.Running = true
	s.mu.Unlock()
	s.StartForReading(1)
	s.StartForReading(1)
	s.StartForReading(2)
	if calls.Load() != 0 {
		t.Fatal("did not wait for batch")
	}
	s.mu.Lock()
	s.status.Running = false
	s.mu.Unlock()
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		s.mu.Lock()
		running := s.readerWorker
		s.mu.Unlock()
		if !running {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}
	if calls.Load() != 2 {
		t.Fatalf("calls=%d", calls.Load())
	}
	if s.ReadingError(1) != "" {
		t.Fatal(s.ReadingError(1))
	}
}

func TestReadingConversionFailureAndRetry(t *testing.T) {
	db := newTestDB(t)
	seedBook(t, db, 1, "书")
	dir := t.TempDir()
	p := filepath.Join(dir, "a.azw")
	os.WriteFile(p, []byte("azw"), 0600)
	seedFormat(t, db, 1, "AZW", p)
	s := NewService(db, dir)
	s.Converter = func(string, string) error { return fmt.Errorf("DRM") }
	s.StartForReading(1)
	deadline := time.Now().Add(3 * time.Second)
	for s.ReadingError(1) == "" && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	if s.ReadingError(1) == "" {
		t.Fatal("failure not reported")
	}
	s.mu.Lock()
	s.Converter = func(_, dst string) error { return os.WriteFile(dst, []byte("epub"), 0600) }
	s.mu.Unlock()
	s.StartForReading(1)
	for time.Now().Before(deadline) {
		s.mu.Lock()
		running := s.readerWorker
		s.mu.Unlock()
		if !running {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}
	if s.ReadingError(1) != "" {
		t.Fatal("retry failed")
	}
}
