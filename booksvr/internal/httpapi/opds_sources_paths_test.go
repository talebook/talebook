package httpapi

import (
	"database/sql"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	_ "modernc.org/sqlite"
)

// opdsReadOnlyDB 建一个可读但不可写的 opds_sources 库。
//
// 用 CHECK 约束让 INSERT/UPDATE/DELETE 全部失败，而 SELECT 正常。
func opdsReadOnlyDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if _, err := db.Exec(`CREATE TABLE opds_sources (
		id INTEGER PRIMARY KEY AUTOINCREMENT, name VARCHAR(200) NOT NULL, url VARCHAR(1000) NOT NULL,
		description VARCHAR(500), active BOOLEAN, create_time DATETIME, update_time DATETIME,
		data VARCHAR(255), CHECK (name <> 'blocked'))`); err != nil {
		t.Fatalf("建表失败: %v", err)
	}
	// 预置一条可读记录。
	if _, err := db.Exec(`INSERT INTO opds_sources (id, name, url, active, create_time, update_time, data)
		VALUES (1, 'ok', 'https://a.com', 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00', '{}')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	return db
}

// TestOpdsSourcesCreateDBError 覆盖创建时插入失败。
func TestOpdsSourcesCreateDBError(t *testing.T) {
	db := opdsReadOnlyDB(t)
	resp := opdsCall(t, db, http.MethodPost, `{"name":"blocked","url":"https://a.com"}`)
	if resp["err"] != "error" {
		t.Errorf("插入失败应返回 error，得到 %v", resp["err"])
	}
}

// TestOpdsSourcesUpdateDBError 覆盖更新时写库失败。
func TestOpdsSourcesUpdateDBError(t *testing.T) {
	db := opdsReadOnlyDB(t)
	// 改名成 blocked 触发 CHECK 失败。
	resp := opdsCall(t, db, http.MethodPut, `{"id":1,"name":"blocked"}`)
	if resp["err"] != "error" {
		t.Errorf("更新失败应返回 error，得到 %v", resp["err"])
	}
}

// TestOpdsSourcesUpdateConflictLookupError 覆盖冲突检查查询失败。
func TestOpdsSourcesUpdateConflictLookupError(t *testing.T) {
	// 构造列数不匹配的表，让 GetOpdsSourceByID 与 GetOpdsSourceByName 都失败。
	bad, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	t.Cleanup(func() { _ = bad.Close() })
	if _, err := bad.Exec(`CREATE TABLE opds_sources (id INTEGER, name TEXT)`); err != nil {
		t.Fatalf("建表失败: %v", err)
	}
	resp := opdsCall(t, bad, http.MethodPut, `{"id":1,"name":"x"}`)
	if resp["err"] != "error" {
		t.Errorf("查询失败应返回 error，得到 %v", resp["err"])
	}
}

// TestOpdsSourcesDeleteDBError 覆盖删除时写库失败。
func TestOpdsSourcesDeleteDBError(t *testing.T) {
	db := opdsReadOnlyDB(t)
	// 用触发器让 DELETE 失败。
	if _, err := db.Exec(`CREATE TRIGGER block_delete BEFORE DELETE ON opds_sources
		BEGIN SELECT RAISE(ABORT, 'blocked'); END`); err != nil {
		t.Fatalf("建触发器失败: %v", err)
	}
	resp := opdsCall(t, db, http.MethodDelete, `{"id":1}`)
	if resp["err"] != "error" {
		t.Errorf("删除失败应返回 error，得到 %v", resp["err"])
	}
}

// TestOpdsSourcesListDBError 覆盖列表查询失败。
func TestOpdsSourcesListDBError(t *testing.T) {
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if _, err := db.Exec(`CREATE TABLE opds_sources (id INTEGER, name TEXT)`); err != nil {
		t.Fatalf("建表失败: %v", err)
	}
	resp := opdsCall(t, db, http.MethodGet, "")
	if resp["err"] != "error" {
		t.Errorf("列数不匹配应返回 error，得到 %v", resp["err"])
	}
}

// TestOpdsSourcesCreateLookupError 覆盖创建时重名检查查询失败。
func TestOpdsSourcesCreateLookupError(t *testing.T) {
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if _, err := db.Exec(`CREATE TABLE opds_sources (id INTEGER, name TEXT)`); err != nil {
		t.Fatalf("建表失败: %v", err)
	}
	resp := opdsCall(t, db, http.MethodPost, `{"name":"n","url":"https://a.com"}`)
	if resp["err"] != "error" {
		t.Errorf("查询失败应返回 error，得到 %v", resp["err"])
	}
}

// TestOpdsSourcesUpdateActiveNonBool 覆盖 active 非布尔值时被忽略。
func TestOpdsSourcesUpdateActiveNonBool(t *testing.T) {
	db := opdsTestDB(t)
	id := opdsCall(t, db, http.MethodPost, `{"name":"a","url":"https://a.com"}`)["id"].(int64)

	// active 传字符串 → 应被忽略，不报错。
	resp := opdsCall(t, db, http.MethodPut, `{"id":`+itoa(id)+`,"active":"yes"}`)
	if resp["err"] != "ok" {
		t.Fatalf("active 非布尔应被忽略: %v", resp)
	}
	items := opdsCall(t, db, http.MethodGet, "")["items"].([]opdsSourceItem)
	if !items[0].Active {
		t.Error("active 应保持原值 true")
	}
}

// TestOpdsSourcesUpdateIDNonNumber 覆盖 id 非数字。
func TestOpdsSourcesUpdateIDNonNumber(t *testing.T) {
	db := opdsTestDB(t)
	for _, m := range []string{http.MethodPut, http.MethodDelete} {
		resp := opdsCall(t, db, m, `{"id":"abc"}`)
		if resp["err"] != "params.error" {
			t.Errorf("%s: id 非数字应返回 params.error，得到 %v", m, resp["err"])
		}
	}
}

// TestOpdsSourcesHandlerNilBody 覆盖 Body 为 nil。
func TestOpdsSourcesHandlerNilBody(t *testing.T) {
	db := opdsTestDB(t)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, rAdminOpdsSources, nil)
	req.Body = nil
	resp, err := AdminOpdsSourcesHandler()(&Context{Request: req, Writer: rec, DB: db})
	if err != nil {
		t.Fatalf("不应返回 error: %v", err)
	}
	if resp["err"] != "error" {
		t.Errorf("nil body 应返回 error，得到 %v", resp["err"])
	}
}

// TestOpdsSourcesThroughServerDelete 端到端覆盖 DELETE 方法。
func TestOpdsSourcesThroughServerDelete(t *testing.T) {
	db := opdsTestDB(t)
	srv, err := NewServer(AdminOpdsSourcesRouteSpecs())
	if err != nil {
		t.Fatalf("NewServer 失败: %v", err)
	}
	srv.DB = db
	srv.Identify = func(*http.Request) (Identity, error) {
		return Identity{UserID: 1, IsAdmin: true}, nil
	}

	// 先创建。
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, rAdminOpdsSources,
		strings.NewReader(`{"name":"s","url":"https://a.com"}`))
	req.Header.Set("Content-Type", "application/json")
	srv.ServeHTTP(rec, req)

	// 再删除。
	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodDelete, rAdminOpdsSources, strings.NewReader(`{"id":1}`))
	req.Header.Set("Content-Type", "application/json")
	srv.ServeHTTP(rec, req)
	if !strings.Contains(rec.Body.String(), `"err":"ok"`) {
		t.Errorf("删除应成功，得到 %s", rec.Body.String())
	}
}
