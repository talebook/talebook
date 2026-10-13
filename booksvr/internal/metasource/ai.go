package metasource

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"talebook/booksvr/internal/metabase"
	"talebook/booksvr/internal/safehttp"
)

// AIKey 复刻 KEY。
const AIKey = "ai"

// AITimeout 复刻 requests.post(..., timeout=25)。
const AITimeout = 25

// aiUnknownAuthors 复刻 _UNKNOWN_AUTHORS：传给 AI 前过滤掉的无效作者占位符。
var aiUnknownAuthors = map[string]bool{
	"unknown": true, "佚名": true, "unknown author": true, "": true,
}

// aiAllowedEvidenceFields 复刻 _build_prompt 中的 allowed_fields。
var aiAllowedEvidenceFields = []string{
	"source", "title", "author", "authors", "intro", "summary", "tags", "website", "cover_url",
}

// aiSystemPrompt 复刻 _call_ai_api 中的 system 消息。
const aiSystemPrompt = "You are a helpful assistant that provides book information in JSON format."

// aiPromptTemplate 复刻 _build_prompt 的提示词模板。
//
// 注意：Python 侧用 str.format，模板里的 JSON 示例写成 `{{` / `}}` 转义；
// Go 侧改用 %s 占位，因此这里保留单层花括号。
const aiPromptTemplate = `You are a book metadata assistant. Return book information as JSON using only the supplied evidence.

Instructions:
- Output ONLY a valid JSON object, no other text.
- Never add facts that are absent from the evidence.
- If the evidence is empty, conflicting, or does not identify the requested book, set status to "unknown".

JSON schema (example):
{
  "status": "ok",
  "title": "...",
  "authors": ["..."],
  "publisher": "...",
  "pubdate": "YYYY-MM-DD",
  "isbn": "ISBN-13",
  "summary": "...",
  "tags": ["..."]
}

Book to look up: %s%s
Evidence JSON: %s
`

// AIBookApi 复刻 AIBookApi。
type AIBookApi struct {
	APIURL      string
	APIKey      string
	Model       string
	UseThinking bool
	CopyImage   bool
	// HTTP 是受策略约束的 HTTP 客户端。
	HTTP *safehttp.SafeHttpClient
	// Lang 决定 str2date 使用的格式表；为空时按 zh-CN。
	Lang string
}

// NewAIBookApi 构造 AI 元数据源。
func NewAIBookApi(apiURL, apiKey, model string, useThinking, copyImage bool) *AIBookApi {
	return &AIBookApi{
		APIURL: apiURL, APIKey: apiKey, Model: model,
		UseThinking: useThinking, CopyImage: copyImage,
		HTTP: &safehttp.SafeHttpClient{},
	}
}

// BuildPrompt 复刻 _build_prompt。
func (a *AIBookApi) BuildPrompt(title string, author string, evidence []map[string]any) string {
	title = pyStrip(stripBookMarks(title))

	authorClean := pyStrip(author)
	authorHint := ""
	if !aiUnknownAuthors[strings.ToLower(authorClean)] {
		authorHint = " by " + authorClean
	}

	evidenceText := ""
	if evidence != nil {
		safe := make([]orderedEvidence, 0, len(evidence))
		limit := len(evidence)
		if limit > 8 {
			limit = 8
		}
		for _, item := range evidence[:limit] {
			if item == nil {
				continue
			}
			// Python 的 dict 保留插入顺序，safe_item 按 allowed_fields 顺序构建；
			// Go 的 map 会按字典序序列化，因此这里用有序结构承载。
			safeItem := make(orderedEvidence, 0, len(aiAllowedEvidenceFields))
			for _, key := range aiAllowedEvidenceFields {
				v, ok := item[key]
				if !ok || isEmptyEvidenceValue(v) {
					continue
				}
				safeItem = append(safeItem, evidenceField{Key: key, Value: v})
			}
			safe = append(safe, safeItem)
		}
		if encoded, err := pyJSONDumps(safe); err == nil {
			evidenceText = truncateRunes(encoded, 12000)
		}
	}

	if evidenceText == "" {
		evidenceText = "not supplied"
	}
	return fmt.Sprintf(aiPromptTemplate, title, authorHint, evidenceText)
}

// evidenceField 是证据对象中的一个键值对。
type evidenceField struct {
	Key   string
	Value any
}

// orderedEvidence 是按插入顺序序列化的证据对象。
type orderedEvidence []evidenceField

// MarshalJSON 按字段声明顺序输出，复刻 Python dict 的插入顺序。
func (o orderedEvidence) MarshalJSON() ([]byte, error) {
	var b bytes.Buffer
	b.WriteByte('{')
	for i, f := range o {
		if i > 0 {
			b.WriteByte(',')
		}
		key, err := json.Marshal(f.Key)
		if err != nil {
			return nil, err
		}
		val, err := json.Marshal(f.Value)
		if err != nil {
			return nil, err
		}
		b.Write(key)
		b.WriteByte(':')
		b.Write(val)
	}
	b.WriteByte('}')
	return b.Bytes(), nil
}

// pyJSONDumps 复刻 Python 的 json.dumps(obj, ensure_ascii=False)。
//
// 与 Go 的 json.Marshal 有两处差异，都会影响提示词文本：
//   - 默认分隔符是 (", ", ": ")，而非紧凑的 (",", ":")；
//   - 不转义 HTML 字符（<、>、&）。
func pyJSONDumps(v any) (string, error) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		return "", err
	}
	// Encoder 会补一个换行，去掉后再插入 Python 风格的分隔符。
	compact := pyStripRight(buf.String())
	return addJSONSpaces(compact), nil
}

// addJSONSpaces 把紧凑 JSON 的 `,` / `:` 换成 Python 的 `, ` / `: `。
//
// 只处理字符串字面量之外的分隔符，避免破坏内容里的标点。
func addJSONSpaces(s string) string {
	var b strings.Builder
	b.Grow(len(s) + len(s)/8)
	inString := false
	escaped := false
	for i := 0; i < len(s); i++ {
		c := s[i]
		if inString {
			b.WriteByte(c)
			if escaped {
				escaped = false
			} else if c == '\\' {
				escaped = true
			} else if c == '"' {
				inString = false
			}
			continue
		}
		switch c {
		case '"':
			inString = true
			b.WriteByte(c)
		case ',', ':':
			b.WriteByte(c)
			b.WriteByte(' ')
		default:
			b.WriteByte(c)
		}
	}
	return b.String()
}

// isEmptyEvidenceValue 复刻 `item.get(key) not in (None, "", [])`。
func isEmptyEvidenceValue(v any) bool {
	switch t := v.(type) {
	case nil:
		return true
	case string:
		return t == ""
	case []any:
		return len(t) == 0
	case []string:
		return len(t) == 0
	}
	return false
}

// truncateRunes 按字符截断，复刻 Python 的切片语义。
func truncateRunes(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n])
}

// CallAIAPI 复刻 _call_ai_api：返回模型输出的 content，失败返回空串。
func (a *AIBookApi) CallAIAPI(prompt string) string {
	payload := map[string]any{
		"model": a.Model,
		"messages": []any{
			map[string]any{"role": "system", "content": aiSystemPrompt},
			map[string]any{"role": "user", "content": prompt},
		},
		"temperature": 0.3,
	}

	headers := map[string]string{
		"Content-Type":  "application/json",
		"Authorization": "Bearer " + a.APIKey,
	}

	resp, err := a.HTTP.Post(context.Background(), a.APIURL, safehttp.RequestOptions{
		Headers: headers, JSON: payload,
		Timeout: AITimeout * 1e9, HasTimeout: true,
	})
	if err != nil {
		return ""
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return ""
	}
	body, err := readAll(resp.Body)
	if err != nil {
		return ""
	}

	var data map[string]any
	if err := json.Unmarshal(body, &data); err != nil {
		return ""
	}
	choices, _ := data["choices"].([]any)
	if len(choices) == 0 {
		return ""
	}
	first, _ := choices[0].(map[string]any)
	message, _ := first["message"].(map[string]any)
	content, _ := message["content"].(string)
	return content
}

// aiJSONTagRe 复刻 re.search(r"<json_response>(.*?)</json_response>", response, re.DOTALL)。
var aiJSONTagRe = regexp.MustCompile(`(?s)<json_response>(.*?)</json_response>`)

// aiMarkdownRe 复刻 re.search(r"```json\s*(.*?)\s*```", response, re.DOTALL)。
var aiMarkdownRe = regexp.MustCompile("(?s)```json\\s*(.*?)\\s*```")

// ParseAIResponse 复刻 _parse_ai_response：解析模型输出为 JSON 对象。
//
// 解析成功时强制把 cover_url 置空（模型输出不得成为出站请求目标）。
func ParseAIResponse(response string) map[string]any {
	var jsonStr string
	if m := aiJSONTagRe.FindStringSubmatch(response); m != nil {
		jsonStr = pyStrip(m[1])
	} else if m := aiMarkdownRe.FindStringSubmatch(response); m != nil {
		jsonStr = pyStrip(m[1])
	} else {
		jsonStr = pyStrip(response)
	}

	var data map[string]any
	if err := json.Unmarshal([]byte(jsonStr), &data); err != nil {
		return nil
	}
	data["cover_url"] = ""
	return data
}

// GetBook 复刻 get_book。
func (a *AIBookApi) GetBook(title string, author string, evidence []map[string]any) map[string]any {
	// Python 侧 `evidence == []` 只对空列表成立；nil 表示「未提供」。
	if evidence != nil && len(evidence) == 0 {
		return nil
	}

	prompt := a.BuildPrompt(title, author, evidence)
	response := a.CallAIAPI(prompt)
	if response == "" {
		return nil
	}

	bookData := ParseAIResponse(response)
	if bookData == nil {
		return nil
	}
	if status, _ := bookData["status"].(string); status == "unknown" {
		return nil
	}
	return a.BuildMetadata(bookData)
}

// BuildMetadata 复刻 _metadata。
func (a *AIBookApi) BuildMetadata(book map[string]any) map[string]any {
	title, _ := book["title"].(string)
	if title == "" {
		return nil
	}

	authors := asStringList(book["authors"])
	if len(authors) == 0 {
		authors = []string{"佚名"}
	}
	authorSort := ""
	if len(authors) > 0 {
		authorSort = authors[0]
	}

	publisher, _ := book["publisher"].(string)
	isbn, _ := book["isbn"].(string)
	coverURL, _ := book["cover_url"].(string)
	summary, _ := book["summary"].(string)

	mi := map[string]any{
		"title":          title,
		"authors":        toAnySlice(authors),
		"author":         authorSort,
		"author_sort":    authorSort,
		"publisher":      publisher,
		"isbn":           isbn,
		"tags":           toAnySlice(asStringList(book["tags"])),
		"cover_url":      coverURL,
		"comments":       summary,
		"source":         "AI",
		"provider_key":   AIKey,
		"provider_value": title,
	}

	// 出版日期：解析失败时由调用方注入当前时间（Python 用 utcnow()）。
	pubdate, _ := book["pubdate"].(string)
	if pd := Str2Date(pubdate, a.Lang); pd != nil {
		mi["pubdate"] = formatUTCDate(*pd)
	}

	// 评分：仅在有值时设置。
	if rating, ok := book["rating"]; ok && rating != nil {
		if s, isStr := rating.(string); isStr {
			if v, ok2 := pyIntFloat(s); ok2 {
				mi["rating"] = v
			}
		} else if f, isNum := toFloat(rating); isNum && f != 0 {
			mi["rating"] = int(f)
		}
	}

	// AI 元数据只补全文本字段；模型输出不能成为服务端出站请求目标。
	mi["cover_data"] = nil
	return mi
}

// GetCover 复刻 get_cover：恒返回 nil。
func (a *AIBookApi) GetCover(string) *metabase.CoverResult {
	return nil
}

// toFloat 把 JSON 数字转为 float64。
func toFloat(v any) (float64, bool) {
	switch t := v.(type) {
	case float64:
		return t, true
	case int:
		return float64(t), true
	case int64:
		return float64(t), true
	}
	return 0, false
}

// asStringList 把任意值转为字符串列表。
func asStringList(v any) []string {
	switch t := v.(type) {
	case nil:
		return nil
	case string:
		if t == "" {
			return nil
		}
		return []string{t}
	case []string:
		return t
	case []any:
		out := make([]string, 0, len(t))
		for _, item := range t {
			if s, ok := item.(string); ok {
				out = append(out, s)
			}
		}
		return out
	}
	return nil
}
