// 本文件提供 scanfiles 表的读写辅助。
package scan

import (
	"database/sql"
	"encoding/json"
	"fmt"

	"talebook/booksvr/internal/userdb"
)

// scanFileColumns 是 scanfiles 表的列清单，顺序与 scanRow 一致。
const scanFileColumns = `id, COALESCE(scan_id,0), COALESCE(import_id,0), COALESCE(name,''),
	COALESCE(path,''), COALESCE(hash,''), COALESCE(status,''), COALESCE(title,''),
	COALESCE(author,''), COALESCE(publisher,''), COALESCE(tags,''), COALESCE(create_time,''),
	COALESCE(update_time,''), COALESCE(book_id,0), COALESCE(data,'{}')`

// scanRow 把一行扫描结果读入 ScanFile。
func scanRow(scan func(...any) error) (*userdb.ScanFile, error) {
	row := &userdb.ScanFile{}
	var rawData string
	if err := scan(&row.ID, &row.ScanID, &row.ImportID, &row.Name, &row.Path, &row.Hash,
		&row.Status, &row.Title, &row.Author, &row.Publisher, &row.Tags,
		&row.CreateTime, &row.UpdateTime, &row.BookID, &rawData); err != nil {
		return nil, err
	}
	row.Data = map[string]any{}
	if rawData != "" {
		_ = json.Unmarshal([]byte(rawData), &row.Data)
	}
	return row, nil
}

// getScanFileByPath 按路径取扫描记录；不存在返回 nil。
func getScanFileByPath(db *sql.DB, path string) (*userdb.ScanFile, error) {
	row, err := scanRow(db.QueryRow(`SELECT `+scanFileColumns+` FROM scanfiles WHERE path = ? LIMIT 1`, path).Scan)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("scan: 查询扫描记录失败: %w", err)
	}
	return row, nil
}

// insertScanFile 插入一条扫描记录，并回填自增 id。
func insertScanFile(db *sql.DB, row *userdb.ScanFile) error {
	data, err := json.Marshal(row.Data)
	if err != nil {
		return fmt.Errorf("scan: 序列化 data 失败: %w", err)
	}
	res, err := db.Exec(`INSERT INTO scanfiles
		(scan_id, import_id, name, path, hash, status, title, author, publisher, tags,
		 create_time, update_time, book_id, data)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		row.ScanID, row.ImportID, row.Name, row.Path, row.Hash, row.Status,
		row.Title, row.Author, row.Publisher, row.Tags,
		row.CreateTime, row.UpdateTime, row.BookID, string(data))
	if err != nil {
		return fmt.Errorf("scan: 插入扫描记录失败: %w", err)
	}
	if id, err := res.LastInsertId(); err == nil {
		row.ID = id
	}
	return nil
}

// saveScanFile 更新一条扫描记录。
func saveScanFile(db *sql.DB, row *userdb.ScanFile) error {
	data, err := json.Marshal(row.Data)
	if err != nil {
		return fmt.Errorf("scan: 序列化 data 失败: %w", err)
	}
	_, err = db.Exec(`UPDATE scanfiles SET
		scan_id = ?, import_id = ?, name = ?, path = ?, hash = ?, status = ?,
		title = ?, author = ?, publisher = ?, tags = ?, update_time = ?, book_id = ?, data = ?
		WHERE id = ?`,
		row.ScanID, row.ImportID, row.Name, row.Path, row.Hash, row.Status,
		row.Title, row.Author, row.Publisher, row.Tags, row.UpdateTime, row.BookID,
		string(data), row.ID)
	if err != nil {
		return fmt.Errorf("scan: 更新扫描记录失败: %w", err)
	}
	return nil
}
