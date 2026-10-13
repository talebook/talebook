package pluginruntime

import (
	"errors"
	"testing"

	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginproto"
)

// fakeProvider 是满足 pluginiface.Provider + MetadataProvider 契约的最小实现。
type fakeProvider struct {
	manifest map[string]any
	hosts    []string
}

func (f *fakeProvider) Manifest() map[string]any  { return f.manifest }
func (f *fakeProvider) ProxyImageHosts() []string { return f.hosts }

// SelfCheck 满足 actions 含 test 时的契约要求。
func (f *fakeProvider) SelfCheck(context map[string]any) (plugindomain.CheckReport, error) {
	return plugindomain.CheckReport{}, nil
}

func (f *fakeProvider) SearchBooks(query plugindomain.MetadataQuery,
	context map[string]any) ([]plugindomain.BookMetadata, error) {
	return nil, nil
}

func (f *fakeProvider) GetMetadata(externalID string,
	context map[string]any) (*plugindomain.BookMetadata, error) {
	return nil, nil
}

func (f *fakeProvider) GetCover(coverURL string,
	context map[string]any) (*pluginiface.CoverResult, error) {
	return nil, nil
}

// minimalManifest 返回一份能通过 ValidateManifest 的合法清单。
// id 会自动加上 `talebook.` 前缀（清单要求点分小写标识符）。
func minimalManifest(id string) map[string]any {
	return map[string]any{
		"protocol_version":  "talebook.plugin/v1",
		"id":                "talebook." + id,
		"name":              "测试插件",
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

func TestPluginRuntimeErrorFields(t *testing.T) {
	err := NewPluginRuntimeError("plugin.x", "boom", true)
	if err.Code != "plugin.x" || err.Message != "boom" || !err.Retryable {
		t.Errorf("got %+v", err)
	}
	if err.Error() != "boom" {
		t.Errorf("Error() = %q", err.Error())
	}
}

func TestHostConcurrencyDefaults(t *testing.T) {
	if got := HostConcurrency(map[string]any{}); got != 10 {
		t.Errorf("empty context = %d, want 10", got)
	}
	if got := HostConcurrency(map[string]any{"config": map[string]any{}}); got != 10 {
		t.Errorf("empty config = %d, want 10", got)
	}
}

func TestHostConcurrencyClamping(t *testing.T) {
	cases := []struct {
		raw  any
		want int
	}{
		{1, 1},
		{50, 50},
		{100, 100},
		{0, 1},
		{-5, 1},
		{101, 100},
		{9999, 100},
		{float64(7), 7},
		{"12", 12},
	}
	for _, c := range cases {
		ctx := map[string]any{"config": map[string]any{"host_concurrency": c.raw}}
		if got := HostConcurrency(ctx); got != c.want {
			t.Errorf("HostConcurrency(%v) = %d, want %d", c.raw, got, c.want)
		}
	}
}

func TestHostConcurrencyInvalidFallsBack(t *testing.T) {
	ctx := map[string]any{"config": map[string]any{"host_concurrency": "abc"}}
	if got := HostConcurrency(ctx); got != 10 {
		t.Errorf("got %d, want 10", got)
	}
}

func TestRedactedExceptionRuntimeError(t *testing.T) {
	secrets := map[string]any{"token": "s3cr3t"}
	in := NewPluginRuntimeError("plugin.x", "failed with s3cr3t", true)
	out := RedactedException(in, secrets)

	var got *PluginRuntimeError
	if !errors.As(out, &got) {
		t.Fatalf("type = %T", out)
	}
	if got.Code != "plugin.x" || !got.Retryable {
		t.Errorf("code/retryable lost: %+v", got)
	}
	if got.Message != "failed with [REDACTED]" {
		t.Errorf("message = %q", got.Message)
	}
}

func TestRedactedExceptionUpstreamError(t *testing.T) {
	secrets := map[string]any{"token": "s3cr3t"}
	status := 500
	in := pluginproto.NewUpstreamError("upstream said s3cr3t", "server", &status)
	out := RedactedException(in, secrets)

	var got *pluginproto.UpstreamError
	if !errors.As(out, &got) {
		t.Fatalf("type = %T", out)
	}
	if got.Message != "upstream said [REDACTED]" {
		t.Errorf("message = %q", got.Message)
	}
	if got.ErrorType != "server" {
		t.Errorf("error_type = %q", got.ErrorType)
	}
	if got.StatusCode == nil || *got.StatusCode != 500 {
		t.Errorf("status_code = %v", got.StatusCode)
	}
}

func TestRedactedExceptionRateLimit(t *testing.T) {
	in := pluginproto.NewUpstreamRateLimitError("slow down s3cr3t", 30)
	out := RedactedException(in, map[string]any{"token": "s3cr3t"})

	var got *pluginproto.UpstreamError
	if !errors.As(out, &got) {
		t.Fatalf("type = %T", out)
	}
	if got.Code != "provider_rate_limited" || !got.Retryable {
		t.Errorf("rate limit identity lost: %+v", got)
	}
	if got.Message != "slow down [REDACTED]" {
		t.Errorf("message = %q", got.Message)
	}
}

func TestRedactedExceptionAuth(t *testing.T) {
	in := pluginproto.NewUpstreamAuthError("bad s3cr3t", "auth", nil)
	out := RedactedException(in, map[string]any{"token": "s3cr3t"})

	var got *pluginproto.UpstreamError
	if !errors.As(out, &got) {
		t.Fatalf("type = %T", out)
	}
	if got.Code != "provider_unauthorized" {
		t.Errorf("code = %q", got.Code)
	}
	if got.Message != "bad [REDACTED]" {
		t.Errorf("message = %q", got.Message)
	}
}

func TestRedactedExceptionUnknownError(t *testing.T) {
	out := RedactedException(errors.New("plain failure"), nil)
	var got *PluginRuntimeError
	if !errors.As(out, &got) {
		t.Fatalf("type = %T", out)
	}
	if got.Code != "plugin.execution_failed" {
		t.Errorf("code = %q", got.Code)
	}
	if got.Retryable {
		t.Errorf("retryable should default false")
	}
	if got.Message != "plain failure" {
		t.Errorf("message = %q", got.Message)
	}
}

func TestRedactedExceptionNil(t *testing.T) {
	if got := RedactedException(nil, nil); got != nil {
		t.Errorf("got %v", got)
	}
}

func TestRegistryRegisterAndGet(t *testing.T) {
	reg := NewPluginRegistry()
	p := &fakeProvider{manifest: minimalManifest("demo")}
	caps := pluginiface.CapabilitySet{
		Interfaces:   map[string]bool{"MetadataProvider": true},
		HasSelfCheck: true,
	}

	raw, err := reg.Register(p, caps)
	if err != nil {
		t.Fatalf("Register: %v", err)
	}
	if raw["id"] != "talebook.demo" {
		t.Errorf("id = %v", raw["id"])
	}

	got, err := reg.Get("talebook.demo")
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got != pluginiface.Provider(p) {
		t.Errorf("Get returned wrong provider")
	}
}

func TestRegistryGetMissing(t *testing.T) {
	reg := NewPluginRegistry()
	_, err := reg.Get("nope")
	var runtimeErr *PluginRuntimeError
	if !errors.As(err, &runtimeErr) {
		t.Fatalf("type = %T", err)
	}
	if runtimeErr.Code != "plugin.provider_unavailable" {
		t.Errorf("code = %q", runtimeErr.Code)
	}
	if runtimeErr.Retryable {
		t.Errorf("retryable should be false")
	}
}

func TestRegistryRegisterContractViolation(t *testing.T) {
	reg := NewPluginRegistry()
	// 声明 metadata.lookup 能力但 CapabilitySet 未声明实现 → 契约违反。
	p := &fakeProvider{manifest: minimalManifest("bad")}
	_, err := reg.Register(p, pluginiface.CapabilitySet{Interfaces: map[string]bool{}, HasSelfCheck: true})
	if err == nil {
		t.Fatal("expected contract violation error")
	}
	if _, getErr := reg.Get("talebook.bad"); getErr == nil {
		t.Errorf("failed registration must not be stored")
	}
}

func TestRegistryRegisterInvalidManifest(t *testing.T) {
	reg := NewPluginRegistry()
	p := &fakeProvider{manifest: map[string]any{"id": "x"}}
	if _, err := reg.Register(p, pluginiface.CapabilitySet{}); err == nil {
		t.Fatal("expected manifest validation error")
	}
}

func TestRegistryProvidersOrder(t *testing.T) {
	reg := NewPluginRegistry()
	caps := pluginiface.CapabilitySet{
		Interfaces:   map[string]bool{"MetadataProvider": true},
		HasSelfCheck: true,
	}
	for _, id := range []string{"b", "a", "c"} {
		if _, err := reg.Register(&fakeProvider{manifest: minimalManifest(id)}, caps); err != nil {
			t.Fatalf("Register(%s): %v", id, err)
		}
	}
	got := reg.Providers()
	if len(got) != 3 {
		t.Fatalf("len = %d", len(got))
	}
	want := []string{"talebook.b", "talebook.a", "talebook.c"}
	for i, p := range got {
		if p.Manifest()["id"] != want[i] {
			t.Errorf("index %d = %v, want %s", i, p.Manifest()["id"], want[i])
		}
	}
	sorted := reg.SortedIDs()
	if sorted[0] != "talebook.a" || sorted[2] != "talebook.c" {
		t.Errorf("SortedIDs = %v", sorted)
	}
}

func TestRegistryManifests(t *testing.T) {
	reg := NewPluginRegistry()
	caps := pluginiface.CapabilitySet{
		Interfaces:   map[string]bool{"MetadataProvider": true},
		HasSelfCheck: true,
	}
	if _, err := reg.Register(&fakeProvider{manifest: minimalManifest("demo")}, caps); err != nil {
		t.Fatalf("Register: %v", err)
	}
	manifests, err := reg.Manifests()
	if err != nil {
		t.Fatalf("Manifests: %v", err)
	}
	if len(manifests) != 1 || manifests[0]["id"] != "talebook.demo" {
		t.Errorf("got %v", manifests)
	}
}

func TestAllowsImageProxyHost(t *testing.T) {
	reg := NewPluginRegistry()
	caps := pluginiface.CapabilitySet{
		Interfaces:   map[string]bool{"MetadataProvider": true},
		HasSelfCheck: true,
	}
	p := &fakeProvider{manifest: minimalManifest("demo"), hosts: []string{"Images.Example.COM."}}
	if _, err := reg.Register(p, caps); err != nil {
		t.Fatalf("Register: %v", err)
	}

	cases := []struct {
		host string
		want bool
	}{
		{"images.example.com", true},
		{"IMAGES.EXAMPLE.COM", true},
		{"images.example.com.", true},
		{"  images.example.com  ", true},
		{"cdn.images.example.com", true},
		{"example.com", false},
		{"notimages.example.com", false},
		{"evil.com", false},
		{"", false},
		{"   ", false},
	}
	for _, c := range cases {
		if got := reg.AllowsImageProxyHost(c.host); got != c.want {
			t.Errorf("AllowsImageProxyHost(%q) = %v, want %v", c.host, got, c.want)
		}
	}
}

func TestAllowsImageProxyHostNoDeclarations(t *testing.T) {
	reg := NewPluginRegistry()
	caps := pluginiface.CapabilitySet{
		Interfaces:   map[string]bool{"MetadataProvider": true},
		HasSelfCheck: true,
	}
	if _, err := reg.Register(&fakeProvider{manifest: minimalManifest("demo")}, caps); err != nil {
		t.Fatalf("Register: %v", err)
	}
	if reg.AllowsImageProxyHost("example.com") {
		t.Errorf("provider without proxy_image_hosts must not allow anything")
	}
}

func TestPlatformConfigSchemaShape(t *testing.T) {
	props := PlatformConfigSchema["properties"].(map[string]any)
	for _, key := range []string{"timeout_seconds", "max_retries", "backoff_seconds", "host_concurrency"} {
		if _, ok := props[key]; !ok {
			t.Errorf("missing %s", key)
		}
	}
	hc := props["host_concurrency"].(map[string]any)
	if hc["default"] != 10 {
		t.Errorf("host_concurrency default = %v", hc["default"])
	}
}

func TestTerminalStatusesAndEntityTypes(t *testing.T) {
	for _, s := range []string{"succeeded", "failed", "partial", "rolled_back"} {
		if !TerminalStatuses[s] {
			t.Errorf("missing terminal status %s", s)
		}
	}
	if TerminalStatuses["running"] {
		t.Errorf("running must not be terminal")
	}
	for _, e := range []string{"metadata", "annotation", "review", "book_source"} {
		if !EntityTypes[e] {
			t.Errorf("missing entity type %s", e)
		}
	}
}

func TestDefaultCounts(t *testing.T) {
	for _, k := range []string{"fetched", "written", "updated", "skipped", "failed", "conflicts"} {
		if v, ok := DefaultCounts[k]; !ok || v != 0 {
			t.Errorf("DefaultCounts[%s] = %v", k, v)
		}
	}
	if len(DefaultCounts) != 6 {
		t.Errorf("len = %d", len(DefaultCounts))
	}
}

func TestConnectionRoles(t *testing.T) {
	if BuiltinConnectionRole != "builtin" || DefaultConnectionRole != "default" {
		t.Errorf("roles = %q / %q", BuiltinConnectionRole, DefaultConnectionRole)
	}
}
