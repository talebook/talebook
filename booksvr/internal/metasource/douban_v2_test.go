package metasource

import (
	"reflect"
	"testing"
)

// TestParseJSChallengeCookies 对齐 Python _parse_js_challenge_cookies 的 5 组向量。
func TestParseJSChallengeCookies(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want map[string]string
	}{
		{
			name: "full",
			in:   "var x = {WTKkN: 100, bOYDu: 20, wyeCN: 3}; iTyzs(a, 98765);",
			want: map[string]string{"__tst_status": "123", "EO_Bot_Ssid": "98765"},
		},
		{
			name: "partial",
			in:   "WTKkN: 100, bOYDu: 20",
			want: map[string]string{},
		},
		{
			name: "only_eo",
			in:   "iTyzs(x, 42)",
			want: map[string]string{"EO_Bot_Ssid": "42"},
		},
		{
			name: "none",
			in:   "nothing here",
			want: map[string]string{},
		},
		{
			name: "spaces",
			in:   "WTKkN : 1 , bOYDu : 2 , wyeCN : 3",
			want: map[string]string{"__tst_status": "6"},
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := ParseJSChallengeCookies(tc.in)
			if !reflect.DeepEqual(got, tc.want) {
				t.Errorf("ParseJSChallengeCookies(%q) = %v, want %v", tc.in, got, tc.want)
			}
		})
	}
}

// TestParseDoubanV2Abstract 对齐 Python _parse_abstract 的 5 组向量。
func TestParseDoubanV2Abstract(t *testing.T) {
	cases := []struct {
		in   string
		want DoubanV2Abstract
	}{
		{"刘慈欣 / 重庆出版社 / 2008-01-01 / 23.00元", DoubanV2Abstract{"刘慈欣", "重庆出版社", "2008-01-01"}},
		{"作者A / 出版社B", DoubanV2Abstract{"作者A", "出版社B", ""}},
		{"只有作者", DoubanV2Abstract{"只有作者", "", ""}},
		{"", DoubanV2Abstract{"", "", ""}},
		{"  A  /  B  /  C  ", DoubanV2Abstract{"A", "B", "C"}},
	}
	for _, tc := range cases {
		if got := ParseDoubanV2Abstract(tc.in); got != tc.want {
			t.Errorf("ParseDoubanV2Abstract(%q) = %+v, want %+v", tc.in, got, tc.want)
		}
	}
}

// TestDoubanStr2DateVectors 对齐 Python _parse_date 的 8 组向量。
func TestDoubanStr2DateVectors(t *testing.T) {
	cases := []struct{ in, want string }{
		{"2008-01-01", "2008-01-01T00:00:00+00:00"},
		{"2008/01/01", "2008-01-01T00:00:00+00:00"},
		{"2008-01", "2008-01-01T00:00:00+00:00"},
		{"2008年1月1日", "2008-01-01T00:00:00+00:00"},
		{"2008年1月", "2008-01-01T00:00:00+00:00"},
		{"2008年", "2008-01-01T00:00:00+00:00"},
		{"2008", "2008-01-01T00:00:00+00:00"},
		{"abc", ""},
	}
	for _, tc := range cases {
		got := ""
		if d := DoubanStr2Date(tc.in); d != nil {
			got = formatUTCDate(*d)
		}
		if got != tc.want {
			t.Errorf("DoubanStr2Date(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

// doubanV2DetailHTML 与 Python 侧 tmp_d2.py 的用例一致。
const (
	doubanV2DetailPrimary = `<html><head>` +
		`<meta property="book:author" content="刘慈欣"/>` +
		`<meta property="book:author" content="第二作者"/>` +
		`<meta property="book:isbn" content="9787536692930"/>` +
		`</head><body>` +
		`<span class="all"><div class="intro">简介<b>加粗</b>结尾</div></span>` +
		`</body></html>`

	doubanV2DetailFallback = `<html><body>` +
		`<div class="intro">兜底简介</div>` +
		`</body></html>`

	doubanV2DetailNested = `<html><body>` +
		`<span class="all"><div class="intro">外层<div>内层</div>尾部</div></span>` +
		`</body></html>`

	doubanV2DetailEmptyIntro = `<html><body>` +
		`<span class="all"><div class="intro">   </div></span>` +
		`<div class="intro">兜底生效</div>` +
		`</body></html>`

	doubanV2DetailAttrs = `<html><body>` +
		`<span class="all"><div class="intro">文本<img src="a.png" alt="x"/></div></span>` +
		`</body></html>`
)

// parseDoubanV2Detail 是测试辅助：跑一遍解析器并取出结果。
func parseDoubanV2Detail(t *testing.T, html string) ([]string, string, string) {
	t.Helper()
	p := newDoubanV2IntroParser()
	if err := p.Feed(html); err != nil {
		t.Fatalf("Feed: %v", err)
	}
	return p.Authors, p.ISBN, p.GetIntro()
}

// TestDoubanV2DetailParser 对齐 Python _BookDetailParser 的 6 组向量。
func TestDoubanV2DetailParser(t *testing.T) {
	t.Run("primary", func(t *testing.T) {
		authors, isbn, intro := parseDoubanV2Detail(t, doubanV2DetailPrimary)
		if !reflect.DeepEqual(authors, []string{"刘慈欣", "第二作者"}) {
			t.Errorf("authors = %v", authors)
		}
		if isbn != "9787536692930" {
			t.Errorf("isbn = %q", isbn)
		}
		if intro != "简介<b>加粗</b>结尾" {
			t.Errorf("intro = %q", intro)
		}
	})

	t.Run("fallback", func(t *testing.T) {
		authors, isbn, intro := parseDoubanV2Detail(t, doubanV2DetailFallback)
		if len(authors) != 0 || isbn != "" {
			t.Errorf("authors/isbn = %v / %q", authors, isbn)
		}
		if intro != "兜底简介" {
			t.Errorf("intro = %q", intro)
		}
	})

	t.Run("nested", func(t *testing.T) {
		_, _, intro := parseDoubanV2Detail(t, doubanV2DetailNested)
		if intro != "外层<div>内层</div>尾部" {
			t.Errorf("intro = %q", intro)
		}
	})

	t.Run("empty_intro_falls_back", func(t *testing.T) {
		_, _, intro := parseDoubanV2Detail(t, doubanV2DetailEmptyIntro)
		if intro != "兜底生效" {
			t.Errorf("intro = %q", intro)
		}
	})

	t.Run("attrs_preserved", func(t *testing.T) {
		_, _, intro := parseDoubanV2Detail(t, doubanV2DetailAttrs)
		// Python 的 HTMLParser 对自闭合标签同时触发 start 与 end 事件。
		if intro != `文本<img src="a.png" alt="x"></img>` {
			t.Errorf("intro = %q", intro)
		}
	})

	t.Run("empty", func(t *testing.T) {
		authors, isbn, intro := parseDoubanV2Detail(t, "<html></html>")
		if len(authors) != 0 || isbn != "" || intro != "" {
			t.Errorf("空文档 = %v / %q / %q", authors, isbn, intro)
		}
	})
}

// TestNormalizeDoubanV2CoverURL 对齐封面尺寸替换。
func TestNormalizeDoubanV2CoverURL(t *testing.T) {
	cases := []struct{ in, want string }{
		{"https://x/m/public/s1.jpg", "https://x/l/public/s1.jpg"},
		{"https://x/s/public/s1.jpg", "https://x/l/public/s1.jpg"},
		{"https://x/l/public/s1.jpg", "https://x/l/public/s1.jpg"},
	}
	for _, tc := range cases {
		if got := normalizeDoubanV2CoverURL(tc.in); got != tc.want {
			t.Errorf("normalize(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

// TestDoubanV2IDString 校验 str(item.get("id", "")) 的表示。
func TestDoubanV2IDString(t *testing.T) {
	cases := []struct {
		in   any
		want string
	}{
		{nil, ""},
		{"abc", "abc"},
		{float64(2567698), "2567698"},
		{float64(2), "2"},
		{float64(1.5), "1.5"},
	}
	for _, tc := range cases {
		if got := doubanV2IDString(tc.in); got != tc.want {
			t.Errorf("doubanV2IDString(%v) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

// TestDoubanV2ParseItem 校验搜索结果条目解析。
func TestDoubanV2ParseItem(t *testing.T) {
	obj := map[string]any{
		"tpl_name":  "search_subject",
		"title":     "三体",
		"abstract":  "刘慈欣 / 重庆出版社 / 2008-01-01 / 23元",
		"url":       "https://book.douban.com/subject/2567698/",
		"id":        float64(2567698),
		"cover_url": "https://img1.doubanio.com/view/subject/m/public/s1.jpg",
		"rating":    map[string]any{"value": 8.9},
	}
	got := parseDoubanV2Item(obj)
	if got.Title != "三体" || got.ID != "2567698" {
		t.Errorf("title/id = %q / %q", got.Title, got.ID)
	}
	if got.Rating != 8.9 || !got.HasRating {
		t.Errorf("rating = %v / %v", got.Rating, got.HasRating)
	}
	if got.URL != "https://book.douban.com/subject/2567698/" {
		t.Errorf("url = %q", got.URL)
	}
}

// TestDoubanV2ParseItemNoRating 校验无 rating 字段时 HasRating 为 false。
func TestDoubanV2ParseItemNoRating(t *testing.T) {
	got := parseDoubanV2Item(map[string]any{"title": "T"})
	if got.HasRating {
		t.Error("无 rating 字段时 HasRating 应为 false")
	}
}

// TestDoubanV2Constants 校验常量。
func TestDoubanV2Constants(t *testing.T) {
	if DoubanV2Key != "douban_v2" {
		t.Errorf("DoubanV2Key = %q", DoubanV2Key)
	}
	if DoubanV2SearchBase != "https://search.douban.com/book/subject_search" {
		t.Errorf("DoubanV2SearchBase = %q", DoubanV2SearchBase)
	}
	if DoubanV2Referer != "https://book.douban.com/" {
		t.Errorf("DoubanV2Referer = %q", DoubanV2Referer)
	}
}

// TestJoinCookies 校验 Cookie 头拼接顺序固定。
func TestJoinCookies(t *testing.T) {
	got := joinCookies(map[string]string{"__tst_status": "123", "EO_Bot_Ssid": "42"})
	if got != "__tst_status=123; EO_Bot_Ssid=42" {
		t.Errorf("joinCookies = %q", got)
	}
	if got := joinCookies(map[string]string{}); got != "" {
		t.Errorf("空 cookie = %q", got)
	}
}

// TestDoubanV2GetCoverEmptyURL 校验空 URL 返回 nil。
func TestDoubanV2GetCoverEmptyURL(t *testing.T) {
	src := NewDoubanV2Source(nil)
	if got := src.GetCover("", ""); got != nil {
		t.Errorf("空 URL 应返回 nil, 得到 %+v", got)
	}
	// 无扩展名也返回 nil。
	if got := src.GetCover("https://x/noext", ""); got != nil {
		t.Errorf("无扩展名应返回 nil, 得到 %+v", got)
	}
}
