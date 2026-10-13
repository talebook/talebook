// Package pluginruntime 复刻 webserver/services/plugin_runtime.py 的注册表与错误层。
//
// 本文件覆盖 plugin_runtime.py 第 46-152 行：常量、PluginRuntimeError、
// _redacted_exception、PluginRegistry 与全局 REGISTRY。
package pluginruntime

import (
	"errors"
	"fmt"
	"sort"
	"strings"

	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginproto"
	"talebook/booksvr/internal/pluginssecrets"
	"talebook/booksvr/internal/safehttp"
)

// TerminalStatuses 是终态运行状态集合。
var TerminalStatuses = map[string]bool{
	"succeeded":   true,
	"failed":      true,
	"partial":     true,
	"rolled_back": true,
}

// EntityTypes 是插件可声明的实体类型集合。
var EntityTypes = map[string]bool{
	"metadata":    true,
	"annotation":  true,
	"review":      true,
	"book_source": true,
}

// 连接的查询键。历史数据用中文展示名当键，改文案即丢连接且无法 i18n。
const (
	BuiltinConnectionRole = "builtin"
	DefaultConnectionRole = "default"
)

// DefaultCounts 是运行计数的零值。
var DefaultCounts = map[string]int{
	"fetched":   0,
	"written":   0,
	"updated":   0,
	"skipped":   0,
	"failed":    0,
	"conflicts": 0,
}

// PlatformConfigSchema 是运行时自身读取的连接配置。
//
// 它不属于任何插件的 config_schema，但对每个连接都合法。
var PlatformConfigSchema = map[string]any{
	"type": "object",
	"properties": map[string]any{
		"timeout_seconds": map[string]any{"type": "number", "minimum": 0.01, "maximum": 3600},
		"max_retries":     map[string]any{"type": "integer", "minimum": 0, "maximum": 5},
		"backoff_seconds": map[string]any{"type": "number", "minimum": 0, "maximum": 60},
		safehttp.HostConcurrencyConfigKey: map[string]any{
			"type":    "integer",
			"minimum": 1,
			"maximum": 100,
			"default": safehttp.DefaultHostConcurrency,
		},
	},
}

// PluginRuntimeError 是运行时的可分类错误。
type PluginRuntimeError struct {
	Code      string
	Message   string
	Retryable bool
}

func (e *PluginRuntimeError) Error() string { return e.Message }

// NewPluginRuntimeError 构造运行时错误。
func NewPluginRuntimeError(code, message string, retryable bool) *PluginRuntimeError {
	return &PluginRuntimeError{Code: code, Message: message, Retryable: retryable}
}

// HostConcurrency 从 context 的 config 中读取主机并发上限，钳制到 [1, 100]。
func HostConcurrency(context map[string]any) int {
	value := safehttp.DefaultHostConcurrency
	if cfg, ok := context["config"].(map[string]any); ok {
		if raw, ok := cfg[safehttp.HostConcurrencyConfigKey]; ok {
			value = toInt(raw, safehttp.DefaultHostConcurrency)
		}
	}
	if value < 1 {
		return 1
	}
	if value > 100 {
		return 100
	}
	return value
}

// toInt 复刻 Python int() 对数值/字符串的转换。
func toInt(v any, fallback int) int {
	switch t := v.(type) {
	case int:
		return t
	case int64:
		return int(t)
	case float64:
		return int(t)
	case float32:
		return int(t)
	case string:
		var n int
		if _, err := fmt.Sscanf(strings.TrimSpace(t), "%d", &n); err == nil {
			return n
		}
	}
	return fallback
}

// RedactedException 克隆 provider 失败，并在离开运行时前擦除消息中的凭据。
//
// 对应 Python `_redacted_exception`。Go 的 errors.As 不穿透嵌入结构体，
// 因此这里按具体类型逐层判断，与 Python 的 isinstance 顺序保持一致。
func RedactedException(err error, secrets map[string]any) error {
	if err == nil {
		return nil
	}
	message := stringifyRedacted(pluginssecrets.Redact(err.Error(), secrets))

	// 1) PluginRuntimeError 优先（Python 中它是 RuntimeError 子类，先判）。
	var runtimeErr *PluginRuntimeError
	if asError(err, &runtimeErr) {
		return NewPluginRuntimeError(runtimeErr.Code, message, runtimeErr.Retryable)
	}

	// 2) 上游错误（含限流与鉴权子类，按 Code 区分）。
	var upstreamErr *pluginproto.UpstreamError
	if asError(err, &upstreamErr) {
		switch upstreamErr.Code {
		case "provider_rate_limited":
			return pluginproto.NewUpstreamRateLimitError(message, nil)
		case "provider_unauthorized":
			return pluginproto.NewUpstreamAuthError(message, upstreamErr.ErrorType, upstreamErr.StatusCode)
		default:
			return pluginproto.NewUpstreamError(message, upstreamErr.ErrorType, upstreamErr.StatusCode)
		}
	}

	// 4) 兜底：保留 code/retryable 属性（若实现）。
	code := "plugin.execution_failed"
	retryable := false
	if coder, ok := err.(interface{ Code() string }); ok {
		if c := coder.Code(); c != "" {
			code = c
		}
	}
	if r, ok := err.(interface{ Retryable() bool }); ok {
		retryable = r.Retryable()
	}
	return NewPluginRuntimeError(code, message, retryable)
}

// asError 是 errors.As 的薄封装，避免本文件重复导入 errors。
func asError[T error](err error, target *T) bool {
	return errors.As(err, target)
}

// stringifyRedacted 把 Redact 结果转成字符串。
func stringifyRedacted(v any) string {
	if s, ok := v.(string); ok {
		return s
	}
	return fmt.Sprint(v)
}

// PluginRegistry 保存已注册的 provider。
type PluginRegistry struct {
	providers map[string]pluginiface.Provider
	order     []string
}

// NewPluginRegistry 构造空注册表。
func NewPluginRegistry() *PluginRegistry {
	return &PluginRegistry{providers: map[string]pluginiface.Provider{}}
}

// Register 校验清单与契约后注册 provider，返回校验后的清单。
//
// 契约违反在注册期即失败，而不是等到用户点「运行」时报通用的
// plugin.execution_failed。
func (r *PluginRegistry) Register(provider pluginiface.Provider, caps pluginiface.CapabilitySet) (map[string]any, error) {
	manifest, err := pluginproto.ValidateManifest(provider.Manifest())
	if err != nil {
		return nil, err
	}
	raw := pluginiface.ManifestFromProto(manifest)
	problems := pluginiface.ContractViolations(raw, caps)
	if len(problems) > 0 {
		return nil, fmt.Errorf("插件 %T 未满足契约：%s", provider, strings.Join(problems, "；"))
	}
	id := asString(raw["id"])
	r.providers[id] = provider
	r.order = append(r.order, id)
	return raw, nil
}

// Providers 返回全部 provider（按注册顺序）。
func (r *PluginRegistry) Providers() []pluginiface.Provider {
	out := make([]pluginiface.Provider, 0, len(r.order))
	for _, id := range r.order {
		out = append(out, r.providers[id])
	}
	return out
}

// Get 按 plugin_key 取 provider，缺失时报 plugin.provider_unavailable。
func (r *PluginRegistry) Get(pluginKey string) (pluginiface.Provider, error) {
	provider, ok := r.providers[pluginKey]
	if !ok {
		return nil, NewPluginRuntimeError("plugin.provider_unavailable", "Plugin provider is not available", false)
	}
	return provider, nil
}

// Manifests 返回全部已校验清单（按注册顺序）。
func (r *PluginRegistry) Manifests() ([]map[string]any, error) {
	out := make([]map[string]any, 0, len(r.order))
	for _, id := range r.order {
		manifest, err := pluginproto.ValidateManifest(r.providers[id].Manifest())
		if err != nil {
			return nil, err
		}
		out = append(out, pluginiface.ManifestFromProto(manifest))
	}
	return out, nil
}

// AllowsImageProxyHost 判断 host 是否被任一 provider 声明为图片代理白名单。
//
// 匹配规则：大小写不敏感、去尾点，允许子域（`a.example.com` 命中 `example.com`）。
func (r *PluginRegistry) AllowsImageProxyHost(host string) bool {
	hostname := normalizeHost(host)
	if hostname == "" {
		return false
	}
	for _, id := range r.order {
		declared, ok := r.providers[id].(interface{ ProxyImageHosts() []string })
		if !ok {
			continue
		}
		for _, raw := range declared.ProxyImageHosts() {
			allowed := normalizeHost(raw)
			if allowed == "" {
				continue
			}
			if hostname == allowed || strings.HasSuffix(hostname, "."+allowed) {
				return true
			}
		}
	}
	return false
}

// normalizeHost 复刻 `str(host or "").strip().lower().rstrip(".")`。
func normalizeHost(host string) string {
	return strings.TrimRight(strings.ToLower(strings.TrimSpace(host)), ".")
}

// asString 复刻 Python str() 在清单字段上的行为。
func asString(v any) string {
	switch t := v.(type) {
	case nil:
		return ""
	case string:
		return t
	default:
		return fmt.Sprint(t)
	}
}

// SortedIDs 返回按字典序排序的已注册 plugin_key（便于确定性输出）。
func (r *PluginRegistry) SortedIDs() []string {
	out := append([]string(nil), r.order...)
	sort.Strings(out)
	return out
}
