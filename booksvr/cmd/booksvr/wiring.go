package main

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"talebook/booksvr/internal/comic"
	"talebook/booksvr/internal/httpapi"
	"talebook/booksvr/internal/metasource"
	"talebook/booksvr/internal/pluginbuiltin"
	"talebook/booksvr/internal/pluginruntime"
	"talebook/booksvr/internal/scan"
)

// supportedEbookFormats 复刻 Python constants.SUPPORTED_EBOOK_FORMATS。
var supportedEbookFormats = []string{
	"azw3", "epub", "mobi", "pdf", "txt", "azw", "cbz", "zip", "cbr", "rar",
}

// formatSet 把格式列表转成扫描服务需要的集合。
func formatSet(formats []string) map[string]bool {
	out := make(map[string]bool, len(formats))
	for _, f := range formats {
		out[strings.ToLower(f)] = true
	}
	return out
}

// serviceWiring 汇总 `booksvr serve` 启动时需要构造的重型服务实例。
//
// 这些实例在 Python 侧由 server.py 在启动时装配（ScanService、PluginRegistry 等）。
// Go 侧此前只解析了 CLI 参数，从未构造它们，导致 ServeOptions 中 11 个字段
// 保持零值、对应模块静默空转。
type serviceWiring struct {
	// db 是 Talebook 自有库（scanfiles / plugin_* / reading_state）。
	db *sql.DB
	// libraryDB 是 Calibre 元数据库（books / authors）。
	libraryDB      *sql.DB
	scanService    *scan.Service
	watch          *scan.Watch
	pluginRegistry *pluginruntime.PluginRegistry
	comicService   *comic.Service
	settings       map[string]any
	settingsPath   string
	libraryRoot    string
}

// newServiceWiring 构造启动期服务实例。
//
// userDB 是已打开的 Talebook 自有库句柄（scanfiles / plugin_* 所在）；
// libraryDB 是 Calibre 元数据库句柄（books 所在）。两者在双库部署下是不同文件，
// 传错任一个都会在运行时报 no such table。opts 提供导入模式。
func newServiceWiring(userDB, libraryDB *sql.DB, opts *serveOptions) *serviceWiring {
	w := &serviceWiring{
		db:             userDB,
		libraryDB:      libraryDB,
		scanService:    scan.NewService(userDB, formatSet(supportedEbookFormats)),
		watch:          scan.NewWatch(),
		pluginRegistry: pluginruntime.NewPluginRegistry(),
		comicService:   comic.NewService(),
		settings:       httpapi.LoadSettings(opts.SettingsFile),
		settingsPath:   opts.SettingsFile,
		libraryRoot:    opts.LibraryRoot,
	}
	// 内置插件必须在启动期注册：注册表为空时插件中心返回空列表，
	// 且 OPDS 开关、推送设备等能力全部不可用。
	// 注册失败是编程错误（manifest 非法或契约违反），与 Python 在模块导入期
	// 抛错一致——启动即失败优于静默空转。
	if err := pluginbuiltin.Register(w.pluginRegistry); err != nil {
		panic(fmt.Sprintf("booksvr: 注册内置插件失败: %v", err))
	}
	pluginbuiltin.BindCalibre(w.pluginRegistry, &metasource.ProcessCalibreIdentifier{})
	// 重复检测要查 Calibre 的 books 表，必须用书库句柄。
	w.scanService.LibraryDB = libraryDB
	// 封面提取需要书库根目录：封面写到 <libraryRoot>/<books.path>/cover.jpg。
	w.scanService.LibraryRoot = opts.LibraryRoot
	w.scanService.BookStorageRoot = opts.BookStorageRoot
	w.scanService.SavedImportMode = opts.ImportMode
	return w
}

// watchStatus 把监控状态转成接口约定的 map 形状。
func (w *serviceWiring) watchStatus() map[string]any {
	st := w.watch.Status()
	return map[string]any{
		"state":        st.State,
		"queued":       st.Queued,
		"running":      st.Running,
		"failed":       st.Failed,
		"last_scan_at": st.LastScanAt,
		"message":      st.Message,
	}
}

// serviceSet 返回注入 ServeOptions 的服务集合。
func (w *serviceWiring) serviceSet() httpapi.ServiceSet {
	return httpapi.ServiceSet{
		ScanService: func() *scan.Service { return w.scanService },
		StartScan: func(path string, limit int) error {
			_, err := w.scanService.ScanAll(context.Background(), path, limit)
			return err
		},
		StartScanContext: func(ctx context.Context, path string, batchSize int) error {
			_, err := w.scanService.ScanAll(ctx, path, batchSize)
			return err
		},
		StartScanBatchContext: func(ctx context.Context, path string, batchSize int, afterBatch func() error) error {
			_, err := w.scanService.ScanAllWithCallback(ctx, path, batchSize, afterBatch)
			return err
		},
		StartImport: func(hashlist []string, userID int64, deleteAfter bool, importMode string) error {
			_, err := w.scanService.Import(hashlist, userID, deleteAfter, importMode)
			return err
		},
		ImportWatchStatus: w.watchStatus,
		PluginRegistry:    w.pluginRegistry,
		ComicService:      w.comicService,
		SaveOnline: func(ctx *httpapi.Context, sourceKey, bookURL, format string, clean bool, taskID int64) error {
			return httpapi.NewSaveOnlineWithLibrary(w.db, w.libraryDB, w.liveSettings(), w.pluginRegistry)(ctx, sourceKey, bookURL, format, clean, taskID)
		},
		AnnotationSyncer: w,
		WebDAVServe: func(ctx *httpapi.Context) bool {
			return httpapi.NewWebDAVServeFunc(w.db, w.libraryDB, w.liveSettings(), w.libraryRoot)(ctx)
		},
	}
}

// resolveVersion 返回站点版本号。
//
// 优先取显式配置，其次读仓库根的 candle-reader-version.txt，最后回落 "unknown"。
func resolveVersion(opts *serveOptions) string {
	if opts.Version != "" {
		return opts.Version
	}
	for _, p := range versionFileCandidates(opts) {
		if body, err := os.ReadFile(p); err == nil {
			if v := strings.TrimSpace(string(body)); v != "" {
				return v
			}
		}
	}
	return "unknown"
}

// versionFileCandidates 列出可能的版本文件路径。
func versionFileCandidates(opts *serveOptions) []string {
	var out []string
	if opts.LibraryRoot != "" {
		out = append(out, filepath.Join(filepath.Dir(opts.LibraryRoot), "candle-reader-version.txt"))
	}
	out = append(out, "candle-reader-version.txt")
	return out
}

// resolveSeedFile 返回内置种子书源文件路径。
//
// 优先取显式配置，其次在常见部署路径下探测 booksources.seed.json。
func resolveSeedFile(opts *serveOptions) string {
	if opts.BookSourceSeedFile != "" {
		return opts.BookSourceSeedFile
	}
	for _, p := range seedFileCandidates(opts) {
		if st, err := os.Stat(p); err == nil && !st.IsDir() {
			return p
		}
	}
	return ""
}

// seedFileCandidates 列出可能的种子书源文件路径。
func seedFileCandidates(opts *serveOptions) []string {
	var out []string
	if opts.LibraryRoot != "" {
		base := filepath.Dir(opts.LibraryRoot)
		out = append(out,
			filepath.Join(base, "webserver", "services", "booksource", "seeds", "booksources.seed.json"),
			filepath.Join(base, "seeds", "booksources.seed.json"),
		)
	}
	out = append(out,
		filepath.Join("webserver", "services", "booksource", "seeds", "booksources.seed.json"),
	)
	return out
}

func (w *serviceWiring) liveSettings() map[string]any {
	if w.settingsPath != "" {
		return httpapi.LoadSettings(w.settingsPath)
	}
	return w.settings
}
func (w *serviceWiring) SyncAnnotation(id int64, source, connection string) {
	httpapi.NewAnnotationSyncer(w.db, w.liveSettings(), w.pluginRegistry).SyncAnnotation(id, source, connection)
}
