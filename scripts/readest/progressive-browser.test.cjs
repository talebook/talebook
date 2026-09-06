// Real backend regression; never writes credentials or book contents to reports.
const { chromium } = require('../../app/node_modules/@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.READEST_BASE_URL;
assert(base && process.env.READEST_PASSWORD, 'Set READEST_BASE_URL and READEST_PASSWORD');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
    const response = await context.request.post(base + '/api/user/sign_in', {
      form: { username: 'admin', password: process.env.READEST_PASSWORD },
    });
    assert.equal((await response.json()).err, 'ok');
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 100,
      downloadThroughput: 1250000, uploadThroughput: 1250000 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'warning' && /Optional navigation|fragment CFIs/.test(m.text())) errors.push(m.text()); });
    await page.goto(base + '/read/10?reader=readest');
    await page.waitForFunction(() => /\d+\s*\/\s*\d+/.test(document.body.innerText), null, { timeout: 60000 });
    const view = page.locator('foliate-view').first();
    const initial = await view.evaluate(el => {
      const items = xs => xs.flatMap(x => [x, ...items(x.subitems || [])]);
      const toc = items(el.book.toc);
      window.__progressiveTest = { el, item: toc[1], cfi: el.lastLocation.cfi };
      return { sections: el.book.sections.length, indexed: el.book.sections.filter(s => s.fragments?.length).length, toc: toc.length };
    });
    assert.equal(initial.indexed, 0, 'First readable page must precede full fragment indexing');
    // Jump through the real TOC immediately; it must not wait for the index.
    await page.touchscreen.tap(206, 700);
    await page.getByRole('button', { name: 'Table of Contents', exact: true }).tap();
    await page.getByText('第一回 灵根育孕源流出 心性修持大道生', { exact: true }).first().tap();
    await page.waitForFunction(() => {
      const state = window.__progressiveTest;
      return state.el.lastLocation.cfi !== state.cfi;
    });
    await page.waitForFunction(() => {
      const el = window.__progressiveTest.el;
      const items = xs => xs.flatMap(x => [x, ...items(x.subitems || [])]);
      const ids = new Set(items(el.book.toc).filter(x => x.href.includes('#')).map(x => el.book.splitTOCHref(x.href)[0]));
      return ids.size > 0 && el.book.sections.filter(s => ids.has(s.id)).every(s => s.fragments?.length);
    }, null, { timeout: 60000 });
    const completed = await view.evaluate(el => {
      const items = xs => xs.flatMap(x => [x, ...items(x.subitems || [])]);
      const toc = items(el.book.toc);
      return { indexed: el.book.sections.filter(s => s.fragments?.length).length,
        sameView: el === window.__progressiveTest.el,
        sameItem: toc[1] === window.__progressiveTest.item,
        page: document.body.innerText.match(/\d+\s*\/\s*\d+/)?.[0],
        hasBody: el.renderer.getContents().some(x => x.doc.body.innerText.length > 100) };
    });
    assert(completed.sameView && completed.sameItem && completed.hasBody);
    assert.equal(errors.length, 0);
    if (process.env.READEST_SCREENSHOT) await page.screenshot({ path: process.env.READEST_SCREENSHOT });
    const result = { initial, completed, errors };
    if (process.env.READEST_RESULT_PATH) fs.writeFileSync(process.env.READEST_RESULT_PATH, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
  } finally { await browser.close(); }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
