package sslcert

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"errors"
	"math/big"
	"os"
	"path/filepath"
	"testing"
	"time"
)

// testPair 生成一对自签名的证书与私钥 PEM。
func testPair(t *testing.T) ([]byte, []byte) {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatalf("生成私钥失败: %v", err)
	}
	tmpl := &x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject:      pkix.Name{CommonName: "localhost"},
		NotBefore:    time.Now().Add(-time.Hour),
		NotAfter:     time.Now().Add(24 * time.Hour),
	}
	der, err := x509.CreateCertificate(rand.Reader, tmpl, tmpl, &key.PublicKey, key)
	if err != nil {
		t.Fatalf("生成证书失败: %v", err)
	}
	keyDER, err := x509.MarshalECPrivateKey(key)
	if err != nil {
		t.Fatalf("序列化私钥失败: %v", err)
	}
	crt := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})
	keyPEM := pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: keyDER})
	return crt, keyPEM
}

// fixture 是一套证书管理器测试环境。
type fixture struct {
	// Manager 是被测管理器。
	Manager *Manager
	// Dir 是证书目录。
	Dir string
	// CrtPath / KeyPath 是证书与私钥路径。
	CrtPath string
	KeyPath string
	// OldCrt / OldKey 是安装前的旧内容。
	OldCrt []byte
	OldKey []byte
	// Crt / Key 是待安装的新内容。
	Crt []byte
	Key []byte
	// Calls 记录命令调用序列。
	Calls []string
	// Fail 决定某次命令是否失败，键为 "nginx -t" / "nginx -s reload"。
	Fail map[string]bool
	// FailOnce 决定某次命令是否失败一次，之后恢复正常。
	FailOnce map[string]bool
}

// newFixture 构造测试环境：目录内已有旧证书对。
func newFixture(t *testing.T) *fixture {
	t.Helper()
	dir := t.TempDir()
	fx := &fixture{
		Dir:      dir,
		CrtPath:  filepath.Join(dir, "ssl.crt"),
		KeyPath:  filepath.Join(dir, "ssl.key"),
		OldCrt:   []byte("previous certificate"),
		OldKey:   []byte("previous private key"),
		Fail:     map[string]bool{},
		FailOnce: map[string]bool{},
	}
	if err := os.WriteFile(fx.CrtPath, fx.OldCrt, 0o644); err != nil {
		t.Fatalf("写入旧证书失败: %v", err)
	}
	if err := os.WriteFile(fx.KeyPath, fx.OldKey, 0o600); err != nil {
		t.Fatalf("写入旧私钥失败: %v", err)
	}
	fx.Crt, fx.Key = testPair(t)

	mgr, err := NewManager(fx.CrtPath, fx.KeyPath)
	if err != nil {
		t.Fatalf("构造管理器失败: %v", err)
	}
	mgr.RunCommand = func(name string, args ...string) error {
		call := name
		for _, a := range args {
			call += " " + a
		}
		fx.Calls = append(fx.Calls, call)
		if fx.Fail[call] {
			return errors.New("command failed: " + call)
		}
		if fx.FailOnce[call] {
			delete(fx.FailOnce, call)
			return errors.New("command failed: " + call)
		}
		return nil
	}
	fx.Manager = mgr
	return fx
}

// TestNewManagerRejectsDifferentDirs 覆盖证书与私钥不同目录。
func TestNewManagerRejectsDifferentDirs(t *testing.T) {
	if _, err := NewManager("/a/ssl.crt", "/b/ssl.key"); err == nil {
		t.Fatal("不同目录应返回错误")
	}
}

// TestInstallReplacesPairAndReloadsNginx 覆盖成功安装。
func TestInstallReplacesPairAndReloadsNginx(t *testing.T) {
	fx := newFixture(t)
	if err := fx.Manager.Install(fx.Crt, fx.Key); err != nil {
		t.Fatalf("安装失败: %v", err)
	}

	gotCrt, _ := os.ReadFile(fx.CrtPath)
	gotKey, _ := os.ReadFile(fx.KeyPath)
	if string(gotCrt) != string(fx.Crt) {
		t.Error("证书内容未替换")
	}
	if string(gotKey) != string(fx.Key) {
		t.Error("私钥内容未替换")
	}

	want := []string{"nginx -t", "nginx -s reload"}
	if len(fx.Calls) != len(want) {
		t.Fatalf("命令调用 = %v，期望 %v", fx.Calls, want)
	}
	for i := range want {
		if fx.Calls[i] != want[i] {
			t.Errorf("命令 %d = %q，期望 %q", i, fx.Calls[i], want[i])
		}
	}

	entries, _ := os.ReadDir(fx.Dir)
	names := []string{}
	for _, e := range entries {
		names = append(names, e.Name())
	}
	if len(names) != 3 {
		t.Errorf("目录残留文件: %v", names)
	}
}

// TestInstallInvalidPairKeepsExistingFiles 覆盖无效配对。
func TestInstallInvalidPairKeepsExistingFiles(t *testing.T) {
	fx := newFixture(t)
	err := fx.Manager.Install([]byte("not a certificate"), fx.Key)
	if err == nil {
		t.Fatal("无效证书应报错")
	}
	var sslErr *Error
	if !errors.As(err, &sslErr) || sslErr.Kind != KindValidation {
		t.Fatalf("错误类别 = %v，期望 KindValidation", err)
	}

	gotCrt, _ := os.ReadFile(fx.CrtPath)
	gotKey, _ := os.ReadFile(fx.KeyPath)
	if string(gotCrt) != string(fx.OldCrt) || string(gotKey) != string(fx.OldKey) {
		t.Error("旧证书对不应被改动")
	}
	if len(fx.Calls) != 0 {
		t.Errorf("不应调用 nginx，实际 %v", fx.Calls)
	}
}

// TestInstallNginxConfigFailureRestoresPair 覆盖 nginx -t 失败回滚。
func TestInstallNginxConfigFailureRestoresPair(t *testing.T) {
	fx := newFixture(t)
	fx.FailOnce["nginx -t"] = true

	err := fx.Manager.Install(fx.Crt, fx.Key)
	var sslErr *Error
	if !errors.As(err, &sslErr) || sslErr.Kind != KindNginxConfig {
		t.Fatalf("错误类别 = %v，期望 KindNginxConfig", err)
	}

	gotCrt, _ := os.ReadFile(fx.CrtPath)
	gotKey, _ := os.ReadFile(fx.KeyPath)
	if string(gotCrt) != string(fx.OldCrt) || string(gotKey) != string(fx.OldKey) {
		t.Error("旧证书对应被恢复")
	}
	// 第一次 nginx -t 失败，回滚后再次 nginx -t 成功。
	want := []string{"nginx -t", "nginx -t"}
	if len(fx.Calls) != len(want) {
		t.Fatalf("命令调用 = %v，期望 %v", fx.Calls, want)
	}
}

// TestInstallNginxReloadFailureRestoresAndReloads 覆盖 reload 失败回滚。
func TestInstallNginxReloadFailureRestoresAndReloads(t *testing.T) {
	fx := newFixture(t)
	fx.FailOnce["nginx -s reload"] = true

	err := fx.Manager.Install(fx.Crt, fx.Key)
	var sslErr *Error
	if !errors.As(err, &sslErr) || sslErr.Kind != KindNginxReload {
		t.Fatalf("错误类别 = %v，期望 KindNginxReload", err)
	}

	gotCrt, _ := os.ReadFile(fx.CrtPath)
	gotKey, _ := os.ReadFile(fx.KeyPath)
	if string(gotCrt) != string(fx.OldCrt) || string(gotKey) != string(fx.OldKey) {
		t.Error("旧证书对应被恢复")
	}
	// nginx -t 成功 → reload 失败 → 回滚后 nginx -t + reload。
	want := []string{"nginx -t", "nginx -s reload", "nginx -t", "nginx -s reload"}
	if len(fx.Calls) != len(want) {
		t.Fatalf("命令调用 = %v，期望 %v", fx.Calls, want)
	}
}

// TestInstallMissingPreviousFilesRemovedOnRollback 覆盖旧文件不存在时回滚删除。
func TestInstallMissingPreviousFilesRemovedOnRollback(t *testing.T) {
	fx := newFixture(t)
	if err := os.Remove(fx.CrtPath); err != nil {
		t.Fatal(err)
	}
	if err := os.Remove(fx.KeyPath); err != nil {
		t.Fatal(err)
	}
	fx.FailOnce["nginx -t"] = true

	err := fx.Manager.Install(fx.Crt, fx.Key)
	var sslErr *Error
	if !errors.As(err, &sslErr) || sslErr.Kind != KindNginxConfig {
		t.Fatalf("错误类别 = %v，期望 KindNginxConfig", err)
	}
	if _, statErr := os.Stat(fx.CrtPath); !errors.Is(statErr, os.ErrNotExist) {
		t.Error("回滚后证书文件应不存在")
	}
	if _, statErr := os.Stat(fx.KeyPath); !errors.Is(statErr, os.ErrNotExist) {
		t.Error("回滚后私钥文件应不存在")
	}
}

// TestInstallSaveFailureRestoresPair 覆盖写入失败回滚。
func TestInstallSaveFailureRestoresPair(t *testing.T) {
	fx := newFixture(t)
	// 把私钥路径指向一个目录，使 os.Rename 失败。
	badKey := filepath.Join(fx.Dir, "badkey")
	if err := os.Mkdir(badKey, 0o755); err != nil {
		t.Fatal(err)
	}
	mgr, err := NewManager(fx.CrtPath, badKey)
	if err != nil {
		t.Fatal(err)
	}
	mgr.RunCommand = fx.Manager.RunCommand

	installErr := mgr.Install(fx.Crt, fx.Key)
	var sslErr *Error
	if !errors.As(installErr, &sslErr) {
		t.Fatalf("应返回 *Error，实际 %v", installErr)
	}
	if sslErr.Kind != KindSave && sslErr.Kind != KindRollback {
		t.Fatalf("错误类别 = %v，期望 KindSave 或 KindRollback", sslErr.Kind)
	}
	gotCrt, _ := os.ReadFile(fx.CrtPath)
	if string(gotCrt) != string(fx.OldCrt) {
		t.Error("旧证书应被恢复")
	}
}

// TestCheckSSLChainFilesValid 覆盖有效配对。
func TestCheckSSLChainFilesValid(t *testing.T) {
	fx := newFixture(t)
	crtPath := filepath.Join(fx.Dir, "check.crt")
	keyPath := filepath.Join(fx.Dir, "check.key")
	if err := os.WriteFile(crtPath, fx.Crt, 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(keyPath, fx.Key, 0o600); err != nil {
		t.Fatal(err)
	}
	if err := fx.Manager.CheckSSLChainFiles(crtPath, keyPath); err != nil {
		t.Errorf("有效配对不应报错: %v", err)
	}
}

// TestCheckSSLChainFilesInvalid 覆盖无效配对。
func TestCheckSSLChainFilesInvalid(t *testing.T) {
	fx := newFixture(t)
	if err := fx.Manager.CheckSSLChainFiles(fx.CrtPath, fx.KeyPath); err == nil {
		t.Error("无效配对应报错")
	}
}

// TestInstallCreatesMissingDir 覆盖证书目录不存在时自动创建。
func TestInstallCreatesMissingDir(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "nested", "ssl")
	mgr, err := NewManager(filepath.Join(dir, "ssl.crt"), filepath.Join(dir, "ssl.key"))
	if err != nil {
		t.Fatal(err)
	}
	mgr.RunCommand = func(string, ...string) error { return nil }
	crt, key := testPair(t)
	if err := mgr.Install(crt, key); err != nil {
		t.Fatalf("安装失败: %v", err)
	}
	if _, err := os.Stat(filepath.Join(dir, "ssl.crt")); err != nil {
		t.Errorf("证书文件应存在: %v", err)
	}
}

// TestInstallNilRunnerUsesDefault 覆盖 RunCommand 为 nil 时回落默认执行器。
func TestInstallNilRunnerUsesDefault(t *testing.T) {
	dir := t.TempDir()
	mgr, err := NewManager(filepath.Join(dir, "ssl.crt"), filepath.Join(dir, "ssl.key"))
	if err != nil {
		t.Fatal(err)
	}
	mgr.RunCommand = nil
	crt, key := testPair(t)
	// 本机没有 nginx：nginx -t 失败，回滚时的 nginx -t 也失败，
	// 因此预期得到 KindRollback（而不是 panic）。
	err = mgr.Install(crt, key)
	if err == nil {
		t.Skip("本机存在 nginx，跳过")
	}
	var sslErr *Error
	if !errors.As(err, &sslErr) {
		t.Fatalf("应返回 *Error，实际 %v", err)
	}
	if sslErr.Kind != KindRollback && sslErr.Kind != KindNginxConfig {
		t.Fatalf("错误类别 = %v，期望 KindRollback 或 KindNginxConfig", sslErr.Kind)
	}
}

// TestErrorUnwrap 覆盖错误链。
func TestErrorUnwrap(t *testing.T) {
	inner := errors.New("inner")
	err := &Error{Kind: KindSave, Message: "outer", Err: inner}
	if !errors.Is(err, inner) {
		t.Error("Unwrap 应返回底层错误")
	}
	if err.Error() != "outer" {
		t.Errorf("Error() = %q", err.Error())
	}
}
