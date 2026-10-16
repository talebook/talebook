package mobimeta

import (
	"bytes"
	"encoding/binary"
	"io"
	"os"
	"path/filepath"
	"testing"
)

type coverCountingReader struct {
	io.ReaderAt
	read int
}

func (r *coverCountingReader) ReadAt(p []byte, off int64) (int, error) {
	n, err := r.ReaderAt.ReadAt(p, off)
	r.read += n
	return n, err
}

func TestCoverReaderDoesNotReadLargeBookBody(t *testing.T) {
	f, err := os.Create(filepath.Join(t.TempDir(), "large.mobi"))
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	const coverStart int64 = 600 << 20
	header := make([]byte, 102)
	binary.BigEndian.PutUint16(header[76:], 3)
	rec0 := make([]byte, 272)
	copy(rec0[16:], "MOBI")
	binary.BigEndian.PutUint32(rec0[20:], 232)
	binary.BigEndian.PutUint32(rec0[0x6c:], 2)
	copy(rec0[248:], "EXTH")
	binary.BigEndian.PutUint32(rec0[252:], 24)
	binary.BigEndian.PutUint32(rec0[256:], 1)
	binary.BigEndian.PutUint32(rec0[260:], 201)
	binary.BigEndian.PutUint32(rec0[264:], 12)
	binary.BigEndian.PutUint32(header[78:], 102)
	binary.BigEndian.PutUint32(header[86:], 374)
	binary.BigEndian.PutUint32(header[94:], uint32(coverStart))
	want := []byte{0xff, 0xd8, 0xff, 0x42}
	if err = f.Truncate(coverStart + int64(len(want))); err != nil {
		t.Fatal(err)
	}
	f.WriteAt(header, 0)
	f.WriteAt(rec0, 102)
	f.WriteAt(want, coverStart)
	counted := &coverCountingReader{ReaderAt: f}
	got, ok, err := coverReaderAt(counted, coverStart+4)
	if err != nil || !ok || !bytes.Equal(got, want) {
		t.Fatalf("%x %v %v", got, ok, err)
	}
	if counted.read > 1024 {
		t.Fatalf("read body: %d bytes", counted.read)
	}
	got, ok, err = CoverFile(f.Name())
	if err != nil || !ok || !bytes.Equal(got, want) {
		t.Fatalf("file: %x %v %v", got, ok, err)
	}
	// Legacy first-image zero and the no-cover sentinel must still search the
	// record signatures, without loading the large text record between them.
	binary.BigEndian.PutUint32(rec0[0x6c:], 0)
	binary.BigEndian.PutUint32(rec0[268:], ^uint32(0))
	f.WriteAt(rec0, 102)
	got, ok, err = CoverFile(f.Name())
	if err != nil || !ok || !bytes.Equal(got, want) {
		t.Fatalf("legacy image base: %x %v %v", got, ok, err)
	}

}

func TestCoverFileMatchesRealMOBI(t *testing.T) {
	data, err := os.ReadFile("testdata/sample.mobi")
	if err != nil {
		t.Skip(err)
	}
	want, ok := Cover(data)
	if !ok {
		t.Fatal("fixture has no cover")
	}
	got, ok, err := CoverFile("testdata/sample.mobi")
	if err != nil || !ok || !bytes.Equal(got, want) {
		t.Fatalf("reader differs: %v %v", ok, err)
	}
}
