package normalize

import (
	"regexp"
	"strings"
)

// SuffixParse is the result of splitting a title into its core and the version
// suffixes that were extracted from it.
//
// The suffixes are *extracted*, not deleted: they feed the edition fingerprint
// (edition_key) so that e.g. 《三体全集》 groups under the same work as 《三体》
// but is NOT treated as the same edition.
type SuffixParse struct {
	Core     string
	Suffixes []string
}

// versionSuffixPatterns match trailing edition markers. Order matters: the
// first match wins, and only one suffix is stripped per pass.
//
// Each pattern captures the core in group 1 and the suffix in group 2. The
// suffix may be wrapped in brackets, which are stripped afterwards.
var versionSuffixPatterns = []*regexp.Regexp{
	// 第X版 / 第X次修订 / 修订版 / 增订版 / 新版 / 典藏版 / 精装版 ...
	regexp.MustCompile(`^(.*?)\s*(第[一二三四五六七八九十百零\d]+版)$`),
	regexp.MustCompile(`^(.*?)\s*(第[一二三四五六七八九十百零\d]+次(?:修订|印刷|出版))$`),
	regexp.MustCompile(`^(.*?)\s*((?:修订|增订|校订|重订|修|增|校|重|新|典藏|精装|平装|限量|纪念|插图|全译|白话)版)$`),
	// 全集 / 文集 / 套装 / 合集
	regexp.MustCompile(`^(.*?)\s*(全集|文集|套装|合集|套书)$`),
	// 上册 / 下册 / 上卷 / 下卷 / 第X册 / 第X卷
	regexp.MustCompile(`^(.*?)\s*(第[一二三四五六七八九十百零\d]+[册卷部篇])$`),
	regexp.MustCompile(`^(.*?)\s*([上下中][册卷部篇])$`),
}

// bracketWrappers are stripped from an extracted suffix so that
// "三体（第二版）" and "三体 第二版" yield the same suffix "第二版".
var bracketWrappers = strings.NewReplacer(
	"(", "", ")", "",
	"（", "", "）", "",
	"[", "", "]", "",
	"【", "", "】", "",
)

// ExtractVersionSuffix splits a title into its core and any trailing version
// suffix. When no suffix is recognized the whole input becomes the core and
// Suffixes is nil.
//
// The input is expected to be already normalized (steps 1-6 applied), but the
// function is tolerant of unnormalized input.
func ExtractVersionSuffix(s string) SuffixParse {
	s = strings.TrimSpace(s)
	if s == "" {
		return SuffixParse{Core: ""}
	}

	core := s
	var suffixes []string

	// Repeatedly strip suffixes so that "三体 第二版 全集" yields both.
	for {
		matched := false
		for _, re := range versionSuffixPatterns {
			m := re.FindStringSubmatch(core)
			if m == nil {
				continue
			}
			candidateCore := strings.TrimSpace(m[1])
			suffix := strings.TrimSpace(m[2])
			// Never strip everything: the core must keep at least one rune.
			if candidateCore == "" || suffix == "" {
				continue
			}
			core = candidateCore
			suffixes = append(suffixes, suffix)
			matched = true
			break
		}
		if matched {
			continue
		}
		// No bare suffix matched; try a bracketed trailing group such as
		// "三体(第二版)" or "三体 (修订版)".
		if inner, rest, ok := splitTrailingBracket(core); ok {
			// The bracketed text is itself the suffix when it matches a
			// known edition marker; otherwise it is part of the title
			// (e.g. a subtitle) and must be kept.
			if isVersionMarker(inner) {
				core = rest
				suffixes = append(suffixes, inner)
				continue
			}
		}
		break
	}

	if len(suffixes) == 0 {
		return SuffixParse{Core: core}
	}
	// Suffixes were collected outermost-first; reverse for natural reading.
	for i, j := 0, len(suffixes)-1; i < j; i, j = i+1, j-1 {
		suffixes[i], suffixes[j] = suffixes[j], suffixes[i]
	}
	// Strip any bracket wrappers that survived the split.
	for i, s := range suffixes {
		suffixes[i] = strings.TrimSpace(bracketWrappers.Replace(s))
	}
	return SuffixParse{Core: core, Suffixes: suffixes}
}

// versionMarker matches a standalone edition marker, used to decide whether a
// bracketed trailing group is a version suffix or part of the title.
var versionMarker = regexp.MustCompile(
	`^(?:第[一二三四五六七八九十百零\d]+(?:版|次(?:修订|印刷|出版)|[册卷部篇])|` +
		`(?:修订|增订|校订|重订|修|增|校|重|新|典藏|精装|平装|限量|纪念|插图|全译|白话)版|` +
		`全集|文集|套装|合集|套书|[上下中][册卷部篇])$`,
)

// isVersionMarker reports whether s is a recognized edition marker.
func isVersionMarker(s string) bool {
	return versionMarker.MatchString(strings.TrimSpace(s))
}

// splitTrailingBracket splits "三体（第二版）" into ("第二版", "三体", true).
// It returns ok=false when the string does not end with a bracketed group.
func splitTrailingBracket(s string) (inner, rest string, ok bool) {
	s = strings.TrimSpace(s)
	if s == "" {
		return "", "", false
	}
	runes := []rune(s)
	last := runes[len(runes)-1]
	var open rune
	switch last {
	case ')':
		open = '('
	case '）':
		open = '（'
	case ']':
		open = '['
	case '】':
		open = '【'
	default:
		return "", "", false
	}
	// Find the matching opening bracket, scanning from the end.
	for i := len(runes) - 2; i >= 0; i-- {
		if runes[i] != open {
			continue
		}
		inner = strings.TrimSpace(string(runes[i+1 : len(runes)-1]))
		rest = strings.TrimSpace(string(runes[:i]))
		if inner == "" || rest == "" {
			return "", "", false
		}
		return inner, rest, true
	}
	return "", "", false
}
