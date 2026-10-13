// 本文件复刻 webserver/models.py 中与「书库条目 / 阅读状态 / 别名」相关的模型。
//
// 表结构逐字段对齐 Python 侧，不改变 schema，只读写。
package userdb

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// 阅读状态常量，对齐 models.py 的 READ_STATE_*。
const (
	ReadStateUnread   = 0
	ReadStateReading  = 1
	ReadStateFinished = 2
)

// 书库条目默认值，对齐 webserver/constants.py。
const (
	BookTypeEbook    = "ebook"
	MediaTypeUnknown = "unknown"
)

// Item 对应 models.py 的 Item 模型（items 表，主键 book_id）。
type Item struct {
	BookID          int64          `json:"book_id"`
	CountGuest      int64          `json:"count_guest"`
	CountVisit      int64          `json:"count_visit"`
	CountDownload   int64          `json:"count_download"`
	Website         string         `json:"website"`
	CollectorID     sql.NullInt64  `json:"collector_id"`
	Scope           string         `json:"scope"`
	BookType        string         `json:"book_type"`
	MediaType       string         `json:"media_type"`
	MediaTypeLocked bool           `json:"media_type_locked"`
	CreateTime      string         `json:"create_time"`
	SrcPath         string         `json:"src_path"`
	Extra           map[string]any `json:"-"`
}

// BookAlias 对应 models.py 的 BookAlias 模型（book_aliases 表）。
type BookAlias struct {
	ID             int64  `json:"id"`
	BookID         int64  `json:"book_id"`
	Name           string `json:"name"`
	NormalizedName string `json:"normalized_name"`
}

// AuthorAlias 对应 models.py 的 AuthorAlias 模型（author_aliases 表，主键 normalized_name）。
type AuthorAlias struct {
	NormalizedName          string `json:"normalized_name"`
	Name                    string `json:"name"`
	CanonicalName           string `json:"canonical_name"`
	CanonicalNormalizedName string `json:"canonical_normalized_name"`
}

// ReadingState 对应 models.py 的 ReadingState 模型（reading_state 表，复合主键 book_id+reader_id）。
type ReadingState struct {
	BookID             int64          `json:"book_id"`
	ReaderID           int64          `json:"reader_id"`
	Favorite           int64          `json:"favorite"`
	FavoriteDate       string         `json:"favorite_date"`
	Wants              int64          `json:"wants"`
	WantsDate          string         `json:"wants_date"`
	ReadState          int64          `json:"read_state"`
	ReadDate           string         `json:"read_date"`
	OnlineRead         int64          `json:"online_read"`
	Download           int64          `json:"download"`
	Progress           map[string]any `json:"progress"`
	ProgressUpdateTime string         `json:"progress_update_time"`
}

// IsFavorite 报告该书是否被收藏。
func (s *ReadingState) IsFavorite() bool { return s != nil && s.Favorite == 1 }

// IsWants 报告该书是否在书架（想读）。
func (s *ReadingState) IsWants() bool { return s != nil && s.Wants == 1 }

// GetReadState 返回阅读状态（0 未读 / 1 在读 / 2 读完）。
func (s *ReadingState) GetReadState() int64 {
	if s == nil {
		return ReadStateUnread
	}
	return s.ReadState
}

// GetProgress 返回阅读进度；无进度时返回空 map（对齐 Python 的 `or {}`）。
func (s *ReadingState) GetProgress() map[string]any {
	if s == nil || s.Progress == nil {
		return map[string]any{}
	}
	return s.Progress
}

// OnlineBookMeta 对应 models.py 的 OnlineBookMeta 模型（online_book_meta 表，主键 book_id）。
type OnlineBookMeta struct {
	BookID          int64          `json:"book_id"`
	SourceURL       string         `json:"source_url"`
	OriginBookURL   string         `json:"origin_book_url"`
	SerializeStatus string         `json:"serialize_status"`
	StatusManual    bool           `json:"status_manual"`
	LastChapter     string         `json:"last_chapter"`
	CreateTime      string         `json:"-"`
	UpdateTime      string         `json:"-"`
	Data            map[string]any `json:"-"`
}

// 连载状态常量，对齐 models.py 的 OnlineBookMeta.*。
const (
	SerializeStatusSerial   = "serial"
	SerializeStatusFinished = "finished"
	SerializeStatusUnknown  = "unknown"
)

// ToDict 复刻 Python 的 OnlineBookMeta.to_dict()。
func (m *OnlineBookMeta) ToDict() map[string]any {
	if m == nil {
		return map[string]any{}
	}
	status := m.SerializeStatus
	if status == "" {
		status = SerializeStatusUnknown
	}
	return map[string]any{
		"book_id":          m.BookID,
		"source_url":       m.SourceURL,
		"origin_book_url":  m.OriginBookURL,
		"serialize_status": status,
		"status_manual":    m.StatusManual,
		"last_chapter":     m.LastChapter,
	}
}

// jsonMap 把 TEXT 列解析为 map；空串或非法 JSON 降级为空 map。
//
// 对齐 Python 侧 MutableDict/JSONType 的容错行为：非法 JSON 不抛错。
func jsonMap(raw string) map[string]any {
	out := map[string]any{}
	if raw == "" {
		return out
	}
	_ = json.Unmarshal([]byte(raw), &out)
	if out == nil {
		out = map[string]any{}
	}
	return out
}

// jsonList 把 TEXT 列解析为切片；空串或非法 JSON 降级为空切片。
func jsonList(raw string) []any {
	out := []any{}
	if raw == "" {
		return out
	}
	_ = json.Unmarshal([]byte(raw), &out)
	if out == nil {
		out = []any{}
	}
	return out
}

// nowString 返回与 Python datetime.now() 落库一致的本地时间字符串。
func nowString() string { return time.Now().Format("2006-01-02 15:04:05") }

// trimSpace 去除首尾空白，对齐 Python 的 str.strip()。
func trimSpace(s string) string { return strings.TrimSpace(s) }

// marshalJSON 把 map 序列化为 JSON 文本；nil 返回 "{}"。
func marshalJSON(v map[string]any) (string, error) {
	if v == nil {
		return "{}", nil
	}
	b, err := json.Marshal(v)
	if err != nil {
		return "", fmt.Errorf("userdb: 序列化 JSON 失败: %w", err)
	}
	return string(b), nil
}

// GetItem 按 book_id 取书库条目；不存在返回 nil。
func GetItem(db *sql.DB, bookID int64) (*Item, error) {
	row := db.QueryRow(`SELECT book_id, COALESCE(count_guest,0), COALESCE(count_visit,0),
		COALESCE(count_download,0), COALESCE(website,''), collector_id, COALESCE(scope,'public'),
		COALESCE(book_type,'ebook'), COALESCE(media_type,'unknown'), COALESCE(media_type_locked,0),
		COALESCE(create_time,''), COALESCE(src_path,'')
		FROM items WHERE book_id = ?`, bookID)
	it := &Item{}
	var locked int64
	err := row.Scan(&it.BookID, &it.CountGuest, &it.CountVisit, &it.CountDownload, &it.Website,
		&it.CollectorID, &it.Scope, &it.BookType, &it.MediaType, &locked, &it.CreateTime, &it.SrcPath)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 items 失败: %w", err)
	}
	it.MediaTypeLocked = locked != 0
	return it, nil
}

// GetReadingState 按 book_id + reader_id 取阅读状态；不存在返回 nil。
func GetReadingState(db *sql.DB, bookID, readerID int64) (*ReadingState, error) {
	row := db.QueryRow(`SELECT book_id, reader_id, COALESCE(favorite,0), COALESCE(favorite_date,''),
		COALESCE(wants,0), COALESCE(wants_date,''), COALESCE(read_state,0), COALESCE(read_date,''),
		COALESCE(online_read,0), COALESCE(download,0), COALESCE(progress,'{}'),
		COALESCE(progress_update_time,'')
		FROM reading_state WHERE book_id = ? AND reader_id = ?`, bookID, readerID)
	s := &ReadingState{}
	var progress string
	err := row.Scan(&s.BookID, &s.ReaderID, &s.Favorite, &s.FavoriteDate, &s.Wants, &s.WantsDate,
		&s.ReadState, &s.ReadDate, &s.OnlineRead, &s.Download, &progress, &s.ProgressUpdateTime)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 reading_state 失败: %w", err)
	}
	s.Progress = jsonMap(progress)
	return s, nil
}

// GetOnlineBookMeta 按 book_id 取网络书元信息；不存在返回 nil。
func GetOnlineBookMeta(db *sql.DB, bookID int64) (*OnlineBookMeta, error) {
	row := db.QueryRow(`SELECT book_id, COALESCE(source_url,''), COALESCE(origin_book_url,''),
		COALESCE(serialize_status,'unknown'), COALESCE(status_manual,0), COALESCE(last_chapter,''),
		COALESCE(create_time,''), COALESCE(update_time,''), COALESCE(data,'{}')
		FROM online_book_meta WHERE book_id = ?`, bookID)
	m := &OnlineBookMeta{}
	var manual int64
	var data string
	err := row.Scan(&m.BookID, &m.SourceURL, &m.OriginBookURL, &m.SerializeStatus, &manual,
		&m.LastChapter, &m.CreateTime, &m.UpdateTime, &data)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 online_book_meta 失败: %w", err)
	}
	m.StatusManual = manual != 0
	m.Data = jsonMap(data)
	return m, nil
}

// ListBookAliases 返回某本书的全部别名。
func ListBookAliases(db *sql.DB, bookID int64) ([]*BookAlias, error) {
	rows, err := db.Query(`SELECT id, book_id, COALESCE(name,''), COALESCE(normalized_name,'')
		FROM book_aliases WHERE book_id = ? ORDER BY id`, bookID)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 book_aliases 失败: %w", err)
	}
	defer rows.Close()

	out := []*BookAlias{}
	for rows.Next() {
		a := &BookAlias{}
		if err := rows.Scan(&a.ID, &a.BookID, &a.Name, &a.NormalizedName); err != nil {
			return nil, fmt.Errorf("userdb: 扫描 book_aliases 失败: %w", err)
		}
		out = append(out, a)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("userdb: 遍历 book_aliases 失败: %w", err)
	}
	return out, nil
}

// GetAuthorAlias 按归一化名取作者别名；不存在返回 nil。
func GetAuthorAlias(db *sql.DB, normalizedName string) (*AuthorAlias, error) {
	row := db.QueryRow(`SELECT normalized_name, COALESCE(name,''), COALESCE(canonical_name,''),
		COALESCE(canonical_normalized_name,'')
		FROM author_aliases WHERE normalized_name = ?`, normalizedName)
	a := &AuthorAlias{}
	err := row.Scan(&a.NormalizedName, &a.Name, &a.CanonicalName, &a.CanonicalNormalizedName)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 author_aliases 失败: %w", err)
	}
	return a, nil
}

// ListAuthorAliases 返回全部作者别名（按归一化名升序）。
func ListAuthorAliases(db *sql.DB) ([]*AuthorAlias, error) {
	rows, err := db.Query(`SELECT normalized_name, COALESCE(name,''), COALESCE(canonical_name,''),
		COALESCE(canonical_normalized_name,'') FROM author_aliases ORDER BY normalized_name`)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 author_aliases 失败: %w", err)
	}
	defer rows.Close()

	out := []*AuthorAlias{}
	for rows.Next() {
		a := &AuthorAlias{}
		if err := rows.Scan(&a.NormalizedName, &a.Name, &a.CanonicalName, &a.CanonicalNormalizedName); err != nil {
			return nil, fmt.Errorf("userdb: 扫描 author_aliases 失败: %w", err)
		}
		out = append(out, a)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("userdb: 遍历 author_aliases 失败: %w", err)
	}
	return out, nil
}
