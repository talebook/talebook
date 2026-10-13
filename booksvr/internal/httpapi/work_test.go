package httpapi

import (
	"database/sql"
	"encoding/json"
	"errors"
	"testing"

	_ "modernc.org/sqlite"

	"talebook/booksvr/internal/library"
)

// newTestDB 建一个已迁移的内存库。
//
// Migrate 是「扩展既有 books 表」而非「从零建表」，因此这里先建一个
// 最小的 Calibre 风格 books 表，再跑迁移。
func newTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	if _, err := db.Exec(`CREATE TABLE books (
		id          INTEGER PRIMARY KEY,
		title       TEXT NOT NULL DEFAULT '',
		author_sort TEXT NOT NULL DEFAULT '',
		path        TEXT NOT NULL DEFAULT '',
		timestamp   INTEGER NOT NULL DEFAULT 0
	)`); err != nil {
		t.Fatalf("create books: %v", err)
	}

	if err := library.Migrate(db); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db
}

// seedWork 建一个作品 + 两个版本，返回 (workID, bookA, bookB)。
func seedWork(t *testing.T, db *sql.DB) (int64, int64, int64) {
	t.Helper()

	workID, err := library.FindOrCreateWork(db, "三体", "刘慈欣")
	if err != nil {
		t.Fatalf("create work: %v", err)
	}

	bookA, _, err := library.FindOrCreateEdition(db, workID, library.BookMeta{
		Title:     "三体",
		Author:    "刘慈欣",
		Publisher: "重庆出版社",
		Pubdate:   "2008-01-01",
	})
	if err != nil {
		t.Fatalf("create edition A: %v", err)
	}

	bookB, _, err := library.FindOrCreateEdition(db, workID, library.BookMeta{
		Title:     "三体（第二版）",
		Author:    "刘慈欣",
		Publisher: "重庆出版社",
		Pubdate:   "2012-01-01",
	})
	if err != nil {
		t.Fatalf("create edition B: %v", err)
	}

	return workID, bookA, bookB
}

// addFormat 给书登记一个格式（不复制文件）。
func addFormat(t *testing.T, db *sql.DB, bookID int64, format, path string, size int64) {
	t.Helper()
	if err := library.RegisterFormat(db, bookID, format, path, size, 0); err != nil {
		t.Fatalf("register format %s: %v", format, err)
	}
}

// ---------- GET /api/work/{id} ----------

func TestWorkDetailReturnsWorkAndVersions(t *testing.T) {
	db := newTestDB(t)
	workID, bookA, bookB := seedWork(t, db)
	addFormat(t, db, bookA, "EPUB", "/library/a.epub", 1000)
	addFormat(t, db, bookA, "MOBI", "/library/a.mobi", 2000)
	addFormat(t, db, bookB, "PDF", "/library/b.pdf", 3000)

	svc := &WorkService{DB: db, CDNURL: "https://cdn.example.com", APIURL: "https://api.example.com"}
	resp, err := svc.WorkDetail(workID)
	if err != nil {
		t.Fatalf("WorkDetail: %v", err)
	}

	if resp.Err != "ok" {
		t.Errorf("err = %q, want ok", resp.Err)
	}
	if resp.Work.ID != workID {
		t.Errorf("work.id = %d, want %d", resp.Work.ID, workID)
	}
	if resp.Work.Title != "三体" {
		t.Errorf("work.title = %q, want 三体", resp.Work.Title)
	}
	if resp.Work.Author != "刘慈欣" {
		t.Errorf("work.author = %q, want 刘慈欣", resp.Work.Author)
	}
	if resp.Work.VersionCount != 2 {
		t.Errorf("version_count = %d, want 2", resp.Work.VersionCount)
	}
	if resp.Work.FormatCount != 3 {
		t.Errorf("format_count = %d, want 3", resp.Work.FormatCount)
	}
	if len(resp.Versions) != 2 {
		t.Fatalf("versions 数 = %d, want 2", len(resp.Versions))
	}
}

func TestWorkDetailVersionIDsAreBookIDs(t *testing.T) {
	db := newTestDB(t)
	workID, bookA, bookB := seedWork(t, db)

	svc := &WorkService{DB: db, CDNURL: "https://cdn.example.com", APIURL: "https://api.example.com"}
	resp, err := svc.WorkDetail(workID)
	if err != nil {
		t.Fatalf("WorkDetail: %v", err)
	}

	// versions[].id 必须是可直接用于 /book/{id} 的 book_id
	got := map[int64]bool{}
	for _, v := range resp.Versions {
		got[v.ID] = true
	}
	if !got[bookA] || !got[bookB] {
		t.Errorf("versions[].id = %v, want 含 %d 与 %d", got, bookA, bookB)
	}
}

func TestWorkDetailFilesHaveFourFields(t *testing.T) {
	db := newTestDB(t)
	workID, bookA, _ := seedWork(t, db)
	addFormat(t, db, bookA, "EPUB", "/library/a.epub", 1000)

	svc := &WorkService{DB: db, CDNURL: "https://cdn.example.com", APIURL: "https://api.example.com"}
	resp, err := svc.WorkDetail(workID)
	if err != nil {
		t.Fatalf("WorkDetail: %v", err)
	}

	var found bool
	for _, v := range resp.Versions {
		if v.ID != bookA {
			continue
		}
		found = true
		if len(v.Files) != 1 {
			t.Fatalf("files 数 = %d, want 1", len(v.Files))
		}
		f := v.Files[0]
		if f.Format != "EPUB" || f.Size != 1000 {
			t.Errorf("files[0] = %+v", f)
		}
		if f.Href != "https://cdn.example.com/api/book/"+itoa(bookA)+".EPUB" {
			t.Errorf("files[0].Href = %q", f.Href)
		}
		if !f.OnlineReadable {
			t.Error("EPUB 应支持在线阅读")
		}
	}
	if !found {
		t.Fatalf("未找到 book %d 的版本", bookA)
	}
}

func TestWorkDetailNotFound(t *testing.T) {
	db := newTestDB(t)
	svc := &WorkService{DB: db}

	resp, err := svc.WorkDetail(99999)
	if err != nil {
		t.Fatalf("WorkDetail 不应返回 error，应走 err 信封: %v", err)
	}
	if resp.Err != "work.not_found" {
		t.Errorf("err = %q, want work.not_found", resp.Err)
	}
}

func TestWorkDetailIncludesEditionKeyAndSuffixes(t *testing.T) {
	db := newTestDB(t)
	workID, _, _ := seedWork(t, db)

	svc := &WorkService{DB: db, CDNURL: "https://cdn.example.com", APIURL: "https://api.example.com"}
	resp, err := svc.WorkDetail(workID)
	if err != nil {
		t.Fatalf("WorkDetail: %v", err)
	}

	for _, v := range resp.Versions {
		if v.EditionKey == "" {
			t.Errorf("版本 %d 的 edition_key 为空", v.ID)
		}
		if v.Suffixes == nil {
			t.Errorf("版本 %d 的 suffixes 为 nil，应为空数组", v.ID)
		}
	}
}

// ---------- GET /api/book/{id}/versions ----------

func TestBookVersionsExcludesCurrentBook(t *testing.T) {
	db := newTestDB(t)
	_, bookA, bookB := seedWork(t, db)

	svc := &WorkService{DB: db, CDNURL: "https://cdn.example.com", APIURL: "https://api.example.com"}
	resp, err := svc.BookVersions(bookA)
	if err != nil {
		t.Fatalf("BookVersions: %v", err)
	}

	if resp.Err != "ok" {
		t.Errorf("err = %q, want ok", resp.Err)
	}
	if len(resp.Versions) != 1 {
		t.Fatalf("versions 数 = %d, want 1（不含当前书）", len(resp.Versions))
	}
	if resp.Versions[0].ID != bookB {
		t.Errorf("versions[0].id = %d, want %d", resp.Versions[0].ID, bookB)
	}
	for _, v := range resp.Versions {
		if v.ID == bookA {
			t.Error("versions 不应包含当前书自身")
		}
	}
}

func TestBookVersionsReturnsWorkID(t *testing.T) {
	db := newTestDB(t)
	workID, bookA, _ := seedWork(t, db)

	svc := &WorkService{DB: db}
	resp, err := svc.BookVersions(bookA)
	if err != nil {
		t.Fatalf("BookVersions: %v", err)
	}
	if resp.WorkID != workID {
		t.Errorf("work_id = %d, want %d", resp.WorkID, workID)
	}
}

func TestBookVersionsSingleVersionReturnsEmpty(t *testing.T) {
	db := newTestDB(t)
	workID, err := library.FindOrCreateWork(db, "独版书", "某作者")
	if err != nil {
		t.Fatalf("create work: %v", err)
	}
	bookID, _, err := library.FindOrCreateEdition(db, workID, library.BookMeta{Title: "独版书", Author: "某作者"})
	if err != nil {
		t.Fatalf("create edition: %v", err)
	}

	svc := &WorkService{DB: db}
	resp, err := svc.BookVersions(bookID)
	if err != nil {
		t.Fatalf("BookVersions: %v", err)
	}
	if len(resp.Versions) != 0 {
		t.Errorf("versions 数 = %d, want 0", len(resp.Versions))
	}
}

func TestBookVersionsNotFound(t *testing.T) {
	db := newTestDB(t)
	svc := &WorkService{DB: db}

	resp, err := svc.BookVersions(99999)
	if err != nil {
		t.Fatalf("不应返回 error: %v", err)
	}
	if resp.Err != "book.not_found" {
		t.Errorf("err = %q, want book.not_found", resp.Err)
	}
}

// ---------- POST /api/book/{id}/merge ----------

func TestMergeBooksSharesWorkID(t *testing.T) {
	db := newTestDB(t)
	// 两个独立作品。
	//
	// 注意不能用《三体》与《三体全集》：后者归一化后与前者同 work_key
	// （「全集」是版本后缀），那样两书本就在同一作品，测不到合并。
	workA, err := library.FindOrCreateWork(db, "三体", "刘慈欣")
	if err != nil {
		t.Fatalf("work A: %v", err)
	}
	bookA, _, err := library.FindOrCreateEdition(db, workA, library.BookMeta{Title: "三体", Author: "刘慈欣"})
	if err != nil {
		t.Fatalf("book A: %v", err)
	}

	workB, err := library.FindOrCreateWork(db, "流浪地球", "刘慈欣")
	if err != nil {
		t.Fatalf("work B: %v", err)
	}
	bookB, _, err := library.FindOrCreateEdition(db, workB, library.BookMeta{Title: "流浪地球", Author: "刘慈欣"})
	if err != nil {
		t.Fatalf("book B: %v", err)
	}

	svc := &WorkService{DB: db}
	resp, err := svc.MergeBooks(bookA, bookB)
	if err != nil {
		t.Fatalf("MergeBooks: %v", err)
	}

	if resp.Err != "ok" {
		t.Fatalf("err = %q, want ok", resp.Err)
	}
	if resp.WorkID != workA {
		t.Errorf("work_id = %d, want %d（并入当前书所在作品）", resp.WorkID, workA)
	}

	// 两书必须共享 work_id
	gotA, err := library.GetBookWorkID(db, bookA)
	if err != nil {
		t.Fatalf("GetBookWorkID A: %v", err)
	}
	gotB, err := library.GetBookWorkID(db, bookB)
	if err != nil {
		t.Fatalf("GetBookWorkID B: %v", err)
	}
	if gotA != gotB {
		t.Errorf("合并后 work_id 不一致: A=%d B=%d", gotA, gotB)
	}
	if gotA != workA {
		t.Errorf("合并后 work_id = %d, want %d", gotA, workA)
	}
}

func TestMergeBooksReturnsMergedList(t *testing.T) {
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

	if len(resp.Merged) != 2 {
		t.Fatalf("merged = %v, want 2 项", resp.Merged)
	}
	if resp.Msg == "" {
		t.Error("msg 不应为空")
	}
}

func TestMergeBooksConflictWhenSameBook(t *testing.T) {
	db := newTestDB(t)
	workA, _ := library.FindOrCreateWork(db, "书A", "作者")
	bookA, _, _ := library.FindOrCreateEdition(db, workA, library.BookMeta{Title: "书A", Author: "作者"})

	svc := &WorkService{DB: db}
	resp, err := svc.MergeBooks(bookA, bookA)
	if err != nil {
		t.Fatalf("不应返回 error: %v", err)
	}
	if resp.Err != "work.merge.conflict" {
		t.Errorf("err = %q, want work.merge.conflict", resp.Err)
	}
}

func TestMergeBooksConflictWhenAlreadySameWork(t *testing.T) {
	db := newTestDB(t)
	_, bookA, bookB := seedWork(t, db)

	svc := &WorkService{DB: db}
	resp, err := svc.MergeBooks(bookA, bookB)
	if err != nil {
		t.Fatalf("不应返回 error: %v", err)
	}
	if resp.Err != "work.merge.conflict" {
		t.Errorf("err = %q, want work.merge.conflict（已在同一作品）", resp.Err)
	}
}

func TestMergeBooksTargetNotFound(t *testing.T) {
	db := newTestDB(t)
	workA, _ := library.FindOrCreateWork(db, "书A", "作者")
	bookA, _, _ := library.FindOrCreateEdition(db, workA, library.BookMeta{Title: "书A", Author: "作者"})

	svc := &WorkService{DB: db}
	resp, err := svc.MergeBooks(bookA, 99999)
	if err != nil {
		t.Fatalf("不应返回 error: %v", err)
	}
	if resp.Err != "book.not_found" {
		t.Errorf("err = %q, want book.not_found", resp.Err)
	}
}

// ---------- 权限 ----------

func TestWorkDetailGuestSeesOnlyPublicBooks(t *testing.T) {
	db := newTestDB(t)
	workID, bookA, bookB := seedWork(t, db)

	// bookB 设为私有
	svc := &WorkService{
		DB: db,
		IsPublic: func(bookID int64) (bool, error) {
			return bookID != bookB, nil
		},
	}
	resp, err := svc.WorkDetail(workID)
	if err != nil {
		t.Fatalf("WorkDetail: %v", err)
	}

	for _, v := range resp.Versions {
		if v.ID == bookB {
			t.Error("游客不应看到私有书")
		}
	}
	if resp.Work.VersionCount != 1 {
		t.Errorf("version_count = %d, want 1（只算可见版本）", resp.Work.VersionCount)
	}
	_ = bookA
}

func TestBookVersionsGuestSeesOnlyPublicBooks(t *testing.T) {
	db := newTestDB(t)
	_, bookA, bookB := seedWork(t, db)

	svc := &WorkService{
		DB: db,
		IsPublic: func(bookID int64) (bool, error) {
			return bookID != bookB, nil
		},
	}
	resp, err := svc.BookVersions(bookA)
	if err != nil {
		t.Fatalf("BookVersions: %v", err)
	}
	for _, v := range resp.Versions {
		if v.ID == bookB {
			t.Error("游客不应看到私有书")
		}
	}
}

func TestWorkDetailPrivateBookHiddenFromGuest(t *testing.T) {
	db := newTestDB(t)
	workID, _, bookB := seedWork(t, db)

	// 当前书本身私有 → 游客不可见
	svc := &WorkService{
		DB: db,
		IsPublic: func(bookID int64) (bool, error) {
			return bookID != bookB, nil
		},
	}
	resp, err := svc.WorkDetail(workID)
	if err != nil {
		t.Fatalf("WorkDetail: %v", err)
	}
	if resp.Err != "ok" {
		t.Errorf("err = %q, want ok", resp.Err)
	}
}

func TestPermissionErrorPropagates(t *testing.T) {
	db := newTestDB(t)
	workID, _, _ := seedWork(t, db)

	boom := errors.New("权限查询失败")
	svc := &WorkService{
		DB: db,
		IsPublic: func(int64) (bool, error) {
			return false, boom
		},
	}
	if _, err := svc.WorkDetail(workID); !errors.Is(err, boom) {
		t.Errorf("err = %v, want %v", err, boom)
	}
}

// ---------- 响应信封 ----------

func TestResponsesMarshalToErrEnvelope(t *testing.T) {
	db := newTestDB(t)
	workID, _, _ := seedWork(t, db)

	svc := &WorkService{DB: db, CDNURL: "https://cdn.example.com", APIURL: "https://api.example.com"}
	resp, err := svc.WorkDetail(workID)
	if err != nil {
		t.Fatalf("WorkDetail: %v", err)
	}

	raw, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded map[string]any
	if err := json.Unmarshal(raw, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	for _, k := range []string{"err", "work", "versions"} {
		if _, ok := decoded[k]; !ok {
			t.Errorf("响应缺少字段 %q", k)
		}
	}
}

func TestMergeResponseEnvelope(t *testing.T) {
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

	raw, _ := json.Marshal(resp)
	var decoded map[string]any
	_ = json.Unmarshal(raw, &decoded)
	for _, k := range []string{"err", "work_id", "merged", "msg"} {
		if _, ok := decoded[k]; !ok {
			t.Errorf("merge 响应缺少字段 %q", k)
		}
	}
}

// ---------- 路由注册 ----------

func TestNewWorkRoutesAreRegistered(t *testing.T) {
	patterns := Patterns()
	for _, p := range []string{
		"/api/work/([0-9]+)",
		"/api/book/([0-9]+)/versions",
		"/api/book/([0-9]+)/merge",
	} {
		if !patterns[p] {
			t.Errorf("缺少新增路由 %q", p)
		}
	}
}

func TestRouteCountIs218AfterNewRoutes(t *testing.T) {
	if got := RouteCount(); got != 218 {
		t.Errorf("RouteCount() = %d, want 218（215 既有 + 3 新增）", got)
	}
}
