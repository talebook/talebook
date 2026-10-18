package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"talebook/booksvr/internal/coverart"
	"talebook/booksvr/internal/httpapi"
	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/scan"
	"time"
)

func runImportPending(args []string, out io.Writer) error {
	flags := flag.NewFlagSet("import-pending", flag.ContinueOnError)
	flags.SetOutput(out)
	users := flags.String("user-db", "", "用户库")
	books := flags.String("db", "", "书库")
	root := flags.String("library-root", "", "封面目录")
	limit := flags.Int("limit", 100, "单次至多 500 本")
	workers := flags.Int("workers", 4, "预取并发 0-4")
	deferCovers := flags.Bool("defer-covers", true, "后台提取封面")
	owner := flags.Int64("user", 1, "管理员 ID")
	if err := flags.Parse(args); err != nil {
		return err
	}
	if *users == "" || *books == "" || *limit < 1 || *limit > 500 || *workers < 0 || *workers > 4 {
		return fmt.Errorf("请提供两个数据库，并使用 limit=1..500、workers=0..4")
	}
	httpapi.RegisterCalibreFunctions()
	db, err := sql.Open("sqlite", *users+"?_pragma=journal_mode(WAL)&_pragma=busy_timeout(30000)")
	if err != nil {
		return err
	}
	defer db.Close()
	lib, err := sql.Open("sqlite", *books+"?_pragma=journal_mode(WAL)&_pragma=busy_timeout(30000)")
	if err != nil {
		return err
	}
	defer lib.Close()
	if err = library.Migrate(lib); err != nil {
		return err
	}
	if err = coverart.MigrateQueue(lib); err != nil {
		return err
	}
	if *root == "" {
		*root = filepath.Dir(*books)
	}
	service := scan.NewService(db, nil)
	service.LibraryDB = lib
	service.LibraryRoot = *root
	service.DeferCovers = *deferCovers
	service.PrepareWorkers = *workers
	rows, err := service.ReadyBatch(0, *limit)
	if err != nil {
		return err
	}
	var hashes []string
	for _, row := range rows {
		hashes = append(hashes, row.Hash)
	}
	if len(hashes) == 0 {
		return fmt.Errorf("没有待导入记录")
	}
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()
	start := time.Now()
	result, err := service.ImportContext(ctx, hashes, *owner, false, scan.ModeIndex)
	if err != nil {
		return err
	}
	return json.NewEncoder(out).Encode(map[string]any{"result": result, "seconds": time.Since(start).Seconds(), "workers": *workers, "deferred_covers": *deferCovers})
}
