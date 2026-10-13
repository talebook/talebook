package userdb

import (
	"database/sql"
	"testing"
)

// exec 执行一条语句，失败即终止测试。
func exec(t *testing.T, db *sql.DB, query string, args ...any) {
	t.Helper()
	if _, err := db.Exec(query, args...); err != nil {
		t.Fatalf("执行失败: %v\n语句: %s", err, query)
	}
}

// seedAll 往权威 schema 库里插入覆盖各模型的样例数据。
func seedAll(t *testing.T, db *sql.DB) {
	t.Helper()

	exec(t, db, `INSERT INTO items (book_id, count_guest, count_visit, count_download, website,
		collector_id, scope, book_type, media_type, media_type_locked, create_time, src_path)
		VALUES (1, 2, 3, 4, 'w', 1, 'public', 'ebook', 'unknown', 1, '2026-01-01 00:00:00', '/p')`)
	exec(t, db, `INSERT INTO items (book_id, count_guest, count_visit, count_download, website,
		collector_id, scope, book_type, media_type, media_type_locked, create_time, src_path)
		VALUES (2, 0, 0, 0, '', NULL, 'public', 'ebook', 'unknown', 0, '', '')`)

	exec(t, db, `INSERT INTO reading_state (book_id, reader_id, favorite, favorite_date, wants,
		wants_date, read_state, read_date, online_read, download, progress, progress_update_time)
		VALUES (1, 1, 1, '2026-01-01 00:00:00', 1, '2026-01-01 00:00:00', 2, '2026-01-02 00:00:00',
		1, 1, '{"cfi":"x"}', '2026-01-02 00:00:00')`)
	exec(t, db, `INSERT INTO reading_state (book_id, reader_id, favorite, wants, read_state, progress)
		VALUES (2, 1, 0, 0, 0, NULL)`)

	exec(t, db, `INSERT INTO online_book_meta (book_id, source_url, origin_book_url, serialize_status,
		status_manual, last_chapter, create_time, update_time, data)
		VALUES (1, 's', 'o', 'serial', 1, 'c1', '2026-01-01 00:00:00', '2026-01-01 00:00:00', '{"k":1}')`)
	exec(t, db, `INSERT INTO online_book_meta (book_id, serialize_status, status_manual, data)
		VALUES (2, 'unknown', 0, NULL)`)

	exec(t, db, `INSERT INTO book_aliases (id, book_id, name, normalized_name) VALUES (1, 1, 'n', 'nn')`)
	exec(t, db, `INSERT INTO author_aliases (normalized_name, name, canonical_name,
		canonical_normalized_name) VALUES ('nn', 'n', 'c', 'cn')`)

	exec(t, db, `INSERT INTO scanfiles (id, scan_id, import_id, name, path, hash, status, title,
		author, publisher, tags, create_time, update_time, book_id, data)
		VALUES (1, 5, 6, 'n', '/p', 'h', 'new', 't', 'a', 'pub', 'tg',
		'2026-01-01 00:00:00', '2026-01-01 00:00:00', 1, '{"k":1}')`)
	exec(t, db, `INSERT INTO scanfiles (id, scan_id, status, data) VALUES (2, 5, 'ready', NULL)`)

	exec(t, db, `INSERT INTO messages (id, title, status, unread, create_time, update_time, data, reader_id)
		VALUES (1, 't', 's', 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00', '{"message":"m"}', 1)`)
	exec(t, db, `INSERT INTO messages (id, title, status, unread, data, reader_id)
		VALUES (2, 't2', 's', 0, NULL, 1)`)

	exec(t, db, `INSERT INTO devices (id, reader_id, name, device_type, ip, port, schema, mailbox,
		create_time, update_time) VALUES (1, 1, 'd', 'duokan', '1.2.3.4', 12121, 'http', 'm',
		'2026-01-01 00:00:00', '2026-01-01 00:00:00')`)

	exec(t, db, `INSERT INTO installed_themes (id, name, version, author, description, active,
		installed_at, data) VALUES (1, 't', '1', 'a', 'd', 1, '2026-01-01 00:00:00',
		'{"components":{"c":1}}')`)
	exec(t, db, `INSERT INTO installed_themes (id, name, active, data) VALUES (2, 't2', 0, NULL)`)

	exec(t, db, `INSERT INTO opds_sources (id, name, url, description, active, create_time,
		update_time, data) VALUES (1, 'n', 'u', 'd', 1, '2026-01-01 00:00:00',
		'2026-01-01 00:00:00', '{"k":1}')`)
	exec(t, db, `INSERT INTO opds_sources (id, name, url, active, data) VALUES (2, 'n2', 'u2', 0, NULL)`)

	exec(t, db, `INSERT INTO annotations (id, reader_id, book_id, client_id, annotation_type,
		is_private, cfi, chapter, quote_text, content, color, author_name, user_modified_at,
		create_time, update_time) VALUES (1, 1, 1, 'c', 'highlight', 1, 'cfi', 'ch', 'q', 't',
		'yellow', 'au', '2026-01-01 00:00:00', '2026-01-01 00:00:00', '2026-01-01 00:00:00')`)
	exec(t, db, `INSERT INTO annotations (id, reader_id, book_id, annotation_type, is_private,
		create_time, update_time) VALUES (2, 1, 1, 'note', 0, '2026-01-01 00:00:00', '2026-01-01 00:00:00')`)
	exec(t, db, `INSERT INTO annotation_sources (id, annotation_id, source_name,
		source_connection_id, source_sync_status, create_time, update_time)
		VALUES (1, 1, 's', 'c', 'synced', '2026-01-01 00:00:00', '2026-01-01 00:00:00')`)

	exec(t, db, `INSERT INTO book_sources (id, name, url, "group", source_type, enabled, weight,
		comment, last_check_time, last_check_ok, check_status, check_message, check_tags,
		create_time, update_time, raw) VALUES (1, 'n', 'u', 'g', 1, 1, 2, 'c',
		'2026-01-01 00:00:00', 1, 'ok', 'm', '["t"]', '2026-01-01 00:00:00',
		'2026-01-01 00:00:00', '{"bookSourceName":"n"}')`)
	exec(t, db, `INSERT INTO book_sources (id, name, url, enabled, check_tags, raw)
		VALUES (2, 'n2', 'u2', 0, NULL, NULL)`)

	exec(t, db, `INSERT INTO audiobook_editions (id, book_id, status, engine, config,
		source_fingerprint, script_path, manifest_path, chapter_count, completed_count, duration_ms,
		size_bytes, created_by, create_time, update_time, published_at)
		VALUES (1, 1, 'published', 'edgetts', '{"v":1}', 'fp', 'sp', 'mp', 3, 2, 100, 200, 1,
		'2026-01-01 00:00:00', '2026-01-01 00:00:00', '2026-01-02 00:00:00')`)
	exec(t, db, `INSERT INTO audiobook_editions (id, book_id, status, engine, created_by,
		create_time, update_time) VALUES (2, 1, 'draft', 'edgetts', 1,
		'2026-01-01 00:00:00', '2026-01-01 00:00:00')`)

	exec(t, db, `INSERT INTO audiobook_chapters (id, edition_id, source_key, number, title,
		audio_path, timeline_path, duration_ms, size_bytes, content_hash, episode_guid,
		first_published_at) VALUES (1, 1, 'sk', 1, 'ch1', 'ap', 'tp', 10, 20, 'h', 'g',
		'2026-01-01 00:00:00')`)

	exec(t, db, `INSERT INTO audiobook_progress (id, reader_id, edition_id, chapter_id, position_ms,
		segment_id, listened_ms, is_finished, version, update_time)
		VALUES (1, 1, 1, 1, 500, 'seg', 100, 1, 2, '2026-01-01 00:00:00')`)
	exec(t, db, `INSERT INTO audiobook_progress (id, reader_id, edition_id, is_finished, update_time)
		VALUES (2, 1, 2, 0, '2026-01-01 00:00:00')`)

	exec(t, db, `INSERT INTO audiobook_bookmarks (id, reader_id, edition_id, chapter_id, position_ms,
		segment_id, note, create_time) VALUES (1, 1, 1, 1, 100, 'seg', 'n', '2026-01-01 00:00:00')`)

	exec(t, db, `INSERT INTO podcast_subscriptions (id, reader_id, token_hash, token_hint, active,
		hidden_books, create_time, last_access_at, revoked_at, frozen_at, frozen_reason)
		VALUES (1, 1, 'th', 'hint', 1, '{"b":1}', '2026-01-01 00:00:00', '2026-01-02 00:00:00',
		NULL, NULL, '')`)
	exec(t, db, `INSERT INTO podcast_subscriptions (id, reader_id, token_hash, active, hidden_books,
		create_time) VALUES (2, 1, 'th2', 0, NULL, '2026-01-01 00:00:00')`)

	exec(t, db, `INSERT INTO plugin_definitions (id, plugin_key, version, protocol_version, name,
		runtime_kind, categories, capabilities, actions, auth_schema, config_schema, permissions,
		data_policy, compatibility, homepage, license, manifest, create_time)
		VALUES (1, 'k', '1', 'pv', 'n', 'builtin', '["c"]', '[]', '[]', '{}', '{}', '[]', '{}',
		'{}', 'h', 'MIT', '{"description":"d","ui":{"tab":"t"},"connection_owners":["instance"]}',
		'2026-01-01 00:00:00')`)

	exec(t, db, `INSERT INTO plugin_installations (id, plugin_key, definition_id, version, enabled,
		scope, config, installed_from, checksum, status, installed_by, create_time, update_time)
		VALUES (1, 'k', 1, '1', 1, 'instance', '{"c":1}', 'builtin', 'cs', 'active', 1,
		'2026-01-01 00:00:00', '2026-01-01 00:00:00')`)
	exec(t, db, `INSERT INTO plugin_installations (id, plugin_key, definition_id, version, enabled,
		scope, status, installed_by, create_time, update_time)
		VALUES (2, 'k2', 1, '1', 0, 'instance', 'active', 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00')`)

	exec(t, db, `INSERT INTO plugin_secrets (id, owner_type, owner_id, kind, ciphertext, key_id,
		version, mask_hint, create_time, last_rotated_at)
		VALUES (1, 'instance', 0, 'credentials', 'enc', 'kid', 1, 'ab', '2026-01-01 00:00:00',
		'2026-01-01 00:00:00')`)

	exec(t, db, `INSERT INTO plugin_connections (id, installation_id, owner_type, owner_id, role,
		name, secret_id, config, scopes, schedule, cursor, health, health_message, enabled,
		lease_token, lease_until, create_time, update_time)
		VALUES (1, 1, 'instance', 0, 'default', 'n', 1, '{"c":1}', '["s"]', 'sch', '{"cur":1}',
		'healthy', 'hm', 1, 'lt', '2026-01-01 00:00:00', '2026-01-01 00:00:00',
		'2026-01-01 00:00:00')`)
	exec(t, db, `INSERT INTO plugin_connections (id, installation_id, owner_type, owner_id, role,
		name, scopes, health, enabled, create_time, update_time)
		VALUES (2, 1, 'instance', 0, 'secondary', 'n2', '[]', 'unknown', 0, '2026-01-01 00:00:00',
		'2026-01-01 00:00:00')`)

	exec(t, db, `INSERT INTO plugin_runs (id, connection_id, parent_run_id, action, trigger, status,
		requested_by, counts, cursor_before, cursor_after, input_data, error_code, error_message,
		attempt, duration_ms, create_time, started_at, finished_at)
		VALUES (1, 1, NULL, 'sync', 'manual', 'done', 1, '{"n":1}', '{}', '{}', '{"secret":"x"}',
		'', '', 1, 5, '2026-01-01 00:00:00', '2026-01-01 00:00:00', '2026-01-01 00:00:00')`)

	exec(t, db, `INSERT INTO plugin_permissions (id, installation_id, permission, scope,
		approved_by, approved_at, revoked_at) VALUES (1, 1, 'p', 'instance', 1,
		'2026-01-01 00:00:00', NULL)`)
}

// TestReadPathsWithRows 覆盖各读取函数的成功路径（含多行扫描）。
func TestReadPathsWithRows(t *testing.T) {
	db := newSchemaDB(t)
	seedAll(t, db)

	it, err := GetItem(db, 1)
	if err != nil || it == nil {
		t.Fatalf("GetItem = (%v,%v)", it, err)
	}
	if !it.MediaTypeLocked || it.CollectorID.Int64 != 1 {
		t.Errorf("GetItem = %+v", it)
	}
	it2, err := GetItem(db, 2)
	if err != nil || it2 == nil {
		t.Fatalf("GetItem(2) = (%v,%v)", it2, err)
	}
	if it2.CollectorID.Valid {
		t.Error("NULL collector_id 应为无效")
	}

	rs, err := GetReadingState(db, 1, 1)
	if err != nil || rs == nil {
		t.Fatalf("GetReadingState = (%v,%v)", rs, err)
	}
	if !rs.IsFavorite() || !rs.IsWants() || rs.GetReadState() != ReadStateFinished {
		t.Errorf("GetReadingState = %+v", rs)
	}
	if rs.GetProgress()["cfi"] != "x" {
		t.Errorf("progress = %v", rs.GetProgress())
	}
	rs2, err := GetReadingState(db, 2, 1)
	if err != nil || rs2 == nil {
		t.Fatalf("GetReadingState(2) = (%v,%v)", rs2, err)
	}
	if len(rs2.GetProgress()) != 0 {
		t.Errorf("NULL progress 应为空 map，得到 %v", rs2.GetProgress())
	}

	m, err := GetOnlineBookMeta(db, 1)
	if err != nil || m == nil {
		t.Fatalf("GetOnlineBookMeta = (%v,%v)", m, err)
	}
	if !m.StatusManual || m.ToDict()["serialize_status"] != SerializeStatusSerial {
		t.Errorf("GetOnlineBookMeta = %+v", m)
	}
	if _, err := GetOnlineBookMeta(db, 2); err != nil {
		t.Fatalf("GetOnlineBookMeta(2) 失败: %v", err)
	}

	aliases, err := ListBookAliases(db, 1)
	if err != nil || len(aliases) != 1 {
		t.Fatalf("ListBookAliases = (%v,%v)", aliases, err)
	}
	aa, err := GetAuthorAlias(db, "nn")
	if err != nil || aa == nil || aa.CanonicalName != "c" {
		t.Fatalf("GetAuthorAlias = (%v,%v)", aa, err)
	}
	if all, err := ListAuthorAliases(db); err != nil || len(all) != 1 {
		t.Fatalf("ListAuthorAliases = (%v,%v)", all, err)
	}

	sf, err := GetScanFileByID(db, 1)
	if err != nil || sf == nil || sf.Data["k"] != float64(1) {
		t.Fatalf("GetScanFileByID = (%v,%v)", sf, err)
	}
	if files, err := ListScanFilesByScanID(db, 5); err != nil || len(files) != 2 {
		t.Fatalf("ListScanFilesByScanID = (%v,%v)", files, err)
	}

	msgs, err := ListMessages(db, 1, 10)
	if err != nil || len(msgs) != 2 {
		t.Fatalf("ListMessages = (%v,%v)", msgs, err)
	}
	// ListMessages 按 id 降序，msgs[0] 是 id=2（unread=0），msgs[1] 是 id=1（unread=1）。
	if msgs[0].ID != 2 || msgs[0].Unread {
		t.Errorf("msgs[0] 应为 id=2 且已读，得到 %+v", msgs[0])
	}
	if msgs[1].ID != 1 || !msgs[1].Unread {
		t.Errorf("msgs[1] 应为 id=1 且未读，得到 %+v", msgs[1])
	}
	if n, err := CountUnreadMessages(db, 1); err != nil || n != 1 {
		t.Fatalf("CountUnreadMessages = (%d,%v)", n, err)
	}

	if devs, err := ListDevices(db, 1); err != nil || len(devs) != 1 {
		t.Fatalf("ListDevices = (%v,%v)", devs, err)
	}

	themes, err := ListInstalledThemes(db)
	if err != nil || len(themes) != 2 {
		t.Fatalf("ListInstalledThemes = (%v,%v)", themes, err)
	}
	if !themes[0].Active {
		t.Error("主题 1 应为启用")
	}

	if srcs, err := ListOpdsSources(db); err != nil || len(srcs) != 2 {
		t.Fatalf("ListOpdsSources = (%v,%v)", srcs, err)
	}

	ann, err := GetAnnotationByID(db, 1)
	if err != nil || ann == nil || !ann.IsPrivate {
		t.Fatalf("GetAnnotationByID = (%v,%v)", ann, err)
	}
	if anns, err := ListAnnotations(db, 1, 1); err != nil || len(anns) != 2 {
		t.Fatalf("ListAnnotations = (%v,%v)", anns, err)
	}
	if ss, err := ListAnnotationSources(db, 1); err != nil || len(ss) != 1 {
		t.Fatalf("ListAnnotationSources = (%v,%v)", ss, err)
	}

	bs, err := ListBookSources(db)
	if err != nil || len(bs) != 2 {
		t.Fatalf("ListBookSources = (%v,%v)", bs, err)
	}
	if !bs[0].Enabled || bs[0].Group != "g" || len(bs[0].CheckTags) != 1 {
		t.Errorf("书源 1 = %+v", bs[0])
	}
	one, err := GetBookSourceByURL(db, "u")
	if err != nil || one == nil || one.Name != "n" {
		t.Fatalf("GetBookSourceByURL = (%v,%v)", one, err)
	}

	eds, err := ListAudiobookEditions(db, 1)
	if err != nil || len(eds) != 2 {
		t.Fatalf("ListAudiobookEditions = (%v,%v)", eds, err)
	}
	if eds[0].Config["v"] != float64(1) {
		t.Errorf("版本 config = %v", eds[0].Config)
	}
	if ed, err := GetAudiobookEdition(db, 1); err != nil || ed == nil || ed.ChapterCount != 3 {
		t.Fatalf("GetAudiobookEdition = (%v,%v)", ed, err)
	}
	if chs, err := ListAudiobookChapters(db, 1); err != nil || len(chs) != 1 {
		t.Fatalf("ListAudiobookChapters = (%v,%v)", chs, err)
	}

	ap, err := GetAudiobookProgress(db, 1, 1)
	if err != nil || ap == nil || !ap.IsFinished || !ap.ChapterID.Valid {
		t.Fatalf("GetAudiobookProgress = (%v,%v)", ap, err)
	}
	ap2, err := GetAudiobookProgress(db, 1, 2)
	if err != nil || ap2 == nil || ap2.IsFinished || ap2.ChapterID.Valid {
		t.Fatalf("GetAudiobookProgress(2) = (%v,%v)", ap2, err)
	}
	if bms, err := ListAudiobookBookmarks(db, 1, 1); err != nil || len(bms) != 1 {
		t.Fatalf("ListAudiobookBookmarks = (%v,%v)", bms, err)
	}

	sub, err := GetPodcastSubscriptionByTokenHash(db, "th")
	if err != nil || sub == nil || !sub.Active || sub.HiddenBooks["b"] != float64(1) {
		t.Fatalf("GetPodcastSubscriptionByTokenHash = (%v,%v)", sub, err)
	}
	if subs, err := ListPodcastSubscriptions(db, 1); err != nil || len(subs) != 2 {
		t.Fatalf("ListPodcastSubscriptions = (%v,%v)", subs, err)
	}

	def, err := GetPluginDefinitionByKeyVersion(db, "k", "1")
	if err != nil || def == nil || len(def.Categories) != 1 {
		t.Fatalf("GetPluginDefinitionByKeyVersion = (%v,%v)", def, err)
	}
	if def.ToPublic()["description"] != "d" {
		t.Errorf("definition ToPublic = %v", def.ToPublic())
	}

	inst, err := GetPluginInstallationByKey(db, "k")
	if err != nil || inst == nil || !inst.Enabled || inst.Config["c"] != float64(1) {
		t.Fatalf("GetPluginInstallationByKey = (%v,%v)", inst, err)
	}
	if insts, err := ListPluginInstallations(db); err != nil || len(insts) != 2 {
		t.Fatalf("ListPluginInstallations = (%v,%v)", insts, err)
	}

	sec, err := GetPluginSecretByID(db, 1)
	if err != nil || sec == nil || sec.Ciphertext != "enc" {
		t.Fatalf("GetPluginSecretByID = (%v,%v)", sec, err)
	}

	conns, err := ListPluginConnections(db, 1)
	if err != nil || len(conns) != 2 {
		t.Fatalf("ListPluginConnections = (%v,%v)", conns, err)
	}
	if !conns[0].Enabled || len(conns[0].Scopes) != 1 || conns[0].Cursor["cur"] != float64(1) {
		t.Errorf("连接 1 = %+v", conns[0])
	}
	if conns[0].ToPublic(sec)["secret"].(map[string]any)["configured"] != true {
		t.Error("连接 1 应报告密钥已配置")
	}

	runs, err := ListPluginRuns(db, 1, 10)
	if err != nil || len(runs) != 1 {
		t.Fatalf("ListPluginRuns = (%v,%v)", runs, err)
	}
	if _, leaked := runs[0].ToPublic()["input_data"]; leaked {
		t.Error("PluginRun.ToPublic 不得含 input_data")
	}

	if perms, err := ListPluginPermissions(db, 1); err != nil || len(perms) != 1 {
		t.Fatalf("ListPluginPermissions = (%v,%v)", perms, err)
	}
}

// TestReadPathsOnClosedDB 覆盖各读取函数的错误分支（库已关闭）。
func TestReadPathsOnClosedDB(t *testing.T) {
	db := newSchemaDB(t)
	db.Close()

	if _, err := GetItem(db, 1); err == nil {
		t.Error("GetItem 在关闭的库上应报错")
	}
	if _, err := GetReadingState(db, 1, 1); err == nil {
		t.Error("GetReadingState 在关闭的库上应报错")
	}
	if _, err := GetOnlineBookMeta(db, 1); err == nil {
		t.Error("GetOnlineBookMeta 在关闭的库上应报错")
	}
	if _, err := ListBookAliases(db, 1); err == nil {
		t.Error("ListBookAliases 在关闭的库上应报错")
	}
	if _, err := GetAuthorAlias(db, "x"); err == nil {
		t.Error("GetAuthorAlias 在关闭的库上应报错")
	}
	if _, err := ListAuthorAliases(db); err == nil {
		t.Error("ListAuthorAliases 在关闭的库上应报错")
	}
	if _, err := GetScanFileByID(db, 1); err == nil {
		t.Error("GetScanFileByID 在关闭的库上应报错")
	}
	if _, err := ListScanFilesByScanID(db, 1); err == nil {
		t.Error("ListScanFilesByScanID 在关闭的库上应报错")
	}
	if _, err := ListMessages(db, 1, 10); err == nil {
		t.Error("ListMessages 在关闭的库上应报错")
	}
	if _, err := CountUnreadMessages(db, 1); err == nil {
		t.Error("CountUnreadMessages 在关闭的库上应报错")
	}
	if _, err := ListDevices(db, 1); err == nil {
		t.Error("ListDevices 在关闭的库上应报错")
	}
	if _, err := ListInstalledThemes(db); err == nil {
		t.Error("ListInstalledThemes 在关闭的库上应报错")
	}
	if _, err := ListOpdsSources(db); err == nil {
		t.Error("ListOpdsSources 在关闭的库上应报错")
	}
	if _, err := GetAnnotationByID(db, 1); err == nil {
		t.Error("GetAnnotationByID 在关闭的库上应报错")
	}
	if _, err := ListAnnotations(db, 1, 1); err == nil {
		t.Error("ListAnnotations 在关闭的库上应报错")
	}
	if _, err := ListAnnotationSources(db, 1); err == nil {
		t.Error("ListAnnotationSources 在关闭的库上应报错")
	}
	if _, err := ListBookSources(db); err == nil {
		t.Error("ListBookSources 在关闭的库上应报错")
	}
	if _, err := GetBookSourceByURL(db, "u"); err == nil {
		t.Error("GetBookSourceByURL 在关闭的库上应报错")
	}
	if _, err := GetAudiobookEdition(db, 1); err == nil {
		t.Error("GetAudiobookEdition 在关闭的库上应报错")
	}
	if _, err := ListAudiobookEditions(db, 1); err == nil {
		t.Error("ListAudiobookEditions 在关闭的库上应报错")
	}
	if _, err := ListAudiobookChapters(db, 1); err == nil {
		t.Error("ListAudiobookChapters 在关闭的库上应报错")
	}
	if _, err := GetAudiobookProgress(db, 1, 1); err == nil {
		t.Error("GetAudiobookProgress 在关闭的库上应报错")
	}
	if _, err := ListAudiobookBookmarks(db, 1, 1); err == nil {
		t.Error("ListAudiobookBookmarks 在关闭的库上应报错")
	}
	if _, err := GetPodcastSubscriptionByTokenHash(db, "t"); err == nil {
		t.Error("GetPodcastSubscriptionByTokenHash 在关闭的库上应报错")
	}
	if _, err := ListPodcastSubscriptions(db, 1); err == nil {
		t.Error("ListPodcastSubscriptions 在关闭的库上应报错")
	}
	if _, err := GetPluginDefinitionByKeyVersion(db, "k", "1"); err == nil {
		t.Error("GetPluginDefinitionByKeyVersion 在关闭的库上应报错")
	}
	if _, err := GetPluginInstallationByKey(db, "k"); err == nil {
		t.Error("GetPluginInstallationByKey 在关闭的库上应报错")
	}
	if _, err := ListPluginInstallations(db); err == nil {
		t.Error("ListPluginInstallations 在关闭的库上应报错")
	}
	if _, err := GetPluginSecretByID(db, 1); err == nil {
		t.Error("GetPluginSecretByID 在关闭的库上应报错")
	}
	if _, err := ListPluginConnections(db, 1); err == nil {
		t.Error("ListPluginConnections 在关闭的库上应报错")
	}
	if _, err := ListPluginRuns(db, 1, 10); err == nil {
		t.Error("ListPluginRuns 在关闭的库上应报错")
	}
	if _, err := ListPluginPermissions(db, 1); err == nil {
		t.Error("ListPluginPermissions 在关闭的库上应报错")
	}
}
