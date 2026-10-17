package pluginruntime

import (
	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginproto"
	"testing"
)

func TestCapabilityValueResultsNormalizeForHTTP(t *testing.T) {
	for _, tc := range []struct {
		name  string
		value any
	}{
		{"page", plugindomain.Page{Items: []any{"book"}}},
		{"detail", plugindomain.SourceBookDetail{Title: "西游记"}},
		{"content", plugindomain.SourceContent{Content: "第一回"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			rt, conn := newRuntimeWithDispatcher(t, func(string, []any, map[string]any) (any, error) { return tc.value, nil })
			out, err := rt.Read(conn, "get_book", nil, CallOptions{})
			if err != nil {
				t.Fatal(err)
			}
			switch tc.name {
			case "page":
				if _, ok := out.(*plugindomain.Page); !ok {
					t.Fatalf("%T", out)
				}
			case "detail":
				if _, ok := out.(*plugindomain.SourceBookDetail); !ok {
					t.Fatalf("%T", out)
				}
			case "content":
				if _, ok := out.(*plugindomain.SourceContent); !ok {
					t.Fatalf("%T", out)
				}
			}
		})
	}
}

func TestRedactConnectionFailureKeepsRetryable(t *testing.T) {
	in := pluginproto.NewUpstreamError("connection secret failed", "connection", nil)
	in.Retryable = true
	out := RedactedException(in, map[string]any{"token": "secret"}).(*pluginproto.UpstreamError)
	if !out.Retryable || out.Message != "connection [REDACTED] failed" {
		t.Fatalf("%+v", out)
	}
}
