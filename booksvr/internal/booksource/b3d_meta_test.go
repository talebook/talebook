package booksource

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"sync"
	"testing"
	"time"

	"talebook/booksvr/internal/safehttp"
	"talebook/booksvr/internal/tornadosign"
)

// signRaw 用给定载荷生成 provider token，用于构造异常载荷。
func signRaw(t *testing.T, secret, payload string, now time.Time) string {
	t.Helper()
	return tornadosign.Sign(secret, TokenName, payload, now.Unix())
}

// newReadCloser 把字节切片包成 io.ReadCloser。
func newReadCloser(b []byte) io.ReadCloser {
	return io.NopCloser(bytes.NewReader(b))
}

// ---- save_service.go ----

// TestAssembleFromChapters 验证并发抓取、重试与顺序保持。
func TestAssembleFromChapters(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "out.txt")

	chapters := []Chapter{{Name: "第1章"}, {Name: "第2章"}, {Name: "第3章"}}
	attempts := map[string]int{}
	var mu sync.Mutex
	fetch := func(ctx context.Context, ch Chapter) (string, error) {
		mu.Lock()
		attempts[ch.Name]++
		n := attempts[ch.Name]
		mu.Unlock()
		if ch.Name == "第2章" && n == 1 {
			return "", errors.New("transient")
		}
		return "正文-" + ch.Name, nil
	}

	detail := &BookDetail{Name: "书", Author: "作者", Intro: "简介"}
	got, err := AssembleFromChapters(context.Background(), detail, chapters, fetch, path,
		AssembleOptions{MaxWorkers: 3, MaxRetries: 2})
	if err != nil {
		t.Fatalf("AssembleFromChapters: %v", err)
	}
	if got != path {
		t.Errorf("返回路径 = %q, want %q", got, path)
	}
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile: %v", err)
	}
	text := string(content)
	for _, want := range []string{"书", "作者：作者", "简介", "第1章", "正文-第1章", "正文-第2章", "正文-第3章"} {
		if !strings.Contains(text, want) {
			t.Errorf("输出缺少 %q\n%s", want, text)
		}
	}
	if attempts["第2章"] != 2 {
		t.Errorf("第2章尝试次数 = %d, want 2", attempts["第2章"])
	}
}

// TestAssembleFromChaptersNoChapters 验证空目录报错。
func TestAssembleFromChaptersNoChapters(t *testing.T) {
	_, err := AssembleFromChapters(context.Background(), &BookDetail{}, nil,
		func(context.Context, Chapter) (string, error) { return "x", nil },
		filepath.Join(t.TempDir(), "o.txt"), AssembleOptions{})
	if err == nil {
		t.Fatal("空目录应报错")
	}
	if !strings.Contains(err.Error(), "未能解析到任何章节") {
		t.Errorf("错误信息 = %q", err.Error())
	}
}

// TestAssembleFromChaptersAllFail 验证全部失败时报错且不写文件。
func TestAssembleFromChaptersAllFail(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "o.txt")
	chapters := []Chapter{{Name: "a"}, {Name: "b"}}
	_, err := AssembleFromChapters(context.Background(), &BookDetail{}, chapters,
		func(context.Context, Chapter) (string, error) { return "", errors.New("boom") },
		path, AssembleOptions{MaxWorkers: 2, MaxRetries: 1})
	if err == nil {
		t.Fatal("全部失败应报错")
	}
	if !strings.Contains(err.Error(), "所有章节下载失败") {
		t.Errorf("错误信息 = %q", err.Error())
	}
	if _, statErr := os.Stat(path); !os.IsNotExist(statErr) {
		t.Error("全部失败不应写出文件")
	}
}

// TestAssembleFromChaptersBlankBody 验证空白正文算失败。
func TestAssembleFromChaptersBlankBody(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "o.txt")
	chapters := []Chapter{{Name: "a"}}
	_, err := AssembleFromChapters(context.Background(), &BookDetail{}, chapters,
		func(context.Context, Chapter) (string, error) { return "   \n  ", nil },
		path, AssembleOptions{MaxWorkers: 1, MaxRetries: 0})
	if err == nil {
		t.Fatal("空白正文应算失败")
	}
}

// TestAssembleFromChaptersPartial 验证部分失败仍写出（空白占位）。
func TestAssembleFromChaptersPartial(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "o.txt")
	chapters := []Chapter{{Name: "a"}, {Name: "b"}}
	fetch := func(ctx context.Context, ch Chapter) (string, error) {
		if ch.Name == "b" {
			return "", errors.New("boom")
		}
		return "正文A", nil
	}
	_, err := AssembleFromChapters(context.Background(), &BookDetail{Name: "N"}, chapters,
		fetch, path, AssembleOptions{MaxWorkers: 2, MaxRetries: 0})
	if err != nil {
		t.Fatalf("部分失败不应报错: %v", err)
	}
	content, _ := os.ReadFile(path)
	if !strings.Contains(string(content), "正文A") {
		t.Errorf("应保留成功章节\n%s", content)
	}
}

// TestAssembleFromChaptersProgress 验证进度回调。
func TestAssembleFromChaptersProgress(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "o.txt")
	chapters := make([]Chapter, 25)
	for i := range chapters {
		chapters[i] = Chapter{Name: "c"}
	}
	var mu sync.Mutex
	var calls [][2]int
	_, err := AssembleFromChapters(context.Background(), &BookDetail{}, chapters,
		func(context.Context, Chapter) (string, error) { return "x", nil },
		path, AssembleOptions{
			MaxWorkers: 4, MaxRetries: 0,
			Progress: func(done, total int) {
				mu.Lock()
				calls = append(calls, [2]int{done, total})
				mu.Unlock()
			},
		})
	if err != nil {
		t.Fatalf("= %v", err)
	}
	if len(calls) == 0 {
		t.Fatal("应至少回调一次")
	}
	last := calls[len(calls)-1]
	if last[0] != 25 || last[1] != 25 {
		t.Errorf("最后一次回调 = %v, want [25 25]", last)
	}
}

// TestAssembleFromChaptersClampsWorkers 验证并发与重试参数被夹紧。
func TestAssembleFromChaptersClampsWorkers(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "o.txt")
	chapters := []Chapter{{Name: "a"}}
	_, err := AssembleFromChapters(context.Background(), &BookDetail{}, chapters,
		func(context.Context, Chapter) (string, error) { return "x", nil },
		path, AssembleOptions{MaxWorkers: 0, MaxRetries: -5})
	if err != nil {
		t.Fatalf("= %v", err)
	}
}

// TestAssembleFromChaptersNilDetail 验证详情为 nil 时仍可写出。
func TestAssembleFromChaptersNilDetail(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "o.txt")
	chapters := []Chapter{{Name: "a"}}
	_, err := AssembleFromChapters(context.Background(), nil, chapters,
		func(context.Context, Chapter) (string, error) { return "x", nil },
		path, AssembleOptions{MaxWorkers: 1})
	if err != nil {
		t.Fatalf("= %v", err)
	}
	content, _ := os.ReadFile(path)
	if !strings.Contains(string(content), "佚名") {
		t.Errorf("nil 详情应用「佚名」\n%s", content)
	}
}

// TestTxtFilename 验证文件名格式。
func TestTxtFilename(t *testing.T) {
	now := time.Unix(1700000000, 0)
	got := TxtFilename("书名/带斜杠", now)
	if got != "书名_带斜杠-1700000000.txt" {
		t.Errorf("= %q", got)
	}
}

// TestClampChapters 验证章节截断。
func TestClampChapters(t *testing.T) {
	chapters := []Chapter{{Name: "a"}, {Name: "b"}, {Name: "c"}}
	if got := ClampChapters(chapters, 2); len(got) != 2 {
		t.Errorf("len = %d, want 2", len(got))
	}
	if got := ClampChapters(chapters, 0); len(got) != 3 {
		t.Errorf("上限 0 不截断, len = %d", len(got))
	}
	if got := ClampChapters(chapters, 10); len(got) != 3 {
		t.Errorf("上限大于长度不截断, len = %d", len(got))
	}
}

// TestBookDetailAuthors 验证作者列表。
func TestBookDetailAuthors(t *testing.T) {
	if got := (&BookDetail{Author: "A"}).Authors(); !reflect.DeepEqual(got, []string{"A"}) {
		t.Errorf("= %#v", got)
	}
	if got := (&BookDetail{}).Authors(); got != nil {
		t.Errorf("空作者 = %#v, want nil", got)
	}
	var nilDetail *BookDetail
	if got := nilDetail.Authors(); got != nil {
		t.Errorf("nil 详情 = %#v, want nil", got)
	}
}

// ---- metadata.go ----

// TestLoadBuiltinSources 验证内置书源加载。
func TestLoadBuiltinSources(t *testing.T) {
	items := []map[string]any{
		{"snapshotId": "s1", "bookSourceName": "N1"},
		{"snapshotId": "s2"},
	}
	got := LoadBuiltinSources(items)
	if len(got) != 2 {
		t.Fatalf("len = %d, want 2", len(got))
	}
	if got[0].Key != "builtin:s1" || got[0].Name != "N1" {
		t.Errorf("第一项 = %+v", got[0])
	}
	if got[1].Name != "s2" {
		t.Errorf("第二项 name = %q, want %q", got[1].Name, "s2")
	}
}

// TestParseBuiltinSources 验证内置书源 JSON 解析。
func TestParseBuiltinSources(t *testing.T) {
	got, err := ParseBuiltinSources([]byte(`[{"snapshotId":"a","bookSourceName":"A"}]`))
	if err != nil {
		t.Fatalf("= %v", err)
	}
	if len(got) != 1 || got[0].Key != "builtin:a" {
		t.Errorf("= %#v", got)
	}
	if _, err := ParseBuiltinSources([]byte(`{bad`)); err == nil {
		t.Error("坏 JSON 应报错")
	}
}

// TestCollectMetadataSources 验证数据库书源收集与深拷贝。
func TestCollectMetadataSources(t *testing.T) {
	raw := map[string]any{"a": 1, "nested": map[string]any{"b": 2}}
	rows := []SourceRow{{ID: 7, Name: "N", Raw: raw}}
	got := CollectMetadataSources(rows)
	if len(got) != 1 || got[0].Key != "db:7" || got[0].Name != "N" {
		t.Fatalf("= %#v", got)
	}
	raw["a"] = 99
	if got[0].Raw["a"] != 1 {
		t.Error("应深拷贝，原 map 修改不应影响结果")
	}
	nested := got[0].Raw["nested"].(map[string]any)
	nested["b"] = 99
	if raw["nested"].(map[string]any)["b"] != 2 {
		t.Error("嵌套 map 也应深拷贝")
	}
}

// TestEncodeDecodeProviderValue 验证 provider token 往返。
func TestEncodeDecodeProviderValue(t *testing.T) {
	now := time.Unix(1700000000, 0)
	token, err := EncodeProviderValue("secret", "db:1", "https://ex.com/b/1", now)
	if err != nil {
		t.Fatalf("Encode: %v", err)
	}
	payload := DecodeProviderValue("secret", token, 3600, now)
	if payload == nil {
		t.Fatal("Decode 返回 nil")
	}
	if payload["source"] != "db:1" || payload["book_url"] != "https://ex.com/b/1" {
		t.Errorf("payload = %#v", payload)
	}

	if got := DecodeProviderValue("other", token, 3600, now); got != nil {
		t.Errorf("错误密钥应返回 nil, got %#v", got)
	}
	if got := DecodeProviderValue("secret", token, 10, now.Add(11*time.Second)); got != nil {
		t.Errorf("超时应返回 nil, got %#v", got)
	}
	if got := DecodeProviderValue("secret", token, 3600, now.Add(-61*time.Second)); got != nil {
		t.Errorf("时间倒流应返回 nil, got %#v", got)
	}
	if got := DecodeProviderValue("secret", "", 3600, now); got != nil {
		t.Errorf("空 token 应返回 nil, got %#v", got)
	}
}

// TestDecodeProviderValueBadPayload 验证载荷异常时返回 nil。
func TestDecodeProviderValueBadPayload(t *testing.T) {
	now := time.Unix(1700000000, 0)

	token, _ := EncodeProviderValue("s", "db:1", "ftp://x/y", now)
	if got := DecodeProviderValue("s", token, 3600, now); got != nil {
		t.Errorf("非 http URL 应返回 nil, got %#v", got)
	}

	token, _ = EncodeProviderValue("s", "", "https://x/y", now)
	if got := DecodeProviderValue("s", token, 3600, now); got != nil {
		t.Errorf("空 source 应返回 nil, got %#v", got)
	}

	bad, _ := json.Marshal(map[string]any{"v": 2, "source": "db:1",
		"book_url": "https://x/y", "issued_at": now.Unix()})
	if got := DecodeProviderValue("s", signRaw(t, "s", string(bad), now), 3600, now); got != nil {
		t.Errorf("版本不符应返回 nil, got %#v", got)
	}

	bad, _ = json.Marshal(map[string]any{"v": 1, "source": "db:1", "book_url": "https://x/y"})
	if got := DecodeProviderValue("s", signRaw(t, "s", string(bad), now), 3600, now); got != nil {
		t.Errorf("缺 issued_at 应返回 nil, got %#v", got)
	}

	if got := DecodeProviderValue("s", signRaw(t, "s", "not json", now), 3600, now); got != nil {
		t.Errorf("非 JSON 应返回 nil, got %#v", got)
	}
}

// TestIsHTTPURL 验证 URL 判定与 `,{` 截断。
func TestIsHTTPURL(t *testing.T) {
	cases := []struct {
		in   string
		want bool
	}{
		{"https://a/b", true},
		{"http://a/b", true},
		{`https://a/b,{"method":"POST"}`, true},
		{"ftp://a/b", false},
		{"https://", false},
		{"/rel", false},
		{"", false},
	}
	for _, tc := range cases {
		if got := IsHTTPURL(tc.in); got != tc.want {
			t.Errorf("IsHTTPURL(%q) = %v, want %v", tc.in, got, tc.want)
		}
	}
}

// TestSplitTags 验证标签切分（中英文逗号、换行，最多 8 个）。
func TestSplitTags(t *testing.T) {
	if got := splitTags("a,b，c\nd"); !reflect.DeepEqual(got, []string{"a", "b", "c", "d"}) {
		t.Errorf("= %#v", got)
	}
	if got := splitTags(""); len(got) != 0 {
		t.Errorf("空 = %#v", got)
	}
	if got := splitTags("1,2,3,4,5,6,7,8,9,10"); len(got) != 8 {
		t.Errorf("应截断到 8 个, got %d", len(got))
	}
}

// TestAuthorMatches 验证作者包含式匹配。
func TestAuthorMatches(t *testing.T) {
	cases := []struct {
		expected, actual string
		want             bool
	}{
		{"张三", "张三", true},
		{"张三", "张三 李四", true},
		{"张三 李四", "张三", true},
		{"张三", "李四", false},
		{"", "李四", true},
		{"张三", "", true},
		{"Zhang San", "zhangsan", true},
	}
	for _, tc := range cases {
		if got := authorMatches(tc.expected, tc.actual); got != tc.want {
			t.Errorf("authorMatches(%q, %q) = %v, want %v", tc.expected, tc.actual, got, tc.want)
		}
	}
}

// TestCoverExtension 验证封面扩展名白名单。
func TestCoverExtension(t *testing.T) {
	cases := []struct{ in, want string }{
		{"https://a/b.jpg", "jpg"},
		{"https://a/b.JPEG", "jpeg"},
		{"https://a/b.png", "png"},
		{"https://a/b.gif", "gif"},
		{"https://a/b.webp", "webp"},
		{"https://a/b.bmp", "jpg"},
		{"https://a/b", "jpg"},
		{"https://a/b.jpg?x=1", "jpg"},
	}
	for _, tc := range cases {
		if got := coverExtension(tc.in); got != tc.want {
			t.Errorf("coverExtension(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

// TestMetadataToEvidence 验证证据字典。
func TestMetadataToEvidence(t *testing.T) {
	md := &Metadata{Source: "S", Title: "T", Authors: []string{"A"},
		Comments: "C", Tags: []string{"g"}, Website: "W", CoverURL: "U"}
	got := MetadataToEvidence(md)
	want := map[string]any{
		"source": "S", "title": "T", "authors": []string{"A"},
		"summary": "C", "tags": []string{"g"}, "website": "W", "cover_url": "U",
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("= %#v, want %#v", got, want)
	}
	got = MetadataToEvidence(nil)
	if got["source"] != "" || got["title"] != "" {
		t.Errorf("nil = %#v", got)
	}
}

// TestResolveSource 验证书源解析。
func TestResolveSource(t *testing.T) {
	builtins := []MetadataSource{{Key: "builtin:a", Name: "A", Raw: map[string]any{"x": 1}}}
	lookup := func(id int64) (SourceRow, bool) {
		if id == 7 {
			return SourceRow{ID: 7, Name: "DB7", Raw: map[string]any{"y": 2}}, true
		}
		return SourceRow{}, false
	}

	if got, ok := ResolveSource("db:7", lookup, builtins); !ok || got.Name != "DB7" {
		t.Errorf("db:7 = %+v, %v", got, ok)
	}
	if _, ok := ResolveSource("db:99", lookup, builtins); ok {
		t.Error("不存在的 db id 应返回 false")
	}
	if _, ok := ResolveSource("db:abc", lookup, builtins); ok {
		t.Error("非法 db id 应返回 false")
	}
	if got, ok := ResolveSource("builtin:a", lookup, builtins); !ok || got.Name != "A" {
		t.Errorf("builtin:a = %+v, %v", got, ok)
	}
	if _, ok := ResolveSource("builtin:zzz", lookup, builtins); ok {
		t.Error("不存在的内置 key 应返回 false")
	}
}

// TestMetadataSearchNoSources 验证无书源时的失败项。
func TestMetadataSearchNoSources(t *testing.T) {
	svc := &BookSourceMetadataService{Config: DefaultMetadataConfig()}
	got := svc.Search(context.Background(), "T", "")
	if len(got.Books) != 0 || len(got.Failures) != 1 {
		t.Fatalf("= %#v", got)
	}
	if got.Failures[0]["code"] != "no_source" {
		t.Errorf("code = %q", got.Failures[0]["code"])
	}
}

// TestMetadataSearchAggregates 验证多源聚合与失败分类。
func TestMetadataSearchAggregates(t *testing.T) {
	okSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`<html><body>
<div class="item"><h3>命中</h3><span class="au">作者</span><a href="/b/1">x</a></div>
</body></html>`))
	}))
	defer okSrv.Close()

	emptySrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`<html><body></body></html>`))
	}))
	defer emptySrv.Close()

	badSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "boom", http.StatusInternalServerError)
	}))
	defer badSrv.Close()

	mkRaw := func(base string) map[string]any {
		return map[string]any{
			"bookSourceUrl": base, "bookSourceName": "S",
			"searchUrl": "/s?q={{key}}",
			"ruleSearch": map[string]any{
				"bookList": "@css:div.item", "name": "@css:h3@text",
				"author": "@css:span.au@text", "bookUrl": "@css:a@href",
			},
		}
	}

	svc := &BookSourceMetadataService{
		Sources: []MetadataSource{
			{Key: "db:1", Name: "OK", Raw: mkRaw(okSrv.URL)},
			{Key: "db:2", Name: "EMPTY", Raw: mkRaw(emptySrv.URL)},
			{Key: "db:3", Name: "BAD", Raw: mkRaw(badSrv.URL)},
		},
		Secret: "s",
		Config: DefaultMetadataConfig(),
	}
	got := svc.Search(context.Background(), "T", "")
	if len(got.Books) != 1 || got.Books[0].Title != "命中" {
		t.Fatalf("books = %#v", got.Books)
	}
	if got.Books[0].ProviderKey != Key {
		t.Errorf("providerKey = %q", got.Books[0].ProviderKey)
	}
	if got.Books[0].ProviderValue == "" {
		t.Error("providerValue 不应为空")
	}
	if len(got.Failures) != 2 {
		t.Fatalf("failures = %#v", got.Failures)
	}
	codes := map[string]bool{}
	for _, f := range got.Failures {
		codes[f["code"]] = true
	}
	if !codes["no_result"] || !codes["fetch_failed"] {
		t.Errorf("失败码 = %#v", codes)
	}
}

// TestMetadataSearchAuthorFilter 验证作者过滤。
func TestMetadataSearchAuthorFilter(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`<html><body>
<div class="item"><h3>N1</h3><span class="au">张三</span><a href="/b/1">x</a></div>
<div class="item"><h3>N2</h3><span class="au">李四</span><a href="/b/2">x</a></div>
</body></html>`))
	}))
	defer srv.Close()

	svc := &BookSourceMetadataService{
		Sources: []MetadataSource{{Key: "db:1", Name: "S", Raw: map[string]any{
			"bookSourceUrl": srv.URL, "bookSourceName": "S", "searchUrl": "/s?q={{key}}",
			"ruleSearch": map[string]any{
				"bookList": "@css:div.item", "name": "@css:h3@text",
				"author": "@css:span.au@text", "bookUrl": "@css:a@href",
			},
		}}},
		Secret: "s",
		Config: DefaultMetadataConfig(),
	}
	got := svc.Search(context.Background(), "T", "张三")
	if len(got.Books) != 1 || got.Books[0].Title != "N1" {
		t.Errorf("books = %#v", got.Books)
	}
}

// TestMetadataSearchLimit 验证结果数上限。
func TestMetadataSearchLimit(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var sb strings.Builder
		sb.WriteString("<html><body>")
		for i := 0; i < 10; i++ {
			sb.WriteString(`<div class="item"><h3>N</h3><a href="/b/1">x</a></div>`)
		}
		sb.WriteString("</body></html>")
		_, _ = w.Write([]byte(sb.String()))
	}))
	defer srv.Close()

	cfg := DefaultMetadataConfig()
	cfg.SearchLimit = 3
	svc := &BookSourceMetadataService{
		Sources: []MetadataSource{{Key: "db:1", Name: "S", Raw: map[string]any{
			"bookSourceUrl": srv.URL, "bookSourceName": "S", "searchUrl": "/s?q={{key}}",
			"ruleSearch": map[string]any{
				"bookList": "@css:div.item", "name": "@css:h3@text", "bookUrl": "@css:a@href",
			},
		}}},
		Secret: "s",
		Config: cfg,
	}
	got := svc.Search(context.Background(), "T", "")
	if len(got.Books) != 3 {
		t.Errorf("len = %d, want 3", len(got.Books))
	}
}

// TestMetadataApply 验证 token 回填详情。
func TestMetadataApply(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, ".jpg") {
			w.Header().Set("Content-Type", "image/jpeg")
			_, _ = w.Write([]byte{0xFF, 0xD8, 0xFF, 0xE0})
			return
		}
		_, _ = w.Write([]byte(`<html><body>
<h1>书名</h1><span class="au">作者</span><span class="k">玄幻,都市</span>
<img class="cv" src="/c.jpg"/><p class="in">简介</p></body></html>`))
	}))
	defer srv.Close()

	raw := map[string]any{
		"bookSourceUrl": srv.URL, "bookSourceName": "S",
		"ruleBookInfo": map[string]any{
			"name": "@css:h1@text", "author": "@css:span.au@text",
			"kind": "@css:span.k@text", "coverUrl": "@css:img.cv@src",
			"intro": "@css:p.in@text",
		},
	}
	svc := &BookSourceMetadataService{
		Sources: []MetadataSource{{Key: "db:1", Name: "S", Raw: raw}},
		Secret:  "s",
		Config:  DefaultMetadataConfig(),
	}
	token, err := EncodeProviderValue("s", "db:1", srv.URL+"/b/1", time.Now())
	if err != nil {
		t.Fatalf("Encode: %v", err)
	}
	resolve := func(key string) (MetadataSource, bool) {
		if key == "db:1" {
			return MetadataSource{Key: "db:1", Name: "S", Raw: raw}, true
		}
		return MetadataSource{}, false
	}
	md, err := svc.Apply(context.Background(), token, resolve, true)
	if err != nil {
		t.Fatalf("Apply: %v", err)
	}
	if md == nil {
		t.Fatal("Apply 返回 nil")
	}
	if md.Title != "书名" || md.Authors[0] != "作者" {
		t.Errorf("md = %+v", md)
	}
	if !reflect.DeepEqual(md.Tags, []string{"玄幻", "都市"}) {
		t.Errorf("tags = %#v", md.Tags)
	}
	if md.CoverData == nil || md.CoverData.Extension != "jpg" {
		t.Errorf("coverData = %#v", md.CoverData)
	}
	if md.ProviderValue != token {
		t.Error("providerValue 应保留原 token")
	}
}

// TestMetadataApplyBadToken 验证坏 token 返回 nil。
func TestMetadataApplyBadToken(t *testing.T) {
	svc := &BookSourceMetadataService{Secret: "s", Config: DefaultMetadataConfig()}
	resolve := func(string) (MetadataSource, bool) { return MetadataSource{}, false }
	md, err := svc.Apply(context.Background(), "badtoken", resolve, false)
	if err != nil || md != nil {
		t.Errorf("= %#v, %v", md, err)
	}
}

// TestMetadataApplyUnknownSource 验证未知书源返回 nil。
func TestMetadataApplyUnknownSource(t *testing.T) {
	svc := &BookSourceMetadataService{Secret: "s", Config: DefaultMetadataConfig()}
	token, _ := EncodeProviderValue("s", "db:99", "https://x/b", time.Now())
	resolve := func(string) (MetadataSource, bool) { return MetadataSource{}, false }
	md, err := svc.Apply(context.Background(), token, resolve, false)
	if err != nil || md != nil {
		t.Errorf("= %#v, %v", md, err)
	}
}

// TestMetadataApplyEmptyName 验证详情无书名时返回 nil。
func TestMetadataApplyEmptyName(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`<html><body></body></html>`))
	}))
	defer srv.Close()

	raw := map[string]any{"bookSourceUrl": srv.URL, "bookSourceName": "S",
		"ruleBookInfo": map[string]any{"name": "@css:h1@text"}}
	svc := &BookSourceMetadataService{Secret: "s", Config: DefaultMetadataConfig()}
	token, _ := EncodeProviderValue("s", "db:1", srv.URL+"/b/1", time.Now())
	resolve := func(string) (MetadataSource, bool) {
		return MetadataSource{Key: "db:1", Name: "S", Raw: raw}, true
	}
	md, err := svc.Apply(context.Background(), token, resolve, false)
	if err != nil || md != nil {
		t.Errorf("= %#v, %v", md, err)
	}
}

// TestMetadataDownloadCover 验证封面下载与扩展名回落。
func TestMetadataDownloadCover(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/ok.jpg":
			_, _ = w.Write([]byte{1, 2, 3})
		case "/weird.bmp":
			_, _ = w.Write([]byte{4, 5, 6})
		case "/empty.png":
			// 空响应体。
		default:
			http.Error(w, "boom", http.StatusInternalServerError)
		}
	}))
	defer srv.Close()

	svc := &BookSourceMetadataService{Config: DefaultMetadataConfig()}
	engine := &BookSourceEngine{Client: &safehttp.SafeHttpClient{}}

	if got := svc.downloadCover(context.Background(), engine, srv.URL+"/ok.jpg"); got == nil ||
		got.Extension != "jpg" || len(got.Content) != 3 {
		t.Errorf("ok.jpg = %#v", got)
	}
	if got := svc.downloadCover(context.Background(), engine, srv.URL+"/weird.bmp"); got == nil ||
		got.Extension != "jpg" {
		t.Errorf("weird.bmp 应回落 jpg, got %#v", got)
	}
	if got := svc.downloadCover(context.Background(), engine, srv.URL+"/empty.png"); got != nil {
		t.Errorf("空响应应返回 nil, got %#v", got)
	}
	if got := svc.downloadCover(context.Background(), engine, srv.URL+"/err.jpg"); got != nil {
		t.Errorf("500 应返回 nil, got %#v", got)
	}
	if got := svc.downloadCover(context.Background(), engine, "ftp://x/y.jpg"); got != nil {
		t.Errorf("非 http 应返回 nil, got %#v", got)
	}
	if got := svc.downloadCover(context.Background(), &BookSourceEngine{}, srv.URL+"/ok.jpg"); got != nil {
		t.Errorf("无 client 应返回 nil, got %#v", got)
	}
}

// ---- http_client.go ----

// TestBuildHeaders 验证默认头 + 书源头 + Referer 兜底。
func TestBuildHeaders(t *testing.T) {
	bs := mustBookSource(t, bsVectorRaw())
	got := BuildHeaders(bs)
	if got["User-Agent"] != DefaultUserAgent {
		t.Errorf("User-Agent = %q", got["User-Agent"])
	}
	if got["H"] != "1" {
		t.Errorf("书源头 H = %q", got["H"])
	}
	if got["Referer"] != "https://ex.com" {
		t.Errorf("Referer = %q", got["Referer"])
	}

	raw := bsVectorRaw()
	raw["header"] = map[string]any{"Referer": "https://mine/"}
	got = BuildHeaders(mustBookSource(t, raw))
	if got["Referer"] != "https://mine/" {
		t.Errorf("显式 Referer 被覆盖: %q", got["Referer"])
	}

	got = BuildHeaders(nil)
	if got["User-Agent"] != DefaultUserAgent || len(got) != len(DefaultHeaders) {
		t.Errorf("nil 书源 = %#v", got)
	}
}

// TestDetectCharset 验证编码检测。
func TestDetectCharset(t *testing.T) {
	if got := DetectCharset(nil); got != "utf-8" {
		t.Errorf("空内容 = %q, want utf-8", got)
	}
	if got := DetectCharset([]byte("hello")); got == "" {
		t.Error("非空内容不应返回空编码")
	}
	gbk := append([]byte(`<html><head><meta charset="gbk"></head><body>`), 0xD6, 0xD0, 0xCE, 0xC4)
	got := DetectCharset(gbk)
	if !strings.EqualFold(got, "gbk") && !strings.EqualFold(got, "gb18030") {
		t.Errorf("GBK 页面 = %q", got)
	}
}

// TestDecodeResponse 验证按声明编码解码。
func TestDecodeResponse(t *testing.T) {
	gbkBytes := []byte{0xD6, 0xD0, 0xCE, 0xC4}
	resp := &http.Response{Body: newReadCloser(gbkBytes), Header: http.Header{}}
	got, err := DecodeResponse(resp, "gbk")
	if err != nil {
		t.Fatalf("DecodeResponse: %v", err)
	}
	if got != "中文" {
		t.Errorf("= %q, want %q", got, "中文")
	}

	resp2 := &http.Response{Body: newReadCloser([]byte("plain ascii")), Header: http.Header{}}
	got, err = DecodeResponse(resp2, "")
	if err != nil {
		t.Fatalf("DecodeResponse: %v", err)
	}
	if got != "plain ascii" {
		t.Errorf("= %q", got)
	}
}

// TestDecodeWithUnknownEncoding 验证未知编码回落。
func TestDecodeWithUnknownEncoding(t *testing.T) {
	if got := decodeWith([]byte("abc"), "no-such-encoding"); got != "abc" {
		t.Errorf("= %q, want %q", got, "abc")
	}
	if got := decodeWith(nil, "utf-8"); got != "" {
		t.Errorf("nil = %q, want 空", got)
	}
}

// ---- util.go ----

// TestSecondsToDuration 验证秒转 Duration。
func TestSecondsToDuration(t *testing.T) {
	if got := secondsToDuration(2.5); got != 2500*time.Millisecond {
		t.Errorf("= %v", got)
	}
	if got := secondsToDuration(0); got != 0 {
		t.Errorf("0 = %v", got)
	}
	if got := secondsToDuration(-1); got != 0 {
		t.Errorf("负数 = %v, want 0", got)
	}
}

// TestItoa 验证整数转字符串。
func TestItoa(t *testing.T) {
	if got := itoa(0); got != "0" {
		t.Errorf("= %q", got)
	}
	if got := itoa(-12); got != "-12" {
		t.Errorf("= %q", got)
	}
	if got := itoa(345); got != "345" {
		t.Errorf("= %q", got)
	}
}

// TestItoa64 验证 int64 转字符串。
func TestItoa64(t *testing.T) {
	cases := []struct {
		in   int64
		want string
	}{
		{0, "0"}, {7, "7"}, {-7, "-7"}, {9223372036854775807, "9223372036854775807"},
	}
	for _, tc := range cases {
		if got := itoa64(tc.in); got != tc.want {
			t.Errorf("itoa64(%d) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

// TestToInt64 验证 JSON 数字转换。
func TestToInt64(t *testing.T) {
	if v, ok := toInt64(float64(5)); !ok || v != 5 {
		t.Errorf("float64 = %v, %v", v, ok)
	}
	if v, ok := toInt64(json.Number("9")); !ok || v != 9 {
		t.Errorf("json.Number = %v, %v", v, ok)
	}
	if _, ok := toInt64("str"); ok {
		t.Error("字符串应返回 false")
	}
}

// TestParseIntStrict 验证严格整数解析。
func TestParseIntStrict(t *testing.T) {
	cases := []struct {
		in   string
		want int
		ok   bool
	}{
		{"1", 1, true}, {"-3", -3, true}, {"+4", 4, true},
		{" 5 ", 5, true}, {"", 0, false}, {"abc", 0, false},
		{"1.5", 0, false}, {"-", 0, false},
	}
	for _, tc := range cases {
		got, ok := parseIntStrict(tc.in)
		if got != tc.want || ok != tc.ok {
			t.Errorf("parseIntStrict(%q) = %d, %v; want %d, %v", tc.in, got, ok, tc.want, tc.ok)
		}
	}
}

// TestDeepCopyMap 验证深拷贝。
func TestDeepCopyMap(t *testing.T) {
	if got := deepCopyMap(nil); got != nil {
		t.Errorf("nil = %#v", got)
	}
	src := map[string]any{"a": 1, "l": []any{map[string]any{"b": 2}}}
	cp := deepCopyMap(src)
	cp["a"] = 9
	cp["l"].([]any)[0].(map[string]any)["b"] = 9
	if src["a"] != 1 || src["l"].([]any)[0].(map[string]any)["b"] != 2 {
		t.Error("深拷贝不应影响原值")
	}
}

// TestReadLimited 验证读取上限。
func TestReadLimited(t *testing.T) {
	got, err := readLimited(strings.NewReader("abcdef"), 3)
	if err != nil || string(got) != "abc" {
		t.Errorf("= %q, %v", got, err)
	}
	got, err = readLimited(strings.NewReader("ab"), 0)
	if err != nil || string(got) != "ab" {
		t.Errorf("无上限 = %q, %v", got, err)
	}
}

// TestRequestOptionsForCover 验证封面请求选项。
func TestRequestOptionsForCover(t *testing.T) {
	got := requestOptionsForCover(10)
	if !got.HasTimeout || got.Timeout != 10*time.Second {
		t.Errorf("= %+v", got)
	}
}

// TestHTTPStatusOK 验证状态码判定。
func TestHTTPStatusOK(t *testing.T) {
	if httpStatusOK(nil) {
		t.Error("nil 应为 false")
	}
	if !httpStatusOK(&http.Response{StatusCode: 200}) {
		t.Error("200 应为 true")
	}
	if httpStatusOK(&http.Response{StatusCode: 500}) {
		t.Error("500 应为 false")
	}
}
