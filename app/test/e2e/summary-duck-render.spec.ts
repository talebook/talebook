import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

const chapter = '第一段给出关键事实，第二段解释原因，第三段说明影响。'.repeat(12);

const artifact = {
    id: '11111111-1111-1111-1111-111111111111',
    feature: 'summary_duck',
    book_id: 1,
    book_version: 'fixture',
    chapter_href: 'Text/chapter-1.xhtml',
    chapter_title: '第一章 · 阅读为何需要追问',
    status: 'succeeded',
    progress_message: '生成完成',
    schema_version: 'summary_duck.v1',
    prompt_version: 'summary_duck.zh.v2',
    runtime: 'codex_app_server',
    usage: { inputTokens: 1200, outputTokens: 420 },
    error: null,
    created_at: '2026-08-15T12:00:00',
    updated_at: '2026-08-15T12:00:10',
    items: Array.from({ length: 5 }, (_, index) => ({
        question: index === 0 ? '**为什么阅读后的追问比摘抄更重要？**' : `问题 ${index + 1} 如何帮助理解本章？`,
        answer: index === 0
            ? '追问会迫使读者重建论证，并把 **关键假设** 与结论联系起来。&lt;img src=x onerror=alert(1)&gt;'
            : `答案 ${index + 1} 用常规文字解释，并强调 __核心概念__。`,
        citations: [{ href: 'Text/chapter-1.xhtml', start: 0, end: 12, quote: '第一段给出关键事实，第二段' }],
    })),
};

async function mount(page) {
    await page.route('**/api/ai/summary_duck/tasks?book_id=1', route => route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ err: 'ok', tasks: [artifact] }),
    }));
    await page.setContent('<!doctype html><html><head><meta charset="utf-8"><base href="http://127.0.0.1:3000/"></head><body><main id="reader"></main></body></html>');
    await page.addStyleTag({ path: resolve(process.cwd(), 'public/static/js/summary-duck.css') });
    await page.addScriptTag({ path: resolve(process.cwd(), 'public/static/js/summary-duck.js') });
    await page.evaluate(({ text }) => {
        window.TalebookSummaryDuckInit({ bookId: 1 });
        window.TalebookSummaryDuck.open({
            chapter_text: text,
            chapter_href: 'Text/chapter-1.xhtml',
            chapter_title: '第一章 · 阅读为何需要追问',
        });
    }, { text: chapter });
    await expect(page.getByRole('dialog', { name: '总结鸭 TOP5' })).toBeVisible();
    await expect(page.locator('.summary-duck__item')).toHaveCount(5);
}

test('renders the ordered light-theme TOP5 panel without executing raw HTML', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await mount(page);
    await expect(page.getByText('<img src=x onerror=alert(1)>')).toBeVisible();
    await expect(page.locator('img')).toHaveCount(0);
    await expect(page.locator('.summary-duck')).toHaveScreenshot('summary-duck-light.png', { animations: 'disabled' });
});

test('renders high-contrast dark tokens and keyboard focus', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await mount(page);
    await page.keyboard.press('Tab');
    await expect(page.locator('.summary-duck')).toHaveScreenshot('summary-duck-dark.png', { animations: 'disabled' });
});

test('keeps keyboard focus inside the modal and reflows actions at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await mount(page);
    await expect(page.locator('main')).toHaveAttribute('inert', '');

    await page.getByRole('button', { name: '编辑', exact: true }).click();
    const firstEditor = page.getByRole('textbox', { name: '问题 1' });
    await expect(firstEditor).toBeVisible();
    await expect(page.getByRole('textbox', { name: '答案' }).first()).toBeVisible();

    await page.getByRole('button', { name: '取消编辑' }).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: '关闭', exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('button', { name: '取消编辑' })).toBeFocused();

    const bodyBox = await page.locator('.summary-duck__body').boundingBox();
    const footerBox = await page.locator('.summary-duck__footer').boundingBox();
    expect(bodyBox && footerBox && bodyBox.y + bodyBox.height <= footerBox.y + 1).toBeTruthy();
});

declare global {
    interface Window {
        TalebookSummaryDuckInit: (options: { bookId: number }) => void;
        TalebookSummaryDuck: {
            open: (options: { chapter_text: string; chapter_href: string; chapter_title: string }) => void;
        };
    }
}
