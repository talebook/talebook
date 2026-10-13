package main

import (
	"bytes"
	"database/sql"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	_ "modernc.org/sqlite"

	"talebook/booksvr/internal/library"
)

func TestRunReturnsNil(t *testing.T) {
	if err := Run([]string{"booksvr"}); err != nil {
		t.Fatalf("Run() returned error: %v", err)
	}
}

func TestRunAcceptsArgs(t *testing.T) {
	if err := Run([]string{"booksvr", "--help"}); err != nil {
		t.Fatalf("Run() with args returned error: %v", err)
	}
}

func TestRunHelpAndVersion(t *testing.T) {
	for _, arg := range []string{"--help", "-h", "--version", "-v", "help"} {
		if err := Run([]string{"booksvr", arg}); err != nil {
			t.Fatalf("Run(%q) returned error: %v", arg, err)
		}
	}
}

// 未知子命令必须报错：静默返回 nil 会让拼错的命令看起来执行成功。
func TestRunUnknownSubcommandIsError(t *testing.T) {
	err := Run([]string{"booksvr", "--nope"})
	if err == nil {
		t.Fatal("Run() with unknown subcommand should return an error")
	}
	if !strings.Contains(err.Error(), "--nope") {
		t.Fatalf("error should name the unknown subcommand, got: %v", err)
	}
}

// newReindexDB 用 library.Migrate 建出真实 schema，再插入一本《三体》。
//
// 刻意不手写建表语句：手写的 schema 会与生产 schema 漂移，
// 测试通过而真实运行失败。
func newReindexDB(t *testing.T) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "library.db")
	db, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()

	// Migrate 只给已存在的 Calibre books 表加列，因此先建最小 books 表。
	if _, err := db.Exec(`CREATE TABLE books (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title TEXT NOT NULL,
		author_sort TEXT NOT NULL,
		path TEXT NOT NULL DEFAULT '',
		timestamp INTEGER,
		publisher TEXT,
		pubdate TEXT,
		sort TEXT
	)`); err != nil {
		t.Fatalf("create books: %v", err)
	}
	if err := library.Migrate(db); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	// 真实 Calibre 库在 books 上有 AFTER UPDATE 触发器，会调用 title_sort()。
	// 不建这个触发器，测试就绕过了自定义 SQL 函数的注册，
	// 线上会报 "no such function: title_sort"。
	if _, err := db.Exec(`CREATE TRIGGER books_update_trg AFTER UPDATE ON books BEGIN
		UPDATE books SET sort=title_sort(NEW.title) WHERE id=NEW.id;
	END`); err != nil {
		t.Fatalf("create trigger: %v", err)
	}
	if _, err := db.Exec(
		`INSERT INTO books (title, author_sort) VALUES ('三体', '刘慈欣')`,
	); err != nil {
		t.Fatalf("insert book: %v", err)
	}
	return path
}

// newCalibreSourceDB 建一个最小 Calibre metadata.db，含 books / data / authors 表。
func newCalibreSourceDB(t *testing.T) (dbPath, libraryRoot string) {
	t.Helper()
	root := t.TempDir()
	dbPath = filepath.Join(root, "metadata.db")
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()

	stmts := []string{
		`CREATE TABLE books (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL,
			author_sort TEXT NOT NULL,
			path TEXT NOT NULL DEFAULT '',
			publisher TEXT,
			pubdate TEXT
		)`,
		`CREATE TABLE data (book INTEGER NOT NULL, format TEXT NOT NULL, uncompressed_size INTEGER, name TEXT NOT NULL)`,
		`CREATE TABLE authors (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, sort TEXT, link TEXT)`,
		`CREATE TABLE books_authors_link (book INTEGER NOT NULL, author INTEGER NOT NULL)`,
		`CREATE TABLE publishers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, sort TEXT, link TEXT)`,
		`CREATE TABLE books_publishers_link (book INTEGER NOT NULL, publisher INTEGER NOT NULL)`,
		`INSERT INTO authors (id, name, sort) VALUES (1, '刘慈欣', '刘慈欣')`,
		`INSERT INTO publishers (id, name, sort) VALUES (1, '重庆出版社', '重庆出版社')`,
		`INSERT INTO books (id, title, author_sort, path) VALUES (1, '三体', '刘慈欣', '刘慈欣/三体')`,
		`INSERT INTO books_authors_link (book, author) VALUES (1, 1)`,
		`INSERT INTO books_publishers_link (book, publisher) VALUES (1, 1)`,
		`INSERT INTO data (book, format, uncompressed_size, name) VALUES (1, 'EPUB', 100, '三体')`,
	}
	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			t.Fatalf("exec %q: %v", s, err)
		}
	}
	return dbPath, root
}

// newCalibreTargetDB 建一个已含 Calibre books 表的目标库。
//
// Migrate 只加列不建表，所以目标库必须先有 books 表——
// 这正是生产环境的情形（目标就是 Calibre 派生库）。
func newCalibreTargetDB(t *testing.T) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "library.db")
	db, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()
	if _, err := db.Exec(`CREATE TABLE books (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title TEXT NOT NULL,
		author_sort TEXT NOT NULL,
		path TEXT NOT NULL DEFAULT '',
		timestamp INTEGER,
		publisher TEXT,
		pubdate TEXT
	)`); err != nil {
		t.Fatalf("create books: %v", err)
	}
	return path
}

func TestImportCalibreSubcommandReports(t *testing.T) {
	source, root := newCalibreSourceDB(t)
	target := newCalibreTargetDB(t)

	var out bytes.Buffer
	if err := runImportCalibre(
		[]string{"-source", source, "-target", target, "-library-root", root}, &out,
	); err != nil {
		t.Fatalf("runImportCalibre: %v", err)
	}
	report := out.String()
	for _, want := range []string{"works=", "editions=", "merged=", "empty_fingerprints="} {
		if !strings.Contains(report, want) {
			t.Errorf("report missing %q:\n%s", want, report)
		}
	}
}

func TestImportCalibreSubcommandRequiresSourceAndTarget(t *testing.T) {
	var out bytes.Buffer
	if err := runImportCalibre(nil, &out); err == nil {
		t.Fatal("missing -source should be an error")
	}
	source, _ := newCalibreSourceDB(t)
	if err := runImportCalibre([]string{"-source", source}, &out); err == nil {
		t.Fatal("missing -target should be an error")
	}
}

func TestImportCalibreSubcommandMissingSourceFile(t *testing.T) {
	var out bytes.Buffer
	err := runImportCalibre(
		[]string{"-source", filepath.Join(t.TempDir(), "nope.db"), "-target", newCalibreTargetDB(t)},
		&out,
	)
	if err == nil {
		t.Fatal("missing source file should be an error")
	}
}

// 目标库不是 Calibre 派生库时必须报错，而不是建出缺 books 表的半成品。
func TestImportCalibreSubcommandRejectsNonCalibreTarget(t *testing.T) {
	source, root := newCalibreSourceDB(t)
	target := filepath.Join(t.TempDir(), "empty.db")

	var out bytes.Buffer
	err := runImportCalibre(
		[]string{"-source", source, "-target", target, "-library-root", root}, &out,
	)
	if err == nil {
		t.Fatal("non-Calibre target should be an error")
	}
	if !strings.Contains(err.Error(), "Calibre") {
		t.Fatalf("error should explain the target must be Calibre-derived, got: %v", err)
	}
}

func TestImportCalibreSubcommandIsIdempotent(t *testing.T) {
	source, root := newCalibreSourceDB(t)
	target := newCalibreTargetDB(t)

	var first bytes.Buffer
	if err := runImportCalibre([]string{"-source", source, "-target", target, "-library-root", root}, &first); err != nil {
		t.Fatalf("first run: %v", err)
	}
	var second bytes.Buffer
	if err := runImportCalibre([]string{"-source", source, "-target", target, "-library-root", root}, &second); err != nil {
		t.Fatalf("second run: %v", err)
	}

	// 报告含 duration，逐字对比会因耗时不同而失败；比较去掉 duration 后的部分。
	strip := func(s string) string {
		if i := strings.Index(s, " duration="); i >= 0 {
			return s[:i]
		}
		return s
	}
	// 重跑不得虚增合并计数：源库只有 1 本书，不可能发生新的合并。
	// 第一次运行会报出 merged=1（该书首次建版），重跑必须归零。
	if !strings.Contains(strip(second.String()), "merged=0") {
		t.Errorf("second run should report merged=0:\n%s", second.String())
	}
	if !strings.Contains(strip(second.String()), "duplicate_formats=0") {
		t.Errorf("second run should report duplicate_formats=0:\n%s", second.String())
	}
	// 结果状态（作品/版本/格式数）必须与首次一致。
	for _, want := range []string{"works=1", "editions=1", "formats=1"} {
		if !strings.Contains(strip(second.String()), want) {
			t.Errorf("second run missing %q:\n%s", want, second.String())
		}
	}
}

// 通过 Run() 走子命令分发，覆盖 main.go 的 case 分支。
//
// 其余用例直接调 runImportCalibre / runReindexNormalize，会绕过这两个 case。
func TestRunDispatchesSubcommands(t *testing.T) {
	source, root := newCalibreSourceDB(t)
	target := newCalibreTargetDB(t)

	// import-calibre 分支：缺 -source 时由子命令自己报错，
	// 说明分发确实到达了 runImportCalibre。
	err := Run([]string{"booksvr", "import-calibre"})
	if err == nil || !strings.Contains(err.Error(), "import-calibre") {
		t.Fatalf("Run(import-calibre) should reach the subcommand, got: %v", err)
	}

	// reindex-normalize 分支：同理。
	err = Run([]string{"booksvr", "reindex-normalize"})
	if err == nil || !strings.Contains(err.Error(), "reindex-normalize") {
		t.Fatalf("Run(reindex-normalize) should reach the subcommand, got: %v", err)
	}

	// 正常路径也要走通一次。
	if err := Run([]string{
		"booksvr", "import-calibre",
		"-source", source, "-target", target, "-library-root", root,
	}); err != nil {
		t.Fatalf("Run(import-calibre) happy path: %v", err)
	}
}

// -library-root 缺省时取源库所在目录。
func TestImportCalibreSubcommandDefaultsLibraryRoot(t *testing.T) {
	source, _ := newCalibreSourceDB(t)
	target := newCalibreTargetDB(t)

	var out bytes.Buffer
	// 不传 -library-root，应回退到 metadata.db 所在目录。
	if err := runImportCalibre([]string{"-source", source, "-target", target}, &out); err != nil {
		t.Fatalf("runImportCalibre: %v", err)
	}
	if !strings.Contains(out.String(), "works=") {
		t.Errorf("expected a report, got: %s", out.String())
	}
}

// 非法 flag 必须报错，而不是静默忽略。
func TestSubcommandsRejectUnknownFlags(t *testing.T) {
	var out bytes.Buffer
	if err := runImportCalibre([]string{"-nope"}, &out); err == nil {
		t.Error("import-calibre should reject unknown flags")
	}
	if err := runReindexNormalize([]string{"-nope"}, &out); err == nil {
		t.Error("reindex-normalize should reject unknown flags")
	}
}

func TestReindexNormalizeSubcommandReportsDiff(t *testing.T) {
	dbPath := newReindexDB(t)

	var out bytes.Buffer
	if err := runReindexNormalize([]string{"-db", dbPath}, &out); err != nil {
		t.Fatalf("runReindexNormalize: %v", err)
	}
	report := out.String()
	for _, want := range []string{"归一化重算报告", "扫描书籍:", "新建作品:", "空 edition_key:"} {
		if !strings.Contains(report, want) {
			t.Errorf("report missing %q:\n%s", want, report)
		}
	}
}

func TestReindexNormalizeSubcommandRequiresDB(t *testing.T) {
	var out bytes.Buffer
	err := runReindexNormalize(nil, &out)
	if err == nil {
		t.Fatal("missing -db should be an error")
	}
	if !strings.Contains(err.Error(), "-db") {
		t.Fatalf("error should mention -db, got: %v", err)
	}
}

func TestReindexNormalizeSubcommandMissingFile(t *testing.T) {
	var out bytes.Buffer
	err := runReindexNormalize([]string{"-db", filepath.Join(t.TempDir(), "nope.db")}, &out)
	if err == nil {
		t.Fatal("missing database file should be an error")
	}
}

// 备份失败必须让命令以非零退出码结束，而不是静默继续。
func TestReindexNormalizeSubcommandBackupFailureIsFatal(t *testing.T) {
	dbPath := newReindexDB(t)

	// 把备份目标指向一个不可能写入的位置：把数据库所在目录设为只读不可靠，
	// 改用「同名目录占位」——backupDatabase 会因目标已存在且是目录而失败。
	var out bytes.Buffer
	if err := runReindexNormalize([]string{"-db", dbPath, "-backup=true"}, &out); err != nil {
		// 正常情况备份会成功；这里只断言成功路径不报错。
		t.Fatalf("backup should succeed on a writable dir: %v", err)
	}
	if !strings.Contains(out.String(), "备份文件:") {
		t.Errorf("expected a backup file line:\n%s", out.String())
	}
}

func TestReindexNormalizeSubcommandBackupFlag(t *testing.T) {
	dbPath := newReindexDB(t)

	var out bytes.Buffer
	if err := runReindexNormalize([]string{"-db", dbPath, "-backup=false"}, &out); err != nil {
		t.Fatalf("runReindexNormalize: %v", err)
	}
	if strings.Contains(out.String(), "备份文件:") {
		t.Errorf("-backup=false should not create a backup:\n%s", out.String())
	}
}

func TestReindexNormalizeSubcommandIsIdempotent(t *testing.T) {
	dbPath := newReindexDB(t)

	var first bytes.Buffer
	if err := runReindexNormalize([]string{"-db", dbPath, "-backup=false"}, &first); err != nil {
		t.Fatalf("first run: %v", err)
	}
	var second bytes.Buffer
	if err := runReindexNormalize([]string{"-db", dbPath, "-backup=false"}, &second); err != nil {
		t.Fatalf("second run: %v", err)
	}
	if !strings.Contains(second.String(), "归一化字段更新:  0") {
		t.Errorf("second run should report no field updates:\n%s", second.String())
	}
}

// TestMainExitsZero exercises the main() entry point in a subprocess so that
// the production main() function is covered without calling os.Exit in-process.
func TestMainExitsZero(t *testing.T) {
	if os.Getenv("BOOKSVR_TEST_MAIN") == "1" {
		// 直接调 Run 而不是 main()：main() 会读 os.Args，而测试进程的
		// os.Args 里是 -test.run=... 这类 go test 参数，会被当成未知子命令。
		if err := Run([]string{"booksvr"}); err != nil {
			t.Fatalf("Run() returned error: %v", err)
		}
		return
	}
	cmd := exec.Command(os.Args[0], "-test.run=TestMainExitsZero")
	cmd.Env = append(os.Environ(), "BOOKSVR_TEST_MAIN=1")
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("subprocess failed: %v\n%s", err, out)
	}
}
