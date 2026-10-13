package pluginruntime

import (
	"errors"
	"testing"
)

func TestCanonicalJSONMatchesPythonDumps(t *testing.T) {
	// Python: json.dumps({"b":1,"a":"<x>"}, ensure_ascii=False, sort_keys=True,
	//                     separators=(",", ":"))
	// → {"a":"<x>","b":1}
	got, err := canonicalJSON(map[string]any{"b": 1, "a": "<x>"})
	if err != nil {
		t.Fatalf("canonicalJSON: %v", err)
	}
	want := `{"a":"<x>","b":1}`
	if string(got) != want {
		t.Errorf("got %s, want %s", got, want)
	}
}

func TestCanonicalJSONNoTrailingNewline(t *testing.T) {
	got, err := canonicalJSON(map[string]any{"a": 1})
	if err != nil {
		t.Fatalf("canonicalJSON: %v", err)
	}
	if len(got) == 0 || got[len(got)-1] == '\n' {
		t.Errorf("trailing newline present: %q", got)
	}
}

func TestValidateCredentialsNotObject(t *testing.T) {
	err := ValidateCredentials(&DefinitionView{}, nil)
	var runtimeErr *PluginRuntimeError
	if !errors.As(err, &runtimeErr) {
		t.Fatalf("type = %T", err)
	}
	if runtimeErr.Code != "plugin.credentials_invalid" {
		t.Errorf("code = %q", runtimeErr.Code)
	}
}

func TestValidateCredentialsMissingRequired(t *testing.T) {
	def := &DefinitionView{AuthSchema: map[string]any{
		"properties": map[string]any{"token": map[string]any{"type": "string"}},
		"required":   []any{"token"},
	}}
	err := ValidateCredentials(def, map[string]any{})
	var runtimeErr *PluginRuntimeError
	if !errors.As(err, &runtimeErr) || runtimeErr.Code != "plugin.credentials_missing" {
		t.Errorf("got %v", err)
	}
}

func TestValidateCredentialsUnknownField(t *testing.T) {
	def := &DefinitionView{AuthSchema: map[string]any{
		"properties": map[string]any{"token": map[string]any{"type": "string"}},
	}}
	err := ValidateCredentials(def, map[string]any{"token": "x", "extra": "y"})
	var runtimeErr *PluginRuntimeError
	if !errors.As(err, &runtimeErr) || runtimeErr.Code != "plugin.credentials_unknown" {
		t.Errorf("got %v", err)
	}
}

func TestValidateCredentialsEmptyValue(t *testing.T) {
	def := &DefinitionView{AuthSchema: map[string]any{
		"properties": map[string]any{"token": map[string]any{"type": "string"}},
	}}
	for _, bad := range []any{"", 123, nil, true} {
		err := ValidateCredentials(def, map[string]any{"token": bad})
		var runtimeErr *PluginRuntimeError
		if !errors.As(err, &runtimeErr) || runtimeErr.Code != "plugin.credentials_invalid" {
			t.Errorf("value %v: got %v", bad, err)
		}
	}
}

func TestValidateCredentialsOK(t *testing.T) {
	def := &DefinitionView{AuthSchema: map[string]any{
		"properties": map[string]any{"token": map[string]any{"type": "string"}},
		"required":   []any{"token"},
	}}
	if err := ValidateCredentials(def, map[string]any{"token": "abc"}); err != nil {
		t.Errorf("got %v", err)
	}
}

func TestValidatePublicConfigNotObject(t *testing.T) {
	err := ValidatePublicConfig(nil, nil, nil)
	var runtimeErr *PluginRuntimeError
	if !errors.As(err, &runtimeErr) || runtimeErr.Code != "plugin.config_invalid" {
		t.Errorf("got %v", err)
	}
}

func TestValidatePublicConfigSensitiveKey(t *testing.T) {
	cases := []map[string]any{
		{"password": "x"},
		{"nested": map[string]any{"api_key": "x"}},
		{"list": []any{map[string]any{"token": "x"}}},
	}
	for _, cfg := range cases {
		err := ValidatePublicConfig(cfg, nil, nil)
		var runtimeErr *PluginRuntimeError
		if !errors.As(err, &runtimeErr) || runtimeErr.Code != "plugin.secret_in_config" {
			t.Errorf("config %v: got %v", cfg, err)
		}
	}
}

func TestValidatePublicConfigCredentialLeak(t *testing.T) {
	// Python 用 `str(value) in secret_values` 做整值相等判定，不是子串匹配。
	creds := map[string]any{"token": "s3cr3t"}
	err := ValidatePublicConfig(map[string]any{"endpoint": "s3cr3t"}, creds, nil)
	var runtimeErr *PluginRuntimeError
	if !errors.As(err, &runtimeErr) || runtimeErr.Code != "plugin.secret_in_config" {
		t.Errorf("got %v", err)
	}
}

func TestValidatePublicConfigCredentialLeakNested(t *testing.T) {
	creds := map[string]any{"token": "s3cr3t"}
	cfg := map[string]any{"nested": map[string]any{"value": "s3cr3t"}}
	err := ValidatePublicConfig(cfg, creds, nil)
	var runtimeErr *PluginRuntimeError
	if !errors.As(err, &runtimeErr) || runtimeErr.Code != "plugin.secret_in_config" {
		t.Errorf("got %v", err)
	}
}

func TestValidatePublicConfigSubstringIsNotLeak(t *testing.T) {
	// 子串不算泄漏（与 Python 一致）。
	creds := map[string]any{"token": "s3cr3t"}
	if err := ValidatePublicConfig(map[string]any{"endpoint": "https://x/?t=s3cr3t"}, creds, nil); err != nil {
		t.Errorf("substring must not be treated as leak: %v", err)
	}
}

func TestValidatePublicConfigLeakBeatsShape(t *testing.T) {
	// 泄漏是更严重的错误，不应被 unknown_field 掩盖。
	creds := map[string]any{"token": "s3cr3t"}
	schema := map[string]any{
		"properties": map[string]any{"endpoint": map[string]any{"type": "string"}},
	}
	err := ValidatePublicConfig(map[string]any{"bogus": "s3cr3t"}, creds, schema)
	var runtimeErr *PluginRuntimeError
	if !errors.As(err, &runtimeErr) || runtimeErr.Code != "plugin.secret_in_config" {
		t.Errorf("got %v", err)
	}
}

func TestValidatePublicConfigSchemaEnforced(t *testing.T) {
	schema := map[string]any{
		"properties": map[string]any{"endpoint": map[string]any{"type": "string"}},
	}
	// 未声明的键应被拒绝。
	err := ValidatePublicConfig(map[string]any{"bogus": "x"}, nil, schema)
	if err == nil {
		t.Fatal("expected schema violation")
	}
	var runtimeErr *PluginRuntimeError
	if !errors.As(err, &runtimeErr) {
		t.Fatalf("type = %T", err)
	}
	if runtimeErr.Code == "" {
		t.Errorf("code must be set")
	}
}

func TestValidatePublicConfigPlatformKeysAllowed(t *testing.T) {
	schema := map[string]any{
		"properties": map[string]any{"endpoint": map[string]any{"type": "string"}},
	}
	cfg := map[string]any{
		"endpoint":         "https://example.com",
		"timeout_seconds":  30,
		"max_retries":      2,
		"backoff_seconds":  1.5,
		"host_concurrency": 5,
	}
	if err := ValidatePublicConfig(cfg, nil, schema); err != nil {
		t.Errorf("platform keys must be allowed: %v", err)
	}
}

func TestValidatePublicConfigNoSchemaSkipsShape(t *testing.T) {
	// 无 config_schema 时只查泄漏，不查形状。
	if err := ValidatePublicConfig(map[string]any{"anything": "goes"}, nil, nil); err != nil {
		t.Errorf("got %v", err)
	}
}

func TestValidatePublicConfigEmptyCredentialIgnored(t *testing.T) {
	creds := map[string]any{"token": "", "other": nil}
	if err := ValidatePublicConfig(map[string]any{"endpoint": "x"}, creds, nil); err != nil {
		t.Errorf("empty credentials must not trigger leak detection: %v", err)
	}
}

func TestManifestChecksumStable(t *testing.T) {
	raw := minimalManifest("demo")
	a, err := manifestChecksum(raw)
	if err != nil {
		t.Fatalf("checksum: %v", err)
	}
	b, err := manifestChecksum(raw)
	if err != nil {
		t.Fatalf("checksum: %v", err)
	}
	if a != b {
		t.Errorf("checksum not stable: %s vs %s", a, b)
	}
	if len(a) != 64 {
		t.Errorf("sha256 hex length = %d", len(a))
	}
}

func TestManifestChecksumKeyOrderIndependent(t *testing.T) {
	a, _ := manifestChecksum(map[string]any{"x": 1, "y": 2})
	b, _ := manifestChecksum(map[string]any{"y": 2, "x": 1})
	if a != b {
		t.Errorf("checksum must be key-order independent: %s vs %s", a, b)
	}
}

func TestAnyListAndAnyMap(t *testing.T) {
	if got := anyList(nil); len(got) != 0 {
		t.Errorf("anyList(nil) = %v", got)
	}
	if got := anyList("x"); len(got) != 0 {
		t.Errorf("anyList(string) = %v", got)
	}
	if got := anyList([]any{1}); len(got) != 1 {
		t.Errorf("anyList(list) = %v", got)
	}
	if got := anyMap(nil); len(got) != 0 {
		t.Errorf("anyMap(nil) = %v", got)
	}
	if got := anyMap(map[string]any{"a": 1}); len(got) != 1 {
		t.Errorf("anyMap(map) = %v", got)
	}
}

func TestStringSetAndContains(t *testing.T) {
	set := stringSetOf([]any{"a", "b"})
	if !set["a"] || !set["b"] || set["c"] {
		t.Errorf("set = %v", set)
	}
	if !containsString([]any{"a", "b"}, "b") {
		t.Errorf("containsString failed")
	}
	if containsString([]any{"a"}, "z") {
		t.Errorf("containsString false positive")
	}
}

func TestJSONText(t *testing.T) {
	if got := jsonText(map[string]any{"a": 1}); got != `{"a":1}` {
		t.Errorf("got %s", got)
	}
	if got := jsonText([]any{}); got != `[]` {
		t.Errorf("got %s", got)
	}
}
