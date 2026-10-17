//go:build !windows

package library

import (
	"fmt"
	"os"
	"syscall"
)

func sourceFileIdentity(info os.FileInfo) string {
	if s, ok := info.Sys().(*syscall.Stat_t); ok {
		return fmt.Sprintf("%d:%d", s.Dev, s.Ino)
	}
	return fmt.Sprintf("%s:%d", info.Name(), info.ModTime().UnixNano())
}
