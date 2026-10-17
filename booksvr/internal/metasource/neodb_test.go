package metasource

import (
	"talebook/booksvr/internal/plugindomain"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sort"
	"testing"

	"talebook/booksvr/internal/htmlx"
	"talebook/booksvr/internal/safehttp"
)

// canonical 把 map 序列化成排序后的紧凑 JSON。
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
	for len(buf) > 0 && (buf[len(buf)-1] == '\n' || buf[len(buf)-1] == '\r') {
		buf = buf[:len(buf)-1]
	}
	return buf, nil
}

// sliceWriter 是简单的 []byte 写入器。
type sliceWriter struct{ buf *[]byte }

func (w *sliceWriter) Write(p []byte) (int, error) {
	*w.buf = append(*w.buf, p...)
	return len(p), nil
}

// itemToMap 把 NeoDBItem 转成 Python 风格的 dict。
func itemToMap(i NeoDBItem) map[string]any {
	return map[string]any{
		"cover_path":  i.CoverPath,
		"cover_url":   i.CoverURL,
		"title":       i.Title,
		"url":         i.URL,
		"rating":      i.Rating,
		"author":      i.Author,
		"publisher":   i.Publisher,
		"pub_year":    i.PubYear,
		"description": i.Description,
	}
}

// parseCard 解析一段 HTML 中的首个 item-card。
func parseCard(t *testing.T, content string) NeoDBItem {
	t.Helper()
	doc, err := htmlx.Parse(content)
	if err != nil {
		t.Fatalf("解析失败: %v", err)
	}
	art := doc.SelectOne("article.item-card")
	if art == nil {
		t.Fatal("未找到 item-card")
	}
	return ParseItemCard(art)
}

// TestParseItemCardVectors 用 Python 实测向量校验 _parse_item_card。
func TestParseItemCardVectors(t *testing.T) {
	cases := []struct {
		label string
		html  string
		want  string
	}{
		{
			label: "full",
			html: `<article class="item-card">
  <div class="cover"><img src="/c/1.jpg"/></div>
  <hgroup><h5><a href="/book/1">三体</a></h5></hgroup>
  <div class="multi-fields">
    <span class="solo-hidden">8.6 (236 个评分)</span>
    <span>作者: <span>刘慈欣</span></span>
    <span>publishing house: <span>重庆出版社</span></span>
    <span>2008</span>
  </div>
  <div class="full"><div>简介文本</div></div>
</article>`,
			want: `{"author":"刘慈欣","cover_path":"/c/1.jpg",` +
				`"cover_url":"https://neodb.social/c/1.jpg","description":"简介文本",` +
				`"pub_year":"2008","publisher":"重庆出版社","rating":"8.6 (236 个评分)",` +
				`"title":"三体","url":"https://neodb.social/book/1"}`,
		},
		{
			label: "minimal",
			html:  `<article class="item-card"><div class="multi-fields"><span>2008</span></div></article>`,
			want: `{"author":"","cover_path":"","cover_url":"","description":"",` +
				`"pub_year":"2008","publisher":"","rating":"","title":"","url":""}`,
		},
		{
			label: "author_no_inner",
			html:  `<article class="item-card"><div class="multi-fields"><span>作者: 某人</span></div></article>`,
			want: `{"author":"某人","cover_path":"","cover_url":"","description":"",` +
				`"pub_year":"","publisher":"","rating":"","title":"","url":""}`,
		},
		{
			label: "absolute_urls",
			html: `<article class="item-card"><div class="cover"><img src="http://x/c.jpg"/></div>` +
				`<hgroup><h5><a href="http://y/b">T</a></h5></hgroup></article>`,
			want: `{"author":"","cover_path":"http://x/c.jpg","cover_url":"http://x/c.jpg",` +
				`"description":"","pub_year":"","publisher":"","rating":"","title":"T",` +
				`"url":"http://y/b"}`,
		},
	}
	for _, c := range cases {
		got := canonical(t, itemToMap(parseCard(t, c.html)))
		if got != c.want {
			t.Errorf("%s:\n得到 %s\n期望 %s", c.label, got, c.want)
		}
	}
}

// TestParseItemCardPublisherNoInner publisher 无内层 span 时按冒号切分。
func TestParseItemCardPublisherNoInner(t *testing.T) {
	item := parseCard(t, `<article class="item-card"><div class="multi-fields">`+
		`<span>publishing house: 某社</span></div></article>`)
	if item.Publisher != "某社" {
		t.Errorf("publisher = %q, want 某社", item.Publisher)
	}
}

// TestParseItemCardSkipsSoloHidden solo-hidden 的 span 被跳过。
func TestParseItemCardSkipsSoloHidden(t *testing.T) {
	item := parseCard(t, `<article class="item-card"><div class="multi-fields">`+
		`<span class="solo-hidden">8.6</span><span>2008</span></div></article>`)
	if item.Rating != "8.6" {
		t.Errorf("rating = %q", item.Rating)
	}
	if item.PubYear != "2008" {
		t.Errorf("pub_year = %q", item.PubYear)
	}
}

// TestParseItemCardNonYearIgnored 非 4 位数字不作为年份。
func TestParseItemCardNonYearIgnored(t *testing.T) {
	item := parseCard(t, `<article class="item-card"><div class="multi-fields">`+
		`<span>20</span><span>abcd</span></div></article>`)
	if item.PubYear != "" {
		t.Errorf("pub_year = %q, want 空", item.PubYear)
	}
}

// TestParseRatingVectors 用 Python 实测向量校验 _parse_rating。
func TestParseRatingVectors(t *testing.T) {
	cases := []struct {
		in   string
		want float64
		ok   bool
	}{
		{"8.6 (236 个评分)", 8.6, true},
		{" 9 ", 9.0, true},
		{"abc", 0, false},
		{"", 0, false},
		{"10.0", 10.0, true},
	}
	for _, c := range cases {
		got, ok := ParseRating(c.in)
		if ok != c.ok || (ok && got != c.want) {
			t.Errorf("ParseRating(%q) = (%v,%v), want (%v,%v)", c.in, got, ok, c.want, c.ok)
		}
	}
}

// TestRoundHalfUpVectors 用 Python 实测向量校验 round（银行家舍入）。
func TestRoundHalfUpVectors(t *testing.T) {
	cases := map[float64]int{
		8.5: 8, 8.4: 8, 8.6: 9, 7.5: 8, 9.5: 10, 0.5: 0, 1.5: 2,
	}
	for in, want := range cases {
		if got := roundHalfUp(in); got != want {
			t.Errorf("roundHalfUp(%v) = %d, want %d", in, got, want)
		}
	}
}

// TestSplitAfterColon 覆盖冒号切分。
func TestSplitAfterColon(t *testing.T) {
	if got := splitAfterColon("作者: 某人"); got != "某人" {
		t.Errorf("得到 %q", got)
	}
	if got := splitAfterColon("无冒号"); got != "无冒号" {
		t.Errorf("得到 %q", got)
	}
	if got := splitAfterColon("a: b: c"); got != "b: c" {
		t.Errorf("得到 %q, want b: c", got)
	}
}

// TestIsFourDigitYear 覆盖年份判定。
func TestIsFourDigitYear(t *testing.T) {
	if !isFourDigitYear("2008") {
		t.Error("2008 应为年份")
	}
	for _, bad := range []string{"", "20", "20088", "abcd", "20a8"} {
		if isFourDigitYear(bad) {
			t.Errorf("%q 不应为年份", bad)
		}
	}
}

// TestBuildMetadata 覆盖 build_metadata。
func TestBuildMetadata(t *testing.T) {
	s := NewNeoDBSource(nil)
	item := NeoDBItem{
		Title: "三体", Author: "刘慈欣", Publisher: "重庆出版社",
		URL: "https://neodb.social/book/1", Rating: "8.6 (236 个评分)",
		PubYear: "2008", Description: "简介", CoverURL: "https://neodb.social/c/1.jpg",
	}
	mi := s.BuildMetadata(item, "9787536692930", false)

	if mi["title"] != "三体" || mi["author"] != "刘慈欣" || mi["author_sort"] != "刘慈欣" {
		t.Errorf("基本字段错误: %v", mi)
	}
	if mi["publisher"] != "重庆出版社" || mi["isbn"] != "9787536692930" {
		t.Errorf("出版字段错误: %v", mi)
	}
	if mi["source"] != "NeoDB" || mi["provider_key"] != "neodb" {
		t.Errorf("来源字段错误: %v", mi)
	}
	if mi["provider_value"] != "https://neodb.social/book/1" || mi["website"] != "https://neodb.social/book/1" {
		t.Errorf("URL 字段错误: %v", mi)
	}
	if mi["comments"] != "简介" {
		t.Errorf("comments = %v", mi["comments"])
	}
	// round(8.6) = 9
	if mi["rating"] != 9 {
		t.Errorf("rating = %v, want 9", mi["rating"])
	}
	if mi["pubdate"] != "2008-01-01T00:00:00+00:00" {
		t.Errorf("pubdate = %v", mi["pubdate"])
	}
	// copy_image=false 时不下载封面，只设 cover_url。
	if mi["cover_url"] != "https://neodb.social/c/1.jpg" {
		t.Errorf("cover_url = %v", mi["cover_url"])
	}
	if _, has := mi["cover_data"]; has {
		t.Error("copy_image=false 时不应有 cover_data")
	}
}

// TestBuildMetadataDefaults 覆盖默认值。
func TestBuildMetadataDefaults(t *testing.T) {
	s := NewNeoDBSource(nil)
	mi := s.BuildMetadata(NeoDBItem{Title: "T"}, "", false)
	if mi["author"] != "佚名" {
		t.Errorf("author = %v, want 佚名", mi["author"])
	}
	if _, has := mi["isbn"]; has {
		t.Error("空 isbn 不应写入")
	}
	if _, has := mi["comments"]; has {
		t.Error("空 description 不应写入")
	}
	if _, has := mi["rating"]; has {
		t.Error("空 rating 不应写入")
	}
	if _, has := mi["pubdate"]; has {
		t.Error("空 pub_year 不应写入")
	}
	if _, has := mi["cover_url"]; has {
		t.Error("空 cover_url 不应写入")
	}
}

// TestBuildMetadataInvalidRating 非法评分不写入。
func TestBuildMetadataInvalidRating(t *testing.T) {
	s := NewNeoDBSource(nil)
	mi := s.BuildMetadata(NeoDBItem{Title: "T", Rating: "abc"}, "", false)
	if _, has := mi["rating"]; has {
		t.Error("非法评分不应写入")
	}
}

// TestBuildMetadataInvalidYear 非法年份不写入。
func TestBuildMetadataInvalidYear(t *testing.T) {
	s := NewNeoDBSource(nil)
	mi := s.BuildMetadata(NeoDBItem{Title: "T", PubYear: "abcd"}, "", false)
	if _, has := mi["pubdate"]; has {
		t.Error("非法年份不应写入")
	}
}

// neoDBTestSource 构造指向测试服务器的源。
func neoDBTestSource(baseURL string) *NeoDBSource {
	s := NewNeoDBSource(&safehttp.SafeHttpClient{
		Resolver: func(host string, port int) ([]string, error) {
			return []string{"93.184.216.34"}, nil
		},
	})
	s.BaseURL = baseURL
	return s
}

// TestSearch 覆盖搜索。
func TestSearch(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("c") != "book" {
			t.Errorf("c 参数 = %q, want book", r.URL.Query().Get("c"))
		}
		w.Header().Set("Content-Type", "text/html")
		_, _ = w.Write([]byte(`<article class="item-card">
  <hgroup><h5><a href="/book/1">三体</a></h5></hgroup>
  <div class="multi-fields"><span>作者: <span>刘慈欣</span></span></div>
</article>`))
	}))
	defer srv.Close()

	s := neoDBTestSource(srv.URL)
	items := s.Search("三体", 1)
	if len(items) != 1 {
		t.Fatalf("条目数 = %d, want 1", len(items))
	}
	if items[0].Title != "三体" || items[0].Author != "刘慈欣" {
		t.Errorf("得到 %+v", items[0])
	}
	// 相对 href 用硬编码的 NeoDBBaseURL 拼绝对 URL。
	if items[0].URL != NeoDBBaseURL+"/book/1" {
		t.Errorf("url = %q", items[0].URL)
	}
}

// TestSearchMaxCount 覆盖 max_count 截断。
func TestSearchMaxCount(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		_, _ = w.Write([]byte(`<article class="item-card"><hgroup><h5><a href="/1">A</a></h5></hgroup></article>
<article class="item-card"><hgroup><h5><a href="/2">B</a></h5></hgroup></article>
<article class="item-card"><hgroup><h5><a href="/3">C</a></h5></hgroup></article>`))
	}))
	defer srv.Close()

	s := neoDBTestSource(srv.URL)
	if got := s.Search("x", 2); len(got) != 2 {
		t.Errorf("max_count=2 得到 %d 条", len(got))
	}
	// max_count <= 0 时默认 1。
	if got := s.Search("x", 0); len(got) != 1 {
		t.Errorf("max_count=0 得到 %d 条, want 1", len(got))
	}
}

// TestSearchRequestError 请求失败返回空列表。
func TestSearchRequestError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	s := neoDBTestSource(srv.URL)
	if got := s.Search("x", 1); len(got) != 0 {
		t.Errorf("得到 %d 条, want 0", len(got))
	}
}

// TestSearchInvalidHTML 非法 HTML 返回空列表。
func TestSearchInvalidHTML(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		_, _ = w.Write([]byte("<<<>>>"))
	}))
	defer srv.Close()

	s := neoDBTestSource(srv.URL)
	// 不应 panic。
	_ = s.Search("x", 1)
}

// TestGetCover 覆盖封面下载。
func TestGetCover(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/jpeg")
		_, _ = w.Write([]byte("JPEGDATA"))
	}))
	defer srv.Close()

	s := neoDBTestSource(srv.URL)
	got := s.GetCover(srv.URL + "/c/1.jpg")
	if got == nil {
		t.Fatal("应返回封面")
	}
	if got.Extension != "jpg" || string(got.Content) != "JPEGDATA" {
		t.Errorf("得到 %+v", got)
	}
}

// TestGetCoverNoExtension 无扩展名时默认 jpg。
func TestGetCoverNoExtension(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		_, _ = w.Write([]byte("PNG"))
	}))
	defer srv.Close()

	s := neoDBTestSource(srv.URL)
	got := s.GetCover(srv.URL + "/cover")
	if got == nil || got.Extension != "jpg" {
		t.Errorf("得到 %+v, want 扩展名 jpg", got)
	}
}

// TestGetCoverNonImage 非图片响应返回 nil。
func TestGetCoverNonImage(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		_, _ = w.Write([]byte("<html>"))
	}))
	defer srv.Close()

	s := neoDBTestSource(srv.URL)
	if got := s.GetCover(srv.URL + "/x"); got != nil {
		t.Errorf("非图片应返回 nil，得到 %+v", got)
	}
}

// TestGetCoverEmptyURL 空 URL 返回 nil。
func TestGetCoverEmptyURL(t *testing.T) {
	s := NewNeoDBSource(nil)
	if got := s.GetCover(""); got != nil {
		t.Errorf("空 URL 应返回 nil，得到 %+v", got)
	}
}

// TestGetCoverRequestError 请求失败返回 nil。
func TestGetCoverRequestError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	s := neoDBTestSource(srv.URL)
	if got := s.GetCover(srv.URL + "/x.jpg"); got != nil {
		t.Errorf("请求失败应返回 nil，得到 %+v", got)
	}
}

// TestPluginSearch 覆盖 NeodbMetaPlugin.search。
func TestPluginSearch(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		_, _ = w.Write([]byte(`<article class="item-card">
  <hgroup><h5><a href="/book/1">三体</a></h5></hgroup>
  <div class="multi-fields"><span>作者: <span>刘慈欣</span></span></div>
</article>`))
	}))
	defer srv.Close()

	p := NewNeoDBPlugin(neoDBTestSource(srv.URL))
	got := p.Search("三体", "", "")
	if len(got) != 1 || got[0]["title"] != "三体" {
		t.Errorf("得到 %v", got)
	}
}

// TestPluginSearchEmptyQuery 空查询返回 nil。
func TestPluginSearchEmptyQuery(t *testing.T) {
	p := NewNeoDBPlugin(nil)
	if got := p.Search("", "", ""); got != nil {
		t.Errorf("得到 %v, want nil", got)
	}
}

// TestPluginSearchPrefersISBN isbn 优先于 title。
func TestPluginSearchPrefersISBN(t *testing.T) {
	var gotQuery string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotQuery = r.URL.Query().Get("q")
		w.Header().Set("Content-Type", "text/html")
		_, _ = w.Write([]byte(`<article class="item-card"></article>`))
	}))
	defer srv.Close()

	p := NewNeoDBPlugin(neoDBTestSource(srv.URL))
	p.Search("三体", "9787536692930", "")
	if gotQuery != "9787536692930" {
		t.Errorf("query = %q, want isbn", gotQuery)
	}
}

// TestPluginSearchBest 覆盖 search_best。
func TestPluginSearchBest(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		_, _ = w.Write([]byte(`<article class="item-card">
  <hgroup><h5><a href="/book/1">三体</a></h5></hgroup>
</article>`))
	}))
	defer srv.Close()

	p := NewNeoDBPlugin(neoDBTestSource(srv.URL))
	got := p.SearchBest("", "三体")
	if got == nil || got["title"] != "三体" {
		t.Errorf("得到 %v", got)
	}
}

// TestPluginSearchBestEmpty 空查询返回 nil。
func TestPluginSearchBestEmpty(t *testing.T) {
	p := NewNeoDBPlugin(nil)
	if got := p.SearchBest("", ""); got != nil {
		t.Errorf("得到 %v, want nil", got)
	}
}

// TestPluginSearchBestNoResults 无结果返回 nil。
func TestPluginSearchBestNoResults(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		_, _ = w.Write([]byte(`<html></html>`))
	}))
	defer srv.Close()

	p := NewNeoDBPlugin(neoDBTestSource(srv.URL))
	if got := p.SearchBest("", "三体"); got != nil {
		t.Errorf("得到 %v, want nil", got)
	}
}

// TestPluginGetMetadataByProvider 覆盖按 provider_value 匹配。
func TestPluginGetMetadataByProvider(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		_, _ = w.Write([]byte(`<article class="item-card">
  <hgroup><h5><a href="/book/1">三体</a></h5></hgroup>
</article>`))
	}))
	defer srv.Close()

	p := NewNeoDBPlugin(neoDBTestSource(srv.URL))
	// ParseItemCard 用硬编码的 NeoDBBaseURL 拼绝对 URL（对齐 Python 的 _BASE_URL），
	// 因此 provider_value 也必须是该前缀。
	got := p.GetMetadataByProvider(NeoDBBaseURL+"/book/1", "", "三体", "")
	if got == nil || got["title"] != "三体" {
		t.Errorf("得到 %v", got)
	}
}

// TestPluginGetMetadataByProviderNoMatch 无匹配时返回 nil。
func TestPluginGetMetadataByProviderNoMatch(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		_, _ = w.Write([]byte(`<article class="item-card">
  <hgroup><h5><a href="/book/1">三体</a></h5></hgroup>
</article>`))
	}))
	defer srv.Close()

	p := NewNeoDBPlugin(neoDBTestSource(srv.URL))
	if got := p.GetMetadataByProvider("http://other/book/9", "", "三体", ""); got != nil {
		t.Errorf("得到 %v, want nil", got)
	}
}

// TestPluginGetMetadataByProviderCoverFallback 兜底下载封面。
func TestPluginGetMetadataByProviderCoverFallback(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/cover.jpg" {
			w.Header().Set("Content-Type", "image/jpeg")
			_, _ = w.Write([]byte("IMG"))
			return
		}
		w.Header().Set("Content-Type", "text/html")
		_, _ = w.Write([]byte(`<html></html>`))
	}))
	defer srv.Close()

	p := NewNeoDBPlugin(neoDBTestSource(srv.URL))
	got := p.GetMetadataByProvider("http://other/9", "", "三体", srv.URL+"/cover.jpg")
	if got == nil || got["cover_url"] != srv.URL+"/cover.jpg" {
		t.Errorf("得到 %v", got)
	}
	if _, has := got["cover_data"]; !has {
		t.Error("应包含 cover_data")
	}
}

// TestPluginGetMetadataByProviderNoQuery 无查询且无封面返回 nil。
func TestPluginGetMetadataByProviderNoQuery(t *testing.T) {
	p := NewNeoDBPlugin(nil)
	if got := p.GetMetadataByProvider("http://x/1", "", "", ""); got != nil {
		t.Errorf("得到 %v, want nil", got)
	}
}

// TestPluginGetCover 覆盖 get_cover。
func TestPluginGetCover(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/jpeg")
		_, _ = w.Write([]byte("IMG"))
	}))
	defer srv.Close()

	p := NewNeoDBPlugin(neoDBTestSource(srv.URL))
	if got := p.GetCover(srv.URL + "/c.jpg"); got == nil {
		t.Error("应返回封面")
	}
}

// TestNewNeoDBProvider 覆盖 provider 构造与清单。
func TestNewNeoDBProvider(t *testing.T) {
	p := NewNeoDBProvider(nil)
	if p.Manifest()["id"] != "talebook.meta.neodb" {
		t.Errorf("id = %v", p.Manifest()["id"])
	}
	if p.Manifest()["name"] != "NeoDB" {
		t.Errorf("name = %v", p.Manifest()["name"])
	}
	// default_enabled = False。
	if p.InitialEnabled(nil) {
		t.Error("默认应关闭")
	}
	// legacy_sources 命中时开启。
	if !p.InitialEnabled(map[string]any{"META_SELECTED_SOURCES": []any{"neodb"}}) {
		t.Error("命中 legacy 时应开启")
	}
}

// TestNeoDBProviderSearch 覆盖 provider 的 Search。
func TestNeoDBProviderSearch(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		_, _ = w.Write([]byte(`<article class="item-card">
  <hgroup><h5><a href="/book/1">三体</a></h5></hgroup>
</article>`))
	}))
	defer srv.Close()

	p := NewNeoDBProvider(neoDBTestSource(srv.URL))
	got, err := p.SearchBooks(plugindomain.MetadataQuery{Title: "三体"}, map[string]any{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(got) != 1 || got[0].GetString("title") != "三体" {
		t.Errorf("得到 %v", got)
	}
	// MetaSourceMixin.search_books 会用 manifest["id"] 覆盖 build_metadata
	// 写入的 KEY（"neodb"），因此最终值是 manifest id。
	if got[0].GetString("provider_key") != "talebook.meta.neodb" {
		t.Errorf("provider_key = %q, want talebook.meta.neodb", got[0].GetString("provider_key"))
	}
}

// TestNeoDBProviderFetch 覆盖 provider 的 Fetch。
func TestNeoDBProviderFetch(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		_, _ = w.Write([]byte(`<article class="item-card">
  <hgroup><h5><a href="/book/1">三体</a></h5></hgroup>
</article>`))
	}))
	defer srv.Close()

	p := NewNeoDBProvider(neoDBTestSource(srv.URL))
	got, err := p.Fetch(NeoDBBaseURL+"/book/1", map[string]any{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	// Fetch 不带 query，因此走不到匹配分支。
	if got != nil {
		t.Errorf("得到 %v, want nil", got)
	}
}

// TestNeoDBProviderSelfCheck 覆盖 self_check。
func TestNeoDBProviderSelfCheck(t *testing.T) {
	p := NewNeoDBProvider(nil)
	report, err := p.SelfCheck(map[string]any{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if !report.Healthy || report.Message != "NeoDB ready" {
		t.Errorf("得到 %+v", report)
	}
}

// TestBaseURLDefault 未设置 BaseURL 时用默认值。
func TestBaseURLDefault(t *testing.T) {
	s := NewNeoDBSource(nil)
	if got := s.baseURL(); got != NeoDBBaseURL {
		t.Errorf("baseURL = %q, want %q", got, NeoDBBaseURL)
	}
}

// TestNewNeoDBSourceNilHTTP nil HTTP 时自动创建。
func TestNewNeoDBSourceNilHTTP(t *testing.T) {
	s := NewNeoDBSource(nil)
	if s.HTTP == nil {
		t.Error("HTTP 不应为 nil")
	}
}

// TestNewNeoDBPluginNilSource nil source 时自动创建。
func TestNewNeoDBPluginNilSource(t *testing.T) {
	p := NewNeoDBPlugin(nil)
	if p.Source == nil {
		t.Error("Source 不应为 nil")
	}
}

// TestSearchReadError 响应读取失败返回空列表。
func TestSearchReadError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Length", "100")
		w.Header().Set("Content-Type", "text/html")
		_, _ = w.Write([]byte("short"))
	}))
	defer srv.Close()

	s := neoDBTestSource(srv.URL)
	// 读取失败或成功都不应 panic。
	_ = s.Search("x", 1)
}

// TestGetCoverReadError 封面读取失败返回 nil。
func TestGetCoverReadError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/jpeg")
		w.Header().Set("Content-Length", "100")
		_, _ = w.Write([]byte("short"))
	}))
	defer srv.Close()

	s := neoDBTestSource(srv.URL)
	// 读取失败或成功都不应 panic。
	_ = s.GetCover(srv.URL + "/c.jpg")
}

// TestGetCoverInvalidURL 非法 URL 返回 nil。
func TestGetCoverInvalidURL(t *testing.T) {
	s := NewNeoDBSource(nil)
	if got := s.GetCover("://bad"); got != nil {
		t.Errorf("得到 %+v, want nil", got)
	}
}

// TestParseRatingInvalidFloat 无法解析的浮点返回 false。
func TestParseRatingInvalidFloat(t *testing.T) {
	// "1.2.3" 能匹配正则但 ParseFloat 失败。
	if _, ok := ParseRating("1.2.3"); ok {
		t.Error("非法浮点应返回 false")
	}
}

// TestBuildMetadataCopyImage 覆盖 copy_image=true 的封面下载。
func TestBuildMetadataCopyImage(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/jpeg")
		_, _ = w.Write([]byte("IMG"))
	}))
	defer srv.Close()

	s := neoDBTestSource(srv.URL)
	mi := s.BuildMetadata(NeoDBItem{Title: "T", CoverURL: srv.URL + "/c.jpg"}, "", true)
	if _, has := mi["cover_data"]; !has {
		t.Error("copy_image=true 时应包含 cover_data")
	}
	if mi["cover_url"] != srv.URL+"/c.jpg" {
		t.Errorf("cover_url = %v", mi["cover_url"])
	}
}

// TestBuildMetadataCopyImageFailure 封面下载失败时仍设 cover_url。
func TestBuildMetadataCopyImageFailure(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	s := neoDBTestSource(srv.URL)
	mi := s.BuildMetadata(NeoDBItem{Title: "T", CoverURL: srv.URL + "/c.jpg"}, "", true)
	if _, has := mi["cover_data"]; has {
		t.Error("下载失败时不应有 cover_data")
	}
	if mi["cover_url"] != srv.URL+"/c.jpg" {
		t.Errorf("cover_url = %v", mi["cover_url"])
	}
}

// TestNeoDBConstants 覆盖常量。
func TestNeoDBConstants(t *testing.T) {
	if NeoDBKey != "neodb" {
		t.Errorf("key = %q", NeoDBKey)
	}
	if NeoDBBaseURL != "https://neodb.social" {
		t.Errorf("base = %q", NeoDBBaseURL)
	}
	if len(neoDBHeaders) != 3 {
		t.Errorf("headers 数 = %d, want 3", len(neoDBHeaders))
	}
}
