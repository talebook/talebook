package pluginruntime

import (
	"encoding/json"
	"strings"
)

// decodeJSONMap 把 JSON 文本解成 map；空串或非法内容返回空 map。
func decodeJSONMap(text string) map[string]any {
	text = strings.TrimSpace(text)
	if text == "" || text == "null" {
		return map[string]any{}
	}
	var out map[string]any
	if err := json.Unmarshal([]byte(text), &out); err != nil || out == nil {
		return map[string]any{}
	}
	return out
}

// decodeJSONList 把 JSON 文本解成 []any；空串或非法内容返回空切片。
func decodeJSONList(text string) []any {
	text = strings.TrimSpace(text)
	if text == "" || text == "null" {
		return []any{}
	}
	var out []any
	if err := json.Unmarshal([]byte(text), &out); err != nil || out == nil {
		return []any{}
	}
	return out
}
