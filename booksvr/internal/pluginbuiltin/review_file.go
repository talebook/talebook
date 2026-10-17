package pluginbuiltin

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginproto"
)

// Goodreads/StoryGraph 字段别名（复刻 file_import.py）。
var goodreadsAliases = map[string][]string{
	"external_id": {"Book Id", "book_id"},
	"title":       {"Title", "title"},
	"author":      {"Author", "author"},
	"rating":      {"My Rating", "rating"},
	"source_time": {"Date Read", "date_read"},
	"summary":     {"My Review", "review"},
	"source_url":  {"URL", "url"},
	"isbn":        {"ISBN13", "ISBN", "isbn"},
}

var storygraphAliases = map[string][]string{
	"external_id": {"Book Id", "book_id", "ISBN/UID"},
	"title":       {"Title", "title"},
	"author":      {"Authors", "author"},
	"rating":      {"Star Rating", "rating"},
	"source_time": {"Date Read", "date_read"},
	"summary":     {"Review", "review"},
	"source_url":  {"URL", "url"},
	"isbn":        {"ISBN/UID", "isbn"},
}

// reviewFileRow 是 parse_review_file 的一行结果。
type reviewFileRow struct {
	ExternalID   string
	Data         map[string]any
	ErrorCode    string
	ErrorMessage string
}

// mappedValue 复刻 _mapped_value。
func mappedValue(row map[string]string, name string, aliases map[string][]string, mapping map[string]any) string {
	if key, ok := mapping[name].(string); ok && key != "" {
		return row[key]
	}
	for _, alias := range aliases[name] {
		if v, ok := row[alias]; ok && v != "" {
			return v
		}
	}
	return row[name]
}

// parseReviewFile 复刻 parse_review_file。
func parseReviewFile(content, source, fileFormat string, mapping map[string]any) []reviewFileRow {
	if mapping == nil {
		mapping = map[string]any{}
	}
	var rows []map[string]string
	if fileFormat == "json" {
		var parsed any
		if err := json.Unmarshal([]byte(content), &parsed); err != nil {
			return nil
		}
		var list []any
		switch value := parsed.(type) {
		case []any:
			list = value
		case map[string]any:
			if reviews, ok := value["reviews"].([]any); ok {
				list = reviews
			} else if items, ok := value["items"].([]any); ok {
				list = items
			}
		}
		for _, item := range list {
			obj, ok := item.(map[string]any)
			if !ok {
				continue
			}
			row := map[string]string{}
			for k, v := range obj {
				row[k] = fmt.Sprintf("%v", v)
				if s, ok := v.(string); ok {
					row[k] = s
				}
			}
			rows = append(rows, row)
		}
	} else {
		reader := csv.NewReader(strings.NewReader(strings.TrimPrefix(content, "\uFEFF")))
		records, err := reader.ReadAll()
		if err != nil || len(records) == 0 {
			return nil
		}
		header := records[0]
		for _, record := range records[1:] {
			row := map[string]string{}
			for i, value := range record {
				if i < len(header) {
					row[header[i]] = value
				}
			}
			rows = append(rows, row)
		}
	}

	aliases := map[string][]string{}
	switch source {
	case "goodreads":
		aliases = goodreadsAliases
	case "storygraph":
		aliases = storygraphAliases
	}

	// Python：float(mapping.get("scale") or 5)——scale 为 0/空时回退 5。
	scale := 5.0
	if v, ok := mapping["scale"].(float64); ok && v != 0 {
		scale = v
	} else if v, ok := mapping["scale"].(string); ok && v != "" {
		if parsed, err := strconv.ParseFloat(v, 64); err == nil && parsed != 0 {
			scale = parsed
		}
	}

	result := make([]reviewFileRow, 0, len(rows))
	for index, row := range rows {
		externalID := mappedValue(row, "external_id", aliases, mapping)
		if externalID == "" {
			externalID = mappedValue(row, "isbn", aliases, mapping)
		}
		if externalID == "" {
			externalID = strconv.Itoa(index + 1)
		}
		ratingRaw := mappedValue(row, "rating", aliases, mapping)
		if ratingRaw == "" {
			result = append(result, reviewFileRow{
				ExternalID: externalID, ErrorCode: "review_file.rating_missing",
				ErrorMessage: "Rating is missing",
			})
			continue
		}
		rating, err := strconv.ParseFloat(ratingRaw, 64)
		if err != nil {
			result = append(result, reviewFileRow{
				ExternalID: externalID, ErrorCode: "review_file.invalid_rating",
				ErrorMessage: "Rating is not numeric",
			})
			continue
		}
		data := plugindomain.ReviewFromRating(source, source+":"+externalID, rating, scale, plugindomain.ReviewOptions{
			SourceURL:  mappedValue(row, "source_url", aliases, mapping),
			SourceTime: mappedValue(row, "source_time", aliases, mapping),
			Summary:    mappedValue(row, "summary", aliases, mapping),
			Extra: map[string]any{
				"title":  mappedValue(row, "title", aliases, mapping),
				"author": mappedValue(row, "author", aliases, mapping),
				"isbn":   mappedValue(row, "isbn", aliases, mapping),
			},
		}).ToDict()
		result = append(result, reviewFileRow{ExternalID: externalID, Data: data})
	}
	return result
}

// ReviewFileProvider 复刻 ReviewFileProvider。
type ReviewFileProvider struct {
	ManifestDict map[string]any
}

// newReviewFileProvider 构造评价文件导入 provider。
func newReviewFileProvider() *ReviewFileProvider {
	return &ReviewFileProvider{ManifestDict: map[string]any{
		"protocol_version": pluginproto.ProtocolVersion,
		"id":               "talebook.review.file-import",
		"name":             "评价文件导入",
		"description":      "导入 Goodreads、StoryGraph 或显式字段映射的 CSV/JSON；文件正文加密保存且不进入 run log。",
		"version":          "1.0.0",
		"categories":       []any{"reviews"},
		"capabilities":     []any{"reviews.import"},
		"runtime_kind":     "builtin",
		"actions":          []any{"test", "preview", "run", "retry", "rollback"},
		"auth_schema": map[string]any{
			"type": "object",
			"properties": map[string]any{
				"content": map[string]any{"type": "string", "writeOnly": true},
			},
			"required": []any{"content"},
		},
		"config_schema": map[string]any{
			"type": "object",
			"properties": map[string]any{
				"source":  map[string]any{"type": "string", "enum": []any{"goodreads", "storygraph", "generic"}},
				"format":  map[string]any{"type": "string", "enum": []any{"csv", "json"}},
				"mapping": map[string]any{"type": "object"},
			},
		},
		"permissions":       []any{"plugin_records.write"},
		"data_policy":       map[string]any{"stores_full_text": false, "retention": "rating_summary_and_source_link"},
		"compatibility":     map[string]any{"talebook": ">=0.1.0"},
		"homepage":          "https://github.com/talebook/talebook",
		"license":           "GPL-3.0",
		"ui":                map[string]any{"icon": "mdi-file-delimited-outline", "primary_action": "configure"},
		"connection_owners": []any{"instance", "user"},
	}}
}

// Manifest 满足 pluginiface.Provider。
func (p *ReviewFileProvider) Manifest() map[string]any { return p.ManifestDict }

// Invoke 实现 MethodDispatcher：全部委托 DispatchInvoke。
func (p *ReviewFileProvider) Invoke(method string, args []any, context map[string]any) (any, error) {
	return DispatchInvoke(p, method, args, context)
}

// InitialConfig 复刻缺省行为：空配置。
func (p *ReviewFileProvider) InitialConfig(settings map[string]any) map[string]any {
	return map[string]any{}
}

// Execute 复刻 execute。
func (p *ReviewFileProvider) Execute(context map[string]any) (pluginproto.ProviderResult, error) {
	config, _ := context["config"].(map[string]any)
	source := "generic"
	if v, ok := config["source"].(string); ok && v != "" {
		source = v
	}
	fileFormat := "csv"
	if v, ok := config["format"].(string); ok && v != "" {
		fileFormat = v
	}
	mapping, _ := config["mapping"].(map[string]any)
	secrets, _ := context["secrets"].(map[string]any)
	content, _ := secrets["content"].(string)
	rows := parseReviewFile(content, source, fileFormat, mapping)

	if asStringOr(context["action"], "") == "test" {
		return pluginproto.ProviderResult{
			HealthMessage: "Parsed " + itoa(len(rows)) + " review rows",
		}, nil
	}
	targets := map[string]bool{}
	if raw, ok := context["target_external_ids"].([]any); ok {
		for _, item := range raw {
			if s, ok := item.(string); ok {
				targets[s] = true
			}
		}
	}
	items := []pluginproto.ProviderItem{}
	for _, row := range rows {
		externalID := source + ":" + row.ExternalID
		if len(targets) > 0 && !targets[externalID] {
			continue
		}
		data := row.Data
		if data == nil {
			data = map[string]any{"source": source, "row_id": row.ExternalID}
		}
		var remoteUpdatedAt *string
		if data != nil {
			if st, ok := data["source_time"].(string); ok {
				remoteUpdatedAt = &st
			}
		}
		items = append(items, pluginproto.ProviderItem{
			ExternalID:      externalID,
			EntityType:      "review",
			Data:            data,
			RemoteUpdatedAt: remoteUpdatedAt,
			ErrorCode:       row.ErrorCode,
			ErrorMessage:    row.ErrorMessage,
		})
	}
	return pluginproto.ProviderResult{
		Items:         items,
		NextCursor:    map[string]any{"completed": true},
		HealthMessage: "Review file import complete",
	}, nil
}

// GetReviews 复刻 get_reviews。
func (p *ReviewFileProvider) GetReviews(query any, context map[string]any) (plugindomain.Page, error) {
	runContext := map[string]any{}
	for k, v := range context {
		runContext[k] = v
	}
	runContext["action"] = "run"
	result, err := p.Execute(runContext)
	if err != nil {
		return plugindomain.Page{}, err
	}
	items := []any{}
	for _, item := range result.Items {
		if item.ErrorCode != "" {
			continue
		}
		if m, ok := item.Data.(map[string]any); ok {
			items = append(items, plugindomain.Review{DomainRecord: plugindomain.NewDomainRecord(m)})
		}
	}
	return plugindomain.Page{Items: items, HealthMessage: result.HealthMessage}, nil
}
