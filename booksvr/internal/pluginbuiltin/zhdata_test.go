package pluginbuiltin

import (
	"strings"
	"testing"
)

// TestOpenCCConverterParsesAllDirections 回归真实缺陷：
// conversionConfig 结构体曾与 OpenCC 配置 JSON 不匹配（conversion_chain 是
// 对象数组而非二维数组），导致所有方向解析失败、繁简转换完全不可用。
func TestOpenCCConverterParsesAllDirections(t *testing.T) {
	for direction := range zhDirections {
		converter, err := newOpenCCConverter(direction, nil)
		if err != nil {
			t.Fatalf("方向 %s 构造失败: %v", direction, err)
		}
		if converter == nil {
			t.Fatalf("方向 %s 返回 nil converter", direction)
		}
	}
}

// TestOpenCCConverterT2S 覆盖 t2s 的基础转换链（词组优先于单字）。
func TestOpenCCConverterT2S(t *testing.T) {
	converter, err := newOpenCCConverter("t2s", nil)
	if err != nil {
		t.Fatalf("构造失败: %v", err)
	}
	cases := map[string]string{
		"體":   "体",
		"簡體":  "简体",
		"軟體":  "软体", // TSPhrases 词组优先于逐字转换
		"中文測試": "中文测试",
	}
	for input, want := range cases {
		if got := converter(input); got != want {
			t.Errorf("convert(%q) = %q, want %q", input, got, want)
		}
	}
}

// TestOpenCCConverterS2T 覆盖简转繁方向。
func TestOpenCCConverterS2T(t *testing.T) {
	converter, err := newOpenCCConverter("s2t", nil)
	if err != nil {
		t.Fatalf("构造失败: %v", err)
	}
	if got := converter("简体"); got != "簡體" {
		t.Errorf("convert(简体) = %q, want 簡體", got)
	}
}

// TestOpenCCConverterA5ExtraDict 覆盖 a5 增强词表注入 group 最前位置。
func TestOpenCCConverterA5ExtraDict(t *testing.T) {
	dict := loadA5Dict()
	if dict == nil || len(dict.words) == 0 {
		t.Fatal("a5 增强词表为空")
	}
	// 取词表里的一个真实词条验证注入后优先生效。
	var key, value string
	for k, values := range dict.words {
		key, value = k, values[0]
		break
	}
	if key == "" {
		t.Fatal("a5 词表无有效词条")
	}
	converter, err := newOpenCCConverter("t2s", []*openCCDict{dict})
	if err != nil {
		t.Fatalf("构造失败: %v", err)
	}
	if got := converter(key); got != value {
		t.Errorf("convert(%q) = %q, want %q（a5 词表应优先）", key, got, value)
	}
}

// TestOpenCCConverterSeparatorSplit 覆盖分隔符切分：分隔符两侧独立转换。
func TestOpenCCConverterSeparatorSplit(t *testing.T) {
	converter, err := newOpenCCConverter("t2s", nil)
	if err != nil {
		t.Fatalf("构造失败: %v", err)
	}
	got := converter("體，簡")
	if !strings.Contains(got, "，") {
		t.Errorf("分隔符应原样保留: %q", got)
	}
}
