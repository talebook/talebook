package httpapi

import (
	"database/sql"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"talebook/booksvr/internal/userdb"

	_ "modernc.org/sqlite"
)

// opdsTestDB 建一个含 opds_sources 表的内存库。
func opdsTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if _, err := db.Exec(`CREATE TABLE opds_sources (
		id INTEGER PRIMARY KEY AUTOINCREMENT, name VARCHAR(200) NOT NULL, url VARCHAR(1000) NOT NULL,
		description VARCHAR(500), active BOOLEAN, create_time DATETIME, update_time DATETIME,
		data VARCHAR(255))`); err != nil {
		t.Fatalf("建表失败: %v", err)
	}
	return db
}

// opdsCall 调用 handler 并返回响应。
func opdsCall(t *testing.T, db *sql.DB, method, body string) map[string]any {
	t.Helper()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(method, rAdminOpdsSources, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := AdminOpdsSourcesHandler()(&Context{Request: req, Writer: rec, DB: db})
	if err != nil {
		t.Fatalf("%s 返回 error: %v", method, err)
	}
	return resp
}

// TestOpdsSourcesCreateAndList 覆盖创建与列表。
func TestOpdsSourcesCreateAndList(t *testing.T) {
	db := opdsTestDB(t)

	resp := opdsCall(t, db, http.MethodPost,
		`{"name":" 我的源 ","url":" https://example.com/opds ","description":" 描述 "}`)
	if resp["err"] != "ok" {
		t.Fatalf("创建应成功: %v", resp)
	}
	id, ok := resp["id"].(int64)
	if !ok || id == 0 {
		t.Fatalf("应返回新 id: %v", resp["id"])
	}

	resp = opdsCall(t, db, http.MethodGet, "")
	if resp["err"] != "ok" {
		t.Fatalf("列表应成功: %v", resp)
	}
	if resp["count"] != 1 {
		t.Errorf("count = %v, want 1", resp["count"])
	}
	items, ok := resp["items"].([]opdsSourceItem)
	if !ok || len(items) != 1 {
		t.Fatalf("items = %v", resp["items"])
	}
	got := items[0]
	// 首尾空白应被去除。
	if got.Name != "我的源" || got.URL != "https://example.com/opds" || got.Description != "描述" {
		t.Errorf("字段未去空白: %+v", got)
	}
	if !got.Active {
		t.Error("新建的源应默认 active=true")
	}
	if got.CreateTime == nil || got.UpdateTime == nil {
		t.Errorf("时间字段不应为 null: %+v", got)
	}
}

// TestOpdsSourcesCreateValidation 覆盖创建时的校验分支。
func TestOpdsSourcesCreateValidation(t *testing.T) {
	db := opdsTestDB(t)

	cases := []struct{ name, body, wantErr string }{
		{"非法 JSON", `{bad`, "error"},
		{"空体", ``, "error"},
		{"缺名称", `{"url":"https://a.com"}`, "params.error"},
		{"缺 URL", `{"name":"n"}`, "params.error"},
		{"名称仅空白", `{"name":"   ","url":"https://a.com"}`, "params.error"},
		{"URL 协议非法", `{"name":"n","url":"ftp://a.com"}`, "params.url.invalid"},
		{"URL 无协议", `{"name":"n","url":"a.com"}`, "params.url.invalid"},
	}
	for _, c := range cases {
		resp := opdsCall(t, db, http.MethodPost, c.body)
		if resp["err"] != c.wantErr {
			t.Errorf("%s: err = %v, want %v", c.name, resp["err"], c.wantErr)
		}
	}
}

// TestOpdsSourcesCreateDuplicateName 覆盖名称重复。
func TestOpdsSourcesCreateDuplicateName(t *testing.T) {
	db := opdsTestDB(t)
	if resp := opdsCall(t, db, http.MethodPost, `{"name":"dup","url":"https://a.com"}`); resp["err"] != "ok" {
		t.Fatalf("首次创建应成功: %v", resp)
	}
	resp := opdsCall(t, db, http.MethodPost, `{"name":"dup","url":"https://b.com"}`)
	if resp["err"] != "params.name.exist" {
		t.Errorf("重名应返回 params.name.exist，得到 %v", resp["err"])
	}
}

// TestOpdsSourcesUpdate 覆盖更新各字段。
func TestOpdsSourcesUpdate(t *testing.T) {
	db := opdsTestDB(t)
	create := opdsCall(t, db, http.MethodPost, `{"name":"old","url":"https://a.com","description":"d"}`)
	id := create["id"].(int64)

	// 全字段更新。
	resp := opdsCall(t, db, http.MethodPut,
		`{"id":`+itoa(id)+`,"name":"new","url":"https://b.com","description":"d2","active":false}`)
	if resp["err"] != "ok" {
		t.Fatalf("更新应成功: %v", resp)
	}

	items := opdsCall(t, db, http.MethodGet, "")["items"].([]opdsSourceItem)
	got := items[0]
	if got.Name != "new" || got.URL != "https://b.com" || got.Description != "d2" || got.Active {
		t.Errorf("更新结果不符: %+v", got)
	}

	// 部分更新：只改 description，其余保持不变。
	resp = opdsCall(t, db, http.MethodPut, `{"id":`+itoa(id)+`,"description":"only"}`)
	if resp["err"] != "ok" {
		t.Fatalf("部分更新应成功: %v", resp)
	}
	got = opdsCall(t, db, http.MethodGet, "")["items"].([]opdsSourceItem)[0]
	if got.Name != "new" || got.URL != "https://b.com" || got.Description != "only" {
		t.Errorf("部分更新不应影响其他字段: %+v", got)
	}
}

// TestOpdsSourcesUpdateValidation 覆盖更新的校验分支。
func TestOpdsSourcesUpdateValidation(t *testing.T) {
	db := opdsTestDB(t)
	id := opdsCall(t, db, http.MethodPost, `{"name":"a","url":"https://a.com"}`)["id"].(int64)
	opdsCall(t, db, http.MethodPost, `{"name":"b","url":"https://b.com"}`)

	cases := []struct{ name, body, wantErr string }{
		{"非法 JSON", `{bad`, "error"},
		{"缺 id", `{"name":"x"}`, "params.error"},
		{"id 为 0", `{"id":0,"name":"x"}`, "params.error"},
		{"id 不存在", `{"id":99999,"name":"x"}`, "params.not_found"},
		{"名称置空", `{"id":` + itoa(id) + `,"name":"  "}`, "params.error"},
		{"名称冲突", `{"id":` + itoa(id) + `,"name":"b"}`, "params.name.exist"},
		{"URL 置空", `{"id":` + itoa(id) + `,"url":""}`, "params.error"},
		{"URL 协议非法", `{"id":` + itoa(id) + `,"url":"ftp://x"}`, "params.url.invalid"},
	}
	for _, c := range cases {
		resp := opdsCall(t, db, http.MethodPut, c.body)
		if resp["err"] != c.wantErr {
			t.Errorf("%s: err = %v, want %v", c.name, resp["err"], c.wantErr)
		}
	}
}

// TestOpdsSourcesUpdateSameNameAllowed 校验改成自己原名不算冲突。
func TestOpdsSourcesUpdateSameNameAllowed(t *testing.T) {
	db := opdsTestDB(t)
	id := opdsCall(t, db, http.MethodPost, `{"name":"same","url":"https://a.com"}`)["id"].(int64)

	resp := opdsCall(t, db, http.MethodPut, `{"id":`+itoa(id)+`,"name":"same"}`)
	if resp["err"] != "ok" {
		t.Errorf("改成自己原名应允许，得到 %v", resp["err"])
	}
}

// TestOpdsSourcesDelete 覆盖删除。
func TestOpdsSourcesDelete(t *testing.T) {
	db := opdsTestDB(t)
	id := opdsCall(t, db, http.MethodPost, `{"name":"del","url":"https://a.com"}`)["id"].(int64)

	resp := opdsCall(t, db, http.MethodDelete, `{"id":`+itoa(id)+`}`)
	if resp["err"] != "ok" {
		t.Fatalf("删除应成功: %v", resp)
	}
	if opdsCall(t, db, http.MethodGet, "")["count"] != 0 {
		t.Error("删除后列表应为空")
	}

	// 再删同一 id → not_found。
	if resp := opdsCall(t, db, http.MethodDelete, `{"id":`+itoa(id)+`}`); resp["err"] != "params.not_found" {
		t.Errorf("重复删除应返回 params.not_found，得到 %v", resp["err"])
	}
}

// TestOpdsSourcesDeleteValidation 覆盖删除的校验分支。
func TestOpdsSourcesDeleteValidation(t *testing.T) {
	db := opdsTestDB(t)
	cases := []struct{ name, body, wantErr string }{
		{"非法 JSON", `{bad`, "error"},
		{"缺 id", `{}`, "params.error"},
		{"id 为 0", `{"id":0}`, "params.error"},
		{"id 不存在", `{"id":99999}`, "params.not_found"},
	}
	for _, c := range cases {
		resp := opdsCall(t, db, http.MethodDelete, c.body)
		if resp["err"] != c.wantErr {
			t.Errorf("%s: err = %v, want %v", c.name, resp["err"], c.wantErr)
		}
	}
}

// TestOpdsSourcesListOrder 校验按创建时间倒序。
func TestOpdsSourcesListOrder(t *testing.T) {
	db := opdsTestDB(t)
	// 手工插入不同 create_time，避免同秒并列。
	for _, row := range []struct{ name, ct string }{
		{"first", "2026-01-01 00:00:00"},
		{"second", "2026-02-01 00:00:00"},
		{"third", "2026-03-01 00:00:00"},
	} {
		if _, err := db.Exec(`INSERT INTO opds_sources (name, url, active, create_time, update_time, data)
			VALUES (?, 'https://a.com', 1, ?, ?, '{}')`, row.name, row.ct, row.ct); err != nil {
			t.Fatalf("插入失败: %v", err)
		}
	}

	items := opdsCall(t, db, http.MethodGet, "")["items"].([]opdsSourceItem)
	if len(items) != 3 {
		t.Fatalf("应有 3 条，得到 %d", len(items))
	}
	if items[0].Name != "third" || items[2].Name != "first" {
		t.Errorf("应按创建时间倒序，得到 %s..%s", items[0].Name, items[2].Name)
	}
}

// TestOpdsSourcesDBError 覆盖数据库错误分支。
func TestOpdsSourcesDBError(t *testing.T) {
	db := opdsTestDB(t)
	db.Close()

	for _, m := range []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete} {
		body := `{"name":"n","url":"https://a.com","id":1}`
		resp := opdsCall(t, db, m, body)
		if resp["err"] != "error" {
			t.Errorf("%s 在库不可用时应返回 error，得到 %v", m, resp["err"])
		}
	}
}

// TestOpdsSourcesUnsupportedMethod 覆盖不支持的方法。
func TestOpdsSourcesUnsupportedMethod(t *testing.T) {
	db := opdsTestDB(t)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPatch, rAdminOpdsSources, strings.NewReader("{}"))
	resp, err := AdminOpdsSourcesHandler()(&Context{Request: req, Writer: rec, DB: db})
	if err != nil {
		t.Fatalf("不应返回 error: %v", err)
	}
	if resp["err"] != ErrMethodInvalid {
		t.Errorf("err = %v, want %s", resp["err"], ErrMethodInvalid)
	}
}

// TestOpdsSourcesRouteSpecs 校验路由注册属性。
func TestOpdsSourcesRouteSpecs(t *testing.T) {
	specs := AdminOpdsSourcesRouteSpecs()
	if len(specs) != 1 {
		t.Fatalf("应有 1 条路由，得到 %d", len(specs))
	}
	s := specs[0]
	if s.Pattern != rAdminOpdsSources {
		t.Errorf("pattern = %q", s.Pattern)
	}
	if !s.Admin {
		t.Error("应要求管理员")
	}
	want := map[string]bool{"GET": true, "POST": true, "PUT": true, "DELETE": true}
	if len(s.Methods) != 4 {
		t.Fatalf("应有 4 个方法，得到 %v", s.Methods)
	}
	for _, m := range s.Methods {
		if !want[m] {
			t.Errorf("意外方法 %s", m)
		}
	}
}

// TestOpdsSourcesThroughServer 端到端校验管理员门禁与 CRUD。
func TestOpdsSourcesThroughServer(t *testing.T) {
	db := opdsTestDB(t)
	srv, err := NewServer(AdminOpdsSourcesRouteSpecs())
	if err != nil {
		t.Fatalf("NewServer 失败: %v", err)
	}
	srv.DB = db

	// 游客 → permission.not_admin。
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, rAdminOpdsSources, nil))
	if !strings.Contains(rec.Body.String(), ErrNotAdmin) {
		t.Errorf("游客应返回 %s，得到 %s", ErrNotAdmin, rec.Body.String())
	}

	// 管理员 → 完整 CRUD。
	srv.Identify = func(*http.Request) (Identity, error) {
		return Identity{UserID: 1, IsAdmin: true}, nil
	}
	rec = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, rAdminOpdsSources,
		strings.NewReader(`{"name":"s","url":"https://a.com"}`))
	req.Header.Set("Content-Type", "application/json")
	srv.ServeHTTP(rec, req)
	if !strings.Contains(rec.Body.String(), `"err":"ok"`) {
		t.Fatalf("管理员创建应成功，得到 %s", rec.Body.String())
	}

	rec = httptest.NewRecorder()
	srv.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, rAdminOpdsSources, nil))
	if !strings.Contains(rec.Body.String(), `"count":1`) {
		t.Errorf("列表应含 1 条，得到 %s", rec.Body.String())
	}
}

// TestJSONHelpers 覆盖 jsonString / jsonInt / nullIfEmpty。
func TestJSONHelpers(t *testing.T) {
	obj := map[string]any{"s": "  v  ", "n": float64(3), "i": int64(4), "int": 5, "b": true}

	if got := jsonString(obj, "s"); got != "v" {
		t.Errorf("jsonString 应去空白，得到 %q", got)
	}
	if got := jsonString(obj, "n"); got != "" {
		t.Errorf("非字符串应返回空串，得到 %q", got)
	}
	if got := jsonString(obj, "missing"); got != "" {
		t.Errorf("缺失键应返回空串，得到 %q", got)
	}

	if v, ok := jsonInt(obj, "n"); !ok || v != 3 {
		t.Errorf("float64 = (%d,%v)", v, ok)
	}
	if v, ok := jsonInt(obj, "i"); !ok || v != 4 {
		t.Errorf("int64 = (%d,%v)", v, ok)
	}
	if v, ok := jsonInt(obj, "int"); !ok || v != 5 {
		t.Errorf("int = (%d,%v)", v, ok)
	}
	if _, ok := jsonInt(obj, "s"); ok {
		t.Error("字符串不应被当作整数")
	}
	if _, ok := jsonInt(obj, "missing"); ok {
		t.Error("缺失键应返回 false")
	}
	if _, ok := jsonInt(map[string]any{"k": nil}, "k"); ok {
		t.Error("nil 应返回 false")
	}

	if got := nullIfEmpty(""); got != nil {
		t.Errorf("空串应转 nil，得到 %v", got)
	}
	if got := nullIfEmpty("x"); got != "x" {
		t.Errorf("非空串应原样返回，得到 %v", got)
	}
}

// TestOpdsSourceWriteOps 覆盖 userdb 的写操作。
func TestOpdsSourceWriteOps(t *testing.T) {
	db := opdsTestDB(t)

	id, err := userdb.CreateOpdsSource(db, "n", "https://a.com", "d")
	if err != nil {
		t.Fatalf("CreateOpdsSource 失败: %v", err)
	}

	got, err := userdb.GetOpdsSourceByID(db, id)
	if err != nil || got == nil {
		t.Fatalf("GetOpdsSourceByID = (%v,%v)", got, err)
	}
	if got.Name != "n" || !got.Active {
		t.Errorf("新建记录不符: %+v", got)
	}

	byName, err := userdb.GetOpdsSourceByName(db, "n")
	if err != nil || byName == nil || byName.ID != id {
		t.Fatalf("GetOpdsSourceByName = (%v,%v)", byName, err)
	}
	if missing, err := userdb.GetOpdsSourceByName(db, "nope"); err != nil || missing != nil {
		t.Errorf("不存在的名称应返回 (nil,nil)，得到 (%v,%v)", missing, err)
	}
	if missing, err := userdb.GetOpdsSourceByID(db, 99999); err != nil || missing != nil {
		t.Errorf("不存在的 id 应返回 (nil,nil)，得到 (%v,%v)", missing, err)
	}

	// 部分更新。
	name := "n2"
	active := false
	if err := userdb.UpdateOpdsSource(db, id, &name, nil, nil, &active); err != nil {
		t.Fatalf("UpdateOpdsSource 失败: %v", err)
	}
	got, _ = userdb.GetOpdsSourceByID(db, id)
	if got.Name != "n2" || got.Active || got.URL != "https://a.com" {
		t.Errorf("部分更新结果不符: %+v", got)
	}

	// 全字段更新。
	url := "https://b.com"
	desc := "d2"
	active = true
	if err := userdb.UpdateOpdsSource(db, id, &name, &url, &desc, &active); err != nil {
		t.Fatalf("UpdateOpdsSource 失败: %v", err)
	}
	got, _ = userdb.GetOpdsSourceByID(db, id)
	if got.URL != "https://b.com" || got.Description != "d2" || !got.Active {
		t.Errorf("全字段更新结果不符: %+v", got)
	}

	// 列表。
	list, err := userdb.ListOpdsSourcesByCreateTimeDesc(db)
	if err != nil || len(list) != 1 {
		t.Fatalf("ListOpdsSourcesByCreateTimeDesc = (%v,%v)", list, err)
	}

	// 删除。
	if err := userdb.DeleteOpdsSource(db, id); err != nil {
		t.Fatalf("DeleteOpdsSource 失败: %v", err)
	}
	if got, _ := userdb.GetOpdsSourceByID(db, id); got != nil {
		t.Error("删除后应查不到")
	}
}

// TestOpdsSourceWriteOpsErrors 覆盖 userdb 写操作的错误分支。
func TestOpdsSourceWriteOpsErrors(t *testing.T) {
	db := opdsTestDB(t)
	db.Close()

	if _, err := userdb.CreateOpdsSource(db, "n", "u", "d"); err == nil {
		t.Error("CreateOpdsSource 在库不可用时应报错")
	}
	if _, err := userdb.GetOpdsSourceByID(db, 1); err == nil {
		t.Error("GetOpdsSourceByID 在库不可用时应报错")
	}
	if _, err := userdb.GetOpdsSourceByName(db, "n"); err == nil {
		t.Error("GetOpdsSourceByName 在库不可用时应报错")
	}
	if _, err := userdb.ListOpdsSourcesByCreateTimeDesc(db); err == nil {
		t.Error("ListOpdsSourcesByCreateTimeDesc 在库不可用时应报错")
	}
	name := "x"
	if err := userdb.UpdateOpdsSource(db, 1, &name, nil, nil, nil); err == nil {
		t.Error("UpdateOpdsSource 在库不可用时应报错")
	}
	if err := userdb.DeleteOpdsSource(db, 1); err == nil {
		t.Error("DeleteOpdsSource 在库不可用时应报错")
	}
}
