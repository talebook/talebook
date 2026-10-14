// 本文件实现 Talebook 的邮件发送，复刻 Python webserver/services/mail.py。
//
// 用 Go 标准库 net/smtp + crypto/tls，不引入第三方依赖。
package httpapi

import (
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"mime"
	"net"
	"net/smtp"
	"strconv"
	"strings"
	"time"
)

// MailConfig 是一次发信的参数，对应 Python do_send_mail 的关键字参数。
type MailConfig struct {
	// Relay 是 SMTP 服务器，可带端口（如 smtp.qq.com:465）。
	Relay string
	// Username / Password 是登录凭据。
	Username string
	Password string
	// Encryption 是 "SSL" 或 "TLS"，对应 Python 的 encryption。
	Encryption string
	// Timeout 是连接超时；为 0 时用 20 秒（与 Python 一致）。
	Timeout time.Duration
}

// defaultSMTPPort 对齐 Python：SSL 用 465，其余用 25。
func defaultSMTPPort(encryption string) int {
	if strings.EqualFold(encryption, "SSL") {
		return 465
	}
	return 25
}

// splitRelay 把 "host:port" 拆成主机与端口。
//
// 支持 IPv6 字面量形式 "[::1]:25"；端口非法时回落到默认端口。
func splitRelay(relay, encryption string) (string, int) {
	relay = strings.TrimSpace(relay)
	if relay == "" {
		return "", defaultSMTPPort(encryption)
	}
	// IPv6：[addr]:port
	if strings.HasPrefix(relay, "[") {
		if host, portStr, err := net.SplitHostPort(relay); err == nil {
			if p, err := strconv.Atoi(portStr); err == nil {
				return host, p
			}
			return host, defaultSMTPPort(encryption)
		}
		return strings.Trim(relay, "[]"), defaultSMTPPort(encryption)
	}
	// 普通 host:port（只按最后一个冒号拆，兼容多冒号主机名）
	if idx := strings.LastIndex(relay, ":"); idx > 0 {
		host := relay[:idx]
		if p, err := strconv.Atoi(relay[idx+1:]); err == nil {
			return host, p
		}
		return host, defaultSMTPPort(encryption)
	}
	return relay, defaultSMTPPort(encryption)
}

// SendMail 发送一封纯文本邮件（可带附件）。
//
// 对应 Python MailService.do_send_mail：SSL 直连、TLS 走 STARTTLS，
// 有用户名密码时登录。附件为 nil 时只发正文。
func SendMail(cfg MailConfig, from, to, subject, body string, attachment []byte, attachmentName string) error {
	host, port := splitRelay(cfg.Relay, cfg.Encryption)
	if host == "" {
		return fmt.Errorf("SMTP 服务器未配置")
	}
	timeout := cfg.Timeout
	if timeout <= 0 {
		timeout = 20 * time.Second
	}

	raw := buildMIMEMessage(from, to, subject, body, attachment, attachmentName)
	addr := net.JoinHostPort(host, strconv.Itoa(port))

	var client *smtp.Client
	if strings.EqualFold(cfg.Encryption, "SSL") {
		conn, err := tls.DialWithDialer(&net.Dialer{Timeout: timeout}, "tcp", addr,
			&tls.Config{ServerName: host})
		if err != nil {
			return fmt.Errorf("连接 SMTP 服务器失败: %w", err)
		}
		client, err = smtp.NewClient(conn, host)
		if err != nil {
			_ = conn.Close()
			return fmt.Errorf("建立 SMTP 会话失败: %w", err)
		}
	} else {
		conn, err := net.DialTimeout("tcp", addr, timeout)
		if err != nil {
			return fmt.Errorf("连接 SMTP 服务器失败: %w", err)
		}
		client, err = smtp.NewClient(conn, host)
		if err != nil {
			_ = conn.Close()
			return fmt.Errorf("建立 SMTP 会话失败: %w", err)
		}
		// TLS 表示 STARTTLS（与 Python 的 encryption == 'TLS' 一致）。
		if strings.EqualFold(cfg.Encryption, "TLS") {
			if ok, _ := client.Extension("STARTTLS"); ok {
				if err := client.StartTLS(&tls.Config{ServerName: host}); err != nil {
					_ = client.Close()
					return fmt.Errorf("STARTTLS 失败: %w", err)
				}
			}
		}
	}
	defer func() { _ = client.Close() }()

	if cfg.Username != "" && cfg.Password != "" {
		auth := smtp.PlainAuth("", cfg.Username, cfg.Password, host)
		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("SMTP 登录失败: %w", err)
		}
	}
	if err := client.Mail(from); err != nil {
		return fmt.Errorf("设置发件人失败: %w", err)
	}
	if err := client.Rcpt(to); err != nil {
		return fmt.Errorf("设置收件人失败: %w", err)
	}
	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("开始发送邮件正文失败: %w", err)
	}
	if _, err := w.Write([]byte(raw)); err != nil {
		_ = w.Close()
		return fmt.Errorf("写入邮件正文失败: %w", err)
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("结束邮件正文失败: %w", err)
	}
	return client.Quit()
}

// buildMIMEMessage 组装 MIME 邮件。
//
// 主题与附件名用 RFC 2047 编码，保证中文正确；正文用 UTF-8 base64。
func buildMIMEMessage(from, to, subject, body string, attachment []byte, attachmentName string) string {
	var b strings.Builder
	b.WriteString("From: " + from + "\r\n")
	b.WriteString("To: " + to + "\r\n")
	b.WriteString("Subject: " + mime.QEncoding.Encode("utf-8", subject) + "\r\n")
	b.WriteString("Date: " + time.Now().Format(time.RFC1123Z) + "\r\n")
	b.WriteString("MIME-Version: 1.0\r\n")

	if len(attachment) == 0 {
		b.WriteString("Content-Type: text/plain; charset=\"utf-8\"\r\n")
		b.WriteString("Content-Transfer-Encoding: base64\r\n\r\n")
		b.WriteString(wrapBase64(body))
		return b.String()
	}

	boundary := "talebook-boundary-8f3a1c"
	b.WriteString("Content-Type: multipart/mixed; boundary=\"" + boundary + "\"\r\n\r\n")
	b.WriteString("--" + boundary + "\r\n")
	b.WriteString("Content-Type: text/plain; charset=\"utf-8\"\r\n")
	b.WriteString("Content-Transfer-Encoding: base64\r\n\r\n")
	b.WriteString(wrapBase64(body))
	b.WriteString("\r\n--" + boundary + "\r\n")
	b.WriteString("Content-Type: application/octet-stream\r\n")
	b.WriteString("Content-Transfer-Encoding: base64\r\n")
	b.WriteString("Content-Disposition: attachment; filename=\"" +
		mime.QEncoding.Encode("utf-8", attachmentName) + "\"\r\n\r\n")
	b.WriteString(wrapBase64Bytes(attachment))
	b.WriteString("\r\n--" + boundary + "--\r\n")
	return b.String()
}

// wrapBase64 把文本按 base64 编码并每 76 字符换行（RFC 2045）。
func wrapBase64(s string) string {
	return wrapBase64Bytes([]byte(s))
}

// wrapBase64Bytes 把字节按 base64 编码并每 76 字符换行。
func wrapBase64Bytes(data []byte) string {
	encoded := base64.StdEncoding.EncodeToString(data)
	var b strings.Builder
	for len(encoded) > 76 {
		b.WriteString(encoded[:76])
		b.WriteString("\r\n")
		encoded = encoded[76:]
	}
	b.WriteString(encoded)
	return b.String()
}
