package pluginruntime

import (
	"database/sql"

	"talebook/booksvr/internal/pluginssecrets"
	"talebook/booksvr/internal/userdb"
)

// LoadSecrets 解密连接凭据。
//
// 对应 Python `_load_secrets`：无 secret 时，若 auth_schema 未声明必填字段
// 则返回空 map，否则报 plugin.credentials_missing。
func (r *Runtime) LoadSecrets(connection *userdb.PluginConnection) (map[string]any, error) {
	var secret *userdb.PluginSecret
	if connection.SecretID.Valid {
		var err error
		secret, err = userdb.GetPluginSecretByID(r.DB, connection.SecretID.Int64)
		if err != nil {
			return nil, err
		}
	}
	if secret == nil {
		definition, err := r.DefinitionOf(connection)
		if err != nil {
			return nil, err
		}
		authSchema := map[string]any{}
		if definition != nil {
			authSchema = definition.AuthSchema
		}
		if len(anyList(authSchema["required"])) == 0 {
			return map[string]any{}, nil
		}
		return nil, NewPluginRuntimeError("plugin.credentials_missing",
			"Plugin connection has no credentials", false)
	}

	cipher, err := pluginssecrets.NewSecretCipher(r.Settings)
	if err != nil {
		return nil, err
	}
	if secret.KeyID != cipher.KeyID {
		return nil, NewPluginRuntimeError("plugin.secret_key_mismatch",
			"Plugin credential requires key rotation", false)
	}
	return cipher.Decrypt(secret.Ciphertext)
}

// SaveConnection 保存（或更新）一条连接，返回连接记录。
//
// role 是查询键，name 只是展示文案。未显式给出 role 时沿用 name，
// 以兼容既有调用；新代码应显式传 role。
func (r *Runtime) SaveConnection(installationID int64, ownerType string, ownerID int64,
	credentials map[string]any, name string, config map[string]any, scopes []any,
	schedule string, role string) (*userdb.PluginConnection, error) {
	if role == "" {
		role = name
	}
	if role == "" {
		role = DefaultConnectionRole
	}
	if name == "" {
		name = "default"
	}

	installation, err := getInstallationByID(r.DB, installationID)
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
	if definition == nil {
		return nil, NewPluginRuntimeError("plugin.definition_missing",
			"Plugin definition was not found", false)
	}

	if credentials == nil {
		credentials = map[string]any{}
	}
	if err := ValidateCredentials(&DefinitionView{
		AuthSchema:   definition.AuthSchema,
		ConfigSchema: definition.ConfigSchema,
	}, credentials); err != nil {
		return nil, err
	}
	if config == nil {
		config = map[string]any{}
	}
	if err := ValidatePublicConfig(config, credentials, definition.ConfigSchema); err != nil {
		return nil, err
	}

	// 凭据非空时加密落库。
	var secretID sql.NullInt64
	if len(credentials) > 0 {
		cipher, err := pluginssecrets.NewSecretCipher(r.Settings)
		if err != nil {
			return nil, err
		}
		ciphertext, err := cipher.Encrypt(credentials)
		if err != nil {
			return nil, err
		}
		id, err := upsertSecret(r.DB, ownerType, ownerID, ciphertext, cipher.KeyID,
			pluginssecrets.SecretMaskHint(credentials))
		if err != nil {
			return nil, err
		}
		secretID = sql.NullInt64{Int64: id, Valid: true}
	}

	if scopes == nil {
		scopes = definition.Permissions
	}

	existing, err := findConnection(r.DB, installationID, ownerType, ownerID, role)
	if err != nil {
		return nil, err
	}
	now := nowString()
	if existing == nil {
		res, err := r.DB.Exec(`INSERT INTO plugin_connections
			(installation_id, owner_type, owner_id, role, name, secret_id, config,
			 scopes, schedule, cursor, health, enabled, create_time, update_time)
			VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
			installationID, ownerType, ownerID, role, name, secretID,
			jsonText(config), jsonText(scopes), schedule, "{}", "unknown", true, now, now)
		if err != nil {
			return nil, err
		}
		id, err := res.LastInsertId()
		if err != nil {
			return nil, err
		}
		return findConnectionByID(r.DB, id)
	}

	_, err = r.DB.Exec(`UPDATE plugin_connections SET
		name=?, secret_id=?, config=?, scopes=?, schedule=?, update_time=?
		WHERE id=?`,
		name, secretID, jsonText(config), jsonText(scopes), schedule, now, existing.ID)
	if err != nil {
		return nil, err
	}
	return findConnectionByID(r.DB, existing.ID)
}

// upsertSecret 写入凭据密文，返回 secret id。
func upsertSecret(db *sql.DB, ownerType string, ownerID int64, ciphertext,
	keyID, maskHint string) (int64, error) {
	now := nowString()
	res, err := db.Exec(`INSERT INTO plugin_secrets
		(owner_type, owner_id, kind, ciphertext, key_id, version, mask_hint,
		 create_time, last_rotated_at)
		VALUES (?,?,?,?,?,?,?,?,?)`,
		ownerType, ownerID, "credentials", ciphertext, keyID, 1, maskHint, now, now)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// findConnection 按 (installation, owner, role) 查连接。
func findConnection(db *sql.DB, installationID int64, ownerType string,
	ownerID int64, role string) (*userdb.PluginConnection, error) {
	row := db.QueryRow(`SELECT id, installation_id, owner_type, owner_id, role, name,
		secret_id, COALESCE(config,'{}'), COALESCE(scopes,'[]'), COALESCE(schedule,''),
		COALESCE(cursor,'{}'), COALESCE(health,''), COALESCE(health_message,''),
		enabled, COALESCE(lease_token,''), COALESCE(lease_until,''),
		COALESCE(create_time,''), COALESCE(update_time,'')
		FROM plugin_connections
		WHERE installation_id=? AND owner_type=? AND owner_id=? AND role=? LIMIT 1`,
		installationID, ownerType, ownerID, role)
	return scanConnectionRow(row)
}

// findConnectionByID 按 id 查连接。
func findConnectionByID(db *sql.DB, id int64) (*userdb.PluginConnection, error) {
	row := db.QueryRow(`SELECT id, installation_id, owner_type, owner_id, role, name,
		secret_id, COALESCE(config,'{}'), COALESCE(scopes,'[]'), COALESCE(schedule,''),
		COALESCE(cursor,'{}'), COALESCE(health,''), COALESCE(health_message,''),
		enabled, COALESCE(lease_token,''), COALESCE(lease_until,''),
		COALESCE(create_time,''), COALESCE(update_time,'')
		FROM plugin_connections WHERE id=?`, id)
	return scanConnectionRow(row)
}

// scanConnectionRow 读取完整连接行。
func scanConnectionRow(row *sql.Row) (*userdb.PluginConnection, error) {
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
	c.Config = decodeJSONMap(config.String)
	c.Scopes = decodeJSONList(scopes.String)
	c.Schedule = schedule.String
	c.Cursor = decodeJSONMap(cursor.String)
	c.Health = health.String
	c.HealthMessage = healthMessage.String
	c.LeaseToken = leaseToken.String
	c.LeaseUntil = leaseUntil.String
	c.CreateTime = created.String
	c.UpdateTime = updated.String
	return &c, nil
}
