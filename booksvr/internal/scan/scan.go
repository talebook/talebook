// Package scan 复刻 webserver/services/scan.py 的扫描流水线。
//
// 覆盖：目录遍历收集候选、临时哈希登记、真实哈希计算、
// 媒体分析、元数据提取、重复检测与状态落库。
//
// 不覆盖：自动监控循环（run_auto_watch）与导入落库（do_import），
// 它们依赖 Calibre 的写库接口，属于后续工作。
package scan

import (
	"crypto/md5"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"talebook/booksvr/internal/importmeta"
	"talebook/booksvr/internal/media"
	"talebook/booksvr/internal/userdb"
)

// 导入模式常量，对齐 Python 的 IMPORT_MODE_*。
const (
	ModeIndex = "index"
	ModeCopy  = "copy"
	ModeMove  = "move"
)

// NormalizeImportMode 复刻 normalize_import_mode。
//
// 显式模式优先；否则 deleteAfter 为真时用 move；再否则用已保存的模式；
// 已保存模式非法时退回 index。
func NormalizeImportMode(importMode string, deleteAfter bool, savedMode string) string {
	if isImportMode(importMode) {
		return importMode
	}
	if deleteAfter {
		return ModeMove
	}
	if isImportMode(savedMode) {
		return savedMode
	}
	return ModeIndex
}

// isImportMode 报告模式是否合法。
func isImportMode(mode string) bool {
	return mode == ModeIndex || mode == ModeCopy || mode == ModeMove
}

// Task 是一个待扫描的文件候选。
type Task struct {
	// Name 是文件名。
	Name string
	// Path 是完整路径。
	Path string
	// Format 是小写扩展名。
	Format string
}

// CollectTasks 复刻 collect_scan_tasks。
//
// donePaths 里已登记且处理完毕的路径直接跳过、不占批次名额，
// 保证扫描窗口始终被真正需要处理的文件填满。
//
// 返回 (是否有书籍文件, 任务列表, 跳过数)。
func CollectTasks(pathDir string, limit int, donePaths map[string]bool, supported map[string]bool) (bool, []Task, int, error) {
	// 普通 ZIP/RAR 可能是小说合集，不能让大量非漫画压缩包占满每个批次。
	// 先收集明确的电子书/漫画格式，余下名额再校验通用压缩包。
	books, archives := map[string]bool{}, map[string]bool{}
	for format, enabled := range supported {
		if format == "zip" || format == "rar" {
			archives[format] = enabled
		} else {
			books[format] = enabled
		}
	}
	hasBooks, tasks, skipped, err := collectTasksByFormat(pathDir, limit, donePaths, books)
	if err != nil || len(archives) == 0 || (limit > 0 && len(tasks) >= limit) {
		return hasBooks, tasks, skipped, err
	}
	remaining := limit
	if limit > 0 {
		remaining -= len(tasks)
	}
	hasArchives, extra, skippedArchives, err := collectTasksByFormat(pathDir, remaining, donePaths, archives)
	return hasBooks || hasArchives, append(tasks, extra...), skipped + skippedArchives, err
}

func collectTasksByFormat(pathDir string, limit int, donePaths map[string]bool, supported map[string]bool) (bool, []Task, int, error) {
	hasBooks := false
	tasks := []Task{}
	skipped := 0

	err := filepath.WalkDir(pathDir, func(p string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if d.IsDir() {
			if p == pathDir {
				return nil
			}
			name := d.Name()
			// 排除隐藏目录、@__ 前缀目录与符号链接目录。
			if strings.HasPrefix(name, ".") || strings.HasPrefix(name, "@__") {
				return filepath.SkipDir
			}
			if d.Type()&os.ModeSymlink != 0 {
				return filepath.SkipDir
			}
			return nil
		}
		if limit > 0 && len(tasks) >= limit {
			return filepath.SkipAll
		}
		name := d.Name()
		if strings.HasPrefix(name, ".") {
			return nil
		}
		if d.Type()&os.ModeSymlink != 0 {
			return nil
		}
		info, err := d.Info()
		if err != nil || !info.Mode().IsRegular() {
			return nil
		}
		format := strings.ToLower(strings.TrimPrefix(filepath.Ext(name), "."))
		if !supported[format] {
			return nil
		}
		hasBooks = true
		if donePaths[p] {
			skipped++
			return nil
		}
		tasks = append(tasks, Task{Name: name, Path: p, Format: format})
		if limit > 0 && len(tasks) >= limit {
			return filepath.SkipAll
		}
		return nil
	})
	if err != nil {
		return hasBooks, tasks, skipped, fmt.Errorf("scan: 遍历目录失败: %w", err)
	}
	return hasBooks, tasks, skipped, nil
}

// TempHash 复刻临时哈希：`fstat:<size>/<md5(文件名)>`。
//
// 用于在计算真实哈希前先登记记录，中断后可按临时哈希重新处理。
func TempHash(name string, size int64) string {
	sum := md5.Sum([]byte(name))
	return fmt.Sprintf("fstat:%d/%s", size, hex.EncodeToString(sum[:]))
}

// FileSHA256 计算文件的 sha256，返回 `sha256:<hex>` 形式。
func FileSHA256(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return "sha256:" + hex.EncodeToString(h.Sum(nil)), nil
}

// DonePaths 复刻 _load_done_paths：加载已登记且处理完毕的文件路径。
//
// 判定条件与扫描第二阶段对已知路径的跳过条件严格一致：
// NEW 状态行、中断残留的 `fstat:` 临时哈希行都不算 done。
func DonePaths(db *sql.DB, pathDir string) (map[string]bool, error) {
	prefix := strings.TrimRight(pathDir, string(filepath.Separator)) + string(filepath.Separator)
	rows, err := db.Query(`SELECT path FROM scanfiles
		WHERE path LIKE ? ESCAPE '\' AND status != ? AND hash NOT LIKE 'fstat:%'`,
		escapeLike(prefix)+"%", userdb.ScanStatusNew)
	if err != nil {
		return nil, fmt.Errorf("scan: 查询已完成路径失败: %w", err)
	}
	defer rows.Close()

	out := map[string]bool{}
	for rows.Next() {
		var p string
		if err := rows.Scan(&p); err != nil {
			return nil, fmt.Errorf("scan: 扫描已完成路径失败: %w", err)
		}
		out[p] = true
	}
	return out, rows.Err()
}

// escapeLike 转义 LIKE 模式中的通配符。
func escapeLike(s string) string {
	r := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)
	return r.Replace(s)
}

// Result 是一次扫描的统计结果。
type Result struct {
	// ScanID 是本次扫描的任务 ID。
	ScanID int64
	// Done 是已处理完毕的路径数。
	Done int
	// Skipped 是被跳过的候选数。
	Skipped int
	// Candidates 是候选文件数。
	Candidates int
	// Inserted 是新建的记录数。
	Inserted int
	// Ready 是分析通过、可导入的记录数。
	Ready int
	// Exist 是判定为书库中已存在的记录数。
	Exist int
	// Failed 是分析失败的记录数。
	Failed int
	// Dropped 是被丢弃（重复或文件消失）的记录数。
	Dropped int
}

// Service 复刻 ScanService 的扫描部分。
type Service struct {
	// DB 是用户库句柄。
	DB *sql.DB
	// LibraryDB 是书库句柄，用于重复检测；为 nil 时跳过重复检测。
	LibraryDB *sql.DB
	// LibraryRoot 是书库根目录，用于写入提取出的封面；为空时跳过封面提取。
	LibraryRoot string
	// DeferCovers keeps artwork off the serialized import path in production.
	DeferCovers    bool
	PrepareWorkers int
	// BookStorageRoot 是复制/移动导入的文件存储根目录；为空时回退到 LibraryRoot。
	BookStorageRoot string
	// SupportedFormats 是支持的文件扩展名（小写，不含点）。
	SupportedFormats map[string]bool
	// SavedImportMode 是配置中已保存的导入模式（index/copy/move）。
	SavedImportMode string
	// Clock 可注入，便于测试；为 nil 时用 time.Now。
	Clock      func() time.Time
	progressMu sync.RWMutex
	progress   Progress
	// Now 返回当前时间字符串。
	now func() string
}

// NewService 构造一个扫描服务。
func NewService(db *sql.DB, supported map[string]bool) *Service {
	s := &Service{DB: db, SupportedFormats: supported}
	s.now = func() string { return s.clock().Format("2006-01-02 15:04:05") }
	return s
}

// clock 返回当前时间。
func (s *Service) clock() time.Time {
	if s.Clock != nil {
		return s.Clock()
	}
	return time.Now()
}

// Scan 复刻 _do_scan：扫描目录并登记/分析文件。
func (s *Service) Scan(pathDir string, limit int) (Result, error) {
	res := Result{ScanID: s.clock().Unix()}

	donePaths, err := DonePaths(s.DB, pathDir)
	if err != nil {
		return res, err
	}
	res.Done = len(donePaths)

	hasBooks, tasks, skipped, err := CollectTasks(pathDir, limit, donePaths, s.SupportedFormats)
	if err != nil {
		return res, err
	}
	res.Skipped = skipped
	res.Candidates = len(tasks)
	if !hasBooks {
		return res, nil
	}

	// 第一阶段：登记候选文件（临时哈希）。
	rows, err := s.registerTasks(tasks, res.ScanID)
	if err != nil {
		return res, err
	}
	res.Inserted = len(rows)

	// 第二阶段：计算真实哈希、分析媒体、提取元数据。
	for _, row := range rows {
		outcome, err := s.processRow(row)
		if err != nil {
			return res, err
		}
		switch outcome {
		case userdb.ScanStatusReady:
			res.Ready++
		case userdb.ScanStatusExist:
			res.Exist++
		case userdb.ScanStatusFailed:
			res.Failed++
		case userdb.ScanStatusDrop:
			res.Dropped++
		}
	}
	return res, nil
}

// registerTasks 复刻 _do_scan 的第一阶段：为每个候选建立或复用记录。
func (s *Service) registerTasks(tasks []Task, scanID int64) ([]*userdb.ScanFile, error) {
	rows := make([]*userdb.ScanFile, 0, len(tasks))
	for _, task := range tasks {
		existing, err := getScanFileByPath(s.DB, task.Path)
		if err != nil {
			return nil, err
		}
		if existing != nil {
			existing.ScanID = scanID
			existing.UpdateTime = s.now()
			// 只处理 NEW 状态的记录；其余状态若哈希已是真实哈希则跳过。
			if existing.Status == userdb.ScanStatusNew || strings.HasPrefix(existing.Hash, "fstat:") {
				if err := saveScanFile(s.DB, existing); err != nil {
					return nil, err
				}
				rows = append(rows, existing)
			}
			continue
		}

		info, err := os.Stat(task.Path)
		if err != nil {
			// 文件在收集与登记之间消失，跳过。
			continue
		}
		row := &userdb.ScanFile{
			ScanID:     scanID,
			Name:       task.Name,
			Path:       task.Path,
			Hash:       TempHash(task.Path, info.Size()),
			Status:     userdb.ScanStatusNew,
			CreateTime: s.now(),
			UpdateTime: s.now(),
			Data:       map[string]any{},
		}
		if err := insertScanFile(s.DB, row); err != nil {
			return nil, err
		}
		rows = append(rows, row)
	}
	return rows, nil
}

// processRow 复刻 _do_scan 的第二阶段：处理单条记录。
//
// 返回最终状态。
func (s *Service) processRow(row *userdb.ScanFile) (string, error) {
	return s.processFileRow(row, row.Path)
}

// processFileRow keeps the original source reference in the database while
// inspecting a temporary file materialized from an archive.
func (s *Service) processFileRow(row *userdb.ScanFile, filePath string) (string, error) {
	realHash, err := FileSHA256(filePath)
	if err != nil {
		// 文件已不存在：标记 drop。
		row.Status = userdb.ScanStatusDrop
		return row.Status, saveScanFile(s.DB, row)
	}

	// 真实哈希已存在且关联书籍仍在时，判为重复。
	dup, err := s.findDuplicate(realHash, row.ID)
	if err != nil {
		return "", err
	}
	if dup {
		row.Status = userdb.ScanStatusDrop
		return row.Status, saveScanFile(s.DB, row)
	}

	row.Hash = realHash
	if err := saveScanFile(s.DB, row); err != nil {
		return "", err
	}

	// 媒体分析：签名、容器结构与资源预算。
	format := strings.ToLower(strings.TrimPrefix(filepath.Ext(row.Path), "."))
	analysisBefore, _ := os.Stat(filePath)
	analysis, err := media.AnalyzeFile(filePath, format)
	if err != nil {
		row.Status = userdb.ScanStatusFailed
		if me, ok := err.(*media.Error); ok {
			setRowData(row, "analysis_error", me.Message, "analysis_error_code", me.Code,
				"declared_format", format)
		} else {
			setRowData(row, "analysis_error", err.Error(), "declared_format", format)
		}
		return row.Status, saveScanFile(s.DB, row)
	}
	// ToDict 返回 map，需展开成键值对后再合并。
	for k, v := range analysis.ToDict() {
		setRowData(row, k, v)
	}
	stampAnalysis(row, filePath, analysisBefore)

	// 元数据：受管文档与漫画容器用文件名，其余尝试解析。
	mi := s.extractMetadata(filePath, format)

	row.Title = mi.Title
	if len(mi.Authors) > 0 {
		row.Author = mi.Authors[0]
	} else {
		row.Author = ""
	}
	row.Status = userdb.ScanStatusReady

	// 重复检测：同名同作者且书库已有该格式时判为 exist。
	exist, err := s.markExisting(row, mi)
	if err != nil {
		return "", err
	}
	if exist {
		row.Status = userdb.ScanStatusExist
	}
	return row.Status, saveScanFile(s.DB, row)
}

// extractMetadata 复刻 _do_scan 的元数据提取分支。
//
// 受管文档格式与漫画容器用文件名 + 「佚名」；txt/pdf 强制用文件名与「佚名」；
// 其余格式在 Go 侧暂无 Calibre 解析器，同样退回文件名元数据。
func (s *Service) extractMetadata(path, format string) importmeta.Metadata {
	return importmeta.FilenameMetadata(path)
}

// findDuplicate 复刻真实哈希重复检测。
//
// 若已有相同真实哈希的记录且其关联书籍仍存在，返回 true；
// 若书籍已被删除，清理旧记录并返回 false（允许重新导入）。
func (s *Service) findDuplicate(realHash string, currentID int64) (bool, error) {
	var id, bookID int64
	err := s.DB.QueryRow(`SELECT id, COALESCE(book_id,0) FROM scanfiles WHERE hash = ? LIMIT 1`,
		realHash).Scan(&id, &bookID)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("scan: 查询重复哈希失败: %w", err)
	}
	if id == currentID {
		return false, nil
	}
	// 未关联书籍（book_id 为 0）时无法确认书籍是否已删除，
	// 保守地判为重复——对齐 Python 的 `if existing.book_id:` 分支。
	if bookID == 0 {
		return true, nil
	}
	if s.bookExists(bookID) {
		return true, nil
	}
	// 书籍已删除：清理旧记录，允许重新导入。
	if _, err := s.DB.Exec(`DELETE FROM scanfiles WHERE id = ?`, id); err != nil {
		return false, fmt.Errorf("scan: 清理旧扫描记录失败: %w", err)
	}
	return false, nil
}

// bookExists 报告书库中是否存在该书。
func (s *Service) bookExists(bookID int64) bool {
	if s.LibraryDB == nil {
		return false
	}
	var n int
	if err := s.LibraryDB.QueryRow(`SELECT COUNT(1) FROM books WHERE id = ?`, bookID).Scan(&n); err != nil {
		return false
	}
	return n > 0
}

// markExisting 复刻同名同作者的重复检测。
//
// 书库中已有同名书且作者一致、且已含该格式时，把 book_id 写入并返回 true。
func (s *Service) markExisting(row *userdb.ScanFile, mi importmeta.Metadata) (bool, error) {
	if s.LibraryDB == nil {
		return false, nil
	}
	ids, err := booksWithSameTitle(s.LibraryDB, mi.Title)
	if err != nil || len(ids) == 0 {
		return false, err
	}
	books, err := loadBooksForMatch(s.LibraryDB, ids)
	if err != nil {
		return false, err
	}
	format := strings.ToLower(strings.TrimPrefix(filepath.Ext(row.Path), "."))
	for _, book := range importmeta.MatchingImportBooks(mi, format, books) {
		formats, _ := book["available_formats"].(string)
		if strings.Contains(strings.ToUpper(formats), strings.ToUpper(format)) {
			if id, ok := book["id"].(int64); ok {
				row.BookID = id
			}
			return true, nil
		}
	}
	return false, nil
}

// booksWithSameTitle 复刻 db.books_with_same_title：按书名精确匹配。
func booksWithSameTitle(db *sql.DB, title string) ([]int64, error) {
	rows, err := db.Query(`SELECT id FROM books WHERE title = ?`, title)
	if err != nil {
		return nil, fmt.Errorf("scan: 查询同名书籍失败: %w", err)
	}
	defer rows.Close()
	var out []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	return out, rows.Err()
}

// loadBooksForMatch 读取用于重复匹配的书籍信息（id / authors / available_formats）。
//
// 作者与格式分两次查询：若在一条 SQL 里同时 LEFT JOIN 两张一对多表，
// 会产生笛卡尔积，导致作者与格式重复。
func loadBooksForMatch(db *sql.DB, ids []int64) ([]map[string]any, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	placeholders := strings.TrimSuffix(strings.Repeat("?,", len(ids)), ",")
	args := make([]any, len(ids))
	for i, id := range ids {
		args[i] = id
	}

	authorsByBook, err := loadAuthorsByBook(db, placeholders, args)
	if err != nil {
		return nil, err
	}
	formatsByBook, err := loadFormatsByBook(db, placeholders, args)
	if err != nil {
		return nil, err
	}

	out := make([]map[string]any, 0, len(ids))
	for _, id := range ids {
		out = append(out, map[string]any{
			"id":                id,
			"authors":           authorsByBook[id],
			"available_formats": formatsByBook[id],
		})
	}
	return out, nil
}

// loadAuthorsByBook 批量读取每本书的作者名列表。
func loadAuthorsByBook(db *sql.DB, placeholders string, args []any) (map[int64][]string, error) {
	rows, err := db.Query(fmt.Sprintf(`
		SELECT bal.book, a.name
		FROM books_authors_link bal
		JOIN authors a ON a.id = bal.author
		WHERE bal.book IN (%s)
		ORDER BY bal.book, bal.id`, placeholders), args...)
	if err != nil {
		return nil, fmt.Errorf("scan: 查询书籍作者失败: %w", err)
	}
	defer rows.Close()

	out := map[int64][]string{}
	for rows.Next() {
		var bookID int64
		var name string
		if err := rows.Scan(&bookID, &name); err != nil {
			return nil, err
		}
		out[bookID] = append(out[bookID], name)
	}
	return out, rows.Err()
}

// loadFormatsByBook 批量读取每本书的格式列表（逗号分隔）。
func loadFormatsByBook(db *sql.DB, placeholders string, args []any) (map[int64]string, error) {
	rows, err := db.Query(fmt.Sprintf(`
		SELECT book, format FROM data WHERE book IN (%s) ORDER BY book, format`, placeholders), args...)
	if err != nil {
		return nil, fmt.Errorf("scan: 查询书籍格式失败: %w", err)
	}
	defer rows.Close()

	out := map[int64][]string{}
	for rows.Next() {
		var bookID int64
		var format string
		if err := rows.Scan(&bookID, &format); err != nil {
			return nil, err
		}
		out[bookID] = append(out[bookID], format)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	joined := make(map[int64]string, len(out))
	for bookID, formats := range out {
		joined[bookID] = strings.Join(formats, ",")
	}
	return joined, nil
}

// setRowData 复刻 _set_row_data：把键值合并进 data 字段。
func setRowData(row *userdb.ScanFile, kv ...any) {
	if row.Data == nil {
		row.Data = map[string]any{}
	}
	for i := 0; i+1 < len(kv); i += 2 {
		key, ok := kv[i].(string)
		if !ok {
			continue
		}
		row.Data[key] = kv[i+1]
	}
}

// SortedTasks 按路径排序任务，便于确定性测试。
func SortedTasks(tasks []Task) []Task {
	out := append([]Task{}, tasks...)
	sort.Slice(out, func(i, j int) bool { return out[i].Path < out[j].Path })
	return out
}
