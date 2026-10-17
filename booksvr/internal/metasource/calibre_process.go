package metasource

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"time"
)

// ProcessCalibreIdentifier uses the metadata plugins already shipped with the
// converter runtime. Each query gets a separate process and a hard deadline;
// plugin preference changes cannot leak into another query or the site process.
type ProcessCalibreIdentifier struct {
	Python string
}

const calibreIdentifyScript = `
import contextlib, json, sys, urllib.parse
query = json.load(sys.stdin)
with contextlib.redirect_stdout(sys.stderr):
    from webserver.plugins.meta.calibre.api import CalibreMetadataApi
    kwargs = {}
    if query['isbn']:
        kwargs['identifiers'] = {'isbn': query['isbn']}
    if query['title']:
        kwargs['title'] = query['title']
    if query['authors']:
        kwargs['authors'] = query['authors']
    rows = CalibreMetadataApi._identify(timeout=query['timeout'], source=query['plugin'], **kwargs)
    output = []
    for row in rows:
        cover = getattr(row, 'cover_url', '') or ''
        if not cover and row.identifiers.get('google'):
            cover = 'https://books.google.com/books/content?' + urllib.parse.urlencode(dict(
                id=row.identifiers['google'], printsec='frontcover', img='1', zoom='1', source='gbs_api'))
        if query['plugin'] == 'Amazon.com':
            plugin = CalibreMetadataApi._get_amazon_plugin()
            if plugin and plugin.cached_cover_url_is_reliable:
                cover = plugin.get_cached_cover_url(row.identifiers) or cover
        output.append(dict(Title=row.title, Authors=row.authors or [], ISBN=row.isbn or '',
            Rating=int(row.rating) if row.rating is not None else None,
            CoverURL=cover, Identifiers=row.identifiers,
            Publisher=row.publisher or '', Comments=row.comments or '', Tags=row.tags or [],
            PubDate=row.pubdate.isoformat() if row.pubdate else '', Series=row.series or '',
            Language=(row.languages or [''])[0]))
json.dump(output, sys.stdout, ensure_ascii=False)
`

func (p *ProcessCalibreIdentifier) Identify(plugin string, query CalibreQuery, timeout float64) ([]*CalibreIdentifyResult, error) {
	if timeout <= 0 || timeout > 120 {
		timeout = 30
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeout*float64(time.Second))+5*time.Second)
	defer cancel()
	input, err := json.Marshal(map[string]any{"plugin": plugin, "isbn": query.ISBN, "title": query.Title, "authors": query.Authors, "timeout": timeout})
	if err != nil {
		return nil, err
	}
	python := p.Python
	if python == "" {
		python = "python3"
	}
	cmd := exec.CommandContext(ctx, python, "-c", calibreIdentifyScript)
	cmd.Stdin = bytes.NewReader(input)
	// Calibre's diagnostic output may contain query text. Do not expose it in
	// plugin logs or turn it into a successful empty result.
	output, err := cmd.Output()
	if ctx.Err() != nil {
		return nil, fmt.Errorf("Calibre %s 元数据检索超时", plugin)
	}
	if err != nil {
		return nil, fmt.Errorf("Calibre %s 元数据检索进程失败: %w", plugin, err)
	}
	var rows []*CalibreIdentifyResult
	if err := json.Unmarshal(output, &rows); err != nil {
		return nil, fmt.Errorf("Calibre %s 返回无效元数据", plugin)
	}
	return rows, nil
}

func (p *ProcessCalibreIdentifier) CachedCoverURL(map[string]string) string { return "" }
func (p *ProcessCalibreIdentifier) CachedCoverURLIsReliable() bool          { return false }
