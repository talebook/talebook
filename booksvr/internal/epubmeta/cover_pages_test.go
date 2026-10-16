package epubmeta

import (
	"archive/zip"
	"bytes"
	"testing"
)

func TestCoverFromPureImageFirstSpine(t *testing.T) {
	for _, tc := range []struct {
		name, page string
		want       bool
	}{
		{"HTML", `<html><body><img src="../Images/page%20one.jpg"/></body></html>`, true},
		{"SVG", `<html><body><svg xmlns:xlink="http://www.w3.org/1999/xlink"><image xlink:href="../Images/page%20one.jpg"/></svg></body></html>`, true},
		{"body illustration", `<html><body><p>Chapter one text</p><img src="../Images/page%20one.jpg"/></body></html>`, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var b bytes.Buffer
			w := zip.NewWriter(&b)
			for name, data := range map[string]string{
				"META-INF/container.xml": `<container><rootfiles><rootfile full-path="OEBPS/book.opf"/></rootfiles></container>`,
				"OEBPS/book.opf":         `<package><manifest><item id="first" href="Text/first.xhtml"/></manifest><spine><itemref idref="first"/></spine></package>`,
				"OEBPS/Text/first.xhtml": tc.page, "OEBPS/Images/page one.jpg": "cover-art",
			} {
				entry, _ := w.Create(name)
				entry.Write([]byte(data))
			}
			w.Close()
			got, ok := Cover(b.Bytes())
			if ok != tc.want || ok && string(got) != "cover-art" {
				t.Fatalf("%q %v", got, ok)
			}
		})
	}
}

func TestGuideCoverMayBeOutsideFirstSpine(t *testing.T) {
	var b bytes.Buffer
	w := zip.NewWriter(&b)
	for name, data := range map[string]string{
		"META-INF/container.xml": `<container><rootfiles><rootfile full-path="book.opf"/></rootfiles></container>`,
		"book.opf":               `<package><guide><reference type="cover" href="cover.xhtml#page"/></guide></package>`,
		"cover.xhtml":            `<html><body><p>Book title</p><img src="art.jpg"/></body></html>`, "art.jpg": "cover-art",
	} {
		entry, _ := w.Create(name)
		entry.Write([]byte(data))
	}
	w.Close()
	got, ok := Cover(b.Bytes())
	if !ok || string(got) != "cover-art" {
		t.Fatalf("%q %v", got, ok)
	}
}
