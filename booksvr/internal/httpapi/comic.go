// 本文件实现 webserver/handlers/comic.py 的 4 条漫画路由。
//
// 漫画阅读的鉴权是双通道的：
//   - 清单/进度接口走常规登录态（@auth）；
//   - 分页接口既接受登录态，也接受「页级签名令牌」（token 查询参数），
//     后者让 <img> 标签无需携带 cookie 也能取图。
package httpapi

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"talebook/booksvr/internal/comic"
	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/userdb"
)

// 与 Python 版逐字一致的常量。
const (
	// comicProgressVersion 对齐 COMIC_PROGRESS_VERSION。
	comicProgressVersion = 1
	// maxComicProgressBytes 对齐 MAX_COMIC_PROGRESS_BYTES。
	maxComicProgressBytes = 2048
	// comicPageTokenName 对齐 COMIC_PAGE_TOKEN_NAME。
	comicPageTokenName = "comic-page-v1"
	// comicPageTokenMaxAgeDays 对齐 COMIC_PAGE_TOKEN_MAX_AGE_DAYS。
	comicPageTokenMaxAgeDays = 1.0
	// komgaReaderVersion 对齐 KOMGA_READER_VERSION。
	komgaReaderVersion = "d49a2e808601c7fc9b892a6c019a92eed017fd16"
)

// ComicConfig 是漫画模块需要的配置。
type ComicConfig struct {
	// CookieSecret 用于页级令牌签名。
	CookieSecret string
	// LibraryRoot 是书库根目录，用于解析格式绝对路径。
	LibraryRoot string
	// CaptchaEnabled 报告指定场景是否开启人机验证。
	// 为 nil 时视为全部关闭（与未配置验证码时一致）。
	CaptchaEnabled func(scene string) bool
	// Clock 返回当前 Unix 秒；为 nil 时用 time.Now。
	Clock func() int64
}

// now 返回当前 Unix 秒。
func (c ComicConfig) now() int64 {
	if c.Clock != nil {
		return c.Clock()
	}
	return time.Now().Unix()
}

// captchaOn 报告场景是否开启人机验证。
func (c ComicConfig) captchaOn(scene string) bool {
	if c.CaptchaEnabled == nil {
		return false
	}
	return c.CaptchaEnabled(scene)
}

// comicPageTokenPayload 是页级令牌的载荷，对齐 Python 的 payload 结构。
type comicPageTokenPayload struct {
	BookID    int64  `json:"book_id"`
	PageIndex int64  `json:"page_index"`
	Revision  string `json:"revision"`
	UserID    int64  `json:"user_id"`
}

// createPageToken 复刻 ComicHandlerMixin.create_page_token。
func createPageToken(cfg ComicConfig, bookID int64, pageIndex int, revision string, userID int64) (string, error) {
	payload, err := json.Marshal(comicPageTokenPayload{
		BookID: bookID, PageIndex: int64(pageIndex), Revision: revision, UserID: userID,
	})
	if err != nil {
		return "", fmt.Errorf("httpapi: 序列化页令牌失败: %w", err)
	}
	return SignCookie(cfg.CookieSecret, comicPageTokenName, string(payload), cfg.now()), nil
}

// pageTokenUser 复刻 ComicHandlerMixin.page_token_user。
//
// 令牌无效、作用域不匹配或用户不存在时返回错误。
func pageTokenUser(ctx *Context, cfg ComicConfig, bookID int64, pageIndex int, revision string) (*userdb.Reader, error) {
	token := ctx.Request.URL.Query().Get("token")
	if token == "" {
		return nil, comic.NewError("comic.page_token", "漫画页面访问凭证无效或已过期", 401)
	}
	raw := DecodeSignedValue(cfg.CookieSecret, comicPageTokenName, []byte(token),
		comicPageTokenMaxAgeDays, cfg.Clock)
	if len(raw) == 0 {
		return nil, comic.NewError("comic.page_token", "漫画页面访问凭证无效或已过期", 401)
	}

	var p comicPageTokenPayload
	if err := json.Unmarshal(raw, &p); err != nil {
		return nil, comic.NewError("comic.page_token", "漫画页面访问凭证无效或已过期", 401)
	}
	if p.BookID != bookID || p.PageIndex != int64(pageIndex) || p.Revision != revision || p.UserID <= 0 {
		return nil, comic.NewError("comic.page_token", "漫画页面访问凭证无效或已过期", 401)
	}

	user, err := userdb.GetReaderByID(ctx.DB, p.UserID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, comic.NewError("comic.page_token", "漫画页面访问凭证无效或已过期", 401)
	}
	return user, nil
}

// canUserViewBook 复刻 ComicHandlerMixin._can_user_view_book。
//
// scope != "private" 时任何人可见；否则仅管理员或收藏者可见。
func canUserViewBook(ctx *Context, bookID int64, user *userdb.Reader) (bool, error) {
	item, err := userdb.GetItem(ctx.DB, bookID)
	if err != nil {
		return false, err
	}
	if item == nil || item.Scope != "private" {
		return true, nil
	}
	if user == nil {
		return false, nil
	}
	if user.Admin {
		return true, nil
	}
	return item.CollectorID.Valid && item.CollectorID.Int64 == user.ID, nil
}

// authorizedComic 复刻 ComicHandlerMixin.get_authorized_comic。
//
// 返回 (书籍数据, 容器绝对路径, 容器格式)。
func authorizedComic(ctx *Context, cfg ComicConfig, bookID int64, authenticated *userdb.Reader) (map[string]any, string, string, error) {
	var user *userdb.Reader
	if authenticated == nil {
		if !bookAccessible(ctx, bookID) {
			return nil, "", "", comic.NewError("comic.book_not_found", "书籍不存在", 404)
		}
		if !ctx.Identity.IsGuest() {
			u, err := userdb.GetReaderByID(ctx.DB, ctx.Identity.UserID)
			if err != nil {
				return nil, "", "", err
			}
			user = u
		}
	} else {
		user = authenticated
		ok, err := canUserViewBook(ctx, bookID, user)
		if err != nil {
			return nil, "", "", err
		}
		if !ok {
			return nil, "", "", comic.NewError("comic.book_not_found", "书籍不存在", 404)
		}
	}

	book, err := comicBookData(ctx, cfg, bookID)
	if err != nil {
		return nil, "", "", err
	}
	if book == nil {
		return nil, "", "", comic.NewError("comic.book_not_found", "书籍不存在", 404)
	}
	if user == nil {
		return nil, "", "", comic.NewError("comic.login_required", "请先登录", 401)
	}
	if !user.CanRead() {
		return nil, "", "", comic.NewError("comic.no_permission", "无权在线阅读", 403)
	}
	if !user.IsActive() {
		return nil, "", "", comic.NewError("comic.account_inactive", "账号尚未激活，无法在线阅读", 403)
	}

	// 测试注入的容器路径优先（绕过书库格式表）。
	if ctx.comicArchiveOverride != nil {
		return book, ctx.comicArchiveOverride.Path, ctx.comicArchiveOverride.Format, nil
	}

	archivePath, archiveFormat, err := comic.SelectContainer(book)
	if err != nil {
		return nil, "", "", err
	}
	return book, archivePath, archiveFormat, nil
}

// comicBookData 组装漫画容器选择所需的书籍数据。
//
// 返回的 map 含 media_type 与 fmt_<format> 键，供 comic.SelectContainer 使用。
func comicBookData(ctx *Context, cfg ComicConfig, bookID int64) (map[string]any, error) {
	books, err := library.GetBooksData(ctx.DB, []int64{bookID})
	if err != nil {
		return nil, err
	}
	if len(books) == 0 {
		return nil, nil
	}
	b := books[0]

	out := map[string]any{
		"id":         b.ID,
		"title":      b.Title,
		"media_type": comicMediaType(ctx, bookID),
	}
	// 键名必须是小写 fmt_<format>，与 comic.SelectContainer 的查找键一致。
	// 路径优先取 book_formats（booksvr 存储层），回退 Calibre 的 books.path + data.name。
	for _, format := range b.Formats {
		lower := strings.ToLower(format)
		abs, err := library.FormatAbsPath(ctx.DB, bookID, lower, cfg.LibraryRoot)
		if err != nil || abs == "" {
			continue
		}
		out["fmt_"+lower] = abs
	}
	return out, nil
}

// comicMediaType 读取 items.media_type；无记录时返回空串。
func comicMediaType(ctx *Context, bookID int64) string {
	item, err := userdb.GetItem(ctx.DB, bookID)
	if err != nil || item == nil {
		return ""
	}
	return item.MediaType
}

// requireBookCaptcha 复刻 require_book_captcha。
//
// 返回 true 表示通过；false 表示已写响应（403 或重定向），调用方应直接返回。
func requireBookCaptcha(ctx *Context, cfg ComicConfig, bookID int64, scene string, redirect bool) bool {
	if !cfg.captchaOn(scene) {
		return true
	}
	ctx.Writer.Header().Set("Cache-Control", "private, no-store")

	// 已通过验证的标记存在 cookie 中。
	if c, err := ctx.Request.Cookie(captchaGrantCookie(scene)); err == nil && c != nil && c.Value != "" {
		return true
	}

	if redirect {
		target := base64.RawURLEncoding.EncodeToString([]byte(ctx.Request.URL.RequestURI()))
		q := url.Values{"scene": {scene}, "next_b64": {target}}
		http.Redirect(ctx.Writer, ctx.Request, fmt.Sprintf("/book/%d/verify?%s", bookID, q.Encode()),
			http.StatusFound)
		return false
	}
	writeJSON(ctx.Writer, http.StatusForbidden, map[string]any{
		"err": "captcha.required", "msg": "请完成人机验证",
	})
	return false
}

// captchaGrantCookie 返回某场景的验证通过标记 cookie 名。
func captchaGrantCookie(scene string) string { return "captcha_grant_" + scene }

// comicErrorEnvelope 复刻 ComicHandlerMixin.error_envelope。
func comicErrorEnvelope(err error) map[string]any {
	if ce, ok := err.(*comic.Error); ok {
		return map[string]any{"err": ce.Code, "msg": ce.Message}
	}
	return map[string]any{"err": "comic.error", "msg": err.Error()}
}

// ComicManifestHandler 实现 /api/book/([0-9]+)/comic/pages（GET，需登录）。
func ComicManifestHandler(cfg ComicConfig, svc *comic.Service) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		bookID, err := strconv.ParseInt(ctx.Param(0), 10, 64)
		if err != nil {
			return comicErrorEnvelope(comic.NewError("comic.book_not_found", "书籍不存在", 404)), nil
		}

		book, archivePath, archiveFormat, err := authorizedComic(ctx, cfg, bookID, nil)
		if err != nil {
			return comicErrorEnvelope(err), nil
		}
		if !requireBookCaptcha(ctx, cfg, bookID, "read", false) {
			return nil, nil
		}

		manifest, err := svc.GetManifest(archivePath, archiveFormat)
		if err != nil {
			return comicErrorEnvelope(err), nil
		}

		pages := make([]map[string]any, 0, len(manifest.Pages))
		for _, p := range manifest.Pages {
			data := p.ToPublicDict(bookID, manifest.Revision)
			token, err := createPageToken(cfg, bookID, p.Index, manifest.Revision, ctx.Identity.UserID)
			if err != nil {
				return nil, err
			}
			data["url"] = data["url"].(string) + "&token=" + url.QueryEscape(token)
			pages = append(pages, data)
		}

		title, _ := book["title"].(string)
		if title == "" {
			title = "漫画"
		}
		return map[string]any{
			"err":              "ok",
			"contract_version": 1,
			"book_id":          bookID,
			"title":            title,
			"format":           strings.ToUpper(archiveFormat),
			"revision":         manifest.Revision,
			"pages_count":      len(manifest.Pages),
			"pages":            pages,
		}, nil
	}
}

// ComicPageHandler 实现 /api/book/([0-9]+)/comic/pages/([0-9]+)（GET）。
//
// 不走 @auth：既接受登录态，也接受页级签名令牌。
func ComicPageHandler(cfg ComicConfig, svc *comic.Service) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		bookID, err1 := strconv.ParseInt(ctx.Param(0), 10, 64)
		pageIndex, err2 := strconv.Atoi(ctx.Param(1))
		if err1 != nil || err2 != nil {
			return nil, writeComicProtocolError(ctx, comic.NewError("comic.page_not_found", "漫画页码超出范围", 404))
		}
		revision := ctx.Request.URL.Query().Get("revision")

		var tokenUser *userdb.Reader
		if ctx.Identity.IsGuest() {
			u, err := pageTokenUser(ctx, cfg, bookID, pageIndex, revision)
			if err != nil {
				return nil, writeComicProtocolError(ctx, err)
			}
			tokenUser = u
		}

		_, archivePath, archiveFormat, err := authorizedComic(ctx, cfg, bookID, tokenUser)
		if err != nil {
			return nil, writeComicProtocolError(ctx, err)
		}
		if !requireBookCaptcha(ctx, cfg, bookID, "read", false) {
			return nil, nil
		}

		content, err := svc.ReadPage(archivePath, archiveFormat, pageIndex, revision)
		if err != nil {
			return nil, writeComicProtocolError(ctx, err)
		}

		h := ctx.Writer.Header()
		h.Set("Content-Type", content.Page.MIMEType)
		h.Set("Content-Length", strconv.Itoa(len(content.Data)))
		if cfg.captchaOn("read") {
			h.Set("Cache-Control", "private, no-store")
		} else {
			h.Set("Cache-Control", "private, max-age=3600, immutable")
		}
		h.Set("Vary", "Cookie")
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("Content-Security-Policy", "default-src 'none'; sandbox")
		ctx.Writer.WriteHeader(http.StatusOK)
		if _, err := ctx.Writer.Write(content.Data); err != nil {
			return nil, err
		}
		return nil, nil
	}
}

// writeComicProtocolError 复刻 ComicPageHandler.write_protocol_error。
//
// 分页接口用纯文本错误体（不是 JSON），因此这里自行写响应并返回 nil 响应。
func writeComicProtocolError(ctx *Context, err error) error {
	status := http.StatusUnprocessableEntity
	msg := err.Error()
	if ce, ok := err.(*comic.Error); ok {
		status = ce.Status
		msg = ce.Message
	}
	h := ctx.Writer.Header()
	h.Set("Content-Type", "text/plain; charset=UTF-8")
	h.Set("Cache-Control", "no-store")
	h.Set("X-Content-Type-Options", "nosniff")
	ctx.Writer.WriteHeader(status)
	_, _ = ctx.Writer.Write([]byte(msg))
	return nil
}

// ComicProgressHandler 实现 /api/book/([0-9]+)/comic/progress（GET/POST，需登录）。
func ComicProgressHandler(cfg ComicConfig, svc *comic.Service) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		bookID, err := strconv.ParseInt(ctx.Param(0), 10, 64)
		if err != nil {
			return comicErrorEnvelope(comic.NewError("comic.book_not_found", "书籍不存在", 404)), nil
		}
		if ctx.Request.Method == http.MethodPost {
			return comicProgressSave(ctx, cfg, svc, bookID)
		}
		return comicProgressGet(ctx, cfg, svc, bookID)
	}
}

// comicProgressGet 对齐 ComicProgressHandler.get。
func comicProgressGet(ctx *Context, cfg ComicConfig, svc *comic.Service, bookID int64) (map[string]any, error) {
	_, archivePath, archiveFormat, err := authorizedComic(ctx, cfg, bookID, nil)
	if err != nil {
		return comicErrorEnvelope(err), nil
	}
	manifest, err := svc.GetManifest(archivePath, archiveFormat)
	if err != nil {
		return comicErrorEnvelope(err), nil
	}

	state, err := userdb.GetReadingState(ctx.DB, bookID, ctx.Identity.UserID)
	if err != nil {
		return nil, err
	}
	progress := map[string]any{}
	if state != nil {
		if p := normalizeComicProgress(manifest, state.GetProgress()); p != nil {
			progress = p
		}
	}
	updateTime := any(nil)
	if state != nil && state.ProgressUpdateTime != "" {
		updateTime = state.ProgressUpdateTime
	}
	return map[string]any{"err": "ok", "progress": progress, "update_time": updateTime}, nil
}

// comicProgressSave 对齐 ComicProgressHandler.post。
func comicProgressSave(ctx *Context, cfg ComicConfig, svc *comic.Service, bookID int64) (map[string]any, error) {
	_, archivePath, archiveFormat, err := authorizedComic(ctx, cfg, bookID, nil)
	if err != nil {
		return comicErrorEnvelope(err), nil
	}
	manifest, err := svc.GetManifest(archivePath, archiveFormat)
	if err != nil {
		return comicErrorEnvelope(err), nil
	}

	body, err := readBodyLimited(ctx.Request, maxComicProgressBytes)
	if err != nil {
		return map[string]any{"err": "comic.progress_invalid", "msg": "漫画阅读进度数据过大"}, nil
	}
	var data map[string]any
	if err := json.Unmarshal(body, &data); err != nil || data == nil {
		return map[string]any{"err": "comic.progress_invalid", "msg": "漫画阅读进度参数错误"}, nil
	}

	progress, _ := data["progress"].(map[string]any)
	normalized := normalizeComicProgress(manifest, progress)
	if normalized == nil {
		return map[string]any{"err": "comic.progress_invalid", "msg": "漫画阅读进度参数错误"}, nil
	}

	// 客户端回传的 pageId/percent/completed 必须与规范化结果一致，否则视为过期。
	if progress["pageId"] != normalized["pageId"] ||
		!isFiniteNumber(progress["percent"]) ||
		!isBool(progress["completed"]) {
		return map[string]any{"err": "comic.progress_stale", "msg": "漫画页面列表已更新，请刷新阅读器"}, nil
	}

	if err := userdb.UpsertComicProgress(ctx.DB, bookID, ctx.Identity.UserID, normalized); err != nil {
		return nil, err
	}
	return map[string]any{"err": "ok", "msg": "漫画阅读进度已保存", "progress": normalized}, nil
}

// normalizeComicProgress 复刻 ComicProgressHandler.normalized_progress。
//
// 返回 nil 表示进度不合法。
func normalizeComicProgress(manifest *comic.Manifest, progress map[string]any) map[string]any {
	if progress == nil {
		return nil
	}
	if kind, _ := progress["kind"].(string); kind != "comic" {
		return nil
	}
	if v, ok := progress["version"].(float64); !ok || int(v) != comicProgressVersion {
		return nil
	}
	raw, ok := progress["pageIndex"].(float64)
	if !ok || len(manifest.Pages) == 0 {
		return nil
	}
	pageIndex := int(raw)
	if pageIndex < 0 {
		pageIndex = 0
	}
	if pageIndex > len(manifest.Pages)-1 {
		pageIndex = len(manifest.Pages) - 1
	}
	page := manifest.Pages[pageIndex]
	percent := float64(pageIndex+1) * 100 / float64(len(manifest.Pages))
	return map[string]any{
		"kind":      "comic",
		"version":   comicProgressVersion,
		"pageId":    page.PageID,
		"pageIndex": pageIndex,
		"percent":   roundTo2(percent),
		"completed": pageIndex == len(manifest.Pages)-1,
	}
}

// roundTo2 复刻 Python 的 round(x, 2)。
func roundTo2(v float64) float64 {
	return float64(int64(v*100+0.5)) / 100
}

// isFiniteNumber 报告 v 是否为有限数字（排除布尔）。
func isFiniteNumber(v any) bool {
	switch n := v.(type) {
	case float64:
		return !math.IsNaN(n) && !math.IsInf(n, 0)
	case int64:
		return true
	case int:
		return true
	default:
		return false
	}
}

// isBool 报告 v 是否为布尔值。
func isBool(v any) bool {
	_, ok := v.(bool)
	return ok
}

// ComicReaderHandler 实现 /read-comic/([0-9]+)（GET）。
//
// 返回 HTML 阅读器页面；未登录时重定向到 /login。
func ComicReaderHandler(cfg ComicConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		bookID, err := strconv.ParseInt(ctx.Param(0), 10, 64)
		if err != nil {
			http.Error(ctx.Writer, "书籍不存在", http.StatusNotFound)
			return nil, nil
		}
		if ctx.Identity.IsGuest() {
			http.Redirect(ctx.Writer, ctx.Request, "/login", http.StatusFound)
			return nil, nil
		}

		_, _, _, err = authorizedComic(ctx, cfg, bookID, nil)
		if err != nil {
			status := http.StatusUnprocessableEntity
			msg := err.Error()
			if ce, ok := err.(*comic.Error); ok {
				status = ce.Status
				msg = ce.Message
			}
			http.Error(ctx.Writer, msg, status)
			return nil, nil
		}
		if !requireBookCaptcha(ctx, cfg, bookID, "read", true) {
			return nil, nil
		}

		// 阅读器页面由前端静态资源提供；这里返回一个最小引导页，
		// 由前端接管渲染（与 Python 的 html_page 模板等价的最小实现）。
		h := ctx.Writer.Header()
		h.Set("Content-Type", "text/html; charset=UTF-8")
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("Referrer-Policy", "same-origin")
		ctx.Writer.WriteHeader(http.StatusOK)
		_, _ = ctx.Writer.Write([]byte(comicReaderHTML(bookID)))
		return nil, nil
	}
}

// comicReaderHTML 生成漫画阅读器引导页。
//
// 页面只包含挂载点与配置，实际渲染由前端 Nuxt 应用接管。
func comicReaderHTML(bookID int64) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>漫画阅读器</title>
</head>
<body>
<div id="comic-reader" data-book-id="%d" data-reader-version="%s"></div>
</body>
</html>
`, bookID, komgaReaderVersion)
}

// ComicRouteSpecs 返回漫画模块接管的 4 条路由。
func ComicRouteSpecs(cfg ComicConfig, svc *comic.Service) []RouteSpec {
	if svc == nil {
		svc = comic.NewService()
	}
	return []RouteSpec{
		{
			Pattern: rComicReader,
			Methods: []string{http.MethodGet},
			Handler: ComicReaderHandler(cfg),
		},
		{
			Pattern: rComicManifest,
			Methods: []string{http.MethodGet},
			Auth:    true,
			Handler: ComicManifestHandler(cfg, svc),
		},
		{
			Pattern: rComicPage,
			Methods: []string{http.MethodGet},
			Handler: ComicPageHandler(cfg, svc),
		},
		{
			Pattern: rComicProgress,
			Methods: []string{http.MethodGet, http.MethodPost},
			Auth:    true,
			Handler: ComicProgressHandler(cfg, svc),
		},
	}
}

// 与 Python 版逐字一致的路由 pattern。
const (
	rComicReader   = "/read-comic/([0-9]+)"
	rComicManifest = "/api/book/([0-9]+)/comic/pages"
	rComicPage     = "/api/book/([0-9]+)/comic/pages/([0-9]+)"
	rComicProgress = "/api/book/([0-9]+)/comic/progress"
)

// readBodyLimited 读取请求体，超过 limit 时返回错误。
func readBodyLimited(r *http.Request, limit int) ([]byte, error) {
	if r == nil || r.Body == nil {
		return nil, fmt.Errorf("httpapi: 空请求体")
	}
	buf, err := io.ReadAll(io.LimitReader(r.Body, int64(limit)+1))
	if err != nil {
		return nil, err
	}
	if len(buf) > limit {
		return nil, fmt.Errorf("httpapi: 请求体过大")
	}
	return buf, nil
}
