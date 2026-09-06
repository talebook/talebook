// Dedicated real test instance only. Reports omit credentials and book contents.
const { chromium } = require('../../app/node_modules/@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.READEST_BASE_URL?.replace(/\/$/, '');
assert(base && process.env.READEST_CREDENTIALS, 'Set READEST_BASE_URL and READEST_CREDENTIALS JSON file');
const credentials = JSON.parse(fs.readFileSync(process.env.READEST_CREDENTIALS, 'utf8'));
const bookId = Number(process.env.READEST_BOOK_ID || 2);
const prefix = new URL(base).pathname;
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
    const response = await context.request.post(base + '/api/user/sign_in', { form: credentials });
    assert.equal((await response.json()).err, 'ok');
    const page = await context.newPage();
    const failures = [], resources = [];
    page.on('pageerror', error => failures.push(error.message));
    page.on('response', response => {
      const url = new URL(response.url());
      // EPUB blob URLs are browser resources, not proxy HTTP requests.
      if (!['http:', 'https:'].includes(url.protocol) || url.origin !== new URL(base).origin) return;
      if (!url.pathname.startsWith(prefix + '/') || response.status() >= 400) failures.push(`${response.status()} ${url.pathname}`);
      if (url.pathname.includes('/read/resource/')) resources.push({ method: response.request().method(), status: response.status() });
    });
    await page.goto(base + `/read/${bookId}?reader=readest`);
    await page.waitForFunction(() => /\d+\s*\/\s*\d+/.test(document.body.innerText), null, { timeout: 60000 });
    assert.equal(new URL(page.url()).pathname, prefix + '/readest/reader.html');
    const view = page.locator('foliate-view').first();
    const before = await view.evaluate(el => el.lastLocation.cfi);
    await view.evaluate(el => el.next());
    await page.waitForFunction(before => document.querySelector('foliate-view').lastLocation.cfi !== before, before);
    assert(await view.evaluate(el => el.renderer.getContents().some(x => x.doc.body.innerText.length > 20)));
    assert(resources.some(r => r.method === 'HEAD' && r.status === 200));
    assert(resources.some(r => r.method === 'GET' && r.status === 206));
    assert.deepEqual(failures, []);
    if (process.env.READEST_SCREENSHOT) await page.screenshot({ path: process.env.READEST_SCREENSHOT });
    console.log(JSON.stringify({ result: 'PASS', prefix, body: true, pageTurn: true, resources, failures }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
