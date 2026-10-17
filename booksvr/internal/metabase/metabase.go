// Package metabase 复刻 webserver/plugins/meta/base.py。
//
// 元数据源共用的 manifest 构造、字段决策与 MetadataProvider 样板。
package metabase

import (
	"regexp"
	"sort"
	"strings"

	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginproto"
)

// SummaryLimit 复刻 SUMMARY_LIMIT。
const SummaryLimit = 500

// CalibreMIKey 复刻 CALIBRE_MI_KEY。
//
// 元数据源内部统一构造 calibre 的 Metadata：候选展示只需要类型化字段，
// 但应用路径要调用 mi.smart_update() 写回书库，依赖 Metadata 自身的内部状态
// （含自定义列）。逐字段重建必然遗漏，因此转换保留原对象引用。
const CalibreMIKey = "_calibre_mi"

// MetadataFields 复刻 METADATA_FIELDS。
var MetadataFields = []string{
	"title", "authors", "author", "author_sort", "publisher", "isbn",
	"comments", "pubdate", "tags", "rating", "series", "language",
	"cover_url", "source", "website", "provider_key", "provider_value",
}

// ManifestOptions 是 MetaManifest 的参数。
type ManifestOptions struct {
	ConfigSchema      map[string]any
	AuthSchema        map[string]any
	ConfigurationMode string
	BrandIcon         string
	Deprecated        bool
}

// Manifest 复刻 meta/base.py 的 _manifest。
func Manifest(pluginID, name, description string, categories, capabilities []string,
	authSchema, configSchema map[string]any, permissions []string,
	icon, homepage string, connectionOwners []string) map[string]any {
	if connectionOwners == nil {
		connectionOwners = []string{"instance"}
	}
	return map[string]any{
		"protocol_version": pluginproto.ProtocolVersion,
		"id":               pluginID,
		"name":             name,
		"description":      description,
		"version":          "1.0.0",
		"categories":       toAnySlice(categories),
		"capabilities":     toAnySlice(capabilities),
		"runtime_kind":     "builtin",
		"actions":          []any{"test", "preview", "run", "retry", "rollback"},
		"auth_schema":      authSchema,
		"config_schema":    configSchema,
		"permissions":      toAnySlice(permissions),
		"data_policy": map[string]any{
			"stores_full_text": false,
			"retention":        "rating_summary_and_source_link",
		},
		"compatibility":     map[string]any{"talebook": ">=0.1.0"},
		"homepage":          homepage,
		"license":           "GPL-3.0",
		"ui":                map[string]any{"icon": icon, "configuration_mode": "none", "primary_action": "details"},
		"connection_owners": toAnySlice(connectionOwners),
	}
}

// MetaManifest 复刻 meta_manifest：元数据源共用的 manifest，能力固定为 metadata.lookup。
func MetaManifest(pluginID, name, description, icon, homepage string, opts ManifestOptions) map[string]any {
	authSchema := opts.AuthSchema
	if authSchema == nil {
		authSchema = map[string]any{"type": "object", "properties": map[string]any{}}
	}
	configSchema := opts.ConfigSchema
	if configSchema == nil {
		configSchema = map[string]any{"type": "object", "properties": map[string]any{}}
	}
	mode := opts.ConfigurationMode
	if mode == "" {
		mode = "none"
	}

	manifest := Manifest(pluginID, name, description,
		[]string{"metadata"}, []string{"metadata.lookup"},
		authSchema, configSchema, []string{"books.read"}, icon, homepage, nil)

	ui, _ := manifest["ui"].(map[string]any)
	ui["configuration_mode"] = mode
	if mode == "form" {
		ui["primary_action"] = "configure"
	} else {
		ui["primary_action"] = "details"
	}
	if opts.BrandIcon != "" {
		ui["brand_icon"] = opts.BrandIcon
	}
	if opts.Deprecated {
		ui["deprecated"] = true
	}
	return manifest
}

// First 复刻 _first：列表取首项，空值返回默认。
func First(value any, def any) any {
	if list, ok := value.([]any); ok {
		if len(list) == 0 {
			return def
		}
		return list[0]
	}
	if list, ok := value.([]string); ok {
		if len(list) == 0 {
			return def
		}
		return list[0]
	}
	if isEmptyValue(value) {
		return def
	}
	return value
}

// isEmptyValue 复刻 EMPTY_VALUES = (None, "", [], {})。
func isEmptyValue(v any) bool {
	switch val := v.(type) {
	case nil:
		return true
	case string:
		return val == ""
	case []any:
		return len(val) == 0
	case []string:
		return len(val) == 0
	case map[string]any:
		return len(val) == 0
	}
	return false
}

// whitespaceRe 复刻 re.sub(r"\s+", " ", ...)。
var whitespaceRe = regexp.MustCompile(`\s+`)

// Summary 复刻 _summary：折叠空白、去首尾、按字符（码点）截断到 500。
func Summary(value any) string {
	text := strings.TrimSpace(whitespaceRe.ReplaceAllString(asString(value), " "))
	if runes := []rune(text); len(runes) > SummaryLimit {
		return string(runes[:SummaryLimit])
	}
	return text
}

// FieldDecision 复刻 build_field_decisions 的单条结果。
type FieldDecision struct {
	Field     string `json:"field"`
	Current   any    `json:"current"`
	Candidate any    `json:"candidate"`
	Decision  string `json:"decision"`
	Locked    bool   `json:"locked"`
	WillApply bool   `json:"will_apply"`
}

// 决策取值。
const (
	DecisionLocked    = "locked"
	DecisionFillEmpty = "fill_empty"
	DecisionUnchanged = "unchanged"
	DecisionCandidate = "candidate"
)

// BuildFieldDecisions 复刻 build_field_decisions。
//
// 描述一次富化而不改动权威元数据。字段按字典序输出。
//
// 注意：Python 的 `current` 有 `or {}` 兜底，但 `candidate` **没有**——
// 传 None 会抛 TypeError。Go 侧无法抛 TypeError，因此 candidate 为 nil 时
// 返回空切片（调用方应保证传入非 nil）。
func BuildFieldDecisions(current, candidate map[string]any, lockedFields []string) []FieldDecision {
	locked := map[string]bool{}
	for _, f := range lockedFields {
		locked[f] = true
	}

	fields := make([]string, 0, len(candidate))
	for f := range candidate {
		fields = append(fields, f)
	}
	sort.Strings(fields)

	decisions := make([]FieldDecision, 0, len(fields))
	for _, field := range fields {
		proposed := candidate[field]
		if isEmptyValue(proposed) {
			continue
		}
		existing := current[field]

		var decision string
		switch {
		case locked[field]:
			decision = DecisionLocked
		case isEmptyValue(existing):
			decision = DecisionFillEmpty
		case valuesEqual(existing, proposed):
			decision = DecisionUnchanged
		default:
			decision = DecisionCandidate
		}

		decisions = append(decisions, FieldDecision{
			Field:     field,
			Current:   existing,
			Candidate: proposed,
			Decision:  decision,
			Locked:    locked[field],
			WillApply: decision == DecisionFillEmpty,
		})
	}
	return decisions
}

// valuesEqual 复刻 Python 的 == 比较（对切片与 map 做深比较）。
func valuesEqual(a, b any) bool {
	if isEmptyValue(a) && isEmptyValue(b) {
		return true
	}
	return deepEqual(a, b)
}

// deepEqual 对常见 JSON 类型做深比较。
func deepEqual(a, b any) bool {
	switch av := a.(type) {
	case []any:
		bv, ok := b.([]any)
		if !ok || len(av) != len(bv) {
			return false
		}
		for i := range av {
			if !deepEqual(av[i], bv[i]) {
				return false
			}
		}
		return true
	case map[string]any:
		bv, ok := b.(map[string]any)
		if !ok || len(av) != len(bv) {
			return false
		}
		for k, v := range av {
			w, ok := bv[k]
			if !ok || !deepEqual(v, w) {
				return false
			}
		}
		return true
	}
	return a == b
}

// ToBookMetadata 复刻 to_book_metadata：calibre Metadata → BookMetadata。
//
// Go 侧 calibre Metadata 以 map 承载，原对象随记录一并携带在 CalibreMIKey 下。
func ToBookMetadata(mi map[string]any, providerKey string) plugindomain.BookMetadata {
	if mi == nil {
		return plugindomain.BookMetadata{}
	}
	values := make(map[string]any, len(MetadataFields)+1)
	for _, field := range MetadataFields {
		values[field] = mi[field]
	}
	if providerKey != "" && isEmptyValue(values["provider_key"]) {
		values["provider_key"] = providerKey
	}
	values[CalibreMIKey] = mi
	return plugindomain.NewBookMetadata(values)
}

// ToCalibreMetadata 复刻 to_calibre_metadata：取回可直接写回书库的 calibre Metadata。
func ToCalibreMetadata(record map[string]any) map[string]any {
	if record == nil {
		return nil
	}
	mi, _ := record[CalibreMIKey].(map[string]any)
	return mi
}

// CoverResult 是封面下载结果（扩展名 + 字节）。
//
// 复刻 Python 的 (fmt, bytes) 元组。
type CoverResult struct {
	Extension string
	Content   []byte
}

// MetaSource 是元数据源需要实现的搜索/抓取逻辑。
type MetaSource interface {
	// Manifest 返回插件清单。
	Manifest() map[string]any
	// Search 返回 calibre Metadata 列表。
	Search(query plugindomain.MetadataQuery, context map[string]any) ([]map[string]any, error)
	// Fetch 按 external_id 取回单条；未实现时返回 (nil, nil)。
	Fetch(externalID string, context map[string]any) (map[string]any, error)
}

// MetaSourceMixin 复刻 MetaSourceMixin：元数据源共用的 MetadataProvider 样板。
//
// 具体源只需实现 Search（以及可选的 Fetch）；协议要求的三个方法在此统一。
type MetaSourceMixin struct {
	// Source 是具体源的搜索/抓取实现。
	Source MetaSource
	// DefaultEnabled 复刻 default_enabled。
	DefaultEnabled bool
	// LegacySources 复刻 legacy_sources。
	LegacySources []string
}

// NewMetaSourceMixin 构造 mixin，DefaultEnabled 默认 true。
func NewMetaSourceMixin(source MetaSource) *MetaSourceMixin {
	return &MetaSourceMixin{Source: source, DefaultEnabled: true}
}

// InitialEnabled 复刻 initial_enabled。
//
// 元数据源默认开启；显式关闭默认值的源仍可承接旧来源选择。
func (m *MetaSourceMixin) InitialEnabled(settings map[string]any) bool {
	selected := map[string]bool{}
	for _, s := range asStringSlice(settings["META_SELECTED_SOURCES"]) {
		selected[s] = true
	}
	if m.DefaultEnabled {
		return true
	}
	for _, legacy := range m.LegacySources {
		if selected[legacy] {
			return true
		}
	}
	return false
}

// InitialConfig 复刻 initial_config。
func (m *MetaSourceMixin) InitialConfig(settings map[string]any) map[string]any {
	return map[string]any{}
}

// SearchBooks 复刻 search_books。
func (m *MetaSourceMixin) SearchBooks(query any, context map[string]any) ([]plugindomain.BookMetadata, error) {
	q := plugindomain.MetadataQueryFromValue(query)
	if q.IsEmpty() {
		return nil, nil
	}
	key := asString(m.Source.Manifest()["id"])

	metadatas, err := m.Source.Search(q, context)
	if err != nil {
		return nil, err
	}
	records := make([]plugindomain.BookMetadata, 0, len(metadatas))
	for _, metadata := range metadatas {
		if metadata == nil {
			continue
		}
		metadata["provider_key"] = key
		records = append(records, ToBookMetadata(metadata, key))
	}
	return records, nil
}

// GetMetadata 复刻 get_metadata。
func (m *MetaSourceMixin) GetMetadata(externalID string, context map[string]any) (*plugindomain.BookMetadata, error) {
	if externalID == "" {
		return nil, nil
	}
	metadata, err := m.Source.Fetch(externalID, context)
	if err != nil {
		return nil, err
	}
	if metadata == nil {
		return nil, nil
	}
	key := asString(m.Source.Manifest()["id"])
	metadata["provider_key"] = key
	rec := ToBookMetadata(metadata, key)
	return &rec, nil
}

// SelfCheck 复刻 self_check。
func (m *MetaSourceMixin) SelfCheck(context map[string]any) (plugindomain.CheckReport, error) {
	return plugindomain.CheckReport{
		Healthy: true,
		Message: asString(m.Source.Manifest()["name"]) + " ready",
	}, nil
}

// Setting 复刻 _setting：配置双读。
//
// connection.config 优先，缺失时回落已发布的 CONF 键。元数据源的配置在插件
// 体系之前就已随正式版本发布并写入用户的 auto.py，因此不做一次性迁移；
// connection 优先保证用户在插件页做的修改真正生效。
func Setting(config map[string]any, key, confKey string, def any, confLookup func(string) any) any {
	if v, ok := config[key]; ok && !isEmptyValue(v) {
		return v
	}
	if confLookup != nil {
		if v := confLookup(confKey); v != nil {
			return v
		}
	}
	return def
}

// toAnySlice 把字符串切片转成 []any。
func toAnySlice(ss []string) []any {
	out := make([]any, 0, len(ss))
	for _, s := range ss {
		out = append(out, s)
	}
	return out
}

// asString 复刻 Python 的 str(x or "")。
func asString(v any) string {
	switch val := v.(type) {
	case nil:
		return ""
	case string:
		return val
	case bool:
		if val {
			return "True"
		}
		return "False"
	case float64:
		if val == float64(int64(val)) {
			return itoa(int64(val))
		}
		return trimFloat(val)
	case int:
		return itoa(int64(val))
	case int64:
		return itoa(val)
	default:
		return ""
	}
}

// asStringSlice 把值转成字符串切片。
func asStringSlice(v any) []string {
	switch val := v.(type) {
	case nil:
		return nil
	case []string:
		return val
	case []any:
		out := make([]string, 0, len(val))
		for _, item := range val {
			out = append(out, asString(item))
		}
		return out
	case string:
		return []string{val}
	}
	return nil
}
