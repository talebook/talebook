package httpapi

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// 实测测试向量：由本机 Tornado 6.5.10 生成。
//
//	python -c "import tornado.web; print(tornado.web.create_signed_value('cookie_secret','user_id','42',clock=lambda:1791565386).decode())"
const (
	testSecret   = "cookie_secret"
	testUserID   = "42"
	testClock    = int64(1791565386)
	testUserIDCK = "2|1:0|10:1791565386|7:user_id|4:NDI=|9c0fda2c4e752e1982eab786b436f3ad282f45be025716063b093207792e08b9"
)

func fixedClock(ts int64) func() int64 { return func() int64 { return ts } }

// TestDecodeSignedValueV2RealVector 用真实 Tornado 向量验证解码。
func TestDecodeSignedValueV2RealVector(t *testing.T) {
	got := DecodeSignedValue(testSecret, "user_id", []byte(testUserIDCK), 7, fixedClock(testClock))
	if string(got) != testUserID {
		t.Fatalf("解码结果 = %q, want %q", string(got), testUserID)
	}
}

// TestDecodeSignedValueWrongSecret 换密钥应返回 nil。
func TestDecodeSignedValueWrongSecret(t *testing.T) {
	got := DecodeSignedValue("other", "user_id", []byte(testUserIDCK), 7, fixedClock(testClock))
	if got != nil {
		t.Fatalf("错误密钥应返回 nil，实际 %q", string(got))
	}
}

// TestDecodeSignedValueExpired 超过有效期应返回 nil。
func TestDecodeSignedValueExpired(t *testing.T) {
	got := DecodeSignedValue(testSecret, "user_id", []byte(testUserIDCK), 7, fixedClock(testClock+8*86400))
	if got != nil {
		t.Fatalf("过期应返回 nil，实际 %q", string(got))
	}
}

// TestDecodeSignedValueTampered 篡改签名应返回 nil。
func TestDecodeSignedValueTampered(t *testing.T) {
	bad := testUserIDCK[:len(testUserIDCK)-1] + "0"
	if bad == testUserIDCK {
		bad = testUserIDCK[:len(testUserIDCK)-1] + "1"
	}
	if got := DecodeSignedValue(testSecret, "user_id", []byte(bad), 7, fixedClock(testClock)); got != nil {
		t.Fatalf("篡改签名应返回 nil，实际 %q", string(got))
	}
}

// TestDecodeSignedValueMalformed 畸形输入应返回 nil 且不 panic。
func TestDecodeSignedValueMalformed(t *testing.T) {
	cases := []string{"", "garbage", "2|", "2|1:0|", "2|1:0|10:1791565386|7:user_id|4:NDI=", "1|abc|def"}
	for _, c := range cases {
		if got := DecodeSignedValue(testSecret, "user_id", []byte(c), 7, fixedClock(testClock)); got != nil {
			t.Errorf("畸形输入 %q 应返回 nil，实际 %q", c, string(got))
		}
	}
}

// TestDecodeSignedValueV1Rejected v1 格式应被拒绝。
func TestDecodeSignedValueV1Rejected(t *testing.T) {
	// v1 形如 base64value|timestamp|sha1sig
	v1 := "NDI=|1791565386|deadbeef"
	if got := DecodeSignedValue(testSecret, "user_id", []byte(v1), 7, fixedClock(testClock)); got != nil {
		t.Fatalf("v1 应被拒绝，实际 %q", string(got))
	}
}

// TestDecodeSignedValueWrongName name 不匹配应返回 nil。
func TestDecodeSignedValueWrongName(t *testing.T) {
	if got := DecodeSignedValue(testSecret, "admin_id", []byte(testUserIDCK), 7, fixedClock(testClock)); got != nil {
		t.Fatalf("name 不匹配应返回 nil，实际 %q", string(got))
	}
}

// --- Identity 解析 ---

// newCookieRequest 构造带指定 cookie 的请求。
func newCookieRequest(cookies map[string]string) *http.Request {
	r := httptest.NewRequest(http.MethodGet, "/api/work/1", nil)
	for k, v := range cookies {
		r.AddCookie(&http.Cookie{Name: k, Value: v})
	}
	return r
}

// sign 用与 Tornado 相同的算法生成 cookie，便于构造测试数据。
func sign(t *testing.T, secret, name, value string, ts int64) string {
	t.Helper()
	return createSignedValue(secret, name, value, ts)
}

// TestIdentifyGuestNoCookies 无 cookie 应为游客。
func TestIdentifyGuestNoCookies(t *testing.T) {
	id, err := NewCookieIdentifier(testSecret, fixedClock(testClock))(newCookieRequest(nil))
	if err != nil {
		t.Fatalf("不应返回错误: %v", err)
	}
	if !id.IsGuest() || id.UserID != 0 || id.IsAdmin {
		t.Fatalf("应为游客，实际 %#v", id)
	}
}

// TestIdentifyLoggedInUser 有效 lt + user_id 应识别用户。
func TestIdentifyLoggedInUser(t *testing.T) {
	r := newCookieRequest(map[string]string{
		"lt":      sign(t, testSecret, "lt", "1791565386", testClock),
		"user_id": sign(t, testSecret, "user_id", "42", testClock),
	})
	id, err := NewCookieIdentifier(testSecret, fixedClock(testClock))(r)
	if err != nil {
		t.Fatalf("不应返回错误: %v", err)
	}
	if id.UserID != 42 || id.IsGuest() {
		t.Fatalf("应识别为用户 42，实际 %#v", id)
	}
	if id.IsAdmin {
		t.Fatalf("无 admin_id 不应是管理员，实际 %#v", id)
	}
}

// TestIdentifyExpiredLogin lt 超过 7 天应为游客。
func TestIdentifyExpiredLogin(t *testing.T) {
	old := testClock - 8*86400
	r := newCookieRequest(map[string]string{
		"lt":      sign(t, testSecret, "lt", "1791565386", old),
		"user_id": sign(t, testSecret, "user_id", "42", old),
	})
	id, _ := NewCookieIdentifier(testSecret, fixedClock(testClock))(r)
	if !id.IsGuest() {
		t.Fatalf("过期登录应为游客，实际 %#v", id)
	}
}

// TestIdentifyAdmin 带 admin_id 应为管理员。
func TestIdentifyAdmin(t *testing.T) {
	r := newCookieRequest(map[string]string{
		"lt":       sign(t, testSecret, "lt", "1791565386", testClock),
		"user_id":  sign(t, testSecret, "user_id", "42", testClock),
		"admin_id": sign(t, testSecret, "admin_id", "42", testClock),
	})
	id, _ := NewCookieIdentifier(testSecret, fixedClock(testClock))(r)
	if !id.IsAdmin || id.UserID != 42 {
		t.Fatalf("应为管理员 42，实际 %#v", id)
	}
}

// TestIdentifyAdminOwnerMode admin_id 指向他人时仍视为管理员（owner 切换）。
//
// 注意：这是 AdminOwnerMode 下的 owner 切换（admin.py:293-300），不是冒充。
// 阶段 2 不查库校验 admin 字段，存在已知权限偏差（见计划设计第 3 节）。
func TestIdentifyAdminOwnerMode(t *testing.T) {
	r := newCookieRequest(map[string]string{
		"lt":       sign(t, testSecret, "lt", "1791565386", testClock),
		"user_id":  sign(t, testSecret, "user_id", "42", testClock),
		"admin_id": sign(t, testSecret, "admin_id", "7", testClock),
	})
	id, _ := NewCookieIdentifier(testSecret, fixedClock(testClock))(r)
	if !id.IsAdmin {
		t.Fatalf("admin_id 存在应为管理员，实际 %#v", id)
	}
}

// TestIdentifyIgnoresExternalHeaders 外部身份 header 必须被忽略。
func TestIdentifyIgnoresExternalHeaders(t *testing.T) {
	r := newCookieRequest(nil)
	r.Header.Set("X-Talebook-User-Id", "999")
	r.Header.Set("X-Talebook-Is-Admin", "true")
	id, _ := NewCookieIdentifier(testSecret, fixedClock(testClock))(r)
	if !id.IsGuest() {
		t.Fatalf("外部 header 不应影响身份，实际 %#v", id)
	}
}

// TestIdentifyBadCookieIsGuest 签名错误的 cookie 应为游客且不报错。
func TestIdentifyBadCookieIsGuest(t *testing.T) {
	r := newCookieRequest(map[string]string{
		"lt":      "garbage",
		"user_id": "garbage",
	})
	id, err := NewCookieIdentifier(testSecret, fixedClock(testClock))(r)
	if err != nil {
		t.Fatalf("不应返回错误: %v", err)
	}
	if !id.IsGuest() {
		t.Fatalf("非法 cookie 应为游客，实际 %#v", id)
	}
}
