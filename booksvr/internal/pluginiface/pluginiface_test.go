package pluginiface

import (
	"reflect"
	"testing"
)

// baseManifest 返回一份合法 manifest（含 test action）。
func baseManifest() map[string]any {
	return map[string]any{
		"protocol_version":  "talebook.plugin/v1",
		"id":                "talebook.demo",
		"name":              "Demo",
		"version":           "1.0.0",
		"categories":        []any{"metadata"},
		"capabilities":      []any{"metadata.lookup"},
		"runtime_kind":      "builtin",
		"actions":           []any{"test"},
		"auth_schema":       map[string]any{"properties": map[string]any{}},
		"config_schema":     map[string]any{},
		"connection_owners": []any{"instance"},
		"permissions":       []any{},
		"data_policy":       map[string]any{},
		"compatibility":     map[string]any{},
		"homepage":          "",
		"license":           "",
	}
}

// with 在 base 上覆盖字段。
func with(kv map[string]any) map[string]any {
	m := baseManifest()
	for k, v := range kv {
		m[k] = v
	}
	return m
}

// TestContractViolationsVectors 用 Python 实测向量逐条校验。
func TestContractViolationsVectors(t *testing.T) {
	// 空能力集：什么都没实现。
	none := CapabilitySet{Interfaces: map[string]bool{}, Methods: map[string]bool{}}

	cases := []struct {
		label    string
		manifest map[string]any
		caps     CapabilitySet
		want     []string
	}{
		{
			label:    "nomanifest",
			manifest: nil,
			caps:     none,
			want:     []string{"manifest 必须是 dict"},
		},
		{
			label:    "dictonly",
			manifest: map[string]any{},
			caps:     none,
			want:     nil,
		},
		{
			label:    "notimpl",
			manifest: baseManifest(),
			caps:     none,
			want: []string{
				"声明了 metadata.lookup 但未实现 MetadataProvider",
				"声明了 test 但 typed-only provider 未实现 self_check",
			},
		},
		{
			label:    "ef",
			manifest: with(map[string]any{"extra_features": map[string]any{"run": map[string]any{"mode": "read", "schema": map[string]any{}}}}),
			caps:     none,
			want: []string{
				"声明了 metadata.lookup 但未实现 MetadataProvider",
				"声明了 extra_features 但未实现 ExtraFeatureProvider",
				"声明了 test 但 typed-only provider 未实现 self_check",
			},
		},
		{
			label:    "srcnomode",
			manifest: with(map[string]any{"categories": []any{"sources"}, "capabilities": []any{"sources.search"}}),
			caps:     none,
			want: []string{
				"声明了 sources.search 但未实现 SourceProvider",
				"声明了 test 但 typed-only provider 未实现 self_check",
				"书源必须声明 download_mode",
			},
		},
		{
			label: "srcmismatch",
			manifest: with(map[string]any{
				"categories": []any{"sources"}, "capabilities": []any{"sources.search"},
				"download_mode": "single_book",
			}),
			caps: CapabilitySet{
				Interfaces: map[string]bool{}, Methods: map[string]bool{},
				DownloadMode: DownloadByChapters,
			},
			want: []string{
				"声明了 sources.search 但未实现 SourceProvider",
				"声明了 test 但 typed-only provider 未实现 self_check",
				"manifest download_mode 与 SourceProvider.download_mode 不一致",
				"download_mode=single_book 缺少方法：download",
			},
		},
		{
			label: "srcmissing",
			manifest: with(map[string]any{
				"categories": []any{"sources"}, "capabilities": []any{"sources.search"},
				"download_mode": "single_book",
			}),
			caps: CapabilitySet{
				Interfaces: map[string]bool{}, Methods: map[string]bool{},
				DownloadMode: DownloadSingleBook,
			},
			want: []string{
				"声明了 sources.search 但未实现 SourceProvider",
				"声明了 test 但 typed-only provider 未实现 self_check",
				"download_mode=single_book 缺少方法：download",
			},
		},
		{
			label: "bychap",
			manifest: with(map[string]any{
				"categories": []any{"sources"}, "capabilities": []any{"sources.search"},
				"download_mode": "by_chapters",
			}),
			caps: CapabilitySet{
				Interfaces: map[string]bool{}, Methods: map[string]bool{},
				DownloadMode: DownloadByChapters,
			},
			want: []string{
				"声明了 sources.search 但未实现 SourceProvider",
				"声明了 test 但 typed-only provider 未实现 self_check",
				"download_mode=by_chapters 缺少方法：get_toc, get_chapter",
			},
		},
	}

	for _, c := range cases {
		got := ContractViolations(c.manifest, c.caps)
		if len(got) == 0 && len(c.want) == 0 {
			continue
		}
		if !reflect.DeepEqual(got, c.want) {
			t.Errorf("%s:\n得到 %v\n期望 %v", c.label, got, c.want)
		}
	}
}

// TestContractViolationsUnknownCapability 未知能力。
func TestContractViolationsUnknownCapability(t *testing.T) {
	m := with(map[string]any{"capabilities": []any{"nope.thing"}, "actions": []any{}})
	got := ContractViolations(m, CapabilitySet{Interfaces: map[string]bool{}, Methods: map[string]bool{}})
	want := []string{"声明了平台未知能力 nope.thing"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("得到 %v, want %v", got, want)
	}
}

// TestContractViolationsAllImplemented 全部实现时无问题。
func TestContractViolationsAllImplemented(t *testing.T) {
	m := with(map[string]any{"actions": []any{}})
	caps := CapabilitySet{
		Interfaces: map[string]bool{"MetadataProvider": true},
		Methods:    map[string]bool{},
	}
	if got := ContractViolations(m, caps); len(got) != 0 {
		t.Errorf("得到 %v, want 空", got)
	}
}

// TestContractViolationsHasExecute test 由 execute 满足。
func TestContractViolationsHasExecute(t *testing.T) {
	caps := CapabilitySet{
		Interfaces: map[string]bool{"MetadataProvider": true},
		Methods:    map[string]bool{},
		HasExecute: true,
	}
	if got := ContractViolations(baseManifest(), caps); len(got) != 0 {
		t.Errorf("有 execute 时不应报 test 问题，得到 %v", got)
	}
}

// TestContractViolationsHasSelfCheck test 由 self_check 满足。
func TestContractViolationsHasSelfCheck(t *testing.T) {
	caps := CapabilitySet{
		Interfaces:   map[string]bool{"MetadataProvider": true},
		Methods:      map[string]bool{},
		HasSelfCheck: true,
	}
	if got := ContractViolations(baseManifest(), caps); len(got) != 0 {
		t.Errorf("有 self_check 时不应报 test 问题，得到 %v", got)
	}
}

// TestContractViolationsSourceComplete 书源方法齐全时无问题。
func TestContractViolationsSourceComplete(t *testing.T) {
	m := with(map[string]any{
		"categories": []any{"sources"}, "capabilities": []any{"sources.search"},
		"download_mode": "by_chapters", "actions": []any{},
	})
	caps := CapabilitySet{
		Interfaces:   map[string]bool{"SourceProvider": true},
		Methods:      map[string]bool{"get_toc": true, "get_chapter": true},
		DownloadMode: DownloadByChapters,
	}
	if got := ContractViolations(m, caps); len(got) != 0 {
		t.Errorf("得到 %v, want 空", got)
	}
}

// TestContractViolationsDownloadModeNone none 模式无需方法。
func TestContractViolationsDownloadModeNone(t *testing.T) {
	m := with(map[string]any{
		"categories": []any{"sources"}, "capabilities": []any{"sources.search"},
		"download_mode": "none", "actions": []any{},
	})
	caps := CapabilitySet{
		Interfaces:   map[string]bool{"SourceProvider": true},
		Methods:      map[string]bool{},
		DownloadMode: DownloadNone,
	}
	if got := ContractViolations(m, caps); len(got) != 0 {
		t.Errorf("none 模式得到 %v, want 空", got)
	}
}

// TestContractViolationsExtraFeaturesEmpty 空 extra_features 不触发。
func TestContractViolationsExtraFeaturesEmpty(t *testing.T) {
	m := with(map[string]any{"extra_features": map[string]any{}, "actions": []any{}})
	caps := CapabilitySet{Interfaces: map[string]bool{"MetadataProvider": true}, Methods: map[string]bool{}}
	if got := ContractViolations(m, caps); len(got) != 0 {
		t.Errorf("空 extra_features 得到 %v, want 空", got)
	}
}

// TestContractViolationsExtraFeaturesNil extra_features 为 nil 不触发。
func TestContractViolationsExtraFeaturesNil(t *testing.T) {
	m := with(map[string]any{"extra_features": nil, "actions": []any{}})
	caps := CapabilitySet{Interfaces: map[string]bool{"MetadataProvider": true}, Methods: map[string]bool{}}
	if got := ContractViolations(m, caps); len(got) != 0 {
		t.Errorf("nil extra_features 得到 %v, want 空", got)
	}
}

// TestPluginContextAsDict 覆盖 as_dict 的键集合与拷贝语义。
func TestPluginContextAsDict(t *testing.T) {
	ctx := PluginContext{
		Action: "run", Attempt: 2, Deadline: "2026-01-01",
		Config: map[string]any{"a": 1}, Cursor: map[string]any{"c": 1},
		Secrets: map[string]any{"s": 1}, Scopes: []string{"x"},
		TargetExternalIDs: []string{"e1"}, InputData: map[string]any{"i": 1},
		Platform: map[string]any{"p": 1},
	}
	got := ctx.AsDict()
	wantKeys := []string{
		"action", "attempt", "config", "cursor", "secrets", "scopes",
		"target_external_ids", "input_data", "deadline", "platform",
	}
	if len(got) != len(wantKeys) {
		t.Fatalf("键数 = %d, want %d", len(got), len(wantKeys))
	}
	for _, k := range wantKeys {
		if _, ok := got[k]; !ok {
			t.Errorf("缺少键 %q", k)
		}
	}
	if got["action"] != "run" || got["attempt"] != 2 || got["deadline"] != "2026-01-01" {
		t.Errorf("标量字段错误: %+v", got)
	}

	// 拷贝语义：改副本不影响原值。
	got["config"].(map[string]any)["a"] = 99
	if ctx.Config["a"] != 1 {
		t.Error("config 应为浅拷贝")
	}
	got["scopes"].([]string)[0] = "changed"
	if ctx.Scopes[0] != "x" {
		t.Error("scopes 应为拷贝")
	}
}

// TestPluginContextAsDictNilMaps nil map 输出空 map。
func TestPluginContextAsDictNilMaps(t *testing.T) {
	got := PluginContext{}.AsDict()
	for _, k := range []string{"config", "cursor", "secrets", "input_data", "platform"} {
		m, ok := got[k].(map[string]any)
		if !ok || m == nil {
			t.Errorf("%s = %v, want 非 nil 空 map", k, got[k])
		}
	}
	for _, k := range []string{"scopes", "target_external_ids"} {
		s, ok := got[k].([]string)
		if !ok || s == nil {
			t.Errorf("%s = %v, want 非 nil 空切片", k, got[k])
		}
	}
}

// TestCapabilityInterfaces 覆盖能力到接口的映射。
func TestCapabilityInterfaces(t *testing.T) {
	if len(CapabilityInterfaces) != 19 {
		t.Errorf("映射数 = %d, want 19", len(CapabilityInterfaces))
	}
	want := map[string]string{
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
	for k, v := range want {
		if CapabilityInterfaces[k] != v {
			t.Errorf("%s = %q, want %q", k, CapabilityInterfaces[k], v)
		}
	}
}

// TestDownloadModeConstants 覆盖下载模式常量。
func TestDownloadModeConstants(t *testing.T) {
	if DownloadSingleBook != "single_book" || DownloadByChapters != "by_chapters" || DownloadNone != "none" {
		t.Error("下载模式常量错误")
	}
}

// TestRequiredMethods 覆盖必需方法映射。
func TestRequiredMethods(t *testing.T) {
	if got := requiredMethods(DownloadSingleBook); !reflect.DeepEqual(got, []string{"download"}) {
		t.Errorf("single_book 得到 %v", got)
	}
	if got := requiredMethods(DownloadByChapters); !reflect.DeepEqual(got, []string{"get_toc", "get_chapter"}) {
		t.Errorf("by_chapters 得到 %v", got)
	}
	if got := requiredMethods(DownloadNone); len(got) != 0 {
		t.Errorf("none 得到 %v", got)
	}
	if got := requiredMethods("bogus"); len(got) != 0 {
		t.Errorf("未知模式得到 %v", got)
	}
}

// TestHasAction 覆盖 action 判定。
func TestHasAction(t *testing.T) {
	m := map[string]any{"actions": []any{"test", "run"}}
	if !hasAction(m, "test") || !hasAction(m, "run") {
		t.Error("应命中")
	}
	if hasAction(m, "nope") {
		t.Error("不应命中")
	}
	if hasAction(map[string]any{}, "test") {
		t.Error("无 actions 不应命中")
	}
}

// TestAnySourceCapability 覆盖书源能力判定。
func TestAnySourceCapability(t *testing.T) {
	if !anySourceCapability([]any{"sources.search"}) {
		t.Error("应命中")
	}
	if anySourceCapability([]any{"metadata.lookup"}) {
		t.Error("不应命中")
	}
	if anySourceCapability(nil) {
		t.Error("nil 不应命中")
	}
}

// TestManifestFromProto 覆盖清单转换。
func TestManifestFromProto(t *testing.T) {
	if ManifestFromProto(nil) != nil {
		t.Error("nil 应返回 nil")
	}
}

// TestAsString 覆盖字符串转换。
func TestAsString(t *testing.T) {
	if asString(nil) != "" || asString("x") != "x" || asString(1) != "" {
		t.Error("asString 错误")
	}
}
