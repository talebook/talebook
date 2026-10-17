// Package sourcefile resolves indexed ZIP members without retaining their bodies.
package sourcefile

import (
	"archive/zip"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

const Prefix = "talebook-zip:v1:"
const ScratchLimit int64 = 512 << 20

type Reference struct {
	Archive     string   `json:"archive"`
	Fingerprint string   `json:"fingerprint"`
	Chain       []string `json:"chain"`
	Hash        string   `json:"hash"`
	Name        string   `json:"name"`
	Size        int64    `json:"size"`
}

func IsReference(path string) bool { return strings.HasPrefix(path, Prefix) }

func Encode(r Reference) string {
	b, _ := json.Marshal(r)
	return Prefix + base64.RawURLEncoding.EncodeToString(b)
}

func Decode(path string) (Reference, error) {
	var r Reference
	b, err := base64.RawURLEncoding.DecodeString(strings.TrimPrefix(path, Prefix))
	if !IsReference(path) || err != nil || json.Unmarshal(b, &r) != nil || !filepath.IsAbs(r.Archive) || len(r.Chain) == 0 || len(r.Chain) > 5 || r.Size < 0 || len(r.Hash) != 71 || !strings.HasPrefix(r.Hash, "sha256:") {
		return r, fmt.Errorf("ZIP 来源引用无效")
	}
	return r, nil
}

func Fingerprint(file string) (string, error) {
	info, err := os.Stat(file)
	if err != nil {
		return "", err
	}
	if !info.Mode().IsRegular() {
		return "", fmt.Errorf("ZIP 来源不是普通文件")
	}
	return FingerprintValues(file, info.Size(), info.ModTime().UnixNano()), nil
}

// FingerprintValues preserves the existing on-disk reference contract when
// an inotify rename cookie proves that file metadata is unchanged.
func FingerprintValues(file string, size, mtime int64) string {
	sum := sha256.Sum256([]byte(fmt.Sprintf("%s:%d:%d", file, size, mtime)))
	return hex.EncodeToString(sum[:])
}

type memberInfo struct {
	os.FileInfo
	ref Reference
}

func (i memberInfo) Name() string      { return i.ref.Name }
func (i memberInfo) Size() int64       { return i.ref.Size }
func (i memberInfo) IsDir() bool       { return false }
func (i memberInfo) Mode() os.FileMode { return 0600 }

// Stat checks the original container, without extracting any book.
func Stat(path string) (os.FileInfo, error) {
	if !IsReference(path) {
		return os.Stat(path)
	}
	r, err := Decode(path)
	if err != nil {
		return nil, err
	}
	fp, err := Fingerprint(r.Archive)
	if err != nil {
		return nil, err
	}
	if fp != r.Fingerprint {
		return nil, fmt.Errorf("源 ZIP 已变化，请重新扫描")
	}
	info, err := os.Stat(r.Archive)
	if err != nil {
		return nil, err
	}
	return memberInfo{info, r}, nil
}

var scratch struct {
	sync.Mutex
	used int64
}
var initOnce sync.Once
var initErr error
var workRoot string

// One server owns this root. The process starts before accepting HTTP requests.
// Remove files abandoned by the previous server after a crash or restart.
func Init() error {
	initOnce.Do(func() {
		base := filepath.Join(os.TempDir(), "talebook-archive-work")
		if info, e := os.Lstat(base); e == nil && info.Mode()&os.ModeSymlink != 0 {
			initErr = fmt.Errorf("临时工作目录不能是符号链接")
			return
		}
		if e := os.MkdirAll(base, 0700); e != nil {
			initErr = e
			return
		}
		// Linux process namespaces isolate container ownership. Only dead process
		// directories are reclaimed; live server or CLI extractions remain intact.
		if entries, e := os.ReadDir(base); e == nil {
			for _, entry := range entries {
				pid, e := strconv.Atoi(entry.Name())
				if e != nil || pid <= 0 || !entry.IsDir() {
					continue
				}
				if _, e = os.Stat(filepath.Join("/proc", entry.Name())); os.IsNotExist(e) {
					_ = os.RemoveAll(filepath.Join(base, entry.Name()))
				}
			}
		}
		workRoot = filepath.Join(base, strconv.Itoa(os.Getpid()))
		if e := os.RemoveAll(workRoot); e != nil {
			initErr = e
			return
		}
		initErr = os.MkdirAll(workRoot, 0700)
	})
	return initErr
}

// Extract reserves declared space before writing. All scans, imports and reads
// share a hard 512 MiB budget, including intermediate nested ZIP containers.
func Extract(ctx context.Context, member *zip.File, name string) (string, func(), error) {
	noop := func() {}
	if member.Flags&1 != 0 || !member.Mode().IsRegular() || member.UncompressedSize64 > uint64(ScratchLimit) {
		return "", noop, fmt.Errorf("ZIP 成员已加密、不是普通文件或超过 512 MiB 临时空间上限")
	}
	name = filepath.Base(strings.ReplaceAll(name, `\`, "/"))
	if name == "." || name == "/" || name == "" {
		return "", noop, fmt.Errorf("ZIP 文件名无效")
	}
	size := int64(member.UncompressedSize64)
	scratch.Lock()
	if size > ScratchLimit-scratch.used {
		scratch.Unlock()
		return "", noop, fmt.Errorf("ZIP 临时空间已达到 512 MiB 上限，请稍后重试")
	}
	scratch.used += size
	scratch.Unlock()
	var once sync.Once
	dir := ""
	clean := func() {
		once.Do(func() {
			if dir != "" {
				if e := os.RemoveAll(dir); e != nil {
					log.Printf("ZIP 临时文件清理失败（保留空间占用计数）: %v", e)
					return
				}
			}
			scratch.Lock()
			scratch.used -= size
			scratch.Unlock()
		})
	}
	if err := Init(); err != nil {
		clean()
		return "", noop, err
	}
	var err error
	if err = os.MkdirAll(workRoot, 0700); err != nil {
		clean()
		return "", noop, err
	}
	dir, err = os.MkdirTemp(workRoot, "member-")
	if err != nil {
		clean()
		return "", noop, err
	}
	src, err := member.Open()
	if err != nil {
		clean()
		return "", noop, err
	}
	defer src.Close()
	dest := filepath.Join(dir, name)
	out, err := os.OpenFile(dest, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		clean()
		return "", noop, err
	}
	n, err := io.Copy(out, io.LimitReader(cancelReader{ctx, src}, size+1))
	closeErr := out.Close()
	if err != nil || closeErr != nil || n != size {
		clean()
		return "", noop, fmt.Errorf("ZIP 解压失败或大小校验不符：%v %v", err, closeErr)
	}
	return dest, clean, nil
}

type cancelReader struct {
	ctx context.Context
	r   io.Reader
}

func (r cancelReader) Read(b []byte) (int, error) {
	if e := r.ctx.Err(); e != nil {
		return 0, e
	}
	return r.r.Read(b)
}

// Acquire keeps a physical file only for the caller's operation. Release must
// run after the last read or external converter exits, including error paths.
func Acquire(ctx context.Context, source string) (string, func(), error) {
	noop := func() {}
	if !IsReference(source) {
		return source, noop, nil
	}
	r, err := Decode(source)
	if err != nil {
		return "", noop, err
	}
	if _, err = Stat(source); err != nil {
		return "", noop, err
	}
	current := r.Archive
	clean := noop
	for _, encoded := range r.Chain {
		raw, e := base64.StdEncoding.DecodeString(encoded)
		if e != nil {
			clean()
			return "", noop, e
		}
		zr, e := zip.OpenReader(current)
		if e != nil {
			clean()
			return "", noop, e
		}
		var member *zip.File
		for _, f := range zr.File {
			if f.Name == string(raw) {
				member = f
				break
			}
		}
		if member == nil {
			zr.Close()
			clean()
			return "", noop, fmt.Errorf("ZIP 中的书籍已不存在")
		}
		name := "member" + filepath.Ext(string(raw))
		next, release, e := Extract(ctx, member, name)
		zr.Close()
		clean()
		if e != nil {
			return "", noop, e
		}
		current, clean = next, release
	}
	f, err := os.Open(current)
	if err != nil {
		clean()
		return "", noop, err
	}
	h := sha256.New()
	_, err = io.Copy(h, f)
	_ = f.Close()
	if err != nil || "sha256:"+hex.EncodeToString(h.Sum(nil)) != r.Hash {
		clean()
		return "", noop, fmt.Errorf("ZIP 内书籍内容校验失败")
	}
	// Stable mtime makes reader HEAD/GET revisions agree across extractions.
	if info, e := os.Stat(r.Archive); e == nil {
		_ = os.Chtimes(current, time.Now(), info.ModTime())
	}
	return current, clean, nil
}
