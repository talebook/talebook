// 本文件实现 webserver/handlers/booksource_admin.py 的书源管理领域层。
//
// 书源（Legado 格式）的读写、校验、导入导出与检测状态。
// HTTP 编排见 internal/httpapi/booksource_admin.go。
package booksource

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net"
	"net/url"
	"sort"
	"strings"
	"time"
)

// 书源检测状态常量。
const (
	CheckStatusOK           = "ok"
	CheckStatusInvalid      = "invalid"
	CheckStatusDNSFailed    = "dns_failed"
	CheckStatusSSLFailed    = "ssl_failed"
	CheckStatusConnectFail  = "connect_failed"
	CheckStatusJSSupported  = "js_unsupported"
	CheckStatusIncomplete   = "incomplete"
	CheckStatusPending      = "pending"
	CheckStatusCheckFailed  = "check_failed"
	CheckStatusUnknown      = "unknown"
	CheckMessageMaxLen      = 500
	CheckTagsMaxLen         = 500
	ImportCheckWorkersKey   = "BOOKSOURCE_IMPORT_CHECK_WORKERS"
	DefaultImportWorkers    = 20
	DefaultHTTPTimeout      = 20
	ProbeTimeoutCap         = 8
	SourceNameMaxLen        = 200
	SourceURLMaxLen         = 767
	SourceGroupMaxLen       = 200
	SourceCommentMaxLen     = 500
	ImportFailedNameMaxLen  = 40
	IncompleteMissingShown  = 4
	TestSampleContentMaxLen = 300
	TestSearchResultLimit   = 5
)

// adminJSMarkers 是判定「含 JS」的标记（小写）。
var adminJSMarkers = []string{"@js:", "<js>"}

// Source 是 book_sources 表的一行。
type Source struct {
	ID            int64
	Name          string
	URL           string
	Group         string
	SourceType    int64
	Enabled       bool
	Weight        int64
	Comment       string
	LastCheckTime string
	LastCheckOK   bool
	CheckStatus   string
	CheckMessage  string
	CheckTags     []string
	CreateTime    string
	UpdateTime    string
	Raw           map[string]any
}

// HasJS 复刻 booksource_admin._has_js。
func HasJS(value any) bool {
	text, ok := value.(string)
	if !ok {
		return false
	}
	low := strings.ToLower(text)
	for _, m := range adminJSMarkers {
		if strings.Contains(low, m) {
			return true
		}
	}
	return false
}

// HasUnsupportedJS 复刻 booksource_admin._has_unsupported_js。
func HasUnsupportedJS(value any) bool {
	text, ok := value.(string)
	if !ok {
		return false
	}
	low := strings.ToLower(text)
	return strings.Contains(low, "<js>") ||
		strings.Contains(low, "{{js.") ||
		strings.Contains(low, "{{java") ||
		strings.Contains(low, "java.ajax") ||
		strings.Contains(low, "java.post")
}

// RequiresJS 复刻 booksource_admin._requires_js。
//
// 判断书源的关键规则是否只能靠 JS 完成（无法用本引擎解析）。
func RequiresJS(raw map[string]any) bool {
	ruleSearch := adminMap(raw["ruleSearch"])
	ruleContent := adminMap(raw["ruleContent"])
	searchURL := adminString(raw["searchUrl"])

	searchJSBlocked := HasUnsupportedJS(searchURL) ||
		(HasJS(searchURL) && !strings.HasPrefix(strings.TrimSpace(searchURL), "@js:"))
	return searchJSBlocked ||
		HasJS(ruleSearch["bookList"]) ||
		HasUnsupportedJS(ruleContent["content"])
}

// iterRuleValues 复刻 booksource_admin._iter_rule_values。
func iterRuleValues(value any, out *[]string) {
	switch v := value.(type) {
	case string:
		*out = append(*out, v)
	case map[string]any:
		for _, item := range v {
			iterRuleValues(item, out)
		}
	case []any:
		for _, item := range v {
			iterRuleValues(item, out)
		}
	}
}

// sourceRuleValues 复刻 booksource_admin._source_rule_values。
func sourceRuleValues(raw map[string]any) []string {
	keys := []string{"searchUrl", "exploreUrl", "header", "loginUrl",
		"ruleSearch", "ruleBookInfo", "ruleToc", "ruleContent"}
	out := []string{}
	for _, key := range keys {
		iterRuleValues(raw[key], &out)
	}
	return out
}

// SourceTags 复刻 booksource_admin._source_tags。
func SourceTags(raw map[string]any) []string {
	tags := []string{}
	if raw == nil {
		return tags
	}
	if raw["bookSourceType"] != nil {
		if adminString(raw["bookSourceType"]) == "0" {
			tags = append(tags, "text")
		} else {
			tags = append(tags, "non-text")
		}
	}
	u := strings.TrimSpace(adminString(raw["bookSourceUrl"]))
	if strings.HasPrefix(strings.ToLower(u), "https://") {
		tags = append(tags, "https")
	} else if u != "" {
		tags = append(tags, "http")
	}

	ruleSearch := adminMap(raw["ruleSearch"])
	ruleBook := adminMap(raw["ruleBookInfo"])
	ruleToc := adminMap(raw["ruleToc"])
	ruleContent := adminMap(raw["ruleContent"])
	if adminTruthy(raw["searchUrl"]) && adminTruthy(ruleSearch["bookList"]) {
		tags = append(tags, "search")
	}
	if len(ruleBook) > 0 {
		tags = append(tags, "info")
	}
	if adminTruthy(ruleToc["chapterList"]) {
		tags = append(tags, "toc")
	}
	if adminTruthy(ruleContent["content"]) {
		tags = append(tags, "content")
	}
	if adminTruthy(raw["exploreUrl"]) {
		tags = append(tags, "explore")
	}

	values := sourceRuleValues(raw)
	for _, v := range values {
		trimmed := strings.TrimSpace(v)
		if strings.HasPrefix(trimmed, "$") || strings.HasPrefix(trimmed, "@json:") {
			tags = append(tags, "json")
			break
		}
	}
	for _, v := range values {
		if strings.Contains(v, "@css:") || strings.Contains(v, "class.") ||
			strings.Contains(v, "tag.") || strings.Contains(v, "id.") {
			tags = append(tags, "html")
			break
		}
	}
	if RequiresJS(raw) {
		tags = append(tags, "js-blocked")
	} else {
		for _, v := range values {
			if HasJS(v) {
				tags = append(tags, "js-runtime")
				break
			}
		}
	}
	return tags
}

// MissingRequiredFeatures 复刻 booksource_admin._missing_required_features。
func MissingRequiredFeatures(raw map[string]any) []string {
	ruleSearch := adminMap(raw["ruleSearch"])
	ruleBook := adminMap(raw["ruleBookInfo"])
	ruleToc := adminMap(raw["ruleToc"])
	ruleContent := adminMap(raw["ruleContent"])
	checks := []struct {
		name  string
		value any
	}{
		{"searchUrl", raw["searchUrl"]},
		{"ruleSearch.bookList", ruleSearch["bookList"]},
		{"ruleSearch.bookUrl", ruleSearch["bookUrl"]},
		{"ruleBookInfo.name", ruleBook["name"]},
		{"ruleToc.chapterList", ruleToc["chapterList"]},
		{"ruleToc.chapterUrl", ruleToc["chapterUrl"]},
		{"ruleContent.content", ruleContent["content"]},
	}
	missing := []string{}
	for _, c := range checks {
		if !adminTruthy(c.value) {
			missing = append(missing, c.name)
		}
	}
	return missing
}

// NormalizedProbeURL 复刻 booksource_admin._normalized_probe_url。
//
// 返回探测用的根地址与解析结果；URL 非法时返回空串与 nil。
func NormalizedProbeURL(sourceURL string) (string, *url.URL) {
	raw := strings.TrimSpace(sourceURL)
	if raw != "" && !strings.Contains(raw, "://") {
		raw = "http://" + raw
	}
	parsed, err := url.Parse(raw)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" {
		return "", nil
	}
	probe := &url.URL{Scheme: parsed.Scheme, Host: parsed.Host, Path: "/"}
	return probe.String(), parsed
}

// ProbeResult 是一次网络探测的结果。
type ProbeResult struct {
	OK      bool
	Status  string
	Message string
	Tags    []string
}

// ProbeSourceNetwork 复刻 booksource_admin._probe_source_network。
//
// DNS 解析与 HTTP 探测分离：DNS 失败单独归类，便于前端提示。
// resolve 与 fetch 由调用方注入，便于测试与复用既有 HTTP 客户端。
func ProbeSourceNetwork(raw map[string]any, timeout float64,
	resolve func(host string, port int) error,
	fetch func(probeURL string, timeout float64) (int, error)) ProbeResult {
	sourceURL := strings.TrimSpace(adminString(raw["bookSourceUrl"]))
	probeURL, parsed := NormalizedProbeURL(sourceURL)
	tags := []string{}
	if parsed == nil {
		return ProbeResult{OK: false, Status: CheckStatusInvalid, Message: "书源 URL 无效", Tags: tags}
	}

	host := parsed.Hostname()
	port := 80
	if parsed.Port() != "" {
		fmt.Sscanf(parsed.Port(), "%d", &port)
	} else if parsed.Scheme == "https" {
		port = 443
	}
	if resolve != nil {
		if err := resolve(host, port); err != nil {
			tags = append(tags, "dns-failed")
			return ProbeResult{OK: false, Status: CheckStatusDNSFailed,
				Message: "DNS 解析失败：" + err.Error(), Tags: tags}
		}
	}
	tags = append(tags, "dns-ok")

	if fetch == nil {
		return ProbeResult{OK: false, Status: CheckStatusConnectFail,
			Message: "连通性测试失败", Tags: append(tags, "connect-failed")}
	}
	status, err := fetch(probeURL, timeout)
	if err != nil {
		if isSSLError(err) {
			tags = append(tags, "ssl-failed")
			return ProbeResult{OK: false, Status: CheckStatusSSLFailed,
				Message: "SSL 校验失败：" + err.Error(), Tags: tags}
		}
		tags = append(tags, "connect-failed")
		return ProbeResult{OK: false, Status: CheckStatusConnectFail,
			Message: "连通性测试失败：" + err.Error(), Tags: tags}
	}
	tags = append(tags, "connect-ok", fmt.Sprintf("http-%d", status))
	ok := status < 500
	state := CheckStatusOK
	if !ok {
		state = CheckStatusConnectFail
	}
	return ProbeResult{OK: ok, Status: state,
		Message: fmt.Sprintf("HTTP 状态 %d", status), Tags: tags}
}

// isSSLError 判断错误是否来自 TLS 校验。
func isSSLError(err error) bool {
	if err == nil {
		return false
	}
	text := strings.ToLower(err.Error())
	return strings.Contains(text, "tls") || strings.Contains(text, "ssl") ||
		strings.Contains(text, "certificate")
}

// ValidateSourceRaw 复刻 booksource_admin.validate_source_raw。
func ValidateSourceRaw(raw map[string]any, timeout float64,
	resolve func(host string, port int) error,
	fetch func(probeURL string, timeout float64) (int, error)) ProbeResult {
	if raw == nil {
		return ProbeResult{OK: false, Status: CheckStatusInvalid, Message: "书源格式无效", Tags: []string{}}
	}
	tags := SourceTags(raw)
	if strings.TrimSpace(adminString(raw["bookSourceName"])) == "" ||
		strings.TrimSpace(adminString(raw["bookSourceUrl"])) == "" {
		return ProbeResult{OK: false, Status: CheckStatusInvalid,
			Message: "缺少 bookSourceName 或 bookSourceUrl", Tags: tags}
	}

	network := ProbeSourceNetwork(raw, timeout, resolve, fetch)
	tags = adminSortedUnique(append(tags, network.Tags...))

	if RequiresJS(raw) {
		return ProbeResult{OK: false, Status: CheckStatusJSSupported,
			Message: "关键规则依赖 JS，暂不支持", Tags: tags}
	}
	if missing := MissingRequiredFeatures(raw); len(missing) > 0 {
		shown := missing
		if len(shown) > IncompleteMissingShown {
			shown = shown[:IncompleteMissingShown]
		}
		return ProbeResult{OK: false, Status: CheckStatusIncomplete,
			Message: "缺少关键规则：" + strings.Join(shown, ", "), Tags: tags}
	}
	if !network.OK {
		status := network.Status
		if status == "" {
			status = CheckStatusConnectFail
		}
		message := network.Message
		if message == "" {
			message = "连通性测试失败"
		}
		return ProbeResult{OK: false, Status: status, Message: message, Tags: tags}
	}
	message := network.Message
	if message == "" {
		message = "检测通过"
	}
	return ProbeResult{OK: true, Status: CheckStatusOK, Message: message, Tags: tags}
}

// adminSortedUnique 去重并排序。
func adminSortedUnique(list []string) []string {
	seen := map[string]bool{}
	out := []string{}
	for _, item := range list {
		if !seen[item] {
			seen[item] = true
			out = append(out, item)
		}
	}
	sort.Strings(out)
	return out
}

// NormalizeSourceIDs 复刻 booksource_admin._normalize_source_ids。
func NormalizeSourceIDs(sourceIDs []any) []int64 {
	ids := []int64{}
	seen := map[int64]bool{}
	for _, raw := range sourceIDs {
		id := adminToInt64(raw)
		if id != 0 && !seen[id] {
			ids = append(ids, id)
			seen[id] = true
		}
	}
	return ids
}

// ApplyCheckResult 复刻 booksource_admin._apply_check_result。
func ApplyCheckResult(source *Source, check ProbeResult) {
	source.CheckStatus = check.Status
	if source.CheckStatus == "" {
		source.CheckStatus = CheckStatusUnknown
	}
	message := check.Message
	if len([]rune(message)) > CheckMessageMaxLen {
		message = string([]rune(message)[:CheckMessageMaxLen])
	}
	source.CheckMessage = message
	source.CheckTags = append([]string{}, check.Tags...)
	source.LastCheckTime = time.Now().Format("2006-01-02 15:04:05")
	source.LastCheckOK = check.OK
}

// ApplyPendingCheck 复刻 booksource_admin._apply_pending_check。
func ApplyPendingCheck(source *Source) {
	ApplyCheckResult(source, ProbeResult{
		OK: false, Status: CheckStatusPending,
		Message: "等待后台检测", Tags: []string{"check-pending"},
	})
	source.Enabled = true
}

// ExportSourceRaw 复刻 booksource_admin._export_source_raw。
//
// 返回可再次导入 Legado 的原始对象，并同步管理端当前状态。
func ExportSourceRaw(source *Source) map[string]any {
	raw := map[string]any{}
	for k, v := range source.Raw {
		raw[k] = v
	}
	raw["bookSourceName"] = source.Name
	raw["bookSourceUrl"] = source.URL
	raw["bookSourceGroup"] = source.Group
	raw["bookSourceType"] = source.SourceType
	raw["enabled"] = source.Enabled
	raw["weight"] = source.Weight
	return raw
}

// ---- 数据库读写 ----

// sourceColumns 是 book_sources 的完整列清单。
const sourceColumns = `id, name, url, COALESCE("group",''), COALESCE(source_type,0),
	COALESCE(enabled,1), COALESCE(weight,0), COALESCE(comment,''),
	COALESCE(last_check_time,''), COALESCE(last_check_ok,0),
	COALESCE(check_status,''), COALESCE(check_message,''), COALESCE(check_tags,'[]'),
	COALESCE(create_time,''), COALESCE(update_time,''), COALESCE(raw,'{}')`

// adminRowScanner 是 *sql.Row 与 *sql.Rows 的公共扫描面。
type adminRowScanner interface {
	Scan(dest ...any) error
}

// scanSource 按 sourceColumns 的顺序扫描一行。
func scanSource(row adminRowScanner) (*Source, error) {
	var (
		s          Source
		enabled    int64
		lastOK     int64
		checkTags  string
		raw        string
		sourceType int64
		weight     int64
	)
	err := row.Scan(&s.ID, &s.Name, &s.URL, &s.Group, &sourceType, &enabled, &weight,
		&s.Comment, &s.LastCheckTime, &lastOK, &s.CheckStatus, &s.CheckMessage,
		&checkTags, &s.CreateTime, &s.UpdateTime, &raw)
	if err != nil {
		return nil, err
	}
	s.SourceType = sourceType
	s.Enabled = enabled != 0
	s.Weight = weight
	s.LastCheckOK = lastOK != 0
	s.CheckTags = adminDecodeList(checkTags)
	s.Raw = adminDecodeMap(raw)
	return &s, nil
}

// GetSourceByID 按 id 取书源；不存在返回 nil。
func GetSourceByID(db *sql.DB, id int64) (*Source, error) {
	row := db.QueryRow(`SELECT `+sourceColumns+` FROM book_sources WHERE id = ?`, id)
	s, err := scanSource(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return s, err
}

// GetSourceByURL 按 url 取书源；不存在返回 nil。
func GetSourceByURL(db *sql.DB, sourceURL string) (*Source, error) {
	row := db.QueryRow(`SELECT `+sourceColumns+` FROM book_sources WHERE url = ? LIMIT 1`, sourceURL)
	s, err := scanSource(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return s, err
}

// ListSources 按权重降序、id 升序返回全部书源。
func ListSources(db *sql.DB) ([]*Source, error) {
	rows, err := db.Query(`SELECT ` + sourceColumns + ` FROM book_sources
		ORDER BY COALESCE(weight,0) DESC, id ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*Source{}
	for rows.Next() {
		s, err := scanSource(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

// ListSourceIDs 按 id 升序返回全部书源 id。
func ListSourceIDs(db *sql.DB) ([]int64, error) {
	rows, err := db.Query(`SELECT id FROM book_sources ORDER BY id ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []int64{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	return out, rows.Err()
}

// ListSourceGroups 返回去重排序后的分组名（忽略空值）。
func ListSourceGroups(db *sql.DB) ([]string, error) {
	rows, err := db.Query(`SELECT DISTINCT COALESCE("group",'') FROM book_sources`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	seen := map[string]bool{}
	out := []string{}
	for rows.Next() {
		var g string
		if err := rows.Scan(&g); err != nil {
			return nil, err
		}
		if g != "" && !seen[g] {
			seen[g] = true
			out = append(out, g)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	sort.Strings(out)
	return out, nil
}

// SourceSummary 复刻 BookSourceModel.to_summary_dict。
func (s *Source) SourceSummary() map[string]any {
	return map[string]any{
		"id":              s.ID,
		"name":            s.Name,
		"url":             s.URL,
		"group":           s.Group,
		"source_type":     s.SourceType,
		"enabled":         s.Enabled,
		"weight":          s.Weight,
		"comment":         s.Comment,
		"last_check_time": s.LastCheckTime,
		"last_check_ok":   s.LastCheckOK,
		"check_status":    s.CheckStatus,
		"check_message":   s.CheckMessage,
		"check_tags":      s.CheckTags,
		"create_time":     s.CreateTime,
		"update_time":     s.UpdateTime,
	}
}

// ApplyRaw 复刻 BookSourceModel.apply_raw：用 Legado 原始对象刷新字段。
func (s *Source) ApplyRaw(raw map[string]any) {
	s.Raw = raw
	if v := strings.TrimSpace(adminString(raw["bookSourceName"])); v != "" {
		s.Name = v
	}
	if v := strings.TrimSpace(adminString(raw["bookSourceUrl"])); v != "" {
		s.URL = v
	}
	s.Group = strings.TrimSpace(adminString(raw["bookSourceGroup"]))
	if raw["bookSourceType"] != nil {
		s.SourceType = adminToInt64(raw["bookSourceType"])
	}
	if raw["bookSourceComment"] != nil {
		s.Comment = adminString(raw["bookSourceComment"])
	}
	if raw["enabled"] != nil {
		s.Enabled = adminTruthy(raw["enabled"])
	}
	if raw["weight"] != nil {
		s.Weight = adminToInt64(raw["weight"])
	}
}

// NewSourceFromRaw 复刻 BookSourceModel(raw) 的构造语义。
func NewSourceFromRaw(raw map[string]any) *Source {
	s := &Source{Raw: raw, Enabled: true}
	s.ApplyRaw(raw)
	return s
}

// InsertSource 插入一条书源并回填 id。
func InsertSource(db *sql.DB, s *Source) error {
	now := time.Now().Format("2006-01-02 15:04:05")
	res, err := db.Exec(`INSERT INTO book_sources
		(name, url, "group", source_type, enabled, weight, comment,
		 last_check_time, last_check_ok, check_status, check_message, check_tags,
		 create_time, update_time, raw)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		s.Name, s.URL, s.Group, s.SourceType, s.Enabled, s.Weight, s.Comment,
		s.LastCheckTime, s.LastCheckOK, s.CheckStatus, s.CheckMessage,
		adminEncodeList(s.CheckTags), now, now, adminEncodeMap(s.Raw))
	if err != nil {
		return err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return err
	}
	s.ID = id
	s.CreateTime = now
	s.UpdateTime = now
	return nil
}

// UpdateSource 按 id 写回书源的全部可变字段。
func UpdateSource(db *sql.DB, s *Source) error {
	now := time.Now().Format("2006-01-02 15:04:05")
	_, err := db.Exec(`UPDATE book_sources SET
		name=?, url=?, "group"=?, source_type=?, enabled=?, weight=?, comment=?,
		last_check_time=?, last_check_ok=?, check_status=?, check_message=?,
		check_tags=?, update_time=?, raw=?
		WHERE id=?`,
		s.Name, s.URL, s.Group, s.SourceType, s.Enabled, s.Weight, s.Comment,
		s.LastCheckTime, s.LastCheckOK, s.CheckStatus, s.CheckMessage,
		adminEncodeList(s.CheckTags), now, adminEncodeMap(s.Raw), s.ID)
	if err != nil {
		return err
	}
	s.UpdateTime = now
	return nil
}

// DeleteSources 按 id 批量删除，返回删除行数。
func DeleteSources(db *sql.DB, ids []int64) (int64, error) {
	if len(ids) == 0 {
		return 0, nil
	}
	parts := make([]string, len(ids))
	args := make([]any, len(ids))
	for i, id := range ids {
		parts[i] = "?"
		args[i] = id
	}
	res, err := db.Exec(`DELETE FROM book_sources WHERE id IN (`+strings.Join(parts, ",")+`)`, args...)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

// SetSourcesEnabled 按 id 批量设置启用状态，返回更新行数。
func SetSourcesEnabled(db *sql.DB, ids []int64, enabled bool) (int64, error) {
	if len(ids) == 0 {
		return 0, nil
	}
	parts := make([]string, len(ids))
	args := []any{enabled, time.Now().Format("2006-01-02 15:04:05")}
	for i, id := range ids {
		parts[i] = "?"
		args = append(args, id)
	}
	res, err := db.Exec(`UPDATE book_sources SET enabled = ?, update_time = ?
		WHERE id IN (`+strings.Join(parts, ",")+`)`, args...)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

// ---- 导入 ----

// ImportResult 是批量导入的统计结果。
type ImportResult struct {
	Added    int
	Updated  int
	Skipped  int
	Disabled int
	Failed   []map[string]any
	CheckIDs []int64
}

// ImportSources 复刻 booksource_admin.import_sources。
//
// 同 URL 书源始终跳过，避免导入订阅覆盖本地已维护的书源。
func ImportSources(db *sql.DB, data any) (*ImportResult, error) {
	list, ok := data.([]any)
	if !ok {
		if m, isMap := data.(map[string]any); isMap {
			list = []any{m}
		} else {
			return nil, fmt.Errorf("书源格式应为 JSON 数组或对象")
		}
	}

	type candidate struct {
		raw map[string]any
	}
	candidates := []candidate{}
	failed := []map[string]any{}
	for _, item := range list {
		raw, isMap := item.(map[string]any)
		if !isMap {
			name := adminString(item)
			if len([]rune(name)) > ImportFailedNameMaxLen {
				name = string([]rune(name)[:ImportFailedNameMaxLen])
			}
			failed = append(failed, map[string]any{"name": name, "reason": "invalid"})
			continue
		}
		name := strings.TrimSpace(adminString(raw["bookSourceName"]))
		u := strings.TrimSpace(adminString(raw["bookSourceUrl"]))
		if name == "" || u == "" {
			label := name
			if label == "" {
				label = u
			}
			if label == "" {
				label = "unknown"
			}
			failed = append(failed, map[string]any{"name": label, "reason": "missing_fields"})
			continue
		}
		candidates = append(candidates, candidate{raw: raw})
	}

	// 同 URL 书源始终跳过（overwrite 参数仅为旧接口兼容而保留）。
	result := &ImportResult{Failed: failed}
	existingByURL := map[string]*Source{}
	for _, c := range candidates {
		u := strings.TrimSpace(adminString(c.raw["bookSourceUrl"]))
		if _, seen := existingByURL[u]; seen {
			continue
		}
		existing, err := GetSourceByURL(db, u)
		if err != nil {
			return nil, err
		}
		if existing != nil {
			existingByURL[u] = existing
		}
	}

	touched := []*Source{}
	for _, c := range candidates {
		u := strings.TrimSpace(adminString(c.raw["bookSourceUrl"]))
		if existing := existingByURL[u]; existing != nil {
			result.Skipped++
			continue
		}
		source := NewSourceFromRaw(c.raw)
		ApplyPendingCheck(source)
		if err := InsertSource(db, source); err != nil {
			return nil, err
		}
		existingByURL[u] = source
		result.Added++
		touched = append(touched, source)
	}

	seen := map[int64]bool{}
	for _, source := range touched {
		if source.ID != 0 && !seen[source.ID] {
			seen[source.ID] = true
			result.CheckIDs = append(result.CheckIDs, source.ID)
		}
	}
	return result, nil
}

// ---- 小工具 ----

// adminString 复刻 Python 的 str(x or "")。
func adminString(v any) string {
	switch t := v.(type) {
	case nil:
		return ""
	case string:
		return t
	case bool:
		if t {
			return "True"
		}
		return "False"
	case float64:
		if t == float64(int64(t)) {
			return fmt.Sprintf("%d", int64(t))
		}
		return fmt.Sprintf("%v", t)
	case int:
		return fmt.Sprintf("%d", t)
	case int64:
		return fmt.Sprintf("%d", t)
	}
	return fmt.Sprintf("%v", v)
}

// adminTruthy 复刻 Python 的真值判断。
func adminTruthy(v any) bool {
	switch t := v.(type) {
	case nil:
		return false
	case bool:
		return t
	case string:
		return t != ""
	case float64:
		return t != 0
	case int:
		return t != 0
	case int64:
		return t != 0
	case []any:
		return len(t) > 0
	case map[string]any:
		return len(t) > 0
	}
	return true
}

// adminToInt64 把任意值转成 int64；不可转换时返回 0。
func adminToInt64(v any) int64 {
	switch t := v.(type) {
	case float64:
		return int64(t)
	case int:
		return int64(t)
	case int64:
		return t
	case json.Number:
		if n, err := t.Int64(); err == nil {
			return n
		}
	case string:
		var n int64
		if _, err := fmt.Sscanf(strings.TrimSpace(t), "%d", &n); err == nil {
			return n
		}
	}
	return 0
}

// adminMap 把任意值规整为 map（nil → 空 map）。
func adminMap(v any) map[string]any {
	if m, ok := v.(map[string]any); ok {
		return m
	}
	return map[string]any{}
}

// adminEncodeMap 把 map 序列化成 JSON 文本。
func adminEncodeMap(m map[string]any) string {
	if m == nil {
		return "{}"
	}
	raw, err := json.Marshal(m)
	if err != nil {
		return "{}"
	}
	return string(raw)
}

// adminDecodeMap 把 JSON 文本解成 map；空串或非法内容返回空 map。
func adminDecodeMap(text string) map[string]any {
	text = strings.TrimSpace(text)
	if text == "" || text == "null" {
		return map[string]any{}
	}
	var out map[string]any
	if err := json.Unmarshal([]byte(text), &out); err != nil {
		return map[string]any{}
	}
	return out
}

// adminEncodeList 把字符串列表序列化成 JSON 文本。
func adminEncodeList(list []string) string {
	if list == nil {
		return "[]"
	}
	raw, err := json.Marshal(list)
	if err != nil {
		return "[]"
	}
	return string(raw)
}

// adminDecodeList 把 JSON 文本解成字符串列表。
func adminDecodeList(text string) []string {
	text = strings.TrimSpace(text)
	if text == "" || text == "null" {
		return []string{}
	}
	var out []string
	if err := json.Unmarshal([]byte(text), &out); err != nil {
		return []string{}
	}
	return out
}

// ResolveHost 是默认的 DNS 解析实现。
func ResolveHost(host string, port int) error {
	_, err := net.LookupHost(host)
	return err
}
