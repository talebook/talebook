package normalize

import "testing"

// 直接覆盖防御性分支：这些分支在合法数据下不可达，但必须验证其行为正确。

func TestSplitTrailingBracketAllBracketKinds(t *testing.T) {
	cases := []struct {
		in    string
		inner string
		rest  string
	}{
		{"三体(第二版)", "第二版", "三体"},
		{"三体（第二版）", "第二版", "三体"},
		{"三体[第二版]", "第二版", "三体"},
		{"三体【第二版】", "第二版", "三体"},
	}
	for _, c := range cases {
		inner, rest, ok := splitTrailingBracket(c.in)
		if !ok {
			t.Errorf("splitTrailingBracket(%q) ok=false, want true", c.in)
			continue
		}
		if inner != c.inner || rest != c.rest {
			t.Errorf("splitTrailingBracket(%q) = (%q, %q), want (%q, %q)", c.in, inner, rest, c.inner, c.rest)
		}
	}
}

func TestSplitTrailingBracketUnmatchedOpener(t *testing.T) {
	// Closing bracket present but no matching opener.
	if _, _, ok := splitTrailingBracket("三体第二版]"); ok {
		t.Error("splitTrailingBracket should reject a closing bracket with no opener")
	}
	if _, _, ok := splitTrailingBracket("三体第二版】"); ok {
		t.Error("splitTrailingBracket should reject 】 with no 【")
	}
}

func TestLoadZhConvSkipsMalformedTokens(t *testing.T) {
	// Exercise the parser guards directly with synthetic input.
	//
	// loadZhConv writes to the package-level zhConvMap, so this test must
	// restore the real table afterwards; otherwise it would corrupt the
	// shared state for every other test in the package.
	origData := zhConvData
	origMap := zhConvMap
	defer func() {
		zhConvData = origData
		zhConvMap = origMap
	}()

	zhConvData = "# comment\n" +
		"體体 劉刘\n" + // valid
		"x\n" + // too short
		"abc\n" + // too long
		"同同\n" + // identity pair, must be skipped
		"龍龙\n" // valid

	zhConvMap = nil
	loadZhConv()

	if len(zhConvMap) != 3 {
		t.Fatalf("expected 3 valid pairs, got %d: %v", len(zhConvMap), zhConvMap)
	}
	for _, c := range []struct{ trad, simpl rune }{
		{'體', '体'}, {'劉', '刘'}, {'龍', '龙'},
	} {
		if got, ok := zhConvMap[c.trad]; !ok || got != c.simpl {
			t.Errorf("zhConvMap[%c] = %c (ok=%v), want %c", c.trad, got, ok, c.simpl)
		}
	}
	if _, ok := zhConvMap['同']; ok {
		t.Error("identity pair 同同 must be skipped")
	}
}
