const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { chromium } = require('../../app/node_modules/@playwright/test');

test('launcher and recovery actions reflow at 320px and 200% text size', async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    for (const file of ['app/public/readest/talebook-launch.html', 'webserver/resources/book/readest_error.html']) {
      const html = readFileSync(path.resolve(__dirname, '../..', file), 'utf8')
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
        .replace('{{ message }}', '本书正在转换为 EPUB，请稍后重试')
        .replace('{{ error }}', 'reader.conversion_pending');
      for (const colorScheme of ['light', 'dark']) {
        const page = await browser.newPage({ viewport: { width: 320, height: 800 }, colorScheme, reducedMotion: 'reduce' });
        await page.setContent(html);
        await page.locator('[data-launch-actions]').evaluateAll(nodes => nodes.forEach(n => n.hidden = false));
        for (const fontSize of [16, 32]) {
          await page.evaluate(size => { document.documentElement.style.fontSize = size + 'px'; document.body.style.fontSize = size + 'px'; }, fontSize);
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${file}: overflow at ${fontSize}px`);
          for (const link of await page.locator('nav a:visible').all()) {
            const box = await link.boundingBox();
            assert(box && box.x >= 0 && box.x + box.width <= 320, `${file}: action clipped`);
          }
        }
        await page.keyboard.press('Tab');
        assert(await page.evaluate(() => document.activeElement.tagName === 'A'));
        assert(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle !== 'none'));
        if (file.includes('launch')) assert.equal(await page.locator('.spinner').evaluate(n => getComputedStyle(n).animationName), 'none');
        await page.close();
      }
    }
  } finally { await browser.close(); }
});
