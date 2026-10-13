package metasource

import (
	"reflect"
	"testing"
)

// youshuFullHTML 与 Python 侧 tmp_youshu.py 的 FULL 用例一致。
const youshuFullHTML = `<html><body>` +
	`<span style="font-size:20px;font-weight:bold;color:#f27622;">黜龙</span>` +
	`<a href="authorarticle.php?author=1">爱潜水的乌贼</a>` +
	`<a class="x" href="authorarticle.php?author=2">别人</a>` +
	"<div style=\"padding:3px;border:0;height:100%;width:100%;overflow-y:scroll;\">  简介第一行\n第二行  </div>" +
	`<a class="book-detail-img" href="https://img.youshu.me/cover/300"></a>` +
	`<a href="tagarticle.php?t=1">玄幻</a>` +
	`<a href="tagarticle.php?t=2"> 修真 </a>` +
	`<table><tr><td>首发网站：起点中文网</td></tr></table>` +
	`<span class="ratenum">8.6</span>` +
	`</body></html>`

const youshuMinimalHTML = "<html><body></body></html>"

const youshuNoImgHrefHTML = `<html><body>` +
	`<span style="font-size:20px;font-weight:bold;color:#f27622;">T</span>` +
	`<a href="authorarticle.php?author=1">A</a>` +
	`<a class="book-detail-img"></a>` +
	`</body></html>`

const youshuCoverNoSuffixHTML = `<html><body>` +
	`<a class="book-detail-img" href="https://img.youshu.me/cover/600"></a>` +
	`</body></html>`

const youshuRatingIntHTML = `<html><body><span class="ratenum">7</span></body></html>`

const youshuPlatNoColonHTML = `<html><body>` +
	`<table><tr><td>首发网站 无冒号</td></tr></table>` +
	`</body></html>`

func mustYoushuPage(t *testing.T, url, html string) *YoushuPage {
	t.Helper()
	p, err := NewYoushuPage(url, html)
	if err != nil {
		t.Fatalf("NewYoushuPage: %v", err)
	}
	return p
}

// TestYoushuGetInfo 对齐 Python get_info。
func TestYoushuGetInfo(t *testing.T) {
	got := mustYoushuPage(t, "u", youshuFullHTML).GetInfo()
	want := YoushuInfo{Title: "黜龙", Author: "爱潜水的乌贼"}
	if got != want {
		t.Errorf("GetInfo() = %+v, want %+v", got, want)
	}
	// 空页面：Python 会抛 AttributeError，Go 返回零值。
	if got := mustYoushuPage(t, "u", youshuMinimalHTML).GetInfo(); got != (YoushuInfo{}) {
		t.Errorf("空页面 GetInfo() = %+v", got)
	}
}

// TestYoushuGetSummary 对齐 Python get_summary（.text.strip()，不折叠内部空白）。
func TestYoushuGetSummary(t *testing.T) {
	if got := mustYoushuPage(t, "u", youshuFullHTML).GetSummary(); got != "简介第一行\n第二行" {
		t.Errorf("GetSummary() = %q", got)
	}
	if got := mustYoushuPage(t, "u", youshuMinimalHTML).GetSummary(); got != "" {
		t.Errorf("空页面 GetSummary() = %q", got)
	}
}

// TestYoushuGetImage 对齐 Python get_image，含 /300 → /600 改写。
func TestYoushuGetImage(t *testing.T) {
	if got := mustYoushuPage(t, "u", youshuFullHTML).GetImage(); got != "https://img.youshu.me/cover/600" {
		t.Errorf("GetImage() = %q", got)
	}
	// 无 href 属性 → nil。
	if got := mustYoushuPage(t, "u", youshuNoImgHrefHTML).GetImage(); got != "" {
		t.Errorf("无 href 时 GetImage() = %q", got)
	}
	// 非 /300 结尾 → 原样返回。
	if got := mustYoushuPage(t, "u", youshuCoverNoSuffixHTML).GetImage(); got != "https://img.youshu.me/cover/600" {
		t.Errorf("非 /300 结尾 GetImage() = %q", got)
	}
	if got := mustYoushuPage(t, "u", youshuMinimalHTML).GetImage(); got != "" {
		t.Errorf("空页面 GetImage() = %q", got)
	}
}

// TestYoushuGetTags 对齐 Python get_tags（strip=True）。
func TestYoushuGetTags(t *testing.T) {
	got := mustYoushuPage(t, "u", youshuFullHTML).GetTags()
	if !reflect.DeepEqual(got, []string{"玄幻", "修真"}) {
		t.Errorf("GetTags() = %v", got)
	}
	// Python 返回空列表而非 nil。
	if got := mustYoushuPage(t, "u", youshuMinimalHTML).GetTags(); got == nil || len(got) != 0 {
		t.Errorf("空页面 GetTags() = %v, want 空切片", got)
	}
}

// TestYoushuGetPlat 对齐 Python get_plat。
func TestYoushuGetPlat(t *testing.T) {
	if got := mustYoushuPage(t, "u", youshuFullHTML).GetPlat(); got != "起点中文网" {
		t.Errorf("GetPlat() = %q", got)
	}
	// 无冒号时 split("：")[-1] 返回整串。
	if got := mustYoushuPage(t, "u", youshuPlatNoColonHTML).GetPlat(); got != "首发网站 无冒号" {
		t.Errorf("无冒号 GetPlat() = %q", got)
	}
	if got := mustYoushuPage(t, "u", youshuMinimalHTML).GetPlat(); got != "" {
		t.Errorf("空页面 GetPlat() = %q", got)
	}
}

// TestYoushuGetRating 对齐 Python get_rating（int(float(text)) 截断）。
func TestYoushuGetRating(t *testing.T) {
	if got := mustYoushuPage(t, "u", youshuFullHTML).GetRating(); got != 8 {
		t.Errorf("GetRating() = %d, want 8", got)
	}
	if got := mustYoushuPage(t, "u", youshuRatingIntHTML).GetRating(); got != 7 {
		t.Errorf("GetRating() = %d, want 7", got)
	}
	if got := mustYoushuPage(t, "u", youshuMinimalHTML).GetRating(); got != 0 {
		t.Errorf("空页面 GetRating() = %d, want 0", got)
	}
}

// TestYoushuGetID 对齐 Python get_id 的 3 组向量。
func TestYoushuGetID(t *testing.T) {
	cases := []struct{ url, want string }{
		{"https://www.youshu.me/book/12345", "12345"},
		{"https://www.youshu.me/book/999/x", "999"},
		{"https://www.youshu.me/other", "0000"},
	}
	for _, tc := range cases {
		if got := mustYoushuPage(t, tc.url, "<html></html>").GetID(); got != tc.want {
			t.Errorf("GetID(%q) = %q, want %q", tc.url, got, tc.want)
		}
	}
}

// TestYoushuBuildMetadata 校验元数据字段与 Python _metadata 对齐。
func TestYoushuBuildMetadata(t *testing.T) {
	src := NewYoushuSource(nil)
	page := mustYoushuPage(t, "https://www.youshu.me/book/12345", youshuFullHTML)

	mi := src.BuildMetadata(page, false)

	if mi["title"] != "黜龙" {
		t.Errorf("title = %v", mi["title"])
	}
	if mi["author"] != "爱潜水的乌贼" || mi["author_sort"] != "爱潜水的乌贼" {
		t.Errorf("author = %v / %v", mi["author"], mi["author_sort"])
	}
	if !reflect.DeepEqual(mi["authors"], []any{"爱潜水的乌贼"}) {
		t.Errorf("authors = %v", mi["authors"])
	}
	if mi["isbn"] != YoushuISBN {
		t.Errorf("isbn = %v", mi["isbn"])
	}
	if !reflect.DeepEqual(mi["tags"], []any{"玄幻", "修真"}) {
		t.Errorf("tags = %v", mi["tags"])
	}
	if mi["publisher"] != "起点中文网" {
		t.Errorf("publisher = %v", mi["publisher"])
	}
	if mi["cover_url"] != "https://img.youshu.me/cover/600" {
		t.Errorf("cover_url = %v", mi["cover_url"])
	}
	if mi["comments"] != "简介第一行\n第二行" {
		t.Errorf("comments = %v", mi["comments"])
	}
	if mi["website"] != "https://www.youshu.me/book/12345" {
		t.Errorf("website = %v", mi["website"])
	}
	if mi["source"] != "优书网" {
		t.Errorf("source = %v", mi["source"])
	}
	if mi["provider_key"] != YoushuKey {
		t.Errorf("provider_key = %v", mi["provider_key"])
	}
	if mi["provider_value"] != "12345" {
		t.Errorf("provider_value = %v", mi["provider_value"])
	}
	// 注意：优书网的 rating 是 int，不是 nil。
	if mi["rating"] != 8 {
		t.Errorf("rating = %v, want 8", mi["rating"])
	}
	if mi["cover_data"] != nil {
		t.Errorf("copyImage=false 时 cover_data 应为 nil, 得到 %v", mi["cover_data"])
	}
}

// TestYoushuBuildMetadataAnonymousAuthor 校验作者缺失时回落「佚名」。
func TestYoushuBuildMetadataAnonymousAuthor(t *testing.T) {
	src := NewYoushuSource(nil)
	page := mustYoushuPage(t, "https://www.youshu.me/book/1", youshuMinimalHTML)
	mi := src.BuildMetadata(page, false)
	if mi["author"] != "佚名" {
		t.Errorf("author = %v, want 佚名", mi["author"])
	}
	if mi["cover_url"] != nil {
		t.Errorf("无封面时 cover_url 应为 nil, 得到 %v", mi["cover_url"])
	}
	if mi["rating"] != 0 {
		t.Errorf("无评分时 rating = %v, want 0", mi["rating"])
	}
}

// TestYoushuSearchURL 校验搜索地址拼接。
func TestYoushuSearchURL(t *testing.T) {
	src := NewYoushuSource(nil)
	want := "https://www.youshu.me/modules/article/search.php"
	if got := src.SearchURL(); got != want {
		t.Errorf("SearchURL() = %q, want %q", got, want)
	}
}

// TestYoushuConstants 校验常量与 Python 一致。
func TestYoushuConstants(t *testing.T) {
	if YoushuISBN != "0000000000002" {
		t.Errorf("YoushuISBN = %q", YoushuISBN)
	}
	if YoushuKey != "Youshu" {
		t.Errorf("YoushuKey = %q", YoushuKey)
	}
	if YoushuBaseURL != "https://www.youshu.me" {
		t.Errorf("YoushuBaseURL = %q", YoushuBaseURL)
	}
}

// TestYoushuGetCoverEmptyURL 校验空 URL 直接返回 nil。
func TestYoushuGetCoverEmptyURL(t *testing.T) {
	src := NewYoushuSource(nil)
	if got := src.GetCover(""); got != nil {
		t.Errorf("空 URL 应返回 nil, 得到 %+v", got)
	}
}

// TestYoushuCoverExtensionNoWhitelist 校验优书网不做扩展名白名单。
func TestYoushuCoverExtensionNoWhitelist(t *testing.T) {
	cases := []struct{ url, want string }{
		{"https://x/a.jpg", "jpg"},
		{"https://x/a.PNG", "PNG"},
		{"https://x/a.bmp", "bmp"},
		{"https://x/a", "https://x/a"},
	}
	for _, tc := range cases {
		got := tc.url
		if m := youshuCoverExtRe.FindStringSubmatch(tc.url); m != nil {
			got = m[1]
		}
		if got != tc.want {
			t.Errorf("扩展名(%q) = %q, want %q", tc.url, got, tc.want)
		}
	}
}
