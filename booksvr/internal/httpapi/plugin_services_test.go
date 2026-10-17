package httpapi

import (
	"bufio"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	"talebook/booksvr/internal/pluginbuiltin"
)

// Exercise handler -> registry -> Kindle -> a real loopback SMTP receiver.
func TestKindleHTTPMailDelivery(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	received := make(chan string, 1)
	go func() {
		connection, err := listener.Accept()
		if err != nil {
			received <- ""
			return
		}
		defer connection.Close()
		connection.SetDeadline(time.Now().Add(10 * time.Second))
		fmt.Fprint(connection, "220 test SMTP\r\n")
		reader := bufio.NewReader(connection)
		var message strings.Builder
		for {
			line, err := reader.ReadString('\n')
			if err != nil {
				received <- ""
				return
			}
			switch {
			case strings.HasPrefix(line, "DATA"):
				fmt.Fprint(connection, "354 continue\r\n")
				for {
					line, err = reader.ReadString('\n')
					if err != nil {
						received <- ""
						return
					}
					if line == ".\r\n" {
						break
					}
					message.WriteString(line)
				}
				fmt.Fprint(connection, "250 accepted\r\n")
			case strings.HasPrefix(line, "QUIT"):
				fmt.Fprint(connection, "221 bye\r\n")
				received <- message.String()
				return
			default:
				fmt.Fprint(connection, "250 test\r\n")
			}
		}
	}()
	w, directory := newToolsFixture(t)
	w.settings["smtp_server"] = listener.Addr().String()
	w.settings["smtp_username"] = "sender@example.test"
	w.settings["smtp_encryption"] = ""
	insertBook(t, w.libraryDB, 1, "测试邮件书籍")
	insertItem(t, w.libraryDB, 1, "public", 1)
	seedRealFormat(t, w, directory, 1, "EPUB", "PK\x03\x04attachment-payload")
	provider, _ := w.registry.Get("talebook.push.kindle")
	if report, err := provider.(*pluginbuiltin.KindleProvider).SelfCheck(nil); err != nil || !report.Healthy {
		t.Fatalf("Kindle service not bound: %+v %v", report, err)
	}
	for _, kind := range []string{"mail", "kindle"} {
		if _, err := w.pushProvider(kind); err != nil {
			t.Fatalf("%s: %v", kind, err)
		}
	}
	result, err := w.bookSendToMail(adminCtx(1), 1, map[string]any{"mailbox": "reader@example.test"})
	if err != nil || result["err"] != "ok" {
		t.Fatalf("result=%v err=%v", result, err)
	}
	select {
	case message := <-received:
		if !strings.Contains(message, "To: reader@example.test") || !strings.Contains(message, "Content-Disposition: attachment;") || !strings.Contains(message, "UEsDBGF0dGFjaG1lbnQtcGF5bG9hZA==") {
			t.Fatalf("invalid delivery %s", message)
		}
	case <-time.After(12 * time.Second):
		t.Fatal("SMTP delivery did not finish")
	}
}

func TestSMTPRejectsTLSDowngrade(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	done := make(chan bool, 1)
	go func() {
		connection, err := listener.Accept()
		if err != nil {
			done <- false
			return
		}
		defer connection.Close()
		connection.SetDeadline(time.Now().Add(3 * time.Second))
		fmt.Fprint(connection, "220 test SMTP\r\n")
		reader := bufio.NewReader(connection)
		for {
			line, err := reader.ReadString('\n')
			if err != nil {
				done <- true
				return
			}
			if strings.HasPrefix(line, "MAIL") || strings.HasPrefix(line, "AUTH") {
				done <- false
				return
			}
			fmt.Fprint(connection, "250 test without TLS\r\n")
		}
	}()
	err = SendMail(MailConfig{Relay: listener.Addr().String(), Encryption: "TLS", Timeout: 2 * time.Second}, "a@example.test", "b@example.test", "subject", "body", nil, "")
	if err == nil || !strings.Contains(err.Error(), "STARTTLS") {
		t.Fatalf("TLS downgrade accepted: %v", err)
	}
	if !<-done {
		t.Fatal("SMTP sent credentials or message without requested encryption")
	}
}

func TestKindleConversionRemovesTemporaryFilesOnMailFailure(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("POSIX converter fixture")
	}
	directory := t.TempDir()
	converter := filepath.Join(directory, "ebook-convert")
	if err := os.WriteFile(converter, []byte("#!/bin/sh\nprintf 'converted EPUB' > \"$2\"\n"), 0700); err != nil {
		t.Fatal(err)
	}
	temporary := filepath.Join(directory, "temporary")
	if err := os.Mkdir(temporary, 0700); err != nil {
		t.Fatal(err)
	}
	t.Setenv("BOOKSVR_EBOOK_CONVERT", converter)
	t.Setenv("TMPDIR", temporary)
	w, _ := newToolsFixture(t)
	err := w.convertKindleMail(1, "", map[string]any{"title": "test", "fmt_mobi": "source.mobi"}, "reader@example.test")
	if err == nil || !strings.Contains(err.Error(), "SMTP") {
		t.Fatalf("expected mail failure after conversion: %v", err)
	}
	entries, err := os.ReadDir(temporary)
	if err != nil || len(entries) != 0 {
		t.Fatalf("temporary bodies retained: %v %v", entries, err)
	}
}
