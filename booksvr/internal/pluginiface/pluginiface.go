// Package pluginiface 复刻 webserver/plugins/runtime/interfaces.py。
//
// 插件能力接口：运行时与插件之间的类型化边界。
package pluginiface

import (
	"strings"

	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginproto"
)

// DownloadMode 复刻 DownloadMode 字面量类型。
type DownloadMode string

// 允许的下载模式。
const (
	DownloadSingleBook DownloadMode = "single_book"
	DownloadByChapters DownloadMode = "by_chapters"
	DownloadNone       DownloadMode = "none"
)

// PluginContext 复刻 PluginContext。
type PluginContext struct {
	Action            string
	Attempt           int
	Deadline          string
	Config            map[string]any
	Cursor            map[string]any
	Secrets           map[string]any
	Scopes            []string
	TargetExternalIDs []string
	InputData         map[string]any
	Platform          map[string]any
}

// AsDict 复刻 PluginContext.as_dict。
//
// 注意键顺序与 Python 一致：deadline 在 input_data 之后、platform 之前。
func (c PluginContext) AsDict() map[string]any {
	return map[string]any{
		"action":              c.Action,
		"attempt":             c.Attempt,
		"config":              copyMap(c.Config),
		"cursor":              copyMap(c.Cursor),
		"secrets":             copyMap(c.Secrets),
		"scopes":              append([]string{}, c.Scopes...),
		"target_external_ids": append([]string{}, c.TargetExternalIDs...),
		"input_data":          copyMap(c.InputData),
		"deadline":            c.Deadline,
		"platform":            copyMap(c.Platform),
	}
}

// copyMap 返回浅拷贝；nil 时返回空 map（对齐 Python 的 dict(x)）。
func copyMap(m map[string]any) map[string]any {
	out := make(map[string]any, len(m))
	for k, v := range m {
		out[k] = v
	}
	return out
}

// MetadataProvider 复刻 MetadataProvider 协议。
type MetadataProvider interface {
	// SearchBooks 返回按相关度降序排列的候选；无结果返回空列表而不是抛异常。
	SearchBooks(query plugindomain.MetadataQuery, context map[string]any) ([]plugindomain.BookMetadata, error)
	// GetMetadata 按本源的 provider_value 取回单条；取不到返回 nil。
	GetMetadata(externalID string, context map[string]any) (*plugindomain.BookMetadata, error)
	// GetCover 下载封面并返回 (扩展名, 字节)；无封面或失败返回 nil。
	//
	// 元数据候选只携带 cover_url，实际下载由调用方在确认选用后才触发。
	GetCover(coverURL string, context map[string]any) (*CoverResult, error)
}

// CoverResult 是封面下载结果。
type CoverResult struct {
	Extension string
	Content   []byte
}

// AnnotationProvider 复刻 AnnotationProvider 协议。
type AnnotationProvider interface {
	ListAnnotations(context map[string]any) (plugindomain.Page, error)
	PushAnnotation(item plugindomain.Annotation, state plugindomain.SourceState,
		context map[string]any) (plugindomain.PushReceipt, error)
}

// ReviewProvider 复刻 ReviewProvider 协议。
type ReviewProvider interface {
	GetReviews(query any, context map[string]any) (plugindomain.Page, error)
}

// SourceProvider 复刻 SourceProvider 协议。
type SourceProvider interface {
	DownloadMode() DownloadMode
	Search(query string, cursor map[string]any, context map[string]any) (plugindomain.Page, error)
	Browse(categoryID string, cursor map[string]any, context map[string]any) (plugindomain.Page, error)
	GetCategories(context map[string]any) ([]plugindomain.Category, error)
	GetBook(externalID string, context map[string]any) (plugindomain.SourceBookDetail, error)
	Download(book plugindomain.SourceBookDetail, context map[string]any) (plugindomain.BookFile, error)
	GetTOC(book plugindomain.SourceBookDetail, context map[string]any) ([]plugindomain.SourceChapter, error)
	GetChapter(chapter plugindomain.SourceChapter, context map[string]any) (plugindomain.SourceContent, error)
	SelfCheck(context map[string]any) (plugindomain.CheckReport, error)
}

// TransformProvider 复刻 TransformProvider 协议。
type TransformProvider interface {
	SupportedFormats() map[string]bool
	SupportsAutoTrigger() bool
	Preview(src plugindomain.ToolInput, context map[string]any) (plugindomain.ToolReport, error)
	Apply(src plugindomain.ToolInput, outDir string, context map[string]any) (plugindomain.ToolOutput, error)
}

// ExtraFeatureProvider 复刻 ExtraFeatureProvider 协议。
type ExtraFeatureProvider interface {
	ExecuteFeature(action string, params map[string]any, context map[string]any) (map[string]any, error)
}

// PushProvider 复刻 PushProvider 协议。
type PushProvider interface {
	DefaultPort() int
	Push(bookFile any, target any, context any) (any, error)
}

// CapabilityInterfaces 复刻 CAPABILITY_INTERFACES。
//
// 文件提取与运行时发现不是书籍检索，但仍属于第七类受控逃生舱，
// 不再用一个全局 PluginProvider.execute() 混装所有语义。
var CapabilityInterfaces = map[string]string{
	"metadata.lookup":              "MetadataProvider",
	"metadata.extract":             "ExtraFeatureProvider",
	"metadata.discover":            "ExtraFeatureProvider",
	"annotations.import":           "AnnotationProvider",
	"annotations.push":             "AnnotationProvider",
	"annotations.chapter_reviews":  "ReviewProvider",
	"reviews.lookup":               "ReviewProvider",
	"reviews.import":               "ReviewProvider",
	"sources.search":               "SourceProvider",
	"sources.browse":               "SourceProvider",
	"sources.acquire":              "SourceProvider",
	"integrations.tool":            "TransformProvider",
	"integrations.push":            "PushProvider",
	"integrations.search":          "ExtraFeatureProvider",
	"integrations.books":           "ExtraFeatureProvider",
	"integrations.shelf":           "ExtraFeatureProvider",
	"integrations.statistics":      "ExtraFeatureProvider",
	"integrations.community":       "ExtraFeatureProvider",
	"integrations.recommendations": "ExtraFeatureProvider",
}

// Provider 是运行时可见的插件对象。
//
// Python 用鸭子类型 + runtime_checkable Protocol；Go 侧用显式能力声明，
// 由 ContractViolations 校验声明与实现是否一致。
type Provider interface {
	// Manifest 返回插件清单（必须是 map）。
	Manifest() map[string]any
}

// CapabilitySet 描述一个 provider 实际实现的能力。
type CapabilitySet struct {
	// Interfaces 是已实现的接口名集合。
	Interfaces map[string]bool
	// DownloadMode 是 SourceProvider 声明的下载模式；非书源为空。
	DownloadMode DownloadMode
	// HasSelfCheck 表示实现了 self_check。
	HasSelfCheck bool
	// HasExecute 表示实现了 execute。
	HasExecute bool
	// Methods 是已实现的方法名集合（用于 download_mode 校验）。
	Methods map[string]bool
}

// ContractViolations 复刻 contract_violations。
//
// 返回 provider 违反基础契约或 capability 接口之处。
func ContractViolations(manifest map[string]any, caps CapabilitySet) []string {
	var problems []string
	if manifest == nil {
		return []string{"manifest 必须是 dict"}
	}

	rawCaps, _ := manifest["capabilities"].([]any)
	for _, item := range rawCaps {
		capability, _ := item.(string)
		iface, known := CapabilityInterfaces[capability]
		if !known {
			problems = append(problems, "声明了平台未知能力 "+capability)
			continue
		}
		if !caps.Interfaces[iface] {
			problems = append(problems, "声明了 "+capability+" 但未实现 "+iface)
		}
	}

	if hasExtraFeatures(manifest) && !caps.Interfaces["ExtraFeatureProvider"] {
		problems = append(problems, "声明了 extra_features 但未实现 ExtraFeatureProvider")
	}

	if hasAction(manifest, "test") && !caps.HasSelfCheck && !caps.HasExecute {
		problems = append(problems, "声明了 test 但 typed-only provider 未实现 self_check")
	}

	if anySourceCapability(rawCaps) {
		declaredMode, hasDeclared := manifest["download_mode"]
		if !hasDeclared || declaredMode == nil {
			problems = append(problems, "书源必须声明 download_mode")
		} else {
			declared := DownloadMode(asString(declaredMode))
			if caps.DownloadMode != declared {
				problems = append(problems, "manifest download_mode 与 SourceProvider.download_mode 不一致")
			}
			// 保持 requiredMethods 的声明顺序（Python 不排序）。
			required := requiredMethods(declared)
			var missing []string
			for _, name := range required {
				if !caps.Methods[name] {
					missing = append(missing, name)
				}
			}
			if len(missing) > 0 {
				problems = append(problems,
					"download_mode="+string(declared)+" 缺少方法："+strings.Join(missing, ", "))
			}
		}
	}
	return problems
}

// requiredMethods 复刻 download_mode 到必需方法的映射。
func requiredMethods(mode DownloadMode) []string {
	switch mode {
	case DownloadSingleBook:
		return []string{"download"}
	case DownloadByChapters:
		return []string{"get_toc", "get_chapter"}
	default:
		return nil
	}
}

// hasExtraFeatures 判断 manifest 是否声明了 extra_features。
func hasExtraFeatures(manifest map[string]any) bool {
	ef, ok := manifest["extra_features"]
	if !ok || ef == nil {
		return false
	}
	if m, ok := ef.(map[string]any); ok {
		return len(m) > 0
	}
	return false
}

// hasAction 判断 manifest 是否声明了某个 action。
func hasAction(manifest map[string]any, action string) bool {
	actions, _ := manifest["actions"].([]any)
	for _, a := range actions {
		if s, _ := a.(string); s == action {
			return true
		}
	}
	return false
}

// anySourceCapability 判断是否声明了 sources.* 能力。
func anySourceCapability(caps []any) bool {
	for _, c := range caps {
		if s, _ := c.(string); strings.HasPrefix(s, "sources.") {
			return true
		}
	}
	return false
}

// asString 复刻 Python 的 str(x)。
func asString(v any) string {
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

// ManifestFromProto 从 pluginproto.PluginManifest 取原始 map。
func ManifestFromProto(m *pluginproto.PluginManifest) map[string]any {
	if m == nil {
		return nil
	}
	return m.Raw
}
