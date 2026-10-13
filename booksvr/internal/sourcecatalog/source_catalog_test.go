package sourcecatalog

import (
	"database/sql"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginruntime"

	_ "modernc.org/sqlite"
)

// newSchemaDB 建一个内存库并套用权威 schema。
func newSchemaDB(t *testing.T) *sql.DB {
	t.Helper()
	path := filepath.Join("..", "userdb", "testdata", "schema.sql")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Skipf("schema.sql 不存在，跳过: %v", err)
	}
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	db.SetMaxOpenConns(1)
	t.Cleanup(func() { _ = db.Close() })

	for _, stmt := range strings.Split(string(raw), ";") {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" {
			continue
		}
		if _, err := db.Exec(stmt); err != nil {
			t.Fatalf("建表失败: %v\n语句: %s", err, stmt)
		}
	}
	return db
}

// sourceProvider 是满足 SourceProvider 契约的最小实现。
type sourceProvider struct {
	manifest map[string]any
	mode     pluginiface.DownloadMode
}

func (s *sourceProvider) Manifest() map[string]any { return s.manifest }
func (s *sourceProvider) DownloadMode() pluginiface.DownloadMode {
	return s.mode
}
func (s *sourceProvider) Search(string, map[string]any,
	map[string]any) (plugindomain.Page, error) {
	return plugindomain.Page{}, nil
}
func (s *sourceProvider) Browse(string, map[string]any,
	map[string]any) (plugindomain.Page, error) {
	return plugindomain.Page{}, nil
}
func (s *sourceProvider) GetCategories(map[string]any) ([]plugindomain.Category, error) {
	return nil, nil
}
func (s *sourceProvider) GetBook(string, map[string]any) (plugindomain.SourceBookDetail, error) {
	return plugindomain.SourceBookDetail{}, nil
}
func (s *sourceProvider) Download(plugindomain.SourceBookDetail,
	map[string]any) (plugindomain.BookFile, error) {
	return plugindomain.BookFile{}, nil
}
func (s *sourceProvider) GetTOC(plugindomain.SourceBookDetail,
	map[string]any) ([]plugindomain.SourceChapter, error) {
	return nil, nil
}
func (s *sourceProvider) GetChapter(plugindomain.SourceChapter,
	map[string]any) (plugindomain.SourceContent, error) {
	return plugindomain.SourceContent{}, nil
}
func (s *sourceProvider) SelfCheck(map[string]any) (plugindomain.CheckReport, error) {
	return plugindomain.CheckReport{}, nil
}

// sourceManifest 构造一份声明书源能力的合法清单。
func sourceManifest(id string, capabilities []any) map[string]any {
	return map[string]any{
		"download_mode":     "none",
		"protocol_version":  "talebook.plugin/v1",
		"id":                id,
		"name":              "书源插件",
		"version":           "1.0.0",
		"categories":        []any{"sources"},
		"capabilities":      capabilities,
		"runtime_kind":      "builtin",
		"actions":           []any{"test"},
		"auth_schema":       map[string]any{"properties": map[string]any{}},
		"config_schema":     map[string]any{},
		"connection_owners": []any{"instance"},
		"permissions":       []any{"books.read"},
		"data_policy":       map[string]any{},
		"compatibility":     map[string]any{},
		"homepage":          "",
		"license":           "",
	}
}

// newService 建库、注册书源 provider 并返回目录服务。
func newService(t *testing.T, pluginKey string, capabilities []any,
	mode pluginiface.DownloadMode) (*Service, *sql.DB) {
	t.Helper()
	db := newSchemaDB(t)
	if _, err := db.Exec(`INSERT INTO readers (username, password, admin, create_time)
		VALUES ('admin', 'x', 1, '2026-01-01 00:00:00.000000')`); err != nil {
		t.Fatalf("插入管理员失败: %v", err)
	}

	reg := pluginruntime.NewPluginRegistry()
	p := &sourceProvider{manifest: sourceManifest(pluginKey, capabilities), mode: mode}
	caps := pluginiface.CapabilitySet{
		Interfaces:   map[string]bool{"SourceProvider": true},
		HasSelfCheck: true,
		DownloadMode: mode,
		Methods: map[string]bool{
			"search": true, "browse": true, "get_categories": true, "get_book": true,
			"download": true, "get_toc": true, "get_chapter": true, "self_check": true,
		},
	}
	if _, err := reg.Register(p, caps); err != nil {
		t.Fatalf("Register: %v", err)
	}

	settings := map[string]any{"PLUGIN_SECRET_KEY": "test-key-123"}
	rt := pluginruntime.NewRuntime(db, settings, reg)
	svc, err := NewService(db, settings, 1, rt)
	if err != nil {
		t.Fatalf("NewService: %v", err)
	}
	// 启用安装（provider 未实现 InitialEnabled，默认 false）。
	if _, err := db.Exec(`UPDATE plugin_installations SET enabled = 1`); err != nil {
		t.Fatalf("enable: %v", err)
	}
	return svc, db
}

func TestBindingsLegadoExpandsSources(t *testing.T) {
	svc, db := newService(t, LegadoPluginID,
		[]any{"sources.search", "sources.browse"}, pluginiface.DownloadNone)

	for _, name := range []string{"源A", "源B"} {
		if _, err := db.Exec(`INSERT INTO book_sources
			(name, url, "group", enabled, weight, raw, create_time, update_time)
			VALUES (?, ?, '分组', 1, 0, '{"bookSourceName":"x"}', '', '')`,
			name, "https://"+name); err != nil {
			t.Fatalf("插入书源失败: %v", err)
		}
	}

	bindings, err := svc.Bindings()
	if err != nil {
		t.Fatalf("Bindings: %v", err)
	}
	if len(bindings) != 2 {
		t.Fatalf("len = %d, want 2", len(bindings))
	}
	b := bindings[0]
	if !strings.HasPrefix(b.Key, "legado:") {
		t.Errorf("key = %s", b.Key)
	}
	if b.LegacyID == nil {
		t.Error("legado binding must carry legacy_id")
	}
	if b.Group != "分组" {
		t.Errorf("group = %s", b.Group)
	}
	cfg := anyMap(b.ContextOverrides["config"])
	if cfg["source_raw"] == nil {
		t.Error("source_raw must be present")
	}
	if cfg["engine_config"] == nil {
		t.Error("engine_config must be present")
	}
}

func TestBindingsLegadoSkipsDisabled(t *testing.T) {
	svc, db := newService(t, LegadoPluginID, []any{"sources.search"}, pluginiface.DownloadNone)
	if _, err := db.Exec(`INSERT INTO book_sources
		(name, url, "group", enabled, weight, raw, create_time, update_time)
		VALUES ('禁用', 'https://x', '', 0, 0, '{}', '', '')`); err != nil {
		t.Fatalf("插入: %v", err)
	}
	bindings, err := svc.Bindings()
	if err != nil {
		t.Fatalf("Bindings: %v", err)
	}
	if len(bindings) != 0 {
		t.Errorf("disabled source must be skipped, got %d", len(bindings))
	}
}

func TestBindingsOPDSExpandsSources(t *testing.T) {
	svc, db := newService(t, OPDSPluginID, []any{"sources.browse"}, pluginiface.DownloadNone)
	if _, err := db.Exec(`INSERT INTO opds_sources (name, url, active, data)
		VALUES ('我的OPDS', 'https://opds.example.com', 1, '{}')`); err != nil {
		t.Fatalf("插入: %v", err)
	}

	bindings, err := svc.Bindings()
	if err != nil {
		t.Fatalf("Bindings: %v", err)
	}
	if len(bindings) != 1 {
		t.Fatalf("len = %d", len(bindings))
	}
	b := bindings[0]
	if b.Key != "opds:1" {
		t.Errorf("key = %s", b.Key)
	}
	if b.Group != "OPDS" {
		t.Errorf("group = %s", b.Group)
	}
	if b.LegacyID != nil {
		t.Error("opds binding must not carry legacy_id")
	}
	if anyMap(b.ContextOverrides["config"])["endpoint"] != "https://opds.example.com" {
		t.Errorf("endpoint = %v", b.ContextOverrides)
	}
}

func TestBindingsOPDSSkipsInactive(t *testing.T) {
	svc, db := newService(t, OPDSPluginID, []any{"sources.browse"}, pluginiface.DownloadNone)
	if _, err := db.Exec(`INSERT INTO opds_sources (name, url, active, data)
		VALUES ('停用', 'https://x', 0, '{}')`); err != nil {
		t.Fatalf("插入: %v", err)
	}
	bindings, err := svc.Bindings()
	if err != nil {
		t.Fatalf("Bindings: %v", err)
	}
	if len(bindings) != 0 {
		t.Errorf("inactive source must be skipped")
	}
}

func TestBindingsGenericPlugin(t *testing.T) {
	svc, _ := newService(t, "talebook.source.custom",
		[]any{"sources.search"}, pluginiface.DownloadNone)

	bindings, err := svc.Bindings()
	if err != nil {
		t.Fatalf("Bindings: %v", err)
	}
	if len(bindings) != 1 {
		t.Fatalf("len = %d", len(bindings))
	}
	b := bindings[0]
	if !strings.HasPrefix(b.Key, "plugin:") {
		t.Errorf("key = %s", b.Key)
	}
	if b.Group != "插件书源" {
		t.Errorf("group = %s", b.Group)
	}
}

func TestBindingsSkipsNonSourceProvider(t *testing.T) {
	// 声明书源能力但不实现 SourceProvider 接口的插件，注册期即被契约校验拒绝。
	reg := pluginruntime.NewPluginRegistry()
	manifest := sourceManifest("talebook.source.bad", []any{"sources.search"})
	delete(manifest, "download_mode")
	p := &nonSourceProvider{manifest: manifest}
	_, err := reg.Register(p, pluginiface.CapabilitySet{
		Interfaces:   map[string]bool{},
		HasSelfCheck: true,
	})
	if err == nil {
		t.Fatal("expected contract violation for non-SourceProvider")
	}
	if !strings.Contains(err.Error(), "未实现 SourceProvider") {
		t.Errorf("error = %v", err)
	}
}

// nonSourceProvider 只实现 Provider，不实现 SourceProvider。
type nonSourceProvider struct{ manifest map[string]any }

func (n *nonSourceProvider) Manifest() map[string]any { return n.manifest }
func (n *nonSourceProvider) SelfCheck(map[string]any) (plugindomain.CheckReport, error) {
	return plugindomain.CheckReport{}, nil
}

func TestAvailabilityStates(t *testing.T) {
	svc, db := newService(t, LegadoPluginID, []any{"sources.search"}, pluginiface.DownloadNone)

	// 无已配置书源 → no_configured_sources。
	got, err := svc.Availability(nil)
	if err != nil {
		t.Fatalf("Availability: %v", err)
	}
	if got["state"] != "no_configured_sources" {
		t.Errorf("state = %v", got["state"])
	}
	if got["enabled_plugins"] != 1 {
		t.Errorf("enabled_plugins = %v", got["enabled_plugins"])
	}

	// 加一条书源 → ready。
	if _, err := db.Exec(`INSERT INTO book_sources
		(name, url, "group", enabled, weight, raw, create_time, update_time)
		VALUES ('源', 'https://x', '', 1, 0, '{}', '', '')`); err != nil {
		t.Fatalf("插入: %v", err)
	}
	got, err = svc.Availability(nil)
	if err != nil {
		t.Fatalf("Availability: %v", err)
	}
	if got["state"] != "ready" {
		t.Errorf("state = %v", got["state"])
	}
	if got["configured_sources"] != 1 {
		t.Errorf("configured_sources = %v", got["configured_sources"])
	}
}

func TestAvailabilityNoEnabledPlugins(t *testing.T) {
	svc, db := newService(t, LegadoPluginID, []any{"sources.search"}, pluginiface.DownloadNone)
	if _, err := db.Exec(`UPDATE plugin_installations SET enabled = 0`); err != nil {
		t.Fatalf("disable: %v", err)
	}
	got, err := svc.Availability(nil)
	if err != nil {
		t.Fatalf("Availability: %v", err)
	}
	if got["state"] != "no_enabled_plugins" {
		t.Errorf("state = %v", got["state"])
	}
}

func TestSearchConcurrencyDefault(t *testing.T) {
	svc, _ := newService(t, LegadoPluginID, []any{"sources.search"}, pluginiface.DownloadNone)
	bindings, err := svc.Bindings()
	if err != nil {
		t.Fatalf("Bindings: %v", err)
	}
	// 无 legado 绑定时用 settings 的 BOOKSOURCE_MAX_WORKERS。
	if got := svc.SearchConcurrency(bindings); got != DefaultSearchConcurrency {
		t.Errorf("got %d, want %d", got, DefaultSearchConcurrency)
	}
}

func TestSearchConcurrencyFromConnection(t *testing.T) {
	svc, db := newService(t, LegadoPluginID, []any{"sources.search"}, pluginiface.DownloadNone)
	if _, err := db.Exec(`INSERT INTO book_sources
		(name, url, "group", enabled, weight, raw, create_time, update_time)
		VALUES ('源', 'https://x', '', 1, 0, '{}', '', '')`); err != nil {
		t.Fatalf("插入: %v", err)
	}
	if _, err := db.Exec(`UPDATE plugin_connections SET config = '{"search_concurrency": 7}'`); err != nil {
		t.Fatalf("update config: %v", err)
	}
	bindings, err := svc.Bindings()
	if err != nil {
		t.Fatalf("Bindings: %v", err)
	}
	if got := svc.SearchConcurrency(bindings); got != 7 {
		t.Errorf("got %d, want 7", got)
	}
}

func TestSearchConcurrencyClamping(t *testing.T) {
	svc, db := newService(t, LegadoPluginID, []any{"sources.search"}, pluginiface.DownloadNone)
	if _, err := db.Exec(`INSERT INTO book_sources
		(name, url, "group", enabled, weight, raw, create_time, update_time)
		VALUES ('源', 'https://x', '', 1, 0, '{}', '', '')`); err != nil {
		t.Fatalf("插入: %v", err)
	}
	for _, c := range []struct {
		raw  string
		want int
	}{
		{`{"search_concurrency": 0}`, 1},
		{`{"search_concurrency": -5}`, 1},
		{`{"search_concurrency": 999}`, 100},
		{`{"search_concurrency": 50}`, 50},
	} {
		if _, err := db.Exec(`UPDATE plugin_connections SET config = ?`, c.raw); err != nil {
			t.Fatalf("update: %v", err)
		}
		bindings, err := svc.Bindings()
		if err != nil {
			t.Fatalf("Bindings: %v", err)
		}
		if got := svc.SearchConcurrency(bindings); got != c.want {
			t.Errorf("config %s → %d, want %d", c.raw, got, c.want)
		}
	}
}

func TestGetByKey(t *testing.T) {
	svc, db := newService(t, LegadoPluginID, []any{"sources.search"}, pluginiface.DownloadNone)
	if _, err := db.Exec(`INSERT INTO book_sources
		(name, url, "group", enabled, weight, raw, create_time, update_time)
		VALUES ('源', 'https://x', '', 1, 0, '{}', '', '')`); err != nil {
		t.Fatalf("插入: %v", err)
	}
	b, err := svc.Get("legado:1")
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if b.Name != "源" {
		t.Errorf("name = %s", b.Name)
	}
}

func TestGetNumericAlias(t *testing.T) {
	svc, db := newService(t, LegadoPluginID, []any{"sources.search"}, pluginiface.DownloadNone)
	if _, err := db.Exec(`INSERT INTO book_sources
		(name, url, "group", enabled, weight, raw, create_time, update_time)
		VALUES ('源', 'https://x', '', 1, 0, '{}', '', '')`); err != nil {
		t.Fatalf("插入: %v", err)
	}
	// 纯数字 source_id 应被解释为 legado:<id>。
	b, err := svc.Get("1")
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if b.Key != "legado:1" {
		t.Errorf("key = %s", b.Key)
	}
}

func TestGetNotFound(t *testing.T) {
	svc, _ := newService(t, LegadoPluginID, []any{"sources.search"}, pluginiface.DownloadNone)
	_, err := svc.Get("legado:999")
	if err == nil {
		t.Fatal("expected error")
	}
	if pluginruntime.ErrorCodeOf(err) != "source.not_found" {
		t.Errorf("code = %s", pluginruntime.ErrorCodeOf(err))
	}
}

func TestToPublicDict(t *testing.T) {
	legacy := int64(42)
	b := &SourceBinding{
		Key:          "legado:42",
		Name:         "源",
		Group:        "分组",
		PluginKey:    LegadoPluginID,
		Capabilities: []string{"sources.browse", "sources.search"},
		DownloadMode: "none",
		LegacyID:     &legacy,
	}
	got := b.ToPublicDict()
	if got["id"] != int64(42) {
		t.Errorf("id = %v (legacy_id must win)", got["id"])
	}
	if got["source_key"] != "legado:42" {
		t.Errorf("source_key = %v", got["source_key"])
	}
	caps := got["capabilities"].([]string)
	if caps[0] != "sources.browse" {
		t.Errorf("capabilities must be sorted: %v", caps)
	}
}

func TestToPublicDictWithoutLegacyID(t *testing.T) {
	b := &SourceBinding{Key: "opds:1", Capabilities: []string{}}
	got := b.ToPublicDict()
	if got["id"] != "opds:1" {
		t.Errorf("id = %v", got["id"])
	}
}

func TestEngineConfigDefaults(t *testing.T) {
	svc := &Service{Settings: map[string]any{}}
	cfg := svc.EngineConfig()
	if cfg["BOOKSOURCE_HTTP_TIMEOUT"] != 20 {
		t.Errorf("timeout = %v", cfg["BOOKSOURCE_HTTP_TIMEOUT"])
	}
	if cfg["BOOKSOURCE_MAX_TOC_PAGES"] != 30 {
		t.Errorf("toc pages = %v", cfg["BOOKSOURCE_MAX_TOC_PAGES"])
	}
	if cfg["BOOKSOURCE_MAX_CONTENT_PAGES"] != 20 {
		t.Errorf("content pages = %v", cfg["BOOKSOURCE_MAX_CONTENT_PAGES"])
	}
	if cfg["BOOKSOURCE_CLEAN_ENABLED"] != true {
		t.Errorf("clean = %v", cfg["BOOKSOURCE_CLEAN_ENABLED"])
	}
	if cfg["BOOKSOURCE_MAX_RESPONSE_BYTES"] != 8*1024*1024 {
		t.Errorf("bytes = %v", cfg["BOOKSOURCE_MAX_RESPONSE_BYTES"])
	}
}

func TestEngineConfigOverrides(t *testing.T) {
	svc := &Service{Settings: map[string]any{
		"BOOKSOURCE_HTTP_TIMEOUT":  5,
		"BOOKSOURCE_CLEAN_ENABLED": false,
	}}
	cfg := svc.EngineConfig()
	if cfg["BOOKSOURCE_HTTP_TIMEOUT"] != 5 {
		t.Errorf("timeout = %v", cfg["BOOKSOURCE_HTTP_TIMEOUT"])
	}
	if cfg["BOOKSOURCE_CLEAN_ENABLED"] != false {
		t.Errorf("clean = %v", cfg["BOOKSOURCE_CLEAN_ENABLED"])
	}
}

func TestIsDigits(t *testing.T) {
	for _, s := range []string{"1", "42", "007"} {
		if !isDigits(s) {
			t.Errorf("%q must be digits", s)
		}
	}
	for _, s := range []string{"", "a", "1a", "-1", "1.5", " 1"} {
		if isDigits(s) {
			t.Errorf("%q must not be digits", s)
		}
	}
}

func TestIntersect(t *testing.T) {
	got := intersect([]any{"sources.search", "metadata.lookup", "sources.browse"},
		SourceCapabilities)
	if len(got) != 2 {
		t.Fatalf("got %v", got)
	}
	// 顺序按 SourceCapabilities。
	if got[0] != "sources.search" || got[1] != "sources.browse" {
		t.Errorf("got %v", got)
	}
	if len(intersect(nil, SourceCapabilities)) != 0 {
		t.Error("nil must give empty")
	}
}

func TestSourceCapabilitiesSet(t *testing.T) {
	if len(SourceCapabilities) != 3 {
		t.Fatalf("len = %d", len(SourceCapabilities))
	}
	want := map[string]bool{"sources.search": true, "sources.browse": true, "sources.acquire": true}
	for _, c := range SourceCapabilities {
		if !want[c] {
			t.Errorf("unexpected capability %s", c)
		}
	}
}

func TestPluginIDConstants(t *testing.T) {
	if LegadoPluginID != "talebook.source.legado" {
		t.Errorf("legado = %s", LegadoPluginID)
	}
	if OPDSPluginID != "talebook.source.opds" {
		t.Errorf("opds = %s", OPDSPluginID)
	}
	if SearchConcurrencyKey != "search_concurrency" {
		t.Errorf("key = %s", SearchConcurrencyKey)
	}
	if DefaultSearchConcurrency != 20 {
		t.Errorf("default = %d", DefaultSearchConcurrency)
	}
}
