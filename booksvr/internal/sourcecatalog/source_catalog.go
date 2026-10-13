// Package sourcecatalog 把插件连接与存量书源事实表绑定为统一 SourceProvider 目录。
//
// 复刻 webserver/services/source_catalog.py。
package sourcecatalog

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginruntime"
)

// SourceCapabilities 是书源类能力集合。
var SourceCapabilities = []string{"sources.search", "sources.browse", "sources.acquire"}

// 内置书源插件 ID。
const (
	LegadoPluginID = "talebook.source.legado"
	OPDSPluginID   = "talebook.source.opds"
)

// 搜索并发配置键与默认值。
const (
	SearchConcurrencyKey     = "search_concurrency"
	DefaultSearchConcurrency = 20
)

// SourceBinding 是一条可寻址的书源绑定。
type SourceBinding struct {
	Key              string
	Name             string
	Group            string
	Connection       *ConnectionRef
	PluginKey        string
	Capabilities     []string
	DownloadMode     string
	ContextOverrides map[string]any
	// LegacyID 是旧 /api/network/* 的数字 source_id；无则为 nil。
	LegacyID *int64
}

// ConnectionRef 是绑定的连接标识（避免在目录层暴露完整模型）。
type ConnectionRef struct {
	ID             int64
	InstallationID int64
	Config         map[string]any
}

// ToPublicDict 复刻 SourceBinding.to_public_dict。
func (b *SourceBinding) ToPublicDict() map[string]any {
	var id any = b.Key
	if b.LegacyID != nil {
		id = *b.LegacyID
	}
	caps := append([]string{}, b.Capabilities...)
	sort.Strings(caps)
	return map[string]any{
		"id":            id,
		"source_key":    b.Key,
		"name":          b.Name,
		"group":         b.Group,
		"plugin_key":    b.PluginKey,
		"capabilities":  caps,
		"download_mode": b.DownloadMode,
	}
}

// Service 复刻 SourceCatalogService。
type Service struct {
	DB       *sql.DB
	Settings map[string]any
	UserID   int64
	Runtime  *pluginruntime.Runtime
}

// NewService 构造目录服务，并幂等物化内置插件。
func NewService(db *sql.DB, settings map[string]any, userID int64,
	rt *pluginruntime.Runtime) (*Service, error) {
	if rt == nil {
		rt = pluginruntime.NewRuntime(db, settings, nil)
	}
	if _, err := pluginruntime.EnsureBuiltinInstallations(db, userID, settings, rt.Registry); err != nil {
		return nil, err
	}
	return &Service{DB: db, Settings: settings, UserID: userID, Runtime: rt}, nil
}

// EngineConfig 复刻 `_engine_config`。
func (s *Service) EngineConfig() map[string]any {
	return map[string]any{
		"BOOKSOURCE_HTTP_TIMEOUT":       settingOr(s.Settings, "BOOKSOURCE_HTTP_TIMEOUT", 20),
		"BOOKSOURCE_MAX_TOC_PAGES":      settingOr(s.Settings, "BOOKSOURCE_MAX_TOC_PAGES", 30),
		"BOOKSOURCE_MAX_CONTENT_PAGES":  settingOr(s.Settings, "BOOKSOURCE_MAX_CONTENT_PAGES", 20),
		"BOOKSOURCE_AD_PATTERNS":        settingOr(s.Settings, "BOOKSOURCE_AD_PATTERNS", []any{}),
		"BOOKSOURCE_CLEAN_ENABLED":      settingOr(s.Settings, "BOOKSOURCE_CLEAN_ENABLED", true),
		"BOOKSOURCE_MAX_RESPONSE_BYTES": settingOr(s.Settings, "BOOKSOURCE_MAX_RESPONSE_BYTES", 8*1024*1024),
	}
}

// settingOr 取设置项，缺失时返回默认值。
func settingOr(settings map[string]any, key string, fallback any) any {
	if v, ok := settings[key]; ok && v != nil {
		return v
	}
	return fallback
}

// Bindings 返回全部可寻址书源绑定。
func (s *Service) Bindings() ([]*SourceBinding, error) {
	// 按能力收集连接，以 connection.id 去重。
	byID := map[int64]*ConnectionRef{}
	for _, capability := range SourceCapabilities {
		conns, err := s.Runtime.ConnectionsFor(capability, &s.UserID)
		if err != nil {
			return nil, err
		}
		for _, c := range conns {
			byID[c.ID] = &ConnectionRef{
				ID:             c.ID,
				InstallationID: c.InstallationID,
				Config:         c.Config,
			}
		}
	}

	ids := make([]int64, 0, len(byID))
	for id := range byID {
		ids = append(ids, id)
	}
	sort.Slice(ids, func(i, j int) bool { return ids[i] < ids[j] })

	var output []*SourceBinding
	for _, id := range ids {
		ref := byID[id]
		conn, err := s.Runtime.ConnectionByID(ref.ID)
		if err != nil {
			return nil, err
		}
		if conn == nil {
			continue
		}
		pluginKey, err := s.Runtime.PluginKeyOf(conn)
		if err != nil {
			return nil, err
		}
		provider, err := s.Runtime.Registry.Get(pluginKey)
		if err != nil {
			return nil, err
		}
		// 只保留实现了 SourceProvider 的插件。
		sourceProvider, ok := provider.(pluginiface.SourceProvider)
		if !ok {
			continue
		}
		definition, err := s.Runtime.DefinitionOf(conn)
		if err != nil {
			return nil, err
		}
		capabilities := intersect(definition.Capabilities, SourceCapabilities)
		downloadMode := string(sourceProvider.DownloadMode())

		switch pluginKey {
		case LegadoPluginID:
			bindings, err := s.legadoBindings(ref, pluginKey, capabilities, downloadMode)
			if err != nil {
				return nil, err
			}
			output = append(output, bindings...)
		case OPDSPluginID:
			bindings, err := s.opdsBindings(ref, pluginKey, capabilities, downloadMode)
			if err != nil {
				return nil, err
			}
			output = append(output, bindings...)
		default:
			name := pluginKey
			if definition != nil {
				name = definition.Name
			}
			output = append(output, &SourceBinding{
				Key:          fmt.Sprintf("plugin:%d", ref.ID),
				Name:         name,
				Group:        "插件书源",
				Connection:   ref,
				PluginKey:    pluginKey,
				Capabilities: capabilities,
				DownloadMode: downloadMode,
			})
		}
	}
	return output, nil
}

// legadoBindings 展开 Legado 事实表为逐条绑定。
func (s *Service) legadoBindings(ref *ConnectionRef, pluginKey string,
	capabilities []string, downloadMode string) ([]*SourceBinding, error) {
	rows, err := s.DB.Query(`SELECT id, name, COALESCE("group",''), COALESCE(raw,'{}')
		FROM book_sources WHERE enabled = 1
		ORDER BY weight DESC, id ASC`)
	if err != nil {
		return nil, fmt.Errorf("sourcecatalog: 查询书源失败: %w", err)
	}
	defer rows.Close()

	type row struct {
		id    int64
		name  string
		group string
		raw   map[string]any
	}
	var sources []row
	for rows.Next() {
		var (
			r   row
			raw sql.NullString
		)
		if err := rows.Scan(&r.id, &r.name, &r.group, &raw); err != nil {
			return nil, err
		}
		r.raw = decodeJSONMap(raw.String)
		sources = append(sources, r)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}

	engineConfig := s.EngineConfig()
	out := make([]*SourceBinding, 0, len(sources))
	for _, src := range sources {
		legacyID := src.id
		out = append(out, &SourceBinding{
			Key:          fmt.Sprintf("legado:%d", src.id),
			Name:         src.name,
			Group:        src.group,
			Connection:   ref,
			PluginKey:    pluginKey,
			Capabilities: capabilities,
			DownloadMode: downloadMode,
			ContextOverrides: map[string]any{
				"config": map[string]any{
					"source_raw":    src.raw,
					"engine_config": engineConfig,
				},
			},
			LegacyID: &legacyID,
		})
	}
	return out, nil
}

// opdsBindings 展开 OPDS 事实表为逐条绑定。
func (s *Service) opdsBindings(ref *ConnectionRef, pluginKey string,
	capabilities []string, downloadMode string) ([]*SourceBinding, error) {
	rows, err := s.DB.Query(`SELECT id, name, url FROM opds_sources
		WHERE active = 1 ORDER BY id`)
	if err != nil {
		return nil, fmt.Errorf("sourcecatalog: 查询 OPDS 源失败: %w", err)
	}
	defer rows.Close()

	type row struct {
		id   int64
		name string
		url  string
	}
	var sources []row
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.id, &r.name, &r.url); err != nil {
			return nil, err
		}
		sources = append(sources, r)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}

	out := make([]*SourceBinding, 0, len(sources))
	for _, src := range sources {
		out = append(out, &SourceBinding{
			Key:          fmt.Sprintf("opds:%d", src.id),
			Name:         src.name,
			Group:        "OPDS",
			Connection:   ref,
			PluginKey:    pluginKey,
			Capabilities: capabilities,
			DownloadMode: downloadMode,
			ContextOverrides: map[string]any{
				"config": map[string]any{"endpoint": src.url},
			},
		})
	}
	return out, nil
}

// Availability 返回不含凭据的摘要，供网络书库空状态使用。
func (s *Service) Availability(bindings []*SourceBinding) (map[string]any, error) {
	enabled := map[string]bool{}
	for _, capability := range SourceCapabilities {
		providers, err := s.Runtime.EnabledProviders(capability)
		if err != nil {
			return nil, err
		}
		for _, p := range providers {
			enabled[asString(p.Manifest()["id"])] = true
		}
	}

	available := bindings
	if available == nil {
		var err error
		available, err = s.Bindings()
		if err != nil {
			return nil, err
		}
	}

	state := "ready"
	switch {
	case len(enabled) == 0:
		state = "no_enabled_plugins"
	case len(available) == 0:
		state = "no_configured_sources"
	}
	return map[string]any{
		"state":              state,
		"enabled_plugins":    len(enabled),
		"configured_sources": len(available),
	}, nil
}

// SearchConcurrency 返回本次任务的管理员配置的 Legado 搜索并发上限。
func (s *Service) SearchConcurrency(bindings []*SourceBinding) int {
	var legado *SourceBinding
	for _, b := range bindings {
		if b.PluginKey == LegadoPluginID {
			legado = b
			break
		}
	}
	var value any = settingOr(s.Settings, "BOOKSOURCE_MAX_WORKERS", DefaultSearchConcurrency)
	if legado != nil {
		if v, ok := legado.Connection.Config[SearchConcurrencyKey]; ok {
			value = v
		}
	}
	n := toInt(value, DefaultSearchConcurrency)
	if n < 1 {
		return 1
	}
	if n > 100 {
		return 100
	}
	return n
}

// Get 按 source_key 取绑定。
//
// 旧 /api/network/* 的纯数字 source_id 是一版兼容别名，只在绑定层解释。
func (s *Service) Get(sourceKey string) (*SourceBinding, error) {
	value := strings.TrimSpace(sourceKey)
	if isDigits(value) {
		value = "legado:" + value
	}
	bindings, err := s.Bindings()
	if err != nil {
		return nil, err
	}
	for _, b := range bindings {
		if b.Key == value {
			return b, nil
		}
	}
	return nil, pluginruntime.NewPluginRuntimeError("source.not_found",
		"Book source is not available", false)
}

// Read 调用绑定的 read 能力。
func (s *Service) Read(binding *SourceBinding, method string, args []any,
	timeout *float64, extraConfig map[string]any) (any, error) {
	effective := timeout
	if method == "download" && effective == nil {
		if v, ok := binding.Connection.Config["timeout_seconds"]; ok {
			f := toFloat(v, 0)
			effective = &f
		}
	}
	override := copyMapAny(binding.ContextOverrides)
	if len(extraConfig) > 0 {
		merged := copyMapAny(anyMap(override["config"]))
		for k, v := range extraConfig {
			merged[k] = v
		}
		override["config"] = merged
	}
	if effective == nil {
		f := toFloat(settingOr(s.Settings, "BOOKSOURCE_HTTP_TIMEOUT", 20), 20)
		effective = &f
	}

	conn, err := s.Runtime.ConnectionByID(binding.Connection.ID)
	if err != nil {
		return nil, err
	}
	if conn == nil {
		return nil, pluginruntime.NewPluginRuntimeError("source.not_found",
			"Book source is not available", false)
	}
	return s.Runtime.Read(conn, method, args, pluginruntime.CallOptions{
		Timeout:          effective,
		ContextOverrides: override,
		RequiredScopes:   []string{"books.read"},
	})
}

// ---- 小工具 ----

// decodeJSONMap 把 JSON 文本解成 map；空串或非法内容返回空 map。
func decodeJSONMap(text string) map[string]any {
	text = strings.TrimSpace(text)
	if text == "" || text == "null" {
		return map[string]any{}
	}
	var out map[string]any
	if err := json.Unmarshal([]byte(text), &out); err != nil || out == nil {
		return map[string]any{}
	}
	return out
}

// intersect 求 definition 能力与书源能力的交集（保持 SourceCapabilities 顺序）。
func intersect(declared []any, allowed []string) []string {
	have := map[string]bool{}
	for _, item := range declared {
		have[asString(item)] = true
	}
	out := []string{}
	for _, want := range allowed {
		if have[want] {
			out = append(out, want)
		}
	}
	return out
}

// isDigits 判断字符串是否全为数字（对应 Python str.isdigit）。
func isDigits(s string) bool {
	if s == "" {
		return false
	}
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}

// asString 复刻 Python str()。
func asString(v any) string {
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	return fmt.Sprint(v)
}

// anyMap 把任意值规整为 map[string]any。
func anyMap(v any) map[string]any {
	if m, ok := v.(map[string]any); ok {
		return m
	}
	return map[string]any{}
}

// copyMapAny 复制 map[string]any。
func copyMapAny(in map[string]any) map[string]any {
	out := make(map[string]any, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
}

// toInt 复刻 Python int()。
func toInt(v any, fallback int) int {
	switch t := v.(type) {
	case int:
		return t
	case int64:
		return int(t)
	case float64:
		return int(t)
	case string:
		var n int
		if _, err := fmt.Sscanf(strings.TrimSpace(t), "%d", &n); err == nil {
			return n
		}
	}
	return fallback
}

// toFloat 复刻 Python float()。
func toFloat(v any, fallback float64) float64 {
	switch t := v.(type) {
	case float64:
		return t
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
