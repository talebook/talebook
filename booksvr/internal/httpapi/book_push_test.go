package httpapi

import (
	"testing"
)

// TestBookSendToDeviceRequiresDeviceType 覆盖设备类型必填。
func TestBookSendToDeviceRequiresDeviceType(t *testing.T) {
	w, dir := newToolsFixture(t)
	insertBook(t, w.libraryDB, 1, "书")
	insertItem(t, w.libraryDB, 1, "public", 1)
	seedRealFormat(t, w, dir, 1, "EPUB", "PK\x03\x04body")

	resp, err := w.bookSendToDevice(adminCtx(1), 1, map[string]any{})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "params.missing" {
		t.Errorf("err = %v，期望 params.missing", resp["err"])
	}
}

// TestBookSendToDeviceUnsupported 覆盖无 push provider 时的明确错误。
func TestBookSendToDeviceUnsupported(t *testing.T) {
	w, dir := newToolsFixture(t)
	insertBook(t, w.libraryDB, 1, "书")
	insertItem(t, w.libraryDB, 1, "public", 1)
	seedRealFormat(t, w, dir, 1, "EPUB", "PK\x03\x04body")

	resp, err := w.bookSendToDevice(adminCtx(1), 1, map[string]any{
		"device_type": "kindle",
		"mailbox":     "a@example.com",
	})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "device.unsupported" {
		t.Errorf("err = %v，期望 device.unsupported", resp["err"])
	}
}

// TestBookSendToDeviceMissingBook 覆盖书籍不存在。
func TestBookSendToDeviceMissingBook(t *testing.T) {
	w, _ := newToolsFixture(t)
	resp, err := w.bookSendToDevice(adminCtx(1), 999, map[string]any{"device_type": "kindle"})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "book.not_found" {
		t.Errorf("err = %v，期望 book.not_found", resp["err"])
	}
}

// TestBookSendToMailRequiresMailbox 覆盖邮箱必填。
func TestBookSendToMailRequiresMailbox(t *testing.T) {
	w, dir := newToolsFixture(t)
	insertBook(t, w.libraryDB, 1, "书")
	insertItem(t, w.libraryDB, 1, "public", 1)
	seedRealFormat(t, w, dir, 1, "EPUB", "PK\x03\x04body")

	resp, err := w.bookSendToMail(adminCtx(1), 1, map[string]any{})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "params.missing" {
		t.Errorf("err = %v，期望 params.missing", resp["err"])
	}
}

// TestBookSendToMailRejectsBadAddress 覆盖邮箱格式校验。
func TestBookSendToMailRejectsBadAddress(t *testing.T) {
	w, dir := newToolsFixture(t)
	insertBook(t, w.libraryDB, 1, "书")
	insertItem(t, w.libraryDB, 1, "public", 1)
	seedRealFormat(t, w, dir, 1, "EPUB", "PK\x03\x04body")

	resp, err := w.bookSendToMail(adminCtx(1), 1, map[string]any{"mailbox": "not-an-email"})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "params.invalid" {
		t.Errorf("err = %v，期望 params.invalid", resp["err"])
	}
}

// TestBookSendToMailUnsupported 覆盖无邮件插件。
func TestBookSendToMailUnsupported(t *testing.T) {
	w, dir := newToolsFixture(t)
	insertBook(t, w.libraryDB, 1, "书")
	insertItem(t, w.libraryDB, 1, "public", 1)
	seedRealFormat(t, w, dir, 1, "EPUB", "PK\x03\x04body")

	resp, err := w.bookSendToMail(adminCtx(1), 1, map[string]any{"mailbox": "a@example.com"})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "device.unsupported" {
		t.Errorf("err = %v，期望 device.unsupported", resp["err"])
	}
}

// TestCheckPushPermissionGuestDenied 覆盖游客推送被拒。
func TestCheckPushPermissionGuestDenied(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	w := newBookWiring(db, db, map[string]any{}, nil)

	resp := w.checkPushPermission(&Context{Identity: Identity{UserID: 0}})
	if resp == nil || resp["err"] != "user.need_login" {
		t.Errorf("resp = %v，期望 user.need_login", resp)
	}
}

// TestCheckPushPermissionGuestAllowed 覆盖 ALLOW_GUEST_PUSH 放行。
func TestCheckPushPermissionGuestAllowed(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	w := newBookWiring(db, db, map[string]any{"ALLOW_GUEST_PUSH": true}, nil)

	if resp := w.checkPushPermission(&Context{Identity: Identity{UserID: 0}}); resp != nil {
		t.Errorf("resp = %v，期望 nil", resp)
	}
}

// TestPluginRegistryNonNil 覆盖注册表默认构造。
func TestPluginRegistryNonNil(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	w := newBookWiring(db, db, map[string]any{}, nil)
	if w.pluginRegistry() == nil {
		t.Error("pluginRegistry 为 nil")
	}
}
