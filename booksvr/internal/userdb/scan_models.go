// 本文件复刻 webserver/models.py 中与「扫描 / 消息 / 设备 / 主题 / OPDS 源」相关的模型。
package userdb

import (
	"database/sql"
	"fmt"
)

// ScanFile 对应 models.py 的 ScanFile 模型（scanfiles 表）。
type ScanFile struct {
	ID         int64          `json:"id"`
	ScanID     int64          `json:"scan_id"`
	ImportID   int64          `json:"import_id"`
	Name       string         `json:"name"`
	Path       string         `json:"path"`
	Hash       string         `json:"hash"`
	Status     string         `json:"status"`
	Title      string         `json:"title"`
	Author     string         `json:"author"`
	Publisher  string         `json:"publisher"`
	Tags       string         `json:"tags"`
	CreateTime string         `json:"create_time"`
	UpdateTime string         `json:"update_time"`
	BookID     int64          `json:"book_id"`
	Data       map[string]any `json:"data"`
}

// ScanFile 状态常量，对齐 models.py 的 ScanFile.*。
const (
	ScanStatusNew          = "new"
	ScanStatusDrop         = "drop"
	ScanStatusReady        = "ready"
	ScanStatusQueued       = "queued"
	ScanStatusImporting    = "importing"
	ScanStatusExist        = "exist"
	ScanStatusImported     = "imported"
	ScanStatusIndexed      = "indexed"
	ScanStatusDeleteFailed = "delete_failed"
	ScanStatusDownloading  = "downloading"
	ScanStatusFailed       = "failed"
)

// Message 对应 models.py 的 Message 模型（messages 表）。
type Message struct {
	ID         int64          `json:"id"`
	Title      string         `json:"title"`
	Status     string         `json:"status"`
	Unread     bool           `json:"unread"`
	CreateTime string         `json:"create_time"`
	UpdateTime string         `json:"update_time"`
	Data       map[string]any `json:"data"`
	ReaderID   sql.NullInt64  `json:"reader_id"`
}

// Device 对应 models.py 的 Device 模型（devices 表）。
type Device struct {
	ID         int64  `json:"id"`
	ReaderID   int64  `json:"reader_id"`
	Name       string `json:"name"`
	DeviceType string `json:"device_type"`
	IP         string `json:"ip"`
	Port       int64  `json:"port"`
	Schema     string `json:"schema"`
	Mailbox    string `json:"mailbox"`
	CreateTime string `json:"create_time"`
	UpdateTime string `json:"update_time"`
}

// ToDict 复刻 Python 的 Device.to_dict()（注意字段名与列名不同）。
func (d *Device) ToDict() map[string]any {
	if d == nil {
		return map[string]any{}
	}
	return map[string]any{
		"name":    d.Name,
		"type":    d.DeviceType,
		"ip":      d.IP,
		"port":    d.Port,
		"schema":  d.Schema,
		"mailbox": d.Mailbox,
	}
}

// InstalledTheme 对应 models.py 的 InstalledTheme 模型（installed_themes 表）。
type InstalledTheme struct {
	ID          int64          `json:"id"`
	Name        string         `json:"name"`
	Version     string         `json:"version"`
	Author      string         `json:"author"`
	Description string         `json:"description"`
	Active      bool           `json:"active"`
	InstalledAt string         `json:"installed_at"`
	Data        map[string]any `json:"-"`
}

// ToDict 复刻 Python 的 InstalledTheme.to_dict()。
func (t *InstalledTheme) ToDict() map[string]any {
	if t == nil {
		return map[string]any{}
	}
	components := map[string]any{}
	if raw, ok := t.Data["components"].(map[string]any); ok {
		components = raw
	}
	return map[string]any{
		"id":           t.ID,
		"name":         t.Name,
		"version":      t.Version,
		"author":       t.Author,
		"description":  t.Description,
		"active":       t.Active,
		"installed_at": t.InstalledAt,
		"components":   components,
	}
}

// OpdsSource 对应 models.py 的 OpdsSource 模型（opds_sources 表）。
type OpdsSource struct {
	ID          int64          `json:"id"`
	Name        string         `json:"name"`
	URL         string         `json:"url"`
	Description string         `json:"description"`
	Active      bool           `json:"active"`
	CreateTime  string         `json:"create_time"`
	UpdateTime  string         `json:"update_time"`
	Data        map[string]any `json:"data"`
}

// GetScanFileByID 按 id 取扫描文件；不存在返回 nil。
func GetScanFileByID(db *sql.DB, id int64) (*ScanFile, error) {
	row := db.QueryRow(`SELECT id, COALESCE(scan_id,0), COALESCE(import_id,0), COALESCE(name,''),
		COALESCE(path,''), COALESCE(hash,''), COALESCE(status,''), COALESCE(title,''),
		COALESCE(author,''), COALESCE(publisher,''), COALESCE(tags,''), COALESCE(create_time,''),
		COALESCE(update_time,''), COALESCE(book_id,0), COALESCE(data,'{}')
		FROM scanfiles WHERE id = ?`, id)
	f := &ScanFile{}
	var data string
	err := row.Scan(&f.ID, &f.ScanID, &f.ImportID, &f.Name, &f.Path, &f.Hash, &f.Status, &f.Title,
		&f.Author, &f.Publisher, &f.Tags, &f.CreateTime, &f.UpdateTime, &f.BookID, &data)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 scanfiles 失败: %w", err)
	}
	f.Data = jsonMap(data)
	return f, nil
}

// ListScanFilesByScanID 返回某次扫描的全部文件（按 id 升序）。
func ListScanFilesByScanID(db *sql.DB, scanID int64) ([]*ScanFile, error) {
	rows, err := db.Query(`SELECT id, COALESCE(scan_id,0), COALESCE(import_id,0), COALESCE(name,''),
		COALESCE(path,''), COALESCE(hash,''), COALESCE(status,''), COALESCE(title,''),
		COALESCE(author,''), COALESCE(publisher,''), COALESCE(tags,''), COALESCE(create_time,''),
		COALESCE(update_time,''), COALESCE(book_id,0), COALESCE(data,'{}')
		FROM scanfiles WHERE scan_id = ? ORDER BY id`, scanID)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 scanfiles 失败: %w", err)
	}
	defer rows.Close()

	out := []*ScanFile{}
	for rows.Next() {
		f := &ScanFile{}
		var data string
		if err := rows.Scan(&f.ID, &f.ScanID, &f.ImportID, &f.Name, &f.Path, &f.Hash, &f.Status,
			&f.Title, &f.Author, &f.Publisher, &f.Tags, &f.CreateTime, &f.UpdateTime, &f.BookID,
			&data); err != nil {
			return nil, fmt.Errorf("userdb: 扫描 scanfiles 失败: %w", err)
		}
		f.Data = jsonMap(data)
		out = append(out, f)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("userdb: 遍历 scanfiles 失败: %w", err)
	}
	return out, nil
}

// ListMessages 返回某读者的消息（按 id 降序，最新在前）。
func ListMessages(db *sql.DB, readerID int64, limit int) ([]*Message, error) {
	if limit <= 0 {
		limit = 100
	}
	rows, err := db.Query(`SELECT id, COALESCE(title,''), COALESCE(status,''), COALESCE(unread,1),
		COALESCE(create_time,''), COALESCE(update_time,''), COALESCE(data,'{}'), reader_id
		FROM messages WHERE reader_id = ? ORDER BY id DESC LIMIT ?`, readerID, limit)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 messages 失败: %w", err)
	}
	defer rows.Close()

	out := []*Message{}
	for rows.Next() {
		m := &Message{}
		var unread int64
		var data string
		if err := rows.Scan(&m.ID, &m.Title, &m.Status, &unread, &m.CreateTime, &m.UpdateTime,
			&data, &m.ReaderID); err != nil {
			return nil, fmt.Errorf("userdb: 扫描 messages 失败: %w", err)
		}
		m.Unread = unread != 0
		m.Data = jsonMap(data)
		out = append(out, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("userdb: 遍历 messages 失败: %w", err)
	}
	return out, nil
}

// CountUnreadMessages 统计某读者的未读消息数。
func CountUnreadMessages(db *sql.DB, readerID int64) (int64, error) {
	var n int64
	err := db.QueryRow(`SELECT COUNT(*) FROM messages WHERE reader_id = ? AND COALESCE(unread,1) <> 0`,
		readerID).Scan(&n)
	if err != nil {
		return 0, fmt.Errorf("userdb: 统计未读消息失败: %w", err)
	}
	return n, nil
}

// ListDevices 返回某读者的全部设备（按 id 升序）。
func ListDevices(db *sql.DB, readerID int64) ([]*Device, error) {
	rows, err := db.Query(`SELECT id, reader_id, COALESCE(name,''), COALESCE(device_type,'duokan'),
		COALESCE(ip,''), COALESCE(port,12121), COALESCE(schema,'http'), COALESCE(mailbox,''),
		COALESCE(create_time,''), COALESCE(update_time,'')
		FROM devices WHERE reader_id = ? ORDER BY id`, readerID)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 devices 失败: %w", err)
	}
	defer rows.Close()

	out := []*Device{}
	for rows.Next() {
		d := &Device{}
		if err := rows.Scan(&d.ID, &d.ReaderID, &d.Name, &d.DeviceType, &d.IP, &d.Port, &d.Schema,
			&d.Mailbox, &d.CreateTime, &d.UpdateTime); err != nil {
			return nil, fmt.Errorf("userdb: 扫描 devices 失败: %w", err)
		}
		out = append(out, d)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("userdb: 遍历 devices 失败: %w", err)
	}
	return out, nil
}

// ListInstalledThemes 返回全部已安装主题（按 id 升序）。
func ListInstalledThemes(db *sql.DB) ([]*InstalledTheme, error) {
	rows, err := db.Query(`SELECT id, COALESCE(name,''), COALESCE(version,''), COALESCE(author,''),
		COALESCE(description,''), COALESCE(active,0), COALESCE(installed_at,''), COALESCE(data,'{}')
		FROM installed_themes ORDER BY id`)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 installed_themes 失败: %w", err)
	}
	defer rows.Close()

	out := []*InstalledTheme{}
	for rows.Next() {
		t := &InstalledTheme{}
		var active int64
		var data string
		if err := rows.Scan(&t.ID, &t.Name, &t.Version, &t.Author, &t.Description, &active,
			&t.InstalledAt, &data); err != nil {
			return nil, fmt.Errorf("userdb: 扫描 installed_themes 失败: %w", err)
		}
		t.Active = active != 0
		t.Data = jsonMap(data)
		out = append(out, t)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("userdb: 遍历 installed_themes 失败: %w", err)
	}
	return out, nil
}

// ListOpdsSources 返回全部 OPDS 源（按 id 升序）。
func ListOpdsSources(db *sql.DB) ([]*OpdsSource, error) {
	rows, err := db.Query(`SELECT id, COALESCE(name,''), COALESCE(url,''), COALESCE(description,''),
		COALESCE(active,1), COALESCE(create_time,''), COALESCE(update_time,''), COALESCE(data,'{}')
		FROM opds_sources ORDER BY id`)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 opds_sources 失败: %w", err)
	}
	defer rows.Close()

	out := []*OpdsSource{}
	for rows.Next() {
		s := &OpdsSource{}
		var active int64
		var data string
		if err := rows.Scan(&s.ID, &s.Name, &s.URL, &s.Description, &active, &s.CreateTime,
			&s.UpdateTime, &data); err != nil {
			return nil, fmt.Errorf("userdb: 扫描 opds_sources 失败: %w", err)
		}
		s.Active = active != 0
		s.Data = jsonMap(data)
		out = append(out, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("userdb: 遍历 opds_sources 失败: %w", err)
	}
	return out, nil
}
