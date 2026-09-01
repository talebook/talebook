
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockDir = path.join(__dirname, 'mocks');
const books = JSON.parse(fs.readFileSync(path.join(mockDir, 'books.json'), 'utf-8'));
const bookId = books[0].id;
const apiBook = JSON.parse(fs.readFileSync(path.join(mockDir, `api_book_${bookId}.json`), 'utf-8'));
const apiRecent = JSON.parse(fs.readFileSync(path.join(mockDir, 'api_recent.json'), 'utf-8'));
const mockApiUrl = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

test.describe('Book Detail Page', () => {
    test.beforeEach(async ({ page, request }) => {
        await request.post(`${mockApiUrl}/_test/reset`, {
            data: { installed: true },
        });
        await page.context().clearCookies();
        await page.addInitScript(() => {
            window.localStorage.removeItem('talebook.activeTheme');
        });
    });

    test('displays book details', async ({ page }) => {
        await page.goto(`/book/${bookId}`);

        // Check title
        await expect(page.getByText(apiBook.book.title).first()).toBeVisible({ timeout: 15_000 });

        // Check author
        if (apiBook.book.authors && apiBook.book.authors.length > 0) {
        // Author might be in a chip or text
            await expect(page.getByText(apiBook.book.authors[0]).first()).toBeVisible();
        }

        // Check publisher
        if (apiBook.book.publisher) {
            await expect(page.getByText(apiBook.book.publisher).first()).toBeVisible();
        }
    
        // Check reading button（“阅读”按钮，exact 避免匹配“在线阅读”菜单项）
        await expect(page.getByText('阅读', { exact: true })).toBeVisible();
    
        // Check download button (dialog trigger)
        await expect(page.getByText('下载').first()).toBeVisible();
    });

    test('uses the requested four-zone order with one canonical action per task', async ({ page }) => {
        await page.goto(`/book/${bookId}`);
        await expect(page.getByRole('heading', { level: 1, name: apiBook.book.title })).toBeVisible({ timeout: 15_000 });

        const sectionOrder = await page.locator([
            '[data-testid="book-title-section"]',
            '[data-testid="book-metadata-section"]',
            '[data-testid="book-action-section"]',
            '[data-testid="book-content-section"]',
        ].join(', ')).evaluateAll(elements => elements.map(element => element.getAttribute('data-testid')));
        expect(sectionOrder).toEqual([
            'book-title-section',
            'book-metadata-section',
            'book-action-section',
            'book-content-section',
        ]);

        await expect(page.getByRole('heading', { level: 1, name: apiBook.book.title })).toHaveCount(1);
        await expect(page.getByRole('heading', { level: 2, name: '书籍操作' })).toHaveCount(1);
        await expect(page.getByRole('heading', { level: 2, name: '内容简介' })).toHaveCount(1);
        await expect(page.getByTestId('open-online-reader')).toHaveCount(1);
        await expect(page.getByTestId('book-action-download')).toHaveCount(1);
        await expect(page.getByTestId('book-action-send')).toHaveCount(1);
        await expect(page.getByTestId('book-action-shelf')).toHaveCount(1);
        await expect(page.getByTestId('book-action-process')).toHaveCount(1);
        await expect(page.getByTestId('book-action-manage')).toHaveCount(1);
        await expect(page.getByTestId('book-metadata-section')).toContainText('上传者');
        await expect(page.getByTestId('book-metadata-section')).toContainText('上传时间');
        await expect(page.getByTestId('book-content-section')).toContainText(apiBook.book.comments.slice(0, 20));
    });

    test('uses whitespace and soft surfaces instead of outlined section cards', async ({ page }) => {
        await page.goto(`/book/${bookId}`);
        await expect(page.getByRole('heading', { level: 1, name: apiBook.book.title })).toBeVisible({ timeout: 15_000 });

        for (const testId of [
            'book-title-section',
            'book-metadata-section',
            'book-action-section',
            'book-content-section',
        ]) {
            const styles = await page.getByTestId(testId).evaluate((element) => {
                const computed = getComputedStyle(element);
                return {
                    borderTopWidth: computed.borderTopWidth,
                    borderRightWidth: computed.borderRightWidth,
                    borderBottomWidth: computed.borderBottomWidth,
                    borderLeftWidth: computed.borderLeftWidth,
                    boxShadow: computed.boxShadow,
                };
            });
            expect(styles).toEqual({
                borderTopWidth: '0px',
                borderRightWidth: '0px',
                borderBottomWidth: '0px',
                borderLeftWidth: '0px',
                boxShadow: 'none',
            });
        }

        await expect(page.locator('.book-annotations')).toHaveCount(1);
        expect(await page.locator('.book-annotations').evaluate(element => getComputedStyle(element).borderTopWidth)).toBe('0px');
        expect(await page.getByTestId('book-action-section').evaluate(element => getComputedStyle(element).backgroundImage)).toContain('linear-gradient');
    });

    test('keeps every reader and owner action reachable on a narrow mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(`/book/${bookId}`);
        await expect(page.getByRole('heading', { level: 1, name: apiBook.book.title })).toBeVisible({ timeout: 15_000 });

        const actionTestIds = [
            'open-online-reader',
            'book-action-download',
            'book-action-send',
            'book-action-shelf',
            'book-action-reading-state',
            'open-audiobook',
            'book-action-process',
            'book-action-manage',
        ];
        for (const testId of actionTestIds) {
            const action = page.getByTestId(testId);
            await action.scrollIntoViewIfNeeded();
            await expect(action).toBeVisible();
            const bounds = await action.boundingBox();
            expect(bounds).not.toBeNull();
            expect(bounds!.x).toBeGreaterThanOrEqual(0);
            expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

        await page.getByTestId('book-action-process').click();
        await expect(page.getByText('转换格式', { exact: true })).toBeVisible();
        await page.keyboard.press('Escape');
        await page.getByTestId('book-action-manage').click();
        const editInfoAction = page.getByText('编辑书籍信息', { exact: true });
        await expect(editInfoAction).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(editInfoAction).toBeHidden();

        await page.setViewportSize({ width: 320, height: 800 });
        await page.waitForTimeout(200);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        for (const testId of actionTestIds) {
            const bounds = await page.getByTestId(testId).boundingBox();
            expect(bounds).not.toBeNull();
            expect(bounds!.x).toBeGreaterThanOrEqual(0);
            expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
        }
    });

    test('does not request an undefined book when navigating to Recent', async ({ page }) => {
        const undefinedBookRequests: string[] = [];
        const asyncDataWarnings: string[] = [];
        page.on('request', (request) => {
            if (new URL(request.url()).pathname === '/api/book/undefined') {
                undefinedBookRequests.push(request.url());
            }
        });
        page.on('console', (message) => {
            if (message.text().includes('must return a value')) asyncDataWarnings.push(message.text());
        });

        await page.goto(`/book/${bookId}`);
        await expect(page.getByText(apiBook.book.title).first()).toBeVisible({ timeout: 15_000 });

        await page.locator('nav').getByRole('link', { name: '最近' }).click();

        await expect(page).toHaveURL('/recent');
        await expect(page.getByRole('heading', { name: apiRecent.title })).toBeVisible();
        expect(undefinedBookRequests).toEqual([]);
        expect(asyncDataWarnings).toEqual([]);
    });

    test('keeps successful metadata results when another source fails', async ({ page }) => {
        await page.goto(`/book/${bookId}`);
        await page.getByRole('button', { name: '管理', exact: true }).click();
        await page.getByText('从互联网更新信息').click();

        await expect(page.getByText('Mock Metadata Result')).toBeVisible();
        await expect(page.getByText(/Online Source B/)).toBeVisible();
        await expect(page.getByText('书源进度 1/2')).toBeVisible();
        await expect(page.getByText('未完成：Online Source B')).toBeVisible();
        const failures = page.locator('.refer-progress__failures');
        expect(await failures.evaluate(element => getComputedStyle(element).whiteSpace)).toBe('normal');
        expect(await failures.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
        await expect(page.locator('.refer-dialog .v-alert')).toHaveCount(0);
        await expect(page.locator('.refer-progress .v-progress-linear')).toHaveAttribute('role', 'progressbar');
        expect(await page.locator('.refer-dialog .v-overlay__content').evaluate(element => getComputedStyle(element).scrollbarWidth)).toBe('none');
    });

    test('opens the unified conversion dialog for a TXT book', async ({ page }) => {
        await page.goto('/book/2');
        await page.getByText('文件处理').click();
        await page.getByText('转换格式').click();

        await expect(page.getByText('当前文件格式')).toBeVisible();
        await expect(page.getByText('TXT').first()).toBeVisible();
        await expect(page.getByText('EPUB').first()).toBeVisible();
        await expect(page.getByText('可转换')).toBeVisible();
        await expect(page.getByRole('button', { name: '开始转换' })).toBeEnabled();
    });

    test('opens an enabled book tool with the current book preselected', async ({ page }) => {
        await page.goto(`/book/${bookId}`);
        await page.getByText('文件处理').click();

        const toolAction = page.getByRole('link', { name: 'TXT 编码修复' });
        await expect(toolAction).toBeVisible();
        await toolAction.click();

        await expect(page).toHaveURL(`/plugins/txt-fixer?book_id=${bookId}`);
        await expect(page.getByText(/测试书 — 测试作者/)).toBeVisible();
    });

    test('shows EPUB conversion routes without unavailable routes', async ({ page }) => {
        await page.goto('/book/1');
        await page.getByText('文件处理').click();
        await expect(page.getByTestId('set-media-type-comic')).toHaveCount(0);
        await expect(page.getByTestId('set-media-type-ebook')).toHaveCount(0);
        await page.getByText('转换格式').click();

        await expect(page.locator('.conversion-option')).toHaveCount(2);
        await expect(page.getByText('AZW3')).toBeVisible();
        await expect(page.getByText('PDF')).toBeVisible();
    });

    test('shows the empty state when every target format already exists', async ({ page }) => {
        await page.goto('/book/3');
        await page.getByText('文件处理').click();
        await page.getByText('转换格式').click();

        await expect(page.locator('.conversion-option')).toHaveCount(0);
        await expect(page.locator('.v-alert')).toBeVisible();
    });

    test('uses one unified reader entry when EPUB and TXT both exist', async ({ page }) => {
        await page.goto(`/book/${bookId}`);

        const readLinks = page.locator(`a[href="/read/${bookId}"]`);
        await expect(readLinks).toHaveCount(1);
        await expect(readLinks).toContainText('阅读');
    });

    test('routes comic containers to read-comic and keeps download available', async ({ page, context }) => {
        await page.goto('/book/14');

        await expect(page.getByText('图片漫画样例').first()).toBeVisible({ timeout: 15_000 });
        await expect(page.getByTestId('media-type-chip')).toContainText('漫画');
        await expect(page.getByTestId('online-reading-unsupported')).toHaveCount(0);
        await expect(page.getByTestId('comic-reader-notice')).toHaveCount(0);
        await expect(page.getByTestId('open-online-reader')).toHaveAttribute('href', '/read-comic/14');
        await expect(page.getByTestId('open-audiobook')).toHaveCount(0);
        await expect(page.locator('a[href="/read/14"]')).toHaveCount(0);

        const apiReaderRequests: string[] = [];
        context.on('request', (request) => {
            if (new URL(request.url()).pathname === '/api/read-comic/14') apiReaderRequests.push(request.url());
        });
        const [readerPage] = await Promise.all([
            context.waitForEvent('page'),
            page.getByTestId('open-online-reader').click(),
        ]);
        await readerPage.waitForLoadState('domcontentloaded');
        await expect(readerPage.locator('#comic-reader-host')).toHaveAttribute('data-book-id', '14');
        expect(new URL(readerPage.url()).pathname).toBe('/read-comic/14');
        expect(apiReaderRequests).toEqual([]);
        await readerPage.close();

        await page.getByText('下载', { exact: true }).last().click();
        await expect(page.locator('a[href="/api/book/14.CBZ"]')).toBeVisible();
    });

    test('lets owners correct mixed ebook and comic media classification', async ({ page }) => {
        await page.goto('/book/14');
        await expect(page.getByText('图片漫画样例').first()).toBeVisible({ timeout: 15_000 });

        await page.getByText('文件处理').click();
        await expect(page.getByTestId('set-media-type-comic')).toBeVisible();
        await expect(page.getByTestId('set-media-type-ebook')).toBeVisible();
        await page.getByTestId('set-media-type-ebook').click();

        await expect(page.getByTestId('media-type-chip')).toContainText('电子书');
        await expect(page.getByTestId('open-online-reader')).toHaveAttribute('href', '/read/14');
        await expect(page.getByTestId('open-audiobook')).toBeVisible();

        await page.getByText('文件处理').click();
        await page.getByTestId('set-media-type-comic').click();

        await expect(page.getByTestId('media-type-chip')).toContainText('漫画');
        await expect(page.getByTestId('open-online-reader')).toHaveAttribute('href', '/read-comic/14');
        await expect(page.getByTestId('open-audiobook')).toHaveCount(0);
    });

    test('redirects a legacy TXT reader URL when EPUB exists', async ({ page }) => {
        await page.goto(`/book/${bookId}/readtxt`);
        await page.waitForURL(`**/read/${bookId}`);

        expect(new URL(page.url()).pathname).toBe(`/read/${bookId}`);
    });

    test('keeps metadata chips readable and linked in the default light theme', async ({ page }) => {
        await page.goto(`/book/${bookId}`);
        await expect(page.getByText(apiBook.book.title).first()).toBeVisible({ timeout: 15_000 });

        const metadata = page.locator('.book-metadata');
        const author = apiBook.book.authors[0];
        const tag = apiBook.book.tags[0];
        const authorChip = metadata.locator(`a[href="/author/${encodeURIComponent(author)}"]`);
        const tagChip = metadata.locator(`a[href="/tag/${encodeURIComponent(tag)}"]`);
        const publisherChip = metadata.locator('a', { hasText: apiBook.book.publisher });

        await expect(authorChip).toBeVisible();
        await expect(authorChip).toContainText(author);
        await expect(tagChip).toBeVisible();
        await expect(tagChip).toContainText(tag);

        const authorTextColor = await authorChip.evaluate(element => getComputedStyle(element).color);
        expect(authorTextColor).not.toBe('rgb(255, 255, 255)');

        await expect(publisherChip).toBeVisible();
        await expect(publisherChip).toHaveAttribute('href', `/publisher/${encodeURIComponent(apiBook.book.publisher)}`);

        if (apiBook.book.series) {
            const seriesChip = metadata.locator(`a[href="/series/${encodeURIComponent(apiBook.book.series)}"]`);
            await expect(seriesChip).toBeVisible();
            await expect(seriesChip).toContainText(apiBook.book.series);
        }
    });

    test('shows imported annotations with their real source and chapter-only fallback', async ({ page }) => {
        await page.goto(`/book/${bookId}`);

        await expect(page.getByRole('heading', { name: /笔记与高亮/ })).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText('另一位读者留下的公开章评。')).toBeVisible();
        await expect(page.getByText('这是从微信读书导入的章节级笔记。')).not.toBeVisible();

        await page.getByRole('tab', { name: /我的笔记/ }).click();
        await expect(page.getByText('微信读书', { exact: true })).toBeVisible();
        await expect(page.getByText('这是从微信读书导入的章节级笔记。')).toBeVisible();
        await expect(page.getByText('仅章节定位').first()).toBeVisible();
        await expect(page.getByText('Talebook 原生', { exact: true })).toBeVisible();
    });

    test('filters annotations by source and deletes an owned note', async ({ page }) => {
        await page.goto(`/book/${bookId}`);
        await expect(page.getByRole('heading', { name: /笔记与高亮/ })).toBeVisible({ timeout: 15_000 });
        await page.getByRole('tab', { name: /我的笔记/ }).click();

        await page.locator('.annotation-panel__filter .v-field__input').click();
        await page.getByRole('option', { name: 'Talebook 原生' }).click();
        await expect(page.getByText('Talebook 原生笔记，拥有精确定位。')).toBeVisible();
        await expect(page.getByText('这是从微信读书导入的章节级笔记。')).not.toBeVisible();

        await page.getByRole('button', { name: '管理“第二章 灯塔来信”中的笔记' }).click();
        await page.getByText('删除这条笔记').click();
        await page.getByRole('button', { name: '删除', exact: true }).click();
        await expect(page.getByText('笔记已删除。')).toBeVisible();
        await expect(page.getByText('Talebook 原生笔记，拥有精确定位。')).not.toBeVisible();
    });

    test('undoes one imported run while keeping the note content', async ({ page }) => {
        await page.goto(`/book/${bookId}`);
        await expect(page.getByRole('heading', { name: /笔记与高亮/ })).toBeVisible({ timeout: 15_000 });
        await page.getByRole('tab', { name: /我的笔记/ }).click();

        await page.getByRole('button', { name: '撤销导入' }).first().click();
        await expect(page.getByText('撤销这批导入？')).toBeVisible();
        await page.getByRole('button', { name: '撤销导入' }).last().click();
        await expect(page.getByText(/已撤销 1 条来源关联/)).toBeVisible();
        await expect(page.getByText('这是从微信读书导入的章节级笔记。')).toBeVisible();
        await expect(page.getByText('Talebook 原生').first()).toBeVisible();
    });

    test('hides the annotation section when the book has no visible notes', async ({ page, request }) => {
        await request.post(`${mockApiUrl}/_test/reset`, {
            data: { installed: true, annotationsEmpty: true },
        });
        await page.goto(`/book/${bookId}`);
        await expect(page.getByText(apiBook.book.title).first()).toBeVisible({ timeout: 15_000 });
        await expect(page.getByRole('heading', { name: /笔记与高亮/ })).toHaveCount(0);
    });

    test('asks for the device type before revealing its target fields', async ({ page }) => {
        await page.goto(`/book/${bookId}`);
        await page.getByText('发送到设备', { exact: true }).first().click();

        await expect(page.getByTestId('send-device-type')).toBeVisible();
        await expect(page.getByTestId('send-device-mailbox')).toHaveCount(0);
        await expect(page.getByTestId('send-device-ip')).toHaveCount(0);

        await page.getByTestId('send-device-type').click();
        await page.getByRole('option', { name: /Kindle 邮箱推送/ }).click();
        await expect(page.getByTestId('send-device-mailbox')).toBeVisible();
        await expect(page.getByTestId('send-device-ip')).toHaveCount(0);

        await page.getByTestId('send-device-type').click();
        await page.getByRole('option', { name: 'BOOX' }).click();
        await expect(page.getByTestId('send-device-mailbox')).toHaveCount(0);
        await expect(page.getByTestId('send-device-ip')).toBeVisible();
        await expect(page.getByTestId('send-device-port')).toBeVisible();
    });
});
