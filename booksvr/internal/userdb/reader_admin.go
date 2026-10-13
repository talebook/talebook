package userdb

import (
	"database/sql"
	"fmt"
	"time"
)

// SetReaderAdmin 设置读者的管理员标志。
func SetReaderAdmin(db *sql.DB, id int64, admin bool) error {
	val := 0
	if admin {
		val = 1
	}
	_, err := db.Exec(`UPDATE readers SET admin = ?, update_time = ? WHERE id = ?`,
		val, time.Now().Format("2006-01-02 15:04:05"), id)
	if err != nil {
		return fmt.Errorf("userdb: 更新管理员标志失败: %w", err)
	}
	return nil
}

// SetReaderPermission 设置读者的权限标志串。
func SetReaderPermission(db *sql.DB, id int64, permission string) error {
	_, err := db.Exec(`UPDATE readers SET permission = ?, update_time = ? WHERE id = ?`,
		permission, time.Now().Format("2006-01-02 15:04:05"), id)
	if err != nil {
		return fmt.Errorf("userdb: 更新权限失败: %w", err)
	}
	return nil
}

// ReaderProfile 是读者资料的可选更新字段。
type ReaderProfile struct {
	Name   string
	Email  string
	Avatar string
}

// SetReaderProfile 更新读者的昵称 / 邮箱 / 头像。
func SetReaderProfile(db *sql.DB, id int64, p ReaderProfile) error {
	_, err := db.Exec(`UPDATE readers SET name = ?, email = ?, avatar = ?, update_time = ? WHERE id = ?`,
		p.Name, p.Email, p.Avatar, time.Now().Format("2006-01-02 15:04:05"), id)
	if err != nil {
		return fmt.Errorf("userdb: 更新读者资料失败: %w", err)
	}
	return nil
}
