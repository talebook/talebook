// Package importdir 复刻 webserver/handlers/scan.py 中与导入目录相关的纯逻辑。
//
// 覆盖路径归一化、允许根目录校验、目录检查与目录列举四部分，
// 不涉及扫描/导入流水线（那部分依赖 ScanService）。
package importdir

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// ScanDirPrefix 保留默认扫描根路径；导入根目录现在由管理员显式配置，
// 可以是容器内任意绝对路径。
const ScanDirPrefix = "/data/"

// DefaultScanPath 复刻 scan_upload_path 的默认值。
const DefaultScanPath = "/data/books/imports/"

// Config 是导入目录逻辑读取的配置项。
type Config struct {
	// ScanUploadPath 对应 CONF 的 scan_upload_path。
	ScanUploadPath string
	// AllowedRoots 对应 CONF 的 import_allowed_roots。
	AllowedRoots []string
	// ScanBatchSize 对应 CONF 的 import_scan_batch_size，用于截断计数。
	ScanBatchSize int
	// SupportedFormats 是支持的文件扩展名（小写，不含点）。
	SupportedFormats []string
	// ImportMode 是请求显式指定的导入模式（index/copy/move）。
	ImportMode string
	// SavedImportMode 是配置中已保存的导入模式。
	SavedImportMode string
	// DeleteAfter 为真时表示导入后删除源文件（等价于 move）。
	DeleteAfter bool
	// AutoWatchEnabled 对应 CONF 的 import_auto_watch_enabled。
	AutoWatchEnabled bool
}

// NormalizePath 复刻 _normalize_path：展开 ~、转绝对路径、解析符号链接。
//
// 空输入返回空串。realpath 失败时退回绝对路径（Python 的 realpath 不抛错，
// 这里保持同样的容错）。
func NormalizePath(path string) string {
	if strings.TrimSpace(path) == "" {
		return ""
	}
	expanded := expandUser(path)
	abs, err := filepath.Abs(expanded)
	if err != nil {
		return ""
	}
	if resolved, err := filepath.EvalSymlinks(abs); err == nil {
		return resolved
	}
	return abs
}

// expandUser 复刻 os.path.expanduser 的 ~ 与 ~/ 前缀展开。
func expandUser(path string) string {
	if path == "~" || strings.HasPrefix(path, "~/") || strings.HasPrefix(path, `~\`) {
		if home, err := os.UserHomeDir(); err == nil {
			if path == "~" {
				return home
			}
			return filepath.Join(home, path[2:])
		}
	}
	return path
}

// IsWithin 复刻 _is_within：判断 path 是否等于 prefix 或位于其下。
//
// 用相对路径判断而非字符串前缀，避免 /database 被误判为 /data 的子目录；
// 不同盘符（Windows）时返回 false。
func IsWithin(path, prefix string) bool {
	if path == "" || prefix == "" {
		return false
	}
	rel, err := filepath.Rel(prefix, path)
	if err != nil {
		return false
	}
	if rel == "." {
		return true
	}
	// 以 .. 开头说明 path 在 prefix 之外。
	return !strings.HasPrefix(rel, ".."+string(filepath.Separator)) && rel != ".."
}

// ConfiguredAllowedRoots 复刻 _configured_allowed_roots。
//
// 顺序：配置的 import_allowed_roots（或 scan_upload_path 兜底），
// 再追加 scan_upload_path，去重后返回；为空时退回 /data/。
func ConfiguredAllowedRoots(cfg Config) []string {
	roots := cfg.AllowedRoots
	if len(roots) == 0 {
		fallback := cfg.ScanUploadPath
		if fallback == "" {
			fallback = DefaultScanPath
		}
		roots = []string{fallback}
	}
	// 追加 scan_upload_path。
	if cfg.ScanUploadPath != "" {
		roots = append(append([]string{}, roots...), cfg.ScanUploadPath)
	}

	normalized := make([]string, 0, len(roots))
	for _, root := range roots {
		path := NormalizePath(root)
		if path == "" || contains(normalized, path) {
			continue
		}
		normalized = append(normalized, path)
	}
	if len(normalized) == 0 {
		if p := NormalizePath(ScanDirPrefix); p != "" {
			return []string{p}
		}
		return []string{ScanDirPrefix}
	}
	return normalized
}

// SanitizeAllowedRoots 复刻 _sanitize_allowed_roots。
//
// 每个根目录必须是绝对路径，且不能是空白输入。
// 返回 (roots, errCode, errMsg)；errCode 非空时调用方应直接返回该错误。
func SanitizeAllowedRoots(raw []string, present bool) ([]string, string, string) {
	if !present {
		return nil, "", ""
	}
	normalized := make([]string, 0, len(raw))
	for _, root := range raw {
		// 先剔除纯空白项：NormalizePath("   ") 会解析成当前工作目录，
		// 那既不是用户意图，也可能绕过 /data/ 前缀检查。
		if strings.TrimSpace(root) == "" {
			continue
		}
		root = strings.TrimSpace(root)
		if !filepath.IsAbs(expandUser(root)) {
			return nil, "params.allowed_roots", "导入目录必须是服务器上的绝对路径"
		}
		path := NormalizePath(root)
		if path == "" {
			continue
		}
		if !contains(normalized, path) {
			normalized = append(normalized, path)
		}
	}
	if len(normalized) == 0 {
		return nil, "params.allowed_roots", "至少需要一个导入目录"
	}
	return normalized, "", ""
}

// IsPathInRoots 复刻 _is_path_in_roots。
func IsPathInRoots(path string, roots []string) bool {
	normalized := NormalizePath(path)
	if normalized == "" {
		return false
	}
	for _, root := range roots {
		if IsWithin(normalized, root) {
			return true
		}
	}
	return false
}

// SafeDirectoryForListing 复刻 _safe_directory_for_listing。
//
// 逐级校验请求路径：每一级都必须是真实存在的目录且不是符号链接，
// 任一级不合法就退回第一个允许根目录。
func SafeDirectoryForListing(requested string, roots []string) string {
	fallback := NormalizePath(ScanDirPrefix)
	if len(roots) > 0 {
		fallback = roots[0]
	}
	requestedPath := NormalizePath(requested)
	if requestedPath == "" {
		return fallback
	}

	for _, root := range roots {
		if !IsPathInRoots(requestedPath, []string{root}) {
			continue
		}
		rel, err := filepath.Rel(root, requestedPath)
		if err != nil {
			continue
		}
		if rel == "" || rel == "." {
			return root
		}

		parts := splitClean(rel)
		if len(parts) == 0 {
			return root
		}
		// 含 .. 的路径直接跳过该根目录。
		invalid := false
		for _, part := range parts {
			if part == ".." {
				invalid = true
				break
			}
		}
		if invalid {
			continue
		}

		current := root
		valid := true
		for _, part := range parts {
			matched := matchEntry(current, part)
			if matched == "" {
				valid = false
				break
			}
			child := filepath.Join(current, matched)
			info, err := os.Lstat(child)
			if err != nil || info.Mode()&os.ModeSymlink != 0 || !info.IsDir() {
				valid = false
				break
			}
			current = NormalizePath(child)
		}
		if valid {
			return current
		}
	}
	return fallback
}

// matchEntry 在目录中按精确名匹配一个条目，返回实际名字（未命中返回空串）。
func matchEntry(dir, name string) string {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return ""
	}
	for _, e := range entries {
		if e.Name() == name {
			return name
		}
	}
	return ""
}

// splitClean 按分隔符切分并去掉空段与 "."。
func splitClean(rel string) []string {
	raw := strings.Split(rel, string(filepath.Separator))
	out := make([]string, 0, len(raw))
	for _, part := range raw {
		if part == "" || part == "." {
			continue
		}
		out = append(out, part)
	}
	return out
}

// DirectoryResult 是 check_import_directory 的返回值。
type DirectoryResult struct {
	Path               string   `json:"path"`
	AllowedRoots       []string `json:"allowed_roots"`
	Exists             bool     `json:"exists"`
	IsDir              bool     `json:"is_dir"`
	IsSymlink          bool     `json:"is_symlink"`
	Readable           bool     `json:"readable"`
	Writable           bool     `json:"writable"`
	InAllowedRoots     bool     `json:"in_allowed_roots"`
	FileCount          int      `json:"file_count"`
	SupportedFileCount int      `json:"supported_file_count"`
	Truncated          bool     `json:"truncated"`
	CheckedAt          string   `json:"checked_at"`
	Status             string   `json:"status"`
	Msg                string   `json:"msg"`
}

// CheckImportDirectory 复刻 check_import_directory。
func CheckImportDirectory(path string, cfg Config) DirectoryResult {
	roots := ConfiguredAllowedRoots(cfg)
	normalized := NormalizePath(path)
	maxFiles := cfg.ScanBatchSize
	if maxFiles <= 0 {
		maxFiles = 500
	}

	res := DirectoryResult{
		Path:           normalized,
		AllowedRoots:   roots,
		Exists:         pathExists(normalized),
		IsDir:          isDir(normalized),
		IsSymlink:      isSymlink(normalized),
		// This legacy response field is retained for older clients. Directories
		// are scan targets, never an access whitelist.
		InAllowedRoots: true,
		CheckedAt:      time.Now().Format("2006-01-02T15:04:05"),
		Status:         "error",
	}
	if res.Exists && res.IsDir {
		res.Readable = isReadable(normalized)
		res.Writable = isWritable(normalized)
	}

	if res.Exists && res.IsDir && !res.IsSymlink && res.Readable {
		countFiles(&res, normalized, maxFiles, cfg.SupportedFormats)
	}

	hardError := !res.Exists || !res.IsDir || res.IsSymlink || !res.Readable
	switch {
	case hardError:
		res.Status = "error"
	case !res.Writable:
		res.Status = "warning"
	default:
		res.Status = "ok"
	}
	if res.Msg == "" {
		res.Msg = directoryMessage(res)
	}
	return res
}

// countFiles 遍历目录统计文件数与支持格式数，超过上限时标记 truncated。
func countFiles(res *DirectoryResult, root string, maxFiles int, formats []string) {
	supported := make(map[string]bool, len(formats))
	for _, f := range formats {
		supported[strings.ToLower(f)] = true
	}

	_ = filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if d.IsDir() {
			if path == root {
				return nil
			}
			name := d.Name()
			// 排除隐藏目录、@__ 前缀目录与符号链接目录。
			if strings.HasPrefix(name, ".") || strings.HasPrefix(name, "@__") {
				return filepath.SkipDir
			}
			if d.Type()&os.ModeSymlink != 0 {
				return filepath.SkipDir
			}
			return nil
		}
		name := d.Name()
		if strings.HasPrefix(name, ".") {
			return nil
		}
		if d.Type()&os.ModeSymlink != 0 {
			return nil
		}
		info, err := d.Info()
		if err != nil || !info.Mode().IsRegular() {
			return nil
		}
		res.FileCount++
		if ext := strings.ToLower(strings.TrimPrefix(filepath.Ext(name), ".")); supported[ext] {
			res.SupportedFileCount++
		}
		if res.FileCount >= maxFiles+1 {
			res.Truncated = true
			return filepath.SkipAll
		}
		return nil
	})
}

// directoryMessage 复刻 _directory_message。
func directoryMessage(res DirectoryResult) string {
	switch {
	case !res.Exists:
		return "目录不存在，请检查路径或先在服务器上创建目录。"
	case !res.IsDir:
		return "该路径不是目录，请选择文件夹。"
	case res.IsSymlink:
		return "默认不跟随软链接目录。"
	case !res.Readable:
		return "Talebook 无法读取该目录，请检查目录权限。"
	case !res.Writable:
		return "目录不可写，仍可读取导入；剪切模式将不可用。"
	case res.SupportedFileCount == 0:
		return "目录当前为空。保存后可手动扫描或开启自动监控。"
	case res.Truncated:
		return "目录内文件较多，系统将分批扫描并异步导入。"
	default:
		return fmt.Sprintf("目录可用。发现 %d 个支持格式文件。", res.SupportedFileCount)
	}
}

// ListItem 是目录列举中的一项。
type ListItem struct {
	Name           string `json:"name"`
	Path           string `json:"path"`
	Readable       bool   `json:"readable"`
	Writable       bool   `json:"writable"`
	IsSymlink      bool   `json:"is_symlink"`
	InAllowedRoots bool   `json:"in_allowed_roots"`
}

// ListResult 是目录列举的返回值。
type ListResult struct {
	Path         string     `json:"path"`
	Parent       string     `json:"parent"`
	AllowedRoots []string   `json:"allowed_roots"`
	Items        []ListItem `json:"items"`
	Err          string     `json:"err,omitempty"`
	Msg          string     `json:"msg,omitempty"`
}

// ListDirectories 复刻 ImportDirectoryList.get 的目录列举逻辑。
func ListDirectories(requested string, cfg Config) ListResult {
	roots := ConfiguredAllowedRoots(cfg)
	if requested == "" {
		requested = cfg.ScanUploadPath
	}
	if requested == "" {
		requested = roots[0]
	}
	path := NormalizePath(requested)
	if path == "" || !isDir(path) {
		return ListResult{Err: "params.path", Msg: "目录不存在或不可访问", Path: path, Items: []ListItem{}, AllowedRoots: roots}
	}

	items := []ListItem{}
	entries, err := os.ReadDir(path)
	if err != nil {
		return ListResult{Err: "params.path", Msg: err.Error(), Path: path, Items: items, AllowedRoots: roots}
	}
	// 按名称小写排序，对齐 Python 的 sorted(..., key=str.lower)。
	sort.SliceStable(entries, func(i, j int) bool {
		return strings.ToLower(entries[i].Name()) < strings.ToLower(entries[j].Name())
	})
	for _, e := range entries {
		name := e.Name()
		if strings.HasPrefix(name, ".") || strings.HasPrefix(name, "@__") {
			continue
		}
		child := filepath.Join(path, name)
		info, err := os.Lstat(child)
		if err != nil || !isDir(child) {
			continue
		}
		items = append(items, ListItem{
			Name:           name,
			Path:           NormalizePath(child),
			Readable:       isReadable(child),
			Writable:       isWritable(child),
			IsSymlink:      info.Mode()&os.ModeSymlink != 0,
			InAllowedRoots: true,
		})
	}

	parent := NormalizePath(filepath.Dir(path))
	canGoParent := parent != path
	outParent := ""
	if canGoParent {
		outParent = parent
	}
	return ListResult{Path: path, Parent: outParent, AllowedRoots: roots, Items: items}
}

// isRootParent 报告 parent 是否是某个允许根目录的父目录。
func isRootParent(parent string, roots []string) bool {
	for _, root := range roots {
		if NormalizePath(filepath.Dir(root)) == parent {
			return true
		}
	}
	return false
}

// contains 报告切片是否含指定字符串。
func contains(list []string, v string) bool {
	for _, item := range list {
		if item == v {
			return true
		}
	}
	return false
}

// pathExists 报告路径是否存在。
func pathExists(path string) bool {
	if path == "" {
		return false
	}
	_, err := os.Lstat(path)
	return err == nil
}

// isDir 报告路径是否是目录（跟随符号链接，对齐 os.path.isdir）。
func isDir(path string) bool {
	if path == "" {
		return false
	}
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

// isSymlink 报告路径是否是符号链接。
func isSymlink(path string) bool {
	if path == "" {
		return false
	}
	info, err := os.Lstat(path)
	return err == nil && info.Mode()&os.ModeSymlink != 0
}

// isReadable 复刻 os.access(path, R_OK | X_OK)。
func isReadable(path string) bool {
	f, err := os.Open(path)
	if err != nil {
		return false
	}
	_ = f.Close()
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	// 目录需要可进入权限。
	return !info.IsDir() || canEnter(path)
}

// canEnter 尝试进入目录以验证 X_OK。
func canEnter(path string) bool {
	_, err := os.ReadDir(path)
	return err == nil
}

// isWritable 复刻 os.access(path, W_OK)。
//
// 用「尝试创建临时文件」判断，比检查权限位更贴近实际可写性。
func isWritable(path string) bool {
	if path == "" {
		return false
	}
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	if !info.IsDir() {
		f, err := os.OpenFile(path, os.O_WRONLY, 0)
		if err != nil {
			return false
		}
		_ = f.Close()
		return true
	}
	f, err := os.CreateTemp(path, ".talebook-write-check-*")
	if err != nil {
		return false
	}
	name := f.Name()
	_ = f.Close()
	_ = os.Remove(name)
	return true
}
