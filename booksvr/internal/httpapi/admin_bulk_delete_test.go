package httpapi

import (
	"net/http"
	"testing"

	"talebook/booksvr/internal/library"
)

func TestBulkDeleteUsesProductionSingleBookWiring(t *testing.T) {
	_, db := newWriteFixture(t)
	cfg := newAdminConfig(ServeOptions{LibraryRoot: t.TempDir(), Settings: map[string]any{}}, db, db)
	for _, id := range []int64{1, 2} {
		insertBook(t, db, id, "测试删除")
		insertItem(t, db, id, "public", 1)
		if _, err := db.Exec(`INSERT INTO scanfiles (book_id,path,hash) VALUES (?,?,?)`, id, string(rune('a'+id)), string(rune('a'+id))); err != nil {
			t.Fatal(err)
		}
	}
	ctx := pluginCtx(t, db, http.MethodPost, rAdminBookDelete, `{"idlist":[1,2,2,999]}`, 1, true)
	response, err := AdminBookDeleteHandler(cfg)(ctx)
	if err != nil || response["err"] != "delete.partial" {
		t.Fatalf("%v %v", response, err)
	}
	deleted := response["deleted"].([]int64)
	failed := response["failed"].([]map[string]any)
	if len(deleted) != 2 || len(failed) != 1 || failed[0]["id"] != int64(999) {
		t.Fatalf("results: %v", response)
	}
	for _, id := range []int64{1, 2} {
		exists, err := library.HasID(db, id)
		if err != nil || exists {
			t.Fatalf("book %d not deleted: %v", id, err)
		}
	}
	var n int
	if err := db.QueryRow(`SELECT COUNT(*) FROM scanfiles WHERE book_id IN (1,2)`).Scan(&n); err != nil || n != 2 {
		t.Fatalf("recoverable deletions must retain scan records: %d %v", n, err)
	}
	entries, err := library.ListTrashEntries(db, cfg.LibraryRoot)
	if err != nil || len(entries) != 2 {
		t.Fatalf("bulk deletes missing from trash: %v %v", entries, err)
	}
	restored, err := adminTrashRestore(cfg, pluginCtx(t, db, http.MethodPatch, rAdminTrash, `{"idlist":[1,2]}`, 1, true))
	if err != nil || len(restored["restored"].([]int64)) != 2 {
		t.Fatalf("bulk restore: %v %v", restored, err)
	}
}

func TestBulkDeleteDoesNotReportUnwiredOperationsAsSuccess(t *testing.T) {
	fx := newAdminFixture(t)
	insertBook(t, fx.DB, 1, "保留的书")
	ctx := pluginCtx(t, fx.DB, http.MethodPost, rAdminBookDelete, `{"idlist":[1]}`, 1, true)
	response, err := AdminBookDeleteHandler(fx.Cfg)(ctx)
	if err != nil || response["err"] != "delete.partial" || len(response["deleted"].([]int64)) != 0 {
		t.Fatalf("false success: %v %v", response, err)
	}
	if exists, err := library.HasID(fx.DB, 1); err != nil || !exists {
		t.Fatal("unwired delete changed book")
	}
}

func TestBulkDeleteRejectsInvalidIDsBeforeDeleting(t *testing.T) {
	fx := newAdminFixture(t)
	for _, body := range []string{`{"idlist":[0]}`, `{"idlist":[-1]}`, `{"idlist":[1.5]}`, `{"idlist":["1"]}`} {
		called := false
		fx.Cfg.DeleteBook = func(int64, bool) error { called = true; return nil }
		response, err := AdminBookDeleteHandler(fx.Cfg)(pluginCtx(t, fx.DB, http.MethodPost, rAdminBookDelete, body, 1, true))
		if err != nil || response["err"] != "params.error" || called {
			t.Fatalf("%s: %v %v", body, response, err)
		}
	}
}
