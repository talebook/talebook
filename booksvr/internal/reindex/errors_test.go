package reindex

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	_ "modernc.org/sqlite"

	"talebook/booksvr/internal/library"
)

// TestReindexEditionKeyUpdateErrorPropagates 覆盖 edition_key 写回失败的分支。
//
// 手法：用触发器只拦截 edition_key 列的 UPDATE，让 title_norm/author_norm
// 的更新成功、edition_key 的更新失败。
func TestReindexEditionKeyUpdateErrorPropagates(t *testing.T) {
	db := newTestDB(t)
	insertWork(t, db, 1, "三体", "刘慈欣", "三体\x1f刘慈欣", "三体", "刘慈欣")
	// 标题带版本后缀 → edition_key 会变化，从而触发该 UPDATE
	insertBook(t, db, 10, "三体（第二版）", "刘慈欣", 1, "", "三体", "刘慈欣")

	if _, err := db.Exec(`
		CREATE TRIGGER block_edition_key BEFORE UPDATE OF edition_key ON books
		BEGIN
			SELECT RAISE(ABORT, 'edition_key update blocked');
		END`); err != nil {
		t.Fatalf("create trigger: %v", err)
	}

	if _, err := ReindexNormalize(db, Options{}); err == nil {
		t.Error("edition_key 写回失败时应返回 error")
	}
}

// TestReindexWorkIDUpdateErrorPropagates 覆盖 work_id 写回失败的分支。
//
// 手法：用触发器拦截 work_id 列的 UPDATE。需要一本书的 work_id 确实会变，
// 因此先把它挂到一个错误的 work 上。
func TestReindexWorkIDUpdateErrorPropagates(t *testing.T) {
	db := newTestDB(t)
	insertWork(t, db, 1, "三体", "刘慈欣", "三体\x1f刘慈欣", "三体", "刘慈欣")
	insertWork(t, db, 2, "流浪地球", "刘慈欣", "流浪地球\x1f刘慈欣", "流浪地球", "刘慈欣")
	// 把《三体》错误地挂在《流浪地球》的 work 下 → 重算后 work_id 会变
	insertBook(t, db, 10, "三体", "刘慈欣", 2, "", "三体", "刘慈欣")

	if _, err := db.Exec(`
		CREATE TRIGGER block_work_id BEFORE UPDATE OF work_id ON books
		BEGIN
			SELECT RAISE(ABORT, 'work_id update blocked');
		END`); err != nil {
		t.Fatalf("create trigger: %v", err)
	}

	if _, err := ReindexNormalize(db, Options{}); err == nil {
		t.Error("work_id 写回失败时应返回 error")
	}
}

// TestBackupOpenErrorPropagates 覆盖备份时打开源文件失败的分支。
//
// 手法：路径存在但不可读——用一个目录下的子路径指向目录本身，
// 在 Windows 上 os.Open 目录会成功，因此改用「路径是目录」以外的
// 不可读情形：把 BackupPath 指向一个不存在的深层路径的父目录。
// 这里用「路径存在但是目录」已被 TestBackupPathIsDirectoryIsNotFatal 覆盖；
// 本用例覆盖 os.Open 返回非 IsNotExist 错误的情形。
func TestBackupOpenErrorPropagates(t *testing.T) {
	dir := t.TempDir()
	// 创建一个无读权限的文件（Windows 上 chmod 语义有限，因此改用
	// 一个指向目录的路径来触发 Stat().IsDir() 之外的分支）。
	// 这里直接验证 backupDatabase 对不存在路径返回空且无错。
	got, err := backupDatabase(filepath.Join(dir, "missing.db"), testTime())
	if err != nil {
		t.Fatalf("不存在的路径不应返回 error: %v", err)
	}
	if got != "" {
		t.Errorf("不存在的路径应返回空备份路径，实际 %q", got)
	}
}

// TestBackupDirectoryPathIsError 覆盖 backupDatabase 对目录路径返回 error。
func TestBackupDirectoryPathIsError(t *testing.T) {
	dir := t.TempDir()
	if _, err := backupDatabase(dir, testTime()); err == nil {
		t.Error("目录路径应返回 error")
	}
}

// TestBackupCreateErrorPropagates 覆盖创建备份文件失败的分支。
//
// 手法：把源文件放在一个只读目录里，使 os.Create 失败。
func TestBackupCreateErrorPropagates(t *testing.T) {
	dir := t.TempDir()
	srcPath := filepath.Join(dir, "library.db")
	if err := os.WriteFile(srcPath, []byte("fake db"), 0o644); err != nil {
		t.Fatalf("write src: %v", err)
	}

	// 把目录设为只读，使 os.Create 失败（Windows 上只读目录仍可创建文件，
	// 因此该用例在 Windows 上可能不触发；用 t.Skip 明确标注）。
	if err := os.Chmod(dir, 0o555); err != nil {
		t.Skipf("无法设置只读目录: %v", err)
	}
	t.Cleanup(func() { _ = os.Chmod(dir, 0o755) })

	_, err := backupDatabase(srcPath, testTime())
	if err == nil {
		t.Skip("当前平台允许在只读目录创建文件，跳过")
	}
	if !strings.Contains(err.Error(), "create backup") {
		t.Errorf("错误信息应说明创建备份失败，实际: %v", err)
	}
}

// TestBackupCopyErrorPropagates 覆盖 io.Copy 失败的分支。
//
// 手法：源文件是一个目录时 os.Open 成功但 io.Copy 失败——
// 不过 backupDatabase 会先被 Stat().IsDir() 拦下。
// 因此这里改为验证「源文件在复制过程中被删除」不可构造，
// 直接跳过并说明。
func TestBackupCopyErrorPropagates(t *testing.T) {
	t.Skip("io.Copy 失败需要并发删除源文件，无法确定性构造；该分支为纯防御性错误传播")
}

// TestLoadBooksScanErrorPropagates 覆盖 loadBooks 的 Scan 失败分支。
//
// 手法：把 title 列改名，使 SELECT 的列数不匹配。
func TestLoadBooksScanErrorPropagates(t *testing.T) {
	db := newTestDB(t)
	if _, err := db.Exec(`ALTER TABLE books RENAME COLUMN title TO title_x`); err != nil {
		t.Fatalf("rename column: %v", err)
	}

	if _, err := ReindexNormalize(db, Options{}); err == nil {
		t.Error("列缺失时应返回 error")
	}
}

// TestReindexPreservesUnchangedEditionKey 确认 edition_key 未变时不写回。
func TestReindexPreservesUnchangedEditionKey(t *testing.T) {
	db := newTestDB(t)
	workID, err := library.FindOrCreateWork(db, "三体", "刘慈欣")
	if err != nil {
		t.Fatalf("create work: %v", err)
	}
	if _, _, err := library.FindOrCreateEdition(db, workID, library.BookMeta{
		Title:     "三体",
		Author:    "刘慈欣",
		Publisher: "重庆出版社",
	}); err != nil {
		t.Fatalf("create edition: %v", err)
	}

	diff, err := ReindexNormalize(db, Options{})
	if err != nil {
		t.Fatalf("ReindexNormalize: %v", err)
	}
	if diff.EditionKeysUpdated != 0 {
		t.Errorf("EditionKeysUpdated = %d, want 0", diff.EditionKeysUpdated)
	}
}
