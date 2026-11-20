const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { test } = require('node:test');
const { chromium } = require('@playwright/test');

for (const prefix of ['', '/team/books']) test(`deployment ${prefix || '/'}: browser sends KOSync only to the Talebook origin using its own session`, async () => {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    if (req.url === `${prefix}/readest/kosync-transport.js`) {
      res.setHeader('Content-Type', 'text/javascript');
      res.end(readFileSync(path.join(__dirname, '../public/readest/kosync-transport.js')));
    } else if (req.url === `${prefix}/api/kosync`) {
      let body = '';
      for await (const chunk of req) body += chunk;
      requests.push({ headers: req.headers, payload: JSON.parse(body) });
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ err: 'ok', status: 401, data: { message: 'Invalid credentials' } }));
    } else {
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Set-Cookie', `talebook-test-session=fixture; Path=${prefix}/; HttpOnly; SameSite=Lax`);
      res.end('<!doctype html><html lang="en"><title>KOSync transport test</title></html>');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    const origin = `http://127.0.0.1:${server.address().port}`;
    const contacted = [];
    page.on('request', request => contacted.push(request.url()));
    await page.goto(`${origin}${prefix}/readest/reader.html`);
    const result = await page.evaluate(async () => {
      const { requestTalebookKOSync } = await import('./kosync-transport.js');
      const response = await requestTalebookKOSync({
        serverUrl: 'https://sync.example', method: 'GET', endpoint: '/users/auth',
        headers: { 'X-Auth-User': 'reader', 'X-Auth-Key': 'fixture' },
      });
      return { status: response.status, data: await response.json() };
    });
    assert.deepEqual(result, { status: 401, data: { message: 'Invalid credentials' } });
    assert.equal(requests.length, 1);
    assert.equal(requests[0].headers.cookie, 'talebook-test-session=fixture');
    assert.equal(requests[0].headers['x-talebook-kosync'], '1');
    assert.equal(requests[0].headers.authorization, undefined);
    assert.equal(requests[0].payload.headers['X-Auth-Key'], 'fixture');
    assert(contacted.every(url => new URL(url).origin === origin));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
