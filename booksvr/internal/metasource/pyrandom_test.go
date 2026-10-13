package metasource

import "testing"

// TestPyRandomChoice 对齐 Python `random.seed(s); random.choice(VERSION_LIST)` 的 6 组向量。
func TestPyRandomChoice(t *testing.T) {
	cases := []struct{ seed, want string }{
		{"00000000", "73325"},
		{"12345", "73000"},
		{"1", "72900"},
		{"999999", "73328"},
		{"abc", "72800"},
		{"", "73000"},
	}
	for _, tc := range cases {
		if got := pyRandomChoice(tc.seed, QimaoVersionList); got != tc.want {
			t.Errorf("pyRandomChoice(%q) = %q, want %q", tc.seed, got, tc.want)
		}
	}
}

// TestPyRandomChoiceReproducible 校验同种子结果稳定。
func TestPyRandomChoiceReproducible(t *testing.T) {
	a := pyRandomChoice("12345", QimaoVersionList)
	b := pyRandomChoice("12345", QimaoVersionList)
	if a != b {
		t.Errorf("同种子结果不一致: %q vs %q", a, b)
	}
}

// TestPyRandomChoiceEmptySeq 校验空序列返回空串。
func TestPyRandomChoiceEmptySeq(t *testing.T) {
	if got := pyRandomChoice("x", nil); got != "" {
		t.Errorf("空序列 = %q", got)
	}
}

// TestSeedToKey 校验种子到 32 位字数组的拆分。
func TestSeedToKey(t *testing.T) {
	// "12345" 的 UTF-8 是 5 字节，加 64 字节摘要 = 69 字节 → 18 个字。
	got := seedToKey("12345")
	if len(got) != 18 {
		t.Errorf("seedToKey(12345) 长度 = %d, want 18", len(got))
	}
	// 空串：0 字节 + 64 字节摘要 = 64 字节 → 16 个字。
	if got := seedToKey(""); len(got) != 16 {
		t.Errorf("seedToKey(空) 长度 = %d, want 16", len(got))
	}
}

// TestMTRandomRange 校验 random() 落在 [0,1)。
func TestMTRandomRange(t *testing.T) {
	mt := newMT19937FromString("seed")
	for i := 0; i < 100; i++ {
		v := mt.random()
		if v < 0 || v >= 1 {
			t.Fatalf("random() = %v 越界", v)
		}
	}
}
