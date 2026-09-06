// Run only against a dedicated test instance with fixture books.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.env.TALEBOOK_TEST_URL?.replace(/\/$/, '');
assert(base && process.env.TALEBOOK_TEST_CREDENTIALS, 'Set TALEBOOK_TEST_URL and TALEBOOK_TEST_CREDENTIALS (JSON file)');
const credentials = JSON.parse(fs.readFileSync(process.env.TALEBOOK_TEST_CREDENTIALS, 'utf8'));
const prefix = new URL(base).pathname;
const origin = new URL(base).origin;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
const failures = [];
try {
    const context = await browser.newContext({ locale: 'en-US' });
    const page = await context.newPage();
    page.on('pageerror', error => failures.push(error.message));
    page.on('response', response => {
        const url = new URL(response.url());
        if (url.origin !== origin) return;
        if (!url.pathname.startsWith(prefix + '/') || response.status() >= 400) {
            failures.push(`${response.status()} ${url.pathname}`);
        }
    });
    await page.goto(base + '/login');
    await page.getByLabel('Username', { exact: true }).fill(credentials.username);
    await page.locator('#password').fill(credentials.password);
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await page.waitForURL(base + '/');
    const cookies = await context.cookies();
    for (const name of ['user_id', 'lt']) {
        assert(cookies.some(cookie => cookie.name === name && cookie.path === prefix + '/'), `${name} cookie path`);
    }
    const index = await (await context.request.get(base + '/api/index')).json();
    assert.equal(index.err, 'ok');
    // The caller supplies a fixture EPUB id; no uploads or real library mutations.
    const bookId = Number(process.env.TALEBOOK_TEST_EPUB_ID || 1);
    const detail = await (await context.request.get(base + `/api/book/${bookId}`)).json();
    assert.equal(detail.err, 'ok');
    assert(detail.book.files.some(file => file.format.toLowerCase() === 'epub'), 'Use an EPUB fixture');
    assert(detail.book.img.startsWith(prefix + '/get/'));
    await page.goto(base + `/book/${bookId}`);
    const read = page.locator(`a[href="${prefix}/read/${bookId}"]`).first();
    await read.waitFor();
    await page.reload();
    await read.waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await read.waitFor();
    const reader = await context.newPage();
    await reader.goto(base + `/read/${bookId}`);
    await reader.waitForTimeout(3000);
    assert(reader.url().startsWith(base + '/'));
    const requests = await reader.evaluate(() => performance.getEntriesByType('resource').map(entry => entry.name));
    assert(requests.some(url => url.includes(prefix + '/get/extract/')), 'Reader requests prefixed EPUB resources');
    assert(!requests.some(url => url.startsWith(origin + '/get/')), 'No unprefixed EPUB request');
    if (process.env.TALEBOOK_SCREENSHOT) await page.screenshot({ path: process.env.TALEBOOK_SCREENSHOT, fullPage: true });
    const logout = await context.request.get(base + '/api/user/sign_out');
    assert.equal((await logout.json()).err, 'ok');
    assert(!(await context.cookies()).some(cookie => ['user_id', 'lt'].includes(cookie.name)));
    assert.deepEqual(failures, []);
    console.log('PASS: login, cookie scope, API, book resources, deep refresh, mobile, EPUB extraction, logout');
} finally {
    await browser.close();
}
