//go:build !linux

package httpapi

import "math"

// statfsFree 返回路径所在文件系统的可用字节数。
//
// 非 Linux 平台（本机开发用）没有 statfs，返回一个足够大的值，
// 使「磁盘空间充足」判定成立；生产环境固定为 Linux，走 diskfree_linux.go。
func statfsFree(path string) (int64, error) {
	return math.MaxInt64 / 2, nil
}
