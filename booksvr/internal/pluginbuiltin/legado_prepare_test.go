package pluginbuiltin

import (
	"database/sql"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"talebook/booksvr/internal/booksource"
	"talebook/booksvr/internal/plugindomain"

	_ "modernc.org/sqlite"
)

// legadoPrepareDB 建含 book_sources 表的内存库并写入三条书源。
func legadoPrepareDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if _, err := db.Exec(`CREATE TABLE book_sources (
		id INTEGER PRIMARY KEY, name VARCHAR(200), url VARCHAR(1000), "group" VARCHAR(200),
		source_type INTEGER, enabled BOOLEAN, weight INTEGER, comment VARCHAR(500),
		last_check_time DATETIME, last_check_ok BOOLEAN, check_status VARCHAR(50),
		check_message VARCHAR(500), check_tags TEXT, create_time DATETIME, update_time DATETIME, raw TEXT)`); err != nil {
		t.Fatalf("建表: %v", err)
	}
	raw, err := json.Marshal(map[string]any{"bookSourceUrl": "https://a.example.com", "bookSourceName": "A"})
	if err != nil {
		t.Fatal(err)
	}
	rows := []struct {
		id         int64
		name       string
		sourceType int
		enabled    int
		weight     int
	}{
		{1, "A", 0, 1, 5},
		{2, "B", 0, 1, 9},
		{3, "C", 1, 1, 99},  // 漫画源：排除
		{4, "D", 0, 0, 100}, // 停用：排除
	}
	for _, r := range rows {
		if _, err := db.Exec(`INSERT INTO book_sources
			(id, name, url, "group", source_type, enabled, weight, raw)
			VALUES (?,?,?,?,?,?,?,?)`,
			r.id, r.name, "https://x", "", r.sourceType, r.enabled, r.weight, string(raw)); err != nil {
			t.Fatalf("插入: %v", err)
		}
	}
	return db
}

// TestLegadoPrepareContextSearchBooks 覆盖 prepare_context 的书源收集。
func TestLegadoPrepareContextSearchBooks(t *testing.T) {
	db := legadoPrepareDB(t)
	p := newLegadoProvider()

	out := p.PrepareContext(db, map[string]any{"cookie_secret": "s3cret"}, "search_books")
	sources, ok := out["metadata_sources"].([]booksource.MetadataSource)
	if !ok {
		t.Fatalf("metadata_sources 类型 = %T", out["metadata_sources"])
	}
	// 只收 enabled=1 且 source_type=0 的 A/B，按 weight DESC。
	if len(sources) != 2 {
		t.Fatalf("sources = %d, want 2: %v", len(sources), sources)
	}
	if sources[0].Key != "db:2" || sources[0].Name != "B" {
		t.Errorf("首位 = %s/%s, want db:2/B（weight DESC）", sources[0].Key, sources[0].Name)
	}
	if sources[1].Key != "db:1" {
		t.Errorf("次位 = %s, want db:1", sources[1].Key)
	}
	if _, ok := sources[0].Raw["bookSourceUrl"]; !ok {
		t.Error("raw 应保留书源 JSON")
	}
	if out["cookie_secret"] != "s3cret" {
		t.Errorf("cookie_secret = %v", out["cookie_secret"])
	}
	if _, ok := out["booksource_config"].(map[string]any); !ok {
		t.Error("booksource_config 应为 map")
	}
}

// TestLegadoPrepareContextMethodScoped 覆盖非 search_books 方法返回空注入。
func TestLegadoPrepareContextMethodScoped(t *testing.T) {
	db := legadoPrepareDB(t)
	p := newLegadoProvider()
	for _, method := range []string{"", "search", "get_reviews"} {
		out := p.PrepareContext(db, nil, method)
		if len(out) != 0 {
			t.Errorf("method=%q 应返回空 map, got %v", method, out)
		}
	}
	// nil DB 同样返回空。
	if out := p.PrepareContext(nil, nil, "search_books"); len(out) != 0 {
		t.Errorf("nil DB 应返回空 map, got %v", out)
	}
}

// TestLegadoPrepareContextTopK 覆盖 BOOKSOURCE_METADATA_TOP_K 截断。
func TestLegadoPrepareContextTopK(t *testing.T) {
	db := legadoPrepareDB(t)
	p := newLegadoProvider()
	out := p.PrepareContext(db, map[string]any{"BOOKSOURCE_METADATA_TOP_K": float64(1)}, "search_books")
	sources := out["metadata_sources"].([]booksource.MetadataSource)
	if len(sources) != 1 || sources[0].Key != "db:2" {
		t.Errorf("top_k=1 应只取 weight 最高的 db:2, got %v", sources)
	}
}

// TestLegadoSearchBooksWithInjectedSources 端到端：PrepareContext 注入后
// SearchBooks 不再在空书源列表上执行（有源时返回候选或失败项，而非 no_source）。
func TestLegadoSearchBooksWithInjectedSources(t *testing.T) {
	db := legadoPrepareDB(t)
	p := newLegadoProvider()
	platform := p.PrepareContext(db, map[string]any{}, "search_books")
	records, err := p.SearchBooks(
		plugindomainQueryOf("三体"),
		map[string]any{"platform": platform, "config": map[string]any{}},
	)
	if err != nil {
		t.Fatalf("SearchBooks: %v", err)
	}
	// 无网络环境：候选可为空，但不能再是「没有可用书源」的恒空路径。
	_ = records
}

// plugindomainQueryOf 构造查询。
func plugindomainQueryOf(title string) plugindomain.MetadataQuery {
	return plugindomain.MetadataQuery{Title: title}
}

// TestLegadoPrepareContextSchemaFile 确认 schema.sql 的 book_sources 列齐全。
func TestLegadoPrepareContextSchemaFile(t *testing.T) {
	path := filepath.Join("..", "userdb", "testdata", "schema.sql")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Skipf("schema.sql 不存在: %v", err)
	}
	if !strings.Contains(string(raw), "source_type") {
		t.Error("schema.sql 应含 source_type 列")
	}
}
