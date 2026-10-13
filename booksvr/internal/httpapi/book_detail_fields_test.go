package httpapi

import (
	"testing"

	"talebook/booksvr/internal/library"
)

// 缺陷 9 回归：书籍详情缺字段。
//
// 用户可见现象：详情页「除了书名，其它显示全都不对」——作者、出版社、出版日期、
// 简介、标签、丛书、ISBN、评分、封面缩略图、分类链接、权限、别名、媒体类型、
// 阅读计数全部缺失或为空。
//
// 根因：bookDict 只填了 13 个字段，而 Python 的 SimpleBookFormatter.format
// 返回 22 个；BookDetail 顶层还漏了 kindle_sender / conversion_options。

func TestBookDictHasAllFormatterFields(t *testing.T) {
	f := newBookFixture(t)
	b := library.BookData{
		ID:         10,
		Title:      "三体",
		Authors:    []string{"刘慈欣"},
		AuthorSort: "刘慈欣",
		Tags:       []string{"科幻", "中国"},
		Publisher:  "重庆出版社",
		Series:     "地球往事",
		Rating:     9,
		Comments:   "文化大革命如火如荼进行的同时……",
		Language:   "zho",
		ISBN:       "9787536692930",
		Pubdate:    "2008-01-01",
		Timestamp:  1700000000,
		Formats:    []string{"EPUB", "MOBI"},
	}

	d := bookDict(f.Cfg, b)

	// SimpleFormatFields 是 compat.go 里与 Python 对齐的字段清单。
	for _, k := range SimpleFormatFields {
		if _, ok := d[k]; !ok {
			t.Errorf("缺少字段 %q", k)
		}
	}
	// 前端渲染额外需要的两个。
	for _, k := range []string{"href", "fmt"} {
		if _, ok := d[k]; !ok {
			t.Errorf("缺少字段 %q", k)
		}
	}

	// 具体取值。
	if d["author_sort"] != "刘慈欣" {
		t.Errorf("author_sort = %v", d["author_sort"])
	}
	if d["tag"] != "科幻 / 中国" {
		t.Errorf("tag = %v, want \"科幻 / 中国\"", d["tag"])
	}
	if d["series"] != "地球往事" {
		t.Errorf("series = %v", d["series"])
	}
	if d["isbn"] != "9787536692930" {
		t.Errorf("isbn = %v", d["isbn"])
	}
	if d["language"] != "zho" {
		t.Errorf("language = %v", d["language"])
	}
	if d["publisher"] != "重庆出版社" {
		t.Errorf("publisher = %v", d["publisher"])
	}
	// timestamp 是 YYYY-MM-DD 字符串，不是原始秒数。
	if d["timestamp"] != "2023-11-14" {
		t.Errorf("timestamp = %v, want 2023-11-14", d["timestamp"])
	}
	// pubdate 同样格式化为 YYYY-MM-DD。
	if d["pubdate"] != "2008-01-01" {
		t.Errorf("pubdate = %v, want 2008-01-01", d["pubdate"])
	}
	// 封面与缩略图带 ?t=<ts> 缓存破坏参数。
	if d["img"] != "https://cdn.example.com/get/cover/10.jpg?t=1700000000" {
		t.Errorf("img = %v", d["img"])
	}
	if d["thumb"] != "https://cdn.example.com/get/thumb_60x80/10.jpg?t=1700000000" {
		t.Errorf("thumb = %v", d["thumb"])
	}
	// MOBI 可在线阅读。
	if d["online_readable"] != true {
		t.Errorf("online_readable = %v, want true", d["online_readable"])
	}
}

// TestBookDictEmptyValueFallbacks 空值回退必须与 Python 的 val() 一致。
func TestBookDictEmptyValueFallbacks(t *testing.T) {
	f := newBookFixture(t)
	b := library.BookData{ID: 1, Title: "无元数据的书", Formats: []string{"MOBI"}}

	d := bookDict(f.Cfg, b)

	// 必填字段回退为 Unknown（与 compat.go 的 UnknownText 一致）。
	if d["author_sort"] != UnknownText {
		t.Errorf("author_sort = %v, want %q", d["author_sort"], UnknownText)
	}
	if d["publisher"] != UnknownText {
		t.Errorf("publisher = %v, want %q", d["publisher"], UnknownText)
	}
	// 简介回退为「暂无简介」（前端据此隐藏简介区块）。
	if d["comments"] != NoCommentsText {
		t.Errorf("comments = %v, want %q", d["comments"], NoCommentsText)
	}
	// 可选字段回退为 nil（前端用 v-if 判断）。
	for _, k := range []string{"series", "language", "isbn"} {
		if d[k] != nil {
			t.Errorf("%s = %v, want nil", k, d[k])
		}
	}
	// items 行不存在时的默认值。
	if d["scope"] != "public" {
		t.Errorf("scope = %v, want public", d["scope"])
	}
	if d["media_type"] != MediaTypeUnknown {
		t.Errorf("media_type = %v, want %q", d["media_type"], MediaTypeUnknown)
	}
}

// TestBookDictItemFields items 行存在时取其值。
func TestBookDictItemFields(t *testing.T) {
	f := newBookFixture(t)
	insertItem(t, f.DB, 1, "private", 1)
	if _, err := f.DB.Exec(
		`UPDATE items SET count_visit = 7, count_download = 3, media_type = 'comic' WHERE book_id = 1`); err != nil {
		t.Fatalf("update items: %v", err)
	}

	d := bookDict(f.Cfg, library.BookData{ID: 1, Title: "X", Formats: []string{"MOBI"}})

	if d["scope"] != "private" {
		t.Errorf("scope = %v, want private", d["scope"])
	}
	if d["media_type"] != "comic" {
		t.Errorf("media_type = %v, want comic", d["media_type"])
	}
	if d["count_visit"] != int64(7) {
		t.Errorf("count_visit = %v, want 7", d["count_visit"])
	}
	if d["count_download"] != int64(3) {
		t.Errorf("count_download = %v, want 3", d["count_download"])
	}
}

// TestParseBookDate 覆盖 Calibre 的多种日期写法。
func TestParseBookDate(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"2008-01-01", "2008-01-01"},
		{"2008-01-01 00:00:00+00:00", "2008-01-01"},
		{"2008-01-01T00:00:00Z", "2008-01-01"},
		{"", "Unknown"},     // 空值回退
		{"不是日期", "Unknown"}, // 解析失败回退
	}
	for _, c := range cases {
		got := formatDate(parseBookDate(c.in))
		if got != c.want {
			t.Errorf("parseBookDate(%q) -> %q, want %q", c.in, got, c.want)
		}
	}
}

// TestToStrSetting 站点配置读取。
func TestToStrSetting(t *testing.T) {
	if got := toStrSetting(map[string]any{"smtp_username": "a@b.com"}, "smtp_username"); got != "a@b.com" {
		t.Errorf("got %q", got)
	}
	if got := toStrSetting(map[string]any{}, "smtp_username"); got != "" {
		t.Errorf("缺失时应返回空串，得到 %q", got)
	}
	if got := toStrSetting(nil, "smtp_username"); got != "" {
		t.Errorf("nil 配置应返回空串，得到 %q", got)
	}
}
