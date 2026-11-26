import { test, expect } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

test.describe('Legado cross-page selection', () => {
    test('retains matching IDs across pages, confirms deletion, and clears on filter changes', async ({ page, request }, testInfo) => {
        await request.post(`${mockApi}/_test/reset`, { data: { installed: true } });
        const ids = Array.from({ length: 53 }, (_, n) => n + 1);
        const before = '2026-11-26T09:00:00';
        const deletes: unknown[] = [];
        let selectionReads = 0;
        await page.route('**/api/admin/booksource/list?*', async (route) => {
            const params = new URL(route.request().url()).searchParams;
            const eligible = params.get('enabled') === 'true' && !params.get('q');
            if (params.get('selection') === 'ids') {
                selectionReads += 1;
                return route.fulfill({ json: { err: 'ok', ids: eligible ? ids : [], selected_before: before } });
            }
            const offset = (Number(params.get('page')) - 1) * 50;
            return route.fulfill({
                json: {
                    err: 'ok',
                    items: eligible ? ids.slice(offset, offset + 50).map(id => ({
                        id, name: `筛选书源 ${id}`, url: `https://source${id}.example`, enabled: true, check_status: 'ok',
                    })) : [],
                    count: eligible ? ids.length : 0,
                },
            });
        });
        await page.route('**/api/admin/booksource', async (route) => {
            if (route.request().method() !== 'DELETE') return route.continue();
            const payload = route.request().postDataJSON();
            deletes.push(payload);
            return route.fulfill({ json: { err: 'ok', deleted: payload.ids.length } });
        });
        await page.goto('/plugins/legado');
        await expect(page.getByText('https://source1.example', { exact: true })).toBeVisible();
        await page.getByRole('button', { name: '全选本页', exact: true }).click();
        await expect(page.getByText('已选 50 项')).toBeVisible();
        expect(selectionReads).toBe(0);
        await page.getByRole('button', { name: '选中当前筛选的全部 53 项' }).click();
        await expect(page.getByText('已跨页选中 53 项')).toBeVisible();
        expect(selectionReads).toBe(1);
        const screenshot = testInfo.outputPath('cross-page-selection.png');
        await page.getByText('已跨页选中 53 项').scrollIntoViewIfNeeded();
        await page.screenshot({ path: screenshot });
        await testInfo.attach('cross-page-selection', { path: screenshot, contentType: 'image/png' });

        await page.setViewportSize({ width: 390, height: 844 });
        await expect(page.getByRole('button', { name: '取消全选', exact: true })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
        await page.setViewportSize({ width: 1280, height: 720 });

        await page.locator('.v-pagination').getByRole('button').filter({ hasText: /^2$/ }).click();
        const lastRow = page.getByRole('row').filter({ hasText: '筛选书源 53' });
        await expect(lastRow).toBeVisible();
        await expect(lastRow.getByRole('cell').first().getByRole('checkbox')).toBeChecked();
        await lastRow.getByRole('cell').first().getByRole('checkbox').uncheck();
        await expect(page.getByText('已跨页选中 52 项')).toBeVisible();

        const deleteSelection = page.locator('.legado-workbench > .v-card-actions').getByRole('button', { name: '删除', exact: true });
        let confirmation = '';
        page.once('dialog', async (dialog) => {
            confirmation = dialog.message();
            await dialog.dismiss();
        });
        await deleteSelection.click();
        expect(confirmation).toContain('52');
        expect(deletes).toHaveLength(0);

        page.once('dialog', dialog => dialog.accept());
        await deleteSelection.click();
        await expect.poll(() => deletes.length).toBe(1);
        expect(deletes[0]).toEqual({ ids: ids.slice(0, -1), selection_filter: { enabled: 'true', q: '', before } });
        await expect(deleteSelection).toBeDisabled();

        await page.locator('.v-pagination').getByRole('button').filter({ hasText: /^1$/ }).click();
        await page.getByRole('button', { name: '全选本页', exact: true }).click();
        await page.getByRole('button', { name: '选中当前筛选的全部 53 项' }).click();
        await expect(page.getByText('已跨页选中 53 项')).toBeVisible();
        await page.getByPlaceholder('搜索书源名称').fill('新的筛选');
        await expect(page.getByText('已跨页选中 53 项')).toBeHidden();
        await expect(deleteSelection).toBeDisabled();
    });
});
