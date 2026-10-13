package userdb

import (
	"strings"
	"testing"
)

// TestHasPermission 覆盖权限串的大小写语义。
func TestHasPermission(t *testing.T) {
	cases := []struct {
		perm  string
		op    string
		def   bool
		want  bool
		label string
	}{
		{"", "l", true, true, "空权限串取默认值 true"},
		{"", "l", false, false, "空权限串取默认值 false"},
		{"lr", "l", false, true, "小写字母表示允许"},
		{"LR", "l", true, false, "大写字母表示显式拒绝"},
		{"lr", "u", false, false, "未出现的操作取默认值 false"},
		{"lr", "u", true, true, "未出现的操作取默认值 true"},
		{"lR", "r", true, false, "混合串里大写优先命中拒绝"},
	}
	for _, c := range cases {
		r := &Reader{Permission: c.perm}
		if got := r.HasPermission(c.op, c.def); got != c.want {
			t.Errorf("%s: HasPermission(%q,%v) = %v, want %v", c.label, c.op, c.def, got, c.want)
		}
	}

	var nilReader *Reader
	if nilReader.HasPermission("l", true) {
		t.Error("nil Reader 应返回 false")
	}
}

// TestCanXHelpers 覆盖各 can_* 便捷方法。
func TestCanXHelpers(t *testing.T) {
	allow := &Reader{Permission: "lruedpsv"}
	if !allow.CanLogin() || !allow.CanRead() || !allow.CanUpload() || !allow.CanEdit() ||
		!allow.CanDelete() || !allow.CanPush() || !allow.CanSave() || !allow.CanView() {
		t.Error("全允许权限串应让所有 can_* 为 true")
	}

	deny := &Reader{Permission: "LRUEDPSV"}
	if deny.CanLogin() || deny.CanRead() || deny.CanUpload() || deny.CanEdit() ||
		deny.CanDelete() || deny.CanPush() || deny.CanSave() || deny.CanView() {
		t.Error("全拒绝权限串应让所有 can_* 为 false")
	}

	// 空权限串：默认允许。
	def := &Reader{}
	if !def.CanLogin() || !def.CanRead() {
		t.Error("空权限串应默认允许")
	}
}

// TestIsActive 覆盖 is_active。
func TestIsActive(t *testing.T) {
	if !(&Reader{Active: true}).IsActive() {
		t.Error("active=true 应为 true")
	}
	if (&Reader{Active: false}).IsActive() {
		t.Error("active=false 应为 false")
	}
	var nilReader *Reader
	if nilReader.IsActive() {
		t.Error("nil Reader 应为 false")
	}
}

// TestNeedsPasswordMigration 覆盖新旧格式判定。
func TestNeedsPasswordMigration(t *testing.T) {
	old := &Reader{Salt: "abcdefghijklmnopqrstuvwxyz012345"}
	if !old.NeedsPasswordMigration() {
		t.Error("旧 SHA256 格式应需要迁移")
	}
	modern := &Reader{Salt: bcryptSaltMarker}
	if modern.NeedsPasswordMigration() {
		t.Error("bcrypt 格式不应需要迁移")
	}
	var nilReader *Reader
	if nilReader.NeedsPasswordMigration() {
		t.Error("nil Reader 不应需要迁移")
	}
}

// TestMigratePassword 覆盖旧密码升级为 bcrypt 的完整语义。
func TestMigratePassword(t *testing.T) {
	const raw = "secret123"
	const salt = "abcdefghijklmnopqrstuvwxyz012345"

	// 旧格式 + 正确密码 → 迁移成功。
	old := &Reader{Password: legacyHash(raw, salt), Salt: salt}
	if !old.MigratePassword(raw) {
		t.Fatal("旧格式且密码正确时应迁移成功")
	}
	if old.Salt != bcryptSaltMarker {
		t.Errorf("迁移后 salt 应为 bcrypt 标记，得到 %q", old.Salt)
	}
	if !old.VerifyPassword(raw) {
		t.Error("迁移后应能用原密码校验通过")
	}

	// 旧格式 + 错误密码 → 不迁移。
	bad := &Reader{Password: legacyHash(raw, salt), Salt: salt}
	if bad.MigratePassword("wrong") {
		t.Error("密码错误时不应迁移")
	}
	if bad.Salt != salt {
		t.Error("迁移失败不应修改 salt")
	}

	// 已是 bcrypt → 不迁移。
	hash, marker, err := HashPassword(raw)
	if err != nil {
		t.Fatalf("HashPassword 失败: %v", err)
	}
	modern := &Reader{Password: hash, Salt: marker}
	if modern.MigratePassword(raw) {
		t.Error("已是 bcrypt 时不应再迁移")
	}

	var nilReader *Reader
	if nilReader.MigratePassword(raw) {
		t.Error("nil Reader 不应迁移")
	}
}

// TestResetPassword 覆盖随机密码生成。
func TestResetPassword(t *testing.T) {
	r := &Reader{ID: 1}
	p, err := r.ResetPassword()
	if err != nil {
		t.Fatalf("ResetPassword 失败: %v", err)
	}
	if len(p) != 16 {
		t.Errorf("token_urlsafe(12) 应产生 16 字符密码，得到 %d 字符: %q", len(p), p)
	}
	if r.Salt != bcryptSaltMarker {
		t.Errorf("重置后 salt 应为 bcrypt 标记，得到 %q", r.Salt)
	}
	if !r.VerifyPassword(p) {
		t.Error("重置后应能用新密码校验通过")
	}

	// 两次重置应产生不同密码。
	r2 := &Reader{ID: 2}
	p2, err := r2.ResetPassword()
	if err != nil {
		t.Fatalf("ResetPassword 第二次失败: %v", err)
	}
	if p == p2 {
		t.Error("两次重置不应产生相同密码")
	}

	var nilReader *Reader
	if _, err := nilReader.ResetPassword(); err == nil {
		t.Error("nil Reader 应返回错误")
	}
}

// TestSaveReaderPassword 覆盖密码落库。
func TestSaveReaderPassword(t *testing.T) {
	db := newSchemaDB(t)
	seedAll(t, db)
	exec(t, db, `INSERT INTO readers (id, username, password, salt, name, email, admin, active,
		permission, create_time, update_time, access_time, extra)
		VALUES (1, 'u', 'old', 'oldsalt', 'n', 'e', 0, 1, '', '2026-01-01 00:00:00',
		'2026-01-01 00:00:00', '2026-01-01 00:00:00', '{}')`)

	r, err := GetReaderByID(db, 1)
	if err != nil || r == nil {
		t.Fatalf("GetReaderByID = (%v,%v)", r, err)
	}
	// 密码不匹配时不应迁移。
	if r.MigratePassword("x") {
		t.Fatal("密码错误时不应迁移")
	}

	// 显式设置旧哈希后再迁移。
	r.Password = legacyHash("secret123", "oldsalt")
	r.Salt = "oldsalt"
	if !r.MigratePassword("secret123") {
		t.Fatal("旧格式且密码正确时应迁移成功")
	}
	if err := SaveReaderPassword(db, r); err != nil {
		t.Fatalf("SaveReaderPassword 失败: %v", err)
	}

	back, err := GetReaderByID(db, 1)
	if err != nil || back == nil {
		t.Fatalf("重新读取失败: %v", err)
	}
	if back.Salt != bcryptSaltMarker {
		t.Errorf("落库后 salt 应为 bcrypt 标记，得到 %q", back.Salt)
	}
	if !back.VerifyPassword("secret123") {
		t.Error("落库后应能用原密码校验通过")
	}

	var nilReader *Reader
	if err := SaveReaderPassword(db, nilReader); err == nil {
		t.Error("nil Reader 应返回错误")
	}
}

// TestUpdateReaderLogin 覆盖登录副作用（访问时间 + 登录 IP）。
func TestUpdateReaderLogin(t *testing.T) {
	db := newSchemaDB(t)
	exec(t, db, `INSERT INTO readers (id, username, password, salt, name, email, admin, active,
		permission, create_time, update_time, access_time, extra)
		VALUES (1, 'u', 'p', 's', 'n', 'e', 0, 1, '', '2026-01-01 00:00:00',
		'2026-01-01 00:00:00', '2026-01-01 00:00:00', '{}')`)

	r, err := GetReaderByID(db, 1)
	if err != nil || r == nil {
		t.Fatalf("GetReaderByID = (%v,%v)", r, err)
	}
	if err := UpdateReaderLogin(db, r, "10.0.0.1"); err != nil {
		t.Fatalf("UpdateReaderLogin 失败: %v", err)
	}

	back, err := GetReaderByID(db, 1)
	if err != nil || back == nil {
		t.Fatalf("重新读取失败: %v", err)
	}
	if back.Extra["login_ip"] != "10.0.0.1" {
		t.Errorf("login_ip = %v", back.Extra["login_ip"])
	}
	if back.AccessTime == "2026-01-01 00:00:00" {
		t.Error("access_time 应被刷新")
	}

	// nil Extra 应被初始化而不是 panic。
	r2 := &Reader{ID: 1}
	if err := UpdateReaderLogin(db, r2, "10.0.0.2"); err != nil {
		t.Fatalf("nil Extra 时应能初始化: %v", err)
	}

	var nilReader *Reader
	if err := UpdateReaderLogin(db, nilReader, "x"); err == nil {
		t.Error("nil Reader 应返回错误")
	}
}

// TestMarshalJSON 覆盖 JSON 序列化辅助。
func TestMarshalJSON(t *testing.T) {
	got, err := marshalJSON(nil)
	if err != nil || got != "{}" {
		t.Errorf("nil 应序列化为 {}，得到 (%q,%v)", got, err)
	}
	got, err = marshalJSON(map[string]any{"a": 1})
	if err != nil || !strings.Contains(got, `"a":1`) {
		t.Errorf("序列化结果 = (%q,%v)", got, err)
	}
}
