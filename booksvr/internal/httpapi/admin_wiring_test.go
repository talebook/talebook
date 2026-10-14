package httpapi

import (
	"net/http"
	"net/url"
	"testing"
)

// adminConfigForTest 走真实的 newAdminConfig 装配路径。
//
// 这是本文件的关键：不手写 AdminConfig，而是调用 serve.go 用的同一个构造函数，
// 这样「回调忘了接线」这类缺陷才会被测试捕获。
func adminConfigForTest(t *testing.T) AdminConfig {
	t.Helper()
	fx := newAdminFixture(t)
	opts := ServeOptions{
		Settings:     fx.Cfg.Settings,
		SettingsPath: t.TempDir() + "/auto.py",
		LibraryRoot:  t.TempDir(),
	}
	return newAdminConfig(opts, fx.DB, fx.DB)
}

// TestAdminConfigWiringFromServe 回归：newAdminConfig 必须把回调都接上。
//
// 曾经 AdminConfig 只接线了 InstallSSL，其余 8 个回调全为 nil，
// 系统设置页点「测试连接」「迁移数据库」「测试邮件」都返回「未接线」。
func TestAdminConfigWiringFromServe(t *testing.T) {
	cfg := adminConfigForTest(t)

	checks := []struct {
		name string
		set  bool
	}{
		{"TestDBConnection", cfg.TestDBConnection != nil},
		{"MigrateDB", cfg.MigrateDB != nil},
		{"SendMail", cfg.SendMail != nil},
		{"SaveSettings", cfg.SaveSettings != nil},
		{"InstallSSL", cfg.InstallSSL != nil},
		{"OpdsBrowse", cfg.OpdsBrowse != nil},
		{"OpdsImport", cfg.OpdsImport != nil},
		{"CheckUpdates", cfg.CheckUpdates != nil},
		{"ConvertStatus", cfg.ConvertStatus != nil},
		{"StartConvert", cfg.StartConvert != nil},
		{"FillStatus", cfg.FillStatus != nil},
		{"StartFill", cfg.StartFill != nil},
	}
	for _, c := range checks {
		if !c.set {
			t.Errorf("AdminConfig.%s 未接线", c.name)
		}
	}
}

// TestAdminConvertStatusWired 验证批量转换状态回调返回真实结构。
func TestAdminConvertStatusWired(t *testing.T) {
	cfg := adminConfigForTest(t)
	st := cfg.ConvertStatus()
	for _, k := range []string{"total", "skip", "done", "fail", "running"} {
		if _, ok := st[k]; !ok {
			t.Errorf("ConvertStatus 缺少字段 %q: %v", k, st)
		}
	}
}

// TestAdminCheckUpdatesWired 验证升级检查回调返回真实结构。
//
// 这里不联网：Check() 失败时也应返回带 check_error 的结构，
// 而不是 nil 或「未接线」。
func TestAdminCheckUpdatesWired(t *testing.T) {
	cfg := adminConfigForTest(t)
	st := cfg.CheckUpdates()
	if st == nil {
		t.Fatal("CheckUpdates 返回 nil")
	}
	for _, k := range []string{"current_version", "latest_version", "has_update"} {
		if _, ok := st[k]; !ok {
			t.Errorf("CheckUpdates 缺少字段 %q: %v", k, st)
		}
	}
}

// TestAdminFillWiredReportsUnimplemented 验证自动填充明确报未移植。
//
// Go 侧尚无 AutoFillService，不能静默假装成功。
func TestAdminFillWiredReportsUnimplemented(t *testing.T) {
	cfg := adminConfigForTest(t)
	st := cfg.FillStatus()
	for _, k := range []string{"total", "skip", "done", "fail"} {
		if _, ok := st[k]; !ok {
			t.Errorf("FillStatus 缺少字段 %q: %v", k, st)
		}
	}
	if err := cfg.StartFill([]int64{1}); err == nil {
		t.Error("StartFill 应明确报错，而不是静默成功")
	}
}

// TestAdminTestDBWiredReturnsConnectFailure 验证接线后不再返回「未接线」。
//
// 用一个必然连不上的 MySQL 地址，期望得到 db.connect_failed（真实错误），
// 而不是「数据库测试未接线」。
func TestAdminTestDBWiredReturnsConnectFailure(t *testing.T) {
	cfg := adminConfigForTest(t)
	// 前端发的是 form-urlencoded 的 user_database（已拼好的 URL）。
	ctx := pluginCtx(t, cfg.DB, http.MethodPost, "/api/admin/testdb",
		"user_database="+url.QueryEscape("mysql+pymysql://u:p@127.0.0.1:1/nope"),
		1, true)
	ctx.Request.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	got, err := AdminTestDBHandler(cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["msg"] == "数据库测试未接线" {
		t.Fatal("TestDBConnection 仍未接线")
	}
	if got["err"] != "db.connect_failed" {
		t.Errorf("err = %v, msg = %v（期望真实连接失败）", got["err"], got["msg"])
	}
}

// TestAdminMigrateDBWiredRejectsBadTarget 验证接线后走真实迁移逻辑。
func TestAdminMigrateDBWiredRejectsBadTarget(t *testing.T) {
	cfg := adminConfigForTest(t)
	ctx := pluginCtx(t, cfg.DB, http.MethodPost, "/api/admin/migratedb",
		"user_database="+url.QueryEscape("mysql+pymysql://u:p@127.0.0.1:1/nope"),
		1, true)
	ctx.Request.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	got, err := AdminMigrateDBHandler(cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["msg"] == "数据迁移未接线" {
		t.Fatal("MigrateDB 仍未接线")
	}
	if got["err"] != "db.migrate_failed" {
		t.Errorf("err = %v, msg = %v（期望真实迁移失败）", got["err"], got["msg"])
	}
}

// TestAdminTestMailWiredRejectsBadServer 验证接线后走真实 SMTP 逻辑。
func TestAdminTestMailWiredRejectsBadServer(t *testing.T) {
	cfg := adminConfigForTest(t)
	ctx := pluginCtx(t, cfg.DB, http.MethodPost, "/api/admin/testmail",
		"smtp_server=127.0.0.1%3A1&smtp_username=a%40b.c&smtp_password=x&smtp_encryption=TLS",
		1, true)
	ctx.Request.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	got, err := AdminTestMailHandler(cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["msg"] == "邮件服务未接线" {
		t.Fatal("SendMail 仍未接线")
	}
	if got["err"] != "email.server_error" {
		t.Errorf("err = %v, msg = %v（期望真实发送失败）", got["err"], got["msg"])
	}
}

// TestAdminSaveSettingsWired 验证保存配置走真实落盘。
func TestAdminSaveSettingsWired(t *testing.T) {
	cfg := adminConfigForTest(t)
	ctx := pluginCtx(t, cfg.DB, http.MethodPost, "/api/admin/settings",
		`{"site_title":"接线测试"}`, 1, true)

	got, err := AdminSettingsHandler(cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["msg"] == "保存配置未接线" {
		t.Fatal("SaveSettings 仍未接线")
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v, msg = %v", got["err"], got["msg"])
	}
	if saved := LoadSettings(cfg.SettingsPath); saved["site_title"] != "接线测试" {
		t.Errorf("磁盘上的 site_title = %v", saved["site_title"])
	}
}
