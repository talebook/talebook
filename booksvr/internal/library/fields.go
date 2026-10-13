package library

import (
	"database/sql"
	"fmt"
	"sort"
)

// Field 描述一个书库字段的元信息。
//
// 对齐 Calibre 的 field_metadata：字段名、显示名、数据类型、是否可排序。
type Field struct {
	// Name 是字段的显示名（如「标题」）。
	Name string `json:"name"`
	// Datatype 是字段类型（text/int/float/datetime/series/rating/...）。
	Datatype string `json:"datatype"`
	// Sortable 表示该字段能否用于排序。
	Sortable bool `json:"sortable"`
	// IsCustom 表示是否为 custom_columns 定义的自定义字段。
	IsCustom bool `json:"is_custom"`
}

// builtinFields 是 Calibre 内置字段的静态表。
//
// 只列出 Talebook 实际使用的字段；未列出的字段在 FieldMetadata 中不出现。
var builtinFields = map[string]Field{
	"title":       {Name: "标题", Datatype: "text", Sortable: true},
	"authors":     {Name: "作者", Datatype: "text", Sortable: true},
	"author_sort": {Name: "作者排序", Datatype: "text", Sortable: true},
	"tags":        {Name: "标签", Datatype: "text", Sortable: true},
	"series":      {Name: "丛书", Datatype: "series", Sortable: true},
	"publisher":   {Name: "出版社", Datatype: "text", Sortable: true},
	"rating":      {Name: "评分", Datatype: "rating", Sortable: true},
	"languages":   {Name: "语言", Datatype: "text", Sortable: true},
	"comments":    {Name: "简介", Datatype: "text", Sortable: false},
	"timestamp":   {Name: "入库时间", Datatype: "datetime", Sortable: true},
	"pubdate":     {Name: "出版日期", Datatype: "datetime", Sortable: true},
	"path":        {Name: "路径", Datatype: "text", Sortable: false},
	"has_cover":   {Name: "有封面", Datatype: "bool", Sortable: false},
	"isbn":        {Name: "ISBN", Datatype: "text", Sortable: false},
	"formats":     {Name: "格式", Datatype: "text", Sortable: false},
}

// FieldMetadata 返回全部字段的元信息（内置 + custom_columns）。
func FieldMetadata(db *sql.DB) (map[string]Field, error) {
	out := make(map[string]Field, len(builtinFields))
	for k, v := range builtinFields {
		out[k] = v
	}

	rows, err := db.Query(`SELECT label, name, datatype FROM custom_columns`)
	if err != nil {
		return nil, fmt.Errorf("library: 查询自定义字段失败: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var label, name, datatype string
		if err := rows.Scan(&label, &name, &datatype); err != nil {
			return nil, fmt.Errorf("library: 扫描自定义字段失败: %w", err)
		}
		out[label] = Field{
			Name:     name,
			Datatype: datatype,
			Sortable: datatype != "comments",
			IsCustom: true,
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("library: 遍历自定义字段失败: %w", err)
	}
	return out, nil
}

// AllFieldNames 返回全部字段名（已排序）。
func AllFieldNames(db *sql.DB) ([]string, error) {
	fields, err := FieldMetadata(db)
	if err != nil {
		return nil, err
	}
	names := make([]string, 0, len(fields))
	for k := range fields {
		names = append(names, k)
	}
	sort.Strings(names)
	return names, nil
}
