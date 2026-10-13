package sourcebase

import (
	"context"
	"io"
	"time"
)

// timeDuration 是 time.Duration 的别名，便于在结构体字段中表达秒级超时。
type timeDuration = time.Duration

// secondsToDuration 把秒数转成 time.Duration。
func secondsToDuration(seconds float64) time.Duration {
	if seconds < 0 {
		seconds = 0
	}
	return time.Duration(seconds * float64(time.Second))
}

// readAll 读取全部内容。
func readAll(r io.Reader) ([]byte, error) {
	return io.ReadAll(r)
}

// gocontextBackground 返回 context.Background()。
//
// 单独包一层是因为本包的多个函数用 `context` 作为参数名，
// 会遮蔽 context 包。
func gocontextBackground() context.Context {
	return context.Background()
}
