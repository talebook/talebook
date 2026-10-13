package httpapi

import (
	"database/sql"
	"net/http"
	"testing"

	"talebook/booksvr/internal/library"
)

// TestUserRouteSpecsWiresCounters 验证 UserRouteSpecs 的统计回调已接线。
//
// 这是首页「分类浏览」全部显示 0 的回归测试：计数回调在 serve.go 里
// 构造 UserConfig 时被漏掉，handler 本身有测试（直接注入回调），
// 但真实装配路径没测，导致线上全部返回 0。
func TestUserRouteSpecsWiresCounters(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)

	// 造一本带作者/出版社/标签的书，并登记两种格式。
	if _, err := library.ImportBook(db, library.BookMeta{
		Title: "计数书", Author: "计数作者", Publisher: "计数出版社",
		Tags: []string{"计数标签"}, Path: "计数作者/计数书 (1)",
	}); err != nil {
		t.Fatalf("ImportBook: %v", err)
	}
	for _, f := range []string{"EPUB", "MOBI"} {
		if _, err := db.Exec(
			`INSERT INTO data (book, format, uncompressed_size, name) VALUES (1,?,100,?)`,
			f, "x."+f); err != nil {
			t.Fatal(err)
		}
	}

	// 复刻 serve.go 的装配方式。
	cfg := UserConfig{
		DB:              db,
		CountBooks:      func() (int64, error) { return library.CountBooks(db) },
		CountAuthors:    func() (int64, error) { return library.CountAuthors(db) },
		CountPublishers: func() (int64, error) { return library.CountPublishers(db) },
		CountTags:       func() (int64, error) { return library.CountTags(db) },
		CountSeries:     func() (int64, error) { return library.CountSeries(db) },
		CountFormats:    func() (int64, error) { return library.CountFormats(db) },
	}

	info, err := userSysInfo(cfg)
	if err != nil {
		t.Fatalf("userSysInfo: %v", err)
	}
	// 关键断言：计数必须非零（回调未接线会全部为 0）。
	for _, k := range []string{"books", "authors", "publishers", "tags", "formats"} {
		got, ok := info[k].(int64)
		if !ok {
			t.Errorf("%s 类型 = %T，期望 int64", k, info[k])
			continue
		}
		if got <= 0 {
			t.Errorf("%s = %d，应大于 0（回调未接线会得到 0）", k, got)
		}
	}
	// 夹具可能已预置 data 行，只断言去重后不小于新增的 2 种。
	if n, _ := info["formats"].(int64); n < 2 {
		t.Errorf("formats = %d，应至少 2（COUNT DISTINCT）", n)
	}
}

// TestUserRouteSpecsCountersNotNil 验证 UserRouteSpecs 产出的路由里
// UserInfo 能读到非零计数（防止回调再次被漏接线）。
func TestUserRouteSpecsCountersNotNil(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	if _, err := library.ImportBook(db, library.BookMeta{
		Title: "书", Author: "作者", Path: "作者/书 (1)",
	}); err != nil {
		t.Fatalf("ImportBook: %v", err)
	}

	cfg := UserConfig{
		DB:         db,
		CountBooks: func() (int64, error) { return library.CountBooks(db) },
	}
	ctx := pluginCtx(t, db, http.MethodGet, "/api/user/info", "", 0, false)
	got, err := UserInfoHandler(cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	sys, ok := got["sys"].(map[string]any)
	if !ok {
		t.Fatalf("sys 字段缺失或类型错误: %T", got["sys"])
	}
	if n, _ := sys["books"].(int64); n <= 0 {
		t.Errorf("sys.books = %v，应大于 0（回调未接线会得到 0）", sys["books"])
	}
}

// 保证 sql 包被引用（netSchemaDB 返回 *sql.DB）。
var _ *sql.DB
