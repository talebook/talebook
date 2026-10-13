package userdb

import (
	"database/sql"
	"testing"
)

// TestSetPassword 重置密码后可用新密码登录。
func TestSetPassword(t *testing.T) {
	db := newUserDB(t)
	id := seedReader(t, db, "resetme", "oldhash", "oldsalt", false)

	if err := SetPassword(db, id, "newpass"); err != nil {
		t.Fatalf("SetPassword: %v", err)
	}
	r, err := GetReaderByID(db, id)
	if err != nil {
		t.Fatalf("GetReaderByID: %v", err)
	}
	if r.Salt != bcryptSaltMarker {
		t.Errorf("重置后应使用 bcrypt，salt = %q", r.Salt)
	}
	if !r.VerifyPassword("newpass") {
		t.Error("新密码应可校验")
	}
	if r.VerifyPassword("oldhash") {
		t.Error("旧密码不应再通过")
	}
}

// TestSetPasswordClosedDB 关闭的库返回错误。
func TestSetPasswordClosedDB(t *testing.T) {
	db := newUserDB(t)
	_ = db.Close()
	if err := SetPassword(db, 1, "x"); err == nil {
		t.Fatal("关闭的库应返回错误")
	}
}

// TestDeleteReader 删除读者。
func TestDeleteReader(t *testing.T) {
	db := newUserDB(t)
	id := seedReader(t, db, "deleteme", "h", "s", false)

	if err := DeleteReader(db, id); err != nil {
		t.Fatalf("DeleteReader: %v", err)
	}
	r, err := GetReaderByID(db, id)
	if err != nil {
		t.Fatalf("GetReaderByID: %v", err)
	}
	if r != nil {
		t.Fatal("读者应已被删除")
	}
}

// TestDeleteReaderMissing 删除不存在的读者返回错误。
func TestDeleteReaderMissing(t *testing.T) {
	db := newUserDB(t)
	if err := DeleteReader(db, 999); err == nil {
		t.Fatal("删除不存在的读者应报错")
	}
}

// TestDeleteReaderClosedDB 关闭的库返回错误。
func TestDeleteReaderClosedDB(t *testing.T) {
	db := newUserDB(t)
	_ = db.Close()
	if err := DeleteReader(db, 1); err == nil {
		t.Fatal("关闭的库应返回错误")
	}
}

// TestCreateReaderEmptyUsername 空用户名报错。
func TestCreateReaderEmptyUsername(t *testing.T) {
	db := newUserDB(t)
	if _, err := CreateReader(db, "   ", "pw", false); err == nil {
		t.Fatal("空用户名应报错")
	}
}

// TestCreateReaderClosedDB 关闭的库返回错误。
func TestCreateReaderClosedDB(t *testing.T) {
	db := newUserDB(t)
	_ = db.Close()
	if _, err := CreateReader(db, "x", "pw", false); err == nil {
		t.Fatal("关闭的库应返回错误")
	}
}

// TestUpdateAccessTimeClosedDB 关闭的库返回错误。
func TestUpdateAccessTimeClosedDB(t *testing.T) {
	db := newUserDB(t)
	_ = db.Close()
	if err := UpdateAccessTime(db, 1); err == nil {
		t.Fatal("关闭的库应返回错误")
	}
}

// TestListReadersClosedDB 关闭的库返回错误。
func TestListReadersClosedDB(t *testing.T) {
	db := newUserDB(t)
	_ = db.Close()
	if _, err := ListReaders(db); err == nil {
		t.Fatal("关闭的库应返回错误")
	}
}

// TestGetReaderByUsernameClosedDB 关闭的库返回错误。
func TestGetReaderByUsernameClosedDB(t *testing.T) {
	db := newUserDB(t)
	_ = db.Close()
	if _, err := GetReaderByUsername(db, "x"); err == nil {
		t.Fatal("关闭的库应返回错误")
	}
}

// TestVerifyPasswordNilReader nil 读者返回 false（不 panic）。
func TestVerifyPasswordNilReader(t *testing.T) {
	var r *Reader
	if r.VerifyPassword("x") {
		t.Fatal("nil 读者应返回 false")
	}
}

// TestIsAdminNilReader nil 读者返回 false。
func TestIsAdminNilReader(t *testing.T) {
	var r *Reader
	if r.IsAdmin() {
		t.Fatal("nil 读者应返回 false")
	}
}

// TestScanReaderInvalidExtra 非法 JSON 的 extra 不报错，降级为空 map。
func TestScanReaderInvalidExtra(t *testing.T) {
	db := newUserDB(t)
	res, err := db.Exec(
		`INSERT INTO readers (username, password, salt, admin, active, extra)
		 VALUES ('badjson', 'h', 's', 0, 1, 'not-json')`)
	if err != nil {
		t.Fatalf("seed: %v", err)
	}
	id, _ := res.LastInsertId()

	r, err := GetReaderByID(db, id)
	if err != nil {
		t.Fatalf("GetReaderByID: %v", err)
	}
	if r.Extra == nil {
		t.Fatal("非法 JSON 应降级为空 map，而非 nil")
	}
	if len(r.Extra) != 0 {
		t.Fatalf("非法 JSON 应得到空 map，实际 %#v", r.Extra)
	}
}

// TestScanReaderValidExtra 合法 JSON 的 extra 被解析。
func TestScanReaderValidExtra(t *testing.T) {
	db := newUserDB(t)
	res, err := db.Exec(
		`INSERT INTO readers (username, password, salt, admin, active, extra)
		 VALUES ('goodjson', 'h', 's', 0, 1, '{"kindle_email":"a@b.com"}')`)
	if err != nil {
		t.Fatalf("seed: %v", err)
	}
	id, _ := res.LastInsertId()

	r, err := GetReaderByID(db, id)
	if err != nil {
		t.Fatalf("GetReaderByID: %v", err)
	}
	if r.Extra["kindle_email"] != "a@b.com" {
		t.Fatalf("extra 解析错误: %#v", r.Extra)
	}
}

// TestHashPasswordError 空密码也能哈希（bcrypt 允许）。
func TestHashPasswordError(t *testing.T) {
	hash, salt, err := HashPassword("")
	if err != nil {
		t.Fatalf("HashPassword: %v", err)
	}
	if hash == "" || salt != bcryptSaltMarker {
		t.Fatalf("哈希结果异常: hash=%q salt=%q", hash, salt)
	}
}

// TestGetReaderByIDNullColumns NULL 列被降级为空值。
func TestGetReaderByIDNullColumns(t *testing.T) {
	db := newUserDB(t)
	res, err := db.Exec(
		`INSERT INTO readers (username, password, salt, name, email, avatar, admin, active, permission, extra)
		 VALUES ('nulls', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)`)
	if err != nil {
		t.Fatalf("seed: %v", err)
	}
	id, _ := res.LastInsertId()

	r, err := GetReaderByID(db, id)
	if err != nil {
		t.Fatalf("GetReaderByID: %v", err)
	}
	// username 有值，其余 NULL 列应降级为空串/false。
	if r.Username != "nulls" {
		t.Fatalf("Username = %q, want nulls", r.Username)
	}
	if r.Password != "" || r.Salt != "" || r.Name != "" || r.Email != "" || r.Avatar != "" || r.Permission != "" {
		t.Fatalf("NULL 列应降级为空串: %#v", r)
	}
	if r.Admin {
		t.Error("NULL admin 应为 false")
	}
	if !r.Active {
		t.Error("NULL active 应降级为 true（COALESCE 默认 1）")
	}
}

// TestReaderColumnsScanAll 确保 readerColumns 与 scanReader 的列数一致。
func TestReaderColumnsScanAll(t *testing.T) {
	db := newUserDB(t)
	seedReader(t, db, "cols", "h", "s", false)

	rows, err := db.Query(`SELECT ` + readerColumns + ` FROM readers`)
	if err != nil {
		t.Fatalf("query: %v", err)
	}
	defer rows.Close()
	if !rows.Next() {
		t.Fatal("应有数据")
	}
	if _, err := scanReader(rows); err != nil {
		t.Fatalf("scanReader 列数不匹配: %v", err)
	}
}

// TestGetReaderByIDClosedDB 关闭的库返回错误。
func TestGetReaderByIDClosedDB(t *testing.T) {
	db := newUserDB(t)
	_ = db.Close()
	if _, err := GetReaderByID(db, 1); err == nil {
		t.Fatal("关闭的库应返回错误")
	}
}

// TestScanReaderNoRows 无行时返回 sql.ErrNoRows。
func TestScanReaderNoRows(t *testing.T) {
	db := newUserDB(t)
	row := db.QueryRow(`SELECT ` + readerColumns + ` FROM readers WHERE id = 999`)
	if _, err := scanReader(row); err != sql.ErrNoRows {
		t.Fatalf("应返回 sql.ErrNoRows，实际 %v", err)
	}
}
