package pluginruntime

import (
	"database/sql"
	"fmt"
	"sort"
	"strings"
	"time"

	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/userdb"
)

// Actions 是插件运行支持的 action 集合。
var Actions = map[string]bool{
	"test":     true,
	"preview":  true,
	"run":      true,
	"retry":    true,
	"rollback": true,
}

// Sleeper 抽象等待，便于测试注入。
type Sleeper func(time.Duration)

// Runtime 复刻 plugin_runtime.py 的 PluginRuntime。
//
// 与 Python 的差异：Python 依赖 SQLAlchemy session 的隐式 flush/commit，
// Go 侧显式传 *sql.DB 并在每个写操作后提交。
type Runtime struct {
	DB       *sql.DB
	Settings map[string]any
	Registry *PluginRegistry
	Sleep    Sleeper
}

// NewRuntime 构造运行时。
func NewRuntime(db *sql.DB, settings map[string]any, registry *PluginRegistry) *Runtime {
	if registry == nil {
		registry = NewPluginRegistry()
	}
	if settings == nil {
		settings = map[string]any{}
	}
	return &Runtime{DB: db, Settings: settings, Registry: registry, Sleep: time.Sleep}
}

// EnabledProviders 返回已安装、启用且处于 active 状态的指定能力 provider。
func (r *Runtime) EnabledProviders(capability string) ([]pluginiface.Provider, error) {
	rows, err := r.DB.Query(`SELECT plugin_key FROM plugin_installations
		WHERE enabled = 1 AND status = 'active'`)
	if err != nil {
		return nil, fmt.Errorf("pluginruntime: 查询启用安装失败: %w", err)
	}
	defer rows.Close()

	enabled := map[string]bool{}
	for rows.Next() {
		var key string
		if err := rows.Scan(&key); err != nil {
			return nil, err
		}
		enabled[key] = true
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}

	var out []pluginiface.Provider
	for _, provider := range r.Registry.Providers() {
		raw := provider.Manifest()
		if !enabled[asString(raw["id"])] {
			continue
		}
		if !containsString(anyList(raw["capabilities"]), capability) {
			continue
		}
		out = append(out, provider)
	}
	return out, nil
}

// DefinitionOf 取连接所属的插件定义。
func (r *Runtime) DefinitionOf(connection *userdb.PluginConnection) (*userdb.PluginDefinition, error) {
	installation, err := getInstallationByID(r.DB, connection.InstallationID)
	if err != nil {
		return nil, err
	}
	if installation == nil {
		return nil, NewPluginRuntimeError("plugin.installation_missing",
			"Plugin installation was not found", false)
	}
	return getDefinitionByID(r.DB, installation.DefinitionID)
}

// PluginKeyOf 取连接对应的 plugin_key。
func (r *Runtime) PluginKeyOf(connection *userdb.PluginConnection) (string, error) {
	definition, err := r.DefinitionOf(connection)
	if err != nil {
		return "", err
	}
	if definition == nil {
		return "", NewPluginRuntimeError("plugin.definition_missing",
			"Plugin definition was not found", false)
	}
	return definition.PluginKey, nil
}

// ConnectionsFor 按能力查询可用连接，调用方不必知道哪个插件提供该能力。
//
// 此前调用方只能硬编码 plugin_key 与中文连接名去查安装与连接，还得自己解密
// 凭据——既绕过了 health 与审计，也把凭据解密泄漏到了运行时边界之外。
func (r *Runtime) ConnectionsFor(capability string, userID *int64) ([]*userdb.PluginConnection, error) {
	query := `SELECT c.id, c.installation_id, c.owner_type, c.owner_id, c.role, c.name,
			c.config, c.scopes, c.health, c.enabled, c.cursor, c.lease_token, c.lease_until
		FROM plugin_connections c
		JOIN plugin_installations i ON i.id = c.installation_id
		JOIN plugin_definitions d ON d.id = i.definition_id
		WHERE i.enabled = 1 AND i.status = 'active' AND c.enabled = 1`
	var args []any
	if userID == nil {
		query += ` AND c.owner_type = 'instance'`
	} else {
		query += ` AND (c.owner_type = 'instance' OR (c.owner_type = 'user' AND c.owner_id = ?))`
		args = append(args, *userID)
	}
	query += ` ORDER BY c.id`

	rows, err := r.DB.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("pluginruntime: 查询连接失败: %w", err)
	}
	defer rows.Close()

	// 先把行读完再查定义：连接池可能只有 1 条连接，在 rows 未关闭时
	// 发起新查询会死锁。
	var candidates []*userdb.PluginConnection
	for rows.Next() {
		conn, err := scanConnection(rows)
		if err != nil {
			return nil, err
		}
		candidates = append(candidates, conn)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}

	var out []*userdb.PluginConnection
	for _, conn := range candidates {
		definition, err := r.DefinitionOf(conn)
		if err != nil {
			return nil, err
		}
		if definition == nil || !containsString(definition.Capabilities, capability) {
			continue
		}
		out = append(out, conn)
	}
	return out, nil
}

// ProviderFor 按 capability 和 manifest UI 声明选择 provider。
//
// handler 只提供路由事实（例如 device_type=boox），不持有 provider 实例，
// 更不能绕过 runtime 直接调方法。
func (r *Runtime) ProviderFor(capability string, selector map[string]any) (pluginiface.Provider, error) {
	var matches []pluginiface.Provider
	for _, provider := range r.Registry.Providers() {
		raw := provider.Manifest()
		if !containsString(anyList(raw["capabilities"]), capability) {
			continue
		}
		ui := anyMap(raw["ui"])
		skip := false
		for key, want := range selector {
			if !valuesEqual(ui[key], want) {
				skip = true
				break
			}
		}
		if skip {
			continue
		}
		matches = append(matches, provider)
	}
	if len(matches) == 0 {
		return nil, NewPluginRuntimeError("plugin.provider_unavailable",
			"Plugin provider is not available", false)
	}
	if len(matches) > 1 {
		return nil, NewPluginRuntimeError("plugin.provider_ambiguous",
			"More than one plugin provider matches the route", false)
	}
	return matches[0], nil
}

// RequireScopes 在派发前强制检查本次模式需要的 scope。
func RequireScopes(connection *userdb.PluginConnection, required ...string) error {
	have := map[string]bool{}
	for _, s := range connection.Scopes {
		have[asString(s)] = true
	}
	var missing []string
	for _, want := range required {
		if !have[want] {
			missing = append(missing, want)
		}
	}
	if len(missing) > 0 {
		sort.Strings(missing)
		return NewPluginRuntimeError("plugin.scope_denied",
			"Plugin connection lacks required scopes: "+strings.Join(missing, ", "), false)
	}
	return nil
}

// EffectiveTimeout 复刻 `_effective_timeout`：连接配置优先，钳制到 [0.01, 3600]。
func EffectiveTimeout(connection *userdb.PluginConnection, fallback float64) float64 {
	value := fallback
	if raw, ok := connection.Config["timeout_seconds"]; ok {
		value = toFloat(raw, fallback)
	}
	if value < 0.01 {
		return 0.01
	}
	if value > 3600 {
		return 3600
	}
	return value
}

// PreparedCall 是一次可安全并发执行的调用单元。
//
// SQLAlchemy session 不是线程安全的，因此所有涉及 session 的工作都在
// PrepareRead 内完成；Call 只做网络 I/O，可放进任意线程池。
type PreparedCall struct {
	// Key 是 connection.id：同一插件可能同时存在实例级与用户级连接，
	// 用 plugin_key 作键会让其中一个结果被另一个覆盖。
	Key        int64
	PluginKey  string
	Connection *userdb.PluginConnection
	Context    map[string]any
	Secrets    map[string]any
	Timeout    float64
	Provider   pluginiface.Provider
}

// PrepareRead 在调用线程内解密凭据并构造上下文，返回可并发执行的调用单元。
//
// method 是能力方法名（如 search_books），供 provider 的 PrepareContext
// 钩子按方法裁剪注入（对齐 Python prepare_context(session, settings, provider_method)）；
// run 执行器路径不经过该钩子，传空串即可。
//
// 返回的 failures 以 connection.id 为键，记录准备阶段就失败的连接。
func (r *Runtime) PrepareRead(connections []*userdb.PluginConnection, timeout float64,
	contextOverrides map[int64]map[string]any, requiredScopes []string,
	action string, requestedBy *int64, method string) ([]*PreparedCall, map[int64]error, error) {
	prepared := make([]*PreparedCall, 0, len(connections))
	failures := map[int64]error{}

	for _, connection := range connections {
		pluginKey, err := r.PluginKeyOf(connection)
		if err != nil {
			failures[connection.ID] = err
			continue
		}
		effectiveTimeout := EffectiveTimeout(connection, timeout)

		if err := RequireScopes(connection, requiredScopes...); err != nil {
			failures[connection.ID] = err
			continue
		}
		secrets, err := r.LoadSecrets(connection)
		if err != nil {
			failures[connection.ID] = err
			continue
		}

		provider, err := r.Registry.Get(pluginKey)
		if err != nil {
			failures[connection.ID] = err
			continue
		}
		installation, err := getInstallationByID(r.DB, connection.InstallationID)
		if err != nil {
			failures[connection.ID] = err
			continue
		}
		if installation == nil {
			failures[connection.ID] = NewPluginRuntimeError("plugin.installation_missing",
				"Plugin installation was not found", false)
			continue
		}

		override := contextOverrides[connection.ID]
		providerPlatform := map[string]any{}
		if preparer, ok := provider.(interface {
			PrepareContext(db *sql.DB, settings map[string]any, method string) map[string]any
		}); ok {
			providerPlatform = preparer.PrepareContext(r.DB, r.Settings, method)
		}

		config := map[string]any{}
		for k, v := range installation.Config {
			config[k] = v
		}
		for k, v := range connection.Config {
			config[k] = v
		}
		for k, v := range anyMap(override["config"]) {
			config[k] = v
		}

		cursor := anyMap(override["cursor"])
		if len(cursor) == 0 {
			cursor = connection.Cursor
		}

		platform := map[string]any{}
		for k, v := range providerPlatform {
			platform[k] = v
		}
		for k, v := range anyMap(override["platform"]) {
			platform[k] = v
		}

		ctx := pluginiface.PluginContext{
			Action:    action,
			Attempt:   1,
			Config:    config,
			Cursor:    cursor,
			Secrets:   secrets,
			Scopes:    toStringSlice(connection.Scopes),
			InputData: anyMap(override["input_data"]),
			Deadline:  deadlineString(effectiveTimeout),
			Platform:  platform,
		}

		prepared = append(prepared, &PreparedCall{
			Key:        connection.ID,
			PluginKey:  pluginKey,
			Connection: connection,
			Context:    ctx.AsDict(),
			Secrets:    secrets,
			Timeout:    effectiveTimeout,
			Provider:   provider,
		})
	}
	return prepared, failures, nil
}

// deadlineString 复刻 `(datetime.now() + timedelta(seconds=t)).isoformat()`。
func deadlineString(seconds float64) string {
	return time.Now().Add(time.Duration(seconds * float64(time.Second))).Format("2006-01-02T15:04:05.000000")
}

// toStringSlice 把 []any 转成 []string。
func toStringSlice(list []any) []string {
	out := make([]string, 0, len(list))
	for _, item := range list {
		out = append(out, asString(item))
	}
	return out
}

// valuesEqual 复刻 Python `!=` 在 UI 选择器上的比较语义。
func valuesEqual(a, b any) bool {
	return fmt.Sprint(a) == fmt.Sprint(b)
}

// toFloat 复刻 Python float() 对数值/字符串的转换。
func toFloat(v any, fallback float64) float64 {
	switch t := v.(type) {
	case float64:
		return t
	case float32:
		return float64(t)
	case int:
		return float64(t)
	case int64:
		return float64(t)
	case string:
		var f float64
		if _, err := fmt.Sscanf(strings.TrimSpace(t), "%g", &f); err == nil {
			return f
		}
	}
	return fallback
}

// ---- 数据库小工具 ----

// rowScanner 抽象 *sql.Row 与 *sql.Rows。
type rowScanner interface {
	Scan(dest ...any) error
}

// scanConnection 从一行读取连接。
//
// 列顺序必须与 ConnectionsFor 的 SELECT 一致：
// id, installation_id, owner_type, owner_id, role, name, config, scopes,
// health, enabled, cursor, lease_token, lease_until
func scanConnection(row rowScanner) (*userdb.PluginConnection, error) {
	var (
		c          userdb.PluginConnection
		config     sql.NullString
		scopes     sql.NullString
		health     sql.NullString
		cursor     sql.NullString
		leaseToken sql.NullString
		leaseUntil sql.NullString
	)
	err := row.Scan(&c.ID, &c.InstallationID, &c.OwnerType, &c.OwnerID, &c.Role,
		&c.Name, &config, &scopes, &health, &c.Enabled, &cursor,
		&leaseToken, &leaseUntil)
	if err != nil {
		return nil, err
	}
	c.Config = decodeJSONMap(config.String)
	c.Scopes = decodeJSONList(scopes.String)
	c.Health = health.String
	c.Cursor = decodeJSONMap(cursor.String)
	c.LeaseToken = leaseToken.String
	c.LeaseUntil = leaseUntil.String
	return &c, nil
}

// getInstallationByID 按 id 取安装记录。
func getInstallationByID(db *sql.DB, id int64) (*userdb.PluginInstallation, error) {
	row := db.QueryRow(`SELECT id, plugin_key, definition_id, version, enabled, scope,
		COALESCE(config,'{}'), COALESCE(installed_from,''), COALESCE(checksum,''),
		COALESCE(status,''), COALESCE(installed_by,0), COALESCE(create_time,''), COALESCE(update_time,'')
		FROM plugin_installations WHERE id = ?`, id)
	var (
		i       userdb.PluginInstallation
		config  sql.NullString
		created sql.NullString
		updated sql.NullString
	)
	err := row.Scan(&i.ID, &i.PluginKey, &i.DefinitionID, &i.Version, &i.Enabled,
		&i.Scope, &config, &i.InstalledFrom, &i.Checksum, &i.Status,
		&i.InstalledBy, &created, &updated)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("pluginruntime: 查询安装记录失败: %w", err)
	}
	i.Config = decodeJSONMap(config.String)
	i.CreateTime = created.String
	i.UpdateTime = updated.String
	return &i, nil
}

// getDefinitionByID 按 id 取插件定义。
func getDefinitionByID(db *sql.DB, id int64) (*userdb.PluginDefinition, error) {
	row := db.QueryRow(`SELECT id, plugin_key, version, protocol_version, name, runtime_kind,
		COALESCE(categories,'[]'), COALESCE(capabilities,'[]'), COALESCE(actions,'[]'),
		COALESCE(auth_schema,'{}'), COALESCE(config_schema,'{}'), COALESCE(permissions,'[]'),
		COALESCE(data_policy,'{}'), COALESCE(compatibility,'{}'), COALESCE(homepage,''),
		COALESCE(license,''), COALESCE(manifest,'{}'), COALESCE(create_time,'')
		FROM plugin_definitions WHERE id = ?`, id)
	var (
		d            userdb.PluginDefinition
		categories   sql.NullString
		capabilities sql.NullString
		actions      sql.NullString
		authSchema   sql.NullString
		configSchema sql.NullString
		permissions  sql.NullString
		dataPolicy   sql.NullString
		compat       sql.NullString
		manifest     sql.NullString
		created      sql.NullString
	)
	err := row.Scan(&d.ID, &d.PluginKey, &d.Version, &d.ProtocolVersion, &d.Name,
		&d.RuntimeKind, &categories, &capabilities, &actions, &authSchema,
		&configSchema, &permissions, &dataPolicy, &compat, &d.Homepage,
		&d.License, &manifest, &created)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("pluginruntime: 查询插件定义失败: %w", err)
	}
	d.Categories = decodeJSONList(categories.String)
	d.Capabilities = decodeJSONList(capabilities.String)
	d.Actions = decodeJSONList(actions.String)
	d.AuthSchema = decodeJSONMap(authSchema.String)
	d.ConfigSchema = decodeJSONMap(configSchema.String)
	d.Permissions = decodeJSONList(permissions.String)
	d.DataPolicy = decodeJSONMap(dataPolicy.String)
	d.Compatibility = decodeJSONMap(compat.String)
	d.Manifest = decodeJSONMap(manifest.String)
	d.CreateTime = created.String
	return &d, nil
}

// ---- 未使用占位，避免 plugindomain 导入被裁剪 ----

var _ = plugindomain.CheckReport{}
