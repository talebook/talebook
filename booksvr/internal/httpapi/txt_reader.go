package httpapi

import (
	"bytes"
	"html"
	"regexp"
	"strings"
	"unicode/utf8"

	"golang.org/x/text/encoding/simplifiedchinese"
	"golang.org/x/text/encoding/unicode"
)

func decodeTxtBody(body []byte) string {
	body = bytes.TrimPrefix(body, []byte{0xef, 0xbb, 0xbf})
	if bytes.HasPrefix(body, []byte{0xff, 0xfe}) || bytes.HasPrefix(body, []byte{0xfe, 0xff}) {
		decoded, err := unicode.UTF16(unicode.LittleEndian, unicode.UseBOM).NewDecoder().Bytes(body)
		if err == nil {
			return string(decoded)
		}
	}
	if utf8.Valid(body) {
		return string(body)
	}
	decoded, err := simplifiedchinese.GB18030.NewDecoder().Bytes(body)
	if err == nil {
		return string(decoded)
	}
	return strings.ToValidUTF8(string(body), "�")
}

var txtChapterHeading = regexp.MustCompile(`^(?:第[零〇一二三四五六七八九十百千万两0-9]+[章节回卷部篇集]|[Cc][Hh][Aa][Pp][Tt][Ee][Rr]\s+[0-9]+|序章|楔子|后记|尾声)`)

// Offsets refer to the normalized UTF-8 text used by the chapter endpoint.
func txtChapters(text string) []map[string]any {
	chapters := []map[string]any{{"title": "正文", "start": 0, "end": len(text)}}
	offset := 0
	for _, line := range strings.SplitAfter(text, "\n") {
		title := strings.TrimSpace(line)
		last := chapters[len(chapters)-1]
		heading := utf8.RuneCountInString(title) <= 100 && txtChapterHeading.MatchString(title)
		chunk := offset-last["start"].(int) >= 32000 && title != ""
		if heading || chunk {
			if !heading {
				title = "正文（续）"
			}
			if offset == 0 {
				last["title"] = html.EscapeString(title)
			} else {
				last["end"] = offset
				chapters = append(chapters, map[string]any{"title": html.EscapeString(title), "start": offset, "end": len(text)})
			}
		}
		offset += len(line)
	}
	return chapters
}
