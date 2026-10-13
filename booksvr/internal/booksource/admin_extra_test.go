package booksource

import (
	"encoding/json"
	"testing"
)

// TestResolveHost 覆盖默认 DNS 解析实现。
//
// 只验证「可解析」与「不可解析」两类结果，不依赖外网可达性。
func TestResolveHost(t *testing.T) {
	// localhost 在任意环境都应可解析。
	if err := ResolveHost("localhost", 80); err != nil {
		t.Errorf("localhost 应可解析: %v", err)
	}
	// .invalid 是 RFC 2606 保留的必然不存在域名。
	if err := ResolveHost("nope.invalid", 80); err == nil {
		t.Error("保留域名应解析失败")
	}
}

// TestIsSSLError 覆盖 TLS 错误识别。
func TestIsSSLError(t *testing.T) {
	cases := []struct {
		err  error
		want bool
	}{
		{nil, false},
		{errString("x509: certificate signed by unknown authority"), true},
		{errString("tls: handshake failure"), true},
		{errString("SSL_ERROR"), true},
		{errString("connection refused"), false},
		{errString("i/o timeout"), false},
	}
	for _, tc := range cases {
		if got := isSSLError(tc.err); got != tc.want {
			t.Errorf("isSSLError(%v) = %v, want %v", tc.err, got, tc.want)
		}
	}
}

// TestAdminTruthyExtra 补齐 adminTruthy 的数值与切片分支。
func TestAdminTruthyExtra(t *testing.T) {
	cases := []struct {
		value any
		want  bool
	}{
		{int(0), false}, {int(1), true}, {int64(0), false}, {int64(1), true},
		{[]any{}, false}, {[]any{1}, true},
		{map[string]any{}, false}, {map[string]any{"a": 1}, true},
		{struct{}{}, true},
	}
	for _, tc := range cases {
		if got := adminTruthy(tc.value); got != tc.want {
			t.Errorf("adminTruthy(%#v) = %v, want %v", tc.value, got, tc.want)
		}
	}
}

// TestAdminToInt64Extra 补齐 adminToInt64 的 json.Number 分支。
func TestAdminToInt64Extra(t *testing.T) {
	if got := adminToInt64(jsonNumber("42")); got != 42 {
		t.Errorf("json.Number → %d", got)
	}
	if got := adminToInt64(jsonNumber("bad")); got != 0 {
		t.Errorf("非法 json.Number → %d", got)
	}
}

// TestAdminEncodeErrors 覆盖编码失败回退分支。
//
// channel 无法序列化成 JSON，应回退到空对象/空数组。
func TestAdminEncodeErrors(t *testing.T) {
	if got := adminEncodeMap(map[string]any{"ch": make(chan int)}); got != "{}" {
		t.Errorf("不可序列化 map → %q", got)
	}
	if got := adminEncodeList([]string{"a"}); got != `["a"]` {
		t.Errorf("正常列表 → %q", got)
	}
}

// TestAdminStringExtra 补齐 adminString 的默认分支。
func TestAdminStringExtra(t *testing.T) {
	if got := adminString([]any{1}); got != "[1]" {
		t.Errorf("切片 → %q", got)
	}
	if got := adminString(float64(3.25)); got != "3.25" {
		t.Errorf("小数 → %q", got)
	}
}

// TestListSourcesError 覆盖查询失败分支（表不存在）。
func TestListSourcesError(t *testing.T) {
	db := adminSchema(t)
	if _, err := db.Exec(`DROP TABLE book_sources`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	if _, err := ListSources(db); err == nil {
		t.Error("表不存在应报错")
	}
	if _, err := ListSourceIDs(db); err == nil {
		t.Error("表不存在应报错")
	}
	if _, err := ListSourceGroups(db); err == nil {
		t.Error("表不存在应报错")
	}
}

// TestInsertSourceError 覆盖插入失败分支（表不存在）。
func TestInsertSourceError(t *testing.T) {
	db := adminSchema(t)
	if _, err := db.Exec(`DROP TABLE book_sources`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	s := &Source{Name: "n", URL: "u"}
	if err := InsertSource(db, s); err == nil {
		t.Error("表不存在应报错")
	}
}

// TestUpdateSourceError 覆盖更新失败分支（表不存在）。
func TestUpdateSourceError(t *testing.T) {
	db := adminSchema(t)
	if _, err := db.Exec(`DROP TABLE book_sources`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	s := &Source{ID: 1, Name: "n", URL: "u"}
	if err := UpdateSource(db, s); err == nil {
		t.Error("表不存在应报错")
	}
}

// TestValidateSourceRawNetworkStatusFallback 覆盖网络状态缺省回退。
func TestValidateSourceRawNetworkStatusFallback(t *testing.T) {
	// fetch 返回 5xx 且无 message → 走 connect_failed 与默认提示。
	got := ValidateSourceRaw(map[string]any{
		"bookSourceName": "x", "bookSourceUrl": "https://example.com",
		"searchUrl":    "/s",
		"ruleSearch":   map[string]any{"bookList": "a", "bookUrl": "b"},
		"ruleBookInfo": map[string]any{"name": "c"},
		"ruleToc":      map[string]any{"chapterList": "d", "chapterUrl": "e"},
		"ruleContent":  map[string]any{"content": "f"},
	}, 5, func(string, int) error { return nil },
		func(string, float64) (int, error) { return 503, nil })
	if got.Status != CheckStatusConnectFail {
		t.Errorf("status = %q", got.Status)
	}
	if got.Message == "" {
		t.Error("应有默认提示")
	}
}

// TestProbeSourceNetworkHTTPSDefaultPort 覆盖 https 默认端口分支。
func TestProbeSourceNetworkHTTPSDefaultPort(t *testing.T) {
	var gotPort int
	ProbeSourceNetwork(map[string]any{"bookSourceUrl": "https://example.com"}, 5,
		func(_ string, port int) error { gotPort = port; return nil },
		func(string, float64) (int, error) { return 200, nil })
	if gotPort != 443 {
		t.Errorf("https 默认端口 = %d, want 443", gotPort)
	}
	ProbeSourceNetwork(map[string]any{"bookSourceUrl": "http://example.com"}, 5,
		func(_ string, port int) error { gotPort = port; return nil },
		func(string, float64) (int, error) { return 200, nil })
	if gotPort != 80 {
		t.Errorf("http 默认端口 = %d, want 80", gotPort)
	}
	// 显式端口优先。
	ProbeSourceNetwork(map[string]any{"bookSourceUrl": "https://example.com:8443"}, 5,
		func(_ string, port int) error { gotPort = port; return nil },
		func(string, float64) (int, error) { return 200, nil })
	if gotPort != 8443 {
		t.Errorf("显式端口 = %d, want 8443", gotPort)
	}
}

// TestProbeSourceNetworkEmptyMessage 覆盖 fetch 成功但状态缺省。
func TestProbeSourceNetworkEmptyMessage(t *testing.T) {
	got := ProbeSourceNetwork(map[string]any{"bookSourceUrl": "https://example.com"}, 5,
		func(string, int) error { return nil },
		func(string, float64) (int, error) { return 404, nil })
	// 4xx 仍算连通（< 500）。
	if !got.OK {
		t.Errorf("4xx 应算连通: %+v", got)
	}
}

// jsonNumber 把字符串渲染成 json.Number。
func jsonNumber(s string) json.Number { return json.Number(s) }
