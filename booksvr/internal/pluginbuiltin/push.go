package pluginbuiltin

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginproto"
	"talebook/booksvr/internal/pluginruntime"
	"talebook/booksvr/internal/safehttp"
)

// pushCapability 复刻 PUSH_CAPABILITY。
const pushCapability = "integrations.push"

// pushHTTPClient 是设备上传的共享 HTTP 客户端。
var pushHTTPClient = &safehttp.SafeHttpClient{}

// pushManifest 复刻 push/base.py:_manifest。
func pushManifest(pluginID, name, description, icon, homepage, brandIcon string) map[string]any {
	ui := map[string]any{
		"icon":           icon,
		"brand_icon":     brandIcon,
		"primary_action": "configure",
		"manage_route":   "/me/devices",
		"device_type":    pluginID[strings.LastIndex(pluginID, ".")+1:],
	}
	return map[string]any{
		"protocol_version": pluginproto.ProtocolVersion,
		"id":               pluginID,
		"name":             name,
		"description":      description,
		"version":          "1.0.0",
		"categories":       []any{"integrations"},
		"capabilities":     []any{pushCapability},
		"runtime_kind":     "builtin",
		"actions":          []any{"test"},
		"auth_schema":      map[string]any{"type": "object", "properties": map[string]any{}},
		"config_schema": map[string]any{
			"type": "object",
			// 设备地址由每个用户自己填写：局域网 IP 或主机名。
			"properties": map[string]any{"device_url": map[string]any{"type": "string"}},
		},
		"permissions":       []any{"books.read", "network.write"},
		"data_policy":       map[string]any{"stores_full_text": false, "retention": "device_owned"},
		"compatibility":     map[string]any{"talebook": ">=0.1.0"},
		"connection_owners": []any{"user"},
		"homepage":          homepage,
		"license":           "GPL-3.0",
		"ui":                ui,
	}
}

// pushCaps 是设备推送的能力声明。
func pushCaps() pluginiface.CapabilitySet {
	return pluginiface.CapabilitySet{
		Interfaces:   map[string]bool{"PushProvider": true},
		HasSelfCheck: true,
	}
}

// registerPushProviders 注册 7 个推送插件。
//
// 顺序与 Python register.py 的 PUSH_PROVIDERS 一致。
func registerPushProviders(reg *pluginruntime.PluginRegistry) error {
	providers := []pluginiface.Provider{
		newKindleProvider(),
		newDevicePushProvider("talebook.push.duokan", "多看阅读",
			"通过 WiFi 传书把书籍发送到多看阅读设备。", "mdi-tablet", "", "/images/plugin-icons/duokan.jpg",
			12121, duokanUpload),
		newDevicePushProvider("talebook.push.boox", "文石 BOOX",
			"把书籍发送到文石 BOOX 设备的推送库。", "mdi-tablet-android", "https://www.boox.com/",
			"/images/plugin-icons/boox.png", 8085, booxUpload),
		newDevicePushProvider("talebook.push.hanwang", "汉王电纸书",
			"通过 WiFi 传书把书籍发送到汉王电纸书。", "mdi-book-open-outline", "",
			"/images/plugin-icons/hanwang.jpg", 9310, hanwangUpload),
		newDevicePushProvider("talebook.push.ireader", "掌阅 iReader",
			"把书籍发送到掌阅 iReader 设备。", "mdi-book-arrow-right-outline", "https://www.ireader.com/",
			"/images/plugin-icons/ireader.ico", 10123, ireaderUpload),
		newDevicePushProvider("talebook.push.dangdang", "当当阅读器",
			"把书籍发送到当当阅读器。", "mdi-tablet-dashboard", "https://www.dangdang.com/",
			"/images/plugin-icons/dangdang.ico", 11111, dangdangUpload),
		newDevicePushProvider("talebook.push.purelibro", "PureLibro",
			"把书籍发送到 PureLibro 阅读设备。", "mdi-book-play-outline",
			"https://apps.apple.com/es/app/purelibro-ebook-reader/id1546612448",
			"/images/plugin-icons/purelibro.jpg", 80, purelibroUpload),
	}
	for _, p := range providers {
		if _, err := reg.Register(p, pushCaps()); err != nil {
			return err
		}
	}
	return nil
}

// uploaderFunc 是各设备上传器的差异点：构造 multipart 体与目标 URL。
//
// 返回 (上传结果 dict, 错误)。错误仅用于传输层失败；业务失败走结果 dict。
type uploaderFunc func(client *safehttp.SafeHttpClient, serverURL, filePath, filename,
	contentType string, timeout time.Duration) map[string]any

// DevicePushProvider 复刻 DevicePushProvider。
type DevicePushProvider struct {
	ManifestDict map[string]any
	Port         int
	Upload       uploaderFunc
}

// newDevicePushProvider 构造设备推送 provider。
func newDevicePushProvider(pluginID, name, description, icon, homepage, brandIcon string,
	port int, upload uploaderFunc) *DevicePushProvider {
	return &DevicePushProvider{
		ManifestDict: pushManifest(pluginID, name, description, icon, homepage, brandIcon),
		Port:         port,
		Upload:       upload,
	}
}

// Manifest 满足 pluginiface.Provider。
func (p *DevicePushProvider) Manifest() map[string]any { return p.ManifestDict }

// Invoke 实现 MethodDispatcher：全部委托 DispatchInvoke。
func (p *DevicePushProvider) Invoke(method string, args []any, context map[string]any) (any, error) {
	return DispatchInvoke(p, method, args, context)
}

// InitialEnabled 复刻 initial_enabled：设备发送是既有内置能力，默认可用。
func (p *DevicePushProvider) InitialEnabled(settings map[string]any) bool { return true }

// InitialConfig 复刻缺省行为：空配置。
func (p *DevicePushProvider) InitialConfig(settings map[string]any) map[string]any {
	return map[string]any{}
}

// DefaultPort 复刻 default_port。
func (p *DevicePushProvider) DefaultPort() int { return p.Port }

// Push 复刻 push：sync 模式，写向外部，不可回滚。
func (p *DevicePushProvider) Push(bookFile any, target any, context any) (any, error) {
	ctx, _ := context.(map[string]any)
	if ctx == nil {
		ctx = map[string]any{}
	}
	targetURL := strings.TrimSpace(stringOr(target, ""))
	if targetURL == "" {
		config, _ := ctx["config"].(map[string]any)
		targetURL = strings.TrimSpace(stringOr(config["device_url"], ""))
	}
	if targetURL == "" {
		return nil, pluginproto.NewUpstreamError("Device address is required", "other", nil)
	}
	if !strings.HasPrefix(targetURL, "http://") && !strings.HasPrefix(targetURL, "https://") {
		targetURL = "http://" + targetURL
	}

	filePath, fileName, err := pushFileArgs(bookFile)
	if err != nil {
		return nil, err
	}
	timeout, err := pushNetworkTimeout(ctx)
	if err != nil {
		return nil, err
	}
	contentType, err := pushContentType(filePath)
	if err != nil {
		return nil, err
	}
	result := p.Upload(pushHTTPClient, targetURL, filePath, fileName, contentType, timeout)
	if success, _ := result["success"].(bool); !success {
		message := stringOr(result["message"], "Device rejected the upload")
		errorType := stringOr(result["error_type"], "other")
		var statusCode *int
		if code, ok := result["status_code"].(int); ok {
			statusCode = &code
		}
		return nil, pluginproto.NewUpstreamError(message, errorType, statusCode)
	}
	return result, nil
}

// SelfCheck 复刻 self_check。
func (p *DevicePushProvider) SelfCheck(context map[string]any) (plugindomain.CheckReport, error) {
	config, _ := context["config"].(map[string]any)
	configured := strings.TrimSpace(stringOr(config["device_url"], "")) != ""
	if configured {
		return plugindomain.CheckReport{Healthy: true, Message: "设备地址已配置"}, nil
	}
	return plugindomain.CheckReport{Healthy: false, Message: "设备地址未配置"}, nil
}

// pushFileArgs 复刻 `book_file["path"]` 与 `book_file.get("name")`。
//
// 兼容 Go 侧直接传路径字符串的调用方式。
func pushFileArgs(bookFile any) (filePath, fileName string, err error) {
	switch value := bookFile.(type) {
	case map[string]any:
		filePath, _ = value["path"].(string)
		fileName, _ = value["name"].(string)
	case string:
		filePath = value
	default:
		return "", "", pluginproto.NewUpstreamError("Device upload requires a book file", "other", nil)
	}
	if filePath == "" {
		return "", "", pluginproto.NewUpstreamError("Device upload requires a book file", "other", nil)
	}
	if fileName == "" {
		fileName = filepath.Base(filePath)
	}
	return filePath, fileName, nil
}

// pushContentType 复刻 _get_content_type 与 _check_file。
func pushContentType(filePath string) (string, error) {
	if _, err := os.Stat(filePath); err != nil {
		return "", pluginproto.NewUpstreamError(
			"File not found: "+filePath, "other", nil)
	}
	ext := strings.ToLower(filepath.Ext(filePath))
	switch ext {
	case ".epub":
		return "application/epub+zip", nil
	case ".pdf":
		return "application/pdf", nil
	case ".azw3", ".txt":
		return "application/octet-stream", nil
	}
	return "", pluginproto.NewUpstreamError(
		"Unsupported file format: "+ext+", only epub, azw3 and pdf are supported", "other", nil)
}

// pushNetworkTimeout 复刻 _network_timeout。
func pushNetworkTimeout(context map[string]any) (time.Duration, error) {
	remaining := 30 * time.Second
	if deadlineStr, ok := context["deadline"].(string); ok && deadlineStr != "" {
		if deadline, err := time.Parse(time.RFC3339, deadlineStr); err == nil {
			remaining = time.Until(deadline)
		}
	}
	// 为结果传递与 runtime 结算预留 100ms。
	if remaining <= 100*time.Millisecond {
		return 0, pluginproto.NewUpstreamError("Device upload deadline expired", "timeout", nil)
	}
	left := remaining - 100*time.Millisecond
	if left < 10*time.Millisecond {
		left = 10 * time.Millisecond
	}
	return left, nil
}

// pushMultipartBody 构造 multipart/form-data 请求体。
func pushMultipartBody(fields []pushFormField) (*bytes.Buffer, string, error) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	for _, field := range fields {
		if field.Value != "" && field.Filename == "" && field.ContentType == "" {
			if err := writer.WriteField(field.Name, field.Value); err != nil {
				return nil, "", err
			}
			continue
		}
		part, err := writer.CreateFormFile(field.Name, field.Filename)
		if err != nil {
			return nil, "", err
		}
		if _, err := part.Write(field.Content); err != nil {
			return nil, "", err
		}
	}
	if err := writer.Close(); err != nil {
		return nil, "", err
	}
	return body, writer.FormDataContentType(), nil
}

// pushFormField 是 multipart 的一个字段。
type pushFormField struct {
	Name        string
	Value       string
	Filename    string
	Content     []byte
	ContentType string
}

// pushPost 发送 multipart 上传并返回结果 dict（复刻各 upload() 的公共骨架）。
func pushPost(target string, fields []pushFormField, timeout time.Duration,
	check func(map[string]any) error) map[string]any {
	body, contentType, err := pushMultipartBody(fields)
	if err != nil {
		return pushFailure("other", nil, "Upload failed: "+err.Error())
	}
	resp, err := pushHTTPClient.Request(nil, "POST", target, safehttp.RequestOptions{
		Headers:    map[string]string{"Content-Type": contentType},
		Data:       body.Bytes(),
		Timeout:    timeout,
		HasTimeout: true,
	})
	if err != nil {
		if os.IsTimeout(err) || strings.Contains(err.Error(), "timeout") ||
			strings.Contains(err.Error(), "deadline exceeded") {
			return pushFailure("timeout", nil, "Upload timeout")
		}
		return pushFailure("connection", nil, "Connection failed: "+target)
	}
	defer resp.Body.Close()
	raw, readErr := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return pushFailure("http", &resp.StatusCode,
			fmt.Sprintf("HTTP error: %d", resp.StatusCode))
	}
	if readErr != nil {
		return pushFailure("other", nil, "Upload failed: response read error")
	}
	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		payload = nil
	}
	if check != nil {
		if checkErr := check(payload); checkErr != nil {
			return pushFailure("other", nil, checkErr.Error())
		}
	}
	if payload != nil {
		return map[string]any{"success": true, "data": payload}
	}
	return map[string]any{"success": true, "data": string(raw)}
}

// pushFailure 构造失败结果 dict。
func pushFailure(errorType string, statusCode *int, message string) map[string]any {
	out := map[string]any{"success": false, "error_type": errorType, "message": message}
	if statusCode != nil {
		out["status_code"] = *statusCode
	}
	return out
}

// ---- 各设备上传器 ----

// duokanUpload 复刻 DuokanUploader.upload。
func duokanUpload(client *safehttp.SafeHttpClient, serverURL, filePath, filename,
	contentType string, timeout time.Duration) map[string]any {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return pushFailure("other", nil, "Upload failed: "+err.Error())
	}
	target := strings.TrimRight(serverURL, "/") + "/files"
	return pushPost(target, []pushFormField{
		{Name: "newfile", Filename: filename, Content: content, ContentType: contentType},
	}, timeout, nil)
}

// booxUpload 复刻 BooxUploader.upload。
func booxUpload(client *safehttp.SafeHttpClient, serverURL, filePath, filename,
	contentType string, timeout time.Duration) map[string]any {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return pushFailure("other", nil, "Upload failed: "+err.Error())
	}
	target := strings.TrimRight(serverURL, "/") + "/api/library/upload"
	return pushPost(target, []pushFormField{
		{Name: "parent", Value: "null"},
		{Name: "sender", Value: "web"},
		{Name: "file", Filename: filename, Content: content, ContentType: contentType},
	}, timeout, func(payload map[string]any) error {
		code, _ := payload["code"].(float64)
		successful, _ := payload["successful"].(bool)
		if int(code) != 0 || !successful {
			return fmt.Errorf("Upload failed: %v", payload)
		}
		return nil
	})
}

// hanwangUpload 复刻 HanwangUploader.upload。
func hanwangUpload(client *safehttp.SafeHttpClient, serverURL, filePath, filename,
	contentType string, timeout time.Duration) map[string]any {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return pushFailure("other", nil, "Upload failed: "+err.Error())
	}
	target := strings.TrimRight(serverURL, "/") + "/files"
	return pushPost(target, []pushFormField{
		{Name: "fileName", Value: url.PathEscape(filename)},
		{Name: "newfile", Filename: filename, Content: content, ContentType: contentType},
	}, timeout, nil)
}

// ireaderUpload 复刻 IReaderUploader.upload。
func ireaderUpload(client *safehttp.SafeHttpClient, serverURL, filePath, filename,
	contentType string, timeout time.Duration) map[string]any {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return pushFailure("other", nil, "Upload failed: "+err.Error())
	}
	target := strings.TrimRight(serverURL, "/") + "/?action=addBook"
	return pushPost(target, []pushFormField{
		{Name: "Filename", Value: filename},
		{Name: "Filedata", Filename: filename, Content: content, ContentType: contentType},
		{Name: "Upload", Value: "Submit Query"},
	}, timeout, nil)
}

// dangdangUpload 复刻 DangdangUploader.upload。
func dangdangUpload(client *safehttp.SafeHttpClient, serverURL, filePath, filename,
	contentType string, timeout time.Duration) map[string]any {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return pushFailure("other", nil, "Upload failed: "+err.Error())
	}
	return pushPost(serverURL, []pushFormField{
		{Name: "files[]", Filename: filename, Content: content, ContentType: contentType},
	}, timeout, nil)
}

// purelibroUpload 复刻 PureLibroUploader.upload。
func purelibroUpload(client *safehttp.SafeHttpClient, serverURL, filePath, filename,
	contentType string, timeout time.Duration) map[string]any {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return pushFailure("other", nil, "Upload failed: "+err.Error())
	}
	target := strings.TrimRight(serverURL, "/") + "/upload"
	return pushPost(target, []pushFormField{
		{Name: "path", Value: "/"},
		{Name: "files[]", Filename: filename, Content: content, ContentType: contentType},
	}, timeout, nil)
}

// ---- Kindle ----

// KindleMailSender 由启动装配注入（对应 Python MailService().send_book）。
//
// 参数：(userID, siteURL, book, mailbox, format, path)。
var KindleMailSender func(userID any, siteURL string, book map[string]any,
	mailbox, format, path string) error

// KindleConvertSender 由启动装配注入（对应 ConvertService().convert_and_send）。
var KindleConvertSender func(userID any, siteURL string, book map[string]any, mailbox string) error

// KindleProvider 复刻 KindleProvider。
type KindleProvider struct {
	ManifestDict map[string]any
}

// newKindleProvider 构造 Kindle 邮箱推送 provider。
func newKindleProvider() *KindleProvider {
	return &KindleProvider{ManifestDict: map[string]any{
		"protocol_version": pluginproto.ProtocolVersion,
		"id":               "talebook.push.kindle",
		"name":             "Kindle 邮箱推送",
		"description":      "通过 Talebook 配置的 SMTP 服务把书籍发送到 Kindle 邮箱。",
		"version":          "1.0.0",
		"categories":       []any{"integrations"},
		"capabilities":     []any{pushCapability},
		"runtime_kind":     "builtin",
		"actions":          []any{"test"},
		"auth_schema":      map[string]any{"type": "object", "properties": map[string]any{}},
		"config_schema":    map[string]any{"type": "object", "properties": map[string]any{}},
		"permissions":      []any{"books.read", "network.write"},
		"data_policy":      map[string]any{"stores_full_text": false, "retention": "device_owned"},
		"compatibility":    map[string]any{"talebook": ">=0.1.0"},
		"connection_owners": []any{"user"},
		"homepage":         "https://www.amazon.com/sendtokindle",
		"license":          "GPL-3.0",
		"ui": map[string]any{
			"icon":            "mdi-email-fast-outline",
			"brand_icon":      "/images/plugin-icons/kindle.png",
			"primary_action":  "configure",
			"manage_route":    "/me/devices",
			"device_type":     "kindle",
			"default_port":    0,
		},
	}}
}

// Manifest 满足 pluginiface.Provider。
func (p *KindleProvider) Manifest() map[string]any { return p.ManifestDict }

// Invoke 实现 MethodDispatcher：全部委托 DispatchInvoke。
func (p *KindleProvider) Invoke(method string, args []any, context map[string]any) (any, error) {
	return DispatchInvoke(p, method, args, context)
}

// InitialEnabled 复刻 initial_enabled：升级前就存在的系统能力，默认可用。
func (p *KindleProvider) InitialEnabled(settings map[string]any) bool { return true }

// InitialConfig 复刻缺省行为：空配置。
func (p *KindleProvider) InitialConfig(settings map[string]any) map[string]any {
	return map[string]any{}
}

// DefaultPort 复刻 default_port = 0。
func (p *KindleProvider) DefaultPort() int { return 0 }

// SelfCheck 复刻 self_check。
func (p *KindleProvider) SelfCheck(context map[string]any) (plugindomain.CheckReport, error) {
	return plugindomain.CheckReport{
		Healthy: true, Message: "使用 Talebook SMTP 配置发送到 Kindle 邮箱",
	}, nil
}

// Push 复刻 push：epub/pdf/txt 走邮件，azw3/mobi 走转换，否则不支持。
func (p *KindleProvider) Push(bookFile any, target any, context any) (any, error) {
	ctx, _ := context.(map[string]any)
	if ctx == nil {
		ctx = map[string]any{}
	}
	mailbox := strings.TrimSpace(stringOr(target, ""))
	if mailbox == "" {
		return nil, pluginproto.NewUpstreamError("Kindle email address is required", "other", nil)
	}
	platform, _ := ctx["platform"].(map[string]any)
	book, _ := platform["book"].(map[string]any)
	if book == nil {
		book = map[string]any{}
	}
	userID := platform["user_id"]
	siteURL := stringOr(platform["site_url"], "")

	for _, format := range []string{"epub", "pdf", "txt"} {
		path := stringOr(book["fmt_"+format], "")
		if path != "" {
			if KindleMailSender == nil {
				return nil, pluginproto.NewUpstreamError(
					"邮件服务未接线，无法发送 Kindle 邮件", "other", nil)
			}
			if err := KindleMailSender(userID, siteURL, book, mailbox, format, path); err != nil {
				return nil, err
			}
			return map[string]any{"success": true, "queued": true, "converting": false}, nil
		}
	}
	if stringOr(book["fmt_azw3"], "") != "" || stringOr(book["fmt_mobi"], "") != "" {
		if KindleConvertSender == nil {
			return nil, pluginproto.NewUpstreamError(
				"转换服务未接线，无法转换后发送 Kindle 邮件", "other", nil)
		}
		if err := KindleConvertSender(userID, siteURL, book, mailbox); err != nil {
			return nil, err
		}
		return map[string]any{"success": true, "queued": true, "converting": true}, nil
	}
	return map[string]any{"success": false, "error_code": "format.not_supported"}, nil
}

// 编译期断言。
var (
	_ pluginiface.PushProvider = (*DevicePushProvider)(nil)
	_ pluginiface.PushProvider = (*KindleProvider)(nil)
)
