package pluginbuiltin

import (
	"os"
	"path/filepath"
	"strings"

	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginproto"
)

// ---- 正文查找替换 ----

// TextReplaceProvider 复刻 TextReplaceTransformPlugin。
type TextReplaceProvider struct {
	toolBase
}

// newTextReplaceProvider 构造正文查找替换 provider。
func newTextReplaceProvider() *TextReplaceProvider {
	p := &TextReplaceProvider{}
	p.toolBase = toolBase{
		ManifestDict: toolManifest(
			"talebook.tool.text-replace", "正文查找替换",
			"对书籍的 EPUB / TXT 正文执行查找替换（支持正则），可写回原书或另存为新书。",
			"mdi-find-replace", "/plugins/text-replace", "正文查找替换工具可用",
			nil, nil),
		Formats:        map[string]bool{"EPUB": true, "TXT": true},
		HealthyMessage: "正文查找替换工具可用",
	}
	return p
}

// Preview 复刻 preview。
func (p *TextReplaceProvider) Preview(src plugindomain.ToolInput, context map[string]any) (plugindomain.ToolReport, error) {
	path, format, err := toolPath(src, p.Formats)
	if err != nil {
		return plugindomain.ToolReport{}, err
	}
	pattern, _ := src.Get("pattern").(string)
	replacement, _ := src.Get("replacement").(string)
	useRegex, _ := src.Get("use_regex").(bool)
	return plugindomain.ToolReport{DomainRecord: plugindomain.NewDomainRecord(
		textReplacePreview(format, path, pattern, replacement, useRegex))}, nil
}

// Apply 复刻 apply。
func (p *TextReplaceProvider) Apply(src plugindomain.ToolInput, outDir string, context map[string]any) (plugindomain.ToolOutput, error) {
	if outDir == "" {
		return plugindomain.ToolOutput{}, pluginproto.NewUpstreamError(
			"Transform output directory is required", "other", nil)
	}
	path, format, err := toolPath(src, p.Formats)
	if err != nil {
		return plugindomain.ToolOutput{}, err
	}
	pattern, _ := src.Get("pattern").(string)
	replacement, _ := src.Get("replacement").(string)
	useRegex, _ := src.Get("use_regex").(bool)
	applyFn, ruleErr := compileRule(pattern, replacement, useRegex)
	if applyFn == nil {
		return plugindomain.ToolOutput{}, pluginproto.NewUpstreamError(ruleErr, "other", nil)
	}
	outPath := filepath.Join(outDir, "replaced."+lower(format))
	var matches int
	if format == "TXT" {
		matches, err = replaceTxtFile(path, outPath, applyFn)
	} else {
		matches, err = replaceEpubFile(path, outPath, applyFn)
	}
	if err != nil {
		return plugindomain.ToolOutput{}, err
	}
	return plugindomain.ToolOutput{DomainRecord: plugindomain.NewDomainRecord(map[string]any{
		"path": outPath, "format": format, "matches": matches,
	})}, nil
}

// ---- TXT 编码修复 ----

// TxtFixerProvider 复刻 TxtFixerTransformPlugin。
type TxtFixerProvider struct {
	toolBase
}

// txtFixerConfigSchema 复刻 trigger 配置（TRIGGER_SCHEMA 的 object 包装）。
var txtFixerConfigSchema = map[string]any{
	"type": "object",
	"properties": map[string]any{
		"trigger": map[string]any{
			"type": "object",
			"properties": map[string]any{
				"kind":     map[string]any{"type": "string", "enum": []any{"manual", "auto"}},
				"enabled":  map[string]any{"type": "boolean"},
				"schedule": map[string]any{"type": "string"},
			},
		},
	},
}

// newTextFixerProvider 构造 TXT 编码修复 provider。
func newTxtFixerProvider() *TxtFixerProvider {
	p := &TxtFixerProvider{}
	p.toolBase = toolBase{
		ManifestDict: toolManifest(
			"talebook.tool.txt-fixer", "TXT编码修复",
			"检测 TXT 电子书编码（含乱码反转恢复），修复为 UTF-8 后写回或另存为新书。",
			"mdi-file-restore-outline", "/plugins/txt-fixer", "TXT 编码修复工具可用",
			map[string]any{"supports_auto_trigger": true}, txtFixerConfigSchema),
		Formats:        map[string]bool{"TXT": true},
		AutoTrigger:    true,
		HealthyMessage: "TXT 编码修复工具可用",
	}
	return p
}

// Preview 复刻 preview。
func (p *TxtFixerProvider) Preview(src plugindomain.ToolInput, context map[string]any) (plugindomain.ToolReport, error) {
	content, err := txtFixerContent(src, txtAnalyzeLimit)
	if err != nil {
		return plugindomain.ToolReport{}, err
	}
	text, report := decodeWithReport(content)
	report["preview"] = truncateRunes(text, txtPreviewChars)
	return plugindomain.ToolReport{DomainRecord: plugindomain.NewDomainRecord(report)}, nil
}

// Apply 复刻 apply。
func (p *TxtFixerProvider) Apply(src plugindomain.ToolInput, outDir string, context map[string]any) (plugindomain.ToolOutput, error) {
	if outDir == "" {
		return plugindomain.ToolOutput{}, pluginproto.NewUpstreamError(
			"Transform output directory is required", "other", nil)
	}
	content, err := txtFixerContent(src, 0)
	if err != nil {
		return plugindomain.ToolOutput{}, err
	}
	text, report := decodeWithReport(content)
	unrecoverable, _ := report["unrecoverable"].(bool)
	garbage, _ := report["garbage"].(bool)
	mojibake, _ := report["mojibake"].(bool)
	if unrecoverable || (garbage && !mojibake) {
		return plugindomain.ToolOutput{}, pluginproto.NewUpstreamError(
			"TXT content cannot be repaired safely", "other", nil)
	}
	outPath := filepath.Join(outDir, "fixed.txt")
	if err := os.WriteFile(outPath, []byte(text), 0o644); err != nil {
		return plugindomain.ToolOutput{}, err
	}
	encoding, _ := report["encoding"].(string)
	return plugindomain.ToolOutput{DomainRecord: plugindomain.NewDomainRecord(map[string]any{
		"path": outPath, "format": "TXT", "encoding": encoding,
		"mojibake": mojibake, "report": report,
	})}, nil
}

// txtAnalyzeLimit 复刻 ANALYZE_LIMIT。
const txtAnalyzeLimit = 2 * 1024 * 1024

// txtFixerContent 取待分析字节：优先 content，其次 path（limit<=0 表示全量）。
func txtFixerContent(src plugindomain.ToolInput, limit int) ([]byte, error) {
	if raw, ok := src.Get("content").([]byte); ok {
		return raw, nil
	}
	if raw, ok := src.Get("content").(string); ok {
		return []byte(raw), nil
	}
	if path, ok := src.Get("path").(string); ok && path != "" {
		data, err := os.ReadFile(path)
		if err != nil {
			return nil, err
		}
		if limit > 0 && len(data) > limit {
			return data[:limit], nil
		}
		return data, nil
	}
	return nil, pluginproto.NewUpstreamError("TXT fixer requires byte content", "other", nil)
}

// ---- 繁简转换 ----

// zhDirections 复刻 ZH_DIRECTIONS。
var zhDirections = map[string]bool{
	"t2s": true, "tw2s": true, "tw2sp": true, "s2t": true,
	"s2tw": true, "s2twp": true, "t2tw": true, "tw2t": true,
}

// zhDirectionLang 复刻 ZH_DIRECTION_LANG。
var zhDirectionLang = map[string]string{
	"t2s": "zh", "tw2s": "zh", "tw2sp": "zh",
	"s2t": "zht", "s2tw": "zht", "s2twp": "zht", "t2tw": "zht", "tw2t": "zht",
}

// zhDirectionLabels 复刻 DIRECTION_LABELS。
var zhDirectionLabels = map[string]string{
	"t2s": "繁体→简体", "tw2s": "台湾繁体→简体", "tw2sp": "台湾繁体（含台湾用词）→简体",
	"s2t": "简体→繁体", "s2tw": "简体→台湾繁体", "s2twp": "简体→台湾繁体（含台湾用词）",
	"t2tw": "繁体→台湾繁体", "tw2t": "台湾繁体→繁体",
}

// ZhConverterProvider 复刻 ZhConverterTransformPlugin。
type ZhConverterProvider struct {
	toolBase
}

// newZhConverterProvider 构造繁简转换 provider。
func newZhConverterProvider() *ZhConverterProvider {
	p := &ZhConverterProvider{}
	p.toolBase = toolBase{
		ManifestDict: toolManifest(
			"talebook.tool.zh-converter", "繁简转换",
			"对书库书籍执行简体↔繁体中文转换（EPUB/TXT，8 种方向，可选增强词表）。",
			"mdi-translate", "/plugins/zh-converter", "繁简转换工具可用",
			nil, nil),
		Formats:        map[string]bool{"EPUB": true, "TXT": true},
		HealthyMessage: "繁简转换工具可用",
	}
	return p
}

// zhEngine 复刻 _engine：校验方向并构造转换器。
func (p *ZhConverterProvider) zhEngine(src plugindomain.ToolInput) (string, func(string) string, error) {
	direction, _ := src.Get("direction").(string)
	if !zhDirections[direction] {
		return "", nil, pluginproto.NewUpstreamError(
			"Unsupported Chinese conversion direction", "other", nil)
	}
	useA5, _ := src.Get("use_a5").(bool)
	var extra []*openCCDict
	if useA5 && (direction == "t2s" || direction == "tw2s") {
		extra = append(extra, loadA5Dict())
	}
	converter, err := newOpenCCConverter(direction, extra)
	if err != nil {
		return "", nil, err
	}
	return direction, converter, nil
}

// Preview 复刻 preview。
func (p *ZhConverterProvider) Preview(src plugindomain.ToolInput, context map[string]any) (plugindomain.ToolReport, error) {
	direction, _, err := p.zhEngine(src)
	if err != nil {
		return plugindomain.ToolReport{}, err
	}
	label := zhDirectionLabels[direction]
	if label == "" {
		label = direction
	}
	return plugindomain.ToolReport{DomainRecord: plugindomain.NewDomainRecord(map[string]any{
		"direction": direction, "direction_label": label,
	})}, nil
}

// Apply 复刻 apply。
func (p *ZhConverterProvider) Apply(src plugindomain.ToolInput, outDir string, context map[string]any) (plugindomain.ToolOutput, error) {
	if outDir == "" {
		return plugindomain.ToolOutput{}, pluginproto.NewUpstreamError(
			"Transform output directory is required", "other", nil)
	}
	path, format, err := toolPath(src, p.Formats)
	if err != nil {
		return plugindomain.ToolOutput{}, err
	}
	direction, converter, err := p.zhEngine(src)
	if err != nil {
		return plugindomain.ToolOutput{}, err
	}
	outPath := filepath.Join(outDir, "converted."+lower(format))
	convertTitle, _ := src.Get("convert_title").(bool)
	result := map[string]any{
		"path": outPath, "format": format, "direction": direction,
		"direction_label": zhDirectionLabels[direction], "language": zhDirectionLang[direction],
	}
	if format == "EPUB" {
		if err := zhConvertEpub(path, outPath, converter, convertTitle); err != nil {
			return plugindomain.ToolOutput{}, err
		}
		result["source_encoding"] = ""
	} else {
		sourceEncoding, err := zhConvertTxt(path, outPath, converter)
		if err != nil {
			return plugindomain.ToolOutput{}, err
		}
		result["source_encoding"] = sourceEncoding
	}
	if convertTitle {
		title, _ := src.Get("title").(string)
		result["converted_title"] = converter(title)
		var convertedAuthors []string
		if authors, ok := src.Get("authors").([]any); ok {
			for _, author := range authors {
				convertedAuthors = append(convertedAuthors, converter(stringOr(author, "")))
			}
		}
		result["converted_authors"] = convertedAuthors
	}
	return plugindomain.ToolOutput{DomainRecord: plugindomain.NewDomainRecord(result)}, nil
}

// ---- EPUB 美化 ----

// EpubBeautifyProvider 复刻 EpubBeautifyTransformPlugin。
type EpubBeautifyProvider struct {
	toolBase
}

// newEpubBeautifyProvider 构造 EPUB 美化 provider。
func newEpubBeautifyProvider() *EpubBeautifyProvider {
	p := &EpubBeautifyProvider{}
	p.toolBase = toolBase{
		ManifestDict: toolManifest(
			"talebook.tool.epub-beautify", "EPUB 美化",
			"美化 EPUB 的目录、章节名与字体排版（12 套预设 × 4 种目录形式，含竖排右翻古籍），生成新书，原书零改动。",
			"mdi-book-refresh-outline", "/plugins/epub-beautify", "EPUB 美化工具可用",
			nil, nil),
		Formats:        map[string]bool{"EPUB": true},
		HealthyMessage: "EPUB 美化工具可用",
	}
	return p
}

// presetPaletteKeys 复刻 _PRESET_PALETTE_KEYS。
var presetPaletteKeys = []string{
	"scene", "line_height", "title_size", "accent", "accent_light", "accent_dark",
	"muted", "border", "quote_bg", "code_bg", "toc_gradient", "page_progression",
}

// presetItems 复刻 preset_items。
func (p *EpubBeautifyProvider) presetItems() []any {
	presets := listPresets()
	var items []any
	for _, presetID := range sortedKeys(presets) {
		meta, _ := presets[presetID].(map[string]any)
		item := map[string]any{
			"id":   presetID,
			"name": stringOr(meta["name"], presetID),
		}
		if v, ok := meta["name_en"]; ok {
			item["name_en"] = v
		} else {
			item["name_en"] = presetID
		}
		item["description"] = stringOr(meta["description"], "")
		for _, key := range presetPaletteKeys {
			if v, ok := meta[key]; ok {
				item[key] = v
			}
		}
		items = append(items, item)
	}
	return items
}

// Describe 复刻 describe：无书籍依赖的选项元数据。
func (p *EpubBeautifyProvider) Describe() map[string]any {
	return map[string]any{
		"presets":    p.presetItems(),
		"toc_styles": listTocStyles(),
		"textures":   listBuiltinTextures(),
	}
}

// beautifyPlan 复刻 _plan：校验并归一化 apply 参数。
func (p *EpubBeautifyProvider) beautifyPlan(src plugindomain.ToolInput) (string, string, map[string]any, error) {
	paraModeRaw := src.Get("para_mode")
	paraMode, _ := paraModeRaw.(string)
	if paraModeRaw != nil && paraMode != "" && paraMode != "indent" && paraMode != "spacing" {
		return "", "", nil, pluginproto.NewUpstreamError(
			"参数不合法：para_mode="+paraMode, "other", nil)
	}
	useSystemFonts := true
	if raw, ok := src.Get("use_system_fonts").(bool); ok {
		useSystemFonts = raw
	}
	overrides := map[string]bool{
		"body": useSystemFonts, "head": useSystemFonts,
		"kai": useSystemFonts, "code": useSystemFonts,
	}
	if raw, ok := src.Get("font_overrides").(map[string]any); ok {
		for _, key := range []string{"body", "head", "kai", "code"} {
			if v, ok := raw[key].(bool); ok {
				overrides[key] = v
			}
		}
	}
	preset, _ := src.Get("preset").(string)
	tocStyle, _ := src.Get("toc_style").(string)
	bgTexture, _ := src.Get("bg_texture").(string)
	pageTint := src.Get("page_tint")
	var bgImage map[string]any
	if bgTexture != "" {
		if _, _, err := getTextureBytes(bgTexture); err != nil {
			return "", "", nil, pluginproto.NewUpstreamError(
				"背景纹理不合法："+err.Error(), "other", nil)
		}
		bgImage = map[string]any{"url": "mb-bg.jpg"}
		pageTint = nil
	}
	presetCSS, err := getPresetCSS(preset, useSystemFonts, tocStyle, overrides,
		src.Get("palette_overrides"), pageTint, bgImage, true, src.Get("para_gap"), false)
	if err != nil {
		return "", "", nil, pluginproto.NewUpstreamError(
			"参数不合法（预设/目录形式/配色/段距）："+err.Error(), "other", nil)
	}
	notes, _ := src.Get("notes").(bool)
	noteMark, _ := src.Get("note_mark").(string)
	if noteMark == "" {
		noteMark = "orig"
	}
	if notes {
		if err := validateNoteMark(noteMark); err != nil {
			return "", "", nil, pluginproto.NewUpstreamError(
				"标注样式不合法："+err.Error(), "other", nil)
		}
	}
	pageProgression := ""
	if meta, ok := listPresets()[preset].(map[string]any); ok {
		pageProgression, _ = meta["page_progression"].(string)
	}
	kwargs := map[string]any{
		"toc_style": tocStyle, "page_progression": pageProgression,
		"toc_depth": src.Get("toc_depth"), "cleanup": src.Get("cleanup"),
		"dialogue": mustBool(src.Get("dialogue")), "split_title": mustBool(src.Get("title_split")),
		"notes": notes, "note_mark": noteMark,
		"bg_texture": bgTexture,
	}
	return preset, presetCSS, kwargs, nil
}

// Preview 复刻 preview。
func (p *EpubBeautifyProvider) Preview(src plugindomain.ToolInput, context map[string]any) (plugindomain.ToolReport, error) {
	path, _, err := toolPath(src, p.Formats)
	if err != nil {
		return plugindomain.ToolReport{}, err
	}
	analysis, err := analyzeEpub(path)
	if err != nil {
		return plugindomain.ToolReport{}, err
	}
	return plugindomain.ToolReport{DomainRecord: plugindomain.NewDomainRecord(map[string]any{
		"analysis":   analysis,
		"presets":    p.presetItems(),
		"toc_styles": listTocStyles(),
	})}, nil
}

// Apply 复刻 apply。
func (p *EpubBeautifyProvider) Apply(src plugindomain.ToolInput, outDir string, context map[string]any) (plugindomain.ToolOutput, error) {
	if outDir == "" {
		return plugindomain.ToolOutput{}, pluginproto.NewUpstreamError(
			"Transform output directory is required", "other", nil)
	}
	path, format, err := toolPath(src, p.Formats)
	if err != nil {
		return plugindomain.ToolOutput{}, err
	}
	preset, presetCSS, kwargs, err := p.beautifyPlan(src)
	if err != nil {
		return plugindomain.ToolOutput{}, err
	}
	outPath := filepath.Join(outDir, "beautified.epub")
	stats, err := beautifyEpub(path, outPath, presetCSS, kwargs)
	if err != nil {
		return plugindomain.ToolOutput{}, err
	}
	return plugindomain.ToolOutput{DomainRecord: plugindomain.NewDomainRecord(map[string]any{
		"path": outPath, "format": format, "preset": preset, "stats": stats,
	})}, nil
}

// mustBool 复刻 bool(x) 的宽松语义。
func mustBool(v any) bool {
	b, _ := v.(bool)
	return b
}

// sortedKeys 返回 map 的排序键。
func sortedKeys(m map[string]any) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	for i := 0; i < len(keys); i++ {
		for j := i + 1; j < len(keys); j++ {
			if keys[j] < keys[i] {
				keys[i], keys[j] = keys[j], keys[i]
			}
		}
	}
	return keys
}

// strings 引用保持。
var _ = strings.TrimSpace
