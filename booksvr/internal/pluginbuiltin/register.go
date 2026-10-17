// Package pluginbuiltin 是 booksvr 内置插件的唯一装配入口。
//
// 对应 Python 的 webserver/plugins/register.py：类型包不维护第二份隐式注册表，
// 全部内置 provider 在此集中注册。Python 侧在 plugin_runtime 模块导入时遍历
// ALL_BUILTIN_PROVIDERS 注册；Go 侧由启动装配显式调用 Register。
package pluginbuiltin

import (
	"fmt"

	"talebook/booksvr/internal/pluginruntime"
)

// Register 把全部内置 provider 注册进注册表。
//
// 注册失败（manifest 非法或契约违反）直接返回错误，由调用方决定启动失败，
// 与 Python 在模块导入期抛错一致——不静默跳过，避免注册表静默空转。
//
// 注册顺序与 Python register.py 的 PROVIDER_GROUPS 一致：
// combo / source / meta / review / annotation / tool / push。
// 每个分组的 provider 与 CapabilitySet 定义在各自的实现文件里，
// 这里只保留唯一入口与分组顺序。
func Register(reg *pluginruntime.PluginRegistry) error {
	groups := []struct {
		name     string
		register func(*pluginruntime.PluginRegistry) error
	}{
		{"combo", registerComboProviders},
		{"source", registerSourceProviders},
		{"meta", registerMetaProviders},
		{"review", registerReviewProviders},
		{"annotation", registerAnnotationProviders},
		{"tool", registerToolProviders},
		{"push", registerPushProviders},
	}
	for _, group := range groups {
		if err := group.register(reg); err != nil {
			return fmt.Errorf("pluginbuiltin: 注册 %s 内置插件失败: %w", group.name, err)
		}
	}
	return nil
}
