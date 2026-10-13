package normalize

import "testing"

func TestZhConvTableLoaded(t *testing.T) {
	n := ZhConvTableSize()
	t.Logf("table size: %d", n)
	if n == 0 {
		t.Fatal("zh_conv table is empty - embed or parser broken")
	}
	if n < 3000 {
		t.Logf("WARNING: table size %d is below the agreed 3000-5000 range", n)
	}
	if n > 5000 {
		t.Errorf("table size %d exceeds the agreed 5000 limit", n)
	}
}

func TestZhConvSpecific(t *testing.T) {
	for _, c := range []struct{ in, want string }{
		{"爺", "爷"},
		{"體", "体"},
		{"劉", "刘"},
	} {
		if got := ToSimplified(c.in); got != c.want {
			t.Errorf("ToSimplified(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}
