package plugindomain

import (
	"encoding/json"
	"sort"
	"testing"
)

// dump 把 map 序列化成排序后的 JSON，便于逐字节比对。
func dump(t *testing.T, v map[string]any) string {
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
		kb, _ := json.Marshal(k)
		vb, _ := json.Marshal(m[k])
		out += string(kb) + ":" + string(vb)
	}
	return out + "}"
}

// TestSourceBookToDict 对齐 Python 的 SourceBook.to_dict。
//
// 期望值来自 Python 实测：
//
//	SourceBook.from_dict({"external_id":"e1","title":"三体","authors":["刘慈欣"],"weird":123})
func TestSourceBookToDict(t *testing.T) {
	sb := SourceBookFromDict(map[string]any{
		"external_id": "e1", "title": "三体", "authors": []any{"刘慈欣"}, "weird": float64(123),
	})
	want := `{"access":"external_link","acquisition_url":"","author":"刘慈欣","authors":["刘慈欣"],` +
		`"book_url":"e1","categories":[],"content_hash":"","cover_url":"","description":"",` +
		`"external_id":"e1","format":"","isbn":"","license":"","name":"三体","remote_etag":"",` +
		`"review_status":"pending","source":"","source_url":"","target_library":"main",` +
		`"title":"三体","updated_at":"","weird":123}`
	if got := dump(t, sb.ToDict()); got != want {
		t.Errorf("得到 %s\n期望 %s", got, want)
	}
}

// TestSourceBookToDictExplicitName 显式 name 时 setdefault 不覆盖，
// 但 author 仍按（空的）authors 计算。
func TestSourceBookToDictExplicitName(t *testing.T) {
	sb := SourceBookFromDict(map[string]any{
		"external_id": "e1", "title": "三体", "name": "自定义",
	})
	want := `{"access":"external_link","acquisition_url":"","author":"","authors":[],` +
		`"book_url":"e1","categories":[],"content_hash":"","cover_url":"","description":"",` +
		`"external_id":"e1","format":"","isbn":"","license":"","name":"自定义","remote_etag":"",` +
		`"review_status":"pending","source":"","source_url":"","target_library":"main",` +
		`"title":"三体","updated_at":""}`
	if got := dump(t, sb.ToDict()); got != want {
		t.Errorf("得到 %s\n期望 %s", got, want)
	}
}

// TestSourceBookFromDictAllFields 覆盖全部具名字段映射。
func TestSourceBookFromDictAllFields(t *testing.T) {
	sb := SourceBookFromDict(map[string]any{
		"external_id": "e1", "title": "三体", "authors": []any{"刘慈欣"},
		"isbn": "978", "format": "epub", "source": "legado",
		"source_url": "http://s", "acquisition_url": "http://a",
		"access": "download", "license": "CC", "target_library": "sub",
		"review_status": "approved", "content_hash": "h", "remote_etag": "et",
		"updated_at": "2026", "description": "desc", "cover_url": "http://c",
		"categories": []any{"科幻"},
	})
	if sb.ExternalID != "e1" || sb.Title != "三体" || len(sb.Authors) != 1 {
		t.Errorf("基本字段错误: %+v", sb)
	}
	if sb.ISBN != "978" || sb.Format != "epub" || sb.Source != "legado" {
		t.Errorf("标识字段错误: %+v", sb)
	}
	if sb.SourceURL != "http://s" || sb.AcquisitionURL != "http://a" {
		t.Errorf("URL 字段错误: %+v", sb)
	}
	if sb.Access != "download" || sb.License != "CC" || sb.TargetLibrary != "sub" {
		t.Errorf("访问字段错误: %+v", sb)
	}
	if sb.ReviewStatus != "approved" || sb.ContentHash != "h" || sb.RemoteETag != "et" {
		t.Errorf("状态字段错误: %+v", sb)
	}
	if sb.UpdatedAt != "2026" || sb.Description != "desc" || sb.CoverURL != "http://c" {
		t.Errorf("描述字段错误: %+v", sb)
	}
	if len(sb.Categories) != 1 || sb.Categories[0] != "科幻" {
		t.Errorf("categories 错误: %+v", sb.Categories)
	}
	if len(sb.Extra) != 0 {
		t.Errorf("extra 应为空，得到 %+v", sb.Extra)
	}
}

// TestSourceBookFromDictDefaults 空输入时使用默认值。
func TestSourceBookFromDictDefaults(t *testing.T) {
	sb := SourceBookFromDict(map[string]any{})
	if sb.Access != "external_link" {
		t.Errorf("access = %q, want external_link", sb.Access)
	}
	if sb.TargetLibrary != "main" {
		t.Errorf("target_library = %q, want main", sb.TargetLibrary)
	}
	if sb.ReviewStatus != "pending" {
		t.Errorf("review_status = %q, want pending", sb.ReviewStatus)
	}
}

// TestSourceBookDetailToDictExtra extra 覆盖同名字段。
func TestSourceBookDetailToDictExtra(t *testing.T) {
	d := SourceBookDetail{
		ExternalID: "e", Title: "t", Authors: []string{"a"},
		Extra: map[string]any{"name": "覆盖", "custom": "v"},
	}
	got := d.ToDict()
	if got["name"] != "覆盖" {
		t.Errorf("name = %v, want 覆盖", got["name"])
	}
	if got["custom"] != "v" {
		t.Errorf("custom = %v, want v", got["custom"])
	}
}

// TestSourceChapterToDictExtra extra 覆盖同名字段。
func TestSourceChapterToDictExtra(t *testing.T) {
	c := SourceChapter{ExternalID: "e", Title: "t", Extra: map[string]any{"name": "覆盖"}}
	if got := c.ToDict(); got["name"] != "覆盖" {
		t.Errorf("name = %v, want 覆盖", got["name"])
	}
}

// TestSourceContentToDictExtra extra 覆盖同名字段。
func TestSourceContentToDictExtra(t *testing.T) {
	c := SourceContent{Title: "t", Content: "c", Extra: map[string]any{"title": "覆盖"}}
	if got := c.ToDict(); got["title"] != "覆盖" {
		t.Errorf("title = %v, want 覆盖", got["title"])
	}
}

// TestSourceBookToDictExtra 覆盖 name/author/book_url 三个兼容别名。
func TestSourceBookToDictExtra(t *testing.T) {
	sb := SourceBook{ExternalID: "e", Title: "t", Authors: []string{"a"}}
	got := sb.ToDict()
	if got["name"] != "t" || got["author"] != "a" || got["book_url"] != "e" {
		t.Errorf("兼容别名错误: name=%v author=%v book_url=%v", got["name"], got["author"], got["book_url"])
	}

	// 无作者时 author 为空串。
	sb2 := SourceBook{ExternalID: "e", Title: "t"}
	if got2 := sb2.ToDict(); got2["author"] != "" {
		t.Errorf("无作者时 author = %v, want 空串", got2["author"])
	}
}

// TestNewDomainRecordNil 传入 nil 时构造空 map。
func TestNewDomainRecordNil(t *testing.T) {
	rec := NewDomainRecord(nil)
	if rec.Values == nil || rec.Len() != 0 {
		t.Errorf("得到 %+v, want 空 map", rec)
	}
}

// TestDomainRecordFromDictSameType 传入同类记录时原样返回。
func TestDomainRecordFromDictSameType(t *testing.T) {
	rec := NewDomainRecord(map[string]any{"a": 1})
	got, err := rec.FromDict(rec)
	if err != nil || got.Get("a") != 1 {
		t.Errorf("得到 (%v,%v)", got, err)
	}
}

// TestMetadataQueryFromValueTyped 传入已构造的 MetadataQuery 时原样返回。
func TestMetadataQueryFromValueTyped(t *testing.T) {
	q := MetadataQuery{Title: "x"}
	if got := MetadataQueryFromValue(q); got.Title != "x" {
		t.Errorf("得到 %+v", got)
	}
}

// TestSourceBookDetailToDict 对齐 Python 的 SourceBookDetail.to_dict。
func TestSourceBookDetailToDict(t *testing.T) {
	d := SourceBookDetail{ExternalID: "e2", Title: "球状闪电", Authors: []string{"刘慈欣"}}
	want := `{"acquisition_url":"","author":"刘慈欣","authors":["刘慈欣"],"book_url":"e2",` +
		`"categories":[],"cover_url":"","description":"","downloadable":false,"external_id":"e2",` +
		`"format":"","intro":"","last_chapter":"","name":"球状闪电","source":"","source_url":"",` +
		`"title":"球状闪电","toc_ref":"","toc_url":"","word_count":""}`
	if got := dump(t, d.ToDict()); got != want {
		t.Errorf("得到 %s\n期望 %s", got, want)
	}
}

// TestSourceChapterToDict 对齐 Python 的 SourceChapter.to_dict。
func TestSourceChapterToDict(t *testing.T) {
	c := SourceChapter{ExternalID: "c1", Title: "第一章", Extra: map[string]any{"url": "http://x"}}
	want := `{"external_id":"c1","is_vip":false,"name":"第一章","title":"第一章","updated_at":"","url":"http://x"}`
	if got := dump(t, c.ToDict()); got != want {
		t.Errorf("得到 %s\n期望 %s", got, want)
	}
}

// TestSourceContentToDict 对齐 Python 的 SourceContent.to_dict。
func TestSourceContentToDict(t *testing.T) {
	c := SourceContent{Title: "t", Content: "body"}
	if got := dump(t, c.ToDict()); got != `{"content":"body","title":"t"}` {
		t.Errorf("得到 %s", got)
	}
}

// TestCategoryToDict 对齐 Python 的 Category.to_dict。
func TestCategoryToDict(t *testing.T) {
	c := Category{ID: "1", Name: "玄幻"}
	if got := dump(t, c.ToDict()); got != `{"id":"1","name":"玄幻"}` {
		t.Errorf("得到 %s", got)
	}
}

// TestMetadataQueryFromValue 对齐 Python 的 MetadataQuery.from_value。
func TestMetadataQueryFromValue(t *testing.T) {
	if got := MetadataQueryFromValue("三体"); got.Title != "三体" || len(got.Authors) != 0 {
		t.Errorf("裸字符串得到 %+v", got)
	}
	got := MetadataQueryFromValue(map[string]any{
		"title": "三体", "isbn": "978", "authors": []any{"a"},
	})
	if got.Title != "三体" || got.ISBN != "978" || len(got.Authors) != 1 || got.Authors[0] != "a" {
		t.Errorf("mapping 得到 %+v", got)
	}
	if !MetadataQueryFromValue(nil).IsEmpty() {
		t.Error("nil 应为空")
	}
	if MetadataQueryFromValue("x").IsEmpty() {
		t.Error("有 title 不应为空")
	}
}

// TestReviewFromRating 对齐 Python 的 Review.from_rating。
//
// 摘要先折叠空白再截断到 500。
func TestReviewFromRating(t *testing.T) {
	r := ReviewFromRating("douban", "x1", 8.5, 10, ReviewOptions{Summary: "  a   b\n c  "})
	want := `{"book_id":null,"domain_id":"","external_id":"x1",` +
		`"rating":{"sample_count":null,"scale":10,"value":8.5},"review_kind":"rating",` +
		`"series_id":"","source":"douban","source_time":"","source_url":"","summary":"a b c"}`
	if got := dump(t, r.ToDict()); got != want {
		t.Errorf("得到 %s\n期望 %s", got, want)
	}

	long := ReviewFromRating("douban", "x2", 9, 10, ReviewOptions{Summary: repeat("z", 600)})
	if n := len(long.GetString("summary")); n != 500 {
		t.Errorf("摘要长度 = %d, want 500", n)
	}
}

// TestReviewFromRatingExtra extra 覆盖同名字段。
func TestReviewFromRatingExtra(t *testing.T) {
	r := ReviewFromRating("s", "e", 1, 5, ReviewOptions{
		ReviewKind: "comment",
		Extra:      map[string]any{"summary": "覆盖", "custom": "v"},
	})
	if r.GetString("summary") != "覆盖" {
		t.Errorf("summary = %q, want 覆盖", r.GetString("summary"))
	}
	if r.GetString("custom") != "v" {
		t.Errorf("custom = %q, want v", r.GetString("custom"))
	}
}

// TestTruncateSummary 覆盖空白折叠与截断。
func TestTruncateSummary(t *testing.T) {
	cases := map[string]string{
		"":         "",
		"a":        "a",
		"  a  b  ": "a b",
		"a\n\tb":   "a b",
		"   ":      "",
	}
	for in, want := range cases {
		if got := truncateSummary(in, 500); got != want {
			t.Errorf("truncateSummary(%q) = %q, want %q", in, got, want)
		}
	}
	if got := truncateSummary("abcdef", 3); got != "abc" {
		t.Errorf("截断得到 %q, want abc", got)
	}
}

// TestDomainRecord 覆盖基类行为。
func TestDomainRecord(t *testing.T) {
	rec := NewDomainRecord(map[string]any{"a": 1, "b": "x"})
	if rec.Len() != 2 {
		t.Errorf("Len = %d, want 2", rec.Len())
	}
	if rec.GetString("b") != "x" {
		t.Errorf("GetString = %q, want x", rec.GetString("b"))
	}
	if rec.GetString("missing") != "" {
		t.Error("缺失键应返回空串")
	}
	if rec.Get("missing") != nil {
		t.Error("缺失键应返回 nil")
	}

	// ToDict 是浅拷贝，改副本不影响原记录。
	d := rec.ToDict()
	d["a"] = 99
	if rec.Get("a") != 1 {
		t.Error("ToDict 应为浅拷贝")
	}

	// FromDict 接受 map。
	got, err := rec.FromDict(map[string]any{"z": 1})
	if err != nil || got.Get("z") != 1 {
		t.Errorf("FromDict 得到 (%v,%v)", got, err)
	}
	// 非 mapping 报错。
	if _, err := rec.FromDict(42); err == nil {
		t.Error("非 mapping 应报错")
	}
}

// TestBookMetadataFromDict 覆盖 BookMetadata。
func TestBookMetadataFromDict(t *testing.T) {
	bm := NewBookMetadata(map[string]any{"title": "三体"})
	got, err := bm.FromDict(map[string]any{"title": "球状闪电"})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got.GetString("title") != "球状闪电" {
		t.Errorf("title = %q", got.GetString("title"))
	}
	if _, err := bm.FromDict("bad"); err == nil {
		t.Error("非 mapping 应报错")
	}
}

// TestCoerceEntity 覆盖实体升格。
func TestCoerceEntity(t *testing.T) {
	m := map[string]any{"title": "x"}
	if got := CoerceEntity("metadata", m); got == nil {
		t.Error("已知类型应返回非 nil")
	}
	if got := CoerceEntity("unknown", m); got == nil {
		t.Error("未知类型应原样返回")
	}
	if got := CoerceEntity("metadata", "not-a-map"); got != "not-a-map" {
		t.Errorf("非 map 应原样返回，得到 %v", got)
	}
}

// TestAsString 覆盖 Python str(x or "") 的语义。
func TestAsString(t *testing.T) {
	cases := []struct {
		in   any
		want string
	}{
		{nil, ""}, {"x", "x"}, {true, "True"}, {false, "False"},
		{float64(3), "3"}, {float64(3.5), "3.5"}, {int(7), "7"}, {int64(8), "8"},
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
	if got := asStringSlice([]string{"a"}); len(got) != 1 || got[0] != "a" {
		t.Errorf("[]string 得到 %v", got)
	}
	if got := asStringSlice([]any{"a", "b"}); len(got) != 2 {
		t.Errorf("[]any 得到 %v", got)
	}
	if got := asStringSlice("solo"); len(got) != 1 || got[0] != "solo" {
		t.Errorf("字符串得到 %v", got)
	}
	if got := asStringSlice(42); got != nil {
		t.Errorf("非法类型得到 %v", got)
	}
}

// repeat 生成重复字符串。
func repeat(s string, n int) string {
	out := make([]byte, 0, n*len(s))
	for i := 0; i < n; i++ {
		out = append(out, s...)
	}
	return string(out)
}
