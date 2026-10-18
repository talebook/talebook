package library

import (
	"archive/zip"
	"encoding/base64"
	"errors"
)

// sourceArchiveCandidates memoizes directory membership for one immutable
// reconciliation snapshot. It never substitutes for member hash verification.
// Many missing archives share sizes with unrelated files, so negative directory
// probes must not be repeated for every missing book. Unknown I/O errors fall
// through to the existing source resolver instead of being cached as invalid.
type sourceArchiveCandidates struct {
	directories map[string]map[string]bool
	entries     int
	open        func(string) (*zip.ReadCloser, error)
}

func (c *sourceArchiveCandidates) mayContain(file, encoded string) bool {
	raw, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return false
	}
	if directory, ok := c.directories[file]; ok {
		return directory[string(raw)]
	}
	open := c.open
	if open == nil {
		open = zip.OpenReader
	}
	reader, err := open(file)
	if err != nil {
		if errors.Is(err, zip.ErrFormat) {
			c.remember(file, nil)
			return false
		}
		return true
	}
	defer reader.Close()
	found := false
	for _, entry := range reader.File {
		if entry.Name == string(raw) {
			found = true
			break
		}
	}
	if len(c.directories) < 16384 && c.entries+len(reader.File) <= 200000 {
		names := make(map[string]bool, len(reader.File))
		for _, entry := range reader.File {
			names[entry.Name] = true
		}
		c.entries += len(names)
		c.remember(file, names)
	}
	return found
}

func (c *sourceArchiveCandidates) remember(file string, names map[string]bool) {
	if len(c.directories) >= 16384 {
		return
	}
	if c.directories == nil {
		c.directories = map[string]map[string]bool{}
	}
	c.directories[file] = names
}
