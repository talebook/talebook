package normalize

import "testing"

func TestWorkKeyEquality(t *testing.T) {
	a := WorkKey("三体", "刘慈欣")
	b := WorkKey("三體（第二版）", "刘慈欣 著")
	if a != b {
		t.Errorf("WorkKey mismatch:\n  %q\n  %q", a, b)
	}
}

func TestWorkKeyDiffers(t *testing.T) {
	a := WorkKey("三体", "刘慈欣")
	b := WorkKey("三体", "刘慈欣2")
	if a == b {
		t.Errorf("WorkKey should differ for different authors, both = %q", a)
	}
	c := WorkKey("三体2", "刘慈欣")
	if a == c {
		t.Errorf("WorkKey should differ for different titles, both = %q", a)
	}
}

func TestWorkKeyFormat(t *testing.T) {
	got := WorkKey("三体", "刘慈欣")
	want := "三体\x1f刘慈欣"
	if got != want {
		t.Errorf("WorkKey = %q, want %q", got, want)
	}
}

func TestEditionKeyDiffersForSuffix(t *testing.T) {
	withSuffix := EditionKey(EditionMeta{Publisher: "重庆出版社", Pubdate: "2012", Translator: "", Suffixes: []string{"第二版"}})
	empty := EditionKey(EditionMeta{})
	if withSuffix == empty {
		t.Errorf("EditionKey with suffix should differ from empty, both = %q", withSuffix)
	}
}

func TestEditionKeyEmpty(t *testing.T) {
	if got := EditionKey(EditionMeta{}); got != "" {
		t.Errorf("EditionKey(empty) = %q, want \"\"", got)
	}
}

func TestEditionKeyFormat(t *testing.T) {
	got := EditionKey(EditionMeta{Publisher: "重庆出版社", Pubdate: "2008", Translator: ""})
	want := "重庆出版社\x1f2008\x1f-"
	if got != want {
		t.Errorf("EditionKey = %q, want %q", got, want)
	}
}

func TestEditionKeySameForSameEdition(t *testing.T) {
	a := EditionKey(EditionMeta{Publisher: "重庆出版社", Pubdate: "2008"})
	b := EditionKey(EditionMeta{Publisher: "重慶出版社", Pubdate: "2008"})
	if a != b {
		t.Errorf("EditionKey should match across 繁简: %q vs %q", a, b)
	}
}
