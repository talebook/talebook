// Command booksvr is the Go implementation of the Talebook library storage layer.
//
// It replaces Calibre's "filesystem as database" model with a
// work / edition / format three-layer model backed by SQLite, while keeping the
// Talebook HTTP API fully compatible.
package main

import (
	"database/sql"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"

	"talebook/booksvr/internal/httpapi"
	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/migrate"
	"talebook/booksvr/internal/reindex"
)

// version 由构建时注入；未注入时为 dev。
var version = "dev"

// usage 是顶层帮助文本。
const usage = `booksvr - Talebook library storage layer

用法:
  booksvr [全局选项] <子命令> [子命令选项]

子命令:
  serve               启动 HTTP 后端（已实现路由本地服务，其余代理回 Tornado）
  import-calibre      把 Calibre 书库单向只读迁移到三层模型，输出迁移报告
  repair-mobi-titles  预览或恢复旧偏移错误产生的 MOBI 书名
  reindex-normalize   重算全库归一化键并重建作品归组，输出差异报告

全局选项:
  -h, --help      显示帮助
  -v, --version   显示版本
`

// Run executes the booksvr entry point with the given arguments (including the
// program name at index 0) and returns an error instead of calling os.Exit so
// that it stays testable.
func Run(args []string) error {
	if len(args) < 2 {
		fmt.Fprint(os.Stdout, usage)
		return nil
	}

	switch args[1] {
	case "--help", "-h", "help":
		fmt.Fprint(os.Stdout, usage)
		return nil
	case "--version", "-v":
		fmt.Fprintln(os.Stdout, "booksvr "+version)
		return nil
	case "serve":
		return runServe(args[2:], os.Stdout)
	case "import-calibre":
		return runImportCalibre(args[2:], os.Stdout)
	case "repair-mobi-titles":
		return runRepairMobi(args[2:], os.Stdout)
	case "reindex-normalize":
		return runReindexNormalize(args[2:], os.Stdout)
	default:
		return fmt.Errorf("未知子命令 %q；运行 booksvr --help 查看用法", args[1])
	}
}

// runImportCalibre 把 Calibre 书库迁移到三层模型。
//
// 源库以只读方式打开，文件原地登记不复制；重复运行幂等。
func runImportCalibre(args []string, out io.Writer) error {
	fs := flag.NewFlagSet("import-calibre", flag.ContinueOnError)
	fs.SetOutput(out)
	source := fs.String("source", "", "Calibre metadata.db 路径（必填）")
	target := fs.String("target", "", "目标 SQLite 数据库路径（必填）")
	libraryRoot := fs.String("library-root", "", "Calibre 书库目录（默认取 metadata.db 所在目录）")
	if err := fs.Parse(args); err != nil {
		return err
	}
	if *source == "" {
		return errors.New("import-calibre: 必须用 -source 指定 Calibre metadata.db 路径")
	}
	if *target == "" {
		return errors.New("import-calibre: 必须用 -target 指定目标数据库路径")
	}
	if _, err := os.Stat(*source); err != nil {
		return fmt.Errorf("import-calibre: 无法访问源库 %s: %w", *source, err)
	}

	root := *libraryRoot
	if root == "" {
		root = filepath.Dir(*source)
	}

	// 导入会写 books.sort，触发 Calibre 的 title_sort 触发器；
	// 未注册该 SQL 函数会报 "no such function: title_sort"。
	httpapi.RegisterCalibreFunctions()

	db, err := sql.Open("sqlite", *target)
	if err != nil {
		return fmt.Errorf("import-calibre: 打开目标库失败: %w", err)
	}
	defer db.Close()

	// Migrate 是「加列」而非「建表」：它扩展已存在的 Calibre books 表，
	// 不创建它。因此目标库必须已经是 Calibre 派生的库，否则报错而不是
	// 静默建出一个缺 books 表的半成品。
	if err := library.Migrate(db); err != nil {
		return fmt.Errorf(
			"import-calibre: 目标库 %s 不是 Calibre 派生的书库（Migrate 只加列不建表）: %w",
			*target, err,
		)
	}

	report, err := migrate.ImportCalibre(db, *source, root)
	if err != nil {
		return fmt.Errorf("import-calibre: %w", err)
	}

	fmt.Fprint(out, report.String())
	return nil
}

// runReindexNormalize 执行全库归一化重算。
//
// 数据库路径必填：重算会改写 books 与 works，误指到别的库代价很高，
// 因此不提供默认值，强制调用方显式给出。
func runReindexNormalize(args []string, out io.Writer) error {
	fs := flag.NewFlagSet("reindex-normalize", flag.ContinueOnError)
	fs.SetOutput(out)
	dbPath := fs.String("db", "", "SQLite 数据库文件路径（必填）")
	backup := fs.Bool("backup", true, "重算前备份数据库文件")
	if err := fs.Parse(args); err != nil {
		return err
	}
	if *dbPath == "" {
		return errors.New("reindex-normalize: 必须用 -db 指定数据库文件路径")
	}
	if _, err := os.Stat(*dbPath); err != nil {
		return fmt.Errorf("reindex-normalize: 无法访问数据库 %s: %w", *dbPath, err)
	}

	// 重算会写 books.sort，触发 Calibre 的 title_sort 触发器；
	// 未注册该 SQL 函数会报 "no such function: title_sort"。
	httpapi.RegisterCalibreFunctions()

	db, err := sql.Open("sqlite", *dbPath)
	if err != nil {
		return fmt.Errorf("reindex-normalize: 打开数据库失败: %w", err)
	}
	defer db.Close()

	opts := reindex.Options{}
	if *backup {
		opts.BackupPath = *dbPath
	}

	diff, err := reindex.ReindexNormalize(db, opts)
	if err != nil {
		return fmt.Errorf("reindex-normalize: %w", err)
	}

	fmt.Fprint(out, diff.String())
	// 备份失败不阻断重算，但必须让调用方以非零退出码感知。
	if diff.BackupError != "" {
		return fmt.Errorf("reindex-normalize: 备份失败: %s", diff.BackupError)
	}
	return nil
}

func main() {
	if err := Run(os.Args); err != nil {
		fmt.Fprintln(os.Stderr, "booksvr:", err)
		os.Exit(1)
	}
}
