import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';

// This private file is written by scripts/venera_proxy_live.py in an owned fixture.
const access = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
const repository = fileURLToPath(new URL('../../', import.meta.url));
const output = path.resolve(repository, access.output);
const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
    args: ['--no-sandbox'],
});
try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const login = await context.request.post(`${access.base_url}/api/user/sign_in`, {
        form: { username: access.username, password: access.password },
    });
    assert.equal((await login.json()).err, 'ok');
    const page = await context.newPage();
    const main = await page.goto(access.reader_url);
    assert.equal(main.status(), 200);
    await expect(page.locator('.kr-spread img').first()).toBeVisible({ timeout: 90000 });
    await expect.poll(() => page.locator('.kr-spread img').first().evaluate(image => image.complete && image.naturalWidth > 0), { timeout: 90000 }).toBe(true);
    await page.screenshot({ path: path.join(output, 'proxy-reader-desktop.png') });
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.kr-page-count')).toContainText('2', { timeout: 10000 });
    await expect.poll(() => page.locator('.kr-spread img').first().evaluate(image => image.complete && image.naturalWidth > 0), { timeout: 90000 }).toBe(true);
    await page.setViewportSize({ width: 320, height: 740 });
    await page.screenshot({ path: path.join(output, 'proxy-reader-mobile.png') });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false);
    const assetUrls = await page.evaluate(() => performance.getEntriesByType('resource').filter(entry => entry.name.includes('/static/komga-reader/')).map(entry => new URL(entry.name).pathname));
    const prefix = new URL(access.base_url).pathname.replace(/\/$/, '');
    assert.ok(assetUrls.length >= 2 && assetUrls.every(url => url.startsWith(`${prefix}/static/komga-reader/`)));
    await page.getByRole('button', { name: 'Exit reader' }).click();
    await page.waitForURL(url => url.pathname === `${prefix}/network/book`);
    const report = { image_decoded: true, flipped: true, mobile_width: 320, overflow, reader_assets: assetUrls, exit_path: new URL(page.url()).pathname };
    await fs.writeFile(path.resolve(repository, access.completed), JSON.stringify(report));
    console.log(JSON.stringify(report));
} finally {
    await browser.close();
}
