package runtimelog

import (
	"bytes"
	"log"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestInstallAndRotation(t *testing.T) {
	p := filepath.Join(t.TempDir(), "log", "system.log")
	old := log.Writer()
	var output bytes.Buffer
	log.SetOutput(&output)
	defer log.SetOutput(old)
	closeLog, err := Install(p)
	if err != nil {
		t.Fatal(err)
	}
	log.Print("测试日志")
	closeLog()
	raw, err := os.ReadFile(p)
	if err != nil || !strings.Contains(string(raw), "测试日志") || !strings.Contains(output.String(), "测试日志") {
		t.Fatal("not mirrored")
	}
	w, err := Open(p)
	if err != nil {
		t.Fatal(err)
	}
	w.limit = 8
	for i := 0; i < 10; i++ {
		if _, err = w.Write([]byte("12345678")); err != nil {
			t.Fatal(err)
		}
	}
	w.Close()
	for _, suffix := range []string{"", ".1", ".2"} {
		info, err := os.Stat(p + suffix)
		if err != nil || info.Size() != 8 {
			t.Fatalf("rotation %s %v", suffix, err)
		}
	}
	if _, err = os.Stat(p + ".3"); !os.IsNotExist(err) {
		t.Fatal("unbounded logs")
	}
}
func TestLogPathOverride(t *testing.T) {
	t.Setenv("BOOKSVR_LOG_FILE", "/tmp/test.log")
	if Path() != "/tmp/test.log" {
		t.Fatal(Path())
	}
}
