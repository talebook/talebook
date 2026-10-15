package httpapi

import (
	"context"
	"database/sql"
	"fmt"
	"sync"
	"time"

	"talebook/booksvr/internal/importdir"
	"talebook/booksvr/internal/scan"
	"talebook/booksvr/internal/userdb"
)

// attachImportWorker serializes writes from manual and automatic imports. The
// watcher reads persisted settings on every tick, including after a restart.
func attachImportWorker(ctx context.Context, opts ServeOptions, db *sql.DB) (ServeOptions, func()) {
	if opts.ScanService == nil || opts.StartScan == nil || opts.StartImport == nil || opts.SettingsPath == "" {
		return opts, func() {}
	}
	ctx, cancel := context.WithCancel(ctx)
	var workMu, statusMu sync.Mutex
	status := map[string]any{"state": "off", "queued": 0, "running": 0, "failed": 0, "last_scan_at": nil, "message": ""}
	// Existing scan rows survive restarts, so do not claim an already populated
	// library has never been scanned merely because the worker was restarted.
	var lastScan sql.NullString
	if db != nil && db.QueryRow(`SELECT MAX(create_time) FROM scanfiles`).Scan(&lastScan) == nil && lastScan.Valid {
		status["last_scan_at"] = lastScan.String
	}
	update := func(state, message string, running, failed int) {
		statusMu.Lock()
		defer statusMu.Unlock()
		status["state"], status["message"] = state, message
		status["running"], status["failed"] = running, failed
		if state == "scanning" {
			status["last_scan_at"] = time.Now().Format(time.RFC3339)
		}
	}
	opts.ImportWatchStatus = func() map[string]any {
		statusMu.Lock()
		defer statusMu.Unlock()
		copy := map[string]any{}
		for k, v := range status {
			copy[k] = v
		}
		return copy
	}
	startScan, startImport := opts.StartScan, opts.StartImport
	type job struct {
		kind string
		run  func() error
	}
	jobs := make(chan job, 32)
	manualDone := make(chan struct{})
	pending := map[string]int{"scan": 0, "import": 0}
	enqueue := func(kind string, run func() error) error {
		statusMu.Lock()
		defer statusMu.Unlock()
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}
		select {
		case jobs <- job{kind, run}:
			pending[kind]++
			status["manual_"+kind+"_running"] = true
			status["manual_"+kind+"_error"] = ""
			return nil
		default:
			return fmt.Errorf("已有过多导入任务排队，请等待当前任务完成")
		}
	}
	go func() {
		defer close(manualDone)
		for {
			select {
			case <-ctx.Done():
				return
			case task := <-jobs:
				workMu.Lock()
				if ctx.Err() != nil {
					workMu.Unlock()
					return
				}
				err := task.run()
				workMu.Unlock()
				statusMu.Lock()
				if task.kind == "scan" {
					status["last_scan_at"] = time.Now().Format(time.RFC3339)
				}
				pending[task.kind]--
				status["manual_"+task.kind+"_running"] = pending[task.kind] > 0
				if err != nil {
					status["manual_"+task.kind+"_error"] = err.Error()
				}
				statusMu.Unlock()
			}
		}
	}()
	opts.StartScan = func(path string, limit int) error {
		return enqueue("scan", func() error { return startScan(path, limit) })
	}
	opts.StartImport = func(hashes []string, id int64, deleteAfter bool, mode string) error {
		selected := append([]string(nil), hashes...)
		return enqueue("import", func() error { return startImport(selected, id, deleteAfter, mode) })
	}
	done := make(chan struct{})
	go func() {
		defer close(done)
		ticker := time.NewTicker(time.Second)
		defer ticker.Stop()
		var next time.Time
		var lastStamp [2]settingsFileStamp
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
			}
			settings := LoadSettings(opts.SettingsPath)
			if !settingBool(settings, "import_auto_watch_enabled", false) {
				update("off", "", 0, 0)
				next = time.Time{}
				continue
			}
			stamp := settingsStamp(opts.SettingsPath)
			if stamp == lastStamp && time.Now().Before(next) {
				continue
			}
			lastStamp = stamp
			interval, _ := scan.WatchInterval(toIntSetting(settings, "import_watch_interval_seconds", 30), 500, 30, 500)
			update("scanning", "", 1, 0)
			workMu.Lock()
			err := runAutoImport(ctx, opts, db, settings, startScan, startImport)
			workMu.Unlock()
			next = time.Now().Add(time.Duration(interval) * time.Second)
			if err != nil {
				update("failed", err.Error(), 0, 1)
			} else {
				update("watching", "等待下一次扫描", 0, 0)
			}
		}
	}()
	return opts, func() { cancel(); <-done; <-manualDone }
}

func runAutoImport(ctx context.Context, opts ServeOptions, db *sql.DB, settings map[string]any,
	startScan func(string, int) error, startImport func([]string, int64, bool, string) error) error {
	id := int64(toIntSetting(settings, "import_watch_user_id", 0))
	if id <= 0 {
		return fmt.Errorf("请重新保存自动监控设置以确认导入管理员")
	}
	reader, err := userdb.GetReaderByID(db, id)
	if err != nil || reader == nil || !reader.Admin {
		return fmt.Errorf("自动导入的管理员账号不可用")
	}
	dir := LiveImportDir(opts.ImportDir, opts.SettingsPath)
	roots := importdir.ConfiguredAllowedRoots(dir)
	for _, root := range roots {
		if err := ctx.Err(); err != nil {
			return err
		}
		if check := importdir.CheckImportDirectory(root, dir); check.Status == "error" {
			return fmt.Errorf("%s: %s", root, check.Msg)
		}
		if err := startScan(root, dir.ScanBatchSize); err != nil {
			return err
		}
	}
	rows, _, err := opts.ScanService().List(scan.ListOptions{Filter: scan.ListFilter("all")})
	if err != nil {
		return err
	}
	var hashes []string
	for _, row := range rows {
		if row.Status != userdb.ScanStatusReady {
			continue
		}
		for _, root := range roots {
			if importdir.IsWithin(row.Path, root) {
				hashes = append(hashes, row.Hash)
				break
			}
		}
	}
	if len(hashes) == 0 {
		return nil
	}
	if err := ctx.Err(); err != nil {
		return err
	}
	return startImport(hashes, id, false, normalizeImportMode(dir))
}
