// 本文件复刻 webserver/models.py 中与「批注 / 网络书源」相关的模型。
package userdb

import (
	"database/sql"
	"fmt"
)

// Annotation 对应 models.py 的 Annotation 模型（annotations 表）。
type Annotation struct {
	ID             int64  `json:"id"`
	ReaderID       int64  `json:"reader_id"`
	BookID         int64  `json:"book_id"`
	ClientID       string `json:"client_id"`
	AnnotationType string `json:"annotation_type"`
	IsPrivate      bool   `json:"is_private"`
	CFI            string `json:"cfi"`
	Chapter        string `json:"chapter"`
	QuoteText      string `json:"quote_text"`
	Content        string `json:"content"`
	Color          string `json:"color"`
	AuthorName     string `json:"author_name"`
	UserModifiedAt string `json:"user_modified_at"`
	CreateTime     string `json:"create_time"`
	UpdateTime     string `json:"update_time"`
}

// AnnotationSource 对应 models.py 的 AnnotationSource 模型（annotation_sources 表）。
type AnnotationSource struct {
	ID                 int64  `json:"id"`
	AnnotationID       int64  `json:"annotation_id"`
	SourceName         string `json:"source_name"`
	SourceConnectionID string `json:"source_connection_id"`
	SourceAnnotationID string `json:"source_annotation_id"`
	SourceRunID        string `json:"source_run_id"`
	SourcePosition     string `json:"source_position"`
	SourceRawHash      string `json:"source_raw_hash"`
	SourceUpdatedAt    string `json:"source_updated_at"`
	SourceSyncStatus   string `json:"source_sync_status"`
	SourceSyncedAt     string `json:"source_synced_at"`
	SourceSyncError    string `json:"source_sync_error"`
	CreateTime         string `json:"-"`
	UpdateTime         string `json:"-"`
}

// ToAPI 复刻 Python 的 AnnotationSource.to_api_dict()。
func (s *AnnotationSource) ToAPI() map[string]any {
	if s == nil {
		return map[string]any{}
	}
	return map[string]any{
		"id":                   s.ID,
		"source_name":          s.SourceName,
		"source_connection_id": s.SourceConnectionID,
		"source_annotation_id": s.SourceAnnotationID,
		"source_run_id":        s.SourceRunID,
		"source_position":      s.SourcePosition,
		"source_raw_hash":      s.SourceRawHash,
		"source_updated_at":    s.SourceUpdatedAt,
		"source_sync_status":   s.SourceSyncStatus,
		"source_synced_at":     s.SourceSyncedAt,
		"source_sync_error":    s.SourceSyncError,
	}
}

// ToAPI 复刻 Python 的 Annotation.to_api_dict()；sources 由调用方按需填充。
func (a *Annotation) ToAPI(sources []*AnnotationSource) map[string]any {
	if a == nil {
		return map[string]any{}
	}
	items := []map[string]any{}
	for _, s := range sources {
		items = append(items, s.ToAPI())
	}
	return map[string]any{
		"id":               a.ID,
		"book_id":          a.BookID,
		"client_id":        a.ClientID,
		"annotation_type":  a.AnnotationType,
		"is_private":       a.IsPrivate,
		"cfi":              a.CFI,
		"chapter":          a.Chapter,
		"quote_text":       a.QuoteText,
		"content":          a.Content,
		"color":            a.Color,
		"author_name":      a.AuthorName,
		"user_modified_at": a.UserModifiedAt,
		"created_at":       a.CreateTime,
		"updated_at":       a.UpdateTime,
		"sources":          items,
	}
}

// BookSourceModel 对应 models.py 的 BookSourceModel 模型（book_sources 表）。
type BookSourceModel struct {
	ID            int64          `json:"id"`
	Name          string         `json:"name"`
	URL           string         `json:"url"`
	Group         string         `json:"group"`
	SourceType    int64          `json:"source_type"`
	Enabled       bool           `json:"enabled"`
	Weight        int64          `json:"weight"`
	Comment       string         `json:"comment"`
	LastCheckTime string         `json:"last_check_time"`
	LastCheckOK   bool           `json:"last_check_ok"`
	CheckStatus   string         `json:"check_status"`
	CheckMessage  string         `json:"check_message"`
	CheckTags     []any          `json:"check_tags"`
	CreateTime    string         `json:"create_time"`
	UpdateTime    string         `json:"update_time"`
	Raw           map[string]any `json:"raw"`
}

// ApplyRaw 复刻 Python 的 BookSourceModel.apply_raw()：从 Legado JSON 同步索引字段。
//
// 数值字段解析失败时降级为 0（对齐 Python 的 try/except）。
func (b *BookSourceModel) ApplyRaw(raw map[string]any) {
	if b == nil {
		return
	}
	b.Raw = raw
	if v := strField(raw, "bookSourceName"); v != "" {
		b.Name = v
	}
	if v := strField(raw, "bookSourceUrl"); v != "" {
		b.URL = v
	}
	b.Group = strField(raw, "bookSourceGroup")
	b.SourceType = intField(raw, "bookSourceType")
	b.Weight = intField(raw, "weight")
	comment := strField(raw, "bookSourceComment")
	if len(comment) > 500 {
		comment = comment[:500]
	}
	b.Comment = comment
	b.UpdateTime = nowString()
}

// strField 取字符串字段并去空白。
func strField(raw map[string]any, key string) string {
	v, ok := raw[key]
	if !ok || v == nil {
		return ""
	}
	s, ok := v.(string)
	if !ok {
		return ""
	}
	return trimSpace(s)
}

// intField 取整数字段；解析失败返回 0。
func intField(raw map[string]any, key string) int64 {
	v, ok := raw[key]
	if !ok || v == nil {
		return 0
	}
	switch n := v.(type) {
	case float64:
		return int64(n)
	case int64:
		return n
	case int:
		return int64(n)
	case string:
		var out int64
		if _, err := fmt.Sscanf(trimSpace(n), "%d", &out); err != nil {
			return 0
		}
		return out
	default:
		return 0
	}
}

// GetAnnotationByID 按 id 取批注；不存在返回 nil。
func GetAnnotationByID(db *sql.DB, id int64) (*Annotation, error) {
	row := db.QueryRow(`SELECT id, reader_id, book_id, COALESCE(client_id,''),
		COALESCE(annotation_type,''), COALESCE(is_private,1), COALESCE(cfi,''), COALESCE(chapter,''),
		COALESCE(quote_text,''), COALESCE(content,''), COALESCE(color,''), COALESCE(author_name,''),
		COALESCE(user_modified_at,''), COALESCE(create_time,''), COALESCE(update_time,'')
		FROM annotations WHERE id = ?`, id)
	a := &Annotation{}
	var private int64
	err := row.Scan(&a.ID, &a.ReaderID, &a.BookID, &a.ClientID, &a.AnnotationType, &private,
		&a.CFI, &a.Chapter, &a.QuoteText, &a.Content, &a.Color, &a.AuthorName, &a.UserModifiedAt,
		&a.CreateTime, &a.UpdateTime)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 annotations 失败: %w", err)
	}
	a.IsPrivate = private != 0
	return a, nil
}

// ListAnnotations 返回某读者某本书的批注（按 id 升序）。
func ListAnnotations(db *sql.DB, readerID, bookID int64) ([]*Annotation, error) {
	rows, err := db.Query(`SELECT id, reader_id, book_id, COALESCE(client_id,''),
		COALESCE(annotation_type,''), COALESCE(is_private,1), COALESCE(cfi,''), COALESCE(chapter,''),
		COALESCE(quote_text,''), COALESCE(content,''), COALESCE(color,''), COALESCE(author_name,''),
		COALESCE(user_modified_at,''), COALESCE(create_time,''), COALESCE(update_time,'')
		FROM annotations WHERE reader_id = ? AND book_id = ? ORDER BY id`, readerID, bookID)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 annotations 失败: %w", err)
	}
	defer rows.Close()

	out := []*Annotation{}
	for rows.Next() {
		a := &Annotation{}
		var private int64
		if err := rows.Scan(&a.ID, &a.ReaderID, &a.BookID, &a.ClientID, &a.AnnotationType, &private,
			&a.CFI, &a.Chapter, &a.QuoteText, &a.Content, &a.Color, &a.AuthorName, &a.UserModifiedAt,
			&a.CreateTime, &a.UpdateTime); err != nil {
			return nil, fmt.Errorf("userdb: 扫描 annotations 失败: %w", err)
		}
		a.IsPrivate = private != 0
		out = append(out, a)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("userdb: 遍历 annotations 失败: %w", err)
	}
	return out, nil
}

// ListAnnotationSources 返回某批注的全部外部副本（按 id 升序）。
func ListAnnotationSources(db *sql.DB, annotationID int64) ([]*AnnotationSource, error) {
	rows, err := db.Query(`SELECT id, annotation_id, COALESCE(source_name,''),
		COALESCE(source_connection_id,''), COALESCE(source_annotation_id,''), COALESCE(source_run_id,''),
		COALESCE(source_position,''), COALESCE(source_raw_hash,''), COALESCE(source_updated_at,''),
		COALESCE(source_sync_status,'synced'), COALESCE(source_synced_at,''), COALESCE(source_sync_error,''),
		COALESCE(create_time,''), COALESCE(update_time,'')
		FROM annotation_sources WHERE annotation_id = ? ORDER BY id`, annotationID)
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

// ListBookSources 返回全部网络书源（按 id 升序）。
func ListBookSources(db *sql.DB) ([]*BookSourceModel, error) {
	rows, err := db.Query(`SELECT id, COALESCE(name,''), COALESCE(url,''), COALESCE("group",''),
		COALESCE(source_type,0), COALESCE(enabled,1), COALESCE(weight,0), COALESCE(comment,''),
		COALESCE(last_check_time,''), COALESCE(last_check_ok,1), COALESCE(check_status,''),
		COALESCE(check_message,''), COALESCE(check_tags,'[]'), COALESCE(create_time,''),
		COALESCE(update_time,''), COALESCE(raw,'{}')
		FROM book_sources ORDER BY id`)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 book_sources 失败: %w", err)
	}
	defer rows.Close()

	out := []*BookSourceModel{}
	for rows.Next() {
		b := &BookSourceModel{}
		var enabled, checkOK int64
		var tags, raw string
		if err := rows.Scan(&b.ID, &b.Name, &b.URL, &b.Group, &b.SourceType, &enabled, &b.Weight,
			&b.Comment, &b.LastCheckTime, &checkOK, &b.CheckStatus, &b.CheckMessage, &tags,
			&b.CreateTime, &b.UpdateTime, &raw); err != nil {
			return nil, fmt.Errorf("userdb: 扫描 book_sources 失败: %w", err)
		}
		b.Enabled = enabled != 0
		b.LastCheckOK = checkOK != 0
		b.CheckTags = jsonList(tags)
		b.Raw = jsonMap(raw)
		out = append(out, b)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("userdb: 遍历 book_sources 失败: %w", err)
	}
	return out, nil
}

// GetBookSourceByURL 按 bookSourceUrl 取书源；不存在返回 nil。
func GetBookSourceByURL(db *sql.DB, url string) (*BookSourceModel, error) {
	row := db.QueryRow(`SELECT id, COALESCE(name,''), COALESCE(url,''), COALESCE("group",''),
		COALESCE(source_type,0), COALESCE(enabled,1), COALESCE(weight,0), COALESCE(comment,''),
		COALESCE(last_check_time,''), COALESCE(last_check_ok,1), COALESCE(check_status,''),
		COALESCE(check_message,''), COALESCE(check_tags,'[]'), COALESCE(create_time,''),
		COALESCE(update_time,''), COALESCE(raw,'{}')
		FROM book_sources WHERE url = ? LIMIT 1`, url)
	b := &BookSourceModel{}
	var enabled, checkOK int64
	var tags, raw string
	err := row.Scan(&b.ID, &b.Name, &b.URL, &b.Group, &b.SourceType, &enabled, &b.Weight, &b.Comment,
		&b.LastCheckTime, &checkOK, &b.CheckStatus, &b.CheckMessage, &tags, &b.CreateTime,
		&b.UpdateTime, &raw)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 book_sources 失败: %w", err)
	}
	b.Enabled = enabled != 0
	b.LastCheckOK = checkOK != 0
	b.CheckTags = jsonList(tags)
	b.Raw = jsonMap(raw)
	return b, nil
}
