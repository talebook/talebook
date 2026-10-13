package htmlx

import (
	"reflect"
	"testing"
)

// TestAttrs 校验属性按文档顺序返回。
func TestAttrs(t *testing.T) {
	doc, err := Parse(`<img src="a.png" alt="x" width="10">`)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	img := doc.SelectOne("img")
	got := img.Attrs()
	want := []Attr{{"src", "a.png"}, {"alt", "x"}, {"width", "10"}}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("Attrs() = %v, want %v", got, want)
	}
	// 无属性节点返回空。
	if got := doc.SelectOne("img").Attrs(); len(got) != 3 {
		t.Errorf("Attrs() 长度 = %d", len(got))
	}
	var nilNode *Node
	if nilNode.Attrs() != nil {
		t.Error("nil 接收者应返回 nil")
	}
}

// TestAttrOK 校验属性存在性判定（区分缺失与空值）。
func TestAttrOK(t *testing.T) {
	doc, err := Parse(`<a href="">empty</a><a>none</a>`)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	links := doc.Select("a")
	if len(links) != 2 {
		t.Fatalf("得到 %d 个 a", len(links))
	}
	// 属性存在但为空串。
	v, ok := links[0].AttrOK("href")
	if !ok || v != "" {
		t.Errorf("空 href: (%q, %v), want (\"\", true)", v, ok)
	}
	// 属性缺失。
	if _, ok := links[1].AttrOK("href"); ok {
		t.Error("缺失属性应返回 false")
	}
	var nilNode *Node
	if _, ok := nilNode.AttrOK("href"); ok {
		t.Error("nil 接收者应返回 false")
	}
}

// TestWalk 校验前序遍历顺序。
func TestWalk(t *testing.T) {
	doc, err := Parse(`<div><p>a</p><span>b</span></div>`)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	var tags []string
	doc.Walk(func(n *Node) {
		if n.Raw.Type == NodeElement {
			tags = append(tags, n.Raw.Data)
		}
	})
	// 前序：html, head, body, div, p, span（x/net/html 会补全骨架）。
	if len(tags) < 4 {
		t.Fatalf("遍历到 %d 个元素: %v", len(tags), tags)
	}
	// div 必须出现在 p 与 span 之前。
	idx := func(s string) int {
		for i, v := range tags {
			if v == s {
				return i
			}
		}
		return -1
	}
	if !(idx("div") < idx("p") && idx("p") < idx("span")) {
		t.Errorf("前序顺序错误: %v", tags)
	}
}

// TestWalkNilReceiver 校验 nil 接收者不 panic。
func TestWalkNilReceiver(t *testing.T) {
	var nilNode *Node
	nilNode.Walk(func(*Node) { t.Error("不应被调用") })
}

// TestWalkTextNodes 校验文本节点也会被访问。
func TestWalkTextNodes(t *testing.T) {
	doc, err := Parse(`<p>hello</p>`)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	var texts []string
	doc.Walk(func(n *Node) {
		if n.Raw.Type == NodeText {
			texts = append(texts, n.Raw.Data)
		}
	})
	found := false
	for _, s := range texts {
		if s == "hello" {
			found = true
		}
	}
	if !found {
		t.Errorf("未遍历到文本节点: %v", texts)
	}
}
