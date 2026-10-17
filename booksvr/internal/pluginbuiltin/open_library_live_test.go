package pluginbuiltin

import (
	"os"
	"talebook/booksvr/internal/plugindomain"
	"testing"
)

func TestAuditLiveOpenLibraryJourney(t *testing.T) {
	if os.Getenv("TALEBOOK_PLUGIN_LIVE_REPORT") == "" {
		t.Skip("explicit live-service audit only")
	}
	p := newOpenLibraryProvider()
	books, err := p.SearchBooks(plugindomain.MetadataQuery{Title: "西游记"}, nil)
	if err != nil || len(books) == 0 {
		t.Fatalf("search=%d err=%v", len(books), err)
	}
	key, _ := books[0].Get("provider_value").(string)
	detail, err := p.GetMetadata(key, nil)
	if err != nil || detail == nil || detail.Get("title") == "" {
		t.Fatalf("detail=%+v err=%v", detail, err)
	}
	coverURL, _ := detail.Get("cover_url").(string)
	t.Logf("query=西游记 results=%d selected=%s title=%v cover=%s", len(books), key, detail.Get("title"), coverURL)
	if coverURL != "" {
		cover, err := p.GetCover(coverURL, nil)
		if err != nil || cover == nil || len(cover.Content) == 0 {
			t.Fatalf("cover=%+v err=%v", cover, err)
		}
		t.Logf("cover bytes=%d", len(cover.Content))
	}
	t.Logf("query=西游记 results=%d selected=%s title=%v", len(books), key, detail.Get("title"))
}
