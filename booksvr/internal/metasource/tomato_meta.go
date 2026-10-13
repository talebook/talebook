package metasource

import (
	"context"
	"net/http"
	"regexp"
	"strings"

	"talebook/booksvr/internal/metabase"
	"talebook/booksvr/internal/safehttp"
)

// TomatoSource 实现番茄小说元数据源（复刻 api.py 的 TomatoNovelApi）。
type TomatoSource struct {
	// HTTP 是受策略约束的 HTTP 客户端。
	HTTP *safehttp.SafeHttpClient
	// Cookie 复刻构造参数 cookie。
	Cookie string
	// UAIndex 复刻 random.choice(USER_AGENTS) 的选择结果。
	UAIndex int
}

// NewTomatoSource 构造番茄小说源。
func NewTomatoSource(http *safehttp.SafeHttpClient) *TomatoSource {
	if http == nil {
		http = &safehttp.SafeHttpClient{}
	}
	return &TomatoSource{HTTP: http}
}

// GetBookByID 复刻 get_book_by_id：返回 Page 对象或 nil。
func (s *TomatoSource) GetBookByID(bookID string) *TomatoPage {
	page, err := NewTomatoPage(bookID, s.Cookie, s.HTTP)
	if err != nil {
		return nil
	}
	return page
}

// SearchBook 复刻 search_book。
func (s *TomatoSource) SearchBook(title, author string) []TomatoSearchResult {
	keyword := title
	if author != "" {
		keyword = title + " " + author
	}
	return NewTomatoSearch(keyword, 10, s.Cookie, s.HTTP).GetResults()
}

// GetBook 复刻 get_book：优先精确匹配书名（与作者），否则取第一条。
func (s *TomatoSource) GetBook(title, author string, copyImage bool) map[string]any {
	results := s.SearchBook(title, author)
	if len(results) == 0 {
		return nil
	}
	for _, r := range results {
		if r.Title == title {
			if author == "" || r.Author == author {
				if page := s.GetBookByID(r.BookID); page != nil {
					return s.BuildMetadata(page, copyImage)
				}
			}
		}
	}
	if page := s.GetBookByID(results[0].BookID); page != nil {
		return s.BuildMetadata(page, copyImage)
	}
	return nil
}

// GetBookByIDDirect 复刻 get_book_by_id_direct。
func (s *TomatoSource) GetBookByIDDirect(bookID string, copyImage bool) map[string]any {
	page := s.GetBookByID(bookID)
	if page == nil {
		return nil
	}
	return s.BuildMetadata(page, copyImage)
}

// tomatoPromoMarkers 复刻无效推广页面的简介特征。
var tomatoPromoMarkers = []string{"番茄小说是抖音旗下", "海量正版小说", "书荒广场"}

// BuildMetadata 复刻 _metadata。
func (s *TomatoSource) BuildMetadata(page *TomatoPage, copyImage bool) map[string]any {
	info := page.GetInfo()
	comments := page.GetSummary()

	// 检测番茄小说无效推广页面。
	if info.Title != "" && (strings.Contains(info.Title, "番茄小说") || strings.HasPrefix(info.Title, "未知")) {
		if comments != "" {
			for _, marker := range tomatoPromoMarkers {
				if strings.Contains(comments, marker) {
					return nil
				}
			}
		}
	}

	author := info.Author
	if author == "" {
		author = "佚名"
	}

	tags := page.GetTags()
	if len(tags) > 8 {
		tags = tags[:8]
	}

	website := info.URL
	if website == "" {
		website = "https://fanqienovel.com/"
	}

	mi := map[string]any{
		"title":          info.Title,
		"authors":        []any{author},
		"author":         author,
		"author_sort":    author,
		"publisher":      nil,
		"isbn":           TomatoISBN,
		"tags":           toAnySlice(tags),
		"comments":       comments,
		"cover_url":      page.GetImage(),
		"website":        website,
		"source":         "番茄小说",
		"provider_key":   TomatoKey,
		"provider_value": page.GetID(),
		"series":         nil,
		"rating":         nil,
	}

	mi["cover_data"] = nil
	if coverURL, _ := mi["cover_url"].(string); coverURL != "" && copyImage {
		if cover := s.GetCover(coverURL); cover != nil {
			mi["cover_data"] = []any{cover.Extension, cover.Content}
		}
	}
	return mi
}

// tomatoCoverExtRe 复刻 cover_url.split(".")[-1].lower()。
var tomatoCoverExtRe = regexp.MustCompile(`\.([^.]*)$`)

// tomatoImageFormats 复刻封面扩展名白名单。
var tomatoImageFormats = map[string]bool{
	"jpg": true, "jpeg": true, "png": true, "gif": true, "webp": true,
}

// GetCover 复刻 get_cover。
func (s *TomatoSource) GetCover(coverURL string) *metabase.CoverResult {
	if coverURL == "" {
		return nil
	}
	resp, err := s.HTTP.Get(context.Background(), coverURL, safehttp.RequestOptions{
		Headers: tomatoHeaders, Timeout: 10e9, HasTimeout: true,
	})
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil
	}
	img, err := readAll(resp.Body)
	if err != nil || len(img) == 0 {
		return nil
	}

	imgFmt := "jpg"
	if m := tomatoCoverExtRe.FindStringSubmatch(coverURL); m != nil {
		if ext := strings.ToLower(m[1]); tomatoImageFormats[ext] {
			imgFmt = ext
		}
	}
	return &metabase.CoverResult{Extension: imgFmt, Content: img}
}
