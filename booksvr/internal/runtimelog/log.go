// Package runtimelog keeps a bounded persistent copy of the Go service log.
package runtimelog

import (
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"sync"
)

const maxBytes int64 = 10 * 1024 * 1024

func Path() string {
	if p := os.Getenv("BOOKSVR_LOG_FILE"); p != "" {
		return p
	}
	return "/data/log/talebook.log"
}

type Writer struct {
	mu          sync.Mutex
	file        *os.File
	path        string
	size, limit int64
}

func Open(path string) (*Writer, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return nil, err
	}
	f, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600)
	if err != nil {
		return nil, err
	}
	info, err := f.Stat()
	if err != nil {
		f.Close()
		return nil, err
	}
	return &Writer{file: f, path: path, size: info.Size(), limit: maxBytes}, nil
}
func (w *Writer) Write(b []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.file == nil {
		return 0, os.ErrClosed
	}
	if w.size > 0 && w.size+int64(len(b)) > w.limit {
		if err := w.file.Close(); err != nil {
			return 0, err
		}
		w.file = nil
		// Three generations at most: active plus two retained files.
		if err := os.Remove(w.path + ".2"); err != nil && !os.IsNotExist(err) {
			return 0, err
		}
		if err := os.Rename(w.path+".1", w.path+".2"); err != nil && !os.IsNotExist(err) {
			return 0, err
		}
		if err := os.Rename(w.path, w.path+".1"); err != nil {
			return 0, err
		}
		f, err := os.OpenFile(w.path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600)
		if err != nil {
			return 0, err
		}
		w.file = f
		w.size = 0
	}
	n, err := w.file.Write(b)
	w.size += int64(n)
	return n, err
}
func (w *Writer) Close() error {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.file == nil {
		return nil
	}
	err := w.file.Close()
	w.file = nil
	return err
}

// Install keeps the original container output and restores it when the server exits.
func Install(path string) (func(), error) {
	w, err := Open(path)
	if err != nil {
		return nil, fmt.Errorf("booksvr: 打开系统日志失败: %w", err)
	}
	old := log.Writer()
	log.SetOutput(io.MultiWriter(old, w))
	log.Printf("booksvr: 系统日志已启用")
	return func() { log.SetOutput(old); w.Close() }, nil
}
