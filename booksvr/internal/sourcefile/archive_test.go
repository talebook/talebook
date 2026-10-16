package sourcefile

import (
	"archive/zip"
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"testing"
)

func zipBytes(t *testing.T, name string, body []byte) []byte {
	t.Helper()
	var b bytes.Buffer
	w := zip.NewWriter(&b)
	f, e := w.Create(name)
	if e != nil {
		t.Fatal(e)
	}
	if _, e = f.Write(body); e != nil {
		t.Fatal(e)
	}
	if e = w.Close(); e != nil {
		t.Fatal(e)
	}
	return b.Bytes()
}
func fixture(t *testing.T, nested bool) (string, []byte) {
	t.Helper()
	body := []byte("第一章\n按需读取，不保留副本")
	name := "novel.txt"
	data := zipBytes(t, name, body)
	chain := []string{base64.StdEncoding.EncodeToString([]byte(name))}
	if nested {
		data = zipBytes(t, "inner.zip", data)
		chain = append([]string{base64.StdEncoding.EncodeToString([]byte("inner.zip"))}, chain...)
	}
	file := filepath.Join(t.TempDir(), "source.zip")
	if e := os.WriteFile(file, data, 0600); e != nil {
		t.Fatal(e)
	}
	fp, e := Fingerprint(file)
	if e != nil {
		t.Fatal(e)
	}
	return Encode(Reference{Archive: file, Fingerprint: fp, Chain: chain, Hash: fmt.Sprintf("sha256:%x", sha256.Sum256(body)), Name: name, Size: int64(len(body))}), body
}
func TestArchiveAcquireReleaseAndNested(t *testing.T) {
	for _, nested := range []bool{false, true} {
		ref, body := fixture(t, nested)
		info, e := Stat(ref)
		if e != nil || info.Size() != int64(len(body)) {
			t.Fatalf("stat %v %v", info, e)
		}
		path, release, e := Acquire(context.Background(), ref)
		if e != nil {
			t.Fatal(e)
		}
		data, e := os.ReadFile(path)
		if e != nil || !bytes.Equal(data, body) {
			t.Fatalf("body %q %v", data, e)
		}
		release()
		release()
		if _, e = os.Stat(path); !os.IsNotExist(e) {
			t.Fatalf("body retained: %v", e)
		}
		scratch.Lock()
		used := scratch.used
		scratch.Unlock()
		if used != 0 {
			t.Fatalf("reservation leaked: %d", used)
		}
	}
}
func TestArchiveFailureAndCancellationCleanUp(t *testing.T) {
	ref, _ := fixture(t, true)
	r, _ := Decode(ref)
	r.Hash = "sha256:" + string(bytes.Repeat([]byte("0"), 64))
	if _, _, e := Acquire(context.Background(), Encode(r)); e == nil {
		t.Fatal("bad hash accepted")
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, _, e := Acquire(ctx, ref); e == nil {
		t.Fatal("cancelled extraction succeeded")
	}
	scratch.Lock()
	used := scratch.used
	scratch.Unlock()
	if used != 0 {
		t.Fatalf("failure leaked %d", used)
	}
	r, _ = Decode(ref)
	if e := os.WriteFile(r.Archive, []byte("changed"), 0600); e != nil {
		t.Fatal(e)
	}
	if _, _, e := Acquire(context.Background(), ref); e == nil {
		t.Fatal("changed source accepted")
	}
}
func TestScratchLimitRejectsBeforeWriting(t *testing.T) {
	ref, _ := fixture(t, false)
	r, _ := Decode(ref)
	scratch.Lock()
	scratch.used = ScratchLimit
	scratch.Unlock()
	_, _, e := Acquire(context.Background(), ref)
	scratch.Lock()
	scratch.used = 0
	scratch.Unlock()
	if e == nil {
		t.Fatal("global limit ignored")
	}
	zr, e := zip.OpenReader(r.Archive)
	if e != nil {
		t.Fatal(e)
	}
	defer zr.Close()
	f := *zr.File[0]
	f.UncompressedSize64 = uint64(ScratchLimit) + 1
	if _, _, e := Extract(context.Background(), &f, "large.txt"); e == nil {
		t.Fatal("oversized member accepted")
	}
}
func TestConcurrentArchiveReadersCleanUp(t *testing.T) {
	ref, body := fixture(t, true)
	var wg sync.WaitGroup
	for i := 0; i < 12; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			path, release, e := Acquire(context.Background(), ref)
			if e != nil {
				t.Error(e)
				return
			}
			defer release()
			data, e := os.ReadFile(path)
			if e != nil || !bytes.Equal(data, body) {
				t.Errorf("body %q %v", data, e)
			}
		}()
	}
	wg.Wait()
	scratch.Lock()
	used := scratch.used
	scratch.Unlock()
	if used != 0 {
		t.Fatalf("reservation leaked: %d", used)
	}
}
