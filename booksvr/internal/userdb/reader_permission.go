// 本文件复刻 webserver/models.py 中 Reader 的权限与密码迁移语义。
package userdb

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"fmt"
	"strings"
)

// HasPermission 复刻 Python 的 Reader.has_permission(operation, default=True)。
//
// 权限串里小写字母表示「允许」，大写字母表示「显式拒绝」，缺省取 default。
// 例如 permission="lr" 时 can_login 为 true、can_upload 为 true（缺省）。
func (r *Reader) HasPermission(operation string, def bool) bool {
	if r == nil {
		return false
	}
	lower := strings.ToLower(operation)
	upper := strings.ToUpper(operation)
	if strings.Contains(r.Permission, lower) {
		return true
	}
	if strings.Contains(r.Permission, upper) {
		return false
	}
	return def
}

// CanLogin 复刻 Python 的 Reader.can_login()。
func (r *Reader) CanLogin() bool { return r.HasPermission("l", true) }

// CanRead 复刻 Python 的 Reader.can_read()。
func (r *Reader) CanRead() bool { return r.HasPermission("r", true) }

// CanUpload 复刻 Python 的 Reader.can_upload()。
func (r *Reader) CanUpload() bool { return r.HasPermission("u", true) }

// CanEdit 复刻 Python 的 Reader.can_edit()。
func (r *Reader) CanEdit() bool { return r.HasPermission("e", true) }

// CanDelete 复刻 Python 的 Reader.can_delete()。
func (r *Reader) CanDelete() bool { return r.HasPermission("d", true) }

// CanPush 复刻 Python 的 Reader.can_push()。
func (r *Reader) CanPush() bool { return r.HasPermission("p", true) }

// CanSave 复刻 Python 的 Reader.can_save()。
func (r *Reader) CanSave() bool { return r.HasPermission("s", true) }

// CanView 复刻 Python 的 Reader.can_view()。
func (r *Reader) CanView() bool { return r.HasPermission("v", true) }

// IsActive 复刻 Python 的 Reader.is_active()。
func (r *Reader) IsActive() bool { return r != nil && r.Active }

// NeedsPasswordMigration 报告该读者的密码是否仍是旧的 SHA256 格式。
func (r *Reader) NeedsPasswordMigration() bool {
	return r != nil && r.Salt != bcryptSaltMarker
}

// MigratePassword 复刻 Python 的 Reader.migrate_password(raw_password)。
//
// 旧格式且明文校验通过时，把密码升级为 bcrypt 并返回 true；
// 已是 bcrypt 或校验失败时返回 false（不修改任何状态）。
func (r *Reader) MigratePassword(rawPassword string) bool {
	if r == nil || !r.NeedsPasswordMigration() {
		return false
	}
	if !r.VerifyPassword(rawPassword) {
		return false
	}
	hash, salt, err := HashPassword(rawPassword)
	if err != nil {
		return false
	}
	r.Password = hash
	r.Salt = salt
	return true
}

// ResetPassword 复刻 Python 的 Reader.reset_password()：生成随机密码并写回结构体。
//
// 返回新密码明文；调用方负责持久化。
func (r *Reader) ResetPassword() (string, error) {
	if r == nil {
		return "", fmt.Errorf("userdb: ResetPassword 需要非 nil 的 Reader")
	}
	buf := make([]byte, 12)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("userdb: 生成随机密码失败: %w", err)
	}
	// token_urlsafe(12) 等价于 12 字节的 URL-safe base64（无填充）。
	p := base64.RawURLEncoding.EncodeToString(buf)
	hash, salt, err := HashPassword(p)
	if err != nil {
		return "", err
	}
	r.Password = hash
	r.Salt = salt
	return p, nil
}

// SaveReaderPassword 把结构体里的密码字段持久化到数据库。
//
// 用于 MigratePassword / ResetPassword 之后的落库。
func SaveReaderPassword(db *sql.DB, r *Reader) error {
	if r == nil {
		return fmt.Errorf("userdb: SaveReaderPassword 需要非 nil 的 Reader")
	}
	now := nowString()
	_, err := db.Exec(`UPDATE readers SET password = ?, salt = ?, update_time = ? WHERE id = ?`,
		r.Password, r.Salt, now, r.ID)
	if err != nil {
		return fmt.Errorf("userdb: 保存读者密码失败: %w", err)
	}
	return nil
}

// UpdateReaderLogin 复刻 Python 的 login_user 副作用：刷新访问时间并记录登录 IP。
func UpdateReaderLogin(db *sql.DB, r *Reader, remoteIP string) error {
	if r == nil {
		return fmt.Errorf("userdb: UpdateReaderLogin 需要非 nil 的 Reader")
	}
	if r.Extra == nil {
		r.Extra = map[string]any{}
	}
	r.Extra["login_ip"] = remoteIP
	extra, err := marshalJSON(r.Extra)
	if err != nil {
		return err
	}
	now := nowString()
	r.AccessTime = now
	r.UpdateTime = now
	_, err = db.Exec(`UPDATE readers SET access_time = ?, update_time = ?, extra = ? WHERE id = ?`,
		now, now, extra, r.ID)
	if err != nil {
		return fmt.Errorf("userdb: 更新登录信息失败: %w", err)
	}
	return nil
}
