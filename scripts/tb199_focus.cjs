// Real Talebook keyboard focus regression. No API mocks or injected panel focus.
const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const out = path.resolve(process.env.TB199_EVIDENCE || 'evidence-focus');
const base = 'http://127.0.0.1:39299';
const report = { viewport: { width: 402, height: 874, dpr: 3 }, cases: [], errors: [] };

async function run() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  report.browser = browser.version();
  try {
    for (const theme of ['white', 'grey']) for (const mode of ['guest', 'login']) {
      const context = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
      await context.addInitScript(theme => localStorage.setItem('readerSettings', JSON.stringify({ theme, show_selection_toolbar: false })), theme);
      if (mode === 'login') {
        const credentials = JSON.parse(fs.readFileSync(path.join(out, '.credentials.json')));
        const response = await context.request.post(`${base}/api/user/sign_in`, { form: credentials });
        const result = await response.json();
        assert.equal(result.err, 'ok', 'Test login failed');
      }
      const page = await context.newPage();
      page.on('pageerror', e => report.errors.push(e.message));
      await page.goto(`${base}/read/8`);
      await page.waitForFunction(() => {
        const r = document.querySelector('#app')?.__vue_app__?._instance.subTree.component.proxy;
        return r && !r.loading && r.current_toc && r.book_id;
      });
      const source = await page.evaluate(() => document.querySelector('#app').__vue_app__._instance.subTree.component.proxy.annotation_repository.source);
      assert.equal(source, mode === 'login' ? 'callback' : 'localStorage');
      const notes = page.locator('.v-bottom-navigation').getByRole('button', { name: /^笔记/ });
      const settings = page.locator('.v-bottom-navigation').getByRole('button', { name: '设置' });
      const dialog = page.getByRole('dialog', { name: '阅读笔记' });
      async function enter(button) { await button.focus(); await page.keyboard.press('Enter'); }
      async function open() { await enter(notes); await expect(dialog).toBeVisible(); }
      async function record(name, expected) {
        await page.waitForTimeout(500);
        const state = await page.evaluate(() => {
          const r = document.querySelector('#app').__vue_app__._instance.subTree.component.proxy;
          const e = document.activeElement;
          return { tag: e.tagName, name: e.getAttribute('aria-label') || e.textContent.trim(), connected: e.isConnected,
            inActivePanel: !!e.closest('.v-overlay--active'), currentPanel: r.menu.current_panel,
            theme: r.settings.theme, navbarFocusDuringSwitch: window.panelFocusLog || [] };
        });
        if (expected === 'panel') { assert.equal(state.inActivePanel, true); assert.deepEqual(state.navbarFocusDuringSwitch, []); }
        else { await expect(expected === 'notes' ? notes : settings).toBeFocused(); assert.equal(state.currentPanel, 'hide'); }
        const screenshot = `${theme}-${mode}-${name}.png`;
        await page.screenshot({ path: path.join(out, screenshot) });
        report.cases.push({ theme, mode, source, operation: name, expected, state, result: 'passed', screenshot });
      }
      await open();
      await page.keyboard.press('Escape');
      await record('notes-escape', 'notes');
      await page.keyboard.press('Tab');
      await expect(settings).toBeFocused();
      await open();
      await enter(page.getByRole('button', { name: '关闭笔记', exact: true }));
      await record('notes-close-button', 'notes');
      for (const [label, name] of [['当前章评', 'chapter'], ['本书评论', 'book']]) {
        for (const close of ['escape', 'button']) {
          await open();
          await enter(page.getByRole('button', { name: label, exact: true }));
          const button = page.getByRole('button', { name: '关闭评论面板' });
          await expect(button).toBeVisible();
          if (close === 'escape') await page.keyboard.press('Escape'); else await enter(button);
          await record(`${name}-${close}`, 'notes');
        }
        await open();
        await page.evaluate(() => {
          window.panelFocusLog = [];
          if (!window.trackPanelFocus) {
            window.trackPanelFocus = true;
            document.addEventListener('focusin', e => {
              if (e.target.closest('.v-bottom-navigation')) window.panelFocusLog.push(e.target.textContent);
            });
          }
        });
        await enter(page.getByRole('button', { name: label, exact: true }));
        await expect(page.getByRole('button', { name: '返回笔记' })).toBeVisible();
        await record(`${name}-switch`, 'panel');
        await enter(page.getByRole('button', { name: '返回笔记' }));
        await expect(dialog).toBeVisible();
        await record(`${name}-return-notes`, 'panel');
        await enter(page.getByRole('button', { name: '前往设置开启工具栏' }));
        await expect(page.locator('[data-setting=notes_enabled]')).toBeVisible();
        await record(`${name}-to-settings`, 'panel');
        await page.keyboard.press('Escape');
        await record(`${name}-settings-close`, 'notes');
      }
      await enter(settings);
      await expect(page.locator('[data-setting=notes_enabled]')).toBeVisible();
      await page.keyboard.press('Escape');
      await record('direct-settings-close', 'settings');
      await open();
      await page.locator('.annotation-bottom-sheet .v-overlay__scrim').click({ position: { x: 10, y: 100 } });
      await record('outside-close', 'notes');
      await context.close();
    }
    assert.deepEqual(report.errors, []);
    report.result = 'passed';
  } catch (error) {
    report.result = 'failed'; report.failure = error.message; throw error;
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(out, 'focus-results.json'), JSON.stringify(report, null, 2));
  }
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
