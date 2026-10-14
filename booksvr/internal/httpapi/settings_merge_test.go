package httpapi

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestLoadSettingsMergesBuiltinDefaults 回归：GET 必须返回完整配置。
//
// 缺陷背景：早期 LoadSettings 只解析 auto.py，而 auto.py 只存用户改过的键，
// 出厂默认值在 webserver/settings.py 里。于是 /api/admin/settings 只返回
// 一两个键，前端把这份残缺对象整体回存后就把用户配置覆盖没了。
//
// 这里断言三层合并：出厂默认 → auto.py → manual.py。
func TestLoadSettingsMergesBuiltinDefaults(t *testing.T) {
	dir := t.TempDir()
	auto := filepath.Join(dir, "auto.py")
	if err := os.WriteFile(auto, []byte("settings = {\n    'site_title' : '我的书屋',\n}\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	got := LoadSettings(auto)

	// 出厂默认值必须在（auto.py 里没有）。
	if got["MAX_UPLOAD_SIZE"] != "100MB" {
		t.Errorf("MAX_UPLOAD_SIZE = %v，期望出厂默认 100MB", got["MAX_UPLOAD_SIZE"])
	}
	if got["ALLOW_GUEST_READ"] != true {
		t.Errorf("ALLOW_GUEST_READ = %v，期望出厂默认 true", got["ALLOW_GUEST_READ"])
	}
	// auto.py 的覆盖必须生效。
	if got["site_title"] != "我的书屋" {
		t.Errorf("site_title = %v，期望 auto.py 覆盖值", got["site_title"])
	}
	// 键数必须接近出厂默认全量，而不是只有 auto.py 的 1 个。
	if len(got) < len(builtinSettingsDefaults) {
		t.Errorf("合并后键数 %d < 出厂默认 %d，说明没有合并默认值",
			len(got), len(builtinSettingsDefaults))
	}
}

// TestLoadSettingsManualOverridesAuto 验证 manual.py 优先级最高。
func TestLoadSettingsManualOverridesAuto(t *testing.T) {
	dir := t.TempDir()
	auto := filepath.Join(dir, "auto.py")
	manual := filepath.Join(dir, "manual.py")
	if err := os.WriteFile(auto, []byte("settings = {\n    'site_title' : 'auto',\n}\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(manual, []byte("settings = {\n    'site_title' : 'manual',\n}\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	if got := LoadSettings(auto); got["site_title"] != "manual" {
		t.Errorf("site_title = %v，期望 manual.py 覆盖 auto.py", got["site_title"])
	}
}

// TestLoadSettingsRoundTripKeepsDefaults 回归：保存后重新读取不能丢配置。
//
// 这是用户报的原始现象：「保存设置不报错，但再次打开还是原来的设置」。
func TestLoadSettingsRoundTripKeepsDefaults(t *testing.T) {
	dir := t.TempDir()
	auto := filepath.Join(dir, "auto.py")

	// 第一次读取：拿到完整配置。
	first := LoadSettings(auto)
	if len(first) < len(builtinSettingsDefaults) {
		t.Fatalf("首次读取键数 %d 不完整", len(first))
	}

	// 模拟前端：改一项后整体回存。
	first["site_title"] = "改过的标题"
	if err := SaveSettings(auto, first); err != nil {
		t.Fatalf("保存失败: %v", err)
	}

	// 第二次读取：改动必须生效，且默认值仍在。
	second := LoadSettings(auto)
	if second["site_title"] != "改过的标题" {
		t.Errorf("site_title = %v，期望保存后的值", second["site_title"])
	}
	if second["MAX_UPLOAD_SIZE"] != "100MB" {
		t.Errorf("MAX_UPLOAD_SIZE = %v，保存后默认值丢失", second["MAX_UPLOAD_SIZE"])
	}
	if len(second) < len(builtinSettingsDefaults) {
		t.Errorf("保存后键数 %d < 出厂默认 %d", len(second), len(builtinSettingsDefaults))
	}
}

// TestAdminSettingsGetRereadsFromDisk 回归：GET 必须反映磁盘上的最新值。
//
// 缺陷背景：adminSettingsGet 返回的是启动时的 cfg.Settings 快照，
// 保存后刷新页面仍看到旧值，用户误以为「保存没生效」。
func TestAdminSettingsGetRereadsFromDisk(t *testing.T) {
	dir := t.TempDir()
	auto := filepath.Join(dir, "auto.py")
	if err := os.WriteFile(auto, []byte("settings = {\n    'site_title' : '旧值',\n}\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	// 模拟启动时加载的快照。
	cfg := AdminConfig{Settings: LoadSettings(auto), SettingsPath: auto}
	if got := adminSettingsGet(cfg, nil)["settings"].(map[string]any)["site_title"]; got != "旧值" {
		t.Fatalf("初始 site_title = %v", got)
	}

	// 磁盘上的值变了（相当于另一次保存）。
	if err := os.WriteFile(auto, []byte("settings = {\n    'site_title' : '新值',\n}\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	got := adminSettingsGet(cfg, nil)["settings"].(map[string]any)["site_title"]
	if got != "新值" {
		t.Errorf("GET 返回 %v，期望重新读取磁盘得到「新值」", got)
	}
}

// TestUserSysInfoRereadsSettings 回归：改站点标题后 /api/user/info 立即生效。
//
// 缺陷背景：userSysInfo 读的是启动快照 cfg.Settings，
// 管理员在设置页改完标题后，页面标题栏仍是旧值。
func TestUserSysInfoRereadsSettings(t *testing.T) {
	dir := t.TempDir()
	auto := filepath.Join(dir, "auto.py")
	if err := os.WriteFile(auto, []byte("settings = {\n    'site_title' : '旧标题',\n}\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	cfg := UserConfig{Settings: LoadSettings(auto), SettingsPath: auto}
	got, err := userSysInfo(cfg)
	if err != nil {
		t.Fatal(err)
	}
	if got["title"] != "旧标题" {
		t.Fatalf("初始 title = %v", got["title"])
	}

	if err := os.WriteFile(auto, []byte("settings = {\n    'site_title' : '新标题',\n}\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	got, err = userSysInfo(cfg)
	if err != nil {
		t.Fatal(err)
	}
	if got["title"] != "新标题" {
		t.Errorf("title = %v，期望重新读取磁盘得到「新标题」", got["title"])
	}
}

// TestBuiltinSettingsDefaultsHasNoHostPaths 回归：默认表不能含本机路径。
//
// 生成脚本曾在 Windows 上跑，把 D:\\code\\... 写进了 html_path 等键。
func TestBuiltinSettingsDefaultsHasNoHostPaths(t *testing.T) {
	for _, k := range []string{"html_path", "static_path", "i18n_path", "resource_path", "nuxt_env_path"} {
		v, ok := builtinSettingsDefaults[k].(string)
		if !ok {
			t.Errorf("%s 缺失或不是字符串", k)
			continue
		}
		if strings.Contains(v, `\\`) || strings.Contains(v, ":") {
			t.Errorf("%s = %q，含本机路径", k, v)
		}
		if !strings.HasPrefix(v, "/") {
			t.Errorf("%s = %q，应为容器内绝对路径", k, v)
		}
	}
}

// TestBuiltinSettingsDefaultsHasKeyFields 抽查出厂默认表的关键字段。
//
// 防止生成脚本出错导致整表为空或漏掉重要键。
func TestBuiltinSettingsDefaultsHasKeyFields(t *testing.T) {
	if len(builtinSettingsDefaults) < 100 {
		t.Fatalf("出厂默认表只有 %d 个键，疑似生成失败", len(builtinSettingsDefaults))
	}
	for _, k := range []string{
		"site_title", "user_database", "MAX_UPLOAD_SIZE", "UPLOAD_CHUNK_SIZE",
		"OPDS_ENABLED", "EPUB_VIEWER", "ALLOW_REGISTER", "cookie_secret",
	} {
		if _, ok := builtinSettingsDefaults[k]; !ok {
			t.Errorf("出厂默认表缺少关键字段 %q", k)
		}
	}
}
