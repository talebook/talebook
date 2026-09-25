const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('../../app/node_modules/@playwright/test');
const base = process.env.READEST_BASE_URL;

test('launcher warms public scripts without executing Reader or reading an unauthorized book', { skip: !base }, async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    for (const colorScheme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width: 320, height: 800 }, colorScheme, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const requests = [];
      const errors = [];
      page.on('request', r => requests.push(new URL(r.url()).pathname));
      page.on('pageerror', e => errors.push(e.message));
      // Isolate a delayed/denied bootstrap only; HTML/modules/preloads are served
      // by the real candidate Nginx. This fault injection is not a speed benchmark.
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      await page.route('**/reader-bootstrap?engine=readest', async route => {
        await gate;
        await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ err: 'user.no_permission', msg: '无权在线阅读' }) });
      });
      try {
        await page.goto(base + '/readest/talebook-launch.html?bookId=10', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => performance.getEntriesByType('resource').filter(r => r.name.includes('/_next/static/')).length === 2);
        assert.equal(await page.locator('[data-launch-heading]').innerText(), '正在启动 Readest');
        assert.equal(await page.evaluate(() => typeof window.__NEXT_DATA__), 'undefined');
        assert(!requests.some(path => path.startsWith('/read/resource/')));
        assert.equal(await page.locator('[data-launch-spinner]').evaluate(el => getComputedStyle(el).animationName), 'none');
        if (process.env.READEST_SCREENSHOT && colorScheme === 'light') await page.screenshot({ path: process.env.READEST_SCREENSHOT });
        release();
        await page.getByText('无权在线阅读', { exact: true }).waitFor();
        assert(new URL(page.url()).pathname.endsWith('talebook-launch.html'));
        await page.addStyleTag({ content: 'html {font-size: 200%}' });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-action')), 'retry');
        assert.equal(errors.length, 0);
      } finally { release(); await context.close(); }
    }
  } finally { await browser.close(); }
});

test('failed preload is optional and invalid IDs retain recovery without fetching book bytes', { skip: !base }, async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const requests = [];
    page.on('request', r => requests.push(new URL(r.url()).pathname));
    await page.route('**/_next/static/**', route => route.abort());
    await page.goto(base + '/readest/talebook-launch.html?bookId=invalid');
    await page.getByText('书籍参数无效，请返回书库后重试', { exact: true }).waitFor();
    assert(!requests.some(path => path.startsWith('/read/resource/') || path.includes('reader-bootstrap')));
    assert(await page.locator('[data-launch-actions]').isVisible());
  } finally { await browser.close(); }
});
