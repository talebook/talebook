package metasource

import (
	"reflect"
	"strings"
	"testing"
)

// TestSignParams 对齐 Python _sign_params 的 3 组向量。
func TestSignParams(t *testing.T) {
	cases := []struct {
		name   string
		in     map[string]string
		wantID string
		want   string
	}{
		{"basic", map[string]string{"id": "12345"}, "id", "db471f82adb4a94ba3260b0aefba735a"},
		{"multi", map[string]string{"wd": "三体", "page": "1", "tab": "0"}, "wd", "15a6728d8a995c5141b89aa89cabee1e"},
		{"empty", map[string]string{}, "", "33655f28ef18012076d91811923449d6"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := SignParams(tc.in)
			if got["sign"] != tc.want {
				t.Errorf("sign = %q, want %q", got["sign"], tc.want)
			}
			// 原参数必须保留。
			if tc.wantID != "" && got[tc.wantID] != tc.in[tc.wantID] {
				t.Errorf("参数 %q 被破坏: %q", tc.wantID, got[tc.wantID])
			}
		})
	}
}

// TestMakeQimaoHeaders 对齐 Python _make_headers 的 2 组向量。
func TestMakeQimaoHeaders(t *testing.T) {
	cases := []struct {
		bookID      string
		wantVersion string
		wantSign    string
	}{
		{"00000000", "73325", "4fb24dd1c0d37e0ebe24dc268f7be7f3"},
		{"12345", "73000", "f5f422e0c967fbc1d6aff0db0e14401a"},
	}
	for _, tc := range cases {
		t.Run(tc.bookID, func(t *testing.T) {
			got := MakeQimaoHeaders(tc.bookID)
			if got["app-version"] != tc.wantVersion {
				t.Errorf("app-version = %q, want %q", got["app-version"], tc.wantVersion)
			}
			if got["sign"] != tc.wantSign {
				t.Errorf("sign = %q, want %q", got["sign"], tc.wantSign)
			}
			// 固定字段。
			if got["application-id"] != "com.****.reader" || got["platform"] != "android" {
				t.Errorf("固定字段错误: %v", got)
			}
			if got["AUTHORIZATION"] != "" || got["qm-params"] != "" {
				t.Errorf("空字段错误: %v", got)
			}
		})
	}
}

// TestQimaoBuildMetadata 对齐 Python _metadata 的 13 组向量。
func TestQimaoBuildMetadata(t *testing.T) {
	src := NewQimaoSource(nil)

	t.Run("full", func(t *testing.T) {
		mi := src.BuildMetadata("12345", map[string]any{
			"book_name": "三体", "author_name": "刘慈欣",
			"category1_name": "科幻", "category2_name": "中国文学",
			"abstract": "简介文本", "thumb_url": "https://img.wtzw.com/a.jpg",
		}, false)
		if mi["title"] != "三体" {
			t.Errorf("title = %v", mi["title"])
		}
		if !reflect.DeepEqual(mi["authors"], []any{"刘慈欣"}) {
			t.Errorf("authors = %v", mi["authors"])
		}
		if mi["author"] != "刘慈欣" || mi["author_sort"] != "刘慈欣" {
			t.Errorf("author = %v / %v", mi["author"], mi["author_sort"])
		}
		if mi["publisher"] != nil {
			t.Errorf("publisher = %v, want nil", mi["publisher"])
		}
		if mi["isbn"] != QimaoISBN {
			t.Errorf("isbn = %v", mi["isbn"])
		}
		if !reflect.DeepEqual(mi["tags"], []any{"科幻", "中国文学"}) {
			t.Errorf("tags = %v", mi["tags"])
		}
		if mi["comments"] != "简介文本" {
			t.Errorf("comments = %v", mi["comments"])
		}
		if mi["cover_url"] != "https://img.wtzw.com/a.jpg" {
			t.Errorf("cover_url = %v", mi["cover_url"])
		}
		if mi["website"] != "https://www.qimao.com/shuku/12345/" {
			t.Errorf("website = %v", mi["website"])
		}
		if mi["source"] != "七猫小说" || mi["provider_key"] != QimaoKey {
			t.Errorf("source/provider_key = %v / %v", mi["source"], mi["provider_key"])
		}
		if mi["provider_value"] != "12345" {
			t.Errorf("provider_value = %v", mi["provider_value"])
		}
		if mi["series"] != nil || mi["rating"] != nil {
			t.Errorf("series/rating = %v / %v", mi["series"], mi["rating"])
		}
	})

	t.Run("no_title", func(t *testing.T) {
		if got := src.BuildMetadata("1", map[string]any{"author_name": "X"}, false); got != nil {
			t.Errorf("无 title 应返回 nil, 得到 %v", got)
		}
	})

	t.Run("no_author", func(t *testing.T) {
		mi := src.BuildMetadata("1", map[string]any{"book_name": "T"}, false)
		if !reflect.DeepEqual(mi["authors"], []any{"佚名"}) {
			t.Errorf("authors = %v", mi["authors"])
		}
		if mi["comments"] != "" {
			t.Errorf("comments = %v, want 空串", mi["comments"])
		}
		if mi["cover_url"] != "" {
			t.Errorf("cover_url = %v, want 空串", mi["cover_url"])
		}
	})

	t.Run("tags_string", func(t *testing.T) {
		mi := src.BuildMetadata("1", map[string]any{"book_name": "T", "tags": "a，b, c"}, false)
		if !reflect.DeepEqual(mi["tags"], []any{"a", "b", "c"}) {
			t.Errorf("tags = %v", mi["tags"])
		}
	})

	t.Run("tags_list", func(t *testing.T) {
		mi := src.BuildMetadata("1", map[string]any{"book_name": "T", "tags": []any{"x", "y"}}, false)
		if !reflect.DeepEqual(mi["tags"], []any{"x", "y"}) {
			t.Errorf("tags = %v", mi["tags"])
		}
	})

	t.Run("tags_cap", func(t *testing.T) {
		raw := make([]any, 0, 12)
		for i := 0; i < 12; i++ {
			raw = append(raw, "t"+string(rune('0'+i)))
		}
		mi := src.BuildMetadata("1", map[string]any{"book_name": "T", "tags": raw}, false)
		want := []any{"t0", "t1", "t2", "t3", "t4", "t5", "t6", "t7"}
		if !reflect.DeepEqual(mi["tags"], want) {
			t.Errorf("tags = %v, want %v", mi["tags"], want)
		}
	})

	t.Run("tags_category_name", func(t *testing.T) {
		mi := src.BuildMetadata("1", map[string]any{"book_name": "T", "category_name": "网文"}, false)
		if !reflect.DeepEqual(mi["tags"], []any{"网文"}) {
			t.Errorf("tags = %v", mi["tags"])
		}
	})

	t.Run("tags_ptags", func(t *testing.T) {
		mi := src.BuildMetadata("1", map[string]any{"book_name": "T", "ptags": "p1,p2"}, false)
		if !reflect.DeepEqual(mi["tags"], []any{"p1", "p2"}) {
			t.Errorf("tags = %v", mi["tags"])
		}
	})

	t.Run("tags_empty", func(t *testing.T) {
		mi := src.BuildMetadata("1", map[string]any{"book_name": "T"}, false)
		if !reflect.DeepEqual(mi["tags"], []any{}) {
			t.Errorf("tags = %v, want 空切片", mi["tags"])
		}
	})

	t.Run("intro_fallback", func(t *testing.T) {
		mi := src.BuildMetadata("1", map[string]any{"book_name": "T", "intro": "来自intro"}, false)
		if mi["comments"] != "来自intro" {
			t.Errorf("comments = %v", mi["comments"])
		}
	})

	t.Run("summary_fallback", func(t *testing.T) {
		mi := src.BuildMetadata("1", map[string]any{"book_name": "T", "summary": "来自summary"}, false)
		if mi["comments"] != "来自summary" {
			t.Errorf("comments = %v", mi["comments"])
		}
	})

	t.Run("cover_fallback", func(t *testing.T) {
		mi := src.BuildMetadata("1", map[string]any{"book_name": "T", "image_link": "https://x/b.png"}, false)
		if mi["cover_url"] != "https://x/b.png" {
			t.Errorf("cover_url = %v", mi["cover_url"])
		}
	})

	t.Run("title_fallback", func(t *testing.T) {
		mi := src.BuildMetadata("1", map[string]any{"title": "备用标题"}, false)
		if mi["title"] != "备用标题" {
			t.Errorf("title = %v", mi["title"])
		}
	})
}

// TestQimaoCoverExtension 对齐封面扩展名提取的 4 组向量。
func TestQimaoCoverExtension(t *testing.T) {
	cases := []struct{ url, want string }{
		{"https://x/a.jpg", "jpg"},
		{"https://x/a.PNG?w=100", "png"},
		{"https://x/a.bmp", "jpg"}, // 白名单外回落 jpg
		{"https://x/a", "jpg"},
	}
	for _, tc := range cases {
		got := "jpg"
		if m := qimaoCoverExtRe.FindStringSubmatch(tc.url); m != nil {
			ext := lowerASCII(m[1])
			if i := strings.IndexByte(ext, '?'); i >= 0 {
				ext = ext[:i]
			}
			if qimaoImageFormats[ext] {
				got = ext
			}
		}
		if got != tc.want {
			t.Errorf("扩展名(%q) = %q, want %q", tc.url, got, tc.want)
		}
	}
}

// TestQimaoConstants 校验常量与 Python 一致。
func TestQimaoConstants(t *testing.T) {
	if QimaoISBN != "0000000000004" {
		t.Errorf("QimaoISBN = %q", QimaoISBN)
	}
	if QimaoKey != "QimaoNovel" {
		t.Errorf("QimaoKey = %q", QimaoKey)
	}
	if QimaoSignKey != "d3dGiJc651gSQ8w1" {
		t.Errorf("QimaoSignKey = %q", QimaoSignKey)
	}
	if QimaoTimeout != 15 {
		t.Errorf("QimaoTimeout = %d", QimaoTimeout)
	}
	if len(QimaoVersionList) != 21 {
		t.Errorf("VERSION_LIST 长度 = %d, want 21", len(QimaoVersionList))
	}
	if QimaoVersionList[0] != "73720" || QimaoVersionList[20] != "62112" {
		t.Errorf("VERSION_LIST 首尾 = %q / %q", QimaoVersionList[0], QimaoVersionList[20])
	}
}

// TestQimaoGetCoverEmptyURL 校验空 URL 返回 nil。
func TestQimaoGetCoverEmptyURL(t *testing.T) {
	src := NewQimaoSource(nil)
	if got := src.GetCover(""); got != nil {
		t.Errorf("空 URL 应返回 nil, 得到 %+v", got)
	}
}

// TestFirstNonEmptyString 校验 `a or b or c` 取值链。
func TestFirstNonEmptyString(t *testing.T) {
	item := map[string]any{"a": "", "b": nil, "c": "hit", "d": "later"}
	if got := firstNonEmptyString(item, "a", "b", "c", "d"); got != "hit" {
		t.Errorf("取值链 = %q, want hit", got)
	}
	if got := firstNonEmptyString(item, "missing"); got != "" {
		t.Errorf("全缺失 = %q", got)
	}
	// 数字按 str() 语义转换。
	if got := firstNonEmptyString(map[string]any{"id": float64(42)}, "id"); got != "42" {
		t.Errorf("数字 = %q, want 42", got)
	}
}

// TestEncodeQuery 校验查询串按键排序编码。
func TestEncodeQuery(t *testing.T) {
	got := encodeQuery(map[string]string{"b": "2", "a": "1"})
	if got != "a=1&b=2" {
		t.Errorf("encodeQuery = %q", got)
	}
}
