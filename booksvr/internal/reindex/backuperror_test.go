package reindex

import (
	"strings"
	"testing"

	_ "modernc.org/sqlite"
)

// TestBackupErrorIsReported 断言备份失败时 Diff 记录原因，而不是静默忽略。
//
// 这是本轮强制检查发现的缺陷：原实现把 backupDatabase 的 error 直接丢弃，
// 调用方无法区分「没要求备份」与「要求了但失败」。
func TestBackupErrorIsReported(t *testing.T) {
	db := newTestDB(t)
	insertWork(t, db, 1, "三体", "刘慈欣", "三体\x1f刘慈欣", "三体", "刘慈欣")
	insertBook(t, db, 10, "三体", "刘慈欣", 1, "", "旧", "旧")

	// 指向一个目录：backupDatabase 会返回 error
	diff, err := ReindexNormalize(db, Options{BackupPath: t.TempDir()})
	if err != nil {
		t.Fatalf("ReindexNormalize: %v", err)
	}

	if diff.BackupError == "" {
		t.Error("备份失败时 BackupError 不应为空")
	}
	if diff.BackupFile != "" {
		t.Errorf("备份失败时 BackupFile 应为空，实际 %q", diff.BackupFile)
	}
	// 备份失败不阻断重算
	if diff.NormalizedFieldsUpdated != 1 {
		t.Errorf("NormalizedFieldsUpdated = %d, want 1（备份失败不应阻断重算）", diff.NormalizedFieldsUpdated)
	}
}

func TestBackupErrorEmptyWhenNotRequested(t *testing.T) {
	db := newTestDB(t)
	insertWork(t, db, 1, "三体", "刘慈欣", "三体\x1f刘慈欣", "三体", "刘慈欣")
	insertBook(t, db, 10, "三体", "刘慈欣", 1, "", "旧", "旧")

	diff, err := ReindexNormalize(db, Options{})
	if err != nil {
		t.Fatalf("ReindexNormalize: %v", err)
	}
	if diff.BackupError != "" {
		t.Errorf("未要求备份时 BackupError 应为空，实际 %q", diff.BackupError)
	}
}

func TestBackupErrorEmptyWhenBackupSucceeds(t *testing.T) {
	dir := t.TempDir()
	dbPath := dir + "/library.db"

	db := openFileDB(t, dbPath)
	insertWork(t, db, 1, "三体", "刘慈欣", "三体\x1f刘慈欣", "三体", "刘慈欣")
	insertBook(t, db, 10, "三体", "刘慈欣", 1, "", "旧", "旧")

	diff, err := ReindexNormalize(db, Options{BackupPath: dbPath})
	if err != nil {
		t.Fatalf("ReindexNormalize: %v", err)
	}
	if diff.BackupError != "" {
		t.Errorf("备份成功时 BackupError 应为空，实际 %q", diff.BackupError)
	}
	if diff.BackupFile == "" {
		t.Error("备份成功时 BackupFile 不应为空")
	}
}

func TestDiffStringIncludesBackupErrorLine(t *testing.T) {
	d := Diff{BooksScanned: 1, BackupError: "磁盘已满"}
	s := d.String()
	if !strings.Contains(s, "备份失败") || !strings.Contains(s, "磁盘已满") {
		t.Errorf("报告应含备份失败原因\n%s", s)
	}
}

func TestDiffStringOmitsBackupErrorWhenEmpty(t *testing.T) {
	d := Diff{BooksScanned: 1}
	if strings.Contains(d.String(), "备份失败") {
		t.Errorf("无备份错误时不应输出该行\n%s", d.String())
	}
}

// TestSplitCountUsesOriginalKeys 断言拆分计数基于原 work 的多 key 状态。
//
// 这是本轮强制检查发现的缺陷：原实现里 oldWorkID 是未使用的循环变量
// （`_ = oldWorkID`），说明该段逻辑没有真正用到它。
func TestSplitCountUsesOriginalKeys(t *testing.T) {
	db := newTestDB(t)
	// 一个 work 下两本不同书 → 重算后必然拆成两个 work
	insertWork(t, db, 1, "旧", "旧", "旧\x1f旧", "三体", "刘慈欣")
	insertBook(t, db, 10, "三体", "刘慈欣", 1, "", "旧", "旧")
	insertBook(t, db, 11, "流浪地球", "刘慈欣", 1, "", "旧", "旧")

	diff, err := ReindexNormalize(db, Options{})
	if err != nil {
		t.Fatalf("ReindexNormalize: %v", err)
	}
	if diff.WorksSplit != 1 {
		t.Errorf("WorksSplit = %d, want 1", diff.WorksSplit)
	}

	var n int
	if err := db.QueryRow(`SELECT COUNT(DISTINCT work_id) FROM books`).Scan(&n); err != nil {
		t.Fatalf("count: %v", err)
	}
	if n != 2 {
		t.Errorf("不同 work_id 数 = %d, want 2", n)
	}
}
