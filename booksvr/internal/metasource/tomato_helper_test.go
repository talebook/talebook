package metasource

import "talebook/booksvr/internal/htmlx"

// parseTomatoTestDoc 是测试辅助：解析 HTML 为 DOM。
func parseTomatoTestDoc(html string) (*htmlx.Node, error) {
	return htmlx.Parse(html)
}
