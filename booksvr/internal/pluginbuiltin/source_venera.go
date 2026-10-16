package pluginbuiltin

import (
	"talebook/booksvr/internal/booksource"
	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginproto"
	"talebook/booksvr/internal/sourcebase"
)

// veneraCaps 是 Venera 的能力声明：漫画源仅在线阅读，download_mode=none。
func veneraCaps() pluginiface.CapabilitySet {
	return pluginiface.CapabilitySet{
		Interfaces:   map[string]bool{"SourceProvider": true},
		DownloadMode: pluginiface.DownloadNone,
		HasSelfCheck: true,
		Methods:      map[string]bool{},
	}
}

// VeneraSourceProvider 把 booksource.VeneraProvider 适配为内置插件。
//
// Python 侧 VeneraProvider 自带 manifest；Go 侧引擎在 booksource 包，
// 这里补齐 manifest 与插件协议桥接。
type VeneraSourceProvider struct {
	Inner        *booksource.VeneraProvider
	ManifestDict map[string]any
}

// newVeneraSourceProvider 构造 Venera provider。
func newVeneraSourceProvider() *VeneraSourceProvider {
	manifest := sourcebase.Manifest(
		"talebook.source.venera", "Venera 漫画源",
		"在在线书库浏览、搜索并阅读 MangaDex。固定官方 Venera 源脚本；公开阅读无需源账号，论坛登录不支持。",
		[]string{"sources.search", "sources.browse"},
		booksource.VeneraManifest()["config_schema"].(map[string]any),
		sourcebase.ManifestOptions{
			Homepage:    "https://github.com/venera-app/venera",
			RuntimeKind: "managed_process",
		})
	// 复刻 Python 的 manifest.update(...) 与 ui.icon 覆写。
	manifest["download_mode"] = "none"
	manifest["actions"] = []any{"test"}
	manifest["permissions"] = []any{"books.read", "network.read"}
	if ui, ok := manifest["ui"].(map[string]any); ok {
		ui["icon"] = "mdi-book-open-page-variant"
	}
	return &VeneraSourceProvider{
		Inner:        booksource.NewVeneraProvider(nil, booksource.DefaultVeneraConfig()),
		ManifestDict: manifest,
	}
}

// Manifest 满足 pluginiface.Provider。
func (p *VeneraSourceProvider) Manifest() map[string]any { return p.ManifestDict }

// DownloadMode 复刻 download_mode="none"。
func (p *VeneraSourceProvider) DownloadMode() pluginiface.DownloadMode {
	return p.Inner.DownloadMode()
}

// CapabilitySet 报告能力声明。
func (p *VeneraSourceProvider) CapabilitySet() pluginiface.CapabilitySet { return veneraCaps() }

// Invoke 实现 MethodDispatcher：全部委托 DispatchInvoke。
func (p *VeneraSourceProvider) Invoke(method string, args []any, context map[string]any) (any, error) {
	return DispatchInvoke(p, method, args, context)
}

// InitialConfig 复刻缺省行为：空配置。
func (p *VeneraSourceProvider) InitialConfig(settings map[string]any) map[string]any {
	return map[string]any{}
}

// Search 委托引擎。
func (p *VeneraSourceProvider) Search(query string, cursor map[string]any, context map[string]any) (plugindomain.Page, error) {
	return p.Inner.Search(query, cursor, context)
}

// Browse 委托引擎。
func (p *VeneraSourceProvider) Browse(categoryID string, cursor map[string]any, context map[string]any) (plugindomain.Page, error) {
	return p.Inner.Browse(categoryID, cursor, context)
}

// GetCategories 委托引擎。
func (p *VeneraSourceProvider) GetCategories(context map[string]any) ([]plugindomain.Category, error) {
	return p.Inner.GetCategories(context)
}

// GetBook 委托引擎。
func (p *VeneraSourceProvider) GetBook(externalID string, context map[string]any) (plugindomain.SourceBookDetail, error) {
	return p.Inner.GetBook(externalID, context)
}

// Download 委托引擎（恒报错：仅在线阅读）。
func (p *VeneraSourceProvider) Download(book plugindomain.SourceBookDetail, context map[string]any) (plugindomain.BookFile, error) {
	return p.Inner.Download(book, context)
}

// GetTOC 委托引擎。
func (p *VeneraSourceProvider) GetTOC(book plugindomain.SourceBookDetail, context map[string]any) ([]plugindomain.SourceChapter, error) {
	return p.Inner.GetTOC(book, context)
}

// GetChapter 委托引擎。
func (p *VeneraSourceProvider) GetChapter(chapter plugindomain.SourceChapter, context map[string]any) (plugindomain.SourceContent, error) {
	return p.Inner.GetChapter(chapter, context)
}

// SelfCheck 委托引擎。
func (p *VeneraSourceProvider) SelfCheck(context map[string]any) (plugindomain.CheckReport, error) {
	return p.Inner.SelfCheck(context)
}

// 编译期断言。
var (
	_ pluginiface.SourceProvider     = (*VeneraSourceProvider)(nil)
	_ pluginruntimeMethodDispatcher  = (*VeneraSourceProvider)(nil)
)

// pluginruntimeMethodDispatcher 是 pluginruntime.MethodDispatcher 的本地别名，
// 避免 import 环（本包已导入 pluginruntime，无环；此处仅为可读性）。
type pluginruntimeMethodDispatcher = interface {
	Invoke(method string, args []any, context map[string]any) (any, error)
}

// 编译期引用保持：pluginproto 在本文件仅用于文档性导入。
var _ = pluginproto.ProtocolVersion
