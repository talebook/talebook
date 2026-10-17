package pluginbuiltin

import (
	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginproto"
	"talebook/booksvr/internal/pluginruntime"
)

// selfChecker 是 provider 可选实现的健康检查。
//
// 对应 Python 的 `getattr(provider, "self_check", None)`。
type selfChecker interface {
	SelfCheck(context map[string]any) (plugindomain.CheckReport, error)
}

// legacyExecutor 是 provider 可选实现的旧式摄取动作。
//
// 对应 Python 的 `getattr(provider, "execute", None)`。
type legacyExecutor interface {
	Execute(context map[string]any) (pluginproto.ProviderResult, error)
}

// rollbacker 是 provider 可选实现的回滚动作。
type rollbacker interface {
	Rollback(context map[string]any) error
}

// DispatchInvoke 是全部内置 provider 共用的方法分派入口。
//
// 它逐字复刻 Python plugin_runtime.py:1516-1585 的动作语义，并把能力方法名
// 分派到对应的能力接口。每个 provider 的 Invoke 都写成一行委托：
//
//	func (p *X) Invoke(method string, args []any, context map[string]any) (any, error) {
//		return DispatchInvoke(p, method, args, context)
//	}
func DispatchInvoke(p any, method string, args []any, context map[string]any) (any, error) {
	switch method {
	case "test":
		// Python：action == "test" 且 provider 有 self_check → 走 self_check。
		if checker, ok := p.(selfChecker); ok {
			report, err := checker.SelfCheck(context)
			if err != nil {
				return nil, err
			}
			if !report.Healthy {
				message := report.Message
				if message == "" {
					message = "Plugin self-check failed"
				}
				return nil, pluginproto.NewUpstreamError(message, "other", nil)
			}
			return pluginproto.ProviderResult{HealthMessage: report.Message}, nil
		}
		return executeLegacy(p, context)
	case "run", "retry":
		return executeLegacy(p, context)
	case "preview":
		// 正文工具的 preview 是能力方法；书源的 preview 是动作，走 execute。
		if transform, ok := p.(pluginiface.TransformProvider); ok {
			src, err := toolInputArg(args, 0)
			if err != nil {
				return nil, err
			}
			return transform.Preview(src, context)
		}
		return executeLegacy(p, context)
	case "rollback":
		if rb, ok := p.(rollbacker); ok {
			return nil, rb.Rollback(context)
		}
		return executeLegacy(p, context)
	}
	return dispatchCapability(p, method, args, context)
}

// executeLegacy 复刻 `elif not callable(getattr(provider, "execute", None))` 分支。
func executeLegacy(p any, context map[string]any) (any, error) {
	if executor, ok := p.(legacyExecutor); ok {
		return executor.Execute(context)
	}
	return nil, pluginruntime.NewPluginRuntimeError("plugin.legacy_action_unsupported",
		"Typed provider does not implement the legacy ingestion action", false)
}

// dispatchCapability 按能力方法名分派到对应的能力接口。
//
// 未实现的方法返回 plugin.provider_contract，与 Python 的 AttributeError 等价。
func dispatchCapability(p any, method string, args []any, context map[string]any) (any, error) {
	switch method {
	case "search_books":
		provider, ok := p.(pluginiface.MetadataProvider)
		if !ok {
			return nil, contractError(method)
		}
		return provider.SearchBooks(plugindomain.MetadataQueryFromValue(argAt(args, 0)), context)
	case "get_metadata":
		provider, ok := p.(pluginiface.MetadataProvider)
		if !ok {
			return nil, contractError(method)
		}
		return provider.GetMetadata(stringArg(args, 0), context)
	case "get_cover":
		provider, ok := p.(pluginiface.MetadataProvider)
		if !ok {
			return nil, contractError(method)
		}
		return provider.GetCover(stringArg(args, 0), context)
	case "get_reviews":
		provider, ok := p.(pluginiface.ReviewProvider)
		if !ok {
			return nil, contractError(method)
		}
		return provider.GetReviews(argAt(args, 0), context)
	case "list_annotations":
		provider, ok := p.(pluginiface.AnnotationProvider)
		if !ok {
			return nil, contractError(method)
		}
		return provider.ListAnnotations(context)
	case "push_annotation":
		provider, ok := p.(pluginiface.AnnotationProvider)
		if !ok {
			return nil, contractError(method)
		}
		return provider.PushAnnotation(annotationArg(args, 0), sourceStateArg(args, 1), context)
	case "delete_annotation":
		// 可选能力：本站删除/转私有时撤回外部副本（Python 注释声明的可选方法）。
		deleter, ok := p.(interface {
			DeleteAnnotation(state plugindomain.SourceState, context map[string]any) error
		})
		if !ok {
			return nil, contractError(method)
		}
		return nil, deleter.DeleteAnnotation(sourceStateArg(args, 0), context)
	case "push_vote":
		// 可选能力：读者赞踩时推送投票（value 为 1、-1 或 0）。
		voter, ok := p.(interface {
			PushVote(state plugindomain.SourceState, value int, context map[string]any) error
		})
		if !ok {
			return nil, contractError(method)
		}
		value := 0
		if n, ok := argAt(args, 1).(float64); ok {
			value = int(n)
		}
		return nil, voter.PushVote(sourceStateArg(args, 0), value, context)
	case "search":
		provider, ok := p.(pluginiface.SourceProvider)
		if !ok {
			return nil, contractError(method)
		}
		return provider.Search(stringArg(args, 0), mapArg(args, 1), context)
	case "browse":
		provider, ok := p.(pluginiface.SourceProvider)
		if !ok {
			return nil, contractError(method)
		}
		return provider.Browse(stringArg(args, 0), mapArg(args, 1), context)
	case "get_categories":
		provider, ok := p.(pluginiface.SourceProvider)
		if !ok {
			return nil, contractError(method)
		}
		return provider.GetCategories(context)
	case "get_book":
		provider, ok := p.(pluginiface.SourceProvider)
		if !ok {
			return nil, contractError(method)
		}
		return provider.GetBook(stringArg(args, 0), context)
	case "download":
		provider, ok := p.(pluginiface.SourceProvider)
		if !ok {
			return nil, contractError(method)
		}
		return provider.Download(sourceBookDetailArg(args, 0), context)
	case "get_toc":
		provider, ok := p.(pluginiface.SourceProvider)
		if !ok {
			return nil, contractError(method)
		}
		return provider.GetTOC(sourceBookDetailArg(args, 0), context)
	case "get_chapter":
		provider, ok := p.(pluginiface.SourceProvider)
		if !ok {
			return nil, contractError(method)
		}
		return provider.GetChapter(sourceChapterArg(args, 0), context)
	case "self_check":
		provider, ok := p.(pluginiface.SourceProvider)
		if !ok {
			return nil, contractError(method)
		}
		return provider.SelfCheck(context)
	case "apply":
		transform, ok := p.(pluginiface.TransformProvider)
		if !ok {
			return nil, contractError(method)
		}
		src, err := toolInputArg(args, 0)
		if err != nil {
			return nil, err
		}
		return transform.Apply(src, stringArg(args, 1), context)
	case "execute_feature":
		provider, ok := p.(pluginiface.ExtraFeatureProvider)
		if !ok {
			return nil, contractError(method)
		}
		return provider.ExecuteFeature(stringArg(args, 0), mapArg(args, 1), context)
	case "push":
		provider, ok := p.(pluginiface.PushProvider)
		if !ok {
			return nil, contractError(method)
		}
		return provider.Push(argAt(args, 0), argAt(args, 1), context)
	}
	return nil, contractError(method)
}

// contractError 构造未实现方法的契约错误。
func contractError(method string) error {
	return pluginruntime.NewPluginRuntimeError("plugin.provider_contract",
		"Plugin provider does not implement method "+method, false)
}

// argAt 取第 i 个参数；越界返回 nil。
func argAt(args []any, i int) any {
	if i < 0 || i >= len(args) {
		return nil
	}
	return args[i]
}

// stringArg 取第 i 个参数并转成字符串。
func stringArg(args []any, i int) string {
	value := argAt(args, i)
	if s, ok := value.(string); ok {
		return s
	}
	return ""
}

// mapArg 取第 i 个参数并转成 map；非 map 返回空 map。
func mapArg(args []any, i int) map[string]any {
	switch value := argAt(args, i).(type) {
	case map[string]any:
		return value
	case plugindomain.DomainRecord:
		return value.Values
	}
	return map[string]any{}
}

// toolInputArg 取第 i 个参数并转成 ToolInput。
func toolInputArg(args []any, i int) (plugindomain.ToolInput, error) {
	switch value := argAt(args, i).(type) {
	case plugindomain.ToolInput:
		return value, nil
	case plugindomain.DomainRecord:
		return plugindomain.ToolInput{DomainRecord: value}, nil
	case map[string]any:
		return plugindomain.ToolInput{DomainRecord: plugindomain.NewDomainRecord(value)}, nil
	}
	return plugindomain.ToolInput{}, pluginruntime.NewPluginRuntimeError("plugin.provider_contract",
		"Transform input must be a ToolInput", false)
}

// annotationArg 取第 i 个参数并转成 Annotation。
func annotationArg(args []any, i int) plugindomain.Annotation {
	switch value := argAt(args, i).(type) {
	case plugindomain.Annotation:
		return value
	case plugindomain.DomainRecord:
		return plugindomain.Annotation{DomainRecord: value}
	case map[string]any:
		return plugindomain.Annotation{DomainRecord: plugindomain.NewDomainRecord(value)}
	}
	return plugindomain.Annotation{}
}

// sourceStateArg 取第 i 个参数并转成 SourceState。
func sourceStateArg(args []any, i int) plugindomain.SourceState {
	switch value := argAt(args, i).(type) {
	case plugindomain.SourceState:
		return value
	case plugindomain.DomainRecord:
		return plugindomain.SourceState{DomainRecord: value}
	case map[string]any:
		return plugindomain.SourceState{DomainRecord: plugindomain.NewDomainRecord(value)}
	}
	return plugindomain.SourceState{}
}

// sourceBookDetailArg 取第 i 个参数并转成 SourceBookDetail。
func sourceBookDetailArg(args []any, i int) plugindomain.SourceBookDetail {
	switch value := argAt(args, i).(type) {
	case *plugindomain.SourceBookDetail:
		if value != nil {
			return *value
		}
	case plugindomain.SourceBookDetail:
		return value
	case map[string]any:
		return sourceBookDetailFromDict(value)
	}
	return plugindomain.SourceBookDetail{}
}

// sourceChapterArg 取第 i 个参数并转成 SourceChapter。
func sourceChapterArg(args []any, i int) plugindomain.SourceChapter {
	switch value := argAt(args, i).(type) {
	case *plugindomain.SourceChapter:
		if value != nil {
			return *value
		}
	case plugindomain.SourceChapter:
		return value
	case map[string]any:
		return sourceChapterFromDict(value)
	}
	return plugindomain.SourceChapter{}
}

// sourceBookDetailFromDict 复刻 SourceBookDetail.from_dict 的具名字段读取。
func sourceBookDetailFromDict(value map[string]any) plugindomain.SourceBookDetail {
	detail := plugindomain.SourceBookDetail{Extra: map[string]any{}}
	for k, v := range value {
		switch k {
		case "external_id":
			detail.ExternalID = asString(v)
		case "title":
			detail.Title = asString(v)
		case "authors":
			detail.Authors = asStringSlice(v)
		case "description":
			detail.Description = asString(v)
		case "cover_url":
			detail.CoverURL = asString(v)
		case "categories":
			detail.Categories = asStringSlice(v)
		case "source_url":
			detail.SourceURL = asString(v)
		case "acquisition_url":
			detail.AcquisitionURL = asString(v)
		case "format":
			detail.Format = asString(v)
		case "downloadable":
			detail.Downloadable, _ = v.(bool)
		case "toc_ref":
			detail.TOCRef = asString(v)
		case "last_chapter":
			detail.LastChapter = asString(v)
		case "word_count":
			detail.WordCount = asString(v)
		case "source":
			detail.Source = asString(v)
		default:
			detail.Extra[k] = v
		}
	}
	return detail
}

// sourceChapterFromDict 复刻 SourceChapter.from_dict 的具名字段读取。
func sourceChapterFromDict(value map[string]any) plugindomain.SourceChapter {
	chapter := plugindomain.SourceChapter{Extra: map[string]any{}}
	for k, v := range value {
		switch k {
		case "external_id":
			chapter.ExternalID = asString(v)
		case "title":
			chapter.Title = asString(v)
		case "is_vip":
			chapter.IsVIP, _ = v.(bool)
		case "updated_at":
			chapter.UpdatedAt = asString(v)
		default:
			chapter.Extra[k] = v
		}
	}
	return chapter
}

// asString 复刻 Python 的 str(x or "")。
func asString(v any) string {
	switch value := v.(type) {
	case nil:
		return ""
	case string:
		return value
	case bool:
		if value {
			return "True"
		}
		return "False"
	}
	return ""
}

// asStringSlice 把值转成字符串切片。
func asStringSlice(v any) []string {
	switch value := v.(type) {
	case nil:
		return nil
	case []string:
		return value
	case []any:
		out := make([]string, 0, len(value))
		for _, item := range value {
			out = append(out, asString(item))
		}
		return out
	case string:
		return []string{value}
	}
	return nil
}
