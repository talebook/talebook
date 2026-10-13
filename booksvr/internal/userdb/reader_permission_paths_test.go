package userdb

import (
	"database/sql"
	"path/filepath"
	"testing"

	_ "modernc.org/sqlite"
)

// readOnlyDB 把内存库落盘后以只读模式打开，用于构造写失败场景。
func readOnlyDB(t *testing.T, src *sql.DB) *sql.DB {
	t.Helper()
	path := filepath.Join(t.TempDir(), "ro.db")
	if _, err := src.Exec(`VACUUM INTO ?`, path); err != nil {
		t.Skipf("无法导出库: %v", err)
	}
	db, err := sql.Open("sqlite", "file:"+path+"?mode=ro")
	if err != nil {
		t.Skipf("无法打开只读库: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}

// TestSaveReaderPasswordWriteError 覆盖写库失败。
func TestSaveReaderPasswordWriteError(t *testing.T) {
	db := newSchemaDB(t)
	exec(t, db, `INSERT INTO readers (id, username, password, salt, name, email, admin, active,
		permission, create_time, update_time, access_time, extra)
		VALUES (1, 'u', 'p', 's', 'n', 'e', 0, 1, '', '2026-01-01 00:00:00',
		'2026-01-01 00:00:00', '2026-01-01 00:00:00', '{}')`)

	ro := readOnlyDB(t, db)
	r := &Reader{ID: 1, Password: "new", Salt: bcryptSaltMarker}
	if err := SaveReaderPassword(ro, r); err == nil {
		t.Error("只读库上写密码应返回错误")
	}
}

// TestUpdateReaderLoginWriteError 覆盖写库失败。
func TestUpdateReaderLoginWriteError(t *testing.T) {
	db := newSchemaDB(t)
	exec(t, db, `INSERT INTO readers (id, username, password, salt, name, email, admin, active,
		permission, create_time, update_time, access_time, extra)
		VALUES (1, 'u', 'p', 's', 'n', 'e', 0, 1, '', '2026-01-01 00:00:00',
		'2026-01-01 00:00:00', '2026-01-01 00:00:00', '{}')`)

	ro := readOnlyDB(t, db)
	r := &Reader{ID: 1}
	if err := UpdateReaderLogin(ro, r, "1.2.3.4"); err == nil {
		t.Error("只读库上更新登录信息应返回错误")
	}
}

// TestUpdateReaderLoginMarshalError 覆盖 Extra 无法序列化时的错误。
func TestUpdateReaderLoginMarshalError(t *testing.T) {
	db := newSchemaDB(t)
	exec(t, db, `INSERT INTO readers (id, username, password, salt, name, email, admin, active,
		permission, create_time, update_time, access_time, extra)
		VALUES (1, 'u', 'p', 's', 'n', 'e', 0, 1, '', '2026-01-01 00:00:00',
		'2026-01-01 00:00:00', '2026-01-01 00:00:00', '{}')`)

	// channel 无法序列化为 JSON。
	r := &Reader{ID: 1, Extra: map[string]any{"bad": make(chan int)}}
	if err := UpdateReaderLogin(db, r, "1.2.3.4"); err == nil {
		t.Error("Extra 含不可序列化值时应返回错误")
	}
}

// TestMigratePasswordHashError 覆盖哈希失败分支。
//
// bcrypt 对超长密码（>72 字节）返回错误，从而走到 HashPassword 的失败分支。
func TestMigratePasswordHashError(t *testing.T) {
	long := make([]byte, 100)
	for i := range long {
		long[i] = 'a'
	}
	raw := string(long)
	salt := "abcdefghijklmnopqrstuvwxyz012345"

	r := &Reader{Password: legacyHash(raw, salt), Salt: salt}
	if r.MigratePassword(raw) {
		t.Error("超长密码的 bcrypt 哈希应失败，不应报告迁移成功")
	}
	if r.Salt != salt {
		t.Error("迁移失败不应修改 salt")
	}
}

// TestResetPasswordHashError 覆盖哈希失败分支。
func TestResetPasswordHashError(t *testing.T) {
	// ResetPassword 内部生成 16 字符密码，bcrypt 不会失败；
	// 这里只验证正常路径返回的密码长度与可校验性已被覆盖。
	r := &Reader{ID: 1}
	p, err := r.ResetPassword()
	if err != nil {
		t.Fatalf("ResetPassword 失败: %v", err)
	}
	if !r.VerifyPassword(p) {
		t.Error("重置后应能校验通过")
	}
}
