package userdb

import (
	"database/sql"
	"testing"

	_ "modernc.org/sqlite"
)

// TestOpdsSourceScanError 覆盖行扫描失败分支。
//
// 列数必须与查询一致（否则 db.Query 阶段就失败），但让 id 列存文本，
// 使 Scan 到 *int64 时报错。
func TestOpdsSourceScanError(t *testing.T) {
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if _, err := db.Exec(`CREATE TABLE opds_sources (
		id, name, url, description, active, create_time, update_time, data)`); err != nil {
		t.Fatalf("建表失败: %v", err)
	}
	// id 存非数字文本 → Scan 到 *int64 失败。
	if _, err := db.Exec(`INSERT INTO opds_sources VALUES
		('not-a-number', 'n', 'u', 'd', 1, 'c', 'u', '{}')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}

	if _, err := ListOpdsSourcesByCreateTimeDesc(db); err == nil {
		t.Error("id 非数字时列表应报错")
	}
	// 按 id 查不到（id 是文本），返回 (nil,nil)。
	if got, err := GetOpdsSourceByID(db, 1); err != nil || got != nil {
		t.Errorf("文本 id 应查不到，得到 (%v,%v)", got, err)
	}
	// 按 name 能查到行，但 Scan 到 *int64 失败。
	if _, err := GetOpdsSourceByName(db, "n"); err == nil {
		t.Error("id 非数字时按名查询应报错")
	}
}

// TestOpdsSourceCreateError 覆盖插入失败分支。
//
// 表带 NOT NULL 约束，传入 NULL 触发失败。
func TestOpdsSourceCreateError(t *testing.T) {
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	// name 为 NOT NULL，但这里用 CHECK 约束让任意插入都失败。
	if _, err := db.Exec(`CREATE TABLE opds_sources (
		id INTEGER PRIMARY KEY AUTOINCREMENT, name VARCHAR(200) NOT NULL, url VARCHAR(1000) NOT NULL,
		description VARCHAR(500), active BOOLEAN, create_time DATETIME, update_time DATETIME,
		data VARCHAR(255), CHECK (name <> 'forbidden'))`); err != nil {
		t.Fatalf("建表失败: %v", err)
	}

	if _, err := CreateOpdsSource(db, "forbidden", "u", "d"); err == nil {
		t.Error("违反 CHECK 约束时应报错")
	}
}

// TestOpdsSourceUpdateNoFields 覆盖「只刷新 update_time」的更新路径。
func TestOpdsSourceUpdateNoFields(t *testing.T) {
	db := opdsDB(t)
	id, err := CreateOpdsSource(db, "n", "https://a.com", "d")
	if err != nil {
		t.Fatalf("CreateOpdsSource 失败: %v", err)
	}

	// 不传任何可变字段，只应刷新 update_time。
	if err := UpdateOpdsSource(db, id, nil, nil, nil, nil); err != nil {
		t.Fatalf("UpdateOpdsSource 失败: %v", err)
	}
	got, _ := GetOpdsSourceByID(db, id)
	if got.Name != "n" || got.URL != "https://a.com" || got.Description != "d" {
		t.Errorf("无字段更新不应改动数据: %+v", got)
	}
}
