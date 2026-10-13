// Package booksourcesearch 复刻 webserver/services/booksource_search.py。
//
// 网络书库搜索：任务化异步执行，前端轮询进度。
//
// 搜索需要并发访问多个外部书源，各源响应速度差异很大。旧实现在同步 handler
// 里用 `with ThreadPoolExecutor`，块退出时的 `shutdown(wait=True)` 会等所有任务
// 跑完，抵消了 `wait(timeout=...)` 的超时保护，整体被拖到 nginx 504。
//
// 这里改为：创建搜索任务后立即返回 task_id（不阻塞事件循环），由后台共享
// worker 池并发执行各源，每完成一个源就写回任务状态；前端轮询 status 逐步
// 获取已完成结果，快源先出、慢源不拖累。
package booksourcesearch

import (
	"crypto/rand"
	"encoding/hex"
	"sort"
	"sync"
	"time"
)

// TaskTTL 是任务保留时长（秒），超过后清理，避免内存堆积。
const TaskTTL = 300

// SourceCall 是单个书源的搜索调用（不得访问数据库 session）。
type SourceCall func(query string, page int) ([]map[string]any, error)

// RuntimeBatch 是一次审计批次（由 source_catalog 的 prepare_search 构造）。
type RuntimeBatch struct {
	RunID    string
	Finalize func(batch *RuntimeBatch, outcomes map[string]any) error
}

// SourceItem 是一个待搜索的书源。
type SourceItem struct {
	SourceID     string
	SourceName   string
	ConnectionID *int64
	LegacyID     any
	Call         SourceCall
	Batch        *RuntimeBatch
}

// sourceState 是单个书源的执行状态。
type sourceState struct {
	sourceID     string
	sourceName   string
	connectionID *int64
	legacyID     any
	state        string // pending / done / failed
	books        []map[string]any
	errCode      string
	outcome      any
	batchID      string
}

// task 是一次搜索任务。
type task struct {
	taskID     string
	key        string
	page       int
	createdAt  time.Time
	total      int
	done       int
	sources    map[string]*sourceState
	order      []string
	batches    map[string]*RuntimeBatch
	settled    map[string]bool
	settling   map[string]bool
	weighted   bool
	healthDone bool
}

// Service 是单例：管理网络书库搜索任务（task_id -> 进度），后台并发执行。
type Service struct {
	mu       sync.Mutex
	tasks    map[string]*task
	execMu   sync.Mutex
	executor *workerPool
	workers  int
}

var (
	instance     *Service
	instanceOnce sync.Once
)

// Instance 返回全局单例。
func Instance() *Service {
	instanceOnce.Do(func() {
		instance = &Service{
			tasks:   map[string]*task{},
			workers: 20,
		}
	})
	return instance
}

// NewService 构造独立实例（供测试使用，避免共享全局状态）。
func NewService() *Service {
	return &Service{tasks: map[string]*task{}, workers: 20}
}

// Configure 应用有界的 worker 数量，包括首次搜索之后。
func (s *Service) Configure(maxWorkers int) {
	if maxWorkers < 1 {
		maxWorkers = 1
	}
	if maxWorkers > 100 {
		maxWorkers = 100
	}
	s.execMu.Lock()
	if maxWorkers == s.workers {
		s.execMu.Unlock()
		return
	}
	s.workers = maxWorkers
	old := s.executor
	s.executor = nil
	s.execMu.Unlock()

	if old != nil {
		// 已提交的任务继续在旧池上运行。新任务立即使用替换后的池，
		// 而不是静默保持陈旧并发直到进程重启。
		old.shutdown()
	}
}

// ensureExecutorLocked 在持有 execMu 时取（或创建）worker 池。
func (s *Service) ensureExecutorLocked() *workerPool {
	if s.executor == nil {
		s.executor = newWorkerPool(s.workers)
	}
	return s.executor
}

// submitSources 提交全部书源。
//
// 在整个提交过程中持有生命周期锁，使 Configure 无法在取得池与 submit 之间
// 关闭该池。
func (s *Service) submitSources(t *task, items []SourceItem, query string, page int) {
	s.execMu.Lock()
	pool := s.ensureExecutorLocked()
	for _, item := range items {
		item := item
		pool.submit(func() { s.runOne(t.taskID, item, query, page) })
	}
	s.execMu.Unlock()
}

// CreateTask 创建搜索任务并把各源提交到后台池，立即返回 task_id 与总数。
func (s *Service) CreateTask(query string, page int, items []SourceItem) (string, int) {
	s.Cleanup()
	taskID := newTaskID()

	t := &task{
		taskID:    taskID,
		key:       query,
		page:      page,
		createdAt: time.Now(),
		total:     len(items),
		sources:   map[string]*sourceState{},
		batches:   map[string]*RuntimeBatch{},
		settled:   map[string]bool{},
		settling:  map[string]bool{},
	}
	for _, item := range items {
		batchID := ""
		if item.Batch != nil {
			batchID = item.Batch.RunID
			t.batches[batchID] = item.Batch
		}
		t.sources[item.SourceID] = &sourceState{
			sourceID:     item.SourceID,
			sourceName:   item.SourceName,
			connectionID: item.ConnectionID,
			legacyID:     item.LegacyID,
			state:        "pending",
			batchID:      batchID,
		}
		t.order = append(t.order, item.SourceID)
	}

	s.mu.Lock()
	s.tasks[taskID] = t
	s.mu.Unlock()

	s.submitSources(t, items, query, page)
	return taskID, t.total
}

// runOne 执行单个书源的搜索并写回状态。
func (s *Service) runOne(taskID string, item SourceItem, query string, page int) {
	state, errCode := "done", ""
	var books []map[string]any
	var outcome any

	if item.Call != nil {
		result, err := item.Call(query, page)
		if err != nil {
			state, errCode = "failed", errorCodeOf(err)
			outcome = err
		} else {
			books = result
			outcome = result
		}
	}

	s.mu.Lock()
	t := s.tasks[taskID]
	if t == nil {
		s.mu.Unlock()
		return
	}
	src := t.sources[item.SourceID]
	if src == nil || src.state != "pending" {
		s.mu.Unlock()
		return
	}
	src.state = state
	src.books = books
	src.errCode = errCode
	src.outcome = outcome
	s.mu.Unlock()

	// 不依赖客户端继续轮询：一个 connection 的所有 binding 结束后，
	// 立即用预绑定的独立 session 收口 run。
	//
	// 收口必须在发布 done 之前完成：否则 Done >= Total 会先于 batch 收口
	// 可见，轮询方（含测试）会在 settled 状态尚未落定时就观察到「已完成」。
	s.drainRuntimeBatches(taskID)

	s.mu.Lock()
	if t := s.tasks[taskID]; t != nil {
		t.done++
	}
	s.mu.Unlock()
}

// Status 是任务进度快照。
type Status struct {
	TaskID   string           `json:"task_id"`
	Total    int              `json:"total"`
	Done     int              `json:"done"`
	Finished bool             `json:"finished"`
	Results  []map[string]any `json:"results"`
	Partial  []map[string]any `json:"partial"`
	Pending  []map[string]any `json:"pending"`
}

// GetStatus 返回任务进度快照；任务不存在（或已过期）返回 nil。
func (s *Service) GetStatus(taskID string) *Status {
	s.mu.Lock()
	defer s.mu.Unlock()

	t := s.tasks[taskID]
	if t == nil {
		return nil
	}

	results := []map[string]any{}
	partial := []map[string]any{}
	pending := []map[string]any{}
	for _, sid := range t.order {
		src := t.sources[sid]
		switch src.state {
		case "done":
			if len(src.books) > 0 {
				results = append(results, map[string]any{
					"source_id":   src.sourceID,
					"source_name": src.sourceName,
					"books":       src.books,
				})
			}
		case "failed":
			partial = append(partial, map[string]any{
				"source_id":   src.sourceID,
				"source_name": src.sourceName,
				"error":       src.errCode,
			})
		default:
			pending = append(pending, map[string]any{
				"source_id":   src.sourceID,
				"source_name": src.sourceName,
			})
		}
	}

	workFinished := t.done >= t.total
	auditFinished := true
	for runID := range t.batches {
		if !t.settled[runID] {
			auditFinished = false
			break
		}
	}

	return &Status{
		TaskID: taskID,
		Total:  t.total,
		Done:   t.done,
		// 对前端而言，搜索与 durable run 审计都收口后才算 finished；
		// 避免最后一个 worker 与 status 请求之间的竞态。
		Finished: workFinished && auditFinished,
		Results:  results,
		Partial:  partial,
		Pending:  pending,
	}
}

// PopWeightUpdates 返回本次搜索「有结果」的源 id 列表用于权重 +1。
//
// 只在任务首次完成时返回一次（之后标记 weighted，避免轮询重复加权）。
// 权重的实际写库由调用方（handler，持有 DB session）完成。
func (s *Service) PopWeightUpdates(taskID string) []any {
	s.mu.Lock()
	defer s.mu.Unlock()

	t := s.tasks[taskID]
	if t == nil || t.done < t.total || t.weighted {
		return nil
	}
	t.weighted = true
	var out []any
	for _, sid := range t.order {
		src := t.sources[sid]
		if src.state == "done" && len(src.books) > 0 && src.legacyID != nil {
			out = append(out, src.legacyID)
		}
	}
	return out
}

// HealthUpdate 是一次性的连接健康更新。
type HealthUpdate struct {
	ConnectionID int64
	Healthy      bool
	Message      string
}

// PopHealthUpdates 返回一次性的连接健康更新，由请求线程负责写库。
func (s *Service) PopHealthUpdates(taskID string) []HealthUpdate {
	s.mu.Lock()
	defer s.mu.Unlock()

	t := s.tasks[taskID]
	if t == nil || t.healthDone {
		return nil
	}
	t.healthDone = true

	type agg struct {
		healthy  bool
		messages []string
	}
	grouped := map[int64]*agg{}
	var order []int64
	for _, sid := range t.order {
		src := t.sources[sid]
		if src.batchID != "" {
			// typed batch 的 health 由 finish_read_batch 统一结算。
			continue
		}
		if src.connectionID == nil || src.state == "pending" {
			continue
		}
		connID := *src.connectionID
		current, ok := grouped[connID]
		if !ok {
			current = &agg{healthy: true}
			grouped[connID] = current
			order = append(order, connID)
		}
		if src.state != "done" {
			current.healthy = false
			if src.errCode != "" {
				current.messages = append(current.messages, src.errCode)
			}
		}
	}

	out := make([]HealthUpdate, 0, len(order))
	for _, connID := range order {
		value := grouped[connID]
		out = append(out, HealthUpdate{
			ConnectionID: connID,
			Healthy:      value.healthy,
			Message:      joinMessages(value.messages),
		})
	}
	return out
}

// RuntimeUpdate 是一次可由 request session 重试的审计收口。
type RuntimeUpdate struct {
	RunID    string
	Batch    *RuntimeBatch
	Outcomes map[string]any
}

// PopRuntimeUpdates 在后台 finalizer 失败时，返回可由 request session 重试的 batch。
func (s *Service) PopRuntimeUpdates(taskID string) []RuntimeUpdate {
	return s.claimRuntimeUpdates(taskID)
}

// claimRuntimeUpdates 认领待收口的 batch（标记 settling 防止重复认领）。
func (s *Service) claimRuntimeUpdates(taskID string) []RuntimeUpdate {
	s.mu.Lock()
	defer s.mu.Unlock()

	t := s.tasks[taskID]
	if t == nil {
		return nil
	}
	var updates []RuntimeUpdate
	// 按 run_id 排序保证确定性。
	runIDs := make([]string, 0, len(t.batches))
	for runID := range t.batches {
		runIDs = append(runIDs, runID)
	}
	sort.Strings(runIDs)

	for _, runID := range runIDs {
		if t.settled[runID] || t.settling[runID] {
			continue
		}
		var sources []*sourceState
		for _, sid := range t.order {
			if t.sources[sid].batchID == runID {
				sources = append(sources, t.sources[sid])
			}
		}
		if len(sources) == 0 {
			continue
		}
		stillPending := false
		for _, src := range sources {
			if src.state == "pending" {
				stillPending = true
				break
			}
		}
		if stillPending {
			continue
		}
		t.settling[runID] = true
		outcomes := map[string]any{}
		for _, src := range sources {
			outcomes[src.sourceID] = src.outcome
		}
		updates = append(updates, RuntimeUpdate{
			RunID:    runID,
			Batch:    t.batches[runID],
			Outcomes: outcomes,
		})
	}
	return updates
}

// SettleRuntimeUpdate 只在 durable run 已成功持久化后标记 settled。
func (s *Service) SettleRuntimeUpdate(taskID, runID string, succeeded bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	t := s.tasks[taskID]
	if t == nil {
		return
	}
	delete(t.settling, runID)
	if succeeded {
		t.settled[runID] = true
	}
}

// drainRuntimeBatches 尝试立即收口全部待处理 batch。
func (s *Service) drainRuntimeBatches(taskID string) {
	for _, update := range s.claimRuntimeUpdates(taskID) {
		if update.Batch == nil || update.Batch.Finalize == nil {
			s.SettleRuntimeUpdate(taskID, update.RunID, false)
			continue
		}
		if err := update.Batch.Finalize(update.Batch, update.Outcomes); err != nil {
			s.SettleRuntimeUpdate(taskID, update.RunID, false)
		} else {
			s.SettleRuntimeUpdate(taskID, update.RunID, true)
		}
	}
}

// Cleanup 清理过期任务。
func (s *Service) Cleanup() {
	now := time.Now()

	s.mu.Lock()
	var expired []string
	for tid, t := range s.tasks {
		if now.Sub(t.createdAt) > TaskTTL*time.Second {
			expired = append(expired, tid)
		}
	}
	s.mu.Unlock()

	for _, tid := range expired {
		s.drainRuntimeBatches(tid)
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	for _, tid := range expired {
		t := s.tasks[tid]
		if t == nil {
			continue
		}
		pendingAudit := false
		for runID := range t.batches {
			if !t.settled[runID] {
				pendingAudit = true
				break
			}
		}
		if pendingAudit {
			// 持久化暂时失败时保留收口材料，下一次 cleanup 再试，
			// 不把 durable run 永久留在 running。
			t.createdAt = now
			continue
		}
		delete(s.tasks, tid)
	}
}

// TaskCount 返回当前存活任务数（供测试与运维观测）。
func (s *Service) TaskCount() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.tasks)
}

// newTaskID 复刻 uuid.uuid4().hex。
func newTaskID() string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return ""
	}
	return hex.EncodeToString(buf)
}

// joinMessages 复刻 Python `"; ".join(messages)`。
func joinMessages(messages []string) string {
	out := ""
	for i, m := range messages {
		if i > 0 {
			out += "; "
		}
		out += m
	}
	return out
}

// errorCodeOf 取错误的 code（默认 fetch_failed）。
func errorCodeOf(err error) string {
	if err == nil {
		return ""
	}
	if coder, ok := err.(interface{ Code() string }); ok {
		if c := coder.Code(); c != "" {
			return c
		}
	}
	return "fetch_failed"
}
