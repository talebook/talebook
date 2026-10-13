package httpapi

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"talebook/booksvr/internal/userdb"

	"talebook/booksvr/internal/captcha"
	"talebook/booksvr/internal/comic"
	"talebook/booksvr/internal/convert"
	"talebook/booksvr/internal/importdir"
	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/pluginjobs"
	"talebook/booksvr/internal/pluginruntime"
	"talebook/booksvr/internal/scan"
	"talebook/booksvr/internal/sslcert"
)

// ServeOptions 是 Serve 的装配参数。
type ServeOptions struct {
	// DBPath 是 Calibre 书库 SQLite 文件路径（metadata.db）。
	DBPath string
	// UserDBPath 是 Talebook 自有库路径（calibre-webserver.db）。
	// 为空时回落为 DBPath，兼容单库部署与测试。
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
	// Demo 是 demo 模式配置，对齐 webserver/demo_mode.py。
	Demo DemoModeConfig
	// Invite 是访问码配置，对齐 CONF 的 INVITE_CODE / INVITE_MESSAGE。
	Invite InviteConfig
	// ThemeStore 提供主题激活状态的读写；为 nil 时主题接口返回未激活。
	ThemeStore ThemeStore
	// AnnotationSyncer 把公开批注扇出到外部插件；为 nil 时不做任何事。
	AnnotationSyncer AnnotationSyncer
	// LibraryRoot 是书库根目录，用于解析漫画容器绝对路径。
	LibraryRoot string
	// HTMLPath 是前端静态资源根目录（对应 Python 的 CONF["html_path"]）。
	HTMLPath string
	// Version 是站点版本号。
	Version string
	// CDNURL 是资源前缀。
	CDNURL string
	// APIURL 是接口前缀。
	APIURL string
	// ComicService 是漫画容器索引服务；为 nil 时自动创建。
	ComicService *comic.Service
	// CaptchaSettings 是人机验证提供商配置，对齐 CONF 的 CAPTCHA_* 项。
	CaptchaSettings captcha.Settings
	// ImportDir 是导入目录配置，对齐 CONF 的 scan_upload_path 等项。
	ImportDir importdir.Config
	// ImportWatchStatus 返回自动监控状态；为 nil 时返回「关闭」。
	ImportWatchStatus func() map[string]any
	// ScanService 返回扫描服务；为 nil 时扫描/导入接口返回服务不可用。
	ScanService func() *scan.Service
	// StartScan 启动一次异步扫描；为 nil 时返回服务不可用。
	StartScan func(path string, limit int) error
	// StartImport 启动一次异步导入；为 nil 时返回服务不可用。
	StartImport func(hashlist []string, userID int64, deleteAfter bool, importMode string) error
	// Settings 是 Talebook 配置（CONF），供网络书库与插件运行时读取。
	Settings map[string]any
	// PluginRegistry 是插件注册表；为 nil 时插件接口返回 plugin.not_found。
	PluginRegistry *pluginruntime.PluginRegistry
	// BookSourceSeedFile 是内置种子书源文件路径；为空时种子接口返回加载失败。
	BookSourceSeedFile string
	// SaveOnline 触发「保存到本地」；为 nil 时接口返回未接线错误。
	SaveOnline func(ctx *Context, sourceKey, bookURL, format string, clean bool, taskID int64) error
	// BasePath 是部署前缀（对应 Python 的 TALEBOOK_BASE_PATH）；为空表示根路径。
	BasePath string
	// AudiobookRoot 是有声书存储根目录；为空时用 LibraryRoot 下的 audiobooks。
	AudiobookRoot string
	// WebDAVServe 把请求交给 WebDAV 应用；为 nil 时返回 500。
	WebDAVServe func(ctx *Context) bool
	// Out 用于输出启动信息；为 nil 时丢弃。
	Out io.Writer
	// ServiceFactory 在 Serve 打开数据库后回调，用于构造依赖 DB 句柄的服务实例。
	//
	// 调用方（CLI）用它注入 ScanService / PluginRegistry / ComicService 等；
	// 为 nil 时这些字段保持调用方传入的值。
	//
	// 两个句柄必须分清（双库部署下是两个不同文件）：
	//   - userDB：Talebook 自有库。scanfiles、plugin_*、installed_themes、readers
	//     都只在这里；ScanService.DB / PluginRegistry 必须用它。
	//   - libraryDB：Calibre 元数据库。books、authors 等只在这里；
	//     ScanService.LibraryDB（重复检测）必须用它。
	//
	// 单库部署（UserDBPath 为空）时两者是同一个句柄，行为不变。
	ServiceFactory func(userDB, libraryDB *sql.DB) ServiceSet
}

// ServiceSet 是 ServiceFactory 返回的服务实例集合。
//
// 零值表示不覆盖对应字段。
type ServiceSet struct {
	// ScanService 返回扫描服务。
	ScanService func() *scan.Service
	// StartScan 启动一次异步扫描。
	StartScan func(path string, limit int) error
	// StartImport 启动一次异步导入。
	StartImport func(hashlist []string, userID int64, deleteAfter bool, importMode string) error
	// ImportWatchStatus 返回自动监控状态。
	ImportWatchStatus func() map[string]any
	// PluginRegistry 是插件注册表。
	PluginRegistry *pluginruntime.PluginRegistry
	// ComicService 是漫画容器索引服务。
	ComicService *comic.Service
	// SaveOnline 触发「保存到本地」。
	SaveOnline func(ctx *Context, sourceKey, bookURL, format string, clean bool, taskID int64) error
	// AnnotationSyncer 把公开批注扇出到插件。
	AnnotationSyncer AnnotationSyncer
	// WebDAVServe 把请求交给 WebDAV 应用。
	WebDAVServe func(ctx *Context) bool
}

// Serve 启动 HTTP 服务，直到 ctx 被取消。
//
// 数据库以 WAL + busy_timeout 打开，降低与 Tornado 并发访问的锁冲突。
func Serve(ctx context.Context, opts ServeOptions) error {
	if ctx == nil {
		ctx = context.Background()
	}
	if opts.DBPath == "" {
		return errors.New("httpapi: Serve 需要 DBPath")
	}
	if opts.CookieSecret == "" {
		return errors.New("httpapi: Serve 需要 CookieSecret")
	}
	if opts.Addr == "" {
		opts.Addr = "127.0.0.1:8000"
	}

	db, err := openLibraryDB(opts.DBPath)
	if err != nil {
		return err
	}
	defer db.Close()

	// Talebook 自有库（readers / items / annotations / plugin_* 等）与 Calibre
	// 元数据库是两个独立的 SQLite 文件。未指定时回落为同一个库，
	// 保持单库部署与既有测试的行为不变。
	//
	// 自有库不能跑 library.Migrate：它没有 books 表，扩展表由 userdb 自己管。
	userDB := db
	if opts.UserDBPath != "" && opts.UserDBPath != opts.DBPath {
		userDB, err = openUserDB(opts.UserDBPath)
		if err != nil {
			return err
		}
		defer userDB.Close()
	}

	// 依赖 DB 句柄的服务实例由调用方在此时构造。
	//
	// 两个句柄都要传：传错任一个都会在运行时报 no such table。
	//   - 只传 libraryDB → scanfiles 找不到（ScanService.DB 错）
	//   - 只传 userDB → books 找不到（ScanService.LibraryDB 错）
	if opts.ServiceFactory != nil {
		set := opts.ServiceFactory(userDB, db)
		if set.ScanService != nil {
			opts.ScanService = set.ScanService
		}
		if set.StartScan != nil {
			opts.StartScan = set.StartScan
		}
		if set.StartImport != nil {
			opts.StartImport = set.StartImport
		}
		if set.ImportWatchStatus != nil {
			opts.ImportWatchStatus = set.ImportWatchStatus
		}
		if set.PluginRegistry != nil {
			opts.PluginRegistry = set.PluginRegistry
		}
		if set.ComicService != nil {
			opts.ComicService = set.ComicService
		}
		if set.SaveOnline != nil {
			opts.SaveOnline = set.SaveOnline
		}
		if set.AnnotationSyncer != nil {
			opts.AnnotationSyncer = set.AnnotationSyncer
		}
		if set.WebDAVServe != nil {
			opts.WebDAVServe = set.WebDAVServe
		}
	}

	authCfg := AuthConfig{
		CookieSecret: opts.CookieSecret,
		Demo:         opts.Demo,
		Invite:       opts.Invite,
	}
	specs := append(WorkRouteSpecs(), AuthRouteSpecs(authCfg)...)
	specs = append(specs, ThemeRouteSpecs(opts.ThemeStore)...)
	specs = append(specs, AdminOpdsSourcesRouteSpecs()...)
	specs = append(specs, AnnotationRouteSpecs(opts.AnnotationSyncer)...)
	specs = append(specs, ComicRouteSpecs(ComicConfig{
		CookieSecret: opts.CookieSecret,
		LibraryRoot:  opts.LibraryRoot,
	}, opts.ComicService)...)
	onlineComicCfg := OnlineComicConfig{
		Settings: map[string]any{"cookie_secret": opts.CookieSecret},
	}
	specs = append(specs, OnlineComicRouteSpecs(onlineComicCfg)...)
	// 插件 run 执行器：在共享后台队列上执行已持久化的 run。
	pluginExecutor := pluginjobs.NewExecutor(pluginjobs.Config{
		DB:      userDB,
		Runtime: pluginruntime.NewRuntime(userDB, opts.Settings, opts.PluginRegistry),
	})
	specs = append(specs, PluginRouteSpecs(PluginConfig{
		Settings: opts.Settings,
		Registry: opts.PluginRegistry,
		ExecuteRun: func(_ *Context, runID int64) error {
			_, err := pluginExecutor.Execute(runID)
			return err
		},
	})...)
	specs = append(specs, BookToolsRouteSpecs(BookToolsConfig{
		Settings: opts.Settings,
		Registry: opts.PluginRegistry,
	})...)
	specs = append(specs, BookSourceAdminRouteSpecs(BookSourceAdminConfig{
		Settings: opts.Settings,
		SeedFile: opts.BookSourceSeedFile,
	})...)
	// 网络书库的封面改写依赖在线漫画的签名图片地址，这里把两者接上。
	specs = append(specs, NetworkRouteSpecs(NetworkConfig{
		Settings:           opts.Settings,
		LibraryRoot:        opts.LibraryRoot,
		SaveOnline:         opts.SaveOnline,
		ComicCoverRewriter: OnlineComicCoverRewriter(onlineComicCfg),
	})...)
	specs = append(specs, CaptchaRouteSpecs(CaptchaConfig{
		CookieSecret: opts.CookieSecret,
		Settings:     opts.CaptchaSettings,
	})...)
	specs = append(specs, ImportRouteSpecs(ImportConfig{
		Dir:         opts.ImportDir,
		WatchStatus: opts.ImportWatchStatus,
	})...)
	specs = append(specs, ScanRouteSpecs(ScanConfig{
		Dir:         opts.ImportDir,
		Service:     opts.ScanService,
		WatchStatus: opts.ImportWatchStatus,
		StartScan:   opts.StartScan,
		StartImport: opts.StartImport,
		UserID:      func(ctx *Context) int64 { return ctx.Identity.UserID },
	})...)
	// FilesConfig.DB 是 Calibre 元数据库（data / book_formats 等表）。
	// DefaultCover 必须接线：书籍无封面时回退到它，否则 /get/cover 返回 0 字节，
	// 前端封面图空白（用户可见现象：详情页/列表页都没有封面）。
	specs = append(specs, FilesRouteSpecs(FilesConfig{
		DB:           db,
		LibraryRoot:  opts.LibraryRoot,
		HTMLPath:     opts.HTMLPath,
		DefaultCover: loadDefaultCover(opts.HTMLPath),
	})...)
	specs = append(specs, UserRouteSpecs(UserConfig{
		Auth:     authCfg,
		DB:       userDB,
		Settings: opts.Settings,
		Version:  opts.Version,
		CDNURL:   opts.CDNURL,
	})...)
	// MetaConfig.DB 是 Calibre 元数据库（authors / tags / publishers 等表）；
	// UserDB 是 Talebook 自有库（author_aliases / book_aliases 等表）。
	specs = append(specs, MetaRouteSpecs(MetaConfig{
		DB:       db,
		UserDB:   userDB,
		Settings: opts.Settings,
	})...)
	specs = append(specs, UpgradeRouteSpecs(UpgradeConfig{
		DB:          userDB,
		Settings:    opts.Settings,
		Version:     opts.Version,
		UpgradeMode: UpgradeModeFromEnv(),
	})...)
	specs = append(specs, SocialRouteSpecs(SocialConfig{Auth: authCfg})...)
	// OpdsConfig.DB 是 Calibre 元数据库。
	specs = append(specs, OpdsRouteSpecs(OpdsConfig{
		DB:       db,
		Settings: opts.Settings,
	})...)
	opdsWiring := newAdminOpdsWiring(userDB, opts.Settings)
	specs = append(specs, AdminRouteSpecs(AdminConfig{
		DB:          userDB,
		LibraryDB:   db,
		LibraryRoot: opts.LibraryRoot,
		Settings:    opts.Settings,
		CDNURL:      opts.CDNURL,
		APIURL:      opts.APIURL,

		// OPDS 导入：浏览 / 导入 / 状态 / 失败列表 / 重试。
		OpdsBrowse:       opdsWiring.Browse,
		OpdsImport:       opdsWiring.Import,
		OpdsImportStatus: opdsWiring.Status,
		OpdsImportFailed: opdsWiring.Failed,
		OpdsImportRetry:  opdsWiring.Retry,

		// SSL 证书热更新。
		InstallSSL: newSSLInstaller(opts.Settings),
	})...)

	// 书籍、有声书与 WebDAV：接线到 library / userdb 的真实实现。
	publicURL := bookPublicURL(opts.BasePath)
	bookWiring := newBookWiring(userDB, db, opts.Settings)
	// 删除公开书时把目录移入 <libraryRoot>/.caltrash，供回收站页面恢复。
	bookWiring.libraryRoot = opts.LibraryRoot
	// 在线阅读需要把 mobi/azw3 转成 EPUB；转换产物放在书库下的 convert 目录。
	// 转换器用 Calibre 的 ebook-convert；未安装时 convertOne 会明确报错，
	// 阅读页回退到「请下载后本地阅读」，而不是给出一个假的 EPUB。
	convertSvc := convert.NewService(db, filepath.Join(opts.LibraryRoot, "convert"))
	convertSvc.Converter = convert.NewCalibreConverter(ebookConvertPath())
	bookWiring.convert = convertSvc
	bookCfg := bookWiring.Config(opts.CDNURL)
	specs = append(specs, BookRouteSpecs(bookCfg)...)

	audioRoot := opts.AudiobookRoot
	if audioRoot == "" && opts.LibraryRoot != "" {
		audioRoot = filepath.Join(opts.LibraryRoot, "audiobooks")
	}
	specs = append(specs, AudioRouteSpecs(newAudioWiring(userDB, db, opts.Settings, audioRoot).Config(opts.CDNURL, publicURL))...)

	specs = append(specs, WebDAVRouteSpecs((&webdavWiring{
		settings: opts.Settings,
		serve:    opts.WebDAVServe,
	}).Config(opts.Demo))...)

	server, err := NewServer(specs)
	if err != nil {
		return err
	}
	server.DB = userDB
	server.Identify = NewCookieIdentifier(opts.CookieSecret, nil)
	// 接入 can_view_book：非管理员看不到他人的私藏书。
	server.IsPublic = func(identity Identity, bookID int64) (bool, error) {
		return userdb.CanViewBook(userDB, bookID, identity.UserID, identity.IsAdmin)
	}

	dispatcher, err := NewDispatcher(server, opts.TornadoURL, opts.ServeRoutes, opts.ServeAll)
	if err != nil {
		return err
	}

	httpSrv := &http.Server{
		Addr:              opts.Addr,
		Handler:           dispatcher,
		ReadHeaderTimeout: 30 * time.Second,
	}

	if opts.Out != nil {
		fmt.Fprintf(opts.Out, "booksvr serve: 监听 %s，兜底代理 %s，白名单 %v（all=%v）\n",
			opts.Addr, opts.TornadoURL, opts.ServeRoutes, opts.ServeAll)
	}

	errCh := make(chan error, 1)
	go func() {
		if err := httpSrv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
			return
		}
		errCh <- nil
	}()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		return httpSrv.Shutdown(shutdownCtx)
	}
}

// newSSLInstaller 构造 SSL 证书安装回调。
//
// 证书与私钥路径取自站点配置（对应 Python 的 CONF["ssl_crt_file"] /
// CONF["ssl_key_file"]），缺省时回落为 /data/books/ssl/ssl.{crt,key}。
// 配置缺失或路径非法时返回 nil，handler 会回落到「未接线」错误。
func newSSLInstaller(settings map[string]any) func(crt, key []byte) error {
	crtPath := settingString(settings, "ssl_crt_file")
	if crtPath == "" {
		crtPath = "/data/books/ssl/ssl.crt"
	}
	keyPath := settingString(settings, "ssl_key_file")
	if keyPath == "" {
		keyPath = "/data/books/ssl/ssl.key"
	}
	manager, err := sslcert.NewManager(crtPath, keyPath)
	if err != nil {
		return nil
	}
	return manager.Install
}

// openLibraryDB 以 WAL + busy_timeout 打开书库数据库。
// ebookConvertPath 定位 Calibre 的 ebook-convert 可执行文件。
//
// 依次尝试环境变量、PATH 与镜像内的常见位置；都找不到时返回空串。
func ebookConvertPath() string {
	if p := os.Getenv("BOOKSVR_EBOOK_CONVERT"); p != "" {
		return p
	}
	if p, err := exec.LookPath("ebook-convert"); err == nil {
		return p
	}
	for _, p := range []string{
		"/usr/bin/ebook-convert",
		"/usr/local/bin/ebook-convert",
		"/opt/calibre/ebook-convert",
	} {
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	return ""
}

// loadDefaultCover 读取默认封面字节。
//
// 对应 Python 的 CONF["resource_path"] + "/calibre/default_cover.jpg"。
// HTMLPath 是前端静态根（如 /var/www/talebook/app/dist），资源在其上一级的
// webserver/resources 下；同时尝试几个常见位置，都找不到时返回 nil
// （此时封面接口会返回 404 而非 0 字节）。
func loadDefaultCover(htmlPath string) []byte {
	candidates := []string{}
	if htmlPath != "" {
		// /var/www/talebook/app/dist -> /var/www/talebook/webserver/resources
		base := filepath.Dir(filepath.Dir(htmlPath))
		candidates = append(candidates,
			filepath.Join(base, "webserver", "resources", "calibre", "default_cover.jpg"),
			filepath.Join(base, "resources", "calibre", "default_cover.jpg"),
		)
	}
	candidates = append(candidates,
		"/var/www/talebook/webserver/resources/calibre/default_cover.jpg",
		"webserver/resources/calibre/default_cover.jpg",
	)
	for _, p := range candidates {
		data, err := os.ReadFile(p)
		if err == nil && len(data) > 0 {
			return data
		}
	}
	return nil
}

// openUserDB 以 WAL + busy_timeout 打开 Talebook 自有库。
//
// 与 openLibraryDB 的区别：不跑 library.Migrate。自有库没有 books 表，
// 它的表结构由 userdb 包自己维护。
func openUserDB(path string) (*sql.DB, error) {
	dsn := path + "?_pragma=journal_mode(WAL)&_pragma=busy_timeout(30000)"
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("httpapi: 打开自有库失败: %w", err)
	}
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("httpapi: 连接自有库失败: %w", err)
	}
	return db, nil
}

func openLibraryDB(path string) (*sql.DB, error) {
	// Calibre 书库的 books_insert_trg 触发器会调用 title_sort() / uuid4()，
	// 这两个函数由 Calibre 在连接上注册；不注册则任何 INSERT INTO books 都会报
	// `no such function: title_sort`。必须在 sql.Open 之前注册。
	registerCalibreFunctions()

	dsn := path + "?_pragma=journal_mode(WAL)&_pragma=busy_timeout(30000)"
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("httpapi: 打开数据库失败: %w", err)
	}
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("httpapi: 连接数据库失败: %w", err)
	}
	// Calibre 原生库只有 books/authors 等表；Talebook 扩展表（book_formats、
	// works 等）必须补建，否则导入时 AddFormat 会报 no such table: book_formats。
	// Migrate 全部使用 CREATE TABLE IF NOT EXISTS，对已有库是幂等的。
	if err := library.Migrate(db); err != nil {
		db.Close()
		return nil, fmt.Errorf("httpapi: 初始化书库扩展表失败: %w", err)
	}
	return db, nil
}
