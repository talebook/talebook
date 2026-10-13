//go:build windows

package importdir

import "errors"

// mkfifo 在 Windows 上不可用。
func mkfifo(path string) error {
	return errors.New("Windows 不支持 FIFO")
}
