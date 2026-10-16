package convert

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"talebook/booksvr/internal/library"
)

// ConversionTarget 描述一条转换路线：目标格式 + 可接受的源格式（按优先级）。
type ConversionTarget struct {
	Target  string
	Sources []string
}

var ErrBusy = errors.New("convert: 已有转换任务在运行")

// ConversionTargets 复刻 Python CONVERSION_TARGETS。
var ConversionTargets = []ConversionTarget{
	{Target: "epub", Sources: []string{"azw3", "mobi", "pdf", "txt", "azw"}},
	{Target: "azw3", Sources: []string{"epub"}},
	{Target: "pdf", Sources: []string{"epub", "azw3", "mobi", "azw"}},
}

// ConversionOption 是一条转换路线的可用性描述。
type ConversionOption struct {
	SourceFormat string `json:"source_format"`
	TargetFormat string `json:"target_format"`
	Converter    string `json:"converter"`
	Available    bool   `json:"available"`
	Reason       string `json:"reason"`
}

// Status 是批量转换的进度快照。
type Progress struct {
	Total   int  `json:"total"`
	Skip    int  `json:"skip"`
	Done    int  `json:"done"`
	Fail    int  `json:"fail"`
	Running bool `json:"running"`
}

// Service 复刻 Python ConvertService + BatchConvertService。
type Service struct {
	db *sql.DB
	// ConvertPath 是转换中间产物目录。
	ConvertPath string
	// Converter 执行实际格式转换；为 nil 时只做同族文件复制。
	Converter func(src, dst string) error

	mu           sync.Mutex
	status       Progress
	started      time.Time
	readerJobs   map[int64]string
	readerQueue  []int64
	readerWorker bool
}

// NewService 构造转换服务。
func NewService(db *sql.DB, convertPath string) *Service {
	return &Service{db: db, ConvertPath: convertPath}
}

// Options 复刻 get_conversion_options：列出当前书籍可用的转换路线。
func (s *Service) Options(bookID int64) ([]ConversionOption, error) {
	formats, err := s.formatsOf(bookID)
	if err != nil {
		return nil, err
	}
	return OptionsForFormats(formats), nil
}

// OptionsForFormats 是 Options 的纯函数形式：已知格式列表时直接算路线。
//
// 书籍详情接口已经拿到了格式列表，无需再查库。
func OptionsForFormats(formats []string) []ConversionOption {
	has := map[string]bool{}
	for _, f := range formats {
		has[strings.ToLower(f)] = true
	}

	out := make([]ConversionOption, 0, len(ConversionTargets))
	for _, t := range ConversionTargets {
		source := t.Sources[0]
		for _, cand := range t.Sources {
			if has[cand] {
				source = cand
				break
			}
		}
		converter := "ebook-convert"
		if source == "txt" && t.Target == "epub" {
			converter = "txt2epub"
		}

		reason := ""
		switch {
		case has[t.Target]:
			reason = "target_exists"
		case !has[source]:
			reason = "source_missing"
		}
		out = append(out, ConversionOption{
			SourceFormat: source,
			TargetFormat: t.Target,
			Converter:    converter,
			Available:    reason == "",
			Reason:       reason,
		})
	}
	return out
}

// Progress 返回当前批量转换进度。
func (s *Service) Progress() Progress {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.status
}

// ConvertAll 复刻 convert_all：把指定（或全部）书籍转换为 EPUB。
//
// 只处理「有 azw3/mobi 但没有 epub」的书籍，与 Python 的 _has_kindle_format 一致。
func (s *Service) ConvertAll(idlist []int64) (Progress, error) {
	s.mu.Lock()
	if s.status.Running {
		out := s.status
		s.mu.Unlock()
		return out, ErrBusy
	}
	s.status = Progress{Running: true}
	s.started = time.Now()
	s.mu.Unlock()

	ids := idlist
	if len(ids) == 0 {
		all, err := library.AllBookIDs(s.db)
		if err != nil {
			s.mu.Lock()
			s.status.Running = false
			out := s.status
			s.mu.Unlock()
			return out, err
		}
		ids = all
	}

	for _, id := range ids {
		kindleFormat, kindlePath, ok := s.kindleSource(id)
		if !ok {
			s.bumpSkip()
			continue
		}
		if err := s.convertOne(id, kindleFormat, kindlePath); err != nil {
			log.Printf("convert book %d: %v", id, err)
			s.bumpFail()
			continue
		}
		s.bumpDone()
	}

	s.mu.Lock()
	s.status.Running = false
	out := s.status
	s.mu.Unlock()
	return out, nil
}

// kindleSource 复刻 _has_kindle_format：返回可转换的 Kindle 格式与路径。
func (s *Service) kindleSource(bookID int64) (string, string, bool) {
	formats, err := s.formatsOf(bookID)
	if err != nil || len(formats) == 0 {
		return "", "", false
	}
	lower := map[string]bool{}
	for _, f := range formats {
		lower[strings.ToLower(f)] = true
	}
	if lower["epub"] {
		return "", "", false
	}

	kindle := ""
	switch {
	case lower["azw3"]:
		kindle = "azw3"
	case lower["mobi"]:
		kindle = "mobi"
	case lower["azw"]:
		kindle = "azw"
	default:
		return "", "", false
	}

	path, missing, err := library.ResolvePath(s.db, bookID, kindle)
	if err != nil || missing {
		return "", "", false
	}
	return kindle, path, true
}

// convertOne 复刻 _convert_one_book：转换并登记 EPUB 格式。
func (s *Service) convertOne(bookID int64, kindleFormat, kindlePath string) error {
	if s.ConvertPath == "" {
		return fmt.Errorf("convert: 未配置转换目录")
	}
	if err := os.MkdirAll(s.ConvertPath, 0o755); err != nil {
		return fmt.Errorf("convert: 创建转换目录失败: %w", err)
	}

	outPath := filepath.Join(s.ConvertPath,
		fmt.Sprintf("batch-convert-%d-%d.epub", bookID, time.Now().Unix()))

	if s.Converter == nil {
		// 没有真实转换器时**不能**把源文件改名成 .epub：那会得到一个
		// 扩展名与内容不符的文件，阅读器解析时只能报「电子书加载超时」。
		// 宁可明确报错，让调用方回退到「请下载后本地阅读」。
		return fmt.Errorf("convert: 未配置格式转换器，无法把 %s 转为 EPUB", kindleFormat)
	}
	if err := s.Converter(kindlePath, outPath); err != nil {
		return fmt.Errorf("convert: 转换失败: %w", err)
	}

	// 登记前先取真实大小：登记 size=0 会让详情页显示「EPUB · 0B」的幽灵格式。
	info, err := os.Stat(outPath)
	if err != nil {
		return fmt.Errorf("convert: 读取转换产物失败: %w", err)
	}
	size := info.Size()
	if size == 0 {
		// 空产物不能登记：否则阅读器会去读一个 0 字节的 EPUB 而报加载超时。
		_ = os.Remove(outPath)
		return fmt.Errorf("convert: 转换产物为空")
	}

	if err := library.RegisterFormat(s.db, bookID, "EPUB", outPath, size, info.ModTime().Unix()); err != nil {
		return fmt.Errorf("convert: 登记 EPUB 失败: %w", err)
	}
	if _, err := s.db.Exec(`INSERT INTO data (book, format, uncompressed_size, name)
		VALUES (?, 'EPUB', ?, ?)`, bookID, size, filepath.Base(outPath)); err != nil {
		return fmt.Errorf("convert: 写入 data 表失败: %w", err)
	}
	// 不能删除 outPath：它已被登记为本书的 EPUB 格式，阅读器要靠它渲染。
	return nil
}

// formatsOf 返回书籍已登记的格式。
func (s *Service) formatsOf(bookID int64) ([]string, error) {
	formats, err := library.ListFormats(s.db, bookID)
	if err != nil {
		return nil, err
	}
	out := make([]string, 0, len(formats))
	for _, f := range formats {
		out = append(out, f.Format)
	}
	return out, nil
}

// bumpSkip / bumpDone / bumpFail 更新计数。
func (s *Service) bumpSkip() {
	s.mu.Lock()
	s.status.Skip++
	s.status.Total++
	s.mu.Unlock()
}

// bumpDone 记录一次成功。
func (s *Service) bumpDone() {
	s.mu.Lock()
	s.status.Done++
	s.status.Total++
	s.mu.Unlock()
}

// bumpFail 记录一次失败。
func (s *Service) bumpFail() {
	s.mu.Lock()
	s.status.Fail++
	s.status.Total++
	s.mu.Unlock()
}

// NewCalibreConverter 返回一个调用 Calibre ebook-convert 的转换器。
//
// 对应 Python 的 ConvertService：把源文件真正转成目标格式。
// 未安装 ebook-convert 时返回 nil，调用方应回退到「不支持在线阅读」。
func NewCalibreConverter(ebookConvert string) func(src, dst string) error {
	if ebookConvert == "" {
		return nil
	}
	if _, err := os.Stat(ebookConvert); err != nil {
		return nil
	}
	return func(src, dst string) error {
		cmd := exec.Command(ebookConvert, src, dst)
		out, err := cmd.CombinedOutput()
		if err != nil {
			return fmt.Errorf("ebook-convert 失败: %w: %s", err, strings.TrimSpace(string(out)))
		}
		return nil
	}
}
