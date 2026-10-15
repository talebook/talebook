// Package importmeta 复刻 webserver/services/import_metadata.py。
//
// 提供导入时的文件名元数据构造与保守的重复匹配规则。
package importmeta

import (
	"path/filepath"
	"strings"

	"talebook/booksvr/internal/media"
)

// AnonymousAuthor 复刻 Python 的 _("佚名")。
const AnonymousAuthor = "佚名"

// Metadata 是导入时使用的元数据，对齐 calibre 的 Metadata 对象中本模块用到的字段。
type Metadata struct {
	// Title 是书名。
	Title string
	// Authors 是作者列表。
	Authors []string
	// Publisher 是出版社（可选）。
	Publisher string
	// Pubdate 是出版日期（可选）。
	Pubdate string
	// Language 是语言（可选）。
	Language string
	// ISBN 是归一化后的 ISBN（可选）。
	ISBN string
	// Tags 是主题标签（可选）。
	Tags []string
	// Comments 是内容简介（可选）。
	Comments string
}

// FilenameMetadata 复刻 filename_metadata：用文件名（去扩展名）作书名，作者为「佚名」。
func FilenameMetadata(path string) Metadata {
	base := filepath.Base(strings.ReplaceAll(path, `\`, "/"))
	return Metadata{
		Title:   strings.TrimSuffix(base, filepath.Ext(base)),
		Authors: []string{AnonymousAuthor},
	}
}

// MatchingImportBooks 复刻 matching_import_books。
//
// 受管文档格式（djvu/uvz）没有可信的作者元数据：书名唯一即可匹配，
// 但多版本绝不能任意合并——因此只有恰好 1 本时才返回。
// 其余格式要求作者集合完全一致。
func MatchingImportBooks(mi Metadata, format string, books []map[string]any) []map[string]any {
	if media.ManagedDocumentFormats[strings.ToLower(format)] {
		if len(books) == 1 {
			return books
		}
		return []map[string]any{}
	}
	want := authorSet(mi.Authors)
	out := make([]map[string]any, 0, len(books))
	for _, book := range books {
		if sameAuthorSet(want, bookAuthors(book)) {
			out = append(out, book)
		}
	}
	return out
}

// authorSet 把作者列表转成集合。
func authorSet(authors []string) map[string]bool {
	out := make(map[string]bool, len(authors))
	for _, a := range authors {
		out[a] = true
	}
	return out
}

// bookAuthors 从 book dict 读取 authors 字段。
//
// 兼容 []string 与 []any 两种形态（后者来自 JSON 反序列化）。
func bookAuthors(book map[string]any) map[string]bool {
	raw, ok := book["authors"]
	if !ok {
		return map[string]bool{}
	}
	switch v := raw.(type) {
	case []string:
		return authorSet(v)
	case []any:
		out := make(map[string]bool, len(v))
		for _, item := range v {
			if s, ok := item.(string); ok {
				out[s] = true
			}
		}
		return out
	case string:
		if v == "" {
			return map[string]bool{}
		}
		return authorSet([]string{v})
	}
	return map[string]bool{}
}

// sameAuthorSet 报告两个作者集合是否相等。
func sameAuthorSet(a, b map[string]bool) bool {
	if len(a) != len(b) {
		return false
	}
	for k := range a {
		if !b[k] {
			return false
		}
	}
	return true
}
