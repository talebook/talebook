package background

import (
	"testing"
	"time"
)

func TestAddTaskDefaults(t *testing.T) {
	s := NewService()
	task := s.AddTask(ServiceTypeOnlineSave, "[online]三体", 0, "tag1")
	if task == nil {
		t.Fatal("AddTask returned nil")
	}
	if task.ID != 1 {
		t.Errorf("id = %d, want 1", task.ID)
	}
	if task.Status != StatusRunning {
		t.Errorf("status = %s", task.Status)
	}
	if task.Progress != 0 {
		t.Errorf("progress = %d", task.Progress)
	}
	// AddTask 的 progress_data 固定为 {"total":1,"done":0}。
	if task.ProgressData["total"] != 1 || task.ProgressData["done"] != 0 {
		t.Errorf("progress_data = %v", task.ProgressData)
	}
	if task.Tag != "tag1" {
		t.Errorf("tag = %s", task.Tag)
	}
}

func TestTaskIDsIncrement(t *testing.T) {
	s := NewService()
	a := s.AddTask(ServiceTypeOnlineSave, "a", 0, "")
	b := s.AddTask(ServiceTypeOnlineSave, "b", 0, "")
	if b.ID != a.ID+1 {
		t.Errorf("ids = %d, %d", a.ID, b.ID)
	}
}

func TestUpdateTaskReplacesRunningSameType(t *testing.T) {
	s := NewService()
	first := s.AddTask(ServiceTypeAutofill, "第一次", 0, "")
	second := s.AddTask(ServiceTypeAutofill, "第二次", 0, "")

	// 旧任务被移除。
	if s.GetTask(first.ID) != nil {
		t.Error("previous running task must be replaced")
	}
	if s.GetTask(second.ID) == nil {
		t.Error("new task must exist")
	}
	if s.TaskCount() != 1 {
		t.Errorf("count = %d, want 1", s.TaskCount())
	}
}

func TestUpdateTaskDoesNotReplaceCompleted(t *testing.T) {
	s := NewService()
	first := s.AddTask(ServiceTypeAutofill, "第一次", 0, "")
	s.CompleteTask(first.ID, "")

	second := s.AddTask(ServiceTypeAutofill, "第二次", 0, "")
	// 已完成的任务不被替换。
	if s.GetTask(first.ID) == nil {
		t.Error("completed task must be retained")
	}
	if s.GetTask(second.ID) == nil {
		t.Error("new task must exist")
	}
	if s.TaskCount() != 2 {
		t.Errorf("count = %d, want 2", s.TaskCount())
	}
}

func TestUpdateTaskNonReplaceTypeKeepsBoth(t *testing.T) {
	s := NewService()
	a := s.AddTask(ServiceTypeOnlineSave, "a", 0, "")
	b := s.AddTask(ServiceTypeOnlineSave, "b", 0, "")
	if s.GetTask(a.ID) == nil || s.GetTask(b.ID) == nil {
		t.Error("online_save must not replace running tasks")
	}
}

func TestUpdateTaskWithErrorMarksFailed(t *testing.T) {
	s := NewService()
	task := s.UpdateTask(ServiceTypeOnlineSave, "x", 0, 0, nil, "boom", "")
	if task.Status != StatusFailed {
		t.Errorf("status = %s, want failed", task.Status)
	}
	if task.ErrorMessage != "boom" {
		t.Errorf("error_message = %s", task.ErrorMessage)
	}
}

func TestUpdateProgress(t *testing.T) {
	s := NewService()
	task := s.AddTask(ServiceTypeOnlineSave, "x", 0, "")

	if !s.UpdateProgress(task.ID, 50, map[string]any{"done": 5}, "") {
		t.Fatal("UpdateProgress must succeed")
	}
	got := s.GetTask(task.ID)
	if got["progress"] != 50 {
		t.Errorf("progress = %v", got["progress"])
	}
	if got["progress_data"].(map[string]any)["done"] != 5 {
		t.Errorf("progress_data = %v", got["progress_data"])
	}
}

func TestUpdateProgressMissingTask(t *testing.T) {
	s := NewService()
	if s.UpdateProgress(999, 50, nil, "") {
		t.Error("missing task must return false")
	}
}

func TestUpdateProgressEmptyDataKeepsOld(t *testing.T) {
	s := NewService()
	task := s.AddTask(ServiceTypeOnlineSave, "x", 0, "")
	s.UpdateProgress(task.ID, 10, map[string]any{"done": 1}, "")
	// 空 progress_data 不覆盖旧值。
	s.UpdateProgress(task.ID, 20, nil, "")
	got := s.GetTask(task.ID)
	if got["progress_data"].(map[string]any)["done"] != 1 {
		t.Errorf("progress_data = %v", got["progress_data"])
	}
}

func TestUpdateProgressWithErrorMarksFailed(t *testing.T) {
	s := NewService()
	task := s.AddTask(ServiceTypeOnlineSave, "x", 0, "")
	s.UpdateProgress(task.ID, 30, nil, "network down")
	got := s.GetTask(task.ID)
	if got["status"] != StatusFailed {
		t.Errorf("status = %v", got["status"])
	}
	if got["error_message"] != "network down" {
		t.Errorf("error_message = %v", got["error_message"])
	}
}

func TestCompleteTask(t *testing.T) {
	s := NewService()
	task := s.AddTask(ServiceTypeOnlineSave, "x", 0, "")
	if !s.CompleteTask(task.ID, "") {
		t.Fatal("CompleteTask must succeed")
	}
	got := s.GetTask(task.ID)
	if got["status"] != StatusCompleted {
		t.Errorf("status = %v", got["status"])
	}
	if got["progress"] != 100 {
		t.Errorf("progress = %v", got["progress"])
	}
}

func TestCompleteTaskWithErrorMarksFailed(t *testing.T) {
	s := NewService()
	task := s.AddTask(ServiceTypeOnlineSave, "x", 0, "")
	s.CompleteTask(task.ID, "failed at end")
	got := s.GetTask(task.ID)
	// 有 error_message 时状态被覆盖为 failed。
	if got["status"] != StatusFailed {
		t.Errorf("status = %v, want failed", got["status"])
	}
	if got["error_message"] != "failed at end" {
		t.Errorf("error_message = %v", got["error_message"])
	}
}

func TestCompleteTaskMissing(t *testing.T) {
	s := NewService()
	if s.CompleteTask(999, "") {
		t.Error("missing task must return false")
	}
}

func TestCancelTask(t *testing.T) {
	s := NewService()
	task := s.AddTask(ServiceTypeOnlineSave, "x", 0, "")
	if !s.CancelTask(task.ID) {
		t.Fatal("CancelTask must succeed")
	}
	if s.GetTask(task.ID)["status"] != StatusCancelled {
		t.Errorf("status = %v", s.GetTask(task.ID)["status"])
	}
}

func TestCancelTaskMissing(t *testing.T) {
	s := NewService()
	if s.CancelTask(999) {
		t.Error("missing task must return false")
	}
}

func TestGetRunningTasksExcludesFinished(t *testing.T) {
	s := NewService()
	a := s.AddTask(ServiceTypeOnlineSave, "a", 0, "")
	b := s.AddTask(ServiceTypeOnlineSave, "b", 0, "")
	s.CompleteTask(a.ID, "")

	got := s.GetRunningTasks(50)
	if len(got) != 1 {
		t.Fatalf("len = %d, want 1", len(got))
	}
	if got[0]["id"] != b.ID {
		t.Errorf("id = %v", got[0]["id"])
	}
}

func TestGetRunningTasksSortedByUpdateDesc(t *testing.T) {
	s := NewService()
	a := s.AddTask(ServiceTypeOnlineSave, "a", 0, "")
	b := s.AddTask(ServiceTypeOnlineSave, "b", 0, "")
	// 让 a 的更新时间更晚。
	time.Sleep(2 * time.Millisecond)
	s.UpdateProgress(a.ID, 10, nil, "")

	got := s.GetRunningTasks(50)
	if len(got) != 2 {
		t.Fatalf("len = %d", len(got))
	}
	if got[0]["id"] != a.ID {
		t.Errorf("first = %v, want %d (most recently updated)", got[0]["id"], a.ID)
	}
	_ = b
}

func TestGetRunningTasksLimit(t *testing.T) {
	s := NewService()
	for i := 0; i < 5; i++ {
		s.AddTask(ServiceTypeOnlineSave, "x", 0, "")
	}
	if got := s.GetRunningTasks(2); len(got) != 2 {
		t.Errorf("len = %d, want 2", len(got))
	}
}

func TestGetRunningTasksAudioProgress(t *testing.T) {
	s := NewService()
	task := s.AddTask(ServiceTypeAudio, "audio", 42, "")

	SetAudioProgressFunc(func(bookID int64) (int, int, bool) {
		if bookID != 42 {
			t.Errorf("book_id = %d", bookID)
		}
		return 3, 10, true
	})
	defer SetAudioProgressFunc(nil)

	got := s.GetRunningTasks(50)
	if len(got) != 1 {
		t.Fatalf("len = %d", len(got))
	}
	// 3/10 → 30%。
	if got[0]["progress"] != 30 {
		t.Errorf("progress = %v, want 30", got[0]["progress"])
	}
	_ = task
}

func TestGetRunningTasksAudioZeroTotal(t *testing.T) {
	s := NewService()
	s.AddTask(ServiceTypeAudio, "audio", 42, "")
	SetAudioProgressFunc(func(int64) (int, int, bool) { return 0, 0, true })
	defer SetAudioProgressFunc(nil)

	got := s.GetRunningTasks(50)
	if got[0]["progress"] != 0 {
		t.Errorf("progress = %v, want 0 when total is 0", got[0]["progress"])
	}
}

func TestGetRunningTasksAudioNoHook(t *testing.T) {
	s := NewService()
	s.AddTask(ServiceTypeAudio, "audio", 42, "")
	SetAudioProgressFunc(nil)

	got := s.GetRunningTasks(50)
	if got[0]["progress"] != 0 {
		t.Errorf("progress = %v, want 0 without hook", got[0]["progress"])
	}
}

func TestGetTaskByService(t *testing.T) {
	s := NewService()
	task := s.AddTask(ServiceTypeScan, "扫描", 0, "")
	got := s.GetTaskByService(ServiceTypeScan, "扫描")
	if got == nil {
		t.Fatal("expected task")
	}
	if got["id"] != task.ID {
		t.Errorf("id = %v", got["id"])
	}
}

func TestGetTaskByServiceOnlyRunning(t *testing.T) {
	s := NewService()
	task := s.AddTask(ServiceTypeScan, "扫描", 0, "")
	s.CompleteTask(task.ID, "")
	if got := s.GetTaskByService(ServiceTypeScan, "扫描"); got != nil {
		t.Errorf("got %v, want nil for completed task", got)
	}
}

func TestGetTaskByServiceReturnsNewest(t *testing.T) {
	s := NewService()
	// scan 会替换同类型运行中任务，用 online_save 验证「取最新」。
	first := s.AddTask(ServiceTypeOnlineSave, "同名", 0, "")
	time.Sleep(2 * time.Millisecond)
	second := s.AddTask(ServiceTypeOnlineSave, "同名", 0, "")

	got := s.GetTaskByService(ServiceTypeOnlineSave, "同名")
	if got["id"] != second.ID {
		t.Errorf("id = %v, want %d (newest)", got["id"], second.ID)
	}
	_ = first
}

func TestGetTaskByTagPrefersRunning(t *testing.T) {
	s := NewService()
	old := s.AddTask(ServiceTypeOnlineSave, "old", 0, "same-tag")
	s.CompleteTask(old.ID, "")
	time.Sleep(2 * time.Millisecond)
	running := s.AddTask(ServiceTypeOnlineSave, "running", 0, "same-tag")

	got := s.GetTaskByTag("same-tag")
	if got["id"] != running.ID {
		t.Errorf("id = %v, want %d (running preferred)", got["id"], running.ID)
	}
}

func TestGetTaskByTagFallsBackToLatest(t *testing.T) {
	s := NewService()
	a := s.AddTask(ServiceTypeOnlineSave, "a", 0, "t")
	s.CompleteTask(a.ID, "")
	time.Sleep(2 * time.Millisecond)
	b := s.AddTask(ServiceTypeOnlineSave, "b", 0, "t")
	s.CompleteTask(b.ID, "")

	got := s.GetTaskByTag("t")
	if got["id"] != b.ID {
		t.Errorf("id = %v, want %d (latest updated)", got["id"], b.ID)
	}
}

func TestGetTaskByTagEmpty(t *testing.T) {
	s := NewService()
	s.AddTask(ServiceTypeOnlineSave, "x", 0, "")
	if got := s.GetTaskByTag(""); got != nil {
		t.Errorf("got %v, want nil for empty tag", got)
	}
}

func TestGetTaskByTagNoMatch(t *testing.T) {
	s := NewService()
	s.AddTask(ServiceTypeOnlineSave, "x", 0, "other")
	if got := s.GetTaskByTag("nope"); got != nil {
		t.Errorf("got %v, want nil", got)
	}
}

func TestCleanupAudioTasksKeepsTen(t *testing.T) {
	s := NewService()
	// 建 12 条音频任务，全部设为 25 小时前更新。
	for i := 0; i < 12; i++ {
		s.AddTask(ServiceTypeAudio, "audio", 0, "")
	}
	s.mu.Lock()
	for _, task := range s.tasks {
		task.UpdateTime = time.Now().Add(-25 * time.Hour)
	}
	s.mu.Unlock()

	// 再建一条音频任务触发清理。
	s.AddTask(ServiceTypeAudio, "audio", 0, "")

	// 保留前 10 条（按更新时间倒序），其余超 24 小时的被删。
	if got := s.TaskCount(); got != 10 {
		t.Errorf("count = %d, want 10", got)
	}
}

func TestCleanupAudioTasksKeepsRecent(t *testing.T) {
	s := NewService()
	for i := 0; i < 12; i++ {
		s.AddTask(ServiceTypeAudio, "audio", 0, "")
	}
	// 全部是刚创建的（未超 24 小时）→ 不删。
	s.AddTask(ServiceTypeAudio, "audio", 0, "")
	if got := s.TaskCount(); got != 13 {
		t.Errorf("count = %d, want 13 (recent tasks retained)", got)
	}
}

func TestCleanupOldTasks(t *testing.T) {
	s := NewService()
	old := s.AddTask(ServiceTypeOnlineSave, "old", 0, "")
	s.CompleteTask(old.ID, "")
	fresh := s.AddTask(ServiceTypeOnlineSave, "fresh", 0, "")
	s.CompleteTask(fresh.ID, "")

	// 把 old 推到 8 天前。
	s.mu.Lock()
	s.tasks[old.ID].UpdateTime = time.Now().Add(-8 * 24 * time.Hour)
	s.mu.Unlock()

	s.CleanupOldTasks(7)
	if s.GetTask(old.ID) != nil {
		t.Error("old completed task must be removed")
	}
	if s.GetTask(fresh.ID) == nil {
		t.Error("fresh task must be retained")
	}
}

func TestCleanupOldTasksKeepsRunning(t *testing.T) {
	s := NewService()
	task := s.AddTask(ServiceTypeOnlineSave, "running", 0, "")
	s.mu.Lock()
	s.tasks[task.ID].UpdateTime = time.Now().Add(-30 * 24 * time.Hour)
	s.mu.Unlock()

	s.CleanupOldTasks(7)
	// 运行中的任务永不被清理。
	if s.GetTask(task.ID) == nil {
		t.Error("running task must never be cleaned up")
	}
}

func TestToDictShape(t *testing.T) {
	s := NewService()
	task := s.AddTask(ServiceTypeOnlineSave, "item", 7, "tag")
	got := task.ToDict()

	for _, key := range []string{"id", "service_type", "service_item", "tag",
		"service_book_id", "status", "progress", "progress_data",
		"create_time", "update_time", "error_message"} {
		if _, ok := got[key]; !ok {
			t.Errorf("missing key %s", key)
		}
	}
	if got["service_book_id"] != int64(7) {
		t.Errorf("service_book_id = %v", got["service_book_id"])
	}
	// 无错误时 error_message 为 nil。
	if got["error_message"] != nil {
		t.Errorf("error_message = %v, want nil", got["error_message"])
	}
}

func TestToDictNil(t *testing.T) {
	var task *Task
	if got := task.ToDict(); got != nil {
		t.Errorf("got %v, want nil", got)
	}
}

func TestInstanceIsSingleton(t *testing.T) {
	if Instance() != Instance() {
		t.Error("Instance must return the same object")
	}
}

func TestServiceTypeConstants(t *testing.T) {
	want := map[string]string{
		ServiceTypeAutofill:        "autofill",
		ServiceTypeScan:            "scan",
		ServiceTypeAudio:           "audio",
		ServiceTypeAudioImport:     "audio_import",
		ServiceTypeConvert:         "convert",
		ServiceTypeAIFill:          "ai_fill",
		ServiceTypeTitleSortUpdate: "title_sort_update",
		ServiceTypeOnlineSave:      "online_save",
	}
	for got, expect := range want {
		if got != expect {
			t.Errorf("got %q, want %q", got, expect)
		}
	}
}

func TestStatusConstants(t *testing.T) {
	if StatusRunning != "running" || StatusCompleted != "completed" ||
		StatusCancelled != "cancelled" || StatusFailed != "failed" {
		t.Error("status constants mismatch")
	}
}

func TestUpdateTaskTriggersHourlyCleanup(t *testing.T) {
	s := NewService()
	// 造一条 8 天前完成的旧任务。
	old := s.AddTask(ServiceTypeOnlineSave, "old", 0, "")
	s.CompleteTask(old.ID, "")
	s.mu.Lock()
	s.tasks[old.ID].UpdateTime = time.Now().Add(-8 * 24 * time.Hour)
	// 把上次清理时间推到 1 小时前，触发自动清理。
	s.lastCleanup = time.Now().Add(-2 * time.Hour)
	s.mu.Unlock()

	// 任意一次 UpdateTask 应触发清理。
	s.AddTask(ServiceTypeOnlineSave, "new", 0, "")

	if s.GetTask(old.ID) != nil {
		t.Error("hourly cleanup must remove the stale completed task")
	}
}

func TestSortByCreateDescTieBreaksByID(t *testing.T) {
	// 同一时刻创建的任务：按 id 倒序保证确定性。
	now := time.Now()
	tasks := []*Task{
		{ID: 1, CreateTime: now},
		{ID: 3, CreateTime: now},
		{ID: 2, CreateTime: now},
	}
	sortByCreateDesc(tasks)
	if tasks[0].ID != 3 || tasks[1].ID != 2 || tasks[2].ID != 1 {
		t.Errorf("order = %d,%d,%d, want 3,2,1", tasks[0].ID, tasks[1].ID, tasks[2].ID)
	}
}

func TestSortByUpdateDescTieBreaksByID(t *testing.T) {
	now := time.Now()
	tasks := []*Task{
		{ID: 1, UpdateTime: now},
		{ID: 3, UpdateTime: now},
		{ID: 2, UpdateTime: now},
	}
	sortByUpdateDesc(tasks)
	if tasks[0].ID != 3 || tasks[1].ID != 2 || tasks[2].ID != 1 {
		t.Errorf("order = %d,%d,%d, want 3,2,1", tasks[0].ID, tasks[1].ID, tasks[2].ID)
	}
}

func TestConcurrentAccess(t *testing.T) {
	s := NewService()
	done := make(chan struct{})
	for i := 0; i < 8; i++ {
		go func() {
			defer func() { done <- struct{}{} }()
			for j := 0; j < 50; j++ {
				task := s.AddTask(ServiceTypeOnlineSave, "x", 0, "t")
				s.UpdateProgress(task.ID, j, nil, "")
				s.GetRunningTasks(10)
				s.GetTaskByTag("t")
			}
		}()
	}
	for i := 0; i < 8; i++ {
		<-done
	}
}
