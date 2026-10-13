// Package background 复刻 webserver/services/background_service.py。
//
// 后台任务管理服务：进程内单例，记录 autofill / scan / audio / convert /
// online_save 等长任务的进度，供前端轮询。
package background

import (
	"sort"
	"sync"
	"time"
)

// 服务类型。
const (
	ServiceTypeAutofill        = "autofill"          // 图书信息刮削
	ServiceTypeScan            = "scan"              // 批量图书导入
	ServiceTypeAudio           = "audio"             // 音频转换
	ServiceTypeAudioImport     = "audio_import"      // 有声书导入
	ServiceTypeConvert         = "convert"           // 图书转换
	ServiceTypeAIFill          = "ai_fill"           // AI 更新
	ServiceTypeTitleSortUpdate = "title_sort_update" // 更新拼音书名
	ServiceTypeOnlineSave      = "online_save"       // 网络小说保存到本地
)

// 任务状态。
const (
	StatusRunning   = "running"
	StatusCompleted = "completed"
	StatusCancelled = "cancelled"
	StatusFailed    = "failed"
)

// replaceTypes 是「新任务替换同类型运行中任务」的服务类型集合。
var replaceTypes = map[string]bool{
	ServiceTypeAutofill:    true,
	ServiceTypeScan:        true,
	ServiceTypeAIFill:      true,
	ServiceTypeAudioImport: true,
}

// Task 是后台任务记录。
type Task struct {
	ID            int64          `json:"id"`
	ServiceType   string         `json:"service_type"`
	ServiceItem   string         `json:"service_item"`
	Tag           string         `json:"tag"`
	ServiceBookID int64          `json:"service_book_id"`
	Status        string         `json:"status"`
	Progress      int            `json:"progress"`
	ProgressData  map[string]any `json:"progress_data"`
	CreateTime    time.Time      `json:"-"`
	UpdateTime    time.Time      `json:"-"`
	ErrorMessage  string         `json:"error_message"`
}

// ToDict 复刻 BackgroundTask.to_dict。
func (t *Task) ToDict() map[string]any {
	if t == nil {
		return nil
	}
	var errMsg any
	if t.ErrorMessage != "" {
		errMsg = t.ErrorMessage
	}
	return map[string]any{
		"id":              t.ID,
		"service_type":    t.ServiceType,
		"service_item":    t.ServiceItem,
		"tag":             t.Tag,
		"service_book_id": t.ServiceBookID,
		"status":          t.Status,
		"progress":        t.Progress,
		"progress_data":   t.ProgressData,
		"create_time":     t.CreateTime.Format("2006-01-02T15:04:05.000000"),
		"update_time":     t.UpdateTime.Format("2006-01-02T15:04:05.000000"),
		"error_message":   errMsg,
	}
}

// Service 是后台任务管理服务（进程内单例）。
type Service struct {
	mu          sync.Mutex
	tasks       map[int64]*Task
	nextID      int64
	lastCleanup time.Time
}

var (
	instance     *Service
	instanceOnce sync.Once
)

// Instance 返回全局单例。
func Instance() *Service {
	instanceOnce.Do(func() {
		instance = NewService()
	})
	return instance
}

// NewService 构造独立实例（供测试使用，避免共享全局状态）。
func NewService() *Service {
	return &Service{tasks: map[int64]*Task{}, lastCleanup: time.Now()}
}

// AddTask 创建任务；失败时返回 nil（与 Python 的 try/except 一致）。
func (s *Service) AddTask(serviceType, serviceItem string, bookID int64, tag string) *Task {
	return s.UpdateTask(serviceType, serviceItem, bookID, 0,
		map[string]any{"total": 1, "done": 0}, "", tag)
}

// UpdateTask 更新或创建任务状态。
func (s *Service) UpdateTask(serviceType, serviceItem string, bookID int64, progress int,
	progressData map[string]any, errorMessage, tag string) *Task {
	// 每小时触发一次清理，避免 tasks 无限增长。
	now := time.Now()
	if now.Sub(s.lastCleanup).Seconds() > 3600 {
		s.CleanupOldTasks(7)
		s.lastCleanup = now
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// 对于 autofill、scan 和 ai_fill 等类型，替换现有任务。
	if replaceTypes[serviceType] {
		for id, t := range s.tasks {
			if t.ServiceType == serviceType && t.Status == StatusRunning {
				delete(s.tasks, id)
			}
		}
	}

	s.nextID++
	if progressData == nil {
		progressData = map[string]any{}
	}
	task := &Task{
		ID:            s.nextID,
		ServiceType:   serviceType,
		ServiceItem:   serviceItem,
		Tag:           tag,
		ServiceBookID: bookID,
		Status:        StatusRunning,
		Progress:      progress,
		ProgressData:  progressData,
		CreateTime:    now,
		UpdateTime:    now,
	}
	if errorMessage != "" {
		task.ErrorMessage = errorMessage
		task.Status = StatusFailed
	}
	s.tasks[task.ID] = task

	// 对于音频转换任务，清理旧记录。
	if serviceType == ServiceTypeAudio {
		s.cleanupAudioTasksLocked()
	}
	return task
}

// UpdateProgress 更新任务进度；任务不存在返回 false。
func (s *Service) UpdateProgress(taskID int64, progress int,
	progressData map[string]any, errorMessage string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	task := s.tasks[taskID]
	if task == nil {
		return false
	}
	task.Progress = progress
	task.UpdateTime = time.Now()
	if len(progressData) > 0 {
		task.ProgressData = progressData
	}
	if errorMessage != "" {
		task.ErrorMessage = errorMessage
		task.Status = StatusFailed
	}
	return true
}

// CompleteTask 标记任务为完成状态；任务不存在返回 false。
func (s *Service) CompleteTask(taskID int64, errorMessage string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	task := s.tasks[taskID]
	if task == nil {
		return false
	}
	task.Status = StatusCompleted
	task.Progress = 100
	task.UpdateTime = time.Now()
	if errorMessage != "" {
		task.ErrorMessage = errorMessage
		task.Status = StatusFailed
	}
	return true
}

// CancelTask 取消任务；任务不存在返回 false。
func (s *Service) CancelTask(taskID int64) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	task := s.tasks[taskID]
	if task == nil {
		return false
	}
	task.Status = StatusCancelled
	task.UpdateTime = time.Now()
	return true
}

// AudioProgressFunc 由调用方注入音频转换进度查询。
//
// 对应 Python 的 `from webserver.handlers.audio import AudioConversion`：
// 该模块在 Python 代码库中**并不存在**，因此导入恒抛 ImportError，
// 进度恒为 0。Go 侧保留同名钩子以便未来接线，未注入时行为与 Python 一致。
type AudioProgressFunc func(bookID int64) (converted, total int, ok bool)

// audioProgress 是音频进度查询钩子；未注入时视为无进度（与 Python 一致）。
var audioProgress AudioProgressFunc

// SetAudioProgressFunc 注入音频进度查询实现。
//
// 当前生产代码未调用（Python 侧的对应模块不存在）；保留供未来音频模块接线。
func SetAudioProgressFunc(fn AudioProgressFunc) {
	audioProgress = fn
}

// GetRunningTasks 获取正在运行的任务列表，按更新时间倒序。
func (s *Service) GetRunningTasks(limit int) []map[string]any {
	s.mu.Lock()
	defer s.mu.Unlock()

	var running []*Task
	for _, t := range s.tasks {
		if t.Status == StatusRunning {
			running = append(running, t)
		}
	}

	// 音频任务用外部进度覆盖。
	for _, t := range running {
		if t.ServiceType == ServiceTypeAudio && t.ServiceBookID > 0 {
			if audioProgress != nil {
				converted, total, ok := audioProgress(t.ServiceBookID)
				if ok && total > 0 {
					t.Progress = converted * 100 / total
				} else {
					t.Progress = 0
				}
			} else {
				t.Progress = 0
			}
		}
	}

	sortByUpdateDesc(running)
	if limit >= 0 && len(running) > limit {
		running = running[:limit]
	}

	out := make([]map[string]any, 0, len(running))
	for _, t := range running {
		out = append(out, t.ToDict())
	}
	return out
}

// GetTask 获取指定任务的详细信息；不存在返回 nil。
func (s *Service) GetTask(taskID int64) map[string]any {
	s.mu.Lock()
	defer s.mu.Unlock()

	task := s.tasks[taskID]
	if task == nil {
		return nil
	}
	return task.ToDict()
}

// GetTaskByService 按服务类型与服务项目取最新的运行中任务。
func (s *Service) GetTaskByService(serviceType, serviceItem string) map[string]any {
	s.mu.Lock()
	defer s.mu.Unlock()

	var matching []*Task
	for _, t := range s.tasks {
		if t.ServiceType == serviceType && t.ServiceItem == serviceItem &&
			t.Status == StatusRunning {
			matching = append(matching, t)
		}
	}
	if len(matching) == 0 {
		return nil
	}
	// 返回最新创建的任务。
	sortByCreateDesc(matching)
	return matching[0].ToDict()
}

// GetTaskByTag 按 tag 获取最近一条任务（优先运行中，否则取最近更新的一条）。
//
// 用于前端按请求参数（如 online_save:{source_id}:{book_url}）定位任务并轮询进度。
func (s *Service) GetTaskByTag(tag string) map[string]any {
	if tag == "" {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()

	var matching []*Task
	for _, t := range s.tasks {
		if t.Tag == tag {
			matching = append(matching, t)
		}
	}
	if len(matching) == 0 {
		return nil
	}
	var running []*Task
	for _, t := range matching {
		if t.Status == StatusRunning {
			running = append(running, t)
		}
	}
	pool := running
	if len(pool) == 0 {
		pool = matching
	}
	sortByUpdateDesc(pool)
	return pool[0].ToDict()
}

// cleanupAudioTasksLocked 清理音频转换任务的旧记录：保留 24 小时内的记录，最多保留 10 条。
//
// 调用方必须持有 s.mu。
func (s *Service) cleanupAudioTasksLocked() {
	threshold := time.Now().Add(-24 * time.Hour)

	var audioTasks []*Task
	for _, t := range s.tasks {
		if t.ServiceType == ServiceTypeAudio {
			audioTasks = append(audioTasks, t)
		}
	}
	sortByUpdateDesc(audioTasks)

	for idx, t := range audioTasks {
		// 保留前 10 条记录。
		if idx < 10 {
			continue
		}
		// 删除超过 24 小时的记录。
		if t.UpdateTime.Before(threshold) {
			delete(s.tasks, t.ID)
		}
	}
}

// CleanupOldTasks 清理超过指定天数的已完成、已取消或失败的任务。
func (s *Service) CleanupOldTasks(days int) {
	s.mu.Lock()
	defer s.mu.Unlock()

	threshold := time.Now().Add(-time.Duration(days) * 24 * time.Hour)
	for id, t := range s.tasks {
		switch t.Status {
		case StatusCompleted, StatusCancelled, StatusFailed:
			if t.UpdateTime.Before(threshold) {
				delete(s.tasks, id)
			}
		}
	}
}

// TaskCount 返回当前任务数（供测试与运维观测）。
func (s *Service) TaskCount() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.tasks)
}

// sortByUpdateDesc 按更新时间倒序；同值时按 id 倒序保证确定性。
func sortByUpdateDesc(tasks []*Task) {
	sort.Slice(tasks, func(i, j int) bool {
		if !tasks[i].UpdateTime.Equal(tasks[j].UpdateTime) {
			return tasks[i].UpdateTime.After(tasks[j].UpdateTime)
		}
		return tasks[i].ID > tasks[j].ID
	})
}

// sortByCreateDesc 按创建时间倒序；同值时按 id 倒序保证确定性。
func sortByCreateDesc(tasks []*Task) {
	sort.Slice(tasks, func(i, j int) bool {
		if !tasks[i].CreateTime.Equal(tasks[j].CreateTime) {
			return tasks[i].CreateTime.After(tasks[j].CreateTime)
		}
		return tasks[i].ID > tasks[j].ID
	})
}
