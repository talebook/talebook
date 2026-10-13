package userdb

import (
	"database/sql"
	"testing"

	_ "modernc.org/sqlite"
)

// annBadDB 建一个列数不匹配的 annotations 表，用于触发 Scan 失败。
func annBadDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if _, err := db.Exec(`CREATE TABLE annotations (id, reader_id, book_id, client_id,
		annotation_type, is_private, cfi, chapter, quote_text, content, color, author_name,
		user_modified_at, create_time, update_time)`); err != nil {
		t.Fatalf("建表失败: %v", err)
	}
	// id 存文本 → Scan 到 *int64 失败。
	if _, err := db.Exec(`INSERT INTO annotations VALUES
		('bad', 7, 1, 'c', 'highlight', 1, '', '', '', '', '', '', '', 'c', 'u')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	return db
}

// TestAnnotationScanErrors 覆盖行扫描失败分支。
func TestAnnotationScanErrors(t *testing.T) {
	db := annBadDB(t)

	if _, err := ListAnnotationsForBook(db, 1, 7, "visible"); err == nil {
		t.Error("ListAnnotationsForBook 扫描失败应报错")
	}
	if _, err := ListAnnotationsByReader(db, 7, 0, false); err == nil {
		t.Error("ListAnnotationsByReader 扫描失败应报错")
	}
	// id 是文本，按 id 查不到行 → 返回 (nil,nil)，不是错误。
	if got, err := GetOwnedAnnotation(db, 1, 1, 7); err != nil || got != nil {
		t.Errorf("文本 id 应查不到，得到 (%v,%v)", got, err)
	}
	if _, err := FindAnnotationByClientID(db, 7, 1, "c"); err == nil {
		t.Error("FindAnnotationByClientID 扫描失败应报错")
	}
}

// TestAnnotationSourceScanErrors 覆盖来源副本的扫描失败分支。
func TestAnnotationSourceScanErrors(t *testing.T) {
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if _, err := db.Exec(`CREATE TABLE annotations (id INTEGER PRIMARY KEY, reader_id INTEGER, book_id INTEGER)`); err != nil {
		t.Fatalf("建表失败: %v", err)
	}
	if _, err := db.Exec(`CREATE TABLE annotation_sources (id, annotation_id, source_name,
		source_connection_id, source_annotation_id, source_run_id, source_position, source_raw_hash,
		source_updated_at, source_sync_status, source_synced_at, source_sync_error, create_time, update_time)`); err != nil {
		t.Fatalf("建表失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO annotations (id, reader_id, book_id) VALUES (1, 7, 1)`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO annotation_sources VALUES
		('bad', 1, 's', '', 'a', '', '', '', '', 'synced', '', '', 'c', 'u')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}

	if _, err := FindAnnotationSource(db, 7, 1, "s", "", "a"); err == nil {
		t.Error("FindAnnotationSource 扫描失败应报错")
	}
	if _, err := ListAnnotationSourcesByReader(db, 7, 0, false); err == nil {
		t.Error("ListAnnotationSourcesByReader 扫描失败应报错")
	}
}

// TestCreateAnnotationSourceError 覆盖来源创建失败。
func TestCreateAnnotationSourceError(t *testing.T) {
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if _, err := db.Exec(`CREATE TABLE annotation_sources (
		id INTEGER PRIMARY KEY, annotation_id INTEGER, source_name TEXT, source_connection_id TEXT,
		source_annotation_id TEXT, source_run_id TEXT, source_position TEXT, source_raw_hash TEXT,
		source_updated_at TEXT, source_sync_status TEXT, source_synced_at TEXT, source_sync_error TEXT,
		create_time TEXT, update_time TEXT, CHECK (source_name <> 'forbidden'))`); err != nil {
		t.Fatalf("建表失败: %v", err)
	}
	if err := CreateAnnotationSource(db, &AnnotationSource{AnnotationID: 1, SourceName: "forbidden"}); err == nil {
		t.Error("违反约束时应报错")
	}
}

// TestDeleteAnnotationSourceError 覆盖来源删除失败。
func TestDeleteAnnotationSourceError(t *testing.T) {
	db := annDB(t)
	annID, _ := CreateAnnotation(db, &Annotation{ReaderID: 7, BookID: 1, AnnotationType: "highlight"})
	if err := CreateAnnotationSource(db, &AnnotationSource{
		AnnotationID: annID, SourceName: "s", SourceAnnotationID: "a",
	}); err != nil {
		t.Fatalf("创建失败: %v", err)
	}
	if _, err := db.Exec(`CREATE TRIGGER block_del BEFORE DELETE ON annotation_sources
		BEGIN SELECT RAISE(ABORT, 'blocked'); END`); err != nil {
		t.Fatalf("建触发器失败: %v", err)
	}
	if err := DeleteAnnotationSource(db, 1); err == nil {
		t.Error("触发器阻止时应报错")
	}
}

// TestDeleteAnnotationError 覆盖批注删除失败。
func TestDeleteAnnotationError(t *testing.T) {
	db := annDB(t)
	annID, _ := CreateAnnotation(db, &Annotation{ReaderID: 7, BookID: 1, AnnotationType: "highlight"})
	if _, err := db.Exec(`CREATE TRIGGER block_ann_del BEFORE DELETE ON annotations
		BEGIN SELECT RAISE(ABORT, 'blocked'); END`); err != nil {
		t.Fatalf("建触发器失败: %v", err)
	}
	if err := DeleteAnnotation(db, annID); err == nil {
		t.Error("触发器阻止时应报错")
	}
}

// TestApplyAnnotationContentUpdateError 覆盖内容更新写库失败。
func TestApplyAnnotationContentUpdateError(t *testing.T) {
	db := annDB(t)
	annID, _ := CreateAnnotation(db, &Annotation{ReaderID: 7, BookID: 1, AnnotationType: "highlight"})
	if _, err := db.Exec(`CREATE TRIGGER block_upd BEFORE UPDATE ON annotations
		BEGIN SELECT RAISE(ABORT, 'blocked'); END`); err != nil {
		t.Fatalf("建触发器失败: %v", err)
	}
	if _, err := ApplyAnnotationContent(db, annID, AnnotationContent{Content: "x"}); err == nil {
		t.Error("触发器阻止时应报错")
	}
}

// TestMarkAnnotationUserModifiedError 覆盖时间戳更新失败。
func TestMarkAnnotationUserModifiedError(t *testing.T) {
	db := annDB(t)
	annID, _ := CreateAnnotation(db, &Annotation{ReaderID: 7, BookID: 1, AnnotationType: "highlight"})
	if _, err := db.Exec(`CREATE TRIGGER block_um BEFORE UPDATE ON annotations
		BEGIN SELECT RAISE(ABORT, 'blocked'); END`); err != nil {
		t.Fatalf("建触发器失败: %v", err)
	}
	if err := MarkAnnotationUserModified(db, annID, "t"); err == nil {
		t.Error("触发器阻止时应报错")
	}
	if err := TouchAnnotation(db, annID, "t"); err == nil {
		t.Error("触发器阻止时应报错")
	}
}

// TestSetAnnotationClientIDError 覆盖 client_id 更新失败。
func TestSetAnnotationClientIDError(t *testing.T) {
	db := annDB(t)
	annID, _ := CreateAnnotation(db, &Annotation{ReaderID: 7, BookID: 1, AnnotationType: "highlight"})
	if _, err := db.Exec(`CREATE TRIGGER block_cid BEFORE UPDATE ON annotations
		BEGIN SELECT RAISE(ABORT, 'blocked'); END`); err != nil {
		t.Fatalf("建触发器失败: %v", err)
	}
	if err := SetAnnotationClientID(db, annID, "c"); err == nil {
		t.Error("触发器阻止时应报错")
	}
}

// TestUpdateAnnotationSourceError 覆盖来源更新失败。
func TestUpdateAnnotationSourceError(t *testing.T) {
	db := annDB(t)
	annID, _ := CreateAnnotation(db, &Annotation{ReaderID: 7, BookID: 1, AnnotationType: "highlight"})
	if err := CreateAnnotationSource(db, &AnnotationSource{
		AnnotationID: annID, SourceName: "s", SourceAnnotationID: "a",
	}); err != nil {
		t.Fatalf("创建失败: %v", err)
	}
	if _, err := db.Exec(`CREATE TRIGGER block_src_upd BEFORE UPDATE ON annotation_sources
		BEGIN SELECT RAISE(ABORT, 'blocked'); END`); err != nil {
		t.Fatalf("建触发器失败: %v", err)
	}
	if err := UpdateAnnotationSource(db, 1, AnnotationSourceUpdate{SyncStatus: "x"}); err == nil {
		t.Error("触发器阻止时应报错")
	}
}

// TestCreateAnnotationLastInsertID 覆盖创建成功路径的 id 返回。
func TestCreateAnnotationLastInsertID(t *testing.T) {
	db := annDB(t)
	id1, err := CreateAnnotation(db, &Annotation{ReaderID: 7, BookID: 1, AnnotationType: "highlight"})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	id2, err := CreateAnnotation(db, &Annotation{ReaderID: 7, BookID: 1, AnnotationType: "note"})
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if id2 <= id1 {
		t.Errorf("id 应递增，得到 %d 与 %d", id1, id2)
	}
}

// TestCreateAnnotationError 覆盖创建失败。
func TestCreateAnnotationError(t *testing.T) {
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if _, err := db.Exec(`CREATE TABLE annotations (
		id INTEGER PRIMARY KEY AUTOINCREMENT, reader_id INTEGER, book_id INTEGER, client_id TEXT,
		annotation_type TEXT, is_private INTEGER, cfi TEXT, chapter TEXT, quote_text TEXT, content TEXT,
		color TEXT, author_name TEXT, user_modified_at TEXT, create_time TEXT, update_time TEXT,
		CHECK (annotation_type <> 'forbidden'))`); err != nil {
		t.Fatalf("建表失败: %v", err)
	}
	if _, err := CreateAnnotation(db, &Annotation{ReaderID: 1, BookID: 1, AnnotationType: "forbidden"}); err == nil {
		t.Error("违反约束时应报错")
	}
}

// TestMarkPluginRecordsError 覆盖插件记录更新失败。
func TestMarkPluginRecordsError(t *testing.T) {
	db := annDB(t)
	if _, err := db.Exec(`CREATE TRIGGER block_psr BEFORE UPDATE ON plugin_source_records
		BEGIN SELECT RAISE(ABORT, 'blocked'); END`); err != nil {
		t.Fatalf("建触发器失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO plugin_source_records (connection_id, entity_type, entity_id,
		local_modified, update_time) VALUES (1, 'annotation', '1', 0, 't')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if err := MarkPluginRecordsLocallyModified(db, 1, "t", ""); err == nil {
		t.Error("触发器阻止时应报错")
	}
}
