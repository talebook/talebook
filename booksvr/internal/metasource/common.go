package metasource

import (
	"strconv"
	"strings"
	"time"
)

// dateFormats 复刻 webserver/plugins/meta/common.py 的 str2date 格式表。
//
// Python 侧用 `_()` 取本地化格式，默认语言 zh-CN 下三个中文格式原样保留；
// en-US 下分别变为 "%Y"、"%Y-%m"、"%Y-%m-%d"。这里按语言给出两张表。
var dateFormats = map[string][]string{
	"zh-CN": {"%Y-%m-%d", "%Y/%m/%d", "%Y-%m", "%Y年", "%Y年%m月", "%Y年%m月%d日", "%Y"},
	"en-US": {"%Y-%m-%d", "%Y/%m/%d", "%Y-%m", "%Y", "%Y-%m", "%Y-%m-%d", "%Y"},
}

// Str2Date 复刻 common.str2date：按格式表逐个尝试，全部失败返回 nil。
//
// 解析结果统一带 UTC 时区，对齐 Python 的 replace(tzinfo=timezone.utc)。
func Str2Date(s string, lang string) *time.Time {
	formats, ok := dateFormats[lang]
	if !ok {
		formats = dateFormats["zh-CN"]
	}
	return parseWithFormats(s, formats)
}

// doubanDateFormats 复刻 douban_v2/api.py 的 _str2date 格式表（不依赖 i18n）。
var doubanDateFormats = []string{
	"%Y-%m-%d", "%Y/%m/%d", "%Y-%m", "%Y年%m月%d日", "%Y年%m月", "%Y年", "%Y",
}

// DoubanStr2Date 复刻 douban_v2 的 _str2date。
func DoubanStr2Date(s string) *time.Time {
	return parseWithFormats(s, doubanDateFormats)
}

// formatUTCDate 把时间格式化为 Python datetime.isoformat() 风格。
//
// Python 的 `datetime(2024,1,1,tzinfo=utc).isoformat()` 得到
// "2024-01-01T00:00:00+00:00"。
func formatUTCDate(t time.Time) string {
	u := t.UTC()
	return u.Format("2006-01-02T15:04:05") + "+00:00"
}

// pyIntFloat 复刻 int(float(text))：先按浮点解析再向零截断。
//
// 解析失败返回 (0, false)，对齐 Python 抛 ValueError 的情形。
func pyIntFloat(text string) (int, bool) {
	f, err := strconv.ParseFloat(pyStrip(text), 64)
	if err != nil {
		return 0, false
	}
	return int(f), true
}

// stripBookMarks 复刻 re.sub(r"[《》「」『』【】〔〕<>]", "", title)。
//
// 剥除书名号等标点，避免干扰模型识别。
func stripBookMarks(title string) string {
	var b strings.Builder
	b.Grow(len(title))
	for _, r := range title {
		switch r {
		case '《', '》', '「', '」', '『', '』', '【', '】', '〔', '〕', '<', '>':
			continue
		}
		b.WriteRune(r)
	}
	return b.String()
}
