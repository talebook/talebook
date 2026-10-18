package scan

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"strconv"
	"strings"
	"talebook/booksvr/internal/importdir"
	"talebook/booksvr/internal/media"
	"talebook/booksvr/internal/userdb"
)

type RecheckResult struct{ Checked, Recovered, Encrypted, Missing, Unchanged int }

// RecheckCompatibilityFailures touches only unchanged failed rows. Current
// imports and completed records are never reset, and retries are fingerprinted.
func (s *Service) RecheckCompatibilityFailures(ctx context.Context, roots []string) (RecheckResult, error) {
	result := RecheckResult{}
	rows, err := s.DB.QueryContext(ctx, `SELECT `+scanFileColumns+` FROM scanfiles WHERE status='failed' ORDER BY id`)
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
		pending = append(pending, row)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return result, err
	}
	for _, row := range pending {
		if e := ctx.Err(); e != nil {
			return result, e
		}
		code, _ := row.Data["analysis_error_code"].(string)
		if !strings.HasPrefix(code, "epub.") && code != "format.mismatch" {
			continue
		}
		declared, _ := row.Data["declared_format"].(string)
		if declared != "epub" {
			continue
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
		raw, err := json.Marshal(row.Data)
		if err != nil {
			return result, err
		}
		physical, release, e := s.resolveImportSource(row, ModeIndex)
		if e != nil {
			result.Missing++
			continue
		}
		info, e := os.Stat(physical)
		if e != nil {
			release()
			result.Missing++
			continue
		}
		stamp := strconv.FormatInt(info.Size(), 10) + ":" + strconv.FormatInt(info.ModTime().UnixNano(), 10) + ":" + analysisFileIdentity(info)
		if analysisFileIdentity(info) != "" && row.Data["compat_recheck_version"] == "2" && row.Data["compat_recheck_stamp"] == stamp {
			release()
			result.Unchanged++
			continue
		}
		result.Checked++
		analysis, e := media.AnalyzeFile(physical, "epub")
		setRowData(row, "compat_recheck_version", "2", "compat_recheck_stamp", stamp)
		if e == nil {
			for key, value := range analysis.ToDict() {
				setRowData(row, key, value)
			}
			setRowData(row, "previous_analysis_error", row.Data["analysis_error"])
			delete(row.Data, "analysis_error")
			delete(row.Data, "analysis_error_code")
			stampAnalysis(row, physical, info)
			row.Status = userdb.ScanStatusReady
		} else {
			var problem *media.Error
			if errors.As(e, &problem) {
				setRowData(row, "analysis_error", problem.Message, "analysis_error_code", problem.Code)
				if problem.Code == "epub.encrypted" {
					result.Encrypted++
				}
			}
		}
		release()
		next, err := json.Marshal(row.Data)
		if err != nil {
			return result, err
		}
		// Query the original JSON from the DB too: legacy JSON spacing differs from
		// Marshal and should not defeat optimistic compare-and-swap protection.
		var original string
		if err = s.DB.QueryRow(`SELECT data FROM scanfiles WHERE id=? AND status='failed'`, row.ID).Scan(&original); err != nil {
			continue
		}
		var current map[string]any
		if json.Unmarshal([]byte(original), &current) != nil {
			continue
		}
		normalized, _ := json.Marshal(current)
		if string(normalized) != string(raw) {
			continue
		}
		changed, err := s.DB.ExecContext(ctx, `UPDATE scanfiles SET status=?,data=? WHERE id=? AND status='failed' AND path=? AND data=?`, row.Status, string(next), row.ID, row.Path, original)
		if err != nil {
			return result, err
		}
		count, _ := changed.RowsAffected()
		if count > 0 && row.Status == userdb.ScanStatusReady {
			result.Recovered++
		}
	}
	return result, nil
}
