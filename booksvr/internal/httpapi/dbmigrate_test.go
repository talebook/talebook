package httpapi

import (
	"database/sql"
	"os"
	"path/filepath"
	"strings"
	"testing"

	_ "modernc.org/sqlite"
)

// ---- splitRelay ----

func TestSplitRelay(t *testing.T) {
	cases := []struct {
		relay      string
		encryption string
		wantHost   string
		wantPort   int
	}{
		{"smtp.qq.com:465", "SSL", "smtp.qq.com", 465},
		{"smtp.qq.com:587", "TLS", "smtp.qq.com", 587},
		{"smtp.qq.com", "SSL", "smtp.qq.com", 465},
		{"smtp.qq.com", "TLS", "smtp.qq.com", 25},
		{"smtp.qq.com", "", "smtp.qq.com", 25},
		{"[::1]:25", "TLS", "::1", 25},
		{"smtp.qq.com:abc", "SSL", "smtp.qq.com", 465},
		{"", "SSL", "", 465},
	}
	for _, c := range cases {
		host, port := splitRelay(c.relay, c.encryption)
		if host != c.wantHost || port != c.wantPort {
			t.Errorf("splitRelay(%q, %q) = (%q, %d), want (%q, %d)",
				c.relay, c.encryption, host, port, c.wantHost, c.wantPort)
		}
	}
}

// ---- buildMIMEMessage ----

func TestBuildMIMEMessagePlain(t *testing.T) {
	raw := buildMIMEMessage("a@b.c", "d@e.f", "测试主题", "正文内容", nil, "")
	for _, want := range []string{"From: a@b.c", "To: d@e.f", "MIME-Version: 1.0",
		"Content-Type: text/plain", "Content-Transfer-Encoding: base64"} {
		if !strings.Contains(raw, want) {
			t.Errorf("邮件缺少 %q:\n%s", want, raw)
		}
	}
	// 中文主题必须 RFC 2047 编码，不能出现裸中文。
	if strings.Contains(raw, "测试主题") {
		t.Error("主题应做 RFC 2047 编码")
	}
	if !strings.Contains(raw, "=?utf-8?") {
		t.Errorf("主题编码格式不对:\n%s", raw)
	}
}

func TestBuildMIMEMessageWithAttachment(t *testing.T) {
	raw := buildMIMEMessage("a@b.c", "d@e.f", "s", "body", []byte("PDFDATA"), "书.epub")
	for _, want := range []string{"multipart/mixed", "application/octet-stream",
		"Content-Disposition: attachment"} {
		if !strings.Contains(raw, want) {
			t.Errorf("带附件的邮件缺少 %q", want)
		}
	}
}

func TestWrapBase64BytesWrapsAt76(t *testing.T) {
	// 100 字节 → base64 约 136 字符，应折成多行。
	got := wrapBase64Bytes(make([]byte, 100))
	for _, line := range strings.Split(got, "\r\n") {
		if len(line) > 76 {
			t.Errorf("base64 行超过 76 字符: %d", len(line))
		}
	}
}

// ---- normalizeDBURL ----

func TestNormalizeDBURL(t *testing.T) {
	cases := []struct {
		in         string
		wantDriver string
		wantDSN    string
		wantErr    bool
	}{
		{"sqlite:////data/books/x.db", "sqlite", "/data/books/x.db", false},
		{"sqlite:///rel.db", "sqlite", "rel.db", false},
		{"sqlite:///:memory:", "sqlite", ":memory:", false},
		{"mysql+pymysql://u:p@127.0.0.1:3306/talebook", "mysql",
			"u:p@tcp(127.0.0.1:3306)/talebook?parseTime=true&charset=utf8mb4", false},
		{"mysql://u:p@db.local/talebook", "mysql",
			"u:p@tcp(db.local:3306)/talebook?parseTime=true&charset=utf8mb4", false},
		{"mariadb://u:p@h:3307/t", "mysql",
			"u:p@tcp(h:3307)/t?parseTime=true&charset=utf8mb4", false},
		{"postgres://u:p@h/db", "", "", true},
		{"mysql://u:p@h", "", "", true},
		{"mysql://u:p@h/", "", "", true},
	}
	for _, c := range cases {
		driver, dsn, err := normalizeDBURL(c.in)
		if c.wantErr {
			if err == nil {
				t.Errorf("normalizeDBURL(%q) 应报错，got (%q, %q)", c.in, driver, dsn)
			}
			continue
		}
		if err != nil {
			t.Errorf("normalizeDBURL(%q) 报错: %v", c.in, err)
			continue
		}
		if driver != c.wantDriver || dsn != c.wantDSN {
			t.Errorf("normalizeDBURL(%q) = (%q, %q), want (%q, %q)",
				c.in, driver, dsn, c.wantDriver, c.wantDSN)
		}
	}
}

// TestNormalizeDBURLDecodesCredentials 验证密码里的 URL 转义被还原。
func TestNormalizeDBURLDecodesCredentials(t *testing.T) {
	_, dsn, err := normalizeDBURL("mysql://u:p%40ss@h:3306/db")
	if err != nil {
		t.Fatalf("normalizeDBURL: %v", err)
	}
	if !strings.Contains(dsn, "u:p@ss@tcp(") {
		t.Errorf("密码未解码: %s", dsn)
	}
}

// ---- TestDBConnection ----

func TestTestDBConnectionSQLiteSkips(t *testing.T) {
	// SQLite 无需测试连接，直接成功。
	if err := TestDBConnection("sqlite:////tmp/x.db"); err != nil {
		t.Errorf("SQLite 应直接成功，got %v", err)
	}
}

func TestTestDBConnectionBadScheme(t *testing.T) {
	if err := TestDBConnection("postgres://u@h/db"); err == nil {
		t.Error("不支持的数据库类型应报错")
	}
}

// ---- createUserTables / userTableNames ----

func TestUserTableNames(t *testing.T) {
	names := userTableNames()
	if len(names) < 30 {
		t.Fatalf("表数 = %d, want >= 30", len(names))
	}
	want := map[string]bool{"readers": false, "reading_state": false, "items": false, "scanfiles": false}
	for _, n := range names {
		if _, ok := want[n]; ok {
			want[n] = true
		}
	}
	for k, found := range want {
		if !found {
			t.Errorf("表清单缺少 %s", k)
		}
	}
}

func TestCreateUserTablesSQLite(t *testing.T) {
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer func() { _ = db.Close() }()
	db.SetMaxOpenConns(1)

	if err := createUserTables(db, "sqlite"); err != nil {
		t.Fatalf("createUserTables: %v", err)
	}
	// 幂等：再跑一次不应报错。
	if err := createUserTables(db, "sqlite"); err != nil {
		t.Fatalf("重复建表应幂等: %v", err)
	}
	// 抽查一张表可用。
	if _, err := db.Exec(`INSERT INTO readers (username, password, admin, active, permission)
		VALUES ('u', 'p', 0, 1, '')`); err != nil {
		t.Errorf("readers 表不可用: %v", err)
	}
}

// ---- MigrateDB ----

// newMigrateSourceDB 建一个含少量数据的源库。
func newMigrateSourceDB(t *testing.T) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "source.db")
	db, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer func() { _ = db.Close() }()
	db.SetMaxOpenConns(1)

	if err := createUserTables(db, "sqlite"); err != nil {
		t.Fatalf("createUserTables: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO readers (username, password, admin, active, permission)
		VALUES ('alice', 'pw', 0, 1, '')`); err != nil {
		t.Fatalf("seed readers: %v", err)
	}
	return path
}

func TestMigrateDBSQLiteToSQLite(t *testing.T) {
	srcPath := newMigrateSourceDB(t)
	tgtPath := filepath.Join(t.TempDir(), "target.db")

	count, err := MigrateDB("sqlite:///"+srcPath, "sqlite:///"+tgtPath, false)
	if err != nil {
		t.Fatalf("MigrateDB: %v (count=%d)", err, count)
	}

	tgt, err := sql.Open("sqlite", tgtPath)
	if err != nil {
		t.Fatalf("open target: %v", err)
	}
	defer func() { _ = tgt.Close() }()
	var name string
	if err := tgt.QueryRow(`SELECT username FROM readers LIMIT 1`).Scan(&name); err != nil {
		t.Fatalf("目标库查询失败: %v", err)
	}
	if name != "alice" {
		t.Errorf("username = %q, want alice", name)
	}
}

// TestMigrateDBTargetNotEmpty 回归：目标库非空且未 force 时必须报错并返回行数。
func TestMigrateDBTargetNotEmpty(t *testing.T) {
	srcPath := newMigrateSourceDB(t)
	tgtPath := filepath.Join(t.TempDir(), "target.db")

	// 先迁一次，让目标库有数据。
	if _, err := MigrateDB("sqlite:///"+srcPath, "sqlite:///"+tgtPath, false); err != nil {
		t.Fatalf("首次迁移: %v", err)
	}
	// 再迁一次且不 force，应报 ErrTargetNotEmpty。
	count, err := MigrateDB("sqlite:///"+srcPath, "sqlite:///"+tgtPath, false)
	if err != ErrTargetNotEmpty {
		t.Fatalf("err = %v, want ErrTargetNotEmpty", err)
	}
	if count <= 0 {
		t.Errorf("count = %d, want > 0", count)
	}
	// force=true 应成功。
	if _, err := MigrateDB("sqlite:///"+srcPath, "sqlite:///"+tgtPath, true); err != nil {
		t.Errorf("force 迁移应成功: %v", err)
	}
}

func TestMigrateDBBadSource(t *testing.T) {
	if _, err := MigrateDB("postgres://u@h/db", "sqlite:///x.db", false); err == nil {
		t.Error("非法源库应报错")
	}
}

// ---- mysqlizeColumns ----

func TestMysqlizeColumnsAddsAutoIncrementToSinglePK(t *testing.T) {
	body := "\n\tid INTEGER NOT NULL, \n\tname VARCHAR(500) NOT NULL, \n\tPRIMARY KEY (id)\n"
	got := mysqlizeColumns(body)
	if !strings.Contains(got, "id INTEGER NOT NULL AUTO_INCREMENT") {
		t.Errorf("单列主键应加 AUTO_INCREMENT:\n%s", got)
	}
	// 非主键列不应加。
	if strings.Contains(got, "name VARCHAR(500) NOT NULL AUTO_INCREMENT") {
		t.Errorf("非主键列不应加 AUTO_INCREMENT:\n%s", got)
	}
}

func TestMysqlizeColumnsShrinksLongVarchar(t *testing.T) {
	got := mysqlizeColumns("\n\tname VARCHAR(500) NOT NULL, \n\tPRIMARY KEY (name)\n")
	if !strings.Contains(got, "VARCHAR(191)") {
		t.Errorf("超长 VARCHAR 应压到 191:\n%s", got)
	}
}

func TestMysqlizeColumnsKeepsShortVarchar(t *testing.T) {
	got := mysqlizeColumns("\n\tscope VARCHAR(32) NOT NULL, \n\tPRIMARY KEY (scope)\n")
	if !strings.Contains(got, "VARCHAR(32)") {
		t.Errorf("短 VARCHAR 不应被改:\n%s", got)
	}
}

// TestCreateUserTablesMySQLDDL 验证 MySQL 方言下生成的 DDL 可解析（不实际连库）。
func TestCreateUserTablesMySQLDDL(t *testing.T) {
	// 直接检查 mysqlizeColumns 对真实 schema 的处理结果。
	matches := createTableRe.FindAllStringSubmatch(userSchemaSQL, -1)
	if len(matches) == 0 {
		t.Fatal("schema 未解析出建表语句")
	}
	for _, m := range matches {
		body := mysqlizeColumns(m[2])
		if strings.Contains(body, "VARCHAR(500)") {
			t.Errorf("表 %s 仍有 VARCHAR(500)", m[1])
		}
	}
}

// TestEmbeddedSchemaMatchesUserdb 验证内嵌 schema 与 userdb 的权威副本一致。
func TestEmbeddedSchemaMatchesUserdb(t *testing.T) {
	authoritative := filepath.Join("..", "userdb", "testdata", "schema.sql")
	raw, err := os.ReadFile(authoritative)
	if err != nil {
		t.Skipf("权威 schema 不可读，跳过: %v", err)
	}
	if strings.TrimSpace(string(raw)) != strings.TrimSpace(userSchemaSQL) {
		t.Error("内嵌 schema 与 userdb/testdata/schema.sql 不一致，请同步")
	}
}
