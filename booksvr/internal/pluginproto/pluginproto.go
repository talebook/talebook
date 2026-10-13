// Package pluginproto 复刻 webserver/plugins/runtime/protocol.py。
//
// 包含插件清单（manifest）校验、协议常量与上游错误类型。
package pluginproto

import (
	"fmt"
	"regexp"
	"sort"
	"strings"
)

// ProtocolVersion 是当前插件协议版本。
const ProtocolVersion = "talebook.plugin/v1"

// Categories 是允许的插件类别。
var Categories = map[string]bool{
	"metadata": true, "annotations": true, "reviews": true,
	"sources": true, "integrations": true,
}

// RuntimeKinds 是允许的运行时类型。
var RuntimeKinds = map[string]bool{
	"builtin": true, "file": true, "http": true, "managed_process": true,
}

// Actions 是允许的动作。
var Actions = map[string]bool{
	"test": true, "preview": true, "run": true, "retry": true, "rollback": true,
}

// RequiredManifestFields 是 manifest 必填字段。
var RequiredManifestFields = []string{
	"protocol_version", "id", "name", "version", "categories", "capabilities",
	"runtime_kind", "actions", "auth_schema", "config_schema", "connection_owners",
	"permissions", "data_policy", "compatibility", "homepage", "license",
}

// OptionalManifestFields 是可选但受类型约束的字段；
// 其余未知键一律拒绝，避免协议被悄悄扩写。
var OptionalManifestFields = []string{
	"description", "ui", "download_mode", "extra_features",
}

// ConnectionOwners 是允许的连接归属。
var ConnectionOwners = map[string]bool{"instance": true, "user": true}

var (
	// PluginIDRe 校验插件 ID。
	PluginIDRe = regexp.MustCompile(`^[a-z0-9]+(?:[.-][a-z0-9]+)+$`)
	// VersionRe 校验语义化版本。
	VersionRe = regexp.MustCompile(`^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$`)
	// CapabilityRe 校验能力名。
	CapabilityRe = regexp.MustCompile(`^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$`)
)

// ManifestError 复刻 ManifestError，带错误码。
type ManifestError struct {
	Code    string
	Message string
}

// Error 实现 error 接口。
func (e *ManifestError) Error() string { return e.Message }

// newManifestError 构造 ManifestError。
func newManifestError(code, message string) *ManifestError {
	return &ManifestError{Code: code, Message: message}
}

// UpstreamError 复刻 UpstreamError。
type UpstreamError struct {
	Code       string
	Retryable  bool
	ErrorType  string
	StatusCode *int
	Message    string
}

// Error 实现 error 接口。
func (e *UpstreamError) Error() string { return e.Message }

// NewUpstreamError 复刻 UpstreamError.__init__。
func NewUpstreamError(message string, errorType string, statusCode *int) *UpstreamError {
	if message == "" {
		message = "Upstream request failed"
	}
	if errorType == "" {
		errorType = "other"
	}
	return &UpstreamError{
		Code: "provider_error", Retryable: false,
		ErrorType: errorType, StatusCode: statusCode, Message: message,
	}
}

// NewUpstreamAuthError 复刻 UpstreamAuthError。
func NewUpstreamAuthError(message string, errorType string, statusCode *int) *UpstreamError {
	e := NewUpstreamError(message, errorType, statusCode)
	e.Code = "provider_unauthorized"
	return e
}

// NewUpstreamRateLimitError 复刻 UpstreamRateLimitError。
func NewUpstreamRateLimitError(message string, retryAfter any) *UpstreamError {
	if message == "" {
		message = "Upstream rate limit exceeded"
	}
	return &UpstreamError{
		Code: "provider_rate_limited", Retryable: true,
		ErrorType: "other", Message: message,
	}
}

// ProviderItem 复刻 ProviderItem。
type ProviderItem struct {
	ExternalID      string
	EntityType      string
	Data            any
	RemoteUpdatedAt *string
	ErrorCode       string
	ErrorMessage    string
}

// NewProviderItem 复刻 ProviderItem.__post_init__ 的 book_source 补全。
//
// entity_type 为 book_source 且 data 是 map 且缺 external_id 时补上。
func NewProviderItem(externalID, entityType string, data any, remoteUpdatedAt *string) ProviderItem {
	if entityType == "book_source" {
		if m, ok := data.(map[string]any); ok {
			if _, has := m["external_id"]; !has {
				merged := make(map[string]any, len(m)+1)
				merged["external_id"] = externalID
				for k, v := range m {
					merged[k] = v
				}
				data = merged
			}
		}
	}
	return ProviderItem{
		ExternalID: externalID, EntityType: entityType,
		Data: data, RemoteUpdatedAt: remoteUpdatedAt,
	}
}

// ProviderResult 复刻 ProviderResult。
type ProviderResult struct {
	Items         []ProviderItem
	NextCursor    map[string]any
	HealthMessage string
}

// PluginManifest 复刻 PluginManifest。
type PluginManifest struct {
	Raw map[string]any
}

// Validate 复刻 PluginManifest.validate。
func ValidateManifest(raw any) (*PluginManifest, error) {
	m, ok := raw.(map[string]any)
	if !ok {
		return nil, newManifestError("manifest.invalid", "manifest must be an object")
	}

	// 必填字段。
	var missing []string
	for _, f := range RequiredManifestFields {
		if _, ok := m[f]; !ok {
			missing = append(missing, f)
		}
	}
	if len(missing) > 0 {
		sort.Strings(missing)
		return nil, newManifestError("manifest.missing_fields",
			"missing manifest fields: "+strings.Join(missing, ", "))
	}

	if asString(m["protocol_version"]) != ProtocolVersion {
		return nil, newManifestError("manifest.protocol_unsupported", "unsupported plugin protocol version")
	}

	pluginID, _ := m["id"].(string)
	if pluginID == "" || len(pluginID) > 200 || !PluginIDRe.MatchString(pluginID) {
		return nil, newManifestError("manifest.id_invalid",
			"plugin id must be a dotted lowercase identifier of at most 200 characters")
	}

	version, _ := m["version"].(string)
	if !VersionRe.MatchString(version) {
		return nil, newManifestError("manifest.version_invalid", "plugin version must be semantic versioning")
	}

	name, _ := m["name"].(string)
	if strings.TrimSpace(name) == "" {
		return nil, newManifestError("manifest.name_invalid", "plugin name is required")
	}

	if !RuntimeKinds[asString(m["runtime_kind"])] {
		return nil, newManifestError("manifest.runtime_invalid", "unsupported runtime kind")
	}

	categories, err := stringSet(m, "categories", false)
	if err != nil {
		return nil, err
	}
	if len(categories) == 0 {
		return nil, newManifestError("manifest.category_invalid", "manifest contains unsupported categories")
	}
	for c := range categories {
		if !Categories[c] {
			return nil, newManifestError("manifest.category_invalid", "manifest contains unsupported categories")
		}
	}

	capabilities, err := stringSet(m, "capabilities", false)
	if err != nil {
		return nil, err
	}
	if len(capabilities) == 0 {
		return nil, newManifestError("manifest.capability_invalid", "at least one capability is required")
	}
	for c := range capabilities {
		if !CapabilityRe.MatchString(c) {
			return nil, newManifestError("manifest.capability_invalid",
				"capability must use a declared category prefix")
		}
		prefix := strings.SplitN(c, ".", 2)[0]
		if !categories[prefix] {
			return nil, newManifestError("manifest.capability_invalid",
				"capability must use a declared category prefix")
		}
	}

	actions, err := stringSet(m, "actions", false)
	if err != nil {
		return nil, err
	}
	if len(actions) == 0 {
		return nil, newManifestError("manifest.action_invalid", "manifest contains unsupported actions")
	}
	for a := range actions {
		if !Actions[a] {
			return nil, newManifestError("manifest.action_invalid", "manifest contains unsupported actions")
		}
	}

	for _, key := range []string{"auth_schema", "config_schema", "data_policy", "compatibility"} {
		if _, ok := m[key].(map[string]any); !ok {
			return nil, newManifestError("manifest.schema_invalid", key+" must be an object")
		}
	}

	permissions, err := stringSet(m, "permissions", true)
	if err != nil {
		return nil, err
	}
	for p := range permissions {
		if !CapabilityRe.MatchString(p) {
			return nil, newManifestError("manifest.permission_invalid",
				"permissions must use dotted lowercase identifiers")
		}
	}

	owners, err := stringSet(m, "connection_owners", false)
	if err != nil {
		return nil, err
	}
	for o := range owners {
		if !ConnectionOwners[o] {
			return nil, newManifestError("manifest.connection_owner_invalid",
				"connection_owners must be instance and/or user")
		}
	}

	if _, ok := m["homepage"].(string); !ok {
		return nil, newManifestError("manifest.metadata_invalid", "homepage and license must be strings")
	}
	if _, ok := m["license"].(string); !ok {
		return nil, newManifestError("manifest.metadata_invalid", "homepage and license must be strings")
	}

	if ui, ok := m["ui"]; ok {
		if _, ok := ui.(map[string]any); !ok {
			return nil, newManifestError("manifest.ui_invalid", "ui must be an object")
		}
	}
	if desc, ok := m["description"]; ok {
		if _, ok := desc.(string); !ok {
			return nil, newManifestError("manifest.description_invalid", "description must be a string")
		}
	}

	if dm, ok := m["download_mode"]; ok && dm != nil {
		s := asString(dm)
		if s != "single_book" && s != "by_chapters" && s != "none" {
			return nil, newManifestError("manifest.download_mode_invalid", "download_mode is invalid")
		}
	}

	if ef, ok := m["extra_features"]; ok {
		features, ok := ef.(map[string]any)
		if !ok {
			return nil, newManifestError("manifest.extra_features_invalid", "extra_features must be an object")
		}
		for action, feature := range features {
			if action == "" {
				return nil, newManifestError("manifest.extra_features_invalid",
					"extra feature declarations are invalid")
			}
			fm, ok := feature.(map[string]any)
			if !ok {
				return nil, newManifestError("manifest.extra_features_invalid",
					"extra feature declarations are invalid")
			}
			mode := asString(fm["mode"])
			if mode != "read" && mode != "write" && mode != "sync" {
				return nil, newManifestError("manifest.extra_features_invalid",
					"extra feature mode and schema are required")
			}
			if _, ok := fm["schema"].(map[string]any); !ok {
				return nil, newManifestError("manifest.extra_features_invalid",
					"extra feature mode and schema are required")
			}
			scopes, err := optionalStringList(fm["required_scopes"])
			if err != nil {
				return nil, newManifestError("manifest.extra_features_invalid",
					"extra feature scopes must be declared plugin permissions")
			}
			for _, s := range scopes {
				if !permissions[s] {
					return nil, newManifestError("manifest.extra_features_invalid",
						"extra feature scopes must be declared plugin permissions")
				}
			}
		}
	}

	// 未知键（x- 前缀除外）。
	var unknown []string
	for key := range m {
		if contains(RequiredManifestFields, key) || contains(OptionalManifestFields, key) {
			continue
		}
		if strings.HasPrefix(key, "x-") {
			continue
		}
		unknown = append(unknown, key)
	}
	if len(unknown) > 0 {
		sort.Strings(unknown)
		return nil, newManifestError("manifest.unknown_field",
			"manifest contains unknown fields: "+strings.Join(unknown, ", "))
	}

	if err := rejectSecretDefaults(m["auth_schema"]); err != nil {
		return nil, err
	}

	out := make(map[string]any, len(m))
	for k, v := range m {
		out[k] = v
	}
	return &PluginManifest{Raw: out}, nil
}

// ToDict 复刻 PluginManifest.to_dict。
func (p *PluginManifest) ToDict() map[string]any {
	out := make(map[string]any, len(p.Raw))
	for k, v := range p.Raw {
		out[k] = v
	}
	return out
}

// rejectSecretDefaults 复刻 _reject_secret_defaults。
func rejectSecretDefaults(schema any) error {
	s, ok := schema.(map[string]any)
	if !ok {
		return newManifestError("manifest.auth_schema_invalid", "auth_schema.properties must be an object")
	}
	props, ok := s["properties"].(map[string]any)
	if !ok {
		return newManifestError("manifest.auth_schema_invalid", "auth_schema.properties must be an object")
	}
	for name, fs := range props {
		field, ok := fs.(map[string]any)
		if !ok {
			return newManifestError("manifest.auth_schema_invalid", "auth schema fields must be objects")
		}
		if _, has := field["default"]; has {
			return newManifestError("manifest.secret_default_forbidden", "secret fields cannot define defaults")
		}
		if wo, _ := field["writeOnly"].(bool); !wo {
			return newManifestError("manifest.secret_write_only",
				"secret field "+name+" must be writeOnly")
		}
	}
	return nil
}

// stringSet 复刻 _string_set。
func stringSet(raw map[string]any, key string, allowEmpty bool) (map[string]bool, error) {
	values, err := optionalStringList(raw[key])
	if err != nil {
		return nil, newManifestError("manifest."+key+"_invalid", key+" must be a list of strings")
	}
	if raw[key] == nil {
		return nil, newManifestError("manifest."+key+"_invalid", key+" must be a list of strings")
	}
	out := make(map[string]bool, len(values))
	for _, v := range values {
		if out[v] {
			return nil, newManifestError("manifest."+key+"_duplicate", key+" must not contain duplicates")
		}
		out[v] = true
	}
	if !allowEmpty && len(out) == 0 {
		return nil, newManifestError("manifest."+key+"_invalid", key+" must not be empty")
	}
	return out, nil
}

// optionalStringList 把值转成字符串列表；非列表或含非字符串元素时报错。
func optionalStringList(v any) ([]string, error) {
	if v == nil {
		return nil, nil
	}
	list, ok := v.([]any)
	if !ok {
		if ss, ok := v.([]string); ok {
			return ss, nil
		}
		return nil, fmt.Errorf("not a list")
	}
	out := make([]string, 0, len(list))
	for _, item := range list {
		s, ok := item.(string)
		if !ok || s == "" {
			return nil, fmt.Errorf("not a string")
		}
		out = append(out, s)
	}
	return out, nil
}

// jsonTypes 复刻 _JSON_TYPES。
var jsonTypes = map[string]string{
	"string": "string", "integer": "integer", "number": "number",
	"boolean": "boolean", "array": "array", "object": "object",
}

// ValidateAgainstSchema 复刻 validate_against_schema。
//
// 只覆盖现有 manifest 实际用到的子集：type、properties、required、enum、
// minimum/maximum、items.type。未声明的键一律拒绝。
//
// 注意：where 为空时 Python 不做默认值替换，错误码会变成 ".unknown_field"、
// 消息变成 "unknown  fields: zzz"（双空格）。Go 保持同样行为。
func ValidateAgainstSchema(schema any, value any, where string) error {
	s, ok := schema.(map[string]any)
	if !ok || len(s) == 0 {
		return nil
	}
	v, ok := value.(map[string]any)
	if !ok {
		return newManifestError(where+".invalid", where+" must be an object")
	}

	props, _ := s["properties"].(map[string]any)
	var unknown []string
	for k := range v {
		if _, ok := props[k]; !ok {
			unknown = append(unknown, k)
		}
	}
	if len(unknown) > 0 {
		sort.Strings(unknown)
		return newManifestError(where+".unknown_field",
			"unknown "+where+" fields: "+strings.Join(unknown, ", "))
	}

	var missing []string
	if req, ok := s["required"].([]any); ok {
		for _, r := range req {
			name, _ := r.(string)
			if _, ok := v[name]; !ok {
				missing = append(missing, name)
			}
		}
	}
	if len(missing) > 0 {
		sort.Strings(missing)
		return newManifestError(where+".missing_field",
			"missing "+where+" fields: "+strings.Join(missing, ", "))
	}

	for name, fs := range props {
		val, ok := v[name]
		if !ok {
			continue
		}
		field, ok := fs.(map[string]any)
		if !ok {
			continue
		}
		if err := validateField(field, val, where+"."+name); err != nil {
			return err
		}
	}
	return nil
}

// validateField 复刻 _validate_field。
func validateField(schema map[string]any, value any, path string) error {
	where := path
	if i := strings.Index(path, "."); i >= 0 {
		where = path[:i]
	}

	expected := asString(schema["type"])
	if _, known := jsonTypes[expected]; known {
		// JSON 里 bool 是 int 的子类，但 {"type": "integer"} 不应接受 true。
		if (expected == "integer" || expected == "number") && isBool(value) {
			return newManifestError(where+".type_invalid", path+" must be "+expected)
		}
		if !matchesJSONType(expected, value) {
			return newManifestError(where+".type_invalid", path+" must be "+expected)
		}
	}

	if choices, ok := schema["enum"].([]any); ok && len(choices) > 0 {
		found := false
		for _, c := range choices {
			if fmt.Sprintf("%v", c) == fmt.Sprintf("%v", value) {
				found = true
				break
			}
		}
		if !found {
			parts := make([]string, 0, len(choices))
			for _, c := range choices {
				parts = append(parts, fmt.Sprintf("%v", c))
			}
			return newManifestError(where+".enum_invalid",
				path+" must be one of "+strings.Join(parts, ", "))
		}
	}

	if num, ok := toFloat(value); ok && !isBool(value) {
		if min, ok := toFloat(schema["minimum"]); ok && num < min {
			return newManifestError(where+".range_invalid",
				fmt.Sprintf("%s must be >= %v", path, schema["minimum"]))
		}
		if max, ok := toFloat(schema["maximum"]); ok && num > max {
			return newManifestError(where+".range_invalid",
				fmt.Sprintf("%s must be <= %v", path, schema["maximum"]))
		}
	}

	if list, ok := value.([]any); ok {
		if items, ok := schema["items"].(map[string]any); ok {
			itemType := asString(items["type"])
			if _, known := jsonTypes[itemType]; known {
				for _, item := range list {
					if !matchesJSONType(itemType, item) {
						return newManifestError(where+".item_invalid",
							path+" items have an unexpected type")
					}
				}
			}
		}
	}
	return nil
}

// matchesJSONType 判断值是否匹配 JSON 类型名。
func matchesJSONType(expected string, value any) bool {
	switch expected {
	case "string":
		_, ok := value.(string)
		return ok
	case "integer":
		_, ok := value.(float64)
		if ok {
			return true
		}
		_, ok = value.(int)
		if ok {
			return true
		}
		_, ok = value.(int64)
		return ok
	case "number":
		_, ok := toFloat(value)
		return ok
	case "boolean":
		_, ok := value.(bool)
		return ok
	case "array":
		_, ok := value.([]any)
		if ok {
			return true
		}
		_, ok = value.([]string)
		return ok
	case "object":
		_, ok := value.(map[string]any)
		return ok
	}
	return true
}

// isBool 判断是否为布尔值。
func isBool(v any) bool {
	_, ok := v.(bool)
	return ok
}

// toFloat 把数值转成 float64。
func toFloat(v any) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case float32:
		return float64(n), true
	case int:
		return float64(n), true
	case int64:
		return float64(n), true
	}
	return 0, false
}

// asString 复刻 Python 的 str(x)。
func asString(v any) string {
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	return fmt.Sprintf("%v", v)
}

// contains 判断字符串切片是否包含目标。
func contains(list []string, target string) bool {
	for _, s := range list {
		if s == target {
			return true
		}
	}
	return false
}
