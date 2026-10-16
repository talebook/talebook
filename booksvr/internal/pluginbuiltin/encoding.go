package pluginbuiltin

import (
	"strings"
	"time"

	"unicode"

	"golang.org/x/text/encoding/simplifiedchinese"
	"golang.org/x/text/encoding/traditionalchinese"
	textunicode "golang.org/x/text/encoding/unicode"
)

// 编码检测常量（复刻 tool/common.py）。
const (
	txtSampleChars  = 800
	txtSampleLimit  = 2 * 1024 * 1024
	txtPreviewChars = 500
)

// bomTable 复刻 _BOM_TABLE。
var bomTable = []struct {
	bom       []byte
	encoding  string
}{
	{[]byte{0xEF, 0xBB, 0xBF}, "utf-8-sig"},
	{[]byte{0xFF, 0xFE, 0x00, 0x00}, "utf-32"},
	{[]byte{0x00, 0x00, 0xFE, 0xFF}, "utf-32"},
	{[]byte{0xFF, 0xFE}, "utf-16"},
	{[]byte{0xFE, 0xFF}, "utf-16"},
}

// mojibakePairs 复刻 _MOJIBAKE_PAIRS。
var mojibakePairs = [][2]string{
	{"gb18030", "big5"},
	{"gb18030", "utf-8"},
	{"big5", "utf-8"},
	{"big5", "gb18030"},
	{"utf-8", "gb18030"},
	{"utf-8", "big5"},
}

// commonChars 复刻 _COMMON_CHARS（高频常用字，简繁混合）。
const commonChars = "的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物现实加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取据处队南给色光门即保治北造百规热领七海口东导器压志世金增争济阶油思术极交受联什认六共权收证改清己美再采转更单风切打白教速花带安场身车例真务具万每目至达走积示议声报斗完类八离华名确才科张信马节话米整空元况今集温传土许步群广石记需段研界拉林律叫且究观越织装影算低持音众书布复容儿须际商非验连断深难近矿千周委素技备半办青省列习响约支般史感劳便团往酸历市克何除消构府称太准精值号率族维划选标写存候毛亲快效斯院查江型眼王按格养易置派层片始却专状育厂京识适属圆包火住调满县局照参红细引听该铁价严龙飞" +
	"這為說時從們發頭國門長經還樣處對進級紅綠簡復書語話認識認真體紙間題問聞隊際陽陰險幾爾東樂習鄉歸開閉學黨興舉親觀覽馬魚鳥貝見車銀門電產業發展電腦軟體資訊網路臺灣機學習深度人工智慧書籍內容涵蓋作者"

// decodeWithReport 复刻 decode_with_report：返回 (text, report)。
func decodeWithReport(data []byte) (string, map[string]any) {
	return analyzeEncoding(data)
}

// fixToUTF8 复刻 fix_to_utf8。
func fixToUTF8(data []byte) ([]byte, map[string]any) {
	text, report := decodeWithReport(data)
	return []byte(text), report
}

// analyzeEncoding 复刻 _analyze：完整检测流水线。
func analyzeEncoding(data []byte) (string, map[string]any) {
	var reasons []string

	if len(data) == 0 {
		return "", map[string]any{
			"encoding": "utf-8", "confidence": 0.0, "mojibake": false,
			"garbage": false, "unrecoverable": false, "sample": "",
			"reasons": []string{"空文件"},
		}
	}

	// 1. BOM 优先。
	for _, entry := range bomTable {
		if len(data) >= len(entry.bom) && string(data[:len(entry.bom)]) == string(entry.bom) {
			text := bomDecode(data, entry.encoding)
			text = strings.TrimLeft(text, "\uFEFF")
			reasons = append(reasons, "检测到 BOM，编码确定为 "+entry.encoding)
			return text, map[string]any{
				"encoding": entry.encoding, "confidence": 1.0, "mojibake": false,
				"garbage": false, "unrecoverable": false,
				"sample": truncateRunes(text, txtSampleChars), "reasons": reasons,
			}
		}
	}

	sample := data
	if len(sample) > txtSampleLimit {
		sample = sample[:txtSampleLimit]
	}

	// 2. 候选编码 strict 解码打分。
	type candidate struct {
		encoding string
		text     string
		score    float64
	}
	var candidates []candidate
	for _, enc := range []string{"utf-8", "gb18030", "big5"} {
		if text, ok := strictDecodeTail(sample, enc); ok {
			candidates = append(candidates, candidate{enc, text, readabilityScore(text)})
		}
	}
	if len(candidates) == 0 {
		reasons = append(reasons, "所有候选编码均无法严格解码，疑似二进制或混用编码")
		return replaceDecodeUTF8(data), map[string]any{
			"encoding": "utf-8", "confidence": 0.0, "mojibake": false,
			"garbage": true, "unrecoverable": false, "sample": "", "reasons": reasons,
		}
	}

	// 3. 方案枚举：直解 + 乱码反转（无条件尝试，全局选最优）。
	type option struct {
		encoding string
		text     string
		mojibake bool
		mid      string
		real     string
		candEnc  string
	}
	var options []option
	cycleAny := false
	for _, cand := range candidates {
		options = append(options, option{cand.encoding, cand.text, false, "", "", cand.encoding})
		recovered, cycle := tryMojibakeRecovery(cand.text, 3)
		if recovered != nil {
			options = append(options, option{recovered.real, recovered.text, true,
				recovered.mid, recovered.real, cand.encoding})
		}
		cycleAny = cycleAny || cycle
	}

	// 4. 方案选择：受保护门槛（UTF-8 直解可信时，其他方案需显著胜出）。
	scoreTotal := func(text string) float64 {
		return readabilityScore(text) + minFloat(30.0, commonRatio(text)*40.0)
	}
	pick := func() option {
		var utf8Direct *option
		for i := range options {
			if options[i].encoding == "utf-8" && !options[i].mojibake {
				utf8Direct = &options[i]
				break
			}
		}
		effective := func(o option) float64 {
			if o.encoding == "utf-8" && !o.mojibake {
				return scoreTotal(o.text)
			}
			total := scoreTotal(o.text)
			if utf8Direct != nil && readabilityScore(utf8Direct.text) >= 60 {
				if total < scoreTotal(utf8Direct.text)+10.0 {
					return -1.0
				}
			}
			return total
		}
		best := options[0]
		bestScore := effective(best)
		bestDirect := !best.mojibake
		for _, o := range options[1:] {
			score := effective(o)
			direct := !o.mojibake
			if score > bestScore || (score == bestScore && direct && !bestDirect) {
				best, bestScore, bestDirect = o, score, direct
			}
		}
		return best
	}
	chosen := pick()
	score := readabilityScore(chosen.text)
	reasons = append(reasons, "候选解码："+chosen.candEnc+"（可读性 "+itoa(int(score))+"/100）")
	if chosen.mojibake {
		reasons = append(reasons, "乱码反转恢复：按 "+chosen.mid+" 重读后为 "+chosen.real+
			"（可读性 "+itoa(int(score))+"/100）")
	} else if cycleAny {
		reasons = append(reasons, "检测到乱码反转循环，疑似多重误读，无法自动恢复")
	}
	unrecoverable := cycleAny && !chosen.mojibake

	// 5. 全量解码最终方案（仅一次）。
	var fullText string
	if chosen.mojibake {
		raw, ok := encodeText(chosen.text, chosen.candEnc)
		if !ok {
			return replaceDecodeUTF8(data), map[string]any{
				"encoding": "utf-8", "confidence": 0.0, "mojibake": false,
				"garbage": true, "unrecoverable": false, "sample": "", "reasons": reasons,
			}
		}
		decoded, ok := strictDecode(raw, chosen.real)
		if !ok {
			return replaceDecodeUTF8(data), map[string]any{
				"encoding": "utf-8", "confidence": 0.0, "mojibake": false,
				"garbage": true, "unrecoverable": false, "sample": "", "reasons": reasons,
			}
		}
		fullText = decoded
		score = readabilityScore(fullText)
	} else {
		decoded, ok := strictDecode(data, chosen.encoding)
		if !ok {
			return replaceDecodeUTF8(data), map[string]any{
				"encoding": "utf-8", "confidence": 0.0, "mojibake": false,
				"garbage": true, "unrecoverable": false, "sample": "", "reasons": reasons,
			}
		}
		fullText = decoded
		score = readabilityScore(fullText)
	}

	confidence := score / 100.0
	if confidence > 1.0 {
		confidence = 1.0
	}
	return fullText, map[string]any{
		"encoding":      chosen.encoding,
		"confidence":    round2(confidence),
		"mojibake":      chosen.mojibake,
		"garbage":       score < 30,
		"unrecoverable": unrecoverable,
		"sample":        truncateRunes(fullText, txtSampleChars),
		"reasons":       reasons,
	}
}

// mojibakeRecovery 是反转链的单步结果。
type mojibakeRecovery struct {
	text string
	mid  string
	real string
}

// tryMojibakeRecovery 复刻 _try_mojibake_recovery。
func tryMojibakeRecovery(text string, maxRounds int) (*mojibakeRecovery, bool) {
	var best *mojibakeRecovery
	cycle := false
	current := text
	visited := map[string]bool{text: true}
	for i := 0; i < maxRounds; i++ {
		var found *mojibakeRecovery
		var foundScore float64
		for _, pair := range mojibakePairs {
			raw, ok := encodeText(current, pair[0])
			if !ok {
				continue
			}
			recovered, ok := strictDecode(raw, pair[1])
			if !ok || recovered == current {
				continue
			}
			score := readabilityScore(recovered)
			if score >= 60 {
				found = &mojibakeRecovery{recovered, pair[0], pair[1]}
				foundScore = score
				break
			}
		}
		if found == nil {
			break
		}
		if visited[found.text] {
			cycle = true
			if best != nil &&
				readabilityScore(best.text)+minFloat(30.0, commonRatio(best.text)*40.0) >
					readabilityScore(text)+minFloat(30.0, commonRatio(text)*40.0)+10 {
				return best, true
			}
			return nil, true
		}
		visited[found.text] = true
		current = found.text
		// 高可读性 + 常用字占比显著 → 可信出口，立即停止。
		if foundScore >= 90 && commonRatio(found.text) > 0.3 {
			return found, false
		}
		best = found
	}
	return best, cycle
}

// strictDecodeTail 复刻 _strict_decode_tail：尾部截断自动回退。
func strictDecodeTail(data []byte, encoding string) (string, bool) {
	for cut := 0; cut < 9; cut++ {
		chunk := data
		if cut > 0 {
			if cut >= len(data) {
				continue
			}
			chunk = data[:len(data)-cut]
		}
		if len(chunk) == 0 {
			continue
		}
		if text, ok := strictDecode(chunk, encoding); ok {
			return text, true
		}
	}
	return "", false
}

// strictDecode 按编码严格解码；失败返回 false。
func strictDecode(data []byte, encoding string) (string, bool) {
	switch encoding {
	case "utf-8":
		if utf8Valid(data) {
			return string(data), true
		}
		return "", false
	case "utf-8-sig":
		if len(data) >= 3 && data[0] == 0xEF && data[1] == 0xBB && data[2] == 0xBF {
			if utf8Valid(data[3:]) {
				return string(data[3:]), true
			}
			return "", false
		}
		if utf8Valid(data) {
			return string(data), true
		}
		return "", false
	case "gb18030":
		decoded, err := simplifiedchinese.GB18030.NewDecoder().Bytes(data)
		if err != nil {
			return "", false
		}
		// x/text 的 GB18030 解码器对非法序列不报错，用替换符占比兜底。
		if strings.Count(string(decoded), "�") > len(decoded)/100 {
			return "", false
		}
		return string(decoded), true
	case "big5":
		decoded, err := traditionalchinese.Big5.NewDecoder().Bytes(data)
		if err != nil {
			return "", false
		}
		if strings.Count(string(decoded), "�") > len(decoded)/100 {
			return "", false
		}
		return string(decoded), true
	case "utf-16":
		decoded, err := textunicode.UTF16(textunicode.LittleEndian, textunicode.UseBOM).NewDecoder().Bytes(data)
		if err != nil {
			return "", false
		}
		return string(decoded), true
	case "utf-32":
		return decodeUTF32(data), true
	}
	return "", false
}

// encodeText 按编码编码文本；失败返回 false。
func encodeText(text, encoding string) ([]byte, bool) {
	switch encoding {
	case "utf-8":
		return []byte(text), true
	case "utf-8-sig":
		return append([]byte{0xEF, 0xBB, 0xBF}, []byte(text)...), true
	case "gb18030":
		encoded, err := simplifiedchinese.GB18030.NewEncoder().Bytes([]byte(text))
		if err != nil {
			return nil, false
		}
		return encoded, true
	case "big5":
		encoded, err := traditionalchinese.Big5.NewEncoder().Bytes([]byte(text))
		if err != nil {
			return nil, false
		}
		return encoded, true
	}
	return nil, false
}

// decodeUTF32 解码 UTF-32LE/BE（带 BOM 探测）；失败时返回替换串。
func decodeUTF32(data []byte) string {
	if len(data) < 4 {
		return ""
	}
	little := true
	body := data
	switch {
	case data[0] == 0xFF && data[1] == 0xFE && data[2] == 0x00 && data[3] == 0x00:
		body = data[4:]
	case data[0] == 0x00 && data[1] == 0x00 && data[2] == 0xFE && data[3] == 0xFF:
		body = data[4:]
		little = false
	default:
		body = data
	}
	var out []rune
	for i := 0; i+3 < len(body); i += 4 {
		var v uint32
		if little {
			v = uint32(body[i]) | uint32(body[i+1])<<8 | uint32(body[i+2])<<16 | uint32(body[i+3])<<24
		} else {
			v = uint32(body[i])<<24 | uint32(body[i+1])<<16 | uint32(body[i+2])<<8 | uint32(body[i+3])
		}
		if v <= 0x10FFFF && !(v >= 0xD800 && v <= 0xDFFF) {
			out = append(out, rune(v))
		} else {
			out = append(out, 0xFFFD)
		}
	}
	return string(out)
}

// bomDecode 按 BOM 编码替换解码。
func bomDecode(data []byte, encoding string) string {
	decoded, _ := strictDecode(data, encoding)
	return decoded
}

// replaceDecodeUTF8 复刻 data.decode("utf-8", errors="replace")。
func replaceDecodeUTF8(data []byte) string {
	return strings.ToValidUTF8(string(data), "�")
}

// truncateRunes 按字符数截断。
func truncateRunes(s string, limit int) string {
	runes := []rune(s)
	if len(runes) <= limit {
		return s
	}
	return string(runes[:limit])
}

// round2 保留两位小数。
func round2(v float64) float64 {
	return float64(int(v*100+0.5)) / 100
}

// minFloat 返回较小值。
func minFloat(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

// commonRatio 复刻 _common_ratio。
func commonRatio(text string) float64 {
	if text == "" {
		return 0.0
	}
	sample := []rune(truncateRunes(text, 2000))
	if len(sample) == 0 {
		return 0.0
	}
	hits := 0
	for _, ch := range sample {
		if strings.ContainsRune(commonChars, ch) {
			hits++
		}
	}
	return float64(hits) / float64(len(sample))
}

// readabilityScore 复刻 _readability_score。
func readabilityScore(text string) float64 {
	if text == "" {
		return 0.0
	}
	sample := []rune(truncateRunes(text, 2000))
	n := len(sample)
	if n == 0 {
		return 0.0
	}
	replaceCount, controlCount, cjkCount, mojibakeCount := 0, 0, 0, 0
	for _, ch := range sample {
		switch {
		case ch == 0xFFFD || ch == 0xFFFE || ch == 0xFFFF ||
			(ch >= 0xE000 && ch <= 0xF8FF) || (ch >= 0xD800 && ch <= 0xDFFF) ||
			(ch >= 0xD7B0 && ch <= 0xD7FF):
			replaceCount++
		}
		if isControlChar(ch) {
			controlCount++
		}
		if unicode.Is(unicode.Han, ch) || (ch >= 0x3400 && ch <= 0x4DBF) {
			cjkCount++
		}
		if isMojibakeChar(ch) {
			mojibakeCount++
		}
	}
	readable := n - replaceCount - controlCount - mojibakeCount
	score := 100.0 * float64(readable) / float64(n)
	cjkRatio := float64(cjkCount) / float64(n)
	if cjkRatio > 0.1 {
		score += minFloat(15.0, cjkRatio*40.0)
	}
	score -= minFloat(60.0, float64(replaceCount)/float64(maxInt(n, 1))*500.0)
	score -= minFloat(80.0, float64(controlCount)/float64(maxInt(n, 1))*1000.0)
	if score < 0 {
		return 0
	}
	if score > 100 {
		return 100
	}
	return score
}

// isControlChar 复刻 _is_control_char。
func isControlChar(ch rune) bool {
	return ch <= 0x08 || ch == 0x0B || ch == 0x0C || (ch >= 0x0E && ch <= 0x1F) || ch == 0x7F
}

// isMojibakeChar 复刻 _is_mojibake_char。
func isMojibakeChar(ch rune) bool {
	return (ch >= 0x0080 && ch <= 0x00FF) || (ch >= 0x0100 && ch <= 0x017F) ||
		(ch >= 0x2000 && ch <= 0x206F)
}

// timeUnix 构造固定时间。
func timeUnix(year int, month time.Month, day int) time.Time {
	return time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
}
