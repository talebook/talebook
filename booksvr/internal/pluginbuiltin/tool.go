package pluginbuiltin

import (
	"os"

	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginproto"
	"talebook/booksvr/internal/pluginruntime"
)

// toolManifest 复刻 tool/base.py:_manifest。
func toolManifest(pluginID, name, description, icon, manageRoute, healthyMessage string,
	uiExtra map[string]any, configSchema map[string]any) map[string]any {
	ui := map[string]any{
		"icon":            icon,
		"manage_route":    manageRoute,
		"primary_action":  "open",
		"healthy_message": healthyMessage,
	}
	for k, v := range uiExtra {
		ui[k] = v
	}
	if configSchema == nil {
		configSchema = map[string]any{"type": "object", "properties": map[string]any{}}
	}
	return map[string]any{
		"protocol_version": pluginproto.ProtocolVersion,
		"id":               pluginID,
		"name":             name,
		"description":      description,
		"version":          "1.0.0",
		"categories":       []any{"integrations"},
		"capabilities":     []any{"integrations.tool"},
		"runtime_kind":     "builtin",
		"actions":          []any{"test"},
		"auth_schema":      map[string]any{"type": "object", "properties": map[string]any{}},
		"config_schema":    configSchema,
		"permissions":      []any{"books.read", "books.write"},
		"data_policy":      map[string]any{"stores_full_text": false, "retention": "source_owned"},
		"compatibility":    map[string]any{"talebook": ">=0.1.0"},
		// Talebook 自有能力由管理员在实例级配置，不存在每用户连接。
		"connection_owners": []any{"instance"},
		"homepage":          "https://github.com/talebook/talebook",
		"license":           "GPL-3.0",
		"ui":                ui,
	}
}

// toolCaps 是正文工具的能力声明。
func toolCaps() pluginiface.CapabilitySet {
	return pluginiface.CapabilitySet{
		Interfaces:   map[string]bool{"TransformProvider": true},
		HasSelfCheck: true,
		Methods:      map[string]bool{"self_check": true},
	}
}

// registerToolProviders 注册 4 个正文工具。
//
// 顺序与 Python register.py 的 TOOL_PROVIDERS 一致。
func registerToolProviders(reg *pluginruntime.PluginRegistry) error {
	providers := []pluginiface.Provider{
		newTextReplaceProvider(),
		newZhConverterProvider(),
		newTxtFixerProvider(),
		newEpubBeautifyProvider(),
	}
	for _, p := range providers {
		if _, err := reg.Register(p, toolCaps()); err != nil {
			return err
		}
	}
	return nil
}

// toolBase 复刻 TextTransformPlugin + BuiltinCapabilityProvider 的公共部分。
type toolBase struct {
	ManifestDict   map[string]any
	Formats        map[string]bool
	AutoTrigger    bool
	HealthyMessage string
}

// Manifest 满足 pluginiface.Provider。
func (b *toolBase) Manifest() map[string]any { return b.ManifestDict }

// SupportedFormats 复刻 supported_formats。
func (b *toolBase) SupportedFormats() map[string]bool { return b.Formats }

// SupportsAutoTrigger 复刻 supports_auto_trigger。
func (b *toolBase) SupportsAutoTrigger() bool { return b.AutoTrigger }

// SelfCheck 复刻 self_check。
func (b *toolBase) SelfCheck(context map[string]any) (plugindomain.CheckReport, error) {
	return plugindomain.CheckReport{Healthy: true, Message: b.HealthyMessage}, nil
}

// InitialEnabled 复刻 initial_enabled：无 enabled_setting 时恒为 True。
func (b *toolBase) InitialEnabled(settings map[string]any) bool { return true }

// InitialConfig 复刻缺省行为：空配置。
func (b *toolBase) InitialConfig(settings map[string]any) map[string]any {
	return map[string]any{}
}

// Invoke must dispatch the concrete tool, since the embedded base does not
// implement Preview/Apply and Go embedding does not provide virtual dispatch.
func (p *TextReplaceProvider) Invoke(method string, args []any, context map[string]any) (any, error) {
	return DispatchInvoke(p, method, args, context)
}
func (p *TxtFixerProvider) Invoke(method string, args []any, context map[string]any) (any, error) {
	return DispatchInvoke(p, method, args, context)
}
func (p *ZhConverterProvider) Invoke(method string, args []any, context map[string]any) (any, error) {
	return DispatchInvoke(p, method, args, context)
}
func (p *EpubBeautifyProvider) Invoke(method string, args []any, context map[string]any) (any, error) {
	return DispatchInvoke(p, method, args, context)
}

// toolPath 复刻 TextTransformPlugin._path。
func toolPath(src plugindomain.ToolInput, formats map[string]bool) (string, string, error) {
	path, _ := src.Get("path").(string)
	format, _ := src.Get("format").(string)
	format = upper(format)
	if path == "" {
		return "", "", pluginproto.NewUpstreamError("Transform input file is missing", "other", nil)
	}
	if info, err := os.Stat(path); err != nil || info.IsDir() {
		return "", "", pluginproto.NewUpstreamError("Transform input file is missing", "other", nil)
	}
	if len(formats) > 0 && !formats[format] {
		return "", "", pluginproto.NewUpstreamError("Transform input format is not supported", "other", nil)
	}
	return path, format, nil
}

// upper 复刻 str.upper() 的 ASCII 语义。
func upper(s string) string {
	out := []rune(s)
	for i, r := range out {
		if r >= 'a' && r <= 'z' {
			out[i] = r - 32
		}
	}
	return string(out)
}

// lower 复刻 str.lower() 的 ASCII 语义。
func lower(s string) string {
	out := []rune(s)
	for i, r := range out {
		if r >= 'A' && r <= 'Z' {
			out[i] = r + 32
		}
	}
	return string(out)
}
