package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"strings"
	"talebook/booksvr/internal/httpapi"
	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/scan"
)

func runRepairImport(args []string, out io.Writer) error {
	flags := flag.NewFlagSet("repair-import-compat", flag.ContinueOnError)
	flags.SetOutput(out)
	file := flags.String("user-db", "", "用户库")
	roots := flags.String("roots", "", "已确认的来源根目录，逗号分隔")
	if err := flags.Parse(args); err != nil {
		return err
	}
	if *file == "" || *roots == "" {
		return fmt.Errorf("必须提供 user-db 与 roots")
	}
	db, err := sql.Open("sqlite", *file+"?_pragma=busy_timeout(10000)")
	if err != nil {
		return err
	}
	defer db.Close()
	service := scan.NewService(db, nil)
	result, err := service.RecheckCompatibilityFailures(context.Background(), strings.Split(*roots, ","))
	if err != nil {
		return err
	}
	return json.NewEncoder(out).Encode(result)
}

func runRepairReasons(args []string, out io.Writer) error {
	flags := flag.NewFlagSet("repair-import-reasons", flag.ContinueOnError)
	flags.SetOutput(out)
	file := flags.String("user-db", "", "用户库")
	roots := flags.String("roots", "", "已确认的来源根目录，逗号分隔")
	if err := flags.Parse(args); err != nil {
		return err
	}
	if *file == "" || *roots == "" {
		return fmt.Errorf("必须提供 user-db 与 roots")
	}
	db, err := sql.Open("sqlite", *file+"?_pragma=busy_timeout(10000)")
	if err != nil {
		return err
	}
	defer db.Close()
	result, err := scan.NewService(db, nil).BackfillSkippedReasons(context.Background(), strings.Split(*roots, ","))
	if err != nil {
		return err
	}
	return json.NewEncoder(out).Encode(result)
}

func runRebaseline(args []string, out io.Writer) error {
	flags := flag.NewFlagSet("repair-source-baseline", flag.ContinueOnError)
	flags.SetOutput(out)
	root := flags.String("root", "", "来源根目录")
	expected := flags.String("expected-identity", "", "已核对的当前身份")
	file := flags.String("db", "", "书库")
	inspect := flags.Bool("inspect", false, "只读核对")
	if err := flags.Parse(args); err != nil {
		return err
	}
	if *root == "" {
		return fmt.Errorf("必须提供 root")
	}
	ctx := context.Background()
	if *inspect {
		result, err := library.InspectSourceRoot(ctx, *root)
		if err != nil {
			return err
		}
		return json.NewEncoder(out).Encode(result)
	}
	if *file == "" || *expected == "" {
		return fmt.Errorf("必须提供 db 与 expected-identity")
	}
	db, err := sql.Open("sqlite", *file+"?_pragma=busy_timeout(10000)")
	if err != nil {
		return err
	}
	defer db.Close()
	if err = library.Migrate(db); err != nil {
		return err
	}
	result, err := library.RebaselineSourceRoot(ctx, db, *root, *expected)
	if err != nil {
		return err
	}
	return json.NewEncoder(out).Encode(result)
}

func runSyncSources(args []string, out io.Writer) error {
	flags := flag.NewFlagSet("sync-sources", flag.ContinueOnError)
	flags.SetOutput(out)
	file := flags.String("db", "", "书库")
	roots := flags.String("roots", "", "来源根目录，逗号分隔")
	root := flags.String("library-root", "", "内部书库位置")
	if err := flags.Parse(args); err != nil {
		return err
	}
	if *file == "" || *roots == "" {
		return fmt.Errorf("必须提供 db 与 roots")
	}
	httpapi.RegisterCalibreFunctions()
	db, err := sql.Open("sqlite", *file+"?_pragma=journal_mode(WAL)&_pragma=busy_timeout(30000)")
	if err != nil {
		return err
	}
	defer db.Close()
	if err = library.Migrate(db); err != nil {
		return err
	}
	result, err := library.SyncSourceFiles(context.Background(), db, strings.Split(*roots, ","), *root, library.SourceSyncOptions{FullDiscovery: true})
	if err != nil {
		return err
	}
	return json.NewEncoder(out).Encode(result)
}
