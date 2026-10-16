package library

import (
	"database/sql"
	"fmt"
	"strings"
)

// BookData 是一本书的完整读视图。
//
// 字段集合对齐 webserver/utils.py 的 SimpleBookFormatter，供阶段 6 的
// Go handler 直接使用，无需再经过 Calibre。
type BookData struct {
	ID         int64    `json:"id"`
	Title      string   `json:"title"`
	Authors    []string `json:"authors"`
	AuthorSort string   `json:"author_sort"`
	Tags       []string `json:"tags"`
	Publisher  string   `json:"publisher"`
	Series     string   `json:"series"`
	SeriesIdx  float64  `json:"series_index"`
	Rating     int64    `json:"rating"`
	Comments   string   `json:"comments"`
	Language   string   `json:"language"`
	ISBN       string   `json:"isbn"`
	Pubdate    string   `json:"pubdate"`
	Timestamp  int64    `json:"timestamp"`
	HasCover   bool     `json:"has_cover"`
	Path       string   `json:"path"`
	// Formats 是该书已登记的格式（大写，如 EPUB/MOBI）。
	Formats     []string         `json:"formats"`
	FormatSizes map[string]int64 `json:"format_sizes"`
}

// GetBooksData 按 id 批量取书数据。
//
// 不存在的 id 会被跳过（不报错），与 Calibre 的 get_data_as_dict 语义一致。
// 返回顺序与传入 ids 顺序一致。
func GetBooksData(db *sql.DB, ids []int64) ([]BookData, error) {
	if len(ids) == 0 {
		return []BookData{}, nil
	}

	// 去重并保序。
	seen := make(map[int64]bool, len(ids))
	ordered := make([]int64, 0, len(ids))
	for _, id := range ids {
		if !seen[id] {
			seen[id] = true
			ordered = append(ordered, id)
		}
	}

	const batchSize = 500
	out := make([]BookData, 0, len(ordered))
	for start := 0; start < len(ordered); start += batchSize {
		end := start + batchSize
		if end > len(ordered) {
			end = len(ordered)
		}
		batch, err := getBooksDataBatch(db, ordered[start:end])
		if err != nil {
			return nil, err
		}
		out = append(out, batch...)
	}
	return out, nil
}

// getBooksDataBatch bounds every book and metadata query to the same batch.
func getBooksDataBatch(db *sql.DB, ordered []int64) ([]BookData, error) {

	placeholders := strings.TrimSuffix(strings.Repeat("?,", len(ordered)), ",")
	args := make([]any, len(ordered))
	for i, id := range ordered {
		args[i] = id
	}

	rows, err := db.Query(fmt.Sprintf(`
		SELECT b.id, b.title, COALESCE(b.author_sort,''), COALESCE(b.path,''),
		       COALESCE(b.timestamp,0), COALESCE(b.pubdate,''),
		       COALESCE(b.series_index,1.0), COALESCE(b.has_cover,0)
		FROM books b WHERE b.id IN (%s)`, placeholders), args...)
	if err != nil {
		return nil, fmt.Errorf("library: 查询书籍失败: %w", err)
	}
	defer rows.Close()

	byID := make(map[int64]*BookData, len(ordered))
	for rows.Next() {
		b := &BookData{}
		var hasCover int64
		// Calibre 把 books.timestamp 声明为 TIMESTAMP，实际存的是日期时间字符串
		// （如 "2026-10-12 07:31:19.976290+00:00"）；旧库或测试库可能是 Unix 整数。
		// 用 sql.RawBytes 接住两种形态，再统一归一为 Unix 秒。
		var rawTimestamp sql.RawBytes
		if err := rows.Scan(&b.ID, &b.Title, &b.AuthorSort, &b.Path,
			&rawTimestamp, &b.Pubdate, &b.SeriesIdx, &hasCover); err != nil {
			return nil, fmt.Errorf("library: 扫描书籍行失败: %w", err)
		}
		b.Timestamp = parseCalibreTimestamp(rawTimestamp)
		b.HasCover = hasCover != 0
		b.Authors = []string{}
		b.Tags = []string{}
		b.Formats = []string{}
		b.FormatSizes = map[string]int64{}
		byID[b.ID] = b
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("library: 遍历书籍行失败: %w", err)
	}

	if len(byID) == 0 {
		return []BookData{}, nil
	}

	if err := attachAuthors(db, byID, placeholders, args); err != nil {
		return nil, err
	}
	if err := attachTags(db, byID, placeholders, args); err != nil {
		return nil, err
	}
	if err := attachPublishers(db, byID, placeholders, args); err != nil {
		return nil, err
	}
	if err := attachSeries(db, byID, placeholders, args); err != nil {
		return nil, err
	}
	if err := attachRatings(db, byID, placeholders, args); err != nil {
		return nil, err
	}
	if err := attachLanguages(db, byID, placeholders, args); err != nil {
		return nil, err
	}
	if err := attachComments(db, byID, placeholders, args); err != nil {
		return nil, err
	}
	if err := attachIdentifiers(db, byID, placeholders, args); err != nil {
		return nil, err
	}
	if err := attachFormats(db, byID, placeholders, args); err != nil {
		return nil, err
	}

	out := make([]BookData, 0, len(ordered))
	for _, id := range ordered {
		if b, ok := byID[id]; ok {
			out = append(out, *b)
		}
	}
	return out, nil
}

// attachAuthors 填充作者列表（按 link 表 id 排序，保持 Calibre 的顺序）。
func attachAuthors(db *sql.DB, byID map[int64]*BookData, ph string, args []any) error {
	rows, err := db.Query(fmt.Sprintf(`
		SELECT l.book, a.name FROM books_authors_link l
		JOIN authors a ON a.id = l.author
		WHERE l.book IN (%s) ORDER BY l.book, l.id`, ph), args...)
	if err != nil {
		return fmt.Errorf("library: 查询作者失败: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var bookID int64
		var name string
		if err := rows.Scan(&bookID, &name); err != nil {
			return fmt.Errorf("library: 扫描作者失败: %w", err)
		}
		if b, ok := byID[bookID]; ok {
			b.Authors = append(b.Authors, name)
		}
	}
	return rows.Err()
}

// attachTags 填充标签列表。
func attachTags(db *sql.DB, byID map[int64]*BookData, ph string, args []any) error {
	rows, err := db.Query(fmt.Sprintf(`
		SELECT l.book, t.name FROM books_tags_link l
		JOIN tags t ON t.id = l.tag
		WHERE l.book IN (%s) ORDER BY l.book, l.id`, ph), args...)
	if err != nil {
		return fmt.Errorf("library: 查询标签失败: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var bookID int64
		var name string
		if err := rows.Scan(&bookID, &name); err != nil {
			return fmt.Errorf("library: 扫描标签失败: %w", err)
		}
		if b, ok := byID[bookID]; ok {
			b.Tags = append(b.Tags, name)
		}
	}
	return rows.Err()
}

// attachPublishers 填充出版社（Calibre 每本书最多一个）。
func attachPublishers(db *sql.DB, byID map[int64]*BookData, ph string, args []any) error {
	rows, err := db.Query(fmt.Sprintf(`
		SELECT l.book, p.name FROM books_publishers_link l
		JOIN publishers p ON p.id = l.publisher
		WHERE l.book IN (%s)`, ph), args...)
	if err != nil {
		return fmt.Errorf("library: 查询出版社失败: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var bookID int64
		var name string
		if err := rows.Scan(&bookID, &name); err != nil {
			return fmt.Errorf("library: 扫描出版社失败: %w", err)
		}
		if b, ok := byID[bookID]; ok {
			b.Publisher = name
		}
	}
	return rows.Err()
}

// attachSeries 填充丛书名。
func attachSeries(db *sql.DB, byID map[int64]*BookData, ph string, args []any) error {
	rows, err := db.Query(fmt.Sprintf(`
		SELECT l.book, s.name FROM books_series_link l
		JOIN series s ON s.id = l.series
		WHERE l.book IN (%s)`, ph), args...)
	if err != nil {
		return fmt.Errorf("library: 查询丛书失败: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var bookID int64
		var name string
		if err := rows.Scan(&bookID, &name); err != nil {
			return fmt.Errorf("library: 扫描丛书失败: %w", err)
		}
		if b, ok := byID[bookID]; ok {
			b.Series = name
		}
	}
	return rows.Err()
}

// attachRatings 填充评分（Calibre 存 0-10 的整数）。
func attachRatings(db *sql.DB, byID map[int64]*BookData, ph string, args []any) error {
	rows, err := db.Query(fmt.Sprintf(`
		SELECT l.book, r.rating FROM books_ratings_link l
		JOIN ratings r ON r.id = l.rating
		WHERE l.book IN (%s)`, ph), args...)
	if err != nil {
		return fmt.Errorf("library: 查询评分失败: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var bookID, rating int64
		if err := rows.Scan(&bookID, &rating); err != nil {
			return fmt.Errorf("library: 扫描评分失败: %w", err)
		}
		if b, ok := byID[bookID]; ok {
			b.Rating = rating
		}
	}
	return rows.Err()
}

// attachLanguages 填充语言（取第一个）。
func attachLanguages(db *sql.DB, byID map[int64]*BookData, ph string, args []any) error {
	rows, err := db.Query(fmt.Sprintf(`
		SELECT l.book, g.lang_code FROM books_languages_link l
		JOIN languages g ON g.id = l.lang_code
		WHERE l.book IN (%s) ORDER BY l.book, l.item_order`, ph), args...)
	if err != nil {
		return fmt.Errorf("library: 查询语言失败: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var bookID int64
		var code string
		if err := rows.Scan(&bookID, &code); err != nil {
			return fmt.Errorf("library: 扫描语言失败: %w", err)
		}
		if b, ok := byID[bookID]; ok && b.Language == "" {
			b.Language = code
		}
	}
	return rows.Err()
}

// attachComments 填充简介。
func attachComments(db *sql.DB, byID map[int64]*BookData, ph string, args []any) error {
	rows, err := db.Query(fmt.Sprintf(`
		SELECT book, COALESCE(text,'') FROM comments WHERE book IN (%s)`, ph), args...)
	if err != nil {
		return fmt.Errorf("library: 查询简介失败: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var bookID int64
		var text string
		if err := rows.Scan(&bookID, &text); err != nil {
			return fmt.Errorf("library: 扫描简介失败: %w", err)
		}
		if b, ok := byID[bookID]; ok {
			b.Comments = text
		}
	}
	return rows.Err()
}

// attachIdentifiers 填充标识符（取 isbn）。
func attachIdentifiers(db *sql.DB, byID map[int64]*BookData, ph string, args []any) error {
	rows, err := db.Query(fmt.Sprintf(`
		SELECT book, type, val FROM identifiers WHERE book IN (%s)`, ph), args...)
	if err != nil {
		return fmt.Errorf("library: 查询标识符失败: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var bookID int64
		var typ, val string
		if err := rows.Scan(&bookID, &typ, &val); err != nil {
			return fmt.Errorf("library: 扫描标识符失败: %w", err)
		}
		if b, ok := byID[bookID]; ok && strings.EqualFold(typ, "isbn") {
			b.ISBN = val
		}
	}
	return rows.Err()
}

// attachFormats 填充格式列表（来自 Calibre 的 data 表）。
func attachFormats(db *sql.DB, byID map[int64]*BookData, ph string, args []any) error {
	rows, err := db.Query(fmt.Sprintf(`
		SELECT book, UPPER(format), MAX(uncompressed_size) FROM data WHERE book IN (%s) GROUP BY book, UPPER(format) ORDER BY book, UPPER(format)`, ph), args...)
	if err != nil {
		return fmt.Errorf("library: 查询格式失败: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var bookID int64
		var format string
		var size sql.NullInt64
		if err := rows.Scan(&bookID, &format, &size); err != nil {
			return fmt.Errorf("library: 扫描格式失败: %w", err)
		}
		if b, ok := byID[bookID]; ok {
			b.Formats = append(b.Formats, strings.ToUpper(format))
			if size.Valid && size.Int64 >= 0 {
				b.FormatSizes[strings.ToUpper(format)] = size.Int64
			}
		}
	}
	return rows.Err()
}
