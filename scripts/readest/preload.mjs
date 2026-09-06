import { realpathSync, statSync } from 'node:fs';
import path from 'node:path';

const START = '<!-- readest-preload:start -->';
const END = '<!-- readest-preload:end -->';
const PREFIX = '/readest/_next/static/';

// Only parser-discovered assets from this export; never evaluate the HTML or
// preload book URLs, runtime-configured hosts, optional dialogs, or polyfills.
export function readerPreloads(readerHtml, exportRoot) {
  const assets = new Map();
  const root = realpathSync(exportRoot);
  for (const [tag] of readerHtml.matchAll(/<(?:script|link)\b[^>]*>/gi)) {
    if (/\bnomodule\b/i.test(tag)) continue;
    const script = /^<script\b/i.test(tag);
    if (!script && !/\brel="stylesheet"/i.test(tag)) continue;
    const href = tag.match(script ? /\bsrc="([^"]+)"/i : /\bhref="([^"]+)"/i)?.[1];
    if (!href?.startsWith(PREFIX) || !/^[/a-zA-Z0-9_.-]+$/.test(href)) continue;
    if (href.split('/').some(part => part === '.' || part === '..')) continue;
    const as = script ? 'script' : 'style';
    if (!href.endsWith(script ? '.js' : '.css')) continue;
    const filename = realpathSync(path.join(root, href.slice('/readest/'.length)));
    if (!filename.startsWith(root + path.sep)) throw new Error('Preload asset escapes Reader export');
    const stat = statSync(filename);
    if (!stat.isFile()) throw new Error('Preload asset is not a file');
    assets.set(href, { href, as, size: stat.size });
  }
  // Two small shell scripts leave connections for the launcher and bootstrap.
  // Large reader/CSS bundles may be cancelled on navigation and waste bytes.
  return [...assets.values()].filter(asset => asset.as === 'script' &&
    /^\/(?:readest\/_next\/static\/chunks)\/(?:framework|main)-[a-zA-Z0-9]+\.js$/.test(asset.href) &&
    asset.size <= 256 * 1024).slice(0, 2).map(({ href, as }) => ({ href, as }));
}

export function updateLauncherPreloads(launcherHtml, readerHtml, exportRoot) {
  const links = readerPreloads(readerHtml, exportRoot).map(({ href, as }) =>
    `    <link rel="preload" href="${href}" as="${as}" fetchpriority="low" />`);
  const block = `${START}\n${links.join('\n')}\n    ${END}`;
  const start = launcherHtml.indexOf(START);
  const end = launcherHtml.indexOf(END);
  if (start !== -1 || end !== -1) {
    if (start === -1 || end < start) throw new Error('Malformed Reader preload block');
    return launcherHtml.slice(0, start) + block + launcherHtml.slice(end + END.length);
  }
  if (!launcherHtml.includes('</head>')) throw new Error('Launcher head not found');
  return launcherHtml.replace('</head>', `${block}\n  </head>`);
}
