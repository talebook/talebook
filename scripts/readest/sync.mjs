import { cpSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const target = path.join(root, 'app/public/readest');
const source = path.resolve(process.argv[2] || '');
if (!process.argv[2] || source === target || source.startsWith(target + path.sep) ||
    target.startsWith(source + path.sep) || !existsSync(path.join(source, 'reader.html')) ||
    !existsSync(path.join(source, '_next/static'))) {
  throw new Error('Pass the upstream Reader-only export directory (out/readest)');
}
const manifest = JSON.parse(readFileSync(path.join(target, 'TALEBOOK_SOURCE.json'), 'utf8'));
const retained = new Set([...manifest.hostFiles, 'TALEBOOK_SOURCE.json', 'LICENSE', 'THIRD_PARTY_NOTICES.md']);
const existingText = new Map();
function rememberText(directory) {
  for (const entry of readdirSync(directory, {withFileTypes: true})) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) rememberText(filename);
    else if (/\.(js|css)$/.test(entry.name)) existingText.set(filename, readFileSync(filename, 'utf8'));
  }
}
rememberText(target);
// Only replace this tracked generated asset directory; preserve all host files.
for (const name of readdirSync(target)) {
  if (!retained.has(name)) rmSync(path.join(target, name), {recursive: true, force: true});
}
for (const name of readdirSync(source)) {
  if (!retained.has(name)) cpSync(path.join(source, name), path.join(target, name), {recursive: true});
}
for (const name of ['reader.html', '404.html']) {
  const filename = path.join(target, name);
  const html = readFileSync(filename, 'utf8');
  const cleanup = '<script type="module" src="/readest/legacy-worker-cleanup.js"></script>';
  writeFileSync(filename, html.replace('<head>', `<head>${cleanup}`));
}
// Preserve the exact bytes of unchanged hashed assets, including historical
// whitespace normalization, so immutable URLs do not gain noisy byte changes.
function normalizeText(directory) {
  for (const entry of readdirSync(directory, {withFileTypes: true})) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) normalizeText(filename);
    else if (/\.(js|css|html)$/.test(entry.name) && !retained.has(entry.name)) {
      const content = readFileSync(filename, 'utf8');
      const old = existingText.get(filename);
      if (old !== undefined && old.replace(/[\t ]+$/gm, '') === content.replace(/[\t ]+$/gm, '')) {
        writeFileSync(filename, old);
      }
    }
  }
}
normalizeText(target);
console.log(`Synced Reader export; retained ${retained.size} host/provenance files`);
