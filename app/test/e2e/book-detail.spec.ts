
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

    test('does not request an undefined book when navigating to Recent', async ({ page }) => {
        const undefinedBookRequests: string[] = [];
        page.on('request', (request) => {
            if (new URL(request.url()).pathname === '/api/book/undefined') {
                undefinedBookRequests.push(request.url());
            }
        });

        await page.goto(`/book/${bookId}`);
        await expect(page.getByText(apiBook.book.title).first()).toBeVisible({ timeout: 15_000 });

        await page.locator('nav').getByRole('link', { name: '最近' }).click();

        await expect(page).toHaveURL('/recent');
        await expect(page.getByRole('heading', { name: apiRecent.title })).toBeVisible();
        expect(undefinedBookRequests).toEqual([]);
    });

    test('keeps successful metadata results when another source fails', async ({ page }) => {
        await page.goto(`/book/${bookId}`);
        await page.getByRole('button', { name: '管理', exact: true }).click();
        await page.getByText('从互联网更新信息').click();

        await expect(page.getByText('Mock Metadata Result')).toBeVisible();
        await expect(page.getByText(/Online Source B/)).toBeVisible();
        await expect(page.getByText('书源进度 1/2')).toBeVisible();
        await expect(page.getByText('未完成：Online Source B')).toBeVisible();
        await expect(page.locator('.refer-dialog .v-alert')).toHaveCount(0);
        await expect(page.locator('.refer-progress .v-progress-linear')).toHaveAttribute('role', 'progressbar');
        expect(await page.locator('.refer-dialog .v-overlay__content').evaluate(element => getComputedStyle(element).scrollbarWidth)).toBe('none');
    });

    test('opens the unified conversion dialog for a TXT book', async ({ page }) => {
        await page.goto('/book/2');
        await page.getByText('文件处理').click();
        await page.getByText('转换书籍').click();

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
        await page.getByText('转换书籍').click();

        await expect(page.locator('.conversion-option')).toHaveCount(2);
        await expect(page.getByText('AZW3')).toBeVisible();
        await expect(page.getByText('PDF')).toBeVisible();
    });

    test('shows the empty state when every target format already exists', async ({ page }) => {
        await page.goto('/book/3');
        await page.getByText('文件处理').click();
        await page.getByText('转换书籍').click();

        await expect(page.locator('.conversion-option')).toHaveCount(0);
        await expect(page.locator('.v-alert')).toBeVisible();
    });

    test('uses the unified reader when EPUB and TXT both exist', async ({ page }) => {
        await page.goto(`/book/${bookId}`);

        const readLinks = page.getByRole('link').filter({ hasText: /^(阅读|在线阅读)$/ });
        await expect(readLinks).toHaveCount(2);
        await expect(readLinks.nth(0)).toHaveAttribute('href', `/read/${bookId}`);
        await expect(readLinks.nth(1)).toHaveAttribute('href', `/read/${bookId}`);
    });

    test('redirects a legacy TXT reader URL when EPUB exists', async ({ page }) => {
        await page.goto(`/book/${bookId}/readtxt`);
        await page.waitForURL(`**/read/${bookId}`);

        expect(new URL(page.url()).pathname).toBe(`/read/${bookId}`);
    });

    test('keeps metadata chips readable and linked in the default light theme', async ({ page }) => {
        await page.goto(`/book/${bookId}`);
        await expect(page.getByText(apiBook.book.title).first()).toBeVisible({ timeout: 15_000 });

        const metadata = page.locator('.tag-chips');
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
        await expect(page.getByText('微信读书', { exact: true })).toBeVisible();
        await expect(page.getByText('这是从微信读书导入的章节级笔记。')).toBeVisible();
        await expect(page.getByText('仅章节定位').first()).toBeVisible();
        await expect(page.getByText('Talebook 原生', { exact: true })).toBeVisible();
    });

    test('filters annotations by source and deletes an owned note', async ({ page }) => {
        await page.goto(`/book/${bookId}`);
        await expect(page.getByRole('heading', { name: /笔记与高亮/ })).toBeVisible({ timeout: 15_000 });

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

        await page.getByRole('button', { name: '撤销导入' }).first().click();
        await expect(page.getByText('撤销这批导入？')).toBeVisible();
        await page.getByRole('button', { name: '撤销导入' }).last().click();
        await expect(page.getByText(/已撤销 1 条来源关联/)).toBeVisible();
        await expect(page.getByText('这是从微信读书导入的章节级笔记。')).toBeVisible();
        await expect(page.getByText('Talebook 原生').first()).toBeVisible();
    });
});
