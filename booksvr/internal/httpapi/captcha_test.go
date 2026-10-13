package httpapi

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strconv"
	"strings"
	"testing"

	"talebook/booksvr/internal/captcha"

	_ "modernc.org/sqlite"
)

// captchaTestDB 建一个含 books / items 的内存库。
func captchaTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	stmts := []string{
		`CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT, path TEXT, has_cover BOOLEAN,
			last_modified TEXT)`,
		`CREATE TABLE items (book_id INTEGER PRIMARY KEY, count_guest INTEGER DEFAULT 0,
			count_visit INTEGER DEFAULT 0, count_download INTEGER DEFAULT 0, website TEXT DEFAULT '',
			collector_id INTEGER, scope TEXT DEFAULT 'public', book_type TEXT DEFAULT 'ebook',
			media_type TEXT DEFAULT 'unknown', media_type_locked BOOLEAN DEFAULT 0,
			create_time TEXT, src_path TEXT DEFAULT '')`,
	}
	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			t.Fatalf("建表失败: %v\n%s", err, s)
		}
	}
	return db
}

// captchaSeedBook 插入一本书。
func captchaSeedBook(t *testing.T, db *sql.DB, id int64) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO books (id, title, path, has_cover, last_modified)
		VALUES (?, ?, ?, 0, '2026-01-01 00:00:00')`, id, "书"+strconv.FormatInt(id, 10),
		"p"+strconv.FormatInt(id, 10)); err != nil {
		t.Fatalf("插入 books 失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO items (book_id, scope, media_type) VALUES (?, 'public', 'ebook')`,
		id); err != nil {
		t.Fatalf("插入 items 失败: %v", err)
	}
}

// captchaImageSettings 返回启用 image 提供商的配置。
func captchaImageSettings() captcha.Settings {
	return captcha.Settings{
		Provider:    captcha.ProviderImage,
		EnableFor:   map[string]bool{"READ": true},
		ImageLength: 4,
		ImageWidth:  120,
		ImageHeight: 40,
	}
}

// captchaCtx 构造请求上下文。
func captchaCtx(t *testing.T, db *sql.DB, method, target string, form url.Values, userID int64, admin bool) (*Context, *httptest.ResponseRecorder) {
	t.Helper()
	var body *strings.Reader
	if form != nil {
		body = strings.NewReader(form.Encode())
	} else {
		body = strings.NewReader("")
	}
	req := httptest.NewRequest(method, target, body)
	if form != nil {
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	}
	rec := httptest.NewRecorder()
	return &Context{
		Request: req, Writer: rec, DB: db,
		Identity: Identity{UserID: userID, Username: "u", IsAdmin: admin},
	}, rec
}

// cookieByName 从响应中取指定 cookie。
func cookieByName(rec *httptest.ResponseRecorder, name string) *http.Cookie {
	for _, c := range rec.Result().Cookies() {
		if c.Name == name {
			return c
		}
	}
	return nil
}

// TestCaptchaConfigHandler 覆盖配置接口。
func TestCaptchaConfigHandler(t *testing.T) {
	db := captchaTestDB(t)
	cfg := CaptchaConfig{CookieSecret: "s", Settings: captchaImageSettings()}
	ctx, _ := captchaCtx(t, db, http.MethodGet, "/api/captcha/config", nil, 0, false)

	resp, err := CaptchaConfigHandler(cfg)(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("err = %v", resp["err"])
	}
	conf, ok := resp["config"].(map[string]any)
	if !ok {
		t.Fatalf("config 类型错误: %T", resp["config"])
	}
	if conf["provider"] != captcha.ProviderImage {
		t.Errorf("provider = %v", conf["provider"])
	}
	scenes, ok := resp["scenes"].(map[string]any)
	if !ok {
		t.Fatalf("scenes 类型错误: %T", resp["scenes"])
	}
	if len(scenes) != 6 {
		t.Errorf("scenes 应有 6 项，得到 %d", len(scenes))
	}
	if scenes["read"] != true || scenes["login"] != false {
		t.Errorf("scenes 内容错误: %v", scenes)
	}
}

// TestCaptchaConfigDisabled 未配置提供商时 config 为 nil、scenes 全 false。
func TestCaptchaConfigDisabled(t *testing.T) {
	db := captchaTestDB(t)
	cfg := CaptchaConfig{CookieSecret: "s", Settings: captcha.Settings{}}
	ctx, _ := captchaCtx(t, db, http.MethodGet, "/api/captcha/config", nil, 0, false)

	resp, err := CaptchaConfigHandler(cfg)(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if resp["config"] != nil {
		t.Errorf("config 应为 nil，得到 %v", resp["config"])
	}
	scenes := resp["scenes"].(map[string]any)
	for k, v := range scenes {
		if v != false {
			t.Errorf("场景 %s 应为 false", k)
		}
	}
}

// TestCaptchaImageHandler 覆盖图片接口：返回图片并写入答案 cookie。
func TestCaptchaImageHandler(t *testing.T) {
	db := captchaTestDB(t)
	cfg := CaptchaConfig{CookieSecret: "s", Settings: captchaImageSettings()}
	ctx, rec := captchaCtx(t, db, http.MethodGet, "/api/captcha/image", nil, 0, false)

	resp, err := CaptchaImageHandler(cfg)(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("err = %v", resp["err"])
	}
	if id, _ := resp["captcha_id"].(string); len(id) != 36 {
		t.Errorf("captcha_id 格式错误: %v", resp["captcha_id"])
	}
	img, _ := resp["image"].(string)
	if !strings.HasPrefix(img, "data:image/png;base64,") {
		t.Errorf("image 前缀错误: %.40s", img)
	}

	// 答案与生成时间 cookie 必须存在且可解出。
	answer := cookieByName(rec, captchaCookieAnswer)
	if answer == nil {
		t.Fatal("缺少 captcha_answer cookie")
	}
	raw := DecodeSignedValue("s", captchaCookieAnswer, []byte(answer.Value), cookieExpiresDays, nil)
	if len(raw) != 4 {
		t.Errorf("答案长度 = %d, want 4", len(raw))
	}
	if cookieByName(rec, captchaCookieGenerateTime) == nil {
		t.Error("缺少 captcha_generate_time cookie")
	}
}

// TestCaptchaVerifyPreview 覆盖图形验证码预览（scene 为空）。
func TestCaptchaVerifyPreview(t *testing.T) {
	db := captchaTestDB(t)
	cfg := CaptchaConfig{CookieSecret: "s", Settings: captchaImageSettings()}

	// 先取一张图，拿到答案。
	imgCtx, imgRec := captchaCtx(t, db, http.MethodGet, "/api/captcha/image", nil, 0, false)
	if _, err := CaptchaImageHandler(cfg)(imgCtx); err != nil {
		t.Fatalf("取图失败: %v", err)
	}
	answerCookie := cookieByName(imgRec, captchaCookieAnswer)
	genCookie := cookieByName(imgRec, captchaCookieGenerateTime)
	answer := string(DecodeSignedValue("s", captchaCookieAnswer, []byte(answerCookie.Value), cookieExpiresDays, nil))

	form := url.Values{"provider": {"image"}, "captcha_code": {strings.ToLower(answer)}}
	ctx, rec := captchaCtx(t, db, http.MethodPost, "/api/captcha/verify", form, 0, false)
	ctx.Request.AddCookie(answerCookie)
	ctx.Request.AddCookie(genCookie)

	resp, err := CaptchaVerifyHandler(cfg)(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("应通过: %v", resp)
	}
	if resp["msg"] != "验证通过" {
		t.Errorf("msg = %v", resp["msg"])
	}
	// preview 场景不写授权 cookie。
	if c := cookieByName(rec, "captcha_preview"); c != nil {
		t.Error("preview 不应写授权 cookie")
	}
}

// TestCaptchaVerifyWrongCode 验证码错误时返回 captcha.invalid。
func TestCaptchaVerifyWrongCode(t *testing.T) {
	db := captchaTestDB(t)
	cfg := CaptchaConfig{CookieSecret: "s", Settings: captchaImageSettings()}

	imgCtx, imgRec := captchaCtx(t, db, http.MethodGet, "/api/captcha/image", nil, 0, false)
	if _, err := CaptchaImageHandler(cfg)(imgCtx); err != nil {
		t.Fatalf("取图失败: %v", err)
	}
	form := url.Values{"provider": {"image"}, "captcha_code": {"ZZZZ"}}
	ctx, _ := captchaCtx(t, db, http.MethodPost, "/api/captcha/verify", form, 0, false)
	ctx.Request.AddCookie(cookieByName(imgRec, captchaCookieAnswer))
	ctx.Request.AddCookie(cookieByName(imgRec, captchaCookieGenerateTime))

	resp, err := CaptchaVerifyHandler(cfg)(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if resp["err"] != "captcha.invalid" {
		t.Errorf("err = %v, want captcha.invalid", resp["err"])
	}
}

// TestCaptchaVerifyProviderMismatch 提供商不匹配。
func TestCaptchaVerifyProviderMismatch(t *testing.T) {
	db := captchaTestDB(t)
	cfg := CaptchaConfig{CookieSecret: "s", Settings: captchaImageSettings()}
	form := url.Values{"provider": {"turnstile"}, "captcha_code": {"ABCD"}}
	ctx, _ := captchaCtx(t, db, http.MethodPost, "/api/captcha/verify", form, 0, false)

	resp, err := CaptchaVerifyHandler(cfg)(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if resp["err"] != "params.invalid" {
		t.Errorf("err = %v, want params.invalid", resp["err"])
	}
}

// TestCaptchaVerifyBookScene 覆盖带 book_id 的下载/阅读场景。
func TestCaptchaVerifyBookScene(t *testing.T) {
	db := captchaTestDB(t)
	captchaSeedBook(t, db, 1)
	cfg := CaptchaConfig{CookieSecret: "s", Settings: captchaImageSettings()}

	imgCtx, imgRec := captchaCtx(t, db, http.MethodGet, "/api/captcha/image", nil, 0, false)
	if _, err := CaptchaImageHandler(cfg)(imgCtx); err != nil {
		t.Fatalf("取图失败: %v", err)
	}
	answer := string(DecodeSignedValue("s", captchaCookieAnswer,
		[]byte(cookieByName(imgRec, captchaCookieAnswer).Value), cookieExpiresDays, nil))

	form := url.Values{
		"provider": {"image"}, "scene": {"read"}, "book_id": {"1"},
		"captcha_code": {answer},
	}
	ctx, rec := captchaCtx(t, db, http.MethodPost, "/api/captcha/verify", form, 7, false)
	ctx.Request.AddCookie(cookieByName(imgRec, captchaCookieAnswer))
	ctx.Request.AddCookie(cookieByName(imgRec, captchaCookieGenerateTime))

	resp, err := CaptchaVerifyHandler(cfg)(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("应通过: %v", resp)
	}
	// 必须写入 captcha_read 授权 cookie，且含该书 ID。
	grant := cookieByName(rec, "captcha_read")
	if grant == nil {
		t.Fatal("缺少 captcha_read cookie")
	}
	raw := DecodeSignedValue("s", "captcha_read", []byte(grant.Value), cookieExpiresDays, nil)
	var payload captchaGrantPayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		t.Fatalf("授权载荷解析失败: %v", err)
	}
	if _, ok := payload.Books["1"]; !ok {
		t.Errorf("授权应含书 1，得到 %v", payload.Books)
	}
}

// TestCaptchaVerifyBookNotFound 书不存在时返回 not_found。
func TestCaptchaVerifyBookNotFound(t *testing.T) {
	db := captchaTestDB(t)
	cfg := CaptchaConfig{CookieSecret: "s", Settings: captchaImageSettings()}
	form := url.Values{"provider": {"image"}, "scene": {"read"}, "book_id": {"999"}}
	ctx, _ := captchaCtx(t, db, http.MethodPost, "/api/captcha/verify", form, 7, false)

	resp, err := CaptchaVerifyHandler(cfg)(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if resp["err"] != "not_found" {
		t.Errorf("err = %v, want not_found", resp["err"])
	}
}

// TestCaptchaVerifyBadScene 非法场景与非法书号。
func TestCaptchaVerifyBadScene(t *testing.T) {
	db := captchaTestDB(t)
	cfg := CaptchaConfig{CookieSecret: "s", Settings: captchaImageSettings()}

	cases := []struct {
		name string
		form url.Values
		want string
	}{
		{"非法场景", url.Values{"provider": {"image"}, "scene": {"login"}, "book_id": {"1"}}, "params.invalid"},
		{"非法书号", url.Values{"provider": {"image"}, "scene": {"read"}, "book_id": {"abc"}}, "params.invalid"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			ctx, _ := captchaCtx(t, db, http.MethodPost, "/api/captcha/verify", tc.form, 7, false)
			resp, err := CaptchaVerifyHandler(cfg)(ctx)
			if err != nil {
				t.Fatalf("失败: %v", err)
			}
			if resp["err"] != tc.want {
				t.Errorf("err = %v, want %v", resp["err"], tc.want)
			}
		})
	}
}

// TestCaptchaVerifySceneDisabled 场景未启用时直接返回 ok。
func TestCaptchaVerifySceneDisabled(t *testing.T) {
	db := captchaTestDB(t)
	captchaSeedBook(t, db, 1)
	// 只启用 read，这里用 download 场景（未启用）。
	cfg := CaptchaConfig{CookieSecret: "s", Settings: captchaImageSettings()}
	form := url.Values{"provider": {"image"}, "scene": {"download"}, "book_id": {"1"}}
	ctx, _ := captchaCtx(t, db, http.MethodPost, "/api/captcha/verify", form, 7, false)

	resp, err := CaptchaVerifyHandler(cfg)(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Errorf("err = %v, want ok", resp["err"])
	}
	if len(resp) != 1 {
		t.Errorf("场景未启用时应只返回 err，得到 %v", resp)
	}
}

// TestCaptchaVerifyExpired 答案过期时返回 captcha.invalid。
func TestCaptchaVerifyExpired(t *testing.T) {
	db := captchaTestDB(t)
	now := int64(1_000_000)
	cfg := CaptchaConfig{
		CookieSecret: "s",
		Settings:     captchaImageSettings(),
		Clock:        func() int64 { return now },
	}

	// 用旧时间戳签发 cookie，再让时钟前进超过 120 秒。
	old := now - captchaAnswerTTL - 1
	answer := SignCookie("s", captchaCookieAnswer, "ABCD", old)
	generated := SignCookie("s", captchaCookieGenerateTime, strconv.FormatInt(old, 10), old)

	form := url.Values{"provider": {"image"}, "captcha_code": {"ABCD"}}
	ctx, _ := captchaCtx(t, db, http.MethodPost, "/api/captcha/verify", form, 0, false)
	ctx.Request.AddCookie(&http.Cookie{Name: captchaCookieAnswer, Value: answer})
	ctx.Request.AddCookie(&http.Cookie{Name: captchaCookieGenerateTime, Value: generated})

	resp, err := CaptchaVerifyHandler(cfg)(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if resp["err"] != "captcha.invalid" {
		t.Errorf("err = %v, want captcha.invalid", resp["err"])
	}
	if resp["msg"] != "验证码已过期，请刷新" {
		t.Errorf("msg = %v", resp["msg"])
	}
}

// TestCaptchaVerifyNoProviderConfigured 提供商未配置时提示联系管理员。
func TestCaptchaVerifyNoProviderConfigured(t *testing.T) {
	db := captchaTestDB(t)
	// turnstile 但缺凭据；用 read 场景进入 checkCaptcha。
	captchaSeedBook(t, db, 1)
	s := captcha.Settings{Provider: captcha.ProviderTurnstile, EnableFor: map[string]bool{"READ": true}}
	cfg := CaptchaConfig{CookieSecret: "s", Settings: s}
	form := url.Values{"provider": {"turnstile"}, "scene": {"read"}, "book_id": {"1"},
		"turnstile_token": {"t"}}
	ctx, _ := captchaCtx(t, db, http.MethodPost, "/api/captcha/verify", form, 0, false)

	resp, err := CaptchaVerifyHandler(cfg)(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if resp["err"] != "captcha.invalid" {
		t.Errorf("err = %v, want captcha.invalid", resp["err"])
	}
	if resp["msg"] != "人机验证未正确配置，请联系管理员" {
		t.Errorf("msg = %v", resp["msg"])
	}
}

// TestCaptchaVerifyTurnstileScene 覆盖 turnstile 分支的完整链路。
func TestCaptchaVerifyTurnstileScene(t *testing.T) {
	db := captchaTestDB(t)
	captchaSeedBook(t, db, 1)
	s := captcha.Settings{
		Provider:           captcha.ProviderTurnstile,
		EnableFor:          map[string]bool{"READ": true},
		TurnstileSiteKey:   "site",
		TurnstileSecretKey: "secret",
	}
	cfg := CaptchaConfig{CookieSecret: "s", Settings: s}

	// 无 token 时 turnstile 校验失败。
	form := url.Values{"provider": {"turnstile"}, "scene": {"read"}, "book_id": {"1"}}
	ctx, _ := captchaCtx(t, db, http.MethodPost, "/api/captcha/verify", form, 7, false)
	resp, err := CaptchaVerifyHandler(cfg)(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if resp["err"] != "captcha.invalid" {
		t.Errorf("err = %v, want captcha.invalid", resp["err"])
	}
	if resp["msg"] != "人机验证失败，请重试" {
		t.Errorf("msg = %v", resp["msg"])
	}
}

// TestCaptchaVerifyGeetestMissingParams 极验缺参数时提示完成验证。
func TestCaptchaVerifyGeetestMissingParams(t *testing.T) {
	db := captchaTestDB(t)
	captchaSeedBook(t, db, 1)
	s := captcha.Settings{
		Provider:          captcha.ProviderGeetest,
		EnableFor:         map[string]bool{"READ": true},
		GeetestCaptchaID:  "cid",
		GeetestCaptchaKey: "ckey",
	}
	cfg := CaptchaConfig{CookieSecret: "s", Settings: s}
	form := url.Values{"provider": {"geetest"}, "scene": {"read"}, "book_id": {"1"}}
	ctx, _ := captchaCtx(t, db, http.MethodPost, "/api/captcha/verify", form, 7, false)

	resp, err := CaptchaVerifyHandler(cfg)(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if resp["err"] != "captcha.invalid" {
		t.Errorf("err = %v, want captcha.invalid", resp["err"])
	}
	if resp["msg"] != "请完成人机验证" {
		t.Errorf("msg = %v", resp["msg"])
	}
}

// TestCaptchaVerifyImageNoCode 图形验证码未填时提示完成验证。
func TestCaptchaVerifyImageNoCode(t *testing.T) {
	db := captchaTestDB(t)
	cfg := CaptchaConfig{CookieSecret: "s", Settings: captchaImageSettings()}
	form := url.Values{"provider": {"image"}}
	ctx, _ := captchaCtx(t, db, http.MethodPost, "/api/captcha/verify", form, 0, false)

	resp, err := CaptchaVerifyHandler(cfg)(ctx)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if resp["err"] != "captcha.invalid" || resp["msg"] != "请完成人机验证" {
		t.Errorf("得到 %v", resp)
	}
}

// TestCaptchaGrantContextInvalidation 账号或凭据变化时授权失效。
func TestCaptchaGrantContextInvalidation(t *testing.T) {
	db := captchaTestDB(t)
	cfg := CaptchaConfig{CookieSecret: "s", Settings: captchaImageSettings()}

	// 用户 7 写入授权。
	ctx7, _ := captchaCtx(t, db, http.MethodGet, "/", nil, 7, false)
	payload, err := json.Marshal(captchaGrantPayload{
		Context: captchaGrantContext(ctx7, cfg),
		Books:   map[string]float64{"1": float64(cfg.now())},
	})
	if err != nil {
		t.Fatalf("序列化失败: %v", err)
	}
	cookie := &http.Cookie{Name: "captcha_read", Value: SignCookie("s", "captcha_read", string(payload), cfg.now())}

	// 同一用户可读到授权。
	ctx7.Request.AddCookie(cookie)
	if got := bookGrants(ctx7, cfg, "read"); len(got) != 1 {
		t.Errorf("同用户应读到 1 条授权，得到 %v", got)
	}

	// 换用户后授权失效。
	ctx8, _ := captchaCtx(t, db, http.MethodGet, "/", nil, 8, false)
	ctx8.Request.AddCookie(cookie)
	if got := bookGrants(ctx8, cfg, "read"); len(got) != 0 {
		t.Errorf("换用户后应失效，得到 %v", got)
	}

	// 换提供商凭据后授权失效。
	changed := cfg
	changed.Settings.TurnstileSiteKey = "new"
	ctx7b, _ := captchaCtx(t, db, http.MethodGet, "/", nil, 7, false)
	ctx7b.Request.AddCookie(cookie)
	if got := bookGrants(ctx7b, changed, "read"); len(got) != 0 {
		t.Errorf("换凭据后应失效，得到 %v", got)
	}
}

// TestTrimGrants 只保留最新的 N 条授权。
func TestTrimGrants(t *testing.T) {
	grants := map[string]float64{}
	for i := 0; i < 25; i++ {
		grants[strconv.Itoa(i)] = float64(i)
	}
	out := trimGrants(grants, captchaGrantMaxBooks)
	if len(out) != captchaGrantMaxBooks {
		t.Fatalf("应保留 %d 条，得到 %d", captchaGrantMaxBooks, len(out))
	}
	// 最新的 20 条是 5..24。
	for i := 5; i < 25; i++ {
		if _, ok := out[strconv.Itoa(i)]; !ok {
			t.Errorf("应保留 %d", i)
		}
	}
	if _, ok := out["4"]; ok {
		t.Error("不应保留 4")
	}
}

// TestCaptchaRouteSpecs 路由注册与 pattern 正确。
func TestCaptchaRouteSpecs(t *testing.T) {
	specs := CaptchaRouteSpecs(CaptchaConfig{CookieSecret: "s", Settings: captchaImageSettings()})
	if len(specs) != 3 {
		t.Fatalf("应有 3 条路由，得到 %d", len(specs))
	}
	want := map[string][]string{
		rCaptchaConfig: {http.MethodGet},
		rCaptchaImage:  {http.MethodGet},
		rCaptchaVerify: {http.MethodPost},
	}
	for _, spec := range specs {
		methods, ok := want[spec.Pattern]
		if !ok {
			t.Errorf("未预期的 pattern %q", spec.Pattern)
			continue
		}
		if len(spec.Methods) != len(methods) || spec.Methods[0] != methods[0] {
			t.Errorf("%s 方法 = %v, want %v", spec.Pattern, spec.Methods, methods)
		}
		if spec.Handler == nil {
			t.Errorf("%s 缺少 handler", spec.Pattern)
		}
	}
}

// TestCaptchaPatternsRegistered 3 条 pattern 已进入全局注册表。
func TestCaptchaPatternsRegistered(t *testing.T) {
	known := Patterns()
	for _, p := range []string{rCaptchaConfig, rCaptchaImage, rCaptchaVerify} {
		if !known[p] {
			t.Errorf("pattern %q 未注册", p)
		}
	}
}
