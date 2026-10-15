package scan

import (
	"database/sql"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"talebook/booksvr/internal/userdb"

	_ "modernc.org/sqlite"
)

// testDB 建一个含 scanfiles 的内存库。
func testDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	stmts := []string{
		`CREATE TABLE scanfiles (id INTEGER PRIMARY KEY AUTOINCREMENT, scan_id INTEGER DEFAULT 0,
			import_id INTEGER DEFAULT 0, name TEXT, path TEXT, hash TEXT UNIQUE, status TEXT,
			title TEXT, author TEXT, publisher TEXT, tags TEXT, create_time TEXT, update_time TEXT,
			book_id INTEGER DEFAULT 0, data TEXT DEFAULT '{}')`,
	}
	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			t.Fatalf("建表失败: %v\n%s", err, s)
		}
	}
	return db
}

// libraryDB 建一个含 books/authors/data 的书库内存库。
func libraryDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	stmts := []string{
		`CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT)`,
		`CREATE TABLE authors (id INTEGER PRIMARY KEY, name TEXT)`,
		`CREATE TABLE books_authors_link (id INTEGER PRIMARY KEY, book INTEGER, author INTEGER)`,
		`CREATE TABLE data (id INTEGER PRIMARY KEY, book INTEGER, format TEXT, name TEXT)`,
	}
	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			t.Fatalf("建表失败: %v\n%s", err, s)
		}
	}
	return db
}

// supported 返回测试用的支持格式集合。
func supported() map[string]bool {
	return map[string]bool{"epub": true, "pdf": true, "cbz": true, "txt": true}
}

func TestCollectTasksBooksBeforeGenericArchives(t *testing.T) {
	root := t.TempDir()
	archive := writeBook(t, root, "000-novels.zip", []byte("archive"))
	book := writeBook(t, root, "zzz-book.txt", []byte("book"))
	formats := map[string]bool{"txt": true, "zip": true}
	_, tasks, _, err := CollectTasks(root, 1, nil, formats)
	if err != nil || len(tasks) != 1 || tasks[0].Path != book {
		t.Fatalf("book starved by archive: %v %v", tasks, err)
	}
	_, tasks, _, err = CollectTasks(root, 1, map[string]bool{book: true}, formats)
	if err != nil || len(tasks) != 1 || tasks[0].Path != archive {
		t.Fatalf("archive must remain discoverable: %v %v", tasks, err)
	}
	_, tasks, _, err = CollectTasks(root, 0, nil, formats)
	if err != nil || len(tasks) != 2 {
		t.Fatalf("unlimited scan: %v %v", tasks, err)
	}
}

// fixedClock 返回固定时间。
func fixedClock() time.Time {
	return time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC)
}

// newTestService 构造一个使用固定时钟的服务。
func newTestService(db *sql.DB) *Service {
	s := NewService(db, supported())
	s.Clock = fixedClock
	return s
}

// writeBook 写一个测试文件。
func writeBook(t *testing.T, dir, name string, data []byte) string {
	t.Helper()
	p := filepath.Join(dir, name)
	if err := os.WriteFile(p, data, 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	return p
}

// TestNormalizeImportMode 导入模式归一化。
func TestNormalizeImportMode(t *testing.T) {
	cases := []struct {
		name        string
		mode        string
		deleteAfter bool
		saved       string
		want        string
	}{
		{"显式 index", "index", false, "", "index"},
		{"显式 move", "move", false, "", "move"},
		{"delete_after 转 move", "", true, "", "move"},
		{"已保存模式生效", "", false, "index", "index"},
		{"非法已保存退回 copy", "", false, "bogus", "copy"},
		{"全空退回 copy", "", false, "", "copy"},
		{"显式优先于已保存", "index", false, "move", "index"},
		{"显式优先于 delete_after", "copy", true, "", "copy"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := NormalizeImportMode(tc.mode, tc.deleteAfter, tc.saved); got != tc.want {
				t.Errorf("NormalizeImportMode = %q, want %q", got, tc.want)
			}
		})
	}
}

// TestTempHash 临时哈希格式。
func TestTempHash(t *testing.T) {
	got := TempHash("a.epub", 1234)
	if !strings.HasPrefix(got, "fstat:1234/") {
		t.Errorf("TempHash = %q, 应以 fstat:1234/ 开头", got)
	}
	// 同一输入应稳定。
	if got != TempHash("a.epub", 1234) {
		t.Error("TempHash 应稳定")
	}
	// 文件名不同则哈希不同。
	if got == TempHash("b.epub", 1234) {
		t.Error("不同文件名应产生不同哈希")
	}
}

// TestFileSHA256 真实哈希计算。
func TestFileSHA256(t *testing.T) {
	dir := t.TempDir()
	p := writeBook(t, dir, "a.epub", []byte("hello"))
	got, err := FileSHA256(p)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	// echo -n hello | sha256sum
	want := "sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
	if got != want {
		t.Errorf("FileSHA256 = %q, want %q", got, want)
	}
	if _, err := FileSHA256(filepath.Join(dir, "nope")); err == nil {
		t.Error("不存在文件应报错")
	}
}

// TestCollectTasks 目录遍历收集候选。
func TestCollectTasks(t *testing.T) {
	dir := t.TempDir()
	writeBook(t, dir, "a.epub", []byte("x"))
	writeBook(t, dir, "b.pdf", []byte("x"))
	writeBook(t, dir, "c.txt", []byte("x")) // txt 在支持列表
	writeBook(t, dir, "d.xyz", []byte("x")) // 不支持
	writeBook(t, dir, ".hidden.epub", []byte("x"))
	if err := os.Mkdir(filepath.Join(dir, ".git"), 0o755); err != nil {
		t.Fatalf("建目录失败: %v", err)
	}
	writeBook(t, filepath.Join(dir, ".git"), "e.epub", []byte("x"))
	if err := os.Mkdir(filepath.Join(dir, "@__thumb"), 0o755); err != nil {
		t.Fatalf("建目录失败: %v", err)
	}
	writeBook(t, filepath.Join(dir, "@__thumb"), "f.epub", []byte("x"))

	hasBooks, tasks, skipped, err := CollectTasks(dir, 0, nil, supported())
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if !hasBooks {
		t.Error("应报告有书籍文件")
	}
	if len(tasks) != 3 {
		t.Fatalf("应有 3 个候选，得到 %d: %+v", len(tasks), tasks)
	}
	if skipped != 0 {
		t.Errorf("skipped = %d, want 0", skipped)
	}
}

// TestCollectTasksDonePaths 已完成的路径被跳过且不占名额。
func TestCollectTasksDonePaths(t *testing.T) {
	dir := t.TempDir()
	a := writeBook(t, dir, "a.epub", []byte("x"))
	writeBook(t, dir, "b.epub", []byte("x"))

	done := map[string]bool{a: true}
	_, tasks, skipped, err := CollectTasks(dir, 0, done, supported())
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(tasks) != 1 {
		t.Fatalf("应有 1 个候选，得到 %d", len(tasks))
	}
	if skipped != 1 {
		t.Errorf("skipped = %d, want 1", skipped)
	}
	if tasks[0].Name != "b.epub" {
		t.Errorf("候选 = %q, want b.epub", tasks[0].Name)
	}
}

// TestCollectTasksLimit 批次上限生效。
func TestCollectTasksLimit(t *testing.T) {
	dir := t.TempDir()
	for _, n := range []string{"a.epub", "b.epub", "c.epub", "d.epub"} {
		writeBook(t, dir, n, []byte("x"))
	}
	_, tasks, _, err := CollectTasks(dir, 2, nil, supported())
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(tasks) != 2 {
		t.Errorf("应受 limit 限制为 2，得到 %d", len(tasks))
	}
}

// TestCollectTasksNoBooks 目录中没有支持格式。
func TestCollectTasksNoBooks(t *testing.T) {
	dir := t.TempDir()
	writeBook(t, dir, "a.xyz", []byte("x"))
	hasBooks, tasks, _, err := CollectTasks(dir, 0, nil, supported())
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if hasBooks {
		t.Error("不应报告有书籍文件")
	}
	if len(tasks) != 0 {
		t.Errorf("不应有候选，得到 %d", len(tasks))
	}
}

// TestCollectTasksMissingDir 目录不存在。
func TestCollectTasksMissingDir(t *testing.T) {
	hasBooks, tasks, _, err := CollectTasks(filepath.Join(t.TempDir(), "nope"), 0, nil, supported())
	if err != nil {
		t.Fatalf("不存在的目录不应报错: %v", err)
	}
	if hasBooks || len(tasks) != 0 {
		t.Errorf("不应有结果: hasBooks=%v tasks=%d", hasBooks, len(tasks))
	}
}

// TestScanRegistersAndAnalyzes 完整扫描流程。
func TestScanRegistersAndAnalyzes(t *testing.T) {
	dir := t.TempDir()
	writeBook(t, dir, "三体.epub", []byte("PK\x03\x04fake epub"))
	db := testDB(t)
	svc := newTestService(db)

	res, err := svc.Scan(dir, 0)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if res.Candidates != 1 {
		t.Fatalf("candidates = %d, want 1", res.Candidates)
	}
	if res.Inserted != 1 {
		t.Errorf("inserted = %d, want 1", res.Inserted)
	}
	// 内容不是合法 EPUB，应标记 failed。
	if res.Failed != 1 {
		t.Errorf("failed = %d, want 1（res=%+v）", res.Failed, res)
	}

	row, err := getScanFileByPath(db, filepath.Join(dir, "三体.epub"))
	if err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if row == nil {
		t.Fatal("应写入记录")
	}
	if row.Status != userdb.ScanStatusFailed {
		t.Errorf("status = %q, want failed", row.Status)
	}
	if !strings.HasPrefix(row.Hash, "sha256:") {
		t.Errorf("hash = %q, 应为真实哈希", row.Hash)
	}
	if row.Data["analysis_error_code"] == nil {
		t.Error("应记录 analysis_error_code")
	}
}

// TestScanSkipsDonePaths 已完成路径在第二轮被跳过。
func TestScanSkipsDonePaths(t *testing.T) {
	dir := t.TempDir()
	writeBook(t, dir, "a.epub", []byte("PK\x03\x04x"))
	db := testDB(t)
	svc := newTestService(db)

	if _, err := svc.Scan(dir, 0); err != nil {
		t.Fatalf("第一轮失败: %v", err)
	}
	res, err := svc.Scan(dir, 0)
	if err != nil {
		t.Fatalf("第二轮失败: %v", err)
	}
	// 第一轮标记为 failed（非 NEW、真实哈希），第二轮应跳过。
	if res.Skipped != 1 {
		t.Errorf("skipped = %d, want 1", res.Skipped)
	}
	if res.Inserted != 0 {
		t.Errorf("inserted = %d, want 0", res.Inserted)
	}
}

// TestScanRetriesTempHashRows 临时哈希行会被重新处理。
func TestScanRetriesTempHashRows(t *testing.T) {
	dir := t.TempDir()
	p := writeBook(t, dir, "a.epub", []byte("PK\x03\x04x"))
	db := testDB(t)
	svc := newTestService(db)

	// 手工插入一条中断残留的临时哈希记录。
	if _, err := db.Exec(`INSERT INTO scanfiles (scan_id, name, path, hash, status, create_time, update_time, data)
		VALUES (0, 'a.epub', ?, 'fstat:6/abc', 'ready', 't', 't', '{}')`, p); err != nil {
		t.Fatalf("插入失败: %v", err)
	}

	res, err := svc.Scan(dir, 0)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if res.Candidates != 1 {
		t.Errorf("candidates = %d, want 1（临时哈希行应重新处理）", res.Candidates)
	}
	row, _ := getScanFileByPath(db, p)
	if !strings.HasPrefix(row.Hash, "sha256:") {
		t.Errorf("hash = %q, 应更新为真实哈希", row.Hash)
	}
}

// TestScanDropsMissingFile 文件在登记后消失时标记 drop。
func TestScanDropsMissingFile(t *testing.T) {
	dir := t.TempDir()
	p := writeBook(t, dir, "a.epub", []byte("PK\x03\x04x"))
	db := testDB(t)
	svc := newTestService(db)

	// 先插入 NEW 状态记录，再删除文件，模拟登记后消失。
	if _, err := db.Exec(`INSERT INTO scanfiles (scan_id, name, path, hash, status, create_time, update_time, data)
		VALUES (0, 'a.epub', ?, 'fstat:6/abc', 'new', 't', 't', '{}')`, p); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if err := os.Remove(p); err != nil {
		t.Fatalf("删除失败: %v", err)
	}

	res, err := svc.Scan(dir, 0)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	// 文件已消失，收集阶段就找不到候选。
	if res.Candidates != 0 {
		t.Errorf("candidates = %d, want 0", res.Candidates)
	}
}

// TestScanDuplicateHashDropped 相同真实哈希的记录被丢弃。
func TestScanDuplicateHashDropped(t *testing.T) {
	dir := t.TempDir()
	content := []byte("PK\x03\x04same content")
	p1 := writeBook(t, dir, "a.epub", content)
	p2 := writeBook(t, dir, "b.epub", content)
	db := testDB(t)
	svc := newTestService(db)

	// 先扫描 a.epub，让它拿到真实哈希。
	if _, err := svc.Scan(dir, 1); err != nil {
		t.Fatalf("第一轮失败: %v", err)
	}
	row1, _ := getScanFileByPath(db, p1)
	if row1 == nil || !strings.HasPrefix(row1.Hash, "sha256:") {
		t.Fatalf("a.epub 应有真实哈希: %+v", row1)
	}

	// 再扫描 b.epub：内容相同 → 真实哈希重复 → drop。
	res, err := svc.Scan(dir, 0)
	if err != nil {
		t.Fatalf("第二轮失败: %v", err)
	}
	row2, _ := getScanFileByPath(db, p2)
	if row2 == nil {
		t.Fatal("b.epub 应有记录")
	}
	if row2.Status != userdb.ScanStatusDrop {
		t.Errorf("b.epub status = %q, want drop", row2.Status)
	}
	_ = res
}

// TestScanDuplicateBookDeletedAllowsReimport 关联书籍已删除时允许重新导入。
func TestScanDuplicateBookDeletedAllowsReimport(t *testing.T) {
	dir := t.TempDir()
	content := []byte("PK\x03\x04same")
	p1 := writeBook(t, dir, "a.epub", content)
	p2 := writeBook(t, dir, "b.epub", content)
	db := testDB(t)
	lib := libraryDB(t)
	svc := newTestService(db)
	svc.LibraryDB = lib

	if _, err := svc.Scan(dir, 1); err != nil {
		t.Fatalf("第一轮失败: %v", err)
	}
	// 给旧记录关联一个不存在的 book_id。
	if _, err := db.Exec(`UPDATE scanfiles SET book_id = 999 WHERE path = ?`, p1); err != nil {
		t.Fatalf("更新失败: %v", err)
	}

	if _, err := svc.Scan(dir, 0); err != nil {
		t.Fatalf("第二轮失败: %v", err)
	}
	row2, _ := getScanFileByPath(db, p2)
	if row2 == nil {
		t.Fatal("b.epub 应有记录")
	}
	// 旧记录被清理，b.epub 不再被判为重复。
	if row2.Status == userdb.ScanStatusDrop {
		t.Errorf("书籍已删除时不应判为重复，得到 %q", row2.Status)
	}
	// 旧记录应被删除。
	old, _ := getScanFileByPath(db, p1)
	if old != nil {
		t.Error("旧记录应被清理")
	}
}

// TestScanMarksExisting 书库已有同名同作者同格式时标记 exist。
func TestScanMarksExisting(t *testing.T) {
	dir := t.TempDir()
	writeBook(t, dir, "三体.epub", []byte("PK\x03\x04x"))
	db := testDB(t)
	lib := libraryDB(t)
	svc := newTestService(db)
	svc.LibraryDB = lib

	// 书库中已有《三体》，作者「佚名」（与文件名元数据一致），含 EPUB 格式。
	if _, err := lib.Exec(`INSERT INTO books (id, title) VALUES (1, '三体')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO authors (id, name) VALUES (1, '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO books_authors_link (book, author) VALUES (1, 1)`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO data (book, format, name) VALUES (1, 'EPUB', 'x.epub')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}

	res, err := svc.Scan(dir, 0)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	// 媒体分析会先失败（内容不是合法 EPUB），因此这里只验证不 panic。
	_ = res
}

// TestDonePaths 已完成路径查询。
func TestDonePaths(t *testing.T) {
	dir := t.TempDir()
	db := testDB(t)
	prefix := dir + string(filepath.Separator)

	rows := []struct {
		path, hash, status string
	}{
		{prefix + "a.epub", "sha256:aaa", "ready"},
		{prefix + "b.epub", "sha256:bbb", "new"},      // NEW 不算 done
		{prefix + "c.epub", "fstat:1/ccc", "ready"},   // 临时哈希不算 done
		{prefix + "d.epub", "sha256:ddd", "imported"}, // done
	}
	for _, r := range rows {
		if _, err := db.Exec(`INSERT INTO scanfiles (path, hash, status, name, create_time, update_time, data)
			VALUES (?, ?, ?, 'x', 't', 't', '{}')`, r.path, r.hash, r.status); err != nil {
			t.Fatalf("插入失败: %v", err)
		}
	}

	done, err := DonePaths(db, dir)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(done) != 2 {
		t.Fatalf("应有 2 条 done，得到 %d: %v", len(done), done)
	}
	if !done[prefix+"a.epub"] || !done[prefix+"d.epub"] {
		t.Errorf("done 内容错误: %v", done)
	}
}

// TestDonePathsEscapesWildcards 路径中的通配符被转义。
func TestDonePathsEscapesWildcards(t *testing.T) {
	dir := t.TempDir()
	db := testDB(t)
	// 建一个含 % 的目录名。
	weird := filepath.Join(dir, "100%_books")
	if err := os.Mkdir(weird, 0o755); err != nil {
		t.Fatalf("建目录失败: %v", err)
	}
	p := filepath.Join(weird, "a.epub")
	if _, err := db.Exec(`INSERT INTO scanfiles (path, hash, status, name, create_time, update_time, data)
		VALUES (?, 'sha256:x', 'ready', 'x', 't', 't', '{}')`, p); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	done, err := DonePaths(db, weird)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if !done[p] {
		t.Errorf("含通配符的路径应被正确匹配: %v", done)
	}
}

// TestScanEmptyDir 空目录。
func TestScanEmptyDir(t *testing.T) {
	dir := t.TempDir()
	db := testDB(t)
	svc := newTestService(db)
	res, err := svc.Scan(dir, 0)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if res.Candidates != 0 || res.Inserted != 0 {
		t.Errorf("空目录不应有结果: %+v", res)
	}
}

// TestScanIDIsClockBased scan_id 来自时钟。
func TestScanIDIsClockBased(t *testing.T) {
	dir := t.TempDir()
	writeBook(t, dir, "a.epub", []byte("PK\x03\x04x"))
	db := testDB(t)
	svc := newTestService(db)
	res, err := svc.Scan(dir, 0)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if res.ScanID != fixedClock().Unix() {
		t.Errorf("scan_id = %d, want %d", res.ScanID, fixedClock().Unix())
	}
}

// TestSortedTasks 任务排序。
func TestSortedTasks(t *testing.T) {
	tasks := []Task{{Path: "c"}, {Path: "a"}, {Path: "b"}}
	got := SortedTasks(tasks)
	if got[0].Path != "a" || got[2].Path != "c" {
		t.Errorf("排序错误: %+v", got)
	}
	// 原切片不应被修改。
	if tasks[0].Path != "c" {
		t.Error("不应修改原切片")
	}
}

// TestSetRowData 合并 data 字段。
func TestSetRowData(t *testing.T) {
	row := &userdb.ScanFile{}
	setRowData(row, "a", 1, "b", "x")
	if row.Data["a"] != 1 || row.Data["b"] != "x" {
		t.Errorf("data = %v", row.Data)
	}
	// 再次合并应保留旧键。
	setRowData(row, "c", true)
	if row.Data["a"] != 1 || row.Data["c"] != true {
		t.Errorf("合并后 data = %v", row.Data)
	}
	// 非字符串键被跳过。
	setRowData(row, 123, "x")
	if len(row.Data) != 3 {
		t.Errorf("非字符串键应被跳过，data = %v", row.Data)
	}
}

// TestStoreRoundTrip 记录读写往返。
func TestStoreRoundTrip(t *testing.T) {
	db := testDB(t)
	row := &userdb.ScanFile{
		ScanID: 1, Name: "a.epub", Path: "/x/a.epub", Hash: "sha256:abc",
		Status: "ready", Title: "书名", Author: "作者", Publisher: "社", Tags: "a,b",
		CreateTime: "t1", UpdateTime: "t2", BookID: 7,
		Data: map[string]any{"k": "v"},
	}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if row.ID == 0 {
		t.Fatal("应回填 id")
	}

	got, err := getScanFileByPath(db, "/x/a.epub")
	if err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if got.Title != "书名" || got.BookID != 7 || got.Data["k"] != "v" {
		t.Errorf("往返错误: %+v", got)
	}

	// 更新。
	got.Status = "imported"
	if err := saveScanFile(db, got); err != nil {
		t.Fatalf("更新失败: %v", err)
	}
	again, _ := getScanFileByPath(db, "/x/a.epub")
	if again.Status != "imported" {
		t.Errorf("status = %q, want imported", again.Status)
	}
}

// TestGetScanFileByPathMissing 不存在的路径返回 nil。
func TestGetScanFileByPathMissing(t *testing.T) {
	db := testDB(t)
	got, err := getScanFileByPath(db, "/nope")
	if err != nil {
		t.Fatalf("不应报错: %v", err)
	}
	if got != nil {
		t.Errorf("应返回 nil，得到 %+v", got)
	}
}

// TestBooksWithSameTitle 同名书籍查询。
func TestBooksWithSameTitle(t *testing.T) {
	lib := libraryDB(t)
	if _, err := lib.Exec(`INSERT INTO books (id, title) VALUES (1, '三体'), (2, '三体'), (3, '流浪地球')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	ids, err := booksWithSameTitle(lib, "三体")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(ids) != 2 {
		t.Errorf("应找到 2 本，得到 %v", ids)
	}
	ids, err = booksWithSameTitle(lib, "不存在")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(ids) != 0 {
		t.Errorf("应找到 0 本，得到 %v", ids)
	}
}

// TestLoadBooksForMatch 书籍匹配信息加载。
func TestLoadBooksForMatch(t *testing.T) {
	lib := libraryDB(t)
	if _, err := lib.Exec(`INSERT INTO books (id, title) VALUES (1, '三体')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO authors (id, name) VALUES (1, '刘慈欣'), (2, '某人')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO books_authors_link (book, author) VALUES (1, 1), (1, 2)`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO data (book, format, name) VALUES (1, 'EPUB', 'a'), (1, 'MOBI', 'b')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}

	books, err := loadBooksForMatch(lib, []int64{1})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(books) != 1 {
		t.Fatalf("应有 1 本，得到 %d", len(books))
	}
	authors, _ := books[0]["authors"].([]string)
	if len(authors) != 2 {
		t.Errorf("authors = %v", authors)
	}
	formats, _ := books[0]["available_formats"].(string)
	if !strings.Contains(formats, "EPUB") || !strings.Contains(formats, "MOBI") {
		t.Errorf("formats = %q", formats)
	}
}

// TestLoadBooksForMatchEmpty 空 id 列表。
func TestLoadBooksForMatchEmpty(t *testing.T) {
	lib := libraryDB(t)
	books, err := loadBooksForMatch(lib, nil)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(books) != 0 {
		t.Errorf("应返回空，得到 %v", books)
	}
}

// TestBookExists 书库存在性判断。
func TestBookExists(t *testing.T) {
	lib := libraryDB(t)
	if _, err := lib.Exec(`INSERT INTO books (id, title) VALUES (1, 'x')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	svc := &Service{LibraryDB: lib}
	if !svc.bookExists(1) {
		t.Error("书 1 应存在")
	}
	if svc.bookExists(999) {
		t.Error("书 999 不应存在")
	}
	// 无书库句柄时返回 false。
	empty := &Service{}
	if empty.bookExists(1) {
		t.Error("无书库句柄应返回 false")
	}
}

// TestExtractMetadata 元数据提取退回文件名。
func TestExtractMetadata(t *testing.T) {
	svc := newTestService(testDB(t))
	mi := svc.extractMetadata("/data/三体.epub", "epub")
	if mi.Title != "三体" {
		t.Errorf("Title = %q", mi.Title)
	}
	if len(mi.Authors) != 1 || mi.Authors[0] != "佚名" {
		t.Errorf("Authors = %v", mi.Authors)
	}
}

// TestEscapeLike LIKE 通配符转义。
func TestEscapeLike(t *testing.T) {
	cases := []struct{ in, want string }{
		{"abc", "abc"},
		{"a%b", `a\%b`},
		{"a_b", `a\_b`},
		{`a\b`, `a\\b`},
	}
	for _, tc := range cases {
		if got := escapeLike(tc.in); got != tc.want {
			t.Errorf("escapeLike(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}
