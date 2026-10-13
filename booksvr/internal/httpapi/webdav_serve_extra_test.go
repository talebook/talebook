package httpapi

import (
	"database/sql"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// newWebDAVBookFixture 建一个带真实书籍的 WebDAV 夹具。
func newWebDAVBookFixture(t *testing.T) (*webdavService, *sql.DB, string) {
	t.Helper()
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	createFormatTables(t, db)
	root := t.TempDir()
	return newWebDAVService(db, db, map[string]any{}, root), db, root
}

// seedDAVBook 插入一本带真实格式文件的书。
func seedDAVBook(t *testing.T, db *sql.DB, dir string, bookID int64, title string) string {
	t.Helper()
	insertBook(t, db, bookID, title)
	insertItem(t, db, bookID, "public", 1)
	path := filepath.Join(dir, title+".epub")
	if err := os.WriteFile(path, []byte("PK\x03\x04body"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := registerDAVFormat(db, bookID, "EPUB", path); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO data (book, format, uncompressed_size, name)
		VALUES (?, 'EPUB', 6, ?)`, bookID, filepath.Base(path)); err != nil {
		t.Fatal(err)
	}
	return path
}

// registerDAVFormat 登记格式。
func registerDAVFormat(db *sql.DB, bookID int64, format, path string) error {
	_, err := db.Exec(`INSERT INTO book_formats (book_id, format, path, size, mtime)
		VALUES (?, ?, ?, 6, 0)`, bookID, format, path)
	return err
}

// TestWebDAVBookTitle 覆盖书名读取。
func TestWebDAVBookTitle(t *testing.T) {
	svc, db, _ := newWebDAVBookFixture(t)
	insertBook(t, db, 1, "三体")
	if got := svc.bookTitle(1); got != "三体" {
		t.Errorf("bookTitle = %q，期望 三体", got)
	}
}

// TestWebDAVBookTitleMissing 覆盖书名缺失回落。
func TestWebDAVBookTitleMissing(t *testing.T) {
	svc, _, _ := newWebDAVBookFixture(t)
	if got := svc.bookTitle(999); got != "book-999" {
		t.Errorf("bookTitle = %q，期望 book-999", got)
	}
}

// TestWebDAVCanView 覆盖可见性判定。
func TestWebDAVCanView(t *testing.T) {
	svc, db, _ := newWebDAVBookFixture(t)
	insertBook(t, db, 1, "书")
	insertItem(t, db, 1, "public", 1)

	ctx := &Context{Identity: Identity{UserID: 1, IsAdmin: true}}
	if !svc.canView(ctx, 1) {
		t.Error("管理员应可见")
	}
}

// TestWebDAVNamedMembers 覆盖标签 / 作者列举。
func TestWebDAVNamedMembers(t *testing.T) {
	svc, db, _ := newWebDAVBookFixture(t)
	if _, err := db.Exec(`INSERT INTO tags (id, name) VALUES (1, '科幻')`); err != nil {
		t.Fatal(err)
	}

	ctx := &Context{Identity: Identity{UserID: 1}}
	members := svc.namedMembers(ctx, "tags", "标签")
	if len(members) != 1 || members[0].Name != "科幻" {
		t.Fatalf("members = %+v，期望 1 项「科幻」", members)
	}
}

// TestWebDAVBookMembers 覆盖书籍文件列举。
func TestWebDAVBookMembers(t *testing.T) {
	svc, db, dir := newWebDAVBookFixture(t)
	seedDAVBook(t, db, dir, 1, "三体")

	ctx := &Context{Identity: Identity{UserID: 1, IsAdmin: true}}
	members := svc.bookMembers(ctx, "最新", "")
	if len(members) != 1 {
		t.Fatalf("members 数 = %d，期望 1", len(members))
	}
	if !strings.HasPrefix(members[0].Name, "1-三体") {
		t.Errorf("文件名 = %q，期望以 1-三体 开头", members[0].Name)
	}
}

// TestWebDAVBookIDsForRecent 覆盖「最新」分类。
func TestWebDAVBookIDsForRecent(t *testing.T) {
	svc, db, _ := newWebDAVBookFixture(t)
	insertBook(t, db, 1, "书")

	ctx := &Context{Identity: Identity{UserID: 1, IsAdmin: true}}
	ids := svc.bookIDsFor(ctx, "最新", "")
	if len(ids) != 1 || ids[0] != 1 {
		t.Errorf("ids = %v，期望 [1]", ids)
	}
}

// TestWebDAVBookIDsForTags 覆盖标签分类。
func TestWebDAVBookIDsForTags(t *testing.T) {
	svc, db, _ := newWebDAVBookFixture(t)
	insertBook(t, db, 1, "书")
	if _, err := db.Exec(`INSERT INTO tags (id, name) VALUES (1, '科幻')`); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO books_tags_link (book, tag) VALUES (1, 1)`); err != nil {
		t.Fatal(err)
	}

	ctx := &Context{Identity: Identity{UserID: 1, IsAdmin: true}}
	ids := svc.bookIDsFor(ctx, "标签", "科幻")
	if len(ids) != 1 {
		t.Errorf("ids = %v，期望 1 项", ids)
	}
}

// TestWebDAVBookIDsForAuthors 覆盖作者分类。
func TestWebDAVBookIDsForAuthors(t *testing.T) {
	svc, db, _ := newWebDAVBookFixture(t)
	insertBook(t, db, 1, "书")
	if _, err := db.Exec(`INSERT INTO authors (id, name, sort) VALUES (1, '刘慈欣', '刘慈欣')`); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO books_authors_link (book, author) VALUES (1, 1)`); err != nil {
		t.Fatal(err)
	}

	ctx := &Context{Identity: Identity{UserID: 1, IsAdmin: true}}
	ids := svc.bookIDsFor(ctx, "作者", "刘慈欣")
	if len(ids) != 1 {
		t.Errorf("ids = %v，期望 1 项", ids)
	}
}

// TestWebDAVReadingStateIDs 覆盖阅读状态分类。
func TestWebDAVReadingStateIDs(t *testing.T) {
	svc, db, _ := newWebDAVBookFixture(t)
	insertBook(t, db, 1, "书")
	if _, err := db.Exec(`INSERT INTO reading_state
		(reader_id, book_id, read_state, favorite, wants, online_read, download)
		VALUES (1, 1, 2, 1, 1, 0, 0)`); err != nil {
		t.Fatal(err)
	}

	ctx := &Context{Identity: Identity{UserID: 1}}
	for _, kind := range []string{"favorite", "wants", "read_done"} {
		if ids := svc.readingStateIDs(ctx, kind); len(ids) != 1 {
			t.Errorf("%s ids = %v，期望 1 项", kind, ids)
		}
	}
	if ids := svc.readingStateIDs(ctx, "unknown"); ids != nil {
		t.Errorf("未知 kind 应返回 nil，实际 %v", ids)
	}
}

// TestWebDAVReadingStateIDsGuest 覆盖游客无阅读状态。
func TestWebDAVReadingStateIDsGuest(t *testing.T) {
	svc, _, _ := newWebDAVBookFixture(t)
	ctx := &Context{Identity: Identity{UserID: 0}}
	if ids := svc.readingStateIDs(ctx, "favorite"); ids != nil {
		t.Errorf("游客应返回 nil，实际 %v", ids)
	}
}

// TestWebDAVResolveBookFile 覆盖书籍文件解析。
func TestWebDAVResolveBookFile(t *testing.T) {
	svc, db, dir := newWebDAVBookFixture(t)
	seedDAVBook(t, db, dir, 1, "三体")

	ctx := &Context{Identity: Identity{UserID: 1, IsAdmin: true}}
	res := svc.resolveBookFile(ctx, "最新", "", "1-三体.epub")
	if res == nil {
		t.Fatal("应解析出书籍文件")
	}
	if res.IsDir {
		t.Error("书籍文件不应是目录")
	}
}

// TestWebDAVResolveBookFileMissing 覆盖书籍文件不存在。
func TestWebDAVResolveBookFileMissing(t *testing.T) {
	svc, _, _ := newWebDAVBookFixture(t)
	ctx := &Context{Identity: Identity{UserID: 1, IsAdmin: true}}
	if res := svc.resolveBookFile(ctx, "最新", "", "999-x.epub"); res != nil {
		t.Errorf("不存在的书应返回 nil，实际 %+v", res)
	}
}

// TestWebDAVCategoryMembers 覆盖分类列举。
func TestWebDAVCategoryMembers(t *testing.T) {
	svc, db, dir := newWebDAVBookFixture(t)
	seedDAVBook(t, db, dir, 1, "三体")

	ctx := &Context{Identity: Identity{UserID: 1, IsAdmin: true}}
	members := svc.categoryMembers(ctx, "最新")
	if len(members) != 1 {
		t.Errorf("members 数 = %d，期望 1", len(members))
	}
}

// TestWebDAVPropfindBookSection 覆盖书籍分类的 PROPFIND。
func TestWebDAVPropfindBookSection(t *testing.T) {
	svc, db, dir := newWebDAVBookFixture(t)
	seedDAVBook(t, db, dir, 1, "三体")

	ctx, rec := davCtx("PROPFIND", "/books/最新/", 1, "")
	svc.Serve(ctx)
	if rec.Code != 207 {
		t.Fatalf("状态码 = %d，期望 207", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "三体") {
		t.Errorf("响应缺少书名: %s", rec.Body.String())
	}
}

// TestWebDAVGetBookFile 覆盖书籍文件下载。
func TestWebDAVGetBookFile(t *testing.T) {
	svc, db, dir := newWebDAVBookFixture(t)
	seedDAVBook(t, db, dir, 1, "三体")

	ctx, rec := davCtx(http.MethodGet, "/books/最新/1-三体.epub", 1, "")
	svc.Serve(ctx)
	if rec.Code != http.StatusOK {
		t.Fatalf("状态码 = %d，期望 200", rec.Code)
	}
	if rec.Body.String() != "PK\x03\x04body" {
		t.Errorf("内容 = %q", rec.Body.String())
	}
}

// TestWebDAVHeadBookFile 覆盖 HEAD 请求不返回正文。
func TestWebDAVHeadBookFile(t *testing.T) {
	svc, db, dir := newWebDAVBookFixture(t)
	seedDAVBook(t, db, dir, 1, "三体")

	ctx, rec := davCtx(http.MethodHead, "/books/最新/1-三体.epub", 1, "")
	svc.Serve(ctx)
	if rec.Code != http.StatusOK {
		t.Fatalf("状态码 = %d，期望 200", rec.Code)
	}
	if rec.Body.Len() != 0 {
		t.Errorf("HEAD 不应返回正文，实际 %d 字节", rec.Body.Len())
	}
}

// TestWebDAVGetMissingFile 覆盖文件不存在。
func TestWebDAVGetMissingFile(t *testing.T) {
	svc, _, _ := newWebDAVBookFixture(t)
	ctx, rec := davCtx(http.MethodGet, "/books/最新/999-x.epub", 1, "")
	svc.Serve(ctx)
	if rec.Code != http.StatusNotFound {
		t.Errorf("状态码 = %d，期望 404", rec.Code)
	}
}

// TestWebDAVMkcolRequiresLogin 覆盖未登录建目录被拒。
func TestWebDAVMkcolRequiresLogin(t *testing.T) {
	svc, _ := newWebDAVFixture(t)
	ctx, rec := davCtx("MKCOL", "/books/我的同步/x", 0, "")
	svc.Serve(ctx)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("状态码 = %d，期望 401", rec.Code)
	}
}

// TestWebDAVMkcolReadOnlySection 覆盖只读区建目录被拒。
func TestWebDAVMkcolReadOnlySection(t *testing.T) {
	svc, _ := newWebDAVFixture(t)
	ctx, rec := davCtx("MKCOL", "/books/分类/x", 1, "")
	svc.Serve(ctx)
	if rec.Code != http.StatusForbidden {
		t.Errorf("状态码 = %d，期望 403", rec.Code)
	}
}

// TestWebDAVDeleteReadOnlySection 覆盖只读区删除被拒。
func TestWebDAVDeleteReadOnlySection(t *testing.T) {
	svc, _ := newWebDAVFixture(t)
	ctx, rec := davCtx(http.MethodDelete, "/books/分类/x.txt", 1, "")
	svc.Serve(ctx)
	if rec.Code != http.StatusForbidden {
		t.Errorf("状态码 = %d，期望 403", rec.Code)
	}
}

// TestWebDAVResolveSyncGuest 覆盖游客访问同步目录被拒。
func TestWebDAVResolveSyncGuest(t *testing.T) {
	svc, _ := newWebDAVFixture(t)
	ctx := &Context{Identity: Identity{UserID: 0}}
	if res := svc.resolveSync(ctx, []string{"我的同步"}); res != nil {
		t.Errorf("游客应返回 nil，实际 %+v", res)
	}
}

// TestWebDAVResolveSyncRoot 覆盖同步目录根解析。
func TestWebDAVResolveSyncRoot(t *testing.T) {
	svc, _ := newWebDAVFixture(t)
	ctx := &Context{Identity: Identity{UserID: 1}}
	res := svc.resolveSync(ctx, []string{"我的同步"})
	if res == nil || !res.IsDir {
		t.Fatalf("同步目录根应存在且为目录，实际 %+v", res)
	}
}

// TestWebDAVResolveUnknownSection 覆盖未知分类。
func TestWebDAVResolveUnknownSection(t *testing.T) {
	svc, _ := newWebDAVFixture(t)
	ctx := &Context{Identity: Identity{UserID: 1}}
	if res := svc.resolve(ctx, "未知分类"); res != nil {
		t.Errorf("未知分类应返回 nil，实际 %+v", res)
	}
}

// TestWebDAVMembersUnknownSection 覆盖未知分类的成员列举。
func TestWebDAVMembersUnknownSection(t *testing.T) {
	svc, _ := newWebDAVFixture(t)
	ctx := &Context{Identity: Identity{UserID: 1}}
	if got := svc.members(ctx, "未知分类"); got != nil {
		t.Errorf("未知分类应返回 nil，实际 %v", got)
	}
}

// TestWebDAVMembersDeepPath 覆盖过深路径。
func TestWebDAVMembersDeepPath(t *testing.T) {
	svc, _ := newWebDAVFixture(t)
	ctx := &Context{Identity: Identity{UserID: 1}}
	if got := svc.members(ctx, "最新/a/b/c"); got != nil {
		t.Errorf("过深路径应返回 nil，实际 %v", got)
	}
	// 两级分类的第三层也不是目录。
	if got := svc.members(ctx, "标签/科幻/a/b"); got != nil {
		t.Errorf("两级分类过深路径应返回 nil，实际 %v", got)
	}
}

// TestWebDAVSyncMembersGuest 覆盖游客列举同步目录。
func TestWebDAVSyncMembersGuest(t *testing.T) {
	svc, _ := newWebDAVFixture(t)
	ctx := &Context{Identity: Identity{UserID: 0}}
	if got := svc.syncMembers(ctx, []string{"我的同步"}); got != nil {
		t.Errorf("游客应返回 nil，实际 %v", got)
	}
}

// TestWebDAVSyncMembersMissingDir 覆盖同步目录不存在。
func TestWebDAVSyncMembersMissingDir(t *testing.T) {
	svc, _ := newWebDAVFixture(t)
	ctx := &Context{Identity: Identity{UserID: 1}}
	if got := svc.syncMembers(ctx, []string{"我的同步", "nope"}); got != nil {
		t.Errorf("不存在的目录应返回 nil，实际 %v", got)
	}
}

// TestWebDAVResolveSyncTraversal 覆盖同步目录路径穿越。
func TestWebDAVResolveSyncTraversal(t *testing.T) {
	svc, _ := newWebDAVFixture(t)
	ctx := &Context{Identity: Identity{UserID: 1}}
	if res := svc.resolveSync(ctx, []string{"我的同步", "..", "..", "etc"}); res != nil {
		t.Errorf("路径穿越应返回 nil，实际 %+v", res)
	}
}

// TestWebDAVResolveRoot 覆盖根路径解析。
func TestWebDAVResolveRoot(t *testing.T) {
	svc, _ := newWebDAVFixture(t)
	ctx := &Context{Identity: Identity{UserID: 1}}
	res := svc.resolve(ctx, "/")
	if res == nil || !res.IsDir {
		t.Fatalf("根应为目录，实际 %+v", res)
	}
}

// TestWebDAVResolveSection 覆盖分类根解析。
func TestWebDAVResolveSection(t *testing.T) {
	svc, _ := newWebDAVFixture(t)
	ctx := &Context{Identity: Identity{UserID: 1}}
	res := svc.resolve(ctx, "最新")
	if res == nil || !res.IsDir {
		t.Fatalf("分类应为目录，实际 %+v", res)
	}
}

// TestWebDAVResolveCategory 覆盖二级分类解析。
func TestWebDAVResolveCategory(t *testing.T) {
	svc, _ := newWebDAVFixture(t)
	ctx := &Context{Identity: Identity{UserID: 1}}
	res := svc.resolve(ctx, "标签/科幻")
	if res == nil || !res.IsDir {
		t.Fatalf("二级分类应为目录，实际 %+v", res)
	}
}

// TestWebDAVPropfindCategory 覆盖二级分类 PROPFIND。
func TestWebDAVPropfindCategory(t *testing.T) {
	svc, db, dir := newWebDAVBookFixture(t)
	seedDAVBook(t, db, dir, 1, "三体")
	if _, err := db.Exec(`INSERT INTO tags (id, name) VALUES (1, '科幻')`); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO books_tags_link (book, tag) VALUES (1, 1)`); err != nil {
		t.Fatal(err)
	}

	ctx, rec := davCtx("PROPFIND", "/books/标签/科幻/", 1, "")
	svc.Serve(ctx)
	if rec.Code != 207 {
		t.Fatalf("状态码 = %d，期望 207", rec.Code)
	}
}

// TestWebDAVPropfindAuthors 覆盖作者分类 PROPFIND。
func TestWebDAVPropfindAuthors(t *testing.T) {
	svc, db, _ := newWebDAVBookFixture(t)
	if _, err := db.Exec(`INSERT INTO authors (id, name, sort) VALUES (1, '刘慈欣', '刘慈欣')`); err != nil {
		t.Fatal(err)
	}

	ctx, rec := davCtx("PROPFIND", "/books/作者/", 1, "")
	svc.Serve(ctx)
	if rec.Code != 207 {
		t.Fatalf("状态码 = %d，期望 207", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "刘慈欣") {
		t.Errorf("响应缺少作者: %s", rec.Body.String())
	}
}

// TestWebDAVPropfindCategories 覆盖「分类」PROPFIND。
func TestWebDAVPropfindCategories(t *testing.T) {
	svc, db, _ := newWebDAVBookFixture(t)
	if _, err := db.Exec(`INSERT INTO tags (id, name) VALUES (1, '科幻')`); err != nil {
		t.Fatal(err)
	}

	ctx, rec := davCtx("PROPFIND", "/books/分类/", 1, "")
	svc.Serve(ctx)
	if rec.Code != 207 {
		t.Fatalf("状态码 = %d，期望 207", rec.Code)
	}
}

// TestWebDAVPropfindReadingSections 覆盖阅读状态分类 PROPFIND。
func TestWebDAVPropfindReadingSections(t *testing.T) {
	svc, db, dir := newWebDAVBookFixture(t)
	seedDAVBook(t, db, dir, 1, "三体")
	if _, err := db.Exec(`INSERT INTO reading_state
		(reader_id, book_id, read_state, favorite, wants, online_read, download)
		VALUES (1, 1, 2, 1, 1, 0, 0)`); err != nil {
		t.Fatal(err)
	}

	for _, section := range []string{"我的收藏", "我的待读", "我的在读", "我的已读"} {
		ctx, rec := davCtx("PROPFIND", "/books/"+section+"/", 1, "")
		svc.Serve(ctx)
		if rec.Code != 207 {
			t.Errorf("%s 状态码 = %d，期望 207", section, rec.Code)
		}
	}
}

// TestWebDAVBookIDsForReading 覆盖阅读状态分类取 id。
func TestWebDAVBookIDsForReading(t *testing.T) {
	svc, db, _ := newWebDAVBookFixture(t)
	insertBook(t, db, 1, "书")
	if _, err := db.Exec(`INSERT INTO reading_state
		(reader_id, book_id, read_state, favorite, wants, online_read, download)
		VALUES (1, 1, 1, 1, 1, 0, 0)`); err != nil {
		t.Fatal(err)
	}

	ctx := &Context{Identity: Identity{UserID: 1}}
	for _, section := range []string{"我的收藏", "我的待读", "我的在读"} {
		if ids := svc.bookIDsFor(ctx, section, ""); len(ids) != 1 {
			t.Errorf("%s ids = %v，期望 1 项", section, ids)
		}
	}
}

// TestWebDAVBookIDsForUnknown 覆盖未知分类取 id。
func TestWebDAVBookIDsForUnknown(t *testing.T) {
	svc, _, _ := newWebDAVBookFixture(t)
	ctx := &Context{Identity: Identity{UserID: 1}}
	if ids := svc.bookIDsFor(ctx, "未知", ""); ids != nil {
		t.Errorf("未知分类应返回 nil，实际 %v", ids)
	}
}

// TestWebDAVServeNilRequest 覆盖空请求。
func TestWebDAVServeNilRequest(t *testing.T) {
	svc, _ := newWebDAVFixture(t)
	if svc.Serve(&Context{}) {
		t.Error("空请求应返回 false")
	}
}

// TestWebDAVPutCreatesParentDir 覆盖 PUT 自动建父目录。
func TestWebDAVPutCreatesParentDir(t *testing.T) {
	svc, root := newWebDAVFixture(t)
	ctx, rec := davCtx(http.MethodPut, "/books/我的同步/a/b/c.txt", 1, "deep")
	svc.Serve(ctx)
	if rec.Code != http.StatusCreated {
		t.Fatalf("状态码 = %d，期望 201", rec.Code)
	}
	if _, err := os.Stat(filepath.Join(root, "webdav", "1", "a", "b", "c.txt")); err != nil {
		t.Errorf("深层文件未创建: %v", err)
	}
}

// TestWebDAVDeleteMissing 覆盖删除不存在的文件。
func TestWebDAVDeleteMissing(t *testing.T) {
	svc, _ := newWebDAVFixture(t)
	ctx, rec := davCtx(http.MethodDelete, "/books/我的同步/nope.txt", 1, "")
	svc.Serve(ctx)
	// RemoveAll 对不存在的路径不报错，返回 204。
	if rec.Code != http.StatusNoContent {
		t.Errorf("状态码 = %d，期望 204", rec.Code)
	}
}
