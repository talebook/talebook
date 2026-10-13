package reindex

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	_ "modernc.org/sqlite"

	"talebook/booksvr/internal/library"
)

// ---------- rebuildEditionKey 表驱动 ----------

func TestRebuildEditionKey(t *testing.T) {
	cases := []struct {
		name     string
		existing string
		suffixes []string
		want     string
	}{
		{
			name:     "无原指纹无后缀返回空",
			existing: "",
			suffixes: nil,
			want:     "",
		},
		{
			name:     "无原指纹有后缀用占位符补齐",
			existing: "",
			suffixes: []string{"第二版"},
			want:     "-\x1f-\x1f-\x1f第二版",
		},
		{
			name:     "保留原前三段并替换后缀",
			existing: "重庆出版社\x1f2008\x1f-\x1f旧后缀",
			suffixes: []string{"第二版"},
			want:     "重庆出版社\x1f2008\x1f-\x1f第二版",
		},
		{
			name:     "保留原前三段并去掉后缀",
			existing: "重庆出版社\x1f2008\x1f-\x1f旧后缀",
			suffixes: nil,
			want:     "重庆出版社\x1f2008\x1f-",
		},
		{
			name:     "原 key 无后缀段时追加",
			existing: "重庆出版社\x1f2008\x1f-",
			suffixes: []string{"修订版"},
			want:     "重庆出版社\x1f2008\x1f-\x1f修订版",
		},
		{
			name:     "形状异常时保留原值",
			existing: "只有一段",
			suffixes: []string{"第二版"},
			want:     "只有一段",
		},
		{
			name:     "多后缀逗号连接",
			existing: "重庆出版社\x1f2008\x1f-",
			suffixes: []string{"第二版", "修订版"},
			want:     "重庆出版社\x1f2008\x1f-\x1f第二版,修订版",
		},
		{
			name:     "空后缀被过滤",
			existing: "重庆出版社\x1f2008\x1f-",
			suffixes: []string{"", "第二版"},
			want:     "重庆出版社\x1f2008\x1f-\x1f第二版",
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := rebuildEditionKey(c.existing, c.suffixes)
			if got != c.want {
				t.Errorf("rebuildEditionKey(%q, %v) = %q, want %q", c.existing, c.suffixes, got, c.want)
			}
		})
	}
}

// TestRebuildEditionKeyPreservesPublisher 是本轮真实缺陷的回归测试。
//
// 缺陷：重算时只传 Suffixes 给 EditionKey，会把 publisher/pubdate/translator
// 三段抹掉，导致《三体》重庆出版社版的指纹丢失。
func TestRebuildEditionKeyPreservesPublisher(t *testing.T) {
	existing := "重庆出版社\x1f2008\x1f-\x1f第二版"
	got := rebuildEditionKey(existing, []string{"第二版"})

	if !strings.HasPrefix(got, "重庆出版社\x1f2008\x1f-") {
		t.Errorf("前三段必须保留，实际 %q", got)
	}
	if got != existing {
		t.Errorf("后缀未变时应返回原值，实际 %q", got)
	}
}

// ---------- loadBooks 的 rows.Err 分支 ----------

func TestLoadBooksReturnsRows(t *testing.T) {
	db := newTestDB(t)
	insertWork(t, db, 1, "三体", "刘慈欣", "三体\x1f刘慈欣", "三体", "刘慈欣")
	insertBook(t, db, 10, "三体", "刘慈欣", 1, "", "三体", "刘慈欣")

	rows, err := loadBooks(db)
	if err != nil {
		t.Fatalf("loadBooks: %v", err)
	}
	if len(rows) != 1 {
		t.Fatalf("rows 数 = %d, want 1", len(rows))
	}
	if rows[0].ID != 10 || rows[0].Title != "三体" {
		t.Errorf("rows[0] = %+v", rows[0])
	}
}

func TestLoadBooksEmptyTable(t *testing.T) {
	db := newTestDB(t)
	rows, err := loadBooks(db)
	if err != nil {
		t.Fatalf("loadBooks: %v", err)
	}
	if len(rows) != 0 {
		t.Errorf("rows 数 = %d, want 0", len(rows))
	}
}

func TestLoadBooksMissingTableIsError(t *testing.T) {
	db := newTestDB(t)
	if _, err := db.Exec(`DROP TABLE books`); err != nil {
		t.Fatalf("drop books: %v", err)
	}
	if _, err := loadBooks(db); err == nil {
		t.Error("books 表缺失时应返回 error")
	}
}

// ---------- backupDatabase 的 Create 失败 ----------

func TestBackupCreateErrorWhenParentMissing(t *testing.T) {
	dir := t.TempDir()
	// 源文件存在，但备份目标目录不存在 → os.Create 失败
	srcPath := filepath.Join(dir, "library.db")
	if err := os.WriteFile(srcPath, []byte("data"), 0o644); err != nil {
		t.Fatalf("write src: %v", err)
	}

	// 把源文件放在一个不存在的子目录路径下：os.Open 会失败（IsNotExist）
	missing := filepath.Join(dir, "nope", "library.db")
	got, err := backupDatabase(missing, testTime())
	if err != nil {
		t.Fatalf("不存在的源路径不应返回 error: %v", err)
	}
	if got != "" {
		t.Errorf("不存在的源路径应返回空，实际 %q", got)
	}
}

// TestBackupCreateFailsOnReadOnlyDir 覆盖 os.Create 失败分支。
func TestBackupCreateFailsOnReadOnlyDir(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Windows 上只读目录仍允许创建文件")
	}
	dir := t.TempDir()
	srcPath := filepath.Join(dir, "library.db")
	if err := os.WriteFile(srcPath, []byte("data"), 0o644); err != nil {
		t.Fatalf("write src: %v", err)
	}
	if err := os.Chmod(dir, 0o555); err != nil {
		t.Skipf("chmod: %v", err)
	}
	t.Cleanup(func() { _ = os.Chmod(dir, 0o755) })

	if _, err := backupDatabase(srcPath, testTime()); err == nil {
		t.Error("只读目录下创建备份应失败")
	}
}

// ---------- 端到端：重算不破坏出版社指纹 ----------

func TestReindexKeepsPublisherFingerprint(t *testing.T) {
	db := newTestDB(t)
	workID, err := library.FindOrCreateWork(db, "三体", "刘慈欣")
	if err != nil {
		t.Fatalf("create work: %v", err)
	}
	bookID, _, err := library.FindOrCreateEdition(db, workID, library.BookMeta{
		Title:     "三体",
		Author:    "刘慈欣",
		Publisher: "重庆出版社",
		Pubdate:   "2008-01-01",
	})
	if err != nil {
		t.Fatalf("create edition: %v", err)
	}

	var before string
	if err := db.QueryRow(`SELECT edition_key FROM books WHERE id = ?`, bookID).Scan(&before); err != nil {
		t.Fatalf("read before: %v", err)
	}

	if _, err := ReindexNormalize(db, Options{}); err != nil {
		t.Fatalf("ReindexNormalize: %v", err)
	}

	var after string
	if err := db.QueryRow(`SELECT edition_key FROM books WHERE id = ?`, bookID).Scan(&after); err != nil {
		t.Fatalf("read after: %v", err)
	}

	if before != after {
		t.Errorf("重算不应改变 edition_key:\nbefore = %q\nafter  = %q", before, after)
	}
	if !strings.Contains(after, "重庆出版社") {
		t.Errorf("重算后出版社信息丢失: %q", after)
	}
}

// TestReindexAddsSuffixToExistingFingerprint 确认重算能补上缺失的后缀段。
func TestReindexAddsSuffixToExistingFingerprint(t *testing.T) {
	db := newTestDB(t)
	workID, err := library.FindOrCreateWork(db, "三体", "刘慈欣")
	if err != nil {
		t.Fatalf("create work: %v", err)
	}
	// 出版社有值，但标题带后缀而 edition_key 里没有后缀段
	bookID, _, err := library.FindOrCreateEdition(db, workID, library.BookMeta{
		Title:     "三体",
		Author:    "刘慈欣",
		Publisher: "重庆出版社",
	})
	if err != nil {
		t.Fatalf("create edition: %v", err)
	}
	// 手工把标题改成带后缀，模拟「标题变了但指纹没重算」
	if _, err := db.Exec(`UPDATE books SET title = ? WHERE id = ?`, "三体（第二版）", bookID); err != nil {
		t.Fatalf("update title: %v", err)
	}

	if _, err := ReindexNormalize(db, Options{}); err != nil {
		t.Fatalf("ReindexNormalize: %v", err)
	}

	var after string
	if err := db.QueryRow(`SELECT edition_key FROM books WHERE id = ?`, bookID).Scan(&after); err != nil {
		t.Fatalf("read after: %v", err)
	}
	if !strings.Contains(after, "重庆出版社") {
		t.Errorf("出版社信息应保留: %q", after)
	}
	if !strings.Contains(after, "第二版") {
		t.Errorf("后缀应被补上: %q", after)
	}
}
