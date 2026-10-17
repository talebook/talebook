package httpapi

import (
	"bytes"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/jpeg"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/metabase"
	"talebook/booksvr/internal/pluginbuiltin"
	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginruntime"
)

type referenceProvider struct {
	key                 string
	fail, missingDetail bool
	cover               []byte
}

func (p *referenceProvider) Manifest() map[string]any {
	return metabase.MetaManifest(p.key, "Fixture metadata", "fixture", "mdi-book", "https://example.org", metabase.ManifestOptions{})
}
func (p *referenceProvider) InitialEnabled(map[string]any) bool          { return true }
func (p *referenceProvider) InitialConfig(map[string]any) map[string]any { return map[string]any{} }
func (p *referenceProvider) Invoke(method string, args []any, context map[string]any) (any, error) {
	return pluginbuiltin.DispatchInvoke(p, method, args, context)
}
func (p *referenceProvider) SelfCheck(map[string]any) (plugindomain.CheckReport, error) {
	return plugindomain.CheckReport{Healthy: true}, nil
}
func (p *referenceProvider) record() plugindomain.BookMetadata {
	return plugindomain.NewBookMetadata(map[string]any{"title": "Selected title", "authors": []string{"Selected author"}, "publisher": "Selected press", "comments": "Selected description", "isbn": "9780141439518", "cover_url": "https://example.org/cover.jpg", "provider_value": "record-1"})
}
func (p *referenceProvider) SearchBooks(plugindomain.MetadataQuery, map[string]any) ([]plugindomain.BookMetadata, error) {
	if p.fail {
		return nil, fmt.Errorf("fixture upstream failure")
	}
	return []plugindomain.BookMetadata{p.record()}, nil
}
func (p *referenceProvider) GetMetadata(id string, _ map[string]any) (*plugindomain.BookMetadata, error) {
	if p.missingDetail || id != "record-1" {
		return nil, nil
	}
	record := p.record()
	return &record, nil
}
func (p *referenceProvider) GetCover(string, map[string]any) (*pluginiface.CoverResult, error) {
	return &pluginiface.CoverResult{Extension: "jpg", Content: p.cover}, nil
}

func referenceFixture(t *testing.T) (*bookWiring, *referenceProvider, string) {
	t.Helper()
	w, directory := newToolsFixture(t)
	seedReader(t, w.db, "reference-admin", "password123", true, true)
	insertBook(t, w.libraryDB, 1, "Original title")
	insertItem(t, w.db, 1, "public", 1)
	path := seedRealFormat(t, w, directory, 1, "TXT", "untouched original ebook")
	w.libraryRoot = filepath.Join(directory, "managed")
	w.registry = pluginruntime.NewPluginRegistry()
	provider := &referenceProvider{key: "talebook.test.reference"}
	registerReference(t, w, provider)
	return w, provider, path
}

func registerReference(t *testing.T, w *bookWiring, provider *referenceProvider) {
	t.Helper()
	if _, err := w.registry.Register(provider, pluginiface.CapabilitySet{Interfaces: map[string]bool{"MetadataProvider": true}, HasSelfCheck: true}); err != nil {
		t.Fatal(err)
	}
}

func TestBookReferencesStreamCandidatesAndPartialFailures(t *testing.T) {
	w, _, path := referenceFixture(t)
	registerReference(t, w, &referenceProvider{key: "talebook.test.failed-reference", fail: true})
	ctx := adminCtx(1)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/book/1/refer?stream=1", nil)
	recorder := httptest.NewRecorder()
	ctx.Writer = recorder
	result, err := w.bookRefer(ctx, 1, map[string]any{})
	if err != nil || result != nil {
		t.Fatalf("result=%v err=%v", result, err)
	}
	if recorder.Header().Get("X-Accel-Buffering") != "no" {
		t.Fatal("stream buffering enabled")
	}
	decoder := json.NewDecoder(recorder.Body)
	var first map[string]any
	if err := decoder.Decode(&first); err != nil || first["err"] != "ok" {
		t.Fatalf("first=%v %v", first, err)
	}
	found, summary := false, false
	for decoder.More() {
		var event map[string]any
		if err := decoder.Decode(&event); err != nil {
			t.Fatal(err)
		}
		if event["provider_key"] == "talebook.test.reference" && event["title"] == "Selected title" {
			found = true
		}
		if event["event"] == "summary" {
			summary = true
			if len(event["failures"].([]any)) != 1 {
				t.Fatalf("summary=%v", event)
			}
		}
	}
	if !found || !summary {
		t.Fatalf("candidate=%v summary=%v", found, summary)
	}
	if data, _ := os.ReadFile(path); string(data) != "untouched original ebook" {
		t.Fatal("source ebook changed")
	}
}

func TestBookReferenceApplyFallbackPreservesOriginalPath(t *testing.T) {
	w, provider, path := referenceFixture(t)
	provider.missingDetail = true
	ctx := adminCtx(1)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/api/book/1/refer", nil)
	result, err := w.bookRefer(ctx, 1, map[string]any{"provider_key": provider.key, "provider_value": "record-1", "only_meta": "yes"})
	if err != nil || result["err"] != "ok" {
		t.Fatalf("result=%v err=%v", result, err)
	}
	book, err := bookGetOne(w.Config(""), 1)
	if err != nil || book.Title != "Selected title" || len(book.Authors) != 1 || book.Authors[0] != "Selected author" || book.Publisher != "Selected press" {
		t.Fatalf("book=%+v err=%v", book, err)
	}
	var authorSort string
	if err := w.libraryDB.QueryRow(`SELECT author_sort FROM books WHERE id=1`).Scan(&authorSort); err != nil || authorSort != "Selected author" {
		t.Fatalf("author_sort=%s err=%v", authorSort, err)
	}
	formats, err := library.ListFormats(w.libraryDB, 1)
	if err != nil || len(formats) != 1 || formats[0].Path != path {
		t.Fatalf("formats=%+v err=%v", formats, err)
	}
	if data, _ := os.ReadFile(path); string(data) != "untouched original ebook" {
		t.Fatal("source ebook changed")
	}
}

func TestBookReferenceCoverOnlyReplacesManagedImage(t *testing.T) {
	w, provider, path := referenceFixture(t)
	makeImage := func(c color.RGBA) []byte {
		img := image.NewRGBA(image.Rect(0, 0, 2, 2))
		for y := 0; y < 2; y++ {
			for x := 0; x < 2; x++ {
				img.SetRGBA(x, y, c)
			}
		}
		var buffer bytes.Buffer
		jpeg.Encode(&buffer, img, nil)
		return buffer.Bytes()
	}
	original := makeImage(color.RGBA{R: 255, A: 255})
	provider.cover = makeImage(color.RGBA{B: 255, A: 255})
	if _, err := library.StoreCover(w.libraryDB, w.libraryRoot, 1, original); err != nil {
		t.Fatal(err)
	}
	before, _ := library.Cover(w.libraryDB, 1, w.libraryRoot)
	ctx := adminCtx(1)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/api/book/1/refer", nil)
	result, err := w.bookRefer(ctx, 1, map[string]any{"provider_key": provider.key, "provider_value": "record-1", "only_cover": "yes"})
	if err != nil || result["err"] != "ok" {
		t.Fatalf("result=%v err=%v", result, err)
	}
	after, _ := library.Cover(w.libraryDB, 1, w.libraryRoot)
	if bytes.Equal(before, after) {
		t.Fatal("selected cover did not replace existing artwork")
	}
	book, _ := bookGetOne(w.Config(""), 1)
	if book.Title != "Original title" {
		t.Fatal("cover-only operation changed metadata")
	}
	provider.cover = []byte("invalid image")
	result, err = w.bookRefer(ctx, 1, map[string]any{"provider_key": provider.key, "provider_value": "record-1", "only_cover": "yes"})
	if err != nil || result["err"] != "cover.invalid" {
		t.Fatalf("result=%v err=%v", result, err)
	}
	retained, _ := library.Cover(w.libraryDB, 1, w.libraryRoot)
	if !bytes.Equal(after, retained) {
		t.Fatal("invalid image replaced existing cover")
	}
	if data, _ := os.ReadFile(path); string(data) != "untouched original ebook" {
		t.Fatal("source ebook changed")
	}
}

func TestBookReferenceRejectsUnknownSelectionAndConflictingFlags(t *testing.T) {
	w, provider, _ := referenceFixture(t)
	ctx := adminCtx(1)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/api/book/1/refer", nil)
	for _, args := range []map[string]any{
		{"provider_key": provider.key, "provider_value": "not-selected"},
		{"provider_key": provider.key, "provider_value": "record-1", "only_meta": true, "only_cover": true},
		{"provider_key": "talebook.test.disabled", "provider_value": "record-1"},
	} {
		result, err := w.bookRefer(ctx, 1, args)
		if err != nil || result["err"] == "ok" {
			t.Fatalf("invalid selection accepted: %v %v", result, err)
		}
	}
	book, _ := bookGetOne(w.Config(""), 1)
	if book.Title != "Original title" {
		t.Fatal("invalid request changed metadata")
	}
}
