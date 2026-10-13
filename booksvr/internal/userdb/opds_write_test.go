package userdb

import (
	"database/sql"
	"testing"

	_ "modernc.org/sqlite"
)

// opdsDB 建一个含 opds_sources 表的内存库。
func opdsDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if _, err := db.Exec(`CREATE TABLE opds_sources (
		id INTEGER PRIMARY KEY AUTOINCREMENT, name VARCHAR(200) NOT NULL, url VARCHAR(1000) NOT NULL,
		description VARCHAR(500), active BOOLEAN, create_time DATETIME, update_time DATETIME,
		data VARCHAR(255))`); err != nil {
		t.Fatalf("建表失败: %v", err)
	}
	return db
}

// TestOpdsSourceCRUD 覆盖 opds_sources 的完整读写。
func TestOpdsSourceCRUD(t *testing.T) {
	db := opdsDB(t)

	id, err := CreateOpdsSource(db, "n", "https://a.com", "d")
	if err != nil {
		t.Fatalf("CreateOpdsSource 失败: %v", err)
	}
	if id == 0 {
		t.Fatal("应返回非零 id")
	}

	got, err := GetOpdsSourceByID(db, id)
	if err != nil || got == nil {
		t.Fatalf("GetOpdsSourceByID = (%v,%v)", got, err)
	}
	if got.Name != "n" || got.URL != "https://a.com" || got.Description != "d" {
		t.Errorf("字段不符: %+v", got)
	}
	if !got.Active {
		t.Error("新建记录应 active=true")
	}
	if got.CreateTime == "" || got.UpdateTime == "" {
		t.Errorf("时间字段不应为空: %+v", got)
	}
	if got.Data == nil {
		t.Error("Data 不应为 nil")
	}

	byName, err := GetOpdsSourceByName(db, "n")
	if err != nil || byName == nil || byName.ID != id {
		t.Fatalf("GetOpdsSourceByName = (%v,%v)", byName, err)
	}

	list, err := ListOpdsSourcesByCreateTimeDesc(db)
	if err != nil || len(list) != 1 {
		t.Fatalf("ListOpdsSourcesByCreateTimeDesc = (%v,%v)", list, err)
	}

	// 部分更新：只改 name 与 active。
	name := "n2"
	active := false
	if err := UpdateOpdsSource(db, id, &name, nil, nil, &active); err != nil {
		t.Fatalf("UpdateOpdsSource 失败: %v", err)
	}
	got, _ = GetOpdsSourceByID(db, id)
	if got.Name != "n2" || got.Active || got.URL != "https://a.com" || got.Description != "d" {
		t.Errorf("部分更新结果不符: %+v", got)
	}

	// 全字段更新。
	url := "https://b.com"
	desc := "d2"
	active = true
	if err := UpdateOpdsSource(db, id, &name, &url, &desc, &active); err != nil {
		t.Fatalf("UpdateOpdsSource 失败: %v", err)
	}
	got, _ = GetOpdsSourceByID(db, id)
	if got.URL != "https://b.com" || got.Description != "d2" || !got.Active {
		t.Errorf("全字段更新结果不符: %+v", got)
	}

	// 只改 description。
	desc = "only"
	if err := UpdateOpdsSource(db, id, nil, nil, &desc, nil); err != nil {
		t.Fatalf("UpdateOpdsSource 失败: %v", err)
	}
	got, _ = GetOpdsSourceByID(db, id)
	if got.Description != "only" || got.Name != "n2" {
		t.Errorf("单字段更新结果不符: %+v", got)
	}

	if err := DeleteOpdsSource(db, id); err != nil {
		t.Fatalf("DeleteOpdsSource 失败: %v", err)
	}
	if got, _ := GetOpdsSourceByID(db, id); got != nil {
		t.Error("删除后应查不到")
	}
}

// TestOpdsSourceMissingRows 覆盖「不存在返回 nil」语义。
func TestOpdsSourceMissingRows(t *testing.T) {
	db := opdsDB(t)
	if got, err := GetOpdsSourceByID(db, 99999); err != nil || got != nil {
		t.Errorf("GetOpdsSourceByID 缺失行应返回 (nil,nil)，得到 (%v,%v)", got, err)
	}
	if got, err := GetOpdsSourceByName(db, "nope"); err != nil || got != nil {
		t.Errorf("GetOpdsSourceByName 缺失行应返回 (nil,nil)，得到 (%v,%v)", got, err)
	}
	list, err := ListOpdsSourcesByCreateTimeDesc(db)
	if err != nil || len(list) != 0 {
		t.Errorf("空表应返回空切片，得到 (%v,%v)", list, err)
	}
}

// TestOpdsSourceListOrder 覆盖按创建时间倒序。
func TestOpdsSourceListOrder(t *testing.T) {
	db := opdsDB(t)
	for _, row := range []struct{ name, ct string }{
		{"first", "2026-01-01 00:00:00"},
		{"second", "2026-02-01 00:00:00"},
		{"third", "2026-03-01 00:00:00"},
	} {
		if _, err := db.Exec(`INSERT INTO opds_sources (name, url, active, create_time, update_time, data)
			VALUES (?, 'https://a.com', 1, ?, ?, '{}')`, row.name, row.ct, row.ct); err != nil {
			t.Fatalf("插入失败: %v", err)
		}
	}
	list, err := ListOpdsSourcesByCreateTimeDesc(db)
	if err != nil || len(list) != 3 {
		t.Fatalf("应有 3 条，得到 (%v,%v)", list, err)
	}
	if list[0].Name != "third" || list[2].Name != "first" {
		t.Errorf("应按创建时间倒序，得到 %s..%s", list[0].Name, list[2].Name)
	}
}

// TestOpdsSourceNullColumns 覆盖 NULL 列降级。
func TestOpdsSourceNullColumns(t *testing.T) {
	db := opdsDB(t)
	if _, err := db.Exec(`INSERT INTO opds_sources (id, name, url, description, active,
		create_time, update_time, data) VALUES (1, 'n', 'u', NULL, NULL, NULL, NULL, NULL)`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}

	got, err := GetOpdsSourceByID(db, 1)
	if err != nil || got == nil {
		t.Fatalf("GetOpdsSourceByID = (%v,%v)", got, err)
	}
	if got.Description != "" || got.CreateTime != "" || got.UpdateTime != "" {
		t.Errorf("NULL 列应降级为空串: %+v", got)
	}
	if !got.Active {
		t.Error("NULL active 应降级为 true")
	}
	if got.Data == nil {
		t.Error("NULL data 应降级为空 map")
	}
}

// TestOpdsSourceWriteErrors 覆盖写操作的错误分支。
func TestOpdsSourceWriteErrors(t *testing.T) {
	db := opdsDB(t)
	db.Close()

	if _, err := CreateOpdsSource(db, "n", "u", "d"); err == nil {
		t.Error("CreateOpdsSource 在库不可用时应报错")
	}
	if _, err := GetOpdsSourceByID(db, 1); err == nil {
		t.Error("GetOpdsSourceByID 在库不可用时应报错")
	}
	if _, err := GetOpdsSourceByName(db, "n"); err == nil {
		t.Error("GetOpdsSourceByName 在库不可用时应报错")
	}
	if _, err := ListOpdsSourcesByCreateTimeDesc(db); err == nil {
		t.Error("ListOpdsSourcesByCreateTimeDesc 在库不可用时应报错")
	}
	name := "x"
	if err := UpdateOpdsSource(db, 1, &name, nil, nil, nil); err == nil {
		t.Error("UpdateOpdsSource 在库不可用时应报错")
	}
	if err := DeleteOpdsSource(db, 1); err == nil {
		t.Error("DeleteOpdsSource 在库不可用时应报错")
	}
}

// TestBoolToIntAndJoinComma 覆盖两个小工具。
func TestBoolToIntAndJoinComma(t *testing.T) {
	if boolToInt(true) != 1 || boolToInt(false) != 0 {
		t.Error("boolToInt 结果不符")
	}
	if got := joinComma([]string{"a", "b", "c"}); got != "a, b, c" {
		t.Errorf("joinComma = %q", got)
	}
	if got := joinComma(nil); got != "" {
		t.Errorf("空切片应返回空串，得到 %q", got)
	}
	if got := joinComma([]string{"only"}); got != "only" {
		t.Errorf("单元素 = %q", got)
	}
}
