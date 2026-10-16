package httpapi

import (
	"strings"
	"talebook/booksvr/internal/library"
	"testing"
)

func TestBookSizesReachAllListSerializers(t *testing.T) {
	book := library.BookData{ID: 1, Formats: []string{"MOBI", "EPUB"}, FormatSizes: map[string]int64{"MOBI": 1234, "EPUB": 5678}}
	fx := newBookFixture(t)
	for name, dict := range map[string]map[string]any{"library": bookDict(fx.Cfg, book), "category": bookDataToDict(book), "admin": adminSimpleBook(AdminConfig{}, book)} {
		sizes, ok := dict["format_sizes"].(map[string]int64)
		if !ok || sizes["MOBI"] != 1234 || sizes["EPUB"] != 5678 {
			t.Fatalf("%s dropped sizes: %+v", name, dict)
		}
	}
}

func TestRepairedCoverChangesCachedPlaceholderURL(t *testing.T) {
	fx := newBookFixture(t)
	book := library.BookData{ID: 1, HasCover: true}
	for _, dict := range []map[string]any{bookDict(fx.Cfg, book), adminSimpleBook(AdminConfig{}, book)} {
		if !strings.Contains(dict["img"].(string), "cover=1") {
			t.Fatalf("cached placeholder URL: %+v", dict)
		}
	}
}
