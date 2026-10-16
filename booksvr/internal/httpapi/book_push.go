package httpapi

import (
	"fmt"
	"strings"

	"talebook/booksvr/internal/booktools"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginruntime"
)

// pushCapability 是推送设备 / 邮箱使用的插件能力名。
const pushCapability = "integrations.push"

// bookSendToDevice 复刻 Python BookSendToDevice.post。
//
// 语义：
//  1. 权限：ALLOW_GUEST_PUSH 关闭时需登录 + can_push + 已激活；
//  2. device_type 必填，且必须有对应 push provider；
//  3. kindle 用 mailbox，其余用 device_url。
func (w *bookWiring) bookSendToDevice(ctx *Context, bookID int64, args map[string]any) (map[string]any, error) {
	book, err := bookGetOne(w.Config(""), bookID)
	if err != nil {
		return nil, err
	}
	if book == nil {
		return map[string]any{"err": "book.not_found", "msg": "书籍已不存在"}, nil
	}

	if resp := w.checkPushPermission(ctx); resp != nil {
		return resp, nil
	}

	deviceType := strings.ToLower(strings.TrimSpace(stringOf(args["device_type"])))
	deviceURL := strings.TrimSpace(stringOf(args["device_url"]))
	mailbox := strings.TrimSpace(stringOf(args["mailbox"]))
	if deviceType == "" {
		return map[string]any{"err": "params.missing", "msg": "设备类型和设备地址不能为空"}, nil
	}

	provider, err := w.pushProvider(deviceType)
	if err != nil {
		return map[string]any{"err": "device.unsupported",
			"msg": fmt.Sprintf("不支持的设备类型: %s", deviceType)}, nil
	}

	target := deviceURL
	if deviceType == "kindle" {
		target = mailbox
	}
	if target == "" {
		return map[string]any{"err": "params.missing", "msg": "设备地址不能为空"}, nil
	}

	format := strings.ToLower(booktools.PickFormat(book, "EPUB", "MOBI", "AZW3", "PDF", "TXT"))
	if format == "" {
		return map[string]any{"err": "format.not_found", "msg": "书籍没有可推送的格式"}, nil
	}
	path, release, err := booktools.AcquireFormatPath(sourceContext(ctx), w.libraryDB, bookID, format)
	if err != nil {
		return map[string]any{"err": "file.missing", "msg": "格式文件不存在"}, nil
	}

	defer release()
	if _, err := provider.Push(path, target, map[string]any{
		"device_type": deviceType,
		"format":      format,
		"title":       book.Title,
	}); err != nil {
		return map[string]any{"err": "push.failed",
			"msg": fmt.Sprintf("推送失败: %v", err)}, nil
	}

	return map[string]any{
		"err":         "ok",
		"msg":         "推送成功",
		"device_type": deviceType,
		"format":      format,
	}, nil
}

// bookSendToMail 复刻 Python BookSendToMail.post。
func (w *bookWiring) bookSendToMail(ctx *Context, bookID int64, args map[string]any) (map[string]any, error) {
	book, err := bookGetOne(w.Config(""), bookID)
	if err != nil {
		return nil, err
	}
	if book == nil {
		return map[string]any{"err": "book.not_found", "msg": "书籍已不存在"}, nil
	}

	if resp := w.checkPushPermission(ctx); resp != nil {
		return resp, nil
	}

	mailbox := strings.TrimSpace(stringOf(args["mailbox"]))
	if mailbox == "" {
		return map[string]any{"err": "params.missing", "msg": "邮箱地址不能为空"}, nil
	}
	if !strings.Contains(mailbox, "@") {
		return map[string]any{"err": "params.invalid", "msg": "邮箱地址格式错误"}, nil
	}

	provider, err := w.pushProvider("mail")
	if err != nil {
		return map[string]any{"err": "device.unsupported", "msg": "未安装邮件推送插件"}, nil
	}

	format := strings.ToLower(booktools.PickFormat(book, "EPUB", "MOBI", "AZW3", "PDF", "TXT"))
	if format == "" {
		return map[string]any{"err": "format.not_found", "msg": "书籍没有可推送的格式"}, nil
	}
	path, release, err := booktools.AcquireFormatPath(sourceContext(ctx), w.libraryDB, bookID, format)
	if err != nil {
		return map[string]any{"err": "file.missing", "msg": "格式文件不存在"}, nil
	}

	defer release()
	if _, err := provider.Push(path, mailbox, map[string]any{
		"device_type": "mail",
		"format":      format,
		"title":       book.Title,
	}); err != nil {
		return map[string]any{"err": "push.failed",
			"msg": fmt.Sprintf("推送失败: %v", err)}, nil
	}

	return map[string]any{
		"err":     "ok",
		"msg":     "推送成功",
		"mailbox": mailbox,
		"format":  format,
	}, nil
}

// checkPushPermission 复刻 Python 的推送权限校验。
func (w *bookWiring) checkPushPermission(ctx *Context) map[string]any {
	if settingBool(w.settings, "ALLOW_GUEST_PUSH", false) {
		return nil
	}
	if ctx.Identity.UserID == 0 {
		return map[string]any{"err": "user.need_login", "msg": "请先登录"}
	}
	if !ctx.HasPermission("p") {
		return map[string]any{"err": "permission", "msg": "无权操作"}
	}
	if !ctx.IsActive() {
		return map[string]any{"err": "permission", "msg": "无权操作，请先激活账号。"}
	}
	return nil
}

// pushProvider 按设备类型解析 push provider。
func (w *bookWiring) pushProvider(deviceType string) (pluginiface.PushProvider, error) {
	registry := w.pluginRegistry()
	if registry == nil {
		return nil, fmt.Errorf("httpapi: 插件注册表不可用")
	}
	rt := pluginruntime.NewRuntime(w.db, w.settings, registry)
	provider, err := rt.ProviderFor(pushCapability, map[string]any{"device_type": deviceType})
	if err != nil {
		return nil, err
	}
	push, ok := provider.(pluginiface.PushProvider)
	if !ok {
		return nil, fmt.Errorf("httpapi: provider 不支持推送")
	}
	return push, nil
}

// pluginRegistry 返回插件注册表；未接线时返回 nil。
func (w *bookWiring) pluginRegistry() *pluginruntime.PluginRegistry {
	if w.registry != nil {
		return w.registry
	}
	return nil
}
