package main

import (
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"talebook/booksvr/internal/httpapi"
	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/mobimeta"
)

type titleRepair struct {
	FormatID int64         `json:"format_id"`
	BookID   int64         `json:"book_id"`
	Path     string        `json:"path"`
	Old      string        `json:"old_title"`
	New      string        `json:"new_title"`
	Author   string        `json:"author"`
	Work     sql.NullInt64 `json:"old_work"`
	State    string        `json:"state"`
}

func processIdentity(pid string) (string, error) {
	b, err := os.ReadFile("/proc/" + pid + "/stat")
	if err != nil {
		return "", err
	}
	// comm may contain spaces and parentheses; starttime is field 22.
	f := strings.Fields(string(b)[strings.LastIndex(string(b), ")")+1:])
	if len(f) < 20 {
		return "", fmt.Errorf("invalid process stat")
	}
	return f[19], nil
}

func runRepairMobi(args []string, out io.Writer) error {
	fs := flag.NewFlagSet("repair-mobi-titles", flag.ContinueOnError)
	path := fs.String("db", "", "书库 metadata.db（必填，现有文件）")
	root := fs.String("library-root", "", "书库根目录（默认数据库所在目录）")
	apply := fs.Bool("apply", false, "执行恢复（请先在线备份），默认只读预览")
	journal := fs.String("journal", "", "追加并同步写入 JSONL 恢复日志（apply 必填）")
	watch := fs.String("watch-pid", "", "监视旧导入进程；进程结束或 PID 复用时退出")
	if err := fs.Parse(args); err != nil {
		return err
	}
	if *path == "" || (*apply && *journal == "") {
		return fmt.Errorf("必须指定 -db；-apply 必须指定 -journal")
	}
	if _, err := os.Stat(*path); err != nil {
		return err
	}
	if *root == "" {
		*root = filepath.Dir(*path)
	}
	identity := ""
	if *watch != "" {
		var err error
		identity, err = processIdentity(*watch)
		if err != nil {
			return err
		}
	}
	httpapi.RegisterCalibreFunctions()
	dsn := *path + "?_pragma=busy_timeout(0)"
	if !*apply {
		dsn = "file:" + *path + "?mode=ro&_pragma=busy_timeout(0)"
	}
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return err
	}
	defer db.Close()
	db.SetMaxOpenConns(1)
	var log *os.File
	if *apply {
		log, err = os.OpenFile(*journal, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600)
		if err != nil {
			return err
		}
		defer log.Close()
	}
	write := func(r titleRepair) error {
		if !*apply {
			return json.NewEncoder(out).Encode(r)
		}
		if err := json.NewEncoder(log).Encode(r); err != nil {
			return err
		}
		return log.Sync()
	}
	var cursor int64
	// Retry only lock/missing-file candidates; completed formats are never rescanned.
	pending := map[int64]titleRepair{}
	total := 0
	for {
		if *watch != "" {
			current, e := processIdentity(*watch)
			if e != nil || current != identity {
				return nil
			}
		}
		rows, err := db.Query(`SELECT f.id,b.id,f.path,b.title,coalesce(b.author_sort,''),b.work_id FROM book_formats f JOIN books b ON b.id=f.book_id WHERE f.id>? AND upper(f.format) IN ('MOBI','AZW','AZW3') ORDER BY f.id LIMIT 200`, cursor)
		if err != nil {
			if strings.Contains(err.Error(), "locked") || strings.Contains(err.Error(), "busy") {
				time.Sleep(200 * time.Millisecond)
				continue
			}
			return err
		}
		count := 0
		for rows.Next() {
			var r titleRepair
			if err = rows.Scan(&r.FormatID, &r.BookID, &r.Path, &r.Old, &r.Author, &r.Work); err != nil {
				rows.Close()
				return err
			}
			pending[r.FormatID] = r
			cursor = r.FormatID
			count++
		}
		if err = rows.Err(); err != nil {
			rows.Close()
			return err
		}
		rows.Close()
		for key, r := range pending {
			p := r.Path
			if !filepath.IsAbs(p) {
				p = filepath.Join(*root, p)
			}
			data, err := mobimeta.ReadHeaderFile(p)
			if err != nil {
				delete(pending, key)
				continue
			}
			var ok bool
			r.New, ok = mobimeta.RecoverPDBTitle(data, r.Old)
			if !ok {
				delete(pending, key)
				continue
			}
			r.State = "intent"
			if err = write(r); err != nil {
				return err
			}
			if *apply {
				ok, err = library.RepairTitle(db, r.BookID, r.Old, r.New, r.Author, r.Work)
				if err != nil {
					if strings.Contains(err.Error(), "locked") || strings.Contains(err.Error(), "busy") {
						continue
					}
					return err
				}
				if ok {
					r.State = "applied"
					total++
				} else {
					r.State = "skipped-concurrent-edit"
				}
				if err = write(r); err != nil {
					return err
				}
			}
			delete(pending, key)
		}
		if count == 200 {
			continue
		}
		if *watch == "" && len(pending) == 0 {
			fmt.Fprintf(os.Stderr, "repaired=%d\n", total)
			return nil
		}
		time.Sleep(2 * time.Second)
	}
}
