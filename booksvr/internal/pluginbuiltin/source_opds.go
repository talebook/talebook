package pluginbuiltin

import (
	"database/sql"

	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginproto"
	"talebook/booksvr/internal/pluginruntime"
	"talebook/booksvr/internal/sourcebase"
	"talebook/booksvr/internal/userdb"
)

// sourceCaps 是单文件书源共用的能力声明。
//
// 对应 Python SourceBase 子类：实现 SourceProvider，声明 self_check 与 execute，
// download_mode=single_book 要求 download 方法。
func sourceCaps() pluginiface.CapabilitySet {
	return pluginiface.CapabilitySet{
		Interfaces:   map[string]bool{"SourceProvider": true},
		DownloadMode: pluginiface.DownloadSingleBook,
		HasSelfCheck: true,
		HasExecute:   true,
		Methods:      map[string]bool{"download": true},
	}
}

// registerSourceProviders 注册 12 个书源。
//
// 顺序与 Python register.py 的 SOURCE_PROVIDERS 一致。
func registerSourceProviders(reg *pluginruntime.PluginRegistry) error {
	providers := []pluginiface.Provider{
		newGenericOPDSProvider(),
		newLegadoProvider(),
		newOPDSPreset("talebook.source.kavita", "Kavita",
			"Kavita 自托管书库 OPDS 连接预设。", "https://www.kavitareader.com/",
			"", "/images/plugin-icons/kavita.svg"),
		newOPDSPreset("talebook.source.komga", "Komga",
			"Komga 自托管书库 OPDS 连接预设。", "https://komga.org/",
			"", "/images/plugin-icons/komga.svg"),
		newOPDSPreset("talebook.source.booklore", "BookLore",
			"BookLore 自托管书库 OPDS 连接预设。", "https://booklore.org/",
			"", "/images/plugin-icons/booklore.svg"),
		newStandardEbooksProvider(),
		newGutenbergProvider(),
		newInternetArchiveProvider(),
		newWebDAVProvider(),
		newWatchFolderProvider(),
		newTomatoDownloaderProvider(),
		newVeneraSourceProvider(),
	}
	for _, p := range providers {
		if _, err := reg.Register(p, p.(sourceCapsReporter).CapabilitySet()); err != nil {
			return err
		}
	}
	return nil
}

// sourceCapsReporter 让每个书源自带能力声明，注册循环不必逐个写死。
type sourceCapsReporter interface {
	CapabilitySet() pluginiface.CapabilitySet
}

// ---- Generic OPDS ----

// GenericOPDSProvider 复刻 GenericOPDSProvider：把 OpdsSource 事实表绑定到
// 标准 SourceProvider。
type GenericOPDSProvider struct {
	*sourcebase.OPDSProvider
}

// newGenericOPDSProvider 构造 Generic OPDS provider。
func newGenericOPDSProvider() *GenericOPDSProvider {
	inner := sourcebase.NewOPDSProvider(sourcebase.OPDSOptions{
		PluginID:    "talebook.source.opds",
		Name:        "Generic OPDS",
		Description: "管理已保存的 OPDS 1/2 目录，并浏览、搜索与批量导入。",
		Homepage:    "https://github.com/talebook/talebook",
	})
	p := &GenericOPDSProvider{OPDSProvider: inner}
	// 覆写为 Python opds.py 的完整 manifest（含 ui.service_toggle 等专有字段）。
	inner.Manifest = map[string]any{
		"protocol_version": pluginproto.ProtocolVersion,
		"id":               "talebook.source.opds",
		"name":             "Generic OPDS",
		"description":      "管理已保存的 OPDS 1/2 目录，并浏览、搜索与批量导入。",
		"version":          "1.0.0",
		"categories":       []any{"sources"},
		"capabilities":     []any{"sources.browse", "sources.search", "sources.acquire"},
		"runtime_kind":     "builtin",
		"actions":          []any{"test"},
		"auth_schema":      map[string]any{"type": "object", "properties": map[string]any{}},
		"config_schema":    map[string]any{"type": "object", "properties": map[string]any{}},
		"permissions":      []any{"books.read", "books.write", "network.read"},
		"data_policy":      map[string]any{"stores_full_text": false, "retention": "source_owned"},
		"compatibility":    map[string]any{"talebook": ">=0.1.0"},
		"connection_owners": []any{"instance"},
		"download_mode":    "single_book",
		"homepage":         "https://github.com/talebook/talebook",
		"license":          "GPL-3.0",
		"ui": map[string]any{
			"icon":            "mdi-rss-box",
			"service_toggle":  "opds",
			"manage_dialog":   "opds",
			"primary_action":  "browse",
			"healthy_message": "Generic OPDS 适配器可用",
		},
	}
	return p
}

// Manifest 覆写嵌入字段的同名提升选择子，满足 pluginiface.Provider。
func (p *GenericOPDSProvider) Manifest() map[string]any { return p.OPDSProvider.Manifest }

// DownloadMode 满足 pluginiface.SourceProvider。
func (p *GenericOPDSProvider) DownloadMode() pluginiface.DownloadMode {
	return pluginiface.DownloadSingleBook
}

// CapabilitySet 报告能力声明。
func (p *GenericOPDSProvider) CapabilitySet() pluginiface.CapabilitySet { return sourceCaps() }

// Invoke 实现 MethodDispatcher：全部委托 DispatchInvoke。
func (p *GenericOPDSProvider) Invoke(method string, args []any, context map[string]any) (any, error) {
	return DispatchInvoke(p, method, args, context)
}

// InitialEnabled 复刻 initial_enabled：恒为 True。
func (p *GenericOPDSProvider) InitialEnabled(settings map[string]any) bool { return true }

// InitialConfig 复刻缺省行为：空配置。
func (p *GenericOPDSProvider) InitialConfig(settings map[string]any) map[string]any {
	return map[string]any{}
}

// PluginStatus 复刻 opds.py:_status。
//
// configured=源总数、enabled=启用数、service_enabled=OPDS_ENABLED 设置。
func (p *GenericOPDSProvider) PluginStatus(db *sql.DB, settings map[string]any) (map[string]any, error) {
	sources, err := userdb.ListOpdsSources(db)
	if err != nil {
		return nil, err
	}
	enabled := 0
	for _, item := range sources {
		if item.Active {
			enabled++
		}
	}
	serviceEnabled := true
	if v, ok := settings["OPDS_ENABLED"]; ok {
		serviceEnabled = pluginBoolAny(v)
	}
	return map[string]any{
		"configured":      len(sources),
		"enabled":         enabled,
		"service_enabled": serviceEnabled,
	}, nil
}

// Execute 复刻 execute：无 endpoint 时返回健康消息而不是报错。
func (p *GenericOPDSProvider) Execute(context map[string]any) (pluginproto.ProviderResult, error) {
	if !contextHasEndpoint(context) {
		return pluginproto.ProviderResult{HealthMessage: healthyMessage(p.Manifest())}, nil
	}
	return p.OPDSProvider.Execute(context)
}

// SelfCheck 复刻 self_check：无 endpoint 时返回健康报告。
func (p *GenericOPDSProvider) SelfCheck(context map[string]any) (plugindomain.CheckReport, error) {
	if !contextHasEndpoint(context) {
		return plugindomain.CheckReport{Healthy: true, Message: healthyMessage(p.Manifest())}, nil
	}
	return p.OPDSProvider.SelfCheck(context)
}

// ---- OPDS 预设 ----

// opdsPresetProvider 是 Kavita/Komga/BookLore/Standard Ebooks 共用的包装。
//
// sourcebase.OPDSProvider 的 Manifest 是字段而非方法，无法直接满足
// pluginiface.Provider；这里补上三个桥接方法。
type opdsPresetProvider struct {
	*sourcebase.OPDSProvider
	// InitialEnabledOverride 非 nil 时覆盖默认的 initial_enabled。
	InitialEnabledOverride func(settings map[string]any) bool
}

// newOPDSPreset 构造一个 OPDS 预设 provider。
func newOPDSPreset(pluginID, name, description, homepage, endpoint, brandIcon string) *opdsPresetProvider {
	return &opdsPresetProvider{OPDSProvider: sourcebase.NewOPDSProvider(sourcebase.OPDSOptions{
		PluginID:    pluginID,
		Name:        name,
		Description: description,
		Homepage:    homepage,
		Endpoint:    endpoint,
		BrandIcon:   brandIcon,
	})}
}

// Manifest 满足 pluginiface.Provider。
func (p *opdsPresetProvider) Manifest() map[string]any { return p.OPDSProvider.Manifest }

// DownloadMode 满足 pluginiface.SourceProvider。
func (p *opdsPresetProvider) DownloadMode() pluginiface.DownloadMode {
	return pluginiface.DownloadSingleBook
}

// CapabilitySet 报告能力声明。
func (p *opdsPresetProvider) CapabilitySet() pluginiface.CapabilitySet { return sourceCaps() }

// Invoke 实现 MethodDispatcher：全部委托 DispatchInvoke。
func (p *opdsPresetProvider) Invoke(method string, args []any, context map[string]any) (any, error) {
	return DispatchInvoke(p, method, args, context)
}

// InitialEnabled 复刻注册期语义：Python 侧仅显式定义 initial_enabled 的
// 预设（Generic OPDS / Standard Ebooks）为 True，其余（Kavita/Komga/BookLore）
// 未定义时 plugin_runtime 注册为 enabled=False。
func (p *opdsPresetProvider) InitialEnabled(settings map[string]any) bool {
	if p.InitialEnabledOverride != nil {
		return p.InitialEnabledOverride(settings)
	}
	return false
}

// InitialConfig 复刻缺省行为：空配置。
func (p *opdsPresetProvider) InitialConfig(settings map[string]any) map[string]any {
	return map[string]any{}
}

// ---- Standard Ebooks ----

// newStandardEbooksProvider 构造 Standard Ebooks 预设。
func newStandardEbooksProvider() *opdsPresetProvider {
	p := newOPDSPreset("talebook.source.standard-ebooks", "Standard Ebooks · 最新上架",
		"浏览 Standard Ebooks 官方开放的最新公共版权电子书。", "https://standardebooks.org/",
		"https://standardebooks.org/feeds/atom/new-releases", "/images/plugin-icons/standard-ebooks.png")
	p.OPDSProvider.LicenseName = "Public domain / CC0"
	if ui, ok := p.OPDSProvider.Manifest["ui"].(map[string]any); ok {
		ui["catalog_access"] = "public_free"
	}
	p.InitialEnabledOverride = func(settings map[string]any) bool { return true }
	return p
}

// contextHasEndpoint 复刻 `(context.get("config") or {}).get("endpoint")` 的真值判断。
func contextHasEndpoint(context map[string]any) bool {
	config, _ := context["config"].(map[string]any)
	endpoint, _ := config["endpoint"].(string)
	return endpoint != ""
}

// healthyMessage 取 manifest ui.healthy_message。
func healthyMessage(manifest map[string]any) string {
	ui, _ := manifest["ui"].(map[string]any)
	msg, _ := ui["healthy_message"].(string)
	return msg
}

// pluginBoolAny 复刻 Python bool() 对 JSON 值的语义。
func pluginBoolAny(v any) bool {
	switch value := v.(type) {
	case nil:
		return false
	case bool:
		return value
	case string:
		return value != ""
	case float64:
		return value != 0
	case int:
		return value != 0
	case int64:
		return value != 0
	}
	return true
}
