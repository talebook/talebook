// 本文件实现 webserver/handlers/booksource_admin.py 的 10 条路由。
//
// 书源管理（管理员）：列表 / 导出 / 导入 / 种子 / 开关 / 检测 / 测试 / 单条增删改。
// 领域层见 internal/booksource/admin.go。
package httpapi

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"talebook/booksvr/internal/booksource"
	"talebook/booksvr/internal/safehttp"
)

// 书源管理错误码。
const (
	ErrBookSourceParams   = "params.error"
	ErrBookSourceNotFound = "params.not_found"
	ErrBookSourceExist    = "params.exist"
	ErrBookSourceJSON     = "params.json"
	ErrBookSourceFetch    = "import.fetch_failed"
	ErrBookSourceSeed     = "seed.load_failed"
	ErrBookSourceTestFail = "test.failed"
)

// BookSourceAdminConfig 是书源管理 handler 的依赖。
type BookSourceAdminConfig struct {
	// Settings 是 Talebook 配置（CONF）。
	Settings map[string]any
	// SeedFile 是内置种子书源文件路径；为空时种子接口返回加载失败。
	SeedFile string
	// Resolve 是 DNS 解析实现；为 nil 时用默认实现。
	Resolve func(host string, port int) error
	// Fetch 是连通性探测实现；为 nil 时用默认 HTTP 客户端。
	Fetch func(ctx context.Context, probeURL string, timeout float64) (int, error)
	// FetchJSON 拉取导入用的 JSON 文本；为 nil 时用默认 HTTP 客户端。
	FetchJSON func(ctx context.Context, url string, timeout float64) ([]byte, error)
	// Checker 是检测任务服务；为 nil 时用全局单例。
	Checker *BookSourceChecker
}

// engineConfig 复刻 booksource_admin._engine_config。
func (cfg BookSourceAdminConfig) engineConfig() booksource.EngineConfig {
	engine := booksource.DefaultEngineConfig()
	if v, ok := cfg.Settings["BOOKSOURCE_HTTP_TIMEOUT"]; ok && v != nil {
		engine.HTTPTimeout = adminFloat(v, engine.HTTPTimeout)
	}
	if v, ok := cfg.Settings["BOOKSOURCE_MAX_TOC_PAGES"]; ok && v != nil {
		engine.MaxTocPages = int(adminFloat(v, float64(engine.MaxTocPages)))
	}
	if v, ok := cfg.Settings["BOOKSOURCE_MAX_CONTENT_PAGES"]; ok && v != nil {
		engine.MaxContentPages = int(adminFloat(v, float64(engine.MaxContentPages)))
	}
	if v, ok := cfg.Settings["BOOKSOURCE_AD_PATTERNS"]; ok && v != nil {
		if list, isList := v.([]any); isList {
			patterns := make([]string, 0, len(list))
			for _, item := range list {
				patterns = append(patterns, pluginStr(item))
			}
			engine.ADPatterns = patterns
		}
	}
	if v, ok := cfg.Settings["BOOKSOURCE_CLEAN_ENABLED"]; ok && v != nil {
		engine.CleanEnabled = pluginBool(v)
	}
	return engine
}

// httpTimeout 返回书源 HTTP 超时（秒）。
func (cfg BookSourceAdminConfig) httpTimeout() float64 {
	if v, ok := cfg.Settings["BOOKSOURCE_HTTP_TIMEOUT"]; ok && v != nil {
		return adminFloat(v, booksource.DefaultHTTPTimeout)
	}
	return booksource.DefaultHTTPTimeout
}

// probeTimeout 复刻 `min(8, CONF.get("BOOKSOURCE_HTTP_TIMEOUT", 20))`。
func (cfg BookSourceAdminConfig) probeTimeout() float64 {
	timeout := cfg.httpTimeout()
	if timeout > booksource.ProbeTimeoutCap {
		return booksource.ProbeTimeoutCap
	}
	return timeout
}

// checker 返回检测任务服务。
func (cfg BookSourceAdminConfig) checker() *BookSourceChecker {
	if cfg.Checker != nil {
		return cfg.Checker
	}
	return DefaultBookSourceChecker()
}

// resolve 返回 DNS 解析实现。
func (cfg BookSourceAdminConfig) resolve() func(string, int) error {
	if cfg.Resolve != nil {
		return cfg.Resolve
	}
	return booksource.ResolveHost
}

// fetch 返回连通性探测实现。
func (cfg BookSourceAdminConfig) fetch() func(string, float64) (int, error) {
	if cfg.Fetch != nil {
		injected := cfg.Fetch
		return func(probeURL string, timeout float64) (int, error) {
			return injected(context.Background(), probeURL, timeout)
		}
	}
	return func(probeURL string, timeout float64) (int, error) {
		client := &safehttp.SafeHttpClient{
			MaxBytes:     1024 * 1024,
			MaxRedirects: 5,
			PluginKey:    "talebook.booksource.probe",
		}
		resp, err := client.Request(context.Background(), http.MethodGet, probeURL,
			safehttp.RequestOptions{
				Timeout:    time.Duration(timeout * float64(time.Second)),
				HasTimeout: true,
			})
		if err != nil {
			return 0, err
		}
		defer resp.Body.Close()
		return resp.StatusCode, nil
	}
}

// fetchJSON 拉取导入用的 JSON 文本。
func (cfg BookSourceAdminConfig) fetchJSON() func(string, float64) ([]byte, error) {
	if cfg.FetchJSON != nil {
		injected := cfg.FetchJSON
		return func(rawURL string, timeout float64) ([]byte, error) {
			return injected(context.Background(), rawURL, timeout)
		}
	}
	return func(rawURL string, timeout float64) ([]byte, error) {
		client := &safehttp.SafeHttpClient{
			MaxBytes:     64 * 1024 * 1024,
			MaxRedirects: 5,
			PluginKey:    "talebook.booksource.import",
		}
		resp, err := client.Request(context.Background(), http.MethodGet, rawURL,
			safehttp.RequestOptions{
				Timeout:    time.Duration(timeout * float64(time.Second)),
				HasTimeout: true,
			})
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()
		if resp.StatusCode >= 400 {
			return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
		}
		return io.ReadAll(io.LimitReader(resp.Body, 64*1024*1024))
	}
}

// validateSourceRaw 用注入的探测实现校验书源。
func (cfg BookSourceAdminConfig) validateSourceRaw(raw map[string]any) booksource.ProbeResult {
	return booksource.ValidateSourceRaw(raw, cfg.probeTimeout(), cfg.resolve(), cfg.fetch())
}

// ---- BookSourceChecker：检测任务服务 ----

// BookSourceChecker 复刻 booksource_admin.BookSourceCheckService。
//
// 进程内单例：同一时刻只跑一批，运行中到达的请求进入 pending 队列，
// 当前批结束后自动接续。
type BookSourceChecker struct {
	mu         sync.Mutex
	running    bool
	pendingIDs map[int64]bool
	total      int
	done       int
	lastStart  string
	lastEnd    string
	lastError  string

	// runBatch 执行一批检测；由装配方注入（需要 DB 与配置）。
	runBatch func(ids []int64, markDone func())
	// now 用于注入时钟。
	now func() time.Time
}

// NewBookSourceChecker 构造检测服务。
func NewBookSourceChecker(runBatch func(ids []int64, markDone func())) *BookSourceChecker {
	return &BookSourceChecker{
		pendingIDs: map[int64]bool{},
		runBatch:   runBatch,
		now:        time.Now,
	}
}

// DefaultBookSourceChecker 返回全局单例。
func DefaultBookSourceChecker() *BookSourceChecker {
	checkerOnce.Do(func() { defaultChecker = NewBookSourceChecker(nil) })
	return defaultChecker
}

var (
	checkerOnce    sync.Once
	defaultChecker *BookSourceChecker
)

// SetRunBatch 注入批次执行器（装配期调用）。
func (c *BookSourceChecker) SetRunBatch(runBatch func(ids []int64, markDone func())) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.runBatch = runBatch
}

// Status 复刻 BookSourceCheckService.status。
func (c *BookSourceChecker) Status() map[string]any {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.snapshotLocked()
}

// snapshotLocked 在持锁状态下生成状态快照。
func (c *BookSourceChecker) snapshotLocked() map[string]any {
	var lastStart, lastEnd any
	if c.lastStart != "" {
		lastStart = c.lastStart
	}
	if c.lastEnd != "" {
		lastEnd = c.lastEnd
	}
	return map[string]any{
		"running":    c.running,
		"total":      c.total,
		"done":       c.done,
		"pending":    len(c.pendingIDs),
		"last_start": lastStart,
		"last_end":   lastEnd,
		"last_error": c.lastError,
	}
}

// Enqueue 复刻 BookSourceCheckService.enqueue。
//
// 返回 (是否新起一批, 状态快照)。
func (c *BookSourceChecker) Enqueue(sourceIDs []int64) (bool, map[string]any) {
	ids := booksource.NormalizeSourceIDs(int64sToAny(sourceIDs))
	if len(ids) == 0 {
		return false, c.Status()
	}

	c.mu.Lock()
	if c.running {
		for _, id := range ids {
			c.pendingIDs[id] = true
		}
		status := c.snapshotLocked()
		c.mu.Unlock()
		return false, status
	}
	c.running = true
	c.pendingIDs = map[int64]bool{}
	c.total = len(ids)
	c.done = 0
	c.lastStart = c.now().Format("2006-01-02 15:04:05")
	c.lastEnd = ""
	c.lastError = ""
	status := c.snapshotLocked()
	c.mu.Unlock()

	c.checkSources(ids)
	return true, status
}

// markDone 复刻 BookSourceCheckService._mark_done。
func (c *BookSourceChecker) markDone() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.done++
}

// checkSources 复刻 BookSourceCheckService.check_sources。
//
// 跑完当前批后，若期间有新请求进入 pending，则接续下一批。
func (c *BookSourceChecker) checkSources(sourceIDs []int64) {
	var nextIDs []int64
	func() {
		defer func() {
			if r := recover(); r != nil {
				c.mu.Lock()
				c.lastError = fmt.Sprintf("%v", r)
				c.mu.Unlock()
			}
		}()
		c.mu.Lock()
		runBatch := c.runBatch
		c.mu.Unlock()
		if runBatch != nil {
			runBatch(sourceIDs, c.markDone)
		}
	}()

	c.mu.Lock()
	if len(c.pendingIDs) > 0 {
		nextIDs = make([]int64, 0, len(c.pendingIDs))
		for id := range c.pendingIDs {
			nextIDs = append(nextIDs, id)
		}
		sortInt64Asc(nextIDs)
		c.pendingIDs = map[int64]bool{}
		c.total = len(nextIDs)
		c.done = 0
		c.lastStart = c.now().Format("2006-01-02 15:04:05")
		c.lastEnd = ""
		c.lastError = ""
	} else {
		c.running = false
		c.lastEnd = c.now().Format("2006-01-02 15:04:05")
	}
	c.mu.Unlock()

	if len(nextIDs) > 0 {
		c.checkSources(nextIDs)
	}
}

// int64sToAny 把 []int64 转成 []any 供 NormalizeSourceIDs 消费。
func int64sToAny(ids []int64) []any {
	out := make([]any, 0, len(ids))
	for _, id := range ids {
		out = append(out, id)
	}
	return out
}

// sortInt64Asc 升序排序。
func sortInt64Asc(list []int64) {
	for i := 1; i < len(list); i++ {
		for j := i; j > 0 && list[j] < list[j-1]; j-- {
			list[j], list[j-1] = list[j-1], list[j]
		}
	}
}

// ---- 各 handler ----

// BookSourceListHandler 对应 BookSourceList（@js @is_admin）。
func BookSourceListHandler(cfg BookSourceAdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		enabled := ctx.Query("enabled")
		group := ctx.Query("group")
		keyword := ctx.Query("q")

		where := []string{}
		args := []any{}
		if enabled == "1" || enabled == "true" || enabled == "0" || enabled == "false" {
			where = append(where, "COALESCE(enabled,1) = ?")
			if enabled == "1" || enabled == "true" {
				args = append(args, 1)
			} else {
				args = append(args, 0)
			}
		}
		if group != "" {
			where = append(where, `COALESCE("group",'') = ?`)
			args = append(args, group)
		}
		if keyword != "" {
			where = append(where, "name LIKE ?")
			args = append(args, "%"+keyword+"%")
		}
		clause := ""
		if len(where) > 0 {
			clause = " WHERE " + strings.Join(where, " AND ")
		}

		var total int
		if err := ctx.DB.QueryRow(`SELECT COUNT(*) FROM book_sources`+clause, args...).Scan(&total); err != nil {
			return nil, err
		}

		page := intArg(ctx.Query("page"), 1)
		if page < 1 {
			page = 1
		}
		size := intArg(ctx.Query("size"), 50)
		if size < 1 {
			size = 1
		}
		if size > 200 {
			size = 200
		}

		rows, err := ctx.DB.Query(`SELECT `+bookSourceColumns+` FROM book_sources`+clause+
			` ORDER BY COALESCE(weight,0) DESC, id ASC LIMIT ? OFFSET ?`,
			append(args, size, (page-1)*size)...)
		if err != nil {
			return nil, err
		}
		defer rows.Close()
		items := []map[string]any{}
		for rows.Next() {
			s, err := scanBookSource(rows)
			if err != nil {
				return nil, err
			}
			items = append(items, s.SourceSummary())
		}
		if err := rows.Err(); err != nil {
			return nil, err
		}

		groups, err := booksource.ListSourceGroups(ctx.DB)
		if err != nil {
			return nil, err
		}
		return map[string]any{
			"err":        "ok",
			"items":      items,
			"count":      total,
			"page":       page,
			"size":       size,
			"groups":     groups,
			"check_task": cfg.checker().Status(),
		}, nil
	}
}

// bookSourceColumns 与 booksource.sourceColumns 保持一致。
const bookSourceColumns = `id, name, url, COALESCE("group",''), COALESCE(source_type,0),
	COALESCE(enabled,1), COALESCE(weight,0), COALESCE(comment,''),
	COALESCE(last_check_time,''), COALESCE(last_check_ok,0),
	COALESCE(check_status,''), COALESCE(check_message,''), COALESCE(check_tags,'[]'),
	COALESCE(create_time,''), COALESCE(update_time,''), COALESCE(raw,'{}')`

// scanBookSource 按 bookSourceColumns 的顺序扫描一行。
func scanBookSource(row interface{ Scan(...any) error }) (*booksource.Source, error) {
	var (
		s          booksource.Source
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
	s.CheckTags = adminStringList(checkTags)
	s.Raw = decodeJSONMapOrEmpty(raw)
	return &s, nil
}

// BookSourceExportHandler 对应 BookSourceExport（@js @is_admin）。
func BookSourceExportHandler(cfg BookSourceAdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		sources, err := booksource.ListSources(ctx.DB)
		if err != nil {
			return nil, err
		}
		out := make([]map[string]any, 0, len(sources))
		for _, s := range sources {
			out = append(out, booksource.ExportSourceRaw(s))
		}
		return map[string]any{"err": "ok", "sources": out}, nil
	}
}

// BookSourceImportHandler 对应 BookSourceImport（@js @is_admin）。
func BookSourceImportHandler(cfg BookSourceAdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		req, err := pluginBody(ctx)
		if err != nil {
			return map[string]any{"err": ErrBookSourceJSON, "msg": err.Error()}, nil
		}
		rawText := pluginStr(req["json"])
		url := pluginStr(req["url"])

		var data any
		switch {
		case url != "":
			body, err := cfg.fetchJSON()(url, cfg.httpTimeout())
			if err != nil {
				return map[string]any{"err": ErrBookSourceFetch,
					"msg": "拉取书源 URL 失败：" + err.Error()}, nil
			}
			if err := json.Unmarshal(body, &data); err != nil {
				return map[string]any{"err": ErrBookSourceFetch,
					"msg": "拉取书源 URL 失败：" + err.Error()}, nil
			}
		case rawText != "":
			if err := json.Unmarshal([]byte(rawText), &data); err != nil {
				return map[string]any{"err": ErrBookSourceJSON,
					"msg": "书源 JSON 解析失败：" + err.Error()}, nil
			}
		default:
			return map[string]any{"err": ErrBookSourceParams, "msg": "请提供 json 或 url"}, nil
		}
		return bookSourceImportResponse(ctx, cfg, data)
	}
}

// BookSourceSeedHandler 对应 BookSourceSeed（@js @is_admin）。
func BookSourceSeedHandler(cfg BookSourceAdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if cfg.SeedFile == "" {
			return map[string]any{"err": ErrBookSourceSeed, "msg": "加载内置书源失败：未配置种子文件"}, nil
		}
		body, err := os.ReadFile(cfg.SeedFile)
		if err != nil {
			return map[string]any{"err": ErrBookSourceSeed,
				"msg": "加载内置书源失败：" + err.Error()}, nil
		}
		var data any
		if err := json.Unmarshal(body, &data); err != nil {
			return map[string]any{"err": ErrBookSourceSeed,
				"msg": "加载内置书源失败：" + err.Error()}, nil
		}
		return bookSourceImportResponse(ctx, cfg, data)
	}
}

// bookSourceImportResponse 执行导入并组装响应，同时调度后台检测。
func bookSourceImportResponse(ctx *Context, cfg BookSourceAdminConfig, data any) (map[string]any, error) {
	result, err := booksource.ImportSources(ctx.DB, data)
	if err != nil {
		return map[string]any{"err": ErrBookSourceParams, "msg": err.Error()}, nil
	}
	checkTask := ""
	if len(result.CheckIDs) > 0 {
		cfg.checker().Enqueue(result.CheckIDs)
		checkTask = "queued"
	}
	failed := result.Failed
	if failed == nil {
		failed = []map[string]any{}
	}
	return map[string]any{
		"err":        "ok",
		"added":      result.Added,
		"updated":    result.Updated,
		"skipped":    result.Skipped,
		"disabled":   result.Disabled,
		"failed":     failed,
		"checking":   len(result.CheckIDs),
		"check_task": checkTask,
	}, nil
}

// BookSourceToggleHandler 对应 BookSourceToggle（@js @is_admin）。
func BookSourceToggleHandler(cfg BookSourceAdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		req, err := pluginBody(ctx)
		if err != nil {
			return map[string]any{"err": ErrBookSourceParams, "msg": err.Error()}, nil
		}
		ids := bookSourceIDsFromRequest(req)
		if len(ids) == 0 {
			return map[string]any{"err": ErrBookSourceParams, "msg": "需要提供 id 或 ids"}, nil
		}

		if raw, present := req["enabled"]; present {
			enabled := pluginBool(raw)
			updated, err := booksource.SetSourcesEnabled(ctx.DB, ids, enabled)
			if err != nil {
				return nil, err
			}
			return map[string]any{"err": "ok", "updated": updated, "enabled": enabled}, nil
		}

		// 未指定 enabled：仅单个时按当前状态取反（兼容旧的单行开关）。
		if len(ids) != 1 {
			return map[string]any{"err": ErrBookSourceParams, "msg": "批量操作需指定 enabled"}, nil
		}
		source, err := booksource.GetSourceByID(ctx.DB, ids[0])
		if err != nil {
			return nil, err
		}
		if source == nil {
			return map[string]any{"err": ErrBookSourceNotFound, "msg": "未找到该书源"}, nil
		}
		source.Enabled = !source.Enabled
		if err := booksource.UpdateSource(ctx.DB, source); err != nil {
			return nil, err
		}
		return map[string]any{"err": "ok", "enabled": source.Enabled}, nil
	}
}

// bookSourceIDsFromRequest 复刻 `ids` / `id` 的取值与整型化。
func bookSourceIDsFromRequest(req map[string]any) []int64 {
	raw := pluginList(req["ids"])
	if len(raw) == 0 {
		if v, present := req["id"]; present && v != nil {
			raw = []any{v}
		}
	}
	return booksource.NormalizeSourceIDs(raw)
}

// BookSourceCheckStatusHandler 对应 BookSourceCheckStatus（@js @is_admin）。
func BookSourceCheckStatusHandler(cfg BookSourceAdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		out := map[string]any{"err": "ok"}
		for k, v := range cfg.checker().Status() {
			out[k] = v
		}
		return out, nil
	}
}

// BookSourceCheckAllHandler 对应 BookSourceCheckAll（@js @is_admin）。
//
// BookSourceCleanInvalid 继承自它：兼容旧接口，只触发检测，不再删除书源。
func BookSourceCheckAllHandler(cfg BookSourceAdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		ids, err := booksource.ListSourceIDs(ctx.DB)
		if err != nil {
			return nil, err
		}
		started, status := cfg.checker().Enqueue(ids)
		out := map[string]any{
			"err":      "ok",
			"checked":  len(ids),
			"checking": len(ids),
			"started":  started,
		}
		for k, v := range status {
			out[k] = v
		}
		return out, nil
	}
}

// BookSourceCRUDHandler 对应 BookSourceCRUD（@js @is_admin）。
//
// POST 新增 / PUT 修改 / DELETE 删除。
func BookSourceCRUDHandler(cfg BookSourceAdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		switch ctx.Request.Method {
		case http.MethodPost:
			return bookSourceCreate(ctx)
		case http.MethodPut:
			return bookSourceUpdate(ctx)
		case http.MethodDelete:
			return bookSourceDelete(ctx)
		}
		return map[string]any{"err": ErrBookSourceParams, "msg": "不支持的方法"}, nil
	}
}

// bookSourceCreate 复刻 BookSourceCRUD.post。
func bookSourceCreate(ctx *Context) (map[string]any, error) {
	req, err := pluginBody(ctx)
	if err != nil {
		return map[string]any{"err": ErrBookSourceParams, "msg": err.Error()}, nil
	}
	raw, errResp := bookSourceRawFromRequest(req)
	if errResp != nil {
		return errResp, nil
	}
	if !pluginBool(raw["bookSourceUrl"]) || !pluginBool(raw["bookSourceName"]) {
		return map[string]any{"err": ErrBookSourceParams,
			"msg": "书源缺少 bookSourceUrl 或 bookSourceName"}, nil
	}

	u := strings.TrimSpace(pluginStr(raw["bookSourceUrl"]))
	existing, err := booksource.GetSourceByURL(ctx.DB, u)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return map[string]any{"err": ErrBookSourceExist, "msg": "同 URL 的书源已存在"}, nil
	}
	source := booksource.NewSourceFromRaw(raw)
	if err := booksource.InsertSource(ctx.DB, source); err != nil {
		return nil, err
	}
	return map[string]any{"err": "ok", "id": source.ID}, nil
}

// bookSourceUpdate 复刻 BookSourceCRUD.put。
func bookSourceUpdate(ctx *Context) (map[string]any, error) {
	req, err := pluginBody(ctx)
	if err != nil {
		return map[string]any{"err": ErrBookSourceParams, "msg": err.Error()}, nil
	}
	sourceID := pluginInt(req["id"], 0)
	source, err := booksource.GetSourceByID(ctx.DB, sourceID)
	if err != nil {
		return nil, err
	}
	if source == nil {
		return map[string]any{"err": ErrBookSourceNotFound, "msg": "未找到该书源"}, nil
	}
	if v, present := req["enabled"]; present {
		source.Enabled = pluginBool(v)
	}
	if v, present := req["weight"]; present {
		// Python 在转换失败时静默保留原值。
		if n, ok := adminIntOK(v); ok {
			source.Weight = n
		}
	}
	if v, present := req["group"]; present {
		source.Group = strings.TrimSpace(pluginStr(v))
	}
	if v, present := req["raw"]; present {
		if m, isMap := v.(map[string]any); isMap {
			source.ApplyRaw(m)
		}
	}
	if err := booksource.UpdateSource(ctx.DB, source); err != nil {
		return nil, err
	}
	return map[string]any{"err": "ok"}, nil
}

// bookSourceDelete 复刻 BookSourceCRUD.delete。
//
// DELETE 优先从查询参数取 id/ids，同时兼容请求体中的 JSON。
func bookSourceDelete(ctx *Context) (map[string]any, error) {
	ids := []any{}
	if ctx.Request != nil {
		for _, v := range ctx.Request.URL.Query()["ids"] {
			ids = append(ids, v)
		}
		if single := ctx.Query("id"); single != "" {
			ids = append(ids, single)
		}
	}
	if len(ids) == 0 {
		if body := ctx.Body(); len(strings.TrimSpace(string(body))) > 0 {
			var req map[string]any
			if err := json.Unmarshal(body, &req); err == nil {
				ids = pluginList(req["ids"])
				if len(ids) == 0 {
					if v, present := req["id"]; present && v != nil {
						ids = []any{v}
					}
				}
			}
		}
	}
	normalized := booksource.NormalizeSourceIDs(ids)
	if len(normalized) == 0 {
		return map[string]any{"err": ErrBookSourceParams, "msg": "需要提供 id 或 ids"}, nil
	}
	deleted, err := booksource.DeleteSources(ctx.DB, normalized)
	if err != nil {
		return nil, err
	}
	return map[string]any{"err": "ok", "deleted": deleted}, nil
}

// bookSourceRawFromRequest 复刻 `raw` 字段的字符串/对象兼容解析。
func bookSourceRawFromRequest(req map[string]any) (map[string]any, map[string]any) {
	raw := req["raw"]
	if text, isStr := raw.(string); isStr {
		var parsed any
		if err := json.Unmarshal([]byte(text), &parsed); err != nil {
			return nil, map[string]any{"err": ErrBookSourceParams, "msg": "书源 JSON 解析失败"}
		}
		raw = parsed
	}
	m, isMap := raw.(map[string]any)
	if !isMap {
		return nil, map[string]any{"err": ErrBookSourceParams, "msg": "缺少书源数据"}
	}
	return m, nil
}

// BookSourceTestHandler 对应 BookSourceTest（@js @is_admin）。
//
// 用关键词测试书源是否可用，并把结果写回检测状态。
func BookSourceTestHandler(cfg BookSourceAdminConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		req, err := pluginBody(ctx)
		if err != nil {
			return map[string]any{"err": ErrBookSourceParams, "msg": err.Error()}, nil
		}
		source, err := booksource.GetSourceByID(ctx.DB, pluginInt(req["id"], 0))
		if err != nil {
			return nil, err
		}
		if source == nil {
			return map[string]any{"err": ErrBookSourceNotFound, "msg": "未找到该书源"}, nil
		}
		key := strings.TrimSpace(pluginStr(req["key"]))
		if key == "" {
			key = "剑来"
		}

		result := bookSourceTestRun(ctx, cfg, source, key)
		ok := pluginStr(result["err"]) == "ok" && pluginBool(result["search"])
		message := pluginStr(result["msg"])
		if ok {
			message = "测试通过"
		} else if message == "" {
			message = pluginStr(result["err"])
		}
		booksource.ApplyCheckResult(source, booksource.ProbeResult{
			OK: ok, Status: map[bool]string{true: booksource.CheckStatusOK, false: pluginStr(result["err"])}[ok],
			Message: message, Tags: booksource.SourceTags(source.Raw),
		})
		if err := booksource.UpdateSource(ctx.DB, source); err != nil {
			return nil, err
		}
		return result, nil
	}
}

// bookSourceTestRun 执行一次搜索 → 详情 → 目录 → 正文的链路测试。
func bookSourceTestRun(ctx *Context, cfg BookSourceAdminConfig, source *booksource.Source,
	key string) map[string]any {
	result := map[string]any{"err": "ok", "js_skipped": false}
	start := time.Now()

	engine, err := booksource.NewBookSourceEngine(source.Raw, nil, cfg.engineConfig())
	if err != nil {
		result["err"] = ErrBookSourceTestFail
		result["msg"] = err.Error()
		result["elapsed_ms"] = int(time.Since(start).Milliseconds())
		return result
	}

	books, err := engine.Search(ctx.Request.Context(), key, 1)
	if err != nil {
		if _, isJS := err.(*booksource.JsRuleUnsupported); isJS {
			result["js_skipped"] = true
		} else {
			result["err"] = ErrBookSourceTestFail
			result["msg"] = err.Error()
		}
		result["elapsed_ms"] = int(time.Since(start).Milliseconds())
		return result
	}

	shown := books
	if len(shown) > booksource.TestSearchResultLimit {
		shown = shown[:booksource.TestSearchResultLimit]
	}
	search := make([]map[string]any, 0, len(shown))
	for _, b := range shown {
		search = append(search, b.ToDict())
	}
	result["search"] = search

	if len(books) > 0 {
		detail, err := engine.BookInfo(ctx.Request.Context(), books[0].BookURL)
		if err != nil {
			result["err"] = ErrBookSourceTestFail
			result["msg"] = err.Error()
			result["elapsed_ms"] = int(time.Since(start).Milliseconds())
			return result
		}
		result["info"] = detail.ToDict()

		chapters, err := engine.Toc(ctx.Request.Context(), detail.TocURL)
		if err != nil {
			result["err"] = ErrBookSourceTestFail
			result["msg"] = err.Error()
			result["elapsed_ms"] = int(time.Since(start).Milliseconds())
			return result
		}
		result["toc_count"] = len(chapters)
		if len(chapters) > 0 {
			sample, err := engine.Content(ctx.Request.Context(), chapters[0].URL, false)
			if err != nil {
				result["err"] = ErrBookSourceTestFail
				result["msg"] = err.Error()
				result["elapsed_ms"] = int(time.Since(start).Milliseconds())
				return result
			}
			if len([]rune(sample)) > booksource.TestSampleContentMaxLen {
				sample = string([]rune(sample)[:booksource.TestSampleContentMaxLen])
			}
			result["sample_content"] = sample
		}
	}
	result["elapsed_ms"] = int(time.Since(start).Milliseconds())
	return result
}

// BookSourceAdminRouteSpecs 返回书源管理模块接管的 10 条路由。
func BookSourceAdminRouteSpecs(cfg BookSourceAdminConfig) []RouteSpec {
	methods := []string{http.MethodGet, http.MethodPost}
	crudMethods := []string{http.MethodPost, http.MethodPut, http.MethodDelete}
	return []RouteSpec{
		{Pattern: "/api/admin/booksource/list", Methods: methods, Auth: true, Admin: true, Handler: BookSourceListHandler(cfg)},
		{Pattern: "/api/admin/booksource/export", Methods: methods, Auth: true, Admin: true, Handler: BookSourceExportHandler(cfg)},
		{Pattern: "/api/admin/booksource/import", Methods: methods, Auth: true, Admin: true, Handler: BookSourceImportHandler(cfg)},
		{Pattern: "/api/admin/booksource/seed", Methods: methods, Auth: true, Admin: true, Handler: BookSourceSeedHandler(cfg)},
		{Pattern: "/api/admin/booksource/toggle", Methods: methods, Auth: true, Admin: true, Handler: BookSourceToggleHandler(cfg)},
		{Pattern: "/api/admin/booksource/check/status", Methods: methods, Auth: true, Admin: true, Handler: BookSourceCheckStatusHandler(cfg)},
		{Pattern: "/api/admin/booksource/check", Methods: methods, Auth: true, Admin: true, Handler: BookSourceCheckAllHandler(cfg)},
		{Pattern: "/api/admin/booksource/clean-invalid", Methods: methods, Auth: true, Admin: true, Handler: BookSourceCheckAllHandler(cfg)},
		{Pattern: "/api/admin/booksource/test", Methods: methods, Auth: true, Admin: true, Handler: BookSourceTestHandler(cfg)},
		{Pattern: "/api/admin/booksource", Methods: crudMethods, Auth: true, Admin: true, Handler: BookSourceCRUDHandler(cfg)},
	}
}

// adminFloat 把任意值转成 float64；不可转换时返回 fallback。
func adminFloat(v any, fallback float64) float64 {
	switch t := v.(type) {
	case float64:
		return t
	case float32:
		return float64(t)
	case int:
		return float64(t)
	case int64:
		return float64(t)
	case json.Number:
		if f, err := t.Float64(); err == nil {
			return f
		}
	case string:
		var f float64
		if _, err := fmt.Sscanf(strings.TrimSpace(t), "%g", &f); err == nil {
			return f
		}
	}
	return fallback
}

// adminIntOK 把任意值转成 int64，并报告是否转换成功。
func adminIntOK(v any) (int64, bool) {
	switch t := v.(type) {
	case float64:
		return int64(t), true
	case int:
		return int64(t), true
	case int64:
		return t, true
	case json.Number:
		if n, err := t.Int64(); err == nil {
			return n, true
		}
	case string:
		var n int64
		if _, err := fmt.Sscanf(strings.TrimSpace(t), "%d", &n); err == nil {
			return n, true
		}
	}
	return 0, false
}

// adminStringList 把 JSON 文本解成字符串列表。
func adminStringList(text string) []string {
	out := []string{}
	for _, item := range decodeJSONListOrEmpty(text) {
		out = append(out, pluginStr(item))
	}
	return out
}
