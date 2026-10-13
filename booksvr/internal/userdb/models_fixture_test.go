package userdb

import (
	"database/sql"
	"os"
	"path/filepath"
	"strings"
	"testing"

	_ "modernc.org/sqlite"
)

// schemaSQL 读取由 webserver/models.py 的 SQLAlchemy 元数据导出的权威建表 DDL。
//
// 该文件由 scripts 从 Python 侧生成，保证 Go 侧测试跑在与生产完全一致的 schema 上。
func schemaSQL(t *testing.T) string {
	t.Helper()
	path := filepath.Join("testdata", "schema.sql")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("读取 schema.sql 失败: %v", err)
	}
	return string(raw)
}

// newSchemaDB 建一个内存库并套用权威 schema，返回可读写的 *sql.DB。
func newSchemaDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	for _, stmt := range strings.Split(schemaSQL(t), ";") {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" {
			continue
		}
		if _, err := db.Exec(stmt); err != nil {
			t.Fatalf("建表失败: %v\n语句: %s", err, stmt)
		}
	}
	return db
}

// fixtureDB 打开仓库内的真实用户库 fixture（tests/cases/users.db），只读。
func fixtureDB(t *testing.T) *sql.DB {
	t.Helper()
	path := filepath.Join("..", "..", "..", "tests", "cases", "users.db")
	if _, err := os.Stat(path); err != nil {
		t.Skipf("fixture 不存在，跳过: %v", err)
	}
	db, err := sql.Open("sqlite", "file:"+path+"?mode=ro")
	if err != nil {
		t.Fatalf("打开 fixture 失败: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}

// TestSchemaCoversAllModels 校验权威 DDL 覆盖 models.py 的全部 32 张表。
func TestSchemaCoversAllModels(t *testing.T) {
	db := newSchemaDB(t)
	want := []string{
		"annotations", "annotation_sources", "audiobook_bookmarks", "audiobook_chapters",
		"audiobook_daily_stats", "audiobook_editions", "audiobook_jobs",
		"audiobook_playback_sessions", "audiobook_progress", "author_aliases", "book_aliases",
		"book_sources", "devices", "installed_themes", "items", "messages", "online_book_meta",
		"opds_sources", "plugin_connections", "plugin_definitions", "plugin_entity_matches",
		"plugin_installations", "plugin_permissions", "plugin_run_items", "plugin_runs",
		"plugin_secrets", "plugin_source_records", "podcast_access_logs", "podcast_subscriptions",
		"readers", "reading_state", "scanfiles",
	}
	if len(want) != 32 {
		t.Fatalf("期望 32 张表，清单里有 %d 个", len(want))
	}
	for _, name := range want {
		var n int
		err := db.QueryRow(`SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?`, name).Scan(&n)
		if err != nil {
			t.Fatalf("查询表 %s 失败: %v", name, err)
		}
		if n != 1 {
			t.Errorf("表 %s 不存在", name)
		}
	}
}

// TestFixtureTablesMatchModels 校验真实 fixture 里存在早期 15 张表。
func TestFixtureTablesMatchModels(t *testing.T) {
	db := fixtureDB(t)
	want := []string{
		"book_sources", "devices", "installed_themes", "items", "messages",
		"online_book_meta", "opds_sources", "readers", "reading_state", "scanfiles",
		"social_auth_association", "social_auth_code", "social_auth_nonce",
		"social_auth_partial", "social_auth_usersocialauth",
	}
	for _, name := range want {
		var n int
		err := db.QueryRow(`SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?`, name).Scan(&n)
		if err != nil {
			t.Fatalf("查询表 %s 失败: %v", name, err)
		}
		if n != 1 {
			t.Errorf("表 %s 不存在", name)
		}
	}
}

// TestListReadersOnFixture 在真实 fixture 上读取读者列表。
func TestListReadersOnFixture(t *testing.T) {
	db := fixtureDB(t)
	readers, err := ListReaders(db)
	if err != nil {
		t.Fatalf("ListReaders 失败: %v", err)
	}
	if len(readers) == 0 {
		t.Fatal("fixture 应至少有一个读者")
	}
	for _, r := range readers {
		if r.Username == "" {
			t.Errorf("读者 %d 的 username 为空", r.ID)
		}
	}
}

// TestListBookSourcesOnFixture 在真实 fixture 上读取网络书源（含保留字列 "group"）。
func TestListBookSourcesOnFixture(t *testing.T) {
	db := fixtureDB(t)
	sources, err := ListBookSources(db)
	if err != nil {
		t.Fatalf("ListBookSources 失败: %v", err)
	}
	for _, s := range sources {
		if s.Raw == nil {
			t.Errorf("书源 %d 的 Raw 不应为 nil", s.ID)
		}
		if s.CheckTags == nil {
			t.Errorf("书源 %d 的 CheckTags 不应为 nil", s.ID)
		}
	}
}

// TestListInstalledThemesOnFixture 在真实 fixture 上读取主题。
func TestListInstalledThemesOnFixture(t *testing.T) {
	db := fixtureDB(t)
	themes, err := ListInstalledThemes(db)
	if err != nil {
		t.Fatalf("ListInstalledThemes 失败: %v", err)
	}
	for _, th := range themes {
		if th.Data == nil {
			t.Errorf("主题 %d 的 Data 不应为 nil", th.ID)
		}
		if th.ToDict()["name"] != th.Name {
			t.Errorf("主题 %d 的 ToDict 名称不一致", th.ID)
		}
	}
}

// TestListOpdsSourcesOnFixture 在真实 fixture 上读取 OPDS 源。
func TestListOpdsSourcesOnFixture(t *testing.T) {
	db := fixtureDB(t)
	sources, err := ListOpdsSources(db)
	if err != nil {
		t.Fatalf("ListOpdsSources 失败: %v", err)
	}
	for _, s := range sources {
		if s.Data == nil {
			t.Errorf("OPDS 源 %d 的 Data 不应为 nil", s.ID)
		}
	}
}

// TestListScanFilesOnFixture 在真实 fixture 上读取扫描文件。
func TestListScanFilesOnFixture(t *testing.T) {
	db := fixtureDB(t)
	files, err := ListScanFilesByScanID(db, 0)
	if err != nil {
		t.Fatalf("ListScanFilesByScanID 失败: %v", err)
	}
	for _, f := range files {
		if f.Data == nil {
			t.Errorf("扫描文件 %d 的 Data 不应为 nil", f.ID)
		}
	}
}

// TestListDevicesOnFixture 在真实 fixture 上读取设备。
func TestListDevicesOnFixture(t *testing.T) {
	db := fixtureDB(t)
	devices, err := ListDevices(db, 1)
	if err != nil {
		t.Fatalf("ListDevices 失败: %v", err)
	}
	for _, d := range devices {
		if d.ToDict()["type"] != d.DeviceType {
			t.Errorf("设备 %d 的 ToDict type 不一致", d.ID)
		}
	}
}

// TestListMessagesOnFixture 在真实 fixture 上读取消息。
func TestListMessagesOnFixture(t *testing.T) {
	db := fixtureDB(t)
	msgs, err := ListMessages(db, 1, 10)
	if err != nil {
		t.Fatalf("ListMessages 失败: %v", err)
	}
	for _, m := range msgs {
		if m.Data == nil {
			t.Errorf("消息 %d 的 Data 不应为 nil", m.ID)
		}
	}
	if _, err := CountUnreadMessages(db, 1); err != nil {
		t.Fatalf("CountUnreadMessages 失败: %v", err)
	}
}

// TestListAnnotationsOnFixture 在真实 fixture 上读取批注。
func TestListAnnotationsOnFixture(t *testing.T) {
	db := newSchemaDB(t)
	anns, err := ListAnnotations(db, 1, 1)
	if err != nil {
		t.Fatalf("ListAnnotations 失败: %v", err)
	}
	for _, a := range anns {
		sources, err := ListAnnotationSources(db, a.ID)
		if err != nil {
			t.Fatalf("ListAnnotationSources 失败: %v", err)
		}
		api := a.ToAPI(sources)
		if api["id"] != a.ID {
			t.Errorf("批注 %d 的 ToAPI id 不一致", a.ID)
		}
		if _, ok := api["sources"]; !ok {
			t.Errorf("批注 %d 的 ToAPI 缺少 sources", a.ID)
		}
	}
}

// TestListAuthorAliasesOnFixture 在真实 fixture 上读取作者别名。
func TestListAuthorAliasesOnFixture(t *testing.T) {
	db := newSchemaDB(t)
	aliases, err := ListAuthorAliases(db)
	if err != nil {
		t.Fatalf("ListAuthorAliases 失败: %v", err)
	}
	for _, a := range aliases {
		if a.NormalizedName == "" {
			t.Error("作者别名的 normalized_name 不应为空")
		}
	}
}

// TestListBookAliasesOnFixture 在真实 fixture 上读取书名别名。
func TestListBookAliasesOnFixture(t *testing.T) {
	db := newSchemaDB(t)
	if _, err := ListBookAliases(db, 1); err != nil {
		t.Fatalf("ListBookAliases 失败: %v", err)
	}
}

// TestListPluginInstallationsOnFixture 在真实 fixture 上读取插件安装记录。
func TestListPluginInstallationsOnFixture(t *testing.T) {
	db := newSchemaDB(t)
	installs, err := ListPluginInstallations(db)
	if err != nil {
		t.Fatalf("ListPluginInstallations 失败: %v", err)
	}
	for _, i := range installs {
		if i.Config == nil {
			t.Errorf("安装记录 %d 的 Config 不应为 nil", i.ID)
		}
		if _, err := ListPluginConnections(db, i.ID); err != nil {
			t.Fatalf("ListPluginConnections 失败: %v", err)
		}
		if _, err := ListPluginPermissions(db, i.ID); err != nil {
			t.Fatalf("ListPluginPermissions 失败: %v", err)
		}
	}
}

// TestListAudiobookEditionsOnFixture 在真实 fixture 上读取有声书版本。
func TestListAudiobookEditionsOnFixture(t *testing.T) {
	db := newSchemaDB(t)
	editions, err := ListAudiobookEditions(db, 1)
	if err != nil {
		t.Fatalf("ListAudiobookEditions 失败: %v", err)
	}
	for _, e := range editions {
		if e.Config == nil {
			t.Errorf("有声书版本 %d 的 Config 不应为 nil", e.ID)
		}
		if _, err := ListAudiobookChapters(db, e.ID); err != nil {
			t.Fatalf("ListAudiobookChapters 失败: %v", err)
		}
	}
}

// TestListPodcastSubscriptionsOnFixture 在真实 fixture 上读取 Podcast 订阅。
func TestListPodcastSubscriptionsOnFixture(t *testing.T) {
	db := newSchemaDB(t)
	subs, err := ListPodcastSubscriptions(db, 1)
	if err != nil {
		t.Fatalf("ListPodcastSubscriptions 失败: %v", err)
	}
	for _, s := range subs {
		if s.HiddenBooks == nil {
			t.Errorf("订阅 %d 的 HiddenBooks 不应为 nil", s.ID)
		}
	}
}

// TestGetMissingRowsReturnNil 校验「不存在返回 nil」语义（在权威 schema 上）。
func TestGetMissingRowsReturnNil(t *testing.T) {
	db := newSchemaDB(t)
	const missing = 999999999

	if v, err := GetItem(db, missing); err != nil || v != nil {
		t.Errorf("GetItem 缺失行应返回 (nil,nil)，得到 (%v,%v)", v, err)
	}
	if v, err := GetReadingState(db, missing, missing); err != nil || v != nil {
		t.Errorf("GetReadingState 缺失行应返回 (nil,nil)，得到 (%v,%v)", v, err)
	}
	if v, err := GetOnlineBookMeta(db, missing); err != nil || v != nil {
		t.Errorf("GetOnlineBookMeta 缺失行应返回 (nil,nil)，得到 (%v,%v)", v, err)
	}
	if v, err := GetScanFileByID(db, missing); err != nil || v != nil {
		t.Errorf("GetScanFileByID 缺失行应返回 (nil,nil)，得到 (%v,%v)", v, err)
	}
	if v, err := GetAnnotationByID(db, missing); err != nil || v != nil {
		t.Errorf("GetAnnotationByID 缺失行应返回 (nil,nil)，得到 (%v,%v)", v, err)
	}
	if v, err := GetBookSourceByURL(db, "no-such-url"); err != nil || v != nil {
		t.Errorf("GetBookSourceByURL 缺失行应返回 (nil,nil)，得到 (%v,%v)", v, err)
	}
	if v, err := GetAuthorAlias(db, "no-such-author"); err != nil || v != nil {
		t.Errorf("GetAuthorAlias 缺失行应返回 (nil,nil)，得到 (%v,%v)", v, err)
	}
	if v, err := GetAudiobookEdition(db, missing); err != nil || v != nil {
		t.Errorf("GetAudiobookEdition 缺失行应返回 (nil,nil)，得到 (%v,%v)", v, err)
	}
	if v, err := GetAudiobookProgress(db, missing, missing); err != nil || v != nil {
		t.Errorf("GetAudiobookProgress 缺失行应返回 (nil,nil)，得到 (%v,%v)", v, err)
	}
	if v, err := GetPodcastSubscriptionByTokenHash(db, "no-such-token"); err != nil || v != nil {
		t.Errorf("GetPodcastSubscriptionByTokenHash 缺失行应返回 (nil,nil)，得到 (%v,%v)", v, err)
	}
	if v, err := GetPluginDefinitionByKeyVersion(db, "no-such", "0"); err != nil || v != nil {
		t.Errorf("GetPluginDefinitionByKeyVersion 缺失行应返回 (nil,nil)，得到 (%v,%v)", v, err)
	}
	if v, err := GetPluginInstallationByKey(db, "no-such"); err != nil || v != nil {
		t.Errorf("GetPluginInstallationByKey 缺失行应返回 (nil,nil)，得到 (%v,%v)", v, err)
	}
	if v, err := GetPluginSecretByID(db, missing); err != nil || v != nil {
		t.Errorf("GetPluginSecretByID 缺失行应返回 (nil,nil)，得到 (%v,%v)", v, err)
	}
}
