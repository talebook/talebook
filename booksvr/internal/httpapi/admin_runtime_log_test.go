package httpapi

import (
	"bytes"
	"errors"
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestAdminSystemLogRuntimeFileAndReadError(t *testing.T) {
	fx := newAdminFixture(t)
	file := filepath.Join(t.TempDir(), "runtime.log")
	t.Setenv("BOOKSVR_LOG_FILE", file)
	if err := os.WriteFile(file, []byte("runtime log\n"), 0600); err != nil {
		t.Fatal(err)
	}
	ctx := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/log", "", 1, true)
	got, err := AdminSystemLogHandler(fx.Cfg)(ctx)
	if err != nil || got["err"] != "ok" || got["total"] != 1 || got["file"] != file {
		t.Fatalf("%v %v", got, err)
	}
	download := pluginCtx(t, fx.DB, http.MethodGet, "/api/admin/log/download", "", 1, true)
	if _, err = AdminSystemLogDownloadHandler(fx.Cfg)(download); err != nil {
		t.Fatal(err)
	}
	if pluginRecorder(download).Body.String() != "runtime log\n" {
		t.Fatal("download reads a different file")
	}
	fx.Cfg.LogFile = t.TempDir()
	got, err = AdminSystemLogHandler(fx.Cfg)(ctx)
	if err != nil || got["err"] != "log.read.failed" {
		t.Fatalf("read failure hidden: %v %v", got, err)
	}
}

func TestHTTPHandlerErrorsReachSystemLog(t *testing.T) {
	var output bytes.Buffer
	old := log.Writer()
	log.SetOutput(&output)
	defer log.SetOutput(old)
	srv, err := NewServer([]RouteSpec{{Pattern: "/api/test-log", Handler: func(*Context) (map[string]any, error) { return nil, errors.New("test failure") }}})
	if err != nil {
		t.Fatal(err)
	}
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, httptest.NewRequest("GET", "/api/test-log?password=DO_NOT_LOG", nil))
	text := output.String()
	if !strings.Contains(text, "ERROR") || !strings.Contains(text, "test failure") || !strings.Contains(text, "/api/test-log") || strings.Contains(text, "DO_NOT_LOG") {
		t.Fatalf("bad log %q", text)
	}
}
