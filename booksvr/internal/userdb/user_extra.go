package userdb

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"
)

// NewReaderInput 是注册新读者的入参。
type NewReaderInput struct {
	Username   string
	Name       string
	Email      string
	Avatar     string
	Password   string
	Active     bool
	Permission string
}

// CreateReaderFull 按完整字段创建读者（对应 SignUp 的建号流程）。
func CreateReaderFull(db *sql.DB, in NewReaderInput) (int64, error) {
	username := strings.TrimSpace(in.Username)
	if username == "" {
		return 0, errors.New("userdb: CreateReaderFull 需要 username")
	}
	existing, err := GetReaderByUsername(db, username)
	if err != nil {
		return 0, err
	}
	if existing != nil {
		return 0, fmt.Errorf("userdb: 用户名 %q 已存在", username)
	}

	hash, salt, err := HashPassword(in.Password)
	if err != nil {
		return 0, err
	}

	active := 0
	if in.Active {
		active = 1
	}
	now := time.Now().Format("2006-01-02 15:04:05")
	extra := `{"kindle_email":""}`

	res, err := db.Exec(`
		INSERT INTO readers (username, password, salt, name, email, avatar, admin, active,
			permission, create_time, update_time, access_time, extra)
		VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
		username, hash, salt, in.Name, in.Email, in.Avatar, active,
		in.Permission, now, now, now, extra)
	if err != nil {
		return 0, fmt.Errorf("userdb: 创建读者失败: %w", err)
	}
	return res.LastInsertId()
}

// GetReaderByUsernameAndEmail 按用户名 + 邮箱查读者（找回密码用）。
func GetReaderByUsernameAndEmail(db *sql.DB, username, email string) (*Reader, error) {
	row := db.QueryRow(`SELECT `+readerColumns+` FROM readers WHERE username = ? AND email = ? LIMIT 1`,
		username, email)
	r, err := scanReader(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询读者失败: %w", err)
	}
	return r, nil
}

// SetActive 设置读者的激活状态。
func SetActive(db *sql.DB, id int64, active bool) error {
	val := 0
	if active {
		val = 1
	}
	_, err := db.Exec(`UPDATE readers SET active = ?, update_time = ? WHERE id = ?`,
		val, time.Now().Format("2006-01-02 15:04:05"), id)
	if err != nil {
		return fmt.Errorf("userdb: 更新激活状态失败: %w", err)
	}
	return nil
}

// UpdateReaderProfile 更新读者的昵称。
func UpdateReaderProfile(db *sql.DB, id int64, name string) error {
	_, err := db.Exec(`UPDATE readers SET name = ?, update_time = ? WHERE id = ?`,
		name, time.Now().Format("2006-01-02 15:04:05"), id)
	if err != nil {
		return fmt.Errorf("userdb: 更新读者资料失败: %w", err)
	}
	return nil
}

// SetReaderExtra 写入读者的 extra 字段中的单个键。
func SetReaderExtra(db *sql.DB, id int64, key, value string) error {
	r, err := GetReaderByID(db, id)
	if err != nil {
		return err
	}
	if r == nil {
		return fmt.Errorf("userdb: 读者 %d 不存在", id)
	}
	extra := r.ExtraMap()
	if extra == nil {
		extra = map[string]any{}
	}
	extra[key] = value

	raw, err := marshalJSON(extra)
	if err != nil {
		return err
	}
	_, err = db.Exec(`UPDATE readers SET extra = ?, update_time = ? WHERE id = ?`,
		raw, time.Now().Format("2006-01-02 15:04:05"), id)
	if err != nil {
		return fmt.Errorf("userdb: 更新 extra 失败: %w", err)
	}
	return nil
}

// ExtraMap 返回读者的 extra 字段（副本）。
func (r *Reader) ExtraMap() map[string]any {
	if r == nil || r.Extra == nil {
		return map[string]any{}
	}
	out := make(map[string]any, len(r.Extra))
	for k, v := range r.Extra {
		out[k] = v
	}
	return out
}

// ActiveCode 复刻 Python 的 Reader.get_active_code()。
//
// 实现为 sha256(username + salt) 的前 16 位十六进制。
func (r *Reader) ActiveCode() string {
	if r == nil {
		return ""
	}
	sum := sha256.Sum256([]byte(r.Username + r.Salt))
	return hex.EncodeToString(sum[:])[:16]
}

// ---- 消息 ----

// messageColumns 是 messages 表的查询列，顺序与 scanMessage 一致。
const messageColumns = `id, COALESCE(title,''), COALESCE(status,''), COALESCE(unread,1),
	COALESCE(create_time,''), COALESCE(update_time,''), COALESCE(data,'{}'), reader_id`

// scanMessage 从一行结果扫描出 Message。
func scanMessage(row interface{ Scan(...any) error }) (*Message, error) {
	m := &Message{}
	var unread int64
	var data string
	if err := row.Scan(&m.ID, &m.Title, &m.Status, &unread, &m.CreateTime, &m.UpdateTime,
		&data, &m.ReaderID); err != nil {
		return nil, err
	}
	m.Unread = unread != 0
	m.Data = jsonMap(data)
	return m, nil
}

// GetMessage 按 id 取消息；不存在返回 nil。
func GetMessage(db *sql.DB, id int64) (*Message, error) {
	row := db.QueryRow(`SELECT `+messageColumns+` FROM messages WHERE id = ?`, id)
	m, err := scanMessage(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询消息失败: %w", err)
	}
	return m, nil
}

// MarkMessageRead 把消息标记为已读。
func MarkMessageRead(db *sql.DB, id int64, now string) error {
	_, err := db.Exec(`UPDATE messages SET unread = 0, update_time = ? WHERE id = ?`, now, id)
	if err != nil {
		return fmt.Errorf("userdb: 标记消息已读失败: %w", err)
	}
	return nil
}

// ---- 设备 ----

// DeviceInput 是保存设备时的入参。
type DeviceInput struct {
	Name       string
	DeviceType string
	IP         string
	Port       int
	Schema     string
	Mailbox    string
}

// ReplaceDevices 整体替换某读者的设备列表（对应 UserDevices.post）。
func ReplaceDevices(db *sql.DB, readerID int64, inputs []DeviceInput) error {
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("userdb: 开启事务失败: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.Exec(`DELETE FROM devices WHERE reader_id = ?`, readerID); err != nil {
		return fmt.Errorf("userdb: 清空设备失败: %w", err)
	}

	now := time.Now().Format("2006-01-02 15:04:05")
	for _, in := range inputs {
		if _, err := tx.Exec(`
			INSERT INTO devices (reader_id, name, device_type, ip, port, schema, mailbox,
				create_time, update_time)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			readerID, in.Name, in.DeviceType, in.IP, in.Port, in.Schema, in.Mailbox, now, now); err != nil {
			return fmt.Errorf("userdb: 写入设备失败: %w", err)
		}
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("userdb: 提交设备失败: %w", err)
	}
	return nil
}
