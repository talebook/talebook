package importdir

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// TestNormalizePathAbsError 覆盖 filepath.Abs 失败分支（用 NUL 字节触发）。
func TestNormalizePathAbsError(t *testing.T) {
	// Windows 下 NUL 会让 Abs 失败；Linux 下可能成功，两种情况都接受。
	got := NormalizePath("a\x00b")
	_ = got // 只要求不 panic
}

// TestExpandUser 覆盖 ~ 展开。
func TestExpandUser(t *testing.T) {
	home, err := os.UserHomeDir()
	if err != nil {
		t.Skip("无法获取用户主目录")
	}
	if got := expandUser("~"); got != home {
		t.Errorf("expandUser(~) = %q, want %q", got, home)
	}
	if got := expandUser("~/books"); got != filepath.Join(home, "books") {
		t.Errorf("expandUser(~/books) = %q", got)
	}
	// 非 ~ 前缀原样返回。
	if got := expandUser("/data/books"); got != "/data/books" {
		t.Errorf("expandUser(/data/books) = %q", got)
	}
	if got := expandUser("~user/x"); got != "~user/x" {
		t.Errorf("~user 不应展开，得到 %q", got)
	}
}

// TestIsWithinRelError 覆盖 filepath.Rel 失败分支（不同盘符）。
func TestIsWithinRelError(t *testing.T) {
	if runtime.GOOS != "windows" {
		t.Skip("不同盘符仅在 Windows 上可构造")
	}
	if IsWithin(`C:\data`, `D:\data`) {
		t.Error("不同盘符应返回 false")
	}
}

// TestConfiguredAllowedRootsStringForm 覆盖 AllowedRoots 为单元素时的组装。
func TestConfiguredAllowedRootsStringForm(t *testing.T) {
	dir := t.TempDir()
	// 只有 ScanUploadPath，无 AllowedRoots。
	cfg := Config{ScanUploadPath: dir}
	roots := ConfiguredAllowedRoots(cfg)
	if len(roots) != 1 || roots[0] != NormalizePath(dir) {
		t.Errorf("roots = %v, want [%q]", roots, NormalizePath(dir))
	}
	// 空白项被跳过。
	cfg = Config{ScanUploadPath: dir, AllowedRoots: []string{"  ", dir}}
	roots = ConfiguredAllowedRoots(cfg)
	if len(roots) != 1 {
		t.Errorf("空白项应被跳过并去重，得到 %v", roots)
	}
}

// TestSanitizeAllowedRootsDuplicates 重复项去重。
func TestSanitizeAllowedRootsDuplicates(t *testing.T) {
	roots, code, _ := SanitizeAllowedRoots([]string{"/data/a", "/data/a", "/data/b"}, true)
	if code != "" {
		t.Fatalf("不应报错: %q", code)
	}
	if len(roots) != 2 {
		t.Errorf("应去重为 2 项，得到 %v", roots)
	}
}

// TestSafeDirectoryForListingNested 逐级校验嵌套目录。
func TestSafeDirectoryForListingNested(t *testing.T) {
	root := t.TempDir()
	deep := filepath.Join(root, "a", "b", "c")
	if err := os.MkdirAll(deep, 0o755); err != nil {
		t.Fatalf("建目录失败: %v", err)
	}
	roots := []string{NormalizePath(root)}

	// 合法嵌套路径应原样返回。
	if got := SafeDirectoryForListing(deep, roots); got != NormalizePath(deep) {
		t.Errorf("嵌套路径 = %q, want %q", got, NormalizePath(deep))
	}
	// 中间层不存在时应退回根目录。
	missing := filepath.Join(root, "a", "nope", "c")
	if got := SafeDirectoryForListing(missing, roots); got != NormalizePath(root) {
		t.Errorf("不存在路径应退回根目录，得到 %q", got)
	}
	// 无 roots 时退回 /data/。
	if got := SafeDirectoryForListing("", nil); got != NormalizePath(ScanDirPrefix) {
		t.Errorf("无 roots 应退回 /data/，得到 %q", got)
	}
}

// TestSafeDirectoryForListingSymlinkChild 符号链接子目录不被跟随。
func TestSafeDirectoryForListingSymlinkChild(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Windows 创建符号链接需要特权")
	}
	root := t.TempDir()
	target := t.TempDir()
	link := filepath.Join(root, "link")
	if err := os.Symlink(target, link); err != nil {
		t.Skipf("无法创建符号链接: %v", err)
	}
	roots := []string{NormalizePath(root)}
	// 符号链接目录应导致退回根目录。
	if got := SafeDirectoryForListing(link, roots); got != NormalizePath(root) {
		t.Errorf("符号链接应退回根目录，得到 %q", got)
	}
}

// TestCheckImportDirectorySymlink 符号链接目录被判为 error。
func TestCheckImportDirectorySymlink(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Windows 创建符号链接需要特权")
	}
	root := t.TempDir()
	target := t.TempDir()
	link := filepath.Join(root, "link")
	if err := os.Symlink(target, link); err != nil {
		t.Skipf("无法创建符号链接: %v", err)
	}
	res := CheckImportDirectory(link, testConfig(t, root))
	if res.Status != "error" {
		t.Errorf("status = %q, want error", res.Status)
	}
	if !strings.Contains(res.Msg, "软链接") {
		t.Errorf("msg = %q", res.Msg)
	}
}

// TestCheckImportDirectoryUnreadable 不可读目录被判为 error。
func TestCheckImportDirectoryUnreadable(t *testing.T) {
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
	res := CheckImportDirectory(sub, testConfig(t, root))
	if res.Status != "error" {
		t.Errorf("status = %q, want error", res.Status)
	}
	if !strings.Contains(res.Msg, "无法读取") {
		t.Errorf("msg = %q", res.Msg)
	}
}

// TestCheckImportDirectoryNotWritable 不可写目录被判为 warning。
func TestCheckImportDirectoryNotWritable(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Windows 上 chmod 不生效")
	}
	if os.Geteuid() == 0 {
		t.Skip("root 无视权限位")
	}
	root := t.TempDir()
	sub := filepath.Join(root, "ro")
	if err := os.Mkdir(sub, 0o555); err != nil {
		t.Fatalf("建目录失败: %v", err)
	}
	t.Cleanup(func() { _ = os.Chmod(sub, 0o755) })
	res := CheckImportDirectory(sub, testConfig(t, root))
	if res.Status != "warning" {
		t.Errorf("status = %q, want warning（msg=%q）", res.Status, res.Msg)
	}
	if !strings.Contains(res.Msg, "不可写") {
		t.Errorf("msg = %q", res.Msg)
	}
}

// TestCheckImportDirectorySymlinkFile 符号链接文件不被统计。
func TestCheckImportDirectorySymlinkFile(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Windows 创建符号链接需要特权")
	}
	root := t.TempDir()
	real := filepath.Join(root, "real.epub")
	if err := os.WriteFile(real, []byte("x"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	link := filepath.Join(root, "link.epub")
	if err := os.Symlink(real, link); err != nil {
		t.Skipf("无法创建符号链接: %v", err)
	}
	res := CheckImportDirectory(root, testConfig(t, root))
	if res.FileCount != 1 {
		t.Errorf("file_count = %d, want 1（符号链接文件不应统计）", res.FileCount)
	}
}

// TestCheckImportDirectorySymlinkDirSkipped 符号链接目录在遍历时被跳过。
func TestCheckImportDirectorySymlinkDirSkipped(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Windows 创建符号链接需要特权")
	}
	root := t.TempDir()
	target := t.TempDir()
	if err := os.WriteFile(filepath.Join(target, "x.epub"), []byte("x"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	if err := os.Symlink(target, filepath.Join(root, "linkdir")); err != nil {
		t.Skipf("无法创建符号链接: %v", err)
	}
	res := CheckImportDirectory(root, testConfig(t, root))
	if res.FileCount != 0 {
		t.Errorf("file_count = %d, want 0（符号链接目录不应遍历）", res.FileCount)
	}
}

// TestCheckImportDirectoryDefaultBatchSize 未设置批次大小时用 500。
func TestCheckImportDirectoryDefaultBatchSize(t *testing.T) {
	root := t.TempDir()
	cfg := Config{
		ScanUploadPath:   root,
		AllowedRoots:     []string{root},
		SupportedFormats: []string{"epub"},
	}
	res := CheckImportDirectory(root, cfg)
	if res.Status != "ok" {
		t.Errorf("status = %q, want ok", res.Status)
	}
}

// TestDirectoryMessageAllBranches 覆盖所有提示分支。
func TestDirectoryMessageAllBranches(t *testing.T) {
	cases := []struct {
		name string
		res  DirectoryResult
		want string
	}{
		{"不在范围", DirectoryResult{InAllowedRoots: false}, "允许的导入范围"},
		{"不存在", DirectoryResult{InAllowedRoots: true, Exists: false}, "不存在"},
		{"非目录", DirectoryResult{InAllowedRoots: true, Exists: true, IsDir: false}, "不是目录"},
		{"软链接", DirectoryResult{InAllowedRoots: true, Exists: true, IsDir: true, IsSymlink: true}, "软链接"},
		{"不可读", DirectoryResult{InAllowedRoots: true, Exists: true, IsDir: true, Readable: false}, "无法读取"},
		{"不可写", DirectoryResult{InAllowedRoots: true, Exists: true, IsDir: true, Readable: true, Writable: false}, "不可写"},
		{"空目录", DirectoryResult{InAllowedRoots: true, Exists: true, IsDir: true, Readable: true, Writable: true}, "为空"},
		{"截断", DirectoryResult{InAllowedRoots: true, Exists: true, IsDir: true, Readable: true, Writable: true,
			SupportedFileCount: 1, Truncated: true}, "分批扫描"},
		{"正常", DirectoryResult{InAllowedRoots: true, Exists: true, IsDir: true, Readable: true, Writable: true,
			SupportedFileCount: 7}, "7 个支持格式文件"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := directoryMessage(tc.res)
			if !strings.Contains(got, tc.want) {
				t.Errorf("directoryMessage = %q, want 含 %q", got, tc.want)
			}
		})
	}
}

// TestListDirectoriesRootParent 根目录的父目录不可返回。
func TestListDirectoriesRootParent(t *testing.T) {
	root := t.TempDir()
	cfg := testConfig(t, root)
	res := ListDirectories(root, cfg)
	if res.Parent != "" {
		t.Errorf("根目录 parent 应为空，得到 %q", res.Parent)
	}
}

// TestListDirectoriesSymlinkChild 符号链接子目录不出现在列表中。
func TestListDirectoriesSymlinkChild(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Windows 创建符号链接需要特权")
	}
	root := t.TempDir()
	target := t.TempDir()
	if err := os.Symlink(target, filepath.Join(root, "linkdir")); err != nil {
		t.Skipf("无法创建符号链接: %v", err)
	}
	res := ListDirectories(root, cfgFor(root))
	// 符号链接目录仍会被列出（Python 用 os.path.isdir 跟随链接），
	// 但 is_symlink 必须为 true。
	if len(res.Items) != 1 {
		t.Fatalf("应有 1 项，得到 %d", len(res.Items))
	}
	if !res.Items[0].IsSymlink {
		t.Error("is_symlink 应为 true")
	}
}

// cfgFor 是 testConfig 的无 t 版本，供子测试使用。
func cfgFor(root string) Config {
	return Config{
		ScanUploadPath:   root,
		AllowedRoots:     []string{root},
		ScanBatchSize:    500,
		SupportedFormats: []string{"epub", "pdf", "mobi", "cbz"},
	}
}

// TestListDirectoriesReadDirError 目录不可读时返回错误。
func TestListDirectoriesReadDirError(t *testing.T) {
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
	// 直接对不可读目录列举：SafeDirectoryForListing 会因不可读退回根目录，
	// 因此这里断言退回行为而非报错。
	res := ListDirectories(sub, testConfig(t, root))
	if res.Path != NormalizePath(root) {
		t.Errorf("不可读目录应退回根目录，得到 %q", res.Path)
	}
}

// TestIsRootParent 覆盖根目录父目录判断。
func TestIsRootParent(t *testing.T) {
	root := NormalizePath(t.TempDir())
	parent := NormalizePath(filepath.Dir(root))
	if !isRootParent(parent, []string{root}) {
		t.Error("应识别为根目录的父目录")
	}
	if isRootParent(root, []string{root}) {
		t.Error("根目录自身不应被判为父目录")
	}
}

// TestPathHelpers 覆盖 pathExists / isDir / isSymlink 的空路径与不存在分支。
func TestPathHelpers(t *testing.T) {
	if pathExists("") {
		t.Error("空路径 pathExists 应为 false")
	}
	if isDir("") {
		t.Error("空路径 isDir 应为 false")
	}
	if isSymlink("") {
		t.Error("空路径 isSymlink 应为 false")
	}
	missing := filepath.Join(t.TempDir(), "nope")
	if pathExists(missing) {
		t.Error("不存在路径 pathExists 应为 false")
	}
	if isDir(missing) {
		t.Error("不存在路径 isDir 应为 false")
	}
	if isSymlink(missing) {
		t.Error("不存在路径 isSymlink 应为 false")
	}
}

// TestIsReadableFile 覆盖文件（非目录）的可读判断。
func TestIsReadableFile(t *testing.T) {
	dir := t.TempDir()
	file := filepath.Join(dir, "a.epub")
	if err := os.WriteFile(file, []byte("x"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	if !isReadable(file) {
		t.Error("普通文件应可读")
	}
	if isReadable(filepath.Join(dir, "nope")) {
		t.Error("不存在文件不应可读")
	}
}

// TestIsWritableFile 覆盖文件（非目录）的可写判断。
func TestIsWritableFile(t *testing.T) {
	dir := t.TempDir()
	file := filepath.Join(dir, "a.epub")
	if err := os.WriteFile(file, []byte("x"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	if !isWritable(file) {
		t.Error("普通文件应可写")
	}
	if isWritable("") {
		t.Error("空路径不应可写")
	}
	if isWritable(filepath.Join(dir, "nope")) {
		t.Error("不存在路径不应可写")
	}
}

// TestIsWritableReadOnlyFile 只读文件不可写。
func TestIsWritableReadOnlyFile(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Windows 上 chmod 不生效")
	}
	if os.Geteuid() == 0 {
		t.Skip("root 无视权限位")
	}
	dir := t.TempDir()
	file := filepath.Join(dir, "ro.epub")
	if err := os.WriteFile(file, []byte("x"), 0o444); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	if isWritable(file) {
		t.Error("只读文件不应可写")
	}
}

// TestSplitClean 覆盖路径切分。
func TestSplitClean(t *testing.T) {
	sep := string(filepath.Separator)
	got := splitClean("a" + sep + "b" + sep + "c")
	if len(got) != 3 || got[0] != "a" || got[2] != "c" {
		t.Errorf("splitClean = %v", got)
	}
	if got := splitClean("."); len(got) != 0 {
		t.Errorf("'.' 应切为空，得到 %v", got)
	}
	if got := splitClean(""); len(got) != 0 {
		t.Errorf("空串应切为空，得到 %v", got)
	}
}

// TestMatchEntry 覆盖目录条目匹配。
func TestMatchEntry(t *testing.T) {
	dir := t.TempDir()
	if err := os.Mkdir(filepath.Join(dir, "sub"), 0o755); err != nil {
		t.Fatalf("建目录失败: %v", err)
	}
	if got := matchEntry(dir, "sub"); got != "sub" {
		t.Errorf("matchEntry = %q, want sub", got)
	}
	if got := matchEntry(dir, "nope"); got != "" {
		t.Errorf("未命中应返回空串，得到 %q", got)
	}
	if got := matchEntry(filepath.Join(dir, "nope"), "sub"); got != "" {
		t.Errorf("目录不存在应返回空串，得到 %q", got)
	}
}
