package httpapi

import (
	"net/http"
	"strconv"
	"time"

	"talebook/booksvr/internal/tornadosign"
)

// Tornado secure cookie 常量，对齐 tornado.web 的默认值。
const (
	// signedValueVersion 是 Tornado 默认的签名格式版本。
	signedValueVersion = tornadosign.Version
	// loginCookieMaxAgeDays 对齐 base.py 的 7 天登录有效期。
	loginCookieMaxAgeDays = 7.0
	// cookieNameLoginTime / cookieNameUserID / cookieNameAdminID 对齐 base.py:288-310。
	cookieNameLoginTime = "lt"
	cookieNameUserID    = "user_id"
	cookieNameAdminID   = "admin_id"
)

// DecodeSignedValue 解码 Tornado 的 secure cookie（v2 格式）。
//
// 格式（tornado.web.create_signed_value，version=2）：
//
//	2|<len(kv)>:<kv>|<len(ts)>:<ts>|<len(name)>:<name>|<len(b64)>:<b64>|<hex_hmac_sha256>
//
// 待签名串是最后一个 `|` 之前的全部内容（含该 `|`），签名是
// HMAC-SHA256(secret, to_sign) 的十六进制。
//
// 任何异常（格式错误、签名不符、name 不符、过期）一律返回 nil，
// 与 Tornado 的 decode_signed_value 返回 None 的语义一致。
func DecodeSignedValue(secret, name string, value []byte, maxAgeDays float64, clock func() int64) []byte {
	return tornadosign.Decode(secret, name, value, maxAgeDays, clock)
}

// NewCookieIdentifier 返回一个从请求解析 Identity 的函数。
//
// 逻辑对齐 webserver/handlers/base.py:288-310：
//   - `lt` 缺失或超过 7 天 → 游客；
//   - `user_id` 解出数字 → UserID；
//   - `admin_id` 存在 → IsAdmin。
//
// 只信任自己解析出的 cookie，忽略任何外部传入的身份 header。
// 解析失败一律视为游客，不返回错误。
func NewCookieIdentifier(secret string, clock func() int64) func(*http.Request) (Identity, error) {
	return func(r *http.Request) (Identity, error) {
		if r == nil {
			return Identity{}, nil
		}
		if clock == nil {
			clock = func() int64 { return time.Now().Unix() }
		}

		ltRaw := cookieValue(r, cookieNameLoginTime)
		lt := DecodeSignedValue(secret, cookieNameLoginTime, ltRaw, loginCookieMaxAgeDays, clock)
		if len(lt) == 0 {
			return Identity{}, nil
		}
		loginAt, err := strconv.ParseInt(string(lt), 10, 64)
		if err != nil || loginAt < clock()-int64(loginCookieMaxAgeDays*86400) {
			return Identity{}, nil
		}

		uidRaw := DecodeSignedValue(secret, cookieNameUserID, cookieValue(r, cookieNameUserID), loginCookieMaxAgeDays, clock)
		if len(uidRaw) == 0 {
			return Identity{}, nil
		}
		uid, err := strconv.ParseInt(string(uidRaw), 10, 64)
		if err != nil || uid <= 0 {
			return Identity{}, nil
		}

		id := Identity{UserID: uid}
		// admin_id 存在即视为管理员（阶段 2 不查库，已知偏差见计划设计第 3 节）。
		if adminRaw := DecodeSignedValue(secret, cookieNameAdminID, cookieValue(r, cookieNameAdminID), loginCookieMaxAgeDays, clock); len(adminRaw) > 0 {
			if _, err := strconv.ParseInt(string(adminRaw), 10, 64); err == nil {
				id.IsAdmin = true
			}
		}
		return id, nil
	}
}

// cookieValue 读取原始 cookie 值；不存在时返回 nil。
func cookieValue(r *http.Request, name string) []byte {
	c, err := r.Cookie(name)
	if err != nil || c == nil {
		return nil
	}
	return []byte(c.Value)
}
