package mobimeta

import (
	"encoding/binary"
	"os"
	"path/filepath"
	"testing"
)

// Independent fixed byte positions reproduce the observed file without using
// buildMOBI (which previously encoded the very same incorrect +16 offset).
func observedMOBI() []byte {
	b := make([]byte, 86+1024)
	copy(b, "PGVF05UTWV")
	b[77] = 1
	b[81] = 86
	copy(b[102:], "MOBI")
	binary.BigEndian.PutUint32(b[106:110], 228)
	binary.BigEndian.PutUint32(b[170:174], 648)
	title := []byte("九州·魅生05：十师卷")
	binary.BigEndian.PutUint32(b[174:178], uint32(len(title)))
	copy(b[734:], title)
	return b
}

func TestIndependentRecordZeroOffsets(t *testing.T) {
	b := observedMOBI()
	mi, err := Extract(b)
	if err != nil || mi.Title != "九州·魅生05：十师卷" {
		t.Fatalf("%+v %v", mi, err)
	}
	if title, ok := RecoverPDBTitle(b, "PGVF05UTWV"); !ok || title != mi.Title {
		t.Fatalf("%q %v", title, ok)
	}
	if _, ok := RecoverPDBTitle(b, "用户自己修改的名字"); ok {
		t.Fatal("manual title changed")
	}
	binary.BigEndian.PutUint32(b[170:174], 0xfffffff0)
	if _, ok := RecoverPDBTitle(b, "PGVF05UTWV"); ok {
		t.Fatal("invalid offset accepted")
	}
}

func TestRecoveryExcludesEXTHAndReadsHeader(t *testing.T) {
	b := buildMOBI("真正书名", map[uint32]string{503: "另一个标题"})
	if _, ok := RecoverPDBTitle(b, "PDB-NAME"); ok {
		t.Fatal("EXTH override is not offset bug")
	}
	p := filepath.Join(t.TempDir(), "a.mobi")
	if err := os.WriteFile(p, observedMOBI(), 0600); err != nil {
		t.Fatal(err)
	}
	data, err := ReadHeaderFile(p)
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := RecoverPDBTitle(data, "PGVF05UTWV"); !ok {
		t.Fatal("header recovery failed")
	}
}
