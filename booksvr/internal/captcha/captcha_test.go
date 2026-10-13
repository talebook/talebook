package captcha

import (
	"encoding/base64"
	"encoding/json"
	"image/png"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

// frontendConfigMap 断言 FrontendConfig 返回非 nil 的配置 map。
func frontendConfigMap(t *testing.T, s Settings) map[string]any {
	t.Helper()
	cfg := FrontendConfig(s)
	if cfg == nil {
		t.Fatal("应返回配置")
	}
	m, ok := cfg.(map[string]any)
	if !ok {
		t.Fatalf("配置类型错误: %T", cfg)
	}
	return m
}

// testSettings 返回一份启用 image 提供商的配置。
func testSettings() Settings {
	return Settings{
		Provider:    ProviderImage,
		EnableFor:   map[string]bool{"READ": true, "LOGIN": true},
		ImageLength: 4,
		ImageWidth:  120,
		ImageHeight: 40,
	}
}

// TestGetProviderUnknown 未知或空提供商返回 nil。
func TestGetProviderUnknown(t *testing.T) {
	for _, name := range []string{"", "nope"} {
		s := testSettings()
		s.Provider = name
		if p := GetProvider(s); p != nil {
			t.Errorf("provider %q 应返回 nil，得到 %v", name, p.Name())
		}
	}
}

// TestIsEnabled 场景开关按大写键读取。
func TestIsEnabled(t *testing.T) {
	s := testSettings()
	if !IsEnabled(s, "read") {
		t.Error("read 场景应启用")
	}
	if IsEnabled(s, "welcome") {
		t.Error("welcome 场景不应启用")
	}
	// 未配置提供商时一律 false。
	s.Provider = ""
	if IsEnabled(s, "read") {
		t.Error("未配置提供商时应为 false")
	}
}

// TestFrontendConfigImage 图形验证码的前端配置。
func TestFrontendConfigImage(t *testing.T) {
	cfg := frontendConfigMap(t, testSettings())
	if cfg["provider"] != ProviderImage {
		t.Errorf("provider = %v", cfg["provider"])
	}
	if cfg["captchaId"] != "image-captcha" {
		t.Errorf("captchaId = %v", cfg["captchaId"])
	}
	if cfg["sdkUrl"] != "" {
		t.Errorf("sdkUrl 应为空，得到 %v", cfg["sdkUrl"])
	}
	if cfg["enabled"] != true {
		t.Errorf("enabled = %v", cfg["enabled"])
	}
	scenes, ok := cfg["scenes"].(map[string]any)
	if !ok {
		t.Fatalf("scenes 类型错误: %T", cfg["scenes"])
	}
	if len(scenes) != 6 {
		t.Errorf("scenes 应有 6 项，得到 %d", len(scenes))
	}
	if scenes["read"] != true || scenes["welcome"] != false {
		t.Errorf("scenes 内容错误: %v", scenes)
	}
}

// TestFrontendConfigUnconfigured 未配置凭据的提供商返回 nil。
func TestFrontendConfigUnconfigured(t *testing.T) {
	s := testSettings()
	s.Provider = ProviderTurnstile // 无 site/secret key
	if cfg := FrontendConfig(s); cfg != nil {
		t.Errorf("未配置应返回 nil，得到 %v", cfg)
	}
}

// TestImageVerify 图形验证码校验：大小写不敏感、去空白。
func TestImageVerify(t *testing.T) {
	p := GetProvider(testSettings())
	cases := []struct {
		code, answer string
		want         bool
	}{
		{"ABCD", "ABCD", true},
		{"abcd", "ABCD", true},
		{" ABCD ", "abcd", true},
		{"ABCD", "ABCE", false},
		{"", "ABCD", false},
		{"ABCD", "", false},
	}
	for _, tc := range cases {
		got := p.Verify(map[string]string{"captcha_code": tc.code, "captcha_answer": tc.answer})
		if got != tc.want {
			t.Errorf("Verify(%q, %q) = %v, want %v", tc.code, tc.answer, got, tc.want)
		}
	}
}

// TestVerifyNoProvider 未配置提供商时默认通过。
func TestVerifyNoProvider(t *testing.T) {
	s := testSettings()
	s.Provider = ""
	if !Verify(s, nil) {
		t.Error("未配置提供商应默认通过")
	}
}

// TestGenerateImage 生成的图片可解码，且 code 长度与字符集正确。
func TestGenerateImage(t *testing.T) {
	p := GetProvider(testSettings()).(*imageProvider)
	res, err := p.Generate()
	if err != nil {
		t.Fatalf("生成失败: %v", err)
	}
	if len(res.Code) != 4 {
		t.Errorf("code 长度 = %d, want 4", len(res.Code))
	}
	for _, ch := range res.Code {
		if !strings.ContainsRune(charSet, ch) {
			t.Errorf("code 含非法字符 %q", ch)
		}
	}
	const prefix = "data:image/png;base64,"
	if !strings.HasPrefix(res.Image, prefix) {
		t.Fatalf("image 前缀错误: %.40s", res.Image)
	}
	raw, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(res.Image, prefix))
	if err != nil {
		t.Fatalf("base64 解码失败: %v", err)
	}
	img, err := png.Decode(strings.NewReader(string(raw)))
	if err != nil {
		t.Fatalf("PNG 解码失败: %v", err)
	}
	if b := img.Bounds(); b.Dx() != 120 || b.Dy() != 40 {
		t.Errorf("尺寸 = %dx%d, want 120x40", b.Dx(), b.Dy())
	}
	if res.CaptchaID == "" || len(res.CaptchaID) != 36 {
		t.Errorf("captcha_id 格式错误: %q", res.CaptchaID)
	}
}

// TestGenerateImageDefaults 未设置尺寸时用默认值。
func TestGenerateImageDefaults(t *testing.T) {
	p := &imageProvider{settings: Settings{Provider: ProviderImage}}
	res, err := p.Generate()
	if err != nil {
		t.Fatalf("生成失败: %v", err)
	}
	if len(res.Code) != defaultImageLength {
		t.Errorf("默认 code 长度 = %d, want %d", len(res.Code), defaultImageLength)
	}
}

// TestGenerateImageUnique 两次生成的 code 与 id 应不同。
func TestGenerateImageUnique(t *testing.T) {
	p := GetProvider(testSettings()).(*imageProvider)
	a, err := p.Generate()
	if err != nil {
		t.Fatalf("生成失败: %v", err)
	}
	b, err := p.Generate()
	if err != nil {
		t.Fatalf("生成失败: %v", err)
	}
	if a.CaptchaID == b.CaptchaID {
		t.Error("captcha_id 应唯一")
	}
}

// TestTurnstileVerify 覆盖 Turnstile 的 token 边界与接口交互。
func TestTurnstileVerify(t *testing.T) {
	s := testSettings()
	s.Provider = ProviderTurnstile
	s.TurnstileSiteKey = "site"
	s.TurnstileSecretKey = "secret"

	// 未配置凭据时失败。
	unconfigured := s
	unconfigured.TurnstileSecretKey = ""
	if GetProvider(unconfigured).Verify(map[string]string{"turnstile_token": "t"}) {
		t.Error("未配置应失败")
	}

	// 空 token 与超长 token 失败（不发请求）。
	p := GetProvider(s).(*turnstileProvider)
	if p.Verify(map[string]string{"turnstile_token": ""}) {
		t.Error("空 token 应失败")
	}
	if p.Verify(map[string]string{"turnstile_token": strings.Repeat("x", 2049)}) {
		t.Error("超长 token 应失败")
	}

	// 正常路径：success + action 匹配。
	// 第一次请求带 remote_ip，第二次不带；用计数区分断言。
	calls := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		calls++
		if r.Form.Get("secret") != "secret" || r.Form.Get("response") != "tok" {
			t.Errorf("表单参数错误: %v", r.Form)
		}
		if calls == 1 && r.Form.Get("remoteip") != "1.2.3.4" {
			t.Errorf("首次请求 remoteip = %q, want 1.2.3.4", r.Form.Get("remoteip"))
		}
		if calls == 2 && r.Form.Get("remoteip") != "" {
			t.Errorf("无 remote_ip 时不应发送 remoteip，得到 %q", r.Form.Get("remoteip"))
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"success": true, "action": "read"})
	}))
	defer srv.Close()
	p.client = &http.Client{Transport: rewriteHost{srv.URL}}

	if !p.Verify(map[string]string{"turnstile_token": "tok", "remote_ip": "1.2.3.4", "scene": "read"}) {
		t.Error("success + action 匹配应通过")
	}
	if p.Verify(map[string]string{"turnstile_token": "tok", "scene": "login"}) {
		t.Error("action 不匹配应失败")
	}
}

// TestTurnstileVerifyFailure 接口返回 success=false 或异常时失败。
func TestTurnstileVerifyFailure(t *testing.T) {
	s := testSettings()
	s.Provider = ProviderTurnstile
	s.TurnstileSiteKey = "site"
	s.TurnstileSecretKey = "secret"
	p := GetProvider(s).(*turnstileProvider)

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"success": false})
	}))
	defer srv.Close()
	p.client = &http.Client{Transport: rewriteHost{srv.URL}}
	if p.Verify(map[string]string{"turnstile_token": "tok"}) {
		t.Error("success=false 应失败")
	}

	// 非 200 失败。
	bad := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer bad.Close()
	p.client = &http.Client{Transport: rewriteHost{bad.URL}}
	if p.Verify(map[string]string{"turnstile_token": "tok"}) {
		t.Error("非 200 应失败")
	}
}

// TestGeetestVerify 覆盖极验的签名与容错语义。
func TestGeetestVerify(t *testing.T) {
	s := testSettings()
	s.Provider = ProviderGeetest
	s.GeetestCaptchaID = "cid"
	s.GeetestCaptchaKey = "ckey"
	p := GetProvider(s).(*geetestProvider)

	// 缺参数失败。
	if p.Verify(map[string]string{"lot_number": "1"}) {
		t.Error("缺参数应失败")
	}
	// 未配置失败。
	unconfigured := s
	unconfigured.GeetestCaptchaKey = ""
	if GetProvider(unconfigured).Verify(map[string]string{
		"lot_number": "1", "captcha_output": "2", "pass_token": "3", "gen_time": "4",
	}) {
		t.Error("未配置应失败")
	}

	// 正常路径：校验 sign_token 与 captcha_id。
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		if r.URL.Query().Get("captcha_id") != "cid" {
			t.Errorf("captcha_id = %q", r.URL.Query().Get("captcha_id"))
		}
		if r.Form.Get("sign_token") == "" {
			t.Error("sign_token 不应为空")
		}
		if r.Form.Get("lot_number") != "lot" {
			t.Errorf("lot_number = %q", r.Form.Get("lot_number"))
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"result": "success"})
	}))
	defer srv.Close()
	p.client = &http.Client{Transport: rewriteHost{srv.URL}}

	params := map[string]string{"lot_number": "lot", "captcha_output": "out", "pass_token": "pt", "gen_time": "gt"}
	if !p.Verify(params) {
		t.Error("result=success 应通过")
	}

	// result != success 失败。
	fail := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"result": "fail", "reason": "bad"})
	}))
	defer fail.Close()
	p.client = &http.Client{Transport: rewriteHost{fail.URL}}
	if p.Verify(params) {
		t.Error("result=fail 应失败")
	}
}

// TestGeetestVerifyFailOpen 接口异常时默认通过（对齐 Python 的容错语义）。
func TestGeetestVerifyFailOpen(t *testing.T) {
	s := testSettings()
	s.Provider = ProviderGeetest
	s.GeetestCaptchaID = "cid"
	s.GeetestCaptchaKey = "ckey"
	p := GetProvider(s).(*geetestProvider)
	params := map[string]string{"lot_number": "lot", "captcha_output": "out", "pass_token": "pt", "gen_time": "gt"}

	// 非 200 → 通过。
	bad := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadGateway)
	}))
	defer bad.Close()
	p.client = &http.Client{Transport: rewriteHost{bad.URL}}
	if !p.Verify(params) {
		t.Error("非 200 应默认通过")
	}

	// 非法 JSON → 通过。
	garbage := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("not json"))
	}))
	defer garbage.Close()
	p.client = &http.Client{Transport: rewriteHost{garbage.URL}}
	if !p.Verify(params) {
		t.Error("非法 JSON 应默认通过")
	}
}

// TestGeetestFrontendConfig 极验前端配置。
func TestGeetestFrontendConfig(t *testing.T) {
	s := testSettings()
	s.Provider = ProviderGeetest
	s.GeetestCaptchaID = "cid"
	s.GeetestCaptchaKey = "ckey"
	cfg := frontendConfigMap(t, s)
	if cfg["provider"] != ProviderGeetest || cfg["captchaId"] != "cid" {
		t.Errorf("配置错误: %v", cfg)
	}
	if cfg["sdkUrl"] != geetestSDKURL {
		t.Errorf("sdkUrl = %v", cfg["sdkUrl"])
	}
}

// TestTurnstileFrontendConfig Turnstile 前端配置。
func TestTurnstileFrontendConfig(t *testing.T) {
	s := testSettings()
	s.Provider = ProviderTurnstile
	s.TurnstileSiteKey = "site"
	s.TurnstileSecretKey = "secret"
	cfg := frontendConfigMap(t, s)
	if cfg["provider"] != ProviderTurnstile || cfg["siteKey"] != "site" {
		t.Errorf("配置错误: %v", cfg)
	}
	if cfg["sdkUrl"] != turnstileSDKURL {
		t.Errorf("sdkUrl = %v", cfg["sdkUrl"])
	}
}

// rewriteHost 把请求重定向到测试服务器。
type rewriteHost struct{ base string }

// RoundTrip 改写请求 URL 的 scheme/host。
func (r rewriteHost) RoundTrip(req *http.Request) (*http.Response, error) {
	u, err := url.Parse(r.base)
	if err != nil {
		return nil, err
	}
	clone := req.Clone(req.Context())
	clone.URL.Scheme = u.Scheme
	clone.URL.Host = u.Host
	return http.DefaultTransport.RoundTrip(clone)
}
