package metasource

import (
	"reflect"
	"strings"
	"testing"
)

// TestTrustedXhsdCoverURL 对齐 Python _trusted_cover_url 的 12 组向量。
func TestTrustedXhsdCoverURL(t *testing.T) {
	cases := []struct {
		in       string
		wantURL  string
		wantHost string
	}{
		{"https://img1.xinhuashudian.com/a.jpg", "https://img1.xinhuashudian.com/a.jpg", "img1.xinhuashudian.com"},
		{"https://img9.xinhuashudian.com/a.jpg?x=1", "https://img9.xinhuashudian.com/a.jpg?x=1", "img9.xinhuashudian.com"},
		{"https://img10.xinhuashudian.com/a.jpg", "", ""},
		{"https://evil.com/a.jpg", "", ""},
		{"http://img1.xinhuashudian.com/a.jpg", "", ""},
		{"https://img1.xinhuashudian.com:8080/a.jpg", "", ""},
		{"https://img1.xinhuashudian.com:443/a.jpg", "https://img1.xinhuashudian.com/a.jpg", "img1.xinhuashudian.com"},
		{"https://u:p@img1.xinhuashudian.com/a.jpg", "", ""},
		{"https://img1.xinhuashudian.com:99999/a.jpg", "", ""},
		{"HTTPS://img1.xinhuashudian.com/a.jpg", "https://img1.xinhuashudian.com/a.jpg", "img1.xinhuashudian.com"},
		{"", "", ""},
		{"https://img1.xinhuashudian.com", "https://img1.xinhuashudian.com/", "img1.xinhuashudian.com"},
	}
	for _, tc := range cases {
		gotURL, gotHost := TrustedXhsdCoverURL(tc.in)
		if gotURL != tc.wantURL || gotHost != tc.wantHost {
			t.Errorf("TrustedXhsdCoverURL(%q) = (%q, %q), want (%q, %q)",
				tc.in, gotURL, gotHost, tc.wantURL, tc.wantHost)
		}
	}
}

// TestXhsdISBNDetection 对齐 get_book 的 ISBN 判定。
func TestXhsdISBNDetection(t *testing.T) {
	cases := []struct {
		in   string
		want bool
	}{
		{"9787536692930", true},
		{"978-7536-69293-0", true},
		{"三体", false},
		{"12345", false},
		{"97875366929301", false},
	}
	for _, tc := range cases {
		clean := pyStrip(strings.ReplaceAll(tc.in, "-", ""))
		if got := xhsdISBNRe.MatchString(clean); got != tc.want {
			t.Errorf("ISBN 判定(%q) = %v, want %v", tc.in, got, tc.want)
		}
	}
}

// TestXhsdIntroProcessing 对齐简介处理的 7 组向量。
func TestXhsdIntroProcessing(t *testing.T) {
	cases := []struct{ in, want string }{
		{"<p>第一段</p><p>第二段</p>", "第一段\n第二段"},
		{"<p>【内容简介】：正文</p>", "正文"},
		{"<p>【内容简介】:正文</p>", "正文"},
		{`<p>"带引号"</p>`, "带引号"},
		{"<p>a\u200bb\u200cc\ufeffd</p>", "abcd"},
		{"", ""},
		{"<div><p>a</p><span>b</span></div>", "a\nb"},
	}
	for _, tc := range cases {
		got := processXhsdIntro(tc.in)
		if got != tc.want {
			t.Errorf("简介处理(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

// processXhsdIntro 复刻 _parse_detail_page 中的简介清洗链。
func processXhsdIntro(htmlContent string) string {
	doc, err := parseTomatoTestDoc(htmlContent)
	if err != nil {
		return ""
	}
	intro := doc.TextSep("\n")
	intro = xhsdInvisibleRe.ReplaceAllString(intro, "")
	intro = pyStrip(intro)
	intro = pyStrip(strings.Trim(intro, "\""))
	intro = xhsdIntroPrefixRe.ReplaceAllString(intro, "")
	return pyStrip(intro)
}

// trimQuotes 复刻 str.strip('"')。
func trimQuotes(s string) string {
	return trimCutset(s, '"')
}

// trimCutset 按给定字符裁剪首尾。
func trimCutset(s string, c byte) string {
	start, end := 0, len(s)
	for start < end && s[start] == c {
		start++
	}
	for end > start && s[end-1] == c {
		end--
	}
	return s[start:end]
}

// TestXhsdBuildMetadata 对齐 Python _metadata 的 6 组向量。
func TestXhsdBuildMetadata(t *testing.T) {
	src := NewXhsdSource(nil)

	t.Run("full", func(t *testing.T) {
		mi := src.BuildMetadata(&XhsdBookInfo{
			Title: "三体", Publisher: "重庆出版社", Author: "刘慈欣",
			Introduction: "简介", ISBN: "9787536692930",
			URL:   "https://item.xhsd.com/1",
			Cover: "https://img1.xinhuashudian.com/a.jpg",
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
		if mi["comments"] != "简介" {
			t.Errorf("comments = %v", mi["comments"])
		}
		if mi["cover_url"] != "https://img1.xinhuashudian.com/a.jpg" {
			t.Errorf("cover_url = %v", mi["cover_url"])
		}
		if mi["provider_value"] != "9787536692930" {
			t.Errorf("provider_value = %v", mi["provider_value"])
		}
		if !reflect.DeepEqual(mi["tags"], []any{}) {
			t.Errorf("tags = %v, want 空切片", mi["tags"])
		}
		if mi["source"] != "新华书店" || mi["provider_key"] != XhsdKey {
			t.Errorf("source/provider_key = %v / %v", mi["source"], mi["provider_key"])
		}
	})

	t.Run("no_title", func(t *testing.T) {
		if got := src.BuildMetadata(&XhsdBookInfo{Author: "A"}, false); got != nil {
			t.Errorf("无 title 应返回 nil, 得到 %v", got)
		}
	})

	t.Run("no_author", func(t *testing.T) {
		mi := src.BuildMetadata(&XhsdBookInfo{Title: "T", ISBN: "1"}, false)
		if !reflect.DeepEqual(mi["authors"], []any{"佚名"}) {
			t.Errorf("authors = %v", mi["authors"])
		}
	})

	t.Run("empty_author", func(t *testing.T) {
		mi := src.BuildMetadata(&XhsdBookInfo{Title: "T", Author: "", ISBN: "1"}, false)
		if !reflect.DeepEqual(mi["authors"], []any{"佚名"}) {
			t.Errorf("authors = %v", mi["authors"])
		}
	})

	t.Run("no_isbn", func(t *testing.T) {
		mi := src.BuildMetadata(&XhsdBookInfo{Title: "T", Author: "A"}, false)
		if mi["isbn"] != XhsdISBN {
			t.Errorf("isbn = %v, want %s", mi["isbn"], XhsdISBN)
		}
		// provider_value 取原始 ISBN（空），不回落到占位符。
		if mi["provider_value"] != "" {
			t.Errorf("provider_value = %v, want 空串", mi["provider_value"])
		}
	})

	t.Run("no_cover", func(t *testing.T) {
		mi := src.BuildMetadata(&XhsdBookInfo{Title: "T", Author: "A", ISBN: "1"}, false)
		if mi["cover_url"] != "" {
			t.Errorf("cover_url = %v, want 空串", mi["cover_url"])
		}
	})
}

// TestXhsdCoverExtension 对齐封面扩展名判定。
func TestXhsdCoverExtension(t *testing.T) {
	cases := []struct{ url, want string }{
		{"https://x/a.jpg", "jpg"},
		{"https://x/a.JPEG", "jpg"},
		{"https://x/a.png", "png"},
		{"https://x/a", "png"},
	}
	for _, tc := range cases {
		got := "png"
		lower := lowerASCII(tc.url)
		if strings.HasSuffix(lower, ".jpg") || strings.HasSuffix(lower, ".jpeg") {
			got = "jpg"
		}
		if got != tc.want {
			t.Errorf("扩展名(%q) = %q, want %q", tc.url, got, tc.want)
		}
	}
}

// TestXhsdParseDetailHTML 校验详情页解析。
func TestXhsdParseDetailHTML(t *testing.T) {
	html := `<html><body>` +
		`<div class="item-title" data-item='{"name":"三体","mainImage":"//img1.xinhuashudian.com/a.jpg",` +
		`"otherAttributes":[{"group":"BASIC","otherAttributes":[` +
		`{"attrKey":"作者","attrVal":"刘慈欣"},{"attrKey":"出版社","attrVal":"重庆出版社"}]}]}'></div>` +
		`<div class="spu-tab-item-detail" data-detail='[{"title":"内容简介","content":"<p>简介正文</p>"}]'></div>` +
		`</body></html>`

	info := ParseXhsdDetailHTML(html, "https://item.xhsd.com/1", "9787536692930")
	if info == nil {
		t.Fatal("ParseXhsdDetailHTML 返回 nil")
	}
	if info.Title != "三体" {
		t.Errorf("title = %q", info.Title)
	}
	if info.Cover != "https://img1.xinhuashudian.com/a.jpg" {
		t.Errorf("cover = %q", info.Cover)
	}
	if info.Author != "刘慈欣" || info.Publisher != "重庆出版社" {
		t.Errorf("author/publisher = %q / %q", info.Author, info.Publisher)
	}
	if info.Introduction != "简介正文" {
		t.Errorf("introduction = %q", info.Introduction)
	}
	if info.ISBN != "9787536692930" || info.URL != "https://item.xhsd.com/1" {
		t.Errorf("isbn/url = %q / %q", info.ISBN, info.URL)
	}
}

// TestXhsdParseDetailHTMLExtraAuthor 校验 extra.author 兜底。
func TestXhsdParseDetailHTMLExtraAuthor(t *testing.T) {
	html := `<html><body>` +
		`<div class="item-title" data-item='{"name":"T","extra":{"author":"兜底作者"}}'></div>` +
		`</body></html>`
	info := ParseXhsdDetailHTML(html, "u", "1")
	if info == nil {
		t.Fatal("返回 nil")
	}
	if info.Author != "兜底作者" {
		t.Errorf("author = %q", info.Author)
	}
}

// TestXhsdParseDetailHTMLMissing 校验缺失节点返回 nil。
func TestXhsdParseDetailHTMLMissing(t *testing.T) {
	if got := ParseXhsdDetailHTML("<html><body></body></html>", "u", "1"); got != nil {
		t.Errorf("无 item-title 应返回 nil, 得到 %+v", got)
	}
	// 有 item-title 但无 data-item。
	if got := ParseXhsdDetailHTML(`<html><body><div class="item-title"></div></body></html>`, "u", "1"); got != nil {
		t.Errorf("无 data-item 应返回 nil, 得到 %+v", got)
	}
}

// TestXhsdGetBookNonISBN 校验非 ISBN 标题被跳过。
func TestXhsdGetBookNonISBN(t *testing.T) {
	src := NewXhsdSource(nil)
	if got := src.GetBook("三体", false); got != nil {
		t.Errorf("非 ISBN 应返回 nil, 得到 %v", got)
	}
	if got := src.GetBookByISBN("", false); got != nil {
		t.Errorf("空 ISBN 应返回 nil, 得到 %v", got)
	}
}

// TestXhsdGetCoverValidation 校验封面协议与主机白名单。
func TestXhsdGetCoverValidation(t *testing.T) {
	src := NewXhsdSource(nil)
	if got := src.GetCover("", true); got != nil {
		t.Errorf("空 URL 应返回 nil, 得到 %+v", got)
	}
	if got := src.GetCover("https://img1.xinhuashudian.com/a.jpg", false); got != nil {
		t.Errorf("copyImage=false 应返回 nil, 得到 %+v", got)
	}
	if got := src.GetCover("https://evil.com/a.jpg", true); got != nil {
		t.Errorf("非白名单主机应返回 nil, 得到 %+v", got)
	}
}

// TestXhsdConstants 校验常量。
func TestXhsdConstants(t *testing.T) {
	if XhsdKey != "xinhua" {
		t.Errorf("XhsdKey = %q", XhsdKey)
	}
	if XhsdISBN != "0000000000002" {
		t.Errorf("XhsdISBN = %q", XhsdISBN)
	}
	if XhsdSearchURL != "https://search.xhsd.com/search" {
		t.Errorf("XhsdSearchURL = %q", XhsdSearchURL)
	}
	if XhsdDetailBase != "https://item.xhsd.com" {
		t.Errorf("XhsdDetailBase = %q", XhsdDetailBase)
	}
	if len(xhsdCoverHosts) != 9 {
		t.Errorf("CDN 主机数 = %d, want 9", len(xhsdCoverHosts))
	}
}

// TestResolveURL 校验 urljoin 语义。
func TestResolveURL(t *testing.T) {
	cases := []struct{ base, ref, want string }{
		{"https://item.xhsd.com", "/a/b", "https://item.xhsd.com/a/b"},
		{"https://item.xhsd.com", "a/b", "https://item.xhsd.com/a/b"},
		{"https://item.xhsd.com/x/", "y", "https://item.xhsd.com/x/y"},
		{"https://item.xhsd.com", "https://other.com/z", "https://other.com/z"},
	}
	for _, tc := range cases {
		if got := resolveURL(tc.base, tc.ref); got != tc.want {
			t.Errorf("resolveURL(%q, %q) = %q, want %q", tc.base, tc.ref, got, tc.want)
		}
	}
}
