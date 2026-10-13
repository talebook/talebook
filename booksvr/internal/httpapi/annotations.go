// 本文件实现 webserver/handlers/annotations.py 的 4 条批注路由。
//
// 批注是「用户私有内容 + 可选外部来源副本」的两层结构：
//   - annotations 表存权威内容；
//   - annotation_sources 表存外部副本与同步状态。
//
// 外部同步（AnnotationSyncService）依赖插件运行时；未安装 annotations.push
// 插件时它不做任何事。Go 侧把它抽象为 AnnotationSyncer 接口，默认实现为空操作，
// 与 Python 在无插件时的行为一致。
package httpapi

import (
	"database/sql"
	"net/http"
	"strconv"
	"strings"
	"time"

	"talebook/booksvr/internal/userdb"
)

// annotationTypes 对齐 Python 的 ANNOTATION_TYPES。
var annotationTypes = map[string]bool{
	"highlight":       true,
	"note":            true,
	"bookmark":        true,
	"chapter_comment": true,
}

// sourceFilters 对齐 Python 的 SOURCE_FILTERS。
var sourceFilters = []string{
	"source_name",
	"source_connection_id",
	"source_annotation_id",
	"source_run_id",
	"source_sync_status",
}

// sourceDeleteFilters 对齐 Python 的 SOURCE_DELETE_FILTERS（去掉最后一项）。
var sourceDeleteFilters = sourceFilters[:len(sourceFilters)-1]

// sourceFieldLimits 对齐 Python 的 SOURCE_FIELD_LIMITS。
var sourceFieldLimits = map[string]int{
	"source_name":          64,
	"source_connection_id": 128,
	"source_annotation_id": 255,
	"source_run_id":        128,
	"source_raw_hash":      128,
}

// sourceInputFields 对齐 Python 的 SOURCE_INPUT_FIELDS。
var sourceInputFields = map[string]bool{
	"source_name":          true,
	"source_connection_id": true,
	"source_annotation_id": true,
	"source_run_id":        true,
	"source_raw_hash":      true,
	"source_position":      true,
	"source_updated_at":    true,
}

// legacySourceFields 对齐 Python 的 LEGACY_SOURCE_FIELDS（已废弃的入参名）。
var legacySourceFields = []string{
	"source", "external_id", "connection_id", "run_id", "raw_hash", "remote_updated_at",
}

// AnnotationSyncer 把公开批注扇出到外部插件连接。
//
// 未安装 annotations.push 插件时不做任何事，与 Python 的 AnnotationSyncService
// 在无 writer 时的行为一致。
type AnnotationSyncer interface {
	// SyncAnnotation 同步一条批注；excludeSourceName/excludeConnectionID 用于跳过来源自身。
	SyncAnnotation(annotationID int64, excludeSourceName, excludeConnectionID string)
}

// noopAnnotationSyncer 是默认实现：无插件时不做事。
type noopAnnotationSyncer struct{}

// SyncAnnotation 不做任何事。
func (noopAnnotationSyncer) SyncAnnotation(int64, string, string) {}

// annotationDict 复刻 Python 的 _annotation_dict：在 to_api_dict 基础上加 can_edit。
func annotationDict(a *userdb.Annotation, sources []*userdb.AnnotationSource, userID int64) map[string]any {
	data := a.ToAPI(sources)
	data["can_edit"] = a.ReaderID == userID
	return data
}

// loadAnnotationSources 读取批注的全部外部副本。
func loadAnnotationSources(db *sql.DB, annotationID int64) ([]*userdb.AnnotationSource, error) {
	return userdb.ListAnnotationSources(db, annotationID)
}

// annotationWithSources 组装带 sources 的响应对象。
func annotationWithSources(db *sql.DB, a *userdb.Annotation, userID int64) (map[string]any, error) {
	sources, err := loadAnnotationSources(db, a.ID)
	if err != nil {
		return nil, err
	}
	return annotationDict(a, sources, userID), nil
}

// parseDatetime 复刻 Python 的 _parse_datetime。
//
// 返回 (解析结果, 是否非法)。空值返回 ("", false)。
func parseDatetime(value any) (string, bool) {
	if value == nil {
		return "", false
	}
	s, ok := value.(string)
	if !ok {
		return "", true
	}
	if s == "" {
		return "", false
	}
	// 接受 RFC3339 / ISO8601；带时区时转成 UTC 的朴素时间。
	for _, layout := range []string{time.RFC3339Nano, time.RFC3339, "2006-01-02T15:04:05", "2006-01-02 15:04:05"} {
		if t, err := time.Parse(layout, s); err == nil {
			if t.Location() != time.UTC && strings.ContainsAny(s, "Z+") {
				t = t.UTC()
			}
			return t.Format("2006-01-02 15:04:05"), false
		}
	}
	return "", true
}

// asBool 复刻 Python 的 _as_bool。
func asBool(value any) bool {
	if b, ok := value.(bool); ok {
		return b
	}
	s := strings.ToLower(strings.TrimSpace(toStr(value)))
	switch s {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}

// toStr 把任意值转成字符串，对齐 Python 的 str()。
func toStr(v any) string {
	switch x := v.(type) {
	case nil:
		return ""
	case string:
		return x
	case bool:
		if x {
			return "True"
		}
		return "False"
	case float64:
		return strconv.FormatFloat(x, 'f', -1, 64)
	case int64:
		return strconv.FormatInt(x, 10)
	default:
		return ""
	}
}

// truncate 按字符数截断，对齐 Python 的 `str(x)[:n]`。
func truncate(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n])
}

// sourceIdentity 复刻 Python 的 _source_identity。
func sourceIdentity(data map[string]any) (name, connectionID, annotationID string) {
	name = strings.TrimSpace(toStr(data["source_name"]))
	connectionID = strings.TrimSpace(toStr(data["source_connection_id"]))
	annotationID = strings.TrimSpace(toStr(data["source_annotation_id"]))
	return name, connectionID, annotationID
}

// sourceFieldsAreValid 复刻 Python 的 _source_fields_are_valid。
func sourceFieldsAreValid(data map[string]any) bool {
	for field, limit := range sourceFieldLimits {
		v, present := data[field]
		if !present || v == nil {
			continue
		}
		s, ok := v.(string)
		if !ok {
			return false
		}
		if s == "" {
			continue
		}
		if len([]rune(s)) > limit {
			return false
		}
	}
	return true
}

// BookAnnotationsHandler 实现 /api/book/([0-9]+)/annotations（GET/POST，需登录）。
func BookAnnotationsHandler(syncer AnnotationSyncer) HandlerFunc {
	if syncer == nil {
		syncer = noopAnnotationSyncer{}
	}
	return func(ctx *Context) (map[string]any, error) {
		bookID, err := strconv.ParseInt(ctx.Param(0), 10, 64)
		if err != nil {
			return map[string]any{"err": "params.book.invalid", "msg": "书籍已不存在或无权访问"}, nil
		}
		if !bookAccessible(ctx, bookID) {
			return map[string]any{"err": "params.book.invalid", "msg": "书籍已不存在或无权访问"}, nil
		}
		if ctx.Request.Method == http.MethodPost {
			return bookAnnotationsCreate(ctx, syncer, bookID)
		}
		return bookAnnotationsList(ctx, bookID)
	}
}

// bookAnnotationsList 对齐 BookAnnotations.get。
func bookAnnotationsList(ctx *Context, bookID int64) (map[string]any, error) {
	scope := ctx.Request.URL.Query().Get("scope")
	if scope == "" {
		scope = "visible"
	}
	if scope != "visible" && scope != "public" && scope != "mine" {
		return map[string]any{"err": "params.invalid", "msg": "笔记范围错误"}, nil
	}

	annotations, err := userdb.ListAnnotationsForBook(ctx.DB, bookID, ctx.Identity.UserID, scope)
	if err != nil {
		return nil, err
	}

	// chapter 过滤（截断到 500）。
	if chapter := ctx.Request.URL.Query().Get("chapter"); chapter != "" {
		chapter = truncate(chapter, 500)
		filtered := annotations[:0]
		for _, a := range annotations {
			if a.Chapter == chapter {
				filtered = append(filtered, a)
			}
		}
		annotations = filtered
	}

	// source_* 过滤。
	annotations, err = filterBySource(ctx, annotations)
	if err != nil {
		return nil, err
	}

	out := make([]map[string]any, 0, len(annotations))
	for _, a := range annotations {
		item, err := annotationWithSources(ctx.DB, a, ctx.Identity.UserID)
		if err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return map[string]any{"err": "ok", "annotations": out}, nil
}

// filterBySource 按 source_* 查询参数过滤批注（对齐 _apply_filters 的 join 语义）。
func filterBySource(ctx *Context, annotations []*userdb.Annotation) ([]*userdb.Annotation, error) {
	active := map[string]string{}
	for _, f := range sourceFilters {
		if v := ctx.Request.URL.Query().Get(f); v != "" {
			active[f] = v
		}
	}
	if len(active) == 0 {
		return annotations, nil
	}

	out := []*userdb.Annotation{}
	for _, a := range annotations {
		sources, err := loadAnnotationSources(ctx.DB, a.ID)
		if err != nil {
			return nil, err
		}
		for _, s := range sources {
			if sourceMatches(s, active) {
				out = append(out, a)
				break
			}
		}
	}
	return out, nil
}

// sourceMatches 判断一条来源副本是否满足全部过滤条件。
func sourceMatches(s *userdb.AnnotationSource, active map[string]string) bool {
	for field, want := range active {
		var got string
		switch field {
		case "source_name":
			got = s.SourceName
		case "source_connection_id":
			got = s.SourceConnectionID
		case "source_annotation_id":
			got = s.SourceAnnotationID
		case "source_run_id":
			got = s.SourceRunID
		case "source_sync_status":
			got = s.SourceSyncStatus
		}
		if got != want {
			return false
		}
	}
	return true
}

// bookAnnotationsCreate 对齐 BookAnnotations.post。
func bookAnnotationsCreate(ctx *Context, syncer AnnotationSyncer, bookID int64) (map[string]any, error) {
	data, ok := decodeJSONObject(ctx.Request)
	if !ok {
		return map[string]any{"err": "params.invalid", "msg": "笔记参数错误"}, nil
	}

	annotationType := toStr(data["annotation_type"])
	clientID := strings.TrimSpace(toStr(data["client_id"]))
	sourceName, sourceConnectionID, sourceAnnotationID := sourceIdentity(data)

	hasSourceFields := false
	for f := range sourceInputFields {
		if _, present := data[f]; present {
			hasSourceFields = true
			break
		}
	}
	hasLegacy := false
	for _, f := range legacySourceFields {
		if _, present := data[f]; present {
			hasLegacy = true
			break
		}
	}

	if !annotationTypes[annotationType] ||
		(clientID == "" && sourceAnnotationID == "") ||
		sourceName == "talebook" ||
		hasSourceFields != (sourceName != "") ||
		(sourceName != "" && sourceAnnotationID == "") ||
		(clientID != "" && len([]rune(clientID)) > 64) ||
		hasLegacy ||
		!sourceFieldsAreValid(data) {
		return map[string]any{"err": "params.invalid", "msg": "笔记类型或来源标识错误"}, nil
	}

	sourceUpdatedAt, invalidTime := parseDatetime(data["source_updated_at"])
	if invalidTime {
		return map[string]any{"err": "params.invalid", "msg": "来源更新时间格式错误"}, nil
	}

	ownerID := ctx.Identity.UserID
	var source *userdb.AnnotationSource
	var annotation *userdb.Annotation
	var err error

	if sourceName != "" {
		source, err = userdb.FindAnnotationSource(ctx.DB, ownerID, bookID, sourceName, sourceConnectionID, sourceAnnotationID)
		if err != nil {
			return nil, err
		}
		if source != nil {
			annotation, err = userdb.GetAnnotationByID(ctx.DB, source.AnnotationID)
			if err != nil {
				return nil, err
			}
		}
	}
	if annotation == nil && clientID != "" {
		annotation, err = userdb.FindAnnotationByClientID(ctx.DB, ownerID, bookID, clientID)
		if err != nil {
			return nil, err
		}
	}

	created := annotation == nil
	now := nowTimestamp()

	if created {
		annotation = &userdb.Annotation{
			ReaderID:       ownerID,
			BookID:         bookID,
			ClientID:       clientID,
			AnnotationType: annotationType,
			IsPrivate:      asBoolDefault(data["is_private"], true),
		}
		id, err := userdb.CreateAnnotation(ctx.DB, annotation)
		if err != nil {
			return nil, err
		}
		annotation.ID = id
	} else if clientID != "" && annotation.ClientID == "" {
		if err := userdb.SetAnnotationClientID(ctx.DB, annotation.ID, clientID); err != nil {
			return nil, err
		}
		annotation.ClientID = clientID
	}

	if sourceName != "" && source == nil {
		source = &userdb.AnnotationSource{
			AnnotationID:       annotation.ID,
			SourceName:         sourceName,
			SourceConnectionID: sourceConnectionID,
			SourceAnnotationID: sourceAnnotationID,
			SourceRunID:        toStr(data["source_run_id"]),
			SourcePosition:     toStr(data["source_position"]),
			SourceRawHash:      toStr(data["source_raw_hash"]),
			SourceUpdatedAt:    sourceUpdatedAt,
		}
		if err := userdb.CreateAnnotationSource(ctx.DB, source); err != nil {
			return nil, err
		}
	}

	// 旧数据保护：来源时间更早且哈希不同 → 忽略本次更新。
	if source != nil && !created {
		incomingHash := toStr(data["source_raw_hash"])
		if sourceUpdatedAt != "" && source.SourceUpdatedAt != "" &&
			sourceUpdatedAt < source.SourceUpdatedAt && incomingHash != source.SourceRawHash {
			item, err := annotationWithSources(ctx.DB, annotation, ownerID)
			if err != nil {
				return nil, err
			}
			return map[string]any{
				"err": "ok", "annotation": item, "created": false,
				"stale_ignored": true, "conflict_protected": false, "sync_enqueued": false,
			}, nil
		}
	}

	if source != nil {
		upd := userdb.AnnotationSourceUpdate{
			RunID:      strPtrIfPresent(data, "source_run_id"),
			Position:   strPtrIfPresent(data, "source_position"),
			RawHash:    strPtrIfPresent(data, "source_raw_hash"),
			SyncStatus: "synced",
			SyncedAt:   now,
		}
		if _, present := data["source_updated_at"]; present {
			upd.UpdatedAt = &sourceUpdatedAt
		}
		if err := userdb.UpdateAnnotationSource(ctx.DB, source.ID, upd); err != nil {
			return nil, err
		}
	}

	conflictProtected := source != nil && !created && annotation.UserModifiedAt != ""
	contentChanged := created
	if !conflictProtected {
		values := userdb.AnnotationContent{
			AnnotationType: annotationType,
			CFI:            strPtrIfPresent(data, "cfi"),
			Chapter:        truncate(toStr(data["chapter"]), 500),
			QuoteText:      toStr(data["quote_text"]),
			Content:        toStr(data["content"]),
			Color:          truncate(toStr(data["color"]), 32),
			AuthorName:     readerName(ctx),
		}
		if created || sourceName == "" {
			priv := asBoolDefault(data["is_private"], annotation.IsPrivate)
			values.IsPrivate = &priv
		}
		changed, err := userdb.ApplyAnnotationContent(ctx.DB, annotation.ID, values)
		if err != nil {
			return nil, err
		}
		if changed {
			contentChanged = true
		}
	}

	if sourceName == "" && !created && contentChanged {
		if err := userdb.MarkAnnotationUserModified(ctx.DB, annotation.ID, now); err != nil {
			return nil, err
		}
		if err := userdb.MarkPluginRecordsLocallyModified(ctx.DB, annotation.ID, now, ""); err != nil {
			return nil, err
		}
	}
	if err := userdb.TouchAnnotation(ctx.DB, annotation.ID, now); err != nil {
		return nil, err
	}

	// 重新读取以拿到最终状态。
	annotation, err = userdb.GetAnnotationByID(ctx.DB, annotation.ID)
	if err != nil || annotation == nil {
		return nil, err
	}

	syncEnqueued := !annotation.IsPrivate && contentChanged
	if syncEnqueued {
		syncer.SyncAnnotation(annotation.ID, sourceName, sourceConnectionID)
	}

	item, err := annotationWithSources(ctx.DB, annotation, ownerID)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"err": "ok", "annotation": item, "created": created,
		"stale_ignored": false, "conflict_protected": conflictProtected,
		"sync_enqueued": syncEnqueued,
	}, nil
}

// BookAnnotationItemHandler 实现 /api/book/([0-9]+)/annotations/([0-9]+)（PUT/DELETE，需登录）。
func BookAnnotationItemHandler(syncer AnnotationSyncer) HandlerFunc {
	if syncer == nil {
		syncer = noopAnnotationSyncer{}
	}
	return func(ctx *Context) (map[string]any, error) {
		bookID, err1 := strconv.ParseInt(ctx.Param(0), 10, 64)
		annotationID, err2 := strconv.ParseInt(ctx.Param(1), 10, 64)
		if err1 != nil || err2 != nil {
			return map[string]any{"err": "params.book.invalid", "msg": "书籍已不存在或无权访问"}, nil
		}
		if !bookAccessible(ctx, bookID) {
			return map[string]any{"err": "params.book.invalid", "msg": "书籍已不存在或无权访问"}, nil
		}

		annotation, err := userdb.GetOwnedAnnotation(ctx.DB, annotationID, bookID, ctx.Identity.UserID)
		if err != nil {
			return nil, err
		}
		if annotation == nil {
			return map[string]any{"err": "annotation.not_found", "msg": "笔记不存在"}, nil
		}

		if ctx.Request.Method == http.MethodDelete {
			return annotationDelete(ctx, annotation)
		}
		return annotationUpdate(ctx, syncer, annotation)
	}
}

// annotationUpdate 对齐 BookAnnotationItem.put。
func annotationUpdate(ctx *Context, syncer AnnotationSyncer, a *userdb.Annotation) (map[string]any, error) {
	data, ok := decodeJSONObject(ctx.Request)
	if !ok {
		return map[string]any{"err": "params.invalid", "msg": "笔记参数错误"}, nil
	}

	mutable := []string{"annotation_type", "is_private", "cfi", "chapter", "quote_text", "content", "color"}
	changed := false
	values := userdb.AnnotationContent{}

	for _, field := range mutable {
		raw, present := data[field]
		if !present {
			continue
		}
		switch field {
		case "annotation_type":
			v := toStr(raw)
			if !annotationTypes[v] {
				return map[string]any{"err": "params.invalid", "msg": "笔记类型错误"}, nil
			}
			values.AnnotationType = v
		case "is_private":
			v := asBool(raw)
			values.IsPrivate = &v
		case "cfi":
			v := toStr(raw)
			values.CFI = &v
		case "chapter":
			values.Chapter = truncate(toStr(raw), 500)
		case "color":
			values.Color = truncate(toStr(raw), 32)
		case "quote_text":
			values.QuoteText = toStr(raw)
		case "content":
			values.Content = toStr(raw)
		}
	}

	changed, err := userdb.ApplyAnnotationContent(ctx.DB, a.ID, values)
	if err != nil {
		return nil, err
	}

	if changed {
		now := nowTimestamp()
		if err := userdb.MarkAnnotationUserModified(ctx.DB, a.ID, now); err != nil {
			return nil, err
		}
		if err := userdb.MarkPluginRecordsLocallyModified(ctx.DB, a.ID, now, ""); err != nil {
			return nil, err
		}
	}

	updated, err := userdb.GetAnnotationByID(ctx.DB, a.ID)
	if err != nil || updated == nil {
		return nil, err
	}

	syncEnqueued := changed && !updated.IsPrivate
	if syncEnqueued {
		syncer.SyncAnnotation(updated.ID, "", "")
	}

	item, err := annotationWithSources(ctx.DB, updated, ctx.Identity.UserID)
	if err != nil {
		return nil, err
	}
	return map[string]any{"err": "ok", "annotation": item, "sync_enqueued": syncEnqueued}, nil
}

// annotationDelete 对齐 BookAnnotationItem.delete。
func annotationDelete(ctx *Context, a *userdb.Annotation) (map[string]any, error) {
	now := nowTimestamp()
	if err := userdb.MarkPluginRecordsLocallyModified(ctx.DB, a.ID, now, ""); err != nil {
		return nil, err
	}
	if err := userdb.DeleteAnnotation(ctx.DB, a.ID); err != nil {
		return nil, err
	}
	return map[string]any{"err": "ok", "deleted": 1}, nil
}

// AnnotationCollectionHandler 实现 /api/annotations（GET/DELETE，需登录）。
func AnnotationCollectionHandler() HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if ctx.Request.Method == http.MethodDelete {
			return annotationCollectionDelete(ctx)
		}
		return annotationCollectionList(ctx)
	}
}

// annotationCollectionList 对齐 AnnotationCollection.get。
func annotationCollectionList(ctx *Context) (map[string]any, error) {
	bookID, hasBook, badBook := queryBookID(ctx)
	if badBook {
		return map[string]any{"err": "params.invalid", "msg": "书籍参数错误"}, nil
	}

	annotations, err := userdb.ListAnnotationsByReader(ctx.DB, ctx.Identity.UserID, bookID, hasBook)
	if err != nil {
		return nil, err
	}

	out := []map[string]any{}
	for _, a := range annotations {
		if !bookAccessible(ctx, a.BookID) {
			continue
		}
		item, err := annotationWithSources(ctx.DB, a, ctx.Identity.UserID)
		if err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return map[string]any{"err": "ok", "annotations": out}, nil
}

// annotationCollectionDelete 对齐 AnnotationCollection.delete。
func annotationCollectionDelete(ctx *Context) (map[string]any, error) {
	hasFilter := false
	for _, f := range sourceDeleteFilters {
		if ctx.Request.URL.Query().Get(f) != "" {
			hasFilter = true
			break
		}
	}
	if !hasFilter {
		return map[string]any{"err": "params.invalid", "msg": "来源清理至少需要一个 source_ 筛选条件"}, nil
	}

	bookID, hasBook, badBook := queryBookID(ctx)
	if badBook {
		return map[string]any{"err": "params.invalid", "msg": "书籍参数错误"}, nil
	}

	active := map[string]string{}
	for _, f := range sourceFilters {
		if v := ctx.Request.URL.Query().Get(f); v != "" {
			active[f] = v
		}
	}

	sources, err := userdb.ListAnnotationSourcesByReader(ctx.DB, ctx.Identity.UserID, bookID, hasBook)
	if err != nil {
		return nil, err
	}

	now := nowTimestamp()
	deleted := 0
	for _, s := range sources {
		if !sourceMatches(s, active) {
			continue
		}
		a, err := userdb.GetAnnotationByID(ctx.DB, s.AnnotationID)
		if err != nil {
			return nil, err
		}
		if a == nil || !bookAccessible(ctx, a.BookID) {
			continue
		}
		if err := userdb.MarkPluginRecordsLocallyModified(ctx.DB, s.AnnotationID, now, s.SourceConnectionID); err != nil {
			return nil, err
		}
		if err := userdb.DeleteAnnotationSource(ctx.DB, s.ID); err != nil {
			return nil, err
		}
		deleted++
	}
	return map[string]any{"err": "ok", "sources_deleted": deleted, "annotations_deleted": 0}, nil
}

// AnnotationExportHandler 实现 /api/annotations/export（GET，需登录）。
func AnnotationExportHandler() HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		bookID, hasBook, badBook := queryBookID(ctx)
		if badBook {
			return map[string]any{"err": "params.invalid", "msg": "书籍参数错误"}, nil
		}

		annotations, err := userdb.ListAnnotationsByReader(ctx.DB, ctx.Identity.UserID, bookID, hasBook)
		if err != nil {
			return nil, err
		}

		out := []map[string]any{}
		for _, a := range annotations {
			if !bookAccessible(ctx, a.BookID) {
				continue
			}
			item, err := annotationWithSources(ctx.DB, a, ctx.Identity.UserID)
			if err != nil {
				return nil, err
			}
			out = append(out, item)
		}
		return map[string]any{
			"err": "ok",
			"export": map[string]any{
				"schema":      "talebook.annotations.v2",
				"exported_at": time.Now().Format("2006-01-02T15:04:05.000000"),
				"annotations": out,
			},
		}, nil
	}
}

// queryBookID 解析 book_id 查询参数。
//
// 返回 (值, 是否存在, 是否非法)。
func queryBookID(ctx *Context) (int64, bool, bool) {
	raw := ctx.Request.URL.Query().Get("book_id")
	if raw == "" {
		return 0, false, false
	}
	v, err := strconv.ParseInt(raw, 10, 64)
	if err != nil {
		return 0, false, true
	}
	return v, true, false
}

// bookAccessible 对齐 can_view_book / get_book(raise_exception=False)。
func bookAccessible(ctx *Context, bookID int64) bool {
	if ctx.isPublic == nil {
		return true
	}
	ok, err := ctx.isPublic(bookID)
	return err == nil && ok
}

// readerName 复刻 Python 的 _reader_name。
func readerName(ctx *Context) string {
	name := ctx.Identity.Username
	if name == "" {
		name = "读者 " + strconv.FormatInt(ctx.Identity.UserID, 10)
	}
	return truncate(name, 255)
}

// strPtrIfPresent 字段存在时返回其字符串指针，否则返回 nil。
func strPtrIfPresent(data map[string]any, key string) *string {
	v, present := data[key]
	if !present {
		return nil
	}
	s := toStr(v)
	return &s
}

// asBoolDefault 取布尔字段，缺失时用默认值。
func asBoolDefault(v any, def bool) bool {
	if v == nil {
		return def
	}
	return asBool(v)
}

// nowTimestamp 返回与 Python datetime.now() 落库一致的本地时间串。
func nowTimestamp() string { return time.Now().Format("2006-01-02 15:04:05") }

// AnnotationRouteSpecs 返回批注模块接管的 4 条路由。
func AnnotationRouteSpecs(syncer AnnotationSyncer) []RouteSpec {
	return []RouteSpec{
		{
			Pattern: rBookAnnotations,
			Methods: []string{http.MethodGet, http.MethodPost},
			Auth:    true,
			Handler: BookAnnotationsHandler(syncer),
		},
		{
			Pattern: rBookAnnotationItem,
			Methods: []string{http.MethodPut, http.MethodDelete},
			Auth:    true,
			Handler: BookAnnotationItemHandler(syncer),
		},
		{
			Pattern: rAnnotationCollection,
			Methods: []string{http.MethodGet, http.MethodDelete},
			Auth:    true,
			Handler: AnnotationCollectionHandler(),
		},
		{
			Pattern: rAnnotationExport,
			Methods: []string{http.MethodGet},
			Auth:    true,
			Handler: AnnotationExportHandler(),
		},
	}
}

// 与 Python 版逐字一致的路由 pattern。
const (
	rBookAnnotations      = "/api/book/([0-9]+)/annotations"
	rBookAnnotationItem   = "/api/book/([0-9]+)/annotations/([0-9]+)"
	rAnnotationCollection = "/api/annotations"
	rAnnotationExport     = "/api/annotations/export"
)
