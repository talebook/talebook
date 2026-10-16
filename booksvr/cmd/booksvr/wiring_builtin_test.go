package main

import (
	"testing"

	"talebook/booksvr/internal/pluginbuiltin"
	"talebook/booksvr/internal/pluginruntime"
)

// TestServiceWiringRegistersBuiltins 覆盖启动装配调用了内置插件注册入口。
//
// 断言方式：把 newServiceWiring 的注册表条目数与「对空注册表调用
// pluginbuiltin.Register」的结果对齐。这样断言不写死数量，随实施项增长仍然有效；
// 「恰好 39 个」的硬口径由 internal/pluginbuiltin 的全量注册断言负责。
func TestServiceWiringRegistersBuiltins(t *testing.T) {
	fresh := pluginruntime.NewPluginRegistry()
	if err := pluginbuiltin.Register(fresh); err != nil {
		t.Fatalf("Register: %v", err)
	}
	want := len(fresh.SortedIDs())

	db := newWiringDB(t)
	w := newServiceWiring(db, db, &serveOptions{})
	if w.pluginRegistry == nil {
		t.Fatal("pluginRegistry 为 nil")
	}
	if got := len(w.pluginRegistry.SortedIDs()); got != want {
		t.Fatalf("注册表条目 = %d, want %d（newServiceWiring 未调用 pluginbuiltin.Register）", got, want)
	}
}
