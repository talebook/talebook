package booksource

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"talebook/booksvr/internal/safehttp"
)

// AnalyzeURL 把 Legado url 规则串解析为一次 HTTP 请求并执行。
//
// url 规则形如：
//
//	https://host/search?key={{key}}&page={{page}}
//	https://host/search,{"method":"POST","body":"k={{key}}","charset":"gbk"}
//	/relative?q={{key}}           # 相对路径，自动 urljoin(baseUrl)
//
// 支持变量：{{key}}/{{searchKey}}、{{page}}/{{searchPage}}、{{baseUrl}}、@get:{name}。
// 支持受限 `@js:` URL 生成；遇到 `<js>`、`java.ajax` 等外部副作用规则返回 JsRuleUnsupported。

// DefaultTimeout 是书源 HTTP 默认超时（秒）。
const DefaultTimeout = 20

// pageSegmentRe 匹配 Legado 分页占位 `<a,b,c>`。
var pageSegmentRe = regexp.MustCompile(`<([^<>]*)>`)

// AnalyzeResponse 是一次书源请求的结果。
type AnalyzeResponse struct {
	Text    string
	URL     string
	Headers map[string]string
}

// AnalyzeURL 解析并执行一条 url 规则。
type AnalyzeURL struct {
	RawRule   string
	BaseURL   string
	Variables map[string]string
	Source    *BookSource
	Client    *safehttp.SafeHttpClient
	Timeout   time.Duration

	Options map[string]any
	URL     string
}

// NewAnalyzeURL 解析 url 规则。
//
// 解析阶段即完成 @js: 求值、选项拆分、变量替换与相对路径补全，
// 与 Python 在 __init__ 中完成这些步骤一致。
func NewAnalyzeURL(rule, baseURL string, variables map[string]string,
	source *BookSource, client *safehttp.SafeHttpClient, timeout time.Duration) (*AnalyzeURL, error) {

	a := &AnalyzeURL{
		RawRule:   strings.TrimSpace(rule),
		BaseURL:   baseURL,
		Variables: map[string]string{},
		Source:    source,
		Client:    client,
		Timeout:   timeout,
		Options:   map[string]any{},
	}
	for k, v := range variables {
		a.Variables[k] = v
	}
	if a.BaseURL == "" && source != nil {
		a.BaseURL = source.BookSourceURL()
	}
	if a.Timeout <= 0 {
		a.Timeout = DefaultTimeout * time.Second
	}

	r := a.RawRule
	if strings.HasPrefix(r, "@js:") {
		evaluated, err := a.evalURLJS(r[4:])
		if err != nil {
			return nil, err
		}
		r = evaluated
	} else if hasJS(r) {
		return nil, NewJsRuleUnsupported(a.RawRule)
	}

	urlPart, opts := a.splitOptions(r)
	a.Options = opts
	built, err := a.buildURL(urlPart)
	if err != nil {
		return nil, err
	}
	a.URL = built
	return a, nil
}

// splitOptions 拆分 `url,{...json...}`，返回 (url, options)。
func (a *AnalyzeURL) splitOptions(rule string) (string, map[string]any) {
	idx := strings.Index(rule, ",{")
	for idx != -1 {
		candidate := strings.TrimSpace(rule[idx+1:])
		var opts map[string]any
		if err := json.Unmarshal([]byte(candidate), &opts); err == nil && opts != nil {
			return strings.TrimSpace(rule[:idx]), opts
		}
		next := strings.Index(rule[idx+1:], ",{")
		if next == -1 {
			break
		}
		idx = idx + 1 + next
	}
	return rule, map[string]any{}
}

// substitute 手写线性扫描替换 `{{...}}` 与 `@get:{...}`。
//
// 不使用正则，避免攻击者构造的 `@get:{@get:{...|...` 这类输入触发
// 多项式回溯（对应 Python 侧规避 CodeQL py/polynomial-redos 的同一考虑）。
func (a *AnalyzeURL) substitute(text string) (string, error) {
	if text == "" {
		return text, nil
	}
	var out strings.Builder
	out.Grow(len(text))
	i := 0
	n := len(text)
	for i < n {
		ch := text[i]
		if ch == '{' && i+1 < n && text[i+1] == '{' {
			if end := strings.Index(text[i+2:], "}}"); end != -1 {
				end += i + 2
				expr := strings.TrimSpace(text[i+2 : end])
				if expr != "" && !strings.ContainsAny(expr, "{}") {
					low := strings.ToLower(expr)
					if strings.HasPrefix(low, "js.") || strings.HasPrefix(low, "java") {
						return "", NewJsRuleUnsupported(expr)
					}
					out.WriteString(a.lookup(expr))
					i = end + 2
					continue
				}
			}
		} else if ch == '@' && strings.HasPrefix(text[i:], "@get:{") {
			if end := strings.Index(text[i+6:], "}"); end != -1 {
				end += i + 6
				name := strings.TrimSpace(text[i+6 : end])
				out.WriteString(a.Variables[name])
				i = end + 1
				continue
			}
		}
		out.WriteByte(ch)
		i++
	}
	return out.String(), nil
}

// lookup 解析变量名，支持 searchKey/searchPage 别名与 baseUrl。
func (a *AnalyzeURL) lookup(name string) string {
	switch name {
	case "searchKey":
		name = "key"
	case "searchPage":
		name = "page"
	}
	if name == "baseUrl" {
		return a.BaseURL
	}
	return a.Variables[name]
}

func (a *AnalyzeURL) buildURL(urlPart string) (string, error) {
	substituted, err := a.substitute(urlPart)
	if err != nil {
		return "", err
	}
	u := strings.TrimSpace(substituted)
	u = a.applyPageSegments(u)
	if a.BaseURL != "" && !hasHTTPPrefix(u) {
		u = resolveURL(a.BaseURL, u)
	}
	return u, nil
}

// applyPageSegments 处理 Legado 分页占位 `<a,b,c>`：按当前页码选取分段，越界取最后一段。
//
// 如 `/s?q={{key}}<,&page={{page}}>`：第 1 页取空段，之后取 `&page=N`。
// 仅在变量中有合法页码时生效。
func (a *AnalyzeURL) applyPageSegments(u string) string {
	if !strings.Contains(u, "<") || !strings.Contains(u, ">") {
		return u
	}
	page, ok := parseIntStrict(a.Variables["page"])
	if !ok || page < 1 {
		return u
	}
	return pageSegmentRe.ReplaceAllStringFunc(u, func(m string) string {
		inner := m[1 : len(m)-1]
		segments := strings.Split(inner, ",")
		for i := range segments {
			segments[i] = strings.TrimSpace(segments[i])
		}
		if page <= len(segments) {
			return segments[page-1]
		}
		return segments[len(segments)-1]
	})
}

// parseIntStrict 复刻 Python int(str)：仅接受可选符号 + 纯数字。
func parseIntStrict(s string) (int, bool) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, false
	}
	neg := false
	if s[0] == '+' || s[0] == '-' {
		neg = s[0] == '-'
		s = s[1:]
	}
	if s == "" {
		return 0, false
	}
	n := 0
	for _, c := range s {
		if c < '0' || c > '9' {
			return 0, false
		}
		n = n*10 + int(c-'0')
	}
	if neg {
		return -n, true
	}
	return n, true
}

func (a *AnalyzeURL) evalURLJS(code string) (string, error) {
	if hasUnsupportedURLJS(code) {
		return "", NewJsRuleUnsupported(a.RawRule)
	}
	substituted, err := a.substitute(code)
	if err != nil {
		return "", err
	}
	return RunJS(substituted, "", a.Variables, a.BaseURL, 0)
}

// hasUnsupportedURLJS 复刻 analyze_url._has_unsupported_js（比 analyze_rule 多两个标记）。
func hasUnsupportedURLJS(rule string) bool {
	low := strings.ToLower(rule)
	return strings.Contains(low, "<js>") ||
		strings.Contains(low, "{{js.") ||
		strings.Contains(low, "{{java") ||
		strings.Contains(low, "java.ajax") ||
		strings.Contains(low, "java.post")
}

// Fetch 执行请求并返回解码后的文本。
func (a *AnalyzeURL) Fetch(ctx context.Context) (*AnalyzeResponse, error) {
	method := strings.ToUpper(stringifyAny(a.Options["method"]))
	if method == "" {
		method = "GET"
	}
	charsetName := stringifyAny(a.Options["charset"])

	headers := map[string]string{}
	if optHeaders, ok := a.Options["headers"].(map[string]any); ok {
		for k, v := range optHeaders {
			headers[k] = stringifyAny(v)
		}
	}

	opts := safehttp.RequestOptions{
		Headers:    headers,
		Timeout:    a.Timeout,
		HasTimeout: true,
	}
	if method == "POST" {
		body, err := a.substitute(stringifyAny(a.Options["body"]))
		if err != nil {
			return nil, err
		}
		opts.Data = []byte(body)
	}

	client := a.Client
	if client == nil {
		client = &safehttp.SafeHttpClient{}
	}
	resp, err := client.Request(ctx, method, a.URL, opts)
	if err != nil {
		// HostQueueTimeout 原样上抛，其余包成 SourceHttpError。
		if _, ok := err.(*safehttp.HostQueueTimeout); ok {
			return nil, err
		}
		return nil, NewSourceHttpError(err.Error())
	}
	defer resp.Body.Close()

	text, err := DecodeResponse(resp, charsetName)
	if err != nil {
		return nil, NewSourceHttpError(err.Error())
	}
	respHeaders := map[string]string{}
	for k := range resp.Header {
		respHeaders[k] = resp.Header.Get(k)
	}
	finalURL := a.URL
	if resp.Request != nil && resp.Request.URL != nil {
		finalURL = resp.Request.URL.String()
	}
	return &AnalyzeResponse{Text: text, URL: finalURL, Headers: respHeaders}, nil
}

// hasHTTPPrefix 判断是否已是绝对 http(s) URL。
func hasHTTPPrefix(u string) bool {
	low := strings.ToLower(u)
	return strings.HasPrefix(low, "http://") || strings.HasPrefix(low, "https://")
}

// resolveURL 复刻 urllib.parse.urljoin。
func resolveURL(base, ref string) string {
	b, err := url.Parse(base)
	if err != nil {
		return ref
	}
	r, err := url.Parse(ref)
	if err != nil {
		return ref
	}
	return b.ResolveReference(r).String()
}

// httpStatusOK 判断响应状态是否成功。
func httpStatusOK(resp *http.Response) bool {
	return resp != nil && resp.StatusCode >= 200 && resp.StatusCode < 300
}

// requestOptionsForCover 构造封面下载的请求选项（秒级超时）。
func requestOptionsForCover(timeoutSeconds float64) safehttp.RequestOptions {
	return safehttp.RequestOptions{
		Timeout:    secondsToDuration(timeoutSeconds),
		HasTimeout: true,
	}
}

// readLimited 读取至多 maxBytes 字节；maxBytes <= 0 时不限制。
func readLimited(r io.Reader, maxBytes int64) ([]byte, error) {
	if maxBytes <= 0 {
		return io.ReadAll(r)
	}
	return io.ReadAll(io.LimitReader(r, maxBytes))
}
