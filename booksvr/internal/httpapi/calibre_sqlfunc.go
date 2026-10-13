package httpapi

import (
	"crypto/rand"
	"database/sql/driver"
	"fmt"
	"regexp"
	"strings"
	"sync"

	"modernc.org/sqlite"
)

// Calibre 在打开书库连接时注册两个自定义 SQL 函数（见 calibre/db/backend.py:383-386）：
//
//	title_sort(title)  → calibre.ebooks.metadata.title_sort
//	uuid4()            → str(uuid.uuid4())
//
// 书库 schema 的 books_insert_trg 触发器会调用它们：
//
//	CREATE TRIGGER books_insert_trg AFTER INSERT ON books
//	BEGIN
//	    UPDATE books SET sort=title_sort(NEW.title), uuid=uuid4() WHERE id=NEW.id;
//	END
//
// 因此任何 INSERT INTO books 都要求这两个函数存在；不注册会报
// `no such function: title_sort`。Go 侧此前未注册，导致真实 Calibre 书库导入失败
// （单元测试库没建触发器，所以没暴露）。

// quotePairs 复刻 calibre.ebooks.metadata.quote_pairs。
var quotePairs = map[rune][]rune{
	'"':  {'"'},
	'\'': {'\''},
	'“':  {'”', '“'},
	'”':  {'”'},
	'„':  {'”', '“'},
	'‚':  {'’', '‘'},
	'’':  {'’', '‘'},
	'‘':  {'’', '‘'},
	'‹':  {'›'},
	'›':  {'‹'},
	'《':  {'》'},
	'〈':  {'〉'},
	'「':  {'」'},
	'『':  {'』'},
	'【':  {'】'},
	'〖':  {'〗'},
	'〔':  {'〕'},
	'［':  {'］'},
	'｛':  {'｝'},
}

// titleSortArticles 复刻 tweaks['per_language_title_sort_articles'] 的 eng 项。
//
// 默认 default_language_for_title_sort 为 None，回落到 get_lang()；本实现固定用
// eng 规则（与 Calibre 在英文/未知语言下的默认行为一致）。
var titleSortArticles = []string{`A\s+`, `The\s+`, `An\s+`}

// titleSortPat 复刻 get_title_sort_pat：^(A\s+|The\s+|An\s+)，忽略大小写。
var titleSortPat = regexp.MustCompile(`(?i)^(` + strings.Join(titleSortArticles, "|") + `)`)

// stripQuotes 去掉包裹的引号（复刻 title_sort 里的引号处理）。
func stripQuotes(s string) string {
	r := []rune(s)
	if len(r) == 0 {
		return s
	}
	closers, ok := quotePairs[r[0]]
	if !ok {
		return s
	}
	inner := r[1:]
	if len(inner) > 0 {
		for _, c := range closers {
			if inner[len(inner)-1] == c {
				inner = inner[:len(inner)-1]
				break
			}
		}
	}
	return string(inner)
}

// titleSort 复刻 calibre.ebooks.metadata.title_sort。
//
// 默认 order 为 tweaks['title_series_sorting'] = "library_order"，
// 即把开头的冠词移到末尾（"The Hobbit" → "Hobbit, The"）。
func titleSort(title string) string {
	title = strings.TrimSpace(title)
	// order == "strictly_alphabetic" 时直接返回；本实现固定 library_order。
	title = stripQuotes(title)

	if m := titleSortPat.FindString(title); m != "" {
		title = title[len(m):] + ", " + m
		title = stripQuotes(title)
	}
	return strings.TrimSpace(title)
}

// uuid4 生成随机 UUID v4 字符串（复刻 Calibre 的 uuid4()）。
func uuid4() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return ""
	}
	b[6] = (b[6] & 0x0f) | 0x40 // version 4
	b[8] = (b[8] & 0x3f) | 0x80 // variant 10
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

var calibreFuncsOnce sync.Once

// RegisterCalibreFunctions 注册 Calibre 自定义 SQL 函数（title_sort / uuid4）。
//
// modernc.org/sqlite 的 RegisterScalarFunction 是包级注册，对之后新开的连接生效；
// 因此必须在打开书库连接之前调用。用 sync.Once 保证只注册一次（重复注册会报错）。
//
// 除 HTTP 服务外，任何直接操作 Calibre 书库的命令行子命令（如 reindex-normalize）
// 也必须先调用它，否则会报 "no such function: title_sort"。
func RegisterCalibreFunctions() { registerCalibreFunctions() }

// registerCalibreFunctions 是 RegisterCalibreFunctions 的内部实现。
func registerCalibreFunctions() {
	calibreFuncsOnce.Do(func() {
		sqlite.MustRegisterScalarFunction("title_sort", 1,
			func(_ *sqlite.FunctionContext, args []driver.Value) (driver.Value, error) {
				if len(args) == 0 || args[0] == nil {
					return "", nil
				}
				s, ok := args[0].(string)
				if !ok {
					return "", nil
				}
				return titleSort(s), nil
			})
		sqlite.MustRegisterScalarFunction("uuid4", 0,
			func(_ *sqlite.FunctionContext, _ []driver.Value) (driver.Value, error) {
				return uuid4(), nil
			})
	})
}
