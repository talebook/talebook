package userdb

import (
	"testing"

	"golang.org/x/crypto/bcrypt"
)

// bcryptHash 用 bcrypt 生成测试用哈希。
func bcryptHash(t *testing.T, raw string) string {
	t.Helper()
	h, err := bcrypt.GenerateFromPassword([]byte(raw), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("bcrypt: %v", err)
	}
	return string(h)
}
