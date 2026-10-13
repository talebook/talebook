package library

import (
	"testing"
)

// TestCounts 验证书库统计函数。
//
// 这是首页「分类浏览」显示 0 的回归测试：/api/user/info 的 sys 计数
// 依赖这些函数，未接线时全部返回 0。
//
// 夹具 newQueryDB 预置 3 本书 / 2 位作者 / 1 家出版社 / 2 个标签 /
// 1 套丛书，这里在其基础上追加数据并断言增量。
func TestCounts(t *testing.T) {
	db := newQueryDB(t)

	// 夹具基线。
	base := map[string]int64{}
	for name, fn := range map[string]func() (int64, error){
		"books":      func() (int64, error) { return CountBooks(db) },
		"authors":    func() (int64, error) { return CountAuthors(db) },
		"publishers": func() (int64, error) { return CountPublishers(db) },
		"tags":       func() (int64, error) { return CountTags(db) },
		"series":     func() (int64, error) { return CountSeries(db) },
		"formats":    func() (int64, error) { return CountFormats(db) },
	} {
		n, err := fn()
		if err != nil {
			t.Fatalf("基线 %s: %v", name, err)
		}
		base[name] = n
	}
	if base["books"] == 0 {
		t.Fatal("夹具应预置书籍，否则本测试无意义")
	}

	// 追加一本新书（新作者/新出版社/新标签）。
	if _, err := ImportBook(db, BookMeta{
		Title: "计数书", Author: "计数作者", Publisher: "计数出版社",
		Tags: []string{"计数标签"}, Path: "计数作者/计数书 (99)",
	}); err != nil {
		t.Fatalf("ImportBook: %v", err)
	}

	// 登记两种格式，验证 COUNT(DISTINCT format) 语义。
	for _, f := range []string{"EPUB", "MOBI"} {
		if _, err := db.Exec(
			`INSERT INTO data (book, format, uncompressed_size, name) VALUES (99,?,100,?)`,
			f, "x."+f); err != nil {
			t.Fatal(err)
		}
	}

	cases := []struct {
		name string
		fn   func() (int64, error)
		want int64
	}{
		{"books", func() (int64, error) { return CountBooks(db) }, base["books"] + 1},
		{"authors", func() (int64, error) { return CountAuthors(db) }, base["authors"] + 1},
		{"publishers", func() (int64, error) { return CountPublishers(db) }, base["publishers"] + 1},
		{"tags", func() (int64, error) { return CountTags(db) }, base["tags"] + 1},
		{"series", func() (int64, error) { return CountSeries(db) }, base["series"]},
		// 夹具已有 1 行 EPUB；新增 EPUB+MOBI 后去重只多出 MOBI 一种。
		{"formats", func() (int64, error) { return CountFormats(db) }, base["formats"] + 1},
	}
	for _, tc := range cases {
		got, err := tc.fn()
		if err != nil {
			t.Errorf("%s: %v", tc.name, err)
			continue
		}
		if got != tc.want {
			t.Errorf("%s = %d，期望 %d", tc.name, got, tc.want)
		}
	}
}

// TestCountsNilDB 验证 nil 句柄返回 0 而不 panic。
func TestCountsNilDB(t *testing.T) {
	if n, err := CountBooks(nil); err != nil || n != 0 {
		t.Errorf("CountBooks(nil) = (%d, %v)，期望 (0, nil)", n, err)
	}
	if n, err := CountFormats(nil); err != nil || n != 0 {
		t.Errorf("CountFormats(nil) = (%d, %v)，期望 (0, nil)", n, err)
	}
}
