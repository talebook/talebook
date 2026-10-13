package booksource

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

// veneraSyntaxServer 返回一个固定 JSON 响应的测试服务。
//
// 必须是 TLS：Venera 源脚本只允许 https 请求。
func veneraSyntaxServer(t *testing.T, body string) *httptest.Server {
	t.Helper()
	srv := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(body))
	}))
	t.Cleanup(srv.Close)
	return srv
}

// runVeneraSyntax 用给定脚本跑一次 browse，返回结果与错误。
func runVeneraSyntax(t *testing.T, srv *httptest.Server, script string) (map[string]any, error) {
	t.Helper()
	cfg := DefaultVeneraConfig()
	cfg.TimeoutSeconds = 10
	return RunVeneraSource(context.Background(), script, "browse",
		map[string]any{"category": "recent", "page": 1}, cfg, newVeneraTestClient(t, srv))
}

// TestVeneraHostSupportsRealScriptSyntax 验证 host shim 覆盖真实 Venera 源脚本
// 常用的 ES 语法与内置对象。
//
// 背景：goja 不支持逻辑赋值运算符（??= / ||= / &&=）、for await、顶层 await、
// BigInt。真实源脚本（如 manga_dex.js）大量使用可选链、空值合并、class field、
// Map/Set、展开运算符与 async/await。本用例把这些语法集中跑一遍，确保 shim
// 与 goja 的组合不会在解析或执行阶段失败。
func TestVeneraHostSupportsRealScriptSyntax(t *testing.T) {
	srv := veneraSyntaxServer(t, `{"maxPage":1,"comics":[{"id":"m1","title":"示例漫画"}]}`)

	// 注意：按官方源文档，源脚本必须 `extends ComicSource` 并暴露
	// key === 'manga_dex'（见 venera_host.go）。缺少任一项都会被运行时拒绝。
	script := `
class MangaDex extends ComicSource {
    key = 'manga_dex';
    settings = {lang: {default: 'zh'}};

    constructor() {
        super();
        this.api = {
            getRecent: async (page) => {
                const response = await Network.get('https://api.mangadex.org/manga?page=' + page);
                const body = JSON.parse(response.body);
                const items = body?.comics ?? [];
                const titles = items.map((item) => item?.title ?? '');
                const seen = new Set(titles);
                const index = new Map(titles.map((title, i) => [title, i]));
                const merged = [...seen].flatMap((title) => [title, index.get(title)]);
                return {
                    comics: merged.map((value) => new Comic({id: String(value), title: String(value)})),
                    maxPage: body?.maxPage ?? 1,
                    locale: APP.locale,
                    version: APP.version,
                    setting: this.loadSetting('lang'),
                };
            },
        };
    }
}`

	got, err := runVeneraSyntax(t, srv, script)
	if err != nil {
		t.Fatalf("RunVeneraSource: %v", err)
	}
	if got == nil {
		t.Fatal("result 不应为 nil")
	}
	if got["maxPage"] != float64(1) {
		t.Errorf("maxPage = %v", got["maxPage"])
	}
	// 脚本返回的 comics 是 Comic 实例数组，经 __run 序列化为对象数组。
	comics, _ := got["comics"].([]any)
	if len(comics) == 0 {
		t.Fatalf("comics 不应为空: %#v", got)
	}
	first, _ := comics[0].(map[string]any)
	if first["title"] != "示例漫画" {
		t.Errorf("title = %v，期望 示例漫画", first["title"])
	}
	if first["id"] != "示例漫画" {
		t.Errorf("id = %v，期望 示例漫画（Map/Set 展平结果）", first["id"])
	}
	// APP 与 loadSetting 在 host shim 中可用。
	if got["version"] != "1.6.3" {
		t.Errorf("version = %v，期望 1.6.3", got["version"])
	}
	if got["setting"] != "zh" {
		t.Errorf("setting = %v，期望 zh", got["setting"])
	}
}

// TestVeneraHostRejectsLogicalAssignment 记录 goja 的已知语法缺口。
//
// 逻辑赋值运算符（??= / ||= / &&=）在 goja 中无法解析。真实源脚本若使用它们，
// 必须在 host shim 侧展开为显式赋值（见 venera_host.go 的 saveData）。
// 本用例把该限制固化为可执行的证据，避免后续误以为已支持。
func TestVeneraHostRejectsLogicalAssignment(t *testing.T) {
	srv := veneraSyntaxServer(t, `{}`)

	script := `
class MangaDex {
    constructor() {
        this.key = 'manga_dex';
        this.api = {
            getRecent: async (page) => {
                let value = null;
                value ??= 'fallback';
                return {comics: [], maxPage: 1, value: value};
            },
        };
    }
}`

	_, err := runVeneraSyntax(t, srv, script)
	if err == nil {
		t.Skip("当前 goja 版本已支持 ??=，可移除 venera_host.go 中的限制说明")
	}
	// 运行时出于安全考虑把底层错误统一包装为通用文案，
	// 因此这里只断言「确实失败」，不断言具体错误文本。
	t.Logf("goja 拒绝 ??=（预期行为）: %v", err)
}

// TestVeneraHostSupportsOptionalChainingAndNullish 验证可选链与空值合并可用。
func TestVeneraHostSupportsOptionalChainingAndNullish(t *testing.T) {
	srv := veneraSyntaxServer(t, `{"data":null}`)

	script := `
class MangaDex {
    constructor() {
        this.key = 'manga_dex';
        this.api = {
            getRecent: async (page) => {
                const response = await Network.get('https://api.mangadex.org/manga');
                const body = JSON.parse(response.body);
                const items = body?.data ?? [];
                const first = items?.[0]?.attributes?.title ?? 'none';
                return {comics: [], maxPage: 1, first: first};
            },
        };
    }
}`

	if _, err := runVeneraSyntax(t, srv, script); err != nil {
		t.Fatalf("可选链/空值合并应可用: %v", err)
	}
}

// TestVeneraHostSupportsClassFieldAndMapSet 验证 class field 与 Map/Set 可用。
func TestVeneraHostSupportsClassFieldAndMapSet(t *testing.T) {
	srv := veneraSyntaxServer(t, `{}`)

	script := `
class MangaDex {
    key = 'manga_dex';
    cache = new Map();
    tags = new Set(['a', 'b']);

    constructor() {
        this.cache.set('k', 'v');
        this.api = {
            getRecent: async (page) => {
                const list = [...this.tags];
                return {comics: [], maxPage: 1, cached: this.cache.get('k'), list: list};
            },
        };
    }
}`

	if _, err := runVeneraSyntax(t, srv, script); err != nil {
		t.Fatalf("class field 与 Map/Set 应可用: %v", err)
	}
}

// TestVeneraHostRejectsUnsupportedAPIs 验证未实现的 host API 明确报错。
func TestVeneraHostRejectsUnsupportedAPIs(t *testing.T) {
	srv := veneraSyntaxServer(t, `{}`)

	cases := []struct {
		name string
		body string
	}{
		{"Network.post", `Network.post('https://api.mangadex.org/x', {}, '')`},
		{"Network.getCookies", `Network.getCookies()`},
		{"Network.deleteCookies", `Network.deleteCookies()`},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			script := `
class MangaDex {
    constructor() {
        this.key = 'manga_dex';
        this.api = {
            getRecent: async (page) => {
                ` + tc.body + `;
                return {comics: [], maxPage: 1};
            },
        };
    }
}`
			_, err := runVeneraSyntax(t, srv, script)
			if err == nil {
				t.Fatalf("%s 应报错", tc.name)
			}
			// 运行时把底层错误统一包装为通用文案（不向调用方泄露脚本内部细节），
			// 因此这里只断言「确实失败」。
			t.Logf("%s 被拒绝（预期行为）: %v", tc.name, err)
		})
	}
}
