package httpapi

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"golang.org/x/text/encoding/simplifiedchinese"
)

func TestTxtReaderInitializesAndReadsChapters(t *testing.T) {
	w, db := newWriteFixture(t)
	insertBook(t, db, 1, "测试小说")
	insertItem(t, db, 1, "public", 1)
	path := filepath.Join(t.TempDir(), "novel.txt")
	body := "第一章 开始\n你好<script>alert(1)</script>\n第二章 后续\n再见\n"
	encoded, err := simplifiedchinese.GB18030.NewEncoder().Bytes([]byte(body))
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, encoded, 0600); err != nil {
		t.Fatal(err)
	}
	seedFormat(t, db, 1, "TXT", path)
	id := seedReader(t, db, "txt-reader", "test-password", true, true)
	ctx := adminCtx(id)
	ctx.DB = db
	ctx.Request = httptest.NewRequest(http.MethodGet, rBookTxtInit+"?id=1&test=0", nil)
	resp, err := BookTxtInitHandler(w.Config(""))(ctx)
	if err != nil || resp["err"] != "ok" {
		t.Fatalf("init: %v %v", resp, err)
	}
	chapters := resp["data"].(map[string]any)["content"].([]map[string]any)
	if len(chapters) != 2 || chapters[1]["title"] != "第二章 后续" {
		t.Fatalf("toc: %v", chapters)
	}
	ctx.Request.URL.Path = rBookTxtRead
	ctx.Request.URL.RawQuery = "id=1&start=0&end=" + fmt.Sprint(chapters[0]["end"])
	resp, err = w.bookReadTxt(ctx, 1)
	content, _ := resp["content"].(string)
	if err != nil || !strings.Contains(content, "你好&lt;script&gt;") || strings.Contains(content, "第二章") {
		t.Fatalf("chapter: %v %v", resp, err)
	}
	if _, leaked := resp["raw_text"]; leaked {
		t.Fatal("full text leaked in chapter response")
	}
}

func TestTxtInitVisibilityAndGuestPermission(t *testing.T) {
	w, db := newWriteFixture(t)
	owner := seedReader(t, db, "txt-owner", "test-password", true, true)
	insertBook(t, db, 1, "私藏小说")
	insertItem(t, db, 1, "private", owner)
	path := filepath.Join(t.TempDir(), "novel.txt")
	if err := os.WriteFile(path, []byte("第一章 开始\n正文"), 0600); err != nil {
		t.Fatal(err)
	}
	seedFormat(t, db, 1, "TXT", path)
	for _, test := range []struct {
		name      string
		user      int64
		guestRead bool
		want      string
	}{
		{"guest disabled", 0, false, "user.need_login"},
		{"private guest", 0, true, "permission"},
		{"owner", owner, false, "ok"},
	} {
		t.Run(test.name, func(t *testing.T) {
			cfg := w.Config("")
			cfg.AllowGuestRead = test.guestRead
			ctx := &Context{DB: db, Identity: Identity{UserID: test.user}, Request: httptest.NewRequest(http.MethodGet, rBookTxtInit+"?id=1", nil)}
			resp, err := BookTxtInitHandler(cfg)(ctx)
			if err != nil || resp["err"] != test.want {
				t.Fatalf("%v %v", resp, err)
			}
		})
	}
	if _, err := db.Exec(`UPDATE items SET scope='public' WHERE book_id=1`); err != nil {
		t.Fatal(err)
	}
	cfg := w.Config("")
	cfg.AllowGuestRead = true
	ctx := &Context{DB: db, Request: httptest.NewRequest(http.MethodGet, rBookTxtInit+"?id=1", nil)}
	resp, err := BookTxtInitHandler(cfg)(ctx)
	if err != nil || resp["err"] != "ok" {
		t.Fatalf("public guest: %v %v", resp, err)
	}
}
