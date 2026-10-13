package booksource

import (
	"reflect"
	"testing"
)

// TestParseReplaceRegex 对齐 Python cleaner.parse_replace_regex。
func TestParseReplaceRegex(t *testing.T) {
	got := ParseReplaceRegex("a##b\nc##d\n##e##f\n\nbad")
	want := []ReplaceRule{
		{Pattern: "a", Replacement: "b"},
		{Pattern: "c", Replacement: "d"},
		{Pattern: "e", Replacement: "f"},
		{Pattern: "bad", Replacement: ""},
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("= %#v, want %#v", got, want)
	}
	if got := ParseReplaceRegex(""); len(got) != 0 {
		t.Errorf("空输入 = %#v, want 空", got)
	}
}

// TestApplyReplaceRegex 对齐 Python apply_replace_regex。
func TestApplyReplaceRegex(t *testing.T) {
	if got := ApplyReplaceRegex("hello world", "o##0\nl##L"); got != "heLL0 w0rLd" {
		t.Errorf("= %q, want %q", got, "heLL0 w0rLd")
	}
	// 坏正则跳过，原文返回。
	if got := ApplyReplaceRegex("abc", "[##X"); got != "abc" {
		t.Errorf("坏正则 = %q, want %q", got, "abc")
	}
}

// TestApplyBlacklist 对齐 Python apply_blacklist。
func TestApplyBlacklist(t *testing.T) {
	if got := ApplyBlacklist("keep1\nAD here\nkeep2\nad lower", []string{"AD", "^ad"}); got != "keep1\nkeep2" {
		t.Errorf("= %q, want %q", got, "keep1\nkeep2")
	}
	if got := ApplyBlacklist("a\nb", nil); got != "a\nb" {
		t.Errorf("空黑名单 = %q, want %q", got, "a\nb")
	}
}

// TestNormalizeWhitespace 对齐 Python normalize_whitespace。
func TestNormalizeWhitespace(t *testing.T) {
	in := "  a  \r\n\r\n\r\n\r\n  b  \u200b c \ufeff "
	want := "a\n\nb   c"
	if got := NormalizeWhitespace(in); got != want {
		t.Errorf("= %q, want %q", got, want)
	}
}

// TestClean 对齐 Python clean。
func TestClean(t *testing.T) {
	if got := Clean("x  \n\n\n\n  y", "x##X", []string{"y"}, true); got != "X" {
		t.Errorf("enabled = %q, want %q", got, "X")
	}
	if got := Clean("x  \n\n\n\n  y", "x##X", []string{"y"}, false); got != "x\n\ny" {
		t.Errorf("disabled = %q, want %q", got, "x\n\ny")
	}
	if got := Clean("", "", nil, true); got != "" {
		t.Errorf("空输入 = %q, want %q", got, "")
	}
}

// TestParseSourceHeader 对齐 Python parse_source_header。
func TestParseSourceHeader(t *testing.T) {
	cases := []struct {
		name string
		in   any
		want map[string]string
	}{
		{"none", nil, map[string]string{}},
		{"dict", map[string]any{"A": 1, "B": "x"}, map[string]string{"A": "1", "B": "x"}},
		{"json", `{"U":"v","N":2}`, map[string]string{"U": "v", "N": "2"}},
		{"js", "@js:whatever", map[string]string{}},
		{"jsblock", "<js>x</js>", map[string]string{}},
		{"bad", "not json", map[string]string{}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := ParseSourceHeader(tc.in)
			if !reflect.DeepEqual(got, tc.want) {
				t.Errorf("= %#v, want %#v", got, tc.want)
			}
		})
	}
}

// TestDefaultHeaders 对齐 Python DEFAULT_HEADERS。
func TestDefaultHeaders(t *testing.T) {
	want := map[string]string{
		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
			"(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		"Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
		"Accept-Language": "zh-CN,zh;q=0.9",
	}
	if !reflect.DeepEqual(DefaultHeaders, want) {
		t.Errorf("= %#v, want %#v", DefaultHeaders, want)
	}
}

// bsVectorRaw 与 Python 侧 tmp_b3d.py 的书源一致。
func bsVectorRaw() map[string]any {
	return map[string]any{
		"bookSourceUrl":   "https://ex.com",
		"bookSourceName":  "Ex",
		"bookSourceGroup": "G",
		"bookSourceType":  "0",
		"enabled":         true,
		"enabledExplore":  false,
		"weight":          "7",
		"header":          map[string]any{"H": "1"},
		"searchUrl":       "/s?q={{key}}",
		"exploreUrl":      "A::/a\nB::/b\nC::@js:x\n\nbad-no-sep",
		"ruleSearch":      map[string]any{"bookList": "class.x", "name": "tag.a@text"},
		"ruleBookInfo":    map[string]any{"name": "id.n"},
		"ruleToc":         map[string]any{"chapterList": "-class.c", "chapterName": "tag.a@text"},
		"ruleContent":     map[string]any{"content": "id.c@html"},
	}
}

func mustBookSource(t *testing.T, raw map[string]any) *BookSource {
	t.Helper()
	bs, err := NewBookSource(raw)
	if err != nil {
		t.Fatalf("NewBookSource: %v", err)
	}
	return bs
}

// TestBookSourceFields 对齐 Python BookSource 的字段访问。
func TestBookSourceFields(t *testing.T) {
	bs := mustBookSource(t, bsVectorRaw())

	if got := bs.BookSourceURL(); got != "https://ex.com" {
		t.Errorf("url = %q", got)
	}
	if got := bs.BookSourceName(); got != "Ex" {
		t.Errorf("name = %q", got)
	}
	if got := bs.BookSourceGroup(); got != "G" {
		t.Errorf("group = %q", got)
	}
	if got := bs.BookSourceType(); got != 0 {
		t.Errorf("type = %d", got)
	}
	if !bs.Enabled() {
		t.Error("enabled 应为 true")
	}
	if bs.EnabledExplore() {
		t.Error("enabledExplore 应为 false")
	}
	if got := bs.Weight(); got != 7 {
		t.Errorf("weight = %d", got)
	}
	if got := bs.SearchURL(); got != "/s?q={{key}}" {
		t.Errorf("searchUrl = %q", got)
	}
	if !bs.IsTextSource() {
		t.Error("is_text_source 应为 true")
	}
	if got := bs.RuleSearch().Get("bookList"); got != "class.x" {
		t.Errorf("ruleSearch.bookList = %q", got)
	}
	if got := bs.RuleToc().Get("chapterList"); got != "-class.c" {
		t.Errorf("ruleToc.chapterList = %q", got)
	}
	if got := bs.RuleContent().Get("content"); got != "id.c@html" {
		t.Errorf("ruleContent.content = %q", got)
	}
	if got := bs.RuleContent().Get("nope"); got != "" {
		t.Errorf("缺失字段 = %q, want 空", got)
	}
	wantSummary := map[string]any{"name": "Ex", "url": "https://ex.com", "group": "G", "type": 0}
	if got := bs.Summary(); !reflect.DeepEqual(got, wantSummary) {
		t.Errorf("summary = %#v, want %#v", got, wantSummary)
	}
}

// TestBookSourceExploreCategories 对齐 Python explore_categories。
func TestBookSourceExploreCategories(t *testing.T) {
	bs := mustBookSource(t, bsVectorRaw())
	want := []ExploreCategory{{Name: "A", URL: "/a"}, {Name: "B", URL: "/b"}}
	if got := bs.ExploreCategories(); !reflect.DeepEqual(got, want) {
		t.Errorf("文本形式 = %#v, want %#v", got, want)
	}

	// JSON 数组形式：@js 条目、空字段、非 dict 项均跳过。
	raw := bsVectorRaw()
	raw["exploreUrl"] = `[{"title":"T1","url":"/u1"},{"name":"T2","url":"/u2"},` +
		`{"title":"T3","url":"@js:x"},{"title":"","url":"/u4"},{"title":"T5","url":""},"notadict"]`
	wantJSON := []ExploreCategory{{Name: "T1", URL: "/u1"}, {Name: "T2", URL: "/u2"}}
	if got := mustBookSource(t, raw).ExploreCategories(); !reflect.DeepEqual(got, wantJSON) {
		t.Errorf("JSON 形式 = %#v, want %#v", got, wantJSON)
	}

	// 坏 JSON 回落到文本解析，无 `::` 分隔则无分类。
	raw["exploreUrl"] = "[bad json"
	if got := mustBookSource(t, raw).ExploreCategories(); len(got) != 0 {
		t.Errorf("坏 JSON = %#v, want 空", got)
	}
}

// TestBookSourceTypeFallbacks 对齐 Python 的类型解析兜底。
func TestBookSourceTypeFallbacks(t *testing.T) {
	raw := bsVectorRaw()
	raw["bookSourceType"] = "abc"
	if got := mustBookSource(t, raw).BookSourceType(); got != 0 {
		t.Errorf("非法 type = %d, want 0", got)
	}
	raw = bsVectorRaw()
	raw["weight"] = nil
	if got := mustBookSource(t, raw).Weight(); got != 0 {
		t.Errorf("nil weight = %d, want 0", got)
	}
	raw = bsVectorRaw()
	raw["enabled"] = false
	if mustBookSource(t, raw).Enabled() {
		t.Error("enabled=false 应为 false")
	}
}

// TestBookSourceBadRaw 对齐 Python 的 ValueError。
func TestBookSourceBadRaw(t *testing.T) {
	if _, err := NewBookSource("notadict"); err == nil {
		t.Error("非 dict 应报错")
	}
}

// TestRuleGroupBool 对齐 Python RuleGroup.__bool__。
func TestRuleGroupBool(t *testing.T) {
	if NewRuleGroup(map[string]any{}).Bool() {
		t.Error("空组应为 false")
	}
	if !NewRuleGroup(map[string]any{"a": 1}).Bool() {
		t.Error("非空组应为 true")
	}
}

// auResult 是 AnalyzeURL 解析结果的比对形式。
type auResult struct {
	URL     string
	Options map[string]any
	JSErr   bool
}

func runAnalyzeURL(t *testing.T, rule, base string, vars map[string]string) auResult {
	t.Helper()
	a, err := NewAnalyzeURL(rule, base, vars, nil, nil, 0)
	if err != nil {
		if _, ok := err.(*JsRuleUnsupported); ok {
			return auResult{JSErr: true}
		}
		t.Fatalf("NewAnalyzeURL(%q): %v", rule, err)
	}
	return auResult{URL: a.URL, Options: a.Options}
}

// TestAnalyzeURL 对齐 Python AnalyzeUrl 的 22 组向量。
func TestAnalyzeURL(t *testing.T) {
	cases := []struct {
		name string
		rule string
		base string
		vars map[string]string
		want auResult
	}{
		{"plain", "https://h/s", "", nil, auResult{URL: "https://h/s", Options: map[string]any{}}},
		{"vars", "https://h/s?k={{key}}&p={{page}}", "", map[string]string{"key": "K", "page": "2"},
			auResult{URL: "https://h/s?k=K&p=2", Options: map[string]any{}}},
		{"aliases", "https://h/s?k={{searchKey}}&p={{searchPage}}", "", map[string]string{"key": "K", "page": "2"},
			auResult{URL: "https://h/s?k=K&p=2", Options: map[string]any{}}},
		{"baseurl", "https://h/{{baseUrl}}", "https://b/", nil,
			auResult{URL: "https://h/https://b/", Options: map[string]any{}}},
		{"get", "https://h/s?t=@get:{tok}", "", map[string]string{"tok": "T"},
			auResult{URL: "https://h/s?t=T", Options: map[string]any{}}},
		{"get-miss", "https://h/s?t=@get:{nope}", "", nil,
			auResult{URL: "https://h/s?t=", Options: map[string]any{}}},
		{"relative", "/rel?q=1", "https://b/dir/page", nil,
			auResult{URL: "https://b/rel?q=1", Options: map[string]any{}}},
		{"options", `https://h/s,{"method":"POST","body":"k={{key}}","charset":"gbk"}`,
			"", map[string]string{"key": "K"},
			auResult{URL: "https://h/s", Options: map[string]any{
				"method": "POST", "body": "k={{key}}", "charset": "gbk"}}},
		{"options-bad", "https://h/s,{bad json", "", nil,
			auResult{URL: "https://h/s,{bad json", Options: map[string]any{}}},
		{"pages-seg1", "https://h/s?q=1<,&page={{page}}>", "", map[string]string{"page": "1"},
			auResult{URL: "https://h/s?q=1", Options: map[string]any{}}},
		{"pages-seg2", "https://h/s?q=1<,&page={{page}}>", "", map[string]string{"page": "2"},
			auResult{URL: "https://h/s?q=1&page=2", Options: map[string]any{}}},
		{"pages-seg9", "https://h/s?q=1<,&page={{page}}>", "", map[string]string{"page": "9"},
			auResult{URL: "https://h/s?q=1&page=9", Options: map[string]any{}}},
		// 无 page 变量时 `<...>` 原样保留，但 {{page}} 仍替换为空。
		{"pages-nopage", "https://h/s?q=1<,&page={{page}}>", "", nil,
			auResult{URL: "https://h/s?q=1<,&page=>", Options: map[string]any{}}},
		{"pages-3seg", "https://h/s<a,b,c>", "", map[string]string{"page": "2"},
			auResult{URL: "https://h/sb", Options: map[string]any{}}},
		{"js-url", "@js:'https://h/' + 'x'", "", nil,
			auResult{URL: "https://h/x", Options: map[string]any{}}},
		{"js-block", "<js>x</js>", "", nil, auResult{JSErr: true}},
		{"js-java", "{{java.ajax}}", "", nil, auResult{JSErr: true}},
		{"js-ajax", "@js:java.ajax('x')", "", nil, auResult{JSErr: true}},
		{"tpl-js", "https://h/{{js.x}}", "", nil, auResult{JSErr: true}},
		{"empty", "", "", nil, auResult{URL: "", Options: map[string]any{}}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := runAnalyzeURL(t, tc.rule, tc.base, tc.vars)
			if got.JSErr != tc.want.JSErr {
				t.Fatalf("JSErr = %v, want %v", got.JSErr, tc.want.JSErr)
			}
			if tc.want.JSErr {
				return
			}
			if got.URL != tc.want.URL {
				t.Errorf("URL = %q, want %q", got.URL, tc.want.URL)
			}
			if !reflect.DeepEqual(got.Options, tc.want.Options) {
				t.Errorf("Options = %#v, want %#v", got.Options, tc.want.Options)
			}
		})
	}
}

// TestAnalyzeURLJSMarkers 对齐 Python 的 JS 标记判定。
func TestAnalyzeURLJSMarkers(t *testing.T) {
	if !hasJS("a@js:b") {
		t.Error("hasJS(@js:) 应为 true")
	}
	if !hasUnsupportedURLJS("java.post") {
		t.Error("hasUnsupportedURLJS(java.post) 应为 true")
	}
}

// TestDedupeChapters 对齐 Python _dedupe_chapters。
//
// 关键语义：重复项保留**靠后**出现的位置，因此 A 的最终位置是索引 2。
func TestDedupeChapters(t *testing.T) {
	in := []Chapter{
		{Name: "A", URL: "/a"},
		{Name: "B", URL: "/b"},
		{Name: "A", URL: "/a"},
		{Name: "C", URL: "/c"},
	}
	got := DedupeChapters(in)
	want := []Chapter{
		{Name: "B", URL: "/b"},
		{Name: "A", URL: "/a"},
		{Name: "C", URL: "/c"},
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("= %#v, want %#v", got, want)
	}
	if got := DedupeChapters(nil); len(got) != 0 {
		t.Errorf("空输入 = %#v, want 空", got)
	}
}

// TestMakeDoc 对齐 Python make_doc 的文档类型判定。
func TestMakeDoc(t *testing.T) {
	if _, ok := MakeDoc(`{"a":1}`, "$.a").(map[string]any); !ok {
		t.Error("JSON 提示应解析为 map")
	}
	if _, ok := MakeDoc(`  {"a":1}`, "").(map[string]any); !ok {
		t.Error("自动识别对象应解析为 map")
	}
	if _, ok := MakeDoc(`[1,2]`, "").([]any); !ok {
		t.Error("自动识别数组应解析为 slice")
	}
	if _, ok := MakeDoc(`<p>x</p>`, "").(interface{ Text() string }); !ok {
		t.Error("HTML 应解析为节点")
	}
	// 坏 JSON 回落 HTML。
	if _, ok := MakeDoc(`{bad`, "$.a").(interface{ Text() string }); !ok {
		t.Error("坏 JSON 应回落 HTML")
	}
}

// TestChapterContentToDict 对齐 Python ChapterContent.to_dict（只含 title/content）。
func TestChapterContentToDict(t *testing.T) {
	got := ChapterContent{Title: "T", Content: "C", Extra: map[string]any{"z": 1}}.ToDict()
	want := map[string]any{"title": "T", "content": "C"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("= %#v, want %#v", got, want)
	}
}

// TestBookSummaryToDict 对齐 Python BookSummary.to_dict 的字段顺序与集合。
func TestBookSummaryToDict(t *testing.T) {
	got := BookSummary{Name: "N"}.ToDict()
	want := map[string]any{
		"name": "N", "author": "", "kind": "", "word_count": "",
		"last_chapter": "", "intro": "", "cover_url": "", "book_url": "",
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("= %#v, want %#v", got, want)
	}
}

// TestBookDetailToDict 对齐 Python BookDetail.to_dict。
func TestBookDetailToDict(t *testing.T) {
	got := BookDetail{Name: "N"}.ToDict()
	want := map[string]any{
		"name": "N", "author": "", "kind": "", "last_chapter": "",
		"intro": "", "cover_url": "", "word_count": "", "book_url": "", "toc_url": "",
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("= %#v, want %#v", got, want)
	}
}

// TestSafeFilename 对齐 Python _safe_filename。
func TestSafeFilename(t *testing.T) {
	cases := []struct{ in, want string }{
		{`a/b\c:d*e?f"g<h>i|j` + "\r\nk\tl", "a_b_c_d_e_f_g_h_i_j__k_l"},
		{"", "online"},
		{"   ", "online"},
		{"x" + repeatStr("x", 199), repeatStr("x", 80)},
	}
	for _, tc := range cases {
		if got := SafeFilename(tc.in); got != tc.want {
			t.Errorf("SafeFilename(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

func repeatStr(s string, n int) string {
	out := make([]byte, 0, n)
	for i := 0; i < n; i++ {
		out = append(out, s...)
	}
	return string(out)
}

// TestSerializeStatus 对齐 Python _serialize_status。
func TestSerializeStatus(t *testing.T) {
	cases := []struct {
		name     string
		detail   *BookDetail
		chapters []Chapter
		declared string
		want     string
	}{
		{"finished", &BookDetail{LastChapter: "已完结"}, nil, "", StatusFinished},
		{"serial", &BookDetail{LastChapter: "连载中"}, nil, "", StatusSerial},
		{"declared-default", &BookDetail{LastChapter: "x"}, nil, "", StatusUnknown},
		{"declared-explicit", &BookDetail{LastChapter: "x"}, nil, StatusSerial, StatusSerial},
		{"chapter-keyword", &BookDetail{}, []Chapter{{Name: "终章"}}, "", StatusFinished},
		{"last3-window", &BookDetail{}, []Chapter{
			{Name: "a"}, {Name: "b"}, {Name: "c"}, {Name: "完本"}}, "", StatusFinished},
		// 只看最后 3 章：第 1 章的「完本」不在窗口内。
		{"last3-excludes", &BookDetail{}, []Chapter{
			{Name: "完本"}, {Name: "b"}, {Name: "c"}, {Name: "d"}}, "", StatusUnknown},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := SerializeStatus(tc.detail, tc.chapters, tc.declared); got != tc.want {
				t.Errorf("= %q, want %q", got, tc.want)
			}
		})
	}
}
