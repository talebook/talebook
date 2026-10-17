package pluginbuiltin

import (
	"crypto/sha256"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"time"

	"talebook/booksvr/internal/metasource"
	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginproto"
)

func TestTomatoMetadataSurvivesUnavailablePage(t *testing.T) {
	client := auditClient(func(r *http.Request) (int, string) {
		if r.URL.Host == "api-lf.fanqiesdk.com" {
			return 200, `{"data":{"ret_data":[{"book_id":"7345722444667161662","title":"西游记","author":"吴承恩","abstract":"作品简介","thumb_url":"https://example.org/cover.jpg"}]}}`
		}
		return 404, "not found"
	})
	source := metasource.NewTomatoSource(client)
	for _, metadata := range []map[string]any{source.GetBook("西游记", "吴承恩", false), source.GetBookByIDDirect("7345722444667161662", false)} {
		if metadata == nil || metadata["title"] != "西游记" || metadata["provider_value"] != "7345722444667161662" || metadata["cover_url"] != "https://example.org/cover.jpg" {
			t.Fatalf("metadata=%v", metadata)
		}
	}
	if metadata := source.GetBookByIDDirect("9999999999999999999", false); metadata != nil {
		t.Fatalf("another book accepted: %v", metadata)
	}
}

func TestTomatoReleaseHashesUseGoArchitectures(t *testing.T) {
	for _, arch := range []string{"amd64", "arm64"} {
		if len(tomatoReleaseHashes[arch]) != 64 {
			t.Fatalf("missing SHA-256 for Go architecture %s", arch)
		}
	}
}

func TestTomatoStartupRecognizesSanitizedConnectionFailure(t *testing.T) {
	if !isConnectionRefused(pluginproto.NewUpstreamError("无法连接插件服务 127.0.0.1", "connection", nil)) {
		t.Fatal("startup cannot retry the sanitized loopback error")
	}
	if isConnectionRefused(pluginproto.NewUpstreamError("access denied", "http", nil)) {
		t.Fatal("HTTP failure retried as not listening")
	}
}

func TestTomatoFailedProcessIsReapedAndDirectoryRemoved(t *testing.T) {
	if runtime.GOOS != "linux" {
		t.Skip("Linux executable fixture")
	}
	binary := filepath.Join(t.TempDir(), "downloader")
	content := []byte("#!/bin/sh\nexit 2\n")
	if err := os.WriteFile(binary, content, 0700); err != nil {
		t.Fatal(err)
	}
	previous := tomatoReleaseHashes[runtime.GOARCH]
	tomatoReleaseHashes[runtime.GOARCH] = fmt.Sprintf("%x", sha256.Sum256(content))
	defer func() { tomatoReleaseHashes[runtime.GOARCH] = previous }()
	session, err := newTomatoDownloaderSession(map[string]any{"config": map[string]any{"binary_path": binary, "timeout_seconds": float64(5)}})
	if err != nil {
		t.Fatal(err)
	}
	started := time.Now()
	err = session.start()
	session.close()
	if err == nil || time.Since(started) > 3*time.Second {
		t.Fatalf("failed process not detected promptly: %v %s", err, time.Since(started))
	}
	if _, err := os.Stat(session.root); !os.IsNotExist(err) {
		t.Fatalf("temporary directory retained: %s %v", session.root, err)
	}
}

func TestCalibreMetadataKeepsDescriptiveFields(t *testing.T) {
	metadata := calibreResultToMetadata(&metasource.CalibreIdentifyResult{
		Title: "Pride and Prejudice", Authors: []string{"Jane Austen"}, Publisher: "Penguin", Comments: "A novel", PubDate: "2012-01-01T00:00:00", Tags: []string{"Fiction"}, Series: "Classics", Language: "eng",
	})
	for key, want := range map[string]string{"publisher": "Penguin", "comments": "A novel", "pubdate": "2012-01-01T00:00:00", "series": "Classics", "language": "eng"} {
		if metadata[key] != want {
			t.Fatalf("%s=%v want=%s", key, metadata[key], want)
		}
	}
	if tags, ok := metadata["tags"].([]string); !ok || len(tags) != 1 || tags[0] != "Fiction" {
		t.Fatalf("tags=%v", metadata["tags"])
	}
}

func TestGoogleBooksUsesOptionalProjectKeyAndTitle(t *testing.T) {
	old := reviewHTTPClient
	defer func() { reviewHTTPClient = old }()
	reviewHTTPClient = auditClient(func(r *http.Request) (int, string) {
		if r.URL.Query().Get("key") != "test-project-key" || r.URL.Query().Get("q") != "intitle:Pride and Prejudice" {
			t.Fatalf("wrong request %s", r.URL.RawQuery)
		}
		return 200, `{"items":[{"id":"fixture","volumeInfo":{"averageRating":4.5,"ratingsCount":100}}]}`
	})
	_, payload, err := googleBooksFetch(map[string]any{"secrets": map[string]any{"api_key": "test-project-key"}}, map[string]any{"title": "Pride and Prejudice"})
	if err != nil || payload["items"] == nil {
		t.Fatalf("payload=%v err=%v", payload, err)
	}
	if _, _, err := googleBooksFetch(nil, nil); err == nil {
		t.Fatal("empty query accepted")
	}
	manifest := reviewManifest(googleBooksSpec())
	schema := manifest["auth_schema"].(map[string]any)
	if schema["required"] != nil {
		t.Fatal("project key incorrectly required")
	}
	properties := schema["properties"].(map[string]any)
	if properties["api_key"].(map[string]any)["writeOnly"] != true {
		t.Fatal("key is not secret")
	}
}

func TestRepairTomatoLive(t *testing.T) {
	binary := os.Getenv("TALEBOOK_TOMATO_LIVE_BINARY")
	if binary == "" {
		t.Skip("requires pinned real downloader and upstream network")
	}
	provider := newTomatoDownloaderProvider()
	context := map[string]any{"config": map[string]any{"binary_path": binary, "output_format": "epub", "timeout_seconds": float64(180)}}
	page, err := provider.Search("朝花夕拾", nil, context)
	if err != nil || len(page.Items) == 0 {
		t.Fatalf("search=%+v err=%v", page, err)
	}
	t.Logf("search results=%d", len(page.Items))
	var selected plugindomain.SourceBook
	for _, raw := range page.Items {
		book, ok := raw.(plugindomain.SourceBook)
		if !ok {
			continue
		}
		for _, author := range book.Authors {
			if author == "鲁迅" || author == "鲁迅著" {
				selected = book
				break
			}
		}
		if selected.ExternalID != "" {
			break
		}
	}
	if selected.ExternalID == "" {
		t.Fatal("no public-domain Lu Xun sample in search results")
	}
	detail, err := provider.GetBook(selected.ExternalID, context)
	if err != nil || detail.Title == "" {
		t.Fatalf("detail=%+v err=%v", detail, err)
	}
	file, err := provider.Download(detail, context)
	if err != nil || len(file.Content) == 0 {
		t.Fatalf("download bytes=%d err=%v", len(file.Content), err)
	}
	t.Logf("book=%s id=%s filename=%s bytes=%d", detail.Title, detail.ExternalID, file.Filename, len(file.Content))
}
