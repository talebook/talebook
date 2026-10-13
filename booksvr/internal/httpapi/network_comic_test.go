package httpapi

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"talebook/booksvr/internal/booksource"
	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginruntime"
	"talebook/booksvr/internal/sourcecatalog"
	"talebook/booksvr/internal/tornadosign"
)

// onlineComicFixture 是一次在线漫画测试的完整环境。
type onlineComicFixture struct {
	DB      *sql.DB
	Cfg     OnlineComicConfig
	Catalog *sourcecatalog.Service
	Secret  string
}

// newOnlineComicFixture 建库、注册 venera 书源 provider 并返回可用的配置。
//
// handler 用于模拟 provider 的 get_chapter 返回值。
func newOnlineComicFixture(t *testing.T, pluginKey string,
	handler func(string, []any, map[string]any) (any, error)) *onlineComicFixture {
	t.Helper()
	db := netSchemaDB(t)
	if _, err := db.Exec(`INSERT INTO readers (id, username, password, admin, active, permission, create_time)
		VALUES (1, 'admin', 'x', 1, 1, '', '2026-01-01 00:00:00')`); err != nil {
		t.Fatalf("插入管理员失败: %v", err)
	}

	reg := pluginruntime.NewPluginRegistry()
	p := &netProvider{manifest: netManifest(pluginKey), handler: handler}
	caps := pluginiface.CapabilitySet{
		Interfaces:   map[string]bool{"SourceProvider": true},
		HasSelfCheck: true,
		DownloadMode: pluginiface.DownloadNone,
		Methods: map[string]bool{
			"search": true, "browse": true, "get_categories": true, "get_book": true,
			"download": true, "get_toc": true, "get_chapter": true, "self_check": true,
		},
	}
	if _, err := reg.Register(p, caps); err != nil {
		t.Fatalf("Register: %v", err)
	}

	secret := "comic-secret-123"
	settings := map[string]any{"PLUGIN_SECRET_KEY": "test-key-123", "cookie_secret": secret}
	rt := pluginruntime.NewRuntime(db, settings, reg)
	catalog, err := sourcecatalog.NewService(db, settings, 1, rt)
	if err != nil {
		t.Fatalf("NewService: %v", err)
	}
	if _, err := db.Exec(`UPDATE plugin_installations SET enabled = 1`); err != nil {
		t.Fatalf("enable: %v", err)
	}
	// 图片接口要求连接具备 books.read + network.read 两个 scope。
	if _, err := db.Exec(`UPDATE plugin_connections SET scopes = '["books.read","network.read"]'`); err != nil {
		t.Fatalf("scopes: %v", err)
	}

	cfg := OnlineComicConfig{
		Settings: settings,
		Catalog:  func(*Context) (*sourcecatalog.Service, error) { return catalog, nil },
		Now:      func() int64 { return 1700000000 },
	}
	return &onlineComicFixture{DB: db, Cfg: cfg, Catalog: catalog, Secret: secret}
}

// onlineComicSourceKey 返回目录里第一条 venera 绑定的 key。
func onlineComicSourceKey(t *testing.T, fx *onlineComicFixture) string {
	t.Helper()
	bindings, err := fx.Catalog.Bindings()
	if err != nil {
		t.Fatalf("Bindings: %v", err)
	}
	for _, b := range bindings {
		if b.PluginKey == booksource.VeneraPluginID {
			return b.Key
		}
	}
	t.Fatalf("未找到 venera 绑定: %+v", bindings)
	return ""
}

// onlineComicCtx 构造一个测试用 Context（默认已登录且激活）。
func onlineComicCtx(t *testing.T, db *sql.DB, target string, userID int64) *Context {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, target, strings.NewReader(""))
	return &Context{
		Request:  req,
		Writer:   httptest.NewRecorder(),
		DB:       db,
		Identity: Identity{UserID: userID},
	}
}

// onlineComicRecorder 取回响应记录器。
func onlineComicRecorder(ctx *Context) *httptest.ResponseRecorder {
	return ctx.Writer.(*httptest.ResponseRecorder)
}

// ---- 路由 ----

func TestOnlineComicRouteSpecs(t *testing.T) {
	specs := OnlineComicRouteSpecs(OnlineComicConfig{})
	if len(specs) != 3 {
		t.Fatalf("len = %d, want 3", len(specs))
	}
	want := map[string]bool{
		"/api/book-sources/comic/pages": false,
		"/api/book-sources/comic/image": false,
		"/read-online-comic":            false,
	}
	for _, s := range specs {
		if _, ok := want[s.Pattern]; !ok {
			t.Errorf("意外路由 %q", s.Pattern)
			continue
		}
		want[s.Pattern] = true
		if !s.Auth {
			t.Errorf("%s 应要求登录", s.Pattern)
		}
	}
	for pattern, seen := range want {
		if !seen {
			t.Errorf("缺少路由 %q", pattern)
		}
	}
}

// ---- public_image / comic_book ----

func TestPublicImageSignsToken(t *testing.T) {
	fx := newOnlineComicFixture(t, booksource.VeneraPluginID, nil)
	ctx := onlineComicCtx(t, fx.DB, "/", 1)

	got, err := fx.Cfg.publicImage(ctx, "venera:1",
		map[string]any{"url": "https://uploads.mangadex.org/covers/a/b.jpg"})
	if err != nil {
		t.Fatalf("publicImage: %v", err)
	}
	if !strings.HasPrefix(got, "/api/book-sources/comic/image?token=") {
		t.Fatalf("地址前缀不对: %q", got)
	}

	// token 必须能被同一密钥解回原始 payload。
	raw := strings.TrimPrefix(got, "/api/book-sources/comic/image?token=")
	token, err := url.QueryUnescape(raw)
	if err != nil {
		t.Fatalf("QueryUnescape: %v", err)
	}
	decoded := tornadosign.Decode(fx.Secret, OnlineComicTokenName, []byte(token),
		OnlineComicTokenMaxAgeDays, fx.Cfg.Now)
	if len(decoded) == 0 {
		t.Fatal("token 无法解码")
	}
	var payload map[string]any
	if err := json.Unmarshal(decoded, &payload); err != nil {
		t.Fatalf("payload 不是 JSON: %v", err)
	}
	if int64(payload["user_id"].(float64)) != 1 {
		t.Errorf("user_id = %v", payload["user_id"])
	}
	if payload["source_id"] != "venera:1" {
		t.Errorf("source_id = %v", payload["source_id"])
	}
	image := payload["image"].(map[string]any)
	if image["url"] != "https://uploads.mangadex.org/covers/a/b.jpg" {
		t.Errorf("image.url = %v", image["url"])
	}
}

func TestPublicImageRejectsForeignHost(t *testing.T) {
	fx := newOnlineComicFixture(t, booksource.VeneraPluginID, nil)
	ctx := onlineComicCtx(t, fx.DB, "/", 1)

	if _, err := fx.Cfg.publicImage(ctx, "venera:1",
		map[string]any{"url": "https://evil.example.com/a.jpg"}); err == nil {
		t.Fatal("非白名单域名应被拒绝")
	}
}

func TestComicBookRewritesComicCover(t *testing.T) {
	fx := newOnlineComicFixture(t, booksource.VeneraPluginID, nil)
	ctx := onlineComicCtx(t, fx.DB, "/", 1)

	item := map[string]any{
		"media_type":      "comic",
		"online_readable": true,
		"cover_url":       "https://uploads.mangadex.org/covers/a/b.jpg",
	}
	got := fx.Cfg.OnlineComicBook(ctx, item, "venera:1")
	if !strings.HasPrefix(got["cover_url"].(string), "/api/book-sources/comic/image?token=") {
		t.Errorf("cover_url 未改写: %v", got["cover_url"])
	}
}

func TestComicBookLeavesNonComicAlone(t *testing.T) {
	fx := newOnlineComicFixture(t, booksource.VeneraPluginID, nil)
	ctx := onlineComicCtx(t, fx.DB, "/", 1)

	cases := []map[string]any{
		{"media_type": "novel", "online_readable": true, "cover_url": "https://uploads.mangadex.org/c.jpg"},
		{"media_type": "comic", "online_readable": false, "cover_url": "https://uploads.mangadex.org/c.jpg"},
		{"media_type": "comic", "online_readable": true, "cover_url": ""},
	}
	for i, item := range cases {
		got := fx.Cfg.OnlineComicBook(ctx, item, "venera:1")
		if got["cover_url"] != item["cover_url"] {
			t.Errorf("case %d: cover_url 被改写为 %v", i, got["cover_url"])
		}
	}
}

func TestComicCoverRewriterNilContext(t *testing.T) {
	fx := newOnlineComicFixture(t, booksource.VeneraPluginID, nil)
	hook := OnlineComicCoverRewriter(fx.Cfg)
	book := map[string]any{"media_type": "comic", "cover_url": "https://uploads.mangadex.org/c.jpg"}
	got := hook(nil, book, "venera:1")
	if got["cover_url"] != "https://uploads.mangadex.org/c.jpg" {
		t.Errorf("nil Context 应原样返回，得到 %v", got["cover_url"])
	}
}

// ---- /api/book-sources/comic/pages ----

func TestOnlineComicPagesSuccess(t *testing.T) {
	fx := newOnlineComicFixture(t, booksource.VeneraPluginID,
		func(method string, args []any, _ map[string]any) (any, error) {
			if method != "get_chapter" {
				t.Errorf("method = %q", method)
			}
			chapter := args[0].(plugindomain.SourceChapter)
			if chapter.ExternalID != "chap-1" {
				t.Errorf("chapter = %q", chapter.ExternalID)
			}
			return &plugindomain.SourceContent{
				Title: "第 1 话",
				Extra: map[string]any{
					"images": []any{
						map[string]any{"url": "https://uploads.mangadex.org/data/a/1.jpg"},
						map[string]any{"url": "https://uploads.mangadex.org/data/a/2.jpg"},
					},
				},
			}, nil
		})
	key := onlineComicSourceKey(t, fx)
	ctx := onlineComicCtx(t, fx.DB, "/api/book-sources/comic/pages?source_id="+url.QueryEscape(key)+"&chapter_url=chap-1", 1)

	got, err := OnlineComicPagesHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "ok" {
		t.Fatalf("err = %v, msg = %v", got["err"], got["msg"])
	}
	pages := got["pages"].([]map[string]any)
	if len(pages) != 2 {
		t.Fatalf("pages = %d, want 2", len(pages))
	}
	if pages[0]["id"] != "0" || pages[1]["id"] != "1" {
		t.Errorf("id 应为序号字符串: %v / %v", pages[0]["id"], pages[1]["id"])
	}
	for i, page := range pages {
		if !strings.HasPrefix(page["url"].(string), "/api/book-sources/comic/image?token=") {
			t.Errorf("page %d url = %v", i, page["url"])
		}
	}
}

func TestOnlineComicPagesRejectsNonVeneraSource(t *testing.T) {
	fx := newOnlineComicFixture(t, sourcecatalog.LegadoPluginID, nil)
	ctx := onlineComicCtx(t, fx.DB, "/api/book-sources/comic/pages?source_id=legado:1&chapter_url=chap-1", 1)

	got, err := OnlineComicPagesHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "venera.unsupported" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestOnlineComicPagesRequiresChapter(t *testing.T) {
	fx := newOnlineComicFixture(t, booksource.VeneraPluginID, nil)
	key := onlineComicSourceKey(t, fx)
	ctx := onlineComicCtx(t, fx.DB, "/api/book-sources/comic/pages?source_id="+url.QueryEscape(key), 1)

	got, err := OnlineComicPagesHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrParamsError {
		t.Errorf("err = %v", got["err"])
	}
}

func TestOnlineComicPagesInactiveUser(t *testing.T) {
	fx := newOnlineComicFixture(t, booksource.VeneraPluginID, nil)
	if _, err := fx.DB.Exec(`UPDATE readers SET active = 0 WHERE id = 1`); err != nil {
		t.Fatalf("update: %v", err)
	}
	ctx := onlineComicCtx(t, fx.DB, "/api/book-sources/comic/pages", 1)

	got, err := OnlineComicPagesHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "user.activation_required" {
		t.Errorf("err = %v", got["err"])
	}
}

func TestOnlineComicPagesNoReadPermission(t *testing.T) {
	fx := newOnlineComicFixture(t, booksource.VeneraPluginID, nil)
	if _, err := fx.DB.Exec(`UPDATE readers SET permission = 'R' WHERE id = 1`); err != nil {
		t.Fatalf("update: %v", err)
	}
	ctx := onlineComicCtx(t, fx.DB, "/api/book-sources/comic/pages", 1)

	got, err := OnlineComicPagesHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != ErrNotPermit {
		t.Errorf("err = %v", got["err"])
	}
}

func TestOnlineComicPagesProviderError(t *testing.T) {
	fx := newOnlineComicFixture(t, booksource.VeneraPluginID,
		func(string, []any, map[string]any) (any, error) {
			return nil, pluginruntime.NewPluginRuntimeError("source.fetch_failed", "上游 500", true)
		})
	key := onlineComicSourceKey(t, fx)
	ctx := onlineComicCtx(t, fx.DB, "/api/book-sources/comic/pages?source_id="+url.QueryEscape(key)+"&chapter_url=c", 1)

	got, err := OnlineComicPagesHandler(fx.Cfg)(ctx)
	if err != nil {
		t.Fatalf("handler: %v", err)
	}
	if got["err"] != "source.fetch_failed" {
		t.Errorf("err = %v", got["err"])
	}
}

// ---- /api/book-sources/comic/image ----

// onlineComicImageToken 为指定用户与源签一个图片 token。
func onlineComicImageToken(t *testing.T, fx *onlineComicFixture, userID int64, sourceKey string, image map[string]any) string {
	t.Helper()
	payload, err := json.Marshal(map[string]any{
		"user_id": userID, "source_id": sourceKey, "image": image,
	})
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	return tornadosign.Sign(fx.Secret, OnlineComicTokenName, string(payload), fx.Cfg.Now())
}

func TestOnlineComicImageSuccess(t *testing.T) {
	fx := newOnlineComicFixture(t, booksource.VeneraPluginID, nil)
	key := onlineComicSourceKey(t, fx)
	image := map[string]any{"url": "https://uploads.mangadex.org/data/a/1.jpg"}
	token := onlineComicImageToken(t, fx, 1, key, image)

	fx.Cfg.FetchImage = func(_ context.Context, got map[string]any) (string, []byte, error) {
		if got["url"] != image["url"] {
			t.Errorf("image.url = %v", got["url"])
		}
		return "image/jpeg", []byte{0xFF, 0xD8, 0xFF}, nil
	}
	ctx := onlineComicCtx(t, fx.DB, "/api/book-sources/comic/image?token="+url.QueryEscape(token), 1)

	if _, err := OnlineComicImageHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	rec := onlineComicRecorder(ctx)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	if got := rec.Header().Get("Content-Type"); got != "image/jpeg" {
		t.Errorf("Content-Type = %q", got)
	}
	if got := rec.Header().Get("Cache-Control"); got != "private, no-store" {
		t.Errorf("Cache-Control = %q", got)
	}
	if got := rec.Header().Get("X-Content-Type-Options"); got != "nosniff" {
		t.Errorf("X-Content-Type-Options = %q", got)
	}
	if got := rec.Header().Get("Content-Security-Policy"); got != "default-src 'none'; sandbox" {
		t.Errorf("CSP = %q", got)
	}
	if rec.Body.Len() != 3 {
		t.Errorf("body len = %d", rec.Body.Len())
	}
}

func TestOnlineComicImageRejectsGuest(t *testing.T) {
	fx := newOnlineComicFixture(t, booksource.VeneraPluginID, nil)
	ctx := onlineComicCtx(t, fx.DB, "/api/book-sources/comic/image?token=x", 0)

	if _, err := OnlineComicImageHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if rec := onlineComicRecorder(ctx); rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", rec.Code)
	}
}

func TestOnlineComicImageRejectsInactive(t *testing.T) {
	fx := newOnlineComicFixture(t, booksource.VeneraPluginID, nil)
	if _, err := fx.DB.Exec(`UPDATE readers SET active = 0 WHERE id = 1`); err != nil {
		t.Fatalf("update: %v", err)
	}
	ctx := onlineComicCtx(t, fx.DB, "/api/book-sources/comic/image?token=x", 1)

	if _, err := OnlineComicImageHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if rec := onlineComicRecorder(ctx); rec.Code != http.StatusForbidden {
		t.Errorf("status = %d, want 403", rec.Code)
	}
}

func TestOnlineComicImageRejectsBadToken(t *testing.T) {
	fx := newOnlineComicFixture(t, booksource.VeneraPluginID, nil)
	cases := []struct {
		name  string
		token string
	}{
		{"空 token", ""},
		{"乱码 token", "not-a-token"},
		{"签名不符", "2|1:0|1700000000|" + OnlineComicTokenName + "|e30=|deadbeef"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			ctx := onlineComicCtx(t, fx.DB, "/api/book-sources/comic/image?token="+url.QueryEscape(tc.token), 1)
			if _, err := OnlineComicImageHandler(fx.Cfg)(ctx); err != nil {
				t.Fatalf("handler: %v", err)
			}
			if rec := onlineComicRecorder(ctx); rec.Code != http.StatusForbidden {
				t.Errorf("status = %d, want 403", rec.Code)
			}
		})
	}
}

func TestOnlineComicImageRejectsForeignUser(t *testing.T) {
	fx := newOnlineComicFixture(t, booksource.VeneraPluginID, nil)
	key := onlineComicSourceKey(t, fx)
	// token 属于用户 2，但请求者是用户 1。
	token := onlineComicImageToken(t, fx, 2, key, map[string]any{"url": "https://uploads.mangadex.org/data/a/1.jpg"})
	ctx := onlineComicCtx(t, fx.DB, "/api/book-sources/comic/image?token="+url.QueryEscape(token), 1)

	if _, err := OnlineComicImageHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if rec := onlineComicRecorder(ctx); rec.Code != http.StatusForbidden {
		t.Errorf("status = %d, want 403", rec.Code)
	}
}

func TestOnlineComicImageRejectsForeignHost(t *testing.T) {
	fx := newOnlineComicFixture(t, booksource.VeneraPluginID, nil)
	key := onlineComicSourceKey(t, fx)
	token := onlineComicImageToken(t, fx, 1, key, map[string]any{"url": "https://evil.example.com/a.jpg"})
	ctx := onlineComicCtx(t, fx.DB, "/api/book-sources/comic/image?token="+url.QueryEscape(token), 1)

	if _, err := OnlineComicImageHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if rec := onlineComicRecorder(ctx); rec.Code != http.StatusForbidden {
		t.Errorf("status = %d, want 403", rec.Code)
	}
}

func TestOnlineComicImageRejectsMissingScope(t *testing.T) {
	fx := newOnlineComicFixture(t, booksource.VeneraPluginID, nil)
	if _, err := fx.DB.Exec(`UPDATE plugin_connections SET scopes = '["books.read"]'`); err != nil {
		t.Fatalf("update: %v", err)
	}
	key := onlineComicSourceKey(t, fx)
	token := onlineComicImageToken(t, fx, 1, key, map[string]any{"url": "https://uploads.mangadex.org/data/a/1.jpg"})
	ctx := onlineComicCtx(t, fx.DB, "/api/book-sources/comic/image?token="+url.QueryEscape(token), 1)

	if _, err := OnlineComicImageHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if rec := onlineComicRecorder(ctx); rec.Code != http.StatusForbidden {
		t.Errorf("status = %d, want 403", rec.Code)
	}
}

func TestOnlineComicImageFetchFailureIs502(t *testing.T) {
	fx := newOnlineComicFixture(t, booksource.VeneraPluginID, nil)
	key := onlineComicSourceKey(t, fx)
	token := onlineComicImageToken(t, fx, 1, key, map[string]any{"url": "https://uploads.mangadex.org/data/a/1.jpg"})
	fx.Cfg.FetchImage = func(context.Context, map[string]any) (string, []byte, error) {
		return "", nil, errors.New("上游超时")
	}
	ctx := onlineComicCtx(t, fx.DB, "/api/book-sources/comic/image?token="+url.QueryEscape(token), 1)

	if _, err := OnlineComicImageHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	rec := onlineComicRecorder(ctx)
	if rec.Code != http.StatusBadGateway {
		t.Fatalf("status = %d, want 502", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "漫画图片获取失败") {
		t.Errorf("body = %q", rec.Body.String())
	}
	if got := rec.Header().Get("Cache-Control"); got != "no-store" {
		t.Errorf("Cache-Control = %q", got)
	}
}

// ---- /read-online-comic ----

func TestOnlineComicReaderSuccess(t *testing.T) {
	fx := newOnlineComicFixture(t, booksource.VeneraPluginID, nil)
	key := onlineComicSourceKey(t, fx)
	ctx := onlineComicCtx(t, fx.DB, "/read-online-comic?source_id="+url.QueryEscape(key), 1)

	if _, err := OnlineComicReaderHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	rec := onlineComicRecorder(ctx)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
	if got := rec.Header().Get("Cache-Control"); got != "no-store" {
		t.Errorf("Cache-Control = %q", got)
	}
	if got := rec.Header().Get("Referrer-Policy"); got != "same-origin" {
		t.Errorf("Referrer-Policy = %q", got)
	}
	body := rec.Body.String()
	if !strings.Contains(body, `id="online-comic-reader"`) {
		t.Errorf("缺少挂载点: %s", body)
	}
	if !strings.Contains(body, "data-source-key=\""+key+"\"") {
		t.Errorf("缺少 source key: %s", body)
	}
}

func TestOnlineComicReaderRedirectsGuest(t *testing.T) {
	fx := newOnlineComicFixture(t, booksource.VeneraPluginID, nil)
	ctx := onlineComicCtx(t, fx.DB, "/read-online-comic?source_id=x", 0)

	if _, err := OnlineComicReaderHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	rec := onlineComicRecorder(ctx)
	if rec.Code != http.StatusFound {
		t.Fatalf("status = %d, want 302", rec.Code)
	}
	if loc := rec.Header().Get("Location"); loc != "/login" {
		t.Errorf("Location = %q", loc)
	}
}

func TestOnlineComicReaderRejectsInactive(t *testing.T) {
	fx := newOnlineComicFixture(t, booksource.VeneraPluginID, nil)
	if _, err := fx.DB.Exec(`UPDATE readers SET active = 0 WHERE id = 1`); err != nil {
		t.Fatalf("update: %v", err)
	}
	ctx := onlineComicCtx(t, fx.DB, "/read-online-comic?source_id=x", 1)

	if _, err := OnlineComicReaderHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if rec := onlineComicRecorder(ctx); rec.Code != http.StatusForbidden {
		t.Errorf("status = %d, want 403", rec.Code)
	}
}

func TestOnlineComicReaderUnknownSourceIs404(t *testing.T) {
	fx := newOnlineComicFixture(t, booksource.VeneraPluginID, nil)
	ctx := onlineComicCtx(t, fx.DB, "/read-online-comic?source_id=missing", 1)

	if _, err := OnlineComicReaderHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if rec := onlineComicRecorder(ctx); rec.Code != http.StatusNotFound {
		t.Errorf("status = %d, want 404", rec.Code)
	}
}

func TestOnlineComicReaderNonVeneraSourceIs404(t *testing.T) {
	fx := newOnlineComicFixture(t, sourcecatalog.LegadoPluginID, nil)
	ctx := onlineComicCtx(t, fx.DB, "/read-online-comic?source_id=legado:1", 1)

	if _, err := OnlineComicReaderHandler(fx.Cfg)(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if rec := onlineComicRecorder(ctx); rec.Code != http.StatusNotFound {
		t.Errorf("status = %d, want 404", rec.Code)
	}
}

// ---- 小工具 ----

func TestOnlineComicTruthy(t *testing.T) {
	cases := []struct {
		value any
		want  bool
	}{
		{nil, false}, {true, true}, {false, false},
		{"", false}, {"x", true},
		{float64(0), false}, {float64(1), true},
		{int(0), false}, {int64(2), true},
		{[]any{}, false}, {[]any{1}, true},
		{map[string]any{}, false}, {map[string]any{"a": 1}, true},
	}
	for _, tc := range cases {
		if got := onlineComicTruthy(tc.value); got != tc.want {
			t.Errorf("onlineComicTruthy(%#v) = %v, want %v", tc.value, got, tc.want)
		}
	}
}

func TestOnlineComicAsFloat(t *testing.T) {
	cases := []struct {
		value any
		want  float64
	}{
		{float64(1.5), 1.5}, {float32(2), 2}, {int(3), 3}, {int64(4), 4},
		{json.Number("5.5"), 5.5}, {"x", 0}, {nil, 0},
	}
	for _, tc := range cases {
		if got := onlineComicAsFloat(tc.value); got != tc.want {
			t.Errorf("onlineComicAsFloat(%#v) = %v, want %v", tc.value, got, tc.want)
		}
	}
}

func TestOnlineComicAnyList(t *testing.T) {
	if got := onlineComicAnyList(nil); len(got) != 0 {
		t.Errorf("nil → %v", got)
	}
	if got := onlineComicAnyList("x"); len(got) != 0 {
		t.Errorf("string → %v", got)
	}
	if got := onlineComicAnyList([]any{1, 2}); len(got) != 2 {
		t.Errorf("list → %v", got)
	}
}

func TestOnlineComicImageMIMEs(t *testing.T) {
	for _, mime := range []string{"image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"} {
		if !onlineComicImageMIMEs[mime] {
			t.Errorf("%s 应在允许集合内", mime)
		}
	}
	for _, mime := range []string{"text/html", "application/json", "image/svg+xml", ""} {
		if onlineComicImageMIMEs[mime] {
			t.Errorf("%s 不应在允许集合内", mime)
		}
	}
}
