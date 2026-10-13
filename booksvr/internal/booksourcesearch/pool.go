package booksourcesearch

import "sync"

// workerPool 是一个有界 worker 池。
//
// 对应 Python 的 ThreadPoolExecutor(max_workers=N)：任务排队执行，
// 池满时新任务等待而不是创建新线程。shutdown 不等待在途任务
// （对应 `shutdown(wait=False)`）。
type workerPool struct {
	queue  chan func()
	wg     sync.WaitGroup
	closed chan struct{}
	once   sync.Once
}

// newWorkerPool 启动 n 个 worker。
func newWorkerPool(n int) *workerPool {
	if n < 1 {
		n = 1
	}
	p := &workerPool{
		queue:  make(chan func(), 1024),
		closed: make(chan struct{}),
	}
	for i := 0; i < n; i++ {
		p.wg.Add(1)
		go func() {
			defer p.wg.Done()
			for {
				select {
				case job := <-p.queue:
					job()
				case <-p.closed:
					return
				}
			}
		}()
	}
	return p
}

// submit 提交一个任务；池已关闭时静默丢弃（与 Python 的 shutdown 后行为一致）。
//
// 注意：shutdown 只关闭 closed 信号，不关闭 queue。关闭 queue 会让并发的
// 发送方 panic（send on closed channel），而 select 无法原子地避免这一点。
func (p *workerPool) submit(job func()) {
	select {
	case <-p.closed:
		return
	default:
	}
	select {
	case p.queue <- job:
	case <-p.closed:
	}
}

// shutdown 停止接收新任务，不等待在途任务完成。
//
// 只关闭 closed 信号：worker 通过它退出，submit 通过它放弃投递。
// queue 本身不关闭，因此不存在 send on closed channel 的竞态。
func (p *workerPool) shutdown() {
	p.once.Do(func() {
		close(p.closed)
	})
}
