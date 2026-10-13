package httpapi

import (
	"database/sql"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/userdb"
)

// webdavSections 复刻 Python MyBooksDavProvider.sections 的固定分类。
var webdavSections = []string{"分类", "标签", "作者", "最新", "我的收藏", "我的待读", "我的在读", "我的已读"}

// syncFolderName 是每用户可写的同步目录名。
const syncFolderName = "我的同步"

// webdavService 复刻 Python 的 MyBooksDavProvider：把书库暴露为 WebDAV 资源树。
//
// 只读区：分类 / 标签 / 作者 / 最新 / 我的收藏 / 我的待读 / 我的在读 / 我的已读。
// 可写区：我的同步（按用户隔离的文件系统目录）。
type webdavService struct {
	// db 是 Talebook 自有库：reading_state、readers 等在这里。
	db *sql.DB
	// libraryDB 是 Calibre 元数据库：books 表在这里（书名）。
	libraryDB *sql.DB
	settings  map[string]any
	root      string
}

// newWebDAVService 构造 WebDAV 服务。
//
// db 是自有库（reading_state），libraryDB 是 Calibre 库（books）。
func newWebDAVService(db, libraryDB *sql.DB, settings map[string]any, root string) *webdavService {
	return &webdavService{db: db, libraryDB: libraryDB, settings: settings, root: root}
}

// NewWebDAVServeFunc 返回可直接注入 ServeOptions.WebDAVServe 的回调。
func NewWebDAVServeFunc(db, libraryDB *sql.DB, settings map[string]any, root string) func(*Context) bool {
	return newWebDAVService(db, libraryDB, settings, root).Serve
}

// Serve 处理一个 WebDAV 请求；返回 false 表示未处理。
func (s *webdavService) Serve(ctx *Context) bool {
	if ctx.Request == nil || ctx.Writer == nil {
		return false
	}
	path := ctx.Request.URL.Path
	// 去掉 /books 前缀。
	path = strings.TrimPrefix(path, "/books")
	if path == "" {
		path = "/"
	}
	path = decodeDAVPath(path)

	switch ctx.Request.Method {
	case "PROPFIND":
		s.handlePropfind(ctx, path)
	case http.MethodGet, http.MethodHead:
		s.handleGet(ctx, path)
	case http.MethodPut:
		s.handlePut(ctx, path)
	case http.MethodDelete:
		s.handleDelete(ctx, path)
	case "MKCOL":
		s.handleMkcol(ctx, path)
	case http.MethodOptions:
		ctx.Writer.Header().Set("DAV", "1,2")
		ctx.Writer.Header().Set("Allow", "OPTIONS, GET, HEAD, PUT, DELETE, PROPFIND, MKCOL")
		ctx.Writer.WriteHeader(http.StatusOK)
	default:
		ctx.Writer.Header().Set("DAV", "1,2")
		ctx.Writer.WriteHeader(http.StatusMethodNotAllowed)
	}
	return true
}

// davResource 是 WebDAV 资源树的一个节点。
type davResource struct {
	Path     string
	Name     string
	IsDir    bool
	Size     int64
	Modified time.Time
	// FilePath 非空时表示可直接读取的磁盘文件。
	FilePath string
}

// resolve 把 WebDAV 路径解析为资源；不存在返回 nil。
func (s *webdavService) resolve(ctx *Context, path string) *davResource {
	path = strings.Trim(path, "/")
	if path == "" {
		return &davResource{Path: "/", Name: "root", IsDir: true, Modified: time.Now()}
	}

	parts := strings.Split(path, "/")
	section := parts[0]

	// 可写同步目录。
	if section == syncFolderName {
		return s.resolveSync(ctx, parts)
	}

	// 只读书库分类。
	if !containsString(webdavSections, section) {
		return nil
	}
	if len(parts) == 1 {
		return &davResource{Path: "/" + section, Name: section, IsDir: true, Modified: time.Now()}
	}
	// 「分类」「标签」「作者」是两级结构（分类名 / 书名）；
	// 其余分类直接列书，第二层就是书籍文件。
	if isTwoLevelSection(section) {
		if len(parts) == 2 {
			return &davResource{Path: "/" + path, Name: parts[1], IsDir: true, Modified: time.Now()}
		}
		return s.resolveBookFile(ctx, section, parts[1], parts[2])
	}
	if len(parts) == 2 {
		return s.resolveBookFile(ctx, section, "", parts[1])
	}
	return nil
}

// isTwoLevelSection 报告该分类是否为「分类名 / 书名」两级结构。
func isTwoLevelSection(section string) bool {
	return section == "分类" || section == "标签" || section == "作者"
}

// resolveSync 解析同步目录下的资源。
func (s *webdavService) resolveSync(ctx *Context, parts []string) *davResource {
	if ctx.Identity.UserID == 0 {
		return nil
	}
	root := s.userSyncRoot(ctx.Identity.UserID)
	rel := strings.Join(parts[1:], "/")
	full := filepath.Join(root, filepath.FromSlash(rel))
	if !isWithinPath(full, root) {
		return nil
	}

	info, err := os.Stat(full)
	if err != nil {
		// 目录本身即使尚未创建也视为存在（首次 PUT 时创建）。
		if len(parts) == 1 {
			return &davResource{Path: "/" + syncFolderName, Name: syncFolderName,
				IsDir: true, Modified: time.Now()}
		}
		return nil
	}
	return &davResource{
		Path:     "/" + strings.Join(parts, "/"),
		Name:     info.Name(),
		IsDir:    info.IsDir(),
		Size:     info.Size(),
		Modified: info.ModTime(),
		FilePath: full,
	}
}

// resolveBookFile 解析书籍文件资源。
func (s *webdavService) resolveBookFile(ctx *Context, section, category, filename string) *davResource {
	bookID, format := parseBookFilename(filename)
	if bookID == 0 {
		return nil
	}
	if !s.canView(ctx, bookID) {
		return nil
	}
	path, missing, err := library.ResolvePath(s.db, bookID, format)
	if err != nil || missing {
		return nil
	}
	info, err := os.Stat(path)
	if err != nil {
		return nil
	}
	return &davResource{
		Path:     "/" + section + "/" + category + "/" + filename,
		Name:     filename,
		Size:     info.Size(),
		Modified: info.ModTime(),
		FilePath: path,
	}
}

// members 返回目录下的子资源。
func (s *webdavService) members(ctx *Context, path string) []*davResource {
	path = strings.Trim(path, "/")
	if path == "" {
		out := make([]*davResource, 0, len(webdavSections)+1)
		for _, name := range webdavSections {
			out = append(out, &davResource{Path: "/" + name, Name: name, IsDir: true, Modified: time.Now()})
		}
		if ctx.Identity.UserID != 0 {
			out = append(out, &davResource{Path: "/" + syncFolderName, Name: syncFolderName,
				IsDir: true, Modified: time.Now()})
		}
		return out
	}

	parts := strings.Split(path, "/")
	section := parts[0]

	if section == syncFolderName {
		return s.syncMembers(ctx, parts)
	}
	if !containsString(webdavSections, section) {
		return nil
	}
	if len(parts) == 1 {
		return s.categoryMembers(ctx, section)
	}
	if isTwoLevelSection(section) && len(parts) == 2 {
		return s.bookMembers(ctx, section, parts[1])
	}
	return nil
}

// categoryMembers 返回某分类下的条目。
func (s *webdavService) categoryMembers(ctx *Context, section string) []*davResource {
	switch section {
	case "分类":
		return s.namedMembers(ctx, "tags", section)
	case "标签":
		return s.namedMembers(ctx, "tags", section)
	case "作者":
		return s.namedMembers(ctx, "authors", section)
	default:
		// 最新 / 我的收藏 / 我的待读 / 我的在读 / 我的已读 直接列书。
		return s.bookMembers(ctx, section, "")
	}
}

// namedMembers 返回标签 / 作者等命名分类。
func (s *webdavService) namedMembers(ctx *Context, table, section string) []*davResource {
	rows, err := s.db.Query(fmt.Sprintf(`SELECT name FROM %s ORDER BY name LIMIT 500`, table))
	if err != nil {
		return nil
	}
	defer rows.Close()

	out := []*davResource{}
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			continue
		}
		out = append(out, &davResource{
			Path: "/" + section + "/" + name, Name: name, IsDir: true, Modified: time.Now(),
		})
	}
	return out
}

// bookMembers 返回某分类下的书籍文件。
func (s *webdavService) bookMembers(ctx *Context, section, category string) []*davResource {
	ids := s.bookIDsFor(ctx, section, category)
	out := []*davResource{}
	for _, id := range ids {
		formats, err := library.ListFormats(s.db, id)
		if err != nil {
			continue
		}
		title := s.bookTitle(id)
		for _, f := range formats {
			name := fmt.Sprintf("%d-%s.%s", id, title, strings.ToLower(f.Format))
			out = append(out, &davResource{
				Path: "/" + section + "/" + category + "/" + name,
				Name: name, Size: f.Size, Modified: time.Now(), FilePath: f.Path,
			})
		}
	}
	return out
}

// bookIDsFor 返回某分类下的书籍 id。
func (s *webdavService) bookIDsFor(ctx *Context, section, category string) []int64 {
	switch section {
	case "最新":
		ids, err := library.Sort(s.db, "timestamp", false)
		if err != nil {
			return nil
		}
		return limitIDs(ids, 100)
	case "我的收藏":
		return s.readingStateIDs(ctx, "favorite")
	case "我的待读":
		return s.readingStateIDs(ctx, "wants")
	case "我的在读":
		return s.readingStateIDs(ctx, "reading")
	case "我的已读":
		return s.readingStateIDs(ctx, "read_done")
	case "分类", "标签":
		ids, err := library.Search(s.db, fmt.Sprintf("tags:'%s'", category))
		if err != nil {
			return nil
		}
		return limitIDs(ids, 200)
	case "作者":
		ids, err := library.Search(s.db, fmt.Sprintf("authors:'%s'", category))
		if err != nil {
			return nil
		}
		return limitIDs(ids, 200)
	}
	return nil
}

// readingStateIDs 按阅读状态取书籍 id。
func (s *webdavService) readingStateIDs(ctx *Context, kind string) []int64 {
	if ctx.Identity.UserID == 0 {
		return nil
	}
	var query string
	switch kind {
	case "favorite":
		query = `SELECT book_id FROM reading_state WHERE reader_id = ? AND favorite = 1`
	case "wants":
		query = `SELECT book_id FROM reading_state WHERE reader_id = ? AND wants = 1`
	case "reading":
		query = `SELECT book_id FROM reading_state WHERE reader_id = ? AND read_state = 1`
	case "read_done":
		query = `SELECT book_id FROM reading_state WHERE reader_id = ? AND read_state = 2`
	default:
		return nil
	}
	rows, err := s.db.Query(query, ctx.Identity.UserID)
	if err != nil {
		return nil
	}
	defer rows.Close()

	out := []int64{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err == nil {
			out = append(out, id)
		}
	}
	return out
}

// syncMembers 返回同步目录下的文件。
func (s *webdavService) syncMembers(ctx *Context, parts []string) []*davResource {
	if ctx.Identity.UserID == 0 {
		return nil
	}
	root := s.userSyncRoot(ctx.Identity.UserID)
	rel := strings.Join(parts[1:], "/")
	dir := filepath.Join(root, filepath.FromSlash(rel))
	if !isWithinPath(dir, root) {
		return nil
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil
	}
	out := []*davResource{}
	for _, e := range entries {
		info, err := e.Info()
		if err != nil {
			continue
		}
		out = append(out, &davResource{
			Path:     "/" + strings.Join(append(parts, e.Name()), "/"),
			Name:     e.Name(),
			IsDir:    e.IsDir(),
			Size:     info.Size(),
			Modified: info.ModTime(),
			FilePath: filepath.Join(dir, e.Name()),
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out
}

// userSyncRoot 返回用户的同步目录根。
func (s *webdavService) userSyncRoot(userID int64) string {
	return filepath.Join(s.root, "webdav", fmt.Sprintf("%d", userID))
}

// canView 判定当前请求方能否查看该书。
func (s *webdavService) canView(ctx *Context, bookID int64) bool {
	ok, err := userdb.CanViewBook(s.db, bookID, ctx.Identity.UserID, ctx.Identity.IsAdmin)
	return err == nil && ok
}

// bookTitle 返回书名。
//
// books 表在 Calibre 元数据库，必须用 libraryDB；用自有库会静默回落到 book-<id>。
func (s *webdavService) bookTitle(bookID int64) string {
	if s.libraryDB == nil {
		return fmt.Sprintf("book-%d", bookID)
	}
	var title string
	if err := s.libraryDB.QueryRow(`SELECT title FROM books WHERE id = ?`, bookID).Scan(&title); err != nil {
		return fmt.Sprintf("book-%d", bookID)
	}
	return sanitizeDAVName(title)
}

// ---- HTTP 方法实现 ----

// handlePropfind 返回资源的 PROPFIND 响应。
func (s *webdavService) handlePropfind(ctx *Context, path string) {
	res := s.resolve(ctx, path)
	if res == nil {
		ctx.Writer.WriteHeader(http.StatusNotFound)
		return
	}

	resources := []*davResource{res}
	if res.IsDir {
		resources = append(resources, s.members(ctx, path)...)
	}

	var b strings.Builder
	b.WriteString(`<?xml version="1.0" encoding="utf-8"?>` + "\n")
	b.WriteString(`<D:multistatus xmlns:D="DAV:">` + "\n")
	for _, r := range resources {
		b.WriteString("  <D:response>\n")
		b.WriteString("    <D:href>" + xmlEscape(r.Path) + "</D:href>\n")
		b.WriteString("    <D:propstat>\n      <D:prop>\n")
		b.WriteString("        <D:displayname>" + xmlEscape(r.Name) + "</D:displayname>\n")
		if r.IsDir {
			b.WriteString("        <D:resourcetype><D:collection/></D:resourcetype>\n")
		} else {
			b.WriteString("        <D:resourcetype/>\n")
			b.WriteString(fmt.Sprintf("        <D:getcontentlength>%d</D:getcontentlength>\n", r.Size))
		}
		b.WriteString("        <D:getlastmodified>" + r.Modified.UTC().Format(http.TimeFormat) + "</D:getlastmodified>\n")
		b.WriteString("      </D:prop>\n      <D:status>HTTP/1.1 200 OK</D:status>\n    </D:propstat>\n")
		b.WriteString("  </D:response>\n")
	}
	b.WriteString("</D:multistatus>\n")

	ctx.Writer.Header().Set("Content-Type", "application/xml; charset=utf-8")
	ctx.Writer.WriteHeader(207)
	_, _ = ctx.Writer.Write([]byte(b.String()))
}

// handleGet 返回文件内容。
func (s *webdavService) handleGet(ctx *Context, path string) {
	res := s.resolve(ctx, path)
	if res == nil || res.IsDir || res.FilePath == "" {
		ctx.Writer.WriteHeader(http.StatusNotFound)
		return
	}
	body, err := os.ReadFile(res.FilePath)
	if err != nil {
		ctx.Writer.WriteHeader(http.StatusNotFound)
		return
	}
	ctx.Writer.Header().Set("Content-Type", "application/octet-stream")
	ctx.Writer.Header().Set("Content-Length", fmt.Sprintf("%d", len(body)))
	ctx.Writer.WriteHeader(http.StatusOK)
	if ctx.Request.Method != http.MethodHead {
		_, _ = ctx.Writer.Write(body)
	}
}

// handlePut 写入同步目录下的文件。
func (s *webdavService) handlePut(ctx *Context, path string) {
	if ctx.Identity.UserID == 0 {
		ctx.Writer.WriteHeader(http.StatusUnauthorized)
		return
	}
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) < 2 || parts[0] != syncFolderName {
		ctx.Writer.WriteHeader(http.StatusForbidden)
		return
	}

	root := s.userSyncRoot(ctx.Identity.UserID)
	full := filepath.Join(root, filepath.FromSlash(strings.Join(parts[1:], "/")))
	if !isWithinPath(full, root) {
		ctx.Writer.WriteHeader(http.StatusForbidden)
		return
	}
	if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
		ctx.Writer.WriteHeader(http.StatusInternalServerError)
		return
	}

	body := ctx.Body()
	if err := os.WriteFile(full, body, 0o644); err != nil {
		ctx.Writer.WriteHeader(http.StatusInternalServerError)
		return
	}
	ctx.Writer.WriteHeader(http.StatusCreated)
}

// handleDelete 删除同步目录下的文件。
func (s *webdavService) handleDelete(ctx *Context, path string) {
	if ctx.Identity.UserID == 0 {
		ctx.Writer.WriteHeader(http.StatusUnauthorized)
		return
	}
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) < 2 || parts[0] != syncFolderName {
		ctx.Writer.WriteHeader(http.StatusForbidden)
		return
	}

	root := s.userSyncRoot(ctx.Identity.UserID)
	full := filepath.Join(root, filepath.FromSlash(strings.Join(parts[1:], "/")))
	if !isWithinPath(full, root) {
		ctx.Writer.WriteHeader(http.StatusForbidden)
		return
	}
	if err := os.RemoveAll(full); err != nil {
		ctx.Writer.WriteHeader(http.StatusNotFound)
		return
	}
	ctx.Writer.WriteHeader(http.StatusNoContent)
}

// handleMkcol 创建同步目录下的子目录。
func (s *webdavService) handleMkcol(ctx *Context, path string) {
	if ctx.Identity.UserID == 0 {
		ctx.Writer.WriteHeader(http.StatusUnauthorized)
		return
	}
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) < 2 || parts[0] != syncFolderName {
		ctx.Writer.WriteHeader(http.StatusForbidden)
		return
	}

	root := s.userSyncRoot(ctx.Identity.UserID)
	full := filepath.Join(root, filepath.FromSlash(strings.Join(parts[1:], "/")))
	if !isWithinPath(full, root) {
		ctx.Writer.WriteHeader(http.StatusForbidden)
		return
	}
	if err := os.MkdirAll(full, 0o755); err != nil {
		ctx.Writer.WriteHeader(http.StatusInternalServerError)
		return
	}
	ctx.Writer.WriteHeader(http.StatusCreated)
}

// ---- 内部辅助 ----

// decodeDAVPath 解码 URL 路径（处理百分号编码）。
func decodeDAVPath(path string) string {
	if !strings.Contains(path, "%") {
		return path
	}
	out, err := url.PathUnescape(path)
	if err != nil {
		return path
	}
	return out
}

// parseBookFilename 从「<id>-<title>.<fmt>」解析书籍 id 与格式。
func parseBookFilename(name string) (int64, string) {
	dot := strings.LastIndex(name, ".")
	if dot <= 0 {
		return 0, ""
	}
	format := strings.ToLower(name[dot+1:])
	base := name[:dot]

	dash := strings.Index(base, "-")
	if dash <= 0 {
		return 0, ""
	}
	var id int64
	if _, err := fmt.Sscanf(base[:dash], "%d", &id); err != nil {
		return 0, ""
	}
	return id, format
}

// sanitizeDAVName 清理文件名中的非法字符。
func sanitizeDAVName(name string) string {
	r := strings.NewReplacer("/", "_", "\\", "_", "\x00", "")
	out := r.Replace(name)
	if len(out) > 80 {
		out = out[:80]
	}
	return out
}

// isWithinPath 判定 path 是否在 root 之内。
func isWithinPath(path, root string) bool {
	absPath, err := filepath.Abs(path)
	if err != nil {
		return false
	}
	absRoot, err := filepath.Abs(root)
	if err != nil {
		return false
	}
	rel, err := filepath.Rel(absRoot, absPath)
	if err != nil {
		return false
	}
	return rel == "." || (!strings.HasPrefix(rel, "..") && !filepath.IsAbs(rel))
}

// containsString 判定切片是否包含某值。
func containsString(list []string, v string) bool {
	for _, item := range list {
		if item == v {
			return true
		}
	}
	return false
}

// limitIDs 截断 id 列表。
func limitIDs(ids []int64, max int) []int64 {
	if len(ids) <= max {
		return ids
	}
	return ids[:max]
}
