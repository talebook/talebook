package pluginbuiltin

import (
	"archive/zip"
	"encoding/json"
	"fmt"
	"os"
	"regexp"
	"strings"
)

// ---- EPUB 美化核心（复刻 epub_beautify/beautify_lib.py 的核心路径）----
//
// 按方案风险 3 的缓解策略，本文件先落最小可用实现：
//   - analyze_epub：结构统计；
//   - beautify：注入 mb-beauty.css（预设模板插值）并注册进 OPF
//     （manifest + spine，幂等），原书文件零删除；
//   - validate_note_mark 见 zhdata.go。
//
// 章节标题三层识别与目录页生成属于后续补全项（WIP 记录）。

// mbCSSName 复刻 MB_CSS_NAME。
const mbCSSName = "mb-beauty.css"

// frontFileRe 复刻 _FRONT_FILE_RE。
var frontFileRe = regexp.MustCompile(`(?i)\b(?:cover|titlepage|title-page|title|banquan|copyright|colophon|imprint|feiye|zuozhe|author|mulu|toc|nav|contents|index|description|introduction|explanation|version|preface|foreword|afterword|half-title|halftitle|dedication)\b`)

// analyzeEpub 复刻 analyze_epub：返回结构统计。
func analyzeEpub(path string) (map[string]any, error) {
	entries, order, err := readZipEntries(path)
	if err != nil {
		return nil, err
	}
	textEntries := findTextEntries(entries)
	chapterCount := 0
	for _, name := range textEntries {
		if frontFileRe.MatchString(name) {
			continue
		}
		chapterCount++
	}
	hasToc := false
	for _, name := range order {
		if strings.Contains(lower(name), "toc") || strings.Contains(lower(name), "nav") {
			hasToc = true
			break
		}
	}
	return map[string]any{
		"entries":       len(order),
		"text_entries":  len(textEntries),
		"chapters":      chapterCount,
		"has_toc":       hasToc,
		"has_beautified": hasKey(entries, mbCSSName),
	}, nil
}

// hasKey 报告 map 是否含键。
func hasKey(m map[string][]byte, key string) bool {
	_, ok := m[key]
	return ok
}

// beautifyEpub 复刻 beautify：注入预设 CSS 并注册进 OPF，生成新书。
func beautifyEpub(srcPath, outPath, presetCSS string, kwargs map[string]any) (map[string]any, error) {
	entries, order, err := readZipEntries(srcPath)
	if err != nil {
		return nil, err
	}
	opfPath := opfPathFromContainer(string(entries["META-INF/container.xml"]))
	if opfPath == "" {
		return nil, fmt.Errorf("epub beautify: container.xml 缺少 rootfile")
	}
	opfRaw, ok := entries[opfPath]
	if !ok {
		return nil, fmt.Errorf("epub beautify: OPF 条目不存在: %s", opfPath)
	}
	opfText, opfEncoding := decodeEpubEntry(opfRaw)

	// 幂等：已注册则替换内容，否则新增 manifest + spine 条目。
	alreadyRegistered := strings.Contains(opfText, mbCSSName)
	entries[mbCSSName] = []byte(presetCSS)
	if !alreadyRegistered {
		if !containsString(order, mbCSSName) {
			order = append(order, mbCSSName)
		}
		opfText, err = registerCSSInOPF(opfText, mbCSSName)
		if err != nil {
			return nil, err
		}
	}
	entries[opfPath] = encodeEpubEntry(opfText, opfEncoding)

	if err := writeEpubZip(entries, order, outPath); err != nil {
		return nil, err
	}
	return map[string]any{
		"css_registered": true,
		"already_registered": alreadyRegistered,
		"entries": len(order),
	}, nil
}

// registerCSSInOPF 把 CSS 条目注册进 OPF 的 manifest 与 spine（幂等）。
func registerCSSInOPF(opfText, cssName string) (string, error) {
	manifestItem := fmt.Sprintf(
		`<item id="mb-beauty-css" href="%s" media-type="text/css"/>`, cssName)
	spineItem := `<itemref idref="mb-beauty-css"/>`
	if strings.Contains(opfText, "mb-beauty-css") {
		return opfText, nil
	}
	manifestEnd := strings.Index(opfText, "</manifest>")
	spineEnd := strings.Index(opfText, "</spine>")
	if manifestEnd < 0 || spineEnd < 0 {
		return "", fmt.Errorf("epub beautify: OPF 缺少 manifest 或 spine")
	}
	opfText = opfText[:manifestEnd] + "    " + manifestItem + "\n  " + opfText[manifestEnd:]
	// spineEnd 因插入而偏移。
	spineEnd = strings.Index(opfText, "</spine>")
	opfText = opfText[:spineEnd] + "    " + spineItem + "\n  " + opfText[spineEnd:]
	return opfText, nil
}

// containsString 报告切片是否含目标。
func containsString(list []string, target string) bool {
	for _, item := range list {
		if item == target {
			return true
		}
	}
	return false
}

// ---- 纹理与预设的 JSON 辅助 ----

// presetMeta 取预设元数据。
func presetMeta(preset string) map[string]any {
	meta, _ := listPresets()[preset].(map[string]any)
	return meta
}

// textureEntry 是纹理的对外形状。
type textureEntry struct {
	ID        string `json:"id"`
	MediaType string `json:"media_type"`
}

// marshalTextures 序列化纹理清单。
func marshalTextures() string {
	out := make([]textureEntry, 0, len(builtinTextures))
	for _, name := range builtinTextures {
		out = append(out, textureEntry{ID: name, MediaType: "image/jpeg"})
	}
	encoded, _ := json.Marshal(out)
	return string(encoded)
}

// 编译期引用保持。
var _ = zip.Store
var _ = os.Getpid
