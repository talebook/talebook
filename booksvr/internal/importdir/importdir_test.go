package importdir

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// testConfig 返回一份以临时目录为根的配置。
func testConfig(t *testing.T, root string) Config {
	t.Helper()
	return Config{
		ScanUploadPath:   root,
		AllowedRoots:     []string{root},
		ScanBatchSize:    500,
		SupportedFormats: []string{"epub", "pdf", "mobi", "cbz"},
	}
}

// TestNormalizePath 覆盖路径归一化。
func TestNormalizePath(t *testing.T) {
	if got := NormalizePath(""); got != "" {
		t.Errorf("空输入应返回空串，得到 %q", got)
	}
	if got := NormalizePath("   "); got != "" {
		t.Errorf("纯空白应返回空串，得到 %q", got)
	}
	dir := t.TempDir()
	got := NormalizePath(dir)
	if !filepath.IsAbs(got) {
		t.Errorf("应返回绝对路径，得到 %q", got)
	}
	// 相对路径应转成绝对路径。
	got = NormalizePath(".")
	if !filepath.IsAbs(got) {
		t.Errorf("相对路径应转绝对，得到 %q", got)
	}
}

// TestNormalizePathResolvesSymlink 符号链接应被解析。
func TestNormalizePathResolvesSymlink(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Windows 创建符号链接需要特权")
	}
	dir := t.TempDir()
	real := filepath.Join(dir, "real")
	if err := os.Mkdir(real, 0o755); err != nil {
		t.Fatalf("建目录失败: %v", err)
	}
	link := filepath.Join(dir, "link")
	if err := os.Symlink(real, link); err != nil {
		t.Skipf("无法创建符号链接: %v", err)
	}
	if got := NormalizePath(link); got != NormalizePath(real) {
		t.Errorf("符号链接应解析为 %q，得到 %q", NormalizePath(real), got)
	}
}

// TestIsWithin 覆盖包含判断。
func TestIsWithin(t *testing.T) {
	sep := string(filepath.Separator)
	cases := []struct {
		path, prefix string
		want         bool
	}{
		{"/data", "/data", true},
		{"/data" + sep + "books", "/data", true},
		{"/data" + sep + "books" + sep + "a.epub", "/data", true},
		{"/database", "/data", false},
		{"/data2", "/data", false},
		{"/other", "/data", false},
		{"", "/data", false},
		{"/data", "", false},
	}
	for _, tc := range cases {
		if got := IsWithin(tc.path, tc.prefix); got != tc.want {
			t.Errorf("IsWithin(%q, %q) = %v, want %v", tc.path, tc.prefix, got, tc.want)
		}
	}
}

// TestConfiguredAllowedRoots 允许根目录的组装与去重。
func TestConfiguredAllowedRoots(t *testing.T) {
	dir := t.TempDir()
	sub := filepath.Join(dir, "imports")
	if err := os.Mkdir(sub, 0o755); err != nil {
		t.Fatalf("建目录失败: %v", err)
	}

	// 配置了 AllowedRoots 时，再追加 ScanUploadPath。
	cfg := Config{ScanUploadPath: sub, AllowedRoots: []string{dir}}
	roots := ConfiguredAllowedRoots(cfg)
	if len(roots) != 2 {
		t.Fatalf("应有 2 个根目录，得到 %v", roots)
	}
	if roots[0] != NormalizePath(dir) || roots[1] != NormalizePath(sub) {
		t.Errorf("顺序错误: %v", roots)
	}

	// 重复项应去重。
	cfg = Config{ScanUploadPath: dir, AllowedRoots: []string{dir}}
	if roots := ConfiguredAllowedRoots(cfg); len(roots) != 1 {
		t.Errorf("应去重为 1 个，得到 %v", roots)
	}

	// 全空时退回 scan_upload_path 的默认值 /data/books/imports/。
	cfg = Config{}
	roots = ConfiguredAllowedRoots(cfg)
	if len(roots) != 1 {
		t.Fatalf("应退回 1 个根目录，得到 %v", roots)
	}
	if roots[0] != NormalizePath(DefaultScanPath) {
		t.Errorf("应退回 %q，得到 %q", NormalizePath(DefaultScanPath), roots[0])
	}
}

// TestSanitizeAllowedRoots 允许根目录的安全校验。
func TestSanitizeAllowedRoots(t *testing.T) {
	// 未提供时返回 nil 且无错误。
	roots, code, msg := SanitizeAllowedRoots(nil, false)
	if roots != nil || code != "" || msg != "" {
		t.Errorf("未提供时应返回 (nil, \"\", \"\")，得到 (%v, %q, %q)", roots, code, msg)
	}

	// 空列表被拒绝。
	_, code, _ = SanitizeAllowedRoots([]string{}, true)
	if code != "params.allowed_roots" {
		t.Errorf("空列表应被拒绝，得到 %q", code)
	}

	// 纯空白项被剔除后为空，同样被拒绝。
	_, code, _ = SanitizeAllowedRoots([]string{"   ", ""}, true)
	if code != "params.allowed_roots" {
		t.Errorf("纯空白应被拒绝，得到 %q", code)
	}

	// 不在 /data/ 之下的路径被拒绝。
	_, code, msg = SanitizeAllowedRoots([]string{"/etc"}, true)
	if code != "params.allowed_roots" {
		t.Errorf("越界路径应被拒绝，得到 %q", code)
	}
	if !strings.Contains(msg, ScanDirPrefix) {
		t.Errorf("提示应含 %q，得到 %q", ScanDirPrefix, msg)
	}

	// /data/ 之下合法。
	roots, code, _ = SanitizeAllowedRoots([]string{"/data/books"}, true)
	if code != "" {
		t.Errorf("合法路径不应报错，得到 %q", code)
	}
	if len(roots) != 1 {
		t.Errorf("应有 1 个根目录，得到 %v", roots)
	}
}

// TestCheckImportDirectoryOK 正常目录检查。
func TestCheckImportDirectoryOK(t *testing.T) {
	dir := t.TempDir()
	// 建两个支持格式文件与一个不支持格式文件。
	for _, name := range []string{"a.epub", "b.pdf", "c.txt"} {
		if err := os.WriteFile(filepath.Join(dir, name), []byte("x"), 0o644); err != nil {
			t.Fatalf("写文件失败: %v", err)
		}
	}
	res := CheckImportDirectory(dir, testConfig(t, dir))
	if res.Status != "ok" {
		t.Errorf("status = %q, want ok（msg=%q）", res.Status, res.Msg)
	}
	if !res.Exists || !res.IsDir || !res.InAllowedRoots {
		t.Errorf("基本标志错误: %+v", res)
	}
	if res.FileCount != 3 {
		t.Errorf("file_count = %d, want 3", res.FileCount)
	}
	if res.SupportedFileCount != 2 {
		t.Errorf("supported_file_count = %d, want 2", res.SupportedFileCount)
	}
	if res.Truncated {
		t.Error("不应标记 truncated")
	}
	if res.CheckedAt == "" {
		t.Error("checked_at 不应为空")
	}
}

// TestCheckImportDirectoryMissing 目录不存在。
func TestCheckImportDirectoryMissing(t *testing.T) {
	dir := t.TempDir()
	missing := filepath.Join(dir, "nope")
	res := CheckImportDirectory(missing, testConfig(t, dir))
	if res.Status != "error" {
		t.Errorf("status = %q, want error", res.Status)
	}
	if res.Exists {
		t.Error("exists 应为 false")
	}
	if !strings.Contains(res.Msg, "不存在") {
		t.Errorf("msg = %q", res.Msg)
	}
}

// TestCheckImportDirectoryNotDir 路径不是目录。
func TestCheckImportDirectoryNotDir(t *testing.T) {
	dir := t.TempDir()
	file := filepath.Join(dir, "a.epub")
	if err := os.WriteFile(file, []byte("x"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	res := CheckImportDirectory(file, testConfig(t, dir))
	if res.Status != "error" {
		t.Errorf("status = %q, want error", res.Status)
	}
	if !strings.Contains(res.Msg, "不是目录") {
		t.Errorf("msg = %q", res.Msg)
	}
}

// TestCheckImportDirectoryOutsideRoots 目录不在允许范围内。
func TestCheckImportDirectoryOutsideRoots(t *testing.T) {
	dir := t.TempDir()
	outside := t.TempDir()
	res := CheckImportDirectory(outside, testConfig(t, dir))
	if res.Status != "error" {
		t.Errorf("status = %q, want error", res.Status)
	}
	if res.InAllowedRoots {
		t.Error("in_allowed_roots 应为 false")
	}
	if !strings.Contains(res.Msg, "允许的导入范围") {
		t.Errorf("msg = %q", res.Msg)
	}
}

// TestCheckImportDirectoryEmpty 空目录提示。
func TestCheckImportDirectoryEmpty(t *testing.T) {
	dir := t.TempDir()
	res := CheckImportDirectory(dir, testConfig(t, dir))
	if res.Status != "ok" {
		t.Errorf("status = %q, want ok", res.Status)
	}
	if !strings.Contains(res.Msg, "为空") {
		t.Errorf("msg = %q", res.Msg)
	}
}

// TestCheckImportDirectoryTruncated 文件数超过上限时标记 truncated。
func TestCheckImportDirectoryTruncated(t *testing.T) {
	dir := t.TempDir()
	for i := 0; i < 5; i++ {
		name := filepath.Join(dir, "f"+string(rune('a'+i))+".epub")
		if err := os.WriteFile(name, []byte("x"), 0o644); err != nil {
			t.Fatalf("写文件失败: %v", err)
		}
	}
	cfg := testConfig(t, dir)
	cfg.ScanBatchSize = 3
	res := CheckImportDirectory(dir, cfg)
	if !res.Truncated {
		t.Errorf("应标记 truncated（file_count=%d）", res.FileCount)
	}
	if !strings.Contains(res.Msg, "分批扫描") {
		t.Errorf("msg = %q", res.Msg)
	}
}

// TestCheckImportDirectorySkipsHidden 隐藏文件与目录被跳过。
func TestCheckImportDirectorySkipsHidden(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, ".hidden.epub"), []byte("x"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	hiddenDir := filepath.Join(dir, ".git")
	if err := os.Mkdir(hiddenDir, 0o755); err != nil {
		t.Fatalf("建目录失败: %v", err)
	}
	if err := os.WriteFile(filepath.Join(hiddenDir, "x.epub"), []byte("x"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	thumbDir := filepath.Join(dir, "@__thumb")
	if err := os.Mkdir(thumbDir, 0o755); err != nil {
		t.Fatalf("建目录失败: %v", err)
	}
	if err := os.WriteFile(filepath.Join(thumbDir, "y.epub"), []byte("x"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, "ok.epub"), []byte("x"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}

	res := CheckImportDirectory(dir, testConfig(t, dir))
	if res.FileCount != 1 {
		t.Errorf("file_count = %d, want 1（只应统计 ok.epub）", res.FileCount)
	}
}

// TestListDirectories 目录列举。
func TestListDirectories(t *testing.T) {
	dir := t.TempDir()
	for _, name := range []string{"Beta", "alpha", "Gamma"} {
		if err := os.Mkdir(filepath.Join(dir, name), 0o755); err != nil {
			t.Fatalf("建目录失败: %v", err)
		}
	}
	// 隐藏目录与文件不应出现。
	if err := os.Mkdir(filepath.Join(dir, ".hidden"), 0o755); err != nil {
		t.Fatalf("建目录失败: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, "file.epub"), []byte("x"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}

	res := ListDirectories(dir, testConfig(t, dir))
	if res.Err != "" {
		t.Fatalf("不应报错: %v", res)
	}
	if len(res.Items) != 3 {
		t.Fatalf("应有 3 项，得到 %d: %+v", len(res.Items), res.Items)
	}
	// 按小写名排序：alpha, Beta, Gamma。
	want := []string{"alpha", "Beta", "Gamma"}
	for i, item := range res.Items {
		if item.Name != want[i] {
			t.Errorf("第 %d 项 = %q, want %q", i, item.Name, want[i])
		}
		if !item.InAllowedRoots {
			t.Errorf("%q 应在允许范围内", item.Name)
		}
		if !item.Readable {
			t.Errorf("%q 应可读", item.Name)
		}
	}
}

// TestListDirectoriesParent 父目录计算。
func TestListDirectoriesParent(t *testing.T) {
	root := t.TempDir()
	child := filepath.Join(root, "sub")
	if err := os.Mkdir(child, 0o755); err != nil {
		t.Fatalf("建目录失败: %v", err)
	}
	cfg := testConfig(t, root)

	// 根目录本身没有可返回的父目录。
	res := ListDirectories(root, cfg)
	if res.Parent != "" {
		t.Errorf("根目录的 parent 应为空，得到 %q", res.Parent)
	}

	// 子目录的父目录是根目录。
	res = ListDirectories(child, cfg)
	if res.Parent != NormalizePath(root) {
		t.Errorf("parent = %q, want %q", res.Parent, NormalizePath(root))
	}
}

// TestListDirectoriesOutsideRoots 越界路径退回第一个允许根目录。
func TestListDirectoriesOutsideRoots(t *testing.T) {
	root := t.TempDir()
	outside := t.TempDir()
	res := ListDirectories(outside, testConfig(t, root))
	if res.Path != NormalizePath(root) {
		t.Errorf("越界应退回根目录 %q，得到 %q", NormalizePath(root), res.Path)
	}
}

// TestListDirectoriesTraversal 含 .. 的路径退回根目录。
func TestListDirectoriesTraversal(t *testing.T) {
	root := t.TempDir()
	sub := filepath.Join(root, "sub")
	if err := os.Mkdir(sub, 0o755); err != nil {
		t.Fatalf("建目录失败: %v", err)
	}
	// 构造 root/sub/../.. 这类越界路径。
	traversal := filepath.Join(sub, "..", "..")
	res := ListDirectories(traversal, testConfig(t, root))
	if res.Path != NormalizePath(root) {
		t.Errorf("越界应退回根目录，得到 %q", res.Path)
	}
}

// TestListDirectoriesMissing 目录不存在时返回错误。
func TestListDirectoriesMissing(t *testing.T) {
	root := t.TempDir()
	missing := filepath.Join(root, "nope")
	res := ListDirectories(missing, testConfig(t, root))
	// 不存在的路径会被 SafeDirectoryForListing 退回根目录，因此不报错。
	if res.Err != "" {
		t.Errorf("应退回根目录而非报错，得到 %v", res)
	}
	if res.Path != NormalizePath(root) {
		t.Errorf("path = %q, want %q", res.Path, NormalizePath(root))
	}
}

// TestIsPathInRoots 路径归属判断。
func TestIsPathInRoots(t *testing.T) {
	dir := t.TempDir()
	sub := filepath.Join(dir, "sub")
	if err := os.Mkdir(sub, 0o755); err != nil {
		t.Fatalf("建目录失败: %v", err)
	}
	roots := []string{NormalizePath(dir)}
	if !IsPathInRoots(sub, roots) {
		t.Error("子目录应在范围内")
	}
	if !IsPathInRoots(dir, roots) {
		t.Error("根目录自身应在范围内")
	}
	if IsPathInRoots(t.TempDir(), roots) {
		t.Error("无关目录不应在范围内")
	}
	if IsPathInRoots("", roots) {
		t.Error("空路径不应在范围内")
	}
}
