package httpapi

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"talebook/booksvr/internal/booksource"
	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/pluginbuiltin"
	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginruntime"
	"talebook/booksvr/internal/sourcecatalog"
	"testing"
)

func TestOpdsPaginationDoesNotHydrateOtherPages(t *testing.T) {
	fx := newOpdsFixture(t)
	for i := 1; i <= 65; i++ {
		opdsSeedBook(t, fx.DB, int64(i), fmt.Sprintf("Book %03d", i), int64(i))
	}
	// Corrupt full metadata outside the requested page; lightweight sorting remains possible.
	if _, err := fx.DB.Exec(`INSERT INTO ratings(id,rating) VALUES(1,'not-an-integer'); INSERT INTO books_ratings_link(book,rating) VALUES(65,1)`); err != nil {
		t.Fatal(err)
	}
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/opds", "", 0, false)
	ids, err := opdsAllBookIDs(fx.Cfg)
	if err != nil {
		t.Fatal(err)
	}
	raw, err := opdsAcquisitionFeed(fx.Cfg, ctx, ids, 0, "/opds/nav/test", "/opds/", "test", "title", true, "")
	if err != nil {
		t.Fatal(err)
	}
	if n := bytes.Count(raw, []byte("<entry>")); n != 30 {
		t.Fatalf("entry count=%d", n)
	}
	if bytes.Contains(raw, []byte("Book 065")) || !bytes.Contains(raw, []byte("offset=30")) {
		t.Fatal("wrong page or missing next link")
	}
}

func TestOpdsBulkVisibilityAndNavigationTypes(t *testing.T) {
	fx := newOpdsFixture(t)
	opdsSeedBook(t, fx.DB, 1, "public", 1)
	opdsSeedBook(t, fx.DB, 2, "private", 2)
	calls := 0
	fx.Cfg.FilterVisibleBookIDs = func(_ *Context, ids []int64) ([]int64, error) { calls++; return []int64{1}, nil }
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/opds/nav/"+opdsHexlify("Otitle"), "", 0, false)
	raw, err := opdsAllBooks(fx.Cfg, ctx, "title", "/opds/nav/test", "/opds/", 0)
	if err != nil || calls != 1 || bytes.Contains(raw, []byte("private")) {
		t.Fatalf("calls=%d err=%v body=%s", calls, err, raw)
	}
	nav, err := opdsTopLevelFeed(fx.Cfg, ctx)
	if err != nil {
		t.Fatal(err)
	}
	if ctx.Writer.Header().Get("Content-Type") != opdsHTTPContentType || !bytes.Contains(nav, []byte("kind=navigation")) || !bytes.Contains(nav, []byte(`rel="subsection"`)) || !bytes.Contains(nav, []byte("kind=acquisition")) {
		t.Fatalf("invalid OPDS discovery metadata: %s", nav)
	}
}

func TestSaveDownloadedBinaryAndLocalReference(t *testing.T) {
	for _, local := range []bool{false, true} {
		t.Run(fmt.Sprint(local), func(t *testing.T) {
			svc, _ := newSaveOnlineFixture(t)
			// Deliberately use separate account and catalog databases.
			cat := netSchemaDB(t)
			createCalibreTables(t, cat)
			createFormatTables(t, cat)
			svc.library = cat
			original := []byte{0x50, 0x4b, 0, 0xff, 0x80, 1}
			file := plugindomain.BookFile{Filename: "西游记.epub", Format: "epub", Content: original}
			var source string
			if local {
				source = filepath.Join(t.TempDir(), "西游记.epub")
				if err := os.WriteFile(source, original, 0600); err != nil {
					t.Fatal(err)
				}
				file.LocalPath = source
				file.Content = nil
			}
			id, err := svc.importDownloaded(&booksource.BookDetail{Name: "西游记", Author: "吴承恩"}, file)
			if err != nil {
				t.Fatal(err)
			}
			if err := svc.recordOwner(adminCtx(1), id); err != nil {
				t.Fatal(err)
			}
			path, missing, err := library.ResolvePath(cat, id, "EPUB")
			if err != nil || missing {
				t.Fatalf("%s %v %v", path, missing, err)
			}
			data, err := os.ReadFile(path)
			if err != nil || !bytes.Equal(data, original) {
				t.Fatalf("binary changed %v", err)
			}
			if local && path != source {
				t.Fatal("local source copied")
			}
			if !local && strings.HasSuffix(path, ".epub.epub") {
				t.Fatal("duplicate extension")
			}
			var size int64
			if err := cat.QueryRow(`SELECT uncompressed_size FROM data WHERE book=?`, id).Scan(&size); err != nil || size != int64(len(original)) {
				t.Fatalf("size=%d %v", size, err)
			}
			var scope string
			if err := svc.db.QueryRow(`SELECT scope FROM items WHERE book_id=?`, id).Scan(&scope); err != nil || scope != "private" {
				t.Fatalf("scope=%s %v", scope, err)
			}
		})
	}
}

func TestWatchFolderRealRuntimeSaveIndexesWithoutCopy(t *testing.T) {
	svc, userDB := newSaveOnlineFixture(t)
	cat := netSchemaDB(t)
	createCalibreTables(t, cat)
	createFormatTables(t, cat)
	svc.library = cat
	sourceDir := t.TempDir()
	source := filepath.Join(sourceDir, "西游记.txt")
	body := []byte("第一回 灵根育孕源流出")
	if err := os.WriteFile(source, body, 0600); err != nil {
		t.Fatal(err)
	}
	reg := pluginruntime.NewPluginRegistry()
	if err := pluginbuiltin.Register(reg); err != nil {
		t.Fatal(err)
	}
	svc.registry = reg
	rt := pluginruntime.NewRuntime(userDB, svc.settings, reg)
	if _, err := pluginruntime.EnsureBuiltinInstallations(userDB, 1, svc.settings, reg); err != nil {
		t.Fatal(err)
	}
	config, _ := json.Marshal(map[string]any{"path": sourceDir})
	if _, err := userDB.Exec(`UPDATE plugin_installations SET enabled=1 WHERE plugin_key='talebook.source.watch-folder'`); err != nil {
		t.Fatal(err)
	}
	if _, err := userDB.Exec(`UPDATE plugin_connections SET enabled=1,config=? WHERE installation_id=(SELECT id FROM plugin_installations WHERE plugin_key='talebook.source.watch-folder')`, string(config)); err != nil {
		t.Fatal(err)
	}
	catalog, err := sourcecatalog.NewService(userDB, svc.settings, 1, rt)
	if err != nil {
		t.Fatal(err)
	}
	bindings, err := catalog.Bindings()
	if err != nil {
		t.Fatal(err)
	}
	var binding *sourcecatalog.SourceBinding
	for _, b := range bindings {
		if b.PluginKey == "talebook.source.watch-folder" {
			binding = b
		}
	}
	if binding == nil {
		t.Fatal("watch-folder binding missing")
	}
	raw, err := catalog.Read(binding, "browse", []any{"", map[string]any{}}, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	page, ok := raw.(*plugindomain.Page)
	if !ok || len(page.Items) != 1 {
		t.Fatalf("page=%+v (%T)", raw, raw)
	}
	book := page.Items[0].(plugindomain.SourceBook)
	if err := svc.Save(adminCtx(1), binding.Key, book.ExternalID, "txt", false, 0); err != nil {
		t.Fatal(err)
	}
	var id int64
	if err := cat.QueryRow(`SELECT id FROM books WHERE title='西游记'`).Scan(&id); err != nil {
		t.Fatal(err)
	}
	path, missing, err := library.ResolvePath(cat, id, "TXT")
	if err != nil || missing || path != source {
		t.Fatalf("path=%s missing=%v err=%v", path, missing, err)
	}
	data, _ := os.ReadFile(source)
	if !bytes.Equal(data, body) {
		t.Fatal("source changed")
	}
	files, err := os.ReadDir(svc.uploadDir())
	if err != nil || len(files) != 0 {
		t.Fatalf("unexpected body copies: %v %v", files, err)
	}
	var count int
	if err := userDB.QueryRow(`SELECT COUNT(*) FROM items WHERE book_id=? AND scope='private'`, id).Scan(&count); err != nil || count != 1 {
		t.Fatalf("owner record=%d %v", count, err)
	}
}
