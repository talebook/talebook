// 本文件实现 webserver/handlers/plugins.py 的 20 条路由。
//
// 通用插件管理接口：目录、安装、连接、功能、动作与运行历史。
// 内置文本工具的书籍选择与文件写入编排见 plugin_booktools.go。
//
// 与 Python 的对应关系：
//   - plugins_common.body / error → pluginBody / pluginError
//   - PluginRuntime.read/write/sync → Runtime.Read/Write/Sync
//   - prepare_run + execute_plugin_run → PrepareRun + PluginRunExecutor
package httpapi

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginproto"
	"talebook/booksvr/internal/pluginruntime"
	"talebook/booksvr/internal/userdb"
)

// 插件 handler 的常量，与 plugins.py 顶部一致。
const (
	// PluginCapabilityResultLimit 是能力测试接口返回的条数上限。
	PluginCapabilityResultLimit = 20
	// PluginDefaultConnectionRole 是连接的默认角色（查询键）。
	PluginDefaultConnectionRole = "default"
)

// pluginServerOwnedInputKeys 由服务端计算并注入，客户端传入的同名值一律丢弃。
var pluginServerOwnedInputKeys = map[string]bool{
	"allowed_book_ids": true,
	"matches":          true,
}

// pluginBookScopedCapabilities 声明了这些能力的插件会做书籍匹配。
var pluginBookScopedCapabilities = map[string]bool{
	"annotations.import": true,
}

// pluginBookQueryFields 是元数据查询允许的字段。
var pluginBookQueryFields = map[string]bool{
	"title": true, "isbn": true, "publisher": true, "authors": true,
}

// PluginConfig 是插件管理 handler 的依赖。
type PluginConfig struct {
	// Settings 是 Talebook 配置（CONF）。
	Settings map[string]any
	// Registry 是插件注册表；为 nil 时用全局单例。
	Registry *pluginruntime.PluginRegistry
	// Runtime 构造运行时；为 nil 时用默认实现。
	Runtime func(ctx *Context) *pluginruntime.Runtime
	// ExecuteRun 异步执行一次 run；为 nil 时返回未接线错误。
	ExecuteRun func(ctx *Context, runID int64) error
	// SaveExtraSettings 保存全局设置（对应 admin.SettingsSaverLogic）。
	// 为 nil 时返回未接线错误。
	SaveExtraSettings func(ctx *Context, args map[string]any) (map[string]any, error)
	// AllBookIDs 返回书库全部书籍 id（对应 annotation_writer.all_book_ids）。
	AllBookIDs func(ctx *Context) ([]int64, error)
	// CanViewBook 判断当前用户是否可见某本书（对应 handler.get_book）。
	CanViewBook func(ctx *Context, bookID int64) (bool, error)
	// ConfirmMatch 确认一次来源书籍与本地书籍的匹配。
	ConfirmMatch func(ctx *Context, connectionID int64, sourceBookID string, bookID int64,
		allowedBookIDs []int64) error
}

// pluginRegistry 返回插件注册表。
//
// 未注入时返回空注册表：调用方会得到 plugin.not_found，
// 与 Python 在 REGISTRY 未注册该插件时的行为一致。
func (cfg PluginConfig) pluginRegistry() *pluginruntime.PluginRegistry {
	if cfg.Registry != nil {
		return cfg.Registry
	}
	return pluginruntime.NewPluginRegistry()
}

// pluginRuntime 构造运行时。
func (cfg PluginConfig) pluginRuntime(ctx *Context) *pluginruntime.Runtime {
	if cfg.Runtime != nil {
		return cfg.Runtime(ctx)
	}
	return pluginruntime.NewRuntime(ctx.DB, cfg.Settings, cfg.pluginRegistry())
}

// pluginBody 复刻 plugins_common.body：解析并校验 JSON 请求体。
func pluginBody(ctx *Context) (map[string]any, error) {
	raw := ctx.Body()
	if len(strings.TrimSpace(string(raw))) == 0 {
		return map[string]any{}, nil
	}
	var value any
	if err := json.Unmarshal(raw, &value); err != nil {
		return nil, pluginruntime.NewPluginRuntimeError("plugin.request_invalid",
			"Request body must be valid JSON", false)
	}
	obj, ok := value.(map[string]any)
	if !ok {
		return nil, pluginruntime.NewPluginRuntimeError("plugin.request_invalid",
			"Request body must be an object", false)
	}
	return obj, nil
}

// pluginError 复刻 plugins_common.error：把插件异常转成统一 JSON 错误体。
func pluginError(err error) map[string]any {
	code := pluginruntime.ErrorCodeOf(err)
	if code == "" {
		code = "plugin.error"
	}
	return map[string]any{"err": code, "msg": err.Error()}
}

// pluginErrorOr 把错误转成错误信封；非插件错误按 plugin.error 处理。
func pluginErrorOr(err error) map[string]any {
	if err == nil {
		return nil
	}
	return pluginError(err)
}

// ---- 小工具 ----

// pluginStr 把任意值转成字符串（nil → 空串）。
func pluginStr(v any) string {
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	return fmt.Sprintf("%v", v)
}

// pluginBool 复刻 Python 的 bool()。
func pluginBool(v any) bool {
	switch t := v.(type) {
	case nil:
		return false
	case bool:
		return t
	case string:
		return t != ""
	case float64:
		return t != 0
	case int:
		return t != 0
	case int64:
		return t != 0
	case []any:
		return len(t) > 0
	case map[string]any:
		return len(t) > 0
	}
	return true
}

// pluginInt 把任意值转成 int；不可转换时返回 fallback。
func pluginInt(v any, fallback int64) int64 {
	switch t := v.(type) {
	case float64:
		return int64(t)
	case int:
		return int64(t)
	case int64:
		return t
	case json.Number:
		if n, err := t.Int64(); err == nil {
			return n
		}
	case string:
		if n, err := strconv.ParseInt(strings.TrimSpace(t), 10, 64); err == nil {
			return n
		}
	}
	return fallback
}

// pluginDict 把任意值规整为 map（nil → 空 map）。
func pluginDict(v any) map[string]any {
	if m, ok := v.(map[string]any); ok {
		return m
	}
	return map[string]any{}
}

// pluginList 把任意值规整为 []any（nil → 空切片）。
func pluginList(v any) []any {
	if l, ok := v.([]any); ok {
		return l
	}
	return []any{}
}

// pluginAnyList 把任意值规整为 []any（nil → 空切片）。
func pluginAnyList(v any) []any {
	if l, ok := v.([]any); ok {
		return l
	}
	return []any{}
}

// pluginStrList 把任意值规整为 []string。
func pluginStrList(v any) []string {
	out := []string{}
	for _, item := range pluginList(v) {
		out = append(out, pluginStr(item))
	}
	return out
}

// pluginTruncate 按字符截断（Python 的 [:n] 语义）。
func pluginTruncate(s string, n int) string {
	runes := []rune(s)
	if len(runes) <= n {
		return s
	}
	return string(runes[:n])
}

// pluginManifest 校验并返回清单。
func pluginManifest(provider pluginiface.Provider) (*pluginproto.PluginManifest, error) {
	manifest, err := pluginproto.ValidateManifest(provider.Manifest())
	if err != nil {
		return nil, pluginruntime.NewPluginRuntimeError("plugin.manifest_invalid", err.Error(), false)
	}
	return manifest, nil
}

// pluginPublicManifest 复刻 plugins._public_manifest。
func pluginPublicManifest(manifest *pluginproto.PluginManifest) map[string]any {
	raw := manifest.Raw
	return map[string]any{
		"plugin_key":        pluginStr(raw["id"]),
		"name":              pluginStr(raw["name"]),
		"version":           pluginStr(raw["version"]),
		"protocol_version":  pluginStr(raw["protocol_version"]),
		"description":       pluginStr(raw["description"]),
		"runtime_kind":      pluginStr(raw["runtime_kind"]),
		"categories":        pluginStrList(raw["categories"]),
		"capabilities":      pluginStrList(raw["capabilities"]),
		"actions":           pluginStrList(raw["actions"]),
		"auth_schema":       pluginDict(raw["auth_schema"]),
		"config_schema":     pluginDict(raw["config_schema"]),
		"connection_owners": pluginStrList(raw["connection_owners"]),
		"permissions":       pluginStrList(raw["permissions"]),
		"extra_features":    pluginDict(raw["extra_features"]),
		"ui":                pluginDict(raw["ui"]),
	}
}

// pluginInstallationSummary 复刻安装摘要字典（UserPlugins / UserPluginState 共用）。
func pluginInstallationSummary(inst *userdb.PluginInstallation) map[string]any {
	return map[string]any{
		"id":         inst.ID,
		"plugin_key": inst.PluginKey,
		"version":    inst.Version,
		"enabled":    inst.Enabled,
		"status":     inst.Status,
	}
}

// ---- 能力测试共用 ----

// pluginCapabilityConnection 复刻 plugins._capability_connection。
//
// 解析一个已启用的实例连接，并校验插件确实声明了该能力。
func (cfg PluginConfig) pluginCapabilityConnection(ctx *Context, pluginKey, capability string) (
	*pluginruntime.Runtime, *userdb.PluginConnection, error) {
	if _, err := pluginruntime.EnsureBuiltinInstallations(ctx.DB, ctx.Identity.UserID,
		cfg.Settings, cfg.pluginRegistry()); err != nil {
		return nil, nil, err
	}
	provider, err := cfg.pluginRegistry().Get(pluginKey)
	if err != nil {
		return nil, nil, err
	}
	manifest, err := pluginManifest(provider)
	if err != nil {
		return nil, nil, err
	}
	if !pluginContains(pluginStrList(manifest.Raw["capabilities"]), capability) {
		return nil, nil, pluginruntime.NewPluginRuntimeError("plugin.capability_not_supported",
			fmt.Sprintf("%s does not provide %s", pluginKey, capability), false)
	}
	installation, err := userdb.GetPluginInstallationByKey(ctx.DB, pluginKey)
	if err != nil {
		return nil, nil, err
	}
	if installation == nil || !installation.Enabled || installation.Status != "active" {
		return nil, nil, pluginruntime.NewPluginRuntimeError("plugin.installation_disabled",
			"Plugin installation is not enabled", false)
	}
	connection, err := pluginInstanceConnection(ctx.DB, installation.ID)
	if err != nil {
		return nil, nil, err
	}
	if connection == nil {
		return nil, nil, pluginruntime.NewPluginRuntimeError("plugin.connection_missing",
			"Plugin has no enabled instance configuration", false)
	}
	return cfg.pluginRuntime(ctx), connection, nil
}

// pluginConnectionColumns 是 plugin_connections 的完整列清单（与 userdb 扫描器一致）。
const pluginConnectionColumns = `id, installation_id, owner_type, owner_id, role, name,
	secret_id, COALESCE(config,'{}'), COALESCE(scopes,'[]'), COALESCE(schedule,''),
	COALESCE(cursor,'{}'), COALESCE(health,''), COALESCE(health_message,''),
	enabled, COALESCE(lease_token,''), COALESCE(lease_until,''),
	COALESCE(create_time,''), COALESCE(update_time,'')`

// pluginInstanceConnection 取该安装下第一条启用的实例连接（按 id 升序）。
func pluginInstanceConnection(db *sql.DB, installationID int64) (*userdb.PluginConnection, error) {
	row := db.QueryRow(`SELECT `+pluginConnectionColumns+` FROM plugin_connections
		WHERE installation_id = ? AND owner_type = 'instance' AND owner_id = 0 AND enabled = 1
		ORDER BY id LIMIT 1`, installationID)
	return scanPluginConnectionRow(row)
}

// pluginConnectionScanner 是 *sql.Row 与 *sql.Rows 的公共扫描面。
type pluginConnectionScanner interface {
	Scan(dest ...any) error
}

// scanPluginConnectionRow 按 plugin_connections 的列顺序扫描一行。
func scanPluginConnectionRow(row pluginConnectionScanner) (*userdb.PluginConnection, error) {
	var (
		c             userdb.PluginConnection
		secretID      sql.NullInt64
		config        sql.NullString
		scopes        sql.NullString
		schedule      sql.NullString
		cursor        sql.NullString
		health        sql.NullString
		healthMessage sql.NullString
		leaseToken    sql.NullString
		leaseUntil    sql.NullString
		created       sql.NullString
		updated       sql.NullString
	)
	err := row.Scan(&c.ID, &c.InstallationID, &c.OwnerType, &c.OwnerID, &c.Role,
		&c.Name, &secretID, &config, &scopes, &schedule, &cursor, &health,
		&healthMessage, &c.Enabled, &leaseToken, &leaseUntil, &created, &updated)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	c.SecretID = secretID
	c.Config = decodeJSONMapOrEmpty(config.String)
	c.Scopes = decodeJSONListOrEmpty(scopes.String)
	c.Schedule = schedule.String
	c.Cursor = decodeJSONMapOrEmpty(cursor.String)
	c.Health = health.String
	c.HealthMessage = healthMessage.String
	c.LeaseToken = leaseToken.String
	c.LeaseUntil = leaseUntil.String
	c.CreateTime = created.String
	c.UpdateTime = updated.String
	return &c, nil
}

// decodeJSONListOrEmpty 把 JSON 文本解成 []any；空串或非法内容返回空切片。
func decodeJSONListOrEmpty(text string) []any {
	text = strings.TrimSpace(text)
	if text == "" || text == "null" {
		return []any{}
	}
	var out []any
	if err := json.Unmarshal([]byte(text), &out); err != nil {
		return []any{}
	}
	return out
}

// pluginContains 报告字符串切片是否包含目标。
func pluginContains(list []string, target string) bool {
	for _, item := range list {
		if item == target {
			return true
		}
	}
	return false
}

// pluginBookQuery 复刻 plugins._book_query。
func pluginBookQuery(ctx *Context) (map[string]any, error) {
	req, err := pluginBody(ctx)
	if err != nil {
		return nil, err
	}
	raw := pluginDict(req["query"])
	if v, ok := req["query"]; ok && v != nil {
		if _, isMap := v.(map[string]any); !isMap {
			return nil, pluginruntime.NewPluginRuntimeError("plugin.request_invalid",
				"query must be an object", false)
		}
	}
	var unknown []string
	for key := range raw {
		if !pluginBookQueryFields[key] {
			unknown = append(unknown, key)
		}
	}
	if len(unknown) > 0 {
		sort.Strings(unknown)
		return nil, pluginruntime.NewPluginRuntimeError("plugin.request_invalid",
			"unknown query fields: "+strings.Join(unknown, ", "), false)
	}

	authors := []string{}
	if v, ok := raw["authors"]; ok && v != nil {
		if s, isStr := v.(string); isStr {
			for _, item := range strings.Split(s, ",") {
				if trimmed := strings.TrimSpace(item); trimmed != "" {
					authors = append(authors, trimmed)
				}
			}
		} else {
			list, isList := v.([]any)
			if !isList {
				return nil, pluginruntime.NewPluginRuntimeError("plugin.request_invalid",
					"authors must be a list of strings", false)
			}
			for _, item := range list {
				s, isStr := item.(string)
				if !isStr {
					return nil, pluginruntime.NewPluginRuntimeError("plugin.request_invalid",
						"authors must be a list of strings", false)
				}
				authors = append(authors, s)
			}
		}
	}
	if len(authors) > 8 {
		return nil, pluginruntime.NewPluginRuntimeError("plugin.request_invalid",
			"authors must be a list of strings", false)
	}

	query := map[string]any{
		"title":     pluginTruncate(strings.TrimSpace(pluginStr(raw["title"])), 300),
		"isbn":      pluginTruncate(strings.TrimSpace(pluginStr(raw["isbn"])), 64),
		"publisher": pluginTruncate(strings.TrimSpace(pluginStr(raw["publisher"])), 300),
	}
	trimmed := []string{}
	for _, item := range authors {
		if t := strings.TrimSpace(item); t != "" {
			trimmed = append(trimmed, pluginTruncate(t, 300))
		}
	}
	query["authors"] = trimmed

	// 对应 MetadataQuery.is_empty()：title 与 isbn 都为空即无效。
	if query["title"] == "" && query["isbn"] == "" {
		return nil, pluginruntime.NewPluginRuntimeError("plugin.request_invalid",
			"title or isbn is required", false)
	}
	return query, nil
}

// pluginMetadataSummary 复刻 plugins._metadata_summary。
func pluginMetadataSummary(record map[string]any) map[string]any {
	authors := pluginStrList(record["authors"])
	if len(authors) == 0 {
		if author := pluginStr(record["author"]); author != "" {
			authors = []string{author}
		}
	}
	return map[string]any{
		"title":          pluginStr(record["title"]),
		"authors":        authors,
		"publisher":      pluginStr(record["publisher"]),
		"isbn":           pluginStr(record["isbn"]),
		"comments":       pluginTruncate(pluginStr(record["comments"]), 500),
		"rating":         record["rating"],
		"series":         pluginStr(record["series"]),
		"language":       pluginStr(record["language"]),
		"cover_url":      pluginStr(record["cover_url"]),
		"website":        pluginStr(record["website"]),
		"provider_value": pluginStr(record["provider_value"]),
	}
}

// pluginSourceSummary 复刻 plugins._source_summary。
func pluginSourceSummary(record map[string]any) map[string]any {
	out := map[string]any{}
	for _, key := range []string{
		"external_id", "title", "authors", "isbn", "format", "source",
		"source_url", "access", "license", "description", "cover_url",
	} {
		out[key] = record[key]
	}
	return out
}

// pluginReviewSummary 复刻 plugins._review_summary。
func pluginReviewSummary(record map[string]any) map[string]any {
	out := map[string]any{}
	for _, key := range []string{
		"source", "review_kind", "external_id", "rating",
		"source_time", "source_url", "summary",
	} {
		out[key] = record[key]
	}
	return out
}

// pluginFailureSummary 复刻 plugins._failure_summary。
func pluginFailureSummary(failure map[string]any) map[string]any {
	return map[string]any{
		"external_id":   pluginStr(failure["external_id"]),
		"error_code":    pluginStr(failure["error_code"]),
		"error_message": pluginStr(failure["error_message"]),
	}
}

// pluginRecords 把 provider 返回值规整成 []map[string]any。
//
// provider 可能返回 []map[string]any、[]any 或带 ToDict 的对象；
// 这里统一成字典列表，供 *_summary 消费。
func pluginRecords(value any) []map[string]any {
	switch v := value.(type) {
	case nil:
		return nil
	case []map[string]any:
		return v
	case []any:
		out := make([]map[string]any, 0, len(v))
		for _, item := range v {
			out = append(out, pluginRecordDict(item))
		}
		return out
	case map[string]any:
		return []map[string]any{v}
	}
	return nil
}

// pluginRecordDict 把单条记录规整成字典。
func pluginRecordDict(value any) map[string]any {
	switch v := value.(type) {
	case map[string]any:
		return v
	case interface{ ToDict() map[string]any }:
		return v.ToDict()
	}
	return map[string]any{}
}

// pluginPageItems 从 provider 返回值里取分页结果。
//
// Python 侧 page 是带 items/failures/has_more/health_message 的对象；
// Go 侧可能是 *plugindomain.Page 或等价字典。
func pluginPageParts(value any) (items []map[string]any, failures []map[string]any,
	hasMore bool, healthMessage string) {
	switch page := value.(type) {
	case map[string]any:
		return pluginRecords(page["items"]), pluginRecords(page["failures"]),
			pluginBool(page["has_more"]), pluginStr(page["health_message"])
	case interface {
		GetItems() []any
	}:
		return pluginRecords(page.GetItems()), nil, false, ""
	}
	return nil, nil, false, ""
}

// pluginLimit 截断到能力测试上限。
func pluginLimit(records []map[string]any) []map[string]any {
	if len(records) > PluginCapabilityResultLimit {
		return records[:PluginCapabilityResultLimit]
	}
	return records
}

// ---- AdminPlugins ----

// AdminPluginsHandler 对应 AdminPlugins（@js @is_admin）。
func AdminPluginsHandler(cfg PluginConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if _, err := pluginruntime.EnsureBuiltinInstallations(ctx.DB, ctx.Identity.UserID,
			cfg.Settings, cfg.pluginRegistry()); err != nil {
			return pluginErrorOr(err), nil
		}
		registered := cfg.pluginRegistry().SortedIDs()
		definitions, err := pluginDefinitionsFor(ctx.DB, registered)
		if err != nil {
			return nil, err
		}
		installations, err := pluginInstallationsFor(ctx.DB, registered)
		if err != nil {
			return nil, err
		}
		definitionMap := map[int64]*userdb.PluginDefinition{}
		for _, d := range definitions {
			definitionMap[d.ID] = d
		}

		// 各插件自报配置状态，此处不认识任何具体 plugin_key。
		builtinState := map[string]any{}
		for _, provider := range cfg.pluginRegistry().Providers() {
			reporter, ok := provider.(pluginStatusReporter)
			if !ok {
				continue
			}
			value, err := reporter.PluginStatus(ctx.DB, cfg.Settings)
			if err != nil {
				return nil, err
			}
			if value != nil {
				builtinState[pluginStr(provider.Manifest()["id"])] = value
			}
		}

		defs := make([]map[string]any, 0, len(definitions))
		for _, d := range definitions {
			defs = append(defs, d.ToPublic())
		}
		insts := make([]map[string]any, 0, len(installations))
		for _, i := range installations {
			insts = append(insts, i.ToPublic(definitionMap[i.DefinitionID]))
		}
		return map[string]any{
			"err":           "ok",
			"definitions":   defs,
			"installations": insts,
			"builtin_state": builtinState,
		}, nil
	}
}

// pluginStatusReporter 是 provider 可选的配置状态钩子。
//
// 对应 Python 的 `getattr(provider, "status", None)`：未实现即跳过。
type pluginStatusReporter interface {
	PluginStatus(db *sql.DB, settings map[string]any) (map[string]any, error)
}

// pluginDefinitionsFor 取已注册插件的定义（按 id 升序）。
//
// 复用 userdb 的扫描器：它会填充 Manifest，而 ToPublic 依赖 Manifest。
func pluginDefinitionsFor(db *sql.DB, keys []string) ([]*userdb.PluginDefinition, error) {
	if len(keys) == 0 {
		return nil, nil
	}
	placeholders, args := pluginPlaceholders(keys)
	rows, err := db.Query(`SELECT plugin_key, version FROM plugin_definitions
		WHERE plugin_key IN (`+placeholders+`) ORDER BY id`, args...)
	if err != nil {
		return nil, err
	}
	type keyVersion struct{ key, version string }
	var pairs []keyVersion
	for rows.Next() {
		var kv keyVersion
		if err := rows.Scan(&kv.key, &kv.version); err != nil {
			rows.Close()
			return nil, err
		}
		pairs = append(pairs, kv)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, err
	}
	rows.Close()

	out := make([]*userdb.PluginDefinition, 0, len(pairs))
	for _, kv := range pairs {
		d, err := userdb.GetPluginDefinitionByKeyVersion(db, kv.key, kv.version)
		if err != nil {
			return nil, err
		}
		if d != nil {
			out = append(out, d)
		}
	}
	return out, nil
}

// pluginInstallationsFor 取已注册插件的安装（按 id 升序）。
func pluginInstallationsFor(db *sql.DB, keys []string) ([]*userdb.PluginInstallation, error) {
	if len(keys) == 0 {
		return nil, nil
	}
	placeholders, args := pluginPlaceholders(keys)
	rows, err := db.Query(`SELECT plugin_key FROM plugin_installations
		WHERE plugin_key IN (`+placeholders+`) ORDER BY id`, args...)
	if err != nil {
		return nil, err
	}
	var keysInOrder []string
	for rows.Next() {
		var key string
		if err := rows.Scan(&key); err != nil {
			rows.Close()
			return nil, err
		}
		keysInOrder = append(keysInOrder, key)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, err
	}
	rows.Close()

	out := make([]*userdb.PluginInstallation, 0, len(keysInOrder))
	for _, key := range keysInOrder {
		i, err := userdb.GetPluginInstallationByKey(db, key)
		if err != nil {
			return nil, err
		}
		if i != nil {
			out = append(out, i)
		}
	}
	return out, nil
}

// pluginPlaceholders 生成 IN 子句的占位符与参数。
func pluginPlaceholders(keys []string) (string, []any) {
	parts := make([]string, 0, len(keys))
	args := make([]any, 0, len(keys))
	for _, key := range keys {
		parts = append(parts, "?")
		args = append(args, key)
	}
	return strings.Join(parts, ","), args
}

// ---- AdminPluginInstall ----

// AdminPluginInstallHandler 对应 AdminPluginInstall（@js @is_admin）。
func AdminPluginInstallHandler(cfg PluginConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		req, err := pluginBody(ctx)
		if err != nil {
			return pluginErrorOr(err), nil
		}
		installation, err := pluginruntime.InstallBuiltin(ctx.DB, pluginStr(req["plugin_key"]),
			ctx.Identity.UserID, pluginDict(req["config"]), pluginStrList(req["permissions"]),
			true, cfg.pluginRegistry())
		if err != nil {
			return pluginErrorOr(err), nil
		}
		definition, err := pluginDefinitionByID(ctx.DB, installation.DefinitionID)
		if err != nil {
			return nil, err
		}
		return map[string]any{"err": "ok", "installation": installation.ToPublic(definition)}, nil
	}
}

// pluginDefinitionByID 按 id 取定义；不存在返回 nil。
func pluginDefinitionByID(db *sql.DB, id int64) (*userdb.PluginDefinition, error) {
	var key, version string
	err := db.QueryRow(`SELECT plugin_key, version FROM plugin_definitions WHERE id = ?`, id).
		Scan(&key, &version)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return userdb.GetPluginDefinitionByKeyVersion(db, key, version)
}

// ---- AdminPluginInstallationState ----

// AdminPluginInstallationStateHandler 对应 AdminPluginInstallationState（@js @is_admin）。
func AdminPluginInstallationStateHandler(cfg PluginConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		req, err := pluginBody(ctx)
		if err != nil {
			return pluginErrorOr(err), nil
		}
		enabled, ok := req["enabled"].(bool)
		if !ok {
			return pluginErrorOr(pluginruntime.NewPluginRuntimeError("plugin.request_invalid",
				"enabled must be a boolean", false)), nil
		}
		installationID := pluginInt(ctx.Param(0), 0)
		installation, err := pluginInstallationByID(ctx.DB, installationID)
		if err != nil {
			return nil, err
		}
		if installation == nil {
			return pluginErrorOr(pluginruntime.NewPluginRuntimeError("plugin.installation_missing",
				"Plugin installation was not found", false)), nil
		}
		if _, err := ctx.DB.Exec(`UPDATE plugin_installations SET enabled = ?, update_time = ?
			WHERE id = ?`, enabled, nowString(), installationID); err != nil {
			return nil, err
		}
		installation.Enabled = enabled
		definition, err := pluginDefinitionByID(ctx.DB, installation.DefinitionID)
		if err != nil {
			return nil, err
		}
		return map[string]any{"err": "ok", "installation": installation.ToPublic(definition)}, nil
	}
}

// pluginInstallationByID 按 id 取安装；不存在返回 nil。
func pluginInstallationByID(db *sql.DB, id int64) (*userdb.PluginInstallation, error) {
	var key string
	err := db.QueryRow(`SELECT plugin_key FROM plugin_installations WHERE id = ?`, id).Scan(&key)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return userdb.GetPluginInstallationByKey(db, key)
}

// ---- AdminPluginOpdsService ----

// AdminPluginOpdsServiceHandler 对应 AdminPluginOpdsService（@js @is_admin）。
func AdminPluginOpdsServiceHandler(cfg PluginConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		req, err := pluginBody(ctx)
		if err != nil {
			return pluginErrorOr(err), nil
		}
		enabled, ok := req["enabled"].(bool)
		if !ok {
			return pluginErrorOr(pluginruntime.NewPluginRuntimeError("plugin.request_invalid",
				"enabled must be a boolean", false)), nil
		}
		if cfg.SaveExtraSettings == nil {
			return pluginErrorOr(pluginruntime.NewPluginRuntimeError("plugin.not_wired",
				"Settings saver is not available", false)), nil
		}
		args := map[string]any{}
		for k, v := range cfg.Settings {
			args[k] = v
		}
		args["OPDS_ENABLED"] = enabled
		result, err := cfg.SaveExtraSettings(ctx, args)
		if err != nil {
			return pluginErrorOr(err), nil
		}
		if pluginStr(result["err"]) != "ok" {
			return result, nil
		}
		return map[string]any{"err": "ok", "enabled": enabled}, nil
	}
}

// ---- AdminPluginPreferences ----

// AdminPluginPreferencesHandler 对应 AdminPluginPreferences（@js @is_admin）。
func AdminPluginPreferencesHandler(cfg PluginConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if ctx.Request.Method == "GET" {
			return map[string]any{
				"err": "ok",
				"metadata": map[string]any{
					"auto_fill_meta":       pluginBool(cfg.Settings["auto_fill_meta"]),
					"auto_fill_keep_cover": pluginBool(cfg.Settings["auto_fill_keep_cover"]),
				},
				"devices": pluginList(cfg.Settings["DEVICES"]),
			}, nil
		}

		req, err := pluginBody(ctx)
		if err != nil {
			return pluginErrorOr(err), nil
		}
		updates := map[string]any{}
		if raw, ok := req["metadata"]; ok {
			metadata, isMap := raw.(map[string]any)
			if !isMap {
				return pluginErrorOr(pluginruntime.NewPluginRuntimeError("plugin.request_invalid",
					"metadata must be an object", false)), nil
			}
			for _, key := range []string{"auto_fill_meta", "auto_fill_keep_cover"} {
				if v, present := metadata[key]; present {
					b, isBool := v.(bool)
					if !isBool {
						return pluginErrorOr(pluginruntime.NewPluginRuntimeError("plugin.request_invalid",
							key+" must be a boolean", false)), nil
					}
					updates[key] = b
				}
			}
		}
		if raw, ok := req["devices"]; ok {
			devices, err := pluginValidateDevices(raw)
			if err != nil {
				return pluginErrorOr(err), nil
			}
			updates["DEVICES"] = devices
		}
		if len(updates) == 0 {
			return pluginErrorOr(pluginruntime.NewPluginRuntimeError("plugin.request_invalid",
				"No plugin preference was supplied", false)), nil
		}
		if cfg.SaveExtraSettings == nil {
			return pluginErrorOr(pluginruntime.NewPluginRuntimeError("plugin.not_wired",
				"Settings saver is not available", false)), nil
		}
		args := map[string]any{}
		for k, v := range cfg.Settings {
			args[k] = v
		}
		for k, v := range updates {
			args[k] = v
		}
		result, err := cfg.SaveExtraSettings(ctx, args)
		if err != nil {
			return pluginErrorOr(err), nil
		}
		if pluginStr(result["err"]) != "ok" {
			return result, nil
		}
		out := map[string]any{"err": "ok"}
		for k, v := range updates {
			out[k] = v
		}
		return out, nil
	}
}

// pluginValidateDevices 复刻 AdminPluginPreferences._validate_devices。
func pluginValidateDevices(value any) ([]map[string]any, error) {
	list, ok := value.([]any)
	if !ok || len(list) > 100 {
		return nil, pluginruntime.NewPluginRuntimeError("plugin.request_invalid",
			"devices must be a list", false)
	}
	devices := make([]map[string]any, 0, len(list))
	for _, item := range list {
		obj, isMap := item.(map[string]any)
		if !isMap {
			return nil, pluginruntime.NewPluginRuntimeError("plugin.request_invalid",
				"device must be an object", false)
		}
		name := strings.TrimSpace(pluginStr(obj["name"]))
		deviceType := strings.ToLower(strings.TrimSpace(pluginStr(obj["type"])))
		if name == "" || len([]rune(name)) > 64 || deviceType == "" {
			return nil, pluginruntime.NewPluginRuntimeError("plugin.request_invalid",
				"device name and type are required", false)
		}
		device := map[string]any{"name": name, "type": deviceType}
		if deviceType == "kindle" {
			device["mailbox"] = strings.TrimSpace(pluginStr(obj["mailbox"]))
		} else {
			port := pluginInt(obj["port"], 0)
			schema := strings.ToLower(pluginStr(obj["schema"]))
			if schema == "" {
				schema = "http"
			}
			device["ip"] = strings.TrimSpace(pluginStr(obj["ip"]))
			device["port"] = port
			device["schema"] = schema
			if port <= 0 || port > 65535 || (schema != "http" && schema != "https") {
				return nil, pluginruntime.NewPluginRuntimeError("plugin.request_invalid",
					"device port or schema is invalid", false)
			}
		}
		devices = append(devices, device)
	}
	return devices, nil
}

// ---- AdminPluginConnections ----

// AdminPluginConnectionsHandler 对应 AdminPluginConnections（@js @is_admin）。
func AdminPluginConnectionsHandler(cfg PluginConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if ctx.Request.Method == "GET" {
			return adminPluginConnectionsGet(ctx)
		}
		req, err := pluginBody(ctx)
		if err != nil {
			return pluginErrorOr(err), nil
		}
		if owner := pluginStr(req["owner_type"]); owner != "" && owner != "instance" {
			return pluginErrorOr(pluginruntime.NewPluginRuntimeError("plugin.owner_forbidden",
				"Administrators cannot manage another user's connection", false)), nil
		}
		name := pluginStr(req["name"])
		if name == "" {
			name = "default"
		}
		role := pluginStr(req["role"])
		if role == "" {
			role = PluginDefaultConnectionRole
		}
		schedule := pluginStr(req["schedule"])
		connection, err := cfg.pluginRuntime(ctx).SaveConnection(
			pluginInt(req["installation_id"], 0), "instance", 0,
			pluginDict(req["credentials"]), name, pluginDict(req["config"]),
			pluginAnyList(req["scopes"]), schedule, role)
		if err != nil {
			return pluginErrorOr(err), nil
		}
		public, err := cfg.pluginRuntime(ctx).ConnectionPublicDict(connection)
		if err != nil {
			return pluginErrorOr(err), nil
		}
		return map[string]any{"err": "ok", "connection": public}, nil
	}
}

// adminPluginConnectionsGet 复刻 AdminPluginConnections.get。
func adminPluginConnectionsGet(ctx *Context) (map[string]any, error) {
	rows, err := ctx.DB.Query(`SELECT ` + pluginConnectionColumns + `
		FROM plugin_connections ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var all []*userdb.PluginConnection
	for rows.Next() {
		c, err := scanPluginConnectionRow(rows)
		if err != nil {
			return nil, err
		}
		all = append(all, c)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	instance := make([]*userdb.PluginConnection, 0, len(all))
	for _, c := range all {
		if c.OwnerType == "instance" {
			instance = append(instance, c)
		}
	}
	secrets, err := pluginSecretsByID(ctx.DB, instance)
	if err != nil {
		return nil, err
	}

	// user_connection_health 按 (installation_id, health) 计数，并按该键排序。
	type healthKey struct {
		installationID int64
		health         string
	}
	counts := map[healthKey]int{}
	for _, c := range all {
		if c.OwnerType != "user" {
			continue
		}
		counts[healthKey{c.InstallationID, c.Health}]++
	}
	keys := make([]healthKey, 0, len(counts))
	for k := range counts {
		keys = append(keys, k)
	}
	sort.Slice(keys, func(i, j int) bool {
		if keys[i].installationID != keys[j].installationID {
			return keys[i].installationID < keys[j].installationID
		}
		return keys[i].health < keys[j].health
	})
	health := make([]map[string]any, 0, len(keys))
	for _, k := range keys {
		health = append(health, map[string]any{
			"installation_id": k.installationID,
			"health":          k.health,
			"count":           counts[k],
		})
	}

	connections := make([]map[string]any, 0, len(instance))
	for _, c := range instance {
		connections = append(connections, c.ToPublic(secrets[c.SecretID.Int64]))
	}
	return map[string]any{
		"err":                    "ok",
		"connections":            connections,
		"user_connection_health": health,
	}, nil
}

// pluginSecretsByID 批量取连接对应的密钥（只取有 secret_id 的）。
func pluginSecretsByID(db *sql.DB, connections []*userdb.PluginConnection) (map[int64]*userdb.PluginSecret, error) {
	ids := []any{}
	for _, c := range connections {
		if c.SecretID.Valid {
			ids = append(ids, c.SecretID.Int64)
		}
	}
	out := map[int64]*userdb.PluginSecret{}
	if len(ids) == 0 {
		return out, nil
	}
	parts := make([]string, len(ids))
	for i := range ids {
		parts[i] = "?"
	}
	rows, err := db.Query(`SELECT id, owner_type, owner_id, kind, ciphertext, key_id, version,
		COALESCE(mask_hint,''), COALESCE(create_time,''), COALESCE(last_rotated_at,'')
		FROM plugin_secrets WHERE id IN (`+strings.Join(parts, ",")+`)`, ids...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var (
			s           userdb.PluginSecret
			maskHint    sql.NullString
			create      sql.NullString
			lastRotated sql.NullString
		)
		if err := rows.Scan(&s.ID, &s.OwnerType, &s.OwnerID, &s.Kind, &s.Ciphertext,
			&s.KeyID, &s.Version, &maskHint, &create, &lastRotated); err != nil {
			return nil, err
		}
		s.MaskHint = maskHint.String
		s.CreateTime = create.String
		s.LastRotatedAt = lastRotated.String
		out[s.ID] = &s
	}
	return out, rows.Err()
}

// ---- AdminPluginConnectionState ----

// AdminPluginConnectionStateHandler 对应 AdminPluginConnectionState（@js @is_admin）。
func AdminPluginConnectionStateHandler(cfg PluginConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		req, err := pluginBody(ctx)
		if err != nil {
			return pluginErrorOr(err), nil
		}
		enabled, ok := req["enabled"].(bool)
		if !ok {
			return pluginErrorOr(pluginruntime.NewPluginRuntimeError("plugin.request_invalid",
				"enabled must be a boolean", false)), nil
		}
		connectionID := pluginInt(ctx.Param(0), 0)
		connection, err := cfg.pluginRuntime(ctx).ConnectionByID(connectionID)
		if err != nil {
			return nil, err
		}
		if connection == nil || connection.OwnerType != "instance" {
			return pluginErrorOr(pluginruntime.NewPluginRuntimeError("plugin.connection_forbidden",
				"Plugin connection is not available", false)), nil
		}
		installation, err := pluginInstallationByID(ctx.DB, connection.InstallationID)
		if err != nil {
			return nil, err
		}
		if enabled && (installation == nil || !installation.Enabled) {
			return pluginErrorOr(pluginruntime.NewPluginRuntimeError("plugin.installation_disabled",
				"Enable the plugin installation first", false)), nil
		}
		if _, err := ctx.DB.Exec(`UPDATE plugin_connections SET enabled = ?, update_time = ?
			WHERE id = ?`, enabled, nowString(), connectionID); err != nil {
			return nil, err
		}
		connection.Enabled = enabled
		public, err := cfg.pluginRuntime(ctx).ConnectionPublicDict(connection)
		if err != nil {
			return pluginErrorOr(err), nil
		}
		return map[string]any{"err": "ok", "connection": public}, nil
	}
}

// ---- UserPlugins ----

// UserPluginsHandler 对应 UserPlugins（@js @auth）。
//
// 当前用户可配置的插件目录；不暴露其他用户的连接与运行内容。
func UserPluginsHandler(cfg PluginConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if _, err := pluginruntime.EnsureBuiltinInstallations(ctx.DB, ctx.Identity.UserID,
			cfg.Settings, cfg.pluginRegistry()); err != nil {
			return pluginErrorOr(err), nil
		}
		registered := cfg.pluginRegistry().SortedIDs()
		installations, err := pluginInstallationsFor(ctx.DB, registered)
		if err != nil {
			return nil, err
		}
		userConnections, err := pluginUserConnections(ctx.DB, ctx.Identity.UserID)
		if err != nil {
			return nil, err
		}
		byInstallation := map[int64][]*userdb.PluginConnection{}
		for _, c := range userConnections {
			byInstallation[c.InstallationID] = append(byInstallation[c.InstallationID], c)
		}
		latestRun, err := pluginLatestRunsByConnection(ctx.DB, userConnections)
		if err != nil {
			return nil, err
		}

		rt := cfg.pluginRuntime(ctx)
		plugins := []map[string]any{}
		for _, installation := range installations {
			definition, err := pluginDefinitionByID(ctx.DB, installation.DefinitionID)
			if err != nil {
				return nil, err
			}
			if definition == nil {
				continue
			}
			public := definition.ToPublic()
			if pluginBool(pluginDict(public["ui"])["hidden"]) ||
				!pluginContains(pluginStrList(public["connection_owners"]), "user") {
				continue
			}
			connections := byInstallation[installation.ID]
			var latest []*userdb.PluginRun
			for _, c := range connections {
				if run := latestRun[c.ID]; run != nil {
					latest = append(latest, run)
				}
			}
			public["installation"] = pluginInstallationSummary(installation)
			conns := make([]map[string]any, 0, len(connections))
			for _, c := range connections {
				dict, err := rt.ConnectionPublicDict(c)
				if err != nil {
					return pluginErrorOr(err), nil
				}
				conns = append(conns, dict)
			}
			public["connections"] = conns
			public["latest_run"] = pluginLatestRun(latest)
			plugins = append(plugins, public)
		}
		return map[string]any{"err": "ok", "plugins": plugins}, nil
	}
}

// pluginUserConnections 取某用户的全部连接（按 id 升序）。
func pluginUserConnections(db *sql.DB, userID int64) ([]*userdb.PluginConnection, error) {
	rows, err := db.Query(`SELECT `+pluginConnectionColumns+` FROM plugin_connections
		WHERE owner_type = 'user' AND owner_id = ? ORDER BY id`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*userdb.PluginConnection
	for rows.Next() {
		c, err := scanPluginConnectionRow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// pluginLatestRunsByConnection 取每条连接的最新一次 run。
func pluginLatestRunsByConnection(db *sql.DB, connections []*userdb.PluginConnection) (
	map[int64]*userdb.PluginRun, error) {
	out := map[int64]*userdb.PluginRun{}
	for _, c := range connections {
		runs, err := userdb.ListPluginRuns(db, c.ID, 1)
		if err != nil {
			return nil, err
		}
		if len(runs) > 0 {
			out[c.ID] = runs[0]
		}
	}
	return out, nil
}

// pluginLatestRun 取 id 最大的一次 run；为空返回 nil。
func pluginLatestRun(runs []*userdb.PluginRun) any {
	var best *userdb.PluginRun
	for _, run := range runs {
		if best == nil || run.ID > best.ID {
			best = run
		}
	}
	if best == nil {
		return nil
	}
	return best.ToPublic()
}

// ---- UserPluginConnections ----

// UserPluginConnectionsHandler 对应 UserPluginConnections（@js @auth）。
func UserPluginConnectionsHandler(cfg PluginConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if ctx.Request.Method == "GET" {
			connections, err := pluginUserConnections(ctx.DB, ctx.Identity.UserID)
			if err != nil {
				return nil, err
			}
			secrets, err := pluginSecretsByID(ctx.DB, connections)
			if err != nil {
				return nil, err
			}
			out := make([]map[string]any, 0, len(connections))
			for _, c := range connections {
				out = append(out, c.ToPublic(secrets[c.SecretID.Int64]))
			}
			return map[string]any{"err": "ok", "connections": out}, nil
		}

		req, err := pluginBody(ctx)
		if err != nil {
			return pluginErrorOr(err), nil
		}
		rawPluginKey, hasPluginKey := req["plugin_key"]
		rawInstallationID, hasInstallationID := req["installation_id"]

		var installationID int64
		var defaultName string
		if hasPluginKey && rawPluginKey != nil {
			pluginKey, isStr := rawPluginKey.(string)
			if !isStr || pluginKey == "" || (hasInstallationID && rawInstallationID != nil) {
				return pluginErrorOr(pluginruntime.NewPluginRuntimeError("plugin.request_invalid",
					"Provide either plugin_key or installation_id", false)), nil
			}
			manifest, installation, err := cfg.pluginActiveUserInstallation(ctx, pluginKey)
			if err != nil {
				return pluginErrorOr(err), nil
			}
			installationID = installation.ID
			defaultName = pluginStr(manifest.Raw["name"])
		} else {
			installationID = pluginInt(rawInstallationID, 0)
			installation, err := pluginInstallationByID(ctx.DB, installationID)
			if err != nil {
				return nil, err
			}
			if installation == nil || !installation.Enabled || installation.Status != "active" {
				return pluginErrorOr(pluginruntime.NewPluginRuntimeError("plugin.installation_missing",
					"Plugin installation is not active", false)), nil
			}
			definition, err := pluginDefinitionByID(ctx.DB, installation.DefinitionID)
			if err != nil {
				return nil, err
			}
			if definition != nil {
				defaultName = definition.Name
			}
		}

		name := pluginStr(req["name"])
		if name == "" {
			name = defaultName
		}
		role := pluginStr(req["role"])
		if role == "" {
			role = PluginDefaultConnectionRole
		}
		connection, err := cfg.pluginRuntime(ctx).SaveConnection(
			installationID, "user", ctx.Identity.UserID,
			pluginDict(req["credentials"]), name, pluginDict(req["config"]),
			pluginAnyList(req["scopes"]), pluginStr(req["schedule"]), role)
		if err != nil {
			return pluginErrorOr(err), nil
		}
		public, err := cfg.pluginRuntime(ctx).ConnectionPublicDict(connection)
		if err != nil {
			return pluginErrorOr(err), nil
		}
		return map[string]any{"err": "ok", "connection": public}, nil
	}
}

// pluginActiveUserInstallation 复刻 plugins._active_user_installation。
func (cfg PluginConfig) pluginActiveUserInstallation(ctx *Context, pluginKey string) (
	*pluginproto.PluginManifest, *userdb.PluginInstallation, error) {
	provider, err := cfg.pluginRegistry().Get(pluginKey)
	if err != nil {
		return nil, nil, err
	}
	manifest, err := pluginManifest(provider)
	if err != nil {
		return nil, nil, err
	}
	if !pluginContains(pluginStrList(manifest.Raw["connection_owners"]), "user") {
		return nil, nil, pluginruntime.NewPluginRuntimeError("plugin.owner_forbidden",
			"This plugin does not support user connections", false)
	}
	installation, err := userdb.GetPluginInstallationByKey(ctx.DB, pluginKey)
	if err != nil {
		return nil, nil, err
	}
	if installation == nil {
		installation, err = pluginruntime.InstallBuiltin(ctx.DB, pluginKey, ctx.Identity.UserID,
			nil, nil, true, cfg.pluginRegistry())
		if err != nil {
			return nil, nil, err
		}
	}
	if !installation.Enabled || installation.Status != "active" {
		return nil, nil, pluginruntime.NewPluginRuntimeError("plugin.installation_disabled",
			"Plugin installation is disabled", false)
	}
	return manifest, installation, nil
}

// ---- UserPluginState ----

// UserPluginStateHandler 对应 UserPluginState（@js @auth）。
func UserPluginStateHandler(cfg PluginConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		pluginKey := ctx.Param(0)
		provider, err := cfg.pluginRegistry().Get(pluginKey)
		if err != nil {
			return pluginErrorOr(err), nil
		}
		manifest, err := pluginManifest(provider)
		if err != nil {
			return pluginErrorOr(err), nil
		}
		installation, err := userdb.GetPluginInstallationByKey(ctx.DB, pluginKey)
		if err != nil {
			return nil, err
		}

		var connections []*userdb.PluginConnection
		var runs []*userdb.PluginRun
		if installation != nil {
			connections, err = pluginUserInstallationConnections(ctx.DB, installation.ID, ctx.Identity.UserID)
			if err != nil {
				return nil, err
			}
		}
		for _, c := range connections {
			items, err := userdb.ListPluginRuns(ctx.DB, c.ID, 100)
			if err != nil {
				return nil, err
			}
			runs = append(runs, items...)
		}
		sort.Slice(runs, func(i, j int) bool { return runs[i].ID > runs[j].ID })
		if len(runs) > 100 {
			runs = runs[:100]
		}

		rt := cfg.pluginRuntime(ctx)
		conns := make([]map[string]any, 0, len(connections))
		for _, c := range connections {
			dict, err := rt.ConnectionPublicDict(c)
			if err != nil {
				return pluginErrorOr(err), nil
			}
			conns = append(conns, dict)
		}
		runDicts := make([]map[string]any, 0, len(runs))
		for _, run := range runs {
			runDicts = append(runDicts, run.ToPublic())
		}

		var installationDict any
		if installation != nil {
			installationDict = pluginInstallationSummary(installation)
		}
		return map[string]any{
			"err":          "ok",
			"plugin":       pluginPublicManifest(manifest),
			"installation": installationDict,
			"connections":  conns,
			"runs":         runDicts,
		}, nil
	}
}

// pluginUserInstallationConnections 取某用户在某安装下的连接（按 id 升序）。
func pluginUserInstallationConnections(db *sql.DB, installationID, userID int64) (
	[]*userdb.PluginConnection, error) {
	rows, err := db.Query(`SELECT `+pluginConnectionColumns+` FROM plugin_connections
		WHERE installation_id = ? AND owner_type = 'user' AND owner_id = ? ORDER BY id`,
		installationID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*userdb.PluginConnection
	for rows.Next() {
		c, err := scanPluginConnectionRow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// ---- UserPluginFeature ----

// UserPluginFeatureHandler 对应 UserPluginFeature（@js @auth）。
//
// 插件自有、无法标准化的只读/写入动作的唯一逃生舱。
func UserPluginFeatureHandler(cfg PluginConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		pluginKey, action := ctx.Param(0), ctx.Param(1)
		req, err := pluginBody(ctx)
		if err != nil {
			return pluginErrorOr(err), nil
		}
		provider, err := cfg.pluginRegistry().Get(pluginKey)
		if err != nil {
			return pluginErrorOr(err), nil
		}
		manifest, err := pluginManifest(provider)
		if err != nil {
			return pluginErrorOr(err), nil
		}
		feature := pluginDict(pluginDict(manifest.Raw["extra_features"])[action])
		if len(feature) == 0 {
			return pluginErrorOr(pluginruntime.NewPluginRuntimeError("plugin.feature_not_supported",
				"Plugin feature is not supported", false)), nil
		}
		dispatcher, ok := provider.(pluginiface.ExtraFeatureProvider)
		if !ok {
			return pluginErrorOr(pluginruntime.NewPluginRuntimeError("plugin.feature_not_supported",
				"Plugin feature is not supported", false)), nil
		}

		params := pluginDict(req["params"])
		if v, present := req["params"]; present && v != nil {
			if _, isMap := v.(map[string]any); !isMap {
				return pluginErrorOr(pluginruntime.NewPluginRuntimeError("plugin.request_invalid",
					"Feature params must be an object", false)), nil
			}
		}
		if err := pluginproto.ValidateAgainstSchema(feature["schema"], params, "feature"); err != nil {
			return pluginErrorOr(pluginruntime.NewPluginRuntimeError(
				pluginManifestErrorCode(err, "plugin.request_invalid"), err.Error(), false)), nil
		}

		_, installation, err := cfg.pluginActiveUserInstallation(ctx, pluginKey)
		if err != nil {
			return pluginErrorOr(err), nil
		}

		var connection *userdb.PluginConnection
		if raw, present := req["credentials"]; present && raw != nil {
			credentials, isMap := raw.(map[string]any)
			if !isMap {
				return pluginErrorOr(pluginruntime.NewPluginRuntimeError("plugin.credentials_invalid",
					"credentials must be an object", false)), nil
			}
			connection, err = cfg.pluginRuntime(ctx).SaveConnection(
				installation.ID, "user", ctx.Identity.UserID, credentials,
				pluginStr(manifest.Raw["name"]), nil, nil, "", PluginDefaultConnectionRole)
			if err != nil {
				return pluginErrorOr(err), nil
			}
		} else {
			connection, err = pluginUserRoleConnection(ctx.DB, installation.ID,
				ctx.Identity.UserID, PluginDefaultConnectionRole)
			if err != nil {
				return nil, err
			}
		}
		if connection == nil || !connection.Enabled {
			return pluginErrorOr(pluginruntime.NewPluginRuntimeError("plugin.connection_missing",
				"Plugin connection is not enabled", false)), nil
		}

		// feature["mode"] 决定走 read / write / sync 哪条派发路径。
		mode := pluginStr(feature["mode"])
		opts := pluginruntime.CallOptions{
			RequiredScopes: pluginStrList(feature["required_scopes"]),
		}
		args := []any{action, params}
		rt := cfg.pluginRuntime(ctx)
		var data any
		switch mode {
		case "read":
			data, err = rt.Read(connection, "execute_feature", args, opts)
		case "write":
			data, err = rt.Write(connection, "execute_feature", args, opts)
		case "sync":
			data, err = rt.Sync(connection, "execute_feature", args, opts)
		default:
			_ = dispatcher
			return pluginErrorOr(pluginruntime.NewPluginRuntimeError("plugin.feature_not_supported",
				"Plugin feature mode is not supported", false)), nil
		}
		if err != nil {
			return pluginErrorOr(err), nil
		}
		public, err := rt.ConnectionPublicDict(connection)
		if err != nil {
			return pluginErrorOr(err), nil
		}
		return map[string]any{"err": "ok", "connection": public, "data": data}, nil
	}
}

// pluginManifestErrorCode 取 ManifestError 的 code；无则返回 fallback。
func pluginManifestErrorCode(err error, fallback string) string {
	var me *pluginproto.ManifestError
	if errors.As(err, &me) && me.Code != "" {
		return me.Code
	}
	return fallback
}

// pluginUserRoleConnection 取某用户在某安装下指定角色的连接。
func pluginUserRoleConnection(db *sql.DB, installationID, userID int64, role string) (
	*userdb.PluginConnection, error) {
	row := db.QueryRow(`SELECT `+pluginConnectionColumns+` FROM plugin_connections
		WHERE installation_id = ? AND owner_type = 'user' AND owner_id = ? AND role = ? LIMIT 1`,
		installationID, userID, role)
	return scanPluginConnectionRow(row)
}

// ---- 能力测试（admin） ----

// AdminPluginMetadataSearchHandler 对应 AdminPluginMetadataSearch（@js @is_admin）。
func AdminPluginMetadataSearchHandler(cfg PluginConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		query, err := pluginBookQuery(ctx)
		if err != nil {
			return pluginErrorOr(err), nil
		}
		rt, connection, err := cfg.pluginCapabilityConnection(ctx, ctx.Param(0), "metadata.lookup")
		if err != nil {
			return pluginErrorOr(err), nil
		}
		requestedBy := ctx.Identity.UserID
		records, err := rt.Read(connection, "search_books", []any{query}, pluginruntime.CallOptions{
			RequiredScopes: []string{"books.read"},
			RequestedBy:    &requestedBy,
		})
		if err != nil {
			return pluginErrorOr(err), nil
		}
		items := pluginLimit(pluginRecords(pluginBooksOf(records)))
		out := make([]map[string]any, 0, len(items))
		for _, record := range items {
			out = append(out, pluginMetadataSummary(record))
		}
		return map[string]any{"err": "ok", "capability": "metadata.lookup", "items": out}, nil
	}
}

// pluginBooksOf 复刻 `getattr(records, "books", records)`。
func pluginBooksOf(records any) any {
	if v, ok := records.(interface{ Books() any }); ok {
		if books := v.Books(); books != nil {
			return books
		}
	}
	return records
}

// AdminPluginSourceSearchHandler 对应 AdminPluginSourceSearch（@js @is_admin）。
func AdminPluginSourceSearchHandler(cfg PluginConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		req, err := pluginBody(ctx)
		if err != nil {
			return pluginErrorOr(err), nil
		}
		query, isStr := req["query"].(string)
		if !isStr || strings.TrimSpace(query) == "" {
			return pluginErrorOr(pluginruntime.NewPluginRuntimeError("plugin.request_invalid",
				"query must be a non-empty string", false)), nil
		}
		rt, connection, err := cfg.pluginCapabilityConnection(ctx, ctx.Param(0), "sources.search")
		if err != nil {
			return pluginErrorOr(err), nil
		}
		requestedBy := ctx.Identity.UserID
		page, err := rt.Read(connection, "search",
			[]any{pluginTruncate(strings.TrimSpace(query), 300), map[string]any{}},
			pluginruntime.CallOptions{
				RequiredScopes: []string{"books.read"},
				RequestedBy:    &requestedBy,
			})
		if err != nil {
			return pluginErrorOr(err), nil
		}
		return pluginCapabilityPageResult("sources.search", page, pluginSourceSummary), nil
	}
}

// AdminPluginReviewLookupHandler 对应 AdminPluginReviewLookup（@js @is_admin）。
func AdminPluginReviewLookupHandler(cfg PluginConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		query, err := pluginBookQuery(ctx)
		if err != nil {
			return pluginErrorOr(err), nil
		}
		rt, connection, err := cfg.pluginCapabilityConnection(ctx, ctx.Param(0), "reviews.lookup")
		if err != nil {
			return pluginErrorOr(err), nil
		}
		requestedBy := ctx.Identity.UserID
		page, err := rt.Read(connection, "get_reviews", []any{query}, pluginruntime.CallOptions{
			RequiredScopes: []string{"books.read"},
			RequestedBy:    &requestedBy,
		})
		if err != nil {
			return pluginErrorOr(err), nil
		}
		return pluginCapabilityPageResult("reviews.lookup", page, pluginReviewSummary), nil
	}
}

// pluginCapabilityPageResult 把分页结果组装成能力测试响应。
func pluginCapabilityPageResult(capability string, page any,
	summary func(map[string]any) map[string]any) map[string]any {
	items, failures, hasMore, healthMessage := pluginPageParts(page)
	itemOut := make([]map[string]any, 0, len(items))
	for _, record := range pluginLimit(items) {
		itemOut = append(itemOut, summary(record))
	}
	failureOut := make([]map[string]any, 0, len(failures))
	for _, failure := range pluginLimit(failures) {
		failureOut = append(failureOut, pluginFailureSummary(failure))
	}
	return map[string]any{
		"err":            "ok",
		"capability":     capability,
		"items":          itemOut,
		"failures":       failureOut,
		"has_more":       hasMore,
		"health_message": healthMessage,
	}
}

// ---- 动作与运行历史 ----

// AdminPluginActionHandler 对应 AdminPluginAction（@js @is_admin）。
func AdminPluginActionHandler(cfg PluginConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		connectionID := pluginInt(ctx.Param(0), 0)
		action := ctx.Param(1)
		connection, err := cfg.pluginRuntime(ctx).ConnectionByID(connectionID)
		if err != nil {
			return nil, err
		}
		if connection == nil || connection.OwnerType != "instance" {
			return pluginErrorOr(pluginruntime.NewPluginRuntimeError("plugin.connection_forbidden",
				"Plugin connection is not available", false)), nil
		}
		return cfg.pluginPrepareAndExecute(ctx, connection, action)
	}
}

// UserPluginActionHandler 对应 UserPluginAction（@js @auth）。
func UserPluginActionHandler(cfg PluginConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		connectionID := pluginInt(ctx.Param(0), 0)
		action := ctx.Param(1)
		connection, err := cfg.pluginRuntime(ctx).ConnectionByID(connectionID)
		if err != nil {
			return nil, err
		}
		if connection == nil || connection.OwnerType != "user" ||
			connection.OwnerID != ctx.Identity.UserID {
			return pluginErrorOr(pluginruntime.NewPluginRuntimeError("plugin.connection_forbidden",
				"Plugin connection is not available", false)), nil
		}
		return cfg.pluginPrepareAndExecute(ctx, connection, action)
	}
}

// pluginPrepareAndExecute 复刻 `_prepare_action_run` + `execute_plugin_run`。
func (cfg PluginConfig) pluginPrepareAndExecute(ctx *Context, connection *userdb.PluginConnection,
	action string) (map[string]any, error) {
	run, err := cfg.pluginPrepareActionRun(ctx, connection, action)
	if err != nil {
		return pluginErrorOr(err), nil
	}
	if cfg.ExecuteRun == nil {
		return pluginErrorOr(pluginruntime.NewPluginRuntimeError("plugin.not_wired",
			"Plugin run executor is not available", false)), nil
	}
	if err := cfg.ExecuteRun(ctx, run.ID); err != nil {
		return pluginErrorOr(err), nil
	}
	refreshed, err := pluginRunByID(ctx.DB, run.ID)
	if err != nil {
		return nil, err
	}
	if refreshed == nil {
		refreshed = run
	}
	return map[string]any{"err": "ok", "run": refreshed.ToPublic()}, nil
}

// pluginPrepareActionRun 复刻 `_prepare_action_run`。
//
// 先校验 run，再把匹配确认与 run 创建作为一个事务提交。
func (cfg PluginConfig) pluginPrepareActionRun(ctx *Context, connection *userdb.PluginConnection,
	action string) (*userdb.PluginRun, error) {
	req, inputData, matchConfirmations, err := cfg.pluginInputData(ctx, connection)
	if err != nil {
		return nil, err
	}
	trigger := pluginStr(req["trigger"])
	if trigger == "" {
		trigger = "manual"
	}
	var parentRunID *int64
	if v, present := req["parent_run_id"]; present && v != nil {
		id := pluginInt(v, 0)
		parentRunID = &id
	}
	requestedBy := ctx.Identity.UserID
	run, err := cfg.pluginRuntime(ctx).PrepareRun(connection.ID, action, requestedBy,
		trigger, parentRunID, inputData, pluginServerOwnedInputKeys)
	if err != nil {
		return nil, err
	}
	for _, mc := range matchConfirmations {
		if cfg.ConfirmMatch == nil {
			continue
		}
		if err := cfg.ConfirmMatch(ctx, connection.ID, mc.sourceBookID, mc.bookID, mc.allowedBookIDs); err != nil {
			return nil, pluginruntime.NewPluginRuntimeError("plugin.match_book_forbidden", err.Error(), false)
		}
	}
	return run, nil
}

// pluginMatchConfirmation 是一次待确认的来源书籍匹配。
type pluginMatchConfirmation struct {
	sourceBookID   string
	bookID         int64
	allowedBookIDs []int64
}

// pluginInputData 复刻 `_plugin_input_data`。
//
// 客户端参数经过滤后，与服务端计算的受控字段合并。
func (cfg PluginConfig) pluginInputData(ctx *Context, connection *userdb.PluginConnection) (
	map[string]any, map[string]any, []pluginMatchConfirmation, error) {
	req, err := pluginBody(ctx)
	if err != nil {
		return nil, nil, nil, err
	}
	supplied := map[string]any{}
	if v, present := req["input_data"]; present && v != nil {
		obj, isMap := v.(map[string]any)
		if !isMap {
			return nil, nil, nil, pluginruntime.NewPluginRuntimeError("plugin.request_invalid",
				"input_data must be an object", false)
		}
		supplied = obj
	}

	inputData := map[string]any{}
	for key, value := range supplied {
		if !pluginServerOwnedInputKeys[key] {
			inputData[key] = value
		}
	}

	installation, err := pluginInstallationByID(ctx.DB, connection.InstallationID)
	if err != nil {
		return nil, nil, nil, err
	}
	var definition *userdb.PluginDefinition
	if installation != nil {
		definition, err = pluginDefinitionByID(ctx.DB, installation.DefinitionID)
		if err != nil {
			return nil, nil, nil, err
		}
	}
	capabilities := map[string]bool{}
	if definition != nil {
		for _, c := range definition.Capabilities {
			capabilities[pluginStr(c)] = true
		}
	}

	var confirmations []pluginMatchConfirmation
	bookScoped := false
	for capability := range pluginBookScopedCapabilities {
		if capabilities[capability] {
			bookScoped = true
			break
		}
	}
	if bookScoped {
		allowed, err := cfg.pluginAllowedBookIDs(ctx)
		if err != nil {
			return nil, nil, nil, err
		}
		inputData["allowed_book_ids"] = allowed
		matches := map[string]any{}
		if v, present := supplied["matches"]; present && v != nil {
			obj, isMap := v.(map[string]any)
			if !isMap {
				return nil, nil, nil, pluginruntime.NewPluginRuntimeError("plugin.request_invalid",
					"matches must be an object", false)
			}
			matches = obj
		}
		for sourceBookID, bookID := range matches {
			confirmations = append(confirmations, pluginMatchConfirmation{
				sourceBookID:   sourceBookID,
				bookID:         pluginInt(bookID, 0),
				allowedBookIDs: allowed,
			})
		}
	}
	return req, inputData, confirmations, nil
}

// pluginAllowedBookIDs 复刻 `[id for id in all_book_ids(db) if get_book(id) is not None]`。
func (cfg PluginConfig) pluginAllowedBookIDs(ctx *Context) ([]int64, error) {
	if cfg.AllBookIDs == nil {
		return []int64{}, nil
	}
	ids, err := cfg.AllBookIDs(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]int64, 0, len(ids))
	for _, id := range ids {
		if cfg.CanViewBook == nil {
			out = append(out, id)
			continue
		}
		ok, err := cfg.CanViewBook(ctx, id)
		if err != nil {
			return nil, err
		}
		if ok {
			out = append(out, id)
		}
	}
	return out, nil
}

// pluginRunByID 按 id 取 run；不存在返回 nil。
func pluginRunByID(db *sql.DB, id int64) (*userdb.PluginRun, error) {
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

// AdminPluginRunsHandler 对应 AdminPluginRuns（@js @is_admin）。
func AdminPluginRunsHandler(cfg PluginConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		rawConnectionID := ctx.Query("connection_id")
		var connectionID *int64
		if rawConnectionID != "" {
			id, err := strconv.ParseInt(strings.TrimSpace(rawConnectionID), 10, 64)
			if err != nil {
				return map[string]any{"err": "plugin.request_invalid",
					"msg": "connection_id must be an integer"}, nil
			}
			connectionID = &id
		}
		includeItems := ctx.Query("include_items") == "true"
		return pluginRunsResponse(ctx, "instance", 0, connectionID, includeItems)
	}
}

// UserPluginRunsHandler 对应 UserPluginRuns（@js @auth）。
func UserPluginRunsHandler(cfg PluginConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		return pluginRunsResponse(ctx, "user", ctx.Identity.UserID, nil, false)
	}
}

// pluginRunsResponse 组装运行历史列表。
//
// ownerType 为 "instance" 时忽略 ownerID；为 "user" 时按 ownerID 过滤。
func pluginRunsResponse(ctx *Context, ownerType string, ownerID int64,
	connectionID *int64, includeItems bool) (map[string]any, error) {
	query := `SELECT r.id FROM plugin_runs r
		JOIN plugin_connections c ON c.id = r.connection_id
		WHERE c.owner_type = ?`
	args := []any{ownerType}
	if ownerType == "user" {
		query += ` AND c.owner_id = ?`
		args = append(args, ownerID)
	}
	if connectionID != nil {
		query += ` AND r.connection_id = ?`
		args = append(args, *connectionID)
	}
	query += ` ORDER BY r.id DESC LIMIT 100`

	rows, err := ctx.DB.Query(query, args...)
	if err != nil {
		return nil, err
	}
	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return nil, err
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, err
	}
	rows.Close()

	data := make([]map[string]any, 0, len(ids))
	for _, id := range ids {
		run, err := pluginRunByID(ctx.DB, id)
		if err != nil {
			return nil, err
		}
		if run == nil {
			continue
		}
		value := run.ToPublic()
		if includeItems {
			items, err := pluginRunItems(ctx.DB, run.ID, false)
			if err != nil {
				return nil, err
			}
			value["items"] = items
		}
		data = append(data, value)
	}
	return map[string]any{"err": "ok", "runs": data}, nil
}

// pluginRunItems 取一次 run 的条目（按 id 升序）。
func pluginRunItems(db *sql.DB, runID int64, includeData bool) ([]map[string]any, error) {
	rows, err := db.Query(`SELECT id, run_id, external_id, entity_type, status,
		COALESCE(operation,''), COALESCE(error_code,''), COALESCE(error_message,''),
		COALESCE(payload_hash,''), COALESCE(data,''), COALESCE(create_time,'')
		FROM plugin_run_items WHERE run_id = ? ORDER BY id`, runID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var (
			item       userdb.PluginRunItem
			operation  sql.NullString
			errorCode  sql.NullString
			errorMsg   sql.NullString
			payload    sql.NullString
			data       sql.NullString
			createTime sql.NullString
		)
		if err := rows.Scan(&item.ID, &item.RunID, &item.ExternalID, &item.EntityType,
			&item.Status, &operation, &errorCode, &errorMsg, &payload, &data, &createTime); err != nil {
			return nil, err
		}
		item.Operation = operation.String
		item.ErrorCode = errorCode.String
		item.ErrorMessage = errorMsg.String
		item.PayloadHash = payload.String
		item.Data = decodeJSONMapOrEmpty(data.String)
		item.CreateTime = createTime.String
		out = append(out, item.ToPublic(includeData))
	}
	return out, rows.Err()
}

// AdminPluginRunDetailHandler 对应 AdminPluginRunDetail（@js @is_admin）。
func AdminPluginRunDetailHandler(cfg PluginConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		return pluginRunDetail(ctx, "instance", 0)
	}
}

// UserPluginRunDetailHandler 对应 UserPluginRunDetail（@js @auth）。
func UserPluginRunDetailHandler(cfg PluginConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		return pluginRunDetail(ctx, "user", ctx.Identity.UserID)
	}
}

// pluginRunDetail 组装单次 run 的详情；归属不符时返回 run_missing。
func pluginRunDetail(ctx *Context, ownerType string, ownerID int64) (map[string]any, error) {
	runID, err := strconv.ParseInt(strings.TrimSpace(ctx.Param(0)), 10, 64)
	if err != nil {
		return map[string]any{"err": "plugin.run_missing", "msg": "Plugin run was not found"}, nil
	}
	run, err := pluginRunByID(ctx.DB, runID)
	if err != nil {
		return nil, err
	}
	if run == nil {
		return map[string]any{"err": "plugin.run_missing", "msg": "Plugin run was not found"}, nil
	}
	connection, err := pluginConnectionByID(ctx.DB, run.ConnectionID)
	if err != nil {
		return nil, err
	}
	if connection == nil || connection.OwnerType != ownerType ||
		(ownerType == "user" && connection.OwnerID != ownerID) {
		return map[string]any{"err": "plugin.run_missing", "msg": "Plugin run was not found"}, nil
	}
	items, err := pluginRunItems(ctx.DB, run.ID, true)
	if err != nil {
		return nil, err
	}
	return map[string]any{"err": "ok", "run": run.ToPublic(), "items": items}, nil
}

// pluginConnectionByID 按 id 取连接；不存在返回 nil。
func pluginConnectionByID(db *sql.DB, id int64) (*userdb.PluginConnection, error) {
	row := db.QueryRow(`SELECT `+pluginConnectionColumns+` FROM plugin_connections WHERE id = ?`, id)
	return scanPluginConnectionRow(row)
}

// PluginRouteSpecs 返回插件管理模块接管的 20 条路由。
func PluginRouteSpecs(cfg PluginConfig) []RouteSpec {
	admin := []string{http.MethodGet, http.MethodPost}
	user := []string{http.MethodGet, http.MethodPost}
	return []RouteSpec{
		{Pattern: "/api/admin/plugins", Methods: admin, Auth: true, Admin: true, Handler: AdminPluginsHandler(cfg)},
		{Pattern: "/api/admin/plugins/install", Methods: admin, Auth: true, Admin: true, Handler: AdminPluginInstallHandler(cfg)},
		{Pattern: "/api/admin/plugins/opds-service", Methods: admin, Auth: true, Admin: true, Handler: AdminPluginOpdsServiceHandler(cfg)},
		{Pattern: "/api/admin/plugins/preferences", Methods: admin, Auth: true, Admin: true, Handler: AdminPluginPreferencesHandler(cfg)},
		{Pattern: "/api/admin/plugins/([a-z0-9.-]+)/metadata/search", Methods: admin, Auth: true, Admin: true, Handler: AdminPluginMetadataSearchHandler(cfg)},
		{Pattern: "/api/admin/plugins/([a-z0-9.-]+)/source/search", Methods: admin, Auth: true, Admin: true, Handler: AdminPluginSourceSearchHandler(cfg)},
		{Pattern: "/api/admin/plugins/([a-z0-9.-]+)/reviews/lookup", Methods: admin, Auth: true, Admin: true, Handler: AdminPluginReviewLookupHandler(cfg)},
		{Pattern: "/api/admin/plugins/installations/([0-9]+)/state", Methods: admin, Auth: true, Admin: true, Handler: AdminPluginInstallationStateHandler(cfg)},
		{Pattern: "/api/admin/plugins/connections", Methods: admin, Auth: true, Admin: true, Handler: AdminPluginConnectionsHandler(cfg)},
		{Pattern: "/api/admin/plugins/connections/([0-9]+)/state", Methods: admin, Auth: true, Admin: true, Handler: AdminPluginConnectionStateHandler(cfg)},
		{Pattern: "/api/admin/plugins/connections/([0-9]+)/(test|preview|run|retry|rollback)", Methods: admin, Auth: true, Admin: true, Handler: AdminPluginActionHandler(cfg)},
		{Pattern: "/api/admin/plugins/runs", Methods: admin, Auth: true, Admin: true, Handler: AdminPluginRunsHandler(cfg)},
		{Pattern: "/api/admin/plugins/runs/([0-9]+)", Methods: admin, Auth: true, Admin: true, Handler: AdminPluginRunDetailHandler(cfg)},
		{Pattern: "/api/plugins", Methods: user, Auth: true, Handler: UserPluginsHandler(cfg)},
		{Pattern: "/api/plugins/connections", Methods: user, Auth: true, Handler: UserPluginConnectionsHandler(cfg)},
		{Pattern: "/api/plugins/([a-z0-9.-]+)/features/([a-z0-9_]+)", Methods: user, Auth: true, Handler: UserPluginFeatureHandler(cfg)},
		{Pattern: "/api/plugins/connections/([0-9]+)/(test|preview|run|retry|rollback)", Methods: user, Auth: true, Handler: UserPluginActionHandler(cfg)},
		{Pattern: "/api/plugins/runs", Methods: user, Auth: true, Handler: UserPluginRunsHandler(cfg)},
		{Pattern: "/api/plugins/runs/([0-9]+)", Methods: user, Auth: true, Handler: UserPluginRunDetailHandler(cfg)},
		{Pattern: "/api/plugins/([a-z0-9.-]+)", Methods: user, Auth: true, Handler: UserPluginStateHandler(cfg)},
	}
}
