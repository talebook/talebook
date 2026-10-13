package importdir

import "testing"

func TestCrossLangVectors(t *testing.T) {
	// Linux 语义（生产 Docker 目标）：_is_within("/data","/data") == true
	if !IsWithin("/data", "/data") {
		t.Error("Linux 语义下 /data 应等于 /data")
	}
	if !IsWithin("/data/books", "/data") {
		t.Error("/data/books 应在 /data 之下")
	}
	if IsWithin("/database", "/data") {
		t.Error("/database 不应在 /data 之下")
	}
	// 纯空白：Python 会解析成 CWD，Go 返回空串（更安全，已记录差异）。
	if got := NormalizePath("   "); got != "" {
		t.Errorf("纯空白应返回空串，得到 %q", got)
	}
}
