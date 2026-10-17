package pluginbuiltin

import (
	"embed"
	"encoding/json"
	"fmt"
	"os"
	"regexp"
	"sort"
	"strings"
	"unicode"
)

// zhData 内嵌 OpenCC 字典与配置（来自 webserver/plugins/tool/zh_converter）。
//
//go:embed zhdata/config/*.json zhdata/dictionary/*.txt zhdata/a5_phrases.txt
var zhData embed.FS

// beautifyData 内嵌 EPUB 美化预设与纹理（来自 webserver/plugins/tool/epub_beautify/styles）。
//
//go:embed beautifydata/*.css beautifydata/presets.json beautifydata/textures/*.jpg
var beautifyData embed.FS

// openCCDict 是一份已解析的 OpenCC 字典（key → 变体列表，首项为默认）。
type openCCDict struct {
	// items 按词长降序存放，供最长匹配。
	maxLen int
	words  map[string][]string
}

// openCCConverter 复刻 OpenCC：字典链 + StringTree 全局最长匹配。
type openCCConverter struct {
	// chain 是转换链的项序列；每项要么是单字典（应用后展平），
	// 要么是字典组（组内共享树结构，后续字典只处理未命中残余）。
	chain []openCCChainItem
}

// openCCChainItem 复刻 _dict_chain_data 的项：tuple（单字典）或 list（组）。
type openCCChainItem struct {
	// group 非 nil 时为字典组（is_dict_group=True 语义）。
	group []*openCCDict
	// single 非 nil 时为单字典（非组语义，应用后展平）。
	single *openCCDict
}

// dictCache 是进程级字典缓存（复刻 _class_dict_cache）。
var dictCache = map[string]*openCCDict{}

// loadOpenCCDict 加载一份字典文件（key\tvalue[ value...]）。
func loadOpenCCDict(name string) (*openCCDict, error) {
	if cached, ok := dictCache[name]; ok {
		return cached, nil
	}
	raw, err := zhData.ReadFile("zhdata/dictionary/" + name)
	if err != nil {
		return nil, fmt.Errorf("opencc: 字典 %s 不存在", name)
	}
	dict := &openCCDict{words: map[string][]string{}}
	for _, line := range strings.Split(string(raw), "\n") {
		line = strings.TrimRight(line, "\r")
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.Split(line, "\t")
		if len(parts) < 2 {
			continue
		}
		key := parts[0]
		values := strings.Fields(parts[1])
		if len(values) == 0 {
			continue
		}
		dict.words[key] = values
		if len([]rune(key)) > dict.maxLen {
			dict.maxLen = len([]rune(key))
		}
	}
	dictCache[name] = dict
	return dict, nil
}

// loadA5Dict 加载 a5 增强词表为字典。
func loadA5Dict() *openCCDict {
	dict := &openCCDict{words: map[string][]string{}}
	for _, line := range a5PhraseLines {
		parts := strings.Split(line, "\t")
		if len(parts) < 2 {
			continue
		}
		dict.words[parts[0]] = strings.Fields(parts[1])
		if len([]rune(parts[0])) > dict.maxLen {
			dict.maxLen = len([]rune(parts[0]))
		}
	}
	return dict
}

// a5PhraseLines 是 a5_phrases.txt 的非空行（init 时加载）。
var a5PhraseLines = loadA5PhraseLines()

// loadA5PhraseLines 读取内嵌的 a5 增强词表。
func loadA5PhraseLines() []string {
	raw, err := zhData.ReadFile("zhdata/a5_phrases.txt")
	if err != nil {
		return nil
	}
	var lines []string
	for _, line := range strings.Split(string(raw), "\n") {
		line = strings.TrimRight(line, "\r")
		if line != "" && !strings.HasPrefix(line, "#") {
			lines = append(lines, line)
		}
	}
	return lines
}

// conversionConfig 复刻 config/*.json 的结构。
//
// OpenCC 配置的 conversion_chain 是对象数组，每项形如
// {"dict": {"type": "group", "dicts": [{"type": "txt", "file": ...}, ...]}}
// 或单字典 {"dict": {"type": "txt", "file": ...}}。
type conversionConfig struct {
	ConversionChain []struct {
		Dict *struct {
			Type  string `json:"type"`
			File  string `json:"file"`
			Dicts []struct {
				Type string `json:"type"`
				File string `json:"file"`
			} `json:"dicts"`
		} `json:"dict"`
	} `json:"conversion_chain"`
}

// newOpenCCConverter 复刻 OpenCC.__init__：按 config 组装字典链。
//
// extraDicts 注入每个 group 的最前位置（增强词表优先匹配）。
func newOpenCCConverter(direction string, extraDicts []*openCCDict) (func(string) string, error) {
	raw, err := zhData.ReadFile("zhdata/config/" + direction + ".json")
	if err != nil {
		return nil, fmt.Errorf("opencc: 方向 %s 的配置不存在", direction)
	}
	var config conversionConfig
	if err := json.Unmarshal(raw, &config); err != nil {
		return nil, fmt.Errorf("opencc: 方向 %s 的配置解析失败: %w", direction, err)
	}
	converter := &openCCConverter{}
	for _, link := range config.ConversionChain {
		if link.Dict == nil {
			continue
		}
		var names []string
		if link.Dict.Type == "group" {
			for _, item := range link.Dict.Dicts {
				if item.File != "" {
					names = append(names, item.File)
				}
			}
		} else if link.Dict.File != "" {
			names = []string{link.Dict.File}
		}
		var dicts []*openCCDict
		for _, name := range names {
			dict, err := loadOpenCCDict(name)
			if err != nil {
				return nil, err
			}
			dicts = append(dicts, dict)
		}
		if len(dicts) == 0 {
			continue
		}
		// 复刻 _inject_extra_dicts：extra 字典插入每个链项的最前位置；
		// 单字典项包成单元素组（组内树结构跨字典保留）。
		if len(extraDicts) > 0 {
			withExtra := make([]*openCCDict, 0, len(extraDicts)+len(dicts))
			withExtra = append(withExtra, extraDicts...)
			withExtra = append(withExtra, dicts...)
			converter.chain = append(converter.chain, openCCChainItem{group: withExtra})
		} else if link.Dict.Type == "group" {
			converter.chain = append(converter.chain, openCCChainItem{group: dicts})
		} else {
			converter.chain = append(converter.chain, openCCChainItem{single: dicts[0]})
		}
	}
	return converter.Convert, nil
}

// stringTree 复刻 StringTree：最长匹配 + 左右子树递归。
type stringTree struct {
	str     string
	left    *stringTree
	right   *stringTree
	matched bool
}

// convertTree 复刻 StringTree.convert_tree：从全段范围找最长命中，
// 命中后把左右残余递归给同一本字典（matched 节点不再重匹配）。
func (t *stringTree) convertTree(maxLen int, dict map[string][]string) {
	if t.matched {
		if t.left != nil {
			t.left.convertTree(maxLen, dict)
		}
		if t.right != nil {
			t.right.convertTree(maxLen, dict)
		}
		return
	}
	runes := []rune(t.str)
	n := len(runes)
	testLen := maxLen
	if testLen > n {
		testLen = n
	}
	for ; testLen != 0; testLen-- {
		for i := 0; i+testLen <= n; i++ {
			values, ok := dict[string(runes[i:i+testLen])]
			if !ok {
				continue
			}
			if i > 0 {
				t.left = &stringTree{str: string(runes[:i])}
				t.left.convertTree(maxLen, dict)
			}
			if i+testLen < n {
				t.right = &stringTree{str: string(runes[i+testLen:])}
				t.right.convertTree(maxLen, dict)
			}
			// 多映射取首个（对齐 value.split(" ")[0]）。
			t.str = values[0]
			t.matched = true
			return
		}
	}
}

// inorder 复刻 StringTree.inorder：中序遍历还原字符串。
func (t *stringTree) inorder() string {
	var b strings.Builder
	var walk func(*stringTree)
	walk = func(node *stringTree) {
		if node == nil {
			return
		}
		walk(node.left)
		b.WriteString(node.str)
		walk(node.right)
	}
	walk(t)
	return b.String()
}

// convertGroup 复刻 _convert 的组分支：组内字典共享树结构，
// 每本字典只处理未命中残余；返回展平字符串。
func convertGroup(text string, dicts []*openCCDict) string {
	tree := &stringTree{str: text}
	for _, dict := range dicts {
		tree.convertTree(dict.maxLen, dict.words)
	}
	return tree.inorder()
}

// convertSegment 复刻 _convert：按链项依次应用；单字典应用后展平，
// 字典组共享树结构。
func (c *openCCConverter) convertSegment(text string) string {
	tree := &stringTree{str: text}
	for _, item := range c.chain {
		if item.group != nil {
			tree = &stringTree{str: convertGroup(tree.inorder(), item.group)}
		} else if item.single != nil {
			tree.convertTree(item.single.maxLen, item.single.words)
			tree = &stringTree{str: tree.inorder()}
		}
	}
	return tree.inorder()
}

// isOpenCCSeparator 复刻 split_chars_re：\s+（Unicode 空白，含全角空格）
// 加 OpenCC PhraseExtract.cpp 的显式分隔符集合。
func isOpenCCSeparator(ch rune) bool {
	if unicode.IsSpace(ch) {
		return true
	}
	return strings.ContainsRune("-,.?!*，。、；：？！…“”‘’『』「」﹁﹂—－（）《》〈〉～．／＼︒︑︔︓︿﹀︹︺︙︐［﹇］﹈︕︖︰︳︴︽︾︵︶｛︷｝︸﹃﹄【︻】︼", ch)
}

// Convert 复刻 OpenCC.convert：按分隔符切分后逐段转换。
func (c *openCCConverter) Convert(text string) string {
	var out strings.Builder
	var segment strings.Builder
	for _, ch := range text {
		if isOpenCCSeparator(ch) {
			out.WriteString(c.convertSegment(segment.String()))
			segment.Reset()
			out.WriteRune(ch)
		} else {
			segment.WriteRune(ch)
		}
	}
	out.WriteString(c.convertSegment(segment.String()))
	return out.String()
}

// ---- 繁简转换的 EPUB / TXT 处理（复刻 zh_converter/transform.py）----

// zhConvertTxt 复刻 convert_txt_file：检测编码 → 转换 → UTF-8 输出。
func zhConvertTxt(srcPath, outPath string, converter func(string) string) (string, error) {
	data, err := os.ReadFile(srcPath)
	if err != nil {
		return "", err
	}
	text, report := decodeWithReport(data)
	encoding, _ := report["encoding"].(string)
	if err := os.WriteFile(outPath, []byte(converter(text)), 0o644); err != nil {
		return "", err
	}
	return encoding, nil
}

// zhConvertEpub 复刻 convert_epub：正文条目文本节点转换，其余原样保留。
func zhConvertEpub(srcPath, outPath string, converter func(string) string, convertMetadata bool) error {
	entries, order, err := readZipEntries(srcPath)
	if err != nil {
		return err
	}
	for _, name := range findTextEntries(entries) {
		text, encoding := decodeEpubEntry(entries[name])
		converted := zhConvertHTMLText(text, converter)
		if converted != text {
			entries[name] = encodeEpubEntry(converted, encoding)
		}
	}
	if convertMetadata {
		for _, name := range order {
			ext := lower(name)
			if strings.HasSuffix(ext, ".opf") || strings.HasSuffix(ext, ".ncx") {
				text, encoding := decodeEpubEntry(entries[name])
				converted := zhConvertXMLTitles(text, converter)
				if converted != text {
					entries[name] = encodeEpubEntry(converted, encoding)
				}
			}
		}
	}
	return writeEpubZip(entries, order, outPath)
}

// zhConvertHTMLText 转换 HTML 文本节点（跳过 script/style/noscript 子树）。
//
// 采用轻量标签扫描而非完整 HTML 解析：与 Python 的 BeautifulSoup 文本节点
// 语义对齐（标签内属性不转换），且不引入重序列化损耗。
func zhConvertHTMLText(html string, converter func(string) string) string {
	var out strings.Builder
	skipTag := ""
	for {
		lt := strings.IndexByte(html, '<')
		if lt < 0 {
			out.WriteString(converter(html))
			return out.String()
		}
		out.WriteString(converter(html[:lt]))
		rest := html[lt:]
		gt := strings.IndexByte(rest, '>')
		if gt < 0 {
			out.WriteString(rest)
			return out.String()
		}
		tag := rest[:gt+1]
		lowerTag := lower(tag)
		if skipTag == "" {
			if strings.HasPrefix(lowerTag, "<script") || strings.HasPrefix(lowerTag, "<style") ||
				strings.HasPrefix(lowerTag, "<noscript") {
				name := strings.TrimPrefix(strings.TrimPrefix(lowerTag, "</"), "<")
				name = strings.TrimRight(name, "/>")
				skipTag = strings.TrimSpace(name)
			}
			out.WriteString(tag)
		} else {
			out.WriteString(tag)
			if strings.HasPrefix(lowerTag, "</"+skipTag) {
				skipTag = ""
			}
		}
		html = rest[gt+1:]
	}
}

// zhConvertXMLTitles 转换 OPF/NCX 的标题类文本（dc:title / navLabel / text）。
func zhConvertXMLTitles(xml string, converter func(string) string) string {
	for _, tag := range []string{"dc:title", "navLabel", "text"} {
		xml = zhConvertTagText(xml, tag, converter)
	}
	return xml
}

// zhConvertTagText 转换指定标签内的文本。
func zhConvertTagText(xml, tag string, converter func(string) string) string {
	open := "<" + tag
	close := "</" + tag + ">"
	var out strings.Builder
	for {
		start := strings.Index(xml, open)
		if start < 0 {
			out.WriteString(xml)
			return out.String()
		}
		gt := strings.Index(xml[start:], ">")
		if gt < 0 {
			out.WriteString(xml)
			return out.String()
		}
		gt += start
		end := strings.Index(xml[gt:], close)
		if end < 0 {
			out.WriteString(xml)
			return out.String()
		}
		end += gt
		out.WriteString(xml[:gt+1])
		inner := xml[gt+1 : end]
		if strings.HasPrefix(strings.TrimSpace(inner), "<") {
			// 含子元素（如 navLabel><text>）：递归处理 text 标签。
			out.WriteString(zhConvertTagText(inner, "text", converter))
		} else {
			out.WriteString(converter(inner))
		}
		out.WriteString(close)
		xml = xml[end+len(close):]
	}
}

// ---- EPUB 美化的样式加载（复刻 styles/__init__.py）----

// tocStyles 复刻 TOC_STYLES 与 list_toc_styles。
var tocStyles = []map[string]any{
	{"id": "elegant", "name": "精致", "name_en": "Elegant"},
	{"id": "cool", "name": "酷炫", "name_en": "Cool"},
	{"id": "seal", "name": "朱印", "name_en": "Seal"},
	{"id": "minimal", "name": "极简", "name_en": "Minimal"},
}

// listTocStyles 复刻 list_toc_styles。
func listTocStyles() []any {
	out := make([]any, 0, len(tocStyles))
	for _, item := range tocStyles {
		out = append(out, item)
	}
	return out
}

// listPresets 复刻 list_presets。
func listPresets() map[string]any {
	raw, err := beautifyData.ReadFile("beautifydata/presets.json")
	if err != nil {
		return map[string]any{}
	}
	var presets map[string]any
	if err := json.Unmarshal(raw, &presets); err != nil {
		return map[string]any{}
	}
	return presets
}

// builtinTextures 复刻内置纹理清单。
var builtinTextures = []string{
	"tex_caojing", "tex_daolin", "tex_gaobai", "tex_xuanzhi", "tex_yangpi", "tex_yunwen",
}

// listBuiltinTextures 复刻 list_builtin_textures。
func listBuiltinTextures() []any {
	out := make([]any, 0, len(builtinTextures))
	for _, name := range builtinTextures {
		out = append(out, map[string]any{"id": name, "name": name})
	}
	return out
}

// getTextureBytes 复刻 get_texture_bytes。
func getTextureBytes(name string) ([]byte, string, error) {
	for _, known := range builtinTextures {
		if known == name {
			raw, err := beautifyData.ReadFile("beautifydata/textures/" + name + ".jpg")
			if err != nil {
				return nil, "", err
			}
			return raw, "image/jpeg", nil
		}
	}
	return nil, "", fmt.Errorf("unknown texture: %s", name)
}

// placeholderMap 复刻 _PLACEHOLDER_MAP。
var placeholderMap = map[string]string{
	"FONT_BODY": "font_body", "FONT_HEAD": "font_head", "FONT_KAI": "font_kai",
	"FONT_CODE": "font_code", "LINE_HEIGHT": "line_height", "TITLE_SIZE": "title_size",
	"ACCENT": "accent", "ACCENT_LIGHT": "accent_light", "ACCENT_DARK": "accent_dark",
	"MUTED": "muted", "BORDER": "border", "QUOTE_BG": "quote_bg",
	"CODE_BG": "code_bg", "TOC_GRADIENT": "toc_gradient",
}

// placeholderRe 复刻 _PLACEHOLDER_RE。
var placeholderRe = regexp.MustCompile(`\{\{\s*([A-Z_]+)\s*\}\}`)

// getPresetCSS 复刻 get_preset_css：读模板 → 插值 → 嵌入目录与响应式样式。
func getPresetCSS(preset string, useSystemFonts bool, tocStyle string,
	overrides map[string]bool, paletteOverrides, pageTint, bgImage any,
	paraIndent bool, paraGap any, tocColumns bool) (string, error) {
	presets := listPresets()
	meta, ok := presets[preset].(map[string]any)
	if !ok {
		return "", fmt.Errorf("unknown preset: %s", preset)
	}
	if tocStyle == "" {
		tocStyle = "elegant"
	}
	known := false
	for _, item := range tocStyles {
		if item["id"] == tocStyle {
			known = true
			break
		}
	}
	if !known {
		return "", fmt.Errorf("unknown toc style: %s", tocStyle)
	}
	template, err := beautifyData.ReadFile("beautifydata/" + preset + ".css")
	if err != nil {
		return "", fmt.Errorf("preset css missing: %s", preset)
	}
	tocCSS, err := beautifyData.ReadFile("beautifydata/toc_" + tocStyle + ".css")
	if err != nil {
		return "", err
	}
	responsiveCSS, err := beautifyData.ReadFile("beautifydata/responsive.css")
	if err != nil {
		return "", err
	}
	// 先对 toc/responsive 插值，再整体插值。
	tocFilled := interpolateCSS(string(tocCSS), meta, useSystemFonts, overrides)
	responsiveFilled := interpolateCSS(string(responsiveCSS), meta, useSystemFonts, overrides)
	merged := strings.ReplaceAll(string(template), "{{TOC_STYLE}}", tocFilled)
	merged = strings.ReplaceAll(merged, "{{RESPONSIVE}}", responsiveFilled)
	return interpolateCSS(merged, meta, useSystemFonts, overrides), nil
}

// interpolateCSS 复刻 _interpolate。
func interpolateCSS(template string, params map[string]any, useSystemFonts bool,
	overrides map[string]bool) string {
	return placeholderRe.ReplaceAllStringFunc(template, func(match string) string {
		sub := placeholderRe.FindStringSubmatch(match)
		if sub == nil {
			return match
		}
		key := sub[1]
		paramKey, ok := placeholderMap[key]
		if !ok {
			return match
		}
		if strings.HasPrefix(key, "FONT_") {
			suffix := lower(key[len("FONT_"):])
			use := useSystemFonts
			if v, ok := overrides[suffix]; ok {
				use = v
			}
			if !use {
				return ""
			}
			return "font-family: " + stringOr(params[paramKey], "") + ";"
		}
		return stringOr(params[paramKey], "")
	})
}

// noteMarkModes 复刻 NOTE_MARK_MODES。
var noteMarkModes = map[string]bool{"orig": true, "sym": true, "num": true, "zhu": true}

// noteMarkSVGs 复刻 NOTE_MARK_SVGS 的模板 id 集合。
var noteMarkSVGs = map[string]bool{"circle": true, "square": true, "asterisk": true}

// validateNoteMark 复刻 validate_note_mark：orig/sym/num/zhu 或 svg:<模板id>。
func validateNoteMark(noteMark string) error {
	if noteMarkModes[noteMark] {
		return nil
	}
	if strings.HasPrefix(noteMark, "svg:") && noteMarkSVGs[strings.TrimPrefix(noteMark, "svg:")] {
		return nil
	}
	return fmt.Errorf("unknown note mark: %s", noteMark)
}

// sortStrings 是 sort.Strings 的本地封装。
func sortStrings(list []string) []string {
	sort.Strings(list)
	return list
}
