package normalize

import "strings"

// KeySeparator is the unit separator (U+001F). It cannot appear in normalized
// titles or author names, so it is safe as a composite-key delimiter.
const KeySeparator = "\x1f"

// keySeparator is the internal alias kept for readability inside this package.
const keySeparator = KeySeparator

// emptyEditionField is the placeholder used when an edition fingerprint
// component is absent. It keeps the key shape stable so that
// "重庆出版社\x1f2008\x1f-" is comparable across rows.
const emptyEditionField = "-"

// WorkKey builds the key that decides whether two books are the same work.
//
// work_key = title_norm + \x1f + author_norm
//
// Both inputs are normalized first, so WorkKey("三体", "刘慈欣") and
// WorkKey("三體（第二版）", "刘慈欣 著") produce the same key.
func WorkKey(title, author string) string {
	return NormalizeTitle(title) + keySeparator + NormalizeAuthor(author)
}

// EditionMeta carries the fields that make up an edition fingerprint.
type EditionMeta struct {
	Publisher  string
	Pubdate    string
	Translator string
	// Suffixes are the version suffixes extracted from the title, e.g.
	// ["第二版"]. They participate in the fingerprint so that 《三体全集》 is
	// not merged into the same edition as 《三体》.
	Suffixes []string
}

// EditionKey builds the fingerprint that decides whether two books are the same
// edition of a work.
//
// edition_key = norm(publisher) + \x1f + norm(pubdate) + \x1f + norm(translator)
//
// Version suffixes are appended when present. When every component is empty the
// result is "" — callers MUST treat an empty edition_key as "do not auto-merge"
// so that books without a fingerprint each become their own edition.
func EditionKey(m EditionMeta) string {
	publisher := normalizeEditionField(m.Publisher)
	pubdate := normalizeEditionField(m.Pubdate)
	translator := normalizeEditionField(m.Translator)

	// Suffixes are part of the fingerprint: extract-then-keep, never delete.
	suffixPart := ""
	if len(m.Suffixes) > 0 {
		normalized := make([]string, 0, len(m.Suffixes))
		for _, s := range m.Suffixes {
			s = NormalizeTitle(s)
			if s != "" {
				normalized = append(normalized, s)
			}
		}
		suffixPart = strings.Join(normalized, ",")
	}

	// An all-empty fingerprint must yield "" so callers know not to auto-merge.
	if publisher == emptyEditionField && pubdate == emptyEditionField &&
		translator == emptyEditionField && suffixPart == "" {
		return ""
	}
	key := publisher + keySeparator + pubdate + keySeparator + translator
	if suffixPart != "" {
		key += keySeparator + suffixPart
	}
	return key
}

// normalizeEditionField normalizes one edition component, mapping an absent
// value to the stable placeholder.
func normalizeEditionField(s string) string {
	s = NormalizeWidth(s)
	s = NormalizeSpace(s)
	s = NormalizePunct(s)
	s = ToSimplified(s)
	s = CaseFold(s)
	s = strings.TrimSpace(s)
	if s == "" {
		return emptyEditionField
	}
	return s
}
