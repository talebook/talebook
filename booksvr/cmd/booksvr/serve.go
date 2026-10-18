package main

import (
	"context"
	"database/sql"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"

	"talebook/booksvr/internal/captcha"
	"talebook/booksvr/internal/httpapi"
	"talebook/booksvr/internal/importdir"
)

// serveOptions 是 `booksvr serve` 的解析结果。
type serveOptions struct {
	// DBPath 是 Calibre 书库 SQLite 文件路径（metadata.db）。
	DBPath string
	// UserDBPath 是 Talebook 自有库路径（calibre-webserver.db）。
	UserDBPath string
	// Addr 是监听地址。
	Addr string
	// TornadoURL 是未实现路由的兜底代理目标。
	TornadoURL string
	// ServeRoutes 是走 booksvr 本地的路由 pattern 白名单。
	ServeRoutes []string
	// ServeAll 为 true 时表示白名单为 all。
	ServeAll bool
	// CookieSecret 用于解析 Tornado secure cookie。
	CookieSecret string
	// DemoMode 开启演示模式（只读）。
	DemoMode bool
	// DemoUsername 是演示模式允许登录的账号。
	DemoUsername string
	// InviteCode 是访问码；为空表示无需访问码。
	InviteCode string
	// InviteMsg 是访问码提示文案。
	InviteMsg string
	// SettingsFile 是 Talebook 配置文件路径，用于主题等配置读写。
	SettingsFile string
	// CaptchaProvider 是 CAPTCHA_PROVIDER；为空表示不启用人机验证。
	CaptchaProvider string
	// CaptchaScenes 是各场景开关，键为大写场景名。
	CaptchaScenes map[string]bool
	// Turnstile / Geetest 凭据。
	TurnstileSiteKey   string
	TurnstileSecretKey string
	GeetestCaptchaID   string
	GeetestCaptchaKey  string
	// ScanUploadPath 是导入目录（CONF 的 scan_upload_path）。
	ScanUploadPath string
	// ImportAllowedRoots 是允许的导入根目录（CONF 的 import_allowed_roots）。
	ImportAllowedRoots []string
	// ImportMode 是已保存的导入模式（CONF 的 import_mode）。
	ImportMode string
	// ImportAutoWatchEnabled 对应 CONF 的 import_auto_watch_enabled。
	ImportAutoWatchEnabled bool
	// ImportScanBatchSize 对应 CONF 的 import_scan_batch_size。
	ImportScanBatchSize int
	// LibraryRoot 是书库根目录（对应 CONF 的 library_path）。
	LibraryRoot string
	// BookStorageRoot 是复制/移动导入的文件存储根目录。
	BookStorageRoot string
	// HTMLPath 是前端静态资源根目录（对应 CONF 的 html_path）。
	HTMLPath string
	// CDNURL 是资源前缀（对应 CONF 的 cdn_url）。
	CDNURL string
	// APIURL 是接口前缀（对应 CONF 的 api_url）。
	APIURL string
	// BasePath 是部署前缀（对应 CONF 的 TALEBOOK_BASE_PATH）。
	BasePath string
	// AudiobookRoot 是有声书存储根目录。
	AudiobookRoot string
	// Version 是站点版本号；为空时从 candle-reader-version.txt 读取。
	Version string
	// BookSourceSeedFile 是内置种子书源文件路径；为空时自动探测。
	BookSourceSeedFile string
}

// newServeFlagSet 构造 serve 子命令的 flag 集合。
//
// 参数统一使用单横线（Go flag 包约定）。
func newServeFlagSet(out io.Writer) *flag.FlagSet {
	fs := flag.NewFlagSet("serve", flag.ContinueOnError)
	fs.SetOutput(out)
	fs.String("db", "", "Calibre 书库 SQLite 文件路径（必填，可用 BOOKSVR_DB）")
	fs.String("user-db", "", "Talebook 自有库路径（默认同 -db，可用 BOOKSVR_USER_DB）")
	fs.String("addr", "", "监听地址（默认 127.0.0.1:8000，可用 BOOKSVR_ADDR）")
	fs.String("tornado-url", "", "未实现路由的兜底代理目标（默认 http://127.0.0.1:8001，可用 BOOKSVR_TORNADO_URL）")
	fs.String("serve-routes", "", "走 booksvr 本地的路由 pattern 白名单，逗号分隔；all 表示全部（默认空=全部走代理，可用 BOOKSVR_SERVE_ROUTES）")
	fs.String("cookie-secret", "", "解析 Tornado secure cookie 的密钥（必填，可用 BOOKSVR_COOKIE_SECRET）")
	fs.Bool("demo-mode", false, "开启演示模式（只读，可用 BOOKSVR_DEMO_MODE）")
	fs.String("demo-username", "", "演示模式允许登录的账号（可用 BOOKSVR_DEMO_USERNAME）")
	fs.String("invite-code", "", "访问码；为空表示无需访问码（可用 BOOKSVR_INVITE_CODE）")
	fs.String("invite-message", "", "访问码提示文案（可用 BOOKSVR_INVITE_MESSAGE）")
	fs.String("settings-file", "", "Talebook 配置文件路径（如 conf/auto.py），用于主题等配置读写（可用 BOOKSVR_SETTINGS_FILE）")
	fs.String("captcha-provider", "", "人机验证提供商：image / geetest / turnstile；为空表示不启用（可用 BOOKSVR_CAPTCHA_PROVIDER）")
	fs.String("captcha-scenes", "", "启用验证的场景，逗号分隔（register,login,welcome,reset,download,read；可用 BOOKSVR_CAPTCHA_SCENES）")
	fs.String("turnstile-site-key", "", "Cloudflare Turnstile Site Key（可用 BOOKSVR_TURNSTILE_SITE_KEY）")
	fs.String("turnstile-secret-key", "", "Cloudflare Turnstile Secret Key（可用 BOOKSVR_TURNSTILE_SECRET_KEY）")
	fs.String("geetest-captcha-id", "", "极验 Captcha ID（可用 BOOKSVR_GEETEST_CAPTCHA_ID）")
	fs.String("geetest-captcha-key", "", "极验 Captcha Key（可用 BOOKSVR_GEETEST_CAPTCHA_KEY）")
	fs.String("scan-upload-path", "", "导入目录（可用 BOOKSVR_SCAN_UPLOAD_PATH）")
	fs.String("import-allowed-roots", "", "允许的导入根目录，逗号分隔（可用 BOOKSVR_IMPORT_ALLOWED_ROOTS）")
	fs.String("import-mode", "", "导入模式：index / copy / move（可用 BOOKSVR_IMPORT_MODE）")
	fs.Bool("import-auto-watch-enabled", false, "开启导入目录自动监控（可用 BOOKSVR_IMPORT_AUTO_WATCH_ENABLED）")
	fs.Int("import-scan-batch-size", 0, "每批扫描的文件数上限（可用 BOOKSVR_IMPORT_SCAN_BATCH_SIZE）")
	fs.String("library-root", "", "书库根目录（可用 BOOKSVR_LIBRARY_ROOT）")
	fs.String("book-storage-root", "", "复制/移动导入的书籍文件存储根目录（可用 BOOKSVR_BOOK_STORAGE_ROOT）")
	fs.String("html-path", "", "前端静态资源根目录（可用 BOOKSVR_HTML_PATH）")
	fs.String("cdn-url", "", "资源前缀（可用 BOOKSVR_CDN_URL）")
	fs.String("api-url", "", "接口前缀（可用 BOOKSVR_API_URL）")
	fs.String("base-path", "", "部署前缀，如 /tb（可用 BOOKSVR_BASE_PATH）")
	fs.String("audiobook-root", "", "有声书存储根目录（可用 BOOKSVR_AUDIOBOOK_ROOT）")
	fs.String("version", "", "站点版本号；为空时从 candle-reader-version.txt 读取（可用 BOOKSVR_VERSION）")
	fs.String("booksource-seed-file", "", "内置种子书源文件路径；为空时自动探测（可用 BOOKSVR_BOOKSOURCE_SEED_FILE）")
	fs.Usage = func() {
		fmt.Fprint(out, "用法: booksvr serve [选项]\n\n")
		fmt.Fprint(out, "启动 Talebook 的 HTTP 后端：已实现路由由 booksvr 本地服务，\n")
		fmt.Fprint(out, "其余路由反向代理到 Tornado 兜底。\n\n")
		fmt.Fprint(out, "注意：白名单中的 pattern 若对应路由尚无 Go handler，仍会走代理。\n\n")
		fmt.Fprint(out, "选项:\n")
		fs.PrintDefaults()
	}
	return fs
}

// parseServeOptions 解析并校验 serve 参数。
//
// 命令行优先，其次环境变量，最后默认值。
func parseServeOptions(args []string) (*serveOptions, error) {
	fs := newServeFlagSet(io.Discard)
	if err := fs.Parse(args); err != nil {
		return nil, err
	}

	opts := &serveOptions{
		DBPath:       pick(fs.Lookup("db").Value.String(), os.Getenv("BOOKSVR_DB")),
		UserDBPath:   pick(fs.Lookup("user-db").Value.String(), os.Getenv("BOOKSVR_USER_DB")),
		Addr:         pick(fs.Lookup("addr").Value.String(), os.Getenv("BOOKSVR_ADDR")),
		TornadoURL:   pick(fs.Lookup("tornado-url").Value.String(), os.Getenv("BOOKSVR_TORNADO_URL")),
		CookieSecret: pick(fs.Lookup("cookie-secret").Value.String(), os.Getenv("BOOKSVR_COOKIE_SECRET")),
		DemoMode:     fs.Lookup("demo-mode").Value.String() == "true" || os.Getenv("BOOKSVR_DEMO_MODE") == "true",
		DemoUsername: pick(fs.Lookup("demo-username").Value.String(), os.Getenv("BOOKSVR_DEMO_USERNAME")),
		InviteCode:   pick(fs.Lookup("invite-code").Value.String(), os.Getenv("BOOKSVR_INVITE_CODE")),
		InviteMsg:    pick(fs.Lookup("invite-message").Value.String(), os.Getenv("BOOKSVR_INVITE_MESSAGE")),
		SettingsFile: pick(fs.Lookup("settings-file").Value.String(), os.Getenv("BOOKSVR_SETTINGS_FILE")),

		CaptchaProvider:    pick(fs.Lookup("captcha-provider").Value.String(), os.Getenv("BOOKSVR_CAPTCHA_PROVIDER")),
		TurnstileSiteKey:   pick(fs.Lookup("turnstile-site-key").Value.String(), os.Getenv("BOOKSVR_TURNSTILE_SITE_KEY")),
		TurnstileSecretKey: pick(fs.Lookup("turnstile-secret-key").Value.String(), os.Getenv("BOOKSVR_TURNSTILE_SECRET_KEY")),
		GeetestCaptchaID:   pick(fs.Lookup("geetest-captcha-id").Value.String(), os.Getenv("BOOKSVR_GEETEST_CAPTCHA_ID")),
		GeetestCaptchaKey:  pick(fs.Lookup("geetest-captcha-key").Value.String(), os.Getenv("BOOKSVR_GEETEST_CAPTCHA_KEY")),

		ScanUploadPath:         pick(fs.Lookup("scan-upload-path").Value.String(), os.Getenv("BOOKSVR_SCAN_UPLOAD_PATH")),
		ImportMode:             pick(fs.Lookup("import-mode").Value.String(), os.Getenv("BOOKSVR_IMPORT_MODE")),
		ImportAutoWatchEnabled: fs.Lookup("import-auto-watch-enabled").Value.String() == "true" || os.Getenv("BOOKSVR_IMPORT_AUTO_WATCH_ENABLED") == "true",

		LibraryRoot:     pick(fs.Lookup("library-root").Value.String(), os.Getenv("BOOKSVR_LIBRARY_ROOT")),
		BookStorageRoot: pick(fs.Lookup("book-storage-root").Value.String(), os.Getenv("BOOKSVR_BOOK_STORAGE_ROOT")),
		HTMLPath:        pick(fs.Lookup("html-path").Value.String(), os.Getenv("BOOKSVR_HTML_PATH")),
		CDNURL:          pick(fs.Lookup("cdn-url").Value.String(), os.Getenv("BOOKSVR_CDN_URL")),
		APIURL:          pick(fs.Lookup("api-url").Value.String(), os.Getenv("BOOKSVR_API_URL")),
		BasePath:        pick(fs.Lookup("base-path").Value.String(), os.Getenv("BOOKSVR_BASE_PATH")),
		AudiobookRoot:   pick(fs.Lookup("audiobook-root").Value.String(), os.Getenv("BOOKSVR_AUDIOBOOK_ROOT")),
		Version:         pick(fs.Lookup("version").Value.String(), os.Getenv("BOOKSVR_VERSION")),
		BookSourceSeedFile: pick(fs.Lookup("booksource-seed-file").Value.String(),
			os.Getenv("BOOKSVR_BOOKSOURCE_SEED_FILE")),
	}

	// 允许的导入根目录：逗号分隔。
	for _, root := range strings.Split(pick(fs.Lookup("import-allowed-roots").Value.String(), os.Getenv("BOOKSVR_IMPORT_ALLOWED_ROOTS")), ",") {
		if root = strings.TrimSpace(root); root != "" {
			opts.ImportAllowedRoots = append(opts.ImportAllowedRoots, root)
		}
	}
	// 扫描批次大小：非正数时用默认值。
	if raw := pick(fs.Lookup("import-scan-batch-size").Value.String(), os.Getenv("BOOKSVR_IMPORT_SCAN_BATCH_SIZE")); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			opts.ImportScanBatchSize = n
		}
	}

	// 场景开关：逗号分隔的场景名，统一大写。
	opts.CaptchaScenes = map[string]bool{}
	rawScenes := pick(fs.Lookup("captcha-scenes").Value.String(), os.Getenv("BOOKSVR_CAPTCHA_SCENES"))
	for _, scene := range strings.Split(rawScenes, ",") {
		scene = strings.ToUpper(strings.TrimSpace(scene))
		if scene != "" {
			opts.CaptchaScenes[scene] = true
		}
	}
	if opts.Addr == "" {
		opts.Addr = "127.0.0.1:8000"
	}
	if opts.TornadoURL == "" {
		opts.TornadoURL = "http://127.0.0.1:8001"
	}

	raw := pick(fs.Lookup("serve-routes").Value.String(), os.Getenv("BOOKSVR_SERVE_ROUTES"))
	if raw == "all" {
		opts.ServeAll = true
	} else if raw != "" {
		for _, p := range strings.Split(raw, ",") {
			p = strings.TrimSpace(p)
			if p != "" {
				opts.ServeRoutes = append(opts.ServeRoutes, p)
			}
		}
	}

	if err := opts.validate(); err != nil {
		return nil, err
	}
	return opts, nil
}

// validate 校验必填项与白名单合法性。
func (o *serveOptions) validate() error {
	if o.DBPath == "" {
		return errors.New("serve: 必须用 -db 指定书库 SQLite 路径（或设置 BOOKSVR_DB）")
	}
	if _, err := os.Stat(o.DBPath); err != nil {
		return fmt.Errorf("serve: 无法访问数据库 %s: %w", o.DBPath, err)
	}
	if o.CookieSecret == "" {
		return errors.New("serve: 必须用 -cookie-secret 指定密钥（或设置 BOOKSVR_COOKIE_SECRET）")
	}

	known := httpapi.Patterns()
	for _, p := range o.ServeRoutes {
		if !known[p] {
			return fmt.Errorf("serve: -serve-routes 含未注册的 pattern %q", p)
		}
	}
	return nil
}

// pick 返回第一个非空值。
func pick(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}

// runServe 是 serve 子命令的入口。
func runServe(args []string, out io.Writer) error {
	fs := newServeFlagSet(out)
	if err := fs.Parse(args); err != nil {
		return err
	}

	opts, err := parseServeOptions(args)
	if err != nil {
		return err
	}

	// 启动期服务实例（扫描/插件/漫画）依赖 DB 句柄，由 Serve 在打开库后回调构造。
	// userDB 是 Talebook 自有库（scanfiles/plugin_*），libraryDB 是 Calibre 库（books）。
	wiring := func(userDB, libraryDB *sql.DB) httpapi.ServiceSet {
		return newServiceWiring(userDB, libraryDB, opts).serviceSet()
	}

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()
	return httpapi.Serve(ctx, httpapi.ServeOptions{
		DBPath:       opts.DBPath,
		UserDBPath:   opts.UserDBPath,
		Addr:         opts.Addr,
		TornadoURL:   opts.TornadoURL,
		ServeRoutes:  opts.ServeRoutes,
		ServeAll:     opts.ServeAll,
		CookieSecret: opts.CookieSecret,
		Demo: httpapi.DemoModeConfig{
			Enabled:         opts.DemoMode,
			Username:        opts.DemoUsername,
			DefaultPassword: "talebook",
		},
		Invite:     httpapi.InviteConfig{Code: opts.InviteCode, Message: opts.InviteMsg},
		ThemeStore: &httpapi.FileThemeStore{Path: opts.SettingsFile},
		CaptchaSettings: captcha.Settings{
			Provider:           opts.CaptchaProvider,
			EnableFor:          opts.CaptchaScenes,
			TurnstileSiteKey:   opts.TurnstileSiteKey,
			TurnstileSecretKey: opts.TurnstileSecretKey,
			GeetestCaptchaID:   opts.GeetestCaptchaID,
			GeetestCaptchaKey:  opts.GeetestCaptchaKey,
		},
		ImportDir: importdir.Config{
			SupportedFormats: supportedEbookFormats,
			ScanUploadPath:   opts.ScanUploadPath,
			AllowedRoots:     opts.ImportAllowedRoots,
			SavedImportMode:  opts.ImportMode,
			AutoWatchEnabled: opts.ImportAutoWatchEnabled,
			ScanBatchSize:    opts.ImportScanBatchSize,
		},
		LibraryRoot:        opts.LibraryRoot,
		HTMLPath:           opts.HTMLPath,
		CDNURL:             opts.CDNURL,
		APIURL:             opts.APIURL,
		BasePath:           opts.BasePath,
		AudiobookRoot:      opts.AudiobookRoot,
		Version:            resolveVersion(opts),
		BookSourceSeedFile: resolveSeedFile(opts),
		Settings:           httpapi.LoadSettings(opts.SettingsFile),
		SettingsPath:       opts.SettingsFile,
		ServiceFactory:     wiring,
		Out:                out,
	})
}
