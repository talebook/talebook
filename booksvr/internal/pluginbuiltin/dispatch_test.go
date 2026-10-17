package pluginbuiltin

import (
	"errors"
	"testing"

	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginproto"
	"talebook/booksvr/internal/pluginruntime"
)

// dispatchProbe 是一个可配置的 provider 替身，用于验证 DispatchInvoke 的动作语义。
type dispatchProbe struct {
	manifest  map[string]any
	report    plugindomain.CheckReport
	reportErr error
	executed  bool
	execErr   error
	searched  bool
}

func (p *dispatchProbe) Manifest() map[string]any { return p.manifest }

func (p *dispatchProbe) SelfCheck(map[string]any) (plugindomain.CheckReport, error) {
	return p.report, p.reportErr
}

func (p *dispatchProbe) Execute(map[string]any) (pluginproto.ProviderResult, error) {
	p.executed = true
	return pluginproto.ProviderResult{HealthMessage: "executed"}, p.execErr
}

func (p *dispatchProbe) SearchBooks(query plugindomain.MetadataQuery, _ map[string]any) ([]plugindomain.BookMetadata, error) {
	p.searched = true
	return []plugindomain.BookMetadata{plugindomain.NewBookMetadata(map[string]any{"title": query.Title})}, nil
}

func (p *dispatchProbe) GetMetadata(string, map[string]any) (*plugindomain.BookMetadata, error) {
	return nil, nil
}

func (p *dispatchProbe) GetCover(string, map[string]any) (*pluginiface.CoverResult, error) {
	return nil, nil
}

// TestDispatchInvokeTestHealthy 覆盖 action=test 且 self_check 健康。
func TestDispatchInvokeTestHealthy(t *testing.T) {
	p := &dispatchProbe{report: plugindomain.CheckReport{Healthy: true, Message: "ok"}}
	out, err := DispatchInvoke(p, "test", nil, map[string]any{})
	if err != nil {
		t.Fatalf("DispatchInvoke: %v", err)
	}
	result, ok := out.(pluginproto.ProviderResult)
	if !ok {
		t.Fatalf("结果类型 = %T, want ProviderResult", out)
	}
	if result.HealthMessage != "ok" {
		t.Errorf("HealthMessage = %q, want ok", result.HealthMessage)
	}
	if p.executed {
		t.Error("test 动作不应调用 execute")
	}
}

// TestDispatchInvokeTestUnhealthy 覆盖 action=test 且 self_check 不健康。
func TestDispatchInvokeTestUnhealthy(t *testing.T) {
	p := &dispatchProbe{report: plugindomain.CheckReport{Healthy: false, Message: "boom"}}
	_, err := DispatchInvoke(p, "test", nil, map[string]any{})
	if err == nil {
		t.Fatal("期望报错")
	}
	var upstream *pluginproto.UpstreamError
	if !errors.As(err, &upstream) {
		t.Fatalf("错误类型 = %T, want UpstreamError", err)
	}
	if upstream.Message != "boom" {
		t.Errorf("Message = %q, want boom", upstream.Message)
	}
}

// TestDispatchInvokeTestUnhealthyEmptyMessage 覆盖空消息时的兜底文案。
func TestDispatchInvokeTestUnhealthyEmptyMessage(t *testing.T) {
	p := &dispatchProbe{report: plugindomain.CheckReport{Healthy: false}}
	_, err := DispatchInvoke(p, "test", nil, map[string]any{})
	if err == nil {
		t.Fatal("期望报错")
	}
	if err.Error() != "Plugin self-check failed" {
		t.Errorf("Message = %q, want Plugin self-check failed", err.Error())
	}
}

// TestDispatchInvokeRunUsesExecute 覆盖 run 动作走 execute。
func TestDispatchInvokeRunUsesExecute(t *testing.T) {
	p := &dispatchProbe{}
	out, err := DispatchInvoke(p, "run", nil, map[string]any{})
	if err != nil {
		t.Fatalf("DispatchInvoke: %v", err)
	}
	if !p.executed {
		t.Error("run 动作应调用 execute")
	}
	if result, ok := out.(pluginproto.ProviderResult); !ok || result.HealthMessage != "executed" {
		t.Errorf("结果 = %#v, want executed", out)
	}
}

// TestDispatchInvokeLegacyUnsupported 覆盖无 execute 时的 legacy 错误。
func TestDispatchInvokeLegacyUnsupported(t *testing.T) {
	_, err := DispatchInvoke(&noExecuteProbe{}, "run", nil, map[string]any{})
	if err == nil {
		t.Fatal("期望报错")
	}
	if code := pluginruntime.ErrorCodeOf(err); code != "plugin.legacy_action_unsupported" {
		t.Errorf("错误码 = %q, want plugin.legacy_action_unsupported", code)
	}
}

// TestDispatchInvokeCapability 覆盖能力方法分派。
func TestDispatchInvokeCapability(t *testing.T) {
	p := &dispatchProbe{}
	out, err := DispatchInvoke(p, "search_books", []any{"三体"}, map[string]any{})
	if err != nil {
		t.Fatalf("DispatchInvoke: %v", err)
	}
	if !p.searched {
		t.Error("search_books 应调用 SearchBooks")
	}
	records, ok := out.([]plugindomain.BookMetadata)
	if !ok || len(records) != 1 {
		t.Fatalf("结果 = %#v, want 1 条", out)
	}
	if records[0].GetString("title") != "三体" {
		t.Errorf("title = %q, want 三体", records[0].GetString("title"))
	}
}

// TestDispatchInvokeUnknownMethod 覆盖未知方法返回契约错误。
func TestDispatchInvokeUnknownMethod(t *testing.T) {
	_, err := DispatchInvoke(&dispatchProbe{}, "no_such_method", nil, map[string]any{})
	if err == nil {
		t.Fatal("期望报错")
	}
	if code := pluginruntime.ErrorCodeOf(err); code != "plugin.provider_contract" {
		t.Errorf("错误码 = %q, want plugin.provider_contract", code)
	}
}

// noExecuteProbe 只实现 Manifest，用于验证 legacy 分支。
type noExecuteProbe struct{}

func (p *noExecuteProbe) Manifest() map[string]any { return map[string]any{} }
