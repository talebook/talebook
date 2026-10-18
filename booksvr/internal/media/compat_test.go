package media

import (
	"strings"
	"testing"
)

func TestEpubCompressedMimetypeAndCasePaths(t *testing.T) {
	entries := map[string][]byte{"mimetype": []byte("application/epub+zip\r\n"), "META-INF/container.xml": []byte(`<container><rootfiles><rootfile full-path="ops/book.opf"/></rootfiles></container>`), "OPS/book.opf": []byte(`<package><manifest><item id="p" href="chapter.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="p"/></spine></package>`), "OPS/Chapter.xhtml": []byte(`<html><body>Readable body</body></html>`)}
	file := makeZip(t, t.TempDir(), "case.epub", entries)
	if _, err := AnalyzeFile(file, "epub"); err != nil {
		t.Fatal(err)
	}
	entries["META-INF/encryption.xml"] = []byte(`<enc:EncryptionKey><Proprietary>ZhangYue.Inc</Proprietary></enc:EncryptionKey>`)
	file = makeZip(t, t.TempDir(), "encrypted.epub", entries)
	_, err := AnalyzeFile(file, "epub")
	if err == nil || !strings.Contains(err.Error(), "密钥") {
		t.Fatal(err)
	}
}
