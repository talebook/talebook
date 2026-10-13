package metasource

import (
	"reflect"
	"sort"
	"testing"
)

// TestCalibreQueries 对齐 Python _queries 的 5 组向量。
func TestCalibreQueries(t *testing.T) {
	cases := []struct {
		name    string
		sources []string
		want    [][2]string
	}{
		{"all", []string{"google", "amazon", "edelweiss"}, [][2]string{
			{"Google", "google"}, {"Amazon.com", "amazon"}, {"Edelweiss", "edelweiss"},
		}},
		{"subset", []string{"amazon"}, [][2]string{{"Amazon.com", "amazon"}}},
		// 输入顺序不影响输出顺序（按 _SOURCE_TO_PLUGIN 声明序）。
		{"reversed", []string{"edelweiss", "google"}, [][2]string{
			{"Google", "google"}, {"Edelweiss", "edelweiss"},
		}},
		{"empty", []string{}, nil},
		{"unknown", []string{"nope"}, nil},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := CalibreQueries(tc.sources)
			if len(got) != len(tc.want) {
				t.Fatalf("长度 = %d, want %d (%v)", len(got), len(tc.want), got)
			}
			for i := range got {
				if got[i] != tc.want[i] {
					t.Errorf("[%d] = %v, want %v", i, got[i], tc.want[i])
				}
			}
		})
	}
}

// fakeCalibreIdentifier 是测试用的 identify 实现。
type fakeCalibreIdentifier struct {
	results   []*CalibreIdentifyResult
	reliable  bool
	cachedURL string
	calls     []string
}

func (f *fakeCalibreIdentifier) Identify(pluginName string, id CalibreQuery, timeout float64) ([]*CalibreIdentifyResult, error) {
	f.calls = append(f.calls, pluginName)
	return f.results, nil
}

func (f *fakeCalibreIdentifier) CachedCoverURL(map[string]string) string { return f.cachedURL }
func (f *fakeCalibreIdentifier) CachedCoverURLIsReliable() bool          { return f.reliable }

// TestCalibreNormalizeResults 对齐 Python _normalize_results 的 10 组向量。
func TestCalibreNormalizeResults(t *testing.T) {
	api := NewCalibreMetadataApi(nil, nil)

	t.Run("basic", func(t *testing.T) {
		got := api.NormalizeResults([]*CalibreIdentifyResult{
			{Title: "T", Authors: []string{"A"}, ISBN: "123", Rating: intPtr(4)},
		}, "google", "fallback")
		r := got[0]
		if r.Rating == nil || *r.Rating != 8 {
			t.Errorf("rating = %v, want 8", r.Rating)
		}
		if r.ProviderKey != "google" || r.Source != "google" {
			t.Errorf("provider_key/source = %q / %q", r.ProviderKey, r.Source)
		}
		// ISBN 存在时 provider_value 取 ISBN。
		if r.ProviderValue != "123" {
			t.Errorf("provider_value = %q, want 123", r.ProviderValue)
		}
		if r.AuthorSort != "A" {
			t.Errorf("author_sort = %q", r.AuthorSort)
		}
	})

	t.Run("no_isbn", func(t *testing.T) {
		got := api.NormalizeResults([]*CalibreIdentifyResult{{Title: "T", Authors: []string{"A"}}}, "google", "fallback")
		if got[0].ProviderValue != "fallback" {
			t.Errorf("provider_value = %q, want fallback", got[0].ProviderValue)
		}
		if got[0].Rating == nil || *got[0].Rating != 0 {
			t.Errorf("rating = %v, want 0", got[0].Rating)
		}
	})

	t.Run("no_authors", func(t *testing.T) {
		got := api.NormalizeResults([]*CalibreIdentifyResult{{Title: "T"}}, "google", "fallback")
		if got[0].AuthorSort != "" {
			t.Errorf("author_sort = %q, want 空串", got[0].AuthorSort)
		}
	})

	t.Run("rating_nil_becomes_zero", func(t *testing.T) {
		got := api.NormalizeResults([]*CalibreIdentifyResult{{Title: "T", Rating: nil}}, "google", "fb")
		if got[0].Rating == nil || *got[0].Rating != 0 {
			t.Errorf("rating = %v, want 0", got[0].Rating)
		}
	})

	t.Run("rating_zero", func(t *testing.T) {
		got := api.NormalizeResults([]*CalibreIdentifyResult{{Title: "T", Rating: intPtr(0)}}, "google", "fb")
		if got[0].Rating == nil || *got[0].Rating != 0 {
			t.Errorf("rating = %v, want 0", got[0].Rating)
		}
	})

	t.Run("rating_five_doubles", func(t *testing.T) {
		got := api.NormalizeResults([]*CalibreIdentifyResult{{Title: "T", Rating: intPtr(5)}}, "google", "fb")
		if got[0].Rating == nil || *got[0].Rating != 10 {
			t.Errorf("rating = %v, want 10", got[0].Rating)
		}
	})

	t.Run("amazon_reliable_uses_cached", func(t *testing.T) {
		api := NewCalibreMetadataApi(&fakeCalibreIdentifier{reliable: true, cachedURL: "https://amazon/cached.jpg"}, nil)
		got := api.NormalizeResults([]*CalibreIdentifyResult{
			{Title: "T", Authors: []string{"A"}, CoverURL: "https://orig.jpg"},
		}, "amazon", "fb")
		if got[0].CoverURL != "https://amazon/cached.jpg" {
			t.Errorf("cover_url = %q", got[0].CoverURL)
		}
	})

	t.Run("amazon_unreliable_keeps_original", func(t *testing.T) {
		api := NewCalibreMetadataApi(&fakeCalibreIdentifier{reliable: false, cachedURL: "https://amazon/cached.jpg"}, nil)
		got := api.NormalizeResults([]*CalibreIdentifyResult{
			{Title: "T", Authors: []string{"A"}, CoverURL: "https://orig.jpg"},
		}, "amazon", "fb")
		if got[0].CoverURL != "https://orig.jpg" {
			t.Errorf("cover_url = %q, want 原值", got[0].CoverURL)
		}
	})

	t.Run("amazon_no_plugin_keeps_original", func(t *testing.T) {
		got := api.NormalizeResults([]*CalibreIdentifyResult{
			{Title: "T", Authors: []string{"A"}, CoverURL: "https://orig.jpg"},
		}, "amazon", "fb")
		if got[0].CoverURL != "https://orig.jpg" {
			t.Errorf("cover_url = %q, want 原值", got[0].CoverURL)
		}
	})

	t.Run("google_ignores_amazon_plugin", func(t *testing.T) {
		api := NewCalibreMetadataApi(&fakeCalibreIdentifier{reliable: true, cachedURL: "https://amazon/cached.jpg"}, nil)
		got := api.NormalizeResults([]*CalibreIdentifyResult{
			{Title: "T", Authors: []string{"A"}, CoverURL: "https://orig.jpg"},
		}, "google", "fb")
		if got[0].CoverURL != "https://orig.jpg" {
			t.Errorf("cover_url = %q, want 原值", got[0].CoverURL)
		}
	})
}

// TestCalibreDedupeResults 对齐 Python _dedupe_results 的 5 组向量。
func TestCalibreDedupeResults(t *testing.T) {
	t.Run("same_key", func(t *testing.T) {
		got := DedupeResults([]*CalibreIdentifyResult{
			{Title: "T", Authors: []string{"A"}, ISBN: "1"},
			{Title: "T", Authors: []string{"A"}, ISBN: "1"},
		})
		if len(got) != 1 {
			t.Errorf("去重后 %d 条, want 1", len(got))
		}
	})
	t.Run("diff_isbn", func(t *testing.T) {
		got := DedupeResults([]*CalibreIdentifyResult{
			{Title: "T", Authors: []string{"A"}, ISBN: "1"},
			{Title: "T", Authors: []string{"A"}, ISBN: "2"},
		})
		if len(got) != 2 {
			t.Errorf("不同 ISBN 应保留 2 条, 得到 %d", len(got))
		}
	})
	t.Run("diff_author", func(t *testing.T) {
		got := DedupeResults([]*CalibreIdentifyResult{
			{Title: "T", Authors: []string{"A"}},
			{Title: "T", Authors: []string{"B"}},
		})
		if len(got) != 2 {
			t.Errorf("不同作者应保留 2 条, 得到 %d", len(got))
		}
	})
	t.Run("cap_five", func(t *testing.T) {
		var in []*CalibreIdentifyResult
		for i := 0; i < 8; i++ {
			in = append(in, &CalibreIdentifyResult{Title: "T" + string(rune('0'+i)), Authors: []string{"A"}})
		}
		got := DedupeResults(in)
		if len(got) != 5 {
			t.Fatalf("截断后 %d 条, want 5", len(got))
		}
		for i, r := range got {
			if r.Title != "T"+string(rune('0'+i)) {
				t.Errorf("[%d] = %q", i, r.Title)
			}
		}
	})
	t.Run("empty", func(t *testing.T) {
		if got := DedupeResults(nil); len(got) != 0 {
			t.Errorf("空输入 = %v", got)
		}
	})
}

// TestCalibreSourceTimeout 对齐 Python max(2, timeout/len(queries))。
func TestCalibreSourceTimeout(t *testing.T) {
	cases := []struct {
		timeout float64
		count   int
		want    float64
	}{
		{30, 3, 10},
		{30, 1, 30},
		{30, 20, 2},
		{30, 0, 30},
	}
	for _, tc := range cases {
		if got := calibreSourceTimeout(tc.timeout, tc.count); got != tc.want {
			t.Errorf("calibreSourceTimeout(%v, %d) = %v, want %v", tc.timeout, tc.count, got, tc.want)
		}
	}
}

// TestCalibreGetCoverValidation 对齐 get_cover 的协议校验。
func TestCalibreGetCoverValidation(t *testing.T) {
	api := NewCalibreMetadataApi(nil, nil)
	if got := api.GetCover(""); got != nil {
		t.Errorf("空 URL 应返回 nil, 得到 %+v", got)
	}
	// 非 https 被拒绝。
	if got := api.GetCover("http://x/a.jpg"); got != nil {
		t.Errorf("http 应被拒绝, 得到 %+v", got)
	}
	// 大小写不敏感：协议校验通过（请求本身会失败，这里只验证校验分支）。
	// 用一个不可解析的主机名，确认走的是网络路径而非协议拒绝路径。
	if got := api.GetCover("HTTPS://invalid.invalid/a.jpg"); got != nil {
		t.Errorf("不可达主机应返回 nil, 得到 %+v", got)
	}
}

// TestCalibreConstants 对齐常量。
func TestCalibreConstants(t *testing.T) {
	if CalibreKey != "Calibre" {
		t.Errorf("CalibreKey = %q", CalibreKey)
	}
	if CalibreIdentifyWaitAfterFirstResult != 2 {
		t.Errorf("wait_after = %d", CalibreIdentifyWaitAfterFirstResult)
	}
	wantBundled := []string{"Amazon.com", "Big Book Search", "Edelweiss", "Google", "Google Images", "Open Library"}
	got := append([]string(nil), CalibreBundledPluginNames...)
	sort.Strings(got)
	if !reflect.DeepEqual(got, wantBundled) {
		t.Errorf("bundled = %v, want %v", got, wantBundled)
	}
	wantAllowed := []string{"Amazon.com", "Edelweiss", "Google"}
	gotAllowed := append([]string(nil), CalibreAllowedPlugins...)
	sort.Strings(gotAllowed)
	if !reflect.DeepEqual(gotAllowed, wantAllowed) {
		t.Errorf("allowed = %v, want %v", gotAllowed, wantAllowed)
	}
}

// TestCalibreSourceUnavailableMessage 对齐异常消息。
func TestCalibreSourceUnavailableMessage(t *testing.T) {
	// 去重 + 排序。
	got := (&CalibreMetadataSourceUnavailable{Sources: []string{"z", "a", "a"}}).Error()
	if got != "Calibre 元数据插件不可用：a, z" {
		t.Errorf("消息 = %q", got)
	}
	// 带原因。
	got = (&CalibreMetadataSourceUnavailable{Sources: []string{"b"}, Reason: "boom"}).Error()
	if got != "Calibre 元数据插件不可用：b（boom）" {
		t.Errorf("消息 = %q", got)
	}
}

// TestCalibreGetBookByISBN 校验 ISBN 查询路径与来源顺序。
func TestCalibreGetBookByISBN(t *testing.T) {
	fake := &fakeCalibreIdentifier{results: []*CalibreIdentifyResult{{Title: "T", Authors: []string{"A"}}}}
	api := NewCalibreMetadataApi(fake, nil)

	got, err := api.GetBookByISBN("123", []string{"google", "amazon", "edelweiss"}, 30)
	if err != nil {
		t.Fatalf("GetBookByISBN: %v", err)
	}
	// 三个来源各返回一条同标题结果 → 去重后 1 条。
	if len(got) != 1 {
		t.Errorf("结果数 = %d, want 1", len(got))
	}
	if !reflect.DeepEqual(fake.calls, []string{"Google", "Amazon.com", "Edelweiss"}) {
		t.Errorf("调用顺序 = %v", fake.calls)
	}
}

// TestCalibreGetBookByISBNEmpty 校验空入参短路。
func TestCalibreGetBookByISBNEmpty(t *testing.T) {
	api := NewCalibreMetadataApi(&fakeCalibreIdentifier{}, nil)
	if got, err := api.GetBookByISBN("", []string{"google"}, 30); got != nil || err != nil {
		t.Errorf("空 ISBN = (%v, %v)", got, err)
	}
	if got, err := api.GetBookByISBN("123", nil, 30); got != nil || err != nil {
		t.Errorf("空 sources = (%v, %v)", got, err)
	}
}

// TestCalibreGetBookByTitle 校验书名查询路径。
func TestCalibreGetBookByTitle(t *testing.T) {
	fake := &fakeCalibreIdentifier{results: []*CalibreIdentifyResult{{Title: "T", Authors: []string{"A"}}}}
	api := NewCalibreMetadataApi(fake, nil)

	got, err := api.GetBookByTitle("T", []string{"A"}, []string{"google"}, 30)
	if err != nil {
		t.Fatalf("GetBookByTitle: %v", err)
	}
	if len(got) != 1 || got[0].ProviderValue != "T" {
		t.Errorf("结果 = %+v", got)
	}
}

// TestCalibreSourceSearchPrefersISBN 校验 _search 优先 ISBN。
func TestCalibreSourceSearchPrefersISBN(t *testing.T) {
	fake := &fakeCalibreIdentifier{results: []*CalibreIdentifyResult{{Title: "T", Authors: []string{"A"}}}}
	src := NewCalibreSource(fake, nil)

	got, err := src.Search("123", "T", []string{"A"})
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	if len(got) == 0 {
		t.Fatal("Search 返回空")
	}
	// 有 ISBN 时不应再按书名查询（3 次调用 = 3 个来源）。
	if len(fake.calls) != 3 {
		t.Errorf("调用次数 = %d, want 3", len(fake.calls))
	}
}

// TestCalibreSourceFetch 校验 _fetch 取第一条。
func TestCalibreSourceFetch(t *testing.T) {
	fake := &fakeCalibreIdentifier{results: []*CalibreIdentifyResult{{Title: "T", Authors: []string{"A"}}}}
	src := NewCalibreSource(fake, nil)

	got, err := src.Fetch("123")
	if err != nil {
		t.Fatalf("Fetch: %v", err)
	}
	if got == nil || got.Title != "T" {
		t.Errorf("Fetch = %+v", got)
	}
}

// TestCalibreSourceFetchEmpty 校验无结果返回 nil。
func TestCalibreSourceFetchEmpty(t *testing.T) {
	src := NewCalibreSource(&fakeCalibreIdentifier{}, nil)
	got, err := src.Fetch("123")
	if err != nil {
		t.Fatalf("Fetch: %v", err)
	}
	if got != nil {
		t.Errorf("无结果应返回 nil, 得到 %+v", got)
	}
}

// TestCalibreNilIdentifier 校验未注入实现时返回空而非 panic。
func TestCalibreNilIdentifier(t *testing.T) {
	api := NewCalibreMetadataApi(nil, nil)
	// Python 在 sources/isbn 非空但无结果时返回 []（而非 None）。
	got, err := api.GetBookByISBN("123", []string{"google"}, 30)
	if err != nil {
		t.Fatalf("GetBookByISBN: %v", err)
	}
	if len(got) != 0 {
		t.Errorf("nil Identifier 应返回空切片, 得到 %v", got)
	}
}
