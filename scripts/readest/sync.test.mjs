import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

test('sync preserves host files and immutable bytes, refreshes HTML and rejects overlapping source', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'talebook-readest-sync-'));
  const target = path.join(root, 'app/public/readest');
  const script = path.join(root, 'scripts/readest/sync.mjs');
  const source = path.join(root, 'export');
  try {
    mkdirSync(path.dirname(script), {recursive:true});
    mkdirSync(path.join(target, '_next/static'), {recursive:true});
    mkdirSync(path.join(source, '_next/static'), {recursive:true});
    cpSync(new URL('./sync.mjs', import.meta.url), script);
    cpSync(new URL('./preload.mjs', import.meta.url), path.join(path.dirname(script), 'preload.mjs'));
    writeFileSync(path.join(target,'TALEBOOK_SOURCE.json'), JSON.stringify({hostFiles:['sw.js','talebook-launch.html']}));
    writeFileSync(path.join(target,'talebook-launch.html'), '<html><head></head><body>host launcher</body></html>');
    writeFileSync(path.join(target,'sw.js'),'host worker');
    writeFileSync(path.join(target,'old.js'),'stale chunk');
    writeFileSync(path.join(target,'_next/static/same-hash.js'),'const x = 1;\n');
    writeFileSync(path.join(source,'_next/static/same-hash.js'),'const x = 1;  \n');
    writeFileSync(path.join(source,'sw.js'),'must not overwrite host');
    for (const name of ['reader.html','404.html']) {
      writeFileSync(path.join(source,name),'<html><head><script src="/readest/_next/static/same-hash.js"></script></head></html>');
    }
    const run = arg => spawnSync(process.execPath,[script,arg],{encoding:'utf8'});
    assert.notEqual(run(root).status,0);
    assert(existsSync(path.join(target,'old.js')));
    const result = run(source);
    assert.equal(result.status,0,result.stderr);
    assert.equal(readFileSync(path.join(target,'sw.js'),'utf8'),'host worker');
    assert.equal(readFileSync(path.join(target,'_next/static/same-hash.js'),'utf8'),'const x = 1;\n');
    assert(!existsSync(path.join(target,'old.js')));
    const html = readFileSync(path.join(target,'reader.html'),'utf8');
    const launcher = readFileSync(path.join(target,'talebook-launch.html'),'utf8');
    assert(launcher.includes('readest-preload:start'));
    assert(launcher.includes('host launcher'));
    assert(html.indexOf('legacy-worker-cleanup.js') < html.indexOf('/readest/_next/'));
    assert.notEqual(run(target).status,0);
    assert.equal(run(source).status,0);
    assert.equal(readFileSync(path.join(target,'reader.html'),'utf8'),html);
    assert.equal(readFileSync(path.join(target,'talebook-launch.html'),'utf8'),launcher);
  } finally {rmSync(root,{recursive:true,force:true});}
});
