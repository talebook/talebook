package userdb

import (
	"database/sql"
	"testing"

	_ "modernc.org/sqlite"
)

// annDB 建一个含 annotations / annotation_sources / plugin_source_records 的内存库。
func annDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	stmts := []string{
		`CREATE TABLE annotations (
			id INTEGER PRIMARY KEY AUTOINCREMENT, reader_id INTEGER NOT NULL, book_id INTEGER NOT NULL,
			client_id VARCHAR(64), annotation_type VARCHAR(32) NOT NULL, is_private BOOLEAN DEFAULT 1,
			cfi TEXT, chapter VARCHAR(500) DEFAULT '', quote_text TEXT DEFAULT '', content TEXT DEFAULT '',
			color VARCHAR(32) DEFAULT '', author_name VARCHAR(255) DEFAULT '', user_modified_at DATETIME,
			create_time DATETIME NOT NULL, update_time DATETIME NOT NULL)`,
		`CREATE TABLE annotation_sources (
			id INTEGER PRIMARY KEY AUTOINCREMENT, annotation_id INTEGER NOT NULL, source_name VARCHAR(64) NOT NULL,
			source_connection_id VARCHAR(128) DEFAULT '', source_annotation_id VARCHAR(255),
			source_run_id VARCHAR(128), source_position TEXT, source_raw_hash VARCHAR(128),
			source_updated_at DATETIME, source_sync_status VARCHAR(16) DEFAULT 'synced',
			source_synced_at DATETIME, source_sync_error TEXT, create_time DATETIME NOT NULL,
			update_time DATETIME NOT NULL)`,
		`CREATE TABLE plugin_source_records (
			id INTEGER PRIMARY KEY AUTOINCREMENT, connection_id INTEGER, source VARCHAR(200),
			external_id VARCHAR(500), entity_type VARCHAR(64), entity_id VARCHAR(500), run_id INTEGER,
			raw_hash VARCHAR(64), remote_updated_at DATETIME, local_modified BOOLEAN DEFAULT 0,
			status VARCHAR(32) DEFAULT 'active', data TEXT, create_time DATETIME, update_time DATETIME,
			rolled_back_at DATETIME)`,
	}
	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			t.Fatalf("建表失败: %v\n%s", err, s)
		}
	}
	return db
}

// TestAnnotationCRUD 覆盖批注的完整读写。
func TestAnnotationCRUD(t *testing.T) {
	db := annDB(t)

	id, err := CreateAnnotation(db, &Annotation{
		ReaderID: 7, BookID: 1, ClientID: "c1", AnnotationType: "highlight", IsPrivate: true,
	})
	if err != nil {
		t.Fatalf("CreateAnnotation 失败: %v", err)
	}
	if id == 0 {
		t.Fatal("应返回非零 id")
	}

	got, err := GetAnnotationByID(db, id)
	if err != nil || got == nil {
		t.Fatalf("GetAnnotationByID = (%v,%v)", got, err)
	}
	if got.ReaderID != 7 || got.BookID != 1 || got.ClientID != "c1" || !got.IsPrivate {
		t.Errorf("字段不符: %+v", got)
	}

	// 按 client_id 查。
	byClient, err := FindAnnotationByClientID(db, 7, 1, "c1")
	if err != nil || byClient == nil || byClient.ID != id {
		t.Fatalf("FindAnnotationByClientID = (%v,%v)", byClient, err)
	}
	if missing, err := FindAnnotationByClientID(db, 7, 1, "nope"); err != nil || missing != nil {
		t.Errorf("不存在的 client_id 应返回 (nil,nil)，得到 (%v,%v)", missing, err)
	}

	// 按归属查。
	owned, err := GetOwnedAnnotation(db, id, 1, 7)
	if err != nil || owned == nil {
		t.Fatalf("GetOwnedAnnotation = (%v,%v)", owned, err)
	}
	if other, err := GetOwnedAnnotation(db, id, 1, 99); err != nil || other != nil {
		t.Errorf("他人查询应返回 (nil,nil)，得到 (%v,%v)", other, err)
	}
	if other, err := GetOwnedAnnotation(db, id, 2, 7); err != nil || other != nil {
		t.Errorf("错误 book_id 应返回 (nil,nil)，得到 (%v,%v)", other, err)
	}

	// 内容更新。
	priv := false
	cfi := "cfi1"
	changed, err := ApplyAnnotationContent(db, id, AnnotationContent{
		AnnotationType: "note", IsPrivate: &priv, CFI: &cfi,
		Chapter: "ch", QuoteText: "q", Content: "c", Color: "red", AuthorName: "au",
	})
	if err != nil || !changed {
		t.Fatalf("ApplyAnnotationContent = (%v,%v)", changed, err)
	}
	got, _ = GetAnnotationByID(db, id)
	if got.AnnotationType != "note" || got.IsPrivate || got.CFI != "cfi1" ||
		got.Chapter != "ch" || got.QuoteText != "q" || got.Content != "c" ||
		got.Color != "red" || got.AuthorName != "au" {
		t.Errorf("更新结果不符: %+v", got)
	}

	// 无变化时返回 false。
	changed, err = ApplyAnnotationContent(db, id, AnnotationContent{Content: "c"})
	if err != nil || changed {
		t.Errorf("无变化应返回 false，得到 (%v,%v)", changed, err)
	}

	// 补写 client_id。
	if err := SetAnnotationClientID(db, id, "c2"); err != nil {
		t.Fatalf("SetAnnotationClientID 失败: %v", err)
	}
	got, _ = GetAnnotationByID(db, id)
	if got.ClientID != "c2" {
		t.Errorf("client_id = %q, want c2", got.ClientID)
	}

	// 时间戳。
	if err := MarkAnnotationUserModified(db, id, "2026-01-01 00:00:00"); err != nil {
		t.Fatalf("MarkAnnotationUserModified 失败: %v", err)
	}
	if err := TouchAnnotation(db, id, "2026-02-01 00:00:00"); err != nil {
		t.Fatalf("TouchAnnotation 失败: %v", err)
	}
	got, _ = GetAnnotationByID(db, id)
	if got.UserModifiedAt != "2026-01-01 00:00:00" || got.UpdateTime != "2026-02-01 00:00:00" {
		t.Errorf("时间戳不符: %+v", got)
	}

	// 删除。
	if err := DeleteAnnotation(db, id); err != nil {
		t.Fatalf("DeleteAnnotation 失败: %v", err)
	}
	if got, _ := GetAnnotationByID(db, id); got != nil {
		t.Error("删除后应查不到")
	}
}

// TestAnnotationListScopes 覆盖三种可见范围。
func TestAnnotationListScopes(t *testing.T) {
	db := annDB(t)
	// 用户 7：一条私有、一条公开；用户 8：一条私有。
	mk := func(reader int64, priv bool, client string) {
		id, err := CreateAnnotation(db, &Annotation{
			ReaderID: reader, BookID: 1, ClientID: client, AnnotationType: "highlight", IsPrivate: priv,
		})
		if err != nil {
			t.Fatalf("创建失败: %v", err)
		}
		_ = id
	}
	mk(7, true, "a")
	mk(7, false, "b")
	mk(8, true, "c")

	// visible（用户 7）：自己的 2 条 + 公开的 1 条（自己的 b 已计入）。
	got, err := ListAnnotationsForBook(db, 1, 7, "visible")
	if err != nil || len(got) != 2 {
		t.Fatalf("visible 应有 2 条，得到 (%d,%v)", len(got), err)
	}
	// public：只有 b。
	got, err = ListAnnotationsForBook(db, 1, 7, "public")
	if err != nil || len(got) != 1 || got[0].ClientID != "b" {
		t.Fatalf("public 应只有 b，得到 (%v,%v)", got, err)
	}
	// mine：a 与 b。
	got, err = ListAnnotationsForBook(db, 1, 7, "mine")
	if err != nil || len(got) != 2 {
		t.Fatalf("mine 应有 2 条，得到 (%d,%v)", len(got), err)
	}
	// 用户 8 的 visible：自己的 c + 公开的 b。
	got, err = ListAnnotationsForBook(db, 1, 8, "visible")
	if err != nil || len(got) != 2 {
		t.Fatalf("用户 8 visible 应有 2 条，得到 (%d,%v)", len(got), err)
	}
}

// TestListAnnotationsByReader 覆盖按读者列出与 book_id 过滤。
func TestListAnnotationsByReader(t *testing.T) {
	db := annDB(t)
	for _, b := range []int64{1, 2} {
		if _, err := CreateAnnotation(db, &Annotation{
			ReaderID: 7, BookID: b, ClientID: "c" + string(rune('0'+b)), AnnotationType: "highlight",
		}); err != nil {
			t.Fatalf("创建失败: %v", err)
		}
	}

	all, err := ListAnnotationsByReader(db, 7, 0, false)
	if err != nil || len(all) != 2 {
		t.Fatalf("不过滤应有 2 条，得到 (%d,%v)", len(all), err)
	}
	one, err := ListAnnotationsByReader(db, 7, 1, true)
	if err != nil || len(one) != 1 || one[0].BookID != 1 {
		t.Fatalf("按 book_id 过滤应有 1 条，得到 (%v,%v)", one, err)
	}
}

// TestAnnotationSourceCRUD 覆盖来源副本的读写。
func TestAnnotationSourceCRUD(t *testing.T) {
	db := annDB(t)
	annID, err := CreateAnnotation(db, &Annotation{
		ReaderID: 7, BookID: 1, AnnotationType: "highlight", IsPrivate: false,
	})
	if err != nil {
		t.Fatalf("创建批注失败: %v", err)
	}

	src := &AnnotationSource{
		AnnotationID: annID, SourceName: "kindle", SourceConnectionID: "1",
		SourceAnnotationID: "a1", SourceRunID: "r1", SourcePosition: "pos",
		SourceRawHash: "h1", SourceUpdatedAt: "2026-01-01 00:00:00",
	}
	if err := CreateAnnotationSource(db, src); err != nil {
		t.Fatalf("CreateAnnotationSource 失败: %v", err)
	}

	got, err := FindAnnotationSource(db, 7, 1, "kindle", "1", "a1")
	if err != nil || got == nil {
		t.Fatalf("FindAnnotationSource = (%v,%v)", got, err)
	}
	if got.SourceRunID != "r1" || got.SourcePosition != "pos" || got.SourceRawHash != "h1" {
		t.Errorf("创建时字段未写入: %+v", got)
	}
	if got.SourceUpdatedAt != "2026-01-01 00:00:00" {
		t.Errorf("source_updated_at = %q", got.SourceUpdatedAt)
	}
	if got.SourceSyncStatus != "synced" {
		t.Errorf("source_sync_status = %q", got.SourceSyncStatus)
	}

	// 不存在。
	if missing, err := FindAnnotationSource(db, 7, 1, "nope", "", ""); err != nil || missing != nil {
		t.Errorf("不存在应返回 (nil,nil)，得到 (%v,%v)", missing, err)
	}

	// 更新。
	run := "r2"
	pos := "pos2"
	hash := "h2"
	upd := "2026-02-01 00:00:00"
	if err := UpdateAnnotationSource(db, got.ID, AnnotationSourceUpdate{
		RunID: &run, Position: &pos, RawHash: &hash, UpdatedAt: &upd,
		SyncStatus: "pending", SyncedAt: "2026-02-01 00:00:00",
	}); err != nil {
		t.Fatalf("UpdateAnnotationSource 失败: %v", err)
	}
	got, _ = FindAnnotationSource(db, 7, 1, "kindle", "1", "a1")
	if got.SourceRunID != "r2" || got.SourcePosition != "pos2" || got.SourceRawHash != "h2" ||
		got.SourceUpdatedAt != "2026-02-01 00:00:00" || got.SourceSyncStatus != "pending" {
		t.Errorf("更新结果不符: %+v", got)
	}

	// 按读者列出。
	list, err := ListAnnotationSourcesByReader(db, 7, 0, false)
	if err != nil || len(list) != 1 {
		t.Fatalf("ListAnnotationSourcesByReader = (%v,%v)", list, err)
	}
	list, err = ListAnnotationSourcesByReader(db, 7, 1, true)
	if err != nil || len(list) != 1 {
		t.Fatalf("按 book_id 过滤 = (%v,%v)", list, err)
	}
	list, err = ListAnnotationSourcesByReader(db, 7, 2, true)
	if err != nil || len(list) != 0 {
		t.Fatalf("不匹配的 book_id 应为空 = (%v,%v)", list, err)
	}

	// 删除。
	if err := DeleteAnnotationSource(db, got.ID); err != nil {
		t.Fatalf("DeleteAnnotationSource 失败: %v", err)
	}
	if got, _ := FindAnnotationSource(db, 7, 1, "kindle", "1", "a1"); got != nil {
		t.Error("删除后应查不到")
	}
}

// TestDeleteAnnotationCascadesSources 校验删除批注会连带删除来源。
func TestDeleteAnnotationCascadesSources(t *testing.T) {
	db := annDB(t)
	annID, _ := CreateAnnotation(db, &Annotation{ReaderID: 7, BookID: 1, AnnotationType: "highlight"})
	if err := CreateAnnotationSource(db, &AnnotationSource{
		AnnotationID: annID, SourceName: "kindle", SourceAnnotationID: "a1",
	}); err != nil {
		t.Fatalf("创建来源失败: %v", err)
	}

	if err := DeleteAnnotation(db, annID); err != nil {
		t.Fatalf("DeleteAnnotation 失败: %v", err)
	}
	list, err := ListAnnotationSourcesByReader(db, 7, 0, false)
	if err != nil || len(list) != 0 {
		t.Errorf("来源应被连带删除，得到 (%v,%v)", list, err)
	}
}

// TestMarkPluginRecordsLocallyModified 覆盖插件记录标记。
func TestMarkPluginRecordsLocallyModified(t *testing.T) {
	db := annDB(t)
	annID, _ := CreateAnnotation(db, &Annotation{ReaderID: 7, BookID: 1, AnnotationType: "highlight"})

	// 两条记录：连接 1 与连接 2。
	for _, cid := range []int{1, 2} {
		if _, err := db.Exec(`INSERT INTO plugin_source_records (connection_id, entity_type, entity_id,
			local_modified, update_time) VALUES (?, 'annotation', ?, 0, '2026-01-01 00:00:00')`,
			cid, itoa64(annID)); err != nil {
			t.Fatalf("插入失败: %v", err)
		}
	}

	// 不指定连接 → 两条都标记。
	if err := MarkPluginRecordsLocallyModified(db, annID, "2026-02-01 00:00:00", ""); err != nil {
		t.Fatalf("标记失败: %v", err)
	}
	var n int
	if err := db.QueryRow(`SELECT COUNT(*) FROM plugin_source_records WHERE local_modified = 1`).Scan(&n); err != nil {
		t.Fatalf("统计失败: %v", err)
	}
	if n != 2 {
		t.Errorf("应标记 2 条，得到 %d", n)
	}

	// 重置后只标记连接 1。
	if _, err := db.Exec(`UPDATE plugin_source_records SET local_modified = 0`); err != nil {
		t.Fatalf("重置失败: %v", err)
	}
	if err := MarkPluginRecordsLocallyModified(db, annID, "2026-03-01 00:00:00", "1"); err != nil {
		t.Fatalf("标记失败: %v", err)
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM plugin_source_records WHERE local_modified = 1`).Scan(&n); err != nil {
		t.Fatalf("统计失败: %v", err)
	}
	if n != 1 {
		t.Errorf("应只标记 1 条，得到 %d", n)
	}

	// 非数字连接 id → 直接返回，不报错也不标记。
	if _, err := db.Exec(`UPDATE plugin_source_records SET local_modified = 0`); err != nil {
		t.Fatalf("重置失败: %v", err)
	}
	if err := MarkPluginRecordsLocallyModified(db, annID, "2026-04-01 00:00:00", "not-a-number"); err != nil {
		t.Fatalf("非数字连接不应报错: %v", err)
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM plugin_source_records WHERE local_modified = 1`).Scan(&n); err != nil {
		t.Fatalf("统计失败: %v", err)
	}
	if n != 0 {
		t.Errorf("非数字连接不应标记任何记录，得到 %d", n)
	}
}

// TestAnnotationWriteErrors 覆盖写操作的错误分支。
func TestAnnotationWriteErrors(t *testing.T) {
	db := annDB(t)
	db.Close()

	if _, err := CreateAnnotation(db, &Annotation{ReaderID: 1, BookID: 1, AnnotationType: "highlight"}); err == nil {
		t.Error("CreateAnnotation 在库不可用时应报错")
	}
	if _, err := CreateAnnotation(db, nil); err == nil {
		t.Error("nil 参数应报错")
	}
	if _, err := ListAnnotationsForBook(db, 1, 1, "visible"); err == nil {
		t.Error("ListAnnotationsForBook 在库不可用时应报错")
	}
	if _, err := ListAnnotationsByReader(db, 1, 0, false); err == nil {
		t.Error("ListAnnotationsByReader 在库不可用时应报错")
	}
	if _, err := GetOwnedAnnotation(db, 1, 1, 1); err == nil {
		t.Error("GetOwnedAnnotation 在库不可用时应报错")
	}
	if _, err := FindAnnotationByClientID(db, 1, 1, "c"); err == nil {
		t.Error("FindAnnotationByClientID 在库不可用时应报错")
	}
	if err := SetAnnotationClientID(db, 1, "c"); err == nil {
		t.Error("SetAnnotationClientID 在库不可用时应报错")
	}
	if _, err := ApplyAnnotationContent(db, 1, AnnotationContent{Content: "x"}); err == nil {
		t.Error("ApplyAnnotationContent 在库不可用时应报错")
	}
	if err := MarkAnnotationUserModified(db, 1, "t"); err == nil {
		t.Error("MarkAnnotationUserModified 在库不可用时应报错")
	}
	if err := TouchAnnotation(db, 1, "t"); err == nil {
		t.Error("TouchAnnotation 在库不可用时应报错")
	}
	if err := DeleteAnnotation(db, 1); err == nil {
		t.Error("DeleteAnnotation 在库不可用时应报错")
	}
	if _, err := FindAnnotationSource(db, 1, 1, "s", "", ""); err == nil {
		t.Error("FindAnnotationSource 在库不可用时应报错")
	}
	if err := CreateAnnotationSource(db, &AnnotationSource{AnnotationID: 1, SourceName: "s"}); err == nil {
		t.Error("CreateAnnotationSource 在库不可用时应报错")
	}
	if err := CreateAnnotationSource(db, nil); err == nil {
		t.Error("nil 参数应报错")
	}
	if err := UpdateAnnotationSource(db, 1, AnnotationSourceUpdate{SyncStatus: "x"}); err == nil {
		t.Error("UpdateAnnotationSource 在库不可用时应报错")
	}
	if err := DeleteAnnotationSource(db, 1); err == nil {
		t.Error("DeleteAnnotationSource 在库不可用时应报错")
	}
	if _, err := ListAnnotationSourcesByReader(db, 1, 0, false); err == nil {
		t.Error("ListAnnotationSourcesByReader 在库不可用时应报错")
	}
	if err := MarkPluginRecordsLocallyModified(db, 1, "t", ""); err == nil {
		t.Error("MarkPluginRecordsLocallyModified 在库不可用时应报错")
	}
}

// TestApplyAnnotationContentMissing 覆盖批注不存在时的更新。
func TestApplyAnnotationContentMissing(t *testing.T) {
	db := annDB(t)
	changed, err := ApplyAnnotationContent(db, 99999, AnnotationContent{Content: "x"})
	if err != nil {
		t.Fatalf("不应报错: %v", err)
	}
	if changed {
		t.Error("不存在的批注应返回 false")
	}
}

// TestNullStr 覆盖空串转 NULL。
func TestNullStr(t *testing.T) {
	if nullStr("") != nil {
		t.Error("空串应转 nil")
	}
	if nullStr("x") != "x" {
		t.Error("非空串应原样返回")
	}
}

// itoa64 把 int64 转成十进制字符串。
func itoa64(v int64) string {
	if v == 0 {
		return "0"
	}
	neg := v < 0
	if neg {
		v = -v
	}
	var buf []byte
	for v > 0 {
		buf = append([]byte{byte('0' + v%10)}, buf...)
		v /= 10
	}
	if neg {
		return "-" + string(buf)
	}
	return string(buf)
}
