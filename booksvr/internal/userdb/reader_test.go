package userdb

import (
	"database/sql"
	"path/filepath"
	"testing"

	_ "modernc.org/sqlite"
)

// newUserDB 建一个与 Python models.py 对齐的用户库。
//
// 表结构逐字段复刻 webserver/models.py 的 Reader 模型。
func newUserDB(t *testing.T) *sql.DB {
	t.Helper()
	path := filepath.Join(t.TempDir(), "users.db")
	db, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	stmts := []string{
		`CREATE TABLE readers (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username VARCHAR(200),
			password VARCHAR(200) DEFAULT '',
			salt VARCHAR(200),
			name VARCHAR(100),
			email VARCHAR(200),
			avatar VARCHAR(200),
			admin BOOLEAN DEFAULT 0,
			active BOOLEAN DEFAULT 1,
			permission VARCHAR(100) DEFAULT '',
			create_time DATETIME,
			update_time DATETIME,
			access_time DATETIME,
			extra TEXT DEFAULT '{}'
		)`,
		`CREATE TABLE messages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			reader_id INTEGER,
			status VARCHAR(50),
			message TEXT,
			create_time DATETIME
		)`,
		`CREATE TABLE items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			book_id INTEGER,
			reader_id INTEGER,
			create_time DATETIME,
			count_guest INTEGER DEFAULT 0,
			count_visit INTEGER DEFAULT 0,
			count_download INTEGER DEFAULT 0
		)`,
		`CREATE TABLE reading_state (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			reader_id INTEGER,
			book_id INTEGER,
			wants BOOLEAN DEFAULT 0,
			reading BOOLEAN DEFAULT 0,
			finished BOOLEAN DEFAULT 0,
			create_time DATETIME,
			update_time DATETIME
		)`,
		`CREATE TABLE annotations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			reader_id INTEGER,
			book_id INTEGER,
			annotation_id VARCHAR(200),
			highlight TEXT,
			note TEXT,
			chapter VARCHAR(200),
			create_time DATETIME,
			update_time DATETIME
		)`,
		`CREATE TABLE scanfiles (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			book_id INTEGER,
			path VARCHAR(500),
			format VARCHAR(50),
			status VARCHAR(50),
			create_time DATETIME
		)`,
		`CREATE TABLE opds_sources (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name VARCHAR(200),
			url VARCHAR(500),
			active BOOLEAN DEFAULT 1,
			create_time DATETIME
		)`,
		`CREATE TABLE book_sources (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			bookSourceName VARCHAR(200),
			bookSourceUrl VARCHAR(500),
			bookSourceGroup VARCHAR(200),
			enabled BOOLEAN DEFAULT 1,
			create_time DATETIME
		)`,
		`CREATE TABLE devices (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			reader_id INTEGER,
			device_id VARCHAR(200),
			create_time DATETIME
		)`,
	}
	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			t.Fatalf("create table: %v\n%s", err, s)
		}
	}
	return db
}

// seedReader 插入一个读者，返回 id。
func seedReader(t *testing.T, db *sql.DB, username, password, salt string, admin bool) int64 {
	t.Helper()
	adminVal := 0
	if admin {
		adminVal = 1
	}
	res, err := db.Exec(
		`INSERT INTO readers (username, password, salt, name, email, admin, active, permission, extra)
		 VALUES (?, ?, ?, ?, ?, ?, 1, '', '{}')`,
		username, password, salt, username, username+"@example.com", adminVal)
	if err != nil {
		t.Fatalf("seed reader: %v", err)
	}
	id, _ := res.LastInsertId()
	return id
}

// TestGetReaderByID 按 id 取读者。
func TestGetReaderByID(t *testing.T) {
	db := newUserDB(t)
	id := seedReader(t, db, "alice", "hash", "salt", false)

	r, err := GetReaderByID(db, id)
	if err != nil {
		t.Fatalf("GetReaderByID: %v", err)
	}
	if r == nil {
		t.Fatal("应找到读者")
	}
	if r.Username != "alice" || r.ID != id {
		t.Fatalf("数据错误: %#v", r)
	}
	if r.IsAdmin() {
		t.Error("不应是管理员")
	}
}

// TestGetReaderByIDMissing 不存在的 id 返回 nil。
func TestGetReaderByIDMissing(t *testing.T) {
	db := newUserDB(t)
	r, err := GetReaderByID(db, 999)
	if err != nil {
		t.Fatalf("GetReaderByID: %v", err)
	}
	if r != nil {
		t.Fatalf("应返回 nil，实际 %#v", r)
	}
}

// TestGetReaderByUsername 按用户名取读者。
func TestGetReaderByUsername(t *testing.T) {
	db := newUserDB(t)
	seedReader(t, db, "bob", "hash", "salt", true)

	r, err := GetReaderByUsername(db, "bob")
	if err != nil {
		t.Fatalf("GetReaderByUsername: %v", err)
	}
	if r == nil || r.Username != "bob" {
		t.Fatalf("应找到 bob，实际 %#v", r)
	}
	if !r.IsAdmin() {
		t.Error("应是管理员")
	}
}

// TestGetReaderByUsernameMissing 不存在的用户名返回 nil。
func TestGetReaderByUsernameMissing(t *testing.T) {
	db := newUserDB(t)
	r, err := GetReaderByUsername(db, "nobody")
	if err != nil {
		t.Fatalf("GetReaderByUsername: %v", err)
	}
	if r != nil {
		t.Fatalf("应返回 nil，实际 %#v", r)
	}
}

// TestLegacyPasswordVerify 旧 SHA256+salt 密码校验。
func TestLegacyPasswordVerify(t *testing.T) {
	db := newUserDB(t)
	// 用 Python 算法算出期望哈希。
	salt := "abcdefghijklmnopqrstuvwxyz012345"
	want := legacyHash("secret123", salt)
	id := seedReader(t, db, "legacy", want, salt, false)

	r, err := GetReaderByID(db, id)
	if err != nil {
		t.Fatalf("GetReaderByID: %v", err)
	}
	if !r.VerifyPassword("secret123") {
		t.Error("正确密码应通过校验")
	}
	if r.VerifyPassword("wrong") {
		t.Error("错误密码不应通过校验")
	}
}

// TestBcryptPasswordVerify bcrypt 密码校验。
func TestBcryptPasswordVerify(t *testing.T) {
	db := newUserDB(t)
	hash := bcryptHash(t, "secret123")
	id := seedReader(t, db, "bcryptuser", hash, "__bcrypt__", false)

	r, err := GetReaderByID(db, id)
	if err != nil {
		t.Fatalf("GetReaderByID: %v", err)
	}
	if !r.VerifyPassword("secret123") {
		t.Error("正确密码应通过校验")
	}
	if r.VerifyPassword("wrong") {
		t.Error("错误密码不应通过校验")
	}
}

// TestVerifyPasswordEmptySalt 空 salt 的旧密码。
func TestVerifyPasswordEmptySalt(t *testing.T) {
	db := newUserDB(t)
	want := legacyHash("pw", "")
	id := seedReader(t, db, "nosalt", want, "", false)

	r, _ := GetReaderByID(db, id)
	if !r.VerifyPassword("pw") {
		t.Error("空 salt 的正确密码应通过校验")
	}
}

// TestCreateReader 创建读者。
func TestCreateReader(t *testing.T) {
	db := newUserDB(t)

	id, err := CreateReader(db, "newuser", "pw123", false)
	if err != nil {
		t.Fatalf("CreateReader: %v", err)
	}
	if id <= 0 {
		t.Fatalf("应返回正数 id，实际 %d", id)
	}

	r, err := GetReaderByID(db, id)
	if err != nil {
		t.Fatalf("GetReaderByID: %v", err)
	}
	if r.Username != "newuser" {
		t.Errorf("Username = %q", r.Username)
	}
	if r.Salt != "__bcrypt__" {
		t.Errorf("新密码应使用 bcrypt，salt = %q", r.Salt)
	}
	if !r.VerifyPassword("pw123") {
		t.Error("新密码应可校验")
	}
}

// TestCreateReaderDuplicateUsername 重复用户名报错。
func TestCreateReaderDuplicateUsername(t *testing.T) {
	db := newUserDB(t)
	seedReader(t, db, "dup", "h", "s", false)
	if _, err := CreateReader(db, "dup", "pw", false); err == nil {
		t.Fatal("重复用户名应报错")
	}
}

// TestUpdateReaderAccessTime 更新访问时间。
func TestUpdateReaderAccessTime(t *testing.T) {
	db := newUserDB(t)
	id := seedReader(t, db, "acc", "h", "s", false)

	if err := UpdateAccessTime(db, id); err != nil {
		t.Fatalf("UpdateAccessTime: %v", err)
	}
	r, _ := GetReaderByID(db, id)
	if r.AccessTime == "" {
		t.Error("AccessTime 应被写入")
	}
}

// TestListReaders 列出全部读者。
func TestListReaders(t *testing.T) {
	db := newUserDB(t)
	seedReader(t, db, "u1", "h", "s", false)
	seedReader(t, db, "u2", "h", "s", true)

	readers, err := ListReaders(db)
	if err != nil {
		t.Fatalf("ListReaders: %v", err)
	}
	if len(readers) != 2 {
		t.Fatalf("应有 2 个读者，实际 %d", len(readers))
	}
}

// TestReaderClosedDB 关闭的库返回错误。
func TestReaderClosedDB(t *testing.T) {
	db := newUserDB(t)
	_ = db.Close()
	if _, err := GetReaderByID(db, 1); err == nil {
		t.Fatal("关闭的库应返回错误")
	}
}
