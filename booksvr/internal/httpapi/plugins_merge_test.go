package httpapi

import (
	"archive/zip"
	"bytes"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/pluginbuiltin"
	"talebook/booksvr/internal/pluginruntime"
	"talebook/booksvr/internal/userdb"
)

// Exercise real providers against separate catalog and account databases, as on NAS.
func TestBuiltinToolsSeparateDatabases(t *testing.T) {
	var epub bytes.Buffer
	zw := zip.NewWriter(&epub)
	for name, body := range map[string]string{
		"mimetype":               "application/epub+zip",
		"META-INF/container.xml": `<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>`,
		"OEBPS/content.opf":      `<package><metadata/><manifest><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="chapter"/></spine></package>`,
		"OEBPS/chapter.xhtml":    `<html><head><title>Test</title></head><body><p>繁體小說 hello</p></body></html>`,
	} {
		f, err := zw.Create(name)
		if err != nil {
			t.Fatal(err)
		}
		if _, err = f.Write([]byte(body)); err != nil {
			t.Fatal(err)
		}
	}
	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}
	cases := []struct {
		name, format, body, route, args, want string
		handler                               func(BookToolsConfig) HandlerFunc
	}{
		{"replace", "TXT", "hello 原文", TextReplaceRoute, `,"pattern":"hello","replacement":"changed","output_mode":"new"`, "changed", UserTextReplaceRunHandler},
		{"encoding", "TXT", "普通中文小說", TXTFixerRoute, `,"output_mode":"new"`, "普通中文小說", UserTxtFixerRunHandler},
		{"convert", "TXT", "繁體小說", ZhConverterRoute, `,"direction":"t2s","output_mode":"new"`, "繁体小说", UserZhConverterRunHandler},
		{"beautify", "EPUB", epub.String(), EpubBeautifyRoute, `,"preset":"classic"`, "", UserEpubBeautifyRunHandler},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			fx := newToolFixture(t, tc.route, nil)
			fx.seedBook(t, "原始书籍", tc.format, tc.body)
			account := netSchemaDB(t)
			if _, err := account.Exec(`INSERT INTO readers (id,username,password,admin,active,permission,create_time) VALUES (1,'admin','x',1,1,'','2026-01-01')`); err != nil {
				t.Fatal(err)
			}
			reg := pluginruntime.NewPluginRegistry()
			if err := pluginbuiltin.Register(reg); err != nil {
				t.Fatal(err)
			}
			cfg := BookToolsConfig{Settings: fx.Cfg.Settings, Registry: reg, LibraryRoot: t.TempDir(), CanViewBook: func(ctx *Context, id int64) (bool, error) {
				return userdb.CanViewBook(ctx.DB, id, ctx.Identity.UserID, ctx.Identity.IsAdmin)
			}}
			if _, err := pluginruntime.EnsureBuiltinInstallations(account, 1, cfg.Settings, reg); err != nil {
				t.Fatal(err)
			}
			if _, err := account.Exec(`UPDATE plugin_installations SET enabled=1,status='active'`); err != nil {
				t.Fatal(err)
			}
			if _, err := account.Exec(`UPDATE plugin_connections SET enabled=1`); err != nil {
				t.Fatal(err)
			}
			scratch := t.TempDir()
			cfg.WorkDir = func() (string, error) { return os.MkdirTemp(scratch, "run-") }
			ctx := pluginCtx(t, account, http.MethodPost, "/", fmt.Sprintf(`{"book_id":%d%s}`, fx.BookID, tc.args), 1, true)
			ctx.LibraryDB = fx.DB
			got, err := tc.handler(cfg)(ctx)
			if err != nil || got["err"] != "ok" {
				t.Fatalf("run: %v %v", got, err)
			}
			id := pluginInt(got["book_id"], 0)
			if id == 0 || id == fx.BookID {
				t.Fatalf("new ID: %v", got)
			}
			path, missing, err := library.ResolvePath(fx.DB, id, tc.format)
			if err != nil || missing {
				t.Fatalf("resolve: %s %v %v", path, missing, err)
			}
			data, err := os.ReadFile(path)
			if err != nil {
				t.Fatalf("output removed after scratch cleanup: %v", err)
			}
			if tc.want != "" && !strings.Contains(string(data), tc.want) {
				t.Fatalf("output = %q", data)
			}
			if tc.format == "EPUB" {
				zr, err := zip.OpenReader(path)
				if err != nil {
					t.Fatal(err)
				}
				defer zr.Close()
				found := false
				for _, f := range zr.File {
					if strings.HasSuffix(f.Name, ".css") {
						found = true
					}
				}
				if !found {
					t.Fatal("beautify CSS absent")
				}
			}
			if src, err := os.ReadFile(fx.BookPath); err != nil || string(src) != tc.body {
				t.Fatal("original modified")
			}
			entries, err := os.ReadDir(scratch)
			if err != nil || len(entries) != 0 {
				t.Fatal("scratch leaked", err)
			}
			if rel, err := filepath.Rel(cfg.LibraryRoot, path); err != nil || strings.HasPrefix(rel, "..") {
				t.Fatal("output outside library")
			}
			visible, err := userdb.CanViewBook(account, id, 2, false)
			if err != nil || visible {
				t.Fatal("derived book should be private", err)
			}
			ctx.Request = pluginCtx(t, account, http.MethodGet, "/api/plugins/tools/books?book_id="+jsonNumber(fx.BookID), "", 1, true).Request
			books, err := UserBookToolsBooksHandler(cfg)(ctx)
			if err != nil || books["err"] != "ok" {
				t.Fatal("picker uses wrong database", books, err)
			}
		})
	}
}

func TestBuiltinBeautifyPresetsWired(t *testing.T) {
	reg := pluginruntime.NewPluginRegistry()
	if err := pluginbuiltin.Register(reg); err != nil {
		t.Fatal(err)
	}
	out, err := UserEpubBeautifyPresetsHandler(BookToolsConfig{Registry: reg})(nil)
	if err != nil || out["err"] != "ok" {
		t.Fatal(out, err)
	}
	if len(out["presets"].([]any)) < 12 {
		t.Fatal("preset options not wired", out)
	}
}

// Metadata outside the returned page must not be loaded, even if malformed.
func TestBuiltinToolPickerHydratesOnlyVisiblePage(t *testing.T) {
	fx := newToolFixture(t, TextReplaceRoute, nil)
	tx, err := fx.DB.Begin()
	if err != nil {
		t.Fatal(err)
	}
	for i := 1; i <= 122; i++ {
		series := any(1.0)
		if i == 1 {
			series = "invalid-unselected-metadata"
		}
		if _, err := tx.Exec(`INSERT INTO books(id,title,author_sort,path,timestamp,pubdate,series_index,has_cover) VALUES(?,?,'a','p',?,'2020-01-01',?,0)`, i, fmt.Sprintf("Book %d", i), i, series); err != nil {
			t.Fatal(err)
		}
		if _, err := tx.Exec(`INSERT INTO data(book,format,uncompressed_size,name) VALUES(?,'TXT',1,'sample.txt')`, i); err != nil {
			t.Fatal(err)
		}
	}
	if err := tx.Commit(); err != nil {
		t.Fatal(err)
	}
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/plugins/tools/books", "", 1, true)
	got, err := UserBookToolsBooksHandler(fx.Cfg)(ctx)
	if err != nil || got["err"] != "ok" {
		t.Fatal(got, err)
	}
	if len(got["books"].([]map[string]any)) != 100 || got["total"] != 122 {
		t.Fatalf("picker page = %v", got)
	}
}

func TestBuiltinToolPickerMixedTimestampOrder(t *testing.T) {
	fx := newToolFixture(t, TextReplaceRoute, nil)
	fx.seedBook(t, "ISO older", "TXT", "body")
	old := fx.BookID
	fx.seedBook(t, "Unix newer", "TXT", "body")
	latest := fx.BookID
	if _, err := fx.DB.Exec(`UPDATE books SET timestamp='2026-10-01T00:00:00Z' WHERE id=?`, old); err != nil {
		t.Fatal(err)
	}
	if _, err := fx.DB.Exec(`UPDATE books SET timestamp=2000000000 WHERE id=?`, latest); err != nil {
		t.Fatal(err)
	}
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/plugins/tools/books", "", 1, true)
	got, err := UserBookToolsBooksHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatal(err)
	}
	books := got["books"].([]map[string]any)
	if len(books) != 2 || pluginInt(books[0]["id"], 0) != latest {
		t.Fatalf("normalized ordering lost: %v", books)
	}
}

func TestBuiltinToolPickerUnicodeAuthorAndBulkVisibility(t *testing.T) {
	fx := newToolFixture(t, TextReplaceRoute, nil)
	fx.seedBook(t, "First title", "TXT", "body")
	hidden := fx.BookID
	fx.seedBook(t, "Second title", "TXT", "body")
	visible := fx.BookID
	if _, err := fx.DB.Exec(`INSERT INTO authors(id,name) VALUES(1,'Михаил Булгаков')`); err != nil {
		t.Fatal(err)
	}
	if _, err := fx.DB.Exec(`INSERT INTO books_authors_link(book,author) VALUES(?,1),(?,1)`, hidden, visible); err != nil {
		t.Fatal(err)
	}
	fx.Cfg.CanViewBook = func(*Context, int64) (bool, error) { t.Fatal("picker should use bulk policy"); return false, nil }
	fx.Cfg.FilterVisibleBookIDs = func(_ *Context, ids []int64) ([]int64, error) {
		out := []int64{}
		for _, id := range ids {
			if id != hidden {
				out = append(out, id)
			}
		}
		return out, nil
	}
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/plugins/tools/books?query="+url.QueryEscape("БУЛГАКОВ"), "", 1, false)
	got, err := UserBookToolsBooksHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatal(err)
	}
	books := got["books"].([]map[string]any)
	if len(books) != 1 || pluginInt(books[0]["id"], 0) != visible || got["total"] != 1 {
		t.Fatalf("author query or visibility lost: %v", got)
	}
}
