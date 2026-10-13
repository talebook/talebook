package pluginruntime

import (
	"bytes"
	"encoding/json"
	"fmt"
	"sort"

	"talebook/booksvr/internal/pluginproto"
	"talebook/booksvr/internal/pluginssecrets"
)

// canonicalJSON 复刻 Python json.dumps(v, ensure_ascii=False, sort_keys=True,
// separators=(",", ":")) 的字节输出。
//
// Go 的 encoding/json 默认转义 HTML 字符（< > &），Python 不转义，
// 因此这里关闭 HTML 转义以保持逐字节一致。
func canonicalJSON(v any) ([]byte, error) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		return nil, err
	}
	out := bytes.TrimRight(buf.Bytes(), "\n")
	return out, nil
}

// ValidateCredentials 校验凭据对象。
//
// 对应 Python `_validate_credentials`。
func ValidateCredentials(definition *DefinitionView, credentials map[string]any) error {
	if credentials == nil {
		return NewPluginRuntimeError("plugin.credentials_invalid",
			"Credentials must be an object", false)
	}
	schema := definition.AuthSchema
	properties := anyMap(schema["properties"])
	required := stringSetOf(anyList(schema["required"]))

	for name := range required {
		if _, ok := credentials[name]; !ok {
			return NewPluginRuntimeError("plugin.credentials_missing",
				"Required plugin credentials are missing", false)
		}
	}
	for name := range credentials {
		if _, ok := properties[name]; !ok {
			return NewPluginRuntimeError("plugin.credentials_unknown",
				"Credentials contain undeclared fields", false)
		}
	}
	for _, value := range credentials {
		s, ok := value.(string)
		if !ok || s == "" {
			return NewPluginRuntimeError("plugin.credentials_invalid",
				"Credential values must be non-empty strings", false)
		}
	}
	return nil
}

// DefinitionView 是校验所需的定义视图（auth_schema / config_schema）。
type DefinitionView struct {
	AuthSchema   map[string]any
	ConfigSchema map[string]any
}

// ValidatePublicConfig 校验连接配置：先查凭据泄漏，再查形状。
//
// 泄漏是更严重且更有信息量的错误，不应被 unknown_field 掩盖。
func ValidatePublicConfig(config map[string]any, credentials map[string]any,
	configSchema map[string]any) error {
	if config == nil {
		return NewPluginRuntimeError("plugin.config_invalid",
			"Plugin config must be an object", false)
	}

	secretValues := map[string]bool{}
	for _, v := range credentials {
		if v == nil {
			continue
		}
		if s, ok := v.(string); ok && s != "" {
			secretValues[s] = true
		}
	}

	if err := visitConfig(config, "", secretValues); err != nil {
		return err
	}

	if len(configSchema) > 0 {
		// config_schema 此前只用于前端渲染表单，后端零校验，任意键值都能流入
		// context["config"]。这里让声明真正生效；平台保留键并入允许集合。
		merged := map[string]any{
			"type": "object",
			"properties": mergeProperties(
				anyMap(PlatformConfigSchema["properties"]),
				anyMap(configSchema["properties"]),
			),
			"required": anyList(configSchema["required"]),
		}
		if err := pluginproto.ValidateAgainstSchema(merged, config, "config"); err != nil {
			if me, ok := err.(*pluginproto.ManifestError); ok {
				return NewPluginRuntimeError(me.Code, me.Message, false)
			}
			return NewPluginRuntimeError("plugin.config_invalid", err.Error(), false)
		}
	}
	return nil
}

// visitConfig 递归检查敏感键名与凭据值泄漏。
func visitConfig(value any, key string, secretValues map[string]bool) error {
	if key != "" && pluginssecrets.IsSensitiveKey(key) {
		return NewPluginRuntimeError("plugin.secret_in_config",
			"Secrets must be stored in the credentials object", false)
	}
	switch t := value.(type) {
	case map[string]any:
		// 按 key 排序保证错误信息确定性。
		keys := make([]string, 0, len(t))
		for k := range t {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, k := range keys {
			if err := visitConfig(t[k], k, secretValues); err != nil {
				return err
			}
		}
	case []any:
		for _, child := range t {
			if err := visitConfig(child, key, secretValues); err != nil {
				return err
			}
		}
	default:
		if s, ok := value.(string); ok && secretValues[s] {
			return NewPluginRuntimeError("plugin.secret_in_config",
				"Credential values cannot be copied into plugin config", false)
		}
	}
	return nil
}

// mergeProperties 合并平台保留键与插件声明的属性（插件声明优先）。
func mergeProperties(platform, declared map[string]any) map[string]any {
	out := make(map[string]any, len(platform)+len(declared))
	for k, v := range platform {
		out[k] = v
	}
	for k, v := range declared {
		out[k] = v
	}
	return out
}

// asErrorString 便于错误信息拼接。
func asErrorString(err error) string {
	if err == nil {
		return ""
	}
	return fmt.Sprint(err)
}
