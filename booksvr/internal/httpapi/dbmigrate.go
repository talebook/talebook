// 本文件实现数据库连接测试与数据迁移，复刻 Python webserver/migrate_db.py。
//
// 支持 SQLite（modernc.org/sqlite）与 MySQL/MariaDB（go-sql-driver/mysql）。
package httpapi

import (
	"database/sql"
	_ "embed"
	"fmt"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql" // MySQL/MariaDB 驱动
	_ "modernc.org/sqlite"             // SQLite 驱动
)

// userSchemaSQL 是 Talebook 自有表的权威 DDL（与 userdb/testdata/schema.sql 同源）。
//
//go:embed testdata/user_schema.sql
var userSchemaSQL string

// createTableRe 匹配 schema.sql 里的 CREATE TABLE 语句。
var createTableRe = regexp.MustCompile(`(?is)CREATE TABLE\s+(\w+)\s*\((.*?)\)\s*;`)

// userTableNames 返回 Talebook 自有表名（按 schema.sql 顺序）。
func userTableNames() []string {
	matches := createTableRe.FindAllStringSubmatch(userSchemaSQL, -1)
	out := make([]string, 0, len(matches))
	for _, m := range matches {
		out = append(out, m[1])
	}
	return out
}

// createUserTables 在目标库建 Talebook 自有表（幂等）。
//
// 对应 Python 的 `models.Base.metadata.create_all(target_engine)`。
// schema.sql 是 SQLAlchemy 生成的通用 DDL，SQLite 与 MySQL 都能执行；
// MySQL 下把 INTEGER 主键改成 AUTO_INCREMENT 以保持自增语义。
func createUserTables(db *sql.DB, driver string) error {
	matches := createTableRe.FindAllStringSubmatch(userSchemaSQL, -1)
	for _, m := range matches {
		table, body := m[1], m[2]
		if driver == "mysql" {
			body = mysqlizeColumns(body)
		}
		stmt := fmt.Sprintf("CREATE TABLE IF NOT EXISTS %s (%s)", quoteIdent(table, driver), body)
		if _, err := db.Exec(stmt); err != nil {
			return fmt.Errorf("建表 %s 失败: %w", table, err)
		}
	}
	return nil
}

// mysqlizeColumns 把 SQLAlchemy 风格的列定义改成 MySQL 可执行的写法。
//
// 主要差异：
//   - 单列 INTEGER 主键需要 AUTO_INCREMENT 才能自增；
//   - VARCHAR 长度超过 191 的列在 utf8mb4 下做索引会超限，统一压到 191。
func mysqlizeColumns(body string) string {
	lines := strings.Split(body, ",")

	// 先找出单列主键的列名（形如 `PRIMARY KEY (id)`）。
	autoInc := ""
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if !strings.HasPrefix(strings.ToUpper(trimmed), "PRIMARY KEY") {
			continue
		}
		open := strings.Index(trimmed, "(")
		close := strings.LastIndex(trimmed, ")")
		if open < 0 || close <= open {
			continue
		}
		cols := strings.Split(trimmed[open+1:close], ",")
		if len(cols) == 1 {
			autoInc = strings.TrimSpace(cols[0])
		}
	}

	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(strings.ToUpper(trimmed), "PRIMARY KEY") {
			continue
		}
		// 只给单列主键列加 AUTO_INCREMENT。
		if autoInc != "" && strings.HasPrefix(trimmed, autoInc+" ") {
			lines[i] = line + " AUTO_INCREMENT"
		}
		// utf8mb4 下索引长度限制：VARCHAR(n>191) 压到 191。
		lines[i] = shrinkVarchar(lines[i])
	}
	return strings.Join(lines, ",")
}

// varcharRe 匹配 VARCHAR(n)。
var varcharRe = regexp.MustCompile(`(?i)VARCHAR\((\d+)\)`)

// shrinkVarchar 把超过 191 的 VARCHAR 长度压到 191，避免 utf8mb4 索引超限。
func shrinkVarchar(line string) string {
	return varcharRe.ReplaceAllStringFunc(line, func(m string) string {
		sub := varcharRe.FindStringSubmatch(m)
		n, err := strconv.Atoi(sub[1])
		if err != nil || n <= 191 {
			return m
		}
		return "VARCHAR(191)"
	})
}

// dbDriverName 把 SQLAlchemy 风格的 URL 前缀映射到 Go 驱动名。
//
// 对应 Python 的 `parsed.drivername.split("+")[0]`：
//   - sqlite:///path、sqlite+pysqlite:///path → sqlite
//   - mysql://、mysql+pymysql://、mariadb://  → mysql
func dbDriverName(dbURL string) (string, error) {
	lower := strings.ToLower(strings.TrimSpace(dbURL))
	switch {
	case strings.HasPrefix(lower, "sqlite"):
		return "sqlite", nil
	case strings.HasPrefix(lower, "mysql"), strings.HasPrefix(lower, "mariadb"):
		return "mysql", nil
	default:
		return "", fmt.Errorf("不支持的数据库类型: %s", dbURL)
	}
}

// normalizeDBURL 把 SQLAlchemy 风格 URL 转成 Go 驱动能识别的 DSN。
//
// SQLAlchemy 用 `mysql+pymysql://user:pass@host:port/db`，
// go-sql-driver 需要 `user:pass@tcp(host:port)/db`。
func normalizeDBURL(dbURL string) (driver, dsn string, err error) {
	driver, err = dbDriverName(dbURL)
	if err != nil {
		return "", "", err
	}
	raw := strings.TrimSpace(dbURL)

	if driver == "sqlite" {
		// SQLAlchemy 的 sqlite URL 规则：
		//   sqlite:////abs/path.db → 绝对路径 /abs/path.db（四个斜杠）
		//   sqlite:///rel/path.db  → 相对路径 rel/path.db（三个斜杠）
		//   sqlite:///:memory:     → :memory:
		path := raw
		if idx := strings.Index(path, "://"); idx >= 0 {
			path = path[idx+3:]
		}
		if strings.HasPrefix(path, "//") {
			// 四个斜杠：去掉一个，保留绝对路径的前导斜杠。
			path = path[1:]
		} else {
			path = strings.TrimPrefix(path, "/")
		}
		return "sqlite", path, nil
	}

	// MySQL：剥掉 `mysql+pymysql://` 这类前缀，取 `user:pass@host:port/db`。
	idx := strings.Index(raw, "://")
	if idx < 0 {
		return "", "", fmt.Errorf("数据库地址无效: %s", dbURL)
	}
	rest := raw[idx+3:]
	at := strings.LastIndex(rest, "@")
	if at < 0 {
		return "", "", fmt.Errorf("数据库地址缺少主机部分: %s", dbURL)
	}
	cred := rest[:at]
	hostPart := rest[at+1:]

	slash := strings.Index(hostPart, "/")
	if slash < 0 {
		return "", "", fmt.Errorf("数据库地址缺少库名: %s", dbURL)
	}
	hostPort := hostPart[:slash]
	dbName := hostPart[slash+1:]
	if q := strings.Index(dbName, "?"); q >= 0 {
		dbName = dbName[:q]
	}
	if dbName == "" {
		return "", "", fmt.Errorf("数据库地址缺少库名: %s", dbURL)
	}
	if !strings.Contains(hostPort, ":") {
		hostPort += ":3306"
	}
	// 凭据需要 URL 解码（密码里可能有 %40 这类转义）。
	if user, pass, ok := strings.Cut(cred, ":"); ok {
		if u, err := url.QueryUnescape(user); err == nil {
			user = u
		}
		if p, err := url.QueryUnescape(pass); err == nil {
			pass = p
		}
		cred = user + ":" + pass
	}
	return "mysql", fmt.Sprintf("%s@tcp(%s)/%s?parseTime=true&charset=utf8mb4", cred, hostPort, dbName), nil
}

// TestDBConnection 测试数据库是否可连接（执行 SELECT 1）。
//
// 对应 Python AdminTestDB.post：SQLite 直接返回成功，其余执行一次探测查询。
func TestDBConnection(dbURL string) error {
	driver, dsn, err := normalizeDBURL(dbURL)
	if err != nil {
		return err
	}
	if driver == "sqlite" {
		return nil
	}
	db, err := sql.Open(driver, dsn)
	if err != nil {
		return fmt.Errorf("打开数据库失败: %w", err)
	}
	defer func() { _ = db.Close() }()
	db.SetMaxOpenConns(1)
	db.SetConnMaxLifetime(time.Minute)

	if err := db.Ping(); err != nil {
		return fmt.Errorf("连接数据库失败: %w", err)
	}
	var one int
	if err := db.QueryRow("SELECT 1").Scan(&one); err != nil {
		return fmt.Errorf("执行探测查询失败: %w", err)
	}
	return nil
}

// MigrateDB 把 Talebook 自有表的数据从 sourceURL 复制到 targetURL。
//
// 对应 Python migrate_db.migrate_data：
//   - 目标库先建表（若不存在）；
//   - force=false 且目标库已有数据时，返回 (已有行数, ErrTargetNotEmpty)；
//   - 逐表清空后插入，保证幂等。
//
// 返回的 int 是目标库已有行数（仅在不 force 且非空时有意义）。
func MigrateDB(sourceURL, targetURL string, force bool) (int, error) {
	srcDriver, srcDSN, err := normalizeDBURL(sourceURL)
	if err != nil {
		return 0, fmt.Errorf("源数据库配置无效: %w", err)
	}
	tgtDriver, tgtDSN, err := normalizeDBURL(targetURL)
	if err != nil {
		return 0, fmt.Errorf("目标数据库配置无效: %w", err)
	}

	src, err := sql.Open(srcDriver, srcDSN)
	if err != nil {
		return 0, fmt.Errorf("打开源数据库失败: %w", err)
	}
	defer func() { _ = src.Close() }()

	tgt, err := sql.Open(tgtDriver, tgtDSN)
	if err != nil {
		return 0, fmt.Errorf("打开目标数据库失败: %w", err)
	}
	defer func() { _ = tgt.Close() }()

	if err := src.Ping(); err != nil {
		return 0, fmt.Errorf("连接源数据库失败: %w", err)
	}
	if err := tgt.Ping(); err != nil {
		return 0, fmt.Errorf("连接目标数据库失败: %w", err)
	}

	// 目标库建表：复用 Talebook 自有表的 DDL。
	if err := createUserTables(tgt, tgtDriver); err != nil {
		return 0, fmt.Errorf("在目标库建表失败: %w", err)
	}

	tables := userTableNames()

	// 非强制模式下，目标库已有数据则要求确认。
	if !force {
		total := 0
		for _, table := range tables {
			var n int
			if err := tgt.QueryRow(fmt.Sprintf("SELECT COUNT(*) FROM %s", quoteIdent(table, tgtDriver))).Scan(&n); err != nil {
				// 表刚建好，计数失败视为 0，不阻断。
				continue
			}
			total += n
		}
		if total > 0 {
			return total, ErrTargetNotEmpty
		}
	}

	// 逐表复制。
	for _, table := range tables {
		if err := copyTable(src, tgt, table, tgtDriver); err != nil {
			return 0, fmt.Errorf("迁移表 %s 失败: %w", table, err)
		}
	}
	return 0, nil
}

// ErrTargetNotEmpty 表示目标库已有数据，需要调用方确认后强制迁移。
var ErrTargetNotEmpty = fmt.Errorf("目标数据库已有数据")

// quoteIdent 按方言给标识符加引号。
func quoteIdent(name, driver string) string {
	if driver == "mysql" {
		return "`" + name + "`"
	}
	return `"` + name + `"`
}

// copyTable 把一张表的全部行从 src 复制到 tgt（先清空目标表）。
func copyTable(src, tgt *sql.DB, table, tgtDriver string) error {
	rows, err := src.Query(fmt.Sprintf("SELECT * FROM %s", quoteIdent(table, "sqlite")))
	if err != nil {
		// 源库缺这张表时跳过（不同版本的表集合可能不同）。
		return nil
	}
	defer func() { _ = rows.Close() }()

	cols, err := rows.Columns()
	if err != nil {
		return err
	}
	var records [][]any
	for rows.Next() {
		vals := make([]any, len(cols))
		ptrs := make([]any, len(cols))
		for i := range vals {
			ptrs[i] = &vals[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			return err
		}
		records = append(records, vals)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	if _, err := tgt.Exec(fmt.Sprintf("DELETE FROM %s", quoteIdent(table, tgtDriver))); err != nil {
		return fmt.Errorf("清空目标表失败: %w", err)
	}
	if len(records) == 0 {
		return nil
	}

	placeholders := make([]string, len(cols))
	for i := range placeholders {
		placeholders[i] = "?"
	}
	quoted := make([]string, len(cols))
	for i, c := range cols {
		quoted[i] = quoteIdent(c, tgtDriver)
	}
	stmt := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)",
		quoteIdent(table, tgtDriver), strings.Join(quoted, ", "), strings.Join(placeholders, ", "))

	tx, err := tgt.Begin()
	if err != nil {
		return err
	}
	prepared, err := tx.Prepare(stmt)
	if err != nil {
		_ = tx.Rollback()
		return err
	}
	for _, rec := range records {
		if _, err := prepared.Exec(rec...); err != nil {
			_ = prepared.Close()
			_ = tx.Rollback()
			return fmt.Errorf("插入数据失败: %w", err)
		}
	}
	_ = prepared.Close()
	return tx.Commit()
}
