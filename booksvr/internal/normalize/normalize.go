// Package normalize implements the 8-step title/author normalization pipeline
// used to group books into works and editions.
//
// The package is a pure function library: it must not depend on the database,
// the filesystem, or HTTP.
//
// Pipeline (applied in order):
//
//  1. remove piracy-site suffixes   (z-library and friends)
//  2. full-width → half-width       (ＡＢＣ → ABC, １２３ → 123)
//  3. whitespace normalization      (trim, drop zero-width, collapse runs)
//  4. punctuation normalization     (drop 《》「」【】, turn separators into spaces)
//  5. traditional → simplified      (embedded table)
//  6. case folding                  (lowercase)
//  7. version-suffix extraction     (extracted, not deleted)
//  8. author normalization          (drop 著/编/译, unify name order)
package normalize

import (
	"regexp"
	"strings"
	"unicode"
)

// zeroWidth matches characters that should never appear in a normalized key.
var zeroWidth = strings.NewReplacer(
	"\u200b", "", // zero width space
	"\u200c", "", // zero width non-joiner
	"\u200d", "", // zero width joiner
	"\ufeff", "", // byte order mark
	"\u00a0", " ", // non-breaking space
)

// piracySuffix matches the trailing parenthesised site list added by piracy
// sites, e.g. "三体 (z-library.sk, 1lib.sk)". It mirrors the intent of
// webserver/utils.py:remove_zlibrary_suffix().
var piracySuffix = regexp.MustCompile(
	`\s*[\(（\[【]\s*(?:z-?lib(?:rary)?|1lib|libgen|annas?-archive)[^\)）\]】]*[\)）\]】]\s*$`,
)

// punctuationToDrop lists punctuation removed outright (brackets and quotes
// that carry no meaning in a title key).
var punctuationToDrop = strings.NewReplacer(
	"《", "", "》", "",
	"「", "", "」", "",
	"『", "", "』", "",
	"【", "", "】", "",
	"〔", "", "〕", "",
	"〈", "", "〉", "",
	"《", "", "》", "",
	"\"", "", "'", "",
	"“", "", "”", "",
	"‘", "", "’", "",
)

// punctuationToSpace lists separators turned into a single space so that
// "三体：黑暗森林" becomes "三体 黑暗森林".
var punctuationToSpace = strings.NewReplacer(
	"：", " ", ":", " ",
	"——", " ", "—", " ",
	"–", " ", "-", " ",
	"、", " ", "，", " ", ",", " ",
	"。", " ", ".", " ",
	"；", " ", ";", " ",
	"！", " ", "!", " ",
	"？", " ", "?", " ",
	"·", " ", "•", " ",
	"|", " ", "/", " ", "\\", " ",
)

// multiSpace collapses runs of whitespace into a single space.
var multiSpace = regexp.MustCompile(`\s+`)

// RemovePiracySuffix strips a trailing piracy-site marker from a title.
func RemovePiracySuffix(s string) string {
	return strings.TrimSpace(piracySuffix.ReplaceAllString(s, ""))
}

// NormalizeWidth converts full-width ASCII forms to half-width and folds case.
//
// Step 2 of the pipeline is "full-width → half-width"; case folding is step 6.
// They are combined here because the width conversion is what makes ASCII case
// folding meaningful for full-width input such as ＡＢＣ.
func NormalizeWidth(s string) string {
	var b strings.Builder
	b.Grow(len(s))
	for _, r := range s {
		switch {
		case r >= 0xFF01 && r <= 0xFF5E:
			// Full-width ASCII block maps 1:1 onto printable ASCII.
			b.WriteRune(r - 0xFEE0)
		case r == 0x3000:
			// Ideographic space.
			b.WriteRune(' ')
		default:
			b.WriteRune(r)
		}
	}
	return strings.ToLower(b.String())
}

// NormalizeSpace trims, drops zero-width characters and collapses whitespace.
func NormalizeSpace(s string) string {
	s = zeroWidth.Replace(s)
	s = multiSpace.ReplaceAllString(s, " ")
	return strings.TrimSpace(s)
}

// NormalizePunct drops decorative brackets and turns separators into spaces.
func NormalizePunct(s string) string {
	s = punctuationToDrop.Replace(s)
	s = punctuationToSpace.Replace(s)
	return NormalizeSpace(s)
}

// CaseFold lowercases the string. It is applied after width normalization so
// that full-width letters are already ASCII.
func CaseFold(s string) string {
	return strings.ToLower(s)
}

// NormalizeTitle runs the full pipeline for a book title and returns the
// normalized key. Version suffixes are extracted (not deleted) and therefore do
// not appear in the result; use ExtractVersionSuffix when they are needed.
func NormalizeTitle(s string) string {
	core, _ := normalizeTitleWithSuffixes(s)
	return core
}

// normalizeTitleWithSuffixes runs steps 1-7 and returns the core title plus the
// extracted version suffixes.
func normalizeTitleWithSuffixes(s string) (string, []string) {
	s = RemovePiracySuffix(s)
	s = NormalizeWidth(s)
	s = NormalizeSpace(s)
	s = NormalizePunct(s)
	s = ToSimplified(s)
	s = CaseFold(s)
	parsed := ExtractVersionSuffix(s)
	return parsed.Core, parsed.Suffixes
}

// NormalizeAuthor runs the author pipeline: piracy suffix, width, whitespace,
// punctuation, traditional→simplified, case fold, then author-specific cleanup.
func NormalizeAuthor(s string) string {
	s = RemovePiracySuffix(s)
	s = NormalizeWidth(s)
	s = NormalizeSpace(s)
	s = NormalizePunct(s)
	s = ToSimplified(s)
	s = CaseFold(s)
	return normalizeAuthorCore(s)
}

// authorRoleSuffix matches the trailing role marker such as "著", "编", "译".
var authorRoleSuffix = regexp.MustCompile(`\s*(著|編|编|譯|译|主編|主编|编著|編著|校|註|注)$`)

// normalizeAuthorCore drops role markers and unifies name order.
//
// "刘慈欣 著" → "刘慈欣"
// "慈欣·刘"   → "刘慈欣"   (surname-last form reordered)
func normalizeAuthorCore(s string) string {
	s = strings.TrimSpace(s)
	s = authorRoleSuffix.ReplaceAllString(s, "")
	s = strings.TrimSpace(s)

	// Reorder "given·surname" (a single separator, two CJK parts) into
	// "surnamegiven". Only applies when both sides are CJK and the separator
	// is a middle dot that survived punctuation normalization as a space.
	parts := strings.Fields(s)
	if len(parts) == 2 && isCJK(parts[0]) && isCJK(parts[1]) {
		// "慈欣 刘" → "刘慈欣": the shorter part is treated as the surname.
		a, b := parts[0], parts[1]
		if len([]rune(a)) > len([]rune(b)) {
			s = b + a
		} else {
			s = a + b
		}
	}
	return strings.TrimSpace(s)
}

// isCJK reports whether every rune in s is a CJK ideograph.
func isCJK(s string) bool {
	if s == "" {
		return false
	}
	for _, r := range s {
		if !unicode.Is(unicode.Han, r) {
			return false
		}
	}
	return true
}
