// Package asyncservice 移植 webserver/services/async_service.py。
//
// 职责：进程内的异步任务队列基础设施。每个注册的服务名对应一条
// 串行 worker（goroutine + channel），任务按入队顺序逐个执行；
// 单个任务失败只记日志，不中断该 worker 的后续任务。
//
// 与 Python 的差异：
//   - Python 用「每线程一个 SQLAlchemy session」；Go 侧用 database/sql，
//     连接池自身保证并发安全，因此不移植 session 生命周期管理。
//   - Python 的 SingletonType 元类在 Go 侧用 sync.Once 单例表达。
package asyncservice

import (
	"database/sql"
	"fmt"
	"log"
	"sync"
	"time"
)

// Task 是一个待执行的异步任务。
type Task struct {
	// Name 是任务名（对应 Python 的 service_func.__name__）。
	Name string
	// Args 是位置参数。
	Args []any
	// Run 是任务体。
	Run func(args []any) error
}

// queue 是一条服务队列：串行执行 + 未完成任务计数。
type queue struct {
	mu       sync.Mutex
	ch       chan Task
	pending  int
	closed   bool
	done     chan struct{}
	finished chan struct{}
}

// Service 是异步服务单例。
type Service struct {
	mu sync.Mutex
	// DB 是 Calibre 元数据库句柄。
	DB *sql.DB
	// UserDB 是 Talebook 自有库句柄（messages 表）。
	UserDB *sql.DB
	// queues 是 name -> 队列。
	queues map[string]*queue
	// Logger 便于测试注入；为空时用标准 log。
	Logger *log.Logger
	// Now 便于测试注入时间；为空时用 time.Now。
	Now func() time.Time
	// SyncMode 为 true 时 Run 同步执行（对应 Python 测试里的 async_mode 覆写）。
	SyncMode bool
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
	return &Service{queues: map[string]*queue{}}
}

// Setup 注入数据库句柄。
//
// 对应 Python 的 setup(calibre_db, session_maker)。
func (s *Service) Setup(db, userDB *sql.DB) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.DB = db
	s.UserDB = userDB
}

// now 返回当前时间。
func (s *Service) now() time.Time {
	if s.Now != nil {
		return s.Now()
	}
	return time.Now()
}

// logf 输出日志。
func (s *Service) logf(format string, args ...any) {
	if s.Logger != nil {
		s.Logger.Printf(format, args...)
		return
	}
	log.Printf(format, args...)
}

// UpgradeBusy 报告是否有未完成的异步任务。
//
// 对应 Python 的 upgrade_busy：升级前用它判断是否还有任务在跑。
func (s *Service) UpgradeBusy() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, q := range s.queues {
		q.mu.Lock()
		pending := q.pending
		q.mu.Unlock()
		if pending > 0 {
			return true
		}
	}
	return false
}

// GetQueue 返回指定服务的队列；不存在返回 nil。
//
// 对应 Python 的 get_queue。
func (s *Service) GetQueue(serviceName string) *Queue {
	s.mu.Lock()
	defer s.mu.Unlock()
	q, ok := s.queues[serviceName]
	if !ok {
		return nil
	}
	return &Queue{q: q, svc: s}
}

// StartService 启动（或复用）指定服务的 worker，返回其队列。
//
// 对应 Python 的 start_service：同名服务只启动一次。
func (s *Service) StartService(name string) *Queue {
	s.mu.Lock()
	defer s.mu.Unlock()

	if q, ok := s.queues[name]; ok {
		return &Queue{q: q, svc: s}
	}

	q := &queue{
		ch:       make(chan Task, 128),
		done:     make(chan struct{}),
		finished: make(chan struct{}),
	}
	s.queues[name] = q
	s.logf("** Start Thread Service <%s> **", name)
	go s.loop(q)
	return &Queue{q: q, svc: s}
}

// loop 是 worker 主循环：串行消费任务，单个任务失败不中断循环。
//
// 对应 Python 的 loop。
func (s *Service) loop(q *queue) {
	defer close(q.finished)
	for task := range q.ch {
		s.logf("call: func=%s, args=%v", task.Name, task.Args)
		if err := s.runTask(task); err != nil {
			s.logf("run task error: %v", err)
		}
		q.mu.Lock()
		q.pending--
		q.mu.Unlock()
		s.logf("end : func=%s, args=%v", task.Name, task.Args)
	}
}

// runTask 执行单个任务并捕获 panic。
func (s *Service) runTask(task Task) (err error) {
	defer func() {
		if rec := recover(); rec != nil {
			err = fmt.Errorf("asyncservice: 任务 panic: %v", rec)
		}
	}()
	if task.Run == nil {
		return nil
	}
	return task.Run(task.Args)
}

// Submit 把任务入队；服务未启动时先启动。
//
// 对应 Python 的 register_service 装饰器包装后的调用路径。
func (s *Service) Submit(name string, args []any, run func(args []any) error) {
	q := s.StartService(name)
	q.Push(Task{Name: name, Args: args, Run: run})
}

// Queue 是服务队列的对外句柄。
type Queue struct {
	q   *queue
	svc *Service
}

// Push 入队一个任务。
func (q *Queue) Push(task Task) {
	q.q.mu.Lock()
	if q.q.closed {
		q.q.mu.Unlock()
		return
	}
	q.q.pending++
	q.q.mu.Unlock()
	q.q.ch <- task
}

// Pending 返回未完成任务数。
func (q *Queue) Pending() int {
	q.q.mu.Lock()
	defer q.q.mu.Unlock()
	return q.q.pending
}

// Wait 阻塞直到队列中所有已入队任务完成。
//
// 对应 Python 的 Queue.join()。调用方需自行保证不再有新任务入队，
// 否则可能一直等待。
func (q *Queue) Wait() {
	for {
		q.q.mu.Lock()
		pending := q.q.pending
		q.q.mu.Unlock()
		if pending == 0 {
			return
		}
		time.Sleep(time.Millisecond)
	}
}

// Close 停止 worker 并等待其退出。
//
// 注意：先关闭 channel 再让 worker 退出，避免向已关闭 channel 发送导致 panic。
func (q *Queue) Close() {
	q.q.mu.Lock()
	if q.q.closed {
		q.q.mu.Unlock()
		return
	}
	q.q.closed = true
	q.q.mu.Unlock()

	close(q.q.ch)
	<-q.q.finished
}

// AddMsg 给用户写一条站内消息。
//
// 对应 Python 的 add_msg：reader_id 为空时不写。
func (s *Service) AddMsg(userID int64, status, msg string) error {
	if s.UserDB == nil || userID == 0 {
		return nil
	}
	now := s.now().Format("2006-01-02 15:04:05.000000")
	_, err := s.UserDB.Exec(`INSERT INTO messages
		(reader_id, title, status, unread, create_time, update_time, data)
		VALUES (?, '', ?, 1, ?, ?, ?)`,
		userID, status, now, now, fmt.Sprintf(`{"message":%q}`, msg))
	if err != nil {
		return fmt.Errorf("asyncservice: 写入消息失败: %w", err)
	}
	return nil
}

// AsyncMode 报告是否启用异步模式。
//
// 对应 Python 的 async_mode；测试可通过 SyncMode 字段切换为同步执行。
func (s *Service) AsyncMode() bool { return !s.SyncMode }

// Run 按 async_mode 决定同步执行还是入队。
//
// 对应 Python register_service 包装器的分支逻辑。
func (s *Service) Run(name string, args []any, run func(args []any) error) error {
	if !s.AsyncMode() {
		s.logf("[FUNC ] service call %s(%v)", name, args)
		return run(args)
	}
	s.logf("[ASYNC] service call %s(%v)", name, args)
	s.Submit(name, args, run)
	return nil
}
