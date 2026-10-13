package httpapi

import (
	"sort"
	"testing"
)

// TestRouteCoverageReport 打印 Go 侧相对 Python 版的路由覆盖缺口。
//
// 这是一个诊断型测试：不失败，只输出未移植的 legacy 路由清单，
// 便于人工核对「所有接口是否与 Python 版一致」。
func TestRouteCoverageReport(t *testing.T) {
	implemented := map[string]bool{}
	for _, p := range ImplementedPatterns() {
		implemented[p] = true
	}

	legacy := LegacyRoutes()
	var missing []string
	for _, r := range legacy {
		if !implemented[r.Pattern] {
			missing = append(missing, r.Pattern)
		}
	}
	sort.Strings(missing)

	t.Logf("legacy 路由总数: %d", len(legacy))
	t.Logf("已实现: %d", len(legacy)-len(missing))
	t.Logf("未实现: %d", len(missing))
	for _, p := range missing {
		t.Logf("  MISSING %s", p)
	}
}
