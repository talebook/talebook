package normalize

import "testing"

// 8 步流水线各一例 + 边界。测试先行，实现后置。

func TestStep1RemovePiracySuffix(t *testing.T) {
	cases := []struct{ in, want string }{
		{"三体 (z-library.sk, 1lib.sk)", "三体"},
		{"三体 (z-lib.org)", "三体"},
		{"三体 (1lib.sk, z-library.sk, z-lib.fm)", "三体"},
		{"三体", "三体"},
	}
	for _, c := range cases {
		if got := RemovePiracySuffix(c.in); got != c.want {
			t.Errorf("RemovePiracySuffix(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

func TestStep2FullwidthToHalfwidth(t *testing.T) {
	cases := []struct{ in, want string }{
		{"ＡＢＣ１２３", "abc123"},
		{"Ｈｅｌｌｏ", "hello"},
		{"三体", "三体"},
	}
	for _, c := range cases {
		if got := NormalizeWidth(c.in); got != c.want {
			t.Errorf("NormalizeWidth(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

func TestStep3Whitespace(t *testing.T) {
	cases := []struct{ in, want string }{
		{"  三体\u200b  ", "三体"},
		{"三体\ufeff", "三体"},
		{"三  体", "三 体"},
		{"\t三体\n", "三体"},
	}
	for _, c := range cases {
		if got := NormalizeSpace(c.in); got != c.want {
			t.Errorf("NormalizeSpace(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

func TestStep4Punctuation(t *testing.T) {
	cases := []struct{ in, want string }{
		{"《三体》：黑暗森林", "三体 黑暗森林"},
		{"「三体」", "三体"},
		{"【三体】", "三体"},
		{"三体——黑暗森林", "三体 黑暗森林"},
	}
	for _, c := range cases {
		if got := NormalizePunct(c.in); got != c.want {
			t.Errorf("NormalizePunct(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

func TestStep5TraditionalToSimplified(t *testing.T) {
	cases := []struct{ in, want string }{
		{"三體", "三体"},
		{"劉慈欣", "刘慈欣"},
		{"龍", "龙"},
		{"三体", "三体"},
	}
	for _, c := range cases {
		if got := ToSimplified(c.in); got != c.want {
			t.Errorf("ToSimplified(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

func TestStep6CaseFold(t *testing.T) {
	cases := []struct{ in, want string }{
		{"Harry Potter", "harry potter"},
		{"HARRY", "harry"},
		{"三体", "三体"},
	}
	for _, c := range cases {
		if got := CaseFold(c.in); got != c.want {
			t.Errorf("CaseFold(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

func TestStep7ExtractVersionSuffix(t *testing.T) {
	cases := []struct {
		in       string
		wantCore string
		wantSuf  []string
	}{
		{"三体（第二版）", "三体", []string{"第二版"}},
		{"三体全集", "三体", []string{"全集"}},
		{"三体 (修订版)", "三体", []string{"修订版"}},
		{"三体", "三体", nil},
	}
	for _, c := range cases {
		got := ExtractVersionSuffix(c.in)
		if got.Core != c.wantCore {
			t.Errorf("ExtractVersionSuffix(%q).Core = %q, want %q", c.in, got.Core, c.wantCore)
		}
		if len(got.Suffixes) != len(c.wantSuf) {
			t.Errorf("ExtractVersionSuffix(%q).Suffixes = %v, want %v", c.in, got.Suffixes, c.wantSuf)
			continue
		}
		for i := range c.wantSuf {
			if got.Suffixes[i] != c.wantSuf[i] {
				t.Errorf("ExtractVersionSuffix(%q).Suffixes[%d] = %q, want %q", c.in, i, got.Suffixes[i], c.wantSuf[i])
			}
		}
	}
}

func TestStep8NormalizeAuthor(t *testing.T) {
	cases := []struct{ in, want string }{
		{"刘慈欣 著", "刘慈欣"},
		{"刘慈欣 编", "刘慈欣"},
		{"刘慈欣 译", "刘慈欣"},
		{"慈欣·刘", "刘慈欣"},
		{"刘慈欣", "刘慈欣"},
	}
	for _, c := range cases {
		if got := NormalizeAuthor(c.in); got != c.want {
			t.Errorf("NormalizeAuthor(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

func TestNormalizeTitlePipeline(t *testing.T) {
	cases := []struct{ in, want string }{
		{"《三体》（第二版）", "三体"},
		{"三體", "三体"},
		{"ＡＢＣ", "abc"},
		{"三体 (z-library.sk, 1lib.sk)", "三体"},
		{"《三体》：黑暗森林", "三体 黑暗森林"},
	}
	for _, c := range cases {
		if got := NormalizeTitle(c.in); got != c.want {
			t.Errorf("NormalizeTitle(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}
