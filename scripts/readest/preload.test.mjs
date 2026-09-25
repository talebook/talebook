import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readerPreloads, updateLauncherPreloads } from './preload.mjs';

test('preloads only bounded, existing modern public build assets; refresh is idempotent', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'readest-preloads-'));
  try {
    mkdirSync(path.join(root, '_next/static'), { recursive: true });
    for (let i = 0; i < 9; i++) writeFileSync(path.join(root, `_next/static/chunk-${i}.js`), 'x'.repeat(i + 1));
    writeFileSync(path.join(root, '_next/static/main.css'), 'body{}');
    mkdirSync(path.join(root, '_next/static/chunks'));
    writeFileSync(path.join(root, '_next/static/chunks/framework-abc.js'), 'framework');
    writeFileSync(path.join(root, '_next/static/chunks/main-123.js'), 'main');
    const html = Array.from({ length: 9 }, (_, i) => `<script src="/readest/_next/static/chunk-${i}.js"></script>`).join('') +
      '<link rel="stylesheet" href="/readest/_next/static/main.css">' +
      '<script src="/readest/_next/static/chunks/framework-abc.js"></script>' +
      '<script src="/readest/_next/static/chunks/main-123.js"></script>' +
      '<script src="/readest/_next/static/chunk-8.js"></script>' +
      '<script nomodule src="/readest/_next/static/legacy.js"></script>' +
      '<script src="https://external.invalid/a.js"></script>' +
      '<script src="/read/resource/10.epub"></script>' +
      '<script src="/readest/_next/static/../private.js"></script>' +
      '<script src="/readest/_next/static/a.js?secret=x"></script>';
    const assets = readerPreloads(html, root);
    assert.deepEqual(assets, [
      { href: '/readest/_next/static/chunks/framework-abc.js', as: 'script' },
      { href: '/readest/_next/static/chunks/main-123.js', as: 'script' },
    ]);
    const launcher = '<html><head></head><body>正在启动</body></html>';
    const updated = updateLauncherPreloads(launcher, html, root);
    assert.equal((updated.match(/fetchpriority="low"/g) || []).length, 2);
    assert.equal(updateLauncherPreloads(updated, html, root), updated);
    const refreshed = updateLauncherPreloads(updated, '', root);
    assert(!refreshed.includes('framework-abc.js'));
    assert(!refreshed.includes('rel="preload"'));
    assert(refreshed.includes('<body>正在启动</body>'));
    writeFileSync(path.join(root, '_next/static/chunks/main-456.js'), 'new build');
    const upgraded = updateLauncherPreloads(updated, '<script src="/readest/_next/static/chunks/main-456.js"></script>', root);
    assert(upgraded.includes('main-456.js'));
    assert(!upgraded.includes('main-123.js'));
    writeFileSync(path.join(root, '_next/static/chunks/main-456.js'), 'x'.repeat(256 * 1024 + 1));
    assert.deepEqual(readerPreloads('<script src="/readest/_next/static/chunks/main-456.js"></script>', root), []);
    assert.throws(() => readerPreloads('<script src="/readest/_next/static/missing.js"></script>', root));
    assert.throws(() => updateLauncherPreloads('<!-- readest-preload:start -->', html, root), /Malformed/);
    symlinkSync('/etc/hostname', path.join(root, '_next/static/escape.js'));
    assert.throws(() => readerPreloads('<script src="/readest/_next/static/escape.js"></script>', root), /escapes/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
