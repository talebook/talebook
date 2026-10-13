package userdb

import (
	"database/sql"
	"errors"
	"reflect"
	"testing"
)

// aliasTestDB 建一个带别名表的临时库。
func aliasTestDB(t *testing.T) *sql.DB {
	t.Helper()
	return newSchemaDB(t)
}

// TestCleanAliasName 对齐 Python clean_alias_name。
func TestCleanAliasName(t *testing.T) {
	cases := []struct {
		in      string
		want    string
		wantErr bool
	}{
		{"张三", "张三", false},
		{"  张三  ", "张三", false},
		{"张  三", "张 三", false},
		{"张\t三\n四", "张 三 四", false},
		{"", "", true},
		{"   ", "", true},
		{"\t\n", "", true},
	}
	for _, tc := range cases {
		got, err := CleanAliasName(tc.in)
		if tc.wantErr {
			if err == nil {
				t.Errorf("CleanAliasName(%q) 应报错", tc.in)
			}
			continue
		}
		if err != nil {
			t.Errorf("CleanAliasName(%q) 报错: %v", tc.in, err)
			continue
		}
		if got != tc.want {
			t.Errorf("CleanAliasName(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

// TestCleanAliasNameTooLong 验证长度上限。
func TestCleanAliasNameTooLong(t *testing.T) {
	long := make([]rune, MaxAliasLength+1)
	for i := range long {
		long[i] = 'a'
	}
	if _, err := CleanAliasName(string(long)); err == nil {
		t.Error("超长别名应报错")
	}
	ok := make([]rune, MaxAliasLength)
	for i := range ok {
		ok[i] = 'a'
	}
	if _, err := CleanAliasName(string(ok)); err != nil {
		t.Errorf("恰好上限应通过: %v", err)
	}
}

// TestNormalizeAlias 对齐 Python normalize_alias。
func TestNormalizeAlias(t *testing.T) {
	got, err := NormalizeAlias("  Zhang San  ")
	if err != nil {
		t.Fatalf("NormalizeAlias: %v", err)
	}
	if got != "zhang san" {
		t.Errorf("= %q, want %q", got, "zhang san")
	}
	if _, err := NormalizeAlias(""); err == nil {
		t.Error("空值应报错")
	}
}

// TestCleanAliases 对齐 Python clean_aliases。
func TestCleanAliases(t *testing.T) {
	// 去重保留首次写法。
	got, err := CleanAliases([]string{"张三", " 张三 ", "李四"}, nil)
	if err != nil {
		t.Fatalf("CleanAliases: %v", err)
	}
	if !reflect.DeepEqual(got, []string{"张三", "李四"}) {
		t.Errorf("= %#v", got)
	}

	// excluded 生效（大小写不敏感）。
	got, err = CleanAliases([]string{"张三", "李四"}, []string{" 张三 "})
	if err != nil {
		t.Fatalf("CleanAliases: %v", err)
	}
	if !reflect.DeepEqual(got, []string{"李四"}) {
		t.Errorf("excluded = %#v", got)
	}

	// nil 输入返回 nil。
	got, err = CleanAliases(nil, nil)
	if err != nil || got != nil {
		t.Errorf("nil = %#v, %v", got, err)
	}

	// 超量报错。
	many := make([]string, MaxAliasesPerItem+1)
	for i := range many {
		many[i] = string(rune('a' + i%26))
	}
	if _, err := CleanAliases(many, nil); err == nil {
		t.Error("超量应报错")
	}

	// 含非法项报错。
	if _, err := CleanAliases([]string{"ok", "  "}, nil); err == nil {
		t.Error("含空项应报错")
	}
}

// TestAliasServiceBookAliases 验证书籍别名的读写。
func TestAliasServiceBookAliases(t *testing.T) {
	db := aliasTestDB(t)
	svc := NewAliasService(db)

	// 初始为空。
	got, err := svc.GetBookAliases(1)
	if err != nil {
		t.Fatalf("GetBookAliases: %v", err)
	}
	if len(got) != 0 {
		t.Errorf("初始 = %#v, want 空", got)
	}

	// 写入。
	saved, err := svc.ReplaceBookAliases(1, []string{"别名A", "别名B"}, "")
	if err != nil {
		t.Fatalf("ReplaceBookAliases: %v", err)
	}
	if !reflect.DeepEqual(saved, []string{"别名A", "别名B"}) {
		t.Errorf("saved = %#v", saved)
	}

	got, err = svc.GetBookAliases(1)
	if err != nil {
		t.Fatalf("GetBookAliases: %v", err)
	}
	if !reflect.DeepEqual(got, []string{"别名A", "别名B"}) {
		t.Errorf("= %#v", got)
	}

	// 覆盖写：旧值被清除。
	saved, err = svc.ReplaceBookAliases(1, []string{"别名C"}, "")
	if err != nil {
		t.Fatalf("ReplaceBookAliases: %v", err)
	}
	if !reflect.DeepEqual(saved, []string{"别名C"}) {
		t.Errorf("覆盖后 = %#v", saved)
	}
	got, _ = svc.GetBookAliases(1)
	if !reflect.DeepEqual(got, []string{"别名C"}) {
		t.Errorf("覆盖后读取 = %#v", got)
	}

	// 删除。
	if err := svc.DeleteBookAliases(1); err != nil {
		t.Fatalf("DeleteBookAliases: %v", err)
	}
	got, _ = svc.GetBookAliases(1)
	if len(got) != 0 {
		t.Errorf("删除后 = %#v", got)
	}
}

// TestReplaceBookAliasesExcludesTitle 验证书名被排除。
func TestReplaceBookAliasesExcludesTitle(t *testing.T) {
	db := aliasTestDB(t)
	svc := NewAliasService(db)

	saved, err := svc.ReplaceBookAliases(1, []string{"书名", "别名"}, "书名")
	if err != nil {
		t.Fatalf("ReplaceBookAliases: %v", err)
	}
	if !reflect.DeepEqual(saved, []string{"别名"}) {
		t.Errorf("= %#v, want [别名]", saved)
	}
}

// TestFindBookIDs 验证按关键词模糊匹配。
func TestFindBookIDs(t *testing.T) {
	db := aliasTestDB(t)
	svc := NewAliasService(db)

	if _, err := svc.ReplaceBookAliases(1, []string{"Alpha"}, ""); err != nil {
		t.Fatalf("seed 1: %v", err)
	}
	if _, err := svc.ReplaceBookAliases(2, []string{"Alphabet"}, ""); err != nil {
		t.Fatalf("seed 2: %v", err)
	}
	if _, err := svc.ReplaceBookAliases(3, []string{"Beta"}, ""); err != nil {
		t.Fatalf("seed 3: %v", err)
	}

	got, err := svc.FindBookIDs("alpha")
	if err != nil {
		t.Fatalf("FindBookIDs: %v", err)
	}
	if !got[1] || !got[2] || got[3] {
		t.Errorf("= %#v", got)
	}

	// 无命中。
	got, err = svc.FindBookIDs("zzz")
	if err != nil {
		t.Fatalf("FindBookIDs: %v", err)
	}
	if len(got) != 0 {
		t.Errorf("无命中 = %#v", got)
	}
}

// TestFindBookIDsEscapesWildcards 验证 LIKE 通配符被转义。
func TestFindBookIDsEscapesWildcards(t *testing.T) {
	db := aliasTestDB(t)
	svc := NewAliasService(db)

	if _, err := svc.ReplaceBookAliases(1, []string{"100%pure"}, ""); err != nil {
		t.Fatalf("seed: %v", err)
	}
	if _, err := svc.ReplaceBookAliases(2, []string{"100Xpure"}, ""); err != nil {
		t.Fatalf("seed: %v", err)
	}

	// `%` 应按字面匹配，只命中 1。
	got, err := svc.FindBookIDs("100%")
	if err != nil {
		t.Fatalf("FindBookIDs: %v", err)
	}
	if !got[1] || got[2] {
		t.Errorf("= %#v, want 仅 {1}", got)
	}
}

// TestCanonicalAuthor 验证规范名解析。
func TestCanonicalAuthor(t *testing.T) {
	db := aliasTestDB(t)
	svc := NewAliasService(db)

	// 无别名记录：返回清洗后的原名。
	got, err := svc.CanonicalAuthor("  张三  ")
	if err != nil {
		t.Fatalf("CanonicalAuthor: %v", err)
	}
	if got != "张三" {
		t.Errorf("= %q, want %q", got, "张三")
	}

	// 建立别名组。
	if _, err := svc.ReplaceAuthorGroup("张三", "张三", []string{"Zhang San"}, false); err != nil {
		t.Fatalf("ReplaceAuthorGroup: %v", err)
	}
	got, err = svc.CanonicalAuthor("Zhang San")
	if err != nil {
		t.Fatalf("CanonicalAuthor: %v", err)
	}
	if got != "张三" {
		t.Errorf("别名解析 = %q, want %q", got, "张三")
	}
}

// TestAuthorGroup 验证作者组读写。
func TestAuthorGroup(t *testing.T) {
	db := aliasTestDB(t)
	svc := NewAliasService(db)

	group, err := svc.ReplaceAuthorGroup("张三", "张三", []string{"Zhang San", "ZS"}, false)
	if err != nil {
		t.Fatalf("ReplaceAuthorGroup: %v", err)
	}
	if group.Canonical != "张三" {
		t.Errorf("canonical = %q", group.Canonical)
	}
	if len(group.Aliases) != 2 {
		t.Errorf("aliases = %#v", group.Aliases)
	}
	if len(group.Names) != 3 {
		t.Errorf("names = %#v", group.Names)
	}
	// 规范名在首位。
	if group.Names[0] != "张三" {
		t.Errorf("names[0] = %q, want 张三", group.Names[0])
	}

	// 再读一次应一致。
	again, err := svc.GetAuthorGroup("Zhang San")
	if err != nil {
		t.Fatalf("GetAuthorGroup: %v", err)
	}
	if again.Canonical != "张三" || len(again.Names) != 3 {
		t.Errorf("= %+v", again)
	}
}

// TestReplaceAuthorGroupConflict 验证冲突检测。
func TestReplaceAuthorGroupConflict(t *testing.T) {
	db := aliasTestDB(t)
	svc := NewAliasService(db)

	if _, err := svc.ReplaceAuthorGroup("张三", "张三", []string{"ZS"}, false); err != nil {
		t.Fatalf("seed 张三: %v", err)
	}
	if _, err := svc.ReplaceAuthorGroup("李四", "李四", []string{"LS"}, false); err != nil {
		t.Fatalf("seed 李四: %v", err)
	}

	// 把 ZS 抢过来 → 冲突。
	_, err := svc.ReplaceAuthorGroup("李四", "李四", []string{"ZS"}, false)
	if err == nil {
		t.Fatal("应报冲突")
	}
	if !errors.Is(err, ErrAliasConflict) {
		t.Errorf("错误 = %v, want ErrAliasConflict", err)
	}

	// absorbConflicts=true 时吸收。
	group, err := svc.ReplaceAuthorGroup("李四", "李四", []string{"ZS"}, true)
	if err != nil {
		t.Fatalf("absorb: %v", err)
	}
	if group.Canonical != "李四" {
		t.Errorf("canonical = %q", group.Canonical)
	}
	// ZS 现在归属李四。
	got, err := svc.CanonicalAuthor("ZS")
	if err != nil {
		t.Fatalf("CanonicalAuthor: %v", err)
	}
	if got != "李四" {
		t.Errorf("ZS canonical = %q, want 李四", got)
	}
}

// TestReplaceAuthorGroupRenamesCanonical 验证改规范名。
func TestReplaceAuthorGroupRenamesCanonical(t *testing.T) {
	db := aliasTestDB(t)
	svc := NewAliasService(db)

	if _, err := svc.ReplaceAuthorGroup("张三", "张三", []string{"ZS"}, false); err != nil {
		t.Fatalf("seed: %v", err)
	}
	// 把规范名从「张三」改为「张三丰」，旧名成为别名。
	group, err := svc.ReplaceAuthorGroup("张三", "张三丰", []string{"ZS"}, false)
	if err != nil {
		t.Fatalf("rename: %v", err)
	}
	if group.Canonical != "张三丰" {
		t.Errorf("canonical = %q, want 张三丰", group.Canonical)
	}
	// 旧规范名应保留为别名。
	found := false
	for _, n := range group.Names {
		if n == "张三" {
			found = true
		}
	}
	if !found {
		t.Errorf("旧规范名应保留为别名: %#v", group.Names)
	}
}

// TestMatchingAuthorNames 验证按关键词匹配作者组。
func TestMatchingAuthorNames(t *testing.T) {
	db := aliasTestDB(t)
	svc := NewAliasService(db)

	if _, err := svc.ReplaceAuthorGroup("张三", "张三", []string{"Zhang San"}, false); err != nil {
		t.Fatalf("seed: %v", err)
	}
	if _, err := svc.ReplaceAuthorGroup("李四", "李四", []string{"Li Si"}, false); err != nil {
		t.Fatalf("seed: %v", err)
	}

	got, err := svc.MatchingAuthorNames("zhang")
	if err != nil {
		t.Fatalf("MatchingAuthorNames: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("= %#v, want 2 个（张三 + Zhang San）", got)
	}

	// 无命中。
	got, err = svc.MatchingAuthorNames("zzz")
	if err != nil {
		t.Fatalf("MatchingAuthorNames: %v", err)
	}
	if len(got) != 0 {
		t.Errorf("无命中 = %#v", got)
	}
}

// TestAuthorMapping 验证映射读取。
func TestAuthorMapping(t *testing.T) {
	db := aliasTestDB(t)
	svc := NewAliasService(db)

	if _, err := svc.ReplaceAuthorGroup("张三", "张三", []string{"ZS"}, false); err != nil {
		t.Fatalf("seed: %v", err)
	}
	got, err := svc.AuthorMapping()
	if err != nil {
		t.Fatalf("AuthorMapping: %v", err)
	}
	if got["zs"] != "张三" || got["张三"] != "张三" {
		t.Errorf("= %#v", got)
	}
}

// TestAuthorNamesDedupes 验证同名不同大小写只出现一次。
func TestAuthorNamesDedupes(t *testing.T) {
	db := aliasTestDB(t)
	svc := NewAliasService(db)

	if _, err := svc.ReplaceAuthorGroup("Alice", "Alice", []string{"ALICE"}, false); err != nil {
		t.Fatalf("seed: %v", err)
	}
	names, err := svc.AuthorNames("Alice")
	if err != nil {
		t.Fatalf("AuthorNames: %v", err)
	}
	// ALICE 与 Alice 归一化后相同，只保留规范名。
	if len(names) != 1 || names[0] != "Alice" {
		t.Errorf("= %#v, want [Alice]", names)
	}
}

// TestReplaceAuthorGroupEmptyAliases 验证无别名时只建规范名。
func TestReplaceAuthorGroupEmptyAliases(t *testing.T) {
	db := aliasTestDB(t)
	svc := NewAliasService(db)

	group, err := svc.ReplaceAuthorGroup("Solo", "Solo", nil, false)
	if err != nil {
		t.Fatalf("ReplaceAuthorGroup: %v", err)
	}
	if group.Canonical != "Solo" || len(group.Aliases) != 0 || len(group.Names) != 1 {
		t.Errorf("= %+v", group)
	}
}

// TestReplaceAuthorGroupInvalidCanonical 验证非法规范名报错。
func TestReplaceAuthorGroupInvalidCanonical(t *testing.T) {
	db := aliasTestDB(t)
	svc := NewAliasService(db)

	if _, err := svc.ReplaceAuthorGroup("x", "   ", nil, false); err == nil {
		t.Error("空规范名应报错")
	}
}

// TestEscapeLike 验证 LIKE 转义。
func TestEscapeLike(t *testing.T) {
	cases := []struct{ in, want string }{
		{"abc", "abc"},
		{"a%b", `a\%b`},
		{"a_b", `a\_b`},
		{`a\b`, `a\\b`},
	}
	for _, tc := range cases {
		if got := escapeLike(tc.in); got != tc.want {
			t.Errorf("escapeLike(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

// TestPlaceholders 验证占位符生成。
func TestPlaceholders(t *testing.T) {
	if got := placeholders(1); got != "?" {
		t.Errorf("= %q", got)
	}
	if got := placeholders(3); got != "?,?,?" {
		t.Errorf("= %q", got)
	}
}

// TestSortedKeys 验证键排序。
func TestSortedKeys(t *testing.T) {
	got := sortedKeys(map[string]bool{"c": true, "a": true, "b": true})
	if !reflect.DeepEqual(got, []string{"a", "b", "c"}) {
		t.Errorf("= %#v", got)
	}
}
