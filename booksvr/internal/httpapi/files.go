package httpapi

import (
	"archive/zip"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/safehttp"
)

// FilesConfig 是文件服务模块的依赖注入点。
type FilesConfig struct {
	// DB 是 Calibre 元数据库。
	DB *sql.DB
	// LibraryRoot 是 Calibre 书库根目录。
	LibraryRoot string
	// HTMLPath 是前端静态资源根目录（对应 Python 的 CONF["html_path"]）。
	HTMLPath string
	// DefaultCover 是默认封面字节（对应 Python 的 self.default_cover）。
	DefaultCover []byte
	// BuildTime 是构建时间戳，用于默认封面的 Last-Modified。
	BuildTime time.Time
	// Thumbnail 生成缩略图；为 nil 时使用内置实现。
	Thumbnail func(data []byte, width, height int) ([]byte, error)
	// MetadataToOPF 把元数据渲染成 OPF；为 nil 时使用内置实现。
	MetadataToOPF func(db *sql.DB, bookID int64) ([]byte, error)
	// AllowsImageProxyHost 判定主机是否在图片代理白名单内。
	AllowsImageProxyHost func(host string) bool
	// FetchImage 抓取远端图片；为 nil 时使用内置实现。
	FetchImage func(ctx context.Context, rawURL string) (int, http.Header, []byte, error)
	// ProgressPath 返回某本书的转换进度文件路径。
	ProgressPath func(bookID int64) string
	// Settings 是配置项，用于进度文件脱敏。
	Settings map[string]any
	// CanViewBook 判定当前请求方能否查看该书。
	CanViewBook func(ctx *Context, bookID int64) bool
	// AllowGuestRead 对应 ALLOW_GUEST_READ。
	AllowGuestRead bool
	// DemoRestricted 判定当前用户是否按访客权限对待。
	DemoRestricted func(ctx *Context) bool
	// RequireCaptcha 校验阅读验证码；返回 false 表示已中断请求。
	RequireCaptcha func(ctx *Context, bookID int64, action string) bool
}

// ---- 路由常量 ----

const (
	rGetImage    = "/get/(.*)/(.*)"
	rGetExtract  = "/get/extract/([0-9]+)/(.*)"
	rReadExtract = "/read/extract/([0-9]+)/(.*)"
	rGetPcover   = "/get/pcover"
	rGetProgress = "/get/progress/([0-9]+)"
	rLogo        = "/logo/(.*)"
	// rStaticThemes 对应 webserver/main.py 注册的主题静态目录。
	rStaticThemes = "/static/themes/(.*)"
)

// idPattern 从形如 "foo_123.epub" 的片段里抽出数字 id。
var idPattern = regexp.MustCompile(`\d+`)

// errZipEntryMissing 表示 EPUB 内不存在目标条目。
var errZipEntryMissing = errors.New("files: zip entry missing")

// ---- ImageHandler ----

// ImageHandler 实现 /get/<fmt>/<id>（封面、缩略图、OPF）。
func ImageHandler(cfg FilesConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		fmtName := ctx.Param(0)
		rawID := ctx.Param(1)

		// 默认封面请求。
		if rawID == "default" || rawID == "0" {
			ctx.Writer.Header().Set("Content-Type", "image/jpeg")
			ctx.Writer.Header().Set("Content-Length", strconv.Itoa(len(cfg.DefaultCover)))
			_, _ = ctx.Writer.Write(cfg.DefaultCover)
			return nil, nil
		}

		data, err := filesGetData(cfg, ctx, fmtName, rawID)
		if err != nil {
			return nil, err
		}
		_, _ = ctx.Writer.Write(data)
		return nil, nil
	}
}

// filesGetData 解析 id 与格式，返回要写出的字节。
func filesGetData(cfg FilesConfig, ctx *Context, fmtName, rawID string) ([]byte, error) {
	id, err := parseBookID(rawID)
	if err != nil {
		return nil, notFound(ctx, err.Error())
	}
	if !filesHasID(cfg.DB, id) {
		return nil, notFound(ctx, fmt.Sprintf("id:%d does not exist in database", id))
	}
	if cfg.CanViewBook != nil && !cfg.CanViewBook(ctx, id) {
		return nil, notFound(ctx, fmt.Sprintf("id:%d does not exist in database", id))
	}

	if fmtName == "thumb" || strings.HasPrefix(fmtName, "thumb_") {
		width, height := 60, 80
		parts := strings.Split(fmtName, "_")
		if len(parts) >= 3 {
			w, errW := strconv.Atoi(parts[1])
			h, errH := strconv.Atoi(parts[2])
			if errW == nil && errH == nil {
				width, height = w, h
			}
		}
		return filesGetCover(cfg, ctx, id, true, width, height)
	}
	if fmtName == "cover" {
		return filesGetCover(cfg, ctx, id, false, 60, 80)
	}
	if fmtName == "opf" {
		return filesGetMetadataAsOPF(cfg, ctx, id)
	}
	return nil, notFound(ctx, "bad url")
}

// parseBookID 复刻 Python 的 id 解析：先试整数，失败则从后缀里抽数字。
func parseBookID(raw string) (int64, error) {
	if id, err := strconv.ParseInt(raw, 10, 64); err == nil {
		return id, nil
	}
	// id.rpartition("_")[-1].partition(".")[0]
	tail := raw
	if idx := strings.LastIndex(raw, "_"); idx >= 0 {
		tail = raw[idx+1:]
	}
	if idx := strings.Index(tail, "."); idx >= 0 {
		tail = tail[:idx]
	}
	match := idPattern.FindString(tail)
	if match == "" {
		return 0, fmt.Errorf("id:%s not an integer", tail)
	}
	id, err := strconv.ParseInt(match, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("id:%s not an integer", tail)
	}
	return id, nil
}

// filesHasID 报告书库里是否存在该书。
func filesHasID(db *sql.DB, id int64) bool {
	if db == nil {
		return false
	}
	var one int
	err := db.QueryRow(`SELECT 1 FROM books WHERE id = ?`, id).Scan(&one)
	return err == nil
}

// filesGetCover 取封面（可选缩略图），并设置 Last-Modified。
func filesGetCover(cfg FilesConfig, ctx *Context, id int64, thumbnail bool, width, height int) ([]byte, error) {
	ctx.Writer.Header().Set("Content-Type", "image/jpeg")

	cover, err := library.Cover(cfg.DB, id, cfg.LibraryRoot)
	if err != nil {
		return nil, notFound(ctx, fmt.Sprintf("Failed to generate cover: %v", err))
	}

	var updated int64
	if cover == nil {
		cover = cfg.DefaultCover
		updated = cfg.BuildTime.Unix()
	} else {
		updated, err = library.CoverLastModified(cfg.DB, id, cfg.LibraryRoot)
		if err != nil {
			return nil, notFound(ctx, fmt.Sprintf("Failed to generate cover: %v", err))
		}
	}
	ctx.Writer.Header().Set("Last-Modified", lastModifiedHeader(updated))

	if !thumbnail {
		return cover, nil
	}
	thumb, err := filesThumbnail(cfg, cover, width, height)
	if err != nil {
		return nil, notFound(ctx, fmt.Sprintf("Failed to generate cover: %v", err))
	}
	return thumb, nil
}

// filesThumbnail 生成缩略图。
func filesThumbnail(cfg FilesConfig, data []byte, width, height int) ([]byte, error) {
	if cfg.Thumbnail != nil {
		return cfg.Thumbnail(data, width, height)
	}
	return DefaultThumbnail(data, width, height)
}

// filesGetMetadataAsOPF 把元数据渲染成 OPF。
func filesGetMetadataAsOPF(cfg FilesConfig, ctx *Context, id int64) ([]byte, error) {
	ctx.Writer.Header().Set("Content-Type", "application/oebps-package+xml; charset=UTF-8")
	if cfg.MetadataToOPF != nil {
		return cfg.MetadataToOPF(cfg.DB, id)
	}
	return DefaultMetadataToOPF(cfg.DB, id)
}

// lastModifiedHeader 把 Unix 秒渲染成 HTTP 日期。
func lastModifiedHeader(unix int64) string {
	return time.Unix(unix, 0).UTC().Format(http.TimeFormat)
}

// ---- ProxyImageHandler ----

// ProxyImageHandler 实现 /get/pcover（白名单图片代理）。
func ProxyImageHandler(cfg FilesConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		rawURL := ctx.Query("url")

		parsed, err := url.Parse(rawURL)
		if err != nil {
			_, _ = ctx.Writer.Write([]byte("yoho"))
			return nil, nil
		}
		if parsed.Scheme != "http" && parsed.Scheme != "https" {
			_, _ = ctx.Writer.Write([]byte("yoho"))
			return nil, nil
		}
		if parsed.User != nil {
			_, _ = ctx.Writer.Write([]byte("yoho"))
			return nil, nil
		}

		host := strings.ToLower(parsed.Hostname())
		if host == "" || cfg.AllowsImageProxyHost == nil || !cfg.AllowsImageProxyHost(host) {
			_, _ = ctx.Writer.Write([]byte("yoho"))
			return nil, nil
		}
		if parsed.Port() != "" && parsed.Port() != "80" && parsed.Port() != "443" {
			_, _ = ctx.Writer.Write([]byte("yoho"))
			return nil, nil
		}

		// 重建安全 URL：丢掉 userinfo 与 fragment。
		safeNetloc := host
		if parsed.Port() != "" {
			safeNetloc = host + ":" + parsed.Port()
		}
		safeURL := (&url.URL{
			Scheme:   parsed.Scheme,
			Host:     safeNetloc,
			Path:     parsed.Path,
			RawQuery: parsed.RawQuery,
		}).String()

		fetch := cfg.FetchImage
		if fetch == nil {
			fetch = DefaultFetchImage
		}
		status, headers, body, err := fetch(ctx.Request.Context(), safeURL)
		if err != nil {
			http.Error(ctx.Writer, err.Error(), http.StatusBadGateway)
			return nil, nil
		}
		if status >= 400 {
			ctx.Writer.WriteHeader(status)
			return nil, nil
		}
		for k, values := range headers {
			for _, v := range values {
				ctx.Writer.Header().Set(k, v)
			}
		}
		_, _ = ctx.Writer.Write(body)
		return nil, nil
	}
}

// DefaultFetchImage 用 safehttp 抓取远端图片，不跟随重定向。
func DefaultFetchImage(ctx context.Context, rawURL string) (int, http.Header, []byte, error) {
	headers := chromeHeaders()
	headers["Referer"] = rawURL

	client := &safehttp.SafeHttpClient{MaxRedirects: 0, MaxBytes: 32 << 20}
	resp, err := client.Get(ctx, rawURL, safehttp.RequestOptions{
		Headers:    headers,
		Timeout:    10 * time.Second,
		HasTimeout: true,
	})
	if err != nil {
		return 0, nil, nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 32<<20))
	if err != nil {
		return 0, nil, nil, err
	}
	return resp.StatusCode, resp.Header, body, nil
}

// chromeHeaders 返回浏览器风格的请求头。
func chromeHeaders() map[string]string {
	return map[string]string{
		"User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		"Accept":          "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
		"Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
	}
}

// ---- ProgressHandler ----

// ProgressHandler 实现 /get/progress/<id>。
func ProgressHandler(cfg FilesConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		raw := ctx.Param(0)
		bookID, err := strconv.ParseInt(raw, 10, 64)
		if err != nil {
			http.Error(ctx.Writer, "nothing", http.StatusNotFound)
			return nil, nil
		}

		path := ""
		if cfg.ProgressPath != nil {
			path = cfg.ProgressPath(bookID)
		}
		if path == "" {
			http.Error(ctx.Writer, "nothing", http.StatusNotFound)
			return nil, nil
		}
		if _, err := os.Stat(path); err != nil {
			http.Error(ctx.Writer, "nothing", http.StatusNotFound)
			return nil, nil
		}
		data, err := os.ReadFile(path)
		if err != nil {
			http.Error(ctx.Writer, "nothing", http.StatusNotFound)
			return nil, nil
		}

		// 抹掉配置里的敏感字符串。
		text := string(data)
		for _, hidden := range cfg.Settings {
			if s, ok := hidden.(string); ok && s != "" {
				text = strings.ReplaceAll(text, s, "XXX")
			}
		}
		_, _ = ctx.Writer.Write([]byte(text))
		return nil, nil
	}
}

// ---- EpubReader ----

// EpubReader 实现 /get/extract/<bid>/<path>（EPUB 内文件抽取）。
func EpubReader(cfg FilesConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		// Authentication redirects must never survive a subsequent login.
		ctx.Writer.Header().Set("Cache-Control", "private, no-store")
		ctx.Writer.Header().Add("Vary", "Cookie")
		rawBID := ctx.Param(0)
		innerPath := ctx.Param(1)

		// 演示模式下，未登录访客与演示账号统一按访客权限处理。
		guestLike := ctx.Identity.IsGuest()
		if !guestLike && cfg.DemoRestricted != nil && cfg.DemoRestricted(ctx) {
			guestLike = true
		}
		if guestLike {
			if !cfg.AllowGuestRead {
				http.Redirect(ctx.Writer, ctx.Request, "/login", http.StatusFound)
				return nil, nil
			}
		} else if ctx.CanRead() {
			if !ctx.IsActive() {
				http.Error(ctx.Writer, "无权在线阅读，请先登录注册邮箱激活账号。", http.StatusForbidden)
				return nil, nil
			}
		} else {
			http.Error(ctx.Writer, "无权在线阅读", http.StatusForbidden)
			return nil, nil
		}

		bookID, err := strconv.ParseInt(rawBID, 10, 64)
		if err != nil {
			http.Error(ctx.Writer, "not found", http.StatusNotFound)
			return nil, nil
		}
		if !filesHasID(cfg.DB, bookID) {
			http.Error(ctx.Writer, "not found", http.StatusNotFound)
			return nil, nil
		}
		if cfg.CanViewBook != nil && !cfg.CanViewBook(ctx, bookID) {
			http.Error(ctx.Writer, "not found", http.StatusNotFound)
			return nil, nil
		}
		if cfg.RequireCaptcha != nil && !cfg.RequireCaptcha(ctx, bookID, "read") {
			return nil, nil
		}

		// Legacy Calibre imports store formats in data.name + books.path;
		// newer imports register absolute paths in book_formats.
		fpath, err := library.FormatAbsPath(cfg.DB, bookID, "EPUB", cfg.LibraryRoot)
		if err != nil || fpath == "" {
			http.Error(ctx.Writer, "not found", http.StatusNotFound)
			return nil, nil
		}
		info, err := os.Stat(fpath)
		if err != nil || info.IsDir() {
			http.Error(ctx.Writer, "not found", http.StatusNotFound)
			return nil, nil
		}

		data, err := extractZipEntry(fpath, innerPath)
		if err != nil {
			http.Error(ctx.Writer, "not found", http.StatusNotFound)
			return nil, nil
		}
		if contentType := mime.TypeByExtension(filepath.Ext(innerPath)); contentType != "" {
			ctx.Writer.Header().Set("Content-Type", contentType)
		}
		_, _ = ctx.Writer.Write(data)
		return nil, nil
	}
}

// extractZipEntry 从 zip 容器里读出指定条目。
func extractZipEntry(archivePath, entry string) ([]byte, error) {
	zr, err := zip.OpenReader(archivePath)
	if err != nil {
		return nil, err
	}
	defer func() { _ = zr.Close() }()

	for _, f := range zr.File {
		if f.Name != entry {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			return nil, err
		}
		defer func() { _ = rc.Close() }()
		return io.ReadAll(io.LimitReader(rc, 64<<20))
	}
	return nil, errZipEntryMissing
}

// ---- 路由表 ----

// FilesRouteSpecs 返回文件服务模块接管的 5 条路由。
//
// 说明：Python 的 files.py 还注册了 `/(.*)` 静态兜底路由，
// 该路由由前端静态服务承担，不在本模块范围内。
func FilesRouteSpecs(cfg FilesConfig) []RouteSpec {
	methods := []string{http.MethodGet, http.MethodPost}
	// 顺序必须与 Python 的 files.py:188-191 一致：具体路由排在通配的
	// rGetImage（/get/(.*)/(.*)）之前。NewServer 按注册顺序取首个匹配，
	// 反序会让 /get/extract/5/、/get/pcover、/get/progress/1 全被
	// ImageHandler 抢走，阅读器拉取 EPUB 内文件时 404，
	// 表现为「电子书加载超时」。
	return []RouteSpec{
		{Pattern: rGetPcover, Methods: methods, Handler: ProxyImageHandler(cfg)},
		{Pattern: rGetProgress, Methods: methods, Handler: ProgressHandler(cfg)},
		{Pattern: rGetExtract, Methods: methods, Handler: EpubReader(cfg)},
		{Pattern: rReadExtract, Methods: methods, Handler: EpubReader(cfg)},
		{Pattern: rGetImage, Methods: methods, Handler: ImageHandler(cfg)},
		{Pattern: rLogo, Methods: methods, Handler: LogoHandler(cfg)},
		{Pattern: rStaticThemes, Methods: methods, Handler: StaticThemesHandler(cfg)},
	}
}

// StaticThemesHandler 服务 /static/themes/<path>，根目录为 <html_path>/static/themes。
func StaticThemesHandler(cfg FilesConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		rel := ctx.Param(0)
		root := filepath.Join(cfg.HTMLPath, "static", "themes")
		return nil, serveStaticFile(ctx, root, rel)
	}
}

// LogoHandler 服务 /logo/<path>，根目录固定为 <html_path>/logo。
func LogoHandler(cfg FilesConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		rel := ctx.Param(0)
		root := filepath.Join(cfg.HTMLPath, "logo")
		return nil, serveStaticFile(ctx, root, rel)
	}
}

// serveStaticFile 在 root 下安全地服务 rel，拒绝越界路径。
func serveStaticFile(ctx *Context, root, rel string) error {
	clean := filepath.Clean("/" + strings.ReplaceAll(rel, "\\", "/"))
	full := filepath.Join(root, clean)
	// 二次确认没有逃出 root。
	rootClean := filepath.Clean(root)
	if full != rootClean && !strings.HasPrefix(full, rootClean+string(os.PathSeparator)) {
		http.Error(ctx.Writer, "not found", http.StatusNotFound)
		return nil
	}
	info, err := os.Stat(full)
	if err != nil || info.IsDir() {
		http.Error(ctx.Writer, "not found", http.StatusNotFound)
		return nil
	}
	data, err := os.ReadFile(full)
	if err != nil {
		http.Error(ctx.Writer, "not found", http.StatusNotFound)
		return nil
	}
	ctx.Writer.Header().Set("Content-Type", contentTypeByExt(full))
	_, _ = ctx.Writer.Write(data)
	return nil
}

// notFound 写出 404 响应并返回 nil，供直接写响应的 handler 使用。
func notFound(ctx *Context, reason string) error {
	http.Error(ctx.Writer, reason, http.StatusNotFound)
	return nil
}

// contentTypeByExt 按扩展名给出 Content-Type。
func contentTypeByExt(path string) string {
	switch strings.ToLower(filepath.Ext(path)) {
	case ".png":
		return "image/png"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".gif":
		return "image/gif"
	case ".svg":
		return "image/svg+xml"
	case ".webp":
		return "image/webp"
	case ".ico":
		return "image/x-icon"
	case ".css":
		return "text/css; charset=utf-8"
	case ".js":
		return "application/javascript; charset=utf-8"
	case ".json":
		return "application/json; charset=utf-8"
	case ".html", ".htm":
		return "text/html; charset=utf-8"
	default:
		return "application/octet-stream"
	}
}
