package metabase

import (
	"encoding/json"
	"reflect"
	"sort"
	"testing"

	"talebook/booksvr/internal/plugindomain"
)

// canonical 把 map 序列化成排序后的紧凑 JSON（不转义 HTML 字符）。
func canonical(t *testing.T, v map[string]any) string {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("序列化失败: %v", err)
	}
	var m map[string]any
	if err := json.Unmarshal(b, &m); err != nil {
		t.Fatalf("反序列化失败: %v", err)
	}
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	out := "{"
	for i, k := range keys {
		if i > 0 {
			out += ","
		}
		kb, _ := marshalNoEscape(k)
		vb, _ := marshalNoEscape(m[k])
		out += string(kb) + ":" + string(vb)
	}
	return out + "}"
}

// marshalNoEscape 序列化时不转义 HTML 字符。
func marshalNoEscape(v any) ([]byte, error) {
	var buf []byte
	enc := json.NewEncoder(&sliceWriter{&buf})
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		return nil, err
	}
	// 去掉尾部换行。
	for len(buf) > 0 && (buf[len(buf)-1] == '\n' || buf[len(buf)-1] == '\r') {
		buf = buf[:len(buf)-1]
	}
	return buf, nil
}

// sliceWriter 是一个简单的 []byte 写入器。
type sliceWriter struct{ buf *[]byte }

func (w *sliceWriter) Write(p []byte) (int, error) {
	*w.buf = append(*w.buf, p...)
	return len(p), nil
}

// TestConstants 覆盖常量。
func TestConstants(t *testing.T) {
	if SummaryLimit != 500 {
		t.Errorf("SummaryLimit = %d, want 500", SummaryLimit)
	}
	if CalibreMIKey != "_calibre_mi" {
		t.Errorf("CalibreMIKey = %q", CalibreMIKey)
	}
	want := []string{
		"title", "authors", "author", "author_sort", "publisher", "isbn",
		"comments", "pubdate", "tags", "rating", "series", "language",
		"cover_url", "source", "website", "provider_key", "provider_value",
	}
	if !reflect.DeepEqual(MetadataFields, want) {
		t.Errorf("MetadataFields = %v", MetadataFields)
	}
}

// TestFirstVectors 用 Python 实测向量校验 _first。
func TestFirstVectors(t *testing.T) {
	cases := []struct {
		in   any
		want any
	}{
		{nil, "DEF"}, {"", "DEF"}, {[]any{}, "DEF"}, {map[string]any{}, "DEF"},
		{"x", "x"}, {[]any{1, 2}, 1}, {0, 0}, {false, false},
	}
	for _, c := range cases {
		if got := First(c.in, "DEF"); got != c.want {
			t.Errorf("First(%v) = %v, want %v", c.in, got, c.want)
		}
	}
	// []string 也支持。
	if got := First([]string{"a", "b"}, "DEF"); got != "a" {
		t.Errorf("[]string 得到 %v", got)
	}
	if got := First([]string{}, "DEF"); got != "DEF" {
		t.Errorf("空 []string 得到 %v", got)
	}
}

// TestSummaryVectors 用 Python 实测向量校验 _summary。
func TestSummaryVectors(t *testing.T) {
	cases := []struct {
		in   any
		want string
	}{
		{nil, ""}, {"", ""},
		{"  a   b\n c  ", "a b c"},
		{123, "123"},
	}
	for _, c := range cases {
		if got := Summary(c.in); got != c.want {
			t.Errorf("Summary(%v) = %q, want %q", c.in, got, c.want)
		}
	}
	// 截断到 500。
	long := make([]byte, 600)
	for i := range long {
		long[i] = 'z'
	}
	if got := Summary(string(long)); len(got) != 500 {
		t.Errorf("截断长度 = %d, want 500", len(got))
	}
}

// TestBuildFieldDecisionsVectors 用 Python 实测向量校验 build_field_decisions。
func TestBuildFieldDecisionsVectors(t *testing.T) {
	current := map[string]any{"title": "三体", "author": "", "publisher": "X", "tags": []any{"a"}}
	candidate := map[string]any{
		"title": "三体", "author": "刘慈欣", "publisher": "Y",
		"tags": []any{"a"}, "empty": nil, "blank": "",
	}
	got := BuildFieldDecisions(current, candidate, []string{"publisher"})

	want := []FieldDecision{
		{Field: "author", Current: "", Candidate: "刘慈欣", Decision: DecisionFillEmpty, Locked: false, WillApply: true},
		{Field: "publisher", Current: "X", Candidate: "Y", Decision: DecisionLocked, Locked: true, WillApply: false},
		{Field: "tags", Current: []any{"a"}, Candidate: []any{"a"}, Decision: DecisionUnchanged, Locked: false, WillApply: false},
		{Field: "title", Current: "三体", Candidate: "三体", Decision: DecisionUnchanged, Locked: false, WillApply: false},
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("得到 %+v\n期望 %+v", got, want)
	}
}

// TestBuildFieldDecisionsCandidate 冲突时标记 candidate。
func TestBuildFieldDecisionsCandidate(t *testing.T) {
	got := BuildFieldDecisions(
		map[string]any{"title": "旧"},
		map[string]any{"title": "新"}, nil)
	if len(got) != 1 || got[0].Decision != DecisionCandidate || got[0].WillApply {
		t.Errorf("得到 %+v", got)
	}
}

// TestBuildFieldDecisionsSkipsEmpty 空候选值被跳过。
func TestBuildFieldDecisionsSkipsEmpty(t *testing.T) {
	got := BuildFieldDecisions(map[string]any{}, map[string]any{
		"a": nil, "b": "", "c": []any{}, "d": map[string]any{},
	}, nil)
	if len(got) != 0 {
		t.Errorf("空值应被跳过，得到 %+v", got)
	}
}

// TestBuildFieldDecisionsNilCurrent nil current 视为空。
func TestBuildFieldDecisionsNilCurrent(t *testing.T) {
	got := BuildFieldDecisions(nil, map[string]any{"title": "三体"}, nil)
	if len(got) != 1 || got[0].Decision != DecisionFillEmpty {
		t.Errorf("得到 %+v", got)
	}
	if got[0].Current != nil {
		t.Errorf("current = %v, want nil", got[0].Current)
	}
}

// TestBuildFieldDecisionsNilCandidate nil candidate 返回空切片。
//
// Python 会抛 TypeError；Go 侧返回空切片（已在文档注释中记录）。
func TestBuildFieldDecisionsNilCandidate(t *testing.T) {
	if got := BuildFieldDecisions(nil, nil, nil); len(got) != 0 {
		t.Errorf("得到 %+v, want 空", got)
	}
}

// TestBuildFieldDecisionsSorted 字段按字典序输出。
func TestBuildFieldDecisionsSorted(t *testing.T) {
	got := BuildFieldDecisions(map[string]any{}, map[string]any{
		"z": 1, "a": 1, "m": 1,
	}, nil)
	fields := make([]string, 0, len(got))
	for _, d := range got {
		fields = append(fields, d.Field)
	}
	if !reflect.DeepEqual(fields, []string{"a", "m", "z"}) {
		t.Errorf("字段顺序 = %v, want [a m z]", fields)
	}
}

// TestMetaManifestVectors 用 Python 实测向量校验 meta_manifest。
func TestMetaManifestVectors(t *testing.T) {
	got := MetaManifest("talebook.meta.demo", "Demo", "d", "mdi-x", "http://h", ManifestOptions{})
	want := `{"actions":["test","preview","run","retry","rollback"],` +
		`"auth_schema":{"properties":{},"type":"object"},` +
		`"capabilities":["metadata.lookup"],"categories":["metadata"],` +
		`"compatibility":{"talebook":">=0.1.0"},` +
		`"config_schema":{"properties":{},"type":"object"},` +
		`"connection_owners":["instance"],` +
		`"data_policy":{"retention":"rating_summary_and_source_link","stores_full_text":false},` +
		`"description":"d","homepage":"http://h","id":"talebook.meta.demo",` +
		`"license":"GPL-3.0","name":"Demo","permissions":["books.read"],` +
		`"protocol_version":"talebook.plugin/v1","runtime_kind":"builtin",` +
		`"ui":{"configuration_mode":"none","icon":"mdi-x","primary_action":"details"},` +
		`"version":"1.0.0"}`
	if c := canonical(t, got); c != want {
		t.Errorf("得到 %s\n期望 %s", c, want)
	}

	got2 := MetaManifest("talebook.meta.demo", "Demo", "d", "mdi-x", "http://h", ManifestOptions{
		ConfigurationMode: "form", BrandIcon: "ico", Deprecated: true,
	})
	want2 := `{"actions":["test","preview","run","retry","rollback"],` +
		`"auth_schema":{"properties":{},"type":"object"},` +
		`"capabilities":["metadata.lookup"],"categories":["metadata"],` +
		`"compatibility":{"talebook":">=0.1.0"},` +
		`"config_schema":{"properties":{},"type":"object"},` +
		`"connection_owners":["instance"],` +
		`"data_policy":{"retention":"rating_summary_and_source_link","stores_full_text":false},` +
		`"description":"d","homepage":"http://h","id":"talebook.meta.demo",` +
		`"license":"GPL-3.0","name":"Demo","permissions":["books.read"],` +
		`"protocol_version":"talebook.plugin/v1","runtime_kind":"builtin",` +
		`"ui":{"brand_icon":"ico","configuration_mode":"form","deprecated":true,` +
		`"icon":"mdi-x","primary_action":"configure"},"version":"1.0.0"}`
	if c := canonical(t, got2); c != want2 {
		t.Errorf("得到 %s\n期望 %s", c, want2)
	}
}

// TestManifestVectors 用 Python 实测向量校验 _manifest。
func TestManifestVectors(t *testing.T) {
	got := Manifest("p", "n", "d", []string{"metadata"}, []string{"metadata.lookup"},
		map[string]any{"type": "object", "properties": map[string]any{}},
		map[string]any{"type": "object", "properties": map[string]any{}},
		[]string{"books.read"}, "mdi-x", "http://h", nil)
	owners, _ := got["connection_owners"].([]any)
	if len(owners) != 1 || owners[0] != "instance" {
		t.Errorf("connection_owners = %v, want [instance]", owners)
	}
	dp, _ := got["data_policy"].(map[string]any)
	if dp["retention"] != "rating_summary_and_source_link" {
		t.Errorf("retention = %v", dp["retention"])
	}
	if got["runtime_kind"] != "builtin" {
		t.Errorf("runtime_kind = %v", got["runtime_kind"])
	}
}

// TestToBookMetadataVectors 用 Python 实测向量校验 to_book_metadata。
func TestToBookMetadataVectors(t *testing.T) {
	mi := map[string]any{
		"title": "三体", "authors": []any{"刘慈欣"}, "author": "刘慈欣",
		"author_sort": "刘慈欣", "publisher": "P", "isbn": "978",
		"comments": "c", "pubdate": "2026", "tags": []any{"t"},
		"rating": float64(8), "series": "S", "language": "zh",
		"cover_url": "http://c", "source": "s", "website": "http://w",
		"provider_key": "", "provider_value": "v",
	}
	rec := ToBookMetadata(mi, "pk")
	values := rec.ToDict()

	// provider_key 为空时由参数补上。
	if values["provider_key"] != "pk" {
		t.Errorf("provider_key = %v, want pk", values["provider_key"])
	}
	if values["title"] != "三体" || values["isbn"] != "978" {
		t.Errorf("字段错误: %v", values)
	}
	// 原对象随记录携带。
	if values[CalibreMIKey] == nil {
		t.Error("应携带 calibre Metadata 原对象")
	}
	// 17 个字段 + 1 个 mi key。
	if len(values) != len(MetadataFields)+1 {
		t.Errorf("字段数 = %d, want %d", len(values), len(MetadataFields)+1)
	}
}

// TestToBookMetadataExistingProviderKey 已有 provider_key 时不覆盖。
func TestToBookMetadataExistingProviderKey(t *testing.T) {
	rec := ToBookMetadata(map[string]any{"provider_key": "keep"}, "pk")
	if rec.GetString("provider_key") != "keep" {
		t.Errorf("provider_key = %q, want keep", rec.GetString("provider_key"))
	}
}

// TestToBookMetadataNil nil 输入返回空记录。
func TestToBookMetadataNil(t *testing.T) {
	rec := ToBookMetadata(nil, "pk")
	if rec.Len() != 0 {
		t.Errorf("得到 %+v, want 空", rec)
	}
}

// TestToCalibreMetadata 覆盖取回原对象。
func TestToCalibreMetadata(t *testing.T) {
	mi := map[string]any{"title": "三体"}
	rec := ToBookMetadata(mi, "pk")
	got := ToCalibreMetadata(rec.ToDict())
	if got == nil || got["title"] != "三体" {
		t.Errorf("得到 %v", got)
	}
	if ToCalibreMetadata(nil) != nil {
		t.Error("nil 应返回 nil")
	}
	if ToCalibreMetadata(map[string]any{}) != nil {
		t.Error("无 mi key 应返回 nil")
	}
}

// fakeMetaSource 是测试用的元数据源。
type fakeMetaSource struct {
	manifest  map[string]any
	results   []map[string]any
	fetch     map[string]any
	searchErr error
	fetchErr  error
	lastQuery plugindomain.MetadataQuery
}

func (f *fakeMetaSource) Manifest() map[string]any { return f.manifest }
func (f *fakeMetaSource) Search(q plugindomain.MetadataQuery, ctx map[string]any) ([]map[string]any, error) {
	f.lastQuery = q
	return f.results, f.searchErr
}
func (f *fakeMetaSource) Fetch(id string, ctx map[string]any) (map[string]any, error) {
	return f.fetch, f.fetchErr
}

// newFakeSource 构造一个测试源。
func newFakeSource() *fakeMetaSource {
	return &fakeMetaSource{
		manifest: map[string]any{"id": "talebook.meta.demo", "name": "Demo"},
		results:  []map[string]any{{"title": "三体"}},
		fetch:    map[string]any{"title": "球状闪电"},
	}
}

// TestSearchBooks 覆盖 search_books。
func TestSearchBooks(t *testing.T) {
	src := newFakeSource()
	m := NewMetaSourceMixin(src)

	got, err := m.SearchBooks("三体", map[string]any{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("条目数 = %d, want 1", len(got))
	}
	if got[0].GetString("provider_key") != "talebook.meta.demo" {
		t.Errorf("provider_key = %q", got[0].GetString("provider_key"))
	}
	if src.lastQuery.Title != "三体" {
		t.Errorf("query = %+v", src.lastQuery)
	}
}

// TestSearchBooksEmptyQuery 空查询返回 nil 且不调用源。
func TestSearchBooksEmptyQuery(t *testing.T) {
	src := newFakeSource()
	m := NewMetaSourceMixin(src)
	got, err := m.SearchBooks("", map[string]any{})
	if err != nil || got != nil {
		t.Errorf("得到 (%v,%v), want (nil,nil)", got, err)
	}
	if src.lastQuery.Title != "" {
		t.Error("空查询不应调用源")
	}
}

// TestSearchBooksError 源报错时透传。
func TestSearchBooksError(t *testing.T) {
	src := newFakeSource()
	src.searchErr = errTest
	m := NewMetaSourceMixin(src)
	if _, err := m.SearchBooks("x", map[string]any{}); err != errTest {
		t.Errorf("得到 %v, want errTest", err)
	}
}

// TestSearchBooksSkipsNil 源返回 nil 条目时跳过。
func TestSearchBooksSkipsNil(t *testing.T) {
	src := newFakeSource()
	src.results = []map[string]any{nil, {"title": "OK"}}
	m := NewMetaSourceMixin(src)
	got, err := m.SearchBooks("x", map[string]any{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(got) != 1 {
		t.Errorf("条目数 = %d, want 1", len(got))
	}
}

// TestGetMetadata 覆盖 get_metadata。
func TestGetMetadata(t *testing.T) {
	src := newFakeSource()
	m := NewMetaSourceMixin(src)
	got, err := m.GetMetadata("e1", map[string]any{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got == nil || got.GetString("title") != "球状闪电" {
		t.Errorf("得到 %v", got)
	}
	if got.GetString("provider_key") != "talebook.meta.demo" {
		t.Errorf("provider_key = %q", got.GetString("provider_key"))
	}
}

// TestGetMetadataEmptyID 空 ID 返回 nil。
func TestGetMetadataEmptyID(t *testing.T) {
	m := NewMetaSourceMixin(newFakeSource())
	got, err := m.GetMetadata("", map[string]any{})
	if err != nil || got != nil {
		t.Errorf("得到 (%v,%v), want (nil,nil)", got, err)
	}
}

// TestGetMetadataNotFound 源返回 nil 时返回 nil。
func TestGetMetadataNotFound(t *testing.T) {
	src := newFakeSource()
	src.fetch = nil
	m := NewMetaSourceMixin(src)
	got, err := m.GetMetadata("e1", map[string]any{})
	if err != nil || got != nil {
		t.Errorf("得到 (%v,%v), want (nil,nil)", got, err)
	}
}

// TestGetMetadataError 源报错时透传。
func TestGetMetadataError(t *testing.T) {
	src := newFakeSource()
	src.fetchErr = errTest
	m := NewMetaSourceMixin(src)
	if _, err := m.GetMetadata("e1", map[string]any{}); err != errTest {
		t.Errorf("得到 %v, want errTest", err)
	}
}

// TestSelfCheck 覆盖 self_check。
func TestSelfCheck(t *testing.T) {
	m := NewMetaSourceMixin(newFakeSource())
	report, err := m.SelfCheck(map[string]any{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if !report.Healthy || report.Message != "Demo ready" {
		t.Errorf("得到 %+v", report)
	}
}

// TestInitialEnabled 覆盖 initial_enabled。
func TestInitialEnabled(t *testing.T) {
	// 默认开启。
	m := NewMetaSourceMixin(newFakeSource())
	if !m.InitialEnabled(nil) {
		t.Error("默认应开启")
	}

	// 显式关闭默认值且无旧来源选择 → 关闭。
	m2 := &MetaSourceMixin{Source: newFakeSource(), DefaultEnabled: false}
	if m2.InitialEnabled(nil) {
		t.Error("无旧来源选择时应关闭")
	}

	// 显式关闭默认值但有旧来源选择 → 开启。
	m3 := &MetaSourceMixin{
		Source: newFakeSource(), DefaultEnabled: false,
		LegacySources: []string{"legacy_a"},
	}
	if !m3.InitialEnabled(map[string]any{"META_SELECTED_SOURCES": []any{"legacy_a"}}) {
		t.Error("命中旧来源时应开启")
	}
	if m3.InitialEnabled(map[string]any{"META_SELECTED_SOURCES": []any{"other"}}) {
		t.Error("未命中旧来源时应关闭")
	}
}

// TestInitialConfig 覆盖 initial_config。
func TestInitialConfig(t *testing.T) {
	m := NewMetaSourceMixin(newFakeSource())
	if got := m.InitialConfig(nil); len(got) != 0 {
		t.Errorf("得到 %v, want 空", got)
	}
}

// TestSetting 覆盖配置双读。
func TestSetting(t *testing.T) {
	lookup := func(key string) any {
		if key == "CONF_KEY" {
			return "from-conf"
		}
		return nil
	}

	// connection 优先。
	if got := Setting(map[string]any{"k": "from-config"}, "k", "CONF_KEY", "def", lookup); got != "from-config" {
		t.Errorf("得到 %v, want from-config", got)
	}
	// 回落 CONF。
	if got := Setting(map[string]any{}, "k", "CONF_KEY", "def", lookup); got != "from-conf" {
		t.Errorf("得到 %v, want from-conf", got)
	}
	// 都缺失 → 默认值。
	if got := Setting(map[string]any{}, "k", "MISSING", "def", lookup); got != "def" {
		t.Errorf("得到 %v, want def", got)
	}
	// 空字符串视为缺失。
	if got := Setting(map[string]any{"k": ""}, "k", "CONF_KEY", "def", lookup); got != "from-conf" {
		t.Errorf("空值应回落，得到 %v", got)
	}
	// 无 lookup。
	if got := Setting(map[string]any{}, "k", "CONF_KEY", "def", nil); got != "def" {
		t.Errorf("得到 %v, want def", got)
	}
}

// TestIsEmptyValue 覆盖空值判定。
func TestIsEmptyValue(t *testing.T) {
	empties := []any{nil, "", []any{}, []string{}, map[string]any{}}
	for _, v := range empties {
		if !isEmptyValue(v) {
			t.Errorf("%v 应为空", v)
		}
	}
	nonEmpties := []any{"x", []any{1}, map[string]any{"a": 1}, 0, false}
	for _, v := range nonEmpties {
		if isEmptyValue(v) {
			t.Errorf("%v 不应为空", v)
		}
	}
}

// TestDeepEqual 覆盖深比较。
func TestDeepEqual(t *testing.T) {
	if !deepEqual([]any{1, "a"}, []any{1, "a"}) {
		t.Error("相同切片应相等")
	}
	if deepEqual([]any{1}, []any{1, 2}) {
		t.Error("长度不同不应相等")
	}
	if !deepEqual(map[string]any{"a": 1}, map[string]any{"a": 1}) {
		t.Error("相同 map 应相等")
	}
	if deepEqual(map[string]any{"a": 1}, map[string]any{"a": 2}) {
		t.Error("值不同不应相等")
	}
	if deepEqual(map[string]any{"a": 1}, map[string]any{"b": 1}) {
		t.Error("键不同不应相等")
	}
	if !deepEqual("x", "x") || deepEqual("x", "y") {
		t.Error("标量比较错误")
	}
}

// TestDeepEqualNested 覆盖嵌套结构的深比较。
func TestDeepEqualNested(t *testing.T) {
	// 嵌套切片。
	if !deepEqual([]any{[]any{1, 2}}, []any{[]any{1, 2}}) {
		t.Error("相同嵌套切片应相等")
	}
	if deepEqual([]any{[]any{1}}, []any{[]any{2}}) {
		t.Error("不同嵌套切片不应相等")
	}
	// 嵌套 map。
	if !deepEqual(map[string]any{"a": map[string]any{"b": 1}}, map[string]any{"a": map[string]any{"b": 1}}) {
		t.Error("相同嵌套 map 应相等")
	}
	if deepEqual(map[string]any{"a": map[string]any{"b": 1}}, map[string]any{"a": map[string]any{"b": 2}}) {
		t.Error("不同嵌套 map 不应相等")
	}
	// 嵌套 map 缺键。
	if deepEqual(map[string]any{"a": map[string]any{"b": 1}}, map[string]any{"a": map[string]any{}}) {
		t.Error("嵌套缺键不应相等")
	}
	// 类型不匹配。
	if deepEqual([]any{1}, map[string]any{"a": 1}) {
		t.Error("切片与 map 不应相等")
	}
	if deepEqual(map[string]any{"a": 1}, []any{1}) {
		t.Error("map 与切片不应相等")
	}
}

// TestValuesEqual 覆盖空值等价。
func TestValuesEqual(t *testing.T) {
	if !valuesEqual(nil, "") {
		t.Error("nil 与空串应视为相等")
	}
	if !valuesEqual([]any{}, map[string]any{}) {
		t.Error("空切片与空 map 应视为相等")
	}
	if valuesEqual("a", "b") {
		t.Error("不同值不应相等")
	}
}

// TestAsString 覆盖字符串转换。
func TestAsString(t *testing.T) {
	cases := []struct {
		in   any
		want string
	}{
		{nil, ""}, {"x", "x"}, {true, "True"}, {false, "False"},
		{float64(3), "3"}, {float64(3.5), "3.5"}, {int(7), "7"}, {int64(8), "8"},
		{[]any{1}, ""},
	}
	for _, c := range cases {
		if got := asString(c.in); got != c.want {
			t.Errorf("asString(%v) = %q, want %q", c.in, got, c.want)
		}
	}
}

// TestAsStringSlice 覆盖切片转换。
func TestAsStringSlice(t *testing.T) {
	if got := asStringSlice(nil); got != nil {
		t.Errorf("nil 得到 %v", got)
	}
	if got := asStringSlice([]string{"a"}); len(got) != 1 {
		t.Errorf("[]string 得到 %v", got)
	}
	if got := asStringSlice([]any{"a", "b"}); len(got) != 2 {
		t.Errorf("[]any 得到 %v", got)
	}
	if got := asStringSlice("solo"); len(got) != 1 || got[0] != "solo" {
		t.Errorf("字符串得到 %v", got)
	}
	if got := asStringSlice(42); got != nil {
		t.Errorf("非法得到 %v", got)
	}
}

// TestToAnySlice 覆盖 []any 转换。
func TestToAnySlice(t *testing.T) {
	got := toAnySlice([]string{"a", "b"})
	if len(got) != 2 || got[0] != "a" {
		t.Errorf("得到 %v", got)
	}
	if got := toAnySlice(nil); len(got) != 0 {
		t.Errorf("nil 得到 %v", got)
	}
}

// TestItoaAndTrimFloat 覆盖数值转换辅助。
func TestItoaAndTrimFloat(t *testing.T) {
	if itoa(42) != "42" {
		t.Errorf("itoa = %q", itoa(42))
	}
	if trimFloat(3.5) != "3.5" {
		t.Errorf("trimFloat = %q", trimFloat(3.5))
	}
}
