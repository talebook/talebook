package pluginssecrets

import (
	"encoding/json"
	"testing"
)

// pythonKeyID / pythonCiphertext 由真实 Python 侧生成：
//
//	SecretCipher({"PLUGIN_SECRET_KEY": "test-key-123"})
//	  .key_id     → "0ab9ff3d6c095039"
//	  .encrypt({"token": "abc", "user": "bob"}) → 下方密文
const (
	pythonKeyID      = "0ab9ff3d6c095039"
	pythonCiphertext = "gAAAAABqyv5lyZkoI2auQehvSGUX-txJD_cYiE7_qQlLI12-K_4f45eTEV1XfXNsVqKYepDNViDNAr3TQamUlgzBvC4pyFVYVxx0aWvoi-Gmc5t5IXxOQ3w="
)

func testSettings() map[string]any {
	return map[string]any{"PLUGIN_SECRET_KEY": "test-key-123"}
}

func TestSecretCipherKeyIDMatchesPython(t *testing.T) {
	c, err := NewSecretCipher(testSettings())
	if err != nil {
		t.Fatalf("NewSecretCipher: %v", err)
	}
	if c.KeyID != pythonKeyID {
		t.Errorf("key_id = %s, want %s", c.KeyID, pythonKeyID)
	}
}

func TestSecretCipherDecryptsPythonCiphertext(t *testing.T) {
	c, err := NewSecretCipher(testSettings())
	if err != nil {
		t.Fatalf("NewSecretCipher: %v", err)
	}
	got, err := c.Decrypt(pythonCiphertext)
	if err != nil {
		t.Fatalf("Decrypt: %v", err)
	}
	if got["token"] != "abc" || got["user"] != "bob" {
		t.Errorf("got %v", got)
	}
}

func TestSecretCipherRoundTrip(t *testing.T) {
	c, err := NewSecretCipher(testSettings())
	if err != nil {
		t.Fatalf("NewSecretCipher: %v", err)
	}
	values := map[string]any{"token": "abc", "user": "bob"}
	ct, err := c.Encrypt(values)
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}
	got, err := c.Decrypt(ct)
	if err != nil {
		t.Fatalf("Decrypt: %v", err)
	}
	if got["token"] != "abc" || got["user"] != "bob" {
		t.Errorf("got %v", got)
	}
}

func TestSecretCipherEncryptEmptyRejected(t *testing.T) {
	c, _ := NewSecretCipher(testSettings())
	if _, err := c.Encrypt(nil); err == nil {
		t.Error("nil must be rejected")
	}
	if _, err := c.Encrypt(map[string]any{}); err == nil {
		t.Error("empty map must be rejected")
	}
}

func TestSecretCipherDecryptTamperedFails(t *testing.T) {
	c, _ := NewSecretCipher(testSettings())
	ct, err := c.Encrypt(map[string]any{"token": "abc"})
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}
	// 翻转最后一个字符破坏 HMAC。
	tampered := ct[:len(ct)-1]
	if ct[len(ct)-1] == 'A' {
		tampered += "B"
	} else {
		tampered += "A"
	}
	if _, err := c.Decrypt(tampered); err == nil {
		t.Error("tampered ciphertext must fail")
	}
}

func TestSecretCipherDecryptGarbageFails(t *testing.T) {
	c, _ := NewSecretCipher(testSettings())
	for _, bad := range []string{"", "not-base64!!!", "AAAA", "gAAAAA"} {
		if _, err := c.Decrypt(bad); err == nil {
			t.Errorf("Decrypt(%q) must fail", bad)
		}
	}
}

func TestSecretCipherKeyMaterialErrors(t *testing.T) {
	cases := []map[string]any{
		{},
		{"cookie_secret": "cookie_secret"},
		{"PLUGIN_SECRET_KEY": ""},
	}
	for _, s := range cases {
		if _, err := NewSecretCipher(s); err == nil {
			t.Errorf("settings %v must be rejected", s)
		}
	}
}

func TestSecretCipherFallsBackToCookieSecret(t *testing.T) {
	c, err := NewSecretCipher(map[string]any{"cookie_secret": "real-cookie-secret"})
	if err != nil {
		t.Fatalf("NewSecretCipher: %v", err)
	}
	if c.KeyID == "" {
		t.Error("key_id must be set")
	}
}

func TestSecretCipherRotate(t *testing.T) {
	old, _ := NewSecretCipher(map[string]any{"PLUGIN_SECRET_KEY": "old-key"})
	ct, err := old.Encrypt(map[string]any{"token": "abc"})
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}
	fresh, _ := NewSecretCipher(map[string]any{"PLUGIN_SECRET_KEY": "new-key"})
	rotated, err := fresh.Rotate(ct, old)
	if err != nil {
		t.Fatalf("Rotate: %v", err)
	}
	got, err := fresh.Decrypt(rotated)
	if err != nil {
		t.Fatalf("Decrypt after rotate: %v", err)
	}
	if got["token"] != "abc" {
		t.Errorf("got %v", got)
	}
}

func TestSecretCipherErrorCode(t *testing.T) {
	err := NewSecretCipherError("boom")
	if err.Code() != "plugin_secret_invalid" {
		t.Errorf("code = %s", err.Code())
	}
	if err.Error() != "boom" {
		t.Errorf("message = %s", err.Error())
	}
}

func TestMarshalSortedMatchesPythonDumps(t *testing.T) {
	// Python: json.dumps({"b":1,"a":"<x>"}, ensure_ascii=False, sort_keys=True,
	//                     separators=(",", ":")) → {"a":"<x>","b":1}
	got, err := marshalSorted(map[string]any{"b": 1, "a": "<x>"})
	if err != nil {
		t.Fatalf("marshalSorted: %v", err)
	}
	if string(got) != `{"a":"<x>","b":1}` {
		t.Errorf("got %s", got)
	}
}

func TestMarshalSortedNested(t *testing.T) {
	got, err := marshalSorted(map[string]any{
		"z": []any{1, "two", true, nil},
		"a": map[string]any{"y": 2, "x": 1},
	})
	if err != nil {
		t.Fatalf("marshalSorted: %v", err)
	}
	want := `{"a":{"x":1,"y":2},"z":[1,"two",true,null]}`
	if string(got) != want {
		t.Errorf("got %s, want %s", got, want)
	}
}

func TestMarshalSortedUnicodeNotEscaped(t *testing.T) {
	got, err := marshalSorted(map[string]any{"name": "中文"})
	if err != nil {
		t.Fatalf("marshalSorted: %v", err)
	}
	// Python ensure_ascii=False 保留原字符。
	if string(got) != `{"name":"中文"}` {
		t.Errorf("got %s", got)
	}
}

func TestMarshalSortedIsValidJSON(t *testing.T) {
	got, err := marshalSorted(map[string]any{"a": []any{1, 2}, "b": "x"})
	if err != nil {
		t.Fatalf("marshalSorted: %v", err)
	}
	var back map[string]any
	if err := json.Unmarshal(got, &back); err != nil {
		t.Fatalf("output is not valid JSON: %v (%s)", err, got)
	}
}

func TestPKCS7RoundTrip(t *testing.T) {
	for _, size := range []int{0, 1, 15, 16, 17, 32} {
		data := make([]byte, size)
		for i := range data {
			data[i] = byte(i)
		}
		padded := pkcs7Pad(data, 16)
		if len(padded)%16 != 0 {
			t.Errorf("size %d: padded length %d not block-aligned", size, len(padded))
		}
		back, err := pkcs7Unpad(padded, 16)
		if err != nil {
			t.Fatalf("size %d: unpad: %v", size, err)
		}
		if len(back) != size {
			t.Errorf("size %d: got %d", size, len(back))
		}
	}
}

func TestPKCS7UnpadRejectsInvalid(t *testing.T) {
	if _, err := pkcs7Unpad([]byte{}, 16); err == nil {
		t.Error("empty must fail")
	}
	if _, err := pkcs7Unpad([]byte{1, 2, 3}, 16); err == nil {
		t.Error("non-aligned must fail")
	}
	bad := make([]byte, 16)
	bad[15] = 0
	if _, err := pkcs7Unpad(bad, 16); err == nil {
		t.Error("zero padding must fail")
	}
	bad2 := make([]byte, 16)
	bad2[15] = 20
	if _, err := pkcs7Unpad(bad2, 16); err == nil {
		t.Error("oversized padding must fail")
	}
}
