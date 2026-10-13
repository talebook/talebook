package httpapi

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/normalize"
)

// 新增接口的错误码，遵循仓库 {"err": "..."} 信封约定。
const (
	ErrWorkNotFound     = "work.not_found"
	ErrBookNotFound     = "book.not_found"
	ErrMergeConflict    = "work.merge.conflict"
	ErrPermissionDenied = "permission.denied"
)

// WorkService 实现 5.5 节新增的 3 条作品/版本路由。
//
// 它只依赖 *sql.DB 与一个可注入的可见性判定函数，因此可以在没有 HTTP
// 服务器的情况下做完整的单元测试。
type WorkService struct {
	DB     *sql.DB
	CDNURL string
	APIURL string

	// IsPublic 对应 Python 版的 can_view_book()：返回该书是否对当前请求者可见。
	//
	// 为 nil 时视为「全部可见」（管理员/已认证场景）。游客场景由调用方注入
	// 真实实现，从而保证私有书不被泄露。
	IsPublic func(bookID int64) (bool, error)
}

// WorkSummary 是作品层的响应结构。
type WorkSummary struct {
	ID           int64  `json:"id"`
	Title        string `json:"title"`
	Author       string `json:"author"`
	TitleNorm    string `json:"title_norm"`
	AuthorNorm   string `json:"author_norm"`
	VersionCount int    `json:"version_count"`
	FormatCount  int    `json:"format_count"`
}

// VersionSummary 是一个版本（book）的摘要。
//
// ID 是 book_id，可直接用于 /book/{id}，前端无需二次映射。
type VersionSummary struct {
	ID         int64    `json:"id"`
	Title      string   `json:"title"`
	Publisher  string   `json:"publisher"`
	Pubdate    string   `json:"pubdate"`
	EditionKey string   `json:"edition_key"`
	Suffixes   []string `json:"suffixes"`
	Img        string   `json:"img"`
	Thumb      string   `json:"thumb"`
	Files      []File   `json:"files"`
}

// WorkDetailResponse 对应 GET /api/work/{id}。
type WorkDetailResponse struct {
	Err      string           `json:"err"`
	Work     WorkSummary      `json:"work"`
	Versions []VersionSummary `json:"versions"`
}

// BookVersionsResponse 对应 GET /api/book/{id}/versions。
type BookVersionsResponse struct {
	Err      string           `json:"err"`
	WorkID   int64            `json:"work_id"`
	Versions []VersionSummary `json:"versions"`
}

// MergeResponse 对应 POST /api/book/{id}/merge。
type MergeResponse struct {
	Err    string  `json:"err"`
	WorkID int64   `json:"work_id"`
	Merged []int64 `json:"merged"`
	Msg    string  `json:"msg"`
}

// visible 判定一本书对当前请求者是否可见。
func (s *WorkService) visible(bookID int64) (bool, error) {
	if s.IsPublic == nil {
		return true, nil
	}
	return s.IsPublic(bookID)
}

// versionSummary 组装单个版本的摘要，含从 book_formats 生成的 files[]。
//
// 注意：books 表没有 publisher/pubdate 列——版本指纹只存在 edition_key 里
// （出版社\x1f版次\x1f译者[\x1f后缀]）。因此这里从 edition_key 反解出
// publisher 与 pubdate，而不是查不存在的列。
func (s *WorkService) versionSummary(bookID int64) (VersionSummary, error) {
	var (
		title      string
		editionKey sql.NullString
	)
	err := s.DB.QueryRow(
		`SELECT title, edition_key FROM books WHERE id = ?`, bookID,
	).Scan(&title, &editionKey)
	if err != nil {
		return VersionSummary{}, fmt.Errorf("load book %d: %w", bookID, err)
	}

	publisher, pubdate := publisherAndPubdateFromEditionKey(editionKey.String)

	formats, err := library.ListFormats(s.DB, bookID)
	if err != nil {
		return VersionSummary{}, err
	}

	files := make([]File, 0, len(formats))
	for _, f := range formats {
		files = append(files, File{
			Format:         f.Format,
			Size:           f.Size,
			Href:           fmt.Sprintf("%s/api/book/%d.%s", s.CDNURL, bookID, f.Format),
			OnlineReadable: OnlineReadable([]string{f.Format}),
		})
	}

	// suffixes 从 edition_key 的末段还原；无后缀时返回空数组而非 nil，
	// 保证 JSON 里是 [] 而不是 null。
	suffixes := suffixesFromEditionKey(editionKey.String)
	if suffixes == nil {
		suffixes = []string{}
	}

	return VersionSummary{
		ID:         bookID,
		Title:      title,
		Publisher:  publisher,
		Pubdate:    pubdate,
		EditionKey: editionKey.String,
		Suffixes:   suffixes,
		Img:        fmt.Sprintf("%s/get/cover/%d.jpg", s.CDNURL, bookID),
		Thumb:      fmt.Sprintf("%s/get/thumb_60x80/%d.jpg", s.CDNURL, bookID),
		Files:      files,
	}, nil
}

// editionKeyParts 拆开 edition_key，返回各段。
//
// edition_key 形如 出版社\x1f版次\x1f译者[\x1f后缀]。
func editionKeyParts(editionKey string) []string {
	if editionKey == "" {
		return nil
	}
	return strings.Split(editionKey, normalize.KeySeparator)
}

// publisherAndPubdateFromEditionKey 从 edition_key 反解出版社与版次。
//
// 空指纹字段在 edition_key 里以 "-" 占位，这里还原为空字符串。
func publisherAndPubdateFromEditionKey(editionKey string) (publisher, pubdate string) {
	parts := editionKeyParts(editionKey)
	if len(parts) < 2 {
		return "", ""
	}
	if parts[0] != "-" {
		publisher = parts[0]
	}
	if parts[1] != "-" {
		pubdate = parts[1]
	}
	return publisher, pubdate
}

// suffixesFromEditionKey 从 edition_key 还原版本后缀。
//
// 只有四段以上（即存在后缀段）且末段非空、非占位符时才有后缀。
func suffixesFromEditionKey(editionKey string) []string {
	parts := editionKeyParts(editionKey)
	if len(parts) < 4 {
		return nil
	}
	last := parts[len(parts)-1]
	if last == "" || last == "-" {
		return nil
	}
	return strings.Split(last, ",")
}

// WorkDetail 实现 GET /api/work/{id}。
func (s *WorkService) WorkDetail(workID int64) (*WorkDetailResponse, error) {
	work, err := library.GetWork(s.DB, workID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return &WorkDetailResponse{Err: ErrWorkNotFound}, nil
		}
		return nil, err
	}

	ids, err := library.ListVersions(s.DB, workID)
	if err != nil {
		return nil, err
	}

	versions := make([]VersionSummary, 0, len(ids))
	formatCount := 0
	for _, id := range ids {
		ok, err := s.visible(id)
		if err != nil {
			return nil, err
		}
		if !ok {
			continue
		}
		v, err := s.versionSummary(id)
		if err != nil {
			return nil, err
		}
		formatCount += len(v.Files)
		versions = append(versions, v)
	}

	return &WorkDetailResponse{
		Err: "ok",
		Work: WorkSummary{
			ID:           work.ID,
			Title:        work.DisplayTitle,
			Author:       work.DisplayAuthor,
			TitleNorm:    work.TitleNorm,
			AuthorNorm:   work.AuthorNorm,
			VersionCount: len(versions),
			FormatCount:  formatCount,
		},
		Versions: versions,
	}, nil
}

// BookVersions 实现 GET /api/book/{id}/versions，返回同作品下其他版本。
func (s *WorkService) BookVersions(bookID int64) (*BookVersionsResponse, error) {
	workID, err := library.GetBookWorkID(s.DB, bookID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return &BookVersionsResponse{Err: ErrBookNotFound}, nil
		}
		return nil, err
	}

	ids, err := library.ListVersions(s.DB, workID)
	if err != nil {
		return nil, err
	}

	versions := make([]VersionSummary, 0, len(ids))
	for _, id := range ids {
		if id == bookID {
			continue
		}
		ok, err := s.visible(id)
		if err != nil {
			return nil, err
		}
		if !ok {
			continue
		}
		v, err := s.versionSummary(id)
		if err != nil {
			return nil, err
		}
		versions = append(versions, v)
	}

	return &BookVersionsResponse{Err: "ok", WorkID: workID, Versions: versions}, nil
}

// MergeBooks 实现 POST /api/book/{id}/merge，把 targetBookID 并入 bookID 所在作品。
//
// 冲突场景返回 {"err": "work.merge.conflict"} 而不静默覆盖。
func (s *WorkService) MergeBooks(bookID, targetBookID int64) (*MergeResponse, error) {
	if bookID == targetBookID {
		return &MergeResponse{Err: ErrMergeConflict, Msg: "不能把书合并到它自己"}, nil
	}

	workID, err := library.GetBookWorkID(s.DB, bookID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return &MergeResponse{Err: ErrBookNotFound}, nil
		}
		return nil, err
	}

	targetWorkID, err := library.GetBookWorkID(s.DB, targetBookID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return &MergeResponse{Err: ErrBookNotFound}, nil
		}
		return nil, err
	}

	if workID == targetWorkID {
		return &MergeResponse{Err: ErrMergeConflict, Msg: "两本书已在同一作品下"}, nil
	}

	if _, err := library.MergeBooks(s.DB, bookID, []int64{targetBookID}); err != nil {
		return nil, err
	}

	return &MergeResponse{
		Err:    "ok",
		WorkID: workID,
		Merged: []int64{bookID, targetBookID},
		Msg:    "已合并为同一作品",
	}, nil
}
