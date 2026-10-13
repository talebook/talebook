package pluginproto

import (
	"strings"
	"testing"
)

// baseManifest 返回一份合法 manifest。
//
// 与 Python 校验脚本中的 base() 一致。
func baseManifest() map[string]any {
	return map[string]any{
		"protocol_version":  "talebook.plugin/v1",
		"id":                "talebook.demo",
		"name":              "Demo",
		"version":           "1.0.0",
		"categories":        []any{"metadata"},
		"capabilities":      []any{"metadata.search"},
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

// TestValidateManifestVectors 用 Python 实测向量逐条校验。
//
// 期望的错误码来自 Python 实测输出。
func TestValidateManifestVectors(t *testing.T) {
	cases := []struct {
		label   string
		raw     any
		wantErr string // 空表示应通过
	}{
		{"valid", baseManifest(), ""},
		{"xprefix", with(map[string]any{"x-custom": 1}), ""},
		{"efok", with(map[string]any{
			"extra_features": map[string]any{"run": map[string]any{"mode": "read", "schema": map[string]any{}}},
		}), ""},
		{"efscopeok", with(map[string]any{
			"permissions": []any{"metadata.read"},
			"extra_features": map[string]any{"run": map[string]any{
				"mode": "read", "schema": map[string]any{},
				"required_scopes": []any{"metadata.read"},
			}},
		}), ""},

		{"missing", map[string]any{
			"protocol_version": "talebook.plugin/v1", "id": "talebook.demo", "name": "Demo",
			"version": "1.0.0", "categories": []any{"metadata"}, "capabilities": []any{"metadata.search"},
			"runtime_kind": "builtin", "actions": []any{"test"},
			"auth_schema":   map[string]any{"properties": map[string]any{}},
			"config_schema": map[string]any{}, "connection_owners": []any{"instance"},
			"permissions": []any{}, "data_policy": map[string]any{}, "compatibility": map[string]any{},
			"homepage": "",
		}, "manifest.missing_fields"},
		{"badproto", with(map[string]any{"protocol_version": "v2"}), "manifest.protocol_unsupported"},
		{"badid", with(map[string]any{"id": "Bad_ID"}), "manifest.id_invalid"},
		{"badver", with(map[string]any{"version": "1.0"}), "manifest.version_invalid"},
		{"badname", with(map[string]any{"name": "  "}), "manifest.name_invalid"},
		{"badruntime", with(map[string]any{"runtime_kind": "docker"}), "manifest.runtime_invalid"},
		{"badcat", with(map[string]any{"categories": []any{"nope"}}), "manifest.category_invalid"},
		{"badcap", with(map[string]any{"capabilities": []any{"nope.search"}}), "manifest.capability_invalid"},
		{"capmismatch", with(map[string]any{"capabilities": []any{"reviews.x"}}), "manifest.capability_invalid"},
		{"badaction", with(map[string]any{"actions": []any{"nope"}}), "manifest.action_invalid"},
		{"dupauth", with(map[string]any{"categories": []any{"metadata", "metadata"}}), "manifest.categories_duplicate"},
		{"badschema", with(map[string]any{"config_schema": []any{}}), "manifest.schema_invalid"},
		{"badperm", with(map[string]any{"permissions": []any{"Bad"}}), "manifest.permission_invalid"},
		{"badowner", with(map[string]any{"connection_owners": []any{"nope"}}), "manifest.connection_owner_invalid"},
		{"badhomepage", with(map[string]any{"homepage": 1}), "manifest.metadata_invalid"},
		{"badui", with(map[string]any{"ui": []any{}}), "manifest.ui_invalid"},
		{"baddesc", with(map[string]any{"description": 1}), "manifest.description_invalid"},
		{"baddm", with(map[string]any{"download_mode": "nope"}), "manifest.download_mode_invalid"},
		{"unknown", with(map[string]any{"zzz": 1}), "manifest.unknown_field"},
		{"secretdefault", with(map[string]any{
			"auth_schema": map[string]any{"properties": map[string]any{
				"k": map[string]any{"default": "v", "writeOnly": true},
			}},
		}), "manifest.secret_default_forbidden"},
		{"secretnotwo", with(map[string]any{
			"auth_schema": map[string]any{"properties": map[string]any{"k": map[string]any{}}},
		}), "manifest.secret_write_only"},
		{"efbadmode", with(map[string]any{
			"extra_features": map[string]any{"run": map[string]any{"mode": "nope", "schema": map[string]any{}}},
		}), "manifest.extra_features_invalid"},
		{"efbadscope", with(map[string]any{
			"extra_features": map[string]any{"run": map[string]any{
				"mode": "read", "schema": map[string]any{},
				"required_scopes": []any{"nope.x"},
			}},
		}), "manifest.extra_features_invalid"},
	}

	for _, c := range cases {
		_, err := ValidateManifest(c.raw)
		if c.wantErr == "" {
			if err != nil {
				t.Errorf("%s: 期望通过，得到 %v", c.label, err)
			}
			continue
		}
		if err == nil {
			t.Errorf("%s: 期望 %s，但通过了", c.label, c.wantErr)
			continue
		}
		me, ok := err.(*ManifestError)
		if !ok {
			t.Errorf("%s: 错误类型 = %T, want *ManifestError", c.label, err)
			continue
		}
		if me.Code != c.wantErr {
			t.Errorf("%s: code = %q, want %q", c.label, me.Code, c.wantErr)
		}
	}
}

// TestValidateManifestNonObject 非对象输入。
func TestValidateManifestNonObject(t *testing.T) {
	for _, bad := range []any{nil, "x", 42, []any{}} {
		_, err := ValidateManifest(bad)
		if err == nil {
			t.Errorf("%v 应报错", bad)
		}
	}
}

// TestManifestToDict 返回副本，改副本不影响原 manifest。
func TestManifestToDict(t *testing.T) {
	m, err := ValidateManifest(baseManifest())
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	d := m.ToDict()
	if d["id"] != "talebook.demo" {
		t.Errorf("id = %v", d["id"])
	}
	d["id"] = "changed"
	if m.Raw["id"] != "talebook.demo" {
		t.Error("ToDict 应为副本")
	}
}

// TestValidateManifestMissingFieldsSorted 缺失字段按字典序拼接。
func TestValidateManifestMissingFieldsSorted(t *testing.T) {
	_, err := ValidateManifest(map[string]any{})
	if err == nil {
		t.Fatal("应报错")
	}
	msg := err.Error()
	if !strings.Contains(msg, "compatibility") || !strings.Contains(msg, "actions") {
		t.Errorf("错误信息应列出缺失字段，得到 %q", msg)
	}
	// 字典序：actions 在 compatibility 之前。
	if strings.Index(msg, "actions") > strings.Index(msg, "compatibility") {
		t.Errorf("缺失字段应按字典序，得到 %q", msg)
	}
}

// TestUpstreamErrors 覆盖上游错误类型。
func TestUpstreamErrors(t *testing.T) {
	e := NewUpstreamError("", "", nil)
	if e.Code != "provider_error" || e.Retryable {
		t.Errorf("默认得到 (%q,%v)", e.Code, e.Retryable)
	}
	if e.Message != "Upstream request failed" {
		t.Errorf("默认消息 = %q", e.Message)
	}
	if e.ErrorType != "other" {
		t.Errorf("默认 error_type = %q", e.ErrorType)
	}

	code := 429
	e2 := NewUpstreamError("boom", "timeout", &code)
	if e2.Message != "boom" || e2.ErrorType != "timeout" || e2.StatusCode == nil || *e2.StatusCode != 429 {
		t.Errorf("得到 %+v", e2)
	}

	auth := NewUpstreamAuthError("no", "auth", nil)
	if auth.Code != "provider_unauthorized" {
		t.Errorf("auth code = %q", auth.Code)
	}

	rl := NewUpstreamRateLimitError("", nil)
	if rl.Code != "provider_rate_limited" || !rl.Retryable {
		t.Errorf("rate limit 得到 (%q,%v)", rl.Code, rl.Retryable)
	}
	if rl.Message != "Upstream rate limit exceeded" {
		t.Errorf("rate limit 消息 = %q", rl.Message)
	}
}

// TestNewProviderItemBookSource 覆盖 book_source 的 external_id 补全。
func TestNewProviderItemBookSource(t *testing.T) {
	item := NewProviderItem("e1", "book_source", map[string]any{"title": "三体"}, nil)
	m, ok := item.Data.(map[string]any)
	if !ok {
		t.Fatalf("data 类型 = %T", item.Data)
	}
	if m["external_id"] != "e1" || m["title"] != "三体" {
		t.Errorf("得到 %+v", m)
	}

	// 已有 external_id 时不覆盖。
	item2 := NewProviderItem("e1", "book_source", map[string]any{"external_id": "keep"}, nil)
	m2, _ := item2.Data.(map[string]any)
	if m2["external_id"] != "keep" {
		t.Errorf("不应覆盖已有 external_id，得到 %v", m2["external_id"])
	}

	// 非 book_source 不改动。
	item3 := NewProviderItem("e1", "metadata", map[string]any{"title": "x"}, nil)
	m3, _ := item3.Data.(map[string]any)
	if _, has := m3["external_id"]; has {
		t.Error("非 book_source 不应补 external_id")
	}
}

// TestValidateAgainstSchema 覆盖 schema 校验子集。
func TestValidateAgainstSchema(t *testing.T) {
	schema := map[string]any{
		"type":     "object",
		"required": []any{"name"},
		"properties": map[string]any{
			"name":  map[string]any{"type": "string"},
			"count": map[string]any{"type": "integer", "minimum": float64(1), "maximum": float64(10)},
			"mode":  map[string]any{"type": "string", "enum": []any{"a", "b"}},
			"tags":  map[string]any{"type": "array", "items": map[string]any{"type": "string"}},
		},
	}

	// 合法。
	if err := ValidateAgainstSchema(schema, map[string]any{
		"name": "x", "count": float64(5), "mode": "a", "tags": []any{"t"},
	}, "config"); err != nil {
		t.Errorf("合法输入报错: %v", err)
	}

	// 空 schema 直接通过。
	if err := ValidateAgainstSchema(map[string]any{}, "anything", "config"); err != nil {
		t.Errorf("空 schema 应通过: %v", err)
	}
	if err := ValidateAgainstSchema(nil, "anything", "config"); err != nil {
		t.Errorf("nil schema 应通过: %v", err)
	}

	// 非对象值。
	if err := ValidateAgainstSchema(schema, "not-a-map", "config"); err == nil {
		t.Error("非对象应报错")
	}

	// 未知键。
	if err := ValidateAgainstSchema(schema, map[string]any{"name": "x", "zzz": 1}, "config"); err == nil {
		t.Error("未知键应报错")
	}

	// 缺必填。
	if err := ValidateAgainstSchema(schema, map[string]any{}, "config"); err == nil {
		t.Error("缺必填应报错")
	}

	// 类型错误。
	if err := ValidateAgainstSchema(schema, map[string]any{"name": 1}, "config"); err == nil {
		t.Error("类型错误应报错")
	}

	// bool 不应被当作 integer。
	if err := ValidateAgainstSchema(schema, map[string]any{"name": "x", "count": true}, "config"); err == nil {
		t.Error("bool 不应通过 integer 校验")
	}

	// 范围。
	if err := ValidateAgainstSchema(schema, map[string]any{"name": "x", "count": float64(0)}, "config"); err == nil {
		t.Error("低于最小值应报错")
	}
	if err := ValidateAgainstSchema(schema, map[string]any{"name": "x", "count": float64(11)}, "config"); err == nil {
		t.Error("高于最大值应报错")
	}

	// 枚举。
	if err := ValidateAgainstSchema(schema, map[string]any{"name": "x", "mode": "z"}, "config"); err == nil {
		t.Error("枚举外值应报错")
	}

	// 数组元素类型。
	if err := ValidateAgainstSchema(schema, map[string]any{"name": "x", "tags": []any{1}}, "config"); err == nil {
		t.Error("数组元素类型错误应报错")
	}
}

// TestValidateAgainstSchemaEmptyWhere where 为空时不做默认值替换。
//
// Python 实测：code = ".unknown_field"，msg = "unknown  fields: zzz"（双空格）。
func TestValidateAgainstSchemaEmptyWhere(t *testing.T) {
	schema := map[string]any{"type": "object", "properties": map[string]any{}}
	err := ValidateAgainstSchema(schema, map[string]any{"zzz": 1}, "")
	if err == nil {
		t.Fatal("应报错")
	}
	me, ok := err.(*ManifestError)
	if !ok {
		t.Fatalf("错误类型 = %T", err)
	}
	if me.Code != ".unknown_field" {
		t.Errorf("code = %q, want .unknown_field", me.Code)
	}
	if me.Message != "unknown  fields: zzz" {
		t.Errorf("msg = %q, want %q", me.Message, "unknown  fields: zzz")
	}
}

// TestMatchesJSONType 覆盖类型匹配。
func TestMatchesJSONType(t *testing.T) {
	cases := []struct {
		expected string
		value    any
		want     bool
	}{
		{"string", "x", true}, {"string", 1, false},
		{"integer", float64(1), true}, {"integer", int(1), true}, {"integer", int64(1), true},
		{"integer", "x", false},
		{"number", float64(1.5), true}, {"number", "x", false},
		{"boolean", true, true}, {"boolean", "x", false},
		{"array", []any{}, true}, {"array", []string{}, true}, {"array", "x", false},
		{"object", map[string]any{}, true}, {"object", "x", false},
		{"unknown", "anything", true},
	}
	for _, c := range cases {
		if got := matchesJSONType(c.expected, c.value); got != c.want {
			t.Errorf("matchesJSONType(%q,%v) = %v, want %v", c.expected, c.value, got, c.want)
		}
	}
}

// TestOptionalStringList 覆盖列表转换。
func TestOptionalStringList(t *testing.T) {
	if got, err := optionalStringList(nil); err != nil || got != nil {
		t.Errorf("nil 得到 (%v,%v)", got, err)
	}
	if got, err := optionalStringList([]string{"a"}); err != nil || len(got) != 1 {
		t.Errorf("[]string 得到 (%v,%v)", got, err)
	}
	if got, err := optionalStringList([]any{"a", "b"}); err != nil || len(got) != 2 {
		t.Errorf("[]any 得到 (%v,%v)", got, err)
	}
	if _, err := optionalStringList([]any{1}); err == nil {
		t.Error("非字符串元素应报错")
	}
	if _, err := optionalStringList([]any{""}); err == nil {
		t.Error("空字符串应报错")
	}
	if _, err := optionalStringList("x"); err == nil {
		t.Error("非列表应报错")
	}
}

// TestConstants 覆盖协议常量。
func TestConstants(t *testing.T) {
	if ProtocolVersion != "talebook.plugin/v1" {
		t.Errorf("ProtocolVersion = %q", ProtocolVersion)
	}
	if len(Categories) != 5 || len(RuntimeKinds) != 4 || len(Actions) != 5 {
		t.Errorf("常量集合大小错误: %d/%d/%d", len(Categories), len(RuntimeKinds), len(Actions))
	}
	if len(RequiredManifestFields) != 16 {
		t.Errorf("必填字段数 = %d, want 16", len(RequiredManifestFields))
	}
	if len(OptionalManifestFields) != 4 {
		t.Errorf("可选字段数 = %d, want 4", len(OptionalManifestFields))
	}
	if len(ConnectionOwners) != 2 {
		t.Errorf("连接归属数 = %d, want 2", len(ConnectionOwners))
	}
}

// TestRegexes 覆盖正则。
func TestRegexes(t *testing.T) {
	for _, ok := range []string{"a.b", "talebook.demo", "a1.b2-c3"} {
		if !PluginIDRe.MatchString(ok) {
			t.Errorf("PluginIDRe 应匹配 %q", ok)
		}
	}
	for _, bad := range []string{"abc", "A.b", ".b", "a."} {
		if PluginIDRe.MatchString(bad) {
			t.Errorf("PluginIDRe 不应匹配 %q", bad)
		}
	}
	for _, ok := range []string{"1.0.0", "1.0.0-beta", "1.0.0+build"} {
		if !VersionRe.MatchString(ok) {
			t.Errorf("VersionRe 应匹配 %q", ok)
		}
	}
	for _, bad := range []string{"1.0", "v1.0.0"} {
		if VersionRe.MatchString(bad) {
			t.Errorf("VersionRe 不应匹配 %q", bad)
		}
	}
	for _, ok := range []string{"metadata.search", "a1.b2"} {
		if !CapabilityRe.MatchString(ok) {
			t.Errorf("CapabilityRe 应匹配 %q", ok)
		}
	}
	for _, bad := range []string{"Metadata.search", "metadata", "metadata."} {
		if CapabilityRe.MatchString(bad) {
			t.Errorf("CapabilityRe 不应匹配 %q", bad)
		}
	}
}

// TestUpstreamErrorError 覆盖 Error() 方法。
func TestUpstreamErrorError(t *testing.T) {
	e := NewUpstreamError("boom", "other", nil)
	if e.Error() != "boom" {
		t.Errorf("Error() = %q, want boom", e.Error())
	}
	me := newManifestError("c", "m")
	if me.Error() != "m" {
		t.Errorf("Error() = %q, want m", me.Error())
	}
}

// TestValidateManifestStringSetBranches 覆盖 stringSet 的边界分支。
func TestValidateManifestStringSetBranches(t *testing.T) {
	// 非列表。
	if _, err := ValidateManifest(with(map[string]any{"categories": "metadata"})); err == nil {
		t.Error("非列表应报错")
	}
	// 含非字符串元素。
	if _, err := ValidateManifest(with(map[string]any{"categories": []any{1}})); err == nil {
		t.Error("非字符串元素应报错")
	}
	// 空列表。
	if _, err := ValidateManifest(with(map[string]any{"categories": []any{}})); err == nil {
		t.Error("空列表应报错")
	}
	// 字段缺失（nil）。
	m := baseManifest()
	delete(m, "categories")
	if _, err := ValidateManifest(m); err == nil {
		t.Error("缺失字段应报错")
	}
}

// TestValidateManifestPermissionsEmpty 空 permissions 允许。
func TestValidateManifestPermissionsEmpty(t *testing.T) {
	if _, err := ValidateManifest(with(map[string]any{"permissions": []any{}})); err != nil {
		t.Errorf("空 permissions 应允许: %v", err)
	}
}

// TestValidateManifestDownloadModeNil download_mode 为 nil 时跳过。
func TestValidateManifestDownloadModeNil(t *testing.T) {
	if _, err := ValidateManifest(with(map[string]any{"download_mode": nil})); err != nil {
		t.Errorf("nil download_mode 应允许: %v", err)
	}
}

// TestValidateManifestExtraFeaturesBranches 覆盖 extra_features 边界。
func TestValidateManifestExtraFeaturesBranches(t *testing.T) {
	// 非对象。
	if _, err := ValidateManifest(with(map[string]any{"extra_features": []any{}})); err == nil {
		t.Error("非对象应报错")
	}
	// 空 action 名。
	if _, err := ValidateManifest(with(map[string]any{
		"extra_features": map[string]any{"": map[string]any{"mode": "read", "schema": map[string]any{}}},
	})); err == nil {
		t.Error("空 action 名应报错")
	}
	// feature 非对象。
	if _, err := ValidateManifest(with(map[string]any{
		"extra_features": map[string]any{"run": "x"},
	})); err == nil {
		t.Error("feature 非对象应报错")
	}
	// 缺 schema。
	if _, err := ValidateManifest(with(map[string]any{
		"extra_features": map[string]any{"run": map[string]any{"mode": "read"}},
	})); err == nil {
		t.Error("缺 schema 应报错")
	}
	// required_scopes 非列表。
	if _, err := ValidateManifest(with(map[string]any{
		"extra_features": map[string]any{"run": map[string]any{
			"mode": "read", "schema": map[string]any{}, "required_scopes": "x",
		}},
	})); err == nil {
		t.Error("required_scopes 非列表应报错")
	}
}

// TestRejectSecretDefaultsBranches 覆盖 auth_schema 边界。
func TestRejectSecretDefaultsBranches(t *testing.T) {
	// properties 非对象。
	if _, err := ValidateManifest(with(map[string]any{
		"auth_schema": map[string]any{"properties": []any{}},
	})); err == nil {
		t.Error("properties 非对象应报错")
	}
	// 字段非对象。
	if _, err := ValidateManifest(with(map[string]any{
		"auth_schema": map[string]any{"properties": map[string]any{"k": "x"}},
	})); err == nil {
		t.Error("字段非对象应报错")
	}
}

// TestToFloat 覆盖数值转换。
func TestToFloat(t *testing.T) {
	cases := []struct {
		in   any
		want float64
		ok   bool
	}{
		{float64(1.5), 1.5, true},
		{float32(2.5), 2.5, true},
		{int(3), 3, true},
		{int64(4), 4, true},
		{"x", 0, false},
		{nil, 0, false},
	}
	for _, c := range cases {
		got, ok := toFloat(c.in)
		if ok != c.ok || (ok && got != c.want) {
			t.Errorf("toFloat(%v) = (%v,%v), want (%v,%v)", c.in, got, ok, c.want, c.ok)
		}
	}
}

// TestIsBool 覆盖布尔判定。
func TestIsBool(t *testing.T) {
	if !isBool(true) || isBool(1) || isBool("true") {
		t.Error("isBool 错误")
	}
}

// TestAsStringAndContains 覆盖辅助函数。
func TestAsStringAndContains(t *testing.T) {
	if asString(nil) != "" || asString("x") != "x" || asString(1) != "1" {
		t.Error("asString 错误")
	}
	if !contains([]string{"a", "b"}, "b") || contains([]string{"a"}, "z") {
		t.Error("contains 错误")
	}
}
