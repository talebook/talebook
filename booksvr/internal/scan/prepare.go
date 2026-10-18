package scan

import (
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"talebook/booksvr/internal/importmeta"
	"talebook/booksvr/internal/media"
	"talebook/booksvr/internal/sourcefile"
	"talebook/booksvr/internal/userdb"
)

type preparedImport struct {
	info     os.FileInfo
	analysis media.Analysis
	metadata importmeta.Metadata
	err      error
	gone     bool
}

func (p *preparedImport) unchanged(path string) bool {
	if p.info == nil {
		return false
	}
	info, e := os.Stat(path)
	return e == nil && os.SameFile(p.info, info) && p.info.Size() == info.Size() && p.info.ModTime() == info.ModTime()
}
func (s *Service) prepareBatch(rows []*userdb.ScanFile) []*preparedImport {
	out := make([]*preparedImport, len(rows))
	var wg sync.WaitGroup
	for i, row := range rows {
		if sourcefile.IsReference(row.Path) || row.Data["archive_path"] != nil {
			continue
		}
		wg.Add(1)
		go func(i int, row *userdb.ScanFile) {
			defer wg.Done()
			p := &preparedImport{}
			out[i] = p
			p.info, p.err = os.Stat(row.Path)
			if p.err != nil {
				return
			}
			format := strings.ToLower(strings.TrimPrefix(filepath.Ext(row.Path), "."))
			p.analysis, p.err = cachedAnalysis(row, row.Path, format)
			if p.err == nil {
				p.metadata, p.gone = s.importMetadata(row.Path, format)
			}
		}(i, row)
	}
	wg.Wait()
	return out
}

func stampAnalysis(row *userdb.ScanFile, path string, before os.FileInfo) {
	for _, key := range []string{"analysis_version", "analysis_size", "analysis_mtime", "analysis_identity"} {
		delete(row.Data, key)
	}
	if info, e := os.Stat(path); e == nil && before != nil && os.SameFile(before, info) && before.Size() == info.Size() && before.ModTime().Equal(info.ModTime()) && analysisFileIdentity(info) != "" {
		setRowData(row, "analysis_version", "2", "analysis_size", strconv.FormatInt(info.Size(), 10), "analysis_mtime", strconv.FormatInt(info.ModTime().UnixNano(), 10), "analysis_identity", analysisFileIdentity(info))
	}
}
func cachedAnalysis(row *userdb.ScanFile, path, format string) (media.Analysis, error) {
	info, e := os.Stat(path)
	if e == nil && analysisFileIdentity(info) != "" && row.Data["analysis_identity"] == analysisFileIdentity(info) && row.Data["analysis_version"] == "2" && row.Data["analysis_size"] == strconv.FormatInt(info.Size(), 10) && row.Data["analysis_mtime"] == strconv.FormatInt(info.ModTime().UnixNano(), 10) {
		get := func(key string) string { v, _ := row.Data[key].(string); return v }
		if get("detected_format") != "" && get("declared_format") == format && get("mime_type") != "" {
			return media.Analysis{DeclaredFormat: format, DetectedFormat: get("detected_format"), MIMEType: get("mime_type"), MediaType: get("media_type"), Reason: get("analysis_reason")}, nil
		}
	}
	return media.AnalyzeFile(path, format)
}
