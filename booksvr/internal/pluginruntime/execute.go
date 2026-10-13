package pluginruntime

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"time"

	"talebook/booksvr/internal/pluginproto"
	"talebook/booksvr/internal/pluginssecrets"
	"talebook/booksvr/internal/userdb"
)

// newLeaseToken 复刻 uuid.uuid4().hex（32 位十六进制）。
func newLeaseToken() string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return ""
	}
	return hex.EncodeToString(buf)
}

// RetryPolicy 是重试参数。
type RetryPolicy struct {
	MaxRetries  int
	BaseBackoff float64
}

// retryPolicyOf 复刻 `_invoke_prepared_with_retry` 的参数读取。
//
// max_retries 钳制到 [0, 5]（默认 2）；backoff_seconds 钳制到 [0, 60]（默认 0.05）。
func retryPolicyOf(connection *userdb.PluginConnection) RetryPolicy {
	maxRetries := 2
	if raw, ok := connection.Config["max_retries"]; ok {
		maxRetries = toInt(raw, 2)
	}
	if maxRetries < 0 {
		maxRetries = 0
	}
	if maxRetries > 5 {
		maxRetries = 5
	}
	backoff := 0.05
	if raw, ok := connection.Config["backoff_seconds"]; ok {
		backoff = toFloat(raw, 0.05)
	}
	if backoff < 0 {
		backoff = 0
	}
	if backoff > 60 {
		backoff = 60
	}
	return RetryPolicy{MaxRetries: maxRetries, BaseBackoff: backoff}
}

// retryDelay 复刻退避计算：优先 retry_after，否则指数退避，并钳制到 [0, 60] 与剩余时间。
func retryDelay(policy RetryPolicy, attempt int, retryAfter *float64, remaining float64) float64 {
	delay := policy.BaseBackoff * float64(int(1)<<uint(attempt-1))
	if retryAfter != nil {
		delay = *retryAfter
	}
	if delay < 0 {
		delay = 0
	}
	if delay > 60 {
		delay = 60
	}
	if delay > remaining {
		delay = remaining
	}
	if delay < 0 {
		delay = 0
	}
	return delay
}

// isRetryable 判断错误是否可重试（鉴权错误永不重试）。
func isRetryable(err error) bool {
	var upstream *pluginproto.UpstreamError
	if asError(err, &upstream) {
		if upstream.Code == "provider_unauthorized" {
			return false
		}
		return upstream.Retryable
	}
	if r, ok := err.(interface{ Retryable() bool }); ok {
		return r.Retryable()
	}
	return false
}

// retryAfterOf 取错误的 retry_after（秒）。
//
// Go 侧 UpstreamError 未保留 retry_after 字段（Python 的限流错误才有），
// 因此这里恒返回 nil，退避走指数路径。
func retryAfterOf(err error) *float64 {
	return nil
}

// InvokeWithRetry 在给定截止时间内带重试地调用 provider 方法。
//
// 调用本身交给有界池，因此书源自己卡住时不会永久占用 worker。
// 已经开始运行的 future 无法安全取消；这种超时必须立即终止整个调用，
// 不能再提交一个与它并发的重试。
func (r *Runtime) InvokeWithRetry(call func() (any, error), connection *userdb.PluginConnection,
	secrets map[string]any, method string, timeout float64) (any, error) {
	policy := retryPolicyOf(connection)
	deadline := time.Now().Add(time.Duration(timeout * float64(time.Second)))

	for attempt := 1; attempt <= policy.MaxRetries+1; attempt++ {
		remaining := time.Until(deadline).Seconds()
		if remaining <= 0 {
			return nil, NewPluginRuntimeError("plugin.timeout",
				fmt.Sprintf("Plugin %s timed out", method), true)
		}

		result, err := r.callWithTimeout(call, remaining)
		if err == nil {
			return result, nil
		}
		if _, ok := err.(*timeoutError); ok {
			return nil, NewPluginRuntimeError("plugin.timeout",
				fmt.Sprintf("Plugin %s timed out", method), true)
		}

		if !isRetryable(err) || attempt > policy.MaxRetries {
			return nil, RedactedException(err, secrets)
		}
		remaining = time.Until(deadline).Seconds()
		if remaining <= 0 {
			return nil, NewPluginRuntimeError("plugin.timeout",
				fmt.Sprintf("Plugin %s timed out", method), true)
		}
		r.Sleep(time.Duration(retryDelay(policy, attempt, retryAfterOf(err), remaining) * float64(time.Second)))
	}
	return nil, NewPluginRuntimeError("plugin.execution_failed",
		"Plugin capability call failed", false)
}

// timeoutError 标记调用超时。
type timeoutError struct{}

func (e *timeoutError) Error() string { return "plugin call timed out" }

// callWithTimeout 在独立 goroutine 中执行调用并施加超时。
//
// 超时后 goroutine 无法被强制取消（与 Python 的 ThreadPool future 一致），
// 因此调用方必须保持租约直到宽限期结束。
func (r *Runtime) callWithTimeout(call func() (any, error), timeoutSeconds float64) (any, error) {
	type outcome struct {
		value any
		err   error
	}
	ch := make(chan outcome, 1)
	go func() {
		v, err := call()
		ch <- outcome{value: v, err: err}
	}()

	timer := time.NewTimer(time.Duration(timeoutSeconds * float64(time.Second)))
	defer timer.Stop()
	select {
	case out := <-ch:
		return out.value, out.err
	case <-timer.C:
		return nil, &timeoutError{}
	}
}

// AuditSubject 复刻 `_audit_subject`：确定审计主体。
func (r *Runtime) AuditSubject(connection *userdb.PluginConnection, requestedBy *int64) (int64, error) {
	if requestedBy != nil && *requestedBy > 0 {
		return *requestedBy, nil
	}
	if connection.OwnerType == "user" && connection.OwnerID > 0 {
		return connection.OwnerID, nil
	}
	installation, err := getInstallationByID(r.DB, connection.InstallationID)
	if err != nil {
		return 0, err
	}
	if installation != nil && installation.InstalledBy > 0 {
		return installation.InstalledBy, nil
	}
	return 0, NewPluginRuntimeError("plugin.audit_subject_missing",
		"Plugin capability call has no audit subject", false)
}

// BeginCapabilityRun 开始一次能力调用审计，返回 run 与租约 token。
//
// read 只做外部读取，由 SafeHttpClient 按 plugin+host 公平排队；它不再参与
// 持久化 connection lease。这样搜索、浏览和保存既不会互相快速拒绝，也不会
// 让一次慢读阻塞后续 write。write/sync/execute 等有状态或有副作用的模式仍
// 使用数据库租约，保持跨进程互斥与超时宽限保护。
func (r *Runtime) BeginCapabilityRun(connection *userdb.PluginConnection, mode string,
	timeout float64, requestedBy *int64, auditData map[string]any) (*userdb.PluginRun, string, error) {
	subject, err := r.AuditSubject(connection, requestedBy)
	if err != nil {
		return nil, "", err
	}

	now := time.Now()
	token := ""
	acquired := true
	if mode != "read" {
		token = newLeaseToken()
		leaseUntil := now.Add(time.Duration((timeout + 30) * float64(time.Second)))
		res, err := r.DB.Exec(`UPDATE plugin_connections
			SET lease_token = ?, lease_until = ?
			WHERE id = ? AND (lease_until IS NULL OR lease_until < ?)`,
			token, leaseUntil.Format("2006-01-02 15:04:05.000000"), connection.ID,
			now.Format("2006-01-02 15:04:05.000000"))
		if err != nil {
			return nil, "", fmt.Errorf("pluginruntime: 获取租约失败: %w", err)
		}
		affected, err := res.RowsAffected()
		if err != nil {
			return nil, "", err
		}
		acquired = affected > 0
	}

	refused := !acquired
	status := "running"
	errorCode := ""
	errorMessage := ""
	var startedAt, finishedAt any
	startedAt = now.Format("2006-01-02 15:04:05.000000")
	if refused {
		status = "failed"
		errorCode = "plugin.concurrent_run"
		errorMessage = "Another run is active for this connection"
		startedAt = nil
		finishedAt = now.Format("2006-01-02 15:04:05.000000")
	}

	run := &userdb.PluginRun{
		ConnectionID: connection.ID,
		Action:       mode,
		Trigger:      "capability",
		Status:       status,
		RequestedBy:  subject,
		Counts:       copyCounts(DefaultCounts),
		CursorBefore: copyMapAny(connection.Cursor),
		CursorAfter:  copyMapAny(connection.Cursor),
		InputData:    copyMapAny(auditData),
		ErrorCode:    errorCode,
		ErrorMessage: errorMessage,
		CreateTime:   now.Format("2006-01-02 15:04:05.000000"),
	}
	id, err := insertRun(r.DB, run, startedAt, finishedAt)
	if err != nil {
		return nil, "", err
	}
	run.ID = id

	if refused {
		return nil, "", NewPluginRuntimeError("plugin.concurrent_run",
			"Another run is active for this connection", false)
	}
	return run, token, nil
}

// FinishCapabilityRun 结束一次能力调用审计，并更新连接 health。
func (r *Runtime) FinishCapabilityRun(run *userdb.PluginRun, connection *userdb.PluginConnection,
	token, mode string, outcome any, outcomeErr error, rolledBack bool, secrets map[string]any) error {
	now := time.Now()
	failed := outcomeErr != nil

	if failed {
		if rolledBack {
			run.Status = "rolled_back"
		} else {
			run.Status = "failed"
		}
		run.ErrorCode = errorCodeOf(outcomeErr)
		message := stringifyRedacted(redactAny(outcomeErr.Error(), secrets))
		if len(message) > 1000 {
			message = message[:1000]
		}
		run.ErrorMessage = message
		run.Counts = copyCounts(DefaultCounts)
		run.Counts["failed"] = 1
	} else {
		run.Status = "succeeded"
		countKey := "written"
		switch mode {
		case "read":
			countKey = "fetched"
		case "write":
			countKey = "updated"
		}
		value := 1
		if public, ok := outcome.(map[string]any); ok {
			if n, ok := public["count"].(int); ok {
				if n < 0 {
					n = 0
				}
				value = n
			} else if mode == "write" {
				if n, ok := public["matches"].(int); ok {
					value = n
				}
			}
			cursor := map[string]any{}
			for _, key := range []string{"book_id", "format", "matches", "encoding",
				"direction", "output_mode", "backup_path"} {
				if v, ok := public[key]; ok {
					cursor[key] = v
				}
			}
			run.CursorAfter = cursor
		}
		run.Counts = copyCounts(DefaultCounts)
		run.Counts[countKey] = value
	}

	run.FinishedAt = now.Format("2006-01-02 15:04:05.000000")
	if run.StartedAt != "" {
		if started, err := time.Parse("2006-01-02 15:04:05.000000", run.StartedAt); err == nil {
			ms := now.Sub(started).Milliseconds()
			if ms < 0 {
				ms = 0
			}
			run.DurationMS = ms
		}
	}

	// health 判定：鉴权失败 → unauthorized；其他失败 → degraded；成功 → healthy。
	health := "healthy"
	if failed {
		health = "degraded"
	}
	var upstream *pluginproto.UpstreamError
	if outcomeErr != nil && asError(outcomeErr, &upstream) && upstream.Code == "provider_unauthorized" {
		health = "unauthorized"
	}
	healthMessage := ""
	if failed {
		healthMessage = stringifyRedacted(redactAny(outcomeErr.Error(), secrets))
		if len(healthMessage) > 500 {
			healthMessage = healthMessage[:500]
		}
	}

	if err := updateRun(r.DB, run); err != nil {
		return err
	}
	if err := updateConnectionHealth(r.DB, connection.ID, health, healthMessage,
		now.Format("2006-01-02 15:04:05.000000")); err != nil {
		return err
	}

	// 超时保持租约，让宽限期保护已发生的副作用。
	if errorCodeOf(outcomeErr) != "plugin.timeout" {
		if err := releaseLease(r.DB, connection.ID, token); err != nil {
			return err
		}
	}
	return nil
}

// ErrorCodeOf 取错误的 code（默认 plugin.execution_failed）。
func ErrorCodeOf(err error) string { return errorCodeOf(err) }

// errorCodeOf 取错误的 code（默认 plugin.execution_failed）。
func errorCodeOf(err error) string {
	if err == nil {
		return ""
	}
	var runtimeErr *PluginRuntimeError
	if asError(err, &runtimeErr) {
		return runtimeErr.Code
	}
	var upstream *pluginproto.UpstreamError
	if asError(err, &upstream) {
		return upstream.Code
	}
	if coder, ok := err.(interface{ Code() string }); ok {
		if c := coder.Code(); c != "" {
			return c
		}
	}
	return "plugin.execution_failed"
}

// redactAny 对字符串做脱敏。
func redactAny(text string, secrets map[string]any) any {
	return pluginssecrets.RedactString(text, secrets)
}

// redactString 对字符串做脱敏，返回字符串。
func redactString(text string, secrets map[string]any) string {
	return pluginssecrets.RedactString(text, secrets)
}

// redactValue 递归脱敏任意值（对应 Python 的 redact(outcome, secrets)）。
func redactValue(value any, secrets map[string]any) any {
	return pluginssecrets.Redact(value, secrets)
}

// copyCounts 复制计数 map。
func copyCounts(in map[string]int) map[string]any {
	out := make(map[string]any, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
}

// copyMapAny 复制 map[string]any。
func copyMapAny(in map[string]any) map[string]any {
	out := make(map[string]any, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
}

// insertRun 插入一条运行记录，返回 id。
func insertRun(db *sql.DB, run *userdb.PluginRun, startedAt, finishedAt any) (int64, error) {
	res, err := db.Exec(`INSERT INTO plugin_runs
		(connection_id, parent_run_id, action, trigger, status, requested_by, attempt,
		 counts, cursor_before, cursor_after, input_data, error_code, error_message,
		 create_time, started_at, finished_at, duration_ms)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		run.ConnectionID, nullInt64(run.ParentRunID), run.Action, run.Trigger, run.Status, run.RequestedBy,
		run.Attempt, jsonText(run.Counts), jsonText(run.CursorBefore),
		jsonText(run.CursorAfter), jsonText(run.InputData), run.ErrorCode,
		run.ErrorMessage, run.CreateTime, startedAt, finishedAt, run.DurationMS)
	if err != nil {
		return 0, fmt.Errorf("pluginruntime: 插入运行记录失败: %w", err)
	}
	return res.LastInsertId()
}

// nullInt64 把 sql.NullInt64 转成可写入的 any。
func nullInt64(v sql.NullInt64) any {
	if !v.Valid {
		return nil
	}
	return v.Int64
}

// PrepareRun 复刻 PluginRuntime.prepare_run：校验动作与父运行，落一条 queued 记录。
//
// 与 BeginCapabilityRun 的分工：PrepareRun 只建记录（供异步执行器稍后取用），
// BeginCapabilityRun 在同步调用路径上建记录并同时抢租约。
func (r *Runtime) PrepareRun(connectionID int64, action string, requestedBy int64,
	trigger string, parentRunID *int64, inputData map[string]any,
	serverOwnedInputKeys map[string]bool) (*userdb.PluginRun, error) {
	if !Actions[action] {
		return nil, NewPluginRuntimeError("plugin.action_invalid",
			"Unsupported plugin action", false)
	}
	connection, err := findConnectionByID(r.DB, connectionID)
	if err != nil {
		return nil, err
	}
	if connection == nil || !connection.Enabled {
		return nil, NewPluginRuntimeError("plugin.connection_missing",
			"Plugin connection is not enabled", false)
	}
	installation, err := getInstallationByID(r.DB, connection.InstallationID)
	if err != nil {
		return nil, err
	}
	if installation == nil {
		return nil, NewPluginRuntimeError("plugin.installation_missing",
			"Plugin installation was not found", false)
	}
	definition, err := getDefinitionByID(r.DB, installation.DefinitionID)
	if err != nil {
		return nil, err
	}
	if !installation.Enabled || installation.Status != "active" {
		return nil, NewPluginRuntimeError("plugin.installation_disabled",
			"Plugin installation is disabled", false)
	}
	if definition == nil || !containsString(definition.Actions, action) {
		return nil, NewPluginRuntimeError("plugin.action_not_supported",
			"Plugin does not support this action", false)
	}

	var parent *userdb.PluginRun
	if action == "retry" || action == "rollback" {
		if parentRunID == nil {
			return nil, NewPluginRuntimeError("plugin.parent_run_invalid",
				"A terminal run from this connection is required", false)
		}
		parent, err = findRunByID(r.DB, *parentRunID)
		if err != nil {
			return nil, err
		}
		if parent == nil || parent.ConnectionID != connectionID ||
			!TerminalStatuses[parent.Status] {
			return nil, NewPluginRuntimeError("plugin.parent_run_invalid",
				"A terminal run from this connection is required", false)
		}
		if action == "retry" && parent.Status != "failed" && parent.Status != "partial" {
			return nil, NewPluginRuntimeError("plugin.retry_not_allowed",
				"Only failed or partial runs can be retried", false)
		}
		if action == "rollback" && parent.Action != "run" && parent.Action != "retry" {
			return nil, NewPluginRuntimeError("plugin.rollback_not_allowed",
				"Only write runs can be rolled back", false)
		}
	}

	currentInput := map[string]any{}
	for k, v := range inputData {
		currentInput[k] = v
	}
	privateInput := currentInput
	if action == "retry" && parent != nil {
		privateInput = map[string]any{}
		for k, v := range parent.InputData {
			privateInput[k] = v
		}
		for key := range serverOwnedInputKeys {
			if v, ok := currentInput[key]; ok {
				privateInput[key] = v
			} else {
				delete(privateInput, key)
			}
		}
	}

	counts := map[string]any{}
	for k, v := range DefaultCounts {
		counts[k] = v
	}
	cursorBefore := map[string]any{}
	for k, v := range connection.Cursor {
		cursorBefore[k] = v
	}
	cursorAfter := map[string]any{}
	for k, v := range connection.Cursor {
		cursorAfter[k] = v
	}

	run := &userdb.PluginRun{
		ConnectionID: connectionID,
		Action:       action,
		Trigger:      trigger,
		Status:       "queued",
		RequestedBy:  requestedBy,
		Counts:       counts,
		CursorBefore: cursorBefore,
		CursorAfter:  cursorAfter,
		InputData:    privateInput,
		CreateTime:   nowString(),
	}
	if parent != nil {
		run.ParentRunID = sql.NullInt64{Int64: parent.ID, Valid: true}
	}
	id, err := insertRun(r.DB, run, nil, nil)
	if err != nil {
		return nil, err
	}
	run.ID = id
	return run, nil
}

// findRunByID 按 id 取运行记录；不存在返回 nil。
func findRunByID(db *sql.DB, id int64) (*userdb.PluginRun, error) {
	var connectionID int64
	err := db.QueryRow(`SELECT connection_id FROM plugin_runs WHERE id = ?`, id).Scan(&connectionID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	runs, err := userdb.ListPluginRuns(db, connectionID, 1000)
	if err != nil {
		return nil, err
	}
	for _, run := range runs {
		if run.ID == id {
			return run, nil
		}
	}
	return nil, nil
}

// updateRun 更新运行记录的终态字段。
func updateRun(db *sql.DB, run *userdb.PluginRun) error {
	_, err := db.Exec(`UPDATE plugin_runs SET
		status=?, attempt=?, counts=?, cursor_after=?, error_code=?, error_message=?,
		finished_at=?, duration_ms=?
		WHERE id=?`,
		run.Status, run.Attempt, jsonText(run.Counts), jsonText(run.CursorAfter),
		run.ErrorCode, run.ErrorMessage, run.FinishedAt, run.DurationMS, run.ID)
	if err != nil {
		return fmt.Errorf("pluginruntime: 更新运行记录失败: %w", err)
	}
	return nil
}

// updateConnectionHealth 更新连接的 health 与 health_message。
func updateConnectionHealth(db *sql.DB, connectionID int64, health, message, now string) error {
	_, err := db.Exec(`UPDATE plugin_connections
		SET health=?, health_message=?, update_time=? WHERE id=?`,
		health, message, now, connectionID)
	if err != nil {
		return fmt.Errorf("pluginruntime: 更新连接健康状态失败: %w", err)
	}
	return nil
}

// releaseLease 释放租约（仅当 token 匹配）。
func releaseLease(db *sql.DB, connectionID int64, token string) error {
	_, err := db.Exec(`UPDATE plugin_connections
		SET lease_token='', lease_until=NULL WHERE id=? AND lease_token=?`,
		connectionID, token)
	if err != nil {
		return fmt.Errorf("pluginruntime: 释放租约失败: %w", err)
	}
	return nil
}
