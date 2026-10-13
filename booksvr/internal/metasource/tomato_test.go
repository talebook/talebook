package metasource

import (
	"reflect"
	"testing"
)

// TestTomatoExtractJSON 对齐 Python extract_next_data_json / extract_initial_state_json。
func TestTomatoExtractJSON(t *testing.T) {
	next := `<html><script id="__NEXT_DATA__" type="application/json">{"a":1}</script></html>`
	if got := ExtractNextDataJSON(next); got != `{"a":1}` {
		t.Errorf("ExtractNextDataJSON = %q", got)
	}
	if got := ExtractNextDataJSON("<html></html>"); got != "" {
		t.Errorf("未命中应为空串, 得到 %q", got)
	}

	init := `<html><script>window.__INITIAL_STATE__ = {"b":2};</script></html>`
	if got := ExtractInitialStateJSON(init); got != `{"b":2}` {
		t.Errorf("ExtractInitialStateJSON = %q", got)
	}
	if got := ExtractInitialStateJSON("<html></html>"); got != "" {
		t.Errorf("未命中应为空串, 得到 %q", got)
	}
}

// tomatoVectorData 与 Python 侧 tmp_tomato.py 的 DATA 一致。
func tomatoVectorData() map[string]any {
	return map[string]any{
		"outer": map[string]any{"bookName": "三体", "nested": map[string]any{"author": "刘慈欣"}},
		"list":  []any{map[string]any{"abstract": "简介"}},
		"num":   float64(42),
	}
}

// TestFindStringByKey 对齐 Python find_string_by_key 的 7 组向量。
func TestFindStringByKey(t *testing.T) {
	data := tomatoVectorData()
	cases := []struct {
		name string
		keys []string
		want string
	}{
		{"title", []string{"bookName", "title"}, "三体"},
		{"author", []string{"author"}, "刘慈欣"},
		{"abstract", []string{"abstract"}, "简介"},
		{"missing", []string{"nope"}, ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := FindStringByKey(data, tc.keys); got != tc.want {
				t.Errorf("FindStringByKey(%v) = %q, want %q", tc.keys, got, tc.want)
			}
		})
	}

	// 键序决定优先级。
	if got := FindStringByKey(map[string]any{"title": "T", "bookName": "B"}, []string{"bookName", "title"}); got != "B" {
		t.Errorf("优先 bookName = %q", got)
	}
	if got := FindStringByKey(map[string]any{"title": "T", "bookName": "B"}, []string{"title", "bookName"}); got != "T" {
		t.Errorf("优先 title = %q", got)
	}
	// 非字符串值被跳过。
	if got := FindStringByKey(map[string]any{"title": float64(123)}, []string{"title"}); got != "" {
		t.Errorf("非字符串应跳过, 得到 %q", got)
	}
}

// TestFindStringArrayByKey 对齐 Python find_string_array_by_key 的 5 组向量。
func TestFindStringArrayByKey(t *testing.T) {
	if got := FindStringArrayByKey(map[string]any{"tags": []any{"a", "b"}}, []string{"tags"}); !reflect.DeepEqual(got, []string{"a", "b"}) {
		t.Errorf("正常数组 = %v", got)
	}
	// 空数组不命中。
	if got := FindStringArrayByKey(map[string]any{"tags": []any{}}, []string{"tags"}); got != nil {
		t.Errorf("空数组应返回 nil, 得到 %v", got)
	}
	// 混合类型不命中。
	if got := FindStringArrayByKey(map[string]any{"tags": []any{"a", float64(1)}}, []string{"tags"}); got != nil {
		t.Errorf("混合类型应返回 nil, 得到 %v", got)
	}
	if got := FindStringArrayByKey(map[string]any{"x": float64(1)}, []string{"tags"}); got != nil {
		t.Errorf("缺失应返回 nil, 得到 %v", got)
	}
	// 嵌套查找。
	nested := map[string]any{"a": map[string]any{"b": map[string]any{"tags": []any{"x"}}}}
	if got := FindStringArrayByKey(nested, []string{"tags"}); !reflect.DeepEqual(got, []string{"x"}) {
		t.Errorf("嵌套 = %v", got)
	}
}

// TestFindIntByKey 对齐 Python find_int_by_key 的 5 组向量。
func TestFindIntByKey(t *testing.T) {
	cases := []struct {
		name  string
		value any
		want  int
		ok    bool
	}{
		{"num", map[string]any{"chapterCount": float64(10)}, 10, true},
		{"str", map[string]any{"chapterCount": "20"}, 20, true},
		{"nonnum_str", map[string]any{"chapterCount": "abc"}, 0, false},
		{"missing", map[string]any{"x": float64(1)}, 0, false},
		{"zero", map[string]any{"chapterCount": float64(0)}, 0, true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, ok := FindIntByKey(tc.value, []string{"chapterCount"})
			if got != tc.want || ok != tc.ok {
				t.Errorf("FindIntByKey = (%d, %v), want (%d, %v)", got, ok, tc.want, tc.ok)
			}
		})
	}
}

// TestBuildCoverURLFromThumbURI 对齐 Python build_cover_url_from_thumb_uri 的 5 组向量。
func TestBuildCoverURLFromThumbURI(t *testing.T) {
	cases := []struct{ in, want string }{
		{"https://x/a.jpg", "https://x/a.jpg"},
		{"abc/def.jpg", "https://p3-reading-sign.fqnovelpic.com/abc/def.jpg"},
		{"  abc.jpg  ", "https://p3-reading-sign.fqnovelpic.com/abc.jpg"},
		{"", ""},
	}
	for _, tc := range cases {
		if got := BuildCoverURLFromThumbURI(tc.in); got != tc.want {
			t.Errorf("BuildCoverURLFromThumbURI(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

// TestParseHTMLImgCoverURL 对齐 Python parse_html_img_cover_url 的 5 组向量。
func TestParseHTMLImgCoverURL(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want string
	}{
		{"list", `<script type="application/ld+json">{"images":["https://x/1.jpg","https://x/2.jpg"]}</script>`, "https://x/1.jpg"},
		{"str", `<script type="application/ld+json">{"image":"https://x/s.jpg"}</script>`, "https://x/s.jpg"},
		{"bad", `<script type="application/ld+json">{bad json}</script>`, ""},
		{"relative", `<script type="application/ld+json">{"image":"/rel.jpg"}</script>`, ""},
		{"none", "<html></html>", ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := ParseHTMLImgCoverURL(tc.in); got != tc.want {
				t.Errorf("ParseHTMLImgCoverURL = %q, want %q", got, tc.want)
			}
		})
	}
}

// TestParseTagsFromInfoLabel 对齐 Python parse_tags_from_info_label 的 3 组向量。
func TestParseTagsFromInfoLabel(t *testing.T) {
	grey := `<span class="info-label-grey"> 玄幻 </span><span class="info-label-grey">都市</span>`
	if got := ParseTagsFromInfoLabel(grey); !reflect.DeepEqual(got, []string{"玄幻", "都市"}) {
		t.Errorf("tags = %v", got)
	}
	if got := ParseTagsFromInfoLabel("<html></html>"); got != nil {
		t.Errorf("无标签应返回 nil, 得到 %v", got)
	}
	// 全空白标签被过滤 → 返回 nil。
	if got := ParseTagsFromInfoLabel(`<span class="info-label-grey">   </span>`); got != nil {
		t.Errorf("空白标签应返回 nil, 得到 %v", got)
	}
}

// TestParseFinishedFromInfoLabel 对齐 Python parse_finished_from_info_label 的 5 组向量。
func TestParseFinishedFromInfoLabel(t *testing.T) {
	cases := []struct {
		name    string
		in      string
		want    bool
		wantHit bool
	}{
		{"serial", `<span class="info-label-yellow">连载中</span>`, false, true},
		{"not_finished", `<span class="info-label-yellow">未完结</span>`, false, true},
		{"done", `<span class="info-label-yellow">已完结</span>`, true, true},
		{"none", "<html></html>", false, false},
		{"other", `<span class="info-label-yellow">其他</span>`, false, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, hit := ParseFinishedFromInfoLabel(tc.in)
			if got != tc.want || hit != tc.wantHit {
				t.Errorf("ParseFinishedFromInfoLabel = (%v, %v), want (%v, %v)", got, hit, tc.want, tc.wantHit)
			}
		})
	}
}

// TestRegexJSONFields 对齐 Python regex_json_string_field / regex_json_int_field。
func TestRegexJSONFields(t *testing.T) {
	js := `{"bookName":"三体","author":"刘\u6148欣","chapterCount":30,"x":"a\"b"}`

	if got := RegexJSONStringField(js, "bookName"); got != "三体" {
		t.Errorf("bookName = %q", got)
	}
	// \u6148 反转义为「慈」。
	if got := RegexJSONStringField(js, "author"); got != "刘慈欣" {
		t.Errorf("author = %q", got)
	}
	// 非贪婪匹配在转义引号处截断，反转义失败则返回原文。
	if got := RegexJSONStringField(js, "x"); got != `a\` {
		t.Errorf("x = %q, want %q", got, `a\`)
	}
	if got := RegexJSONStringField(js, "nope"); got != "" {
		t.Errorf("未命中应为空串, 得到 %q", got)
	}

	if n, ok := RegexJSONIntField(js, "chapterCount"); !ok || n != 30 {
		t.Errorf("chapterCount = (%d, %v)", n, ok)
	}
	if _, ok := RegexJSONIntField(js, "nope"); ok {
		t.Error("未命中应返回 false")
	}
}

// TestTomatoConstants 校验常量与 Python 一致。
func TestTomatoConstants(t *testing.T) {
	if TomatoISBN != "0000000000003" {
		t.Errorf("TomatoISBN = %q", TomatoISBN)
	}
	if TomatoKey != "TomatoNovel" {
		t.Errorf("TomatoKey = %q", TomatoKey)
	}
	if TomatoSearchAPI != "https://api-lf.fanqiesdk.com/api/novel/channel/homepage/search/search/v1/" {
		t.Errorf("TomatoSearchAPI = %q", TomatoSearchAPI)
	}
	if TomatoPageBase != "https://fanqienovel.com/page/" {
		t.Errorf("TomatoPageBase = %q", TomatoPageBase)
	}
	if len(TomatoUserAgents) != 4 {
		t.Errorf("USER_AGENTS 长度 = %d, want 4", len(TomatoUserAgents))
	}
}

// TestGetRandomHeaders 校验随机头字段与 UA 选择。
func TestGetRandomHeaders(t *testing.T) {
	h := GetRandomHeaders(0)
	if h["User-Agent"] != TomatoUserAgents[0] {
		t.Errorf("UA = %q", h["User-Agent"])
	}
	if h["Referer"] != "https://fanqienovel.com/" || h["Origin"] != "https://fanqienovel.com" {
		t.Errorf("Referer/Origin = %q / %q", h["Referer"], h["Origin"])
	}
	// 越界索引回落第一个。
	if got := GetRandomHeaders(99); got["User-Agent"] != TomatoUserAgents[0] {
		t.Errorf("越界索引 UA = %q", got["User-Agent"])
	}
	if got := GetRandomHeaders(-1); got["User-Agent"] != TomatoUserAgents[0] {
		t.Errorf("负索引 UA = %q", got["User-Agent"])
	}
}

// TestTomatoGetCoverEmptyURL 校验空 URL 返回 nil。
func TestTomatoGetCoverEmptyURL(t *testing.T) {
	src := NewTomatoSource(nil)
	if got := src.GetCover(""); got != nil {
		t.Errorf("空 URL 应返回 nil, 得到 %+v", got)
	}
}

// TestTomatoCoverExtension 校验封面扩展名白名单回落。
func TestTomatoCoverExtension(t *testing.T) {
	cases := []struct{ url, want string }{
		{"https://x/a.jpg", "jpg"},
		{"https://x/a.WEBP", "webp"},
		{"https://x/a.bmp", "jpg"},
		{"https://x/a", "jpg"},
	}
	for _, tc := range cases {
		got := "jpg"
		if m := tomatoCoverExtRe.FindStringSubmatch(tc.url); m != nil {
			if ext := lowerASCII(m[1]); tomatoImageFormats[ext] {
				got = ext
			}
		}
		if got != tc.want {
			t.Errorf("扩展名(%q) = %q, want %q", tc.url, got, tc.want)
		}
	}
}

// TestTomatoBuildMetadataPromoPage 校验推广页面被识别并返回 nil。
func TestTomatoBuildMetadataPromoPage(t *testing.T) {
	src := NewTomatoSource(nil)
	page := &TomatoPage{
		BookID: "1",
		HTML:   `<html><body><h1>番茄小说</h1><div class="page-abstract-content"><p>番茄小说是抖音旗下产品</p></div></body></html>`,
	}
	doc, err := parseTomatoTestDoc(page.HTML)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	page.Doc = doc
	if got := src.BuildMetadata(page, false); got != nil {
		t.Errorf("推广页面应返回 nil, 得到 %v", got)
	}
}

// TestTomatoBuildMetadataFromHTML 校验从 HTML 兜底路径构造元数据。
func TestTomatoBuildMetadataFromHTML(t *testing.T) {
	src := NewTomatoSource(nil)
	html := `<html><body>` +
		`<h1>吞噬星空</h1>` +
		`<div class="author-name"><span class="author-name-text">我吃西红柿</span></div>` +
		`<div class="page-abstract-content"><p>简介内容</p></div>` +
		`<div class="info-label"><span>玄幻</span><span>科幻</span></div>` +
		`<div class="page-directory-header"><h3>共 100 章</h3></div>` +
		`</body></html>`
	doc, err := parseTomatoTestDoc(html)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	page := &TomatoPage{BookID: "7141319866317819927", HTML: html, Doc: doc}

	mi := src.BuildMetadata(page, false)
	if mi == nil {
		t.Fatal("BuildMetadata 返回 nil")
	}
	if mi["title"] != "吞噬星空" {
		t.Errorf("title = %v", mi["title"])
	}
	if mi["author"] != "我吃西红柿" {
		t.Errorf("author = %v", mi["author"])
	}
	if mi["comments"] != "简介内容" {
		t.Errorf("comments = %v", mi["comments"])
	}
	if !reflect.DeepEqual(mi["tags"], []any{"玄幻", "科幻"}) {
		t.Errorf("tags = %v", mi["tags"])
	}
	if mi["isbn"] != TomatoISBN {
		t.Errorf("isbn = %v", mi["isbn"])
	}
	if mi["publisher"] != nil || mi["series"] != nil || mi["rating"] != nil {
		t.Errorf("publisher/series/rating = %v / %v / %v", mi["publisher"], mi["series"], mi["rating"])
	}
	if mi["source"] != "番茄小说" || mi["provider_key"] != TomatoKey {
		t.Errorf("source/provider_key = %v / %v", mi["source"], mi["provider_key"])
	}
	if mi["provider_value"] != "7141319866317819927" {
		t.Errorf("provider_value = %v", mi["provider_value"])
	}
	if mi["website"] != TomatoPageBase+"7141319866317819927" {
		t.Errorf("website = %v", mi["website"])
	}
}

// TestTomatoGetInfoChapterCount 校验章节数从目录头提取。
func TestTomatoGetInfoChapterCount(t *testing.T) {
	html := `<html><body><div class="page-directory-header"><h3>共 100 章</h3></div></body></html>`
	doc, err := parseTomatoTestDoc(html)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	page := &TomatoPage{BookID: "1", HTML: html, Doc: doc}
	if got := page.GetInfo().ChapterCount; got != 100 {
		t.Errorf("ChapterCount = %d, want 100", got)
	}
}

// TestTomatoGetInfoParsedData 校验 __NEXT_DATA__ 路径优先。
func TestTomatoGetInfoParsedData(t *testing.T) {
	html := `<html><body><h1>HTML标题</h1></body></html>`
	doc, err := parseTomatoTestDoc(html)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	page := &TomatoPage{
		BookID: "1", HTML: html, Doc: doc,
		ParsedData: map[string]any{
			"bookName":     "JSON标题",
			"author":       "JSON作者",
			"abstract":     "JSON简介",
			"chapterCount": float64(50),
			"tags":         []any{"标签A"},
		},
	}
	info := page.GetInfo()
	if info.Title != "JSON标题" {
		t.Errorf("title = %q", info.Title)
	}
	if info.Author != "JSON作者" {
		t.Errorf("author = %q", info.Author)
	}
	if info.Summary != "JSON简介" {
		t.Errorf("summary = %q", info.Summary)
	}
	if info.ChapterCount != 50 {
		t.Errorf("chapterCount = %d", info.ChapterCount)
	}
	if info.Status != "标签A" {
		t.Errorf("status = %q, want 标签A", info.Status)
	}
}

// TestTomatoGetInfoFinishedStatus 校验完结状态映射。
func TestTomatoGetInfoFinishedStatus(t *testing.T) {
	html := `<html><body><span class="info-label-yellow">已完结</span></body></html>`
	doc, err := parseTomatoTestDoc(html)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	page := &TomatoPage{
		BookID: "1", HTML: html, Doc: doc,
		ParsedData: map[string]any{"bookName": "T", "tags": []any{"玄幻"}},
	}
	if got := page.GetInfo().Status; got != "已完结" {
		t.Errorf("status = %q, want 已完结", got)
	}
}

// TestTomatoGetImageFromParsedData 校验封面字段优先级。
func TestTomatoGetImageFromParsedData(t *testing.T) {
	page := &TomatoPage{
		BookID: "1",
		ParsedData: map[string]any{
			"thumb_uri": "abc/def.jpg",
		},
	}
	if got := page.GetImage(); got != "https://p3-reading-sign.fqnovelpic.com/abc/def.jpg" {
		t.Errorf("thumb_uri 构建 = %q", got)
	}

	page.ParsedData = map[string]any{"cover_url": "https://x/c.jpg", "thumb_uri": "abc.jpg"}
	if got := page.GetImage(); got != "https://x/c.jpg" {
		t.Errorf("cover_url 优先 = %q", got)
	}
}

// TestTomatoGetImageFromLDJSON 校验 ld+json 兜底路径。
func TestTomatoGetImageFromLDJSON(t *testing.T) {
	html := `<html><head><script type="application/ld+json">{"images":["https://x/ld.jpg"]}</script></head><body></body></html>`
	doc, err := parseTomatoTestDoc(html)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	page := &TomatoPage{BookID: "1", HTML: html, Doc: doc}
	if got := page.GetImage(); got != "https://x/ld.jpg" {
		t.Errorf("ld+json 封面 = %q", got)
	}
}

// TestTomatoGetImageEmpty 校验无封面时返回空串。
func TestTomatoGetImageEmpty(t *testing.T) {
	html := `<html><body></body></html>`
	doc, err := parseTomatoTestDoc(html)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	page := &TomatoPage{BookID: "1", HTML: html, Doc: doc}
	if got := page.GetImage(); got != "" {
		t.Errorf("无封面 = %q, want 空串", got)
	}
}

// TestTomatoSearchGetResults 校验搜索结果映射。
func TestTomatoSearchGetResults(t *testing.T) {
	s := &TomatoSearch{
		MaxResults: 10,
		Data: []map[string]any{
			{"title": "三体", "book_id": float64(123), "author": "刘慈欣", "abstract": "简介"},
			{"book_id": "456"},
		},
	}
	got := s.GetResults()
	if len(got) != 2 {
		t.Fatalf("结果数 = %d, want 2", len(got))
	}
	if got[0].Title != "三体" || got[0].BookID != "123" || got[0].Author != "刘慈欣" {
		t.Errorf("首条 = %+v", got[0])
	}
	if got[0].URL != TomatoPageBase+"123" {
		t.Errorf("URL = %q", got[0].URL)
	}
	// 缺省值。
	if got[1].Title != "未知书名" || got[1].Author != "佚名" {
		t.Errorf("缺省值 = %+v", got[1])
	}
}

// TestTomatoSearchMaxResults 校验结果截断。
func TestTomatoSearchMaxResults(t *testing.T) {
	s := &TomatoSearch{
		MaxResults: 1,
		Data: []map[string]any{
			{"title": "A", "book_id": "1"},
			{"title": "B", "book_id": "2"},
		},
	}
	if got := s.GetResults(); len(got) != 1 || got[0].Title != "A" {
		t.Errorf("截断结果 = %+v", got)
	}
}

// TestTomatoIsVerificationPage 校验验证页识别。
func TestTomatoIsVerificationPage(t *testing.T) {
	cases := []struct {
		name   string
		status int
		url    string
		html   string
		want   bool
	}{
		{"status_403", 403, "", "", true},
		{"status_429", 429, "", "", true},
		{"url_verify", 200, "https://x/verify", "", true},
		{"url_captcha", 200, "https://x/captcha", "", true},
		{"title", 200, "", `<html><head><title>安全验证</title></head></html>`, true},
		{"selector_vf", 200, "", `<html><body><div id="vf"></div></body></html>`, true},
		{"normal", 200, "https://x/page/1", `<html><head><title>正常</title></head></html>`, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			page := &TomatoPage{HTTPStatus: tc.status, FinalURL: tc.url, HTML: tc.html}
			if tc.html != "" {
				doc, err := parseTomatoTestDoc(tc.html)
				if err != nil {
					t.Fatalf("Parse: %v", err)
				}
				page.Doc = doc
			}
			if got := page.isVerificationPage(); got != tc.want {
				t.Errorf("isVerificationPage = %v, want %v", got, tc.want)
			}
		})
	}
}
