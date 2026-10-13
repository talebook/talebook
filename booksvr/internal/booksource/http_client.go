package booksource

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"unicode/utf8"

	"golang.org/x/net/html/charset"
)

// DefaultUserAgent 复刻 Python DEFAULT_USER_AGENT。
const DefaultUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
	"(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

// DefaultHeaders 复刻 Python DEFAULT_HEADERS。
var DefaultHeaders = map[string]string{
	"User-Agent":      DefaultUserAgent,
	"Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
	"Accept-Language": "zh-CN,zh;q=0.9",
}

// ParseSourceHeader 把书源 header 字段解析成 map。
//
// header 可能是 map、JSON 字符串，或带 @js: 的字符串（后者忽略，只用默认头）。
func ParseSourceHeader(header any) map[string]string {
	if header == nil {
		return map[string]string{}
	}
	switch h := header.(type) {
	case map[string]any:
		out := make(map[string]string, len(h))
		for k, v := range h {
			out[k] = stringifyAny(v)
		}
		return out
	case map[string]string:
		out := make(map[string]string, len(h))
		for k, v := range h {
			out[k] = v
		}
		return out
	case string:
		text := strings.TrimSpace(h)
		if text == "" {
			return map[string]string{}
		}
		if strings.HasPrefix(text, "@js:") || strings.HasPrefix(text, "<js>") {
			// JS 头不支持，退回默认头
			return map[string]string{}
		}
		var data map[string]any
		if err := json.Unmarshal([]byte(text), &data); err == nil {
			out := make(map[string]string, len(data))
			for k, v := range data {
				out[k] = stringifyAny(v)
			}
			return out
		}
	}
	return map[string]string{}
}

// BuildHeaders 复刻 build_session 的头构造：默认头 + 书源头 + Referer 兜底。
func BuildHeaders(source *BookSource) map[string]string {
	headers := make(map[string]string, len(DefaultHeaders)+2)
	for k, v := range DefaultHeaders {
		headers[k] = v
	}
	if source != nil {
		for k, v := range ParseSourceHeader(source.Header()) {
			headers[k] = v
		}
		if url := source.BookSourceURL(); url != "" {
			if _, ok := headers["Referer"]; !ok {
				headers["Referer"] = url
			}
		}
	}
	return headers
}

// DetectCharset 检测字节内容的编码，失败时回退 utf-8。
//
// Python 用 chardet 并以 0.3 为置信度阈值；Go 侧用 x/net/html/charset
// 的 DetermineEncoding（基于 BOM + meta + 启发式），语义等价：
// 能识别则用识别结果，否则 utf-8。
func DetectCharset(content []byte) string {
	if len(content) == 0 {
		return "utf-8"
	}
	_, name, _ := charset.DetermineEncoding(content, "")
	if name == "" {
		return "utf-8"
	}
	return name
}

// DecodeResponse 按 声明编码 -> 检测 -> utf-8 的顺序解码响应文本。
func DecodeResponse(resp *http.Response, declaredCharset string) (string, error) {
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	_ = resp.Body.Close()

	enc := declaredCharset
	if enc == "" {
		enc = DetectCharset(body)
	}
	return decodeWith(body, enc), nil
}

// decodeWith 按指定编码名解码；未知编码回退 utf-8。
func decodeWith(body []byte, enc string) string {
	if body == nil {
		return ""
	}
	// 已是合法 UTF-8 且未声明其他编码时直接返回。
	if strings.EqualFold(enc, "utf-8") || strings.EqualFold(enc, "utf8") {
		if utf8.Valid(body) {
			return string(body)
		}
	}
	reader, err := charset.NewReaderLabel(enc, bytes.NewReader(body))
	if err != nil {
		return string(body)
	}
	out, err := io.ReadAll(reader)
	if err != nil {
		return string(body)
	}
	return string(out)
}
