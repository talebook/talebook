package booksource

import (
	"context"
	"errors"
	"fmt"
	"os"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"
)

// 把网络小说抓取并保存到本地书库（导出 txt）。

// 保存并发与重试的默认值。
const (
	DefaultSaveConcurrency = 10
	SaveConcurrencyKey     = "save_concurrency"
	DefaultMaxRetries      = 2
	DefaultMaxSaveChapters = 5000
)

// 连载状态取值。
const (
	StatusFinished = "finished"
	StatusSerial   = "serial"
	StatusUnknown  = "unknown"
)

// unsafeFilenameRe 匹配文件名中的非法字符。
var unsafeFilenameRe = regexp.MustCompile(`[\\/:*?"<>|\r\n\t]`)

// SafeFilename 把书名转为安全的文件名片段（最多 80 字符）。
func SafeFilename(name string) string {
	if name == "" {
		name = "online"
	}
	name = unsafeFilenameRe.ReplaceAllString(name, "_")
	name = strings.TrimSpace(name)
	if len(name) > 80 {
		name = name[:80]
	}
	if name == "" {
		return "online"
	}
	return name
}

// ChapterFetcher 按章节取正文；返回的 content 为空视为失败。
type ChapterFetcher func(ctx context.Context, chapter Chapter) (string, error)

// ProgressReporter 汇报保存进度；done/total 为已完成与总数。
type ProgressReporter func(done, total int)

// AssembleOptions 控制并发抓取行为。
type AssembleOptions struct {
	MaxWorkers int
	MaxRetries int
	// Progress 非 nil 时每完成 20 章（或全部完成）回调一次。
	Progress ProgressReporter
}

// AssembleFromChapters 并发抓取章节，失败重排队，最后按目录顺序写出 txt。
//
// 异常、缺失 content 字段与空白正文都算失败尝试。失败章节只在当前队列
// 排空后重试，避免单个不稳定端点长期占用工作协程。部分成功的书保留
// 历史行为（空白正文占位）；全部失败则拒绝保存。
func AssembleFromChapters(ctx context.Context, detail *BookDetail, chapters []Chapter,
	fetch ChapterFetcher, txtPath string, opts AssembleOptions) (string, error) {

	total := len(chapters)
	if total <= 0 {
		return "", errors.New("未能解析到任何章节，保存终止")
	}
	maxWorkers := opts.MaxWorkers
	if maxWorkers < 1 {
		maxWorkers = 1
	}
	if maxWorkers > 100 {
		maxWorkers = 100
	}
	maxRetries := opts.MaxRetries
	if maxRetries < 0 {
		maxRetries = 0
	}
	if maxRetries > 5 {
		maxRetries = 5
	}

	bodies := make([]string, total)
	pending := make([]int, total)
	for i := range pending {
		pending[i] = i
	}
	failures := map[int]error{}
	completed := 0
	reported := 0

	for attempt := 1; attempt <= maxRetries+1; attempt++ {
		if len(pending) == 0 {
			break
		}
		var retryQueue []int
		workers := maxWorkers
		if workers > len(pending) {
			workers = len(pending)
		}

		type result struct {
			index int
			body  string
			err   error
		}
		jobs := make(chan int)
		results := make(chan result, len(pending))
		var wg sync.WaitGroup
		for w := 0; w < workers; w++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				for index := range jobs {
					body, err := fetch(ctx, chapters[index])
					if err == nil {
						if strings.TrimSpace(body) == "" {
							err = errors.New("chapter response is empty")
						}
					}
					results <- result{index: index, body: body, err: err}
				}
			}()
		}
		go func() {
			for _, index := range pending {
				jobs <- index
			}
			close(jobs)
		}()
		wg.Wait()
		close(results)

		for r := range results {
			if r.err != nil {
				failures[r.index] = r.err
				retryQueue = append(retryQueue, r.index)
				continue
			}
			bodies[r.index] = r.body
			delete(failures, r.index)
			completed++
			if opts.Progress != nil && (completed-reported >= 20 || completed == total) {
				opts.Progress(completed, total)
				reported = completed
			}
		}
		sort.Ints(retryQueue)
		pending = retryQueue
	}

	if len(failures) == total {
		return "", errors.New("所有章节下载失败，保存终止")
	}

	if err := writeTxt(txtPath, detail, chapters, bodies); err != nil {
		return "", err
	}
	if opts.Progress != nil && reported < total {
		opts.Progress(total, total)
	}
	return txtPath, nil
}

// writeTxt 按 Legado 的排版写出 txt：书名、作者、简介，再逐章正文。
func writeTxt(txtPath string, detail *BookDetail, chapters []Chapter, bodies []string) error {
	var sb strings.Builder
	title := ""
	author := "佚名"
	description := ""
	if detail != nil {
		title = detail.Name
		if len(detail.Authors()) > 0 {
			author = detail.Authors()[0]
		}
		description = detail.Intro
	}
	fmt.Fprintf(&sb, "%s\n\n作者：%s\n\n", title, author)
	if description != "" {
		fmt.Fprintf(&sb, "%s\n\n", description)
	}
	for i, ch := range chapters {
		body := ""
		if i < len(bodies) {
			body = bodies[i]
		}
		fmt.Fprintf(&sb, "\n\n%s\n\n%s\n", ch.Name, body)
	}
	return os.WriteFile(txtPath, []byte(sb.String()), 0o644)
}

// Authors 返回详情里的作者列表（BookDetail 只存单个作者字段）。
func (b *BookDetail) Authors() []string {
	if b == nil || b.Author == "" {
		return nil
	}
	return []string{b.Author}
}

// SerializeStatus 复刻 _serialize_status：按末章与最后三章标题判定连载状态。
func SerializeStatus(detail *BookDetail, chapters []Chapter, declared string) string {
	if declared == "" {
		declared = StatusUnknown
	}
	lastChapter := ""
	if detail != nil {
		lastChapter = detail.LastChapter
	}
	parts := []string{lastChapter}
	start := len(chapters) - 3
	if start < 0 {
		start = 0
	}
	for _, ch := range chapters[start:] {
		parts = append(parts, ch.Name)
	}
	text := strings.Join(parts, " ")
	for _, kw := range FinishedKeywords {
		if strings.Contains(text, kw) {
			return StatusFinished
		}
	}
	for _, kw := range SerialKeywords {
		if strings.Contains(text, kw) {
			return StatusSerial
		}
	}
	return declared
}

// TxtFilename 生成 `书名-时间戳.txt` 形式的文件名。
func TxtFilename(title string, now time.Time) string {
	return fmt.Sprintf("%s-%d.txt", SafeFilename(title), now.Unix())
}

// ClampChapters 按上限截断章节列表。
func ClampChapters(chapters []Chapter, maxChapters int) []Chapter {
	if maxChapters <= 0 || len(chapters) <= maxChapters {
		return chapters
	}
	return chapters[:maxChapters]
}

// MakeTag 复刻 SaveOnlineBookService.make_tag。
//
// 前后端一致的任务定位键：按书源 + 书籍 URL 唯一。
func MakeTag(sourceID, bookURL string) string {
	return fmt.Sprintf("online_save:%s:%s", sourceID, bookURL)
}
