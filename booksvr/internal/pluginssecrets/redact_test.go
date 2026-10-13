package pluginssecrets

import (
	"reflect"
	"testing"
)

func TestRedactSensitiveKeys(t *testing.T) {
	cases := []struct {
		key   string
		match bool
	}{
		{"password", true},
		{"PASSWORD", true},
		{"api_key", true},
		{"apikey", true},
		{"api-key", false}, // 正则用 _ 分隔，连字符不匹配
		{"token", true},
		{"access_token", true},
		{"authorization", true},
		{"cookie", true},
		{"cookies", false},
		{"secret", true},
		{"client_secret", true},
		{"username", false},
		{"user", false},
		{"endpoint", false},
		{"tokenizer", false},
	}
	for _, c := range cases {
		got := sensitiveKeyRe.MatchString(c.key)
		if got != c.match {
			t.Errorf("sensitiveKeyRe(%q) = %v, want %v", c.key, got, c.match)
		}
	}
}

func TestRedactDictByKey(t *testing.T) {
	in := map[string]any{
		"username": "alice",
		"password": "hunter2",
		"nested": map[string]any{
			"api_key": "sk-123",
			"host":    "example.com",
		},
	}
	got := Redact(in, nil).(map[string]any)

	if got["username"] != "alice" {
		t.Errorf("username = %v", got["username"])
	}
	if got["password"] != Redacted {
		t.Errorf("password = %v, want %s", got["password"], Redacted)
	}
	nested := got["nested"].(map[string]any)
	if nested["api_key"] != Redacted {
		t.Errorf("nested.api_key = %v", nested["api_key"])
	}
	if nested["host"] != "example.com" {
		t.Errorf("nested.host = %v", nested["host"])
	}
}

func TestRedactKnownSecretValues(t *testing.T) {
	secrets := map[string]any{"token": "supersecretvalue"}
	in := "failed to call https://api.example.com?token=supersecretvalue now"
	got := Redact(in, secrets).(string)
	want := "failed to call https://api.example.com?token=" + Redacted + " now"
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestRedactLongestFirst(t *testing.T) {
	// 短值 "abc" 是长值 "abcdef" 的前缀：必须先替换长值。
	secrets := map[string]any{"a": "abc", "b": "abcdef"}
	got := Redact("value=abcdef", secrets).(string)
	want := "value=" + Redacted
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestRedactBearer(t *testing.T) {
	got := Redact("Authorization: Bearer eyJhbGciOi.J9abc-_~+/=", nil).(string)
	want := "Authorization: Bearer " + Redacted
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestRedactAssignment(t *testing.T) {
	cases := map[string]string{
		"token=abc123":        "token=" + Redacted,
		"api_key=xyz":         "api_key=" + Redacted,
		"api-key=xyz":         "api-key=" + Redacted,
		"password=p@ss":       "password=" + Redacted,
		"secret=s1":           "secret=" + Redacted,
		"token=abc123;next=1": "token=" + Redacted + ";next=1",
		"token=abc123,next=1": "token=" + Redacted + ",next=1",
		"token=abc123&next=1": "token=" + Redacted + "&next=1",
		"no assignment here":  "no assignment here",
		"tokenizer=abc":       "tokenizer=abc",
	}
	for in, want := range cases {
		got := Redact(in, nil).(string)
		if got != want {
			t.Errorf("Redact(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestRedactListsAndScalars(t *testing.T) {
	in := []any{"plain", 42, true, nil, map[string]any{"secret": "x"}}
	got := Redact(in, nil).([]any)
	if got[0] != "plain" || got[1] != 42 || got[2] != true || got[3] != nil {
		t.Errorf("scalar passthrough broken: %v", got)
	}
	if got[4].(map[string]any)["secret"] != Redacted {
		t.Errorf("nested list dict not redacted: %v", got[4])
	}
}

func TestRedactListInheritsParentKey(t *testing.T) {
	// Python: list 元素继承父级 key，因此 password 列表里的字符串整体替换。
	in := map[string]any{"password": []any{"a", "b"}}
	got := Redact(in, nil).(map[string]any)
	// 列表本身不按 key 替换（Python 先判 list 再判 key），元素才继承 key。
	list := got["password"].([]any)
	if list[0] != Redacted || list[1] != Redacted {
		t.Errorf("list elements not redacted by inherited key: %v", list)
	}
}

func TestRedactEmptySecretsIgnored(t *testing.T) {
	secrets := map[string]any{"a": "", "b": nil}
	got := Redact("nothing to hide", secrets).(string)
	if got != "nothing to hide" {
		t.Errorf("got %q", got)
	}
}

func TestSecretMaskHint(t *testing.T) {
	cases := []struct {
		in   map[string]any
		want string
	}{
		{nil, ""},
		{map[string]any{}, ""},
		{map[string]any{"token": "abcdefgh"}, "efgh"},
		{map[string]any{"token": "abc"}, "abc"},
		{map[string]any{"token": "abcd"}, "abcd"},
		{map[string]any{"token": "", "key": "12345678"}, "5678"},
		{map[string]any{"token": nil, "key": "12345678"}, "5678"},
	}
	for _, c := range cases {
		got := SecretMaskHint(c.in)
		if got != c.want {
			t.Errorf("SecretMaskHint(%v) = %q, want %q", c.in, got, c.want)
		}
	}
}

func TestSecretMaskHintUnicode(t *testing.T) {
	// 按 rune 取末 4 位，不是按字节。
	got := SecretMaskHint(map[string]any{"token": "密码是中文的"})
	want := "是中文的"
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestRedactDoesNotMutateInput(t *testing.T) {
	in := map[string]any{"password": "hunter2"}
	_ = Redact(in, nil)
	if in["password"] != "hunter2" {
		t.Errorf("input mutated: %v", in)
	}
}

func TestRedactMapStringString(t *testing.T) {
	in := map[string]string{"password": "hunter2", "user": "alice"}
	got := Redact(in, nil).(map[string]any)
	if got["password"] != Redacted || got["user"] != "alice" {
		t.Errorf("got %v", got)
	}
}

func TestRedactStringSlice(t *testing.T) {
	in := []string{"a", "b"}
	got := Redact(in, nil).([]any)
	if !reflect.DeepEqual(got, []any{"a", "b"}) {
		t.Errorf("got %v", got)
	}
}
