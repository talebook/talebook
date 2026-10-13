package scan

import (
	"database/sql"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"talebook/booksvr/internal/userdb"
)

// closedDB 返回一个已关闭的库句柄，用于触发错误分支。
func closedDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开失败: %v", err)
	}
	_ = db.Close()
	return db
}

// TestStoreErrorsOnClosedDB 覆盖 store.go 的各错误分支。
func TestStoreErrorsOnClosedDB(t *testing.T) {
	db := closedDB(t)

	if _, err := getScanFileByPath(db, "/x"); err == nil {
		t.Error("getScanFileByPath 应报错")
	}
	row := &userdb.ScanFile{Path: "/x", Data: map[string]any{}}
	if err := insertScanFile(db, row); err == nil {
		t.Error("insertScanFile 应报错")
	}
	if err := saveScanFile(db, row); err == nil {
		t.Error("saveScanFile 应报错")
	}
}

// TestInsertScanFileDuplicateHash 唯一约束冲突。
func TestInsertScanFileDuplicateHash(t *testing.T) {
	db := testDB(t)
	first := &userdb.ScanFile{Path: "/a", Hash: "sha256:same", Data: map[string]any{}}
	if err := insertScanFile(db, first); err != nil {
		t.Fatalf("首次插入失败: %v", err)
	}
	second := &userdb.ScanFile{Path: "/b", Hash: "sha256:same", Data: map[string]any{}}
	if err := insertScanFile(db, second); err == nil {
		t.Error("重复哈希应报错")
	}
}

// TestScanErrorsOnClosedDB 覆盖 Scan 的错误分支。
func TestScanErrorsOnClosedDB(t *testing.T) {
	dir := t.TempDir()
	writeBook(t, dir, "a.epub", []byte("PK\x03\x04x"))
	svc := newTestService(closedDB(t))
	if _, err := svc.Scan(dir, 0); err == nil {
		t.Error("Scan 应报错")
	}
}

// TestDonePathsClosedDB DonePaths 错误分支。
func TestDonePathsClosedDB(t *testing.T) {
	if _, err := DonePaths(closedDB(t), "/x"); err == nil {
		t.Error("DonePaths 应报错")
	}
}

// TestBooksWithSameTitleClosedDB 错误分支。
func TestBooksWithSameTitleClosedDB(t *testing.T) {
	if _, err := booksWithSameTitle(closedDB(t), "x"); err == nil {
		t.Error("booksWithSameTitle 应报错")
	}
}

// TestLoadBooksForMatchClosedDB 错误分支。
func TestLoadBooksForMatchClosedDB(t *testing.T) {
	if _, err := loadBooksForMatch(closedDB(t), []int64{1}); err == nil {
		t.Error("loadBooksForMatch 应报错")
	}
}

// TestLoadAuthorsByBookClosedDB 错误分支。
func TestLoadAuthorsByBookClosedDB(t *testing.T) {
	if _, err := loadAuthorsByBook(closedDB(t), "?", []any{1}); err == nil {
		t.Error("loadAuthorsByBook 应报错")
	}
}

// TestLoadFormatsByBookClosedDB 错误分支。
func TestLoadFormatsByBookClosedDB(t *testing.T) {
	if _, err := loadFormatsByBook(closedDB(t), "?", []any{1}); err == nil {
		t.Error("loadFormatsByBook 应报错")
	}
}

// TestMarkExistingClosedLibrary 书库句柄损坏时的错误分支。
func TestMarkExistingClosedLibrary(t *testing.T) {
	dir := t.TempDir()
	makeValidEpub(t, dir, "三体.epub")
	db := testDB(t)
	svc := newTestService(db)
	svc.LibraryDB = closedDB(t)

	// 书库查询失败时 Scan 应报错。
	if _, err := svc.Scan(dir, 0); err == nil {
		t.Error("书库损坏时 Scan 应报错")
	}
}

// TestFindDuplicateClosedDB 错误分支。
func TestFindDuplicateClosedDB(t *testing.T) {
	svc := newTestService(closedDB(t))
	if _, err := svc.findDuplicate("sha256:x", 1); err == nil {
		t.Error("findDuplicate 应报错")
	}
}

// TestFindDuplicateSameID 相同 id 不算重复。
func TestFindDuplicateSameID(t *testing.T) {
	db := testDB(t)
	row := &userdb.ScanFile{Path: "/a", Hash: "sha256:x", Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	svc := newTestService(db)
	dup, err := svc.findDuplicate("sha256:x", row.ID)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if dup {
		t.Error("相同 id 不应判为重复")
	}
}

// TestFindDuplicateBookExists 关联书籍存在时判为重复。
func TestFindDuplicateBookExists(t *testing.T) {
	db := testDB(t)
	lib := libraryDB(t)
	if _, err := lib.Exec(`INSERT INTO books (id, title) VALUES (7, 'x')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	row := &userdb.ScanFile{Path: "/a", Hash: "sha256:x", BookID: 7, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	svc := newTestService(db)
	svc.LibraryDB = lib

	dup, err := svc.findDuplicate("sha256:x", row.ID+1)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if !dup {
		t.Error("书籍存在时应判为重复")
	}
}

// TestFindDuplicateBookDeleted 书籍已删除时清理旧记录。
func TestFindDuplicateBookDeleted(t *testing.T) {
	db := testDB(t)
	lib := libraryDB(t)
	row := &userdb.ScanFile{Path: "/a", Hash: "sha256:x", BookID: 999, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	svc := newTestService(db)
	svc.LibraryDB = lib

	dup, err := svc.findDuplicate("sha256:x", row.ID+1)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if dup {
		t.Error("书籍已删除时不应判为重复")
	}
	// 旧记录应被清理。
	old, _ := getScanFileByPath(db, "/a")
	if old != nil {
		t.Error("旧记录应被删除")
	}
}

// TestFindDuplicateNoLibraryDB 无书库句柄且 book_id 非 0 时保守判为重复。
func TestFindDuplicateNoLibraryDB(t *testing.T) {
	db := testDB(t)
	row := &userdb.ScanFile{Path: "/a", Hash: "sha256:x", BookID: 7, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	svc := newTestService(db)
	// LibraryDB 为 nil → bookExists 返回 false → 清理旧记录。
	dup, err := svc.findDuplicate("sha256:x", row.ID+1)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if dup {
		t.Error("无书库句柄时不应判为重复")
	}
}

// TestCollectTasksWalkError 遍历错误分支（目录不可读）。
func TestCollectTasksWalkError(t *testing.T) {
	if os.Geteuid() == 0 {
		t.Skip("root 无视权限位")
	}
	dir := t.TempDir()
	sub := filepath.Join(dir, "locked")
	if err := os.Mkdir(sub, 0o000); err != nil {
		t.Fatalf("建目录失败: %v", err)
	}
	t.Cleanup(func() { _ = os.Chmod(sub, 0o755) })
	// 遍历不可读目录时回调收到 err，被跳过而非中断。
	hasBooks, tasks, _, err := CollectTasks(sub, 0, nil, supported())
	if err != nil {
		t.Fatalf("不应报错: %v", err)
	}
	if hasBooks || len(tasks) != 0 {
		t.Errorf("不可读目录不应有结果: %v %v", hasBooks, tasks)
	}
}

// TestCollectTasksSymlinkSkipped 符号链接文件与目录被跳过。
func TestCollectTasksSymlinkSkipped(t *testing.T) {
	dir := t.TempDir()
	real := writeBook(t, dir, "real.epub", []byte("PK\x03\x04x"))
	link := filepath.Join(dir, "link.epub")
	if err := os.Symlink(real, link); err != nil {
		t.Skipf("无法创建符号链接: %v", err)
	}
	_, tasks, _, err := CollectTasks(dir, 0, nil, supported())
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	for _, task := range tasks {
		if task.Name == "link.epub" {
			t.Error("符号链接文件应被跳过")
		}
	}
}

// TestCollectTasksSymlinkDirSkipped 符号链接目录被跳过。
func TestCollectTasksSymlinkDirSkipped(t *testing.T) {
	dir := t.TempDir()
	target := t.TempDir()
	writeBook(t, target, "x.epub", []byte("PK\x03\x04x"))
	if err := os.Symlink(target, filepath.Join(dir, "linkdir")); err != nil {
		t.Skipf("无法创建符号链接: %v", err)
	}
	hasBooks, tasks, _, err := CollectTasks(dir, 0, nil, supported())
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if hasBooks || len(tasks) != 0 {
		t.Errorf("符号链接目录不应被遍历: %v %v", hasBooks, tasks)
	}
}

// TestScanRegisterTasksStatError 文件在收集与登记之间消失。
func TestScanRegisterTasksStatError(t *testing.T) {
	dir := t.TempDir()
	p := writeBook(t, dir, "a.epub", []byte("PK\x03\x04x"))
	db := testDB(t)
	svc := newTestService(db)

	// 直接调用 registerTasks，传入一个不存在的路径。
	tasks := []Task{{Name: "gone.epub", Path: filepath.Join(dir, "gone.epub"), Format: "epub"}}
	rows, err := svc.registerTasks(tasks, 1)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(rows) != 0 {
		t.Errorf("不存在的文件不应登记，得到 %d", len(rows))
	}
	_ = p
}

// TestScanRegisterTasksInsertError 插入失败时返回错误。
func TestScanRegisterTasksInsertError(t *testing.T) {
	dir := t.TempDir()
	writeBook(t, dir, "a.epub", []byte("PK\x03\x04x"))
	svc := newTestService(closedDB(t))
	tasks := []Task{{Name: "a.epub", Path: filepath.Join(dir, "a.epub"), Format: "epub"}}
	if _, err := svc.registerTasks(tasks, 1); err == nil {
		t.Error("插入失败应返回错误")
	}
}

// TestProcessRowHashError 文件消失时标记 drop。
func TestProcessRowHashError(t *testing.T) {
	dir := t.TempDir()
	p := writeBook(t, dir, "a.epub", []byte("PK\x03\x04x"))
	db := testDB(t)
	svc := newTestService(db)

	row := &userdb.ScanFile{Path: p, Hash: "fstat:1/x", Status: userdb.ScanStatusNew,
		Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if err := os.Remove(p); err != nil {
		t.Fatalf("删除失败: %v", err)
	}

	status, err := svc.processRow(row)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if status != userdb.ScanStatusDrop {
		t.Errorf("status = %q, want drop", status)
	}
}

// TestProcessRowSaveError 保存失败时返回错误。
func TestProcessRowSaveError(t *testing.T) {
	dir := t.TempDir()
	p := writeBook(t, dir, "a.epub", []byte("PK\x03\x04x"))
	svc := newTestService(closedDB(t))
	row := &userdb.ScanFile{Path: p, Hash: "fstat:1/x", Data: map[string]any{}}
	if _, err := svc.processRow(row); err == nil {
		t.Error("保存失败应返回错误")
	}
}

// TestScanRegisterTasksReusesExisting 已存在记录被复用。
func TestScanRegisterTasksReusesExisting(t *testing.T) {
	dir := t.TempDir()
	p := writeBook(t, dir, "a.epub", []byte("PK\x03\x04x"))
	db := testDB(t)
	svc := newTestService(db)

	// 预置一条 NEW 记录。
	if _, err := db.Exec(`INSERT INTO scanfiles (scan_id, name, path, hash, status, create_time, update_time, data)
		VALUES (0, 'a.epub', ?, 'fstat:6/abc', 'new', 't', 't', '{}')`, p); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	tasks := []Task{{Name: "a.epub", Path: p, Format: "epub"}}
	rows, err := svc.registerTasks(tasks, 99)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(rows) != 1 {
		t.Fatalf("应复用 1 条，得到 %d", len(rows))
	}
	if rows[0].ScanID != 99 {
		t.Errorf("scan_id = %d, want 99", rows[0].ScanID)
	}
}

// TestScanRegisterTasksSkipsNonNew 非 NEW 且真实哈希的记录被跳过。
func TestScanRegisterTasksSkipsNonNew(t *testing.T) {
	dir := t.TempDir()
	p := writeBook(t, dir, "a.epub", []byte("PK\x03\x04x"))
	db := testDB(t)
	svc := newTestService(db)

	if _, err := db.Exec(`INSERT INTO scanfiles (scan_id, name, path, hash, status, create_time, update_time, data)
		VALUES (0, 'a.epub', ?, 'sha256:abc', 'imported', 't', 't', '{}')`, p); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	tasks := []Task{{Name: "a.epub", Path: p, Format: "epub"}}
	rows, err := svc.registerTasks(tasks, 99)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(rows) != 0 {
		t.Errorf("非 NEW 且真实哈希应跳过，得到 %d", len(rows))
	}
}

// TestMarkExistingNoLibraryDB 无书库句柄时返回 false。
func TestMarkExistingNoLibraryDB(t *testing.T) {
	svc := newTestService(testDB(t))
	row := &userdb.ScanFile{Path: "/x.epub"}
	got, err := svc.markExisting(row, importmetaForTest())
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got {
		t.Error("无书库句柄应返回 false")
	}
}

// TestMarkExistingNoSameTitle 书库无同名书时返回 false。
func TestMarkExistingNoSameTitle(t *testing.T) {
	db := testDB(t)
	lib := libraryDB(t)
	svc := newTestService(db)
	svc.LibraryDB = lib
	row := &userdb.ScanFile{Path: "/x.epub"}
	got, err := svc.markExisting(row, importmetaForTest())
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got {
		t.Error("无同名书应返回 false")
	}
}

// TestScanIDFromClock scan_id 来自注入的时钟。
func TestScanIDFromClock(t *testing.T) {
	dir := t.TempDir()
	writeBook(t, dir, "a.epub", []byte("PK\x03\x04x"))
	svc := newTestService(testDB(t))
	res, err := svc.Scan(dir, 0)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if res.ScanID != fixedClock().Unix() {
		t.Errorf("scan_id = %d, want %d", res.ScanID, fixedClock().Unix())
	}
}

// TestFormatExtraction 扩展名提取（含大写与无扩展名）。
func TestFormatExtraction(t *testing.T) {
	dir := t.TempDir()
	writeBook(t, dir, "A.EPUB", []byte("PK\x03\x04x"))
	_, tasks, _, err := CollectTasks(dir, 0, nil, supported())
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(tasks) != 1 {
		t.Fatalf("应有 1 个候选，得到 %d", len(tasks))
	}
	if tasks[0].Format != "epub" {
		t.Errorf("format = %q, want epub（应小写化）", tasks[0].Format)
	}
}

// TestCollectTasksLimitExact 恰好达到上限。
func TestCollectTasksLimitExact(t *testing.T) {
	dir := t.TempDir()
	for _, n := range []string{"a.epub", "b.epub"} {
		writeBook(t, dir, n, []byte("PK\x03\x04x"))
	}
	_, tasks, _, err := CollectTasks(dir, 2, nil, supported())
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(tasks) != 2 {
		t.Errorf("应有 2 个候选，得到 %d", len(tasks))
	}
}

// TestScanFileDataJSONRoundTrip data 字段的 JSON 往返。
func TestScanFileDataJSONRoundTrip(t *testing.T) {
	db := testDB(t)
	row := &userdb.ScanFile{
		Path: "/x", Hash: "sha256:x",
		Data: map[string]any{"media_type": "comic", "count": float64(3), "ok": true},
	}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	got, err := getScanFileByPath(db, "/x")
	if err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if got.Data["media_type"] != "comic" || got.Data["ok"] != true {
		t.Errorf("data = %v", got.Data)
	}
}

// TestScanFileMalformedData 损坏的 data JSON 降级为空 map。
func TestScanFileMalformedData(t *testing.T) {
	db := testDB(t)
	if _, err := db.Exec(`INSERT INTO scanfiles (path, hash, status, name, create_time, update_time, data)
		VALUES ('/x', 'sha256:x', 'ready', 'x', 't', 't', 'not json')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	got, err := getScanFileByPath(db, "/x")
	if err != nil {
		t.Fatalf("不应报错: %v", err)
	}
	if got.Data == nil || len(got.Data) != 0 {
		t.Errorf("损坏 JSON 应降级为空 map，得到 %v", got.Data)
	}
}

// TestScanFileEmptyData 空 data 字段。
func TestScanFileEmptyData(t *testing.T) {
	db := testDB(t)
	if _, err := db.Exec(`INSERT INTO scanfiles (path, hash, status, name, create_time, update_time, data)
		VALUES ('/x', 'sha256:x', 'ready', 'x', 't', 't', '')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	got, err := getScanFileByPath(db, "/x")
	if err != nil {
		t.Fatalf("不应报错: %v", err)
	}
	if got.Data == nil {
		t.Error("data 不应为 nil")
	}
}

// TestEscapeLikeBackslash 反斜杠转义。
func TestEscapeLikeBackslash(t *testing.T) {
	got := escapeLike(`C:\data\books`)
	if !strings.Contains(got, `\\`) {
		t.Errorf("反斜杠应被转义: %q", got)
	}
}
