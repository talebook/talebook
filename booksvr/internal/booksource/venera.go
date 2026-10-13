package booksource

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/dop251/goja"

	"talebook/booksvr/internal/safehttp"
)

// 在受限的 goja 沙箱中运行一个已验证的 Venera 源，通过 SourceProvider 暴露。
//
// 与 Python 侧 venera.py + venera_worker.py 的差异：
//   - Python 用独立子进程 + QuickJS 承载源脚本，靠 RLIMIT_CPU/RLIMIT_AS 兜底；
//   - Go 侧用同进程 goja VM，靠 Interrupt 超时 + SetMaxCallStackSize 兜底
//     （goja 无内存上限 API，见 B-3a 实测结论）。
//
// 安全边界保持一致：源脚本只能通过 Network.sendRequest 发起请求，
// 且请求必须命中 api.mangadex.org 的 GET 白名单。

// Venera 插件常量。
const (
	VeneraPluginID     = "talebook.source.venera"
	VeneraSourceCommit = "d8a71168a83a6797482a5be9c000989dabf21c08"
	VeneraMaxRequests  = 40
	VeneraMaxPages     = 1000
	VeneraMaxResultLen = 8 * 1024 * 1024
	VeneraDefaultLimit = 20
)

// VeneraSourceURL 是固定版本的源脚本地址。
var VeneraSourceURL = "https://api.github.com/repos/venera-app/venera-configs/contents/manga_dex.js?ref=" +
	VeneraSourceCommit

// VeneraSourceSHA256 是源脚本的期望摘要；测试可临时覆盖。
var VeneraSourceSHA256 = "c8beb84262da8fa3922ff0392fc2f79f03ee36ae08933d10571172ef6c8ce21d"

// VeneraUnsupported 表示源脚本或上游返回了当前接入不支持的内容。
type VeneraUnsupported struct{ Message string }

func (e *VeneraUnsupported) Error() string { return e.Message }

// NewVeneraUnsupported 构造 VeneraUnsupported。
func NewVeneraUnsupported(message string) *VeneraUnsupported {
	return &VeneraUnsupported{Message: message}
}

// VeneraTimeout 表示源脚本加载或执行超时。
type VeneraTimeout struct{ Message string }

func (e *VeneraTimeout) Error() string { return e.Message }

// NewVeneraTimeout 构造 VeneraTimeout。
func NewVeneraTimeout(message string) *VeneraTimeout {
	return &VeneraTimeout{Message: message}
}

// VeneraScopeDenied 表示连接缺少必需权限。
type VeneraScopeDenied struct{ Message string }

func (e *VeneraScopeDenied) Error() string { return e.Message }

// NewVeneraScopeDenied 构造 VeneraScopeDenied。
func NewVeneraScopeDenied(message string) *VeneraScopeDenied {
	return &VeneraScopeDenied{Message: message}
}

// veneraSourceCache 缓存已校验的源脚本（对应 Python 的模块级 _SOURCE）。
var (
	veneraSourceMu    sync.Mutex
	veneraSourceCache string
)

// VeneraSourceScript 拉取并校验源脚本，结果缓存。
//
// 摘要不匹配时拒绝使用，避免上游被篡改后静默执行。
func VeneraSourceScript(ctx context.Context, client *safehttp.SafeHttpClient, timeout time.Duration) (string, error) {
	veneraSourceMu.Lock()
	defer veneraSourceMu.Unlock()
	if veneraSourceCache != "" {
		return veneraSourceCache, nil
	}
	if client == nil {
		client = &safehttp.SafeHttpClient{}
	}
	resp, err := client.Request(ctx, "GET", VeneraSourceURL, safehttp.RequestOptions{
		Headers:    map[string]string{"Accept": "application/vnd.github.raw+json"},
		Timeout:    timeout,
		HasTimeout: true,
	})
	if err != nil {
		return "", NewVeneraUnsupported("无法加载 Venera 源脚本")
	}
	defer resp.Body.Close()
	raw, err := readLimited(resp.Body, VeneraMaxResultLen)
	if err != nil {
		return "", NewVeneraUnsupported("无法加载 Venera 源脚本")
	}
	sum := sha256.Sum256(raw)
	if hex.EncodeToString(sum[:]) != VeneraSourceSHA256 {
		return "", NewVeneraUnsupported("Venera 源脚本摘要不匹配，请管理员检查源版本")
	}
	veneraSourceCache = string(raw)
	return veneraSourceCache, nil
}

// ResetVeneraSourceCache 清空源脚本缓存（测试用）。
func ResetVeneraSourceCache() {
	veneraSourceMu.Lock()
	veneraSourceCache = ""
	veneraSourceMu.Unlock()
}

// VeneraInput 是传给源脚本的输入。
type VeneraInput struct {
	Operation string         `json:"operation"`
	Args      map[string]any `json:"args"`
	Locale    string         `json:"locale"`
	Rating    string         `json:"rating"`
	Settings  map[string]any `json:"settings"`
}

// VeneraConfig 是运行源脚本的配置。
type VeneraConfig struct {
	Locale         string
	ContentRating  string
	ImageQuality   string
	TimeoutSeconds float64
}

// DefaultVeneraConfig 返回与 Python 默认值一致的配置。
func DefaultVeneraConfig() VeneraConfig {
	return VeneraConfig{
		Locale:         "zh_CN",
		ContentRating:  "safe",
		ImageQuality:   "Original",
		TimeoutSeconds: 20,
	}
}

// veneraRequest 是源脚本发起的一次网络请求。
type veneraRequest struct {
	ID      int            `json:"id"`
	Method  string         `json:"method"`
	URL     string         `json:"url"`
	Headers map[string]any `json:"headers"`
	Data    any            `json:"data"`
}

// veneraReply 是宿主回给源脚本的响应。
type veneraReply struct {
	ID       int            `json:"id"`
	Error    bool           `json:"error,omitempty"`
	Response map[string]any `json:"response,omitempty"`
}

// RunVeneraSource 在沙箱中执行一次源操作。
//
// 与 Python 的 run_source 对应：同样的请求白名单、同样的请求数上限、
// 同样的结果体积上限、同样的错误分类。
func RunVeneraSource(ctx context.Context, script, operation string, args map[string]any,
	config VeneraConfig, client *safehttp.SafeHttpClient) (map[string]any, error) {

	timeout := config.TimeoutSeconds
	if timeout < 0.01 {
		timeout = 0.01
	}
	if timeout > 60 {
		timeout = 60
	}
	deadline := time.Now().Add(secondsToDuration(timeout))

	if client == nil {
		client = &safehttp.SafeHttpClient{}
	}

	vm := goja.New()
	vm.SetMaxCallStackSize(512 * 1024)

	input := VeneraInput{
		Operation: operation,
		Args:      args,
		Locale:    config.Locale,
		Rating:    config.ContentRating,
		Settings:  map[string]any{"image_quality": config.ImageQuality},
	}
	inputJSON, err := json.Marshal(input)
	if err != nil {
		return nil, NewVeneraUnsupported("Venera 漫画源返回了不兼容的数据")
	}

	// 超时中断：goja 无内存上限 API，靠 Interrupt 兜底。
	timer := time.AfterFunc(secondsToDuration(timeout), func() {
		vm.Interrupt("venera timeout")
	})
	defer timer.Stop()

	if err := vm.Set("__input_json", string(inputJSON)); err != nil {
		return nil, NewVeneraUnsupported("Venera 漫画源返回了不兼容的数据")
	}
	if _, err := vm.RunString("const __input = JSON.parse(__input_json);"); err != nil {
		return nil, NewVeneraUnsupported("Venera 漫画源返回了不兼容的数据")
	}
	if _, err := vm.RunString(veneraHostJS); err != nil {
		return nil, NewVeneraUnsupported("Venera 漫画源返回了不兼容的数据")
	}
	if _, err := vm.RunString(script + "\nconst source = new MangaDex();"); err != nil {
		return nil, NewVeneraUnsupported("Venera 源执行失败或超出资源限制")
	}

	// 启动异步任务；Promise 的 settle 由 __deliver 驱动。
	if _, err := vm.RunString(
		"__run(source).then(value => {__result = {result: value}}, " +
			"error => {__result = {error: true, requestId: error?.__requestId}});"); err != nil {
		return nil, NewVeneraUnsupported("Venera 源执行失败或超出资源限制")
	}

	requestFailures := map[int]error{}
	requestCount := 0

	for i := 0; i < 10000; i++ {
		if time.Now().After(deadline) {
			return nil, NewVeneraTimeout("Venera 漫画源请求超时，请重试或调整连接超时")
		}
		// goja 在每次顶层 RunString 返回时自动排空 jobQueue（见 runtime.leave），
		// 因此下面的 RunString 调用本身就会推进 Promise 微任务。

		// 结果已就绪？
		if settled, err := veneraResult(vm); err != nil {
			return nil, err
		} else if settled != nil {
			return settled, nil
		}

		// 取出待处理的请求。
		requests, err := veneraPendingRequests(vm)
		if err != nil {
			return nil, err
		}
		if len(requests) == 0 {
			return nil, NewVeneraUnsupported("Venera 源执行失败：接口不兼容或上游响应异常")
		}

		for _, req := range requests {
			requestCount++
			if requestCount > VeneraMaxRequests {
				return nil, NewVeneraUnsupported("漫画源请求过多，章节列表超出当前兼容范围")
			}
			if err := veneraValidateRequest(req); err != nil {
				return nil, err
			}
			remaining := time.Until(deadline)
			if remaining <= 0 {
				return nil, NewVeneraTimeout("Venera 漫画源请求超时")
			}
			reply := veneraFetch(ctx, client, req, remaining, requestFailures)
			if err := veneraDeliver(vm, reply); err != nil {
				return nil, err
			}
		}
	}
	return nil, NewVeneraUnsupported("Venera 源执行失败或超出资源限制")
}

// veneraResult 读取 __result；未就绪返回 nil。
func veneraResult(vm *goja.Runtime) (map[string]any, error) {
	value, err := vm.RunString("JSON.stringify(__result)")
	if err != nil {
		return nil, NewVeneraUnsupported("Venera 源执行失败或超出资源限制")
	}
	if goja.IsUndefined(value) || goja.IsNull(value) {
		return nil, nil
	}
	raw := value.String()
	if raw == "" || raw == "undefined" {
		return nil, nil
	}
	if len(raw) > VeneraMaxResultLen {
		return nil, NewVeneraUnsupported("Venera 源结果超出大小限制")
	}
	var out map[string]any
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return nil, NewVeneraUnsupported("Venera 漫画源返回了不兼容的数据")
	}
	if errFlag, _ := out["error"].(bool); errFlag {
		// 源脚本报错：若关联到具体请求失败，抛出该失败。
		if id, ok := toInt64(out["requestId"]); ok {
			if failure, found := veneraFailureFor(id); found {
				return nil, failure
			}
		}
		return nil, NewVeneraUnsupported("Venera 源执行失败：接口不兼容或上游响应异常")
	}
	result, ok := out["result"].(map[string]any)
	if !ok {
		return nil, NewVeneraUnsupported("Venera 漫画源返回了不兼容的数据")
	}
	return result, nil
}

// veneraFailureFor 由 veneraFetch 注册的失败表查询。
var (
	veneraFailureMu sync.Mutex
	veneraFailures  = map[int]error{}
)

func veneraFailureFor(id int64) (error, bool) {
	veneraFailureMu.Lock()
	defer veneraFailureMu.Unlock()
	err, ok := veneraFailures[int(id)]
	return err, ok
}

// veneraPendingRequests 取出并清空 __requests。
func veneraPendingRequests(vm *goja.Runtime) ([]veneraRequest, error) {
	value, err := vm.RunString("JSON.stringify(__requests.splice(0))")
	if err != nil {
		return nil, NewVeneraUnsupported("Venera 源执行失败或超出资源限制")
	}
	raw := value.String()
	if raw == "" || raw == "undefined" {
		return nil, nil
	}
	var out []veneraRequest
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return nil, NewVeneraUnsupported("Venera 漫画源返回了不兼容的数据")
	}
	return out, nil
}

// veneraValidateRequest 校验源脚本发起的请求是否在白名单内。
func veneraValidateRequest(req veneraRequest) error {
	parsed, err := url.Parse(strings.TrimSpace(req.URL))
	if err != nil {
		return safehttp.NewEndpointPolicyError("Venera 源发起了不受支持的网络请求")
	}
	if req.Method != "GET" ||
		!isEmptyValue(req.Data) ||
		parsed.Scheme != "https" ||
		parsed.Hostname() != "api.mangadex.org" ||
		(parsed.Port() != "" && parsed.Port() != "443") ||
		parsed.User != nil ||
		parsed.Fragment != "" ||
		len(req.Headers) > 0 {
		return safehttp.NewEndpointPolicyError("Venera 源发起了不受支持的网络请求")
	}
	return nil
}

// veneraFetch 执行一次上游请求并构造回复。
func veneraFetch(ctx context.Context, client *safehttp.SafeHttpClient, req veneraRequest,
	remaining time.Duration, failures map[int]error) veneraReply {

	resp, err := client.Request(ctx, "GET", req.URL, safehttp.RequestOptions{
		Timeout:    remaining,
		HasTimeout: true,
	})
	if err != nil {
		// 主机策略与资源限制不可被源脚本吞掉。
		var policyErr *safehttp.EndpointPolicyError
		var tooLarge *safehttp.EndpointResponseTooLarge
		if errors.As(err, &policyErr) || errors.As(err, &tooLarge) {
			return veneraReply{ID: req.ID, Error: true}
		}
		failures[req.ID] = err
		veneraFailureMu.Lock()
		veneraFailures[req.ID] = err
		veneraFailureMu.Unlock()
		// 只有关联 ID 跨 IPC；异常文本可能含敏感信息。
		return veneraReply{ID: req.ID, Error: true}
	}
	defer resp.Body.Close()
	body, err := readLimited(resp.Body, VeneraMaxResultLen)
	if err != nil {
		failures[req.ID] = err
		veneraFailureMu.Lock()
		veneraFailures[req.ID] = err
		veneraFailureMu.Unlock()
		return veneraReply{ID: req.ID, Error: true}
	}
	return veneraReply{
		ID: req.ID,
		Response: map[string]any{
			"status":  resp.StatusCode,
			"headers": map[string]any{},
			"body":    string(body),
		},
	}
}

// veneraDeliver 把回复交给源脚本的 Promise。
func veneraDeliver(vm *goja.Runtime, reply veneraReply) error {
	raw, err := json.Marshal(reply)
	if err != nil {
		return NewVeneraUnsupported("Venera 漫画源返回了不兼容的数据")
	}
	if err := vm.Set("__reply_json", string(raw)); err != nil {
		return NewVeneraUnsupported("Venera 漫画源返回了不兼容的数据")
	}
	if _, err := vm.RunString("var __reply = JSON.parse(__reply_json); __deliver();"); err != nil {
		return NewVeneraUnsupported("Venera 漫画源返回了不兼容的数据")
	}
	return nil
}

// MangaID 规范化 MangaDex 的 UUID 标识。
func MangaID(value any) (string, error) {
	s := stringifyAny(value)
	normalized, err := normalizeUUID(s)
	if err != nil {
		return "", NewVeneraUnsupported("无效的 MangaDex 漫画或章节标识")
	}
	return normalized, nil
}

// uuidRe 匹配 8-4-4-4-12 的十六进制 UUID。
var uuidRe = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

// normalizeUUID 复刻 Python uuid.UUID(str(value)) 的规范化与校验。
func normalizeUUID(s string) (string, error) {
	s = strings.TrimSpace(s)
	// 接受带花括号或 urn:uuid: 前缀的形式。
	s = strings.TrimPrefix(s, "urn:uuid:")
	s = strings.Trim(s, "{}")
	if !uuidRe.MatchString(s) {
		return "", fmt.Errorf("invalid uuid")
	}
	return strings.ToLower(s), nil
}

// ChapterID 生成章节标识：base64url(JSON([bookID, episodeID]))，去掉尾部 `=`。
func ChapterID(bookID, episodeID string) string {
	payload, _ := json.Marshal([]string{bookID, episodeID})
	return strings.TrimRight(base64.URLEncoding.EncodeToString(payload), "=")
}

// ParseChapterID 解析章节标识。
func ParseChapterID(externalID string) (bookID, episodeID string, err error) {
	padded := externalID + strings.Repeat("=", (4-len(externalID)%4)%4)
	raw, decodeErr := base64.URLEncoding.DecodeString(padded)
	if decodeErr != nil {
		return "", "", NewVeneraUnsupported("漫画章节标识无效")
	}
	var parts []string
	if jsonErr := json.Unmarshal(raw, &parts); jsonErr != nil || len(parts) != 2 {
		return "", "", NewVeneraUnsupported("漫画章节标识无效")
	}
	return parts[0], parts[1], nil
}

// veneraImageHostAllowed 判断图片主机是否在已验证的源兼容范围内。
func veneraImageHostAllowed(host string) bool {
	if host == "mangadex.org" || host == "uploads.mangadex.org" {
		return true
	}
	return strings.HasSuffix(host, ".mangadex.network")
}

// veneraImagePathRe 匹配允许的图片路径前缀。
var veneraImagePathRe = regexp.MustCompile(`^/(?:covers|data|data-saver)/[^?#]+$`)

// ImageEndpoint 校验漫画图片地址是否在已验证的源兼容范围内。
func ImageEndpoint(rawURL string) (string, error) {
	parsed, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil {
		return "", safehttp.NewEndpointPolicyError("漫画图片地址不在已验证的源兼容范围内")
	}
	if parsed.Scheme != "https" ||
		!veneraImageHostAllowed(parsed.Hostname()) ||
		(parsed.Port() != "" && parsed.Port() != "443") ||
		parsed.User != nil ||
		parsed.Fragment != "" ||
		!veneraImagePathRe.MatchString(parsed.Path) {
		return "", safehttp.NewEndpointPolicyError("漫画图片地址不在已验证的源兼容范围内")
	}
	return rawURL, nil
}

// VeneraManifest 返回插件清单。
func VeneraManifest() map[string]any {
	return map[string]any{
		"id":            VeneraPluginID,
		"name":          "Venera 漫画源",
		"description":   "在在线书库浏览、搜索并阅读 MangaDex。固定官方 Venera 源脚本；公开阅读无需源账号，论坛登录不支持。",
		"capabilities":  []string{"sources.search", "sources.browse"},
		"homepage":      "https://github.com/venera-app/venera",
		"runtime_kind":  "managed_process",
		"download_mode": "none",
		"actions":       []string{"test"},
		"permissions":   []string{"books.read", "network.read"},
		"config_schema": map[string]any{
			"type":                 "object",
			"required":             []string{"source"},
			"additionalProperties": false,
			"properties": map[string]any{
				"source": map[string]any{
					"type": "string", "title": "漫画源",
					"enum": []string{"MangaDex"}, "default": "MangaDex",
				},
				"locale": map[string]any{
					"type": "string", "title": "标题语言",
					"enum": []string{"zh_CN", "zh_TW", "en"}, "default": "zh_CN",
				},
				"image_quality": map[string]any{
					"type": "string", "title": "图片质量",
					"enum": []string{"Original", "Compressed"}, "default": "Original",
				},
				"content_rating": map[string]any{
					"type": "string", "title": "搜索内容分级",
					"enum": []string{"safe", "suggestive", "erotica"}, "default": "safe",
				},
				"timeout_seconds": map[string]any{
					"type": "integer", "title": "连接超时（秒）",
					"minimum": 1, "maximum": 60, "default": 20,
				},
			},
		},
	}
}
