// Package tornadosign 实现 Tornado secure cookie 的 v2 签名与验签。
//
// 格式（tornado.web.create_signed_value，version=2）：
//
//	2|<len(kv)>:<kv>|<len(ts)>:<ts>|<len(name)>:<name>|<len(b64)>:<b64>|<hex_hmac_sha256>
//
// 待签名串是最后一个 `|` 之前的全部内容（含该 `|`），签名是
// HMAC-SHA256(secret, to_sign) 的十六进制。
//
// 该包被 httpapi（登录 cookie）与 booksource（元数据 provider token）共用，
// 因此不依赖任何上层包。
package tornadosign

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"strconv"
	"strings"
	"time"
)

// Version 是 Tornado 默认的签名格式版本。
const Version = "2"

// Sign 生成 Tornado v2 格式的签名值。
//
// 与 Decode 互为逆运算。
func Sign(secret, name, value string, ts int64) string {
	kv := "0"
	b64 := base64.StdEncoding.EncodeToString([]byte(value))
	tsStr := strconv.FormatInt(ts, 10)

	var sb strings.Builder
	sb.WriteString(Version)
	sb.WriteByte('|')
	writeField(&sb, kv)
	writeField(&sb, tsStr)
	writeField(&sb, name)
	writeField(&sb, b64)

	toSign := sb.String()
	return toSign + signV2(secret, toSign)
}

// Decode 解码 Tornado 的 secure cookie（v2 格式）。
//
// 任何异常（格式错误、签名不符、name 不符、过期）一律返回 nil，
// 与 Tornado 的 decode_signed_value 返回 None 的语义一致。
func Decode(secret, name string, value []byte, maxAgeDays float64, clock func() int64) []byte {
	if len(value) == 0 || secret == "" {
		return nil
	}
	if clock == nil {
		clock = func() int64 { return time.Now().Unix() }
	}

	raw := string(value)
	// 版本号是第一个 `|` 之前的内容。
	sep := strings.Index(raw, "|")
	if sep < 0 || raw[:sep] != Version {
		// 只支持 v2；v1 与未知版本一律拒绝。
		return nil
	}

	// 签名是最后一个 `|` 之后的内容，待签名串包含该 `|`。
	lastSep := strings.LastIndex(raw, "|")
	if lastSep < sep {
		return nil
	}
	toSign := raw[:lastSep+1]
	passedSig := raw[lastSep+1:]
	if passedSig == "" {
		return nil
	}

	expected := signV2(secret, toSign)
	if !hmac.Equal([]byte(passedSig), []byte(expected)) {
		return nil
	}

	// 解析长度前缀字段：kv, ts, name, b64value。
	fields, ok := decodeFieldsV2(raw[sep+1 : lastSep+1])
	if !ok || len(fields) != 4 {
		return nil
	}
	_, tsRaw, nameField, valueField := fields[0], fields[1], fields[2], fields[3]

	if nameField != name {
		return nil
	}
	ts, err := strconv.ParseInt(tsRaw, 10, 64)
	if err != nil {
		return nil
	}
	if float64(ts) < float64(clock())-maxAgeDays*86400 {
		// 签名已过期。
		return nil
	}

	decoded, err := base64.StdEncoding.DecodeString(valueField)
	if err != nil {
		return nil
	}
	return decoded
}

// writeField 写入 `len:value|` 形式的一个字段。
func writeField(sb *strings.Builder, v string) {
	sb.WriteString(strconv.Itoa(len(v)))
	sb.WriteByte(':')
	sb.WriteString(v)
	sb.WriteByte('|')
}

// signV2 计算 Tornado v2 签名：hex(HMAC-SHA256(secret, s))。
func signV2(secret, s string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(s))
	return hex.EncodeToString(mac.Sum(nil))
}

// decodeFieldsV2 解析 `len:value|len:value|...` 形式的长度前缀字段。
//
// 输入应形如 `1:0|10:1791565386|7:user_id|4:NDI=|`（末尾可带 `|`）。
func decodeFieldsV2(s string) ([]string, bool) {
	var out []string
	for len(s) > 0 {
		colon := strings.Index(s, ":")
		if colon <= 0 {
			return nil, false
		}
		n, err := strconv.Atoi(s[:colon])
		if err != nil || n < 0 {
			return nil, false
		}
		rest := s[colon+1:]
		if n > len(rest) {
			return nil, false
		}
		out = append(out, rest[:n])
		rest = rest[n:]
		if rest == "" {
			break
		}
		if rest[0] != '|' {
			return nil, false
		}
		s = rest[1:]
	}
	return out, true
}
