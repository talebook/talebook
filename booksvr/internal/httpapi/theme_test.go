package httpapi

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestBuiltinThemesMatchPython 校验内置主题清单与 theme.py 逐字一致。
func TestBuiltinThemesMatchPython(t *testing.T) {
	want := []struct{ id, name, display string }{
		{"builtin-brass", "brass", "黄铜主题"},
		{"builtin-graphite", "graphite", "石墨主题"},
		{"builtin-light-gray", "light-gray", "浅灰主题"},
		{"builtin-warm-red", "warm-red", "暖红主题"},
		{"builtin-minimal", "minimal", "极简主题"},
	}
	if len(builtinThemes) != len(want) {
		t.Fatalf("内置主题数 = %d, want %d", len(builtinThemes), len(want))
	}
	for i, w := range want {
		got := builtinThemes[i]
		if got.ID != w.id || got.Name != w.name || got.DisplayName != w.display {
			t.Errorf("主题 %d = (%s,%s,%s), want (%s,%s,%s)",
				i, got.ID, got.Name, got.DisplayName, w.id, w.name, w.display)
		}
		if got.Version != "1.0.0" || got.Author != "Talebook" || !got.Builtin {
			t.Errorf("主题 %s 的固定字段不符: %+v", got.Name, got)
		}
		if got.InstalledAt != nil {
			t.Errorf("内置主题 %s 的 installed_at 应为 null", got.Name)
		}
		wantHeader := "builtin:" + got.Name + "/AppHeader"
		wantFooter := "builtin:" + got.Name + "/AppFooter"
		if got.Components.AppHeader != wantHeader || got.Components.AppFooter != wantFooter {
			t.Errorf("主题 %s 的 components 不符: %+v", got.Name, got.Components)
		}
		if got.Description == "" {
			t.Errorf("主题 %s 缺少 description", got.Name)
		}
	}
}

// TestGetBuiltinTheme 覆盖单个主题查询与激活标记。
func TestGetBuiltinTheme(t *testing.T) {
	store := &MemoryThemeStore{Name: "brass"}

	got := GetBuiltinTheme(store, "brass")
	if got == nil || !got.Active {
		t.Fatalf("brass 应为激活状态: %+v", got)
	}
	other := GetBuiltinTheme(store, "minimal")
	if other == nil || other.Active {
		t.Fatalf("minimal 不应为激活状态: %+v", other)
	}
	if GetBuiltinTheme(store, "no-such-theme") != nil {
		t.Error("不存在的主题应返回 nil")
	}
	// nil store 不应 panic，且 active 为 false。
	if got := GetBuiltinTheme(nil, "brass"); got == nil || got.Active {
		t.Errorf("nil store 时 active 应为 false: %+v", got)
	}
}

// TestGetBuiltinThemeReturnsCopy 校验返回的是副本，修改不影响全局清单。
func TestGetBuiltinThemeReturnsCopy(t *testing.T) {
	store := &MemoryThemeStore{}
	got := GetBuiltinTheme(store, "brass")
	got.Name = "mutated"
	got.Components.AppHeader = "mutated"

	again := GetBuiltinTheme(store, "brass")
	if again.Name != "brass" || again.Components.AppHeader != "builtin:brass/AppHeader" {
		t.Errorf("全局清单被污染: %+v", again)
	}
}

// TestListBuiltinThemes 覆盖列表顺序与激活标记。
func TestListBuiltinThemes(t *testing.T) {
	store := &MemoryThemeStore{Name: "warm-red"}
	themes := ListBuiltinThemes(store)
	if len(themes) != 5 {
		t.Fatalf("主题数 = %d, want 5", len(themes))
	}
	if themes[0].Name != "brass" || themes[4].Name != "minimal" {
		t.Errorf("顺序不符: 首=%s 末=%s", themes[0].Name, themes[4].Name)
	}
	activeCount := 0
	for _, th := range themes {
		if th.Active {
			activeCount++
			if th.Name != "warm-red" {
				t.Errorf("激活的应是 warm-red，得到 %s", th.Name)
			}
		}
	}
	if activeCount != 1 {
		t.Errorf("应恰好有 1 个激活主题，得到 %d", activeCount)
	}
}

// TestThemeListHandler 覆盖 /api/themes。
func TestThemeListHandler(t *testing.T) {
	store := &MemoryThemeStore{Name: "graphite"}
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/themes", nil)

	resp, err := ThemeListHandler(store)(&Context{Request: req, Writer: rec})
	if err != nil {
		t.Fatalf("ThemeListHandler 失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Errorf("err = %v", resp["err"])
	}
	themes, ok := resp["themes"].([]*Theme)
	if !ok || len(themes) != 5 {
		t.Fatalf("themes = %v", resp["themes"])
	}
}

// TestThemeActiveHandler 覆盖 /api/themes/active 的三种状态。
func TestThemeActiveHandler(t *testing.T) {
	// 未激活 → theme=null。
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/themes/active", nil)
	resp, err := ThemeActiveHandler(&MemoryThemeStore{})(&Context{Request: req, Writer: rec})
	if err != nil || resp["err"] != "ok" || resp["theme"] != nil {
		t.Fatalf("未激活应返回 theme=null: resp=%v err=%v", resp, err)
	}

	// 激活名不在内置清单 → theme=null。
	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/themes/active", nil)
	resp, err = ThemeActiveHandler(&MemoryThemeStore{Name: "bogus"})(&Context{Request: req, Writer: rec})
	if err != nil || resp["theme"] != nil {
		t.Fatalf("未知主题应返回 theme=null: resp=%v err=%v", resp, err)
	}

	// 已激活 → 返回主题对象。
	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/themes/active", nil)
	resp, err = ThemeActiveHandler(&MemoryThemeStore{Name: "minimal"})(&Context{Request: req, Writer: rec})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	th, ok := resp["theme"].(*Theme)
	if !ok || th.Name != "minimal" || !th.Active {
		t.Fatalf("theme = %v", resp["theme"])
	}

	// nil store → theme=null。
	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/themes/active", nil)
	resp, err = ThemeActiveHandler(nil)(&Context{Request: req, Writer: rec})
	if err != nil || resp["theme"] != nil {
		t.Fatalf("nil store 应返回 theme=null: resp=%v err=%v", resp, err)
	}
}

// TestThemeActivateHandler 覆盖 /api/themes/activate 的各分支。
func TestThemeActivateHandler(t *testing.T) {
	post := func(body string) (*httptest.ResponseRecorder, map[string]any, error) {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/api/themes/activate", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		store := &MemoryThemeStore{}
		resp, err := ThemeActivateHandler(store)(&Context{Request: req, Writer: rec})
		return rec, resp, err
	}

	// 非法 JSON → params.invalid。
	if _, resp, err := post("{bad"); err != nil || resp["err"] != "params.invalid" {
		t.Errorf("非法 JSON 应返回 params.invalid: resp=%v err=%v", resp, err)
	}
	// 空体 → params.invalid。
	if _, resp, err := post(""); err != nil || resp["err"] != "params.invalid" {
		t.Errorf("空体应返回 params.invalid: resp=%v err=%v", resp, err)
	}
	// JSON 数组 → params.invalid（不是对象）。
	if _, resp, err := post("[1,2]"); err != nil || resp["err"] != "params.invalid" {
		t.Errorf("数组应返回 params.invalid: resp=%v err=%v", resp, err)
	}
	// 主题不存在 → not_found。
	if _, resp, err := post(`{"name":"bogus"}`); err != nil || resp["err"] != "not_found" {
		t.Errorf("未知主题应返回 not_found: resp=%v err=%v", resp, err)
	}
	// 空 name → 恢复默认。
	if _, resp, err := post(`{"name":""}`); err != nil || resp["err"] != "ok" {
		t.Errorf("空 name 应返回 ok: resp=%v err=%v", resp, err)
	}
	// 正常激活 → ok + theme。
	_, resp, err := post(`{"name":"brass"}`)
	if err != nil || resp["err"] != "ok" {
		t.Fatalf("激活应成功: resp=%v err=%v", resp, err)
	}
	th, ok := resp["theme"].(*Theme)
	if !ok || th.Name != "brass" || !th.Active {
		t.Errorf("theme = %v", resp["theme"])
	}
	if !strings.Contains(resp["msg"].(string), "brass") {
		t.Errorf("msg 应含主题名: %v", resp["msg"])
	}
}

// TestThemeActivateHandlerPersists 校验激活后写入 store。
func TestThemeActivateHandlerPersists(t *testing.T) {
	store := &MemoryThemeStore{}
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/themes/activate",
		strings.NewReader(`{"name":"graphite"}`))
	req.Header.Set("Content-Type", "application/json")

	if _, err := ThemeActivateHandler(store)(&Context{Request: req, Writer: rec}); err != nil {
		t.Fatalf("失败: %v", err)
	}
	if store.Name != "graphite" {
		t.Errorf("store.Name = %q, want graphite", store.Name)
	}

	// 空 name 应清空。
	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/themes/activate", strings.NewReader(`{"name":""}`))
	req.Header.Set("Content-Type", "application/json")
	if _, err := ThemeActivateHandler(store)(&Context{Request: req, Writer: rec}); err != nil {
		t.Fatalf("失败: %v", err)
	}
	if store.Name != "" {
		t.Errorf("空 name 应清空激活主题，得到 %q", store.Name)
	}
}

// TestThemeActivateHandlerSaveError 覆盖保存失败 → file.permission。
func TestThemeActivateHandlerSaveError(t *testing.T) {
	store := &MemoryThemeStore{Err: errors.New("磁盘只读")}

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/themes/activate",
		strings.NewReader(`{"name":"brass"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := ThemeActivateHandler(store)(&Context{Request: req, Writer: rec})
	if err != nil {
		t.Fatalf("不应返回 error: %v", err)
	}
	if resp["err"] != "file.permission" {
		t.Errorf("err = %v, want file.permission", resp["err"])
	}
	if !strings.Contains(resp["msg"].(string), "磁盘只读") {
		t.Errorf("msg 应含原因: %v", resp["msg"])
	}

	// 空 name 的保存失败也走同一分支。
	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/themes/activate", strings.NewReader(`{"name":""}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err = ThemeActivateHandler(store)(&Context{Request: req, Writer: rec})
	if err != nil || resp["err"] != "file.permission" {
		t.Errorf("空 name 保存失败应返回 file.permission: resp=%v err=%v", resp, err)
	}
}

// TestThemeActivateTrimsName 校验 name 首尾空白被去除。
func TestThemeActivateTrimsName(t *testing.T) {
	store := &MemoryThemeStore{}
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/themes/activate",
		strings.NewReader(`{"name":"  brass  "}`))
	req.Header.Set("Content-Type", "application/json")

	resp, err := ThemeActivateHandler(store)(&Context{Request: req, Writer: rec})
	if err != nil || resp["err"] != "ok" {
		t.Fatalf("应成功: resp=%v err=%v", resp, err)
	}
	if store.Name != "brass" {
		t.Errorf("store.Name = %q, want brass", store.Name)
	}
}

// TestThemeRouteSpecs 校验 3 条路由的注册属性。
func TestThemeRouteSpecs(t *testing.T) {
	specs := ThemeRouteSpecs(&MemoryThemeStore{})
	if len(specs) != 3 {
		t.Fatalf("应有 3 条路由，得到 %d", len(specs))
	}
	byPattern := map[string]RouteSpec{}
	for _, s := range specs {
		byPattern[s.Pattern] = s
	}
	if s, ok := byPattern[rThemes]; !ok || s.Admin || s.Auth {
		t.Errorf("/api/themes 应公开只读: %+v", s)
	}
	if s, ok := byPattern[rThemesActive]; !ok || s.Admin || s.Auth {
		t.Errorf("/api/themes/active 应公开只读: %+v", s)
	}
	if s, ok := byPattern[rThemesActivate]; !ok || !s.Admin {
		t.Errorf("/api/themes/activate 应要求管理员: %+v", s)
	}
}

// TestThemeRoutesThroughServer 端到端校验路由分发与管理员门禁。
func TestThemeRoutesThroughServer(t *testing.T) {
	store := &MemoryThemeStore{Name: "brass"}
	srv, err := NewServer(ThemeRouteSpecs(store))
	if err != nil {
		t.Fatalf("NewServer 失败: %v", err)
	}

	// 游客可读列表。
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/themes", nil))
	if !strings.Contains(rec.Body.String(), `"err":"ok"`) {
		t.Errorf("列表应可公开访问，得到 %s", rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "builtin-brass") {
		t.Errorf("列表应含内置主题，得到 %s", rec.Body.String())
	}

	// 游客激活 → permission.not_admin。
	rec = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/themes/activate",
		strings.NewReader(`{"name":"minimal"}`))
	req.Header.Set("Content-Type", "application/json")
	srv.ServeHTTP(rec, req)
	if !strings.Contains(rec.Body.String(), ErrNotAdmin) {
		t.Errorf("游客激活应返回 %s，得到 %s", ErrNotAdmin, rec.Body.String())
	}

	// 管理员激活 → ok。
	srv.Identify = func(*http.Request) (Identity, error) {
		return Identity{UserID: 1, IsAdmin: true}, nil
	}
	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/themes/activate",
		strings.NewReader(`{"name":"minimal"}`))
	req.Header.Set("Content-Type", "application/json")
	srv.ServeHTTP(rec, req)
	if !strings.Contains(rec.Body.String(), `"err":"ok"`) {
		t.Errorf("管理员激活应成功，得到 %s", rec.Body.String())
	}
	if store.Name != "minimal" {
		t.Errorf("store.Name = %q, want minimal", store.Name)
	}
}

// TestFileThemeStoreRoundTrip 覆盖文件存储的读写往返。
func TestFileThemeStoreRoundTrip(t *testing.T) {
	path := filepath.Join(t.TempDir(), "auto.py")
	store := &FileThemeStore{Path: path}

	// 文件不存在时读取返回空串。
	if got := store.ActiveTheme(); got != "" {
		t.Errorf("文件不存在应返回空串，得到 %q", got)
	}

	// 写入后读回。
	if err := store.SetActiveTheme("brass"); err != nil {
		t.Fatalf("SetActiveTheme 失败: %v", err)
	}
	if got := store.ActiveTheme(); got != "brass" {
		t.Errorf("读回 = %q, want brass", got)
	}

	// 再次写入应原地替换而非追加。
	if err := store.SetActiveTheme("minimal"); err != nil {
		t.Fatalf("SetActiveTheme 失败: %v", err)
	}
	if got := store.ActiveTheme(); got != "minimal" {
		t.Errorf("读回 = %q, want minimal", got)
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("读取文件失败: %v", err)
	}
	if strings.Count(string(raw), activeThemeKey) != 1 {
		t.Errorf("ACTIVE_THEME 应只出现一次，得到:\n%s", raw)
	}

	// 清空。
	if err := store.SetActiveTheme(""); err != nil {
		t.Fatalf("清空失败: %v", err)
	}
	if got := store.ActiveTheme(); got != "" {
		t.Errorf("清空后 = %q, want 空串", got)
	}
}

// TestFileThemeStoreReadsPythonFormat 校验能解析 Python 写的配置格式。
func TestFileThemeStoreReadsPythonFormat(t *testing.T) {
	path := filepath.Join(t.TempDir(), "auto.py")
	content := "#!/usr/bin/env python3\nsettings = {\n" +
		"    'ACTIVE_THEME'                : 'graphite',\n" +
		"    'SITE_TITLE'                  : 'Talebook',\n}\n"
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}

	store := &FileThemeStore{Path: path}
	if got := store.ActiveTheme(); got != "graphite" {
		t.Errorf("解析 = %q, want graphite", got)
	}

	// 替换后其他配置行应保留。
	if err := store.SetActiveTheme("warm-red"); err != nil {
		t.Fatalf("替换失败: %v", err)
	}
	raw, _ := os.ReadFile(path)
	if !strings.Contains(string(raw), "SITE_TITLE") {
		t.Errorf("替换不应丢失其他配置:\n%s", raw)
	}
	if got := store.ActiveTheme(); got != "warm-red" {
		t.Errorf("替换后 = %q, want warm-red", got)
	}
}

// TestFileThemeStoreCache 覆盖缓存读写。
func TestFileThemeStoreCache(t *testing.T) {
	path := filepath.Join(t.TempDir(), "auto.py")
	cache := "cached"
	store := &FileThemeStore{Path: path, Cache: &cache}

	// 有缓存时优先返回缓存。
	if got := store.ActiveTheme(); got != "cached" {
		t.Errorf("应返回缓存值，得到 %q", got)
	}
	// 写入应更新缓存。
	if err := store.SetActiveTheme("brass"); err != nil {
		t.Fatalf("失败: %v", err)
	}
	if cache != "brass" {
		t.Errorf("缓存 = %q, want brass", cache)
	}
}

// TestFileThemeStoreErrors 覆盖文件存储的错误分支。
func TestFileThemeStoreErrors(t *testing.T) {
	var nilStore *FileThemeStore
	if got := nilStore.ActiveTheme(); got != "" {
		t.Errorf("nil store 应返回空串，得到 %q", got)
	}
	if err := nilStore.SetActiveTheme("x"); err == nil {
		t.Error("nil store 写入应返回错误")
	}

	empty := &FileThemeStore{}
	if got := empty.ActiveTheme(); got != "" {
		t.Errorf("空 Path 应返回空串，得到 %q", got)
	}
	if err := empty.SetActiveTheme("x"); err == nil {
		t.Error("空 Path 写入应返回错误")
	}

	// 路径指向目录 → 写入失败。
	dir := t.TempDir()
	bad := &FileThemeStore{Path: dir}
	if err := bad.SetActiveTheme("x"); err == nil {
		t.Error("路径为目录时写入应返回错误")
	}
}

// TestMemoryThemeStoreNil 覆盖内存存储的 nil 分支。
func TestMemoryThemeStoreNil(t *testing.T) {
	var nilStore *MemoryThemeStore
	if got := nilStore.ActiveTheme(); got != "" {
		t.Errorf("nil store 应返回空串，得到 %q", got)
	}
	if err := nilStore.SetActiveTheme("x"); err == nil {
		t.Error("nil store 写入应返回错误")
	}
}

// TestUnquotePython 覆盖 Python repr 去引号。
func TestUnquotePython(t *testing.T) {
	cases := map[string]string{
		`'brass'`: "brass",
		`"brass"`: "brass",
		`brass`:   "brass",
		`''`:      "",
		`'`:       "'",
		``:        "",
	}
	for in, want := range cases {
		if got := unquotePython(in); got != want {
			t.Errorf("unquotePython(%q) = %q, want %q", in, got, want)
		}
	}
}
