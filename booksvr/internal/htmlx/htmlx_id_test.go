package htmlx

import "testing"

// TestSelectID 覆盖 `#id` 选择器。
func TestSelectID(t *testing.T) {
	const h = `<html><body>` +
		`<div id="vf">VF</div>` +
		`<div id="captcha_container">CC</div>` +
		`<div class="captcha-container">CLS</div>` +
		`<div id="other">O</div>` +
		`</body></html>`
	doc, err := Parse(h)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if got := doc.SelectOne("#vf"); got == nil || got.Text() != "VF" {
		t.Errorf("SelectOne(#vf) = %v", got)
	}
	if got := doc.SelectOne("#captcha_container"); got == nil || got.Text() != "CC" {
		t.Errorf("SelectOne(#captcha_container) = %v", got)
	}
	if got := doc.SelectOne(".captcha-container"); got == nil || got.Text() != "CLS" {
		t.Errorf("SelectOne(.captcha-container) = %v", got)
	}
	if got := doc.SelectOne("#missing"); got != nil {
		t.Errorf("不存在的 id 应为 nil, 得到 %v", got)
	}
	// 标签 + id 组合。
	if got := doc.SelectOne("div#vf"); got == nil || got.Text() != "VF" {
		t.Errorf("SelectOne(div#vf) = %v", got)
	}
}

// TestParseSimpleSelectorID 覆盖 #id 解析。
func TestParseSimpleSelectorID(t *testing.T) {
	s := parseSimpleSelector("#vf")
	if s.id != "vf" || s.tag != "" {
		t.Errorf("得到 %+v", s)
	}
	s = parseSimpleSelector("div#vf")
	if s.id != "vf" || s.tag != "div" {
		t.Errorf("得到 %+v", s)
	}
}
