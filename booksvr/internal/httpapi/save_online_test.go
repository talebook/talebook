package httpapi

import (
	"database/sql"
	"testing"
)

// newSaveOnlineFixture 建一个保存服务夹具。
func newSaveOnlineFixture(t *testing.T) (*saveOnlineService, *sql.DB) {
	t.Helper()
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	createFormatTables(t, db)
	dir := t.TempDir()
	svc := newSaveOnlineService(db, map[string]any{
		"upload_path": dir,
	})
	return svc, db
}

// TestSaveOnlineMissingSource 覆盖书源不存在。
func TestSaveOnlineMissingSource(t *testing.T) {
	svc, _ := newSaveOnlineFixture(t)
	err := svc.Save(adminCtx(1), "no-such-source", "http://x/1", "txt", true, 0)
	if err == nil {
		t.Fatal("书源不存在应返回错误")
	}
}

// TestSaveOnlineMaxSaveChaptersDefault 覆盖章节上限默认值。
func TestSaveOnlineMaxSaveChaptersDefault(t *testing.T) {
	svc, _ := newSaveOnlineFixture(t)
	if got := svc.maxSaveChapters(); got != defaultMaxSaveChapters {
		t.Errorf("maxSaveChapters = %d，期望 %d", got, defaultMaxSaveChapters)
	}
}

// TestSaveOnlineMaxSaveChaptersConfigured 覆盖章节上限配置。
func TestSaveOnlineMaxSaveChaptersConfigured(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	svc := newSaveOnlineService(db, map[string]any{"BOOKSOURCE_MAX_SAVE_CHAPTERS": 42})
	if got := svc.maxSaveChapters(); got != 42 {
		t.Errorf("maxSaveChapters = %d，期望 42", got)
	}
}

// TestSaveOnlineUploadDirFallback 覆盖上传目录回落。
func TestSaveOnlineUploadDirFallback(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	svc := newSaveOnlineService(db, map[string]any{"scan_upload_path": "/tmp/scan"})
	if got := svc.uploadDir(); got != "/tmp/scan" {
		t.Errorf("uploadDir = %q，期望 /tmp/scan", got)
	}
}

// TestSaveOnlineUploadDirEmpty 覆盖未配置上传目录。
func TestSaveOnlineUploadDirEmpty(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	svc := newSaveOnlineService(db, map[string]any{})
	if got := svc.uploadDir(); got != "" {
		t.Errorf("uploadDir = %q，期望空串", got)
	}
}

// TestBookDetailOfParses 覆盖详情解析。
func TestBookDetailOfParses(t *testing.T) {
	detail := bookDetailOf(map[string]any{
		"name": "书名", "author": "作者", "book_url": "http://x/1",
	})
	if detail == nil {
		t.Fatal("detail 为 nil")
	}
	if detail.Name != "书名" || detail.Author != "作者" {
		t.Errorf("解析结果错误: %+v", detail)
	}
}

// TestBookDetailOfEmpty 覆盖空输入。
func TestBookDetailOfEmpty(t *testing.T) {
	if detail := bookDetailOf(nil); detail != nil {
		t.Errorf("空输入应返回 nil，实际 %+v", detail)
	}
}

// TestChaptersOfParses 覆盖章节解析。
func TestChaptersOfParses(t *testing.T) {
	chapters := chaptersOf([]any{
		map[string]any{"name": "第一章", "url": "http://x/1"},
		map[string]any{"name": "第二章", "url": "http://x/2", "is_vip": true},
	})
	if len(chapters) != 2 {
		t.Fatalf("章节数 = %d，期望 2", len(chapters))
	}
	if chapters[0].Name != "第一章" {
		t.Errorf("第一章名 = %q", chapters[0].Name)
	}
	if !chapters[1].IsVIP {
		t.Error("第二章应为 VIP")
	}
}

// TestChaptersOfSkipsInvalid 覆盖跳过非法项。
func TestChaptersOfSkipsInvalid(t *testing.T) {
	chapters := chaptersOf([]any{"not-a-map", map[string]any{"name": "有效"}})
	if len(chapters) != 1 {
		t.Fatalf("章节数 = %d，期望 1", len(chapters))
	}
}

// TestChaptersOfNonList 覆盖非列表输入。
func TestChaptersOfNonList(t *testing.T) {
	if got := chaptersOf("not-a-list"); got != nil {
		t.Errorf("非列表应返回 nil，实际 %v", got)
	}
}

// TestAnyMapOfFallback 覆盖 map 转换回落。
func TestAnyMapOfFallback(t *testing.T) {
	if got := anyMapOf("x"); len(got) != 0 {
		t.Errorf("非 map 应返回空 map，实际 %v", got)
	}
	if got := anyMapOf(map[string]any{"a": 1}); got["a"] != 1 {
		t.Errorf("map 转换失败: %v", got)
	}
}

// TestNewSaveOnlineFuncNonNil 覆盖导出构造函数。
func TestNewSaveOnlineFuncNonNil(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	if fn := NewSaveOnlineFunc(db, map[string]any{}); fn == nil {
		t.Error("NewSaveOnlineFunc 返回 nil")
	}
}

// TestSaveOnlineReportsProgress 覆盖进度上报不 panic。
func TestSaveOnlineReportsProgress(t *testing.T) {
	svc, _ := newSaveOnlineFixture(t)
	// taskID 为 0 时直接返回。
	svc.reportProgress(0, 1, 10, 0)
	// 非零 taskID 走真实上报路径。
	svc.reportProgress(999999, 5, 10, 7)
}
