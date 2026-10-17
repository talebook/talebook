package httpapi

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginruntime"
	"talebook/booksvr/internal/userdb"
)

const metadataLookupCapability = "metadata.lookup"

type referenceOutcome struct {
	connection *userdb.PluginConnection
	key        string
	name       string
	value      any
	err        error
}

func referenceQuery(book *library.BookData) map[string]any {
	return map[string]any{"title": book.Title, "authors": book.Authors, "isbn": book.ISBN, "publisher": book.Publisher}
}

// Search uses the same audited registry as plugin management. NDJSON preserves
// the existing book-page stream, including its first status line and final summary.
func (w *bookWiring) searchBookReferences(ctx *Context, book *library.BookData) (map[string]any, error) {
	if _, err := pluginruntime.EnsureRuntimeInstallations(w.db, w.settings, w.registry); err != nil {
		return nil, err
	}
	runtime := pluginruntime.NewRuntime(w.db, w.settings, w.registry)
	user := ctx.Identity.UserID
	connections, err := runtime.ConnectionsFor(metadataLookupCapability, &user)
	if err != nil {
		return nil, err
	}
	stream := ctx.Request != nil && ctx.Request.URL.Query().Get("stream") == "1" && ctx.Writer != nil
	emit := func(value any) error { return nil }
	if stream {
		ctx.Writer.Header().Set("Content-Type", "application/x-ndjson; charset=utf-8")
		ctx.Writer.Header().Set("Cache-Control", "no-store")
		ctx.Writer.Header().Set("X-Accel-Buffering", "no")
		encoder := json.NewEncoder(ctx.Writer)
		emit = func(value any) error {
			if err := encoder.Encode(value); err != nil {
				return err
			}
			if flush, ok := ctx.Writer.(http.Flusher); ok {
				flush.Flush()
			}
			return nil
		}
		if err := emit(map[string]any{"err": "ok"}); err != nil {
			return nil, nil
		}
	}
	timeout := 30.0
	lookup, cancel := context.WithTimeout(sourceContext(ctx), 30*time.Second)
	defer cancel()
	results := make(chan referenceOutcome, len(connections))
	pending := map[int64]referenceOutcome{}
	for _, connection := range connections {
		key, err := runtime.PluginKeyOf(connection)
		if err != nil {
			return nil, err
		}
		provider, err := w.registry.Get(key)
		if err != nil {
			return nil, err
		}
		outcome := referenceOutcome{connection: connection, key: key, name: stringOf(provider.Manifest()["name"])}
		pending[connection.ID] = outcome
		go func(outcome referenceOutcome) {
			outcome.value, outcome.err = runtime.Read(outcome.connection, "search_books", []any{referenceQuery(book)}, pluginruntime.CallOptions{Timeout: &timeout, RequestedBy: &user, RequiredScopes: []string{"books.read"}})
			results <- outcome
		}(outcome)
	}
	books := []any{}
	failures := []any{}
	completed := 0
	for len(pending) > 0 {
		select {
		case <-lookup.Done():
			for _, outcome := range pending {
				failures = append(failures, map[string]any{"source": outcome.name, "code": "timeout", "message": "查询超时，请稍后重试"})
			}
			pending = map[int64]referenceOutcome{}
		case outcome := <-results:
			delete(pending, outcome.connection.ID)
			completed++
			if outcome.err != nil {
				failures = append(failures, map[string]any{"source": outcome.name, "code": "fetch_failed", "message": outcome.err.Error()})
				if stream {
					if err := emit(map[string]any{"event": "progress", "total": len(connections), "completed": completed, "failures": failures}); err != nil {
						return nil, nil
					}
				}
				continue
			}
			records := pluginRecords(pluginBooksOf(outcome.value))
			if len(records) == 0 {
				failures = append(failures, map[string]any{"source": outcome.name, "code": "no_result", "message": "未找到匹配图书"})
			}
			for i, record := range records {
				if i >= 5 {
					break
				}
				if stringOf(record["title"]) == "" {
					continue
				}
				candidate := pluginMetadataSummary(record)
				candidate["provider_key"] = outcome.key
				candidate["source"] = outcome.name
				candidate["author"] = strings.Join(toStringSlice(record["authors"]), ", ")
				date := stringOf(record["pubdate"])
				if len(date) >= 4 {
					candidate["pubyear"] = date[:4]
				}
				books = append(books, candidate)
				if stream {
					if err := emit(candidate); err != nil {
						return nil, nil
					}
				}
			}
			if stream {
				if err := emit(map[string]any{"event": "progress", "total": len(connections), "completed": completed, "failures": failures}); err != nil {
					return nil, nil
				}
			}
		}
	}
	summary := map[string]any{"event": "summary", "total": len(connections), "completed": completed, "failures": failures}
	if stream {
		_ = emit(summary)
		return nil, nil
	}
	return map[string]any{"err": "ok", "books": books, "results": books, "total": len(books), "summary": summary, "book_id": book.ID, "title": book.Title, "authors": book.Authors, "isbn": book.ISBN}, nil
}

func referenceFlag(value any) bool {
	return value == true || stringOf(value) == "yes" || stringOf(value) == "1"
}

func (w *bookWiring) applyBookReference(ctx *Context, book *library.BookData, args map[string]any) (map[string]any, error) {
	key, id := stringOf(args["provider_key"]), stringOf(args["provider_value"])
	if key == "" || id == "" {
		return map[string]any{"err": "params.provider_key.invalid", "msg": "请选择来源和图书"}, nil
	}
	onlyMeta, onlyCover := referenceFlag(args["only_meta"]), referenceFlag(args["only_cover"])
	if onlyMeta && onlyCover {
		return map[string]any{"err": "params.conflict", "msg": "不能同时仅更新书籍信息和仅更新封面"}, nil
	}
	if _, err := pluginruntime.EnsureRuntimeInstallations(w.db, w.settings, w.registry); err != nil {
		return nil, err
	}
	runtime := pluginruntime.NewRuntime(w.db, w.settings, w.registry)
	user := ctx.Identity.UserID
	connections, err := runtime.ConnectionsFor(metadataLookupCapability, &user)
	if err != nil {
		return nil, err
	}
	var selected *userdb.PluginConnection
	for _, connection := range connections {
		providerKey, err := runtime.PluginKeyOf(connection)
		if err != nil {
			return nil, err
		}
		if providerKey == key {
			selected = connection
			break
		}
	}
	if selected == nil {
		return map[string]any{"err": "plugin.disabled", "msg": "所选元数据来源未启用或不可用"}, nil
	}
	opts := pluginruntime.CallOptions{RequestedBy: &user, RequiredScopes: []string{"books.read"}}
	value, err := runtime.Read(selected, "get_metadata", []any{id}, opts)
	if err != nil {
		return pluginErrorOr(err), nil
	}
	metadata := pluginRecordDict(value)
	if stringOf(metadata["title"]) == "" {
		value, err = runtime.Read(selected, "search_books", []any{referenceQuery(book)}, opts)
		if err != nil {
			return pluginErrorOr(err), nil
		}
		for _, candidate := range pluginRecords(pluginBooksOf(value)) {
			if stringOf(candidate["provider_value"]) == id {
				metadata = candidate
				break
			}
		}
	}
	if stringOf(metadata["title"]) == "" {
		return map[string]any{"err": "metadata.not_found", "msg": "所选书籍信息已不可用，请重新搜索"}, nil
	}
	var cover []byte
	if !onlyMeta {
		cover = referenceCoverData(metadata)
		if url := stringOf(metadata["cover_url"]); url != "" && len(cover) == 0 {
			value, fetchErr := runtime.Read(selected, "get_cover", []any{url}, opts)
			if fetchErr == nil {
				if image, ok := value.(*pluginiface.CoverResult); ok && image != nil {
					cover = image.Content
				}
			}
		}
		if onlyCover && len(cover) == 0 {
			return map[string]any{"err": "cover.empty", "msg": "未能取得可用封面，原封面已保留"}, nil
		}
	}
	if !onlyCover {
		update := map[string]any{}
		for _, field := range []string{"authors", "author_sort", "publisher", "isbn", "comments", "pubdate", "tags", "rating", "series", "language"} {
			value := metadata[field]
			if value == nil || stringOf(value) == "" {
				continue
			}
			if field == "authors" || field == "tags" {
				if len(toStringSlice(value)) == 0 {
					continue
				}
			}
			if field == "isbn" && strings.HasPrefix(stringOf(value), "000000000") {
				continue
			}
			if field == "rating" {
				rating, err := strconv.ParseFloat(stringOf(value), 64)
				if err != nil || rating <= 0 || rating > 10 {
					continue
				}
			}
			if field == "pubdate" && (strings.HasPrefix(stringOf(value), "0001-") || strings.HasPrefix(stringOf(value), "0101-")) {
				continue
			}
			update[field] = value
		}
		if authors := toStringSlice(update["authors"]); len(authors) > 0 && stringOf(update["author_sort"]) == "" {
			update["author_sort"] = authors[0]
		}
		if err := w.updateBookMeta(book.ID, stringOf(metadata["title"]), update); err != nil {
			return nil, err
		}
	}
	message := "书籍信息更新成功"
	if len(cover) > 0 {
		if _, err := library.ReplaceCover(w.libraryDB, w.libraryRoot, book.ID, cover); err != nil {
			if onlyCover {
				return map[string]any{"err": "cover.invalid", "msg": "封面更新失败，原封面已保留"}, nil
			}
			message = fmt.Sprintf("书籍信息已更新；封面更新失败，原封面已保留：%v", err)
		}
	}
	return map[string]any{"err": "ok", "msg": message}, nil
}

func referenceCoverData(metadata map[string]any) []byte {
	if raw, ok := metadata["_calibre_mi"].(map[string]any); ok {
		if parts, ok := raw["cover_data"].([]any); ok && len(parts) > 1 {
			if content, ok := parts[1].([]byte); ok {
				return content
			}
		}
	}
	if parts, ok := metadata["cover_data"].([]any); ok && len(parts) > 1 {
		content, _ := parts[1].([]byte)
		return content
	}
	return nil
}
