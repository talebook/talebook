package pluginbuiltin

import (
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func deviceTestFile(t *testing.T) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "book.txt")
	if err := os.WriteFile(path, []byte("device upload content"), 0600); err != nil {
		t.Fatal(err)
	}
	return path
}

func TestBOOXUploadCompatibility(t *testing.T) {
	for _, tc := range []struct {
		name    string
		legacy  int
		storage string
		calls   int
		success bool
	}{
		{"legacy", 200, "", 1, true},
		{"forbidden", 403, `{"code":0,"data":{"path":"/Download/book.txt"}}`, 2, true},
		{"not-found", 404, `{"code":0,"successful":true}`, 2, true},
		{"method", 405, `{"code":0}`, 2, true},
		{"gone", 410, `{"code":0}`, 2, true},
		{"unimplemented", 501, `{"code":0}`, 2, true},
		{"unauthorized", 401, "", 1, false},
		{"busy", 429, "", 1, false},
		{"server-error", 500, "", 1, false},
		{"unavailable", 503, "", 1, false},
		{"conflict", 403, `{"code":300001}`, 2, false},
		{"rejected", 403, `{"code":0,"successful":false}`, 2, false},
		{"html", 403, `<html>BOOX</html>`, 2, false},
		{"missing-code", 403, `{"successful":true}`, 2, false},
		{"new-flags", 403, `{"code":0,"isSuccessful":true,"isTokenInvalid":false}`, 2, true},
		{"new-rejected", 403, `{"code":0,"isSuccessful":false}`, 2, false},
		{"token-invalid", 403, `{"code":0,"isSuccessful":true,"isTokenInvalid":true}`, 2, false},
		{"conflicting-flags", 403, `{"code":0,"successful":false,"isSuccessful":true}`, 2, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			calls := 0
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls++
				if r.Method != "POST" {
					t.Error(r.Method)
				}
				if err := r.ParseMultipartForm(1 << 20); err != nil {
					t.Error(err)
					return
				}
				defer r.MultipartForm.RemoveAll()
				f, header, err := r.FormFile("file")
				if err != nil {
					t.Error(err)
					return
				}
				defer f.Close()
				b, _ := io.ReadAll(f)
				if string(b) != "device upload content" || header.Filename != "三体.txt" {
					t.Error(string(b), header.Filename)
				}
				if calls == 1 {
					if r.URL.Path != "/api/library/upload" || r.FormValue("parent") != "null" || r.FormValue("sender") != "web" {
						t.Error(r.URL, r.Form)
					}
					w.WriteHeader(tc.legacy)
					fmt.Fprint(w, `{"code":0,"successful":true}`)
				} else {
					if r.URL.Path != "/api/storage/upload" || r.FormValue("path") != "/Download" {
						t.Error(r.URL, r.Form)
					}
					fmt.Fprint(w, tc.storage)
				}
			}))
			defer srv.Close()
			result := booxUpload(pushHTTPClient, srv.URL, deviceTestFile(t), "三体.txt", "text/plain", time.Second)
			if result["success"] != tc.success || calls != tc.calls {
				t.Fatalf("calls=%d result=%v", calls, result)
			}
			if tc.legacy == 401 && result["status_code"] != 401 {
				t.Fatal(result)
			}
		})
	}
}

func TestBOOXNoRetryOnAmbiguousFailure(t *testing.T) {
	for _, mode := range []string{"disconnect", "timeout", "business"} {
		t.Run(mode, func(t *testing.T) {
			calls := 0
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls++
				switch mode {
				case "disconnect":
					c, _, _ := w.(http.Hijacker).Hijack()
					c.Close()
				case "timeout":
					time.Sleep(120 * time.Millisecond)
				case "business":
					fmt.Fprint(w, `{"code":300001,"successful":false}`)
				}
			}))
			defer srv.Close()
			result := booxUpload(pushHTTPClient, srv.URL, deviceTestFile(t), "book.txt", "text/plain", 40*time.Millisecond)
			// Close waits for the timeout handler, synchronizing its counter.
			srv.Close()
			if result["success"] != false || calls != 1 {
				t.Fatal(calls, result)
			}
			if mode == "timeout" && result["error_type"] != "timeout" {
				t.Fatal(result)
			}
			if mode == "disconnect" && result["error_type"] != "connection" {
				t.Fatal(result)
			}
		})
	}
}

func TestDeviceMultipartContracts(t *testing.T) {
	for _, tc := range []struct {
		name, path, field string
		upload            uploaderFunc
	}{
		{"duokan", "/files", "newfile", duokanUpload},
		{"hanwang", "/files", "newfile", hanwangUpload},
		{"ireader", "/", "Filedata", ireaderUpload},
		{"dangdang", "/", "files[]", dangdangUpload},
		{"purelibro", "/upload", "files[]", purelibroUpload},
	} {
		t.Run(tc.name, func(t *testing.T) {
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path != tc.path {
					t.Error(r.URL)
				}
				if err := r.ParseMultipartForm(1 << 20); err != nil {
					t.Error(err)
					return
				}
				defer r.MultipartForm.RemoveAll()
				f, _, err := r.FormFile(tc.field)
				if err != nil {
					t.Error(err)
					return
				}
				defer f.Close()
				b, _ := io.ReadAll(f)
				if string(b) != "device upload content" {
					t.Error(string(b))
				}
				if tc.name == "hanwang" && r.FormValue("fileName") != "%E4%B8%89%E4%BD%93.txt" {
					t.Error(r.Form)
				}
				if tc.name == "ireader" && (r.URL.Query().Get("action") != "addBook" || r.FormValue("Filename") != "三体.txt" || r.FormValue("Upload") != "Submit Query") {
					t.Error(r.URL, r.Form)
				}
				if tc.name == "purelibro" && r.FormValue("path") != "/" {
					t.Error(r.Form)
				}
				fmt.Fprint(w, `{"ok":true}`)
			}))
			defer srv.Close()
			result := tc.upload(pushHTTPClient, srv.URL, deviceTestFile(t), "三体.txt", "text/plain", time.Second)
			if result["success"] != true {
				t.Fatal(result)
			}
		})
	}
}

func TestIReaderLegacyContentType(t *testing.T) {
	calls := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		if calls == 1 {
			w.WriteHeader(415)
			return
		}
		if r.Header.Get("Content-Type") != "application/octet-stream" {
			t.Error(r.Header)
		}
		body, _ := io.ReadAll(r.Body)
		boundary := strings.TrimPrefix(strings.SplitN(string(body), "\r\n", 2)[0], "--")
		reader := multipart.NewReader(strings.NewReader(string(body)), boundary)
		form, err := reader.ReadForm(1 << 20)
		if err != nil {
			t.Fatal(err)
		}
		defer form.RemoveAll()
		if len(form.File["Filedata"]) != 1 || form.Value["Filename"][0] != "三体.txt" {
			t.Error(form)
		}
		fmt.Fprint(w, `{"ok":true}`)
	}))
	defer srv.Close()
	result := ireaderUpload(pushHTTPClient, srv.URL, deviceTestFile(t), "三体.txt", "text/plain", time.Second)
	if calls != 2 || result["success"] != true {
		t.Fatal(calls, result)
	}
}

func TestBOOXLiveUpload(t *testing.T) {
	base := os.Getenv("TALEBOOK_BOOX_LIVE_URL")
	if base == "" {
		t.Skip("requires explicitly configured BOOX test device")
	}
	name := fmt.Sprintf("Talebook-传书验证-%d.txt", time.Now().UnixNano())
	result := booxUpload(pushHTTPClient, base, deviceTestFile(t), name, mime.TypeByExtension(".txt"), 20*time.Second)
	t.Logf("BOOX result: %v", result)
	if result["success"] != true {
		t.Fatal(result)
	}
}
