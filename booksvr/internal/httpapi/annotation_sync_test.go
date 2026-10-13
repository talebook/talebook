package httpapi

import (
	"database/sql"
	"testing"

	"talebook/booksvr/internal/pluginruntime"
)

// TestNewAnnotationSyncerNonNil 覆盖构造函数。
func TestNewAnnotationSyncerNonNil(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	if s := NewAnnotationSyncer(db, map[string]any{}, nil); s == nil {
		t.Error("NewAnnotationSyncer 返回 nil")
	}
}

// TestAnnotationSyncerSkipsMissingAnnotation 覆盖批注不存在时静默返回。
func TestAnnotationSyncerSkipsMissingAnnotation(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	s := NewAnnotationSyncer(db, map[string]any{}, pluginruntime.NewPluginRegistry())
	// 不应 panic。
	s.SyncAnnotation(999999, "", "")
}

// TestAnnotationSyncerSkipsPrivate 覆盖私密批注不同步。
func TestAnnotationSyncerSkipsPrivate(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	seedAnnotation(t, db, 1, 1, 1, true)

	s := NewAnnotationSyncer(db, map[string]any{}, pluginruntime.NewPluginRegistry())
	s.SyncAnnotation(1, "", "")

	// 私密批注不应产生来源记录。
	var n int
	if err := db.QueryRow(`SELECT COUNT(1) FROM annotation_sources WHERE annotation_id = 1`).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != 0 {
		t.Errorf("私密批注产生了 %d 条来源记录", n)
	}
}

// TestAnnotationSyncerNoProviders 覆盖无插件时不做事。
func TestAnnotationSyncerNoProviders(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	seedAnnotation(t, db, 1, 1, 1, false)

	s := NewAnnotationSyncer(db, map[string]any{}, pluginruntime.NewPluginRegistry())
	s.SyncAnnotation(1, "", "")

	var n int
	if err := db.QueryRow(`SELECT COUNT(1) FROM annotation_sources WHERE annotation_id = 1`).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != 0 {
		t.Errorf("无插件时产生了 %d 条来源记录", n)
	}
}

// TestProviderNameFromManifest 覆盖清单取名。
func TestProviderNameFromManifest(t *testing.T) {
	p := &stubProvider{manifest: map[string]any{"name": "测试插件"}}
	if got := providerName(p); got != "测试插件" {
		t.Errorf("providerName = %q，期望 测试插件", got)
	}
}

// TestProviderNameFallbackKeys 覆盖清单键回落。
func TestProviderNameFallbackKeys(t *testing.T) {
	p := &stubProvider{manifest: map[string]any{"id": "plugin-x"}}
	if got := providerName(p); got != "plugin-x" {
		t.Errorf("providerName = %q，期望 plugin-x", got)
	}
}

// TestProviderNameEmpty 覆盖清单无可用键。
func TestProviderNameEmpty(t *testing.T) {
	p := &stubProvider{manifest: map[string]any{}}
	if got := providerName(p); got != "" {
		t.Errorf("providerName = %q，期望空串", got)
	}
}

// stubProvider 是仅实现 Manifest 的测试 provider。
type stubProvider struct {
	manifest map[string]any
}

// Manifest 返回预设清单。
func (s *stubProvider) Manifest() map[string]any { return s.manifest }

// seedAnnotation 插入一条批注。
func seedAnnotation(t *testing.T, db *sql.DB, id, readerID, bookID int64, private bool) {
	t.Helper()
	priv := 0
	if private {
		priv = 1
	}
	if _, err := db.Exec(`INSERT INTO annotations
		(id, reader_id, book_id, client_id, annotation_type, is_private, cfi, chapter,
		 quote_text, content, color, author_name, user_modified_at, create_time, update_time)
		VALUES (?, ?, ?, '', 'highlight', ?, '', '', '引用', '笔记', '', '',
		 '2026-01-01 00:00:00', '2026-01-01 00:00:00', '2026-01-01 00:00:00')`,
		id, readerID, bookID, priv); err != nil {
		t.Fatalf("插入批注失败: %v", err)
	}
}

// TestAnnotationSyncerNilRegistry 覆盖 nil 注册表回落。
func TestAnnotationSyncerNilRegistry(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	s := NewAnnotationSyncer(db, map[string]any{}, nil)
	if s == nil {
		t.Fatal("nil 注册表应回落为默认注册表")
	}
	s.SyncAnnotation(1, "", "")
}
