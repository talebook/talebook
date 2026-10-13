package booksource

import (
	"errors"
	"testing"
)

// TestExceptionHierarchy 校验异常继承关系与消息。
func TestExceptionHierarchy(t *testing.T) {
	parseErr := NewRuleParseError("bad rule")
	if parseErr.Error() != "bad rule" {
		t.Errorf("RuleParseError.Error() = %q", parseErr.Error())
	}
	httpErr := NewSourceHttpError("http failed")
	if httpErr.Error() != "http failed" {
		t.Errorf("SourceHttpError.Error() = %q", httpErr.Error())
	}

	// 三者都嵌入 BookSourceError，可直接访问其 Message 字段。
	//
	// 注意：Go 的 errors.As 不会穿透嵌入结构体（与 Python 的异常继承不同），
	// 因此这里断言字段可达而非 errors.As 可转换。
	for name, msg := range map[string]string{
		"parse": parseErr.Message,
		"http":  httpErr.Message,
		"js":    NewJsRuleUnsupported("x").Message,
	} {
		if msg == "" {
			t.Errorf("%s 的 Message 不应为空", name)
		}
	}

	// 直接使用 *BookSourceError 时 errors.As 正常工作。
	var base *BookSourceError
	if !errors.As(error(&BookSourceError{Message: "m"}), &base) {
		t.Error("errors.As 对 *BookSourceError 应成立")
	}
}

// TestJsRuleUnsupportedFields 校验字段与消息。
func TestJsRuleUnsupportedFields(t *testing.T) {
	err := NewJsRuleUnsupported("result.replace(")
	if err.Rule != "result.replace(" {
		t.Errorf("Rule = %q", err.Rule)
	}
	if err.Message != "JS rule is not supported: result.replace(" {
		t.Errorf("Message = %q", err.Message)
	}
	// 空规则。
	if got := NewJsRuleUnsupported("").Error(); got != "JS rule is not supported: " {
		t.Errorf("空规则消息 = %q", got)
	}
}
