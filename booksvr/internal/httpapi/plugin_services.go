package httpapi

import (
	"context"
	"fmt"
	"net/mail"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"talebook/booksvr/internal/pluginbuiltin"
)

func (w *bookWiring) bindKindleServices() {
	provider, err := w.registry.Get("talebook.push.kindle")
	if err != nil {
		return
	}
	kindle, ok := provider.(*pluginbuiltin.KindleProvider)
	if !ok {
		return
	}
	kindle.BindServices(w.sendKindleMail, w.convertKindleMail)
}

func (w *bookWiring) sendKindleMail(_ any, siteURL string, book map[string]any, mailbox, format, path string) error {
	if _, err := mail.ParseAddress(mailbox); err != nil {
		return fmt.Errorf("邮箱地址格式错误")
	}
	settings := w.settings
	if w.settingsPath != "" {
		settings = LoadSettings(w.settingsPath)
	}
	from := settingString(settings, "smtp_username")
	if settingString(settings, "smtp_server") == "" || from == "" {
		return fmt.Errorf("请先配置 SMTP 服务器和发件人")
	}
	info, err := os.Stat(path)
	if err != nil {
		return fmt.Errorf("读取待发送书籍失败: %w", err)
	}
	if !info.Mode().IsRegular() || info.Size() == 0 || info.Size() > 100*1024*1024 {
		return fmt.Errorf("邮件附件必须为 100 MB 以内的非空书籍文件")
	}
	content, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	title := strings.TrimSpace(stringOf(book["title"]))
	if title == "" {
		title = "未命名书籍"
	}
	values := map[string]string{"title": title, "site_title": settingString(settings, "site_title"), "site_url": siteURL}
	render := func(template, fallback string) string {
		if template == "" {
			template = fallback
		}
		for key, value := range values {
			template = strings.ReplaceAll(template, "%("+key+")s", value)
		}
		return template
	}
	return SendMail(MailConfig{Relay: settingString(settings, "smtp_server"), Username: from,
		Password: settingString(settings, "smtp_password"), Encryption: settingString(settings, "smtp_encryption")}, from, mailbox,
		render(settingString(settings, "push_title"), "%(title)s"), render(settingString(settings, "push_content"), "来自 %(site_title)s：%(title)s\n%(site_url)s"),
		content, strings.NewReplacer("\r", "", "\n", "", "/", "_", "\\", "_").Replace(title)+"."+format)
}

// Conversion for sending is temporary: do not add a format to the indexed source
// or retain another body in the library after delivery.
func (w *bookWiring) convertKindleMail(user any, siteURL string, book map[string]any, mailbox string) error {
	src := stringOf(book["fmt_azw3"])
	if src == "" {
		src = stringOf(book["fmt_mobi"])
	}
	converter := ebookConvertPath()
	if src == "" || converter == "" {
		return fmt.Errorf("没有可转换的书籍或 ebook-convert")
	}
	directory, err := os.MkdirTemp("", "talebook-kindle-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(directory)
	destination := filepath.Join(directory, "book.epub")
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()
	if err := exec.CommandContext(ctx, converter, src, destination).Run(); err != nil {
		return fmt.Errorf("Kindle EPUB 转换失败: %w", err)
	}
	return w.sendKindleMail(user, siteURL, book, mailbox, "epub", destination)
}
