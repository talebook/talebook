// 本文件复刻 webserver/handlers/captcha.py 的 3 条路由。
package httpapi

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"talebook/booksvr/internal/captcha"
	"talebook/booksvr/internal/userdb"
)

// 路由 pattern。
const (
	rCaptchaConfig = "/api/captcha/config"
	rCaptchaImage  = "/api/captcha/image"
	rCaptchaVerify = "/api/captcha/verify"
)

// bookCaptchaTTL 复刻 BOOK_CAPTCHA_TTL：授权有效期 30 分钟。
const bookCaptchaTTL = 30 * 60

// captchaAnswerTTL 复刻图形验证码答案的有效期（秒）。
const captchaAnswerTTL = 120

// captchaGrantMaxBooks 复刻 Python 的 `[-20:]`：最多保留 20 本书的授权。
const captchaGrantMaxBooks = 20

// captchaCookieAnswer / captchaCookieGenerateTime 是图形验证码的服务端 cookie。
const (
	captchaCookieAnswer       = "captcha_answer"
	captchaCookieGenerateTime = "captcha_generate_time"
)

// CaptchaConfig 是 captcha 路由的配置。
type CaptchaConfig struct {
	// CookieSecret 用于签发/校验 secure cookie。
	CookieSecret string
	// Settings 是提供商配置。
	Settings captcha.Settings
	// Clock 可注入，便于测试；为 nil 时用 time.Now。
	Clock func() int64
}

// now 返回当前 Unix 时间戳。
func (c CaptchaConfig) now() int64 {
	if c.Clock != nil {
		return c.Clock()
	}
	return time.Now().Unix()
}

// captchaScene 是场景名到配置键的映射。
var captchaScenes = []string{"register", "login", "welcome", "reset", "download", "read"}

// captchaGrantContext 复刻 _grant_context：账号或凭据变化时授权失效。
func captchaGrantContext(ctx *Context, cfg CaptchaConfig) map[string]any {
	credentials := []string{
		cfg.Settings.Get("CAPTCHA_PROVIDER"),
		cfg.Settings.Get("TURNSTILE_SITE_KEY"),
		cfg.Settings.Get("TURNSTILE_SECRET_KEY"),
		cfg.Settings.Get("GEETEST_CAPTCHA_ID"),
		cfg.Settings.Get("GEETEST_CAPTCHA_KEY"),
	}
	raw, _ := json.Marshal(credentials)
	sum := sha256.Sum256(raw)

	// Python 的 current_user / admin_user 是两个独立身份；
	// Go 侧 Identity 只保留一个 UserID 与 IsAdmin 标志，
	// 因此 admin 字段在管理员登录时取同一 ID。
	var userID, adminID any
	if ctx.Identity.UserID > 0 {
		userID = ctx.Identity.UserID
	}
	if ctx.Identity.IsAdmin && ctx.Identity.UserID > 0 {
		adminID = ctx.Identity.UserID
	}
	return map[string]any{
		"user":     userID,
		"admin":    adminID,
		"provider": hex.EncodeToString(sum[:]),
	}
}

// captchaGrantPayload 是授权 cookie 的载荷。
type captchaGrantPayload struct {
	Context map[string]any     `json:"context"`
	Books   map[string]float64 `json:"books"`
}

// bookGrants 复刻 _book_grants：读取并过滤过期授权。
func bookGrants(ctx *Context, cfg CaptchaConfig, scene string) map[string]float64 {
	raw := decodeSecureCookie(ctx, cfg.CookieSecret, "captcha_"+scene, cfg.Clock)
	if len(raw) == 0 {
		return map[string]float64{}
	}
	var payload captchaGrantPayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return map[string]float64{}
	}
	if !sameGrantContext(payload.Context, captchaGrantContext(ctx, cfg)) {
		return map[string]float64{}
	}
	now := float64(cfg.now())
	out := map[string]float64{}
	for bid, issued := range payload.Books {
		if age := now - issued; age >= 0 && age < bookCaptchaTTL {
			out[bid] = issued
		}
	}
	return out
}

// sameGrantContext 比较两个授权上下文是否等价。
func sameGrantContext(a, b map[string]any) bool {
	if len(a) != len(b) {
		return false
	}
	for k, av := range a {
		bv, ok := b[k]
		if !ok || !sameJSONScalar(av, bv) {
			return false
		}
	}
	return true
}

// sameJSONScalar 比较两个 JSON 标量（数字按 float64 归一）。
func sameJSONScalar(a, b any) bool {
	af, aok := toFloat(a)
	bf, bok := toFloat(b)
	if aok && bok {
		return af == bf
	}
	as, aok2 := a.(string)
	bs, bok2 := b.(string)
	if aok2 && bok2 {
		return as == bs
	}
	return a == nil && b == nil
}

// toFloat 把 JSON 数字转成 float64。
func toFloat(v any) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case int64:
		return float64(n), true
	case int:
		return float64(n), true
	}
	return 0, false
}

// decodeSecureCookie 读取并校验一个 Tornado secure cookie。
func decodeSecureCookie(ctx *Context, secret, name string, clock func() int64) []byte {
	c, err := ctx.Request.Cookie(name)
	if err != nil || c == nil || c.Value == "" {
		return nil
	}
	return DecodeSignedValue(secret, name, []byte(c.Value), cookieExpiresDays, clock)
}

// setCaptchaCookie 写一个 secure cookie，可指定有效期与 secure 标志。
func setCaptchaCookie(ctx *Context, cfg CaptchaConfig, name, value string, maxAge int, secure bool) {
	signed := SignCookie(cfg.CookieSecret, name, value, cfg.now())
	http.SetCookie(ctx.Writer, &http.Cookie{
		Name:     name,
		Value:    signed,
		Path:     "/",
		MaxAge:   maxAge,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   secure,
	})
}

// checkCaptcha 复刻 check_captcha。
//
// 返回 (是否通过, 失败提示)。required=false 且场景未启用时直接通过。
func checkCaptcha(ctx *Context, cfg CaptchaConfig, scene string, consume, required bool) (bool, string) {
	if !required && !captcha.IsEnabled(cfg.Settings, scene) {
		return true, ""
	}
	provider := captcha.GetProvider(cfg.Settings)
	if provider == nil || !provider.IsConfigured() {
		return false, "人机验证未正确配置，请联系管理员"
	}

	switch provider.Name() {
	case captcha.ProviderImage:
		code := ctx.Request.FormValue("captcha_code")
		answer := decodeSecureCookie(ctx, cfg.CookieSecret, captchaCookieAnswer, cfg.Clock)
		generated := decodeSecureCookie(ctx, cfg.CookieSecret, captchaCookieGenerateTime, cfg.Clock)
		if code == "" {
			return false, "请完成人机验证"
		}
		age, err := strconv.ParseFloat(strings.TrimSpace(string(generated)), 64)
		if err != nil || len(answer) == 0 {
			return false, "验证码已过期，请刷新"
		}
		elapsed := float64(cfg.now()) - age
		if elapsed < 0 || elapsed > captchaAnswerTTL {
			return false, "验证码已过期，请刷新"
		}
		passed := provider.Verify(map[string]string{
			"captcha_code":   code,
			"captcha_answer": string(answer),
		})
		if passed && consume {
			clearCookie(ctx.Writer, captchaCookieAnswer)
			clearCookie(ctx.Writer, captchaCookieGenerateTime)
		}
		if !passed {
			return false, "人机验证失败，请重试"
		}
		return true, ""

	case captcha.ProviderTurnstile:
		passed := provider.Verify(map[string]string{
			"turnstile_token": ctx.Request.FormValue("turnstile_token"),
			"remote_ip":       remoteIP(ctx.Request),
			"scene":           scene,
		})
		if !passed {
			return false, "人机验证失败，请重试"
		}
		return true, ""

	default:
		params := map[string]string{}
		for _, key := range []string{"lot_number", "captcha_output", "pass_token", "gen_time"} {
			params[key] = ctx.Request.FormValue(key)
		}
		for _, v := range params {
			if v == "" {
				return false, "请完成人机验证"
			}
		}
		if !provider.Verify(params) {
			return false, "人机验证失败，请重试"
		}
		return true, ""
	}
}

// CaptchaConfigHandler 实现 /api/captcha/config（GET）。
func CaptchaConfigHandler(cfg CaptchaConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		scenes := map[string]any{}
		for _, scene := range captchaScenes {
			scenes[scene] = captcha.IsEnabled(cfg.Settings, scene)
		}
		return map[string]any{
			"err":    "ok",
			"config": captcha.FrontendConfig(cfg.Settings),
			"scenes": scenes,
		}, nil
	}
}

// CaptchaImageHandler 实现 /api/captcha/image（GET）。
func CaptchaImageHandler(cfg CaptchaConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		// Python 直接构造 ImageCaptchaProvider(CONF)，与当前提供商无关。
		img := captcha.NewImageProvider(cfg.Settings)
		result, err := img.Generate()
		if err != nil {
			return nil, err
		}
		// 答案与生成时间写入 secure cookie，有效期 120 秒。
		setCaptchaCookie(ctx, cfg, captchaCookieAnswer, result.Code, captchaAnswerTTL, false)
		setCaptchaCookie(ctx, cfg, captchaCookieGenerateTime,
			strconv.FormatInt(cfg.now(), 10), captchaAnswerTTL, false)
		return map[string]any{
			"err":        "ok",
			"captcha_id": result.CaptchaID,
			"image":      result.Image,
		}, nil
	}
}

// CaptchaVerifyHandler 实现 /api/captcha/verify（POST）。
func CaptchaVerifyHandler(cfg CaptchaConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		provider := ctx.Request.FormValue("provider")
		if provider == "" || provider != cfg.Settings.Get("CAPTCHA_PROVIDER") {
			return map[string]any{"err": "params.invalid", "msg": "验证提供商不匹配"}, nil
		}

		scene := ctx.Request.FormValue("scene")
		var bookID int64
		if scene != "" {
			if scene != "download" && scene != "read" {
				return map[string]any{"err": "params.invalid", "msg": "验证场景无效"}, nil
			}
			parsed, err := strconv.ParseInt(strings.TrimSpace(ctx.Request.FormValue("book_id")), 10, 64)
			if err != nil {
				return map[string]any{"err": "params.invalid", "msg": "书籍编号无效"}, nil
			}
			bookID = parsed
			if !bookExists(ctx, bookID) {
				return map[string]any{"err": "not_found", "msg": "抱歉，这本书不存在"}, nil
			}
			if !captcha.IsEnabled(cfg.Settings, scene) {
				return map[string]any{"err": "ok"}, nil
			}
		} else {
			// 图形验证码组件在父表单提交前预览答案。
			if provider != captcha.ProviderImage {
				return map[string]any{"err": "params.invalid", "msg": "验证场景无效"}, nil
			}
			scene = "preview"
		}

		valid, message := checkCaptcha(ctx, cfg, scene, scene != "preview", true)
		if !valid {
			return map[string]any{"err": "captcha.invalid", "msg": message}, nil
		}

		if scene != "preview" {
			grants := bookGrants(ctx, cfg, scene)
			grants[strconv.FormatInt(bookID, 10)] = float64(cfg.now())
			grants = trimGrants(grants, captchaGrantMaxBooks)
			payload, err := json.Marshal(captchaGrantPayload{
				Context: captchaGrantContext(ctx, cfg),
				Books:   grants,
			})
			if err != nil {
				return nil, err
			}
			secure := ctx.Request.TLS != nil || strings.EqualFold(ctx.Request.Header.Get("X-Forwarded-Proto"), "https")
			setCaptchaCookie(ctx, cfg, "captcha_"+scene, string(payload), bookCaptchaTTL, secure)
			ctx.Writer.Header().Set("Cache-Control", "no-store")
		}
		return map[string]any{"err": "ok", "msg": "验证通过"}, nil
	}
}

// trimGrants 复刻 Python 的 `sorted(..., key=item[1])[-20:]`：按签发时间保留最新 N 条。
func trimGrants(grants map[string]float64, limit int) map[string]float64 {
	if len(grants) <= limit {
		return grants
	}
	type entry struct {
		key    string
		issued float64
	}
	entries := make([]entry, 0, len(grants))
	for k, v := range grants {
		entries = append(entries, entry{k, v})
	}
	// 按签发时间升序，保留最后 limit 条。
	sort.Slice(entries, func(i, j int) bool {
		if entries[i].issued != entries[j].issued {
			return entries[i].issued < entries[j].issued
		}
		return entries[i].key < entries[j].key
	})
	out := make(map[string]float64, limit)
	for _, e := range entries[len(entries)-limit:] {
		out[e.key] = e.issued
	}
	return out
}

// bookExists 报告书库中是否存在该书（复刻 get_book(raise_exception=False)）。
func bookExists(ctx *Context, bookID int64) bool {
	item, err := userdb.GetItem(ctx.DB, bookID)
	if err != nil {
		return false
	}
	return item != nil
}

// CaptchaRouteSpecs 返回 captcha 模块接管的 3 条路由。
func CaptchaRouteSpecs(cfg CaptchaConfig) []RouteSpec {
	return []RouteSpec{
		{Pattern: rCaptchaConfig, Methods: []string{http.MethodGet}, Handler: CaptchaConfigHandler(cfg)},
		{Pattern: rCaptchaImage, Methods: []string{http.MethodGet}, Handler: CaptchaImageHandler(cfg)},
		{Pattern: rCaptchaVerify, Methods: []string{http.MethodPost}, Handler: CaptchaVerifyHandler(cfg)},
	}
}
