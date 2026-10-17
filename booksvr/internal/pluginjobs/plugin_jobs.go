// Package pluginjobs 移植 webserver/services/plugin_jobs.py 与
// PluginRuntime.execute 的编排部分。
//
// 职责：在共享后台队列上执行一条已持久化的 PluginRun。
// 流程：取 run → 校验状态为 queued → 抢连接租约 → 置 running →
// 按 action 分派（rollback 走回滚，其余走 provider 调用）→ 落结果 →
// 释放租约（超时除外，保留租约避免副作用重叠）。
package pluginjobs

import (
	"database/sql"
	"errors"
	"fmt"
	"sync"
	"time"

	"talebook/booksvr/internal/pluginruntime"
	"talebook/booksvr/internal/userdb"
)

// Config 是执行器的依赖。
type Config struct {
	// DB 是 Talebook 自有库。
	DB *sql.DB
	// Runtime 是插件运行时。
	Runtime *pluginruntime.Runtime
	// Now 便于测试注入时间；为空时用 time.Now。
	Now func() time.Time
}

// Executor 在后台队列上执行 PluginRun。
type Executor struct {
	cfg Config
}

// NewExecutor 构造执行器。
func NewExecutor(cfg Config) *Executor {
	return &Executor{cfg: cfg}
}

// now 返回当前时间。
func (e *Executor) now() time.Time {
	if e.cfg.Now != nil {
		return e.cfg.Now()
	}
	return time.Now()
}

// Execute 执行一条已持久化的 run。
//
// 对应 Python 的 PluginRuntime.execute。run 不存在时返回错误；
// 状态不是 queued 时原样返回（幂等）。
func (e *Executor) Execute(runID int64) (*userdb.PluginRun, error) {
	run, err := userdb.GetPluginRunByID(e.cfg.DB, runID)
	if err != nil {
		return nil, err
	}
	if run == nil {
		return nil, pluginruntime.NewPluginRuntimeError("plugin.run_missing",
			"Plugin run was not found", false)
	}
	if run.Status != "queued" {
		return run, nil
	}

	connection, err := e.cfg.Runtime.ConnectionByID(run.ConnectionID)
	if err != nil {
		return nil, err
	}
	if connection == nil {
		return nil, pluginruntime.NewPluginRuntimeError("plugin.connection_missing",
			"Plugin connection is not enabled", false)
	}

	token, acquired, err := e.acquireLease(connection)
	if err != nil {
		return nil, err
	}
	if !acquired {
		e.finishError(run, "plugin.concurrent_run", "Another run is active for this connection")
		return run, nil
	}

	run.Status = "running"
	run.StartedAt = formatTime(e.now())
	run.Attempt = 0
	if err := userdb.UpdatePluginRun(e.cfg.DB, run); err != nil {
		return nil, err
	}

	// 超时错误保留租约：正在跑的副作用无法强制取消，
	// 保留租约可避免另一个请求立刻重叠执行。
	keepLease := false
	defer func() {
		if !keepLease {
			e.releaseLease(connection.ID, token)
		}
	}()

	if run.Action == "rollback" {
		if err := e.rollback(run, connection); err != nil {
			e.finishError(run, pluginruntime.ErrorCodeOf(err), err.Error())
		}
		return run, nil
	}

	if err := e.callProvider(run, connection); err != nil {
		code := pluginruntime.ErrorCodeOf(err)
		if code == "plugin.timeout" {
			keepLease = true
		}
		e.finishError(run, code, err.Error())
		return run, nil
	}
	return run, nil
}

// acquireLease 抢占连接租约；已被占用时返回 acquired=false。
//
// 对应 Python execute 里的 lease 更新：仅当租约为空或已过期时才能抢到。
func (e *Executor) acquireLease(connection *userdb.PluginConnection) (string, bool, error) {
	token := newLeaseToken()
	now := e.now()
	timeout := pluginruntime.EffectiveTimeout(connection, 30)
	leaseUntil := now.Add(time.Duration((timeout + 30) * float64(time.Second)))

	res, err := e.cfg.DB.Exec(`UPDATE plugin_connections
		SET lease_token = ?, lease_until = ?
		WHERE id = ? AND (lease_until IS NULL OR lease_until < ?)`,
		token, formatTime(leaseUntil), connection.ID, formatTime(now))
	if err != nil {
		return "", false, fmt.Errorf("pluginjobs: 获取租约失败: %w", err)
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return "", false, err
	}
	return token, affected > 0, nil
}

// releaseLease 释放租约（仅当 token 仍匹配）。
func (e *Executor) releaseLease(connectionID int64, token string) {
	_, _ = e.cfg.DB.Exec(`UPDATE plugin_connections
		SET lease_token = '', lease_until = NULL
		WHERE id = ? AND lease_token = ?`, connectionID, token)
}

// callProvider 调用 provider 并落结果。
//
// 对应 Python 的 _load_secrets + _call_provider + _apply_result。
func (e *Executor) callProvider(run *userdb.PluginRun, connection *userdb.PluginConnection) error {
	prepared, failures, err := e.cfg.Runtime.PrepareRead(
		[]*userdb.PluginConnection{connection}, 0, nil, nil, run.Action, &run.RequestedBy, "")
	if err != nil {
		return err
	}
	if failure, ok := failures[connection.ID]; ok {
		return failure
	}
	if len(prepared) == 0 {
		return pluginruntime.NewPluginRuntimeError("plugin.provider_unavailable",
			"Plugin provider is not available", false)
	}

	unit := prepared[0]
	result, err := e.cfg.Runtime.InvokeWithRetry(func() (any, error) {
		return invokeAction(unit, run)
	}, connection, unit.Secrets, run.Action, pluginruntime.EffectiveTimeout(connection, 30))
	if err != nil {
		return err
	}

	run.Status = "succeeded"
	run.FinishedAt = formatTime(e.now())
	run.Counts = copyCounts(pluginruntime.DefaultCounts)
	run.Counts["fetched"] = 1
	if result != nil {
		run.CursorAfter = map[string]any{"result": result}
	}
	return userdb.UpdatePluginRun(e.cfg.DB, run)
}

// invokeAction 按 run.action 分派到 provider 方法。
func invokeAction(unit *pluginruntime.PreparedCall, run *userdb.PluginRun) (any, error) {
	dispatcher, ok := unit.Provider.(pluginruntime.MethodDispatcher)
	if !ok {
		return nil, pluginruntime.NewPluginRuntimeError("plugin.provider_contract",
			"Plugin provider does not support dynamic method dispatch", false)
	}
	return dispatcher.Invoke(run.Action, nil, unit.Context)
}

// rollback 执行回滚动作。
//
// 对应 Python 的 _rollback：把 run 标记为 rolled_back。
func (e *Executor) rollback(run *userdb.PluginRun, connection *userdb.PluginConnection) error {
	prepared, failures, err := e.cfg.Runtime.PrepareRead(
		[]*userdb.PluginConnection{connection}, 0, nil, nil, "rollback", &run.RequestedBy, "")
	if err != nil {
		return err
	}
	if failure, ok := failures[connection.ID]; ok {
		return failure
	}
	if len(prepared) == 0 {
		return pluginruntime.NewPluginRuntimeError("plugin.provider_unavailable",
			"Plugin provider is not available", false)
	}

	unit := prepared[0]
	if _, err := e.cfg.Runtime.InvokeWithRetry(func() (any, error) {
		return invokeAction(unit, run)
	}, connection, unit.Secrets, "rollback", pluginruntime.EffectiveTimeout(connection, 30)); err != nil {
		return err
	}

	run.Status = "rolled_back"
	run.FinishedAt = formatTime(e.now())
	return userdb.UpdatePluginRun(e.cfg.DB, run)
}

// finishError 把 run 标记为失败并落库。
//
// 对应 Python 的 _finish_error。
func (e *Executor) finishError(run *userdb.PluginRun, code, message string) {
	run.Status = "failed"
	run.ErrorCode = code
	if len(message) > 1000 {
		message = message[:1000]
	}
	run.ErrorMessage = message
	run.FinishedAt = formatTime(e.now())
	run.Counts = copyCounts(pluginruntime.DefaultCounts)
	run.Counts["failed"] = 1
	_ = userdb.UpdatePluginRun(e.cfg.DB, run)
}

// copyCounts 复制默认计数表。
func copyCounts(src map[string]int) map[string]any {
	out := make(map[string]any, len(src))
	for k, v := range src {
		out[k] = v
	}
	return out
}

// formatTime 统一时间格式。
func formatTime(t time.Time) string {
	return t.Format("2006-01-02 15:04:05.000000")
}

// newLeaseToken 生成租约令牌。
func newLeaseToken() string {
	return fmt.Sprintf("%d-%d", time.Now().UnixNano(), leaseCounter.Add(1))
}

// leaseCounter 保证同纳秒内生成的令牌不重复。
var leaseCounter atomicCounter

// atomicCounter 是简单的原子计数器。
type atomicCounter struct {
	mu sync.Mutex
	n  int64
}

// Add 自增并返回新值。
func (c *atomicCounter) Add(delta int64) int64 {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.n += delta
	return c.n
}

// ErrRunMissing 是 run 不存在的哨兵错误。
var ErrRunMissing = errors.New("plugin run was not found")
