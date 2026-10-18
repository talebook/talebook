package scan

import (
	"fmt"
	"os"
	"syscall"
)

func analysisFileIdentity(info os.FileInfo) string {
	if value, ok := info.Sys().(*syscall.Stat_t); ok {
		return fmt.Sprintf("%d:%d", value.Dev, value.Ino)
	}
	return ""
}
