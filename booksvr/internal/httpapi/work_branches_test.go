package httpapi

import (
	"database/sql"
	"errors"
	"testing"

	_ "modernc.org/sqlite"

	"talebook/booksvr/internal/library"
)

// ---------- edition_key 反解 ----------

func TestEditionKeyParts(t *testing.T) {
	cases := []struct {
		name string
		key  string
		want int
	}{
		{"空串返回 nil", "", 0},
		{"三段无后缀", "重庆出版社\x1f2008\x1f-", 3},
		{"四段带后缀", "重庆出版社\x1f2008\x1f-\x1f第二版", 4},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := editionKeyParts(c.key)
			if len(got) != c.want {
				t.Errorf("editionKeyParts(%q) 段数 = %d, want %d", c.key, len(got), c.want)
			}
		})
	}
}

func TestPublisherAndPubdateFromEditionKey(t *testing.T) {
	cases := []struct {
		name          string
		key           string
		wantPublisher string
		wantPubdate   string
	}{
		{"正常三段", "重庆出版社\x1f2008\x1f-", "重庆出版社", "2008"},
		{"空串", "", "", ""},
		{"只有一段", "重庆出版社", "", ""},
		{"出版社占位符", "-\x1f2008\x1f-", "", "2008"},
		{"版次占位符", "重庆出版社\x1f-\x1f-", "重庆出版社", ""},
		{"两段都占位", "-\x1f-\x1f-", "", ""},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			pub, date := publisherAndPubdateFromEditionKey(c.key)
			if pub != c.wantPublisher {
				t.Errorf("publisher = %q, want %q", pub, c.wantPublisher)
			}
			if date != c.wantPubdate {
				t.Errorf("pubdate = %q, want %q", date, c.wantPubdate)
			}
		})
	}
}

func TestSuffixesFromEditionKey(t *testing.T) {
	cases := []struct {
		name string
		key  string
		want int
	}{
		{"空串", "", 0},
		{"三段无后缀段", "重庆出版社\x1f2008\x1f-", 0},
		{"四段带后缀", "重庆出版社\x1f2008\x1f-\x1f第二版", 1},
		{"四段但后缀为占位符", "重庆出版社\x1f2008\x1f-\x1f-", 0},
		{"四段但后缀为空", "重庆出版社\x1f2008\x1f-\x1f", 0},
		{"多后缀逗号分隔", "重庆出版社\x1f2008\x1f-\x1f第二版,修订版", 2},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := suffixesFromEditionKey(c.key)
			if len(got) != c.want {
				t.Errorf("suffixesFromEditionKey(%q) = %v, want %d 项", c.key, got, c.want)
			}
		})
	}
}

// ---------- 错误路径 ----------

// brokenDB 返回一个已关闭的 DB，用于触发非 ErrNoRows 的真实错误。
func brokenDB(t *testing.T) *sql.DB {
	t.Helper()
	db := newTestDB(t)
	if err := db.Close(); err != nil {
		t.Fatalf("close db: %v", err)
	}
	return db
}

func TestWorkDetailDBErrorPropagates(t *testing.T) {
	svc := &WorkService{DB: brokenDB(t)}
	if _, err := svc.WorkDetail(1); err == nil {
		t.Error("数据库不可用时 WorkDetail 应返回 error")
	}
}

func TestBookVersionsDBErrorPropagates(t *testing.T) {
	svc := &WorkService{DB: brokenDB(t)}
	if _, err := svc.BookVersions(1); err == nil {
		t.Error("数据库不可用时 BookVersions 应返回 error")
	}
}

func TestMergeBooksDBErrorPropagates(t *testing.T) {
	svc := &WorkService{DB: brokenDB(t)}
	if _, err := svc.MergeBooks(1, 2); err == nil {
		t.Error("数据库不可用时 MergeBooks 应返回 error")
	}
}

func TestWorkDetailListVersionsErrorPropagates(t *testing.T) {
	db := newTestDB(t)
	workID, _, _ := seedWork(t, db)
	// 删掉 books 表，让 ListVersions 失败
	if _, err := db.Exec(`DROP TABLE books`); err != nil {
		t.Fatalf("drop books: %v", err)
	}

	svc := &WorkService{DB: db}
	if _, err := svc.WorkDetail(workID); err == nil {
		t.Error("ListVersions 失败时 WorkDetail 应返回 error")
	}
}

func TestBookVersionsListErrorPropagates(t *testing.T) {
	db := newTestDB(t)
	_, bookA, _ := seedWork(t, db)
	if _, err := db.Exec(`DROP TABLE books`); err != nil {
		t.Fatalf("drop books: %v", err)
	}

	svc := &WorkService{DB: db}
	if _, err := svc.BookVersions(bookA); err == nil {
		t.Error("ListVersions 失败时 BookVersions 应返回 error")
	}
}

func TestVersionSummaryLoadErrorPropagates(t *testing.T) {
	db := newTestDB(t)
	workID, _, _ := seedWork(t, db)
	// 删掉 book_formats，让 ListFormats 失败
	if _, err := db.Exec(`DROP TABLE book_formats`); err != nil {
		t.Fatalf("drop book_formats: %v", err)
	}

	svc := &WorkService{DB: db}
	if _, err := svc.WorkDetail(workID); err == nil {
		t.Error("ListFormats 失败时 WorkDetail 应返回 error")
	}
}

func TestMergeBooksTargetWorkLookupError(t *testing.T) {
	db := newTestDB(t)
	workA, _ := library.FindOrCreateWork(db, "书A", "作者")
	bookA, _, _ := library.FindOrCreateEdition(db, workA, library.BookMeta{Title: "书A", Author: "作者"})

	// 让第二次 GetBookWorkID 失败：删掉 books 表
	if _, err := db.Exec(`DROP TABLE books`); err != nil {
		t.Fatalf("drop books: %v", err)
	}

	svc := &WorkService{DB: db}
	if _, err := svc.MergeBooks(bookA, 2); err == nil {
		t.Error("GetBookWorkID 失败时 MergeBooks 应返回 error")
	}
}

func TestMergeBooksLibraryErrorPropagates(t *testing.T) {
	db := newTestDB(t)
	workA, _ := library.FindOrCreateWork(db, "书A", "作者")
	bookA, _, _ := library.FindOrCreateEdition(db, workA, library.BookMeta{Title: "书A", Author: "作者"})
	workB, _ := library.FindOrCreateWork(db, "书B", "作者")
	bookB, _, _ := library.FindOrCreateEdition(db, workB, library.BookMeta{Title: "书B", Author: "作者"})

	// 用一个会在事务中失败的 DB：删掉 books 表后 MergeBooks 的 UPDATE 会失败
	if _, err := db.Exec(`DROP TABLE books`); err != nil {
		t.Fatalf("drop books: %v", err)
	}

	svc := &WorkService{DB: db}
	if _, err := svc.MergeBooks(bookA, bookB); err == nil {
		t.Error("底层 MergeBooks 失败时应返回 error")
	}
}

// ---------- 权限错误传播（BookVersions 路径） ----------

func TestBookVersionsPermissionErrorPropagates(t *testing.T) {
	db := newTestDB(t)
	_, bookA, _ := seedWork(t, db)

	boom := errors.New("权限查询失败")
	svc := &WorkService{
		DB: db,
		IsPublic: func(int64) (bool, error) {
			return false, boom
		},
	}
	if _, err := svc.BookVersions(bookA); !errors.Is(err, boom) {
		t.Errorf("err = %v, want %v", err, boom)
	}
}

// ---------- 版本摘要字段 ----------

func TestVersionSummaryPublisherFromEditionKey(t *testing.T) {
	db := newTestDB(t)
	workID, err := library.FindOrCreateWork(db, "带出版社的书", "作者")
	if err != nil {
		t.Fatalf("work: %v", err)
	}
	bookID, _, err := library.FindOrCreateEdition(db, workID, library.BookMeta{
		Title:     "带出版社的书",
		Author:    "作者",
		Publisher: "重庆出版社",
		Pubdate:   "2008-01-01",
	})
	if err != nil {
		t.Fatalf("edition: %v", err)
	}

	svc := &WorkService{DB: db}
	resp, err := svc.WorkDetail(workID)
	if err != nil {
		t.Fatalf("WorkDetail: %v", err)
	}

	var found bool
	for _, v := range resp.Versions {
		if v.ID != bookID {
			continue
		}
		found = true
		if v.Publisher != "重庆出版社" {
			t.Errorf("publisher = %q, want 重庆出版社", v.Publisher)
		}
		// edition_key 里的版次经过归一化（标点被折叠为空格），
		// 因此 "2008-01-01" 存进去后读出来是 "2008 01 01"。
		// 这是 edition_key 的既定语义，不是缺陷。
		if v.Pubdate != "2008 01 01" {
			t.Errorf("pubdate = %q, want %q", v.Pubdate, "2008 01 01")
		}
	}
	if !found {
		t.Fatal("未找到目标版本")
	}
}

func TestVersionSummarySuffixesFromEditionKey(t *testing.T) {
	db := newTestDB(t)
	workID, err := library.FindOrCreateWork(db, "带后缀的书", "作者")
	if err != nil {
		t.Fatalf("work: %v", err)
	}
	// 标题带版本后缀 → edition_key 末段非空
	bookID, _, err := library.FindOrCreateEdition(db, workID, library.BookMeta{
		Title:  "带后缀的书（第二版）",
		Author: "作者",
	})
	if err != nil {
		t.Fatalf("edition: %v", err)
	}

	svc := &WorkService{DB: db}
	resp, err := svc.WorkDetail(workID)
	if err != nil {
		t.Fatalf("WorkDetail: %v", err)
	}

	var found bool
	for _, v := range resp.Versions {
		if v.ID != bookID {
			continue
		}
		found = true
		if len(v.Suffixes) == 0 {
			t.Errorf("suffixes 为空，edition_key = %q", v.EditionKey)
		}
	}
	if !found {
		t.Fatal("未找到目标版本")
	}
}

func TestVersionSummaryEmptyEditionKeyGivesEmptySuffixes(t *testing.T) {
	db := newTestDB(t)
	workID, err := library.FindOrCreateWork(db, "无指纹的书", "作者")
	if err != nil {
		t.Fatalf("work: %v", err)
	}
	// 无出版社/版次/后缀 → edition_key 为空
	bookID, _, err := library.FindOrCreateEdition(db, workID, library.BookMeta{
		Title:  "无指纹的书",
		Author: "作者",
	})
	if err != nil {
		t.Fatalf("edition: %v", err)
	}

	svc := &WorkService{DB: db}
	resp, err := svc.WorkDetail(workID)
	if err != nil {
		t.Fatalf("WorkDetail: %v", err)
	}

	for _, v := range resp.Versions {
		if v.ID != bookID {
			continue
		}
		if v.Suffixes == nil {
			t.Error("suffixes 应为空数组而非 nil")
		}
		if len(v.Suffixes) != 0 {
			t.Errorf("suffixes = %v, want 空", v.Suffixes)
		}
	}
}

func TestVersionSummaryNoFormatsGivesEmptyFiles(t *testing.T) {
	db := newTestDB(t)
	workID, _, _ := seedWork(t, db)

	svc := &WorkService{DB: db}
	resp, err := svc.WorkDetail(workID)
	if err != nil {
		t.Fatalf("WorkDetail: %v", err)
	}
	for _, v := range resp.Versions {
		if v.Files == nil {
			t.Errorf("版本 %d 的 files 应为空数组而非 nil", v.ID)
		}
	}
}

// ---------- 游客可见性边界 ----------

func TestWorkDetailAllVersionsPrivateGivesZeroCount(t *testing.T) {
	db := newTestDB(t)
	workID, _, _ := seedWork(t, db)

	svc := &WorkService{
		DB:       db,
		IsPublic: func(int64) (bool, error) { return false, nil },
	}
	resp, err := svc.WorkDetail(workID)
	if err != nil {
		t.Fatalf("WorkDetail: %v", err)
	}
	if resp.Work.VersionCount != 0 {
		t.Errorf("version_count = %d, want 0", resp.Work.VersionCount)
	}
	if resp.Work.FormatCount != 0 {
		t.Errorf("format_count = %d, want 0", resp.Work.FormatCount)
	}
	if len(resp.Versions) != 0 {
		t.Errorf("versions 数 = %d, want 0", len(resp.Versions))
	}
}

func TestBookVersionsAllPrivateGivesEmpty(t *testing.T) {
	db := newTestDB(t)
	_, bookA, _ := seedWork(t, db)

	svc := &WorkService{
		DB:       db,
		IsPublic: func(int64) (bool, error) { return false, nil },
	}
	resp, err := svc.BookVersions(bookA)
	if err != nil {
		t.Fatalf("BookVersions: %v", err)
	}
	if len(resp.Versions) != 0 {
		t.Errorf("versions 数 = %d, want 0", len(resp.Versions))
	}
}

// ---------- 合并边界 ----------

func TestMergeBooksSourceNotFound(t *testing.T) {
	db := newTestDB(t)
	svc := &WorkService{DB: db}

	resp, err := svc.MergeBooks(99999, 88888)
	if err != nil {
		t.Fatalf("不应返回 error: %v", err)
	}
	if resp.Err != ErrBookNotFound {
		t.Errorf("err = %q, want %q", resp.Err, ErrBookNotFound)
	}
}

func TestMergeBooksConflictMessageNonEmpty(t *testing.T) {
	db := newTestDB(t)
	workA, _ := library.FindOrCreateWork(db, "书A", "作者")
	bookA, _, _ := library.FindOrCreateEdition(db, workA, library.BookMeta{Title: "书A", Author: "作者"})

	svc := &WorkService{DB: db}
	resp, err := svc.MergeBooks(bookA, bookA)
	if err != nil {
		t.Fatalf("不应返回 error: %v", err)
	}
	if resp.Msg == "" {
		t.Error("冲突时 msg 不应为空")
	}
}

func TestMergeBooksAlreadySameWorkMessage(t *testing.T) {
	db := newTestDB(t)
	_, bookA, bookB := seedWork(t, db)

	svc := &WorkService{DB: db}
	resp, err := svc.MergeBooks(bookA, bookB)
	if err != nil {
		t.Fatalf("不应返回 error: %v", err)
	}
	if resp.Msg == "" {
		t.Error("冲突时 msg 不应为空")
	}
}

// ---------- 新增路由的 Source 字段非空 ----------

func TestNewRouteSourceFieldsNonEmpty(t *testing.T) {
	for _, r := range NewRoutes() {
		if r.Source == "" {
			t.Errorf("新增路由 %q 缺少 Source", r.Pattern)
		}
		if r.Handler == "" {
			t.Errorf("新增路由 %q 缺少 Handler", r.Pattern)
		}
	}
}
