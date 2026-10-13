//go:build linux

package httpapi

import "golang.org/x/sys/unix"

// statfsFree 返回路径所在文件系统的可用字节数（Linux）。
func statfsFree(path string) (int64, error) {
	var st unix.Statfs_t
	if err := unix.Statfs(path, &st); err != nil {
		return 0, err
	}
	return int64(st.Bavail) * int64(st.Bsize), nil
}
