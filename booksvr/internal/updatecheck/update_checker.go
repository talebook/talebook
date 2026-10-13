package updatecheck

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

// GitHubRepo 是被检查的仓库。
const GitHubRepo = "talebook/talebook"

// GitHubAPIURL 是 GitHub 最新 release 接口。
const GitHubAPIURL = "https://api.github.com/repos/" + GitHubRepo + "/releases/latest"

// CheckInterval 是后台检查间隔（3 小时）。
const CheckInterval = 3 * time.Hour

// Status 是一次更新检查的结果快照。
type Status struct {
	CurrentVersion string `json:"current_version"`
	LatestVersion  string `json:"latest_version"`
	ReleaseURL     string `json:"release_url"`
	ReleaseName    string `json:"release_name"`
	ReleaseBody    string `json:"release_body"`
	HasUpdate      bool   `json:"has_update"`
	LastCheckTime  int64  `json:"last_check_time"`
	CheckError     string `json:"check_error"`
}

// releaseResponse 是 GitHub release 接口的响应子集。
type releaseResponse struct {
	TagName string `json:"tag_name"`
	HTMLURL string `json:"html_url"`
	Name    string `json:"name"`
	Body    string `json:"body"`
}

// Checker 复刻 Python UpdateChecker。
type Checker struct {
	// CurrentVersion 是当前站点版本。
	CurrentVersion string
	// Client 用于请求 GitHub；为 nil 时用默认客户端。
	Client *http.Client
	// APIURL 可覆盖接口地址（测试用）。
	APIURL string

	mu     sync.Mutex
	status Status
}

// NewChecker 构造更新检查器。
func NewChecker(currentVersion string) *Checker {
	return &Checker{
		CurrentVersion: currentVersion,
		Client:         &http.Client{Timeout: 10 * time.Second},
		APIURL:         GitHubAPIURL,
		status:         Status{CurrentVersion: currentVersion},
	}
}

// Status 返回最近一次检查结果。
func (c *Checker) Status() Status {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.status
}

// Check 复刻 check_for_updates：请求 GitHub 并更新状态。
func (c *Checker) Check() Status {
	c.mu.Lock()
	defer c.mu.Unlock()

	client := c.Client
	if client == nil {
		client = &http.Client{Timeout: 10 * time.Second}
	}
	apiURL := c.APIURL
	if apiURL == "" {
		apiURL = GitHubAPIURL
	}

	req, err := http.NewRequest(http.MethodGet, apiURL, nil)
	if err != nil {
		c.status.CheckError = fmt.Sprintf("Unknown error: %v", err)
		return c.status
	}
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "TaleBook-UpdateChecker")

	resp, err := client.Do(req)
	if err != nil {
		c.status.CheckError = fmt.Sprintf("Network error: %v", err)
		return c.status
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		c.status.CheckError = fmt.Sprintf("GitHub API error: %d %s",
			resp.StatusCode, http.StatusText(resp.StatusCode))
		return c.status
	}

	raw, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		c.status.CheckError = fmt.Sprintf("Network error: %v", err)
		return c.status
	}
	if strings.TrimSpace(string(raw)) == "" {
		c.status.CheckError = "GitHub API returned empty response (rate limited?)"
		return c.status
	}

	var rel releaseResponse
	if err := json.Unmarshal(raw, &rel); err != nil {
		c.status.CheckError = fmt.Sprintf("GitHub API returned invalid JSON: %v", err)
		return c.status
	}

	c.status.LatestVersion = ReleaseVersion(rel.TagName)
	c.status.ReleaseURL = rel.HTMLURL
	c.status.ReleaseName = rel.Name
	c.status.ReleaseBody = rel.Body
	c.status.LastCheckTime = time.Now().Unix()
	c.status.HasUpdate = HasNewerVersion(c.CurrentVersion, c.status.LatestVersion)
	c.status.CheckError = ""
	return c.status
}

// ---- 版本比较（复刻 Python 的 _normalize_version 等）----

// NormalizeVersion 复刻 _normalize_version：去空白并剥离前导 v/V。
func NormalizeVersion(version string) string {
	return strings.TrimLeft(strings.TrimSpace(version), "vV")
}

// versionNumRe 匹配版本号中的数字段。
var versionNumRe = regexp.MustCompile(`\d+`)

// VersionParts 复刻 _version_parts：提取全部数字段。
func VersionParts(version string) []int {
	matches := versionNumRe.FindAllString(NormalizeVersion(version), -1)
	out := make([]int, 0, len(matches))
	for _, m := range matches {
		n, err := strconv.Atoi(m)
		if err != nil {
			continue
		}
		out = append(out, n)
	}
	return out
}

// CompareVersions 复刻 _compare_versions：v2 > v1 时返回 true。
func CompareVersions(v1, v2 string) bool {
	n1 := NormalizeVersion(v1)
	n2 := NormalizeVersion(v2)
	if n1 == n2 {
		return false
	}

	p1 := VersionParts(n1)
	p2 := VersionParts(n2)
	if len(p1) == 0 || len(p2) == 0 {
		return n2 != n1
	}

	// 逐段比较，短的一方补 0。
	n := len(p1)
	if len(p2) > n {
		n = len(p2)
	}
	for i := 0; i < n; i++ {
		var a, b int
		if i < len(p1) {
			a = p1[i]
		}
		if i < len(p2) {
			b = p2[i]
		}
		if b > a {
			return true
		}
		if b < a {
			return false
		}
	}
	return false
}

// HasNewerVersion 复刻 _has_newer_version。
func HasNewerVersion(current, latest string) bool {
	return NormalizeVersion(latest) != "" && CompareVersions(current, latest)
}

// SameVersion 复刻 _same_version。
func SameVersion(v1, v2 string) bool {
	return NormalizeVersion(v1) == NormalizeVersion(v2)
}

// ReleaseVersion 复刻 _release_version。
func ReleaseVersion(tagName string) string {
	return NormalizeVersion(tagName)
}
