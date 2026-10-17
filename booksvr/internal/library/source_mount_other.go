//go:build !linux

package library

import "os"

func sourceRootIdentity(_ string, info os.FileInfo) string { return sourceFileIdentity(info) }
