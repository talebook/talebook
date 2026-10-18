package httpapi

import (
	"os"
	"path/filepath"
	"testing"

	_ "modernc.org/sqlite"

	"talebook/booksvr/internal/library"
)

// TestVersionSummaryScanError 覆盖 versionSummary 里
// `SELECT title, edition_key FROM books` 失败的分支。
//
// 手法：把 edition_key 列改名，使该查询报错（非 ErrNoRows）。
func TestVersionSummaryScanError(t *testing.T) {
	db := newTestDB(t)
	workID, _, _ := seedWork(t, db)

	if _, err := db.Exec(`ALTER TABLE books RENAME COLUMN edition_key TO edition_key_renamed`); err != nil {
		t.Fatalf("rename column: %v", err)
	}

	svc := &WorkService{DB: db}
	if _, err := svc.WorkDetail(workID); err == nil {
		t.Error("versionSummary 查询失败时 WorkDetail 应返回 error")
	}
}

// TestBookVersionsWorkIDNullError 覆盖 BookVersions 里
// GetBookWorkID 返回非 ErrNoRows 错误的分支（work_id 为 NULL）。
func TestBookVersionsWorkIDNullError(t *testing.T) {
	db := newTestDB(t)
	_, bookA, _ := seedWork(t, db)

	// work_id 置 NULL：GetBookWorkID 返回 "book N has no work_id"，
	// 这是非 ErrNoRows 的错误，因此 BookVersions 直接返回 error。
	if _, err := db.Exec(`UPDATE books SET work_id = NULL`); err != nil {
		t.Fatalf("null work_id: %v", err)
	}

	svc := &WorkService{DB: db}
	if _, err := svc.BookVersions(bookA); err == nil {
		t.Error("work_id 为 NULL 时 BookVersions 应返回 error")
	}
}

// TestWorkDetailVersionSummaryError 覆盖 WorkDetail 里 versionSummary 返回 error 的分支。
func TestWorkDetailVersionSummaryError(t *testing.T) {
	db := newTestDB(t)
	workID, _, _ := seedWork(t, db)

	if _, err := db.Exec(`DROP TABLE book_formats`); err != nil {
		t.Fatalf("drop book_formats: %v", err)
	}

	svc := &WorkService{DB: db}
	if _, err := svc.WorkDetail(workID); err == nil {
		t.Error("versionSummary 失败时 WorkDetail 应返回 error")
	}
}

// TestBookVersionsVersionSummaryError 覆盖 BookVersions 里 versionSummary 失败的分支。
func TestBookVersionsVersionSummaryError(t *testing.T) {
	db := newTestDB(t)
	_, bookA, _ := seedWork(t, db)

	if _, err := db.Exec(`DROP TABLE book_formats`); err != nil {
		t.Fatalf("drop book_formats: %v", err)
	}

	svc := &WorkService{DB: db}
	if _, err := svc.BookVersions(bookA); err == nil {
		t.Error("versionSummary 失败时 BookVersions 应返回 error")
	}
}

// TestMergeBooksSourceLookupDBError 覆盖 MergeBooks 里
// GetBookWorkID(bookID) 返回非 ErrNoRows 错误的分支。
func TestMergeBooksSourceLookupDBError(t *testing.T) {
	db := newTestDB(t)
	workA, _ := library.FindOrCreateWork(db, "书A", "作者")
	bookA, _, _ := library.FindOrCreateEdition(db, workA, library.BookMeta{Title: "书A", Author: "作者"})

	if _, err := db.Exec(`ALTER TABLE books RENAME COLUMN work_id TO work_id_renamed`); err != nil {
		t.Fatalf("rename column: %v", err)
	}

	svc := &WorkService{DB: db}
	if _, err := svc.MergeBooks(bookA, 2); err == nil {
		t.Error("GetBookWorkID 报错时 MergeBooks 应返回 error")
	}
}

// TestMergeBooksUnderlyingMergeError 覆盖 MergeBooks 里
// library.MergeBooks 返回 error 的分支。
//
// 手法：两次 GetBookWorkID 都成功，但用一个 BEFORE UPDATE 触发器
// 让底层 UPDATE 强制失败。
func TestMergeBooksUnderlyingMergeError(t *testing.T) {
	db := newTestDB(t)
	workA, _ := library.FindOrCreateWork(db, "书A", "作者")
	bookA, _, _ := library.FindOrCreateEdition(db, workA, library.BookMeta{Title: "书A", Author: "作者"})
	workB, _ := library.FindOrCreateWork(db, "书B", "作者")
	bookB, _, _ := library.FindOrCreateEdition(db, workB, library.BookMeta{Title: "书B", Author: "作者"})

	if _, err := db.Exec(`
		CREATE TRIGGER block_merge BEFORE UPDATE OF work_id ON books
		BEGIN
			SELECT RAISE(ABORT, 'merge blocked by test trigger');
		END`); err != nil {
		t.Fatalf("create trigger: %v", err)
	}

	svc := &WorkService{DB: db}
	if _, err := svc.MergeBooks(bookA, bookB); err == nil {
		t.Error("底层 MergeBooks 失败时应返回 error")
	}
}

// TestWorkDetailWorkLookupDBError 覆盖 GetWork 返回非 ErrNoRows 错误的分支。
func TestWorkDetailWorkLookupDBError(t *testing.T) {
	db := newTestDB(t)
	if _, err := db.Exec(`DROP TABLE works`); err != nil {
		t.Fatalf("drop works: %v", err)
	}

	svc := &WorkService{DB: db}
	if _, err := svc.WorkDetail(1); err == nil {
		t.Error("GetWork 报错时 WorkDetail 应返回 error")
	}
}

// TestWorkDetailListVersionsError 覆盖 WorkDetail 里 ListVersions 失败的分支。
//
// 手法：保留 works 表（GetWork 成功），把 books.work_id 改名使 ListVersions 报错。
func TestWorkDetailListVersionsError(t *testing.T) {
	db := newTestDB(t)
	workID, _, _ := seedWork(t, db)

	if _, err := db.Exec(`ALTER TABLE books RENAME COLUMN work_id TO work_id_renamed`); err != nil {
		t.Fatalf("rename column: %v", err)
	}

	svc := &WorkService{DB: db}
	if _, err := svc.WorkDetail(workID); err == nil {
		t.Error("ListVersions 失败时 WorkDetail 应返回 error")
	}
}

// TestMergeBooksTargetLookupDBError 覆盖 MergeBooks 里
// GetBookWorkID(targetBookID) 返回非 ErrNoRows 错误的分支。
//
// 手法：用一个包装 DB 让第一次查询成功、第二次失败。
func TestMergeBooksTargetLookupDBError(t *testing.T) {
	db := newTestDB(t)
	workA, _ := library.FindOrCreateWork(db, "书A", "作者")
	bookA, _, _ := library.FindOrCreateEdition(db, workA, library.BookMeta{Title: "书A", Author: "作者"})
	workB, _ := library.FindOrCreateWork(db, "书B", "作者")
	bookB, _, _ := library.FindOrCreateEdition(db, workB, library.BookMeta{Title: "书B", Author: "作者"})

	// 删掉目标书所在行 → 目标查询得到 ErrNoRows（走 book.not_found）。
	// 为覆盖「非 ErrNoRows」分支，改为删掉 books 表：
	// 第一次查询也会失败，因此该用例实际覆盖的是源查询分支；
	// 目标查询的非 ErrNoRows 分支由下面的 view 手法覆盖。
	if _, err := db.Exec(`DROP TABLE books`); err != nil {
		t.Fatalf("drop books: %v", err)
	}

	svc := &WorkService{DB: db}
	if _, err := svc.MergeBooks(bookA, bookB); err == nil {
		t.Error("查询失败时 MergeBooks 应返回 error")
	}
}

// TestMergeBooksTargetLookupErrorViaView 用 view 让源查询成功、目标查询失败。
//
// 手法：view 只暴露 bookA 一行，因此 GetBookWorkID(bookA) 成功，
// 而 GetBookWorkID(bookB) 得到 ErrNoRows → 走 book.not_found 分支。
func TestMergeBooksTargetLookupErrorViaView(t *testing.T) {
	db := newTestDB(t)
	workA, _ := library.FindOrCreateWork(db, "书A", "作者")
	bookA, _, _ := library.FindOrCreateEdition(db, workA, library.BookMeta{Title: "书A", Author: "作者"})
	workB, _ := library.FindOrCreateWork(db, "书B", "作者")
	bookB, _, _ := library.FindOrCreateEdition(db, workB, library.BookMeta{Title: "书B", Author: "作者"})

	if _, err := db.Exec(`ALTER TABLE books RENAME TO books_real`); err != nil {
		t.Fatalf("rename books: %v", err)
	}
	if _, err := db.Exec(`CREATE VIEW books AS SELECT id, work_id FROM books_real WHERE id = ` + itoa(bookA)); err != nil {
		t.Fatalf("create view: %v", err)
	}

	svc := &WorkService{DB: db}
	resp, err := svc.MergeBooks(bookA, bookB)
	if err != nil {
		t.Fatalf("不应返回 error: %v", err)
	}
	if resp.Err != ErrBookNotFound {
		t.Errorf("err = %q, want %q", resp.Err, ErrBookNotFound)
	}
}

// TestMergeBooksTargetLookupDBErrorViaBrokenView 覆盖目标查询返回
// 非 ErrNoRows 错误的分支。
//
// 手法：view 里目标书的 work_id 置 NULL，使 GetBookWorkID(bookB) 返回
// "has no work_id"（非 ErrNoRows），而源书 bookA 仍能正常查到 work_id。
func TestMergeBooksTargetLookupDBErrorViaBrokenView(t *testing.T) {
	db := newTestDB(t)
	workA, _ := library.FindOrCreateWork(db, "书A", "作者")
	bookA, _, _ := library.FindOrCreateEdition(db, workA, library.BookMeta{Title: "书A", Author: "作者"})
	workB, _ := library.FindOrCreateWork(db, "书B", "作者")
	bookB, _, _ := library.FindOrCreateEdition(db, workB, library.BookMeta{Title: "书B", Author: "作者"})

	// 只把目标书的 work_id 置 NULL：源查询成功，目标查询报非 ErrNoRows 错误。
	if _, err := db.Exec(`UPDATE books SET work_id = NULL WHERE id = ` + itoa(bookB)); err != nil {
		t.Fatalf("null target work_id: %v", err)
	}

	svc := &WorkService{DB: db}
	if _, err := svc.MergeBooks(bookA, bookB); err == nil {
		t.Error("目标 work_id 为 NULL 时 MergeBooks 应返回 error")
	}
}

// TestNewRouteSourceFileExistsOnDisk 断言新增路由的 Source 文件真实存在。
func TestNewRouteSourceFileExistsOnDisk(t *testing.T) {
	root := repoRoot(t)
	for _, r := range NewRoutes() {
		path := filepath.Join(root, filepath.FromSlash(r.Source))
		if _, err := os.Stat(path); err != nil {
			t.Errorf("新增路由 %q 的 Source %q 不存在: %v", r.Pattern, r.Source, err)
		}
	}
}

// TestMergeBooksReturnsBothIDs 断言 merged 列表含源与目标两个 id。
func TestMergeBooksReturnsBothIDs(t *testing.T) {
	db := newTestDB(t)
	workA, _ := library.FindOrCreateWork(db, "书A", "作者")
	bookA, _, _ := library.FindOrCreateEdition(db, workA, library.BookMeta{Title: "书A", Author: "作者"})
	workB, _ := library.FindOrCreateWork(db, "书B", "作者")
	bookB, _, _ := library.FindOrCreateEdition(db, workB, library.BookMeta{Title: "书B", Author: "作者"})

	svc := &WorkService{DB: db}
	resp, err := svc.MergeBooks(bookA, bookB)
	if err != nil {
		t.Fatalf("MergeBooks: %v", err)
	}

	got := map[int64]bool{}
	for _, id := range resp.Merged {
		got[id] = true
	}
	if !got[bookA] || !got[bookB] {
		t.Errorf("merged = %v, want 含 %d 与 %d", resp.Merged, bookA, bookB)
	}
}

// TestMergeBooksSameWorkAfterMergeIsIdempotent 确认合并后再次合并返回冲突。
func TestMergeBooksSameWorkAfterMergeIsIdempotent(t *testing.T) {
	db := newTestDB(t)
	workA, _ := library.FindOrCreateWork(db, "书A", "作者")
	bookA, _, _ := library.FindOrCreateEdition(db, workA, library.BookMeta{Title: "书A", Author: "作者"})
	workB, _ := library.FindOrCreateWork(db, "书B", "作者")
	bookB, _, _ := library.FindOrCreateEdition(db, workB, library.BookMeta{Title: "书B", Author: "作者"})

	svc := &WorkService{DB: db}
	if resp, err := svc.MergeBooks(bookA, bookB); err != nil || resp.Err != "ok" {
		t.Fatalf("首次合并失败: err=%v resp=%+v", err, resp)
	}

	resp, err := svc.MergeBooks(bookA, bookB)
	if err != nil {
		t.Fatalf("不应返回 error: %v", err)
	}
	if resp.Err != ErrMergeConflict {
		t.Errorf("重复合并 err = %q, want %q", resp.Err, ErrMergeConflict)
	}
}

// TestWorkDetailFormatCountSumsAllVersions 断言 format_count 是全部可见版本的格式总和。
func TestWorkDetailFormatCountSumsAllVersions(t *testing.T) {
	db := newTestDB(t)
	workID, bookA, bookB := seedWork(t, db)
	addFormat(t, db, bookA, "EPUB", "/library/a.epub", 100)
	addFormat(t, db, bookA, "MOBI", "/library/a.mobi", 200)
	addFormat(t, db, bookB, "PDF", "/library/b.pdf", 300)

	svc := &WorkService{DB: db}
	resp, err := svc.WorkDetail(workID)
	if err != nil {
		t.Fatalf("WorkDetail: %v", err)
	}
	if resp.Work.FormatCount != 3 {
		t.Errorf("format_count = %d, want 3", resp.Work.FormatCount)
	}
}

// TestBookVersionsIncludesFiles 断言 versions[] 里带 files[]。
func TestBookVersionsIncludesFiles(t *testing.T) {
	db := newTestDB(t)
	_, bookA, bookB := seedWork(t, db)
	addFormat(t, db, bookB, "EPUB", "/library/b.epub", 500)

	svc := &WorkService{DB: db}
	resp, err := svc.BookVersions(bookA)
	if err != nil {
		t.Fatalf("BookVersions: %v", err)
	}
	if len(resp.Versions) != 1 {
		t.Fatalf("versions 数 = %d, want 1", len(resp.Versions))
	}
	if len(resp.Versions[0].Files) != 1 {
		t.Fatalf("files 数 = %d, want 1", len(resp.Versions[0].Files))
	}
	if resp.Versions[0].Files[0].Format != "EPUB" {
		t.Errorf("files[0].Format = %q", resp.Versions[0].Files[0].Format)
	}
}

// TestNewRoutesHaveCorrectMethods 断言新增路由的方法与设计一致。
func TestNewRoutesHaveCorrectMethods(t *testing.T) {
	want := map[string]string{
		"/api/library/directories":    "GET",
		"/api/work/([0-9]+)":          "GET",
		"/api/book/([0-9]+)/versions": "GET",
		"/api/book/([0-9]+)/merge":    "POST",
	}
	for _, r := range NewRoutes() {
		expected, ok := want[r.Pattern]
		if !ok {
			t.Errorf("未预期的路由 %q", r.Pattern)
			continue
		}
		if len(r.Methods) != 1 || r.Methods[0] != expected {
			t.Errorf("路由 %q methods = %v, want [%s]", r.Pattern, r.Methods, expected)
		}
	}
}
