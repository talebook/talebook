package scan

import (
	"archive/zip"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path"
	"path/filepath"
	"strings"
	"talebook/booksvr/internal/sourcefile"
	"unicode/utf8"

	"golang.org/x/text/encoding/simplifiedchinese"
	"talebook/booksvr/internal/userdb"
)

const (
	maxZIPDepth             = 5
	maxZIPEntries           = 100000
	maxZIPFileBytes  int64  = 2 << 30
	maxZIPTotalBytes uint64 = 32 << 30
)

type zipBudget struct {
	entries int
	bytes   uint64
}

func archiveFingerprint(file string) (string, error) { return sourcefile.Fingerprint(file) }

func zipDisplayName(raw string) string {
	if utf8.ValidString(raw) {
		return raw
	}
	decoded, err := simplifiedchinese.GB18030.NewDecoder().String(raw)
	if err == nil {
		return decoded
	}
	return strings.ToValidUTF8(raw, "_")
}

func zipDisplaySource(archive string, chain []string) string {
	parts := []string{archive}
	for _, name := range chain {
		parts = append(parts, zipDisplayName(name))
	}
	return strings.Join(parts, "!/")
}

func zipChainEncoded(chain []string) []string {
	out := make([]string, len(chain))
	for i, name := range chain {
		out[i] = base64.StdEncoding.EncodeToString([]byte(name))
	}
	return out
}

func safeZIPEntry(file *zip.File) error {
	name := strings.ReplaceAll(zipDisplayName(file.Name), `\`, "/")
	if strings.HasPrefix(name, "/") || strings.Contains(name, ":") {
		return fmt.Errorf("ZIP 包含绝对路径")
	}
	for _, part := range strings.Split(name, "/") {
		if part == ".." {
			return fmt.Errorf("ZIP 包含越界路径")
		}
	}
	if file.Mode()&os.ModeSymlink != 0 || !file.Mode().IsRegular() {
		return fmt.Errorf("ZIP 包含非普通文件")
	}
	if file.Flags&1 != 0 {
		return fmt.Errorf("ZIP 已加密，无法自动解压")
	}
	if file.UncompressedSize64 > uint64(maxZIPFileBytes) {
		return fmt.Errorf("ZIP 单个文件超过 2 GiB")
	}
	return nil
}

type contextReader struct {
	ctx    context.Context
	reader io.Reader
}

func (r contextReader) Read(p []byte) (int, error) {
	if err := r.ctx.Err(); err != nil {
		return 0, err
	}
	return r.reader.Read(p)
}

// Every member is written to a newly created temporary directory. Archive paths
// are never used as destination directories, even after validation.
func unzipMember(ctx context.Context, file *zip.File) (string, func(), error) {
	if err := safeZIPEntry(file); err != nil {
		return "", func() {}, err
	}
	return sourcefile.Extract(ctx, file, path.Base(strings.ReplaceAll(zipDisplayName(file.Name), `\`, "/")))
}

// walkZIP materializes nested containers only while they are being visited.
// Leaf books are materialized by the visitor, so completed entries cost no I/O.
func (s *Service) walkZIP(ctx context.Context, file string, chain []string, budget *zipBudget, visit func([]string, *zip.File, error) error) (bool, error) {
	if err := ctx.Err(); err != nil {
		return false, err
	}
	zr, err := zip.OpenReader(file)
	if err != nil {
		return false, fmt.Errorf("ZIP 已损坏或格式无效：%w", err)
	}
	defer zr.Close()
	found := false
	for _, entry := range zr.File {
		if err := ctx.Err(); err != nil {
			return found, err
		}
		budget.entries++
		if budget.entries > maxZIPEntries {
			return found, fmt.Errorf("ZIP 条目超过 %d", maxZIPEntries)
		}
		if entry.FileInfo().IsDir() {
			continue
		}
		name := zipDisplayName(entry.Name)
		if strings.HasPrefix(path.Base(strings.ReplaceAll(name, `\`, "/")), ".") || strings.HasPrefix(name, "__MACOSX/") {
			continue
		}
		format := strings.ToLower(strings.TrimPrefix(path.Ext(name), "."))
		if !s.SupportedFormats[format] {
			continue
		}
		found = true
		memberChain := append(append([]string{}, chain...), entry.Name)
		problem := safeZIPEntry(entry)
		if problem == nil && entry.UncompressedSize64 > maxZIPTotalBytes-budget.bytes {
			problem = fmt.Errorf("ZIP 解压总量超过 32 GiB")
		}
		if problem == nil {
			budget.bytes += entry.UncompressedSize64
		}
		if problem != nil {
			if err := visit(memberChain, entry, problem); err != nil {
				return found, err
			}
			continue
		}
		if format == "zip" {
			if len(memberChain) >= maxZIPDepth {
				if err := visit(memberChain, entry, fmt.Errorf("ZIP 嵌套超过 %d 层", maxZIPDepth)); err != nil {
					return found, err
				}
				continue
			}
			nested, clean, err := unzipMember(ctx, entry)
			if err != nil {
				if e := visit(memberChain, entry, err); e != nil {
					return found, e
				}
				continue
			}
			hasBooks, walkErr := s.walkZIP(ctx, nested, memberChain, budget, visit)
			clean()
			if ctx.Err() != nil {
				return found, ctx.Err()
			}
			if walkErr != nil {
				if e := visit(memberChain, entry, walkErr); e != nil {
					return found, e
				}
				continue
			}
			if hasBooks {
				continue
			}
		}
		if err := visit(memberChain, entry, nil); err != nil {
			return found, err
		}
	}
	return found, nil
}

func (s *Service) scanZIP(ctx context.Context, archive string, result *Result, done map[string]bool, checkpoints ...func() error) error {
	fingerprint, err := archiveFingerprint(archive)
	if err != nil {
		return err
	}
	parent, err := getScanFileByPath(s.DB, archive)
	if err != nil {
		return err
	}
	if parent != nil && parent.Status == statusExpanded && parent.Data["archive_fingerprint"] == fingerprint {
		count, pending, err := s.archiveEntryCounts(archive, fingerprint)
		if err != nil {
			return err
		}
		// Deleting an imported book also removes its scan row. Revisit the
		// unchanged archive if a previously expanded member is now missing.
		if expected, ok := parent.Data["archive_entry_count"].(float64); ok && int64(expected) == count && pending == 0 {
			result.Skipped++
			return nil
		}
	}
	if parent != nil && parent.BookID > 0 {
		result.Skipped++
		return nil
	} // an already imported comic
	s.setProgress(func(p *Progress) { p.Archives++; p.Current = archive })
	var visitErr error
	found, walkErr := s.walkZIP(ctx, archive, nil, &zipBudget{}, func(chain []string, entry *zip.File, problem error) error {
		virtual := archive + "!/" + fingerprint[:16] + "/" + strings.Join(zipChainEncoded(chain), "/") + "/" + path.Base(zipDisplayName(entry.Name))
		if done[virtual] {
			result.Skipped++
			return nil
		}
		row, e := getScanFileByPath(s.DB, virtual)
		if e != nil {
			visitErr = e
			return e
		}
		if row == nil {
			identity := sha256.Sum256([]byte(virtual))
			row = &userdb.ScanFile{Name: path.Base(zipDisplayName(entry.Name)), Path: virtual, Hash: "zip-entry:" + hex.EncodeToString(identity[:]), Status: userdb.ScanStatusNew, CreateTime: s.now(), Data: map[string]any{}}
		}
		row.ScanID = result.ScanID
		row.UpdateTime = s.now()
		setRowData(row, "archive_path", archive, "archive_fingerprint", fingerprint, "archive_chain", zipChainEncoded(chain), "source_path", zipDisplaySource(archive, chain), "archive_source", zipDisplaySource(archive, chain))
		if row.ID == 0 {
			e = insertScanFile(s.DB, row)
			result.Inserted++
		} else {
			e = saveScanFile(s.DB, row)
		}
		if e != nil {
			visitErr = e
			return e
		}
		result.Candidates++
		physical, clean := "", func() {}
		if problem == nil {
			physical, clean, problem = unzipMember(ctx, entry)
		}
		defer clean()
		if err := ctx.Err(); err != nil {
			visitErr = err
			return err
		}
		outcome := userdb.ScanStatusFailed
		if problem == nil {
			outcome, e = s.processFileRow(row, physical)
		} else {
			row.Status = userdb.ScanStatusFailed
			setRowData(row, "analysis_error", problem.Error(), "analysis_error_code", "archive.extract")
			e = saveScanFile(s.DB, row)
		}
		if e != nil {
			visitErr = e
			return e
		}
		addOutcome(result, outcome)
		s.setProgress(func(p *Progress) {
			p.Current = zipDisplaySource(archive, chain)
			p.Processed++
			if outcome == userdb.ScanStatusFailed {
				p.Failed++
			}
		})
		for _, checkpoint := range checkpoints {
			if err := checkpoint(); err != nil {
				visitErr = err
				return err
			}
		}
		return nil
	})
	if ctx.Err() != nil {
		return ctx.Err()
	}
	if visitErr != nil {
		return visitErr
	}
	if !found && walkErr == nil { // retain image-only ZIP as a comic book
		if done[archive] {
			result.Skipped++
			return nil
		}
		rows, e := s.registerTasks([]Task{{Name: filepath.Base(archive), Path: archive, Format: "zip"}}, result.ScanID)
		if e != nil {
			return e
		}
		for _, row := range rows {
			status, e := s.processRow(row)
			if e != nil {
				return e
			}
			addOutcome(result, status)
			s.setProgress(func(p *Progress) { p.Processed++ })
		}
		return nil
	}
	if parent == nil {
		parent = &userdb.ScanFile{Name: filepath.Base(archive), Path: archive, CreateTime: s.now(), Data: map[string]any{}}
	}
	parent.ScanID = result.ScanID
	parent.UpdateTime = s.now()
	parent.Hash = "archive:" + fingerprint
	parent.Status = statusExpanded
	setRowData(parent, "archive_fingerprint", fingerprint)
	count, _, err := s.archiveEntryCounts(archive, fingerprint)
	if err != nil {
		return err
	}
	setRowData(parent, "archive_entry_count", float64(count))
	if walkErr != nil {
		parent.Status = userdb.ScanStatusFailed
		setRowData(parent, "analysis_error", walkErr.Error(), "analysis_error_code", "archive.extract")
		result.Failed++
		s.setProgress(func(p *Progress) { p.Failed++ })
	}
	if parent.ID == 0 {
		return insertScanFile(s.DB, parent)
	}
	return saveScanFile(s.DB, parent)
}

func (s *Service) archiveEntryCounts(archive, fingerprint string) (count, pending int64, err error) {
	prefix := archive + "!/" + fingerprint[:16] + "/"
	err = s.DB.QueryRow(`SELECT COUNT(*),COALESCE(SUM(CASE WHEN status='new' THEN 1 ELSE 0 END),0) FROM scanfiles WHERE path >= ? AND path < ?`, prefix, prefix+"\uffff").Scan(&count, &pending)
	return
}

func (s *Service) archiveCacheRoot() string {
	if s.LibraryRoot != "" {
		return filepath.Join(filepath.Dir(s.LibraryRoot), "import-cache")
	}
	return filepath.Join(os.TempDir(), "talebook-import-cache")
}

// resolveImportSource always returns a temporary file. ZIP bodies are never retained by indexing.
func (s *Service) resolveImportSource(row *userdb.ScanFile, mode string) (string, func(), error) {
	noop := func() {}
	archive, _ := row.Data["archive_path"].(string)
	if archive == "" {
		return row.Path, noop, nil
	}
	fingerprint, err := archiveFingerprint(archive)
	if err != nil {
		return "", noop, err
	}
	if fingerprint != row.Data["archive_fingerprint"] {
		return "", noop, fmt.Errorf("源 ZIP 已变化，请重新扫描后导入")
	}
	var chain []string
	switch values := row.Data["archive_chain"].(type) {
	case []string:
		chain = values
	case []any:
		for _, v := range values {
			value, _ := v.(string)
			chain = append(chain, value)
		}
	}
	if len(chain) == 0 || len(chain) > maxZIPDepth {
		return "", noop, fmt.Errorf("ZIP 来源链无效")
	}
	current := archive
	var cleanups []func()
	cleanup := func() {
		for i := len(cleanups) - 1; i >= 0; i-- {
			cleanups[i]()
		}
	}
	for _, encoded := range chain {
		raw, e := base64.StdEncoding.DecodeString(encoded)
		if e != nil {
			cleanup()
			return "", noop, fmt.Errorf("ZIP 成员引用无效")
		}
		zr, e := zip.OpenReader(current)
		if e != nil {
			cleanup()
			return "", noop, e
		}
		var member *zip.File
		for _, entry := range zr.File {
			if entry.Name == string(raw) {
				member = entry
				break
			}
		}
		if member == nil {
			zr.Close()
			cleanup()
			return "", noop, fmt.Errorf("ZIP 中的书籍已不存在")
		}
		current, noop, e = unzipMember(context.Background(), member)
		zr.Close()
		if e != nil {
			cleanup()
			return "", func() {}, e
		}
		cleanups = append(cleanups, noop)
	}
	hash, err := FileSHA256(current)
	if err != nil || hash != row.Hash {
		cleanup()
		return "", func() {}, fmt.Errorf("ZIP 内书籍内容校验失败")
	}
	return current, cleanup, nil
}
