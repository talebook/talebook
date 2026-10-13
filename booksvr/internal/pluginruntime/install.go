package pluginruntime

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"time"

	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginproto"
	"talebook/booksvr/internal/userdb"
)

// InitialEnabledFunc 由 provider 提供，决定首次物化时是否默认启用。
type InitialEnabledFunc func(settings map[string]any) bool

// InitialConfigFunc 由 provider 提供，返回首次物化时的连接配置。
type InitialConfigFunc func(settings map[string]any) map[string]any

// ProviderHooks 是 provider 可选实现的物化钩子。
//
// Python 用 getattr(provider, "initial_enabled", None) 鸭子类型探测；
// Go 侧用可选接口显式声明。
type ProviderHooks interface {
	InitialEnabled(settings map[string]any) bool
	InitialConfig(settings map[string]any) map[string]any
}

// nowString 返回与 Python datetime.now() 对齐的本地时间字符串。
func nowString() string {
	return time.Now().Format("2006-01-02 15:04:05.000000")
}

// manifestChecksum 复刻 install_builtin 的 checksum 计算。
//
// Python: sha256(json.dumps(raw, ensure_ascii=False, sort_keys=True,
// separators=(",", ":")).encode("utf-8")).hexdigest()
func manifestChecksum(raw map[string]any) (string, error) {
	payload, err := canonicalJSON(raw)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(payload)
	return hex.EncodeToString(sum[:]), nil
}

// EnsureBuiltinDefinitions 幂等物化全部内置插件定义，返回定义列表。
func EnsureBuiltinDefinitions(db *sql.DB, registry *PluginRegistry) ([]*userdb.PluginDefinition, error) {
	manifests, err := registry.Manifests()
	if err != nil {
		return nil, err
	}
	out := make([]*userdb.PluginDefinition, 0, len(manifests))
	for _, raw := range manifests {
		pluginKey := asString(raw["id"])
		version := asString(raw["version"])

		existing, err := userdb.GetPluginDefinitionByKeyVersion(db, pluginKey, version)
		if err != nil {
			return nil, err
		}
		definition := existing
		if definition == nil {
			definition = &userdb.PluginDefinition{
				PluginKey:  pluginKey,
				Version:    version,
				CreateTime: nowString(),
			}
		}
		definition.ProtocolVersion = asString(raw["protocol_version"])
		definition.Name = asString(raw["name"])
		definition.RuntimeKind = asString(raw["runtime_kind"])
		definition.Categories = anyList(raw["categories"])
		definition.Capabilities = anyList(raw["capabilities"])
		definition.Actions = anyList(raw["actions"])
		definition.AuthSchema = anyMap(raw["auth_schema"])
		definition.ConfigSchema = anyMap(raw["config_schema"])
		definition.Permissions = anyList(raw["permissions"])
		definition.DataPolicy = anyMap(raw["data_policy"])
		definition.Compatibility = anyMap(raw["compatibility"])
		definition.Homepage = asString(raw["homepage"])
		definition.License = asString(raw["license"])
		definition.Manifest = raw

		if err := upsertDefinition(db, definition); err != nil {
			return nil, err
		}
		out = append(out, definition)
	}
	return out, nil
}

// upsertDefinition 写入或更新一条插件定义。
func upsertDefinition(db *sql.DB, d *userdb.PluginDefinition) error {
	payload, err := canonicalJSON(d.Manifest)
	if err != nil {
		return err
	}
	if d.ID == 0 {
		res, err := db.Exec(`INSERT INTO plugin_definitions
			(plugin_key, version, protocol_version, name, runtime_kind, categories,
			 capabilities, actions, auth_schema, config_schema, permissions,
			 data_policy, compatibility, homepage, license, manifest, create_time)
			VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
			d.PluginKey, d.Version, d.ProtocolVersion, d.Name, d.RuntimeKind,
			jsonText(d.Categories), jsonText(d.Capabilities), jsonText(d.Actions),
			jsonText(d.AuthSchema), jsonText(d.ConfigSchema), jsonText(d.Permissions),
			jsonText(d.DataPolicy), jsonText(d.Compatibility), d.Homepage, d.License,
			string(payload), d.CreateTime)
		if err != nil {
			return fmt.Errorf("pluginruntime: 插入插件定义失败: %w", err)
		}
		id, err := res.LastInsertId()
		if err != nil {
			return err
		}
		d.ID = id
		return nil
	}
	_, err = db.Exec(`UPDATE plugin_definitions SET
		protocol_version=?, name=?, runtime_kind=?, categories=?, capabilities=?,
		actions=?, auth_schema=?, config_schema=?, permissions=?, data_policy=?,
		compatibility=?, homepage=?, license=?, manifest=?
		WHERE id=?`,
		d.ProtocolVersion, d.Name, d.RuntimeKind, jsonText(d.Categories),
		jsonText(d.Capabilities), jsonText(d.Actions), jsonText(d.AuthSchema),
		jsonText(d.ConfigSchema), jsonText(d.Permissions), jsonText(d.DataPolicy),
		jsonText(d.Compatibility), d.Homepage, d.License, string(payload), d.ID)
	if err != nil {
		return fmt.Errorf("pluginruntime: 更新插件定义失败: %w", err)
	}
	return nil
}

// EnsureBuiltinInstallations 幂等物化全部内置插件。
//
// 平台只暴露启停，不暴露安装动作。
func EnsureBuiltinInstallations(db *sql.DB, installedBy int64, settings map[string]any,
	registry *PluginRegistry) ([]*userdb.PluginInstallation, error) {
	if _, err := EnsureBuiltinDefinitions(db, registry); err != nil {
		return nil, err
	}
	var out []*userdb.PluginInstallation
	for _, provider := range registry.Providers() {
		raw := provider.Manifest()
		pluginKey := asString(raw["id"])

		installation, err := userdb.GetPluginInstallationByKey(db, pluginKey)
		if err != nil {
			return nil, err
		}
		if installation == nil {
			enabled := false
			if hooks, ok := provider.(ProviderHooks); ok {
				enabled = hooks.InitialEnabled(settings)
			}
			installation, err = InstallBuiltin(db, pluginKey, installedBy, nil, nil, enabled, registry)
			if err != nil {
				return nil, err
			}
		}

		if !containsString(anyList(raw["connection_owners"]), "instance") {
			out = append(out, installation)
			continue
		}

		conn, err := getBuiltinConnection(db, installation.ID)
		if err != nil {
			return nil, err
		}
		if conn == nil {
			var config map[string]any
			if hooks, ok := provider.(ProviderHooks); ok {
				config = hooks.InitialConfig(settings)
			}
			if config == nil {
				config = map[string]any{}
			}
			if len(config) > 0 {
				if err := ValidatePublicConfig(config, nil, anyMap(raw["config_schema"])); err != nil {
					return nil, err
				}
			}
			if err := insertBuiltinConnection(db, installation.ID, config,
				anyList(raw["permissions"])); err != nil {
				return nil, err
			}
		}
		out = append(out, installation)
	}
	return out, nil
}

// EnsureRuntimeInstallations 在插件表可用的业务请求中物化内置插件。
//
// 以首位管理员作为迁移记录的归属人。
func EnsureRuntimeInstallations(db *sql.DB, settings map[string]any,
	registry *PluginRegistry) ([]*userdb.PluginInstallation, error) {
	var installerID int64
	err := db.QueryRow(`SELECT id FROM readers WHERE admin = 1 ORDER BY id LIMIT 1`).Scan(&installerID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("pluginruntime: 查询管理员失败: %w", err)
	}
	return EnsureBuiltinInstallations(db, installerID, settings, registry)
}

// InstallBuiltin 安装（或更新）一个内置插件，返回安装记录。
//
// 安装记录只表达「实例是否开放此内置插件」。连接配置在 SaveConnection 中校验；
// 首次物化不能因某个插件尚未填写必填连接参数而失败。
func InstallBuiltin(db *sql.DB, pluginKey string, installedBy int64,
	config map[string]any, approvedPermissions []string, enabled bool,
	registry *PluginRegistry) (*userdb.PluginInstallation, error) {
	if _, err := EnsureBuiltinDefinitions(db, registry); err != nil {
		return nil, err
	}
	provider, err := registry.Get(pluginKey)
	if err != nil {
		return nil, err
	}
	manifest, err := pluginproto.ValidateManifest(provider.Manifest())
	if err != nil {
		return nil, err
	}
	raw := pluginiface.ManifestFromProto(manifest)

	if config != nil {
		if err := ValidatePublicConfig(config, nil, anyMap(raw["config_schema"])); err != nil {
			return nil, err
		}
	}

	definition, err := userdb.GetPluginDefinitionByKeyVersion(db, pluginKey, asString(raw["version"]))
	if err != nil {
		return nil, err
	}
	if definition == nil {
		return nil, fmt.Errorf("pluginruntime: 插件定义缺失: %s", pluginKey)
	}

	installation, err := userdb.GetPluginInstallationByKey(db, pluginKey)
	if err != nil {
		return nil, err
	}
	isNew := installation == nil
	if installation == nil {
		installation = &userdb.PluginInstallation{PluginKey: pluginKey}
	}
	installation.DefinitionID = definition.ID
	installation.Version = definition.Version
	installation.Enabled = enabled
	installation.Scope = "shared"
	if config == nil {
		config = map[string]any{}
	}
	installation.Config = config
	installation.InstalledFrom = "builtin"
	checksum, err := manifestChecksum(raw)
	if err != nil {
		return nil, err
	}
	installation.Checksum = checksum
	installation.Status = "active"
	installation.InstalledBy = installedBy
	installation.UpdateTime = nowString()

	if err := upsertInstallation(db, installation); err != nil {
		return nil, err
	}

	// 权限对账。
	declared := stringSetOf(anyList(raw["permissions"]))
	existing, err := userdb.ListPluginPermissions(db, installation.ID)
	if err != nil {
		return nil, err
	}
	existingByPerm := map[string]*userdb.PluginPermission{}
	for _, item := range existing {
		existingByPerm[item.Permission] = item
	}

	var requested map[string]bool
	switch {
	case approvedPermissions != nil:
		requested = map[string]bool{}
		for _, p := range approvedPermissions {
			requested[p] = true
		}
	case isNew:
		requested = declared
	default:
		requested = map[string]bool{}
		for name, item := range existingByPerm {
			if item.RevokedAt == "" {
				requested[name] = true
			}
		}
	}

	for p := range requested {
		if !declared[p] {
			return nil, NewPluginRuntimeError("plugin.permission_invalid",
				"Cannot approve undeclared plugin permission", false)
		}
	}

	now := nowString()
	for permission := range declared {
		item := existingByPerm[permission]
		if item == nil {
			if err := insertPermission(db, installation.ID, permission, installedBy, now); err != nil {
				return nil, err
			}
			continue
		}
		revoked := ""
		if !requested[permission] {
			revoked = now
		}
		if err := setPermissionRevoked(db, item.ID, revoked); err != nil {
			return nil, err
		}
	}
	return installation, nil
}

// upsertInstallation 写入或更新一条安装记录。
func upsertInstallation(db *sql.DB, i *userdb.PluginInstallation) error {
	if i.ID == 0 {
		res, err := db.Exec(`INSERT INTO plugin_installations
			(plugin_key, definition_id, version, enabled, scope, config,
			 installed_from, checksum, status, installed_by, create_time, update_time)
			VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
			i.PluginKey, i.DefinitionID, i.Version, i.Enabled, i.Scope,
			jsonText(i.Config), i.InstalledFrom, i.Checksum, i.Status,
			i.InstalledBy, nowString(), i.UpdateTime)
		if err != nil {
			return fmt.Errorf("pluginruntime: 插入安装记录失败: %w", err)
		}
		id, err := res.LastInsertId()
		if err != nil {
			return err
		}
		i.ID = id
		return nil
	}
	_, err := db.Exec(`UPDATE plugin_installations SET
		definition_id=?, version=?, enabled=?, scope=?, config=?,
		installed_from=?, checksum=?, status=?, update_time=?
		WHERE id=?`,
		i.DefinitionID, i.Version, i.Enabled, i.Scope, jsonText(i.Config),
		i.InstalledFrom, i.Checksum, i.Status, i.UpdateTime, i.ID)
	if err != nil {
		return fmt.Errorf("pluginruntime: 更新安装记录失败: %w", err)
	}
	return nil
}

// getBuiltinConnection 取内置连接（owner_type=instance, owner_id=0, role=builtin）。
func getBuiltinConnection(db *sql.DB, installationID int64) (*userdb.PluginConnection, error) {
	conns, err := userdb.ListPluginConnections(db, installationID)
	if err != nil {
		return nil, err
	}
	for _, c := range conns {
		if c.OwnerType == "instance" && c.OwnerID == 0 && c.Role == BuiltinConnectionRole {
			return c, nil
		}
	}
	return nil, nil
}

// insertBuiltinConnection 插入内置连接。
func insertBuiltinConnection(db *sql.DB, installationID int64, config map[string]any,
	scopes []any) error {
	now := nowString()
	_, err := db.Exec(`INSERT INTO plugin_connections
		(installation_id, owner_type, owner_id, role, name, config, scopes,
		 health, enabled, create_time, update_time)
		VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
		installationID, "instance", 0, BuiltinConnectionRole, "内置连接",
		jsonText(config), jsonText(scopes), "unknown", true, now, now)
	if err != nil {
		return fmt.Errorf("pluginruntime: 插入内置连接失败: %w", err)
	}
	return nil
}

// insertPermission 插入一条权限记录。
func insertPermission(db *sql.DB, installationID int64, permission string,
	approvedBy int64, now string) error {
	_, err := db.Exec(`INSERT INTO plugin_permissions
		(installation_id, permission, scope, approved_by, approved_at, revoked_at)
		VALUES (?,?,?,?,?,?)`,
		installationID, permission, "instance", approvedBy, now, "")
	if err != nil {
		return fmt.Errorf("pluginruntime: 插入权限失败: %w", err)
	}
	return nil
}

// setPermissionRevoked 设置权限的撤销时间（空串表示未撤销）。
func setPermissionRevoked(db *sql.DB, id int64, revokedAt string) error {
	var value any
	if revokedAt != "" {
		value = revokedAt
	}
	_, err := db.Exec(`UPDATE plugin_permissions SET revoked_at=? WHERE id=?`, value, id)
	if err != nil {
		return fmt.Errorf("pluginruntime: 更新权限失败: %w", err)
	}
	return nil
}

// ---- 小工具 ----

// anyList 把任意值规整为 []any（nil → 空切片）。
func anyList(v any) []any {
	if list, ok := v.([]any); ok {
		return list
	}
	return []any{}
}

// anyMap 把任意值规整为 map[string]any（nil → 空 map）。
func anyMap(v any) map[string]any {
	if m, ok := v.(map[string]any); ok {
		return m
	}
	return map[string]any{}
}

// stringSetOf 把 []any 转成字符串集合。
func stringSetOf(list []any) map[string]bool {
	out := make(map[string]bool, len(list))
	for _, item := range list {
		out[asString(item)] = true
	}
	return out
}

// containsString 判断 []any 中是否含目标字符串。
func containsString(list []any, target string) bool {
	for _, item := range list {
		if asString(item) == target {
			return true
		}
	}
	return false
}

// jsonText 把值序列化为 JSON 文本（nil → "null"）。
func jsonText(v any) string {
	payload, err := canonicalJSON(v)
	if err != nil {
		return "null"
	}
	return string(payload)
}
