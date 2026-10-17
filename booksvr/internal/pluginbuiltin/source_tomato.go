package pluginbuiltin

import (
	"archive/zip"
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"time"

	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginproto"
	"talebook/booksvr/internal/safehttp"
	"talebook/booksvr/internal/sourcebase"
)

// 番茄下载器常量（复刻 tomato_downloader.py 顶部）。
const (
	tomatoDownloaderVersion = "2.4.15"
	tomatoMaxBookBytes      = 64 * 1024 * 1024
)

// tomatoReleaseHashes 复刻 RELEASE_HASHES。
var tomatoReleaseHashes = map[string]string{
	"x86_64":  "d9db872448e3cda78a18eaa3c7ee162ce631251ed51eb789f8e6676abe118722",
	"aarch64": "3df139fd891ebcf88c6c8b476c755b45e61b3c31075e0b465fc9d14c46800201",
}

// tomatoBookIDRe 复刻 book_id 的正则。
var tomatoBookIDRe = regexp.MustCompile(`^(?:https://fanqienovel\.com/page/)?([0-9]{10,25})/?$`)

// tomatoCaps 是番茄下载器的能力声明。
func tomatoCaps() pluginiface.CapabilitySet {
	return pluginiface.CapabilitySet{
		Interfaces:   map[string]bool{"SourceProvider": true},
		DownloadMode: pluginiface.DownloadSingleBook,
		HasSelfCheck: true,
		HasExecute:   true,
		Methods:      map[string]bool{"download": true},
	}
}

// TomatoDownloaderProvider 复刻 TomatoDownloaderProvider。
type TomatoDownloaderProvider struct {
	ManifestDict map[string]any
}

// newTomatoDownloaderProvider 构造番茄下载器 provider。
func newTomatoDownloaderProvider() *TomatoDownloaderProvider {
	properties := map[string]any{
		"binary_path": map[string]any{
			"type": "string", "title": "下载器绝对路径", "default": "/opt/tomato/downloader",
		},
		"output_format": map[string]any{
			"type": "string", "title": "下载格式", "enum": []any{"epub", "txt"}, "default": "epub",
		},
		"timeout_seconds": map[string]any{
			"type": "number", "title": "操作超时时间（秒）",
			"default": 600, "minimum": 5, "maximum": 3600,
		},
	}
	return &TomatoDownloaderProvider{ManifestDict: sourcebase.Manifest(
		"talebook.source.tomato-downloader", "番茄小说下载器",
		"搜索番茄小说或输入书籍 ID，下载完整 EPUB 或 TXT 到本地书库。需安装下载器，依赖上游在线服务。",
		[]string{"sources.search", "sources.acquire"},
		map[string]any{
			"type":       "object",
			"properties": properties,
			"required":   []any{"binary_path"},
		},
		sourcebase.ManifestOptions{
			Homepage:    "https://github.com/zhongbai2333/Tomato-Novel-Downloader",
			RuntimeKind: "file",
		})}
}

// Manifest 满足 pluginiface.Provider。
func (p *TomatoDownloaderProvider) Manifest() map[string]any { return p.ManifestDict }

// DownloadMode 满足 pluginiface.SourceProvider。
func (p *TomatoDownloaderProvider) DownloadMode() pluginiface.DownloadMode {
	return pluginiface.DownloadSingleBook
}

// CapabilitySet 报告能力声明。
func (p *TomatoDownloaderProvider) CapabilitySet() pluginiface.CapabilitySet { return tomatoCaps() }

// Invoke 实现 MethodDispatcher：全部委托 DispatchInvoke。
func (p *TomatoDownloaderProvider) Invoke(method string, args []any, context map[string]any) (any, error) {
	return DispatchInvoke(p, method, args, context)
}

// InitialConfig 复刻缺省行为：空配置。
func (p *TomatoDownloaderProvider) InitialConfig(settings map[string]any) map[string]any {
	return map[string]any{}
}

// tomatoOutputFormat 复刻 output_format。
func tomatoOutputFormat(context map[string]any) (string, error) {
	config, _ := context["config"].(map[string]any)
	value, _ := config["output_format"].(string)
	if value == "" {
		value = "epub"
	}
	if value != "epub" && value != "txt" {
		return "", pluginproto.NewUpstreamError("番茄下载格式仅支持 EPUB 或 TXT", "other", nil)
	}
	return value, nil
}

// tomatoBookID 复刻 book_id。
func tomatoBookID(value any) (string, error) {
	raw, _ := value.(string)
	raw = strings.TrimSpace(raw)
	m := tomatoBookIDRe.FindStringSubmatch(raw)
	if m == nil {
		return "", pluginproto.NewUpstreamError(
			"请输入番茄书籍 ID 或 https://fanqienovel.com/page/书籍ID", "other", nil)
	}
	return m[1], nil
}

// tomatoValidateEpub 复刻 validate_epub：不落盘校验归档与阅读顺序。
func tomatoValidateEpub(content []byte) error {
	archive, err := zip.NewReader(bytes.NewReader(content), int64(len(content)))
	if err != nil {
		return pluginproto.NewUpstreamError("番茄 EPUB 文件损坏或阅读目录不完整，未入库", "other", nil)
	}
	names := map[string]bool{}
	var totalSize uint64
	for _, entry := range archive.File {
		if names[entry.Name] {
			return pluginproto.NewUpstreamError("番茄 EPUB 文件损坏或阅读目录不完整，未入库", "other", nil)
		}
		names[entry.Name] = true
		totalSize += entry.UncompressedSize64
	}
	if len(names) != len(archive.File) || totalSize > tomatoMaxBookBytes*4 {
		return pluginproto.NewUpstreamError("番茄 EPUB 文件损坏或阅读目录不完整，未入库", "other", nil)
	}
	mimetypeEntry, err := archive.Open("mimetype")
	if err != nil {
		return pluginproto.NewUpstreamError("番茄 EPUB 文件损坏或阅读目录不完整，未入库", "other", nil)
	}
	mimetype, err := io.ReadAll(mimetypeEntry)
	mimetypeEntry.Close()
	if err != nil || string(mimetype) != "application/epub+zip" {
		return pluginproto.NewUpstreamError("番茄 EPUB 文件损坏或阅读目录不完整，未入库", "other", nil)
	}

	containerXML, err := readZipEntry(archive, "META-INF/container.xml")
	if err != nil {
		return pluginproto.NewUpstreamError("番茄 EPUB 文件损坏或阅读目录不完整，未入库", "other", nil)
	}
	var container struct {
		Rootfiles []struct {
			FullPath string `xml:"full-path,attr"`
		} `xml:"rootfiles>rootfile"`
	}
	if err := xml.Unmarshal(containerXML, &container); err != nil ||
		len(container.Rootfiles) == 0 || container.Rootfiles[0].FullPath == "" {
		return pluginproto.NewUpstreamError("番茄 EPUB 文件损坏或阅读目录不完整，未入库", "other", nil)
	}
	packagePath := container.Rootfiles[0].FullPath

	packageXML, err := readZipEntry(archive, packagePath)
	if err != nil {
		return pluginproto.NewUpstreamError("番茄 EPUB 文件损坏或阅读目录不完整，未入库", "other", nil)
	}
	var pkg struct {
		XMLName  xml.Name `xml:"package"`
		Manifest []struct {
			ID   string `xml:"id,attr"`
			Href string `xml:"href,attr"`
		} `xml:"manifest>item"`
		Spine []struct {
			IDRef string `xml:"idref,attr"`
		} `xml:"spine>itemref"`
	}
	if err := xml.Unmarshal(packageXML, &pkg); err != nil || pkg.XMLName.Space != "http://www.idpf.org/2007/opf" {
		return pluginproto.NewUpstreamError("番茄 EPUB 文件损坏或阅读目录不完整，未入库", "other", nil)
	}
	manifest := map[string]string{}
	for _, item := range pkg.Manifest {
		manifest[item.ID] = item.Href
	}
	if len(pkg.Spine) == 0 {
		return pluginproto.NewUpstreamError("番茄 EPUB 文件损坏或阅读目录不完整，未入库", "other", nil)
	}
	for _, item := range pkg.Spine {
		href, ok := manifest[item.IDRef]
		if !ok {
			return pluginproto.NewUpstreamError("番茄 EPUB 文件损坏或阅读目录不完整，未入库", "other", nil)
		}
		href = strings.SplitN(href, "#", 2)[0]
		if decoded, err := url.PathUnescape(href); err == nil {
			href = decoded
		}
		filePath := path.Join(path.Dir(packagePath), href)
		entry, err := archive.Open(filePath)
		if err != nil {
			return pluginproto.NewUpstreamError("番茄 EPUB 文件损坏或阅读目录不完整，未入库", "other", nil)
		}
		info, err := entry.Stat()
		entry.Close()
		if err != nil || info.Size() == 0 {
			return pluginproto.NewUpstreamError("番茄 EPUB 文件损坏或阅读目录不完整，未入库", "other", nil)
		}
	}
	return nil
}

// readZipEntry 读取 zip 内单个条目的全部字节。
func readZipEntry(archive *zip.Reader, name string) ([]byte, error) {
	f, err := archive.Open(name)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return io.ReadAll(f)
}

// tomatoDownloaderSession 复刻 DownloaderSession。
type tomatoDownloaderSession struct {
	config   map[string]any
	format   string
	deadline time.Time
	root     string
	output   string
	endpoint string
	password string
	process  *exec.Cmd
	http     *safehttp.SafeHttpClient
}

// newTomatoDownloaderSession 复刻 __init__。
func newTomatoDownloaderSession(context map[string]any) (*tomatoDownloaderSession, error) {
	config, _ := context["config"].(map[string]any)
	format, err := tomatoOutputFormat(context)
	if err != nil {
		return nil, err
	}
	seconds := 600.0
	if v, ok := config["timeout_seconds"].(float64); ok {
		seconds = v
	}
	if seconds < 5 {
		seconds = 5
	}
	if seconds > 3600 {
		seconds = 3600
	}
	if deadlineStr, ok := context["deadline"].(string); ok && deadlineStr != "" {
		if deadline, err := time.Parse(time.RFC3339, deadlineStr); err == nil {
			remaining := time.Until(deadline).Seconds()
			if remaining < seconds {
				seconds = remaining
			}
		}
	}
	return &tomatoDownloaderSession{
		config:   config,
		format:   format,
		deadline: time.Now().Add(time.Duration(seconds-2) * time.Second),
	}, nil
}

// remaining 复刻 remaining()。
func (s *tomatoDownloaderSession) remaining() time.Duration {
	left := time.Until(s.deadline)
	if left <= 0 {
		return 0
	}
	return left
}

// remainingOrError 复刻 remaining() 的超时异常分支。
func (s *tomatoDownloaderSession) remainingOrError() (time.Duration, error) {
	left := s.remaining()
	if left <= 0 {
		return 0, pluginproto.NewUpstreamError(
			"番茄下载器操作超时；请稍后重试或增加连接超时时间", "other", nil)
	}
	return left, nil
}

// start 复刻 _start。
func (s *tomatoDownloaderSession) start() error {
	// 仅支持 Linux amd64/arm64（与 Python platform.machine() 对齐）。
	machine := runtime.GOARCH
	if runtime.GOOS != "linux" || (machine != "amd64" && machine != "arm64") {
		return pluginproto.NewUpstreamError(
			"番茄下载器仅支持 Linux amd64/arm64，请在 Talebook 容器中安装", "other", nil)
	}
	expected, ok := tomatoReleaseHashes[machine]
	if !ok {
		return pluginproto.NewUpstreamError(
			"番茄下载器仅支持 Linux amd64/arm64，请在 Talebook 容器中安装", "other", nil)
	}
	binaryPath, _ := s.config["binary_path"].(string)
	binaryPath = expandUser(binaryPath)
	if !filepath.IsAbs(binaryPath) {
		return pluginproto.NewUpstreamError(
			"未安装番茄下载器；请按部署文档安装 v2.4.15 并配置绝对路径", "other", nil)
	}
	if info, err := os.Stat(binaryPath); err != nil || info.IsDir() {
		return pluginproto.NewUpstreamError(
			"未安装番茄下载器；请按部署文档安装 v2.4.15 并配置绝对路径", "other", nil)
	}
	digest, err := sha256File(binaryPath)
	if err != nil {
		return pluginproto.NewUpstreamError("无法读取番茄下载器文件", "other", nil)
	}
	if digest != expected {
		return pluginproto.NewUpstreamError(
			"番茄下载器 SHA-256 不匹配；需要 v2.4.15 Linux musl 发行文件", "other", nil)
	}
	if _, err := s.remainingOrError(); err != nil {
		return err
	}

	root, err := os.MkdirTemp("", "talebook-tomato-")
	if err != nil {
		return err
	}
	s.root = root
	s.output = filepath.Join(root, "books")
	if err := os.Mkdir(s.output, 0o755); err != nil {
		return err
	}
	configPayload := map[string]any{
		"save_path": s.output, "novel_format": s.format, "bulk_files": false,
		"use_official_api": true, "api_endpoints": []any{},
		"preferred_book_name_field": "book_name", "ask_format_after_download": false,
		"auto_open_downloaded_files": false, "enable_audiobook": false,
		"enable_segment_comments": false, "max_workers": 1, "max_retries": 1,
		"request_timeout": 15,
	}
	configJSON, err := json.Marshal(configPayload)
	if err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(root, "config.yml"), configJSON, 0o644); err != nil {
		return err
	}

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return err
	}
	port := listener.Addr().(*net.TCPAddr).Port
	listener.Close()

	s.password = tomatoTokenURLSafe()
	s.endpoint = fmt.Sprintf("http://127.0.0.1:%d", port)
	// 复刻 Python：本地 HTTP 钉在回环地址，不读代理环境变量。
	s.http = &safehttp.SafeHttpClient{AllowedHosts: []string{"127.0.0.1"}}
	s.process = exec.Command(binaryPath, "--server", "--data-dir", root)
	s.process.Dir = root
	s.process.Stdout = nil
	s.process.Stderr = nil
	// 复刻 Python 的环境裁剪：只继承白名单变量并注入下载器所需项，
	// 不继承应用凭据；端口与密码经环境变量下发给子进程。
	env := []string{
		"CARGO=talebook-pinned-release",
		"TOMATO_WEB_ADDR=127.0.0.1:" + itoa(port),
		"TOMATO_WEB_PASSWORD=" + s.password,
		"TMPDIR=" + root,
	}
	for _, key := range []string{"PATH", "LANG", "SSL_CERT_FILE", "SSL_CERT_DIR"} {
		if value, ok := os.LookupEnv(key); ok {
			env = append(env, key+"="+value)
		}
	}
	s.process.Env = env
	if err := s.process.Start(); err != nil {
		return pluginproto.NewUpstreamError(
			"无法启动番茄下载器；请检查可执行权限与系统架构", "other", nil)
	}
	// 复刻 poll()：后台 Wait 使 ProcessState 可读，进程秒退可即时检测。
	go func() { _, _ = s.process.Process.Wait() }()
	for {
		if _, err := s.remainingOrError(); err != nil {
			return err
		}
		if s.process.ProcessState != nil && s.process.ProcessState.Exited() {
			return pluginproto.NewUpstreamError(
				"番茄下载器启动失败，请检查安装与运行环境", "other", nil)
		}
		if s.process.Process == nil {
			return pluginproto.NewUpstreamError(
				"番茄下载器启动失败，请检查安装与运行环境", "other", nil)
		}
		status, err := s.request("GET", "/api/status", nil)
		if err != nil {
			if isConnectionRefused(err) {
				time.Sleep(100 * time.Millisecond)
				continue
			}
			return err
		}
		if version, _ := status["version"].(string); version != tomatoDownloaderVersion {
			return pluginproto.NewUpstreamError("番茄下载器版本不匹配", "other", nil)
		}
		return nil
	}
}

// isConnectionRefused 判断是否为连接未就绪。
func isConnectionRefused(err error) bool {
	return strings.Contains(err.Error(), "connection refused") ||
		strings.Contains(err.Error(), "connect: connection refused")
}

// request 复刻 request()。
func (s *tomatoDownloaderSession) request(method, apiPath string, params url.Values) (map[string]any, error) {
	left, err := s.remainingOrError()
	if err != nil {
		return nil, err
	}
	timeout := left
	if timeout > 15*time.Second {
		timeout = 15 * time.Second
	}
	target := s.endpoint + apiPath
	if len(params) > 0 {
		target += "?" + params.Encode()
	}
	resp, err := s.http.Request(nil, method, target, safehttp.RequestOptions{
		Headers:    map[string]string{"x-tomato-password": s.password},
		Timeout:    timeout,
		HasTimeout: true,
	})
	if err != nil {
		if os.IsTimeout(err) || strings.Contains(err.Error(), "timeout") ||
			strings.Contains(err.Error(), "deadline exceeded") {
			return nil, pluginproto.NewUpstreamError("番茄下载器请求超时，请稍后重试", "other", nil)
		}
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, pluginproto.NewUpstreamError("番茄下载器返回了无效响应", "other", nil)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, pluginproto.NewUpstreamError(
			"番茄上游服务不可用或当前构建不支持此操作，请稍后重试", "other", nil)
	}
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, pluginproto.NewUpstreamError("番茄下载器返回了无效响应", "other", nil)
	}
	if errValue, ok := payload["error"]; ok && errValue != nil && errValue != false && errValue != "" {
		// 上游诊断信息可能包含私有 API 端点或令牌，不透传。
		return nil, pluginproto.NewUpstreamError(
			"番茄上游服务不可用或当前构建不支持此操作，请稍后重试", "other", nil)
	}
	return payload, nil
}

// download 复刻 download()。
func (s *tomatoDownloaderSession) download(identity string) (plugindomain.BookFile, error) {
	// POST /api/jobs 的请求体需要 book_id；request 不支持 JSON 体，
	// 这里直接用底层客户端补齐。
	left, err := s.remainingOrError()
	if err != nil {
		return plugindomain.BookFile{}, err
	}
	timeout := left
	if timeout > 15*time.Second {
		timeout = 15 * time.Second
	}
	resp, err := s.http.Request(nil, "POST", s.endpoint+"/api/jobs", safehttp.RequestOptions{
		Headers: map[string]string{
			"x-tomato-password": s.password,
			"Content-Type":      "application/json",
		},
		JSON:       map[string]any{"book_id": identity},
		Timeout:    timeout,
		HasTimeout: true,
	})
	if err != nil {
		return plugindomain.BookFile{}, pluginproto.NewUpstreamError(
			"番茄下载器请求超时，请稍后重试", "other", nil)
	}
	body, err := io.ReadAll(resp.Body)
	resp.Body.Close()
	if err != nil {
		return plugindomain.BookFile{}, pluginproto.NewUpstreamError(
			"番茄下载器返回了无效响应", "other", nil)
	}
	var jobPayload map[string]any
	if err := json.Unmarshal(body, &jobPayload); err != nil {
		return plugindomain.BookFile{}, pluginproto.NewUpstreamError(
			"番茄下载器返回了无效响应", "other", nil)
	}
	if errValue, ok := jobPayload["error"]; ok && errValue != nil && errValue != false && errValue != "" {
		return plugindomain.BookFile{}, pluginproto.NewUpstreamError(
			"番茄上游服务不可用或当前构建不支持此操作，请稍后重试", "other", nil)
	}
	jobID := -1
	switch v := jobPayload["id"].(type) {
	case float64:
		jobID = int(v)
	case int:
		jobID = v
	}
	if jobID < 1 {
		return plugindomain.BookFile{}, pluginproto.NewUpstreamError(
			"番茄下载器未返回有效任务 ID", "other", nil)
	}

	for {
		if _, err := s.remainingOrError(); err != nil {
			return plugindomain.BookFile{}, err
		}
		itemsPayload, err := s.request("GET", "/api/jobs", url.Values{"id": {itoa(jobID)}})
		if err != nil {
			return plugindomain.BookFile{}, err
		}
		items, _ := itemsPayload["items"].([]any)
		var current map[string]any
		for _, raw := range items {
			if item, ok := raw.(map[string]any); ok {
				if id, ok := item["id"].(float64); ok && int(id) == jobID {
					current = item
					break
				}
			}
		}
		if current == nil || fmt.Sprintf("%v", current["book_id"]) != identity {
			return plugindomain.BookFile{}, pluginproto.NewUpstreamError(
				"番茄下载任务丢失，请重新保存", "other", nil)
		}
		state, _ := current["state"].(string)
		if state == "done" {
			break
		}
		if state != "queued" && state != "running" {
			return plugindomain.BookFile{}, pluginproto.NewUpstreamError(
				"番茄下载失败，上游服务可能暂时不可用，请稍后重试", "other", nil)
		}
		if options := current["book_name_options"]; options != nil && options != false && options != "" {
			return plugindomain.BookFile{}, pluginproto.NewUpstreamError(
				"番茄下载器意外要求交互选择，请检查发行版本", "other", nil)
		}
		if options := current["format_options"]; options != nil && options != false && options != "" {
			return plugindomain.BookFile{}, pluginproto.NewUpstreamError(
				"番茄下载器意外要求交互选择，请检查发行版本", "other", nil)
		}
		time.Sleep(250 * time.Millisecond)
	}

	historyPayload, err := s.request("GET", "/api/history", url.Values{"limit": {"1"}})
	if err != nil {
		return plugindomain.BookFile{}, err
	}
	history, _ := historyPayload["items"].([]any)
	record := map[string]any{}
	if len(history) > 0 {
		if m, ok := history[0].(map[string]any); ok {
			record = m
		}
	}
	total, _ := record["selected_chapters"].(float64)
	if fmt.Sprintf("%v", record["book_id"]) != identity ||
		total <= 0 ||
		int(recordValueOrZero(record, "success_chapters")) != int(total) ||
		recordValueOrZero(record, "failed_chapters") != 0 {
		return plugindomain.BookFile{}, pluginproto.NewUpstreamError(
			"番茄下载缺章或完整性无法确认，未入库；请稍后重试", "other", nil)
	}

	entries, err := os.ReadDir(s.output)
	if err != nil {
		return plugindomain.BookFile{}, err
	}
	var matched string
	count := 0
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != "."+s.format {
			continue
		}
		count++
		matched = filepath.Join(s.output, entry.Name())
	}
	if count != 1 {
		return plugindomain.BookFile{}, pluginproto.NewUpstreamError(
			"番茄下载器未生成唯一的 "+strings.ToUpper(s.format)+" 文件，未入库", "other", nil)
	}
	content, err := os.ReadFile(matched)
	if err != nil {
		return plugindomain.BookFile{}, err
	}
	if len(content) == 0 || len(content) > tomatoMaxBookBytes {
		return plugindomain.BookFile{}, pluginproto.NewUpstreamError(
			"番茄下载文件为空或超过 64 MiB，未入库", "other", nil)
	}
	if s.format == "epub" {
		if err := tomatoValidateEpub(content); err != nil {
			return plugindomain.BookFile{}, err
		}
	}
	if _, err := s.remainingOrError(); err != nil {
		return plugindomain.BookFile{}, err
	}
	mediaType := "text/plain"
	if s.format == "epub" {
		mediaType = "application/epub+zip"
	}
	return plugindomain.BookFile{
		Filename:  identity + "." + s.format,
		Content:   content,
		Format:    s.format,
		MediaType: mediaType,
	}, nil
}

// recordValueOrZero 取数值字段，缺失或类型不符返回 0。
func recordValueOrZero(record map[string]any, key string) int {
	if v, ok := record[key].(float64); ok {
		return int(v)
	}
	return 0
}

// close 复刻 __exit__。
func (s *tomatoDownloaderSession) close() {
	if s.process != nil && s.process.Process != nil {
		_ = s.process.Process.Kill()
		_, _ = s.process.Process.Wait()
	}
	if s.root != "" {
		_ = os.RemoveAll(s.root)
	}
}

// Search 复刻 search。
func (p *TomatoDownloaderProvider) Search(query string, cursor map[string]any, context map[string]any) (plugindomain.Page, error) {
	query = strings.TrimSpace(query)
	page := 1
	if v, ok := cursor["page"].(float64); ok {
		page = int(v)
	}
	if query == "" || page > 1 {
		return plugindomain.Page{Items: []any{}}, nil
	}
	if (isASCII(query) && isAllDigits(query)) || strings.HasPrefix(query, "https://fanqienovel.com/page/") {
		identity, err := tomatoBookID(query)
		if err != nil {
			return plugindomain.Page{}, err
		}
		detail, err := p.GetBook(identity, context)
		if err != nil {
			return plugindomain.Page{}, err
		}
		entry := detail.ToDict()
		entry["access"] = "download"
		return plugindomain.Page{Items: []any{plugindomain.SourceBookFromDict(entry)}}, nil
	}
	session, err := newTomatoDownloaderSession(context)
	if err != nil {
		return plugindomain.Page{}, err
	}
	defer session.close()
	if err := session.start(); err != nil {
		return plugindomain.Page{}, err
	}
	payload, err := session.request("GET", "/api/search", url.Values{"q": {truncate(query, 200)}})
	if err != nil {
		return plugindomain.Page{}, err
	}
	items, _ := payload["items"].([]any)
	if items == nil {
		return plugindomain.Page{}, pluginproto.NewUpstreamError("番茄搜索返回了无效结果", "other", nil)
	}
	format, err := tomatoOutputFormat(context)
	if err != nil {
		return plugindomain.Page{}, err
	}
	books := []any{}
	for i, raw := range items {
		if i >= 50 {
			break
		}
		item, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		identity, err := tomatoBookID(item["book_id"])
		if err != nil {
			return plugindomain.Page{}, err
		}
		var authors []string
		if author, ok := item["author"].(string); ok && author != "" {
			authors = []string{author}
		}
		title := identity
		if t, ok := item["title"].(string); ok && t != "" {
			title = t
		}
		books = append(books, plugindomain.SourceBookFromDict(map[string]any{
			"external_id": identity,
			"title":       title,
			"authors":     authors,
			"source":      "番茄小说下载器",
			"source_url":  "https://fanqienovel.com/page/" + identity,
			"format":      format,
			"access":      "download",
			"license":     "作品版权归原权利人所有",
		}))
	}
	return plugindomain.Page{Items: books}, nil
}

// GetCategories 复刻 get_categories：无分类。
func (p *TomatoDownloaderProvider) GetCategories(context map[string]any) ([]plugindomain.Category, error) {
	return []plugindomain.Category{}, nil
}

// Browse 复刻基类行为：番茄下载器无发现目录，返回空页。
func (p *TomatoDownloaderProvider) Browse(categoryID string, cursor map[string]any, context map[string]any) (plugindomain.Page, error) {
	return plugindomain.Page{Items: []any{}}, nil
}

// GetTOC 复刻基类行为：单文件下载无章节。
func (p *TomatoDownloaderProvider) GetTOC(book plugindomain.SourceBookDetail, context map[string]any) ([]plugindomain.SourceChapter, error) {
	return nil, pluginproto.NewUpstreamError("Book source does not provide chapters", "other", nil)
}

// GetChapter 复刻基类行为：单文件下载无章节。
func (p *TomatoDownloaderProvider) GetChapter(chapter plugindomain.SourceChapter, context map[string]any) (plugindomain.SourceContent, error) {
	return plugindomain.SourceContent{}, pluginproto.NewUpstreamError(
		"Book source does not provide chapters", "other", nil)
}

// GetBook 复刻 get_book。
func (p *TomatoDownloaderProvider) GetBook(externalID string, context map[string]any) (plugindomain.SourceBookDetail, error) {
	identity, err := tomatoBookID(externalID)
	if err != nil {
		return plugindomain.SourceBookDetail{}, err
	}
	session, err := newTomatoDownloaderSession(context)
	if err != nil {
		return plugindomain.SourceBookDetail{}, err
	}
	defer session.close()
	if err := session.start(); err != nil {
		return plugindomain.SourceBookDetail{}, err
	}
	item, err := session.request("GET", "/api/preview/"+identity, nil)
	if err != nil {
		return plugindomain.SourceBookDetail{}, err
	}
	if fmt.Sprintf("%v", item["book_id"]) != identity {
		return plugindomain.SourceBookDetail{}, pluginproto.NewUpstreamError(
			"番茄书籍信息缺失或不匹配", "other", nil)
	}
	bookName, _ := item["book_name"].(string)
	if bookName == "" {
		return plugindomain.SourceBookDetail{}, pluginproto.NewUpstreamError(
			"番茄书籍信息缺失或不匹配", "other", nil)
	}
	format, err := tomatoOutputFormat(context)
	if err != nil {
		return plugindomain.SourceBookDetail{}, err
	}
	var authors []string
	if author, ok := item["author"].(string); ok && author != "" {
		authors = []string{author}
	}
	description, _ := item["description"].(string)
	var categories []string
	if tags, ok := item["tags"].([]any); ok {
		for _, tag := range tags {
			if s, ok := tag.(string); ok {
				categories = append(categories, s)
			}
		}
	}
	return plugindomain.SourceBookDetail{
		ExternalID:   identity,
		Title:        bookName,
		Authors:      authors,
		Description:  description,
		Categories:   categories,
		SourceURL:    "https://fanqienovel.com/page/" + identity,
		Source:       "番茄小说下载器",
		Format:       format,
		Downloadable: true,
	}, nil
}

// Download 复刻 download。
func (p *TomatoDownloaderProvider) Download(book plugindomain.SourceBookDetail, context map[string]any) (plugindomain.BookFile, error) {
	identity, err := tomatoBookID(book.ExternalID)
	if err != nil {
		return plugindomain.BookFile{}, err
	}
	session, err := newTomatoDownloaderSession(context)
	if err != nil {
		return plugindomain.BookFile{}, err
	}
	defer session.close()
	if err := session.start(); err != nil {
		return plugindomain.BookFile{}, err
	}
	return session.download(identity)
}

// SelfCheck 复刻 self_check。
func (p *TomatoDownloaderProvider) SelfCheck(context map[string]any) (plugindomain.CheckReport, error) {
	session, err := newTomatoDownloaderSession(context)
	if err != nil {
		return plugindomain.CheckReport{}, err
	}
	defer session.close()
	if err := session.start(); err != nil {
		return plugindomain.CheckReport{}, err
	}
	status, err := session.request("GET", "/api/status", nil)
	if err != nil {
		return plugindomain.CheckReport{}, err
	}
	if prewarm := status["prewarm_error"]; prewarm != nil && prewarm != false && prewarm != "" {
		return plugindomain.CheckReport{}, pluginproto.NewUpstreamError(
			"下载器已启动，但上游设备注册失败；请稍后重试", "other", nil)
	}
	return plugindomain.CheckReport{
		Healthy: true,
		Message: "下载器 v2.4.15 可启动；搜索和正文可用性仍取决于上游服务",
	}, nil
}

// Execute 复刻 execute：返回健康消息。
func (p *TomatoDownloaderProvider) Execute(context map[string]any) (pluginproto.ProviderResult, error) {
	report, err := p.SelfCheck(context)
	if err != nil {
		return pluginproto.ProviderResult{}, err
	}
	return pluginproto.ProviderResult{HealthMessage: report.Message}, nil
}

// isASCII 判断是否全 ASCII。
func isASCII(s string) bool {
	for i := 0; i < len(s); i++ {
		if s[i] > 0x7F {
			return false
		}
	}
	return true
}

// isAllDigits 判断是否全数字。
func isAllDigits(s string) bool {
	if s == "" {
		return false
	}
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}

// truncate 按字符（码点）截断，对齐 Python str[:n]。
func truncate(s string, limit int) string {
	runes := []rune(s)
	if len(runes) <= limit {
		return s
	}
	return string(runes[:limit])
}

// tomatoTokenURLSafe 复刻 secrets.token_urlsafe(32)。
func tomatoTokenURLSafe() string {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		// crypto/rand 失败极罕见；退化为时间戳。
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(buf)
}

// 编译期断言。
var (
	_ pluginiface.SourceProvider = (*TomatoDownloaderProvider)(nil)
)
