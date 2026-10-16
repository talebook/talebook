package scan

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"talebook/booksvr/internal/userdb"
)

// expanded archives are bookkeeping records, not individual books.
const statusExpanded = "expanded"

type Progress struct {
	Directory string `json:"directory"`
	Current   string `json:"current"`
	Phase     string `json:"phase"`
	Processed int    `json:"processed"`
	Archives  int    `json:"archives"`
	Failed    int    `json:"failed"`
}

func (s *Service) Progress() Progress {
	s.progressMu.RLock()
	defer s.progressMu.RUnlock()
	return s.progress
}

func (s *Service) setProgress(fn func(*Progress)) {
	s.progressMu.Lock()
	defer s.progressMu.Unlock()
	fn(&s.progress)
}

// ScanAll streams the entire tree. batchSize bounds temporary registrations;
// it never limits the number of books processed by this task.
func (s *Service) ScanAll(ctx context.Context, root string, batchSize int) (result Result, err error) {
	result.ScanID = s.clock().Unix()
	if batchSize <= 0 || batchSize > 1000 {
		batchSize = 500
	}
	s.setProgress(func(p *Progress) { *p = Progress{Directory: root, Phase: "scanning"} })
	defer func() {
		s.setProgress(func(p *Progress) {
			if err != nil {
				p.Phase = "failed"
			} else {
				p.Phase = "done"
			}
		})
	}()
	if err := ctx.Err(); err != nil {
		return result, err
	}
	for _, statement := range []string{
		`CREATE INDEX IF NOT EXISTS scanfiles_path_idx ON scanfiles(path)`,
		`CREATE INDEX IF NOT EXISTS scanfiles_status_id_idx ON scanfiles(status,id)`,
	} {
		if _, err = s.DB.ExecContext(ctx, statement); err != nil {
			return result, err
		}
	}
	done, err := DonePaths(s.DB, root)
	if err != nil {
		return result, err
	}
	result.Done = len(done)
	batch := make([]Task, 0, batchSize)
	flush := func() error {
		if err := ctx.Err(); err != nil {
			return err
		}
		rows, err := s.registerTasks(batch, result.ScanID)
		if err != nil {
			return err
		}
		result.Inserted += len(rows)
		for _, row := range rows {
			if err := ctx.Err(); err != nil {
				return err
			}
			s.setProgress(func(p *Progress) { p.Current = row.Path })
			outcome, err := s.processRow(row)
			if err != nil {
				return err
			} // database failures cannot be recorded safely
			addOutcome(&result, outcome)
			s.setProgress(func(p *Progress) {
				p.Processed++
				if outcome == userdb.ScanStatusFailed {
					p.Failed++
				}
			})
		}
		batch = batch[:0]
		return nil
	}
	// Ebooks first, generic archives second. Each pass is a single tree walk.
	for _, archivePass := range []bool{false, true} {
		err = filepath.WalkDir(root, func(path string, entry os.DirEntry, walkErr error) error {
			if err := ctx.Err(); err != nil {
				return err
			}
			if walkErr != nil {
				if path == root {
					return walkErr
				}
				s.setProgress(func(p *Progress) { p.Failed++ })
				return nil
			}
			if entry.IsDir() {
				if path != root && (strings.HasPrefix(entry.Name(), ".") || strings.HasPrefix(entry.Name(), "@__") || path == s.LibraryRoot || path == s.archiveCacheRoot()) {
					return filepath.SkipDir
				}
				return nil
			}
			if strings.HasPrefix(entry.Name(), ".") || entry.Type()&os.ModeSymlink != 0 {
				return nil
			}
			format := strings.ToLower(strings.TrimPrefix(filepath.Ext(entry.Name()), "."))
			if !s.SupportedFormats[format] || (format == "zip" || format == "rar") != archivePass {
				return nil
			}
			info, e := entry.Info()
			if e != nil || !info.Mode().IsRegular() {
				return nil
			}
			if format == "zip" {
				if err := flush(); err != nil {
					return err
				}
				return s.scanZIP(ctx, path, &result, done)
			}
			if done[path] {
				result.Skipped++
				return nil
			}
			result.Candidates++
			batch = append(batch, Task{Name: entry.Name(), Path: path, Format: format})
			if len(batch) >= batchSize {
				return flush()
			}
			return nil
		})
		if err != nil {
			return result, fmt.Errorf("scan: %s: %w", root, err)
		}
		if err = flush(); err != nil {
			return result, err
		}
	}
	return result, nil
}

func addOutcome(result *Result, status string) {
	switch status {
	case userdb.ScanStatusReady:
		result.Ready++
	case userdb.ScanStatusExist:
		result.Exist++
	case userdb.ScanStatusFailed:
		result.Failed++
	case userdb.ScanStatusDrop:
		result.Dropped++
	}
}
