package pluginbuiltin

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/url"
	"strings"

	"talebook/booksvr/internal/safehttp"

	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginproto"
	"talebook/booksvr/internal/pluginruntime"
)

// brsCaps 是 BRS 章评的能力声明。
func brsCaps() pluginiface.CapabilitySet {
	return pluginiface.CapabilitySet{
		Interfaces: map[string]bool{"AnnotationProvider": true, "ReviewProvider": true},
		HasExecute: true,
	}
}

// registerAnnotationProviders 注册 1 个批注插件。
func registerAnnotationProviders(reg *pluginruntime.PluginRegistry) error {
	if _, err := reg.Register(newBRSProvider(), brsCaps()); err != nil {
		return err
	}
	return nil
}

// BRSProvider 复刻 BRSProvider。
type BRSProvider struct {
	ManifestDict map[string]any
}

// newBRSProvider 构造 BRS provider。
func newBRSProvider() *BRSProvider {
	return &BRSProvider{ManifestDict: map[string]any{
		"protocol_version": pluginproto.ProtocolVersion,
		"id":               "talebook.annotation.brs",
		"name":             "talebook-brs 章评服务器",
		"description":      "连接一个 talebook-brs 实例，导入公开章评，并同步 Talebook 中的公开评论、回复、赞踩与删除。",
		"version":          "1.2.0",
		"categories":       []any{"annotations"},
		"capabilities":     []any{"annotations.chapter_reviews", "annotations.push"},
		"runtime_kind":     "builtin",
		"actions":          []any{"test", "preview", "run", "retry", "rollback"},
		"auth_schema": map[string]any{
			"type": "object",
			"properties": map[string]any{
				"email":    map[string]any{"type": "string", "writeOnly": true},
				"password": map[string]any{"type": "string", "writeOnly": true},
			},
			"required": []any{"email", "password"},
		},
		"config_schema": map[string]any{
			"type": "object",
			"properties": map[string]any{
				"endpoint":    map[string]any{"type": "string", "default": "https://brs.talebook.org"},
				"book_map":    map[string]any{"type": "object"},
				"chapter_map": map[string]any{"type": "object"},
				"segment_map": map[string]any{"type": "object"},
			},
		},
		"permissions": []any{"books.read", "plugin_records.write", "network.read", "network.write", "annotations.write"},
		"data_policy": map[string]any{"stores_full_text": true, "retention": "remote_user_controlled"},
		"compatibility": map[string]any{"talebook": ">=0.1.0"},
		"homepage":      "https://github.com/talebook/talebook",
		"license":       "GPL-3.0",
		"ui": map[string]any{
			"icon": "mdi-comment-text-multiple-outline", "primary_action": "configure",
			"manage_route": "/plugins/brs",
		},
		// 每个用户登录自己的 BRS 账号，endpoint、映射与账号密码都属于个人连接。
		"connection_owners": []any{"user"},
	}}
}

// Manifest 满足 pluginiface.Provider。
func (p *BRSProvider) Manifest() map[string]any { return p.ManifestDict }

// Invoke 实现 MethodDispatcher：全部委托 DispatchInvoke。
func (p *BRSProvider) Invoke(method string, args []any, context map[string]any) (any, error) {
	return DispatchInvoke(p, method, args, context)
}

// InitialEnabled 复刻 initial_enabled：恒为 True。
func (p *BRSProvider) InitialEnabled(settings map[string]any) bool { return true }

// InitialConfig 复刻缺省行为：空配置。
func (p *BRSProvider) InitialConfig(settings map[string]any) map[string]any {
	return map[string]any{}
}

// brsHTTPJSON 复刻 _http_json。
func brsHTTPJSON(method, target string, headers map[string]string,
	params url.Values, data url.Values, body any) (map[string]any, error) {
	merged := map[string]string{"Accept": "application/json"}
	for k, v := range headers {
		merged[k] = v
	}
	opts := safehttp.RequestOptions{Headers: merged}
	if params != nil {
		opts.Params = params
	}
	if data != nil {
		opts.Data = []byte(data.Encode())
		opts.Headers["Content-Type"] = "application/x-www-form-urlencoded"
	}
	if body != nil {
		opts.JSON = body
	}
	resp, err := reviewHTTPClient.Request(nil, method, target, opts)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		return nil, pluginproto.NewUpstreamError("Upstream response is not valid JSON", "other", nil)
	}
	return payload, nil
}

// brsChapterReview 复刻 _chapter_review。
func brsChapterReview(row map[string]any, endpoint, externalID string,
	mappedBook, chapter, segment string) map[string]any {
	summary := stringOr(row["summary"], stringOr(row["content"], ""))
	summary = strings.Join(strings.Fields(summary), " ")
	if len(summary) > 500 {
		summary = summary[:500]
	}
	scale := row["rating_scale"]
	if scale == nil {
		scale = 5
	}
	return map[string]any{
		"source": "talebook_brs", "review_kind": "chapter_comment",
		"external_id": externalID, "book_id": mappedBook,
		"domain_id": "", "series_id": "",
		"rating":      map[string]any{"value": row["rating"], "scale": scale, "sample_count": nil},
		"source_time": stringOr(row["updated_at"], stringOr(row["created_at"], "")),
		"source_url":  stringOr(row["url"], endpoint+"/comments/"+stringOr(row["id"], "")),
		"summary":     summary,
		"domain":      "chapter_reviews", "chapter": chapter, "segment": segment,
		"remote_book_id":    stringOr(row["book_id"], ""),
		"remote_chapter_id": stringOr(row["chapter_id"], ""),
		"remote_segment_id": stringOr(row["segment_id"], ""),
	}
}

// Execute 复刻 execute。
func (p *BRSProvider) Execute(context map[string]any) (pluginproto.ProviderResult, error) {
	config, _ := context["config"].(map[string]any)
	endpoint := strings.TrimRight(stringOr(config["endpoint"], ""), "/")
	if endpoint == "" {
		return pluginproto.ProviderResult{}, pluginproto.NewUpstreamError("BRS endpoint is required", "other", nil)
	}
	secrets, _ := context["secrets"].(map[string]any)
	email := stringOr(secrets["email"], "")
	password := stringOr(secrets["password"], "")
	credentials := base64.StdEncoding.EncodeToString([]byte(email + ":" + password))
	cursor := ""
	if cursorMap, ok := context["cursor"].(map[string]any); ok {
		cursor = stringOr(cursorMap["cursor"], "")
	}
	params := url.Values{"cursor": {cursor}}
	payload, err := brsHTTPJSON("GET", endpoint+"/api/v1/comments",
		map[string]string{"Authorization": "Basic " + credentials}, params, nil, nil)
	if err != nil {
		return pluginproto.ProviderResult{}, err
	}
	if asStringOr(context["action"], "") == "test" {
		return pluginproto.ProviderResult{HealthMessage: "BRS connection healthy"}, nil
	}
	items := []pluginproto.ProviderItem{}
	targets := map[string]bool{}
	if raw, ok := context["target_external_ids"].([]any); ok {
		for _, item := range raw {
			if s, ok := item.(string); ok {
				targets[s] = true
			}
		}
	}
	bookMap := stringMap(config["book_map"])
	chapterMap := stringMap(config["chapter_map"])
	segmentMap := stringMap(config["segment_map"])
	comments, _ := payload["comments"].([]any)
	if comments == nil {
		comments, _ = payload["items"].([]any)
	}
	for _, raw := range comments {
		row, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		externalID := "brs:" + stringOr(row["id"], "")
		if len(targets) > 0 && !targets[externalID] {
			continue
		}
		remoteBook := stringOr(row["book_id"], "")
		remoteChapter := stringOr(row["chapter_id"], "")
		remoteSegment := stringOr(row["segment_id"], "")
		mappedBook, mapped := bookMap[remoteBook]
		if !mapped {
			items = append(items, pluginproto.ProviderItem{
				ExternalID: externalID, EntityType: "review",
				Data:         map[string]any{"source": "talebook_brs", "remote_book_id": remoteBook},
				ErrorCode:    "brs.book_unmapped",
				ErrorMessage: "BRS book has no Talebook mapping",
			})
			continue
		}
		chapter := remoteChapter
		if v, ok := chapterMap[remoteChapter]; ok {
			chapter = v
		}
		segment := remoteSegment
		if v, ok := segmentMap[remoteSegment]; ok {
			segment = v
		}
		data := brsChapterReview(row, endpoint, externalID, mappedBook, chapter, segment)
		sourceTime, _ := data["source_time"].(string)
		items = append(items, pluginproto.ProviderItem{
			ExternalID: externalID, EntityType: "review",
			Data: data, RemoteUpdatedAt: &sourceTime,
		})
	}
	nextCursor := payload["next_cursor"]
	next := map[string]any{}
	if nextCursor != nil {
		next = map[string]any{"cursor": nextCursor}
	} else if cursorMap, ok := context["cursor"].(map[string]any); ok {
		for k, v := range cursorMap {
			next[k] = v
		}
	}
	return pluginproto.ProviderResult{
		Items: items, NextCursor: next, HealthMessage: "BRS sync complete",
	}, nil
}

// stringMap 把 any 转成 map[string]string。
func stringMap(value any) map[string]string {
	out := map[string]string{}
	if m, ok := value.(map[string]any); ok {
		for k, v := range m {
			out[k] = fmt.Sprintf("%v", v)
		}
	}
	return out
}

// GetReviews 复刻 get_reviews。
func (p *BRSProvider) GetReviews(query any, context map[string]any) (plugindomain.Page, error) {
	runContext := map[string]any{}
	for k, v := range context {
		runContext[k] = v
	}
	runContext["action"] = "run"
	result, err := p.Execute(runContext)
	if err != nil {
		return plugindomain.Page{}, err
	}
	var items []any
	var failures []plugindomain.ItemFailure
	for _, item := range result.Items {
		if item.ErrorCode != "" {
			failures = append(failures, plugindomain.ItemFailure{
				ExternalID: item.ExternalID, ErrorCode: item.ErrorCode, ErrorMessage: item.ErrorMessage,
			})
			continue
		}
		if m, ok := item.Data.(map[string]any); ok {
			items = append(items, plugindomain.Review{DomainRecord: plugindomain.NewDomainRecord(m)})
		}
	}
	hasMore := false
	if cursor, ok := result.NextCursor["cursor"]; ok && cursor != nil && cursor != "" {
		hasMore = true
	}
	return plugindomain.Page{
		Items: items, Failures: failures, HasMore: hasMore,
		NextCursor: result.NextCursor, HealthMessage: result.HealthMessage,
	}, nil
}

// ListAnnotations 复刻 list_annotations：只写连接，恒返回空页。
func (p *BRSProvider) ListAnnotations(context map[string]any) (plugindomain.Page, error) {
	return plugindomain.Page{HealthMessage: "BRS annotation connection is write-only"}, nil
}

// brsSignedIn 复刻 _signed_in：登录并返回 transport 与 endpoint。
func (p *BRSProvider) brsSignedIn(context map[string]any) (string, error) {
	config, _ := context["config"].(map[string]any)
	secrets, _ := context["secrets"].(map[string]any)
	endpoint := strings.TrimRight(stringOr(config["endpoint"], ""), "/")
	email := strings.TrimSpace(stringOr(secrets["email"], ""))
	password := stringOr(secrets["password"], "")
	if endpoint == "" {
		return "", pluginproto.NewUpstreamError("BRS endpoint is required", "other", nil)
	}
	if email == "" || password == "" {
		return "", pluginproto.NewUpstreamError("BRS credentials are required", "other", nil)
	}
	login, err := brsHTTPJSON("POST", endpoint+"/api/user/sign_in", nil, nil,
		url.Values{"email": {email}, "password": {password}}, nil)
	if err != nil {
		return "", err
	}
	if stringOr(login["err"], "") != "ok" {
		return "", pluginproto.NewUpstreamError(
			stringOr(login["msg"], stringOr(login["err"], "BRS login failed")), "other", nil)
	}
	return endpoint, nil
}

// brsChecked 复刻 _checked。
func brsChecked(result map[string]any, fallback string) (map[string]any, error) {
	if stringOr(result["err"], "") != "ok" {
		return nil, pluginproto.NewUpstreamError(
			stringOr(result["msg"], stringOr(result["err"], fallback)), "other", nil)
	}
	if data, ok := result["data"].(map[string]any); ok {
		return data, nil
	}
	return map[string]any{}, nil
}

// PushAnnotation 复刻 push_annotation：已有副本时更新，不重复新增。
func (p *BRSProvider) PushAnnotation(item plugindomain.Annotation, state plugindomain.SourceState,
	context map[string]any) (plugindomain.PushReceipt, error) {
	config, _ := context["config"].(map[string]any)
	annotation := item.ToDict()
	endpoint, err := p.brsSignedIn(context)
	if err != nil {
		return plugindomain.PushReceipt{}, err
	}
	remoteID := stringOr(state.Get("source_annotation_id"), "")
	if remoteID != "" {
		remote, err := brsChecked(mustMap(brsHTTPJSON("POST", endpoint+"/api/review/update", nil, nil, nil,
			map[string]any{"review_id": remoteID, "content": stringOr(annotation["content"], "")})),
			"BRS annotation update failed")
		if err != nil {
			return plugindomain.PushReceipt{}, err
		}
		return plugindomain.PushReceipt{
			SourceAnnotationID: remoteID,
			SourcePosition:     stringOr(annotation["cfi"], ""),
			SourceUpdatedAt:    stringOr(remote["updateTime"], ""),
		}, nil
	}
	localBookID := stringOr(annotation["book_id"], "")
	remoteBookID := ""
	for remoteID, mappedID := range stringMap(config["book_map"]) {
		if mappedID == localBookID {
			remoteBookID = remoteID
			break
		}
	}
	if remoteBookID == "" {
		bookTitle := strings.TrimSpace(stringOr(annotation["book_title"], ""))
		if bookTitle == "" {
			return plugindomain.PushReceipt{}, pluginproto.NewUpstreamError(
				"Talebook book title is required before syncing annotations", "other", nil)
		}
		remote, err := brsChecked(mustMap(brsHTTPJSON("GET", endpoint+"/api/review/book", nil,
			url.Values{"title": {bookTitle}}, nil, nil)), "BRS book lookup failed")
		if err != nil {
			return plugindomain.PushReceipt{}, err
		}
		remoteBookID = stringOr(remote["id"], "")
		if remoteBookID == "" {
			return plugindomain.PushReceipt{}, pluginproto.NewUpstreamError(
				"BRS book lookup returned no id", "other", nil)
		}
	}
	kind := "note"
	if stringOr(annotation["annotation_type"], "") == "book_comment" {
		kind = "book_comment"
	}
	chapterName := stringOr(annotation["chapter"], "未命名章节")
	if len(chapterName) > 255 {
		chapterName = chapterName[:255]
	}
	referText := stringOr(annotation["quote_text"], "")
	if len(referText) > 80 {
		referText = referText[:80]
	}
	payload := map[string]any{
		"book_id": remoteBookID, "chapter_name": chapterName,
		"segment_id": intOf(annotation["segment_id"]), "cfi": stringOr(annotation["cfi"], ""),
		"content":   stringOr(annotation["content"], stringOr(annotation["quote_text"], "")),
		"refer_text": referText, "kind": kind,
	}
	if rootID := stringOr(annotation["remote_root_id"], ""); rootID != "" {
		payload["root_id"] = rootID
		payload["quote_id"] = stringOr(annotation["remote_reply_to_id"], rootID)
	}
	remote, err := brsChecked(mustMap(brsHTTPJSON("POST", endpoint+"/api/review/add", nil, nil, nil, payload)),
		"BRS annotation sync failed")
	if err != nil {
		return plugindomain.PushReceipt{}, err
	}
	return plugindomain.PushReceipt{
		SourceAnnotationID: stringOr(remote["reviewId"], stringOr(remote["id"], "")),
		SourcePosition:     stringOr(annotation["cfi"], ""),
		SourceUpdatedAt:    stringOr(remote["updateTime"], stringOr(remote["createTime"], "")),
	}, nil
}

// intOf 复刻 int(x or 0)。
func intOf(value any) int {
	if n, ok := value.(float64); ok {
		return int(n)
	}
	return 0
}

// mustMap 把 (map, error) 折叠成 map（错误延迟到 brsChecked 处理）。
func mustMap(m map[string]any, err error) map[string]any {
	if err != nil {
		return map[string]any{"err": "provider_error", "msg": err.Error()}
	}
	return m
}

// DeleteAnnotation 复刻 delete_annotation：删除 BRS 上的副本（连同回复与投票）。
func (p *BRSProvider) DeleteAnnotation(state plugindomain.SourceState, context map[string]any) error {
	remoteID := stringOr(state.Get("source_annotation_id"), "")
	if remoteID == "" {
		return nil
	}
	endpoint, err := p.brsSignedIn(context)
	if err != nil {
		return err
	}
	_, err = brsChecked(mustMap(brsHTTPJSON("POST", endpoint+"/api/review/delete", nil, nil, nil,
		map[string]any{"review_id": remoteID})), "BRS annotation delete failed")
	return err
}

// PushVote 复刻 push_vote：以当前用户的 BRS 账号对副本投票（1 赞、-1 踩、0 取消）。
func (p *BRSProvider) PushVote(state plugindomain.SourceState, value int, context map[string]any) error {
	remoteID := stringOr(state.Get("source_annotation_id"), "")
	if remoteID == "" {
		return nil
	}
	endpoint, err := p.brsSignedIn(context)
	if err != nil {
		return err
	}
	_, err = brsChecked(mustMap(brsHTTPJSON("POST", endpoint+"/api/review/vote", nil, nil, nil,
		map[string]any{"review_id": remoteID, "value": value})), "BRS vote sync failed")
	return err
}

// 编译期断言。
var (
	_ pluginiface.AnnotationProvider = (*BRSProvider)(nil)
	_ pluginiface.ReviewProvider     = (*BRSProvider)(nil)
)
