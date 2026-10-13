package asyncservice

import (
	"database/sql"
	"errors"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	_ "modernc.org/sqlite"
)

// newSchemaDB 打开一份内存库并建 messages 表。
func newSchemaDB(t *testing.T) *sql.DB {
	t.Helper()
	path := filepath.Join("..", "userdb", "testdata", "schema.sql")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Skipf("schema.sql 不存在，跳过: %v", err)
	}
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	db.SetMaxOpenConns(1)
	t.Cleanup(func() { _ = db.Close() })

	for _, stmt := range strings.Split(string(raw), ";") {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" {
			continue
		}
		if _, err := db.Exec(stmt); err != nil {
			t.Fatalf("建表失败: %v\n%s", err, stmt)
		}
	}
	return db
}

// seedReader 插入一个读者并返回 id。
func seedReader(t *testing.T, db *sql.DB) int64 {
	t.Helper()
	res, err := db.Exec(`INSERT INTO readers (username, password, admin, create_time)
		VALUES ('u', 'x', 0, '2026-01-01 00:00:00.000000')`)
	if err != nil {
		t.Fatalf("插入读者失败: %v", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		t.Fatalf("取读者 id 失败: %v", err)
	}
	return id
}

// ---- 单例 ----

// TestInstanceIsSingleton 覆盖全局单例。
func TestInstanceIsSingleton(t *testing.T) {
	if Instance() != Instance() {
		t.Error("Instance 应返回同一实例")
	}
}

// TestNewServiceIsIndependent 覆盖独立实例不共享状态。
func TestNewServiceIsIndependent(t *testing.T) {
	a, b := NewService(), NewService()
	if a == b {
		t.Fatal("NewService 应返回不同实例")
	}
	a.StartService("x")
	if b.GetQueue("x") != nil {
		t.Error("实例之间不应共享队列")
	}
}

// ---- Setup / 队列生命周期 ----

// TestSetupStoresHandles 覆盖数据库句柄注入。
func TestSetupStoresHandles(t *testing.T) {
	db := newSchemaDB(t)
	svc := NewService()
	svc.Setup(db, db)
	if svc.DB != db || svc.UserDB != db {
		t.Error("Setup 应保存句柄")
	}
}

// TestGetQueueUnknown 覆盖未启动服务返回 nil。
func TestGetQueueUnknown(t *testing.T) {
	svc := NewService()
	if svc.GetQueue("nope") != nil {
		t.Error("未启动的服务应返回 nil")
	}
}

// TestStartServiceIsIdempotent 覆盖同名服务只启动一次。
func TestStartServiceIsIdempotent(t *testing.T) {
	svc := NewService()
	q1 := svc.StartService("demo")
	q2 := svc.StartService("demo")
	if q1.q != q2.q {
		t.Error("同名服务应复用同一队列")
	}
	q1.Close()
}

// TestGetQueueAfterStart 覆盖启动后可取回队列。
func TestGetQueueAfterStart(t *testing.T) {
	svc := NewService()
	q := svc.StartService("demo")
	defer q.Close()

	if got := svc.GetQueue("demo"); got == nil || got.q != q.q {
		t.Error("GetQueue 应返回同一队列")
	}
}

// ---- 任务执行 ----

// TestSubmitRunsTask 覆盖任务被实际执行。
func TestSubmitRunsTask(t *testing.T) {
	svc := NewService()
	var got atomic.Int64
	q := svc.StartService("demo")
	defer q.Close()

	q.Push(Task{Name: "demo", Args: []any{int64(7)}, Run: func(args []any) error {
		got.Store(args[0].(int64))
		return nil
	}})
	q.Wait()

	if got.Load() != 7 {
		t.Errorf("任务未执行，got = %d", got.Load())
	}
}

// TestTasksRunSerially 覆盖同一队列串行执行。
func TestTasksRunSerially(t *testing.T) {
	svc := NewService()
	q := svc.StartService("demo")
	defer q.Close()

	var mu sync.Mutex
	var order []int
	var concurrent atomic.Int32
	var maxConcurrent atomic.Int32

	for i := 0; i < 5; i++ {
		i := i
		q.Push(Task{Name: "demo", Run: func([]any) error {
			cur := concurrent.Add(1)
			for {
				old := maxConcurrent.Load()
				if cur <= old || maxConcurrent.CompareAndSwap(old, cur) {
					break
				}
			}
			time.Sleep(2 * time.Millisecond)
			mu.Lock()
			order = append(order, i)
			mu.Unlock()
			concurrent.Add(-1)
			return nil
		}})
	}
	q.Wait()

	if maxConcurrent.Load() != 1 {
		t.Errorf("最大并发 = %d，期望 1（串行）", maxConcurrent.Load())
	}
	if len(order) != 5 {
		t.Fatalf("执行数 = %d，期望 5", len(order))
	}
	for i, v := range order {
		if v != i {
			t.Errorf("顺序 = %v，期望 0..4", order)
			break
		}
	}
}

// TestTaskErrorDoesNotStopWorker 覆盖单任务失败不中断 worker。
func TestTaskErrorDoesNotStopWorker(t *testing.T) {
	svc := NewService()
	q := svc.StartService("demo")
	defer q.Close()

	var after atomic.Bool
	q.Push(Task{Name: "demo", Run: func([]any) error { return errors.New("boom") }})
	q.Push(Task{Name: "demo", Run: func([]any) error { after.Store(true); return nil }})
	q.Wait()

	if !after.Load() {
		t.Error("失败任务之后的同队列任务仍应执行")
	}
}

// TestTaskPanicIsRecovered 覆盖任务 panic 被捕获。
func TestTaskPanicIsRecovered(t *testing.T) {
	svc := NewService()
	q := svc.StartService("demo")
	defer q.Close()

	var after atomic.Bool
	q.Push(Task{Name: "demo", Run: func([]any) error { panic("kaboom") }})
	q.Push(Task{Name: "demo", Run: func([]any) error { after.Store(true); return nil }})
	q.Wait()

	if !after.Load() {
		t.Error("panic 之后的同队列任务仍应执行")
	}
}

// TestNilRunIsNoop 覆盖 Run 为 nil 时不 panic。
func TestNilRunIsNoop(t *testing.T) {
	svc := NewService()
	q := svc.StartService("demo")
	defer q.Close()

	q.Push(Task{Name: "demo"})
	q.Wait()
}

// TestPendingCount 覆盖未完成任务计数。
func TestPendingCount(t *testing.T) {
	svc := NewService()
	q := svc.StartService("demo")
	defer q.Close()

	release := make(chan struct{})
	q.Push(Task{Name: "demo", Run: func([]any) error {
		<-release
		return nil
	}})

	// 等待 worker 取走任务，此时 pending 仍为 1（未完成）。
	deadline := time.Now().Add(2 * time.Second)
	for q.Pending() == 0 && time.Now().Before(deadline) {
		time.Sleep(time.Millisecond)
	}
	if q.Pending() != 1 {
		t.Errorf("pending = %d，期望 1", q.Pending())
	}
	close(release)
	q.Wait()
	if q.Pending() != 0 {
		t.Errorf("完成后 pending = %d，期望 0", q.Pending())
	}
}

// ---- UpgradeBusy ----

// TestUpgradeBusyFalseWhenIdle 覆盖空闲时为 false。
func TestUpgradeBusyFalseWhenIdle(t *testing.T) {
	svc := NewService()
	if svc.UpgradeBusy() {
		t.Error("无队列时应为 false")
	}
	q := svc.StartService("demo")
	defer q.Close()
	if svc.UpgradeBusy() {
		t.Error("空闲队列应为 false")
	}
}

// TestUpgradeBusyTrueWhileRunning 覆盖有任务时为 true。
func TestUpgradeBusyTrueWhileRunning(t *testing.T) {
	svc := NewService()
	q := svc.StartService("demo")
	defer q.Close()

	release := make(chan struct{})
	q.Push(Task{Name: "demo", Run: func([]any) error {
		<-release
		return nil
	}})

	deadline := time.Now().Add(2 * time.Second)
	for !svc.UpgradeBusy() && time.Now().Before(deadline) {
		time.Sleep(time.Millisecond)
	}
	if !svc.UpgradeBusy() {
		t.Error("有未完成任务时应为 true")
	}
	close(release)
	q.Wait()
	if svc.UpgradeBusy() {
		t.Error("任务完成后应为 false")
	}
}

// ---- Submit / Run ----

// TestSubmitStartsService 覆盖 Submit 自动启动服务。
func TestSubmitStartsService(t *testing.T) {
	svc := NewService()
	var done atomic.Bool
	svc.Submit("auto", nil, func([]any) error { done.Store(true); return nil })

	q := svc.GetQueue("auto")
	if q == nil {
		t.Fatal("Submit 应自动启动服务")
	}
	defer q.Close()
	q.Wait()
	if !done.Load() {
		t.Error("任务应被执行")
	}
}

// TestRunAsyncMode 覆盖异步模式入队并返回 nil。
func TestRunAsyncMode(t *testing.T) {
	svc := NewService()
	var done atomic.Bool
	if err := svc.Run("demo", nil, func([]any) error { done.Store(true); return nil }); err != nil {
		t.Fatalf("Run: %v", err)
	}
	q := svc.GetQueue("demo")
	if q == nil {
		t.Fatal("应创建队列")
	}
	defer q.Close()
	q.Wait()
	if !done.Load() {
		t.Error("任务应被执行")
	}
}

// TestRunSyncMode 覆盖同步模式直接执行并返回错误。
func TestRunSyncMode(t *testing.T) {
	svc := NewService()
	svc.SyncMode = true
	var done atomic.Bool
	err := svc.Run("demo", nil, func([]any) error { done.Store(true); return nil })
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if !done.Load() {
		t.Error("同步模式应立即执行")
	}
	if svc.GetQueue("demo") != nil {
		t.Error("同步模式不应创建队列")
	}
}

// TestRunSyncModePropagatesError 覆盖同步模式透传错误。
func TestRunSyncModePropagatesError(t *testing.T) {
	svc := NewService()
	svc.SyncMode = true
	want := errors.New("boom")
	if err := svc.Run("demo", nil, func([]any) error { return want }); !errors.Is(err, want) {
		t.Errorf("err = %v，期望 %v", err, want)
	}
}

// TestAsyncModeDefault 覆盖默认异步模式。
func TestAsyncModeDefault(t *testing.T) {
	if !NewService().AsyncMode() {
		t.Error("默认应为异步模式")
	}
}

// ---- AddMsg ----

// TestAddMsgWritesMessage 覆盖写入站内消息。
func TestAddMsgWritesMessage(t *testing.T) {
	db := newSchemaDB(t)
	readerID := seedReader(t, db)
	svc := NewService()
	svc.Setup(db, db)

	if err := svc.AddMsg(readerID, "scan", "导入完成"); err != nil {
		t.Fatalf("AddMsg: %v", err)
	}

	var status, data string
	var unread int
	err := db.QueryRow(`SELECT status, data, unread FROM messages WHERE reader_id = ?`,
		readerID).Scan(&status, &data, &unread)
	if err != nil {
		t.Fatalf("查询消息失败: %v", err)
	}
	if status != "scan" {
		t.Errorf("status = %q", status)
	}
	if !strings.Contains(data, "导入完成") {
		t.Errorf("data = %q，应含消息正文", data)
	}
	if unread != 1 {
		t.Errorf("unread = %d，期望 1", unread)
	}
}

// TestAddMsgSkipsZeroUser 覆盖 user_id 为 0 时不写。
func TestAddMsgSkipsZeroUser(t *testing.T) {
	db := newSchemaDB(t)
	svc := NewService()
	svc.Setup(db, db)

	if err := svc.AddMsg(0, "scan", "x"); err != nil {
		t.Fatalf("AddMsg: %v", err)
	}
	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM messages`).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Errorf("消息数 = %d，期望 0", count)
	}
}

// TestAddMsgWithoutDB 覆盖未注入库时不报错。
func TestAddMsgWithoutDB(t *testing.T) {
	svc := NewService()
	if err := svc.AddMsg(1, "scan", "x"); err != nil {
		t.Errorf("未注入库时不应报错: %v", err)
	}
}

// TestAddMsgEscapesQuotes 覆盖消息正文中的引号被正确转义。
func TestAddMsgEscapesQuotes(t *testing.T) {
	db := newSchemaDB(t)
	readerID := seedReader(t, db)
	svc := NewService()
	svc.Setup(db, db)

	if err := svc.AddMsg(readerID, "scan", `含"引号"的消息`); err != nil {
		t.Fatalf("AddMsg: %v", err)
	}
	var data string
	if err := db.QueryRow(`SELECT data FROM messages WHERE reader_id = ?`, readerID).Scan(&data); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(data, `\"引号\"`) {
		t.Errorf("data = %q，引号应被转义", data)
	}
}

// ---- Close ----

// TestCloseIsIdempotent 覆盖重复 Close 不 panic。
func TestCloseIsIdempotent(t *testing.T) {
	svc := NewService()
	q := svc.StartService("demo")
	q.Close()
	q.Close()
}

// TestPushAfterCloseIsDropped 覆盖关闭后入队被丢弃。
func TestPushAfterCloseIsDropped(t *testing.T) {
	svc := NewService()
	q := svc.StartService("demo")
	q.Close()

	// 关闭后 Push 应被丢弃而不是 panic。
	q.Push(Task{Name: "demo", Run: func([]any) error { return nil }})
	if q.Pending() != 0 {
		t.Errorf("关闭后 pending = %d，期望 0", q.Pending())
	}
}

// TestCloseWaitsForWorker 覆盖 Close 等待 worker 退出。
func TestCloseWaitsForWorker(t *testing.T) {
	svc := NewService()
	q := svc.StartService("demo")

	var done atomic.Bool
	q.Push(Task{Name: "demo", Run: func([]any) error { done.Store(true); return nil }})
	q.Close()

	if !done.Load() {
		t.Error("Close 应等待已入队任务完成")
	}
}

// ---- 辅助 ----

// TestNowFallback 覆盖时间回落。
func TestNowFallback(t *testing.T) {
	svc := NewService()
	if svc.now().IsZero() {
		t.Error("now 不应为零值")
	}
}

// TestLogfWithInjectedLogger 覆盖注入日志器。
func TestLogfWithInjectedLogger(t *testing.T) {
	var buf strings.Builder
	svc := NewService()
	svc.Logger = newTestLogger(&buf)
	svc.logf("hello %s", "world")
	if !strings.Contains(buf.String(), "hello world") {
		t.Errorf("日志 = %q", buf.String())
	}
}

// newTestLogger 构造写入 buf 的日志器。
func newTestLogger(buf *strings.Builder) *log.Logger {
	return log.New(buf, "", 0)
}
