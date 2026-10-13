package library

import (
	"testing"
)

// TestFieldMetadataBuiltin 内置字段齐备。
func TestFieldMetadataBuiltin(t *testing.T) {
	db := newQueryDB(t)
	fields, err := FieldMetadata(db)
	if err != nil {
		t.Fatalf("FieldMetadata: %v", err)
	}
	for _, name := range []string{"title", "authors", "tags", "series", "publisher", "rating", "languages", "comments", "timestamp", "pubdate"} {
		if _, ok := fields[name]; !ok {
			t.Errorf("缺少内置字段 %q", name)
		}
	}
}

// TestFieldMetadataCustomColumns 从 custom_columns 读自定义字段。
func TestFieldMetadataCustomColumns(t *testing.T) {
	db := newQueryDB(t)
	if _, err := db.Exec(
		`INSERT INTO custom_columns (id,label,name,datatype,display,is_multiple,normalized)
		 VALUES (1,'myfield','我的字段','text','{}',0,0)`); err != nil {
		t.Fatalf("seed: %v", err)
	}
	fields, err := FieldMetadata(db)
	if err != nil {
		t.Fatalf("FieldMetadata: %v", err)
	}
	f, ok := fields["myfield"]
	if !ok {
		t.Fatal("缺少自定义字段 myfield")
	}
	if f.Name != "我的字段" || f.Datatype != "text" {
		t.Fatalf("自定义字段属性错误: %#v", f)
	}
}

// TestFieldMetadataSortable 可排序性标记。
func TestFieldMetadataSortable(t *testing.T) {
	db := newQueryDB(t)
	fields, err := FieldMetadata(db)
	if err != nil {
		t.Fatalf("FieldMetadata: %v", err)
	}
	if !fields["title"].Sortable {
		t.Error("title 应可排序")
	}
	if fields["comments"].Sortable {
		t.Error("comments 不应可排序")
	}
}

// TestAllFieldNames 返回全部字段名。
func TestAllFieldNames(t *testing.T) {
	db := newQueryDB(t)
	names, err := AllFieldNames(db)
	if err != nil {
		t.Fatalf("AllFieldNames: %v", err)
	}
	if len(names) == 0 {
		t.Fatal("应返回非空字段名列表")
	}
}

// TestFieldMetadataClosedDB 关闭的库返回错误。
func TestFieldMetadataClosedDB(t *testing.T) {
	db := newQueryDB(t)
	_ = db.Close()
	if _, err := FieldMetadata(db); err == nil {
		t.Fatal("关闭的库应返回错误")
	}
}
