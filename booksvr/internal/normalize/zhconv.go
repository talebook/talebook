package normalize

import (
	_ "embed"
	"strings"
	"sync"
)

//go:embed data/zh_conv.txt
var zhConvData string

var (
	zhConvOnce sync.Once
	zhConvMap  map[rune]rune
)

// loadZhConv parses the embedded traditional→simplified table.
//
// Format: whitespace-separated two-character "繁简" tokens, e.g. "體体 劉刘".
// Lines starting with '#' are comments. The table is intentionally small (a few
// thousand common characters) so the binary stays lean and no external
// dictionary dependency (such as OpenCC) is required.
func loadZhConv() {
	zhConvMap = make(map[rune]rune, 4096)
	for _, line := range strings.Split(zhConvData, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		// Each whitespace-separated token is a two-character "繁简" pair.
		for _, token := range strings.Fields(line) {
			runes := []rune(token)
			if len(runes) != 2 {
				continue
			}
			trad, simpl := runes[0], runes[1]
			if trad == simpl {
				continue
			}
			zhConvMap[trad] = simpl
		}
	}
}

// ToSimplified converts traditional Chinese characters to simplified ones using
// the embedded table. Characters absent from the table are left unchanged.
func ToSimplified(s string) string {
	zhConvOnce.Do(loadZhConv)
	var b strings.Builder
	b.Grow(len(s))
	for _, r := range s {
		if simplified, ok := zhConvMap[r]; ok {
			b.WriteRune(simplified)
			continue
		}
		b.WriteRune(r)
	}
	return b.String()
}

// ZhConvTableSize reports how many characters the embedded table covers. It is
// used by tests to assert the table stays within the agreed 3000-5000 range.
func ZhConvTableSize() int {
	zhConvOnce.Do(loadZhConv)
	return len(zhConvMap)
}
