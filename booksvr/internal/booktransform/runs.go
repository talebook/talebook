package booktransform

import (
	"database/sql"
	"encoding/json"
	"fmt"

	"talebook/booksvr/internal/userdb"
)

// insertRun 插入一条 plugin_runs 记录并回填 ID。
//
// 与 pluginruntime 内部的 insertRun 保持同一列集合与 JSON 编码方式。
func insertRun(db *sql.DB, run *userdb.PluginRun) (int64, error) {
	res, err := db.Exec(`INSERT INTO plugin_runs
		(connection_id, parent_run_id, action, trigger, status, requested_by, attempt,
		 counts, cursor_before, cursor_after, input_data, error_code, error_message,
		 create_time, started_at, finished_at, duration_ms)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		run.ConnectionID, nullInt64(run.ParentRunID), run.Action, run.Trigger, run.Status,
		run.RequestedBy, run.Attempt, jsonText(run.Counts), jsonText(run.CursorBefore),
		jsonText(run.CursorAfter), jsonText(run.InputData), run.ErrorCode, run.ErrorMessage,
		run.CreateTime, nullString(run.StartedAt), nullString(run.FinishedAt), run.DurationMS)
	if err != nil {
		return 0, fmt.Errorf("booktransform: 插入运行记录失败: %w", err)
	}
	return res.LastInsertId()
}

// updateRun 回写 run 的状态、计数、游标与结束时间。
func updateRun(db *sql.DB, run *userdb.PluginRun) error {
	_, err := db.Exec(`UPDATE plugin_runs
		SET status = ?, counts = ?, cursor_after = ?, error_code = ?, error_message = ?,
		    finished_at = ?, duration_ms = ?
		WHERE id = ?`,
		run.Status, jsonText(run.Counts), jsonText(run.CursorAfter), run.ErrorCode,
		run.ErrorMessage, nullString(run.FinishedAt), run.DurationMS, run.ID)
	if err != nil {
		return fmt.Errorf("booktransform: 更新运行记录失败: %w", err)
	}
	return nil
}

// jsonText 把值编码为 JSON 文本；nil 或编码失败时返回 "{}"。
func jsonText(value any) string {
	if value == nil {
		return "{}"
	}
	raw, err := json.Marshal(value)
	if err != nil {
		return "{}"
	}
	return string(raw)
}

// nullInt64 把 sql.NullInt64 转成可写入的 any。
func nullInt64(v sql.NullInt64) any {
	if !v.Valid {
		return nil
	}
	return v.Int64
}

// nullString 把空串转成 NULL，避免写入空时间戳。
func nullString(v string) any {
	if v == "" {
		return nil
	}
	return v
}
