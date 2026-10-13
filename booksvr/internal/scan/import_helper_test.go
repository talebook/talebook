package scan

import (
	"archive/zip"
	"database/sql"
	"os"

	"talebook/booksvr/internal/library"
)

// libraryRegisterFormat 在书库中登记一个格式路径。
func libraryRegisterFormat(db *sql.DB, bookID int64, format, path string) error {
	info, err := os.Stat(path)
	var size, mtime int64
	if err == nil {
		size = info.Size()
		mtime = info.ModTime().Unix()
	}
	return library.RegisterFormat(db, bookID, format, path, size, mtime)
}

// zipWriter 是测试用的 ZIP 写入辅助。
type zipWriter struct{ zw *zip.Writer }

// newZipWriter 构造一个 ZIP 写入器。
func newZipWriter(f *os.File) *zipWriter { return &zipWriter{zw: zip.NewWriter(f)} }

// add 写入一个条目。
func (z *zipWriter) add(name string, data []byte) error {
	w, err := z.zw.Create(name)
	if err != nil {
		return err
	}
	_, err = w.Write(data)
	return err
}

// close 关闭 ZIP 写入器。
func (z *zipWriter) close() error { return z.zw.Close() }
