package opdsimport

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"talebook/booksvr/internal/userdb"
)

// atomNS 是 OPDS 使用的 Atom 命名空间。
const atomNS = "http://www.w3.org/2005/Atom"

// acquisitionRel 是 OPDS 的获取链接 rel。
const acquisitionRel = "http://opds-spec.org/acquisition"

// navigationRels 是判定「目录项」的 rel 集合。
var navigationRels = map[string]bool{
	"subsection":                     true,
	"http://opds-spec.org/crawlable": true,
	"collection":                     true,
}

// feed 是 OPDS Atom feed。
type feed struct {
	XMLName xml.Name `xml:"feed"`
	Entries []entry  `xml:"entry"`
}

// entry 是 OPDS Atom entry。
type entry struct {
	Title   string   `xml:"title"`
	Authors []author `xml:"author"`
	Links   []link   `xml:"link"`
	Summary string   `xml:"summary"`
	Content content  `xml:"content"`
}

// author 是 Atom 作者。
type author struct {
	Name string `xml:"name"`
}

// link 是 Atom 链接。
type link struct {
	Rel  string `xml:"rel,attr"`
	Href string `xml:"href,attr"`
	Type string `xml:"type,attr"`
}

// content 是 Atom 内容。
type content struct {
	Type string `xml:"type,attr"`
	Text string `xml:",chardata"`
}

// CatalogItem 是解析出的目录项（文件夹或书籍）。
type CatalogItem struct {
	ID       string `json:"id"`
	Title    string `json:"title"`
	Author   string `json:"author"`
	IsFolder bool   `json:"is_folder"`
	Href     string `json:"href"`
	Format   string `json:"format"`
	Cover    string `json:"cover"`
	Summary  string `json:"summary"`
}

// Service 复刻 Python OPDSImportService。
type Service struct {
	client    *http.Client
	scanDir   string
	userAgent string
}

// NewService 构造 OPDS 导入服务。
func NewService(scanDir string) *Service {
	return &Service{
		client:    &http.Client{Timeout: 60 * time.Second},
		scanDir:   scanDir,
		userAgent: "Talebook-OPDS-Importer/1.0",
	}
}

// ParseCatalog 解析 OPDS 目录 XML，返回条目列表。
func (s *Service) ParseCatalog(data []byte, baseURL string) ([]CatalogItem, error) {
	var f feed
	if err := xml.Unmarshal(data, &f); err != nil {
		return nil, fmt.Errorf("opdsimport: 解析 XML 失败: %w", err)
	}

	out := make([]CatalogItem, 0, len(f.Entries))
	for _, e := range f.Entries {
		item := s.entryToItem(e, baseURL)
		if item.Href == "" {
			continue
		}
		out = append(out, item)
	}
	return out, nil
}

// entryToItem 把 Atom entry 转成目录项。
func (s *Service) entryToItem(e entry, baseURL string) CatalogItem {
	item := CatalogItem{
		Title:   strings.TrimSpace(e.Title),
		Summary: strings.TrimSpace(e.Summary),
	}
	if item.Title == "" {
		item.Title = "未知标题"
	}
	if len(e.Authors) > 0 && strings.TrimSpace(e.Authors[0].Name) != "" {
		item.Author = strings.TrimSpace(e.Authors[0].Name)
	} else {
		item.Author = "未知作者"
	}
	if item.Summary == "" {
		item.Summary = strings.TrimSpace(e.Content.Text)
	}

	// 优先取 acquisition 链接（书籍），否则取导航链接（文件夹）。
	for _, l := range e.Links {
		if l.Rel == acquisitionRel && l.Href != "" {
			item.Href = resolveURL(baseURL, l.Href)
			item.Format = formatFromType(l.Type)
			break
		}
	}
	if item.Href == "" {
		for _, l := range e.Links {
			if navigationRels[l.Rel] && l.Href != "" {
				item.Href = resolveURL(baseURL, l.Href)
				item.IsFolder = true
				break
			}
		}
	}
	if item.Href == "" {
		return CatalogItem{}
	}

	// 封面链接。
	for _, l := range e.Links {
		if l.Rel == "http://opds-spec.org/thumbnail" || l.Rel == "http://opds-spec.org/cover" {
			if l.Href != "" {
				item.Cover = resolveURL(baseURL, l.Href)
				break
			}
		}
	}

	item.ID = itemID(item.Href)
	return item
}

// FetchCatalog 抓取 OPDS 目录。
func (s *Service) FetchCatalog(rawURL string) ([]byte, error) {
	req, err := http.NewRequest(http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, fmt.Errorf("opdsimport: 构造请求失败: %w", err)
	}
	req.Header.Set("User-Agent", s.userAgent)
	req.Header.Set("Accept", "application/atom+xml,application/xml,text/xml")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("opdsimport: 请求失败: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("opdsimport: 状态码 %d", resp.StatusCode)
	}
	return io.ReadAll(io.LimitReader(resp.Body, 32<<20))
}

// Download 下载书籍文件到扫描目录，返回落盘路径。
func (s *Service) Download(item CatalogItem) (string, error) {
	if item.Href == "" {
		return "", fmt.Errorf("opdsimport: 缺少下载链接")
	}
	req, err := http.NewRequest(http.MethodGet, item.Href, nil)
	if err != nil {
		return "", fmt.Errorf("opdsimport: 构造请求失败: %w", err)
	}
	req.Header.Set("User-Agent", s.userAgent)

	resp, err := s.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("opdsimport: 下载失败: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("opdsimport: 下载状态码 %d", resp.StatusCode)
	}

	format := item.Format
	if format == "" {
		format = GuessFormat(item.Href)
	}
	if format == "" {
		format = "epub"
	}

	if err := os.MkdirAll(s.scanDir, 0o755); err != nil {
		return "", fmt.Errorf("opdsimport: 创建扫描目录失败: %w", err)
	}
	name := targetFilename(item.Title, format)
	target := filepath.Join(s.scanDir, name)
	if _, err := os.Stat(target); err == nil {
		target = filepath.Join(s.scanDir, uniqueSuffix(name))
	}

	f, err := os.Create(target)
	if err != nil {
		return "", fmt.Errorf("opdsimport: 创建文件失败: %w", err)
	}
	defer f.Close()
	if _, err := io.Copy(f, resp.Body); err != nil {
		_ = os.Remove(target)
		return "", fmt.Errorf("opdsimport: 写入文件失败: %w", err)
	}
	return target, nil
}

// ImportToScan 复刻 import_book_to_scan：下载并登记 ScanFile。
func (s *Service) ImportToScan(db *sql.DB, item CatalogItem) (map[string]any, error) {
	hash := itemHash(item.Href)
	path, err := s.Download(item)
	if err != nil {
		s.updateScanFile(db, hash, "", userdb.ScanStatusFailed, err.Error())
		return nil, err
	}
	s.updateScanFile(db, hash, path, userdb.ScanStatusNew, "")
	return map[string]any{
		"title":    item.Title,
		"author":   item.Author,
		"filename": filepath.Base(path),
		"path":     path,
	}, nil
}

// updateScanFile 写入 / 更新 ScanFile 记录。
func (s *Service) updateScanFile(db *sql.DB, hash, path, status, errMsg string) {
	if db == nil || hash == "" {
		return
	}
	now := time.Now().Format("2006-01-02 15:04:05")
	var id int64
	err := db.QueryRow(`SELECT id FROM scanfiles WHERE hash = ?`, hash).Scan(&id)
	if err == nil {
		_, _ = db.Exec(`UPDATE scanfiles SET path = ?, status = ?, update_time = ?
			WHERE id = ?`, path, status, now, id)
		return
	}
	_, _ = db.Exec(`INSERT INTO scanfiles
		(scan_id, import_id, name, path, hash, status, title, author, publisher, tags,
		 create_time, update_time, book_id, data)
		VALUES (0, 0, ?, ?, ?, ?, '', '', '', '', ?, ?, 0, ?)`,
		filepath.Base(path), path, hash, status, now, now, errMsg)
}

// ---- 内部辅助 ----

// resolveURL 把相对地址解析为绝对地址。
func resolveURL(base, ref string) string {
	if ref == "" {
		return ""
	}
	if strings.HasPrefix(ref, "http://") || strings.HasPrefix(ref, "https://") {
		return ref
	}
	if base == "" {
		return ref
	}
	u, err := url.Parse(base)
	if err != nil {
		return ref
	}
	r, err := url.Parse(ref)
	if err != nil {
		return ref
	}
	return u.ResolveReference(r).String()
}

// formatFromType 从 MIME 类型推断格式。
func formatFromType(mime string) string {
	if mime == "" {
		return ""
	}
	parts := strings.Split(mime, "/")
	if len(parts) < 2 {
		return ""
	}
	out := parts[len(parts)-1]
	// 去掉 +zip 之类的后缀。
	if i := strings.Index(out, "+"); i > 0 {
		out = out[:i]
	}
	return strings.ToLower(out)
}

// GuessFormat 从 URL 推断格式。
func GuessFormat(rawURL string) string {
	u, err := url.Parse(rawURL)
	if err != nil {
		return ""
	}
	ext := strings.TrimPrefix(filepath.Ext(u.Path), ".")
	return strings.ToLower(ext)
}

// itemID 复刻 _generate_item_id：取 href 的 sha256 前 16 位。
func itemID(href string) string {
	sum := sha256.Sum256([]byte(href))
	return hex.EncodeToString(sum[:])[:16]
}

// itemHash 复刻 book_hash：取 href 的 sha256 十六进制。
func itemHash(href string) string {
	if href == "" {
		return ""
	}
	sum := sha256.Sum256([]byte(href))
	return hex.EncodeToString(sum[:])
}

// safeTitleRe 匹配文件名中的非法字符。
var safeTitleRe = regexp.MustCompile(`[^a-zA-Z0-9\s\-_]`)

// targetFilename 复刻 target_filename 生成规则。
func targetFilename(title, format string) string {
	safe := strings.TrimSpace(safeTitleRe.ReplaceAllString(title, "_"))
	if len(safe) > 50 {
		safe = safe[:50]
	}
	if safe == "" {
		safe = "book"
	}
	return fmt.Sprintf("opds_%s.%s", safe, format)
}

// uniqueSuffix 给重名文件加随机后缀。
func uniqueSuffix(name string) string {
	ext := filepath.Ext(name)
	base := strings.TrimSuffix(name, ext)
	buf := make([]byte, 8)
	if _, err := rand.Read(buf); err != nil {
		// 回退到纳秒时间戳，仍保证足够区分度。
		return fmt.Sprintf("%s_%d%s", base, time.Now().UnixNano(), ext)
	}
	return fmt.Sprintf("%s_%s%s", base, hex.EncodeToString(buf), ext)
}
