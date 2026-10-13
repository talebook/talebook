package booksource

import (
	"context"
	"encoding/json"
	"net/url"
	"time"

	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/safehttp"
)

// VeneraProvider 是 Venera 漫画源的 SourceProvider 实现。
//
// 与 Python 侧 VeneraProvider 对应：同样的 download_mode="none"、
// 同样的配置校验、同样的权限校验、同样的错误分类。
type VeneraProvider struct {
	Client *safehttp.SafeHttpClient
	Config VeneraConfig
}

// NewVeneraProvider 构造 provider。
func NewVeneraProvider(client *safehttp.SafeHttpClient, config VeneraConfig) *VeneraProvider {
	return &VeneraProvider{Client: client, Config: config}
}

// DownloadMode 对应 Python 的 download_mode = "none"。
func (p *VeneraProvider) DownloadMode() pluginiface.DownloadMode {
	return pluginiface.DownloadNone
}

// call 执行一次源操作，含权限与配置校验。
func (p *VeneraProvider) call(ctx context.Context, operation string, args map[string]any,
	ctxMap map[string]any) (map[string]any, error) {

	config := asMapAny(ctxMap["config"])
	source, _ := config["source"].(string)
	if source == "" {
		source = "MangaDex"
	}
	if (source != "manga_dex" && source != "MangaDex") || len(asMapAny(ctxMap["secrets"])) > 0 {
		return nil, NewVeneraUnsupported("本接入仅支持 MangaDex 公开阅读，无需账号；论坛登录与其他源暂不支持")
	}
	if raw, present := ctxMap["scopes"]; present {
		have := map[string]bool{}
		if list, ok := raw.([]string); ok {
			for _, s := range list {
				have[s] = true
			}
		} else if list, ok := raw.([]any); ok {
			for _, s := range list {
				have[stringifyAny(s)] = true
			}
		}
		if !have["books.read"] || !have["network.read"] {
			return nil, NewVeneraScopeDenied("漫画源连接缺少阅读或网络权限，请管理员检查连接权限")
		}
	}

	cfg := p.Config
	if v, ok := toFloat(config["timeout_seconds"]); ok {
		cfg.TimeoutSeconds = v
	}
	if cfg.TimeoutSeconds < 1 {
		cfg.TimeoutSeconds = 1
	}
	if cfg.TimeoutSeconds > 60 {
		cfg.TimeoutSeconds = 60
	}
	if v, ok := config["locale"].(string); ok && v != "" {
		cfg.Locale = v
	}
	if v, ok := config["content_rating"].(string); ok && v != "" {
		cfg.ContentRating = v
	}
	if v, ok := config["image_quality"].(string); ok && v != "" {
		cfg.ImageQuality = v
	}

	started := time.Now()
	script, err := VeneraSourceScript(ctx, p.Client, secondsToDuration(cfg.TimeoutSeconds))
	if err != nil {
		return nil, err
	}
	remaining := cfg.TimeoutSeconds - time.Since(started).Seconds()
	if remaining <= 0 {
		return nil, NewVeneraTimeout("源脚本加载超时，请重试")
	}
	cfg.TimeoutSeconds = remaining
	return RunVeneraSource(ctx, script, operation, args, cfg, p.Client)
}

// Search 搜索漫画。
func (p *VeneraProvider) Search(query string, cursor map[string]any,
	ctxMap map[string]any) (plugindomain.Page, error) {

	page := clampPage(cursor)
	result, err := p.call(contextOf(ctxMap), "search", map[string]any{
		"query": url.QueryEscape(query),
		"page":  page,
	}, ctxMap)
	if err != nil {
		return plugindomain.Page{}, err
	}
	return p.buildPage(result, page)
}

// Browse 按分类浏览。
func (p *VeneraProvider) Browse(categoryID string, cursor map[string]any,
	ctxMap map[string]any) (plugindomain.Page, error) {

	category := categoryID
	if category == "" {
		category = "recent"
	}
	if category != "recent" && category != "popular" && category != "updated" {
		return plugindomain.Page{}, NewVeneraUnsupported("不支持的 MangaDex 浏览分类")
	}
	page := clampPage(cursor)
	result, err := p.call(contextOf(ctxMap), "browse", map[string]any{
		"category": category,
		"page":     page,
	}, ctxMap)
	if err != nil {
		return plugindomain.Page{}, err
	}
	return p.buildPage(result, page)
}

// GetCategories 返回固定分类。
func (p *VeneraProvider) GetCategories(ctxMap map[string]any) ([]plugindomain.Category, error) {
	return []plugindomain.Category{
		{ID: "recent", Name: "最新漫画"},
		{ID: "popular", Name: "热门漫画"},
		{ID: "updated", Name: "最近更新"},
	}, nil
}

// GetBook 拉取漫画详情。
func (p *VeneraProvider) GetBook(externalID string, ctxMap map[string]any) (plugindomain.SourceBookDetail, error) {
	bookID, err := MangaID(externalID)
	if err != nil {
		return plugindomain.SourceBookDetail{}, err
	}
	item, err := p.call(contextOf(ctxMap), "book", map[string]any{"id": bookID}, ctxMap)
	if err != nil {
		return plugindomain.SourceBookDetail{}, err
	}
	return plugindomain.SourceBookDetail{
		ExternalID:  bookID,
		Title:       stringifyAny(item["title"]),
		Authors:     []string{stringifyAny(item["subtitle"])},
		Description: stringifyAny(item["description"]),
		CoverURL:    stringifyAny(item["cover"]),
		TOCRef:      bookID,
		Source:      "MangaDex · Venera",
		Format:      "comic",
		Extra: map[string]any{
			"media_type":      "comic",
			"online_readable": true,
			"chapters":        item["chapters"],
		},
	}, nil
}

// Download 此漫画源仅支持在线阅读。
func (p *VeneraProvider) Download(book plugindomain.SourceBookDetail,
	ctxMap map[string]any) (plugindomain.BookFile, error) {
	return plugindomain.BookFile{}, NewVeneraUnsupported("此漫画源仅支持在线阅读")
}

// GetTOC 返回章节列表。
func (p *VeneraProvider) GetTOC(book plugindomain.SourceBookDetail,
	ctxMap map[string]any) ([]plugindomain.SourceChapter, error) {

	if _, ok := book.Extra["chapters"]; !ok {
		ref := book.ExternalID
		if ref == "" {
			ref = book.TOCRef
		}
		refreshed, err := p.GetBook(ref, ctxMap)
		if err != nil {
			return nil, err
		}
		book = refreshed
	}
	chapters, _ := book.Extra["chapters"].([]any)
	out := make([]plugindomain.SourceChapter, 0, len(chapters))
	for _, raw := range chapters {
		item, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		episodeID, err := MangaID(item["id"])
		if err != nil {
			return nil, err
		}
		out = append(out, plugindomain.SourceChapter{
			ExternalID: ChapterID(book.ExternalID, episodeID),
			Title:      stringifyAny(item["title"]),
		})
	}
	return out, nil
}

// GetChapter 返回章节图片列表。
func (p *VeneraProvider) GetChapter(chapter plugindomain.SourceChapter,
	ctxMap map[string]any) (plugindomain.SourceContent, error) {

	bookID, episodeID, err := ParseChapterID(chapter.ExternalID)
	if err != nil {
		return plugindomain.SourceContent{}, err
	}
	normalizedBook, err := MangaID(bookID)
	if err != nil {
		return plugindomain.SourceContent{}, err
	}
	normalizedEpisode, err := MangaID(episodeID)
	if err != nil {
		return plugindomain.SourceContent{}, err
	}
	result, err := p.call(contextOf(ctxMap), "pages", map[string]any{
		"id": normalizedBook, "chapter": normalizedEpisode,
	}, ctxMap)
	if err != nil {
		return plugindomain.SourceContent{}, err
	}
	images, ok := result["images"].([]any)
	if !ok || len(images) < 1 || len(images) > VeneraMaxPages {
		return plugindomain.SourceContent{}, NewVeneraUnsupported(
			"该章节没有可读取的页面，或页面数量超出当前兼容范围")
	}
	for _, raw := range images {
		item, ok := raw.(map[string]any)
		if !ok {
			return plugindomain.SourceContent{}, NewVeneraUnsupported("漫画图片请求配置不兼容")
		}
		if _, err := ImageEndpoint(stringifyAny(item["url"])); err != nil {
			return plugindomain.SourceContent{}, err
		}
		if fallback := stringifyAny(item["fallback"]); fallback != "" {
			if _, err := ImageEndpoint(fallback); err != nil {
				return plugindomain.SourceContent{}, err
			}
		}
		if !veneraHeadersCompatible(item["headers"]) {
			return plugindomain.SourceContent{}, NewVeneraUnsupported("漫画图片请求配置不兼容")
		}
	}
	return plugindomain.SourceContent{
		Title: chapter.Title,
		Extra: map[string]any{"media_type": "comic", "images": images},
	}, nil
}

// SelfCheck 验证源可用。
func (p *VeneraProvider) SelfCheck(ctxMap map[string]any) (plugindomain.CheckReport, error) {
	if _, err := p.Browse("recent", map[string]any{"page": 1}, ctxMap); err != nil {
		return plugindomain.CheckReport{}, err
	}
	return plugindomain.CheckReport{
		Healthy: true,
		Message: "MangaDex 连接可用；公开阅读无需源账号",
	}, nil
}

// contextOf 从上下文 map 中取出可取消的 context.Context（缺省用 Background）。
func contextOf(ctxMap map[string]any) context.Context {
	if ctx, ok := ctxMap["ctx"].(context.Context); ok && ctx != nil {
		return ctx
	}
	return context.Background()
}

// asMapAny 把任意值转为 map[string]any（非 map 返回空 map）。
func asMapAny(v any) map[string]any {
	if m, ok := v.(map[string]any); ok {
		return m
	}
	return map[string]any{}
}

// veneraHeadersCompatible 校验图片请求头是否恰为预期的 Referer/Origin。
func veneraHeadersCompatible(raw any) bool {
	headers := asMapAny(raw)
	if len(headers) != 2 {
		return false
	}
	return stringifyAny(headers["Referer"]) == "https://mangadex.org/" &&
		stringifyAny(headers["Origin"]) == "https://mangadex.org"
}

// buildPage 把源结果转为分页对象。
func (p *VeneraProvider) buildPage(result map[string]any, page int) (plugindomain.Page, error) {
	comics, _ := result["comics"].([]any)
	maxPage := 0
	if v, ok := toFloat(result["maxPage"]); ok {
		maxPage = int(v)
	}
	if maxPage > 500 {
		maxPage = 500
	}
	more := page < maxPage
	items := make([]any, 0, len(comics))
	for _, raw := range comics {
		item, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		id, err := MangaID(item["id"])
		if err != nil {
			return plugindomain.Page{}, err
		}
		var authors []string
		if list, ok := item["authors"].([]any); ok && len(list) > 0 {
			for _, a := range list {
				authors = append(authors, stringifyAny(a))
			}
		} else {
			authors = append(authors, stringifyAny(item["subtitle"]))
		}
		items = append(items, plugindomain.SourceBook{
			ExternalID:  id,
			Title:       stringifyAny(item["title"]),
			Authors:     authors,
			Source:      "MangaDex · Venera",
			CoverURL:    stringifyAny(item["cover"]),
			Description: stringifyAny(item["description"]),
			Format:      "comic",
			Access:      "online",
			Extra:       map[string]any{"media_type": "comic", "online_readable": true},
		})
	}
	out := plugindomain.Page{Items: items, HasMore: more}
	if more {
		out.NextCursor = map[string]any{"page": page + 1}
	} else {
		out.NextCursor = map[string]any{}
	}
	return out, nil
}

// clampPage 把游标页码夹到 [1, 500]。
func clampPage(cursor map[string]any) int {
	page := 1
	if v, ok := toFloat(cursor["page"]); ok {
		page = int(v)
	}
	if page < 1 {
		page = 1
	}
	if page > 500 {
		page = 500
	}
	return page
}

// toFloat 把任意数值转为 float64。
func toFloat(v any) (float64, bool) {
	switch t := v.(type) {
	case float64:
		return t, true
	case int:
		return float64(t), true
	case int64:
		return float64(t), true
	case json.Number:
		f, err := t.Float64()
		return f, err == nil
	}
	return 0, false
}
