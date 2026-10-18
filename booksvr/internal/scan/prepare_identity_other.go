//go:build !linux

package scan

import "os"

// Persistent reuse is disabled when no stable filesystem identity is available.
func analysisFileIdentity(info os.FileInfo) string { return "" }
