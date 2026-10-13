package metasource

import (
	"encoding/json"
	"reflect"
	"strings"
	"testing"
)

// aiPromptTail 截取提示词中随输入变化的部分，便于断言。
func aiPromptTail(prompt string) string {
	i := strings.Index(prompt, "Book to look up:")
	if i < 0 {
		return prompt
	}
	return prompt[i:]
}

// TestAIBuildPrompt 对齐 Python _build_prompt 的 10 组向量。
func TestAIBuildPrompt(t *testing.T) {
	api := NewAIBookApi("http://x", "k", "m", false, true)

	cases := []struct {
		name     string
		title    string
		author   string
		evidence []map[string]any
		wantTail string
	}{
		{
			name: "basic", title: "《三体》", author: "刘慈欣",
			wantTail: "Book to look up: 三体 by 刘慈欣\nEvidence JSON: not supplied\n",
		},
		{
			name: "no_author", title: "三体",
			wantTail: "Book to look up: 三体\nEvidence JSON: not supplied\n",
		},
		{
			name: "unknown_author", title: "三体", author: "佚名",
			wantTail: "Book to look up: 三体\nEvidence JSON: not supplied\n",
		},
		{
			name: "unknown_author_en", title: "三体", author: "Unknown",
			wantTail: "Book to look up: 三体\nEvidence JSON: not supplied\n",
		},
		{
			name: "evidence_nil", title: "三体", author: "刘慈欣", evidence: nil,
			wantTail: "Book to look up: 三体 by 刘慈欣\nEvidence JSON: not supplied\n",
		},
		{
			name: "evidence_empty", title: "三体", author: "刘慈欣", evidence: []map[string]any{},
			wantTail: "Book to look up: 三体 by 刘慈欣\nEvidence JSON: []\n",
		},
		{
			name: "evidence_one", title: "三体", author: "刘慈欣",
			evidence: []map[string]any{{
				"source": "douban", "title": "三体", "author": "刘慈欣",
				"intro": "科幻", "junk": "x", "empty": "",
			}},
			wantTail: "Book to look up: 三体 by 刘慈欣\n" +
				`Evidence JSON: [{"source": "douban", "title": "三体", "author": "刘慈欣", "intro": "科幻"}]` + "\n",
		},
		{
			name: "marks", title: "《三体》「全集」【1】<x>",
			wantTail: "Book to look up: 三体全集1x\nEvidence JSON: not supplied\n",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := aiPromptTail(api.BuildPrompt(tc.title, tc.author, tc.evidence))
			if got != tc.wantTail {
				t.Errorf("BuildPrompt tail =\n%q\nwant\n%q", got, tc.wantTail)
			}
		})
	}
}

// TestAIBuildPromptEvidenceCap 校验 evidence 截断到 8 条。
func TestAIBuildPromptEvidenceCap(t *testing.T) {
	api := NewAIBookApi("http://x", "k", "m", false, true)
	evidence := make([]map[string]any, 0, 12)
	for i := 0; i < 12; i++ {
		evidence = append(evidence, map[string]any{"title": "b" + string(rune('0'+i))})
	}
	got := aiPromptTail(api.BuildPrompt("T", "", evidence))
	want := "Book to look up: T\nEvidence JSON: " +
		`[{"title": "b0"}, {"title": "b1"}, {"title": "b2"}, {"title": "b3"}, ` +
		`{"title": "b4"}, {"title": "b5"}, {"title": "b6"}, {"title": "b7"}]` + "\n"
	if got != want {
		t.Errorf("BuildPrompt =\n%q\nwant\n%q", got, want)
	}
}

// TestAIBuildPromptEvidenceNonDict 校验非 dict 项被跳过。
func TestAIBuildPromptEvidenceNonDict(t *testing.T) {
	api := NewAIBookApi("http://x", "k", "m", false, true)
	// Go 侧 evidence 类型为 []map[string]any，非 dict 项无法表达；
	// 这里用 nil 元素模拟 Python 的 `not isinstance(item, dict)` 分支。
	got := aiPromptTail(api.BuildPrompt("T", "", []map[string]any{nil, {"title": "ok"}}))
	want := "Book to look up: T\nEvidence JSON: " + `[{"title": "ok"}]` + "\n"
	if got != want {
		t.Errorf("BuildPrompt =\n%q\nwant\n%q", got, want)
	}
}

// TestAIBuildPromptHeader 校验提示词头部与 Python 模板逐字一致。
func TestAIBuildPromptHeader(t *testing.T) {
	api := NewAIBookApi("http://x", "k", "m", false, true)
	prompt := api.BuildPrompt("三体", "刘慈欣", nil)
	wantHeader := "You are a book metadata assistant. Return book information as JSON using only the supplied evidence.\n" +
		"\n" +
		"Instructions:\n" +
		"- Output ONLY a valid JSON object, no other text.\n" +
		"- Never add facts that are absent from the evidence.\n" +
		"- If the evidence is empty, conflicting, or does not identify the requested book, set status to \"unknown\".\n" +
		"\n" +
		"JSON schema (example):\n" +
		"{\n" +
		"  \"status\": \"ok\",\n" +
		"  \"title\": \"...\",\n" +
		"  \"authors\": [\"...\"],\n" +
		"  \"publisher\": \"...\",\n" +
		"  \"pubdate\": \"YYYY-MM-DD\",\n" +
		"  \"isbn\": \"ISBN-13\",\n" +
		"  \"summary\": \"...\",\n" +
		"  \"tags\": [\"...\"]\n" +
		"}\n" +
		"\n"
	if !strings.HasPrefix(prompt, wantHeader) {
		t.Errorf("提示词头部不匹配:\n%q", prompt)
	}
}

// TestParseAIResponse 对齐 Python _parse_ai_response 的 6 组向量。
func TestParseAIResponse(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want map[string]any
	}{
		{
			name: "tag",
			in:   `<json_response>{"title":"A","status":"ok"}</json_response>`,
			want: map[string]any{"title": "A", "status": "ok", "cover_url": ""},
		},
		{
			name: "markdown",
			in:   "```json\n{\"title\":\"B\"}\n```",
			want: map[string]any{"title": "B", "cover_url": ""},
		},
		{
			name: "raw",
			in:   `{"title":"C"}`,
			want: map[string]any{"title": "C", "cover_url": ""},
		},
		{
			name: "bad",
			in:   "not json",
			want: nil,
		},
		{
			name: "tag_priority",
			in:   "<json_response>{\"title\":\"TAG\"}</json_response>```json\n{\"title\":\"MD\"}\n```",
			want: map[string]any{"title": "TAG", "cover_url": ""},
		},
		{
			name: "cover_forced_empty",
			in:   `{"title":"D","cover_url":"http://evil/x.jpg"}`,
			want: map[string]any{"title": "D", "cover_url": ""},
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := ParseAIResponse(tc.in)
			if !reflect.DeepEqual(got, tc.want) {
				t.Errorf("ParseAIResponse(%q) = %v, want %v", tc.in, got, tc.want)
			}
		})
	}
}

// TestAIBuildMetadata 对齐 Python _metadata 的 8 组向量。
func TestAIBuildMetadata(t *testing.T) {
	api := NewAIBookApi("http://x", "k", "m", false, true)

	t.Run("full", func(t *testing.T) {
		mi := api.BuildMetadata(map[string]any{
			"title": "三体", "authors": []any{"刘慈欣"}, "publisher": "重庆出版社",
			"isbn": "9787536692930", "tags": []any{"科幻"}, "summary": "简介",
			"pubdate": "2008-01-01", "rating": "8.9", "cover_url": "",
		})
		if mi["title"] != "三体" {
			t.Errorf("title = %v", mi["title"])
		}
		if !reflect.DeepEqual(mi["authors"], []any{"刘慈欣"}) {
			t.Errorf("authors = %v", mi["authors"])
		}
		if mi["author_sort"] != "刘慈欣" {
			t.Errorf("author_sort = %v", mi["author_sort"])
		}
		if mi["publisher"] != "重庆出版社" || mi["isbn"] != "9787536692930" {
			t.Errorf("publisher/isbn = %v / %v", mi["publisher"], mi["isbn"])
		}
		if !reflect.DeepEqual(mi["tags"], []any{"科幻"}) {
			t.Errorf("tags = %v", mi["tags"])
		}
		if mi["comments"] != "简介" {
			t.Errorf("comments = %v", mi["comments"])
		}
		if mi["source"] != "AI" || mi["provider_key"] != AIKey || mi["provider_value"] != "三体" {
			t.Errorf("source/provider = %v / %v / %v", mi["source"], mi["provider_key"], mi["provider_value"])
		}
		// rating "8.9" → int(float()) = 8
		if mi["rating"] != 8 {
			t.Errorf("rating = %v, want 8", mi["rating"])
		}
		if mi["pubdate"] != "2008-01-01T00:00:00+00:00" {
			t.Errorf("pubdate = %v", mi["pubdate"])
		}
		if mi["cover_data"] != nil {
			t.Errorf("cover_data = %v, want nil", mi["cover_data"])
		}
	})

	t.Run("no_title", func(t *testing.T) {
		if got := api.BuildMetadata(map[string]any{"authors": []any{"X"}}); got != nil {
			t.Errorf("无 title 应返回 nil, 得到 %v", got)
		}
	})

	t.Run("no_authors", func(t *testing.T) {
		mi := api.BuildMetadata(map[string]any{"title": "T"})
		if !reflect.DeepEqual(mi["authors"], []any{"佚名"}) {
			t.Errorf("authors = %v", mi["authors"])
		}
		if mi["author_sort"] != "佚名" {
			t.Errorf("author_sort = %v", mi["author_sort"])
		}
		// 无 pubdate 时不设置该键（由调用方注入当前时间）。
		if _, ok := mi["pubdate"]; ok {
			t.Errorf("无 pubdate 时不应设置该键, 得到 %v", mi["pubdate"])
		}
		if mi["rating"] != nil {
			t.Errorf("rating = %v, want nil", mi["rating"])
		}
	})

	t.Run("bad_date", func(t *testing.T) {
		mi := api.BuildMetadata(map[string]any{"title": "T", "pubdate": "abc"})
		if _, ok := mi["pubdate"]; ok {
			t.Errorf("非法日期不应设置 pubdate, 得到 %v", mi["pubdate"])
		}
	})

	t.Run("rating_zero", func(t *testing.T) {
		mi := api.BuildMetadata(map[string]any{"title": "T", "rating": 0})
		if mi["rating"] != nil {
			t.Errorf("rating=0 时不应设置, 得到 %v", mi["rating"])
		}
	})

	t.Run("rating_float", func(t *testing.T) {
		mi := api.BuildMetadata(map[string]any{"title": "T", "rating": 7.9})
		if mi["rating"] != 7 {
			t.Errorf("rating = %v, want 7", mi["rating"])
		}
	})

	t.Run("rating_str", func(t *testing.T) {
		mi := api.BuildMetadata(map[string]any{"title": "T", "rating": "6.5"})
		if mi["rating"] != 6 {
			t.Errorf("rating = %v, want 6", mi["rating"])
		}
	})

	t.Run("cn_date", func(t *testing.T) {
		mi := api.BuildMetadata(map[string]any{"title": "T", "pubdate": "2024年1月2日"})
		if mi["pubdate"] != "2024-01-02T00:00:00+00:00" {
			t.Errorf("pubdate = %v", mi["pubdate"])
		}
	})
}

// TestAIGetBookEmptyEvidence 校验空 evidence 直接短路返回 nil。
func TestAIGetBookEmptyEvidence(t *testing.T) {
	api := NewAIBookApi("http://x", "k", "m", false, true)
	if got := api.GetBook("三体", "", []map[string]any{}); got != nil {
		t.Errorf("空 evidence 应返回 nil, 得到 %v", got)
	}
}

// TestAIGetCoverAlwaysNil 校验 AI 源恒不下载封面。
func TestAIGetCoverAlwaysNil(t *testing.T) {
	api := NewAIBookApi("http://x", "k", "m", false, true)
	if got := api.GetCover("http://evil/x.jpg"); got != nil {
		t.Errorf("GetCover 应恒为 nil, 得到 %+v", got)
	}
}

// TestAIUnknownAuthors 校验无效作者占位符集合。
func TestAIUnknownAuthors(t *testing.T) {
	for _, s := range []string{"unknown", "佚名", "unknown author", ""} {
		if !aiUnknownAuthors[s] {
			t.Errorf("%q 应属于 _UNKNOWN_AUTHORS", s)
		}
	}
	if aiUnknownAuthors["刘慈欣"] {
		t.Error("正常作者不应被过滤")
	}
}

// TestAIAllowedEvidenceFields 校验白名单字段与顺序。
func TestAIAllowedEvidenceFields(t *testing.T) {
	want := []string{"source", "title", "author", "authors", "intro", "summary", "tags", "website", "cover_url"}
	if !reflect.DeepEqual(aiAllowedEvidenceFields, want) {
		t.Errorf("allowed_fields = %v, want %v", aiAllowedEvidenceFields, want)
	}
}

// TestAIEvidenceJSONKeyOrder 校验证据 JSON 的键序与 Python 一致（字典序）。
func TestAIEvidenceJSONKeyOrder(t *testing.T) {
	item := map[string]any{"title": "T", "author": "A", "source": "S"}
	encoded, err := json.Marshal(item)
	if err != nil {
		t.Fatalf("Marshal: %v", err)
	}
	if string(encoded) != `{"author":"A","source":"S","title":"T"}` {
		t.Errorf("键序 = %s", encoded)
	}
}

// TestAIEmptyEvidenceValue 校验 `not in (None, "", [])` 语义。
func TestAIEmptyEvidenceValue(t *testing.T) {
	if !isEmptyEvidenceValue(nil) || !isEmptyEvidenceValue("") || !isEmptyEvidenceValue([]any{}) {
		t.Error("空值应被过滤")
	}
	if isEmptyEvidenceValue("x") || isEmptyEvidenceValue([]any{"a"}) || isEmptyEvidenceValue(0) {
		t.Error("非空值不应被过滤")
	}
}

// TestTruncateRunes 校验按字符截断。
func TestTruncateRunes(t *testing.T) {
	if got := truncateRunes("abc", 5); got != "abc" {
		t.Errorf("短串 = %q", got)
	}
	if got := truncateRunes("abcde", 3); got != "abc" {
		t.Errorf("截断 = %q", got)
	}
	// 中文按字符而非字节截断。
	if got := truncateRunes("三体全集", 2); got != "三体" {
		t.Errorf("中文截断 = %q", got)
	}
}

// TestAIConstants 校验常量。
func TestAIConstants(t *testing.T) {
	if AIKey != "ai" {
		t.Errorf("AIKey = %q", AIKey)
	}
	if AITimeout != 25 {
		t.Errorf("AITimeout = %d", AITimeout)
	}
}
