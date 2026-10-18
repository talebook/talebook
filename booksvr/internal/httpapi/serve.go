package httpapi

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"talebook/booksvr/internal/sourcefile"
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
	"talebook/booksvr/internal/updatecheck"
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
	// StartLibraryImport queues a complete scan-and-import task.
	StartLibraryImport func(int64, string) error
	// ImportWatchStatus 返回自动监控状态；为 nil 时返回「关闭」。
	ImportWatchStatus func() map[string]any
	// ScanService 返回扫描服务；为 nil 时扫描/导入接口返回服务不可用。
	ScanService func() *scan.Service
	// StartScan 启动一次异步扫描；为 nil 时返回服务不可用。
	StartScan             func(path string, limit int) error
	StartScanContext      func(context.Context, string, int) error
	StartScanBatchContext func(context.Context, string, int, func() error) error
	// StartImport 启动一次异步导入；为 nil 时返回服务不可用。
	StartImport        func(hashlist []string, userID int64, deleteAfter bool, importMode string) error
	StartImportContext func(context.Context, []string, int64, bool, string) error
	// Settings 是 Talebook 配置（CONF），供网络书库与插件运行时读取。
	Settings map[string]any
	// SettingsPath 是配置文件路径（conf/auto.py），供系统设置页保存配置。
	// 为空时保存接口返回未接线错误。
	SettingsPath string
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
	StartScan             func(path string, limit int) error
	StartScanContext      func(context.Context, string, int) error
	StartScanBatchContext func(context.Context, string, int, func() error) error
	// StartImport 启动一次异步导入。
	StartImport        func(hashlist []string, userID int64, deleteAfter bool, importMode string) error
	StartImportContext func(context.Context, []string, int64, bool, string) error
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
	if err := sourcefile.Init(); err != nil {
		return err
	}
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
		if set.StartScanContext != nil {
			opts.StartScanContext = set.StartScanContext
		}
		if set.StartScanBatchContext != nil {
			opts.StartScanBatchContext = set.StartScanBatchContext
		}
		if set.StartImport != nil {
			opts.StartImport = set.StartImport
		}
		if set.StartImportContext != nil {
			opts.StartImportContext = set.StartImportContext
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

	stopCovers, err := attachCoverWorker(ctx, db, opts.LibraryRoot)
	if err != nil {
		return err
	}
	defer stopCovers()
	stopDirectories := attachDirectoryWorker(ctx, db, opts.LibraryRoot, opts.Out)
	defer stopDirectories()
	if opts.ScanService != nil {
		if service := opts.ScanService(); service != nil {
			service.DeferCovers = true
			service.PrepareWorkers = 4
		}
	}
	opts, stopImports := attachImportWorker(ctx, opts, userDB)
	defer stopImports()
	opts, stopSources := attachSourceWorker(ctx, opts, db, userDB)
	defer stopSources()
	dispatcher, err := newSettingsHandler(opts, db, userDB)
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
// newAdminConfig 组装管理后台的依赖注入配置。
//
// 单独抽成函数是为了让测试能直接检查真实装配路径：
// 曾经这里的 8 个回调只接了 InstallSSL，其余全为 nil，
// 系统设置页的「测试连接」「迁移数据库」「测试邮件」都返回「未接线」。
func newAdminConfig(opts ServeOptions, userDB, libraryDB *sql.DB) AdminConfig {
	opdsWiring := newAdminOpdsWiring(userDB, opts.Settings)
	bookWiring := newBookWiring(userDB, libraryDB, opts.Settings, opts.PluginRegistry).withSettingsPath(opts.SettingsPath)
	bookWiring.libraryRoot = opts.LibraryRoot
	return AdminConfig{
		DeleteManagedBook: bookWiring.bookDelete,
		DB:                userDB,
		LibraryDB:         libraryDB,
		LibraryRoot:       opts.LibraryRoot,
		Settings:          opts.Settings,
		SettingsPath:      opts.SettingsPath,
		CDNURL:            opts.CDNURL,
		APIURL:            opts.APIURL,
		BasePath:          opts.BasePath,
		// 系统设置页保存配置：写回 conf/auto.py（对应 Python 的 dumpfile）。
		SaveSettings: func(next map[string]any) error {
			return SaveSettings(opts.SettingsPath, next)
		},
		// 数据库管理：测试连接与数据迁移。
		TestDBConnection: TestDBConnection,
		MigrateDB:        MigrateDB,
		// 邮件服务：测试邮件与推送书籍。
		SendMail: func(mailCfg MailConfig, from, to, subject, body string) error {
			return SendMail(mailCfg, from, to, subject, body, nil, "")
		},

		// OPDS 导入：浏览 / 导入 / 状态 / 失败列表 / 重试。
		OpdsBrowse:       opdsWiring.Browse,
		OpdsImport:       opdsWiring.Import,
		OpdsImportStatus: opdsWiring.Status,
		OpdsImportFailed: opdsWiring.Failed,
		OpdsImportRetry:  opdsWiring.Retry,

		// 升级检查：对应 Python 的 UpdateChecker。
		CheckUpdates: newUpdateCheckWiring(opts.Version),

		// 批量 Kindle 转 EPUB：对应 Python 的 BatchConvertService。
		ConvertStatus: newConvertStatusWiring(libraryDB, opts),
		StartConvert:  newStartConvertWiring(libraryDB, opts),

		// 自动填充元数据：对应 Python 的 AutoFillService。
		FillStatus: newFillStatusWiring(libraryDB, opts),
		StartFill:  newStartFillWiring(libraryDB, opts),

		// SSL 证书热更新。
		InstallSSL: newSSLInstaller(opts.Settings),
	}
}

// newUpdateCheckWiring 接线升级检查。
//
// Python 的 UpdateChecker 是进程内单例，缓存上次检查结果；
// 这里同样用包级单例，避免每次请求都打 GitHub API。
func newUpdateCheckWiring(version string) func() map[string]any {
	checker := updatecheck.NewChecker(version)
	return func() map[string]any {
		st := checker.Check()
		return map[string]any{
			"current_version": st.CurrentVersion,
			"latest_version":  st.LatestVersion,
			"has_update":      st.HasUpdate,
			"release_url":     st.ReleaseURL,
			"release_name":    st.ReleaseName,
			"release_body":    st.ReleaseBody,
			"last_check_time": st.LastCheckTime,
			"check_error":     st.CheckError,
		}
	}
}

// newConvertStatusWiring 接线批量转换状态查询。
func newConvertStatusWiring(libraryDB *sql.DB, opts ServeOptions) func() map[string]any {
	return func() map[string]any {
		if libraryDB == nil {
			return map[string]any{"total": 0, "skip": 0, "done": 0, "fail": 0, "running": false}
		}
		p := convert.NewService(libraryDB, ebookConvertPath()).Progress()
		return map[string]any{
			"total":   p.Total,
			"skip":    p.Skip,
			"done":    p.Done,
			"fail":    p.Fail,
			"running": p.Running,
		}
	}
}

// newStartConvertWiring 接线启动批量转换。
func newStartConvertWiring(libraryDB *sql.DB, opts ServeOptions) func(int64, []int64) error {
	return func(userID int64, ids []int64) error {
		if libraryDB == nil {
			return errors.New("书库数据库未就绪")
		}
		svc := convert.NewService(libraryDB, ebookConvertPath())
		go func() {
			if _, err := svc.ConvertAll(ids); err != nil {
				log.Printf("批量转换失败: %v", err)
			}
		}()
		return nil
	}
}

// newFillStatusWiring 接线自动填充状态查询。
//
// Go 侧尚未移植 AutoFillService（Python 的 metabase 刮削服务），
// 这里返回零值状态而不是 nil 回调，避免前端拿到「未接线」；
// 真正的刮削能力由插件运行时（pluginjobs）承担。
func newFillStatusWiring(libraryDB *sql.DB, opts ServeOptions) func() map[string]any {
	return func() map[string]any {
		return map[string]any{"total": 0, "skip": 0, "done": 0, "fail": 0}
	}
}

// newStartFillWiring 接线启动自动填充。
//
// 同 newFillStatusWiring：Go 侧尚无 AutoFillService，
// 明确返回错误而不是静默假装成功，避免用户以为任务已启动。
func newStartFillWiring(libraryDB *sql.DB, opts ServeOptions) func([]int64) error {
	return func(ids []int64) error {
		return errors.New("自动填充服务尚未移植到 Go 版本")
	}
}

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

// newServeDispatcher builds immutable route configurations for one settings snapshot.
func newServeDispatcher(opts ServeOptions, db, userDB *sql.DB) (*Dispatcher, error) {
	authCfg := AuthConfig{
		CookieSecret: opts.CookieSecret,
		Demo:         opts.Demo,
		Invite:       opts.Invite,
	}
	specs := append(WorkRouteSpecs(), AuthRouteSpecs(authCfg)...)
	specs = append(specs, ThemeRouteSpecs(opts.ThemeStore)...)
	specs = append(specs, AdminOpdsSourcesRouteSpecs()...)
	specs = append(specs, AnnotationRouteSpecs(opts.AnnotationSyncer)...)
	// 漫画路由在 bookWiring 构造后接线（需要它的 recordHistory）。
	comicCfg := ComicConfig{
		CookieSecret: opts.CookieSecret,
		LibraryRoot:  opts.LibraryRoot,
	}
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
		SaveExtraSettings: func(_ *Context, args map[string]any) (map[string]any, error) {
			if err := SaveSettings(opts.SettingsPath, args); err != nil {
				return map[string]any{"err": "file.permission", "msg": "更新磁盘配置文件失败！请确保配置文件的权限为可写入！"}, nil
			}
			return map[string]any{"err": "ok"}, nil
		},
	})...)
	specs = append(specs, BookToolsRouteSpecs(BookToolsConfig{
		LibraryRoot: opts.LibraryRoot,
		Settings:    opts.Settings,
		Registry:    opts.PluginRegistry,
		CanViewBook: func(ctx *Context, id int64) (bool, error) {
			return userdb.CanViewBook(userDB, id, ctx.Identity.UserID, ctx.Identity.IsAdmin)
		},
		FilterVisibleBookIDs: func(ctx *Context, ids []int64) ([]int64, error) {
			hidden, err := userdb.PrivateBookIDsFor(userDB, ctx.Identity.UserID, ctx.Identity.IsAdmin)
			if err != nil {
				return nil, err
			}
			visible := make([]int64, 0, len(ids))
			for _, id := range ids {
				if !hidden[id] {
					visible = append(visible, id)
				}
			}
			return visible, nil
		},
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
		Dir:          opts.ImportDir,
		SettingsPath: opts.SettingsPath,
		SaveSettings: func(values map[string]any) error {
			return SaveSettings(opts.SettingsPath, values)
		},
		WatchStatus: opts.ImportWatchStatus,
	})...)
	specs = append(specs, ScanRouteSpecs(ScanConfig{
		Dir:                opts.ImportDir,
		SettingsPath:       opts.SettingsPath,
		Service:            opts.ScanService,
		WatchStatus:        opts.ImportWatchStatus,
		StartScan:          opts.StartScan,
		StartImport:        opts.StartImport,
		StartLibraryImport: opts.StartLibraryImport,
		UserID:             func(ctx *Context) int64 { return ctx.Identity.UserID },
	})...)
	// FilesConfig.DB 是 Calibre 元数据库（data / book_formats 等表）。
	// DefaultCover 必须接线：书籍无封面时回退到它，否则 /get/cover 返回 0 字节，
	// 前端封面图空白（用户可见现象：详情页/列表页都没有封面）。
	specs = append(specs, FilesRouteSpecs(FilesConfig{
		DB:             db,
		LibraryRoot:    opts.LibraryRoot,
		HTMLPath:       opts.HTMLPath,
		DefaultCover:   loadDefaultCover(opts.HTMLPath),
		AllowGuestRead: settingBool(opts.Settings, "ALLOW_GUEST_READ", true),
		CanViewBook: func(ctx *Context, bookID int64) bool {
			ok, err := userdb.CanViewBook(userDB, bookID, ctx.Identity.UserID, ctx.Identity.IsAdmin)
			return err == nil && ok
		},
	})...)
	specs = append(specs, UserRouteSpecs(UserConfig{
		Registry:     opts.PluginRegistry,
		Auth:         authCfg,
		DB:           userDB,
		Settings:     opts.Settings,
		SettingsPath: opts.SettingsPath,
		Version:      opts.Version,
		CDNURL:       opts.CDNURL,
		// 首页「分类浏览」的计数来自 /api/user/info 的 sys 字段。
		// 这些回调必须接线，否则全部返回 0（曾导致首页显示 0 本书籍）。
		// 统计的是 Calibre 元数据库（books/authors/publishers/tags/series/data）。
		CountBooks:      func() (int64, error) { return library.CountBooks(db) },
		CountAuthors:    func() (int64, error) { return library.CountAuthors(db) },
		CountPublishers: func() (int64, error) { return library.CountPublishers(db) },
		CountTags:       func() (int64, error) { return library.CountTags(db) },
		CountSeries:     func() (int64, error) { return library.CountSeries(db) },
		CountFormats:    func() (int64, error) { return library.CountFormats(db) },
	})...)
	// 书籍、有声书与 WebDAV：接线到 library / userdb 的真实实现。
	// 必须在 MetaRouteSpecs 之前构造：分类详情页（/api/publisher/<name> 等）
	// 复用 bookCfg 的完整 BookFormatter，否则返回的书籍缺少 img/thumb/href，
	// 前端 BookCards 拿不到封面地址（用户可见现象：钻取页无封面图）。
	publicURL := bookPublicURL(opts.BasePath)
	bookWiring := newBookWiring(userDB, db, opts.Settings, opts.PluginRegistry).withSettingsPath(opts.SettingsPath)
	// 删除公开书时把目录移入 <libraryRoot>/.caltrash，供回收站页面恢复。
	bookWiring.libraryRoot = opts.LibraryRoot
	// 在线阅读需要把 mobi/azw3 转成 EPUB；转换产物放在书库下的 convert 目录。
	// 转换器用 Calibre 的 ebook-convert；未安装时 convertOne 会明确报错，
	// 阅读页回退到「请下载后本地阅读」，而不是给出一个假的 EPUB。
	convertSvc := convert.NewService(db, filepath.Join(opts.LibraryRoot, "convert"))
	convertSvc.Converter = convert.NewCalibreConverter(ebookConvertPath())
	bookWiring.convert = convertSvc
	bookCfg := bookWiring.Config(opts.CDNURL)

	// 漫画路由需要 bookWiring 的 recordHistory（阅读历史）。
	comicCfg.RecordHistory = bookWiring.recordHistory
	specs = append(specs, ComicRouteSpecs(comicCfg, opts.ComicService)...)

	// MetaConfig.DB 是 Calibre 元数据库（authors / tags / publishers 等表）；
	// UserDB 是 Talebook 自有库（author_aliases / book_aliases 等表）。
	specs = append(specs, MetaRouteSpecs(MetaConfig{
		DB:       db,
		UserDB:   userDB,
		Settings: opts.Settings,
		Book:     bookCfg,
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
		FilterVisibleBookIDs: func(ctx *Context, ids []int64) ([]int64, error) {
			private, err := userdb.PrivateBookIDsFor(userDB, ctx.Identity.UserID, ctx.Identity.IsAdmin)
			if err != nil {
				return nil, err
			}
			out := make([]int64, 0, len(ids))
			for _, id := range ids {
				if !private[id] {
					out = append(out, id)
				}
			}
			return out, nil
		},
	})...)
	specs = append(specs, AdminRouteSpecs(newAdminConfig(opts, userDB, db))...)

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

	applyCaptchaSettings(specs, CaptchaConfig{CookieSecret: opts.CookieSecret, Settings: opts.CaptchaSettings})
	server, err := NewServer(specs)
	if err != nil {
		return nil, err
	}
	server.DB = userDB
	// 作品/版本层要读 Calibre 元数据库的 books 表（work_id / edition_key）。
	server.LibraryDB = db
	server.Identify = NewCookieIdentifier(opts.CookieSecret, nil)
	// 接入 can_view_book：非管理员看不到他人的私藏书。
	server.IsPublic = func(identity Identity, bookID int64) (bool, error) {
		return userdb.CanViewBook(userDB, bookID, identity.UserID, identity.IsAdmin)
	}

	dispatcher, err := NewDispatcher(server, opts.TornadoURL, opts.ServeRoutes, opts.ServeAll)
	if err != nil {
		return nil, err
	}

	return dispatcher, nil
}
