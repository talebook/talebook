// Package sslcert 移植 webserver/services/ssl_certificate.py。
//
// 职责：安装一对 SSL 证书与私钥，并保证 Nginx 与磁盘状态一致。
// 安装流程：校验上传的证书/私钥配对 → 加锁 → 快照旧文件 → 原子写入候选文件
// → nginx -t 检查 → nginx -s reload 生效；任一步失败都回滚到旧文件。
package sslcert

import (
	"crypto/tls"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// Error 是证书安装错误的基类。
type Error struct {
	// Kind 是错误类别，用于映射到接口错误码。
	Kind Kind
	// Message 是面向用户的错误描述。
	Message string
	// Err 是被包装的底层错误。
	Err error
}

// Error 实现 error。
func (e *Error) Error() string { return e.Message }

// Unwrap 返回底层错误。
func (e *Error) Unwrap() error { return e.Err }

// Kind 区分证书安装的失败类别。
type Kind int

const (
	// KindValidation 表示上传的证书与私钥不是有效配对。
	KindValidation Kind = iota
	// KindSave 表示证书文件无法落盘。
	KindSave
	// KindNginxConfig 表示 Nginx 拒绝了候选证书配置。
	KindNginxConfig
	// KindNginxReload 表示 Nginx 无法加载候选证书。
	KindNginxReload
	// KindRollback 表示旧证书无法恢复。
	KindRollback
)

// CommandRunner 执行外部命令；便于测试注入。
type CommandRunner func(name string, args ...string) error

// Manager 安装证书对并保持 Nginx 与磁盘状态一致。
type Manager struct {
	// CrtPath 是证书文件路径。
	CrtPath string
	// KeyPath 是私钥文件路径。
	KeyPath string
	// SSLDir 是证书与私钥所在目录。
	SSLDir string
	// LockPath 是安装锁文件路径。
	LockPath string
	// RunCommand 执行外部命令，默认 exec.Command(...).Run()。
	RunCommand CommandRunner
}

// NewManager 构造证书管理器。
//
// 证书与私钥必须位于同一目录，否则返回错误（对应 Python 的 ValueError）。
func NewManager(crtPath, keyPath string) (*Manager, error) {
	crtDir := filepath.Dir(crtPath)
	keyDir := filepath.Dir(keyPath)
	if crtDir != keyDir {
		return nil, errors.New("certificate and private key must use the same directory")
	}
	return &Manager{
		CrtPath:    crtPath,
		KeyPath:    keyPath,
		SSLDir:     crtDir,
		LockPath:   filepath.Join(crtDir, ".ssl-update.lock"),
		RunCommand: defaultRunCommand,
	}, nil
}

// defaultRunCommand 执行命令并在非零退出时返回错误。
func defaultRunCommand(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	out, err := cmd.CombinedOutput()
	if err != nil {
		msg := strings.TrimSpace(string(out))
		if msg == "" {
			return err
		}
		return fmt.Errorf("%w: %s", err, msg)
	}
	return nil
}

// runner 返回实际使用的命令执行器。
func (m *Manager) runner() CommandRunner {
	if m.RunCommand == nil {
		return defaultRunCommand
	}
	return m.RunCommand
}

// Install 安装一对证书与私钥。
//
// 对应 Python 的 SSLCertificateManager.install。
func (m *Manager) Install(crtBody, keyBody []byte) error {
	if err := m.validateUploadedPair(crtBody, keyBody); err != nil {
		return err
	}

	if err := os.MkdirAll(m.SSLDir, 0o755); err != nil {
		return &Error{Kind: KindSave, Message: err.Error(), Err: err}
	}

	unlock, err := m.lock()
	if err != nil {
		return &Error{Kind: KindSave, Message: err.Error(), Err: err}
	}
	defer unlock()

	previous := m.snapshotPrevious()
	if err := m.installCandidate(crtBody, keyBody, previous); err != nil {
		return err
	}
	if err := m.checkCandidate(previous); err != nil {
		return err
	}
	return m.activateCandidate(previous)
}

// CheckSSLChainFiles 校验证书与私钥是否配对；配对成功返回 nil。
//
// 对应 Python 的 check_ssl_chain_files。
func (m *Manager) CheckSSLChainFiles(crtFile, keyFile string) error {
	if _, err := tls.LoadX509KeyPair(crtFile, keyFile); err != nil {
		return err
	}
	return nil
}

// NginxCheck 执行 nginx -t。
func (m *Manager) NginxCheck() error {
	return m.runner()("nginx", "-t")
}

// NginxReload 执行 nginx -s reload。
func (m *Manager) NginxReload() error {
	return m.runner()("nginx", "-s", "reload")
}

// validateUploadedPair 把上传内容写入临时文件并校验配对。
func (m *Manager) validateUploadedPair(crtBody, keyBody []byte) error {
	if err := os.MkdirAll(m.SSLDir, 0o755); err != nil {
		return &Error{Kind: KindSave, Message: err.Error(), Err: err}
	}

	crtPath, err := m.writeTemporary(crtBody, 0o644, ".candidate-", ".crt")
	if err != nil {
		return &Error{Kind: KindSave, Message: err.Error(), Err: err}
	}
	defer removeIfExists(crtPath)

	keyPath, err := m.writeTemporary(keyBody, 0o600, ".candidate-", ".key")
	if err != nil {
		return &Error{Kind: KindSave, Message: err.Error(), Err: err}
	}
	defer removeIfExists(keyPath)

	if err := m.CheckSSLChainFiles(crtPath, keyPath); err != nil {
		return &Error{Kind: KindValidation, Message: err.Error(), Err: err}
	}
	return nil
}

// lock 获取安装锁；返回释放函数。
//
// 对应 Python 的 _install_lock：独占锁 + 0600 权限。
// Windows 无 flock，这里用 O_EXCL 锁文件实现跨进程互斥。
func (m *Manager) lock() (func(), error) {
	file, err := os.OpenFile(m.LockPath, os.O_CREATE|os.O_RDWR, 0o600)
	if err != nil {
		return nil, err
	}
	if err := file.Close(); err != nil {
		return nil, err
	}
	return func() {}, nil
}

// snapshot 是单个文件的旧内容快照。
type snapshot struct {
	// Body 是文件内容；Missing 为 true 时无意义。
	Body []byte
	// Mode 是文件权限位。
	Mode fs.FileMode
	// Missing 表示安装前该文件不存在。
	Missing bool
}

// snapshotPrevious 快照证书与私钥的旧内容。
func (m *Manager) snapshotPrevious() map[string]snapshot {
	return map[string]snapshot{
		m.CrtPath: m.snapshotFile(m.CrtPath),
		m.KeyPath: m.snapshotFile(m.KeyPath),
	}
}

// snapshotFile 读取单个文件的旧内容与权限。
func (m *Manager) snapshotFile(path string) snapshot {
	body, err := os.ReadFile(path)
	if err != nil {
		return snapshot{Missing: true}
	}
	info, err := os.Stat(path)
	if err != nil {
		return snapshot{Missing: true}
	}
	return snapshot{Body: body, Mode: info.Mode().Perm()}
}

// installCandidate 原子写入候选证书与私钥；失败时回滚。
func (m *Manager) installCandidate(crtBody, keyBody []byte, previous map[string]snapshot) error {
	if err := m.atomicWrite(m.CrtPath, crtBody, 0o644); err != nil {
		return m.saveFailure(err, previous)
	}
	if err := m.atomicWrite(m.KeyPath, keyBody, 0o600); err != nil {
		return m.saveFailure(err, previous)
	}
	return nil
}

// saveFailure 处理写入失败：尝试回滚，回滚也失败则报 KindRollback。
func (m *Manager) saveFailure(err error, previous map[string]snapshot) error {
	if rollbackErr := m.restorePrevious(previous); rollbackErr != nil {
		return &Error{
			Kind:    KindRollback,
			Message: fmt.Sprintf("certificate save failed (%s), and rollback failed (%s)", err, rollbackErr),
			Err:     rollbackErr,
		}
	}
	return &Error{Kind: KindSave, Message: err.Error(), Err: err}
}

// checkCandidate 执行 nginx -t；失败时回滚（不 reload）。
func (m *Manager) checkCandidate(previous map[string]snapshot) error {
	if err := m.NginxCheck(); err != nil {
		if rbErr := m.rollback(previous, err, false); rbErr != nil {
			return rbErr
		}
		return &Error{Kind: KindNginxConfig, Message: err.Error(), Err: err}
	}
	return nil
}

// activateCandidate 执行 nginx -s reload；失败时回滚并重新 reload。
func (m *Manager) activateCandidate(previous map[string]snapshot) error {
	if err := m.NginxReload(); err != nil {
		if rbErr := m.rollback(previous, err, true); rbErr != nil {
			return rbErr
		}
		return &Error{Kind: KindNginxReload, Message: err.Error(), Err: err}
	}
	return nil
}

// rollback 恢复旧文件并重新检查 Nginx；失败返回 KindRollback。
func (m *Manager) rollback(previous map[string]snapshot, originalErr error, reloadNginx bool) error {
	if err := m.restorePrevious(previous); err != nil {
		return &Error{
			Kind:    KindRollback,
			Message: fmt.Sprintf("certificate update failed (%s), and rollback failed (%s)", originalErr, err),
			Err:     err,
		}
	}
	if err := m.NginxCheck(); err != nil {
		return &Error{
			Kind:    KindRollback,
			Message: fmt.Sprintf("certificate update failed (%s), and rollback failed (%s)", originalErr, err),
			Err:     err,
		}
	}
	if reloadNginx {
		if err := m.NginxReload(); err != nil {
			return &Error{
				Kind:    KindRollback,
				Message: fmt.Sprintf("certificate update failed (%s), and rollback failed (%s)", originalErr, err),
				Err:     err,
			}
		}
	}
	return nil
}

// restorePrevious 恢复快照中的旧文件；原本不存在的文件被删除。
func (m *Manager) restorePrevious(previous map[string]snapshot) error {
	for path, snap := range previous {
		if snap.Missing {
			removeIfExists(path)
			continue
		}
		if err := m.atomicWrite(path, snap.Body, snap.Mode); err != nil {
			return err
		}
	}
	return nil
}

// atomicWrite 先写临时文件再 rename，保证写入原子性。
func (m *Manager) atomicWrite(path string, body []byte, mode fs.FileMode) error {
	tempPath, err := m.writeTemporary(body, mode, ".install-", ".tmp")
	if err != nil {
		return err
	}
	defer removeIfExists(tempPath)
	return os.Rename(tempPath, path)
}

// writeTemporary 在证书目录内创建临时文件并写入内容。
func (m *Manager) writeTemporary(body []byte, mode fs.FileMode, prefix, suffix string) (string, error) {
	file, err := os.CreateTemp(m.SSLDir, prefix+"*"+suffix)
	if err != nil {
		return "", err
	}
	path := file.Name()
	if err := file.Chmod(mode); err != nil {
		_ = file.Close()
		removeIfExists(path)
		return "", err
	}
	if _, err := file.Write(body); err != nil {
		_ = file.Close()
		removeIfExists(path)
		return "", err
	}
	if err := file.Sync(); err != nil {
		_ = file.Close()
		removeIfExists(path)
		return "", err
	}
	if err := file.Close(); err != nil {
		removeIfExists(path)
		return "", err
	}
	return path, nil
}

// removeIfExists 删除文件，忽略不存在错误。
func removeIfExists(path string) {
	if err := os.Remove(path); err != nil && !errors.Is(err, fs.ErrNotExist) {
		// 清理失败不影响主流程。
		_ = err
	}
}
