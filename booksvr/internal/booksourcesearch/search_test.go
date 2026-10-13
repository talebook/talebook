package booksourcesearch

import (
	"errors"
	"sync"
	"testing"
	"time"
)

// okCall 返回固定结果。
func okCall(books ...map[string]any) SourceCall {
	return func(string, int) ([]map[string]any, error) { return books, nil }
}

// failCall 返回带 code 的错误。
func failCall(code string) SourceCall {
	return func(string, int) ([]map[string]any, error) {
		return nil, &codedError{code: code}
	}
}

type codedError struct{ code string }

func (e *codedError) Error() string { return "boom" }
func (e *codedError) Code() string  { return e.code }

// waitDone 轮询直到任务完成或超时。
func waitDone(t *testing.T, svc *Service, taskID string) *Status {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		st := svc.GetStatus(taskID)
		if st != nil && st.Done >= st.Total {
			return st
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatalf("task %s did not finish in time", taskID)
	return nil
}

func TestCreateTaskReturnsImmediately(t *testing.T) {
	svc := NewService()
	release := make(chan struct{})
	items := []SourceItem{{
		SourceID:   "s1",
		SourceName: "源1",
		Call: func(string, int) ([]map[string]any, error) {
			<-release
			return nil, nil
		},
	}}

	start := time.Now()
	taskID, total := svc.CreateTask("三体", 1, items)
	elapsed := time.Since(start)

	if elapsed > 500*time.Millisecond {
		t.Errorf("CreateTask blocked for %v", elapsed)
	}
	if total != 1 {
		t.Errorf("total = %d", total)
	}
	if taskID == "" {
		t.Error("task_id must be non-empty")
	}
	close(release)
}

func TestGetStatusUnknownTask(t *testing.T) {
	svc := NewService()
	if st := svc.GetStatus("nope"); st != nil {
		t.Errorf("got %+v, want nil", st)
	}
}

func TestSearchResultsGrouping(t *testing.T) {
	svc := NewService()
	items := []SourceItem{
		{SourceID: "s1", SourceName: "有结果", Call: okCall(map[string]any{"name": "书A"})},
		{SourceID: "s2", SourceName: "空结果", Call: okCall()},
		{SourceID: "s3", SourceName: "失败", Call: failCall("fetch_failed")},
	}
	taskID, _ := svc.CreateTask("三体", 1, items)
	st := waitDone(t, svc, taskID)

	if st.Total != 3 || st.Done != 3 {
		t.Fatalf("total=%d done=%d", st.Total, st.Done)
	}
	// 只有「有结果」的源进 results。
	if len(st.Results) != 1 {
		t.Fatalf("results = %v", st.Results)
	}
	if st.Results[0]["source_id"] != "s1" {
		t.Errorf("results[0] = %v", st.Results[0])
	}
	if len(st.Partial) != 1 || st.Partial[0]["error"] != "fetch_failed" {
		t.Errorf("partial = %v", st.Partial)
	}
	if len(st.Pending) != 0 {
		t.Errorf("pending = %v", st.Pending)
	}
}

func TestSearchErrorCodeFallback(t *testing.T) {
	svc := NewService()
	items := []SourceItem{{
		SourceID: "s1", SourceName: "源",
		Call: func(string, int) ([]map[string]any, error) {
			return nil, errors.New("plain failure")
		},
	}}
	taskID, _ := svc.CreateTask("q", 1, items)
	st := waitDone(t, svc, taskID)
	if st.Partial[0]["error"] != "fetch_failed" {
		t.Errorf("error = %v, want fetch_failed", st.Partial[0]["error"])
	}
}

func TestSearchCustomErrorCode(t *testing.T) {
	svc := NewService()
	items := []SourceItem{{SourceID: "s1", SourceName: "源", Call: failCall("js_unsupported")}}
	taskID, _ := svc.CreateTask("q", 1, items)
	st := waitDone(t, svc, taskID)
	if st.Partial[0]["error"] != "js_unsupported" {
		t.Errorf("error = %v", st.Partial[0]["error"])
	}
}

func TestPendingSourcesReported(t *testing.T) {
	svc := NewService()
	release := make(chan struct{})
	items := []SourceItem{
		{SourceID: "fast", SourceName: "快", Call: okCall(map[string]any{"n": 1})},
		{SourceID: "slow", SourceName: "慢", Call: func(string, int) ([]map[string]any, error) {
			<-release
			return nil, nil
		}},
	}
	taskID, _ := svc.CreateTask("q", 1, items)

	// 等到快源完成。
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		st := svc.GetStatus(taskID)
		if st != nil && st.Done >= 1 {
			if len(st.Pending) != 1 || st.Pending[0]["source_id"] != "slow" {
				t.Errorf("pending = %v", st.Pending)
			}
			if st.Finished {
				t.Error("must not be finished while a source is pending")
			}
			close(release)
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	close(release)
	t.Fatal("fast source did not complete")
}

func TestPopWeightUpdatesOnce(t *testing.T) {
	svc := NewService()
	legacy := int64(7)
	items := []SourceItem{
		{SourceID: "s1", SourceName: "源", LegacyID: legacy, Call: okCall(map[string]any{"n": 1})},
		{SourceID: "s2", SourceName: "空", LegacyID: int64(8), Call: okCall()},
	}
	taskID, _ := svc.CreateTask("q", 1, items)
	waitDone(t, svc, taskID)

	got := svc.PopWeightUpdates(taskID)
	if len(got) != 1 || got[0] != legacy {
		t.Fatalf("got %v, want [7]", got)
	}
	// 第二次必须为空（避免轮询重复加权）。
	if again := svc.PopWeightUpdates(taskID); len(again) != 0 {
		t.Errorf("second call = %v, want empty", again)
	}
}

func TestPopWeightUpdatesBeforeDone(t *testing.T) {
	svc := NewService()
	release := make(chan struct{})
	items := []SourceItem{{SourceID: "s1", SourceName: "源", LegacyID: int64(1),
		Call: func(string, int) ([]map[string]any, error) { <-release; return nil, nil }}}
	taskID, _ := svc.CreateTask("q", 1, items)
	if got := svc.PopWeightUpdates(taskID); len(got) != 0 {
		t.Errorf("got %v before completion", got)
	}
	close(release)
}

func TestPopHealthUpdatesGroupsByConnection(t *testing.T) {
	svc := NewService()
	conn := int64(5)
	items := []SourceItem{
		{SourceID: "s1", SourceName: "好", ConnectionID: &conn, Call: okCall(map[string]any{"n": 1})},
		{SourceID: "s2", SourceName: "坏", ConnectionID: &conn, Call: failCall("fetch_failed")},
	}
	taskID, _ := svc.CreateTask("q", 1, items)
	waitDone(t, svc, taskID)

	got := svc.PopHealthUpdates(taskID)
	if len(got) != 1 {
		t.Fatalf("got %v, want 1 group", got)
	}
	if got[0].ConnectionID != conn {
		t.Errorf("connection_id = %d", got[0].ConnectionID)
	}
	if got[0].Healthy {
		t.Error("one failure must mark the connection unhealthy")
	}
	if got[0].Message != "fetch_failed" {
		t.Errorf("message = %q", got[0].Message)
	}
	// 一次性。
	if again := svc.PopHealthUpdates(taskID); len(again) != 0 {
		t.Errorf("second call = %v", again)
	}
}

func TestPopHealthUpdatesSkipsBatchSources(t *testing.T) {
	svc := NewService()
	conn := int64(5)
	items := []SourceItem{{
		SourceID: "s1", SourceName: "源", ConnectionID: &conn,
		Batch: &RuntimeBatch{RunID: "run1"},
		Call:  okCall(map[string]any{"n": 1}),
	}}
	taskID, _ := svc.CreateTask("q", 1, items)
	waitDone(t, svc, taskID)

	// typed batch 的 health 由 finish_read_batch 统一结算。
	if got := svc.PopHealthUpdates(taskID); len(got) != 0 {
		t.Errorf("got %v, want empty for batch sources", got)
	}
}

func TestRuntimeBatchFinalizeCalled(t *testing.T) {
	svc := NewService()
	var (
		mu       sync.Mutex
		gotRunID string
		gotOut   map[string]any
	)
	batch := &RuntimeBatch{
		RunID: "run1",
		Finalize: func(b *RuntimeBatch, outcomes map[string]any) error {
			mu.Lock()
			defer mu.Unlock()
			gotRunID = b.RunID
			gotOut = outcomes
			return nil
		},
	}
	items := []SourceItem{{
		SourceID: "s1", SourceName: "源", Batch: batch,
		Call: okCall(map[string]any{"n": 1}),
	}}
	_, _ = svc.CreateTask("q", 1, items)

	// 等 finalize 被调用。
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		mu.Lock()
		done := gotRunID != ""
		mu.Unlock()
		if done {
			break
		}
		time.Sleep(5 * time.Millisecond)
	}
	mu.Lock()
	defer mu.Unlock()
	if gotRunID != "run1" {
		t.Fatalf("finalize not called, runID=%q", gotRunID)
	}
	if _, ok := gotOut["s1"]; !ok {
		t.Errorf("outcomes = %v", gotOut)
	}
}

func TestFinishedRequiresAuditSettlement(t *testing.T) {
	svc := NewService()
	block := make(chan struct{})
	batch := &RuntimeBatch{
		RunID: "run1",
		Finalize: func(*RuntimeBatch, map[string]any) error {
			<-block
			return nil
		},
	}
	items := []SourceItem{{
		SourceID: "s1", SourceName: "源", Batch: batch,
		Call: okCall(map[string]any{"n": 1}),
	}}
	taskID, _ := svc.CreateTask("q", 1, items)

	// 搜索已完成但审计未收口 → finished 必须为 false。
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		st := svc.GetStatus(taskID)
		if st != nil && st.Done >= st.Total {
			if st.Finished {
				close(block)
				t.Fatal("finished must be false while audit is unsettled")
			}
			break
		}
		time.Sleep(5 * time.Millisecond)
	}
	close(block)

	// 收口后 finished 变 true。
	deadline = time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		if st := svc.GetStatus(taskID); st != nil && st.Finished {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatal("finished did not become true after settlement")
}

func TestFinalizeFailureKeepsUnsettled(t *testing.T) {
	svc := NewService()
	batch := &RuntimeBatch{
		RunID:    "run1",
		Finalize: func(*RuntimeBatch, map[string]any) error { return errors.New("db down") },
	}
	items := []SourceItem{{
		SourceID: "s1", SourceName: "源", Batch: batch,
		Call: okCall(map[string]any{"n": 1}),
	}}
	taskID, _ := svc.CreateTask("q", 1, items)
	waitDone(t, svc, taskID)

	// finalize 失败 → 未 settled → 可由 request session 重试。
	updates := svc.PopRuntimeUpdates(taskID)
	if len(updates) != 1 {
		t.Fatalf("updates = %v, want 1 retryable batch", updates)
	}
	if updates[0].RunID != "run1" {
		t.Errorf("run_id = %s", updates[0].RunID)
	}
}

func TestSettleRuntimeUpdate(t *testing.T) {
	svc := NewService()
	batch := &RuntimeBatch{
		RunID:    "run1",
		Finalize: func(*RuntimeBatch, map[string]any) error { return errors.New("db down") },
	}
	items := []SourceItem{{
		SourceID: "s1", SourceName: "源", Batch: batch,
		Call: okCall(map[string]any{"n": 1}),
	}}
	taskID, _ := svc.CreateTask("q", 1, items)
	waitDone(t, svc, taskID)

	updates := svc.PopRuntimeUpdates(taskID)
	if len(updates) != 1 {
		t.Fatalf("updates = %v", updates)
	}
	// 认领后再次 pop 应为空（settling 中）。
	if again := svc.PopRuntimeUpdates(taskID); len(again) != 0 {
		t.Errorf("second pop = %v, want empty while settling", again)
	}

	svc.SettleRuntimeUpdate(taskID, "run1", true)
	if st := svc.GetStatus(taskID); !st.Finished {
		t.Error("finished must be true after successful settlement")
	}
}

func TestClaimWaitsForAllBatchSources(t *testing.T) {
	svc := NewService()
	release := make(chan struct{})
	batch := &RuntimeBatch{
		RunID:    "run1",
		Finalize: func(*RuntimeBatch, map[string]any) error { return nil },
	}
	items := []SourceItem{
		{SourceID: "s1", SourceName: "快", Batch: batch, Call: okCall(map[string]any{"n": 1})},
		{SourceID: "s2", SourceName: "慢", Batch: batch, Call: func(string, int) ([]map[string]any, error) {
			<-release
			return nil, nil
		}},
	}
	taskID, _ := svc.CreateTask("q", 1, items)

	// 快源完成后，同 batch 的慢源仍 pending → 不应认领。
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		if st := svc.GetStatus(taskID); st != nil && st.Done >= 1 {
			if updates := svc.PopRuntimeUpdates(taskID); len(updates) != 0 {
				close(release)
				t.Fatalf("must not claim while a batch source is pending: %v", updates)
			}
			break
		}
		time.Sleep(5 * time.Millisecond)
	}
	close(release)
}

func TestConfigureClampsWorkers(t *testing.T) {
	svc := NewService()
	for _, c := range []struct{ in, want int }{
		{0, 1}, {-5, 1}, {1, 1}, {50, 50}, {100, 100}, {999, 100},
	} {
		svc.Configure(c.in)
		if svc.workers != c.want {
			t.Errorf("Configure(%d) → workers=%d, want %d", c.in, svc.workers, c.want)
		}
	}
}

func TestConfigureReplacesPool(t *testing.T) {
	svc := NewService()
	svc.Configure(2)
	items := []SourceItem{{SourceID: "s1", SourceName: "源", Call: okCall(map[string]any{"n": 1})}}
	taskID, _ := svc.CreateTask("q", 1, items)
	waitDone(t, svc, taskID)

	// 搜索之后仍可调整并发。
	svc.Configure(5)
	if svc.workers != 5 {
		t.Errorf("workers = %d", svc.workers)
	}
	// 新任务仍能正常执行。
	taskID2, _ := svc.CreateTask("q2", 1, items)
	waitDone(t, svc, taskID2)
}

func TestCleanupRemovesExpiredTasks(t *testing.T) {
	svc := NewService()
	items := []SourceItem{{SourceID: "s1", SourceName: "源", Call: okCall(map[string]any{"n": 1})}}
	taskID, _ := svc.CreateTask("q", 1, items)
	waitDone(t, svc, taskID)

	// 手动把创建时间推到 TTL 之外。
	svc.mu.Lock()
	svc.tasks[taskID].createdAt = time.Now().Add(-(TaskTTL + 10) * time.Second)
	svc.mu.Unlock()

	svc.Cleanup()
	if svc.GetStatus(taskID) != nil {
		t.Error("expired task must be removed")
	}
}

func TestCleanupKeepsUnsettledAudit(t *testing.T) {
	svc := NewService()
	batch := &RuntimeBatch{
		RunID:    "run1",
		Finalize: func(*RuntimeBatch, map[string]any) error { return errors.New("db down") },
	}
	items := []SourceItem{{
		SourceID: "s1", SourceName: "源", Batch: batch,
		Call: okCall(map[string]any{"n": 1}),
	}}
	taskID, _ := svc.CreateTask("q", 1, items)
	waitDone(t, svc, taskID)

	svc.mu.Lock()
	svc.tasks[taskID].createdAt = time.Now().Add(-(TaskTTL + 10) * time.Second)
	svc.mu.Unlock()

	svc.Cleanup()
	// 审计未收口 → 保留任务，不把 durable run 永久留在 running。
	if svc.GetStatus(taskID) == nil {
		t.Error("task with pending audit must be retained")
	}
}

func TestCleanupKeepsFreshTasks(t *testing.T) {
	svc := NewService()
	items := []SourceItem{{SourceID: "s1", SourceName: "源", Call: okCall(map[string]any{"n": 1})}}
	taskID, _ := svc.CreateTask("q", 1, items)
	waitDone(t, svc, taskID)

	svc.Cleanup()
	if svc.GetStatus(taskID) == nil {
		t.Error("fresh task must be retained")
	}
}

func TestTaskCount(t *testing.T) {
	svc := NewService()
	if svc.TaskCount() != 0 {
		t.Errorf("count = %d", svc.TaskCount())
	}
	items := []SourceItem{{SourceID: "s1", SourceName: "源", Call: okCall()}}
	taskID, _ := svc.CreateTask("q", 1, items)
	waitDone(t, svc, taskID)
	if svc.TaskCount() != 1 {
		t.Errorf("count = %d, want 1", svc.TaskCount())
	}
}

func TestNewTaskIDFormat(t *testing.T) {
	a := newTaskID()
	if len(a) != 32 {
		t.Errorf("length = %d, want 32", len(a))
	}
	if a == newTaskID() {
		t.Error("ids must differ")
	}
}

func TestJoinMessages(t *testing.T) {
	if got := joinMessages(nil); got != "" {
		t.Errorf("got %q", got)
	}
	if got := joinMessages([]string{"a"}); got != "a" {
		t.Errorf("got %q", got)
	}
	if got := joinMessages([]string{"a", "b"}); got != "a; b" {
		t.Errorf("got %q", got)
	}
}

func TestErrorCodeOf(t *testing.T) {
	if got := errorCodeOf(nil); got != "" {
		t.Errorf("nil = %q", got)
	}
	if got := errorCodeOf(&codedError{code: "x"}); got != "x" {
		t.Errorf("coded = %q", got)
	}
	if got := errorCodeOf(errors.New("plain")); got != "fetch_failed" {
		t.Errorf("plain = %q", got)
	}
}

func TestInstanceIsSingleton(t *testing.T) {
	if Instance() != Instance() {
		t.Error("Instance must return the same object")
	}
}

func TestConcurrentTasksIsolated(t *testing.T) {
	svc := NewService()
	var ids []string
	for i := 0; i < 5; i++ {
		id, _ := svc.CreateTask("q", 1, []SourceItem{{
			SourceID: "s1", SourceName: "源", Call: okCall(map[string]any{"n": i}),
		}})
		ids = append(ids, id)
	}
	for _, id := range ids {
		st := waitDone(t, svc, id)
		if st.Total != 1 {
			t.Errorf("task %s total = %d", id, st.Total)
		}
	}
	// 全部 task_id 互不相同。
	seen := map[string]bool{}
	for _, id := range ids {
		if seen[id] {
			t.Errorf("duplicate task id %s", id)
		}
		seen[id] = true
	}
}

func TestWorkerPoolShutdownDoesNotBlock(t *testing.T) {
	pool := newWorkerPool(2)
	release := make(chan struct{})
	pool.submit(func() { <-release })

	done := make(chan struct{})
	go func() {
		pool.shutdown()
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("shutdown must not wait for in-flight jobs")
	}
	close(release)
}

func TestWorkerPoolSubmitAfterShutdown(t *testing.T) {
	pool := newWorkerPool(1)
	pool.shutdown()
	// 不应 panic。
	pool.submit(func() {})
}
