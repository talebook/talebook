package httpapi

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"talebook/booksvr/internal/background"
	"talebook/booksvr/internal/booksource"
	"talebook/booksvr/internal/booktools"
	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/pluginbuiltin"
	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginruntime"
	"talebook/booksvr/internal/sourcecatalog"
)

// defaultMaxSaveChapters 复刻 Python BOOKSOURCE_MAX_SAVE_CHAPTERS 默认值。
const defaultMaxSaveChapters = 5000

// saveOnlineService 复刻 Python SaveOnlineBookService。
//
// 把在线书源的书籍抓取为本地 TXT 并导入书库。
type saveOnlineService struct {
	db       *sql.DB
	settings map[string]any
	library  *sql.DB
	registry *pluginruntime.PluginRegistry
}

// newSaveOnlineService 构造保存服务。
func newSaveOnlineService(db *sql.DB, settings map[string]any) *saveOnlineService {
	return &saveOnlineService{db: db, settings: settings, library: db}
}

// NewSaveOnlineFunc 返回可直接注入 ServeOptions.SaveOnline 的回调。
func NewSaveOnlineFunc(db *sql.DB, settings map[string]any) func(*Context, string, string, string, bool, int64) error {
	return NewSaveOnlineWithLibrary(db, db, settings, nil)
}

// NewSaveOnlineWithLibrary separates catalog writes from account and plugin records.
func NewSaveOnlineWithLibrary(db, libraryDB *sql.DB, settings map[string]any, registry *pluginruntime.PluginRegistry) func(*Context, string, string, string, bool, int64) error {
	if registry == nil {
		registry = pluginruntime.NewPluginRegistry()
		if err := pluginbuiltin.Register(registry); err != nil {
			panic(err)
		}
	}
	s := newSaveOnlineService(db, settings)
	s.library = libraryDB
	s.registry = registry
	return s.Save
}

// Save 复刻 save_online_book：抓取并导入，返回错误时由调用方转为响应。
func (s *saveOnlineService) Save(ctx *Context, sourceKey, bookURL, format string,
	clean bool, taskID int64) error {
	registry := s.registry
	if registry == nil {
		registry = pluginruntime.NewPluginRegistry()
		if err := pluginbuiltin.Register(registry); err != nil {
			return err
		}
	}
	catalog, err := sourcecatalog.NewService(s.db, s.settings, ctx.Identity.UserID, pluginruntime.NewRuntime(s.db, s.settings, registry))
	if err != nil {
		return fmt.Errorf("初始化书源目录失败: %w", err)
	}
	binding, err := catalog.Get(sourceKey)
	if err != nil {
		return fmt.Errorf("书源不存在: %w", err)
	}
	if binding == nil {
		return fmt.Errorf("书源不存在")
	}
	if binding.DownloadMode == "none" {
		return fmt.Errorf("该书源不支持保存到本地")
	}

	detailAny, err := catalog.Read(binding, "get_book", []any{bookURL}, nil, nil)
	if err != nil {
		return fmt.Errorf("读取书籍详情失败: %w", err)
	}
	detail := bookDetailOf(detailAny)
	if detail == nil {
		return fmt.Errorf("未能解析书籍详情")
	}

	// single_book 模式：直接下载整本文件。
	if binding.DownloadMode == "single_book" {
		fileAny, err := catalog.Read(binding, "download", []any{detailAny}, nil, nil)
		if err != nil {
			return fmt.Errorf("下载书籍失败: %w", err)
		}
		bookID, err := s.importDownloaded(detail, fileAny)
		if err != nil {
			return err
		}
		if err := s.recordOwner(ctx, bookID); err != nil {
			return err
		}
		s.reportProgress(taskID, 1, 1, bookID)
		return nil
	}

	// 目录模式：抓取章节并合并为 TXT。
	tocAny, err := catalog.Read(binding, "get_toc", []any{detailAny}, nil, nil)
	if err != nil {
		return fmt.Errorf("读取目录失败: %w", err)
	}
	chapters := chaptersOf(tocAny)
	if len(chapters) == 0 {
		return fmt.Errorf("未能解析到任何章节，保存终止")
	}
	chapters = booksource.ClampChapters(chapters, s.maxSaveChapters())

	uploadDir := s.uploadDir()
	if uploadDir == "" {
		return fmt.Errorf("未配置上传目录")
	}
	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		return fmt.Errorf("创建上传目录失败: %w", err)
	}
	txtPath := filepath.Join(uploadDir, booksource.TxtFilename(detail.Name, time.Now()))

	fetch := func(ctx context.Context, ch booksource.Chapter) (string, error) {
		body, err := catalog.Read(binding, "get_content", []any{detailAny, ch.ToDict()},
			nil, map[string]any{"clean": clean})
		if err != nil {
			return "", err
		}
		switch content := body.(type) {
		case plugindomain.SourceContent:
			return content.Content, nil
		case *plugindomain.SourceContent:
			if content != nil {
				return content.Content, nil
			}
		}
		return stringOf(body), nil
	}

	total := len(chapters)
	_, err = booksource.AssembleFromChapters(context.Background(), detail, chapters, fetch,
		txtPath, booksource.AssembleOptions{
			MaxWorkers: 1,
			Progress: func(done, all int) {
				s.reportProgress(taskID, done, all, 0)
			},
		})
	if err != nil {
		return fmt.Errorf("抓取章节失败: %w", err)
	}

	bookID, err := s.importTxt(detail, txtPath)
	if err != nil {
		return err
	}
	if err := s.recordOwner(ctx, bookID); err != nil {
		return err
	}
	s.reportProgress(taskID, total, total, bookID)
	return nil
}

// maxSaveChapters 返回章节数上限。
func (s *saveOnlineService) maxSaveChapters() int {
	if v, ok := s.settings["BOOKSOURCE_MAX_SAVE_CHAPTERS"]; ok {
		if n := int64Of(v); n > 0 {
			return int(n)
		}
	}
	return defaultMaxSaveChapters
}

// uploadDir 返回上传目录。
func (s *saveOnlineService) uploadDir() string {
	if p := stringOf(s.settings["upload_path"]); p != "" {
		return p
	}
	return stringOf(s.settings["scan_upload_path"])
}

// importTxt 把合并后的 TXT 导入书库。
func (s *saveOnlineService) importTxt(detail *booksource.BookDetail, txtPath string) (int64, error) {
	bookID, err := booktools.ImportNewBook(s.library, txtPath, booktools.NewBookOptions{
		Title:   detail.Name,
		Authors: detail.Authors(),
		Format:  "TXT",
	})
	if err != nil {
		return 0, fmt.Errorf("导入本地书库失败: %w", err)
	}
	return bookID, nil
}

// importDownloaded 把下载的整本文件导入书库。
func (s *saveOnlineService) importDownloaded(detail *booksource.BookDetail, fileAny any) (int64, error) {
	file := anyMapOf(fileAny)
	var content []byte
	var localPath string
	switch value := fileAny.(type) {
	case plugindomain.BookFile:
		content = value.Content
		localPath = value.LocalPath
		file = map[string]any{"format": value.Format, "filename": value.Filename}
	case *plugindomain.BookFile:
		if value != nil {
			content = value.Content
			localPath = value.LocalPath
			file = map[string]any{"format": value.Format, "filename": value.Filename}
		}
	}
	format := strings.ToUpper(stringOf(file["format"]))
	if format == "" {
		return 0, fmt.Errorf("书源未返回文件格式")
	}
	if localPath != "" {
		return booktools.ImportNewBook(s.library, localPath, booktools.NewBookOptions{Title: detail.Name, Authors: detail.Authors(), Format: format})
	}
	if content == nil {
		switch value := file["content"].(type) {
		case []byte:
			content = value
		case string:
			content = []byte(value)
		}
	}
	if len(content) == 0 {
		return 0, fmt.Errorf("书源未返回文件内容")
	}

	uploadDir := s.uploadDir()
	if uploadDir == "" {
		return 0, fmt.Errorf("未配置上传目录")
	}
	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		return 0, fmt.Errorf("创建上传目录失败: %w", err)
	}
	name := booksource.SafeFilename(strings.TrimSuffix(filepath.Base(stringOf(file["filename"])), filepath.Ext(stringOf(file["filename"]))))
	if name == "" {
		name = booksource.SafeFilename(detail.Name)
	}
	output, err := os.CreateTemp(uploadDir, name+"-*."+strings.ToLower(format))
	if err != nil {
		return 0, err
	}
	path := output.Name()
	_, writeErr := output.Write(content)
	closeErr := output.Close()
	if writeErr != nil {
		os.Remove(path)
		return 0, writeErr
	}
	if closeErr != nil {
		os.Remove(path)
		return 0, closeErr
	}

	bookID, err := booktools.ImportNewBook(s.library, path, booktools.NewBookOptions{
		Title:   detail.Name,
		Authors: detail.Authors(),
		Format:  format,
	})
	if err != nil {
		os.Remove(path)
		return 0, fmt.Errorf("导入本地书库失败: %w", err)
	}
	return bookID, nil
}

// recordOwner creates the private account record after catalog persistence succeeds.
func (s *saveOnlineService) recordOwner(ctx *Context, id int64) error {
	_, err := s.db.Exec(`INSERT INTO items (book_id,count_guest,count_visit,count_download,website,collector_id,scope,book_type,media_type,media_type_locked,src_path) VALUES (?,0,0,0,'',?,'private','','',0,'')`, id, ctx.Identity.UserID)
	if err != nil {
		_ = library.DeleteBook(s.library, id)
	}
	return err
}

// reportProgress 上报任务进度（taskID 为 0 时跳过）。
func (s *saveOnlineService) reportProgress(taskID int64, done, total int, bookID int64) {
	if taskID == 0 {
		return
	}
	progress := 100
	if total > 0 {
		progress = done * 100 / total
	}
	extra := map[string]any{"total": total, "done": done}
	if bookID != 0 {
		extra["book_id"] = bookID
	}
	background.Instance().UpdateProgress(taskID, progress, extra, "")
}

// bookDetailOf 把接口值转成 BookDetail。
func bookDetailOf(v any) *booksource.BookDetail {
	m := anyMapOf(v)
	if len(m) == 0 {
		return nil
	}
	return &booksource.BookDetail{
		Name:        stringOf(m["name"]),
		Author:      stringOf(m["author"]),
		Kind:        stringOf(m["kind"]),
		LastChapter: stringOf(m["last_chapter"]),
		Intro:       stringOf(m["intro"]),
		CoverURL:    stringOf(m["cover_url"]),
		WordCount:   stringOf(m["word_count"]),
		BookURL:     stringOf(m["book_url"]),
		TocURL:      stringOf(m["toc_url"]),
	}
}

// chaptersOf 把接口值转成章节列表。
func chaptersOf(v any) []booksource.Chapter {
	if values, ok := v.([]plugindomain.SourceChapter); ok {
		out := make([]booksource.Chapter, 0, len(values))
		for _, chapter := range values {
			out = append(out, booksource.Chapter{Name: chapter.Title, URL: chapter.ExternalID, IsVIP: chapter.IsVIP, UpdateTime: chapter.UpdatedAt})
		}
		return out
	}
	list, ok := v.([]any)
	if !ok {
		return nil
	}
	out := make([]booksource.Chapter, 0, len(list))
	for _, item := range list {
		m := anyMapOf(item)
		if len(m) == 0 {
			continue
		}
		out = append(out, booksource.Chapter{
			Name:       stringOf(m["name"]),
			URL:        stringOf(m["url"]),
			IsVIP:      bookBoolOf(m["is_vip"]),
			UpdateTime: stringOf(m["update_time"]),
		})
	}
	return out
}

// anyMapOf 把接口值转成 map；非 map 时返回空 map。
func anyMapOf(v any) map[string]any {
	if value, ok := v.(interface{ ToDict() map[string]any }); ok {
		return value.ToDict()
	}
	if m, ok := v.(map[string]any); ok {
		return m
	}
	return map[string]any{}
}
