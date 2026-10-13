package updatecheck

import (
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// TestNormalizeVersion 覆盖版本归一化。
func TestNormalizeVersion(t *testing.T) {
	cases := map[string]string{
		"v1.2.3":  "1.2.3",
		"V1.2.3":  "1.2.3",
		" 1.2.3 ": "1.2.3",
		"vv1.2.3": "1.2.3",
		"":        "",
	}
	for in, want := range cases {
		if got := NormalizeVersion(in); got != want {
			t.Errorf("NormalizeVersion(%q) = %q，期望 %q", in, got, want)
		}
	}
}

// TestVersionParts 覆盖数字段提取。
func TestVersionParts(t *testing.T) {
	got := VersionParts("v2.0.0-62-60")
	want := []int{2, 0, 0, 62, 60}
	if len(got) != len(want) {
		t.Fatalf("段数 = %d，期望 %d（%v）", len(got), len(want), got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("第 %d 段 = %d，期望 %d", i, got[i], want[i])
		}
	}
}

// TestVersionPartsEmpty 覆盖无数字。
func TestVersionPartsEmpty(t *testing.T) {
	if got := VersionParts("abc"); len(got) != 0 {
		t.Errorf("应返回空，实际 %v", got)
	}
}

// TestCompareVersions 覆盖版本比较。
func TestCompareVersions(t *testing.T) {
	cases := []struct {
		v1, v2 string
		want   bool
	}{
		{"1.0.0", "1.0.1", true},
		{"1.0.1", "1.0.0", false},
		{"1.0.0", "1.0.0", false},
		{"v1.0.0", "1.0.0", false},
		{"1.0", "1.0.1", true},
		{"1.0.1", "1.0", false},
		{"2.0.0-62-60", "2.0.0-63-0", true},
		{"2.0.0-63-0", "2.0.0-62-60", false},
	}
	for _, c := range cases {
		if got := CompareVersions(c.v1, c.v2); got != c.want {
			t.Errorf("CompareVersions(%q,%q) = %v，期望 %v", c.v1, c.v2, got, c.want)
		}
	}
}

// TestCompareVersionsNonNumeric 覆盖非数字版本。
func TestCompareVersionsNonNumeric(t *testing.T) {
	if !CompareVersions("abc", "def") {
		t.Error("不同非数字版本应判定为有更新")
	}
	if CompareVersions("abc", "abc") {
		t.Error("相同非数字版本不应判定为有更新")
	}
}

// TestHasNewerVersion 覆盖更新判定。
func TestHasNewerVersion(t *testing.T) {
	if !HasNewerVersion("1.0.0", "1.0.1") {
		t.Error("1.0.1 应判定为更新")
	}
	if HasNewerVersion("1.0.1", "1.0.0") {
		t.Error("1.0.0 不应判定为更新")
	}
	if HasNewerVersion("1.0.0", "") {
		t.Error("空 latest 不应判定为更新")
	}
}

// TestSameVersion 覆盖同版本判定。
func TestSameVersion(t *testing.T) {
	if !SameVersion("v1.0.0", "1.0.0") {
		t.Error("v1.0.0 与 1.0.0 应视为同版本")
	}
	if SameVersion("1.0.0", "1.0.1") {
		t.Error("不同版本不应视为相同")
	}
}

// TestReleaseVersion 覆盖 tag 归一化。
func TestReleaseVersion(t *testing.T) {
	if got := ReleaseVersion("v2.0.0"); got != "2.0.0" {
		t.Errorf("ReleaseVersion = %q，期望 2.0.0", got)
	}
}

// TestCheckSuccess 覆盖成功检查。
func TestCheckSuccess(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"tag_name":"v9.9.9","html_url":"https://x/rel","name":"9.9.9","body":"notes"}`))
	}))
	defer srv.Close()

	c := NewChecker("1.0.0")
	c.APIURL = srv.URL
	st := c.Check()

	if st.CheckError != "" {
		t.Fatalf("意外错误: %s", st.CheckError)
	}
	if st.LatestVersion != "9.9.9" {
		t.Errorf("latest = %q，期望 9.9.9", st.LatestVersion)
	}
	if !st.HasUpdate {
		t.Error("应判定为有更新")
	}
	if st.ReleaseURL != "https://x/rel" {
		t.Errorf("release_url = %q", st.ReleaseURL)
	}
	if st.LastCheckTime == 0 {
		t.Error("last_check_time 未设置")
	}
}

// TestCheckNoUpdate 覆盖已是最新。
func TestCheckNoUpdate(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"tag_name":"v1.0.0"}`))
	}))
	defer srv.Close()

	c := NewChecker("1.0.0")
	c.APIURL = srv.URL
	st := c.Check()
	if st.HasUpdate {
		t.Error("同版本不应判定为有更新")
	}
}

// TestCheckHTTPError 覆盖 HTTP 错误。
func TestCheckHTTPError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusForbidden)
	}))
	defer srv.Close()

	c := NewChecker("1.0.0")
	c.APIURL = srv.URL
	st := c.Check()
	if st.CheckError == "" {
		t.Error("HTTP 错误应记录 check_error")
	}
}

// TestCheckEmptyBody 覆盖空响应。
func TestCheckEmptyBody(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("   "))
	}))
	defer srv.Close()

	c := NewChecker("1.0.0")
	c.APIURL = srv.URL
	st := c.Check()
	if st.CheckError == "" {
		t.Error("空响应应记录 check_error")
	}
}

// TestCheckInvalidJSON 覆盖非法 JSON。
func TestCheckInvalidJSON(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("not json"))
	}))
	defer srv.Close()

	c := NewChecker("1.0.0")
	c.APIURL = srv.URL
	st := c.Check()
	if st.CheckError == "" {
		t.Error("非法 JSON 应记录 check_error")
	}
}

// TestCheckNetworkError 覆盖网络错误。
func TestCheckNetworkError(t *testing.T) {
	c := NewChecker("1.0.0")
	c.APIURL = "http://example.invalid/nope"
	c.Client = &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		return nil, errors.New("dial failed")
	})}
	st := c.Check()
	if st.CheckError == "" {
		t.Error("网络错误应记录 check_error")
	}
}

// TestStatusInitiallyEmpty 覆盖初始状态。
func TestStatusInitiallyEmpty(t *testing.T) {
	c := NewChecker("1.0.0")
	st := c.Status()
	if st.CurrentVersion != "1.0.0" {
		t.Errorf("current_version = %q，期望 1.0.0", st.CurrentVersion)
	}
	if st.HasUpdate || st.CheckError != "" {
		t.Errorf("初始状态应为空，实际 %+v", st)
	}
}

// TestCheckSendsHeaders 覆盖请求头。
func TestCheckSendsHeaders(t *testing.T) {
	var gotUA, gotAccept string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotUA = r.Header.Get("User-Agent")
		gotAccept = r.Header.Get("Accept")
		_, _ = w.Write([]byte(`{"tag_name":"v1.0.0"}`))
	}))
	defer srv.Close()

	c := NewChecker("1.0.0")
	c.APIURL = srv.URL
	c.Check()

	if gotUA != "TaleBook-UpdateChecker" {
		t.Errorf("User-Agent = %q", gotUA)
	}
	if gotAccept != "application/vnd.github.v3+json" {
		t.Errorf("Accept = %q", gotAccept)
	}
}

// TestCheckNilClient 覆盖 nil 客户端回落为默认客户端。
func TestCheckNilClient(t *testing.T) {
	c := NewChecker("1.0.0")
	c.Client = nil
	c.APIURL = "http://127.0.0.1:1/nope"
	// nil 客户端应被替换为默认客户端，因此会走到网络错误分支而非 panic。
	st := c.Check()
	if st.CheckError == "" {
		t.Error("应记录网络错误（证明默认客户端已生效）")
	}
}

// roundTripFunc 让测试可以拦截任意请求。
type roundTripFunc func(*http.Request) (*http.Response, error)

// RoundTrip 实现 http.RoundTripper。
func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

// TestCheckEmptyAPIURLFallback 覆盖空 APIURL 时回落为官方地址。
func TestCheckEmptyAPIURLFallback(t *testing.T) {
	var gotURL string
	c := NewChecker("1.0.0")
	c.APIURL = ""
	c.Client = &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		gotURL = r.URL.String()
		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(strings.NewReader(`{"tag_name":"v1.0.0"}`)),
			Header:     http.Header{},
		}, nil
	})}

	c.Check()
	if gotURL != GitHubAPIURL {
		t.Errorf("请求地址 = %q，期望 %q", gotURL, GitHubAPIURL)
	}
}

// TestCheckIntervalConstant 覆盖检查间隔常量。
func TestCheckIntervalConstant(t *testing.T) {
	if CheckInterval.Hours() != 3 {
		t.Errorf("CheckInterval = %v，期望 3h", CheckInterval)
	}
}

// TestGitHubAPIURLShape 覆盖接口地址。
func TestGitHubAPIURLShape(t *testing.T) {
	if GitHubAPIURL != "https://api.github.com/repos/talebook/talebook/releases/latest" {
		t.Errorf("GitHubAPIURL = %q", GitHubAPIURL)
	}
}
