// Package epubpath resolves EPUB resource names without escaping the archive.
package epubpath

import (
	"archive/zip"
	"bytes"
	"encoding/xml"
	"io"
	"path"
	"strings"
)

func Safe(name string) bool {
	return name != "" && !strings.HasPrefix(name, "/") && !strings.Contains(name, "\\") && !strings.ContainsRune(name, 0) && path.Clean(name) == name && name != ".." && !strings.HasPrefix(name, "../")
}

// Find prefers an exact name. Case tolerance is allowed only for one candidate.
func Find(files []*zip.File, name string) *zip.File {
	if !Safe(name) {
		return nil
	}
	for _, f := range files {
		if f.Name == name {
			return f
		}
	}
	var match *zip.File
	for _, f := range files {
		if Safe(f.Name) && strings.EqualFold(f.Name, name) {
			if match != nil {
				return nil
			}
			match = f
		}
	}
	return match
}

// Encrypted recognizes declared content encryption, including proprietary
// manifests with undeclared namespace prefixes. Font-only obfuscation remains
// readable and is not treated as encrypted publication content.
func Encrypted(manifest []byte) bool {
	text := strings.ToLower(string(manifest))
	protected := strings.Contains(text, "zhangyue.inc") || strings.Contains(text, "aes128") || strings.Contains(text, "aes256") || strings.Contains(text, "aes-128") || strings.Contains(text, "aes-256") || strings.Contains(text, "tripledes")
	if !protected {
		return false
	}
	dec := xml.NewDecoder(bytes.NewReader(manifest))
	resources := 0
	for {
		token, err := dec.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			return true
		}
		start, ok := token.(xml.StartElement)
		if !ok || start.Name.Local != "CipherReference" {
			continue
		}
		for _, attr := range start.Attr {
			if attr.Name.Local != "URI" {
				continue
			}
			resources++
			ext := strings.ToLower(path.Ext(attr.Value))
			if ext != ".ttf" && ext != ".otf" && ext != ".woff" && ext != ".woff2" {
				return true
			}
		}
	}
	return resources == 0
}
