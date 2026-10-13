package httpapi

import (
	"database/sql"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	_ "modernc.org/sqlite"
)

// annTestDB 建一个含 annotations / annotation_sources / plugin_source_records 的内存库。
func annTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	stmts := []string{
		`CREATE TABLE annotations (
			id INTEGER PRIMARY KEY AUTOINCREMENT, reader_id INTEGER NOT NULL, book_id INTEGER NOT NULL,
			client_id VARCHAR(64), annotation_type VARCHAR(32) NOT NULL, is_private BOOLEAN DEFAULT 1,
			cfi TEXT, chapter VARCHAR(500) DEFAULT '', quote_text TEXT DEFAULT '', content TEXT DEFAULT '',
			color VARCHAR(32) DEFAULT '', author_name VARCHAR(255) DEFAULT '', user_modified_at DATETIME,
			create_time DATETIME NOT NULL, update_time DATETIME NOT NULL)`,
		`CREATE TABLE annotation_sources (
			id INTEGER PRIMARY KEY AUTOINCREMENT, annotation_id INTEGER NOT NULL, source_name VARCHAR(64) NOT NULL,
			source_connection_id VARCHAR(128) DEFAULT '', source_annotation_id VARCHAR(255),
			source_run_id VARCHAR(128), source_position TEXT, source_raw_hash VARCHAR(128),
			source_updated_at DATETIME, source_sync_status VARCHAR(16) DEFAULT 'synced',
			source_synced_at DATETIME, source_sync_error TEXT, create_time DATETIME NOT NULL,
			update_time DATETIME NOT NULL)`,
		`CREATE TABLE plugin_source_records (
			id INTEGER PRIMARY KEY AUTOINCREMENT, connection_id INTEGER, source VARCHAR(200),
			external_id VARCHAR(500), entity_type VARCHAR(64), entity_id VARCHAR(500), run_id INTEGER,
			raw_hash VARCHAR(64), remote_updated_at DATETIME, local_modified BOOLEAN DEFAULT 0,
			status VARCHAR(32) DEFAULT 'active', data TEXT, create_time DATETIME, update_time DATETIME,
			rolled_back_at DATETIME)`,
	}
	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			t.Fatalf("建表失败: %v\n%s", err, s)
		}
	}
	return db
}

// annCtx 构造一个已登录的请求上下文。
//
// 从 target 路径中提取 /api/book/(\d+)/annotations(/(\d+))? 的捕获组填入 Params，
// 模拟 Server 的正则匹配行为。
func annCtx(t *testing.T, db *sql.DB, method, target, body string, userID int64) (*Context, *httptest.ResponseRecorder) {
	t.Helper()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(method, target, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	params := []string{}
	path := req.URL.Path
	if strings.HasPrefix(path, "/api/book/") {
		rest := strings.TrimPrefix(path, "/api/book/")
		parts := strings.SplitN(rest, "/", 2)
		params = append(params, parts[0])
		if len(parts) == 2 && strings.HasPrefix(parts[1], "annotations/") {
			params = append(params, strings.TrimPrefix(parts[1], "annotations/"))
		}
	}

	return &Context{
		Request: req, Writer: rec, DB: db, Params: params,
		Identity: Identity{UserID: userID, Username: "u" + itoa(userID)},
	}, rec
}

// TestAnnotationCreateAndList 覆盖创建与列表。
func TestAnnotationCreateAndList(t *testing.T) {
	db := annTestDB(t)
	ctx, _ := annCtx(t, db, http.MethodPost, "/api/book/1/annotations",
		`{"annotation_type":"highlight","client_id":"c1","chapter":"ch1","quote_text":"q","content":"t","color":"yellow"}`, 7)

	resp, err := BookAnnotationsHandler(nil)(ctx)
	if err != nil {
		t.Fatalf("创建失败: %v", err)
	}
	if resp["err"] != "ok" || resp["created"] != true {
		t.Fatalf("创建应成功: %v", resp)
	}
	item := resp["annotation"].(map[string]any)
	if item["can_edit"] != true {
		t.Error("自己的批注 can_edit 应为 true")
	}
	if item["chapter"] != "ch1" || item["quote_text"] != "q" {
		t.Errorf("字段不符: %v", item)
	}

	// 列表。
	ctx, _ = annCtx(t, db, http.MethodGet, "/api/book/1/annotations", "", 7)
	resp, err = BookAnnotationsHandler(nil)(ctx)
	if err != nil {
		t.Fatalf("列表失败: %v", err)
	}
	anns := resp["annotations"].([]map[string]any)
	if len(anns) != 1 {
		t.Fatalf("应有 1 条，得到 %d", len(anns))
	}
}

// TestAnnotationCreateValidation 覆盖创建校验分支。
func TestAnnotationCreateValidation(t *testing.T) {
	db := annTestDB(t)
	cases := []struct{ name, body string }{
		{"非法 JSON", `{bad`},
		{"类型非法", `{"annotation_type":"bogus","client_id":"c"}`},
		{"缺标识", `{"annotation_type":"highlight"}`},
		{"source_name 为 talebook", `{"annotation_type":"highlight","source_name":"talebook","source_annotation_id":"x"}`},
		{"有 source 字段无 source_name", `{"annotation_type":"highlight","client_id":"c","source_run_id":"r"}`},
		{"有 source_name 无 source_annotation_id", `{"annotation_type":"highlight","source_name":"s"}`},
		{"client_id 超长", `{"annotation_type":"highlight","client_id":"` + strings.Repeat("x", 65) + `"}`},
		{"使用废弃字段", `{"annotation_type":"highlight","client_id":"c","external_id":"e"}`},
		{"source_name 超长", `{"annotation_type":"highlight","source_name":"` + strings.Repeat("x", 65) + `","source_annotation_id":"a"}`},
		{"source_updated_at 非法", `{"annotation_type":"highlight","client_id":"c","source_updated_at":123}`},
	}
	for _, c := range cases {
		ctx, _ := annCtx(t, db, http.MethodPost, "/api/book/1/annotations", c.body, 7)
		resp, err := BookAnnotationsHandler(nil)(ctx)
		if err != nil {
			t.Fatalf("%s: 不应返回 error: %v", c.name, err)
		}
		if resp["err"] != "params.invalid" {
			t.Errorf("%s: err = %v, want params.invalid", c.name, resp["err"])
		}
	}
}

// TestAnnotationCreateIdempotent 覆盖按 client_id 幂等更新。
func TestAnnotationCreateIdempotent(t *testing.T) {
	db := annTestDB(t)
	body := `{"annotation_type":"highlight","client_id":"c1","content":"v1"}`
	ctx, _ := annCtx(t, db, http.MethodPost, "/api/book/1/annotations", body, 7)
	resp, _ := BookAnnotationsHandler(nil)(ctx)
	if resp["created"] != true {
		t.Fatalf("首次应 created=true: %v", resp)
	}

	body2 := `{"annotation_type":"highlight","client_id":"c1","content":"v2"}`
	ctx, _ = annCtx(t, db, http.MethodPost, "/api/book/1/annotations", body2, 7)
	resp, _ = BookAnnotationsHandler(nil)(ctx)
	if resp["created"] != false {
		t.Fatalf("二次应 created=false: %v", resp)
	}
	item := resp["annotation"].(map[string]any)
	if item["content"] != "v2" {
		t.Errorf("内容应更新为 v2，得到 %v", item["content"])
	}
}

// TestAnnotationCreateWithSource 覆盖带来源副本的创建。
func TestAnnotationCreateWithSource(t *testing.T) {
	db := annTestDB(t)
	body := `{"annotation_type":"highlight","source_name":"kindle","source_connection_id":"1",
		"source_annotation_id":"a1","source_position":"pos","source_raw_hash":"h1"}`
	ctx, _ := annCtx(t, db, http.MethodPost, "/api/book/1/annotations", body, 7)
	resp, err := BookAnnotationsHandler(nil)(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("应成功: %v", resp)
	}
	item := resp["annotation"].(map[string]any)
	sources := item["sources"].([]map[string]any)
	if len(sources) != 1 || sources[0]["source_name"] != "kindle" {
		t.Errorf("sources = %v", sources)
	}
	if sources[0]["source_position"] != "pos" {
		t.Errorf("source_position = %v", sources[0]["source_position"])
	}
}

// TestAnnotationCreateStaleIgnored 覆盖旧数据保护。
func TestAnnotationCreateStaleIgnored(t *testing.T) {
	db := annTestDB(t)
	// 先建一条带较新 source_updated_at 的。
	body := `{"annotation_type":"highlight","source_name":"kindle","source_annotation_id":"a1",
		"source_updated_at":"2026-06-01T00:00:00","source_raw_hash":"h1"}`
	ctx, _ := annCtx(t, db, http.MethodPost, "/api/book/1/annotations", body, 7)
	if resp, _ := BookAnnotationsHandler(nil)(ctx); resp["err"] != "ok" {
		t.Fatalf("首次应成功: %v", resp)
	}

	// 再来一条更早且哈希不同的 → stale_ignored。
	body2 := `{"annotation_type":"highlight","source_name":"kindle","source_annotation_id":"a1",
		"source_updated_at":"2026-01-01T00:00:00","source_raw_hash":"h2"}`
	ctx, _ = annCtx(t, db, http.MethodPost, "/api/book/1/annotations", body2, 7)
	resp, _ := BookAnnotationsHandler(nil)(ctx)
	if resp["stale_ignored"] != true {
		t.Errorf("应忽略旧数据: %v", resp)
	}
}

// TestAnnotationUpdate 覆盖 PUT。
func TestAnnotationUpdate(t *testing.T) {
	db := annTestDB(t)
	ctx, _ := annCtx(t, db, http.MethodPost, "/api/book/1/annotations",
		`{"annotation_type":"highlight","client_id":"c1","content":"v1"}`, 7)
	resp, _ := BookAnnotationsHandler(nil)(ctx)
	id := int64(resp["annotation"].(map[string]any)["id"].(int64))

	ctx, _ = annCtx(t, db, http.MethodPut, "/api/book/1/annotations/"+itoa(id),
		`{"content":"v2","color":"red","is_private":false}`, 7)
	resp, err := BookAnnotationItemHandler(nil)(ctx)
	if err != nil {
		t.Fatalf("更新失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("应成功: %v", resp)
	}
	item := resp["annotation"].(map[string]any)
	if item["content"] != "v2" || item["color"] != "red" || item["is_private"] != false {
		t.Errorf("更新结果不符: %v", item)
	}
}

// TestAnnotationUpdateValidation 覆盖 PUT 的校验分支。
func TestAnnotationUpdateValidation(t *testing.T) {
	db := annTestDB(t)
	ctx, _ := annCtx(t, db, http.MethodPost, "/api/book/1/annotations",
		`{"annotation_type":"highlight","client_id":"c1"}`, 7)
	resp, _ := BookAnnotationsHandler(nil)(ctx)
	id := int64(resp["annotation"].(map[string]any)["id"].(int64))

	// 非法 JSON。
	ctx, _ = annCtx(t, db, http.MethodPut, "/api/book/1/annotations/"+itoa(id), `{bad`, 7)
	if r, _ := BookAnnotationItemHandler(nil)(ctx); r["err"] != "params.invalid" {
		t.Errorf("非法 JSON 应返回 params.invalid，得到 %v", r["err"])
	}
	// 类型非法。
	ctx, _ = annCtx(t, db, http.MethodPut, "/api/book/1/annotations/"+itoa(id), `{"annotation_type":"bogus"}`, 7)
	if r, _ := BookAnnotationItemHandler(nil)(ctx); r["err"] != "params.invalid" {
		t.Errorf("类型非法应返回 params.invalid，得到 %v", r["err"])
	}
	// 不存在的批注。
	ctx, _ = annCtx(t, db, http.MethodPut, "/api/book/1/annotations/99999", `{"content":"x"}`, 7)
	if r, _ := BookAnnotationItemHandler(nil)(ctx); r["err"] != "annotation.not_found" {
		t.Errorf("不存在应返回 annotation.not_found，得到 %v", r["err"])
	}
	// 别人的批注。
	ctx, _ = annCtx(t, db, http.MethodPut, "/api/book/1/annotations/"+itoa(id), `{"content":"x"}`, 99)
	if r, _ := BookAnnotationItemHandler(nil)(ctx); r["err"] != "annotation.not_found" {
		t.Errorf("他人批注应返回 annotation.not_found，得到 %v", r["err"])
	}
}

// TestAnnotationDelete 覆盖 DELETE。
func TestAnnotationDelete(t *testing.T) {
	db := annTestDB(t)
	ctx, _ := annCtx(t, db, http.MethodPost, "/api/book/1/annotations",
		`{"annotation_type":"highlight","client_id":"c1"}`, 7)
	resp, _ := BookAnnotationsHandler(nil)(ctx)
	id := int64(resp["annotation"].(map[string]any)["id"].(int64))

	ctx, _ = annCtx(t, db, http.MethodDelete, "/api/book/1/annotations/"+itoa(id), "", 7)
	resp, err := BookAnnotationItemHandler(nil)(ctx)
	if err != nil {
		t.Fatalf("删除失败: %v", err)
	}
	if resp["err"] != "ok" || resp["deleted"] != 1 {
		t.Errorf("删除结果不符: %v", resp)
	}
}

// TestAnnotationCollection 覆盖 /api/annotations 的 GET 与 DELETE。
func TestAnnotationCollection(t *testing.T) {
	db := annTestDB(t)
	ctx, _ := annCtx(t, db, http.MethodPost, "/api/book/1/annotations",
		`{"annotation_type":"highlight","source_name":"kindle","source_annotation_id":"a1"}`, 7)
	BookAnnotationsHandler(nil)(ctx)

	// GET。
	ctx, _ = annCtx(t, db, http.MethodGet, "/api/annotations", "", 7)
	resp, err := AnnotationCollectionHandler()(ctx)
	if err != nil {
		t.Fatalf("列表失败: %v", err)
	}
	if len(resp["annotations"].([]map[string]any)) != 1 {
		t.Errorf("应有 1 条: %v", resp)
	}

	// DELETE 无筛选 → params.invalid。
	ctx, _ = annCtx(t, db, http.MethodDelete, "/api/annotations", "", 7)
	if r, _ := AnnotationCollectionHandler()(ctx); r["err"] != "params.invalid" {
		t.Errorf("无筛选应返回 params.invalid，得到 %v", r["err"])
	}

	// DELETE 带 source_name → 删除来源副本。
	ctx, _ = annCtx(t, db, http.MethodDelete, "/api/annotations?source_name=kindle", "", 7)
	resp, err = AnnotationCollectionHandler()(ctx)
	if err != nil {
		t.Fatalf("删除失败: %v", err)
	}
	if resp["sources_deleted"] != 1 {
		t.Errorf("应删除 1 条来源，得到 %v", resp["sources_deleted"])
	}
}

// TestAnnotationExport 覆盖导出。
func TestAnnotationExport(t *testing.T) {
	db := annTestDB(t)
	ctx, _ := annCtx(t, db, http.MethodPost, "/api/book/1/annotations",
		`{"annotation_type":"highlight","client_id":"c1"}`, 7)
	BookAnnotationsHandler(nil)(ctx)

	ctx, _ = annCtx(t, db, http.MethodGet, "/api/annotations/export", "", 7)
	resp, err := AnnotationExportHandler()(ctx)
	if err != nil {
		t.Fatalf("导出失败: %v", err)
	}
	exp := resp["export"].(map[string]any)
	if exp["schema"] != "talebook.annotations.v2" {
		t.Errorf("schema = %v", exp["schema"])
	}
	if exp["exported_at"] == "" {
		t.Error("exported_at 不应为空")
	}
	if len(exp["annotations"].([]map[string]any)) != 1 {
		t.Errorf("应有 1 条: %v", exp)
	}
}

// TestAnnotationScope 覆盖 scope 过滤。
func TestAnnotationScope(t *testing.T) {
	db := annTestDB(t)
	// 用户 7 建一条私有、一条公开。
	ctx, _ := annCtx(t, db, http.MethodPost, "/api/book/1/annotations",
		`{"annotation_type":"highlight","client_id":"c1","is_private":true}`, 7)
	BookAnnotationsHandler(nil)(ctx)
	ctx, _ = annCtx(t, db, http.MethodPost, "/api/book/1/annotations",
		`{"annotation_type":"highlight","client_id":"c2","is_private":false}`, 7)
	BookAnnotationsHandler(nil)(ctx)

	// 用户 99 看 visible → 只看到公开的那条。
	ctx, _ = annCtx(t, db, http.MethodGet, "/api/book/1/annotations", "", 99)
	resp, _ := BookAnnotationsHandler(nil)(ctx)
	anns := resp["annotations"].([]map[string]any)
	if len(anns) != 1 {
		t.Fatalf("他人应只看到 1 条公开批注，得到 %d", len(anns))
	}
	if anns[0]["can_edit"] != false {
		t.Error("他人批注 can_edit 应为 false")
	}

	// scope=mine → 用户 99 看不到任何。
	ctx, _ = annCtx(t, db, http.MethodGet, "/api/book/1/annotations?scope=mine", "", 99)
	resp, _ = BookAnnotationsHandler(nil)(ctx)
	if len(resp["annotations"].([]map[string]any)) != 0 {
		t.Error("scope=mine 时他人应看不到")
	}

	// scope 非法。
	ctx, _ = annCtx(t, db, http.MethodGet, "/api/book/1/annotations?scope=bogus", "", 7)
	if r, _ := BookAnnotationsHandler(nil)(ctx); r["err"] != "params.invalid" {
		t.Errorf("非法 scope 应返回 params.invalid，得到 %v", r["err"])
	}
}

// TestAnnotationBookAccessDenied 覆盖书籍不可访问。
func TestAnnotationBookAccessDenied(t *testing.T) {
	db := annTestDB(t)
	ctx, _ := annCtx(t, db, http.MethodGet, "/api/book/1/annotations", "", 7)
	ctx.isPublic = func(int64) (bool, error) { return false, nil }

	resp, err := BookAnnotationsHandler(nil)(ctx)
	if err != nil {
		t.Fatalf("不应返回 error: %v", err)
	}
	if resp["err"] != "params.book.invalid" {
		t.Errorf("err = %v, want params.book.invalid", resp["err"])
	}
}

// TestAnnotationChapterFilter 覆盖 chapter 过滤。
func TestAnnotationChapterFilter(t *testing.T) {
	db := annTestDB(t)
	for _, ch := range []string{"ch1", "ch2"} {
		ctx, _ := annCtx(t, db, http.MethodPost, "/api/book/1/annotations",
			`{"annotation_type":"highlight","client_id":"`+ch+`","chapter":"`+ch+`"}`, 7)
		BookAnnotationsHandler(nil)(ctx)
	}

	ctx, _ := annCtx(t, db, http.MethodGet, "/api/book/1/annotations?chapter=ch1", "", 7)
	resp, _ := BookAnnotationsHandler(nil)(ctx)
	anns := resp["annotations"].([]map[string]any)
	if len(anns) != 1 || anns[0]["chapter"] != "ch1" {
		t.Errorf("chapter 过滤结果不符: %v", anns)
	}
}

// TestAnnotationSourceFilter 覆盖 source_* 过滤。
func TestAnnotationSourceFilter(t *testing.T) {
	db := annTestDB(t)
	ctx, _ := annCtx(t, db, http.MethodPost, "/api/book/1/annotations",
		`{"annotation_type":"highlight","source_name":"kindle","source_annotation_id":"a1"}`, 7)
	BookAnnotationsHandler(nil)(ctx)

	ctx, _ = annCtx(t, db, http.MethodGet, "/api/book/1/annotations?source_name=kindle", "", 7)
	resp, _ := BookAnnotationsHandler(nil)(ctx)
	if len(resp["annotations"].([]map[string]any)) != 1 {
		t.Errorf("按 source_name 过滤应命中 1 条: %v", resp)
	}

	ctx, _ = annCtx(t, db, http.MethodGet, "/api/book/1/annotations?source_name=other", "", 7)
	resp, _ = BookAnnotationsHandler(nil)(ctx)
	if len(resp["annotations"].([]map[string]any)) != 0 {
		t.Errorf("不匹配的 source_name 应无结果: %v", resp)
	}
}

// TestAnnotationSyncerCalled 覆盖同步回调被触发。
func TestAnnotationSyncerCalled(t *testing.T) {
	db := annTestDB(t)
	rec := &recordingSyncer{}

	ctx, _ := annCtx(t, db, http.MethodPost, "/api/book/1/annotations",
		`{"annotation_type":"highlight","client_id":"c1","is_private":false}`, 7)
	resp, err := BookAnnotationsHandler(rec)(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if resp["sync_enqueued"] != true {
		t.Errorf("公开批注应触发同步: %v", resp)
	}
	if rec.calls != 1 {
		t.Errorf("同步应被调用 1 次，得到 %d", rec.calls)
	}

	// 私有批注不触发同步。
	ctx, _ = annCtx(t, db, http.MethodPost, "/api/book/1/annotations",
		`{"annotation_type":"highlight","client_id":"c2","is_private":true}`, 7)
	resp, _ = BookAnnotationsHandler(rec)(ctx)
	if resp["sync_enqueued"] != false {
		t.Errorf("私有批注不应触发同步: %v", resp)
	}
	if rec.calls != 1 {
		t.Errorf("同步调用次数不应增加，得到 %d", rec.calls)
	}
}

// recordingSyncer 记录同步调用次数。
type recordingSyncer struct {
	calls int
}

// SyncAnnotation 记录一次调用。
func (r *recordingSyncer) SyncAnnotation(int64, string, string) { r.calls++ }

// TestAnnotationRouteSpecs 校验 4 条路由的注册属性。
func TestAnnotationRouteSpecs(t *testing.T) {
	specs := AnnotationRouteSpecs(nil)
	if len(specs) != 4 {
		t.Fatalf("应有 4 条路由，得到 %d", len(specs))
	}
	for _, s := range specs {
		if !s.Auth {
			t.Errorf("%s 应要求登录", s.Pattern)
		}
	}
	byPattern := map[string]RouteSpec{}
	for _, s := range specs {
		byPattern[s.Pattern] = s
	}
	if s, ok := byPattern[rBookAnnotations]; !ok || len(s.Methods) != 2 {
		t.Errorf("/api/book/N/annotations 应支持 GET+POST: %+v", s)
	}
	if s, ok := byPattern[rBookAnnotationItem]; !ok || len(s.Methods) != 2 {
		t.Errorf("/api/book/N/annotations/N 应支持 PUT+DELETE: %+v", s)
	}
	if s, ok := byPattern[rAnnotationCollection]; !ok || len(s.Methods) != 2 {
		t.Errorf("/api/annotations 应支持 GET+DELETE: %+v", s)
	}
	if s, ok := byPattern[rAnnotationExport]; !ok || len(s.Methods) != 1 {
		t.Errorf("/api/annotations/export 应只支持 GET: %+v", s)
	}
}

// TestAnnotationThroughServer 端到端校验登录门禁。
func TestAnnotationThroughServer(t *testing.T) {
	db := annTestDB(t)
	srv, err := NewServer(AnnotationRouteSpecs(nil))
	if err != nil {
		t.Fatalf("NewServer 失败: %v", err)
	}
	srv.DB = db

	// 游客 → user.need_login。
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/book/1/annotations", nil))
	if !strings.Contains(rec.Body.String(), ErrNeedLogin) {
		t.Errorf("游客应返回 %s，得到 %s", ErrNeedLogin, rec.Body.String())
	}

	// 登录后 → ok。
	srv.Identify = func(*http.Request) (Identity, error) {
		return Identity{UserID: 7, Username: "u7"}, nil
	}
	rec = httptest.NewRecorder()
	srv.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/book/1/annotations", nil))
	if !strings.Contains(rec.Body.String(), `"err":"ok"`) {
		t.Errorf("登录后应成功，得到 %s", rec.Body.String())
	}
}

// TestAnnotationHelpers 覆盖辅助函数。
func TestAnnotationHelpers(t *testing.T) {
	// parseDatetime。
	if v, bad := parseDatetime(nil); v != "" || bad {
		t.Errorf("nil 应返回 (\"\",false)，得到 (%q,%v)", v, bad)
	}
	if v, bad := parseDatetime(""); v != "" || bad {
		t.Errorf("空串应返回 (\"\",false)，得到 (%q,%v)", v, bad)
	}
	if _, bad := parseDatetime(123); !bad {
		t.Error("非字符串应返回非法")
	}
	if _, bad := parseDatetime("not-a-date"); !bad {
		t.Error("非法日期应返回非法")
	}
	if v, bad := parseDatetime("2026-01-02T03:04:05"); bad || v != "2026-01-02 03:04:05" {
		t.Errorf("解析结果 = (%q,%v)", v, bad)
	}
	if v, bad := parseDatetime("2026-01-02T03:04:05Z"); bad || v != "2026-01-02 03:04:05" {
		t.Errorf("带 Z 解析结果 = (%q,%v)", v, bad)
	}

	// asBool。
	for _, s := range []string{"1", "true", "TRUE", "yes", "on"} {
		if !asBool(s) {
			t.Errorf("asBool(%q) 应为 true", s)
		}
	}
	for _, s := range []string{"0", "false", "no", "off", ""} {
		if asBool(s) {
			t.Errorf("asBool(%q) 应为 false", s)
		}
	}
	if !asBool(true) || asBool(false) {
		t.Error("布尔值应原样返回")
	}

	// truncate。
	if got := truncate("abcdef", 3); got != "abc" {
		t.Errorf("truncate = %q", got)
	}
	if got := truncate("ab", 5); got != "ab" {
		t.Errorf("短串应原样返回，得到 %q", got)
	}
	if got := truncate("中文测试", 2); got != "中文" {
		t.Errorf("应按字符截断，得到 %q", got)
	}

	// toStr。
	if toStr(nil) != "" || toStr("x") != "x" || toStr(true) != "True" || toStr(false) != "False" {
		t.Error("toStr 结果不符")
	}
	if toStr(float64(3)) != "3" || toStr(int64(4)) != "4" {
		t.Error("数字转换不符")
	}

	// sourceFieldsAreValid。
	if !sourceFieldsAreValid(map[string]any{}) {
		t.Error("空对象应合法")
	}
	if !sourceFieldsAreValid(map[string]any{"source_name": "ok"}) {
		t.Error("合法长度应通过")
	}
	if sourceFieldsAreValid(map[string]any{"source_name": strings.Repeat("x", 65)}) {
		t.Error("超长应不合法")
	}
	if sourceFieldsAreValid(map[string]any{"source_name": 123}) {
		t.Error("非字符串应不合法")
	}

	// sourceIdentity。
	n, c, a := sourceIdentity(map[string]any{"source_name": " s ", "source_connection_id": " c ", "source_annotation_id": " a "})
	if n != "s" || c != "c" || a != "a" {
		t.Errorf("sourceIdentity = (%q,%q,%q)", n, c, a)
	}

	// asBoolDefault。
	if !asBoolDefault(nil, true) || asBoolDefault(nil, false) {
		t.Error("nil 应返回默认值")
	}
	if !asBoolDefault("yes", false) {
		t.Error("应解析字符串")
	}

	// strPtrIfPresent。
	if strPtrIfPresent(map[string]any{}, "k") != nil {
		t.Error("缺失键应返回 nil")
	}
	if p := strPtrIfPresent(map[string]any{"k": "v"}, "k"); p == nil || *p != "v" {
		t.Error("存在的键应返回指针")
	}

	// readerName。
	ctx := &Context{Identity: Identity{UserID: 7, Username: "alice"}}
	if got := readerName(ctx); got != "alice" {
		t.Errorf("readerName = %q", got)
	}
	ctx = &Context{Identity: Identity{UserID: 7}}
	if got := readerName(ctx); got != "读者 7" {
		t.Errorf("无用户名时 readerName = %q", got)
	}

	// nowTimestamp。
	if len(nowTimestamp()) != 19 {
		t.Errorf("nowTimestamp 应为 19 字符，得到 %q", nowTimestamp())
	}
}

// TestAnnotationDBError 覆盖数据库错误。
func TestAnnotationDBError(t *testing.T) {
	db := annTestDB(t)
	db.Close()

	ctx, _ := annCtx(t, db, http.MethodGet, "/api/book/1/annotations", "", 7)
	if _, err := BookAnnotationsHandler(nil)(ctx); err == nil {
		t.Error("列表在库不可用时应报错")
	}
	ctx, _ = annCtx(t, db, http.MethodGet, "/api/annotations", "", 7)
	if _, err := AnnotationCollectionHandler()(ctx); err == nil {
		t.Error("集合列表在库不可用时应报错")
	}
	ctx, _ = annCtx(t, db, http.MethodGet, "/api/annotations/export", "", 7)
	if _, err := AnnotationExportHandler()(ctx); err == nil {
		t.Error("导出在库不可用时应报错")
	}
}

// TestAnnotationBadParams 覆盖非法路径参数。
func TestAnnotationBadParams(t *testing.T) {
	db := annTestDB(t)
	ctx, _ := annCtx(t, db, http.MethodGet, "/api/book/abc/annotations", "", 7)
	if r, _ := BookAnnotationsHandler(nil)(ctx); r["err"] != "params.book.invalid" {
		t.Errorf("非法 book_id 应返回 params.book.invalid，得到 %v", r["err"])
	}

	ctx, _ = annCtx(t, db, http.MethodPut, "/api/book/abc/annotations/xyz", "", 7)
	if r, _ := BookAnnotationItemHandler(nil)(ctx); r["err"] != "params.book.invalid" {
		t.Errorf("非法参数应返回 params.book.invalid，得到 %v", r["err"])
	}
}

// TestAnnotationCollectionBadBookID 覆盖 book_id 非法。
func TestAnnotationCollectionBadBookID(t *testing.T) {
	db := annTestDB(t)
	ctx, _ := annCtx(t, db, http.MethodGet, "/api/annotations?book_id=abc", "", 7)
	if r, _ := AnnotationCollectionHandler()(ctx); r["err"] != "params.invalid" {
		t.Errorf("非法 book_id 应返回 params.invalid，得到 %v", r["err"])
	}
	ctx, _ = annCtx(t, db, http.MethodDelete, "/api/annotations?source_name=s&book_id=abc", "", 7)
	if r, _ := AnnotationCollectionHandler()(ctx); r["err"] != "params.invalid" {
		t.Errorf("非法 book_id 应返回 params.invalid，得到 %v", r["err"])
	}
	ctx, _ = annCtx(t, db, http.MethodGet, "/api/annotations/export?book_id=abc", "", 7)
	if r, _ := AnnotationExportHandler()(ctx); r["err"] != "params.invalid" {
		t.Errorf("非法 book_id 应返回 params.invalid，得到 %v", r["err"])
	}
}

// TestAnnotationCollectionBookFilter 覆盖按 book_id 过滤。
func TestAnnotationCollectionBookFilter(t *testing.T) {
	db := annTestDB(t)
	for _, b := range []string{"1", "2"} {
		ctx, _ := annCtx(t, db, http.MethodPost, "/api/book/"+b+"/annotations",
			`{"annotation_type":"highlight","client_id":"c`+b+`"}`, 7)
		BookAnnotationsHandler(nil)(ctx)
	}

	ctx, _ := annCtx(t, db, http.MethodGet, "/api/annotations?book_id=1", "", 7)
	resp, _ := AnnotationCollectionHandler()(ctx)
	if len(resp["annotations"].([]map[string]any)) != 1 {
		t.Errorf("按 book_id 过滤应命中 1 条: %v", resp)
	}
}
