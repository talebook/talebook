package scan

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"talebook/booksvr/internal/importdir"
	"talebook/booksvr/internal/sourcefile"
	"talebook/booksvr/internal/userdb"
)

func (s *Service) setDuplicateReason(row *userdb.ScanFile, digest string) bool {
	var id, bookID int64
	var path, status, raw string
	err := s.DB.QueryRow(`SELECT id,path,status,COALESCE(book_id,0),COALESCE(data,'{}') FROM scanfiles WHERE hash=? AND id<>? LIMIT 1`, digest, row.ID).Scan(&id, &path, &status, &bookID, &raw)
	if err != nil {
		setRowData(row, "skip_reason", "文件内容重复，保留项的来源信息暂时无法核实", "skip_reason_code", "duplicate.unresolved")
		return false
	}
	reason := fmt.Sprintf("文件内容与扫描记录 #%d 相同，保留来源：%s", id, path)
	if bookID > 0 {
		reason = fmt.Sprintf("文件内容重复，已关联图书 #%d；来源：%s", bookID, path)
	} else if status == userdb.ScanStatusFailed {
		data := map[string]any{}
		_ = json.Unmarshal([]byte(raw), &data)
		problem, _ := data["import_error"].(string)
		if problem == "" {
			problem, _ = data["index_error"].(string)
		}
		if problem == "" {
			problem, _ = data["analysis_error"].(string)
		}
		if problem != "" {
			reason += "；核对时保留项失败原因：" + problem
		}
	} else {
		reason += "；核对时保留项尚未入库，不会重复处理相同内容"
	}
	setRowData(row, "skip_reason", reason, "skip_reason_code", "duplicate.content", "duplicate_scan_id", id, "duplicate_book_id", bookID, "duplicate_path", path, "duplicate_hash", digest, "duplicate_checked_at", s.now())
	return true
}

type ReasonBackfillResult struct{ Checked, Updated, Missing, Unresolved, Changed int }

// BackfillSkippedReasons only adds explanations to unchanged dropped records.
// It never resets statuses, extracts archives, or starts an import worker.
func (s *Service) BackfillSkippedReasons(ctx context.Context, roots []string) (ReasonBackfillResult, error) {
	result := ReasonBackfillResult{}
	rows, err := s.DB.QueryContext(ctx, `SELECT `+scanFileColumns+` FROM scanfiles WHERE status='drop' ORDER BY path,id`)
	if err != nil {
		return result, err
	}
	var pending []*userdb.ScanFile
	for rows.Next() {
		row, e := scanRow(rows.Scan)
		if e != nil {
			rows.Close()
			return result, e
		}
		if reason, _ := row.Data["skip_reason"].(string); strings.TrimSpace(reason) == "" {
			pending = append(pending, row)
		}
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return result, err
	}
	for _, row := range pending {
		if err := ctx.Err(); err != nil {
			return result, err
		}
		allowed := false
		for _, root := range roots {
			if importdir.IsWithin(row.Path, root) {
				allowed = true
				break
			}
		}
		if !allowed {
			continue
		}
		var original string
		if err := s.DB.QueryRowContext(ctx, `SELECT data FROM scanfiles WHERE id=? AND status='drop' AND hash=? AND path=?`, row.ID, row.Hash, row.Path).Scan(&original); err != nil {
			continue
		}
		var current map[string]any
		if json.Unmarshal([]byte(original), &current) != nil {
			continue
		}
		beforeJSON, _ := json.Marshal(row.Data)
		currentJSON, _ := json.Marshal(current)
		if string(beforeJSON) != string(currentJSON) {
			continue
		}
		result.Checked++
		if sourcefile.IsReference(row.Path) || row.Data["archive_path"] != nil {
			setRowData(row, "skip_reason", "历史压缩包条目未保存具体跳过原因，本次未解压复核", "skip_reason_code", "legacy.archive_unverified")
			result.Unresolved++
		} else {
			before, statErr := os.Stat(row.Path)
			if statErr != nil {
				setRowData(row, "skip_reason", "历史跳过项的源文件当前无法读取："+statErr.Error(), "skip_reason_code", "source.unavailable")
				result.Missing++
			} else {
				digest, readErr := FileSHA256(row.Path)
				after, afterErr := os.Stat(row.Path)
				if afterErr != nil || !os.SameFile(before, after) || before.Size() != after.Size() || !before.ModTime().Equal(after.ModTime()) {
					result.Changed++
					continue
				}
				if readErr != nil {
					setRowData(row, "skip_reason", "无法复核历史跳过原因："+readErr.Error(), "skip_reason_code", "source.read")
					result.Unresolved++
				} else if !s.setDuplicateReason(row, digest) {
					setRowData(row, "skip_reason", "历史记录未保存跳过原因，当前未找到内容相同的保留项", "skip_reason_code", "legacy.unverified")
					result.Unresolved++
				}
			}
		}
		next, err := json.Marshal(row.Data)
		if err != nil {
			return result, err
		}
		update, err := s.DB.ExecContext(ctx, `UPDATE scanfiles SET data=? WHERE id=? AND status='drop' AND path=? AND hash=? AND data=?`, string(next), row.ID, row.Path, row.Hash, original)
		if err != nil {
			return result, err
		}
		n, _ := update.RowsAffected()
		result.Updated += int(n)
	}
	return result, nil
}
