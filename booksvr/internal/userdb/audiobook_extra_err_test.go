package userdb

import (
	"database/sql"
	"testing"
)

// audioErrDB 返回一个已关闭的库，用于触达查询错误分支。
func audioErrDB(t *testing.T) *sql.DB {
	t.Helper()
	db := newSchemaDB(t)
	if err := db.Close(); err != nil {
		t.Fatalf("关闭失败: %v", err)
	}
	return db
}

// TestAudiobookExtraDBErrors 覆盖各查询函数的错误返回路径。
func TestAudiobookExtraDBErrors(t *testing.T) {
	db := audioErrDB(t)

	if _, err := ListPublishedAudiobookEditions(db); err == nil {
		t.Error("ListPublishedAudiobookEditions 应报错")
	}
	if _, err := ListAudiobookProgressFor(db, 1, []int64{1}); err == nil {
		t.Error("ListAudiobookProgressFor 应报错")
	}
	if _, err := CreateAudiobookBookmark(db, 1, 1, 1, 0, ""); err == nil {
		t.Error("CreateAudiobookBookmark 应报错")
	}
	if _, err := ListAudiobookJobs(db, 1, false); err == nil {
		t.Error("ListAudiobookJobs 应报错")
	}
	if _, err := AudiobookStatsForReader(db, 1); err == nil {
		t.Error("AudiobookStatsForReader 应报错")
	}
	if _, err := AudiobookAdminStats(db); err == nil {
		t.Error("AudiobookAdminStats 应报错")
	}
	if _, err := AudiobookJobByID(db, 1); err == nil {
		t.Error("AudiobookJobByID 应报错")
	}
	if _, err := AudiobookChapterByNumber(db, 1, 1); err == nil {
		t.Error("AudiobookChapterByNumber 应报错")
	}
	if err := UpsertAudiobookProgress(db, 1, 1, 1, 0, 0, false); err == nil {
		t.Error("UpsertAudiobookProgress 应报错")
	}
	if _, err := CreateAudiobookPlaybackSession(db, 1, 1, "", "", "", ""); err == nil {
		t.Error("CreateAudiobookPlaybackSession 应报错")
	}
	if err := UpdateAudiobookPlaybackSession(db, "x", 1, 0, 0, false, false); err == nil {
		t.Error("UpdateAudiobookPlaybackSession 应报错")
	}
}

// TestAudiobookStatsForReaderBookmarkError 覆盖书签计数查询失败分支。
func TestAudiobookStatsForReaderBookmarkError(t *testing.T) {
	db := newSchemaDB(t)
	if _, err := db.Exec(`DROP TABLE audiobook_bookmarks`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	if _, err := AudiobookStatsForReader(db, 1); err == nil {
		t.Error("书签表缺失时应报错")
	}
}

// TestAudiobookStatsForReaderSessionError 覆盖会话计数查询失败分支。
func TestAudiobookStatsForReaderSessionError(t *testing.T) {
	db := newSchemaDB(t)
	if _, err := db.Exec(`DROP TABLE audiobook_playback_sessions`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	if _, err := AudiobookStatsForReader(db, 1); err == nil {
		t.Error("会话表缺失时应报错")
	}
}

// TestAudiobookAdminStatsPartialError 覆盖统计查询中途失败分支。
func TestAudiobookAdminStatsPartialError(t *testing.T) {
	db := newSchemaDB(t)
	if _, err := db.Exec(`DROP TABLE audiobook_editions`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	if _, err := AudiobookAdminStats(db); err == nil {
		t.Error("版本表缺失时应报错")
	}
}

// TestListAudiobookJobsAdmin 覆盖管理员分支（无 WHERE 条件）。
func TestListAudiobookJobsAdmin(t *testing.T) {
	db := newSchemaDB(t)
	jobs, err := ListAudiobookJobs(db, 1, true)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if len(jobs) != 0 {
		t.Fatalf("空库应返回空列表: %+v", jobs)
	}
}
