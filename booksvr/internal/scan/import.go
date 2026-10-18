// 本文件复刻 webserver/services/scan.py 的导入流水线（_do_import）。
package scan

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"
	"talebook/booksvr/internal/sourcefile"
	"time"

	"talebook/booksvr/internal/coverart"
	"talebook/booksvr/internal/docmeta"
	"talebook/booksvr/internal/epubmeta"
	"talebook/booksvr/internal/importmeta"
	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/media"
	"talebook/booksvr/internal/mobimeta"
	"talebook/booksvr/internal/userdb"
)

// ImportResult 是一次导入的统计结果。
type ImportResult struct {
	// ImportID 是本次导入的任务 ID。
	ImportID int64
	// Total 是待处理的记录数。
	Total int
	// Imported 是成功导入的记录数。
	Imported int
	// Indexed 是仅索引的记录数。
	Indexed int
	// Exist 是判定为已存在的记录数。
	Exist int
	// Failed 是失败的记录数。
	Failed int
	// Dropped 是被丢弃的记录数。
	Dropped int
	// BookIDs 是本次导入涉及的书籍 ID（去重前）。
	BookIDs []int64
}

// Import 复刻 _do_import：把 READY 状态的扫描记录导入书库。
//
// hashlist 为 nil 时处理全部 READY 记录；否则只处理指定哈希。
// 未配置书库句柄时直接报错，避免后续写入路径空指针。
func (s *Service) Import(hashlist []string, userID int64, deleteAfter bool, importMode string) (ImportResult, error) {
	return s.ImportContext(context.Background(), hashlist, userID, deleteAfter, importMode)
}

func (s *Service) ImportContext(ctx context.Context, hashlist []string, userID int64, deleteAfter bool, importMode string) (ImportResult, error) {
	res := ImportResult{ImportID: s.clock().Unix()}
	if s.LibraryDB == nil {
		return res, fmt.Errorf("scan: 导入需要书库句柄")
	}
	mode := NormalizeImportMode(importMode, deleteAfter, s.SavedImportMode)

	rows, err := s.readyRows(hashlist)
	if err != nil {
		return res, err
	}
	res.Total = len(rows)
	if len(rows) == 0 {
		return res, nil
	}

	// 统一打上本次导入的任务 ID。
	tx, err := s.DB.BeginTx(ctx, nil)
	if err != nil {
		return res, err
	}
	for _, row := range rows {
		row.ImportID = res.ImportID
		if _, err := tx.ExecContext(ctx, `UPDATE scanfiles SET import_id=? WHERE id=? AND status='ready'`, res.ImportID, row.ID); err != nil {
			tx.Rollback()
			return res, err
		}
	}
	if err = tx.Commit(); err != nil {
		return res, err
	}

	var prepared []*preparedImport
	workers := s.PrepareWorkers
	if workers < 1 {
		workers = 1
	}
	if workers > 4 {
		workers = 4
	}
	for i, row := range rows {
		if err := ctx.Err(); err != nil {
			return res, err
		}
		if s.PrepareWorkers > 0 && i%workers == 0 {
			end := i + workers
			if end > len(rows) {
				end = len(rows)
			}
			prepared = s.prepareBatch(rows[i:end])
		}
		var preparation *preparedImport
		if s.PrepareWorkers > 0 {
			preparation = prepared[i%workers]
		}
		outcome, bookID, err := s.importRowPrepared(row, userID, mode, res.ImportID, preparation)
		if err != nil {
			row.Status = userdb.ScanStatusFailed
			setRowData(row, "import_error", err.Error())
			if saveErr := saveScanFile(s.DB, row); saveErr != nil {
				return res, fmt.Errorf("%w; 保存导入失败状态: %v", err, saveErr)
			}
			res.Failed++
			return res, err
		}
		switch outcome {
		case userdb.ScanStatusImported:
			res.Imported++
		case userdb.ScanStatusIndexed:
			res.Indexed++
		case userdb.ScanStatusExist:
			res.Exist++
		case userdb.ScanStatusFailed:
			res.Failed++
		case userdb.ScanStatusDrop:
			res.Dropped++
		}
		if bookID > 0 {
			res.BookIDs = append(res.BookIDs, bookID)
		}
	}
	return res, nil
}

// readyRows 复刻 build_query：取出待导入的记录。
func (s *Service) readyRows(hashlist []string) ([]*userdb.ScanFile, error) {
	query := `SELECT ` + scanFileColumns + ` FROM scanfiles WHERE status = ?`
	args := []any{userdb.ScanStatusReady}
	if len(hashlist) > 0 {
		placeholders := strings.TrimSuffix(strings.Repeat("?,", len(hashlist)), ",")
		query += ` AND hash IN (` + placeholders + `)`
		for _, h := range hashlist {
			args = append(args, h)
		}
	}
	query += ` ORDER BY id`

	rows, err := s.DB.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("scan: 查询待导入记录失败: %w", err)
	}
	defer rows.Close()

	out := []*userdb.ScanFile{}
	for rows.Next() {
		row, err := scanRow(rows.Scan)
		if err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

// importRow 复刻 _do_import 的单条处理逻辑。
//
// 返回 (最终状态, 书籍 ID)。
func (s *Service) importRow(row *userdb.ScanFile, userID int64, mode string, importID int64) (string, int64, error) {
	return s.importRowPrepared(row, userID, mode, importID, nil)
}

func (s *Service) importRowPrepared(row *userdb.ScanFile, userID int64, mode string, importID int64, prepared *preparedImport) (string, int64, error) {
	fpath, cleanup, err := s.resolveImportSource(row, mode)
	if err != nil {
		row.Status = userdb.ScanStatusFailed
		setRowData(row, "import_error", err.Error())
		return row.Status, 0, saveScanFile(s.DB, row)
	}
	defer cleanup()
	format := strings.ToLower(strings.TrimPrefix(filepath.Ext(fpath), "."))

	row.Status = userdb.ScanStatusImporting
	setRowData(row, "import_mode", mode)
	if err := saveScanFile(s.DB, row); err != nil {
		return "", 0, err
	}

	// 媒体分析。
	usePrepared := prepared != nil && prepared.unchanged(fpath)
	var analysis media.Analysis
	if usePrepared {
		analysis, err = prepared.analysis, prepared.err
	} else {
		analysis, err = cachedAnalysis(row, fpath, format)
	}
	if err != nil {
		row.Status = userdb.ScanStatusFailed
		if me, ok := err.(*media.Error); ok {
			setRowData(row, "analysis_error", me.Message, "analysis_error_code", me.Code,
				"declared_format", format)
		} else {
			setRowData(row, "analysis_error", err.Error(), "declared_format", format)
		}
		return row.Status, 0, saveScanFile(s.DB, row)
	}
	for k, v := range analysis.ToDict() {
		setRowData(row, k, v)
	}

	// 元数据。
	var mi importmeta.Metadata
	var gone bool
	if usePrepared {
		mi, gone = prepared.metadata, prepared.gone
	} else {
		mi, gone = s.importMetadata(fpath, format)
	}
	if gone {
		row.Status = userdb.ScanStatusDrop
		return row.Status, 0, saveScanFile(s.DB, row)
	}

	// 再次检查重复书籍。
	sameAuthorID, exist, err := s.findSameAuthorBook(mi, format)
	if err != nil {
		return "", 0, err
	}
	if exist {
		row.Status = userdb.ScanStatusExist
		setRowData(row, "import_mode", mode)
		return row.Status, 0, saveScanFile(s.DB, row)
	}

	if sameAuthorID > 0 {
		if mode == ModeIndex {
			return s.markIndexed(row, mi, fpath, format, importID, userID, analysis.MediaType, sameAuthorID)
		}
		// 同名同作者：把格式加到现有书籍。
		row.BookID = sameAuthorID
		if err := s.addImportedFormatToBook(row.BookID, format, fpath, mode); err != nil {
			return "", 0, err
		}
		if err := s.setItemMediaType(row.BookID, userID, analysis.MediaType); err != nil {
			return "", 0, err
		}
		return s.markImported(row, fpath, format, mode, true)
	}

	if mode == ModeIndex {
		return s.markIndexed(row, mi, fpath, format, importID, userID, analysis.MediaType, 0)
	}
	// 新书导入。
	bookID, err := s.importNewBook(mi, fpath, format, userID, analysis.MediaType, mode)
	if err != nil {
		return "", 0, err
	}
	row.BookID = bookID
	status, _, err := s.markImported(row, fpath, format, mode, true)
	return status, bookID, err
}

// importMetadata 复刻 _do_import 的元数据提取（scan.py:354-391）。
//
// 分发规则与 Python 一致：
//   - 受管文档（djvu/uvz）：只用文件名；
//   - 漫画容器（cbz/zip/cbr/rar）：文件名 + 「佚名」；
//   - 其余格式：先尝试解析内嵌元数据（epub/mobi/azw/azw3），
//     解析不到再退回文件名 + 「佚名」；
//   - txt/pdf 非结构化，无论解析结果如何都强制用文件名 + 「佚名」。
//
// 返回 (元数据, 文件是否已消失)。
func (s *Service) importMetadata(fpath, format string) (importmeta.Metadata, bool) {
	if _, err := os.Stat(fpath); err != nil {
		return importmeta.Metadata{}, true
	}
	fmtLower := strings.ToLower(format)

	// 受管文档与漫画容器不解析内嵌元数据。
	if media.IsManagedDocumentFormat(fmtLower) || media.IsComicContainerFormat(fmtLower) {
		return importmeta.FilenameMetadata(fpath), false
	}

	mi, ok := embeddedMetadata(fpath, fmtLower)
	if !ok {
		mi = importmeta.FilenameMetadata(fpath)
	}

	// txt/pdf 非结构化，Calibre 识别不准，强制回退到文件名。
	if fmtLower == "txt" || fmtLower == "pdf" {
		mi = importmeta.FilenameMetadata(fpath)
	}
	return mi, false
}

// embeddedMetadata 按格式分派到对应的内嵌元数据解析器。
//
// 返回 ok=false 表示该格式没有解析器或解析失败，调用方应退回文件名。
func embeddedMetadata(fpath, format string) (importmeta.Metadata, bool) {
	switch format {
	case "epub":
		return epubMetadata(fpath)
	case "mobi", "azw", "azw3":
		return mobiMetadata(fpath)
	case "docx":
		return docMetadata(fpath, docmeta.ExtractDOCX)
	case "fb2":
		return docMetadata(fpath, docmeta.ExtractFB2)
	case "htmlz":
		return docMetadata(fpath, docmeta.ExtractHTMLZ)
	default:
		return importmeta.Metadata{}, false
	}
}

// docMetadata 用给定的解析器读取 DOCX/FB2/HTMLZ 元数据。
func docMetadata(fpath string, extract func([]byte) (*docmeta.Metadata, error)) (importmeta.Metadata, bool) {
	data, err := os.ReadFile(fpath)
	if err != nil {
		return importmeta.Metadata{}, false
	}
	meta, err := extract(data)
	if err != nil || meta == nil {
		return importmeta.Metadata{}, false
	}
	mi := importmeta.Metadata{
		Title:     meta.Title,
		Authors:   meta.Authors,
		Publisher: meta.Publisher,
		Pubdate:   meta.Published,
		Language:  meta.Language,
		ISBN:      meta.ISBN,
		Tags:      meta.Tags,
		Comments:  meta.Description,
	}
	if mi.Title == "" {
		mi.Title = importmeta.FilenameMetadata(fpath).Title
	}
	if len(mi.Authors) == 0 {
		mi.Authors = []string{importmeta.AnonymousAuthor}
	}
	return mi, true
}

// mobiMetadata 从 MOBI/AZW/AZW3 文件读取元数据；失败时返回 ok=false。
func mobiMetadata(fpath string) (importmeta.Metadata, bool) {
	data, err := os.ReadFile(fpath)
	if err != nil {
		return importmeta.Metadata{}, false
	}
	meta, err := mobimeta.Extract(data)
	if err != nil || meta == nil {
		return importmeta.Metadata{}, false
	}
	mi := importmeta.Metadata{
		Title:     meta.Title,
		Authors:   meta.Authors,
		Publisher: meta.Publisher,
		Pubdate:   meta.Published,
		Language:  meta.Language,
		ISBN:      meta.ISBN,
		Tags:      meta.Tags,
		Comments:  meta.Comments,
	}
	if mi.Title == "" {
		mi.Title = importmeta.FilenameMetadata(fpath).Title
	}
	if len(mi.Authors) == 0 {
		mi.Authors = []string{importmeta.AnonymousAuthor}
	}
	return mi, true
}

// epubMetadata 从 EPUB 文件读取元数据；失败时返回 ok=false。
func epubMetadata(fpath string) (importmeta.Metadata, bool) {
	data, err := os.ReadFile(fpath)
	if err != nil {
		return importmeta.Metadata{}, false
	}
	meta, err := epubmeta.Extract(data)
	if err != nil || meta == nil {
		return importmeta.Metadata{}, false
	}
	mi := importmeta.Metadata{
		Title:     meta.Title,
		Authors:   meta.Authors,
		Publisher: meta.Publisher,
		Pubdate:   meta.Published,
		Language:  meta.Language,
		ISBN:      meta.ISBN,
		Tags:      meta.Tags,
		Comments:  meta.Description,
	}
	if mi.Title == "" {
		mi.Title = importmeta.FilenameMetadata(fpath).Title
	}
	if len(mi.Authors) == 0 {
		mi.Authors = []string{importmeta.AnonymousAuthor}
	}
	return mi, true
}

// findSameAuthorBook 复刻 _do_import 的重复检测。
//
// 返回 (同名同作者的书籍 ID, 是否已存在该格式)。
func (s *Service) findSameAuthorBook(mi importmeta.Metadata, format string) (int64, bool, error) {
	if s.LibraryDB == nil {
		return 0, false, nil
	}
	ids, err := booksWithSameTitle(s.LibraryDB, mi.Title)
	if err != nil || len(ids) == 0 {
		return 0, false, err
	}
	books, err := loadBooksForMatch(s.LibraryDB, ids)
	if err != nil {
		return 0, false, err
	}

	var sameAuthorID int64
	for _, book := range importmeta.MatchingImportBooks(mi, format, books) {
		id, _ := book["id"].(int64)
		if id == 0 {
			continue
		}
		sameAuthorID = id
		formats, _ := book["available_formats"].(string)
		if strings.Contains(strings.ToUpper(formats), strings.ToUpper(format)) {
			return id, true, nil
		}
	}
	return sameAuthorID, false, nil
}

// addFormatToBook 复刻 db.add_format(book_id, fmt.upper(), fpath, True)。
func (s *Service) addFormatToBook(bookID int64, format, fpath string) error {
	if s.LibraryDB == nil {
		return fmt.Errorf("scan: 添加格式需要书库句柄")
	}
	info, err := sourcefile.Stat(fpath)
	var size, mtime int64
	if err == nil {
		size = info.Size()
		mtime = info.ModTime().Unix()
	}
	if err := library.AddFormat(s.LibraryDB, bookID, format, fpath, size, mtime); err != nil {
		return fmt.Errorf("scan: 添加格式失败: %w", err)
	}
	return nil
}

// importNewBook 新建书籍记录并原地登记源文件。
//
// 与 Calibre 的 db.import_book 不同：本实现**不复制、不改名、不写 OPF**，
// 只把源文件的绝对路径登记进 book_formats（方案 5.4 导入语义表）。
// 目录约定与 ASCII 转写都是被废弃的旧 Calibre 行为。
func (s *Service) importNewBook(mi importmeta.Metadata, fpath, format string, userID int64, mediaType, mode string) (int64, error) {
	if s.LibraryDB == nil {
		return 0, fmt.Errorf("scan: 导入书籍需要书库句柄")
	}
	author := ""
	if len(mi.Authors) > 0 {
		author = mi.Authors[0]
	}
	bookPath := filepath.Dir(fpath)
	if mode != ModeIndex {
		bookPath = ""
	}
	bookID, err := library.ImportBook(s.LibraryDB, library.BookMeta{
		Title:     mi.Title,
		Author:    author,
		Publisher: mi.Publisher,
		Pubdate:   mi.Pubdate,
		Tags:      mi.Tags,
		Comments:  mi.Comments,
		// 索引模式沿用源目录；复制/剪切模式稍后设为书库内的相对目录。
		Path: bookPath,
	})
	if err != nil {
		return 0, fmt.Errorf("scan: 导入书籍失败: %w", err)
	}
	if mode != ModeIndex {
		bookPath = filepath.Join("Talebook Imports", fmt.Sprintf("%d", bookID))
		if _, err := s.LibraryDB.Exec(`UPDATE books SET path = ? WHERE id = ?`, filepath.ToSlash(bookPath), bookID); err != nil {
			return 0, fmt.Errorf("scan: 设置书库文件目录失败: %w", err)
		}
	}
	if err := s.addImportedFormatToBook(bookID, format, fpath, mode); err != nil {
		return 0, err
	}
	// 提取内嵌封面并写入书库目录，同时把 books.has_cover 置 1。
	// 失败不影响导入：没有封面的书仍可正常阅读，接口会回退到默认封面。
	s.extractCover(bookID, fpath, format)
	if err := s.setItemMediaType(bookID, userID, mediaType); err != nil {
		return 0, err
	}
	return bookID, nil
}

// addImportedFormatToBook 把复制/剪切导入的格式文件写入 Calibre 书库根目录；
// 仅索引模式才直接登记源路径。
func (s *Service) addImportedFormatToBook(bookID int64, format, source, mode string) error {
	if mode == ModeIndex {
		return s.addFormatToBook(bookID, format, source)
	}
	storageRoot := s.bookStorageRoot()
	if storageRoot == "" {
		return fmt.Errorf("scan: 复制导入需要书库根目录")
	}
	var bookPath string
	if err := s.LibraryDB.QueryRow(`SELECT COALESCE(path,'') FROM books WHERE id = ?`, bookID).Scan(&bookPath); err != nil {
		return fmt.Errorf("scan: 查询书籍目录失败: %w", err)
	}
	if filepath.IsAbs(bookPath) || bookPath == "" {
		bookPath = filepath.Join("Talebook Imports", fmt.Sprintf("%d", bookID))
	}
	bookPath = filepath.Clean(filepath.FromSlash(bookPath))
	if bookPath == "." || bookPath == ".." || strings.HasPrefix(bookPath, ".."+string(filepath.Separator)) {
		return fmt.Errorf("scan: 非法书籍目录 %q", bookPath)
	}
	dir := filepath.Join(storageRoot, bookPath)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("scan: 创建书籍目录失败: %w", err)
	}
	ext := strings.ToLower(strings.TrimPrefix(format, "."))
	dest := filepath.Join(dir, fmt.Sprintf("book-%d.%s", bookID, ext))
	if _, err := os.Lstat(dest); err == nil {
		return fmt.Errorf("scan: 书库目标文件已存在: %s", dest)
	} else if !os.IsNotExist(err) {
		return fmt.Errorf("scan: 检查书库目标文件失败: %w", err)
	}
	if err := copyImportedFile(source, dest); err != nil {
		return err
	}
	if err := s.addFormatToBook(bookID, format, dest); err != nil {
		_ = os.Remove(dest)
		return err
	}
	return nil
}

func copyImportedFile(source, destination string) error {
	if filepath.Clean(source) == filepath.Clean(destination) {
		return nil
	}
	in, err := os.Open(source)
	if err != nil {
		return fmt.Errorf("scan: 打开源文件失败: %w", err)
	}
	defer in.Close()
	tmp, err := os.CreateTemp(filepath.Dir(destination), ".talebook-import-*")
	if err != nil {
		return fmt.Errorf("scan: 创建书库临时文件失败: %w", err)
	}
	tmpName := tmp.Name()
	ok := false
	defer func() {
		_ = tmp.Close()
		if !ok {
			_ = os.Remove(tmpName)
		}
	}()
	if _, err := io.Copy(tmp, in); err != nil {
		return fmt.Errorf("scan: 复制书籍文件失败: %w", err)
	}
	if err := tmp.Chmod(0o644); err != nil {
		return fmt.Errorf("scan: 设置书籍文件权限失败: %w", err)
	}
	if err := tmp.Close(); err != nil {
		return fmt.Errorf("scan: 写入书籍文件失败: %w", err)
	}
	if err := os.Rename(tmpName, destination); err != nil {
		return fmt.Errorf("scan: 保存书籍文件失败: %w", err)
	}
	ok = true
	return nil
}

func (s *Service) bookStorageRoot() string {
	if s.BookStorageRoot != "" {
		return s.BookStorageRoot
	}
	return s.LibraryRoot
}

// extractCover 从书籍文件里提取内嵌封面并写入书库。
//
// 对应 Calibre import_book 的封面提取：把封面写成
// <libraryRoot>/.talebook-covers/<bookID>.jpg，并把 books.has_cover 置 1。
// 任何一步失败都静默跳过（与 Calibre 一致，不阻断导入）。
func (s *Service) extractCover(bookID int64, fpath, format string) {
	if s.LibraryDB == nil || s.LibraryRoot == "" {
		return
	}
	if s.DeferCovers {
		var registered string
		if s.LibraryDB.QueryRow(`SELECT path FROM book_formats WHERE book_id=? AND UPPER(format)=UPPER(?)`, bookID, format).Scan(&registered) == nil && registered != "" {
			fpath = registered
		}
		if err := coverart.Queue(s.LibraryDB, bookID, fpath, format); err != nil {
			log.Printf("scan: queue cover for book %d: %v", bookID, err)
		}
		return
	}
	if err := coverart.Ensure(context.Background(), s.LibraryDB, s.LibraryRoot, bookID, fpath, format); err != nil {
		log.Printf("scan: cover for book %d: %v", bookID, err)
	}
}

// setItemMediaType 复刻 _set_item_media_type。
//
// 已存在 items 行时按优先级合并 media_type；media_type_locked 为真时不改动。
func (s *Service) setItemMediaType(bookID, userID int64, mediaType string) error {
	item, err := userdb.GetItem(s.DB, bookID)
	if err != nil {
		return err
	}
	if item == nil {
		// items 表有 6 个 NOT NULL 且无默认值的列（count_guest / count_visit /
		// count_download / website / src_path 等），必须全部显式赋值，
		// 否则报 NOT NULL constraint failed。
		_, err := s.DB.Exec(`INSERT INTO items
			(book_id, count_guest, count_visit, count_download, website,
			 collector_id, scope, book_type, media_type, media_type_locked, src_path)
			VALUES (?, 0, 0, 0, '', ?, 'public', 'ebook', ?, 0, '')`,
			bookID, userID, mediaType)
		if err != nil {
			return fmt.Errorf("scan: 插入 items 失败: %w", err)
		}
		return nil
	}
	if item.MediaTypeLocked {
		return nil
	}
	merged := media.MergeMediaType(item.MediaType, mediaType)
	if merged == item.MediaType {
		return nil
	}
	if _, err := s.DB.Exec(`UPDATE items SET media_type = ? WHERE book_id = ?`, merged, bookID); err != nil {
		return fmt.Errorf("scan: 更新 items 失败: %w", err)
	}
	return nil
}

// markImported 复刻 _mark_imported。
//
// 返回 (状态, 书籍 ID, 错误)。
func (s *Service) markImported(row *userdb.ScanFile, fpath, format, mode string, deleteSource bool) (string, int64, error) {
	row.Status = userdb.ScanStatusImported
	setRowData(row, "import_mode", mode)
	if err := saveScanFile(s.DB, row); err != nil {
		return "", 0, err
	}
	if mode == ModeMove && deleteSource {
		if err := s.deleteSourceAfterImport(row, fpath, format); err != nil {
			return row.Status, row.BookID, err
		}
	}
	return row.Status, row.BookID, nil
}

// deleteSourceAfterImport 复刻 _delete_source_after_import。
//
// 先确认书库目标文件存在，再删除源文件；任一步失败都标记 delete_failed。
func (s *Service) deleteSourceAfterImport(row *userdb.ScanFile, fpath, format string) error {
	if !s.libraryFormatExists(row.BookID, format) {
		row.Status = userdb.ScanStatusDeleteFailed
		setRowData(row, "delete_error", "书库目标文件未确认存在，未删除源文件")
		return saveScanFile(s.DB, row)
	}
	if err := os.Remove(fpath); err != nil {
		row.Status = userdb.ScanStatusDeleteFailed
		setRowData(row, "delete_error", err.Error())
		return saveScanFile(s.DB, row)
	}
	return nil
}

// libraryFormatExists 复刻 _library_format_exists。
//
// 书库句柄不可用或查询失败时返回 true（保守：不阻止源文件清理）。
func (s *Service) libraryFormatExists(bookID int64, format string) bool {
	if bookID == 0 || s.LibraryDB == nil {
		return false
	}
	path, missing, err := library.ResolvePath(s.LibraryDB, bookID, format)
	if err != nil {
		return true
	}
	if missing || path == "" {
		return false
	}
	_, statErr := os.Stat(path)
	return statErr == nil
}

// markIndexed 复刻 _mark_indexed：仅索引模式，把原始文件路径写入书库。
//
// 返回 (状态, 书籍 ID, 错误)。
func (s *Service) markIndexed(row *userdb.ScanFile, mi importmeta.Metadata, fpath, format string,
	importID, userID int64, mediaType string, sameAuthorBookID int64) (string, int64, error) {

	physicalPath := fpath
	if archive, _ := row.Data["archive_path"].(string); archive != "" {
		info, err := os.Stat(fpath)
		if err != nil {
			return "", 0, err
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
		fp, _ := row.Data["archive_fingerprint"].(string)
		fpath = sourcefile.Encode(sourcefile.Reference{Archive: archive, Fingerprint: fp, Chain: chain, Hash: row.Hash, Name: row.Name, Size: info.Size()})
	}

	bookID, created, err := s.addExternalIndexRecord(mi, fpath, format, sameAuthorBookID)
	if err != nil {
		row.Status = userdb.ScanStatusFailed
		setRowData(row, "import_mode", ModeIndex, "index_error", err.Error())
		return row.Status, 0, saveScanFile(s.DB, row)
	}

	if err := library.SeedSourceHashes(s.LibraryDB, map[string]string{fpath: row.Hash}); err != nil {
		return "", 0, err
	}
	s.extractCover(bookID, physicalPath, format)
	row.ImportID = importID
	row.BookID = bookID
	row.Status = userdb.ScanStatusIndexed
	if err := s.ensureIndexedItem(bookID, userID, fpath, mediaType); err != nil {
		return "", 0, err
	}
	abs, _ := filepath.Abs(fpath)
	if sourcefile.IsReference(fpath) {
		abs = fpath
	}
	setRowData(row,
		"import_mode", ModeIndex,
		"source_path", abs,
		"format", strings.ToUpper(format),
		"created_book", created,
		"external_index", true,
		"index_note", "仅索引模式已将原始文件路径写入 Calibre 书库",
	)
	return row.Status, bookID, saveScanFile(s.DB, row)
}

// addExternalIndexRecord 复刻 add_external_index_record。
//
// 已有同作者书籍时复用（existingBookID > 0），否则新建。
func (s *Service) addExternalIndexRecord(mi importmeta.Metadata, fpath, format string, existingBookID int64) (int64, bool, error) {
	if s.LibraryDB == nil {
		return 0, false, fmt.Errorf("scan: 建立索引记录需要书库句柄")
	}
	if existingBookID > 0 {
		if err := s.addFormatToBook(existingBookID, format, fpath); err != nil {
			return 0, false, err
		}
		return existingBookID, false, nil
	}
	author := ""
	if len(mi.Authors) > 0 {
		author = mi.Authors[0]
	}
	// 与 importNewBook 一致：books.path 存源文件所在目录，不复制文件。
	bookID, err := library.ImportBook(s.LibraryDB, library.BookMeta{
		Title:     mi.Title,
		Author:    author,
		Publisher: mi.Publisher,
		Pubdate:   mi.Pubdate,
		Tags:      mi.Tags,
		Comments:  mi.Comments,
		Path:      indexedBookDirectory(fpath),
	})
	if err != nil {
		return 0, false, fmt.Errorf("scan: 建立索引记录失败: %w", err)
	}
	if err := s.addFormatToBook(bookID, format, fpath); err != nil {
		return 0, false, err
	}
	return bookID, true, nil
}

// ensureIndexedItem 复刻 _ensure_indexed_item。
func (s *Service) ensureIndexedItem(bookID, userID int64, fpath, mediaType string) error {
	if err := s.setItemMediaType(bookID, userID, mediaType); err != nil {
		return err
	}
	abs, err := filepath.Abs(fpath)
	if sourcefile.IsReference(fpath) {
		abs = fpath
		err = nil
	}
	if err != nil {
		abs = fpath
	}
	if _, err := s.DB.Exec(`UPDATE items SET src_path = ? WHERE book_id = ?`, abs, bookID); err != nil {
		return fmt.Errorf("scan: 更新 src_path 失败: %w", err)
	}
	return nil
}

// WatchStatus 是自动监控状态，对齐 Python 的 _watch_status。
type WatchStatus struct {
	State      string `json:"state"`
	Queued     int    `json:"queued"`
	Running    int    `json:"running"`
	Failed     int    `json:"failed"`
	LastScanAt any    `json:"last_scan_at"`
	Message    string `json:"message"`
}

// Watch 复刻 ScanService 的自动监控状态机。
//
// 只维护状态与代际计数；实际循环由调用方驱动（RunOnce）。
type Watch struct {
	status     WatchStatus
	generation int64
}

// NewWatch 构造一个处于「关闭」状态的监控器。
func NewWatch() *Watch {
	return &Watch{status: WatchStatus{State: "off"}}
}

// Status 复刻 get_watch_status。
func (w *Watch) Status() WatchStatus { return w.status }

// Stop 复刻 stop_auto_watch：递增代际并置为关闭。
func (w *Watch) Stop(message string) int64 {
	w.generation++
	w.status.State = "off"
	w.status.Message = message
	return w.generation
}

// Start 复刻 start_auto_watch：置为运行中并返回当前代际。
func (w *Watch) Start() int64 {
	w.status.State = "running"
	w.status.Message = ""
	return w.generation
}

// Generation 返回当前代际。
func (w *Watch) Generation() int64 { return w.generation }

// Update 复刻 _update_watch_status。
func (w *Watch) Update(queued, running, failed int, lastScanAt any, message string) {
	w.status.Queued = queued
	w.status.Running = running
	w.status.Failed = failed
	w.status.LastScanAt = lastScanAt
	w.status.Message = message
}

// WatchInterval 复刻 run_auto_watch 的间隔下限。
//
// 返回 (间隔秒数, 批次大小)。
func WatchInterval(interval, limit, defaultInterval, defaultLimit int) (int, int) {
	if interval < 5 {
		interval = defaultInterval
	}
	if interval < 5 {
		interval = 5
	}
	if limit < 1 {
		limit = defaultLimit
	}
	if limit < 1 {
		limit = 1
	}
	return interval, limit
}

// NowString 返回当前时间的字符串形式。
func (s *Service) NowString() string { return s.now() }

// ClockTime 返回当前时间。
func (s *Service) ClockTime() time.Time { return s.clock() }

// 确保 sql 包被使用（scanRow 依赖 sql.ErrNoRows 语义）。
var _ = sql.ErrNoRows

func indexedBookDirectory(source string) string {
	if sourcefile.IsReference(source) {
		r, e := sourcefile.Decode(source)
		if e == nil {
			return filepath.Dir(r.Archive)
		}
	}
	return filepath.Dir(source)
}
