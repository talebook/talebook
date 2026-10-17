package pluginbuiltin

import (
	"strings"
	"testing"
)

// TestInjectCSSLink 覆盖正文 head 注入 link（幂等）。
func TestInjectCSSLink(t *testing.T) {
	html := `<html><head><title>x</title></head><body><p>正文</p></body></html>`
	out, ok := injectCSSLink(html, mbCSSName)
	if !ok {
		t.Fatal("应注入成功")
	}
	if !strings.Contains(out, `<link rel="stylesheet" type="text/css" href="`+mbCSSName+`"/>`) {
		t.Errorf("缺少 link: %s", out)
	}
	if !strings.Contains(out, "</head>") {
		t.Error("link 应插入在 </head> 之前")
	}
	// 幂等：已含 css 名时不再注入。
	if _, ok := injectCSSLink(out, mbCSSName); ok {
		t.Error("重复注入应返回 false")
	}
}

// TestValidateNoteMark 对齐 Python NOTE_MARK_MODES + svg: 前缀。
func TestValidateNoteMark(t *testing.T) {
	for _, valid := range []string{"orig", "sym", "num", "zhu", "svg:circle"} {
		if err := validateNoteMark(valid); err != nil {
			t.Errorf("%s 应合法: %v", valid, err)
		}
	}
	for _, invalid := range []string{"sup", "bracket", "dot", "none", "svg:nope"} {
		if err := validateNoteMark(invalid); err == nil {
			t.Errorf("%s 应非法", invalid)
		}
	}
}

// TestWereadValidateQueryReviews 覆盖 highlight_reviews 的 reviews 校验恢复。
func TestWereadValidateQueryReviews(t *testing.T) {
	_, safe, err := validateWereadQuery("highlight_reviews", map[string]any{
		"bookId":     "bk",
		"chapterUid": 3,
		"reviews": []any{
			map[string]any{"range": "a-b", "count": 5},
		},
	})
	if err != nil {
		t.Fatalf("合法 reviews 应通过: %v", err)
	}
	reviews, ok := safe["reviews"].([]any)
	if !ok || len(reviews) != 1 {
		t.Fatalf("reviews = %#v", safe["reviews"])
	}
	// 非法：空 range。
	if _, _, err := validateWereadQuery("highlight_reviews", map[string]any{
		"bookId": "bk", "chapterUid": 3,
		"reviews": []any{map[string]any{"range": "  "}},
	}); err == nil {
		t.Error("空 range 应报错")
	}
	// 非法：未知键。
	if _, _, err := validateWereadQuery("highlight_reviews", map[string]any{
		"bookId": "bk", "chapterUid": 3,
		"reviews": []any{map[string]any{"range": "a", "bogus": 1}},
	}); err == nil {
		t.Error("未知键应报错")
	}
	// 非法：超过 20 条。
	many := make([]any, 21)
	for i := range many {
		many[i] = map[string]any{"range": "a"}
	}
	if _, _, err := validateWereadQuery("highlight_reviews", map[string]any{
		"bookId": "bk", "chapterUid": 3, "reviews": many,
	}); err == nil {
		t.Error("超过 20 条应报错")
	}
}

// TestPushManifestDefaultPort 覆盖 ui.default_port 注入（复刻 __init__）。
func TestPushManifestDefaultPort(t *testing.T) {
	p := newDevicePushProvider("talebook.push.duokan", "多看阅读", "d", "i", "", "", 12121, nil)
	ui, _ := p.Manifest()["ui"].(map[string]any)
	if ui["default_port"] != 12121 {
		t.Errorf("ui.default_port = %v, want 12121", ui["default_port"])
	}
	if ui["device_type"] != "duokan" {
		t.Errorf("ui.device_type = %v", ui["device_type"])
	}
}

// TestInternetArchiveBoolDetection 覆盖 JSON 布尔的 restricted/private 判定。
func TestInternetArchiveBoolDetection(t *testing.T) {
	if asStringOr(true, "false") != "True" {
		t.Error("布尔 true 应转为 True")
	}
	if asStringOr(false, "false") != "False" {
		t.Error("布尔 false 应转为 False")
	}
	if asStringOr("true", "false") != "true" {
		t.Error("字符串应原样返回")
	}
	if asStringOr(nil, "false") != "false" {
		t.Error("nil 应回退默认")
	}
}
