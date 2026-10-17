package pluginbuiltin

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"sync"
	"testing"
	"time"

	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginruntime"
)

type liveAuditBody struct {
	io.ReadCloser
	cancel context.CancelFunc
}

func (b *liveAuditBody) Close() error { defer b.cancel(); return b.ReadCloser.Close() }

// TestAuditLivePublicServices is opt-in: it writes no production state and uses no credentials.
// A passing unit suite does not replace the per-provider results in the JSON report.
func TestAuditLivePublicServices(t *testing.T) {
	reportPath := os.Getenv("TALEBOOK_PLUGIN_LIVE_REPORT")
	if reportPath == "" {
		t.Skip("explicit live-service audit only")
	}
	reg := pluginruntime.NewPluginRegistry()
	if err := Register(reg); err != nil {
		t.Fatal(err)
	}
	original := http.DefaultTransport
	defer func() { http.DefaultTransport = original }()
	var mu sync.Mutex
	var trace []map[string]any
	deadline := time.Now()
	http.DefaultTransport = auditTransport(func(r *http.Request) (*http.Response, error) {
		ctx, cancel := context.WithDeadline(r.Context(), deadline)
		response, err := original.RoundTrip(r.Clone(ctx))
		item := map[string]any{"host": r.URL.Hostname(), "path": r.URL.Path}
		if err != nil {
			item["error"] = err.Error()
			cancel()
		} else {
			item["http_status"] = response.StatusCode
			response.Body = &liveAuditBody{response.Body, cancel}
		}
		mu.Lock()
		trace = append(trace, item)
		mu.Unlock()
		return response, err
	})
	var results []map[string]any
	for _, p := range reg.Providers() {
		id := p.Manifest()["id"].(string)
		result := map[string]any{"id": id, "name": p.Manifest()["name"]}
		deadline = time.Now().Add(60 * time.Second)
		trace = nil
		ctx := map[string]any{"config": map[string]any{}}
		count := 0
		var err error
		probed := false
		switch id {
		case "talebook.combo.open-library", "talebook.meta.douban-v2", "talebook.meta.baike", "talebook.meta.xhsd", "talebook.meta.tomato", "talebook.meta.qimao", "talebook.meta.neodb", "talebook.meta.calibre":
			var rows []plugindomain.BookMetadata
			rows, err = p.(pluginiface.MetadataProvider).SearchBooks(plugindomain.MetadataQuery{Title: "西游记", ISBN: "9787020008735"}, ctx)
			count = len(rows)
			probed = true
		case "talebook.review.neodb", "talebook.review.google-books", "talebook.review.bangumi", "talebook.review.anilist":
			var page plugindomain.Page
			page, err = p.(pluginiface.ReviewProvider).GetReviews(map[string]any{"isbn": "9780141439518", "title": "Pride and Prejudice", "domain_id": "30013"}, ctx)
			count = len(page.Items)
			if len(page.Failures) > 0 {
				result["failures"] = page.Failures
			}
			probed = true
		case "talebook.source.standard-ebooks", "talebook.source.gutenberg", "talebook.source.internet-archive", "talebook.source.venera":
			var page plugindomain.Page
			if id == "talebook.source.venera" {
				ctx["config"] = map[string]any{"source": "MangaDex", "timeout_seconds": float64(12)}
			}
			page, err = p.(pluginiface.SourceProvider).Browse("", nil, ctx)
			count = len(page.Items)
			probed = true
		case "talebook.combo.weread", "talebook.review.hardcover", "talebook.annotation.brs":
			result["status"] = "blocked_credentials"
			result["reason"] = "未提供测试账号或令牌；仅受控响应测试，不向真实账号写入"
		case "talebook.source.opds", "talebook.source.kavita", "talebook.source.komga", "talebook.source.booklore", "talebook.source.webdav", "talebook.source.legado":
			result["status"] = "blocked_configuration"
			result["reason"] = "没有独立测试服务或已绑定书源；协议功能以隔离服务验证"
		case "talebook.source.tomato-downloader":
			_, statErr := os.Stat("/opt/tomato/downloader")
			result["status"] = "blocked_binary"
			if statErr == nil {
				result["reason"] = "存在二进制，需校验发行摘要及隔离输出后才能运行"
			} else {
				result["reason"] = "当前运行环境没有 /opt/tomato/downloader"
			}
		case "talebook.push.kindle":
			result["status"] = "unavailable"
			result["reason"] = "邮件回调未接入；不得将静态自检认作发送成功"
		case "talebook.push.duokan", "talebook.push.boox", "talebook.push.hanwang", "talebook.push.ireader", "talebook.push.dangdang", "talebook.push.purelibro":
			result["status"] = "blocked_device"
			result["reason"] = "未提供对应真实设备；已验证独立 multipart 请求和拒绝路径"
		default:
			result["status"] = "local_functional_tests"
			result["reason"] = "本地扫描/工具由独立临时文件验证"
		}
		if probed {
			result["items"] = count
			result["requests"] = trace
			switch {
			case err != nil:
				result["status"] = "failed"
				result["error"] = err.Error()
			case count == 0:
				result["status"] = "no_usable_result"
				for _, request := range trace {
					code, _ := request["http_status"].(int)
					if request["error"] != nil || code >= 400 {
						result["status"] = "failed"
						break
					}
				}
			default:
				result["status"] = "live_pass"
			}
		}
		results = append(results, result)
		raw, _ := json.Marshal(result)
		t.Log(string(raw))
		// Persist after each provider so an interruption does not discard the audit.
		raw, _ = json.MarshalIndent(results, "", "  ")
		if err := os.WriteFile(reportPath, raw, 0600); err != nil {
			t.Fatal(err)
		}
	}
	if len(results) != 39 {
		t.Fatalf("audit count=%d", len(results))
	}
}
