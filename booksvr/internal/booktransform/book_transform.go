// Package booktransform 移植 webserver/services/book_transform.py。
//
// 职责：新书入库后的正文自动处理。只有把连接的 trigger 显式配成 auto、
// 且插件声明了 supports_auto_trigger 的处理才会执行。
//
// 自动改写用户刚上传的文件不可逆，因此：默认不做；先试算，无变更则不写；
// 每次执行都留 PluginRun 审计记录。
package booktransform

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"talebook/booksvr/internal/booktools"
	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginruntime"
	"talebook/booksvr/internal/userdb"
)

// TransformCapability 是正文处理插件的能力名。
const TransformCapability = "integrations.tool"

// TriggerAuto 表示连接配置为自动触发。
const TriggerAuto = "auto"

// TriggerManual 表示连接配置为手动触发（默认）。
const TriggerManual = "manual"

// TriggerOf 读取连接配置里的触发方式，未配置时为手动。
//
// 对应 Python triggers.trigger_of。
func TriggerOf(config map[string]any) string {
	if config == nil {
		return TriggerManual
	}
	raw, ok := config["trigger"]
	if !ok || raw == nil {
		return TriggerManual
	}
	value := strings.TrimSpace(fmt.Sprintf("%v", raw))
	if value == "" {
		return TriggerManual
	}
	return value
}

// Config 是自动修复服务的依赖。
type Config struct {
	// DB 是 Talebook 自有库（plugin_connections / plugin_runs）。
	DB *sql.DB
	// LibraryDB 是 Calibre 元数据库。
	LibraryDB *sql.DB
	// Runtime 是插件运行时。
	Runtime *pluginruntime.Runtime
	// BackupRoot 是备份根目录（对应 CONF 的 convert_path）；
	// 为空时回落系统临时目录。
	BackupRoot string
	// Now 便于测试注入时间；为空时用 time.Now。
	Now func() time.Time
}

// Service 执行新书正文的自动处理。
type Service struct {
	cfg Config
}

// NewService 构造自动修复服务。
func NewService(cfg Config) *Service {
	return &Service{cfg: cfg}
}

// now 返回当前时间。
func (s *Service) now() time.Time {
	if s.cfg.Now != nil {
		return s.cfg.Now()
	}
	return time.Now()
}

// AutoConnection 找出声明支持自动触发、且连接配置为 auto 的处理连接。
//
// 对应 Python 的 _auto_connection：先取该能力下所有连接，再按 plugin_key
// 找到 provider，要求 supports_auto_trigger 且 trigger == auto。
func (s *Service) AutoConnection() (*userdb.PluginConnection, error) {
	connections, err := s.cfg.Runtime.ConnectionsFor(TransformCapability, nil)
	if err != nil {
		return nil, err
	}
	providers, err := s.cfg.Runtime.EnabledProviders(TransformCapability)
	if err != nil {
		return nil, err
	}
	byKey := map[string]pluginiface.Provider{}
	for _, provider := range providers {
		byKey[asString(provider.Manifest()["id"])] = provider
	}

	for _, connection := range connections {
		key, err := s.cfg.Runtime.PluginKeyOf(connection)
		if err != nil {
			continue
		}
		provider, ok := byKey[key]
		if !ok {
			continue
		}
		auto, ok := provider.(interface{ SupportsAutoTrigger() bool })
		if !ok || !auto.SupportsAutoTrigger() {
			continue
		}
		if TriggerOf(connection.Config) == TriggerAuto {
			return connection, nil
		}
	}
	return nil, nil
}

// asString 把 manifest 字段规整为字符串。
func asString(value any) string {
	if value == nil {
		return ""
	}
	return fmt.Sprintf("%v", value)
}

// FixEncodingForBook 检测新书 TXT 编码，仅在确实需要修复时才写回。
//
// 对应 Python 的 fix_encoding_for_book。返回的 PluginRun 始终非 nil
// （除非没有可用连接），便于调用方读取审计结果。
func (s *Service) FixEncodingForBook(bookID int64, requestedBy int64, connectionID *int64) (*userdb.PluginRun, error) {
	connection, err := s.resolveConnection(connectionID)
	if err != nil {
		return nil, err
	}
	if connection == nil {
		return nil, nil
	}

	run, err := s.beginRun(connection, bookID, requestedBy)
	if err != nil {
		return nil, err
	}

	if err := s.fixEncoding(run, connection, bookID, requestedBy); err != nil {
		s.failRun(run, err)
		return run, nil
	}
	return run, nil
}

// resolveConnection 按 id 取连接；未指定时自动挑选。
func (s *Service) resolveConnection(connectionID *int64) (*userdb.PluginConnection, error) {
	if connectionID == nil {
		return s.AutoConnection()
	}
	return s.cfg.Runtime.ConnectionByID(*connectionID)
}

// beginRun 创建一条 running 状态的 PluginRun。
func (s *Service) beginRun(connection *userdb.PluginConnection, bookID, requestedBy int64) (*userdb.PluginRun, error) {
	now := s.now()
	run := &userdb.PluginRun{
		ConnectionID: connection.ID,
		Action:       "run",
		Trigger:      "auto",
		Status:       "running",
		RequestedBy:  requestedBy,
		Counts:       copyCounts(pluginruntime.DefaultCounts),
		InputData:    map[string]any{"book_id": bookID},
		CreateTime:   formatTime(now),
		StartedAt:    formatTime(now),
	}
	id, err := insertRun(s.cfg.DB, run)
	if err != nil {
		return nil, err
	}
	run.ID = id
	return run, nil
}

// fixEncoding 执行实际的编码检测与写回。
func (s *Service) fixEncoding(run *userdb.PluginRun, connection *userdb.PluginConnection,
	bookID, requestedBy int64) error {
	book, err := booktools.ResolveBook(s.cfg.LibraryDB, bookID)
	if err != nil {
		return err
	}
	if !hasFormat(book, "TXT") {
		return fmt.Errorf("该书籍没有 TXT 格式")
	}

	src, err := booktools.GetFormatPath(s.cfg.LibraryDB, bookID, "TXT")
	if err != nil {
		return err
	}
	data, err := os.ReadFile(src)
	if err != nil {
		return err
	}

	toolInput := plugindomain.NewDomainRecord(map[string]any{
		"format":  "TXT",
		"content": data,
	})

	report, err := s.preview(connection, toolInput)
	if err != nil {
		return err
	}
	if unrecoverable, _ := report["unrecoverable"].(bool); unrecoverable {
		return fmt.Errorf("疑似多重误读或混用编码，跳过自动修复")
	}
	if garbage, _ := report["garbage"].(bool); garbage {
		if mojibake, _ := report["mojibake"].(bool); !mojibake {
			return fmt.Errorf("疑似多重误读或混用编码，跳过自动修复")
		}
	}

	if isAlreadyCorrect(report) {
		run.Status = "succeeded"
		run.Counts = withCounts(pluginruntime.DefaultCounts, map[string]int{"fetched": 1, "skipped": 1})
		run.CursorAfter = map[string]any{"book_id": bookID, "reason": "编码已正确，无需修复"}
		run.FinishedAt = formatTime(s.now())
		return updateRun(s.cfg.DB, run)
	}

	return s.applyTransform(run, connection, toolInput, bookID, requestedBy, report)
}

// preview 调用插件的 preview 方法。
func (s *Service) preview(connection *userdb.PluginConnection, input plugindomain.DomainRecord) (map[string]any, error) {
	out, err := s.cfg.Runtime.Read(connection, "preview", []any{input}, pluginruntime.CallOptions{
		RequiredScopes: []string{"books.read"},
	})
	if err != nil {
		return nil, err
	}
	return toMap(out), nil
}

// applyTransform 调用插件的 apply 方法并写回结果。
func (s *Service) applyTransform(run *userdb.PluginRun, connection *userdb.PluginConnection,
	input plugindomain.DomainRecord, bookID, requestedBy int64, report map[string]any) error {
	workDir, err := os.MkdirTemp("", "talebook-auto-transform-")
	if err != nil {
		return err
	}
	defer func() { _ = os.RemoveAll(workDir) }()

	backupDir := filepath.Join(s.backupRoot(), "texttools-backups")
	if err := os.MkdirAll(backupDir, 0o755); err != nil {
		return err
	}

	// rollbackState 在 finalize 与 rollback 之间共享备份路径。
	rollbackState := map[string]string{}

	finalize := func(value any) (any, error) {
		dict := toMap(value)
		path, _ := dict["path"].(string)
		backupPath, err := booktools.OverwriteFormat(s.cfg.LibraryDB, bookID, "TXT", path, backupDir)
		if err != nil {
			return nil, err
		}
		rollbackState["backup_path"] = backupPath
		dict["book_id"] = bookID
		dict["backup_path"] = backupPath
		return dict, nil
	}

	rollback := func() (map[string]any, bool) {
		restored := s.restoreBackup(bookID, rollbackState["backup_path"])
		return map[string]any{
			"backup_path": rollbackState["backup_path"],
			"restored":    restored,
		}, restored
	}

	out, err := s.cfg.Runtime.Write(connection, "apply", []any{input, workDir}, pluginruntime.CallOptions{
		RequiredScopes: []string{"books.write"},
		RequestedBy:    &requestedBy,
		Finalize:       finalize,
		Rollback:       rollback,
		AuditData:      map[string]any{"book_id": bookID, "format": "TXT", "trigger": "auto"},
	})
	if err != nil {
		return err
	}

	output := toMap(out)
	finalReport := report
	if inner, ok := output["report"].(map[string]any); ok {
		finalReport = inner
	}

	run.Status = "succeeded"
	run.Counts = withCounts(pluginruntime.DefaultCounts, map[string]int{"fetched": 1, "updated": 1})
	backupPath, _ := output["backup_path"].(string)
	run.CursorAfter = map[string]any{
		"book_id":     bookID,
		"encoding":    finalReport["encoding"],
		"backup_path": backupPath,
	}
	run.FinishedAt = formatTime(s.now())
	return updateRun(s.cfg.DB, run)
}

// restoreBackup 用备份文件恢复 TXT 格式；无备份时返回 false。
//
// 对应 Python 的 _restore_backup。
func (s *Service) restoreBackup(bookID int64, backupPath string) bool {
	if backupPath == "" {
		return false
	}
	info, err := os.Stat(backupPath)
	if err != nil || info.IsDir() {
		return false
	}
	if _, err := booktools.OverwriteFormat(s.cfg.LibraryDB, bookID, "TXT", backupPath, ""); err != nil {
		return false
	}
	return true
}

// backupRoot 返回备份根目录。
func (s *Service) backupRoot() string {
	if s.cfg.BackupRoot != "" {
		return s.cfg.BackupRoot
	}
	return os.TempDir()
}

// failRun 把 run 标记为失败并落库。
func (s *Service) failRun(run *userdb.PluginRun, cause error) {
	run.Status = "failed"
	run.ErrorCode = "booktools.auto_failed"
	message := cause.Error()
	if len(message) > 1000 {
		message = message[:1000]
	}
	run.ErrorMessage = message
	run.FinishedAt = formatTime(s.now())
	_ = updateRun(s.cfg.DB, run)
}

// hasFormat 判断书籍是否具备指定格式（大小写不敏感）。
func hasFormat(book *library.BookData, format string) bool {
	for _, f := range booktools.AvailableFormats(book) {
		if strings.EqualFold(f, format) {
			return true
		}
	}
	return false
}

// isAlreadyCorrect 判断报告中的编码是否已是 UTF-8 / ASCII。
func isAlreadyCorrect(report map[string]any) bool {
	raw, _ := report["encoding"].(string)
	normalized := strings.ToLower(strings.ReplaceAll(raw, "-", ""))
	return normalized == "utf8" || normalized == "ascii"
}

// toMap 把插件返回值规整为 map。
func toMap(value any) map[string]any {
	switch v := value.(type) {
	case nil:
		return map[string]any{}
	case map[string]any:
		return v
	case *plugindomain.DomainRecord:
		if v == nil {
			return map[string]any{}
		}
		return v.Values
	case plugindomain.DomainRecord:
		return v.Values
	default:
		// 兜底：经 JSON 往返规整。
		raw, err := json.Marshal(v)
		if err != nil {
			return map[string]any{}
		}
		out := map[string]any{}
		if err := json.Unmarshal(raw, &out); err != nil {
			return map[string]any{}
		}
		return out
	}
}

// copyCounts 复制计数表。
func copyCounts(src map[string]int) map[string]any {
	out := make(map[string]any, len(src))
	for k, v := range src {
		out[k] = v
	}
	return out
}

// withCounts 在默认计数基础上覆盖指定项。
func withCounts(base map[string]int, overrides map[string]int) map[string]any {
	out := copyCounts(base)
	for k, v := range overrides {
		out[k] = v
	}
	return out
}

// formatTime 统一时间格式（与 plugin_runs 表一致）。
func formatTime(t time.Time) string {
	return t.Format("2006-01-02 15:04:05.000000")
}
