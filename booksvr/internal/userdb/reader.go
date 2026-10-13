// Package userdb 提供 Talebook 用户库（SQLAlchemy 侧）的 Go 访问层。
//
// 表结构逐字段复刻 webserver/models.py，不改变 schema，只读写。
package userdb

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// bcryptSaltMarker 是 Python 侧标记「密码使用 bcrypt」的 salt 值。
const bcryptSaltMarker = "__bcrypt__"

// Reader 对应 webserver/models.py 的 Reader 模型。
type Reader struct {
	ID         int64          `json:"id"`
	Username   string         `json:"username"`
	Password   string         `json:"password"`
	Salt       string         `json:"salt"`
	Name       string         `json:"name"`
	Email      string         `json:"email"`
	Avatar     string         `json:"avatar"`
	Admin      bool           `json:"admin"`
	Active     bool           `json:"active"`
	Permission string         `json:"permission"`
	CreateTime string         `json:"create_time"`
	UpdateTime string         `json:"update_time"`
	AccessTime string         `json:"access_time"`
	Extra      map[string]any `json:"extra"`
}

// IsAdmin 报告该读者是否为管理员。
func (r *Reader) IsAdmin() bool { return r != nil && r.Admin }

// VerifyPassword 校验明文密码。
//
// 对齐 Python 的 get_secure_password：
//   - salt == "__bcrypt__" → bcrypt 校验；
//   - 否则 → SHA256(salt + SHA256(raw)) 比对。
func (r *Reader) VerifyPassword(raw string) bool {
	if r == nil {
		return false
	}
	if r.Salt == bcryptSaltMarker {
		return bcrypt.CompareHashAndPassword([]byte(r.Password), []byte(raw)) == nil
	}
	return legacyHash(raw, r.Salt) == r.Password
}

// LegacyHashForTest 暴露旧密码算法，供跨包测试构造旧格式密码。
//
// 生产代码不应使用它。
func LegacyHashForTest(raw, salt string) string { return legacyHash(raw, salt) }

// legacyHash 复刻 Python 的旧密码算法：SHA256(salt + SHA256(raw))。
func legacyHash(raw, salt string) string {
	p1 := sha256.Sum256([]byte(raw))
	p1hex := hex.EncodeToString(p1[:])
	p2 := sha256.Sum256([]byte(salt + p1hex))
	return hex.EncodeToString(p2[:])
}

// HashPassword 用 bcrypt 生成密码哈希（对齐 set_secure_password）。
func HashPassword(raw string) (hash string, salt string, err error) {
	h, err := bcrypt.GenerateFromPassword([]byte(raw), bcrypt.DefaultCost)
	if err != nil {
		return "", "", fmt.Errorf("userdb: bcrypt 哈希失败: %w", err)
	}
	return string(h), bcryptSaltMarker, nil
}

// readerColumns 是 readers 表的查询列（顺序与 scanReader 一致）。
const readerColumns = `id, COALESCE(username,''), COALESCE(password,''), COALESCE(salt,''),
	COALESCE(name,''), COALESCE(email,''), COALESCE(avatar,''),
	COALESCE(admin,0), COALESCE(active,1), COALESCE(permission,''),
	COALESCE(create_time,''), COALESCE(update_time,''), COALESCE(access_time,''),
	COALESCE(extra,'{}')`

// scanReader 从一行扫描出 Reader。
func scanReader(row interface{ Scan(...any) error }) (*Reader, error) {
	r := &Reader{}
	var admin, active int64
	var extra string
	if err := row.Scan(&r.ID, &r.Username, &r.Password, &r.Salt,
		&r.Name, &r.Email, &r.Avatar, &admin, &active, &r.Permission,
		&r.CreateTime, &r.UpdateTime, &r.AccessTime, &extra); err != nil {
		return nil, err
	}
	r.Admin = admin != 0
	r.Active = active != 0
	r.Extra = map[string]any{}
	if extra != "" {
		_ = json.Unmarshal([]byte(extra), &r.Extra)
	}
	return r, nil
}

// GetReaderByID 按 id 取读者；不存在返回 nil。
func GetReaderByID(db *sql.DB, id int64) (*Reader, error) {
	row := db.QueryRow(`SELECT `+readerColumns+` FROM readers WHERE id = ?`, id)
	r, err := scanReader(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询读者失败: %w", err)
	}
	return r, nil
}

// GetReaderByUsername 按用户名取读者；不存在返回 nil。
func GetReaderByUsername(db *sql.DB, username string) (*Reader, error) {
	row := db.QueryRow(`SELECT `+readerColumns+` FROM readers WHERE username = ? LIMIT 1`, username)
	r, err := scanReader(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询读者失败: %w", err)
	}
	return r, nil
}

// ListReaders 返回全部读者（按 id 升序）。
func ListReaders(db *sql.DB) ([]*Reader, error) {
	rows, err := db.Query(`SELECT ` + readerColumns + ` FROM readers ORDER BY id`)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询读者列表失败: %w", err)
	}
	defer rows.Close()

	out := []*Reader{}
	for rows.Next() {
		r, err := scanReader(rows)
		if err != nil {
			return nil, fmt.Errorf("userdb: 扫描读者失败: %w", err)
		}
		out = append(out, r)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("userdb: 遍历读者失败: %w", err)
	}
	return out, nil
}

// CreateReader 创建读者，密码用 bcrypt 哈希。
//
// 用户名重复时返回错误。
func CreateReader(db *sql.DB, username, rawPassword string, admin bool) (int64, error) {
	username = strings.TrimSpace(username)
	if username == "" {
		return 0, errors.New("userdb: CreateReader 需要 username")
	}

	existing, err := GetReaderByUsername(db, username)
	if err != nil {
		return 0, err
	}
	if existing != nil {
		return 0, fmt.Errorf("userdb: 用户名 %q 已存在", username)
	}

	hash, salt, err := HashPassword(rawPassword)
	if err != nil {
		return 0, err
	}

	adminVal := 0
	if admin {
		adminVal = 1
	}
	now := time.Now().Format("2006-01-02 15:04:05")

	res, err := db.Exec(`
		INSERT INTO readers (username, password, salt, name, email, admin, active, permission,
			create_time, update_time, access_time, extra)
		VALUES (?, ?, ?, ?, '', ?, 1, '', ?, ?, ?, '{}')`,
		username, hash, salt, username, adminVal, now, now, now)
	if err != nil {
		return 0, fmt.Errorf("userdb: 创建读者失败: %w", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("userdb: 获取读者 id 失败: %w", err)
	}
	return id, nil
}

// UpdateAccessTime 更新读者的最后访问时间。
func UpdateAccessTime(db *sql.DB, id int64) error {
	now := time.Now().Format("2006-01-02 15:04:05")
	if _, err := db.Exec(`UPDATE readers SET access_time = ? WHERE id = ?`, now, id); err != nil {
		return fmt.Errorf("userdb: 更新访问时间失败: %w", err)
	}
	return nil
}

// SetPassword 重置读者密码（bcrypt）。
func SetPassword(db *sql.DB, id int64, rawPassword string) error {
	hash, salt, err := HashPassword(rawPassword)
	if err != nil {
		return err
	}
	if _, err := db.Exec(
		`UPDATE readers SET password = ?, salt = ?, update_time = ? WHERE id = ?`,
		hash, salt, time.Now().Format("2006-01-02 15:04:05"), id); err != nil {
		return fmt.Errorf("userdb: 重置密码失败: %w", err)
	}
	return nil
}

// DeleteReader 删除读者。
func DeleteReader(db *sql.DB, id int64) error {
	res, err := db.Exec(`DELETE FROM readers WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("userdb: 删除读者失败: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("userdb: 读者 %d 不存在", id)
	}
	return nil
}
