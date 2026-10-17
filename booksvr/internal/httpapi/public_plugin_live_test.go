package httpapi

import (
	"archive/zip"
	"bytes"
	"net/http/httptest"
	"os"
	"testing"

	"talebook/booksvr/internal/pluginbuiltin"
	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginruntime"
)

// Real public-service journeys. No user credentials, production database, or
// permanent ebook files are used. Explicit opt-in keeps normal tests offline.
func TestPublicPluginCompleteJourneys(t *testing.T) {
	if os.Getenv("TALEBOOK_PUBLIC_JOURNEYS") != "1" {
		t.Skip("explicit public-service end-to-end check")
	}
	registry := pluginruntime.NewPluginRegistry()
	if err := pluginbuiltin.Register(registry); err != nil {
		t.Fatal(err)
	}
	for _, id := range []string{"talebook.source.standard-ebooks", "talebook.source.gutenberg", "talebook.source.internet-archive"} {
		t.Run(id, func(t *testing.T) {
			provider, _ := registry.Get(id)
			source := provider.(pluginiface.SourceProvider)
			ctx := map[string]any{"config": map[string]any{"timeout_seconds": float64(30)}}
			page, err := source.Browse("", nil, ctx)
			if err != nil {
				t.Fatal(err)
			}
			var selected plugindomain.SourceBook
			format := "epub"
			if id == "talebook.source.internet-archive" {
				format = "txt"
			}
			for _, item := range page.Items {
				book, ok := item.(plugindomain.SourceBook)
				if ok && book.Access == "download" && book.Format == format {
					selected = book
					break
				}
			}
			if selected.ExternalID == "" {
				t.Fatalf("no open %s item", format)
			}
			detail, err := source.GetBook(selected.ExternalID, ctx)
			if err != nil || detail.Title == "" {
				t.Fatalf("detail=%+v err=%v", detail, err)
			}
			file, err := source.Download(detail, ctx)
			if err != nil || len(file.Content) == 0 {
				t.Fatalf("download bytes=%d err=%v", len(file.Content), err)
			}
			if format == "epub" {
				if _, err := zip.NewReader(bytes.NewReader(file.Content), int64(len(file.Content))); err != nil {
					t.Fatalf("EPUB is not a valid archive: %v", err)
				}
			}
			t.Logf("title=%s format=%s filename=%s bytes=%d", detail.Title, file.Format, file.Filename, len(file.Content))
		})
	}
	t.Run("talebook.source.venera", func(t *testing.T) {
		provider, _ := registry.Get("talebook.source.venera")
		source := provider.(pluginiface.SourceProvider)
		ctx := map[string]any{"config": map[string]any{"source": "MangaDex", "timeout_seconds": float64(20)}}
		page, err := source.Browse("", nil, ctx)
		if err != nil || len(page.Items) == 0 {
			t.Fatalf("browse=%+v err=%v", page, err)
		}
		book, ok := page.Items[0].(plugindomain.SourceBook)
		if !ok {
			t.Fatalf("unexpected item %T", page.Items[0])
		}
		detail, err := source.GetBook(book.ExternalID, ctx)
		if err != nil {
			t.Fatal(err)
		}
		chapters, err := source.GetTOC(detail, ctx)
		if err != nil || len(chapters) == 0 {
			t.Fatalf("chapters=%d err=%v", len(chapters), err)
		}
		content, err := source.GetChapter(chapters[0], ctx)
		if err != nil {
			t.Fatal(err)
		}
		images, ok := content.Extra["images"].([]any)
		if !ok || len(images) == 0 {
			t.Fatalf("images=%v", content.Extra)
		}
		image, ok := images[0].(map[string]any)
		if !ok {
			t.Fatalf("image=%T", images[0])
		}
		mime, data, err := (OnlineComicConfig{}).fetchImage(&Context{Request: httptest.NewRequest("GET", "http://localhost/", nil)}, image)
		if err != nil || len(data) == 0 {
			t.Fatalf("page image bytes=%d err=%v", len(data), err)
		}
		t.Logf("title=%s chapters=%d pages=%d image_type=%s image_bytes=%d", detail.Title, len(chapters), len(images), mime, len(data))
	})
}
