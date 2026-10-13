package importmeta

import (
	"path/filepath"
	"testing"
)

// TestFilenameMetadata 文件名元数据。
func TestFilenameMetadata(t *testing.T) {
	cases := []struct {
		path      string
		wantTitle string
	}{
		{"/data/books/三体.epub", "三体"},
		{"/data/books/三体 (第二版).epub", "三体 (第二版)"},
		{`C:\data\books\Dune.mobi`, "Dune"},
		{"noext", "noext"},
		{"/a/b/c.tar.gz", "c.tar"},
	}
	for _, tc := range cases {
		got := FilenameMetadata(tc.path)
		if got.Title != tc.wantTitle {
			t.Errorf("FilenameMetadata(%q).Title = %q, want %q", tc.path, got.Title, tc.wantTitle)
		}
		if len(got.Authors) != 1 || got.Authors[0] != AnonymousAuthor {
			t.Errorf("FilenameMetadata(%q).Authors = %v, want [%s]", tc.path, got.Authors, AnonymousAuthor)
		}
	}
}

// TestFilenameMetadataBaseOnly 只取文件名，不含目录。
func TestFilenameMetadataBaseOnly(t *testing.T) {
	got := FilenameMetadata(filepath.Join("deep", "nested", "dir", "书名.epub"))
	if got.Title != "书名" {
		t.Errorf("Title = %q, want 书名", got.Title)
	}
}

// TestMatchingImportBooksSameAuthor 作者一致时匹配。
func TestMatchingImportBooksSameAuthor(t *testing.T) {
	mi := Metadata{Title: "三体", Authors: []string{"刘慈欣"}}
	books := []map[string]any{
		{"id": 1, "authors": []string{"刘慈欣"}},
		{"id": 2, "authors": []string{"刘慈欣", "某人"}},
	}
	got := MatchingImportBooks(mi, "epub", books)
	if len(got) != 1 {
		t.Fatalf("应匹配 1 本，得到 %d", len(got))
	}
	if got[0]["id"] != 1 {
		t.Errorf("匹配了错误的书: %v", got[0])
	}
}

// TestMatchingImportBooksAuthorOrderIgnored 作者顺序不影响匹配。
func TestMatchingImportBooksAuthorOrderIgnored(t *testing.T) {
	mi := Metadata{Title: "书", Authors: []string{"甲", "乙"}}
	books := []map[string]any{
		{"id": 1, "authors": []string{"乙", "甲"}},
	}
	got := MatchingImportBooks(mi, "epub", books)
	if len(got) != 1 {
		t.Errorf("作者顺序不同应仍匹配，得到 %d", len(got))
	}
}

// TestMatchingImportBooksDifferentAuthor 作者不同时不匹配。
func TestMatchingImportBooksDifferentAuthor(t *testing.T) {
	mi := Metadata{Title: "三体", Authors: []string{"刘慈欣"}}
	books := []map[string]any{
		{"id": 1, "authors": []string{"别人"}},
	}
	if got := MatchingImportBooks(mi, "epub", books); len(got) != 0 {
		t.Errorf("作者不同不应匹配，得到 %v", got)
	}
}

// TestMatchingImportBooksManagedSingle 受管文档格式：恰好 1 本时匹配。
func TestMatchingImportBooksManagedSingle(t *testing.T) {
	mi := Metadata{Title: "扫描书", Authors: []string{AnonymousAuthor}}
	books := []map[string]any{
		{"id": 1, "authors": []string{"完全不同的作者"}},
	}
	// djvu 是受管文档格式，作者不可信，书名唯一即可匹配。
	got := MatchingImportBooks(mi, "djvu", books)
	if len(got) != 1 {
		t.Errorf("受管格式单本应匹配，得到 %d", len(got))
	}
}

// TestMatchingImportBooksManagedMultiple 受管文档格式：多本时绝不合并。
func TestMatchingImportBooksManagedMultiple(t *testing.T) {
	mi := Metadata{Title: "扫描书", Authors: []string{AnonymousAuthor}}
	books := []map[string]any{
		{"id": 1, "authors": []string{AnonymousAuthor}},
		{"id": 2, "authors": []string{AnonymousAuthor}},
	}
	got := MatchingImportBooks(mi, "djvu", books)
	if len(got) != 0 {
		t.Errorf("受管格式多本不应匹配，得到 %v", got)
	}
}

// TestMatchingImportBooksManagedUVZ uvz 同样是受管格式。
func TestMatchingImportBooksManagedUVZ(t *testing.T) {
	mi := Metadata{Title: "书", Authors: []string{AnonymousAuthor}}
	books := []map[string]any{{"id": 1}, {"id": 2}}
	if got := MatchingImportBooks(mi, "uvz", books); len(got) != 0 {
		t.Errorf("uvz 多本不应匹配，得到 %v", got)
	}
	if got := MatchingImportBooks(mi, "uvz", books[:1]); len(got) != 1 {
		t.Errorf("uvz 单本应匹配，得到 %v", got)
	}
}

// TestMatchingImportBooksFormatCaseInsensitive 格式名大小写不敏感。
func TestMatchingImportBooksFormatCaseInsensitive(t *testing.T) {
	mi := Metadata{Title: "书", Authors: []string{AnonymousAuthor}}
	books := []map[string]any{{"id": 1}, {"id": 2}}
	if got := MatchingImportBooks(mi, "DJVU", books); len(got) != 0 {
		t.Errorf("大写 DJVU 应识别为受管格式，得到 %v", got)
	}
}

// TestMatchingImportBooksEmpty 空列表。
func TestMatchingImportBooksEmpty(t *testing.T) {
	mi := Metadata{Title: "书", Authors: []string{"作者"}}
	if got := MatchingImportBooks(mi, "epub", nil); len(got) != 0 {
		t.Errorf("空列表应返回空，得到 %v", got)
	}
	if got := MatchingImportBooks(mi, "djvu", nil); len(got) != 0 {
		t.Errorf("受管格式空列表应返回空，得到 %v", got)
	}
}

// TestBookAuthorsVariants 覆盖 authors 字段的各种形态。
func TestBookAuthorsVariants(t *testing.T) {
	mi := Metadata{Title: "书", Authors: []string{"甲"}}
	cases := []struct {
		name  string
		book  map[string]any
		match bool
	}{
		{"[]string", map[string]any{"authors": []string{"甲"}}, true},
		{"[]any", map[string]any{"authors": []any{"甲"}}, true},
		{"单字符串", map[string]any{"authors": "甲"}, true},
		{"缺失字段", map[string]any{}, false},
		{"空字符串", map[string]any{"authors": ""}, false},
		{"nil", map[string]any{"authors": nil}, false},
		{"非字符串元素", map[string]any{"authors": []any{1, 2}}, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := MatchingImportBooks(mi, "epub", []map[string]any{tc.book})
			if (len(got) == 1) != tc.match {
				t.Errorf("match = %v, want %v", len(got) == 1, tc.match)
			}
		})
	}
}

// TestMatchingImportBooksMultipleMatches 多本同作者都匹配。
func TestMatchingImportBooksMultipleMatches(t *testing.T) {
	mi := Metadata{Title: "书", Authors: []string{"甲"}}
	books := []map[string]any{
		{"id": 1, "authors": []string{"甲"}},
		{"id": 2, "authors": []string{"甲"}},
		{"id": 3, "authors": []string{"乙"}},
	}
	got := MatchingImportBooks(mi, "epub", books)
	if len(got) != 2 {
		t.Errorf("应匹配 2 本，得到 %d", len(got))
	}
}

// TestMatchingImportBooksEmptyAuthors 双方作者都为空时匹配。
func TestMatchingImportBooksEmptyAuthors(t *testing.T) {
	mi := Metadata{Title: "书", Authors: nil}
	books := []map[string]any{{"id": 1, "authors": []string{}}}
	got := MatchingImportBooks(mi, "epub", books)
	if len(got) != 1 {
		t.Errorf("双方作者为空应匹配，得到 %d", len(got))
	}
}
