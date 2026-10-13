package metasource

import (
	"context"
	"net/http"
	"net/url"
	"path"
	"strings"

	"talebook/booksvr/internal/metabase"
	"talebook/booksvr/internal/safehttp"
)

// DoubanV2Detail 复刻 get_book_detail 的返回结构。
type DoubanV2Detail struct {
	Intro   string
	Authors []string
	ISBN    string
}

// GetBookDetail 复刻 get_book_detail：抓取书籍页面，提取作者、ISBN 与简介。
func (s *DoubanV2Source) GetBookDetail(bookURL, searchURL string) *DoubanV2Detail {
	if bookURL == "" {
		return nil
	}
	headers := make(map[string]string, len(doubanV2SearchHeaders))
	for k, v := range doubanV2SearchHeaders {
		headers[k] = v
	}
	headers["Referer"] = searchURL

	resp, err := s.HTTP.Get(context.Background(), bookURL, safehttp.RequestOptions{
		Headers: headers, Timeout: DoubanV2Timeout * 1e9, HasTimeout: true,
	})
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil
	}
	body, err := readAll(resp.Body)
	if err != nil {
		return nil
	}

	parser := newDoubanV2IntroParser()
	if err := parser.Feed(string(body)); err != nil {
		return nil
	}
	detail := &DoubanV2Detail{
		Authors: parser.Authors,
		ISBN:    parser.ISBN,
	}
	if intro := parser.GetIntro(); intro != "" {
		detail.Intro = intro
	}
	return detail
}

// doubanV2CoverSizeRe 复刻 cover_url.replace("/m/", "/l/").replace("/s/", "/l/")。
var doubanV2CoverSizeRe = strings.NewReplacer("/m/", "/l/", "/s/", "/l/")

// normalizeDoubanV2CoverURL 复刻封面尺寸替换。
func normalizeDoubanV2CoverURL(coverURL string) string {
	return doubanV2CoverSizeRe.Replace(coverURL)
}

// GetCover 复刻 get_cover：下载封面，返回 (fmt, bytes) 或 nil。
//
// 遇到 JS 挑战页（text/html）时解析 cookie 后重试一次。
func (s *DoubanV2Source) GetCover(coverURL, referer string) *metabase.CoverResult {
	if coverURL == "" {
		return nil
	}
	coverURL = normalizeDoubanV2CoverURL(coverURL)

	u, err := url.Parse(coverURL)
	if err != nil {
		return nil
	}
	suffix := strings.TrimPrefix(path.Ext(u.Path), ".")
	if suffix == "" {
		return nil
	}

	if referer == "" {
		referer = DoubanV2Referer
	}
	headers := map[string]string{
		"User-Agent": doubanV2CoverHeaders["User-Agent"],
		"Referer":    referer,
	}

	resp, err := s.HTTP.Get(context.Background(), coverURL, safehttp.RequestOptions{
		Headers: headers, Timeout: DoubanV2Timeout * 1e9, HasTimeout: true,
	})
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	contentType := resp.Header.Get("Content-Type")
	if strings.Contains(contentType, "text/html") {
		body, err := readAll(resp.Body)
		if err != nil {
			return nil
		}
		cookies := ParseJSChallengeCookies(string(body))
		if len(cookies) > 0 {
			retryHeaders := make(map[string]string, len(headers)+1)
			for k, v := range headers {
				retryHeaders[k] = v
			}
			retryHeaders["Cookie"] = joinCookies(cookies)
			resp2, err := s.HTTP.Get(context.Background(), coverURL, safehttp.RequestOptions{
				Headers: retryHeaders, Timeout: DoubanV2Timeout * 1e9, HasTimeout: true,
			})
			if err != nil {
				return nil
			}
			defer resp2.Body.Close()
			resp = resp2
			contentType = resp.Header.Get("Content-Type")
		}
	}

	if !strings.Contains(contentType, "image") {
		return nil
	}
	content, err := readAll(resp.Body)
	if err != nil {
		return nil
	}
	return &metabase.CoverResult{Extension: suffix, Content: content}
}

// joinCookies 把 cookie 映射拼为 Cookie 头。
func joinCookies(cookies map[string]string) string {
	parts := make([]string, 0, len(cookies))
	// 固定顺序，保证可测试。
	for _, k := range []string{"__tst_status", "EO_Bot_Ssid"} {
		if v, ok := cookies[k]; ok {
			parts = append(parts, k+"="+v)
		}
	}
	return strings.Join(parts, "; ")
}

// DoubanV2Abstract 复刻 _parse_abstract 的返回结构。
type DoubanV2Abstract struct {
	Author    string
	Publisher string
	PubDate   string
}

// ParseDoubanV2Abstract 复刻 _parse_abstract：按 " / " 拆分。
func ParseDoubanV2Abstract(abstract string) DoubanV2Abstract {
	raw := strings.Split(abstract, " / ")
	parts := make([]string, 0, len(raw))
	for _, p := range raw {
		parts = append(parts, pyStrip(p))
	}
	out := DoubanV2Abstract{}
	if len(parts) > 0 {
		out.Author = parts[0]
	}
	if len(parts) > 1 {
		out.Publisher = parts[1]
	}
	if len(parts) > 2 {
		out.PubDate = parts[2]
	}
	return out
}

// BuildMetadata 复刻 build_metadata。
func (s *DoubanV2Source) BuildMetadata(item DoubanV2Item, searchURL, isbn string, copyImage bool) map[string]any {
	parsed := ParseDoubanV2Abstract(item.Abstract)
	bookURL := item.URL

	// 从书籍详情页获取精确作者、ISBN 和简介（失败时回退到 abstract 解析值）。
	var detail *DoubanV2Detail
	if bookURL != "" {
		detail = s.GetBookDetail(bookURL, searchURL)
	}

	var authors []string
	if detail != nil && len(detail.Authors) > 0 {
		authors = detail.Authors
	} else {
		author := parsed.Author
		if author == "" {
			author = "佚名"
		}
		authors = []string{author}
	}

	mi := map[string]any{
		"title":          item.Title,
		"authors":        toAnySlice(authors),
		"author":         authors[0],
		"author_sort":    authors[0],
		"publisher":      parsed.Publisher,
		"source":         "豆瓣(V2)",
		"provider_key":   DoubanV2Key,
		"provider_value": item.ID,
		"website":        bookURL,
	}

	if isbn != "" {
		mi["isbn"] = isbn
	} else if detail != nil && detail.ISBN != "" {
		mi["isbn"] = detail.ISBN
	}

	if detail != nil && detail.Intro != "" {
		mi["comments"] = detail.Intro
	}

	if item.HasRating && item.Rating != 0 {
		mi["rating"] = roundHalfUp(item.Rating)
	}

	if parsed.PubDate != "" {
		if pd := DoubanStr2Date(parsed.PubDate); pd != nil {
			mi["pubdate"] = formatUTCDate(*pd)
		}
	}

	if item.CoverURL != "" {
		coverURL := normalizeDoubanV2CoverURL(item.CoverURL)
		mi["cover_url"] = coverURL
		if copyImage {
			referer := searchURL
			if referer == "" {
				referer = DoubanV2Referer
			}
			if cover := s.GetCover(coverURL, referer); cover != nil {
				mi["cover_data"] = []any{cover.Extension, cover.Content}
			}
		}
	}

	return mi
}
