package httpapi

import (
	"fmt"
	"strings"
	"time"
)

// 与 Python 版 webserver/utils.py 一致的常量。
const (
	// UnknownText 对应 Python 版 _("Unknown")。
	UnknownText = "Unknown"
	// NoCommentsText 对应 Python 版 _("暂无简介")。
	NoCommentsText = "暂无简介"
	// MediaTypeUnknown 对应 Python 版 MEDIA_TYPE_UNKNOWN。
	MediaTypeUnknown = "unknown"
)

// onlineReadableFormats 对应 Python 版 webserver/services/media_analysis.py 的
// ONLINE_READ_FORMATS = EBOOK_MEDIA_FORMATS | COMIC_CONTAINER_FORMATS。
//
// 注意：不是只有 EPUB/TXT/PDF——漫画容器格式（cbz/zip/cbr/rar）同样可在线阅读。
var onlineReadableFormats = map[string]bool{
	// EBOOK_MEDIA_FORMATS
	"azw":  true,
	"azw3": true,
	"epub": true,
	"mobi": true,
	"pdf":  true,
	"txt":  true,
	// COMIC_ZIP_FORMATS
	"cbz": true,
	"zip": true,
	// COMIC_RAR_FORMATS
	"cbr": true,
	"rar": true,
}

// Book 是 compat 层需要的书籍数据视图。
//
// 字段刻意与 Python 版 book dict 的键同名，便于逐字段比对。
type Book struct {
	ID              int64
	Title           string
	Rating          float64
	Timestamp       time.Time
	Pubdate         time.Time
	Authors         []string
	AuthorSort      string
	Tags            []string
	Publisher       string
	Comments        string
	Series          string
	Language        string
	ISBN            string
	Collector       string
	CountVisit      int64
	CountDownload   int64
	MediaType       string
	MediaTypeLocked bool
	// AvailableFormats 是格式名列表，如 ["EPUB", "MOBI"]。
	AvailableFormats []string
	// FormatSizes 是格式名到字节数的映射。
	FormatSizes map[string]int64
	// Scope 是 "public" 或 "private"。
	Scope string
}

// Formatter 对应 Python 版的 BookFormatter。
type Formatter struct {
	Book   Book
	CDNURL string
	APIURL string
	// UserID 与 IsAdmin / IsBookOwner 用于 with_perms。
	UserID      int64
	IsAdmin     bool
	IsBookOwner bool
}

// resourceURL 对应 Python 版 _book_resource_url()：
// 私藏资源需要携带应用域名的认证 Cookie，公开资源可继续使用 CDN。
func (f *Formatter) resourceURL() string {
	if f.Book.Scope == "private" {
		return f.APIURL
	}
	return f.CDNURL
}

// val 对应 Python 版 SimpleBookFormatter.val()：
// 空值回退到 default，datetime 格式化为 YYYY-MM-DD。
func val(v string, def string) string {
	if v == "" {
		return def
	}
	return v
}

func valInt(v int64, def int64) int64 {
	if v == 0 {
		return def
	}
	return v
}

func formatDate(t time.Time) string {
	if t.IsZero() {
		return UnknownText
	}
	return fmt.Sprintf("%04d-%02d-%02d", t.Year(), t.Month(), t.Day())
}

// OnlineReadable 对应 Python 版 online_readable_formats()。
//
// Python 侧经 normalized_media_formats() 做小写归一，因此这里也大小写不敏感。
func OnlineReadable(formats []string) bool {
	for _, f := range formats {
		if onlineReadableFormats[strings.ToLower(f)] {
			return true
		}
	}
	return false
}

// SimpleFormat 对应 Python 版 SimpleBookFormatter.format()，
// 返回恰好 22 个字段。
func (f *Formatter) SimpleFormat() map[string]any {
	b := f.Book
	ts := b.Timestamp.Unix()
	res := f.resourceURL()

	return map[string]any{
		"id":          b.ID,
		"title":       b.Title,
		"rating":      b.Rating,
		"timestamp":   formatDate(b.Timestamp),
		"pubdate":     formatDate(b.Pubdate),
		"author":      strings.Join(b.Authors, ", "),
		"authors":     b.Authors,
		"author_sort": val(b.AuthorSort, UnknownText),
		"tag":         strings.Join(b.Tags, " / "),
		"tags":        b.Tags,
		"publisher":   val(b.Publisher, UnknownText),
		"comments":    val(b.Comments, NoCommentsText),
		"series":      nullable(b.Series),
		"language":    nullable(b.Language),
		"isbn":        nullable(b.ISBN),
		"img":         fmt.Sprintf("%s/get/cover/%d.jpg?t=%d", res, b.ID, ts),
		"thumb":       fmt.Sprintf("%s/get/thumb_60x80/%d.jpg?t=%d", res, b.ID, ts),
		// 额外填充的字段
		"collector":         nullable(b.Collector),
		"count_visit":       valInt(b.CountVisit, 0),
		"count_download":    valInt(b.CountDownload, 0),
		"media_type":        val(b.MediaType, MediaTypeUnknown),
		"media_type_locked": b.MediaTypeLocked,
		"online_readable":   OnlineReadable(b.AvailableFormats),
	}
}

// nullable 对应 Python 版 val(k, None)：空值返回 nil。
func nullable(v string) any {
	if v == "" {
		return nil
	}
	return v
}

// File 对应 Python 版 get_files() 里每个 files[] 项。
type File struct {
	Format         string `json:"format"`
	Size           int64  `json:"size"`
	Href           string `json:"href"`
	OnlineReadable bool   `json:"online_readable"`
}

// Files 对应 Python 版 BookFormatter.get_files()。
func (f *Formatter) Files() []File {
	res := f.resourceURL()
	out := make([]File, 0, len(f.Book.AvailableFormats))
	for _, fmtName := range f.Book.AvailableFormats {
		size, ok := f.Book.FormatSizes[fmtName]
		if !ok {
			// Python 版在 sizeof_format 抛异常时 continue，跳过该格式。
			continue
		}
		out = append(out, File{
			Format:         fmtName,
			Size:           size,
			Href:           fmt.Sprintf("%s/api/book/%d.%s", res, f.Book.ID, fmtName),
			OnlineReadable: OnlineReadable([]string{fmtName}),
		})
	}
	return out
}

// Permissions 对应 Python 版 get_permissions()。
func (f *Formatter) Permissions() map[string]any {
	isOwner := f.UserID != 0 && (f.IsAdmin || f.IsBookOwner)
	return map[string]any{
		"is_public": true,
		"is_owner":  isOwner,
	}
}

// Format 对应 Python 版 BookFormatter.format()。
//
// 基础字段恒为 22 个；withFiles 追加 files；withPerms 追加 is_public/is_owner；
// 最后恒追加 scope。
func (f *Formatter) Format(withFiles, withPerms bool) map[string]any {
	data := f.SimpleFormat()

	data["author_url"] = f.APIURL + "/author/" + val(f.Book.AuthorSort, UnknownText)
	data["publisher_url"] = f.APIURL + "/publisher/" + val(f.Book.Publisher, UnknownText)

	if withFiles {
		data["files"] = f.Files()
	}
	if withPerms {
		for k, v := range f.Permissions() {
			data[k] = v
		}
	}

	scope := f.Book.Scope
	if scope == "" {
		scope = "public"
	}
	data["scope"] = scope

	return data
}

// SimpleFormatFields 是 SimpleFormat() 必须产出的字段名集合。
// 测试用它断言字段集合与 Python 版一致。
var SimpleFormatFields = []string{
	"id", "title", "rating", "timestamp", "pubdate",
	"author", "authors", "author_sort", "tag", "tags",
	"publisher", "comments", "series", "language", "isbn",
	"img", "thumb",
	"collector", "count_visit", "count_download",
	"media_type", "media_type_locked", "online_readable",
}

// FormatExtraFields 是 Format() 在 SimpleFormat 之上追加的字段。
var FormatExtraFields = []string{"author_url", "publisher_url", "scope"}
