package httpapi

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"talebook/booksvr/internal/convert"
	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/pluginbuiltin"
	"talebook/booksvr/internal/pluginruntime"
	"talebook/booksvr/internal/userdb"
)

// bookWiring 是 BookConfig 的真实服务接线。
//
// 把 handler 层的注入钩子接到 library / userdb 的真实实现上，
// 使 booksvr 不依赖 Tornado 即可独立提供书籍接口。
type bookWiring struct {
	db       *sql.DB
	settings map[string]any
	// settingsPath 非空时，读配置一律从磁盘重读，
	// 使管理员在系统设置页的改动立即生效。
	settingsPath string
	libraryDB    *sql.DB
	aliases      *userdb.AliasService
	registry     *pluginruntime.PluginRegistry
	// convert 用于在线阅读时把 mobi/azw3 转成 EPUB；为 nil 时跳过转换。
	convert *convert.Service
	// libraryRoot 是书库根目录，删除书籍时用于把目录移入 .caltrash。
	// 为空时退化为直接删库（不移动文件）。
	libraryRoot string
}

// newBookWiring 构造接线器。
//
// registry 是启动期已注册内置插件的注册表；为 nil 时自建并注册内置插件，
// 保证单独构造接线器（测试、嵌入式调用）也能拿到完整注册表。
func newBookWiring(db, libraryDB *sql.DB, settings map[string]any,
	registry *pluginruntime.PluginRegistry) *bookWiring {
	if registry == nil {
		registry = pluginruntime.NewPluginRegistry()
		if err := pluginbuiltin.Register(registry); err != nil {
			panic(fmt.Sprintf("httpapi: 注册内置插件失败: %v", err))
		}
	}
	return &bookWiring{
		db:        db,
		libraryDB: libraryDB,
		settings:  settings,
		aliases:   userdb.NewAliasService(db),
		registry:  registry,
	}
}

// withSettingsPath 设置配置文件路径，使读配置从磁盘重读。
//
// 返回自身以便链式调用。
func (w *bookWiring) withSettingsPath(path string) *bookWiring {
	w.settingsPath = path
	return w
}

// autoLogin 报告是否开启自动登录（影响 is_book_owner 语义）。
func (w *bookWiring) autoLogin() bool {
	return toIntSetting(w.settings, "auto_login", 0) != 0
}

// Config 返回装配好的 BookConfig。
func (w *bookWiring) Config(cdnURL string) BookConfig {
	return BookConfig{
		DB:        w.db,
		LibraryDB: w.libraryDB,
		Settings:  w.settings,
		CDNURL:    cdnURL,
		PublicURL: func(path string) string { return path },

		CanViewBook: func(ctx *Context, bookID int64) bool {
			ok, err := userdb.CanViewBook(w.db, bookID, ctx.Identity.UserID, ctx.Identity.IsAdmin)
			return err == nil && ok
		},
		IsBookOwner: func(ctx *Context, bookID int64) bool {
			ok, err := userdb.IsBookOwner(w.db, bookID, ctx.Identity.UserID, w.autoLogin())
			return err == nil && ok
		},
		PrivateBookIDs: func(ctx *Context) (map[int64]bool, error) {
			return userdb.PrivateBookIDsFor(w.db, ctx.Identity.UserID, ctx.Identity.IsAdmin)
		},

		Search: func(ctx *Context, keyword string) ([]int64, error) {
			return library.Search(w.libraryDB, keyword)
		},
		SearchField: func(ctx *Context, field, value string) ([]int64, error) {
			return library.Search(w.libraryDB, field+":'"+value+"'")
		},
		AliasBookIDs: func(ctx *Context, keyword string) ([]int64, error) {
			found, err := w.aliases.FindBookIDs(keyword)
			if err != nil {
				return nil, err
			}
			ids := make([]int64, 0, len(found))
			for id := range found {
				ids = append(ids, id)
			}
			return ids, nil
		},
		AliasAuthorNames: func(ctx *Context, keyword string) ([]string, error) {
			return w.aliases.MatchingAuthorNames(keyword)
		},
		BooksForCategory: func(ctx *Context, category, name string) ([]int64, error) {
			itemID, err := library.GetItemID(w.libraryDB, category, name)
			if err != nil || itemID == 0 {
				return nil, err
			}
			return library.GetBooksForCategory(w.libraryDB, category, itemID)
		},
		BookTitle: func(bookID int64) string {
			title, err := userdb.BookTitleByID(w.libraryDB, bookID)
			if err != nil {
				return ""
			}
			return title
		},
		HotBooks: func(ctx *Context, start, delta int) ([]int64, int, error) {
			return userdb.HotBookIDs(w.db, ctx.Identity.UserID, ctx.Identity.IsAdmin, start, delta)
		},
		NavTags: func(ctx *Context) (map[string]int, error) {
			return userdb.TagCounts(w.libraryDB)
		},

		SetReadState: func(ctx *Context, bookID int64, args map[string]any) error {
			readState := int64Of(args["read_state"])
			var onlineRead, download *int64
			if v, ok := args["online_read"]; ok {
				n := int64Of(v)
				onlineRead = &n
			}
			if v, ok := args["download"]; ok {
				n := int64Of(v)
				download = &n
			}
			if err := userdb.SetReadingState(w.db, bookID, ctx.Identity.UserID, readState, onlineRead, download); err != nil {
				return err
			}
			// 在读的书自动加入书架（用户要求）：置为在读时同步 wants=1；
			// 已读完/未读不改变书架状态。
			if readState == 1 {
				return userdb.SetReadingWants(w.db, bookID, ctx.Identity.UserID, true)
			}
			return nil
		},
		SetProgress: func(ctx *Context, bookID int64, progress map[string]any) error {
			return userdb.SetReadingProgress(w.db, bookID, ctx.Identity.UserID, progress)
		},
		SetFavorite: func(ctx *Context, bookID int64, favorite bool) error {
			return userdb.SetReadingFavorite(w.db, bookID, ctx.Identity.UserID, favorite)
		},
		SetShelf: func(ctx *Context, bookID int64, wants bool) error {
			return userdb.SetReadingWants(w.db, bookID, ctx.Identity.UserID, wants)
		},
		SetScope: func(ctx *Context, bookID int64, scope string) error {
			return userdb.SetItemScope(w.db, bookID, scope)
		},
		SetMediaType: func(ctx *Context, bookID int64, mediaType string) error {
			return userdb.SetItemMediaType(w.db, bookID, mediaType)
		},

		// 写路径：删除 / 格式删除 / 编辑。
		EditBook:      w.bookEdit,
		DeleteBook:    w.bookDelete,
		CountDownload: w.countDownload,
		RecordHistory: w.recordHistory,
		Aliases:       w.aliases,
		ReaderAssets:  "/static/candle-reader/",
		// 阅读器选择来自系统设置的 EPUB_VIEWER，不能写死：
		// 写死会让「设置 EPUB 阅读器为另一个」完全不生效。
		//
		// 必须每次重读磁盘：w.settings 是启动快照，
		// 管理员改完设置后不重启进程也应该立即生效。
		EPUBViewer:   settingString(liveSettings(w.settings, w.settingsPath), "EPUB_VIEWER"),
		DeleteFormat: w.bookDeleteFormat,

		// 阅读路径：在线阅读 / 阅读器引导 / TXT 阅读 / 阅读资源。
		ReadBook:        w.bookReadBook,
		ReaderBootstrap: w.bookReaderBootstrap,
		ReadTxt:         w.bookReadTxt,
		ReadResource:    w.bookReadResource,

		// 上传路径：普通上传 / 分片上传 / 完成 / TXT 初始化。
		Upload:         w.bookUpload,
		UploadChunk:    w.bookUploadChunk,
		UploadComplete: w.bookUploadComplete,
		TxtInit:        w.bookTxtInit,

		// 书籍工具：转换 / 转 PDF / 拆分 / 保存元数据 / 来源引用。
		Convert:  w.bookConvert,
		ToPDF:    w.bookToPDF,
		Separate: w.bookSeparate,
		SaveMeta: w.bookSaveMeta,
		Refer:    w.bookRefer,

		// 推送：设备 / 邮箱（依赖 integrations.push 插件）。
		SendToDevice: w.bookSendToDevice,
		SendToMail:   w.bookSendToMail,

		AllowGuestRead: settingBool(w.settings, "ALLOW_GUEST_READ", false),
	}
}

// audioWiring 是 AudioConfig 的真实服务接线。
type audioWiring struct {
	db        *sql.DB
	libraryDB *sql.DB
	settings  map[string]any
	root      string
}

// newAudioWiring 构造接线器。root 为有声书存储根目录。
func newAudioWiring(db, libraryDB *sql.DB, settings map[string]any, root string) *audioWiring {
	return &audioWiring{db: db, libraryDB: libraryDB, settings: settings, root: root}
}

// Config 返回装配好的 AudioConfig。
func (w *audioWiring) Config(cdnURL string, publicURL func(string) string) AudioConfig {
	return AudioConfig{
		DB:          w.db,
		LibraryDB:   w.libraryDB,
		Settings:    w.settings,
		StorageRoot: w.root,
		CDNURL:      cdnURL,
		PublicURL:   publicURL,

		CanViewBook: func(ctx *Context, bookID int64) bool {
			ok, err := userdb.CanViewBook(w.db, bookID, ctx.Identity.UserID, ctx.Identity.IsAdmin)
			return err == nil && ok
		},
		IsBookOwner: func(ctx *Context, bookID int64) bool {
			ok, err := userdb.IsBookOwner(w.db, bookID, ctx.Identity.UserID,
				toIntSetting(w.settings, "auto_login", 0) != 0)
			return err == nil && ok
		},
		FreeBytes: func() (int64, error) {
			return diskFreeBytes(w.root)
		},

		// 章节音频按「版本/章节号.mp3」的约定落盘。
		AudioFile: func(editionID int64, chapterNumber int) (string, error) {
			chapter, err := userdb.AudiobookChapterByNumber(w.db, editionID, int64(chapterNumber))
			if err != nil {
				return "", err
			}
			if chapter == nil || chapter.AudioPath == "" {
				return filepath.Join(w.root, "missing.mp3"), nil
			}
			return chapter.AudioPath, nil
		},

		// 写路径：任务 / 工作区 / 确认 / 修订 / 备份 / 版本 / 会话 / 订阅。
		CreateJob:      w.audioCreateJob,
		JobAction:      w.audioJobAction,
		Workspace:      w.audioWorkspace,
		WorkspacePatch: w.audioWorkspacePatch,
		ConfirmJob:     w.audioConfirmJob,
		CreateRevision: w.audioCreateRevision,
		CleanupBackups: w.audioCleanupBackups,
		DeleteEdition:  w.audioDeleteEdition,
		CreateSession:  w.audioCreateSession,
		UpdateSession:  w.audioUpdateSession,
		Subscription:   w.audioSubscription,

		// 语音 / 时间轴 / 审计。
		Voices:       w.audioVoices,
		VoicePreview: w.audioVoicePreview,
		Timeline:     w.audioTimeline,
		Audit:        w.audioAudit,
	}
}

// diskFreeBytes 返回路径所在卷的可用字节数。
func diskFreeBytes(path string) (int64, error) {
	if path == "" {
		return 0, os.ErrNotExist
	}
	if err := os.MkdirAll(path, 0o755); err != nil {
		return 0, err
	}
	return statfsFree(path)
}

// webdavWiring 是 WebDAVConfig 的真实服务接线。
type webdavWiring struct {
	settings map[string]any
	serve    func(ctx *Context) bool
}

// Config 返回装配好的 WebDAVConfig。
func (w *webdavWiring) Config(demo DemoModeConfig) WebDAVConfig {
	return WebDAVConfig{
		Enabled: func() bool {
			return settingBool(w.settings, "ENABLE_WEBDAV_SERVICE", false)
		},
		DemoReadOnly: func(ctx *Context) bool {
			return demo.Enabled
		},
		Serve: w.serve,
	}
}

// bookPublicURL 给路径加部署前缀（对齐 Python 的 public_url）。
func bookPublicURL(basePath string) func(string) string {
	if basePath == "" || basePath == "/" {
		return func(p string) string { return p }
	}
	base := "/" + strings.Trim(basePath, "/")
	return func(p string) string {
		if p == "" {
			return base
		}
		if !strings.HasPrefix(p, "/") {
			p = "/" + p
		}
		return base + p
	}
}
