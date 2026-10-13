package httpapi

import (
	"crypto/sha1"
	"database/sql"
	"encoding/hex"
	"encoding/xml"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"talebook/booksvr/internal/library"
)

// OpdsConfig 是 OPDS 服务模块的依赖注入点。
type OpdsConfig struct {
	// DB 是 Calibre 元数据库。
	DB *sql.DB
	// Settings 是站点配置。
	Settings map[string]any
	// PublicURL 给路径加部署前缀（对应 public_url）。
	PublicURL func(path string) string
	// Search 执行书库搜索；为 nil 时使用内置实现。
	Search func(query string) ([]int64, error)
	// CanViewBook 判定当前请求方能否查看该书。
	CanViewBook func(ctx *Context, bookID int64) bool
}

// ---- 路由常量 ----

const (
	rOpdsIndex    = "/opds/?"
	rOpdsNav      = "/opds/nav/(.*)"
	rOpdsCategory = "/opds/category/(.*)/(.*)"
	rOpdsCatGroup = "/opds/categorygroup/(.*)/(.*)"
	rOpdsSearch   = "/opds/search/(.*)"
)

// opdsContentType 是 OPDS 目录的 Content-Type。
const opdsContentType = "application/atom+xml; profile=opds-catalog; charset=UTF-8"

// opdsNavContentType 是导航目录的 Content-Type。
const opdsNavContentType = "application/atom+xml; charset=UTF-8"

// ---- Atom XML 结构 ----

// atomFeedXML 是 Atom feed 的序列化结构。
type atomFeedXML struct {
	XMLName   xml.Name       `xml:"feed"`
	Xmlns     string         `xml:"xmlns,attr"`
	XmlnsDC   string         `xml:"xmlns:dc,attr"`
	XmlnsOPDS string         `xml:"xmlns:opds,attr"`
	Title     string         `xml:"title"`
	Subtitle  string         `xml:"subtitle,omitempty"`
	Author    atomAuthorXML  `xml:"author"`
	ID        string         `xml:"id"`
	Icon      string         `xml:"icon"`
	Updated   string         `xml:"updated"`
	Links     []atomLinkXML  `xml:"link"`
	Entries   []atomEntryXML `xml:"entry"`
}

// atomAuthorXML 是 feed/entry 的作者。
type atomAuthorXML struct {
	Name string `xml:"name"`
	URI  string `xml:"uri,omitempty"`
}

// atomLinkXML 是一个 link 元素。
type atomLinkXML struct {
	Rel   string `xml:"rel,attr,omitempty"`
	Href  string `xml:"href,attr"`
	Type  string `xml:"type,attr,omitempty"`
	Title string `xml:"title,attr,omitempty"`
}

// atomEntryXML 是一个 entry 元素。
type atomEntryXML struct {
	Title   string          `xml:"title"`
	ID      string          `xml:"id"`
	Updated string          `xml:"updated"`
	Authors []atomAuthorXML `xml:"author,omitempty"`
	Content *atomContentXML `xml:"content,omitempty"`
	Links   []atomLinkXML   `xml:"link"`
}

// atomContentXML 是 entry 的内容块。
type atomContentXML struct {
	Type  string `xml:"type,attr"`
	Inner string `xml:",innerxml"`
}

// ---- 小工具 ----

// opdsHexlify 把字符串转成 UTF-8 的十六进制表示。
func opdsHexlify(s string) string {
	return hex.EncodeToString([]byte(s))
}

// opdsUnhexlify 还原 opdsHexlify 的结果。
func opdsUnhexlify(s string) (string, error) {
	raw, err := hex.DecodeString(s)
	if err != nil {
		return "", err
	}
	return string(raw), nil
}

// opdsUpdated 把时间渲染成 Atom 的 updated 格式。
func opdsUpdated(t time.Time) string {
	return t.UTC().Format("2006-01-02T15:04:05+00:00")
}

// opdsFirstChar 取条目排序名的首个字母数字字符，缺省 "A"。
func opdsFirstChar(name string) string {
	if name == "" {
		name = "A"
	}
	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') {
			return string(r)
		}
	}
	return "A"
}

// opdsURLFor 按名字拼出 OPDS 子路径。
func opdsURLFor(cfg OpdsConfig, name string, args map[string]string) string {
	base := opdsBaseHref(cfg)
	urls := map[string]string{
		"opds":              base,
		"opdst":             base + "/",
		"opdscategory":      base + "/category/%(category)s/%(which)s",
		"opdscategorygroup": base + "/categorygroup/%(category)s/%(which)s",
		"opdsnavcatalog":    base + "/nav/%(which)s",
		"opdssearch":        base + "/search/%(query)s",
	}
	out := urls[name]
	for k, v := range args {
		out = strings.ReplaceAll(out, "%("+k+")s", v)
	}
	return out
}

// opdsBaseHref 返回 OPDS 根地址。
func opdsBaseHref(cfg OpdsConfig) string {
	if cfg.PublicURL != nil {
		return cfg.PublicURL("/opds")
	}
	return "/opds"
}

// opdsOffsets 计算分页偏移，对应 Python 的 Offsets。
type opdsOffsets struct {
	Offset          int
	SliceUpperBound int
	NextOffset      int
	PreviousOffset  int
	LastOffset      int
}

// newOpdsOffsets 构造分页偏移；offset 越界时报错。
func newOpdsOffsets(offset, delta, total int) (*opdsOffsets, error) {
	if offset < 0 {
		offset = 0
	}
	if offset >= total {
		return nil, fmt.Errorf("Invalid offset: %d", offset)
	}
	lastAllowed := total - 1
	lastCurrent := offset + delta - 1

	o := &opdsOffsets{
		Offset:          offset,
		SliceUpperBound: offset + delta,
		NextOffset:      lastCurrent + 1,
		PreviousOffset:  offset - delta,
		LastOffset:      lastAllowed - delta,
	}
	if o.NextOffset > lastAllowed {
		o.NextOffset = -1
	}
	if o.PreviousOffset < 0 {
		o.PreviousOffset = 0
	}
	if o.LastOffset < 0 {
		o.LastOffset = 0
	}
	return o, nil
}

// opdsFormatTagString 把逗号分隔的标签串排序、截断后拼接。
func opdsFormatTagString(tags, sep string, maxTags int, joinVal string) string {
	if strings.TrimSpace(tags) == "" {
		return ""
	}
	parts := strings.Split(tags, sep)
	list := make([]string, 0, len(parts))
	for _, p := range parts {
		list = append(list, strings.TrimSpace(p))
	}
	sort.Strings(list)
	if maxTags > 0 && len(list) > maxTags {
		list = append(list[:maxTags], "...")
	}
	return strings.Join(list, joinVal)
}

// opdsXMLText 转义 XML 文本。
func opdsXMLText(s string) string {
	var buf strings.Builder
	_ = xml.EscapeText(&buf, []byte(s))
	return buf.String()
}

// ---- Feed 构造 ----

// opdsFeedBuilder 累积 feed 的公共部分。
type opdsFeedBuilder struct {
	cfg      OpdsConfig
	feed     atomFeedXML
	baseHref string
}

// newOpdsFeed 构造带公共 link 的 feed。
func newOpdsFeed(cfg OpdsConfig, id, title, subtitle string, updated time.Time) *opdsFeedBuilder {
	base := opdsBaseHref(cfg)
	if title == "" {
		title = opdsDefaultFeedTitle(cfg)
	}
	b := &opdsFeedBuilder{
		cfg:      cfg,
		baseHref: base,
		feed: atomFeedXML{
			Xmlns:     "http://www.w3.org/2005/Atom",
			XmlnsDC:   "http://purl.org/dc/terms/",
			XmlnsOPDS: "http://opds-spec.org/2010/catalog",
			Title:     title,
			Subtitle:  subtitle,
			Author:    atomAuthorXML{Name: settingString(cfg.Settings, "site_title"), URI: "http://calibre-ebook.com"},
			ID:        id,
			Icon:      "/favicon.png",
			Updated:   opdsUpdated(updated),
		},
	}
	// search / start 链接始终存在。
	b.feed.Links = append(b.feed.Links,
		atomLinkXML{Rel: "search", Title: "Search", Href: base + "/search/{searchTerms}", Type: "application/atom+xml"},
		atomLinkXML{Rel: "start", Href: base, Type: "application/atom+xml;type=feed;profile=opds-catalog"},
	)
	return b
}

// withNavLinks 追加 up/first/last/next/previous 链接。
func (b *opdsFeedBuilder) withNavLinks(offsets *opdsOffsets, pageURL, upURL string) *opdsFeedBuilder {
	const navType = "application/atom+xml;type=feed;profile=opds-catalog"
	if upURL != "" {
		b.feed.Links = append(b.feed.Links, atomLinkXML{Rel: "up", Href: upURL, Type: navType})
	}
	if pageURL != "" {
		b.feed.Links = append(b.feed.Links, atomLinkXML{Rel: "first", Href: pageURL, Type: navType})
		b.feed.Links = append(b.feed.Links, atomLinkXML{
			Rel: "last", Href: pageURL + "?offset=" + strconv.Itoa(offsets.LastOffset), Type: navType,
		})
		if offsets.Offset > 0 {
			b.feed.Links = append(b.feed.Links, atomLinkXML{
				Rel: "previous", Href: pageURL + "?offset=" + strconv.Itoa(offsets.PreviousOffset), Type: navType,
			})
		}
		if offsets.NextOffset > -1 {
			b.feed.Links = append(b.feed.Links, atomLinkXML{
				Rel: "next", Title: "Next", Href: pageURL + "?offset=" + strconv.Itoa(offsets.NextOffset), Type: navType,
			})
		}
	}
	return b
}

// addEntry 追加一个 entry。
func (b *opdsFeedBuilder) addEntry(e atomEntryXML) *opdsFeedBuilder {
	b.feed.Entries = append(b.feed.Entries, e)
	return b
}

// bytes 序列化 feed。
func (b *opdsFeedBuilder) bytes() ([]byte, error) {
	out, err := xml.MarshalIndent(b.feed, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("httpapi: 序列化 OPDS feed 失败: %w", err)
	}
	return append([]byte(xml.Header), out...), nil
}

// opdsDefaultFeedTitle 返回默认 feed 标题。
func opdsDefaultFeedTitle(cfg OpdsConfig) string {
	return settingString(cfg.Settings, "site_title") + " Library"
}

// opdsNavCatalogEntry 构造一个导航目录 entry。
func opdsNavCatalogEntry(cfg OpdsConfig, updated time.Time, title, description, query string) atomEntryXML {
	href := opdsBaseHref(cfg) + "/nav/" + opdsHexlify(query)
	sum := sha1.Sum([]byte(href))
	return atomEntryXML{
		Title:   title,
		ID:      "calibre-nav:" + hex.EncodeToString(sum[:]),
		Updated: opdsUpdated(updated),
		Content: &atomContentXML{Type: "text", Inner: opdsXMLText(description)},
		Links: []atomLinkXML{{
			Href: href, Type: "application/atom+xml;type=feed;profile=opds-catalog",
		}},
	}
}

// opdsCatalogEntry 构造一个分类项 entry。
func opdsCatalogEntry(item library.Category, itemKind, baseHref string, updated time.Time,
	ignoreCount, addKind bool) atomEntryXML {
	iid := "N" + item.Name
	if item.ID != 0 {
		iid = "I" + strconv.FormatInt(item.ID, 10) + ":" + itemKind
	}
	count := fmt.Sprintf("%d books", item.Count)
	if item.Count <= 1 {
		count = fmt.Sprintf("%d book", item.Count)
	}
	if ignoreCount {
		count = ""
	}
	title := item.Name
	if addKind {
		title += " (" + itemKind + ")"
	}
	return atomEntryXML{
		Title:   title,
		ID:      "calibre:category:" + item.Name,
		Updated: opdsUpdated(updated),
		Content: &atomContentXML{Type: "text", Inner: opdsXMLText(count)},
		Links: []atomLinkXML{{
			Href: baseHref + "/" + opdsHexlify(iid),
			Type: "application/atom+xml;type=feed;profile=opds-catalog",
		}},
	}
}

// opdsCatalogGroupEntry 构造一个字母分组 entry。
func opdsCatalogGroupEntry(text string, count int, category, baseHref string, updated time.Time) atomEntryXML {
	return atomEntryXML{
		Title:   text,
		ID:      "calibre:category-group:" + category + ":" + text,
		Updated: opdsUpdated(updated),
		Content: &atomContentXML{Type: "text", Inner: opdsXMLText(fmt.Sprintf("%d items", count))},
		Links: []atomLinkXML{{
			Href: baseHref + "/" + opdsHexlify(text),
			Type: "application/atom+xml;type=feed;profile=opds-catalog",
		}},
	}
}

// opdsAcquisitionEntry 构造一本书的获取 entry。
func opdsAcquisitionEntry(cfg OpdsConfig, b library.BookData, updated time.Time, prefix string) atomEntryXML {
	title := b.Title
	if title == "" {
		title = "Unknown"
	}
	authors := "Unknown"
	if len(b.Authors) > 0 {
		cleaned := make([]string, 0, len(b.Authors))
		for _, a := range b.Authors {
			cleaned = append(cleaned, strings.ReplaceAll(a, "|", ","))
		}
		authors = strings.Join(cleaned, " & ")
	}

	extra := []string{}
	if b.Rating > 0 {
		stars := strings.Repeat("\u2605", int(b.Rating/2))
		extra = append(extra, fmt.Sprintf("RATING: %s<br />", stars))
	}
	if len(b.Tags) > 0 {
		tags := opdsFormatTagString(strings.Join(b.Tags, ","), ",", 0, ", ")
		extra = append(extra, fmt.Sprintf("TAGS: %s<br />", opdsXMLText(tags)))
	}
	if b.Series != "" {
		extra = append(extra, fmt.Sprintf("SERIES: %s [%s]<br />",
			opdsXMLText(b.Series), opdsFormatSeriesIndex(b.SeriesIdx)))
	}
	if b.Comments != "" {
		extra = append(extra, opdsXMLText(b.Comments))
	}

	entry := atomEntryXML{
		Title:   title,
		ID:      "urn:uuid:" + strconv.FormatInt(b.ID, 10),
		Updated: opdsUpdated(updated),
		Authors: []atomAuthorXML{{Name: authors}},
	}
	if len(extra) > 0 {
		entry.Content = &atomContentXML{Type: "xhtml", Inner: strings.Join(extra, "\n")}
	}

	for _, format := range b.Formats {
		lower := strings.ToLower(format)
		mt := opdsMediaType(lower)
		if mt == "" {
			continue
		}
		entry.Links = append(entry.Links, atomLinkXML{
			Rel:  "http://opds-spec.org/acquisition",
			Type: mt,
			Href: fmt.Sprintf("%s/api/book/%d.%s?from=opds", prefix, b.ID, lower),
		})
	}
	cover := fmt.Sprintf("%s/get/cover/%d.jpg", prefix, b.ID)
	entry.Links = append(entry.Links,
		atomLinkXML{Rel: "http://opds-spec.org/cover", Type: "image/jpeg", Href: cover},
		atomLinkXML{Rel: "http://opds-spec.org/thumbnail", Type: "image/jpeg", Href: cover},
	)
	return entry
}

// opdsFormatSeriesIndex 渲染丛书序号。
func opdsFormatSeriesIndex(idx float64) string {
	if idx == float64(int64(idx)) {
		return strconv.FormatInt(int64(idx), 10)
	}
	return strconv.FormatFloat(idx, 'f', -1, 64)
}

// opdsMediaType 按扩展名给出媒体类型。
func opdsMediaType(ext string) string {
	switch ext {
	case "epub":
		return "application/epub+zip"
	case "mobi":
		return "application/x-mobipocket-ebook"
	case "azw3":
		return "application/x-mobi8-ebook"
	case "pdf":
		return "application/pdf"
	case "txt":
		return "text/plain"
	case "html", "htmlz":
		return "text/html"
	case "rtf":
		return "application/rtf"
	case "fb2":
		return "application/fb2"
	case "djvu":
		return "image/vnd.djvu"
	case "cbz":
		return "application/x-cbz"
	case "cbr":
		return "application/x-cbr"
	case "zip":
		return "application/zip"
	}
	return ""
}

// ---- 数据层 ----

// opdsMaxItems 读取 opds_max_items。
func opdsMaxItems(cfg OpdsConfig) int {
	n := int(toIntSetting(cfg.Settings, "opds_max_items", 30))
	if n < 1 {
		n = 30
	}
	return n
}

// opdsMaxUngroupedItems 读取 opds_max_ungrouped_items。
func opdsMaxUngroupedItems(cfg OpdsConfig) int {
	n := int(toIntSetting(cfg.Settings, "opds_max_ungrouped_items", 100))
	if n < 1 {
		n = 100
	}
	return n
}

// opdsMaxTagsShown 读取 opds_max_tags_shown。
func opdsMaxTagsShown(cfg OpdsConfig) int {
	n := int(toIntSetting(cfg.Settings, "opds_max_tags_shown", 5))
	if n < 1 {
		n = 5
	}
	return n
}

// opdsPrefix 返回资源前缀。
func opdsPrefix(cfg OpdsConfig) string {
	if p := settingString(cfg.Settings, "opds_url_prefix"); p != "" {
		return p
	}
	if cfg.PublicURL != nil {
		return cfg.PublicURL("")
	}
	return ""
}

// opdsVisibleIDs 过滤掉当前请求方不可见的书籍。
func opdsVisibleIDs(cfg OpdsConfig, ctx *Context, ids []int64) []int64 {
	if cfg.CanViewBook == nil {
		return ids
	}
	out := make([]int64, 0, len(ids))
	for _, id := range ids {
		if cfg.CanViewBook(ctx, id) {
			out = append(out, id)
		}
	}
	return out
}

// opdsSearchIDs 执行搜索。
func opdsSearchIDs(cfg OpdsConfig, query string) ([]int64, error) {
	if cfg.Search != nil {
		return cfg.Search(query)
	}
	return library.Search(cfg.DB, query)
}

// opdsLastModified 取书库最后修改时间。
func opdsLastModified(cfg OpdsConfig) time.Time {
	raw, err := library.LastModified(cfg.DB)
	if err != nil || raw == "" {
		return time.Now()
	}
	for _, layout := range []string{"2006-01-02 15:04:05", "2006-01-02"} {
		if t, err := time.Parse(layout, raw); err == nil {
			return t
		}
	}
	return time.Now()
}

// opdsLoadBooks 按 id 批量取书数据。
func opdsLoadBooks(cfg OpdsConfig, ids []int64) ([]library.BookData, error) {
	if len(ids) == 0 {
		return []library.BookData{}, nil
	}
	return library.GetBooksData(cfg.DB, ids)
}

// opdsSortBooks 按字段排序书籍。
func opdsSortBooks(books []library.BookData, sortBy string, ascending bool) {
	sort.SliceStable(books, func(i, j int) bool {
		var less bool
		switch sortBy {
		case "timestamp":
			less = books[i].Timestamp < books[j].Timestamp
		case "series":
			if books[i].Series != books[j].Series {
				less = books[i].Series < books[j].Series
			} else {
				less = books[i].SeriesIdx < books[j].SeriesIdx
			}
		default:
			less = strings.ToLower(books[i].Title) < strings.ToLower(books[j].Title)
		}
		if ascending {
			return less
		}
		return !less
	})
}

// ---- 各 feed 构造 ----

// opdsAcquisitionFeed 构造书籍获取 feed。
func opdsAcquisitionFeed(cfg OpdsConfig, ctx *Context, ids []int64, offset int,
	pageURL, upURL, id string, sortBy string, ascending bool, feedTitle string) ([]byte, error) {
	if len(ids) == 0 {
		return nil, errOpdsNoBooks
	}
	books, err := opdsLoadBooks(cfg, ids)
	if err != nil {
		return nil, err
	}
	opdsSortBooks(books, sortBy, ascending)

	maxItems := opdsMaxItems(cfg)
	offsets, err := newOpdsOffsets(offset, maxItems, len(books))
	if err != nil {
		return nil, err
	}
	end := offsets.SliceUpperBound
	if end > len(books) {
		end = len(books)
	}
	page := books[offsets.Offset:end]

	updated := opdsLastModified(cfg)
	ctx.Writer.Header().Set("Content-Type", opdsContentType)
	ctx.Writer.Header().Set("Last-Modified", lastModifiedHeader(updated.Unix()))

	b := newOpdsFeed(cfg, id, feedTitle, "", updated).withNavLinks(offsets, pageURL, upURL)
	prefix := opdsPrefix(cfg)
	for _, book := range page {
		b.addEntry(opdsAcquisitionEntry(cfg, book, updated, prefix))
	}
	return b.bytes()
}

// opdsTopLevelFeed 构造顶层导航 feed。
func opdsTopLevelFeed(cfg OpdsConfig, ctx *Context) ([]byte, error) {
	cats := []struct{ title, desc, query string }{
		{"Newest", "Date", "Onewest"},
		{"Title", "Title", "Otitle"},
	}

	names, err := opdsCategoryNames(cfg)
	if err != nil {
		return nil, err
	}
	for _, name := range names {
		cats = append(cats, struct{ title, desc, query string }{name, name, "N" + name})
	}

	updated := opdsLastModified(cfg)
	ctx.Writer.Header().Set("Content-Type", opdsNavContentType)
	ctx.Writer.Header().Set("Last-Modified", lastModifiedHeader(updated.Unix()))

	b := newOpdsFeed(cfg, "urn:calibre:main", "", "Books in your library", updated)
	for _, c := range cats {
		b.addEntry(opdsNavCatalogEntry(cfg, updated,
			"By "+c.title, "Books sorted by "+c.desc, c.query))
	}
	return b.bytes()
}

// opdsCategoryNames 返回可展示的分类名（已排序）。
func opdsCategoryNames(cfg OpdsConfig) ([]string, error) {
	all, err := library.GetCategories(cfg.DB, "")
	if err != nil {
		return nil, err
	}
	_ = all
	// 逐分类查询，跳过空分类与 formats/identifiers。
	known := []string{"authors", "series", "tags", "publishers", "ratings", "languages"}
	out := []string{}
	for _, name := range known {
		cats, err := library.GetCategories(cfg.DB, name)
		if err != nil {
			return nil, err
		}
		if len(cats) == 0 {
			continue
		}
		out = append(out, name)
	}
	sort.Strings(out)
	return out, nil
}

// opdsNavCatalog 按 which 前缀分发到全部书籍或分类导航。
func opdsNavCatalog(cfg OpdsConfig, ctx *Context, which string, offset int) ([]byte, error) {
	if which == "" {
		return nil, errOpdsNotFound
	}
	pageURL := opdsURLFor(cfg, "opdsnavcatalog", map[string]string{"which": which})
	upURL := opdsURLFor(cfg, "opds", nil)

	decoded, err := opdsUnhexlify(which)
	if err != nil || decoded == "" {
		return nil, errOpdsNotFound
	}
	typeChar := decoded[:1]
	rest := decoded[1:]

	switch typeChar {
	case "O":
		return opdsAllBooks(cfg, ctx, rest, pageURL, upURL, offset)
	case "N":
		return opdsCategoryNav(cfg, ctx, rest, pageURL, upURL, offset)
	}
	return nil, errOpdsNotFound
}

// opdsAllBooks 构造「全部书籍」feed。
func opdsAllBooks(cfg OpdsConfig, ctx *Context, which, pageURL, upURL string, offset int) ([]byte, error) {
	if which != "title" && which != "newest" {
		return nil, errOpdsNotFound
	}
	sortBy := "title"
	ascending := true
	label := "Title"
	if which == "newest" {
		sortBy = "timestamp"
		ascending = false
		label = "Newest"
	}
	feedTitle := opdsDefaultFeedTitle(cfg) + " :: By " + label

	ids, err := opdsAllBookIDs(cfg)
	if err != nil {
		return nil, err
	}
	ids = opdsVisibleIDs(cfg, ctx, ids)
	return opdsAcquisitionFeed(cfg, ctx, ids, offset, pageURL, upURL,
		"calibre-all:"+sortBy, sortBy, ascending, feedTitle)
}

// opdsAllBookIDs 取全部书籍 id。
func opdsAllBookIDs(cfg OpdsConfig) ([]int64, error) {
	rows, err := cfg.DB.Query(`SELECT id FROM books ORDER BY id DESC`)
	if err != nil {
		return nil, fmt.Errorf("httpapi: 查询全部书籍失败: %w", err)
	}
	defer rows.Close()

	out := []int64{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("httpapi: 扫描书籍失败: %w", err)
		}
		out = append(out, id)
	}
	return out, rows.Err()
}

// opdsCategoryNav 构造分类导航 feed（条目少时直接列出，多时按首字母分组）。
func opdsCategoryNav(cfg OpdsConfig, ctx *Context, which, pageURL, upURL string, offset int) ([]byte, error) {
	cats, err := library.GetCategories(cfg.DB, which)
	if err != nil {
		return nil, err
	}
	if len(cats) == 0 {
		return nil, fmt.Errorf("Category %q not found", which)
	}

	updated := opdsLastModified(cfg)
	feedTitle := opdsDefaultFeedTitle(cfg) + " :: By " + which
	id := "calibre-category-feed:" + which
	maxItems := opdsMaxItems(cfg)

	if len(cats) <= opdsMaxUngroupedItems(cfg) {
		offsets, err := newOpdsOffsets(offset, maxItems, len(cats))
		if err != nil {
			return nil, err
		}
		end := offsets.SliceUpperBound
		if end > len(cats) {
			end = len(cats)
		}
		page := cats[offsets.Offset:end]

		ctx.Writer.Header().Set("Content-Type", opdsNavContentType)
		ctx.Writer.Header().Set("Last-Modified", lastModifiedHeader(updated.Unix()))

		b := newOpdsFeed(cfg, id, feedTitle, "", updated).withNavLinks(offsets, pageURL, upURL)
		baseHref := opdsBaseHref(cfg) + "/category/" + opdsHexlify(which)
		for _, item := range page {
			b.addEntry(opdsCatalogEntry(item, which, baseHref, updated, which == "search", false))
		}
		return b.bytes()
	}

	// 按首字母分组。
	counts := map[string]int{}
	for _, item := range cats {
		counts[strings.ToUpper(opdsFirstChar(item.Name))]++
	}
	letters := make([]string, 0, len(counts))
	for k := range counts {
		letters = append(letters, k)
	}
	sort.Strings(letters)

	offsets, err := newOpdsOffsets(offset, maxItems, len(letters))
	if err != nil {
		return nil, err
	}
	end := offsets.SliceUpperBound
	if end > len(letters) {
		end = len(letters)
	}
	page := letters[offsets.Offset:end]

	ctx.Writer.Header().Set("Content-Type", opdsNavContentType)
	ctx.Writer.Header().Set("Last-Modified", lastModifiedHeader(updated.Unix()))

	b := newOpdsFeed(cfg, id, feedTitle, "", updated).withNavLinks(offsets, pageURL, upURL)
	baseHref := opdsBaseHref(cfg) + "/categorygroup/" + opdsHexlify(which)
	for _, letter := range page {
		b.addEntry(opdsCatalogGroupEntry(letter, counts[letter], which, baseHref, updated))
	}
	return b.bytes()
}

// opdsCategoryGroup 构造某个字母分组下的条目 feed。
func opdsCategoryGroup(cfg OpdsConfig, ctx *Context, categoryHex, whichHex string, offset int) ([]byte, error) {
	if categoryHex == "" || whichHex == "" {
		return nil, errOpdsNotFound
	}
	category, err := opdsUnhexlify(categoryHex)
	if err != nil {
		return nil, errOpdsNotFound
	}
	which, err := opdsUnhexlify(whichHex)
	if err != nil {
		return nil, errOpdsNotFound
	}

	cats, err := library.GetCategories(cfg.DB, category)
	if err != nil {
		return nil, err
	}
	if len(cats) == 0 {
		return nil, fmt.Errorf("Category %q not found", category)
	}

	filtered := []library.Category{}
	for _, item := range cats {
		if strings.EqualFold(opdsFirstChar(item.Name), which) {
			filtered = append(filtered, item)
		}
	}
	if len(filtered) == 0 {
		return nil, fmt.Errorf("No items in group %q:%q", category, which)
	}

	updated := opdsLastModified(cfg)
	feedTitle := opdsDefaultFeedTitle(cfg) + " :: By " + category + " :: " + which
	id := "calibre-category-group-feed:" + category + ":" + which
	pageURL := opdsURLFor(cfg, "opdscategorygroup", map[string]string{
		"category": categoryHex, "which": whichHex,
	})
	upURL := opdsURLFor(cfg, "opdsnavcatalog", map[string]string{"which": opdsHexlify("N" + which)})

	maxItems := opdsMaxItems(cfg)
	offsets, err := newOpdsOffsets(offset, maxItems, len(filtered))
	if err != nil {
		return nil, err
	}
	end := offsets.SliceUpperBound
	if end > len(filtered) {
		end = len(filtered)
	}
	page := filtered[offsets.Offset:end]

	ctx.Writer.Header().Set("Content-Type", opdsNavContentType)
	ctx.Writer.Header().Set("Last-Modified", lastModifiedHeader(updated.Unix()))

	b := newOpdsFeed(cfg, id, feedTitle, "", updated).withNavLinks(offsets, pageURL, upURL)
	baseHref := opdsBaseHref(cfg) + "/category/" + opdsHexlify(category)
	for _, item := range page {
		b.addEntry(opdsCatalogEntry(item, category, baseHref, updated, false, category != item.Name))
	}
	return b.bytes()
}

// opdsCategory 构造某个分类项下的书籍 feed。
func opdsCategory(cfg OpdsConfig, ctx *Context, categoryHex, whichHex string, offset int) ([]byte, error) {
	if categoryHex == "" || whichHex == "" {
		return nil, errOpdsNotFound
	}
	pageURL := opdsURLFor(cfg, "opdscategory", map[string]string{
		"category": categoryHex, "which": whichHex,
	})
	upURL := opdsURLFor(cfg, "opdsnavcatalog", map[string]string{"which": categoryHex})

	category, err := opdsUnhexlify(categoryHex)
	if err != nil {
		return nil, errOpdsNotFound
	}
	which, err := opdsUnhexlify(whichHex)
	if err != nil || which == "" {
		return nil, errOpdsNotFound
	}
	typeChar := which[:1]
	rest := which[1:]

	// 搜索分类：which 就是查询词。
	if category == "search" {
		ids, err := opdsSearchIDs(cfg, `search:"`+rest+`"`)
		if err != nil {
			return nil, fmt.Errorf("Search: %q not understood", rest)
		}
		ids = opdsVisibleIDs(cfg, ctx, ids)
		return opdsAcquisitionFeed(cfg, ctx, ids, offset, pageURL, upURL,
			"calibre-search:"+rest, "title", true, "")
	}

	if typeChar != "I" {
		return nil, fmt.Errorf("Non id categories not supported")
	}

	// which 形如 "<id>:<category>"。
	sep := strings.Index(rest, ":")
	if sep < 0 {
		return nil, fmt.Errorf("Tag %q not found", rest)
	}
	itemID, err := strconv.ParseInt(rest[:sep], 10, 64)
	if err != nil {
		return nil, fmt.Errorf("Tag %q not found", rest)
	}
	category = rest[sep+1:]

	query := category
	if query == "news" {
		query = "tags"
	}
	ids, err := library.GetBooksForCategory(cfg.DB, query, itemID)
	if err != nil {
		return nil, err
	}
	ids = opdsVisibleIDs(cfg, ctx, ids)

	sortBy := "title"
	if category == "series" {
		sortBy = "series"
	}
	return opdsAcquisitionFeed(cfg, ctx, ids, offset, pageURL, upURL,
		"calibre-category:"+category+":"+strconv.FormatInt(itemID, 10), sortBy, true, "")
}

// opdsSearch 构造搜索结果 feed。
func opdsSearch(cfg OpdsConfig, ctx *Context, query string, offset int) ([]byte, error) {
	if query == "" {
		return nil, errOpdsNotFound
	}
	ids, err := opdsSearchIDs(cfg, query)
	if err != nil {
		return nil, fmt.Errorf("Search: %q not understood", query)
	}
	ids = opdsVisibleIDs(cfg, ctx, ids)
	if len(ids) == 0 {
		return nil, fmt.Errorf("No results found")
	}
	pageURL := opdsURLFor(cfg, "opdssearch", map[string]string{"query": query})
	return opdsAcquisitionFeed(cfg, ctx, ids, offset, pageURL, opdsURLFor(cfg, "opds", nil),
		"calibre-search:"+query, "title", true, "")
}

// ---- 错误 ----

// errOpdsNotFound 表示 OPDS 资源不存在。
var errOpdsNotFound = fmt.Errorf("Not found")

// errOpdsNoBooks 表示没有找到书籍。
var errOpdsNoBooks = fmt.Errorf("No books found")

// ---- Handler ----

// opdsHandler 包装 OPDS 处理逻辑：统一错误映射与 OPDS 开关检查。
func opdsHandler(cfg OpdsConfig, fn func(ctx *Context) ([]byte, error)) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if !settingBool(cfg.Settings, "OPDS_ENABLED", false) {
			http.Redirect(ctx.Writer, ctx.Request, "/?err=opds_disabled&msg=OPDS服务已关闭", http.StatusFound)
			return nil, nil
		}
		body, err := fn(ctx)
		if err != nil {
			http.Error(ctx.Writer, err.Error(), http.StatusNotFound)
			return nil, nil
		}
		_, _ = ctx.Writer.Write(body)
		return nil, nil
	}
}

// opdsOffsetArg 解析 offset 查询参数。
func opdsOffsetArg(ctx *Context) (int, error) {
	raw := ctx.Query("offset")
	if raw == "" {
		return 0, nil
	}
	n, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil {
		return 0, errOpdsNotFound
	}
	return n, nil
}

// OpdsIndexHandler 实现 /opds/。
func OpdsIndexHandler(cfg OpdsConfig) HandlerFunc {
	return opdsHandler(cfg, func(ctx *Context) ([]byte, error) {
		return opdsTopLevelFeed(cfg, ctx)
	})
}

// OpdsNavHandler 实现 /opds/nav/<which>。
func OpdsNavHandler(cfg OpdsConfig) HandlerFunc {
	return opdsHandler(cfg, func(ctx *Context) ([]byte, error) {
		offset, err := opdsOffsetArg(ctx)
		if err != nil {
			return nil, err
		}
		return opdsNavCatalog(cfg, ctx, ctx.Param(0), offset)
	})
}

// OpdsCategoryHandler 实现 /opds/category/<category>/<which>。
func OpdsCategoryHandler(cfg OpdsConfig) HandlerFunc {
	return opdsHandler(cfg, func(ctx *Context) ([]byte, error) {
		offset, err := opdsOffsetArg(ctx)
		if err != nil {
			return nil, err
		}
		return opdsCategory(cfg, ctx, ctx.Param(0), ctx.Param(1), offset)
	})
}

// OpdsCategoryGroupHandler 实现 /opds/categorygroup/<category>/<which>。
func OpdsCategoryGroupHandler(cfg OpdsConfig) HandlerFunc {
	return opdsHandler(cfg, func(ctx *Context) ([]byte, error) {
		offset, err := opdsOffsetArg(ctx)
		if err != nil {
			return nil, err
		}
		return opdsCategoryGroup(cfg, ctx, ctx.Param(0), ctx.Param(1), offset)
	})
}

// OpdsSearchHandler 实现 /opds/search/<which>。
func OpdsSearchHandler(cfg OpdsConfig) HandlerFunc {
	return opdsHandler(cfg, func(ctx *Context) ([]byte, error) {
		offset, err := opdsOffsetArg(ctx)
		if err != nil {
			return nil, err
		}
		return opdsSearch(cfg, ctx, ctx.Param(0), offset)
	})
}

// ---- 路由表 ----

// OpdsRouteSpecs 返回 OPDS 模块接管的 5 条路由。
func OpdsRouteSpecs(cfg OpdsConfig) []RouteSpec {
	methods := []string{http.MethodGet, http.MethodPost}
	return []RouteSpec{
		{Pattern: rOpdsIndex, Methods: methods, Handler: OpdsIndexHandler(cfg)},
		{Pattern: rOpdsNav, Methods: methods, Handler: OpdsNavHandler(cfg)},
		{Pattern: rOpdsCategory, Methods: methods, Handler: OpdsCategoryHandler(cfg)},
		{Pattern: rOpdsCatGroup, Methods: methods, Handler: OpdsCategoryGroupHandler(cfg)},
		{Pattern: rOpdsSearch, Methods: methods, Handler: OpdsSearchHandler(cfg)},
	}
}
