package booksource

import (
	"context"
	"encoding/json"
	"strings"

	"talebook/booksvr/internal/htmlx"
	"talebook/booksvr/internal/safehttp"
)

// BookSourceEngine 基于一份书源，提供搜索 / 发现 / 详情 / 目录 / 正文能力。

// FinishedKeywords 是判定「已完结」的关键词。
var FinishedKeywords = []string{"完本", "完结", "全本", "已完结", "番外", "尾声", "终章", "大结局"}

// SerialKeywords 是判定「连载中」的关键词。
var SerialKeywords = []string{"连载", "連載", "更新中", "连载中"}

// 默认翻页上限。
const (
	DefaultMaxTocPages     = 1000
	DefaultMaxContentPages = 20
)

// BookSummary 是搜索结果/发现页里的一本书。
type BookSummary struct {
	Name        string `json:"name"`
	Author      string `json:"author"`
	Kind        string `json:"kind"`
	WordCount   string `json:"word_count"`
	LastChapter string `json:"last_chapter"`
	Intro       string `json:"intro"`
	CoverURL    string `json:"cover_url"`
	BookURL     string `json:"book_url"`
}

// ToDict 返回字段映射（复刻 dataclass 的 __dict__）。
func (b BookSummary) ToDict() map[string]any {
	return map[string]any{
		"name": b.Name, "author": b.Author, "kind": b.Kind,
		"word_count": b.WordCount, "last_chapter": b.LastChapter,
		"intro": b.Intro, "cover_url": b.CoverURL, "book_url": b.BookURL,
	}
}

// BookDetail 是书籍详情。
type BookDetail struct {
	Name        string `json:"name"`
	Author      string `json:"author"`
	Kind        string `json:"kind"`
	LastChapter string `json:"last_chapter"`
	Intro       string `json:"intro"`
	CoverURL    string `json:"cover_url"`
	WordCount   string `json:"word_count"`
	BookURL     string `json:"book_url"`
	TocURL      string `json:"toc_url"`
}

// ToDict 返回字段映射。
func (b BookDetail) ToDict() map[string]any {
	return map[string]any{
		"name": b.Name, "author": b.Author, "kind": b.Kind,
		"last_chapter": b.LastChapter, "intro": b.Intro,
		"cover_url": b.CoverURL, "word_count": b.WordCount,
		"book_url": b.BookURL, "toc_url": b.TocURL,
	}
}

// Chapter 是目录里的一章。
type Chapter struct {
	Name       string `json:"name"`
	URL        string `json:"url"`
	IsVIP      bool   `json:"is_vip"`
	UpdateTime string `json:"update_time"`
}

// ToDict 返回字段映射。
func (c Chapter) ToDict() map[string]any {
	return map[string]any{
		"name": c.Name, "url": c.URL,
		"is_vip": c.IsVIP, "update_time": c.UpdateTime,
	}
}

// ChapterContent 是章节正文。
type ChapterContent struct {
	Title   string         `json:"title"`
	Content string         `json:"content"`
	Extra   map[string]any `json:"-"`
}

// ToDict 复刻 Python：只返回 title 与 content。
func (c ChapterContent) ToDict() map[string]any {
	return map[string]any{"title": c.Title, "content": c.Content}
}

// DedupeChapters 章节去重，重复项保留靠后出现的一项。
//
// 对应 Legado 的「反转 + LinkedHashSet + 再反转」语义：目录页顶部常有
// 「最新章节」块，与正文列表重复，应保留正文列表中的那份以维持顺序。
func DedupeChapters(chapters []Chapter) []Chapter {
	lastIndex := map[[2]string]int{}
	for i, ch := range chapters {
		lastIndex[[2]string{ch.Name, ch.URL}] = i
	}
	keep := make(map[int]bool, len(lastIndex))
	for _, i := range lastIndex {
		keep[i] = true
	}
	out := make([]Chapter, 0, len(keep))
	for i, ch := range chapters {
		if keep[i] {
			out = append(out, ch)
		}
	}
	return out
}

// MakeDoc 根据规则提示把响应文本解析为 JSON 对象或 HTML 节点。
func MakeDoc(text, ruleHint string) any {
	hint := strings.TrimSpace(ruleHint)
	if strings.HasPrefix(hint, "$") || strings.HasPrefix(hint, "@json:") {
		var v any
		if err := json.Unmarshal([]byte(text), &v); err == nil {
			return v
		}
	}
	stripped := strings.TrimLeft(text, " \t\r\n\f\v")
	if strings.HasPrefix(stripped, "{") || strings.HasPrefix(stripped, "[") {
		var v any
		if err := json.Unmarshal([]byte(text), &v); err == nil {
			return v
		}
	}
	node, err := htmlx.Parse(text)
	if err != nil {
		return nil
	}
	return node
}

// EngineConfig 是引擎配置（对应 Python 的 config dict）。
type EngineConfig struct {
	HTTPTimeout     float64
	MaxTocPages     int
	MaxContentPages int
	ADPatterns      []string
	CleanEnabled    bool
}

// DefaultEngineConfig 返回与 Python 默认值一致的配置。
func DefaultEngineConfig() EngineConfig {
	return EngineConfig{
		HTTPTimeout:     20,
		MaxTocPages:     DefaultMaxTocPages,
		MaxContentPages: DefaultMaxContentPages,
		ADPatterns:      nil,
		CleanEnabled:    true,
	}
}

// BookSourceEngine 是书源引擎。
type BookSourceEngine struct {
	Source *BookSource
	Client *safehttp.SafeHttpClient
	Config EngineConfig
}

// NewBookSourceEngine 构造引擎；source 可以是 *BookSource 或原始 map。
func NewBookSourceEngine(source any, client *safehttp.SafeHttpClient, config EngineConfig) (*BookSourceEngine, error) {
	var bs *BookSource
	switch s := source.(type) {
	case *BookSource:
		bs = s
	default:
		var err error
		bs, err = NewBookSource(source)
		if err != nil {
			return nil, err
		}
	}
	return &BookSourceEngine{Source: bs, Client: client, Config: config}, nil
}

// BaseURL 返回书源根地址。
func (e *BookSourceEngine) BaseURL() string {
	return e.Source.BookSourceURL()
}

// resolve 把相对地址补全为绝对地址。
func (e *BookSourceEngine) resolve(u, base string) string {
	if u == "" {
		return ""
	}
	if hasHTTPPrefix(u) {
		return u
	}
	if base == "" {
		base = e.BaseURL()
	}
	return resolveURL(base, u)
}

// safe 安全求值字段：JS 规则跳过返回空串。
func (e *BookSourceEngine) safe(ctx *AnalyzeRule, rule string) string {
	v, err := ctx.GetString(rule)
	if err != nil {
		return ""
	}
	return v
}

// safeList 安全求值多值字段（如 nextTocUrl），JS 规则跳过返回空列表。
func (e *BookSourceEngine) safeList(ctx *AnalyzeRule, rule string) []string {
	v, err := ctx.GetStringList(rule)
	if err != nil {
		return nil
	}
	return v
}

// makeContext 构造求值上下文，并按 init 规则下推到首个元素。
func (e *BookSourceEngine) makeContext(text, pageURL string, rule *RuleGroup, hintRule string) *AnalyzeRule {
	doc := MakeDoc(text, hintRule)
	ctx := NewAnalyzeRule(doc, nil, pageURL)
	initRule := rule.Get("init")
	if initRule == "" {
		return ctx
	}
	elements, err := ctx.GetElements(initRule)
	if err != nil {
		return ctx
	}
	if len(elements) > 0 {
		return ctx.Child(elements[0])
	}
	return ctx
}

// Search 按关键词搜索。
func (e *BookSourceEngine) Search(ctx context.Context, key string, page int) ([]BookSummary, error) {
	variables := map[string]string{"key": key, "page": itoa(page)}
	au, err := NewAnalyzeURL(e.Source.SearchURL(), e.BaseURL(), variables, e.Source, e.Client, e.timeout())
	if err != nil {
		return nil, err
	}
	resp, err := au.Fetch(ctx)
	if err != nil {
		return nil, err
	}
	return e.parseBookList(resp.Text, resp.URL, e.Source.RuleSearch())
}

// Explore 按发现页分类 URL 拉取书单。
func (e *BookSourceEngine) Explore(ctx context.Context, u string, page int) ([]BookSummary, error) {
	variables := map[string]string{"page": itoa(page)}
	au, err := NewAnalyzeURL(u, e.BaseURL(), variables, e.Source, e.Client, e.timeout())
	if err != nil {
		return nil, err
	}
	resp, err := au.Fetch(ctx)
	if err != nil {
		return nil, err
	}
	rule := e.Source.RuleSearch()
	if raw := e.Source.Raw()["ruleExplore"]; raw != nil {
		if m, ok := raw.(map[string]any); ok && len(m) > 0 {
			rule = NewRuleGroup(m)
		}
	}
	return e.parseBookList(resp.Text, resp.URL, rule)
}

func (e *BookSourceEngine) parseBookList(text, pageURL string, rule *RuleGroup) ([]BookSummary, error) {
	bookListRule := rule.Get("bookList")
	ctx := e.makeContext(text, pageURL, rule, bookListRule)
	var elements []any
	if bookListRule != "" {
		got, err := ctx.GetElements(bookListRule)
		if err != nil {
			return nil, nil
		}
		elements = got
	}
	var results []BookSummary
	for _, node := range elements {
		c := ctx.Child(node)
		book := BookSummary{
			Name:        e.safe(c, rule.Get("name")),
			Author:      e.safe(c, rule.Get("author")),
			Kind:        e.safe(c, rule.Get("kind")),
			WordCount:   e.safe(c, rule.Get("wordCount")),
			LastChapter: e.safe(c, rule.Get("lastChapter")),
			Intro:       e.safe(c, rule.Get("intro")),
			CoverURL:    e.resolve(e.safe(c, rule.Get("coverUrl")), pageURL),
			BookURL:     e.resolve(e.safe(c, rule.Get("bookUrl")), pageURL),
		}
		if book.Name != "" || book.BookURL != "" {
			results = append(results, book)
		}
	}
	return results, nil
}

// BookInfo 拉取书籍详情。
func (e *BookSourceEngine) BookInfo(ctx context.Context, bookURL string) (*BookDetail, error) {
	u := e.resolve(bookURL, "")
	au, err := NewAnalyzeURL(u, e.BaseURL(), nil, e.Source, e.Client, e.timeout())
	if err != nil {
		return nil, err
	}
	resp, err := au.Fetch(ctx)
	if err != nil {
		return nil, err
	}
	rule := e.Source.RuleBookInfo()
	nameRule := rule.Get("name")
	ctxRule := e.makeContext(resp.Text, resp.URL, rule, nameRule)
	detail := &BookDetail{
		Name:        e.safe(ctxRule, rule.Get("name")),
		Author:      e.safe(ctxRule, rule.Get("author")),
		Kind:        e.safe(ctxRule, rule.Get("kind")),
		LastChapter: e.safe(ctxRule, rule.Get("lastChapter")),
		Intro:       e.safe(ctxRule, rule.Get("intro")),
		CoverURL:    e.resolve(e.safe(ctxRule, rule.Get("coverUrl")), resp.URL),
		WordCount:   e.safe(ctxRule, rule.Get("wordCount")),
		BookURL:     u,
	}
	tocURL := e.safe(ctxRule, rule.Get("tocUrl"))
	if tocURL != "" {
		detail.TocURL = e.resolve(tocURL, resp.URL)
	} else {
		detail.TocURL = u
	}
	return detail, nil
}

// Toc 拉取目录，支持 nextTocUrl 翻页与倒序修正。
func (e *BookSourceEngine) Toc(ctx context.Context, tocURL string) ([]Chapter, error) {
	rule := e.Source.RuleToc()
	chapterListRule := strings.TrimSpace(rule.Get("chapterList"))
	// Legado：`-` 前缀表示站点目录是倒序的，解析后需翻正；`+` 为占位前缀
	reverse := strings.HasPrefix(chapterListRule, "-")
	if strings.HasPrefix(chapterListRule, "-") || strings.HasPrefix(chapterListRule, "+") {
		chapterListRule = chapterListRule[1:]
	}
	nextRule := rule.Get("nextTocUrl")

	var chapters []Chapter
	seen := map[string]bool{}
	// nextTocUrl 两种语义：单 URL 是「下一页」逐页跟进；多 URL 是一次给出的全部分页列表。
	// 统一用队列处理：每页解析出的 URL 全部入队，seen 防环。
	queue := []string{e.resolve(tocURL, "")}
	pages := 0
	for len(queue) > 0 && pages < e.Config.MaxTocPages {
		u := queue[0]
		queue = queue[1:]
		if u == "" || seen[u] {
			continue
		}
		seen[u] = true
		pages++
		au, err := NewAnalyzeURL(u, e.BaseURL(), nil, e.Source, e.Client, e.timeout())
		if err != nil {
			return nil, err
		}
		resp, err := au.Fetch(ctx)
		if err != nil {
			return nil, err
		}
		ctxRule := e.makeContext(resp.Text, resp.URL, rule, chapterListRule)
		var elements []any
		if chapterListRule != "" {
			got, err := ctxRule.GetElements(chapterListRule)
			if err != nil {
				break
			}
			elements = got
		}
		for _, node := range elements {
			c := ctxRule.Child(node)
			ch := Chapter{
				Name:       e.safe(c, rule.Get("chapterName")),
				URL:        e.resolve(e.safe(c, rule.Get("chapterUrl")), resp.URL),
				IsVIP:      e.safe(c, rule.Get("isVip")) != "",
				UpdateTime: e.safe(c, rule.Get("updateTime")),
			}
			if ch.Name != "" || ch.URL != "" {
				chapters = append(chapters, ch)
			}
		}
		// 翻页
		if nextRule != "" {
			for _, nextURL := range e.safeList(ctxRule, nextRule) {
				resolved := e.resolve(nextURL, resp.URL)
				if resolved != "" && !seen[resolved] {
					queue = append(queue, resolved)
				}
			}
		}
	}
	if reverse {
		for i, j := 0, len(chapters)-1; i < j; i, j = i+1, j-1 {
			chapters[i], chapters[j] = chapters[j], chapters[i]
		}
	}
	return DedupeChapters(chapters), nil
}

// Content 拉取章节正文，支持 nextContentUrl 翻页与去广告。
func (e *BookSourceEngine) Content(ctx context.Context, chapterURL string, clean bool) (string, error) {
	rule := e.Source.RuleContent()
	contentRule := rule.Get("content")
	nextRule := rule.Get("nextContentUrl")
	replaceRegex := rule.Get("replaceRegex")

	var parts []string
	seen := map[string]bool{}
	// 与目录翻页一致：nextContentUrl 单 URL 逐页跟进，多 URL 视为全部分页列表
	queue := []string{e.resolve(chapterURL, "")}
	pages := 0
	for len(queue) > 0 && pages < e.Config.MaxContentPages {
		u := queue[0]
		queue = queue[1:]
		if u == "" || seen[u] {
			continue
		}
		seen[u] = true
		pages++
		au, err := NewAnalyzeURL(u, e.BaseURL(), nil, e.Source, e.Client, e.timeout())
		if err != nil {
			return "", err
		}
		resp, err := au.Fetch(ctx)
		if err != nil {
			return "", err
		}
		ctxRule := e.makeContext(resp.Text, resp.URL, rule, contentRule)
		got, err := ctxRule.GetString(contentRule)
		if err != nil {
			break
		}
		parts = append(parts, got)
		if nextRule != "" {
			for _, nextURL := range e.safeList(ctxRule, nextRule) {
				resolved := e.resolve(nextURL, resp.URL)
				if resolved != "" && !seen[resolved] {
					queue = append(queue, resolved)
				}
			}
		}
	}
	var nonEmpty []string
	for _, p := range parts {
		if p != "" {
			nonEmpty = append(nonEmpty, p)
		}
	}
	text := strings.Join(nonEmpty, "\n")
	if clean {
		return Clean(text, replaceRegex, e.Config.ADPatterns, e.Config.CleanEnabled), nil
	}
	return NormalizeWhitespace(text), nil
}

// DetectSerialization 根据书源元数据 + 目录判断连载状态：serial / finished / unknown。
func (e *BookSourceEngine) DetectSerialization(detail *BookDetail, chapters []Chapter) string {
	var parts []string
	if detail != nil {
		if detail.Kind != "" {
			parts = append(parts, detail.Kind)
		}
		if detail.LastChapter != "" {
			parts = append(parts, detail.LastChapter)
		}
	}
	haystack := strings.Join(parts, " ")
	if len(chapters) > 0 {
		haystack += " " + chapters[len(chapters)-1].Name
	}
	for _, kw := range FinishedKeywords {
		if strings.Contains(haystack, kw) {
			return "finished"
		}
	}
	for _, kw := range SerialKeywords {
		if strings.Contains(haystack, kw) {
			return "serial"
		}
	}
	return "unknown"
}

func (e *BookSourceEngine) timeout() timeDuration {
	secs := e.Config.HTTPTimeout
	if secs <= 0 {
		secs = 20
	}
	return secondsToDuration(secs)
}
