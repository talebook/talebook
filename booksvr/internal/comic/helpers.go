package comic

import (
	"io"
	"path/filepath"
)

// filepathAbs 返回绝对路径。
func filepathAbs(p string) (string, error) { return filepath.Abs(p) }

// filepathEvalSymlinks 解析符号链接。
func filepathEvalSymlinks(p string) (string, error) { return filepath.EvalSymlinks(p) }

// readFull 读取至多 len(buf) 字节，返回实际读取数。
//
// 与 io.ReadFull 不同：遇到 EOF 不算错误，因为这里只取文件头部。
func readFull(r io.Reader, buf []byte) (int, error) {
	n, err := io.ReadFull(r, buf)
	if err == io.ErrUnexpectedEOF || err == io.EOF {
		return n, nil
	}
	return n, err
}
