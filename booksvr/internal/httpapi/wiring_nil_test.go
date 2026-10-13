package httpapi

import (
	"reflect"
	"testing"
)

// nilFields 返回结构体中为 nil 的函数 / 接口 / 指针字段名。
func nilFields(cfg any) []string {
	v := reflect.ValueOf(cfg)
	t := v.Type()
	var out []string
	for i := 0; i < t.NumField(); i++ {
		f := v.Field(i)
		switch f.Kind() {
		case reflect.Func, reflect.Interface, reflect.Ptr:
			if f.IsNil() {
				out = append(out, t.Field(i).Name)
			}
		}
	}
	return out
}

// TestBookWiringNoNilFields 验证真实 bookWiring 装配后无 nil 功能字段。
//
// 这是「路由已注册 ≠ 功能可用」的回归防线：任何新增的 BookConfig 字段
// 若忘记在 Config() 中接线，本测试会失败。
func TestBookWiringNoNilFields(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	cfg := newBookWiring(db, db, map[string]any{}).Config("")

	// DB / LibraryDB / Settings / CDNURL 等非函数字段不参与判定。
	if nils := nilFields(cfg); len(nils) > 0 {
		t.Errorf("BookConfig 仍有 %d 个 nil 字段: %v", len(nils), nils)
	}
}

// TestAudioWiringNoNilFields 验证真实 audioWiring 装配后无 nil 功能字段。
func TestAudioWiringNoNilFields(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	cfg := newAudioWiring(db, db, map[string]any{}, t.TempDir()).Config("", func(p string) string { return p })

	if nils := nilFields(cfg); len(nils) > 0 {
		t.Errorf("AudioConfig 仍有 %d 个 nil 字段: %v", len(nils), nils)
	}
}

// TestWebDAVWiringNoNilFields 验证 webdavWiring 装配后无 nil 功能字段。
func TestWebDAVWiringNoNilFields(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	cfg := (&webdavWiring{
		settings: map[string]any{},
		serve:    func(ctx *Context) bool { return false },
	}).Config(DemoModeConfig{})

	if nils := nilFields(cfg); len(nils) > 0 {
		t.Errorf("WebDAVConfig 仍有 %d 个 nil 字段: %v", len(nils), nils)
	}
}
