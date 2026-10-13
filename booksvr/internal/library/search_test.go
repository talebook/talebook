package library

import (
	"sort"
	"testing"
)

// idsEqual 比较两个 id 集合（忽略顺序）。
func idsEqual(a, b []int64) bool {
	if len(a) != len(b) {
		return false
	}
	x := append([]int64(nil), a...)
	y := append([]int64(nil), b...)
	sort.Slice(x, func(i, j int) bool { return x[i] < x[j] })
	sort.Slice(y, func(i, j int) bool { return y[i] < y[j] })
	for i := range x {
		if x[i] != y[i] {
			return false
		}
	}
	return true
}

// --- Step A：实测被调用的语法 ---

// TestSearchEmptyQueryReturnsAll 空查询返回全部。
func TestSearchEmptyQueryReturnsAll(t *testing.T) {
	db := newQueryDB(t)
	ids, err := Search(db, "")
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	if !idsEqual(ids, []int64{1, 2, 3}) {
		t.Fatalf("空查询应返回全部，实际 %#v", ids)
	}
}

// TestSearchPublisher 按出版社搜索。
func TestSearchPublisher(t *testing.T) {
	db := newQueryDB(t)
	ids, err := Search(db, "publisher:'重庆出版社'")
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	if !idsEqual(ids, []int64{1}) {
		t.Fatalf("应匹配 id=1，实际 %#v", ids)
	}
}

// TestSearchAuthor 按作者搜索。
func TestSearchAuthor(t *testing.T) {
	db := newQueryDB(t)
	ids, err := Search(db, "author:'刘慈欣'")
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	if !idsEqual(ids, []int64{1, 2}) {
		t.Fatalf("应匹配 id=1,2，实际 %#v", ids)
	}
}

// TestSearchTag 按标签搜索。
func TestSearchTag(t *testing.T) {
	db := newQueryDB(t)
	ids, err := Search(db, "tag:'科幻'")
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	if !idsEqual(ids, []int64{1, 2}) {
		t.Fatalf("应匹配 id=1,2，实际 %#v", ids)
	}
}

// TestSearchFullText 全文搜索（title/comments/tags）。
func TestSearchFullText(t *testing.T) {
	db := newQueryDB(t)
	ids, err := Search(db, `search:"三体"`)
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	if !idsEqual(ids, []int64{1, 2}) {
		t.Fatalf("应匹配 id=1,2，实际 %#v", ids)
	}
}

// TestSearchQuotedWithSpaces 值含空格。
func TestSearchQuotedWithSpaces(t *testing.T) {
	db := newQueryDB(t)
	ids, err := Search(db, "title:'三体 II'")
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	if !idsEqual(ids, []int64{2}) {
		t.Fatalf("应匹配 id=2，实际 %#v", ids)
	}
}

// TestSearchNoMatch 无匹配返回空。
func TestSearchNoMatch(t *testing.T) {
	db := newQueryDB(t)
	ids, err := Search(db, "author:'不存在的人'")
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	if len(ids) != 0 {
		t.Fatalf("应返回空，实际 %#v", ids)
	}
}

// --- Step B：补齐语法 ---

// TestSearchSeries 按丛书搜索。
func TestSearchSeries(t *testing.T) {
	db := newQueryDB(t)
	ids, err := Search(db, "series:'三体'")
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	if !idsEqual(ids, []int64{1, 2}) {
		t.Fatalf("应匹配 id=1,2，实际 %#v", ids)
	}
}

// TestSearchRating 按评分搜索（等值）。
func TestSearchRating(t *testing.T) {
	db := newQueryDB(t)
	ids, err := Search(db, "rating:8")
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	if !idsEqual(ids, []int64{1}) {
		t.Fatalf("应匹配 id=1，实际 %#v", ids)
	}
}

// TestSearchFormat 按格式搜索。
func TestSearchFormat(t *testing.T) {
	db := newQueryDB(t)
	ids, err := Search(db, "format:EPUB")
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	if !idsEqual(ids, []int64{1}) {
		t.Fatalf("应匹配 id=1，实际 %#v", ids)
	}
}

// TestSearchTitle 按书名搜索。
func TestSearchTitle(t *testing.T) {
	db := newQueryDB(t)
	ids, err := Search(db, "title:'活着'")
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	if !idsEqual(ids, []int64{3}) {
		t.Fatalf("应匹配 id=3，实际 %#v", ids)
	}
}

// TestSearchComparisonGreater 比较符 >。
func TestSearchComparisonGreater(t *testing.T) {
	db := newQueryDB(t)
	ids, err := Search(db, "rating:>6")
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	if !idsEqual(ids, []int64{1}) {
		t.Fatalf("rating>6 应匹配 id=1，实际 %#v", ids)
	}
}

// TestSearchComparisonLess 比较符 <。
func TestSearchComparisonLess(t *testing.T) {
	db := newQueryDB(t)
	ids, err := Search(db, "rating:<8")
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	if !idsEqual(ids, []int64{3}) {
		t.Fatalf("rating<8 应匹配 id=3，实际 %#v", ids)
	}
}

// TestSearchBooleanAnd 布尔 and。
func TestSearchBooleanAnd(t *testing.T) {
	db := newQueryDB(t)
	ids, err := Search(db, "author:'刘慈欣' and tag:'科幻'")
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	if !idsEqual(ids, []int64{1, 2}) {
		t.Fatalf("应匹配 id=1,2，实际 %#v", ids)
	}
}

// TestSearchBooleanOr 布尔 or。
func TestSearchBooleanOr(t *testing.T) {
	db := newQueryDB(t)
	ids, err := Search(db, "author:'余华' or author:'刘慈欣'")
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	if !idsEqual(ids, []int64{1, 2, 3}) {
		t.Fatalf("应匹配全部，实际 %#v", ids)
	}
}

// TestSearchBooleanNot 布尔 not。
func TestSearchBooleanNot(t *testing.T) {
	db := newQueryDB(t)
	ids, err := Search(db, "not author:'刘慈欣'")
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	if !idsEqual(ids, []int64{3}) {
		t.Fatalf("应匹配 id=3，实际 %#v", ids)
	}
}

// TestSearchParentheses 括号分组。
func TestSearchParentheses(t *testing.T) {
	db := newQueryDB(t)
	ids, err := Search(db, "(author:'余华' or author:'刘慈欣') and tag:'科幻'")
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	if !idsEqual(ids, []int64{1, 2}) {
		t.Fatalf("应匹配 id=1,2，实际 %#v", ids)
	}
}

// TestSearchInvalidSyntax 非法语法返回明确错误，不 panic。
func TestSearchInvalidSyntax(t *testing.T) {
	db := newQueryDB(t)
	cases := []string{"author:", "and", "(author:'x'", "author:'x' and"}
	for _, q := range cases {
		if _, err := Search(db, q); err == nil {
			t.Errorf("非法语法 %q 应返回错误", q)
		}
	}
}

// TestSearchClosedDB 关闭的库返回错误。
func TestSearchClosedDB(t *testing.T) {
	db := newQueryDB(t)
	_ = db.Close()
	if _, err := Search(db, "author:'x'"); err == nil {
		t.Fatal("关闭的库应返回错误")
	}
}
