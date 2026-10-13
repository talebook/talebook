package pluginwriters

import (
	"database/sql"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"talebook/booksvr/internal/userdb"

	_ "modernc.org/sqlite"
)

// newSchemaDB 打开一份内存库并建表。
func newSchemaDB(t *testing.T) *sql.DB {
	t.Helper()
	path := filepath.Join("..", "userdb", "testdata", "schema.sql")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Skipf("schema.sql 不存在，跳过: %v", err)
	}
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	db.SetMaxOpenConns(1)
	t.Cleanup(func() { _ = db.Close() })

	for _, stmt := range strings.Split(string(raw), ";") {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" {
			continue
		}
		if _, err := db.Exec(stmt); err != nil {
			t.Fatalf("建表失败: %v\n%s", err, stmt)
		}
	}
	return db
}

// ---- BoundedSourceID ----

// TestBoundedSourceIDShort 覆盖短值原样返回。
func TestBoundedSourceIDShort(t *testing.T) {
	if got := BoundedSourceID("talebook.demo", "", SourceIDMaxLength); got != "talebook.demo" {
		t.Errorf("got = %q", got)
	}
}

// TestBoundedSourceIDEmptyFallsBack 覆盖空值回落 plugin。
func TestBoundedSourceIDEmptyFallsBack(t *testing.T) {
	if got := BoundedSourceID("", "", SourceIDMaxLength); got != "plugin" {
		t.Errorf("got = %q，期望 plugin", got)
	}
}

// TestBoundedSourceIDSuffix 覆盖后缀拼接。
func TestBoundedSourceIDSuffix(t *testing.T) {
	if got := BoundedSourceID("demo", "_book", SourceIDMaxLength); got != "demo_book" {
		t.Errorf("got = %q", got)
	}
}

// TestBoundedSourceIDTruncates 覆盖超长值截断并追加摘要。
func TestBoundedSourceIDTruncates(t *testing.T) {
	long := strings.Repeat("x", 200)
	got := BoundedSourceID(long, "", SourceIDMaxLength)
	if len(got) != SourceIDMaxLength {
		t.Fatalf("长度 = %d，期望 %d", len(got), SourceIDMaxLength)
	}
	if !strings.Contains(got, ":") {
		t.Error("应含摘要分隔符")
	}
	// 同输入应稳定。
	if again := BoundedSourceID(long, "", SourceIDMaxLength); again != got {
		t.Error("同输入应产生同结果")
	}
	// 不同输入应产生不同结果。
	other := BoundedSourceID(long+"y", "", SourceIDMaxLength)
	if other == got {
		t.Error("不同输入应产生不同结果")
	}
}

// TestBoundedSourceIDDefaultMaxLength 覆盖 maxLength<=0 时用默认值。
func TestBoundedSourceIDDefaultMaxLength(t *testing.T) {
	long := strings.Repeat("x", 200)
	if got := BoundedSourceID(long, "", 0); len(got) != SourceIDMaxLength {
		t.Errorf("长度 = %d，期望 %d", len(got), SourceIDMaxLength)
	}
}

// TestBookMatchType 覆盖书籍匹配类型命名。
func TestBookMatchType(t *testing.T) {
	if got := BookMatchType("demo"); got != "demo_book" {
		t.Errorf("got = %q", got)
	}
}

// ---- NormalizeText ----

// TestNormalizeText 覆盖文本归一化。
func TestNormalizeText(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want string
	}{
		{"去空格与标点", "Hello, World!", "helloworld"},
		{"繁转简", "三體", "三体"},
		{"全角转半角", "ＡＢＣ１２３", "abc123"},
		{"大小写折叠", "ABC", "abc"},
		{"空", "", ""},
		{"仅标点", "!!!", ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := NormalizeText(tc.in); got != tc.want {
				t.Errorf("NormalizeText(%q) = %q，期望 %q", tc.in, got, tc.want)
			}
		})
	}
}

// TestNormalizeTextEquivalence 覆盖等价文本归一化后相同。
func TestNormalizeTextEquivalence(t *testing.T) {
	a := NormalizeText("三体（全集）")
	b := NormalizeText("三體(全集)")
	if a != b {
		t.Errorf("%q != %q，繁简与全半角应等价", a, b)
	}
}

// ---- SourceIdentity ----

// TestSourceIdentityShort 覆盖短 ID 原样返回。
func TestSourceIdentityShort(t *testing.T) {
	if got := SourceIdentity("abc"); got != "abc" {
		t.Errorf("got = %q", got)
	}
}

// TestSourceIdentityLong 覆盖超长 ID 摘要化。
func TestSourceIdentityLong(t *testing.T) {
	long := strings.Repeat("x", 300)
	got := SourceIdentity(long)
	if !strings.HasPrefix(got, "sha256:") {
		t.Errorf("got = %q，应以 sha256: 开头", got)
	}
	if len(got) != len("sha256:")+64 {
		t.Errorf("长度 = %d", len(got))
	}
}

// TestSourceIdentityBoundary 覆盖 255 边界。
func TestSourceIdentityBoundary(t *testing.T) {
	exact := strings.Repeat("x", 255)
	if got := SourceIdentity(exact); got != exact {
		t.Error("255 字符应原样返回")
	}
	over := strings.Repeat("x", 256)
	if got := SourceIdentity(over); !strings.HasPrefix(got, "sha256:") {
		t.Error("256 字符应摘要化")
	}
}

// ---- ClientID ----

// TestClientIDShort 覆盖短值直接拼接。
func TestClientIDShort(t *testing.T) {
	got := ClientID("ext1", "demo", "7")
	if got != "demo:7:ext1" {
		t.Errorf("got = %q", got)
	}
}

// TestClientIDTruncates 覆盖超长值截断到 64。
func TestClientIDTruncates(t *testing.T) {
	got := ClientID(strings.Repeat("x", 200), "demo", "7")
	if len(got) != 64 {
		t.Fatalf("长度 = %d，期望 64", len(got))
	}
	if !strings.HasPrefix(got, "demo:7:") {
		t.Errorf("got = %q，应保留前缀", got)
	}
}

// TestClientIDLongPrefixIsHashed 覆盖超长前缀被摘要化。
func TestClientIDLongPrefixIsHashed(t *testing.T) {
	got := ClientID("ext", strings.Repeat("s", 60), "7")
	if len(got) != 64 {
		t.Fatalf("长度 = %d，期望 64", len(got))
	}
	if !strings.HasPrefix(got, "plugin:") {
		t.Errorf("got = %q，超长前缀应摘要化", got)
	}
}

// TestClientIDNamespacesByConnection 覆盖 connection id 参与命名空间。
func TestClientIDNamespacesByConnection(t *testing.T) {
	a := ClientID("ext", "demo", "1")
	b := ClientID("ext", "demo", "2")
	if a == b {
		t.Error("不同连接应产生不同 client_id")
	}
}

// TestClientIDDeterministic 覆盖同输入稳定。
func TestClientIDDeterministic(t *testing.T) {
	long := strings.Repeat("x", 200)
	if ClientID(long, "demo", "7") != ClientID(long, "demo", "7") {
		t.Error("同输入应稳定")
	}
}

// ---- 注册表 ----

// fakeWriter 是测试用写入器。
type fakeWriter struct {
	entityType string
	prepared   bool
	rolledBack bool
	modified   bool
}

// EntityType 返回实体类型。
func (f *fakeWriter) EntityType() string { return f.entityType }

// Prepare 记录调用并返回。
func (f *fakeWriter) Prepare(*userdb.PluginConnection, map[string]any,
	*sql.DB, []int64) (map[string]any, bool, error) {
	f.prepared = true
	return map[string]any{"ok": true}, true, nil
}

// Materialize 记录调用。
func (f *fakeWriter) Materialize(*userdb.PluginRun, *userdb.PluginConnection,
	*userdb.PluginSourceRecord, map[string]any, string, *sql.DB) error {
	return nil
}

// IsLocallyModified 返回预设值。
func (f *fakeWriter) IsLocallyModified(*userdb.PluginSourceRecord) bool { return f.modified }

// Rollback 记录调用。
func (f *fakeWriter) Rollback(*userdb.PluginSourceRecord) error {
	f.rolledBack = true
	return nil
}

// TestRegisterAndWriterFor 覆盖注册与查找。
func TestRegisterAndWriterFor(t *testing.T) {
	w := &fakeWriter{entityType: "test_entity"}
	Register(w)

	if got := WriterFor("test_entity"); got != w {
		t.Error("WriterFor 应返回注册的写入器")
	}
	if got := WriterFor("nope"); got != nil {
		t.Error("未注册类型应返回 nil")
	}
}

// TestRegisterIgnoresInvalid 覆盖无效写入器被忽略。
func TestRegisterIgnoresInvalid(t *testing.T) {
	Register(nil)
	Register(&fakeWriter{entityType: ""})
	if got := WriterFor(""); got != nil {
		t.Error("空类型不应被注册")
	}
}

// TestRegisteredTypes 覆盖类型枚举。
func TestRegisteredTypes(t *testing.T) {
	Register(&fakeWriter{entityType: "enum_entity"})
	found := false
	for _, name := range RegisteredTypes() {
		if name == "enum_entity" {
			found = true
		}
	}
	if !found {
		t.Error("RegisteredTypes 应含已注册类型")
	}
}

// TestWriterHooksCallable 覆盖写入器钩子可调用。
func TestWriterHooksCallable(t *testing.T) {
	w := &fakeWriter{entityType: "hook_entity", modified: true}
	Register(w)

	data, matched, err := w.Prepare(nil, map[string]any{}, nil, nil)
	if err != nil || !matched || data["ok"] != true {
		t.Errorf("Prepare = (%v, %v, %v)", data, matched, err)
	}
	if !w.prepared {
		t.Error("Prepare 应被记录")
	}
	if !w.IsLocallyModified(nil) {
		t.Error("IsLocallyModified 应返回预设值")
	}
	if err := w.Rollback(nil); err != nil || !w.rolledBack {
		t.Errorf("Rollback = %v", err)
	}
}

// ---- SourceNameFor ----

// TestSourceNameForNilConnection 覆盖 nil 连接回落 plugin。
func TestSourceNameForNilConnection(t *testing.T) {
	got, err := SourceNameFor(nil, nil)
	if err != nil {
		t.Fatalf("SourceNameFor: %v", err)
	}
	if got != "plugin" {
		t.Errorf("got = %q，期望 plugin", got)
	}
}

// TestSourceNameForMissingInstallation 覆盖安装记录不存在时回落 plugin。
func TestSourceNameForMissingInstallation(t *testing.T) {
	db := newSchemaDB(t)
	conn := &userdb.PluginConnection{ID: 1, InstallationID: 999}
	got, err := SourceNameFor(db, conn)
	if err != nil {
		t.Fatalf("SourceNameFor: %v", err)
	}
	if got != "plugin" {
		t.Errorf("got = %q，期望 plugin", got)
	}
}

// TestSourceNameForUsesPluginKey 覆盖从安装记录取 plugin_key。
func TestSourceNameForUsesPluginKey(t *testing.T) {
	db := newSchemaDB(t)
	seedInstallation(t, db, 1, "talebook.demo")
	conn := &userdb.PluginConnection{ID: 1, InstallationID: 1}

	got, err := SourceNameFor(db, conn)
	if err != nil {
		t.Fatalf("SourceNameFor: %v", err)
	}
	if got != "talebook.demo" {
		t.Errorf("got = %q，期望 talebook.demo", got)
	}
}

// seedInstallation 插入一条插件安装记录。
func seedInstallation(t *testing.T, db *sql.DB, id int64, pluginKey string) {
	t.Helper()
	// 先建定义，再建安装（外键约束）。
	if _, err := db.Exec(`INSERT INTO plugin_definitions
		(id, plugin_key, version, protocol_version, name, runtime_kind, categories,
		 capabilities, actions, auth_schema, config_schema, permissions, data_policy,
		 compatibility, homepage, license, manifest, create_time)
		VALUES (?, ?, '1.0.0', 'talebook.plugin/v1', 'x', 'builtin', '[]', '[]', '[]',
		 '{}', '{}', '[]', '{}', '{}', '', '', '{}', '2026-01-01')`,
		id, pluginKey); err != nil {
		t.Fatalf("插入定义失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO plugin_installations
		(id, plugin_key, definition_id, version, enabled, scope, config, installed_from,
		 checksum, status, installed_by, create_time, update_time)
		VALUES (?, ?, ?, '1.0.0', 1, 'instance', '{}', '', '', 'active', 0,
		 '2026-01-01', '2026-01-01')`,
		id, pluginKey, id); err != nil {
		t.Fatalf("插入安装失败: %v", err)
	}
}
