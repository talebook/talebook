package pluginbuiltin

import (
	"testing"

	"talebook/booksvr/internal/pluginruntime"
)

// TestRegisterNoError 覆盖注册入口的基本契约：注册不报错。
//
// 「39 个都注册了」的断言放在实施项 7.1，避免一个测试跨多步长期红着。
func TestRegisterNoError(t *testing.T) {
	reg := pluginruntime.NewPluginRegistry()
	if err := Register(reg); err != nil {
		t.Fatalf("Register: %v", err)
	}
}
