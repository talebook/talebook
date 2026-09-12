// Real /read/ template + real HTTP API acceptance. No route mocks or injected callbacks.
const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const out = path.resolve(process.env.TB199_EVIDENCE || path.join(__dirname, '../../evidence-fix'));
const base = 'http://127.0.0.1:39299';
const report = { viewport: { width: 402, height: 874, deviceScaleFactor: 3 },
  method: 'Chromium mobile emulation; DOM Range selection in real EPUB; UI saves; no API mocks',
  cases: [], network: [], errors: [] };
async function ready(page, book) {
  await page.goto(`${base}/read/${book}`);
  await page.waitForFunction(() => {
    const a = document.querySelector('#app')?.__vue_app__;
    return a && a._instance.subTree.component.proxy.loading === false && document.querySelector('#reader iframe');
  }, null, { timeout: 60000 });
}
async function panel(page, name) {
  await page.evaluate(name => document.querySelector('#app').__vue_app__._instance.subTree.component.proxy.set_menu(name), name);
}
async function snapshot(page, name) {
  await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true });
  return `${name}.png`;
}
async function state(page) {
  return page.evaluate(() => {
    const r = document.querySelector('#app').__vue_app__._instance.subTree.component.proxy;
    return { book: r.initial_book_id, source: r.annotation_repository.source, enabled: r.settings.show_annotations,
      annotations: JSON.parse(JSON.stringify(r.annotations)), rendered: r.rendered_annotations.length,
      svgMarks: document.querySelectorAll('.candle-reader-annotation').length,
      local: Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('candle-reader:annotations:')).map(k => [k, JSON.parse(localStorage[k])])),
      toolbarCount: document.querySelectorAll('#comments-toolbar').length,
      geometry: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio, scrollWidth: document.documentElement.scrollWidth } };
  });
}
async function select(page, navigate = true, offset = 0) {
  await panel(page, 'hide');
  if (navigate) {
    await page.evaluate(async () => {
      const r = document.querySelector('#app').__vue_app__._instance.subTree.component.proxy;
      await r.rendition.display(r.book.spine.spineItems[2].href);
    });
  }
  await page.waitForTimeout(700);
  const selected = await page.evaluate(offset => {
    const r = document.querySelector('#app').__vue_app__._instance.subTree.component.proxy;
    for (const contents of r.rendition.getContents()) {
      const doc = contents.document;
      for (const p of doc.querySelectorAll('p')) {
        if (p.textContent.trim().length < 20) continue;
        const walker = doc.createTreeWalker(p, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          if (node.textContent.trim().length < offset + 20) continue;
          const range = doc.createRange(); range.setStart(node, offset); range.setEnd(node, Math.min(offset + 28, node.textContent.length));
          const cfi = contents.cfiFromRange(range);
          if (!r.rendition.getRange(cfi)) continue;
          // Let epub.js observe the real selectionchange; never inject selected_location.
          const selection = doc.getSelection(); selection.removeAllRanges(); selection.addRange(range);
          return { cfi, quote: range.toString() };
        }
      }
    }
    throw new Error('No selectable paragraph in rendered EPUB');
  }, offset);
  await expect(page.locator('#comments-toolbar')).toBeVisible();
  return selected;
}
async function notes(page) {
  await panel(page, 'hide');
  await page.locator('.v-bottom-navigation').getByRole('button', { name: /^笔记/ }).click();
  await expect(page.getByRole('dialog', { name: '阅读笔记' })).toBeVisible();
}
async function run() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  report.browser = browser.version();
  try {
    for (const book of [1, 8]) {
    for (const mode of ['login', 'guest']) {
      const prefix = `${book === 1 ? 'missing' : 'normal'}-${mode}`;
      const ctx = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
      const page = await ctx.newPage();
      page.on('pageerror', err => report.errors.push({ book, mode, error: err.message }));
      const responses = [];
      page.on('response', rsp => {
        if (/\/api\/book\/\d+\/annotations/.test(rsp.url())) responses.push((async () => {
          report.network.push({ book, mode, method: rsp.request().method(), url: rsp.url(), status: rsp.status(),
            request: rsp.request().postDataJSON(), response: await rsp.json() });
        })());
      });
      if (mode === 'login') {
        const credentials = JSON.parse(fs.readFileSync(path.join(out, '.credentials.json')));
        const rsp = await ctx.request.post(`${base}/api/user/sign_in`, { form: credentials });
        report.login = { status: rsp.status(), response: await rsp.json() };
        assert.equal(report.login.response.err, 'ok');
      }
      await ready(page, book);
      assert.equal((await state(page)).source, mode === 'login' ? 'callback' : 'localStorage');
      const selection = await select(page);
      const toolbar = page.locator('#comments-toolbar');
      assert.equal(await toolbar.count(), 1);
      const box = await toolbar.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= 402);
      report.cases.push({ book, mode, name: 'single-toolbar', selection, box, screenshot: await snapshot(page, `${prefix}-01-toolbar`) });
      await toolbar.getByRole('button', { name: '笔记', exact: true }).click();
      const content = `TB199 ${book} ${mode} 刷新恢复验收`;
      await page.getByLabel('笔记内容').fill(content);
      await page.getByRole('button', { name: '保存笔记' }).click();
      await expect(page.getByText('笔记已保存')).toBeVisible();
      await notes(page);
      await expect(page.getByText(content, { exact: true })).toBeVisible();
      report.cases.push({ book, mode, name: 'save', state: await state(page), screenshot: await snapshot(page, `${prefix}-02-saved`) });
      await select(page, true, 50);
      await toolbar.getByRole('button', { name: '划线', exact: true }).click();
      await expect(page.getByText('划线已保存')).toBeVisible();
      await notes(page);
      assert.ok((await state(page)).annotations.some(a => a.annotation_type === 'highlight'));
      report.cases.push({ book, mode, name: 'highlight-save', state: await state(page), screenshot: await snapshot(page, `${prefix}-02b-highlight`) });
      await ready(page, book);
      await notes(page);
      await expect(page.getByText(content, { exact: true })).toBeVisible();
      const restored = await state(page);
      assert.ok(restored.annotations.some(a => a.content === content));
      if (mode === 'login') assert.equal(Object.keys(restored.local).length, 0);
      report.cases.push({ book, mode, name: 'refresh-restore', state: restored, screenshot: await snapshot(page, `${prefix}-03-refresh`) });
      await ready(page, 13);
      await notes(page);
      await expect(page.getByText('还没有划线或笔记')).toBeVisible();
      const isolated = await state(page);
      assert.equal(isolated.annotations.length, 0);
      report.cases.push({ book, mode, name: 'book-isolation', state: isolated, screenshot: await snapshot(page, `${prefix}-04-other-book`) });
      await ready(page, book);
      await notes(page);
      await expect(page.getByText(content, { exact: true })).toBeVisible();
      await panel(page, 'hide');
      await page.evaluate(async cfi => {
        const r = document.querySelector('#app').__vue_app__._instance.subTree.component.proxy;
        await r.rendition.display(cfi);
      }, selection.cfi);
      await page.waitForFunction(() => document.querySelectorAll('.candle-reader-annotation').length > 0);
      report.cases.push({ book, mode, name: 'mark-before-disable', state: await state(page), screenshot: await snapshot(page, `${prefix}-05-mark`) });
      await panel(page, 'settings');
      const row = page.locator('.v-list-item').filter({ hasText: '划线笔记' });
      await row.getByRole('button', { name: '关闭', exact: true }).click();
      const disabled = await state(page);
      assert.equal(disabled.enabled, false); assert.equal(disabled.rendered, 0); assert.equal(disabled.svgMarks, 0);
      assert.equal(await page.locator('.v-bottom-navigation').getByRole('button', { name: /^笔记/ }).count(), 0);
      report.cases.push({ book, mode, name: 'disable-settings', state: disabled, screenshot: await snapshot(page, `${prefix}-06-disabled-settings`) });
      await select(page, false);
      assert.equal(await toolbar.getByRole('button', { name: '划线', exact: true }).count(), 0);
      assert.equal(await toolbar.getByRole('button', { name: '笔记', exact: true }).count(), 0);
      report.cases.push({ book, mode, name: 'disable-selection-and-marks', state: await state(page), screenshot: await snapshot(page, `${prefix}-07-disabled-selection`) });
      await page.evaluate(() => document.querySelector('#app').__vue_app__._instance.subTree.component.proxy.hide_toolbar());
      await panel(page, 'settings');
      await row.getByRole('button', { name: '开启', exact: true }).click();
      await panel(page, 'hide');
      await page.waitForFunction(() => document.querySelectorAll('.candle-reader-annotation').length > 0);
      report.cases.push({ book, mode, name: 'reenable-marks', state: await state(page), screenshot: await snapshot(page, `${prefix}-08-reenabled-mark`) });
      await notes(page);
      await expect(page.getByText(content, { exact: true })).toBeVisible();
      report.cases.push({ book, mode, name: 'reenable-data', state: await state(page), screenshot: await snapshot(page, `${prefix}-09-reenabled-data`) });
      await Promise.all(responses);
      if (mode === 'guest') assert.equal(report.network.filter(n => n.mode === 'guest').length, 0);
      // Match every successful write to the rows read from a fresh page load.
      if (mode === 'login') {
        for (const write of report.network.filter(n => n.book === book && n.method === 'POST')) {
          assert.ok(restored.annotations.some(a => a.id === write.response.annotation.id && a.cfi === write.response.annotation.cfi));
        }
      }
      await ctx.close();
    }
    }
    assert.deepEqual(report.errors, []);
    report.result = 'passed';
  } catch (error) {
    report.result = 'failed'; report.failure = error.stack; throw error;
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(out, 'acceptance.json'), JSON.stringify(report, null, 2));
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
