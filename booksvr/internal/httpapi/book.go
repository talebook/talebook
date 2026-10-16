package httpapi

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/userdb"
)

// BookConfig 是书籍模块的依赖注入点。
type BookConfig struct {
	// DB 是 Talebook 自有库。
	DB *sql.DB
	// LibraryDB 是 Calibre 元数据库。
	LibraryDB *sql.DB
	// Settings 是站点配置。
	Settings map[string]any
	// CDNURL 用于拼接封面地址。
	CDNURL string
	// PublicURL 给路径加部署前缀。
	PublicURL func(path string) string
	// CanViewBook 判定当前请求方能否查看该书。
	CanViewBook func(ctx *Context, bookID int64) bool
	// IsBookOwner 判定当前请求方是否为该书所有者。
	IsBookOwner func(ctx *Context, bookID int64) bool
	// PrivateBookIDs 返回当前请求方不可见的私藏书 id 集合。
	PrivateBookIDs func(ctx *Context) (map[int64]bool, error)
	// Search 执行 Calibre 全文检索，返回匹配的书籍 id。
	Search func(ctx *Context, keyword string) ([]int64, error)
	// SearchField 按字段检索（publisher/author/tag）。
	SearchField func(ctx *Context, field, value string) ([]int64, error)
	// AliasBookIDs 返回书名别名命中的书籍 id。
	AliasBookIDs func(ctx *Context, keyword string) ([]int64, error)
	// AliasAuthorNames 返回作者别名命中的作者名。
	AliasAuthorNames func(ctx *Context, keyword string) ([]string, error)
	// BooksForCategory 返回某分类项下的书籍 id。
	BooksForCategory func(ctx *Context, category, name string) ([]int64, error)
	// BookTitle 返回书名（用于搜索相关性排序）。
	BookTitle func(bookID int64) string
	// HotBooks 返回热度榜单的书籍 id（已按下载量降序）。
	HotBooks func(ctx *Context, start, delta int) ([]int64, int, error)
	// NavTags 返回全部标签及计数。
	NavTags func(ctx *Context) (map[string]int, error)
	// SetReadState 写入阅读状态。
	SetReadState func(ctx *Context, bookID int64, args map[string]any) error
	// SetProgress 写入阅读进度。
	SetProgress func(ctx *Context, bookID int64, progress map[string]any) error
	// SetFavorite 写入收藏状态。
	SetFavorite func(ctx *Context, bookID int64, favorite bool) error
	// SetShelf 写入书架（想读）状态。
	SetShelf func(ctx *Context, bookID int64, wants bool) error
	// SetScope 写入书籍可见范围。
	SetScope func(ctx *Context, bookID int64, scope string) error
	// SetMediaType 写入媒体类型。
	SetMediaType func(ctx *Context, bookID int64, mediaType string) error
	// EditBook 保存书籍元数据。
	EditBook func(ctx *Context, bookID int64, args map[string]any) (map[string]any, error)
	// DeleteBook 删除书籍。
	DeleteBook func(ctx *Context, bookID int64) (map[string]any, error)
	// DeleteFormat 删除某格式。
	DeleteFormat func(ctx *Context, bookID int64, format string) (map[string]any, error)
	// Convert 转换格式。
	Convert func(ctx *Context, bookID int64, args map[string]any) (map[string]any, error)
	// ToPDF 转 PDF。
	ToPDF func(ctx *Context, bookID int64, args map[string]any) (map[string]any, error)
	// Separate 拆分书籍。
	Separate func(ctx *Context, bookID int64, args map[string]any) (map[string]any, error)
	// SaveMeta 保存元数据。
	SaveMeta func(ctx *Context, bookID int64, args map[string]any) (map[string]any, error)
	// Refer 处理书籍来源引用。
	Refer func(ctx *Context, bookID int64, args map[string]any) (map[string]any, error)
	// SendToDevice 推送到设备。
	SendToDevice func(ctx *Context, bookID int64, args map[string]any) (map[string]any, error)
	// SendToMail 推送到邮箱。
	SendToMail func(ctx *Context, bookID int64, args map[string]any) (map[string]any, error)
	// Upload 处理上传。
	Upload func(ctx *Context, args map[string]any) (map[string]any, error)
	// UploadChunk 处理分片上传。
	UploadChunk func(ctx *Context, args map[string]any) (map[string]any, error)
	// UploadComplete 处理上传完成。
	UploadComplete func(ctx *Context, args map[string]any) (map[string]any, error)
	// TxtInit 初始化 TXT 阅读。
	TxtInit func(ctx *Context, args map[string]any) (map[string]any, error)
	// ReaderBootstrap 返回阅读器引导数据。
	ReaderBootstrap func(ctx *Context, bookID int64) (map[string]any, error)
	// ReadResource 返回阅读资源文件路径。
	ReadResource func(ctx *Context, bookID int64, name string) (string, error)
	// ReadBook 渲染在线阅读器页面（直接写 HTML，返回 (nil, nil)）。
	// 对应 Python 的 BookRead.get：EPUB 直接渲染，其余格式先转 EPUB 再渲染。
	ReadBook func(ctx *Context, bookID int64) (map[string]any, error)
	// ReaderAssets 提供阅读器静态资源前缀（如 "/static/candle-reader/"）。
	ReaderAssets string
	// EPUBViewer 是阅读器模板名，对应 Python 的 CONF["EPUB_VIEWER"]。
	EPUBViewer string
	// ReadTxt 返回 TXT 内容。
	ReadTxt func(ctx *Context, bookID int64) (map[string]any, error)
	// CountDownload 递增书籍下载计数（对应 Python 的 count_increase）。
	CountDownload func(ctx *Context, bookID int64)
	// RecordHistory 把书追加到当前用户的某类历史记录
	// （对应 Python 的 user_history(action, book)）。
	// action 取 read_history / download_history / push_history / upload_history。
	RecordHistory func(ctx *Context, bookID int64, title, action string)
	// Aliases 提供书名别名读写（对应 Python 的 AliasService）。
	Aliases *userdb.AliasService
	// AllowGuestRead 报告是否允许游客在线阅读。
	AllowGuestRead bool
}

// ---- 路由常量 ----

const (
	rBookIndex        = "/api/index"
	rBookDetail       = "/api/book/([0-9]+)"
	rBookDetailExt    = "/api/book/([0-9]+\\..+)"
	rBookConvert      = "/api/book/([0-9]+)/convert"
	rBookToPDF        = "/api/book/([0-9]+)/topdf"
	rBookRefer        = "/api/book/([0-9]+)/refer"
	rBookEdit         = "/api/book/([0-9]+)/edit"
	rBookDelete       = "/api/book/([0-9]+)/delete"
	rBookNav          = "/api/book/nav"
	rBookRecent       = "/api/recent"
	rBookLibrary      = "/api/library"
	rBookSearch       = "/api/search"
	rBookHot          = "/api/hot"
	rBookUpload       = "/api/book/upload"
	rBookUploadChunk  = "/api/book/upload/chunk"
	rBookUploadDone   = "/api/book/upload/complete"
	rBookRead         = "/read/([0-9]+)"
	rBookReaderBoot   = "/api/book/([0-9]+)/reader-bootstrap"
	rBookReaderRes    = "/read/resource/([0-9]+\\.epub)"
	rBookTxtRead      = "/api/read/txt"
	rBookTxtInit      = "/api/book/txt/init"
	rBookSendDevice   = "/api/book/([0-9]+)/send_to_device"
	rBookSendMail     = "/api/book/([0-9]+)/mailto"
	rBookSetScope     = "/api/book/([0-9]+)/setscope"
	rBookSetMediaType = "/api/book/([0-9]+)/media_type"
	rBookDeleteFormat = "/api/book/([0-9]+)/delete_format"
	rBookSeparate     = "/api/book/([0-9]+)/separate"
	rBookSaveMeta     = "/api/book/([0-9]+)/savemeta"
	rBookScoped       = "/api/scopedbooks"
	rBookFavorite     = "/api/book/([0-9]+)/favorite"
	rBookShelf        = "/api/book/([0-9]+)/shelf"
	rBookShelfList    = "/api/shelf"
	rBookReading      = "/api/reading"
	rBookReadDone     = "/api/read-done"
	rBookReadState    = "/api/book/([0-9]+)/readstate"
	rBookProgress     = "/api/book/([0-9]+)/progress"
	rBookReadStats    = "/api/reading/stats"
	rBookFavorites    = "/api/favorites"
)

// ---- 阅读状态格式化 ----

// bookReadingStateDict 复刻 ReadingStateFormatter.format_reading_state。
func bookReadingStateDict(s *userdb.ReadingState) map[string]any {
	if s == nil {
		return map[string]any{
			"favorite":      0,
			"favorite_date": nil,
			"wants":         0,
			"wants_date":    nil,
			"read_state":    0,
			"read_date":     nil,
			"online_read":   0,
			"download":      0,
		}
	}
	return map[string]any{
		"favorite":      s.Favorite,
		"favorite_date": isoOrNil(s.FavoriteDate),
		"wants":         s.Wants,
		"wants_date":    isoOrNil(s.WantsDate),
		"read_state":    s.ReadState,
		"read_date":     isoOrNil(s.ReadDate),
		"online_read":   s.OnlineRead,
		"download":      s.Download,
	}
}

// bookReadingStateAPI 复刻 format_reading_state_with_api_format。
func bookReadingStateAPI(s *userdb.ReadingState) map[string]any {
	if s == nil {
		return map[string]any{
			"err":           "ok",
			"read_state":    0,
			"favorite":      false,
			"wants":         false,
			"online_read":   0,
			"download":      0,
			"read_date":     nil,
			"favorite_date": nil,
			"wants_date":    nil,
		}
	}
	return map[string]any{
		"err":           "ok",
		"read_state":    s.GetReadState(),
		"favorite":      s.IsFavorite(),
		"wants":         s.IsWants(),
		"online_read":   s.OnlineRead,
		"download":      s.Download,
		"read_date":     isoOrNil(s.ReadDate),
		"favorite_date": isoOrNil(s.FavoriteDate),
		"wants_date":    isoOrNil(s.WantsDate),
	}
}

// ---- 书籍字典 ----

// bookDict 组装书籍字典（对齐 utils.BookFormatter 的 JSON 输出）。
func bookDict(cfg BookConfig, b library.BookData) map[string]any {
	formats := map[string]any{}
	for _, f := range b.Formats {
		formats["fmt_"+strings.ToLower(f)] = true
	}

	// 基础字段集与 Python 的 SimpleBookFormatter.format 对齐（22 个），
	// 复用 compat.go 的 Formatter，避免两处各写一份而漂移。
	item := bookItemFields(cfg, b.ID)
	f := &Formatter{
		Book: Book{
			ID:               b.ID,
			Title:            b.Title,
			Rating:           float64(b.Rating),
			Timestamp:        time.Unix(b.Timestamp, 0).UTC(),
			Pubdate:          parseBookDate(b.Pubdate),
			Authors:          b.Authors,
			AuthorSort:       b.AuthorSort,
			Tags:             b.Tags,
			Publisher:        b.Publisher,
			Comments:         b.Comments,
			Series:           b.Series,
			Language:         b.Language,
			ISBN:             b.ISBN,
			Collector:        item.collector,
			CountVisit:       item.countVisit,
			CountDownload:    item.countDownload,
			MediaType:        item.mediaType,
			MediaTypeLocked:  item.mediaTypeLocked,
			AvailableFormats: b.Formats,
			Scope:            item.scope,
		},
		CDNURL: cfg.CDNURL,
		APIURL: cfg.CDNURL,
	}
	d := f.SimpleFormat()

	// scope 由 Formatter.Format 追加，SimpleFormat 不含；这里补上。
	d["scope"] = item.scope

	// 前端用 href 跳详情页，用 fmt 渲染格式列表；这两个不在 Formatter 里。
	d["href"] = fmt.Sprintf("/book/%d", b.ID)
	d["fmt"] = b.Formats
	for k, v := range formats {
		d[k] = v
	}
	return d
}

// bookItem 是 items 行里详情页需要的字段。
//
// items 行不存在时用与 Python 一致的默认值（scope=public、media_type=unknown）。
type bookItem struct {
	scope           string
	collector       string
	countVisit      int64
	countDownload   int64
	mediaType       string
	mediaTypeLocked bool
}

// bookItemFields 读 items 行，缺失时返回默认值。
func bookItemFields(cfg BookConfig, bookID int64) bookItem {
	out := bookItem{scope: "public", mediaType: MediaTypeUnknown}
	if cfg.DB == nil {
		return out
	}
	item, err := userdb.GetItem(cfg.DB, bookID)
	if err != nil || item == nil {
		return out
	}
	if item.Scope != "" {
		out.scope = item.Scope
	}
	if item.CollectorID.Valid {
		out.collector = strconv.FormatInt(item.CollectorID.Int64, 10)
	}
	out.countVisit = item.CountVisit
	out.countDownload = item.CountDownload
	if item.MediaType != "" {
		out.mediaType = item.MediaType
	}
	out.mediaTypeLocked = item.MediaTypeLocked
	return out
}

// parseBookDate 把 Calibre 的日期字符串解析为 time.Time。
//
// Calibre 的 pubdate 可能是 "2008-01-01" 或带时间的完整时间戳；
// 解析失败时返回零值，由 Formatter 回退为「Unknown」。
func parseBookDate(s string) time.Time {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}
	}
	for _, layout := range []string{"2006-01-02", time.RFC3339, "2006-01-02 15:04:05+00:00", "2006-01-02 15:04:05"} {
		if t, err := time.Parse(layout, s); err == nil {
			return t
		}
	}
	return time.Time{}
}

// toStrSetting 从站点配置里取字符串值，缺失时返回空串。
func toStrSetting(settings map[string]any, key string) string {
	v, ok := settings[key]
	if !ok || v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	return fmt.Sprint(v)
}

// bookLoadBooks 按 id 批量取书并建索引。
func bookLoadBooks(cfg BookConfig, ids []int64) (map[int64]library.BookData, error) {
	out := map[int64]library.BookData{}
	if len(ids) == 0 {
		return out, nil
	}
	books, err := library.GetBooksData(cfg.LibraryDB, ids)
	if err != nil {
		return nil, err
	}
	for _, b := range books {
		out[b.ID] = b
	}
	return out, nil
}

// bookPrivateIDs 取当前请求方不可见的私藏书集合。
func bookPrivateIDs(cfg BookConfig, ctx *Context) (map[int64]bool, error) {
	if cfg.PrivateBookIDs == nil {
		return map[int64]bool{}, nil
	}
	return cfg.PrivateBookIDs(ctx)
}

// bookAttachStates 给书籍列表附加阅读状态。
func bookAttachStates(cfg BookConfig, ctx *Context, books []map[string]any) ([]map[string]any, error) {
	if ctx.Identity.UserID == 0 || len(books) == 0 {
		return books, nil
	}
	ids := make([]int64, 0, len(books))
	for _, b := range books {
		if id, ok := b["id"].(int64); ok {
			ids = append(ids, id)
		}
	}
	states, err := userdb.ListReadingStates(cfg.DB, ctx.Identity.UserID, ids)
	if err != nil {
		return nil, err
	}
	for _, b := range books {
		id, _ := b["id"].(int64)
		b["state"] = bookReadingStateDict(states[id])
	}
	return books, nil
}

// bookRenderList 复刻 ListHandler.render_book_list。
func bookRenderList(cfg BookConfig, ctx *Context, ids []int64, title string, sortByID bool) (map[string]any, error) {
	start := bookArgumentStart(ctx)
	maxSize := bookMaxPageSize(cfg)
	delta := bookPageDelta(ctx, maxSize)

	private, err := bookPrivateIDs(cfg, ctx)
	if err != nil {
		return nil, err
	}
	filtered := make([]int64, 0, len(ids))
	for _, id := range ids {
		if !private[id] {
			filtered = append(filtered, id)
		}
	}
	count := len(filtered)
	page := bookSlice(filtered, start, start+delta)

	booksMap, err := bookLoadBooks(cfg, page)
	if err != nil {
		return nil, err
	}
	values := make([]map[string]any, 0, len(page))
	for _, id := range page {
		if b, ok := booksMap[id]; ok {
			values = append(values, bookDict(cfg, b))
		}
	}
	if sortByID {
		sort.SliceStable(values, func(i, j int) bool {
			return int64Of(values[i]["id"]) > int64Of(values[j]["id"])
		})
	}
	values, err = bookAttachStates(cfg, ctx, values)
	if err != nil {
		return nil, err
	}

	// stream=1 时返回 NDJSON：首行元信息，随后每行一本书。
	// 前端 $backend_stream 按行解析，返回单个 JSON 对象会导致列表永远为空。
	if ctx.Query("stream") == "1" {
		if err := bookWriteNDJSON(ctx, title, count, values); err != nil {
			return nil, err
		}
		return nil, nil
	}

	return map[string]any{"err": "ok", "title": title, "total": count, "books": values}, nil
}

// bookWriteNDJSON 复刻 Python 的 stream_book_list 输出格式。
//
// 首行是元信息 {"err":"ok","title":...,"total":N}，
// 随后每行一本书的 JSON，Content-Type 为 application/x-ndjson。
func bookWriteNDJSON(ctx *Context, title string, total int, books []map[string]any) error {
	w := ctx.Writer
	w.Header().Set("Content-Type", "application/x-ndjson")
	w.Header().Set("Cache-Control", "max-age=0")
	w.Header().Set("X-Accel-Buffering", "no")
	// 与 Python 一致：回显请求的 Origin，允许携带凭据。
	origin := ctx.Request.Header.Get("Origin")
	if origin == "" {
		origin = "*"
	}
	w.Header().Set("Access-Control-Allow-Origin", origin)
	w.Header().Set("Access-Control-Allow-Credentials", "true")

	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(map[string]any{"err": "ok", "title": title, "total": total}); err != nil {
		return err
	}
	for _, b := range books {
		if err := enc.Encode(b); err != nil {
			return err
		}
	}
	if f, ok := w.(http.Flusher); ok {
		f.Flush()
	}
	return nil
}

// bookSlice 安全切片。
func bookSlice(ids []int64, start, end int) []int64 {
	if start < 0 {
		start = 0
	}
	if start > len(ids) {
		start = len(ids)
	}
	if end > len(ids) {
		end = len(ids)
	}
	if end < start {
		end = start
	}
	return ids[start:end]
}

// bookArgumentStart 取分页起点。
func bookArgumentStart(ctx *Context) int {
	n, err := strconv.Atoi(ctx.Query("start"))
	if err != nil || n < 0 {
		return 0
	}
	return n
}

// bookMaxPageSize 取站点配置的最大分页大小。
func bookMaxPageSize(cfg BookConfig) int {
	n := toIntSetting(cfg.Settings, "DEFAULT_PAGE_SIZE", 60)
	if n < 60 {
		return 60
	}
	return n
}

// bookPageDelta 取本次请求的分页大小。
func bookPageDelta(ctx *Context, maxSize int) int {
	size, err := strconv.Atoi(ctx.Query("size"))
	if err != nil {
		size = maxSize
	}
	if size < 1 {
		size = 1
	}
	if size > maxSize {
		size = maxSize
	}
	return size
}

// ---- Index ----

// BookIndexHandler 实现 /api/index。
//
// 对应 Python BookIndex.get：返回首页的「随机推荐」与「新书推荐」两组书，
// 而不是单一列表。前端 pages/index.vue 直接读 random_books / new_books，
// 因此这里的键名是接口契约的一部分。
func BookIndexHandler(cfg BookConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		ids, err := bookAllVisibleIDs(cfg, ctx)
		if err != nil {
			return nil, err
		}

		// 剔除私藏书（对应 Python 的 _get_private_book_ids 过滤）。
		private, err := bookPrivateIDs(cfg, ctx)
		if err != nil {
			return nil, err
		}
		visible := make([]int64, 0, len(ids))
		for _, id := range ids {
			if !private[id] {
				visible = append(visible, id)
			}
		}

		randomBooks, err := bookIndexSample(cfg, ctx, visible, bookIndexRandomCount(ctx))
		if err != nil {
			return nil, err
		}
		newBooks, err := bookIndexSample(cfg, ctx, visible, bookIndexRecentCount(ctx))
		if err != nil {
			return nil, err
		}

		return map[string]any{
			"random_books_count": len(randomBooks),
			"new_books_count":    len(newBooks),
			"random_books":       randomBooks,
			"new_books":          newBooks,
		}, nil
	}
}

// bookIndexRandomCount 返回随机推荐数量（默认 12，可用 random 参数覆盖）。
func bookIndexRandomCount(ctx *Context) int {
	return bookIndexCount(ctx, "random", 12)
}

// bookIndexRecentCount 返回新书推荐数量（默认 12，可用 recent 参数覆盖，上限 200）。
func bookIndexRecentCount(ctx *Context) int {
	return bookIndexCount(ctx, "recent", 12)
}

// bookIndexCount 解析首页数量参数；非法值回落默认值，上限 200。
func bookIndexCount(ctx *Context, name string, fallback int) int {
	raw := strings.TrimSpace(ctx.Query(name))
	if raw == "" {
		return fallback
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n < 0 {
		return fallback
	}
	if n > 200 {
		return 200
	}
	return n
}

// bookIndexSample 从可见 id 中随机抽取 count 本并渲染为书单。
//
// 对应 Python：random.sample 后按 id 降序排列。
func bookIndexSample(cfg BookConfig, ctx *Context, ids []int64, count int) ([]map[string]any, error) {
	if count <= 0 || len(ids) == 0 {
		return []map[string]any{}, nil
	}
	// 新书推荐只在最近 100 本里抽样（与 Python 的 sample_ids 一致）。
	pool := ids
	if len(pool) > 100 {
		pool = pool[:100]
	}
	picked := bookSampleIDs(pool, count)

	booksMap, err := bookLoadBooks(cfg, picked)
	if err != nil {
		return nil, err
	}
	values := make([]map[string]any, 0, len(picked))
	for _, id := range picked {
		if b, ok := booksMap[id]; ok {
			values = append(values, bookDict(cfg, b))
		}
	}
	sort.SliceStable(values, func(i, j int) bool {
		return int64Of(values[i]["id"]) > int64Of(values[j]["id"])
	})
	// 与 Python 的 attach_reading_states 一致：首页书单也带阅读状态。
	return bookAttachStates(cfg, ctx, values)
}

// bookSampleIDs 从 ids 中无放回抽取 count 个（不足时全取）。
func bookSampleIDs(ids []int64, count int) []int64 {
	if count >= len(ids) {
		out := make([]int64, len(ids))
		copy(out, ids)
		return out
	}
	perm := rand.Perm(len(ids))
	out := make([]int64, 0, count)
	for _, idx := range perm[:count] {
		out = append(out, ids[idx])
	}
	return out
}

// bookAllVisibleIDs 返回当前请求方可见的全部书籍 id（按 id 降序）。
func bookAllVisibleIDs(cfg BookConfig, ctx *Context) ([]int64, error) {
	rows, err := cfg.LibraryDB.Query(`SELECT id FROM books ORDER BY id DESC`)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	ids := []int64{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// ---- BookNav ----

// BookNavHandler 实现 /api/book/nav。
func BookNavHandler(cfg BookConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		tagmap := map[string]int{}
		if cfg.NavTags != nil {
			got, err := cfg.NavTags(ctx)
			if err != nil {
				return nil, err
			}
			tagmap = got
		}
		navs := []map[string]any{}
		done := map[string]bool{}
		for _, line := range strings.Split(settingString(cfg.Settings, "BOOK_NAV"), "\n") {
			line = strings.TrimSpace(line)
			parts := strings.Split(line, "=")
			if len(parts) != 2 {
				continue
			}
			legend := strings.TrimSpace(parts[0])
			tags := []string{}
			for _, v := range strings.Split(parts[1], "/") {
				tags = append(tags, strings.TrimSpace(v))
			}
			for _, t := range tags {
				done[t] = true
			}
			items := []map[string]any{}
			for _, t := range tags {
				if tagmap[t] > 0 {
					items = append(items, map[string]any{"name": t, "count": tagmap[t]})
				}
			}
			if len(items) > 0 {
				navs = append(navs, map[string]any{"legend": legend, "tags": items})
			}
		}
		others := []map[string]any{}
		names := make([]string, 0, len(tagmap))
		for name := range tagmap {
			names = append(names, name)
		}
		sort.Strings(names)
		for _, name := range names {
			if !done[name] {
				others = append(others, map[string]any{"name": name, "count": tagmap[name]})
			}
		}
		navs = append(navs, map[string]any{"legend": "其他", "tags": others})
		return map[string]any{"err": "ok", "navs": navs}, nil
	}
}

// ---- RecentBook ----

// BookRecentHandler 实现 /api/recent。
func BookRecentHandler(cfg BookConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		ids, err := bookAllVisibleIDs(cfg, ctx)
		if err != nil {
			return nil, err
		}
		return bookRenderList(cfg, ctx, ids, "新书推荐", true)
	}
}

// ---- LibraryBook ----

// BookLibraryHandler 实现 /api/library。
func BookLibraryHandler(cfg BookConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		ids, err := bookAllVisibleIDs(cfg, ctx)
		if err != nil {
			return nil, err
		}
		// 依次按 publisher / author / tag 求交集。
		for _, f := range []struct{ arg, field string }{
			{"publisher", "publisher"}, {"author", "author"}, {"tag", "tag"},
		} {
			value := ctx.Query(f.arg)
			if value == "" || value == "全部" || cfg.SearchField == nil {
				continue
			}
			matched, err := cfg.SearchField(ctx, f.field, value)
			if err != nil {
				return nil, err
			}
			ids = bookIntersect(ids, matched)
		}
		// 按格式过滤。
		if format := ctx.Query("format"); format != "" && format != "全部" {
			matched, err := library.BooksForFormat(cfg.LibraryDB, format)
			if err != nil {
				return nil, err
			}
			ids = bookIntersect(ids, matched)

		}
		return bookRenderList(cfg, ctx, ids, "书库", true)
	}
}

// bookHasFormat 判定书籍是否含某格式。
func bookHasFormat(b library.BookData, format string) bool {
	for _, f := range b.Formats {
		if strings.EqualFold(f, format) {
			return true
		}
	}
	return false
}

// bookIntersect 求两个 id 列表的交集（保持 a 的顺序）。
func bookIntersect(a, b []int64) []int64 {
	set := make(map[int64]bool, len(b))
	for _, id := range b {
		set[id] = true
	}
	out := make([]int64, 0, len(a))
	for _, id := range a {
		if set[id] {
			out = append(out, id)
		}
	}
	return out
}

// ---- SearchBook ----

// BookSearchHandler 实现 /api/search。
func BookSearchHandler(cfg BookConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		name := ctx.Query("name")
		if strings.TrimSpace(name) == "" {
			return map[string]any{"err": "params.invalid", "msg": "请输入搜索关键字"}, nil
		}
		idSet := map[int64]bool{}
		if cfg.Search != nil {
			ids, err := cfg.Search(ctx, name)
			if err != nil {
				return nil, err
			}
			for _, id := range ids {
				idSet[id] = true
			}
		}
		titleAliasIDs := map[int64]bool{}
		if cfg.AliasBookIDs != nil {
			ids, err := cfg.AliasBookIDs(ctx, name)
			if err != nil {
				return nil, err
			}
			for _, id := range ids {
				idSet[id] = true
				titleAliasIDs[id] = true
			}
		}
		if cfg.AliasAuthorNames != nil && cfg.BooksForCategory != nil {
			names, err := cfg.AliasAuthorNames(ctx, name)
			if err != nil {
				return nil, err
			}
			for _, authorName := range names {
				ids, err := cfg.BooksForCategory(ctx, "authors", authorName)
				if err != nil {
					return nil, err
				}
				for _, id := range ids {
					idSet[id] = true
				}
			}
		}
		ids := make([]int64, 0, len(idSet))
		for id := range idSet {
			ids = append(ids, id)
		}
		ids = bookSortByTitleRelevance(cfg, ids, name, titleAliasIDs)
		return bookRenderList(cfg, ctx, ids, fmt.Sprintf("搜索：%s", name), false)
	}
}

// bookSortByTitleRelevance 复刻 sort_ids_by_title_relevance：书名命中优先，同级按 id 降序。
func bookSortByTitleRelevance(cfg BookConfig, ids []int64, keyword string, titleAliasIDs map[int64]bool) []int64 {
	keyword = strings.ToLower(strings.TrimSpace(keyword))
	out := make([]int64, len(ids))
	copy(out, ids)
	sort.SliceStable(out, func(i, j int) bool {
		ki := bookRelevanceKey(cfg, out[i], keyword, titleAliasIDs)
		kj := bookRelevanceKey(cfg, out[j], keyword, titleAliasIDs)
		if ki[0] != kj[0] {
			return ki[0] < kj[0]
		}
		return ki[1] < kj[1]
	})
	return out
}

// bookRelevanceKey 返回 (是否书名命中, -id)。
func bookRelevanceKey(cfg BookConfig, id int64, keyword string, titleAliasIDs map[int64]bool) [2]int64 {
	title := ""
	if cfg.BookTitle != nil {
		title = strings.ToLower(cfg.BookTitle(id))
	}
	matched := (keyword != "" && strings.Contains(title, keyword)) || titleAliasIDs[id]
	first := int64(1)
	if matched {
		first = 0
	}
	return [2]int64{first, -id}
}

// ---- HotBook ----

// BookHotHandler 实现 /api/hot。
func BookHotHandler(cfg BookConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		start := bookArgumentStart(ctx)
		const delta = 60
		ids := []int64{}
		count := 0
		if cfg.HotBooks != nil {
			got, total, err := cfg.HotBooks(ctx, start, delta)
			if err != nil {
				return nil, err
			}
			ids, count = got, total
		}
		booksMap, err := bookLoadBooks(cfg, ids)
		if err != nil {
			return nil, err
		}
		values := make([]map[string]any, 0, len(ids))
		for _, id := range ids {
			if b, ok := booksMap[id]; ok {
				values = append(values, bookDict(cfg, b))
			}
		}
		values, err = bookAttachStates(cfg, ctx, values)
		if err != nil {
			return nil, err
		}
		return map[string]any{"err": "ok", "title": "热度榜单", "total": count, "books": values}, nil
	}
}

// ---- 阅读状态 ----

// BookReadingHandler 实现 /api/reading。
func BookReadingHandler(cfg BookConfig) HandlerFunc {
	return bookReadingListHandler(cfg, 1, "在读书籍")
}

// BookReadDoneHandler 实现 /api/read-done。
func BookReadDoneHandler(cfg BookConfig) HandlerFunc {
	return bookReadingListHandler(cfg, 2, "已读完书籍")
}

// bookReadingListHandler 按阅读状态列出书籍。
func bookReadingListHandler(cfg BookConfig, readState int64, title string) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if ctx.Identity.UserID == 0 {
			return map[string]any{"err": "user.need_login", "msg": "请先登录"}, nil
		}
		states, err := userdb.ListReadingStatesByState(cfg.DB, ctx.Identity.UserID, readState)
		if err != nil {
			return nil, err
		}
		ids := make([]int64, 0, len(states))
		stateByID := map[int64]*userdb.ReadingState{}
		for _, s := range states {
			ids = append(ids, s.BookID)
			stateByID[s.BookID] = s
		}
		booksMap, err := bookLoadBooks(cfg, ids)
		if err != nil {
			return nil, err
		}
		values := []map[string]any{}
		for _, id := range ids {
			b, ok := booksMap[id]
			if !ok {
				continue
			}
			d := bookDict(cfg, b)
			d["state"] = bookReadingStateDict(stateByID[id])
			values = append(values, d)
		}
		return map[string]any{"err": "ok", "title": title, "total": len(values), "books": values}, nil
	}
}

// BookReadStateHandler 实现 /api/book/<id>/readstate。
func BookReadStateHandler(cfg BookConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		bookID, err := strconv.ParseInt(ctx.Param(0), 10, 64)
		if err != nil {
			return map[string]any{"err": "params.book.invalid", "msg": "书籍已不存在"}, nil
		}
		if ctx.Identity.UserID == 0 {
			return map[string]any{"err": "user.need_login", "msg": "请先登录"}, nil
		}
		if ctx.Request.Method == http.MethodPost {
			book, err := bookGetOne(cfg, bookID)
			if err != nil {
				return nil, err
			}
			if book == nil {
				return map[string]any{"err": "params.book.invalid", "msg": "书籍已不存在"}, nil
			}
			data, ok := decodeJSONObject(ctx.Request)
			if !ok {
				return map[string]any{"err": "params.invalid", "msg": "参数无效"}, nil
			}
			readState := int64Of(data["read_state"])
			if readState != 0 && readState != 1 && readState != 2 {
				return map[string]any{"err": "params.invalid", "msg": "阅读状态参数错误"}, nil
			}
			if cfg.SetReadState == nil {
				return map[string]any{"err": "not_wired", "msg": "阅读状态写入未接线"}, nil
			}
			if err := cfg.SetReadState(ctx, bookID, data); err != nil {
				return nil, err
			}
			names := map[int64]string{0: "未读", 1: "在读", 2: "已读完"}
			return map[string]any{"err": "ok", "msg": fmt.Sprintf("阅读状态已设置为：%s", names[readState])}, nil
		}
		state, err := userdb.GetReadingState(cfg.DB, bookID, ctx.Identity.UserID)
		if err != nil {
			return nil, err
		}
		return bookReadingStateAPI(state), nil
	}
}

// BookProgressHandler 实现 /api/book/<id>/progress。
func BookProgressHandler(cfg BookConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		bookID, err := strconv.ParseInt(ctx.Param(0), 10, 64)
		if err != nil {
			return map[string]any{"err": "params.book.invalid", "msg": "书籍已不存在"}, nil
		}
		if ctx.Identity.UserID == 0 {
			return map[string]any{"err": "user.need_login", "msg": "请先登录"}, nil
		}
		if ctx.Request.Method == http.MethodPost {
			return bookSaveProgress(cfg, ctx, bookID)
		}
		state, err := userdb.GetReadingState(cfg.DB, bookID, ctx.Identity.UserID)
		if err != nil {
			return nil, err
		}
		if state == nil {
			return map[string]any{"err": "ok", "progress": map[string]any{}, "update_time": nil}, nil
		}
		return map[string]any{
			"err":         "ok",
			"progress":    state.GetProgress(),
			"update_time": isoOrNil(state.ProgressUpdateTime),
		}, nil
	}
}

// bookSaveProgress 保存阅读进度（上限 8 KiB）。
func bookSaveProgress(cfg BookConfig, ctx *Context, bookID int64) (map[string]any, error) {
	book, err := bookGetOne(cfg, bookID)
	if err != nil {
		return nil, err
	}
	if book == nil {
		return map[string]any{"err": "params.book.invalid", "msg": "书籍已不存在"}, nil
	}
	data, ok := decodeJSONObject(ctx.Request)
	if !ok {
		return map[string]any{"err": "params.invalid", "msg": "参数无效"}, nil
	}
	progress, ok := data["progress"].(map[string]any)
	if !ok {
		return map[string]any{"err": "params.invalid", "msg": "阅读进度参数错误"}, nil
	}
	encoded, err := json.Marshal(progress)
	if err != nil {
		return nil, err
	}
	if len(encoded) > 8*1024 {
		return map[string]any{"err": "params.invalid", "msg": "阅读进度数据过大"}, nil
	}
	if cfg.SetProgress == nil {
		return map[string]any{"err": "not_wired", "msg": "阅读进度写入未接线"}, nil
	}
	if err := cfg.SetProgress(ctx, bookID, progress); err != nil {
		return nil, err
	}
	return map[string]any{"err": "ok", "msg": "阅读进度已保存", "progress": progress}, nil
}

// BookReadingStatsHandler 实现 /api/reading/stats。
func BookReadingStatsHandler(cfg BookConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if ctx.Identity.UserID == 0 {
			return map[string]any{"err": "user.need_login", "msg": "请先登录"}, nil
		}
		now := time.Now()
		stats, err := userdb.ReadingStats(cfg.DB, ctx.Identity.UserID, now.Year(), int(now.Month()))
		if err != nil {
			return nil, err
		}
		// 本月读完的书籍（最多 12 本）。
		states, err := userdb.ListMonthReadDone(cfg.DB, ctx.Identity.UserID, now.Year(), int(now.Month()), 12)
		if err != nil {
			return nil, err
		}
		ids := make([]int64, 0, len(states))
		stateByID := map[int64]*userdb.ReadingState{}
		for _, s := range states {
			ids = append(ids, s.BookID)
			stateByID[s.BookID] = s
		}
		booksMap, err := bookLoadBooks(cfg, ids)
		if err != nil {
			return nil, err
		}
		monthBooks := []map[string]any{}
		for _, id := range ids {
			b, ok := booksMap[id]
			if !ok {
				continue
			}
			d := bookDict(cfg, b)
			d["state"] = bookReadingStateDict(stateByID[id])
			monthBooks = append(monthBooks, d)
		}
		stats["month_read_done_books"] = monthBooks
		return map[string]any{"err": "ok", "stats": stats}, nil
	}
}

// bookGetOne 取单本书；不存在返回 nil。
func bookGetOne(cfg BookConfig, bookID int64) (*library.BookData, error) {
	books, err := library.GetBooksData(cfg.LibraryDB, []int64{bookID})
	if err != nil {
		return nil, err
	}
	if len(books) == 0 {
		return nil, nil
	}
	return &books[0], nil
}
