package library

import (
	"database/sql"
	"fmt"
)

// CountBooks 返回书库中的书籍总数。
//
// 对应 Python 的 db.count()。
func CountBooks(db *sql.DB) (int64, error) {
	return scalarCount(db, `SELECT COUNT(*) FROM books`)
}

// CountAuthors 返回作者总数。
//
// 对应 Python 的 len(db.all_authors())。
func CountAuthors(db *sql.DB) (int64, error) {
	return scalarCount(db, `SELECT COUNT(*) FROM authors`)
}

// CountPublishers 返回出版社总数。
func CountPublishers(db *sql.DB) (int64, error) {
	return scalarCount(db, `SELECT COUNT(*) FROM publishers`)
}

// CountTags 返回标签总数。
func CountTags(db *sql.DB) (int64, error) {
	return scalarCount(db, `SELECT COUNT(*) FROM tags`)
}

// CountSeries 返回丛书总数。
func CountSeries(db *sql.DB) (int64, error) {
	return scalarCount(db, `SELECT COUNT(*) FROM series`)
}

// CountFormats 返回不同格式的数量。
//
// 对应 Python 的 `SELECT COUNT(DISTINCT format) FROM data`：
// 统计的是**格式种类**（如 EPUB、MOBI 各算一种），不是文件总数。
func CountFormats(db *sql.DB) (int64, error) {
	return scalarCount(db, `SELECT COUNT(DISTINCT format) FROM data`)
}

// scalarCount 执行一个返回单个整数的查询。
func scalarCount(db *sql.DB, query string) (int64, error) {
	if db == nil {
		return 0, nil
	}
	var n int64
	if err := db.QueryRow(query).Scan(&n); err != nil {
		return 0, fmt.Errorf("library: 统计失败 (%s): %w", query, err)
	}
	return n, nil
}
