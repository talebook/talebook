package httpapi

import (
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"testing"
	"time"
)

func sampleBook() Book {
	return Book{
		ID:               42,
		Title:            "三体",
		Rating:           8,
		Timestamp:        time.Date(2026, 10, 9, 12, 0, 0, 0, time.UTC),
		Pubdate:          time.Date(2008, 1, 1, 0, 0, 0, 0, time.UTC),
		Authors:          []string{"刘慈欣"},
		AuthorSort:       "刘慈欣",
		Tags:             []string{"科幻", "中国文学"},
		Publisher:        "重庆出版社",
		Comments:         "地球往事三部曲第一部。",
		Series:           "地球往事",
		Language:         "zho",
		ISBN:             "9787536692930",
		Collector:        "reader",
		CountVisit:       7,
		CountDownload:    3,
		MediaType:        "ebook",
		MediaTypeLocked:  true,
		AvailableFormats: []string{"EPUB", "MOBI"},
		FormatSizes:      map[string]int64{"EPUB": 1024, "MOBI": 2048},
		Scope:            "public",
	}
}

func sampleFormatter() *Formatter {
	return &Formatter{
		Book:   sampleBook(),
		CDNURL: "https://cdn.example.com",
		APIURL: "https://api.example.com",
	}
}

func keysOf(m map[string]any) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

// TestSimpleFormatFieldSetMatchesPython 断言 SimpleFormat 的字段集合
// 与 Python 版 SimpleBookFormatter.format() 逐字段一致。
func TestSimpleFormatFieldSetMatchesPython(t *testing.T) {
	got := keysOf(sampleFormatter().SimpleFormat())
	want := append([]string{}, SimpleFormatFields...)
	sort.Strings(want)

	if len(got) != len(want) {
		t.Fatalf("字段数 = %d, want %d\ngot:  %v\nwant: %v", len(got), len(want), got, want)
	}
	for i := range got {
		if got[i] != want[i] {
			t.Errorf("字段[%d] = %q, want %q", i, got[i], want[i])
		}
	}
}

// TestSimpleFormatFieldSetMatchesPythonSource 回到 Python 源码提取字段名，
// 断言我们的常量表没有漏抄或抄错。
func TestSimpleFormatFieldSetMatchesPythonSource(t *testing.T) {
	root := repoRoot(t)
	data, err := os.ReadFile(filepath.Join(root, "webserver", "utils.py"))
	if err != nil {
		t.Fatalf("read utils.py: %v", err)
	}
	src := string(data)

	// 定位 SimpleBookFormatter.format 的 return { ... } 块
	start := strings.Index(src, "class SimpleBookFormatter")
	if start < 0 {
		t.Fatal("未找到 SimpleBookFormatter")
	}
	end := strings.Index(src[start:], "class BookFormatter")
	if end < 0 {
		t.Fatal("未找到 BookFormatter")
	}
	block := src[start : start+end]

	// 提取 "key": 形式的字段名
	re := regexp.MustCompile(`(?m)^\s*"([a-z_]+)":`)
	matches := re.FindAllStringSubmatch(block, -1)
	pythonFields := map[string]bool{}
	for _, m := range matches {
		pythonFields[m[1]] = true
	}

	for _, f := range SimpleFormatFields {
		if !pythonFields[f] {
			t.Errorf("常量表字段 %q 在 Python 源码中不存在", f)
		}
	}
	for f := range pythonFields {
		found := false
		for _, g := range SimpleFormatFields {
			if g == f {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("Python 源码字段 %q 未出现在常量表中", f)
		}
	}
}

// TestFormatAddsExpectedExtras 断言 Format() 在基础字段上追加的字段集合。
func TestFormatAddsExpectedExtras(t *testing.T) {
	base := sampleFormatter().SimpleFormat()
	full := sampleFormatter().Format(false, false)

	for _, f := range FormatExtraFields {
		if _, ok := full[f]; !ok {
			t.Errorf("Format() 缺少字段 %q", f)
		}
	}
	if len(full) != len(base)+len(FormatExtraFields) {
		t.Errorf("Format() 字段数 = %d, want %d", len(full), len(base)+len(FormatExtraFields))
	}
}

// TestFormatWithFilesAndPerms 断言 with_files / with_perms 的追加行为。
func TestFormatWithFilesAndPerms(t *testing.T) {
	f := sampleFormatter()
	f.UserID = 7
	f.IsAdmin = true

	withFiles := f.Format(true, false)
	if _, ok := withFiles["files"]; !ok {
		t.Error("with_files=true 时缺少 files 字段")
	}
	if _, ok := withFiles["is_owner"]; ok {
		t.Error("with_perms=false 时不应有 is_owner")
	}

	withPerms := f.Format(false, true)
	if _, ok := withPerms["is_owner"]; !ok {
		t.Error("with_perms=true 时缺少 is_owner")
	}
	if _, ok := withPerms["files"]; ok {
		t.Error("with_files=false 时不应有 files")
	}
}

// TestFilesItemsMatchPython 断言 files[] 每项含 format/size/href/online_readable。
func TestFilesItemsMatchPython(t *testing.T) {
	files := sampleFormatter().Files()
	if len(files) != 2 {
		t.Fatalf("files 数 = %d, want 2", len(files))
	}

	if files[0].Format != "EPUB" || files[0].Size != 1024 {
		t.Errorf("files[0] = %+v", files[0])
	}
	if files[0].Href != "https://cdn.example.com/api/book/42.EPUB" {
		t.Errorf("files[0].Href = %q", files[0].Href)
	}
	if !files[0].OnlineReadable {
		t.Error("EPUB 应支持在线阅读")
	}
	// MOBI 属于 EBOOK_MEDIA_FORMATS，因此同样可在线阅读
	if files[1].Format != "MOBI" || !files[1].OnlineReadable {
		t.Errorf("files[1] = %+v，MOBI 应支持在线阅读", files[1])
	}
}

// TestFilesSkipsUnknownSize 断言没有 size 的格式被跳过（对应 Python 的 continue）。
func TestFilesSkipsUnknownSize(t *testing.T) {
	f := sampleFormatter()
	f.Book.AvailableFormats = []string{"EPUB", "AZW3"}
	f.Book.FormatSizes = map[string]int64{"EPUB": 1024}

	files := f.Files()
	if len(files) != 1 {
		t.Fatalf("files 数 = %d, want 1（AZW3 无 size 应被跳过）", len(files))
	}
	if files[0].Format != "EPUB" {
		t.Errorf("files[0].Format = %q", files[0].Format)
	}
}

// TestPrivateScopeUsesAPIURL 断言私藏资源使用 APIURL（对应 _book_resource_url）。
func TestPrivateScopeUsesAPIURL(t *testing.T) {
	f := sampleFormatter()
	f.Book.Scope = "private"

	data := f.Format(true, false)
	img, _ := data["img"].(string)
	if !strings.HasPrefix(img, "https://api.example.com") {
		t.Errorf("私藏 img = %q，应使用 APIURL", img)
	}

	files := f.Files()
	if !strings.HasPrefix(files[0].Href, "https://api.example.com") {
		t.Errorf("私藏 href = %q，应使用 APIURL", files[0].Href)
	}
}

// TestPublicScopeUsesCDNURL 断言公开资源使用 CDNURL。
func TestPublicScopeUsesCDNURL(t *testing.T) {
	data := sampleFormatter().Format(true, false)
	img, _ := data["img"].(string)
	if !strings.HasPrefix(img, "https://cdn.example.com") {
		t.Errorf("公开 img = %q，应使用 CDNURL", img)
	}
}

// TestEmptyScopeDefaultsToPublic 断言空 scope 回退为 public。
func TestEmptyScopeDefaultsToPublic(t *testing.T) {
	f := sampleFormatter()
	f.Book.Scope = ""
	if got := f.Format(false, false)["scope"]; got != "public" {
		t.Errorf("scope = %v, want public", got)
	}
}

// TestDefaultsMatchPython 断言空值回退语义与 Python 版一致。
func TestDefaultsMatchPython(t *testing.T) {
	f := &Formatter{
		Book: Book{
			ID:    1,
			Title: "无元数据",
			// 其余字段全空
		},
		CDNURL: "https://cdn.example.com",
		APIURL: "https://api.example.com",
	}
	data := f.Format(false, false)

	if data["author_sort"] != UnknownText {
		t.Errorf("author_sort = %v, want %q", data["author_sort"], UnknownText)
	}
	if data["publisher"] != UnknownText {
		t.Errorf("publisher = %v, want %q", data["publisher"], UnknownText)
	}
	if data["comments"] != NoCommentsText {
		t.Errorf("comments = %v, want %q", data["comments"], NoCommentsText)
	}
	if data["media_type"] != MediaTypeUnknown {
		t.Errorf("media_type = %v, want %q", data["media_type"], MediaTypeUnknown)
	}
	// series/language/isbn/collector 空值应为 nil，不是 "Unknown"
	for _, k := range []string{"series", "language", "isbn", "collector"} {
		if data[k] != nil {
			t.Errorf("%s = %v, want nil", k, data[k])
		}
	}
	// 空 timestamp 应回退为 Unknown
	if data["timestamp"] != UnknownText {
		t.Errorf("timestamp = %v, want %q", data["timestamp"], UnknownText)
	}
}

// TestJoinsMatchPython 断言 author/tag 的连接符与 Python 版一致。
func TestJoinsMatchPython(t *testing.T) {
	f := sampleFormatter()
	f.Book.Authors = []string{"刘慈欣", "李淼"}
	f.Book.Tags = []string{"科幻", "中国文学", "雨果奖"}

	data := f.Format(false, false)
	if data["author"] != "刘慈欣, 李淼" {
		t.Errorf("author = %q, want %q", data["author"], "刘慈欣, 李淼")
	}
	if data["tag"] != "科幻 / 中国文学 / 雨果奖" {
		t.Errorf("tag = %q, want %q", data["tag"], "科幻 / 中国文学 / 雨果奖")
	}
}

// TestURLsMatchPython 断言 author_url / publisher_url 的拼接格式。
func TestURLsMatchPython(t *testing.T) {
	data := sampleFormatter().Format(false, false)
	if data["author_url"] != "https://api.example.com/author/刘慈欣" {
		t.Errorf("author_url = %q", data["author_url"])
	}
	if data["publisher_url"] != "https://api.example.com/publisher/重庆出版社" {
		t.Errorf("publisher_url = %q", data["publisher_url"])
	}
}

// TestOnlineReadableFormats 断言在线阅读格式集合与 Python 版一致。
//
// ONLINE_READ_FORMATS = EBOOK_MEDIA_FORMATS | COMIC_CONTAINER_FORMATS，
// 因此 azw/azw3/epub/mobi/pdf/txt/cbz/zip/cbr/rar 全部可在线阅读。
func TestOnlineReadableFormats(t *testing.T) {
	cases := []struct {
		formats []string
		want    bool
	}{
		{[]string{"EPUB"}, true},
		{[]string{"TXT"}, true},
		{[]string{"PDF"}, true},
		{[]string{"MOBI"}, true},
		{[]string{"AZW3"}, true},
		{[]string{"AZW"}, true},
		{[]string{"CBZ"}, true},
		{[]string{"CBR"}, true},
		{[]string{"ZIP"}, true},
		{[]string{"RAR"}, true},
		{[]string{"DJVU"}, false}, // MANAGED_DOCUMENT_FORMATS 不在在线阅读集合
		{[]string{"UVZ"}, false},
		{[]string{"MOBI", "EPUB"}, true},
		{[]string{}, false},
		{[]string{"epub"}, true}, // 大小写不敏感
	}
	for _, c := range cases {
		if got := OnlineReadable(c.formats); got != c.want {
			t.Errorf("OnlineReadable(%v) = %v, want %v", c.formats, got, c.want)
		}
	}
}

// TestOnlineReadableFormatsMatchPythonSource 回到 Python 源码确认格式集合。
//
// 逐字解析 media_analysis.py 的四个 frozenset 定义，推导出
// ONLINE_READ_FORMATS，再与 Go 侧常量表逐项比对。
func TestOnlineReadableFormatsMatchPythonSource(t *testing.T) {
	root := repoRoot(t)
	data, err := os.ReadFile(filepath.Join(root, "webserver", "services", "media_analysis.py"))
	if err != nil {
		t.Fatalf("read media_analysis.py: %v", err)
	}
	src := string(data)

	parseSet := func(name string) map[string]bool {
		re := regexp.MustCompile(`(?m)^` + name + ` = frozenset\(\(([^)]*)\)\)`)
		m := re.FindStringSubmatch(src)
		if m == nil {
			t.Fatalf("未找到 %s 定义", name)
		}
		out := map[string]bool{}
		for _, tok := range strings.Split(m[1], ",") {
			tok = strings.Trim(strings.TrimSpace(tok), `"'`)
			if tok != "" {
				out[tok] = true
			}
		}
		return out
	}

	ebook := parseSet("EBOOK_MEDIA_FORMATS")
	zipFmts := parseSet("COMIC_ZIP_FORMATS")
	rarFmts := parseSet("COMIC_RAR_FORMATS")

	want := map[string]bool{}
	for _, s := range []map[string]bool{ebook, zipFmts, rarFmts} {
		for f := range s {
			want[f] = true
		}
	}

	if len(want) != len(onlineReadableFormats) {
		t.Fatalf("格式数 = %d, want %d\ngot:  %v\nwant: %v",
			len(onlineReadableFormats), len(want), onlineReadableFormats, want)
	}
	for f := range want {
		if !onlineReadableFormats[f] {
			t.Errorf("Python 有格式 %q，Go 侧缺失", f)
		}
	}
	for f := range onlineReadableFormats {
		if !want[f] {
			t.Errorf("Go 侧有格式 %q，Python 没有", f)
		}
	}
}

// TestPermissionsMatchPython 断言权限字段语义。
func TestPermissionsMatchPython(t *testing.T) {
	cases := []struct {
		name    string
		userID  int64
		isAdmin bool
		isOwner bool
		want    bool
	}{
		{"游客", 0, false, false, false},
		{"普通用户非所有者", 7, false, false, false},
		{"普通用户是所有者", 7, false, true, true},
		{"管理员", 7, true, false, true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			f := sampleFormatter()
			f.UserID, f.IsAdmin, f.IsBookOwner = c.userID, c.isAdmin, c.isOwner
			perms := f.Permissions()
			if perms["is_public"] != true {
				t.Errorf("is_public = %v, want true", perms["is_public"])
			}
			if perms["is_owner"] != c.want {
				t.Errorf("is_owner = %v, want %v", perms["is_owner"], c.want)
			}
		})
	}
}

// TestImgThumbFormat 断言 img/thumb 的 URL 模板与 Python 版一致。
func TestImgThumbFormat(t *testing.T) {
	data := sampleFormatter().Format(false, false)
	ts := time.Date(2026, 10, 9, 12, 0, 0, 0, time.UTC).Unix()

	wantImg := "https://cdn.example.com/get/cover/42.jpg?t=" + itoa(ts)
	wantThumb := "https://cdn.example.com/get/thumb_60x80/42.jpg?t=" + itoa(ts)

	if data["img"] != wantImg {
		t.Errorf("img = %q, want %q", data["img"], wantImg)
	}
	if data["thumb"] != wantThumb {
		t.Errorf("thumb = %q, want %q", data["thumb"], wantThumb)
	}
}

func itoa(n int64) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}
