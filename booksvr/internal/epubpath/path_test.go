package epubpath

import (
	"archive/zip"
	"testing"
)

func TestFindUniqueAndSafe(t *testing.T) {
	a := &zip.File{FileHeader: zip.FileHeader{Name: "OPS/book.opf"}}
	b := &zip.File{FileHeader: zip.FileHeader{Name: "ops/BOOK.opf"}}
	exact := &zip.File{FileHeader: zip.FileHeader{Name: "ops/book.opf"}}
	if Find([]*zip.File{a}, "ops/book.opf") != a {
		t.Fatal("case fallback lost")
	}
	if Find([]*zip.File{a, b}, "ops/book.opf") != nil {
		t.Fatal("ambiguous alias accepted")
	}
	if Find([]*zip.File{a, b, exact}, "ops/book.opf") != exact {
		t.Fatal("exact match lost")
	}
	for _, name := range []string{"../secret", "/absolute", "a/../secret", "a\\b", ""} {
		if Find([]*zip.File{{FileHeader: zip.FileHeader{Name: name}}}, name) != nil {
			t.Fatal(name)
		}
	}
}
func TestEncryptedAndFontObfuscation(t *testing.T) {
	if !Encrypted([]byte(`<Proprietary>ZhangYue.Inc</Proprietary>`)) {
		t.Fatal("DRM not recognized")
	}
	if Encrypted([]byte(`<EncryptionMethod Algorithm="http://www.idpf.org/2008/embedding"/>`)) {
		t.Fatal("font obfuscation blocked")
	}
}
