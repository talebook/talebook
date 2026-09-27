import { test } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = request(url, { headers }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject); req.end();
  });
}

test('SPA and SSR scope compression to public Reader build assets', () => {
  for (const name of ['talebook', 'server-side-render']) {
    const config = readFileSync(new URL(`../../conf/nginx/${name}.conf`, import.meta.url), 'utf8');
    const location = config.match(/location \^~ \/readest\/_next\/static\/ \{([^}]+)\}/)[1];
    assert.match(location, /gzip_types[^;]*text\/css[^;]*application\/javascript/);
    assert.match(location, /gzip_vary on/);
    const resource = config.match(/location \^~ \/read\/resource\/ \{([^}]+)\}/)[1];
    assert.doesNotMatch(resource, /gzip_types/);
    assert.match(resource, /expires off/);
  }
});

test('real Nginx serves identical gzip/identity JS and CSS and keeps missing assets 404',
  { skip: !process.env.READEST_BASE_URL }, async () => {
    const base = process.env.READEST_BASE_URL;
    const shell = await get(base + '/readest/reader.html');
    const html = shell.body.toString();
    for (const suffix of ['js', 'css']) {
      const path = html.match(new RegExp(`(?:src|href)="([^"]*\\.${suffix})"`))[1];
      // Skip the host cleanup module: select the hashed build asset.
      const asset = suffix === 'js' ? html.match(/src="([^" ]*\/_next\/static\/[^" ]+\.js)"/)[1] : path;
      const identity = await get(base + asset, { 'Accept-Encoding': 'identity' });
      const gzip = await get(base + asset, { 'Accept-Encoding': 'gzip' });
      assert.equal(gzip.status, 200);
      assert.equal(gzip.headers['content-encoding'], 'gzip');
      assert.match(gzip.headers.vary, /Accept-Encoding/i);
      assert(gzip.body.length < identity.body.length);
      assert.deepEqual(gunzipSync(gzip.body), identity.body);
    }
    assert.equal((await get(base + '/readest/_next/static/not-a-build.js')).status, 404);
  });
