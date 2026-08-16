import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

const artifact = {
    id: '22222222-2222-2222-2222-222222222222', feature: 'toc_organizer', book_id: 1,
    book_version: 'fixture-v1', status: 'succeeded', progress_message: '目录建议已生成',
    schema_version: 'toc_organizer.v1', prompt_version: 'toc_organizer.zh.v1', runtime: 'codex_app_server',
    error: null, writable: true, toc_kind: 'nav', application: { status: 'not_applied', selected_count: 0 },
    diagnostics: [{ code: 'toc.invalid_anchor', severity: 'high', message: '“旧第二章”指向无效锚点', node_ids: ['old-2'] }],
    original_nodes: [],
    nodes: [
        { id: 'chapter-1', parent_id: null, order: 0, label: '第一章', href: 'Text/1.xhtml#one', reason: '正文一级标题', evidence: ['h1 第一章'], confidence: 0.99, risk: 'low', selected: true },
        { id: 'chapter-2', parent_id: null, order: 1, label: '第二章', href: 'Text/2.xhtml#two', reason: '修复旧锚点', evidence: ['h1 第二章'], confidence: 0.92, risk: 'medium', selected: true },
    ],
    changes: [{ id: 'fix-2', operation: 'fix_anchor', node_id: 'chapter-2', before: 'missing.xhtml', after: 'Text/2.xhtml#two', reason: '原锚点不存在', evidence: ['manifest 与正文 id'], confidence: 0.92, risk: 'medium', selected: true }],
};

async function mount(page) {
    await page.route('**/api/ai/toc_organizer/tasks?book_id=1', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ err: 'ok', tasks: [artifact] }) }));
    await page.setContent('<!doctype html><html><head><meta charset="utf-8"><base href="http://127.0.0.1:3000/"></head><body><main id="reader"></main></body></html>');
    await page.addStyleTag({ path: resolve(process.cwd(), 'public/static/js/toc-organizer.css') });
    await page.addScriptTag({ path: resolve(process.cwd(), 'public/static/js/toc-organizer.js') });
    await page.evaluate(() => window.TalebookTocOrganizerInit({ bookId: 1 }));
    await page.getByRole('button', { name: '整理目录' }).click();
    await expect(page.getByRole('dialog', { name: 'AI 目录整理' })).toBeVisible();
}

test('renders diagnosis, explainable diff, and editable suggested tree', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await mount(page);
    await expect(page.getByText('“旧第二章”指向无效锚点')).toBeVisible();
    await expect(page.getByText('高风险', { exact: true })).toBeVisible();
    await expect(page.getByText(/修复锚点：missing.xhtml → Text\/2.xhtml#two/)).toBeVisible();
    await expect(page.getByRole('textbox', { name: '目录标题' })).toHaveCount(2);
    await expect(page.getByRole('combobox', { name: '父级目录' })).toHaveCount(2);
    await expect(page.locator('main')).toHaveAttribute('inert', '');
    await expect(page.getByRole('dialog', { name: 'AI 目录整理' })).toHaveScreenshot('toc-organizer-light.png', { animations: 'disabled' });
});

test('reflows the dark organizer at 320px without clipping its actions', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await mount(page);
    await expect(page.getByRole('button', { name: '确认并应用' })).toBeVisible();
    const panelBox = await page.getByRole('dialog', { name: 'AI 目录整理' }).boundingBox();
    const viewport = page.viewportSize();
    expect(panelBox && viewport && panelBox.x >= 0 && panelBox.x + panelBox.width <= viewport.width).toBeTruthy();
    await expect(page.getByRole('dialog', { name: 'AI 目录整理' })).toHaveScreenshot('toc-organizer-dark-mobile.png', { animations: 'disabled' });
});

test('saves item choices before confirmed apply', async ({ page }) => {
    let patched = false;
    let applied = false;
    await page.route(`**/api/ai/toc_organizer/tasks/${artifact.id}`, async route => {
        if (route.request().method() === 'PATCH') {
            const body = route.request().postDataJSON();
            patched = body.nodes[1].selected === false && body.nodes[0].label === '第一章（修订）';
            await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ err: 'ok', task: { ...artifact, nodes: body.nodes } }) });
        }
    });
    await page.route(`**/api/ai/toc_organizer/tasks/${artifact.id}/apply`, async route => {
        const body = route.request().postDataJSON();
        applied = body.confirmed === true && body.book_version === 'fixture-v1';
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ err: 'ok', task: { ...artifact, application: { status: 'applied', selected_count: 1 } } }) });
    });
    await mount(page);
    await page.getByRole('textbox', { name: '目录标题' }).first().fill('第一章（修订）');
    await page.getByRole('checkbox', { name: '选择 第二章' }).uncheck();
    await page.getByRole('button', { name: '确认并应用' }).click();
    await expect(page.getByRole('heading', { name: '应用当前目录？' })).toBeVisible();
    await page.getByRole('button', { name: '应用目录' }).click();
    await expect(page.getByText(/目录已安全应用，共写入 1 个节点。刷新阅读器后可查看新目录/)).toBeVisible();
    expect(patched).toBe(true);
    expect(applied).toBe(true);
});

test('keeps both AI launchers distinct and gives the open modal exclusive interaction', async ({ page }) => {
    await page.route('**/api/ai/summary_duck/tasks?book_id=1', route => route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ err: 'ok', tasks: [] }),
    }));
    await page.route('**/api/ai/toc_organizer/tasks?book_id=1', route => route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ err: 'ok', tasks: [artifact] }),
    }));
    await page.setContent('<!doctype html><html><head><meta charset="utf-8"><base href="http://127.0.0.1:3000/"></head><body><main id="reader"></main></body></html>');
    await page.addStyleTag({ path: resolve(process.cwd(), 'public/static/js/summary-duck.css') });
    await page.addStyleTag({ path: resolve(process.cwd(), 'public/static/js/toc-organizer.css') });
    await page.addScriptTag({ path: resolve(process.cwd(), 'public/static/js/summary-duck.js') });
    await page.addScriptTag({ path: resolve(process.cwd(), 'public/static/js/toc-organizer.js') });
    await page.evaluate(() => {
        window.TalebookSummaryDuckInit({ bookId: 1 });
        window.TalebookTocOrganizerInit({ bookId: 1 });
    });

    const duckBox = await page.locator('.summary-duck-launcher').boundingBox();
    const tocBox = await page.locator('.toc-organizer-launcher').boundingBox();
    expect(duckBox && tocBox && tocBox.y + tocBox.height < duckBox.y).toBeTruthy();

    await page.locator('.summary-duck-launcher').click();
    await expect(page.locator('.toc-organizer-launcher')).toHaveAttribute('inert', '');
    await page.locator('.summary-duck [data-action="close"]').click();
    await page.locator('.toc-organizer-launcher').click();
    await expect(page.locator('.summary-duck-launcher')).toHaveAttribute('inert', '');
});

declare global {
    interface Window { TalebookTocOrganizerInit: (options: { bookId: number }) => void }
}
