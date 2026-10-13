package booksource

import (
	"database/sql"
	"os"
	"path/filepath"
	"strings"
	"testing"

	_ "modernc.org/sqlite"
)

// adminSchema 建一个含 book_sources 表的内存库。
func adminSchema(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	db.SetMaxOpenConns(1)
	t.Cleanup(func() { _ = db.Close() })
	if _, err := db.Exec(`CREATE TABLE book_sources (
		id INTEGER PRIMARY KEY, name VARCHAR(200) NOT NULL, url VARCHAR(767) NOT NULL,
		"group" VARCHAR(200), source_type INTEGER, enabled BOOLEAN, weight INTEGER,
		comment VARCHAR(500), last_check_time DATETIME, last_check_ok BOOLEAN,
		check_status VARCHAR(20), check_message VARCHAR(500), check_tags TEXT,
		create_time DATETIME, update_time DATETIME, raw TEXT)`); err != nil {
		t.Fatalf("建表失败: %v", err)
	}
	return db
}

// seedSource 插入一条书源并返回 id。
func seedSource(t *testing.T, db *sql.DB, name, url string, enabled bool, weight int64) int64 {
	t.Helper()
	s := &Source{Name: name, URL: url, Enabled: enabled, Weight: weight,
		Raw: map[string]any{"bookSourceName": name, "bookSourceUrl": url}}
	if err := InsertSource(db, s); err != nil {
		t.Fatalf("插入书源失败: %v", err)
	}
	return s.ID
}

// ---- HasJS / HasUnsupportedJS / RequiresJS ----

func TestHasJS(t *testing.T) {
	cases := []struct {
		value any
		want  bool
	}{
		{"@js:foo", true}, {"<js>x</js>", true}, {"@JS:FOO", true},
		{"@css:.a", false}, {"", false}, {nil, false}, {123, false},
	}
	for _, tc := range cases {
		if got := HasJS(tc.value); got != tc.want {
			t.Errorf("HasJS(%#v) = %v, want %v", tc.value, got, tc.want)
		}
	}
}

func TestHasUnsupportedJS(t *testing.T) {
	cases := []struct {
		value any
		want  bool
	}{
		{"<js>x</js>", true}, {"{{js.x}}", true}, {"{{java.x}}", true},
		{"java.ajax('u')", true}, {"java.post('u')", true},
		{"@js:foo", false}, {"@css:.a", false}, {nil, false},
	}
	for _, tc := range cases {
		if got := HasUnsupportedJS(tc.value); got != tc.want {
			t.Errorf("HasUnsupportedJS(%#v) = %v, want %v", tc.value, got, tc.want)
		}
	}
}

func TestRequiresJS(t *testing.T) {
	// searchUrl 以 @js: 开头是受支持的，不算 blocked。
	if RequiresJS(map[string]any{"searchUrl": "@js:foo"}) {
		t.Error("@js: 开头的 searchUrl 不应判为依赖 JS")
	}
	// searchUrl 含 @js: 但不在开头 → blocked。
	if !RequiresJS(map[string]any{"searchUrl": "http://x/@js:foo"}) {
		t.Error("非开头的 @js: 应判为依赖 JS")
	}
	// ruleSearch.bookList 含 JS。
	if !RequiresJS(map[string]any{"ruleSearch": map[string]any{"bookList": "@js:x"}}) {
		t.Error("bookList 含 JS 应判为依赖 JS")
	}
	// ruleContent.content 含不支持的 JS。
	if !RequiresJS(map[string]any{"ruleContent": map[string]any{"content": "{{js.x}}"}}) {
		t.Error("content 含不支持 JS 应判为依赖 JS")
	}
	// 纯 CSS 规则不依赖 JS。
	if RequiresJS(map[string]any{
		"searchUrl":   "/search?key={{key}}",
		"ruleSearch":  map[string]any{"bookList": "@css:li"},
		"ruleContent": map[string]any{"content": "@css:#c@text"},
	}) {
		t.Error("纯 CSS 规则不应判为依赖 JS")
	}
}

// ---- SourceTags ----

func TestSourceTags(t *testing.T) {
	raw := map[string]any{
		"bookSourceType": 0,
		"bookSourceUrl":  "https://example.com",
		"searchUrl":      "/search?key={{key}}",
		"exploreUrl":     "/explore",
		"ruleSearch":     map[string]any{"bookList": "@css:li"},
		"ruleBookInfo":   map[string]any{"name": "@css:.n@text"},
		"ruleToc":        map[string]any{"chapterList": "@css:a"},
		"ruleContent":    map[string]any{"content": "@css:#c@text"},
	}
	tags := SourceTags(raw)
	for _, want := range []string{"text", "https", "search", "info", "toc", "content", "explore", "html"} {
		if !containsStr(tags, want) {
			t.Errorf("缺少标签 %q，得到 %v", want, tags)
		}
	}
}

func TestSourceTagsNonTextAndHTTP(t *testing.T) {
	tags := SourceTags(map[string]any{
		"bookSourceType": 1,
		"bookSourceUrl":  "http://example.com",
	})
	if !containsStr(tags, "non-text") {
		t.Errorf("应含 non-text: %v", tags)
	}
	if !containsStr(tags, "http") {
		t.Errorf("应含 http: %v", tags)
	}
}

func TestSourceTagsJSON(t *testing.T) {
	tags := SourceTags(map[string]any{
		"searchUrl": "$.data.list",
	})
	if !containsStr(tags, "json") {
		t.Errorf("应含 json: %v", tags)
	}
}

func TestSourceTagsJSBlocked(t *testing.T) {
	tags := SourceTags(map[string]any{
		"searchUrl": "http://x/@js:foo",
	})
	if !containsStr(tags, "js-blocked") {
		t.Errorf("应含 js-blocked: %v", tags)
	}
}

func TestSourceTagsJSRuntime(t *testing.T) {
	// 受支持的 @js: 开头 → js-runtime 而非 js-blocked。
	tags := SourceTags(map[string]any{
		"searchUrl": "@js:foo",
	})
	if !containsStr(tags, "js-runtime") {
		t.Errorf("应含 js-runtime: %v", tags)
	}
	if containsStr(tags, "js-blocked") {
		t.Errorf("不应含 js-blocked: %v", tags)
	}
}

func TestSourceTagsNil(t *testing.T) {
	if got := SourceTags(nil); len(got) != 0 {
		t.Errorf("nil → %v", got)
	}
}

// ---- MissingRequiredFeatures ----

func TestMissingRequiredFeatures(t *testing.T) {
	missing := MissingRequiredFeatures(map[string]any{})
	if len(missing) != 7 {
		t.Errorf("空书源应缺 7 项，得到 %v", missing)
	}
	full := map[string]any{
		"searchUrl":    "/s",
		"ruleSearch":   map[string]any{"bookList": "a", "bookUrl": "b"},
		"ruleBookInfo": map[string]any{"name": "c"},
		"ruleToc":      map[string]any{"chapterList": "d", "chapterUrl": "e"},
		"ruleContent":  map[string]any{"content": "f"},
	}
	if got := MissingRequiredFeatures(full); len(got) != 0 {
		t.Errorf("完整书源不应缺项，得到 %v", got)
	}
}

// ---- NormalizedProbeURL ----

func TestNormalizedProbeURL(t *testing.T) {
	probe, parsed := NormalizedProbeURL("https://example.com/path?q=1")
	if parsed == nil {
		t.Fatal("应解析成功")
	}
	if probe != "https://example.com/" {
		t.Errorf("probe = %q", probe)
	}
	// 无 scheme 时补 http://。
	probe, parsed = NormalizedProbeURL("example.com")
	if parsed == nil || probe != "http://example.com/" {
		t.Errorf("probe = %q, parsed = %v", probe, parsed)
	}
	// 非法 scheme。
	if _, parsed := NormalizedProbeURL("ftp://example.com"); parsed != nil {
		t.Error("ftp 应判为非法")
	}
	if _, parsed := NormalizedProbeURL(""); parsed != nil {
		t.Error("空串应判为非法")
	}
}

// ---- ProbeSourceNetwork ----

func TestProbeSourceNetworkInvalidURL(t *testing.T) {
	got := ProbeSourceNetwork(map[string]any{"bookSourceUrl": "ftp://x"}, 5, nil, nil)
	if got.Status != CheckStatusInvalid {
		t.Errorf("status = %q", got.Status)
	}
}

func TestProbeSourceNetworkDNSFailed(t *testing.T) {
	got := ProbeSourceNetwork(map[string]any{"bookSourceUrl": "https://nope.invalid"}, 5,
		func(string, int) error { return os.ErrNotExist }, nil)
	if got.Status != CheckStatusDNSFailed {
		t.Errorf("status = %q", got.Status)
	}
	if !containsStr(got.Tags, "dns-failed") {
		t.Errorf("tags = %v", got.Tags)
	}
}

func TestProbeSourceNetworkOK(t *testing.T) {
	got := ProbeSourceNetwork(map[string]any{"bookSourceUrl": "https://example.com"}, 5,
		func(string, int) error { return nil },
		func(string, float64) (int, error) { return 200, nil })
	if !got.OK || got.Status != CheckStatusOK {
		t.Errorf("got = %+v", got)
	}
	if !containsStr(got.Tags, "dns-ok") || !containsStr(got.Tags, "connect-ok") {
		t.Errorf("tags = %v", got.Tags)
	}
	if !containsStr(got.Tags, "http-200") {
		t.Errorf("tags = %v", got.Tags)
	}
}

func TestProbeSourceNetworkServerError(t *testing.T) {
	got := ProbeSourceNetwork(map[string]any{"bookSourceUrl": "https://example.com"}, 5,
		func(string, int) error { return nil },
		func(string, float64) (int, error) { return 503, nil })
	if got.OK {
		t.Error("5xx 应判为失败")
	}
	if got.Status != CheckStatusConnectFail {
		t.Errorf("status = %q", got.Status)
	}
}

func TestProbeSourceNetworkSSLError(t *testing.T) {
	got := ProbeSourceNetwork(map[string]any{"bookSourceUrl": "https://example.com"}, 5,
		func(string, int) error { return nil },
		func(string, float64) (int, error) {
			return 0, errString("x509: certificate signed by unknown authority")
		})
	if got.Status != CheckStatusSSLFailed {
		t.Errorf("status = %q", got.Status)
	}
	if !containsStr(got.Tags, "ssl-failed") {
		t.Errorf("tags = %v", got.Tags)
	}
}

func TestProbeSourceNetworkConnectError(t *testing.T) {
	got := ProbeSourceNetwork(map[string]any{"bookSourceUrl": "https://example.com"}, 5,
		func(string, int) error { return nil },
		func(string, float64) (int, error) { return 0, errString("connection refused") })
	if got.Status != CheckStatusConnectFail {
		t.Errorf("status = %q", got.Status)
	}
}

func TestProbeSourceNetworkNilFetch(t *testing.T) {
	got := ProbeSourceNetwork(map[string]any{"bookSourceUrl": "https://example.com"}, 5,
		func(string, int) error { return nil }, nil)
	if got.OK {
		t.Error("无 fetch 时应失败")
	}
}

// ---- ValidateSourceRaw ----

func TestValidateSourceRawNotDict(t *testing.T) {
	got := ValidateSourceRaw(nil, 5, nil, nil)
	if got.Status != CheckStatusInvalid {
		t.Errorf("status = %q", got.Status)
	}
}

func TestValidateSourceRawMissingNameOrURL(t *testing.T) {
	got := ValidateSourceRaw(map[string]any{"bookSourceName": "x"}, 5, nil, nil)
	if got.Status != CheckStatusInvalid {
		t.Errorf("status = %q", got.Status)
	}
	if !strings.Contains(got.Message, "bookSourceName") {
		t.Errorf("msg = %q", got.Message)
	}
}

func TestValidateSourceRawJSUnsupported(t *testing.T) {
	got := ValidateSourceRaw(map[string]any{
		"bookSourceName": "x", "bookSourceUrl": "https://example.com",
		"searchUrl": "http://x/@js:foo",
	}, 5, func(string, int) error { return nil },
		func(string, float64) (int, error) { return 200, nil })
	if got.Status != CheckStatusJSSupported {
		t.Errorf("status = %q", got.Status)
	}
}

func TestValidateSourceRawIncomplete(t *testing.T) {
	got := ValidateSourceRaw(map[string]any{
		"bookSourceName": "x", "bookSourceUrl": "https://example.com",
	}, 5, func(string, int) error { return nil },
		func(string, float64) (int, error) { return 200, nil })
	if got.Status != CheckStatusIncomplete {
		t.Errorf("status = %q", got.Status)
	}
	if !strings.Contains(got.Message, "缺少关键规则") {
		t.Errorf("msg = %q", got.Message)
	}
}

func TestValidateSourceRawIncompleteTruncatesList(t *testing.T) {
	got := ValidateSourceRaw(map[string]any{
		"bookSourceName": "x", "bookSourceUrl": "https://example.com",
	}, 5, func(string, int) error { return nil },
		func(string, float64) (int, error) { return 200, nil })
	// 只展示前 4 项。
	parts := strings.Split(strings.TrimPrefix(got.Message, "缺少关键规则："), ", ")
	if len(parts) > IncompleteMissingShown {
		t.Errorf("应最多展示 %d 项，得到 %v", IncompleteMissingShown, parts)
	}
}

func TestValidateSourceRawNetworkFailed(t *testing.T) {
	got := ValidateSourceRaw(map[string]any{
		"bookSourceName": "x", "bookSourceUrl": "https://example.com",
		"searchUrl":    "/s",
		"ruleSearch":   map[string]any{"bookList": "a", "bookUrl": "b"},
		"ruleBookInfo": map[string]any{"name": "c"},
		"ruleToc":      map[string]any{"chapterList": "d", "chapterUrl": "e"},
		"ruleContent":  map[string]any{"content": "f"},
	}, 5, func(string, int) error { return nil },
		func(string, float64) (int, error) { return 0, errString("boom") })
	if got.OK {
		t.Error("网络失败应判为不通过")
	}
}

func TestValidateSourceRawOK(t *testing.T) {
	got := ValidateSourceRaw(map[string]any{
		"bookSourceName": "x", "bookSourceUrl": "https://example.com",
		"searchUrl":    "/s",
		"ruleSearch":   map[string]any{"bookList": "a", "bookUrl": "b"},
		"ruleBookInfo": map[string]any{"name": "c"},
		"ruleToc":      map[string]any{"chapterList": "d", "chapterUrl": "e"},
		"ruleContent":  map[string]any{"content": "f"},
	}, 5, func(string, int) error { return nil },
		func(string, float64) (int, error) { return 200, nil })
	if !got.OK || got.Status != CheckStatusOK {
		t.Errorf("got = %+v", got)
	}
}

// ---- NormalizeSourceIDs ----

func TestNormalizeSourceIDs(t *testing.T) {
	got := NormalizeSourceIDs([]any{1, "2", 2, 0, "x", nil, 3})
	want := []int64{1, 2, 3}
	if len(got) != len(want) {
		t.Fatalf("got = %v, want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("got[%d] = %d, want %d", i, got[i], want[i])
		}
	}
}

func TestNormalizeSourceIDsEmpty(t *testing.T) {
	if got := NormalizeSourceIDs(nil); len(got) != 0 {
		t.Errorf("nil → %v", got)
	}
}

// ---- ApplyCheckResult / ApplyPendingCheck ----

func TestApplyCheckResult(t *testing.T) {
	s := &Source{}
	ApplyCheckResult(s, ProbeResult{OK: true, Status: CheckStatusOK, Message: "ok", Tags: []string{"a"}})
	if s.CheckStatus != CheckStatusOK || !s.LastCheckOK {
		t.Errorf("s = %+v", s)
	}
	if len(s.CheckTags) != 1 || s.CheckTags[0] != "a" {
		t.Errorf("tags = %v", s.CheckTags)
	}
	if s.LastCheckTime == "" {
		t.Error("应记录检测时间")
	}
}

func TestApplyCheckResultTruncatesMessage(t *testing.T) {
	s := &Source{}
	ApplyCheckResult(s, ProbeResult{Message: strings.Repeat("x", 600)})
	if len([]rune(s.CheckMessage)) != CheckMessageMaxLen {
		t.Errorf("长度 = %d", len([]rune(s.CheckMessage)))
	}
}

func TestApplyCheckResultDefaultsStatus(t *testing.T) {
	s := &Source{}
	ApplyCheckResult(s, ProbeResult{})
	if s.CheckStatus != CheckStatusUnknown {
		t.Errorf("status = %q", s.CheckStatus)
	}
}

func TestApplyPendingCheck(t *testing.T) {
	s := &Source{Enabled: false}
	ApplyPendingCheck(s)
	if s.CheckStatus != CheckStatusPending {
		t.Errorf("status = %q", s.CheckStatus)
	}
	if !s.Enabled {
		t.Error("pending 应置为启用")
	}
}

// ---- ExportSourceRaw ----

func TestExportSourceRaw(t *testing.T) {
	s := &Source{Name: "n", URL: "u", Group: "g", SourceType: 1, Enabled: true, Weight: 5,
		Raw: map[string]any{"extra": "keep"}}
	got := ExportSourceRaw(s)
	if got["bookSourceName"] != "n" || got["bookSourceUrl"] != "u" {
		t.Errorf("got = %v", got)
	}
	if got["bookSourceGroup"] != "g" || got["bookSourceType"] != int64(1) {
		t.Errorf("got = %v", got)
	}
	if got["enabled"] != true || got["weight"] != int64(5) {
		t.Errorf("got = %v", got)
	}
	// 原始字段保留。
	if got["extra"] != "keep" {
		t.Errorf("原始字段丢失: %v", got)
	}
}

// ---- 数据库读写 ----

func TestInsertAndGetSource(t *testing.T) {
	db := adminSchema(t)
	id := seedSource(t, db, "源", "https://a.com", true, 3)

	got, err := GetSourceByID(db, id)
	if err != nil {
		t.Fatalf("GetSourceByID: %v", err)
	}
	if got == nil || got.Name != "源" || got.URL != "https://a.com" {
		t.Fatalf("got = %+v", got)
	}
	if !got.Enabled || got.Weight != 3 {
		t.Errorf("got = %+v", got)
	}
}

func TestGetSourceByIDMissing(t *testing.T) {
	db := adminSchema(t)
	got, err := GetSourceByID(db, 999)
	if err != nil {
		t.Fatalf("GetSourceByID: %v", err)
	}
	if got != nil {
		t.Errorf("应返回 nil，得到 %+v", got)
	}
}

func TestGetSourceByURL(t *testing.T) {
	db := adminSchema(t)
	seedSource(t, db, "源", "https://a.com", true, 0)

	got, err := GetSourceByURL(db, "https://a.com")
	if err != nil {
		t.Fatalf("GetSourceByURL: %v", err)
	}
	if got == nil || got.Name != "源" {
		t.Fatalf("got = %+v", got)
	}
	if missing, _ := GetSourceByURL(db, "https://nope.com"); missing != nil {
		t.Errorf("不存在的 URL 应返回 nil")
	}
}

func TestListSourcesOrderedByWeight(t *testing.T) {
	db := adminSchema(t)
	seedSource(t, db, "低", "https://a.com", true, 1)
	seedSource(t, db, "高", "https://b.com", true, 9)

	got, err := ListSources(db)
	if err != nil {
		t.Fatalf("ListSources: %v", err)
	}
	if len(got) != 2 || got[0].Name != "高" {
		t.Errorf("应按权重降序: %+v", got)
	}
}

func TestListSourceIDs(t *testing.T) {
	db := adminSchema(t)
	seedSource(t, db, "a", "https://a.com", true, 0)
	seedSource(t, db, "b", "https://b.com", true, 0)

	got, err := ListSourceIDs(db)
	if err != nil {
		t.Fatalf("ListSourceIDs: %v", err)
	}
	if len(got) != 2 || got[0] >= got[1] {
		t.Errorf("应按 id 升序: %v", got)
	}
}

func TestListSourceGroups(t *testing.T) {
	db := adminSchema(t)
	for _, g := range []string{"乙", "甲", "甲", ""} {
		s := &Source{Name: "n", URL: "https://" + g + ".com", Group: g, Enabled: true}
		if err := InsertSource(db, s); err != nil {
			t.Fatalf("插入失败: %v", err)
		}
	}
	got, err := booksourceListGroups(db)
	if err != nil {
		t.Fatalf("ListSourceGroups: %v", err)
	}
	if len(got) != 2 || got[0] != "乙" || got[1] != "甲" {
		t.Errorf("got = %v", got)
	}
}

func TestUpdateSource(t *testing.T) {
	db := adminSchema(t)
	id := seedSource(t, db, "旧", "https://a.com", true, 0)

	s, _ := GetSourceByID(db, id)
	s.Name = "新"
	s.Enabled = false
	s.Weight = 7
	if err := UpdateSource(db, s); err != nil {
		t.Fatalf("UpdateSource: %v", err)
	}
	got, _ := GetSourceByID(db, id)
	if got.Name != "新" || got.Enabled || got.Weight != 7 {
		t.Errorf("got = %+v", got)
	}
}

func TestDeleteSources(t *testing.T) {
	db := adminSchema(t)
	a := seedSource(t, db, "a", "https://a.com", true, 0)
	b := seedSource(t, db, "b", "https://b.com", true, 0)

	deleted, err := DeleteSources(db, []int64{a, b})
	if err != nil {
		t.Fatalf("DeleteSources: %v", err)
	}
	if deleted != 2 {
		t.Errorf("deleted = %d", deleted)
	}
	if got, _ := ListSources(db); len(got) != 0 {
		t.Errorf("应清空: %+v", got)
	}
}

func TestDeleteSourcesEmpty(t *testing.T) {
	db := adminSchema(t)
	deleted, err := DeleteSources(db, nil)
	if err != nil || deleted != 0 {
		t.Errorf("deleted = %d, err = %v", deleted, err)
	}
}

func TestSetSourcesEnabled(t *testing.T) {
	db := adminSchema(t)
	a := seedSource(t, db, "a", "https://a.com", true, 0)
	b := seedSource(t, db, "b", "https://b.com", true, 0)

	updated, err := SetSourcesEnabled(db, []int64{a, b}, false)
	if err != nil {
		t.Fatalf("SetSourcesEnabled: %v", err)
	}
	if updated != 2 {
		t.Errorf("updated = %d", updated)
	}
	got, _ := GetSourceByID(db, a)
	if got.Enabled {
		t.Error("应已禁用")
	}
}

func TestSetSourcesEnabledEmpty(t *testing.T) {
	db := adminSchema(t)
	updated, err := SetSourcesEnabled(db, nil, true)
	if err != nil || updated != 0 {
		t.Errorf("updated = %d, err = %v", updated, err)
	}
}

// ---- ApplyRaw / NewSourceFromRaw ----

func TestApplyRaw(t *testing.T) {
	s := &Source{}
	s.ApplyRaw(map[string]any{
		"bookSourceName":    " 名 ",
		"bookSourceUrl":     " https://a.com ",
		"bookSourceGroup":   " 组 ",
		"bookSourceType":    1,
		"bookSourceComment": "注释",
		"enabled":           false,
		"weight":            9,
	})
	if s.Name != "名" || s.URL != "https://a.com" || s.Group != "组" {
		t.Errorf("s = %+v", s)
	}
	if s.SourceType != 1 || s.Comment != "注释" || s.Enabled || s.Weight != 9 {
		t.Errorf("s = %+v", s)
	}
}

func TestNewSourceFromRawDefaultsEnabled(t *testing.T) {
	s := NewSourceFromRaw(map[string]any{"bookSourceName": "n", "bookSourceUrl": "u"})
	if !s.Enabled {
		t.Error("未指定 enabled 时应默认启用")
	}
}

// ---- ImportSources ----

func TestImportSourcesAdds(t *testing.T) {
	db := adminSchema(t)
	data := []any{
		map[string]any{"bookSourceName": "a", "bookSourceUrl": "https://a.com"},
		map[string]any{"bookSourceName": "b", "bookSourceUrl": "https://b.com"},
	}
	got, err := ImportSources(db, data)
	if err != nil {
		t.Fatalf("ImportSources: %v", err)
	}
	if got.Added != 2 || got.Skipped != 0 {
		t.Errorf("got = %+v", got)
	}
	if len(got.CheckIDs) != 2 {
		t.Errorf("check_ids = %v", got.CheckIDs)
	}
}

func TestImportSourcesSkipsExistingURL(t *testing.T) {
	db := adminSchema(t)
	seedSource(t, db, "旧", "https://a.com", true, 0)

	got, err := ImportSources(db, []any{
		map[string]any{"bookSourceName": "新", "bookSourceUrl": "https://a.com"},
	})
	if err != nil {
		t.Fatalf("ImportSources: %v", err)
	}
	if got.Skipped != 1 || got.Added != 0 {
		t.Errorf("同 URL 应跳过: %+v", got)
	}
	// 原书源未被覆盖。
	s, _ := GetSourceByURL(db, "https://a.com")
	if s.Name != "旧" {
		t.Errorf("原书源被覆盖: %+v", s)
	}
}

func TestImportSourcesSingleObject(t *testing.T) {
	db := adminSchema(t)
	got, err := ImportSources(db, map[string]any{
		"bookSourceName": "a", "bookSourceUrl": "https://a.com",
	})
	if err != nil {
		t.Fatalf("ImportSources: %v", err)
	}
	if got.Added != 1 {
		t.Errorf("单对象应可导入: %+v", got)
	}
}

func TestImportSourcesRejectsNonList(t *testing.T) {
	db := adminSchema(t)
	if _, err := ImportSources(db, "x"); err == nil {
		t.Fatal("非数组/对象应报错")
	}
}

func TestImportSourcesRecordsFailures(t *testing.T) {
	db := adminSchema(t)
	got, err := ImportSources(db, []any{
		"not a dict",
		map[string]any{"bookSourceName": "no-url"},
		map[string]any{"bookSourceUrl": "https://no-name.com"},
	})
	if err != nil {
		t.Fatalf("ImportSources: %v", err)
	}
	if len(got.Failed) != 3 {
		t.Fatalf("failed = %v", got.Failed)
	}
	if got.Failed[0]["reason"] != "invalid" {
		t.Errorf("reason = %v", got.Failed[0]["reason"])
	}
	if got.Failed[1]["reason"] != "missing_fields" {
		t.Errorf("reason = %v", got.Failed[1]["reason"])
	}
}

func TestImportSourcesDedupesSameURLInBatch(t *testing.T) {
	db := adminSchema(t)
	got, err := ImportSources(db, []any{
		map[string]any{"bookSourceName": "a", "bookSourceUrl": "https://a.com"},
		map[string]any{"bookSourceName": "a2", "bookSourceUrl": "https://a.com"},
	})
	if err != nil {
		t.Fatalf("ImportSources: %v", err)
	}
	if got.Added != 1 || got.Skipped != 1 {
		t.Errorf("同批同 URL 应只加一条: %+v", got)
	}
}

func TestImportSourcesAppliesPendingCheck(t *testing.T) {
	db := adminSchema(t)
	if _, err := ImportSources(db, []any{
		map[string]any{"bookSourceName": "a", "bookSourceUrl": "https://a.com"},
	}); err != nil {
		t.Fatalf("ImportSources: %v", err)
	}
	s, _ := GetSourceByURL(db, "https://a.com")
	if s.CheckStatus != CheckStatusPending {
		t.Errorf("status = %q", s.CheckStatus)
	}
	if !s.Enabled {
		t.Error("导入后应启用")
	}
}

// ---- SourceSummary ----

func TestSourceSummary(t *testing.T) {
	s := &Source{ID: 1, Name: "n", URL: "u", Group: "g", Enabled: true, Weight: 2,
		CheckTags: []string{"a"}}
	got := s.SourceSummary()
	if got["id"] != int64(1) || got["name"] != "n" || got["enabled"] != true {
		t.Errorf("got = %v", got)
	}
	if got["weight"] != int64(2) {
		t.Errorf("weight = %v", got["weight"])
	}
}

// ---- 小工具 ----

func TestAdminString(t *testing.T) {
	cases := []struct {
		value any
		want  string
	}{
		{nil, ""}, {"x", "x"}, {true, "True"}, {false, "False"},
		{float64(3), "3"}, {float64(3.5), "3.5"}, {int(4), "4"}, {int64(5), "5"},
	}
	for _, tc := range cases {
		if got := adminString(tc.value); got != tc.want {
			t.Errorf("adminString(%#v) = %q, want %q", tc.value, got, tc.want)
		}
	}
}

func TestAdminTruthy(t *testing.T) {
	cases := []struct {
		value any
		want  bool
	}{
		{nil, false}, {true, true}, {false, false}, {"", false}, {"x", true},
		{float64(0), false}, {float64(1), true}, {[]any{}, false}, {[]any{1}, true},
		{map[string]any{}, false}, {map[string]any{"a": 1}, true},
	}
	for _, tc := range cases {
		if got := adminTruthy(tc.value); got != tc.want {
			t.Errorf("adminTruthy(%#v) = %v, want %v", tc.value, got, tc.want)
		}
	}
}

func TestAdminToInt64(t *testing.T) {
	cases := []struct {
		value any
		want  int64
	}{
		{float64(3), 3}, {int(4), 4}, {int64(5), 5}, {"6", 6}, {" 7 ", 7},
		{"x", 0}, {nil, 0},
	}
	for _, tc := range cases {
		if got := adminToInt64(tc.value); got != tc.want {
			t.Errorf("adminToInt64(%#v) = %d, want %d", tc.value, got, tc.want)
		}
	}
}

func TestAdminSortedUnique(t *testing.T) {
	got := adminSortedUnique([]string{"b", "a", "b", "c"})
	if len(got) != 3 || got[0] != "a" || got[1] != "b" || got[2] != "c" {
		t.Errorf("got = %v", got)
	}
}

func TestAdminEncodeDecodeList(t *testing.T) {
	encoded := adminEncodeList([]string{"a", "b"})
	got := adminDecodeList(encoded)
	if len(got) != 2 || got[0] != "a" {
		t.Errorf("got = %v", got)
	}
	if adminEncodeList(nil) != "[]" {
		t.Errorf("nil → %q", adminEncodeList(nil))
	}
	if len(adminDecodeList("")) != 0 || len(adminDecodeList("bad")) != 0 {
		t.Error("空/非法应返回空列表")
	}
}

func TestAdminEncodeDecodeMap(t *testing.T) {
	encoded := adminEncodeMap(map[string]any{"a": 1})
	got := adminDecodeMap(encoded)
	if got["a"] != float64(1) {
		t.Errorf("got = %v", got)
	}
	if adminEncodeMap(nil) != "{}" {
		t.Errorf("nil → %q", adminEncodeMap(nil))
	}
	if len(adminDecodeMap("")) != 0 || len(adminDecodeMap("bad")) != 0 {
		t.Error("空/非法应返回空 map")
	}
}

func TestAdminMap(t *testing.T) {
	if got := adminMap(nil); len(got) != 0 {
		t.Errorf("nil → %v", got)
	}
	if got := adminMap(map[string]any{"a": 1}); got["a"] != 1 {
		t.Errorf("got = %v", got)
	}
	if got := adminMap("x"); len(got) != 0 {
		t.Errorf("string → %v", got)
	}
}

func TestIterRuleValues(t *testing.T) {
	out := []string{}
	iterRuleValues(map[string]any{
		"a": "x",
		"b": []any{"y", map[string]any{"c": "z"}},
		"d": 123,
	}, &out)
	if len(out) != 3 {
		t.Errorf("out = %v", out)
	}
}

// ---- 测试辅助 ----

// errString 是一个最小的错误实现。
type errString string

func (e errString) Error() string { return string(e) }

// containsStr 报告切片是否包含目标。
func containsStr(list []string, target string) bool {
	for _, item := range list {
		if item == target {
			return true
		}
	}
	return false
}

// booksourceListGroups 是 ListSourceGroups 的别名，避免与测试内同名变量冲突。
func booksourceListGroups(db *sql.DB) ([]string, error) { return ListSourceGroups(db) }

// 确保 filepath 被引用。
var _ = filepath.Join
