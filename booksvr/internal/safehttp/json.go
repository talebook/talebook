package safehttp

import "encoding/json"

// marshalJSON 序列化请求体。
func marshalJSON(v any) (string, error) {
	b, err := json.Marshal(v)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

// unmarshalJSON 反序列化响应体。
func unmarshalJSON(data []byte, out any) error {
	return json.Unmarshal(data, out)
}
