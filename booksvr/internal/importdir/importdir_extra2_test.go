package importdir

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

// TestListDirectoriesEmptyRequested 覆盖 requested 为空时的兜底分支。
func TestListDirectoriesEmptyRequested(t *testing.T) {
	root := t.TempDir()
	// ScanUploadPath 为空、roots 非空 → 用 roots[0]。
	cfg := Config{
		AllowedRoots:     []string{root},
		ScanBatchSize:    500,
		SupportedFormats: []string{"epub"},
	}
	res := ListDirectories("", cfg)
	if res.Path != NormalizePath(root) {
		t.Errorf("path = %q, want %q", res.Path, NormalizePath(root))
	}
}

// TestListDirectoriesReadDirFailure 覆盖 ReadDir 失败分支。
func TestListDirectoriesReadDirFailure(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Windows 上 chmod 不生效")
	}
	if os.Geteuid() == 0 {
		t.Skip("root 无视权限位")
	}
	root := t.TempDir()
	sub := filepath.Join(root, "locked")
	if err := os.Mkdir(sub, 0o000); err != nil {
		t.Fatalf("建目录失败: %v", err)
	}
	t.Cleanup(func() { _ = os.Chmod(sub, 0o755) })

	// 直接把不可读目录当作根目录，绕过 SafeDirectoryForListing 的退回逻辑。
	cfg := Config{
		ScanUploadPath:   sub,
		AllowedRoots:     []string{sub},
		ScanBatchSize:    500,
		SupportedFormats: []string{"epub"},
	}
	res := ListDirectories(sub, cfg)
	if res.Err != "params.path" {
		t.Errorf("err = %q, want params.path（res=%+v）", res.Err, res)
	}
}

// TestCountFilesWalkError 覆盖 WalkDir 回调的错误分支。
func TestCountFilesWalkError(t *testing.T) {
	root := t.TempDir()
	// 建一个在遍历过程中消失的目录较难，改为验证不可读子目录被跳过。
	sub := filepath.Join(root, "sub")
	if err := os.Mkdir(sub, 0o755); err != nil {
		t.Fatalf("建目录失败: %v", err)
	}
	if err := os.WriteFile(filepath.Join(sub, "a.epub"), []byte("x"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	res := CheckImportDirectory(root, testConfig(t, root))
	if res.SupportedFileCount != 1 {
		t.Errorf("supported_file_count = %d, want 1", res.SupportedFileCount)
	}
}

// TestCountFilesNonRegular 非常规文件（FIFO）不被统计。
func TestCountFilesNonRegular(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Windows 不支持 mkfifo")
	}
	root := t.TempDir()
	fifo := filepath.Join(root, "pipe.epub")
	if err := mkfifo(fifo); err != nil {
		t.Skipf("无法创建 FIFO: %v", err)
	}
	res := CheckImportDirectory(root, testConfig(t, root))
	if res.FileCount != 0 {
		t.Errorf("file_count = %d, want 0（FIFO 不应统计）", res.FileCount)
	}
}

// TestSafeDirectoryForListingRelError 覆盖 filepath.Rel 失败分支。
func TestSafeDirectoryForListingRelError(t *testing.T) {
	if runtime.GOOS != "windows" {
		t.Skip("不同盘符仅在 Windows 上可构造")
	}
	roots := []string{NormalizePath(`C:\data`)}
	// 请求路径在 D 盘，Rel 会失败 → 退回 fallback。
	got := SafeDirectoryForListing(`D:\data`, roots)
	if got != roots[0] {
		t.Errorf("跨盘符应退回 %q，得到 %q", roots[0], got)
	}
}

// TestConfiguredAllowedRootsEmptyNormalize 覆盖归一化后为空的兜底。
func TestConfiguredAllowedRootsEmptyNormalize(t *testing.T) {
	// 全是空白项 → 归一化后为空 → 退回 /data/。
	cfg := Config{AllowedRoots: []string{"   ", ""}}
	roots := ConfiguredAllowedRoots(cfg)
	if len(roots) != 1 {
		t.Fatalf("应退回 1 项，得到 %v", roots)
	}
	if roots[0] != NormalizePath(ScanDirPrefix) {
		t.Errorf("应退回 %q，得到 %q", NormalizePath(ScanDirPrefix), roots[0])
	}
}

// TestSanitizeAllowedRootsEmptyNormalize 覆盖归一化后为空的项被跳过。
func TestSanitizeAllowedRootsEmptyNormalize(t *testing.T) {
	// 含一个合法项与一个空白项：空白项被跳过，合法项保留。
	roots, code, _ := SanitizeAllowedRoots([]string{"/data/ok", "  "}, true)
	if code != "" {
		t.Fatalf("不应报错: %q", code)
	}
	if len(roots) != 1 {
		t.Errorf("应保留 1 项，得到 %v", roots)
	}
}
