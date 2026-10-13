package userdb

import "testing"

// TestLegacyHashMatchesPython 交叉验证：Go 的 legacyHash 与 Python 逐字节一致。
//
// 期望值由 Python 生成：
//
//	import hashlib
//	def legacy(raw, salt):
//	    p1 = hashlib.sha256(raw.encode("UTF-8")).hexdigest()
//	    return hashlib.sha256((salt + p1).encode("UTF-8")).hexdigest()
func TestLegacyHashMatchesPython(t *testing.T) {
	cases := []struct {
		raw, salt, want string
	}{
		{
			raw:  "secret123",
			salt: "abcdefghijklmnopqrstuvwxyz012345",
			want: "8a96d09af4fad1ff3ac7bcbf90649a8d537b1e22e7f13d57b4aec3d6b054a110",
		},
		{
			raw:  "pw",
			salt: "",
			want: "b7f5b58e0f7acf9a8dc8e7ebfd579d9c339de44748ddc9f0a32b95a1d3379e3c",
		},
	}
	for _, c := range cases {
		got := legacyHash(c.raw, c.salt)
		if got != c.want {
			t.Errorf("legacyHash(%q, %q) = %s, want %s", c.raw, c.salt, got, c.want)
		}
	}
}
