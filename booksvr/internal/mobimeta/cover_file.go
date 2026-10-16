package mobimeta

import (
	"encoding/binary"
	"fmt"
	"io"
	"os"
)

// CoverFile reads only the PalmDB index, record zero and the cover image.
// Large indexed books do not need to fit in memory to display their artwork.
func CoverFile(path string) ([]byte, bool, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, false, err
	}
	defer f.Close()
	info, err := f.Stat()
	if err != nil {
		return nil, false, err
	}
	return coverReaderAt(f, info.Size())
}

func coverReaderAt(r io.ReaderAt, size int64) ([]byte, bool, error) {
	var header [78]byte
	if _, err := r.ReadAt(header[:], 0); err != nil {
		return nil, false, err
	}
	count := int(binary.BigEndian.Uint16(header[76:]))
	if count < 2 {
		return nil, false, nil
	}
	end := int64(78 + count*8)
	if end > size {
		return nil, false, fmt.Errorf("invalid PalmDB index")
	}
	index := make([]byte, count*8)
	if _, err := r.ReadAt(index, 78); err != nil {
		return nil, false, err
	}
	bounds := func(i int) (int64, int64, error) {
		if i < 0 || i >= count {
			return 0, 0, fmt.Errorf("invalid PalmDB record")
		}
		start := int64(binary.BigEndian.Uint32(index[i*8:]))
		stop := size
		if i+1 < count {
			stop = int64(binary.BigEndian.Uint32(index[(i+1)*8:]))
		}
		if start < end || stop <= start || stop > size {
			return 0, 0, fmt.Errorf("invalid PalmDB record bounds")
		}
		return start, stop, nil
	}
	read := func(i int, limit int64) ([]byte, error) {
		start, stop, err := bounds(i)
		if err != nil {
			return nil, err
		}
		if stop-start > limit {
			return nil, fmt.Errorf("MOBI cover record exceeds limit")
		}
		data := make([]byte, int(stop-start))
		_, err = r.ReadAt(data, start)
		return data, err
	}
	rec0, err := read(0, 2<<20)
	if err != nil {
		return nil, false, err
	}
	if len(rec0) < 0x70 || string(rec0[16:20]) != "MOBI" {
		return nil, false, nil
	}
	first := uint64(binary.BigEndian.Uint32(rec0[0x6c:0x70]))
	offset, declared := exthIntValueRecord0(rec0, 201)
	imageRecord := func(i int) ([]byte, bool, error) {
		data, err := read(i, 32<<20)
		if err != nil {
			return nil, false, err
		}
		return data, isImageBytes(data), nil
	}
	if declared && offset != ^uint32(0) {
		i := first + uint64(offset)
		if i >= uint64(count) {
			return nil, false, nil
		}
		return imageRecord(int(i))
	}
	if first >= uint64(count) {
		return nil, false, nil
	}
	for i := int(first); i < count; i++ {
		start, stop, err := bounds(i)
		if err != nil {
			return nil, false, err
		}
		if stop-start < 4 {
			continue
		}
		var magic [4]byte
		if _, err := r.ReadAt(magic[:], start); err != nil {
			return nil, false, err
		}
		if isImageBytes(magic[:]) {
			return imageRecord(i)
		}
	}
	return nil, false, nil
}
