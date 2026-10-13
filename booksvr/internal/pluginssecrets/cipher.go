package pluginssecrets

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"time"
)

// SecretCipherError 对应 Python 的 SecretCipherError。
type SecretCipherError struct {
	Message string
}

func (e *SecretCipherError) Error() string { return e.Message }

// Code 复刻 Python 的类属性 code。
func (e *SecretCipherError) Code() string { return "plugin_secret_invalid" }

// NewSecretCipherError 构造凭据加解密错误。
func NewSecretCipherError(message string) *SecretCipherError {
	return &SecretCipherError{Message: message}
}

// fernetKeyMaterial 复刻 `_key_material(settings)`。
func fernetKeyMaterial(settings map[string]any) ([]byte, error) {
	pluginKey, _ := settings["PLUGIN_SECRET_KEY"].(string)
	cookieSecret, _ := settings["cookie_secret"].(string)
	value := pluginKey
	if value == "" {
		value = cookieSecret
	}
	if value == "" || (pluginKey == "" && value == "cookie_secret") {
		return nil, NewSecretCipherError(
			"Configure PLUGIN_SECRET_KEY or a non-default cookie_secret before storing credentials")
	}
	return []byte(value), nil
}

// SecretCipher 复刻 plugin_secrets.SecretCipher（Fernet 认证加密）。
type SecretCipher struct {
	KeyID string
	key   []byte // 32 字节：前 16 为 AES-128 密钥，后 16 为 HMAC 密钥
}

// NewSecretCipher 按 settings 派生密钥。
//
// Python: digest = sha256(b"talebook-plugin-secret-v1\0" + key_material).digest()
//
//	key_id = sha256(digest).hexdigest()[:16]
//	fernet = Fernet(base64.urlsafe_b64encode(digest))
func NewSecretCipher(settings map[string]any) (*SecretCipher, error) {
	material, err := fernetKeyMaterial(settings)
	if err != nil {
		return nil, err
	}
	h := sha256.New()
	h.Write([]byte("talebook-plugin-secret-v1\x00"))
	h.Write(material)
	digest := h.Sum(nil)

	idSum := sha256.Sum256(digest)
	return &SecretCipher{
		KeyID: hex.EncodeToString(idSum[:])[:16],
		key:   digest,
	}, nil
}

// Encrypt 加密凭据字典。
//
// Python: json.dumps(values, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
func (c *SecretCipher) Encrypt(values map[string]any) (string, error) {
	if len(values) == 0 {
		return "", NewSecretCipherError("plugin credentials must be a non-empty object")
	}
	plaintext, err := canonicalJSONBytes(values)
	if err != nil {
		return "", NewSecretCipherError("plugin credentials cannot be encoded")
	}
	return c.encryptRaw(plaintext)
}

// Decrypt 解密凭据字典。
func (c *SecretCipher) Decrypt(ciphertext string) (map[string]any, error) {
	plaintext, err := c.decryptRaw(ciphertext)
	if err != nil {
		return nil, err
	}
	var values map[string]any
	if err := json.Unmarshal(plaintext, &values); err != nil || values == nil {
		return nil, NewSecretCipherError("plugin credential payload is invalid")
	}
	return values, nil
}

// Rotate 用旧密钥解密后以当前密钥重新加密。
func (c *SecretCipher) Rotate(ciphertext string, previous *SecretCipher) (string, error) {
	values, err := previous.Decrypt(ciphertext)
	if err != nil {
		return "", err
	}
	return c.Encrypt(values)
}

// encryptRaw 实现 Fernet 加密。
//
// 令牌格式：base64url(0x80 || timestamp(8, big-endian) || IV(16) || AES-CBC密文 || HMAC-SHA256(32))
func (c *SecretCipher) encryptRaw(plaintext []byte) (string, error) {
	iv := make([]byte, aes.BlockSize)
	if _, err := rand.Read(iv); err != nil {
		return "", NewSecretCipherError("plugin credential cannot be encrypted")
	}
	// PKCS7 填充。
	padded := pkcs7Pad(plaintext, aes.BlockSize)

	// Fernet 密钥拆分：前 16 字节用于 HMAC，后 16 字节用于 AES-128。
	block, err := aes.NewCipher(c.key[16:])
	if err != nil {
		return "", NewSecretCipherError("plugin credential cannot be encrypted")
	}
	body := make([]byte, len(padded))
	cipher.NewCBCEncrypter(block, iv).CryptBlocks(body, padded)

	ts := uint64(time.Now().Unix())
	payload := make([]byte, 0, 1+8+len(iv)+len(body))
	payload = append(payload, 0x80)
	var tsBuf [8]byte
	binary.BigEndian.PutUint64(tsBuf[:], ts)
	payload = append(payload, tsBuf[:]...)
	payload = append(payload, iv...)
	payload = append(payload, body...)

	mac := hmac.New(sha256.New, c.key[:16])
	mac.Write(payload)
	token := append(payload, mac.Sum(nil)...)

	// Python Fernet 输出带填充的标准 base64url。
	return base64.URLEncoding.EncodeToString(token), nil
}

// decryptRaw 实现 Fernet 解密（含 HMAC 校验与 TTL 检查）。
func (c *SecretCipher) decryptRaw(ciphertext string) ([]byte, error) {
	// Python Fernet 用带填充的标准 base64url；同时兼容无填充写法。
	raw, err := base64.URLEncoding.DecodeString(ciphertext)
	if err != nil {
		raw, err = base64.RawURLEncoding.DecodeString(ciphertext)
		if err != nil {
			return nil, NewSecretCipherError("plugin credential cannot be decrypted")
		}
	}
	if len(raw) < 1+8+aes.BlockSize+sha256.Size {
		return nil, NewSecretCipherError("plugin credential cannot be decrypted")
	}
	if raw[0] != 0x80 {
		return nil, NewSecretCipherError("plugin credential cannot be decrypted")
	}

	payload := raw[:len(raw)-sha256.Size]
	expected := raw[len(raw)-sha256.Size:]

	mac := hmac.New(sha256.New, c.key[:16])
	mac.Write(payload)
	if !hmac.Equal(mac.Sum(nil), expected) {
		return nil, NewSecretCipherError("plugin credential cannot be decrypted")
	}

	iv := payload[9 : 9+aes.BlockSize]
	body := payload[9+aes.BlockSize:]
	if len(body) == 0 || len(body)%aes.BlockSize != 0 {
		return nil, NewSecretCipherError("plugin credential cannot be decrypted")
	}

	block, err := aes.NewCipher(c.key[16:])
	if err != nil {
		return nil, NewSecretCipherError("plugin credential cannot be decrypted")
	}
	plain := make([]byte, len(body))
	cipher.NewCBCDecrypter(block, iv).CryptBlocks(plain, body)

	out, err := pkcs7Unpad(plain, aes.BlockSize)
	if err != nil {
		return nil, NewSecretCipherError("plugin credential cannot be decrypted")
	}
	return out, nil
}

// pkcs7Pad 做 PKCS#7 填充。
func pkcs7Pad(data []byte, blockSize int) []byte {
	pad := blockSize - len(data)%blockSize
	out := make([]byte, len(data)+pad)
	copy(out, data)
	for i := len(data); i < len(out); i++ {
		out[i] = byte(pad)
	}
	return out
}

// pkcs7Unpad 去除 PKCS#7 填充。
func pkcs7Unpad(data []byte, blockSize int) ([]byte, error) {
	if len(data) == 0 || len(data)%blockSize != 0 {
		return nil, errors.New("invalid padding")
	}
	pad := int(data[len(data)-1])
	if pad == 0 || pad > blockSize || pad > len(data) {
		return nil, errors.New("invalid padding")
	}
	for _, b := range data[len(data)-pad:] {
		if int(b) != pad {
			return nil, errors.New("invalid padding")
		}
	}
	return data[:len(data)-pad], nil
}

// canonicalJSONBytes 复刻 json.dumps(v, ensure_ascii=False, sort_keys=True,
// separators=(",", ":")) 的字节输出。
func canonicalJSONBytes(v any) ([]byte, error) {
	return marshalSorted(v)
}

// encodeJSONString 序列化字符串，且不转义 HTML 字符（对齐 Python ensure_ascii=False）。
func encodeJSONString(s string) []byte {
	var b []byte
	b = append(b, '"')
	for _, r := range s {
		switch r {
		case '"':
			b = append(b, '\\', '"')
		case '\\':
			b = append(b, '\\', '\\')
		case '\n':
			b = append(b, '\\', 'n')
		case '\r':
			b = append(b, '\\', 'r')
		case '\t':
			b = append(b, '\\', 't')
		case '\b':
			b = append(b, '\\', 'b')
		case '\f':
			b = append(b, '\\', 'f')
		default:
			if r < 0x20 {
				b = append(b, fmt.Sprintf("\\u%04x", r)...)
			} else {
				b = append(b, string(r)...)
			}
		}
	}
	return append(b, '"')
}

// marshalSorted 递归按 key 排序后序列化，且不转义 HTML 字符。
func marshalSorted(v any) ([]byte, error) {
	var buf []byte
	if err := writeSorted(&buf, v); err != nil {
		return nil, err
	}
	return buf, nil
}

// writeSorted 递归写出排序后的 JSON。
func writeSorted(buf *[]byte, v any) error {
	switch t := v.(type) {
	case nil:
		*buf = append(*buf, "null"...)
	case bool:
		if t {
			*buf = append(*buf, "true"...)
		} else {
			*buf = append(*buf, "false"...)
		}
	case string:
		*buf = append(*buf, encodeJSONString(t)...)
	case map[string]any:
		keys := make([]string, 0, len(t))
		for k := range t {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		*buf = append(*buf, '{')
		for i, k := range keys {
			if i > 0 {
				*buf = append(*buf, ',')
			}
			*buf = append(*buf, encodeJSONString(k)...)
			*buf = append(*buf, ':')
			if err := writeSorted(buf, t[k]); err != nil {
				return err
			}
		}
		*buf = append(*buf, '}')
	case []any:
		*buf = append(*buf, '[')
		for i, item := range t {
			if i > 0 {
				*buf = append(*buf, ',')
			}
			if err := writeSorted(buf, item); err != nil {
				return err
			}
		}
		*buf = append(*buf, ']')
	default:
		encoded, err := json.Marshal(t)
		if err != nil {
			return fmt.Errorf("unsupported type %T", v)
		}
		*buf = append(*buf, encoded...)
	}
	return nil
}
