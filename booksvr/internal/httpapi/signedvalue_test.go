package httpapi

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"strconv"
)

// createSignedValue 按 Tornado v2 格式生成 secure cookie。
//
// 仅用于测试构造数据；生产代码只做解码。
// 与 tornado.web.create_signed_value(secret, name, value, version=2) 等价。
func createSignedValue(secret, name, value string, ts int64) string {
	formatField := func(s string) string {
		return fmt.Sprintf("%d:%s", len(s), s)
	}
	b64 := base64.StdEncoding.EncodeToString([]byte(value))
	toSign := "2" + "|" +
		formatField("0") + "|" +
		formatField(strconv.FormatInt(ts, 10)) + "|" +
		formatField(name) + "|" +
		formatField(b64) + "|"

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(toSign))
	return toSign + hex.EncodeToString(mac.Sum(nil))
}
