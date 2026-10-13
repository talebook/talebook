package library

import (
	"testing"
)

// TestAllBookIDs 返回全部书籍 id（升序）。
func TestAllBookIDs(t *testing.T) {
	db := newQueryDB(t)
	ids, err := AllBookIDs(db)
	if err != nil {
		t.Fatalf("AllBookIDs: %v", err)
	}
	if len(ids) != 3 {
		t.Fatalf("应有 3 本书，实际 %#v", ids)
	}
	if ids[0] != 1 || ids[2] != 3 {
		t.Fatalf("应升序，实际 %#v", ids)
	}
}

// TestHasID 判断书籍是否存在。
func TestHasID(t *testing.T) {
	db := newQueryDB(t)
	ok, err := HasID(db, 1)
	if err != nil {
		t.Fatalf("HasID: %v", err)
	}
	if !ok {
		t.Fatal("id=1 应存在")
	}
	ok, err = HasID(db, 999)
	if err != nil {
		t.Fatalf("HasID: %v", err)
	}
	if ok {
		t.Fatal("id=999 不应存在")
	}
}

// TestBooksWithSameTitle 按书名+作者找同书。
func TestBooksWithSameTitle(t *testing.T) {
	db := newQueryDB(t)
	ids, err := BooksWithSameTitle(db, "三体", "刘慈欣")
	if err != nil {
		t.Fatalf("BooksWithSameTitle: %v", err)
	}
	if len(ids) != 1 || ids[0] != 1 {
		t.Fatalf("应找到 id=1，实际 %#v", ids)
	}
}

// TestBooksWithSameTitleNoMatch 无匹配返回空。
func TestBooksWithSameTitleNoMatch(t *testing.T) {
	db := newQueryDB(t)
	ids, err := BooksWithSameTitle(db, "不存在的书", "无名")
	if err != nil {
		t.Fatalf("BooksWithSameTitle: %v", err)
	}
	if len(ids) != 0 {
		t.Fatalf("应返回空，实际 %#v", ids)
	}
}

// TestLastModified 返回库的最后修改时间。
func TestLastModified(t *testing.T) {
	db := newQueryDB(t)
	ts, err := LastModified(db)
	if err != nil {
		t.Fatalf("LastModified: %v", err)
	}
	if ts == "" {
		t.Fatal("应返回非空时间戳")
	}
}

// TestFormatAbsPath 返回格式文件的绝对路径。
func TestFormatAbsPath(t *testing.T) {
	db := newQueryDB(t)
	path, err := FormatAbsPath(db, 1, "EPUB", "/library")
	if err != nil {
		t.Fatalf("FormatAbsPath: %v", err)
	}
	if path == "" {
		t.Fatal("应返回非空路径")
	}
}

// TestSort 按字段排序返回 id。
func TestSort(t *testing.T) {
	db := newQueryDB(t)
	ids, err := Sort(db, "title", true)
	if err != nil {
		t.Fatalf("Sort: %v", err)
	}
	if len(ids) != 3 {
		t.Fatalf("应有 3 本，实际 %#v", ids)
	}
}

// TestFieldFor 取单本书的单个字段。
func TestFieldFor(t *testing.T) {
	db := newQueryDB(t)
	v, err := FieldFor(db, "title", 1)
	if err != nil {
		t.Fatalf("FieldFor: %v", err)
	}
	if v != "三体" {
		t.Fatalf("title = %v, want 三体", v)
	}
}

// TestFieldForUnknownField 未知字段返回 nil。
func TestFieldForUnknownField(t *testing.T) {
	db := newQueryDB(t)
	v, err := FieldFor(db, "not_a_field", 1)
	if err != nil {
		t.Fatalf("未知字段不应报错: %v", err)
	}
	if v != nil {
		t.Fatalf("未知字段应返回 nil，实际 %#v", v)
	}
}
