// Package plugindomain 复刻 webserver/plugins/runtime/domains.py。
//
// 领域对象属于平台协议，不属于某个具体插件。Python 侧它们同时实现 Mapping，
// 让迁移期仍按 item["title"] 读取；Go 侧用 map 承载 values 并提供 ToDict，
// 语义等价。
package plugindomain

import (
	"fmt"
	"strings"
)

// DomainRecord 是兼容存量异构字段的类型化记录基类。
//
// Python 的 DomainRecord 用 dataclass 的 values 字段承载任意键值；
// Go 侧直接持有 map，并提供 FromDict / ToDict。
type DomainRecord struct {
	Values map[string]any
}

// NewDomainRecord 构造一条记录。
func NewDomainRecord(values map[string]any) DomainRecord {
	if values == nil {
		values = map[string]any{}
	}
	return DomainRecord{Values: values}
}

// FromDict 复刻 DomainRecord.from_dict。
//
// 非 mapping 输入返回错误（Python 抛 TypeError）。
func (d DomainRecord) FromDict(value any) (DomainRecord, error) {
	if m, ok := value.(map[string]any); ok {
		return NewDomainRecord(m), nil
	}
	if d.Values != nil {
		// 已是同类记录时原样返回。
		if rec, ok := value.(DomainRecord); ok {
			return rec, nil
		}
	}
	return DomainRecord{}, fmt.Errorf("DomainRecord 需要 mapping，得到 %T", value)
}

// ToDict 返回底层 map 的浅拷贝。
func (d DomainRecord) ToDict() map[string]any {
	out := make(map[string]any, len(d.Values))
	for k, v := range d.Values {
		out[k] = v
	}
	return out
}

// Get 按键取值；缺失返回 nil。
func (d DomainRecord) Get(key string) any { return d.Values[key] }

// GetString 按键取字符串；缺失或非字符串返回空串。
func (d DomainRecord) GetString(key string) string {
	s, _ := d.Values[key].(string)
	return s
}

// Len 返回字段数。
func (d DomainRecord) Len() int { return len(d.Values) }

// BookMetadata 是书籍元数据候选。
//
// 字段集合由具体来源决定，身份由 ProviderItem 承担。
type BookMetadata struct {
	DomainRecord
}

// NewBookMetadata 构造书籍元数据。
func NewBookMetadata(values map[string]any) BookMetadata {
	return BookMetadata{DomainRecord: NewDomainRecord(values)}
}

// FromDict 复刻 BookMetadata.from_dict。
func (b BookMetadata) FromDict(value any) (BookMetadata, error) {
	rec, err := b.DomainRecord.FromDict(value)
	if err != nil {
		return BookMetadata{}, err
	}
	return BookMetadata{DomainRecord: rec}, nil
}

// MetadataQuery 是一次元数据检索的输入。
//
// 字段均可选，由 provider 自行决定用哪些：ISBN 可做精确匹配，
// publisher 用于同名书消歧。压成单个字符串会让 provider 只能猜测查询意图，
// 因此保留结构。
type MetadataQuery struct {
	Title     string
	ISBN      string
	Publisher string
	Authors   []string
}

// MetadataQueryFromValue 复刻 MetadataQuery.from_value，兼容裸字符串调用。
func MetadataQueryFromValue(value any) MetadataQuery {
	switch v := value.(type) {
	case MetadataQuery:
		return v
	case map[string]any:
		return MetadataQuery{
			Title:     asString(v["title"]),
			ISBN:      asString(v["isbn"]),
			Publisher: asString(v["publisher"]),
			Authors:   asStringSlice(v["authors"]),
		}
	case nil:
		return MetadataQuery{}
	default:
		return MetadataQuery{Title: asString(value)}
	}
}

// IsEmpty 复刻 MetadataQuery.is_empty。
func (q MetadataQuery) IsEmpty() bool { return q.Title == "" && q.ISBN == "" }

// Annotation 是划线、笔记或章评。
type Annotation struct {
	DomainRecord
}

// SourceState 是一条外部批注副本的同步水位与身份。
type SourceState struct {
	DomainRecord
}

// Review 是外部评分或评价。
type Review struct {
	DomainRecord
}

// ReviewFromRating 复刻 Review.from_rating，构造统一评分记录。
//
// 避免各 provider 漂移字段或摘要上限。
func ReviewFromRating(source, externalID string, rating any, scale any, opts ReviewOptions) Review {
	// Python 的 review_kind 默认值为 "rating"。
	reviewKind := opts.ReviewKind
	if reviewKind == "" {
		reviewKind = "rating"
	}
	value := map[string]any{
		"source":      source,
		"review_kind": reviewKind,
		"external_id": externalID,
		"book_id":     opts.BookID,
		"domain_id":   opts.DomainID,
		"series_id":   opts.SeriesID,
		"rating":      map[string]any{"value": rating, "scale": scale, "sample_count": opts.SampleCount},
		"source_time": opts.SourceTime,
		"source_url":  opts.SourceURL,
		"summary":     truncateSummary(opts.Summary, 500),
	}
	for k, v := range opts.Extra {
		value[k] = v
	}
	return Review{DomainRecord: NewDomainRecord(value)}
}

// ReviewOptions 是 ReviewFromRating 的可选参数。
type ReviewOptions struct {
	SampleCount any
	SourceURL   string
	SourceTime  string
	Summary     string
	BookID      any
	DomainID    string
	SeriesID    string
	ReviewKind  string
	Extra       map[string]any
}

// truncateSummary 复刻 `" ".join(str(summary or "").split())[:500]`。
//
// 先按空白切分再以单空格连接（折叠连续空白），最后按字符（码点）截断。
func truncateSummary(summary string, limit int) string {
	fields := strings.Fields(summary)
	joined := strings.Join(fields, " ")
	if runes := []rune(joined); len(runes) > limit {
		return string(runes[:limit])
	}
	return joined
}

// SourceBook 是书源列表条目；ExternalID 对平台完全不透明。
type SourceBook struct {
	ExternalID     string
	Title          string
	Authors        []string
	ISBN           string
	Format         string
	Source         string
	SourceURL      string
	AcquisitionURL string
	Access         string
	License        string
	TargetLibrary  string
	ReviewStatus   string
	ContentHash    string
	RemoteETag     string
	UpdatedAt      string
	Description    string
	CoverURL       string
	Categories     []string
	Extra          map[string]any
}

// sourceBookKnownFields 是 SourceBook 的具名字段集合（不含 extra）。
var sourceBookKnownFields = map[string]bool{
	"external_id": true, "title": true, "authors": true, "isbn": true,
	"format": true, "source": true, "source_url": true, "acquisition_url": true,
	"access": true, "license": true, "target_library": true, "review_status": true,
	"content_hash": true, "remote_etag": true, "updated_at": true,
	"description": true, "cover_url": true, "categories": true,
}

// SourceBookFromDict 复刻 SourceBook.from_dict。
//
// 未知键全部收进 Extra。
func SourceBookFromDict(value map[string]any) SourceBook {
	sb := SourceBook{
		Access:        "external_link",
		TargetLibrary: "main",
		ReviewStatus:  "pending",
		Extra:         map[string]any{},
	}
	for k, v := range value {
		if !sourceBookKnownFields[k] {
			sb.Extra[k] = v
			continue
		}
		switch k {
		case "external_id":
			sb.ExternalID = asString(v)
		case "title":
			sb.Title = asString(v)
		case "authors":
			sb.Authors = asStringSlice(v)
		case "isbn":
			sb.ISBN = asString(v)
		case "format":
			sb.Format = asString(v)
		case "source":
			sb.Source = asString(v)
		case "source_url":
			sb.SourceURL = asString(v)
		case "acquisition_url":
			sb.AcquisitionURL = asString(v)
		case "access":
			sb.Access = asString(v)
		case "license":
			sb.License = asString(v)
		case "target_library":
			sb.TargetLibrary = asString(v)
		case "review_status":
			sb.ReviewStatus = asString(v)
		case "content_hash":
			sb.ContentHash = asString(v)
		case "remote_etag":
			sb.RemoteETag = asString(v)
		case "updated_at":
			sb.UpdatedAt = asString(v)
		case "description":
			sb.Description = asString(v)
		case "cover_url":
			sb.CoverURL = asString(v)
		case "categories":
			sb.Categories = asStringSlice(v)
		}
	}
	return sb
}

// ToDict 复刻 SourceBook.to_dict。
//
// 额外补一版 /api/network/* 兼容别名（name / author / book_url）。
func (s SourceBook) ToDict() map[string]any {
	value := map[string]any{
		"external_id":     s.ExternalID,
		"title":           s.Title,
		"authors":         append([]string{}, s.Authors...),
		"isbn":            s.ISBN,
		"format":          s.Format,
		"source":          s.Source,
		"source_url":      s.SourceURL,
		"acquisition_url": s.AcquisitionURL,
		"access":          s.Access,
		"license":         s.License,
		"target_library":  s.TargetLibrary,
		"review_status":   s.ReviewStatus,
		"content_hash":    s.ContentHash,
		"remote_etag":     s.RemoteETag,
		"updated_at":      s.UpdatedAt,
		"description":     s.Description,
		"cover_url":       s.CoverURL,
		"categories":      append([]string{}, s.Categories...),
	}
	for k, v := range s.Extra {
		value[k] = v
	}
	if _, ok := value["name"]; !ok {
		value["name"] = s.Title
	}
	if _, ok := value["author"]; !ok {
		author := ""
		if len(s.Authors) > 0 {
			author = s.Authors[0]
		}
		value["author"] = author
	}
	if _, ok := value["book_url"]; !ok {
		value["book_url"] = s.ExternalID
	}
	return value
}

// SourceBookDetail 是书源详情。
type SourceBookDetail struct {
	ExternalID     string
	Title          string
	Authors        []string
	Description    string
	CoverURL       string
	Categories     []string
	SourceURL      string
	AcquisitionURL string
	Format         string
	Downloadable   bool
	TOCRef         string
	LastChapter    string
	WordCount      string
	Source         string
	Extra          map[string]any
}

// ToDict 复刻 SourceBookDetail.to_dict。
func (s SourceBookDetail) ToDict() map[string]any {
	value := map[string]any{
		"external_id":     s.ExternalID,
		"title":           s.Title,
		"authors":         append([]string{}, s.Authors...),
		"description":     s.Description,
		"cover_url":       s.CoverURL,
		"categories":      append([]string{}, s.Categories...),
		"source_url":      s.SourceURL,
		"acquisition_url": s.AcquisitionURL,
		"format":          s.Format,
		"downloadable":    s.Downloadable,
		"toc_ref":         s.TOCRef,
		"last_chapter":    s.LastChapter,
		"word_count":      s.WordCount,
		"source":          s.Source,
	}
	for k, v := range s.Extra {
		value[k] = v
	}
	if _, ok := value["name"]; !ok {
		value["name"] = s.Title
	}
	if _, ok := value["author"]; !ok {
		author := ""
		if len(s.Authors) > 0 {
			author = s.Authors[0]
		}
		value["author"] = author
	}
	if _, ok := value["intro"]; !ok {
		value["intro"] = s.Description
	}
	if _, ok := value["book_url"]; !ok {
		value["book_url"] = s.ExternalID
	}
	if _, ok := value["toc_url"]; !ok {
		value["toc_url"] = s.TOCRef
	}
	return value
}

// SourceChapter 是书源章节。
type SourceChapter struct {
	ExternalID string
	Title      string
	IsVIP      bool
	UpdatedAt  string
	Extra      map[string]any
}

// ToDict 复刻 SourceChapter.to_dict。
func (s SourceChapter) ToDict() map[string]any {
	value := map[string]any{
		"external_id": s.ExternalID,
		"title":       s.Title,
		"is_vip":      s.IsVIP,
		"updated_at":  s.UpdatedAt,
	}
	for k, v := range s.Extra {
		value[k] = v
	}
	if _, ok := value["name"]; !ok {
		value["name"] = s.Title
	}
	if _, ok := value["url"]; !ok {
		value["url"] = s.ExternalID
	}
	return value
}

// SourceContent 是书源正文。
type SourceContent struct {
	Title   string
	Content string
	Extra   map[string]any
}

// ToDict 复刻 SourceContent.to_dict。
func (s SourceContent) ToDict() map[string]any {
	value := map[string]any{"title": s.Title, "content": s.Content}
	for k, v := range s.Extra {
		value[k] = v
	}
	return value
}

// Category 是书源分类。
type Category struct {
	ID   string
	Name string
}

// ToDict 复刻 Category.to_dict。
func (c Category) ToDict() map[string]any {
	return map[string]any{"id": c.ID, "name": c.Name}
}

// BookFile 是书源下载的文件。
type BookFile struct {
	Filename  string
	Content   []byte
	Format    string
	MediaType string
	SourceURL string
}

// CheckReport 是健康检查报告。
type CheckReport struct {
	Healthy bool
	Message string
	Tags    []string
}

// ItemFailure 是单条失败记录。
type ItemFailure struct {
	ExternalID   string
	ErrorCode    string
	ErrorMessage string
}

// Page 是分页结果。
type Page struct {
	Items         []any
	Failures      []ItemFailure
	HasMore       bool
	NextCursor    map[string]any
	HealthMessage string
}

// ToolInput 是正文工具输入。
type ToolInput struct {
	DomainRecord
}

// ToolReport 是正文工具预览结果。
type ToolReport struct {
	DomainRecord
}

// ToolOutput 是正文工具写入结果。
type ToolOutput struct {
	DomainRecord
}

// PushReceipt 是推送回执。
type PushReceipt struct {
	SourceAnnotationID string
	SourcePosition     string
	SourceRawHash      string
	SourceUpdatedAt    string
}

// EntityDomainTypes 复刻 ENTITY_DOMAIN_TYPES 的键集合。
var EntityDomainTypes = map[string]string{
	"metadata":    "BookMetadata",
	"annotation":  "Annotation",
	"review":      "Review",
	"book_source": "SourceBook",
}

// CoerceEntity 复刻 coerce_entity：把兼容期 provider 返回的 mapping 升格为领域对象。
//
// Go 侧领域对象以 map 承载，因此这里只做键集合校验与 book_source 的
// external_id 补全，返回值仍是 map。
func CoerceEntity(entityType string, value any) any {
	if _, ok := EntityDomainTypes[entityType]; !ok {
		return value
	}
	m, ok := value.(map[string]any)
	if !ok {
		return value
	}
	return m
}

// asString 复刻 Python 的 str(x or "")。
func asString(v any) string {
	switch val := v.(type) {
	case nil:
		return ""
	case string:
		return val
	case bool:
		if val {
			return "True"
		}
		return "False"
	case float64:
		return trimFloat(val)
	case int:
		return fmt.Sprintf("%d", val)
	case int64:
		return fmt.Sprintf("%d", val)
	default:
		return fmt.Sprintf("%v", val)
	}
}

// trimFloat 复刻 Python 的 str(float)：整数浮点去掉小数点。
func trimFloat(f float64) string {
	if f == float64(int64(f)) {
		return fmt.Sprintf("%d", int64(f))
	}
	return fmt.Sprintf("%v", f)
}

// asStringSlice 把任意值转成字符串切片。
func asStringSlice(v any) []string {
	switch val := v.(type) {
	case nil:
		return nil
	case []string:
		return val
	case []any:
		out := make([]string, 0, len(val))
		for _, item := range val {
			out = append(out, asString(item))
		}
		return out
	case string:
		return []string{val}
	default:
		return nil
	}
}
