import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

const chapter = '阅读不是被动接收，而是不断检验论证与证据的过程。真正重要的句子能够让读者回到上下文复核。'.repeat(12);
const selected = chapter.slice(0, 24);
const card = {
    id: '11111111-1111-1111-1111-111111111111',
    book_id: 1,
    book_title: '深度阅读示例',
    chapter_href: 'Text/chapter-1.xhtml',
    chapter_title: '第一章 · 主动阅读',
    quote_type: 'verbatim',
    verbatim_quote: '&lt;img src=x onerror=alert(1)&gt; 阅读要求检验证据。',
    quote_text: '&lt;img src=x onerror=alert(1)&gt; 阅读要求检验证据。',
    locator: { href: 'Text/chapter-1.xhtml', start: 0, end: 24 },
    source_valid: true,
    why_important: '这句话给出本章的中心判断。',
    topics: ['主动阅读', '证据'],
    note: '下次复习论证结构。',
    schema_version: 'quote_card.v1',
    prompt_version: 'quote_card.zh.v1',
    created_at: '2026-08-16T12:00:00',
    updated_at: '2026-08-16T12:00:00',
};

async function mount(page) {
    await page.route('**/api/quote-cards?book_id=1', route => route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ err: 'ok', cards: [card] }),
    }));
    await page.setContent('<!doctype html><html><head><meta charset="utf-8"><base href="http://127.0.0.1:3000/"></head><body><main id="reader"></main></body></html>');
    await page.addStyleTag({ path: resolve(process.cwd(), 'public/static/js/quote-cards.css') });
    await page.addScriptTag({ path: resolve(process.cwd(), 'public/static/js/quote-cards.js') });
    await page.evaluate(({ text, quote }) => {
        window.TalebookQuoteCardsInit({ bookId: 1 });
        window.TalebookQuoteCards.open({
            chapter_text: text,
            chapter_href: 'Text/chapter-1.xhtml',
            chapter_title: '第一章 · 主动阅读',
            selection: { quote, locator: { href: 'Text/chapter-1.xhtml', start: 0, end: quote.length } },
        });
    }, { text: chapter, quote: selected });
    await expect(page.getByRole('dialog', { name: '金句卡片' })).toBeVisible();
}

test('renders the selection confirmation and saved-card views without executing HTML', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await mount(page);
    await expect(page.getByRole('textbox', { name: '原句' })).toHaveValue(selected);
    await expect(page.getByText('手动保存不依赖 AI', { exact: false })).toBeVisible();

    await page.getByRole('button', { name: '查看已保存' }).click();
    await expect(page.getByText('<img src=x onerror=alert(1)> 阅读要求检验证据。')).toBeVisible();
    await expect(page.locator('img')).toHaveCount(0);
    await expect(page.getByText('逐字引用', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '导出全部 Markdown' })).toBeVisible();
    await expect(page.locator('.quote-cards')).toHaveScreenshot('quote-cards-light.png', { animations: 'disabled' });
});

test('exports an individual PNG entirely in the browser', async ({ page }) => {
    await mount(page);
    await page.getByRole('button', { name: '查看已保存' }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出 PNG' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('quote-card-11111111.png');
});

test('preserves the reader draft when server-side source validation fails', async ({ page }) => {
    await page.route('**/api/quote-cards', route => route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ err: 'params.invalid', msg: '原文定位已变化' }),
    }));
    await mount(page);
    await page.getByRole('textbox', { name: '为什么重要（可留空，手动保存不依赖 AI）' }).fill('我的解释不会丢失');
    await page.getByRole('textbox', { name: '我的笔记' }).fill('保留这段笔记');
    await page.getByRole('button', { name: '保存卡片' }).click();
    await expect(page.getByRole('alert')).toContainText('原文定位已变化');
    await expect(page.getByRole('textbox', { name: '为什么重要（可留空，手动保存不依赖 AI）' })).toHaveValue('我的解释不会丢失');
    await expect(page.getByRole('textbox', { name: '我的笔记' })).toHaveValue('保留这段笔记');
});

test('keeps focus inside the dark-theme modal and separates scroll body from footer at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await mount(page);
    await expect(page.locator('main')).toHaveAttribute('inert', '');
    await page.getByRole('button', { name: '查看已保存' }).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: '关闭金句卡片' })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('button', { name: '查看已保存' })).toBeFocused();

    const bodyBox = await page.locator('.quote-cards__body').boundingBox();
    const footerBox = await page.locator('.quote-cards__footer').boundingBox();
    expect(bodyBox && footerBox && bodyBox.y + bodyBox.height <= footerBox.y + 1).toBeTruthy();
    await expect(page.locator('.quote-cards')).toHaveScreenshot('quote-cards-dark-narrow.png', { animations: 'disabled' });
});

declare global {
    interface Window {
        TalebookQuoteCardsInit: (options: { bookId: number }) => void;
        TalebookQuoteCards: {
            open: (options: {
                chapter_text: string;
                chapter_href: string;
                chapter_title: string;
                selection: { quote: string; locator: { href: string; start: number; end: number } };
            }) => void;
        };
    }
}
