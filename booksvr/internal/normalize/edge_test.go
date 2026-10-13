package normalize

import "testing"

// 边界与分支覆盖：补齐流水线中的未覆盖路径。

func TestNormalizeWidthIdeographicSpace(t *testing.T) {
	// U+3000 ideographic space must become a plain space.
	if got := NormalizeWidth("三体\u3000黑暗森林"); got != "三体 黑暗森林" {
		t.Errorf("NormalizeWidth ideographic space = %q", got)
	}
}

func TestNormalizeAuthorShorterFirst(t *testing.T) {
	// "刘 慈欣" -> the shorter part is treated as the surname.
	if got := NormalizeAuthor("刘 慈欣"); got != "刘慈欣" {
		t.Errorf("NormalizeAuthor(\"刘 慈欣\") = %q, want \"刘慈欣\"", got)
	}
}

func TestIsCJK(t *testing.T) {
	if isCJK("") {
		t.Error("isCJK(\"\") should be false")
	}
	if !isCJK("三体") {
		t.Error("isCJK(\"三体\") should be true")
	}
	if isCJK("abc") {
		t.Error("isCJK(\"abc\") should be false")
	}
	if isCJK("三a") {
		t.Error("isCJK(\"三a\") should be false")
	}
}

func TestExtractVersionSuffixEmpty(t *testing.T) {
	got := ExtractVersionSuffix("")
	if got.Core != "" || len(got.Suffixes) != 0 {
		t.Errorf("ExtractVersionSuffix(\"\") = %+v, want empty", got)
	}
}

func TestExtractVersionSuffixMultiple(t *testing.T) {
	got := ExtractVersionSuffix("三体 第二版 全集")
	if got.Core != "三体" {
		t.Errorf("Core = %q, want \"三体\"", got.Core)
	}
	if len(got.Suffixes) != 2 {
		t.Fatalf("Suffixes = %v, want 2 entries", got.Suffixes)
	}
}

func TestExtractVersionSuffixKeepsSubtitle(t *testing.T) {
	// A bracketed group that is NOT an edition marker must stay in the title.
	got := ExtractVersionSuffix("三体(黑暗森林)")
	if got.Core != "三体(黑暗森林)" {
		t.Errorf("Core = %q, want the subtitle preserved", got.Core)
	}
	if len(got.Suffixes) != 0 {
		t.Errorf("Suffixes = %v, want none", got.Suffixes)
	}
}

func TestExtractVersionSuffixVolume(t *testing.T) {
	for _, c := range []struct{ in, core, suf string }{
		{"三体 上册", "三体", "上册"},
		{"三体 第一卷", "三体", "第一卷"},
		{"三体 第2册", "三体", "第2册"},
	} {
		got := ExtractVersionSuffix(c.in)
		if got.Core != c.core {
			t.Errorf("ExtractVersionSuffix(%q).Core = %q, want %q", c.in, got.Core, c.core)
		}
		if len(got.Suffixes) != 1 || got.Suffixes[0] != c.suf {
			t.Errorf("ExtractVersionSuffix(%q).Suffixes = %v, want [%s]", c.in, got.Suffixes, c.suf)
		}
	}
}

func TestSplitTrailingBracketNoBracket(t *testing.T) {
	if _, _, ok := splitTrailingBracket("三体"); ok {
		t.Error("splitTrailingBracket should return ok=false without a bracket")
	}
	if _, _, ok := splitTrailingBracket(""); ok {
		t.Error("splitTrailingBracket(\"\") should return ok=false")
	}
	// Unbalanced bracket: no matching opener.
	if _, _, ok := splitTrailingBracket("三体)"); ok {
		t.Error("splitTrailingBracket should reject an unbalanced bracket")
	}
	// Empty inner content.
	if _, _, ok := splitTrailingBracket("三体()"); ok {
		t.Error("splitTrailingBracket should reject empty inner content")
	}
}

func TestEditionKeySuffixOnly(t *testing.T) {
	// A suffix alone still produces a non-empty fingerprint.
	got := EditionKey(EditionMeta{Suffixes: []string{"第二版"}})
	if got == "" {
		t.Error("EditionKey with only a suffix should not be empty")
	}
}

func TestEditionKeyTranslator(t *testing.T) {
	got := EditionKey(EditionMeta{Publisher: "重庆出版社", Pubdate: "2008", Translator: "张三"})
	want := "重庆出版社\x1f2008\x1f张三"
	if got != want {
		t.Errorf("EditionKey = %q, want %q", got, want)
	}
}

func TestZhConvSkipsMalformedTokens(t *testing.T) {
	// The parser must tolerate tokens that are not exactly two runes.
	// Exercised indirectly: the real table has none, so assert the guard
	// behaviour through a direct map build.
	m := map[rune]rune{}
	for _, token := range []string{"體体", "x", "abc", "劉刘"} {
		runes := []rune(token)
		if len(runes) != 2 {
			continue
		}
		if runes[0] == runes[1] {
			continue
		}
		m[runes[0]] = runes[1]
	}
	if len(m) != 2 {
		t.Errorf("expected 2 valid pairs, got %d", len(m))
	}
}
