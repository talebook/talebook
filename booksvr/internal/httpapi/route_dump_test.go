package httpapi

import (
	"encoding/json"
	"os"
	"testing"
)

// TestExportRouteTable 把权威路由表导出成 JSON，供端到端探测脚本使用。
//
// 通过环境变量 TALEBOOK_ROUTE_DUMP 指定输出路径；未设置时跳过。
func TestExportRouteTable(t *testing.T) {
	out := os.Getenv("TALEBOOK_ROUTE_DUMP")
	if out == "" {
		t.Skip("未设置 TALEBOOK_ROUTE_DUMP，跳过导出")
	}
	type row struct {
		Pattern string   `json:"pattern"`
		Handler string   `json:"handler"`
		Methods []string `json:"methods"`
	}
	rows := make([]row, 0, len(registeredRoutes))
	for _, r := range registeredRoutes {
		rows = append(rows, row{Pattern: r.Pattern, Handler: r.Handler, Methods: r.Methods})
	}
	data, err := json.MarshalIndent(rows, "", "  ")
	if err != nil {
		t.Fatalf("序列化失败: %v", err)
	}
	if err := os.WriteFile(out, data, 0o644); err != nil {
		t.Fatalf("写入失败: %v", err)
	}
	t.Logf("已导出 %d 条路由到 %s", len(rows), out)
}
