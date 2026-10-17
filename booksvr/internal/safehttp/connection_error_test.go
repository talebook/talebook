package safehttp

import (
	"context"
	"errors"
	"io"
	"net"
	"strings"
	"testing"

	"talebook/booksvr/internal/pluginproto"
)

func TestConnectionErrorClassification(t *testing.T) {
	for _, tc := range []struct {
		name string
		err  error
		kind string
	}{
		{"eof", io.EOF, "connection"},
		{"truncated", io.ErrUnexpectedEOF, "connection"},
		{"timeout", &net.DNSError{IsTimeout: true}, "timeout"},
		{"refused", errors.New("connection refused"), "connection"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			err := connectionError("GET", "https://user:secret@example.com/search?token=hidden&q=private", tc.err)
			var upstream *pluginproto.UpstreamError
			if !errors.As(err, &upstream) || upstream.ErrorType != tc.kind || !upstream.Retryable {
				t.Fatalf("%+v", err)
			}
			for _, secret := range []string{"secret", "hidden", "private", "user:"} {
				if strings.Contains(err.Error(), secret) {
					t.Fatalf("sensitive URL leaked: %s", err)
				}
			}
			if !strings.Contains(err.Error(), "example.com") {
				t.Fatal("host missing")
			}
		})
	}
	if err := connectionError("GET", "https://example.com", context.Canceled); !errors.Is(err, context.Canceled) {
		t.Fatalf("cancel=%v", err)
	}
	if err := connectionError("POST", "https://example.com", io.EOF).(*pluginproto.UpstreamError); err.Retryable {
		t.Fatal("ambiguous write must not be retried automatically")
	}
}
