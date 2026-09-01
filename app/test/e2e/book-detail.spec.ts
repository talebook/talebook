
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
        await expect(page.getByTestId('metadata-reading-action')).toHaveCount(1);
        await expect(page.getByTestId('metadata-shelf-action')).toHaveCount(1);
        await expect(page.getByTestId('book-action-shelf')).toHaveCount(0);
        await expect(page.getByTestId('book-action-reading-state')).toHaveCount(0);
        await expect(page.getByTestId('book-action-process')).toHaveCount(1);
        await expect(page.getByTestId('book-action-manage')).toHaveCount(1);
        await expect(page.getByTestId('book-metadata-section')).toContainText('上传者');
        await expect(page.getByTestId('book-metadata-section')).toContainText('上传时间');
        await expect(page.getByTestId('book-content-section')).toContainText(apiBook.book.comments.slice(0, 20));
    });

    test('keeps reading and shelf state in metadata without duplicate action entries', async ({ page }) => {
        await page.goto(`/book/${bookId}`);
        await expect(page.getByRole('heading', { level: 1, name: apiBook.book.title })).toBeVisible({ timeout: 15_000 });

        await expect(page.getByTestId('metadata-reading-status')).toHaveText('想读');
        await expect(page.getByTestId('metadata-reading-action')).toContainText('设为在读');
        await expect(page.getByTestId('metadata-shelf-status')).toHaveText('未加入书架');
        await expect(page.getByTestId('metadata-shelf-action')).toContainText('加入书架');
        await expect(page.getByTestId('book-action-shelf')).toHaveCount(0);
        await expect(page.getByTestId('book-action-reading-state')).toHaveCount(0);

        await page.getByTestId('metadata-shelf-action').click();
        await expect(page.getByTestId('metadata-shelf-status')).toHaveText('已加入书架');
        await expect(page.getByTestId('metadata-shelf-action')).toContainText('移除书架');

        await page.getByTestId('metadata-reading-action').click();
        await expect(page.getByTestId('metadata-reading-status')).toHaveText('在读');
        await expect(page.getByTestId('metadata-reading-action')).toContainText('标记读完');
        await expect(page.getByTestId('metadata-shelf-status')).toHaveText('已加入书架');

        await page.getByTestId('metadata-reading-action').click();
        await expect(page.getByTestId('metadata-reading-status')).toHaveText('已读');
        await expect(page.getByTestId('metadata-reading-action')).toContainText('设为想读');

        await page.getByTestId('metadata-reading-action').click();
        await expect(page.getByTestId('metadata-reading-status')).toHaveText('想读');
    });

    test('uses one aligned field-status-action structure for both metadata state rows', async ({ page }) => {
        await page.goto(`/book/${bookId}`);
        await expect(page.getByRole('heading', { level: 1, name: apiBook.book.title })).toBeVisible({ timeout: 15_000 });

        for (const viewport of [
            { width: 1280, height: 900 },
            { width: 390, height: 844 },
        ]) {
            await page.setViewportSize(viewport);
            await page.waitForTimeout(100);
            await page.getByTestId('metadata-reading-row').scrollIntoViewIfNeeded();
            const layout = await page.evaluate(() => {
                const collect = (rowTestId, statusTestId, actionTestId) => {
                    const row = document.querySelector(`[data-testid="${rowTestId}"]`);
                    const label = row?.querySelector('dt');
                    const control = row?.querySelector('dd');
                    const status = document.querySelector(`[data-testid="${statusTestId}"]`);
                    const action = document.querySelector(`[data-testid="${actionTestId}"]`);
                    const icon = status?.querySelector('.v-icon');
                    if (!row || !label || !control || !status || !action || !icon) return null;
                    const labelRect = label.getBoundingClientRect();
                    const controlRect = control.getBoundingClientRect();
                    const statusRect = status.getBoundingClientRect();
                    const actionRect = action.getBoundingClientRect();
                    const controlStyle = getComputedStyle(control);
                    const statusStyle = getComputedStyle(status);
                    const actionStyle = getComputedStyle(action);
                    const actionTargetStyle = getComputedStyle(action, '::before');
                    return {
                        row: {
                            top: row.getBoundingClientRect().top,
                            bottom: row.getBoundingClientRect().bottom,
                            height: row.getBoundingClientRect().height,
                        },
                        label: { left: labelRect.left, right: labelRect.right, top: labelRect.top, bottom: labelRect.bottom },
                        control: { left: controlRect.left, top: controlRect.top, bottom: controlRect.bottom, height: controlRect.height },
                        status: { left: statusRect.left, top: statusRect.top, width: statusRect.width, height: statusRect.height },
                        action: {
                            left: actionRect.left,
                            right: actionRect.right,
                            top: actionRect.top,
                            bottom: actionRect.bottom,
                            width: actionRect.width,
                            height: actionRect.height,
                        },
                        display: controlStyle.display,
                        columns: controlStyle.gridTemplateColumns,
                        borderRadius: statusStyle.borderRadius,
                        iconSize: getComputedStyle(icon).fontSize,
                        actionBackground: actionStyle.backgroundColor,
                        actionBorder: actionStyle.borderTopWidth,
                        actionOverflow: actionStyle.overflow,
                        actionTargetHeight: Number.parseFloat(actionTargetStyle.height),
                    };
                };
                const referenceRows = Array.from(document.querySelectorAll('.book-facts__row:not(.book-facts__row--state)'));
                const referenceRowHeights = referenceRows.map(row => row.getBoundingClientRect().height);
                const referenceControlHeights = referenceRows
                    .map(row => row.querySelector('dd')?.getBoundingClientRect().height)
                    .filter(height => typeof height === 'number');
                const hitsExpandedTarget = (selector, edge) => {
                    const action = document.querySelector(selector);
                    if (!action) return false;
                    const rect = action.getBoundingClientRect();
                    const x = rect.left + rect.width / 2;
                    const y = edge === 'top' ? rect.top - 6 : rect.bottom + 6;
                    return document.elementFromPoint(x, y)?.closest(selector) === action;
                };
                const stateActionSelector = [
                    '[data-testid="metadata-reading-action"]',
                    '[data-testid="metadata-shelf-action"]',
                ].join(', ');
                const stateActionAt = (x, y) => document.elementFromPoint(x, y)
                    ?.closest(stateActionSelector)
                    ?.getAttribute('data-testid') ?? null;
                const readingAction = document.querySelector('[data-testid="metadata-reading-action"]');
                const shelfAction = document.querySelector('[data-testid="metadata-shelf-action"]');
                const targetBounds = (action) => {
                    const rect = action.getBoundingClientRect();
                    const targetHeight = Number.parseFloat(getComputedStyle(action, '::before').height);
                    const expansion = (targetHeight - rect.height) / 2;
                    return {
                        top: rect.top - expansion,
                        bottom: rect.bottom + expansion,
                    };
                };
                const readingTarget = targetBounds(readingAction);
                const shelfTarget = targetBounds(shelfAction);
                const interfaceX = (
                    Math.max(readingAction.getBoundingClientRect().left, shelfAction.getBoundingClientRect().left)
                    + Math.min(readingAction.getBoundingClientRect().right, shelfAction.getBoundingClientRect().right)
                ) / 2;
                const interfaceHits = Array.from({ length: 7 }, (_, index) => stateActionAt(
                    interfaceX,
                    readingTarget.bottom + ((shelfTarget.top - readingTarget.bottom) * (index + 1) / 8),
                ));
                const labelHits = [
                    ['metadata-reading-row', readingAction],
                    ['metadata-shelf-row', shelfAction],
                ].flatMap(([rowTestId, action]) => {
                    const label = document.querySelector(`[data-testid="${rowTestId}"] dt`);
                    const labelRect = label.getBoundingClientRect();
                    const actionRect = action.getBoundingClientRect();
                    return [0.2, 0.5, 0.8].map(position => stateActionAt(
                        actionRect.left + actionRect.width / 2,
                        labelRect.top + labelRect.height * position,
                    ));
                });
                return {
                    reading: collect('metadata-reading-row', 'metadata-reading-status', 'metadata-reading-action'),
                    shelf: collect('metadata-shelf-row', 'metadata-shelf-status', 'metadata-shelf-action'),
                    reference: {
                        rowMin: Math.min(...referenceRowHeights),
                        rowMax: Math.max(...referenceRowHeights),
                        controlMin: Math.min(...referenceControlHeights),
                        controlMax: Math.max(...referenceControlHeights),
                    },
                    expandedTarget: {
                        readingTop: hitsExpandedTarget('[data-testid="metadata-reading-action"]', 'top'),
                        shelfBottom: hitsExpandedTarget('[data-testid="metadata-shelf-action"]', 'bottom'),
                    },
                    safety: {
                        stateRowGap: document.querySelector('[data-testid="metadata-shelf-row"]').getBoundingClientRect().top
                            - document.querySelector('[data-testid="metadata-reading-row"]').getBoundingClientRect().bottom,
                        targetGap: shelfTarget.top - readingTarget.bottom,
                        interfaceHits,
                        labelHits,
                    },
                };
            });

            expect(layout.reading).not.toBeNull();
            expect(layout.shelf).not.toBeNull();
            const reading = layout.reading!;
            const shelf = layout.shelf!;
            expect(reading.display).toBe('grid');
            expect(reading.columns).toBe(shelf.columns);
            expect(Math.abs(reading.status.left - shelf.status.left)).toBeLessThanOrEqual(1);
            expect(Math.abs(reading.status.width - shelf.status.width)).toBeLessThanOrEqual(1);
            expect(Math.abs(reading.status.height - shelf.status.height)).toBeLessThanOrEqual(1);
            expect(Math.abs(reading.action.left - shelf.action.left)).toBeLessThanOrEqual(1);
            expect(Math.abs((reading.status.top + reading.status.height / 2) - (reading.action.top + reading.action.height / 2))).toBeLessThanOrEqual(1);
            expect(Math.abs((shelf.status.top + shelf.status.height / 2) - (shelf.action.top + shelf.action.height / 2))).toBeLessThanOrEqual(1);
            expect(reading.borderRadius).toBe(shelf.borderRadius);
            expect(reading.iconSize).toBe('18px');
            expect(shelf.iconSize).toBe('18px');
            expect(reading.status.height).toBe(30);
            expect(shelf.status.height).toBe(30);
            expect(reading.control.height).toBe(reading.status.height);
            expect(shelf.control.height).toBe(shelf.status.height);
            expect(reading.control.height).toBeGreaterThanOrEqual(layout.reference.controlMin);
            expect(reading.control.height).toBeLessThanOrEqual(layout.reference.controlMax);
            expect(shelf.control.height).toBeGreaterThanOrEqual(layout.reference.controlMin);
            expect(shelf.control.height).toBeLessThanOrEqual(layout.reference.controlMax);
            expect(reading.action.height).toBeLessThan(44);
            expect(shelf.action.height).toBeLessThan(44);
            expect(reading.actionTargetHeight).toBe(44);
            expect(shelf.actionTargetHeight).toBe(44);
            expect(reading.actionOverflow).toBe('visible');
            expect(shelf.actionOverflow).toBe('visible');
            expect(layout.expandedTarget.readingTop).toBe(true);
            expect(layout.expandedTarget.shelfBottom).toBe(true);
            expect(layout.safety.stateRowGap).toBeGreaterThanOrEqual(22);
            expect(layout.safety.targetGap).toBeGreaterThanOrEqual(8);
            expect(layout.safety.interfaceHits).toEqual(Array(7).fill(null));
            expect(reading.actionBackground).toBe('rgba(0, 0, 0, 0)');
            expect(shelf.actionBackground).toBe('rgba(0, 0, 0, 0)');
            expect(reading.actionBorder).toBe('0px');
            expect(shelf.actionBorder).toBe('0px');

            if (viewport.width <= 480) {
                expect(reading.control.top - reading.label.bottom).toBeGreaterThanOrEqual(15);
                expect(shelf.control.top - shelf.label.bottom).toBeGreaterThanOrEqual(15);
                expect(layout.safety.labelHits).toEqual(Array(6).fill(null));
            }
            else {
                expect(reading.row.height).toBeGreaterThanOrEqual(layout.reference.rowMin);
                expect(reading.row.height).toBeLessThanOrEqual(layout.reference.rowMax);
                expect(shelf.row.height).toBeGreaterThanOrEqual(layout.reference.rowMin);
                expect(shelf.row.height).toBeLessThanOrEqual(layout.reference.rowMax);
            }
        }
    });

    test('isolates state hit-area edges from labels and the neighboring operation', async ({ page, request }) => {
        const clickExpandedEdge = async (testId, edge) => {
            const point = await page.getByTestId(testId).evaluate((action, requestedEdge) => {
                const rect = action.getBoundingClientRect();
                const targetHeight = Number.parseFloat(getComputedStyle(action, '::before').height);
                const expansion = (targetHeight - rect.height) / 2;
                return {
                    x: rect.left + rect.width / 2,
                    y: requestedEdge === 'top'
                        ? rect.top - expansion + 1
                        : rect.bottom + expansion - 1,
                };
            }, edge);
            await page.mouse.click(point.x, point.y);
        };

        for (const viewport of [
            { width: 1280, height: 900 },
            { width: 390, height: 844 },
        ]) {
            await request.post(`${mockApiUrl}/_test/reset`, {
                data: { installed: true },
            });
            await page.setViewportSize(viewport);
            await page.goto(`/book/${bookId}`);
            await expect(page.getByTestId('metadata-reading-status')).toHaveText('想读');
            await expect(page.getByTestId('metadata-shelf-status')).toHaveText('未加入书架');
            await page.getByTestId('metadata-reading-row').scrollIntoViewIfNeeded();

            if (viewport.width <= 480) {
                for (const rowTestId of ['metadata-reading-row', 'metadata-shelf-row']) {
                    const point = await page.getByTestId(rowTestId).evaluate((row) => {
                        const label = row.querySelector('dt');
                        const action = row.querySelector('[data-testid$="-action"]');
                        const labelRect = label.getBoundingClientRect();
                        const actionRect = action.getBoundingClientRect();
                        return {
                            x: actionRect.left + actionRect.width / 2,
                            y: labelRect.bottom - 1,
                        };
                    });
                    await page.mouse.click(point.x, point.y);
                }
                await expect(page.getByTestId('metadata-reading-status')).toHaveText('想读');
                await expect(page.getByTestId('metadata-shelf-status')).toHaveText('未加入书架');
            }

            await clickExpandedEdge('metadata-reading-action', 'top');
            await expect(page.getByTestId('metadata-reading-status')).toHaveText('在读');
            await expect(page.getByTestId('metadata-shelf-status')).toHaveText('未加入书架');

            await clickExpandedEdge('metadata-reading-action', 'bottom');
            await expect(page.getByTestId('metadata-reading-status')).toHaveText('已读');
            await expect(page.getByTestId('metadata-shelf-status')).toHaveText('未加入书架');

            await clickExpandedEdge('metadata-shelf-action', 'top');
            await expect(page.getByTestId('metadata-shelf-status')).toHaveText('已加入书架');
            await expect(page.getByTestId('metadata-reading-status')).toHaveText('已读');

            await clickExpandedEdge('metadata-shelf-action', 'bottom');
            await expect(page.getByTestId('metadata-shelf-status')).toHaveText('未加入书架');
            await expect(page.getByTestId('metadata-reading-status')).toHaveText('已读');
        }
    });

    test('aligns the title with the cover and lets the introduction use the full width', async ({ page }) => {
        await page.goto(`/book/${bookId}`);
        await expect(page.getByRole('heading', { level: 1, name: apiBook.book.title })).toBeVisible({ timeout: 15_000 });

        const measureLayout = () => page.evaluate(() => {
            const titleSection = document.querySelector('[data-testid="book-title-section"]');
            const title = titleSection?.querySelector('h1');
            const overview = document.querySelector('[data-testid="book-metadata-section"]');
            const content = document.querySelector('[data-testid="book-content-section"]');
            const introduction = content?.querySelector('.book-comments');
            if (!titleSection || !title || !overview || !content || !introduction) return null;
            const titleSectionRect = titleSection.getBoundingClientRect();
            const titleRect = title.getBoundingClientRect();
            const overviewRect = overview.getBoundingClientRect();
            const contentRect = content.getBoundingClientRect();
            const introductionRect = introduction.getBoundingClientRect();
            return {
                titleTopInset: titleRect.top - titleSectionRect.top,
                titleToOverviewGap: overviewRect.top - titleSectionRect.bottom,
                introductionLeftGap: introductionRect.left - contentRect.left,
                introductionRightGap: contentRect.right - introductionRect.right,
                introductionMaxWidth: getComputedStyle(introduction).maxWidth,
            };
        });

        for (const viewport of [
            { width: 1280, height: 900 },
            { width: 390, height: 844 },
        ]) {
            await page.setViewportSize(viewport);
            await page.waitForTimeout(100);
            const layout = await measureLayout();
            expect(layout).not.toBeNull();
            expect(layout!.titleTopInset).toBeGreaterThanOrEqual(16);
            expect(layout!.titleToOverviewGap).toBeLessThanOrEqual(26);
            expect(Math.abs(layout!.introductionLeftGap)).toBeLessThanOrEqual(1);
            expect(Math.abs(layout!.introductionRightGap)).toBeLessThanOrEqual(1);
            expect(layout!.introductionMaxWidth).toBe('none');
        }
    });

    test('uses whitespace instead of outlined cards or container surfaces', async ({ page }) => {
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
        for (const selector of [
            '[data-testid="book-action-section"]',
            '.book-provenance',
            '.book-annotations',
        ]) {
            const styles = await page.locator(selector).evaluate((element) => {
                const computed = getComputedStyle(element);
                return {
                    backgroundColor: computed.backgroundColor,
                    backgroundImage: computed.backgroundImage,
                    borderRadius: computed.borderRadius,
                };
            });
            expect(styles).toEqual({
                backgroundColor: 'rgba(0, 0, 0, 0)',
                backgroundImage: 'none',
                borderRadius: '0px',
            });
        }
    });

    test('keeps every reader and owner action reachable on a narrow mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(`/book/${bookId}`);
        await expect(page.getByRole('heading', { level: 1, name: apiBook.book.title })).toBeVisible({ timeout: 15_000 });

        const actionTestIds = [
            'open-online-reader',
            'book-action-download',
            'book-action-send',
            'metadata-shelf-action',
            'metadata-reading-action',
            'open-audiobook',
            'book-action-process',
            'book-action-manage',
        ];
        const compactMetadataActions = new Set([
            'metadata-shelf-action',
            'metadata-reading-action',
        ]);
        for (const testId of actionTestIds) {
            const action = page.getByTestId(testId);
            await action.scrollIntoViewIfNeeded();
            await expect(action).toBeVisible();
            const bounds = await action.boundingBox();
            expect(bounds).not.toBeNull();
            expect(bounds!.x).toBeGreaterThanOrEqual(0);
            expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
            if (compactMetadataActions.has(testId)) {
                expect(bounds!.height).toBeLessThan(44);
                expect(await action.evaluate(element => Number.parseFloat(getComputedStyle(element, '::before').height))).toBe(44);
            }
            else {
                expect(bounds!.height).toBeGreaterThanOrEqual(44);
            }
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
            if (compactMetadataActions.has(testId)) {
                expect(bounds!.height).toBeLessThan(44);
                expect(await page.getByTestId(testId).evaluate(element => Number.parseFloat(getComputedStyle(element, '::before').height))).toBe(44);
            }
            else {
                expect(bounds!.height).toBeGreaterThanOrEqual(44);
            }
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
