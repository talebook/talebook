package booksource

import (
	"testing"

	"talebook/booksvr/internal/htmlx"
)

// jsErr 断言 err 是 JsRuleUnsupported。
func jsErr(t *testing.T, err error, ctx string) {
	t.Helper()
	if err == nil {
		t.Fatalf("%s: 应报错", ctx)
	}
	if _, ok := err.(*JsRuleUnsupported); !ok {
		t.Fatalf("%s: 错误类型 = %T, want *JsRuleUnsupported", ctx, err)
	}
}

// TestErrPropagation 覆盖各层错误向上传播的分支。
//
// 这些分支只在嵌套子规则失败时可达，用 <js> 规则触发。
func TestErrPropagation(t *testing.T) {
	doc := arDoc(t)
	const bad = "<js>x</js>"

	t.Run("put 内层失败", func(t *testing.T) {
		r := NewAnalyzeRule(doc, nil, "")
		_, err := r.GetString("@put:{k:" + bad + "}")
		jsErr(t, err, "@put 内层")
	})

	t.Run("inline-js 主规则失败", func(t *testing.T) {
		r := NewAnalyzeRule(doc, nil, "")
		_, err := r.GetString(bad + "@js:result")
		jsErr(t, err, "inline-js 主规则")
	})

	t.Run("尾部正则前的主规则失败", func(t *testing.T) {
		r := NewAnalyzeRule(doc, nil, "")
		_, err := r.GetString(bad + "##p##r")
		jsErr(t, err, "尾部正则主规则")
	})

	t.Run("GetStringList 传播", func(t *testing.T) {
		r := NewAnalyzeRule(doc, nil, "")
		_, err := r.GetStringList(bad)
		jsErr(t, err, "GetStringList")
	})

	t.Run("&& 分支失败", func(t *testing.T) {
		r := NewAnalyzeRule(doc, nil, "")
		_, err := r.GetString("div#only&&" + bad)
		jsErr(t, err, "&& 分支")
	})

	t.Run("GetElements %% 分支失败", func(t *testing.T) {
		r := NewAnalyzeRule(doc, nil, "")
		_, err := r.GetElements("@css:div.a p%%" + bad)
		jsErr(t, err, "%% 分支")
	})

	t.Run("GetElements 非 %% 分支失败", func(t *testing.T) {
		r := NewAnalyzeRule(doc, nil, "")
		_, err := r.GetElements(bad)
		jsErr(t, err, "非 %% 分支")
	})

	t.Run("elementsConcat 分支失败", func(t *testing.T) {
		r := NewAnalyzeRule(doc, nil, "")
		_, err := r.GetElements("@css:div#only&&" + bad)
		jsErr(t, err, "elementsConcat")
	})
}

// TestDocStringFallback 覆盖 docString 的 stringifyAny 兜底分支。
func TestDocStringFallback(t *testing.T) {
	// 非 JSON、非 string、非节点的文档走 stringifyAny。
	r := NewAnalyzeRule(42, nil, "")
	if got := r.docString(); got != "42" {
		t.Errorf("docString(42) = %q, want %q", got, "42")
	}
}

// TestEvalSimpleElementsJSONPathSelect 覆盖 JSON 列表摊平分支。
func TestEvalSimpleElementsJSONPathSelect(t *testing.T) {
	r := NewAnalyzeRule(arJSON(), nil, "")
	// $.data.list[*] 逐元素返回 map，不摊平。
	got, err := r.evalSimpleElements("$.data.list[*]")
	if err != nil {
		t.Fatalf("evalSimpleElements: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("len = %d, want 2", len(got))
	}
	for i, e := range got {
		if _, ok := e.(map[string]any); !ok {
			t.Errorf("got[%d] 类型 = %T, want map[string]any", i, e)
		}
	}
}

// TestEvalSimpleElementsLegadoOnNode 覆盖 Legado 分支。
func TestEvalSimpleElementsLegadoOnNode(t *testing.T) {
	r := NewAnalyzeRule(arDoc(t), nil, "")
	got, err := r.evalSimpleElements("class.a@tag.p")
	if err != nil {
		t.Fatalf("evalSimpleElements: %v", err)
	}
	if len(got) != 3 {
		t.Fatalf("len = %d, want 3", len(got))
	}
	for i, e := range got {
		n, ok := e.(*htmlx.Node)
		if !ok {
			t.Fatalf("got[%d] 类型 = %T, want *htmlx.Node", i, e)
		}
		if want := []string{"P1", "P2", "P3"}[i]; n.Text() != want {
			t.Errorf("got[%d] = %q, want %q", i, n.Text(), want)
		}
	}
}

// TestEvalSimpleElementsCSSOnNode 覆盖 @css: 分支。
func TestEvalSimpleElementsCSSOnNode(t *testing.T) {
	r := NewAnalyzeRule(arDoc(t), nil, "")
	got, err := r.evalSimpleElements("@css:div#only")
	if err != nil {
		t.Fatalf("evalSimpleElements: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("len = %d, want 1", len(got))
	}
}

// TestGetElementsBlankRule 覆盖空规则早返回。
func TestGetElementsBlankRule(t *testing.T) {
	r := NewAnalyzeRule(arDoc(t), nil, "")
	got, err := r.GetElements("   ")
	if err != nil {
		t.Fatalf("GetElements: %v", err)
	}
	if got != nil {
		t.Errorf("= %#v, want nil", got)
	}
}

// TestElementsConcatBlankPart 覆盖 && 空分支跳过。
func TestElementsConcatBlankPart(t *testing.T) {
	r := NewAnalyzeRule(arDoc(t), nil, "")
	got, err := r.elementsConcat("@css:div#only&&&&@css:div.a p")
	if err != nil {
		t.Fatalf("elementsConcat: %v", err)
	}
	if len(got) != 4 {
		t.Errorf("len = %d, want 4", len(got))
	}
}

// TestEvalSimpleStringBlankAndJS 覆盖空规则与 JS 早返回。
func TestEvalSimpleStringBlankAndJS(t *testing.T) {
	r := NewAnalyzeRule(arDoc(t), nil, "")
	if got, err := r.evalSimpleString(""); err != nil || got != "" {
		t.Errorf("空规则 = %q, %v", got, err)
	}
	_, err := r.evalSimpleString("<js>x</js>")
	jsErr(t, err, "evalSimpleString JS")
}

// TestEvalStringAltsBlankPart 覆盖 && 空分支跳过。
func TestEvalStringAltsBlankPart(t *testing.T) {
	r := NewAnalyzeRule(arDoc(t), nil, "")
	got, err := r.GetString("div#only&&&&div.a p")
	if err != nil {
		t.Fatalf("GetString: %v", err)
	}
	if got != "Only\nP1\nP2\nP3" {
		t.Errorf("= %q, want %q", got, "Only\nP1\nP2\nP3")
	}
}

// TestEvalTemplateErrorFirstWins 覆盖模板内多个错误时保留首个。
func TestEvalTemplateErrorFirstWins(t *testing.T) {
	r := NewAnalyzeRule(arDoc(t), nil, "")
	_, err := r.GetString("{{<js>a</js>}}{{<js>b</js>}}")
	jsErr(t, err, "模板多错误")
}
