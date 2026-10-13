package metasource

import (
	"reflect"
	"testing"
)

// TestStripCardMarkup 对齐 Python _strip_card_markup 的 7 组向量。
func TestStripCardMarkup(t *testing.T) {
	cases := []struct{ in, want string }{
		{"三体", "三体"},
		{"<b>三体</b>", "三体"},
		{"<div>a<span>b</span>c</div>", "abc"},
		{"a&amp;b", "a&b"},
		{"a&nbsp;b", "a\u00a0b"},
		{"", ""},
		{"123", "123"},
	}
	for _, tc := range cases {
		if got := StripCardMarkup(tc.in); got != tc.want {
			t.Errorf("StripCardMarkup(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

// TestTrustedCoverURL 对齐 Python _trusted_cover_url 的 11 组向量。
func TestTrustedCoverURL(t *testing.T) {
	cases := []struct{ in, want string }{
		{"https://bkimg.cdn.bcebos.com/pic/a.jpg", "https://bkimg.cdn.bcebos.com/pic/a.jpg"},
		{"https://bkimg.cdn.bcebos.com/pic/a.jpg?x=1", "https://bkimg.cdn.bcebos.com/pic/a.jpg?x=1"},
		{"http://bkimg.cdn.bcebos.com/a.jpg", ""},
		{"https://evil.com/a.jpg", ""},
		{"https://bkimg.cdn.bcebos.com:8080/a.jpg", ""},
		{"https://bkimg.cdn.bcebos.com:443/a.jpg", "https://bkimg.cdn.bcebos.com/a.jpg"},
		{"https://u:p@bkimg.cdn.bcebos.com/a.jpg", ""},
		{"https://bkimg.cdn.bcebos.com:99999/a.jpg", ""},
		{"HTTPS://bkimg.cdn.bcebos.com/a.jpg", "https://bkimg.cdn.bcebos.com/a.jpg"},
		{"", ""},
		{"https://bkimg.cdn.bcebos.com", "https://bkimg.cdn.bcebos.com/"},
	}
	for _, tc := range cases {
		if got := TrustedCoverURL(tc.in); got != tc.want {
			t.Errorf("TrustedCoverURL(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

// baikeVectorEntry 与 Python 侧 tmp_baike.py 的 ENTRY 一致。
func baikeVectorEntry() map[string]any {
	return map[string]any{
		"card": []any{
			map[string]any{"name": "作者", "value": "刘慈欣"},
			map[string]any{"name": "出版社", "value": "<b>重庆出版社</b>"},
			map[string]any{"name": "ISBN", "value": "9787536692930"},
			map[string]any{"name": "标签", "value": []any{"a", "b"}},
			map[string]any{"key": "keyname", "value": "v"},
			map[string]any{"name": "empty", "value": ""},
			map[string]any{"name": "none", "value": nil},
			map[string]any{"name": "  spaced  ", "value": "  x  "},
			"notadict",
			map[string]any{"name": "listmix", "value": []any{"<i>p</i>", "", "q"}},
		},
	}
}

// TestBaikeCardInfo 对齐 Python _card_info 的 3 组向量。
func TestBaikeCardInfo(t *testing.T) {
	src := NewBaikeSource(nil)
	got := src.CardInfo(baikeVectorEntry())
	want := map[string]string{
		"作者": "刘慈欣", "出版社": "重庆出版社", "ISBN": "9787536692930",
		"标签": "a、b", "keyname": "v", "spaced": "x", "listmix": "p、q",
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("CardInfo = %v, want %v", got, want)
	}
	if got := src.CardInfo(map[string]any{}); len(got) != 0 {
		t.Errorf("空 entry = %v", got)
	}
	if got := src.CardInfo(map[string]any{"card": nil}); len(got) != 0 {
		t.Errorf("card 为 nil = %v", got)
	}
}

// TestBaikeNormalize 对齐 Python _normalize 的 7 组向量。
func TestBaikeNormalize(t *testing.T) {
	src := NewBaikeSource(nil)
	cases := []struct{ in, want string }{
		{"三体", "三体"},
		{"三体（全集）!", "三体全集"},
		{"ABC", "abc"},
		{"", ""},
		{"a_b", "ab"},
		{"123", "123"},
	}
	for _, tc := range cases {
		if got := src.Normalize(tc.in); got != tc.want {
			t.Errorf("Normalize(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

// TestBaikeIsBookEntry 对齐 Python _is_book_entry 的 9 组向量。
func TestBaikeIsBookEntry(t *testing.T) {
	src := NewBaikeSource(nil)
	cases := []struct {
		name   string
		entry  map[string]any
		title  string
		author string
		want   bool
	}{
		{"ok", map[string]any{"title": "三体", "card": []any{map[string]any{"name": "作者", "value": "刘慈欣"}}}, "三体", "", true},
		{"substr", map[string]any{"title": "三体（全集）", "card": []any{map[string]any{"name": "作者", "value": "A"}}}, "三体", "", true},
		{"mismatch", map[string]any{"title": "流浪地球", "card": []any{map[string]any{"name": "作者", "value": "A"}}}, "三体", "", false},
		{"no_bookfield", map[string]any{"title": "三体", "card": []any{map[string]any{"name": "中文名", "value": "三体"}}}, "三体", "", false},
		{"author_ok", map[string]any{"title": "三体", "card": []any{map[string]any{"name": "作者", "value": "刘慈欣"}}}, "三体", "刘慈欣", true},
		{"author_bad", map[string]any{"title": "三体", "card": []any{map[string]any{"name": "作者", "value": "别人"}}}, "三体", "刘慈欣", false},
		{"author_missing", map[string]any{"title": "三体", "card": []any{map[string]any{"name": "ISBN", "value": "1"}}}, "三体", "刘慈欣", true},
		{"empty_title", map[string]any{"title": "", "card": []any{map[string]any{"name": "作者", "value": "A"}}}, "三体", "", false},
		{"works_name", map[string]any{"card": []any{
			map[string]any{"name": "作品名称", "value": "三体"},
			map[string]any{"name": "作者", "value": "A"},
		}}, "三体", "", true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := src.IsBookEntry(tc.entry, tc.title, tc.author); got != tc.want {
				t.Errorf("IsBookEntry = %v, want %v", got, tc.want)
			}
		})
	}
}

// TestBaikeBuildMetadata 对齐 Python _metadata 的 11 组向量。
func TestBaikeBuildMetadata(t *testing.T) {
	src := NewBaikeSource(nil)

	t.Run("full", func(t *testing.T) {
		mi := src.BuildMetadata(map[string]any{
			"newLemmaId": float64(12345), "title": "三体", "abstract": "简介",
			"card": []any{
				map[string]any{"name": "作者", "value": "刘慈欣"},
				map[string]any{"name": "出版社", "value": "重庆出版社"},
				map[string]any{"name": "ISBN", "value": "9787536692930"},
				map[string]any{"name": "出版时间", "value": "2008-01-01"},
			},
			"tag":   []any{"科幻", " 文学 "},
			"image": "https://bkimg.cdn.bcebos.com/a.jpg",
		}, false)
		if mi["title"] != "三体" {
			t.Errorf("title = %v", mi["title"])
		}
		if !reflect.DeepEqual(mi["authors"], []any{"刘慈欣"}) {
			t.Errorf("authors = %v", mi["authors"])
		}
		if mi["publisher"] != "重庆出版社" {
			t.Errorf("publisher = %v", mi["publisher"])
		}
		if mi["isbn"] != "9787536692930" {
			t.Errorf("isbn = %v", mi["isbn"])
		}
		if !reflect.DeepEqual(mi["tags"], []any{"科幻", "文学"}) {
			t.Errorf("tags = %v", mi["tags"])
		}
		if mi["pubdate"] != "2008-01-01T00:00:00+00:00" {
			t.Errorf("pubdate = %v", mi["pubdate"])
		}
		if mi["cover_url"] != "https://bkimg.cdn.bcebos.com/a.jpg" {
			t.Errorf("cover_url = %v", mi["cover_url"])
		}
		if mi["comments"] != "简介" {
			t.Errorf("comments = %v", mi["comments"])
		}
		if mi["website"] != "https://baike.baidu.com/item/12345" {
			t.Errorf("website = %v", mi["website"])
		}
		if mi["source"] != "百度百科" || mi["provider_key"] != BaikeKey {
			t.Errorf("source/provider_key = %v / %v", mi["source"], mi["provider_key"])
		}
		if mi["provider_value"] != "12345" {
			t.Errorf("provider_value = %v", mi["provider_value"])
		}
	})

	t.Run("no_title", func(t *testing.T) {
		got := src.BuildMetadata(map[string]any{"card": []any{map[string]any{"name": "作者", "value": "A"}}}, false)
		if got != nil {
			t.Errorf("无 title 应返回 nil, 得到 %v", got)
		}
	})

	t.Run("default_isbn", func(t *testing.T) {
		mi := src.BuildMetadata(map[string]any{
			"id": float64(1), "title": "T",
			"card": []any{map[string]any{"name": "作者", "value": "A"}},
		}, false)
		if mi["isbn"] != BaikeISBN {
			t.Errorf("isbn = %v, want %s", mi["isbn"], BaikeISBN)
		}
		if mi["cover_url"] != "" {
			t.Errorf("cover_url = %v, want 空串", mi["cover_url"])
		}
		if mi["comments"] != "" {
			t.Errorf("comments = %v, want 空串", mi["comments"])
		}
	})

	t.Run("tags_string", func(t *testing.T) {
		mi := src.BuildMetadata(map[string]any{
			"id": float64(1), "title": "T", "tags": "a，b,c",
			"card": []any{map[string]any{"name": "作者", "value": "A"}},
		}, false)
		if !reflect.DeepEqual(mi["tags"], []any{"a", "b", "c"}) {
			t.Errorf("tags = %v", mi["tags"])
		}
	})

	t.Run("tags_cap", func(t *testing.T) {
		raw := make([]any, 0, 12)
		for i := 0; i < 12; i++ {
			raw = append(raw, "t"+string(rune('0'+i)))
		}
		mi := src.BuildMetadata(map[string]any{
			"id": float64(1), "title": "T", "tag": raw,
			"card": []any{map[string]any{"name": "作者", "value": "A"}},
		}, false)
		want := []any{"t0", "t1", "t2", "t3", "t4", "t5", "t6", "t7"}
		if !reflect.DeepEqual(mi["tags"], want) {
			t.Errorf("tags = %v, want %v", mi["tags"], want)
		}
	})

	t.Run("image_dict_url", func(t *testing.T) {
		mi := src.BuildMetadata(map[string]any{
			"id": float64(1), "title": "T",
			"image": map[string]any{"url": "https://x/a.jpg"},
			"card":  []any{map[string]any{"name": "作者", "value": "A"}},
		}, false)
		if mi["cover_url"] != "https://x/a.jpg" {
			t.Errorf("cover_url = %v", mi["cover_url"])
		}
	})

	t.Run("image_dict_imageUrl", func(t *testing.T) {
		mi := src.BuildMetadata(map[string]any{
			"id": float64(1), "title": "T",
			"image": map[string]any{"imageUrl": "https://x/b.jpg"},
			"card":  []any{map[string]any{"name": "作者", "value": "A"}},
		}, false)
		if mi["cover_url"] != "https://x/b.jpg" {
			t.Errorf("cover_url = %v", mi["cover_url"])
		}
	})

	t.Run("desc_fallback", func(t *testing.T) {
		mi := src.BuildMetadata(map[string]any{
			"id": float64(1), "title": "T", "desc": "来自desc",
			"card": []any{map[string]any{"name": "作者", "value": "A"}},
		}, false)
		if mi["comments"] != "来自desc" {
			t.Errorf("comments = %v", mi["comments"])
		}
	})

	t.Run("first_pub_time", func(t *testing.T) {
		mi := src.BuildMetadata(map[string]any{
			"id": float64(1), "title": "T",
			"card": []any{
				map[string]any{"name": "作者", "value": "A"},
				map[string]any{"name": "首版时间", "value": "1999年"},
			},
		}, false)
		if mi["pubdate"] != "1999-01-01T00:00:00+00:00" {
			t.Errorf("pubdate = %v", mi["pubdate"])
		}
	})

	t.Run("no_author", func(t *testing.T) {
		mi := src.BuildMetadata(map[string]any{
			"id": float64(1), "title": "T",
			"card": []any{map[string]any{"name": "ISBN", "value": "1"}},
		}, false)
		if !reflect.DeepEqual(mi["authors"], []any{"佚名"}) {
			t.Errorf("authors = %v", mi["authors"])
		}
	})

	t.Run("title_priority", func(t *testing.T) {
		mi := src.BuildMetadata(map[string]any{
			"id": float64(1), "title": "entry标题",
			"card": []any{
				map[string]any{"name": "作品名称", "value": "作品名"},
				map[string]any{"name": "作者", "value": "A"},
			},
		}, false)
		if mi["title"] != "作品名" {
			t.Errorf("title = %v, want 作品名", mi["title"])
		}
	})
}

// TestBaikeTitlePrefixStrip 对齐标题前缀剥除的 5 组向量。
func TestBaikeTitlePrefixStrip(t *testing.T) {
	cases := []struct{ in, want string }{
		{"123_三体", "三体"},
		{"12-三体", "三体"},
		{"三体", "三体"},
		{"_三体", "三体"},
		{"1三体", "1三体"},
	}
	for _, tc := range cases {
		got := tc.in
		if baikeTitlePrefixRe.MatchString(tc.in) {
			got = baikeTitlePrefixRe.ReplaceAllString(tc.in, "")
		}
		if got != tc.want {
			t.Errorf("前缀剥除(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

// TestBaikeReference 对齐引用编解码。
func TestBaikeReference(t *testing.T) {
	encoded := EncodeBaikeReference("三体", "刘慈欣", "12345")
	want := `baike:v1:{"title":"三体","author":"刘慈欣","id":"12345"}`
	if encoded != want {
		t.Errorf("EncodeBaikeReference = %q, want %q", encoded, want)
	}

	title, author, id, ok := DecodeBaikeReference(encoded)
	if !ok || title != "三体" || author != "刘慈欣" || id != "12345" {
		t.Errorf("DecodeBaikeReference = (%q, %q, %q, %v)", title, author, id, ok)
	}
}

// TestDecodeBaikeReferenceRejects 校验 _fetch 的入参校验。
func TestDecodeBaikeReferenceRejects(t *testing.T) {
	cases := []struct {
		name string
		in   string
	}{
		{"no_prefix", "12345"},
		{"bad_json", "baike:v1:{bad}"},
		{"not_dict", "baike:v1:[1,2]"},
		{"empty_title", `baike:v1:{"title":"","author":"","id":"1"}`},
		{"bad_id", `baike:v1:{"title":"T","author":"","id":"abc"}`},
		{"id_too_long", `baike:v1:{"title":"T","author":"","id":"123456789012345678901"}`},
		{"title_too_long", "baike:v1:" + `{"title":"` + longString(513) + `","author":"","id":"1"}`},
		{"author_too_long", "baike:v1:" + `{"title":"T","author":"` + longString(513) + `","id":"1"}`},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if _, _, _, ok := DecodeBaikeReference(tc.in); ok {
				t.Errorf("应被拒绝: %s", tc.in)
			}
		})
	}
	// 超长输入直接拒绝。
	if _, _, _, ok := DecodeBaikeReference(longString(4097)); ok {
		t.Error("超长输入应被拒绝")
	}
}

// longString 生成 n 个 'a'。
func longString(n int) string {
	b := make([]byte, n)
	for i := range b {
		b[i] = 'a'
	}
	return string(b)
}

// TestBaikeConstants 校验常量。
func TestBaikeConstants(t *testing.T) {
	if BaikeISBN != "0000000000001" {
		t.Errorf("BaikeISBN = %q", BaikeISBN)
	}
	if BaikeKey != "BaiduBaike" {
		t.Errorf("BaikeKey = %q", BaikeKey)
	}
	if BaikeCoverHost != "bkimg.cdn.bcebos.com" {
		t.Errorf("BaikeCoverHost = %q", BaikeCoverHost)
	}
	if BaikeAttempts != 3 || BaikeTimeout != 15 {
		t.Errorf("attempts/timeout = %d / %d", BaikeAttempts, BaikeTimeout)
	}
	if BaikeReferencePrefix != "baike:v1:" {
		t.Errorf("BaikeReferencePrefix = %q", BaikeReferencePrefix)
	}
}

// TestBaikeGetCoverValidation 校验封面协议与主机白名单。
func TestBaikeGetCoverValidation(t *testing.T) {
	src := NewBaikeSource(nil)
	if got := src.GetCover("", true); got != nil {
		t.Errorf("空 URL 应返回 nil, 得到 %+v", got)
	}
	if got := src.GetCover("https://evil.com/a.jpg", true); got != nil {
		t.Errorf("非白名单主机应返回 nil, 得到 %+v", got)
	}
	if got := src.GetCover("http://bkimg.cdn.bcebos.com/a.jpg", true); got != nil {
		t.Errorf("http 应返回 nil, 得到 %+v", got)
	}
}

// TestBaikeErrnoOK 校验 errno 判定。
func TestBaikeErrnoOK(t *testing.T) {
	if !baikeErrnoOK(nil) || !baikeErrnoOK(float64(0)) || !baikeErrnoOK("0") {
		t.Error("None/0/\"0\" 应视为成功")
	}
	if baikeErrnoOK(float64(1)) || baikeErrnoOK("1") {
		t.Error("非零 errno 应视为失败")
	}
}

// TestBaikeEntryID 校验词条 ID 提取。
func TestBaikeEntryID(t *testing.T) {
	if got := baikeEntryID(map[string]any{"newLemmaId": float64(123)}); got != "123" {
		t.Errorf("newLemmaId = %q", got)
	}
	if got := baikeEntryID(map[string]any{"id": float64(456)}); got != "456" {
		t.Errorf("id = %q", got)
	}
	// newLemmaId 优先。
	if got := baikeEntryID(map[string]any{"newLemmaId": float64(1), "id": float64(2)}); got != "1" {
		t.Errorf("优先级 = %q", got)
	}
	if got := baikeEntryID(map[string]any{}); got != "" {
		t.Errorf("空 entry = %q", got)
	}
}
