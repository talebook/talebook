package httpapi

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"talebook/booksvr/internal/booksource"
)

// bsFixture 是一次书源管理测试的完整环境。
type bsFixture struct {
	DB  *sql.DB
	Cfg *BookSourceAdminConfig
}

// newBSFixture 建库并返回可用的配置（探测全部走注入实现，不出网）。
func newBSFixture(t *testing.T) *bsFixture {
	t.Helper()
	db := netSchemaDB(t)
	if _, err := db.Exec(`INSERT INTO readers (id, username, password, admin, active, permission, create_time)
		VALUES (1, 'admin', 'x', 1, 1, '', '2026-01-01 00:00:00')`); err != nil {
		t.Fatalf("插入管理员失败: %v", err)
	}
	cfg := &BookSourceAdminConfig{
		Settings: map[string]any{"BOOKSOURCE_HTTP_TIMEOUT": 20},
		Resolve:  func(string, int) error { return nil },
		Fetch: func(context.Context, string, float64) (int, error) {
			return 200, nil
		},
		Checker: NewBookSourceChecker(nil),
	}
	return &bsFixture{DB: db, Cfg: cfg}
}

// ---- 路由 ----

func TestBookSourceAdminRouteSpecs(t *testing.T) {
	specs := BookSourceAdminRouteSpecs(BookSourceAdminConfig{})
	if len(specs) != 10 {
		t.Fatalf("len = %d, want 10", len(specs))
	}
	for _, s := range specs {
		if !s.Auth || !s.Admin {
			t.Errorf("%s 应要求管理员", s.Pattern)
		}
		if !strings.HasPrefix(s.Pattern, "/api/admin/booksource") {
			t.Errorf("意外路由 %q", s.Pattern)
		}
	}
}

// ---- BookSourceList ----

func TestBookSourceListEmpty(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	ctx := pluginCtx(t, db, http.MethodGet, "/api/admin/booksource/list", "", 1, true)

	got, err := BookSourceListHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	if got["count"] != 0 || len(got["items"].([]map[string]any)) != 0 {
		t.Errorf("got = %v", got)
	}
	if got["page"] != 1 || got["size"] != 50 {
		t.Errorf("分页默认值不对: %v / %v", got["page"], got["size"])
	}
	if _, ok := got["check_task"]; !ok {
		t.Error("缺少 check_task")
	}
}

func TestBookSourceListFilters(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	seedBookSource(t, db, "甲源", "https://a.com", "组一", true, 5)
	seedBookSource(t, db, "乙源", "https://b.com", "组二", false, 1)

	// 按 enabled 过滤。
	ctx := pluginCtx(t, db, http.MethodGet, "/api/admin/booksource/list?enabled=1", "", 1, true)
	got, err := BookSourceListHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["count"] != 1 {
		t.Errorf("enabled=1 count = %v", got["count"])
	}

	// 按 group 过滤。
	ctx = pluginCtx(t, db, http.MethodGet, "/api/admin/booksource/list?group=组二", "", 1, true)
	got, _ = BookSourceListHandler(*fx.Cfg)(ctx)
	if got["count"] != 1 {
		t.Errorf("group count = %v", got["count"])
	}

	// 按关键词过滤。
	ctx = pluginCtx(t, db, http.MethodGet, "/api/admin/booksource/list?q=甲", "", 1, true)
	got, _ = BookSourceListHandler(*fx.Cfg)(ctx)
	if got["count"] != 1 {
		t.Errorf("q count = %v", got["count"])
	}

	// groups 去重排序。
	ctx = pluginCtx(t, db, http.MethodGet, "/api/admin/booksource/list", "", 1, true)
	got, _ = BookSourceListHandler(*fx.Cfg)(ctx)
	groups := got["groups"].([]string)
	if len(groups) != 2 {
		t.Errorf("groups = %v", groups)
	}
}

func TestBookSourceListPagination(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	for i := 0; i < 5; i++ {
		seedBookSource(t, db, "源"+jsonNumber(int64(i)), "https://"+jsonNumber(int64(i))+".com", "", true, int64(i))
	}
	ctx := pluginCtx(t, db, http.MethodGet, "/api/admin/booksource/list?page=2&size=2", "", 1, true)
	got, err := BookSourceListHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["count"] != 5 {
		t.Errorf("count = %v", got["count"])
	}
	if len(got["items"].([]map[string]any)) != 2 {
		t.Errorf("items = %v", got["items"])
	}
}

func TestBookSourceListClampsSize(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	ctx := pluginCtx(t, db, http.MethodGet, "/api/admin/booksource/list?size=9999", "", 1, true)
	got, _ := BookSourceListHandler(*fx.Cfg)(ctx)
	if got["size"] != 200 {
		t.Errorf("size 应钳制到 200，得到 %v", got["size"])
	}
	ctx = pluginCtx(t, db, http.MethodGet, "/api/admin/booksource/list?size=0&page=0", "", 1, true)
	got, _ = BookSourceListHandler(*fx.Cfg)(ctx)
	if got["size"] != 1 || got["page"] != 1 {
		t.Errorf("size/page 应至少为 1，得到 %v / %v", got["size"], got["page"])
	}
}

// ---- BookSourceExport ----

func TestBookSourceExport(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	seedBookSource(t, db, "甲源", "https://a.com", "组一", true, 5)

	ctx := pluginCtx(t, db, http.MethodGet, "/api/admin/booksource/export", "", 1, true)
	got, err := BookSourceExportHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	sources := got["sources"].([]map[string]any)
	if len(sources) != 1 {
		t.Fatalf("sources = %v", sources)
	}
	if sources[0]["bookSourceName"] != "甲源" || sources[0]["bookSourceUrl"] != "https://a.com" {
		t.Errorf("got = %v", sources[0])
	}
	if sources[0]["enabled"] != true || sources[0]["weight"] != int64(5) {
		t.Errorf("got = %v", sources[0])
	}
}

// ---- BookSourceImport ----

func TestBookSourceImportFromJSON(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	body := `{"json":"[{\"bookSourceName\":\"甲\",\"bookSourceUrl\":\"https://a.com\"}]"}`
	ctx := pluginCtx(t, db, http.MethodPost, "/api/admin/booksource/import", body, 1, true)

	got, err := BookSourceImportHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v, msg = %v", got["err"], got["msg"])
	}
	if got["added"] != 1 {
		t.Errorf("added = %v", got["added"])
	}
	if got["check_task"] != "queued" {
		t.Errorf("check_task = %v", got["check_task"])
	}
}

func TestBookSourceImportBadJSON(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	ctx := pluginCtx(t, db, http.MethodPost, "/api/admin/booksource/import", `{"json":"not json"}`, 1, true)

	got, err := BookSourceImportHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrBookSourceJSON {
		t.Errorf("err = %v", got["err"])
	}
}

func TestBookSourceImportRequiresJSONOrURL(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	ctx := pluginCtx(t, db, http.MethodPost, "/api/admin/booksource/import", `{}`, 1, true)

	got, err := BookSourceImportHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrBookSourceParams {
		t.Errorf("err = %v", got["err"])
	}
}

func TestBookSourceImportFromURL(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	fx.Cfg.FetchJSON = func(context.Context, string, float64) ([]byte, error) {
		return []byte(`[{"bookSourceName":"甲","bookSourceUrl":"https://a.com"}]`), nil
	}
	ctx := pluginCtx(t, db, http.MethodPost, "/api/admin/booksource/import",
		`{"url":"https://src.example.com/list.json"}`, 1, true)

	got, err := BookSourceImportHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" || got["added"] != 1 {
		t.Errorf("got = %v", got)
	}
}

func TestBookSourceImportURLFetchFailed(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	fx.Cfg.FetchJSON = func(context.Context, string, float64) ([]byte, error) {
		return nil, bsErrString("boom")
	}
	ctx := pluginCtx(t, db, http.MethodPost, "/api/admin/booksource/import",
		`{"url":"https://src.example.com/list.json"}`, 1, true)

	got, err := BookSourceImportHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrBookSourceFetch {
		t.Errorf("err = %v", got["err"])
	}
}

// ---- BookSourceSeed ----

func TestBookSourceSeed(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	seed := filepath.Join(t.TempDir(), "seed.json")
	if err := os.WriteFile(seed, []byte(
		`[{"bookSourceName":"种子","bookSourceUrl":"https://seed.com"}]`), 0o644); err != nil {
		t.Fatalf("写种子失败: %v", err)
	}
	fx.Cfg.SeedFile = seed

	ctx := pluginCtx(t, db, http.MethodPost, "/api/admin/booksource/seed", `{}`, 1, true)
	got, err := BookSourceSeedHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" || got["added"] != 1 {
		t.Errorf("got = %v", got)
	}
}

func TestBookSourceSeedMissingFile(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	fx.Cfg.SeedFile = filepath.Join(t.TempDir(), "nope.json")

	ctx := pluginCtx(t, db, http.MethodPost, "/api/admin/booksource/seed", `{}`, 1, true)
	got, err := BookSourceSeedHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrBookSourceSeed {
		t.Errorf("err = %v", got["err"])
	}
}

func TestBookSourceSeedNotConfigured(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	ctx := pluginCtx(t, db, http.MethodPost, "/api/admin/booksource/seed", `{}`, 1, true)

	got, err := BookSourceSeedHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrBookSourceSeed {
		t.Errorf("err = %v", got["err"])
	}
}

// ---- BookSourceToggle ----

func TestBookSourceToggleExplicitEnabled(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	id := seedBookSource(t, db, "甲", "https://a.com", "", true, 0)

	ctx := pluginCtx(t, db, http.MethodPost, "/api/admin/booksource/toggle",
		`{"ids":[`+jsonNumber(id)+`],"enabled":false}`, 1, true)
	got, err := BookSourceToggleHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" || got["enabled"] != false {
		t.Errorf("got = %v", got)
	}
	if got["updated"] != int64(1) {
		t.Errorf("updated = %v", got["updated"])
	}
}

func TestBookSourceToggleFlipsSingle(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	id := seedBookSource(t, db, "甲", "https://a.com", "", true, 0)

	ctx := pluginCtx(t, db, http.MethodPost, "/api/admin/booksource/toggle",
		`{"id":`+jsonNumber(id)+`}`, 1, true)
	got, err := BookSourceToggleHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" || got["enabled"] != false {
		t.Errorf("应取反为 false: %v", got)
	}
}

func TestBookSourceToggleBatchRequiresEnabled(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	a := seedBookSource(t, db, "甲", "https://a.com", "", true, 0)
	b := seedBookSource(t, db, "乙", "https://b.com", "", true, 0)

	ctx := pluginCtx(t, db, http.MethodPost, "/api/admin/booksource/toggle",
		`{"ids":[`+jsonNumber(a)+`,`+jsonNumber(b)+`]}`, 1, true)
	got, err := BookSourceToggleHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrBookSourceParams {
		t.Errorf("err = %v", got["err"])
	}
}

func TestBookSourceToggleMissingID(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	ctx := pluginCtx(t, db, http.MethodPost, "/api/admin/booksource/toggle", `{}`, 1, true)

	got, err := BookSourceToggleHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrBookSourceParams {
		t.Errorf("err = %v", got["err"])
	}
}

func TestBookSourceToggleNotFound(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	ctx := pluginCtx(t, db, http.MethodPost, "/api/admin/booksource/toggle", `{"id":999}`, 1, true)

	got, err := BookSourceToggleHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrBookSourceNotFound {
		t.Errorf("err = %v", got["err"])
	}
}

// ---- 检测状态与全量检测 ----

func TestBookSourceCheckStatus(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	ctx := pluginCtx(t, db, http.MethodGet, "/api/admin/booksource/check/status", "", 1, true)

	got, err := BookSourceCheckStatusHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" || got["running"] != false {
		t.Errorf("got = %v", got)
	}
}

func TestBookSourceCheckAll(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	seedBookSource(t, db, "甲", "https://a.com", "", true, 0)
	seedBookSource(t, db, "乙", "https://b.com", "", true, 0)

	var ran []int64
	fx.Cfg.Checker = NewBookSourceChecker(func(ids []int64, markDone func()) {
		ran = append(ran, ids...)
		for range ids {
			markDone()
		}
	})
	ctx := pluginCtx(t, db, http.MethodPost, "/api/admin/booksource/check", `{}`, 1, true)

	got, err := BookSourceCheckAllHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" || got["checked"] != 2 {
		t.Errorf("got = %v", got)
	}
	if got["started"] != true {
		t.Errorf("started = %v", got["started"])
	}
	if len(ran) != 2 {
		t.Errorf("未执行检测: %v", ran)
	}
}

func TestBookSourceCheckAllEmpty(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	ctx := pluginCtx(t, db, http.MethodPost, "/api/admin/booksource/check", `{}`, 1, true)

	got, err := BookSourceCheckAllHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["checked"] != 0 || got["started"] != false {
		t.Errorf("got = %v", got)
	}
}

// ---- BookSourceCRUD ----

func TestBookSourceCRUDCreate(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	body := `{"raw":{"bookSourceName":"甲","bookSourceUrl":"https://a.com"}}`
	ctx := pluginCtx(t, db, http.MethodPost, "/api/admin/booksource", body, 1, true)

	got, err := BookSourceCRUDHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v, msg = %v", got["err"], got["msg"])
	}
	if pluginInt(got["id"], 0) == 0 {
		t.Error("应返回新 id")
	}
}

func TestBookSourceCRUDCreateRawAsString(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	body := `{"raw":"{\"bookSourceName\":\"甲\",\"bookSourceUrl\":\"https://a.com\"}"}`
	ctx := pluginCtx(t, db, http.MethodPost, "/api/admin/booksource", body, 1, true)

	got, err := BookSourceCRUDHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Errorf("字符串 raw 应可解析: %v", got)
	}
}

func TestBookSourceCRUDCreateBadRawString(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	ctx := pluginCtx(t, db, http.MethodPost, "/api/admin/booksource", `{"raw":"not json"}`, 1, true)

	got, err := BookSourceCRUDHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrBookSourceParams {
		t.Errorf("err = %v", got["err"])
	}
}

func TestBookSourceCRUDCreateMissingRaw(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	ctx := pluginCtx(t, db, http.MethodPost, "/api/admin/booksource", `{}`, 1, true)

	got, err := BookSourceCRUDHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrBookSourceParams {
		t.Errorf("err = %v", got["err"])
	}
}

func TestBookSourceCRUDCreateMissingFields(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	ctx := pluginCtx(t, db, http.MethodPost, "/api/admin/booksource",
		`{"raw":{"bookSourceName":"甲"}}`, 1, true)

	got, err := BookSourceCRUDHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrBookSourceParams {
		t.Errorf("err = %v", got["err"])
	}
}

func TestBookSourceCRUDCreateDuplicateURL(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	seedBookSource(t, db, "旧", "https://a.com", "", true, 0)

	ctx := pluginCtx(t, db, http.MethodPost, "/api/admin/booksource",
		`{"raw":{"bookSourceName":"新","bookSourceUrl":"https://a.com"}}`, 1, true)
	got, err := BookSourceCRUDHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrBookSourceExist {
		t.Errorf("err = %v", got["err"])
	}
}

func TestBookSourceCRUDUpdate(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	id := seedBookSource(t, db, "旧", "https://a.com", "", true, 0)

	body := `{"id":` + jsonNumber(id) + `,"enabled":false,"weight":9,"group":"新组"}`
	ctx := pluginCtx(t, db, http.MethodPut, "/api/admin/booksource", body, 1, true)
	got, err := BookSourceCRUDHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}

	s, err := booksource.GetSourceByID(db, id)
	if err != nil {
		t.Fatalf("GetSourceByID: %v", err)
	}
	if s.Enabled || s.Weight != 9 || s.Group != "新组" {
		t.Errorf("s = %+v", s)
	}
}

func TestBookSourceCRUDUpdateBadWeightKeepsOld(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	id := seedBookSource(t, db, "旧", "https://a.com", "", true, 3)

	body := `{"id":` + jsonNumber(id) + `,"weight":"abc"}`
	ctx := pluginCtx(t, db, http.MethodPut, "/api/admin/booksource", body, 1, true)
	if _, err := BookSourceCRUDHandler(*fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	s, _ := booksource.GetSourceByID(db, id)
	if s.Weight != 3 {
		t.Errorf("非法 weight 应保留原值，得到 %d", s.Weight)
	}
}

func TestBookSourceCRUDUpdateRaw(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	id := seedBookSource(t, db, "旧", "https://a.com", "", true, 0)

	body := `{"id":` + jsonNumber(id) + `,"raw":{"bookSourceName":"改名","bookSourceUrl":"https://a.com"}}`
	ctx := pluginCtx(t, db, http.MethodPut, "/api/admin/booksource", body, 1, true)
	if _, err := BookSourceCRUDHandler(*fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	s, _ := booksource.GetSourceByID(db, id)
	if s.Name != "改名" {
		t.Errorf("name = %q", s.Name)
	}
}

func TestBookSourceCRUDUpdateNotFound(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	ctx := pluginCtx(t, db, http.MethodPut, "/api/admin/booksource", `{"id":999}`, 1, true)

	got, err := BookSourceCRUDHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrBookSourceNotFound {
		t.Errorf("err = %v", got["err"])
	}
}

func TestBookSourceCRUDDeleteByQuery(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	id := seedBookSource(t, db, "甲", "https://a.com", "", true, 0)

	ctx := pluginCtx(t, db, http.MethodDelete,
		"/api/admin/booksource?id="+jsonNumber(id), "", 1, true)
	got, err := BookSourceCRUDHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" || got["deleted"] != int64(1) {
		t.Errorf("got = %v", got)
	}
}

func TestBookSourceCRUDDeleteByBody(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	a := seedBookSource(t, db, "甲", "https://a.com", "", true, 0)
	b := seedBookSource(t, db, "乙", "https://b.com", "", true, 0)

	body := `{"ids":[` + jsonNumber(a) + `,` + jsonNumber(b) + `]}`
	ctx := pluginCtx(t, db, http.MethodDelete, "/api/admin/booksource", body, 1, true)
	got, err := BookSourceCRUDHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["deleted"] != int64(2) {
		t.Errorf("deleted = %v", got["deleted"])
	}
}

func TestBookSourceCRUDDeleteMissingID(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	ctx := pluginCtx(t, db, http.MethodDelete, "/api/admin/booksource", "", 1, true)

	got, err := BookSourceCRUDHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrBookSourceParams {
		t.Errorf("err = %v", got["err"])
	}
}

func TestBookSourceCRUDUnsupportedMethod(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	ctx := pluginCtx(t, db, http.MethodGet, "/api/admin/booksource", "", 1, true)

	got, err := BookSourceCRUDHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrBookSourceParams {
		t.Errorf("err = %v", got["err"])
	}
}

// ---- BookSourceTest ----

func TestBookSourceTestNotFound(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	ctx := pluginCtx(t, db, http.MethodPost, "/api/admin/booksource/test", `{"id":999}`, 1, true)

	got, err := BookSourceTestHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrBookSourceNotFound {
		t.Errorf("err = %v", got["err"])
	}
}

func TestBookSourceTestFailureRecorded(t *testing.T) {
	fx := newBSFixture(t)
	db := fx.DB
	// 书源规则为空 → 引擎搜索必然失败，结果应写回检测状态。
	id := seedBookSource(t, db, "甲", "https://a.com", "", true, 0)

	ctx := pluginCtx(t, db, http.MethodPost, "/api/admin/booksource/test",
		`{"id":`+jsonNumber(id)+`,"key":"剑来"}`, 1, true)
	got, err := BookSourceTestHandler(*fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] == "ok" {
		t.Errorf("空规则书源不应测试通过: %v", got)
	}
	if _, ok := got["elapsed_ms"]; !ok {
		t.Error("缺少 elapsed_ms")
	}

	s, _ := booksource.GetSourceByID(db, id)
	if s.LastCheckOK {
		t.Error("失败结果应写回 last_check_ok=false")
	}
	if s.CheckStatus == "" {
		t.Error("应写回 check_status")
	}
}

// ---- BookSourceChecker ----

func TestBookSourceCheckerEnqueueRuns(t *testing.T) {
	var ran []int64
	c := NewBookSourceChecker(func(ids []int64, markDone func()) {
		ran = append(ran, ids...)
		for range ids {
			markDone()
		}
	})
	started, status := c.Enqueue([]int64{1, 2})
	if !started {
		t.Error("应新起一批")
	}
	if status["total"] != 2 {
		t.Errorf("total = %v", status["total"])
	}
	if len(ran) != 2 {
		t.Errorf("ran = %v", ran)
	}
	// 跑完后 running 应为 false。
	if c.Status()["running"] != false {
		t.Errorf("running = %v", c.Status()["running"])
	}
}

func TestBookSourceCheckerEnqueueEmpty(t *testing.T) {
	c := NewBookSourceChecker(nil)
	started, status := c.Enqueue(nil)
	if started {
		t.Error("空列表不应新起一批")
	}
	if status["running"] != false {
		t.Errorf("status = %v", status)
	}
}

func TestBookSourceCheckerQueuesWhileRunning(t *testing.T) {
	release := make(chan struct{})
	var batches [][]int64
	c := NewBookSourceChecker(func(ids []int64, markDone func()) {
		batches = append(batches, ids)
		if len(batches) == 1 {
			<-release
		}
		for range ids {
			markDone()
		}
	})

	done := make(chan struct{})
	go func() {
		c.Enqueue([]int64{1})
		close(done)
	}()
	// 等第一批进入运行态。
	for i := 0; i < 200 && c.Status()["running"] != true; i++ {
		timeSleepMillis(5)
	}
	// 运行中再入队 → 进入 pending。
	started, status := c.Enqueue([]int64{2})
	if started {
		t.Error("运行中不应新起一批")
	}
	if status["pending"] != 1 {
		t.Errorf("pending = %v", status["pending"])
	}
	close(release)
	<-done
	// 第一批结束后应自动接续第二批。
	for i := 0; i < 200 && len(batches) < 2; i++ {
		timeSleepMillis(5)
	}
	if len(batches) != 2 {
		t.Fatalf("batches = %v", batches)
	}
	if batches[1][0] != 2 {
		t.Errorf("第二批 = %v", batches[1])
	}
}

func TestBookSourceCheckerRecoversFromPanic(t *testing.T) {
	c := NewBookSourceChecker(func([]int64, func()) { panic("boom") })
	c.Enqueue([]int64{1})
	status := c.Status()
	if status["last_error"] != "boom" {
		t.Errorf("last_error = %v", status["last_error"])
	}
	if status["running"] != false {
		t.Errorf("panic 后应复位 running: %v", status)
	}
}

func TestBookSourceCheckerSetRunBatch(t *testing.T) {
	c := NewBookSourceChecker(nil)
	var ran bool
	c.SetRunBatch(func([]int64, func()) { ran = true })
	c.Enqueue([]int64{1})
	if !ran {
		t.Error("注入的执行器未被调用")
	}
}

func TestDefaultBookSourceCheckerSingleton(t *testing.T) {
	a := DefaultBookSourceChecker()
	b := DefaultBookSourceChecker()
	if a != b {
		t.Error("应为同一单例")
	}
}

// ---- 小工具 ----

func TestBookSourceIDsFromRequest(t *testing.T) {
	got := bookSourceIDsFromRequest(map[string]any{"ids": []any{1, "2", 2}})
	if len(got) != 2 {
		t.Errorf("got = %v", got)
	}
	got = bookSourceIDsFromRequest(map[string]any{"id": 5})
	if len(got) != 1 || got[0] != 5 {
		t.Errorf("got = %v", got)
	}
	if got := bookSourceIDsFromRequest(map[string]any{}); len(got) != 0 {
		t.Errorf("空请求 → %v", got)
	}
}

func TestBookSourceRawFromRequest(t *testing.T) {
	raw, errResp := bookSourceRawFromRequest(map[string]any{
		"raw": map[string]any{"a": 1},
	})
	if errResp != nil || raw["a"] != 1 {
		t.Errorf("raw = %v, err = %v", raw, errResp)
	}
	if _, errResp := bookSourceRawFromRequest(map[string]any{"raw": "bad"}); errResp == nil {
		t.Error("非法字符串应报错")
	}
	if _, errResp := bookSourceRawFromRequest(map[string]any{}); errResp == nil {
		t.Error("缺 raw 应报错")
	}
}

func TestAdminFloat(t *testing.T) {
	cases := []struct {
		value    any
		fallback float64
		want     float64
	}{
		{float64(1.5), 0, 1.5}, {float32(2), 0, 2}, {int(3), 0, 3}, {int64(4), 0, 4},
		{json.Number("5.5"), 0, 5.5}, {"6.5", 0, 6.5}, {"x", 9, 9}, {nil, 10, 10},
	}
	for _, tc := range cases {
		if got := adminFloat(tc.value, tc.fallback); got != tc.want {
			t.Errorf("adminFloat(%#v) = %v, want %v", tc.value, got, tc.want)
		}
	}
}

func TestAdminIntOK(t *testing.T) {
	if n, ok := adminIntOK(float64(3)); !ok || n != 3 {
		t.Errorf("got = %d, %v", n, ok)
	}
	if n, ok := adminIntOK("4"); !ok || n != 4 {
		t.Errorf("got = %d, %v", n, ok)
	}
	if _, ok := adminIntOK("x"); ok {
		t.Error("非法值应返回 false")
	}
}

func TestAdminStringList(t *testing.T) {
	got := adminStringList(`["a","b"]`)
	if len(got) != 2 || got[0] != "a" {
		t.Errorf("got = %v", got)
	}
	if len(adminStringList("bad")) != 0 {
		t.Error("非法应返回空")
	}
}

func TestEngineConfigFromSettings(t *testing.T) {
	cfg := BookSourceAdminConfig{Settings: map[string]any{
		"BOOKSOURCE_HTTP_TIMEOUT":      30,
		"BOOKSOURCE_MAX_TOC_PAGES":     5,
		"BOOKSOURCE_MAX_CONTENT_PAGES": 6,
		"BOOKSOURCE_AD_PATTERNS":       []any{"a", "b"},
		"BOOKSOURCE_CLEAN_ENABLED":     false,
	}}
	engine := cfg.engineConfig()
	if engine.HTTPTimeout != 30 || engine.MaxTocPages != 5 || engine.MaxContentPages != 6 {
		t.Errorf("engine = %+v", engine)
	}
	if len(engine.ADPatterns) != 2 || engine.CleanEnabled {
		t.Errorf("engine = %+v", engine)
	}
}

func TestProbeTimeoutCapsAt8(t *testing.T) {
	cfg := BookSourceAdminConfig{Settings: map[string]any{"BOOKSOURCE_HTTP_TIMEOUT": 20}}
	if got := cfg.probeTimeout(); got != 8 {
		t.Errorf("probeTimeout = %v, want 8", got)
	}
	cfg = BookSourceAdminConfig{Settings: map[string]any{"BOOKSOURCE_HTTP_TIMEOUT": 3}}
	if got := cfg.probeTimeout(); got != 3 {
		t.Errorf("probeTimeout = %v, want 3", got)
	}
}

func TestHTTPTimeoutDefault(t *testing.T) {
	cfg := BookSourceAdminConfig{Settings: map[string]any{}}
	if got := cfg.httpTimeout(); got != booksource.DefaultHTTPTimeout {
		t.Errorf("httpTimeout = %v", got)
	}
}

// ---- 测试辅助 ----

// seedBookSource 插入一条书源并返回 id。
func seedBookSource(t *testing.T, db *sql.DB, name, url, group string, enabled bool, weight int64) int64 {
	t.Helper()
	res, err := db.Exec(`INSERT INTO book_sources
		(name, url, "group", source_type, enabled, weight, comment,
		 last_check_time, last_check_ok, check_status, check_message, check_tags,
		 create_time, update_time, raw)
		VALUES (?,?,?,0,?,?,'','',0,'','','[]','2026-01-01 00:00:00','2026-01-01 00:00:00','{}')`,
		name, url, group, enabled, weight)
	if err != nil {
		t.Fatalf("插入书源失败: %v", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		t.Fatalf("LastInsertId: %v", err)
	}
	return id
}

// timeSleepMillis 让出 CPU 一小段时间。
func timeSleepMillis(ms int) {
	time.Sleep(time.Duration(ms) * time.Millisecond)
}

// bsErrString 是一个最小的错误实现。
type bsErrString string

func (e bsErrString) Error() string { return string(e) }
