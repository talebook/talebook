package httpapi

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"talebook/booksvr/internal/convert"
	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/userdb"
)

// ---- 收藏 / 书架 ----

// BookFavoriteHandler 实现 /api/book/<id>/favorite。
func BookFavoriteHandler(cfg BookConfig) HandlerFunc {
	return bookToggleHandler(cfg, "favorite", func(cfg BookConfig, ctx *Context, bookID int64, on bool) error {
		if cfg.SetFavorite == nil {
			return errNotWired
		}
		return cfg.SetFavorite(ctx, bookID, on)
	})
}

// BookShelfHandler 实现 /api/book/<id>/shelf。
//
// 请求体字段名是 "shelf"（与 Python 的 data.get("shelf", False) 一致），
// 不是 "wants"。曾因字段名不匹配，点击「加入书架」永远写入 false，
// 书架页面始终为空。
func BookShelfHandler(cfg BookConfig) HandlerFunc {
	return bookToggleHandler(cfg, "shelf", func(cfg BookConfig, ctx *Context, bookID int64, on bool) error {
		if cfg.SetShelf == nil {
			return errNotWired
		}
		return cfg.SetShelf(ctx, bookID, on)
	})
}

// errNotWired 表示对应能力未接线。
var errNotWired = errors.New("not_wired")

// bookToggleHandler 实现收藏/书架的开关语义。
func bookToggleHandler(cfg BookConfig, field string,
	set func(BookConfig, *Context, int64, bool) error) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		bookID, err := strconv.ParseInt(ctx.Param(0), 10, 64)
		if err != nil {
			return map[string]any{"err": "params.book.invalid", "msg": "书籍已不存在"}, nil
		}
		if ctx.Identity.UserID == 0 {
			return map[string]any{"err": "user.need_login", "msg": "请先登录"}, nil
		}
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
		on := bookBoolOf(data[field])
		if err := set(cfg, ctx, bookID, on); err != nil {
			if err == errNotWired {
				return map[string]any{"err": "not_wired", "msg": "状态写入未接线"}, nil
			}
			return nil, err
		}
		return map[string]any{"err": "ok", field: on}, nil
	}
}

// ---- ScopedBooks ----

// BookScopedHandler 实现 /api/scopedbooks。
func BookScopedHandler(cfg BookConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		scope := ctx.Query("scope")
		if scope == "" {
			scope = "public"
		}
		ids, err := userdb.BookIDsByScope(cfg.DB, scope, ctx.Identity.UserID)
		if err != nil {
			return nil, err
		}
		return bookRenderList(cfg, ctx, ids, "私有书籍", true)
	}
}

// BookShelfListHandler 实现 /api/shelf（书架列表）。
func BookShelfListHandler(cfg BookConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if ctx.Identity.UserID == 0 {
			return map[string]any{"err": "user.need_login", "msg": "请先登录"}, nil
		}
		states, err := userdb.ListShelfStates(cfg.DB, ctx.Identity.UserID)
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
		return map[string]any{"err": "ok", "title": "我的书架", "total": len(values), "books": values}, nil
	}
}

// ---- Favorites ----

// BookFavoritesHandler 实现 /api/favorites。
func BookFavoritesHandler(cfg BookConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if ctx.Identity.UserID == 0 {
			return map[string]any{"err": "user.need_login", "msg": "请先登录"}, nil
		}
		ids, err := userdb.FavoriteBookIDs(cfg.DB, ctx.Identity.UserID)
		if err != nil {
			return nil, err
		}
		return bookRenderList(cfg, ctx, ids, "我的收藏", true)
	}
}

// ---- 委托型 handler ----

// bookDelegate 构造一个把请求转交给注入实现的 handler。
func bookDelegate(cfg BookConfig, fn func(BookConfig) func(*Context, int64, map[string]any) (map[string]any, error),
	notWired string) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		bookID, err := strconv.ParseInt(ctx.Param(0), 10, 64)
		if err != nil {
			return map[string]any{"err": "params.book.invalid", "msg": "书籍已不存在"}, nil
		}
		data, ok := decodeJSONObject(ctx.Request)
		if !ok {
			return map[string]any{"err": "params.invalid", "msg": "请求参数格式错误"}, nil
		}
		impl := fn(cfg)
		if impl == nil {
			return map[string]any{"err": "not_wired", "msg": notWired}, nil
		}
		return impl(ctx, bookID, data)
	}
}

// BookEditHandler 实现 /api/book/<id>/edit。
func BookEditHandler(cfg BookConfig) HandlerFunc {
	return bookDelegate(cfg, func(c BookConfig) func(*Context, int64, map[string]any) (map[string]any, error) {
		return c.EditBook
	}, "书籍编辑未接线")
}

// BookDeleteHandler 实现 /api/book/<id>/delete。
func BookDeleteHandler(cfg BookConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		bookID, err := strconv.ParseInt(ctx.Param(0), 10, 64)
		if err != nil {
			return map[string]any{"err": "params.book.invalid", "msg": "书籍已不存在"}, nil
		}
		if cfg.DeleteBook == nil {
			return map[string]any{"err": "not_wired", "msg": "书籍删除未接线"}, nil
		}
		return cfg.DeleteBook(ctx, bookID)
	}
}

// BookConvertHandler 实现 /api/book/<id>/convert。
func BookConvertHandler(cfg BookConfig) HandlerFunc {
	return bookDelegate(cfg, func(c BookConfig) func(*Context, int64, map[string]any) (map[string]any, error) {
		return c.Convert
	}, "格式转换未接线")
}

// BookToPDFHandler 实现 /api/book/<id>/topdf。
func BookToPDFHandler(cfg BookConfig) HandlerFunc {
	return bookDelegate(cfg, func(c BookConfig) func(*Context, int64, map[string]any) (map[string]any, error) {
		return c.ToPDF
	}, "PDF 转换未接线")
}

// BookSeparateHandler 实现 /api/book/<id>/separate。
func BookSeparateHandler(cfg BookConfig) HandlerFunc {
	return bookDelegate(cfg, func(c BookConfig) func(*Context, int64, map[string]any) (map[string]any, error) {
		return c.Separate
	}, "书籍拆分未接线")
}

// BookSaveMetaHandler 实现 /api/book/<id>/savemeta。
func BookSaveMetaHandler(cfg BookConfig) HandlerFunc {
	return bookDelegate(cfg, func(c BookConfig) func(*Context, int64, map[string]any) (map[string]any, error) {
		return c.SaveMeta
	}, "元数据保存未接线")
}

// BookReferHandler 实现 /api/book/<id>/refer。
func BookReferHandler(cfg BookConfig) HandlerFunc {
	return bookDelegate(cfg, func(c BookConfig) func(*Context, int64, map[string]any) (map[string]any, error) {
		return c.Refer
	}, "来源引用未接线")
}

// BookSendDeviceHandler 实现 /api/book/<id>/send_to_device。
func BookSendDeviceHandler(cfg BookConfig) HandlerFunc {
	return bookDelegate(cfg, func(c BookConfig) func(*Context, int64, map[string]any) (map[string]any, error) {
		return c.SendToDevice
	}, "推送设备未接线")
}

// BookSendMailHandler 实现 /api/book/<id>/mailto。
func BookSendMailHandler(cfg BookConfig) HandlerFunc {
	return bookDelegate(cfg, func(c BookConfig) func(*Context, int64, map[string]any) (map[string]any, error) {
		return c.SendToMail
	}, "推送邮箱未接线")
}

// BookDeleteFormatHandler 实现 /api/book/<id>/delete_format。
func BookDeleteFormatHandler(cfg BookConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		bookID, err := strconv.ParseInt(ctx.Param(0), 10, 64)
		if err != nil {
			return map[string]any{"err": "params.book.invalid", "msg": "书籍已不存在"}, nil
		}
		data, ok := decodeJSONObject(ctx.Request)
		if !ok {
			return map[string]any{"err": "params.invalid", "msg": "请求参数格式错误"}, nil
		}
		format := stringOf(data["format"])
		if format == "" {
			return map[string]any{"err": "params.invalid", "msg": "格式参数错误"}, nil
		}
		if cfg.DeleteFormat == nil {
			return map[string]any{"err": "not_wired", "msg": "格式删除未接线"}, nil
		}
		return cfg.DeleteFormat(ctx, bookID, format)
	}
}

// BookSetScopeHandler 实现 /api/book/<id>/setscope。
func BookSetScopeHandler(cfg BookConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		bookID, err := strconv.ParseInt(ctx.Param(0), 10, 64)
		if err != nil {
			return map[string]any{"err": "params.book.invalid", "msg": "书籍已不存在"}, nil
		}
		data, ok := decodeJSONObject(ctx.Request)
		if !ok {
			return map[string]any{"err": "params.invalid", "msg": "请求参数格式错误"}, nil
		}
		scope := stringOf(data["scope"])
		if scope != "public" && scope != "private" {
			return map[string]any{"err": "params.invalid", "msg": "可见范围参数错误"}, nil
		}
		if cfg.SetScope == nil {
			return map[string]any{"err": "not_wired", "msg": "可见范围写入未接线"}, nil
		}
		if err := cfg.SetScope(ctx, bookID, scope); err != nil {
			return nil, err
		}
		return map[string]any{"err": "ok", "scope": scope}, nil
	}
}

// BookSetMediaTypeHandler 实现 /api/book/<id>/media_type。
func BookSetMediaTypeHandler(cfg BookConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		bookID, err := strconv.ParseInt(ctx.Param(0), 10, 64)
		if err != nil {
			return map[string]any{"err": "params.book.invalid", "msg": "书籍已不存在"}, nil
		}
		data, ok := decodeJSONObject(ctx.Request)
		if !ok {
			return map[string]any{"err": "params.invalid", "msg": "请求参数格式错误"}, nil
		}
		mediaType := stringOf(data["media_type"])
		if mediaType != "ebook" && mediaType != "comic" {
			return map[string]any{"err": "params.invalid", "msg": "媒体类型参数错误"}, nil
		}
		if cfg.SetMediaType == nil {
			return map[string]any{"err": "not_wired", "msg": "媒体类型写入未接线"}, nil
		}
		if err := cfg.SetMediaType(ctx, bookID, mediaType); err != nil {
			return nil, err
		}
		return map[string]any{"err": "ok", "media_type": mediaType}, nil
	}
}

// ---- 上传 ----

// BookUploadHandler 实现 /api/book/upload。
func BookUploadHandler(cfg BookConfig) HandlerFunc {
	return bookUploadDelegate(cfg, func(c BookConfig) func(*Context, map[string]any) (map[string]any, error) {
		return c.Upload
	}, "上传未接线")
}

// BookUploadChunkHandler 实现 /api/book/upload/chunk。
func BookUploadChunkHandler(cfg BookConfig) HandlerFunc {
	return bookUploadDelegate(cfg, func(c BookConfig) func(*Context, map[string]any) (map[string]any, error) {
		return c.UploadChunk
	}, "分片上传未接线")
}

// BookUploadCompleteHandler 实现 /api/book/upload/complete。
func BookUploadCompleteHandler(cfg BookConfig) HandlerFunc {
	return bookUploadDelegate(cfg, func(c BookConfig) func(*Context, map[string]any) (map[string]any, error) {
		return c.UploadComplete
	}, "上传完成未接线")
}

// bookUploadDelegate 构造上传类 handler。
func bookUploadDelegate(cfg BookConfig,
	fn func(BookConfig) func(*Context, map[string]any) (map[string]any, error), notWired string) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		data, ok := decodeJSONObject(ctx.Request)
		if !ok {
			return map[string]any{"err": "params.invalid", "msg": "请求参数格式错误"}, nil
		}
		impl := fn(cfg)
		if impl == nil {
			return map[string]any{"err": "not_wired", "msg": notWired}, nil
		}
		return impl(ctx, data)
	}
}

// BookTxtInitHandler 实现 /api/book/txt/init。
func BookTxtInitHandler(cfg BookConfig) HandlerFunc {
	return bookUploadDelegate(cfg, func(c BookConfig) func(*Context, map[string]any) (map[string]any, error) {
		return c.TxtInit
	}, "TXT 初始化未接线")
}

// ---- 阅读 ----

// bookRequireReadPermission 复刻 require_online_read_permission。
//
// 返回 (是否放行, 响应)。放行时响应为 nil。
func bookRequireReadPermission(cfg BookConfig, ctx *Context) (bool, map[string]any) {
	guestLike := ctx.Identity.UserID == 0
	if guestLike {
		if !cfg.AllowGuestRead {
			return false, map[string]any{"err": "user.need_login", "msg": "请先登录"}
		}
		return true, nil
	}
	if ctx.CanRead() {
		if !ctx.IsActive() {
			return false, map[string]any{"err": "user.activation_required", "msg": "请先激活账号"}
		}
		return true, nil
	}
	return false, map[string]any{"err": "user.no_permission", "msg": "无权在线阅读"}
}

// BookReadHandler 实现 /read/<id>。
func BookReadHandler(cfg BookConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		bookID, err := strconv.ParseInt(ctx.Param(0), 10, 64)
		if err != nil {
			return map[string]any{"err": "params.book.invalid", "msg": "书籍已不存在"}, nil
		}
		if ok, resp := bookRequireReadPermission(cfg, ctx); !ok {
			return resp, nil
		}
		if cfg.CanViewBook != nil && !cfg.CanViewBook(ctx, bookID) {
			return map[string]any{"err": "params.book.invalid", "msg": "书籍已不存在"}, nil
		}
		if cfg.ReadBook == nil {
			return map[string]any{"err": "not_wired", "msg": "在线阅读未接线"}, nil
		}
		return cfg.ReadBook(ctx, bookID)
	}
}

// BookReaderBootstrapHandler 实现 /api/book/<id>/reader-bootstrap。
func BookReaderBootstrapHandler(cfg BookConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		bookID, err := strconv.ParseInt(ctx.Param(0), 10, 64)
		if err != nil {
			return map[string]any{"err": "params.book.invalid", "msg": "书籍已不存在"}, nil
		}
		if ok, resp := bookRequireReadPermission(cfg, ctx); !ok {
			return resp, nil
		}
		if cfg.CanViewBook != nil && !cfg.CanViewBook(ctx, bookID) {
			return map[string]any{"err": "params.book.invalid", "msg": "书籍已不存在"}, nil
		}
		if cfg.ReaderBootstrap == nil {
			return map[string]any{"err": "not_wired", "msg": "阅读器引导未接线"}, nil
		}
		return cfg.ReaderBootstrap(ctx, bookID)
	}
}

// BookReaderResourceHandler 实现 /read/resource/<id>.epub。
func BookReaderResourceHandler(cfg BookConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		name := ctx.Param(0)
		bookID, err := strconv.ParseInt(strings.TrimSuffix(name, ".epub"), 10, 64)
		if err != nil {
			http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
			return nil, nil
		}
		if ok, _ := bookRequireReadPermission(cfg, ctx); !ok {
			http.Error(ctx.Writer, "Forbidden", http.StatusForbidden)
			return nil, nil
		}
		if cfg.CanViewBook != nil && !cfg.CanViewBook(ctx, bookID) {
			http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
			return nil, nil
		}
		if cfg.ReadResource == nil {
			http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
			return nil, nil
		}
		path, err := cfg.ReadResource(ctx, bookID, name)
		if err != nil {
			http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
			return nil, nil
		}
		serveAudioFile(ctx, path)
		return nil, nil
	}
}

// BookTxtReadHandler 实现 /api/read/txt。
func BookTxtReadHandler(cfg BookConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		bookID, err := strconv.ParseInt(ctx.Query("id"), 10, 64)
		if err != nil {
			return map[string]any{"err": "params.book.invalid", "msg": "书籍已不存在"}, nil
		}
		if ok, resp := bookRequireReadPermission(cfg, ctx); !ok {
			return resp, nil
		}
		if cfg.CanViewBook != nil && !cfg.CanViewBook(ctx, bookID) {
			return map[string]any{"err": "params.book.invalid", "msg": "书籍已不存在"}, nil
		}
		if cfg.ReadTxt == nil {
			return map[string]any{"err": "not_wired", "msg": "TXT 阅读未接线"}, nil
		}
		return cfg.ReadTxt(ctx, bookID)
	}
}

// ---- BookDetail ----

// BookDetailHandler 实现 /api/book/<id> 与 /api/book/<id>.<ext>。
func BookDetailHandler(cfg BookConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		raw := ctx.Param(0)
		// /api/book/([0-9]+\..+) 形式：id 后跟扩展名。
		idPart := raw
		if i := strings.Index(raw, "."); i >= 0 {
			idPart = raw[:i]
		}
		bookID, err := strconv.ParseInt(idPart, 10, 64)
		if err != nil {
			return map[string]any{"err": "params.book.invalid", "msg": "书籍已不存在"}, nil
		}
		book, err := bookGetOne(cfg, bookID)
		if err != nil {
			return nil, err
		}
		if book == nil {
			return map[string]any{"err": "params.book.invalid", "msg": "书籍已不存在"}, nil
		}
		if cfg.CanViewBook != nil && !cfg.CanViewBook(ctx, bookID) {
			return map[string]any{"err": "params.book.invalid", "msg": "书籍已不存在"}, nil
		}
		d := bookDict(cfg, *book)
		// files 必须是对象数组（format/size/href/online_readable），
		// 与 Python 的 BookFormatter.get_files 一致；前端 pages/book/[bid]/index.vue
		// 直接读 file.format.toLowerCase()，传字符串会导致 500。
		d["files"] = bookFileEntries(cfg, ctx, *book)
		// 分类页链接（Python 的 BookFormatter.format 用 api_url 拼）。
		d["author_url"] = cfg.CDNURL + "/author/" + val(book.AuthorSort, UnknownText)
		d["publisher_url"] = cfg.CDNURL + "/publisher/" + val(book.Publisher, UnknownText)
		// 权限字段（Python 的 BookFormatter.get_permissions）。
		d["is_public"] = true
		d["is_owner"] = cfg.IsBookOwner != nil && cfg.IsBookOwner(ctx, bookID)
		// 别名（Python 的 AliasService.get_book_aliases）。
		// 未接线时返回空数组，与 Python 无别名时的行为一致。
		aliases := []string{}
		if cfg.Aliases != nil {
			got, err := cfg.Aliases.GetBookAliases(bookID)
			if err != nil {
				return nil, err
			}
			if got != nil {
				aliases = got
			}
		}
		d["aliases"] = aliases
		state, err := userdb.GetReadingState(cfg.DB, bookID, ctx.Identity.UserID)
		if err != nil {
			return nil, err
		}
		d["state"] = bookReadingStateDict(state)

		// 顶层字段：Python 的 BookDetail.get 额外返回这三项。
		return map[string]any{
			"err":                "ok",
			"book":               d,
			"kindle_sender":      toStrSetting(cfg.Settings, "smtp_username"),
			"conversion_options": convert.OptionsForFormats(book.Formats),
		}, nil
	}
}

// bookFileEntries 组装书籍详情里的 files 数组。
//
// 对应 Python 的 BookFormatter.get_files()：每项含 format / size / href /
// online_readable。前端 pages/book/[bid]/index.vue 直接读 file.format，
// 因此不能退化为格式名字符串（否则前端报 toLowerCase of undefined）。
func bookFileEntries(cfg BookConfig, ctx *Context, book library.BookData) []map[string]any {
	out := make([]map[string]any, 0, len(book.Formats))
	for _, format := range book.Formats {
		size, ok := bookFormatSize(cfg.LibraryDB, book.ID, format)
		if !ok {
			// Python 版在 sizeof_format 抛异常时 continue，跳过该格式。
			continue
		}
		out = append(out, map[string]any{
			"format":          format,
			"size":            size,
			"href":            fmt.Sprintf("%s/api/book/%d.%s", cfg.CDNURL, book.ID, format),
			"online_readable": OnlineReadable([]string{format}),
		})
	}
	return out
}

// bookFormatSize 读取某本书指定格式的文件大小。
//
// 对应 Calibre 的 sizeof_format：优先 book_formats.size，
// 回退 data.uncompressed_size；两者都取不到时返回 false。
func bookFormatSize(db *sql.DB, bookID int64, format string) (int64, bool) {
	var size int64
	err := db.QueryRow(`SELECT size FROM book_formats WHERE book_id = ? AND format = ? LIMIT 1`,
		bookID, format).Scan(&size)
	if err == nil {
		return size, true
	}
	err = db.QueryRow(`SELECT uncompressed_size FROM data WHERE book = ? AND UPPER(format) = ? LIMIT 1`,
		bookID, format).Scan(&size)
	if err == nil {
		return size, true
	}
	return 0, false
}

// bookBoolOf 把任意值解析成布尔。
func bookBoolOf(v any) bool {
	switch t := v.(type) {
	case bool:
		return t
	case string:
		return t == "1" || strings.EqualFold(t, "true")
	case float64:
		return t != 0
	case int64:
		return t != 0
	case int:
		return t != 0
	}
	return false
}

// ---- 路由表 ----

// BookRouteSpecs 返回书籍模块接管的 38 条路由。
func BookRouteSpecs(cfg BookConfig) []RouteSpec {
	get := []string{http.MethodGet}
	getPost := []string{http.MethodGet, http.MethodPost}
	all := []string{http.MethodGet, http.MethodPost, http.MethodPatch, http.MethodDelete}
	return []RouteSpec{
		{Pattern: rBookIndex, Methods: getPost, Handler: BookIndexHandler(cfg)},
		{Pattern: rBookDetail, Methods: all, Handler: BookDetailHandler(cfg)},
		// rBookDetailExt 是 /api/book/<id>.<fmt> 的**文件下载**，不是详情。
		// 曾误绑到 BookDetailHandler，导致 /api/book/1.MOBI 返回详情 JSON。
		{Pattern: rBookDetailExt, Methods: getPost, Handler: BookDownloadHandler(cfg)},
		{Pattern: rBookConvert, Methods: all, Auth: true, Handler: BookConvertHandler(cfg)},
		{Pattern: rBookToPDF, Methods: all, Auth: true, Handler: BookToPDFHandler(cfg)},
		{Pattern: rBookRefer, Methods: all, Auth: true, Handler: BookReferHandler(cfg)},
		{Pattern: rBookEdit, Methods: all, Auth: true, Handler: BookEditHandler(cfg)},
		{Pattern: rBookDelete, Methods: all, Auth: true, Handler: BookDeleteHandler(cfg)},
		{Pattern: rBookNav, Methods: getPost, Handler: BookNavHandler(cfg)},
		{Pattern: rBookRecent, Methods: getPost, Handler: BookRecentHandler(cfg)},
		{Pattern: rBookLibrary, Methods: getPost, Handler: BookLibraryHandler(cfg)},
		{Pattern: rBookSearch, Methods: getPost, Handler: BookSearchHandler(cfg)},
		{Pattern: rBookHot, Methods: getPost, Handler: BookHotHandler(cfg)},
		{Pattern: rBookUpload, Methods: all, Auth: true, Handler: BookUploadHandler(cfg)},
		{Pattern: rBookUploadChunk, Methods: all, Auth: true, Handler: BookUploadChunkHandler(cfg)},
		{Pattern: rBookUploadDone, Methods: all, Auth: true, Handler: BookUploadCompleteHandler(cfg)},
		{Pattern: rBookRead, Methods: get, Handler: BookReadHandler(cfg)},
		{Pattern: rBookReaderBoot, Methods: getPost, Handler: BookReaderBootstrapHandler(cfg)},
		{Pattern: rBookReaderRes, Methods: get, Handler: BookReaderResourceHandler(cfg)},
		{Pattern: rBookTxtRead, Methods: getPost, Handler: BookTxtReadHandler(cfg)},
		{Pattern: rBookTxtInit, Methods: all, Auth: true, Handler: BookTxtInitHandler(cfg)},
		{Pattern: rBookSendDevice, Methods: all, Auth: true, Handler: BookSendDeviceHandler(cfg)},
		{Pattern: rBookSendMail, Methods: all, Auth: true, Handler: BookSendMailHandler(cfg)},
		{Pattern: rBookSetScope, Methods: all, Auth: true, Handler: BookSetScopeHandler(cfg)},
		{Pattern: rBookSetMediaType, Methods: all, Auth: true, Handler: BookSetMediaTypeHandler(cfg)},
		{Pattern: rBookDeleteFormat, Methods: all, Auth: true, Handler: BookDeleteFormatHandler(cfg)},
		{Pattern: rBookSeparate, Methods: all, Auth: true, Handler: BookSeparateHandler(cfg)},
		{Pattern: rBookSaveMeta, Methods: all, Auth: true, Handler: BookSaveMetaHandler(cfg)},
		{Pattern: rBookScoped, Methods: getPost, Handler: BookScopedHandler(cfg)},
		{Pattern: rBookFavorite, Methods: all, Auth: true, Handler: BookFavoriteHandler(cfg)},
		{Pattern: rBookShelf, Methods: all, Auth: true, Handler: BookShelfHandler(cfg)},
		{Pattern: rBookShelfList, Methods: getPost, Auth: true, Handler: BookShelfListHandler(cfg)},
		{Pattern: rBookReading, Methods: getPost, Auth: true, Handler: BookReadingHandler(cfg)},
		{Pattern: rBookReadDone, Methods: getPost, Auth: true, Handler: BookReadDoneHandler(cfg)},
		{Pattern: rBookReadState, Methods: getPost, Auth: true, Handler: BookReadStateHandler(cfg)},
		{Pattern: rBookProgress, Methods: getPost, Auth: true, Handler: BookProgressHandler(cfg)},
		{Pattern: rBookReadStats, Methods: getPost, Auth: true, Handler: BookReadingStatsHandler(cfg)},
		{Pattern: rBookFavorites, Methods: getPost, Auth: true, Handler: BookFavoritesHandler(cfg)},
	}
}
