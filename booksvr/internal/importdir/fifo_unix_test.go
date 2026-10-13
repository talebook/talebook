//go:build !windows

package importdir

import "golang.org/x/sys/unix"

// mkfifo 创建一个 FIFO 特殊文件，用于验证非常规文件不被统计。
func mkfifo(path string) error {
	return unix.Mkfifo(path, 0o644)
}
