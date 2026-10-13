// 本文件实现 webserver/handlers/network_comic.py 的 3 条路由。
//
// 在线漫画：章节页面清单（签名图片地址）、同源图片传输、漫画阅读器页面。
//
// 图片地址用 Tornado 的 create_signed_value 签名，token 里带 user_id /
// source_id / image，因此图片接口无需再查库即可校验归属；签名算法与
// Python 逐字节一致（见 internal/tornadosign）。
package httpapi

import (
	"context"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"talebook/booksvr/internal/booksource"
	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginruntime"
	"talebook/booksvr/internal/safehttp"
	"talebook/booksvr/internal/sourcecatalog"
	"talebook/booksvr/internal/tornadosign"
)

// OnlineComicTokenName 是漫画图片签名 token 的名字。
//
// 对应 network_comic.TOKEN_NAME；改名会让已发出的图片地址全部失效。
const OnlineComicTokenName = "online-comic-image-v1"

// OnlineComicTokenMaxAgeDays 是图片 token 的有效期（15 分钟）。
//
// Python 写的是 `max_age_days=15 / 1440`，即 15 分钟。
const OnlineComicTokenMaxAgeDays = 15.0 / 1440.0

// OnlineComicImageMaxBytes 是单张漫画图片的体积上限（20 MiB）。
const OnlineComicImageMaxBytes = 20 * 1024 * 1024

// OnlineComicImageTimeout 是单张漫画图片的请求超时。
const OnlineComicImageTimeout = 20 * time.Second

// onlineComicImageMIMEs 是允许回传的图片类型。
//
// 与 Python 的集合一致；不在集合内一律视为抓取失败，避免把 HTML
// 错误页当作图片回传给浏览器。
var onlineComicImageMIMEs = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
	"image/gif":  true,
	"image/avif": true,
}

// OnlineComicConfig 是在线漫画 handler 的依赖。
type OnlineComicConfig struct {
	// Settings 是 Talebook 配置（CONF）。
	Settings map[string]any
	// Catalog 构造目录服务；为 nil 时用默认实现。
	Catalog func(ctx *Context) (*sourcecatalog.Service, error)
	// FetchImage 抓取图片字节；为 nil 时用默认实现。
	//
	// 注入点用于测试，避免真实出网。
	FetchImage func(ctx context.Context, image map[string]any) (string, []byte, error)
	// Now 用于注入时钟；为 nil 时用 time.Now。
	Now func() int64
}

// onlineComicCatalog 构造目录服务。
func (cfg OnlineComicConfig) onlineComicCatalog(ctx *Context) (*sourcecatalog.Service, error) {
	if cfg.Catalog != nil {
		return cfg.Catalog(ctx)
	}
	rt := pluginruntime.NewRuntime(ctx.DB, cfg.Settings, nil)
	return sourcecatalog.NewService(ctx.DB, cfg.Settings, ctx.Identity.UserID, rt)
}

// now 返回当前 Unix 时间戳。
func (cfg OnlineComicConfig) now() int64 {
	if cfg.Now != nil {
		return cfg.Now()
	}
	return time.Now().Unix()
}

// cookieSecret 取签名密钥。
func (cfg OnlineComicConfig) cookieSecret() string {
	if v, ok := cfg.Settings["cookie_secret"]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

// getSource 按 source_id 取绑定；不存在返回 nil（不报错）。
func (cfg OnlineComicConfig) getSource(ctx *Context, sourceID string) (*sourcecatalog.SourceBinding, error) {
	catalog, err := cfg.onlineComicCatalog(ctx)
	if err != nil {
		return nil, err
	}
	binding, err := catalog.Get(sourceID)
	if err != nil {
		// Python 捕获 PluginRuntimeError 后返回 None。
		if pluginruntime.ErrorCodeOf(err) == "source.not_found" {
			return nil, nil
		}
		return nil, err
	}
	return binding, nil
}

// publicImage 复刻 network_comic.public_image。
//
// 先校验图片地址在已验证的源兼容范围内（image_endpoint），再签一个
// 带 user_id / source_id / image 的 token，拼成同源图片地址。
func (cfg OnlineComicConfig) publicImage(ctx *Context, sourceKey string, image map[string]any) (string, error) {
	rawURL := asStringAny(image["url"])
	if _, err := booksource.ImageEndpoint(rawURL); err != nil {
		return "", err
	}
	payload, err := json.Marshal(map[string]any{
		"user_id":   ctx.Identity.UserID,
		"source_id": sourceKey,
		"image":     image,
	})
	if err != nil {
		return "", err
	}
	token := tornadosign.Sign(cfg.cookieSecret(), OnlineComicTokenName, string(payload), cfg.now())
	return "/api/book-sources/comic/image?token=" + url.QueryEscape(token), nil
}

// OnlineComicBook 复刻 network_comic.comic_book。
//
// 漫画条目且可在线阅读时，把 cover_url 改写为签名图片地址。
// 该函数同时被 network_library 的 publicBook 钩子复用。
func (cfg OnlineComicConfig) OnlineComicBook(ctx *Context, item map[string]any, sourceKey string) map[string]any {
	if asStringAny(item["media_type"]) != "comic" {
		return item
	}
	if !onlineComicTruthy(item["online_readable"]) {
		return item
	}
	cover := asStringAny(item["cover_url"])
	if cover == "" {
		return item
	}
	signed, err := cfg.publicImage(ctx, sourceKey, map[string]any{"url": cover})
	if err != nil {
		// Python 在此处不捕获异常：地址非法会直接冒泡成 500。
		// Go 侧保持「不改写」的降级，避免整页详情因一张封面失败。
		return item
	}
	item["cover_url"] = signed
	return item
}

// OnlineComicCoverRewriter 返回可注入 network_library.publicBook 的钩子。
//
// 钩子签名不带 Context，而签名 token 需要 user_id，因此这里从请求上下文
// 取当前 Context；取不到时原样返回（与未注入钩子行为一致）。
func OnlineComicCoverRewriter(cfg OnlineComicConfig) func(ctx *Context, book map[string]any, sourceKey string) map[string]any {
	return func(ctx *Context, book map[string]any, sourceKey string) map[string]any {
		if ctx == nil {
			return book
		}
		return cfg.OnlineComicBook(ctx, book, sourceKey)
	}
}

// ---- 各 handler ----

// OnlineComicPagesHandler 对应 OnlineComicPages（@js @auth）。
func OnlineComicPagesHandler(cfg OnlineComicConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if !ctx.IsActive() {
			return map[string]any{"err": "user.activation_required", "msg": "账号尚未激活，无法在线阅读"}, nil
		}
		if !ctx.CanRead() {
			return map[string]any{"err": ErrNotPermit, "msg": "无阅读权限"}, nil
		}
		source, err := cfg.getSource(ctx, ctx.Query("source_id"))
		if err != nil {
			return nil, err
		}
		if source == nil || source.PluginKey != booksource.VeneraPluginID {
			return map[string]any{"err": "venera.unsupported", "msg": "漫画源不存在、未启用或不兼容"}, nil
		}
		chapter := ctx.Query("chapter_url")
		if chapter == "" {
			return map[string]any{"err": ErrParamsError, "msg": "缺少漫画章节标识"}, nil
		}
		catalog, err := cfg.onlineComicCatalog(ctx)
		if err != nil {
			return nil, err
		}
		result, err := catalog.Read(source, "get_chapter",
			[]any{plugindomain.SourceChapter{ExternalID: chapter, Title: ""}}, nil, nil)
		if err != nil {
			return map[string]any{"err": errorCodeOr(err, ErrSourceFetch), "msg": err.Error()}, nil
		}
		content, ok := result.(*plugindomain.SourceContent)
		if !ok {
			return nil, pluginruntime.NewPluginRuntimeError("plugin.provider_contract",
				"Provider returned an invalid result", false)
		}
		images := onlineComicAnyList(content.Extra["images"])
		pages := make([]map[string]any, 0, len(images))
		for index, image := range images {
			dict, ok := image.(map[string]any)
			if !ok {
				continue
			}
			signed, err := cfg.publicImage(ctx, source.Key, dict)
			if err != nil {
				return map[string]any{"err": errorCodeOr(err, ErrSourceFetch), "msg": err.Error()}, nil
			}
			pages = append(pages, map[string]any{"id": fmt.Sprintf("%d", index), "url": signed})
		}
		return map[string]any{"err": "ok", "pages": pages}, nil
	}
}

// OnlineComicImageHandler 对应 OnlineComicImage（裸 get，非 @js）。
//
// 校验顺序与 Python 一致：登录 → 可读 → 激活 → 解 token → 归属与源校验
// → scope 校验；任一步失败按 401/403 结束，不返回 JSON 信封。
func OnlineComicImageHandler(cfg OnlineComicConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if ctx.Identity.IsGuest() || !ctx.CanRead() {
			http.Error(ctx.Writer, "Unauthorized", http.StatusUnauthorized)
			return nil, nil
		}
		if !ctx.IsActive() {
			http.Error(ctx.Writer, "Forbidden", http.StatusForbidden)
			return nil, nil
		}

		raw := tornadosign.Decode(cfg.cookieSecret(), OnlineComicTokenName,
			[]byte(ctx.Query("token")), OnlineComicTokenMaxAgeDays, cfg.now)
		image, source, ok := cfg.decodeImageToken(ctx, raw)
		if !ok {
			http.Error(ctx.Writer, "Forbidden", http.StatusForbidden)
			return nil, nil
		}

		mime, content, err := cfg.fetchImage(ctx, image)
		if err != nil {
			// Python 在此处把任何异常都折叠成 502 + 中文提示。
			h := ctx.Writer.Header()
			h.Set("Cache-Control", "no-store")
			ctx.Writer.WriteHeader(http.StatusBadGateway)
			_, _ = ctx.Writer.Write([]byte("漫画图片获取失败，请重新打开章节或检查源连接"))
			return nil, nil
		}
		_ = source

		h := ctx.Writer.Header()
		h.Set("Content-Type", mime)
		h.Set("Cache-Control", "private, no-store")
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("Content-Security-Policy", "default-src 'none'; sandbox")
		ctx.Writer.WriteHeader(http.StatusOK)
		_, _ = ctx.Writer.Write(content)
		return nil, nil
	}
}

// decodeImageToken 解出 token 里的 image 与 source，并完成归属与 scope 校验。
//
// 任何一步不满足都返回 ok=false，由调用方统一转成 403。
func (cfg OnlineComicConfig) decodeImageToken(ctx *Context, raw []byte) (map[string]any, *sourcecatalog.SourceBinding, bool) {
	if len(raw) == 0 {
		return nil, nil, false
	}
	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		return nil, nil, false
	}
	if int64(onlineComicAsFloat(payload["user_id"])) != ctx.Identity.UserID {
		return nil, nil, false
	}
	sourceID := asStringAny(payload["source_id"])
	source, err := cfg.getSource(ctx, sourceID)
	if err != nil || source == nil || source.PluginKey != booksource.VeneraPluginID {
		return nil, nil, false
	}
	image, ok := payload["image"].(map[string]any)
	if !ok {
		return nil, nil, false
	}
	if _, err := booksource.ImageEndpoint(asStringAny(image["url"])); err != nil {
		return nil, nil, false
	}
	// Python 用 catalog.runtime.require_scopes(connection, "books.read", "network.read")。
	rt := pluginruntime.NewRuntime(ctx.DB, cfg.Settings, nil)
	conn, err := rt.ConnectionByID(source.Connection.ID)
	if err != nil || conn == nil {
		return nil, nil, false
	}
	if err := pluginruntime.RequireScopes(conn, "books.read", "network.read"); err != nil {
		return nil, nil, false
	}
	return image, source, true
}

// fetchImage 复刻 network_comic.fetch_image。
//
// 依次尝试 url 与 fallback；只有 MIME 在允许集合内才算成功。
func (cfg OnlineComicConfig) fetchImage(ctx *Context, image map[string]any) (string, []byte, error) {
	if cfg.FetchImage != nil {
		return cfg.FetchImage(ctx.Request.Context(), image)
	}
	candidates := []string{asStringAny(image["url"])}
	if fallback := asStringAny(image["fallback"]); fallback != "" {
		candidates = append(candidates, fallback)
	}

	client := &safehttp.SafeHttpClient{
		MaxBytes:     OnlineComicImageMaxBytes,
		MaxRedirects: 0,
		PluginKey:    booksource.VeneraPluginID,
	}
	var lastErr error
	for index, candidate := range candidates {
		endpoint, err := booksource.ImageEndpoint(candidate)
		if err != nil {
			lastErr = err
			if index == len(candidates)-1 {
				return "", nil, lastErr
			}
			continue
		}
		response, err := client.Request(ctx.Request.Context(), http.MethodGet, endpoint,
			safehttp.RequestOptions{
				Headers: map[string]string{
					"Referer": "https://mangadex.org/",
					"Origin":  "https://mangadex.org",
				},
				Timeout:    OnlineComicImageTimeout,
				HasTimeout: true,
			})
		if err != nil {
			lastErr = err
			if index == len(candidates)-1 {
				return "", nil, lastErr
			}
			continue
		}
		mime, body, err := readImageResponse(response)
		if err != nil {
			lastErr = err
			if index == len(candidates)-1 {
				return "", nil, lastErr
			}
			continue
		}
		return mime, body, nil
	}
	if lastErr == nil {
		lastErr = fmt.Errorf("漫画图片获取失败")
	}
	return "", nil, lastErr
}

// readImageResponse 读取响应体并校验 MIME。
func readImageResponse(response *http.Response) (string, []byte, error) {
	defer response.Body.Close()
	mime := strings.ToLower(strings.TrimSpace(
		strings.SplitN(response.Header.Get("Content-Type"), ";", 2)[0]))
	if !onlineComicImageMIMEs[mime] {
		return "", nil, fmt.Errorf("Unsupported image response")
	}
	body, err := io.ReadAll(io.LimitReader(response.Body, OnlineComicImageMaxBytes+1))
	if err != nil {
		return "", nil, err
	}
	if int64(len(body)) > OnlineComicImageMaxBytes {
		return "", nil, fmt.Errorf("Unsupported image response")
	}
	return mime, body, nil
}

// onlineComicTruthy 复刻 Python 的真值判断。
func onlineComicTruthy(v any) bool {
	switch t := v.(type) {
	case nil:
		return false
	case bool:
		return t
	case string:
		return t != ""
	case float64:
		return t != 0
	case int:
		return t != 0
	case int64:
		return t != 0
	case []any:
		return len(t) > 0
	case map[string]any:
		return len(t) > 0
	}
	return true
}

// onlineComicAnyList 把任意值规整为 []any（nil → 空切片）。
func onlineComicAnyList(v any) []any {
	if list, ok := v.([]any); ok {
		return list
	}
	return []any{}
}

// onlineComicAsFloat 把任意值转成 float64；不可转换时返回 0。
func onlineComicAsFloat(v any) float64 {
	switch n := v.(type) {
	case float64:
		return n
	case float32:
		return float64(n)
	case int:
		return float64(n)
	case int64:
		return float64(n)
	case json.Number:
		f, _ := n.Float64()
		return f
	}
	return 0
}

// OnlineComicReaderHandler 对应 OnlineComicReader（裸 get，非 @js）。
func OnlineComicReaderHandler(cfg OnlineComicConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if ctx.Identity.IsGuest() {
			http.Redirect(ctx.Writer, ctx.Request, "/login", http.StatusFound)
			return nil, nil
		}
		if !ctx.IsActive() || !ctx.CanRead() {
			http.Error(ctx.Writer, "Forbidden", http.StatusForbidden)
			return nil, nil
		}
		source, err := cfg.getSource(ctx, ctx.Query("source_id"))
		if err != nil {
			return nil, err
		}
		if source == nil || source.PluginKey != booksource.VeneraPluginID {
			http.Error(ctx.Writer, "Not Found", http.StatusNotFound)
			return nil, nil
		}

		h := ctx.Writer.Header()
		h.Set("Content-Type", "text/html; charset=UTF-8")
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("Referrer-Policy", "same-origin")
		// html_page 默认带缓存头，认证阅读器必须覆盖为 no-store。
		h.Set("Cache-Control", "no-store")
		ctx.Writer.WriteHeader(http.StatusOK)
		_, _ = ctx.Writer.Write([]byte(onlineComicReaderHTML(source.Key)))
		return nil, nil
	}
}

// onlineComicReaderHTML 生成在线漫画阅读器引导页。
//
// 与 comic.go 的 comicReaderHTML 同构：只提供挂载点与配置，
// 实际渲染由前端 Nuxt 应用接管。
func onlineComicReaderHTML(sourceKey string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>在线漫画</title>
</head>
<body>
<div id="online-comic-reader" data-source-key="%s" data-reader-version="%s"></div>
</body>
</html>
`, html.EscapeString(sourceKey), komgaReaderVersion)
}

// OnlineComicRouteSpecs 返回在线漫画模块接管的 3 条路由。
func OnlineComicRouteSpecs(cfg OnlineComicConfig) []RouteSpec {
	return []RouteSpec{
		{Pattern: "/api/book-sources/comic/pages", Methods: []string{http.MethodGet, http.MethodPost}, Auth: true, Handler: OnlineComicPagesHandler(cfg)},
		{Pattern: "/api/book-sources/comic/image", Methods: []string{http.MethodGet, http.MethodPost}, Auth: true, Handler: OnlineComicImageHandler(cfg)},
		{Pattern: "/read-online-comic", Methods: []string{http.MethodGet, http.MethodPost}, Auth: true, Handler: OnlineComicReaderHandler(cfg)},
	}
}
