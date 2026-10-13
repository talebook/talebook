package httpapi

import (
	"database/sql"
	"net/http"
	"net/http/httptest"
	"testing"

	_ "modernc.org/sqlite"

	"talebook/booksvr/internal/library"
)

// newLibraryOnlyDB 建一个只含 Calibre 表（books + work 列）的库。
//
// 生产拓扑里 books 表在 Calibre 的 metadata.db，而 Talebook 自有表在
// calibre-webserver.db。作品/版本层读的是前者，因此这里刻意不建 Talebook 表。
func newLibraryOnlyDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open library db: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	db.SetMaxOpenConns(1)

	if _, err := db.Exec(`CREATE TABLE books (
		id          INTEGER PRIMARY KEY,
		title       TEXT NOT NULL DEFAULT '',
		author_sort TEXT NOT NULL DEFAULT '',
		path        TEXT NOT NULL DEFAULT '',
		timestamp   INTEGER NOT NULL DEFAULT 0
	)`); err != nil {
		t.Fatalf("create books: %v", err)
	}
	if err := library.Migrate(db); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db
}

// newUserOnlyDB 建一个不含 books 表的 Talebook 自有库。
func newUserOnlyDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open user db: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	db.SetMaxOpenConns(1)

	if _, err := db.Exec(`CREATE TABLE readers (id INTEGER PRIMARY KEY, username TEXT)`); err != nil {
		t.Fatalf("create readers: %v", err)
	}
	return db
}

// TestBookVersionsUsesLibraryDB 回归：/api/book/<id>/versions 必须查 Calibre 库。
//
// 曾经 workService 用 ctx.DB（Talebook 自有库）去查 books 表，生产环境直接
// 返回 {"err":"exception","msg":"... no such table: books"}。
// 这里刻意把两个库分开，复现真实拓扑。
func TestBookVersionsUsesLibraryDB(t *testing.T) {
	libDB := newLibraryOnlyDB(t)
	userDB := newUserOnlyDB(t)

	workID, bookA, bookB := seedWork(t, libDB)

	srv, err := NewServer(WorkRouteSpecs())
	if err != nil {
		t.Fatalf("NewServer: %v", err)
	}
	srv.DB = userDB
	srv.LibraryDB = libDB
	srv.Identify = func(*http.Request) (Identity, error) { return Identity{}, nil }

	ts := httptest.NewServer(srv)
	t.Cleanup(ts.Close)

	status, body := getJSON(t, ts.URL+"/api/book/"+itoa(bookA)+"/versions")
	if status != http.StatusOK {
		t.Fatalf("status = %d", status)
	}
	if body["err"] != "ok" {
		t.Fatalf("err = %v, msg = %v", body["err"], body["msg"])
	}
	if int64Of(body["work_id"]) != workID {
		t.Errorf("work_id = %v, want %d", body["work_id"], workID)
	}
	versions, _ := body["versions"].([]any)
	if len(versions) != 1 {
		t.Fatalf("versions = %v, want 1 项", versions)
	}
	if int64Of(versions[0].(map[string]any)["id"]) != bookB {
		t.Errorf("versions[0].id = %v, want %d", versions[0], bookB)
	}
}

// TestWorkDetailUsesLibraryDB 回归：/api/work/<id> 同样必须查 Calibre 库。
func TestWorkDetailUsesLibraryDB(t *testing.T) {
	libDB := newLibraryOnlyDB(t)
	userDB := newUserOnlyDB(t)

	workID, _, _ := seedWork(t, libDB)

	srv, err := NewServer(WorkRouteSpecs())
	if err != nil {
		t.Fatalf("NewServer: %v", err)
	}
	srv.DB = userDB
	srv.LibraryDB = libDB
	srv.Identify = func(*http.Request) (Identity, error) { return Identity{}, nil }

	ts := httptest.NewServer(srv)
	t.Cleanup(ts.Close)

	status, body := getJSON(t, ts.URL+"/api/work/"+itoa(workID))
	if status != http.StatusOK {
		t.Fatalf("status = %d", status)
	}
	if body["err"] != "ok" {
		t.Fatalf("err = %v, msg = %v", body["err"], body["msg"])
	}
	work, _ := body["work"].(map[string]any)
	if work == nil || work["title"] != "三体" {
		t.Errorf("work = %v", work)
	}
}
