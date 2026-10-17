package pluginbuiltin

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"talebook/booksvr/internal/booksource"
	"talebook/booksvr/internal/metasource"
	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginruntime"
	"talebook/booksvr/internal/safehttp"
)

type auditTransport func(*http.Request) (*http.Response, error)

func (f auditTransport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

// auditClient preserves endpoint checks while replacing only network I/O.
func auditClient(fn func(*http.Request) (int, string)) *safehttp.SafeHttpClient {
	return &safehttp.SafeHttpClient{Resolver: func(string, int) ([]string, error) { return []string{"93.184.216.34"}, nil }, Session: &http.Client{Transport: auditTransport(func(r *http.Request) (*http.Response, error) {
		code, body := fn(r)
		return &http.Response{StatusCode: code, Header: http.Header{"Content-Type": []string{"application/json"}}, Body: io.NopCloser(strings.NewReader(body)), Request: r}, nil
	})}}
}

func TestAuditOpenLibrarySearchAndReviews(t *testing.T) {
	old := reviewHTTPClient
	defer func() { reviewHTTPClient = old }()
	calls := 0
	reviewHTTPClient = auditClient(func(r *http.Request) (int, string) {
		calls++
		switch r.URL.Path {
		case "/search.json":
			if r.URL.Query().Get("q") != "西游记" {
				t.Errorf("query=%s", r.URL.RawQuery)
			}
			return 200, `{"docs":[{"key":"/works/OL1W","title":"西游记","author_name":["吴承恩"],"isbn":["9787111123456"]}]}`
		case "/api/books":
			return 200, `{"ISBN:9787111123456":{"title":"西游记","authors":[{"name":"吴承恩"}],"url":"https://openlibrary.org/books/OL1M","ratings":{"average":4,"count":12}}}`
		case "/works/OL1W.json":
			return 200, `{"title":"西游记","description":{"value":"古典名著"},"authors":[{"author":{"key":"/authors/OL1A"}}],"covers":[123],"publishers":["人民文学出版社"]}`
		case "/authors/OL1A.json":
			return 200, `{"name":"吴承恩"}`
		}
		t.Errorf("unexpected request %s", r.URL)
		return 404, `{}`
	})
	p := newOpenLibraryProvider()
	rows, err := p.SearchBooks(plugindomain.MetadataQuery{Title: "西游记"}, nil)
	if err != nil || len(rows) != 1 || rows[0].Get("title") != "西游记" {
		t.Fatalf("search=%v %v", rows, err)
	}
	reviews, err := p.GetReviews(map[string]any{"isbn": "9787111123456"}, nil)
	if err != nil || len(reviews.Items) != 1 {
		t.Fatalf("reviews=%+v %v", reviews, err)
	}
	if calls != 2 {
		t.Fatalf("requests=%d", calls)
	}
	detail, err := p.GetMetadata("/works/OL1W", nil)
	if err != nil || detail.Get("title") != "西游记" || detail.Get("comments") != "古典名著" || detail.Get("cover_url") == "" {
		t.Fatalf("detail=%+v %v", detail, err)
	}
	if _, err := p.GetMetadata("https://elsewhere.example/private", nil); err == nil {
		t.Fatal("invalid book key accepted")
	}
	reviewHTTPClient.Session.Transport = auditTransport(func(r *http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: 200, Header: http.Header{"Content-Type": []string{"image/jpeg"}}, Body: io.NopCloser(strings.NewReader("fixture-cover")), Request: r}, nil
	})
	cover, err := p.GetCover("https://covers.openlibrary.org/b/id/123-L.jpg", nil)
	if err != nil || cover == nil || cover.Extension != "jpg" || string(cover.Content) != "fixture-cover" {
		t.Fatalf("cover=%+v %v", cover, err)
	}
}

func TestAuditOpenLibraryCoverArchiveRedirect(t *testing.T) {
	old := reviewHTTPClient
	defer func() { reviewHTTPClient = old }()
	reviewHTTPClient = auditClient(func(*http.Request) (int, string) { return 500, `{}` })
	calls := 0
	reviewHTTPClient.Session.Transport = auditTransport(func(r *http.Request) (*http.Response, error) {
		calls++
		code := 200
		header := http.Header{"Content-Type": []string{"image/jpeg"}}
		if r.URL.Hostname() == "covers.openlibrary.org" {
			code = 302
			header.Set("Location", "https://archive.org/download/covers/1.jpg")
		}
		if r.URL.Hostname() == "archive.org" {
			code = 302
			header.Set("Location", "https://ia800001.us.archive.org/view_archive.php?file=1.jpg")
		}
		return &http.Response{StatusCode: code, Header: header, Body: io.NopCloser(strings.NewReader("image")), Request: r}, nil
	})
	cover, err := newOpenLibraryProvider().GetCover("https://covers.openlibrary.org/b/id/1-L.jpg", nil)
	if err != nil || cover == nil || calls != 3 {
		t.Fatalf("cover=%+v calls=%d %v", cover, calls, err)
	}
	for _, raw := range []string{"http://archive.org/a", "https://archive.org.evil.example/a", "https://evilarchive.org/a", "https://archive.org:8443/a", "https://127.0.0.1/a"} {
		target, _ := url.Parse(raw)
		if openLibraryCoverRedirect(target) {
			t.Errorf("untrusted redirect accepted: %s", raw)
		}
	}
	if _, err := newOpenLibraryProvider().GetCover("https://elsewhere.example/1.jpg", nil); err == nil {
		t.Fatal("foreign cover host accepted")
	}
}

func TestAuditCatalogReviews(t *testing.T) {
	old := reviewHTTPClient
	defer func() { reviewHTTPClient = old }()
	cases := []struct {
		spec  reviewSourceSpec
		fetch reviewFetchFunc
		parse reviewParseFunc
		body  string
	}{
		{hardcoverSpec(), hardcoverFetch, hardcoverParse, `{"data":{"books":[{"id":1,"slug":"journey","rating":4,"rating_count":12}]}}`},
		{neodbReviewSpec(), neodbReviewFetch, neodbReviewParse, `{"data":[{"rating":8,"rating_count":12,"url":"https://neodb.social/book/1"}]}`},
		{googleBooksSpec(), googleBooksFetch, googleBooksParse, `{"items":[{"volumeInfo":{"averageRating":4,"ratingsCount":12,"infoLink":"https://books.google.com/1"}}]}`},
		{bangumiSpec(), bangumiFetch, bangumiParse, `{"rating":{"score":8,"total":12}}`},
		{anilistSpec(), anilistFetch, anilistParse, `{"data":{"Media":{"averageScore":80,"popularity":12,"siteUrl":"https://anilist.co/manga/1"}}}`},
	}
	for _, tc := range cases {
		t.Run(tc.spec.PluginID, func(t *testing.T) {
			calls := 0
			reviewHTTPClient = auditClient(func(r *http.Request) (int, string) { calls++; return 200, tc.body })
			p := newCatalogReviewProvider(tc.spec, tc.fetch, tc.parse)
			q := map[string]any{"isbn": "9787111123456", "title": "西游记", "domain_id": "1"}
			page, err := p.GetReviews(q, map[string]any{"secrets": map[string]any{"token": "fixture-token"}})
			if err != nil || len(page.Items) != 1 || len(page.Failures) != 0 || calls != 1 {
				t.Fatalf("page=%+v err=%v calls=%d", page, err, calls)
			}
			reviewHTTPClient = auditClient(func(*http.Request) (int, string) { return 200, `{}` })
			page, err = p.GetReviews(q, nil)
			if err != nil || len(page.Items) != 0 || len(page.Failures) != 1 {
				t.Fatalf("missing rating=%+v %v", page, err)
			}
			reviewHTTPClient = auditClient(func(*http.Request) (int, string) { return 401, `{}` })
			page, err = p.GetReviews(q, nil)
			if err != nil || len(page.Failures) != 1 {
				t.Fatalf("auth failure=%+v %v", page, err)
			}
		})
	}
}

func TestAuditReviewFileFormats(t *testing.T) {
	for _, tc := range []struct{ source, format, content string }{
		{"goodreads", "csv", "Book Id,Title,Author,My Rating\n1,西游记,吴承恩,4\n"},
		{"storygraph", "csv", "ISBN/UID,Title,Authors,Star Rating\n9787111123456,西游记,吴承恩,4\n"},
		{"generic", "json", `[{"external_id":"1","title":"西游记","rating":"4"}]`},
	} {
		t.Run(tc.source, func(t *testing.T) {
			page, err := newReviewFileProvider().GetReviews(nil, map[string]any{"config": map[string]any{"source": tc.source, "format": tc.format}, "secrets": map[string]any{"content": tc.content}})
			if err != nil || len(page.Items) != 1 {
				t.Fatalf("%+v %v", page, err)
			}
		})
	}
}

func TestAuditOPDSPresets(t *testing.T) {
	reg := pluginruntime.NewPluginRegistry()
	if err := Register(reg); err != nil {
		t.Fatal(err)
	}
	for _, provider := range reg.Providers() {
		id := provider.Manifest()["id"].(string)
		var set func(*safehttp.SafeHttpClient)
		switch p := provider.(type) {
		case *GenericOPDSProvider:
			set = func(c *safehttp.SafeHttpClient) { p.HTTP = c }
		case *opdsPresetProvider:
			set = func(c *safehttp.SafeHttpClient) { p.HTTP = c }
		default:
			continue
		}
		t.Run(id, func(t *testing.T) {
			set(auditClient(func(r *http.Request) (int, string) {
				if strings.HasSuffix(r.URL.Path, ".epub") {
					return 200, "fixture-epub-bytes"
				}
				return 200, `{"publications":[{"metadata":{"title":"西游记","identifier":"book-1","author":[{"name":"吴承恩"}]},"links":[{"rel":"http://opds-spec.org/acquisition","href":"https://catalog.example/book.epub","type":"application/epub+zip"}]}]}`
			}))
			p := provider.(pluginiface.SourceProvider)
			ctx := map[string]any{"config": map[string]any{"endpoint": "https://catalog.example/opds"}}
			page, err := p.Browse("", nil, ctx)
			if err != nil || len(page.Items) != 1 {
				t.Fatalf("browse=%+v %v", page, err)
			}
			b, ok := page.Items[0].(plugindomain.SourceBook)
			if !ok || b.Title != "西游记" {
				t.Fatalf("book=%+v", page.Items[0])
			}
			out, err := p.Download(plugindomain.SourceBookDetail{ExternalID: b.ExternalID, Title: b.Title, AcquisitionURL: b.AcquisitionURL, Format: b.Format, Downloadable: true}, ctx)
			if err != nil || string(out.Content) != "fixture-epub-bytes" {
				t.Fatalf("download=%+v %v", out, err)
			}
			set(auditClient(func(*http.Request) (int, string) { return 503, `{}` }))
			if _, err := p.Browse("", nil, ctx); err == nil {
				t.Fatal("503 must fail")
			}
		})
	}
}

func TestAuditDeviceUploads(t *testing.T) {
	reg := pluginruntime.NewPluginRegistry()
	if err := Register(reg); err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(t.TempDir(), "西游记.epub")
	if err := os.WriteFile(path, []byte("fixture-book"), 0600); err != nil {
		t.Fatal(err)
	}
	old := pushHTTPClient
	defer func() { pushHTTPClient = old }()
	for _, provider := range reg.Providers() {
		p, ok := provider.(*DevicePushProvider)
		if !ok {
			continue
		}
		t.Run(p.Manifest()["id"].(string), func(t *testing.T) {
			calls := 0
			pushHTTPClient = auditClient(func(r *http.Request) (int, string) {
				calls++
				if r.Method != "POST" {
					t.Errorf("method=%s", r.Method)
				}
				if err := r.ParseMultipartForm(1024 * 1024); err != nil {
					t.Fatal(err)
				}
				defer r.MultipartForm.RemoveAll()
				files := 0
				for _, headers := range r.MultipartForm.File {
					for _, h := range headers {
						f, err := h.Open()
						if err != nil {
							t.Fatal(err)
						}
						data, _ := io.ReadAll(f)
						f.Close()
						if string(data) != "fixture-book" {
							t.Errorf("payload=%s", data)
						}
						files++
					}
				}
				if files != 1 {
					t.Errorf("file count=%d", files)
				}
				return 200, `{"code":0,"successful":true,"success":true}`
			})
			result, err := p.Push(path, "https://device.example", nil)
			if err != nil || calls != 1 {
				t.Fatalf("push=%+v %v calls=%d", result, err, calls)
			}
			pushHTTPClient = auditClient(func(*http.Request) (int, string) { return 503, `{}` })
			if _, err := p.Push(path, "https://device.example", nil); err == nil {
				t.Fatal("503 must fail")
			}
			if _, err := p.Push(path, "", nil); err == nil {
				t.Fatal("missing address must fail")
			}
		})
	}
}

func TestAuditWatchFolderIncremental(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, "西游记.txt")
	if err := os.WriteFile(path, []byte("第一回"), 0600); err != nil {
		t.Fatal(err)
	}
	p := newWatchFolderProvider()
	ctx := map[string]any{"config": map[string]any{"path": root}, "platform": map[string]any{"import_allowed_roots": []any{root}}}
	entries, cursor, err := p.discover(ctx)
	if err != nil || len(entries) != 1 {
		t.Fatalf("scan=%+v %v", entries, err)
	}
	book, err := p.GetBook(entries[0]["external_id"].(string), ctx)
	if err != nil {
		t.Fatal(err)
	}
	file, err := p.Download(book, ctx)
	if err != nil || file.LocalPath != path || len(file.Content) != 0 {
		t.Fatalf("local reference=%+v %v", file, err)
	}
	ctx["cursor"] = cursor
	entries, _, err = p.discover(ctx)
	if err != nil || len(entries) != 0 {
		t.Fatalf("incremental=%+v %v", entries, err)
	}
	data, _ := os.ReadFile(path)
	if string(data) != "第一回" {
		t.Fatal("source changed")
	}
}

func TestAuditBRSUnicodeSummary(t *testing.T) {
	for _, n := range []int{200, 501} {
		row := map[string]any{"summary": strings.Repeat("中", n)}
		data := brsChapterReview(row, "https://brs.example", "brs:1", "1", "1", "1")
		got := []rune(data["summary"].(string))
		want := n
		if want > 500 {
			want = 500
		}
		if len(got) != want {
			t.Fatalf("summary runes=%d want=%d", len(got), want)
		}
	}
}

func TestAuditWereadSearch(t *testing.T) {
	old := reviewHTTPClient
	defer func() { reviewHTTPClient = old }()
	reviewHTTPClient = auditClient(func(r *http.Request) (int, string) {
		if r.Header.Get("Authorization") != "Bearer fixture" {
			t.Error("missing authorization")
		}
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatal(err)
		}
		if body["keyword"] != "西游记" {
			t.Errorf("body=%+v", body)
		}
		return 200, `{"errcode":0,"books":[{"bookId":"1","title":"西游记","author":"吴承恩"}]}`
	})
	rows, err := newWereadProvider().SearchBooks(plugindomain.MetadataQuery{Title: "西游记"}, map[string]any{"secrets": map[string]any{"api_key": "fixture"}})
	if err != nil || len(rows) != 1 {
		t.Fatalf("rows=%+v %v", rows, err)
	}
	if _, err := newWereadProvider().SearchBooks(plugindomain.MetadataQuery{Title: "西游记"}, nil); err == nil {
		t.Fatal("missing token must fail")
	}
}

func TestAuditWebSources(t *testing.T) {
	t.Run("gutenberg", func(t *testing.T) {
		p := newGutenbergProvider()
		p.HTTP = auditClient(func(*http.Request) (int, string) {
			return 200, `{"results":[{"id":1,"title":"西游记","authors":[{"name":"吴承恩"}],"formats":{"text/plain":"https://books.example/1.txt"}}],"next":"https://gutendex.com/books/?page=2"}`
		})
		page, err := p.Search("西游记", nil, nil)
		if err != nil || len(page.Items) != 1 || !page.HasMore {
			t.Fatalf("page=%+v %v", page, err)
		}
	})
	t.Run("internet-archive", func(t *testing.T) {
		p := newInternetArchiveProvider()
		p.HTTP = auditClient(func(r *http.Request) (int, string) {
			if strings.HasPrefix(r.URL.Path, "/metadata/") {
				return 200, `{"metadata":{"title":"西游记","creator":"吴承恩"},"files":[{"name":"book.txt","format":"text/plain"}]}`
			}
			return 200, `{"response":{"docs":[{"identifier":"journey","title":"西游记","creator":"吴承恩"}]}}`
		})
		page, err := p.Search("西游记", nil, nil)
		if err != nil || len(page.Items) != 1 {
			t.Fatalf("page=%+v %v", page, err)
		}
	})
	t.Run("webdav", func(t *testing.T) {
		p := newWebDAVProvider()
		p.HTTP = auditClient(func(r *http.Request) (int, string) {
			if r.Method != "PROPFIND" || r.Header.Get("Depth") != "1" {
				t.Errorf("request %s %+v", r.Method, r.Header)
			}
			return 207, `<multistatus xmlns="DAV:"><response><href>http://catalog.example/books/book.txt</href><propstat><prop><getetag>etag1</getetag></prop><status>HTTP/1.1 200 OK</status></propstat></response></multistatus>`
		})
		ctx := map[string]any{"config": map[string]any{"endpoint": "http://catalog.example/books/"}}
		entries, cursor, err := p.discover(ctx)
		if err != nil || len(entries) != 1 {
			t.Fatalf("entries=%+v %v", entries, err)
		}
		if entries[0]["acquisition_url"] != "http://catalog.example/books/book.txt" {
			t.Fatalf("bad absolute URL: %+v", entries[0])
		}
		ctx["cursor"] = cursor
		entries, _, err = p.discover(ctx)
		if err != nil || len(entries) != 0 {
			t.Fatalf("incremental=%+v %v", entries, err)
		}
	})
}

func TestAuditBRSPull(t *testing.T) {
	old := reviewHTTPClient
	defer func() { reviewHTTPClient = old }()
	reviewHTTPClient = auditClient(func(r *http.Request) (int, string) {
		if r.Header.Get("Authorization") == "" {
			t.Error("missing auth")
		}
		return 200, `{"comments":[{"id":"c1","book_id":"remote1","chapter_id":"ch1","content":"第一回评论"}],"next_cursor":"next1"}`
	})
	result, err := newBRSProvider().Execute(map[string]any{"config": map[string]any{"endpoint": "https://brs.example", "book_map": map[string]any{"remote1": "1"}}, "secrets": map[string]any{"email": "fixture@example.com", "password": "fixture"}})
	if err != nil || len(result.Items) != 1 || result.Items[0].ErrorCode != "" {
		t.Fatalf("result=%+v %v", result, err)
	}
}

// auditEPUB is a complete small EPUB fixture, independent of a production book.
func auditEPUB(t *testing.T) []byte {
	t.Helper()
	var buf bytes.Buffer
	w := zip.NewWriter(&buf)
	for _, entry := range []struct{ name, body string }{
		{"mimetype", "application/epub+zip"},
		{"META-INF/container.xml", `<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`},
		{"OEBPS/content.opf", `<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>西游记</dc:title><dc:identifier id="id">fixture</dc:identifier><dc:language>zh</dc:language></metadata><manifest><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/></manifest><spine toc="ncx"><itemref idref="chapter"/></spine></package>`},
		{"OEBPS/chapter.xhtml", `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>第一回</title></head><body><h1>第一回</h1><p>普通中文小說第一回，孫悟空與唐僧。</p></body></html>`},
		{"OEBPS/toc.ncx", `<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head/><docTitle><text>西游记</text></docTitle><navMap><navPoint id="ch1" playOrder="1"><navLabel><text>第一回</text></navLabel><content src="chapter.xhtml"/></navPoint></navMap></ncx>`},
	} {
		f, err := w.Create(entry.name)
		if err != nil {
			t.Fatal(err)
		}
		if _, err = f.Write([]byte(entry.body)); err != nil {
			t.Fatal(err)
		}
	}
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func TestAuditTomatoEPUBValidation(t *testing.T) {
	if err := tomatoValidateEpub(auditEPUB(t)); err != nil {
		t.Fatal(err)
	}
	if err := tomatoValidateEpub([]byte("broken")); err == nil {
		t.Fatal("invalid EPUB accepted")
	}
}

func TestAuditTomatoJobCreate(t *testing.T) {
	posts := 0
	s := &tomatoDownloaderSession{endpoint: "https://downloader.example", password: "fixture", format: "txt", deadline: time.Now().Add(time.Minute)}
	s.http = auditClient(func(r *http.Request) (int, string) {
		if r.Method == "POST" {
			posts++
			var body map[string]any
			if r.Body == nil || json.NewDecoder(r.Body).Decode(&body) != nil || body["book_id"] != "1234567890123" {
				t.Error("job must contain book_id")
			}
			return 200, `{"id":1}`
		}
		return 200, `{"items":[{"id":1,"book_id":"1234567890123","state":"failed"}]}`
	})
	if _, err := s.download("1234567890123"); err == nil {
		t.Fatal("failed job accepted")
	}
	if posts != 1 {
		t.Fatalf("job POST count=%d", posts)
	}
}

func TestAuditTextToolsAndAllBeautifyPresets(t *testing.T) {
	root := t.TempDir()
	txt := filepath.Join(root, "book.txt")
	epub := filepath.Join(root, "book.epub")
	if err := os.WriteFile(txt, []byte("普通中文小說第一回，孫悟空與唐僧。"), 0600); err != nil {
		t.Fatal(err)
	}
	original := auditEPUB(t)
	if err := os.WriteFile(epub, original, 0600); err != nil {
		t.Fatal(err)
	}
	cases := []struct {
		p     pluginiface.TransformProvider
		input map[string]any
	}{
		{newTextReplaceProvider(), map[string]any{"path": txt, "format": "TXT", "pattern": "孫悟空", "replacement": "孙悟空"}},
		{newTxtFixerProvider(), map[string]any{"path": txt, "format": "TXT"}},
		{newZhConverterProvider(), map[string]any{"path": txt, "format": "TXT", "direction": "t2s"}},
	}
	for _, tc := range cases {
		t.Run(tc.p.(pluginiface.Provider).Manifest()["id"].(string), func(t *testing.T) {
			in := plugindomain.ToolInput{DomainRecord: plugindomain.NewDomainRecord(tc.input)}
			if _, err := tc.p.Preview(in, nil); err != nil {
				t.Fatal(err)
			}
			out, err := tc.p.Apply(in, t.TempDir(), nil)
			if err != nil {
				t.Fatal(err)
			}
			path, _ := out.Get("path").(string)
			data, err := os.ReadFile(path)
			if err != nil || len(data) == 0 {
				t.Fatalf("output %s %v", path, err)
			}
		})
	}
	p := newEpubBeautifyProvider()
	for preset := range listPresets() {
		for _, style := range tocStyles {
			toc := style["id"].(string)
			t.Run("epub-beautify/"+preset+"/"+toc, func(t *testing.T) {
				in := plugindomain.ToolInput{DomainRecord: plugindomain.NewDomainRecord(map[string]any{"path": epub, "format": "EPUB", "preset": preset, "toc_style": toc})}
				if _, err := p.Preview(in, nil); err != nil {
					t.Fatal(err)
				}
				out, err := p.Apply(in, t.TempDir(), nil)
				if err != nil {
					t.Fatal(err)
				}
				path, _ := out.Get("path").(string)
				data, err := os.ReadFile(path)
				if err != nil {
					t.Fatal(err)
				}
				if err := tomatoValidateEpub(data); err != nil {
					t.Fatalf("generated EPUB invalid: %v", err)
				}
			})
		}
	}
	data, _ := os.ReadFile(epub)
	if !bytes.Equal(data, original) {
		t.Fatal("original EPUB changed")
	}
}

type auditIdentifier struct{}

func (auditIdentifier) Identify(string, metasource.CalibreQuery, float64) ([]*metasource.CalibreIdentifyResult, error) {
	return []*metasource.CalibreIdentifyResult{{Title: "西游记", Authors: []string{"吴承恩"}, ISBN: "9787020008735"}}, nil
}
func (auditIdentifier) CachedCoverURL(map[string]string) string { return "" }
func (auditIdentifier) CachedCoverURLIsReliable() bool          { return false }

func TestAuditMetadataAdapters(t *testing.T) {
	reg := pluginruntime.NewPluginRegistry()
	if err := Register(reg); err != nil {
		t.Fatal(err)
	}
	for _, provider := range reg.Providers() {
		id := provider.Manifest()["id"].(string)
		if !strings.HasPrefix(id, "talebook.meta.") {
			continue
		}
		t.Run(id, func(t *testing.T) {
			var client *safehttp.SafeHttpClient
			switch p := provider.(type) {
			case *doubanV2Provider:
				client = auditClient(func(*http.Request) (int, string) {
					return 200, `<script>window.__DATA__ = {"items":[{"tpl_name":"search_subject","id":"1","title":"西游记","url":"https://book.douban.com/subject/1/","abstract":"吴承恩 / 人民文学出版社 / 1980-01"}]};</script>`
				})
				p.Source.HTTP = client
			case *baikeProvider:
				client = auditClient(func(*http.Request) (int, string) {
					return 200, `{"newLemmaId":1,"title":"西游记","abstract":"古典名著","card":[{"name":"作者","value":"吴承恩"},{"name":"出版社","value":"人民文学出版社"}]}`
				})
				p.Source.HTTP = client
			case *xhsdProvider:
				client = auditClient(func(*http.Request) (int, string) {
					return 200, `<html><li class="product"><p class="product-desc"><a href="https://item.xhsd.com/1">西游记</a></p></li><div class="item-title" data-item='{"name":"西游记","otherAttributes":[{"group":"BASIC","otherAttributes":[{"attrKey":"ISBN","attrVal":"9787020008735"},{"attrKey":"作者","attrVal":"吴承恩"}]}]}'></div><p>9787020008735</p></html>`
				})
				p.Source.HTTP = client
			case *tomatoMetaProvider:
				client = auditClient(func(r *http.Request) (int, string) {
					if strings.Contains(r.URL.Host, "fanqiesdk") {
						return 200, `{"data":{"ret_data":[{"book_id":"1234567890123","title":"西游记","author":"吴承恩"}]}}`
					}
					return 200, `<script>window.__INITIAL_STATE__ = {"bookName":"西游记","author":"吴承恩","abstract":"古典名著"};</script>`
				})
				p.Source.HTTP = client
			case *qimaoProvider:
				client = auditClient(func(r *http.Request) (int, string) {
					if r.URL.Query().Get("id") != "" {
						return 200, `{"data":{"book_name":"西游记","author_name":"吴承恩"}}`
					}
					return 200, `{"data":{"books":[{"book_id":"1","book_name":"西游记","author_name":"吴承恩"}]}}`
				})
				p.Source.HTTP = client
			case *neoDBProvider:
				client = auditClient(func(*http.Request) (int, string) {
					return 200, `<article class="item-card"><hgroup><h5><a href="/book/1">西游记</a></h5></hgroup><div class="multi-fields"><span>作者: <span>吴承恩</span></span></div></article>`
				})
				p.Plugin.Source.HTTP = client
			case *calibreMetaProvider:
				if _, err := p.SearchBooks(plugindomain.MetadataQuery{Title: "西游记"}, nil); err == nil {
					t.Fatal("unwired identify reported an empty success")
				}
				report, err := p.SelfCheck(nil)
				if err != nil || report.Healthy {
					t.Fatalf("unwired check=%+v %v", report, err)
				}
				p.Source.API.Identifier = auditIdentifier{}
			}
			rows, err := provider.(pluginiface.MetadataProvider).SearchBooks(plugindomain.MetadataQuery{Title: "西游记", ISBN: "9787020008735"}, nil)
			if err != nil || len(rows) == 0 || rows[0].Get("title") != "西游记" {
				t.Fatalf("rows=%+v %v", rows, err)
			}
			if client != nil {
				client.Session = auditClient(func(*http.Request) (int, string) { return 503, `{}` }).Session
				rows, err = provider.(pluginiface.MetadataProvider).SearchBooks(plugindomain.MetadataQuery{Title: "西游记", ISBN: "9787020008735"}, nil)
				if err == nil && len(rows) > 0 {
					t.Fatal("503 produced usable metadata")
				}
			}
		})
	}
}

func TestAuditLegadoSearchAndChapter(t *testing.T) {
	old := http.DefaultTransport
	defer func() { http.DefaultTransport = old }()
	http.DefaultTransport = auditTransport(func(r *http.Request) (*http.Response, error) {
		body := `<li><a href="/book/1">西游记</a></li>`
		switch r.URL.Path {
		case "/book/1":
			body = `<h1>西游记</h1><span class="author">吴承恩</span><a class="toc" href="/toc">目录</a>`
		case "/toc":
			body = `<li><a href="/chapter/1">第一回</a></li>`
		case "/chapter/1":
			body = `<div class="content">第一回 灵根育孕源流出</div>`
		}
		return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(body)), Request: r}, nil
	})
	ctx := map[string]any{"config": map[string]any{"source_raw": map[string]any{
		"bookSourceName": "fixture", "bookSourceUrl": "https://93.184.216.34", "searchUrl": "/search?key={{key}}",
		"ruleSearch":   map[string]any{"bookList": "li", "name": "a@text", "bookUrl": "a@href"},
		"ruleBookInfo": map[string]any{"name": "h1@text", "author": "span.author@text", "tocUrl": "a.toc@href"},
		"ruleToc":      map[string]any{"chapterList": "li", "chapterName": "a@text", "chapterUrl": "a@href"},
		"ruleContent":  map[string]any{"content": "div.content@text"},
	}}}
	p := newLegadoProvider()
	page, err := p.Search("西游记", nil, ctx)
	if err != nil || len(page.Items) != 1 {
		t.Fatalf("search=%+v %v", page, err)
	}
	book, err := p.GetBook("https://93.184.216.34/book/1", ctx)
	if err != nil || book.Title != "西游记" {
		t.Fatalf("book=%+v %v", book, err)
	}
	toc, err := p.GetTOC(book, ctx)
	if err != nil || len(toc) != 1 {
		t.Fatalf("toc=%+v %v", toc, err)
	}
	content, err := p.GetChapter(toc[0], ctx)
	if err != nil || !strings.Contains(content.Content, "灵根") {
		t.Fatalf("chapter=%+v %v", content, err)
	}
}

func TestAuditVeneraEngineAndNoDownload(t *testing.T) {
	script := `class MangaDex {constructor(){this.key='manga_dex';this.api={getRecent:async(page)=>({comics:[{id:'a1b2c3d4-e5f6-7890-abcd-ef1234567890',title:'fixture manga'}],maxPage:1})};}}`
	out, err := booksource.RunVeneraSource(nil, script, "browse", map[string]any{"category": "recent", "page": 1}, booksource.DefaultVeneraConfig(), nil)
	if err != nil || out == nil {
		t.Fatalf("engine=%+v %v", out, err)
	}
	if _, err := newVeneraSourceProvider().Download(plugindomain.SourceBookDetail{}, nil); err == nil {
		t.Fatal("online-only manga download accepted")
	}
}

func TestAuditKindleCallbacksAndErrors(t *testing.T) {
	mail, convert := KindleMailSender, KindleConvertSender
	defer func() { KindleMailSender = mail; KindleConvertSender = convert }()
	KindleMailSender = nil
	KindleConvertSender = nil
	p := newKindleProvider()
	report, err := p.SelfCheck(nil)
	if err != nil || report.Healthy {
		t.Fatalf("unwired check=%+v %v", report, err)
	}
	called := false
	KindleMailSender = func(_ any, _ string, book map[string]any, to, format, path string) error {
		called = true
		if to != "fixture@example.com" || format != "epub" || path != "fixture.epub" {
			t.Errorf("mail=%s %s %s", to, format, path)
		}
		return nil
	}
	out, err := p.Push("fixture.epub", "fixture@example.com", map[string]any{"platform": map[string]any{"book": map[string]any{"fmt_epub": "fixture.epub"}}})
	if err != nil || !called || out == nil {
		t.Fatalf("mail=%+v %v", out, err)
	}
	if _, err := p.Push(nil, "fixture@example.com", nil); err == nil {
		t.Fatal("missing book reported as sent")
	}
	if _, err := p.Push(nil, "", nil); err == nil {
		t.Fatal("empty email accepted")
	}
}
