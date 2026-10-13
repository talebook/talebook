// Package captcha 复刻 webserver/plugins/captcha 的提供商语义。
//
// 支持 image / geetest / turnstile 三种提供商，与 Python 保持一致的
// 配置读取、前端配置结构与校验规则。
package captcha

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// 提供商名称。
const (
	ProviderImage     = "image"
	ProviderGeetest   = "geetest"
	ProviderTurnstile = "turnstile"
)

// 外部接口地址（与 Python 一致）。
const (
	turnstileSDKURL   = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
	turnstileVerify   = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
	geetestSDKURL     = "https://static.geetest.com/v4/gt4.js"
	geetestAPIServer  = "http://gcaptcha4.geetest.com"
	verifyHTTPTimeout = 10 * time.Second
)

// Settings 是提供商读取的配置项，对齐 Python 的 CONF 字典。
type Settings struct {
	// Provider 是 CAPTCHA_PROVIDER；为空表示不启用。
	Provider string
	// 各场景开关，对应 CAPTCHA_ENABLE_FOR_<SCENE>。
	EnableFor map[string]bool
	// Turnstile 凭据。
	TurnstileSiteKey   string
	TurnstileSecretKey string
	// Geetest 凭据。
	GeetestCaptchaID  string
	GeetestCaptchaKey string
	// 图形验证码参数。
	ImageLength int
	ImageWidth  int
	ImageHeight int
}

// Get 读取字符串配置，缺失时返回空串。
func (s Settings) Get(key string) string {
	switch key {
	case "CAPTCHA_PROVIDER":
		return s.Provider
	case "TURNSTILE_SITE_KEY":
		return s.TurnstileSiteKey
	case "TURNSTILE_SECRET_KEY":
		return s.TurnstileSecretKey
	case "GEETEST_CAPTCHA_ID":
		return s.GeetestCaptchaID
	case "GEETEST_CAPTCHA_KEY":
		return s.GeetestCaptchaKey
	}
	return ""
}

// IsEnabledFor 复刻 BaseCaptchaProvider.is_enabled_for。
func (s Settings) IsEnabledFor(scene string) bool {
	return s.EnableFor[strings.ToUpper(scene)]
}

// Provider 是验证提供商接口，对齐 BaseCaptchaProvider。
type Provider interface {
	// Name 返回提供商标识。
	Name() string
	// IsConfigured 报告凭据是否齐备。
	IsConfigured() bool
	// FrontendConfig 返回前端初始化配置。
	FrontendConfig() map[string]any
	// Verify 执行二次验证。
	Verify(params map[string]string) bool
}

// GetProvider 复刻 get_captcha_provider：未配置或名称未知时返回 nil。
func GetProvider(s Settings) Provider {
	switch s.Provider {
	case ProviderImage:
		return &imageProvider{settings: s}
	case ProviderGeetest:
		return &geetestProvider{settings: s}
	case ProviderTurnstile:
		return &turnstileProvider{settings: s}
	default:
		return nil
	}
}

// IsEnabled 复刻 is_captcha_enabled。
func IsEnabled(s Settings, scene string) bool {
	p := GetProvider(s)
	if p == nil {
		return false
	}
	return s.IsEnabledFor(scene)
}

// FrontendConfig 复刻 get_captcha_config：未启用或未配置时返回 nil。
//
// 返回 any 而非 map[string]any，避免 nil map 被装箱成非 nil 接口值，
// 从而让调用方能用 `== nil` 判断「未启用」。
func FrontendConfig(s Settings) any {
	p := GetProvider(s)
	if p == nil || !p.IsConfigured() {
		return nil
	}
	cfg := p.FrontendConfig()
	cfg["enabled"] = true
	scenes := map[string]any{}
	for _, scene := range []string{"register", "login", "welcome", "reset", "download", "read"} {
		scenes[scene] = IsEnabled(s, scene)
	}
	cfg["scenes"] = scenes
	return cfg
}

// Verify 复刻 verify_captcha：未配置提供商时默认通过。
func Verify(s Settings, params map[string]string) bool {
	p := GetProvider(s)
	if p == nil {
		return true
	}
	return p.Verify(params)
}

// ---------------------------------------------------------------------------
// image
// ---------------------------------------------------------------------------

// imageProvider 复刻 ImageCaptchaProvider 的配置与校验部分。
//
// 图片生成在 image.go 中实现。
type imageProvider struct{ settings Settings }

// ImageGenerator 是图形验证码的生成能力。
type ImageGenerator interface {
	// Generate 生成一张验证码图片。
	Generate() (ImageResult, error)
}

// NewImageProvider 构造一个图形验证码提供商。
//
// 对应 Python 中直接实例化 ImageCaptchaProvider(CONF) 的用法。
func NewImageProvider(s Settings) ImageGenerator { return &imageProvider{settings: s} }

func (p *imageProvider) Name() string { return ProviderImage }

// IsConfigured 复刻 Python：图形验证码始终可用。
func (p *imageProvider) IsConfigured() bool { return true }

func (p *imageProvider) FrontendConfig() map[string]any {
	return map[string]any{
		"provider":  ProviderImage,
		"captchaId": "image-captcha",
		"sdkUrl":    "",
	}
}

// Verify 复刻 ImageCaptchaProvider.verify：大小写不敏感、去空白后比较。
func (p *imageProvider) Verify(params map[string]string) bool {
	user := strings.ToUpper(strings.TrimSpace(params["captcha_code"]))
	correct := strings.ToUpper(strings.TrimSpace(params["captcha_answer"]))
	if user == "" || correct == "" {
		return false
	}
	return user == correct
}

// ---------------------------------------------------------------------------
// turnstile
// ---------------------------------------------------------------------------

// turnstileProvider 复刻 TurnstileProvider。
type turnstileProvider struct {
	settings Settings
	// client 可注入，便于测试；为 nil 时用默认客户端。
	client *http.Client
}

func (p *turnstileProvider) Name() string { return ProviderTurnstile }

func (p *turnstileProvider) IsConfigured() bool {
	return p.settings.TurnstileSiteKey != "" && p.settings.TurnstileSecretKey != ""
}

func (p *turnstileProvider) FrontendConfig() map[string]any {
	return map[string]any{
		"provider": ProviderTurnstile,
		"siteKey":  p.settings.TurnstileSiteKey,
		"sdkUrl":   turnstileSDKURL,
	}
}

// Verify 复刻 TurnstileProvider.verify。
//
// token 为空或超过 2048 字节直接失败；接口异常一律失败。
func (p *turnstileProvider) Verify(params map[string]string) bool {
	token := params["turnstile_token"]
	if !p.IsConfigured() || token == "" || len(token) > 2048 {
		return false
	}
	form := url.Values{}
	form.Set("secret", p.settings.TurnstileSecretKey)
	form.Set("response", token)
	if ip := params["remote_ip"]; ip != "" {
		form.Set("remoteip", ip)
	}

	body, ok := p.post(turnstileVerify, form)
	if !ok {
		return false
	}
	var result map[string]any
	if err := json.Unmarshal(body, &result); err != nil {
		return false
	}
	if success, _ := result["success"].(bool); !success {
		return false
	}
	scene := params["scene"]
	if scene == "" {
		return true
	}
	action, _ := result["action"].(string)
	return action == scene
}

// post 发送表单请求，返回响应体；网络或状态码异常时返回 false。
func (p *turnstileProvider) post(endpoint string, form url.Values) ([]byte, bool) {
	client := p.client
	if client == nil {
		client = &http.Client{Timeout: verifyHTTPTimeout}
	}
	resp, err := client.PostForm(endpoint, form)
	if err != nil {
		return nil, false
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, false
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, false
	}
	return body, true
}

// ---------------------------------------------------------------------------
// geetest
// ---------------------------------------------------------------------------

// geetestProvider 复刻 GeetestProvider。
type geetestProvider struct {
	settings Settings
	client   *http.Client
}

func (p *geetestProvider) Name() string { return ProviderGeetest }

func (p *geetestProvider) IsConfigured() bool {
	return p.settings.GeetestCaptchaID != "" && p.settings.GeetestCaptchaKey != ""
}

func (p *geetestProvider) FrontendConfig() map[string]any {
	return map[string]any{
		"provider":  ProviderGeetest,
		"captchaId": p.settings.GeetestCaptchaID,
		"sdkUrl":    geetestSDKURL,
	}
}

// Verify 复刻 GeetestProvider.verify。
//
// 注意 Python 的容错语义：接口异常、非 200、JSON 解析失败时**默认通过**，
// 只有明确返回 result != "success" 才失败。这里逐条对齐。
func (p *geetestProvider) Verify(params map[string]string) bool {
	lotNumber := params["lot_number"]
	captchaOutput := params["captcha_output"]
	passToken := params["pass_token"]
	genTime := params["gen_time"]
	if lotNumber == "" || captchaOutput == "" || passToken == "" || genTime == "" {
		return false
	}
	if !p.IsConfigured() {
		return false
	}

	mac := hmac.New(sha256.New, []byte(p.settings.GeetestCaptchaKey))
	mac.Write([]byte(lotNumber))
	signToken := hex.EncodeToString(mac.Sum(nil))

	form := url.Values{}
	form.Set("lot_number", lotNumber)
	form.Set("captcha_output", captchaOutput)
	form.Set("pass_token", passToken)
	form.Set("gen_time", genTime)
	form.Set("sign_token", signToken)

	endpoint := fmt.Sprintf("%s/validate?captcha_id=%s", geetestAPIServer,
		url.QueryEscape(p.settings.GeetestCaptchaID))

	client := p.client
	if client == nil {
		client = &http.Client{Timeout: verifyHTTPTimeout}
	}
	resp, err := client.PostForm(endpoint, form)
	if err != nil {
		// 请求异常时为保证业务不中断，默认通过（对齐 Python）。
		return true
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		// 接口异常时默认通过（对齐 Python）。
		return true
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return true
	}
	var msg map[string]any
	if err := json.Unmarshal(bytes.TrimSpace(body), &msg); err != nil {
		// JSON 解析失败时默认通过（对齐 Python）。
		return true
	}
	result, _ := msg["result"].(string)
	return result == "success"
}
