package scan

import (
	"database/sql"
	"fmt"
	"strings"

	"talebook/booksvr/internal/userdb"
)

// Summary 复刻 Scanner.summary()。
type Summary struct {
	Total  int64 `json:"total"`
	Done   int64 `json:"done"`
	Todo   int64 `json:"todo"`
	Failed int64 `json:"failed"`
}

// doneStatuses 与 Python 的 done_status 一致。
var doneStatuses = []string{
	userdb.ScanStatusExist,
	userdb.ScanStatusImported,
	userdb.ScanStatusIndexed,
}

// failedStatuses 与 Python 的 failed_status 一致。
var failedStatuses = []string{
	userdb.ScanStatusFailed,
	userdb.ScanStatusDeleteFailed,
}

// countStatuses 复刻 Scanner.count() 的初始键集合与顺序。
//
// 注意：Python 用 dict 初始化，键顺序即插入顺序；Go 用 map 无法保序，
// 因此调用方若需要稳定输出应自行排序。这里保留全部键，未知状态动态追加。
var countStatuses = []string{
	userdb.ScanStatusNew,
	userdb.ScanStatusDrop,
	userdb.ScanStatusExist,
	userdb.ScanStatusReady,
	userdb.ScanStatusQueued,
	userdb.ScanStatusImporting,
	userdb.ScanStatusImported,
	userdb.ScanStatusIndexed,
	userdb.ScanStatusDeleteFailed,
	userdb.ScanStatusFailed,
}

// Summary 复刻 Scanner.summary()。
func (s *Service) Summary() (Summary, error) {
	var out Summary
	if err := s.DB.QueryRow(`SELECT COUNT(*) FROM scanfiles`).Scan(&out.Total); err != nil {
		return out, fmt.Errorf("scan: 统计总数失败: %w", err)
	}
	doneQ := `SELECT COUNT(*) FROM scanfiles WHERE status IN (` + placeholders(len(doneStatuses)) + `)`
	if err := s.DB.QueryRow(doneQ, toArgs(doneStatuses)...).Scan(&out.Done); err != nil {
		return out, fmt.Errorf("scan: 统计完成数失败: %w", err)
	}
	failQ := `SELECT COUNT(*) FROM scanfiles WHERE status IN (` + placeholders(len(failedStatuses)) + `)`
	if err := s.DB.QueryRow(failQ, toArgs(failedStatuses)...).Scan(&out.Failed); err != nil {
		return out, fmt.Errorf("scan: 统计失败数失败: %w", err)
	}
	out.Todo = out.Total - out.Done - out.Failed
	return out, nil
}

// CountByStatus 复刻 Scanner.count(query)：按状态计数，未知状态动态追加。
func (s *Service) CountByStatus(scanID, importID int64, byImport bool) (map[string]int64, error) {
	count := make(map[string]int64, len(countStatuses))
	for _, st := range countStatuses {
		count[st] = 0
	}

	col := "scan_id"
	if byImport {
		col = "import_id"
	}
	rows, err := s.DB.Query(`SELECT status FROM scanfiles WHERE `+col+` = ?`, scanID)
	if err != nil {
		return nil, fmt.Errorf("scan: 查询状态失败: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var st string
		if err := rows.Scan(&st); err != nil {
			return nil, fmt.Errorf("scan: 读取状态失败: %w", err)
		}
		count[st]++
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("scan: 遍历状态失败: %w", err)
	}
	return count, nil
}

// ScanStatus 复刻 Scanner.scan_status()，返回 (scan_id, 计数)。
func (s *Service) ScanStatus() (int64, map[string]int64, error) {
	return s.statusBy("scan_id")
}

// ImportStatus 复刻 Scanner.import_status()，返回 (import_id, 计数)。
func (s *Service) ImportStatus() (int64, map[string]int64, error) {
	return s.statusBy("import_id")
}

func (s *Service) statusBy(col string) (int64, map[string]int64, error) {
	var id sql.NullInt64
	if err := s.DB.QueryRow(`SELECT MAX(` + col + `) FROM scanfiles`).Scan(&id); err != nil {
		return 0, nil, fmt.Errorf("scan: 查询最大 %s 失败: %w", col, err)
	}
	if !id.Valid {
		return 0, map[string]int64{}, nil
	}
	count, err := s.CountByStatus(id.Int64, 0, col == "import_id")
	if err != nil {
		return 0, nil, err
	}
	return id.Int64, count, nil
}

// CountReady 复刻 Scanner.build_query(hashlist).count()。
//
// hashlist 为 nil 表示统计全部 READY 记录。
func (s *Service) CountReady(hashlist []string) (int64, error) {
	q := `SELECT COUNT(*) FROM scanfiles WHERE status = ?`
	args := []any{userdb.ScanStatusReady}
	if hashlist != nil {
		if len(hashlist) == 0 {
			return 0, nil
		}
		q += ` AND hash IN (` + placeholders(len(hashlist)) + `)`
		args = append(args, toArgs(hashlist)...)
	}
	var n int64
	if err := s.DB.QueryRow(q, args...).Scan(&n); err != nil {
		return 0, fmt.Errorf("scan: 统计待导入失败: %w", err)
	}
	return n, nil
}

// Delete 复刻 Scanner.delete(hashlist)。
//
// hashlist 为 nil 表示删除全部；否则按 hash 列表或单个 hash 删除。
func (s *Service) Delete(hashlist []string) (int64, error) {
	var (
		res sql.Result
		err error
	)
	if hashlist == nil {
		res, err = s.DB.Exec(`DELETE FROM scanfiles`)
	} else if len(hashlist) == 0 {
		return 0, nil
	} else {
		q := `DELETE FROM scanfiles WHERE hash IN (` + placeholders(len(hashlist)) + `)`
		res, err = s.DB.Exec(q, toArgs(hashlist)...)
	}
	if err != nil {
		return 0, fmt.Errorf("scan: 删除失败: %w", err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("scan: 读取删除行数失败: %w", err)
	}
	return n, nil
}

// ListFilter 复刻 ScanList 的 filter 参数。
type ListFilter string

const (
	FilterAll    ListFilter = "all"
	FilterTodo   ListFilter = "todo"
	FilterDone   ListFilter = "done"
	FilterFailed ListFilter = "failed"
)

// ListOptions 复刻 ScanList 的查询参数。
type ListOptions struct {
	Num    int    // <= 0 表示不分页
	Page   int    // 从 0 开始
	Sort   string // id/path/name/create_time/update_time
	Desc   bool
	Filter ListFilter
}

// sortColumns 复刻 ScanList 的 order 映射。
var sortColumns = map[string]string{
	"id":          "id",
	"path":        "path",
	"name":        "name",
	"create_time": "create_time",
	"update_time": "update_time",
}

// List 复刻 ScanList.get() 的查询部分，返回 (条目, 总数)。
func (s *Service) List(opts ListOptions) ([]*userdb.ScanFile, int64, error) {
	col, ok := sortColumns[opts.Sort]
	if !ok {
		col = "create_time"
	}
	order := "DESC"
	if !opts.Desc {
		order = "ASC"
	}

	where := ""
	var args []any
	switch opts.Filter {
	case FilterTodo:
		all := append(append([]string{}, doneStatuses...), failedStatuses...)
		where = ` WHERE status NOT IN (` + placeholders(len(all)) + `)`
		args = toArgs(all)
	case FilterDone:
		where = ` WHERE status IN (` + placeholders(len(doneStatuses)) + `)`
		args = toArgs(doneStatuses)
	case FilterFailed:
		where = ` WHERE status IN (` + placeholders(len(failedStatuses)) + `)`
		args = toArgs(failedStatuses)
	}

	var total int64
	if err := s.DB.QueryRow(`SELECT COUNT(*) FROM scanfiles`+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("scan: 统计列表失败: %w", err)
	}

	q := `SELECT id, scan_id, import_id, name, path, hash, status, title, author,
		publisher, tags, create_time, update_time, book_id, data
		FROM scanfiles` + where + ` ORDER BY ` + col + ` ` + order
	qargs := append([]any{}, args...)
	if opts.Num > 0 {
		q += ` LIMIT ? OFFSET ?`
		qargs = append(qargs, opts.Num, opts.Page*opts.Num)
	}

	rows, err := s.DB.Query(q, qargs...)
	if err != nil {
		return nil, 0, fmt.Errorf("scan: 查询列表失败: %w", err)
	}
	defer rows.Close()

	var out []*userdb.ScanFile
	for rows.Next() {
		row, err := scanRow(rows.Scan)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, row)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("scan: 遍历列表失败: %w", err)
	}
	return out, total, nil
}

// placeholders 生成 "?,?,?" 形式的占位符串。
func placeholders(n int) string {
	if n <= 0 {
		return ""
	}
	return strings.TrimSuffix(strings.Repeat("?,", n), ",")
}

// toArgs 把字符串切片转成 []any。
func toArgs(ss []string) []any {
	out := make([]any, len(ss))
	for i, s := range ss {
		out[i] = s
	}
	return out
}
