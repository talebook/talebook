package pluginruntime

import (
	"database/sql"
	"fmt"

	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/userdb"
)

// CallOptions 是 typed capability 调用的可选参数。
type CallOptions struct {
	Timeout          *float64
	ContextOverrides map[string]any
	RequiredScopes   []string
	RequestedBy      *int64
	AuditData        map[string]any
	// Finalize 在 provider 返回后、审计结束前处理结果（平台写回钩子）。
	Finalize func(any) (any, error)
	// Rollback 在失败时回滚平台侧写入。
	// 返回 (结果, 是否成功回滚)；结果为 nil 表示无额外信息。
	Rollback func() (map[string]any, bool)
}

// CallOne 执行 typed capability：统一 lease、重试、审计、凭据与 health。
func (r *Runtime) CallOne(connection *userdb.PluginConnection, mode, method string,
	args []any, opts CallOptions) (any, error) {
	timeout := EffectiveTimeout(connection, 30)
	if opts.Timeout != nil {
		timeout = EffectiveTimeout(connection, *opts.Timeout)
	}

	run, token, err := r.BeginCapabilityRun(connection, mode, timeout, opts.RequestedBy, opts.AuditData)
	if err != nil {
		return nil, err
	}

	overrides := map[int64]map[string]any{connection.ID: opts.ContextOverrides}
	var (
		outcome    any
		outcomeErr error
		rolledBack bool
		secrets    = map[string]any{}
	)

	// 用闭包模拟 Python 的 try/except/finally：无论成败都要结束审计。
	func() {
		defer func() {
			if rec := recover(); rec != nil {
				outcomeErr = fmt.Errorf("pluginruntime: provider panic: %v", rec)
			}
		}()

		prepared, failures, err := r.PrepareRead([]*userdb.PluginConnection{connection},
			timeout, overrides, opts.RequiredScopes, mode, opts.RequestedBy, method)
		if err != nil {
			outcomeErr = err
			return
		}
		if len(failures) > 0 {
			outcomeErr = failures[connection.ID]
			return
		}
		if len(prepared) == 0 {
			outcomeErr = NewPluginRuntimeError("plugin.provider_unavailable",
				"Plugin provider is not available", false)
			return
		}
		unit := prepared[0]
		secrets = unit.Secrets

		result, err := r.InvokeWithRetry(func() (any, error) {
			return r.invokeProviderMethod(unit, method, args)
		}, connection, secrets, method, timeout)
		if err != nil {
			outcomeErr = err
			return
		}
		if opts.Finalize != nil {
			result, err = opts.Finalize(result)
			if err != nil {
				outcomeErr = err
				return
			}
		}
		outcome = result
	}()

	if outcomeErr != nil {
		redacted := RedactedException(outcomeErr, secrets)
		if opts.Rollback != nil {
			if _, restored := opts.Rollback(); restored {
				rolledBack = true
			}
		}
		// 审计失败也要落库，但原始业务异常优先返回。
		if err := r.FinishCapabilityRun(run, connection, token, mode, nil,
			redacted, rolledBack, secrets); err != nil {
			return nil, redacted
		}
		return nil, redacted
	}

	if err := r.FinishCapabilityRun(run, connection, token, mode, outcome, nil, false, secrets); err != nil {
		return nil, err
	}
	return redactValue(outcome, secrets), nil
}

// invokeProviderMethod 通过反射式分派调用 provider 方法。
//
// Go 无 Python 的 getattr 动态调用，因此这里按方法名显式分派到
// provider 实现的接口方法。未识别的方法返回契约错误。
func (r *Runtime) invokeProviderMethod(unit *PreparedCall, method string, args []any) (any, error) {
	dispatcher, ok := unit.Provider.(MethodDispatcher)
	if !ok {
		return nil, NewPluginRuntimeError("plugin.provider_contract",
			"Plugin provider does not support dynamic method dispatch", false)
	}
	return dispatcher.Invoke(method, args, unit.Context)
}

// MethodDispatcher 由 provider 实现，用于按方法名分派调用。
//
// 这是 Go 侧对 Python `getattr(provider, method)(*args, context)` 的显式替代：
// 动态方法名无法在编译期解析，因此由 provider 自己声明支持哪些方法。
type MethodDispatcher interface {
	Invoke(method string, args []any, context map[string]any) (any, error)
}

// Read 调用一条连接的 read 能力。
func (r *Runtime) Read(connection *userdb.PluginConnection, method string,
	args []any, opts CallOptions) (any, error) {
	return r.CallOne(connection, "read", method, args, opts)
}

// Write 调用 write 能力，并把平台写回/回滚钩子纳入同一 run。
func (r *Runtime) Write(connection *userdb.PluginConnection, method string,
	args []any, opts CallOptions) (any, error) {
	return r.CallOne(connection, "write", method, args, opts)
}

// Sync 调用一条连接的外部同步能力，并由运行时统一处理凭据与健康状态。
func (r *Runtime) Sync(connection *userdb.PluginConnection, method string,
	args []any, opts CallOptions) (any, error) {
	return r.CallOne(connection, "sync", method, args, opts)
}

// ConnectionByID 按 id 取连接；不存在返回 nil。
func (r *Runtime) ConnectionByID(id int64) (*userdb.PluginConnection, error) {
	return findConnectionByID(r.DB, id)
}

// ConnectionPublicDict 返回连接的公开形态，handler 不接触凭据模型或密文。
func (r *Runtime) ConnectionPublicDict(connection *userdb.PluginConnection) (map[string]any, error) {
	var secret *userdb.PluginSecret
	if connection.SecretID.Valid {
		var err error
		secret, err = userdb.GetPluginSecretByID(r.DB, connection.SecretID.Int64)
		if err != nil {
			return nil, err
		}
	}
	return connection.ToPublic(secret), nil
}

// ConnectionHasCredentials 只暴露凭据是否存在，不把密文或明文带出运行时。
func (r *Runtime) ConnectionHasCredentials(connection *userdb.PluginConnection) (bool, error) {
	if !connection.SecretID.Valid {
		return false, nil
	}
	secret, err := userdb.GetPluginSecretByID(r.DB, connection.SecretID.Int64)
	if err != nil {
		return false, err
	}
	return secret != nil && secret.Ciphertext != "", nil
}

// ReadPagesOptions 是分页读取的可选参数。
type ReadPagesOptions struct {
	Cursor           map[string]any
	Timeout          float64
	MaxPages         int
	CursorArgument   bool
	ContextOverrides map[string]any
	RequiredScopes   []string
}

// ReadPages 按 Page.HasMore 续拉，显式区分分页位置与最终增量水位。
func (r *Runtime) ReadPages(connection *userdb.PluginConnection, method string,
	args []any, opts ReadPagesOptions) (*plugindomain.Page, error) {
	timeout := opts.Timeout
	if timeout <= 0 {
		timeout = 30
	}
	maxPages := opts.MaxPages
	if maxPages <= 0 {
		maxPages = 100
	}

	current := copyMapAny(opts.Cursor)
	var (
		items         []any
		failures      []plugindomain.ItemFailure
		healthMessage string
	)
	seen := map[string]bool{}

	for i := 0; i < maxPages; i++ {
		callArgs := args
		if opts.CursorArgument {
			callArgs = append(append([]any{}, args...), current)
		}
		overrides := copyMapAny(opts.ContextOverrides)
		overrides["cursor"] = current

		raw, err := r.Read(connection, method, callArgs, CallOptions{
			Timeout:          &timeout,
			ContextOverrides: overrides,
			RequiredScopes:   opts.RequiredScopes,
		})
		if err != nil {
			return nil, err
		}
		page, ok := raw.(*plugindomain.Page)
		if !ok {
			return nil, NewPluginRuntimeError("plugin.provider_contract",
				"Paged provider returned an invalid result", false)
		}

		items = append(items, page.Items...)
		failures = append(failures, page.Failures...)
		if page.HealthMessage != "" {
			healthMessage = page.HealthMessage
		}
		nextCursor := copyMapAny(page.NextCursor)

		if !page.HasMore {
			return &plugindomain.Page{
				Items:         items,
				Failures:      failures,
				HasMore:       false,
				NextCursor:    nextCursor,
				HealthMessage: healthMessage,
			}, nil
		}

		marker, err := canonicalJSON(nextCursor)
		if err != nil {
			return nil, err
		}
		if len(nextCursor) == 0 || seen[string(marker)] {
			return nil, NewPluginRuntimeError("plugin.cursor_stalled",
				"Paged provider did not advance its cursor", false)
		}
		seen[string(marker)] = true
		current = nextCursor
	}
	return nil, NewPluginRuntimeError("plugin.page_limit",
		"Paged provider exceeded the page limit", false)
}

// FinishRead 回到调用线程统一结束外部线程池调用的 run/lease/health。
//
// results 以 connection.id 为键；异常值会被脱敏后写回 results。
func (r *Runtime) FinishRead(prepared []*PreparedCall, results map[int64]any) (map[int64]any, error) {
	units := map[int64]*PreparedCall{}
	for _, unit := range prepared {
		units[unit.Key] = unit
	}

	for key, outcome := range results {
		unit := units[key]
		if unit == nil {
			conn, err := findConnectionByID(r.DB, key)
			if err != nil {
				return nil, err
			}
			if conn == nil {
				continue
			}
			unit = &PreparedCall{Key: key, Connection: conn, Secrets: map[string]any{}}
		}

		if err, ok := outcome.(error); ok {
			redacted := RedactedException(err, unit.Secrets)
			results[key] = redacted
			outcome = redacted
		}

		// 无审计 run 时只更新 health。
		health := "healthy"
		if _, failed := outcome.(error); failed {
			health = "degraded"
		}
		if err, ok := outcome.(error); ok && errorCodeOf(err) == "provider_unauthorized" {
			health = "unauthorized"
		}
		message := ""
		if err, ok := outcome.(error); ok {
			message = pluginssecretsRedact(err.Error(), unit.Secrets)
			if len(message) > 500 {
				message = message[:500]
			}
		}
		if err := updateConnectionHealth(r.DB, unit.Connection.ID, health, message, nowString()); err != nil {
			return nil, err
		}
	}
	return results, nil
}

// pluginssecretsRedact 是脱敏的本地别名，避免在热路径上重复导入。
func pluginssecretsRedact(text string, secrets map[string]any) string {
	return redactString(text, secrets)
}

// getConnectionByID 按 id 取连接（供 handler 使用）。
func getConnectionByID(db *sql.DB, id int64) (*userdb.PluginConnection, error) {
	return findConnectionByID(db, id)
}
