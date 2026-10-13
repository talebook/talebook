// 本文件实现 opds_sources 表的写操作，对齐 webserver/handlers/admin_opds_sources.py。
package userdb

import (
	"database/sql"
	"fmt"
)

// GetOpdsSourceByID 按 id 取 OPDS 源；不存在返回 nil。
func GetOpdsSourceByID(db *sql.DB, id int64) (*OpdsSource, error) {
	row := db.QueryRow(`SELECT id, COALESCE(name,''), COALESCE(url,''), COALESCE(description,''),
		COALESCE(active,1), COALESCE(create_time,''), COALESCE(update_time,''), COALESCE(data,'{}')
		FROM opds_sources WHERE id = ?`, id)
	s := &OpdsSource{}
	var active int64
	var data string
	err := row.Scan(&s.ID, &s.Name, &s.URL, &s.Description, &active, &s.CreateTime, &s.UpdateTime, &data)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 opds_sources 失败: %w", err)
	}
	s.Active = active != 0
	s.Data = jsonMap(data)
	return s, nil
}

// GetOpdsSourceByName 按名称取 OPDS 源；不存在返回 nil。
//
// 对齐 Python 的 `filter(OpdsSource.name == name).first()`。
func GetOpdsSourceByName(db *sql.DB, name string) (*OpdsSource, error) {
	row := db.QueryRow(`SELECT id, COALESCE(name,''), COALESCE(url,''), COALESCE(description,''),
		COALESCE(active,1), COALESCE(create_time,''), COALESCE(update_time,''), COALESCE(data,'{}')
		FROM opds_sources WHERE name = ? LIMIT 1`, name)
	s := &OpdsSource{}
	var active int64
	var data string
	err := row.Scan(&s.ID, &s.Name, &s.URL, &s.Description, &active, &s.CreateTime, &s.UpdateTime, &data)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 opds_sources 失败: %w", err)
	}
	s.Active = active != 0
	s.Data = jsonMap(data)
	return s, nil
}

// ListOpdsSourcesByCreateTimeDesc 返回全部 OPDS 源，按创建时间倒序。
//
// 对齐 Python 的 `order_by(OpdsSource.create_time.desc())`。
func ListOpdsSourcesByCreateTimeDesc(db *sql.DB) ([]*OpdsSource, error) {
	rows, err := db.Query(`SELECT id, COALESCE(name,''), COALESCE(url,''), COALESCE(description,''),
		COALESCE(active,1), COALESCE(create_time,''), COALESCE(update_time,''), COALESCE(data,'{}')
		FROM opds_sources ORDER BY create_time DESC, id DESC`)
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

// CreateOpdsSource 新建 OPDS 源，返回新记录 id。
//
// 对齐 Python 的 `OpdsSource(name=..., url=..., description=...)` + save()：
// active 默认 true，create_time/update_time 取当前时间，data 为空对象。
func CreateOpdsSource(db *sql.DB, name, url, description string) (int64, error) {
	now := nowString()
	res, err := db.Exec(`INSERT INTO opds_sources (name, url, description, active, create_time,
		update_time, data) VALUES (?, ?, ?, 1, ?, ?, '{}')`, name, url, description, now, now)
	if err != nil {
		return 0, fmt.Errorf("userdb: 创建 opds_sources 失败: %w", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("userdb: 获取 opds_sources id 失败: %w", err)
	}
	return id, nil
}

// UpdateOpdsSource 更新 OPDS 源的可变字段并刷新 update_time。
//
// 只更新传入的非 nil 字段，对齐 Python 的 `if "x" in req` 语义。
func UpdateOpdsSource(db *sql.DB, id int64, name, url, description *string, active *bool) error {
	sets := []string{}
	args := []any{}

	if name != nil {
		sets = append(sets, "name = ?")
		args = append(args, *name)
	}
	if url != nil {
		sets = append(sets, "url = ?")
		args = append(args, *url)
	}
	if description != nil {
		sets = append(sets, "description = ?")
		args = append(args, *description)
	}
	if active != nil {
		sets = append(sets, "active = ?")
		args = append(args, boolToInt(*active))
	}

	sets = append(sets, "update_time = ?")
	args = append(args, nowString(), id)

	query := "UPDATE opds_sources SET " + joinComma(sets) + " WHERE id = ?"
	if _, err := db.Exec(query, args...); err != nil {
		return fmt.Errorf("userdb: 更新 opds_sources 失败: %w", err)
	}
	return nil
}

// DeleteOpdsSource 删除 OPDS 源。
func DeleteOpdsSource(db *sql.DB, id int64) error {
	if _, err := db.Exec(`DELETE FROM opds_sources WHERE id = ?`, id); err != nil {
		return fmt.Errorf("userdb: 删除 opds_sources 失败: %w", err)
	}
	return nil
}

// boolToInt 把布尔值转成 SQLite 的 0/1。
func boolToInt(v bool) int {
	if v {
		return 1
	}
	return 0
}

// joinComma 用逗号连接字符串切片。
func joinComma(items []string) string {
	out := ""
	for i, s := range items {
		if i > 0 {
			out += ", "
		}
		out += s
	}
	return out
}
