package scan

import (
	"database/sql"
	"testing"

	"talebook/booksvr/internal/userdb"
)

// seedStatusRow 插入一条指定状态的记录。
func seedStatusRow(t *testing.T, db *sql.DB, hash, status string, scanID, importID int64) {
	t.Helper()
	row := &userdb.ScanFile{
		Name: hash, Path: "/data/" + hash, Hash: hash, Status: status,
		ScanID: scanID, ImportID: importID,
		CreateTime: "2026-01-01 00:00:00", UpdateTime: "2026-01-01 00:00:00",
		Data: map[string]any{},
	}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
}

// TestSummaryCounts 覆盖 summary 的四类计数。
func TestSummaryCounts(t *testing.T) {
	db := importTestDB(t)
	svc := newImportService(t, db, importLibraryDB(t))

	seedStatusRow(t, db, "h1", userdb.ScanStatusExist, 1, 0)
	seedStatusRow(t, db, "h2", userdb.ScanStatusImported, 1, 0)
	seedStatusRow(t, db, "h3", userdb.ScanStatusIndexed, 1, 0)
	seedStatusRow(t, db, "h4", userdb.ScanStatusFailed, 1, 0)
	seedStatusRow(t, db, "h5", userdb.ScanStatusDeleteFailed, 1, 0)
	seedStatusRow(t, db, "h6", userdb.ScanStatusReady, 1, 0)
	seedStatusRow(t, db, "h7", userdb.ScanStatusNew, 1, 0)
	seedStatusRow(t, db, "h8", userdb.ScanStatusDrop, 1, 0)
	seedStatusRow(t, db, "container", "expanded", 1, 0)

	got, err := svc.Summary()
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	want := Summary{Total: 8, Done: 3, Failed: 2, Todo: 2, Skipped: 1}
	if got != want {
		t.Errorf("summary = %+v, want %+v", got, want)
	}
}

// TestSummaryEmpty 空表时全为 0。
func TestSummaryEmpty(t *testing.T) {
	svc := newImportService(t, importTestDB(t), importLibraryDB(t))
	got, err := svc.Summary()
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if got != (Summary{}) {
		t.Errorf("summary = %+v, want 全 0", got)
	}
}

// TestSummaryError 库损坏时报错。
func TestSummaryError(t *testing.T) {
	svc := newImportService(t, closedDB(t), importLibraryDB(t))
	if _, err := svc.Summary(); err == nil {
		t.Error("库损坏应报错")
	}
}

// TestCountByStatus 覆盖计数与未知状态动态追加。
func TestCountByStatus(t *testing.T) {
	db := importTestDB(t)
	svc := newImportService(t, db, importLibraryDB(t))

	seedStatusRow(t, db, "h1", userdb.ScanStatusReady, 5, 0)
	seedStatusRow(t, db, "h2", userdb.ScanStatusReady, 5, 0)
	seedStatusRow(t, db, "h3", userdb.ScanStatusFailed, 5, 0)
	seedStatusRow(t, db, "h4", "weird", 5, 0)

	count, err := svc.CountByStatus(5, 0, false)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if count[userdb.ScanStatusReady] != 2 {
		t.Errorf("ready = %d, want 2", count[userdb.ScanStatusReady])
	}
	if count[userdb.ScanStatusFailed] != 1 {
		t.Errorf("failed = %d, want 1", count[userdb.ScanStatusFailed])
	}
	if count["weird"] != 1 {
		t.Errorf("weird = %d, want 1（未知状态应动态追加）", count["weird"])
	}
	// 预置键必须存在且为 0。
	for _, st := range countStatuses {
		if _, ok := count[st]; !ok {
			t.Errorf("预置键 %q 缺失", st)
		}
	}
}

// TestCountByStatusImport 按 import_id 计数。
func TestCountByStatusImport(t *testing.T) {
	db := importTestDB(t)
	svc := newImportService(t, db, importLibraryDB(t))

	seedStatusRow(t, db, "h1", userdb.ScanStatusImported, 0, 9)
	seedStatusRow(t, db, "h2", userdb.ScanStatusImported, 0, 9)
	seedStatusRow(t, db, "h3", userdb.ScanStatusImported, 0, 8)

	count, err := svc.CountByStatus(9, 0, true)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if count[userdb.ScanStatusImported] != 2 {
		t.Errorf("imported = %d, want 2", count[userdb.ScanStatusImported])
	}
}

// TestCountByStatusError 库损坏时报错。
func TestCountByStatusError(t *testing.T) {
	svc := newImportService(t, closedDB(t), importLibraryDB(t))
	if _, err := svc.CountByStatus(1, 0, false); err == nil {
		t.Error("库损坏应报错")
	}
}

// TestScanStatus 返回最大 scan_id 与计数。
func TestScanStatus(t *testing.T) {
	db := importTestDB(t)
	svc := newImportService(t, db, importLibraryDB(t))

	seedStatusRow(t, db, "h1", userdb.ScanStatusReady, 1, 0)
	seedStatusRow(t, db, "h2", userdb.ScanStatusReady, 3, 0)
	seedStatusRow(t, db, "h3", userdb.ScanStatusFailed, 3, 0)

	id, count, err := svc.ScanStatus()
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if id != 3 {
		t.Errorf("scan_id = %d, want 3", id)
	}
	if count[userdb.ScanStatusReady] != 1 || count[userdb.ScanStatusFailed] != 1 {
		t.Errorf("count = %+v, want ready=1 failed=1", count)
	}
}

// TestScanStatusEmpty 空表也提供零值状态，前端才能结束轮询。
func TestScanStatusEmpty(t *testing.T) {
	svc := newImportService(t, importTestDB(t), importLibraryDB(t))
	id, count, err := svc.ScanStatus()
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if id != 0 {
		t.Errorf("scan_id = %d, want 0", id)
	}
	if value, ok := count["new"]; !ok || value != 0 || count["total"] != 0 {
		t.Errorf("count = %+v, want explicit zero counts", count)
	}
}

// TestImportStatus 返回最大 import_id 与计数。
func TestImportStatus(t *testing.T) {
	db := importTestDB(t)
	svc := newImportService(t, db, importLibraryDB(t))

	seedStatusRow(t, db, "h1", userdb.ScanStatusImported, 0, 2)
	seedStatusRow(t, db, "h2", userdb.ScanStatusImported, 0, 7)

	id, count, err := svc.ImportStatus()
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if id != 7 {
		t.Errorf("import_id = %d, want 7", id)
	}
	if count[userdb.ScanStatusImported] != 1 {
		t.Errorf("imported = %d, want 1", count[userdb.ScanStatusImported])
	}
}

// TestImportStatusEmpty 空表返回 (0, 空 map)。
func TestImportStatusEmpty(t *testing.T) {
	svc := newImportService(t, importTestDB(t), importLibraryDB(t))
	id, count, err := svc.ImportStatus()
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if value, ok := count["ready"]; !ok || value != 0 || id != 0 || count["total"] != 0 {
		t.Errorf("得到 (%d,%+v), want explicit zero counts", id, count)
	}
}

// TestStatusByError 库损坏时报错。
func TestStatusByError(t *testing.T) {
	svc := newImportService(t, closedDB(t), importLibraryDB(t))
	if _, _, err := svc.ScanStatus(); err == nil {
		t.Error("库损坏应报错")
	}
	if _, _, err := svc.ImportStatus(); err == nil {
		t.Error("库损坏应报错")
	}
}

// TestCountReady 覆盖待导入计数。
func TestCountReady(t *testing.T) {
	db := importTestDB(t)
	svc := newImportService(t, db, importLibraryDB(t))

	seedStatusRow(t, db, "h1", userdb.ScanStatusReady, 1, 0)
	seedStatusRow(t, db, "h2", userdb.ScanStatusReady, 1, 0)
	seedStatusRow(t, db, "h3", userdb.ScanStatusExist, 1, 0)

	// nil 表示统计全部 READY。
	n, err := svc.CountReady(nil)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if n != 2 {
		t.Errorf("全部 READY = %d, want 2", n)
	}

	// 指定 hash 列表。
	n, err = svc.CountReady([]string{"h1"})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if n != 1 {
		t.Errorf("指定 hash = %d, want 1", n)
	}

	// 空列表返回 0。
	n, err = svc.CountReady([]string{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if n != 0 {
		t.Errorf("空列表 = %d, want 0", n)
	}
}

// TestCountReadyError 库损坏时报错。
func TestCountReadyError(t *testing.T) {
	svc := newImportService(t, closedDB(t), importLibraryDB(t))
	if _, err := svc.CountReady(nil); err == nil {
		t.Error("库损坏应报错")
	}
}

// TestDeleteAll hashlist 为 nil 时删除全部。
func TestDeleteAll(t *testing.T) {
	db := importTestDB(t)
	svc := newImportService(t, db, importLibraryDB(t))

	seedStatusRow(t, db, "h1", userdb.ScanStatusReady, 1, 0)
	seedStatusRow(t, db, "h2", userdb.ScanStatusReady, 1, 0)

	n, err := svc.Delete(nil)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if n != 2 {
		t.Errorf("删除 %d 条, want 2", n)
	}
	sum, _ := svc.Summary()
	if sum.Total != 0 {
		t.Errorf("删除后 total = %d, want 0", sum.Total)
	}
}

// TestDeleteByHashList 按 hash 列表删除。
func TestDeleteByHashList(t *testing.T) {
	db := importTestDB(t)
	svc := newImportService(t, db, importLibraryDB(t))

	seedStatusRow(t, db, "h1", userdb.ScanStatusReady, 1, 0)
	seedStatusRow(t, db, "h2", userdb.ScanStatusReady, 1, 0)
	seedStatusRow(t, db, "h3", userdb.ScanStatusReady, 1, 0)

	n, err := svc.Delete([]string{"h1", "h3"})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if n != 2 {
		t.Errorf("删除 %d 条, want 2", n)
	}
	sum, _ := svc.Summary()
	if sum.Total != 1 {
		t.Errorf("剩余 total = %d, want 1", sum.Total)
	}
}

// TestDeleteEmptyList 空列表不删除任何记录。
func TestDeleteEmptyList(t *testing.T) {
	db := importTestDB(t)
	svc := newImportService(t, db, importLibraryDB(t))
	seedStatusRow(t, db, "h1", userdb.ScanStatusReady, 1, 0)

	n, err := svc.Delete([]string{})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if n != 0 {
		t.Errorf("删除 %d 条, want 0", n)
	}
	sum, _ := svc.Summary()
	if sum.Total != 1 {
		t.Errorf("total = %d, want 1", sum.Total)
	}
}

// TestDeleteError 库损坏时报错。
func TestDeleteError(t *testing.T) {
	svc := newImportService(t, closedDB(t), importLibraryDB(t))
	if _, err := svc.Delete(nil); err == nil {
		t.Error("库损坏应报错")
	}
	if _, err := svc.Delete([]string{"h1"}); err == nil {
		t.Error("库损坏应报错")
	}
}

// TestListAll 默认查询返回全部。
func TestListAll(t *testing.T) {
	db := importTestDB(t)
	svc := newImportService(t, db, importLibraryDB(t))

	seedStatusRow(t, db, "h1", userdb.ScanStatusReady, 1, 0)
	seedStatusRow(t, db, "h2", userdb.ScanStatusExist, 1, 0)

	items, total, err := svc.List(ListOptions{Num: 20, Sort: "create_time", Desc: true, Filter: FilterAll})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if total != 2 || len(items) != 2 {
		t.Errorf("得到 (%d,%d), want (2,2)", len(items), total)
	}
}

// TestListFilters 覆盖 todo/done/failed 三种过滤。
func TestListFilters(t *testing.T) {
	db := importTestDB(t)
	svc := newImportService(t, db, importLibraryDB(t))

	seedStatusRow(t, db, "h1", userdb.ScanStatusReady, 1, 0)        // todo
	seedStatusRow(t, db, "h2", userdb.ScanStatusExist, 1, 0)        // done
	seedStatusRow(t, db, "h3", userdb.ScanStatusImported, 1, 0)     // done
	seedStatusRow(t, db, "h4", userdb.ScanStatusIndexed, 1, 0)      // done
	seedStatusRow(t, db, "h5", userdb.ScanStatusFailed, 1, 0)       // failed
	seedStatusRow(t, db, "h6", userdb.ScanStatusDeleteFailed, 1, 0) // failed
	seedStatusRow(t, db, "h7", userdb.ScanStatusDrop, 1, 0)         // skipped
	seedStatusRow(t, db, "container", "expanded", 1, 0)

	cases := []struct {
		filter ListFilter
		want   int64
	}{
		{FilterAll, 7},
		{FilterTodo, 1},
		{FilterDone, 3},
		{FilterFailed, 2},
		{FilterSkipped, 1},
	}
	for _, c := range cases {
		_, total, err := svc.List(ListOptions{Num: 20, Sort: "id", Desc: false, Filter: c.filter})
		if err != nil {
			t.Fatalf("filter=%s 失败: %v", c.filter, err)
		}
		if total != c.want {
			t.Errorf("filter=%s total = %d, want %d", c.filter, total, c.want)
		}
	}
}

// TestListPagination 分页与 num<=0 不分页。
func TestListPagination(t *testing.T) {
	db := importTestDB(t)
	svc := newImportService(t, db, importLibraryDB(t))

	for _, h := range []string{"h1", "h2", "h3", "h4", "h5"} {
		seedStatusRow(t, db, h, userdb.ScanStatusReady, 1, 0)
	}

	items, total, err := svc.List(ListOptions{Num: 2, Page: 0, Sort: "id", Desc: false, Filter: FilterAll})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if total != 5 || len(items) != 2 {
		t.Errorf("第 1 页得到 (%d,%d), want (2,5)", len(items), total)
	}
	if items[0].Hash != "h1" {
		t.Errorf("首条 = %q, want h1", items[0].Hash)
	}

	items, _, err = svc.List(ListOptions{Num: 2, Page: 2, Sort: "id", Desc: false, Filter: FilterAll})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(items) != 1 || items[0].Hash != "h5" {
		t.Errorf("第 3 页得到 %d 条, want 1 条 h5", len(items))
	}

	// num <= 0 表示不分页。
	items, _, err = svc.List(ListOptions{Num: 0, Sort: "id", Desc: false, Filter: FilterAll})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(items) != 5 {
		t.Errorf("不分页得到 %d 条, want 5", len(items))
	}
}

// TestListSortDesc 降序排序。
func TestListSortDesc(t *testing.T) {
	db := importTestDB(t)
	svc := newImportService(t, db, importLibraryDB(t))

	seedStatusRow(t, db, "h1", userdb.ScanStatusReady, 1, 0)
	seedStatusRow(t, db, "h2", userdb.ScanStatusReady, 1, 0)

	items, _, err := svc.List(ListOptions{Num: 20, Sort: "id", Desc: true, Filter: FilterAll})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if items[0].Hash != "h2" {
		t.Errorf("降序首条 = %q, want h2", items[0].Hash)
	}
}

// TestListUnknownSort 未知排序字段退回 create_time。
func TestListUnknownSort(t *testing.T) {
	db := importTestDB(t)
	svc := newImportService(t, db, importLibraryDB(t))
	seedStatusRow(t, db, "h1", userdb.ScanStatusReady, 1, 0)

	items, total, err := svc.List(ListOptions{Num: 20, Sort: "bogus", Desc: true, Filter: FilterAll})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if total != 1 || len(items) != 1 {
		t.Errorf("得到 (%d,%d), want (1,1)", len(items), total)
	}
}

// TestListDataRoundTrip data 字段正确反序列化。
func TestListDataRoundTrip(t *testing.T) {
	db := importTestDB(t)
	svc := newImportService(t, db, importLibraryDB(t))

	row := &userdb.ScanFile{
		Name: "n", Path: "/data/n", Hash: "h1", Status: userdb.ScanStatusReady,
		CreateTime: "t", UpdateTime: "t",
		Data: map[string]any{"format": "EPUB", "size": float64(123)},
	}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}

	items, _, err := svc.List(ListOptions{Num: 20, Sort: "id", Desc: false, Filter: FilterAll})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if items[0].Data["format"] != "EPUB" {
		t.Errorf("data.format = %v, want EPUB", items[0].Data["format"])
	}
}

// TestListError 库损坏时报错。
func TestListError(t *testing.T) {
	svc := newImportService(t, closedDB(t), importLibraryDB(t))
	if _, _, err := svc.List(ListOptions{Num: 20, Filter: FilterAll}); err == nil {
		t.Error("库损坏应报错")
	}
}

// TestPlaceholders 占位符生成。
func TestPlaceholders(t *testing.T) {
	cases := map[int]string{0: "", 1: "?", 2: "?,?", 3: "?,?,?"}
	for n, want := range cases {
		if got := placeholders(n); got != want {
			t.Errorf("placeholders(%d) = %q, want %q", n, got, want)
		}
	}
}

// TestToArgs 字符串切片转 []any。
func TestToArgs(t *testing.T) {
	got := toArgs([]string{"a", "b"})
	if len(got) != 2 || got[0] != "a" || got[1] != "b" {
		t.Errorf("toArgs = %v, want [a b]", got)
	}
}
