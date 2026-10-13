// 本文件复刻 webserver/models.py 中与「插件体系」相关的模型。
package userdb

import (
	"database/sql"
	"encoding/json"
	"fmt"
)

// PluginDefinition 对应 models.py 的 PluginDefinition 模型（plugin_definitions 表）。
type PluginDefinition struct {
	ID              int64          `json:"id"`
	PluginKey       string         `json:"plugin_key"`
	Version         string         `json:"version"`
	ProtocolVersion string         `json:"protocol_version"`
	Name            string         `json:"name"`
	RuntimeKind     string         `json:"runtime_kind"`
	Categories      []any          `json:"categories"`
	Capabilities    []any          `json:"capabilities"`
	Actions         []any          `json:"actions"`
	AuthSchema      map[string]any `json:"auth_schema"`
	ConfigSchema    map[string]any `json:"config_schema"`
	Permissions     []any          `json:"permissions"`
	DataPolicy      map[string]any `json:"data_policy"`
	Compatibility   map[string]any `json:"compatibility"`
	Homepage        string         `json:"homepage"`
	License         string         `json:"license"`
	Manifest        map[string]any `json:"-"`
	CreateTime      string         `json:"-"`
}

// ToPublic 复刻 Python 的 PluginDefinition.to_public_dict()。
func (d *PluginDefinition) ToPublic() map[string]any {
	if d == nil {
		return map[string]any{}
	}
	description := ""
	if v, ok := d.Manifest["description"].(string); ok {
		description = v
	}
	ui := map[string]any{}
	if v, ok := d.Manifest["ui"].(map[string]any); ok {
		ui = v
	}
	owners := []any{}
	if v, ok := d.Manifest["connection_owners"].([]any); ok {
		owners = v
	}
	return map[string]any{
		"id":                d.ID,
		"plugin_key":        d.PluginKey,
		"version":           d.Version,
		"protocol_version":  d.ProtocolVersion,
		"name":              d.Name,
		"runtime_kind":      d.RuntimeKind,
		"categories":        d.Categories,
		"capabilities":      d.Capabilities,
		"actions":           d.Actions,
		"auth_schema":       d.AuthSchema,
		"config_schema":     d.ConfigSchema,
		"permissions":       d.Permissions,
		"data_policy":       d.DataPolicy,
		"compatibility":     d.Compatibility,
		"homepage":          d.Homepage,
		"license":           d.License,
		"description":       description,
		"ui":                ui,
		"connection_owners": owners,
	}
}

// PluginInstallation 对应 models.py 的 PluginInstallation 模型（plugin_installations 表）。
type PluginInstallation struct {
	ID            int64          `json:"id"`
	PluginKey     string         `json:"plugin_key"`
	DefinitionID  int64          `json:"definition_id"`
	Version       string         `json:"version"`
	Enabled       bool           `json:"enabled"`
	Scope         string         `json:"scope"`
	Config        map[string]any `json:"config"`
	InstalledFrom string         `json:"installed_from"`
	Checksum      string         `json:"checksum"`
	Status        string         `json:"status"`
	InstalledBy   int64          `json:"installed_by"`
	CreateTime    string         `json:"-"`
	UpdateTime    string         `json:"-"`
}

// ToPublic 复刻 Python 的 PluginInstallation.to_public_dict()。
// definition 为 nil 时不带 definition 字段。
func (i *PluginInstallation) ToPublic(definition *PluginDefinition) map[string]any {
	if i == nil {
		return map[string]any{}
	}
	out := map[string]any{
		"id":             i.ID,
		"plugin_key":     i.PluginKey,
		"version":        i.Version,
		"enabled":        i.Enabled,
		"scope":          i.Scope,
		"config":         i.Config,
		"installed_from": i.InstalledFrom,
		"checksum":       i.Checksum,
		"status":         i.Status,
	}
	if definition != nil {
		out["definition"] = definition.ToPublic()
	}
	return out
}

// PluginSecret 对应 models.py 的 PluginSecret 模型（plugin_secrets 表）。
type PluginSecret struct {
	ID            int64  `json:"id"`
	OwnerType     string `json:"owner_type"`
	OwnerID       int64  `json:"owner_id"`
	Kind          string `json:"kind"`
	Ciphertext    string `json:"-"`
	KeyID         string `json:"-"`
	Version       int64  `json:"version"`
	MaskHint      string `json:"-"`
	CreateTime    string `json:"-"`
	LastRotatedAt string `json:"last_rotated_at"`
}

// ToPublic 复刻 Python 的 PluginSecret.to_public_dict()：刻意不返回密文。
func (s *PluginSecret) ToPublic() map[string]any {
	if s == nil {
		return map[string]any{"configured": false, "mask": ""}
	}
	return map[string]any{
		"configured":      s.Ciphertext != "",
		"kind":            s.Kind,
		"mask":            "••••" + s.MaskHint,
		"version":         s.Version,
		"last_rotated_at": s.LastRotatedAt,
	}
}

// PluginConnection 对应 models.py 的 PluginConnection 模型（plugin_connections 表）。
type PluginConnection struct {
	ID             int64          `json:"id"`
	InstallationID int64          `json:"installation_id"`
	OwnerType      string         `json:"owner_type"`
	OwnerID        int64          `json:"owner_id"`
	Role           string         `json:"role"`
	Name           string         `json:"name"`
	SecretID       sql.NullInt64  `json:"-"`
	Config         map[string]any `json:"config"`
	Scopes         []any          `json:"scopes"`
	Schedule       string         `json:"schedule"`
	Cursor         map[string]any `json:"cursor"`
	Health         string         `json:"health"`
	HealthMessage  string         `json:"health_message"`
	Enabled        bool           `json:"enabled"`
	LeaseToken     string         `json:"-"`
	LeaseUntil     string         `json:"-"`
	CreateTime     string         `json:"-"`
	UpdateTime     string         `json:"-"`
}

// ToPublic 复刻 Python 的 PluginConnection.to_public_dict()。
func (c *PluginConnection) ToPublic(secret *PluginSecret) map[string]any {
	if c == nil {
		return map[string]any{}
	}
	role := c.Role
	if role == "" {
		role = "default"
	}
	return map[string]any{
		"id":              c.ID,
		"installation_id": c.InstallationID,
		"owner_type":      c.OwnerType,
		"owner_id":        c.OwnerID,
		"role":            role,
		"name":            c.Name,
		"config":          c.Config,
		"scopes":          c.Scopes,
		"schedule":        c.Schedule,
		"cursor":          c.Cursor,
		"health":          c.Health,
		"health_message":  c.HealthMessage,
		"enabled":         c.Enabled,
		"secret":          secret.ToPublic(),
	}
}

// PluginRun 对应 models.py 的 PluginRun 模型（plugin_runs 表）。
type PluginRun struct {
	ID           int64          `json:"id"`
	ConnectionID int64          `json:"connection_id"`
	ParentRunID  sql.NullInt64  `json:"parent_run_id"`
	Action       string         `json:"action"`
	Trigger      string         `json:"trigger"`
	Status       string         `json:"status"`
	RequestedBy  int64          `json:"requested_by"`
	Counts       map[string]any `json:"counts"`
	CursorBefore map[string]any `json:"cursor_before"`
	CursorAfter  map[string]any `json:"cursor_after"`
	InputData    map[string]any `json:"-"`
	ErrorCode    string         `json:"error_code"`
	ErrorMessage string         `json:"error_message"`
	Attempt      int64          `json:"attempt"`
	DurationMS   int64          `json:"duration_ms"`
	CreateTime   string         `json:"created_at"`
	StartedAt    string         `json:"started_at"`
	FinishedAt   string         `json:"finished_at"`
}

// ToPublic 复刻 Python 的 PluginRun.to_public_dict()：刻意不含 input_data。
func (r *PluginRun) ToPublic() map[string]any {
	if r == nil {
		return map[string]any{}
	}
	return map[string]any{
		"id":            r.ID,
		"connection_id": r.ConnectionID,
		"parent_run_id": r.ParentRunID,
		"action":        r.Action,
		"trigger":       r.Trigger,
		"status":        r.Status,
		"requested_by":  r.RequestedBy,
		"counts":        r.Counts,
		"cursor_before": r.CursorBefore,
		"cursor_after":  r.CursorAfter,
		"error_code":    r.ErrorCode,
		"error_message": r.ErrorMessage,
		"attempt":       r.Attempt,
		"duration_ms":   r.DurationMS,
		"created_at":    r.CreateTime,
		"started_at":    r.StartedAt,
		"finished_at":   r.FinishedAt,
	}
}

// PluginRunItem 对应 models.py 的 PluginRunItem 模型（plugin_run_items 表）。
type PluginRunItem struct {
	ID           int64          `json:"id"`
	RunID        int64          `json:"run_id"`
	ExternalID   string         `json:"external_id"`
	EntityType   string         `json:"entity_type"`
	Status       string         `json:"status"`
	Operation    string         `json:"operation"`
	ErrorCode    string         `json:"error_code"`
	ErrorMessage string         `json:"error_message"`
	PayloadHash  string         `json:"payload_hash"`
	Data         map[string]any `json:"-"`
	CreateTime   string         `json:"-"`
}

// ToPublic 复刻 Python 的 PluginRunItem.to_public_dict(include_data)。
func (i *PluginRunItem) ToPublic(includeData bool) map[string]any {
	if i == nil {
		return map[string]any{}
	}
	out := map[string]any{
		"id":            i.ID,
		"run_id":        i.RunID,
		"external_id":   i.ExternalID,
		"entity_type":   i.EntityType,
		"status":        i.Status,
		"operation":     i.Operation,
		"error_code":    i.ErrorCode,
		"error_message": i.ErrorMessage,
		"payload_hash":  i.PayloadHash,
	}
	if includeData {
		out["data"] = i.Data
	}
	return out
}

// PluginEntityMatch 对应 models.py 的 PluginEntityMatch 模型（plugin_entity_matches 表）。
type PluginEntityMatch struct {
	ID           int64         `json:"id"`
	ConnectionID int64         `json:"connection_id"`
	SourceType   string        `json:"source_type"`
	ExternalID   string        `json:"external_id"`
	BookID       int64         `json:"book_id"`
	Method       string        `json:"method"`
	Confidence   float64       `json:"confidence"`
	Status       string        `json:"status"`
	ConfirmedBy  sql.NullInt64 `json:"confirmed_by"`
	CreateTime   string        `json:"create_time"`
	UpdateTime   string        `json:"update_time"`
}

// PluginSourceRecord 对应 models.py 的 PluginSourceRecord 模型（plugin_source_records 表）。
type PluginSourceRecord struct {
	ID              int64          `json:"id"`
	ConnectionID    int64          `json:"connection_id"`
	Source          string         `json:"source"`
	ExternalID      string         `json:"external_id"`
	EntityType      string         `json:"entity_type"`
	EntityID        string         `json:"entity_id"`
	RunID           int64          `json:"run_id"`
	RawHash         string         `json:"raw_hash"`
	RemoteUpdatedAt string         `json:"remote_updated_at"`
	LocalModified   bool           `json:"local_modified"`
	Status          string         `json:"status"`
	Data            map[string]any `json:"data"`
	CreateTime      string         `json:"create_time"`
	UpdateTime      string         `json:"update_time"`
	RolledBackAt    string         `json:"rolled_back_at"`
}

// PluginPermission 对应 models.py 的 PluginPermission 模型（plugin_permissions 表）。
type PluginPermission struct {
	ID             int64  `json:"id"`
	InstallationID int64  `json:"installation_id"`
	Permission     string `json:"permission"`
	Scope          string `json:"scope"`
	ApprovedBy     int64  `json:"approved_by"`
	ApprovedAt     string `json:"approved_at"`
	RevokedAt      string `json:"revoked_at"`
}

// GetPluginDefinitionByKeyVersion 按 plugin_key + version 取插件定义；不存在返回 nil。
func GetPluginDefinitionByKeyVersion(db *sql.DB, pluginKey, version string) (*PluginDefinition, error) {
	row := db.QueryRow(`SELECT id, plugin_key, version, protocol_version, name, runtime_kind,
		COALESCE(categories,'[]'), COALESCE(capabilities,'[]'), COALESCE(actions,'[]'),
		COALESCE(auth_schema,'{}'), COALESCE(config_schema,'{}'), COALESCE(permissions,'[]'),
		COALESCE(data_policy,'{}'), COALESCE(compatibility,'{}'), COALESCE(homepage,''),
		COALESCE(license,''), COALESCE(manifest,'{}'), COALESCE(create_time,'')
		FROM plugin_definitions WHERE plugin_key = ? AND version = ? LIMIT 1`, pluginKey, version)
	d := &PluginDefinition{}
	var categories, capabilities, actions, authSchema, configSchema, permissions string
	var dataPolicy, compatibility, manifest string
	err := row.Scan(&d.ID, &d.PluginKey, &d.Version, &d.ProtocolVersion, &d.Name, &d.RuntimeKind,
		&categories, &capabilities, &actions, &authSchema, &configSchema, &permissions,
		&dataPolicy, &compatibility, &d.Homepage, &d.License, &manifest, &d.CreateTime)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 plugin_definitions 失败: %w", err)
	}
	d.Categories = jsonList(categories)
	d.Capabilities = jsonList(capabilities)
	d.Actions = jsonList(actions)
	d.AuthSchema = jsonMap(authSchema)
	d.ConfigSchema = jsonMap(configSchema)
	d.Permissions = jsonList(permissions)
	d.DataPolicy = jsonMap(dataPolicy)
	d.Compatibility = jsonMap(compatibility)
	d.Manifest = jsonMap(manifest)
	return d, nil
}

// GetPluginInstallationByKey 按 plugin_key 取插件安装记录；不存在返回 nil。
func GetPluginInstallationByKey(db *sql.DB, pluginKey string) (*PluginInstallation, error) {
	row := db.QueryRow(`SELECT id, plugin_key, definition_id, version, COALESCE(enabled,1),
		COALESCE(scope,'instance'), COALESCE(config,'{}'), COALESCE(installed_from,'builtin'),
		COALESCE(checksum,''), COALESCE(status,'active'), installed_by, COALESCE(create_time,''),
		COALESCE(update_time,'')
		FROM plugin_installations WHERE plugin_key = ? LIMIT 1`, pluginKey)
	i := &PluginInstallation{}
	var enabled int64
	var config string
	err := row.Scan(&i.ID, &i.PluginKey, &i.DefinitionID, &i.Version, &enabled, &i.Scope, &config,
		&i.InstalledFrom, &i.Checksum, &i.Status, &i.InstalledBy, &i.CreateTime, &i.UpdateTime)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 plugin_installations 失败: %w", err)
	}
	i.Enabled = enabled != 0
	i.Config = jsonMap(config)
	return i, nil
}

// ListPluginInstallations 返回全部插件安装记录（按 id 升序）。
func ListPluginInstallations(db *sql.DB) ([]*PluginInstallation, error) {
	rows, err := db.Query(`SELECT id, plugin_key, definition_id, version, COALESCE(enabled,1),
		COALESCE(scope,'instance'), COALESCE(config,'{}'), COALESCE(installed_from,'builtin'),
		COALESCE(checksum,''), COALESCE(status,'active'), installed_by, COALESCE(create_time,''),
		COALESCE(update_time,'')
		FROM plugin_installations ORDER BY id`)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 plugin_installations 失败: %w", err)
	}
	defer rows.Close()

	out := []*PluginInstallation{}
	for rows.Next() {
		i := &PluginInstallation{}
		var enabled int64
		var config string
		if err := rows.Scan(&i.ID, &i.PluginKey, &i.DefinitionID, &i.Version, &enabled, &i.Scope,
			&config, &i.InstalledFrom, &i.Checksum, &i.Status, &i.InstalledBy, &i.CreateTime,
			&i.UpdateTime); err != nil {
			return nil, fmt.Errorf("userdb: 扫描 plugin_installations 失败: %w", err)
		}
		i.Enabled = enabled != 0
		i.Config = jsonMap(config)
		out = append(out, i)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("userdb: 遍历 plugin_installations 失败: %w", err)
	}
	return out, nil
}

// GetPluginSecretByID 按 id 取插件密钥；不存在返回 nil。
func GetPluginSecretByID(db *sql.DB, id int64) (*PluginSecret, error) {
	row := db.QueryRow(`SELECT id, owner_type, owner_id, COALESCE(kind,'credentials'), ciphertext,
		key_id, COALESCE(version,1), COALESCE(mask_hint,''), COALESCE(create_time,''),
		COALESCE(last_rotated_at,'')
		FROM plugin_secrets WHERE id = ?`, id)
	s := &PluginSecret{}
	err := row.Scan(&s.ID, &s.OwnerType, &s.OwnerID, &s.Kind, &s.Ciphertext, &s.KeyID, &s.Version,
		&s.MaskHint, &s.CreateTime, &s.LastRotatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 plugin_secrets 失败: %w", err)
	}
	return s, nil
}

// ListPluginConnections 返回某安装记录的全部连接（按 id 升序）。
func ListPluginConnections(db *sql.DB, installationID int64) ([]*PluginConnection, error) {
	rows, err := db.Query(`SELECT id, installation_id, owner_type, owner_id, COALESCE(role,'default'),
		COALESCE(name,'default'), secret_id, COALESCE(config,'{}'), COALESCE(scopes,'[]'),
		COALESCE(schedule,''), COALESCE(cursor,'{}'), COALESCE(health,'unknown'),
		COALESCE(health_message,''), COALESCE(enabled,1), COALESCE(lease_token,''),
		COALESCE(lease_until,''), COALESCE(create_time,''), COALESCE(update_time,'')
		FROM plugin_connections WHERE installation_id = ? ORDER BY id`, installationID)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 plugin_connections 失败: %w", err)
	}
	defer rows.Close()

	out := []*PluginConnection{}
	for rows.Next() {
		c := &PluginConnection{}
		var config, scopes, cursor string
		var enabled int64
		if err := rows.Scan(&c.ID, &c.InstallationID, &c.OwnerType, &c.OwnerID, &c.Role, &c.Name,
			&c.SecretID, &config, &scopes, &c.Schedule, &cursor, &c.Health, &c.HealthMessage,
			&enabled, &c.LeaseToken, &c.LeaseUntil, &c.CreateTime, &c.UpdateTime); err != nil {
			return nil, fmt.Errorf("userdb: 扫描 plugin_connections 失败: %w", err)
		}
		c.Enabled = enabled != 0
		c.Config = jsonMap(config)
		c.Scopes = jsonList(scopes)
		c.Cursor = jsonMap(cursor)
		out = append(out, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("userdb: 遍历 plugin_connections 失败: %w", err)
	}
	return out, nil
}

// ListPluginRuns 返回某连接的全部运行记录（按 id 降序，最新在前）。
func ListPluginRuns(db *sql.DB, connectionID int64, limit int) ([]*PluginRun, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := db.Query(`SELECT id, connection_id, parent_run_id, action, COALESCE(trigger,'manual'),
		COALESCE(status,'queued'), requested_by, COALESCE(counts,'{}'), COALESCE(cursor_before,'{}'),
		COALESCE(cursor_after,'{}'), COALESCE(input_data,'{}'), COALESCE(error_code,''),
		COALESCE(error_message,''), COALESCE(attempt,0), COALESCE(duration_ms,0),
		COALESCE(create_time,''), COALESCE(started_at,''), COALESCE(finished_at,'')
		FROM plugin_runs WHERE connection_id = ? ORDER BY id DESC LIMIT ?`, connectionID, limit)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 plugin_runs 失败: %w", err)
	}
	defer rows.Close()

	out := []*PluginRun{}
	for rows.Next() {
		r := &PluginRun{}
		var counts, cursorBefore, cursorAfter, inputData string
		if err := rows.Scan(&r.ID, &r.ConnectionID, &r.ParentRunID, &r.Action, &r.Trigger, &r.Status,
			&r.RequestedBy, &counts, &cursorBefore, &cursorAfter, &inputData, &r.ErrorCode,
			&r.ErrorMessage, &r.Attempt, &r.DurationMS, &r.CreateTime, &r.StartedAt,
			&r.FinishedAt); err != nil {
			return nil, fmt.Errorf("userdb: 扫描 plugin_runs 失败: %w", err)
		}
		r.Counts = jsonMap(counts)
		r.CursorBefore = jsonMap(cursorBefore)
		r.CursorAfter = jsonMap(cursorAfter)
		r.InputData = jsonMap(inputData)
		out = append(out, r)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("userdb: 遍历 plugin_runs 失败: %w", err)
	}
	return out, nil
}

// GetPluginRunByID 按 id 取一条运行记录；不存在返回 (nil, nil)。
func GetPluginRunByID(db *sql.DB, runID int64) (*PluginRun, error) {
	row := db.QueryRow(`SELECT id, connection_id, parent_run_id, action, COALESCE(trigger,'manual'),
		COALESCE(status,'queued'), requested_by, COALESCE(counts,'{}'), COALESCE(cursor_before,'{}'),
		COALESCE(cursor_after,'{}'), COALESCE(input_data,'{}'), COALESCE(error_code,''),
		COALESCE(error_message,''), COALESCE(attempt,0), COALESCE(duration_ms,0),
		COALESCE(create_time,''), COALESCE(started_at,''), COALESCE(finished_at,'')
		FROM plugin_runs WHERE id = ?`, runID)

	r := &PluginRun{}
	var counts, cursorBefore, cursorAfter, inputData string
	err := row.Scan(&r.ID, &r.ConnectionID, &r.ParentRunID, &r.Action, &r.Trigger, &r.Status,
		&r.RequestedBy, &counts, &cursorBefore, &cursorAfter, &inputData, &r.ErrorCode,
		&r.ErrorMessage, &r.Attempt, &r.DurationMS, &r.CreateTime, &r.StartedAt, &r.FinishedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 plugin_runs 失败: %w", err)
	}
	r.Counts = jsonMap(counts)
	r.CursorBefore = jsonMap(cursorBefore)
	r.CursorAfter = jsonMap(cursorAfter)
	r.InputData = jsonMap(inputData)
	return r, nil
}

// UpdatePluginRun 回写运行记录的状态、计数、游标与错误信息。
func UpdatePluginRun(db *sql.DB, run *PluginRun) error {
	if run == nil {
		return nil
	}
	_, err := db.Exec(`UPDATE plugin_runs
		SET status = ?, counts = ?, cursor_after = ?, error_code = ?, error_message = ?,
		    attempt = ?, started_at = ?, finished_at = ?, duration_ms = ?
		WHERE id = ?`,
		run.Status, jsonTextOf(run.Counts), jsonTextOf(run.CursorAfter), run.ErrorCode,
		run.ErrorMessage, run.Attempt, nullIfEmpty(run.StartedAt), nullIfEmpty(run.FinishedAt),
		run.DurationMS, run.ID)
	if err != nil {
		return fmt.Errorf("userdb: 更新 plugin_runs 失败: %w", err)
	}
	return nil
}

// jsonTextOf 把值编码为 JSON 文本；nil 或编码失败时返回 "{}"。
func jsonTextOf(value any) string {
	if value == nil {
		return "{}"
	}
	raw, err := json.Marshal(value)
	if err != nil {
		return "{}"
	}
	return string(raw)
}

// nullIfEmpty 把空串转成 NULL。
func nullIfEmpty(value string) any {
	if value == "" {
		return nil
	}
	return value
}

// ListPluginPermissions 返回某安装记录的全部权限（按 id 升序）。
func ListPluginPermissions(db *sql.DB, installationID int64) ([]*PluginPermission, error) {
	rows, err := db.Query(`SELECT id, installation_id, permission, COALESCE(scope,'instance'),
		approved_by, COALESCE(approved_at,''), COALESCE(revoked_at,'')
		FROM plugin_permissions WHERE installation_id = ? ORDER BY id`, installationID)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询 plugin_permissions 失败: %w", err)
	}
	defer rows.Close()

	out := []*PluginPermission{}
	for rows.Next() {
		p := &PluginPermission{}
		if err := rows.Scan(&p.ID, &p.InstallationID, &p.Permission, &p.Scope, &p.ApprovedBy,
			&p.ApprovedAt, &p.RevokedAt); err != nil {
			return nil, fmt.Errorf("userdb: 扫描 plugin_permissions 失败: %w", err)
		}
		out = append(out, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("userdb: 遍历 plugin_permissions 失败: %w", err)
	}
	return out, nil
}
