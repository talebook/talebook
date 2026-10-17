package library

import (
	"fmt"
	"os"
	"syscall"
)

func sourceFileIdentity(info os.FileInfo) string {
	if s, ok := info.Sys().(*syscall.Win32FileAttributeData); ok {
		return fmt.Sprintf("%d:%d", s.CreationTime.HighDateTime, s.CreationTime.LowDateTime)
	}
	return fmt.Sprintf("%d", info.ModTime().UnixNano())
}
