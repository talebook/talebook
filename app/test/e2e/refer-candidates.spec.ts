import { test, expect } from '@playwright/test';

const mockApiUrl = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';
const candidate = {
    title: '冰火魔厨',
    author: '唐家三少',
    author_sort: '唐家三少',
    source: '百度百科',
    website: 'https://baike.baidu.com/item/冰火魔厨/123',
    provider_key: 'talebook.meta.baike',
    provider_value: 'https://baike.baidu.com/item/冰火魔厨/123',
    comments: '冰与火的魔法故事',
    cover_url: 'https://example.com/cover.jpg',
    pubyear: '2004',
};

test.beforeEach(async ({ request }) => {
    await request.post(`${mockApiUrl}/_test/reset`, { data: { installed: true } });
});

for (const mode of [
    { label: '设置书籍信息及图片', options: {} },
    { label: '仅设置书籍信息', options: { only_meta: 'yes' } },
    { label: '仅设置书籍图片', options: { only_cover: 'yes' } },
]) {
    test(`single Baike candidate is displayed and selected: ${mode.label}`, async ({ page }, testInfo) => {
        let submitted: Record<string, string> | undefined;
        await page.route('**/api/book/1/refer*', async route => {
            if (route.request().method() === 'POST') {
                submitted = Object.fromEntries(new URLSearchParams(route.request().postData() || ''));
                await route.fulfill({ json: { err: 'ok' } });
                return;
            }
            const frames = [
                { err: 'ok' },
                { event: 'progress', total: 1, completed: 0, failures: [] },
                candidate,
                { event: 'summary', total: 1, completed: 1, failures: [] },
            ];
            await route.fulfill({
                contentType: 'application/x-ndjson',
                body: frames.map(frame => JSON.stringify(frame)).join('\n') + '\n',
            });
        });
        await page.goto('/book/1');
        await page.getByRole('button', { name: '管理', exact: true }).click();
        await page.getByText('从互联网更新信息').click();
        const dialog = page.locator('.refer-dialog');
        await expect(dialog.getByText('冰火魔厨', { exact: true })).toBeVisible();
        await expect(dialog.getByText('唐家三少', { exact: true }).first()).toBeVisible();
        await expect(dialog.getByText('百度百科', { exact: true })).toBeVisible();
        await expect(dialog.getByText('2004', { exact: true })).toBeVisible();
        await expect(dialog.getByText(/未找到匹配记录/)).toHaveCount(0);
        await dialog.getByRole('button', { name: '设置', exact: true }).click();
        for (const label of ['设置书籍信息及图片', '仅设置书籍信息', '仅设置书籍图片']) {
            await expect(page.getByText(label, { exact: true })).toBeVisible();
        }
        if (Object.keys(mode.options).length === 0) {
            await page.screenshot({ path: testInfo.outputPath('refer-candidate.png'), fullPage: true });
        }
        await page.getByText(mode.label, { exact: true }).click();
        await expect.poll(() => submitted).toEqual({
            provider_key: candidate.provider_key,
            provider_value: candidate.provider_value,
            ...mode.options,
        });
        await expect(dialog).toBeHidden();
    });
}
