package pluginbuiltin

import "testing"

func TestReadableUTF8DoesNotInheritOtherCandidateCycle(t *testing.T) {
	text := "普通中文小說"
	got, report := analyzeEncoding([]byte(text))
	if got != text || report["unrecoverable"] == true || report["garbage"] == true {
		t.Fatalf("valid UTF-8 rejected: %q %#v", got, report)
	}
}
