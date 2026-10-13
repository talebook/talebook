package library

import (
	"testing"
)

// TestGetBooksForCategoryAuthors 按作者取书。
func TestGetBooksForCategoryAuthors(t *testing.T) {
	db := newQueryDB(t)
	ids, err := GetBooksForCategory(db, "authors", 1)
	if err != nil {
		t.Fatalf("GetBooksForCategory: %v", err)
	}
	if len(ids) != 2 {
		t.Fatalf("作者 1 应有 2 本书，实际 %#v", ids)
	}
}

// TestGetBooksForCategoryTags 按标签取书。
func TestGetBooksForCategoryTags(t *testing.T) {
	db := newQueryDB(t)
	ids, err := GetBooksForCategory(db, "tags", 1)
	if err != nil {
		t.Fatalf("GetBooksForCategory: %v", err)
	}
	if len(ids) != 2 {
		t.Fatalf("标签 1 应有 2 本书，实际 %#v", ids)
	}
}

// TestGetBooksForCategoryPublishers 按出版社取书。
func TestGetBooksForCategoryPublishers(t *testing.T) {
	db := newQueryDB(t)
	ids, err := GetBooksForCategory(db, "publishers", 1)
	if err != nil {
		t.Fatalf("GetBooksForCategory: %v", err)
	}
	if len(ids) != 1 || ids[0] != 1 {
		t.Fatalf("出版社 1 应有 1 本书，实际 %#v", ids)
	}
}

// TestGetBooksForCategorySeries 按丛书取书。
func TestGetBooksForCategorySeries(t *testing.T) {
	db := newQueryDB(t)
	ids, err := GetBooksForCategory(db, "series", 1)
	if err != nil {
		t.Fatalf("GetBooksForCategory: %v", err)
	}
	if len(ids) != 2 {
		t.Fatalf("丛书 1 应有 2 本书，实际 %#v", ids)
	}
}

// TestGetBooksForCategoryRatings 按评分取书。
func TestGetBooksForCategoryRatings(t *testing.T) {
	db := newQueryDB(t)
	ids, err := GetBooksForCategory(db, "ratings", 1)
	if err != nil {
		t.Fatalf("GetBooksForCategory: %v", err)
	}
	if len(ids) != 1 || ids[0] != 1 {
		t.Fatalf("评分 1 应有 1 本书，实际 %#v", ids)
	}
}

// TestGetBooksForCategoryLanguages 按语言取书。
func TestGetBooksForCategoryLanguages(t *testing.T) {
	db := newQueryDB(t)
	ids, err := GetBooksForCategory(db, "languages", 1)
	if err != nil {
		t.Fatalf("GetBooksForCategory: %v", err)
	}
	if len(ids) != 1 || ids[0] != 1 {
		t.Fatalf("语言 1 应有 1 本书，实际 %#v", ids)
	}
}

// TestGetBooksForCategoryUnknown 未知分类返回空结果（不报错）。
func TestGetBooksForCategoryUnknown(t *testing.T) {
	db := newQueryDB(t)
	ids, err := GetBooksForCategory(db, "not_a_category", 1)
	if err != nil {
		t.Fatalf("未知分类不应报错: %v", err)
	}
	if len(ids) != 0 {
		t.Fatalf("未知分类应返回空，实际 %#v", ids)
	}
}

// TestGetBooksForCategoryClosedDB 关闭的库返回错误。
func TestGetBooksForCategoryClosedDB(t *testing.T) {
	db := newQueryDB(t)
	_ = db.Close()
	if _, err := GetBooksForCategory(db, "authors", 1); err == nil {
		t.Fatal("关闭的库应返回错误")
	}
}

// TestGetCategories 返回分类的 (id, name, count)。
func TestGetCategories(t *testing.T) {
	db := newQueryDB(t)

	cats, err := GetCategories(db, "authors")
	if err != nil {
		t.Fatalf("GetCategories: %v", err)
	}
	if len(cats) != 2 {
		t.Fatalf("应有 2 个作者，实际 %#v", cats)
	}
	byName := map[string]Category{}
	for _, c := range cats {
		byName[c.Name] = c
	}
	if c, ok := byName["刘慈欣"]; !ok || c.Count != 2 {
		t.Errorf("刘慈欣应有 2 本，实际 %#v", c)
	}
	if c, ok := byName["余华"]; !ok || c.Count != 1 {
		t.Errorf("余华应有 1 本，实际 %#v", c)
	}
}

// TestGetCategoriesTags 标签分类。
func TestGetCategoriesTags(t *testing.T) {
	db := newQueryDB(t)
	cats, err := GetCategories(db, "tags")
	if err != nil {
		t.Fatalf("GetCategories: %v", err)
	}
	if len(cats) != 2 {
		t.Fatalf("应有 2 个标签，实际 %#v", cats)
	}
}

// TestGetCategoriesUnknown 未知分类返回空。
func TestGetCategoriesUnknown(t *testing.T) {
	db := newQueryDB(t)
	cats, err := GetCategories(db, "not_a_category")
	if err != nil {
		t.Fatalf("未知分类不应报错: %v", err)
	}
	if len(cats) != 0 {
		t.Fatalf("未知分类应返回空，实际 %#v", cats)
	}
}

// TestGetItemID 按名字取分类项 id。
func TestGetItemID(t *testing.T) {
	db := newQueryDB(t)
	id, err := GetItemID(db, "authors", "刘慈欣")
	if err != nil {
		t.Fatalf("GetItemID: %v", err)
	}
	if id != 1 {
		t.Fatalf("刘慈欣 id = %d, want 1", id)
	}
}

// TestGetItemIDMissing 不存在的名字返回 0。
func TestGetItemIDMissing(t *testing.T) {
	db := newQueryDB(t)
	id, err := GetItemID(db, "authors", "不存在的人")
	if err != nil {
		t.Fatalf("GetItemID: %v", err)
	}
	if id != 0 {
		t.Fatalf("不存在的名字应返回 0，实际 %d", id)
	}
}

// TestGetItemNameMap 返回 id→name 映射。
func TestGetItemNameMap(t *testing.T) {
	db := newQueryDB(t)
	m, err := GetItemNameMap(db, "authors")
	if err != nil {
		t.Fatalf("GetItemNameMap: %v", err)
	}
	if m[1] != "刘慈欣" || m[2] != "余华" {
		t.Fatalf("映射错误: %#v", m)
	}
}
