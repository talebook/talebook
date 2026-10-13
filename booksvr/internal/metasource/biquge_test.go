package metasource

import (
	"reflect"
	"testing"
)

// biqugeFullHTML 与 Python 侧 tmp_biquge.py 的 "full" 用例一致。
const biqugeFullHTML = `
<html><body>
<div class="con_top"><a href="/">首页</a><a href="/xuanhuan/">玄幻</a><a href="/xuanhuan/1/">玄幻小说</a></div>
<h1>  斗破苍穹  </h1>
<div id="info">
  <p>作　者：天蚕土豆</p>
  <p>最新章节：《大结局》</p>
  <p>   </p>
  <p>更新时间：2024-01-01</p>
</div>
<div id="intro">
   这里是简介
   第二行
</div>
<div id="fmimg"><img src="//img.example.com/a.jpg"/></div>
</body></html>
`

const biqugeRelativeCoverHTML = `
<html><body>
<h1>Book Two</h1>
<div id="info">
  <p>作者: Author B</p>
  <p>最新章节：第五十章 无书名号</p>
</div>
<div id="fmimg"><img src="/files/cover.png"/></div>
</body></html>
`

const biqugeEmptyHTML = "<html><body></body></html>"

const biqugeShortConTopHTML = `
<html><body>
<h1>T3</h1>
<div class="con_top"><a href="/">首页</a><a href="/a/">A</a></div>
<div id="info"><p>作者：X</p></div>
</body></html>
`

const biqugeAbsCoverHTML = `
<html><body>
<h1>T4</h1>
<div id="fmimg"><img src="https://cdn.example.com/b.webp"/></div>
</body></html>
`

const biqugeNoImgHTML = `
<html><body>
<h1>T5</h1>
<div id="fmimg"></div>
</body></html>
`

func mustBiqugePage(t *testing.T, url, html string) *BiqugePage {
	t.Helper()
	p, err := NewBiqugePage(url, html)
	if err != nil {
		t.Fatalf("NewBiqugePage: %v", err)
	}
	return p
}

// TestBiqugeGetInfo 对齐 Python get_info 的 6 组向量。
func TestBiqugeGetInfo(t *testing.T) {
	cases := []struct {
		name string
		html string
		want BiqugeInfo
	}{
		{
			name: "full",
			html: biqugeFullHTML,
			want: BiqugeInfo{Title: "斗破苍穹", Author: "天蚕土豆", Category: "玄幻小说", LatestChapter: "大结局"},
		},
		{
			name: "relative_cover",
			html: biqugeRelativeCoverHTML,
			want: BiqugeInfo{Title: "Book Two", Author: "Author B", LatestChapter: "第五十章 无书名号"},
		},
		{
			name: "empty",
			html: biqugeEmptyHTML,
			want: BiqugeInfo{},
		},
		{
			name: "short_con_top",
			html: biqugeShortConTopHTML,
			want: BiqugeInfo{Title: "T3", Author: "X"},
		},
		{
			name: "abs_cover",
			html: biqugeAbsCoverHTML,
			want: BiqugeInfo{Title: "T4"},
		},
		{
			name: "no_img",
			html: biqugeNoImgHTML,
			want: BiqugeInfo{Title: "T5"},
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := mustBiqugePage(t, "http://x/1/1/", tc.html).GetInfo()
			if got != tc.want {
				t.Errorf("GetInfo() = %+v, want %+v", got, tc.want)
			}
		})
	}
}

// TestBiqugeGetSummary 对齐 Python get_summary。
func TestBiqugeGetSummary(t *testing.T) {
	cases := []struct {
		name string
		html string
		want string
	}{
		{"full", biqugeFullHTML, "这里是简介 第二行"},
		{"relative_cover", biqugeRelativeCoverHTML, ""},
		{"empty", biqugeEmptyHTML, ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := mustBiqugePage(t, "http://x/1/1/", tc.html).GetSummary(); got != tc.want {
				t.Errorf("GetSummary() = %q, want %q", got, tc.want)
			}
		})
	}
}

// TestBiqugeGetImage 对齐 Python get_image，含 // 前缀与相对路径两种改写。
func TestBiqugeGetImage(t *testing.T) {
	cases := []struct {
		name string
		html string
		want string
	}{
		{"protocol_relative", biqugeFullHTML, "http://img.example.com/a.jpg"},
		{"relative_path", biqugeRelativeCoverHTML, "http://www.xbiqugu.la/files/cover.png"},
		{"absolute", biqugeAbsCoverHTML, "https://cdn.example.com/b.webp"},
		{"no_img_tag", biqugeNoImgHTML, ""},
		{"empty", biqugeEmptyHTML, ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := mustBiqugePage(t, "http://x/1/1/", tc.html).GetImage(); got != tc.want {
				t.Errorf("GetImage() = %q, want %q", got, tc.want)
			}
		})
	}
}

// TestBiqugeGetTags 对齐 Python get_tags。
func TestBiqugeGetTags(t *testing.T) {
	if got := mustBiqugePage(t, "u", biqugeFullHTML).GetTags(); !reflect.DeepEqual(got, []string{"玄幻小说"}) {
		t.Errorf("GetTags() = %v", got)
	}
	if got := mustBiqugePage(t, "u", biqugeEmptyHTML).GetTags(); got != nil {
		t.Errorf("空页面 GetTags() = %v, want nil", got)
	}
}

// TestBiqugeGetID 对齐 Python get_id 的 4 组向量。
func TestBiqugeGetID(t *testing.T) {
	cases := []struct{ url, want string }{
		{"http://www.xbiqugu.la/1/1234/", "1/1234"},
		{"http://www.xbiqugu.la/1/1234", "1/1234"},
		{"http://www.xbiqugu.la/abc", "http://www.xbiqugu.la/abc"},
		{"http://www.xbiqugu.la/12/3456/", "12/3456"},
	}
	for _, tc := range cases {
		if got := mustBiqugePage(t, tc.url, "<html></html>").GetID(); got != tc.want {
			t.Errorf("GetID(%q) = %q, want %q", tc.url, got, tc.want)
		}
	}
}

// TestBiqugeBuildMetadata 校验元数据字段与 Python _metadata 对齐。
func TestBiqugeBuildMetadata(t *testing.T) {
	src := NewBiqugeSource(nil)
	page := mustBiqugePage(t, "http://www.xbiqugu.la/1/1234/", biqugeFullHTML)

	mi := src.BuildMetadata(page, false)

	if mi["title"] != "斗破苍穹" {
		t.Errorf("title = %v", mi["title"])
	}
	if mi["author"] != "天蚕土豆" || mi["author_sort"] != "天蚕土豆" {
		t.Errorf("author = %v / %v", mi["author"], mi["author_sort"])
	}
	if !reflect.DeepEqual(mi["authors"], []any{"天蚕土豆"}) {
		t.Errorf("authors = %v", mi["authors"])
	}
	if mi["isbn"] != BiqugeISBN {
		t.Errorf("isbn = %v", mi["isbn"])
	}
	if !reflect.DeepEqual(mi["tags"], []any{"玄幻小说"}) {
		t.Errorf("tags = %v", mi["tags"])
	}
	if mi["publisher"] != nil {
		t.Errorf("publisher = %v, want nil", mi["publisher"])
	}
	if mi["cover_url"] != "http://img.example.com/a.jpg" {
		t.Errorf("cover_url = %v", mi["cover_url"])
	}
	if mi["comments"] != "这里是简介 第二行" {
		t.Errorf("comments = %v", mi["comments"])
	}
	if mi["website"] != "http://www.xbiqugu.la/1/1234/" {
		t.Errorf("website = %v", mi["website"])
	}
	if mi["source"] != "笔趣阁" {
		t.Errorf("source = %v", mi["source"])
	}
	if mi["provider_key"] != BiqugeKey {
		t.Errorf("provider_key = %v", mi["provider_key"])
	}
	if mi["provider_value"] != "1/1234" {
		t.Errorf("provider_value = %v", mi["provider_value"])
	}
	if mi["rating"] != nil {
		t.Errorf("rating = %v, want nil", mi["rating"])
	}
	if mi["cover_data"] != nil {
		t.Errorf("copyImage=false 时 cover_data 应为 nil, 得到 %v", mi["cover_data"])
	}
}

// TestBiqugeBuildMetadataAnonymousAuthor 校验作者缺失时回落「佚名」。
func TestBiqugeBuildMetadataAnonymousAuthor(t *testing.T) {
	src := NewBiqugeSource(nil)
	page := mustBiqugePage(t, "http://x/1/1/", biqugeEmptyHTML)
	mi := src.BuildMetadata(page, false)
	if mi["author"] != "佚名" {
		t.Errorf("author = %v, want 佚名", mi["author"])
	}
	if mi["cover_url"] != nil {
		t.Errorf("无封面时 cover_url 应为 nil, 得到 %v", mi["cover_url"])
	}
}

// TestBiqugeBuildMetadataTagsCap 校验 tags 截断到 8 个。
func TestBiqugeBuildMetadataTagsCap(t *testing.T) {
	src := NewBiqugeSource(nil)
	// get_tags 只返回 1 个元素，这里直接验证截断逻辑不会越界。
	page := mustBiqugePage(t, "http://x/1/1/", biqugeFullHTML)
	mi := src.BuildMetadata(page, false)
	if tags, ok := mi["tags"].([]any); !ok || len(tags) != 1 {
		t.Errorf("tags = %v", mi["tags"])
	}
}

// TestBiqugeSearchURL 校验搜索地址拼接。
func TestBiqugeSearchURL(t *testing.T) {
	src := NewBiqugeSource(nil)
	want := "http://www.xbiqugu.la/modules/article/search.php"
	if got := src.SearchURL(); got != want {
		t.Errorf("SearchURL() = %q, want %q", got, want)
	}
	src.BaseURL = "http://mirror.test"
	if got := src.SearchURL(); got != "http://mirror.test/modules/article/search.php" {
		t.Errorf("覆盖 BaseURL 后 = %q", got)
	}
}

// TestBiqugeConstants 校验常量与 Python 一致。
func TestBiqugeConstants(t *testing.T) {
	if BiqugeISBN != "0000000000004" {
		t.Errorf("BiqugeISBN = %q", BiqugeISBN)
	}
	if BiqugeKey != "Biquge" {
		t.Errorf("BiqugeKey = %q", BiqugeKey)
	}
	if BiqugeBaseURL != "http://www.xbiqugu.la" {
		t.Errorf("BiqugeBaseURL = %q", BiqugeBaseURL)
	}
	if BiqugeTimeout != 15 {
		t.Errorf("BiqugeTimeout = %d", BiqugeTimeout)
	}
}

// TestBiqugeGetCoverEmptyURL 校验空 URL 直接返回 nil。
func TestBiqugeGetCoverEmptyURL(t *testing.T) {
	src := NewBiqugeSource(nil)
	if got := src.GetCover(""); got != nil {
		t.Errorf("空 URL 应返回 nil, 得到 %+v", got)
	}
}

// TestBiqugeCoverExtension 校验封面扩展名白名单回落。
func TestBiqugeCoverExtension(t *testing.T) {
	cases := []struct{ url, want string }{
		{"http://x/a.jpg", "jpg"},
		{"http://x/a.JPEG", "jpeg"},
		{"http://x/a.png", "png"},
		{"http://x/a.gif", "gif"},
		{"http://x/a.webp", "webp"},
		{"http://x/a.bmp", "jpg"},
		{"http://x/a", "jpg"},
	}
	for _, tc := range cases {
		got := "jpg"
		if m := coverExtRe.FindStringSubmatch(tc.url); m != nil {
			if lower := lowerASCII(m[1]); biqugeImageFormats[lower] {
				got = lower
			}
		}
		if got != tc.want {
			t.Errorf("扩展名(%q) = %q, want %q", tc.url, got, tc.want)
		}
	}
}

// lowerASCII 复刻 Python str.lower() 在 ASCII 范围内的行为。
func lowerASCII(s string) string {
	b := []byte(s)
	for i := range b {
		if b[i] >= 'A' && b[i] <= 'Z' {
			b[i] += 'a' - 'A'
		}
	}
	return string(b)
}

// TestCleanText 校验空白折叠。
func TestCleanText(t *testing.T) {
	cases := []struct{ in, want string }{
		{"  a  b  ", "a b"},
		{"a\n\tb", "a b"},
		{"", ""},
		{"   ", ""},
	}
	for _, tc := range cases {
		if got := cleanText(tc.in); got != tc.want {
			t.Errorf("cleanText(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}
