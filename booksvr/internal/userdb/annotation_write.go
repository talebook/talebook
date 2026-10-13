// 本文件实现 annotations / annotation_sources 的写操作与查询，
// 对齐 webserver/handlers/annotations.py 的语义。
package userdb

import (
	"database/sql"
	"fmt"
	"strings"
)

// AnnotationContent 描述一次批注内容写入。
//
// 指针字段为 nil 表示「不改动该列」，对齐 Python 的 `if field in data`。
type AnnotationContent struct {
	AnnotationType string
	IsPrivate      *bool
	CFI            *string
	Chapter        string
	QuoteText      string
	Content        string
	Color          string
	AuthorName     string
}

// AnnotationSourceUpdate 描述一次来源副本更新。
type AnnotationSourceUpdate struct {
	RunID      *string
	Position   *string
	RawHash    *string
	UpdatedAt  *string
	SyncStatus string
	SyncedAt   string
}

// annotationColumns 是 annotations 表的查询列（顺序与 scanAnnotation 一致）。
const annotationColumns = `id, reader_id, book_id, COALESCE(client_id,''),
	COALESCE(annotation_type,''), COALESCE(is_private,1), COALESCE(cfi,''), COALESCE(chapter,''),
	COALESCE(quote_text,''), COALESCE(content,''), COALESCE(color,''), COALESCE(author_name,''),
	COALESCE(user_modified_at,''), COALESCE(create_time,''), COALESCE(update_time,'')`

// scanAnnotation 从一行扫描出 Annotation。
func scanAnnotation(row interface{ Scan(...any) error }) (*Annotation, error) {
	a := &Annotation{}
	var private int64
	if err := row.Scan(&a.ID, &a.ReaderID, &a.BookID, &a.ClientID, &a.AnnotationType, &private,
		&a.CFI, &a.Chapter, &a.QuoteText, &a.Content, &a.Color, &a.AuthorName, &a.UserModifiedAt,
		&a.CreateTime, &a.UpdateTime); err != nil {
		return nil, err
	}
	a.IsPrivate = private != 0
	return a, nil
}

// ListAnnotationsForBook 按可见范围列出某本书的批注。
//
// scope 取值对齐 Python：
//   - "visible"：自己的 + 公开的；
//   - "public"：仅公开的；
//   - "mine"：仅自己的。
//
// 排序为 chapter, cfi, id。
func ListAnnotationsForBook(db *sql.DB, bookID, readerID int64, scope string) ([]*Annotation, error) {
	where := "book_id = ?"
	args := []any{bookID}
	switch scope {
	case "public":
		where += " AND COALESCE(is_private,1) = 0"
	case "mine":
		where += " AND reader_id = ?"
		args = append(args, readerID)
	default: // visible
		where += " AND (reader_id = ? OR COALESCE(is_private,1) = 0)"
		args = append(args, readerID)
	}

	rows, err := db.Query(`SELECT `+annotationColumns+` FROM annotations WHERE `+where+
		` ORDER BY chapter, cfi, id`, args...)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 annotations 失败: %w", err)
	}
	defer rows.Close()

	out := []*Annotation{}
	for rows.Next() {
		a, err := scanAnnotation(rows)
		if err != nil {
			return nil, fmt.Errorf("userdb: 扫描 annotations 失败: %w", err)
		}
		out = append(out, a)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("userdb: 遍历 annotations 失败: %w", err)
	}
	return out, nil
}

// ListAnnotationsByReader 列出某读者的批注，可按 book_id 过滤。
//
// 排序为 book_id, id。
func ListAnnotationsByReader(db *sql.DB, readerID, bookID int64, filterBook bool) ([]*Annotation, error) {
	query := `SELECT ` + annotationColumns + ` FROM annotations WHERE reader_id = ?`
	args := []any{readerID}
	if filterBook {
		query += " AND book_id = ?"
		args = append(args, bookID)
	}
	query += " ORDER BY book_id, id"

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 annotations 失败: %w", err)
	}
	defer rows.Close()

	out := []*Annotation{}
	for rows.Next() {
		a, err := scanAnnotation(rows)
		if err != nil {
			return nil, fmt.Errorf("userdb: 扫描 annotations 失败: %w", err)
		}
		out = append(out, a)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("userdb: 遍历 annotations 失败: %w", err)
	}
	return out, nil
}

// GetOwnedAnnotation 取某读者在某本书下的批注；不存在返回 nil。
func GetOwnedAnnotation(db *sql.DB, annotationID, bookID, readerID int64) (*Annotation, error) {
	row := db.QueryRow(`SELECT `+annotationColumns+` FROM annotations
		WHERE id = ? AND book_id = ? AND reader_id = ?`, annotationID, bookID, readerID)
	a, err := scanAnnotation(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 annotations 失败: %w", err)
	}
	return a, nil
}

// FindAnnotationByClientID 按 client_id 取批注；不存在返回 nil。
func FindAnnotationByClientID(db *sql.DB, readerID, bookID int64, clientID string) (*Annotation, error) {
	row := db.QueryRow(`SELECT `+annotationColumns+` FROM annotations
		WHERE reader_id = ? AND book_id = ? AND client_id = ? LIMIT 1`, readerID, bookID, clientID)
	a, err := scanAnnotation(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 annotations 失败: %w", err)
	}
	return a, nil
}

// CreateAnnotation 新建批注，返回新 id。
func CreateAnnotation(db *sql.DB, a *Annotation) (int64, error) {
	if a == nil {
		return 0, fmt.Errorf("userdb: CreateAnnotation 需要非 nil 的 Annotation")
	}
	now := nowString()
	priv := boolToInt(a.IsPrivate)
	res, err := db.Exec(`INSERT INTO annotations (reader_id, book_id, client_id, annotation_type,
		is_private, cfi, chapter, quote_text, content, color, author_name, create_time, update_time)
		VALUES (?, ?, ?, ?, ?, '', '', '', '', '', '', ?, ?)`,
		a.ReaderID, a.BookID, nullStr(a.ClientID), a.AnnotationType, priv, now, now)
	if err != nil {
		return 0, fmt.Errorf("userdb: 创建 annotations 失败: %w", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("userdb: 获取 annotations id 失败: %w", err)
	}
	return id, nil
}

// SetAnnotationClientID 给已有批注补写 client_id。
func SetAnnotationClientID(db *sql.DB, annotationID int64, clientID string) error {
	if _, err := db.Exec(`UPDATE annotations SET client_id = ? WHERE id = ?`, clientID, annotationID); err != nil {
		return fmt.Errorf("userdb: 更新 annotations client_id 失败: %w", err)
	}
	return nil
}

// ApplyAnnotationContent 写入批注内容，返回是否有字段实际变化。
//
// 只更新与当前值不同的列，对齐 Python 的 `if getattr(...) != value`。
func ApplyAnnotationContent(db *sql.DB, annotationID int64, v AnnotationContent) (bool, error) {
	current, err := GetAnnotationByID(db, annotationID)
	if err != nil {
		return false, err
	}
	if current == nil {
		return false, nil
	}

	sets := []string{}
	args := []any{}

	if v.AnnotationType != "" && current.AnnotationType != v.AnnotationType {
		sets = append(sets, "annotation_type = ?")
		args = append(args, v.AnnotationType)
	}
	if v.IsPrivate != nil && current.IsPrivate != *v.IsPrivate {
		sets = append(sets, "is_private = ?")
		args = append(args, boolToInt(*v.IsPrivate))
	}
	if v.CFI != nil && current.CFI != *v.CFI {
		sets = append(sets, "cfi = ?")
		args = append(args, nullStr(*v.CFI))
	}
	if v.Chapter != "" && current.Chapter != v.Chapter {
		sets = append(sets, "chapter = ?")
		args = append(args, v.Chapter)
	}
	if v.QuoteText != "" && current.QuoteText != v.QuoteText {
		sets = append(sets, "quote_text = ?")
		args = append(args, v.QuoteText)
	}
	if v.Content != "" && current.Content != v.Content {
		sets = append(sets, "content = ?")
		args = append(args, v.Content)
	}
	if v.Color != "" && current.Color != v.Color {
		sets = append(sets, "color = ?")
		args = append(args, v.Color)
	}
	if v.AuthorName != "" && current.AuthorName != v.AuthorName {
		sets = append(sets, "author_name = ?")
		args = append(args, v.AuthorName)
	}

	if len(sets) == 0 {
		return false, nil
	}
	args = append(args, annotationID)
	if _, err := db.Exec(`UPDATE annotations SET `+joinComma(sets)+` WHERE id = ?`, args...); err != nil {
		return false, fmt.Errorf("userdb: 更新 annotations 失败: %w", err)
	}
	return true, nil
}

// MarkAnnotationUserModified 记录用户修改时间。
func MarkAnnotationUserModified(db *sql.DB, annotationID int64, now string) error {
	if _, err := db.Exec(`UPDATE annotations SET user_modified_at = ? WHERE id = ?`, now, annotationID); err != nil {
		return fmt.Errorf("userdb: 更新 annotations user_modified_at 失败: %w", err)
	}
	return nil
}

// TouchAnnotation 刷新 update_time。
func TouchAnnotation(db *sql.DB, annotationID int64, now string) error {
	if _, err := db.Exec(`UPDATE annotations SET update_time = ? WHERE id = ?`, now, annotationID); err != nil {
		return fmt.Errorf("userdb: 更新 annotations update_time 失败: %w", err)
	}
	return nil
}

// DeleteAnnotation 删除批注（annotation_sources 由外键级联删除）。
func DeleteAnnotation(db *sql.DB, annotationID int64) error {
	if _, err := db.Exec(`DELETE FROM annotation_sources WHERE annotation_id = ?`, annotationID); err != nil {
		return fmt.Errorf("userdb: 删除 annotation_sources 失败: %w", err)
	}
	if _, err := db.Exec(`DELETE FROM annotations WHERE id = ?`, annotationID); err != nil {
		return fmt.Errorf("userdb: 删除 annotations 失败: %w", err)
	}
	return nil
}

// FindAnnotationSource 按来源三元组取副本；不存在返回 nil。
func FindAnnotationSource(db *sql.DB, readerID, bookID int64, sourceName, connectionID, annotationID string) (*AnnotationSource, error) {
	row := db.QueryRow(`SELECT s.id, s.annotation_id, COALESCE(s.source_name,''),
		COALESCE(s.source_connection_id,''), COALESCE(s.source_annotation_id,''), COALESCE(s.source_run_id,''),
		COALESCE(s.source_position,''), COALESCE(s.source_raw_hash,''), COALESCE(s.source_updated_at,''),
		COALESCE(s.source_sync_status,'synced'), COALESCE(s.source_synced_at,''), COALESCE(s.source_sync_error,''),
		COALESCE(s.create_time,''), COALESCE(s.update_time,'')
		FROM annotation_sources s JOIN annotations a ON a.id = s.annotation_id
		WHERE a.reader_id = ? AND a.book_id = ? AND s.source_name = ?
		  AND s.source_connection_id = ? AND s.source_annotation_id = ? LIMIT 1`,
		readerID, bookID, sourceName, connectionID, annotationID)
	s := &AnnotationSource{}
	err := row.Scan(&s.ID, &s.AnnotationID, &s.SourceName, &s.SourceConnectionID,
		&s.SourceAnnotationID, &s.SourceRunID, &s.SourcePosition, &s.SourceRawHash,
		&s.SourceUpdatedAt, &s.SourceSyncStatus, &s.SourceSyncedAt, &s.SourceSyncError,
		&s.CreateTime, &s.UpdateTime)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 annotation_sources 失败: %w", err)
	}
	return s, nil
}

// CreateAnnotationSource 新建来源副本。
//
// 同时写入 source_run_id / source_position / source_raw_hash / source_updated_at，
// 对齐 Python 在创建分支后统一执行 `if source:` 赋值的语义。
func CreateAnnotationSource(db *sql.DB, s *AnnotationSource) error {
	if s == nil {
		return fmt.Errorf("userdb: CreateAnnotationSource 需要非 nil 的 AnnotationSource")
	}
	now := nowString()
	_, err := db.Exec(`INSERT INTO annotation_sources (annotation_id, source_name,
		source_connection_id, source_annotation_id, source_run_id, source_position,
		source_raw_hash, source_updated_at, source_sync_status, source_synced_at,
		create_time, update_time)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, ?)`,
		s.AnnotationID, s.SourceName, s.SourceConnectionID, nullStr(s.SourceAnnotationID),
		nullStr(s.SourceRunID), nullStr(s.SourcePosition), nullStr(s.SourceRawHash),
		nullStr(s.SourceUpdatedAt), now, now, now)
	if err != nil {
		return fmt.Errorf("userdb: 创建 annotation_sources 失败: %w", err)
	}
	return nil
}

// UpdateAnnotationSource 更新来源副本。
func UpdateAnnotationSource(db *sql.DB, sourceID int64, u AnnotationSourceUpdate) error {
	sets := []string{}
	args := []any{}

	if u.RunID != nil {
		sets = append(sets, "source_run_id = ?")
		args = append(args, nullStr(*u.RunID))
	}
	if u.Position != nil {
		sets = append(sets, "source_position = ?")
		args = append(args, nullStr(*u.Position))
	}
	if u.RawHash != nil {
		sets = append(sets, "source_raw_hash = ?")
		args = append(args, nullStr(*u.RawHash))
	}
	if u.UpdatedAt != nil {
		sets = append(sets, "source_updated_at = ?")
		args = append(args, nullStr(*u.UpdatedAt))
	}
	if u.SyncStatus != "" {
		sets = append(sets, "source_sync_status = ?")
		args = append(args, u.SyncStatus)
	}
	if u.SyncedAt != "" {
		sets = append(sets, "source_synced_at = ?")
		args = append(args, u.SyncedAt)
	}
	sets = append(sets, "source_sync_error = NULL", "update_time = ?")
	args = append(args, nowString(), sourceID)

	if _, err := db.Exec(`UPDATE annotation_sources SET `+joinComma(sets)+` WHERE id = ?`, args...); err != nil {
		return fmt.Errorf("userdb: 更新 annotation_sources 失败: %w", err)
	}
	return nil
}

// DeleteAnnotationSource 删除一条来源副本。
func DeleteAnnotationSource(db *sql.DB, sourceID int64) error {
	if _, err := db.Exec(`DELETE FROM annotation_sources WHERE id = ?`, sourceID); err != nil {
		return fmt.Errorf("userdb: 删除 annotation_sources 失败: %w", err)
	}
	return nil
}

// ListAnnotationSourcesByReader 列出某读者的全部来源副本，可按 book_id 过滤。
func ListAnnotationSourcesByReader(db *sql.DB, readerID, bookID int64, filterBook bool) ([]*AnnotationSource, error) {
	query := `SELECT s.id, s.annotation_id, COALESCE(s.source_name,''),
		COALESCE(s.source_connection_id,''), COALESCE(s.source_annotation_id,''), COALESCE(s.source_run_id,''),
		COALESCE(s.source_position,''), COALESCE(s.source_raw_hash,''), COALESCE(s.source_updated_at,''),
		COALESCE(s.source_sync_status,'synced'), COALESCE(s.source_synced_at,''), COALESCE(s.source_sync_error,''),
		COALESCE(s.create_time,''), COALESCE(s.update_time,'')
		FROM annotation_sources s JOIN annotations a ON a.id = s.annotation_id
		WHERE a.reader_id = ?`
	args := []any{readerID}
	if filterBook {
		query += " AND a.book_id = ?"
		args = append(args, bookID)
	}
	query += " ORDER BY s.id"

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 annotation_sources 失败: %w", err)
	}
	defer rows.Close()

	out := []*AnnotationSource{}
	for rows.Next() {
		s := &AnnotationSource{}
		if err := rows.Scan(&s.ID, &s.AnnotationID, &s.SourceName, &s.SourceConnectionID,
			&s.SourceAnnotationID, &s.SourceRunID, &s.SourcePosition, &s.SourceRawHash,
			&s.SourceUpdatedAt, &s.SourceSyncStatus, &s.SourceSyncedAt, &s.SourceSyncError,
			&s.CreateTime, &s.UpdateTime); err != nil {
			return nil, fmt.Errorf("userdb: 扫描 annotation_sources 失败: %w", err)
		}
		out = append(out, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("userdb: 遍历 annotation_sources 失败: %w", err)
	}
	return out, nil
}

// MarkPluginRecordsLocallyModified 复刻 Python 的 _mark_plugin_records_locally_modified。
//
// 把某批注对应的插件来源记录标记为「本地已修改」。
// connectionID 为空串时不按连接过滤；非数字时直接返回（对齐 Python 的 try/except）。
func MarkPluginRecordsLocallyModified(db *sql.DB, annotationID int64, now, connectionID string) error {
	query := `UPDATE plugin_source_records SET local_modified = 1, update_time = ?
		WHERE entity_type = 'annotation' AND entity_id = ?`
	args := []any{now, fmt.Sprintf("%d", annotationID)}

	if connectionID != "" {
		var cid int64
		if _, err := fmt.Sscanf(strings.TrimSpace(connectionID), "%d", &cid); err != nil {
			return nil
		}
		query += " AND connection_id = ?"
		args = append(args, cid)
	}

	if _, err := db.Exec(query, args...); err != nil {
		return fmt.Errorf("userdb: 更新 plugin_source_records 失败: %w", err)
	}
	return nil
}

// nullStr 把空串转成 SQL NULL，对齐 Python 的 `x or None`。
func nullStr(s string) any {
	if s == "" {
		return nil
	}
	return s
}
