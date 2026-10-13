// Package pluginwriters 移植 webserver/services/plugin_writers.py 与
// webserver/services/annotation_writer.py。
//
// 职责：把「某类实体如何落进 Talebook 的表」从通用运行时里分离出来。
// 运行时只按 entity_type 查注册表，具体怎么写由写入器负责；来源身份统一
// 由连接所属的完整 plugin_key 推导。
package pluginwriters

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"strings"
	"unicode"

	"talebook/booksvr/internal/normalize"
	"talebook/booksvr/internal/userdb"
)

// SourceIDMaxLength 是来源命名空间列的最大长度。
const SourceIDMaxLength = 64

// StrongMatch 是自动匹配的置信度阈值。
const StrongMatch = 0.9

// BoundedSourceID 把来源标识裁剪到数据库列长度内。
//
// 对应 Python 的 bounded_source_id：超长时保留头部并追加 16 位 sha256 摘要。
func BoundedSourceID(value, suffix string, maxLength int) string {
	if maxLength <= 0 {
		maxLength = SourceIDMaxLength
	}
	raw := value
	if raw == "" {
		raw = "plugin"
	}
	raw += suffix
	if len(raw) <= maxLength {
		return raw
	}
	digest := sha256Hex(raw)[:16]
	headLength := maxLength - len(digest) - 1
	if headLength < 0 {
		headLength = 0
	}
	return raw[:headLength] + ":" + digest
}

// SourceNameFor 由连接所属插件推导来源标识。
//
// 对应 Python 的 source_name_for。
func SourceNameFor(db *sql.DB, connection *userdb.PluginConnection) (string, error) {
	if connection == nil {
		return BoundedSourceID("plugin", "", SourceIDMaxLength), nil
	}
	installations, err := userdb.ListPluginInstallations(db)
	if err != nil {
		return "", err
	}
	key := ""
	for _, installation := range installations {
		if installation.ID == connection.InstallationID {
			key = installation.PluginKey
			break
		}
	}
	if key == "" {
		key = "plugin"
	}
	return BoundedSourceID(key, "", SourceIDMaxLength), nil
}

// BookMatchType 返回书籍匹配记录使用的 source_type。
//
// 对应 Python 的 _book_match_type。
func BookMatchType(sourceName string) string {
	return BoundedSourceID(sourceName, "_book", SourceIDMaxLength)
}

// NormalizeText 归一化文本用于比较：NFKC + 繁转简 + casefold + 仅保留字母数字。
//
// 对应 Python 的 normalize_text。
func NormalizeText(value string) string {
	normalized := normalize.ToSimplified(normalize.NormalizeWidth(value))
	var out strings.Builder
	for _, r := range strings.ToLower(normalized) {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			out.WriteRune(r)
		}
	}
	return out.String()
}

// sha256Hex 返回十六进制 sha256。
func sha256Hex(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

// SourceIdentity 把外部 ID 裁剪到 255 字符内。
//
// 对应 Python 的 _source_identity。
func SourceIdentity(externalID string) string {
	if len(externalID) <= 255 {
		return externalID
	}
	return "sha256:" + sha256Hex(externalID)
}

// ClientID 由来源身份生成批注的 client_id。
//
// 对应 Python 的 _client_id：connection id 纳入命名空间，
// 允许同插件的多账户导入相同 external id。
func ClientID(externalID, sourceName, sourceConnectionID string) string {
	prefix := fmt.Sprintf("%s:%s:", sourceName, sourceConnectionID)
	value := prefix + externalID
	if len(value) <= 64 {
		return value
	}
	if len(prefix) > 40 {
		prefix = "plugin:" + sha256Hex(prefix)[:16] + ":"
	}
	remaining := 64 - len(prefix)
	if remaining < 0 {
		remaining = 0
	}
	return prefix + sha256Hex(value)[:remaining]
}

// EntityWriter 是一类实体的落库策略。
//
// 对应 Python 的 EntityWriter：三个钩子都可选实现。
type EntityWriter interface {
	// EntityType 返回该写入器负责的实体类型。
	EntityType() string
	// Prepare 做写入前的归一化与匹配，返回 (data, matched)。
	Prepare(connection *userdb.PluginConnection, data map[string]any,
		calibreDB *sql.DB, allowedBookIDs []int64) (map[string]any, bool, error)
	// Materialize 把来源记录物化为 Talebook 自己的业务行。
	Materialize(run *userdb.PluginRun, connection *userdb.PluginConnection,
		record *userdb.PluginSourceRecord, data map[string]any, payloadHash string,
		calibreDB *sql.DB) error
	// IsLocallyModified 返回物化业务行是否已被用户修改或删除。
	IsLocallyModified(record *userdb.PluginSourceRecord) bool
	// Rollback 撤销 Materialize 的写入。
	Rollback(record *userdb.PluginSourceRecord) error
}

// writers 是已注册的写入器表。
var writers = map[string]EntityWriter{}

// Register 注册一个写入器。
func Register(writer EntityWriter) {
	if writer == nil || writer.EntityType() == "" {
		return
	}
	writers[writer.EntityType()] = writer
}

// WriterFor 返回该实体类型的写入器；没有注册则返回 nil，由平台按通用路径处理。
//
// 对应 Python 的 writer_for。
func WriterFor(entityType string) EntityWriter {
	return writers[entityType]
}

// RegisteredTypes 返回已注册的实体类型（供测试与运维观测）。
func RegisteredTypes() []string {
	out := make([]string, 0, len(writers))
	for key := range writers {
		out = append(out, key)
	}
	return out
}
