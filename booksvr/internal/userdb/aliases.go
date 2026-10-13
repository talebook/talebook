package userdb

import (
	"database/sql"
	"errors"
	"fmt"
	"sort"
	"strings"
)

// 别名服务：复刻 webserver/services/aliases.py。
//
// 别名用于把同一实体的多种写法归并到一个规范名（canonical）：
//   - 书籍别名（book_aliases）：搜索时按别名命中；
//   - 作者别名（author_aliases）：把多个作者名归并到一个规范名。

// 别名长度与数量上限，对齐 Python 常量。
const (
	MaxAliasLength    = 500
	MaxAliasesPerItem = 50
)

// ErrAliasConflict 对应 Python 的 AliasConflictError。
var ErrAliasConflict = errors.New("aliases already belong to another author")

// CleanAliasName 复刻 clean_alias_name：折叠空白、非空、长度上限。
func CleanAliasName(value string) (string, error) {
	value = strings.Join(strings.Fields(value), " ")
	if value == "" {
		return "", errors.New("alias cannot be empty")
	}
	if len([]rune(value)) > MaxAliasLength {
		return "", errors.New("alias is too long")
	}
	return value, nil
}

// NormalizeAlias 复刻 normalize_alias：清洗后 casefold。
//
// Go 的 strings.ToLower 与 Python casefold 在常见输入上一致；
// 对 ß 等少数码位 casefold 会展开为 ss，此处不复制该行为。
func NormalizeAlias(value string) (string, error) {
	cleaned, err := CleanAliasName(value)
	if err != nil {
		return "", err
	}
	return strings.ToLower(cleaned), nil
}

// CleanAliases 复刻 clean_aliases：去重（保留首次出现的写法）、排除 excluded。
func CleanAliases(values []string, excluded []string) ([]string, error) {
	if values == nil {
		return nil, nil
	}
	if len(values) > MaxAliasesPerItem {
		return nil, errors.New("too many aliases")
	}

	excludedNames := map[string]bool{}
	for _, v := range excluded {
		if n, err := NormalizeAlias(v); err == nil {
			excludedNames[n] = true
		}
	}

	seen := map[string]bool{}
	var out []string
	for _, v := range values {
		name, err := CleanAliasName(v)
		if err != nil {
			return nil, err
		}
		normalized := strings.ToLower(name)
		if excludedNames[normalized] || seen[normalized] {
			continue
		}
		seen[normalized] = true
		out = append(out, name)
	}
	return out, nil
}

// AliasService 提供别名读写。
type AliasService struct {
	DB *sql.DB
}

// NewAliasService 构造别名服务。
func NewAliasService(db *sql.DB) *AliasService {
	return &AliasService{DB: db}
}

// GetBookAliases 返回某本书的别名（按 id 升序）。
func (s *AliasService) GetBookAliases(bookID int64) ([]string, error) {
	rows, err := ListBookAliases(s.DB, bookID)
	if err != nil {
		return nil, err
	}
	out := make([]string, 0, len(rows))
	for _, r := range rows {
		out = append(out, r.Name)
	}
	return out, nil
}

// ReplaceBookAliases 覆盖某本书的别名；title 会被排除。
func (s *AliasService) ReplaceBookAliases(bookID int64, aliases []string, title string) ([]string, error) {
	var excluded []string
	if title != "" {
		excluded = []string{title}
	}
	cleaned, err := CleanAliases(aliases, excluded)
	if err != nil {
		return nil, err
	}

	tx, err := s.DB.Begin()
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.Exec(`DELETE FROM book_aliases WHERE book_id = ?`, bookID); err != nil {
		return nil, err
	}
	for _, name := range cleaned {
		normalized, err := NormalizeAlias(name)
		if err != nil {
			return nil, err
		}
		if _, err := tx.Exec(
			`INSERT INTO book_aliases (book_id, name, normalized_name) VALUES (?, ?, ?)`,
			bookID, name, normalized); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return cleaned, nil
}

// DeleteBookAliases 删除某本书的全部别名。
func (s *AliasService) DeleteBookAliases(bookID int64) error {
	_, err := s.DB.Exec(`DELETE FROM book_aliases WHERE book_id = ?`, bookID)
	return err
}

// FindBookIDs 按关键词模糊匹配别名，返回命中的书籍 id 集合。
func (s *AliasService) FindBookIDs(keyword string) (map[int64]bool, error) {
	normalized, err := NormalizeAlias(keyword)
	if err != nil {
		return nil, err
	}
	rows, err := s.DB.Query(
		`SELECT DISTINCT book_id FROM book_aliases WHERE normalized_name LIKE ? ESCAPE '\'`,
		"%"+escapeLike(normalized)+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := map[int64]bool{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out[id] = true
	}
	return out, rows.Err()
}

// escapeLike 转义 LIKE 通配符，使关键词按字面匹配。
func escapeLike(s string) string {
	r := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)
	return r.Replace(s)
}

// AuthorMapping 返回 归一化名 → 规范名 的映射。
func (s *AliasService) AuthorMapping() (map[string]string, error) {
	rows, err := s.DB.Query(`SELECT normalized_name, canonical_name FROM author_aliases`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := map[string]string{}
	for rows.Next() {
		var normalized, canonical string
		if err := rows.Scan(&normalized, &canonical); err != nil {
			return nil, err
		}
		out[normalized] = canonical
	}
	return out, rows.Err()
}

// authorRow 按归一化名取作者别名行；不存在返回 nil。
func (s *AliasService) authorRow(name string) (*AuthorAlias, error) {
	normalized, err := NormalizeAlias(name)
	if err != nil {
		return nil, nil
	}
	return GetAuthorAlias(s.DB, normalized)
}

// CanonicalAuthor 返回作者的规范名；无别名记录时返回清洗后的原名。
func (s *AliasService) CanonicalAuthor(name string) (string, error) {
	row, err := s.authorRow(name)
	if err != nil {
		return "", err
	}
	if row != nil {
		return row.CanonicalName, nil
	}
	return CleanAliasName(name)
}

// AuthorNames 返回同一作者组内的全部写法（规范名在前，其余按名升序）。
func (s *AliasService) AuthorNames(name string) ([]string, error) {
	canonical, err := s.CanonicalAuthor(name)
	if err != nil {
		return nil, err
	}
	canonicalNormalized, err := NormalizeAlias(canonical)
	if err != nil {
		return nil, err
	}
	rows, err := s.DB.Query(
		`SELECT normalized_name, name FROM author_aliases
		 WHERE canonical_normalized_name = ? ORDER BY name ASC`, canonicalNormalized)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	seen := map[string]bool{canonicalNormalized: true}
	out := []string{canonical}
	for rows.Next() {
		var normalized, n string
		if err := rows.Scan(&normalized, &n); err != nil {
			return nil, err
		}
		if seen[normalized] {
			continue
		}
		seen[normalized] = true
		out = append(out, n)
	}
	return out, rows.Err()
}

// AuthorGroup 是一个作者组的规范名、别名与全部写法。
type AuthorGroup struct {
	Canonical string   `json:"canonical"`
	Aliases   []string `json:"aliases"`
	Names     []string `json:"names"`
}

// GetAuthorGroup 返回作者组信息。
func (s *AliasService) GetAuthorGroup(name string) (*AuthorGroup, error) {
	canonical, err := s.CanonicalAuthor(name)
	if err != nil {
		return nil, err
	}
	names, err := s.AuthorNames(canonical)
	if err != nil {
		return nil, err
	}
	canonicalNormalized, err := NormalizeAlias(canonical)
	if err != nil {
		return nil, err
	}
	aliases := []string{}
	for _, v := range names {
		n, err := NormalizeAlias(v)
		if err != nil || n == canonicalNormalized {
			continue
		}
		aliases = append(aliases, v)
	}
	return &AuthorGroup{Canonical: canonical, Aliases: aliases, Names: names}, nil
}

// MatchingAuthorNames 返回归一化名包含关键词的作者组内全部写法。
func (s *AliasService) MatchingAuthorNames(keyword string) ([]string, error) {
	normalized, err := NormalizeAlias(keyword)
	if err != nil {
		return nil, err
	}
	rows, err := s.DB.Query(
		`SELECT DISTINCT canonical_normalized_name FROM author_aliases
		 WHERE normalized_name LIKE ? ESCAPE '\'`, "%"+escapeLike(normalized)+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	canonicals := map[string]bool{}
	for rows.Next() {
		var c string
		if err := rows.Scan(&c); err != nil {
			return nil, err
		}
		canonicals[c] = true
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(canonicals) == 0 {
		return nil, nil
	}

	// 取这些规范组下的全部行，按归一化名去重。
	keys := make([]string, 0, len(canonicals))
	for k := range canonicals {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	placeholders := strings.TrimSuffix(strings.Repeat("?,", len(keys)), ",")
	args := make([]any, 0, len(keys))
	for _, k := range keys {
		args = append(args, k)
	}

	rows2, err := s.DB.Query(
		`SELECT normalized_name, name FROM author_aliases
		 WHERE canonical_normalized_name IN (`+placeholders+`)`, args...)
	if err != nil {
		return nil, err
	}
	defer rows2.Close()

	seen := map[string]bool{}
	var out []string
	for rows2.Next() {
		var n, name string
		if err := rows2.Scan(&n, &name); err != nil {
			return nil, err
		}
		if seen[n] {
			continue
		}
		seen[n] = true
		out = append(out, name)
	}
	return out, rows2.Err()
}

// ReplaceAuthorGroup 覆盖一个作者组。
//
// absorbConflicts 为 false 时，若请求的名字已属于其他作者组则返回 ErrAliasConflict。
func (s *AliasService) ReplaceAuthorGroup(sourceName, canonical string, aliases []string,
	absorbConflicts bool) (*AuthorGroup, error) {

	sourceGroup, err := s.GetAuthorGroup(sourceName)
	if err != nil {
		return nil, err
	}
	canonical, err = CleanAliasName(canonical)
	if err != nil {
		return nil, err
	}

	requested := append([]string{canonical}, aliases...)
	sourceCanonicalNormalized, err := NormalizeAlias(sourceGroup.Canonical)
	if err != nil {
		return nil, err
	}
	canonicalNormalized, err := NormalizeAlias(canonical)
	if err != nil {
		return nil, err
	}
	if canonicalNormalized != sourceCanonicalNormalized {
		requested = append(requested, sourceGroup.Canonical)
	}
	requestedNames, err := CleanAliases(requested, nil)
	if err != nil {
		return nil, err
	}

	requestedNormalized := map[string]bool{}
	for _, n := range requestedNames {
		norm, err := NormalizeAlias(n)
		if err != nil {
			return nil, err
		}
		requestedNormalized[norm] = true
	}

	// 查已存在的行，找出属于其他作者组的规范名。
	existingRows, err := s.rowsByNormalized(requestedNormalized)
	if err != nil {
		return nil, err
	}
	foreignCanonicals := map[string]bool{}
	for _, row := range existingRows {
		if row.CanonicalNormalizedName != sourceCanonicalNormalized {
			foreignCanonicals[row.CanonicalNormalizedName] = true
		}
	}
	if len(foreignCanonicals) > 0 && !absorbConflicts {
		var conflicting []string
		for _, row := range existingRows {
			if foreignCanonicals[row.CanonicalNormalizedName] {
				conflicting = append(conflicting, row.Name)
			}
		}
		sort.Strings(conflicting)
		return nil, fmt.Errorf("%w: %s", ErrAliasConflict, strings.Join(conflicting, ", "))
	}

	// 吸收冲突组下的全部行。
	var absorbedRows []*AuthorAlias
	if len(foreignCanonicals) > 0 {
		absorbedRows, err = s.rowsByCanonical(foreignCanonicals)
		if err != nil {
			return nil, err
		}
	}

	// 汇总最终名字集合（保留首次出现的写法）。
	allNames := map[string]string{}
	var order []string
	addName := func(name string) {
		cleaned, err := CleanAliasName(name)
		if err != nil {
			return
		}
		norm := strings.ToLower(cleaned)
		if _, ok := allNames[norm]; ok {
			return
		}
		allNames[norm] = cleaned
		order = append(order, norm)
	}
	for _, n := range requestedNames {
		addName(n)
	}
	for _, row := range absorbedRows {
		addName(row.Name)
	}

	// 删除过时行（原来源组 + 被吸收组）。
	obsolete := map[string]bool{sourceCanonicalNormalized: true}
	for c := range foreignCanonicals {
		obsolete[c] = true
	}
	obsoleteRows, err := s.rowsByCanonical(obsolete)
	if err != nil {
		return nil, err
	}
	existingByName := map[string]*AuthorAlias{}
	for _, row := range obsoleteRows {
		existingByName[row.NormalizedName] = row
	}

	tx, err := s.DB.Begin()
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	for _, row := range obsoleteRows {
		if _, keep := allNames[row.NormalizedName]; keep {
			continue
		}
		if _, err := tx.Exec(`DELETE FROM author_aliases WHERE normalized_name = ?`, row.NormalizedName); err != nil {
			return nil, err
		}
	}

	for _, norm := range order {
		name := allNames[norm]
		display := name
		if norm == canonicalNormalized {
			display = canonical
		}
		if _, exists := existingByName[norm]; exists {
			if _, err := tx.Exec(
				`UPDATE author_aliases SET name = ?, canonical_name = ?, canonical_normalized_name = ?
				 WHERE normalized_name = ?`,
				display, canonical, canonicalNormalized, norm); err != nil {
				return nil, err
			}
			continue
		}
		if _, err := tx.Exec(
			`INSERT INTO author_aliases (normalized_name, name, canonical_name, canonical_normalized_name)
			 VALUES (?, ?, ?, ?)`,
			norm, display, canonical, canonicalNormalized); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return s.GetAuthorGroup(canonical)
}

// rowsByNormalized 取归一化名在集合内的全部行。
func (s *AliasService) rowsByNormalized(names map[string]bool) ([]*AuthorAlias, error) {
	if len(names) == 0 {
		return nil, nil
	}
	keys := sortedKeys(names)
	return s.queryAuthorAliases(`normalized_name IN (`+placeholders(len(keys))+`)`, keys)
}

// rowsByCanonical 取规范归一化名在集合内的全部行。
func (s *AliasService) rowsByCanonical(canonicals map[string]bool) ([]*AuthorAlias, error) {
	if len(canonicals) == 0 {
		return nil, nil
	}
	keys := sortedKeys(canonicals)
	return s.queryAuthorAliases(`canonical_normalized_name IN (`+placeholders(len(keys))+`)`, keys)
}

func (s *AliasService) queryAuthorAliases(where string, args []string) ([]*AuthorAlias, error) {
	anyArgs := make([]any, 0, len(args))
	for _, a := range args {
		anyArgs = append(anyArgs, a)
	}
	rows, err := s.DB.Query(
		`SELECT normalized_name, name, canonical_name, canonical_normalized_name
		 FROM author_aliases WHERE `+where, anyArgs...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*AuthorAlias
	for rows.Next() {
		a := &AuthorAlias{}
		if err := rows.Scan(&a.NormalizedName, &a.Name, &a.CanonicalName, &a.CanonicalNormalizedName); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func sortedKeys(m map[string]bool) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

func placeholders(n int) string {
	return strings.TrimSuffix(strings.Repeat("?,", n), ",")
}
