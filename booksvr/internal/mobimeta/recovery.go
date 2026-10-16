package mobimeta

import (
	"encoding/binary"
	"io"
	"os"
	"strings"
	"unicode"
	"unicode/utf8"
)

// ReadHeaderFile reads only the PalmDB index and first record, bounded to 8 MiB.
// Metadata recovery must not load entire books while an import is running.
func ReadHeaderFile(path string) ([]byte, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	h := make([]byte, 94)
	if _, err := io.ReadFull(f, h); err != nil {
		return nil, err
	}
	n := int64(binary.BigEndian.Uint16(h[76:78]))
	start := int64(binary.BigEndian.Uint32(h[78:82]))
	fi, err := f.Stat()
	if err != nil {
		return nil, err
	}
	end := fi.Size()
	if n > 1 {
		end = int64(binary.BigEndian.Uint32(h[86:90]))
	}
	if n < 1 || start < 78+n*8 || end <= start || end > fi.Size() || end > 8<<20 {
		return nil, ErrInvalidContainer
	}
	data := make([]byte, end)
	_, err = f.ReadAt(data, 0)
	return data, err
}

// RecoverPDBTitle identifies only the proven old +16 offset bug. It excludes
// EXTH overrides, valid old fullnames, damaged text and manual catalog titles.
func RecoverPDBTitle(data []byte, current string) (string, bool) {
	mi, err := Extract(data)
	if err != nil || current != pdbName(data) || mi.Title == current {
		return "", false
	}
	off := int(binary.BigEndian.Uint32(data[78:82]))
	r := data[off:]
	if len(r) < 0x6c || string(r[16:20]) != "MOBI" {
		return "", false
	}
	oldOff := uint64(binary.BigEndian.Uint32(r[0x64:0x68]))
	oldLen := uint64(binary.BigEndian.Uint32(r[0x68:0x6c]))
	if oldOff > 0 && oldLen > 0 && oldOff+oldLen <= uint64(len(r)) {
		return "", false
	}
	newOff := uint64(binary.BigEndian.Uint32(r[0x54:0x58]))
	newLen := uint64(binary.BigEndian.Uint32(r[0x58:0x5c]))
	if newOff < 16 || newLen == 0 || newOff+newLen > uint64(len(r)) {
		return "", false
	}
	raw := r[newOff : newOff+newLen]
	if !utf8.Valid(raw) || strings.TrimSpace(string(raw)) != mi.Title {
		return "", false
	}
	// An explicit EXTH title is not evidence of this offset bug.
	legacy := append([]byte(nil), data...)
	copy(legacy[off+0x54:off+0x5c], r[0x64:0x6c])
	old, err := Extract(legacy)
	if err != nil || old.Title != current {
		return "", false
	}
	for _, c := range mi.Title {
		if unicode.IsControl(c) || c == unicode.ReplacementChar {
			return "", false
		}
	}
	return mi.Title, true
}
