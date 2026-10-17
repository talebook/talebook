package pluginbuiltin

import (
	"testing"
)

// newTestDict 构造一份字典（key → 首映射）。
func newTestDict(entries map[string]string) *openCCDict {
	dict := &openCCDict{words: map[string][]string{}}
	for k, v := range entries {
		dict.words[k] = []string{v}
		if n := len([]rune(k)); n > dict.maxLen {
			dict.maxLen = n
		}
	}
	return dict
}

// TestStringTreeGlobalLongestMatch 复刻审计反例：字典含 AB/BCD、文本 ABCD。
//
// Python 全局最长匹配先命中位置 1 的 BCD（3 字）→ 左残余 A 原样、
// 右残余空 → 结果 AY；逐位置贪心会先命中位置 0 的 AB 得 XCD。
func TestStringTreeGlobalLongestMatch(t *testing.T) {
	dict := newTestDict(map[string]string{"AB": "X", "BCD": "Y"})
	tree := &stringTree{str: "ABCD"}
	tree.convertTree(dict.maxLen, dict.words)
	if got := tree.inorder(); got != "AY" {
		t.Errorf("got %q, want AY（全局最长优先）", got)
	}
}

// TestStringTreeLeftToRightWithinSameLength 覆盖同长度时从左到右取首个命中。
func TestStringTreeLeftToRightWithinSameLength(t *testing.T) {
	dict := newTestDict(map[string]string{"AA": "1", "BB": "2"})
	tree := &stringTree{str: "AABB"}
	tree.convertTree(dict.maxLen, dict.words)
	// 最长 2 字：位置 0 的 AA 先命中 → 左空、右 BB → 2。
	if got := tree.inorder(); got != "12" {
		t.Errorf("got %q, want 12", got)
	}
}

// TestStringTreeGroupResidual 覆盖组内第二本字典只处理未命中残余。
//
// 组内 dict1={B:1}、dict2={AB:2}、文本 AB：dict1 命中 B → 树 A+[B→1]；
// dict2 只见未命中残余 A 与 1，AB 不再整体命中 → 结果 A1。
func TestStringTreeGroupResidual(t *testing.T) {
	dict1 := newTestDict(map[string]string{"B": "1"})
	dict2 := newTestDict(map[string]string{"AB": "2"})
	if got := convertGroup("AB", []*openCCDict{dict1, dict2}); got != "A1" {
		t.Errorf("got %q, want A1（组内第二本只见残余）", got)
	}
}

// TestStringTreeMultiMapping 覆盖多映射取首个（value.split(" ")[0]）。
func TestStringTreeMultiMapping(t *testing.T) {
	dict := &openCCDict{
		maxLen: 2,
		words:  map[string][]string{"體": {"体", "ti"}},
	}
	tree := &stringTree{str: "體"}
	tree.convertTree(dict.maxLen, dict.words)
	if got := tree.inorder(); got != "体" {
		t.Errorf("got %q, want 体", got)
	}
}

// TestStringTreeNoMatchPreserves 覆盖无命中时原样保留。
func TestStringTreeNoMatchPreserves(t *testing.T) {
	dict := newTestDict(map[string]string{"XYZ": "1"})
	tree := &stringTree{str: "中文ABC"}
	tree.convertTree(dict.maxLen, dict.words)
	if got := tree.inorder(); got != "中文ABC" {
		t.Errorf("got %q, want 原样", got)
	}
}

// TestOpenCCChainSingleFlatten 覆盖无 extra 时单字典项应用后展平：
// 第二个链项在展平后的全文上重新匹配（与组语义不同）。
func TestOpenCCChainSingleFlatten(t *testing.T) {
	dict1 := newTestDict(map[string]string{"B": "A"})
	dict2 := newTestDict(map[string]string{"AA": "Z"})
	c := &openCCConverter{chain: []openCCChainItem{
		{single: dict1},
		{single: dict2},
	}}
	// 单字典展平：B→A 后全文 AA，第二项命中 AA→Z。
	if got := c.convertSegment("AB"); got != "Z" {
		t.Errorf("got %q, want Z（单字典项间展平）", got)
	}
	// 组语义：第二本只见残余 A 与 A，AA 不命中。
	c2 := &openCCConverter{chain: []openCCChainItem{
		{group: []*openCCDict{dict1, dict2}},
	}}
	if got := c2.convertSegment("AB"); got != "AA" {
		t.Errorf("got %q, want AA（组内残余语义）", got)
	}
}

// TestOpenCCExtraDictsWrapSingles 覆盖 extra 注入时单字典项包成组。
func TestOpenCCExtraDictsWrapSingles(t *testing.T) {
	extra := newTestDict(map[string]string{"AB": "E"})
	dict := newTestDict(map[string]string{"B": "1"})
	c := &openCCConverter{chain: []openCCChainItem{
		{group: []*openCCDict{extra, dict}},
	}}
	// extra 在最前：AB 整体命中 E（B 的单字规则只处理残余 A 与 E）。
	if got := c.convertSegment("AB"); got != "E" {
		t.Errorf("got %q, want E（extra 优先于默认词表）", got)
	}
}
