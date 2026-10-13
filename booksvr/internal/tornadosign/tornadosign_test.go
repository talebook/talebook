package tornadosign

import (
	"strings"
	"testing"
	"time"
)

// TestSignMatchesTornado 对齐 tornado.web.create_signed_value 的 4 组向量。
//
// 向量由 Python 侧生成：
//
//	tornado.web.create_signed_value("secret", name, value, clock=lambda: 1700000000)
func TestSignMatchesTornado(t *testing.T) {
	cases := []struct {
		name  string
		value string
		want  string
	}{
		{"user_id", "42",
			"2|1:0|10:1700000000|7:user_id|4:NDI=|dc51470274c9f96129fceb3c822be4de318e9770275e6e86118f8b18894f56a6"},
		{"lt", "1700000000",
			"2|1:0|10:1700000000|2:lt|16:MTcwMDAwMDAwMA==|c0fffcec3ee9b1f52c0613d78eeb8e51f20a9e4c6bf1d6182b33793040d4d42c"},
		{"x", "",
			"2|1:0|10:1700000000|1:x|0:|955789cfe9bbdf27781228920c0470d2f30c64027bfef76fb7adf6094bf5b8fb"},
		{"y", "a|b|c",
			"2|1:0|10:1700000000|1:y|8:YXxifGM=|562f0412f7ada91264ab4fec9e6163fea90d2144956dc9db81b5333baadc131f"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := Sign("secret", tc.name, tc.value, 1700000000)
			if got != tc.want {
				t.Errorf("Sign = %q\nwant   %q", got, tc.want)
			}
		})
	}
}

// TestSignDecodeRoundTrip 验证签名与验签互为逆运算。
func TestSignDecodeRoundTrip(t *testing.T) {
	now := time.Unix(1700000000, 0)
	clock := func() int64 { return now.Unix() }

	for _, value := range []string{"", "42", "a|b|c", "中文值", "with spaces"} {
		signed := Sign("secret", "name", value, now.Unix())
		got := Decode("secret", "name", []byte(signed), 7, clock)
		if string(got) != value {
			t.Errorf("往返 %q -> %q", value, got)
		}
	}
}

// TestDecodeRejects 验证各类非法输入被拒绝。
func TestDecodeRejects(t *testing.T) {
	now := time.Unix(1700000000, 0)
	clock := func() int64 { return now.Unix() }
	signed := Sign("secret", "name", "v", now.Unix())

	cases := []struct {
		name   string
		secret string
		field  string
		value  string
		maxAge float64
	}{
		{"空值", "secret", "name", "", 7},
		{"空密钥", "", "name", signed, 7},
		{"密钥不符", "other", "name", signed, 7},
		{"name 不符", "secret", "other", signed, 7},
		// 注意：max_age=0 且 ts == now 时**不算**过期（Python 同此语义）。
		// 真正的过期需要 now > ts。
		{"过期", "secret", "name", signed, -1},
		{"非 v2", "secret", "name", "1|1:0|10:1700000000|4:name|1:v|abc", 7},
		{"无分隔符", "secret", "name", "garbage", 7},
		// 把签名首字符翻转，确保确实被篡改（末位可能本就是 '0'）。
		{"签名被篡改", "secret", "name", flipFirstSigChar(signed), 7},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := Decode(tc.secret, tc.field, []byte(tc.value), tc.maxAge, clock); got != nil {
				t.Errorf("应返回 nil, got %q", got)
			}
		})
	}
}

// flipFirstSigChar 翻转签名段的首字符，用于构造被篡改的输入。
func flipFirstSigChar(signed string) string {
	idx := strings.LastIndex(signed, "|")
	if idx < 0 || idx+1 >= len(signed) {
		return signed + "x"
	}
	b := []byte(signed)
	if b[idx+1] == 'a' {
		b[idx+1] = 'b'
	} else {
		b[idx+1] = 'a'
	}
	return string(b)
}

// TestDecodeNilClock 验证 clock 为 nil 时用当前时间。
func TestDecodeNilClock(t *testing.T) {
	signed := Sign("secret", "name", "v", time.Now().Unix())
	if got := Decode("secret", "name", []byte(signed), 7, nil); string(got) != "v" {
		t.Errorf("= %q, want %q", got, "v")
	}
}

// TestDecodeFieldsV2 验证长度前缀字段解析。
func TestDecodeFieldsV2(t *testing.T) {
	got, ok := decodeFieldsV2("1:0|10:1700000000|4:name|1:v|")
	if !ok {
		t.Fatal("解析失败")
	}
	want := []string{"0", "1700000000", "name", "v"}
	if len(got) != len(want) {
		t.Fatalf("= %#v, want %#v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("[%d] = %q, want %q", i, got[i], want[i])
		}
	}

	// 空串解析为 0 个字段（与 Python 一致）。
	if got, ok := decodeFieldsV2(""); !ok || len(got) != 0 {
		t.Errorf("空串 = %#v, %v; want 空, true", got, ok)
	}

	// 非法输入。
	for _, bad := range []string{"abc", "x:1|", "5:ab|", "1:0x"} {
		if _, ok := decodeFieldsV2(bad); ok {
			t.Errorf("decodeFieldsV2(%q) 应失败", bad)
		}
	}
}

// TestSignV2 验证 HMAC-SHA256 十六进制签名。
func TestSignV2(t *testing.T) {
	got := signV2("secret", "to-sign")
	if len(got) != 64 {
		t.Errorf("长度 = %d, want 64", len(got))
	}
	if got != signV2("secret", "to-sign") {
		t.Error("同输入应得同签名")
	}
	if got == signV2("secret", "other") {
		t.Error("不同输入应得不同签名")
	}
}
